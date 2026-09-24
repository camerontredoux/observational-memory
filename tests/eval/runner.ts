// A configuration-comparison runner for observational-memory (issue #8): replays one scenario (a fixed
// compaction history and continuation task) through the four configurations named in the parent spec (issue #1) --
// built-in compaction, built-in compaction plus recall, observational compaction, and observational compaction plus
// recall -- and records reproducible, machine-readable measurements of what each configuration cost: compaction
// latency, retrieval calls and tokens, continuation latency and cost, each labelled measured, estimated, or
// unavailable. It does not score continuation quality; the continuation-quality benchmark (issue #9) does that.
//
// This module is `$`-free by the repository's rule (a helper module takes plain I/O functions from its caller, as
// `hooks/recall.ts` takes `RecallIo`). The caller supplies one `Io` per configuration: how that configuration
// compacts, how its assistant answers the continuation task (and, for the two `+recall` configurations, how it
// answers a retrieval query). `tests/eval.test.ts` wires `Io` from a controlled `$`/`on` (`claude-code/testing`);
// nothing here imports it.
//
// Live model execution: this module never dials a model or a process itself -- it only calls the `Io` its caller
// hands it. Running live is therefore the caller's job: build an `Io` whose `compact`/`continueTask` make real
// requests, mark it `live: true`, and pass `{ live: true, caps: { maxRuns, maxModelCalls } }` to `runComparison`.
// The runner then refuses to run any `live` `Io` unless the caller opted in, and bounds it: it rejects before
// anything runs if `options.runs` would exceed `caps.maxRuns`, and once the whole comparison's live model calls
// reach `caps.maxModelCalls` it stops calling that `Io` and records the rest as failed rather than spending
// further. What this module cannot do is build that live `Io` for you: `claude plugin test`'s engine throws on any
// capability a test does not mock (its `TestBody` doc: "beneath them the bottom hook throws, naming its event"),
// and `hooks/register.ts` exposes no compaction entry point beside the `session.compact` and `tool.call` hooks the
// engine itself dispatches -- there is nowhere in this plugin that hands a maintainer a real `$` outside a live
// hook call. A live `Io`'s `om`/`om+recall` `compact` therefore needs a real Claude Code session's own `$`, from
// inside a live hook; wiring that is deferred against the parent spec (issue #1), not something this module can
// drive on its own.
//
// A dry run: import `runComparison` with a `Scenario` and one `Io` per configuration built from a controlled
// `$`/`on` (as `tests/eval.test.ts` does for its `$.session.compact` case), and write the returned
// `ConfigurationResult[]` (one JSON object per line works well) for later variability analysis.

import type { SessionMessage } from 'claude-code'

/** The four configurations the parent spec (issue #1) names, in the order they are always reported. */
export type Configuration = 'builtin' | 'builtin+recall' | 'om' | 'om+recall'
export const CONFIGURATIONS: readonly Configuration[] = ['builtin', 'builtin+recall', 'om', 'om+recall']

/**
 * The live benchmark's configurations: the four, then issue #16's fork-handoff compaction (tests/eval/fork-plugin),
 * with and without om_recall. Live only: the replay cannot fork without a live session at each boundary.
 */
export type LiveConfiguration = Configuration | 'fork' | 'fork+recall'
export const LIVE_CONFIGURATIONS: readonly LiveConfiguration[] = [...CONFIGURATIONS, 'fork', 'fork+recall']

/** Whether `om_recall` is offered to the assistant in this configuration. */
export const recallAvailable = (config: LiveConfiguration): boolean => config.endsWith('+recall')

/** Whether this configuration compacts through the observational-memory plugin rather than the host's own summarizer. */
export const usesObservationalCompaction = (config: LiveConfiguration): boolean => config.startsWith('om')

/** Whether this configuration compacts by the fork plugin's handoff. */
export const usesForkCompaction = (config: LiveConfiguration): boolean => config.startsWith('fork')

/** Whether this configuration's compaction is a plugin's (om or fork), which writes a stats file, rather than the host's summarizer. */
export const usesPluginCompaction = (config: LiveConfiguration): boolean => usesObservationalCompaction(config) || usesForkCompaction(config)

/** One compaction opportunity: `append` joins the previous opportunity's kept messages, chaining repeated compaction as a real, growing session would (and reflection too, once a real session's own threshold is crossed). */
export type CompactionPoint = { trigger: 'auto' | 'manual'; append: readonly SessionMessage[] }

