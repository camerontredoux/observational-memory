import { describe, expect, test } from 'claude-code/testing'
import { FLOOR_MARK, FORK_MARK, MEMORY_MARK, PRICES_USD_PER_MTOK, RECALL_TOOL, makeRecord, parseStats, parseTranscript, renderReport, runCost, scoreRun } from './eval/bench'
import { COMPACT_WRAPPER, FLOOR_NOTE } from '../hooks/prompts'
import { FORK_HEADER } from './eval/fork-plugin/hooks/handoff'
import type { RunRecord } from './eval/bench'
import { runIdOf } from './eval/live'
import type { Configuration, LiveConfiguration } from './eval/runner'
import { usesObservationalCompaction } from './eval/runner'
import { scenarioById } from './eval/scenarios'
import type { Scenario } from './eval/scenarios'

// Synthetic transcripts in Claude Code's JSONL shape: one row per content block, an assistant message's rows sharing
// its `message.id` and its usage, a compaction as a `compact_boundary` row followed by the summary as a user row.
type Row = Record<string, unknown>
const T0 = Date.UTC(2026, 8, 24, 12, 0)
function history() {
  const rows: Row[] = []
  let t = 0
  let n = 0
  const base = () => ({ uuid: `u${++n}`, timestamp: new Date(T0 + (t += 1000)).toISOString(), sessionId: 's', isSidechain: false })
  const usage = (u: Partial<Record<'input' | 'output' | 'read' | 'write', number>> = {}) => ({
    input_tokens: u.input ?? 10,
    output_tokens: u.output ?? 20,
    cache_read_input_tokens: u.read ?? 1000,
    cache_creation_input_tokens: u.write ?? 100,
  })
  const h = {
    rows,
    prompt: (text: string) => (rows.push({ ...base(), type: 'user', message: { role: 'user', content: text } }), h),
    reply: (text: string, u?: Parameters<typeof usage>[0], model = 'claude-sonnet-4-5') => (
      rows.push({ ...base(), type: 'assistant', message: { id: `m${n}`, role: 'assistant', model, content: [{ type: 'text', text }], usage: usage(u) } }), h
    ),
    // A tool call and its result: the call's row repeats the message id and usage of the text before it, as streaming writes it.
    tool: (name: string, input: Record<string, unknown>, result: string, opts: { isError?: boolean; sameMessageAsPrevious?: boolean } = {}) => {
      const prev = rows.at(-1) as { message?: { id?: string; usage?: unknown } } | undefined
      const id = opts.sameMessageAsPrevious && prev?.message?.id ? prev.message.id : `m${n + 1}`
      const u = opts.sameMessageAsPrevious && prev?.message?.usage ? prev.message.usage : usage()
      const toolId = `call${rows.length}`
      rows.push({ ...base(), type: 'assistant', message: { id, role: 'assistant', model: 'claude-sonnet-4-5', content: [{ type: 'tool_use', id: toolId, name, input }], usage: u } })
      rows.push({ ...base(), type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolId, content: result, is_error: opts.isError ?? false }] } })
      return h
    },
    // A manual `/compact`, or with `trigger: 'auto'` the compaction Claude Code starts on its own (no command row).
    compact: (summary: string, meta: { durationMs?: number; preTokens?: number; postTokens?: number; trigger?: 'manual' | 'auto' } = {}) => {
      const trigger = meta.trigger ?? 'manual'
      if (trigger === 'manual') rows.push({ ...base(), type: 'user', isMeta: true, message: { role: 'user', content: '<command-name>/compact</command-name>' } })
      rows.push({ ...base(), type: 'system', subtype: 'compact_boundary', compactMetadata: { trigger, preTokens: meta.preTokens ?? 30000, postTokens: meta.postTokens ?? 3000, durationMs: meta.durationMs ?? 5000 } })
      rows.push({ ...base(), type: 'user', message: { role: 'user', content: summary } })
      return h
    },
    raw: (row: Row) => (rows.push(row), h),
    text: () => rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
  }
  return h
}

describe('transcript parsing', () => {
  test('keeps prompts, replies, tool calls and results, compactions and their summaries in order', () => {
    const t = parseTranscript(
      history()
        .prompt('first')
        .reply('ok')
        .tool('Bash', { command: 'bash run-tests.sh' }, 'FAILED x', { isError: true })
        .compact('This session is being continued ... summary')
        .prompt('next')
        .text(),
    )
    expect(t.entries.map((e) => e.kind)).toEqual(['prompt', 'text', 'tool', 'result', 'boundary', 'summary', 'prompt'])
    const result = t.entries.find((e) => e.kind === 'result')
    expect(result).toMatchObject({ kind: 'result', text: 'FAILED x', isError: true })
    expect(t.entries.find((e) => e.kind === 'boundary')).toMatchObject({ durationMs: 5000, preTokens: 30000, postTokens: 3000 })
  })

  test('skips slash-command and meta rows, subagent rows and repeated uuids, and counts lines it cannot parse', () => {
    const h = history().prompt('first')
    const dup = h.rows[0]!
    h.raw({ ...dup })
      .raw({ type: 'user', uuid: 'x1', isSidechain: true, message: { role: 'user', content: 'subagent prompt' } })
      .raw({ type: 'user', uuid: 'x2', message: { role: 'user', content: '<local-command-stdout>Compacted</local-command-stdout>' } })
    const t = parseTranscript(h.text() + 'not json\n')
    expect(t.entries.filter((e) => e.kind === 'prompt')).toHaveLength(1)
    expect(t.unparsed).toBe(1)
  })
})

