// Helpers the test files share: a session world, the pi stub, transcripts and the memory message's parts.
import { describe, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On, ProcessRunResult, SessionMessage } from 'claude-code'
import { SESSION_SYSTEM_PROMPT } from '../hooks/prompts'
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
export const PI_USAGE = { input: 9206, output: 558, cacheRead: 3072, cacheWrite: 0, reasoning: 31, totalTokens: 9764, cost: { input: 0.0023, output: 0.0002, cacheRead: 0, cacheWrite: 0, total: 0.0025108 } }
export const PI_ARGV = ['pi', '-p', '--model', 'openai-codex/gpt-6-luna', '--thinking', 'low', '--system-prompt']
export const PI_FLAGS = ['--no-tools', '--no-extensions', '--no-skills', '--no-context-files', '--no-prompt-templates', '--no-themes', '--no-session', '--mode', 'json', '--append-system-prompt', '']
// pi's session id for one piece of work, which its codex provider sends as the prompt cache key. The hash is FNV-1a
// of 'session-1'. pi rejects an id outside its characters, and the provider cuts one past 64 characters.
export const OBSERVER_SESSION = 'om-obs-736a51cd'
export const PI_SESSION_ID = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/
export const piSessionOf = (argv: readonly string[]) => {
  const id = argv[argv.indexOf('--session-id') + 1] ?? ''
  if (!argv.includes('--session-id') || !PI_SESSION_ID.test(id) || id.length > 64) throw new Error(`no valid pi session id in ${JSON.stringify(argv.slice(-2))}`)
  return id
}

