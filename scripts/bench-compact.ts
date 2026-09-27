#!/usr/bin/env bun
// Compaction A/B benchmark: replays a fixed corpus of long real transcripts through a plugin's compaction
// (`bench-replay.ts om`) and grades every compacted context against the rubric in tests/eval/rubric.ts.
//
//   bun scripts/bench-compact.ts corpus                      # (re)build the local corpus and seed the cache
//   bun scripts/bench-compact.ts run --plugin <ref|dir> [--record] [--samples N] [--json FILE] [--items]
//   bun scripts/bench-compact.ts ab --a <ref|dir> --b <ref|dir>[,<ref|dir>...] [--record] [--samples N] [--json FILE]
//     per gate: scores, passed/total, flips; per transcript Δ. The verdict needs the weighted Δ, the sign of the net flips
//     per unique item (gate, id) and 2 of 3 transcripts to agree. When B's Observer/Reflector cache keys differ from A's,
//     B's replies are other model draws: the verdict also needs Δ beyond the noise floor, A's sample spread (--samples N)
//     or A against its resample A' (sample 2, read from CACHE-s2; record it once: run --plugin <A> --record --samples 2).
//   Efficiency is reported beside the quality total, never in it (docs/plans/compaction-goals.md in the main checkout):
//     context tokens per cut, reduction ratio against the source's preTokens, Observer/Reflector calls and tokens,
//     critical-path calls (started inside session.compact). ab prints "efficiency: better/worse/same" (±10% on mean
//     tokens, ratio, model tokens; ±1 critical-path call per transcript) and warns when B wins on quality but is worse on
//     efficiency. When B's mean context tokens or model tokens are more than 10% above A's, B's verdict is at best
//     "tradeoff", never "better". Latency is virtual: calls and tokens are measured, time is not.
//   ab --a/--b also take contexts:DIR (ready-made contexts, as run --contexts), e.g. to price a hand-made context.
//   --chain (run; on for ab, --no-chain to skip): also replay the reflection chain (CHAIN, the one track where the
//     Reflector runs), graded by the mechanical gates and its specs, reported apart, never in the total. ab fails when B
//     changes the Reflector's prompt or REFLECT_* constants and neither side made a Reflector call.
//   --long (run, ab): also replay the long chain (LONG: 13 sessions a day apart through bench-replay --gap-hours 24, 80 compactions, reflections and the
//     constraint cap), graded at every 5th cut by its members' items and its own, reported apart, never in the total, with
//     the recall-aware credit (rubric.ts pointed) and the reflections and fallbacks it reached. A compaction that falls back
//     takes the source session's own summary and the chain goes on (bench-replay --fallback recorded).
//   --holdout (run; on for ab, --no-holdout to skip): also grade the holdout sessions (tests/fixtures/holdout.local.json)
//     by the mechanical gates only, reported apart, never in the total. In ab its Δ is informational; with --samples N it
//     gets a verdict (B's lowest total above A's highest, or Δ beyond A's spread). ab warns when B wins the main corpus
//     but loses the holdout, when the holdout difference is exact.
//   --behavior (run, ab): also Luna (--thinking max, no tools) answers probes on each context (tests/eval/behavior.ts),
//     3 samples, majority vote, graded by code; reported apart from retention. Answers are cached in BCACHE by
//     sha256(context + probes + prompt + reader argv), so identical contexts in A and B cost nothing; misses are called.
//     --b-reflector-sample K (ab): B's Reflector calls read and write their own cache CACHE-r<K> (its Observer calls stay
//     in CACHE): with B = A's plugin, a resample of the Reflector draws alone, the noise floor of the chain and long tracks.
//     --b-reader-sample K (ab, with --behavior): B's reader answers are cached apart, under sample K: with B = A's plugin,
//     fresh reader draws on the same contexts, the noise floor of the behavior total.
//     --behavior-sample K: read sample K's contexts instead of the first sample's (with --samples K or more).
//   bun scripts/bench-compact.ts run --contexts DIR          # grade ready-made contexts: DIR/<name>/compaction-N.md
//   bun scripts/bench-compact.ts controls [--plugin <ref|dir>] # write tests/fixtures/rubric-controls{,.<name>}.local.ts, the
//     negative control's fixture: rerun it after editing a rubric (the test fails any fact or latest item that another
//     transcript's context passes, unless the item lists that transcript in `shared`)
//
// A ref is archived (git archive) into <main checkout>/.scratch/bench-compact/src-<sha>; a dir is used as it is, uncommitted edits too.
// Observer/Reflector replies come from CACHE, keyed by sha256(pi argv incl. system prompt + stdin): a variant that
// changes neither replays for free and exactly. A miss fails the run unless --record, which calls pi (openai-codex
// models only) and stores the reply; --samples N runs N independent samples (sample k>1 in its own cache CACHE-s<k>).
// One Observer miss changes every later call of that chained replay, so a changed Observer input is one draw per transcript.
// --jobs N (default 3): the most replays run at once, across transcripts, samples and the sides of an ab.
// Token gates read the context's prose only (rubric.ts proseContext): a bare list of identifiers counts for nothing.
// Hand-authored items print their ids, not their expected strings.
// Tiers (rubric.ts TIER): every item is core (what the next agent must know: goal, done and next, rules, decisions and
// why, findings, open risks, file state) or lookup (an exact hash, path, PR number, string or count om_recall recovers).
// Mechanical items take their gate's tier (GATE_TIER); hand-authored ones their `tier`, else core (exact:/str: lookup).
// Beside the flat total (unchanged, comparable with earlier reports) every card and A/B prints the tiered total: a lookup
// item weighs ¼, a missed fact pointed to by a source range (rubric.ts pointed) earns 0.9 if lookup, 0.25 if core; and
// its core and lookup parts. The long chain's recall-aware credit gets the same tiered form, the behavior pass rate too.
// Corpus: CORPUS below, prefixes of real sessions copied into the main checkout's gitignored tests/fixtures/replay/.
// Rubric specs: tests/eval/replay-specs/<name>.ts or tests/fixtures/<name>.replay.local.ts (constraints, questions)
// and tests/fixtures/<name>.{rubric,hard}.local.ts (facts, absent, latest, recall; concatenated), the worktree's before the
// main checkout's. An ord:/order: fact holds only with its expects' last mentions in order. Not typechecked by `tsc -p .`.
import { createHash } from 'crypto'
import { spawnSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import type { Context, ReplaySpec, Transcript } from '../tests/eval/replay'
import { chainSpec, chainTranscripts, contextText, estimateTokens, messageText, parseTranscript } from '../tests/eval/replay'
import type { Gate, Item, Pointed, RubricSpec, Scores, Tier } from '../tests/eval/rubric'
import { grade, hasExpect, itemTier, norm, pointed, proseContext, score, TIER, tierOf, WEIGHTS } from '../tests/eval/rubric'
import type { BGate, Probe } from '../tests/eval/behavior'
import { BGATES, contextSquashed, gradeAnswer, input, isUnknown, parse, probes, PROMPT } from '../tests/eval/behavior'
import { fail, mainCheckout, num, options, str } from './cli'

const HERE = resolve(import.meta.dir, '..')
const OUT = `${mainCheckout()}/.scratch/bench-compact`
const CACHE = `${process.env.HOME}/.cache/om-bench-compact/luna-cache`
const OLD_CACHE = `${mainCheckout()}/.scratch/om-replay/luna-cache`
const P = `${process.env.HOME}/.claude/projects`
const CORPUS = [
  { name: 'om-orchestration', src: `${P}/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43.jsonl`, bytes: 10626428 },
  { name: 'om-v04', src: `${P}/-home-cameron-work-mods/5fdeae60-01fd-46f7-910e-745a4011321c.jsonl`, bytes: 13399393 },
  { name: 'firstmate-11', src: `${P}/-home-cameron-work-firstmate/b776c4b4-a24d-4936-9268-d3f72c24b0c9.jsonl`, bytes: 19507188 },
]
const corpusDir = () => (existsSync(`${HERE}/tests/fixtures/replay`) ? `${HERE}/tests/fixtures/replay` : `${mainCheckout()}/tests/fixtures/replay`)
const git = (...args: string[]) => spawnSync('git', ['-C', HERE, ...args], { encoding: 'utf8' })
type Entry = { name: string; src: string; bytes: number }
// The holdout: more real sessions, graded by the mechanical gates only (no specs), never in the main total.
const HOLDOUT_LIST = `${mainCheckout()}/tests/fixtures/holdout.local.json`
const HOLDOUT: Entry[] = existsSync(HOLDOUT_LIST) ? JSON.parse(readFileSync(HOLDOUT_LIST, 'utf8')) : []
// The reflection track: no single corpus session grows the memory to REFLECT_AT_TOKENS, so a Reflector change ties
// exactly there. This chain of four (chainTranscripts) reflects once, after boundary 22; graded by the mechanical gates
// and its members' specs plus its own (lost-* questions on what the reflection replaced), reported apart from the total.
const CHAIN = [{ name: 'om-v04+om-orchestration+firstmate-11+firstmate-6' }]
// The long chain (--long): 13 real sessions (none of the holdout's), oldest first, a day apart, as one indefinite
// session of 80 compactions, graded at every LONG_EVERY-th cut. Its rubric: its members' items at their offsets plus
// tests/fixtures/long.{rubric,hard}.local.ts (long-range items at the chain's boundaries). Reported apart from the total,
// with recall-aware credit (pointedCredit) and the reflections, reflection failures and constraint-cap fallbacks reached.
const LONG_CORPUS: Entry[] = [
  { name: 'work-5', src: `${P}/-home-cameron-work/101da71e-42f4-490c-ad32-c48ba1527f0b.jsonl`, bytes: 6227881 },
  { name: 'lanterns-3', src: `${P}/-home-cameron-work-lanterns/2078477b-03db-4edd-a2f4-30ce476deead.jsonl`, bytes: 1401102 },
  { name: 'opie3-4', src: `${P}/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie/a79f045b-2bea-4864-b384-cc8e7124b683.jsonl`, bytes: 5786078 },
  { name: 'opie2-3', src: `${P}/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-2-oasis-pavers-and-pools-opie/22f522a7-3184-45e1-944e-96ea47407edf.jsonl`, bytes: 5328643 },
  { name: 'opie2-5', src: `${P}/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-2-oasis-pavers-and-pools-opie/1bdcd519-5ca9-46da-ad2a-1de2285025db.jsonl`, bytes: 10157429 },
  { name: 'opie3-6', src: `${P}/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie/f3094773-2166-42f8-99fe-8cd8446bcce4.jsonl`, bytes: 10733641 },
  { name: 'opie4-3', src: `${P}/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-4-oasis-pavers-and-pools-opie/a7a0002b-0443-4db1-82e0-6045c416a33a.jsonl`, bytes: 7003713 },
  { name: 'om-2598', src: `${P}/-home-cameron-work-mods-observational-memory/2598000f-95ff-4df9-98dd-d7143cf21a41.jsonl`, bytes: 4892718 },
  { name: 'crewfm-16', src: `${P}/-home-cameron--treehouse-firstmate-a43bdc-1-firstmate/c1098936-e3be-4aa5-ab17-0d699626452a.jsonl`, bytes: 17199252 },
  { name: 'om-lead', src: `${P}/-home-cameron-work-mods-observational-memory/40c779b6-1581-462e-82ac-846ca077271f.jsonl`, bytes: 6800686 },
]
const LONG = { name: 'long', members: ['work-5', 'lanterns-3', 'om-v04', 'opie3-4', 'firstmate-11', 'opie2-3', 'om-orchestration', 'opie2-5', 'opie3-6', 'opie4-3', 'om-2598', 'crewfm-16', 'om-lead'] }
const LONG_GAP_HOURS = 24
const LONG_EVERY = 5
const members = (name: string) => (name === LONG.name ? LONG.members : name.split('+'))
/** A corpus transcript's text; a chain's members joined into one session. */
const textCache = new Map<string, { text: string; offsets: number[] }>()
function textOf(name: string) {
  let x = textCache.get(name)
  if (!x) {
    const texts = members(name).map((m) => readFileSync(`${corpusDir()}/${m}.jsonl`, 'utf8'))
    textCache.set(name, (x = texts.length > 1 ? chainTranscripts(texts, name === LONG.name ? LONG_GAP_HOURS * 3_600_000 : undefined) : { text: texts[0]!, offsets: [0] }))
  }
  return x.text
}
const parsed = new Map<string, Transcript>()
const parsedOf = (name: string) => parsed.get(name) ?? parsed.set(name, parseTranscript(textOf(name))).get(name)!

/** A transcript's hand-authored gates; the long chain's are its members' at their offsets (no recall or probes) and its own. */
async function rubricFor(name: string): Promise<RubricSpec | undefined> {
  if (name !== LONG.name) return rubricFiles(name)
  textOf(name)
  const offsets = textCache.get(name)!.offsets
  type X = { id: string; from: number; to?: number; tier?: Tier }
  // The tier is settled before the prefix hides an exact:/str: id.
  const shift = <T extends X>(m: string, o: number, xs: readonly T[] | undefined) => (xs ?? []).map((x) => ({ ...x, id: `${m}-${x.id}`, tier: itemTier(x.id, x.tier), from: x.from + o, ...(x.to !== undefined ? { to: x.to + o } : {}) }))
  const parts = await Promise.all(members(name).map(async (m, i) => {
    const r = await rubricFiles(m)
    return { facts: shift(m, offsets[i]!, r?.facts), absent: shift(m, offsets[i]!, r?.absent), latest: shift(m, offsets[i]!, r?.latest) }
  }))
  const own = await rubricFiles(name)
  if (own) parts.push({ facts: own.facts ?? [], absent: own.absent ?? [], latest: own.latest ?? [] })
  return { facts: parts.flatMap((p) => p.facts), absent: parts.flatMap((p) => p.absent), latest: parts.flatMap((p) => p.latest) }
}

/** A transcript's hand-authored gates: <name>.rubric.local.ts and <name>.hard.local.ts, their arrays concatenated. */
async function rubricFiles(name: string): Promise<RubricSpec | undefined> {
  const at = (kind: string) => [`${HERE}/tests/fixtures/${name}.${kind}.local.ts`, `${mainCheckout()}/tests/fixtures/${name}.${kind}.local.ts`]
  const parts = [await load<RubricSpec>(at('rubric'), 'rubric'), await load<RubricSpec>(at('hard'), 'hard')].filter((x) => x !== undefined)
  if (!parts.length) return undefined
  const keys = ['facts', 'absent', 'latest', 'recall', 'probes'] as const
  return Object.fromEntries(keys.map((k) => [k, parts.flatMap((p) => (p[k] ?? []) as unknown[])])) as RubricSpec
}
const specOne = (name: string) => load<ReplaySpec>([`${HERE}/tests/eval/replay-specs/${name}.ts`, `${HERE}/tests/fixtures/${name}.replay.local.ts`, `${mainCheckout()}/tests/fixtures/${name}.replay.local.ts`], 'spec')
/** A transcript's spec; a chain's is its members' at their offsets (chainSpec) plus its own. */
async function specFor(name: string): Promise<ReplaySpec | undefined> {
  const ms = members(name)
  if (ms.length === 1) return specOne(name)
  textOf(name)
  const offsets = textCache.get(name)!.offsets
  const specs = await Promise.all(ms.map(specOne))
  const chained = chainSpec(ms.map((m, i) => ({ name: m, offset: offsets[i]!, ...(specs[i] ? { spec: specs[i] } : {}) })))
  const own = await specOne(name)
  return { constraints: [...chained.constraints, ...(own?.constraints ?? [])], questions: [...chained.questions, ...(own?.questions ?? [])] }
}

async function corpus() {
  mkdirSync(corpusDir(), { recursive: true })
  for (const c of [...CORPUS, ...HOLDOUT, ...LONG_CORPUS]) {
    const dst = `${corpusDir()}/${c.name}.jsonl`
    if (existsSync(dst) && readFileSync(dst).length === c.bytes) {
      console.log(`${c.name}: present`)
      continue
    }
    const buf = readFileSync(c.src)
    if (buf.length < c.bytes) fail(`${c.src}: ${buf.length} bytes, fewer than the ${c.bytes} the corpus pins`)
    writeFileSync(dst, buf.subarray(0, c.bytes), { mode: 0o600 })
    console.log(`${c.name}: wrote ${dst}`)
  }
  mkdirSync(CACHE, { recursive: true })
  if (existsSync(OLD_CACHE)) {
    let n = 0
    for (const f of readdirSync(OLD_CACHE)) if (!existsSync(`${CACHE}/${f}`)) copyFileSync(`${OLD_CACHE}/${f}`, `${CACHE}/${f}`), n++
    console.log(`cache: ${n} replies copied from ${OLD_CACHE} into ${CACHE}`)
  }
  // Every hand-authored fact must be in the transcript before the first boundary that grades it.
  for (const c of [...CORPUS, LONG]) {
    const rubric = await rubricFor(c.name)
    const t = parsedOf(c.name)
    for (const f of [...(rubric?.facts ?? []), ...(rubric?.recall ?? [])]) {
      const seen = t.spans.slice(0, f.from).flat().map(messageText).join('\n').toLowerCase()
      for (const e of f.expect) if (!(typeof e === 'string' ? [e] : e).some((x) => seen.includes(x.toLowerCase()))) console.log(`${c.name}: ${f.id}: "${e}" is not in the transcript before boundary ${f.from}`)
    }
  }
}

/** A plugin source: a directory as it is, or a ref archived at its commit; `contexts:DIR`, ready-made contexts (ab only). */
function source(spec: string): { dir?: string; contexts?: string; label: string } {
  if (spec.startsWith('contexts:')) return { contexts: resolve(spec.slice(9)), label: `${spec.slice(9)} (contexts)` }
  if (existsSync(`${spec}/hooks/register.ts`)) return { dir: resolve(spec), label: `${spec} (dir)` }
  const sha = git('rev-parse', '--verify', `${spec}^{commit}`).stdout.trim() || fail(`${spec}: not a plugin directory or a git ref`)
  const dir = `${OUT}/src-${sha.slice(0, 12)}`
  if (!existsSync(`${dir}/hooks/register.ts`)) {
    mkdirSync(dir, { recursive: true })
    const r = spawnSync('bash', ['-c', `git -C '${HERE}' archive ${sha} | tar -x -C '${dir}'`], { encoding: 'utf8' })
    if (r.status !== 0) rmSync(dir, { recursive: true, force: true }), fail(`git archive ${spec}: ${r.stderr}`)
  }
  return { dir, label: `${spec}@${sha.slice(0, 7)}` }
}

async function load<T>(files: string[], key: string): Promise<T | undefined> {
  for (const f of files) if (existsSync(f)) return (await import(f))[key] as T
  return undefined
}

/** One transcript's replay: its contexts, and the cache keys of its Observer/Reflector calls (sorted). */
type Replay = { name: string; contexts: (Context | undefined)[]; calls: number; fresh: number; failed: number; keys: string[]; eff: Eff; fallbacks: { n: number; reason: string }[]; reflections?: number }
/** Model calls and their tokens in and out (the pi reply's usage; the estimated prompt when it has none). */
type Tally = { calls: number; in: number; out: number }
/**
 * Efficiency, apart from the quality total. Per cut: the compacted context's tokens, and that over the context it replaced
 * (the source session's own preTokens at the cut). Critical path: the calls bench-replay starts while register.ts's
 * session.compact hook runs (calls.json atCompaction), which compaction waits for; a background call still in flight that
 * merely finishes during compaction counts as background.
 */
type Eff = { tokens: number[]; ratio: number[]; observer: Tally; reflector: Tally; critical: Tally }
type Call = { kind: 'observer' | 'reflector'; atCompaction: boolean; inTokens: number; in: number; out: number }
function effOf(t: Transcript, contexts: (Context | undefined)[], calls: Call[]): Eff {
  const tally = (cs: Call[]): Tally => ({ calls: cs.length, in: cs.reduce((a, c) => a + (c.in || c.inTokens), 0), out: cs.reduce((a, c) => a + c.out, 0) })
  const cuts = t.boundaries.flatMap((b, i) => {
    const ctx = contexts[i]
    if (!ctx) return []
    const tokens = estimateTokens(contextText(ctx))
    const pre = b.preTokens ?? estimateTokens(t.spans.slice(0, i + 1).flat().map(messageText).join('\n'))
    return [{ tokens, ratio: tokens / pre }]
  })
  return {
    tokens: cuts.map((c) => c.tokens), ratio: cuts.map((c) => c.ratio),
    observer: tally(calls.filter((c) => c.kind === 'observer')), reflector: tally(calls.filter((c) => c.kind === 'reflector')), critical: tally(calls.filter((c) => c.atCompaction)),
  }
}
type Sample = { replays: Replay[]; items: Item[]; scores: Scores; perTranscript: Record<string, Scores>; pointed?: Pointed[] }
type Run = { label: string; dir?: string; behavior?: BItem[]; samples: Sample[]; holdout?: Sample[]; chain?: Sample[]; long?: Sample[]; noise?: Run }

// At most JOBS replays run at once (--jobs, default 3): the transcripts are independent, and each replay stays sequential
// inside. Each call's cache key is its own, so the replies and the scores do not depend on the order.
const JOBS = Math.max(1, num(options(process.argv.slice(3)), 'jobs', 3)!)
let running = 0
const waiting: (() => void)[] = []
async function slot<T>(f: () => Promise<T>): Promise<T> {
  while (running >= JOBS) await new Promise<void>((r) => waiting.push(r))
  running++
  try {
    return await f()
  } finally {
    running--
    waiting.shift()?.()
  }
}

async function replay(name: string, dir: string, record: boolean, sample: number, reflectorSample?: number): Promise<Replay> {
  const cache = sample === 1 ? CACHE : `${CACHE}-s${sample}`
  const refl = reflectorSample ? ['--reflector-cache', `${CACHE}-r${reflectorSample}`] : []
  const out = `${OUT}/runs/${createHash('sha256').update(`${dir}\0${sample}\0${Date.now()}\0${process.pid}\0${Math.random()}`).digest('hex').slice(0, 10)}-${name}`
  const long = name === LONG.name ? ['--gap-hours', String(LONG_GAP_HOURS), '--fallback', 'recorded'] : []
  const args = ['scripts/bench-replay.ts', 'om', '--transcript', members(name).join('+'), ...long, '--src', dir, '--cache', cache, ...refl, '--out', out, '--dir', corpusDir(), '--pi', record ? 'live' : 'strict', ...(record ? ['--max-calls', '2000'] : [])]
  const p = Bun.spawn(['bun', ...args], { cwd: HERE, stdout: 'ignore', stderr: 'pipe' })
  const [stderr, status] = await Promise.all([new Response(p.stderr).text(), p.exited])
  if (status !== 0) fail(`${name}: the replay failed:\n${stderr.slice(-2000)}`)
  const s = JSON.parse(readFileSync(`${out}/summary.json`, 'utf8'))
  const t = parsedOf(name)
  const contexts = t.boundaries.map((b) =>
    existsSync(`${out}/compaction-${b.n}.md`) ? { summary: readFileSync(`${out}/compaction-${b.n}.md`, 'utf8'), kept: JSON.parse(readFileSync(`${out}/kept-${b.n}.json`, 'utf8')) } : undefined,
  )
  const calls = JSON.parse(readFileSync(`${out}/calls.json`, 'utf8')) as (Call & { key?: string; prompt: string })[]
  const keys = calls.map((c) => c.key ?? c.prompt).sort()
  return { name, contexts, calls: s.luna.calls, fresh: s.luna.calls - s.luna.cacheHits, failed: s.luna.failed, keys, eff: effOf(t, contexts, calls), fallbacks: s.fallbacks ?? [], reflections: s.luna.reflections }
}

function readyMade(name: string, root: string): Replay {
  const t = parseTranscript(textOf(name))
  const d = `${root}/${name}`
  const contexts = t.boundaries.map((b) => (existsSync(`${d}/compaction-${b.n}.md`) ? { summary: readFileSync(`${d}/compaction-${b.n}.md`, 'utf8'), kept: existsSync(`${d}/kept-${b.n}.json`) ? JSON.parse(readFileSync(`${d}/kept-${b.n}.json`, 'utf8')) : [] } : undefined))
  return { name, contexts, calls: 0, fresh: 0, failed: 0, keys: [], eff: effOf(t, contexts, []), fallbacks: [] }
}

// om_recall's search, in-process, over the transcript up to the cut, with the plugin's own recall.ts.
async function search(dir: string, name: string, text: string, b: ReturnType<typeof parseTranscript>['boundaries'][number], query: string): Promise<string> {
  const { loadTranscript, recall } = await import(`${dir}/hooks/recall.ts`)
  const d = `${OUT}/recall/${name}-${b.n}`
  const path = `${d}/${name}.jsonl`
  if (!existsSync(path)) mkdirSync(d, { recursive: true }), writeFileSync(path, text.split('\n').slice(0, b.line).join('\n') + '\n')
  const io = { read: async (p: string) => readFileSync(p, 'utf8'), list: async (x: string) => (existsSync(x) ? readdirSync(x) : []), continuing: async () => undefined, now: async () => b.at }
  return (await recall(await loadTranscript(io, path), { query })).text
}
async function recallTexts(name: string, text: string, t: ReturnType<typeof parseTranscript>, rubric: RubricSpec | undefined, dir: string) {
  const out = new Map<string, string>()
  for (const b of t.boundaries)
    for (const q of rubric?.recall ?? []) if (q.from <= b.n && (q.to === undefined || b.n <= q.to)) out.set(`${q.id}@${b.n}`, await search(dir, name, text, b, q.query))
  return out
}

// ---- The behavior check (--behavior): Luna reads each context and answers probes; code grades the answers ----

const BCACHE = `${process.env.HOME}/.cache/om-bench-compact/behavior`
const READER = ['pi', '-p', '--model', 'openai-codex/gpt-5.6-luna', '--thinking', 'max', '--system-prompt', PROMPT, '--no-tools', '--no-extensions', '--no-skills', '--no-context-files', '--no-prompt-templates', '--no-themes', '--no-session', '--append-system-prompt', '']
const BSAMPLES = 3
const PARALLEL = 20
type BItem = { gate: BGate; boundary: number; id: string; pass: boolean; votes: number; why: string; tier?: 'core' | 'lookup' }

async function ask(inp: string, file: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const p = Bun.spawn(READER, { cwd: '/tmp', stdin: new TextEncoder().encode(inp), stdout: 'pipe', stderr: 'pipe' })
    const timer = setTimeout(() => p.kill(), 20 * 60_000)
    const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()])
    clearTimeout(timer)
    if ((await p.exited) === 0 && out.includes('[')) return writeFileSync(file, out), true
    console.error(`reader call failed (${attempt + 1}/2): ${err.slice(-300) || out.slice(-300)}`)
  }
  return false
}