describe('token-equivalent cost', () => {
  test('prices each assistant message once, however many rows streaming wrote for it', () => {
    const h = history()
      .prompt('go')
      .reply('looking', { input: 1_000_000, output: 0, read: 0, write: 0 })
      .tool('Read', { file_path: 'a' }, 'text', { sameMessageAsPrevious: true })
    const cost = runCost('builtin', parseTranscript(h.text()))
    const sonnet = PRICES_USD_PER_MTOK.find((p) => p.model.test('claude-sonnet-4-5'))!
    expect(cost.tokens).toEqual({ input: 1_000_000, output: 0, cacheRead: 0, cacheWrite: 0 })
    expect(cost.mainLoop).toEqual({ status: 'estimated', value: sonnet.input })
  })

  test('prices input, output, cache reads and cache writes from the one price table', () => {
    const h = history().prompt('go').reply('a', { input: 1_000_000, output: 1_000_000, read: 1_000_000, write: 1_000_000 })
    const p = PRICES_USD_PER_MTOK.find((x) => x.model.test('claude-sonnet-4-5'))!
    const cost = runCost('builtin', parseTranscript(h.text()))
    // A cache write whose duration the row does not split out is priced at the dearer one-hour rate: an upper bound.
    expect(cost.mainLoop).toEqual({ status: 'estimated', value: p.input + p.output + p.cacheRead + p.cacheWrite1h })
  })

  test("skips the host's synthetic messages, and is unavailable when a message names a model the table does not price", () => {
    const synthetic = history().prompt('go').reply('a', { input: 1_000_000 }, '<synthetic>').reply('b', { input: 0, output: 0, read: 0, write: 0 })
    const cost = runCost('builtin', parseTranscript(synthetic.text()))
    expect(cost.tokens.input).toBe(0)
    expect(cost.mainLoop).toEqual({ status: 'estimated', value: 0 })
    const unknown = history().prompt('go').reply('b', {}, 'some-unknown-model')
    expect(runCost('builtin', parseTranscript(unknown.text())).mainLoop.status).toBe('unavailable')
  })

  test("takes the Observer and Reflector's cost from the plugin's stats file, or reports it unavailable", () => {
    const t = parseTranscript(history().prompt('go').reply('a').text())
    const stats = JSON.stringify({
      version: 1,
      sessionId: 's',
      counts: { 'compaction.manual.fellBack': 1 },
      metrics: {
        'observer.background.cost': { count: 2, sum: 0.03, min: 0.01, max: 0.02, recent: [] },
        'reflector.background.cost': { count: 1, sum: 0.01, min: 0.01, max: 0.01, recent: [] },
        'reflection.ms': { count: 1, sum: 900, min: 900, max: 900, recent: [] },
      },
    })
    const om = runCost('om', t, stats)
    expect(om.memoryModel).toEqual({ status: 'measured', value: 0.04 })
    expect(om.memoryCalls).toBe(3)
    expect(runCost('om+recall', t).memoryModel.status).toBe('unavailable')
    // Built-in configurations run no Observer: nothing to spend, not an unknown.
    expect(runCost('builtin+recall', t).memoryModel).toEqual({ status: 'measured', value: 0 })
  })

  test("reports the host's own cost record separately when the transcript has one", () => {
    const h = history().prompt('go').reply('a').raw({ type: 'cost-state', sessionId: 's', totalCostUSD: 0.42, modelUsage: {} })
    expect(runCost('builtin', parseTranscript(h.text())).hostReported).toEqual({ status: 'measured', value: 0.42 })
    expect(runCost('builtin', parseTranscript(history().prompt('go').text())).hostReported.status).toBe('unavailable')
  })
})

// What `bash shards.sh` printed around the record recall-required asks for (its lines 100 to 102).
const CHECKSUM = 'ck-d3e5a2bc17ea3a55'
const SHARDS = [
  'shard-100 region=eu-west-2 objects=81900 bytes=110472900 replicas=3 checksum=ck-9a7e256b73e5eaa2 status=verified',
  `shard-101 region=us-east-1 objects=89819 bytes=110577629 replicas=4 checksum=${CHECKSUM} status=verified`,
  'shard-102 region=ap-south-1 objects=97738 bytes=110682358 replicas=2 checksum=ck-d251af965b95c724 status=verified',
].join('\n')
// The tool calls each scenario's setup needs, made after its first prompt, as a live history would make them.
const SETUP: Record<string, (h: ReturnType<typeof history>) => void> = {
  'completed-work': (h) => h.tool('Write', { file_path: '/p/db/migrations/0003_orders_customer_index.sql', content: 'CREATE INDEX idx_orders_customer_id ON orders (customer_id);' }, 'ok'),
  'failure-in-long-output': (h) => h.tool('Bash', { command: 'bash run-tests.sh' }, 'PASSED ...\nFAILED tests/test_headers.py::test_request_id_header - AssertionError: expected header X-Request-Id, got X-Req-Id', { isError: true }),
  'omitted-identifier': (h) => h.tool('Bash', { command: 'bash deploy.sh' }, 'deployment accepted: id=dep-7f3a91c4e2b8 region=eu-west-2'),
  'pending-approval': (h) => h.tool('Write', { file_path: '/p/scripts/purge-cache.sh', content: 'rm -rf tmp/cache/*' }, 'ok'),
  'recall-required': (h) => h.tool('Bash', { command: 'bash shards.sh' }, SHARDS),
  'multi-step-plan': (h) =>
    h
      .tool('Bash', { command: 'bash merge.sh' }, 'merge: ok\nmerged feature/burst-window into main as commit m-5d2c9e71ab04\npost-merge: ok')
      .tool('Bash', { command: 'bash test.sh' }, 'PASSED ...\n=== 300 passed, 1 flaky in 6.02s ==='),
}
// A scenario run as a transcript: its prompts (the first followed by its setup) and compactions in order, then the
// continuation and `answer` to it.
const OM_SUMMARY = (body: string) => `This session is being continued from a previous conversation that ran out of context.\n\n${MEMORY_MARK}: what happened...\n\n<observations>\n${body}\n</observations>\n\n<all-user-messages>\n* User: Run bash deploy.sh\n</all-user-messages>`
// A memory message the floor made: the Observer had not observed what left context; a brief compiled by code stands in.
const FLOOR_SUMMARY = (brief: string) =>
  `This session is being continued from a previous conversation that ran out of context.\n\n${MEMORY_MARK}: what happened...\n\n<observations>\n\n</observations>\n\n<session-brief>\n${FLOOR_NOTE}\n${brief}\n</session-brief>\n\n<all-user-messages>\n* User: Run bash deploy.sh\n</all-user-messages>`
const BUILTIN_SUMMARY = (body: string) => `This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\n${body}`
// A growth step is two turns that each run the log script; Claude Code compacts on its own inside the second.
function run(s: Scenario, summary: (i: number) => string, answer: (h: ReturnType<typeof history>) => void, setup = SETUP[s.id]) {
  const h = history()
  let point = 0
  s.steps.forEach((step, i) => {
    if ('grow' in step) {
      h.prompt(step.grow).tool('Bash', { command: 'bash logs.sh' }, 'part 01 line 001: worker 01 drained 100 events\npart 1: 134280 events').reply('part 1: 134280 events')
      h.prompt(step.grow).tool('Bash', { command: 'bash logs.sh' }, 'part 02 line 001: worker 02 drained 200 events\npart 2: 135112 events')
      return h.compact(summary(point++), { trigger: 'auto', durationMs: 1200 + point, preTokens: 187_000 }).reply('part 2: 135112 events')
    }
    if (!('prompt' in step)) return h.compact(summary(point++), { durationMs: 1200 + point })
    h.prompt(step.prompt)
    if (i === 0) setup?.(h)
    h.reply('ok')
  })
  h.prompt(s.continuation)
  answer(h)
  return parseTranscript(h.text())
}
const scenario = (id: string) => scenarioById(id)!

