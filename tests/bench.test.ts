import { describe, expect, test } from 'claude-code/testing'
import { MEMORY_MARK, PRICES_USD_PER_MTOK, RECALL_TOOL, parseTranscript, runCost, scoreRun } from './eval/bench'
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
    compact: (summary: string, meta: { durationMs?: number; preTokens?: number; postTokens?: number } = {}) => {
      rows.push({ ...base(), type: 'user', isMeta: true, message: { role: 'user', content: '<command-name>/compact</command-name>' } })
      rows.push({ ...base(), type: 'system', subtype: 'compact_boundary', compactMetadata: { trigger: 'manual', preTokens: meta.preTokens ?? 30000, postTokens: meta.postTokens ?? 3000, durationMs: meta.durationMs ?? 5000 } })
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

  test('is unavailable when a message names a model the table does not price, and skips synthetic messages', () => {
    const h = history().prompt('go').reply('a', {}, '<synthetic>').reply('b', {}, 'some-unknown-model')
    const cost = runCost('builtin', parseTranscript(h.text()))
    expect(cost.mainLoop.status).toBe('unavailable')
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

// A scenario run as a transcript: its prompts and compactions in order, then the continuation and `answer` to it.
const OM_SUMMARY = (body: string) => `This session is being continued from a previous conversation that ran out of context.\n\n${MEMORY_MARK}: what happened...\n\n<observations>\n${body}\n</observations>\n\n<all-user-messages>\n* User: Run bash deploy.sh\n</all-user-messages>`
const BUILTIN_SUMMARY = (body: string) => `This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\n${body}`
function run(s: Scenario, summary: (i: number) => string, answer: (h: ReturnType<typeof history>) => void) {
  const h = history()
  let point = 0
  for (const step of s.steps) 'prompt' in step ? h.prompt(step.prompt).reply('ok') : h.compact(summary(point++), { durationMs: 1200 + point })
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

  test('tool checks read the written file: a reversed constraint followed, or the superseded one applied', () => {
    const s = scenario('reversed-constraint')
    const edit = (body: string) => (h: ReturnType<typeof history>) => h.tool('Edit', { file_path: '/tmp/x/src/textutil.py', old_string: '', new_string: body }, 'ok').reply('Done.')
    const good = scoreRun(s, 'om', run(s, () => OM_SUMMARY('* 🔴 user: 4 spaces, never tabs'), edit('\ndef slugify(text):\n    return "-".join(text.lower().split())\n')))
    expect(good.taskSuccess).toBe(true)
    const bad = scoreRun(s, 'om', run(s, () => OM_SUMMARY('* 🔴 user: tabs'), edit('\ndef slugify(text):\n\treturn "-".join(text.lower().split())\n')))
    expect(bad.checks.filter((c) => c.outcome === 'fail').map((c) => c.id)).toEqual(['spaces', 'no-tabs'])
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

  test('a transcript without the continuation prompt is invalid', () => {
    const h = history().prompt('something else').reply('ok')
    expect(scoreRun(s, 'builtin', parseTranscript(h.text())).invalid.join()).toMatch(/continuation prompt/)
  })
})