async function behavior(label: string, dir: string, replays: Replay[], readerSample?: number): Promise<BItem[]> {
  mkdirSync(BCACHE, { recursive: true })
  type Job = { name: string; b: ReturnType<typeof parseTranscript>['boundaries'][number]; ctx: Context; ps: Probe[]; files: string[]; inp: string }
  const jobs: Job[] = []
  const texts = new Map<string, string>()
  for (const r of replays) {
    const text = textOf(r.name)
    texts.set(r.name, text)
    const t = parseTranscript(text)
    const spec = await specFor(r.name)
    const rubric = await rubricFor(r.name)
    t.boundaries.forEach((b, i) => {
      const ctx = r.contexts[i]
      const ps = ctx ? probes(t, b.n, spec, rubric) : []
      if (!ctx || !ps.length) return
      const inp = input(ctx, ps)
      const h = createHash('sha256').update([inp, PROMPT, ...READER, ...(readerSample ? [`reader-sample ${readerSample}`] : [])].join('\0')).digest('hex').slice(0, 24)
      jobs.push({ name: r.name, b, ctx, ps, inp, files: Array.from({ length: BSAMPLES }, (_, k) => `${BCACHE}/${h}-s${k + 1}.txt`) })
    })
  }
  const misses = jobs.flatMap((j) => j.files.filter((f) => !existsSync(f)).map((f) => [j, f] as const))
  const n = jobs.reduce((s, j) => s + j.ps.length, 0)
  console.error(`[${label}] behavior: ${n} probes at ${jobs.length} cuts, ${jobs.length * BSAMPLES} reader calls, ${misses.length} not cached: calling Luna for them now`)
  const t0 = Date.now()
  let next = 0
  let done = 0
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next < misses.length) {
        const [j, f] = misses[next++]!
        await ask(j.inp, f)
        if (++done % 10 === 0 || done === misses.length) console.error(`  ${done}/${misses.length} calls, ${Math.round((Date.now() - t0) / 1000)} s`)
      }
    }),
  )
  const lost = misses.filter(([, f]) => !existsSync(f)).length
  if (lost) console.error(`[${label}] behavior: ${lost} reader calls failed; their answers count as wrong (rerun to retry them)`)
  const items: BItem[] = []
  for (const j of jobs) {
    const ctx = contextSquashed(j.ctx)
    const replies = j.files.map((f) => parse(existsSync(f) ? readFileSync(f, 'utf8') : '', j.ps.length))
    for (const [i, p] of j.ps.entries()) {
      const grades = []
      for (const answers of replies) {
        const a = answers[i]!
        const q = typeof a.recall_query === 'string' ? a.recall_query : ''
        const recalled = p.gate === 'dropped' && isUnknown(a) && q ? await search(dir, j.name, texts.get(j.name)!, j.b, q) : undefined
        grades.push(gradeAnswer(p, a, ctx, recalled))
      }
      const votes = grades.filter((g) => g.pass).length
      const pass = votes * 2 > grades.length
      items.push({ gate: p.gate, boundary: j.b.n, id: `${j.name}/${p.id}`, pass, votes, why: grades.find((g) => g.pass === pass)!.why, tier: p.tier ?? 'core' })
    }
  }
  return items
}

