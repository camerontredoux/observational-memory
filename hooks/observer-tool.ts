// The Observer's one tool, record_observations: a pi extension, loaded into the Observer's `pi -p` run with `-e` (see
// observerArgv in register.ts), and the pure checks behind it, which register.ts and the tests import. Nothing here
// imports: pi loads this file alone through jiti, and the engine loads it as a plain module.
//
// Each call is checked whole against the chunk in the run's prompt. A call with any fault records nothing and fails
// with every fault named, so the Observer fixes them and calls again; a call without one records its lines, drops
// the exact duplicates of lines already recorded, and answers with a coverage receipt. The lines each accepted call
// added travel back to the hook in the tool result's `details`, which pi's `--mode json` prints as the
// `tool_execution_end` event. A call with `done: true` ends the run with no further model turn.

export const OBSERVER_TOOL = 'record_observations'

const PRIORITIES = ['🔴', '🟡', '🟢', '✅']
const TIME = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/
const FIELDS = [
  ['active', 'Active'],
  ['completed', 'Completed'],
  ['next_steps', 'Next steps'],
  ['told_the_user', 'Told the user'],
  ['blocked', 'Blocked'],
  ['waiting_for_user', 'Waiting for user'],
] as const

const text = (description: string) => ({ type: 'string', minLength: 1, description })
const timestamp = {
  type: 'string',
  pattern: TIME.source,
  description: 'The "YYYY-MM-DD HH:MM" of the block it comes from, copied exactly. Leave it out when that block has no time.',
}
const quote = text("The user's own words, copied word for word from one [User] block of the chunk, without the surrounding double quotes.")

// The tool's input, as JSON Schema: pi checks a call against it before the tool runs. `record` checks it all again.
export const OBSERVER_TOOL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    observations: {
      type: 'array',
      description: 'New observations, in the order of the blocks they come from.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['priority', 'text'],
        properties: {
          priority: { type: 'string', enum: PRIORITIES, description: 'The priority marker.' },
          timestamp,
          text: text('One observation as one line of plain prose: no marker, timestamp, source range, markdown or tags.'),
        },
      },
    },
    corrections: {
      type: 'array',
      description: "The user's decisions and constraints in the chunk, each quoted verbatim. Always 🔴.",
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quote'],
        properties: {
          timestamp,
          quote,
          replaces: { type: 'string', pattern: '^k[0-9a-f]+$', description: 'The id of the listed constraint in force this one reverses or changes.' },
          replaces_earlier: {
            type: 'object',
            additionalProperties: false,
            required: ['quote'],
            description: 'A constraint the user set earlier in this chunk and reverses here, which is then not recorded apart.',
            properties: { timestamp, quote },
          },
        },
      },
    },
    continuation: {
      type: 'object',
      additionalProperties: false,
      description: 'Where the work stands at the end of the chunk. Each field one line; leave out a field with nothing in it. A later call replaces it.',
      properties: Object.fromEntries(FIELDS.map(([key, name]) => [key, text(`${name}: as your instructions describe it.`)])),
    },
    done: { type: 'boolean', description: 'true on your last call: the chunk is fully recorded, and the run ends.' },
  },
}

export const OBSERVER_TOOL_DESCRIPTION =
  "Record the chunk's observations, the user's corrections and the continuation record. Put everything in one call " +
  'with done: true when you can; a long chunk may take several calls, each adding to the ones before, the last with ' +
  'done: true. A rejected call records nothing: fix what the error names and call again.'

