// om_recall's librarian. Ember gets a search's query, what the agent said it will do with the result, and the best
// hits' blocks with their lines numbered, and answers with line ranges, the most important first. Code pastes those
// lines from the blocks, each range grown to the whole unit it is in, so every word the agent reads is the
// transcript's own, never Ember's. Ported from the replay prototype's v3.1 (docs/research/2026-11-09-recall-librarian.md).
// No `$`: register.ts passes in the call to Ember.
import { LIBRARIAN_SYSTEM_PROMPT } from './prompts'
import { linesOf } from './recall'
import type { Block, Hits, Listed } from './recall'
import { flat, parsed } from './reply'

const TOP = 10 // hits given to Ember, each with its call or result
const BLOCK_MAX = 20_000 // characters of one block given to Ember, cut at a line
const CAP = 6_000 // characters of the answer and pasted lines; the units past it become pointers
const FIRST_MAX = 10_000 // the first unit is pasted whole up to this many, past CAP

export const LIBRARIAN_FORMAT = {
  type: 'json_schema',
  name: 'librarian',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['found', 'answer', 'ranges'],
    properties: {
      found: { type: 'boolean' },
      answer: { type: 'string' },
      ranges: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, required: ['ref', 'from', 'to'], properties: { ref: { type: 'string' }, from: { type: 'integer' }, to: { type: 'integer' } } },
      },
    },
  },
} as const

export type LibrarianReply = { found: boolean; answer: string; ranges: unknown[] }
export function readLibrarianReply(text: string): LibrarianReply {
  const r = parsed(text)
  return { found: r.found === true, answer: typeof r.answer === 'string' ? r.answer : '', ranges: Array.isArray(r.ranges) ? r.ranges : [] }
}

// A block as Ember sees it: as many of its lines as fit BLOCK_MAX, numbered as om_recall's read numbers them, and for
// a call the lines each argument spans (its text is one `key: value` per argument, a string as it is).
type Shown = { ref: string; label: string; thread?: string; lines: string[]; fields: [number, number][] }
type Unit = { ref: string; from: number; to: number; order: number }

function shown(b: Block, label: string, thread?: string): Shown {
  const lines: string[] = []
  let chars = 0
  for (const l of linesOf(b.text)) {
    if (lines.length && chars + l.length + 1 > BLOCK_MAX) break
    lines.push(l)
    chars += l.length + 1
  }
  const fields: [number, number][] = []
  if (b.kind === 'call' && b.input && typeof b.input === 'object' && !Array.isArray(b.input)) {
    let at = 1
    for (const [k, v] of Object.entries(b.input)) {
      const n = linesOf(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).length
      fields.push([at, at + n - 1])
      at += n
    }
  }
  return { ref: b.ref, label: thread ? `${label}, in ${thread}` : label, ...(thread ? { thread } : {}), lines, fields }
}
const describe = (b: Block) =>
  b.kind === 'call' ? `tool call ${b.tool ?? ''}`.trim() : b.kind === 'result' ? `result of ${b.tool ?? 'a tool'}${b.error ? ' (error)' : ''}` : `${b.kind} message`
const numbered = (lines: readonly string[], from = 1) => lines.map((l, i) => `${String(from + i).padStart(4)} | ${l}`).join('\n')

// The best hits by score, in the order shown, each followed by its call or result when that is no hit itself, nor
// om_recall's.
function blocksOf(hits: readonly Listed[]) {
  const best = new Set([...hits].sort((x, y) => x.rank - y.rank).slice(0, TOP))
  const top = hits.filter((h) => best.has(h))
  const matched = new Set(top.map((h) => h.block.ref))
  const out = new Map<string, Shown>()
  for (const { block: b, thread } of top) {
    if (out.has(b.ref)) continue
    out.set(b.ref, shown(b, describe(b), thread))
    const p = b.pair
    if (p && !p.own && !out.has(p.ref) && !matched.has(p.ref)) out.set(p.ref, shown(p, `${describe(p)}; the pair of block ${b.ref}, not itself matched`, thread))
  }
  return out
}

// ---- Units ------------------------------------------------------------------------------------------------------

