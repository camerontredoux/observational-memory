import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// The text of a drawn tree, one string per Text with its nested Texts inlined.
const texts = (node: unknown): string[] => {
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (!node || typeof node !== 'object') return []
  const n = node as { type?: string; children?: unknown[] }
  const children = (n.children ?? []).flatMap(texts)
  return n.type === 'Text' ? [children.join('')] : children
}

function world(on: On, store: Record<string, unknown>) {
  on('session.id', () => ({ value: 'session-1' }))
  on('store.get', ($, e) => ({ value: store[e.key] }))
  on('ui.panes', () => ({ value: [] }))
}
const draw = ($: Engine, agentId?: string) =>
  $.ui.render({
    surface: 'terminal',
    component: 'Pane',
    requestId: 'om-notes',
    props: { title: 'Observations', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: agentId ? { agentId } : {} },
  })

// /notes draws the ledger of the transcript in view: its constraints, then its observations under a header per day.
describe('the notes pane', () => {
  test('draws the main ledger by day, and an agent in view draws its own', async ($, on) => {
    world(on, {
      'ledger:session-1': {
        seq: 3,
        corrections: ['🔴 2026-09-22 09:00 User: "use rg"'],
        chunks: [],
        entries: [
          { id: 'o0', line: '🔴 2026-09-22 09:01 User asked for a pane' },
          { id: 'o1', line: '🟡 2026-09-22 09:05 Agent wrote notes.tsx', r: true },
          { id: 'o2', line: '🟢 2026-09-23 10:00 Tests passed' },
        ],
      },
      'ledger:session-1/a1': { seq: 1, corrections: [], chunks: [], entries: [{ id: 'o0', line: '🟢 2026-09-23 11:00 Subagent searched' }] },
    })

    expect(texts(await draw($))).toEqual([
      '3 observations, 1 constraints for this session',
      'Constraints in force',
      '🔴 2026-09-22 09:00 User: "use rg"',
      '2026-09-22',
      '🔴 09:01 User asked for a pane',
      '🟡 09:05 Agent wrote notes.tsx (condensed)',
      '2026-09-23',
      '🟢 10:00 Tests passed',
    ])
    expect(texts(await draw($, 'a1'))).toContain('🟢 11:00 Subagent searched')
  })

  test('an empty ledger says so', async ($, on) => {
    world(on, {})
    expect(texts(await draw($))[0]).toBe('No observations for this session yet.')
  })
})
