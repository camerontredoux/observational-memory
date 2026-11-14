#!/usr/bin/env bun
// Compaction A/B benchmark: replays a fixed corpus of long real transcripts through a plugin's compaction
// (`bench-replay.ts om`) and grades every compacted context against the rubric in tests/eval/rubric.ts.
//
//   bun scripts/bench-compact.ts corpus                      # (re)build the local corpus and seed the cache
//   bun scripts/bench-compact.ts run --plugin <ref|dir> [--record] [--samples N] [--json FILE] [--items]
//   bun scripts/bench-compact.ts ab --a <ref|dir> --b <ref|dir>[,<ref|dir>...] [--record] [--samples N] [--json FILE]
//     per gate: scores, passed/total, flips; per transcript Δ; Δ over the items that vary (report.ts varying). Quality
//     is judged alone: the weighted Δ, the sign of the net flips per unique item (gate, id) and 2 of 3 transcripts
//     agreeing. When B's Observer cache keys differ from A's, B's replies are other model draws: the verdict then needs
//     MIN_SAMPLES (3) samples an arm (--samples 3; with fewer it says "no verdict" and names no winner), |Δ| beyond the
//     noise floor (the larger arm's range of sample totals) and the winner's lowest sample above the loser's highest.
//     No p value: the items of one Observer chain are not independent. Same-key A/Bs are exact and need one sample.
//   Cost is the verdict's second axis, never in the quality total (docs/plans/compaction-goals.md in the main checkout):
//     "B is better" needs quality up and the context cache cost up by no more than 10%; a quality gain at more cost is
//     "tradeoff" with both numbers; equal quality at lower cost is "cheaper". The efficiency card: context tokens per cut, estimated (chars ÷ 4) and calibrated (over the characters per token the
//     main corpus's own requests recorded, replay.ts charsPerToken, pooled: 2.22 at this writing), the largest context, tokens carried per later
//     request, cuts over 40k, the context's prompt-cache cost (written once, read on each of the source's requests to its
//     next compaction), the reduction ratio against the source's preTokens, Observer calls and tokens, critical-path
//     calls (started inside session.compact). The replay compacts at the source's own cuts, so a larger context does
//     not bring compactions sooner here. Latency is virtual: calls and tokens are measured, time is not.
//   Controls: every run and ab (not on contexts:DIR) prints the totals of degenerate contexts graded as the real ones
//     (rubric.ts controlContexts: lines shuffled, user messages + grep dump, raw tail only, user messages only, another
//     transcript's context, empty), so a reader sees where a real context sits between them.
//   Items: hand-authored items that grade the same thing twice are dropped, with a line on stderr (rubric.ts dedupe);
//     one whose every expect is in a message the user typed is a control, graded and in no total or Δ. Gates in
//     rubric.ts APART (purpose) are graded and shown, in no total. The commands, subagents and refound gates grade what
//     the agent went back for after a cut, mined from the transcript (replay.ts rerunCommands, subagentReturns,
//     refoundIdentifiers).
//   ab --a/--b also take contexts:DIR (ready-made contexts, as run --contexts), e.g. to price a hand-made context.
//   --chain (run; on for ab, --no-chain to skip): also replay the chain (CHAIN, four sessions chained into one, whose
//     observations outgrow the memory message's cap), graded by the mechanical gates and its specs, reported apart,
//     never in the total.
//   --long (run, ab): also replay the long chain (LONG: 13 sessions a day apart through bench-replay --gap-hours 24, 80 compactions and the
//     constraint cap), graded at every 5th cut by its members' items and its own, reported apart, never in the total, with
//     the recall-aware credit (rubric.ts pointed) and the fallbacks it reached. A compaction that falls back
//     takes the source session's own summary and the chain goes on (bench-replay --fallback recorded).
//   --holdout (run; on for ab, --no-holdout to skip): also grade the holdout sessions (tests/fixtures/holdout.local.json)
//     by the mechanical gates only, reported apart, never in the total. In ab its Δ is informational; with --samples N it
//     gets a verdict under the same rule as the main corpus's. ab warns when B wins the main corpus
//     but loses the holdout, when the holdout difference is exact.
//   --behavior (run, ab): also Ember (READER: reasoning effort max, no tools) answers probes on each context
//     (tests/eval/behavior.ts), 3 samples, majority vote, graded by code; reported apart from retention. Answers are
//     cached in BCACHE by sha256(context + probes + prompt + reader model and effort), so identical contexts in A and B
//     cost nothing; misses are called, at most --reader-max-calls N of them (default no limit). The answers of the
//     earlier Luna reader stay in ~/.cache/om-bench-compact/behavior, unread.
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
// The plugin's Ember replies come from CACHE (~/.cache/om-bench-compact/ember-cache), keyed by sha256 of the request's
// model, instructions, input, reasoning effort and output format (bench-replay.ts): a variant that changes none of them
// replays for free and exactly. A miss fails the run unless --record, which sends it to Ember (the API key read from
// ~/.config/observational-memory/muse-api-key at each call; at most --max-calls N per replay, default 2000) and stores
// the reply with its usage; --samples N runs N independent samples (sample k>1 in its own cache CACHE-s<k>). A plugin
// before v1.17.0 ran pi, not Ember, and cannot be replayed; the pi replies stay in the luna-cache directories, unread.
// One Observer miss changes every later call of that chained replay, so a changed Observer input is one draw per transcript.
// With --record, a call that fails (a failed fetch, an error reply after three tries, --max-calls reached) is not cached
// and stops the run as a miss.
// --jobs N (default 3): the most replays run at once, across transcripts, samples and the sides of an ab.
// Token gates read the context's prose and its records (`Key: value` lines, table rows; rubric.ts proseContext): a bare
// list of identifiers counts for nothing.
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
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import type { Context, ReplaySpec, Transcript } from '../tests/eval/replay'
import { chainSpec, chainTranscripts, charsPerToken, contextText, estimateTokens, messageText, parseTranscript } from '../tests/eval/replay'
import type { Item, Pointed, RubricSpec, Scores, Tier } from '../tests/eval/rubric'
import { controlContexts, CONTROLS, dedupe, grade, hasExpect, itemTier, norm, pointed, proseContext, score } from '../tests/eval/rubric'
import type { Probe } from '../tests/eval/behavior'
import { BSAMPLES, contextSquashed, gradeAnswer, input, isUnknown, parse, probes, PROMPT } from '../tests/eval/behavior'
import type { BItem, Eff, Replay, Run, Sample, Tally } from '../tests/eval/report'
import { ab, behaviorAb, behaviorCard, bRate, continuationCards, controlsCard, effRun, f1, longCard, longStats, MIN_SAMPLES, sameKeys, scorecard, signed, tiered, total } from '../tests/eval/report'
import { ember, EMBER_MODEL, emberReply, fail, mainCheckout, num, options, str } from './cli'
import { wireFixtures } from './wire-fixtures'

