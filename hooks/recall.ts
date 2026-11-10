// om_recall: search, read and outline the session's whole transcript. The transcript is the chain of files the
// session wrote (Claude Code may continue a session in a new file, the old one ending in a `continued-in` row), each
// block addressed `<file>:<line>`, the file's first 8 characters and the line of the JSONL row: rows are only ever
// appended, so a reference holds across compactions and moves. With no transcript file, the live history is read
// instead, its blocks addressed `#<row>`. No `$` here: the engine never lets it cross an import, so the caller passes
// what reads files as `RecallIo`.
import type { SessionMessage } from 'claude-code'
import { COMPACT_WRAPPER, MEMORY_MARK } from './prompts'
import { grouped, plural } from './stats'

export const RECALL_TOOL = 'om_recall'
export const SEARCH_MAX_HITS = 20
const SEARCH_MAX_CHARS = 10_000 // about 2.5k tokens of hits
const SEARCH_SPANS = 3 // runs of lines shown per hit
const SEARCH_SPAN_GAP = 2 // matching lines this close share a run
const SEARCH_SPAN_LINES = 3
const SEARCH_LINE_CHARS = 200
const SEARCH_WHOLE_CHARS = 600 // a block this short is shown whole
const SEARCH_HIT_CHARS = 1_200 // one hit's lines
const SEARCH_EXCERPTS = 2 // hits excerpted, per hit asked for: the best by their block's score
const STANDOUT = 1.25 // how far the best hit outscores the next to be shown first, out of time order
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
  need?: unknown
}
export type Mode = 'search' | 'read' | 'outline' | 'files'
// `refs`: the blocks a search's answer names, its hits and any lines pasted from their calls or results.
export type RecallResult = { mode: Mode; text: string; matches: number; refs?: string[]; hits?: Hits }
// A search's hit as the librarian (librarian.ts) gets it: its block, the head of its excerpt with the excerpt's best
// line, its place by score among the hits shown, and a subagent's block's thread, as `subagent <tag> (<what it did>)`.
export type Listed = { block: Block; brief: string; rank: number; thread?: string }
// A search's answer in its parts, for the librarian: the lines before the hits, the hits in the order shown, the lines
// after them; and the `candidates` it gives Ember, the hits of the same search over the subagents' transcripts too.
export type Hits = { query: string; need?: string; head: string[]; hits: Listed[]; notes: string[]; candidates: Listed[] }
// What answers a search in place of its excerpts, or undefined to keep them.
export type Librarian = (hits: Hits) => Promise<{ text: string; refs: string[] } | undefined>

