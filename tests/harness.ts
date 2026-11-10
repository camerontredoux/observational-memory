// Helpers the test files share: a session world, the Ember stub, transcripts and the memory message's parts.
import { describe, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { HttpResponse, On, ProcessRunResult, SessionMessage } from 'claude-code'
import { SESSION_SYSTEM_PROMPT } from '../hooks/prompts'
import { OBSERVER_FORMAT, REFLECTOR_FORMAT } from '../hooks/reply'
import { originalId } from '../hooks/recall'
import type { RecallIo } from '../hooks/recall'
import { register as recallOnly } from './eval/recall-plugin/hooks/register'

// A compaction's kept rows under their calls' original ids: it hands them back under fresh ones (freshToolIds).
export const originals = (rows: readonly SessionMessage[] | undefined) =>
  rows?.map((m) => ({
    ...m,
    toolUses: m.toolUses.map((u) => ({ ...u, tool_use_id: originalId(u.tool_use_id) })),
    ...(m.toolResults ? { toolResults: m.toolResults.map((r) => ({ ...r, tool_use_id: originalId(r.tool_use_id) })) } : {}),
  }))

// One turn: the prompt, a Read call, its result of `size` characters (size / 4 tokens) and the answer.
export const turn = (prompt: string, reply: string, size = 0): SessionMessage[] => [
  { role: 'user', text: prompt, toolUses: [] },
  { role: 'assistant', text: reply, toolUses: [{ tool_use_id: `t-${prompt}`, tool: 'Read', input: { file_path: `/src/${prompt}.ts` } }] },
  { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: `t-${prompt}`, text: 'x'.repeat(size), isError: false }] },
  { role: 'assistant', text: `${reply} done`, toolUses: [] },
]

export const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
export const EMBER_URL = 'https://api.meta.ai/v1/responses'
export const EMBER_KEY_PATH = '/home/u/.config/observational-memory/muse-api-key'
export const EMBER_USAGE = { input_tokens: 12278, input_tokens_details: { cached_tokens: 3072 }, output_tokens: 558, output_tokens_details: { reasoning_tokens: 31 }, total_tokens: 12836 }
// What Ember's Responses API answers for one completed reply (as a live muse-ember-1.0 response, abridged).
export function emberResponse(text: string, end: { status?: string; incomplete_details?: { reason: string } } = {}): HttpResponse {
  const body = {
    id: 'resp_1',
    object: 'response',
    model: 'muse-ember-1.0',
    status: 'completed',
    incomplete_details: null,
    error: null,
    output: [
      { type: 'reasoning', id: 'rs_1', summary: [], status: 'completed' },
      { type: 'message', id: 'msg_1', role: 'assistant', content: [{ type: 'output_text', text, annotations: [], logprobs: [] }], status: 'completed' },
    ],
    usage: EMBER_USAGE,
    ...end,
  }
  return { status: 200, ok: true, headers: { 'content-type': 'application/json' }, text: JSON.stringify(body) }
}
// Where `value` breaks the strict JSON schema `schema` (the subset reply.ts uses), or undefined: Ember's strict mode
// never answers outside its schema, so a test reply that does could not happen.
function breaks(value: unknown, schema: Record<string, any>, at = 'reply'): string | undefined {
  if (schema.anyOf) return (schema.anyOf as Record<string, any>[]).every((s) => breaks(value, s, at)) ? `${at} matches no anyOf branch` : undefined
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  if (![schema.type].flat().includes(type)) return `${at} is ${type}, not ${schema.type}`
  if (schema.enum && !schema.enum.includes(value)) return `${at} is ${JSON.stringify(value)}, not one of ${schema.enum.join(' ')}`
  if (schema.pattern && type === 'string' && !new RegExp(schema.pattern).test(value as string)) return `${at} ${JSON.stringify(value)} breaks ${schema.pattern}`
  if (type === 'array') for (const [i, item] of (value as unknown[]).entries()) {
    const broken = breaks(item, schema.items, `${at}[${i}]`)
    if (broken) return broken
  }
  if (type === 'object') {
    const fields = value as Record<string, unknown>
    for (const k of Object.keys(fields)) if (!(k in schema.properties)) return `${at}.${k} is not in the schema`
    for (const k of schema.required as string[]) {
      if (!(k in fields)) return `${at}.${k} is missing`
      const broken = breaks(fields[k], schema.properties[k], `${at}.${k}`)
      if (broken) return broken
    }
  }
  return undefined
}
const SCHEMAS: Record<string, Record<string, any>> = { [OBSERVER_FORMAT.name]: OBSERVER_FORMAT.schema, [REFLECTOR_FORMAT.name]: REFLECTOR_FORMAT.schema }

