// The Observer's and Reflector's replies as structured output: the JSON schemas Ember answers to (strict, so a reply
// always parses and always has its fields), and each reply read into the lines the rest of the plugin keeps: the
// ledger, the memory message and recall all hold lines such as "🟡 2026-09-23 14:30 User asked …".

// A strict schema lists every property as required and allows no others; an optional value is a null.
const nullable = (type: string) => ({ type: [type, 'null'] })
const object = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })

const TIME = { ...nullable('string'), description: 'The "YYYY-MM-DD HH:MM" of the block it comes from, copied exactly; null when that block has none' }
const PRIORITY = { type: 'string', enum: ['🟡', '🟢', '✅'] }

export const OBSERVER_FORMAT = {
  type: 'json_schema',
  name: 'observer_reply',
  strict: true,
  schema: object({
    corrections: {
      type: 'array',
      items: object({
        time: TIME,
        quote: { type: 'string', description: "The user's own words, copied word for word from a [User] block" },
        replaces: { ...nullable('string'), description: 'The id of the listed constraint it replaces, such as k3fa2c1d0; null when it replaces none' },
        replaces_earlier: {
          ...nullable('string'),
          description: 'The constraint set earlier in the same chunk that it reverses, as YYYY-MM-DD HH:MM User: "<their words>"; null when none',
        },
      }),
    },
    observations: { type: 'array', items: object({ priority: PRIORITY, time: TIME, text: { type: 'string' } }) },
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
        time: TIME,
        text: { type: 'string' },
        source: { ...nullable('string'), description: 'The source range, as "YYYY-MM-DD HH:MM to YYYY-MM-DD HH:MM"; null when the lines it condenses have none' },
      }),
    },
  }),
} as const

export type Format = typeof OBSERVER_FORMAT | typeof REFLECTOR_FORMAT

type Observation = { priority: string; time: string | null; text: string; source?: string | null }
type Correction = { time: string | null; quote: string; replaces: string | null; replaces_earlier: string | null }
type Continuation = Record<(typeof FIELDS)[number][0], string | null>
const FIELDS = [
  ['active', 'Active'],
  ['completed', 'Completed'],
  ['next_steps', 'Next steps'],
  ['told_the_user', 'Told the user'],
  ['blocked', 'Blocked'],
  ['waiting_for_user', 'Waiting for user'],
] as const

// One line of text: a reply's string may hold a newline, which would start a line of its own.
const flat = (text: string) => text.replace(/\s*\n\s*/g, ' ').trim()
const timed = (time: string | null | undefined, text: string) => `${time?.trim() ? `${time.trim()} ` : ''}${flat(text)}`
const lineOf = (o: Observation) => `${o.priority} ${timed(o.time, o.text)}${o.source?.trim() ? ` (source ${flat(o.source)})` : ''}`

function parsed(text: string): Record<string, unknown> {
  try {
    const value = JSON.parse(text) as unknown
    if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  } catch {}
  throw new Error(`Ember reply was not the JSON its schema asks for: ${JSON.stringify(text.slice(0, 80))}`)
}
const list = <T>(value: unknown) => (Array.isArray(value) ? (value as T[]) : [])

export type ObserverReply = { corrections: string[]; observations: string[]; continuation?: string }

// The Observer's reply as lines: each correction as a 🔴 line quoting the user, with what it replaces; each
// observation; and where the work stands as its record, one "Name: value" line per field (none when null or empty).
export function readObserverReply(text: string): ObserverReply {
  const reply = parsed(text)
  const corrections = list<Correction>(reply.corrections).map(
    (c) =>
      `🔴 ${timed(c.time, `User: "${flat(c.quote)}"`)}` +
      (c.replaces?.trim() ? ` (replaces ${c.replaces.trim()})` : c.replaces_earlier?.trim() ? ` (this replaces the earlier constraint ${flat(c.replaces_earlier)})` : ''),
  )
  const state = reply.continuation as Continuation | null | undefined
  const fields = state ? FIELDS.flatMap(([key, name]) => (state[key]?.trim() ? [`${name}: ${flat(state[key]!)}`] : [])) : []
  return { corrections, observations: list<Observation>(reply.observations).map(lineOf), ...(fields.length ? { continuation: fields.join('\n') } : {}) }
}

// The Reflector's reply as lines, each with its source range when it has one.
export const readReflectorReply = (text: string) => list<Observation>(parsed(text).observations).map(lineOf)