// What pi 0.85.1 prints with `--mode json` for one answer: one event per line, the prompt echoed, the answer
// streamed, then the final assistant message with its usage (as /tmp/obs-bench/pi1.jsonl, abridged).
export function piOutput(prompt: string, text: string, end: { stopReason?: string; errorMessage?: string } = { stopReason: 'stop' }) {
  const user = { role: 'user', content: [{ type: 'text', text: prompt }], timestamp: 0 }
  const assistant = {
    role: 'assistant',
    content: [{ type: 'thinking', thinking: '', thinkingSignature: '{}' }, { type: 'text', text }],
    api: 'openai-codex-responses',
    provider: 'openai-codex',
    model: 'gpt-5.6-luna',
    usage: PI_USAGE,
    ...end,
    timestamp: 0,
  }
  return [
    { type: 'session', version: 3, id: 'pi-session', timestamp: '2026-09-23T03:51:47.144Z', cwd: '/tmp' },
    { type: 'agent_start' },
    { type: 'turn_start' },
    { type: 'message_start', message: user },
    { type: 'message_end', message: user },
    { type: 'message_start', message: { ...assistant, content: [] } },
    { type: 'message_update', assistantMessageEvent: { type: 'text_delta', contentIndex: 1, delta: text.slice(0, 20) } },
    { type: 'message_end', message: assistant },
    { type: 'turn_end', message: assistant, toolResults: [] },
    { type: 'agent_end', messages: [user, assistant] },
    { type: 'agent_settled' },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n')
}
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
  const files: Record<string, string> = {}
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
export type PiCall = { argv: readonly string[]; cwd?: string }

// git outside a repository, as the plugin's environment read meets it by default.
// pi's or git's exit code and output, as a fake answers them; `ran` adds what `$.process.run` also reports.
export type Run = Pick<ProcessRunResult, 'exitCode' | 'stdout' | 'stderr'>
export const ran = (r: Run): ProcessRunResult => ({ ...r, isStdoutTruncated: false, isStderrTruncated: false })

export const NOT_A_REPO: Run = { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository (or any of the parent directories): .git\n' }

// pi on the host, as `$.process.spawn` runs it: it observes by naming the prompts of its chunk, each at the time
// its block shows; the reflector answers `reflect(n, prompt)` for its nth call, by default a reflection near its target. `hold` delays the nth call's answer, `fail`
// answers it with a failed run instead; `stopped` counts the calls killed before they answered. git, through
// `$.process.run`, is answered by `git`, else as outside a repository, and is no pi call.
// `$.model.complete` is counted, and answers nothing.
export function pi(
  on: On,
  options: {
    hold?: (n: number, prompt: string) => Promise<void> | undefined
    fail?: (n: number, prompt: string) => Run | undefined
    reflect?: (n: number, prompt: string) => string
    reply?: (prompt: string) => string | undefined
    git?: (argv: readonly string[]) => Run | undefined
    session?: (prompt: string) => string | Run
  } = {},
) {
  const seen = { prompts: [] as string[], systems: [] as string[], calls: [] as PiCall[], logs: [] as string[], screen: [] as string[], inFlight: 0, maxInFlight: 0, stopped: 0, modelCalls: 0, git: [] as (readonly string[])[], sessions: [] as string[], sessionIds: [] as string[] }
  let reflections = 0
  on('process.run', ($, e) => {
    if (e.argv[0] !== 'git') return { value: ran({ exitCode: 127, stdout: '', stderr: `${e.argv[0]}: not faked\n` }) }
    return seen.git.push(e.argv), { value: ran(options.git?.(e.argv) ?? NOT_A_REPO) }
  })
  // What pi prints comes in pieces, the middle of a line ending one, as a child writes it. A call killed while held
  // stops holding at once.
  on('process.spawn', async function* ($, e, next) {
    if (e.argv[0] !== 'pi') return yield* next(e)
    const killed = new Promise<never>((_, reject) => next.signal.addEventListener('abort', () => reject(next.signal.reason), { once: true }))
    killed.catch(() => {})
    let answered = false
    try {
      const r = await answer(e.argv, e.cwd, e.input ?? '', killed)
      answered = true
      const half = Math.floor(r.stdout.length / 2)
      for (const [stream, text] of [['stdout', r.stdout.slice(0, half)], ['stdout', r.stdout.slice(half)], ['stderr', r.stderr]] as const) if (text) yield { stream, text }
      return { value: { code: r.exitCode, signal: null } }
    } finally {
      if (!answered) seen.stopped++
    }
  })
  async function answer(argv: readonly string[], cwd: string | undefined, prompt: string, killed: Promise<never>): Promise<Run> {
    if (argv[argv.indexOf('--system-prompt') + 1] === SESSION_SYSTEM_PROMPT) {
      seen.sessions.push(prompt)
      seen.sessionIds.push(piSessionOf(argv))
      const r = options.session?.(prompt) ?? 'Session: the test goal'
      return typeof r === 'string' ? { exitCode: 0, stdout: piOutput(prompt, r), stderr: '' } : r
    }
    seen.prompts.push(prompt)
    seen.systems.push(argv[argv.indexOf('--system-prompt') + 1] ?? '')
    seen.calls.push({ argv, cwd })
    const n = seen.prompts.length
    seen.inFlight++
    seen.maxInFlight = Math.max(seen.maxInFlight, seen.inFlight)
    try {
      await Promise.race([options.hold?.(n, prompt), killed])
    } finally {
      seen.inFlight--
    }
    const failed = options.fail?.(n, prompt)
    if (failed) return failed
    let text: string
    if (prompt.startsWith('## OBSERVATIONS TO REFLECT ON')) {
      reflections++
      text = options.reflect?.(reflections, prompt) ?? nearTarget(prompt, '* 🟡 2026-09-22 14:30 Reflected')
    } else
      text =
        options.reply?.(prompt) ??
        `<observations>\n${[...prompt.matchAll(/^\[User(?: @ ([\d-]+ [\d:]+))?\]: (\w+)$/gm)].map((m) => `* 🔴 ${m[1] ?? ''} User: "${m[2]}"`).join('\n')}\n</observations>\n` +
        `<continuation>\nActive: ${[...prompt.matchAll(/^\[User[^\]]*\]: (\w+)$/gm)].at(-1)?.[1]}\n</continuation>`
    return { exitCode: 0, stdout: piOutput(prompt, text), stderr: '' }
  }
  on('model.complete', () => (seen.modelCalls++, { value: { isAnswered: false, reason: 'empty-reply', usage: USAGE } }))
  on('ui.log', ($, e) => ((e.to === 'debug' ? seen.logs : seen.screen).push(e.text), { value: undefined }))
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
  const seen = pi(on)
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

// A truncation pass's result: every row back, the first as it was (a memory message the pass kept, or none).
const truncated = (rows: readonly SessionMessage[], out: readonly SessionMessage[] | undefined) =>
  out?.length === rows.length && out[0]?.text === rows[0]?.text
// An auto compaction as the engine runs it: a truncation pass is installed, its rows written after the history's,
// and the threshold still crossed, so the engine compacts again on what the pass left. `history` is the session's,
// pushed onto; the last result returns.
export async function compactAuto($: Engine, history: SessionMessage[], messages: SessionMessage[], agentId?: string) {
  const compact = (rows: readonly SessionMessage[]) => $.session.compact({ trigger: 'auto', messages: rows, ...(agentId ? { agentId } : {}) })
  let rows: readonly SessionMessage[] = messages
  let result = await compact(rows)
  // Bounded: a second pass has nothing left to clear.
  for (let pass = 0; pass < 2 && truncated(rows, result.messages); pass++) {
    history.push(...result.messages!.map(({ handle: _, ...m }) => m))
    rows = result.messages!
    result = await compact(rows)
  }
  return result
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
export const overloaded = (): Run => ({ exitCode: 0, stdout: piOutput('', '', { stopReason: 'error', errorMessage: 'Codex error: overloaded' }), stderr: '' })

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