type Kind = 'user' | 'assistant' | 'call' | 'result' | 'memory' | 'summary'
export type Block = {
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
  flat?: string // what search matches, lowercased, each run of whitespace one space: kept with a cached parse
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
export function linesOf(text: string) {
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
// the directory listing itself could not be read, so the walk may have missed a link that was really there. A file
// names the one it continued in only as it is left, before the new one is read: the walk back from a path, once
// clean, holds while its files are still listed, so `cache` keeps it rather than grep every file of the directory again.
async function chainOf(io: RecallIo, path: string, cache?: TranscriptCache) {
  const dir = dirOf(path)
  let names: string[] = []
  let discoveryFailed = false
  try {
    names = (await io.list(dir)).filter((n) => n.endsWith('.jsonl'))
  } catch {
    discoveryFailed = true
  }
  const known = cache?.chain
  if (known && known.path === path && !discoveryFailed && known.files.every((f) => names.includes(f.slice(f.lastIndexOf('/') + 1))))
    return { dir, names, files: [...known.files], truncated: known.truncated, unreadableLink: false, discoveryFailed }
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
  if (cache && !unreadableLink && !discoveryFailed) cache.chain = { path, files: [...files], truncated }
  return { dir, names, files, truncated, unreadableLink, discoveryFailed }
}

// What om_recall keeps between its calls (loadTranscript's `cache`): the chain's files as parsed so far, and the
// blocks and state they share. Rows are only ever appended, and a file continued in another no longer grows: each
// file but the newest is taken as parsed while its size and mtime hold, and the newest is parsed on from the byte
// its last whole row ended at, as it has grown by this very call's row. `check` is the text just before that byte,
// from `checkAt` on: read again with what follows, it shows a newest file rewritten to as long or longer. Beside the
// parse, the chain back from the newest file (chainOf), each subagent's `.meta.json` and each subagent transcript's
// blocks while its size and mtime hold.
type Parsed = At & { path: string; size: number; mtime: number; offset: number; check: string; checkAt: number; continuedIn?: string }
type Meta = { agentType?: string; description?: string; toolUseId?: string }
export type TranscriptCache = {
  parsed?: { files: Parsed[]; seen: Seen; blocks: Block[] }
  chain?: { path: string; files: string[]; truncated: boolean }
  metas?: Map<string, Meta>
  subagents?: Map<string, { size: number; mtime: number; blocks: Block[] }>
}
const utf8Bytes = (text: string) => new TextEncoder().encode(text).length
const CHECK_CHARS = 64
// The last CHECK_CHARS characters of a text, whole: never half of a surrogate pair.
const tailOf = (text: string) => {
  const t = text.slice(-CHECK_CHARS)
  return /^[\uDC00-\uDFFF]/.test(t) ? t.slice(1) : t
}

// The newest file's text past what was parsed of it, when the cached parse still stands: the chain starts with its
// files, those it found after them still listed, each file but its newest unchanged, and the newest no shorter than
// what was parsed of it, with the same text before that point. Else undefined.
async function reusable(io: RecallIo, cached: NonNullable<TranscriptCache['parsed']>, files: readonly string[], names: readonly string[]) {
  const listed = (p: Parsed, k: number) => (k < files.length ? p.path === files[k] : names.includes(p.path.slice(p.path.lastIndexOf('/') + 1)))
  if (!cached.files.every(listed)) return undefined
  const now = await Promise.all(cached.files.map((p) => io.stat!(p.path).catch(() => undefined)))
  const newest = cached.files.length - 1
  const same = cached.files.every((p, k) => {
    const s = now[k]
    return !!s && (k < newest ? s.size === p.size && s.mtime === p.mtime : s.size >= Math.max(p.size, p.offset))
  })
  if (!same) return undefined
  const last = cached.files[newest]!
  const text = await io.readFrom!(last.path, last.checkAt).catch(() => undefined)
  return text?.startsWith(last.check) ? text.slice(last.check.length) : undefined
}

// The session's whole transcript from its newest file: the files before it, and after it when it was continued.
export async function loadTranscript(io: RecallIo, path: string, options: { asking?: boolean; cache?: TranscriptCache } = {}): Promise<Corpus> {
  // Taken while this call parses on from it: a call beside this one parses afresh rather than into the same state.
  const cache = io.stat && io.readFrom ? options.cache : undefined
  const cached = cache?.parsed
  if (cache) delete cache.parsed
  const { dir, names, files, truncated: backTruncated, unreadableLink: backLinkUnreadable, discoveryFailed } = await chainOf(io, path, cache)
  const pathIndex = files.indexOf(path) // stable: only files after it are ever appended below
  const grown = cached && (await reusable(io, cached, files, names))
  const kept = grown === undefined ? undefined : cached
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
        text = prior ? grown! : await io.read(files[i]!)
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
        const done = text.slice(0, parsed.used)
        const offset = (prior?.offset ?? 0) + utf8Bytes(done)
        const check = tailOf((prior?.check ?? '') + done)
        record.push({ ...parsed.at, path: files[i]!, size: stat.size, mtime: stat.mtime, offset, check, checkAt: offset - utf8Bytes(check), ...(continuedIn ? { continuedIn } : {}) })
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
      const metaPath = `${sub}/agent-${id}.meta.json`
      let meta = cache?.metas?.get(metaPath)
      if (!meta) {
        meta = await io
          .read(metaPath)
          .then((t) => JSON.parse(t) as Meta)
          .catch(() => undefined)
        if (meta && cache) (cache.metas ??= new Map()).set(metaPath, meta)
      }
      meta ??= {}
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
      const stat = cache && (await io.stat!(t.path).catch(() => undefined))
      const was = stat && cache!.subagents?.get(t.path)
      if (was && was.size === stat.size && was.mtime === stat.mtime) t.blocks = was.blocks
      else {
        t.blocks = parseFile(t.tag, await io.read(t.path), newSeen(), true).blocks
        if (stat) (cache!.subagents ??= new Map()).set(t.path, { ...stat, blocks: t.blocks })
      }
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

const FULL_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::\d{2})?$/
const CLOCK_TIME = /^(\d{1,2}):(\d{2})$/
const isTime = (spec: string) => FULL_TIME.test(spec.trim()) || CLOCK_TIME.test(spec.trim())

// The local days from `last`'s back to `first`'s, newest first.
function daysBack(first: number, last: number) {
  const days: Date[] = []
  const d = new Date(last)
  d.setHours(0, 0, 0, 0)
  for (; d.getTime() + 86_400_000 > first && days.length < 3_660; d.setDate(d.getDate() - 1)) days.push(new Date(d))
  return days
}
const onDay = (d: Date, h: number, m: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime()

// The times a range's time bounds name, on the machine's clock. A `HH:MM` alone, as the memory message writes a source
// under its day's heading, falls on the newest day of the session's span that holds it. Beside the other bound's time
// it takes the day nearest it that keeps from no later than to: `from` "23:50" with `to` "00:10" starts the day before.
function timeBounds(home: Thread, from: string | undefined, to: string | undefined): { from?: number; to?: number } | string {
  const specs = { from: from?.trim(), to: to?.trim() }
  if (!(specs.from && isTime(specs.from)) && !(specs.to && isTime(specs.to))) return {}
  const times = home.blocks.flatMap((b) => (b.time === undefined ? [] : [b.time]))
  if (!times.length) return 'no block in this transcript has a time; give a reference instead'
  const first = Math.min(...times)
  const last = Math.max(...times)
  const days = daysBack(first, last)
  const full = (s: string | undefined) => {
    const m = s?.match(FULL_TIME)
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])).getTime() : undefined
  }
  const clock = (s: string | undefined, other: number | undefined, end: boolean) => {
    const m = s?.match(CLOCK_TIME)
    if (!m) return undefined
    const at = days.map((d) => onDay(d, Number(m[1]), Number(m[2])))
    if (other !== undefined) {
      // `to`: the oldest day at or after `from`; `from`: the newest day at or before `to`. Both by the minute.
      const fit = end ? [...at].reverse().find((x) => x + 60_000 > other) : at.find((x) => x < other + 60_000)
      return fit ?? (end ? at[0]! : at.at(-1)!)
    }
    return at.find((x) => x + 60_000 > first && x <= last) ?? (at.at(-1)! + 60_000 > first ? at[0]! : at.at(-1)!)
  }
  const out = { from: full(specs.from), to: full(specs.to) }
  if (out.to === undefined) out.to = clock(specs.to, out.from, true)
  if (out.from === undefined) out.from = clock(specs.from, out.to, false)
  return out
}

