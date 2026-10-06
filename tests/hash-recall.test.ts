import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, PromptAutocompleteInput, PromptAutocompleteResult } from 'claude-code'
import { at, live, pi, turn, CHUNK, world as harness } from './harness'

// Core adds no rows of its own on this event: nothing beneath the plugins answers it unless a test does.
// `theirs`: the rows `next(e)` gives, as another plugin's.
const core = (on: On, theirs: { text: string; label?: string }[] = []) => on('prompt.autocomplete', () => ({ suggestions: theirs }))
// A session of its own per test, so no index another test warmed answers for it; `gets` counts the store reads.
function world(on: On, sessionId: string, store: Record<string, unknown>, theirs?: { text: string; label?: string }[]) {
  const gets = { n: 0 }
  core(on, theirs)
  on('session.id', () => ({ value: sessionId }))
  on('store.get', ($, e) => (gets.n++, { value: store[e.key] }))
  on('store.set', ($, e) => ((store[e.key] = e.value), { value: undefined }))
  on('store.keys', () => ({ value: Object.keys(store) }))
  on('store.delete', ($, e) => (delete store[e.key], { value: undefined }))
  return gets
}
// The 2.1.292 declarations leave `autocomplete` off a test's `$.prompt`, though the engine raises it there.
type Raise = { autocomplete: (e: PromptAutocompleteInput) => Promise<PromptAutocompleteResult> }
const ask = ($: Engine, token: string) => ($.prompt as unknown as Raise).autocomplete({ text: `see ${token}`, cursor: 4 + token.length, token, start: 4 })
const texts = async ($: Engine, token: string) => (await ask($, token)).suggestions.map((s) => s.text)

const LEDGER = {
  seq: 12,
  chunks: [],
  corrections: ['🔴 2026-09-22 09:00 User: "keep auth tokens out of logs"', '🔴 2026-09-21 08:00 User: "auth goes through the proxy" (this replaces the earlier constraint "auth is direct")'],
  entries: [
    { id: 'o0', line: '🟢 2026-09-22 10:00 Agent read authentication docs' },
    { id: 'o1', line: '🔴 2026-09-22 09:30 User asked to fix auth token refresh' },
    { id: 'o2', line: '🟡 2026-09-20 12:00 Auth only flow drafted', r: true },
    { id: 'o3', line: '🔴 2026-09-23 11:00 User asked to log auth errors' },
    { id: 'o4', line: '✅ 2026-09-23 12:00 Auth tests pass' },
    { id: 'o5', line: 'Auth note with no marker or time' },
    { id: 'o6', line: '🟡 2026-09-23 13:00 Unrelated line' },
    { id: 'o7', line: '🟢 2026-09-22 10:00 Agent read auth config' },
    { id: 'o8', line: '🟢 2026-09-19 10:00 Old auth idea' },
    { id: 'o9', line: '🔴 2026-09-22 09:05 User: "keep auth tokens out of logs"' },
  ],
}