/** `first`: the first sample's number (default 1). `lenient`: a cache miss throws instead of ending the run. */
async function evaluate(label: string, o: { dir?: string; contexts?: string; record: boolean; samples: number; first?: number; lenient?: boolean; behavior?: boolean; holdout?: boolean; chain?: boolean; long?: boolean; reflectorSample?: number; readerSample?: number }): Promise<Run> {
  if (o.record && o.dir) {
    const model = /'--model', '([^']+)'/.exec(readFileSync(`${o.dir}/hooks/register.ts`, 'utf8'))?.[1] ?? ''
    if (!model.startsWith('openai-codex/')) fail(`--record: ${o.dir}'s pi model is "${model}"; only openai-codex models may be called`)
  }
  const run: Run = { label, ...(o.dir ? { dir: o.dir } : {}), samples: [], ...(o.holdout && HOLDOUT.length ? { holdout: [] } : {}), ...(o.chain ? { chain: [] } : {}), ...(o.long ? { long: [] } : {}) }
  // One sample of a corpus; the holdout is graded by the mechanical gates alone, the chain without the rubric files.
  const gradeAll = async (entries: { name: string }[], k: number, kind: 'main' | 'holdout' | 'chain' | 'long', started: Promise<Replay>[]): Promise<Sample> => {
    const specs = kind !== 'holdout'
    const replays: Replay[] = []
    const items: Item[] = []
    const perTranscript: Record<string, Scores> = {}
    const pts: Pointed[] = []
    for (const [i, { name }] of entries.entries()) {
      const r = await started[i]!
      console.error(`[${label}] ${kind === 'main' ? '' : `${kind} `}${name}${o.samples > 1 ? ` sample ${k}` : ''}`)
      if (r.failed && o.lenient) throw new Error(`${name}: not cached`)
      if (r.failed) fail(`${label} ${name}: ${r.failed} of ${r.calls} Observer/Reflector calls are not cached (the variant changed their prompt or input); pass --record to call pi for them`)
      const text = textOf(name)
      const t = parsedOf(name)
      const spec = specs ? await specFor(name) : undefined
      const rubric = kind === 'main' || kind === 'long' ? await rubricFor(name) : undefined
      const recalled = await recallTexts(name, text, t, rubric, o.dir ?? HERE)
      const graded = (n: number) => kind !== 'long' || n % LONG_EVERY === 0
      const mine = t.boundaries.flatMap((b, i) => (r.contexts[i] && graded(b.n) ? grade(t, b.n, r.contexts[i]!, spec, rubric, recalled).map((x) => ({ ...x, id: `${name}/${x.id}` })) : []))
      if (kind === 'long') t.boundaries.forEach((b, i) => r.contexts[i] && graded(b.n) && pts.push(...pointed(t, b.n, r.contexts[i]!, rubric)))
      items.push(...mine)
      perTranscript[name] = score(mine)
      replays.push(r)
    }
    return { replays, items, scores: score(items), perTranscript, ...(kind === 'long' ? { pointed: pts } : {}) }
  }
  // Every replay starts at once, through slot(); grading waits for each in turn. The long chain and the chain first: they run longest.
  const start = (entries: { name: string }[], k: number) =>
    entries.map(({ name }) => (o.contexts ? Promise.resolve(readyMade(name, o.contexts)) : slot(() => replay(name, o.dir!, o.record, k, o.reflectorSample))))
  const ks = Array.from({ length: o.samples }, (_, i) => (o.first ?? 1) + i)
  const started = ks.map((k) => {
    const long = run.long ? start([LONG], k) : []
    const chain = run.chain ? start(CHAIN, k) : []
    return { k, main: start(CORPUS, k), holdout: run.holdout ? start(HOLDOUT, k) : [], chain, long }
  })
  for (const s of started) {
    run.samples.push(await gradeAll(CORPUS, s.k, 'main', s.main))
    if (run.holdout) run.holdout.push(await gradeAll(HOLDOUT, s.k, 'holdout', s.holdout))
    if (run.chain) run.chain.push(await gradeAll(CHAIN, s.k, 'chain', s.chain))
    if (run.long) run.long.push(await gradeAll([LONG], s.k, 'long', s.long))
  }
  if (o.behavior) run.behavior = await behavior(label, o.dir ?? HERE, (run.samples[behaviorSample - (o.first ?? 1)] ?? fail(`--behavior-sample ${behaviorSample}: no such sample`)).replays, o.readerSample)
  return run
}
/** The holdout as a run of its own, for the scorecard and the A/B table. */
const holdoutOf = (r: Run): Run => ({ label: `${r.label} (holdout)`, samples: r.holdout! })
const chainOf = (r: Run): Run => ({ label: `${r.label} (reflection chain)`, samples: r.chain! })
const longOf = (r: Run): Run => ({ label: `${r.label} (long chain, every ${LONG_EVERY}th cut)`, samples: r.long! })
/** The long chain's recall-aware credit (held 1, pointed ½, over its hand-authored facts) and what the plugin reached. */
function longStats(r: Run) {
  const s = r.long![0]!
  const p = s.pointed ?? []
  const held = p.filter((x) => x.held).length
  const ptd = p.filter((x) => x.pointed).length
  // Tiered: each fact weighs TIER.weight of its tier; held earns 1, pointed TIER.pointed of its tier.
  const tw = (t: 'core' | 'lookup') => TIER.weight[t]
  const tden = p.reduce((a, f) => a + tw(f.tier), 0)
  const tnum = p.reduce((a, f) => a + tw(f.tier) * (f.held ? 1 : f.pointed ? TIER.pointed[f.tier] : 0), 0)
  const byTier = (t: 'core' | 'lookup') => {
    const q = p.filter((f) => f.tier === t)
    return { facts: q.length, held: q.filter((f) => f.held).length, pointed: q.filter((f) => f.pointed).length }
  }
  const x = s.replays[0]!
  const cap = x.fallbacks.filter((f) => /over their cap/.test(f.reason))
  const corrections = x.contexts.map((c) => estimateTokens(/<corrections>[\s\S]*?<\/corrections>/.exec(c?.summary ?? '')?.[0] ?? ''))
  const peak = Math.max(0, ...corrections)
  return {
    held, pointed: ptd, facts: p.length, credit: p.length ? (100 * (held + ptd / 2)) / p.length : 0, tieredCredit: tden ? (100 * tnum) / tden : 0, core: byTier('core'), lookup: byTier('lookup'),
    reflections: x.reflections ?? 0, reflector: x.eff.reflector.calls, observer: x.eff.observer.calls, peakCorrections: peak, peakAt: corrections.indexOf(peak) + 1, capFallbacks: cap.map((f) => f.n), otherFallbacks: x.fallbacks.filter((f) => !cap.includes(f)),
  }
}
function longCard(r: Run, items: boolean) {
  const st = longStats(r)
  const out = [
    `Recall-aware credit (not in any total): **${f1(st.credit)}** — ${st.held} of ${st.facts} hand-authored facts held, ${st.pointed} more pointed to by a source range om_recall can follow (½ each).`,
    `Tiered recall-aware credit: **${f1(st.tieredCredit)}** — core ${st.core.held} of ${st.core.facts} held, ${st.core.pointed} pointed (${TIER.pointed.core} each); lookup ${st.lookup.held} of ${st.lookup.facts} held, ${st.lookup.pointed} pointed (${TIER.pointed.lookup} each), a lookup fact weighing ${TIER.weight.lookup}.`,
    `Reached: ${st.reflections} reflections (${st.reflector} Reflector calls), ${st.observer} Observer calls; constraint tier peak ~${st.peakCorrections} tokens at cut ${st.peakAt}; constraint-cap fallbacks at ${st.capFallbacks.length ? st.capFallbacks.join(', ') : 'none'}${st.otherFallbacks.length ? `; other fallbacks: ${st.otherFallbacks.map((f) => `${f.n} (${f.reason.slice(0, 80)})`).join('; ')}` : ''}.`,
    '',
  ]
  if (items) for (const x of (r.long![0]!.pointed ?? []).filter((x) => x.pointed)) out.push(`- pointed @${x.boundary} ${x.id}: ${x.evidence}`)
  return [scorecard(longOf(r), items), ...out].join('\n')
}
/**
 * The Reflector's code as a variant would change it: REFLECTOR_SYSTEM_PROMPT, reflectionPrompt (prompts.ts) and the
 * REFLECT_* constants (register.ts).
 */
