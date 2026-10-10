// How the threshold microcompact (tool-result truncation at the auto-compaction threshold) is performing, from the
// sessions on this machine. Not part of the plugin. Not typechecked by `tsc -p .` (Bun's Node APIs).
//
// Usage:
//   bun scripts/truncation-report.ts [--since <days>] [--session <id-prefix>] [--projects <dir>] [--json]
//
// Defaults: the last 7 days of transcripts under ~/.claude/projects, every session that holds a truncation pass.
//
// A truncation pass is read from two places and joined by time: the plugin's store (`truncations:<sessionId>`, one
// record per pass: `{ at, cleared, images, tokensSaved, contextBefore }`) and the transcript (a `compact_boundary`
// row with no memory message after it, the rebuilt rows holding the stub marker). Either alone is enough to report
// on; both together cross-check each other.
//
// For each pass the report compares the stretch of tool calls after it with the same number of calls before it:
//   reads / re-reads   Read calls, and those of a path already read earlier in the session. A re-read after a pass is
//                      the expected cost of truncation: the model going back to disk for text it no longer sees.
//   recall             om_recall calls, the other way back to cleared text.
//   reruns             Bash commands identical to one run earlier (re-running tests to see their output again).
//   edit failures      Edit results saying the string was not found, or the file was not read / changed since read:
//                      the model editing from a stale memory of a cleared Read.
//   lost-detail notes  assistant text saying it no longer has or cannot see an earlier output (a weak signal; read
//                      the matching lines, do not trust the count alone).
// and how far the pass deferred the real compaction: tool calls and context tokens from the pass to the next
// observational-memory compaction (or the end of the session).
//
// Read it as: re-reads and recall going up a little after a pass is the design working; edit failures and
// lost-detail notes going up is the model acting on text it should have re-read, and a reason to keep more calls
// (KEEP_RECENT_CALLS) or require more savings (TRUNCATE_MIN_SHARE) before truncating.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fail, num, options, str } from './cli'