/** A fixed scenario: identical across every configuration it runs through. */
export type Scenario = {
  id: string
  /** Compaction opportunities in order; more than one exercises repeated, chained compaction. */
  compactionPoints: readonly CompactionPoint[]
  continuationTask: { id: string; prompt: string }
}

/** A measurement labelled by how it was obtained, so an estimate is never mistaken for a measured value. */
export type Measurement<T> = { status: 'measured'; value: T } | { status: 'estimated'; value: T } | { status: 'unavailable'; reason: string }
export const measured = <T>(value: T): Measurement<T> => ({ status: 'measured', value })
export const estimated = <T>(value: T): Measurement<T> => ({ status: 'estimated', value })
export const unavailable = (reason: string): Measurement<never> => ({ status: 'unavailable', reason })

export type CompactionOutcome = {
  messages: readonly SessionMessage[]
  tokensBefore?: Measurement<number>
  tokensAfter?: Measurement<number>
  /** The compaction's own model request cost, when one was made and the host reported it. */
  cost?: Measurement<number>
  /** Real model calls this compaction spent, for a `live` `Io`'s `caps.maxModelCalls` budget; defaults to 1. */
  modelCalls?: number
}

/** What the continuation task's assistant did: whether, and how many times, it called recall, and what it cost. */
export type ContinueOutcome = {
  recallCalls?: number
  recallTokens?: Measurement<number>
  cost?: Measurement<number>
  /** Real model calls this continuation spent, for a `live` `Io`'s `caps.maxModelCalls` budget; defaults to 1. */
  modelCalls?: number
}

/** What one configuration's run needs from its caller: plain functions, never `$` itself. */
export type Io = {
  compact: (point: CompactionPoint, messagesSoFar: readonly SessionMessage[]) => Promise<CompactionOutcome>
  /**
   * Runs the assistant on the continuation task over the compacted context, `recallAvailable` telling it whether
   * `om_recall` is offered. Absent, the run records continuation as unavailable rather than guessing at it.
   */
  continueTask?: (task: Scenario['continuationTask'], context: { messages: readonly SessionMessage[]; recallAvailable: boolean }) => Promise<ContinueOutcome>
  now: () => number
  /** Model identifiers, for the reproducibility record. Configurations compared together must share `assistant`. */
  model: { observer?: string; assistant?: string }
  promptVersion?: string
  /** Token or size budgets this configuration ran under, for the reproducibility record. */
  budgets?: Record<string, number>
  /** This `Io` makes real, paid model or process calls. `runComparison` refuses it unless `options.live` is set. */
  live?: boolean
}

export type Fixture = { name: string; available: boolean }

export type ConfigurationResult = {
  runId: string
  invocationId: string
  scenarioId: string
  configuration: Configuration
  recallAvailableToAssistant: boolean
  status: 'ok' | 'failed'
  error?: string
  model: { observer?: string; assistant?: string }
  promptVersion?: string
  budgets?: Record<string, number>
  fixtures: readonly Fixture[]
  compactions: readonly {
    trigger: 'auto' | 'manual'
    latencyMs: Measurement<number>
    tokensBefore?: Measurement<number>
    tokensAfter?: Measurement<number>
    cost: Measurement<number>
  }[]
  continuation: { latencyMs: Measurement<number>; cost: Measurement<number> }
  retrieval: { calls: Measurement<number>; tokens: Measurement<number> }
  /** Every cost-bearing operation's cost, combined: `unavailable` if any part is, else `estimated` if any part is. */
  cost: Measurement<number>
}

export type RunOptions = {
  /** Repeated runs of the same scenario and configurations, for variability reporting; default 1. */
  runs?: number
  /**
   * Runs any `Io` marked `live: true` for real, spending real model or process calls. Requires positive
   * `caps.maxRuns` and `caps.maxModelCalls`, checked synchronously before anything runs. Without `live`, a `live`
   * `Io` is refused rather than silently run.
   */
  live?: boolean
  caps?: { maxRuns?: number; maxModelCalls?: number }
  /** Fixture availability (e.g. `tests/fixtures/*.local.ts`), carried onto every result unchanged. */
  fixtures?: readonly Fixture[]
  /** Identifies this call to `runComparison` in every `runId`; default one timestamp per call, for reproducibility. */
  invocationId?: string
}

