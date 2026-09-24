// The continuation-quality benchmark (issue #9): scores what an assistant did after compaction in one scenario run
// (`scenarios.ts`), prices the run, keeps its evidence, and reports runs per configuration and plugin version.
//
// It reads a Claude Code session transcript (JSONL) and, for the observational-memory configurations, the plugin's
// stats file; it never calls a model. `scripts/bench-live.ts` produces live runs; tests build synthetic transcripts
// and label their records `offline`. Live and offline runs are never pooled.
//
// Scoring is deterministic: regular expressions over the assistant's replies and tool calls after the continuation
// prompt, and over what `om_recall` returned. No check is model-graded; a report says so. A run is scored only when it
// is valid: its history holds the scenario's setup (the tool calls the continuation depends on), the continuation got
// a response, every scenario compaction happened (in a scenario that grows until Claude Code compacts on its own: at
// least one compaction, each with the `auto` trigger of its `compact_boundary` row), the compaction ran the path its
// configuration names (an `om` run whose compaction fell back to the built-in summary measures the built-in one, so
// it is reported as invalid, not scored as observational memory), and a configuration without recall did not call
// it. Invalid runs are counted and listed with their reasons, never dropped.
//
// Cost: subscription sessions report no dollars, so cost is token-equivalent: each assistant message's usage (counted
// once, however many rows streaming wrote for it) times `PRICES_USD_PER_MTOK`. The built-in compactor's own request
// is not written as a transcript message; when the host writes its `cost-state` record, its total is reported beside
// ours as `hostReported`; without that record a built-in run's total leaves its compaction out, and the report says
// how many runs that is. The plugin's Observer and Reflector calls are its own model (pi); their cost is the sum of
// the `*.cost` metrics the plugin's stats file records, or unavailable without that file.

import type { Configuration, Measurement } from './runner'
import { CONFIGURATIONS, estimated, measured, recallAvailable, unavailable, usesObservationalCompaction } from './runner'
import { SCENARIOS, scenarioById } from './scenarios'
import type { Check, CheckCategory, Scenario } from './scenarios'

