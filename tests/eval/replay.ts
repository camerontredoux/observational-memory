// Retention over many real compactions (issue #13): a long real transcript is cut at its own compaction points, each
// configuration compacts it in a chain (each compaction built on the previous one's output, as in the session), and
// what each compacted context still holds is scored with no model: the identifiers the assistant went on to use, the
// user's constraints in force, and how both drift over the boundaries. A question stage is planned, not run.
//
// Pure: no file system, process, herdr or model call here, so the tests check it on small synthetic transcripts;
// `scripts/bench-replay.ts` reads the real transcripts, runs the chain and writes the report (its header gives the usage).
//
// Terms. Span k holds the rows the session wrote between boundary k and boundary k+1 (span 0 before boundary 1).
// After a boundary the transcript holds the compaction's summary and the rows it kept raw, both stamped before the
// boundary row: they are the compaction's output, not new rows. Boundary n's context is what a configuration's
// compaction n left: its summary (or memory message) and the rows it kept raw.
import type { SessionMessage } from 'claude-code'
import { PRICES_USD_PER_MTOK } from './bench'

// ---- The transcript ----

/** A main-chain row as `$.session.messages()` shows it, with where and when the transcript wrote it. */
export type Row = SessionMessage & { at: number; uuid: string; line: number }
export type Boundary = {
  /** 1-based. */
  n: number
  at: number
  /** The boundary row's 1-based line in the transcript. */
  line: number
  preTokens?: number
  postTokens?: number
  trigger?: string
  /** The session's own compaction: its summary, and the rows it kept raw. */
  summary: string
  kept: Row[]
}
export type ReplayEvent =
  | { kind: 'row'; row: Row; at: number }
  | { kind: 'start' | 'step' | 'complete'; at: number }
  | { kind: 'skill'; skill: string; text: string; at: number }
  | { kind: 'compact'; boundary: Boundary; at: number }
export type Transcript = { cwd?: string; events: ReplayEvent[]; spans: Row[][]; boundaries: Boundary[] }

type Raw = Record<string, any>
const blockText = (c: unknown): string =>
  typeof c === 'string' ? c : Array.isArray(c) ? c.map((b: { text?: unknown }) => (typeof b.text === 'string' ? b.text : '')).join('\n') : ''

function rowOf(r: Raw, line: number, at: number): Row | undefined {
  const c = r.message?.content
  const blocks: Raw[] = typeof c === 'string' ? [{ type: 'text', text: c }] : Array.isArray(c) ? c : []
  const row: Row = {
    role: r.type,
    text: blocks.filter((b) => b.type === 'text' && b.text).map((b) => b.text as string).join('\n'),
    toolUses: blocks.filter((b) => b.type === 'tool_use').map((b) => ({ tool_use_id: b.id ?? '', tool: b.name ?? '', input: b.input ?? {} })),
    at,
    uuid: typeof r.uuid === 'string' ? r.uuid : `line-${line}`,
    line,
  }
  const results = blocks.filter((b) => b.type === 'tool_result').map((b) => ({ tool_use_id: b.tool_use_id ?? '', text: blockText(b.content), isError: !!b.is_error }))
  if (results.length) row.toolResults = results
  return row.text || row.toolUses.length || results.length ? row : undefined
}

const isSummaryRow = (r: Raw) => r.isCompactSummary === true || blockText(r.message?.content).startsWith('This session is being continued from a previous conversation')

/**
 * Reads a transcript's JSONL rows into its spans, its boundaries with the session's own compaction at each, and the
 * events that replay it: each row, each turn's start (its prompt) and end, each model step, each skill load, and
 * each compaction. Sidechain rows and rows a resumed session repeats (same uuid) are left out. A meta row is left out
 * too, but one that loads a skill is that skill's event.
 */
export function parseTranscript(jsonl: string | readonly Raw[]): Transcript {
  const raw: Raw[] = typeof jsonl === 'string' ? jsonl.split('\n').flatMap((l) => (l.trim() ? [JSON.parse(l)] : [])) : [...jsonl]
  const events: ReplayEvent[] = []
  const spans: Row[][] = [[]]
  const boundaries: Boundary[] = []
  const seen = new Set<string>()
  let t = 0
  let lastId: string | undefined
  let inTurn = false
  let open: Boundary | undefined // the boundary whose output rows (stamped before it) are still being read
  const end = () => (inTurn && events.push({ kind: 'complete', at: t }), (inTurn = false))
  raw.forEach((r, i) => {
    t = Date.parse(r.timestamp ?? '') || t
    if (r.type === 'system' && r.subtype === 'compact_boundary') {
      end()
      const m = r.compactMetadata ?? {}
      open = { n: boundaries.length + 1, at: t, line: i + 1, summary: '', kept: [], ...(m.preTokens ? { preTokens: m.preTokens } : {}), ...(m.postTokens ? { postTokens: m.postTokens } : {}), ...(m.trigger ? { trigger: m.trigger } : {}) }
      boundaries.push(open)
      spans.push([])
      events.push({ kind: 'compact', boundary: open, at: t })
      return
    }
    if (r.type === 'system' && r.subtype === 'turn_duration') return void end()
    if ((r.type !== 'user' && r.type !== 'assistant') || r.isSidechain) return
    if (typeof r.uuid === 'string') {
      if (seen.has(r.uuid)) return
      seen.add(r.uuid)
    }
    if (r.isMeta) {
      const m = /^Base directory for this skill: (\S+)/.exec(blockText(r.message?.content))
      if (m) events.push({ kind: 'skill', skill: m[1]!.split('/').at(-1)!, text: blockText(r.message?.content), at: t })
      return
    }
    if (open && isSummaryRow(r)) return void (open.summary = blockText(r.message?.content))
    const row = rowOf(r, i + 1, t)
    if (!row) return
    if (open && Date.parse(r.timestamp ?? '') < open.at) return void open.kept.push(row)
    open = undefined
    spans.at(-1)!.push(row)
    if (row.role === 'user' && !row.toolResults) {
      end()
      events.push({ kind: 'row', row, at: t }, { kind: 'start', at: t }) // the prompt is in the history at turn.start
      inTurn = true
      return
    }
    if (row.role === 'assistant' && r.message?.id !== lastId) events.push({ kind: 'step', at: t })
    if (row.role === 'assistant') lastId = r.message?.id
    events.push({ kind: 'row', row, at: t })
  })
  end()
  return { cwd: raw.find((r) => typeof r.cwd === 'string')?.cwd, events, spans, boundaries }
}

