import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, SessionMessage } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { TRUNCATED_ROW } from '../hooks/register'
import { clearedResult, isCleared, maskTail, rowHash, unmask } from '../hooks/rows'
import { omissionMarker } from '../hooks/memory'
import { isMemoryText } from '../hooks/recall'
import { call, CHUNK, at, world, pi, live } from './harness'
import type { Ledger } from './harness'

// A screenshot as a Read hands it back: no text, the image in the stored record.
const SHOT = { type: 'image', file: { base64: 'iVBORw0KGgo=', type: 'image/png', originalSize: 90_000, dimensions: { displayWidth: 1000, displayHeight: 750 } } }
const shot = (id: string): SessionMessage[] => [
  { role: 'assistant', text: '', toolUses: [{ tool_use_id: id, tool: 'Read', input: { file_path: `/shots/${id}.png` } }] },
  { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: id, text: '', isError: false, result: SHOT }] },
]

// Three turns, the first two observed in the background: a failed Bash call with a long output and a screenshot,
// then fourteen Reads of ~2k tokens, then a screenshot and a small Read.
async function session($: Engine, on: On, usage?: unknown) {
  if (usage) on('session.usage', () => ({ value: usage }) as never)
  const clock = mock.clock(on)
  const w = world(on)
  const seen = pi(on)
  const runTurn = live(on, clock, w.history)
  await runTurn(
    $,
    [
      { role: 'user', text: 'run the tests', toolUses: [] },
      { role: 'assistant', text: 'running', toolUses: [{ tool_use_id: 'bash-1', tool: 'Bash', input: { command: 'npm test -- --reporter verbose\necho done' } }] },
      { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'bash-1', text: `FAIL src/a.test.ts: boom\n${'x'.repeat(CHUNK)}`, isError: true }] },
      ...shot('shot-1'),
      { role: 'assistant', text: 'it failed', toolUses: [] },
    ],
    at(22, 14, 0),
  )
  await runTurn($, [{ role: 'user', text: 'read the files', toolUses: [] }, ...Array.from({ length: 14 }, (_, n) => call(n, 8_000)).flat(), { role: 'assistant', text: 'read', toolUses: [] }], at(22, 14, 10))
  await runTurn($, [{ role: 'user', text: 'look again', toolUses: [] }, ...shot('shot-2'), ...call(20, 100), { role: 'assistant', text: 'looked', toolUses: [] }], at(22, 14, 20))
  await clock.settle()
  const watermark = (w.stored['ledger:session-1'] as Ledger).watermark.to
  // The engine stamps a handle on each message it hands the hook.
  const context = w.history.map((m, i) => ({ ...m, handle: `h${i}` }))
  return { ...w, clock, seen, runTurn, watermark, context }
}

const results = (rows: readonly SessionMessage[]) => rows.flatMap((m, i) => (m.toolResults ?? []).map((r) => ({ i, ...r })))

