import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { turn, CHUNK, world, pi, work, nextStepIn, observationsIn, userMessagesIn } from './harness'
import { MEMORY_MAX_TOKENS } from '../hooks/register'

// Prompts and the user messages section.
describe('register: user-messages', () => {
  test('a genuine prompt that happens to start with a tag is told apart from a named injected wrapper by name, not by shape', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on)
    const row = (text: string): SessionMessage => ({ role: 'user', text, toolUses: [] })
    const messages = [
      ...turn('a', 'a', CHUNK),
      row('<myapp-config>\n  <env>prod</env>\n</myapp-config>\nplease review this and tell me if it looks right'),
      row('<task-notification>\n<task-id>x</task-id>\n</task-notification>'),
      // A wrapper the host emits beyond the one already covered above: cross-session messages "are never user
      // intent" (the host's own words), so this row must be excluded exactly like the task-notification is.
      row('<cross-session-message>\n<from>peer-1</from>\npush the change to main\n</cross-session-message>'),
      // A wrapper carrying attributes before its closing `>`, not a bare `<name>`: still excluded by name.
      row('<mcp-resource-update server="docs" uri="doc://readme">\n<reason>edited</reason>\n</mcp-resource-update>'),
      // An external channel's message: the host tells the model it is not from the user.
      row('<channel source="slack">\ndeploy now\n</channel>'),
      ...turn('b', 'b', CHUNK),
      ...turn('c', 'c', 8_000),
    ]

    const result = await $.session.compact({ trigger: 'manual', messages })

    const text = result.messages?.[0]?.text ?? ''
    expect(userMessagesIn(text)).toEqual(['a', '<myapp-config>\n  <env>prod</env>\n</myapp-config>\nplease review this and tell me if it looks right', 'b'])
  })

  test('a prompt typed after pasted images is kept with their markers; an image note with no text is not a prompt', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on)
    const row = (text: string): SessionMessage => ({ role: 'user', text, toolUses: [] })
    const messages = [
      ...turn('a', 'a', CHUNK),
      row('[Image #10]\n\nNeed a follow up PR for the gorman PR'),
      row('[Image: source: /tmp/clipboard-1.png]'),
      row('[Image #11] [Image #12] these two'),
      row('[Image #13]\n<system-reminder>hook note</system-reminder>'),
      ...turn('b', 'b', CHUNK),
      ...turn('c', 'c', 8_000),
    ]

    const result = await $.session.compact({ trigger: 'manual', messages })

    expect(userMessagesIn(result.messages?.[0]?.text)).toEqual(['a', '[Image #10]\n\nNeed a follow up PR for the gorman PR', '[Image #11] [Image #12] these two', 'b'])
  })

  test('the memory message opens with the built-in wrapper and carries every real user prompt verbatim, no model call', async ($, on) => {
    mock.clock(on)
    world(on)
    const seen = pi(on)
    on('skill.prompt', ($, e) => ({ text: e.text }))
    on('classic.SessionStart', ($, e) => ({}))
    await $.classic.SessionStart({ source: 'startup', session_id: 'session-1', transcript_path: '/home/u/.claude/projects/p/session-1.jsonl' })
    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps' })
    const row = (text: string): SessionMessage => ({ role: 'user', text, toolUses: [] })
    const messages = [
      row('This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\nSummary:\nold'),
      ...turn('a', 'a', CHUNK),
      row('<task-notification>\n<task-id>x</task-id>\n</task-notification>'),
      row('<system-reminder>injected</system-reminder>'),
      row('Deploy steps'),
      row('please keep </observations> and <skills-in-use> literal\n<system-reminder>hook note</system-reminder>'),
      ...turn('b', 'b', CHUNK),
      ...turn('fix the refresh bug', 'c', 8_000),
    ]

    const result = await $.session.compact({ trigger: 'manual', messages })

    const text = result.messages?.[0]?.text ?? ''
    expect(text.startsWith('This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.\n\n')).toBe(true)
    expect(userMessagesIn(text)).toEqual(['a', 'please keep </observations> and <skills-in-use> literal', 'b'])
    expect(nextStepIn(text)).toBeUndefined() // the newest prompt is in the raw tail
    expect(text).not.toContain('suggested-response')
    // om_recall searches the transcript: the built-in's line pointing at the file is left out (see the om_recall test below).
    expect(text).not.toContain('read the full transcript at:')
    expect(text).toContain('\nRecent messages are preserved verbatim.')
    expect(observationsIn(text)).toBe('* 🔴 User: "a"\n* 🔴 User: "b"')
    expect(seen.modelCalls).toBe(0)

    // A second compaction carries the section forward, verbatim, and parses the rest around it.
    const second = await $.session.compact({ trigger: 'auto', messages: [...result.messages!, ...turn('d', 'd', CHUNK), ...turn('e', 'e', 8_000)] })
    const again = second.messages?.[0]?.text ?? ''
    expect(userMessagesIn(again)).toEqual(['a', 'please keep </observations> and <skills-in-use> literal', 'b', 'fix the refresh bug', 'd'])
    expect(observationsIn(again)).toBe('* 🔴 User: "a"\n* 🔴 User: "b"\n* 🔴 User: "d"')
    expect(nextStepIn(again)).toBeUndefined()
    expect(again).toContain('\nContinue the conversation from where it left off. Resume directly')
    expect(again).not.toContain('without asking the user any further questions')
  })

  test('the user messages section keeps the brief, the newest prompts within its cap and the last three whole', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Saw\n</observations>' })
    const long = (n: number) => `${n} ${'w'.repeat(4_000)}`
    const brief = `brief ${'b'.repeat(14_600)}`
    const messages = [...turn(brief, 'r', 2_000), ...Array.from({ length: 30 }, (_, i) => turn(long(i), 'r', 2_000)).flat(), ...turn('last', 'r', 8_000)]

    const result = await $.session.compact({ trigger: 'manual', messages })

    const kept = userMessagesIn(result.messages?.[0]?.text) ?? []
    expect(kept[0]).toBe(brief)
    const omitted = Number(kept[1]!.match(/^\((\d+) omitted\)$/)![1])
    const numbers = kept.slice(2).map((k) => Number(k.split(' ')[0]))
    expect(numbers.length).toBeGreaterThanOrEqual(3) // the last three prompts, whole, past the cap
    expect(numbers).toEqual(numbers.map((_, i) => numbers[0]! + i)) // a contiguous run
    expect(numbers.at(-1)).toBeGreaterThanOrEqual(27) // up to the newest prompt that left context
    expect(omitted).toBe(numbers[0]) // every prompt between the brief and the run
    expect(kept.join('').length).toBeLessThanOrEqual(10_000 * 4)

    // Chained: the brief stays first and the omitted count grows rather than resets.
    const more = Array.from({ length: 5 }, (_, i) => turn(long(100 + i), 'r', 2_000)).flat()
    const second = await $.session.compact({ trigger: 'manual', messages: [...result.messages!, ...more, ...turn('end', 'r', 8_000)] })
    const again = userMessagesIn(second.messages?.[0]?.text) ?? []
    expect(again[0]).toBe(brief)
    // In order, the short 'last' kept whole past the cap, the long ones between counted, and the counts accumulated.
    const count = (k: string) => Number(k.match(/^\((\d+) omitted\)$/)?.[1] ?? NaN)
    const entries = again.slice(1)
    const prompts = entries.filter((k) => Number.isNaN(count(k)))
    const order = [...Array.from({ length: 30 }, (_, i) => String(i)), 'last', '100', '101', '102', '103', '104']
    const idx = prompts.map((k) => order.indexOf(k === 'last' ? k : k.split(' ')[0]!))
    expect(idx.every((i, j) => i >= 0 && (j === 0 || i > idx[j - 1]!))).toBe(true)
    expect(prompts).toContain('last')
    expect(Number(prompts.at(-1)!.split(' ')[0])).toBeGreaterThanOrEqual(103)
    const counted = entries.map(count).filter((n) => !Number.isNaN(n)).reduce((a, b) => a + b, 0)
    expect(counted + prompts.length).toBe(idx.at(-1)! + 1) // accumulated, not reset
    expect(again.join('').length).toBeLessThanOrEqual(10_000 * 4)
  })

  test('short prompts past the cap stay whole, in order, with the long ones between counted', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Saw\n</observations>' })
    const long = (n: number) => `${n} ${'w'.repeat(8_000)}`
    const prompts = Array.from({ length: 12 }, (_, i) => (i % 3 === 0 ? `no, use option ${i} instead` : long(i)))
    const messages = [...turn('brief', 'r', 2_000), ...prompts.flatMap((p) => turn(p, 'r', 2_000)), ...turn('last', 'r', 8_000)]

    const kept = userMessagesIn((await $.session.compact({ trigger: 'manual', messages })).messages?.[0]?.text) ?? []
    expect(kept[0]).toBe('brief')
    // Every short correction is kept whole; the old long prompts leave, counted where they stood.
    for (const i of [0, 3, 6, 9]) expect(kept).toContain(`no, use option ${i} instead`)
    expect(kept.filter((k) => /^\(\d+ omitted\)$/.test(k)).length).toBeGreaterThan(0)
    const at = (t: string) => kept.indexOf(t)
    expect(at('no, use option 0 instead')).toBeLessThan(at('no, use option 3 instead'))
    expect(at('no, use option 6 instead')).toBeLessThan(at('no, use option 9 instead'))
    // Kept and counted together are every prompt up to the newest that left context.
    const counts = kept.filter((k) => /^\(\d+ omitted\)$/.test(k))
    const omitted = counts.reduce((n, k) => n + Number(k.match(/\d+/)![0]), 0)
    const newest = Number(kept.at(-1)!.split(' ')[0])
    expect(newest).toBeGreaterThanOrEqual(9)
    expect(omitted + kept.length - 1 - counts.length).toBe(newest + 1)
  })

  test('an oversized brief is cut short of the cap, so the newest prompt keeps a reserve and stays the next step', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Saw\n</observations>' })
    const brief = `brief ${'b'.repeat(50_000)}`
    const newest = `newest ${'n'.repeat(50_000)}`
    const result = await $.session.compact({ trigger: 'manual', messages: [...turn(brief, 'r', CHUNK), ...turn('mid', 'r', 2_000), ...turn(newest, 'r', CHUNK), ...work('w', 8_000)] })

    const kept = userMessagesIn(result.messages?.[0]?.text) ?? []
    expect(kept.length).toBe(3)
    expect(kept[0]!.startsWith('brief ')).toBe(true)
    expect(kept[0]!).toMatch(/\n\.\.\. \[~\d+ tokens omitted; om_recall can retrieve the full message\] \.\.\.\n/)
    expect(kept[1]).toBe('mid') // a short prompt is kept whole past the cap
    expect(kept[2]!.startsWith('newest n')).toBe(true) // the reserve, not a bare truncation note
    expect(kept.join('').length).toBeLessThanOrEqual(10_000 * 4 + 110) // the cap, the cut markers and 'mid'

    // Compacted again with no new prompt: the next step is still the newest prompt, and the brief keeps its note.
    const second = await $.session.compact({ trigger: 'auto', messages: [...result.messages!, ...work('v', CHUNK), ...work('u', 8_000)] })
    const again = second.messages?.[0]?.text
    expect(nextStepIn(again)!.startsWith('newest n')).toBe(true)
    expect(userMessagesIn(again)![0]).toBe(kept[0])
  })

  test('the newest prompt is the next step only when it leaves context, never when the raw tail keeps it', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Saw\n</observations>' })
    const kept = await $.session.compact({ trigger: 'manual', messages: [...turn('first', 'r', CHUNK), ...turn('second', 'r', CHUNK), ...turn('in the tail', 'r', 2_000)] })
    expect(kept.messages?.slice(1).some((m) => m.text === 'in the tail')).toBe(true)
    expect(nextStepIn(kept.messages?.[0]?.text)).toBeUndefined()

    const left = await $.session.compact({ trigger: 'manual', messages: [...turn('first', 'r', CHUNK), ...turn('before the cut', 'r', CHUNK), ...work('w', 8_000)] })
    expect(nextStepIn(left.messages?.[0]?.text)).toBe('before the cut')
  })

  test('the next step after a compaction of [brief, (n omitted), x] with no new prompt is x', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Saw\n</observations>' })
    const brief = `brief ${'b'.repeat(14_600)}`
    const result = await $.session.compact({ trigger: 'manual', messages: [...turn(brief, 'r', CHUNK), ...turn(`mid ${'m'.repeat(30_000)}`, 'r', 2_000), ...turn('do the thing', 'r', CHUNK), ...work('w', 8_000)] })
    expect(userMessagesIn(result.messages?.[0]?.text)).toEqual([brief, '(1 omitted)', 'do the thing'])

    const second = await $.session.compact({ trigger: 'auto', messages: [...result.messages!, ...work('v', CHUNK), ...work('u', 8_000)] })
    expect(nextStepIn(second.messages?.[0]?.text)).toBe('do the thing')
  })

  // A launch brief puts its reporting and acceptance rules at the end: cut, it keeps both ends, and says what it lost.
  test('an oversized brief keeps its head and its last lines with a marker counting the omission, and is not cut again', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Saw\n</observations>' })
    const body = Array.from({ length: 1_000 }, (_, i) => `step ${i}: ${'b'.repeat(60)}`).join('\n')
    const rules = 'Report: the head commit and the test results.\nAcceptance: every test passes; no push.'
    const brief = `Goal: rename the store.\n${body}\n${rules}`
    const result = await $.session.compact({ trigger: 'manual', messages: [...turn(brief, 'r', CHUNK), ...turn('mid', 'r', CHUNK), ...turn('tail', 'r', 8_000)] })

    const cut = (userMessagesIn(result.messages?.[0]?.text) ?? [])[0]!
    expect(cut.startsWith('Goal: rename the store.\nstep 0: ')).toBe(true)
    expect(cut.endsWith(`\n${rules}`)).toBe(true)
    const marker = cut.match(/\n\.\.\. \[~(\d+) tokens omitted; om_recall can retrieve the full message\] \.\.\.\n/)
    expect(marker).not.toBeNull()
    const [head, tail] = cut.split(marker![0])
    expect(brief.startsWith(head!)).toBe(true)
    expect(brief.endsWith(`\n${tail!}`)).toBe(true) // the tail starts on a whole line
    expect(Number(marker![1])).toBe(Math.ceil((brief.length - head!.length - tail!.length) / 4)) // what the marker counts is what went
    expect(cut.length).toBeLessThanOrEqual(8_000 * 4 + 100)

    // Compacted again with newer prompts: the cut brief is kept as it was, its marker and its last lines included.
    const second = await $.session.compact({ trigger: 'manual', messages: [...result.messages!, ...turn('later', 'r', CHUNK), ...turn('end', 'r', 8_000)] })
    expect((userMessagesIn(second.messages?.[0]?.text) ?? [])[0]).toBe(cut)
  })

  test('a brief within the cap stays whole and a newest prompt over the remainder is cut', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Saw\n</observations>' })
    const brief = `brief ${'b'.repeat(14_600)}`
    const newest = `newest ${'n'.repeat(40_000)}`
    const result = await $.session.compact({ trigger: 'manual', messages: [...turn(brief, 'r', CHUNK), ...turn(newest, 'r', CHUNK), ...turn('tail', 'r', 8_000)] })

    const kept = userMessagesIn(result.messages?.[0]?.text) ?? []
    expect(kept.length).toBe(2)
    expect(kept[0]).toBe(brief)
    expect(kept[1]!.startsWith('newest ')).toBe(true)
    expect(kept[1]!.length).toBeLessThan(newest.length)
    expect(kept.join('').length).toBeLessThanOrEqual(10_000 * 4 + 100) // and the truncation note
  })

  test('a single-prompt session keeps that prompt once', async ($, on) => {
    mock.clock(on)
    world(on)
    pi(on, { reply: () => '<observations>\n* 🟡 Saw\n</observations>' })
    const brief = `brief ${'b'.repeat(50_000)}`
    const messages: SessionMessage[] = [...turn(brief, 'r', CHUNK), ...turn('tail', 'r', 8_000)]
    const result = await $.session.compact({ trigger: 'manual', messages })

    const kept = userMessagesIn(result.messages?.[0]?.text) ?? []
    expect(kept.length).toBe(1)
    expect(kept[0]!.startsWith('brief ')).toBe(true)
  })

  test('only 🔴 corrections are quoted; the observer reserves 🔴 for the user\'s constraints', async ($, on) => {
    mock.clock(on)
    world(on)
    const seen = pi(on, {
      reply: () => '<corrections>\n* 🔴 User: "use pnpm, never npm"\n* 🟡 User: "I meant the other file"\n</corrections>\n<observations>\n* 🟡 Saw\n</observations>',
    })

    const result = await $.session.compact({ trigger: 'manual', messages: [...turn('a\nuse pnpm, never npm', 'a', CHUNK), ...turn('b', 'b', 8_000)] })

    expect(result.messages?.[0]?.text).toContain('<corrections>\n* 🔴 User: "use pnpm, never npm"\n</corrections>')
    expect(result.messages?.[0]?.text).not.toContain('I meant the other file')
    expect(seen.systems[0]).toContain("🔴 The user's standing constraints: a rule, preference, prohibition or scope limit the user set that stays in force, or the user's correction of their own earlier instruction. A one-time go-ahead for one action is not one, nor a report that something does not work, nor a correction of a fact the assistant got wrong.")
    expect(seen.systems[0]).toContain('A report of a problem ("that didn\'t work", "I still see the old rows", "now it shows twice") is not a correction either')
    expect(seen.systems[0]).toContain('A one-time go-ahead or approval of one action ("go for it", "yes do it", "ok", "push it", "run the tests", "kill those processes") is not a correction')
    expect(seen.systems[0]).toContain('A one-time approval or go-ahead ("yes, push it") never replaces, retracts or relaxes a listed constraint')
    expect(seen.systems[0]).toContain('* 🟡 2026-09-23 14:36 User approved adding the expiry check the assistant proposed for refreshToken()')
    expect(seen.systems[0]).not.toContain('suggested-response')
  })

  // The open asks: a memory over its cap sheds the oldest observations and the middle prompts, never the session's
  // task statement or the newest asks, which stay word for word, so the agent does not need them said again.
  test("over the memory's cap, the first message and the newest asks stay word for word while the oldest observations go, and the header says so", async ($, on) => {
    mock.clock(on)
    world(on, { unreadable: ['agent-1'] })
    // ~12k tokens of observations per chunk, six chunks: well past the cap.
    const seen = pi(on, { reply: (prompt) => `<observations>\n${'* 🟡 read a file with a long name\n'.repeat(1_500)}* 🟡 saw ${prompt.match(/^\[User[^\]]*\]: (p\d)/m)?.[1]}\n</observations>` })
    const task = 'p0 Build the parser. Keep the CLI flags exactly as they are.'
    const asks = ['p3 Force the overlay into dark mode', 'p4 not the issue im encountering: switching platform keeps the old layout', 'p5 now rerun the tests']
    const prompts = [task, 'p1 also look at the lexer', 'p2 '.padEnd(3_000, 'long paste '), ...asks]
    const messages = [...prompts.flatMap((p) => turn(p, 'r', CHUNK)), ...work('w', 8_000)]

    const result = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages })

    const text = result.messages?.[0]?.text ?? ''
    expect(Math.ceil(text.length / 4)).toBeLessThanOrEqual(MEMORY_MAX_TOKENS + 200)
    expect(userMessagesIn(text)).toEqual([task, '(2 omitted)', ...asks])
    expect(nextStepIn(text)).toBe(asks[2])
    expect(text).toMatch(/\nTrimmed to the memory's ~24000-token cap: (?:replies left out; )?user messages cut to the first and the open asks; [\d,]+ older observations left out\. The user's first message and newest requests are kept word for word/)
    // The newest observations stay; the oldest go, counted where they were.
    const observations = observationsIn(text) ?? ''
    expect(observations).toMatch(/^\* \([\d,]+ older observations left out to fit the memory's cap; om_recall can find them\)\n/)
    expect(observations).toContain('saw p5')
    expect(observations).not.toContain('saw p0')
    expect(seen.logs).toContainEqual(expect.stringMatching(/^the memory message was over its ~24000-token cap: /))
  })

  test('a memory under its cap is left as it was: no trimmed line, every observation kept', async ($, on) => {
    mock.clock(on)
    world(on, { unreadable: ['agent-1'] })
    pi(on, { reply: () => '<observations>\n* 🟡 read a file\n</observations>' })
    const messages = [...turn('a', 'r', CHUNK), ...turn('b', 'r', CHUNK), ...work('w', 8_000)]

    const result = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages })

    const text = result.messages?.[0]?.text ?? ''
    expect(text).not.toContain('Trimmed to')
    expect(text).not.toContain('older observations left out')
  })
})
