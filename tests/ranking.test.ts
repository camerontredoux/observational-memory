import { describe, expect, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { liveTranscript, recall } from '../hooks/recall'
import { bm25, current, poolOf, terms } from './eval/ranking'
import type { Doc, Term } from './eval/ranking'

const user = (text: string): SessionMessage => ({ role: 'user', text, toolUses: [] })
const said = (text: string): SessionMessage => ({ role: 'assistant', text, toolUses: [] })
const doc = (text: string, index: number): Doc => ({ text, body: text, time: index, index })
const ts = (q: string) => terms(q) as Term[]

describe('issue #20 ranking measurement', () => {
  // scripts/bench-bm25.ts flags a query whose recall() hits are not current's top; this pins the copy on both gates.
  test("current's first hit is recall()'s, with every term whole and with none", async () => {
    const rows = [
      said('alpha is mentioned here, and beta much later\nbeta'),
      said('alpha beta together on one line'),
      said('gamma-delta spelled apart: gamma then delta'),
      said('rare-word alone'),
      said('alpha beta again, newer'),
      user('which one?'),
    ]
    const c = liveTranscript(rows, rows.map((_, i) => i * 60_000), false, async () => 0)
    for (const q of ['alpha beta', 'rare-word gamma-delta zeta']) {
      const shown = (await recall(c, { query: q, limit: 1 })).text.match(/^\[(\S+?) ·/m)?.[1]
      expect(poolOf(c).find((d) => d.index === current(ts(q), poolOf(c)).ranked[0]!.index)?.ref).toBe(shown)
    }
  })

  test('BM25 keeps the whole-term gate: 101 inside 101047290 is not shard-101', () => {
    const docs = [doc('shard-101 checksum ck-1', 0), doc('101047290 checksum 101047290 checksum shard', 1)]
    expect(bm25(ts('shard-101 checksum'), docs).ranked.map((d) => d.index)).toEqual([0])
  })

  test('the noise floor drops a weak hit on a multi-term query only', () => {
    // A long block holding each term once scores under 20% of a short one holding each three times.
    const filler = Array.from({ length: 4000 }, (_, i) => `w${i}`).join(' ')
    const docs = [doc('alpha beta alpha beta alpha beta', 0), doc(`alpha ${filler} beta`, 1), ...Array.from({ length: 10 }, (_, i) => doc('x y z', i + 2))]
    expect(bm25(ts('alpha beta'), docs).ranked.map((d) => d.index)).toEqual([0])
    expect(bm25(ts('alpha'), docs).ranked.map((d) => d.index)).toEqual([0, 1])
  })
})
