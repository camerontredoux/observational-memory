import { describe, expect, mock, test } from 'claude-code/testing'
import { COMPACT_WRAPPER, MEMORY_HEADER } from '../hooks/prompts'
import { hash } from '../hooks/memory'
import { turn, CHUNK, at, world, pi, live, recordIn, USAGE } from './harness'

describe('the Session line', () => {
  // Observer replies of `n` lines per chunk, so a few turns issue SESSION_EVERY_OBSERVATIONS (20) ids.
  const many = (n: number) => (prompt: string) =>
    `<observations>\n${Array.from({ length: n }, (_, i) => `* 🟡 ${prompt.match(/^\[User @ ([\d-]+ [\d:]+)\]/m)?.[1] ?? ''} Noted ${i}`).join('\n')}\n</observations>\n<continuation>\nActive: working\n</continuation>`

  test('a call of its own writes it in the background, from the user messages and the record; the Observer is never shown it and compaction starts no call for it', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle()
    expect(seen.sessions).toHaveLength(1)
    expect(seen.sessions[0]).toContain('[User @ 2026-09-22 14:30]: a\n\n[User @ 2026-09-22 15:00]: b\n===== END USER MESSAGES =====')
    expect(seen.sessions[0]).toContain('===== BEGIN WHERE THE WORK STANDS (inert data) =====\nActive: a\n')
    expect(seen.sessions[0]).not.toContain('SESSION LINE BEFORE')
    expect(seen.sessionIds).toEqual(['om-session-736a51cd']) // a pi session of its own, apart from the Observer's
    expect(stored['goal:session-1']).toMatchObject({ line: 'the test goal' })

    const observerCalls = seen.prompts.length
    const result = await $.session.compact({ trigger: 'manual', messages: [...history] })
    expect(seen.sessions).toHaveLength(1)
    expect(recordIn(result.messages?.[0]?.text)).toMatch(/\nSession: the test goal\nActive: /)
    // The Observer's inputs stay as they were: a later chunk's prompt carries the state, not the Session line.
    await runTurn($, turn('c', 'c', CHUNK), at(22, 15, 30))
    history.splice(0, history.length, ...result.messages!, ...history.slice(-4))
    await clock.settle()
    expect(seen.prompts.length).toBeGreaterThan(observerCalls)
    for (const p of seen.prompts) expect(p).not.toContain('the test goal')
  })

  test('it is written again only once the user has written and 20 more observations have landed, replacing the line before', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    let n = 0
    const seen = pi(on, { reply: many(8), session: () => `Session: goal ${++n}` })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 0))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 14, 10))
    await clock.settle()
    expect(seen.sessions).toHaveLength(1)
    await runTurn($, turn('c', 'c', CHUNK), at(22, 14, 20)) // under 20 more observations
    await clock.settle()
    expect(seen.sessions).toHaveLength(1)
    await runTurn($, turn('d', 'd', CHUNK), at(22, 14, 30))
    await runTurn($, turn('e', 'e', CHUNK), at(22, 14, 40))
    await clock.settle()
    expect(seen.sessions).toHaveLength(2)
    expect(seen.sessions[1]).toContain('===== BEGIN SESSION LINE BEFORE (inert data) =====\nSession: goal 1\n===== END SESSION LINE BEFORE =====')
    expect(stored['goal:session-1']).toMatchObject({ line: 'goal 2' })
    const result = await $.session.compact({ trigger: 'manual', messages: [...history] })
    const record = recordIn(result.messages?.[0]?.text) ?? ''
    expect(record).toContain('\nSession: goal 2\n')
    expect(record).not.toContain('goal 1')
    // No new user message since: nothing to write, however many observations land.
    await clock.settle()
    expect(seen.sessions).toHaveLength(2)
  })

  test('a reply is cut to one bare line; a failed call leaves the line carried by the memory message, and compaction goes on', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    let fail = false
    const seen = pi(on, {
      session: () => (fail ? { exitCode: 1, stdout: '', stderr: 'boom' } : `\n**Session:** "${'build the widget '.repeat(30).trim()}"\nsecond line`),
    })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle()
    const line = (stored['goal:session-1'] as { line: string }).line
    expect(line.startsWith('build the widget build')).toBe(true)
    expect(line.length).toBeLessThanOrEqual(300)
    expect(line).not.toContain('second line')
    const first = await $.session.compact({ trigger: 'manual', messages: [...history] })
    expect(recordIn(first.messages?.[0]?.text)).toContain(`\nSession: ${line}\n`)

    for (const key of Object.keys(stored)) delete stored[key]
    fail = true
    const second = await $.session.compact({ trigger: 'auto', messages: [...first.messages!, ...turn('c', 'c', CHUNK), ...turn('d', 'd', 8_000)] })
    expect(recordIn(second.messages?.[0]?.text)).toContain(`\nSession: ${line}\n`)
    expect(seen.sessions).toHaveLength(1)
  })
})