/** A message's text, tool calls and tool results, as a context holds them. */
export const messageText = (m: Pick<SessionMessage, 'text' | 'toolUses' | 'toolResults'>) =>
  [m.text, ...m.toolUses.map((u) => `${u.tool}(${JSON.stringify(u.input)})`), ...(m.toolResults ?? []).map((r) => r.text)].filter(Boolean).join('\n')

// Text Claude Code or a hook writes as a user row: not the user's own words.
const NOT_TYPED = /^\s*(?:<(?:task-notification|command-name|command-message|command-args|local-command-\w+|system-reminder|bash-\w+)>|\[Request interrupted|Caveat: )/
/** Whether a row is a message the user typed. */
export const isTyped = (row: SessionMessage) => row.role === 'user' && !row.toolResults && !!row.text.trim() && !NOT_TYPED.test(row.text)

// ---- Identifiers ----

export type IdentifierKind = 'commit' | 'path' | 'issue' | 'usd' | 'version' | 'pane' | 'uuid'
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const URL = /\bhttps?:\/\/\S+/g
const HOME = /\/home\/[^/\s'"`]+/g
const PATTERNS: [IdentifierKind, RegExp][] = [
  ['pane', /\bw\d+:p\d+\b/g],
  // A path of two or more segments, from the root, a home or a relative directory: `hooks/register.ts`, `~/.agents/x`.
  // Read first, so a hash, a version or a UUID inside a path is part of it.
  ['path', /(?<![\w.:/~$-])(?:~|\.{1,2})?\/?(?:[\w@+-][\w.@+-]*\/)+[\w@+-][\w.@+-]*/g],
  ['uuid', UUID],
  // A dollar amount with cents or two or more digits: `$1` alone is more often a shell or awk variable.
  ['usd', /\$(?:\d[\d,]*\.\d+|\d{1,3}(?:,\d{3})+|\d{2,})\b/g],
  ['version', /(?<![\w.])v?\d+\.\d+\.\d+(?:-[a-z][\w.]*)?(?![\w]|\.\d)/g],
  ['issue', /(?<![\w&#/])#\d{1,5}\b/g],
  ['commit', /(?<![\w-])[0-9a-f]{7,40}(?![\w-])/g],
]
// System paths name no work of the session's.
const SYSTEM_PATH = /^\/(?:dev|usr|bin|sbin|proc|etc|lib)\//
// A relative path names a file (a segment with an extension) or a directory with a `-`, `_` or `.` in a segment:
// `pass/fail` or `Observer/Reflector` is prose.
const PATH_LIKE = /\.\w+$|[-_.]/

/** Text as the scorer reads it: a home directory as `~`. */
export const normalize = (text: string) => text.replace(HOME, '~')

/**
 * The identifiers a text names, each by its key: a commit hash (7 to 40 hex digits with a letter and a digit) by
 * its first 7 digits, a path with its home as `~` (not a system path, and not prose such as `pass/fail`), an issue
 * number, a dollar amount, a version without its `v`, a herdr pane id, a UUID. URLs are left out, and what a path
 * holds is read as part of it.
 */
export function identifiersIn(text: string): Map<string, IdentifierKind> {
  const found = new Map<string, IdentifierKind>()
  let rest = normalize(text).replace(URL, ' ')
  for (const [kind, re] of PATTERNS)
    rest = rest.replace(re, (m) => {
      let key = m.replace(/[.,:;]+$/, '')
      if (kind === 'commit' && !(/[a-f]/.test(key) && /\d/.test(key))) return m
      if (kind === 'path' && !pathLike(key)) return m
      if (kind === 'commit') key = key.slice(0, 7)
      if (kind === 'version') key = key.replace(/^v/, '')
      if (kind === 'usd') key = key.replace(/,/g, '')
      if (kind === 'uuid') key = key.toLowerCase()
      found.set(key, kind)
      return ' '
    })
  return found
}

function pathLike(key: string) {
  if (SYSTEM_PATH.test(key)) return false
  if (/^(?:~|\.{1,2})?\//.test(key)) return key.split('/').filter((p) => p && p !== '~' && !/^\.{1,2}$/.test(p)).length >= 2 || key.startsWith('~/')
  return PATH_LIKE.test(key) && !/^\d+\/\d+$/.test(key)
}

/**
 * Whether a context holds an identifier: a hash by its 7-digit prefix, a path whole or by its last two segments
 * (a summary may name `hooks/register.ts` for the absolute path), anything else whole.
 */
export function holds(context: string, key: string, kind: IdentifierKind) {
  if (kind === 'path') {
    const parts = key.split('/').filter((p) => p && p !== '~' && p !== '.' && p !== '..')
    return context.includes(key) || (parts.length >= 2 && context.includes(parts.slice(-2).join('/')))
  }
  if (kind === 'uuid') return context.toLowerCase().includes(key)
  return context.includes(key)
}

const assistantUse = (row: Row) => (row.role === 'assistant' ? [row.text, ...row.toolUses.map((u) => JSON.stringify(u.input))].join('\n') : '')

export type Needed = { key: string; kind: IdentifierKind; line: number }

/**
 * The identifiers boundary n's context needs: ones the assistant used in span n (its text or a tool call's input,
 * not a result), that first appeared before boundary n, that the session's own compaction did not keep raw across
 * the boundary, and that nothing after the boundary showed again before that use (a user message or a tool result:
 * then the assistant read it, it did not remember it).
 */
export function neededIdentifiers(t: Transcript, n: number): Needed[] {
  const before = new Set<string>()
  for (const span of t.spans.slice(0, n)) for (const row of span) for (const key of identifiersIn(messageText(row)).keys()) before.add(key)
  const kept = normalize(t.boundaries[n - 1]?.kept.map(messageText).join('\n') ?? '')
  const shown = new Set<string>()
  const needed = new Map<string, Needed>()
  for (const row of t.spans[n] ?? []) {
    if (row.role === 'user') {
      for (const key of identifiersIn(messageText(row)).keys()) shown.add(key)
      continue
    }
    for (const [key, kind] of identifiersIn(assistantUse(row))) {
      if (needed.has(key) || shown.has(key) || !before.has(key) || holds(kept, key, kind)) continue
      needed.set(key, { key, kind, line: row.line })
    }
    // The assistant's own mention shows it from here on: a later use is not a second recall.
    for (const key of identifiersIn(assistantUse(row)).keys()) shown.add(key)
  }
  return [...needed.values()]
}

// ---- A compacted context and what it holds ----

/** What a configuration's compaction n left: its summary or memory message, and the rows it kept raw. */
export type Context = { summary: string; kept: readonly Pick<SessionMessage, 'text' | 'toolUses' | 'toolResults'>[] }
export const contextText = (c: Context) => normalize([c.summary, ...c.kept.map(messageText)].join('\n'))

export type IdentifierScore = { held: Needed[]; missing: Needed[] }
export function scoreIdentifiers(needed: readonly Needed[], context: Context): IdentifierScore {
  const text = contextText(context)
  const held = needed.filter((x) => holds(text, x.key, x.kind))
  return { held, missing: needed.filter((x) => !held.includes(x)) }
}

// ---- The user's constraints ----

/**
 * A standing constraint the user set: `quote` is the user's own words, checked against the message it was set in
 * (in span `setIn`); `held` are case-insensitive patterns, any of which shows the constraint in a context. A reversal
 * is the user's later message undoing or replacing it, with its own quote and patterns.
 */
export type ConstraintSpec = {
  id: string
  quote: string
  setIn: number
  held: readonly string[]
  reversal?: { quote: string; in: number; held: readonly string[] }
}
/** What a question asks at each boundary from `from` on; `expect` are strings an answer must all hold, or none with a model grader. */
export type Question = { id: string; ask: string; from: number; expect?: readonly string[] }
/** A transcript's constraints and questions. */
export type ReplaySpec = { constraints: readonly ConstraintSpec[]; questions: readonly Question[] }

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()
/** Where each constraint's quotes do not match what the user typed in the span it names: empty when all do. */
export function checkSpec(t: Transcript, spec: ReplaySpec): string[] {
  const problems: string[] = []
  const typedIn = (span: number) => (t.spans[span] ?? []).filter(isTyped).map((r) => squash(r.text))
  const check = (id: string, quote: string, span: number) => {
    if (!typedIn(span).some((text) => text.includes(squash(quote)))) problems.push(`${id}: no user message in span ${span} says ${JSON.stringify(quote)}`)
  }
  const ids = new Set<string>()
  for (const c of spec.constraints) {
    if (ids.has(c.id)) problems.push(`${c.id}: a repeated id`)
    ids.add(c.id)
    check(c.id, c.quote, c.setIn)
    if (c.reversal && c.reversal.in < c.setIn) problems.push(`${c.id}: reversed before it was set`)
    if (c.reversal) check(`${c.id} reversal`, c.reversal.quote, c.reversal.in)
    for (const p of [...c.held, ...(c.reversal?.held ?? [])])
      try {
        new RegExp(p, 'i')
      } catch {
        problems.push(`${c.id}: a pattern that is not a regular expression: ${p}`)
      }
  }
  for (const q of spec.questions) if (q.from < 1 || q.from > t.boundaries.length) problems.push(`${q.id}: asked from boundary ${q.from}, which the transcript does not have`)
  return problems
}

const matches = (text: string, patterns: readonly string[]) => patterns.some((p) => new RegExp(p, 'i').test(text))
export type ConstraintScore = {
  /** Set before the boundary and not reversed before it. */
  inForce: { id: string; held: boolean }[]
  /** Reversed before the boundary: stale when the context shows it and not its reversal, as if still in force. */
  reversed: { id: string; stale: boolean }[]
}
export function scoreConstraints(specs: readonly ConstraintSpec[], n: number, context: Context): ConstraintScore {
  const text = contextText(context)
  const score: ConstraintScore = { inForce: [], reversed: [] }
  for (const c of specs) {
    if (c.setIn >= n) continue
    if (c.reversal && c.reversal.in < n) score.reversed.push({ id: c.id, stale: matches(text, c.held) && !matches(text, c.reversal.held) })
    else score.inForce.push({ id: c.id, held: matches(text, c.held) })
  }
  return score
}

// ---- Drift ----

export type DriftPoint = { boundary: number; identifiers: { held: number; total: number }; constraints: { held: number; total: number } }
/**
 * The retention curve of what was known before boundary 1: the identifiers first seen in span 0 that some later
 * boundary needs, and the constraints set in span 0 and never reversed, counted in each boundary's context.
 * A boundary with no context for the configuration is left out.
 */
export function drift(t: Transcript, specs: readonly ConstraintSpec[], contexts: readonly (Context | undefined)[]): DriftPoint[] {
  const early = new Set<string>()
  for (const row of t.spans[0] ?? []) for (const key of identifiersIn(messageText(row)).keys()) early.add(key)
  const tracked = new Map<string, Needed>()
  for (let n = 1; n <= t.boundaries.length; n++) for (const x of neededIdentifiers(t, n)) if (early.has(x.key) && !tracked.has(x.key)) tracked.set(x.key, x)
  const standing = specs.filter((c) => c.setIn === 0 && !c.reversal)
  return contexts.flatMap((context, i) => {
    if (!context) return []
    const text = contextText(context)
    return [
      {
        boundary: i + 1,
        identifiers: { held: [...tracked.values()].filter((x) => holds(text, x.key, x.kind)).length, total: tracked.size },
        constraints: { held: standing.filter((c) => matches(text, c.held)).length, total: standing.length },
      },
    ]
  })
}

// ---- The question stage (planned, not run) ----

export const questionsAt = (spec: ReplaySpec | undefined, n: number) => (spec?.questions ?? []).filter((q) => q.from <= n)
export type AnswerCheck = 'pass' | 'fail' | 'needs a model grader'
/** An exact-string check: every expected string in the answer, case and spacing aside. */
export function checkAnswer(q: Question, answer: string): AnswerCheck {
  if (!q.expect?.length) return 'needs a model grader'
  const a = squash(answer).toLowerCase()
  return q.expect.every((x) => a.includes(squash(x).toLowerCase())) ? 'pass' : 'fail'
}

/** Reads a question session's answers: one `<id>: <answer>` line per question; a question with no line has no answer. */
export function parseAnswers(text: string, questions: readonly Question[]): Map<string, string> {
  const answers = new Map<string, string>()
  for (const line of text.split('\n')) {
    const m = /^\s*[-*]?\s*`?([\w-]+)`?\s*:\s*(.*)$/.exec(line)
    if (m && questions.some((q) => q.id === m[1]) && !answers.has(m[1]!)) answers.set(m[1]!, m[2]!.trim())
  }
  return answers
}

export type QuestionSession = {
  /** The headless session's command line, run in `projectDir`. */
  argv: string[]
  /** What it is asked: every question, and for a plain configuration the compacted context before them. */
  prompt: string
  settingsPath: string
  settings: { env: { CLAUDE_CODE_PLUGIN_DIRS: string } }
  /**
   * For a +recall configuration: the session to write before it runs, so that om_recall reads the real transcript.
   * Its JSONL is the transcript's rows up to boundary `through`, then a compaction whose summary is `summary`, so the
   * resumed session holds only the configuration's context and om_recall searches everything before it.
   */
  seed?: { sessionId: string; through: number; summary: string }
}

/**
 * The headless Sonnet session that asks boundary n's questions of one configuration's compacted context. A plain
 * configuration gets the context in its prompt and no plugin and no tools; a +recall one resumes a seeded copy of
 * the transcript (see `seed`) with the recall-only plugin (as `scripts/bench-live.ts` assembles it from
 * tests/eval/recall-plugin) and om_recall its only tool.
 * Planned for the dry run and tested; nothing runs it yet.
 */
export function planQuestionSession(input: {
  config: ReplayConfiguration
  boundary: number
  context: Context
  questions: readonly Question[]
  runDir: string
  sessionId: string
  recallPluginDir: string
  model?: string
}): QuestionSession {
  const recall = input.config.endsWith('+recall')
  const dir = `${input.runDir}/q-${input.config}-${input.boundary}`
  const settingsPath = `${dir}/settings.json`
  const asks = input.questions.map((q) => `${q.id}: ${q.ask}`).join('\n')
  const format = 'Answer each question below on one line, as `<id>: <answer>`, from what you know of this session. If you do not know, say `<id>: unknown`.'
  const context = [input.context.summary, ...input.context.kept.map(messageText)].join('\n\n')
  const prompt = recall
    ? `${format} You may search this session's transcript with om_recall.\n\n${asks}`
    : `This is what you know of the session so far:\n\n<context>\n${context}\n</context>\n\n${format}\n\n${asks}`
  // `--tools ''` takes away the built-in tools; a plugin's tool is not one of them, so om_recall stays (unverified
  // until the first live question run, which checks it before asking anything).
  const argv = ['claude', '-p', prompt, '--model', input.model ?? QUESTION_MODEL, '--settings', settingsPath, '--output-format', 'json', '--tools', '']
  if (recall) argv.push('--resume', input.sessionId, '--allowedTools', 'mcp__observational-memory__om_recall')
  return {
    argv,
    prompt,
    settingsPath,
    settings: { env: { CLAUDE_CODE_PLUGIN_DIRS: recall ? input.recallPluginDir : '' } },
    ...(recall ? { seed: { sessionId: input.sessionId, through: input.boundary, summary: context } } : {}),
  }
}

// ---- Configurations and the dry run's plan ----

export const REPLAY_CONFIGURATIONS = ['builtin', 'builtin+recall', 'om', 'om+recall'] as const
export type ReplayConfiguration = (typeof REPLAY_CONFIGURATIONS)[number]

/** Characters per token for estimates, as `hooks/register.ts` estimates. */
const CHARS_PER_TOKEN = 4
export const estimateTokens = (text: string) => Math.ceil(text.length / CHARS_PER_TOKEN)
/** The Observer's chunk, as in `hooks/register.ts`. */
export const OBSERVER_CHUNK_TOKENS = 10_000
/**
 * One Luna call's cost per input token: a cached Observer call over a ~10k-token chunk cost $0.0032532 for 12,282
 * tokens in and 664 out (pi's own usage record), so a call is priced at its input share of that.
 */
export const LUNA_USD_PER_INPUT_TOKEN = 0.0032532 / 12_282
const OBSERVER_PROMPT_TOKENS = 2_300 // the Observer's system prompt and the chunk's framing
const REFLECTOR_IN_TOKENS = 40_000
/** A built-in summary's size, and a headless session's own overhead (system prompt and tool definitions). */
export const SUMMARY_TOKENS = 5_000
export const SESSION_OVERHEAD_TOKENS = 20_000
/** A +recall answer's extra: up to two om_recall rounds, each re-reading the context and adding what it found. */
const RECALL_ROUNDS = 2
const RECALL_RESULT_TOKENS = 3_000
const ANSWER_TOKENS_PER_QUESTION = 150
const QUESTION_MODEL = 'sonnet'

export type PlannedCall = {
  transcript: string
  /** The configurations that share the call: a compaction serves both its plain and its +recall configuration. */
  configs: readonly ReplayConfiguration[]
  stage: 'observer' | 'reflector' | 'compaction' | 'question'
  boundary?: number
  model: string
  what: string
  inTokens: number
  outTokens: number
  usd: number
}

const sonnet = PRICES_USD_PER_MTOK.find((p) => p.model.test(QUESTION_MODEL))!
// A resumed or headless session starts cold: its input is written to the cache once.
const sonnetUsd = (inTokens: number, outTokens: number) => (inTokens * sonnet.cacheWrite5m + outTokens * sonnet.output) / 1e6

export type PlanOptions = {
  /**
   * The om replay's own calls, from a stub replay: its Observer calls replace the estimate of them. Its Reflector
   * calls do not: a stub's short observations never reach the Reflector's threshold, so reflections stay estimated.
   */
  omCalls?: readonly { kind: 'observer' | 'reflector'; inTokens: number }[]
}

/**
 * Every model call a full run would make, with an estimate of its tokens and cost. om compacts offline through the
 * checkout's hooks, its Observer and Reflector calls through pi (Luna), one per ~10k-token chunk of each span and,
 * as an estimate, one reflection per boundary after the first; a stub replay's own count replaces the estimate. The
 * built-in chain is one `/compact` per boundary in a resumed Sonnet session holding about the session's own
 * pre-compaction context. The question stage is one headless Sonnet session per boundary and configuration that
 * has questions, given that configuration's compacted context; a +recall one may search the transcript.
 */
export function planCalls(name: string, t: Transcript, spec?: ReplaySpec, options: PlanOptions = {}): PlannedCall[] {
  const calls: PlannedCall[] = []
  const om: ReplayConfiguration[] = ['om', 'om+recall']
  const builtin: ReplayConfiguration[] = ['builtin', 'builtin+recall']
  const luna = (stage: 'observer' | 'reflector', inTokens: number, what: string, boundary?: number, outTokens = 700) =>
    calls.push({ transcript: name, configs: om, stage, ...(boundary ? { boundary } : {}), model: 'luna (pi)', what, inTokens, outTokens, usd: inTokens * LUNA_USD_PER_INPUT_TOKEN })
  const spanTokens = t.spans.map((span) => span.reduce((n, r) => n + estimateTokens(messageText(r)), 0))
  const observed = options.omCalls?.filter((c) => c.kind === 'observer')
  observed?.forEach((c, i) => luna('observer', c.inTokens, `observer call ${i + 1} of ${observed.length} in the stub replay`))
  spanTokens.forEach((tokens, k) => {
    const chunks = Math.ceil(tokens / OBSERVER_CHUNK_TOKENS)
    if (!observed)
      for (let c = 0; c < chunks; c++)
        luna('observer', Math.min(OBSERVER_CHUNK_TOKENS, tokens - c * OBSERVER_CHUNK_TOKENS) + OBSERVER_PROMPT_TOKENS, `observe span ${k}, chunk ${c + 1} of ${chunks}`)
    if (k >= 1 && k < t.boundaries.length) luna('reflector', REFLECTOR_IN_TOKENS, `reflect after boundary ${k} (estimated)`, k, 8_000)
  })
  for (const b of t.boundaries) {
    const inTokens = b.preTokens ?? (b.n === 1 ? spanTokens[0]! : SUMMARY_TOKENS + spanTokens[b.n - 1]!)
    calls.push({ transcript: name, configs: builtin, stage: 'compaction', boundary: b.n, model: QUESTION_MODEL, what: `/compact ${b.n} in the resumed session`, inTokens, outTokens: SUMMARY_TOKENS, usd: sonnetUsd(inTokens, SUMMARY_TOKENS) })
  }
  for (const b of t.boundaries) {
    const qs = questionsAt(spec, b.n)
    if (!qs.length) continue
    const asked = qs.reduce((n, q) => n + estimateTokens(q.ask), 0)
    for (const config of REPLAY_CONFIGURATIONS) {
      const context = config.startsWith('om') ? (b.postTokens ?? SUMMARY_TOKENS) : SUMMARY_TOKENS
      const once = SESSION_OVERHEAD_TOKENS + context + asked
      const recall = config.endsWith('+recall')
      const inTokens = recall ? once * (1 + RECALL_ROUNDS) + RECALL_RESULT_TOKENS * RECALL_ROUNDS : once
      const outTokens = ANSWER_TOKENS_PER_QUESTION * qs.length
      calls.push({
        transcript: name,
        configs: [config],
        stage: 'question',
        boundary: b.n,
        model: QUESTION_MODEL,
        what: `${qs.length} question(s) at boundary ${b.n}${recall ? ', om_recall over the transcript' : ''} (${qs.filter((q) => !q.expect?.length).length} need a model grader)`,
        inTokens,
        outTokens,
        usd: sonnetUsd(inTokens, outTokens),
      })
    }
  }
  return calls
}

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`
const grouped = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** The dry run's listing: every planned call, then the estimated cost per configuration and in all. */
export function describePlan(calls: readonly PlannedCall[]): string {
  const lines = calls.map(
    (c, i) =>
      `${i + 1}. [${c.transcript}] ${c.stage}${c.boundary ? ` @${c.boundary}` : ''} ${c.model} for ${c.configs.join(', ')}: ${c.what}; ~${grouped(c.inTokens)} in, ~${grouped(c.outTokens)} out, ~${usd(c.usd)}`,
  )
  const per = (config: ReplayConfiguration) => calls.filter((c) => c.configs.includes(config))
  const table = [
    '| configuration | calls | est. cost (a shared compaction counted in each) |',
    '|---|---:|---:|',
    ...REPLAY_CONFIGURATIONS.map((config) => `| ${config} | ${per(config).length} | ${usd(per(config).reduce((n, c) => n + c.usd, 0))} |`),
    `| all (each call once) | ${calls.length} | ${usd(calls.reduce((n, c) => n + c.usd, 0))} |`,
  ]
  return [`Dry run: ${calls.length} planned model call(s), none made.`, '', ...lines, '', ...table].join('\n')
}

// ---- The chain ----

/** How one configuration takes a replay: the rows and events as the session had them, and each compaction. */
export type ReplayDriver = {
  /** Before each event, at its time. */
  at?(time: number): Promise<void>
  /** The history grows by one row; `history` is the whole history after it, previous compactions' output included. */
  row(row: Row, history: readonly SessionMessage[]): Promise<void>
  event?(e: Exclude<ReplayEvent, { kind: 'row' | 'compact' }>, history: readonly SessionMessage[]): Promise<void>
  /** Compacts the live context (the last compaction's output, then the rows since) into the next one. */
  compact(live: readonly SessionMessage[], boundary: Boundary): Promise<readonly SessionMessage[]>
}
export type ChainStep = { boundary: Boundary; input: readonly SessionMessage[]; output: readonly SessionMessage[] }

/**
 * Replays a transcript through one configuration's compaction, chained: at each of the session's own boundaries
 * the live context is compacted, and the next span's rows follow its output, so compaction n+1 compacts compaction
 * n's output with the rows since, as in the session. It stops right after compaction `upTo` (by default the last):
 * the rows after it are no boundary's input.
 */
export async function replayChain(t: Transcript, driver: ReplayDriver, upTo = t.boundaries.length): Promise<ChainStep[]> {
  const history: SessionMessage[] = []
  const steps: ChainStep[] = []
  let live = 0
  for (const e of t.events) {
    if (steps.length >= upTo) break
    await driver.at?.(e.at)
    if (e.kind === 'row') {
      const { at: _, uuid: _u, line: _l, ...m } = e.row
      history.push(m)
      await driver.row(e.row, history)
    } else if (e.kind === 'compact') {
      const input = history.slice(live)
      const output = await driver.compact(input, e.boundary)
      steps.push({ boundary: e.boundary, input, output })
      live = history.length
      history.push(...output)
    } else await driver.event?.(e, history)
  }
  return steps
}

/** A chain step's output as a context: the first message is the summary, the rest were kept raw. */
export const contextOf = (output: readonly SessionMessage[]): Context => ({ summary: output[0]?.text ?? '', kept: output.slice(1) })

// ---- The built-in chain: seeding a session Claude Code resumes ----

/**
 * Span k's rows as a resumable session's JSONL rows: the transcript's own user and assistant rows (not the output
 * of the session's compaction, not sidechain or meta rows), re-parented one after the other from `parentUuid`, under
 * the new session id and project directory. The first span starts the chain (no parent).
 */
export function seedRows(jsonl: string | readonly Raw[], span: number, session: { sessionId: string; cwd: string; parentUuid?: string | null }): Raw[] {
  const raw: Raw[] = typeof jsonl === 'string' ? jsonl.split('\n').flatMap((l) => (l.trim() ? [JSON.parse(l)] : [])) : [...jsonl]
  const out: Raw[] = []
  const seen = new Set<string>()
  let k = 0
  let boundaryAt: number | undefined
  let parent = session.parentUuid ?? null
  for (const r of raw) {
    if (r.type === 'system' && r.subtype === 'compact_boundary') {
      k++
      boundaryAt = Date.parse(r.timestamp)
      continue
    }
    if (k !== span || (r.type !== 'user' && r.type !== 'assistant') || r.isSidechain || r.isMeta || isSummaryRow(r)) continue
    if (boundaryAt !== undefined && Date.parse(r.timestamp) < boundaryAt) continue
    boundaryAt = undefined
    if (typeof r.uuid !== 'string' || seen.has(r.uuid)) continue
    seen.add(r.uuid)
    out.push({ ...r, parentUuid: parent, sessionId: session.sessionId, cwd: session.cwd })
    parent = r.uuid
  }
  return out
}

/**
 * A +recall question session's JSONL (see `QuestionSession.seed`): the transcript's raw rows of spans 0 to
 * `through - 1`, chained, then a compaction row and its summary, the configuration's context, so a resumed session
 * holds that context alone and its transcript file holds everything before it for om_recall. `ids` name the two
 * rows the seed adds.
 */
export function questionSeedRows(jsonl: string | readonly Raw[], seed: { sessionId: string; through: number; summary: string }, cwd: string, ids: { boundary: string; summary: string }): Raw[] {
  const raw: Raw[] = typeof jsonl === 'string' ? jsonl.split('\n').flatMap((l) => (l.trim() ? [JSON.parse(l)] : [])) : [...jsonl]
  const rows: Raw[] = []
  for (let k = 0; k < seed.through; k++) rows.push(...seedRows(raw, k, { sessionId: seed.sessionId, cwd, parentUuid: rows.at(-1)?.uuid ?? null }))
  const at = raw.filter((r) => r.type === 'system' && r.subtype === 'compact_boundary')[seed.through - 1]?.timestamp ?? rows.at(-1)?.timestamp
  const common = { sessionId: seed.sessionId, cwd, isSidechain: false, timestamp: at }
  rows.push(
    { ...common, type: 'system', subtype: 'compact_boundary', uuid: ids.boundary, parentUuid: null, logicalParentUuid: rows.at(-1)?.uuid ?? null, content: 'Conversation compacted', compactMetadata: { trigger: 'manual' } },
    { ...common, type: 'user', uuid: ids.summary, parentUuid: ids.boundary, isCompactSummary: true, message: { role: 'user', content: seed.summary } },
  )
  return rows
}

/** What a resumed session's own last compaction left in its JSONL: the summary, the rows after it, and the row the next span continues from. */
export function lastCompaction(jsonl: string | readonly Raw[]): { summary: string; kept: Row[]; leaf: string | undefined } | undefined {
  const t = parseTranscript(jsonl)
  const raw: Raw[] = typeof jsonl === 'string' ? jsonl.split('\n').flatMap((l) => (l.trim() ? [JSON.parse(l)] : [])) : [...jsonl]
  const b = t.boundaries.at(-1)
  if (!b) return undefined
  const leaf = [...raw].reverse().find((r) => (r.type === 'user' || r.type === 'assistant') && !r.isSidechain && typeof r.uuid === 'string')?.uuid
  // Rows written after the boundary without an earlier stamp (the session's reply to /compact, if any) are kept too.
  return { summary: b.summary, kept: [...b.kept, ...(t.spans.at(-1) ?? [])], leaf }
}

export type BuiltinStep =
  | { kind: 'seed'; span: number; purpose: string }
  | { kind: 'herdr'; argv: string[]; purpose: string; stallOk?: boolean }
  | { kind: 'settle'; ms: number; purpose: string }
  | { kind: 'collect'; boundary: number; purpose: string }
export type BuiltinChainPlan = { projectDir: string; settingsPath: string; settings: { env: { CLAUDE_CODE_PLUGIN_DIRS: string } }; steps: BuiltinStep[] }

/**
 * The live built-in chain for one transcript, as steps the script runs: for each boundary, span n-1's raw rows are
 * appended to the sandbox session (re-parented onto what the last compaction left), Claude Code resumes it in the
 * herdr pane with no observational-memory plugin, `/compact` runs with no instructions, the session exits, and the
 * summary and kept rows are read back from its JSONL. Nothing here runs it.
 */
export function planBuiltinChain(input: { runDir: string; sessionId: string; pane: string; boundaries: number; timeoutMs: number; startTimeoutMs: number; model?: string }): BuiltinChainPlan {
  const projectDir = `${input.runDir}/project`
  const settingsPath = `${input.runDir}/settings.json`
  const agent = `replay-${input.sessionId.slice(0, 8)}`
  const steps: BuiltinStep[] = [{ kind: 'herdr', argv: ['pane', 'run', input.pane, `cd '${projectDir}'`], purpose: 'enter the sandbox project' }]
  for (let n = 1; n <= input.boundaries; n++) {
    steps.push(
      { kind: 'seed', span: n - 1, purpose: `append span ${n - 1}'s raw rows to the session${n > 1 ? `, after what compaction ${n - 1} left` : ''}` },
      {
        kind: 'herdr',
        argv: ['agent', 'start', agent, '--kind', 'claude', '--pane', input.pane, '--timeout', String(input.startTimeoutMs), '--', '--model', input.model ?? QUESTION_MODEL, '--resume', input.sessionId, '--settings', settingsPath, '--permission-mode', 'dontAsk'],
        purpose: `resume the session before boundary ${n}`,
      },
      { kind: 'herdr', argv: ['agent', 'prompt', agent, '/compact', '--wait', '--timeout', String(input.timeoutMs)], purpose: `built-in compaction ${n}, no instructions`, stallOk: true },
      { kind: 'herdr', argv: ['pane', 'run', input.pane, '/exit'], purpose: 'end the session, so its JSONL is complete' },
      { kind: 'settle', ms: 5_000, purpose: 'let the session write its last rows' },
      { kind: 'collect', boundary: n, purpose: `read compaction ${n}'s summary and kept rows back from the session's JSONL` },
    )
  }
  return { projectDir, settingsPath, settings: { env: { CLAUDE_CODE_PLUGIN_DIRS: '' } }, steps }
}

// ---- The report ----

export type ConfigResult = {
  config: string
  /** How the contexts were made: the session's own compaction, an om replay (with pi stubbed or cached), a live built-in chain. */
  source: string
  /** Boundary n's context at index n - 1; undefined where the configuration has none. */
  contexts: readonly (Context | undefined)[]
}
export type ReportInput = {
  name: string
  t: Transcript
  spec?: ReplaySpec
  results: readonly ConfigResult[]
  /** Only aggregate numbers: no identifier, constraint or question text. */
  private?: boolean
  bytes?: number
}

const pct = (held: number, total: number) => (total ? `${held}/${total} (${Math.round((held / total) * 100)}%)` : '–')

/** One transcript's section of the report: per boundary and configuration the scores, then the drift curve. */
export function renderTranscript(r: ReportInput): string {
  const { t, spec } = r
  const needed = t.boundaries.map((b) => neededIdentifiers(t, b.n))
  const out: string[] = [`## ${r.name}`, '']
  out.push(
    `${r.bytes ? `${grouped(r.bytes / 1e6)} MB, ` : ''}${t.boundaries.length} real compactions` +
      `${t.boundaries.some((b) => b.preTokens) ? ` at about ${grouped(t.boundaries.reduce((n, b) => n + (b.preTokens ?? 0), 0) / t.boundaries.length / 1000)}k tokens` : ''}; ` +
      `${spec ? `${spec.constraints.length} constraints, ${spec.questions.length} questions` : 'no constraint list'}.`,
    '',
  )
  out.push('### Needed identifiers held', '')
  out.push(`| boundary | needed | ${r.results.map((c) => c.config).join(' | ')} |`, `|---:|---:|${r.results.map(() => '---:|').join('')}`)
  needed.forEach((ids, i) =>
    out.push(`| ${i + 1} | ${ids.length} | ${r.results.map((c) => (c.contexts[i] ? pct(scoreIdentifiers(ids, c.contexts[i]!).held.length, ids.length) : 'not run')).join(' | ')} |`),
  )
  const all = (c: ConfigResult) => {
    let held = 0
    let total = 0
    needed.forEach((ids, i) => c.contexts[i] && ((held += scoreIdentifiers(ids, c.contexts[i]!).held.length), (total += ids.length)))
    return pct(held, total)
  }
  out.push(`| all | ${needed.reduce((n, ids) => n + ids.length, 0)} | ${r.results.map(all).join(' | ')} |`, '')
  if (spec?.constraints.length) {
    out.push('### Constraints in force held', '')
    out.push(`| boundary | in force | ${r.results.map((c) => `${c.config} held | stale`).join(' | ')} |`, `|---:|---:|${r.results.map(() => '---:|---:|').join('')}`)
    t.boundaries.forEach((b, i) => {
      const cells = r.results.map((c) => {
        if (!c.contexts[i]) return 'not run | –'
        const s = scoreConstraints(spec.constraints, b.n, c.contexts[i]!)
        return `${pct(s.inForce.filter((x) => x.held).length, s.inForce.length)} | ${s.reversed.filter((x) => x.stale).length}/${s.reversed.length}`
      })
      out.push(`| ${b.n} | ${spec.constraints.filter((c) => c.setIn < b.n && !(c.reversal && c.reversal.in < b.n)).length} | ${cells.join(' | ')} |`)
    })
    out.push('')
  }
  out.push('### Drift: what was known before boundary 1', '')
  const curves = r.results.map((c) => ({ c, points: drift(t, spec?.constraints ?? [], c.contexts) }))
  out.push(`| boundary | ${curves.map(({ c }) => `${c.config} ids | ${c.config} constraints`).join(' | ')} |`, `|---:|${curves.map(() => '---:|---:|').join('')}`)
  t.boundaries.forEach((b) => {
    const cells = curves.map(({ points }) => {
      const p = points.find((x) => x.boundary === b.n)
      return p ? `${pct(p.identifiers.held, p.identifiers.total)} | ${pct(p.constraints.held, p.constraints.total)}` : 'not run | not run'
    })
    out.push(`| ${b.n} | ${cells.join(' | ')} |`)
  })
  out.push('')
  if (!r.private) {
    const missed = r.results.map((c) => {
      const lost = needed.flatMap((ids, i) => (c.contexts[i] ? scoreIdentifiers(ids, c.contexts[i]!).missing.map((x) => `${x.key} (@${i + 1})`) : []))
      return `- ${c.config}: ${lost.length ? `${lost.slice(0, 12).join(', ')}${lost.length > 12 ? `, and ${lost.length - 12} more` : ''}` : 'none'}`
    })
    out.push('### Needed identifiers missing (first 12 per configuration)', '', ...missed, '')
    if (spec?.constraints.length) {
      const lost = r.results.map((c) => {
        const ids = t.boundaries.flatMap((b, i) => (c.contexts[i] ? scoreConstraints(spec.constraints, b.n, c.contexts[i]!).inForce.filter((x) => !x.held).map((x) => `${x.id} (@${b.n})`) : []))
        return `- ${c.config}: ${ids.length ? ids.join(', ') : 'none'}`
      })
      out.push('### Constraints in force missing', '', ...lost, '')
    }
  }
  const qs = spec?.questions ?? []
  out.push(
    '### Question stage (planned, not run)',
    '',
    qs.length
      ? `${qs.length} questions, ${qs.filter((q) => q.expect?.length).length} with an exact-string check and ${qs.filter((q) => !q.expect?.length).length} needing a model grader; ` +
          `${t.boundaries.reduce((n, b) => n + questionsAt(spec, b.n).length, 0)} asks per configuration over the ${t.boundaries.length} boundaries.`
      : 'No questions for this transcript.',
    '',
  )
  return out.join('\n')
}
