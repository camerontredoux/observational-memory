// The memory message: the page a compaction leaves at the head of the context, rendered from the ledger and read back
// from the context at the next compaction (memoryMessage, parseMemory), with the cuts that fit its sections to their
// caps (capUserMessages, capReplies, slimmed) and the line, source and constraint formats its sections share with the
// Observer's and Reflector's replies. No `$` here: the engine never lets it cross an import.
import type { SessionMessage } from 'claude-code'
import {
  COMPACT_RECENT,
  COMPACT_RESUME,
  COMPACT_TRANSCRIPT,
  COMPACT_WRAPPER,
  FLOOR_NOTE,
  MEMORY_GUIDE,
  MEMORY_GUIDE_RECALL,
  MEMORY_GUIDE_SOURCES,
  MEMORY_HEADER,
  MEMORY_RECALL,
  MEMORY_RESUME,
  MEMORY_RESUME_END,
} from './prompts'
import { parseBrief, parseFailures, renderBrief, renderFailure } from './vcc'
import type { Brief, OpenFailure } from './vcc'

const REPLIES_MIN_TOKENS = 200 // the assistant's replies section: less room than this quotes none
// The verbatim user messages section. The session's first message has a cap of its own. After it, the newest prompts
// are kept within USER_MESSAGES_MAX_TOKENS; past that, the last three prompts stay whole within USER_RECENT_TOKENS
// (they are the requests in hand), and every prompt of USER_SHORT_CHARS or fewer (a correction, an approval, a
// question) within USER_SHORT_TOKENS: long pastes would otherwise fill the section and drop them.
const FIRST_MESSAGE_MAX_TOKENS = 8_000
const USER_MESSAGES_MAX_TOKENS = 3_000
const USER_RECENT_TOKENS = 6_000
const USER_SHORT_CHARS = 400
const USER_SHORT_TOKENS = 8_000
const NEWEST_RESERVE_TOKENS = 2_000 // the least the newest prompt keeps, whatever the first message takes
const NEXT_STEP_MAX_TOKENS = 2_000 // the latest request the continuation record quotes
const MARKERS = ['🔴', '🟡', '🟢', '✅']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SKILL_FINISHED = '(finished; invoke it again to reread its text, or om_recall to find where it loaded)'
// A skill in full, or finished: one line, its text gone. An old memory message gives no time.
const SKILL_BLOCK = /<skill name="([^"]*)"(?: invoked="([\d-]+ [\d:]+)")?>(?:\n([\s\S]*?)\n<\/skill>|\(finished;[^\n]*<\/skill>)(?=\n<skill name="|\n<\/skills-in-use>)/g

export type Skill = { skill: string; text: string; at?: number } // `at`: when it was invoked; no text: finished, kept as a line
// The first and last times of the transcript rows an observation was drawn from: bounds om_recall takes, which
// stay true as the live context shifts. Absent when no row was timed, or the memory it came from had none: unknown.
export type Source = { from: number; to: number }
export type Entry = { id: string; line: string; source?: Source; r?: true } // line: `🔴 2026-09-23 14:30 User asked …`; r: the Reflector wrote it
export type UserMessage = { at?: string; text: string; omitted?: number } // `omitted`: a line standing for that many dropped
export type Memory = {
  corrections: string[]
  observations: string
  currentTask?: string
  session?: string // the Session line, without its label (see writeSession)
  stateAt?: string // the time of the last message the memory covers
  skills: Skill[]
  userMessages: UserMessage[]
  replies?: UserMessage[] // the assistant's last reply of each turn that left context, newest kept
  nextStep?: string // the user's latest request, verbatim
  environment?: string // the working directory and git state at compaction (see environmentOf)
  failures?: OpenFailure[] // tool failures still open when their rows left context, found by code (see openFailures)
  brief?: Brief // the session brief, compiled by code (see vcc.ts): the session's file and command manifest, and where the floor ran, its rows
  floor?: boolean // this compaction's brief stands in for rows the Observer had not observed
  transcript?: string
  recoverable: boolean // the session's transcript is known: om_recall can find what the memory leaves out
  recall: boolean // the model can call om_recall: the message ends by sending it there
  recentKept: boolean
  resumeDirectly: boolean
}
// The times an observation may carry (see parseLines); none when no row was timed.
export type Bounds = { lo: number; hi: number; latest: number } | undefined