// What an accepted call added, as the lines the memory holds: `<marker> [YYYY-MM-DD HH:MM ]<text>`, each correction
// `🔴 [time ]User: "<quote>"` with its note of what it replaces, and the continuation record's fields, one a line.
export type Recorded = { observations: string[]; corrections: string[]; continuation?: string; done: boolean }

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()
const realTime = (t: string) => {
  const m = t.match(TIME)
  if (!m) return false
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number]
  const date = new Date(y, mo - 1, d, h, mi)
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d && date.getHours() === h && date.getMinutes() === mi
}
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// The chunk of an Observer prompt as register.ts writes it: its blocks' times, its [User] blocks' words (whitespace
// run together) and the ids of the constraints listed after it.
function chunkOf(prompt: string) {
  const begin = prompt.indexOf('\n', prompt.indexOf('===== BEGIN CHUNK'))
  const end = prompt.lastIndexOf('\n===== END CHUNK =====')
  const chunk = begin >= 0 && end > begin ? prompt.slice(begin + 1, end) : ''
  const heads = [...chunk.matchAll(/^\[([^\]\n@]+?)(?: @ (\d{4}-\d{2}-\d{2} \d{2}:\d{2}))?\]: /gm)]
  const users = heads.flatMap((h, i) => (h[1] === 'User' ? [oneLine(chunk.slice(h.index! + h[0].length, heads[i + 1]?.index ?? chunk.length))] : []))
  const times = heads.map((h) => h[2]).filter((t): t is string => t !== undefined)
  const constraints = prompt.match(/===== BEGIN CONSTRAINTS[^\n]*\n([\s\S]*?)\n===== END CONSTRAINTS =====/)?.[1] ?? ''
  return {
    users,
    times: [...times].sort(),
    allTimed: heads.length > 0 && times.length === heads.length,
    ids: new Set([...constraints.matchAll(/^\[(k[0-9a-f]+)\] /gm)].map((m) => m[1]!)),
  }
}

