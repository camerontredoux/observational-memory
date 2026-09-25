import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, ProcessRunResult, SessionMessage } from 'claude-code'
import { CONFIGURATIONS, estimated, measured, recallAvailable, runComparison, unavailable, usesObservationalCompaction } from './eval/runner'
import type { CompactionPoint, Io, Scenario } from './eval/runner'

const msg = (text: string): SessionMessage => ({ role: 'user', text, toolUses: [] })

// A tiny two-compaction scenario: enough to exercise repeated, chained compaction without a real fixture.
function scenario(): Scenario {
  return {
    id: 's1',
    compactionPoints: [
      { trigger: 'manual', append: [msg('a')] },
      { trigger: 'auto', append: [msg('b')] },
    ],
    continuationTask: { id: 't1', prompt: 'what did we decide about b?' },
  }
}

// A deterministic Io: compaction and continuation answer from fixed tables, no model or process call.
function fakeIo(config: string, options: { failCompactionAt?: number; failContinuation?: boolean } = {}): Io {
  let n = 0
  let t = 0
  return {
    now: () => (t += 10),
    model: { observer: 'fake-observer', assistant: 'fake-assistant' },
    promptVersion: 'v1',
    compact: async (point, messagesSoFar) => {
      n++
      if (options.failCompactionAt === n) throw new Error(`compaction ${n} failed`)
      return { messages: [...messagesSoFar, ...point.append], tokensBefore: measured(100), tokensAfter: measured(40), cost: measured(0.01) }
    },
    continueTask: async (_task, { recallAvailable }) => {
      if (options.failContinuation) throw new Error('continuation failed')
      return { cost: measured(0.02), recallCalls: recallAvailable ? 1 : 0, recallTokens: recallAvailable ? measured(12) : undefined }
    },
  }
}

