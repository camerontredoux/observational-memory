// om_recall: search, read and outline the session's whole transcript. The transcript is the chain of files the
// session wrote (Claude Code may continue a session in a new file, the old one ending in a `continued-in` row), each
// block addressed `<file>:<line>`, the file's first 8 characters and the line of the JSONL row: rows are only ever
// appended, so a reference holds across compactions and moves. With no transcript file, the live history is read
// instead, its blocks addressed `#<row>`. No `$` here: the engine never lets it cross an import, so the caller passes
// what reads files as `RecallIo`.
import type { SessionMessage } from 'claude-code'
import { COMPACT_WRAPPER, MEMORY_MARK } from './prompts'
import { grouped, plural } from './stats'

const RECALL_TOOL = 'om_recall'
export const SEARCH_MAX_HITS = 20
const SEARCH_MAX_CHARS = 10_000 // about 2.5k tokens of hits
const SEARCH_LINES_PER_HIT = 3
const SEARCH_LINE_CHARS = 200
const SEARCH_LINE_GAP = 2 // lines shown from one hit are further apart than this
const SEARCH_BUDGET_MS = 3_000 // a regex search's time, checked between blocks
const REGEX_TEXT_MAX = 10_000 // characters one regex test runs over
const ABSENT_MAX = 20 // absent terms named
const READ_MAX_LINES = 200
const READ_MAX_CHARS = 12_000 // one page of a block, about 3k tokens
const NEIGHBORS_MAX = 5 // blocks before or after a read block
const NEIGHBOR_MAX_CHARS = 1_000
const OUTLINE_MAX_LINES = 120
const OUTLINE_MAX_CHARS = 12_000
const FILES_MAX_LINES = 100
const FILES_REFS = 5 // the newest blocks shown per file and action; the rest counted
const WRAP = 1_000 // a longer line counts as several, so every line fits a page
const RESPONSE_MAX_CHARS = 16_000 // all of one call's response, about 4k tokens
const ARG_MAX_CHARS = 500
const TURN_CALLS = 3 // om_recall calls in one turn before a reminder to answer
const CHAIN_MAX_FILES = 20
const TAG = 8 // characters of a session or agent id naming its file in a reference

export type RecallIo = {
  read: (path: string) => Promise<string>
  list: (dir: string) => Promise<string[]> // entry names; none when the directory is missing
  // The name, among `names` in `dir`, of the file that says the session `id` continued it.
  continuing: (dir: string, names: readonly string[], id: string) => Promise<string | undefined>
  now: () => Promise<number> // milliseconds since the epoch
  // For a TranscriptCache: a file's size in bytes and its mtime, and its text from a byte offset on.
  stat?: (path: string) => Promise<{ size: number; mtime: number }>
  readFrom?: (path: string, offset: number) => Promise<string>
}
export type RecallInput = {
  query?: unknown
  limit?: unknown
  mode?: unknown
  ref?: unknown
  lines?: unknown
  before?: unknown
  after?: unknown
  from?: unknown
  to?: unknown
  subagents?: unknown
}
export type Mode = 'search' | 'read' | 'outline' | 'files'
export type RecallResult = { mode: Mode; text: string; matches: number }

type Kind = 'user' | 'assistant' | 'call' | 'result' | 'memory' | 'summary'
type Block = {
  ref: string
  kind: Kind
  text: string
  time?: number
  tool?: string
  input?: unknown // a call's
  callId?: string // a call's tool_use id
  error?: boolean
  meta?: boolean // a row the engine injected, as an image's note
  own?: boolean // om_recall's own call or result
  asking?: boolean // the newest prompt, the one that asked: never a match
  pair?: Block // a call's result, a result's call
  agent?: string // the tag of the subagent a call started
}
type Thread = { tag: string; label: string; blocks: Block[]; path?: string; loaded: boolean }
type Corpus = { main: Thread; files: string[]; subagents: Thread[]; live: boolean; note?: string; load: (t: Thread) => Promise<void>; now: () => Promise<number> }

// A v0.4.1 memory message starts with the header; later ones with the built-in wrapper before it. Shared with
// register.ts's `isMemory`.
export const isMemoryText = (text: string) => text.startsWith(MEMORY_MARK) || text.startsWith(`${COMPACT_WRAPPER}\n\n${MEMORY_MARK}`)
// Known wrappers the host or another session delivers into context, not any text that merely starts with a tag (a
// real user message may itself start with one). Read by `typedText`, which register.ts's `typed` shares, so a row
// counts as a genuine prompt or an injected one the same way in compaction and in recall. Add a name here only once
// it is confirmed injected (a tag the installed host itself emits to wrap content that is not a prompt addressed to
// the assistant, whoever authored it: `<user-memory-input>` wraps the user's own `#` memory note, not a request to
// act on).
// `mcp-resource-update` and `mcp-polling-update` carry attributes (`server=`, `uri=`, ...) before their closing
// `>`, so the tag alone is optionally followed by an attribute list, for every name here.
export const INJECTED_WRAPPER =
  /^<(?:task-notification|local-command-caveat|local-command-stdout|local-command-stderr|command-name|command-message|command-args|fork-boilerplate|bash-stdout|bash-input|bash-stderr|cross-session-message|teammate-message|user-memory-input|mcp-resource-update|mcp-polling-update|channel)(?:\s[^>]*)?>/
// The markers the host puts before a prompt for the images pasted into it (`[Image #10]`), or alone in an image note
// (`[Image: source: /tmp/….png]`).
const IMAGE_MARKERS = /^(?:\s*\[Image(?: #\d+|: [^\]\n]*)\])+\s*/
// What the user typed: not an injected block (a system reminder, a named wrapper, an image note with no text).
// Shared with register.ts's `typed`.
export function typedText(text: string) {
  const t = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()
  const said = t.replace(IMAGE_MARKERS, '')
  return !said || INJECTED_WRAPPER.test(said) ? undefined : t
}
const pad = (n: number) => String(n).padStart(2, '0')
const day = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const clock = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const stamp = (ms: number) => `${day(ms)} ${clock(ms)}`
const oneLine = (text: string, max: number) => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}
const stem = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.jsonl$/, '')
// A file's name in a reference: the first 8 characters of a session or agent id, else its whole name.
const tagFor = (id: string) => (/^[0-9a-f]{8}[0-9a-f-]{8,}$/i.test(id) ? id.slice(0, TAG) : id)
const dirOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/'))) || '.'

// A block's lines, each longer one cut every WRAP characters: the numbering search, read and paging share. `starts`
// is each display line's offset in the raw text, so a match found in the raw text can be placed back on a line.
function splitLines(text: string) {
  const lines: string[] = []
  const starts: number[] = []
  let raw = 0
  for (const line of text.split('\n')) {
    for (let i = 0; i === 0 || i < line.length; i += WRAP) {
      lines.push(line.slice(i, i + WRAP))
      starts.push(raw + i)
    }
    raw += line.length + 1 // the '\n' split() consumed
  }
  return { lines, starts }
}
function linesOf(text: string) {
  return splitLines(text).lines
}

// A tool's input, one `key: value` per field, a string as it is, so a command or a file's text reads by its lines.
function renderInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return JSON.stringify(input ?? {})
  return Object.entries(input)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')
}

// Terminal colour and cursor codes in a command's output: noise to read, and they split the words a search looks for.
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g

function resultText(content: unknown): string {
  if (typeof content === 'string') return content.replace(ANSI, '')
  if (Array.isArray(content))
    return content
      .map((b: { type?: string; text?: string; tool_name?: string }) =>
        b.type === 'text' ? (b.text ?? '').replace(ANSI, '') : b.type === 'image' ? '[image]' : b.type === 'tool_reference' ? `[tool ${b.tool_name ?? ''}]` : `[${b.type ?? 'block'}]`,
      )
      .join('\n')
  return content && typeof content === 'object' ? '[redacted]' : ''
}