// ---- VERIFY BEFORE A LIVE RUN: list prices in USD per million tokens, matched against each message's model id. ----
// Cache writes: the five-minute and one-hour rates; a row that does not split its cache writes is priced at the
// one-hour rate, an upper bound. A model no row matches makes the run's cost unavailable rather than guessed.
export const PRICES_USD_PER_MTOK: readonly { model: RegExp; input: number; output: number; cacheWrite5m: number; cacheWrite1h: number; cacheRead: number }[] = [
  { model: /sonnet/i, input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  { model: /haiku/i, input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.1 },
  { model: /opus/i, input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
]

// The first words of the observational-memory message, identical in c6c86a3 and main (hooks/prompts.ts
// MEMORY_HEADER). Copied, not imported: the scorer does not depend on the module it evaluates.
export const MEMORY_MARK = 'The following observations block is your memory of this session'
export const RECALL_TOOL = 'mcp__observational-memory__om_recall'

// ---- Transcript ----

export type Entry = { line: number; at?: number } & (
  | { kind: 'prompt'; text: string }
  | { kind: 'summary'; text: string }
  | { kind: 'boundary'; trigger?: string; preTokens?: number; postTokens?: number; durationMs?: number }
  | { kind: 'text'; text: string }
  | { kind: 'tool'; id: string; name: string; input: unknown }
  | { kind: 'result'; id: string; text: string; isError: boolean }
)
type Usage = { input: number; output: number; cacheRead: number; cacheWrite5m: number; cacheWrite1h: number; cacheWriteUnsplit: number }
export type Transcript = {
  entries: Entry[]
  /** Each assistant message's model and usage, by message id: the last row streaming wrote for it. */
  messages: Map<string, { model: string; usage: Usage }>
  hostCostUsd?: number
  /** Lines that were not JSON. */
  unparsed: number
}

type Block = { type?: string; text?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; content?: unknown; is_error?: boolean }
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const blockText = (content: unknown): string =>
  typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? (content as Block[]).map((b) => (typeof b === 'string' ? b : b.type === 'text' ? (b.text ?? '') : '')).join('\n')
      : ''
// Text the host writes as a user row that the user did not type: slash-command echoes and their output.
const INJECTED = /^\s*<(?:command-name|command-message|command-args|local-command-stdout|local-command-stderr|local-command-caveat)>|^Caveat: /

export function parseTranscript(jsonl: string): Transcript {
  const entries: Entry[] = []
  const messages = new Map<string, { model: string; usage: Usage }>()
  const seen = new Set<string>()
  let hostCostUsd: number | undefined
  let unparsed = 0
  let afterBoundary = false
  jsonl.split('\n').forEach((raw, i) => {
    if (!raw.trim()) return
    let row: Record<string, any>
    try {
      row = JSON.parse(raw)
    } catch {
      unparsed++
      return
    }
    const line = i + 1
    if (row.type === 'cost-state' && typeof row.totalCostUSD === 'number') hostCostUsd = row.totalCostUSD
    if (typeof row.uuid === 'string') {
      if (seen.has(row.uuid)) return
      seen.add(row.uuid)
    }
    if (row.isSidechain) return
    const parsedAt = typeof row.timestamp === 'string' ? Date.parse(row.timestamp) : NaN
    const at = Number.isNaN(parsedAt) ? {} : { at: parsedAt }
    if (row.type === 'system' && row.subtype === 'compact_boundary') {
      const m = row.compactMetadata ?? {}
      entries.push({ kind: 'boundary', line, ...at, trigger: m.trigger, preTokens: m.preTokens, postTokens: m.postTokens, durationMs: m.durationMs })
      afterBoundary = true
      return
    }
    const message = row.message
    if (!message) return
    if (row.type === 'assistant') {
      if (typeof message.id === 'string' && message.usage) {
        const u = message.usage
        const split = u.cache_creation ?? {}
        const w5 = num(split.ephemeral_5m_input_tokens)
        const w1 = num(split.ephemeral_1h_input_tokens)
        messages.set(message.id, {
          model: String(message.model ?? ''),
          usage: {
            input: num(u.input_tokens),
            output: num(u.output_tokens),
            cacheRead: num(u.cache_read_input_tokens),
            cacheWrite5m: w5,
            cacheWrite1h: w1,
            cacheWriteUnsplit: Math.max(0, num(u.cache_creation_input_tokens) - w5 - w1),
          },
        })
      }
      for (const b of (Array.isArray(message.content) ? message.content : []) as Block[]) {
        if (b.type === 'text' && b.text && b.text !== '(no content)') entries.push({ kind: 'text', line, ...at, text: b.text })
        if (b.type === 'tool_use') entries.push({ kind: 'tool', line, ...at, id: String(b.id ?? ''), name: String(b.name ?? ''), input: b.input ?? {} })
      }
      return
    }
    if (row.type !== 'user') return
    const blocks = (Array.isArray(message.content) ? message.content : []) as Block[]
    for (const b of blocks)
      if (b.type === 'tool_result') entries.push({ kind: 'result', line, ...at, id: String(b.tool_use_id ?? ''), text: blockText(b.content), isError: b.is_error === true })
    if (row.isMeta || blocks.some((b) => b.type === 'tool_result')) return
    const text = blockText(message.content)
    if (!text.trim() || INJECTED.test(text)) return
    // The first user text after a compaction boundary is what the compaction returned: its summary or memory message.
    entries.push({ kind: afterBoundary || row.isCompactSummary ? 'summary' : 'prompt', line, ...at, text })
    afterBoundary = false
  })
  return { entries, messages, ...(hostCostUsd === undefined ? {} : { hostCostUsd }), unparsed }
}

// ---- Cost ----

export type OmStats = { memoryUsd: number; memoryCalls: number; reflections: number; fellBack: number; failures: number }

/** The plugin's stats file (hooks/stats.ts SessionStats, the same metric names in c6c86a3 and main). */
export function parseStats(json: string): OmStats | undefined {
  let s: { counts?: Record<string, number>; metrics?: Record<string, { count?: number; sum?: number }> }
  try {
    s = JSON.parse(json)
  } catch {
    return undefined
  }
  const metrics = Object.entries(s.metrics ?? {})
  const counts = Object.entries(s.counts ?? {})
  const costs = metrics.filter(([k]) => /^(?:observer|reflector)\.[\w-]+\.cost$/.test(k))
  return {
    memoryUsd: round(costs.reduce((t, [, m]) => t + num(m.sum), 0)),
    memoryCalls: costs.reduce((t, [, m]) => t + num(m.count), 0),
    reflections: num(s.metrics?.['reflection.ms']?.count),
    fellBack: counts.filter(([k]) => /^compaction\.[\w-]+\.fellBack$/.test(k)).reduce((t, [, n]) => t + num(n), 0),
    failures: counts.filter(([k]) => /\.failed\./.test(k)).reduce((t, [, n]) => t + num(n), 0),
  }
}

export type RunCost = {
  /** Exact token counts from the transcript's assistant messages. */
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number }
  /** Those tokens at `PRICES_USD_PER_MTOK`: an estimate, since a subscription pays no per-token price. */
  mainLoop: Measurement<number>
  /** The plugin's Observer and Reflector calls, from its stats file. */
  memoryModel: Measurement<number>
  memoryCalls?: number
  /** The host's own `cost-state` total, when it wrote one: it includes requests the transcript does not (compaction, titles). */
  hostReported: Measurement<number>
  /** What the budget counts: the larger of mainLoop and hostReported, plus memoryModel; unavailable when both of the first are. */
  total: Measurement<number>
}

const round = (n: number) => Math.round(n * 1e6) / 1e6

export function runCost(config: Configuration, t: Transcript, statsJson?: string): RunCost {
  const tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  let usd = 0
  const unpriced = new Set<string>()
  for (const { model, usage: u } of t.messages.values()) {
    if (model === '<synthetic>') continue
    tokens.input += u.input
    tokens.output += u.output
    tokens.cacheRead += u.cacheRead
    tokens.cacheWrite += u.cacheWrite5m + u.cacheWrite1h + u.cacheWriteUnsplit
    const p = PRICES_USD_PER_MTOK.find((x) => x.model.test(model))
    if (!p) {
      unpriced.add(model || '(none)')
      continue
    }
    usd += (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite5m * p.cacheWrite5m + (u.cacheWrite1h + u.cacheWriteUnsplit) * p.cacheWrite1h) / 1e6
  }
  const mainLoop = unpriced.size ? unavailable(`no price for model ${[...unpriced].join(', ')} in PRICES_USD_PER_MTOK`) : estimated(round(usd))
  const stats = statsJson === undefined ? undefined : parseStats(statsJson)
  const memoryModel = !usesObservationalCompaction(config)
    ? measured(0)
    : stats
      ? measured(stats.memoryUsd)
      : unavailable(statsJson === undefined ? 'the plugin wrote no stats file for this session' : 'the stats file is not valid JSON')
  const hostReported = t.hostCostUsd === undefined ? unavailable('the transcript has no cost-state record') : measured(t.hostCostUsd)
  const main = Math.max(mainLoop.status === 'unavailable' ? -1 : mainLoop.value, hostReported.status === 'unavailable' ? -1 : hostReported.value)
  const total =
    main < 0 ? unavailable('neither the transcript usage nor the host priced this run') : estimated(round(main + (memoryModel.status === 'unavailable' ? 0 : memoryModel.value)))
  return { tokens, mainLoop, memoryModel, ...(stats && usesObservationalCompaction(config) ? { memoryCalls: stats.memoryCalls } : {}), hostReported, total }
}

// ---- Scoring ----

export type CheckResult = { id: string; category: CheckCategory; description: string; outcome: 'pass' | 'fail' | 'n/a'; evidence: string }
export type CompactionPath = 'observational' | 'built-in'
export type CompactionScore = {
  path: CompactionPath
  durationMs: Measurement<number>
  preTokens?: number
  postTokens?: number
  /** For each scenario fact, the parts of this compaction's first message that hold it: `observations`, `corrections`, `all-user-messages`, a `skill`, ..., or `summary` for the built-in one. */
  carriers: Record<string, string[]>
}
export type RunScore = {
  valid: boolean
  /** Why the run cannot be scored as its configuration; empty when valid. */
  invalid: string[]
  checks: CheckResult[]
  /** Valid, and no check failed other than a retrieval or abstention one: those outcomes are reported apart. */
  taskSuccess: boolean
  /** The fraction of correctness checks that passed. */
  correctness: number
  violations: number
  repeatedWork: number
  unsupportedClaims: number
  retrieval: { calls: number; resultTokens: Measurement<number>; hits: number; checked: number }
  compactions: CompactionScore[]
  continuationMs: Measurement<number>
  /** The assistant's text after the continuation prompt, cut to 2000 characters: the evidence a reply check read. */
  reply: string
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}...` : s)
// The text a tool call writes or runs: every string in its input except what an Edit replaces.
const strings = (v: unknown): string[] =>
  typeof v === 'string'
    ? [v]
    : Array.isArray(v)
      ? v.flatMap(strings)
      : v && typeof v === 'object'
        ? Object.entries(v).flatMap(([k, x]) => (k === 'old_string' ? [] : strings(x)))
        : []
const describeCall = (e: Extract<Entry, { kind: 'tool' }>) => `${e.name} ${cut(JSON.stringify(e.input), 400)} (transcript line ${e.line})`

// The tagged parts of a compaction's first message; the rest of it counts as `summary`.
function sections(text: string, path: CompactionPath): { name: string; text: string }[] {
  if (path === 'built-in') return [{ name: 'summary', text }]
  const found: { name: string; text: string }[] = []
  const rest = text.replace(/<([a-z][\w-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g, (_, name: string, body: string) => (found.push({ name, text: body }), ''))
  return [...found, { name: 'summary', text: rest }]
}

function checkOne(c: Check, reply: string, calls: Extract<Entry, { kind: 'tool' }>[], recalls: string[], results: ReadonlyMap<string, string> = new Map()): CheckResult {
  const flags = c.flags ?? 'i'
  const head = { id: c.id, category: c.category, description: c.description }
  if (c.kind === 'recall') {
    if (!recalls.length) return { ...head, outcome: 'n/a', evidence: 'om_recall was not called' }
    const hit = recalls.find((r) => new RegExp(c.pattern, flags).test(r))
    return { ...head, outcome: hit ? 'pass' : 'fail', evidence: hit ? cut(hit, 400) : `${recalls.length} om_recall result(s), none matching /${c.pattern}/: ${cut(recalls.join(' | '), 400)}` }
  }
  if (c.kind === 'reply') {
    const m = new RegExp(c.pattern, flags).exec(reply)
    const pass = c.expect === 'present' ? !!m : !m
    const evidence = m ? `"...${reply.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80)}..."` : `no match for /${c.pattern}/ in the reply: "${cut(reply, 300)}"`
    return { ...head, outcome: pass ? 'pass' : 'fail', evidence }
  }
  const matching = calls.filter((e) => {
    if (!new RegExp(c.tool).test(e.name)) return false
    const input = (e.input ?? {}) as Record<string, unknown>
    const target = [input.file_path, input.path, input.notebook_path, input.command].find((v) => typeof v === 'string') as string | undefined
    if (c.path && !(target !== undefined && new RegExp(c.path, flags).test(target))) return false
    if (c.text && !new RegExp(c.text, flags).test(strings(input).join('\n'))) return false
    return !c.result || new RegExp(c.result, flags).test(results.get(e.id) ?? '')
  })
  const pass = c.expect === 'present' ? matching.length > 0 : matching.length === 0
  const evidence = matching.length
    ? matching.map(describeCall).join('\n')
    : `no call to /${c.tool}/${c.path ? ` on /${c.path}/` : ''}${c.text ? ` with /${c.text}/` : ''}${c.result ? ` returning /${c.result}/` : ''} among ${calls.length} tool call(s)${calls.length ? `: ${calls.map(describeCall).join('\n')}` : ''}`
  return { ...head, outcome: pass ? 'pass' : 'fail', evidence }
}

export function scoreRun(s: Scenario, config: Configuration, t: Transcript, stats?: OmStats): RunScore {
  const invalid: string[] = []
  const boundaries = t.entries.flatMap((e, i) => (e.kind === 'boundary' ? [{ e, i }] : []))
  if (s.steps.some((x) => 'grow' in x)) {
    // Claude Code compacts on its own: any number of times, never by a manual `/compact`.
    if (!boundaries.length) invalid.push('no compaction happened before the continuation')
    boundaries.forEach(({ e }, i) => {
      const trigger = (e as Extract<Entry, { kind: 'boundary' }>).trigger
      if (trigger !== 'auto') invalid.push(`compaction ${i + 1} was ${trigger ?? 'of no recorded trigger'}, not automatic`)
    })
  } else {
    const expected = s.steps.filter((x) => 'compact' in x).length
    if (boundaries.length !== expected) invalid.push(`the scenario schedules ${expected} compaction(s); the transcript has ${boundaries.length}`)
  }

  const compactions: CompactionScore[] = boundaries.map(({ e, i }) => {
    const next = t.entries.slice(i + 1).find((x) => x.kind === 'summary' || x.kind === 'boundary')
    const text = next?.kind === 'summary' ? next.text : ''
    const path: CompactionPath = text.includes(MEMORY_MARK) ? 'observational' : 'built-in'
    const parts = sections(text, path)
    const b = e as Extract<Entry, { kind: 'boundary' }>
    return {
      path,
      durationMs: b.durationMs === undefined ? unavailable('the boundary records no duration') : measured(b.durationMs),
      ...(b.preTokens === undefined ? {} : { preTokens: b.preTokens }),
      ...(b.postTokens === undefined ? {} : { postTokens: b.postTokens }),
      carriers: Object.fromEntries(s.facts.map((f) => [f, parts.filter((p) => p.text.toLowerCase().includes(f.toLowerCase())).map((p) => p.name)])),
    }
  })
  compactions.forEach((c, i) => {
    if (usesObservationalCompaction(config) && c.path === 'built-in') invalid.push(`compaction ${i + 1} fell back to the built-in summary`)
    if (!usesObservationalCompaction(config) && c.path === 'observational') invalid.push(`compaction ${i + 1} returned the observational-memory message: the plugin was loaded`)
  })
  if (usesObservationalCompaction(config) && stats?.fellBack) invalid.push(`the plugin's stats record ${stats.fellBack} compaction(s) that fell back to the built-in one`)
  if (!recallAvailable(config) && t.entries.some((e) => e.kind === 'tool' && e.name === RECALL_TOOL)) invalid.push(`om_recall was called although ${config} does not offer it`)

  // The history the first compaction had to carry: without its setup the run measures a failed history, not memory.
  const history = t.entries.slice(0, boundaries[0]?.i ?? t.entries.length)
  const results = new Map(t.entries.flatMap((e) => (e.kind === 'result' ? [[e.id, e.text] as const] : [])))
  for (const c of s.setup ?? []) {
    const r = checkOne(c, '', history.filter((e): e is Extract<Entry, { kind: 'tool' }> => e.kind === 'tool'), [], results)
    if (r.outcome === 'fail') invalid.push(`the history before the first compaction lacks its setup: ${c.description} (${r.evidence})`)
  }

  const want = normalize(s.continuation)
  const start = t.entries.findLastIndex((e) => e.kind === 'prompt' && normalize(e.text).includes(want))
  if (start < 0) invalid.push('the continuation prompt is not in the transcript')
  else if (boundaries.length && start < boundaries.at(-1)!.i) invalid.push('the continuation prompt came before the last compaction')
  const after = start < 0 ? [] : t.entries.slice(start + 1)
  const calls = after.filter((e): e is Extract<Entry, { kind: 'tool' }> => e.kind === 'tool')
  const reply = after.flatMap((e) => (e.kind === 'text' ? [e.text] : [])).join('\n')
  if (start >= 0 && !calls.length && !reply.trim()) invalid.push('no response to the continuation prompt')

  const recallIds = new Set(calls.filter((e) => e.name === RECALL_TOOL).map((e) => e.id))
  const recalls = after.flatMap((e) => (e.kind === 'result' && recallIds.has(e.id) ? [e.text] : []))
  // Retrieval is not applicable where om_recall is not offered: a missing call there is the configuration, not a miss.
  const scored = s.checks.map((c) =>
    c.category === 'retrieval' && !recallAvailable(config)
      ? { id: c.id, category: c.category, description: c.description, outcome: 'n/a' as const, evidence: `${config} does not offer om_recall` }
      : checkOne(c, reply, calls, recalls, results),
  )
  // Abstaining is the honest outcome only when the answer was not given: a reply that gave it did not need to.
  const answered = scored.some((c) => c.category === 'correctness') && scored.every((c) => c.category !== 'correctness' || c.outcome === 'pass')
  const checks = scored.map((c) => (c.category === 'abstention' && answered ? { ...c, outcome: 'n/a' as const, evidence: `every correctness check passed: ${c.evidence}` } : c))
  const failed = (cat: CheckCategory) => checks.filter((c) => c.category === cat && c.outcome === 'fail').length
  const correctnessChecks = checks.filter((c) => c.category === 'correctness')
  const retrievalChecks = checks.filter((c) => c.category === 'retrieval' && c.outcome !== 'n/a')
  const startAt = start < 0 ? undefined : t.entries[start]!.at
  const endAt = after.findLast((e) => e.at !== undefined)?.at
  return {
    valid: invalid.length === 0,
    invalid,
    checks,
    taskSuccess: invalid.length === 0 && checks.every((c) => c.category === 'retrieval' || c.category === 'abstention' || c.outcome !== 'fail'),
    correctness: correctnessChecks.length ? correctnessChecks.filter((c) => c.outcome === 'pass').length / correctnessChecks.length : 1,
    violations: failed('violation'),
    repeatedWork: failed('repeated-work'),
    unsupportedClaims: failed('unsupported-claim'),
    retrieval: {
      calls: recallIds.size,
      resultTokens: estimated(Math.ceil(recalls.join('').length / 4)),
      hits: retrievalChecks.filter((c) => c.outcome === 'pass').length,
      checked: retrievalChecks.length,
    },
    compactions,
    continuationMs:
      startAt !== undefined && endAt !== undefined ? measured(endAt - startAt) : unavailable('the transcript has no timestamps around the continuation'),
    reply: cut(reply, 2000),
  }
}