function reflectorCode(dir: string) {
  const block = (text: string, start: RegExp) => {
    const lines = text.split('\n')
    const i = lines.findIndex((l) => start.test(l))
    if (i < 0) return ''
    const end = lines.findIndex((l, j) => j > i && /^(?:export |const |function |type |let )/.test(l))
    return lines.slice(i, end < 0 ? undefined : end).join('\n')
  }
  const prompts = readFileSync(`${dir}/hooks/prompts.ts`, 'utf8')
  const register = readFileSync(`${dir}/hooks/register.ts`, 'utf8')
  return [block(prompts, /^export const REFLECTOR_SYSTEM_PROMPT\b/), block(prompts, /^export function reflectionPrompt\b/), ...register.split('\n').filter((l) => /^const REFLECT_\w+ *=/.test(l))].join('\n')
}
const reflections = (r: Run) => [...r.samples, ...(r.chain ?? []), ...(r.long ?? [])].reduce((n, s) => n + s.replays.reduce((m, x) => m + x.eff.reflector.calls, 0), 0)

const f1 = (n: number) => n.toFixed(1)
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const gates = Object.keys(WEIGHTS) as Gate[]
const gateScore = (r: Run, g: Gate) => mean(r.samples.map((s) => s.scores.gates[g]?.score ?? NaN))
const total = (r: Run) => mean(r.samples.map((s) => s.scores.total))
const tiered = (r: Run, k: 'tiered' | 'core' | 'lookup' = 'tiered') => mean(r.samples.map((s) => s.scores[k]))
const tierLine = (r: Run) => `Tiered total: **${f1(tiered(r))}** (core ${f1(tiered(r, 'core'))}, lookup ${f1(tiered(r, 'lookup'))}); flat total ${f1(total(r))}.`

