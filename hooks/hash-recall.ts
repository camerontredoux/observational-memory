// `#` recall: the main session's memory lines (constraints and observations) as typeahead rows in the prompt box,
// for a `#` token then a letter (queryOf). The index (indexOf) holds each line's row and words, ranked once, so a
// keystroke only filters it (suggest). Pure: no `$` and no I/O; register.ts keeps the index per session and feeds it.
import type { PromptAutocompleteSuggestion } from 'claude-code'
import { baseOf } from './memory'
import type { Entry } from './memory'

const MAX_ROWS = 8
const LABEL_MAX_CHARS = 100
const MARKERS = ['🔴', '🟡', '🟢', '✅'] // in rank order; a line with none ranks after them
const TRIGGER = /^#\p{L}/u // `#` alone (a heading), `##`, `#!` and `#123` (an issue reference) are not asked
const SPLIT = /[^\p{L}\p{N}]+/u
const HEAD = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})(?:\s+|$)/

export type Row = { suggestion: PromptAutocompleteSuggestion; words: string[] }
export type Index = readonly Row[]

const wordsOf = (text: string) => text.toLowerCase().split(SPLIT).filter(Boolean)

// The query words of a token, or none for a token that is not a trigger.
export const queryOf = (token: string): string[] => (TRIGGER.test(token) ? wordsOf(token.slice(1)) : [])

// One line's marker, time and words as they read, without the replaced-constraint note.
function partsOf(line: string) {
  let rest = baseOf(line).trim()
  const marker = MARKERS.find((m) => rest.startsWith(m))
  if (marker) rest = rest.slice(marker.length).trim()
  const time = rest.match(HEAD)?.[1]
  if (time) rest = rest.slice(time.length).trim()
  return { marker, time, text: rest }
}

// The ledger's lines as rows, ranked: constraints first, then by marker, then newest (time, then ledger place).
export function indexOf(ledger: { entries?: readonly Entry[]; corrections?: readonly string[] }): Index {
  const lines = [
    ...(ledger.corrections ?? []).map((line, place) => ({ line, place, tag: 'constraint', constraint: true })),
    ...(ledger.entries ?? []).map((e, place) => ({ line: e.line, place, tag: e.r ? 'condensed' : undefined, constraint: false })),
  ]
  const ranked = lines
    .map((l) => ({ ...l, ...partsOf(l.line) }))
    .filter((l) => l.text)
    .map((l) => ({ ...l, rank: l.marker ? MARKERS.indexOf(l.marker) : MARKERS.length }))
    .sort((a, b) => Number(b.constraint) - Number(a.constraint) || a.rank - b.rank || (b.time ?? '').localeCompare(a.time ?? '') || b.place - a.place)
  return ranked.map((l) => {
    const flat = `${l.marker ? `${l.marker} ` : ''}${l.text}`.replace(/\s+/g, ' ')
    const description = [l.time, l.tag].filter(Boolean).join(' · ')
    const suggestion: PromptAutocompleteSuggestion = {
      text: `${l.text} `, // the trailing space ends the token: the box asks nothing more of the last word
      label: flat.length > LABEL_MAX_CHARS ? `${flat.slice(0, LABEL_MAX_CHARS - 1)}…` : flat,
      ...(description ? { description } : {}),
    }
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