// The first block at or after `ms`, or (`end`) the last within its minute.
function atTime(t: Thread, ms: number, end: boolean) {
  const times = timesOf(t)
  if (!end) {
    const i = times.findIndex((x) => x !== undefined && x >= ms)
    return i < 0 ? t.blocks.length : i
  }
  for (let i = times.length - 1; i >= 0; i--) if (times[i] !== undefined && times[i]! < ms + 60_000) return i
  return -1
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

// Block indexes, inclusive, of `t` from `from` to `to`; a reference bound names a block of `home`, `t` by default, and
// a time bound is read by `home`'s span.
function range(t: Thread, from: string | undefined, to: string | undefined, home = t): [number, number] | string {
  const ms = timeBounds(home, from, to)
  if (typeof ms === 'string') return ms
  const at = (spec: string, end: boolean, when: number | undefined) => {
    if (when !== undefined) return atTime(t, when, end)
    if (home !== t) return crossBound(home, t, spec, end)
    const i = indexOf(t, spec, end, true)
    return i < 0 ? `no block ${spec.trim()} in this transcript` : i
  }
  const lo = from ? at(from, false, ms.from) : 0
  const hi = to ? at(to, true, ms.to) : t.blocks.length - 1
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
        ? `${b.tool ?? 'tool'} result${b.pair ? ` ${callSummary(b.pair)}` : ''}${b.error ? ' (error)' : ''}`
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
type Matcher = { regex?: RegExp; terms: Term[]; shown: string; note?: string }
type Held = 'whole' | 'parts' | undefined

// The length of an unbounded quantifier (`+`, `*`, `{n,}`) at `i`, else 0.
function unboundedAt(p: string, i: number) {
  if (p[i] === '+' || p[i] === '*') return 1
  const brace = p.slice(i).match(/^\{\d+,\}/)
  return brace ? brace[0].length : 0
}
// Whether a quantifier at `i` repeats: any but `?`, `{0,1}` and `{1}`.
function repeatsAt(p: string, i: number) {
  const brace = p.slice(i).match(/^\{(\d+)(,(\d*))?\}/)
  return brace ? Number(brace[3] || (brace[2] ? Infinity : brace[1])) > 1 : unboundedAt(p, i) > 0
}

// Why a pattern can backtrack for a very long time on a line it does not match, or undefined. No test can be
// interrupted, so these shapes are refused before any runs: a group that already repeats, repeated again, as
// `(a+)+`; a repeated group of alternatives, which can match one stretch of text in many ways, as `(.|\s)*`; and one
// unbounded run right after another of the same characters, as `.*.*`.
function slowShape(p: string) {
  const groups: { repeats: boolean; alternatives: boolean }[] = []
  let inClass = false
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (c === '\\') i++
    else if (inClass) inClass = c !== ']'
    else if (c === '[') inClass = true
    else if (c === '(') groups.push({ repeats: false, alternatives: false })
    else if (c === '|' && groups.length) groups[groups.length - 1]!.alternatives = true
    else if (c === ')') {
      const inner = groups.pop() ?? { repeats: false, alternatives: false }
      const q = unboundedAt(p, i + 1)
      if (inner.repeats && q) return 'repeats a group that already repeats, as (a+)+ does, which can take very long to match. Drop one of the two quantifiers, bound one as {1,20}, or search for words.'
      if (inner.alternatives && repeatsAt(p, i + 1))
        return 'repeats a group of alternatives, as (.|\\s)* does, which can take very long to match. Use a character class instead, as [\\s\\S]* or [ab]+, or search for words.'
      if (groups.length) groups[groups.length - 1]!.repeats ||= inner.repeats || !!q
      i += q
    } else if (groups.length && unboundedAt(p, i)) groups[groups.length - 1]!.repeats = true
  }
  if (/(\.|\\[sSwWdD]|\[[^\]]*\])[*+]\??\1[*+]/.test(p)) return 'repeats the same characters twice in a row, as .*.* does, which can take very long to match. Keep one of the two.'
  return undefined
}

// Whether a pattern holds a `/` that no backslash escapes, outside a class: no regex literal does, and a path does.
function bareSlash(p: string) {
  let inClass = false
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (c === '\\') i++
    else if (inClass) inClass = c !== ']'
    else if (c === '[') inClass = true
    else if (c === '/') return true
  }
  return false
}

