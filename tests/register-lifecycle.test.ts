import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, Register, SessionCompactInput, SessionCompactResult, SessionMessage } from 'claude-code'
import { turn, COMPOSER, CHUNK, at, world, ember, live, gates, observationsIn, steps, call, agentCall, readsIn, readers, SUMMARY, USAGE } from './harness'
import type { Ledger } from './harness'
import { idleNote, TURN_END_NOTE } from '../hooks/prompts'

// Delegation, finished subagents and scheduling writes.
describe('register: lifecycle', () => {
  test('a compaction request with explicit instructions delegates to the built-in compactor unchanged, and a later compaction still finds the live context', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = ember(on)
    let received: SessionCompactInput | undefined
    on('session.compact', ($, e) => ((received = e), { messages: [SUMMARY, ...e.messages.slice(-2)] }))
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    await clock.set(at(23, 9, 0))
    history.push({ role: 'user', text: 'Read the files, then report.', toolUses: [] })
    await $.turn.start({ text: 'Read the files, then report.', turnId: 't' })
    history.push(...turn('a', 'a', CHUNK))

    const result = await $.session.compact({ trigger: 'manual', instructions: 'Focus on the auth bug only', messages: [...history] })

    expect(result.messages?.[0]).toEqual(SUMMARY)
    expect(received?.instructions).toBe('Focus on the auth bug only') // forwarded unchanged
    expect(received?.messages).toEqual(history)
    expect(seen.prompts).toEqual([]) // no Observer call: nothing observed
    expect(seen.modelCalls).toBe(0)
    expect(seen.screen).toEqual(['Compaction instructions given. Using built-in compaction'])

    // Ordinary compaction remains available without explicit instructions, and stays persistent across the delegated one.
    history.splice(0, history.length, ...result.messages!)
    history.push(...turn('b', 'b', CHUNK))
    const second = await $.session.compact({ trigger: 'auto', messages: [...history] })
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    expect(observationsIn(second.messages?.[0]?.text)).toContain('User: "b"')
  })

  test('stats: the first main request after a compaction counts what the prompt cache served of it, by compactor', async ($, on) => {
    const clock = mock.clock(on)
    const { history, files } = world(on)
    ember(on)
    on('session.compact', ($, e) => ({ messages: [SUMMARY, ...e.messages.slice(-2)] }))
    let cache = { cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
    on('turn.step', async function* ($, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: { ...USAGE, ...cache, model: 'claude' } }
    })
    const step = async (index: number, agentId?: string) => {
      for await (const _ of $.turn.step({ turnId: 't', index, model: 'claude', messageCount: history.length, ...(agentId ? { agentId } : {}) }));
      await clock.settle()
    }
    await clock.set(at(23, 9, 0))
    history.push(...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...turn('tail', 'r', 8_000))

    const om = await $.session.compact({ trigger: 'auto', messages: [...history] })
    history.splice(0, history.length, ...om.messages!)
    cache = { cache_read_input_tokens: 0, cache_creation_input_tokens: 9_000 }
    await step(0, 'agent-1') // a subagent's request carries none of the main context
    cache = { cache_read_input_tokens: 18_000, cache_creation_input_tokens: 30_000 }
    await step(1)
    cache = { cache_read_input_tokens: 48_000, cache_creation_input_tokens: 100 }
    await step(2) // past the first request: no longer the compaction's cost
    await $.session.compact({ trigger: 'manual', instructions: 'Keep the auth bug', messages: [...history] })
    cache = { cache_read_input_tokens: 0, cache_creation_input_tokens: 60_000 }
    await step(3)
    await clock.advance(5_000)

    const file = JSON.parse(files['/stats/session-1.json']!) as { metrics: Record<string, { count: number; sum: number }> }
    expect(file.metrics['afterCompaction.om.cacheReadTokens']).toMatchObject({ count: 1, sum: 18_000 })
    expect(file.metrics['afterCompaction.om.cacheWriteTokens']).toMatchObject({ count: 1, sum: 30_000 })
    expect(file.metrics['afterCompaction.builtin.cacheWriteTokens']).toMatchObject({ count: 1, sum: 60_000 })
  })

  test('a compaction request with blank instructions is treated as ordinary compaction, not delegated', async ($, on) => {
    mock.clock(on)
    world(on)
    const seen = ember(on)
    let builtinCalls = 0
    on('session.compact', () => (builtinCalls++, { messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))

    await $.session.compact({ trigger: 'manual', instructions: '   ', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...turn('c', 'c', 8_000)] })

    expect(builtinCalls).toBe(0)
    expect(seen.prompts).toHaveLength(2)
  })

  test("a finished subagent's keys are dropped, its calls in flight are stopped, and session end sweeps any left", async ($, on) => {
    const clock = mock.clock(on)
    const { history, agents, stored } = world(on)
    const { gate, open } = gates()
    const seen = ember(on, { hold: (n) => (n === 1 ? undefined : gate(n)), reply: readsIn })
    const step = steps(on)
    const runTurn = live(on, clock, history)
    await runTurn($, [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)], at(23, 9, 0))
    await clock.settle()
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 10; n++) {
      await clock.set(at(23, 10, 0) + n * 1_500) // the held calls stay within their timeout
      agents['agent-1'].push(...agentCall('one', n, 16_000))
      await step($, 's', n, agents['agent-1'].length, 'agent-1')
      await clock.settle()
    }
    expect(stored['ledger:session-1/agent-1']).toBeDefined()
    const held = seen.inFlight
    expect(held).toBeGreaterThan(0)

    await $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    await clock.settle()
    expect([seen.inFlight, seen.stopped]).toEqual([0, held]) // killed with their loop, not left to run
    expect(Object.keys(stored).filter((k) => k.includes('/'))).toEqual([])
    for (let n = 2; n <= 10; n++) open(n)
    await clock.settle()

    expect(Object.keys(stored).filter((k) => k.includes('/'))).toEqual([])
    expect(seen.logs).toContainEqual(expect.stringMatching(/^background observation of rows \d+-\d+ stopped: /))
    expect(seen.logs).not.toContainEqual(expect.stringMatching(/will be retried$/))
    expect((stored['ledger:session-1'] as Ledger).entries.length).toBeGreaterThan(0) // the main conversation's stays

    // A subagent that never finished (killed, or the process died) leaves keys the session's end sweeps.
    stored['ledger:session-1/agent-7'] = { entries: [] }
    stored['times:session-1/agent-7'] = []
    stored['ledger:session-2/agent-7'] = { entries: [] }
    await $.session.end({ reason: 'other', sessionId: 'session-1', resume: { id: 'session-1' } })
    expect(Object.keys(stored).sort()).toEqual(['ledger:session-1', 'ledger:session-2/agent-7', 'times:session-1', 'turns:session-1'])
  })

  test('a scheduling pass waiting on its ledger read when its subagent finishes writes nothing and starts no Observer call', async ($, on) => {
    const clock = mock.clock(on)
    const { gate, open } = gates()
    const { agents, stored } = world(on, { holdGet: (key) => (key === 'ledger:session-1/agent-1' ? gate(1) : undefined) })
    const seen = ember(on, { reply: readsIn })
    const step = steps(on)
    on('turn.complete', () => ({ text: '' }))
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 6; n++) agents['agent-1'].push(...agentCall('one', n, 16_000))

    await step($, 's', 0, agents['agent-1'].length, 'agent-1')
    await clock.settle() // past the step's check that the subagent runs, its pass waits on the ledger
    const finished = $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    await clock.settle()
    open(1)
    await finished
    await clock.settle()

    expect(Object.keys(stored).filter((k) => k.includes('agent-1'))).toEqual([])
    expect(seen.prompts).toEqual([])
  })

  test("subagents never take the main loop's own slots; a finished subagent's calls are stopped, and their slots go to a waiting sibling", async ($, on) => {
    const clock = mock.clock(on)
    const { history, agents, stored } = world(on)
    const { gate, open } = gates()
    const seen = ember(on, { hold: (n) => gate(n), reply: readsIn })
    const step = steps(on)
    const runTurn = live(on, clock, history)
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 24; n++) agents['agent-1'].push(...agentCall('one', n, 16_000))
    agents['agent-2'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 7; n++) agents['agent-2'].push(...agentCall('two', n, 16_000))
    await clock.set(at(23, 9, 0))
    await step($, 's', 0, agents['agent-1'].length, 'agent-1')
    await clock.settle()
    expect(seen.inFlight).toBe(6) // all but the main loop's two
    await runTurn($, [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)], at(23, 9, 0), 10_000) // main gets a slot of its own; the held calls stay within their timeout
    await step($, 's2', 0, agents['agent-2'].length, 'agent-2') // the sibling waits on the subagents' slots
    await clock.settle()
    expect(seen.prompts).toHaveLength(7)
    expect(seen.prompts[6]).toContain(']: a\n') // main's chunk

    await $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    await clock.settle()
    expect(seen.stopped).toBe(6)
    expect(seen.prompts.length).toBeGreaterThan(7) // the freed slots went to the sibling waiting on them
    for (let n = 7; n <= seen.prompts.length; n++) open(n)
    await clock.settle()
    await runTurn($, turn('c', 'c', 8_000), at(23, 9, 1))
    await clock.settle()
    for (let n = 7; n <= seen.prompts.length; n++) open(n)
    await clock.settle()

    expect(seen.maxInFlight).toBeLessThanOrEqual(8)
    expect(seen.prompts.slice(6).some((p) => readers(p).has('one'))).toBe(false) // the rest read main's rows and the sibling's
    expect((stored['ledger:session-1'] as Ledger).entries.length).toBeGreaterThan(0)
    expect((stored['ledger:session-1/agent-2'] as Ledger).entries.length).toBeGreaterThan(0)
    expect(Object.keys(stored).filter((k) => k.includes('agent-1'))).toEqual([])
  })

  test('a step whose subagent finishes while the step checks that it runs records nothing and starts no Observer call', async ($, on) => {
    const clock = mock.clock(on)
    const { gate, open } = gates()
    let lists = 0
    const { agents, stored } = world(on, { holdList: () => (++lists === 1 ? gate(1) : undefined) })
    const seen = ember(on, { reply: readsIn })
    const step = steps(on)
    on('turn.complete', () => ({ text: '' }))
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 6; n++) agents['agent-1'].push(...agentCall('one', n, 16_000))

    await step($, 's', 0, agents['agent-1'].length, 'agent-1')
    await clock.settle() // the step's listing of agents, read while the subagent ran, is held
    await $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    open(1)
    await clock.settle()

    expect(Object.keys(stored).filter((k) => k.includes('agent-1'))).toEqual([])
    expect(seen.prompts).toEqual([])
  })

  test("an Observer call's landing, its ledger read held when its subagent finishes, is discarded", async ($, on) => {
    const clock = mock.clock(on)
    const { gate, open } = gates()
    let observed = false // the Observer has answered: the next read of the ledger is the landing's
    let held = false
    const { agents, stored } = world(on, {
      holdGet: (key) => (key === 'ledger:session-1/agent-1' && observed && !held ? ((held = true), gate(1)) : undefined),
    })
    const seen = ember(on, { reply: (prompt) => ((observed = true), readsIn(prompt)) })
    const step = steps(on)
    on('turn.complete', () => ({ text: '' }))
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 6; n++) agents['agent-1'].push(...agentCall('one', n, 16_000))

    await step($, 's', 0, agents['agent-1'].length, 'agent-1')
    await clock.settle()
    expect(held).toBe(true)
    const finished = $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    await clock.settle()
    open(1)
    await finished
    await clock.settle()

    expect(Object.keys(stored).filter((k) => k.includes('agent-1'))).toEqual([])
    expect(seen.logs).toContain('a background chunk landed after its loop ended; discarded')
    expect(seen.logs.filter((l) => l.startsWith('Observed'))).toEqual([])
  })

  test("a subagent's compaction whose session ends before its Observer calls makes none and is skipped", async ($, on) => {
    const clock = mock.clock(on)
    const { gate, open } = gates()
    const { agents, stored } = world(on, { holdGet: (key) => (key === 'ledger:session-1/agent-1' ? gate(1) : undefined) })
    const seen = ember(on, { reply: readsIn })
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))
    const rows: SessionMessage[] = (agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }])
    for (let n = 0; n < 10; n++) rows.push(...agentCall('one', n, 16_000))

    const compacting = $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: [...rows] })
    await clock.settle() // its ledger read is held
    const ending = $.session.end({ reason: 'other', sessionId: 'session-1', resume: { id: 'session-1' } })
    await clock.settle()
    open(1)
    const result = await compacting
    await ending
    await clock.settle()

    expect(result.skip).toBe('observational-memory: its loop ended')
    expect(seen.prompts).toEqual([])
    expect(seen.logs).toContain('a compaction outlived its loop; skipped')
    expect(Object.keys(stored).filter((k) => k.includes('agent-1'))).toEqual([])
  })

  test("a subagent's compaction that outlives its session's end writes nothing back", async ($, on) => {
    const clock = mock.clock(on)
    const { agents, stored } = world(on)
    const { gate, open } = gates()
    const seen = ember(on, { hold: (n) => gate(n), reply: readsIn })
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))
    const rows: SessionMessage[] = (agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }])
    for (let n = 0; n < 10; n++) rows.push(...agentCall('one', n, 16_000))

    const compacting = $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: [...rows] })
    await clock.settle()
    expect(seen.inFlight).toBeGreaterThan(0) // observing on the spot
    await $.session.end({ reason: 'other', sessionId: 'session-1', resume: { id: 'session-1' } })
    for (let n = 1; n <= seen.prompts.length; n++) open(n)
    await compacting
    await clock.settle()

    expect(Object.keys(stored).filter((k) => k.includes('agent-1'))).toEqual([])
  })

  test("a teammate's turn.complete is one of many: its keys stay, and a pass runs as main's does", async ($, on) => {
    const clock = mock.clock(on)
    const { agents, stored } = world(on, { teammates: ['mate-1'] })
    const seen = ember(on, { reply: readsIn })
    on('turn.complete', () => ({ text: '' }))
    agents['mate-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 7; n++) agents['mate-1'].push(...agentCall('one', n, 16_000))

    await $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 'm', reason: 'answer', agentId: 'mate-1' })
    await clock.settle()

    expect(seen.prompts).toHaveLength(1)
    expect(Object.keys(stored).sort()).toEqual(['ledger:session-1/mate-1', 'times:session-1/mate-1'])
  })

  test("the steps' times and the turn's start are held and written together a moment later, at once at the turn's end, and a prune by another process stays done", async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored, writes } = world(on)
    ember(on)
    const step = steps(on)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))
    const times = () => (stored['times:session-1'] as { i: number; at: number }[]).map((k) => [k.i, k.at])
    await clock.set(at(23, 9, 0))
    history.push({ role: 'user', text: 'brief', toolUses: [] })
    await $.turn.start({ text: 'brief', turnId: 't' })
    for (let n = 0; n < 3; n++) {
      history.push(...call(n, 100))
      await step($, 't', n, history.length)
      await clock.settle()
    }
    expect(writes.filter((k) => k.startsWith('times:') || k.startsWith('turns:'))).toEqual([])

    await clock.advance(2_000)
    expect(writes.filter((k) => k.startsWith('times:') || k.startsWith('turns:')).sort()).toEqual(['times:session-1', 'turns:session-1'])
    expect(times()).toEqual([0, 2, 4, 6].map((i) => [i, at(23, 9, 0)]))
    expect(stored['turns:session-1']).toEqual([at(23, 9, 0)])

    history.push({ role: 'assistant', text: 'done', toolUses: [] })
    await $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 't', reason: 'answer' })
    expect(times().map(([i]) => i)).toEqual([0, 2, 4, 6, 7])

    // Another process's prune deleted the session's keys: what they held is not written back, only what came since.
    delete stored['times:session-1']
    delete stored['turns:session-1']
    await clock.set(at(23, 9, 5))
    history.push({ role: 'user', text: 'next', toolUses: [] })
    await $.turn.start({ text: 'next', turnId: 't2' })
    await clock.advance(2_000)
    expect(times()).toEqual([[8, at(23, 9, 5)]])
    expect(stored['turns:session-1']).toEqual([at(23, 9, 5)])
  })

  test('a scheduling pass that changes nothing in the ledger does not write it again', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored, writes } = world(on)
    ember(on)
    const runTurn = live(on, clock, history)
    await runTurn($, [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)], at(23, 9, 0))
    await clock.settle()
    const ledger = stored['ledger:session-1'] as Ledger
    expect(ledger.entries.length).toBeGreaterThan(0)

    writes.length = 0
    await runTurn($, turn('c', 'c'), at(23, 9, 5))
    await clock.settle()
    expect(writes).not.toContain('ledger:session-1')
    expect(stored['ledger:session-1']).toEqual(ledger)
  })

  test("a turn's end records the transcript path only when it changed", async ($, on) => {
    const { stored, writes } = world(on)
    on('classic.Stop', () => ({}))
    const stop = (path: string) => $.classic.Stop({ session_id: 'session-1', transcript_path: path, stop_hook_active: false })
    await stop('/t/session-1.jsonl')
    await stop('/t/session-1.jsonl')
    expect(writes.filter((k) => k.startsWith('transcript:'))).toEqual(['transcript:session-1'])
    await stop('/t/other.jsonl')
    expect(writes.filter((k) => k.startsWith('transcript:'))).toEqual(['transcript:session-1', 'transcript:session-1'])
    expect(stored['transcript:session-1']).toBe('/t/other.jsonl')
  })
})