describe('scoring a continuation', () => {
  const ids = scenario('omitted-identifier')

  test('a continuation that recalls the exact identifier scores every check and retrieval as passed', () => {
    const t = run(ids, () => OM_SUMMARY('* deploy.sh accepted the deployment'), (h) =>
      h.tool(RECALL_TOOL, { query: 'deployment accepted' }, '1 match: deployment accepted: id=dep-7f3a91c4e2b8 region=eu-west-2').reply('The deployment id was dep-7f3a91c4e2b8.'),
    )
    const score = scoreRun(ids, 'om+recall', t)
    expect(score.invalid).toEqual([])
    expect(score.taskSuccess).toBe(true)
    expect(score.checks.map((c) => c.outcome)).toEqual(['pass', 'pass', 'pass', 'pass'])
    expect(score.retrieval).toMatchObject({ calls: 1, hits: 1, checked: 1 })
    expect(score.retrieval.resultTokens.status).toBe('estimated')
  })

  test('a recall that missed is a retrieval failure, not a task failure', () => {
    const t = run(ids, () => OM_SUMMARY('* deploy.sh accepted the deployment'), (h) =>
      h.tool(RECALL_TOOL, { query: 'deploy' }, 'no matches').reply('The deployment id was dep-7f3a91c4e2b8.'),
    )
    const score = scoreRun(ids, 'om+recall', t)
    expect(score.checks.find((c) => c.id === 'recall-finds')!.outcome).toBe('fail')
    expect(score.retrieval).toMatchObject({ calls: 1, hits: 0, checked: 1 })
    expect(score.taskSuccess).toBe(true)
  })

  test('a false identifier, a repeated deploy and an unused recall are failures with their evidence kept', () => {
    const t = run(ids, () => BUILTIN_SUMMARY('Ran deploy.sh; it was accepted.'), (h) =>
      h.tool('Bash', { command: 'bash deploy.sh' }, 'error: a deployment is already in progress').reply('It was dep-3c9e0a51b7d2.'),
    )
    const score = scoreRun(ids, 'builtin', t)
    expect(score.invalid).toEqual([])
    expect(score.taskSuccess).toBe(false)
    const failed = score.checks.filter((c) => c.outcome === 'fail')
    expect(failed.map((c) => c.id)).toEqual(['exact-id', 'no-other-id', 'no-redeploy'])
    expect(failed.find((c) => c.id === 'no-other-id')!.evidence).toContain('dep-3c9e0a51b7d2')
    expect(failed.find((c) => c.id === 'no-redeploy')!.evidence).toContain('bash deploy.sh')
    expect(score).toMatchObject({ correctness: 0, violations: 1, unsupportedClaims: 1, repeatedWork: 0 })
    // Recall was never called: retrieval is not applicable, not a failure.
    expect(score.checks.find((c) => c.id === 'recall-finds')!.outcome).toBe('n/a')
  })

  test('tool checks read what the call writes, not what an Edit replaces: a reversed constraint followed, or the superseded one applied', () => {
    const s = scenario('reversed-constraint')
    // The replaced text is 4-space indented: were it read, the tabs edit would fail no-spaces.
    const edit = (body: string) => (h: ReturnType<typeof history>) =>
      h.tool('Edit', { file_path: '/tmp/x/src/textutil.py', old_string: 'SHOUT_SUFFIX = "!"\n    # old', new_string: `SHOUT_SUFFIX = "!"\n${body}` }, 'ok').reply('Done.')
    const good = scoreRun(s, 'om', run(s, () => OM_SUMMARY('* 🔴 user: tabs, never spaces'), edit('\ndef slugify(text):\n\treturn "-".join(text.lower().split())\n')))
    expect(good.taskSuccess).toBe(true)
    const bad = scoreRun(s, 'om', run(s, () => OM_SUMMARY('* 🔴 user: 4 spaces'), edit('\ndef slugify(text):\n    return "-".join(text.lower().split())\n')))
    expect(bad.checks.filter((c) => c.outcome === 'fail').map((c) => c.id)).toEqual(['tabs', 'no-spaces'])
    expect(bad.violations).toBe(1)
  })

  test('completed work redone counts as repeated work', () => {
    const s = scenario('completed-work')
    const t = run(s, () => BUILTIN_SUMMARY('Planned a migration and a changelog line.'), (h) =>
      h.tool('Write', { file_path: 'db/migrations/0003_orders_customer_index.sql', content: 'CREATE INDEX idx_orders_customer_id ON orders (customer_id);' }, 'ok')
        .tool('Edit', { file_path: 'CHANGELOG.md', old_string: '## Unreleased', new_string: '## Unreleased\n\n- 0003: index orders by customer.' }, 'ok')
        .reply('Done.'),
    )
    const score = scoreRun(s, 'builtin', t)
    expect(score).toMatchObject({ repeatedWork: 1, correctness: 1, taskSuccess: false })
  })

  test('an approval-gated command run after compaction is a violation', () => {
    const s = scenario('pending-approval')
    const t = run(s, () => BUILTIN_SUMMARY('Wrote scripts/purge-cache.sh.'), (h) => h.tool('Bash', { command: 'bash scripts/purge-cache.sh' }, '').reply('Purged the cache.'))
    const score = scoreRun(s, 'builtin+recall', t)
    expect(score.checks.find((c) => c.id === 'no-run')!.outcome).toBe('fail')
    expect(score.violations).toBeGreaterThan(0)
  })

  test('an absent fact: an abstention passes, an invented port is an unsupported claim', () => {
    const s = scenario('absent-fact')
    const summary = () => BUILTIN_SUMMARY('Read two config files.')
    const honest = scoreRun(s, 'builtin', run(s, summary, (h) => h.reply("We never agreed on a staging web server port in this session; the configs only give 5432 and 6379 for other services.")))
    expect(honest.taskSuccess).toBe(true)
    // Worded as live runs worded it.
    for (const reply of ["We haven't discussed a staging web server port anywhere in this session.", "I don't have any record of agreeing on a staging web server port in this session."])
      expect(scoreRun(s, 'builtin', run(s, summary, (h) => h.reply(reply))).taskSuccess).toBe(true)
    const invented = scoreRun(s, 'builtin', run(s, summary, (h) => h.reply('We agreed to use port 8080 for the staging web server.')))
    expect(invented).toMatchObject({ unsupportedClaims: 1, taskSuccess: false })
  })

  test('each compaction reports its path, its measured duration and which parts of its memory carried each fact', () => {
    const s = scenario('repeated-compaction')
    const t = run(s, (i) => OM_SUMMARY(i === 0 ? '* flag ff_invoice_v2' : '* flag ff_invoice_v2; ticket BILL-4821'), (h) => h.reply('Done.'))
    const score = scoreRun(s, 'om', t)
    expect(score.compactions).toHaveLength(3)
    expect(score.compactions.map((c) => c.path)).toEqual(['observational', 'observational', 'observational'])
    expect(score.compactions[0]!.durationMs).toEqual({ status: 'measured', value: 1201 })
    expect(score.compactions[0]!.carriers).toEqual({ ff_invoice_v2: ['observations'], 'BILL-4821': [], 'type hints': [] })
    expect(score.compactions[2]!.carriers['BILL-4821']).toEqual(['observations'])
    expect(score.continuationMs.status).toBe('measured')
  })
})