// `/regex/flags` (case-insensitive unless flags are given), else words and "quoted phrases", each matched anywhere in
// a block, case-insensitively. A query only shaped like a regex, as an absolute path is (`/home/x/om/archive` would
// have the flags `archive`), or one that does not compile, is searched as words.
function matcher(query: string): Matcher | string {
  const re = query.match(/^\/([\s\S]+)\/([dgimsuyv]*)$/)
  let note: string | undefined
  if (re && !bareSlash(re[1]!) && new Set(re[2]).size === re[2]!.length) {
    const slow = slowShape(re[1]!)
    if (slow) return `om_recall: /${re[1]}/ ${slow}`
    try {
      return { regex: new RegExp(re[1]!, (re[2] || 'i').replace(/[gy]/g, '')), terms: [], shown: `/${re[1]}/${re[2] ?? ''}` }
    } catch (error) {
      note = `not a valid regular expression (${error instanceof Error ? error.message : String(error)}), so searched as words`
    }
  }
  const terms: Term[] = []
  for (const q of query.matchAll(/"([^"]+)"|(\S+)/g)) {
    const word = (q[1] ?? q[2]!).toLowerCase().replace(/\s+/g, ' ')
    const parts = q[1] === undefined ? word.split(/[_-]+/).filter((p) => p.length > 1) : []
    if (!terms.some((t) => t.word === word)) terms.push({ word, parts: parts.length > 1 ? parts : [] })
  }
  if (!terms.length) return 'om_recall: give a query.'
  return { terms, shown: /^".*"$/.test(query.trim()) ? query.trim() : `"${query}"`, ...(note ? { note } : {}) }
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

// What search matches a block on: its text after its tool's name, and for a result after its call's command or path
// too, so a command's output is found by the command that printed it.
const headOf = (b: Block) => (b.kind === 'result' && b.pair ? `${b.tool} ${callSummary(b.pair)}` : (b.tool ?? ''))
const rawOf = (b: Block) => (b.tool ? `${headOf(b)}\n${b.text}` : b.text)
const flatten = (text: string) => text.toLowerCase().replace(/\s+/g, ' ')
const flatOf = (b: Block) => (b.flat ??= flatten(rawOf(b)))

// How a flattened text holds each term: whole, by a compound's parts alone, or not. A phrase matches across any run
// of whitespace, as a command's aligned output spaces its words.
const held = (m: Matcher, flat: string): Held[] =>
  m.terms.map((t) => (flat.includes(t.word) ? 'whole' : t.parts.length && t.parts.every((p) => flat.includes(p)) ? 'parts' : undefined))

const round = (score: number) => Math.round(score * 1_000) / 1_000 // so blocks alike tie, the newest first
// What a block's length divides its score by, less one: a quarter per doubling of 2,000 characters, in steps of an
// eighth so blocks of about one length tie; nothing under about 800 characters.
const lengthStep = (chars: number) => Math.round(Math.log2(1 + chars / 2_000) * 2) / 8
const WORD_CHAR = /[\p{L}\p{N}_]/u
// Whether `w` stands in `text` as a word of its own somewhere: `42` in `id 42`, not in `4242`.
function asWord(text: string, w: string) {
  const left = WORD_CHAR.test(w[0] ?? ' ')
  const right = WORD_CHAR.test(w.at(-1) ?? ' ')
  for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + 1))
    if ((!left || !WORD_CHAR.test(text[i - 1] ?? ' ')) && (!right || !WORD_CHAR.test(text[i + w.length] ?? ' '))) return true
  return false
}

type Excerpt = { text: string; whole: number; lead: number; lines: number }

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