export const estimateTokens = (text: string) => Math.ceil(text.length / 4)
// The regex source that finds a note written with a count of 0 (its first 0), whatever its count: each note's regex
// is built from the function that writes the note, so the two cannot drift apart.
export const noteSource = (note: string) => note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('0', '\\d+')
const truncationNote = (tokens: number) => `\n... [truncated ~${tokens} tokens]`
export const truncate = (text: string, maxTokens: number) =>
  text.length <= maxTokens * 4 ? text : `${text.slice(0, maxTokens * 4)}${truncationNote(estimateTokens(text) - maxTokens)}`
const TRUNCATED = new RegExp(`${noteSource(truncationNote(0))}$`)
// What truncate leaves of a text given no room: its note alone.
export const isStub = (text: string) => text.search(TRUNCATED) === 0
// An oversized command result or message, bounded at both ends: a final error or test summary, or a task's reporting
// and acceptance rules, usually sits at the start or the end, never only in the middle. The omission is marked
// explicitly, never silently dropped; om_recall can still find the full `what` in the transcript. The tail starts at
// a line boundary so its first line is whole.
export const omissionMarker = (tokens: number, what: string) => `\n... [~${tokens} tokens omitted; om_recall can retrieve the full ${what}] ...\n`
// The marker excerpt leaves in a message it cut: the first message or a reply (see capUserMessages, cutReply).
const MESSAGE_CUT = new RegExp(noteSource(omissionMarker(0, 'message')))
export function excerpt(text: string, maxTokens: number, what: 'result' | 'message' | 'input' = 'result') {
  if (text.length <= maxTokens * 4) return text
  const room = maxTokens * 4
  const headChars = Math.floor(room / 2)
  const rawTailStart = text.length - (room - headChars)
  const nl = text.indexOf('\n', rawTailStart)
  const tailStart = nl === -1 || nl >= text.length - 1 ? rawTailStart : nl + 1
  const omitted = estimateTokens(text.slice(headChars, tailStart))
  return `${text.slice(0, headChars)}${omissionMarker(omitted, what)}${text.slice(tailStart)}`
}

export function hash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16)
}

const pad = (n: number) => String(n).padStart(2, '0')
export const stamp = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// A line's source, rendered after it: both ends as om_recall's `from` and `to` take them, an end on `day` without its date.
const SOURCE_TRAILER = /\s*\(source:? ([^()]*)\)$/
const dayless = (at: number, day: string) => (day && stamp(at).startsWith(`${day} `) ? stamp(at).slice(day.length + 1) : stamp(at))
const renderSource = (s: Source, day = '') => `(source ${dayless(s.from, day)} to ${dayless(s.to, day)})`

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

// The tag must start a line.
export const tag = (text: string, name: string) =>
  text.match(new RegExp(`^[ \\t]*<${name}>([\\s\\S]*?)^[ \\t]*</${name}>`, 'im'))?.[1]?.trim() || undefined

// The user's constraints in force are correction lines, `🔴 [time] User: "…"` as the Observer quotes them, oldest
// first. A line's key is its words without its time or the note of what it replaced: the same words said again are
// one constraint, kept where they were said last, and a constraint said again after another stays after it. A
// correction the Observer marks "(replaces <id>)" takes the place of the constraint in force with that id (the hash
// of its key), and notes what it replaced; any other newer line replaces nothing. What a replaced constraint said
// stays in the transcript.
const REPLACED_NOTE = ' (this replaces the earlier constraint '
export const REPLACES = /\s*\(replaces:?((?:\s*(?:,|and)?\s*\[?k[0-9a-f]{1,8}\]?)+)\s*\)$/i
export const baseOf = (line: string) => (line.includes(REPLACED_NOTE) ? line.slice(0, line.indexOf(REPLACED_NOTE)) : line)
export const keyOf = (line: string) =>
  baseOf(line)
    .replace(/^🔴\s*(?:\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s+)?/, '')
    .replace(/\s+/g, ' ')
    .trim()
const idOf = (key: string) => `k${hash(key)}`
export const constraintId = (line: string) => idOf(keyOf(line))