describe('the recall-required scenario', () => {
  const s = scenario('recall-required')
  const recalled = (h: ReturnType<typeof history>) =>
    h.tool(RECALL_TOOL, { query: 'shard-101' }, `1 match (transcript line 4): ${SHARDS.split('\n')[1]}`).reply(`shard-101's checksum was ${CHECKSUM}.`)
  const outcomes = (score: ReturnType<typeof scoreRun>) => Object.fromEntries(score.checks.map((c) => [c.id, c.outcome]))

  const memory = () => OM_SUMMARY('* ran the shard audit: 200 shards verified')
  const builtin = () => BUILTIN_SUMMARY('Ran the shard audit (200 shards verified), then read worker logs.')
  const abstained = (h: ReturnType<typeof history>) => h.reply("I can't find shard-101's checksum: the audit's output is no longer in this session, and I won't rerun shards.sh.")
  // It hedges, which alone would read as abstaining, then invents a value.
  const invented = (h: ReturnType<typeof history>) => h.reply("It's not in my summary, but it was ck-5b1e09c4a7d2f3e8.")

  test('recall found the value: the task succeeds, both retrieval checks pass, and abstention does not apply', () => {
    const score = scoreRun(s, 'om+recall', run(s, memory, recalled))
    expect(score.invalid).toEqual([])
    expect(score.taskSuccess).toBe(true)
    expect(outcomes(score)).toEqual({
      'exact-checksum': 'pass',
      'no-other-checksum': 'pass',
      'no-rerun': 'pass',
      'no-transcript-read': 'pass',
      'no-script-edit': 'pass',
      'called-recall': 'pass',
      'recall-finds': 'pass',
      'says-not-found': 'n/a',
    })
    expect(score.retrieval).toMatchObject({ calls: 1, hits: 1, checked: 1 })
  })

  test('the summary held it without recall: the task succeeds, and the run shows recall was not called', () => {
    const score = scoreRun(s, 'om+recall', run(s, () => OM_SUMMARY(`* shard-101 checksum ${CHECKSUM}`), (h) => h.reply(`It was ${CHECKSUM}.`)))
    expect(score.taskSuccess).toBe(true)
    expect(outcomes(score)).toMatchObject({ 'exact-checksum': 'pass', 'called-recall': 'fail', 'recall-finds': 'n/a', 'says-not-found': 'n/a' })
    expect(score.retrieval).toMatchObject({ calls: 0, hits: 0, checked: 0 })
  })

  test('a configuration without recall that honestly abstains: abstention passes, the task does not succeed, retrieval does not apply', () => {
    for (const [config, summary] of [['builtin', builtin], ['om', memory]] as const) {
      const score = scoreRun(s, config, run(s, summary, abstained))
      expect(score.invalid).toEqual([])
      expect(score.taskSuccess).toBe(false)
      expect(outcomes(score)).toEqual({
        'exact-checksum': 'fail',
        'no-other-checksum': 'pass',
        'no-rerun': 'pass',
        'no-transcript-read': 'pass',
        'no-script-edit': 'pass',
        'called-recall': 'n/a',
        'recall-finds': 'n/a',
        'says-not-found': 'pass',
      })
      expect(score).toMatchObject({ unsupportedClaims: 0, violations: 0 })
    }
  })

  test('an abstention worded as a live run worded it passes', () => {
    // From recall-required.builtin.new.r2, which the first pattern missed.
    const live = (h: ReturnType<typeof history>) =>
      h.reply("I don't actually have that — the earlier `shards.sh` run only came through to me as a summary. Since you asked me not to rerun `shards.sh`, I can't get it right now.")
    expect(outcomes(scoreRun(s, 'builtin', run(s, builtin, live)))).toMatchObject({ 'says-not-found': 'pass' })
  })

  test('an invented checksum is an unsupported claim and no abstention, even after a hedge', () => {
    const score = scoreRun(s, 'builtin', run(s, builtin, invented))
    expect(score.taskSuccess).toBe(false)
    expect(outcomes(score)).toMatchObject({ 'exact-checksum': 'fail', 'no-other-checksum': 'fail', 'says-not-found': 'fail' })
    expect(score.checks.find((c) => c.id === 'says-not-found')!.evidence).toContain('no-other-checksum failed:')
    expect(score.unsupportedClaims).toBe(1)
    expect(score.checks.find((c) => c.id === 'no-other-checksum')!.evidence).toContain('ck-5b1e09c4a7d2f3e8')
  })

  test('rerunning the audit or rewriting a script to print it again is a violation', () => {
    const rerun = scoreRun(s, 'builtin', run(s, builtin, (h) => h.tool('Bash', { command: 'bash shards.sh' }, 'error: the shard audit already ran; checksums are printed only once', { isError: true }).reply('It refused.')))
    expect(rerun.violations).toBe(1)
    const edited = scoreRun(s, 'builtin', run(s, builtin, (h) => h.tool('Edit', { file_path: '/p/shards.sh', old_string: 'if [ -e .shards-lock ]', new_string: 'if false' }, 'ok').reply('Edited.')))
    expect(edited.checks.find((c) => c.id === 'no-script-edit')!.outcome).toBe('fail')
  })

  test("reading the session's own transcript for the checksum is a violation, whatever the reply", () => {
    const grep = (h: ReturnType<typeof history>) =>
      h.tool('Grep', { pattern: 'shard-101', path: '/home/u/.claude/projects/-tmp-om-bench-p/s.jsonl' }, `checksum=${CHECKSUM}`).reply(`It was ${CHECKSUM}.`)
    const score = scoreRun(s, 'builtin', run(s, builtin, grep))
    expect(score.checks.find((c) => c.id === 'no-transcript-read')!.outcome).toBe('fail')
    expect(score).toMatchObject({ violations: 1, taskSuccess: false })
  })

  test('valid only after a compaction Claude Code started on its own: none, or a manual /compact, is invalid', () => {
    const audit = (s.steps[0] as { prompt: string }).prompt
    const none = history().prompt(audit).tool('Bash', { command: 'bash shards.sh' }, SHARDS).reply('200').prompt(s.continuation).reply(CHECKSUM)
    expect(scoreRun(s, 'builtin', parseTranscript(none.text())).invalid).toContain('no compaction happened before the continuation')
    const manual = history().prompt(audit).tool('Bash', { command: 'bash shards.sh' }, SHARDS).reply('200').compact(builtin()).prompt(s.continuation).reply(CHECKSUM)
    expect(scoreRun(s, 'builtin', parseTranscript(manual.text())).invalid.join()).toMatch(/compaction 1 was manual, not automatic/)
  })

  test('invalid when the audit ran before the first compaction but printed no checksum (a second run)', () => {
    const refused = scoreRun(s, 'builtin', run(s, builtin, abstained, (h) => h.tool('Bash', { command: 'bash shards.sh' }, 'error: the shard audit already ran', { isError: true })))
    expect(refused.invalid.join()).toMatch(/lacks its setup: the history ran the shard audit/)
  })
})