// ---- Efficiency: apart from the quality total (docs/plans/compaction-goals.md).
type EffRow = { tokens: number; max: number; ratio: number; observer: Tally; reflector: Tally; model: number; critical: Tally }
const effOfReplays = (rs: Replay[]): EffRow => {
  const add = (k: 'observer' | 'reflector' | 'critical') => rs.reduce((a, r) => ({ calls: a.calls + r.eff[k].calls, in: a.in + r.eff[k].in, out: a.out + r.eff[k].out }), { calls: 0, in: 0, out: 0 })
  const tokens = rs.flatMap((r) => r.eff.tokens)
  const [observer, reflector] = [add('observer'), add('reflector')]
  return { tokens: mean(tokens), max: Math.max(...tokens), ratio: mean(rs.flatMap((r) => r.eff.ratio)), observer, reflector, model: observer.in + observer.out + reflector.in + reflector.out, critical: add('critical') }
}
/** A run's efficiency, over all its transcripts or one, as the mean over its samples. */
function effRun(r: Run, name?: string): EffRow {
  const rows = r.samples.map((s) => effOfReplays(s.replays.filter((x) => !name || x.name === name)))
  const m = (f: (e: EffRow) => number) => mean(rows.map(f))
  const t = (k: 'observer' | 'reflector' | 'critical'): Tally => ({ calls: m((e) => e[k].calls), in: m((e) => e[k].in), out: m((e) => e[k].out) })
  return { tokens: m((e) => e.tokens), max: m((e) => e.max), ratio: m((e) => e.ratio), observer: t('observer'), reflector: t('reflector'), model: m((e) => e.model), critical: t('critical') }
}
const kt = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`)
const pct = (n: number) => `${(100 * n).toFixed(1)}%`
const EFF: [string, (e: EffRow) => string][] = [
  ['context tokens per cut, mean', (e) => kt(e.tokens)],
  ['context tokens per cut, max', (e) => kt(e.max)],
  ['reduction ratio (compacted / replaced), mean', (e) => pct(e.ratio)],
  ['Observer calls (tokens in / out)', (e) => `${Math.round(e.observer.calls)} (${kt(e.observer.in)} / ${kt(e.observer.out)})`],
  ['Reflector calls (tokens in / out)', (e) => `${Math.round(e.reflector.calls)} (${kt(e.reflector.in)} / ${kt(e.reflector.out)})`],
  ['model tokens in + out', (e) => kt(e.model)],
  ['critical-path calls (tokens in / out)', (e) => `${Math.round(e.critical.calls)} (${kt(e.critical.in)} / ${kt(e.critical.out)})`],
]
const EFF_NOTE = "Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated)."
function effTable(r: Run) {
  const names = Object.keys(r.samples[0]!.perTranscript)
  const all = effRun(r)
  const per = names.map((n) => effRun(r, n))
  return [`Efficiency (not in the total):`, '', `| metric | all | ${names.join(' | ')} |`, `|---|---:|${names.map(() => '---:|').join('')}`, ...EFF.map(([k, f]) => `| ${k} | ${f(all)} | ${per.map(f).join(' | ')} |`), '', EFF_NOTE, ''].join('\n')
}
/**
 * The four efficiency measures an A/B is judged on, each lower-is-better, and B's change on each: relative (+0.12: 12%
 * worse; ±10% counts) for tokens and the ratio, absolute per transcript (±1 call counts) for critical-path calls, which
 * are about 2 per transcript. `costly`: B's context or model tokens more than 10% above A's, which caps its verdict.
 */
function effDelta(a: Run, b: Run) {
  const [x, y] = [effRun(a), effRun(b)]
  const n = Object.keys(a.samples[0]!.perTranscript).length
  const rel = (p: number, q: number) => (p === q ? 0 : p === 0 ? Infinity : (q - p) / p)
  const ms = [
    ['mean tokens', rel(x.tokens, y.tokens), 0.1], ['reduction ratio', rel(x.ratio, y.ratio), 0.1],
    ['model tokens', rel(x.model, y.model), 0.1], ['critical-path calls per transcript', (y.critical.calls - x.critical.calls) / n, 1],
  ] as const
  const worse = ms.filter(([, d, t]) => d >= t && d > 0)
  const better = ms.filter(([, d, t]) => d <= -t && d < 0)
  const verdict = worse.length ? 'worse' : better.length ? 'better' : 'same'
  const show = (d: number, t: number) => (d === Infinity ? '+∞' : t === 1 ? `${d > 0 ? '+' : ''}${d.toFixed(1)}` : `${d > 0 ? '+' : ''}${(100 * d).toFixed(0)}%`)
  const line = `efficiency: ${verdict} (B vs A: ${ms.map(([k, d, t]) => `${k} ${show(d, t)}`).join(', ')}; ±10%, or ±1 critical-path call per transcript, counts)`
  const table = [`| efficiency | A | B |`, '|---|---:|---:|', ...EFF.map(([k, f]) => `| ${k} | ${f(x)} | ${f(y)} |`), ''].join('\n')
  const costly = ms.filter(([k, d]) => (k === 'mean tokens' || k === 'model tokens') && d > 0.1).map(([k, d, t]) => `${show(d, t)} ${k}`)
  return { verdict, line, table, worse: worse.map(([k, d, t]) => `${k} ${show(d, t)}`), costly }
}

function provenance(r: Run) {
  return r.samples.map((s, i) => `sample ${i + 1}: ${s.replays.map((x) => `${x.name} ${x.calls} calls, ${x.fresh} fresh`).join('; ')}`).join('\n')
}

function scorecard(r: Run, items: boolean) {
  const s = r.samples[0]!
  const out = [`## ${r.label}`, '', `Total: **${f1(total(r))}**${r.samples.length > 1 ? ` (mean of ${r.samples.length} samples: ${r.samples.map((x) => f1(x.scores.total)).join(', ')})` : ''}`, '', tierLine(r), '', provenance(r), '']
  const names = Object.keys(s.perTranscript).map((name) => ({ name }))
  out.push(`| gate | weight | score | passed | ${names.map((c) => c.name).join(' | ')} |`, `|---|---:|---:|---:|${names.map(() => '---:|').join('')}`)
  const tGate = (name: string, g: Gate) => mean(r.samples.map((x) => x.perTranscript[name]?.gates[g]?.score ?? NaN))
  for (const g of gates) {
    if (!s.scores.gates[g]) continue
    out.push(`| ${g} | ${WEIGHTS[g]} | ${f1(gateScore(r, g))} | ${passedOf(r, g)} | ${names.map((c) => (Number.isNaN(tGate(c.name, g)) ? '–' : f1(tGate(c.name, g)))).join(' | ')} |`)
  }
  out.push(`| **total** | | **${f1(total(r))}** | ${passRate(r)} | ${names.map((c) => f1(tTotal(r, c.name))).join(' | ')} |`, '')
  if (r.samples.length > 1) out.push(`Scores are means over the ${r.samples.length} samples; passed counts are summed over them.`, '')
  out.push(effTable(r))
  if (items) {
    out.push(`Failed items${r.samples.length > 1 ? ' (sample 1)' : ''}:`, '')
    for (const i of s.items.filter((i) => i.score < 1)) out.push(`- ${i.gate} @${i.boundary} ${i.id}: ${i.evidence}${i.score > 0 ? ` (${f1(i.score * 100)})` : ''}`)
    out.push('')
  }
  return out.join('\n')
}

type Pair = [Item, Item]
const itemKey = (i: Item) => `${i.gate}@${i.boundary} ${i.id}`
const passes = (i: Item) => i.score >= 1
/** Whether two runs made the same Observer/Reflector calls (sample 1): then their difference is exact, not sampling noise. */
const sameKeys = (a: Sample[], b: Sample[]) => a[0]!.replays.every((x, i) => x.keys.join() === b[0]!.replays[i]?.keys.join())

/**
 * Flips over every pair of samples (A's k-th against B's k-th): items that pass in one and fail in the other. The unit of
 * the sign test is one item (gate, id) over all its cuts and samples, counted by its net flips: successive cuts of one
 * chained replay are not independent.
 */
function flips(a: Sample[], b: Sample[]) {
  const up: Pair[] = []
  const down: Pair[] = []
  for (let k = 0; k < Math.min(a.length, b.length); k++) {
    const bm = new Map(b[k]!.items.map((i) => [itemKey(i), i]))
    for (const x of a[k]!.items) {
      const y = bm.get(itemKey(x))
      if (y && x.gate !== 'tokens' && passes(x) !== passes(y)) (passes(y) ? up : down).push([x, y])
    }
  }
  const net = new Map<string, { gate: Gate; id: string; tier: 'core' | 'lookup'; up: number[]; down: number[] }>()
  const unit = ([x]: Pair) => net.get(`${x.gate} ${x.id}`) ?? net.set(`${x.gate} ${x.id}`, { gate: x.gate, id: x.id, tier: tierOf(x), up: [], down: [] }).get(`${x.gate} ${x.id}`)!
  for (const x of up) unit(x).up.push(x[0].boundary)
  for (const x of down) unit(x).down.push(x[0].boundary)
  const units = [...net.values()]
  const uu = units.filter((u) => u.up.length > u.down.length).length
  const ud = units.filter((u) => u.down.length > u.up.length).length
  return { up, down, units, uu, ud, p: signTest(uu, ud) }
}

