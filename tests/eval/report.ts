// The reports of `scripts/bench-compact.ts`: a run's scorecard and efficiency table, the long chain's card, the A/B
// of two runs with its verdict, the behavior check's card and A/B, and the continuation score. Pure: the script runs
// the replays and the reader, and prints what these return.
import type { Context } from './replay'
import { estimateTokens } from './replay'
import type { Gate, Item, Pointed, Scores } from './rubric'
import { APART, counts, tierOf, TIER, WEIGHTS } from './rubric'
import type { BGate } from './behavior'
import { BGATES, BSAMPLES } from './behavior'
import type { Category, ContinuationScore } from './continuation'
import { CATEGORIES, CATEGORY_WEIGHTS, continuation, continuationBehavior } from './continuation'

/** One transcript's replay: its contexts, and the cache keys of its Observer calls (sorted). */
export type Replay = { name: string; contexts: (Context | undefined)[]; calls: number; fresh: number; failed: number; keys: string[]; eff: Eff; fallbacks: { n: number; reason: string }[] }
/** Model calls and their tokens in and out (Ember's usage; the estimated request when it has none). */
export type Tally = { calls: number; in: number; out: number }
/**
 * Efficiency and cost, apart from the quality total. Per cut (Cut): the compacted context's tokens, estimated and
 * calibrated, the source session's requests before its next compaction, and the context over the one it replaced (the
 * source session's own preTokens at the cut). `cpt`: the transcript's recorded characters per token. Critical path: the calls bench-replay starts while register.ts's
 * session.compact hook runs (calls.json atCompaction), which compaction waits for; a background call still in flight that
 * merely finishes during compaction counts as background.
 */
export type Eff = { cuts: Cut[]; cpt: number; observer: Tally; critical: Tally }
export type Sample = { replays: Replay[]; items: Item[]; scores: Scores; perTranscript: Record<string, Scores>; pointed?: Pointed[] }
export type Run = { label: string; dir?: string; behavior?: BItem[]; samples: Sample[]; holdout?: Sample[]; chain?: Sample[]; long?: Sample[] }
export type BItem = { gate: BGate; boundary: number; id: string; pass: boolean; votes: number; why: string; tier?: 'core' | 'lookup' }

/** The long chain's recall-aware credit (held 1, pointed ½, over its hand-authored facts) and what the plugin reached. */
export function longStats(r: Run) {
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
    observer: x.eff.observer.calls, peakCorrections: peak, peakAt: corrections.indexOf(peak) + 1, capFallbacks: cap.map((f) => f.n), otherFallbacks: x.fallbacks.filter((f) => !cap.includes(f)),
  }
}
/** The long chain's card: `long` is its run as the scorecard reads it (the script's longOf). */
export function longCard(r: Run, long: Run, items: boolean) {
  const st = longStats(r)
  const out = [
    `Recall-aware credit (not in any total): **${f1(st.credit)}** — ${st.held} of ${st.facts} hand-authored facts held, ${st.pointed} more pointed to by a source range om_recall can follow (½ each).`,
    `Tiered recall-aware credit: **${f1(st.tieredCredit)}** — core ${st.core.held} of ${st.core.facts} held, ${st.core.pointed} pointed (${TIER.pointed.core} each); lookup ${st.lookup.held} of ${st.lookup.facts} held, ${st.lookup.pointed} pointed (${TIER.pointed.lookup} each), a lookup fact weighing ${TIER.weight.lookup}.`,
    `Reached: ${st.observer} Observer calls; constraint tier peak ~${st.peakCorrections} tokens at cut ${st.peakAt}; constraint-cap fallbacks at ${st.capFallbacks.length ? st.capFallbacks.join(', ') : 'none'}${st.otherFallbacks.length ? `; other fallbacks: ${st.otherFallbacks.map((f) => `${f.n} (${f.reason.slice(0, 80)})`).join('; ')}` : ''}.`,
    '',
  ]
  if (items) for (const x of (r.long![0]!.pointed ?? []).filter((x) => x.pointed)) out.push(`- pointed @${x.boundary} ${x.id}: ${x.evidence}`)
  return [scorecard(long, items), ...out].join('\n')
}

export const f1 = (n: number) => n.toFixed(1)
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const gates = Object.keys(WEIGHTS) as Gate[]
const gateScore = (r: Run, g: Gate) => mean(r.samples.map((s) => s.scores.gates[g]?.score ?? NaN))
export const total = (r: Run) => mean(r.samples.map((s) => s.scores.total))
export const tiered = (r: Run, k: 'tiered' | 'core' | 'lookup' = 'tiered') => mean(r.samples.map((s) => s.scores[k]))
const tierLine = (r: Run) => `Tiered total: **${f1(tiered(r))}** (core ${f1(tiered(r, 'core'))}, lookup ${f1(tiered(r, 'lookup'))}); flat total ${f1(total(r))}.`