// A test's reply written in the line format the plugin renders, as the JSON Ember answers to the request's schema
// (`observer_reply` or `reflector_reply`), so tests read as the memory they make. A section's unmarked line joins the
// line before. A reply with no section tag and no marked line stays as written: text that is not JSON, as a broken
// reply would be. One already JSON is sent as it is. JSON that breaks the schema (a 🔴 observation, a `replaces` that
// is no id) throws: the test asks for a reply Ember cannot give.
export function structured(text: string, schema: string | undefined) {
  const json = asJson(text, schema)
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return json // a broken reply, as the test means it
  }
  const broken = schema && breaks(value, SCHEMAS[schema]!)
  if (broken) throw new Error(`a test reply Ember cannot give: ${broken}`)
  return json
}
const SECTION = /^[ \t]*<(\/?)(observations|corrections|continuation|current-task)>[ \t]*$/i
const MARKED = /^[ \t]*(?:[-*][ \t]*)?(🔴|🟡|🟢|✅)[ \t]*(\d{4}-\d\d-\d\d \d\d:\d\d)?[ \t]*(.*)$/u
const STATE_FIELDS: Record<string, string> = { active: 'active', completed: 'completed', 'next steps': 'next_steps', 'told the user': 'told_the_user', blocked: 'blocked', 'waiting for user': 'waiting_for_user' }
function asJson(text: string, schema: string | undefined) {
  if (!schema || text.trimStart().startsWith('{')) return text
  const by: Record<string, string[]> = {}
  let at = ''
  for (const line of text.split('\n')) {
    const t = line.match(SECTION)
    if (t) at = t[1] ? '' : t[2]!.toLowerCase()
    else if (line.trim()) (by[at] ??= []).push(line)
  }
  const tagged = SECTION.test(text) || text.split('\n').some((l) => SECTION.test(l))
  const marked = (lines: string[] = []) => {
    const out: { priority: string; time: string | null; text: string }[] = []
    for (const line of lines) {
      const m = line.match(MARKED)
      if (m) out.push({ priority: m[1]!, time: m[2] ?? null, text: m[3]!.trim() })
      else if (out.length) out.at(-1)!.text += ` ${line.trim()}`
      else out.push({ priority: '', time: null, text: line.trim() }) // an unmarked first line, as Ember never writes
    }
    return out
  }
  const observations = marked(by.observations ?? (by.observations === undefined && !text.match(/<observations>/i) ? by[''] : []))
  if (!tagged && !observations.some((o) => o.priority)) return text
  if (schema === 'reflector_reply')
    return JSON.stringify({
      observations: observations.map(({ text, ...o }) => {
        const m = text.match(/^(.*?)\s*\(source ([^)]*)\)$/)
        return { ...o, text: m ? m[1]! : text, source: m ? m[2]! : null }
      }),
    })
  const corrections = marked(by.corrections).map((c) => {
    const m = c.text.match(/^User:\s*"(.*)"\s*(?:\(replaces (\S+?)\)|\(this replaces the earlier constraint (.*)\))?$/)
    return { time: c.time, quote: m ? m[1]! : c.text, replaces: m?.[2] ?? null, replaces_earlier: m?.[3] ?? null }
  })
  const state = by.continuation ?? by['current-task']
  let continuation: Record<string, string | null> | null = null
  if (state) {
    continuation = Object.fromEntries(Object.values(STATE_FIELDS).map((k) => [k, null]))
    let last = 'active'
    for (const line of state) {
      const m = line.match(/^[ \t]*(?:[-*][ \t]+)?(active|completed|blocked|waiting for user|next steps|told the user)[ \t]*:(.*)$/i)
      if (m) continuation[(last = STATE_FIELDS[m[1]!.toLowerCase()]!)] = m[2]!.trim()
      else continuation[last] = `${continuation[last] ?? ''} ${line.trim()}`.trim()
    }
  }
  return JSON.stringify({ corrections, observations, continuation })
}

