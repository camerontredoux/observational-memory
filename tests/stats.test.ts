import { describe, expect, test } from 'claude-code/testing'
import { add, addCompaction, addLuna, addRecall, count, emptyStats, failureClass, formatReport, formatSummary, merge, parseArgs, parseSince, percentile, report } from '../hooks/stats'
import type { Io, SessionStats } from '../hooks/stats'

const T0 = Date.UTC(2026, 8, 20, 12, 0)
const DAY = 86_400_000

// A session with every section of the summary: compactions each at their own time, as they are recorded.
function busy() {
  const s = session('a', T0, [[10_000, 0.002], [20_000, 0.003], [30_000, 0.004]])
  s.cwd = '/home/u/p'
  for (const n of [9, 9, 12]) add(s, 'observer.background.observations', n, T0)
  const main = { trigger: 'auto', fellBack: false, estTokensAfter: 27_000, observations: 236 }
  addCompaction(s, { ...main, ms: 70, syncCalls: 0, syncMs: 0, rowsObservedNow: 0 }, T0 + 60_000)
  addCompaction(s, { ...main, ms: 90, syncCalls: 0, syncMs: 0, rowsObservedNow: 0 }, T0 + 120_000)
  addCompaction(s, { ...main, ms: 16_000, syncCalls: 1, syncMs: 15_900, rowsObservedNow: 147 }, T0 + 180_000)
  addCompaction(s, { trigger: 'auto', fellBack: true, ms: 40_000 }, T0 + 240_000)
  addCompaction(s, { trigger: 'subagent', fellBack: false, ms: 50, syncCalls: 0, syncMs: 0, rowsObservedNow: 0, memoryTokens: 5_000, observations: 40 }, T0 + 300_000)
  addCompaction(s, { trigger: 'subagent', fellBack: false, ms: 60, syncCalls: 0, syncMs: 0, rowsObservedNow: 0, memoryTokens: 5_000, observations: 40 }, T0 + 600_000)
  count(s, 'observer.compaction.failed.no-observations', 2)
  count(s, 'compaction.notPersistent')
  count(s, 'observer.background.merged', 3)
  count(s, 'reflector.background.merged')
  count(s, 'observer.compaction.orphaned')
  addRecall(s, 3, false, T0 + 600_000)
  addRecall(s, 0, true, T0 + 600_000)
  return s
}

function session(id: string, at: number, calls: [ms: number, cost: number][]) {
  const s = emptyStats(id, at)
  for (const [ms, cost] of calls) addLuna(s, { kind: 'observer', phase: 'background', ok: true, ms, input: 10_000, output: 500, cost, chunkTokens: 9_000 }, at)
  return s
}