// ---- Records and the report ----

export type RunMeta = {
  runId: string
  /** `live`: a real session driven by scripts/bench-live.ts. `offline`: a synthetic or supplied transcript. */
  mode: 'live' | 'offline'
  configuration: Configuration
  /** The plugin version label: `old`, `new`, or an ablation's own label. */
  version: string
  scenario: string
  run: number
  startedAt: string
  /** The model the session was started with (an alias such as `sonnet`); the record's `models` are what answered. */
  model: string
  sessionId?: string
  transcripts: string[]
  stats?: string
  /** The plugin checkout the version label named, and its commit (`-dirty` when it had uncommitted changes). */
  pluginRoot?: string
  pluginCommit?: string
  /** What the budget admitted the run under. */
  admission?: { budgetUsd: number; spentUsd: number; reserveUsd: number }
}
/** One line of the results JSONL. A run that did not complete has `error` and no score. */
export type RunRecord = RunMeta & { score?: RunScore; cost?: RunCost; memory?: OmStats; models?: string[]; error?: string }

/** The model ids that answered in a transcript, as the host resolved them. */
export const modelsOf = (t: Transcript) => [...new Set([...t.messages.values()].map((m) => m.model).filter((m) => m && m !== '<synthetic>'))]

export function makeRecord(meta: RunMeta, t: Transcript, statsJson?: string): RunRecord {
  const s = scenarioById(meta.scenario)
  if (!s) throw new Error(`unknown scenario ${meta.scenario}`)
  const memory = statsJson === undefined ? undefined : parseStats(statsJson)
  return {
    ...meta,
    models: modelsOf(t),
    score: scoreRun(s, meta.configuration, t, memory),
    cost: runCost(meta.configuration, t, statsJson),
    ...(memory ? { memory } : {}),
  }
}

