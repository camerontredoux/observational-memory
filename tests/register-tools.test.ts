import { describe, expect, mock, test } from 'claude-code/testing'
import { FLOOR_NOTE } from '../hooks/prompts'
import { originals, turn, CHUNK, at, world, pi, live, recallOnlyHooks, deferredByEngine, RECALL_DESCRIBE, COMPACT_START, work, observationsIn, briefIn, steps, SUMMARY, USAGE, ran } from './harness'

// Om_recall registration, gauges, /clear and subagent windows.
describe('register: tools', () => {
  test('om_recall is registered at session.start and searches the whole transcript with bounded output', async ($, on) => {
    mock.clock(on)
    const { history } = world(on)
    const registered: unknown[] = []
    on('tool.register', ($, e) => (registered.push(e), { value: { tool: `mcp__observational-memory__${e.name}` } }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    history.push(
      ...turn('auth', 'Looking', 100),
      { role: 'assistant', text: '', toolUses: [{ tool_use_id: 'r1', tool: 'mcp__observational-memory__om_recall', input: { query: 'PLUM marker' } }] },
      ...Array.from({ length: 30 }, (_, i) => ({ role: 'user' as const, text: `note ${i}: the PLUM-7731 marker ${'y'.repeat(2_000)}`, toolUses: [] })),
    )
    history[2] = { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 't-auth', text: 'export const marker = "PLUM-7731"', isError: false }] }

    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })
    const found = await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'plum-7731' })
    const loose = await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'auth.ts nothing-like-this', limit: 3 })

    // No field is required: a query alone still searches, a ref alone reads, neither outlines.
    expect(registered).toEqual([expect.objectContaining({ name: 'om_recall', inputSchema: expect.objectContaining({ properties: expect.objectContaining({ query: expect.anything(), ref: expect.anything(), mode: { type: 'string', enum: ['search', 'read', 'outline', 'files'], description: expect.any(String) } }) }) }), expect.objectContaining({ name: 'om_stats' })])
    expect(registered[0]).not.toHaveProperty('inputSchema.required')
    const text = String(found.result)
    // The newest prompt, note 29, is the one that asked: it is never a match. Hits are cut by the size cap, newest kept.
    expect(text).toMatch(/^30 match\(es\) for "plum-7731" in 34 blocks of the live history; showing 20, the newest\.\n\[#14 · user\] 3 lines\n  1: note \d+: the PLUM-7731 marker y+…\n/)
    expect(text).toContain('[#33 · user] 3 lines\n  1: note 28: the PLUM-7731 marker')
    expect(text).not.toContain('note 29')
    expect(text).toMatch(/\n10 older matches not shown; only if none above answers, repeat with "to": "#13"\.\nOnly if an excerpt is not enough, read just the lines you need: \{"mode": "read", "ref": "#33", "lines": "1-3"\}\.$/)
    expect(text.length).toBeLessThan(12_000)
    expect(String(loose.result)).toBe(
      '1 match(es) for "auth.ts nothing-like-this" in 34 blocks of the live history; no block holds every term, so these hold some, chosen by the rarest.\n' +
        'No occurrences in this session of: nothing-like-this.\n' +
        '[#1.2 · Read call] 1 line\n  1: file_path: /src/auth.ts\nOnly if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "#1.2", "lines": "1-1"}.',
    )
    const whole = String((await $.tool.call({ tool: 'mcp__observational-memory__om_recall', ref: '#33', lines: '1' })).result)
    expect(whole).toMatch(/^\[#33 · user\] lines 1-1 of 3\n   1 \| note 28: the PLUM-7731 marker y+\n… 2 more lines \(1,031 characters\); only if you still need them: \{"mode": "read", "ref": "#33", "lines": "2-3"\}\.$/)
  })

  test('session.start waits at most a second for om_recall to list, and registers om_stats once om_recall settles', async ($, on) => {
    // An agent whose `tools:` leaves om_recall out never lists it: the engine holds the register call 8 s.
    const clock = mock.clock(on)
    world(on)
    const registered: string[] = []
    let listed: () => void = () => {}
    on('tool.register', ($, e) => {
      registered.push(e.name)
      const value = { value: { tool: `mcp__observational-memory__${e.name}` } }
      return e.name === 'om_recall' ? new Promise((resolve) => (listed = () => resolve(value))) : value
    })
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    let started = false

    void $.session.start({ cwd: '/tmp', surface: null, isInteractive: false }).then(() => (started = true))
    await clock.advance(999)
    expect(started).toBe(false)
    await clock.advance(1)
    expect(started).toBe(true)
    expect(registered).toEqual(['om_recall'])

    listed()
    await clock.settle()
    expect(registered).toEqual(['om_recall', 'om_stats'])
  })

  test('the gauges are written at session.start, so the status line draws them before the first turn ends', async ($, on) => {
    const clock = mock.clock(on)
    const { files } = world(on)
    on('tool.register', ($, e) => ({ value: { tool: `mcp__observational-memory__${e.name}` } }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })
    await clock.settle()

    expect(JSON.parse(files['/gauges/session-1.json']!)).toMatchObject({ pending: 0, ledger: 0, cost: 0 })
  })

  test('the cache time is written as each main request starts, not a subagent one, and as null once a compaction installs', async ($, on) => {
    const clock = mock.clock(on)
    const { files } = world(on)
    pi(on)
    on('turn.step', async function* ($, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: { ...USAGE, model: 'claude' } }
    })
    on('session.compact', () => ({ messages: [SUMMARY] }))
    const cacheAt = () => JSON.parse(files['/gauges/session-1.cache.json'] ?? '{}').at
    await clock.set(at(23, 9, 0))

    for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude', messageCount: 1 }));
    await clock.settle()
    expect(cacheAt()).toBe(at(23, 9, 0))

    await clock.set(at(23, 9, 5))
    for await (const _ of $.turn.step({ turnId: 's', index: 0, model: 'claude', messageCount: 1, agentId: 'agent-1' }));
    await clock.settle()
    expect(cacheAt()).toBe(at(23, 9, 0))

    await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', CHUNK)] })
    await clock.settle()
    expect(cacheAt()).toBeNull()
  })

  test('session.end deletes the gauges and the cache time, and a write that lands after it writes nothing', async ($, on) => {
    const clock = mock.clock(on)
    const { files, stored } = world(on)
    const removed: (readonly string[])[] = []
    on('process.run', ($, e) => {
      if (e.argv[0] !== 'rm') return { value: ran({ exitCode: 127, stdout: '', stderr: '' }) }
      removed.push(e.argv)
      for (const path of e.argv.slice(3)) delete files[path]
      return { value: ran({ exitCode: 0, stdout: '', stderr: '' }) }
    })
    on('tool.register', ($, e) => ({ value: { tool: `mcp__observational-memory__${e.name}` } }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))
    on('turn.step', async function* ($, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: { ...USAGE, model: 'claude' } }
    })
    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })
    for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude', messageCount: 1 }));
    await clock.settle()
    expect(Object.keys(files).filter((p) => p.startsWith('/gauges/')).sort()).toEqual(['/gauges/session-1.cache.json', '/gauges/session-1.json'])
    stored['ledger:session-1/agent-1'] = { entries: [] }

    // A request that starts as the session ends: its cache time is written once the end has run.
    for await (const _ of $.turn.step({ turnId: 'u', index: 0, model: 'claude', messageCount: 1 }));
    await $.session.end({ reason: 'other', sessionId: 'session-1', resume: { id: 'session-1' } })
    await clock.settle()

    expect(removed).toEqual([['rm', '-f', '--', '/gauges/session-1.json', '/gauges/session-1.cache.json']])
    expect(Object.keys(files).filter((p) => p.startsWith('/gauges/'))).toEqual([])
    expect(stored).not.toHaveProperty(['ledger:session-1/agent-1'])
  })

  test('session.end goes on when the gauges are missing or rm fails', async ($, on) => {
    mock.clock(on)
    const { stored } = world(on)
    const logs: string[] = []
    on('ui.log', ($, e) => (logs.push(e.text), { value: undefined }))
    on('session.end', ($, e) => ({ sessionId: e.sessionId }))
    let fail = false
    on('process.run', () => (fail ? { value: ran({ exitCode: 1, stdout: '', stderr: 'rm: cannot remove: Permission denied\n' }) } : { value: ran({ exitCode: 0, stdout: '', stderr: '' }) }))

    // No gauge file was ever written: `rm -f` passes over them.
    stored['ledger:session-1/agent-1'] = { entries: [] }
    await $.session.end({ reason: 'other', sessionId: 'session-1', resume: { id: 'session-1' } })
    expect(stored).not.toHaveProperty(['ledger:session-1/agent-1'])

    fail = true
    stored['ledger:session-1/agent-2'] = { entries: [] }
    await $.session.end({ reason: 'other', sessionId: 'session-1', resume: { id: 'session-1' } })
    expect(stored).not.toHaveProperty(['ledger:session-1/agent-2'])
    expect(logs).toContain('could not delete the gauges (rm exited 1: rm: cannot remove: Permission denied)')
  })

  test('the recall-only eval plugin registers om_recall exactly as the plugin does, so built-in+recall is offered the same tool', async ($, on) => {
    mock.clock(on)
    world(on)
    const registered: { name: string }[] = []
    on('tool.register', ($, e) => (registered.push(e), { value: { tool: `mcp__observational-memory__${e.name}` } }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })
    const evaluated: unknown[] = []
    const tool = { register: async (spec: unknown) => (evaluated.push(spec), { tool: 'mcp__observational-memory__om_recall' }) }
    await recallOnlyHooks().get('session.start')!({ tool }, { cwd: '/tmp' }, (e: unknown) => e)

    // Its placement apart: its own tool.describe holds the tool back until the first compaction.
    const { isDeferred: _, ...spec } = registered.find((r) => r.name === 'om_recall') as { isDeferred?: boolean }
    expect(evaluated).toEqual([spec])
  })

  // The tool list heads the prompt: listing om_recall only once the session compacts would write the cache again.
  test('om_recall is registered into the tool list from the start', async ($, on) => {
    mock.clock(on)
    world(on)
    const registered: { name: string; isDeferred?: boolean }[] = []
    on('tool.register', ($, e) => (registered.push(e), { value: { tool: `mcp__observational-memory__${e.name}` } }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })

    expect(registered.find((r) => r.name === 'om_recall')).toHaveProperty('isDeferred', false)
  })

  test('a tool that fails to register is named on screen and in a native notification', async ($, on) => {
    mock.clock(on)
    world(on)
    const screen: string[] = []
    const notified: string[] = []
    on('tool.register', () => ({ deny: 'no room' }))
    on('ui.log', ($, e) => (e.to === 'debug' || screen.push(e.text), { value: undefined }))
    on('ui.notify', ($, e) => (notified.push(e.text), { value: { isSent: true as const, channel: 'kitty' as const } }))
    on('session.start', ($, e) => ({ cwd: e.cwd }))

    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })

    expect(screen).toEqual([expect.stringMatching(/^Setup failed \(.*no room.*\)\. om_recall is unavailable this session$/), expect.stringMatching(/^Setup failed \(.*no room.*\)\. om_stats and \/om-stats are unavailable this session$/)])
    expect(notified).toEqual(screen)
  })

  test('the recall-only eval plugin also puts om_recall in the tool list after the first compaction', async ($, on) => {
    mock.clock(on)
    const { history } = world(on)
    pi(on)
    const evalHooks = recallOnlyHooks()
    const invalidated: string[] = []
    const evalWorld = { session: { id: async () => 'session-1', messages: async () => history }, ui: { invalidate: (event: string) => void invalidated.push(event) } }
    const describe = () => evalHooks.get('tool.describe')!(evalWorld, RECALL_DESCRIBE, deferredByEngine)
    history.push(...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...turn('c', 'c', 8_000))

    const before = await describe()
    const result = await $.session.compact({ trigger: 'auto', messages: [...history] })
    history.push(...result.messages!) // written after the boundary, as the engine does
    await evalHooks.get('classic.SessionStart')!(evalWorld, COMPACT_START, (e: unknown) => e)

    expect(before).toEqual({ description: 'Searches', isDeferred: true })
    expect(invalidated).toEqual(['tool.describe'])
    expect(await describe()).toEqual({ description: 'Searches', isDeferred: false })
  })

  test('om_recall labels tool results with the tool that produced them', async ($, on) => {
    mock.clock(on)
    const { history } = world(on)
    history.push(...turn('auth', 'Looking', 0))
    history[2] = { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 't-auth', text: 'export const marker = "PLUM-7731"', isError: false }] }

    const found = await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'PLUM' })

    expect(String(found.result)).toBe('1 match(es) for "PLUM" in 4 blocks of the live history.\n[#2 · Read result] 1 line\n  1: export const marker = "PLUM-7731"\nOnly if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "#2", "lines": "1-1"}.')
  })

  test('a genuine structured prompt that is the newest one is recognized as the asking row, never a historical search hit', async ($, on) => {
    mock.clock(on)
    const { history } = world(on)
    history.push(...turn('auth', 'Looking', 0))
    // The newest row: a real user prompt that happens to start with a tag the host never emits. Before the shared
    // INJECTED_WRAPPER fix, its shape alone excluded it from `typedText`, so markAsking skipped it and it could
    // surface as a historical match on its own search term instead of being excluded as the row that asked.
    history.push({ role: 'user', text: '<myapp-config>\n  <env>prod</env>\n</myapp-config>\nplease find the PLUM-7731 marker', toolUses: [] })

    const found = await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'PLUM' })

    expect(String(found.result)).toBe('0 match(es) for "PLUM" in 5 blocks of the live history.\nNo occurrences in this session of: plum.')
  })

  test('/clear drops the cleared session\'s ledger, times, skills, Session line and seen stamp, its subagents\' too', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    pi(on)
    on('skill.prompt', ($, e) => ({ text: e.text }))
    const runTurn = live(on, clock, history)

    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps' })
    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle()
    expect(Object.keys(stored).sort()).toEqual(['goal:session-1', 'ledger:session-1', 'skills:session-1', 'times:session-1', 'turns:session-1'])
    stored['seen:session-1'] = 1 // the pruner's stamp
    stored['ledger:session-1/agent-1'] = { entries: [] } // a subagent's left behind
    await $.session.end({ reason: 'clear', sessionId: 'session-1', resume: { id: 'session-1' } })

    expect(stored).toEqual({})
  })

  test('a rewound transcript restarts the ledger from the memory message', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle()
    history.splice(0, history.length, ...turn('z', 'z', CHUNK), ...turn('b', 'b', 8_000))
    const result = await $.session.compact({ trigger: 'manual', messages: [...history] })

    expect(seen.logs).toContain('the transcript changed under the observations; restarting the ledger from the memory message')
    expect(observationsIn(result.messages?.[0]?.text)).toBe('* 🔴 User: "z"') // its rows were never timed
    expect(originals(result.messages?.slice(1))).toEqual(history.slice(3))
  })

  test('a subagent whose history the session cannot read is observed at compaction from its context alone, and its steps store nothing', async ($, on) => {
    const clock = mock.clock(on)
    const { stored } = world(on, { unreadable: ['agent-1'] })
    const seen = pi(on)
    const step = steps(on)

    await step($, 's', 0, 3, 'agent-1')
    await clock.settle()
    const result = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)] })

    expect(seen.prompts).toHaveLength(1)
    expect(observationsIn(result.messages?.[0]?.text)).toBe('* 🔴 User: "a"')
    expect(stored).toEqual({})
    expect(seen.logs).toContain("subagent agent-1's history is unreadable (no agent agent-1 in this session)")
    expect(seen.logs).toContain("subagent agent-1's history is unreadable (no agent agent-1 in this session); observing its context on the spot")
    // A subagent's lines go to the debug log only: the main chat never sees them.
    expect(seen.screen).toEqual([])
    expect(seen.logs).toContain('Compacted subagent in 0 ms · observed 3 messages on the spot · memory 1 note')
  })

  test("an unreadable subagent history gets one round of Observer calls, a failed chunk briefed rather than observed again, and is counted", async ($, on) => {
    const clock = mock.clock(on)
    const { files } = world(on, { unreadable: ['agent-1'] })
    const seen = pi(on, { fail: (n) => (n === 1 ? { exitCode: 1, stdout: '', stderr: 'Error: network down' } : undefined) })

    const result = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...turn('c', 'c', 8_000)] })

    expect(seen.prompts).toHaveLength(2)
    expect(seen.logs.filter((l) => l.startsWith('retrying rows'))).toEqual([])
    expect(briefIn(result.messages![0]!.text)).toStartWith(FLOOR_NOTE)
    await clock.advance(5_000)
    const stats = JSON.parse(files['/stats/session-1.json']!)
    expect(stats.counts['compaction.subagent.unreadable']).toBe(1)
    expect(stats.counts['compaction.subagent.floor']).toBe(1)
  })

  test("a subagent's budget takes the smallest window, not the main model's million", async ($, on) => {
    mock.clock(on)
    world(on, { unreadable: ['agent-1'] })
    const seen = pi(on, { reply: () => `<observations>\n${'* 🟡 read a file with a long name\n'.repeat(6_000)}</observations>` })
    // ~100k tokens of observations: under the main model's (1M - 20k) / 2, over a 200k window's 90k.
    on('session.usage', () => ({ value: { context: { window: 1_000_000 }, rateLimits: [] } }) as never)
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    const messages = [...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...work('w', 8_000)]

    const result = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages })

    expect(seen.logs).toContainEqual(expect.stringMatching(/^the compacted context is over its budget: ~\d+ tokens, ~90000 allowed; using the built-in compaction$/))
    expect(result.messages?.map((m) => m.text)).toEqual(['built-in summary'])
  })

  // A hot reload cancels the old code's pending waits: a worker it started never settles, and spun on.
  test("the band drops an earlier load's unsettled worker when the session starts again", async ($, on) => {
    mock.clock(on)
    world(on)
    // The value the earlier load left in the host's state, until the plugin writes it.
    let workers: unknown = [{ id: 'observer-oldload-1', kind: 'observer' }]
    let version = 1
    on('state.get', ($, e, next) => (e.key === 'workers' ? { value: { value: workers, version } } : next(e)))
    on('state.set', ($, e, next) => (e.key === 'workers' ? ((workers = e.value), { value: { isSet: true, version: ++version } }) : next(e)))
    on('session.start', ($, e) => ({ cwd: e.cwd }))
    await $.session.start({ cwd: '/tmp', surface: null, isInteractive: true })
    expect(workers).toEqual([])
  })

  // 2.1.295 refuses a call a plugin makes while the hooks worker restarts: the band's read must not throw out of render.
  test("the band draws the engine's own when its state read is refused", async ($, on) => {
    mock.clock(on)
    world(on)
    const logs: string[] = []
    on('state.get', ($, e, next) => (e.key === 'workers' ? { deny: 'the hooks worker is restarting' } : next(e)))
    on('ui.log', ($, e) => (logs.push(e.text), { value: undefined }))
    on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', children: ['engine band'] }))

    const props = { hasSurvey: false, isWorking: true, maxRows: 10, columns: 120 } as never
    const band = await $.ui.render({ surface: 'terminal', component: 'AbovePrompt', requestId: 'band', props })

    expect(band).toEqual({ type: 'Text', children: ['engine band'] })
    expect(logs).toEqual([expect.stringMatching(/^the workers band could not draw \(.*the hooks worker is restarting.*\)$/)])
  })
})