describe('register: truncation pass', () => {
  test('on auto, the observed results outside the newest 10 calls and every image become stubs; the other rows keep their handles', async ($, on) => {
    const { context, watermark, seen, stored } = await session($, on)
    const ids = context.flatMap((m) => m.toolUses.map((u) => u.tool_use_id))
    const recent = new Set(ids.slice(-10))
    // The scenario holds an observed result among the newest calls, so keeping them is tested.
    expect(results(context).some((r) => r.i < watermark && recent.has(r.tool_use_id))).toBe(true)

    const result = await $.session.compact({ trigger: 'auto', messages: context })

    const rows = result.messages!
    expect(rows).toHaveLength(context.length)
    for (const r of results(rows)) {
      const image = r.tool_use_id.startsWith('shot-')
      expect([r.tool_use_id, isCleared(r.text)]).toEqual([r.tool_use_id, image || (r.i < watermark && !recent.has(r.tool_use_id))])
    }
    // Rows that changed come back without their handle, to be rebuilt; every other row keeps it, as it was.
    rows.forEach((m, i) => {
      const changed = (m.toolResults ?? []).some((r) => isCleared(r.text))
      expect([i, m.handle]).toEqual([i, changed ? undefined : `h${i}`])
      if (!changed) expect(m).toEqual(context[i])
    })
    expect(rows.filter((m) => m.role === 'assistant').every((m) => m.handle !== undefined)).toBe(true)
    expect(rows.filter((m) => m.role === 'user' && !m.toolResults?.length).every((m) => m.handle !== undefined)).toBe(true)
    expect(rows.some((m) => isMemoryText(m.text))).toBe(false) // no memory message: nothing was compacted

    // The stubs keep the call's bones.
    const byId = new Map(results(rows).map((r) => [r.tool_use_id, r.text]))
    expect(byId.get('bash-1')).toMatch(/^\n\.\.\. \[~\d+ tokens omitted; om_recall can retrieve the full result\] \.\.\.\n\[Bash npm test -- --reporter verbose · error: FAIL src\/a\.test\.ts: boom\]$/)
    expect(byId.get('shot-2')).toMatch(/\[Read \/shots\/shot-2\.png · screenshot cleared\]$/)
    expect(byId.get('c0')).toMatch(/\[Read \/src\/f0\.ts · ok\]$/)

    const shown = seen.screen.filter((l) => l.startsWith(TRUNCATED_ROW))
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatch(new RegExp(`^${TRUNCATED_ROW} · \\d+\\.\\dk tokens$`))
    expect(seen.logs).toContainEqual(expect.stringMatching(/^truncation pass: \d+ rows, base 0, watermark \d+, \d+ results to clear \(2 images\), 10 recent calls kept, context ~\d+ → ~\d+ tokens \(\d+ cleared, share 0\.\d+\), truncates: clears ≥ 0\.25 of the context, \d+ ms$/))
    const passes = stored['truncations:session-1'] as { cleared: number; images: number; tokensSaved: number; contextBefore: number }[]
    expect(passes).toHaveLength(1)
    expect(passes[0]).toMatchObject({ images: 2, cleared: results(rows).filter((r) => isCleared(r.text)).length })
    expect(shown[0]).toBe(`tool calls truncated · ${(passes[0]!.tokensSaved / 1000).toFixed(1)}k tokens`)
    expect(passes[0]!.tokensSaved / passes[0]!.contextBefore).toBeGreaterThanOrEqual(0.25)
  })

  test('below the share it falls through to the compaction unchanged', async ($, on) => {
    // The session measures a context far larger than the rows the pass would clear.
    const { context, seen, stored } = await session($, on, { context: { tokens: 400_000, window: 1_000_000 }, rateLimits: [] })

    const result = await $.session.compact({ trigger: 'auto', messages: context })

    expect(isMemoryText(result.messages![0]!.text)).toBe(true)
    expect(seen.logs).toContainEqual(expect.stringMatching(/, context ~400000 → ~\d+ tokens \(\d+ cleared, share 0\.0\d+\), compacts: clears < 0\.25 of the context, /))
    expect(seen.screen.filter((l) => l.startsWith(TRUNCATED_ROW))).toEqual([])
    expect(stored['truncations:session-1']).toBeUndefined()
  })

  test('a manual compaction runs no truncation pass', async ($, on) => {
    const { context, seen } = await session($, on)

    const result = await $.session.compact({ trigger: 'manual', messages: context })

    expect(isMemoryText(result.messages![0]!.text)).toBe(true)
    expect(seen.logs.filter((l) => l.startsWith('truncation pass'))).toEqual([])
  })

  test('a second auto pass with nothing left to clear compacts, its rows matched to the ledger through the cleared results', async ($, on) => {
    const { context, history, seen, runTurn, stored } = await session($, on)
    const first = await $.session.compact({ trigger: 'auto', messages: context })
    // The engine writes the rebuilt rows after the ones it had; the context reads as the pass left it.
    history.push(...first.messages!.map(({ handle: _, ...m }) => m))
    const calls = seen.prompts.length

    await runTurn($, [{ role: 'user', text: 'and now', toolUses: [] }, { role: 'assistant', text: 'ok', toolUses: [] }], at(22, 14, 30))
    const second = await $.session.compact({ trigger: 'auto', messages: [...first.messages!, ...history.slice(-2)] })

    expect(isMemoryText(second.messages![0]!.text)).toBe(true)
    expect(seen.logs).toContainEqual(expect.stringMatching(/^truncation pass: .*, compacts: (nothing to clear|clears < 0\.25 of the context), /))
    expect(seen.logs.filter((l) => l.includes('restarting the ledger'))).toEqual([])
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    expect(seen.prompts.length).toBe(calls)
    expect(stored['truncations:session-1']).toHaveLength(1)
  })

  test('unmask reads a cleared result whole again from the history, an image whose text was empty included', () => {
    const original: SessionMessage = { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'c1', text: 'y'.repeat(4_000), isError: false }, { tool_use_id: 's1', text: '', isError: false, result: SHOT }] }
    const use = { tool_use_id: 'c1', tool: 'Read', input: { file_path: '/src/a.ts' } }
    const cleared: SessionMessage = { ...original, toolResults: original.toolResults!.map((r) => clearedResult(r, use, 1_000)) }
    expect(rowHash(cleared)).not.toBe(rowHash(original))

    // As the history holds them after a pass: the original, then the rebuilt row.
    const [restored] = unmask([cleared], [original, cleared])

    expect(rowHash(restored!)).toBe(rowHash(original))
    expect(restored!.toolResults!.map((r) => r.text)).toEqual(['y'.repeat(4_000), ''])
  })

  test('unmask reads a cut result whole again though it quotes the marker itself, as om_recall output does', () => {
    // The quoted marker sits in the head maskTail keeps, so the cut reads it before its own.
    const quoting = `${'a'.repeat(300)}${omissionMarker(500, 'result')}${'b'.repeat(4_000)}`
    const rows: SessionMessage[] = ['q', 'n1', 'n2', 'n3'].map((id) => ({ role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: id, text: id === 'q' ? quoting : 'ok', isError: false }] }))
    const masked = maskTail(rows)
    expect(masked[0]!.toolResults![0]!.text.length).toBeLessThan(quoting.length)

    const [restored] = unmask(masked, rows)

    expect(restored!.toolResults![0]!.text).toBe(quoting)
  })
})
