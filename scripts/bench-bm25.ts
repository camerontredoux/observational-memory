#!/usr/bin/env bun
// Issue #20: om_recall's search ranking against BM25-lite inside the same whole-term gate (tests/eval/ranking.ts),
// on the om_recall queries already made, each over the transcript as it stood when the query ran. No model calls:
// it reads saved transcripts and scores offline. Not typechecked by `tsc -p .` (Bun's Node APIs).
//
//   bun scripts/bench-bm25.ts [--private] [--json FILE]
//
// Query sources, each labelled in the output:
//   real/bench   every om_recall search in the transcripts the docs/bench/*.jsonl runs name; the block it needed
//                is one matching the scenario's `recall-finds` pattern.
//   real/replay  every om_recall search in the replay question sessions (/tmp/om-replay/<transcript>/<run>/
//                results.jsonl, the sessions under ~/.claude/projects), attributed to the fact question (one with
//                `expect` and no `to`) whose words it shares most; the block it needed is one from before the seeded
//                compaction that holds all of that question's `expect`, as `checkAnswer` reads an answer. A query that
//                shares no word with any, or ties two, is left out and counted.
//   synthetic    queries written here from a scenario's continuation prompt, over the newest om+recall run of that
//                scenario, cut after the prompt: they were never made by a model.
// Transcripts with a private member (firstmate-11, firstmate-6) are scored, but their queries are printed only with
// --private; the note in docs/bench/ gives their aggregate numbers only.
//
// Each query's current rank is also checked against `recall()` itself: the refs it shows must be the top of
// `current`'s order, else the row is flagged `MISMATCH` (ranking.ts has drifted from hooks/recall.ts).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { loadTranscript, recall } from '../hooks/recall'
import type { RecallIo } from '../hooks/recall'
import { bm25, BM25, current, poolOf, rankOf, terms } from '../tests/eval/ranking'
import type { Doc, Term } from '../tests/eval/ranking'
import { checkAnswer } from '../tests/eval/replay'
import type { Question, ReplaySpec } from '../tests/eval/replay'
import { scenarioById } from '../tests/eval/scenarios'

const HERE = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const MAIN = spawnSync('git', ['-C', HERE, 'worktree', 'list', '--porcelain'], { encoding: 'utf8' }).stdout.split('\n')[0]!.replace(/^worktree /, '')
const PROJECTS = `${homedir()}/.claude/projects`
const REPLAY = '/tmp/om-replay'
const PRIVATE = ['firstmate-11', 'firstmate-6']
const SYNTHETIC: { scenario: string; queries: string[] }[] = [
  { scenario: 'failure-in-long-output', queries: ['test failed assertion', 'FAILED'] },
  { scenario: 'omitted-identifier', queries: ['deployment id', 'deploy.sh'] },
  { scenario: 'repeated-compaction', queries: ['invoice feature flag', 'tracking ticket'] },
  { scenario: 'recall-required', queries: ['shard audit checksum', 'checksum'] },
]