type Row = {
  type?: string
  subtype?: string
  uuid?: string
  isSidechain?: boolean
  isMeta?: boolean
  isCompactSummary?: boolean
  timestamp?: string
  continuedInSessionId?: string
  message?: { content?: string | Content[] }
}
type Content = { type: string; text?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; content?: unknown; is_error?: boolean }
// What the files of one thread share while they are read in order: the rows seen, the calls awaiting results, and
// the content kept in the model's context, matched to recognize a compaction's copy of it. `replay` is what a
// boundary may copy (the content before it, still in context); `seg` is what has been seen since, itself replayable
// by a later boundary. Content equality alone, unbounded, could treat a genuinely new event as a copy of an
// unrelated older one; bounding the match to content still in context, and feeding a recognized copy back into
// `seg`, keeps a message a second compaction copies again from being read as new.
type Seen = { uuids: Set<string>; replay: Set<string>; seg: Set<string>; calls: Map<string, Block> }
const newSeen = (): Seen => ({ uuids: new Set(), replay: new Set(), seg: new Set(), calls: new Map() })

function pairUp(seen: Seen, b: Block, callId: string) {
  const call = seen.calls.get(callId)
  if (!call) return
  b.pair = call
  call.pair = b
  b.tool = call.tool
  b.own = call.own
}

type Part = { b: Omit<Block, 'ref'>; callId?: string; resultOf?: string }
const callBlock = (base: Partial<Block>, tool: string, input: unknown, callId?: string): Omit<Block, 'ref'> => ({
  ...base,
  kind: 'call',
  tool,
  input,
  ...(callId ? { callId } : {}),
  text: renderInput(input),
  ...(tool.endsWith(`__${RECALL_TOOL}`) ? { own: true } : {}),
})
// A row's blocks, numbered `.1`, `.2` after the row's reference when it holds several.
function addParts(ref: string, parts: readonly Part[], seen: Seen, out: Block[]) {
  parts.forEach(({ b, callId, resultOf }, k) => {
    const block: Block = { ref: parts.length > 1 ? `${ref}.${k + 1}` : ref, ...b }
    if (callId) seen.calls.set(callId, block)
    if (resultOf) pairUp(seen, block, resultOf)
    out.push(block)
  })
}

// Where the parse of a file stands, for parsing on from there: the line it is on, whether that line's row was parsed
// before its newline was written, and whether the rows after a compaction boundary are still copies.
type At = { line: number; open: boolean; copying: boolean }

// One transcript file's user and assistant rows as blocks. A row a newer file copied from an older one (the same
// uuid) is read once, from the older file; so are the messages a compaction writes again after its boundary. `used`
// is how much of `text` was parsed for good: through its last newline, and a last row already whole.
function parseFile(tag: string, text: string, seen: Seen, sidechain: boolean, from: At = { line: 0, open: false, copying: false }) {
  const blocks: Block[] = []
  let continuedIn: string | undefined
  let copying = from.copying
  let last = false
  const lines = text.split('\n')
  for (let n = from.open ? 1 : 0; n < lines.length; n++) {
    let r: Row
    try {
      r = JSON.parse(lines[n]!) as Row
    } catch {
      continue // a line still being written
    }
    if (n === lines.length - 1) last = true
    if (r.type === 'continued-in' && r.continuedInSessionId) continuedIn = r.continuedInSessionId
    if (r.type === 'system' && r.subtype === 'compact_boundary') {
      copying = true
      seen.replay = seen.seg
      seen.seg = new Set()
    }
    if ((r.type !== 'user' && r.type !== 'assistant') || (r.isSidechain && !sidechain)) continue
    if (r.uuid) {
      if (seen.uuids.has(r.uuid)) continue
      seen.uuids.add(r.uuid)
    }
    const content = r.message?.content
    // A compaction writes its kept messages again without their thinking (left as "(no content)") or call metadata.
    const parts = (typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : []).filter(
      (p: Content) => p.type !== 'thinking' && p.type !== 'redacted_thinking' && !(p.type === 'text' && (!p.text || p.text === '(no content)')),
    )
    if (!parts.length) continue
    const key = `${r.type}\n${parts.map((p) => { const id = p.id ?? p.tool_use_id; return id ? originalId(id) : (p.text ?? p.type) }).join('\n')}`
    const summary = r.type === 'user' && parts.some((p) => p.type === 'text' && p.text?.startsWith(COMPACT_WRAPPER))
    const memory = parts.some((p) => p.type === 'text' && p.text && isMemoryText(p.text))
    const copy = copying && !summary && !memory && seen.replay.has(key)
    if (copying && !summary && !memory && !copy) copying = false
    seen.seg.add(key)
    if (copy) continue
    const time = r.timestamp ? Date.parse(r.timestamp) : NaN
    const base = { ...(Number.isNaN(time) ? {} : { time }), ...(r.isMeta ? { meta: true } : {}) }
    const made: Part[] = []
    for (const p of parts) {
      if (p.type === 'text' && p.text) {
        const kind: Kind = r.type === 'assistant' ? 'assistant' : isMemoryText(p.text) ? 'memory' : summary || r.isCompactSummary ? 'summary' : 'user'
        made.push({ b: { ...base, kind, text: p.text } })
      } else if (p.type === 'tool_use' || p.type === 'server_tool_use') made.push({ b: callBlock(base, p.name ?? 'tool', p.input, p.id && originalId(p.id)), callId: p.id && originalId(p.id) })
      else if (p.type.endsWith('tool_result'))
        made.push({ b: { ...base, kind: 'result', text: resultText(p.content), ...(p.is_error ? { error: true } : {}) }, resultOf: p.tool_use_id && originalId(p.tool_use_id) })
    }
    addParts(`${tag}:${from.line + n + 1}`, made, seen, blocks)
  }
  const cut = text.lastIndexOf('\n') + 1
  const at: At = { line: from.line + lines.length - 1, open: last || (from.open && cut === 0), copying }
  return { blocks, continuedIn, used: last ? text.length : cut, at }
}

// The newest prompt is the one that asked: search never answers with it, whole, at message scope (every part of its
// row, not only the part that decided it was the asking one, so a structured prompt's other text parts are excluded
// too). A cached parse's mark from an earlier call goes first.
function markAsking(blocks: readonly Block[]) {
  for (const b of blocks) if (b.asking) delete b.asking
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]!
    if (b.kind !== 'user' || b.meta || typedText(b.text) === undefined) continue
    const base = b.ref.replace(/\.\d+$/, '')
    for (const x of blocks) if (x.ref === base || x.ref.startsWith(`${base}.`)) x.asking = true
    return
  }
}

// The session's files, oldest first: each found by the `continued-in` row that names the one after it.
// The chain's files, oldest to newest, only as far back as CHAIN_MAX_FILES reaches and a link stays readable.
// `truncated` and `unreadableLink` say why it may stop short of the session's actual start; `discoveryFailed` says
// the directory listing itself could not be read, so the walk may have missed a link that was really there.
async function chainOf(io: RecallIo, path: string) {
  const dir = dirOf(path)
  let names: string[] = []
  let discoveryFailed = false
  try {
    names = (await io.list(dir)).filter((n) => n.endsWith('.jsonl'))
  } catch {
    discoveryFailed = true
  }
  const files = [path]
  let unreadableLink = false
  for (let id = stem(path); files.length < CHAIN_MAX_FILES; ) {
    const taken = new Set(files.map((f) => f.slice(f.lastIndexOf('/') + 1)))
    let prev: string | undefined
    try {
      prev = await io.continuing(dir, names.filter((n) => !taken.has(n)), id)
    } catch {
      unreadableLink = true
      break
    }
    if (!prev) break
    files.unshift(`${dir}/${prev}`)
    id = stem(prev)
  }
  // The walk above stops as soon as it fills the cap, whether or not a predecessor really remains: check once more,
  // without reading it, only to report the gap truthfully.
  let truncated = false
  if (files.length === CHAIN_MAX_FILES) {
    const taken = new Set(files.map((f) => f.slice(f.lastIndexOf('/') + 1)))
    const more = await io.continuing(dir, names.filter((n) => !taken.has(n)), stem(files[0]!)).catch(() => undefined)
    if (more) truncated = true
  }
  return { dir, names, files, truncated, unreadableLink, discoveryFailed }
}