const HERE = resolve(import.meta.dir, '..')
const OUT = `${mainCheckout()}/.scratch/bench-compact`
const CACHE = `${process.env.HOME}/.cache/om-bench-compact/ember-cache`
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
// The chain track: no single corpus session grows its observations past the memory message's cap (MEMORY_MAX_TOKENS),
// so what the cap drops is never seen there. This chain of four (chainTranscripts) does; graded by the mechanical gates
// and its members' specs plus its own (its lost-* questions were written for the removed Reflector), reported apart.
const CHAIN = [{ name: 'om-v04+om-orchestration+firstmate-11+firstmate-6' }]
// The long chain (--long): 13 real sessions (none of the holdout's), oldest first, a day apart, as one indefinite
// session of 80 compactions, graded at every LONG_EVERY-th cut. Its rubric: its members' items at their offsets plus
// tests/fixtures/long.{rubric,hard}.local.ts (long-range items at the chain's boundaries). Reported apart from the total,
// with recall-aware credit (pointedCredit) and the constraint-cap fallbacks reached.
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

/** A transcript's spec and rubric with the items that grade the same thing twice dropped (rubric.ts dedupe), said once. */
const specsMemo = new Map<string, Promise<{ spec?: ReplaySpec; rubric?: RubricSpec }>>()
function specsOf(name: string, withRubric = true) {
  const k = `${name}\0${withRubric}`
  if (!specsMemo.has(k))
    specsMemo.set(k, (async () => {
      const d = dedupe(await specFor(name), withRubric ? await rubricFor(name) : undefined)
      if (withRubric) for (const x of d.notes) console.error(`${name}: ${x}`)
      return { ...(d.spec ? { spec: d.spec } : {}), ...(d.rubric ? { rubric: d.rubric } : {}) }
    })())
  return specsMemo.get(k)!
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

type Call = { kind: 'observer'; atCompaction: boolean; inTokens: number; in: number; out: number }
// The characters per token the main corpus's own requests recorded (replay.ts charsPerToken), pooled over its
// transcripts: the calibration, one figure for every replay, so A and B are priced alike.
let cptMemo: ReturnType<typeof charsPerToken> | undefined
const cptOf = (_name: string) => (cptMemo ??= charsPerToken(CORPUS.map((c) => textOf(c.name)).join('\n')))
function effOf(name: string, t: Transcript, contexts: (Context | undefined)[], calls: Call[]): Eff {
  const tally = (cs: Call[]): Tally => ({ calls: cs.length, in: cs.reduce((a, c) => a + (c.in || c.inTokens), 0), out: cs.reduce((a, c) => a + c.out, 0) })
  const cpt = cptOf(name).median
  const cuts = t.boundaries.flatMap((b, i) => {
    const ctx = contexts[i]
    if (!ctx) return []
    const chars = contextText(ctx).length
    const tokens = estimateTokens(contextText(ctx))
    const pre = b.preTokens ?? estimateTokens(t.spans.slice(0, i + 1).flat().map(messageText).join('\n'))
    return [{ tokens, calibrated: chars / cpt, requests: b.requests ?? 1, ratio: chars / cpt / pre }]
  })
  return { cuts, cpt, observer: tally(calls.filter((c) => c.kind === 'observer')), critical: tally(calls.filter((c) => c.atCompaction)) }
}

// At most JOBS replays run at once (--jobs, default 3): the transcripts are independent, and each replay stays sequential
// inside. Each call's cache key is its own, so the replies and the scores do not depend on the order.
const JOBS = Math.max(1, num(options(process.argv.slice(3)), 'jobs', 3)!)
// With --record, the most live Ember calls each replay makes (--max-calls, default 2000); past it the replay fails.
const MAX_CALLS = num(options(process.argv.slice(3)), 'max-calls', 2000)!
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

async function replay(name: string, dir: string, record: boolean, sample: number): Promise<Replay> {
  const cache = sample === 1 ? CACHE : `${CACHE}-s${sample}`
  const out = `${OUT}/runs/${createHash('sha256').update(`${dir}\0${sample}\0${Date.now()}\0${process.pid}\0${Math.random()}`).digest('hex').slice(0, 10)}-${name}`
  const long = name === LONG.name ? ['--gap-hours', String(LONG_GAP_HOURS), '--fallback', 'recorded'] : []
  const args = ['scripts/bench-replay.ts', 'om', '--transcript', members(name).join('+'), ...long, '--src', dir, '--cache', cache, '--out', out, '--dir', corpusDir(), '--ember', record ? 'live' : 'strict', ...(record ? ['--max-calls', String(MAX_CALLS)] : [])]
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
  return { name, contexts, calls: s.ember.calls, fresh: s.ember.calls - s.ember.cacheHits, failed: s.ember.failed, keys, eff: effOf(name, t, contexts, calls), fallbacks: s.fallbacks ?? [] }
}

function readyMade(name: string, root: string): Replay {
  const t = parseTranscript(textOf(name))
  const d = `${root}/${name}`
  const contexts = t.boundaries.map((b) => (existsSync(`${d}/compaction-${b.n}.md`) ? { summary: readFileSync(`${d}/compaction-${b.n}.md`, 'utf8'), kept: existsSync(`${d}/kept-${b.n}.json`) ? JSON.parse(readFileSync(`${d}/kept-${b.n}.json`, 'utf8')) : [] } : undefined))
  return { name, contexts, calls: 0, fresh: 0, failed: 0, keys: [], eff: effOf(name, t, contexts, []), fallbacks: [] }
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
// The memo holds the promise, not the map it fills: two arms that ask at once both wait for every search.
const recallMemo = new Map<string, Promise<Map<string, string>>>()
function recallTexts(name: string, text: string, t: ReturnType<typeof parseTranscript>, rubric: RubricSpec | undefined, dir: string) {
  const k = `${name}\0${dir}`
  let memo = recallMemo.get(k)
  if (!memo)
    recallMemo.set(
      k,
      (memo = (async () => {
        const out = new Map<string, string>()
        for (const b of t.boundaries)
          for (const q of rubric?.recall ?? []) if (q.from <= b.n && (q.to === undefined || b.n <= q.to)) out.set(`${q.id}@${b.n}`, await search(dir, name, text, b, q.query))
        return out
      })()),
    )
  return memo
}

// ---- The behavior check (--behavior): Ember reads each context and answers probes; code grades the answers ----

const BCACHE = `${process.env.HOME}/.cache/om-bench-compact/behavior-ember`
// The reader: Ember at the highest reasoning effort it takes, the probes' instructions as its system prompt, no tools.
const READER = { model: EMBER_MODEL, effort: 'max' }
const PARALLEL = 20
// --reader-max-calls N: the most live reader calls this run makes; the answers past it are not asked and count as wrong.
let readerLeft = num(options(process.argv.slice(3)), 'reader-max-calls', Infinity)!
const readerSpent = { calls: 0, in: 0, out: 0, cost: 0 }

async function ask(inp: string, file: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2 && readerLeft > 0; attempt++) {
    readerLeft--
    const body = JSON.stringify({ model: READER.model, instructions: PROMPT, input: inp, reasoning: { effort: READER.effort }, store: false })
    const r = await ember(body, 20 * 60_000).catch((error: Error) => ({ status: 0, text: error.message }))
    const got = emberReply(r.text)
    readerSpent.calls++
    readerSpent.in += got.input
    readerSpent.out += got.output
    readerSpent.cost += got.cost
    if (r.status === 200 && got.completed && got.message.includes('[')) return writeFileSync(file, got.message), true
    console.error(`reader call failed (${attempt + 1}/2): ${r.status ? `HTTP ${r.status} ${got.error}` : r.text.slice(-300)}`)
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
    const { spec, rubric } = await specsOf(r.name)
    t.boundaries.forEach((b, i) => {
      const ctx = r.contexts[i]
      const ps = ctx ? probes(t, b.n, spec, rubric) : []
      if (!ctx || !ps.length) return
      const inp = input(ctx, ps)
      const h = createHash('sha256').update([inp, PROMPT, READER.model, READER.effort, ...(readerSample ? [`reader-sample ${readerSample}`] : [])].join('\0')).digest('hex').slice(0, 24)
      jobs.push({ name: r.name, b, ctx, ps, inp, files: Array.from({ length: BSAMPLES }, (_, k) => `${BCACHE}/${h}-s${k + 1}.txt`) })
    })
  }
  const misses = jobs.flatMap((j) => j.files.filter((f) => !existsSync(f)).map((f) => [j, f] as const))
  const n = jobs.reduce((s, j) => s + j.ps.length, 0)
  console.error(`[${label}] behavior: ${n} probes at ${jobs.length} cuts, ${jobs.length * BSAMPLES} reader calls, ${misses.length} not cached: calling Ember for them now`)
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
  console.error(`[${label}] behavior: ${readerSpent.calls} live reader call(s), ${readerSpent.in} tokens in, ${readerSpent.out} out, $${readerSpent.cost.toFixed(4)}`)
  if (lost) console.error(`[${label}] behavior: ${lost} reader calls failed or were not made; their answers count as wrong (rerun to retry them)`)
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
async function evaluate(label: string, o: { dir?: string; contexts?: string; record: boolean; samples: number; first?: number; lenient?: boolean; behavior?: boolean; holdout?: boolean; chain?: boolean; long?: boolean; readerSample?: number }): Promise<Run> {
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
      if (r.failed) fail(o.record ? `${label} ${name}: ${r.failed} of ${r.calls} Observer calls failed (a failed fetch or --max-calls reached; nothing of them was cached): rerun to retry them` : `${label} ${name}: ${r.failed} of ${r.calls} Observer calls are not cached (the variant changed their prompt or input); pass --record to call Ember for them`)
      const text = textOf(name)
      const t = parsedOf(name)
      const { spec, rubric } = specs ? await specsOf(name, kind === 'main' || kind === 'long') : {}
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
    entries.map(({ name }) => (o.contexts ? Promise.resolve(readyMade(name, o.contexts)) : slot(() => replay(name, o.dir!, o.record, k))))
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
/**
 * The controls card: sample 1's real contexts and the degenerate ones built from them (rubric.ts controlContexts), each
 * graded as the run's contexts are, over the main corpus. "Another transcript's context" is the next corpus
 * transcript's context at the same cut (its last when it has fewer).
 */
async function controls(r: Run): Promise<string> {
  const reps = r.samples[0]!.replays
  const real: Record<string, number> = {}
  const rows = new Map<string, Record<string, number>>(CONTROLS.map((c) => [c, {}]))
  for (const [k, rp] of reps.entries()) {
    const other = reps[(k + 1) % reps.length]!.contexts.filter((c) => c !== undefined)
    const t = parsedOf(rp.name)
    const { spec, rubric } = await specsOf(rp.name)
    const recalled = await recallTexts(rp.name, textOf(rp.name), t, rubric, r.dir ?? HERE)
    const items = new Map<string, Item[]>(CONTROLS.map((c) => [c, []]))
    const mine: Item[] = []
    t.boundaries.forEach((b, i) => {
      const ctx = rp.contexts[i]
      if (!ctx) return
      mine.push(...grade(t, b.n, ctx, spec, rubric, recalled))
      const cs = controlContexts(t, b.n, ctx, other[Math.min(i, other.length - 1)])
      for (const c of CONTROLS) items.get(c)!.push(...grade(t, b.n, cs[c], spec, rubric, recalled))
    })
    real[rp.name] = score(mine).total
    for (const c of CONTROLS) rows.get(c)![rp.name] = score(items.get(c)!).total
  }
  return controlsCard(r.label, real, [...rows])
}

/** The holdout as a run of its own, for the scorecard and the A/B table. */
const holdoutOf = (r: Run): Run => ({ label: `${r.label} (holdout)`, samples: r.holdout! })
const chainOf = (r: Run): Run => ({ label: `${r.label} (chain)`, samples: r.chain! })
const longOf = (r: Run): Run => ({ label: `${r.label} (long chain, every ${LONG_EVERY}th cut)`, samples: r.long! })

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
const strip = (r: Run): unknown => ({ ...r, efficiency: effRun(r), samples: r.samples.map(stripS), ...(r.holdout ? { holdout: r.holdout.map(stripS) } : {}), ...(r.chain ? { chain: r.chain.map(stripS) } : {}), ...(r.long ? { long: r.long.map(stripS), longStats: longStats(r) } : {}) })
if (command === 'corpus') await corpus()
else if (command === 'run') {
  const ctx = str(o, 'contexts')
  const src = source(ctx ? `contexts:${ctx}` : (str(o, 'plugin') ?? fail('--plugin <ref|dir> or --contexts DIR')))
  const r = await evaluate(src.label, { dir: src.dir, contexts: src.contexts, record, samples, behavior: withBehavior, holdout: !!o.holdout && !src.contexts, chain: !!o.chain && !src.contexts, long: !!o.long })
  console.log(scorecard(r, !!o.items))
  if (!src.contexts) console.log(await controls(r))
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
    ...sbs.map((sb) => evaluate(`B ${sb.label}`, { ...from(sb), record, samples, behavior: withBehavior, readerSample: num(o, 'b-reader-sample') })),
  ])
  // The long chain per B: its own A/B (flips by unique item, like the other tracks) and the recall-aware credit of each side.
  const longs = bs.map((b) => {
    if (!a.long || !b.long) return undefined
    const l = ab(longOf(a), longOf(b), { informational: !sameKeys(a.long, b.long) && samples < MIN_SAMPLES })
    const [ca, cb] = [longStats(a).credit, longStats(b).credit]
    const [ta, tb] = [longStats(a).tieredCredit, longStats(b).tieredCredit]
    const cell = `${signed(l.d)} (${l.uu}↑ ${l.ud}↓)${l.better ? ` ${l.better}` : ''}; tiered ${signed(l.dt)}; recall-aware ${f1(cb)} (${signed(cb - ca)}), tiered ${f1(tb)} (${signed(tb - ta)})`
    const json = { b: b.label, total: { a: total(longOf(a)), b: total(longOf(b)) }, tiered: { a: tiered(longOf(a)), b: tiered(longOf(b)) }, recallAware: { a: ca, b: cb }, tieredRecallAware: { a: ta, b: tb }, d: l.d, up: l.up, down: l.down, uniqueUp: l.uu, uniqueDown: l.ud, better: l.better ?? null, units: l.units }
    return { l, ca, cb, ta, tb, cell, json }
  })
  const rs = bs.map((b, i) => {
    const main0 = ab(a, b)
    const lg = longs[i]
    if (lg) main0.text += `\n${lg.l.text.replace('# Compaction A/B', '## Long chain (not in the total)')}\nRecall-aware credit (not in any total): A ${f1(lg.ca)}, B ${f1(lg.cb)} (${signed(lg.cb - lg.ca)}); tiered A ${f1(lg.ta)}, B ${f1(lg.tb)} (${signed(lg.tb - lg.ta)})\n`
    // The chain: its own verdict, informational when its Observer draws differ (no resample of it is recorded).
    const c = a.chain && b.chain ? ab(chainOf(a), chainOf(b), { informational: !sameKeys(a.chain, b.chain) && samples < MIN_SAMPLES }) : undefined
    const main = c
      ? { ...main0, text: `${main0.text}\n${c.text.replace('# Compaction A/B', '## Chain (not in the total)')}`, cd: `${signed(c.d)} (${c.up}↑ ${c.down}↓)${c.better ? ` ${c.better}` : ''}` }
      : { ...main0, cd: '' }
    if (!a.holdout) return { ...main, hd: '', warn: '' }
    const h = ab(holdoutOf(a), holdoutOf(b), { informational: !sameKeys(a.holdout, b.holdout!) && samples < MIN_SAMPLES })
    // The main corpus's specs were written against this plugin's history: a gain there that the unseen holdout does not
    // share is fitted to the specs. Only said when the holdout difference is exact (no Observer draws in it).
    const worse = h.d <= -0.05 || h.down > h.up
    const warn = main.better === 'B' && h.exact && worse ? `WARNING: B is better on the main corpus but worse on the holdout (${signed(h.d)}, ${h.up} up, ${h.down} down): suspect fitting to the specs.` : ''
    const text = [main.text.replace(/^Verdict: /m, (v) => (warn ? `${warn}\n\n${v}` : v)), h.text.replace('# Compaction A/B', '## Holdout (mechanical gates only; not in the total)')].join('\n')
    return { ...main, text, hd: `${signed(h.d)} (${h.up}↑ ${h.down}↓)${h.better ? ` ${h.better}` : ''}`, warn }
  })
  const names = CORPUS.map((c) => c.name).join(' / ')
  const summary = [
    `# Against ${a.label}: ${f1(total(a))} (tiered ${f1(tiered(a))})${a.holdout ? `; holdout ${f1(total(holdoutOf(a)))}` : ''}${a.chain ? `; chain ${f1(total(chainOf(a)))} (tiered ${f1(tiered(chainOf(a)))})` : ''}${a.long ? `; long chain ${f1(total(longOf(a)))} (tiered ${f1(tiered(longOf(a)))}), recall-aware ${f1(longStats(a).credit)} (tiered ${f1(longStats(a).tieredCredit)})` : ''}`,
    '',
    `| B | total | Δ | sample range A / B | noise floor | Δ varying items (n) | tiered (Δ) | Δ ${names} | unique ↑ | unique ↓ | verdict | cost | gates that moved the total |${a.holdout ? ' holdout Δ |' : ''}${a.chain ? ' chain Δ |' : ''}${a.long ? ' long Δ |' : ''}`,
    `|---|---:|---:|---|---:|---:|---:|---|---:|---:|---|---:|---|${a.holdout ? '---:|' : ''}${a.chain ? '---:|' : ''}${a.long ? '---|' : ''}`,
    ...rs.map((r, i) => r.row + (a.holdout ? ` ${r.hd}${r.warn ? ' **(!)**' : ''} |` : '') + (a.chain ? ` ${r.cd} |` : '') + (a.long ? ` ${longs[i]?.cell ?? '–'} |` : '')),
    '',
    ...rs.filter((r) => r.warn).map((r) => r.warn),
    ...rs.map((r, i) => `${bs[i]!.label}: ${r.verdict}.`),
    '',
    ...(a.behavior ? [`Behavior (probes passed): A ${bRate(a.behavior)}%; ${bs.map((b) => `${b.label} ${bRate(b.behavior!)}%`).join('; ')}`, ''] : []),
  ]
  const cards = (r: Run) => [scorecard(r, false), ...(r.holdout ? [scorecard(holdoutOf(r), false)] : []), ...(r.chain ? [scorecard(chainOf(r), false)] : []), ...(r.long ? [longCard(r, longOf(r), false)] : [])]
  const cc = o.continuation ? bs.map((b) => continuationCards([a, b])) : []
  const ctl = sa.contexts ? '' : await controls(a)
  console.log([summary.join('\n'), ctl, ...cc.flatMap((x) => x.map((c) => c.text)), ...rs.flatMap((r, i) => [r.text, ...(a.behavior ? [behaviorAb(a, bs[i]!)] : [])]), ...cards(a), ...bs.flatMap(cards)].join('\n'))
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