// ---- Efficiency and cost: apart from the quality total, the verdict's second axis ----

// Prompt-cache prices against the plain input price: a compacted context is written to the cache once, at the
// compaction, and read from it on every later request until the next one.
const CACHE_WRITE = 1.25
const CACHE_READ = 0.1
/** A context over this many calibrated tokens does not fit the budget the plugin aims for. */
export const BUDGET_TOKENS = 40_000
/** Per cut: the context's tokens (characters ÷ 4), calibrated tokens (characters over the corpus's recorded characters per token), the requests the source session made before its next compaction. */
export type Cut = { tokens: number; calibrated: number; requests: number; ratio: number }
/** A cut's cost in input-token equivalents: its context written to the cache once, then read on each later request. */
export const cutCost = (c: Cut) => c.calibrated * (CACHE_WRITE + CACHE_READ * Math.max(1, c.requests))
type EffRow = { tokens: number; calibrated: number; carried: number; max: number; over: number; cost: number; cpt: number; ratio: number; observer: Tally; model: number; critical: Tally }
const effOfReplays = (rs: Replay[]): EffRow => {
  const add = (k: 'observer' | 'critical') => rs.reduce((a, r) => ({ calls: a.calls + r.eff[k].calls, in: a.in + r.eff[k].in, out: a.out + r.eff[k].out }), { calls: 0, in: 0, out: 0 })
  const cuts = rs.flatMap((r) => r.eff.cuts)
  const reqs = cuts.reduce((s, c) => s + Math.max(1, c.requests), 0)
  const observer = add('observer')
  return {
    tokens: mean(cuts.map((c) => c.tokens)), calibrated: mean(cuts.map((c) => c.calibrated)), carried: cuts.reduce((s, c) => s + c.calibrated * Math.max(1, c.requests), 0) / reqs,
    max: Math.max(...cuts.map((c) => c.calibrated)), over: cuts.filter((c) => c.calibrated > BUDGET_TOKENS).length, cost: cuts.reduce((s, c) => s + cutCost(c), 0),
    cpt: mean(rs.map((r) => r.eff.cpt)), ratio: mean(cuts.map((c) => c.ratio)), observer, model: observer.in + observer.out, critical: add('critical'),
  }
}
/** A run's efficiency, over all its transcripts or one, as the mean over its samples. */
export function effRun(r: Run, name?: string): EffRow {
  const rows = r.samples.map((s) => effOfReplays(s.replays.filter((x) => !name || x.name === name)))
  const m = (f: (e: EffRow) => number) => mean(rows.map(f))
  const t = (k: 'observer' | 'critical'): Tally => ({ calls: m((e) => e[k].calls), in: m((e) => e[k].in), out: m((e) => e[k].out) })
  return { tokens: m((e) => e.tokens), calibrated: m((e) => e.calibrated), carried: m((e) => e.carried), max: m((e) => e.max), over: m((e) => e.over), cost: m((e) => e.cost), cpt: m((e) => e.cpt), ratio: m((e) => e.ratio), observer: t('observer'), model: m((e) => e.model), critical: t('critical') }
}
const kt = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`)
const pct = (n: number) => `${(100 * n).toFixed(1)}%`
const EFF: [string, (e: EffRow) => string][] = [
  ['context tokens per cut, mean: estimated (chars ÷ 4) / calibrated', (e) => `${kt(e.tokens)} / ${kt(e.calibrated)}`],
  ['tokens rewritten per compaction (calibrated), max', (e) => kt(e.max)],
  ['tokens carried per later request (calibrated)', (e) => kt(e.carried)],
  [`cuts over ${kt(BUDGET_TOKENS)} calibrated tokens`, (e) => String(Math.round(e.over))],
  ['context cache cost (input-token equivalents)', (e) => kt(e.cost)],
  ['characters per token recorded', (e) => e.cpt.toFixed(2)],
  ['reduction ratio (compacted / replaced), mean', (e) => pct(e.ratio)],
  ['Observer calls (tokens in / out)', (e) => `${Math.round(e.observer.calls)} (${kt(e.observer.in)} / ${kt(e.observer.out)})`],
  ['model tokens in + out', (e) => kt(e.model)],
  ['critical-path calls (tokens in / out)', (e) => `${Math.round(e.critical.calls)} (${kt(e.critical.in)} / ${kt(e.critical.out)})`],
]
const EFF_NOTE =
  `Calibrated: the context's characters over the characters per token the corpus's own requests recorded (replay.ts charsPerToken, pooled over the main corpus; chars ÷ 4 reads well under it). Cost: each compacted context written to the prompt cache once (${CACHE_WRITE}× the input price) and read on each request the source session made before its next compaction (${CACHE_READ}×); the rows after the cut are the same in A and B and left out. The replay compacts at the source's own cuts, so a larger context does not bring the next compaction sooner here. ` +
  "Critical path: the Observer calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction). Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not."
