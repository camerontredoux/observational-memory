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
// `alive` lists the sessions whose process runs (pid 100 + index, started at tick 5000 + index); `env` adds variables.
// `onList` runs before the nth listing of the sessions folder answers, to change the world between the pruner's reads.
function world(
  on: On,
  entries: Record<string, unknown> = {},
  keys = true,
  alive: string[] = [],
  env: Record<string, string> = {},
  o: { listFails?: boolean; setFails?: boolean; id?: () => string; onList?: (n: number) => void } = {},
) {
  const clock = mock.clock(on, { now: NOW })
  mock.env(on, { HOME: '/home/u', ...env })
  const files: Record<string, string> = {}
  const run = (id: string, pid: number, start: number) => {
    files[`/home/u/.claude/sessions/${pid}.json`] = JSON.stringify({ pid, sessionId: id, procStart: String(start) })
    files[`/proc/${pid}/stat`] = `${pid} (claude code) S ${Array.from({ length: 18 }, (_, n) => n + 4).join(' ')} ${start} 0 0`
  }
  alive.forEach((id, i) => run(id, 100 + i, 5000 + i))
  files['/proc/self/stat'] = '1 (x) S'
  const dirs = () => new Set(['/home/u/.claude/sessions', ...Object.keys(files).flatMap((p) => p.split('/').slice(1, -1).map((_, n, a) => `/${a.slice(0, n + 1).join('/')}`))])
  let lists = 0
  on('fs.list', ($, e) => {
    if (o.listFails) throw new Error('EACCES')
    if (e.path === '/home/u/.claude/sessions') o.onList?.(++lists)
    if (!dirs().has(e.path)) throw new Error(`ENOENT: ${e.path}`)
    return { value: Object.keys(files).filter((p) => p.startsWith(`${e.path}/`) && !p.slice(e.path.length + 1).includes('/')).map((p) => ({ name: p.slice(e.path.length + 1), kind: 'file' as const, size: files[p]!.length, isLink: false })) }
  })
  on('fs.read', ($, e) => {
    if (!(e.path in files)) throw new Error(`ENOENT: ${e.path}`)
    return { value: files[e.path]! }
  })
  on('fs.exists', ($, e) => ({ value: e.path in files || dirs().has(e.path) }))
  const stored: Record<string, unknown> = { ...entries }
  const logs: string[] = []
  const screen: string[] = []
  const reads: string[] = []
  const bytes = () => Object.entries(stored).reduce((n, [k, v]) => n + k.length + JSON.stringify(v).length, 0)
  on('store.get', ($, e) => (reads.push(e.key), { value: stored[e.key] === undefined ? undefined : JSON.parse(JSON.stringify(stored[e.key])) }))
  on('store.set', ($, e) => {
    if (o.setFails) throw new Error('EACCES')
    const was = stored[e.key]
    stored[e.key] = JSON.parse(JSON.stringify(e.value))
    const would = bytes()
    if (would <= 4 * 1024 * 1024) return { value: undefined }
    if (was === undefined) delete stored[e.key]
    else stored[e.key] = was
    // The engine's refusal in its wording, as a deny: a hook that throws is skipped, and the plugin would see core's instead.
    return { deny: `observational-memory: $.store.set: the store would be ${would} characters, over the 4194304 limit` }
  })
  on('store.delete', ($, e) => (delete stored[e.key], { value: undefined }))
  on('store.keys', () => {
    if (!keys) throw new Error('store unreadable')
    return { value: Object.keys(stored) }
  })
  on('session.id', () => ({ value: o.id?.() ?? 'session-1' }))
  on('ui.log', ($, e) => ((e.to === 'debug' ? logs : screen).push(e.text), { value: undefined }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__observational-memory__` } }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  // Starts a session and lets the background pruner run to its end.
  const start = async ($: Engine) => (await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false }), await clock.settle())
  return { clock, stored, reads, logs, screen, start, files, run }
}

describe('register', () => {
  test('drops sessions untouched for 30 days at session.start and keeps recent ones, the current one and foreign keys', async ($, on) => {
    const w = world(on, { ...session('old', NOW - 31 * DAY), ...session('recent', NOW - 29 * DAY), ...session('session-1', NOW - 90 * DAY), other: 1 })
    await w.start($)
    expect(Object.keys(w.stored).sort()).toEqual(['ledger:recent', 'ledger:session-1', 'live:recent', 'live:session-1', 'other', 'prune:last', 'times:recent', 'times:session-1'])
    expect(w.logs).toHaveLength(1)
    expect(w.logs[0]).toMatch(/^pruned 1 session\(s\) untouched for 30 days: old \(3 keys\)$/)
    expect(w.screen).toEqual([])
  })

  test("a subagent's keys belong to its session: pruned with an old one, kept with the current one and under the cap", async ($, on) => {
    const big = 'y'.repeat(1_200_000) // two of them keep the store under 60% of its cap: the daily run drops no more
    const w = world(on, { ...session('old', NOW - 31 * DAY), ...session('old/agent-1', NOW - 31 * DAY), ...session('a', NOW - DAY, big), ...session('session-1/agent-2', NOW - 40 * DAY, big) })
    on('skill.prompt', ($, e) => ({ text: e.text }))
    await w.start($)
    expect(w.logs).toEqual(['pruned 1 session(s) untouched for 30 days: old (6 keys)'])
    await $.skill.prompt({ skill: 'huge', text: 'y'.repeat(2_000_000) })
    expect(Object.keys(w.stored).filter((k) => k.startsWith('ledger:'))).toEqual(['ledger:session-1/agent-2'])
    expect(w.logs[1]).toMatch(/^pruned 1 session\(s\) to fit the store under its size cap: a \(3 keys, ~\d+ KiB\)$/)
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
    expect(w.stored).toEqual({ 'prune:last': NOW + 31.5 * DAY })
  })

  test('a stamped session that later records turns is dated by its newest turn', async ($, on) => {
    const w = world(on, { 'seen:s': NOW - 40 * DAY, ...session('s', NOW - DAY) })
    await w.start($)
    expect(w.stored['ledger:s']).toBeDefined()
  })

  test('a write over the cap drops the oldest other sessions one at a time until it fits, then succeeds, sizing none it keeps', async ($, on) => {
    const big = 'y'.repeat(900_000)
    const huge = 'y'.repeat(1_600_000) // fits once two of the sessions have gone, not one
    const w = world(on, { ...session('a', NOW - 3 * DAY, big), ...session('b', NOW - 2 * DAY, big), ...session('c', NOW - DAY, big), ...session('session-1', NOW, big) })
    on('skill.prompt', ($, e) => ({ text: e.text }))
    await $.skill.prompt({ skill: 'huge', text: huge })
    expect(Object.keys(w.stored).filter((k) => k.startsWith('ledger:'))).toEqual(['ledger:c', 'ledger:session-1'])
    expect(w.stored['skills:session-1']).toEqual([{ skill: 'huge', text: huge, at: NOW }])
    expect(w.logs).toHaveLength(1)
    expect(w.logs[0]).toMatch(/^pruned 2 session\(s\) to fit the store under its size cap: a, b \(6 keys, ~175\d KiB\)$/)
    expect(w.reads.filter((k) => k.startsWith('ledger:'))).toEqual(['ledger:a', 'ledger:b']) // read only as they are deleted
  })

  test('the daily run then drops the oldest sessions until the store is under 60% of its cap, but the current one, a running one and one with no time', async ($, on) => {
    const big = 'y'.repeat(650_000)
    const w = world(
      on,
      { ...session('session-1', NOW - 9 * DAY, big), ...session('idle', NOW - 5 * DAY, big), ...session('a', NOW - 3 * DAY, big), ...session('b', NOW - 2 * DAY, big), ...session('c', NOW - DAY, big), 'transcript:fresh': big },
      true,
      ['idle'],
    )
    await w.start($)
    expect(Object.keys(w.stored).filter((k) => k.startsWith('ledger:') || k.startsWith('transcript:')).sort()).toEqual(['ledger:idle', 'ledger:session-1', 'transcript:fresh'])
    expect(w.stored['seen:fresh']).toBe(NOW) // stamped now, so the newest
    expect(w.logs).toEqual([expect.stringMatching(/^pruned 3 session\(s\) to keep the store under 60% of its size cap: a, b, c \(9 keys, ~190\d KiB\)$/)])
  })

  test('the daily run drops nothing more once the store is under 60% of its cap', async ($, on) => {
    const big = 'y'.repeat(800_000)
    const w = world(on, { ...session('a', NOW - 3 * DAY, big), ...session('b', NOW - 2 * DAY, big), ...session('c', NOW - DAY, big) })
    await w.start($)
    expect(Object.keys(w.stored).filter((k) => k.startsWith('ledger:'))).toEqual(['ledger:a', 'ledger:b', 'ledger:c'])
    expect(w.logs).toEqual([])
  })

  test('a failing pruner is logged and the session starts', async ($, on) => {
    const w = world(on, session('old', NOW - 31 * DAY), false)
    await w.start($)
    expect(w.logs).toEqual(['could not prune old sessions (no implementation for store.keys)'])
    expect(w.screen).toEqual(['Cleanup failed (no implementation for store.keys) and will retry tomorrow'])
    expect(w.stored['ledger:old']).toBeDefined()
  })
  test('a session whose process is alive is kept however old; a reused pid does not keep it', async ($, on) => {
    const w = world(on, { ...session('idle', NOW - 60 * DAY), ...session('reused', NOW - 60 * DAY) }, true, ['idle', 'reused'])
    w.files['/proc/101/stat'] = w.files['/proc/101/stat']!.replace(/ 5001 0 0$/, ' 9999 0 0') // pid 101 now runs another process
    await w.start($)
    expect(w.stored['ledger:idle']).toBeDefined()
    expect(w.stored['ledger:reused']).toBeUndefined()
  })

  test('with the sessions folder unreadable nothing is pruned that run', async ($, on) => {
    const w = world(on, session('old', NOW - 60 * DAY), true, [], {}, { listFails: true })
    await w.start($)
    expect(w.stored['ledger:old']).toBeDefined()
    expect(w.logs).toEqual(['could not prune old sessions (no implementation for fs.list)'])
  })

  test('a malformed turn time falls back to the seen stamp, not 1970', async ($, on) => {
    const w = world(on, { 'times:x': [{ i: 0, hash: 'h' }, { i: 1, hash: 'h', at: '2026-09-23T00:00:00Z' }], 'ledger:x': {} })
    await w.start($)
    expect(w.stored['ledger:x']).toBeDefined()
    expect(w.stored['seen:x']).toBe(NOW)
  })

  test('OM_NO_PRUNE turns pruning off', async ($, on) => {
    const w = world(on, session('old', NOW - 60 * DAY), true, [], { OM_NO_PRUNE: '1' })
    await w.start($)
    expect(w.stored['ledger:old']).toBeDefined()
  })

  test('the daily run is shared across processes through the store', async ($, on) => {
    const w = world(on, { ...session('old', NOW - 60 * DAY), 'prune:last': NOW - DAY / 2 })
    await w.start($)
    expect(w.stored['ledger:old']).toBeDefined()
    await w.clock.advance(DAY)
    await w.start($)
    expect(w.stored['ledger:old']).toBeUndefined()
    expect(w.stored['prune:last']).toBe(NOW + DAY)
  })

  test('a session resumed while the pruner runs is kept', async ($, on) => {
    let calls = 0
    const w = world(on, session('old', NOW - 60 * DAY), true, [], {}, { id: () => (calls++ ? 'old' : 'session-1') })
    await w.start($)
    expect(w.stored['ledger:old']).toBeDefined()
  })

  test("activity a candidate's subagent records after the scan keeps the session; a stale one is still pruned", async ($, on) => {
    const w = world(on, { ...session('old', NOW - 60 * DAY), ...session('old/agent-1', NOW - 60 * DAY), ...session('older', NOW - 60 * DAY), ...session('stale', NOW - 60 * DAY) }, true, [], {}, {
      onList: (n) => {
        if (n > 1) return
        w.stored['times:old/agent-1'] = [{ i: 0, hash: 'h', at: NOW }] // a subagent of a resumed session steps
        w.stored['ledger:older/agent-2'] = { entries: [] } // a new subagent's first key
      },
    })
    await w.start($)
    expect(w.stored['ledger:old']).toBeDefined()
    expect(w.stored['ledger:old/agent-1']).toBeDefined()
    expect(w.stored['ledger:older']).toBeDefined()
    expect(w.stored['ledger:stale']).toBeUndefined()
    expect(w.logs).toEqual(['pruned 1 session(s) untouched for 30 days: stale (3 keys)'])
  })

  test('a session resumed between the first liveness check and its deletion is kept; the check is made again for each', async ($, on) => {
    const w = world(on, { ...session('old', NOW - 60 * DAY), ...session('stale', NOW - 60 * DAY) }, true, [], {}, {
      onList: (n) => n === 2 && w.run('old', 200, 7000), // resumed after the first listing
    })
    await w.start($)
    expect(w.stored['ledger:old']).toBeDefined()
    expect(w.stored['ledger:stale']).toBeUndefined()
  })

  test('when liveness cannot be told again before a deletion, nothing more is deleted', async ($, on) => {
    const w = world(on, { ...session('a', NOW - 60 * DAY), ...session('b', NOW - 60 * DAY) }, true, [], {}, {
      onList: (n) => {
        if (n === 3) throw new Error('EACCES')
      },
    })
    await w.start($)
    expect(Object.keys(w.stored).filter((k) => k.startsWith('ledger:'))).toEqual(['ledger:b'])
    expect(w.logs).toEqual(['pruned 1 session(s) untouched for 30 days: a (3 keys)', 'could not prune old sessions (no implementation for fs.list)'])
  })

  test('a write over the cap keeps a session resumed after the cap was hit and drops the next oldest instead', async ($, on) => {
    const big = 'y'.repeat(900_000)
    const w = world(on, { ...session('a', NOW - 3 * DAY, big), ...session('b', NOW - 2 * DAY, big), ...session('c', NOW - DAY, big), ...session('session-1', NOW, big) }, true, [], {}, {
      onList: (n) => n === 2 && w.run('a', 200, 7000),
    })
    on('skill.prompt', ($, e) => ({ text: e.text }))
    await $.skill.prompt({ skill: 'huge', text: big })
    expect(Object.keys(w.stored).filter((k) => k.startsWith('ledger:'))).toEqual(['ledger:a', 'ledger:c', 'ledger:session-1'])
    expect(w.stored['skills:session-1']).toEqual([{ skill: 'huge', text: big, at: NOW }])
  })

  test('the daily run deletes the legacy fork: and buffer: keys, whatever their session', async ($, on) => {
    const w = world(on, { 'fork:a': { at: 1 }, 'buffer:session-1': [], 'buffer:b/agent-1': [], forkX: 1, 'other:fork:a': 1, ...session('recent', NOW - DAY) })
    await w.start($)
    expect(Object.keys(w.stored).sort()).toEqual(['forkX', 'ledger:recent', 'live:recent', 'other:fork:a', 'prune:last', 'times:recent'])
    expect(w.logs).toEqual(['deleted 3 legacy fork: and buffer: key(s)'])
  })

  test('keys with no colon are not sessions', async ($, on) => {
    const w = world(on, { ledgerX: 1, ...session('old', NOW - 60 * DAY) })
    await w.start($)
    expect(w.stored.ledgerX).toBe(1)
    expect(w.stored['seen:ledgerX']).toBeUndefined()
  })

  test('the cap drops neither a live session nor one with no time yet, and ignores other errors', async ($, on) => {
    const big = 'y'.repeat(900_000)
    const w = world(on, { ...session('a', NOW - 3 * DAY, big), ...session('b', NOW - 2 * DAY, big), 'transcript:fresh': big, ...session('session-1', NOW, big) }, true, ['a'])
    on('skill.prompt', ($, e) => ({ text: e.text }))
    await $.skill.prompt({ skill: 'huge', text: big })
    expect(Object.keys(w.stored).filter((k) => k.startsWith('ledger:') || k.startsWith('transcript:')).sort()).toEqual(['ledger:a', 'ledger:session-1', 'transcript:fresh'])
  })

  test('a store error other than the cap is not answered by pruning', async ($, on) => {
    const w = world(on, session('old', NOW - 60 * DAY, 'y'.repeat(4_000_000)), true, [], {}, { setFails: true })
    on('skill.prompt', ($, e) => ({ text: e.text }))
    await $.skill.prompt({ skill: 'x', text: 'x' })
    expect(w.stored['ledger:old']).toBeDefined()
  })
})
