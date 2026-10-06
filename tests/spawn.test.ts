import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// Core stands in for the Agent tool: it records the prompt the subagent would run with.
function world(on: On, sessionId: string, store: Record<string, unknown>) {
  const seen: string[] = []
  on('session.id', () => ({ value: sessionId }))
  on('store.get', (_$, e) => ({ value: store[e.key] }))
  on('agent.spawn', (_$, e) => (seen.push(e.prompt), { model: 'haiku', agentId: 'a1' }))
  return seen
}
// `fork` and `workflow` are the engine's to fill; a test's call may carry them anyway.
const spawn = ($: Engine, extra: Record<string, unknown> = {}) => $.agent.spawn({ prompt: 'Read README.md.', ...extra } as never)
const HEADER = 'Constraints the user set in this session (follow them):'
const ledger = (corrections: string[], chunks: unknown[] = []) => ({ seq: 1, chunks, corrections, entries: [] })
const C1 = '🔴 2026-09-22 09:00 User: "keep auth tokens out of logs"'
const C2 = '🔴 2026-09-23 10:00 User: "never touch the migrations folder"'

describe('agent.spawn constraints', () => {
  test('constraints are appended in order, with those of waiting chunks last', async ($, on) => {
    const chunk = { from: 5, to: 9, hash: 'h', head: 'x', lines: [], corrections: ['🔴 2026-09-24 11:00 User: "no new deps"'] }
    const seen = world(on, 's-add', { 'ledger:s-add': ledger([C1, C2], [chunk]) })
    await spawn($)
    expect(seen).toEqual([`Read README.md.\n\n${HEADER}\n- User: "keep auth tokens out of logs"\n- User: "never touch the migrations folder"\n- User: "no new deps"`])
  })

  test('no ledger: the prompt is unchanged', async ($, on) => {
    const seen = world(on, 's-none', {})
    await spawn($)
    expect(seen).toEqual(['Read README.md.'])
  })

  test('no constraints: the prompt is unchanged', async ($, on) => {
    const seen = world(on, 's-empty', { 'ledger:s-empty': ledger([]) })
    await spawn($)
    expect(seen).toEqual(['Read README.md.'])
  })

  test('a fork is unchanged', async ($, on) => {
    const seen = world(on, 's-fork', { 'ledger:s-fork': ledger([C1]) })
    await spawn($, { fork: true, subagentType: 'fork' })
    expect(seen).toEqual(['Read README.md.'])
  })

  test('a workflow agent is unchanged', async ($, on) => {
    const seen = world(on, 's-wf', { 'ledger:s-wf': ledger([C1]) })
    await spawn($, { workflow: { runId: 'wf_1', agentIndex: 1 } })
    expect(seen).toEqual(['Read README.md.'])
  })

  test('past the cap the newest stay and a line counts the rest', async ($, on) => {
    const lines = Array.from({ length: 40 }, (_, i) => `🔴 2026-09-22 09:${String(i).padStart(2, '0')} User: "constraint number ${i} ${'x'.repeat(80)}"`)
    const seen = world(on, 's-cap', { 'ledger:s-cap': ledger(lines) })
    await spawn($)
    const block = seen[0]!.slice(seen[0]!.indexOf(HEADER))
    expect(block.length).toBeLessThanOrEqual(2_000)
    expect(block).toMatch(/\n- (\d+) older constraints left out\n/)
    const left = Number(block.match(/- (\d+) older/)![1])
    expect(block).not.toContain(`number ${left - 1} `)
    expect(block).toContain(`number ${left} `)
    expect(block).toContain('number 39 ')
  })
})
