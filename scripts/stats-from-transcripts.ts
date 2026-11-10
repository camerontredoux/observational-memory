#!/usr/bin/env bun
// Builds om stats from Claude Code transcripts, for `/om-stats transcripts`: one stats file per main session and day,
// with each main request's context, growth and cache cost, each compaction's trigger and context before and after, and
// what the first request after it read and wrote, by the compactor that made it. Claude Code deletes transcripts after
// cleanupPeriodDays, so point it at an archive that keeps them; the files stay small, a metric's samples capped as the
// live stats cap them. It rewrites only the files of transcripts changed since its last run.
//   bun scripts/stats-from-transcripts.ts <transcripts dir> [<out dir>]
// The out dir defaults to the stats dir's `-transcripts` sibling, which `/om-stats transcripts` reads.
import { TURN_END_NOTE } from '../hooks/prompts'
// The tests import this module under the plugin's tsconfig, which has no Bun or Node types.
declare const Bun: any, process: any, console: any
import { addCacheUse, addCompaction, addRequest, emptyStats, type CacheUse, type SessionStats } from '../hooks/stats'

const day = (at: number) => {
  const d = new Date(at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const text = (content: unknown) =>
  typeof content === 'string' ? content : Array.isArray(content) ? content.map((b) => (b?.type === 'text' ? b.text : '')).join('\n') : ''

type Event =
  | { kind: 'request'; at: number; use: CacheUse }
  | { kind: 'compaction'; at: number; trigger: string; before?: number; after?: number; compactor: 'om' | 'builtin' }

// A transcript's stats, one per day it ran on, named `<session id>.<day>`. A response's lines share its message id, the
// last carrying the final usage; a sidechain's and a synthetic message's are not the main conversation's requests.
export function statsFromTranscript(transcript: string, sessionId: string): SessionStats[] {
  const events: Event[] = []
  const requests = new Map<string, Extract<Event, { kind: 'request' }>>()
  let cwd: string | undefined
  let open: Extract<Event, { kind: 'compaction' }> | undefined // awaiting the summary that says who compacted
  for (const line of transcript.split('\n')) {
    if (!line) continue
    let row: any
    try {
      row = JSON.parse(line)
    } catch {
      continue
    }
    const at = Date.parse(row.timestamp)
    if (Number.isNaN(at) || row.isSidechain) continue
    cwd ??= row.cwd
    if (row.type === 'system' && row.subtype === 'compact_boundary') {
      const m = row.compactMetadata ?? {}
      open = { kind: 'compaction', at, trigger: m.trigger ?? 'unknown', before: m.preTokens, after: m.postTokens, compactor: 'builtin' }
      events.push(open)
    } else if (row.type === 'user' && open) {
      const said = text(row.message?.content)
      if (said.includes('<memory-guide>')) open.compactor = 'om'
      if (said.includes(TURN_END_NOTE.slice(0, 60))) open.trigger = 'turnEnd'
      open = undefined
    } else if (row.type === 'assistant' && row.message?.usage && row.message.model !== '<synthetic>') {
      const u = row.message.usage
      const use = { uncached: u.input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0 }
      const seen = requests.get(row.message.id)
      if (seen) seen.use = use
      else {
        const e = { kind: 'request' as const, at, use }
        if (row.message.id) requests.set(row.message.id, e)
        events.push(e)
      }
    }
  }
  const days = new Map<string, SessionStats>()
  let after: 'om' | 'builtin' | undefined // the compactor of a compaction no request has followed yet
  for (const e of events) {
    const name = `${sessionId}.${day(e.at)}`
    const s = days.get(name) ?? days.set(name, { ...emptyStats(name, e.at, cwd), backfilled: true }).get(name)!
    s.firstSeen = Math.min(s.firstSeen, e.at)
    if (e.kind === 'compaction') {
      addCompaction(s, { trigger: e.trigger, ms: 0, fellBack: false, tokensBefore: e.before, tokensAfter: e.after }, e.at)
      after = e.compactor
      continue
    }
    addRequest(s, e.use, e.at)
    if (after) addCacheUse(s, after, e.use, e.at)
    after = undefined
  }
  return [...days.values()]
}

async function main(source: string, out: string) {
  const sourcesFile = `${out}/.sources`
  const seen: Record<string, number> = await Bun.file(sourcesFile).json().catch(() => ({}))
  let written = 0
  let transcripts = 0
  for await (const path of new Bun.Glob('**/*.jsonl').scan({ cwd: source, absolute: true })) {
    if (path.includes('/subagents/')) continue
    const file = Bun.file(path)
    if (seen[path] === file.lastModified) continue
    const id = path.split('/').at(-1)!.replace(/\.jsonl$/, '')
    for (const s of statsFromTranscript(await file.text(), id)) {
      await Bun.write(`${out}/${s.sessionId}.json`, JSON.stringify(s))
      written++
    }
    seen[path] = file.lastModified
    transcripts++
  }
  await Bun.write(sourcesFile, JSON.stringify(seen))
  console.log(`${transcripts} transcript(s) read, ${written} stats file(s) written to ${out}`)
}

if ((import.meta as { main?: boolean }).main) {
  const [source, out = `${process.env.HOME}/.claude/plugins/data/observational-memory/stats-transcripts`] = process.argv.slice(2)
  if (!source) {
    console.error('usage: bun scripts/stats-from-transcripts.ts <transcripts dir> [<out dir>]')
    process.exit(2)
  }
  await main(source.replace(/\/$/, ''), out.replace(/\/$/, ''))
}