const HEADING = /^(#{1,6})\s+\S/
const FENCE = /^\s*(```|~~~)/
const ITEM = /^\s*([-*+]|\d+[.)])\s+\S/
const INDENTED = /^(\s{2,}|\t)\S/
const HEREDOC = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/
const COMMANDISH = /^\s*(\$ |command: )?(bun|bunx|git|gh|gh-axi|cd|jq|rg|fdfind|sd|curl|node|npx|pnpm|npm|bash|sh|psql|python3?|uv|cat|echo|printf|for|while|if|timeout|ssh|docker|kubectl|aws|fm-[\w.-]+|[\w./~-]+\.sh|\.\/|~\/|\/)(\s|$)/
const oddQuotes = (l: string, q: string) => (l.replace(/\\./g, '').split(q).length - 1) % 2 === 1

// A block's fences, each [open, close] (1-based), and each line's heading level (0 for none, and inside a fence).
function shape(lines: readonly string[]) {
  const fences: [number, number][] = []
  const level: number[] = new Array(lines.length + 2).fill(0)
  let open = 0
  for (let i = 1; i <= lines.length; i++) {
    const l = lines[i - 1]!
    if (FENCE.test(l)) {
      if (open) fences.push([open, i]), (open = 0)
      else open = i
      continue
    }
    const m = open ? null : HEADING.exec(l)
    if (m) level[i] = m[1]!.length
  }
  if (open) fences.push([open, lines.length])
  return { fences, level }
}

// A range grown to the whole units it touches: a call's argument (the full command of a Bash call), a fenced block,
// the section whose heading it holds (to the next heading as high), a list (forward past its items, and back to its
// first when it starts inside one), a command continued by `\`, a heredoc, a quote a command line leaves open (up to
// 60 lines); then by a line each way.
function extend(s: Shown, from: number, to: number) {
  const N = s.lines.length
  const at = (i: number) => s.lines[i - 1] ?? ''
  const blank = (i: number) => !at(i).trim()
  const { fences, level } = shape(s.lines)
  const listy = (i: number) => ITEM.test(at(i)) || (INDENTED.test(at(i)) && !blank(i))
  const nextNonBlank = (i: number) => {
    let j = i + 1
    while (j <= N && blank(j)) j++
    return j
  }
  for (let pass = 0; pass < 6; pass++) {
    const [f0, t0] = [from, to]
    for (const [a, b] of [...s.fields, ...fences]) if (a <= to && b >= from) (from = Math.min(from, a)), (to = Math.max(to, b))
    let top = 0
    for (let i = from; i <= to; i++) if (level[i] && (!top || level[i]! < top)) top = level[i]!
    if (top) {
      let e = to + 1
      while (e <= N && !(level[e] && level[e]! <= top)) e++
      while (e - 1 > to && blank(e - 1)) e--
      if (e - 1 > to) to = e - 1
    }
    if (listy(to) || (/:\s*$/.test(at(to)) && ITEM.test(at(nextNonBlank(to))))) {
      let e = to
      for (;;) {
        if (e + 1 <= N && listy(e + 1)) e++
        else if (e + 1 <= N && blank(e + 1) && nextNonBlank(e + 1) <= N && listy(nextNonBlank(e + 1)) && (ITEM.test(at(e)) || INDENTED.test(at(e)))) e = nextNonBlank(e + 1)
        else break
      }
      to = Math.max(to, e)
    }
    if (listy(from)) {
      let b = from
      for (;;) {
        if (b - 1 >= 1 && listy(b - 1)) b--
        else if (b - 1 >= 1 && blank(b - 1) && b - 2 >= 1 && ITEM.test(at(b - 2))) b -= 2
        else break
      }
      from = Math.min(from, b)
    }
    while (to < N && /\\\s*$/.test(at(to))) to++
    while (from > 1 && /\\\s*$/.test(at(from - 1))) from--
    for (let i = 1; i <= N; i++) {
      const m = HEREDOC.exec(at(i))
      if (!m) continue
      let end = i + 1
      while (end <= N && at(end).trim() !== m[2]) end++
      end = Math.min(end, N)
      if (i <= to && end >= from) (from = Math.min(from, i)), (to = Math.max(to, end))
      i = end
    }
    for (const q of ['"', "'"]) {
      let open = false
      let start = 0
      for (let i = from; i <= to; i++) {
        if (!open && !COMMANDISH.test(at(i))) continue
        if (oddQuotes(at(i), q)) (open = !open), (start = i)
      }
      if (open) {
        let e = to + 1
        while (e <= N && e - start < 60 && !oddQuotes(at(e), q)) e++
        if (e <= N && e - start < 60) to = e
      }
    }
    if (from === f0 && to === t0) break
  }
  return { from: Math.max(1, from - 1), to: Math.min(N, to + 1) }
}

// Ember's ranges that lie inside a block it was given, each grown to whole units, those of one block that overlap or
// touch merged into one at the earliest place in Ember's order among them, in that order.
function unitsOf(ranges: readonly unknown[], blocks: Map<string, Shown>) {
  const valid: Unit[] = []
  for (const [order, r] of ranges.entries()) {
    const { ref, from, to } = (r ?? {}) as { ref?: unknown; from?: unknown; to?: unknown }
    const s = typeof ref === 'string' ? blocks.get(ref) : undefined
    if (!s || !Number.isInteger(from) || !Number.isInteger(to)) continue
    const [a, b] = [from as number, to as number]
    if (a < 1 || b < a || b > s.lines.length) continue
    valid.push({ ref: s.ref, ...extend(s, a, b), order })
  }
  const merged: Unit[] = []
  for (const ref of new Set(valid.map((u) => u.ref))) {
    let last: Unit | undefined
    for (const u of valid.filter((v) => v.ref === ref).sort((x, y) => x.from - y.from)) {
      if (last && u.from <= last.to + 1) (last.to = Math.max(last.to, u.to)), (last.order = Math.min(last.order, u.order))
      else merged.push((last = { ...u }))
    }
  }
  return merged.sort((x, y) => x.order - y.order)
}

// The answer, then each unit in order pasted whole with its ref and lines, unless its text is already pasted, while
// they fit CAP (the first up to FIRST_MAX): one that does not becomes a pointer, and a later one that fits is pasted.
function paste(answer: string, units: readonly Unit[], blocks: Map<string, Shown>) {
  const parts: string[] = []
  const seen: string[] = []
  const pasted: Unit[] = []
  const pointers: Unit[] = []
  let size = answer.length
  for (const [k, u] of units.entries()) {
    const lines = blocks.get(u.ref)!.lines.slice(u.from - 1, u.to)
    const text = lines.join('\n').replace(/\s+/g, ' ').trim()
    if (seen.some((t) => t.includes(text))) continue
    seen.push(text)
    const thread = blocks.get(u.ref)!.thread
    const chunk = `\n\n[${u.ref}] lines ${u.from}-${u.to}${thread ? `, in ${thread}` : ''}\n${numbered(lines, u.from)}`
    // Room is left for the pointers' line, should a later unit not fit.
    if (size + chunk.length <= (k === 0 ? FIRST_MAX : CAP - 80)) parts.push(chunk), (size += chunk.length), pasted.push(u)
    else pointers.push(u)
  }
  const tail = pointers.length ? `\n\nMore lines over the size cap (read with om_recall): ${pointers.map((u) => `${u.ref} lines ${u.from}-${u.to}`).join('; ')}` : ''
  return { text: `${answer}${parts.join('')}${tail}`, pasted, pointers }
}

// ---- Entry ------------------------------------------------------------------------------------------------------

export type Ask = (system: string, input: string) => Promise<LibrarianReply>

// What the librarian answers a search with: Ember's one-line answer, the units it pointed at, then the search's own
// head, its other hits each by its excerpt's head and best line, and its notes. Ember gets the best of the search's
// candidates, which take in the subagents' transcripts; the hits listed are the search's own, so none the excerpts
// would have shown goes unnamed. Or why it stands aside for the hits' excerpts:
// `not-found`, `no-ranges` (none inside a block it was given) or `too-long` (no unit fits). A failed call throws.
export async function librarian(h: Hits, ask: Ask): Promise<{ text: string; refs: string[] } | { fallback: string }> {
  const blocks = blocksOf(h.candidates)
  const question = `What the agent said it will do with the result:\n${h.need ?? '(not said)'}\n\nIts search query: ${h.query}`
  const blocksText = [...blocks.values()].map((b) => `=== block ${b.ref}: ${b.label} (${b.lines.length} lines) ===\n${numbered(b.lines)}\n=== end ${b.ref} ===`)
  const reply = await ask(LIBRARIAN_SYSTEM_PROMPT, `${question}\n\n${blocksText.join('\n\n')}`)
  if (!reply.found) return { fallback: 'not-found' }
  const units = unitsOf(reply.ranges, blocks)
  if (!units.length) return { fallback: 'no-ranges' }
  const p = paste(flat(reply.answer), units, blocks)
  if (!p.pasted.length) return { fallback: 'too-long' }
  const named = new Set([...p.pasted, ...p.pointers].map((u) => u.ref))
  const others = h.hits.filter((x) => !named.has(x.block.ref))
  return {
    text: [p.text, '', ...h.head, ...(others.length ? ['Other hits, not pasted above; read one with {"mode": "read", "ref": …}:', ...others.map((x) => x.brief)] : []), ...h.notes].join('\n'),
    refs: [...new Set([...h.hits.map((x) => x.block.ref), ...named])],
  }
}
