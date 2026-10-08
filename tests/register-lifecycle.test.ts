import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionCompactInput, SessionMessage } from 'claude-code'
import { turn, CHUNK, at, world, pi, nearTarget, live, gates, observationsIn, steps, call, agentCall, readsIn, readers, SUMMARY, USAGE } from './harness'
import type { Ledger } from './harness'

// Delegation, finished subagents and scheduling writes.
describe('register: lifecycle', () => {
  test('a compaction request with explicit instructions delegates to the built-in compactor unchanged, and a later compaction still finds the live context', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = pi(on)
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
    pi(on)
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
    const seen = pi(on)
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
    const seen = pi(on, { hold: (n) => (n === 1 ? undefined : gate(n)), reply: readsIn })
    const step = steps(on)
    const runTurn = live(on, clock, history)
    await runTurn($, [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)], at(23, 9, 0))
    await clock.settle()
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 10; n++) {
      await clock.set(at(23, 10, 0) + n * 10_000) // the held calls stay within their timeout
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
    const seen = pi(on, { reply: readsIn })
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

  test("a reflection whose ledger read is held when its subagent finishes writes nothing back", async ($, on) => {
    const clock = mock.clock(on)
    const { gate, open } = gates()
    let reflected = false // the reflector has answered: the next read of the ledger is the reflection's commit
    let held = false
    const { agents, stored } = world(on, {
      holdGet: (key) => (key === 'ledger:session-1/agent-1' && reflected && !held ? ((held = true), gate(1)) : undefined),
    })
    const big = `<observations>\n${'* 🟡 2026-09-23 10:00 read a file with a long name\n'.repeat(4_000)}</observations>`
    const seen = pi(on, { reply: () => big, reflect: (n, prompt) => ((reflected = true), nearTarget(prompt, '* 🟡 2026-09-23 10:00 Condensed')) })
    const step = steps(on)
    on('turn.complete', () => ({ text: '' }))
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 4; n++) agents['agent-1'].push(...agentCall('one', n, 16_000))

    await clock.set(at(23, 10, 0))
    await step($, 's', 0, agents['agent-1'].length, 'agent-1')
    await clock.settle()
    expect(held).toBe(true)
    const calls = seen.prompts.length
    const finished = $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    await clock.settle()
    open(1)
    await finished
    await clock.settle()

    expect(Object.keys(stored).filter((k) => k.includes('agent-1'))).toEqual([])
    expect(seen.prompts).toHaveLength(calls)
    expect(seen.logs).toContain('a reflection outlived its loop; discarded')
  })

  test('/clear while the reflector runs: no further compression level is tried and the cleared ledger stays gone', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const { gate, open } = gates()
    const big = `<observations>\n${'* 🟡 2026-09-22 14:30 read a file with a long name\n'.repeat(4_000)}</observations>`
    const seen = pi(on, { hold: (n, prompt) => (prompt.startsWith('## OBSERVATIONS') ? gate(n) : undefined), reply: () => big, reflect: () => big })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await clock.settle()
    const reflectAt = seen.prompts.findIndex((p) => p.startsWith('## OBSERVATIONS')) + 1
    expect(reflectAt).toBeGreaterThan(0)
    await $.session.end({ reason: 'clear', sessionId: 'session-1', resume: { id: 'session-1' } })
    open(reflectAt)
    await clock.settle()

    expect(seen.prompts).toHaveLength(reflectAt) // level 1 answered over its target: no level 2
    expect(stored['ledger:session-1']).toBeUndefined()
    expect(seen.logs).toContain('a reflection outlived its loop; discarded')
  })

  test("a finished subagent's calls are stopped, and their slots go to a waiting main loop and sibling subagent", async ($, on) => {
    const clock = mock.clock(on)
    const { history, agents, stored } = world(on)
    const { gate, open } = gates()
    const seen = pi(on, { hold: (n) => gate(n), reply: readsIn })
    const step = steps(on)
    const runTurn = live(on, clock, history)
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 16; n++) agents['agent-1'].push(...agentCall('one', n, 16_000))
    agents['agent-2'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 4; n++) agents['agent-2'].push(...agentCall('two', n, 16_000))
    await clock.set(at(23, 9, 0))
    await step($, 's', 0, agents['agent-1'].length, 'agent-1')
    await clock.settle()
    expect(seen.inFlight).toBe(4)
    await runTurn($, [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)], at(23, 9, 0)) // no slot: main waits
    await step($, 's2', 0, agents['agent-2'].length, 'agent-2') // and so does the sibling
    await clock.settle()
    expect(seen.prompts).toHaveLength(4)

    await $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    await clock.settle()
    expect(seen.stopped).toBe(4)
    expect(seen.prompts.length).toBeGreaterThan(4) // the freed slots went to the loops waiting on them
    for (let n = 5; n <= seen.prompts.length; n++) open(n)
    await clock.settle()
    await runTurn($, turn('c', 'c', 8_000), at(23, 9, 1))
    await clock.settle()
    for (let n = 5; n <= seen.prompts.length; n++) open(n)
    await clock.settle()

    expect(seen.maxInFlight).toBe(4)
    expect(seen.prompts.length).toBeGreaterThan(4)
    expect(seen.prompts.slice(4).some((p) => readers(p).has('one'))).toBe(false) // the rest read main's rows and the sibling's
    expect((stored['ledger:session-1'] as Ledger).entries.length).toBeGreaterThan(0)
    expect((stored['ledger:session-1/agent-2'] as Ledger).entries.length).toBeGreaterThan(0)
    expect(Object.keys(stored).filter((k) => k.includes('agent-1'))).toEqual([])
  })

  test('a step whose subagent finishes while the step checks that it runs records nothing and starts no Observer call', async ($, on) => {
    const clock = mock.clock(on)
    const { gate, open } = gates()
    let lists = 0
    const { agents, stored } = world(on, { holdList: () => (++lists === 1 ? gate(1) : undefined) })
    const seen = pi(on, { reply: readsIn })
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
    const seen = pi(on, { reply: (prompt) => ((observed = true), readsIn(prompt)) })
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
    const seen = pi(on, { reply: readsIn })
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
    const seen = pi(on, { hold: (n) => gate(n), reply: readsIn })
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
    const seen = pi(on, { reply: readsIn })
    on('turn.complete', () => ({ text: '' }))
    agents['mate-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 4; n++) agents['mate-1'].push(...agentCall('one', n, 16_000))

    await $.turn.complete({ answer: 'done', durationMs: 0, isAborted: false, turnId: 'm', reason: 'answer', agentId: 'mate-1' })
    await clock.settle()

    expect(seen.prompts).toHaveLength(1)
    expect(Object.keys(stored).sort()).toEqual(['ledger:session-1/mate-1', 'times:session-1/mate-1'])
  })

  test("the steps' times and the turn's start are held and written together a moment later, at once at the turn's end, and a prune by another process stays done", async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored, writes } = world(on)
    pi(on)
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
    pi(on)
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