/** Two-sided sign test: how likely a split this uneven is if neither side were better. */
function signTest(x: number, y: number) {
  const n = x + y
  let p = 0
  for (let k = 0; k <= Math.min(x, y); k++) p += Math.exp(lnFact(n) - lnFact(k) - lnFact(n - k) - n * Math.LN2)
  return Math.min(1, 2 * p)
}
const signed = (d: number) => (Math.abs(d) < 0.05 ? '0' : (d > 0 ? '+' : '') + f1(d))
const tTotal = (r: Run, name: string) => mean(r.samples.map((s) => s.perTranscript[name]?.total ?? NaN))

/**
 * A against B. The verdict needs the weighted Δ, the net flips per unique item and at least 2 of 3 transcripts to agree
 * in sign; when B's Observer/Reflector calls differ from A's it also needs Δ beyond the noise floor (A's sample spread,
 * or A against its resample A'), or with several samples B's lowest total above A's highest. `informational`: no verdict.
 */
function ab(a: Run, b: Run, o: { informational?: boolean } = {}) {
  const n = Math.min(a.samples.length, b.samples.length)
  const exact = sameKeys(a.samples, b.samples)
  const f = flips(a.samples, b.samples)
  const out = [`# Compaction A/B`, '', `A: ${a.label}`, `B: ${b.label}`, '', provenance(a).replace(/^/gm, 'A '), provenance(b).replace(/^/gm, 'B '), '']
  const count = (xs: Pair[], g: Gate) => xs.filter(([x]) => x.gate === g).length || ''
  out.push(`| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |`, '|---|---:|---:|---:|---:|---:|---:|---:|---:|')
  for (const g of gates) {
    const x = gateScore(a, g)
    const y = gateScore(b, g)
    if (Number.isNaN(x) && Number.isNaN(y)) continue
    out.push(`| ${g} | ${WEIGHTS[g]} | ${f1(x)} | ${f1(y)} | ${signed(y - x)} | ${passedOf(a, g)} | ${passedOf(b, g)} | ${count(f.up, g)} | ${count(f.down, g)} |`)
  }
  const d = total(b) - total(a)
  out.push(`| **total** | | **${f1(total(a))}** | **${f1(total(b))}** | **${signed(d)}** | ${passRate(a)} | ${passRate(b)} | **${f.up.length}** | **${f.down.length}** |`, '')
  const names = Object.keys(a.samples[0]!.perTranscript)
  const dT = names.map((name) => [name, tTotal(b, name) - tTotal(a, name)] as const)
  out.push(`Per transcript: ${dT.map(([name, x]) => `${name} ${f1(tTotal(a, name))} → ${f1(tTotal(b, name))} (${signed(x)})`).join('; ')}.`)
  out.push(`Flips: ${f.up.length} up, ${f.down.length} down (item × cut, over ${n} paired sample${n > 1 ? 's' : ''}); by unique item (gate, id; net over its cuts): ${f.uu} up, ${f.ud} down, sign test p=${f.p.toPrecision(2)}. Passed counts are over all samples.`)
  const byTier = (t: 'core' | 'lookup') => {
    const [u, d] = [f.up, f.down].map((xs) => xs.filter(([x]) => tierOf(x) === t).length)
    const us = f.units.filter((x) => x.tier === t)
    return `${t} ${u} up, ${d} down (unique ${us.filter((x) => x.up.length > x.down.length).length} up, ${us.filter((x) => x.down.length > x.up.length).length} down)`
  }
  const dt = tiered(b) - tiered(a)
  out.push(`Tiered total: A ${f1(tiered(a))} → B ${f1(tiered(b))} (${signed(dt)}); core ${f1(tiered(a, 'core'))} → ${f1(tiered(b, 'core'))} (${signed(tiered(b, 'core') - tiered(a, 'core'))}), lookup ${f1(tiered(a, 'lookup'))} → ${f1(tiered(b, 'lookup'))} (${signed(tiered(b, 'lookup') - tiered(a, 'lookup'))}). Flips by tier: ${byTier('core')}; ${byTier('lookup')}. The verdict reads the flat total.`, '')

  // The noise floor: A's own sample spread, or A against its resample A' (sample 2 from A's cache CACHE-s2).
  const totals = (r: Run) => r.samples.map((s) => s.scores.total)
  const nz = a.noise ? { d: total(a.noise) - total(a), f: flips(a.samples.slice(0, 1), a.noise.samples) } : undefined
  const spread = a.samples.length > 1 ? Math.max(...totals(a)) - Math.min(...totals(a)) : nz ? Math.abs(nz.d) : undefined
  const noiseLine = nz ? `A vs A' (A's resample): Δ ${signed(nz.d)}, ${nz.f.up.length} up / ${nz.f.down.length} down (${nz.f.uu} / ${nz.f.ud} unique items).` : ''
  const byScore = d >= 0.05 ? 'B' : d <= -0.05 ? 'A' : undefined
  const byUnits = f.uu > f.ud ? 'B' : f.ud > f.uu ? 'A' : undefined
  const agree = dT.filter(([, x]) => byScore && Math.abs(x) >= 0.05 && (x > 0) === (byScore === 'B')).length
  const need = Math.min(2, names.length)
  const why: string[] = []
  if (byUnits !== byScore) why.push(`the unique-item flips favour ${byUnits ?? 'neither'} (${f.uu} up, ${f.ud} down)`)
  if (agree < need) why.push(`only ${agree} of ${names.length} transcripts move that way`)
  if (!exact && byScore) {
    const [lo, hi] = byScore === 'B' ? [Math.min(...totals(b)), Math.max(...totals(a))] : [Math.min(...totals(a)), Math.max(...totals(b))]
    const apart = n > 1 && lo > hi
    if (spread === undefined && !apart) why.push(`the noise floor is unknown (record A's resample: run --plugin <A> --record --samples 2)`)
    else if (spread !== undefined && Math.abs(d) <= spread && !apart) why.push(`|Δ| ${f1(Math.abs(d))} is within the noise floor ${f1(spread)}${n > 1 ? ` and the samples overlap` : ''}`)
  }
  const e = effDelta(a, b)
  const verdict = o.informational
    ? `none (informational: ${n === 1 ? 'one draw per arm cannot support one; use --samples N' : 'see the main corpus'})`
    : !byScore && !f.up.length && !f.down.length
      ? 'no difference'
      : !byScore
        ? `no verdict: the weighted score does not move (${signed(d)}); the unique-item flips are ${f.uu} up, ${f.ud} down`
        : why.length
          ? `no verdict: the weighted score favours ${byScore} (${signed(d)}), but ${why.join('; ')}`
          : byScore === 'B' && e.costly.length
            ? `tradeoff: B ${signed(d)} quality for ${e.costly.join(', ')} (more than 10% more tokens is never "better")`
            : `${byScore} is better: ${f1(Math.abs(d))} weighted points, ${agree} of ${names.length} transcripts agree, ${Math.max(f.uu, f.ud)} unique items flip to ${byScore} against ${Math.min(f.uu, f.ud)}${f.p < 0.05 ? '' : ' (not significant by the sign test)'}`
  const caveat = exact
    ? `B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.`
    : `B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript.${[...a.samples, ...b.samples].some((s) => s.replays.some((r) => r.fresh)) ? ' Some replies were fresh calls in this run.' : ''} ${noiseLine || "No resample of A is recorded: the noise floor is unknown."}`
  const effFlag = !o.informational && verdict.startsWith('B is') && e.verdict === 'worse' ? `WARNING: B wins on quality but is worse on efficiency by more than 10% (${e.worse.join(', ')}): a regression by docs/plans/compaction-goals.md.` : ''
  out.push(`Verdict: ${verdict}.`, e.line + '.', ...(effFlag ? [effFlag] : []), '', caveat, '', e.table, EFF_NOTE, '')
  const unitLine = (u: (typeof f.units)[number]) => `- ${u.gate} ${u.id}: ${u.up.length ? `↑ at ${u.up.map((x) => `@${x}`).join(' ')}` : ''}${u.up.length && u.down.length ? '; ' : ''}${u.down.length ? `↓ at ${u.down.map((x) => `@${x}`).join(' ')}` : ''}`
  const list = (title: string, us: typeof f.units) => [`${title} (${us.length} unique items):`, '', ...us.slice(0, 150).map(unitLine), ...(us.length > 150 ? [`- and ${us.length - 150} more`] : []), '']
  out.push(...list('Worse in B', f.units.filter((u) => u.down.length > u.up.length)), ...list('Better in B', f.units.filter((u) => u.up.length > u.down.length)))
  const mixed = f.units.filter((u) => u.up.length === u.down.length)
  if (mixed.length) out.push(...list('Both ways', mixed))
  // The gates that moved the total most: weight times score change, over the total weight.
  const w = gates.filter((g) => !Number.isNaN(gateScore(a, g))).reduce((s, g) => s + WEIGHTS[g], 0)
  const moved = gates
    .map((g) => [g, (WEIGHTS[g] * ((gateScore(b, g) || 0) - (gateScore(a, g) || 0))) / w] as const)
    .filter(([, x]) => Math.abs(x) >= 0.05)
    .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
  const top = moved.slice(0, 4).map(([g, x]) => `${g} ${signed(x)}`).join(', ')
  const better = verdict.startsWith('A is') ? 'A' : verdict.startsWith('B is') ? 'B' : undefined
  const perT = dT.map(([, x]) => signed(x)).join(' / ')
  return {
    d, dt, up: f.up.length, down: f.down.length, uu: f.uu, ud: f.ud, p: f.p, units: f.units, exact, better, text: out.join('\n'), effFlag,
    row: `| ${b.label} | ${f1(total(b))} | ${signed(d)} | ${f1(tiered(b))} (${signed(dt)}) | ${perT} | ${f.uu} | ${f.ud} | ${f.p.toPrecision(2)} | ${exact ? 'exact' : nz ? `A' ${signed(nz.d)}` : 'noise unknown'} | ${better ?? (verdict.startsWith('tradeoff') ? 'tradeoff' : '–')} | ${e.verdict}${effFlag ? ' **(!)**' : ''} | ${top || '–'} |`,
  }
}