const NO_RETRIEVAL = { calls: measured(0), tokens: measured(0) } as const
const failedRetrieval = (reason: string) => ({ calls: unavailable(reason), tokens: unavailable(reason) })

/** Combines cost-bearing measurements into one: unavailable if any part is, else estimated if any part is. */
function combineCost(parts: readonly Measurement<number>[]): Measurement<number> {
  const unavailableParts = parts.filter((p) => p.status === 'unavailable')
  if (unavailableParts.length) return unavailable(`total cost is unavailable: ${unavailableParts.map((p) => p.reason).join('; ')}`)
  const values = parts.filter((p): p is Extract<Measurement<number>, { status: 'measured' | 'estimated' }> => p.status !== 'unavailable')
  const total = values.reduce((sum, p) => sum + p.value, 0)
  return values.some((p) => p.status === 'estimated') ? estimated(total) : measured(total)
}

const failedResult = (
  base: Pick<ConfigurationResult, 'runId' | 'invocationId' | 'scenarioId' | 'configuration' | 'recallAvailableToAssistant' | 'model' | 'promptVersion' | 'budgets' | 'fixtures' | 'compactions'>,
  error: unknown,
): ConfigurationResult => {
  const continuation = { latencyMs: unavailable('the run did not reach continuation'), cost: unavailable('the run did not reach continuation') }
  return {
    ...base,
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
    continuation,
    retrieval: failedRetrieval('the run did not reach retrieval'),
    cost: combineCost([...base.compactions.map((c) => c.cost), continuation.cost]),
  }
}

/** One `runComparison` call's total spending against `caps.maxModelCalls`, shared across every run and configuration. */
type Budget = { remaining: number }

async function runOne(
  scenario: Scenario,
  config: Configuration,
  io: Io,
  runId: string,
  invocationId: string,
  fixtures: readonly Fixture[],
  budget: Budget | undefined,
): Promise<ConfigurationResult> {
  const recallEnabled = recallAvailable(config)
  const base = { runId, invocationId, scenarioId: scenario.id, configuration: config, recallAvailableToAssistant: recallEnabled, model: io.model, promptVersion: io.promptVersion, budgets: io.budgets, fixtures }
  const compactions: ConfigurationResult['compactions'][number][] = []
  let messages: readonly SessionMessage[] = []

  // Live `Io`s spend real model calls: refuse to make another once `budget` (`caps.maxModelCalls`) is exhausted,
  // rather than silently going over.
  const capExhausted = () => io.live && budget && budget.remaining <= 0
  const capReachedError = () => new Error("caps.maxModelCalls reached: this comparison's live model calls are spent")
  const spend = (n = 1) => {
    if (io.live && budget) budget.remaining -= n
  }

  for (const point of scenario.compactionPoints) {
    if (capExhausted()) return failedResult({ ...base, compactions }, capReachedError())
    const start = io.now()
    let outcome: CompactionOutcome
    try {
      outcome = await io.compact(point, messages)
    } catch (error) {
      return failedResult({ ...base, compactions }, error)
    }
    spend(outcome.modelCalls ?? 1)
    messages = outcome.messages
    compactions.push({
      trigger: point.trigger,
      latencyMs: measured(io.now() - start),
      tokensBefore: outcome.tokensBefore,
      tokensAfter: outcome.tokensAfter,
      cost: outcome.cost ?? unavailable('the compaction made no model request, or its host did not report cost'),
    })
  }

  if (!io.continueTask)
    return {
      ...base,
      status: 'ok',
      compactions,
      continuation: { latencyMs: unavailable('this Io has no continueTask implementation'), cost: unavailable('this Io has no continueTask implementation') },
      retrieval: failedRetrieval('this Io has no continueTask implementation, so retrieval was never exercised'),
      cost: combineCost(compactions.map((c) => c.cost)),
    }

  if (capExhausted()) return failedResult({ ...base, compactions }, capReachedError())

  const start = io.now()
  let continued: ContinueOutcome
  try {
    continued = await io.continueTask(scenario.continuationTask, { messages, recallAvailable: recallEnabled })
  } catch (error) {
    return failedResult({ ...base, compactions }, error)
  }
  spend(continued.modelCalls ?? 1)
  const continuation = { latencyMs: measured(io.now() - start), cost: continued.cost ?? unavailable('the continuation made no model request, or its host did not report cost') }
  const retrieval = !recallEnabled ? NO_RETRIEVAL : { calls: measured(continued.recallCalls ?? 0), tokens: continued.recallTokens ?? unavailable('the continuation did not report retrieval tokens') }
  return { ...base, status: 'ok', compactions, continuation, retrieval, cost: combineCost([...compactions.map((c) => c.cost), continuation.cost]) }
}