describe('eval runner', () => {
  test('the four configurations are builtin, builtin+recall, om and om+recall; recall is available only with +recall', () => {
    expect(CONFIGURATIONS).toEqual(['builtin', 'builtin+recall', 'om', 'om+recall'])
    expect(CONFIGURATIONS.map(recallAvailable)).toEqual([false, true, false, true])
    expect(CONFIGURATIONS.map(usesObservationalCompaction)).toEqual([false, false, true, true])
  })

  test('every configuration receives the identical scenario and the identical compaction points from it', async () => {
    const s = scenario()
    const seenPoints: CompactionPoint[] = []
    const results = await runComparison(s, CONFIGURATIONS, (config) => {
      const io = fakeIo(config)
      const compact = io.compact
      io.compact = async (point, messagesSoFar) => {
        seenPoints.push(point)
        return compact(point, messagesSoFar)
      }
      return io
    })
    expect(results).toHaveLength(4)
    expect(seenPoints).toHaveLength(8) // 4 configurations x 2 compaction points, each in order
    expect(seenPoints.every((point, i) => point === s.compactionPoints[i % 2])).toBe(true)
  })

  test('a successful run records one compaction result per compaction point, a measured cost, and continuation', async () => {
    const [result] = await runComparison(scenario(), ['om'], () => fakeIo('om'))
    expect(result!.status).toBe('ok')
    expect(result!.compactions).toHaveLength(2)
    expect(result!.compactions[0]!.cost).toEqual(measured(0.01))
    expect(result!.compactions[0]!.latencyMs).toEqual(measured(10))
    expect(result!.compactions[0]!.tokensBefore).toEqual(measured(100))
    expect(result!.continuation.cost).toEqual(measured(0.02))
    expect(result!.continuation.latencyMs).toEqual(measured(10))
  })

  test('cost combines every compaction and the continuation, unavailable if any part is, else estimated if any part is', async () => {
    const [okResult] = await runComparison(scenario(), ['om'], () => fakeIo('om'))
    expect(okResult!.cost).toEqual(measured(0.01 + 0.01 + 0.02)) // two compactions plus the continuation

    const [noCompactionCost] = await runComparison(scenario(), ['om'], () => {
      const io = fakeIo('om')
      const compact = io.compact
      io.compact = async (point, messagesSoFar) => ({ ...(await compact(point, messagesSoFar)), cost: undefined })
      return io
    })
    expect(noCompactionCost!.cost.status).toBe('unavailable')

    const [estimatedResult] = await runComparison(scenario(), ['om'], () => {
      const io = fakeIo('om')
      const compact = io.compact
      let n = 0
      io.compact = async (point, messagesSoFar) => ({ ...(await compact(point, messagesSoFar)), cost: ++n === 1 ? estimated(0.01) : measured(0.01) })
      return io
    })
    expect(estimatedResult!.cost).toEqual(estimated(0.01 + 0.01 + 0.02))
  })

  test('recall calls and tokens are counted only for +recall configurations, zero for the others', async () => {
    const results = await runComparison(scenario(), CONFIGURATIONS, (config) => fakeIo(config))
    const byConfig = Object.fromEntries(results.map((r) => [r.configuration, r]))
    expect(byConfig['builtin']!.retrieval).toEqual({ calls: measured(0), tokens: measured(0) })
    expect(byConfig['om']!.retrieval).toEqual({ calls: measured(0), tokens: measured(0) })
    expect(byConfig['builtin+recall']!.retrieval).toEqual({ calls: measured(1), tokens: measured(12) })
    expect(byConfig['om+recall']!.retrieval).toEqual({ calls: measured(1), tokens: measured(12) })
    expect(byConfig['om+recall']!.recallAvailableToAssistant).toBe(true)
    expect(byConfig['om']!.recallAvailableToAssistant).toBe(false)
  })

  test('a failed compaction is recorded as a failed result, not thrown, and the other configurations still run', async () => {
    const results = await runComparison(scenario(), ['builtin', 'om'], (config) => fakeIo(config, config === 'om' ? { failCompactionAt: 2 } : {}))
    const [builtin, om] = results
    expect(builtin!.status).toBe('ok')
    expect(om!.status).toBe('failed')
    expect(om!.error).toBe('compaction 2 failed')
    expect(om!.compactions).toHaveLength(1) // the first compaction is still on record
  })

  test('a failed continuation is recorded as a failed result with the compactions already made kept on record', async () => {
    const [result] = await runComparison(scenario(), ['om+recall'], () => fakeIo('om+recall', { failContinuation: true }))
    expect(result!.status).toBe('failed')
    expect(result!.error).toBe('continuation failed')
    expect(result!.compactions).toHaveLength(2)
  })

  test('a run without a continueTask Io reports continuation and retrieval as unavailable, not zero', async () => {
    const [result] = await runComparison(scenario(), ['om+recall'], () => {
      const io = fakeIo('om+recall')
      io.continueTask = undefined
      return io
    })
    expect(result!.status).toBe('ok')
    expect(result!.continuation.latencyMs.status).toBe('unavailable')
    expect(result!.retrieval.calls.status).toBe('unavailable')
    expect(result!.retrieval.tokens.status).toBe('unavailable')
  })

  test('repeated runs get distinct run ids and the same configuration set each time', async () => {
    const results = await runComparison(scenario(), ['builtin', 'om'], (config) => fakeIo(config), { runs: 2 })
    expect(results).toHaveLength(4)
    expect(new Set(results.map((r) => r.runId)).size).toBe(4)
    expect(results.map((r) => r.configuration)).toEqual(['builtin', 'om', 'builtin', 'om'])
  })

  test('two invocations of runComparison get disjoint run ids; a caller-supplied invocationId makes them reproducible instead', async () => {
    const [a] = await runComparison(scenario(), ['om'], () => fakeIo('om'))
    const [b] = await runComparison(scenario(), ['om'], () => fakeIo('om'))
    expect(a!.runId).not.toBe(b!.runId)

    const [c] = await runComparison(scenario(), ['om'], () => fakeIo('om'), { invocationId: 'fixed' })
    const [d] = await runComparison(scenario(), ['om'], () => fakeIo('om'), { invocationId: 'fixed' })
    expect(c!.runId).toBe(d!.runId)
    expect(c!.invocationId).toBe('fixed')
  })

  test('a live run without explicit, positive caps is refused before anything runs', async () => {
    await expect(runComparison(scenario(), ['om'], () => fakeIo('om'), { live: true })).rejects.toThrow(/caps/)
    await expect(runComparison(scenario(), ['om'], () => fakeIo('om'), { live: true, caps: { maxRuns: 0, maxModelCalls: 1 } })).rejects.toThrow(/caps/)
  })

  test('an Io marked live is refused unless options.live is set, before anything runs', async () => {
    let called = false
    const liveIo: Io = { ...fakeIo('om'), live: true, compact: async (...args) => ((called = true), fakeIo('om').compact(...args)) }
    await expect(runComparison(scenario(), ['om'], () => liveIo)).rejects.toThrow(/live Io/)
    expect(called).toBe(false)
  })

  test('options.runs may not exceed caps.maxRuns for a live run', async () => {
    await expect(runComparison(scenario(), ['om'], () => ({ ...fakeIo('om'), live: true }), { live: true, caps: { maxRuns: 1, maxModelCalls: 10 }, runs: 2 })).rejects.toThrow(/maxRuns/)
  })

  test('a live run spends caps.maxModelCalls across compaction and continuation, failing the rest of the run once exhausted', async () => {
    const io: Io = { ...fakeIo('om'), live: true }
    const [result] = await runComparison(scenario(), ['om'], () => io, { live: true, caps: { maxRuns: 1, maxModelCalls: 1 } })
    expect(result!.status).toBe('failed')
    expect(result!.error).toMatch(/maxModelCalls/)
    expect(result!.compactions).toHaveLength(1) // the one call the cap allowed
  })

  test('configurations compared together must share the same assistant model', async () => {
    const io = (config: string, assistant?: string): Io => ({ ...fakeIo(config), model: { assistant } })
    await expect(runComparison(scenario(), ['builtin', 'om'], (config) => io(config, config === 'om' ? 'model-b' : 'model-a'))).rejects.toThrow(/assistant/)
  })

  test('fixtures and budgets supplied by the caller are carried onto every result, for reproducibility', async () => {
    const fixtures = [{ name: 'tests/fixtures/recall-chain.local.ts', available: false }]
    const [result] = await runComparison(scenario(), ['om'], () => ({ ...fakeIo('om'), budgets: { contextTokens: 190_000 } }), { fixtures })
    expect(result!.fixtures).toEqual(fixtures)
    expect(result!.budgets).toEqual({ contextTokens: 190_000 })
  })

  test('measurement helpers label measured, estimated and unavailable distinctly', () => {
    expect(measured(5)).toEqual({ status: 'measured', value: 5 })
    expect(estimated(5)).toEqual({ status: 'estimated', value: 5 })
    expect(unavailable('no host support').status).toBe('unavailable')
  })

  test("the om configuration drives the plugin's own compaction hook through $.session.compact, chaining its ledger; builtin never calls $", async ($: Engine, on: On) => {
    mock.clock(on)
    const { history } = world(on, 'eval-session-om')
    const seen = pi(on)
    let builtinCalls = 0
    // "builtin" stands for a session with no observational-memory plugin loaded: a plain function, never $.
    const builtinIo: Io = { now: () => Date.now(), model: {}, compact: async (point, messagesSoFar) => (builtinCalls++, { messages: [...messagesSoFar, ...point.append, msg('built-in summary')] }) }
    // The om `Io` keeps `history` (what `$.session.messages()` answers) in step with the messages it passes to
    // `$.session.compact`, as a real growing session would: only then does the hook take the persistent-ledger path
    // (`hooks/register.ts`'s `session.compact` handler) rather than falling back to observing the context on the spot.
    const omIo: Io = {
      now: () => Date.now(),
      model: { observer: 'gpt-5.6-luna' },
      compact: async (point, messagesSoFar) => {
        history.push(...point.append)
        const messages = history.map((m, i) => ({ ...m, handle: `h${i}` }))
        const r = await $.session.compact({ trigger: point.trigger, messages })
        return { messages: r.messages ?? [] } // the host's ModelUsage carries token counts, not cost; this test does not price them
      },
    }
    const s: Scenario = {
      id: 's2',
      compactionPoints: [
        { trigger: 'manual', append: turn('a', 'a', 40_000) },
        { trigger: 'auto', append: turn('b', 'b', 40_000) },
      ],
      continuationTask: { id: 't2', prompt: 'x' },
    }
    const [builtin, om] = await runComparison(s, ['builtin', 'om'], (c) => (usesObservationalCompaction(c) ? omIo : builtinIo))

    expect(builtinCalls).toBe(2)
    expect(seen.logs).not.toContain('the transcript changed under the observations; restarting the ledger from the memory message')
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([]) // both compactions took the persistent-ledger path
    // Chaining: no Observer prompt re-covers chunk `a` once it is on the ledger, whether background scheduling or
    // the second manual compaction reaches it first.
    // Chaining: the second compaction's own "observed N rows now" count is cumulative (up near the full, growing
    // 8-row history), not a restart back down to only the 4 rows chunk `b` added -- proof the first compaction's
    // watermark carried into the second rather than being recomputed from scratch.
    const observedCounts = seen.logs.filter((l) => l.startsWith('observed ')).map((l) => Number(l.match(/^observed (\d+) rows now/)?.[1]))
    expect(observedCounts).toHaveLength(2)
    expect(observedCounts[0]!).toBeLessThan(observedCounts[1]!)
    expect(observedCounts[1]!).toBeGreaterThan(4) // more than chunk `b` alone: `a`'s watermark rolled forward into it
    expect(builtin!.status).toBe('ok')
    expect(om!.status).toBe('ok')
    expect(om!.compactions[0]!.cost.status).toBe('unavailable') // pi's stub answer here reports no request cost
  })

  test('om and om+recall observe independently: each gets its own session, and its own ledger, from the other', async ($: Engine, on: On) => {
    mock.clock(on)
    let currentSessionId = ''
    const { stored, historyOf } = world(on, () => currentSessionId)
    const seen = pi(on)
    const omIo = (sessionId: string): Io => {
      const history = historyOf(sessionId)
      return {
        now: () => Date.now(),
        model: {},
        compact: async (point, messagesSoFar) => {
          currentSessionId = sessionId
          history.push(...point.append)
          const messages = history.map((m, i) => ({ ...m, handle: `h${i}` }))
          const r = await $.session.compact({ trigger: point.trigger, messages, agentId: undefined })
          return { messages: r.messages ?? [] }
        },
      }
    }
    const s: Scenario = { id: 's3', compactionPoints: [{ trigger: 'manual', append: turn('a', 'a', 40_000) }], continuationTask: { id: 't3', prompt: 'x' } }
    await runComparison(s, ['om', 'om+recall'], (config) => omIo(`eval-session-iso-${config}`))

    // Both configurations observed the same one-chunk history, each from its own session: neither found the
    // other's watermark, so neither restarted and neither skipped observing as already-covered.
    expect(seen.prompts).toHaveLength(2)
    expect(seen.logs.filter((l) => l.includes('restarting the ledger'))).toEqual([])
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    // Each configuration's ledger lives under its own session key in the store: neither could have read the other's.
    expect(stored['ledger:eval-session-iso-om']).toBeDefined()
    expect(stored['ledger:eval-session-iso-om+recall']).toBeDefined()
    expect(Object.keys(stored).filter((k) => k.startsWith('ledger:'))).toHaveLength(2)
  })

  test('recall availability reaches the assistant explicitly: continueTask sees recallAvailable, and calls om_recall only then', async ($: Engine, on: On) => {
    mock.clock(on)
    world(on, 'eval-session-recall')
    pi(on)
    on('tool.register', ($, e) => ({ value: { tool: `mcp__observational-memory__${e.name}` } }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })

    const io = (recallAvailableToTask: boolean): Io => ({
      now: () => Date.now(),
      model: {},
      compact: async (point, messagesSoFar) => ({ messages: [...messagesSoFar, ...point.append] }),
      continueTask: async (_task, { recallAvailable }) => {
        expect(recallAvailable).toBe(recallAvailableToTask)
        if (!recallAvailable) return {}
        const found = await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'anything' })
        return { recallCalls: 1, recallTokens: measured(String(found.result).length) }
      },
    })
    const s: Scenario = { id: 's4', compactionPoints: [{ trigger: 'manual', append: [msg('a')] }], continuationTask: { id: 't4', prompt: 'x' } }
    const [builtin, om] = await runComparison(s, ['builtin', 'om+recall'], (c) => io(recallAvailable(c)))

    expect(builtin!.retrieval).toEqual({ calls: measured(0), tokens: measured(0) })
    expect(om!.retrieval.calls).toEqual(measured(1))
    expect(om!.retrieval.tokens.status).toBe('measured')
  })
})

