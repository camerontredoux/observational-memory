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
// Live model execution: `claude plugin test`'s engine throws on any capability a test does not mock (its `TestBody`
// doc: "beneath them the bottom hook throws, naming its event"), and `hooks/register.ts` exposes no compaction
// entry point beside the `session.compact` and `tool.call` hooks the engine itself dispatches -- there is nowhere
// in this plugin that hands a maintainer a real `$` outside a live hook call. A live run therefore needs `Io` built
// from inside a real Claude Code session's own hook, which this module cannot reach on its own; `live` only gates
// and records that intent (with the caps below), and does not perform the call. Wiring a live `Io` is future work,
// not something a script here can drive today.
//
// A dry run: import `runComparison` with a `Scenario` and one `Io` per configuration built from a controlled
// `$`/`on` (as `tests/eval.test.ts` does for its `$.session.compact` case), and write the returned
// `ConfigurationResult[]` (one JSON object per line works well) for later variability analysis.

import type { SessionMessage } from 'claude-code'

/** The four configurations the parent spec (issue #1) names, in the order they are always reported. */
export type Configuration = 'builtin' | 'builtin+recall' | 'om' | 'om+recall'
export const CONFIGURATIONS: readonly Configuration[] = ['builtin', 'builtin+recall', 'om', 'om+recall']

/** Whether `om_recall` is offered to the assistant in this configuration. */
export const recallAvailable = (config: Configuration): boolean => config.endsWith('+recall')

/** Whether this configuration compacts through the observational-memory plugin rather than the host's own summarizer. */
export const usesObservationalCompaction = (config: Configuration): boolean => config.startsWith('om')

/** One compaction opportunity: `append` joins the previous opportunity's kept messages, chaining repeated compaction and reflection as a real session would. */
export type CompactionPoint = { trigger: 'auto' | 'manual'; append: readonly SessionMessage[] }

/** One retrieval the continuation task's assistant makes when recall is available to it. */
export type RecallQuery = { query: string }

/** A fixed scenario: identical across every configuration it runs through. */
export type Scenario = {
  id: string
  /** Compaction opportunities in order; more than one exercises repeated compaction and reflection. */
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
}

/** What the continuation task's assistant did: whether, and how many times, it called recall, and what it cost. */
export type ContinueOutcome = { recallCalls?: number; recallTokens?: Measurement<number>; cost?: Measurement<number> }

/** What one configuration's run needs from its caller: plain functions, never `$` itself. */
export type Io = {
  compact: (point: CompactionPoint, messagesSoFar: readonly SessionMessage[]) => Promise<CompactionOutcome>
  /**
   * Runs the assistant on the continuation task over the compacted context, `recallAvailable` telling it whether
   * `om_recall` is offered. Absent, the run records continuation as unavailable rather than guessing at it.
   */
  continueTask?: (task: Scenario['continuationTask'], context: { messages: readonly SessionMessage[]; recallAvailable: boolean }) => Promise<ContinueOutcome>
  now: () => number
  /** Model identifiers, for the reproducibility record. */
  model: { observer?: string; assistant?: string }
  promptVersion?: string
  /** Token or size budgets this configuration ran under, for the reproducibility record. */
  budgets?: Record<string, number>
}

export type Fixture = { name: string; available: boolean }

export type ConfigurationResult = {
  runId: string
  scenarioId: string
  configuration: Configuration
  recallAvailableToAssistant: boolean
  status: 'ok' | 'failed' | 'unavailable'
  error?: string
  reason?: string
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
}

export type RunOptions = {
  /** Repeated runs of the same scenario and configurations, for variability reporting; default 1. */
  runs?: number
  live?: boolean
  caps?: { maxRuns?: number; maxModelCalls?: number }
  /** Fixture availability (e.g. `tests/fixtures/*.local.ts`), carried onto every result unchanged. */
  fixtures?: readonly Fixture[]
}

const LIVE_UNAVAILABLE_REASON =
  "live transport is not implemented: a real Claude Code session's own $, inside a live hook, is the only place hooks/register.ts's compaction runs; this module cannot build Io from one on its own (see this file's header)"

const NO_RETRIEVAL = { calls: measured(0), tokens: measured(0) } as const
const failedRetrieval = (reason: string) => ({ calls: unavailable(reason), tokens: unavailable(reason) })