// What om_recall keeps between its calls (loadTranscript's `cache`): the chain's files as parsed so far, and the
// blocks and state they share. Rows are only ever appended, and a file continued in another no longer grows: each
// file but the newest is taken as parsed while its size and mtime hold, and the newest is parsed on from the byte
// its last whole row ended at, as it has grown by this very call's row.
type Parsed = At & { path: string; size: number; mtime: number; offset: number; continuedIn?: string }
export type TranscriptCache = { parsed?: { files: Parsed[]; seen: Seen; blocks: Block[] } }
const utf8Bytes = (text: string) => new TextEncoder().encode(text).length

// Whether the cached parse still stands: the chain starts with its files, those it found after them still listed,
// each file but its newest unchanged and the newest no shorter than what was parsed of it.
async function reusable(io: RecallIo, cached: NonNullable<TranscriptCache['parsed']>, files: readonly string[], names: readonly string[]) {
  const listed = (p: Parsed, k: number) => (k < files.length ? p.path === files[k] : names.includes(p.path.slice(p.path.lastIndexOf('/') + 1)))
  if (!cached.files.every(listed)) return false
  const now = await Promise.all(cached.files.map((p) => io.stat!(p.path).catch(() => undefined)))
  const newest = cached.files.length - 1
  return cached.files.every((p, k) => {
    const s = now[k]
    return !!s && (k < newest ? s.size === p.size && s.mtime === p.mtime : s.size >= Math.max(p.size, p.offset))
  })
}

// The session's whole transcript from its newest file: the files before it, and after it when it was continued.
export async function loadTranscript(io: RecallIo, path: string, options: { asking?: boolean; cache?: TranscriptCache } = {}): Promise<Corpus> {
  // Taken while this call parses on from it: a call beside this one parses afresh rather than into the same state.
  const cache = io.stat && io.readFrom ? options.cache : undefined
  const cached = cache?.parsed
  if (cache) delete cache.parsed
  const { dir, names, files, truncated: backTruncated, unreadableLink: backLinkUnreadable, discoveryFailed } = await chainOf(io, path)
  const pathIndex = files.indexOf(path) // stable: only files after it are ever appended below
  const kept = cached && (await reusable(io, cached, files, names)) ? cached : undefined
  const seen = kept?.seen ?? newSeen()
  const blocks: Block[] = kept?.blocks ?? []
  const record: Parsed[] = []
  let cacheable = !!cache
  const unread = new Set<number>()
  let forwardTruncated = false
  let forwardUnreadable = false
  let backContentUnreadable = false
  for (let i = 0; i < files.length; i++) {
    const tag = tagFor(stem(files[i]!))
    const prior = kept?.files[i]
    let continuedIn = prior?.continuedIn
    if (prior && i < kept!.files.length - 1) record.push(prior) // parsed before, and unchanged since
    else {
      const stat = cache && (await io.stat!(files[i]!).catch(() => undefined))
      if (!stat) cacheable = false
      let text: string
      try {
        text = prior ? await io.readFrom!(files[i]!, prior.offset) : await io.read(files[i]!)
      } catch (error) {
        if (files[i] === path) throw error // the file the caller asked for: let it fall back to the live history, as before
        cacheable = false
        if (i < pathIndex) {
          // an older predecessor, not the requested file or anything after it: note the gap and keep reading forward
          backContentUnreadable = true
          unread.add(i)
          continue
        }
        files.length = i // only the files actually read are counted
        forwardUnreadable = true
        break
      }
      const parsed = parseFile(tag, text, seen, false, prior)
      blocks.push(...parsed.blocks)
      continuedIn = parsed.continuedIn ?? continuedIn
      if (stat) {
        const offset = (prior?.offset ?? 0) + utf8Bytes(text.slice(0, parsed.used))
        record.push({ ...parsed.at, path: files[i]!, size: stat.size, mtime: stat.mtime, offset, ...(continuedIn ? { continuedIn } : {}) })
      }
    }
    const next = continuedIn && `${continuedIn}.jsonl`
    if (i === files.length - 1 && next && names.includes(next) && !files.includes(`${dir}/${next}`)) {
      if (files.length < CHAIN_MAX_FILES) files.push(`${dir}/${next}`)
      else forwardTruncated = true
    }
  }
  if (unread.size) files.splice(0, files.length, ...files.filter((_, i) => !unread.has(i)))
  if (cache && cacheable) cache.parsed = { files: record, seen, blocks }
  if (options.asking) markAsking(blocks)
  // Each file's subagents: `<id>/subagents/agent-<agent id>.jsonl`, with a `.meta.json` naming the call that started it.
  const subagents: Thread[] = []
  for (const file of files) {
    const sub = `${dir}/${stem(file)}/subagents`
    for (const name of (await io.list(sub).catch(() => [])).filter((n) => /^agent-.+\.jsonl$/.test(n))) {
      const id = name.slice('agent-'.length, -'.jsonl'.length)
      type Meta = { agentType?: string; description?: string; toolUseId?: string }
      const meta: Meta = await io
        .read(`${sub}/agent-${id}.meta.json`)
        .then((t) => JSON.parse(t) as Meta)
        .catch(() => ({}))
      const tag = tagFor(id)
      subagents.push({ tag, label: `subagent ${[meta.agentType, meta.description].filter(Boolean).join(': ') || id}`, blocks: [], path: `${sub}/${name}`, loaded: false })
      const call = meta.toolUseId ? seen.calls.get(meta.toolUseId) : undefined
      if (call) call.agent = tag
    }
  }
  const notes = [
    discoveryFailed && `the transcript directory could not be listed, so an older link in its chain may be missing`,
    (backTruncated || forwardTruncated) && `the chain has more than ${CHAIN_MAX_FILES} files; only the newest ${CHAIN_MAX_FILES} are read`,
    (backLinkUnreadable || backContentUnreadable || forwardUnreadable) && `a chain file could not be read, leaving a gap in coverage`,
  ].filter((s): s is string => !!s)
  return {
    // A copy of the cached blocks, which the next call appends to.
    main: { tag: 'main', label: 'session', blocks: cache ? [...blocks] : blocks, loaded: true },
    files: files.map((f) => tagFor(stem(f))),
    subagents,
    live: false,
    ...(notes.length ? { note: notes.join('; ') } : {}),
    load: async (t) => {
      if (t.loaded || !t.path) return
      t.blocks = parseFile(t.tag, await io.read(t.path), newSeen(), true).blocks
      t.loaded = true
    },
    now: io.now,
  }
}

// The live history, when there is no transcript file to read: rows addressed by their index, which a compaction moves.
export function liveTranscript(rows: readonly SessionMessage[], times: readonly (number | undefined)[], capped: boolean, now: () => Promise<number>): Corpus {
  const seen = newSeen()
  const blocks: Block[] = []
  rows.forEach((m, i) => {
    const base = times[i] === undefined ? {} : { time: times[i] }
    const made: Part[] = []
    if (m.text) {
      const kind: Kind = m.role === 'assistant' ? 'assistant' : isMemoryText(m.text) ? 'memory' : m.text.startsWith(COMPACT_WRAPPER) ? 'summary' : 'user'
      made.push({ b: { ...base, kind, text: m.text } })
    }
    for (const u of m.toolUses) made.push({ b: callBlock(base, u.tool, u.input, originalId(u.tool_use_id)), callId: originalId(u.tool_use_id) })
    for (const r of m.toolResults ?? []) made.push({ b: { ...base, kind: 'result', text: r.text, ...(r.isError ? { error: true } : {}) }, resultOf: originalId(r.tool_use_id) })
    addParts(`#${i}`, made, seen, blocks)
  })
  markAsking(blocks)
  return {
    main: { tag: 'main', label: 'session', blocks, loaded: true },
    files: [],
    subagents: [],
    live: true,
    ...(capped ? { note: `only the newest ${grouped(rows.length)} messages of the live history are readable` } : {}),
    load: async () => {},
    now,
  }
}