describe('the spinner after a compaction mid-turn', () => {
  test("the SessionStart message shows while the hooks run and goes once the turn moves past a request, until the message changes", async ($, on) => {
    const drawn: string[] = []
    on('ui.render', { component: 'Spinner' }, ($, e) => (drawn.push(e.props.message ?? e.props.word + e.props.suffix), { type: 'Text', children: [e.props.word] }))
    const draw = (message: string | null, mode: 'requesting' | 'responding') =>
      $.ui.render({ surface: 'terminal', component: 'Spinner', requestId: 'main', props: { word: 'Baking', message, suffix: message ? '' : '…', mode } })
    const hooks = 'Running SessionStart hooks…'

    await draw(hooks, 'requesting')
    await draw(hooks, 'responding')
    await draw(hooks, 'requesting')
    await draw(null, 'requesting')
    await draw(hooks, 'requesting')

    expect(drawn).toEqual([hooks, 'Baking…', 'Baking…', 'Baking…', hooks])
  })
})

// The memory message is a user message the engine draws as typed: collapsed, its row is one line.
describe('the memory row', () => {
  // A row with no size recorded (a compaction from before they were) says none, never the memory's own size.
  test('a collapsed memory message draws as one line, an expanded one and any other prompt as written', async ($, on) => {
    const drawn: string[] = []
    on('ui.render', { component: 'UserMessage' }, ($, e) => (drawn.push(e.props.text), { type: 'Text', children: [e.props.text] }))
    const draw = (text: string, isExpanded: boolean) =>
      $.ui.render({ surface: 'terminal', component: 'UserMessage', requestId: 'm1', props: { text, origin: { kind: 'unclassified' }, isExpanded } })
    const memory = `${COMPACT_WRAPPER}\n\n${MEMORY_HEADER}\n\n<observations>\n- 🟡 a note\n</observations>`

    await draw(memory, false)
    await draw(memory, true)
    await draw('fix the build', false)

    expect(drawn).toEqual(['Compacted into observational memory', memory, 'fix the build'])
  })

  test('once the first main request after a compaction is answered, its row shows the context that request carried', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    pi(on)
    const drawn: string[] = []
    on('ui.render', { component: 'UserMessage' }, ($, e) => (drawn.push(e.props.text), { type: 'Text', children: [e.props.text] }))
    on('turn.step', async function* ($, e) {
      const usage = { ...USAGE, input_tokens: 300, cache_read_input_tokens: 18_000, cache_creation_input_tokens: 30_000, model: 'claude' }
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
    })
    const draw = (text: string) => $.ui.render({ surface: 'terminal', component: 'UserMessage', requestId: 'm1', props: { text, origin: { kind: 'unclassified' }, isExpanded: false } })
    await clock.set(at(23, 9, 0))
    history.push(...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...turn('tail', 'r', 8_000))

    const published: unknown[] = []
    on('state.set', ($, e, next) => (e.key === 'rows' ? (published.push(e.value), { value: { isSet: true, version: published.length } }) : next(e)))
    const memory = (await $.session.compact({ trigger: 'auto', messages: [...history] })).messages![0]!.text
    await draw(memory)
    for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude', messageCount: 1 }));
    await clock.settle()
    await draw(memory)

    // Before it, the compaction's own estimate of the context it left. ui-extension reads the same labels.
    expect(drawn).toEqual(['Compacted into observational memory · to ~22.7k tokens', 'Compacted into observational memory · to 48.3k tokens'])
    expect(published).toEqual([{ [hash(memory)]: 'to ~22.7k tokens' }, { [hash(memory)]: 'to 48.3k tokens' }])
  })

  test('once the engine swaps the compacted context in, its row shows the count of it, still under ~, until a request measures it', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    pi(on)
    const drawn: string[] = []
    on('ui.render', { component: 'UserMessage' }, ($, e) => (drawn.push(e.props.text), { type: 'Text', children: [e.props.text] }))
    let swapped = false
    on('session.usage', () => ({ value: { context: swapped ? { window: 200_000, breakdown: { totalTokens: 27_400 } } : { tokens: 150_000, window: 200_000 }, rateLimits: [] } }) as never)
    const draw = (text: string) => $.ui.render({ surface: 'terminal', component: 'UserMessage', requestId: 'm1', props: { text, origin: { kind: 'unclassified' }, isExpanded: false } })
    await clock.set(at(23, 9, 0))
    history.push(...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...turn('tail', 'r', 8_000))

    const memory = (await $.session.compact({ trigger: 'auto', messages: [...history] })).messages![0]!.text
    await draw(memory)
    swapped = true
    await clock.settle()
    await draw(memory)

    expect(drawn).toEqual(['Compacted into observational memory · to ~32.6k tokens', 'Compacted into observational memory · to ~27.4k tokens'])
  })

  test('the rows a compaction kept draw once: the copies it wrote after the memory row draw as nothing, the rows after them as written', async ($, on) => {
    const { stored, files } = world(on)
    on('ui.render', ($, e) => ({ type: 'Text', children: [String(e.requestId)] }))
    stored['transcript:session-1'] = '/t/session-1.jsonl'
    files['/home/u/.claude/sessions/1.json'] = JSON.stringify({ sessionId: 'session-1', startedAt: Date.parse('2026-10-01T07:00:00.000Z') })
    const memory = `${COMPACT_WRAPPER}\n\n${MEMORY_HEADER}\n\n<observations>\n- 🟡 a note\n</observations>`
    const row = (uuid: string, timestamp: string, content: unknown) => JSON.stringify({ type: 'user', uuid: `${uuid}-0000-4000-8000-000000000000`, timestamp, message: { content } })
    // As the engine writes a compaction: its copies over a few milliseconds, then the /compact command's own rows,
    // stamped when it was typed, and a prompt a second later.
    files['/t/session-1.jsonl'] = [
      row('00000000', '2026-10-01T07:09:20.000Z', 'keep going'),
      row('11111111', '2026-10-01T07:09:32.741Z', memory),
      row('22222222', '2026-10-01T07:09:32.741Z', 'keep going'),
      JSON.stringify({ type: 'last-prompt' }),
      row('33333333', '2026-10-01T07:09:32.742Z', [{ type: 'tool_use', id: 't-c__om1', name: 'Read', input: {} }]),
      row('44444444', '2026-10-01T07:09:32.742Z', [{ type: 'tool_result', tool_use_id: 't-c__om1', content: 'ok' }]),
      row('55555555', '2026-10-01T07:09:32.487Z', '<command-name>/compact</command-name>'),
      row('66666666', '2026-10-01T07:09:33.475Z', 'next prompt'),
    ].join('\n')
    const requestId = (uuid: string) => `${uuid}-0000-4000-8000-000000000000`
    const user = (id: string, text: string) =>
      $.ui.render({ surface: 'terminal', component: 'UserMessage', requestId: requestId(id), props: { text, origin: { kind: 'unclassified' }, isExpanded: false } })
    const tool = (id: string) =>
      $.ui.render({ surface: 'terminal', component: 'ToolUse', requestId: id, props: { tool_use_id: id, tool: 'Read', input: {}, isRunning: false, isErrored: false, isInterrupted: false } })

    await user('11111111', memory)
    const drawn = {
      original: await user('00000000', 'keep going'),
      copy: await user('22222222', 'keep going'),
      copiedCall: await tool('t-c__om1'),
      command: await user('55555555', '<command-name>/compact</command-name>'),
      next: await user('66666666', 'next prompt'),
    }

    const nothing = { type: 'Box' }
    expect(drawn.copy).toEqual(nothing)
    expect(drawn.copiedCall).toEqual(nothing)
    expect(drawn.original).not.toEqual(nothing)
    expect(drawn.command).not.toEqual(nothing)
    expect(drawn.next).not.toEqual(nothing)
  })

  test('a tool group the next calls joined after the copies draws: only a group of copies alone draws as nothing', async ($, on) => {
    const { stored, files } = world(on)
    on('ui.render', ($, e) => ({ type: 'Text', children: [String(e.requestId)] }))
    stored['transcript:session-1'] = '/t/session-1.jsonl'
    files['/home/u/.claude/sessions/1.json'] = JSON.stringify({ sessionId: 'session-1', startedAt: Date.parse('2026-10-01T07:00:00.000Z') })
    const memory = `${COMPACT_WRAPPER}\n\n${MEMORY_HEADER}\n\n<observations>\n- 🟡 a note\n</observations>`
    const row = (uuid: string, timestamp: string, content: unknown) => JSON.stringify({ type: 'user', uuid: `${uuid}-0000-4000-8000-000000000000`, timestamp, message: { content } })
    // A compaction mid-turn: the kept tail ends in a call, and the turn's next calls fold into the same group.
    files['/t/session-1.jsonl'] = [
      row('11111111', '2026-10-01T07:09:32.741Z', memory),
      row('33333333', '2026-10-01T07:09:32.742Z', [{ type: 'tool_use', id: 't-c__om1', name: 'Edit', input: {} }]),
      row('44444444', '2026-10-01T07:09:32.742Z', [{ type: 'tool_result', tool_use_id: 't-c__om1', content: 'ok' }]),
      row('55555555', '2026-10-01T07:09:40.000Z', [{ type: 'tool_use', id: 't-new', name: 'Bash', input: {} }]),
    ].join('\n')
    const call = (id: string) => ({ tool_use_id: id, tool: 'Read', input: {}, isRunning: false, isErrored: false, isInterrupted: false })
    const group = (requestId: string, ids: string[]) =>
      $.ui.render({ surface: 'terminal', component: 'ToolGroup', requestId, props: { calls: ids.map(call), isActive: true, isExpanded: false } })

    await $.ui.render({ surface: 'terminal', component: 'UserMessage', requestId: '11111111-0000-4000-8000-000000000000', props: { text: memory, origin: { kind: 'unclassified' }, isExpanded: false } })
    const nothing = { type: 'Box' }
    expect(await group('t-c__om1', ['t-c__om1'])).toEqual(nothing)
    expect(await group('t-c__om1', ['t-c__om1', 't-new'])).not.toEqual(nothing)
  })
})