export function applyConstraints(active: readonly string[], lines: readonly string[]) {
  const out = new Map<string, string>() // by key, in the order last said
  const put = (raw: string) => {
    const ref = raw.match(REPLACES)
    const line = ref ? raw.slice(0, ref.index).trimEnd() : raw
    const key = keyOf(line)
    const ids = new Set(ref?.[1]!.match(/k[0-9a-f]+/gi)?.map((id) => id.toLowerCase()))
    const replaced: string[] = []
    if (ids.size)
      for (const [k, l] of out)
        if (k !== key && ids.has(idOf(k))) {
          replaced.push(l)
          out.delete(k)
        }
    const again = out.get(key) ?? ''
    out.delete(key)
    const note = replaced.length
      ? `${REPLACED_NOTE}${replaced.map((l) => baseOf(l).replace(/^🔴\s*/, '')).join('; ')})`
      : line.slice(baseOf(line).length) || again.slice(baseOf(again).length)
    out.set(key, `${baseOf(line)}${note}`)
  }
  for (const line of [...active, ...lines]) put(line)
  return [...out.values()]
}

function realTime(y: number, mo: number, d: number, h: number, mi: number) {
  const date = new Date(y, mo - 1, d, h, mi)
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d && date.getHours() === h && date.getMinutes() === mi
    ? date.getTime()
    : undefined
}

// Observation lines as `<marker> YYYY-MM-DD HH:MM <text>`: the timestamp read from the line, or from an older
// reply's `Date:` header and `(HH:MM)`; checked against `bounds` and clamped into them, a line without a real one given
// the latest time the source shows. Without bounds a time is kept only if real, and never invented. An unmarked line
// continues the one before, as a wrapped line does, except a 🔴 line whose quote is closed: a user's constraint takes in
// nothing past the user's words, so the line stands as its own 🟡 one. `unmarked` hears of each, with how it was taken.
export function parseLines(text: string, bounds: Bounds, stripTimes = false, unmarked?: (text: string, how: Unmarked) => void) {
  const lines: string[] = []
  let day: [number, number, number] | undefined
  for (const raw of text.split('\n')) {
    let line = raw.trim()
    if (!line) continue
    const header = line.match(/^Date:\s*(?:(\d{4})-(\d{2})-(\d{2})|([A-Z][a-z]+)\.? (\d{1,2}),? (\d{4}))/)
    if (header) {
      day = header[1]
        ? [Number(header[1]), Number(header[2]), Number(header[3])]
        : [Number(header[6]), MONTHS.indexOf(header[4]!.slice(0, 3)) + 1, Number(header[5])]
      continue
    }
    line = line.replace(/^(?:[-*]|\d+\.)\s+/, '')
    let marker = MARKERS.find((m) => line.startsWith(m))
    const own = !marker
    if (marker) line = line.slice(marker.length).trim()
    else {
      if (!lines.length || /^<\/?[a-z-]+>$/.test(line)) continue
      line = line.replace(/^->\s*/, '')
      const last = lines.at(-1)!
      const quoting = last.startsWith('🔴') && openQuote(last)
      if (quoting || !last.startsWith('🔴')) {
        lines[lines.length - 1] += `; ${line}`
        unmarked?.(line, quoting ? { quote: true } : {})
        continue
      }
      marker = '🟡'
    }
    const said = line
    let at: number | undefined
    const full = line.match(/^\(?(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})\)?\s*/)
    const clock = line.match(/^\((\d{1,2}):(\d{2})\)\s*/)
    if (full) at = realTime(Number(full[1]), Number(full[2]), Number(full[3]), Number(full[4]), Number(full[5]))
    else if (clock && day) at = realTime(day[0], day[1], day[2], Number(clock[1]), Number(clock[2]))
    line = line.slice((full ?? clock)?.[0].length ?? 0).trim()
    if (!line) continue
    if (stripTimes) at = undefined
    else if (bounds) at = Math.min(Math.max(at ?? bounds.latest, bounds.lo), bounds.hi)
    lines.push(at === undefined ? `${marker} ${line}` : `${marker} ${stamp(at)} ${line}`)
    if (own) unmarked?.(said, { own: lines.at(-1) })
  }
  return lines
}