// A compaction hands its kept tool calls back under fresh ids, `<id>__om<tag>`, so the transcript can tell the copies
// it draws from the originals; the part before is the original id, which every lookup and copy check goes by.
export const COPY_ID = '__om'
export const originalId = (id: string) => id.split(COPY_ID)[0]!

// The om_recall reference of each row of a compacted span, for the session brief: a tool call by its id, a message
// by its text (the newest block that reads the same). `agentId` names a subagent's own transcript. None from the live
// history, whose `#<row>` a compaction moves, nor for a row the transcript files do not hold.
export async function refsOf(c: Corpus, rows: readonly SessionMessage[], agentId?: string): Promise<(row: number, callId?: string) => string | undefined> {
  if (c.live) return () => undefined
  const t = agentId === undefined ? c.main : c.subagents.find((s) => s.tag === tagFor(agentId))
  if (!t) return () => undefined
  await c.load(t)
  const calls = new Map<string, string>()
  const texts = new Map<string, string>()
  for (const b of t.blocks)
    if (b.kind === 'call' && b.callId) calls.set(b.callId, b.ref)
    else if (b.kind === 'user' || b.kind === 'assistant') texts.set(`${b.kind}\n${b.text.trim()}`, b.ref)
  return (row, callId) => {
    if (callId !== undefined) return calls.get(originalId(callId))
    const m = rows[row]
    return m && m.text.trim() ? texts.get(`${m.role}\n${m.text.trim()}`) : undefined
  }
}

// ---- Addressing -------------------------------------------------------------------------------------------------

// A tag as given matches a file's tag: the same, the whole id it was cut from, or cut shorter still (4 characters on).
const sameTag = (given: string, tag: string) => given === tag || (tag.length === TAG && given.length > TAG && given.startsWith(tag)) || (given.length >= 4 && tag.startsWith(given))
const tagOf = (ref: string) => (ref.startsWith('#') ? 'main' : ref.split(':')[0]!)

// The thread a reference or tag names: the main chain unless it names a subagent.
async function threadFor(c: Corpus, spec: string | undefined) {
  if (!spec) return c.main
  const tag = tagOf(spec.trim())
  const sub = c.subagents.find((s) => sameTag(tag, s.tag))
  if (!sub) return c.main
  await c.load(sub)
  return sub
}

const REF = /^(#|[\w.-]+:)(\d+)(?:\.(\d+))?$/i
// The index of the block a reference names: `x:12` finds `x:12.1` when the row holds several blocks. A tag longer or
// shorter than TAG still matches. `near`, for a range's bound: a line with no block (a row that is not a message)
// finds the first block after it, or with `last` the last before it.
function indexOf(t: Thread, ref: string, last = false, near = false) {
  const m = ref.trim().match(REF)
  if (!m) return -1
  const line = Number(m[2])
  const sub = m[3] === undefined ? undefined : Number(m[3])
  const at = (b: Block) => {
    const bm = b.ref.match(REF)!
    const same = m[1] === '#' ? bm[1] === '#' : bm[1] !== '#' && sameTag(m[1]!.slice(0, -1), bm[1]!.slice(0, -1))
    if (!same) return undefined
    return Number(bm[2]) - line || (sub === undefined ? 0 : Number(bm[3] ?? 1) - sub)
  }
  const fits = (d: number | undefined) => d !== undefined && (d === 0 || (near && (last ? d < 0 : d > 0)))
  if (last) {
    for (let i = t.blocks.length - 1; i >= 0; i--) if (fits(at(t.blocks[i]!))) return i
    return -1
  }
  return t.blocks.findIndex((b) => fits(at(b)))
}

// Each block's time, or the time of the block before it.
function timesOf(t: Thread) {
  let last: number | undefined
  return t.blocks.map((b) => (last = b.time ?? last))
}

// A bound of a range: a reference, `YYYY-MM-DD HH:MM`, or `HH:MM` on the thread's first day. Inclusive both ends.
function bound(t: Thread, spec: string, end: boolean): number | string {
  const s = spec.trim()
  const times = timesOf(t)
  const full = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/)
  const hm = s.match(/^(\d{1,2}):(\d{2})$/)
  if (full || hm) {
    const first = times.find((x) => x !== undefined)
    if (first === undefined) return 'no block in this transcript has a time; give a reference instead'
    const d = new Date(first)
    const ms = full
      ? new Date(Number(full[1]), Number(full[2]) - 1, Number(full[3]), Number(full[4]), Number(full[5])).getTime()
      : new Date(d.getFullYear(), d.getMonth(), d.getDate(), Number(hm![1]), Number(hm![2])).getTime()
    if (!end) {
      const i = times.findIndex((x) => x !== undefined && x >= ms)
      return i < 0 ? t.blocks.length : i
    }
    for (let i = times.length - 1; i >= 0; i--) if (times[i] !== undefined && times[i]! < ms + 60_000) return i
    return -1
  }
  const i = indexOf(t, s, end, true)
  return i < 0 ? `no block ${s} in this transcript` : i
}

// A reference into another thread bounds this one by time: from its block's time on, up to (not at) the time of the
// block after it, so paging back from the oldest hit shown loses no hit of a subagent that ran meanwhile.
function crossBound(home: Thread, t: Thread, spec: string, end: boolean): number | string {
  const i = indexOf(home, spec, end, true)
  if (i < 0) return `no block ${spec.trim()} in this transcript`
  const times = timesOf(home)
  const mine = timesOf(t)
  if (!end) {
    const ms = times[i]
    const j = ms === undefined ? 0 : mine.findIndex((x) => x !== undefined && x >= ms)
    return j < 0 ? t.blocks.length : j
  }
  const next = times.slice(i + 1).find((x) => x !== undefined)
  if (next === undefined) return t.blocks.length - 1
  for (let j = mine.length - 1; j >= 0; j--) if (mine[j] !== undefined && mine[j]! < next) return j
  return -1
}

const isTime = (spec: string) => /^(\d{4}-\d{2}-\d{2}[ T])?\d{1,2}:\d{2}$/.test(spec.trim())

// Block indexes, inclusive, of `t` from `from` to `to`; a reference bound names a block of `home`, `t` by default.
function range(t: Thread, from: string | undefined, to: string | undefined, home = t): [number, number] | string {
  const at = (spec: string, end: boolean) => (home === t || isTime(spec) ? bound(t, spec, end) : crossBound(home, t, spec, end))
  const lo = from ? at(from, false) : 0
  const hi = to ? at(to, true) : t.blocks.length - 1
  if (typeof lo === 'string') return lo
  if (typeof hi === 'string') return hi
  return [lo, hi]
}

// ---- Labels -----------------------------------------------------------------------------------------------------

function label(b: Block) {
  const what =
    b.kind === 'call'
      ? `${b.tool} call`
      : b.kind === 'result'
        ? `${b.tool ?? 'tool'} result${b.error ? ' (error)' : ''}`
        : b.kind === 'summary'
          ? 'compaction summary'
          : b.kind === 'memory'
            ? 'memory message'
            : b.kind
  return `${b.ref}${b.time === undefined ? '' : ` · ${stamp(b.time)}`} · ${what}`
}

