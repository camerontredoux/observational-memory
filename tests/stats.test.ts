import { describe, expect, test } from 'claude-code/testing'
import { addCompaction, addLuna, emptyStats, failureClass, formatReport, merge, parseArgs, parseSince, percentile } from '../hooks/stats'
import type { SessionStats } from '../hooks/stats'

const T0 = Date.UTC(2026, 8, 20, 12, 0)
const DAY = 86_400_000

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
})