function effTable(r: Run) {
  const names = Object.keys(r.samples[0]!.perTranscript)
  const all = effRun(r)
  const per = names.map((n) => effRun(r, n))
  return [`Efficiency and cost (not in the quality total):`, '', `| metric | all | ${names.join(' | ')} |`, `|---|---:|${names.map(() => '---:|').join('')}`, ...EFF.map(([k, f]) => `| ${k} | ${f(all)} | ${per.map(f).join(' | ')} |`), '', EFF_NOTE, ''].join('\n')
}
/** Beyond this relative change in the context cache cost, B costs more (or less) than A. */
export const COST_TOLERANCE = 0.1
/** B's change in cost (relative) and in the other efficiency measures, for the verdict's second axis and the table. */
function effDelta(a: Run, b: Run) {
  const [x, y] = [effRun(a), effRun(b)]
  const n = Object.keys(a.samples[0]!.perTranscript).length
  const rel = (p: number, q: number) => (p === q ? 0 : p === 0 ? Infinity : (q - p) / p)
  const cost = rel(x.cost, y.cost)
  const show = (d: number) => (d === Infinity ? '+∞' : `${d > 0 ? '+' : ''}${(100 * d).toFixed(0)}%`)
  const line = `cost: B vs A ${show(cost)} context cache cost (${kt(x.cost)} → ${kt(y.cost)}); tokens rewritten per compaction ${show(rel(x.calibrated, y.calibrated))}, carried per request ${show(rel(x.carried, y.carried))}; beside it: Observer model tokens ${show(rel(x.model, y.model))}, critical-path calls per transcript ${signed((y.critical.calls - x.critical.calls) / n)}`
  const table = [`| efficiency and cost | A | B |`, '|---|---:|---:|', ...EFF.map(([k, f]) => `| ${k} | ${f(x)} | ${f(y)} |`), ''].join('\n')
  return { cost, costText: show(cost), line, table }
}

function provenance(r: Run) {
  return r.samples.map((s, i) => `sample ${i + 1}: ${s.replays.map((x) => `${x.name} ${x.calls} calls, ${x.fresh} fresh`).join('; ')}`).join('\n')
}

const gateRow = (r: Run, g: Gate) => (APART.has(g) ? `apart (${WEIGHTS[g]})` : String(WEIGHTS[g]))
const controlLine = (r: Run) => {
  const c = r.samples.map((s) => s.scores.controls ?? { items: 0, passed: 0 })
  const items = c.reduce((s, x) => s + x.items, 0)
  return items ? `Controls (hand-authored items wholly in the user's typed messages; in no total and no Δ): ${c.reduce((s, x) => s + x.passed, 0)}/${items} pass.` : ''
}

export function scorecard(r: Run, items: boolean) {
  const s = r.samples[0]!
  const out = [`## ${r.label}`, '', `Total: **${f1(total(r))}**${r.samples.length > 1 ? ` (mean of ${r.samples.length} samples: ${r.samples.map((x) => f1(x.scores.total)).join(', ')})` : ''}`, '', tierLine(r), '', provenance(r), '']
  const names = Object.keys(s.perTranscript).map((name) => ({ name }))
  out.push(`| gate | weight | score | passed | ${names.map((c) => c.name).join(' | ')} |`, `|---|---:|---:|---:|${names.map(() => '---:|').join('')}`)
  const tGate = (name: string, g: Gate) => mean(r.samples.map((x) => x.perTranscript[name]?.gates[g]?.score ?? NaN))
  for (const g of gates) {
    if (!s.scores.gates[g]) continue
    out.push(`| ${g} | ${gateRow(r, g)} | ${f1(gateScore(r, g))} | ${passedOf(r, g)} | ${names.map((c) => (Number.isNaN(tGate(c.name, g)) ? '–' : f1(tGate(c.name, g)))).join(' | ')} |`)
  }
  out.push(`| **total** | | **${f1(total(r))}** | ${passRate(r)} | ${names.map((c) => f1(tTotal(r, c.name))).join(' | ')} |`, '')
  out.push(`A gate marked apart is graded and shown but in no total (rubric.ts APART).${controlLine(r) ? ` ${controlLine(r)}` : ''}`, '')
  if (r.samples.length > 1) out.push(`Scores are means over the ${r.samples.length} samples; passed counts are summed over them.`, '')
  out.push(effTable(r))
  if (items) {
    out.push(`Failed items${r.samples.length > 1 ? ' (sample 1)' : ''}:`, '')
    for (const i of s.items.filter((i) => i.score < 1)) out.push(`- ${i.gate} @${i.boundary} ${i.id}: ${i.evidence}${i.score > 0 ? ` (${f1(i.score * 100)})` : ''}${i.control ? ' (control)' : ''}`)
    out.push('')
  }
  return out.join('\n')
}