// The main conversation's own compaction between turns, once a turn ends past the soft threshold (issue #31). The
// plugin runs `/compact`; the engine raises the compaction under it as `manual`, which the tests' `command.run` hook
// stands in for.
describe('register: compaction at a turn end', () => {
  // Above the plugin: vetoes every `/compact` compaction, as another plugin may.
  const vetoes = { name: 'vetoes', tier: 'prepend' as const, register: ((on) => {
    on('session.compact', ($, e, next) => (e.trigger === 'manual' ? { skip: 'not now' } : next(e)))
  }) satisfies Register }

  // A live main conversation whose turns each make one request over `tokens` of context before they end; a turn
  // given `agentId` is that subagent's. The engine's auto-compaction point is its 235k window. `/compact` raises the
  // compaction over the history, its result in `compactions`; with `rejects`, it is refused, counted in `refused`.
  function session($: Engine, on: On, rejects = false) {
    const clock = mock.clock(on)
    const w = world(on)
    const seen = ember(on)
    const compactions: SessionCompactResult[] = []
    let refused = 0
    let context = 0
    on('session.usage', () => ({ value: { context: { window: 235_000 }, rateLimits: [] } }) as never)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))
    on('turn.step', async function* ($, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: { ...USAGE, cache_read_input_tokens: context, model: 'claude' } }
    })
    // The test's `$`, as the engine raises it, not the hook's.
    on('command.run', { command: 'compact' }, async () => {
      if (rejects) throw (refused++, new Error('a turn is running'))
      compactions.push(await $.session.compact({ trigger: 'manual', messages: [...w.history] }))
      return {}
    })
    const runTurn = async (rows: SessionMessage[], tokens: number, startAt: number, agentId?: string) => {
      const turnId = `turn-${w.history.length}`
      await clock.set(startAt)
      if (agentId === undefined) {
        w.history.push(rows[0]!)
        await $.turn.start({ text: rows[0]!.text, turnId })
        w.history.push(...rows.slice(1))
      } else w.agents[agentId] = rows
      context = tokens
      for await (const _ of $.turn.step({ turnId, index: 0, model: 'claude', messageCount: rows.length, ...(agentId ? { agentId } : {}) }));
      await clock.advance(60_000)
      await $.turn.complete({ answer: '', durationMs: 60_000, isAborted: false, turnId, reason: 'answer', ...(agentId ? { agentId } : {}) })
      await clock.settle()
    }
    return { clock, ...w, seen, compactions, refused: () => refused, runTurn }
  }
  const metrics = (files: Record<string, string>) => (JSON.parse(files['/stats/session-1.json']!) as { metrics: Record<string, { count: number }> }).metrics

  test("a main turn that ends past 157k compacts, observing as an auto one does without the resume-directly wording, counted apart; one under it does not", async ($, on) => {
    const { clock, files, seen, compactions, runTurn } = session($, on)
    await runTurn(turn('a', 'a', 36_000), 150_000, at(23, 9, 0))
    expect(compactions).toEqual([])

    await runTurn(turn('b', 'b', 28_000), 160_000, at(23, 9, 5))

    // Less than a chunk before the raw tail: the person's `/compact` briefs it by code (the next test); this one
    // observes it on the spot.
    expect(compactions).toHaveLength(1)
    expect(seen.prompts).toHaveLength(1)
    const text = compactions[0]!.messages?.[0]?.text ?? ''
    expect(observationsIn(text)).toBe('* 🟡 2026-09-23 09:00 User: "a" (source 2026-09-23 09:00 to 2026-09-23 09:01)')
    expect(text).not.toContain('Resume directly')
    // The memory's header says this plugin ran the /compact, not the person.
    expect(text).toContain(`save space.\n${TURN_END_NOTE}\n\n<memory-guide>`)
    expect(seen.logs).toContain('the turn-end compaction installed')
    await clock.advance(5_000)
    expect(metrics(files)['compaction.turnEnd.ms']!.count).toBe(1)
    expect(metrics(files)['compaction.manual.ms']).toBeUndefined()
    expect((await $.command.run({ command: 'om-stats', args: '', ...COMPOSER })).text).toContain("1 main (1 at a turn's end)")
  })

  test("the person's /compact and another plugin's compaction keep their handling: less than a chunk unobserved is briefed by code", async ($, on) => {
    const { clock, files, history, seen, runTurn } = session($, on)
    await runTurn(turn('a', 'a', 36_000), 150_000, at(23, 9, 0))
    await runTurn(turn('b', 'b', 28_000), 150_000, at(23, 9, 5))

    const manual = await $.session.compact({ trigger: 'manual', messages: [...history] })
    history.push(...turn('c', 'c', 100))
    const plugin = await $.session.compact({ trigger: 'plugin', messages: [...history] })

    expect(seen.prompts).toEqual([])
    for (const r of [manual, plugin]) expect(r.messages?.[0]?.text).not.toContain('Resume directly')
    for (const r of [manual, plugin]) expect(r.messages?.[0]?.text).not.toContain(TURN_END_NOTE)
    expect(seen.logs.filter((l) => l.endsWith('in a brief compiled by code (too little to observe yet)'))).toHaveLength(2)
    await clock.advance(5_000)
    expect(metrics(files)['compaction.manual.ms']!.count).toBe(1)
    expect(metrics(files)['compaction.plugin.ms']!.count).toBe(1)
    expect(metrics(files)['compaction.turnEnd.ms']).toBeUndefined()
  })

  test("a subagent's turn end never compacts, however large the main conversation's context", async ($, on) => {
    const { compactions, runTurn } = session($, on)
    await runTurn(turn('a', 'a', 16_000), 150_000, at(23, 9, 0))
    await runTurn(turn('brief', 'r', 100), 170_000, at(23, 9, 5), 'agent-1')
    expect(compactions).toEqual([])
  })

  test('a turn-end compaction another plugin vetoes is logged and nothing else happens; the next turn end tries again', { plugins: [vetoes] }, async ($, on) => {
    const { seen, compactions, runTurn } = session($, on)
    await runTurn(turn('a', 'a', 16_000), 160_000, at(23, 9, 0))
    expect(compactions).toEqual([{ skip: 'not now' }])
    expect(seen.logs).toContain('the turn-end compaction did not install; a later turn end tries again')
    expect(seen.screen).toEqual([])

    await runTurn(turn('b', 'b', 16_000), 161_000, at(23, 9, 5))
    expect(compactions).toHaveLength(2)
  })

  test('a turn-end /compact the engine rejects is logged, and the next turn end tries again', async ($, on) => {
    const { seen, refused, runTurn } = session($, on, true)
    await runTurn(turn('a', 'a', 16_000), 160_000, at(23, 9, 0))
    expect(seen.logs.filter((l) => l.startsWith('the turn-end compaction was not run ('))).toHaveLength(1)
    expect(seen.screen).toEqual([])
    await runTurn(turn('b', 'b', 16_000), 161_000, at(23, 9, 5))
    expect(refused()).toBe(2)
  })
})

