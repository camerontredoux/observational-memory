// om_recall: search, read and outline the session's whole transcript. The transcript is the chain of files the
// session wrote (Claude Code may continue a session in a new file, the old one ending in a `continued-in` row), each
// block addressed `<file>:<line>`, the file's first 8 characters and the line of the JSONL row: rows are only ever
// appended, so a reference holds across compactions and moves. With no transcript file, the live history is read
// instead, its blocks addressed `#<row>`. No `$` here: the engine never lets it cross an import, so the caller passes
// what reads files as `RecallIo`.
import type { SessionMessage } from 'claude-code'
import { COMPACT_WRAPPER, MEMORY_HEADER } from './prompts'

const RECALL_TOOL = 'om_recall'
export const SEARCH_MAX_HITS = 20
const SEARCH_MAX_CHARS = 10_000 // about 2.5k tokens of hits
const SEARCH_LINES_PER_HIT = 3
const SEARCH_LINE_CHARS = 200
const READ_MAX_LINES = 200
const READ_MAX_CHARS = 12_000 // one page of a block, about 3k tokens
const NEIGHBORS_MAX = 5 // blocks before or after a read block
const NEIGHBOR_MAX_CHARS = 1_000
const OUTLINE_MAX_LINES = 120
const OUTLINE_MAX_CHARS = 12_000
const WRAP = 1_000 // a longer line counts as several, so every line fits a page
const CHAIN_MAX_FILES = 20
const TAG = 8 // characters of a session or agent id naming its file in a reference

export type RecallIo = {
  read: (path: string) => Promise<string>
  list: (dir: string) => Promise<string[]> // entry names; none when the directory is missing
  // The name, among `names` in `dir`, of the file that says the session `id` continued it.
  continuing: (dir: string, names: readonly string[], id: string) => Promise<string | undefined>
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
export type Mode = 'search' | 'read' | 'outline'
export type RecallResult = { mode: Mode; text: string; matches: number }

type Kind = 'user' | 'assistant' | 'call' | 'result' | 'memory' | 'summary'
type Block = {
  ref: string
  kind: Kind
  text: string
  time?: number
  tool?: string
  error?: boolean
  meta?: boolean // a row the engine injected, as an image's note
  own?: boolean // om_recall's own call or result
  asking?: boolean // the newest prompt, the one that asked: never a match
  pair?: Block // a call's result, a result's call
  agent?: string // the tag of the subagent a call started
}
type Thread = { tag: string; label: string; blocks: Block[]; path?: string; loaded: boolean }
type Corpus = { main: Thread; files: string[]; subagents: Thread[]; live: boolean; note?: string; load: (t: Thread) => Promise<void> }

// A v0.4.1 memory message starts with the header; later ones with the built-in wrapper before it.
const isMemoryText = (text: string) => text.startsWith(MEMORY_HEADER) || text.startsWith(`${COMPACT_WRAPPER}\n\n${MEMORY_HEADER}`)
// What the user typed: not an injected block (a system reminder, task notification, command output, image note).
function typedText(text: string) {
  const t = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()
  return !t || /^<[a-z][a-z-]*>/.test(t) || t.startsWith('[Image') ? undefined : t
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
const grouped = (n: number) => n.toLocaleString('en-US')
const plural = (n: number, noun: string, nouns = `${noun}s`) => `${grouped(n)} ${n === 1 ? noun : nouns}`
const stem = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.jsonl$/, '')
// A file's name in a reference: the first 8 characters of a session or agent id, else its whole name.
const tagFor = (id: string) => (/^[0-9a-f]{8}[0-9a-f-]{8,}$/i.test(id) ? id.slice(0, TAG) : id)
const dirOf = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/'))) || '.'

// A block's lines, each longer one cut every WRAP characters: the numbering search, read and paging share.
function linesOf(text: string) {
  const out: string[] = []
  for (const line of text.split('\n')) for (let i = 0; i === 0 || i < line.length; i += WRAP) out.push(line.slice(i, i + WRAP))
  return out
}

// A tool's input, one `key: value` per field, a string as it is, so a command or a file's text reads by its lines.
function renderInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return JSON.stringify(input ?? {})
  return Object.entries(input)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n')
}

