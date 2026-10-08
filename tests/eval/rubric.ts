// The compaction A/B rubric (`scripts/bench-compact.ts`): fixed, code-checked gates every compacted context is graded
// against at every cut point. Mechanical gates are derived from the transcript; the rest come from the transcript's
// ReplaySpec and its local RubricSpec. Pure: no file system or model.
import type { Context, ReplaySpec, Row, Transcript } from './replay'
import { contextText, earlyNeeded, estimateTokens, holds, identifiersIn, isTyped, messageText, neededIdentifiers, scoreConstraints } from './replay'

export type Gate =
  | 'identifiers' | 'constraints' | 'verbatim' | 'corrections' | 'reversals' | 'approvals' | 'asks' | 'in-progress' | 'handoff'
  | 'files-edited' | 'commits' | 'failures' | 'facts' | 'decisions' | 'lessons' | 'file-state' | 'multi-hop' | 'rationale'
  | 'chronology' | 'recall' | 'absent' | 'tokens' | 'budget'

/** Weight per gate: the one table. */
export const WEIGHTS: Record<Gate, number> = {
  identifiers: 10, constraints: 6, verbatim: 5, corrections: 8, reversals: 6, approvals: 5, asks: 5, 'in-progress': 5, handoff: 8,
  'files-edited': 5, commits: 4, failures: 6, facts: 5, decisions: 5, lessons: 7, 'file-state': 7, 'multi-hop': 7, rationale: 7,
  chronology: 6, recall: 5, absent: 5, tokens: 6, budget: 3,
}
/**
 * A hard hand-authored item's gate, by its id's type prefix (docs/research/hard-compaction-items.md), when its own gate
 * is facts, decisions or unset: neg → lessons (tried and dropped, and why), file → file-state (what a file does after its
 * last edit), hop/multi → multi-hop (two facts from far-apart spans), why → rationale (a decision with its reason).
 */
export function itemGate(id: string, gate: Gate | undefined, dflt: Gate): Gate {
  if (gate && gate !== 'facts' && gate !== 'decisions') return gate
  const by: Record<string, Gate> = { neg: 'lessons', file: 'file-state', hop: 'multi-hop', multi: 'multi-hop', why: 'rationale' }
  const m = /^(neg|file|hop|multi|why)[:-]/.exec(id)
  return m ? by[m[1]!]! : (gate ?? dflt)
}
/**
 * Context size: full marks from FLOOR to LO tokens, falling linearly to none at HI (bloat) and at 0 (over-compression:
 * a context under FLOOR has thrown work away whatever else it holds). Over BUDGET, the budget item scores BUDGET/tokens,
 * and the mean budget score scales the weighted total.
 */
export const TOKENS = { FLOOR: 4_000, LO: 12_000, HI: 40_000, BUDGET: 40_000 }

export /** `shared`: transcripts that state the same fact (the negative control does not count their contexts against it). */
type Span = { from: number; to?: number; shared?: readonly string[] }
/** A behavior probe on an item (tests/eval/behavior.ts): the question, and a pattern the answer must match (default: every `expect`). */
type Ask = { ask?: string; answer?: string }
/** Hand-authored gates for one transcript: kept local (tests/fixtures/<name>.rubric.local.ts). */
export type RubricSpec = {
  /** The context's prose holds every `expect` (whole token; an array is alternatives; see hasExpect). */
  facts?: (Span & Ask & { id: string; gate?: Gate; expect: readonly Expect[] })[]
  /** The context does not match `pattern` (case-insensitive): a stale or false fact. */
  absent?: (Span & Ask & { id: string; pattern: string })[]
  /** Latest wins: `current` matches, and after the last match of `stale` if that matches too (case-insensitive). */
  latest?: (Span & Ask & { id: string; gate?: Gate; current: string; stale: string })[]
  /** om_recall search `query` over the transcript up to the cut returns text holding every `expect`. */
  recall?: (Span & Ask & { id: string; query: string; expect: readonly string[] })[]
  /** Behavior only: a question on a constraint or finished work (`of`), answered `yes`/`no`/`ask`, `done`, or matching the pattern. */
  probes?: (Span & { of: string; kind: 'rule' | 'permission' | 'done'; ask: string; answer: string })[]
}

export type Item = { gate: Gate; boundary: number; id: string; score: number; evidence: string }