// The tool for one run, over the prompt that holds its chunk. `record` throws an Error that names every fault of a
// rejected call; an accepted one answers the receipt the Observer reads and the lines it added.
export function recorder(prompt: string) {
  const chunk = chunkOf(prompt)
  const first = chunk.times[0]
  const last = chunk.times.at(-1)
  const seen = new Set<string>()
  const total = { observations: 0, corrections: 0 }
  let latest: string | undefined
  let continued = false

  return (args: unknown): { receipt: string; recorded: Recorded } => {
    const faults: string[] = []
    const fault = (at: string, what: string) => faults.push(`${at} ${what}`)
    const input = isObject(args) ? args : (fault('the call', 'is not an object'), {})
    const list = (key: string) => {
      const v = input[key]
      if (v === undefined) return []
      if (Array.isArray(v)) return v
      return fault(key, 'is not a list'), []
    }
    const stamp = (at: string, v: unknown) => {
      if (v === undefined) {
        if (chunk.allTimed) fault(at, `is missing: every block of the chunk has a time (${first} to ${last})`)
        return ''
      }
      if (typeof v !== 'string' || !realTime(v)) return fault(at, `${JSON.stringify(v)} is not a real time as YYYY-MM-DD HH:MM`), ''
      if (!first || !last) return '' // the chunk shows no time: none is kept
      if (v < first || v > last) return fault(at, `${v} is outside the chunk's times, ${first} to ${last}`), ''
      return `${v} `
    }
    const words = (at: string, v: unknown) => {
      const s = typeof v === 'string' ? oneLine(v) : ''
      if (!s) fault(at, 'is missing or empty')
      return s
    }
    const said = (at: string, v: unknown) => {
      const s = words(at, v).replace(/^"(.*)"$/, '$1')
      if (s && !chunk.users.some((u) => u.includes(s)))
        fault(at, `${JSON.stringify(s.slice(0, 120))} is not copied word for word from a [User] block of the chunk: quote the user's own words exactly, or record it as an observation instead`)
      return s
    }

    const observations = list('observations').map((o, i) => {
      const at = `observations[${i}]`
      if (!isObject(o)) return fault(at, 'is not an object'), ''
      const marker = o.priority
      if (typeof marker !== 'string' || !PRIORITIES.includes(marker)) fault(`${at}.priority`, `${JSON.stringify(marker)} is not one of ${PRIORITIES.join(' ')}`)
      const time = stamp(`${at}.timestamp`, o.timestamp)
      const body = words(`${at}.text`, o.text)
      if (PRIORITIES.some((p) => body.startsWith(p)) || /^\(?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(body))
        fault(`${at}.text`, 'begins with a marker or a time: give those in priority and timestamp, and the observation alone in text')
      return `${marker} ${time}${body}`
    })
    const corrections = list('corrections').map((c, i) => {
      const at = `corrections[${i}]`
      if (!isObject(c)) return fault(at, 'is not an object'), ''
      const time = stamp(`${at}.timestamp`, c.timestamp)
      const line = `🔴 ${time}User: "${said(`${at}.quote`, c.quote)}"`
      if (c.replaces !== undefined && c.replaces_earlier !== undefined) fault(at, 'gives both replaces and replaces_earlier: a correction replaces a listed constraint or an earlier one in the chunk')
      if (c.replaces !== undefined) {
        if (typeof c.replaces !== 'string' || !chunk.ids.has(c.replaces))
          fault(`${at}.replaces`, `${JSON.stringify(c.replaces)} is not the id of a listed constraint${chunk.ids.size ? ` (${[...chunk.ids].join(', ')})` : ': none is listed'}`)
        return `${line} (replaces ${c.replaces})`
      }
      const earlier = c.replaces_earlier
      if (earlier === undefined) return line
      if (!isObject(earlier)) return fault(`${at}.replaces_earlier`, 'is not an object'), line
      const was = `${stamp(`${at}.replaces_earlier.timestamp`, earlier.timestamp)}User: "${said(`${at}.replaces_earlier.quote`, earlier.quote)}"`
      return `${line} (this replaces the earlier constraint ${was})`
    })
    let continuation: string | undefined
    if (input.continuation !== undefined) {
      const c = input.continuation
      if (!isObject(c)) fault('continuation', 'is not an object')
      else {
        for (const key of Object.keys(c)) if (!FIELDS.some(([k]) => k === key)) fault(`continuation.${key}`, `is not a field: ${FIELDS.map(([k]) => k).join(', ')}`)
        continuation = FIELDS.flatMap(([key, name]) => (c[key] === undefined ? [] : [`${name}: ${words(`continuation.${key}`, c[key])}`])).join('\n') || undefined
      }
    }
    for (const key of Object.keys(input)) if (!['observations', 'corrections', 'continuation', 'done'].includes(key)) fault(key, 'is not a field of this tool')
    if (input.done !== undefined && typeof input.done !== 'boolean') fault('done', 'is not true or false')
    if (faults.length) throw new Error(`Rejected: nothing from this call was recorded. Fix each of these and call ${OBSERVER_TOOL} again:\n- ${faults.join('\n- ')}`)

    const fresh = (lines: string[]) => lines.filter((l) => !seen.has(l) && (seen.add(l), true))
    const recorded: Recorded = { observations: fresh(observations), corrections: fresh(corrections), done: input.done === true }
    if (continuation) (recorded.continuation = continuation), (continued = true)
    const dropped = observations.length + corrections.length - recorded.observations.length - recorded.corrections.length
    total.observations += recorded.observations.length
    total.corrections += recorded.corrections.length
    for (const l of [...recorded.observations, ...recorded.corrections]) {
      const t = l.match(/^\S+ (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) /)?.[1]
      if (t && (!latest || t > latest)) latest = t
    }
    const n = (k: number, what: string) => `${k} ${what}${k === 1 ? '' : 's'}`
    const receipt = [
      `Recorded ${n(recorded.observations.length, 'observation')} and ${n(recorded.corrections.length, 'correction')}` +
        `${dropped ? ` (${n(dropped, 'exact duplicate')} of lines already recorded dropped)` : ''}.`,
      `So far: ${n(total.observations, 'observation')}, ${n(total.corrections, 'correction')}, ${continued ? 'a continuation record' : 'no continuation record'}.`,
      ...(first ? [`What you recorded reaches ${latest ?? 'no time yet'}; the chunk's blocks run from ${first} to ${last}.`] : []),
      recorded.done
        ? 'Done: the run ends here.'
        : `If the chunk holds events not yet recorded, call ${OBSERVER_TOOL} again with them; when all of it is recorded, call it with done: true (and the continuation record, if not given yet).`,
    ].join(' ')
    return { receipt, recorded }
  }
}

// pi's side, as much of its extension API as this uses.
type Pi = {
  on(event: 'before_agent_start', handler: (event: { prompt: string }) => void): void
  registerTool(tool: {
    name: string
    label: string
    description: string
    parameters: unknown
    execute(id: string, params: unknown): Promise<{ content: { type: 'text'; text: string }[]; details: Recorded; terminate?: boolean }>
  }): void
}

export default function (pi: Pi) {
  let record: ReturnType<typeof recorder> | undefined
  pi.on('before_agent_start', (event) => void (record = recorder(event.prompt)))
  pi.registerTool({
    name: OBSERVER_TOOL,
    label: 'Record observations',
    description: OBSERVER_TOOL_DESCRIPTION,
    parameters: OBSERVER_TOOL_SCHEMA,
    async execute(_id, params) {
      if (!record) throw new Error(`${OBSERVER_TOOL} saw no chunk to check the call against`)
      const { receipt, recorded } = record(params)
      return { content: [{ type: 'text', text: receipt }], details: recorded, ...(recorded.done ? { terminate: true } : {}) }
    },
  })
}