/** The control contexts' totals beside the real one's (rubric.ts controlContexts): `rows` maps a context to its total per transcript. */
export function controlsCard(label: string, real: Record<string, number>, rows: [string, Record<string, number>][]) {
  const names = Object.keys(real)
  const all = (x: Record<string, number>) => mean(Object.values(x))
  return [
    `## Controls: degenerate contexts graded as ${label}'s (sample 1)`, '',
    `| context | total | ${names.join(' | ')} |`, `|---|---:|${names.map(() => '---:|').join('')}`,
    `| **${label} (real)** | **${f1(all(real))}** | ${names.map((n) => f1(real[n]!)).join(' | ')} |`,
    ...rows.map(([k, x]) => `| ${k} | ${f1(all(x))} | ${names.map((n) => f1(x[n] ?? NaN)).join(' | ')} |`),
    '', 'A real context should sit well above every control; a gain that a control also earns is not a gain in what the context says.', '',
  ].join('\n')
}

type Pair = [Item, Item]
const itemKey = (i: Item) => `${i.gate}@${i.boundary} ${i.id}`
const passes = (i: Item) => i.score >= 1
/** Whether two runs made the same Observer calls (sample 1): then their difference is exact, not sampling noise. */
export const sameKeys = (a: Sample[], b: Sample[]) => a[0]!.replays.every((x, i) => x.keys.join() === b[0]!.replays[i]?.keys.join())

/**
 * Flips over every pair of samples (A's k-th against B's k-th): items that pass in one and fail in the other, counted
 * items in no total left out. A unique item (gate, id) is counted by its net flips over its cuts and samples. Successive
 * cuts of one chained replay share one Observer chain, so these counts describe where Δ comes from: they are not
 * independent trials, and no p value is drawn from them.
 */
function flips(a: Sample[], b: Sample[]) {
  const up: Pair[] = []
  const down: Pair[] = []
  for (let k = 0; k < Math.min(a.length, b.length); k++) {
    const bm = new Map(b[k]!.items.map((i) => [itemKey(i), i]))
    for (const x of a[k]!.items) {
      const y = bm.get(itemKey(x))
      if (y && counts(x) && passes(x) !== passes(y)) (passes(y) ? up : down).push([x, y])
    }
  }
  const net = new Map<string, { gate: Gate; id: string; tier: 'core' | 'lookup'; up: number[]; down: number[] }>()
  const unit = ([x]: Pair) => net.get(`${x.gate} ${x.id}`) ?? net.set(`${x.gate} ${x.id}`, { gate: x.gate, id: x.id, tier: tierOf(x), up: [], down: [] }).get(`${x.gate} ${x.id}`)!
  for (const x of up) unit(x).up.push(x[0].boundary)
  for (const x of down) unit(x).down.push(x[0].boundary)
  const units = [...net.values()]
  const uu = units.filter((u) => u.up.length > u.down.length).length
  const ud = units.filter((u) => u.down.length > u.up.length).length
  return { up, down, units, uu, ud }
}

/**
 * Δ over the items that can vary: the counting items (item × cut) present in every sample of both runs whose score is
 * not the same in all of them. Most items pass or fail in every sample of every version; they dilute the total's Δ.
 */
export function varying(a: Sample[], b: Sample[]) {
  const all = [...a, ...b].map((s) => new Map(s.items.filter(counts).map((i) => [itemKey(i), i.score])))
  const keys = [...all[0]!.keys()].filter((k) => all.every((m) => m.has(k)))
  const vary = keys.filter((k) => new Set(all.map((m) => m.get(k))).size > 1)
  const rate = (ms: typeof all) => (vary.length ? (100 * mean(ms.flatMap((m) => vary.map((k) => m.get(k)!)))) : NaN)
  const [x, y] = [rate(all.slice(0, a.length)), rate(all.slice(a.length))]
  return { items: vary.length, of: keys.length, a: x, b: y, d: y - x }
}
export const signed = (d: number) => (Math.abs(d) < 0.05 ? '0' : (d > 0 ? '+' : '') + f1(d))
const tTotal = (r: Run, name: string) => mean(r.samples.map((s) => s.perTranscript[name]?.total ?? NaN))
/** The fewest samples per arm a verdict needs when B's Observer calls differ from A's. */
export const MIN_SAMPLES = 3
const range = (r: Run) => Math.max(...r.samples.map((s) => s.scores.total)) - Math.min(...r.samples.map((s) => s.scores.total))