type Spread = { n: number; mean: number; sd: number; min: number; max: number }
function spread(xs: readonly number[]): Spread | undefined {
  if (!xs.length) return undefined
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length
  const sd = xs.length > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (xs.length - 1)) : 0
  return { n: xs.length, mean, sd, min: Math.min(...xs), max: Math.max(...xs) }
}
const pct = (x: number) => `${Math.round(x * 100)}%`
const fixed = (digits: number) => (x: number) => x.toFixed(digits)
function cell(xs: readonly number[], f: (x: number) => string): string {
  const s = spread(xs)
  if (!s) return '–'
  return s.n === 1 ? f(s.mean) : `${f(s.mean)} ± ${f(s.sd)} [${f(s.min)}–${f(s.max)}]`
}
const values = (ms: readonly Measurement<number>[]) => ms.flatMap((m) => (m.status === 'unavailable' ? [] : [m.value]))

export type ReportOptions = { versions?: readonly string[] }

/**
 * A markdown report of the results: live and offline runs apart; per plugin version and configuration the run count,
 * valid runs, and each measure's mean ± sample standard deviation [min–max]; task success per scenario; what carried
 * each fact through observational compaction; honest abstention, apart; every invalid or incomplete run and every
 * failed check with its evidence; and, given the expected versions and scenarios, every live cell without a valid
 * run (not run, or "0 of N valid").
 */