// One turn: the prompt, a Read call, its result of `size` characters, and the answer. Trimmed from
// tests/register.test.ts's own `turn`; used only by the tests above that drive the real compaction hook.
function turn(prompt: string, reply: string, size = 0): SessionMessage[] {
  return [
    { role: 'user', text: prompt, toolUses: [] },
    { role: 'assistant', text: reply, toolUses: [{ tool_use_id: `t-${prompt}`, tool: 'Read', input: { file_path: `/src/${prompt}.ts` } }] },
    { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: `t-${prompt}`, text: 'x'.repeat(size), isError: false }] },
    { role: 'assistant', text: `${reply} done`, toolUses: [] },
  ]
}

// The minimal host capabilities a manual $.session.compact (and, in one test, $.tool.call) need to succeed,
// trimmed from register.test.ts's own `world`: a session id, its store, and its file system (the plugin persists
// the ledger and stats through them).
function world(on: On, sessionId: string | (() => string)) {
  const resolve = () => (typeof sessionId === 'function' ? sessionId() : sessionId)
  on('session.id', () => ({ value: resolve() }))
  // One history per resolved session id, so two sessions sharing this `world` (as the isolation test's two
  // configurations do) each see only their own: `$.session.messages()` never crosses between them.
  const histories: Record<string, SessionMessage[]> = {}
  const history = (id: string) => (histories[id] ??= [])
  on('session.messages', () => ({ value: history(resolve()) }))
  const stored: Record<string, unknown> = {}
  on('store.keys', () => ({ value: Object.keys(stored) }))
  on('store.get', ($, e) => ({ value: stored[e.key] === undefined ? undefined : JSON.parse(JSON.stringify(stored[e.key])) }))
  on('store.set', ($, e) => ((stored[e.key] = JSON.parse(JSON.stringify(e.value))), { value: undefined }))
  on('store.delete', ($, e) => (delete stored[e.key], { value: undefined }))
  const files: Record<string, string> = {}
  mock.env(on, { OM_STATS_DIR: '/stats', HOME: '/home/u' })
  on('fs.read', ($, e) => {
    if (!(e.path in files)) throw new Error(`ENOENT: ${e.path}`)
    return { value: files[e.path]! }
  })
  on('fs.write', ($, e) => ((files[e.path] = e.text), { value: undefined }))
  on('fs.list', ($, e) => ({ value: Object.keys(files).filter((p) => p.startsWith(`${e.path}/`)).map((p) => ({ name: p.slice(e.path.length + 1), kind: 'file' as const, size: files[p]!.length, isLink: false })) }))
  on('fs.stat', ($, e) => {
    if (!(e.path in files)) throw new Error(`ENOENT: ${e.path}`)
    return { value: { kind: 'file' as const, size: files[e.path]!.length, mtimeMs: 0, isLink: false } }
  })
  on('fs.exists', ($, e) => ({ value: e.path in files || Object.keys(files).some((p) => p.startsWith(`${e.path}/`)) }))
  on('session.cwd', () => ({ value: '/work/project' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  return { history: history(resolve()), historyOf: history, stored }
}

// pi on the host, trimmed from register.test.ts's own `pi`: answers every chunk with one observation per user row, and
// git, which reads the environment at compaction, as outside a repository.
function pi(on: On) {
  const seen = { prompts: [] as string[], logs: [] as string[] }
  on('process.run', ($, e): { value: ProcessRunResult } => {
    if (e.argv[0] === 'git') return { value: { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository\n' } }
    const prompt = e.init?.stdin ?? ''
    seen.prompts.push(prompt)
    // One record_observations call that ends the run.
    const details = { observations: [...prompt.matchAll(/^\[User(?: @ ([\d-]+ [\d:]+))?\]: (\w+)$/gm)].map((m) => `🔴 ${m[1] ?? ''} Saw ${m[2]}`), corrections: [], done: true }
    const event = { role: 'assistant', content: [], api: 'openai-codex-responses', provider: 'openai-codex', model: 'gpt-5.6-luna', usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, reasoning: 0, totalTokens: 2, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: 'toolUse', timestamp: 0 }
    const stdout = [{ type: 'message_start', message: { ...event, content: [] } }, { type: 'message_end', message: event }, { type: 'tool_execution_end', toolName: 'record_observations', result: { details }, isError: false }, { type: 'turn_end', message: event, toolResults: [] }].map((e) => JSON.stringify(e)).join('\n')
    return { value: { exitCode: 0, stdout, stderr: '' } }
  })
  on('model.complete', () => ({ value: { isAnswered: false, reason: 'empty-reply', usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }))
  on('ui.log', ($, e) => ((e.to === 'debug' ? seen.logs : []).push(e.text), { value: undefined }))
  return seen
}