// An error reply from the API, as it answers one: `{ error: { code, message, type } }`.
export const httpError = (status: number, code: string): HttpResponse => ({
  status,
  ok: false,
  headers: { 'content-type': 'application/json' },
  text: JSON.stringify({ error: { code, message: code, param: null, type: 'server_error' } }),
})
export const COMPOSER = { origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 80 } }
export const CHUNK = 40_000 // characters of tool result that make one turn a whole 10k-token chunk
export const TOOL_RESULT_MAX_CHARS = 5_000 * 4 // TOOL_RESULT_MAX_TOKENS * 4 in hooks/register.ts

// Local time on a day of September 2026.
export const at = (day: number, hour: number, minute: number) => new Date(2026, 8, day, hour, minute).getTime()

// The main conversation's history, grown as the engine would, each listed subagent's under `agents` (any other id
// is denied), a store the test can read, and a context size. `holdGet` delays a store read's answer, read before the
// hold, so it can be out of date when it arrives; `holdList` delays the listing of agents the same way.
export function world(
  on: On,
  options: {
    failWrites?: boolean
    unreadable?: string[]
    teammates?: string[]
    holdGet?: (key: string) => Promise<void> | undefined
    holdList?: () => Promise<void> | undefined
    env?: Record<string, string>
    rowsCap?: number
  } = {},
) {
  on('session.id', () => ({ value: 'session-1' }))
  const history: SessionMessage[] = []
  const agents: Record<string, SessionMessage[]> = {}
  const main = () => (options.rowsCap && history.length > options.rowsCap ? history.slice(-options.rowsCap) : history)
  const asked = { main: 0 } // how often the main conversation's history was read
  on('session.messages', ($, e) => ({ value: e.agentId === undefined ? (asked.main++, main()) : (agents[e.agentId] ?? { deny: `no agent ${e.agentId} in this session` }) }))
  const listed = () => [...Object.keys(agents), ...(options.unreadable ?? [])]
  const type = (id: string) => (options.teammates?.includes(id) ? 'teammate' : 'general-purpose')
  on('agent.list', async () => {
    const value = listed().map((id) => ({ id, description: id, type: type(id), status: 'running' as const }))
    await options.holdList?.()
    return { value }
  })
  const stored: Record<string, unknown> = {}
  on('store.keys', () => ({ value: Object.keys(stored) }))
  on('store.get', async ($, e) => {
    const value = stored[e.key] === undefined ? undefined : JSON.parse(JSON.stringify(stored[e.key]))
    await options.holdGet?.(e.key)
    return { value }
  })
  const writes: string[] = [] // the keys written, in order
  on('store.set', ($, e) => (writes.push(e.key), (stored[e.key] = JSON.parse(JSON.stringify(e.value))), { value: undefined }))
  on('store.delete', ($, e) => (delete stored[e.key], { value: undefined }))
  // The stats files, in memory under OM_STATS_DIR.
  const files: Record<string, string> = { [EMBER_KEY_PATH]: 'test-key\n' }
  mock.env(on, { OM_STATS_DIR: '/stats', HOME: '/home/u', ...options.env })
  const reads: string[] = []
  on('fs.read', ($, e) => {
    reads.push(e.path)
    if (!(e.path in files)) throw new Error(`ENOENT: ${e.path}`)
    return { value: files[e.path]! }
  })
  on('fs.write', ($, e) => {
    if (options.failWrites) throw new Error('EACCES: permission denied')
    return (files[e.path] = e.text), { value: undefined }
  })
  on('fs.list', ($, e) => ({ value: Object.keys(files).filter((p) => p.startsWith(`${e.path}/`)).map((p) => ({ name: p.slice(e.path.length + 1), kind: 'file' as const, size: files[p]!.length, mtimeMs: 0, isLink: false })) }))
  on('fs.stat', ($, e) => {
    if (!(e.path in files)) throw new Error(`ENOENT: ${e.path}`)
    return { value: { kind: 'file' as const, size: files[e.path]!.length, mtimeMs: 0, isLink: false } }
  })
  on('fs.exists', ($, e) => ({ value: e.path in files || Object.keys(files).some((p) => p.startsWith(`${e.path}/`)) }))
  on('session.cwd', () => ({ value: '/work/project' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  return { history, agents, stored, files, reads, writes, asked }
}

export type Ledger = { entries: { id: string; line: string; source?: { from: number; to: number } }[]; corrections: string[]; watermark: { from: number; to: number }; chunks: { from: number; to: number }[] }
export type EmberCall = { body: Record<string, unknown>; headers: Record<string, string> }

// git outside a repository, as the plugin's environment read meets it by default.
// git's exit code and output, as a fake answers them; `ran` adds what `$.process.run` also reports.
export type Run = Pick<ProcessRunResult, 'exitCode' | 'stdout' | 'stderr'>
export const ran = (r: Run): ProcessRunResult => ({ ...r, isStdoutTruncated: false, isStderrTruncated: false })

export const NOT_A_REPO: Run = { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n' }

// Ember through `$.http.fetch`: it observes by naming the prompts of its chunk, each at the time its block shows;
// the reflector answers `reflect(n, prompt)` for its nth call, by default a reflection near its target. `hold` delays
// the nth call's answer, `fail` answers it with an error reply, or fails the request with an Error; `stopped` counts the calls the plugin gave up
// on (a loop that ended, a deadline) before they answered: their answers, once they come, are dropped. git, through
// `$.process.run`, is answered by `git`, else as outside a repository. `$.model.complete` is counted, and answers nothing.
export function ember(
  on: On,
  options: {
    hold?: (n: number, prompt: string) => Promise<void> | undefined
    fail?: (n: number, prompt: string) => HttpResponse | Error | undefined
    reflect?: (n: number, prompt: string) => string
    reply?: (prompt: string) => string | undefined
    git?: (argv: readonly string[]) => Run | undefined
    session?: (prompt: string) => string | HttpResponse
  } = {},
) {
  const seen = { prompts: [] as string[], systems: [] as string[], calls: [] as EmberCall[], logs: [] as string[], screen: [] as string[], inFlight: 0, maxInFlight: 0, stopped: 0, modelCalls: 0, git: [] as (readonly string[])[], sessions: [] as string[], cacheKeys: [] as string[] }
  let reflections = 0
  on('process.run', ($, e) => {
    if (e.argv[0] !== 'git') return { value: ran({ exitCode: 127, stdout: '', stderr: `${e.argv[0]}: not faked\n` }) }
    return seen.git.push(e.argv), { value: ran(options.git?.(e.argv) ?? NOT_A_REPO) }
  })
  on('http.fetch', async ($, e, next) => {
    if (e.url !== EMBER_URL) return next(e)
    const body = JSON.parse(e.init?.body ?? '{}') as Record<string, unknown>
    // A request that fails outright (`fail` gave an Error) rejects the plugin's call, as a network failure does.
    return answer(body, e.init?.headers ?? {}).then((value) => ({ value }), (error: Error) => ({ deny: error.message }))
  })
  // `$.http.fetch` takes no signal: a call the plugin gives up on (stopped or timed out) shows only in the debug line
  // it logs, naming the request by the number its `X-OM-Request` header carries. That request's hold ends: as the
  // plugin sees it, it is no longer in flight.
  const held = new Map<number, () => void>()
  const gaveUp = (text: string) => {
    const m = /^Ember \S+ #(\d+) failed \((stopped|timeout)\)/.exec(text)
    if (m) held.get(Number(m[1]))?.()
  }
  async function answer(body: Record<string, unknown>, headers: Record<string, string>): Promise<HttpResponse> {
    const id = Number(headers['X-OM-Request'])
    const [system, prompt] = [String(body.instructions ?? ''), String(body.input ?? '')]
    seen.cacheKeys.push(String(body.prompt_cache_key))
    const schema = (body.text as { format?: { name?: string } } | undefined)?.format?.name
    if (system === SESSION_SYSTEM_PROMPT) {
      seen.sessions.push(prompt)
      const r = options.session?.(prompt) ?? 'Session: the test goal'
      return typeof r === 'string' ? emberResponse(r) : r
    }
    seen.prompts.push(prompt)
    seen.systems.push(system)
    seen.calls.push({ body, headers })
    const n = seen.prompts.length
    seen.inFlight++
    seen.maxInFlight = Math.max(seen.maxInFlight, seen.inFlight)
    const abandoned = new Promise<'abandoned'>((resolve) => held.set(id, () => resolve('abandoned')))
    try {
      if ((await Promise.race([options.hold?.(n, prompt), abandoned])) === 'abandoned') {
        seen.stopped++
        return httpError(499, 'abandoned') // read by no one: the plugin gave up on it
      }
    } finally {
      seen.inFlight--
      held.delete(id)
    }
    const failed = options.fail?.(n, prompt)
    if (failed instanceof Error) throw failed // the request itself failed: no reply
    if (failed) return failed
    let text: string
    if (prompt.startsWith('## OBSERVATIONS TO REFLECT ON')) {
      reflections++
      text = options.reflect?.(reflections, prompt) ?? nearTarget(prompt, '* 🟡 2026-09-22 14:30 Reflected')
    } else
      text =
        options.reply?.(prompt) ??
        `<observations>\n${[...prompt.matchAll(/^\[User(?: @ ([\d-]+ [\d:]+))?\]: (\w+)$/gm)].map((m) => `* 🟡 ${m[1] ?? ''} User: "${m[2]}"`).join('\n')}\n</observations>\n` +
        `<continuation>\nActive: ${[...prompt.matchAll(/^\[User[^\]]*\]: (\w+)$/gm)].at(-1)?.[1]}\n</continuation>`
    return emberResponse(structured(text, schema))
  }
  on('model.complete', () => (seen.modelCalls++, { value: { isAnswered: false, reason: 'empty-reply', usage: USAGE } }))
  on('ui.log', ($, e) => ((e.to === 'debug' ? (seen.logs.push(e.text), gaveUp(e.text)) : seen.screen.push(e.text)), { value: undefined }))
  return seen
}

// A Reflector's reply to `prompt` that lands near the size target the prompt gives: `head`, then filler lines at
// the first observation's time, up to about 70% of the target. `isFiller` tells those lines apart.
export function nearTarget(prompt: string, head = '') {
  const target = Number(prompt.match(/Size target: at most ~(\d+) tokens/)![1])
  const time = prompt.match(/^\* \S+ (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) /m)?.[1] ?? ''
  const filler = (i: number) => `* 🟢 ${time} filler detail ${i}`
  const lines = head ? [head] : []
  for (let i = 0, chars = head.length; chars < 0.7 * target * 4; i++) lines.push(filler(i)), (chars += filler(i).length + 1)
  return `<observations>\n${lines.join('\n')}\n</observations>`
}
export const isFiller = (line: string) => / filler detail \d+$/.test(line)
// The size of entries as the memory renders them, each with its source range, as hooks/memory.ts estimates it.
export const stampAt = (ms: number) => stampOf(new Date(ms).toISOString())
export const tokensOf = (entries: readonly { line: string; source?: { from: number; to: number } }[]) =>
  Math.ceil(entries.map((e) => `* ${e.line}${e.source ? ` (source ${stampAt(e.source.from)} to ${stampAt(e.source.to)})` : ''}`).join('\n').length / 4)

// A live main conversation: each turn's prompt at `startAt`, the rest of it and turn.complete a minute later.
export function live(on: On, clock: MockClock, history: SessionMessage[]) {
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  return async ($: Engine, messages: SessionMessage[], startAt: number) => {
    const turnId = `turn-${history.length}`
    await clock.set(startAt)
    history.push(messages[0]!)
    await $.turn.start({ text: messages[0]!.text, turnId })
    await clock.advance(60_000)
    history.push(...messages.slice(1))
    await $.turn.complete({ answer: '', durationMs: 60_000, isAborted: false, turnId, reason: 'answer' })
  }
}

// A promise per held call, released by the test.
export function gates() {
  const release = new Map<number, () => void>()
  const held = new Map<number, Promise<void>>()
  const gate = (n: number) => {
    if (!held.has(n)) held.set(n, new Promise<void>((resolve) => release.set(n, resolve)))
    return held.get(n)!
  }
  return { gate, open: (n: number) => (gate(n), release.get(n)!()) }
}

// The recall-only eval plugin's hooks by event, the last registered for each, to run with a `$` the test builds: the
// test kit loads an inline plugin from its register function alone, which this one's top-level helpers are not in,
// and the test's own `$` makes no call a plugin alone makes, such as `$.tool.register`.
export function recallOnlyHooks() {
  const hooks = new Map<string, (...args: any[]) => Promise<unknown>>()
  recallOnly(((event: string, ...rest: unknown[]) => void hooks.set(event, rest.at(-1) as never)) as unknown as On, {} as never)
  return hooks
}

// The engine's own answer to om_recall's `tool.describe`: an MCP tool is deferred.
export const deferredByEngine = (e: { description: string; isDeferred?: true }) => ({ description: e.description, ...(e.isDeferred ? { isDeferred: e.isDeferred } : {}) })
export const RECALL_DESCRIBE = { tool: 'mcp__observational-memory__om_recall', description: 'Searches', isDeferred: true as const, provider: { plugin: 'observational-memory', tier: 'user' as const } }
export const COMPACT_START = { source: 'compact' as const, session_id: 'session-1', transcript_path: '' }

// A turn's work after its prompt: no new prompt.
export const work = (name: string, size = 0) => turn(name, 'r', size).slice(1)
// The user's latest request the continuation record quotes: `(n chars):` then exactly n characters.
export function nextStepIn(text?: string) {
  const m = text?.match(/\n\n<continuation>\n[\s\S]*?^The user's latest request [^\n]*\((\d+) chars\):\n/m)
  return m ? text!.slice(m.index! + m[0].length, m.index! + m[0].length + Number(m[1])) : undefined
}
// The continuation record's state of the work: its lines before the quoted request, if any.
export const recordIn = (text?: string) => text?.match(/\n\n<continuation>\n([\s\S]*?)(?:\n^The user's latest request [^\n]*\(\d+ chars\):\n[\s\S]*)?\n<\/continuation>/m)?.[1]
export const WHERE = 'Where the work stood as last recorded, up to the last message this memory covers'
// A memory message's text without its replies section (I42), which sits between the corrections and the observations.
export const noReplies = (text = '') => text.replace(/<your-replies>\n[\s\S]*?<\/your-replies>\n\n/, '')
export const repliesIn = (text?: string) => text?.match(/\n<your-replies>\n([\s\S]*?)<\/your-replies>\n\n<observations>/)?.[1]
export const correctionsIn = (text?: string) => text?.match(/\n<corrections>\n([\s\S]*?)\n<\/corrections>/)?.[1]
export const renderedObservationsIn = (text?: string) => text?.match(/<observations>\n([\s\S]*?)\n<\/observations>/)?.[1]
// A memory message with its observations replaced by `observations`, as rendered.
export const withObservations = (m: SessionMessage, observations: string): SessionMessage => ({ ...m, text: m.text.replace(/(<observations>\n)[\s\S]*?(\n<\/observations>)/, (_, a, b) => `${a}${observations}${b}`) })
// The observations with each day's date, written once on its `@ YYYY-MM-DD` line, put back on its lines and source ends.
export function observationsIn(text?: string) {
  let day = ''
  const at = (t: string) => (/^\d{2}:\d{2}$/.test(t) ? `${day} ${t}` : t)
  return renderedObservationsIn(text)
    ?.split('\n')
    .flatMap((l) => {
      const d = l.match(/^@ (\d{4}-\d{2}-\d{2})$/)
      if (d) return (day = d[1]!), []
      return [day ? l.replace(/^(\* \S+ )(\d{2}:\d{2}) /, (_, m, t) => `${m}${at(t)} `).replace(/\(source (\S+(?: \S+)?) to (\S+(?: \S+)?)\)$/, (_, a, b) => `(source ${at(a)} to ${at(b)})`) : l]
    })
    .join('\n')
}
// The entries of the user messages section: `* User[ @ time] (n chars):` then exactly n characters, or an
// omission line, read as `(n omitted)`; a day's `@ YYYY-MM-DD` line is skipped.
export function userMessagesIn(text?: string) {
  const start = text?.indexOf('\n\n<all-user-messages>\n') ?? -1
  if (!text || start < 0) return undefined
  const out: string[] = []
  const entry = /\* User(?: @ (?:[\d-]+ )?[\d:]+)? \((\d+) chars\):\n|\* \((\d+) earlier user messages omitted(?:; om_recall can search them)?\)\n|@ [\d-]+\n/y
  entry.lastIndex = start + '\n\n<all-user-messages>\n'.length
  for (let m; (m = entry.exec(text)); )
    if (!m[1] && !m[2]) continue
    else if (m[2]) out.push(`(${m[2]} omitted)`)
    else out.push(text.slice(entry.lastIndex, entry.lastIndex + Number(m[1]))), (entry.lastIndex += Number(m[1]) + 1)
  return out
}
export const pad = (n: number) => String(n).padStart(2, '0')
export const stampOf = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const briefIn = (text?: string) => text?.match(/<session-brief>\n([\s\S]*?)\n<\/session-brief>/)?.[1]
export const skillsIn = (text?: string) => text?.match(/<skills-in-use>\n([\s\S]*?)\n<\/skills-in-use>/)?.[1]
export const FINISHED = '(finished; invoke it again to reread its text, or om_recall to find where it loaded)'

// Turns a to c of a live session, then turn d still running: `old` is loaded in turn a, `mid` in b, `now` in d.
export async function fourTurns($: Engine, on: On) {
  const clock = mock.clock(on)
  const { history, stored } = world(on)
  const seen = ember(on)
  on('skill.prompt', ($, e) => ({ text: e.text }))
  const runTurn = live(on, clock, history)
  await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 0))
  await $.skill.prompt({ skill: 'old', text: 'Old steps' })
  await runTurn($, turn('b', 'b', 100), at(22, 14, 10))
  await $.skill.prompt({ skill: 'mid', text: 'Mid steps' })
  await runTurn($, turn('c', 'c', 100), at(22, 14, 20))
  await clock.set(at(22, 14, 30))
  history.push({ role: 'user', text: 'd', toolUses: [] })
  await $.turn.start({ text: 'd', turnId: 'turn-d' })
  await clock.advance(30_000)
  await $.skill.prompt({ skill: 'now', text: 'Now steps' })
  history.push(...work('d', 8_000))
  await clock.settle()
  const first = await $.session.compact({ trigger: 'auto', messages: [...history] })
  return { clock, history, stored, seen, runTurn, first }
}

// The engine's model requests inside a turn: each answered at once beneath the plugin, read to its end.
export function steps(on: On) {
  on('turn.step', async function* ($, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use' as const, usage: null }
  })
  return async ($: Engine, turnId: string, index: number, messageCount: number, agentId?: string) => {
    const stream = $.turn.step({ turnId, index, model: 'claude', messageCount, ...(agentId ? { agentId } : {}) })
    for await (const _ of stream);
    return stream.result
  }
}

// One tool call of a long turn: the call and its result of `size` characters.
export const call = (n: number, size: number): SessionMessage[] => [
  { role: 'assistant', text: '', toolUses: [{ tool_use_id: `c${n}`, tool: 'Read', input: { file_path: `/src/f${n}.ts` } }] },
  { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: `c${n}`, text: 'x'.repeat(size), isError: false }] },
]

// One tool call of a subagent `agent` (or the main loop's): it reads `/src/<agent>-<n>.ts`.
export const agentCall = (agent: string, n: number, size: number): SessionMessage[] => [
  { role: 'assistant', text: '', toolUses: [{ tool_use_id: `${agent}-c${n}`, tool: 'Read', input: { file_path: `/src/${agent}-${n}.ts` } }] },
  { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: `${agent}-c${n}`, text: 'x'.repeat(size), isError: false }] },
]
// An Observer that names the files its chunk read.
export const readsIn = (prompt: string) => `<observations>\n* 🟡 Read ${[...prompt.matchAll(/"file_path":"\/src\/([\w-]+)\.ts"/g)].map((m) => m[1]).join(', ')}\n</observations>`
export const readers = (text: string) => new Set([...text.matchAll(/\b(main|one|two)-\d+/g)].map((m) => m[1]))

// What a built-in compaction hands back: its summary, then the newest call and result it keeps, with their handles.
export const SUMMARY: SessionMessage = {
  role: 'user',
  text: 'This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\nSummary:\n1. Primary Request and Intent: read the files.',
  toolUses: [],
}
export const overloaded = (): HttpResponse => httpError(503, 'overloaded')

// A transcript directory in memory for the om_recall helpers, recording which files they read.
export function memoryIo(files: Record<string, string>): RecallIo & { reads: string[] } {
  const reads: string[] = []
  return {
    reads,
    read: async (path) => {
      reads.push(path)
      if (!(path in files)) throw new Error(`ENOENT: ${path}`)
      return files[path]!
    },
    list: async (dir) => {
      const names = Object.keys(files)
        .filter((p) => p.startsWith(`${dir}/`))
        .map((p) => p.slice(dir.length + 1).split('/')[0]!)
      return [...new Set(names)]
    },
    continuing: async (dir, names, id) => names.find((n) => files[`${dir}/${n}`]?.includes(`"continuedInSessionId":"${id}"`)),
    now: async () => 0,
  }
}

// An Observer that quotes, for each prompt named in `said` in its chunk, the user's constraint, naming the listed
// constraint it replaces (one whose words contain `replaces`) by the id the chunk's prompt gives it, and says where
// the work stands when `state` names the prompt.
export function constraining(said: Record<string, { quote: string; replaces?: string }>, state: Record<string, string> = {}) {
  return (prompt: string) => {
    const prompts = [...prompt.matchAll(/^\[User(?: @ ([\d-]+ [\d:]+))?\]: (\w+)$/gm)].map((m) => ({ time: m[1] ? `${m[1]} ` : '', name: m[2]! }))
    const corrections = prompts.flatMap(({ time, name }) => {
      const c = said[name]
      if (!c) return []
      const id = c.replaces && prompt.match(new RegExp(`^\\[(k[0-9a-f]+)\\] 🔴 .*${c.replaces}`, 'm'))?.[1]
      return [`* 🔴 ${time}User: "${c.quote}"${id ? ` (replaces ${id})` : ''}`]
    })
    const current = prompts.flatMap(({ name }) => (state[name] ? [state[name]] : [])).at(-1)
    return (
      (corrections.length ? `<corrections>\n${corrections.join('\n')}\n</corrections>\n` : '') +
      `<observations>\n${prompts.map(({ time, name }) => `* 🟡 ${time}User asked ${name}`).join('\n')}\n</observations>` +
      (current ? `\n<continuation>\n${current}\n</continuation>` : '')
    )
  }
}