// A hit's lines to show: a block of at most SEARCH_WHOLE_CHARS whole; else up to SEARCH_SPANS runs of lines, each
// started at the line holding the most terms whole, as words, then the most terms, then the rarest in the block (on
// the fewest of its lines), the farthest from the runs taken on a tie, and grown over the matching lines within
// SEARCH_SPAN_GAP of it that hold a term whole. A line is cut around its rarest term. A compound's parts count on a line only when no line
// holds it whole: `101` inside `101047290` is not `shard-101`. With no matching line (a match on the call's command
// alone) the first line and the last two, where a command prints its outcome. `whole`, the most terms one line holds
// whole, ranks the hit; `lead` is the best line.
function blockExcerpt(b: Block, m: Matcher, note: string): Excerpt {
  const { lines, starts } = splitLines(b.text)
  const flats = lines.map(flatten)
  const atoms = [...new Set(m.terms.flatMap((t) => [t.word, ...t.parts]))]
  const freq = new Map(atoms.map((a) => [a, flats.filter((l) => l.includes(a)).length]))
  const heldPerLine: Held[][] = m.regex ? lines.map((l) => [m.regex!.test(l) ? 'whole' : undefined]) : flats.map((l) => held(m, l))
  const wholeSomewhere = (m.regex ? [true] : m.terms).map((_, k) => heldPerLine.some((h) => h[k] === 'whole'))
  const counted = heldPerLine.map((h) => h.map((x, k) => (x === 'parts' && wholeSomewhere[k] ? undefined : x)))
  const spans = spanning(b, starts, heldPerLine, m)
  type Line = { i: number; whole: number; words: number; terms: number; rarity: number; span: number }
  const scored: Line[] = lines.map((_, i) => ({
    i,
    whole: counted[i]!.filter((x) => x === 'whole').length + (spans.has(i) ? 1 : 0),
    words: m.terms.filter((t, k) => counted[i]![k] === 'whole' && asWord(flats[i]!, t.word)).length,
    terms: counted[i]!.filter(Boolean).length + (spans.has(i) ? 1 : 0),
    rarity: atoms.reduce((s, a) => s + (flats[i]!.includes(a) ? 1 / freq.get(a)! : 0), 0),
    span: Math.min(spans.get(i) ?? 1, lines.length - i),
  }))
  let pool = scored.filter((s) => s.terms > 0)
  if (!pool.length) pool = scored.filter((s) => s.rarity > 0) // a compound's parts on separate lines
  const better = (x: Line, y: Line) => y.whole - x.whole || y.words - x.words || y.terms - x.terms || y.rarity - x.rarity
  const lead = [...pool].sort((x, y) => better(x, y) || x.i - y.i)[0]?.i ?? 0
  const matching = new Map(pool.map((s) => [s.i, s]))
  const runs: [number, number][] = []
  const used = new Set<number>()
  if (b.text.length <= SEARCH_WHOLE_CHARS) runs.push([0, lines.length - 1])
  else if (!pool.length) runs.push([0, 0], ...(lines.length > 3 ? [[lines.length - 2, lines.length - 1] as [number, number]] : lines.length > 1 ? [[1, lines.length - 1] as [number, number]] : []))
  else
    while (runs.length < SEARCH_SPANS) {
      const open = pool.filter((s) => !used.has(s.i))
      if (!open.length) break
      const gap = (s: Line) => Math.min(...runs.map(([a, z]) => (s.i < a ? a - s.i : s.i - z)))
      open.sort((x, y) => better(x, y) || (runs.length ? gap(y) - gap(x) : 0) || x.i - y.i)
      const s = open[0]!
      const run: [number, number] = [s.i, s.i + s.span - 1]
      used.add(s.i)
      // Grow over the matching lines nearby, never into another run.
      for (let moved = true; moved; ) {
        moved = false
        for (let j = run[1] + 1; j <= run[1] + SEARCH_SPAN_GAP && !used.has(j); j++) {
          const n = matching.get(j)
          if (n?.whole && j + n.span - run[0] <= SEARCH_SPAN_LINES) (run[1] = j + n.span - 1), used.add(j), (moved = true)
        }
        for (let j = run[0] - 1; j >= run[0] - SEARCH_SPAN_GAP && j >= 0 && !used.has(j); j--) {
          const n = matching.get(j)
          if (n?.whole && n.span === 1 && run[1] - j < SEARCH_SPAN_LINES) (run[0] = j), used.add(j), (moved = true)
        }
      }
      for (let j = run[0]; j <= run[1]; j++) if (matching.has(j)) used.add(j)
      runs.push(run)
    }
  runs.sort((x, y) => x[0] - y[0])
  const anchor = (l: string) => {
    if (m.regex) return Math.max(0, l.search(m.regex))
    const ll = l.toLowerCase()
    const rarest = atoms.filter((a) => ll.includes(a)).sort((x, y) => freq.get(x)! - freq.get(y)! || y.length - x.length)[0]
    return rarest ? ll.indexOf(rarest) : 0
  }
  const whole = b.text.length <= SEARCH_WHOLE_CHARS
  const out: string[] = []
  const shownLines = new Set<number>()
  let chars = 0
  show: for (const [a, z] of runs)
    for (let i = a; i <= z; i++) {
      const span = whole ? 1 : (matching.get(i)?.span ?? 1)
      const l = span > 1 ? b.text.slice(starts[i]!, starts[i + span - 1]! + lines[i + span - 1]!.length) : lines[i]!
      const start = whole || !matching.has(i) ? 0 : Math.max(0, Math.min(anchor(l) - 60, l.length - SEARCH_LINE_CHARS))
      const end = whole ? l.length : start + SEARCH_LINE_CHARS
      const line = `  ${span > 1 ? `${i + 1}-${i + span}` : i + 1}: ${start > 0 ? '…' : ''}${l.slice(start, end).replace(/\s+/g, ' ')}${end < l.length ? '…' : ''}`
      if (out.length && chars + line.length > SEARCH_HIT_CHARS) break show
      out.push(line)
      chars += line.length + 1
      for (let k = i; k < i + span; k++) shownLines.add(k)
      i += span - 1
    }
  const more = pool.filter((s) => !shownLines.has(s.i)).length
  if (more) out.push(`  … ${plural(more, 'more matching line')}`)
  return { text: `[${label(b)}] ${plural(lines.length, 'line')}${note}\n${out.join('\n')}`, whole: Math.max(0, ...pool.map((s) => s.whole)), lead, lines: lines.length }
}

