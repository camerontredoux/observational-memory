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
//   --continuation (run, ab): also print the continuation score (tests/eval/continuation.ts): the same retention items
//     and behavior probes regrouped by what continuing the work needs (goal, status, rules, decisions, lessons, state,
//     findings, references, history) and weighted by it, history recital least. Additive: every total above is unchanged.
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
// The cards, tables and A/B verdicts render in tests/eval/report.ts; this script runs the replays and prints them.
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
import type { Item, Pointed, RubricSpec, Scores, Tier } from '../tests/eval/rubric'
import { grade, hasExpect, itemTier, norm, pointed, proseContext, score } from '../tests/eval/rubric'
import type { Probe } from '../tests/eval/behavior'
import { BSAMPLES, contextSquashed, gradeAnswer, input, isUnknown, parse, probes, PROMPT } from '../tests/eval/behavior'
import type { BItem, Eff, Replay, Run, Sample, Tally } from '../tests/eval/report'
import { ab, behaviorAb, behaviorCard, bRate, continuationCards, effRun, f1, longCard, longStats, reflections, sameKeys, scorecard, signed, tiered, total } from '../tests/eval/report'
import { fail, mainCheckout, num, options, str } from './cli'
import { wireFixtures } from './wire-fixtures'

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
const PARALLEL = 20

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
  if (r.long) console.log(longCard(r, longOf(r), !!o.items))
  if (r.behavior) console.log(behaviorCard(r, !!o.items, CORPUS.map((c) => c.name)))
  const cc = o.continuation ? continuationCards([r]) : []
  for (const c of cc) console.log(c.text)
  json({ ...(strip(r) as object), ...(cc.length ? { continuation: cc.map((c) => c.json) } : {}) }, 'run')
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
  const cards = (r: Run) => [scorecard(r, false), ...(r.holdout ? [scorecard(holdoutOf(r), false)] : []), ...(r.chain ? [scorecard(chainOf(r), false)] : []), ...(r.long ? [longCard(r, longOf(r), false)] : [])]
  const cc = o.continuation ? bs.map((b) => continuationCards([a, b])) : []
  console.log([summary.join('\n'), ...cc.flatMap((x) => x.map((c) => c.text)), ...rs.flatMap((r, i) => [r.text, ...(a.behavior ? [behaviorAb(a, bs[i]!)] : [])]), ...cards(a), ...bs.flatMap(cards)].join('\n'))
  json({ a: strip(a), b: bs.map(strip), ...(a.long ? { long: longs.map((x) => x?.json ?? null) } : {}), ...(cc.length ? { continuation: cc.map((x) => x.map((c) => c.json)) } : {}) }, 'ab')
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
  await wireFixtures()
} else fail('usage: bun scripts/bench-compact.ts corpus | controls [--plugin <ref|dir>] | run --plugin <ref|dir> | ab --a <ref|dir> --b <ref|dir> (see the header)')