export function renderReport(records: readonly RunRecord[], options: ReportOptions = {}): string {
  const live = records.filter((r) => r.mode === 'live')
  const offline = records.filter((r) => r.mode === 'offline')
  const out: string[] = ['# Continuation-quality benchmark', '']
  out.push(`Live runs: ${live.length}. Offline runs: ${offline.length}. Live and offline runs are reported apart and never pooled.`)
  if (!live.length) out.push('', 'No live run is recorded: nothing here is evidence of live model quality.')
  out.push(
    '',
    'Scoring: deterministic checks (regular expressions over the replies and tool calls after the continuation prompt, and over what om_recall returned); no model grading was used. A transport or prompt-format success is not a task success: a run that did not complete, or is invalid, never counts as one.',
    `Cost: token-equivalent, an estimate: each assistant message's exact usage times PRICES_USD_PER_MTOK in tests/eval/bench.ts (${PRICES_USD_PER_MTOK.map((p) => `${p.model.source} $${p.input}/$${p.output} in/out, $${p.cacheRead} cache read, $${p.cacheWrite5m}–$${p.cacheWrite1h} cache write`).join('; ')} per million tokens). The memory model is the plugin's own Observer and Reflector, as its stats file measured it. The built-in compactor's own request is not a transcript message: a built-in run's cost includes it only through the host's cost-state record, so without one it leaves compaction out while an observational run's includes the Observer. Latencies are measured: the host's compaction duration and the transcript's timestamps.`,
  )
  const models = [...new Set(records.flatMap((r) => r.models ?? []))]
  out.push(`Models that answered: ${models.join(', ') || 'none recorded'} (sessions started with ${[...new Set(records.map((r) => r.model))].join(', ')}).`)
  for (const v of [...new Set(records.map((r) => r.version))]) {
    const commits = [...new Set(records.filter((r) => r.version === v).map((r) => r.pluginCommit ?? 'not recorded'))]
    out.push(`Plugin version ${v}: commit ${commits.join(', ')}.`)
  }
  for (const [title, rs] of [
    ['Live runs', live],
    ['Offline runs (synthetic or supplied transcripts, not live results)', offline],
  ] as const)
    if (rs.length) out.push('', `## ${title}`, '', ...section(rs, rs === live ? 'live' : 'offline'))
  if (options.versions) {
    const missing = options.versions.flatMap((v) =>
      CONFIGURATIONS.flatMap((c) =>
        SCENARIOS.flatMap((s) => {
          const ran = live.filter((r) => r.version === v && r.configuration === c && r.scenario === s.id)
          if (ran.some((r) => r.score?.valid)) return []
          return [`- ${v} ${c} ${s.id}: ${ran.length ? validOf(ran) : 'not run live'}`]
        }),
      ),
    )
    out.push('', '## Not run, or no valid run', '', ...(missing.length ? missing : ['Every expected live cell has at least one valid run.']))
  }
  const limits = SCENARIOS.filter((s) => s.limits && records.some((r) => r.scenario === s.id))
  if (limits.length) out.push('', '## Scenario limits', '', ...limits.map((s) => `- ${s.id}: ${s.limits}`))
  return out.join('\n') + '\n'
}