// The main conversation's own compaction once it has had no request for an hour, when its prompt cache has expired
// and compacting removes enough. A timer, re-armed as each main turn ends; `/compact` is raised as at a turn's end.
describe('register: compaction after an idle hour', () => {
  const vetoes = { name: 'vetoes', tier: 'prepend' as const, register: ((on) => {
    on('session.compact', ($, e, next) => (e.trigger === 'manual' ? { skip: 'not now' } : next(e)))
  }) satisfies Register }
  const HOUR = 60 * 60_000
  // The test's `on` for the clock, with `$.clock.every` refused: the workers band's tick, which an interactive start
  // begins, would otherwise resolve a wait every frame of the hours these tests advance.
  const noTicks = (on: On) =>
    ((event: string, ...rest: unknown[]) =>
      event === 'clock.every'
        ? on('clock.every', () => {
            throw new Error('no workers band in these tests')
          })
        : (on as unknown as (event: string, ...rest: unknown[]) => unknown)(event, ...rest)) as unknown as On

  // As the turn-end tests' session, with `autoCompact` false for a session whose auto-compaction is off. `start`
  // raises session.start, interactive unless told; `end` ends the session as a restart would, keeping its store.
  function session($: Engine, on: On, autoCompact = true) {
    const clock = mock.clock(noTicks(on))
    const w = world(on)
    const seen = ember(on)
    const compactions: SessionCompactResult[] = []
    let context = 0
    on('session.usage', () => ({ value: { context: { window: 235_000, ...(autoCompact ? {} : { breakdown: { isAutoCompactEnabled: false } }) }, rateLimits: [] } }) as never)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))
    on('turn.step', async function* ($, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: { ...USAGE, cache_read_input_tokens: context, model: 'claude' } }
    })
    on('tool.register', ($, e) => ({ value: { tool: `mcp__observational-memory__${e.name}` } }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))
    on('command.run', { command: 'compact' }, async () => {
      compactions.push(await $.session.compact({ trigger: 'manual', messages: [...w.history] }))
      return {}
    })
    // A turn's prompt at `startAt`, one request over `tokens` of context, and its end a minute later; with `open`, the
    // turn is left running after its request.
    const runTurn = async (rows: SessionMessage[], tokens: number, startAt: number, options: { agentId?: string; open?: boolean } = {}) => {
      const { agentId } = options
      const turnId = `turn-${w.history.length}`
      await clock.set(startAt)
      if (agentId === undefined) {
        w.history.push(rows[0]!)
        await $.turn.start({ text: rows[0]!.text, turnId })
        w.history.push(...rows.slice(1))
      } else w.agents[agentId] = rows
      context = tokens
      for await (const _ of $.turn.step({ turnId, index: 0, model: 'claude', messageCount: rows.length, ...(agentId ? { agentId } : {}) }));
      await clock.advance(60_000)
      if (options.open) return clock.settle().then(() => turnId)
      await $.turn.complete({ answer: '', durationMs: 60_000, isAborted: false, turnId, reason: 'answer', ...(agentId ? { agentId } : {}) })
      await clock.settle()
      return turnId
    }
    const start = async (isInteractive = true) => {
      await $.session.start({ cwd: '/work/project', surface: null, isInteractive })
      await clock.settle()
    }
    const end = () => $.session.end({ reason: 'other', sessionId: 'session-1', resume: { id: 'session-1' } })
    return { clock, ...w, seen, compactions, runTurn, start, end }
  }
  const metrics = (files: Record<string, string>) => (JSON.parse(files['/stats/session-1.json']!) as { metrics: Record<string, { count: number }> }).metrics

  test('an hour after the last main request, a context past 85k with no compaction yet compacts once, says why on screen and in the memory, and counts apart', async ($, on) => {
    const { clock, files, seen, compactions, runTurn } = session($, on)
    await runTurn(turn('a', 'a', 16_000), 100_000, at(23, 9, 0))
    await clock.advance(HOUR - 1_000)
    expect(compactions).toEqual([])

    await clock.advance(1_000)

    expect(compactions).toHaveLength(1)
    expect(seen.screen).toEqual(['Compacting after 1h 0m idle: the prompt cache has expired, so the next request rewrites the context anyway'])
    const text = compactions[0]!.messages?.[0]?.text ?? ''
    // The user's next prompt follows the memory: the model answers it, and is not told to resume on its own.
    expect(text).toContain(`save space.\n${idleNote('1h 0m')}\n\n<memory-guide>`)
    expect(text).toContain("Answer the user's next message; do not resume earlier work it does not ask for.")
    expect(text).not.toContain('Resume directly')
    expect(seen.logs).toContain('the idle compaction installed')
    await clock.advance(5 * HOUR)
    expect(compactions).toHaveLength(1)
    expect(metrics(files)['compaction.idle.ms']!.count).toBe(1)
    expect(metrics(files)['compaction.manual.ms']).toBeUndefined()
    expect((await $.command.run({ command: 'om-stats', args: '', ...COMPOSER })).text).toContain('1 main (1 after an idle hour)')
  })

  test('the size margin: 85k before any compaction, then 20k over the first request after the last one', async ($, on) => {
    const { clock, compactions, runTurn } = session($, on)
    await runTurn(turn('a', 'a', 16_000), 80_000, at(23, 9, 0))
    await clock.advance(2 * HOUR)
    expect(compactions).toEqual([])

    await runTurn(turn('b', 'b', 16_000), 90_000, at(23, 12, 0))
    await clock.advance(HOUR)
    expect(compactions).toHaveLength(1)

    // The first request after it measures 60k: 75k is under the margin, 81k past it.
    await runTurn(turn('c', 'c', 100), 60_000, at(23, 14, 0))
    await runTurn(turn('d', 'd', 100), 75_000, at(23, 14, 5))
    await clock.advance(2 * HOUR)
    expect(compactions).toHaveLength(1)
    await runTurn(turn('e', 'e', 100), 81_000, at(23, 17, 0))
    await clock.advance(HOUR)
    expect(compactions).toHaveLength(2)
  })

  test('a turn starting clears the timer and a running turn is never idle, however long; its end starts the hour again', async ($, on) => {
    const { clock, compactions, runTurn } = session($, on)
    await runTurn(turn('a', 'a', 16_000), 100_000, at(23, 9, 0))
    const running = await runTurn(turn('b', 'b', 100), 100_000, at(23, 9, 30), { open: true })
    await clock.advance(3 * HOUR)
    expect(compactions).toEqual([])

    await $.turn.complete({ answer: '', durationMs: 3 * HOUR, isAborted: false, turnId: running, reason: 'answer' })
    await clock.settle()
    await clock.advance(HOUR)
    expect(compactions).toHaveLength(1)
  })

  test("a subagent's turns arm nothing, however large their context", async ($, on) => {
    const { clock, compactions, runTurn } = session($, on)
    await runTurn(turn('brief', 'r', 100), 170_000, at(23, 9, 0), { agentId: 'agent-1' })
    await clock.advance(3 * HOUR)
    expect(compactions).toEqual([])
  })

  test('with auto-compaction off it does not compact', async ($, on) => {
    const { clock, seen, compactions, runTurn } = session($, on, false)
    await runTurn(turn('a', 'a', 16_000), 100_000, at(23, 9, 0))
    await clock.advance(2 * HOUR)
    expect(compactions).toEqual([])
    expect(seen.logs).toContain('idle, but auto-compaction is off: not compacting')
  })

  test('one try per idle period: a vetoed one is not tried again, by the timer or a session start, until a turn has run', { plugins: [vetoes] }, async ($, on) => {
    const { clock, seen, compactions, runTurn, start } = session($, on)
    await runTurn(turn('a', 'a', 16_000), 100_000, at(23, 9, 0))
    await clock.advance(HOUR)
    expect(compactions).toEqual([{ skip: 'not now' }])
    expect(seen.logs).toContain('the idle compaction did not install')

    await clock.advance(5 * HOUR)
    expect(compactions).toHaveLength(1)

    await runTurn(turn('b', 'b', 100), 100_000, at(23, 16, 0))
    await clock.advance(HOUR)
    expect(compactions).toHaveLength(2)
    await clock.advance(5 * HOUR)
    await start()
    expect(compactions).toHaveLength(2)
  })

  test('a resumed session reads the idle hour from the store: past it, it compacts at the start; under it, it waits out the rest; a -p run does not', async ($, on) => {
    const { clock, compactions, runTurn, start, end } = session($, on)
    await runTurn(turn('a', 'a', 16_000), 100_000, at(23, 9, 0))
    await end()
    await clock.set(at(23, 9, 31))
    await start()
    await clock.advance(HOUR / 2 - 60_000)
    expect(compactions).toEqual([])
    await clock.advance(60_000)
    expect(compactions).toHaveLength(1)

    await runTurn(turn('b', 'b', 100), 60_000, at(23, 11, 0)) // the first request after it
    await runTurn(turn('c', 'c', 16_000), 100_000, at(23, 11, 5))
    await end()
    await clock.set(at(23, 18, 0))
    await start(false)
    expect(compactions).toHaveLength(1)
    await start()
    expect(compactions).toHaveLength(2)
  })
})
