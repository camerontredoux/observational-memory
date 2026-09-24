// The continuation-quality benchmark (issue #9): scores what an assistant did after compaction in one scenario run
// (`scenarios.ts`), prices the run, keeps its evidence, and reports runs per configuration and plugin version.
//
// It reads a Claude Code session transcript (JSONL) and, for the observational-memory configurations, the plugin's
// stats file; it never calls a model. `scripts/bench-live.ts` produces live runs; tests build synthetic transcripts
// and label their records `offline`. Live and offline runs are never pooled.
//
// Scoring is deterministic: regular expressions over the assistant's replies and tool calls after the continuation
// prompt, and over what `om_recall` returned. No check is model-graded; a report says so. A run is scored only when it
// is valid: the continuation got a response, every scenario compaction happened, the compaction ran the path its
// configuration names (an `om` run whose compaction fell back to the built-in summary measures the built-in one, so
// it is reported as invalid, not scored as observational memory), and a configuration without recall did not call
// it. Invalid runs are counted and listed with their reasons, never dropped.
//
// Cost: subscription sessions report no dollars, so cost is token-equivalent: each assistant message's usage (counted
// once, however many rows streaming wrote for it) times `PRICES_USD_PER_MTOK`. The built-in compactor's own request
// is not written as a transcript message; when the host writes its `cost-state` record, its total is reported beside
// ours as `hostReported`. The plugin's Observer and Reflector calls are its own model (pi); their cost is the sum of
// the `*.cost` metrics the plugin's stats file records, or unavailable without that file.

import type { Configuration, Measurement } from './runner'
import { estimated, measured, recallAvailable, unavailable, usesObservationalCompaction } from './runner'
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
  /** Valid, and no check failed. */
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
const strings = (v: unknown): string[] =>
  typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []
const describeCall = (e: Extract<Entry, { kind: 'tool' }>) => `${e.name} ${cut(JSON.stringify(e.input), 400)} (transcript line ${e.line})`

// The tagged parts of a compaction's first message; the rest of it counts as `summary`.
function sections(text: string, path: CompactionPath): { name: string; text: string }[] {
  if (path === 'built-in') return [{ name: 'summary', text }]
  const found: { name: string; text: string }[] = []
  const rest = text.replace(/<([a-z][\w-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g, (_, name: string, body: string) => (found.push({ name, text: body }), ''))
  return [...found, { name: 'summary', text: rest }]
}

function checkOne(c: Check, reply: string, calls: Extract<Entry, { kind: 'tool' }>[], recalls: string[]): CheckResult {
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
    return !c.text || new RegExp(c.text, flags).test(strings(input).join('\n'))
  })
  const pass = c.expect === 'present' ? matching.length > 0 : matching.length === 0
  const evidence = matching.length
    ? matching.map(describeCall).join('\n')
    : `no call to /${c.tool}/${c.path ? ` on /${c.path}/` : ''}${c.text ? ` with /${c.text}/` : ''} among ${calls.length} tool call(s)${calls.length ? `: ${calls.map(describeCall).join('\n')}` : ''}`
  return { ...head, outcome: pass ? 'pass' : 'fail', evidence }
}

export function scoreRun(s: Scenario, config: Configuration, t: Transcript, stats?: OmStats): RunScore {
  const invalid: string[] = []
  const expected = s.steps.filter((x) => 'compact' in x).length
  const boundaries = t.entries.flatMap((e, i) => (e.kind === 'boundary' ? [{ e, i }] : []))
  if (boundaries.length !== expected) invalid.push(`the scenario schedules ${expected} compaction(s); the transcript has ${boundaries.length}`)

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
  const checks = s.checks.map((c) => checkOne(c, reply, calls, recalls))
  const failed = (cat: CheckCategory) => checks.filter((c) => c.category === cat && c.outcome === 'fail').length
  const correctnessChecks = checks.filter((c) => c.category === 'correctness')
  const retrievalChecks = checks.filter((c) => c.category === 'retrieval' && c.outcome !== 'n/a')
  const startAt = start < 0 ? undefined : t.entries[start]!.at
  const endAt = after.findLast((e) => e.at !== undefined)?.at
  return {
    valid: invalid.length === 0,
    invalid,
    checks,
    taskSuccess: invalid.length === 0 && checks.every((c) => c.outcome !== 'fail'),
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