/**
 * A against B, on two axes. Quality: the weighted Δ, the net flips per unique item and at least 2 of 3 transcripts must
 * agree in sign. When B's Observer calls differ from A's (other model draws), it also needs MIN_SAMPLES samples an arm,
 * |Δ| beyond the noise floor (the larger arm's range of sample totals), and the winner's lowest sample above the
 * loser's highest; with fewer samples it says so and names no winner. Same-key A/Bs are exact and need neither.
 * Cost (effDelta): the context cache cost, the verdict's second axis. "B is better" needs quality up and cost not up by
 * more than COST_TOLERANCE; a quality gain at a higher cost is "tradeoff", stating both; equal quality at a lower cost
 * is "cheaper".
 * `informational`: no verdict.
 */
export function ab(a: Run, b: Run, o: { informational?: boolean } = {}) {
  const n = Math.min(a.samples.length, b.samples.length)
  const exact = sameKeys(a.samples, b.samples)
  const f = flips(a.samples, b.samples)
  const v = varying(a.samples, b.samples)
  const out = [`# Compaction A/B`, '', `A: ${a.label}`, `B: ${b.label}`, '', provenance(a).replace(/^/gm, 'A '), provenance(b).replace(/^/gm, 'B '), '']
  const count = (xs: Pair[], g: Gate) => xs.filter(([x]) => x.gate === g).length || ''
  out.push(`| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |`, '|---|---:|---:|---:|---:|---:|---:|---:|---:|')
  for (const g of gates) {
    const x = gateScore(a, g)
    const y = gateScore(b, g)
    if (Number.isNaN(x) && Number.isNaN(y)) continue
    out.push(`| ${g} | ${gateRow(a, g)} | ${f1(x)} | ${f1(y)} | ${signed(y - x)} | ${passedOf(a, g)} | ${passedOf(b, g)} | ${count(f.up, g)} | ${count(f.down, g)} |`)
  }
  const d = total(b) - total(a)
  out.push(`| **total** | | **${f1(total(a))}** | **${f1(total(b))}** | **${signed(d)}** | ${passRate(a)} | ${passRate(b)} | **${f.up.length}** | **${f.down.length}** |`, '')
  const names = Object.keys(a.samples[0]!.perTranscript)
  const dT = names.map((name) => [name, tTotal(b, name) - tTotal(a, name)] as const)
  const totals = (r: Run) => r.samples.map((s) => f1(s.scores.total)).join(', ')
  const floor = Math.max(range(a), range(b))
  out.push(`Samples: A ${totals(a)}; B ${totals(b)}.${exact ? '' : ` Noise floor (the larger arm's range): ${a.samples.length > 1 || b.samples.length > 1 ? f1(floor) : 'unknown with one sample an arm'}.`}`)
  out.push(`Δ over the ${v.items} items that vary (of ${v.of} counting items × cuts in every sample): pass rate A ${f1(v.a)}% → B ${f1(v.b)}% (${signed(v.d)}).`)
  out.push(`Per transcript: ${dT.map(([name, x]) => `${name} ${f1(tTotal(a, name))} → ${f1(tTotal(b, name))} (${signed(x)})`).join('; ')}.`)
  out.push(`Flips: ${f.up.length} up, ${f.down.length} down (item × cut, over ${n} paired sample${n > 1 ? 's' : ''}); by unique item (gate, id; net over its cuts): ${f.uu} up, ${f.ud} down. Items of one Observer chain are not independent: no p value. Passed counts are over all samples.`)
  const ctl = [controlLine(a), controlLine(b)].filter(Boolean)
  if (ctl.length) out.push(`A: ${controlLine(a) || 'no controls'} B: ${controlLine(b) || 'no controls'}`)
  const byTier = (t: 'core' | 'lookup') => {
    const [u, dn] = [f.up, f.down].map((xs) => xs.filter(([x]) => tierOf(x) === t).length)
    const us = f.units.filter((x) => x.tier === t)
    return `${t} ${u} up, ${dn} down (unique ${us.filter((x) => x.up.length > x.down.length).length} up, ${us.filter((x) => x.down.length > x.up.length).length} down)`
  }
  const dt = tiered(b) - tiered(a)
  out.push(`Tiered total: A ${f1(tiered(a))} → B ${f1(tiered(b))} (${signed(dt)}); core ${f1(tiered(a, 'core'))} → ${f1(tiered(b, 'core'))} (${signed(tiered(b, 'core') - tiered(a, 'core'))}), lookup ${f1(tiered(a, 'lookup'))} → ${f1(tiered(b, 'lookup'))} (${signed(tiered(b, 'lookup') - tiered(a, 'lookup'))}). Flips by tier: ${byTier('core')}; ${byTier('lookup')}. The verdict reads the flat total.`, '')

  const byScore = d >= 0.05 ? 'B' : d <= -0.05 ? 'A' : undefined
  const byUnits = f.uu > f.ud ? 'B' : f.ud > f.uu ? 'A' : undefined
  const agree = dT.filter(([, x]) => byScore && Math.abs(x) >= 0.05 && (x > 0) === (byScore === 'B')).length
  const need = Math.min(2, names.length)
  const few = !exact && (a.samples.length < MIN_SAMPLES || b.samples.length < MIN_SAMPLES)
  const why: string[] = []
  if (byScore) {
    if (byUnits !== byScore) why.push(`the unique-item flips favour ${byUnits ?? 'neither'} (${f.uu} up, ${f.ud} down)`)
    if (agree < need) why.push(`only ${agree} of ${names.length} transcripts move that way`)
    if (!exact && !few) {
      const nums = (r: Run) => r.samples.map((s) => s.scores.total)
      const [lo, hi] = byScore === 'B' ? [Math.min(...nums(b)), Math.max(...nums(a))] : [Math.min(...nums(a)), Math.max(...nums(b))]
      if (lo <= hi) why.push(`the samples overlap (${byScore}'s lowest ${f1(lo)} is not above the other's highest ${f1(hi)})`)
      if (Math.abs(d) <= floor) why.push(`|Δ| ${f1(Math.abs(d))} is within the noise floor ${f1(floor)}`)
    }
  }
  const e = effDelta(a, b)
  const costly = e.cost > COST_TOLERANCE
  const cheaper = e.cost < -COST_TOLERANCE
  const winner = byScore && !why.length && !few ? byScore : undefined
  const quality = !byScore && !f.up.length && !f.down.length ? 'no difference' : !byScore ? `the weighted score does not move (${signed(d)})` : `the weighted score favours ${byScore} (${signed(d)}), but ${why.join('; ')}`
  const verdict = o.informational
    ? `none (informational: ${n === 1 ? 'one draw per arm cannot support one; use --samples N' : 'see the main corpus'})`
    : few
      ? `no verdict: B's Observer inputs differ from A's and there ${a.samples.length === 1 ? 'is 1 sample' : `are ${a.samples.length} samples`} of A and ${b.samples.length} of B; a verdict needs ${MIN_SAMPLES} an arm (record them: run --plugin <X> --record --samples ${MIN_SAMPLES}). Δ ${signed(d)}, cost ${e.costText}`
      : winner === 'B'
        ? costly
          ? `tradeoff: B ${signed(d)} quality for ${e.costText} context cache cost`
          : `B is better: ${f1(d)} weighted points (${agree} of ${names.length} transcripts agree, ${f.uu} unique items up against ${f.ud}), at ${e.costText} context cache cost`
        : winner === 'A'
          ? cheaper
            ? `tradeoff: B ${signed(d)} quality for ${e.costText} context cache cost`
            : `A is better: ${f1(-d)} weighted points (${agree} of ${names.length} transcripts agree, ${f.ud} unique items down against ${f.uu}), B at ${e.costText} context cache cost`
          : cheaper
            ? `B is cheaper: ${e.costText} context cache cost at equal quality (${quality})`
            : costly
              ? `A is cheaper: B costs ${e.costText} at equal quality (${quality})`
              : quality === 'no difference'
                ? 'no difference'
                : `no verdict: ${quality}`
  const caveat = exact
    ? `B's Observer calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.`
    : `B's Observer inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript.${[...a.samples, ...b.samples].some((s) => s.replays.some((r) => r.fresh)) ? ' Some replies were fresh calls in this run.' : ''}`
  out.push(`Verdict: ${verdict}.`, e.line + '.', '', caveat, '', e.table, EFF_NOTE, '')
  const unitLine = (u: (typeof f.units)[number]) => `- ${u.gate} ${u.id}: ${u.up.length ? `↑ at ${u.up.map((x) => `@${x}`).join(' ')}` : ''}${u.up.length && u.down.length ? '; ' : ''}${u.down.length ? `↓ at ${u.down.map((x) => `@${x}`).join(' ')}` : ''}`
  const list = (title: string, us: typeof f.units) => [`${title} (${us.length} unique items):`, '', ...us.slice(0, 150).map(unitLine), ...(us.length > 150 ? [`- and ${us.length - 150} more`] : []), '']
  out.push(...list('Worse in B', f.units.filter((u) => u.down.length > u.up.length)), ...list('Better in B', f.units.filter((u) => u.up.length > u.down.length)))
  const mixed = f.units.filter((u) => u.up.length === u.down.length)
  if (mixed.length) out.push(...list('Both ways', mixed))
  // The gates that moved the total most: weight times score change, over the total weight.
  const w = gates.filter((g) => !APART.has(g) && !Number.isNaN(gateScore(a, g))).reduce((s, g) => s + WEIGHTS[g], 0)
  const moved = gates
    .filter((g) => !APART.has(g))
    .map((g) => [g, (WEIGHTS[g] * ((gateScore(b, g) || 0) - (gateScore(a, g) || 0))) / w] as const)
    .filter(([, x]) => Math.abs(x) >= 0.05)
    .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
  const top = moved.slice(0, 4).map(([g, x]) => `${g} ${signed(x)}`).join(', ')
  const better = verdict.startsWith('A is better') ? 'A' : verdict.startsWith('B is better') ? 'B' : undefined
  const short = better ?? (verdict.startsWith('tradeoff') ? 'tradeoff' : verdict.startsWith('B is cheaper') ? 'B cheaper' : verdict.startsWith('A is cheaper') ? 'A cheaper' : few ? `– (${a.samples.length}/${b.samples.length} samples)` : '–')
  const rng = (r: Run) => `${f1(Math.min(...r.samples.map((s) => s.scores.total)))}–${f1(Math.max(...r.samples.map((s) => s.scores.total)))}`
  const perT = dT.map(([, x]) => signed(x)).join(' / ')
  return {
    d, dt, up: f.up.length, down: f.down.length, uu: f.uu, ud: f.ud, units: f.units, exact, better, verdict, varying: v, cost: e.cost, text: out.join('\n'),
    row: `| ${b.label} | ${f1(total(b))} | ${signed(d)} | ${rng(a)} / ${rng(b)} | ${exact ? 'exact' : f1(floor)} | ${signed(v.d)} (${v.items}) | ${f1(tiered(b))} (${signed(dt)}) | ${perT} | ${f.uu} | ${f.ud} | ${short} | ${e.costText} | ${top || '–'} |`,
  }
}

/** A gate's passed/total items over all samples. */
const passedOf = (r: Run, g: Gate) => {
  const xs = r.samples.map((s) => s.scores.gates[g]).filter((x) => x !== undefined)
  return xs.length ? `${xs.reduce((s, x) => s + x.passed, 0)}/${xs.reduce((s, x) => s + x.items, 0)}` : '–'
}
/** The share of pass/fail items passed, over all samples. */
const passRate = (r: Run) => {
  const xs = r.samples.flatMap((s) => s.items).filter(counts)
  return `${f1((100 * xs.filter(passes).length) / xs.length)}%`
}

// ---- The behavior report: separate from retention, never blended into it ----

const bKey = (i: BItem) => `${i.gate}@${i.boundary} ${i.id}`
const bPassed = (xs: readonly BItem[], g?: BGate) => {
  const ys = g ? xs.filter((i) => i.gate === g) : xs
  return ys.length ? `${ys.filter((i) => i.pass).length}/${ys.length}` : '–'
}
export const bRate = (xs: readonly BItem[]) => (xs.length ? f1((100 * xs.filter((i) => i.pass).length) / xs.length) : '–')
/** The pass rate with a lookup probe weighing TIER.weight.lookup of a core one. */
const bTiered = (xs: readonly BItem[]) => {
  const w = (i: BItem) => TIER.weight[i.tier ?? 'core']
  const den = xs.reduce((s, i) => s + w(i), 0)
  return den ? f1((100 * xs.reduce((s, i) => s + (i.pass ? w(i) : 0), 0)) / den) : '–'
}
const split = (xs: readonly BItem[]) => xs.filter((i) => i.votes > 0 && i.votes < BSAMPLES)

/** `names`: the corpus's transcripts, a column each. */
export function behaviorCard(r: Run, items: boolean, names: readonly string[]) {
  const xs = r.behavior!
  const out = [`## Behavior: ${r.label}`, '', `Passed: **${bRate(xs)}%** (${bPassed(xs)} probes, majority of ${BSAMPLES} Ember samples); tiered ${bTiered(xs)}%. Not part of the retention total.`, '']
  out.push(`| gate | passed | ${names.join(' | ')} |`, `|---|---:|${names.map(() => '---:|').join('')}`)
  for (const g of BGATES) if (xs.some((i) => i.gate === g)) out.push(`| ${g} | ${bPassed(xs, g)} | ${names.map((n) => bPassed(xs.filter((i) => i.id.startsWith(`${n}/`)), g)).join(' | ')} |`)
  out.push('')
  if (items) out.push('Failed probes:', '', ...xs.filter((i) => !i.pass).map((i) => `- ${bKey(i)} (${i.votes}/${BSAMPLES}): ${i.why}`), '')
  const d = split(xs)
  out.push(`Samples disagreed on ${d.length}:`, '', ...d.map((i) => `- ${bKey(i)}: ${i.votes}/${BSAMPLES} passed; majority: ${i.why}`), '')
  return out.join('\n')
}

export function behaviorAb(a: Run, b: Run) {
  const am = new Map(a.behavior!.map((i) => [bKey(i), i]))
  const pairs = b.behavior!.flatMap((y) => (am.has(bKey(y)) ? [[am.get(bKey(y))!, y] as const] : []))
  const up = pairs.filter(([x, y]) => !x.pass && y.pass)
  const down = pairs.filter(([x, y]) => x.pass && !y.pass)
  const out = [`## Behavior A/B (Ember reader; not blended into retention)`, '', '| gate | A passed | B passed | ↑ | ↓ |', '|---|---:|---:|---:|---:|']
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

// ---- The continuation score (--continuation): additive, beside the totals ----

/** Per sample: the retention items' continuation score; the behavior probes' once (one set of majority votes). */
const contSamples = (xs: readonly Sample[] | undefined) => (xs ?? []).map((s) => continuation(s.items))
const contMean = (cs: readonly ContinuationScore[], c?: Category) => mean(cs.map((x) => (c ? (x.categories[c]?.score ?? NaN) : x.total)))
const cell = (x: number) => (Number.isNaN(x) ? '–' : f1(x))
/** One table: a row per category, a column pair per run (retention, behavior), A/B deltas when two runs. */
function continuationCard(runs: readonly Run[], track: (r: Run) => readonly Sample[] | undefined = (r) => r.samples, title = 'Continuation score') {
  const ret = runs.map((r) => contSamples(track(r)))
  const beh = runs.map((r) => (track(r) === r.samples && r.behavior ? continuationBehavior(r.behavior) : undefined))
  const two = runs.length === 2
  const head = runs.map((r) => `${r.label.split(' ')[0]} retention | ${r.label.split(' ')[0]} behavior`).join(' | ')
  const out = [`## ${title}`, '', `| category | weight | ${head} |${two ? ' Δ retention | Δ behavior |' : ''}`, `|---|---:|${runs.map(() => '---:|---:|').join('')}${two ? '---:|---:|' : ''}`]
  const row = (name: string, w: string, r: (i: number) => number, b: (i: number) => number) =>
    `| ${name} | ${w} | ${runs.map((_, i) => `${cell(r(i))} | ${cell(b(i))}`).join(' | ')} |${two ? ` ${signed(r(1) - r(0))} | ${Number.isNaN(b(0)) ? '–' : signed(b(1) - b(0))} |` : ''}`
  for (const c of CATEGORIES) {
    if (ret.every((x) => Number.isNaN(contMean(x, c))) && beh.every((x) => !x?.categories[c])) continue
    out.push(row(c, String(CATEGORY_WEIGHTS[c]), (i) => contMean(ret[i]!, c), (i) => beh[i]?.categories[c]?.score ?? NaN))
  }
  out.push(row('**total**', '', (i) => contMean(ret[i]!), (i) => beh[i]?.total ?? NaN), '')
  const spread = ret.map((x, i) => (x.length > 1 ? `${runs[i]!.label}: ${x.map((y) => f1(y.total)).join(', ')}` : '')).filter(Boolean)
  if (spread.length) out.push(`Retention continuation per sample: ${spread.join('; ')}.`, '')
  return { text: out.join('\n'), json: runs.map((r, i) => ({ label: r.label, retention: { total: contMean(ret[i]!), samples: ret[i]!.map((x) => x.total), categories: Object.fromEntries(CATEGORIES.map((c) => [c, contMean(ret[i]!, c)])) }, behavior: beh[i] ?? null })) }
}
export const continuationCards = (runs: readonly Run[]) => [
  continuationCard(runs),
  ...(runs.every((r) => r.long) ? [continuationCard(runs, (r) => r.long, 'Continuation score: long chain (retention only)')] : []),
]
