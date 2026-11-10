// The Observer's and Reflector's replies as structured output: the JSON schemas Ember answers to (strict, so a reply
// always parses and always has its fields), each reply read as its fields, and those fields rendered into what the
// rest of the plugin keeps: the ledger, the memory message and recall all hold lines such as
// "🟡 2026-09-23 14:30 User asked …", and the continuation record as "Name: value" lines.
import type { Bounds } from './memory'
import { rangeOf, renderLine, splitSource, unstamp } from './lines'
import type { Source } from './lines'

// A strict schema lists every property as required and allows no others; an optional value is a null.
const nullable = (type: string) => ({ type: [type, 'null'] })
const object = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })

const time = (of: string) => ({ ...nullable('string'), description: `The "YYYY-MM-DD HH:MM" of ${of}, copied exactly; null when it has none` })
// 🔴 is left out: the user's constraints come only through the Observer's corrections.
const PRIORITY = { type: 'string', enum: ['🟡', '🟢', '✅'] }

export const OBSERVER_FORMAT = {
  type: 'json_schema',
  name: 'observer_reply',
  strict: true,
  schema: object({
    corrections: {
      type: 'array',
      items: object({
        time: time('the [User] block it quotes'),
        quote: { type: 'string', description: "The user's own words, copied word for word from a [User] block" },
        replaces: {
          ...nullable('string'),
          pattern: '^k[0-9a-f]{1,8}$',
          description: 'The id of the listed constraint it replaces, such as k3fa2c1d0; null when it replaces none',
        },
        replaces_earlier: {
          ...nullable('string'),
          description: 'The constraint set earlier in the same chunk that it reverses, as YYYY-MM-DD HH:MM User: "<their words>"; null when none',
        },
      }),
    },
    observations: { type: 'array', items: object({ priority: PRIORITY, time: time('the block it comes from'), text: { type: 'string' } }) },
    continuation: {
      anyOf: [
        object({
          active: nullable('string'),
          completed: nullable('string'),
          next_steps: nullable('string'),
          told_the_user: { ...nullable('string'), description: 'What the assistant last reported, answered or promised to the user; null only when it has said nothing to the user' },
          blocked: nullable('string'),
          waiting_for_user: nullable('string'),
        }),
        { type: 'null' },
      ],
    },
  }),
} as const

export const REFLECTOR_FORMAT = {
  type: 'json_schema',
  name: 'reflector_reply',
  strict: true,
  schema: object({
    observations: {
      type: 'array',
      items: object({
        priority: PRIORITY,
        time: time('the latest line it condenses'),
        text: { type: 'string' },
        source: { ...nullable('string'), description: 'The source range, as "YYYY-MM-DD HH:MM to YYYY-MM-DD HH:MM"; null when the lines it condenses have none' },
      }),
    },
  }),
} as const

export type Format = typeof OBSERVER_FORMAT | typeof REFLECTOR_FORMAT

export type Observation = { priority: string; time: string | null; text: string; source?: string | null }
export type Correction = { time: string | null; quote: string; replaces: string | null; replaces_earlier: string | null }
// The continuation record's fields: each reply key, and its name in the record the ledger and memory message keep.
export const RECORD_FIELDS = [
  ['active', 'Active'],
  ['completed', 'Completed'],
  ['next_steps', 'Next steps'],
  ['told_the_user', 'Told the user'],
  ['blocked', 'Blocked'],
  ['waiting_for_user', 'Waiting for user'],
] as const
export type Continuation = Record<(typeof RECORD_FIELDS)[number][0], string | null>

function parsed(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text) as unknown
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  } catch {}
  throw new Error(`Ember reply was not the JSON its schema asks for: ${JSON.stringify(text.slice(0, 80))}`)
}
const list = <T>(value: unknown) => (Array.isArray(value) ? (value as T[]) : [])

export type ObserverReply = { corrections: Correction[]; observations: Observation[]; continuation: Continuation | null }
export function readObserverReply(text: string): ObserverReply {
  const reply = parsed(text)
  return { corrections: list(reply.corrections), observations: list(reply.observations), continuation: (reply.continuation as Continuation | null | undefined) ?? null }
}
export const readReflectorReply = (text: string) => list<Observation>(parsed(text).observations)

// One line of text: a reply's string may hold a newline, which would start a line of its own.
export const flat = (text: string) => text.replace(/\s*\n\s*/g, ' ').trim()
// A reply's time as its line keeps it. With `bounds`, a real time clamped into them, and the latest for none; without,
// none, or with `unbounded` a real time as given.
export function timeIn(given: string | null | undefined, bounds: Bounds, unbounded = false) {
  const at = given ? unstamp(given.trim()) : undefined
  if (!bounds) return unbounded ? at : undefined
  return Math.min(Math.max(at ?? bounds.latest, bounds.lo), bounds.hi)
}
// An observation as its line: marker, time and text. The text without a source range it ends with: the range is
// added from the transcript itself.
export const observationLine = (o: Observation, bounds: Bounds, unbounded = false) =>
  renderLine(o.priority, timeIn(o.time, bounds, unbounded), splitSource(flat(o.text)).line)
// The Reflector's source range, or none when it gives no range of times.
export const sourceIn = (o: Observation): Source | undefined => (o.source?.trim() ? (rangeOf(flat(o.source)) ?? undefined) : undefined)
// A correction as its 🔴 line, quoting the user, with what it replaces.
export const correctionLine = (c: Correction, bounds: Bounds) =>
  renderLine('🔴', timeIn(c.time, bounds), `User: "${flat(c.quote)}"`) +
  (c.replaces?.trim() ? ` (replaces ${c.replaces.trim()})` : c.replaces_earlier?.trim() ? ` (this replaces the earlier constraint ${flat(c.replaces_earlier)})` : '')

// Where the work stands, as the record keeps it: one "Name: value" line per field that has a value. A record with
// none is no record: the one before stands.
export function recordOf(state: Continuation | null) {
  const fields = state ? RECORD_FIELDS.flatMap(([key, name]) => (state[key]?.trim() ? [`${name}: ${flat(state[key]!)}`] : [])) : []
  return fields.length ? fields.join('\n') : undefined
}
