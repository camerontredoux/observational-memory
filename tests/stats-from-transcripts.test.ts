import { describe, expect, test } from 'claude-code/testing'
import { TURN_END_NOTE } from '../hooks/prompts'
import { statsFromTranscript } from '../scripts/stats-from-transcripts'

const at = (h: number, m = 0) => new Date(2026, 9, 10, h, m).toISOString() // the machine's clock, as days are cut
const reply = (id: string, t: string, read: number, write: number, extra = {}) =>
  ({ type: 'assistant', timestamp: t, cwd: '/w', message: { id, model: 'claude-opus-5-5', usage: { input_tokens: 2, cache_read_input_tokens: read, cache_creation_input_tokens: write, output_tokens: 9 } }, ...extra })
const boundary = (t: string, trigger: string, pre: number) => ({ type: 'system', subtype: 'compact_boundary', timestamp: t, compactMetadata: { trigger, preTokens: pre, postTokens: 30_000 } })
const user = (t: string, content: string) => ({ type: 'user', timestamp: t, message: { content } })
const jsonl = (rows: object[]) => rows.map((r) => JSON.stringify(r)).join('\n')

describe('stats from transcripts', () => {
  test("counts a streamed response once at its final usage, skips sidechain and synthetic lines, and names each compaction's compactor and turn-end trigger", () => {
    const [s, ...more] = statsFromTranscript(jsonl([
      reply('m1', at(9), 100_000, 0),
      reply('m1', at(9), 150_000, 7_000), // the same response, its final usage
      reply('side', at(9, 1), 1, 1, { isSidechain: true }),
      reply('syn', at(9, 1), 1, 1, { message: { id: 'syn', model: '<synthetic>', usage: {} } }),
      boundary(at(9, 2), 'manual', 157_000),
      user(at(9, 2), `<memory-guide>…</memory-guide>\n${TURN_END_NOTE}`),
      reply('m2', at(9, 3), 4_000, 30_000),
      boundary(at(9, 4), 'auto', 201_000),
      user(at(9, 4), 'This session is being continued from a previous conversation that ran out of context.'),
      reply('m3', at(9, 5), 0, 31_000),
    ]), 'abc')
    expect(more).toEqual([])
    expect([s!.sessionId, s!.cwd, s!.backfilled]).toEqual(['abc.2026-10-10', '/w', true])
    expect(s!.metrics['request.contextTokens']).toMatchObject({ count: 3, sum: 157_002 + 34_002 + 31_002 })
    expect(s!.metrics['compaction.turnEnd.tokensBefore']).toMatchObject({ count: 1, sum: 157_000 })
    expect(s!.metrics['compaction.auto.tokensBefore']).toMatchObject({ count: 1, sum: 201_000 })
    expect(s!.metrics['afterCompaction.om.cacheWriteTokens']).toMatchObject({ count: 1, sum: 30_000 })
    expect(s!.metrics['afterCompaction.builtin.cacheWriteTokens']).toMatchObject({ count: 1, sum: 31_000 })
  })

  test('splits a session at midnight into a file per day', () => {
    const days = statsFromTranscript(jsonl([reply('a', at(23, 50), 10, 0), reply('b', new Date(2026, 9, 11, 0, 10).toISOString(), 20, 0)]), 'abc')
    expect(days.map((s) => [s.sessionId, s.metrics['request.contextTokens']!.count])).toEqual([['abc.2026-10-10', 1], ['abc.2026-10-11', 1]])
  })
})