// What a call did, in a line: its command, file, pattern or query, else its first text field.
function callSummary(b: Block) {
  const fields = Object.fromEntries(
    b.text
      .split('\n')
      .map((l) => l.match(/^([\w-]+): (.*)$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1]!, m[2]!]),
  )
  const main = ['command', 'file_path', 'pattern', 'query', 'url', 'path', 'description', 'prompt', 'skill', 'subject'].find((k) => fields[k])
  const extra = main === 'pattern' && fields.path ? ` in ${fields.path}` : main === 'file_path' && fields.offset ? ` from line ${fields.offset}` : ''
  return oneLine(`${main ? fields[main] : (b.text.split('\n')[0] ?? '')}${extra}`, 140)
}

// ---- Search -----------------------------------------------------------------------------------------------------

// A word or "quoted phrase" of the query. A compound word (RAW_TOKEN, contract-signed) has its parts too, so a block
// that spells it apart (RAW TRACE TOKEN) still holds it when no block holds it whole.
type Term = { word: string; parts: string[] }
type Matcher = { regex?: RegExp; terms: Term[]; shown: string }
type Held = 'whole' | 'parts' | undefined

// The length of an unbounded quantifier (`+`, `*`, `{n,}`) at `i`, else 0.
function unboundedAt(p: string, i: number) {
  if (p[i] === '+' || p[i] === '*') return 1
  const brace = p.slice(i).match(/^\{\d+,\}/)
  return brace ? brace[0].length : 0
}

// Whether an unbounded quantifier repeats a group that already holds one, as `(a+)+` or `(\w*)*`: the shape that can
// backtrack for a very long time on a line it does not match. Overlapping alternatives, as `(a|a)+`, pass; the search's
// time budget stops those.
function nestsQuantifiers(p: string) {
  const groups: boolean[] = [] // per open group: whether it holds an unbounded quantifier
  let inClass = false
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (c === '\\') i++
    else if (inClass) inClass = c !== ']'
    else if (c === '[') inClass = true
    else if (c === '(') groups.push(false)
    else if (c === ')') {
      const inner = groups.pop() ?? false
      const q = unboundedAt(p, i + 1)
      if (inner && q) return true
      if (groups.length) groups[groups.length - 1] ||= inner || !!q
      i += q
    } else if (groups.length && unboundedAt(p, i)) groups[groups.length - 1] = true
  }
  return false
}

// `/regex/flags` (case-insensitive unless flags are given), else words and "quoted phrases", all of which must appear.
function matcher(query: string): Matcher | string {
  const re = query.match(/^\/([\s\S]+)\/([a-z]*)$/)
  if (re) {
    if (nestsQuantifiers(re[1]!))
      return `om_recall: /${re[1]}/ repeats a group that already repeats, as (a+)+ does, which can take very long to match. Drop one of the two quantifiers, bound one as {1,20}, or search for words.`
    try {
      return { regex: new RegExp(re[1]!, (re[2] || 'i').replace(/[gy]/g, '')), terms: [], shown: `/${re[1]}/${re[2] ?? ''}` }
    } catch (error) {
      return `om_recall: not a valid regular expression (${error instanceof Error ? error.message : String(error)}).`
    }
  }
  const terms: Term[] = []
  for (const q of query.matchAll(/"([^"]+)"|(\S+)/g)) {
    const word = (q[1] ?? q[2]!).toLowerCase().replace(/\s+/g, ' ')
    const parts = q[1] === undefined ? word.split(/[_-]+/).filter((p) => p.length > 1) : []
    if (!terms.some((t) => t.word === word)) terms.push({ word, parts: parts.length > 1 ? parts : [] })
  }
  if (!terms.length) return 'om_recall: give a query.'
  return { terms, shown: /^".*"$/.test(query.trim()) ? query.trim() : `"${query}"` }
}

// The pieces of a text one regex test runs over, each at most REGEX_TEXT_MAX characters and cut after a newline where
// one falls in its second half, so one huge line cannot spend the whole time budget. A match across a cut is missed.
function pieces(text: string) {
  const out: string[] = []
  for (let i = 0; i < text.length; ) {
    let end = i + REGEX_TEXT_MAX
    const nl = end < text.length ? text.lastIndexOf('\n', end - 1) : -1
    if (nl >= i + REGEX_TEXT_MAX / 2) end = nl + 1
    out.push(text.slice(i, end))
    i = end
  }
  return out.length ? out : ['']
}

// How a text holds each term (a regex is one): whole, by a compound's parts alone, or not. A phrase matches across any
// run of whitespace, as a command's aligned output spaces its words.
function held(m: Matcher, text: string, lower = text.toLowerCase()): Held[] {
  if (m.regex) return [pieces(text).some((p) => m.regex!.test(p)) ? 'whole' : undefined]
  const flat = lower.replace(/\s+/g, ' ')
  return m.terms.map((t) => (flat.includes(t.word) ? 'whole' : t.parts.length && t.parts.every((p) => lower.includes(p)) ? 'parts' : undefined))
}

type Excerpt = { text: string; best: number; whole: number; lead: number; lines: number }

// A phrase held only whole-block (its words fall on different display lines: a real newline, or just a display wrap
// of one long line) is not on any single line to score or cut around. Locate it in the raw text instead, and report
// the display lines its match spans, so the excerpt still shows it rather than falling back to a default line.
function spanning(b: Block, starts: readonly number[], heldPerLine: readonly Held[][], m: Matcher) {
  const spans = new Map<number, number>() // display line index the match starts on -> how many lines it spans
  const phrases = m.terms.filter((t, k) => t.word.includes(' ') && !heldPerLine.some((h) => h[k]))
  if (!phrases.length) return spans
  const raw = b.text.toLowerCase()
  const flat: string[] = []
  const map: number[] = [] // flat index -> raw index
  for (let i = 0; i < raw.length; ) {
    if (/\s/.test(raw[i]!)) {
      const start = i
      while (i < raw.length && /\s/.test(raw[i]!)) i++
      flat.push(' ')
      map.push(start)
    } else {
      flat.push(raw[i]!)
      map.push(i)
      i++
    }
  }
  const flatText = flat.join('')
  const locate = (r: number) => {
    let lo = 0,
      hi = starts.length - 1,
      at = 0
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (starts[mid]! <= r) {
        at = mid
        lo = mid + 1
      } else hi = mid - 1
    }
    return at
  }
  for (const t of phrases) {
    const idx = flatText.indexOf(t.word)
    if (idx === -1) continue
    const s = locate(map[idx]!)
    const e = locate(map[idx + t.word.length - 1]!)
    spans.set(s, Math.max(spans.get(s) ?? 1, e - s + 1))
  }
  return spans
}