const args = process.argv.slice(2)
if (args.includes('-h') || args.includes('--help')) {
  console.log(readFileSync(new URL(import.meta.url).pathname, 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'))
  process.exit(0)
}
const showPrivate = args.includes('--private')
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : undefined

type Raw = { type?: string; subtype?: string; message?: { content?: unknown } }
const rowsOf = (text: string) => text.split('\n').map((l) => {
  try {
    return JSON.parse(l) as Raw
  } catch {
    return undefined
  }
})
// Each om_recall search a transcript's rows hold: the 1-based line of the row that made it, and its query.
function searches(rows: readonly (Raw | undefined)[], from = 0) {
  const out: { line: number; query: string }[] = []
  rows.forEach((r, i) => {
    if (i < from || r?.type !== 'assistant' || !Array.isArray(r.message?.content)) return
    for (const c of r.message.content as { type: string; name?: string; input?: Record<string, unknown> }[]) {
      const q = c.input?.query
      const mode = c.input?.mode ?? 'search'
      if (c.type === 'tool_use' && c.name?.endsWith('__om_recall') && typeof q === 'string' && mode === 'search') out.push({ line: i + 1, query: q })
    }
  })
  return out
}

// The transcript as it stood before line `cut` (exclusive), read as the plugin reads it, with the newest prompt the asking one.
async function corpusAt(path: string, cut: number) {
  const io: RecallIo = {
    read: async (p) => {
      const text = readFileSync(p, 'utf8')
      return p === path ? text.split('\n').slice(0, cut - 1).join('\n') : text
    },
    now: async () => Date.now(),
    list: async (dir) => (existsSync(dir) ? readdirSync(dir) : []),
    continuing: async (dir, names, id) => {
      if (!names.length) return undefined
      const r = spawnSync('grep', ['-lF', `"continuedInSessionId":"${id}"`, ...names.map((n) => `${dir}/${n}`)], { encoding: 'utf8' })
      const hit = r.stdout?.split('\n')[0]
      return hit ? hit.slice(hit.lastIndexOf('/') + 1) : undefined
    },
  }
  const c = await loadTranscript(io, path, { asking: true })
  const docs = poolOf(c).map((d) => ({ ...d, line: Number(d.ref.split(':')[1]!.split('.')[0]) }))
  return { c, docs }
}

type Case = { source: 'real/bench' | 'real/replay' | 'synthetic'; label: string; private: boolean; query: string; path: string; cut: number; needed: (d: Doc & { body: string; line: number }) => boolean }
const cases: Case[] = []
const skipped: string[] = []

// ---- real/bench and synthetic ----
type Rec = { runId: string; scenario: string; configuration: string; transcripts?: string[]; startedAt?: string }
const recs: Rec[] = []
for (const f of readdirSync(`${HERE}/docs/bench`).filter((f) => f.endsWith('.jsonl')))
  for (const l of readFileSync(`${HERE}/docs/bench/${f}`, 'utf8').split('\n').filter(Boolean)) recs.push(JSON.parse(l) as Rec)
const findsOf = (scenario: string) => {
  const c = scenarioById(scenario)?.checks.find((x) => x.id === 'recall-finds')
  return c && 'pattern' in c ? new RegExp(c.pattern, c.flags ?? 'i') : undefined
}
const seen = new Set<string>()
for (const r of recs)
  for (const path of r.transcripts ?? []) {
    if (!existsSync(path)) continue
    const re = findsOf(r.scenario)
    for (const s of searches(rowsOf(readFileSync(path, 'utf8')))) {
      const key = `${path}:${s.line}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!re) {
        skipped.push(`real/bench ${r.runId}: ${r.scenario} has no recall-finds check`)
        continue
      }
      cases.push({ source: 'real/bench', label: r.runId, private: false, query: s.query, path, cut: s.line, needed: (d) => re.test(d.body) })
    }
  }
for (const { scenario, queries } of SYNTHETIC) {
  const s = scenarioById(scenario)!
  const re = findsOf(scenario)!
  const run = recs.filter((r) => r.scenario === scenario && r.configuration === 'om+recall' && r.transcripts?.every((t) => existsSync(t))).at(-1)
  if (!run) {
    skipped.push(`synthetic ${scenario}: no om+recall run on disk`)
    continue
  }
  const path = run.transcripts!.at(-1)!
  const rows = rowsOf(readFileSync(path, 'utf8'))
  const head = s.continuation.slice(0, 40)
  const at = rows.findLastIndex((r) => r?.type === 'user' && JSON.stringify(r.message?.content ?? '').includes(head))
  if (at < 0) {
    skipped.push(`synthetic ${scenario}: the continuation prompt is not in ${run.runId}`)
    continue
  }
  for (const q of queries) cases.push({ source: 'synthetic', label: run.runId, private: false, query: q, path, cut: at + 2, needed: (d) => re.test(d.body) })
}

// ---- real/replay ----
async function memberSpec(name: string): Promise<ReplaySpec | undefined> {
  for (const file of [`${HERE}/tests/eval/replay-specs/${name}.ts`, `${MAIN}/tests/fixtures/${name}.replay.local.ts`])
    if (existsSync(file)) return (await import(file)).spec as ReplaySpec
  return undefined
}
// A transcript's questions by id: a chain's members' prefixed with their name (as chainSpec does), and its own.
async function questionsOf(name: string) {
  const members = name.split('+')
  const qs = new Map<string, Question>()
  if (members.length > 1)
    for (const m of members) for (const q of (await memberSpec(m))?.questions ?? []) qs.set(`${m}-${q.id}`, { ...q, id: `${m}-${q.id}` })
  for (const q of (await memberSpec(name))?.questions ?? []) qs.set(q.id, q)
  return qs
}
const STOP = new Set(['the', 'and', 'for', 'with', 'what', 'which', 'did', 'was', 'that', 'this', 'from', 'into', 'about', 'user', 'said', 'ask', 'asked'])
const wordsOf = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9.#$]+/).filter((w) => w.length > 2 && !STOP.has(w)))
const sessionFiles = new Map<string, string>()
for (const d of readdirSync(PROJECTS).filter((d) => d.startsWith('-tmp-om-replay-')))
  for (const f of readdirSync(`${PROJECTS}/${d}`)) if (f.endsWith('.jsonl')) sessionFiles.set(f.slice(0, -'.jsonl'.length), `${PROJECTS}/${d}/${f}`)
for (const name of existsSync(REPLAY) ? readdirSync(REPLAY) : []) {
  const qs = await questionsOf(name)
  if (!qs.size) continue
  const priv = name.split('+').some((m) => PRIVATE.includes(m))
  for (const run of readdirSync(`${REPLAY}/${name}`)) {
    const results = `${REPLAY}/${name}/${run}/results.jsonl`
    if (!existsSync(results)) continue
    for (const l of readFileSync(results, 'utf8').split('\n').filter(Boolean)) {
      const res = JSON.parse(l) as { config: string; boundary: number; sessionId: string }
      const path = sessionFiles.get(res.sessionId)
      if (!res.config.endsWith('+recall') || !path) continue
      const rows = rowsOf(readFileSync(path, 'utf8'))
      const seed = rows.findLastIndex((r) => r?.type === 'system' && r.subtype === 'compact_boundary')
      if (seed < 0) continue
      const asked = [...new Set(res.sessionId && rows.slice(seed).flatMap((r) => (r?.type === 'user' && typeof r.message?.content === 'string' ? r.message.content.split('\n') : [])).map((x) => x.match(/^([\w+.-]+): /)?.[1]).filter((id): id is string => !!id && qs.has(id)))]
      const facts = asked.map((id) => qs.get(id)!).filter((q) => q.expect?.length && q.to === undefined)
      for (const s of searches(rows, seed)) {
        const label = `${name}/${run} ${res.config}@${res.boundary}`
        const qw = wordsOf(s.query)
        const scored = facts.map((q) => ({ q, n: [...wordsOf(`${q.ask} ${q.expect!.join(' ')}`)].filter((w) => qw.has(w)).length })).sort((a, b) => b.n - a.n)
        if (!scored.length || !scored[0]!.n || scored[1]?.n === scored[0]!.n) {
          skipped.push(`real/replay ${priv ? '(private)' : label}: ${priv && !showPrivate ? '(query hidden)' : JSON.stringify(s.query)} matches no single fact question`)
          continue
        }
        const q = scored[0]!.q
        cases.push({ source: 'real/replay', label: `${label} ${q.id}`, private: priv, query: s.query, path, cut: s.line, needed: (d) => d.line <= seed && checkAnswer(q, d.body) === 'pass' })
      }
    }
  }
}

// ---- scoring ----
type Row = Omit<Case, 'needed' | 'path'> & { error?: string; blocks: number; neededBlocks: number; loose: boolean; cur?: number; curSize: number; bm?: number; bmUnfloored?: number; bmSize: number; shownOk: boolean }
const out: Row[] = []
const cache = new Map<string, Awaited<ReturnType<typeof corpusAt>>>()
for (const k of cases) {
  const { needed, path, ...meta } = k
  const ts = terms(k.query)
  if (typeof ts === 'string') {
    out.push({ ...meta, error: ts, blocks: 0, neededBlocks: 0, loose: false, curSize: 0, bmSize: 0, shownOk: true })
    continue
  }
  const key = `${path}:${k.cut}`
  if (!cache.has(key)) cache.clear(), cache.set(key, await corpusAt(path, k.cut))
  const { c, docs } = cache.get(key)!
  const cur = current(ts as Term[], docs)
  const bm = bm25(ts as Term[], docs)
  // recall() itself: the refs it shows must be the top of `current`'s order.
  const shown = [...(await recall(c, { query: k.query })).text.matchAll(/^\[(\S+?) ·/gm)].map((m) => m[1]!)
  const top = new Set(cur.ranked.slice(0, shown.length).map((d) => (d as (typeof docs)[number]).ref))
  const need = (d: Doc) => needed(d as (typeof docs)[number])
  out.push({
    ...meta,
    blocks: docs.length,
    neededBlocks: docs.filter(need).length,
    loose: cur.loose,
    cur: rankOf(cur.ranked, need),
    curSize: cur.ranked.length,
    bm: rankOf(bm.ranked, need),
    bmUnfloored: rankOf(bm.unfloored, need),
    bmSize: bm.ranked.length,
    shownOk: shown.length === top.size && shown.every((r) => top.has(r)),
  })
}

// ---- report ----
const fmt = (n: number | undefined) => (n === undefined ? '-' : String(n))
const shownQuery = (r: Row) => (r.private && !showPrivate ? '(private)' : r.query)
console.log(`BM25-lite k1=${BM25.k1} b=${BM25.b}, floor ${BM25.floor * 100}% on 2+ terms, cap ${BM25.cap}, inside the whole-term gate.\n`)
console.log(['source', 'query', 'run', 'blocks', 'needed', 'gate', 'cur rank', 'bm25 rank', 'cur size', 'bm25 size', 'check'].join('\t'))
for (const r of out)
  console.log(
    [r.source, JSON.stringify(shownQuery(r)), r.private && !showPrivate ? '(private)' : r.label, r.blocks, r.neededBlocks, r.loose ? 'loose' : 'whole', fmt(r.cur), r.bm === undefined && r.bmUnfloored !== undefined ? `floored (${r.bmUnfloored})` : fmt(r.bm), r.curSize, r.bmSize, r.error ?? (r.shownOk ? 'ok' : 'MISMATCH')].join('\t'),
  )
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2) : NaN
}
console.log('\nsummary (queries whose pool holds a needed block; a needed block not ranked counts as worse than any rank)')
for (const group of [['real/bench'], ['real/replay'], ['real/bench', 'real/replay'], ['synthetic']]) {
  for (const priv of group.includes('real/replay') ? [false, true, undefined] : [undefined]) {
    const rs = out.filter((r) => !r.error && group.includes(r.source) && (priv === undefined || r.private === priv) && r.neededBlocks > 0)
    if (!rs.length) continue
    const inf = (n: number | undefined) => n ?? Infinity
    const better = rs.filter((r) => inf(r.bm) < inf(r.cur)).length
    const worse = rs.filter((r) => inf(r.bm) > inf(r.cur)).length
    const top = (f: (r: Row) => number | undefined, n: number) => rs.filter((r) => inf(f(r)) <= n).length
    console.log(
      `${group.join('+')}${priv === undefined ? '' : priv ? ' (private)' : ' (public)'}: ${rs.length} queries (${new Set(rs.map((r) => r.query)).size} distinct, ${rs.filter((r) => r.loose).length} loose); bm25 better ${better}, worse ${worse}, same ${rs.length - better - worse}; ` +
        `rank 1: ${top((r) => r.cur, 1)} vs ${top((r) => r.bm, 1)}; top 5: ${top((r) => r.cur, 5)} vs ${top((r) => r.bm, 5)}; top 20: ${top((r) => r.cur, 20)} vs ${top((r) => r.bm, 20)}; ` +
        `floored out: ${rs.filter((r) => r.bm === undefined && r.bmUnfloored !== undefined).length}; median size ${median(rs.map((r) => r.curSize))} vs ${median(rs.map((r) => r.bmSize))}`,
    )
  }
}
const noNeeded = out.filter((r) => !r.error && r.neededBlocks === 0).length
console.log(`\n${out.length} queries scored; ${noNeeded} with no needed block in the pool; ${out.filter((r) => r.error).length} not ranked (regex or phrase); ${out.filter((r) => !r.error && !r.shownOk).length} MISMATCH.`)
if (skipped.length) console.log(`${skipped.length} left out:\n${skipped.map((s) => `  ${s}`).join('\n')}`)
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out.map((r) => (r.private && !showPrivate ? { ...r, query: '(private)', label: '(private)' } : r)), null, 1))