/**
 * Runs `scenario` through `configs`, once per `options.runs` (default 1), building each configuration's `Io` from
 * `ioFor`. Every configuration and every repeated run receives the identical `scenario` object, and each
 * configuration's compactions chain: a point's `Io.compact` receives the previous point's kept messages, so
 * repeated compaction (and, in a real session reached through `$.session.compact`, reflection once its own
 * threshold is crossed) behave as they would in one growing session. A failed compaction or continuation becomes a
 * `'failed'` result rather than rejecting the whole comparison; the remaining configurations still run.
 *
 * Every `Io` in one call must share `model.assistant` (`undefined` does not conflict): comparing configurations
 * against different assistants would confound the comparison, so this throws synchronously instead.
 *
 * An `Io` marked `live: true` makes real model or process calls. `runComparison` refuses to run one unless
 * `options.live` is set, and refuses `options.live` itself without positive `options.caps.maxRuns` and
 * `options.caps.maxModelCalls` -- both checked synchronously, before anything runs. Opted in, `options.caps.maxRuns`
 * bounds `options.runs`, and `options.caps.maxModelCalls` bounds the live calls the whole comparison spends in
 * total, every run and configuration together (each `Io.compact`/`continueTask` call counts as its reported
 * `modelCalls`, or 1 when unreported): once that budget is exhausted, every remaining call is skipped and recorded
 * as failed rather than spent.
 */
export async function runComparison(scenario: Scenario, configs: readonly Configuration[], ioFor: (config: Configuration) => Io, options: RunOptions = {}): Promise<ConfigurationResult[]> {
  const runs = options.runs ?? 1

  // Built once, up front, to validate the whole comparison before anything runs; run 0 reuses these instances
  // rather than asking `ioFor` for a second one. Later runs call `ioFor` fresh, as a caller that builds a new
  // session per run expects.
  const firstIos = configs.map((config) => ({ config, io: ioFor(config) }))

  const assistants = new Set(firstIos.map(({ io }) => io.model.assistant).filter((assistant): assistant is string => assistant !== undefined))
  if (assistants.size > 1) throw new Error(`every configuration in one comparison must share the same assistant model; got ${[...assistants].join(', ')}`)

  const liveIos = firstIos.filter(({ io }) => io.live)
  if (liveIos.length && !options.live)
    throw new Error(`${liveIos.map(({ config }) => config).join(', ')} supplied a live Io, but options.live was not set: pass { live: true, caps } to run it`)

  let budget: Budget | undefined
  if (options.live) {
    const caps = options.caps
    if (!caps || !Number.isFinite(caps.maxRuns) || !Number.isFinite(caps.maxModelCalls) || (caps.maxRuns ?? 0) <= 0 || (caps.maxModelCalls ?? 0) <= 0)
      throw new Error('a live run needs explicit, positive caps.maxRuns and caps.maxModelCalls')
    if (runs > caps.maxRuns!) throw new Error(`options.runs (${runs}) exceeds caps.maxRuns (${caps.maxRuns})`)
    budget = { remaining: caps.maxModelCalls! }
  }

  const fixtures = options.fixtures ?? []
  const invocationId = options.invocationId ?? `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 8)}`

  const results: ConfigurationResult[] = []
  for (let run = 0; run < runs; run++) {
    const ios = run === 0 ? firstIos : configs.map((config) => ({ config, io: ioFor(config) }))
    for (const { config, io } of ios) {
      // Re-checked per run: run 0's Ios were already checked above, but a caller whose `ioFor` builds a fresh Io
      // per run could still hand back a `live` one on a later run without ever opting in.
      if (io.live && !options.live) throw new Error(`${config} supplied a live Io, but options.live was not set: pass { live: true, caps } to run it`)
      const runId = `${invocationId}:${scenario.id}:${config}:${run}`
      results.push(await runOne(scenario, config, io, runId, invocationId, fixtures, budget))
    }
  }
  return results
}