describe('# recall', () => {
  test('#auth gives the matching lines: constraints first, then by marker, then newest, at most 8', async ($, on) => {
    world(on, 'hr-rank', { 'ledger:hr-rank': LEDGER })
    const { suggestions } = await ask($, '#auth')
    expect(suggestions).toEqual([
      { text: 'User: "keep auth tokens out of logs" ', label: '🔴 User: "keep auth tokens out of logs"', description: '2026-09-22 09:00 · constraint' },
      { text: 'User: "auth goes through the proxy" ', label: '🔴 User: "auth goes through the proxy"', description: '2026-09-21 08:00 · constraint' },
      { text: 'User asked to log auth errors ', label: '🔴 User asked to log auth errors', description: '2026-09-23 11:00' },
      { text: 'User asked to fix auth token refresh ', label: '🔴 User asked to fix auth token refresh', description: '2026-09-22 09:30' },
      { text: 'Auth only flow drafted ', label: '🟡 Auth only flow drafted', description: '2026-09-20 12:00 · condensed' },
      { text: 'Agent read auth config ', label: '🟢 Agent read auth config', description: '2026-09-22 10:00' },
      { text: 'Agent read authentication docs ', label: '🟢 Agent read authentication docs', description: '2026-09-22 10:00' },
      { text: 'Old auth idea ', label: '🟢 Old auth idea', description: '2026-09-19 10:00' },
    ])
  })

  test('#auth-tok matches "auth token" and not "auth only"; #AUTH matches like #auth', async ($, on) => {
    world(on, 'hr-words', { 'ledger:hr-words': { ...LEDGER, corrections: [] } })
    expect(await texts($, '#auth-tok')).toContain('User asked to fix auth token refresh ')
    expect(await texts($, '#auth-tok')).not.toContain('Auth only flow drafted ')
    expect(await texts($, '#AUTH')).toEqual(await texts($, '#auth'))
  })

  test('a line with no marker ranks last, and one with no time gives only its tag', async ($, on) => {
    const entries = [{ id: 'o0', line: 'Auth note with no marker or time', r: true }, { id: 'o1', line: '✅ 2026-09-23 12:00 Auth tests pass' }]
    world(on, 'hr-bare', { 'ledger:hr-bare': { seq: 2, chunks: [], corrections: [], entries } })
    expect((await ask($, '#auth')).suggestions).toEqual([
      { text: 'Auth tests pass ', label: '✅ Auth tests pass', description: '2026-09-23 12:00' },
      { text: 'Auth note with no marker or time ', label: 'Auth note with no marker or time', description: 'condensed' },
    ])
  })

  test('a row taken before a space adds no space of its own', async ($, on) => {
    world(on, 'hr-space', { 'ledger:hr-space': LEDGER })
    const { suggestions } = await ($.prompt as unknown as Raise).autocomplete({ text: 'see #prox now', cursor: 9, token: '#prox', start: 4 })
    expect(suggestions.map((s) => s.text)).toEqual(['User: "auth goes through the proxy"'])
  })

  test('#, ##, #123 and a word that matches nothing give the other plugins\' rows unchanged', async ($, on) => {
    const theirs = { suggestions: [{ text: '#123', label: 'issue 123' }] }
    world(on, 'hr-none', { 'ledger:hr-none': LEDGER }, theirs.suggestions)
    for (const token of ['#', '##', '#123', '#zzz']) expect(await ask($, token)).toEqual(theirs)
  })

  test('another plugin\'s rows come first, this plugin\'s after them', async ($, on) => {
    world(on, 'hr-order', { 'ledger:hr-order': LEDGER }, [{ text: '#authors' }])
    const rows = await texts($, '#auth')
    expect(rows[0]).toBe('#authors')
    expect(rows).toHaveLength(9)
  })

  test('a replaced-constraint note is not in the text; a fresh session with no ledger gives nothing', async ($, on) => {
    world(on, 'hr-note', { 'ledger:hr-note': LEDGER })
    expect(await texts($, '#proxy')).toEqual(['User: "auth goes through the proxy" '])
    expect(await texts($, '#direct')).toEqual([])
  })

  test('no store call when the index is warm, and one in all for several keystrokes from cold', async ($, on) => {
    const gets = world(on, 'hr-cold', { 'ledger:hr-cold': LEDGER })
    await Promise.all([ask($, '#a'), ask($, '#au'), ask($, '#aut')])
    expect(gets.n).toBe(1)
    await ask($, '#auth')
    await ask($, '#proxy')
    expect(gets.n).toBe(1)
  })

  test('no ledger at all is cached as an empty index, read once', async ($, on) => {
    const gets = world(on, 'hr-empty', {})
    expect(await texts($, '#a')).toEqual([])
    expect(await texts($, '#au')).toEqual([])
    expect(gets.n).toBe(1)
  })

  test('a subagent\'s ledger lines never show', async ($, on) => {
    world(on, 'hr-sub', { 'ledger:hr-sub': { seq: 0, chunks: [], corrections: [], entries: [] }, 'ledger:hr-sub/a1': { seq: 1, chunks: [], corrections: [], entries: [{ id: 'o0', line: '🔴 2026-09-23 11:00 Subagent found the auth bug' }] } })
    expect(await texts($, '#auth')).toEqual([])
  })

  // The Observer's background commit (saveLedger), driven through the pi stub as the register tests do.
  test('a ledger commit updates the rows the next keystroke sees, and /clear drops them', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = harness(on)
    core(on)
    pi(on, { reply: (prompt) => (prompt.includes(']: a') ? '<observations>\n* 🔴 2026-09-22 14:30 User asked about auth tokens\n</observations>' : '<observations>\n</observations>') })
    const runTurn = live(on, clock, history)
    await runTurn($, turn('a', 'a', 8_000), at(22, 14, 0))
    await clock.settle()
    expect(await texts($, '#auth')).toEqual([]) // warm, empty: nothing observed yet
    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await clock.settle()
    expect(await texts($, '#auth')).toEqual(['User asked about auth tokens '])
    await $.session.end({ reason: 'clear', sessionId: 'session-1', resume: { id: 'session-1' } })
    expect(await texts($, '#auth')).toEqual([])
  })
})
