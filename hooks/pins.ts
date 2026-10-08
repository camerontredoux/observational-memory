// Pinned lines (the user's constraints in force, and 🔴 observations) bounded to a token cap by shortening the oldest
// to index lines. Free of `$`, so register.ts and the tests import it.
import type { SessionMessage } from 'claude-code'
import { baseOf } from './memory'

// A pinned line (a constraint, or a 🔴 observation) past its tier's cap, as an index line: its time, first words and
// the om_recall query that finds its whole text. The ledger keeps the whole line; only the rendering shortens.
const SHORTENED = /\(older (?:constraint|🔴 line), shortened: om_recall "/
const PIN_WORDS = 10
function shortenPin(line: string, what: 'constraint' | '🔴 line') {
  if (SHORTENED.test(line)) return line
  const m = /^(🔴\s*(?:\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s+)?)(.*)$/s.exec(baseOf(line))!
  const [, head, body] = m as unknown as [string, string, string]
  const quote = /^(User:\s*)"((?:[^"\\]|\\.)*)"?/.exec(body)
  const words = (quote ? quote[2]! : body).split(/(?:\s|\\n)+/).filter(Boolean)
  const lead = words.slice(0, PIN_WORDS).join(' ').replace(/\\?"/g, "'")
  const more = words.length > PIN_WORDS ? '…' : ''
  const shown = quote ? `${quote[1]}"${lead}${more}"` : `${lead}${more}`
  return `${head}${shown} (older ${what}, shortened: om_recall "${lead.split(' ').slice(0, 6).join(' ')}")`
}
// Whole terms a pinned line shares with the work in view: paths, identifiers and long words.
const pinTerms = (line: string) => new Set((baseOf(line).toLowerCase().match(/[a-z_][\w./-]{5,}/g) ?? []).filter((t) => !/^(?:should|always|before|instead|because|without|please|there|their|which|about|would|could)$/.test(t)))
// A row's text and its tool calls' inputs, where the work in view names things.
export const rowTerms = (m: SessionMessage) => [m.text, ...m.toolUses.map((u) => JSON.stringify(u.input ?? ''))].join('\n')
const referenced = (line: string, inView: string) => [...pinTerms(line)].filter((t) => inView.includes(t)).length >= 2
/**
 * The pinned lines rendered within `maxTokens` (as `measure` counts them): whole while they fit; past that, every line
 * starts as an index line (shortenPin), and lines go back to whole while they fit, those the work in view still names
 * first, then the newest. Over the cap even as index lines, every line stays, shortened: nothing is dropped.
 */
export function boundPins(lines: readonly string[], maxTokens: number, inView: string, what: 'constraint' | '🔴 line', measure: (l: readonly string[]) => number) {
  if (measure(lines) <= maxTokens) return [...lines]
  // A line no longer than its index line stays whole.
  const shorter = (l: string, s = shortenPin(l, what)) => (s.length < l.length ? s : l)
  const out = lines.map((l) => shorter(l))
  const view = inView.toLowerCase()
  const order = lines.map((_, i) => i).reverse()
  const byUse = [...order.filter((i) => referenced(lines[i]!, view)), ...order.filter((i) => !referenced(lines[i]!, view))]
  for (const i of byUse) {
    const whole = out.with(i, lines[i]!)
    if (measure(whole) <= maxTokens) out[i] = lines[i]!
  }
  return out
}
