import { describe, expect, test } from 'claude-code/testing'
import { MEMORY_MARK, PRICES_USD_PER_MTOK, RECALL_TOOL, makeRecord, parseTranscript, renderReport, runCost, scoreRun } from './eval/bench'
import type { RunRecord } from './eval/bench'
import { runIdOf } from './eval/live'
import type { Configuration } from './eval/runner'
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
}
// A scenario run as a transcript: its prompts (the first followed by its setup) and compactions in order, then the
// continuation and `answer` to it.
const OM_SUMMARY = (body: string) => `This session is being continued from a previous conversation that ran out of context.\n\n${MEMORY_MARK}: what happened...\n\n<observations>\n${body}\n</observations>\n\n<all-user-messages>\n* User: Run bash deploy.sh\n</all-user-messages>`
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
  const invented = (h: ReturnType<typeof history>) => h.reply("shard-101's checksum was ck-5b1e09c4a7d2f3e8.")

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
      abstains: 'n/a',
    })
    expect(score.retrieval).toMatchObject({ calls: 1, hits: 2, checked: 2 })
  })

  test('the summary held it without recall: the task succeeds, and the run shows recall was not called', () => {
    const score = scoreRun(s, 'om+recall', run(s, () => OM_SUMMARY(`* shard-101 checksum ${CHECKSUM}`), (h) => h.reply(`It was ${CHECKSUM}.`)))
    expect(score.taskSuccess).toBe(true)
    expect(outcomes(score)).toMatchObject({ 'exact-checksum': 'pass', 'called-recall': 'fail', 'recall-finds': 'n/a', abstains: 'n/a' })
    expect(score.retrieval).toMatchObject({ calls: 0, hits: 0, checked: 1 })
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
        abstains: 'pass',
      })
      expect(score).toMatchObject({ unsupportedClaims: 0, violations: 0 })
    }
  })

  test('an invented checksum is an unsupported claim and no abstention', () => {
    const score = scoreRun(s, 'builtin', run(s, builtin, invented))
    expect(score.taskSuccess).toBe(false)
    expect(outcomes(score)).toMatchObject({ 'exact-checksum': 'fail', 'no-other-checksum': 'fail', abstains: 'fail' })
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

  test('invalid when the audit is not in the history before the first compaction, or an om compaction fell back', () => {
    const noAudit = scoreRun(s, 'builtin', run(s, builtin, abstained, () => {}))
    expect(noAudit.invalid.join()).toMatch(/lacks its setup: the history ran the shard audit/)
    // The audit ran but printed no checksum (a second run): no setup either.
    const refused = scoreRun(s, 'builtin', run(s, builtin, abstained, (h) => h.tool('Bash', { command: 'bash shards.sh' }, 'error: the shard audit already ran', { isError: true })))
    expect(refused.invalid.join()).toMatch(/lacks its setup/)
    expect(scoreRun(s, 'om', run(s, builtin, abstained)).invalid.join()).toMatch(/fell back/)
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

  test("the stats file's fallback count invalidates an om run too", () => {
    const score = scoreRun(s, 'om', run(s, () => OM_SUMMARY('x'), answered), { memoryUsd: 0, memoryCalls: 0, reflections: 0, fellBack: 1, failures: 0 })
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
