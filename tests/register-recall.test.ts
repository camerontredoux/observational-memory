import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { turn, CHUNK, at, world, ran, pi, live, gates, nextStepIn, userMessagesIn, stampOf, steps, call, readsIn } from './harness'
import type { Ledger } from './harness'

// Om_recall over the transcript, mid-turn observation and launch briefs.
describe('register: recall', () => {
  test('om_recall after a resume reads the transcript file for the history before the compaction', async ($, on) => {
    mock.clock(on)
    const { history, files, reads } = world(on)
    on('classic.Stop', () => ({}))
    const jsonl = [
      { type: 'user', timestamp: '2026-09-22T12:00:00.000Z', message: { role: 'user', content: 'remember the KIWI-42 marker' } },
      { type: 'assistant', timestamp: '2026-09-22T12:01:00.000Z', message: { role: 'assistant', content: [{ type: 'text', text: 'noted' }, { type: 'tool_use', id: 'u1', name: 'Bash', input: { command: 'echo KIWI-42' } }] } },
      { type: 'user', timestamp: '2026-09-22T12:01:10.000Z', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'u1', content: 'KIWI-42', is_error: false }] } },
      { type: 'system', subtype: 'compact_boundary' },
      { type: 'user', isSidechain: true, message: { role: 'user', content: 'KIWI-42 in a subagent' } },
      { type: 'user', timestamp: '2026-09-22T13:00:00.000Z', message: { role: 'user', content: 'where is KIWI-42?' } },
    ]
    files['/t/session-1.jsonl'] = jsonl.map((r) => JSON.stringify(r)).join('\n') + '\n{"type":"user","mess'
    // What `$.session.messages()` answers after --resume: rows since the compaction only.
    history.push(
      { role: 'user', text: 'This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\nSummary:\nold', toolUses: [] },
      { role: 'user', text: 'where is KIWI-42?', toolUses: [] },
    )

    await $.classic.Stop({ session_id: 'session-1', transcript_path: '/t/session-1.jsonl', stop_hook_active: false })
    const found = String((await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'KIWI-42' })).result)

    expect(reads.filter((p) => p.startsWith('/t/'))).toEqual(['/t/session-1.jsonl'])
    expect(found).toBe(
      '3 match(es) for "KIWI-42" in 4 blocks of 1 transcript file.\n' +
        `[session-1:1 · ${stampOf('2026-09-22T12:00:00.000Z')} · user] 1 line\n  1: remember the KIWI-42 marker\n` +
        `[session-1:2.2 · ${stampOf('2026-09-22T12:01:00.000Z')} · Bash call] 1 line\n  1: command: echo KIWI-42\n` +
        `[session-1:3 · ${stampOf('2026-09-22T12:01:10.000Z')} · Bash result] 1 line\n  1: KIWI-42\n` +
        'Only if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "session-1:3", "lines": "1-1"}.',
    )
  })

  test('om_recall reads a moved session from both its files, a file over the fs limit through cat, and counts the calls', async ($, on) => {
    const clock = mock.clock(on)
    const { files, reads } = world(on)
    on('classic.Stop', () => ({}))
    const OLD = 'aaaaaaaa-1111-4111-8111-111111111111'
    const NEW = 'bbbbbbbb-2222-4222-8222-222222222222'
    const row = (type: string, iso: string, content: unknown) => JSON.stringify({ type, timestamp: iso, message: { role: type, content } })
    files[`/t/${OLD}.jsonl`] = [
      row('user', '2026-09-22T12:00:00.000Z', 'remember the FIG-8 marker'),
      JSON.stringify({ type: 'continued-in', sessionId: OLD, continuedInSessionId: NEW }),
    ].join('\n')
    const big = [row('user', '2026-09-22T13:00:00.000Z', 'where is FIG-8?'), row('assistant', '2026-09-22T13:01:00.000Z', [{ type: 'text', text: 'searching' }])].join('\n')
    // `$.fs.stat` cannot size the new file, as `$.fs.read` refuses one over 4 MiB: it is read with cat.
    const argvs: (readonly string[])[] = []
    on('process.spawn', async function* ($, e) {
      argvs.push(e.argv)
      yield { stream: 'stdout' as const, text: big.slice(0, 50) }
      yield { stream: 'stdout' as const, text: big.slice(50) }
      return { value: { code: 0, signal: null } }
    })
    on('process.run', ($, e) => {
      argvs.push(e.argv)
      const pattern = e.argv[2]!
      const hit = e.argv.slice(4).filter((p) => files[p]?.includes(pattern))
      return { value: ran({ exitCode: hit.length ? 0 : 1, stdout: hit.map((p) => `${p}\n`).join(''), stderr: '' }) }
    })

    await $.classic.Stop({ session_id: 'session-1', transcript_path: `/t/${NEW}.jsonl`, stop_hook_active: false })
    const found = String((await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'FIG-8' })).result)
    const read = String((await $.tool.call({ tool: 'mcp__observational-memory__om_recall', ref: 'aaaaaaaa:1' })).result)
    await clock.advance(5_000)

    expect(argvs).toContainEqual(['cat', '--', `/t/${NEW}.jsonl`])
    expect(argvs).toContainEqual(['grep', '-lF', `"continuedInSessionId":"${NEW}"`, '--', `/t/${OLD}.jsonl`])
    expect(reads).toContain(`/t/${OLD}.jsonl`)
    expect(found).toBe(
      '1 match(es) for "FIG-8" in 2 blocks of 2 transcript files.\n' +
        `[aaaaaaaa:1 · ${stampOf('2026-09-22T12:00:00.000Z')} · user] 1 line\n  1: remember the FIG-8 marker\n` +
        'Only if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "aaaaaaaa:1", "lines": "1-1"}.',
    )
    expect(read).toBe(`[aaaaaaaa:1 · ${stampOf('2026-09-22T12:00:00.000Z')} · user] lines 1-1 of 1\n   1 | remember the FIG-8 marker`)
    const stats = JSON.parse(files['/stats/session-1.json']!) as { counts: Record<string, number>; metrics: Record<string, { count: number; sum: number }> }
    expect(stats.metrics['recall.matches']).toMatchObject({ count: 2, sum: 1 })
    expect(stats.counts['recall.fromFile']).toBe(2)
  })

  test('om_recall reads the transcript file without the live history, and a later call reads only the rows written since', async ($, on) => {
    mock.clock(on)
    const { files, reads, asked } = world(on)
    on('classic.Stop', () => ({}))
    const row = (iso: string, content: string) => JSON.stringify({ type: 'user', timestamp: iso, message: { role: 'user', content } })
    const path = '/t/session-1.jsonl'
    files[path] = [row('2026-09-22T12:00:00.000Z', 'remember the PEAR-1 marker'), row('2026-09-22T12:05:00.000Z', 'where is PEAR-1?')].join('\n') + '\n'
    const argvs: (readonly string[])[] = []
    on('process.spawn', async function* ($, e) {
      argvs.push(e.argv)
      yield { stream: 'stdout' as const, text: files[e.argv[4]!]!.slice(Number(e.argv[2]) - 1) }
      return { value: { code: 0, signal: null } }
    })

    await $.classic.Stop({ session_id: 'session-1', transcript_path: path, stop_hook_active: false })
    const first = String((await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'PEAR' })).result)
    const parsed = files[path].length
    files[path] += [row('2026-09-22T12:10:00.000Z', 'PEAR-2 is the new marker'), row('2026-09-22T12:15:00.000Z', 'and where is PEAR-2?')].join('\n') + '\n'
    const second = String((await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: 'PEAR' })).result)

    expect(asked.main).toBe(0)
    expect(reads.filter((p) => p === path)).toEqual([path])
    expect(argvs).toEqual([['tail', '-c', `+${parsed + 1}`, '--', path]])
    expect(first).toMatch(/^1 match\(es\) for "PEAR" in 1 block of/)
    // The prompt that asked the first time is an ordinary match now: the newest one asked.
    expect(second).toMatch(/^3 match\(es\) for "PEAR" in 3 blocks/)
    expect(second).toContain('[session-1:3 ')
    expect(second).not.toContain('[session-1:4 ')
  })

  test('observes in the background mid-turn, after the model steps of one long turn, with the times of the rows it read', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const { gate, open } = gates()
    const seen = pi(on, { hold: (n) => (n === 1 ? gate(1) : undefined), reply: () => '<observations>\n* 🟡 Read a file\n</observations>' })
    const step = steps(on)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    await clock.set(at(23, 9, 0))
    history.push({ role: 'user', text: 'brief', toolUses: [] })
    await $.turn.start({ text: 'brief', turnId: 't' })
    await step($, 't', 0, history.length)

    // Each step resolves with the first Observer call still held: nothing waits on it.
    for (let n = 0; n < 8; n++) {
      await clock.set(at(23, 9, 0) + (n + 1) * 14_000) // the held call stays within its timeout
      history.push(...call(n, 16_000))
      await step($, 't', n + 1, history.length)
      await clock.settle()
    }
    expect(seen.inFlight).toBe(1)
    open(1)
    await clock.settle()

    const ledger = stored['ledger:session-1'] as Ledger
    expect(seen.logs.filter((l) => l.includes('in the background'))).toEqual([
      'observed rows 7-13 in the background, 1 observations; watermark 0, 1 chunk(s) waiting on a gap',
      'observed rows 0-7 in the background, 1 observations; watermark 13, 0 chunk(s) waiting on a gap',
    ])
    // A chunk held behind a gap already counts toward the memory.
    expect(seen.logs.filter((l) => l.startsWith('Observed')).map((l) => l.replace(/ in .* · \+/, ' · +'))).toEqual([
      'Observed 6 messages · +1 note · memory 1 note',
      'Observed 7 messages · +1 note · memory 2 notes',
    ])
    // The rows' times come from the steps that brought them, not only the prompt's.
    expect(ledger.entries.map((e) => e.line)).toEqual(['🟡 2026-09-23 09:00 Read a file', '🟡 2026-09-23 09:01 Read a file'])
  })

  test('past the 4096 rows the history reads as, a long turn still observes in the background mid-turn', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on, { rowsCap: 4096 })
    const seen = pi(on, { reply: readsIn })
    const step = steps(on)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    await clock.set(at(23, 9, 0))
    for (let i = 0; i < 4100; i++) history.push({ role: 'assistant', text: `note ${i}`, toolUses: [] })
    history.push({ role: 'user', text: 'brief', toolUses: [] })
    await $.turn.start({ text: 'brief', turnId: 't' })
    await step($, 't', 0, history.length)
    await clock.settle()
    const before = seen.prompts.length

    // The history the plugin reads stays 4096 rows long while the turn adds to it.
    for (let n = 0; n < 6; n++) {
      await clock.set(at(23, 9, n + 1))
      history.push(...call(n, 16_000))
      await step($, 't', n + 1, history.length)
      await clock.settle()
    }
    expect(seen.prompts.length).toBeGreaterThan(before)
    expect(seen.prompts.slice(before).join()).toContain('/src/f0.ts')
  })

  test("a crewmate's launch brief, its only prompt, is quoted in full across compactions and never offered as the next step", async ($, on) => {
    mock.clock(on)
    world(on)
    const seen = pi(on, { reply: () => '<observations>\n* 🟡 Read a file\n</observations>' })
    const brief = `FIRSTMATE_OP: v1 launch-brief: ${'Do the work on your own. '.repeat(600)}`.trim()
    const messages = [{ role: 'user' as const, text: brief, toolUses: [] }, ...call(0, CHUNK), ...call(1, CHUNK), ...call(2, 8_000)]

    const result = await $.session.compact({ trigger: 'auto', messages })
    const text = result.messages?.[0]?.text ?? ''
    expect(userMessagesIn(text)).toEqual([brief])
    expect(nextStepIn(text)).toBeUndefined()

    const second = await $.session.compact({ trigger: 'auto', messages: [...result.messages!, ...call(3, CHUNK), ...call(4, CHUNK), ...call(5, 8_000)] })
    const again = second.messages?.[0]?.text ?? ''
    expect(userMessagesIn(again)).toEqual([brief])
    expect(nextStepIn(again)).toBeUndefined()
    expect(seen.prompts.length).toBeGreaterThan(2)
  })

  // A launcher that sends a pointer to its brief instead of the brief: the brief survives compaction only if the memory quotes the file.
  test('a short first prompt quotes across compactions the files it names that its turn read, and no other', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Read a file\n</observations>' })
    const prompt = "Operational input waiting: read '/state/inbox/b.msg' and handle its contents."
    const brief = 'Stay on branch fix-1. Never push.'
    const messages: SessionMessage[] = [
      { role: 'user', text: prompt, toolUses: [] },
      { role: 'assistant', text: '', toolUses: [{ tool_use_id: 'b', tool: 'Read', input: { file_path: '/state/inbox/b.msg' } }] },
      { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'b', text: `${brief}\n\n<system-reminder>Mind malware.</system-reminder>`, isError: false }] },
      ...call(0, CHUNK),
      ...call(1, CHUNK),
      ...call(2, 8_000),
    ]
    const quoted = `${prompt}\n\n[/state/inbox/b.msg, the file this message names, as the assistant read it]\n${brief}`

    const result = await $.session.compact({ trigger: 'auto', messages })
    expect(userMessagesIn(result.messages?.[0]?.text)).toEqual([quoted])

    const second = await $.session.compact({ trigger: 'auto', messages: [...result.messages!, ...call(3, CHUNK), ...call(4, CHUNK), ...call(5, 8_000)] })
    expect(userMessagesIn(second.messages?.[0]?.text)).toEqual([quoted])
  })

  test('stats: a discarded background chunk counts its cost but not its observations', async ($, on) => {
    const clock = mock.clock(on)
    const { history, files } = world(on)
    const { gate, open } = gates()
    const seen = pi(on, { hold: (n) => (n === 1 ? gate(1) : undefined) })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 14, 31)) // within the held call's timeout
    await clock.settle() // [0, 4) in flight, held
    history.splice(0, history.length, ...turn('z', 'z', CHUNK), ...turn('b', 'b', 8_000)) // rewound
    open(1)
    await clock.settle()
    await clock.advance(5_000)

    expect(seen.logs).toContain('rows 0-3 were observed but no longer match the transcript; discarded')
    const file = JSON.parse(files['/stats/session-1.json']!) as { metrics: Record<string, { count: number; sum: number }> }
    expect(file.metrics['observer.background.cost']?.count).toBeGreaterThan(0)
    expect(file.metrics['observer.background.observations']).toBeUndefined()
  })
})