// A cell that ran but has no valid run says so: its runs are listed under "Invalid and incomplete runs".
const validOf = (rs: readonly RunRecord[]) => `${rs.filter((r) => r.score?.valid).length} of ${rs.length} valid`

const groupKey = (r: RunRecord) => `${r.version}\u0000${r.configuration}`
function groups(rs: readonly RunRecord[]) {
  const versions = [...new Set(rs.map((r) => r.version))]
  return versions.flatMap((v) => CONFIGURATIONS.flatMap((c) => {
    const g = rs.filter((r) => groupKey(r) === `${v}\u0000${c}`)
    return g.length ? [{ version: v, configuration: c, runs: g, valid: g.filter((r) => r.score?.valid) }] : []
  }))
}

function section(rs: readonly RunRecord[], mode: 'live' | 'offline'): string[] {
  const out: string[] = []
  const gs = groups(rs)
  out.push(
    '### Per plugin version and configuration',
    '',
    'Each measure over the valid runs: mean ± sample standard deviation [min–max], or the value alone for one run.',
    '',
    '| version | configuration | runs | valid | task success | correctness | violations | repeated work | unsupported claims | recall calls | recall hits | recall result tokens (estimated) | cost (USD, estimated) | memory model (USD, measured) | reflections (measured) | compaction ms (measured) | continuation ms (measured) |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  )
  for (const g of gs) {
    const sc = g.valid.map((r) => r.score!)
    const hits = sc.reduce((t, s) => t + s.retrieval.hits, 0)
    const checked = sc.reduce((t, s) => t + s.retrieval.checked, 0)
    out.push(
      `| ${g.version} | ${g.configuration} | ${g.runs.length} | ${g.valid.length} | ${sc.length ? pct(sc.filter((s) => s.taskSuccess).length / sc.length) : '–'} | ${cell(sc.map((s) => s.correctness), pct)} | ${cell(sc.map((s) => s.violations), fixed(2))} | ${cell(sc.map((s) => s.repeatedWork), fixed(2))} | ${cell(sc.map((s) => s.unsupportedClaims), fixed(2))} | ${cell(sc.map((s) => s.retrieval.calls), fixed(2))} | ${checked ? `${hits}/${checked}` : '–'} | ${cell(values(sc.map((s) => s.retrieval.resultTokens)), fixed(0))} | ${cell(values(g.valid.map((r) => r.cost?.total ?? unavailable('no cost'))), fixed(4))} | ${cell(values(g.valid.map((r) => r.cost?.memoryModel ?? unavailable('no cost'))), fixed(4))} | ${cell(g.valid.flatMap((r) => (r.memory ? [r.memory.reflections] : [])), fixed(2))} | ${cell(values(sc.flatMap((s) => s.compactions.map((c) => c.durationMs))), fixed(0))} | ${cell(values(sc.map((s) => s.continuationMs)), fixed(0))} |`,
    )
  }
  const noMemory = rs.filter((r) => usesObservationalCompaction(r.configuration) && r.cost?.memoryModel.status === 'unavailable').length
  const noTotal = rs.filter((r) => r.cost?.total.status === 'unavailable').length
  if (noMemory) out.push('', `Observational runs without a stats file: memory model cost and reflections unavailable in ${noMemory} run(s); their cost column leaves the memory model out.`)
  const noCompactor = rs.filter((r) => !usesObservationalCompaction(r.configuration) && r.cost && r.cost.hostReported.status === 'unavailable').length
  if (noCompactor) out.push('', `Built-in compaction runs without a host cost record: ${noCompactor}; their cost leaves the compactor's request out.`)
  if (noTotal) out.push('', `Cost unavailable in ${noTotal} run(s) (a model the price table does not price).`)
  for (const v of [...new Set(gs.map((g) => g.version))]) {
    const ranked = gs
      .filter((g) => g.version === v && g.valid.length)
      .map((g) => ({ g, rate: g.valid.filter((r) => r.score!.taskSuccess).length / g.valid.length }))
      .sort((a, b) => b.rate - a.rate)
    // Each beside its valid runs: an om run that fell back is invalid, so a low valid count is part of the result.
    const of = (x: (typeof ranked)[number]) => `${x.g.configuration} ${pct(x.rate)} (${x.g.valid.length} of ${x.g.runs.length} runs valid)`
    if (ranked.length) out.push('', `Highest task success (${mode}, ${v}): ${ranked.map(of).join('; ')}.`)
  }

  const scenarios = SCENARIOS.filter((s) => rs.some((r) => r.scenario === s.id))
  out.push('', '### Task success per scenario', '', 'Successful runs out of valid runs.', '', `| scenario | ${gs.map((g) => `${g.version} ${g.configuration}`).join(' | ')} |`, `|---|${gs.map(() => '---').join('|')}|`)
  for (const s of scenarios)
    out.push(`| ${s.id} | ${gs.map((g) => {
      const v = g.valid.filter((r) => r.scenario === s.id)
      const ran = g.runs.filter((r) => r.scenario === s.id)
      return v.length ? `${v.filter((r) => r.score!.taskSuccess).length}/${v.length}` : ran.length ? validOf(ran) : 'not run'
    }).join(' | ')} |`)

  // Honest abstention, apart from task success: of the valid runs that did not give the answer, those that said so.
  const abstaining = scenarios.filter((s) => s.checks.some((c) => c.category === 'abstention'))
  if (abstaining.length) {
    out.push(
      '',
      '### Honest abstention',
      '',
      'Not task success: of the valid runs that did not give the answer, how many said they could not find it (a regular expression over the reply; the failed-checks list keeps the replies that read as neither).',
      '',
      `| scenario | ${gs.map((g) => `${g.version} ${g.configuration}`).join(' | ')} |`,
      `|---|${gs.map(() => '---').join('|')}|`,
    )
    for (const s of abstaining)
      out.push(`| ${s.id} | ${gs.map((g) => {
        const outcomes = g.valid.filter((r) => r.scenario === s.id).flatMap((r) => r.score!.checks.filter((c) => c.category === 'abstention' && c.outcome !== 'n/a'))
        return outcomes.length ? `${outcomes.filter((c) => c.outcome === 'pass').length} of ${outcomes.length}` : '–'
      }).join(' | ')} |`)
  }

  // Overlapping protections, measured rather than assumed: which parts of the memory message held each fact.
  const carried = gs.filter((g) => usesObservationalCompaction(g.configuration)).flatMap((g) =>
    scenarios.flatMap((s) => s.facts.map((fact) => {
      const cs = g.valid.filter((r) => r.scenario === s.id).flatMap((r) => r.score!.compactions)
      const parts = new Map<string, number>()
      cs.forEach((c) => c.carriers[fact]?.forEach((p) => parts.set(p, (parts.get(p) ?? 0) + 1)))
      const any = cs.filter((c) => c.carriers[fact]?.length).length
      const only = cs.filter((c) => c.carriers[fact]?.length === 1).map((c) => c.carriers[fact]![0]!)
      return cs.length
        ? [`| ${g.version} | ${g.configuration} | ${s.id} | ${fact} | ${any} of ${cs.length} | ${[...parts].map(([p, n]) => `${p} ${n}`).join(', ') || '–'} | ${[...new Set(only)].map((p) => `${p} ${only.filter((x) => x === p).length}`).join(', ') || '–'} |`]
        : []
    }).flat()),
  )
  if (carried.length)
    out.push(
      '',
      '### What carried each fact through observational compaction',
      '',
      "How many of the valid runs' compactions held each scenario fact in their memory message, by part (observations, corrections, all-user-messages, skills, ...), and how often a single part alone held it. This measures the overlap between the memory's protections; none is removed to measure it.",
      '',
      '| version | configuration | scenario | fact | compactions holding it | by part | by one part alone |',
      '|---|---|---|---|---|---|---|',
      ...carried,
    )

  const problems = rs.flatMap((r) => {
    const who = `${r.runId} (${r.configuration}, ${r.version}, ${r.scenario})`
    if (!r.score) return [`- ${who}: did not complete: ${r.error ?? 'no score recorded'}. Transcripts: ${r.transcripts.join(', ') || 'none'}`]
    return r.score.invalid.map((reason) => `- ${who}: ${reason}. Transcripts: ${r.transcripts.join(', ') || 'none'}`)
  })
  if (problems.length) out.push('', '### Invalid and incomplete runs', '', 'Counted in the runs column, not scored.', '', ...problems)

  const failures = rs.flatMap((r) =>
    (r.score?.checks ?? [])
      .filter((c) => c.outcome === 'fail')
      .map((c) => `- ${r.runId} (${r.configuration}, ${r.version}, ${r.scenario}): ${c.id} [${c.category}]: ${c.description}. Transcripts: ${r.transcripts.join(', ')}\n  Evidence: ${c.evidence.replace(/\n/g, '\n  ')}`),
  )
  if (failures.length) out.push('', '### Failed checks, with evidence', '', ...failures)
  return out
}