const lnFact = (n: number) => {
  let s = 0
  for (let k = 2; k <= n; k++) s += Math.log(k)
  return s
}
/** A gate's passed/total items over all samples. */
const passedOf = (r: Run, g: Gate) => {
  const xs = r.samples.map((s) => s.scores.gates[g]).filter((x) => x !== undefined)
  return xs.length ? `${xs.reduce((s, x) => s + x.passed, 0)}/${xs.reduce((s, x) => s + x.items, 0)}` : '–'
}
/** The share of pass/fail items passed, over all samples. */
const passRate = (r: Run) => {
  const xs = r.samples.flatMap((s) => s.items).filter((i) => i.gate !== 'tokens')
  return `${f1((100 * xs.filter(passes).length) / xs.length)}%`
}

// ---- The behavior report: separate from retention, never blended into it ----

const bKey = (i: BItem) => `${i.gate}@${i.boundary} ${i.id}`
const bPassed = (xs: readonly BItem[], g?: BGate) => {
  const ys = g ? xs.filter((i) => i.gate === g) : xs
  return ys.length ? `${ys.filter((i) => i.pass).length}/${ys.length}` : '–'
}
const bRate = (xs: readonly BItem[]) => (xs.length ? f1((100 * xs.filter((i) => i.pass).length) / xs.length) : '–')
/** The pass rate with a lookup probe weighing TIER.weight.lookup of a core one. */
const bTiered = (xs: readonly BItem[]) => {
  const w = (i: BItem) => TIER.weight[i.tier ?? 'core']
  const den = xs.reduce((s, i) => s + w(i), 0)
  return den ? f1((100 * xs.reduce((s, i) => s + (i.pass ? w(i) : 0), 0)) / den) : '–'
}
const split = (xs: readonly BItem[]) => xs.filter((i) => i.votes > 0 && i.votes < BSAMPLES)

function behaviorCard(r: Run, items: boolean) {
  const xs = r.behavior!
  const out = [`## Behavior: ${r.label}`, '', `Passed: **${bRate(xs)}%** (${bPassed(xs)} probes, majority of ${BSAMPLES} Luna samples); tiered ${bTiered(xs)}%. Not part of the retention total.`, '']
  out.push(`| gate | passed | ${CORPUS.map((c) => c.name).join(' | ')} |`, `|---|---:|${CORPUS.map(() => '---:|').join('')}`)
  for (const g of BGATES) if (xs.some((i) => i.gate === g)) out.push(`| ${g} | ${bPassed(xs, g)} | ${CORPUS.map((c) => bPassed(xs.filter((i) => i.id.startsWith(`${c.name}/`)), g)).join(' | ')} |`)
  out.push('')
  if (items) out.push('Failed probes:', '', ...xs.filter((i) => !i.pass).map((i) => `- ${bKey(i)} (${i.votes}/${BSAMPLES}): ${i.why}`), '')
  const d = split(xs)
  out.push(`Samples disagreed on ${d.length}:`, '', ...d.map((i) => `- ${bKey(i)}: ${i.votes}/${BSAMPLES} passed; majority: ${i.why}`), '')
  return out.join('\n')
}

function behaviorAb(a: Run, b: Run) {
  const am = new Map(a.behavior!.map((i) => [bKey(i), i]))
  const pairs = b.behavior!.flatMap((y) => (am.has(bKey(y)) ? [[am.get(bKey(y))!, y] as const] : []))
  const up = pairs.filter(([x, y]) => !x.pass && y.pass)
  const down = pairs.filter(([x, y]) => x.pass && !y.pass)
  const out = [`## Behavior A/B (Luna reader; not blended into retention)`, '', '| gate | A passed | B passed | ↑ | ↓ |', '|---|---:|---:|---:|---:|']
  for (const g of BGATES)
    if (pairs.some(([x]) => x.gate === g)) out.push(`| ${g} | ${bPassed(a.behavior!, g)} | ${bPassed(b.behavior!, g)} | ${up.filter(([x]) => x.gate === g).length || ''} | ${down.filter(([x]) => x.gate === g).length || ''} |`)
  out.push(`| **all** | **${bRate(a.behavior!)}%** | **${bRate(b.behavior!)}%** | **${up.length}** | **${down.length}** |`, `| tiered | ${bTiered(a.behavior!)}% | ${bTiered(b.behavior!)}% | | |`, '')
  const same = pairs.filter(([x, y]) => x.why === y.why && x.votes === y.votes).length
  out.push(`${same} of ${pairs.length} probes got the same answers in A and B (identical contexts reuse the cached answers).`, '')
  const line = ([x, y]: readonly [BItem, BItem]) => `- ${bKey(x)}: A ${x.votes}/${BSAMPLES} ${x.why} → B ${y.votes}/${BSAMPLES} ${y.why}`
  out.push(`Worse in B (${down.length}):`, '', ...down.map(line), '', `Better in B (${up.length}):`, '', ...up.map(line), '')
  const da = split(a.behavior!)
  const db = split(b.behavior!)
  out.push(`Samples disagreed: A ${da.length}, B ${db.length}:`, '', ...da.map((i) => `- A ${bKey(i)}: ${i.votes}/${BSAMPLES}`), ...db.map((i) => `- B ${bKey(i)}: ${i.votes}/${BSAMPLES}`), '')
  return out.join('\n')
}