// The stub the pass leaves in a cleared result (rows.ts's clearedResult): maskTail's omission marker at the very start,
// then `[<tool> <command or path> · ok | error: … | screenshot cleared]`. Kept in step with that text.
const STUB = /^\s*\.\.\. \[~[\d.k]+ tokens omitted; om_recall can retrieve the full result\] \.\.\.\s*\[[^\n]* · (ok|error: |screenshot cleared)/
// How a memory message starts (memory.ts's MEMORY_MARK), alone or under the compaction wrapper.
const MEMORY_MARK = 'The following observations block is your memory of this session'
const EDIT_FAILURE = /String to replace not found|File has not been read yet|has been modified since read|File content has changed since it was last read/
const LOST_DETAIL = /\b(no longer (have|see)|was cleared|output (was|is) (cleared|truncated)|can't see the (earlier|previous|original) (output|result)|cannot see the (earlier|previous|original) (output|result))\b/i
const RECALL_TOOL = /om_recall$/

type Call = { i: number; id: string; name: string; input: Record<string, unknown>; at: number; error?: boolean; result?: string }
type Boundary = { i: number; at: number; kind: 'truncation' | 'om' | 'builtin'; preTokens?: number; postTokens?: number; trigger?: string }
type Row = { type?: string; subtype?: string; timestamp?: string; message?: { id?: string; content?: unknown }; compactMetadata?: Record<string, unknown>; isCompactSummary?: boolean }
type StoreRecord = { at: number; cleared?: number; images?: number; tokensSaved?: number; contextBefore?: number }

const o = options(process.argv.slice(2))
const sinceDays = num(o, 'since', 7)!
const sessionFilter = str(o, 'session')
const projects = str(o, 'projects') ?? join(homedir(), '.claude', 'projects')
const asJson = o.json === true
const sinceMs = Date.now() - sinceDays * 24 * 60 * 60 * 1000
if (!existsSync(projects)) fail(`${projects}: no such directory`)

// The plugin's store: every file the engine keeps for this plugin, their `truncations:` keys merged.
function storeRecords(): Map<string, StoreRecord[]> {
  const dir = join(homedir(), '.claude', 'plugins', 'store')
  const out = new Map<string, StoreRecord[]>()
  if (!existsSync(dir)) return out
  for (const f of readdirSync(dir)) {
    if (!f.startsWith('observational-memory_') || !f.endsWith('.json')) continue
    let data: Record<string, unknown>
    try {
      data = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    } catch {
      continue
    }
    for (const [k, v] of Object.entries(data)) {
      if (!k.startsWith('truncations:') || !Array.isArray(v)) continue
      const id = k.slice('truncations:'.length).split('/')[0]!
      const list = out.get(id) ?? []
      for (const r of v) if (r && typeof r.at === 'number') list.push(r as StoreRecord)
      out.set(id, list)
    }
  }
  return out
}

// A message's or a block list's text, a tool_result's own content included.
const text = (c: unknown): string => {
  if (typeof c === 'string') return c
  if (!Array.isArray(c)) return ''
  return c
    .map((b) => {
      if (!b || typeof b !== 'object') return ''
      const blk = b as { type?: string; text?: unknown; content?: unknown }
      if (blk.type === 'tool_result') return text(blk.content)
      return typeof blk.text === 'string' ? blk.text : ''
    })
    .join('\n')
}

// One session's calls, boundaries and assistant texts, in transcript order.
function readSession(path: string) {
  const calls: Call[] = []
  const byId = new Map<string, Call>()
  const boundaries: Boundary[] = []
  const notes: { i: number; at: number; line: string }[] = []
  const lines = readFileSync(path, 'utf8').split('\n')
  let pending: Boundary | undefined
  let i = 0
  for (const line of lines) {
    if (!line) continue
    let row: Row
    try {
      row = JSON.parse(line)
    } catch {
      continue
    }
    const at = row.timestamp ? Date.parse(row.timestamp) : Number.NaN
    if (row.type === 'system' && row.subtype === 'compact_boundary') {
      const m = row.compactMetadata ?? {}
      pending = { i, at, kind: 'builtin', preTokens: m.preTokens as number | undefined, postTokens: m.postTokens as number | undefined, trigger: m.trigger as string | undefined }
      boundaries.push(pending)
      i++
      continue
    }
    const content = row.message?.content
    if (row.type === 'user') {
      const t = text(content)
      if (pending) {
        // The first user row after a boundary tells the compaction apart: a memory message, a built-in summary, or the
        // rebuilt rows of a truncation pass (tool results with the stub in them, no summary at all).
        if (t.includes(MEMORY_MARK)) pending.kind = 'om'
        else if (row.isCompactSummary || t.startsWith('This session is being continued')) pending.kind = 'builtin'
        else if (STUB.test(t)) pending.kind = 'truncation'
        if (pending.kind !== 'builtin' || !STUB.test(t)) pending = undefined
      }
      if (Array.isArray(content))
        for (const b of content) {
          if (!b || typeof b !== 'object' || (b as { type?: string }).type !== 'tool_result') continue
          const r = b as { tool_use_id: string; content?: unknown; is_error?: boolean }
          const call = byId.get(r.tool_use_id)
          if (call) ((call.error = r.is_error === true), (call.result = text(r.content)))
        }
    } else if (row.type === 'assistant' && Array.isArray(content)) {
      for (const b of content) {
        if (!b || typeof b !== 'object') continue
        const blk = b as { type?: string; id?: string; name?: string; input?: Record<string, unknown>; text?: string }
        if (blk.type === 'tool_use' && blk.id && blk.name) {
          const c: Call = { i, id: blk.id, name: blk.name, input: blk.input ?? {}, at }
          calls.push(c)
          byId.set(blk.id, c)
        } else if (blk.type === 'text' && blk.text && LOST_DETAIL.test(blk.text)) {
          const m = blk.text.match(LOST_DETAIL)!
          const s = Math.max(0, m.index! - 60)
          notes.push({ i, at, line: blk.text.slice(s, m.index! + 100).replace(/\s+/g, ' ') })
        }
      }
    }
    i++
  }
  return { calls, boundaries, notes }
}

type Window = { calls: number; reads: number; rereads: number; recall: number; reruns: number; editFailures: number; notes: number }

// The calls in [from, to) scored against what came before `from` in the whole session.
function score(all: Call[], notes: { i: number }[], from: number, to: number): Window {
  const seenPaths = new Set<string>()
  const seenCommands = new Set<string>()
  for (const c of all) {
    if (c.i >= from) break
    if (c.name === 'Read' && typeof c.input.file_path === 'string') seenPaths.add(c.input.file_path)
    if (c.name === 'Bash' && typeof c.input.command === 'string') seenCommands.add(c.input.command)
  }
  const w: Window = { calls: 0, reads: 0, rereads: 0, recall: 0, reruns: 0, editFailures: 0, notes: 0 }
  for (const c of all) {
    if (c.i < from) continue
    if (c.i >= to) break
    w.calls++
    if (c.name === 'Read') {
      w.reads++
      const p = typeof c.input.file_path === 'string' ? c.input.file_path : undefined
      if (p && seenPaths.has(p)) w.rereads++
      if (p) seenPaths.add(p)
    } else if (RECALL_TOOL.test(c.name)) w.recall++
    else if (c.name === 'Bash') {
      const cmd = typeof c.input.command === 'string' ? c.input.command : undefined
      if (cmd && seenCommands.has(cmd)) w.reruns++
      if (cmd) seenCommands.add(cmd)
    } else if (c.name === 'Edit' && (c.error || (c.result && EDIT_FAILURE.test(c.result)))) w.editFailures++
  }
  w.notes = notes.filter((n) => n.i >= from && n.i < to).length
  return w
}

const k = (n: number | undefined) => (n === undefined ? '-' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
const pct = (a: number, b: number) => (b === 0 ? '-' : `${Math.round((100 * a) / b)}%`)

const store = storeRecords()
const sessions: { id: string; path: string; passes: unknown[] }[] = []
const report: Record<string, unknown>[] = []
for (const dir of readdirSync(projects)) {
  const d = join(projects, dir)
  if (!statSync(d).isDirectory()) continue
  for (const f of readdirSync(d)) {
    if (!f.endsWith('.jsonl')) continue
    const id = f.slice(0, -'.jsonl'.length)
    if (sessionFilter && !id.startsWith(sessionFilter)) continue
    const path = join(d, f)
    if (statSync(path).mtimeMs < sinceMs) continue
    const records = store.get(id) ?? []
    const { calls, boundaries, notes } = readSession(path)
    const passes = boundaries.filter((b) => b.kind === 'truncation')
    if (passes.length === 0 && records.length === 0) continue
    const rows: Record<string, unknown>[] = []
    // Passes the transcript shows, each joined to the store's record nearest in time (within two minutes).
    const used = new Set<StoreRecord>()
    const nearest = (at: number) => {
      let best: StoreRecord | undefined
      for (const r of records) if (!used.has(r) && Math.abs(r.at - at) < 120_000 && (!best || Math.abs(r.at - at) < Math.abs(best.at - at))) best = r
      if (best) used.add(best)
      return best
    }
    for (const [n, p] of passes.entries()) {
      const next = boundaries.find((b) => b.i > p.i && b.kind !== 'truncation')
      const end = next ? next.i : Number.POSITIVE_INFINITY
      const after = score(calls, notes, p.i, end)
      const before = (() => {
        const earlier = calls.filter((c) => c.i < p.i)
        const slice = earlier.slice(-Math.max(after.calls, 1))
        return slice.length ? score(calls, notes, slice[0]!.i, p.i) : score(calls, notes, p.i, p.i)
      })()
      const rec = nearest(p.at)
      rows.push({
        pass: n + 1,
        at: new Date(p.at).toISOString(),
        trigger: p.trigger,
        contextBefore: rec?.contextBefore ?? p.preTokens,
        contextAfter: p.postTokens,
        tokensSaved: rec?.tokensSaved ?? (p.preTokens !== undefined && p.postTokens !== undefined ? p.preTokens - p.postTokens : undefined),
        cleared: rec?.cleared,
        images: rec?.images,
        deferredCalls: after.calls,
        deferredTokens: next?.preTokens !== undefined && p.postTokens !== undefined ? next.preTokens - p.postTokens : undefined,
        followedBy: next ? next.kind : 'end of session (so far)',
        before,
        after,
      })
    }
    for (const r of records) if (!used.has(r)) rows.push({ pass: 'store only', at: new Date(r.at).toISOString(), tokensSaved: r.tokensSaved, cleared: r.cleared, images: r.images, contextBefore: r.contextBefore, note: 'no matching boundary in the transcript' })
    sessions.push({ id, path, passes: rows })
    report.push({ session: id, path, passes: rows, notes: notes.map((n) => ({ at: new Date(n.at).toISOString(), line: n.line })) })
  }
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}
if (sessions.length === 0) {
  console.log(`No truncation passes found in the last ${sinceDays} days (${projects}). Either none ran, or the stub marker changed: see STUB in this script.`)
  process.exit(0)
}
const totals = { passes: 0, saved: [] as number[], deferredCalls: [] as number[], before: { calls: 0, reads: 0, rereads: 0, recall: 0, reruns: 0, editFailures: 0, notes: 0 }, after: { calls: 0, reads: 0, rereads: 0, recall: 0, reruns: 0, editFailures: 0, notes: 0 } }
for (const s of sessions) {
  console.log(`\n## ${s.id}\n${s.path}`)
  for (const p of s.passes as Record<string, any>[]) {
    if (p.pass === 'store only') {
      console.log(`- pass (store only) ${p.at}: saved ~${k(p.tokensSaved)} tokens, cleared ${p.cleared ?? '-'} results, ${p.images ?? '-'} images (${p.note})`)
      continue
    }
    totals.passes++
    if (typeof p.tokensSaved === 'number') totals.saved.push(p.tokensSaved)
    totals.deferredCalls.push(p.deferredCalls)
    for (const key of Object.keys(totals.before) as (keyof Window)[]) ((totals.before[key] += p.before[key]), (totals.after[key] += p.after[key]))
    console.log(`- pass ${p.pass} ${p.at} (${p.trigger ?? 'auto'}): ${k(p.contextBefore)} → ${k(p.contextAfter)} tokens, saved ~${k(p.tokensSaved)}; cleared ${p.cleared ?? '?'} results, ${p.images ?? '?'} images`)
    console.log(`  deferred the next compaction by ${p.deferredCalls} tool calls${p.deferredTokens !== undefined ? ` / ~${k(p.deferredTokens)} tokens of work` : ''}; followed by: ${p.followedBy}`)
    const b: Window = p.before, a: Window = p.after
    console.log(`  before (${b.calls} calls): reads ${b.reads} (re-reads ${b.rereads}), recall ${b.recall}, reruns ${b.reruns}, edit failures ${b.editFailures}, lost-detail notes ${b.notes}`)
    console.log(`  after  (${a.calls} calls): reads ${a.reads} (re-reads ${a.rereads}), recall ${a.recall}, reruns ${a.reruns}, edit failures ${a.editFailures}, lost-detail notes ${a.notes}`)
  }
}
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : undefined)
const rate = (w: typeof totals.before, key: keyof Window) => pct(w[key], w.calls)
console.log(`\n## Totals: ${totals.passes} passes in ${sessions.length} sessions`)
console.log(`median saved ~${k(median(totals.saved))} tokens; median deferral ${median(totals.deferredCalls) ?? '-'} tool calls`)
console.log(`                before   after`)
for (const key of ['rereads', 'recall', 'reruns', 'editFailures', 'notes'] as (keyof Window)[]) console.log(`${key.padEnd(15)} ${rate(totals.before, key).padStart(6)}   ${rate(totals.after, key).padStart(5)}   (share of tool calls in the window)`)
console.log(`\nRe-reads and recall up a little after a pass: expected. Edit failures or lost-detail notes up: raise KEEP_RECENT_CALLS or TRUNCATE_MIN_SHARE in hooks/register.ts.`)
console.log(`Lost-detail lines, if any, are in --json output under "notes".`)