// A hit's lines to show: those holding the most terms whole, then the most terms, then the rarest in the block (on the
// fewest of its lines), each more than SEARCH_LINE_GAP from another, the farthest from those taken on a tie. Each is
// cut around its rarest term. A compound's parts count on a line only when no line holds it whole: `101` inside
// `101047290` is not `shard-101`. `whole` and `best`, the most terms one line holds whole and at all, rank the hit;
// `lead` is the line taken first.
function blockExcerpt(b: Block, m: Matcher): Excerpt {
  const { lines, starts } = splitLines(b.text)
  const lowers = lines.map((l) => l.toLowerCase())
  const atoms = [...new Set(m.terms.flatMap((t) => [t.word, ...t.parts]))]
  const freq = new Map(atoms.map((a) => [a, lowers.filter((l) => l.includes(a)).length]))
  const heldPerLine = lines.map((l, i) => held(m, l, lowers[i]))
  const wholeSomewhere = (k: number) => heldPerLine.some((h) => h[k] === 'whole')
  const counted = heldPerLine.map((h) => h.map((x, k) => (x === 'parts' && wholeSomewhere(k) ? undefined : x)))
  const spans = spanning(b, starts, heldPerLine, m)
  type Line = { i: number; whole: number; terms: number; rarity: number; span: number }
  const scored: Line[] = lines.map((l, i) => ({
    i,
    whole: counted[i]!.filter((x) => x === 'whole').length + (spans.has(i) ? 1 : 0),
    terms: counted[i]!.filter(Boolean).length + (spans.has(i) ? 1 : 0),
    rarity: atoms.reduce((s, a) => s + (lowers[i]!.includes(a) ? 1 / freq.get(a)! : 0), 0),
    span: spans.get(i) ?? 1,
  }))
  let pool = scored.filter((s) => s.terms > 0)
  if (!pool.length) pool = scored.filter((s) => s.rarity > 0) // a compound's parts on separate lines
  const taken: Line[] = []
  const gap = (s: Line) => Math.min(...taken.map((t) => Math.abs(t.i - s.i)))
  while (taken.length < SEARCH_LINES_PER_HIT) {
    const open = pool.filter((s) => !taken.length || gap(s) > SEARCH_LINE_GAP)
    if (!open.length) break
    open.sort((x, y) => y.whole - x.whole || y.terms - x.terms || y.rarity - x.rarity || (taken.length ? gap(y) - gap(x) : 0) || x.i - y.i)
    taken.push(open[0]!)
  }
  const lead = taken[0]?.i ?? 0
  const anchor = (l: string, ll: string) => {
    if (m.regex) return Math.max(0, l.search(m.regex))
    const rarest = atoms.filter((a) => ll.includes(a)).sort((x, y) => freq.get(x)! - freq.get(y)! || y.length - x.length)[0]
    return rarest ? ll.indexOf(rarest) : 0
  }
  const found = taken
    .sort((x, y) => x.i - y.i)
    .map(({ i, span }) => {
      const l = span > 1 ? b.text.slice(starts[i]!, starts[i + span - 1]! + lines[i + span - 1]!.length) : lines[i]!
      const start = Math.max(0, Math.min(anchor(l, l.toLowerCase()) - 60, l.length - SEARCH_LINE_CHARS))
      const cut = l.slice(start, start + SEARCH_LINE_CHARS).replace(/\s+/g, ' ')
      const at = span > 1 ? `${i + 1}-${i + span}` : `${i + 1}`
      return `  ${at}: ${start > 0 ? '…' : ''}${cut}${start + SEARCH_LINE_CHARS < l.length ? '…' : ''}`
    })
  if (!found.length) found.push(`  1: ${oneLine(lines[0] ?? '', SEARCH_LINE_CHARS)}`) // a match on the tool's name alone
  if (pool.length > taken.length) found.push(`  … ${plural(pool.length - taken.length, 'more matching line')}`)
  return { text: `[${label(b)}] ${plural(lines.length, 'line')}\n${found.join('\n')}`, best: Math.max(0, ...pool.map((s) => s.terms)), whole: Math.max(0, ...pool.map((s) => s.whole)), lead, lines: lines.length }
}

async function search(c: Corpus, input: Input): Promise<RecallResult> {
  const m = matcher(input.query ?? '')
  if (typeof m === 'string') return { mode: 'search', text: m, matches: 0 }
  const limit = input.limit ?? SEARCH_MAX_HITS
  if (input.subagents) for (const s of c.subagents) await c.load(s)
  const home = await threadFor(c, input.from ?? input.to)
  const threads = input.subagents ? [c.main, ...c.subagents] : [home]
  type Hit = { b: Block; t: Thread; i: number; time: number; lower: string; held: Held[]; score: number; x?: Excerpt }
  const pool: Hit[] = []
  // A regex can backtrack for a very long time on a block; no test can be interrupted, so the clock is read between them.
  const deadline = async () => (m.regex ? (await c.now()) + SEARCH_BUDGET_MS : Infinity)
  const past = async (by: number) => by < Infinity && (await c.now()) > by
  const scanBy = await deadline()
  let stopped: { b: Block; left: number } | undefined // the first block not searched, and the threads after its own
  scan: for (const [n, t] of threads.entries()) {
    const r = range(t, input.from, input.to, home)
    if (typeof r === 'string') return { mode: 'search', text: `om_recall: ${r}.`, matches: 0 }
    const times = timesOf(t)
    for (let i = r[0]; i <= r[1]; i++) {
      const b = t.blocks[i]!
      if (b.own || b.asking || b.kind === 'memory') continue
      if (await past(scanBy)) {
        stopped = { b, left: threads.length - 1 - n }
        break scan
      }
      const text = b.tool ? `${b.tool}\n${b.text}` : b.text
      const lower = text.toLowerCase()
      pool.push({ b, t, i, time: times[i] ?? 0, lower, held: held(m, text, lower), score: 0 })
    }
  }
  let hits = pool.filter((h) => h.held.every((x) => x === 'whole'))
  const loose = !hits.length
  if (loose) hits = pool.filter((h) => h.held.some(Boolean))
  // A term weighs more the fewer blocks hold it, so a block with one rare term outranks many with a common one.
  const weight = pool[0]?.held.map((_, k) => Math.log(1 + pool.length / Math.max(1, pool.filter((h) => h.held[k]).length))) ?? []
  // Excerpting tests a hit's lines again, so a regex has a budget of its own for it, spent on the newest hits first.
  const excerptBy = await deadline()
  for (const [n, h] of [...hits].reverse().entries()) {
    if (n && (await past(excerptBy))) break
    h.x = blockExcerpt(h.b, m)
    h.score = h.held.reduce((s, x, k) => s + (x ? weight[k]! : 0), 0)
  }
  const byTime = (a: Hit, b: Hit) => a.time - b.time || (a.t === b.t ? a.i - b.i : 0)
  // The rarest terms first when no block holds every term, then the most terms whole on one line, the most terms on
  // one line, then the newest. Hits the budget left without an excerpt come last, never shown.
  const ranked = hits.filter((h) => h.x).sort((a, b) => (loose ? b.score - a.score : 0) || b.x!.whole - a.x!.whole || b.x!.best - a.x!.best || byTime(b, a))
  ranked.push(...hits.filter((h) => !h.x))
  const shown: Hit[] = []
  let chars = 0
  for (const h of ranked) {
    if (shown.length >= limit || !h.x) break
    if (shown.length && chars + h.x!.text.length > SEARCH_MAX_CHARS) break
    shown.push(h)
    chars += h.x!.text.length + 1
  }
  const rest = ranked.slice(shown.length)
  const lead = shown[0]
  shown.sort(byTime) // shown in time order
  const oldest = shown[0]
  const before = oldest && oldest.t.blocks[oldest.i - 1]
  const older = !loose && !!before && rest.every((h) => byTime(h, oldest) < 0)
  const where = c.live ? `the live history` : `${plural(c.files.length, 'transcript file')}${threads.length > 1 ? ` and ${plural(threads.length - 1, 'subagent transcript')}` : ''}`
  const head =
    `${hits.length} match(es) for ${m.shown} in ${plural(pool.length, 'block')} of ${where}${c.note ? ` (${c.note})` : ''}` +
    (loose && hits.length ? `; no block holds every term, so these hold some, chosen by the rarest` : '') +
    (rest.length ? `; showing ${shown.length}${loose ? '' : older ? ', the newest' : ', those with the most terms on one line'}` : '') +
    (!stopped
      ? ''
      : threads.length === 1
        ? `; the search stopped after ${SEARCH_BUDGET_MS / 1000} s, before ${stopped.b.ref}: simplify the pattern, or search the rest with "from": "${stopped.b.ref}"`
        : // With "subagents", "from" bounds the other transcripts by time, skipping blocks of theirs never searched.
          `; the search stopped after ${SEARCH_BUDGET_MS / 1000} s, before ${stopped.b.ref}` +
          (stopped.left ? `, with ${plural(stopped.left, 'subagent transcript')} not searched` : '') +
          `: simplify the pattern, or search one transcript at a time, without "subagents": "from": "${stopped.b.ref}" searches the rest of this one`) +
    '.'
  const out = [head]
  // Terms no block holds, whole or (a compound) by parts found anywhere: absent, so not worth searching for again.
  const absent = m.terms.filter((t, k) => !pool.some((h) => h.held[k]) && !(t.parts.length && t.parts.every((p) => pool.some((h) => h.lower.includes(p)))))
  if (absent.length) {
    const scope = input.from || input.to ? 'this range' : c.note ? 'the readable history' : c.subagents.length && !input.subagents ? 'the main transcript' : 'this session'
    const named = absent.slice(0, ABSENT_MAX).map((t) => (t.word.includes(' ') ? `"${t.word}"` : t.word))
    out.push(`No occurrences in ${scope} of: ${named.join(', ')}${absent.length > ABSENT_MAX ? `, and ${absent.length - ABSENT_MAX} more` : ''}.`)
  }
  out.push(...shown.map((h) => h.x!.text))
  if (rest.length)
    out.push(
      older
        ? `${plural(rest.length, 'older match', 'older matches')} not shown; only if none above answers, repeat with "to": "${before!.ref}".`
        : `${plural(rest.length, 'more match', 'more matches')} not shown; only if none above answers, narrow the query or give "from" or "to".`,
    )
  if (!input.subagents && c.subagents.length) out.push(`${plural(c.subagents.length, 'subagent transcript')} not searched: repeat with "subagents": true.`)
  if (lead) {
    const n = lead.x!.lead + 1
    out.push(`Only if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "${lead.b.ref}", "lines": "${Math.max(1, n - 10)}-${Math.min(lead.x!.lines, n + 10)}"}.`)
  }
  return { mode: 'search', text: out.join('\n'), matches: hits.length }
}