const [command, ...rest] = process.argv.slice(2)
const o = options(rest)
const record = !!o.record
const samples = num(o, 'samples', 1)!
const withBehavior = !!o.behavior
const behaviorSample = num(o, 'behavior-sample', 1)!
mkdirSync(OUT, { recursive: true })
const json = (x: unknown, name: string) => {
  const file = str(o, 'json') ?? `${OUT}/${name}.json`
  writeFileSync(file, JSON.stringify(x, null, 1))
  console.error(`results: ${file}`)
}
const stripS = (s: Sample) => ({ ...s, replays: s.replays.map(({ contexts: _, ...x }) => x) })
const strip = (r: Run): unknown => ({ ...r, efficiency: effRun(r), samples: r.samples.map(stripS), ...(r.holdout ? { holdout: r.holdout.map(stripS) } : {}), ...(r.chain ? { chain: r.chain.map(stripS) } : {}), ...(r.long ? { long: r.long.map(stripS), longStats: longStats(r) } : {}), ...(r.noise ? { noise: strip(r.noise) } : {}) })
if (command === 'corpus') await corpus()
else if (command === 'run') {
  const ctx = str(o, 'contexts')
  const src = source(ctx ? `contexts:${ctx}` : (str(o, 'plugin') ?? fail('--plugin <ref|dir> or --contexts DIR')))
  const r = await evaluate(src.label, { dir: src.dir, contexts: src.contexts, record, samples, behavior: withBehavior, holdout: !!o.holdout && !src.contexts, chain: !!o.chain && !src.contexts, long: !!o.long })
  console.log(scorecard(r, !!o.items))
  if (r.holdout) console.log(scorecard(holdoutOf(r), !!o.items))
  if (r.chain) console.log(scorecard(chainOf(r), !!o.items))
  if (r.long) console.log(longCard(r, !!o.items))
  if (r.behavior) console.log(behaviorCard(r, !!o.items))
  json(strip(r), 'run')
} else if (command === 'ab') {
  const sa = source(str(o, 'a') ?? fail('--a <ref|dir>'))
  // Several Bs, comma-separated, each against the one A: a summary table first.
  const sbs = (str(o, 'b') ?? fail('--b <ref|dir>[,<ref|dir>...]')).split(',').map(source)
  const holdout = !o['no-holdout']
  const chain = !o['no-chain']
  const from = (x: ReturnType<typeof source>) => (x.contexts ? { contexts: x.contexts, holdout: false, long: !!o.long } : { dir: x.dir, holdout, chain, long: !!o.long })
  // A and every B at once: their replays share the JOBS slots.
  const [a, ...bs] = await Promise.all([
    evaluate(`A ${sa.label}`, { ...from(sa), record, samples, behavior: withBehavior }),
    ...sbs.map((sb) => evaluate(`B ${sb.label}`, { ...from(sb), record, samples, behavior: withBehavior, reflectorSample: num(o, 'b-reflector-sample'), readerSample: num(o, 'b-reader-sample') })),
  ])
  // A Reflector change that nothing reflects on ties exactly and says nothing: refuse to call it a tie.
  for (const [sb, b] of sbs.map((x, i) => [x, bs[i]!] as const))
    if (sa.dir && sb.dir && reflectorCode(sa.dir) !== reflectorCode(sb.dir) && !reflections(a) && !reflections(b))
      fail(`${sb.label} changes the Reflector (REFLECTOR_SYSTEM_PROMPT, reflectionPrompt or REFLECT_*), but neither side made a Reflector call: the A/B cannot see it. Run without --no-chain.`)
  // A's resample A' (the sample after the last, from its own cache), for the noise floor of a B whose Observer input changed.
  if (samples === 1 && sa.dir && bs.some((b) => !sameKeys(a.samples, b.samples) || (a.holdout && !sameKeys(a.holdout, b.holdout!))))
    a.noise = await evaluate(`A' ${sa.label}`, { dir: sa.dir, record: false, samples: 1, first: 2, lenient: true, holdout })
      .catch(() => evaluate(`A' ${sa.label}`, { dir: sa.dir, record: false, samples: 1, first: 2, lenient: true, holdout: false }))
      .catch(() => undefined)
  // The long chain per B: its own A/B (flips by unique item, like the other tracks) and the recall-aware credit of each side.
  const longs = bs.map((b) => {
    if (!a.long || !b.long) return undefined
    const l = ab(longOf(a), longOf(b), { informational: !sameKeys(a.long, b.long) && samples === 1 })
    const [ca, cb] = [longStats(a).credit, longStats(b).credit]
    const [ta, tb] = [longStats(a).tieredCredit, longStats(b).tieredCredit]
    const cell = `${signed(l.d)} (${l.uu}↑ ${l.ud}↓)${l.better ? ` ${l.better}` : ''}; tiered ${signed(l.dt)}; recall-aware ${f1(cb)} (${signed(cb - ca)}), tiered ${f1(tb)} (${signed(tb - ta)})`
    const json = { b: b.label, total: { a: total(longOf(a)), b: total(longOf(b)) }, tiered: { a: tiered(longOf(a)), b: tiered(longOf(b)) }, recallAware: { a: ca, b: cb }, tieredRecallAware: { a: ta, b: tb }, d: l.d, up: l.up, down: l.down, uniqueUp: l.uu, uniqueDown: l.ud, p: l.p, better: l.better ?? null, units: l.units }
    return { l, ca, cb, ta, tb, cell, json }
  })
  const rs = bs.map((b, i) => {
    const main0 = ab(a, b)
    const lg = longs[i]
    if (lg) main0.text += `\n${lg.l.text.replace('# Compaction A/B', '## Long chain (not in the total)')}\nRecall-aware credit (not in any total): A ${f1(lg.ca)}, B ${f1(lg.cb)} (${signed(lg.cb - lg.ca)}); tiered A ${f1(lg.ta)}, B ${f1(lg.tb)} (${signed(lg.tb - lg.ta)})\n`
    // The reflection chain: its own verdict, informational when its Observer draws differ (no resample of it is recorded).
    const c = a.chain && b.chain ? ab(chainOf(a), chainOf(b), { informational: !sameKeys(a.chain, b.chain) && samples === 1 }) : undefined
    const main = c
      ? { ...main0, text: `${main0.text}\n${c.text.replace('# Compaction A/B', '## Reflection chain (not in the total)')}`, cd: `${signed(c.d)} (${c.up}↑ ${c.down}↓)${c.better ? ` ${c.better}` : ''}` }
      : { ...main0, cd: '' }
    if (!a.holdout) return { ...main, hd: '', warn: '' }
    const h = ab({ ...holdoutOf(a), ...(a.noise?.holdout ? { noise: holdoutOf(a.noise) } : {}) }, holdoutOf(b), { informational: samples === 1 })
    // The main corpus's specs were written against this plugin's history: a gain there that the unseen holdout does not
    // share is fitted to the specs. Only said when the holdout difference is exact (no Observer draws in it).
    const worse = h.d <= -0.05 || h.down > h.up
    const warn = main.better === 'B' && h.exact && worse ? `WARNING: B is better on the main corpus but worse on the holdout (${signed(h.d)}, ${h.up} up, ${h.down} down): suspect fitting to the specs.` : ''
    const text = [main.text.replace(/^Verdict: /m, (v) => (warn ? `${warn}\n\n${v}` : v)), h.text.replace('# Compaction A/B', '## Holdout (mechanical gates only; not in the total)')].join('\n')
    return { ...main, text, hd: `${signed(h.d)} (${h.up}↑ ${h.down}↓)${h.better ? ` ${h.better}` : ''}`, warn }
  })
  const names = CORPUS.map((c) => c.name).join(' / ')
  const summary = [
    `# Against ${a.label}: ${f1(total(a))} (tiered ${f1(tiered(a))})${a.holdout ? `; holdout ${f1(total(holdoutOf(a)))}` : ''}${a.chain ? `; reflection chain ${f1(total(chainOf(a)))} (tiered ${f1(tiered(chainOf(a)))})` : ''}${a.long ? `; long chain ${f1(total(longOf(a)))} (tiered ${f1(tiered(longOf(a)))}), recall-aware ${f1(longStats(a).credit)} (tiered ${f1(longStats(a).tieredCredit)})` : ''}`,
    '',
    `| B | total | Δ | tiered (Δ) | Δ ${names} | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total |${a.holdout ? ' holdout Δ (informational) |' : ''}${a.chain ? ' chain Δ |' : ''}${a.long ? ' long Δ |' : ''}`,
    `|---|---:|---:|---:|---|---:|---:|---:|---|---|---|---|${a.holdout ? '---:|' : ''}${a.chain ? '---:|' : ''}${a.long ? '---|' : ''}`,
    ...rs.map((r, i) => r.row + (a.holdout ? ` ${r.hd}${r.warn ? ' **(!)**' : ''} |` : '') + (a.chain ? ` ${r.cd} |` : '') + (a.long ? ` ${longs[i]?.cell ?? '–'} |` : '')),
    '',
    ...rs.filter((r) => r.warn).map((r) => r.warn),
    ...rs.filter((r) => r.effFlag).map((r) => r.effFlag),
    ...(a.behavior ? [`Behavior (probes passed): A ${bRate(a.behavior)}%; ${bs.map((b) => `${b.label} ${bRate(b.behavior!)}%`).join('; ')}`, ''] : []),
  ]
  const cards = (r: Run) => [scorecard(r, false), ...(r.holdout ? [scorecard(holdoutOf(r), false)] : []), ...(r.chain ? [scorecard(chainOf(r), false)] : []), ...(r.long ? [longCard(r, false)] : [])]
  console.log([summary.join('\n'), ...rs.flatMap((r, i) => [r.text, ...(a.behavior ? [behaviorAb(a, bs[i]!)] : [])]), ...cards(a), ...bs.flatMap(cards)].join('\n'))
  json({ a: strip(a), b: bs.map(strip), ...(a.long ? { long: longs.map((x) => x?.json ?? null) } : {}) }, 'ab')
} else if (command === 'controls') {
  // The negative-control fixture (tests/replay.test.ts): each transcript's fact and latest items, and a plugin's prose
  // contexts at every cut, cut down to the lines any item could match (the test module must stay under 1 MiB).
  const src = source(str(o, 'plugin') ?? 'HEAD')
  // The long chain's own items too, against the corpus's and the holdout's contexts (its members' items are theirs).
  const r = await evaluate(src.label, { dir: src.dir, record: false, samples: 1, holdout: true })
  const items: Record<string, Pick<RubricSpec, 'facts' | 'latest'>> = {}
  for (const c of [...CORPUS, LONG]) {
    const rb = await (c.name === LONG.name ? rubricFiles : rubricFor)(c.name)
    const sh = <T extends { shared?: readonly string[] }>(x: T) => (c.name === LONG.name ? x : { ...x, shared: [...(x.shared ?? []), ...HOLDOUT.map((h) => h.name)] })
    items[c.name] = { facts: (rb?.facts ?? []).map(sh), latest: (rb?.latest ?? []).map(sh) }
  }
  const all = Object.values(items)
  const expects = all.flatMap((x) => x.facts!.flatMap((f) => f.expect))
  const res = all.flatMap((x) => x.latest!.flatMap((l) => [new RegExp(l.current, 'i'), new RegExp(l.stale, 'i')]))
  const keep = (line: string) => {
    const [sq, nm] = [line.replace(/\s+/g, ' ').trim().toLowerCase(), norm(line)]
    return expects.some((e) => hasExpect(sq, nm, e, false) || hasExpect(sq, nm, e, true)) || res.some((re) => re.test(line))
  }
  // Successive cuts share most lines: each transcript's distinct lines once, each cut as indices into them.
  const lines: Record<string, string[]> = {}
  const cuts: Record<string, { n: number; at: number[] }[]> = {}
  for (const rp of [...r.samples[0]!.replays, ...(r.holdout?.[0]?.replays ?? [])]) {
    const t = parseTranscript(textOf(rp.name))
    const table = new Map<string, number>()
    cuts[rp.name] = t.boundaries.flatMap((b, i) => {
      if (!rp.contexts[i]) return []
      const kept = proseContext(rp.contexts[i]!, t.spans.slice(0, b.n).flat()).split('\n').filter(keep)
      return [{ n: b.n, at: kept.map((l) => table.get(l) ?? table.set(l, table.size).get(l)!) }]
    })
    lines[rp.name] = [...table.keys()]
  }
  // One module for the items and one per transcript for its lines and cuts: each module stays under the 1 MiB limit.
  const dir = `${HERE}/tests/fixtures`
  const header = `// Written by \`bun scripts/bench-compact.ts controls\` from ${src.label}'s contexts. Private: never commit.\n`
  const modules = [
    { file: `${dir}/rubric-controls.local.ts`, body: `${header}export const items = ${JSON.stringify(items)}\nexport const names = ${JSON.stringify(Object.keys(lines))}\n` },
    ...Object.keys(lines).map((name) => ({ file: `${dir}/rubric-controls.${name}.local.ts`, body: `${header}export const lines = ${JSON.stringify(lines[name])}\nexport const cuts = ${JSON.stringify(cuts[name])}\n` })),
  ]
  for (const m of modules) if (m.body.length > 1_000_000) fail(`${m.file}: ${m.body.length} bytes, over the 1 MiB claude plugin test imports`)
  for (const m of modules) {
    writeFileSync(m.file, m.body, { mode: 0o600 })
    console.log(`${m.file}: ${m.body.length} bytes`)
  }
} else fail('usage: bun scripts/bench-compact.ts corpus | controls [--plugin <ref|dir>] | run --plugin <ref|dir> | ab --a <ref|dir> --b <ref|dir> (see the header)')
