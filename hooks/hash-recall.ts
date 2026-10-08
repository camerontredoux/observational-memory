// `#` recall: the main session's memory lines (constraints and observations) as typeahead rows in the prompt box,
// for a `#` token then a letter (queryOf). The index (indexOf) holds each line's row and words, ranked once, so a
// keystroke only filters it (suggest). Pure: no `$` and no I/O; register.ts keeps the index per session and feeds it.
import type { PromptAutocompleteSuggestion } from 'claude-code'
import { partsOf } from './lines'
import { baseOf } from './memory'
import type { Entry } from './memory'
import { MARKERS } from './prompts'

const MAX_ROWS = 8
const TRIGGER = /^#\p{L}/u // `#` alone (a heading), `##`, `#!` and `#123` (an issue reference) are not asked
const SPLIT = /[^\p{L}\p{N}]+/u

export type Row = { suggestion: PromptAutocompleteSuggestion; words: string[] }
export type Index = readonly Row[]

const wordsOf = (text: string) => text.toLowerCase().split(SPLIT).filter(Boolean)

// The query words of a token, or none for a token that is not a trigger.
export const queryOf = (token: string): string[] => (TRIGGER.test(token) ? wordsOf(token.slice(1)) : [])

// The ledger's lines as rows, ranked: constraints first, then by marker, then newest (time, then ledger place).
export function indexOf(ledger: { entries?: readonly Entry[]; corrections?: readonly string[] }): Index {
  const lines = [
    ...(ledger.corrections ?? []).map((line, place) => ({ line, place, tag: 'constraint', constraint: true })),
    ...(ledger.entries ?? []).map((e, place) => ({ line: e.line, place, tag: e.r ? 'condensed' : undefined, constraint: false })),
  ]
  const ranked = lines
    .map((l) => ({ ...l, ...partsOf(baseOf(l.line)) }))
    .filter((l) => l.text)
    .map((l) => ({ ...l, rank: l.marker ? MARKERS.indexOf(l.marker) : MARKERS.length })) // a line with no marker ranks after them
    .sort((a, b) => Number(b.constraint) - Number(a.constraint) || a.rank - b.rank || (b.time ?? '').localeCompare(a.time ?? '') || b.place - a.place)
  return ranked.map((l) => {
    // All on the label, with no description: the typeahead cuts a described row's label to 40% of the width and wraps
    // it, while a bare label runs the whole row, cut there. It cuts a label holding `/` or `\` as a path, keeping the
    // tail, so the label shows look-alikes (∕ U+2215, ⧵ U+29F5) and is cut at its end; `text` keeps the real ones.
    const head = [l.marker, l.time?.slice(5), l.constraint ? '[constraint]' : undefined].filter(Boolean).join(' ')
    const label = `${head ? `${head} ` : ''}${l.text}${l.tag === 'condensed' ? ' (condensed)' : ''}`
      .replace(/\s+/g, ' ')
      .replace(/\//g, '∕')
      .replace(/\\/g, '⧵')
    const suggestion: PromptAutocompleteSuggestion = { text: `${l.text} `, label } // the trailing space ends the token: the box asks nothing more of the last word
    return { suggestion, words: wordsOf(l.text) }
  })
}

// The rows whose words each query word begins, in index order, a repeated `text` dropped, at most MAX_ROWS.
export function suggest(index: Index, query: readonly string[]): PromptAutocompleteSuggestion[] {
  if (!query.length) return []
  const rows: PromptAutocompleteSuggestion[] = []
  const seen = new Set<string>()
  for (const r of index) {
    if (rows.length >= MAX_ROWS) break
    if (seen.has(r.suggestion.text) || !query.every((q) => r.words.some((w) => w.startsWith(q)))) continue
    seen.add(r.suggestion.text)
    rows.push(r.suggestion)
  }
  return rows
}