async function search(c: Corpus, input: Input): Promise<RecallResult> {
  const m = matcher(input.query ?? '')
  if (typeof m === 'string') return { mode: 'search', text: m, matches: 0 }
  const limit = input.limit ?? SEARCH_MAX_HITS
  if (input.subagents) for (const s of c.subagents) await c.load(s)
  const home = await threadFor(c, input.from ?? input.to)
  const threads = input.subagents ? [c.main, ...c.subagents] : [home]
  type Hit = { b: Block; t: Thread; i: number; time: number; held: Held[]; weight: number; base: number; score: number; x?: Excerpt }
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
      const holds: Held[] = m.regex ? [pieces(rawOf(b)).some((p) => m.regex!.test(p)) ? 'whole' : undefined] : held(m, flatOf(b))
      pool.push({ b, t, i, time: times[i] ?? 0, held: holds, weight: 0, base: 0, score: 0 })
    }
  }
  // A term weighs more the fewer blocks hold it, so a block with one rare term outranks many with a common one; less
  // when held only by a compound's parts, or inside a longer word (`42` in `4242`); and a long block, which holds
  // many words by its length alone, scores less for them.
  const terms = m.regex ? 1 : m.terms.length
  const weights = Array.from({ length: terms }, (_, k) => Math.log(1 + pool.length / Math.max(1, pool.filter((h) => h.held[k]).length)))
  const total = weights.reduce((s, w) => s + w, 0)
  const matched = new Map(pool.filter((h) => h.held.some(Boolean)).map((h) => [h.b, h]))
  // A call whose result holds every term it does is shown by its result, labelled with its command or path.
  const covered = (h: Hit) => {
    const r = h.b.kind === 'call' && h.b.pair ? matched.get(h.b.pair) : undefined
    return !!r && h.held.every((x, k) => !x || r.held[k])
  }
  const hits = [...matched.values()].filter((h) => !covered(h))
  for (const h of hits) {
    const flat = m.regex ? '' : flatOf(h.b)
    h.weight = h.held.reduce((s, x, k) => s + (x ? weights[k]! : 0), 0)
    const strength = (x: Held, k: number) => (!x ? 0 : x === 'parts' ? 0.5 : m.regex || asWord(flat, m.terms[k]!.word) ? 1 : 0.7)
    h.score = h.base = m.regex ? 1 : round(h.held.reduce((s, x, k) => s + weights[k]! * strength(x, k), 0) / (1 + lengthStep(flat.length)))
  }
  const byTime = (a: Hit, b: Hit) => a.time - b.time || (a.t === b.t ? a.i - b.i : 0)
  const byScore = (a: Hit, b: Hit) => b.score - a.score || byTime(b, a)
  const full = hits.filter((h) => h.held.every((x) => x === 'whole')).sort(byScore)
  const loose = !full.length
  // Blocks holding only some of the terms fill the slots the full matches leave, when they hold at least half the
  // terms' weight: the best of them, marked partial.
  const partial = hits.filter((h) => !h.held.every((x) => x === 'whole') && (loose || h.weight >= total / 2)).sort(byScore)
  // Only the best by their block's score are excerpted; the terms on one line then raise a hit. Excerpting tests a
  // hit's lines again, so a regex has a budget of its own for it, spent on the best (the newest) first.
  // Hits tied with the last of them are excerpted too, up to a cap, as only their lines can tell them apart.
  const best = (list: Hit[], n: number) => {
    const cut = list[n - 1]
    return !cut ? list.slice(0, Math.max(0, n)) : [...list.slice(0, n), ...list.slice(n).filter((h) => h.base === cut.base).slice(0, SEARCH_EXCERPTS * SEARCH_MAX_HITS)]
  }
  const candidates = [...best(full, SEARCH_EXCERPTS * limit), ...best(partial, SEARCH_EXCERPTS * Math.max(0, limit - full.length))]
  const excerptBy = await deadline()
  for (const [n, h] of candidates.entries()) {
    if (n && (await past(excerptBy))) break
    const lacks = loose ? [] : m.terms.filter((_, k) => h.held[k] !== 'whole').map((t) => (t.word.includes(' ') ? `"${t.word}"` : t.word))
    h.x = blockExcerpt(h.b, m, lacks.length ? `; partial, without ${lacks.join(', ')}` : '')
    if (!m.regex) h.score = round(h.base * (1 + (0.5 * h.x.whole) / terms))
  }
  const ranked = [...full.filter((h) => h.x).sort(byScore), ...partial.filter((h) => h.x).sort(byScore)]
  const shown: Hit[] = []
  let chars = 0
  for (const h of ranked) {
    if (shown.length >= limit) break
    if (shown.length && chars + h.x!.text.length > SEARCH_MAX_CHARS) break
    shown.push(h)
    chars += h.x!.text.length + 1
  }
  const count = loose ? partial.length : full.length
  const shownFull = loose ? shown : shown.filter((h) => full.includes(h))
  const extra = loose ? 0 : shown.length - shownFull.length
  const rest = (loose ? partial : full).filter((h) => !shownFull.includes(h))
  // The full matches in time order, the best first when it clearly outscores the others; then the partial ones.
  const lead = shown[0]
  // Marked only when that moves it: a best hit that is also the oldest shown is first in time order anyway.
  const standout = shownFull.length > 1 && shownFull[0]!.score > STANDOUT * shownFull[1]!.score && shownFull.some((h) => byTime(h, lead!) < 0)
  const inOrder = [...(standout ? [lead!] : []), ...shownFull.slice(standout ? 1 : 0).sort(byTime), ...shown.slice(shownFull.length)]
  // Older matches are one "to" away when every one not shown is older than those shown for their time rather than
  // their score.
  const top = Math.max(-Infinity, ...rest.map((h) => h.base))
  const oldest = shownFull.filter((h) => h.base <= top).sort(byTime)[0]
  const before = oldest && oldest.t.blocks[oldest.i - 1]
  const older = !loose && !!before && rest.every((h) => byTime(h, oldest) < 0)
  const where = c.live ? `the live history` : `${plural(c.files.length, 'transcript file')}${threads.length > 1 ? ` and ${plural(threads.length - 1, 'subagent transcript')}` : ''}`
  const head =
    `${count} match(es) for ${m.shown} in ${plural(pool.length, 'block')} of ${where}${c.note ? ` (${c.note})` : ''}` +
    (m.note ? `; ${m.note}` : '') +
    (loose && count ? `; no block holds every term, so these hold some, chosen by the rarest` : '') +
    (rest.length ? `; showing ${shownFull.length}${loose ? '' : older ? ', the newest' : ', the best'}` : '') +
    (extra ? `; and ${plural(extra, 'partial match', 'partial matches')}, which hold only some of the terms` : '') +
    (standout ? '; the best first' : '') +
    (!stopped
      ? ''
      : threads.length === 1
        ? `; the search stopped after ${SEARCH_BUDGET_MS / 1000} s, before ${stopped.b.ref}: simplify the pattern, or search the rest with "from": "${stopped.b.ref}"`
        : // With "subagents", "from" bounds the other transcripts by time, skipping blocks of theirs never searched.
          `; the search stopped after ${SEARCH_BUDGET_MS / 1000} s, before ${stopped.b.ref}` +
          (stopped.left ? `, with ${plural(stopped.left, 'subagent transcript')} not searched` : '') +
          `: simplify the pattern, or search one transcript at a time, without "subagents": "from": "${stopped.b.ref}" searches the rest of this one`) +
    '.'
  const opening = [head]
  // Terms no block holds, whole or (a compound) by parts found anywhere: absent, so not worth searching for again.
  const absent = m.terms.filter((t, k) => !pool.some((h) => h.held[k]) && !(t.parts.length && t.parts.every((p) => pool.some((h) => flatOf(h.b).includes(p)))))
  if (absent.length) {
    const scope = input.from || input.to ? 'this range' : c.note ? 'the readable history' : c.subagents.length && !input.subagents ? 'the main transcript' : 'this session'
    const named = absent.slice(0, ABSENT_MAX).map((t) => (t.word.includes(' ') ? `"${t.word}"` : t.word))
    opening.push(`No occurrences in ${scope} of: ${named.join(', ')}${absent.length > ABSENT_MAX ? `, and ${absent.length - ABSENT_MAX} more` : ''}.`)
  }
  const notes: string[] = []
  if (rest.length)
    notes.push(
      older
        ? `${plural(rest.length, 'older match', 'older matches')} not shown; only if none above answers, repeat with "to": "${before!.ref}".`
        : `${plural(rest.length, 'more match', 'more matches')} not shown; only if none above answers, narrow the query or give "from" or "to".`,
    )
  if (!input.subagents && c.subagents.length) notes.push(`${plural(c.subagents.length, 'subagent transcript')} not searched: repeat with "subagents": true.`)
  const out = [...opening, ...inOrder.map((h) => h.x!.text), ...notes]
  if (lead && lead.x!.lines > 1 && lead.b.text.length > SEARCH_WHOLE_CHARS) {
    const n = lead.x!.lead + 1
    out.push(`Only if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "${lead.b.ref}", "lines": "${Math.max(1, n - 10)}-${Math.min(lead.x!.lines, n + 10)}"}.`)
  }
  const listed = inOrder.map(
    (h): Listed => ({ block: h.b, brief: briefOf(h.x!), rank: shown.indexOf(h), ...(h.t === c.main ? {} : { thread: threadOf(h.t) }) }),
  )
  return {
    mode: 'search',
    text: out.join('\n'),
    matches: count,
    refs: listed.map((h) => h.block.ref),
    hits: { query: input.query!, ...(input.need ? { need: input.need } : {}), head: opening, hits: listed, notes, candidates: listed },
  }
}