// ---- Read -------------------------------------------------------------------------------------------------------

function lineRange(spec: string | undefined, total: number): [number, number] | string {
  if (!spec) return [1, total]
  const m = spec.trim().match(/^(\d*)\s*(?:(-)\s*(\d*))?$/)
  if (!m || (!m[1] && !m[3])) return `om_recall: lines is "A-B", "A-", "-B" or "A".`
  const a = m[1] ? Number(m[1]) : 1
  const b = m[2] ? (m[3] ? Number(m[3]) : total) : a
  return [Math.max(1, a), Math.min(total, b)]
}

function page(b: Block, spec: string | undefined, maxChars = READ_MAX_CHARS) {
  const lines = linesOf(b.text)
  const r = lineRange(spec, lines.length)
  if (typeof r === 'string') return r
  const [a, want] = r
  if (a > lines.length) return `om_recall: ${b.ref} has ${plural(lines.length, 'line')}.`
  const out: string[] = []
  let chars = 0
  let n = a
  for (; n <= want && n - a < READ_MAX_LINES; n++) {
    const l = lines[n - 1]!
    if (out.length && chars + l.length > maxChars) break
    out.push(`${String(n).padStart(4)} | ${l}`)
    chars += l.length + 8
  }
  const last = n - 1
  const links = [b.pair ? `${b.kind === 'call' ? 'result' : 'call'}: ${b.pair.ref}` : '', b.agent ? `subagent transcript: ${b.agent} (outline it with "ref": "${b.agent}")` : '']
    .filter(Boolean)
    .join('; ')
  const head = `[${label(b)}] lines ${a}-${last} of ${lines.length}${links ? ` (${links})` : ''}`
  const rest = lines.length - last
  const size = lines.slice(last).join('\n').length
  const tail = rest
    ? `\n… ${plural(rest, 'more line')} (${plural(size, 'character')}); only if you still need them: {"mode": "read", "ref": "${b.ref}", "lines": "${last + 1}-${Math.min(lines.length, last + READ_MAX_LINES)}"}.`
    : ''
  return `${head}\n${out.join('\n')}${tail}`
}

function neighbor(b: Block) {
  const lines = linesOf(b.text)
  let text = b.text
  if (text.length > NEIGHBOR_MAX_CHARS) text = `${text.slice(0, NEIGHBOR_MAX_CHARS)}\n… (${plural(lines.length, 'line')} in all; read ${b.ref} only if you need the rest)`
  return `[${label(b)}]\n${text}`
}

async function read(c: Corpus, input: Input): Promise<RecallResult> {
  const ref = input.ref ?? ''
  const t = await threadFor(c, ref)
  const i = indexOf(t, ref)
  if (i < 0) return { mode: 'read', text: `om_recall: no block ${ref}. A reference looks like ${t.blocks[0]?.ref ?? 'a79f045b:12'}, from a search or an outline.`, matches: 0 }
  const b = t.blocks[i]!
  const pick = (from: number, step: number, n: number) => {
    const out: Block[] = []
    for (let j = from; j >= 0 && j < t.blocks.length && out.length < n; j += step) if (!t.blocks[j]!.own) out.push(t.blocks[j]!)
    return out
  }
  const before = pick(i - 1, -1, Math.min(input.before ?? 0, NEIGHBORS_MAX)).reverse()
  const after = pick(i + 1, 1, Math.min(input.after ?? 0, NEIGHBORS_MAX))
  const around = [...before, ...after].reduce((n, x) => n + neighbor(x).length + 2, 0)
  // The neighbours asked for share the response's cap with the page, which shrinks to fit: its tail says what is left.
  const shown = page(b, input.lines, Math.min(READ_MAX_CHARS, RESPONSE_MAX_CHARS - around - 1_000))
  return { mode: 'read', text: [...before.map(neighbor), shown, ...after.map(neighbor)].join('\n\n'), matches: 0 }
}

// ---- Outline ----------------------------------------------------------------------------------------------------

function outlineLine(b: Block) {
  const when = b.time === undefined ? '     ' : clock(b.time)
  const at = `${b.ref} ${when}`
  if (b.kind === 'user') return `${at} USER: ${oneLine(b.text, 240)}`
  if (b.kind === 'assistant') return `${at} ASSISTANT: ${oneLine(b.text, 160)}`
  if (b.kind === 'memory') return `${at} [compaction: memory message]`
  if (b.kind === 'summary') return `${at} [compaction: summary]`
  if (b.kind === 'call') {
    const r = b.pair
    const result = r ? ` → ${r.ref} (${plural(linesOf(r.text).length, 'line')}${r.error ? ', error' : ''})` : ''
    return `${at} ${b.tool}: ${callSummary(b)}${result}${b.agent ? ` [subagent ${b.agent}]` : ''}`
  }
  return `${at} ${b.tool ?? 'tool'} result: ${oneLine(b.text, 120)}` // its call is not in the transcript
}

// Where the main thread's blocks come from, as outline and files name it.
const mainSource = (c: Corpus) =>
  c.live ? `the live history${c.note ? ` (${c.note})` : ''}` : `${plural(c.files.length, 'transcript file')} (${c.files.join(' → ')})${c.note ? ` (${c.note})` : ''}`

