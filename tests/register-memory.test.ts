import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { turn, CHUNK, at, world, pi, nearTarget, live, recordIn, WHERE, noReplies, renderedObservationsIn, withObservations, observationsIn, userMessagesIn, skillsIn, FINISHED, fourTurns } from './harness'
import type { Ledger } from './harness'

// The memory message: corrections, sources, dates and skills.
describe('register: memory', () => {
  test("the user's corrections are quoted in their own section above the observations and pass through the Reflector unchanged", async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const correction = '🔴 2026-09-22 14:30 User: "Sorry, I meant the refresh endpoint, not login — ignore what I said about login"'
    const big = `<observations>\n${'* 🟡 2026-09-22 14:30 read a file with a long name\n'.repeat(4_000)}</observations>`
    const seen = pi(on, {
      reply: (prompt) =>
        prompt.includes('[User @ 2026-09-22 14:30]: a')
          ? `<corrections>\n* ${correction}\n</corrections>\n${big}\n<continuation>\nActive: fixing the refresh endpoint\n</continuation>`
          : `<observations>\n* 🔴 2026-09-22 15:00 User: "b"\n</observations>`,
      reflect: (n, prompt) => nearTarget(prompt, '* 🟡 2026-09-22 14:30 Explored the auth module (source 2026-09-22 14:30 to 2026-09-22 14:31)'),
    })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a: Sorry, I meant the refresh endpoint, not login — ignore what I said about login', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle()

    const reflections = seen.prompts.filter((p) => p.startsWith('## OBSERVATIONS'))
    expect(reflections).toHaveLength(1)
    expect(reflections[0]).not.toContain('Sorry, I meant')
    expect((stored['ledger:session-1'] as Ledger).corrections).toEqual([correction])
    const first = await $.session.compact({ trigger: 'manual', messages: [...history] })
    const text = noReplies(first.messages?.[0]?.text)
    expect(text).toContain(`\n\n<corrections>\n* ${correction}\n</corrections>\n\n<observations>\n@ 2026-09-22\n* 🟡 14:30 Explored the auth module (source 14:30 to 14:31)\n`)
    expect(recordIn(text)).toBe(`${WHERE} (2026-09-22 14:31):\nSession: the test goal\nActive: fixing the refresh endpoint`)
    // Carried forward from the memory message itself.
    for (const key of Object.keys(stored)) delete stored[key]
    const second = await $.session.compact({ trigger: 'auto', messages: [...first.messages!, ...turn('c', 'c', CHUNK), ...turn('d', 'd', 8_000)] })
    expect(noReplies(second.messages?.[0]?.text)).toContain(`<corrections>\n* ${correction}\n</corrections>\n\n<observations>\n@ 2026-09-22\n* 🟡 14:30 Explored the auth module (source 14:30 to 14:31)\n`)
    expect(seen.modelCalls).toBe(0)
  })

  test('a memory mixing lines with and without a source reads back as it was written: rendered, carried forward and rendered again, it is the same', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 2026-09-22 14:30 Saw a\n</observations>' })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle()
    const first = await $.session.compact({ trigger: 'manual', messages: [...history] })
    const mixed = [
      '@ 2026-09-22',
      '* 🟡 14:00 Saw a, before the ranges',
      '* 🟡 14:01 Asked about b (source none)',
      '* 🟡 14:30 Read files',
      '* 🟡 14:30 Ran the tests (source 14:30 to 14:31)',
      '* 🟢 14:40 Condensed from no one place (source none)',
      '* 🟡 14:45 Fixed the check (source 14:40 to 14:46)',
      '* 🟡 15:00 Noted the rest',
    ].join('\n')
    for (const key of Object.keys(stored)) delete stored[key]
    const second = await $.session.compact({ trigger: 'manual', messages: [withObservations(first.messages![0]!, mixed), ...first.messages!.slice(1)] })

    expect(renderedObservationsIn(second.messages?.[0]?.text)).toBe(mixed)
  })

  test('an observation carries the span of transcript times it came from, never a range the Observer wrote, and keeps it through the memory message', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const seen = pi(on, {
      reply: (prompt) => {
        const [, time, name] = prompt.match(/^\[User(?: @ ([\d-]+ [\d:]+))?\]: (\w+)$/m)!
        // The Observer is given no ranges: one it writes is invented.
        return `<observations>\n* 🟡 ${time ?? ''} Read ${name} (source 2020-01-01 00:00 to 2020-01-01 00:05)\n</observations>`
      },
    })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await runTurn($, turn('c', 'c', 8_000), at(22, 15, 30))
    await clock.settle()
    const first = await $.session.compact({ trigger: 'manual', messages: [...history] })

    const observed = observationsIn(first.messages?.[0]?.text)
    expect(observed).toBe(
      '* 🟡 2026-09-22 14:30 Read a (source 2026-09-22 14:30 to 2026-09-22 14:31)\n' +
        '* 🟡 2026-09-22 15:00 Read b (source 2026-09-22 14:31 to 2026-09-22 15:01)',
    )
    expect(seen.prompts.join('\n')).not.toContain('(source ')
    // Carried by the memory message alone; history with no recorded times gets no range, and none is invented.
    for (const key of Object.keys(stored)) delete stored[key]
    const second = await $.session.compact({ trigger: 'auto', messages: [...first.messages!, ...turn('d', 'd', CHUNK), ...turn('e', 'e', 8_000)] })
    const lines = observationsIn(second.messages?.[0]?.text)!.split('\n')
    expect(lines.slice(0, 2).join('\n')).toBe(observed)
    expect(lines.length).toBeGreaterThan(2)
    for (const line of lines.slice(2)) expect(line).toMatch(/^\* 🟡 Read \w+$/)
  })

  test('the memory writes each day once, on a line before its first observation and its first user message, and reads the dates back', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    pi(on, {
      reply: (prompt) => {
        const [, time, name] = prompt.match(/^\[User(?: @ ([\d-]+ [\d:]+))?\]: (\w+)$/m)!
        return `<observations>\n* 🟡 ${time ?? ''} Read ${name}\n</observations>`
      },
    })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 23, 59))
    await runTurn($, turn('b', 'b', CHUNK), at(23, 0, 20))
    await runTurn($, turn('c', 'c', 8_000), at(23, 0, 50))
    await clock.settle()
    const first = await $.session.compact({ trigger: 'manual', messages: [...history] })
    const text = first.messages?.[0]?.text

    expect(renderedObservationsIn(text)).toBe(
      '@ 2026-09-22\n* 🟡 23:59 Read a (source 23:59 to 2026-09-23 00:00)\n@ 2026-09-23\n* 🟡 00:20 Read b (source 00:00 to 00:21)',
    )
    expect(text).toContain('<all-user-messages>\n@ 2026-09-22\n* User @ 23:59 (1 chars):\na\n@ 2026-09-23\n* User @ 00:20 (1 chars):\nb\n</all-user-messages>')
    for (const key of Object.keys(stored)) delete stored[key]
    const second = await $.session.compact({ trigger: 'auto', messages: [...first.messages!, ...turn('d', 'd', CHUNK), ...turn('e', 'e', 8_000)] })
    const again = second.messages?.[0]?.text

    expect(renderedObservationsIn(again)?.split('\n').slice(0, 5).join('\n')).toBe(`${renderedObservationsIn(text)}\n* 🟡 Read c`)
    expect(userMessagesIn(again)?.slice(0, 2)).toEqual(userMessagesIn(text))
  })

  test('an observation that ends in a parenthetical that is not a source range keeps it', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Read config.ts (source of truth for ports)\n* 🟡 Cited the RFC (source: IETF)\n</observations>' })

    const result = await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)] })

    expect(observationsIn(result.messages?.[0]?.text)).toBe(
      '* 🟡 Read config.ts (source of truth for ports)\n* 🟡 Cited the RFC (source: IETF)',
    )
  })

  test("an observation's source range, given to om_recall as from and to, finds the rows it was observed from", async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    pi(on, { reply: (prompt) => `<observations>\n* 🟡 ${prompt.match(/^\[User @ ([\d-]+ [\d:]+)\]: \w+$/m)![1]} Read ${prompt.match(/^\[User[^\]]*\]: (\w+)$/m)![1]}\n</observations>` })
    const runTurn = live(on, clock, history)
    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await runTurn($, turn('c', 'c', 8_000), at(22, 15, 30))
    await clock.settle()

    const result = await $.session.compact({ trigger: 'manual', messages: [...history] })
    const [, from, to] = observationsIn(result.messages?.[0]?.text)!.match(/Read b \(source ([\d-]+ [\d:]+) to ([\d-]+ [\d:]+)\)/)!
    const found = String((await $.tool.call({ tool: 'mcp__observational-memory__om_recall', query: '/^[abc]$/', from, to })).result)

    expect(found).toContain('· user] 1 line\n  1: b\n')
    expect(found).not.toContain('1: a\n')
    expect(found).not.toContain('1: c\n')
  })

  test('keeps every recorded skill not in the raw tail, most recent first, within the token cap, and logs what it drops', async ($, on) => {
    mock.clock(on, { now: at(22, 9, 0) })
    world(on)
    const seen = pi(on)
    on('skill.prompt', ($, e) => ({ text: e.text }))

    await $.skill.prompt({ skill: 'deploy', text: 'old deploy steps' })
    await $.skill.prompt({ skill: 'huge', text: 'h'.repeat(56_000) })
    await $.skill.prompt({ skill: 'lint', text: 'Lint steps' })
    await $.skill.prompt({ skill: 'review', text: 'Review steps' })
    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps' })
    await $.skill.prompt({ skill: 'style', text: 's'.repeat(8_000) })
    const recent: SessionMessage[] = [{ role: 'user', text: 'Review steps', toolUses: [] }, ...turn('b', 'b', 8_000).slice(1)]
    const result = await $.session.compact({ trigger: 'auto', messages: [...turn('a', 'a', CHUNK), ...recent] })

    expect(skillsIn(result.messages?.[0]?.text)).toBe(
      `<skill name="style" invoked="2026-09-22 09:00">\n${'s'.repeat(8_000)}\n</skill>\n<skill name="deploy" invoked="2026-09-22 09:00">\nDeploy steps\n</skill>\n` +
        '<skill name="lint" invoked="2026-09-22 09:00">\nLint steps\n</skill>',
    )
    expect(seen.logs).toContain('skills over the 15000-token cap, dropped: huge (~14000 tokens)')
  })

  test('skills carry forward through the memory message when the store has none', async ($, on) => {
    mock.clock(on, { now: at(22, 9, 0) })
    const { stored } = world(on)
    pi(on)
    on('skill.prompt', ($, e) => ({ text: e.text }))

    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps\n</skill> mid-text stays' })
    const first = await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)] })
    for (const key of Object.keys(stored)) delete stored[key]
    const second = await $.session.compact({ trigger: 'auto', messages: [...first.messages!, ...turn('c', 'c', CHUNK), ...turn('d', 'd', 8_000)] })

    expect(skillsIn(second.messages?.[0]?.text)).toBe('<skill name="deploy" invoked="2026-09-22 09:00">\nDeploy steps\n</skill> mid-text stays\n</skill>')
    expect(observationsIn(second.messages?.[0]?.text)).toBe('* 🔴 User: "a"\n* 🔴 User: "b"\n* 🔴 User: "c"')
  })

  test('a skill keeps its text through the last three turns, the running one included; an older one becomes a line with its time', async ($, on) => {
    const { seen, first } = await fourTurns($, on)

    expect(skillsIn(first.messages?.[0]?.text)).toBe(
      '<skill name="now" invoked="2026-09-22 14:30">\nNow steps\n</skill>\n<skill name="mid" invoked="2026-09-22 14:11">\nMid steps\n</skill>\n' +
        `<skill name="old" invoked="2026-09-22 14:01">${FINISHED}</skill>`,
    )
    expect(seen.logs).toContain('skills not invoked in the last 3 turns, kept as a line each: old (~3 tokens)')
  })

  test('a finished skill stays a line at later compactions, with or without its text in the store, and a whole one keeps its time', async ($, on) => {
    const { stored, runTurn, first } = await fourTurns($, on)
    await runTurn($, turn('e', 'e', 100), at(22, 14, 40))
    await runTurn($, turn('f', 'f', 100), at(22, 14, 50))
    const later = [...first.messages!, ...turn('e', 'e', CHUNK), ...turn('f', 'f', 8_000)]
    const second = await $.session.compact({ trigger: 'auto', messages: later })
    for (const key of Object.keys(stored)) delete stored[key]
    const third = await $.session.compact({ trigger: 'auto', messages: [...second.messages!, ...turn('g', 'g', CHUNK), ...turn('h', 'h', 8_000)] })

    const expected =
      '<skill name="now" invoked="2026-09-22 14:30">\nNow steps\n</skill>\n' +
      `<skill name="mid" invoked="2026-09-22 14:11">${FINISHED}</skill>\n<skill name="old" invoked="2026-09-22 14:01">${FINISHED}</skill>`
    expect(skillsIn(second.messages?.[0]?.text)).toBe(expected)
    expect(skillsIn(third.messages?.[0]?.text)).toBe(expected)
  })

  test('a memory message from before skill times still parses: its skills become lines, but stay whole in a subagent', async ($, on) => {
    mock.clock(on, { now: at(22, 9, 0) })
    const { stored } = world(on)
    pi(on)
    on('skill.prompt', ($, e) => ({ text: e.text }))

    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps' })
    const first = await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)] })
    const old = { ...first.messages![0]!, text: first.messages![0]!.text.replace(/ invoked="[^"]*"/g, '') }
    expect(skillsIn(old.text)).toBe('<skill name="deploy">\nDeploy steps\n</skill>')
    for (const key of Object.keys(stored)) delete stored[key]
    const messages = [old, ...first.messages!.slice(1), ...turn('c', 'c', CHUNK), ...turn('d', 'd', 8_000)]
    const main = await $.session.compact({ trigger: 'auto', messages })
    const subagent = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages })

    expect(skillsIn(main.messages?.[0]?.text)).toBe(`<skill name="deploy">${FINISHED}</skill>`)
    expect(observationsIn(main.messages?.[0]?.text)).toBe('* 🔴 User: "a"\n* 🔴 User: "b"\n* 🔴 User: "c"')
    expect(skillsIn(subagent.messages?.[0]?.text)).toBe('<skill name="deploy">\nDeploy steps\n</skill>')
  })
})
