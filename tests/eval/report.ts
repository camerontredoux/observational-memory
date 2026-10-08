// The reports of `scripts/bench-compact.ts`: a run's scorecard and efficiency table, the long chain's card, the A/B
// of two runs with its verdict, the behavior check's card and A/B, and the continuation score. Pure: the script runs
// the replays and the reader, and prints what these return.
import type { Context } from './replay'
import { estimateTokens } from './replay'
import type { Gate, Item, Pointed, Scores } from './rubric'
import { tierOf, TIER, WEIGHTS } from './rubric'
import type { BGate } from './behavior'
import { BGATES, BSAMPLES } from './behavior'
import type { Category, ContinuationScore } from './continuation'
import { CATEGORIES, CATEGORY_WEIGHTS, continuation, continuationBehavior } from './continuation'

/** One transcript's replay: its contexts, and the cache keys of its Observer/Reflector calls (sorted). */
export type Replay = { name: string; contexts: (Context | undefined)[]; calls: number; fresh: number; failed: number; keys: string[]; eff: Eff; fallbacks: { n: number; reason: string }[]; reflections?: number }
/** Model calls and their tokens in and out (the pi reply's usage; the estimated prompt when it has none). */
export type Tally = { calls: number; in: number; out: number }
/**
 * Efficiency, apart from the quality total. Per cut: the compacted context's tokens, and that over the context it replaced
 * (the source session's own preTokens at the cut). Critical path: the calls bench-replay starts while register.ts's
 * session.compact hook runs (calls.json atCompaction), which compaction waits for; a background call still in flight that
 * merely finishes during compaction counts as background.
 */
export type Eff = { tokens: number[]; ratio: number[]; observer: Tally; reflector: Tally; critical: Tally }
export type Sample = { replays: Replay[]; items: Item[]; scores: Scores; perTranscript: Record<string, Scores>; pointed?: Pointed[] }
export type Run = { label: string; dir?: string; behavior?: BItem[]; samples: Sample[]; holdout?: Sample[]; chain?: Sample[]; long?: Sample[]; noise?: Run }
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
    reflections: x.reflections ?? 0, reflector: x.eff.reflector.calls, observer: x.eff.observer.calls, peakCorrections: peak, peakAt: corrections.indexOf(peak) + 1, capFallbacks: cap.map((f) => f.n), otherFallbacks: x.fallbacks.filter((f) => !cap.includes(f)),
  }
}
/** The long chain's card: `long` is its run as the scorecard reads it (the script's longOf). */
export function longCard(r: Run, long: Run, items: boolean) {
  const st = longStats(r)
  const out = [
    `Recall-aware credit (not in any total): **${f1(st.credit)}** — ${st.held} of ${st.facts} hand-authored facts held, ${st.pointed} more pointed to by a source range om_recall can follow (½ each).`,
    `Tiered recall-aware credit: **${f1(st.tieredCredit)}** — core ${st.core.held} of ${st.core.facts} held, ${st.core.pointed} pointed (${TIER.pointed.core} each); lookup ${st.lookup.held} of ${st.lookup.facts} held, ${st.lookup.pointed} pointed (${TIER.pointed.lookup} each), a lookup fact weighing ${TIER.weight.lookup}.`,
    `Reached: ${st.reflections} reflections (${st.reflector} Reflector calls), ${st.observer} Observer calls; constraint tier peak ~${st.peakCorrections} tokens at cut ${st.peakAt}; constraint-cap fallbacks at ${st.capFallbacks.length ? st.capFallbacks.join(', ') : 'none'}${st.otherFallbacks.length ? `; other fallbacks: ${st.otherFallbacks.map((f) => `${f.n} (${f.reason.slice(0, 80)})`).join('; ')}` : ''}.`,
    '',
  ]
  if (items) for (const x of (r.long![0]!.pointed ?? []).filter((x) => x.pointed)) out.push(`- pointed @${x.boundary} ${x.id}: ${x.evidence}`)
  return [scorecard(long, items), ...out].join('\n')
}
export const reflections = (r: Run) => [...r.samples, ...(r.chain ?? []), ...(r.long ?? [])].reduce((n, s) => n + s.replays.reduce((m, x) => m + x.eff.reflector.calls, 0), 0)

export const f1 = (n: number) => n.toFixed(1)
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const gates = Object.keys(WEIGHTS) as Gate[]
const gateScore = (r: Run, g: Gate) => mean(r.samples.map((s) => s.scores.gates[g]?.score ?? NaN))
export const total = (r: Run) => mean(r.samples.map((s) => s.scores.total))
export const tiered = (r: Run, k: 'tiered' | 'core' | 'lookup' = 'tiered') => mean(r.samples.map((s) => s.scores[k]))
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
export function effRun(r: Run, name?: string): EffRow {
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

export function scorecard(r: Run, items: boolean) {
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
export const sameKeys = (a: Sample[], b: Sample[]) => a[0]!.replays.every((x, i) => x.keys.join() === b[0]!.replays[i]?.keys.join())

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
export const signed = (d: number) => (Math.abs(d) < 0.05 ? '0' : (d > 0 ? '+' : '') + f1(d))
const tTotal = (r: Run, name: string) => mean(r.samples.map((s) => s.perTranscript[name]?.total ?? NaN))

/**
 * A against B. The verdict needs the weighted Δ, the net flips per unique item and at least 2 of 3 transcripts to agree
 * in sign; when B's Observer/Reflector calls differ from A's it also needs Δ beyond the noise floor (A's sample spread,
 * or A against its resample A'), or with several samples B's lowest total above A's highest. `informational`: no verdict.
 */
export function ab(a: Run, b: Run, o: { informational?: boolean } = {}) {
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
  const out = [`## Behavior: ${r.label}`, '', `Passed: **${bRate(xs)}%** (${bPassed(xs)} probes, majority of ${BSAMPLES} Luna samples); tiered ${bTiered(xs)}%. Not part of the retention total.`, '']
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
