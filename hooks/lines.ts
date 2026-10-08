// The observation line, `🔴 2026-09-23 14:30 User asked … (source 14:00 to 14:30)`: its marker, its time and the
// source range it may end with, as the ledger, the memory message, the Observer's and Reflector's replies, the /notes
// pane and `#` recall write and read it. The prompts describe it in words (prompts.ts). No `$` here: the engine never
// lets it cross an import.
import { MARKERS } from './prompts'

// The first and last times of the transcript rows an observation was drawn from: bounds om_recall takes, which
// stay true as the live context shifts. Absent when no row was timed, or the memory it came from had none: unknown.
export type Source = { from: number; to: number }

const pad = (n: number) => String(n).padStart(2, '0')
export const stamp = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
// A local time that exists as written, or undefined (a 25:00, a Feb 30, a clock skipped at a DST change).
export function realTime(y: number, mo: number, d: number, h: number, mi: number) {
  const date = new Date(y, mo - 1, d, h, mi)
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d && date.getHours() === h && date.getMinutes() === mi
    ? date.getTime()
    : undefined
}
export function unstamp(text: string) {
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/)
  return m ? realTime(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])) : undefined
}

// A line as the ledger keeps it: its marker, then its time when it has one, then its text.
export const renderLine = (marker: string, at: number | undefined, text: string) => (at === undefined ? `${marker} ${text}` : `${marker} ${stamp(at)} ${text}`)
// A line's time as written, or undefined.
export const timeOf = (line: string) => line.match(/^\S+ (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) /)?.[1]
// A timed line's marker, day, time and text, for the /notes pane: a line without them all does not match.
export const TIMED_LINE = /^(\S+)\s+(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\s+([\s\S]*)$/
// A line's marker, time and text as they read, each taken only where it is.
export function partsOf(line: string) {
  let rest = line.trim()
  const marker = MARKERS.find((m) => rest.startsWith(m))
  if (marker) rest = rest.slice(marker.length).trim()
  const time = rest.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})(?:\s+|$)/)?.[1]
  if (time) rest = rest.slice(time.length).trim()
  return { marker, time, text: rest }
}

// A line's source, rendered after it: both ends as om_recall's `from` and `to` take them, an end on `day` without its date.
export const SOURCE_TRAILER = /\s*\(source:? ([^()]*)\)$/
const dayless = (at: number, day: string) => (day && stamp(at).startsWith(`${day} `) ? stamp(at).slice(day.length + 1) : stamp(at))
export const renderSource = (s: Source, day = '') => `(source ${dayless(s.from, day)} to ${dayless(s.to, day)})`

// A line and the source range it ends with. A trailer that is not a range of times is part of the line; a range
// that runs backwards is cut off and gives no source.
export function splitSource(text: string): { line: string; source?: Source } {
  const m = text.match(SOURCE_TRAILER)
  if (!m) return { line: text }
  const [a, b = a] = m[1]!.split(' to ').map((t) => unstamp(t.trim()))
  if (a === undefined || b === undefined) return { line: text }
  const line = text.slice(0, m.index).trimEnd()
  return b < a ? { line } : { line, source: { from: a, to: b } }
}