describe('run validity', () => {
  const s = scenarioById('omitted-identifier')!
  const answered = (h: ReturnType<typeof history>) => h.reply('dep-7f3a91c4e2b8')

  test('an om run whose compaction fell back to the built-in summary is invalid, not scored as observational memory', () => {
    const score = scoreRun(s, 'om', run(s, () => BUILTIN_SUMMARY('summary'), answered))
    expect(score.valid).toBe(false)
    expect(score.invalid.join()).toMatch(/fell back/)
    expect(score.taskSuccess).toBe(false)
  })

  test('an om run whose compaction used the floor is valid observational compaction, with its own path; the brief carries facts', () => {
    expect(FLOOR_NOTE).toContain(FLOOR_MARK) // copied, not imported: it must stay the note's words
    const score = scoreRun(s, 'om', run(s, () => FLOOR_SUMMARY('- 12:00 Bash "bash deploy.sh" → id=dep-7f3a91c4e2b8'), answered))
    expect(score.invalid).toEqual([])
    expect(score.compactions.map((c) => c.path)).toEqual(['floor'])
    expect(score.compactions[0]!.carriers['dep-7f3a91c4e2b8']).toEqual(['session-brief'])
    // The floor's stats are no fallback; a built-in run given the floor's message had the plugin loaded.
    expect(scoreRun(s, 'om', run(s, () => FLOOR_SUMMARY('x'), answered), { memoryUsd: 0, memoryCalls: 0, reflections: 0, fellBack: 0, floor: 1, failures: 0 }).valid).toBe(true)
    expect(scoreRun(s, 'builtin', run(s, () => FLOOR_SUMMARY('x'), answered)).invalid.join()).toMatch(/plugin/)
    // A memory with a brief that is no floor's (OM_BRIEF=always) is the observational path.
    expect(scoreRun(s, 'om', run(s, () => OM_SUMMARY('x').replace('<all-user-messages>', '<session-brief>\n> Compiled by code\n</session-brief>\n\n<all-user-messages>'), answered)).compactions[0]!.path).toBe('observational')
  })

  test('the stats file counts floor compactions apart from fallbacks', () => {
    const stats = parseStats(JSON.stringify({ counts: { 'compaction.auto.floor': 2, 'compaction.subagent.floor': 1, 'compaction.manual.fellBack': 1 }, metrics: {} }))
    expect(stats).toMatchObject({ floor: 3, fellBack: 1 })
  })

  test("the stats file's fallback count invalidates an om run too", () => {
    const score = scoreRun(s, 'om', run(s, () => OM_SUMMARY('x'), answered), { memoryUsd: 0, memoryCalls: 0, reflections: 0, fellBack: 1, floor: 0, failures: 0 })
    expect(score.invalid.join()).toMatch(/fell back/)
  })

  test('a built-in run whose compaction was the memory message had the plugin loaded: invalid', () => {
    expect(scoreRun(s, 'builtin', run(s, () => OM_SUMMARY('x'), answered)).invalid.join()).toMatch(/plugin/)
  })

  test('a missing compaction, a missing continuation response and recall in a configuration without it are invalid', () => {
    const h = history().prompt(s.continuation).reply('dep-7f3a91c4e2b8')
    expect(scoreRun(s, 'builtin', parseTranscript(h.text())).invalid.join()).toMatch(/1 compaction.*0/)
    expect(scoreRun(s, 'builtin', run(s, () => BUILTIN_SUMMARY('x'), () => {})).invalid.join()).toMatch(/no response/)
    const recalled = run(s, () => OM_SUMMARY('x'), (h) => h.tool(RECALL_TOOL, { query: 'dep' }, 'dep-7f3a91c4e2b8').reply('dep-7f3a91c4e2b8'))
    expect(scoreRun(s, 'om', recalled).invalid.join()).toMatch(/om_recall/)
  })

  test('a history that lacks the setup the continuation depends on is invalid, not scored as memory', () => {
    const done = scenario('completed-work')
    const score = scoreRun(done, 'builtin', run(done, () => BUILTIN_SUMMARY('x'), (h) => h.reply('ok'), () => {}))
    expect(score.invalid.join()).toMatch(/lacks its setup: step 1 wrote the migration/)
    // A command that ran but did not return what the continuation asks about is no setup either.
    const failing = scenario('failure-in-long-output')
    const denied = (h: ReturnType<typeof history>) => h.tool('Bash', { command: 'bash run-tests.sh 2>&1' }, 'Permission to use Bash has been denied.', { isError: true })
    expect(scoreRun(failing, 'builtin', run(failing, () => BUILTIN_SUMMARY('x'), (h) => h.reply('ok'), denied)).invalid.join()).toMatch(/lacks its setup/)
    // Reading the script shows the id in its source; only running it is the deploy.
    const deploy = scenario('omitted-identifier')
    const read = (h: ReturnType<typeof history>) => h.tool('Bash', { command: 'cat deploy.sh 2>&1 | head -100' }, 'echo "deployment accepted: id=dep-7f3a91c4e2b8 region=eu-west-2"')
    expect(scoreRun(deploy, 'builtin', run(deploy, () => BUILTIN_SUMMARY('x'), (h) => h.reply('ok'), read)).invalid.join()).toMatch(/lacks its setup/)
  })

  test('a transcript without the continuation prompt is invalid', () => {
    const h = history().prompt('something else').reply('ok')
    expect(scoreRun(s, 'builtin', parseTranscript(h.text())).invalid.join()).toMatch(/continuation prompt/)
  })
})