function resultText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content))
    return content
      .map((b: { type?: string; text?: string; tool_name?: string }) =>
        b.type === 'text' ? (b.text ?? '') : b.type === 'image' ? '[image]' : b.type === 'tool_reference' ? `[tool ${b.tool_name ?? ''}]` : `[${b.type ?? 'block'}]`,
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
// What the files of one thread share while they are read in order: the rows seen, and the calls awaiting results.
type Seen = { uuids: Set<string>; contents: Set<string>; calls: Map<string, Block> }
const newSeen = (): Seen => ({ uuids: new Set(), contents: new Set(), calls: new Map() })

function pairUp(seen: Seen, b: Block, callId: string) {
  const call = seen.calls.get(callId)
  if (!call) return
  b.pair = call
  call.pair = b
  b.tool = call.tool
  b.own = call.own
}

type Part = { b: Omit<Block, 'ref'>; callId?: string; resultOf?: string }
const callBlock = (base: Partial<Block>, tool: string, input: unknown): Omit<Block, 'ref'> => ({
  ...base,
  kind: 'call',
  tool,
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

// One transcript file's user and assistant rows as blocks. A row a newer file copied from an older one (the same
// uuid) is read once, from the older file; so are the messages a compaction writes again after its boundary.
function parseFile(tag: string, text: string, seen: Seen, sidechain: boolean) {
  const blocks: Block[] = []
  let continuedIn: string | undefined
  let copying = false
  const lines = text.split('\n')
  for (let n = 0; n < lines.length; n++) {
    let r: Row
    try {
      r = JSON.parse(lines[n]!) as Row
    } catch {
      continue // a line still being written
    }
    if (r.type === 'continued-in' && r.continuedInSessionId) continuedIn = r.continuedInSessionId
    if (r.type === 'system' && r.subtype === 'compact_boundary') copying = true
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
    const key = `${r.type}\n${parts.map((p) => p.id ?? p.tool_use_id ?? p.text ?? p.type).join('\n')}`
    const summary = r.type === 'user' && parts.some((p) => p.type === 'text' && p.text?.startsWith(COMPACT_WRAPPER))
    if (copying && !summary && !parts.some((p) => p.type === 'text' && p.text && isMemoryText(p.text))) {
      if (seen.contents.has(key)) continue
      copying = false
    }
    seen.contents.add(key)
    const time = r.timestamp ? Date.parse(r.timestamp) : NaN
    const base = { ...(Number.isNaN(time) ? {} : { time }), ...(r.isMeta ? { meta: true } : {}) }
    const made: Part[] = []
    for (const p of parts) {
      if (p.type === 'text' && p.text) {
        const kind: Kind = r.type === 'assistant' ? 'assistant' : isMemoryText(p.text) ? 'memory' : summary || r.isCompactSummary ? 'summary' : 'user'
        made.push({ b: { ...base, kind, text: p.text } })
      } else if (p.type === 'tool_use' || p.type === 'server_tool_use') made.push({ b: callBlock(base, p.name ?? 'tool', p.input), callId: p.id })
      else if (p.type.endsWith('tool_result'))
        made.push({ b: { ...base, kind: 'result', text: resultText(p.content), ...(p.is_error ? { error: true } : {}) }, resultOf: p.tool_use_id })
    }
    addParts(`${tag}:${n + 1}`, made, seen, blocks)
  }
  return { blocks, continuedIn }
}

// The newest prompt is the one that asked: search never answers with it.
function markAsking(blocks: readonly Block[]) {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i]!
    if (b.kind === 'user' && !b.meta && typedText(b.text) !== undefined) return void (b.asking = true)
  }
}

// The session's files, oldest first: each found by the `continued-in` row that names the one after it.
async function chainOf(io: RecallIo, path: string) {
  const dir = dirOf(path)
  const names = (await io.list(dir).catch(() => [])).filter((n) => n.endsWith('.jsonl'))
  const files = [path]
  for (let id = stem(path); files.length < CHAIN_MAX_FILES; ) {
    const taken = new Set(files.map((f) => f.slice(f.lastIndexOf('/') + 1)))
    const prev = await io.continuing(dir, names.filter((n) => !taken.has(n)), id).catch(() => undefined)
    if (!prev) break
    files.unshift(`${dir}/${prev}`)
    id = stem(prev)
  }
  return { dir, names, files }
}

// The session's whole transcript from its newest file: the files before it, and after it when it was continued.
export async function loadTranscript(io: RecallIo, path: string, options: { asking?: boolean } = {}): Promise<Corpus> {
  const { dir, names, files } = await chainOf(io, path)
  const seen = newSeen()
  const blocks: Block[] = []
  for (let i = 0; i < files.length && files.length <= CHAIN_MAX_FILES; i++) {
    const tag = tagFor(stem(files[i]!))
    const parsed = parseFile(tag, await io.read(files[i]!), seen, false)
    blocks.push(...parsed.blocks)
    const next = parsed.continuedIn && `${parsed.continuedIn}.jsonl`
    if (i === files.length - 1 && next && names.includes(next) && !files.includes(`${dir}/${next}`)) files.push(`${dir}/${next}`)
  }
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
  return {
    main: { tag: 'main', label: 'session', blocks, loaded: true },
    files: files.map((f) => tagFor(stem(f))),
    subagents,
    live: false,
    load: async (t) => {
      if (t.loaded || !t.path) return
      t.blocks = parseFile(t.tag, await io.read(t.path), newSeen(), true).blocks
      t.loaded = true
    },
  }
}

// The live history, when there is no transcript file to read: rows addressed by their index, which a compaction moves.
export function liveTranscript(rows: readonly SessionMessage[], times: readonly (number | undefined)[], capped: boolean): Corpus {
  const seen = newSeen()
  const blocks: Block[] = []
  rows.forEach((m, i) => {
    const base = times[i] === undefined ? {} : { time: times[i] }
    const made: Part[] = []
    if (m.text) {
      const kind: Kind = m.role === 'assistant' ? 'assistant' : isMemoryText(m.text) ? 'memory' : m.text.startsWith(COMPACT_WRAPPER) ? 'summary' : 'user'
      made.push({ b: { ...base, kind, text: m.text } })
    }
    for (const u of m.toolUses) made.push({ b: callBlock(base, u.tool, u.input), callId: u.tool_use_id })
    for (const r of m.toolResults ?? []) made.push({ b: { ...base, kind: 'result', text: r.text, ...(r.isError ? { error: true } : {}) }, resultOf: r.tool_use_id })
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

type Matcher = { all: (text: string) => boolean; score: (text: string) => number; line: (text: string) => number; terms: number; shown: string }

// `/regex/flags` (case-insensitive unless flags are given), else words and "quoted phrases", all of which must appear.
function matcher(query: string): Matcher | string {
  const re = query.match(/^\/([\s\S]+)\/([a-z]*)$/)
  if (re) {
    let rx: RegExp
    try {
      rx = new RegExp(re[1]!, (re[2] || 'i').replace(/[gy]/g, ''))
    } catch (error) {
      return `om_recall: not a valid regular expression (${error instanceof Error ? error.message : String(error)}).`
    }
    return { all: (t) => rx.test(t), score: (t) => (rx.test(t) ? 1 : 0), line: (t) => t.search(rx), terms: 1, shown: `/${re[1]}/${re[2] ?? ''}` }
  }
  const terms = [...query.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => (m[1] ?? m[2]!).toLowerCase())
  if (!terms.length) return 'om_recall: give a query.'
  const score = (t: string) => {
    const lower = t.toLowerCase()
    return terms.filter((w) => lower.includes(w)).length
  }
  return {
    all: (t) => score(t) === terms.length,
    score,
    line: (t) => {
      const lower = t.toLowerCase()
      const at = terms.map((w) => lower.indexOf(w)).filter((n) => n >= 0)
      return at.length ? Math.min(...at) : -1
    },
    terms: terms.length,
    shown: /^".*"$/.test(query.trim()) ? query.trim() : `"${query}"`,
  }
}

function renderHit(b: Block, m: Matcher) {
  const lines = linesOf(b.text)
  const found: string[] = []
  let more = 0
  lines.forEach((l, i) => {
    const at = m.line(l)
    if (at < 0) return
    if (found.length >= SEARCH_LINES_PER_HIT) return void more++
    const start = Math.max(0, Math.min(at - 60, l.length - SEARCH_LINE_CHARS))
    const cut = l.slice(start, start + SEARCH_LINE_CHARS).replace(/\s+/g, ' ')
    found.push(`  ${i + 1}: ${start > 0 ? '…' : ''}${cut}${start + SEARCH_LINE_CHARS < l.length ? '…' : ''}`)
  })
  if (!found.length) found.push(`  1: ${oneLine(lines[0] ?? '', SEARCH_LINE_CHARS)}`) // a match on the tool's name alone
  if (more) found.push(`  … ${plural(more, 'more matching line')}`)
  return `[${label(b)}] ${plural(lines.length, 'line')}\n${found.join('\n')}`
}

async function search(c: Corpus, input: Input): Promise<RecallResult> {
  const m = matcher(input.query ?? '')
  if (typeof m === 'string') return { mode: 'search', text: m, matches: 0 }
  const limit = input.limit ?? SEARCH_MAX_HITS
  if (input.subagents) for (const s of c.subagents) await c.load(s)
  const home = await threadFor(c, input.from ?? input.to)
  const threads = input.subagents ? [c.main, ...c.subagents] : [home]
  type Hit = { b: Block; t: Thread; i: number; time: number; score: number }
  const pool: Hit[] = []
  let searched = 0
  for (const t of threads) {
    const r = range(t, input.from, input.to, home)
    if (typeof r === 'string') return { mode: 'search', text: `om_recall: ${r}.`, matches: 0 }
    const times = timesOf(t)
    for (let i = r[0]; i <= r[1]; i++) {
      const b = t.blocks[i]!
      if (b.own || b.asking || b.kind === 'memory') continue
      searched++
      const text = b.tool ? `${b.tool}\n${b.text}` : b.text
      pool.push({ b, t, i, time: times[i] ?? 0, score: m.score(text) })
    }
  }
  let hits = pool.filter((h) => h.score === m.terms)
  const loose = !hits.length
  if (loose) hits = pool.filter((h) => h.score > 0)
  const byTime = (a: Hit, b: Hit) => a.time - b.time || (a.t === b.t ? a.i - b.i : 0)
  hits.sort(byTime)
  // Newest first within the caps, best first when no block holds every term; shown in time order.
  const ranked = loose ? [...hits].sort((a, b) => b.score - a.score || byTime(b, a)) : [...hits].reverse()
  const shown: { h: Hit; text: string }[] = []
  let chars = 0
  for (const h of ranked) {
    if (shown.length >= limit) break
    const text = renderHit(h.b, m)
    if (shown.length && chars + text.length > SEARCH_MAX_CHARS) break
    shown.push({ h, text })
    chars += text.length + 1
  }
  shown.sort((a, b) => byTime(a.h, b.h))
  const where = c.live ? `the live history` : `${plural(c.files.length, 'transcript file')}${threads.length > 1 ? ` and ${plural(threads.length - 1, 'subagent transcript')}` : ''}`
  const head =
    `${hits.length} match(es) for ${m.shown} in ${plural(searched, 'block')} of ${where}${c.note ? ` (${c.note})` : ''}` +
    (loose && hits.length ? `; no block holds every term, so these hold some, best first` : '') +
    (hits.length > shown.length ? `; showing ${shown.length}${loose ? '' : ', the newest'}` : '') +
    '.'
  const out = [head, ...shown.map((s) => s.text)]
  if (hits.length > shown.length && !loose && shown.length) {
    const oldest = shown[0]!.h
    const before = oldest.t.blocks[oldest.i - 1]
    if (before) out.push(`Older matches: repeat with "to": "${before.ref}".`)
  }
  if (!input.subagents && c.subagents.length && !hits.length)
    out.push(`${plural(c.subagents.length, 'subagent transcript')} not searched: repeat with "subagents": true.`)
  if (shown.length) out.push(`Read a block in full: {"mode": "read", "ref": "${shown.at(-1)!.h.b.ref}"}.`)
  return { mode: 'search', text: out.join('\n'), matches: hits.length }
}

// ---- Read -------------------------------------------------------------------------------------------------------

function parseLines(spec: string | undefined, total: number): [number, number] | string {
  if (!spec) return [1, total]
  const m = spec.trim().match(/^(\d*)\s*(?:(-)\s*(\d*))?$/)
  if (!m || (!m[1] && !m[3])) return `om_recall: lines is "A-B", "A-", "-B" or "A".`
  const a = m[1] ? Number(m[1]) : 1
  const b = m[2] ? (m[3] ? Number(m[3]) : total) : a
  return [Math.max(1, a), Math.min(total, b)]
}

function page(b: Block, spec: string | undefined) {
  const lines = linesOf(b.text)
  const r = parseLines(spec, lines.length)
  if (typeof r === 'string') return r
  const [a, want] = r
  if (a > lines.length) return `om_recall: ${b.ref} has ${plural(lines.length, 'line')}.`
  const out: string[] = []
  let chars = 0
  let n = a
  for (; n <= want && n - a < READ_MAX_LINES; n++) {
    const l = lines[n - 1]!
    if (out.length && chars + l.length > READ_MAX_CHARS) break
    out.push(`${String(n).padStart(4)} | ${l}`)
    chars += l.length + 8
  }
  const last = n - 1
  const links = [b.pair ? `${b.kind === 'call' ? 'result' : 'call'}: ${b.pair.ref}` : '', b.agent ? `subagent transcript: ${b.agent} (outline it with "ref": "${b.agent}")` : '']
    .filter(Boolean)
    .join('; ')
  const head = `[${label(b)}] lines ${a}-${last} of ${lines.length}${links ? ` (${links})` : ''}`
  const rest = lines.length - last
  const tail =
    last < want || rest > 0
      ? `\n… ${plural(rest, 'more line')}: ask {"mode": "read", "ref": "${b.ref}", "lines": "${last + 1}-${Math.min(lines.length, last + READ_MAX_LINES)}"}.`
      : ''
  return `${head}\n${out.join('\n')}${tail}`
}

function neighbor(b: Block) {
  const lines = linesOf(b.text)
  let text = b.text
  if (text.length > NEIGHBOR_MAX_CHARS) text = `${text.slice(0, NEIGHBOR_MAX_CHARS)}\n… (read ${b.ref} for all ${plural(lines.length, 'line')})`
  return `[${label(b)}]\n${text}`
}

async function read(c: Corpus, input: Input): Promise<RecallResult> {
  const ref = input.ref ?? ''
  const t = await threadFor(c, ref)
  const i = indexOf(t, ref)
  if (i < 0) return { mode: 'read', text: `om_recall: no block ${ref}. A reference looks like ${t.blocks[0]?.ref ?? 'a79f045b:12'}, from a search or an outline.`, matches: 0 }
  const b = t.blocks[i]!
  const shown = page(b, input.lines)
  const pick = (from: number, step: number, n: number) => {
    const out: Block[] = []
    for (let j = from; j >= 0 && j < t.blocks.length && out.length < n; j += step) if (!t.blocks[j]!.own) out.push(t.blocks[j]!)
    return out
  }
  const before = pick(i - 1, -1, Math.min(input.before ?? 0, NEIGHBORS_MAX)).reverse()
  const after = pick(i + 1, 1, Math.min(input.after ?? 0, NEIGHBORS_MAX))
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
  const source =
    t === c.main
      ? c.live
        ? `the live history${c.note ? ` (${c.note})` : ''}`
        : `${plural(c.files.length, 'transcript file')} (${c.files.join(' → ')})`
      : `${t.label}`
  const subs = t === c.main && c.subagents.length ? `; ${plural(c.subagents.length, 'subagent transcript')} (${c.subagents.map((s) => s.tag).join(', ')})` : ''
  const head = `Outline of ${source}: ${plural(all.length, 'entry', 'entries')}${span}${subs}. Tool calls point → at their results; read any block with {"mode": "read", "ref": "<ref>"}.`
  const out = [head, ...(lines.length ? lines : ['(nothing in this range)'])]
  if (next) out.push(`More: {"mode": "outline", "from": "${next.ref}"${input.to ? `, "to": "${input.to}"` : ''}}.`)
  return { mode: 'outline', text: out.join('\n'), matches: lines.length }
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
  const query = str(e.query)
  const ref = str(e.ref)
  const mode = str(e.mode) ?? (ref && !query ? 'read' : query ? 'search' : 'outline')
  if (mode !== 'search' && mode !== 'read' && mode !== 'outline') return `om_recall: mode is search, read or outline.`
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

export async function recall(c: Corpus, e: RecallInput): Promise<RecallResult> {
  const input = parseInput(e)
  if (typeof input === 'string') return { mode: str(e.mode) === 'read' ? 'read' : str(e.mode) === 'outline' ? 'outline' : 'search', text: input, matches: 0 }
  return input.mode === 'search' ? search(c, input) : input.mode === 'read' ? read(c, input) : outline(c, input)
}

// ---- v0.4.9 -----------------------------------------------------------------------------------------------------

// v0.4.9's om_recall over one transcript file, kept to compare against: every row part that holds all the query's
// words (any, when none holds all), newest last, each as a 400-character snippet.
export function legacyRecall(jsonl: string, query: string, limit = SEARCH_MAX_HITS) {
  const rows: SessionMessage[] = []
  const times: (number | undefined)[] = []
  for (const line of jsonl.split('\n')) {
    let r: Row
    try {
      r = JSON.parse(line) as Row
    } catch {
      continue
    }
    if ((r.type !== 'user' && r.type !== 'assistant') || r.isSidechain) continue
    const content = r.message?.content
    const blocks: Content[] = typeof content === 'string' ? [{ type: 'text', text: content }] : (content ?? [])
    const legacyResult = (c: unknown): string =>
      typeof c === 'string' ? c : Array.isArray(c) ? c.map((b: { text?: string }) => b.text ?? '').join('\n') : ''
    const m: SessionMessage = {
      role: r.type,
      text: blocks.flatMap((b) => (b.type === 'text' && b.text ? [b.text] : [])).join('\n'),
      toolUses: blocks.flatMap((b) => (b.type === 'tool_use' ? [{ tool_use_id: b.id ?? '', tool: b.name ?? '', input: (b.input ?? {}) as Record<string, unknown> }] : [])),
    }
    const results = blocks.flatMap((b) => (b.type === 'tool_result' ? [{ tool_use_id: b.tool_use_id ?? '', text: legacyResult(b.content), isError: !!b.is_error }] : []))
    if (results.length) m.toolResults = results
    if (!m.text && !m.toolUses.length && !results.length) continue
    rows.push(m)
    const time = r.timestamp ? Date.parse(r.timestamp) : NaN
    times.push(Number.isNaN(time) ? undefined : time)
  }
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return 'om_recall: give a query.'
  let asking = rows.length - 1
  while (asking >= 0 && !(rows[asking]!.role === 'user' && !rows[asking]!.toolResults?.length && !isMemoryText(rows[asking]!.text) && !rows[asking]!.text.startsWith(COMPACT_WRAPPER) && typedText(rows[asking]!.text) !== undefined)) asking--
  const names = new Map<string, string>()
  const parts: { i: number; label: string; text: string }[] = []
  rows.forEach((m, i) => {
    if (m.role === 'user' && isMemoryText(m.text)) return
    const when = times[i] === undefined ? '' : ` ${stamp(times[i]!)}`
    if (m.text && i !== asking) parts.push({ i, label: `${m.role}${when}`, text: m.text })
    for (const u of m.toolUses) {
      names.set(u.tool_use_id, u.tool)
      if (!u.tool.endsWith(`__${RECALL_TOOL}`)) parts.push({ i, label: `assistant${when} called ${u.tool}`, text: JSON.stringify(u.input) })
    }
    for (const r of m.toolResults ?? []) {
      const tool = names.get(r.tool_use_id) ?? 'tool'
      if (!tool.endsWith(`__${RECALL_TOOL}`)) parts.push({ i, label: `${tool} result${when}${r.isError ? ' (error)' : ''}`, text: r.text })
    }
  })
  const score = (text: string) => words.filter((w) => text.toLowerCase().includes(w)).length
  let hits = parts.filter((p) => score(p.text) === words.length)
  if (!hits.length) hits = parts.filter((p) => score(p.text) > 0).sort((a, b) => score(b.text) - score(a.text) || a.i - b.i)
  const shown = hits.slice(-limit).sort((a, b) => a.i - b.i)
  const out = [`${hits.length} match(es) for "${query}" in ${rows.length} messages${hits.length > shown.length ? `; showing the last ${shown.length}` : ''}.`]
  for (const p of shown) {
    const lower = p.text.toLowerCase()
    const at = Math.max(0, Math.min(...words.map((w) => lower.indexOf(w)).filter((n) => n >= 0)) - 100)
    const snippet = `${at > 0 ? '…' : ''}${p.text.slice(at, at + 400)}${at + 400 < p.text.length ? '…' : ''}`
    out.push(`\n[#${p.i} ${p.label}] ${snippet.replace(/\s+/g, ' ')}`)
  }
  return out.join('')
}