const threadOf = (t: Thread) => {
  const what = t.label.replace(/^subagent /, '')
  return `subagent ${t.tag}${what && !what.startsWith(t.tag) ? ` (${what})` : ''}`
}

// A hit in two lines: its excerpt's head and its best line.
function briefOf(x: Excerpt) {
  const [head, ...rows] = x.text.split('\n')
  const best = rows.find((r) => r.startsWith(`  ${x.lead + 1}:`) || r.startsWith(`  ${x.lead + 1}-`)) ?? rows[0]
  return best ? `${head}\n${best}` : head!
}

// ---- Read -------------------------------------------------------------------------------------------------------

function lineRange(spec: string | undefined, total: number): [number, number] | string {
  if (!spec) return [1, total]
  const m = spec.trim().match(/^(\d*)\s*(?:(-)\s*(\d*))?$/)
  if (!m || (!m[1] && !m[3])) return `om_recall: lines is "A-B", "A-", "-B" or "A".`
  const a = m[1] ? Number(m[1]) : 1
  const b = m[2] ? (m[3] ? Number(m[3]) : total) : a
  if (a < 1 || b < a) return `om_recall: lines "${spec.trim()}" holds no line; lines are numbered from 1, as "A-B" with A no more than B.`
  return [a, Math.min(total, b)]
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
  // A subagent's tag alone names its transcript: outlined, as its call's hint says.
  if (!REF.test(ref) && c.subagents.some((s) => sameTag(ref, s.tag))) return outline(c, input)
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
  NotebookEdit: { field: 'notebook_path', did: 'edited' },
}
const FAILED = { read: 'read failed', edited: 'edit failed', wrote: 'write failed' } as const
const ACTIONS = ['read', 'edited', 'wrote', FAILED.read, FAILED.edited, FAILED.wrote]