// How parseLines took an unmarked line: into the line before (`quote` when into a 🔴 line's open quote), or as `own`.
export type Unmarked = { quote?: true; own?: string }
// A 🔴 line's quote of the user runs on while it holds an odd number of double quotes after `User:`.
const openQuote = (line: string) => {
  const at = line.indexOf('User:')
  return at >= 0 && (line.slice(at).match(/"/g)?.length ?? 0) % 2 === 1
}

// Without `sources`, the lines alone: what a memory over its budget sheds first.
export const renderLines = (entries: readonly Entry[], sources = true) =>
  entries.map((e) => `* ${e.line}${sources && e.source ? ` ${renderSource(e.source)}` : ''}`).join('\n')
// The memory's form: a run of lines drawn from the same source range gives it once, after its last line, and each
// day's date is written once, on an `@ YYYY-MM-DD` line before its first line; a line and a source then give the time alone.
// A run of lines with no source that a run with one follows ends on NO_SOURCE, so it is not read back as part of it.
export const renderGrouped = (entries: readonly Entry[], sources = true) => {
  let day = ''
  return entries
    .map((e, i) => {
      const next = entries[i + 1]?.source
      const last = !next || next.from !== e.source?.from || next.to !== e.source?.to
      const m = e.line.match(LINE_DAY)
      const head = m && m[2] !== day ? `${DAY_MARK}${(day = m[2]!)}\n` : ''
      const trailer = !sources ? '' : e.source ? (last ? ` ${renderSource(e.source, day)}` : '') : next ? ` ${NO_SOURCE}` : ''
      return `${head}* ${m ? m[1] + e.line.slice(m[0].length) : e.line}${trailer}`
    })
    .join('\n')
}
const NO_SOURCE = '(source none)'
const LINE_DAY = /^(\S+ )(\d{4}-\d{2}-\d{2}) (?=\d{2}:\d{2} )/
const DAY_MARK = '@ '
// The observations with each line's date written on it again, as the ledger keeps them.
function dated(text: string) {
  let day = ''
  return text
    .split('\n')
    .flatMap((l) => {
      if (l.startsWith(DAY_MARK) && /^\d{4}-\d{2}-\d{2}$/.test(l.slice(DAY_MARK.length))) return (day = l.slice(DAY_MARK.length)), []
      if (!day) return [l]
      return [
        l
          .replace(/^(\* \S+ )(?=\d{2}:\d{2} )/, `$1${day} `)
          .replace(SOURCE_TRAILER, (t, r: string) => t.replace(r, r.split(' to ').map((s) => (/^\d{2}:\d{2}$/.test(s) ? `${day} ${s}` : s)).join(' to '))),
      ]
    })
    .join('\n')
}
const correctionsBody = (lines: readonly string[]) => lines.map((l) => `* ${l}`).join('\n')
export const renderCorrections = (lines: readonly string[]) => (lines.length ? `<corrections>\n${correctionsBody(lines)}\n</corrections>\n\n` : '')
const section = (name: string, value?: string) => (value ? `\n\n<${name}>\n${value}\n</${name}>` : '')

// The user's messages, verbatim, each after a header that gives its length, so no text inside can end the section.
// The line standing for those dropped says om_recall can find them only when the transcript that holds them is known.
const USER_MESSAGES = '\n\n<all-user-messages>\n'
const USER_MESSAGES_END = '</all-user-messages>'
const NEXT_STEP = '\n\n<optional-next-step>\n' // an older memory message's: its user's latest request
const omittedLine = (n: number, recoverable: boolean) => `* (${n} earlier user messages omitted${recoverable ? '; om_recall can search them' : ''})\n`
// Each day's date is written once, as in the observations. A message the corrections quote whole, as the first
// `User: "…"` of its length there, is not repeated but for the newest, quoted for its exact wording; its header gives
// its length, which finds its text in them again.
function renderUserMessages(messages: readonly UserMessage[], recoverable: boolean, corrections: string) {
  let day = ''
  const header = (at: string) => {
    const [d, t] = at.split(' ')
    return `${d === day ? '' : `${DAY_MARK}${(day = d!)}\n`}* User @ ${t}`
  }
  return messages.length
    ? `${USER_MESSAGES}${messages
        .map((m, i) =>
          m.omitted
            ? omittedLine(m.omitted, recoverable)
            : `${m.at ? header(m.at) : '* User'} (${m.text.length} chars):${i < messages.length - 1 && m.text.length > QUOTED.length && quotedIn(corrections, m.text.length) === m.text ? QUOTED : `\n${m.text}\n`}`,
        )
        .join('')}${USER_MESSAGES_END}`
    : ''
}
// The assistant's reply ending each turn that left context, verbatim, each after a header giving its length, in a
// block between the corrections and the observations: an old reply's value reads before the observations' current one.
const REPLIES = '<your-replies>\n'
const REPLIES_END = '</your-replies>'
function renderReplies(replies: readonly UserMessage[] | undefined) {
  if (!replies?.length) return ''
  let day = ''
  return `${REPLIES}${replies
    .map((m) => {
      const [d, t] = (m.at ?? '').split(' ')
      const head = m.at ? `${d === day ? '' : `${DAY_MARK}${(day = d!)}\n`}* You @ ${t}` : '* You'
      return `${head} (${m.text.length} chars):\n${m.text}\n`
    })
    .join('')}${REPLIES_END}\n\n`
}
// The replies section of a memory message: only where it can be, before the first <observations> tag.
function parseReplies(text: string) {
  const replies: UserMessage[] = []
  const start = text.indexOf(REPLIES)
  if (start < 0 || start > text.indexOf('<observations>\n')) return { replies, start, end: 0 }
  const entry = /\* You(?: @ ([\d:]+))? \((\d+) chars\):\n|@ (\d{4}-\d{2}-\d{2})\n/y
  entry.lastIndex = start + REPLIES.length
  let end = entry.lastIndex
  let day = ''
  for (let m; (m = entry.exec(text)); end = entry.lastIndex)
    if (m[3]) day = m[3]
    else replies.push({ ...(m[1] && day ? { at: `${day} ${m[1]}` } : {}), text: text.slice(entry.lastIndex, entry.lastIndex + Number(m[2])) }), (entry.lastIndex += Number(m[2]) + 1)
  return { replies, start, end: text.startsWith(REPLIES_END, end) ? end + REPLIES_END.length : end }
}
// The newest replies within `max` tokens, oldest first; the newest is cut to fit when it alone passes it.
const REPLY_MAX_TOKENS = 600 // one reply over this is cut to its head and tail (0: only the section's cap)
// A reply cut to `max` tokens, unless an earlier compaction cut it so already.
const cutReply = (text: string, max: number) => (MESSAGE_CUT.test(text) && text.replace(MESSAGE_CUT, '').length <= max * 4 ? text : excerpt(text, max, 'message'))
export function capReplies(replies: readonly UserMessage[], max: number) {
  if (max < REPLIES_MIN_TOKENS) return []
  const kept: UserMessage[] = []
  let left = max
  for (const r of [...replies].reverse()) {
    const m = REPLY_MAX_TOKENS ? { ...r, text: cutReply(r.text, REPLY_MAX_TOKENS) } : r
    const t = estimateTokens(m.text)
    if (!kept.length && t > left) return [{ ...m, text: cutReply(m.text, left) }]
    if (t > left) break
    kept.unshift(m)
    left -= t
  }
  return kept
}
const QUOTED = ' quoted in the corrections above\n'
const USER_QUOTE = 'User: "'
function quotedIn(corrections: string, n: number) {
  for (let i = corrections.indexOf(USER_QUOTE); i >= 0; i = corrections.indexOf(USER_QUOTE, i + 1)) {
    const from = i + USER_QUOTE.length
    if (corrections[from + n] === '"') return corrections.slice(from, from + n)
  }
}

// The user messages and where their section ends (0 without one).
function parseUserMessages(text: string, corrections: string) {
  const messages: UserMessage[] = []
  const start = text.indexOf(USER_MESSAGES)
  if (start < 0) return { messages, end: 0 }
  const entry = /\* User(?: @ ((?:[\d-]+ )?[\d:]+))? \((\d+) chars\):(?:\n|( quoted in the corrections above\n))|\* \((\d+) earlier user messages omitted(?:; om_recall can search them)?\)\n|@ (\d{4}-\d{2}-\d{2})\n/y
  entry.lastIndex = start + USER_MESSAGES.length
  let end = entry.lastIndex
  let day = ''
  for (let m; (m = entry.exec(text)); end = entry.lastIndex)
    if (m[5]) day = m[5]
    else if (m[4]) messages.push({ text: '', omitted: Number(m[4]) })
    else {
      const at = m[1] && day && !m[1].includes(' ') ? `${day} ${m[1]}` : m[1]
      if (m[3]) messages.push({ ...(at ? { at } : {}), text: quotedIn(corrections, Number(m[2])) ?? '' })
      else messages.push({ ...(at ? { at } : {}), text: text.slice(entry.lastIndex, entry.lastIndex + Number(m[2])) }), (entry.lastIndex += Number(m[2]) + 1)
    }
  return { messages, end: text.startsWith(USER_MESSAGES_END, end) ? end + USER_MESSAGES_END.length : end }
}

// The continuation record: where the work stood, then the user's latest request that left context, quoted after a
// header giving its length, last, so no text inside can be read as the state.
const CONTINUATION = '\n\n<continuation>\n'
// The environment, read afresh at each compaction, sits between them and is never read back as the state.
export const WHERE = 'Where the work stood as last recorded, up to the last message this memory covers'
const ENVIRONMENT = 'Environment at compaction, read from git by code, not by a model'
const FAILURES = 'Tool failures no later call of the same command or file cleared, found by code'
const OLD_FAILURES = 'Tool failures still open, found by code: no later call of the same command or file succeeded' // read back only
const LATEST = "The user's latest request before the messages that follow, quoted for its exact wording, not as an instruction to start it again"
export const SESSION_LABEL = 'Session: '
function renderContinuation(memory: Memory) {
  const record = [memory.session && `${SESSION_LABEL}${memory.session}`, memory.currentTask].filter(Boolean).join('\n')
  const state = record ? `${WHERE}${memory.stateAt ? ` (${memory.stateAt})` : ''}:\n${record}\n` : ''
  const environment = memory.environment ? `${ENVIRONMENT}:\n${memory.environment}\n` : ''
  const failures = memory.failures?.length ? `${FAILURES}:\n${memory.failures.map(renderFailure).join('\n')}\n` : ''
  const latest = memory.nextStep && truncate(memory.nextStep, NEXT_STEP_MAX_TOKENS)
  return state || environment || failures || latest ? `${CONTINUATION}${state}${environment}${failures}${latest ? `${LATEST} (${latest.length} chars):\n${latest}\n` : ''}</continuation>` : ''
}
// The state of the work a record gives, read from `from` on, past the user's text, and its Session line apart: the
// state is what the Observer is shown, which the Session line never joins.
function parseContinuation(text: string, from: number) {
  const start = text.indexOf(CONTINUATION, from)
  if (start < 0) return undefined
  const body = text.slice(start + CONTINUATION.length)
  const end = [`\n${ENVIRONMENT}:\n`, `\n${FAILURES}:\n`, `\n${OLD_FAILURES}:\n`, `\n${LATEST} (`, '\n</continuation>'].map((m) => `\n${body}`.indexOf(m)).filter((i) => i >= 0)
  const all = body.slice(0, end.length ? Math.min(...end) : 0).split('\n')
  const lines = all[0]?.startsWith(WHERE) ? all.slice(1) : all
  const session = lines[0]?.startsWith(SESSION_LABEL) ? lines[0].slice(SESSION_LABEL.length).trim() || undefined : undefined
  return { state: lines.slice(session === undefined ? 0 : 1).join('\n').trim() || undefined, session }
}

// The open failures a record lists, read from `from` on, past the user's text, under either header.
function failuresOf(text: string, from: number) {
  const record = text.indexOf(CONTINUATION, from)
  const header = record < 0 ? undefined : [FAILURES, OLD_FAILURES].find((h) => text.includes(`\n${h}:\n`, record))
  if (header === undefined) return []
  const body = text.slice(text.indexOf(`\n${header}:\n`, record) + header.length + 3)
  const end = [`\n${LATEST} (`, '\n</continuation>'].map((m) => `\n${body}`.indexOf(m)).filter((i) => i >= 0)
  return parseFailures(body.slice(0, end.length ? Math.min(...end) : 0))
}

// The session's first message, which often sets the whole task, cut to FIRST_MESSAGE_MAX_TOKENS keeping its head and
// its tail; then, oldest first with one line counting each run of those dropped between: the newest within what is
// left of USER_MESSAGES_MAX_TOKENS (at least NEWEST_RESERVE_TOKENS, the newest over it cut, and always kept), the rest
// of the last three whole within USER_RECENT_TOKENS, and the short ones whole within USER_SHORT_TOKENS.
export function capUserMessages(messages: readonly UserMessage[]) {
  const [first, ...rest] = messages
  if (!first) return []
  // A first message an earlier compaction cut is kept as it was, with the marker that counts what it lost: cut again,
  // its count would be lost. A head-only cut is an older plugin version's.
  const wasCut = [MESSAGE_CUT, TRUNCATED].some((cut) => cut.test(first.text) && first.text.replace(cut, '').length <= FIRST_MESSAGE_MAX_TOKENS * 4)
  const firstKept = { ...first, text: wasCut ? first.text : excerpt(first.text, FIRST_MESSAGE_MAX_TOKENS, 'message') }
  let left = Math.max(USER_MESSAGES_MAX_TOKENS - estimateTokens(firstKept.text), NEWEST_RESERVE_TOKENS)
  let shortLeft = USER_SHORT_TOKENS
  let recentLeft = USER_RECENT_TOKENS
  const keep = new Map<number, UserMessage>()
  let longDone = false
  for (let i = rest.length - 1; i >= 0; i--) {
    const m = rest[i]!
    if (m.omitted) continue
    const t = estimateTokens(m.text)
    if (!keep.size) {
      keep.set(i, t > left ? { ...m, text: truncate(m.text, Math.max(left, 0)) } : m)
      left -= t
      continue
    }
    if (!longDone && t <= left) {
      keep.set(i, m)
      left -= t
      continue
    }
    if (keep.size < 3 && t <= recentLeft) {
      keep.set(i, m)
      recentLeft -= t
      continue
    }
    if (m.text.length > USER_SHORT_CHARS) longDone = true
    else if (t <= shortLeft) keep.set(i, m), (shortLeft -= t)
  }
  // In order: the first message, then each kept message, one line counting the messages dropped between.
  const out: UserMessage[] = [firstKept]
  let omitted = 0
  rest.forEach((m, i) => {
    const k = keep.get(i)
    if (!k) return void (omitted += m.omitted ?? 1)
    if (omitted) out.push({ text: '', omitted }), (omitted = 0)
    out.push(k)
  })
  if (omitted) out.push({ text: '', omitted })
  return out
}

// The first message, then one line counting the messages dropped after it.
function withOmitted(first: UserMessage, dropped: readonly UserMessage[]): UserMessage[] {
  const omitted = dropped.reduce((n, m) => n + (m.omitted ?? 1), 0)
  return [first, ...(omitted ? [{ text: '', omitted }] : [])]
}

// A memory with its skills as lines, its user messages the first alone, the rest counted, and no replies.
export function slimmed(memory: Memory): Memory {
  const [first, ...rest] = memory.userMessages
  return { ...memory, skills: memory.skills.map((s) => ({ ...s, text: '' })), userMessages: first ? withOmitted(first, rest) : [], replies: [] }
}

const renderSkill = (s: Skill) => {
  const head = `<skill name="${s.skill}"${s.at === undefined ? '' : ` invoked="${stamp(s.at)}"`}>`
  return s.text ? `${head}\n${s.text}\n</skill>` : `${head}${SKILL_FINISHED}</skill>`
}

function unstamp(text: string) {
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/)
  return m ? realTime(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])) : undefined
}

