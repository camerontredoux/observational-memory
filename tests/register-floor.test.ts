import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { BRIEF_NOTE, BRIEF_RECALL_NOTE, BRIEF_REF_NOTE, FLOOR_NOTE } from '../hooks/prompts'
import { originals, turn, CHUNK, at, world, pi, live, observationsIn, userMessagesIn, briefIn } from './harness'

// The floor: where the Observer's memory cannot stand, the rows leaving context are compiled by code into the session
// brief (hooks/vcc.ts) rather than handed to the built-in compaction.
describe('the floor', () => {
  const NOTE = BRIEF_NOTE + BRIEF_RECALL_NOTE

  test('on a short conversation with nothing to observe before the raw tail, the floor briefs the turns before the newest, with no Observer call', async ($, on) => {
    const clock = mock.clock(on)
    const { files } = world(on)
    const seen = pi(on)
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    const messages = [...turn('a', 'a', 100), ...turn('b', 'b', 100), ...turn('c', 'c', 100)]

    const result = await $.session.compact({ trigger: 'manual', messages })
    await clock.advance(5_000)

    expect(seen.prompts).toEqual([])
    expect(briefIn(result.messages![0]!.text)).toBe([FLOOR_NOTE, NOTE, '[Brief Transcript]', '- said: a', '- said: a done', '- said: b', '- said: b done'].join('\n'))
    expect(userMessagesIn(result.messages![0]!.text)).toEqual(['a', 'b'])
    expect(originals(result.messages?.slice(1))).toEqual(messages.slice(8)) // the newest turn stays raw
    expect(seen.logs).toContainEqual(expect.stringMatching(/^Compacted in 0 ms · memory 0 notes · 8 messages in a brief compiled by code \(nothing was observed yet\)$/))
    expect(seen.screen).toEqual([])
    const stats = JSON.parse(files['/stats/session-1.json']!) as { counts: Record<string, number>; metrics: Record<string, { sum: number }> }
    expect(stats.counts).toEqual({ 'compaction.manual.floor': 1, 'compaction.notPersistent': 1, 'compaction.notPersistent.manual': 1, 'compaction.notPersistent.short': 1 })
    expect(stats.metrics['compaction.manual.rowsBriefed']!.sum).toBe(8)
    expect(stats.metrics['compaction.manual.briefTokens']!.sum).toBeGreaterThan(0)
  })

  // A manual /compact soon after the last compaction: less than the whole chunk the background waits for lies before
  // the raw tail, so nothing was observed. The person waits on a manual compaction; an auto one observes as before.
  const SHORT = [...turn('a', 'a', 16_000), ...turn('b', 'b', 16_000)] // ~4k tokens before the raw tail, which starts at row 3

  test('a manual compaction with less than a chunk unobserved briefs it by code, with no Observer call', async ($, on) => {
    const clock = mock.clock(on)
    const { files } = world(on)
    const seen = pi(on)

    const result = await $.session.compact({ trigger: 'manual', messages: SHORT })
    await clock.advance(5_000)

    expect(seen.prompts).toEqual([])
    expect(briefIn(result.messages![0]!.text)).toStartWith(FLOOR_NOTE)
    expect(originals(result.messages?.slice(1))).toEqual(SHORT.slice(3))
    expect(seen.logs).toContain('Compacted in 0 ms · memory 0 notes · 3 messages in a brief compiled by code (too little to observe yet)')
    expect(seen.screen).toEqual([])
    const stats = JSON.parse(files['/stats/session-1.json']!) as { counts: Record<string, number>; metrics: Record<string, { sum: number }> }
    expect(stats.counts['compaction.manual.floor']).toBe(1)
    expect(stats.metrics['compaction.manual.syncCalls']!.sum).toBe(0)
  })

  test("a local slash command's rows stay out of the kept tail; a prompt command's echo, with no output after it, stays", async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on)
    const user = (text: string): SessionMessage => ({ role: 'user', text, toolUses: [] })
    const effort = [
      user('<local-command-caveat>Caveat: the command below was run directly.</local-command-caveat>'),
      user('<command-name>/effort</command-name>\n            <command-message>effort</command-message>\n            <command-args></command-args>'),
      user('<local-command-stdout>Set effort level to high</local-command-stdout>'),
    ]
    const skill = user('<command-message>review</command-message>\n<command-name>/review</command-name>\n<command-args>the parser</command-args>')
    const messages = [...SHORT.slice(0, 4), ...effort, skill, ...SHORT.slice(4)]

    const result = await $.session.compact({ trigger: 'manual', messages })

    expect(originals(result.messages?.slice(1))).toEqual([SHORT[3]!, skill, ...SHORT.slice(4)])
  })

  test('a reply that was thinking alone stays out of the kept tail', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on)
    const empty = (text: string): SessionMessage => ({ role: 'assistant', text, toolUses: [] })
    const messages = [...SHORT.slice(0, 4), empty(''), empty('(no content)'), ...SHORT.slice(4)]

    const result = await $.session.compact({ trigger: 'manual', messages })

    expect(originals(result.messages?.slice(1))).toEqual([SHORT[3]!, ...SHORT.slice(4)])
  })

  test('an auto compaction with less than a chunk unobserved still observes it on the spot', async ($, on) => {
    mock.clock(on)
    world(on)
    const seen = pi(on)

    const result = await $.session.compact({ trigger: 'auto', messages: SHORT })

    expect(seen.prompts).toHaveLength(1)
    expect(observationsIn(result.messages![0]!.text)).toContain('User: "a"')
    expect(briefIn(result.messages![0]!.text)).toBeUndefined()
  })

  test('a manual compaction with background observations since the last one cuts at the watermark, as before', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle() // [0, 4) observed
    await runTurn($, turn('c', 'c', 100), at(22, 15, 1))
    const before = seen.prompts.length
    const result = await $.session.compact({ trigger: 'manual', messages: [...history] })

    expect(seen.prompts).toHaveLength(before)
    expect(observationsIn(result.messages![0]!.text)).toContain('User: "a"')
    expect(briefIn(result.messages![0]!.text)).toBeUndefined()
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
  })

  test('a context that is the memory message alone leaves the floor nothing to compile: the built-in compaction runs, saying why', async ($, on) => {
    mock.clock(on)
    world(on)
    const seen = pi(on)
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    const first = await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', 100), ...turn('b', 'b', 100)] })

    const result = await $.session.compact({ trigger: 'manual', messages: [first.messages![0]!] })

    expect(result.messages?.map((m) => m.text)).toEqual(['built-in summary'])
    expect(seen.logs.at(-1)).toBe('nothing to compact after the memory message; using the built-in compaction')
    expect(seen.screen.at(-1)).toBe('Nothing to compact. Using built-in compaction')
  })

  test("a floor's brief is carried by later compactions: merged with the next floor's, kept whole once the Observer's memory stands again", async ($, on) => {
    mock.clock(on)
    world(on)
    const seen = pi(on)
    const first = await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', 100), ...turn('b', 'b', 100)] })
    const second = await $.session.compact({ trigger: 'manual', messages: [...first.messages!, ...turn('c', 'c', 100)] })
    const briefed = briefIn(second.messages![0]!.text)
    const third = await $.session.compact({ trigger: 'manual', messages: [...second.messages!, ...turn('d', 'd', CHUNK), ...turn('e', 'e', 8_000)] })

    expect(briefIn(first.messages![0]!.text)).toBe([FLOOR_NOTE, NOTE, '[Brief Transcript]', '- said: a', '- said: a done'].join('\n'))
    expect(briefed).toBe([FLOOR_NOTE, NOTE, '[Brief Transcript]', '- said: a', '- said: a done', '- said: b', '- said: b done'].join('\n'))
    expect(seen.prompts.length).toBeGreaterThan(0) // d was observed: no floor, the brief carried as it was
    expect(observationsIn(third.messages![0]!.text)).toContain('User: "d"')
    expect(briefIn(third.messages![0]!.text)).toBe(briefed!.slice(FLOOR_NOTE.length + 1))
  })

  test('an observed memory has no session brief', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on)
    const result = await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)] })
    expect(observationsIn(result.messages![0]!.text)).toContain('User: "a"')
    expect(result.messages![0]!.text).not.toContain('<session-brief>')
  })

  test('the files the observed rows changed are listed in the brief, and nothing else of those rows', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on)
    const edit = (s: SessionMessage): SessionMessage => ({ ...s, toolUses: s.toolUses.map((u) => ({ ...u, tool: 'Edit' })) })
    const [prompt, call, result, done] = turn('a', 'a', CHUNK)
    const messages = [prompt!, edit(call!), result!, done!, ...turn('b', 'b', 8_000)]

    const text = (await $.session.compact({ trigger: 'manual', messages })).messages![0]!.text

    expect(observationsIn(text)).toContain('User: "a"')
    expect(briefIn(text)).toBe([NOTE, '[Files And Changes]', '- Modified: /src/a.ts'].join('\n'))
  })

  test("the brief's lines name the om_recall block they came from when the transcript is known and the model can call om_recall", async ($, on) => {
    mock.clock(on)
    const { files } = world(on)
    pi(on)
    on('classic.Stop', () => ({}))
    let tools = [{ name: 'mcp__observational-memory__om_recall', description: 'Searches', mcp: true }]
    on('tool.list', () => ({ value: tools }))
    const row = (type: string, content: unknown) => JSON.stringify({ type, timestamp: '2026-09-22T12:00:00.000Z', message: { role: type, content } })
    files['/t/session-1.jsonl'] = [
      row('user', 'a'),
      row('assistant', [{ type: 'text', text: 'a' }, { type: 'tool_use', id: 't-a', name: 'Read', input: { file_path: '/src/a.ts' } }]),
      row('user', [{ type: 'tool_result', tool_use_id: 't-a', content: 'x', is_error: false }]),
      row('assistant', [{ type: 'text', text: 'a done' }]),
      row('user', 'b'),
    ].join('\n')
    await $.classic.Stop({ session_id: 'session-1', transcript_path: '/t/session-1.jsonl', stop_hook_active: false })
    const messages = [...turn('a', 'a', 1), ...turn('b', 'b', 100)]

    const known = briefIn((await $.session.compact({ trigger: 'manual', messages })).messages![0]!.text)
    tools = []
    const unoffered = briefIn((await $.session.compact({ trigger: 'manual', messages })).messages![0]!.text)

    expect(known).toBe(
      [
        FLOOR_NOTE,
        NOTE,
        BRIEF_REF_NOTE,
        '[Brief Transcript]',
        '- said: a (session-1:2.1)',
        '- said: a done (session-1:4)',
      ].join('\n'),
    )
    expect(unoffered).toBe([FLOOR_NOTE, BRIEF_NOTE, '[Brief Transcript]', '- said: a', '- said: a done'].join('\n'))
  })
})