async function outline(c: Corpus, input: Input): Promise<RecallResult> {
  const t = await threadFor(c, input.from ?? input.to ?? input.ref)
  const r = range(t, input.from, input.to)
  if (typeof r === 'string') return { mode: 'outline', text: `om_recall: ${r}.`, matches: 0 }
  const visible = (b: Block) => !b.own && !b.meta && !(b.kind === 'result' && b.pair)
  const lines: string[] = []
  let chars = 0
  let lastDay = ''
  let next: Block | undefined
  for (let i = r[0]; i <= r[1]; i++) {
    const b = t.blocks[i]!
    if (!visible(b)) continue
    if (lines.length >= OUTLINE_MAX_LINES || chars > OUTLINE_MAX_CHARS) {
      next = b
      break
    }
    const d = b.time === undefined ? lastDay : day(b.time)
    if (d !== lastDay) lines.push(`— ${d} —`), (lastDay = d)
    const line = outlineLine(b)
    lines.push(line)
    chars += line.length + 1
  }
  const all = t.blocks.filter(visible)
  const times = t.blocks.flatMap((b) => (b.time === undefined ? [] : [b.time]))
  const span = times.length ? `, ${stamp(times[0]!)} to ${stamp(times.at(-1)!)}` : ''
  const source = t === c.main ? mainSource(c) : t.label
  const subs = t === c.main && c.subagents.length ? `; ${plural(c.subagents.length, 'subagent transcript')} (${c.subagents.map((s) => s.tag).join(', ')})` : ''
  const head = `Outline of ${source}: ${plural(all.length, 'entry', 'entries')}${span}${subs}. Tool calls point → at their results; read a block only for what this lacks: {"mode": "read", "ref": "<ref>"}.`
  const out = [head, ...(lines.length ? lines : ['(nothing in this range)'])]
  if (next) {
    const left = t.blocks.slice(t.blocks.indexOf(next), r[1] + 1).filter(visible).length
    out.push(`${plural(left, 'more entry', 'more entries')}; only if you still need them: {"mode": "outline", "from": "${next.ref}"${input.to ? `, "to": "${input.to}"` : ''}}.`)
  }
  return { mode: 'outline', text: out.join('\n'), matches: lines.length }
}

// ---- Files ------------------------------------------------------------------------------------------------------

// The file tools, by the path field each names and what a call did to it. Bash commands are left to search: what one
// reads or writes is not known without running it.
const FILE_TOOLS: Record<string, { field: string; did: 'read' | 'edited' | 'wrote' }> = {
  Read: { field: 'file_path', did: 'read' },
  Edit: { field: 'file_path', did: 'edited' },
  MultiEdit: { field: 'file_path', did: 'edited' },
  Write: { field: 'file_path', did: 'wrote' },
  NotebookRead: { field: 'notebook_path', did: 'read' },
  NotebookEdit: { field: 'notebook_path', did: 'edited' },
}
const FAILED = { read: 'read failed', edited: 'edit failed', wrote: 'write failed' } as const
const ACTIONS = ['read', 'edited', 'wrote', FAILED.read, FAILED.edited, FAILED.wrote]

// Each file a file tool named, the most recently touched first: what each call did to it, and the call's block.
async function files(c: Corpus, input: Input): Promise<RecallResult> {
  const threads = [c.main, ...(input.subagents ? c.subagents : [])]
  for (const t of threads) await c.load(t)
  const touched = new Map<string, { last: number; refs: Map<string, string[]> }>()
  let order = 0
  for (const t of threads)
    for (const b of t.blocks) {
      const how = b.kind === 'call' && b.tool ? FILE_TOOLS[b.tool] : undefined
      const path = how && b.input && typeof b.input === 'object' ? (b.input as Record<string, unknown>)[how.field] : undefined
      if (typeof path !== 'string' || !path.trim()) continue
      if (input.query && !path.toLowerCase().includes(input.query.toLowerCase())) continue
      const did = b.pair?.error ? FAILED[how!.did] : how!.did
      const file = touched.get(path) ?? { last: 0, refs: new Map() }
      file.last = ++order
      file.refs.set(did, [...(file.refs.get(did) ?? []), b.ref])
      touched.set(path, file)
    }
  const listed = [...touched].sort((a, b) => b[1].last - a[1].last)
  const subs = input.subagents && c.subagents.length ? ` and ${plural(c.subagents.length, 'subagent transcript')}` : ''
  const which = input.query ? ` whose path holds "${input.query}"` : ''
  const head =
    `Files named by the ${Object.keys(FILE_TOOLS).join(', ')} calls of ${mainSource(c)}${subs}, newest first: ${plural(listed.length, 'file')}${which}. ` +
    'Read a block for what a call did: {"mode": "read", "ref": "<ref>"}.'
  const lines: string[] = []
  let chars = 0
  for (const [path, file] of listed) {
    const acts = ACTIONS.flatMap((a) => {
      const refs = file.refs.get(a)
      if (!refs) return []
      const earlier = refs.length > FILES_REFS ? ` (+${refs.length - FILES_REFS} earlier)` : ''
      return [`${a}${earlier} ${refs.slice(-FILES_REFS).join(', ')}`]
    })
    const line = `${oneLine(path, 300)}: ${acts.join('; ')}`
    if (lines.length >= FILES_MAX_LINES || chars + line.length > OUTLINE_MAX_CHARS) break
    lines.push(line)
    chars += line.length + 1
  }
  const more = listed.length - lines.length
  const tail = more ? [`${plural(more, 'more file')}; narrow with a query: {"mode": "files", "query": "<part of a path>"}.`] : []
  return { mode: 'files', text: [head, ...(lines.length ? lines : ['(no file named)']), ...tail].join('\n'), matches: lines.length }
}

// ---- Entry ------------------------------------------------------------------------------------------------------

type Input = { mode: Mode; query?: string; limit?: number; ref?: string; lines?: string; before?: number; after?: number; from?: string; to?: string; subagents: boolean }

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined)
const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

// The tool's input, loosely typed as a model sends it. A query alone searches, a ref alone reads, nothing outlines.
export function parseInput(e: RecallInput): Input | string {
  for (const key of ['query', 'mode', 'ref', 'lines', 'from', 'to'] as const) {
    const v = str(e[key])
    if (v && v.length > ARG_MAX_CHARS) return `om_recall: ${key} is at most ${ARG_MAX_CHARS} characters${key === 'query' ? '; search for its rarest words' : ''}.`
  }
  const query = str(e.query)
  const ref = str(e.ref)
  const mode = str(e.mode) ?? (ref && !query ? 'read' : query ? 'search' : 'outline')
  if (mode !== 'search' && mode !== 'read' && mode !== 'outline' && mode !== 'files') return `om_recall: mode is search, read, outline or files.`
  if (mode === 'search' && !query) return 'om_recall: give a query.'
  if (mode === 'read' && !ref) return 'om_recall: give the ref of the block to read, from a search or an outline.'
  const limit = num(e.limit)
  return {
    mode,
    query,
    limit: limit === undefined || limit < 1 ? undefined : Math.min(limit, SEARCH_MAX_HITS),
    ref,
    lines: str(e.lines),
    before: num(e.before),
    after: num(e.after),
    from: str(e.from),
    to: str(e.to),
    subagents: e.subagents === true || e.subagents === 'true',
  }
}

// om_recall's calls this turn that have answered: those after the prompt that asked.
function answeredThisTurn(t: Thread) {
  const asked = t.blocks.findIndex((b) => b.asking)
  return asked < 0 ? 0 : t.blocks.slice(asked).filter((b) => b.own && b.kind === 'call' && b.pair).length
}

export async function recall(c: Corpus, e: RecallInput): Promise<RecallResult> {
  const input = parseInput(e)
  if (typeof input === 'string') {
    const asked = str(e.mode)
    return { mode: asked === 'read' || asked === 'outline' || asked === 'files' ? asked : 'search', text: input, matches: 0 }
  }
  const found = await (input.mode === 'search' ? search(c, input) : input.mode === 'read' ? read(c, input) : input.mode === 'files' ? files(c, input) : outline(c, input))
  const calls = answeredThisTurn(c.main)
  const nudge = calls >= TURN_CALLS ? `\nThis is om_recall call ${calls + 1} this turn: answer from what you have found unless a specific fact is still missing.` : ''
  // Each mode keeps under the cap; this holds it whatever the input.
  const room = RESPONSE_MAX_CHARS - nudge.length
  const cut = `\n… cut at ${grouped(RESPONSE_MAX_CHARS)} characters; ask for less.`
  const text = found.text.length > room ? `${found.text.slice(0, room - cut.length)}${cut}` : found.text
  return { ...found, text: text + nudge }
}