describe('stats', () => {
  test('percentile is nearest rank over sorted values', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3)
    expect(percentile([1, 2, 3, 4], 50)).toBe(2)
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9)
    expect(percentile([7], 90)).toBe(7)
    expect(percentile([], 50)).toBeNaN()
  })

  test('a metric aggregates every value and keeps only the newest 200 samples', () => {
    const s = emptyStats('s', T0)
    for (let i = 1; i <= 250; i++) addLuna(s, { kind: 'observer', phase: 'background', ok: true, ms: i }, T0 + i)
    const m = s.metrics['observer.background.ms']!
    expect([m.count, m.sum, m.min, m.max, m.recent.length]).toEqual([250, 31_375, 1, 250, 200])
    expect(m.recent[0]).toEqual([T0 + 51, 51])
    expect(s.lastSeen).toBe(T0 + 250)
  })

  test('a failed call counts its class and its time, not its tokens', () => {
    const s = emptyStats('s', T0)
    addLuna(s, { kind: 'observer', phase: 'compaction', ok: false, failure: failureClass('pi exited 1: network down'), ms: 900 }, T0)
    expect(s.counts).toEqual({ 'observer.compaction.failed.exit-1': 1 })
    expect(Object.keys(s.metrics)).toEqual(['observer.compaction.failed.ms'])
    expect(failureClass('pi exited 0, stopReason error: overloaded')).toBe('stop-error')
    expect(failureClass('pi exited 0 with no assistant message')).toBe('no-message')
    expect(failureClass('observer answered without an <observations> block')).toBe('no-observations')
    expect(failureClass('process timed out after 120000ms')).toBe('timeout')
  })

  test('merge adds sessions and pools their samples; capped samples make it approximate', () => {
    const a = session('a', T0, [[10_000, 0.002], [20_000, 0.003]])
    const b = session('b', T0 + DAY, [[30_000, 0.004]])
    const m = merge([a, b])
    const ms = m.stats.metrics['observer.background.ms']!
    expect([m.sessions, ms.count, ms.sum, ms.min, ms.max, ms.recent.length, m.approximate]).toEqual([2, 3, 60_000, 10_000, 30_000, 3, false])
    b.metrics['observer.background.ms']!.count = 500
    expect(merge([a, b]).approximate).toBe(true)
  })

  test('since drops sessions last seen before it and rebuilds metrics from the samples after it', () => {
    const a = session('a', T0, [[10_000, 0.002]])
    const b = session('b', T0 + 2 * DAY, [[30_000, 0.004]])
    addLuna(b, { kind: 'observer', phase: 'background', ok: true, ms: 5_000 }, T0 - DAY) // an old sample in a recent session
    const now = T0 + 3 * DAY
    const since = parseSince('2d', now)!
    expect(since).toBe(T0 + DAY)
    const m = merge([a, b], since)
    expect(m.sessions).toBe(1)
    expect(m.stats.metrics['observer.background.ms']).toMatchObject({ count: 1, sum: 30_000 })
    expect(parseSince('2026-09-21', now)).toBe(Date.UTC(2026, 8, 21))
    expect(parseSince('soon', now)).toBeUndefined()
  })

  test('the report gives totals and a row per metric with count, sum, mean, median, p90, min and max', () => {
    const s = session('a', T0, [[10_000, 0.002], [20_000, 0.003], [30_000, 0.004]])
    addCompaction(s, { trigger: 'manual', ms: 250, fellBack: false, tokensBefore: 120_000, tokensAfter: 14_000, syncCalls: 0, syncMs: 0 }, T0)
    addCompaction(s, { trigger: 'auto', ms: 40_000, fellBack: true }, T0)
    addLuna(s, { kind: 'reflector', phase: 'background', ok: false, failure: 'timeout', ms: 600_000 }, T0)
    const text = formatReport('stats, session a', merge([s]))
    expect(text).toContain('## stats, session a')
    expect(text).toContain('1 session(s), 2026-09-20 12:00 to 2026-09-20 12:00 UTC. 2 compaction(s), 4 Luna call(s) (1 failed), $0.0090, 30,000 tokens in, 1,500 out.')
    expect(text).toContain('| observer.background.ms | 3 | 1m 0s | 20.0 s | 20.0 s | 30.0 s | 10.0 s | 30.0 s |')
    expect(text).toContain('| observer.background.cost | 3 | $0.0090 | $0.0030 | $0.0030 | $0.0040 | $0.0020 | $0.0040 |')
    expect(text).toContain('| compaction.manual.ms | 1 | 250 ms |')
    expect(text).toContain('| compaction.manual.tokensBefore | 1 | 120,000 |')
    expect(text).toContain('| reflector.background.failed.ms | 1 | 10m 0s |')
    expect(text).toContain('Counts: compaction.auto.fellBack 1, reflector.background.failed.timeout 1')
    expect(text).not.toContain('approximate')
    expect(formatReport('stats', merge([]))).toBe('stats: no stats recorded yet.')
  })

  test('a backfilled file merges like a live one', () => {
    const backfilled: SessionStats = {
      version: 1,
      sessionId: 'old',
      cwd: '/home/u/p',
      firstSeen: T0,
      lastSeen: T0,
      backfilled: true,
      counts: {},
      metrics: { 'observer.unknown.ms': { count: 2, sum: 30_000, min: 10_000, max: 20_000, recent: [[T0, 10_000], [T0, 20_000]] } },
    }
    expect(merge([backfilled]).stats.metrics['observer.unknown.ms']).toMatchObject({ count: 2, sum: 30_000 })
  })

  test('command arguments: all or a session id, and a since, in any order', () => {
    expect(parseArgs('')).toEqual({})
    expect(parseArgs('all 7d')).toEqual({ scope: 'all', since: '7d' })
    expect(parseArgs('2026-09-01 abc-123')).toEqual({ since: '2026-09-01', sessionId: 'abc-123' })
  })

  test('the summary says what happened in plain words', () => {
    expect(formatSummary('this session (/home/u/p)', merge([busy()]), '')).toBe(
      [
        'observational-memory · this session (/home/u/p) · 2026-09-20 12:00–12:10 UTC',
        '',
        'Cost         $0.0090 across 3 observer calls (about $0.0030 each)',
        'Compactions  6: 4 main, 2 subagent',
        '  Main       2 of 3 instant (median 70 ms); 1 waited 15.9 s to observe 147 messages on the spot',
        '  Subagent   2 of 2 instant (median 50 ms)',
        '  Fallbacks  1 used the built-in compaction',
        'Context      after a main compaction: ~27,000 tokens (median), ~236 notes',
        'Background   3 calls, median 20.0 s each, ~9 notes each',
        'Problems     2 observer replies had no notes; 1 context/history mismatch; 4 unmarked lines joined the line before; 1 unmarked line after a 🔴 line kept as its own 🟡 line',
        'Recall       2 searches',
        '',
        '/om-stats full for every metric · /om-stats all for every session',
      ].join('\n'),
    )
  })

  test('the summary leaves out what has nothing to say', () => {
    const text = formatSummary('all sessions', merge([session('a', T0, [[10_000, 0.002]])]), 'all')
    expect(text).toContain('Cost         $0.0020 across 1 observer call (about $0.0020 each)')
    expect(text).toContain('Background   1 call, median 10.0 s each')
    for (const word of ['Compactions', 'Main', 'Subagent', 'Fallbacks', 'Context', 'Problems', 'Recall', 'notes', 'approximate', 'NaN']) expect(text).not.toContain(word)
    expect(text).toContain('/om-stats all full for every metric')
    expect(formatSummary('this session', merge([]), '')).toBe('observational-memory · this session: no stats recorded yet.')
  })

  test('a compaction the floor made counts apart from a fallback, with the messages it briefed and the brief it wrote', () => {
    const s = emptyStats('a', T0)
    addCompaction(s, { trigger: 'auto', fellBack: false, floor: true, ms: 40, rowsBriefed: 30, briefTokens: 900, memoryTokens: 1_200, observations: 0 }, T0)
    addCompaction(s, { trigger: 'manual', fellBack: false, floor: true, ms: 30, rowsBriefed: 12, briefTokens: 500 }, T0)
    addCompaction(s, { trigger: 'auto', fellBack: false, ms: 20, briefTokens: 700 }, T0) // a carried brief, no floor
    expect(s.counts).toEqual({ 'compaction.auto.floor': 1, 'compaction.manual.floor': 1 })
    expect(s.metrics['compaction.auto.rowsBriefed']).toMatchObject({ count: 1, sum: 30 })
    expect(s.metrics['compaction.auto.briefTokens']).toMatchObject({ count: 2, sum: 1_600 })
    const text = formatSummary('this session', merge([s]), '')
    expect(text).toContain('  Floor      2 compiled a brief by code of 42 messages the Observer had not observed')
    expect(text).not.toContain('Fallbacks')
  })

  test('full gives the table, the default the summary', async () => {
    const file = JSON.stringify(busy())
    const io = {
      now: async () => T0 + DAY,
      sessionId: async () => 'a',
      home: async () => '/home/u',
      dir: async () => '/stats',
      read: async (path: string) => {
        if (path === '/stats/a.json') return file
        throw new Error('missing')
      },
      list: async () => [{ name: 'a.json', kind: 'file' }],
    } as unknown as Io
    const full = await report(io, { full: true })
    expect(full).toContain('## observational-memory stats, session a (/home/u/p)')
    expect(full).toContain('| compaction.auto.ms | 4 |')
    const summary = await report(io, {})
    expect(summary).toStartWith('observational-memory · this session (/home/u/p) · ')
    expect(summary).not.toContain('|')
    expect(await report(io, { scope: 'all' })).toStartWith('observational-memory · all sessions (1) · ')
    expect(await report(io, { sessionId: 'b' })).toBe('observational-memory · session b: no stats recorded yet.')
  })

  test('command arguments combine all, full, a since and a session id in any order', () => {
    expect(parseArgs('full')).toEqual({ full: true })
    expect(parseArgs('all full 7d')).toEqual({ scope: 'all', full: true, since: '7d' })
    expect(parseArgs('7d full all')).toEqual({ since: '7d', full: true, scope: 'all' })
    expect(parseArgs('abc-123 full')).toEqual({ sessionId: 'abc-123', full: true })
  })
})