const squash = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const hasWhole = (text: string, s: string) => new RegExp(`(?<![\\w])${esc(squash(s))}(?![\\w])`).test(text)
/** An expected token: a string, or alternatives of which any one will do. */
export type Expect = string | readonly string[]
const NUMBER_WORDS = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ')
/** Text as a paraphrase-tolerant match reads it: lower case, no markdown marks, number words as digits, words stemmed. */
export const norm = (s: string) =>
  squash(s.replace(/[*`_]+/g, ' '))
    .replace(/[a-z]+/g, (w) => {
      const i = NUMBER_WORDS.indexOf(w)
      return i >= 0 ? String(i) : w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, '') : w
    })
/**
 * Whether `text` holds `e` (any alternative) as a whole token: exact (case-insensitive, squashed) for exact:/str:
 * items, else normalized by `norm`. `squashed` and `normed` are the text already passed through squash and norm.
 */
export function hasExpect(squashed: string, normed: string, e: Expect, exact: boolean) {
  return (typeof e === 'string' ? [e] : e).some((x) => (exact ? hasWhole(squashed, x) : hasWhole(normed, norm(x))))
}
const isExact = (id: string) => /^(?:exact|str)[:-]/.test(id)
/** Where the last whole-token match of `e` (any alternative) ends in the squashed or normed text, or -1. */
function lastAt(squashed: string, normed: string, e: Expect, exact: boolean) {
  let at = -1
  for (const x of typeof e === 'string' ? [e] : e) {
    const [text, tok] = exact ? [squashed, squash(x)] : [normed, norm(x)]
    for (const m of text.matchAll(new RegExp(`(?<![\\w])${esc(tok)}(?![\\w])`, 'g'))) at = Math.max(at, m.index! + m[0].length)
  }
  return at
}
type Fact = { id: string; expect: readonly Expect[] }
type Latest = { current: string; stale: string }
/** A fact item holds in a prose context (squashed, normed): every expect; for an order item (ord:/order:), in its order. */
export function factHolds(f: Fact, ptext: string, pnorm: string) {
  const exact = isExact(f.id)
  if (!f.expect.every((e) => hasExpect(ptext, pnorm, e, exact))) return false
  if (!/^ord(?:er)?[:-]/.test(f.id)) return true
  const at = f.expect.map((e) => lastAt(ptext, pnorm, e, exact))
  return at.every((x, i) => i === 0 || at[i - 1]! < x)
}
/** A latest item holds in a prose context: `current` matches, after the last match of `stale`. */
export function latestHolds(l: Latest, prose: string) {
  const now = lastMatch(prose, l.current)
  return now >= 0 && now > lastMatch(prose, l.stale)
}
/**
 * The negative control: every hand-authored fact or latest item that passes another transcript's context, which cannot
 * answer it, unless the item names that transcript `shared`. `contexts[name]` is each cut's prose context (proseContext).
 * Its own contexts before `from` are no control: the fact may be stated before the span the item grades.
 */
export function negativeControl(items: Record<string, Pick<RubricSpec, 'facts' | 'latest'>>, contexts: Record<string, { n: number; prose: string }[]>) {
  const weak: string[] = []
  const prepared = Object.fromEntries(Object.entries(contexts).map(([k, cs]) => [k, cs.map((c) => ({ ...c, ptext: squash(c.prose), pnorm: norm(c.prose) }))]))
  for (const [name, spec] of Object.entries(items)) {
    const tests = [
      ...(spec.facts ?? []).map((f) => ({ id: f.id, shared: f.shared ?? [], ok: (c: { ptext: string; pnorm: string }) => factHolds(f, c.ptext, c.pnorm) })),
      ...(spec.latest ?? []).map((l) => ({ id: l.id, shared: l.shared ?? [], ok: (c: { prose: string }) => latestHolds(l, c.prose) })),
    ]
    for (const x of tests) {
      const hits = Object.entries(prepared).flatMap(([other, cs]) => (other === name || x.shared.includes(other) ? [] : cs.filter(x.ok).map((c) => `${other}@${c.n}`)))
      if (hits.length) weak.push(`${name}/${x.id}: ${hits.join(' ')}`)
    }
  }
  return weak
}
const inSpan = (x: Span, n: number) => x.from <= n && (x.to === undefined || n <= x.to)
const cut = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s)
const pass = (gate: Gate, boundary: number, id: string, ok: boolean, evidence: string): Item => ({ gate, boundary, id, score: ok ? 1 : 0, evidence })
const home = (p: string) => p.replace(/^\/home\/[^/]+/, '~')
/** The index just past the last match of `re` in `text`, or -1. */
const lastMatch = (text: string, re: string) => {
  let at = -1
  for (const m of text.matchAll(new RegExp(re, 'gi'))) at = m.index! + m[0].length
  return at
}

// A user message that sets or changes a rule: a correction, a prohibition, a standing instruction.
const CORRECTION = /^(?:no\b|nope|not that|actually\b|instead\b|wait\b|scratch that|never ?mind|don'?t\b|do not\b|stop\b|undo\b|revert\b|well i\b|youre right|you're right)|\binstead\b|\bnot anymore\b|\bchanged my mind\b|\b(?:don'?t|do not|never|always|only|must|make sure|from now on|no need to|not all|just (?:a|the|have|make|use|read))\b/i
const APPROVAL = /^(?:yes|yep|yeah|yup|ok(?:ay)?|sure|go ahead|go for it|approved?|lgtm|ship it|do it|sounds good|looks good|please (?:fix|do)|fix (?:that|those|it))\b/i
const DENIED = /^The user doesn't want to proceed with this tool use/
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const COMMIT = /^\[([\w./-]+)(?: \(root-commit\))? ([0-9a-f]{7,40})\] /gm
const PR = /github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+)/g
const ERROR_KEY = /\b(?:E[A-Z]{3,}\b|TS\d{4}\b|[A-Z][A-Za-z]+Error\b|fatal: [^\n]{4,50}|error: [^\n]{4,50}|[\w.-]+: cannot [^\n]{4,50}|[\w.-]+: No such file or directory)/
// ---- Prose: a token counts only where the context says something about it ----

const PROSE_WORD = /^[A-Za-z][a-z]+(?:'[a-z]+)?$/
const PROSE = { WORDS: 5, SHARE: 1 / 3 }
/** Whether a line is prose: at least PROSE.WORDS plain words, and they are at least PROSE.SHARE of its tokens. */
export function isProse(line: string) {
  const ws = line.split(/\s+/).filter(Boolean)
  const p = ws.filter((w) => PROSE_WORD.test(w.replace(/^[("'`*[<]+|[)"'`*\]>.,;:!?]+$/g, ''))).length
  return p >= PROSE.WORDS && p >= ws.length * PROSE.SHARE
}
/** Identifiers in a line, of every kind the gates grade. */
const idCount = (line: string) => identifiersIn(line).size + extrasIn(line, line).size
/** A list, not prose: at least 3 identifiers, more than LIST_DENSITY per word ("worked with: a b c d e f" says nothing). */
const LIST_DENSITY = 0.4
export const isList = (line: string) => {
  const ids = idCount(line)
  return ids >= 3 && ids > line.split(/\s+/).filter(Boolean).length * LIST_DENSITY
}
const proseOnly = (text: string, keep?: (line: string) => boolean) => text.split('\n').filter((l) => keep?.(l) || (isProse(l) && !isList(l))).join('\n')

// ---- Grounding: an identifier counts where its context line says what the transcript said about it ----

const STOP = new Set('about above after again also been before being below between both could does doing done down during each from further have having here into itself just more most much must need only other over same should some such than that their them then there these they this those through under until very were what when where which while will with would your session assistant user the'.split(' '))
/** A line's content words: plain words of 4+ letters, lower case, stopwords out (identifier tokens are not plain words). */
export const contentWords = (line: string) =>
  new Set(line.toLowerCase().split(/\s+/).map((w) => w.replace(/^[^a-z]+|[^a-z]+$/g, '')).filter((w) => /^[a-z]{4,}$/.test(w) && !STOP.has(w)))
const GROUND_WORDS = 2
type SourceLine = { row: number; text: string; plain: string; words?: Set<string> }
const sources = new WeakMap<Transcript, { lines: SourceLine[]; memo: Map<string, SourceLine[]> }>()
/** The transcript's lines, each with the index of its row in t.spans.flat(). */
function sourceOf(t: Transcript) {
  let s = sources.get(t)
  if (!s) {
    const lines: SourceLine[] = []
    t.spans.flat().forEach((r, row) => {
      for (const text of messageText(r).split('\n')) if (text.trim()) lines.push({ row, text, plain: text.replace(/(\d),(?=\d{3})/g, '$1').toLowerCase() })
    })
    sources.set(t, (s = { lines, memo: new Map() }))
  }
  return s
}
/**
 * Whether `context` holds the identifier `key` (by `test`, per line) on a line that shares GROUND_WORDS content words,
 * other than the key's own, with a transcript line before the cut (`rows` rows in) that holds it too.
 */
function grounded(t: Transcript, rows: number, context: readonly string[], key: string, probe: string, test: (line: string) => boolean) {
  const src = sourceOf(t)
  const id = `${probe}\0${key}`
  let hits = src.memo.get(id)
  if (!hits) src.memo.set(id, (hits = src.lines.filter((l) => l.plain.includes(probe) && test(l.text))))
  const own = contentWords(key.replace(/[^A-Za-z]+/g, ' '))
  for (const line of context) {
    if (!test(line)) continue
    const cw = [...contentWords(line)].filter((w) => !own.has(w))
    if (cw.length < GROUND_WORDS) continue
    for (const h of hits) {
      if (h.row >= rows) break
      const hw = (h.words ??= contentWords(h.text))
      if (cw.filter((w) => hw.has(w)).length >= GROUND_WORDS) return true
    }
  }
  return false
}
/** The lowercase substring every line holding `key` of `kind` contains, for a fast first pass. */
const probeOf = (key: string, kind: string) => (kind === 'path' ? key.split('/').filter(Boolean).at(-1)! : kind === 'pr' ? key.slice(3) : key).replace(/,/g, '').toLowerCase()
/**
 * The context as the token gates read it: the summary's prose lines, and the raw tail's rows whole when they are the
 * transcript's own rows (anything else in the tail, prose lines only). A list of bare identifiers counts for nothing.
 */
export function proseContext(context: Context, before: readonly Row[], keep?: (line: string) => boolean): string {
  const genuine = new Set(before.map(messageText))
  const kept = context.kept.map((m) => {
    const s = messageText(m)
    return { text: genuine.has(s) ? s : proseOnly(s, keep), toolUses: [], toolResults: undefined }
  })
  return contextText({ summary: proseOnly(context.summary, keep), kept })
}

// A line that reports a claim as gone ("the $30 cap was dropped") does not state it as current.
const SUPERSEDED = /\b(?:dropped|no longer|replaced|superseded|revers|reverted|removed|withdr[ae]w|retracted|instead|was changed|changed (?:it )?to|raised|lowered|previously|formerly|used to|stale|anymore)/i
/** Whether `pattern` matches a line of `text` that does not report it as superseded. */
const statedAsCurrent = (text: string, pattern: string) => text.split('\n').some((l) => new RegExp(pattern, 'i').test(l) && !SUPERSEDED.test(l))

/** A user message's verbatim key: its first 100 characters, squashed. */
const quoteKey = (text: string) => squash(text).slice(0, 100)

// ---- Identifiers beyond replay.ts's kinds: branch names, config constants, PR numbers, numbers the assistant quoted ----

type Extra = 'branch' | 'const' | 'pr' | 'number'
const BRANCH = /(?:checkout -b|switch -c|worktree add(?: -q)?(?: -f)? -b|push (?:-u )?origin|branch -[mMdD]?) +([\w][\w./-]*[\w])/g
const CONST = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g
const PR_NUM = /(?:\/pull\/|\bPR #?|\bpull request #?)(\d{2,6})\b/gi
// A number worth remembering: four or more digits, or a decimal with three or more; not a year, a time or a date part.
const NUMBER = /(?<![\w.:/-])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\w.:/-])|(?<![\w.:/#-])(?:\d{4,}|\d+\.\d{2,}|\d{2,}\.\d+)(?![\w:/-]|\.\d)/g
const numKey = (s: string) => s.replace(/,/g, '')
const notNumber = (k: string) => /^20\d\d$/.test(k) || /^\d+\.\d+\.\d+/.test(k)

function extrasIn(text: string, assistantText: string): Map<string, Extra> {
  const out = new Map<string, Extra>()
  for (const m of text.matchAll(BRANCH)) if (/[-/]/.test(m[1]!) && !/^(?:origin|HEAD)$/.test(m[1]!)) out.set(m[1]!, 'branch')
  for (const m of text.matchAll(COMMIT)) if (/[-/]/.test(m[1]!)) out.set(m[1]!, 'branch')
  for (const m of text.matchAll(CONST)) if (m[0].length >= 6) out.set(m[0], 'const')
  for (const m of text.matchAll(PR_NUM)) out.set(`PR ${m[1]}`, 'pr')
  for (const m of assistantText.matchAll(NUMBER)) if (!notNumber(numKey(m[0]))) out.set(numKey(m[0]), 'number')
  return out
}
const holdsExtra = (raw: string, key: string, kind: Extra) =>
  kind === 'pr'
    ? new RegExp(`(?:#|PR ?#?|pull/)${key.slice(3)}\\b`, 'i').test(raw)
    : kind === 'number'
      ? new RegExp(`(?<![\\w.])${esc(key)}(?![\\w]|\\.\\d)`).test(raw.replace(/(\d),(?=\d{3})/g, '$1'))
      : new RegExp(`(?<![\\w./-])${esc(key)}(?![\\w/-])`).test(raw)

/** Like replay's neededIdentifiers, for the extra kinds: known before the cut, used by the assistant after it unprompted. */
function neededExtras(t: Transcript, n: number) {
  const known = new Map<string, Extra>()
  for (const r of t.spans.slice(0, n).flat()) for (const [k, v] of extrasIn(messageText(r), r.role === 'assistant' ? r.text : '')) known.set(k, v)
  const kept = t.boundaries[n - 1]?.kept.map(messageText).join('\n') ?? ''
  const shown = new Set<string>()
  const needed = new Map<string, { key: string; kind: Extra; line: number }>()
  for (const r of t.spans[n] ?? []) {
    const use = r.role === 'assistant' ? [r.text, ...r.toolUses.map((u) => JSON.stringify(u.input))].join('\n') : ''
    const found = [...extrasIn(messageText(r), r.role === 'assistant' ? r.text : '').keys(), ...(use.match(/[\w][\w./-]*[\w]/g) ?? [])]
    if (r.role === 'user') {
      for (const k of found) shown.add(k)
      continue
    }
    for (const k of found) {
      const kind = known.get(k)
      if (!kind || needed.has(k) || shown.has(k) || holdsExtra(kept, k, kind)) continue
      if (kind === 'number' && !extrasIn('', r.text).has(k)) continue
      needed.set(k, { key: k, kind, line: r.line })
    }
    for (const k of found) shown.add(k)
  }
  return [...needed.values()]
}

// ---- Failures: what went wrong, by its class, so the lesson is kept ----

/** The tokens a context must hold to show it knows a failure: its error line, the hook that blocked it, the tool missing. */
function failureKey(tool: string, text: string): string[] | undefined {
  let m
  if ((m = /No such tool available: (\w+)/.exec(text))) return [m[1]!]
  if ((m = /^Blocked: (\w+)/.exec(text))) return [m[1]!, /Monitor/.test(text) ? 'Monitor' : m[1]!]
  if ((m = /PreToolUse:\w+ hook error: .*?([\w.-]+\.sh)\b/.exec(text))) return [m[1]!]
  if ((m = /Invalid (\w+) script: ([^\n|]{4,40})/.exec(text))) return [m[2]!.trim()]
  if (tool !== 'Bash' || !/^Exit code [1-9]/.test(text)) return undefined
  const key = text.split('\n').map((l) => ERROR_KEY.exec(l.trim())).find((x) => x?.index === 0)?.[0]
  return key ? [key.replace(/'[^']*'/g, (q) => q).slice(0, 60)] : undefined
}

/** Grades one boundary's context. `recallTexts` maps a recall gate id to what the search returned. */
export function grade(t: Transcript, n: number, context: Context, spec?: ReplaySpec, rubric?: RubricSpec, recallTexts?: ReadonlyMap<string, string>): Item[] {
  const items: Item[] = []
  const raw = contextText(context)
  const text = squash(raw)
  const before: Row[] = t.spans.slice(0, n).flat()
  // The token gates read prose only (see proseContext); quotes and the absent patterns read the whole context.
  const pr = proseContext(context, before)
  const ptext = squash(pr)
  const pnorm = norm(pr)
  const expectAll = (xs: readonly Expect[], id: string) => xs.every((e) => hasExpect(ptext, pnorm, e, isExact(id)))
  const lastTwo = t.spans.slice(Math.max(0, n - 2), n).flat()
  const lastThree = t.spans.slice(Math.max(0, n - 3), n).flat()
  const typed = before.filter(isTyped)
  // Identifier gates: held on a grounded line of the prose context (see grounded).
  const plines = pr.split('\n')
  const has = (key: string, kind: Parameters<typeof holds>[2]) => grounded(t, before.length, plines, key, probeOf(key, kind), (l) => holds(l, key, kind))
  const hasExtra = (key: string, kind: Extra) => grounded(t, before.length, plines, key, probeOf(key, kind), (l) => holdsExtra(l, key, kind))

  for (const x of neededIdentifiers(t, n)) items.push(pass('identifiers', n, `${x.kind}:${x.key}`, has(x.key, x.kind), `used at line ${x.line}`))
  for (const x of neededExtras(t, n)) items.push(pass('identifiers', n, `${x.kind}:${x.key}`, hasExtra(x.key, x.kind), `used at line ${x.line}`))

  if (spec) {
    const s = scoreConstraints(spec.constraints, n, context)
    for (const c of s.inForce) items.push(pass('constraints', n, c.id, c.held, 'pattern'))
    for (const c of spec.constraints.filter((c) => c.setIn < n && !(c.reversal && c.reversal.in < n)))
      items.push(pass('verbatim', n, c.id, text.includes(squash(c.quote)), cut(c.quote)))
    // A reversal: its new form held, and after the last place the stale form is (the context reads oldest first).
    // A line quoting the user's own words for either form counts too: a short reply ("no its 001.41") is not prose.
    for (const c of spec.constraints.filter((c) => c.reversal && c.reversal.in < n)) {
      const quotes = [c.quote, c.reversal!.quote].map(squash)
      const rv = proseContext(context, before, (l) => quotes.some((q) => squash(l).includes(q)))
      const now = Math.max(...c.reversal!.held.map((p) => lastMatch(rv, p)))
      const stale = Math.max(...c.held.map((p) => lastMatch(rv, p)))
      items.push(pass('reversals', n, c.id, now >= 0 && now > stale, now < 0 ? (stale >= 0 ? 'stale form only' : 'neither form') : now > stale ? 'new form last' : 'stale form after the new'))
      items.push(pass('verbatim', n, `${c.id}:reversal`, text.includes(squash(c.reversal!.quote)), cut(c.reversal!.quote)))
    }
    for (const q of spec.questions.filter((q) => q.expect?.length && q.from <= n && (q.to === undefined || n <= q.to)))
      items.push(pass(q.to === undefined ? 'facts' : 'handoff', n, q.id, expectAll(q.expect!, q.id), `${q.expect!.length} tokens`))
  }

  // The user's corrections and standing rules, verbatim, for the rest of the session.
  const seen = new Set<string>()
  for (const r of typed) {
    const k = quoteKey(r.text)
    if (r.text.length > 400 || k.length < 12 || seen.has(k)) continue
    seen.add(k)
    if (CORRECTION.test(r.text.trim())) items.push(pass('corrections', n, `line ${r.line}`, text.includes(k), cut(k)))
  }

  // Approvals in the last two spans: what the user said yes to, by the identifiers of the assistant's proposal before it;
  // and tool uses the user refused, by the command refused.
  let proposal = ''
  for (const r of lastTwo) {
    if (r.role === 'assistant' && r.text.trim()) proposal = r.text
    if (isTyped(r) && r.text.length < 120 && APPROVAL.test(r.text.trim()) && proposal) {
      const keys = [...identifiersIn(proposal)].filter(([, kind]) => kind !== 'usd').slice(0, 4)
      if (!keys.length) continue
      const held = keys.filter(([k, kind]) => has(k, kind))
      items.push(pass('approvals', n, `line ${r.line}`, held.length * 2 >= keys.length, `"${cut(r.text, 30)}" to ${keys.map(([k]) => k).join(', ')}`))
    }
  }
  const allCalls = new Map(before.flatMap((r) => r.toolUses.map((u) => [u.tool_use_id, u] as const)))
  const results = (rows: Row[]) => rows.flatMap((r) => (r.toolResults ?? []).map((x) => ({ ...x, row: r })))
  for (const x of results(lastTwo)) {
    if (!DENIED.test(x.text)) continue
    const call = allCalls.get(x.tool_use_id)
    const keys = [...identifiersIn(JSON.stringify(call?.input ?? {}))].slice(0, 3)
    const ok = /\b(?:reject|refus|denied|declin|stopp?ed|interrupt)/i.test(raw) && (!keys.length || keys.some(([k, kind]) => has(k, kind)))
    items.push(pass('approvals', n, `denied line ${x.row.line}`, ok, `refused ${call?.tool ?? '?'} ${keys.map(([k]) => k).join(', ')}`))
  }

  // The user's last three requests, verbatim: the raw tail usually holds only the newest.
  for (const r of typed.slice(-3)) items.push(pass('asks', n, `line ${r.line}`, text.includes(quoteKey(r.text)), cut(quoteKey(r.text))))

  // What was in progress: the files of the last three distinct file tool calls before the cut.
  const recent: string[] = []
  for (const r of [...(t.spans[n - 1] ?? [])].reverse()) {
    for (const u of [...r.toolUses].reverse()) {
      const p = (u.input as { file_path?: unknown }).file_path
      if (typeof p === 'string' && !recent.includes(p)) recent.push(p)
    }
    if (recent.length >= 3) break
  }
  for (const p of recent.slice(0, 3)) items.push(pass('in-progress', n, home(p), has(home(p), 'path'), 'recent file'))

  // Completed work: files edited in the last three spans, commits and PRs made, failures in the last three spans.
  const edited = new Set<string>()
  for (const r of lastThree)
    for (const u of r.toolUses) if (EDIT_TOOLS.has(u.tool) && typeof (u.input as { file_path?: unknown }).file_path === 'string') edited.add(home((u.input as { file_path: string }).file_path))
  for (const p of edited) items.push(pass('files-edited', n, p, has(p, 'path'), 'edited'))
  const made = new Map<string, string>()
  for (const x of results(before)) for (const m of x.text.matchAll(COMMIT)) made.set(`commit:${m[2]!.slice(0, 7)}`, m[1]!)
  // PRs the assistant reported to the user (not every PR a listing printed).
  for (const r of before) if (r.role === 'assistant') for (const m of r.text.matchAll(PR)) made.set(`pr:${m[1]}`, '')
  for (const [id, branch] of made) {
    const key = id.slice(id.indexOf(':') + 1)
    const ok = id.startsWith('commit:') ? has(key, 'commit') : hasExtra(`PR ${key}`, 'pr')
    items.push(pass('commits', n, id, ok, branch ? `on ${branch}` : 'pull request'))
  }
  // A failure is a lesson, not noise: a policy failure (a block, a hook, a missing tool), one that recurs (its key in
  // two spans, or again after the cut), or one still unresolved at the cut (no later success of the same target).
  const everyCall = new Map(t.spans.flat().flatMap((r) => r.toolUses.map((u) => [u.tool_use_id, u] as const)))
  const keyOf = (x: { tool_use_id: string; text: string }) => failureKey(everyCall.get(x.tool_use_id)?.tool ?? '', x.text)?.join('|')
  const spansOf = new Map<string, Set<number>>()
  t.spans.forEach((s, i) => {
    for (const x of results(s)) if (x.isError) {
      const k = keyOf(x)
      if (k) spansOf.set(k, (spansOf.get(k) ?? new Set()).add(i))
    }
  })
  const target = (id: string) => {
    const u = everyCall.get(id)
    if (!u) return '?'
    const i = u.input as { command?: unknown; file_path?: unknown }
    return typeof i.command === 'string' ? `Bash ${i.command.trim().split(/\s+/).slice(0, 2).join(' ')}` : typeof i.file_path === 'string' ? `${u.tool} ${i.file_path}` : u.tool
  }
  const allBefore = results(before)
  const failed = new Set<string>()
  for (const x of results(lastThree)) {
    if (!x.isError) continue
    const keys = failureKey(allCalls.get(x.tool_use_id)?.tool ?? '', x.text)
    if (!keys || failed.has(keys.join('|'))) continue
    const policy = /^(?:<tool_use_error>)?Blocked: |PreToolUse:\w+ hook error|No such tool available/.test(x.text)
    const where = spansOf.get(keys.join('|')) ?? new Set()
    const recurs = where.size >= 2 || [...where].some((i) => i >= n)
    const tg = target(x.tool_use_id)
    const at = allBefore.findIndex((y) => y.tool_use_id === x.tool_use_id)
    const unresolved = !allBefore.slice(at + 1).some((y) => !y.isError && target(y.tool_use_id) === tg)
    if (!policy && !recurs && !unresolved) continue
    failed.add(keys.join('|'))
    items.push(pass('failures', n, `line ${x.row.line}`, keys.every((k) => ptext.includes(squash(k))), `${cut(keys.join(' + '))} (${policy ? 'policy' : recurs ? 'recurs' : 'unresolved'})`))
  }

  // Chronology: identifiers from before boundary 1 that some later boundary needs, still held from boundary 3 on.
  if (n >= 3) for (const x of earlyNeeded(t)) items.push(pass('chronology', n, `${x.kind}:${x.key}`, has(x.key, x.kind), 'span 0'))

  // Hallucination: a commit hash in the summary that the transcript never showed.
  const source = before.map(messageText).join('\n')
  const invented = [...identifiersIn(context.summary)].filter(([key, kind]) => kind === 'commit' && !holds(source, key, 'commit')).map(([key]) => key)
  items.push(pass('absent', n, 'invented-hashes', !invented.length, invented.length ? invented.join(', ') : 'none'))

  for (const f of rubric?.facts ?? []) if (inSpan(f, n)) items.push(pass(itemGate(f.id, f.gate, 'facts'), n, f.id, factHolds(f, ptext, pnorm), `${f.expect.length} tokens`))
  for (const a of rubric?.absent ?? []) if (inSpan(a, n)) items.push(pass('absent', n, a.id, !statedAsCurrent(raw, a.pattern), 'stale or false claim'))
  for (const l of rubric?.latest ?? [])
    if (inSpan(l, n)) {
      const now = lastMatch(pr, l.current)
      items.push(pass(itemGate(l.id, l.gate, 'reversals'), n, l.id, latestHolds(l, pr), now < 0 ? 'current form missing' : latestHolds(l, pr) ? 'current form last' : 'stale form after the current'))
    }
  for (const r of rubric?.recall ?? [])
    if (inSpan(r, n)) {
      const got = squash(recallTexts?.get(`${r.id}@${n}`) ?? '')
      items.push(pass('recall', n, r.id, r.expect.every((e) => got.includes(squash(e))), `${r.expect.length} tokens`))
    }

  const tokens = estimateTokens(raw)
  const size = tokens < TOKENS.FLOOR ? tokens / TOKENS.FLOOR : Math.max(0, Math.min(1, (TOKENS.HI - tokens) / (TOKENS.HI - TOKENS.LO)))
  items.push({ gate: 'tokens', boundary: n, id: 'size', score: size, evidence: `${tokens} tokens` })
  // Over budget the context does not fit: the budget item scores BUDGET/tokens, and it scales the whole total (see score).
  items.push({ gate: 'budget', boundary: n, id: 'size', score: Math.min(1, TOKENS.BUDGET / tokens), evidence: `${tokens} ≤ ${TOKENS.BUDGET}` })
  return items
}

export type Scores = { total: number; gates: Partial<Record<Gate, { score: number; items: number; passed: number }>> }
/** Each gate's mean item score and passed count, and the weighted total over gates with items times the budget fit, 0-100. */
export function score(items: readonly Item[]): Scores {
  const gates: Scores['gates'] = {}
  for (const g of Object.keys(WEIGHTS) as Gate[]) {
    const xs = items.filter((i) => i.gate === g)
    if (xs.length) gates[g] = { score: (100 * xs.reduce((s, i) => s + i.score, 0)) / xs.length, items: xs.length, passed: xs.filter((i) => i.score >= 1).length }
  }
  const used = Object.keys(gates) as Gate[]
  const w = used.reduce((s, g) => s + WEIGHTS[g], 0)
  // An over-budget context buys its recall with room it does not have: the total is scaled by the budget gate's mean fit.
  const fit = gates.budget ? gates.budget.score / 100 : 1
  return { total: w ? (fit * used.reduce((s, g) => s + WEIGHTS[g] * gates[g]!.score, 0)) / w : 0, gates }
}