const failedResult = (
  base: Pick<ConfigurationResult, 'runId' | 'scenarioId' | 'configuration' | 'recallAvailableToAssistant' | 'model' | 'promptVersion' | 'budgets' | 'fixtures' | 'compactions'>,
  error: unknown,
): ConfigurationResult => ({
  ...base,
  status: 'failed',
  error: error instanceof Error ? error.message : String(error),
  continuation: { latencyMs: unavailable('the run did not reach continuation'), cost: unavailable('the run did not reach continuation') },
  retrieval: failedRetrieval('the run did not reach retrieval'),
})

async function runOne(scenario: Scenario, config: Configuration, io: Io, runId: string, fixtures: readonly Fixture[]): Promise<ConfigurationResult> {
  const recallEnabled = recallAvailable(config)
  const base = { runId, scenarioId: scenario.id, configuration: config, recallAvailableToAssistant: recallEnabled, model: io.model, promptVersion: io.promptVersion, budgets: io.budgets, fixtures }
  const compactions: ConfigurationResult['compactions'][number][] = []
  let messages: readonly SessionMessage[] = []

  for (const point of scenario.compactionPoints) {
    const start = io.now()
    let outcome: CompactionOutcome
    try {
      outcome = await io.compact(point, messages)
    } catch (error) {
      return failedResult({ ...base, compactions }, error)
    }
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
    }

  const start = io.now()
  let continued: ContinueOutcome
  try {
    continued = await io.continueTask(scenario.continuationTask, { messages, recallAvailable: recallEnabled })
  } catch (error) {
    return failedResult({ ...base, compactions }, error)
  }
  const continuation = { latencyMs: measured(io.now() - start), cost: continued.cost ?? unavailable('the continuation made no model request, or its host did not report cost') }
  const retrieval = !recallEnabled ? NO_RETRIEVAL : { calls: measured(continued.recallCalls ?? 0), tokens: continued.recallTokens ?? unavailable('the continuation did not report retrieval tokens') }
  return { ...base, status: 'ok', compactions, continuation, retrieval }
}

/**
 * Runs `scenario` through `configs`, once per `options.runs` (default 1), building each configuration's `Io` from
 * `ioFor`. Every configuration and every repeated run receives the identical `scenario` object, and each
 * configuration's compactions chain: a point's `Io.compact` receives the previous point's kept messages, so
 * repeated compaction and reflection behave as they would in one growing session. A failed compaction or
 * continuation becomes a `'failed'` result rather than rejecting the whole comparison; the remaining configurations
 * still run.
 *
 * `options.live` requires positive `options.caps.maxRuns` and `options.caps.maxModelCalls` and throws synchronously
 * (before anything runs) when they are missing; opted in, every result reports `'unavailable'` with the reason,
 * since this module cannot build a live `Io` on its own (see the file header).
 */
export async function runComparison(scenario: Scenario, configs: readonly Configuration[], ioFor: (config: Configuration) => Io, options: RunOptions = {}): Promise<ConfigurationResult[]> {
  const runs = options.runs ?? 1
  if (options.live) {
    const caps = options.caps
    if (!caps || !Number.isFinite(caps.maxRuns) || !Number.isFinite(caps.maxModelCalls) || (caps.maxRuns ?? 0) <= 0 || (caps.maxModelCalls ?? 0) <= 0)
      throw new Error('a live run needs explicit, positive caps.maxRuns and caps.maxModelCalls')
  }
  const fixtures = options.fixtures ?? []

  const results: ConfigurationResult[] = []
  for (let run = 0; run < runs; run++) {
    for (const config of configs) {
      const runId = `${scenario.id}:${config}:${run}`
      if (options.live) {
        results.push({
          runId,
          scenarioId: scenario.id,
          configuration: config,
          recallAvailableToAssistant: recallAvailable(config),
          status: 'unavailable',
          reason: LIVE_UNAVAILABLE_REASON,
          model: {},
          fixtures,
          compactions: [],
          continuation: { latencyMs: unavailable('live'), cost: unavailable('live') },
          retrieval: failedRetrieval('live'),
        })
        continue
      }
      results.push(await runOne(scenario, config, ioFor(config), runId, fixtures))
    }
  }
  return results
}