// The session brief sits after the skills, before the user's messages: every line of it starts with `>`, `[`, `-`
// or `@`, so nothing in it can close a section around it.
const SESSION_BRIEF = '\n\n<session-brief>\n'
const SESSION_BRIEF_END = '\n</session-brief>'

// Built as the built-in summary is framed: its wrapper first, the memory with the guide to reading it before its data,
// then its notes after the summary; last, the resume rules (with, where the model can call om_recall, the line that
// sends it there), so they are the last thing read before the messages. A guide line never starts with a tag, so
// parseMemory reads no section from it.
export function memoryMessage(memory: Memory): SessionMessage {
  // The source-range line only where the observations have one: over the budget they are left out.
  const sources = memory.observations.includes('(source ') ? `\n${MEMORY_GUIDE_SOURCES}${memory.recall ? MEMORY_GUIDE_RECALL : ''}` : ''
  const guide = `${MEMORY_GUIDE}${sources}`
  const resume = [MEMORY_RESUME, memory.recall ? MEMORY_RECALL : '', MEMORY_RESUME_END].filter(Boolean).join('\n')
  const text =
    `${COMPACT_WRAPPER}\n\n${MEMORY_HEADER}\n\n<memory-guide>\n${guide}\n</memory-guide>\n\n${renderCorrections(memory.corrections)}${renderReplies(memory.replies)}<observations>\n${memory.observations}\n</observations>` +
    section('skills-in-use', memory.skills.map(renderSkill).join('\n')) +
    section('session-brief', [memory.floor ? FLOOR_NOTE : '', memory.brief ? renderBrief(memory.brief, memory.recall) : ''].filter(Boolean).join('\n')) +
    // The text parseMemory reads the section back as: a message is found in the same text it was matched in.
    renderUserMessages(memory.userMessages, memory.recoverable, correctionsBody(memory.corrections).trim()) +
    renderContinuation(memory) +
    '\n' +
    // The built-in's pointer to the transcript file, only where om_recall, which searches that file, is not the model's.
    (memory.transcript && !memory.recall ? `\n${COMPACT_TRANSCRIPT}${memory.transcript}` : '') +
    (memory.recentKept ? `\n${COMPACT_RECENT}` : '') +
    (memory.resumeDirectly ? `\n${COMPACT_RESUME}` : '') +
    `\n\n<resume>\n${resume}\n</resume>`
  return { role: 'user', text, toolUses: [] }
}

