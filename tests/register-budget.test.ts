import { describe, expect, mock, test } from 'claude-code/testing'
import type { On, Register, SessionMessage } from 'claude-code'
import { FLOOR_NOTE, MEMORY_GUIDE, MEMORY_GUIDE_SOURCES } from '../hooks/prompts'
import { planBudget } from '../hooks/register'
import { originals, turn, OBSERVER_SESSION, piSessionOf, CHUNK, at, world, pi, live, gates, work, nextStepIn, recordIn, WHERE, correctionsIn, withObservations, observationsIn, userMessagesIn, briefIn, skillsIn, FINISHED, steps, call, agentCall, readsIn, readers, SUMMARY, overloaded } from './harness'
import type { Ledger } from './harness'

// Subagents side by side, the memory budget and the fallbacks.
describe('register: budget', () => {
  test('main and two subagents observe in the background side by side, each under its own keys, four Observer calls in flight across them', async ($, on) => {
    const clock = mock.clock(on)
    const { history, agents, stored } = world(on)
    const { gate, open } = gates()
    const seen = pi(on, { hold: (n) => gate(n), reply: readsIn })
    const step = steps(on)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    await clock.set(at(23, 9, 0))
    history.push({ role: 'user', text: 'main brief', toolUses: [] })
    await $.turn.start({ text: 'main brief', turnId: 't' })
    agents['agent-1'] = [{ role: 'user', text: 'first brief', toolUses: [] }]
    agents['agent-2'] = [{ role: 'user', text: 'second brief', toolUses: [] }]

    for (let n = 0; n < 10; n++) {
      await clock.set(at(23, 9, 0) + (n + 1) * 10_000) // the held calls stay within their timeout
      history.push(...agentCall('main', n, 16_000))
      await step($, 't', n, history.length)
      agents['agent-1'].push(...agentCall('one', n, 16_000))
      await step($, 's1', n, agents['agent-1'].length, 'agent-1')
      agents['agent-2'].push(...agentCall('two', n, 16_000))
      await step($, 's2', n, agents['agent-2'].length, 'agent-2')
      await clock.settle()
    }
    expect(seen.inFlight).toBe(4)
    // The band above the prompt shows the main conversation's calls alone.
    const band = await $.ui.render({ surface: 'terminal', component: 'AbovePrompt', requestId: 'band', props: { hasSurvey: false, isWorking: true, maxRows: 10, columns: 120 } as never })
    const mains = seen.prompts.filter((p) => readers(p).has('main')).length
    expect(mains).toBeLessThan(4)
    expect(JSON.stringify(band).match(/\[observer\]/g)).toHaveLength(mains)
    for (let n = 1; n <= 20; n++) open(n)
    await clock.settle()

    expect(seen.maxInFlight).toBe(4)
    // The subagents' Observer calls are the session's piece of work too: one cache key for all of them.
    expect(new Set(seen.calls.map((c) => piSessionOf(c.argv)))).toEqual(new Set([OBSERVER_SESSION]))
    // Every call read one loop's rows, and a loop left short of a slot got the next one free.
    for (const prompt of seen.prompts) expect(readers(prompt).size).toBe(1)
    // Every loop's observations go to the debug log, none to the chat: the band above the prompt shows them.
    expect(seen.prompts.some((p) => readers(p).has('main'))).toBe(true)
    expect(seen.screen.filter((l) => l.startsWith('Observed'))).toEqual([])
    expect(seen.logs.filter((l) => l.startsWith('Observed'))).toHaveLength(seen.prompts.length)
    const ledgers = { main: 'ledger:session-1', one: 'ledger:session-1/agent-1', two: 'ledger:session-1/agent-2' }
    for (const [who, key] of Object.entries(ledgers)) {
      const ledger = stored[key] as Ledger
      expect([...readers(ledger.entries.map((e) => e.line).join('\n'))]).toEqual([who])
      expect(ledger.watermark.to).toBe(19) // each loop observed up to its own raw tail, its newest call
      expect(ledger.chunks).toEqual([])
    }
    expect(Object.keys(stored).sort()).toEqual([
      'ledger:session-1', 'ledger:session-1/agent-1', 'ledger:session-1/agent-2',
      'times:session-1', 'times:session-1/agent-1', 'times:session-1/agent-2', 'turns:session-1',
    ])
    // A step from a loop the session lists no agent for (an engine fork) observes nothing.
    const calls = seen.prompts.length
    await step($, 'f', 0, 3, 'fork-1')
    await clock.settle()
    expect(seen.prompts).toHaveLength(calls)
    expect(Object.keys(stored).filter((k) => k.includes('fork'))).toEqual([])
  })

  test("a subagent's compaction cuts at its own background watermark with no Observer call, its brief quoted, counted as a subagent's", async ($, on) => {
    const clock = mock.clock(on)
    const { agents, stored, files } = world(on)
    const seen = pi(on, { reply: readsIn })
    const step = steps(on)
    const brief = 'Prototype the change in the worktree, then report back.'
    const rows: SessionMessage[] = (agents['agent-1'] = [{ role: 'user', text: brief, toolUses: [] }])
    const run = async (from: number, to: number) => {
      for (let n = from; n < to; n++) {
        await clock.set(at(23, 9, n + 1))
        rows.push(...agentCall('one', n, 16_000))
        await step($, 's', n, rows.length, 'agent-1')
        await clock.settle()
      }
    }

    await run(0, 10)
    let calls = seen.prompts.length
    expect(calls).toBeGreaterThan(0)
    const first = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: [...rows] })
    expect(seen.prompts).toHaveLength(calls)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    const text = first.messages?.[0]?.text ?? ''
    expect(userMessagesIn(text)).toEqual([brief])
    expect(nextStepIn(text)).toBeUndefined()
    expect(observationsIn(text)).toMatch(/^\* 🟡 2026-09-23 09:0\d Read one-0, one-1, one-2/)

    // The engine writes the compaction's result after the history; the next compaction starts at the ledger installed there.
    const live = rows.length
    rows.push(...first.messages!)
    await run(10, 20)
    calls = seen.prompts.length
    const second = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: rows.slice(live) })
    await clock.advance(5_000)

    expect(seen.prompts).toHaveLength(calls)
    expect(userMessagesIn(second.messages?.[0]?.text)).toEqual([brief])
    expect(observationsIn(second.messages?.[0]?.text)).toContain('one-10')
    expect(seen.logs).not.toContain('the transcript changed under the observations; restarting the ledger from the memory message')
    expect(seen.screen).toEqual([])
    expect(seen.logs.filter((l) => l.startsWith('Compacted'))).toEqual([expect.stringMatching(/^Compacted subagent in 0 ms · memory \d+ notes$/), expect.stringMatching(/^Compacted subagent in 0 ms · memory \d+ notes$/)])
    const file = JSON.parse(files['/stats/session-1.json']!) as { metrics: Record<string, { count: number; sum: number }> }
    expect(file.metrics['compaction.subagent.syncCalls']).toMatchObject({ count: 2, sum: 0 })
    expect(file.metrics['compaction.auto.ms']).toBeUndefined()
    expect(stored['ledger:session-1']).toBeUndefined()
  })

  test('a newest tool result past the raw tail budget, with nothing observed yet, stays raw with its call and the rest is observed', async ($, on) => {
    mock.clock(on)
    const { history, agents } = world(on)
    const seen = pi(on)
    // The newest row, a 36 KB read (~9k tokens), is more than the raw tail's 6k on its own. Turn b is short of a chunk
    // so the kept tail is just the call and its result: with a full-size b, b's closing reply stays raw too.
    history.push(...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000), ...call(1, 36_000))
    agents['agent-1'] = [...history]

    for (const agentId of [undefined, 'agent-1']) {
      const result = await $.session.compact({ trigger: 'auto', ...(agentId ? { agentId } : {}), messages: [...history] })
      expect(originals(result.messages?.slice(1))).toEqual(call(1, 36_000))
      expect(observationsIn(result.messages?.[0]?.text)).toBe('* 🔴 User: "a"\n* 🔴 User: "b"')
    }
    expect(seen.prompts).toHaveLength(4)
    expect(seen.logs.filter((l) => l.includes('built-in'))).toEqual([])
  })

  test('a newest call and result past RAW_MAX_TOKENS on their own are observed too, and nothing stays raw', async ($, on) => {
    mock.clock(on)
    const { history } = world(on)
    const seen = pi(on, { reply: readsIn })
    history.push(...turn('a', 'a', CHUNK), ...call(1, 200_000)) // a 50k-token result

    const result = await $.session.compact({ trigger: 'auto', messages: [...history] })

    expect(result.messages).toHaveLength(1)
    expect(observationsIn(result.messages?.[0]?.text)).toContain('Read f1')
    expect(seen.logs.at(-2)).toMatch(/^observed 6 rows now, kept 0 raw messages/)
  })

  test('a memory message over the budget a small window leaves keeps its skills as lines and its user messages as the brief, and the rest whole', async ($, on) => {
    mock.clock(on, { now: at(22, 9, 0) })
    world(on)
    const correction = '🔴 User: "Keep the public API unchanged"'
    const seen = pi(on, {
      reply: (prompt) => {
        const name = prompt.match(/^\[User[^\]]*\]: (\w+)$/m)![1]
        return `${name === 'a' ? `<corrections>\n* ${correction}\n</corrections>\n` : ''}<observations>\n* 🔴 User: "${name}"\n</observations>\n<continuation>\nActive: ${name}\n</continuation>`
      },
    })
    on('skill.prompt', ($, e) => ({ text: e.text }))
    // (50k - 20k of system prompt and tools) / 2: a 15k-token budget, which the two skills alone fill.
    on('session.usage', () => ({ value: { context: { window: 50_000 }, rateLimits: [] } }) as never)
    await $.skill.prompt({ skill: 'plan', text: 'p'.repeat(30_000) })
    await $.skill.prompt({ skill: 'style', text: 's'.repeat(30_000) })
    const messages = [...turn('a\nKeep the public API unchanged', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...work('w', 8_000)]

    const result = await $.session.compact({ trigger: 'auto', messages })

    const text = result.messages?.[0]?.text ?? ''
    expect(skillsIn(text)).toBe(`<skill name="style" invoked="2026-09-22 09:00">${FINISHED}</skill>\n<skill name="plan" invoked="2026-09-22 09:00">${FINISHED}</skill>`)
    expect(userMessagesIn(text)).toEqual(['a\nKeep the public API unchanged', '(1 omitted)'])
    expect(text).toContain(`<corrections>\n* ${correction}\n</corrections>`)
    expect(observationsIn(text)).toBe('* 🔴 User: "a"\n* 🔴 User: "b"')
    expect(recordIn(text)).toBe(`${WHERE}:\nActive: b`)
    expect(nextStepIn(text)).toBe('b')
    expect(originals(result.messages?.slice(1))).toEqual(messages.slice(7))
    expect(seen.logs).toContainEqual(expect.stringMatching(/^over the ~15000-token budget at ~\d+ tokens: skills kept as lines, user messages as the brief$/))
  })

  test('a memory over its budget with source ranges and within it without leaves them out of that message only, before touching skills or user messages', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const seen = pi(on, { reply: (prompt) => `<observations>\n* 🟡 2026-09-22 ${prompt.includes(']: a\n') ? '14:30 read a file' : '15:30 read c'}\n</observations>` })
    let window = 200_000
    on('session.usage', () => ({ value: { context: { window }, rateLimits: [] } }) as never)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle()
    const observed = await $.session.compact({ trigger: 'auto', messages: [...history] })
    // A run of lines gives its range once: lines from two ranges in turn, carried forward from the memory message, are
    // each a run, and a line with none before them ends on its marker. A 15k-token budget: the ~7k tokens of
    // observations fit it, and with their ranges, ~14k, they do not.
    const minute = (i: number) => `14:3${i % 2}`
    const lines = Array.from({ length: 1200 }, (_, i) => `* 🟡 ${minute(i)} read a file (source ${minute(i)} to ${minute(i)})`)
    for (const key of Object.keys(stored)) delete stored[key]
    history.splice(0, history.length, withObservations(observed.messages![0]!, ['@ 2026-09-22', '* 🟡 14:29 Saw a, before the ranges (source none)', ...lines].join('\n')), ...observed.messages!.slice(1))
    window = 50_000
    await runTurn($, turn('c', 'c', CHUNK), at(22, 15, 30))
    await runTurn($, turn('d', 'd', 8_000), at(22, 16, 0))
    await clock.settle()
    const first = await $.session.compact({ trigger: 'auto', messages: [...history] })

    const text = first.messages?.[0]?.text ?? ''
    // Left out, the ranges take the marker with them.
    expect(observationsIn(text)).toBe(['* 🟡 2026-09-22 14:29 Saw a, before the ranges', ...Array.from({ length: 1200 }, (_, i) => `* 🟡 2026-09-22 ${minute(i)} read a file`), '* 🟡 2026-09-22 15:30 read c'].join('\n'))
    expect(userMessagesIn(text)).toEqual(['a', 'b', 'c'])
    expect(seen.logs).toContainEqual(expect.stringMatching(/^over the ~15000-token budget at ~\d+ tokens: source ranges left out$/))
    // The guide's line on source ranges goes with them.
    expect(text).toContain(`<memory-guide>\n${MEMORY_GUIDE}\n</memory-guide>`)
    // The ledger keeps them: a compaction with room for them gives them back.
    window = 200_000
    history.splice(0, history.length, ...first.messages!)
    await runTurn($, turn('e', 'e', CHUNK), at(22, 16, 30))
    await runTurn($, turn('f', 'f', 8_000), at(22, 17, 0))
    await clock.settle()
    const second = await $.session.compact({ trigger: 'auto', messages: [...history] })
    expect(second.messages?.[0]?.text).toContain(`<memory-guide>\n${MEMORY_GUIDE}\n${MEMORY_GUIDE_SOURCES} om_recall takes them as from and to.\n</memory-guide>`)
    expect(observationsIn(second.messages?.[0]?.text)?.split('\n').slice(0, 3)).toEqual(['* 🟡 2026-09-22 14:29 Saw a, before the ranges (source none)', '* 🟡 2026-09-22 14:30 read a file (source 2026-09-22 14:30 to 2026-09-22 14:30)', '* 🟡 2026-09-22 14:31 read a file (source 2026-09-22 14:31 to 2026-09-22 14:31)'])
  })

  test('a plugin-started compaction is skipped where another would fall back to the built-in compactor', async ($, on) => {
    mock.clock(on)
    const { history } = world(on)
    pi(on)
    let builtin = 0
    on('session.compact', () => (builtin++, { messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    history.push(...turn('a', 'a', CHUNK))

    const plugin = await $.session.compact({ trigger: 'plugin', instructions: 'keep the API', messages: [...history] })
    expect(plugin.skip).toBe('observational-memory: no built-in compaction for a plugin-started one')
    expect(builtin).toBe(0)
    const manual = await $.session.compact({ trigger: 'manual', instructions: 'keep the API', messages: [...history] })
    expect(manual.messages?.map((m) => m.text)).toEqual(['built-in summary'])
    expect(builtin).toBe(1)
  })

  test('over its budget at every cut the floor tries while a reflection is still running, compaction falls back and leaves the ledger as it was', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const { gate, open } = gates()
    const correction = '🔴 2026-09-22 14:30 User: "Keep the public API unchanged"'
    const big = `<corrections>\n* ${correction}\n</corrections>\n<observations>\n${'* 🟡 2026-09-22 14:30 read a file with a long name\n'.repeat(8_000)}</observations>`
    const seen = pi(on, { reply: () => big, reflect: () => big, hold: (n, prompt) => (prompt.startsWith('## OBSERVATIONS') ? gate(0) : undefined) })
    // Dense text: the last response measured 150k tokens where the characters estimate ~15k of messages, so the raw
    // tail's ~5k count ~43k beside ~100k of memory, and the memory alone, with no raw tail, is over the 90k budget.
    on('session.usage', () => ({ value: { context: { tokens: 150_000, window: 200_000 }, rateLimits: [] } }) as never)
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a\nKeep the public API unchanged', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 20_000), at(22, 15, 0))
    await clock.settle() // [0, 3) observed: its ~102k tokens of observations start a reflection, held
    expect(seen.prompts.at(-1)).toMatch(/^## OBSERVATIONS/)
    const before = stored['ledger:session-1'] as Ledger
    const result = await $.session.compact({ trigger: 'auto', messages: [...history] })

    expect(result.messages?.map((m) => m.text)).toEqual(['built-in summary'])
    expect(stored['ledger:session-1']).toEqual(before)
    expect(before.corrections).toEqual([correction])
    expect(seen.logs).toContainEqual(expect.stringMatching(/^the compacted context is over its budget: ~\d+ tokens, ~90000 allowed; using the built-in compaction$/))
    expect(seen.screen.at(-1)).toBe('Memory over its budget. Using built-in compaction')
    open(0)
    await clock.settle()
  })

  test('a memory over its budget with chunks observed on the spot falls back and stores them committed, not installed', async ($, on) => {
    mock.clock(on)
    const { history, stored } = world(on)
    const seen = pi(on, { reply: () => `<observations>\n${'* 🟡 read a file with a long name\n'.repeat(1_000)}</observations>` })
    // A 15k-token budget, under the ~20k of observations the two chunks bring even with the skills and prompts cut.
    on('session.usage', () => ({ value: { context: { window: 50_000 }, rateLimits: [] } }) as never)
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    history.push(...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...work('w', 8_000))

    const result = await $.session.compact({ trigger: 'auto', messages: [...history] })

    expect(result.messages?.map((m) => m.text)).toEqual(['built-in summary'])
    expect(seen.screen.at(-1)).toBe('Memory over its budget. Using built-in compaction')
    const ledger = stored['ledger:session-1'] as Ledger & { anchor?: string }
    expect([ledger.watermark.to, ledger.entries.length, ledger.anchor]).toEqual([7, 2_000, undefined])
  })

  // A hook above that settles a second after it passes the compaction on, abandoning the rest of the chain.
  const settlesFirst = { name: 'settles-first', tier: 'prepend' as const, register: ((on) => {
    on('session.compact', async ($, e, next) => {
      void next(e).catch(() => {})
      await $.clock.sleep(1_000)
      return { messages: [{ role: 'user' as const, text: 'summary from above', toolUses: [] }] }
    })
  }) satisfies Register }
  test('a compaction abandoned while it observes kills its calls and stores the chunks that landed committed, not installed', { plugins: [settlesFirst] }, async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored, files } = world(on)
    const { gate } = gates()
    const seen = pi(on, { hold: (n) => (n === 3 ? gate(3) : undefined) })
    const runTurn = live(on, clock, history)
    let builtIn = 0
    on('session.compact', () => (builtIn++, { messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', 8_000), at(22, 15, 0))
    await clock.settle() // [0, 3) observed
    history.push(...turn('c', 'c', CHUNK), ...turn('d', 'd', CHUNK), ...turn('e', 'e', CHUNK), ...turn('f', 'f', CHUNK), ...turn('g', 'g', 8_000))

    const compacting = $.session.compact({ trigger: 'manual', messages: [...history] })
    await clock.advance(1_000)
    const result = await compacting
    await clock.settle()

    expect(result.messages?.map((m) => m.text)).toEqual(['summary from above'])
    expect(seen.stopped).toBe(1)
    // Nor does the built-in compactor run beneath it: a throw after the abandonment would make it.
    expect(builtIn).toBe(0)
    expect(seen.logs).toContain('the compaction was abandoned; its chunks are kept, not installed')
    const ledger = stored['ledger:session-1'] as Ledger & { anchor?: string }
    expect([ledger.watermark.to, ledger.anchor]).toEqual([expect.any(Number), undefined])
    expect(ledger.watermark.to).toBeGreaterThan(3) // the chunk after the watermark landed; the held one did not
    expect(ledger.entries.map((e) => e.line)).toContain('🔴 2026-09-22 15:00 User: "b"')
    expect(seen.logs).toContain('observation of rows 11-15 at compaction failed (settles-first settled the call); left unobserved')
    expect(seen.logs.filter((l) => l.startsWith('Compacted') || l.startsWith('observed'))).toEqual([expect.stringMatching(/^observed rows 0-3 in the background/)])
    await clock.advance(5_000)
    expect(JSON.parse(files['/stats/session-1.json'] ?? '{"metrics":{}}').metrics['compaction.manual.ms']).toBeUndefined()
  })

  test('a memory whose constraints are within their cap but push it over its budget keeps them all: the floor briefs the raw tail instead', async ($, on) => {
    mock.clock(on)
    const { history, stored } = world(on)
    const corrections = Array.from({ length: 600 }, (_, i) => `🔴 User: "Leave module ${i} as it is"`)
    const seen = pi(on, {
      reply: (prompt) =>
        `${prompt.includes(']: a\n') ? `<corrections>\n${corrections.map((c) => `* ${c}\n`).join('')}</corrections>\n` : ''}<observations>\n${'* 🟡 read a file with a long name\n'.repeat(250)}</observations>`,
    })
    // A 15k-token budget: the ~6k of corrections, under their 8k cap, and the ~5k of observations with the ~8k raw tail
    // do not fit; without the tail, compiled into the session brief, they do.
    on('session.usage', () => ({ value: { context: { window: 50_000 }, rateLimits: [] } }) as never)
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    history.push(...turn('a\nleave every module as it is', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...work('w', 8_000))

    const result = await $.session.compact({ trigger: 'auto', messages: [...history] })

    const text = result.messages![0]!.text
    expect(correctionsIn(text)).toBe(corrections.map((c) => `* ${c}`).join('\n'))
    expect(result.messages).toHaveLength(1) // no raw tail
    expect(briefIn(text)).toStartWith(FLOOR_NOTE)
    expect(seen.logs.at(-1)).toMatch(/ · \d+ messages in a brief compiled by code \(the memory was over its budget\)$/)
    expect((stored['ledger:session-1'] as Ledger).corrections).toEqual(corrections)
  })

  test("constraints over their own cap shorten, the oldest first, to om_recall index lines: one the work in view names, and the newest that fit, stay whole; the ledger keeps every one whole", async ($, on) => {
    mock.clock(on)
    const { history, stored } = world(on)
    const long = (i: number) => `🔴 User: "Leave module ${i} as it is, ${'and do not touch its tests or its fixtures '.repeat(9)}"`
    const named = '🔴 User: "Keep src/widget_registry.ts as it is: widget_registry is public"'
    const corrections = [named, ...Array.from({ length: 100 }, (_, i) => long(i))]
    const seen = pi(on, {
      reply: (prompt) => `${prompt.includes(']: a\n') ? `<corrections>\n${corrections.map((c) => `* ${c}\n`).join('')}</corrections>\n` : ''}<observations>\n* 🔴 Saw\n</observations>`,
    })
    // The default 90k-token budget holds the ~10k the corrections take whole; their 8k-token cap does not.
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    history.push(...turn('a\nleave each module as it is and do not touch its tests or fixtures; keep src/widget_registry.ts public', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...work('widget_registry', 8_000))

    const result = await $.session.compact({ trigger: 'auto', messages: [...history] })

    const shown = correctionsIn(result.messages![0]!.text)!.split('\n')
    expect(shown).toHaveLength(corrections.length)
    expect(Math.ceil(shown.join('\n').length / 4)).toBeLessThanOrEqual(8_000)
    const short = shown.flatMap((l, i) => (l.includes('(older constraint, shortened: om_recall') ? [i] : []))
    expect(short.length).toBeGreaterThan(0)
    expect(shown[0]).toBe(`* ${named}`) // the oldest, but named by the raw tail's Read
    // The shortened run is the oldest after it; every line after the run is whole.
    expect(short).toEqual(Array.from({ length: short.length }, (_, i) => i + 1))
    expect(shown.slice(short.length + 1)).toEqual(corrections.slice(short.length + 1).map((c) => `* ${c}`))
    expect(shown[1]).toBe('* 🔴 User: "Leave module 0 as it is, and do not touch…" (older constraint, shortened: om_recall "Leave module 0 as it is,")')
    expect(seen.screen.at(-1)).not.toContain('built-in')
    expect((stored['ledger:session-1'] as Ledger).corrections).toEqual(corrections)
  })

  test("the budget is half the room below the auto-compaction threshold, less the overhead the session's breakdown lists", async ($, on) => {
    mock.clock(on)
    const { history } = world(on)
    const seen = pi(on, { reply: () => `<observations>\n${'* 🟡 read a file with a long name\n'.repeat(2_000)}</observations>` })
    // (100k to auto-compaction - 20k - 10k of a loaded MCP tool - 10k of memory files) / 2: a 30k-token budget,
    // under the ~34k of observations the two chunks bring. A deferred tool is outside the window.
    const breakdown = {
      autoCompactThreshold: 100_000,
      rawMaxTokens: 200_000,
      mcpTools: [
        { name: 'mcp__big__loaded', serverName: 'big', tokens: 10_000, isLoaded: true },
        { name: 'mcp__big__deferred', serverName: 'big', tokens: 50_000, isLoaded: false },
      ],
      memoryFiles: [{ path: '/work/project/CLAUDE.md', type: 'Project', tokens: 10_000 }],
      agents: [],
    }
    on('session.usage', ($, e) => ({ value: { context: { window: 200_000, ...(e.breakdown === 'summary' ? { breakdown } : {}) }, rateLimits: [] } }) as never)
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))
    history.push(...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...work('w', 8_000))

    const result = await $.session.compact({ trigger: 'auto', messages: [...history] })

    expect(result.messages?.map((m) => m.text)).toEqual(['built-in summary'])
    expect(seen.logs).toContainEqual(expect.stringMatching(/^the compacted context is over its budget: ~\d+ tokens, ~30000 allowed; using the built-in compaction$/))
  })

  test("planBudget: half the room below the session's limit less the overhead, and the raw tail's density from the last measure, never under 1", () => {
    const usage = (context: object) => ({ startedAt: 0, context, rateLimits: [] }) as never
    const breakdown = {
      autoCompactThreshold: 100_000,
      rawMaxTokens: 200_000,
      mcpTools: [
        { name: 'mcp__big__loaded', serverName: 'big', tokens: 10_000, isLoaded: true },
        { name: 'mcp__big__deferred', serverName: 'big', tokens: 50_000, isLoaded: false },
      ],
      memoryFiles: [{ path: '/work/project/CLAUDE.md', type: 'Project', tokens: 6_000 }],
      agents: [{ agentType: 'explore', source: 'built-in', tokens: 2_000 }],
      skills: { totalSkills: 3, includedSkills: 3, tokens: 1_000 },
      slashCommands: { totalCommands: 2, includedCommands: 2, tokens: 1_000 },
    }
    // (100k - 20k - 10k loaded - 6k - 2k - 1k - 1k) / 2; a deferred tool is outside the window. (80k - 40k) / 20k.
    expect(planBudget(usage({ window: 200_000, tokens: 80_000, breakdown }), true, 20_000)).toEqual({ budget: 30_000, density: 2, overhead: 40_000 })
    // No threshold: the window the breakdown measures against. Fewer tokens measured than estimated scale nothing down.
    expect(planBudget(usage({ window: 1_000_000, tokens: 30_000, breakdown: { ...breakdown, autoCompactThreshold: undefined } }), true, 20_000)).toEqual({ budget: 80_000, density: 1, overhead: 40_000 })
    // A subagent's model may have a smaller window than the main model's, and its context is not the one measured.
    expect(planBudget(usage({ window: 1_000_000, tokens: 900_000 }), false, 20_000)).toEqual({ budget: 90_000, density: 1, overhead: 20_000 })
    expect(planBudget(usage({ window: 1_000_000 }), true, 20_000)).toEqual({ budget: 490_000, density: 1, overhead: 20_000 })
    // No usage at all: the smallest window in use.
    expect(planBudget(undefined, true, 20_000)).toEqual({ budget: 90_000, density: 1, overhead: 20_000 })
  })

  test('a subagent whose every read passes the raw tail budget is observed in the background and compacts at its watermark', async ($, on) => {
    const clock = mock.clock(on)
    const { agents } = world(on)
    const seen = pi(on, { reply: readsIn })
    const step = steps(on)
    const rows: SessionMessage[] = (agents['agent-1'] = [{ role: 'user', text: 'Read the chapters in order.', toolUses: [] }])
    // As run 1 of the subagent smoke: each step starts on a 36 KB read, the newest row.
    for (let n = 0; n < 8; n++) {
      await clock.set(at(23, 9, n + 1))
      rows.push(...agentCall('one', n, 36_000))
      await step($, 's', n, rows.length, 'agent-1')
      await clock.settle()
    }
    const calls = seen.prompts.length
    expect(calls).toBeGreaterThan(0)

    const result = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: [...rows] })

    expect(seen.prompts).toHaveLength(calls)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    expect(originals(result.messages?.slice(-2))).toEqual(agentCall('one', 7, 36_000))
  })

  // A context window too small for any memory while `tiny()`: with the Observer failing too, the floor's brief is over
  // the budget at every cut, and the built-in compaction runs. Otherwise the host gives no usage: the default budget.
  const window = (on: On, tiny: () => boolean) =>
    on('session.usage', () => {
      if (!tiny()) throw new Error('no usage')
      return { value: { context: { window: 4_000 }, rateLimits: [] } } as never
    })

  test("after a subagent's built-in fallback, its later compactions match its history and cut at the background watermark", async ($, on) => {
    const clock = mock.clock(on)
    const { agents, stored } = world(on)
    let failing = true
    const seen = pi(on, { reply: readsIn, fail: () => (failing ? overloaded() : undefined) })
    window(on, () => failing)
    const step = steps(on)
    on('turn.complete', () => ({ text: '' }))
    on('session.compact', ($, e) => ({ messages: [SUMMARY, ...e.messages.slice(-2)] }))
    const rows: SessionMessage[] = (agents['agent-1'] = [{ role: 'user', text: 'Read the files, then report.', toolUses: [] }])
    let context = () => [...rows]
    const run = async (from: number, to: number) => {
      for (let n = from; n < to; n++) {
        await clock.set(at(23, 9, n + 1))
        rows.push(...agentCall('one', n, 16_000))
        await step($, 's', n, rows.length, 'agent-1')
        await clock.settle()
      }
    }

    await run(0, 10)
    const first = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: context() })
    expect(first.messages?.[0]).toEqual(SUMMARY)
    // The engine appends the summary to the subagent's history and leaves the rows it kept where they were, before
    // it; the live context is the summary, the kept rows, then what comes after.
    const kept = first.messages!.slice(1)
    rows.push(SUMMARY)
    const live = rows.length
    context = () => [SUMMARY, ...kept, ...rows.slice(live)]
    failing = false
    await run(10, 20)
    const calls = seen.prompts.length
    expect(calls).toBeGreaterThan(0)

    const second = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: context() })

    expect(seen.prompts).toHaveLength(calls)
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    expect(observationsIn(second.messages?.[0]?.text)).toContain('one-10')
    expect(seen.screen).toEqual([])
    expect(seen.logs.filter((l) => l.startsWith('Compacted'))).toEqual([expect.stringMatching(/^Compacted subagent in 0 ms · memory \d+ notes$/)])
    await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    expect(Object.keys(stored)).toEqual([]) // the fallback's record goes with the subagent's other keys
  })

  test('after a main built-in fallback, later compactions match the history its summary leads and cut at the background watermark', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    let failing = true
    const seen = pi(on, { reply: readsIn, fail: () => (failing ? overloaded() : undefined) })
    window(on, () => failing)
    const step = steps(on)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('session.compact', ($, e) => ({ messages: [SUMMARY, ...e.messages.slice(-2)] }))
    const run = async (from: number, to: number) => {
      for (let n = from; n < to; n++) {
        await clock.set(at(23, 9, n + 1))
        history.push(...agentCall('main', n, 16_000))
        await step($, 't', n + 1, history.length)
        await clock.settle()
      }
    }
    await clock.set(at(23, 9, 0))
    history.push({ role: 'user', text: 'Read the files, then report.', toolUses: [] })
    await $.turn.start({ text: 'Read the files, then report.', turnId: 't' })

    await run(0, 10)
    const first = await $.session.compact({ trigger: 'auto', messages: [...history] })
    expect(first.messages?.[0]).toEqual(SUMMARY)
    // The main history is the compaction's result from here on; it grows past its old length before the next.
    history.splice(0, history.length, ...first.messages!)
    failing = false
    await run(10, 24)
    const calls = seen.prompts.length
    expect(calls).toBeGreaterThan(0)

    const second = await $.session.compact({ trigger: 'auto', messages: [...history] })

    expect(seen.prompts).toHaveLength(calls)
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent') || l.includes('restarting the ledger'))).toEqual([])
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    expect(observationsIn(second.messages?.[0]?.text)).toContain('main-10')
  })

  // The floor on a persistent ledger: the Observer fails in the background and again at compaction, so the floor
  // briefs what leaves context with nothing observed, and the first background chunk, held in flight across it, lands
  // after it on rows the brief took. The engine appends the memory message to a subagent's history.
  test("after a subagent's floor, a chunk in flight across it lands discarded, and later compactions match its history and cut at the background watermark", async ($, on) => {
    const clock = mock.clock(on)
    const { agents, stored } = world(on)
    const { gate, open } = gates()
    let failing = true
    const seen = pi(on, { reply: readsIn, hold: (n) => (n === 1 ? gate(1) : undefined), fail: () => (failing ? overloaded() : undefined) })
    const step = steps(on)
    on('turn.complete', () => ({ text: '' }))
    let builtin = 0
    on('session.compact', () => (builtin++, { messages: [SUMMARY] }))
    const rows: SessionMessage[] = (agents['agent-1'] = [{ role: 'user', text: 'Read the files, then report.', toolUses: [] }])
    let context = () => [...rows]
    const run = async (from: number, to: number) => {
      for (let n = from; n < to; n++) {
        await clock.set(at(23, 9, 0) + (n + 1) * 10_000 + (n < 10 ? 0 : 30_000)) // the held call stays within its timeout; then the deadline passed
        rows.push(...agentCall('one', n, 16_000))
        await step($, 's', n, rows.length, 'agent-1')
        await clock.settle()
      }
    }

    await run(0, 10)
    expect([seen.inFlight, seen.prompts[0]]).toEqual([1, expect.stringContaining('/src/one-0.ts')]) // the first chunk, held
    // Compaction observes the held call's rows itself, and fails there too.
    const first = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: context() })
    expect(seen.logs).toContainEqual(expect.stringMatching(/^observation of rows 0-\d+ at compaction failed \(.*\); left unobserved$/))
    expect(builtin).toBe(0)
    expect(briefIn(first.messages![0]!.text)).toStartWith(FLOOR_NOTE)
    rows.push(...first.messages!)
    const live = rows.length - first.messages!.length
    context = () => rows.slice(live)
    failing = false
    open(1)
    await clock.settle()
    expect(seen.logs).toContainEqual(expect.stringMatching(/^rows \d+-\d+ were observed but no longer match the transcript; discarded$/))
    await run(10, 20)
    const calls = seen.prompts.length

    const second = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: context() })

    expect(seen.prompts).toHaveLength(calls)
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent') || l.includes('restarting the ledger'))).toEqual([])
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    const observed = observationsIn(second.messages?.[0]?.text)
    expect(observed).toContain('one-10')
    expect(observed).not.toMatch(/\bone-0\b/) // the chunk the brief took
    expect(seen.logs.filter((l) => l.startsWith('Compacted'))).toEqual([
      expect.stringMatching(/^Compacted subagent in 0 ms · memory 0 notes · \d+ messages in a brief compiled by code \(the Observer failed\)$/),
      expect.stringMatching(/^Compacted subagent in 0 ms · memory \d+ notes$/),
    ])
    await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })
    expect(Object.keys(stored)).toEqual([])
  })

  test('after a main floor, a chunk in flight across it lands discarded, and later compactions match the history its memory message leads and cut at the background watermark', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const { gate, open } = gates()
    let failing = true
    const seen = pi(on, { reply: readsIn, hold: (n) => (n === 1 ? gate(1) : undefined), fail: () => (failing ? overloaded() : undefined) })
    const step = steps(on)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    let builtin = 0
    on('session.compact', () => (builtin++, { messages: [SUMMARY] }))
    const run = async (from: number, to: number) => {
      for (let n = from; n < to; n++) {
        await clock.set(at(23, 9, 0) + (n + 1) * 10_000 + (n < 10 ? 0 : 30_000)) // the held call stays within its timeout; then the deadline passed
        history.push(...agentCall('main', n, 16_000))
        await step($, 't', n + 1, history.length)
        await clock.settle()
      }
    }
    await clock.set(at(23, 9, 0))
    history.push({ role: 'user', text: 'Read the files, then report.', toolUses: [] })
    await $.turn.start({ text: 'Read the files, then report.', turnId: 't' })

    await run(0, 10)
    expect([seen.inFlight, seen.prompts[0]]).toEqual([1, expect.stringContaining('/src/main-0.ts')]) // the first chunk, held
    const compacting = $.session.compact({ trigger: 'auto', messages: [...history] })
    await clock.advance(30_000) // the deadline, the held call still in flight
    const first = await compacting
    expect(builtin).toBe(0)
    expect(briefIn(first.messages![0]!.text)).toStartWith(FLOOR_NOTE)
    // The main history is the compaction's result from here on; it grows past its old length before the next.
    history.splice(0, history.length, ...first.messages!)
    failing = false
    open(1)
    await clock.settle()
    expect(seen.logs).toContainEqual(expect.stringMatching(/^rows \d+-\d+ were observed but no longer match the transcript; discarded$/))
    await run(10, 24)
    const calls = seen.prompts.length

    const second = await $.session.compact({ trigger: 'auto', messages: [...history] })

    expect(seen.prompts).toHaveLength(calls)
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent') || l.includes('restarting the ledger'))).toEqual([])
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    const observed = observationsIn(second.messages?.[0]?.text)
    expect(observed).toContain('main-10')
    expect(observed).not.toMatch(/\bmain-0\b/) // the chunk the brief took
  })
})
