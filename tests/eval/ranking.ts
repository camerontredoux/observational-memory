// Issue #20's measurement: om_recall's search ranking as `hooks/recall.ts` has it, and BM25-lite (pi's k1 = 1.2,
// b = 0.75, a 20% relative noise floor on a multi-term query, at most 50 results) applied inside the same whole-term
// gate, with the same compound-term handling. Evaluation only: production recall is not changed by this module.
// `current` copies `search`'s gate, weights and sort, and `excerpt`'s `whole` and `best`, so it must be kept in step
// with `hooks/recall.ts`; `tests/ranking.test.ts` checks it against `recall()` itself. `scripts/bench-bm25.ts` runs it.

import type { loadTranscript } from '../../hooks/recall'

const WRAP = 1_000 // as hooks/recall.ts: a longer line counts as several
export const BM25 = { k1: 1.2, b: 0.75, floor: 0.2, cap: 50 }

export type Term = { word: string; parts: string[] }
type Held = 'whole' | 'parts' | undefined
/** A block of the search pool: `text` is what the gate reads (a tool block's name, a newline, its text); `body` is the block's own text, which the excerpt's lines come from. */
export type Doc = { text: string; body: string; time: number; index: number }

/** The query's terms, as `matcher` reads a query of words and "quoted phrases"; a message for what this does not rank (a regex, a phrase with a space). */
export function terms(query: string): Term[] | string {
  if (/^\/[\s\S]+\/[a-z]*$/.test(query)) return 'a regex query: BM25 does not apply'
  const out: Term[] = []
  for (const q of query.matchAll(/"([^"]+)"|(\S+)/g)) {
    const word = (q[1] ?? q[2]!).toLowerCase().replace(/\s+/g, ' ')
    if (word.includes(' ')) return 'a phrase with a space: its excerpt spanning is not copied here'
    const parts = q[1] === undefined ? word.split(/[_-]+/).filter((p) => p.length > 1) : []
    if (!out.some((t) => t.word === word)) out.push({ word, parts: parts.length > 1 ? parts : [] })
  }
  return out.length ? out : 'an empty query'
}

function held(ts: readonly Term[], text: string, lower = text.toLowerCase()): Held[] {
  const flat = lower.replace(/\s+/g, ' ')
  return ts.map((t) => (flat.includes(t.word) ? 'whole' : t.parts.length && t.parts.every((p) => lower.includes(p)) ? 'parts' : undefined))
}

function lines(text: string) {
  const out: string[] = []
  for (const line of text.split('\n')) for (let i = 0; i === 0 || i < line.length; i += WRAP) out.push(line.slice(i, i + WRAP))
  return out
}

// `excerpt`'s `whole` and `best`: the most terms one line holds whole, and at all (a compound's parts count on a line
// only when no line of the block holds it whole).
function lineCounts(ts: readonly Term[], body: string) {
  const perLine = lines(body).map((l) => held(ts, l))
  const wholeSomewhere = ts.map((_, k) => perLine.some((h) => h[k] === 'whole'))
  let whole = 0
  let best = 0
  for (const h of perLine) {
    const counted = h.map((x, k) => (x === 'parts' && wholeSomewhere[k] ? undefined : x))
    whole = Math.max(whole, counted.filter((x) => x === 'whole').length)
    best = Math.max(best, counted.filter(Boolean).length)
  }
  return { whole, best }
}

/** The gate: the blocks holding every term whole, else (`loose`) those holding any. */
function gate(ts: readonly Term[], docs: readonly Doc[]) {
  const all = docs.map((d) => ({ d, held: held(ts, d.text) }))
  let hits = all.filter((h) => h.held.every((x) => x === 'whole'))
  const loose = !hits.length
  if (loose) hits = all.filter((h) => h.held.some(Boolean))
  const df = ts.map((_, k) => all.filter((h) => h.held[k]).length)
  return { hits, loose, df }
}

/** The search pool of a transcript's main thread, as `search` builds it: less om_recall's own blocks, the asking prompt and memory messages. */
export function poolOf(c: Awaited<ReturnType<typeof loadTranscript>>) {
  const docs: (Doc & { ref: string })[] = []
  let last: number | undefined
  c.main.blocks.forEach((b, i) => {
    last = b.time ?? last
    if (b.own || b.asking || b.kind === 'memory') return
    docs.push({ text: b.tool ? `${b.tool}\n${b.text}` : b.text, body: b.text, time: last ?? 0, index: i, ref: b.ref })
  })
  return docs
}

const newest = (a: Doc, b: Doc) => b.time - a.time || b.index - a.index

export type Ranking = { ranked: Doc[]; loose: boolean }

/** om_recall's ranking today: the rarest terms first when loose, then the most terms whole on one line, the most terms on one line, the newest. */
export function current(ts: readonly Term[], docs: readonly Doc[]): Ranking {
  const { hits, loose, df } = gate(ts, docs)
  const weight = df.map((n) => Math.log(1 + docs.length / Math.max(1, n)))
  const scored = hits.map((h) => ({ d: h.d, score: h.held.reduce((s, x, k) => s + (x ? weight[k]! : 0), 0), ...lineCounts(ts, h.d.body) }))
  scored.sort((a, b) => (loose ? b.score - a.score : 0) || b.whole - a.whole || b.best - a.best || newest(a.d, b.d))
  return { ranked: scored.map((s) => s.d), loose }
}

const count = (text: string, word: string) => {
  let n = 0
  for (let i = text.indexOf(word); i !== -1; i = text.indexOf(word, i + word.length)) n++
  return n
}
const words = (text: string) => text.split(/\s+/).length

/**
 * BM25-lite inside the gate: the same hits, ordered by BM25 (newest on a tie), then, on a query of two or more terms,
 * those under `floor` of the top score dropped, then at most `cap`. A term's frequency is its whole occurrences; a
 * compound held only by its parts counts its rarest part's. `unfloored` is the order before the floor and the cap.
 */
export function bm25(ts: readonly Term[], docs: readonly Doc[], o = BM25): Ranking & { unfloored: Doc[] } {
  const { hits, loose, df } = gate(ts, docs)
  const avg = docs.reduce((n, d) => n + words(d.text), 0) / Math.max(1, docs.length)
  const scored = hits.map((h) => {
    const lower = h.d.text.toLowerCase()
    const flat = lower.replace(/\s+/g, ' ')
    const norm = o.k1 * (1 - o.b + (o.b * words(h.d.text)) / avg)
    const score = ts.reduce((s, t, k) => {
      const tf = h.held[k] === 'whole' ? count(flat, t.word) : h.held[k] === 'parts' ? Math.min(...t.parts.map((p) => count(lower, p))) : 0
      if (!tf) return s
      const idf = Math.log((docs.length - df[k]! + 0.5) / (df[k]! + 0.5) + 1)
      return s + (idf * tf * (o.k1 + 1)) / (tf + norm)
    }, 0)
    return { d: h.d, score }
  })
  scored.sort((a, b) => b.score - a.score || newest(a.d, b.d))
  const top = scored[0]?.score ?? 0
  const kept = ts.length >= 2 ? scored.filter((s) => s.score >= top * o.floor) : scored
  return { ranked: kept.slice(0, o.cap).map((s) => s.d), unfloored: scored.map((s) => s.d), loose }
}

/** The 1-based rank of the first doc `needed` accepts, or undefined when none is ranked. */
export function rankOf(ranked: readonly Doc[], needed: (d: Doc) => boolean) {
  const i = ranked.findIndex(needed)
  return i < 0 ? undefined : i + 1
}