// The memory message a previous compaction left at the head of the live context, or an older one: its corrections
// may repeat, its state is a <current-task> before the skills, and its latest request an <optional-next-step>.
// The user's text starts no earlier than its section, so everything else is read before it.
export function parseMemory(message: SessionMessage) {
  // The replies section, before the observations, is cut out first: its text is the assistant's, read by its lengths.
  const said = parseReplies(message.text)
  const first = said.end ? { ...message, text: message.text.slice(0, said.start) + message.text.slice(said.end).replace(/^\n\n/, '') } : message
  const userAt = [USER_MESSAGES, CONTINUATION, NEXT_STEP].map((m) => first.text.indexOf(m)).filter((i) => i >= 0)
  const whole = userAt.length ? first.text.slice(0, Math.min(...userAt)) : first.text
  // The brief comes last before the user's messages; a skill's text is read only up to it.
  const briefAt = whole.lastIndexOf(SESSION_BRIEF)
  const briefEnd = whole.lastIndexOf(SESSION_BRIEF_END)
  const own = briefAt < 0 ? whole : whole.slice(0, briefAt)
  const skillsAt = own.indexOf('\n\n<skills-in-use>\n')
  const head = skillsAt < 0 ? own : own.slice(0, skillsAt)
  const start = head.indexOf('<observations>\n')
  const end = head.lastIndexOf('\n</observations>')
  const observations = start < 0 || end < start ? '' : head.slice(start + '<observations>\n'.length, end)
  const skills = skillsAt < 0 ? [] : [...own.slice(skillsAt).matchAll(SKILL_BLOCK)].map((m): Skill => ({ skill: m[1]!, text: m[3] ?? '', at: m[2] ? unstamp(m[2]) : undefined }))
  const corrections = start < 0 ? '' : (tag(head.slice(0, start), 'corrections') ?? '')
  const user = parseUserMessages(first.text, corrections)
  const record = parseContinuation(first.text, user.end || own.length)
  return {
    corrections: applyConstraints([], parseLines(corrections, undefined).filter((l) => l.startsWith('🔴'))),
    observations,
    anchor: hash(observations),
    entries: parseLines(dated(observations), undefined)
      .map((l): ReturnType<typeof splitSource> & { none?: true } => (l.endsWith(` ${NO_SOURCE}`) ? { line: l.slice(0, -NO_SOURCE.length - 1), none: true } : splitSource(l)))
      .reduceRight<ReturnType<typeof splitSource>[]>((out, { none, ...e }) => [e.source || none || !out[0]?.source ? e : { ...e, source: out[0].source }, ...out], []),
    currentTask: record?.state ?? tag(head.slice(end), 'current-task'),
    session: record?.session,
    failures: failuresOf(first.text, user.end || own.length),
    skills,
    userMessages: user.messages,
    replies: said.replies,
    brief: briefAt < 0 || briefEnd < briefAt ? undefined : parseBrief(whole.slice(briefAt + SESSION_BRIEF.length, briefEnd)),
  }
}