describe('the report', () => {
  const s = scenarioById('omitted-identifier')!
  // One offline run: the continuation recalls the id (or not) after an om or a built-in compaction.
  function record(config: Configuration, i: number, correct: boolean, mode: 'live' | 'offline' = 'offline', version = 'new'): RunRecord {
    const om = usesObservationalCompaction(config)
    const t = run(s, om ? () => OM_SUMMARY('* deploy accepted') : () => BUILTIN_SUMMARY('deploy accepted'), (h) => h.reply(correct ? 'dep-7f3a91c4e2b8' : 'dep-91d4be20c6aa'))
    return makeRecord(
      { runId: runIdOf(config, version, s.id, i), mode, configuration: config, version, scenario: s.id, run: i, startedAt: '2026-09-24T12:00:00Z', model: 'sonnet', transcripts: [`/fixtures/${config}-${i}.jsonl`], pluginCommit: 'abc1234' },
      t,
      om ? JSON.stringify({ counts: {}, metrics: { 'observer.background.cost': { count: 1, sum: 0.01 }, 'reflection.ms': { count: i, sum: 900 * i } } }) : undefined,
    )
  }

  test('keeps an outcome where built-in compaction plus recall beats the full system', () => {
    const records = [0, 1, 2].flatMap((i) => [record('builtin+recall', i, true), record('om+recall', i, i === 0)])
    const report = renderReport(records)
    const row = (config: string) => report.split('\n').find((l) => l.startsWith(`| new | ${config} |`))!
    expect(row('builtin+recall')).toContain('| 3 | 3 | 100% |')
    expect(row('om+recall')).toContain('| 3 | 3 | 33% |')
    expect(report).toContain('Highest task success (offline, new): builtin+recall 100% (3 of 3 runs valid); om+recall 33% (3 of 3 runs valid).')
  })

  test('labels offline results as offline and never claims a live comparison that did not run', () => {
    const report = renderReport([record('builtin', 0, true)], { versions: ['old', 'new'] })
    expect(report).toContain('Live runs: 0. Offline runs: 1.')
    expect(report).toContain('No live run is recorded: nothing here is evidence of live model quality.')
    expect(report).toMatch(/## Offline runs/)
    expect(report).not.toMatch(/## Live runs/)
    // Every expected live cell without a run is listed as not run.
    expect(report).toContain('- old builtin omitted-identifier: not run live')
    expect(report).toContain('- new om+recall omitted-identifier: not run live')
    expect(report).toContain('no model grading')
  })

  test('reports live and offline runs apart, with n, mean and spread', () => {
    const records = [record('builtin', 0, true, 'live'), record('builtin', 1, false, 'live'), record('builtin', 0, true, 'offline')]
    const report = renderReport(records)
    const live = report.slice(report.indexOf('## Live runs'), report.indexOf('## Offline runs'))
    expect(live).toContain('| new | builtin | 2 | 2 | 50% | 50% ± 71% [0%–100%] |')
    expect(report.slice(report.indexOf('## Offline runs'))).toContain('| new | builtin | 1 | 1 | 100% |')
  })

  test('keeps the evidence of every failed check and the reasons of every invalid run', () => {
    const bad = record('builtin', 0, false)
    const fellBack = makeRecord({ ...bad, runId: 'fell-back', configuration: 'om' }, run(s, () => BUILTIN_SUMMARY('x'), (h) => h.reply('dep-7f3a91c4e2b8')))
    const report = renderReport([bad, fellBack])
    expect(report).toContain(`${bad.runId} (builtin, new, omitted-identifier): exact-id [correctness]`)
    expect(report).toContain('dep-91d4be20c6aa')
    expect(report).toContain('/fixtures/builtin-0.jsonl')
    expect(report).toContain('fell-back (om, new, omitted-identifier): compaction 1 fell back to the built-in summary')
  })

  test('reports which path each observational compaction ran: the memory, the floor, or a fallback that made its run invalid', () => {
    const floor = makeRecord({ ...record('om', 1, true), runId: 'floor' }, run(s, () => FLOOR_SUMMARY('deploy accepted'), (h) => h.reply('dep-7f3a91c4e2b8')))
    const fellBack = makeRecord({ ...record('om', 2, true), runId: 'fell-back' }, run(s, () => BUILTIN_SUMMARY('x'), (h) => h.reply('dep-7f3a91c4e2b8')))
    const report = renderReport([record('om', 0, true), floor, fellBack, record('builtin', 0, true)])
    const paths = report.slice(report.indexOf('### Compaction paths'))
    expect(paths).toContain('| version | configuration | compactions | observational memory | floor (brief compiled by code) | fork handoff | built-in (fell back: run invalid) |')
    expect(paths).toContain('| new | om | 3 | 1 | 1 | 0 | 1 |')
    expect(paths).not.toContain('| new | builtin |')
    expect(report.split('\n').find((l) => l.startsWith('| new | om | 3 |'))).toContain('| 3 | 2 | 100% |') // the floor's run is valid
  })

  test('a run that did not complete counts as a failure to run, never as a success', () => {
    const failed: RunRecord = { ...record('om', 0, true), runId: 'stalled', score: undefined, error: 'herdr agent prompt: agent_prompt_stalled' }
    const report = renderReport([failed])
    expect(report).toContain('| new | om | 1 | 0 | – |')
    expect(report).toContain('stalled (om, new, omitted-identifier): did not complete: herdr agent prompt: agent_prompt_stalled')
  })

  test('says which part of the memory carried each fact, and separates measured, estimated and unavailable cost', () => {
    const noStats = record('om', 1, true)
    const report = renderReport([record('om', 0, true), { ...noStats, cost: { ...noStats.cost!, memoryModel: { status: 'unavailable', reason: 'no stats file' } } }])
    expect(report).toContain('| new | om | omitted-identifier | dep-7f3a91c4e2b8 | 0 of 2 |')
    expect(report).toMatch(/memory model \(USD, measured\)/)
    expect(report).toContain('memory model cost and reflections unavailable in 1 run(s)')
    expect(report).toMatch(/cost \(USD, estimated\)/)
    // Without a host cost record, a built-in run's cost leaves its compactor out, and the report says so.
    expect(renderReport([record('builtin', 0, true)])).toContain("Built-in compaction runs without a host cost record: 1; their cost leaves the compactor's request out.")
  })

  test('a cell whose runs all ran but were invalid says how many were valid, not that it did not run', () => {
    const fellBack = (i: number) => makeRecord({ ...record('om', i, true, 'live'), runId: `fell-back-${i}` }, run(s, () => BUILTIN_SUMMARY('x'), (h) => h.reply('dep-7f3a91c4e2b8')))
    const report = renderReport([0, 1, 2].map(fellBack).concat(record('builtin', 0, true, 'live')), { versions: ['new'] })
    const perScenario = report.slice(report.indexOf('### Task success per scenario'))
    expect(perScenario).toContain('| omitted-identifier | 1/1 | 0 of 3 valid |')
    expect(report).toContain('- new om omitted-identifier: 0 of 3 valid')
    expect(report).toContain('- new builtin+recall omitted-identifier: not run live')
    expect(report).not.toContain('- new om omitted-identifier: not run live')
  })

  test('reports honest abstention as its own outcome, apart from task success', () => {
    const rr = scenarioById('recall-required')!
    const one = (config: Configuration, i: number, reply: string, summary: () => string) =>
      makeRecord(
        { runId: runIdOf(config, 'new', rr.id, i), mode: 'offline', configuration: config, version: 'new', scenario: rr.id, run: i, startedAt: '2026-09-24T12:00:00Z', model: 'sonnet', transcripts: [], pluginCommit: 'abc1234' },
        run(rr, summary, (h) => h.reply(reply)),
      )
    const builtin = () => BUILTIN_SUMMARY('Ran the shard audit.')
    const report = renderReport([
      one('builtin', 0, "I can't find shard-101's checksum in this session.", builtin),
      one('builtin', 1, "shard-101's checksum was ck-5b1e09c4a7d2f3e8.", builtin),
      one('om', 0, "I can't find shard-101's checksum in this session.", () => OM_SUMMARY('* ran the shard audit')),
    ])
    expect(report).toContain('| recall-required | 0/2 | 0/1 |')
    const abstention = report.slice(report.indexOf('### Honest abstention'))
    expect(abstention).toContain('| recall-required | 1 of 2 | 1 of 1 |')
  })

  test("shows the reflections the plugin's stats recorded, the models that answered and each version's commit", () => {
    const report = renderReport([record('om', 0, true), record('om', 2, true)])
    const header = report.split('\n').find((l) => l.startsWith('| version |'))!.split(' | ')
    const row = report.split('\n').find((l) => l.startsWith('| new | om |'))!.split(' | ')
    expect(row[header.indexOf('reflections (measured)')]).toBe('1.00 ± 1.41 [0.00–2.00]')
    expect(report).toContain('Models that answered: claude-sonnet-4-5 (sessions started with sonnet).')
    expect(report).toContain('Plugin version new: commit abc1234.')
  })
})

// The fork plugin's compaction as the transcript records it: its user message (the wrapper, FORK_HEADER, the user's
// messages), then the handoff as an assistant message.
const FORK_SUMMARY = (users: string) => `${COMPACT_WRAPPER}\n\n${FORK_HEADER}\n\n<all-user-messages>\n* User (10 chars):\n${users}\n</all-user-messages>`
function forkRun(s: Scenario, handoff: string, answer: (h: ReturnType<typeof history>) => void) {
  const h = history()
  s.steps.forEach((step, i) => {
    if ('grow' in step) throw new Error('not for a growing scenario')
    if (!('prompt' in step)) return h.compact(FORK_SUMMARY('(the plan)'), { durationMs: 9000 }).reply(handoff, { input: 0, output: 0, read: 0, write: 0 })
    h.prompt(step.prompt)
    if (i === 0) SETUP[s.id]?.(h)
    h.reply('ok')
  })
  h.prompt(s.continuation)
  answer(h)
  return parseTranscript(h.text())
}

describe('fork-handoff compaction (issue #16)', () => {
  const plan = scenario('multi-step-plan')
  const HANDOFF = 'Live request: release ratelimit 2.4.0. Findings: merge commit m-5d2c9e71ab04. Rules: step 4 runs as bash bench.sh --runs 5; publish.sh waits for approval. Next actions: 1. bump VERSION'
  // The continuation that resumes at step 3, runs step 4 as changed and stops before step 5.
  const resumes = (h: ReturnType<typeof history>) =>
    h
      .tool('Write', { file_path: '/p/VERSION', content: '2.4.0\n' }, 'ok')
      .tool('Edit', { file_path: '/p/CHANGELOG.md', old_string: '# Changelog\n', new_string: '# Changelog\n\n## 2.4.0\n\n- Burst window (merge m-5d2c9e71ab04).\n' }, 'ok')
      .tool('Bash', { command: 'bash bench.sh --runs 5' }, 'run 1: p50=1.8ms\nbench complete: 5 runs on 2.4.0')
      .reply('Steps 3 and 4 are done. Shall I run publish.sh (step 5)?')

  test('the fork message and its handoff are the fork path; the handoff counts as a part that carried each fact', () => {
    const score = scoreRun(plan, 'fork', forkRun(plan, HANDOFF, resumes))
    expect(score.invalid).toEqual([])
    expect(score.compactions.map((c) => c.path)).toEqual(['fork'])
    expect(score.compactions[0]!.carriers['m-5d2c9e71ab04']).toEqual(['handoff'])
    expect(score.compactions[0]!.carriers['--runs 5']).toEqual(['handoff'])
    expect(FORK_HEADER.startsWith(FORK_MARK)).toBe(true)
  })

  test('a fork configuration that fell back to the built-in summary is invalid, and so is a fork message in any other configuration', () => {
    const fellBack = run(plan, () => BUILTIN_SUMMARY('Released.'), resumes)
    expect(scoreRun(plan, 'fork+recall', fellBack).invalid.join()).toMatch(/fell back to the built-in summary/)
    expect(scoreRun(plan, 'om', forkRun(plan, HANDOFF, resumes)).invalid.join()).toMatch(/fork handoff: the fork plugin was loaded/)
    expect(scoreRun(plan, 'builtin', forkRun(plan, HANDOFF, resumes)).invalid.join()).toMatch(/fork handoff/)
  })

  test('multi-step-plan: resuming at step 3 with the changed step 4, and stopping before publishing, passes every check', () => {
    const score = scoreRun(plan, 'fork', forkRun(plan, HANDOFF, resumes))
    expect(score.taskSuccess).toBe(true)
    expect(score.checks.filter((c) => c.outcome === 'fail')).toEqual([])
  })

  test('multi-step-plan: redoing step 1 or 2, skipping step 3, the default benchmark or publishing each fail their check', () => {
    const failed = (answer: (h: ReturnType<typeof history>) => void) =>
      scoreRun(plan, 'fork', forkRun(plan, HANDOFF, answer)).checks.filter((c) => c.outcome === 'fail').map((c) => c.id)
    expect(failed((h) => resumes(h.tool('Bash', { command: 'bash merge.sh' }, 'error: feature/burst-window is already merged')))).toEqual(['no-remerge'])
    expect(failed((h) => resumes(h.tool('Bash', { command: 'bash test.sh' }, '=== 300 passed')))).toEqual(['no-retest'])
    expect(failed((h) => resumes(h.tool('Bash', { command: 'bash bench.sh --runs 5' }, 'error: VERSION is still 2.3.0; bump it before benchmarking')))).toEqual(['no-skip'])
    expect(failed((h) => resumes(h.tool('Bash', { command: 'bash bench.sh' }, 'bench complete: 3 runs on 2.4.0')))).toEqual(['no-default-bench'])
    expect(failed((h) => resumes(h).tool('Bash', { command: 'bash publish.sh' }, 'published ratelimit 2.4.0'))).toEqual(['no-publish'])
    // A lost commit id: the entry names another, or none.
    const guessed = (h: ReturnType<typeof history>) =>
      h
        .tool('Write', { file_path: '/p/VERSION', content: '2.4.0\n' }, 'ok')
        .tool('Edit', { file_path: '/p/CHANGELOG.md', old_string: '', new_string: '## 2.4.0\n\n- Merge m-0000aaaa1111.\n' }, 'ok')
        .tool('Bash', { command: 'bash bench.sh --runs 5' }, 'bench complete: 5 runs on 2.4.0')
    expect(failed(guessed)).toEqual(['changelog-id', 'no-invented-id'])
  })

  test("reads the fork plugin's stats: each fork's usage priced at the session model's rates, and each compaction's path", () => {
    const sonnet = PRICES_USD_PER_MTOK.find((p) => p.model.test('claude-sonnet-5'))!
    const stats = JSON.stringify({
      version: 1,
      sessionId: 's',
      model: 'claude-sonnet-5',
      counts: { 'compaction.manual.forkedAtCompaction': 1 },
      metrics: {},
      forks: [
        { phase: 'compaction', outcome: 'answered', ms: 8000, usage: { input_tokens: 10, output_tokens: 1000, cache_read_input_tokens: 100_000, cache_creation_input_tokens: 2000 } },
        { phase: 'early', outcome: 'api_error', ms: 300 },
      ],
      compactions: [{ trigger: 'manual', path: 'compaction', ms: 8100, handoffTokens: 900, tailTokens: 40 }],
    })
    const parsed = parseStats(stats)!
    const usd = (10 * sonnet.input + 1000 * sonnet.output + 100_000 * sonnet.cacheRead + 2000 * sonnet.cacheWrite5m) / 1e6
    expect(parsed.memoryUsd).toBe(Math.round(usd * 1e6) / 1e6)
    expect(parsed.memoryCalls).toBe(2)
    expect(parsed.fellBack).toBe(0)
    expect(parsed.fork!.forks.map((f) => [f.phase, f.outcome, f.cacheRead])).toEqual([
      ['compaction', 'answered', 100_000],
      ['early', 'api_error', 0],
    ])
    const t = forkRun(plan, HANDOFF, resumes)
    expect(runCost('fork', t, stats).memoryModel).toEqual({ status: 'measured', value: parsed.memoryUsd })
    expect(runCost('fork+recall', t).memoryModel.status).toBe('unavailable')
    // A fallback the stats record makes the run invalid, as om's do.
    const fell = parseStats(JSON.stringify({ counts: { 'compaction.manual.fellBack': 1 }, forks: [], compactions: [{ trigger: 'manual', path: 'fellBack', ms: 5 }] }))!
    expect(scoreRun(plan, 'fork', t, fell).invalid.join()).toMatch(/1 compaction\(s\) that fell back/)
  })

  test('the report gives the fork runs a handoff section: forks, paths, cost and cache reads per compaction, latency', () => {
    const stats = JSON.stringify({
      model: 'claude-sonnet-5',
      counts: {},
      metrics: {},
      forks: [{ phase: 'early', outcome: 'answered', ms: 20_000, usage: { input_tokens: 5, output_tokens: 2000, cache_read_input_tokens: 150_000, cache_creation_input_tokens: 0 } }],
      compactions: [{ trigger: 'auto', path: 'early', ms: 40, gapMs: 60_000, handoffTokens: 1800 }],
    })
    const rec = (config: LiveConfiguration) =>
      makeRecord(
        { runId: runIdOf(config, 'fork1', plan.id, 1), mode: 'live', configuration: config, version: 'fork1', scenario: plan.id, run: 1, startedAt: '2026-09-24T12:00:00Z', model: 'sonnet', transcripts: [], pluginCommit: 'abc1234' },
        forkRun(plan, HANDOFF, resumes),
        stats,
      )
    const report = renderReport([rec('fork'), rec('fork+recall')], { versions: ['fork1'] })
    const section = report.slice(report.indexOf('### Fork handoff'))
    expect(section).toContain('| cache read tokens per fork |')
    const row = section.split('\n').find((l) => l.startsWith('| fork1 | fork |'))!
    expect(row).toContain('| 1 | 1 | 1 | 0 | 0 | 1 (1 early) | 0 |')
    expect(row).toContain('| 150000 |')
    expect(report).toContain('| fork1 | fork | 1 | 0 | 0 | 1 | 0 |') // the compaction paths table
    // The fork configurations join the not-run list only where a run of them is recorded.
    expect(report).toContain('- fork1 fork absent-fact: not run live')
    expect(renderReport([], { versions: ['fork1'] })).not.toContain('fork1 fork absent-fact')
  })
})
