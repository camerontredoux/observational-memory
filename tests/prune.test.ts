import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 8, 23)
const session = (id: string, at: number, extra = 'x') => ({
  [`ledger:${id}`]: { entries: [{ id: 'a', line: extra }] },
  [`times:${id}`]: [{ i: 0, hash: 'h', at: at - DAY }, { i: 1, hash: 'h', at }],
  [`live:${id}`]: 3,
})

// A store the test can read (with the engine's 4 MiB cap), a clock, and what the plugin logs.
function world(on: On, entries: Record<string, unknown> = {}, keys = true) {
  const clock = mock.clock(on, { now: NOW })
  const stored: Record<string, unknown> = { ...entries }
  const logs: string[] = []
  const bytes = () => Object.entries(stored).reduce((n, [k, v]) => n + k.length + JSON.stringify(v).length, 0)
  on('store.get', ($, e) => ({ value: stored[e.key] === undefined ? undefined : JSON.parse(JSON.stringify(stored[e.key])) }))
  on('store.set', ($, e) => {
    const was = stored[e.key]
    stored[e.key] = JSON.parse(JSON.stringify(e.value))
    if (bytes() <= 4 * 1024 * 1024) return { value: undefined }
    if (was === undefined) delete stored[e.key]
    else stored[e.key] = was
    throw new Error('the store would exceed 4 MiB')
  })
  on('store.delete', ($, e) => (delete stored[e.key], { value: undefined }))
  on('store.keys', () => {
    if (!keys) throw new Error('store unreadable')
    return { value: Object.keys(stored) }
  })
  on('session.id', () => ({ value: 'session-1' }))
  on('ui.log', ($, e) => (logs.push(e.text), { value: undefined }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__observational-memory__` } }))
  // Starts a session and lets the background pruner run to its end.
  const start = async ($: Engine) => (await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false }), await clock.settle())
  return { clock, stored, logs, start }
}

describe('register', () => {
  test('drops sessions untouched for 30 days at session.start and keeps recent ones, the current one and foreign keys', async ($, on) => {
    const w = world(on, { ...session('old', NOW - 31 * DAY), ...session('recent', NOW - 29 * DAY), ...session('session-1', NOW - 90 * DAY), other: 1 })
    await w.start($)
    expect(Object.keys(w.stored).sort()).toEqual(['ledger:recent', 'ledger:session-1', 'live:recent', 'live:session-1', 'other', 'times:recent', 'times:session-1'])
    expect(w.logs).toHaveLength(1)
    expect(w.logs[0]).toMatch(/^pruned 1 session\(s\) untouched for 30 days: old \(3 keys, ~\d+ KiB\)$/)
  })

  test('a session with no times is stamped when first seen and pruned 30 days later; the pruner runs at most once a day', async ($, on) => {
    const w = world(on, { 'skills:legacy': [], 'transcript:legacy': '/t.jsonl' })
    await w.start($)
    expect(w.stored['seen:legacy']).toBe(NOW)
    delete w.stored['seen:legacy']
    await w.clock.advance(DAY / 2)
    await w.start($)
    expect(w.stored['seen:legacy']).toBeUndefined() // not run again the same day
    w.stored['seen:legacy'] = NOW
    await w.clock.advance(29 * DAY)
    await w.start($)
    expect(w.stored['seen:legacy']).toBe(NOW) // the first stamp stands
    expect(w.stored['skills:legacy']).toEqual([])
    await w.clock.advance(2 * DAY)
    await w.start($)
    expect(w.stored).toEqual({})
  })

  test('a stamped session that later records turns is dated by its newest turn', async ($, on) => {
    const w = world(on, { 'seen:s': NOW - 40 * DAY, ...session('s', NOW - DAY) })
    await w.start($)
    expect(w.stored['ledger:s']).toBeDefined()
  })

  test('a write over the cap drops the oldest other sessions until it fits, then succeeds', async ($, on) => {
    const big = 'y'.repeat(900_000)
    const w = world(on, { ...session('a', NOW - 3 * DAY, big), ...session('b', NOW - 2 * DAY, big), ...session('c', NOW - DAY, big), ...session('session-1', NOW, big) })
    on('skill.prompt', ($, e) => ({ text: e.text }))
    await $.skill.prompt({ skill: 'huge', text: big })
    expect(Object.keys(w.stored).filter((k) => k.startsWith('ledger:'))).toEqual(['ledger:c', 'ledger:session-1'])
    expect(w.stored['skills:session-1']).toEqual([{ skill: 'huge', text: big }])
    expect(w.logs).toHaveLength(1)
    expect(w.logs[0]).toMatch(/^pruned 2 session\(s\) to fit the store under its size cap: a, b \(6 keys, ~\d+ KiB\)$/)
  })

  test('a failing pruner is logged and the session starts', async ($, on) => {
    const w = world(on, session('old', NOW - 31 * DAY), false)
    await w.start($)
    expect(w.logs).toEqual(['could not prune old sessions (no implementation for store.keys)'])
    expect(w.stored['ledger:old']).toBeDefined()
  })
})