// Each file a file tool named, the most recently touched first: what each call did to it, and the call's block.
async function files(c: Corpus, input: Input): Promise<RecallResult> {
  const threads = [c.main, ...(input.subagents ? c.subagents : [])]
  for (const t of threads) await c.load(t)
  // The newest touch by its time, a subagent's among the session's; by place in its transcript on a tie.
  const touched = new Map<string, { last: number; order: number; refs: Map<string, string[]> }>()
  let order = 0
  for (const t of threads) {
    const times = timesOf(t)
    for (const [i, b] of t.blocks.entries()) {
      const how = b.kind === 'call' && b.tool ? FILE_TOOLS[b.tool] : undefined
      const path = how && b.input && typeof b.input === 'object' ? (b.input as Record<string, unknown>)[how.field] : undefined
      if (typeof path !== 'string' || !path.trim()) continue
      if (input.query && !path.toLowerCase().includes(input.query.toLowerCase())) continue
      const did = b.pair?.error ? FAILED[how!.did] : how!.did
      const file = touched.get(path) ?? { last: -Infinity, order: 0, refs: new Map() }
      const time = times[i] ?? -Infinity
      if (time >= file.last) (file.last = time), (file.order = ++order)
      file.refs.set(did, [...(file.refs.get(did) ?? []), b.ref])
      touched.set(path, file)
    }
  }
  const listed = [...touched].sort((a, b) => b[1].last - a[1].last || b[1].order - a[1].order)
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

type Input = { mode: Mode; query?: string; need?: string; limit?: number; ref?: string; lines?: string; before?: number; after?: number; from?: string; to?: string; subagents: boolean }

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : undefined)
const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

// The tool's input, loosely typed as a model sends it. A query alone searches, a ref alone reads, nothing outlines.
export function parseInput(e: RecallInput): Input | string {
  for (const key of ['query', 'need', 'mode', 'ref', 'lines', 'from', 'to'] as const) {
    const v = str(e[key])
    if (v && v.length > ARG_MAX_CHARS) return `om_recall: ${key} is at most ${ARG_MAX_CHARS} characters${key === 'query' ? '; search for its rarest words' : ''}.`
  }
  const query = str(e.query)
  const ref = str(e.ref)
  // A ref alone that names a transcript (a subagent's tag) rather than a block outlines it.
  const mode = str(e.mode) ?? (ref && !query ? (REF.test(ref) ? 'read' : 'outline') : query ? 'search' : 'outline')
  if (mode !== 'search' && mode !== 'read' && mode !== 'outline' && mode !== 'files') return `om_recall: mode is search, read, outline or files.`
  if (mode === 'search' && !query) return 'om_recall: give a query.'
  if (mode === 'read' && !ref) return 'om_recall: give the ref of the block to read, from a search or an outline.'
  const limit = num(e.limit)
  return {
    mode,
    query,
    need: str(e.need),
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

// With a `librarian`, what it answers a search with stands in for the hits' excerpts, unless it answers nothing. It
// gets the hits of the same search over the subagents' transcripts too, which the excerpts leave out unless asked.
export async function recall(c: Corpus, e: RecallInput, librarian?: Librarian): Promise<RecallResult> {
  const input = parseInput(e)
  if (typeof input === 'string') {
    const asked = str(e.mode)
    return { mode: asked === 'read' || asked === 'outline' || asked === 'files' ? asked : 'search', text: input, matches: 0 }
  }
  let found = await (input.mode === 'search' ? search(c, input) : input.mode === 'read' ? read(c, input) : input.mode === 'files' ? files(c, input) : outline(c, input))
  if (librarian && found.hits) {
    const wide = !input.subagents && c.subagents.length ? (await search(c, { ...input, subagents: true })).hits : undefined
    const hits = { ...found.hits, candidates: wide?.hits ?? found.hits.hits }
    const pasted = hits.candidates.length ? await librarian(hits) : undefined
    if (pasted) found = { ...found, ...pasted }
  }
  const calls = answeredThisTurn(c.main)
  const nudge = calls >= TURN_CALLS ? `\nThis is om_recall call ${calls + 1} this turn: answer from what you have found unless a specific fact is still missing.` : ''
  // Each mode keeps under the cap; this holds it whatever the input.
  const room = RESPONSE_MAX_CHARS - nudge.length
  const cut = `\n… cut at ${grouped(RESPONSE_MAX_CHARS)} characters; ask for less.`
  const text = found.text.length > room ? `${found.text.slice(0, room - cut.length)}${cut}` : found.text
  return { ...found, text: text + nudge }
}
