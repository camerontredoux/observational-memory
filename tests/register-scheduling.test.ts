import { describe, expect, mock, test } from 'claude-code/testing'
import { turn, CHUNK, at, world, ember, live, gates, steps, agentCall, readsIn, constraining, correctionsIn } from './harness'
import type { Ledger } from './harness'

// How background observation is scheduled around compactions, across loops, and across the chunks of one batch.
describe('register: scheduling', () => {
  // The engine installs a compaction's result only after the hook returns: until then the history still shows the
  // context compacted, and a landing that reconciled against it rebuilt the ledger from the old memory message.
  test("a background chunk landing after a compaction stored its ledger, before the history shows the new memory message, is discarded and the ledger stands", async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const { gate, open } = gates()
    const seen = ember(on, { hold: (n) => (n === 2 ? gate(2) : undefined) })
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await clock.settle() // [0, 3) observed
    await runTurn($, turn('c', 'c', 8_000), at(22, 15, 1), 10_000)
    await clock.settle() // [3, 7) in flight, held
    const result = await $.session.compact({ trigger: 'auto', messages: [...history] })
    const installed = structuredClone(stored['ledger:session-1']) as Ledger
    open(2) // lands while the history still shows the context compacted
    await clock.settle()

    expect(seen.logs).toContain("rows 3-7 landed while a compaction's memory was being installed; discarded")
    expect(seen.logs.filter((l) => l.includes('restarting the ledger'))).toEqual([])
    expect(stored['ledger:session-1']).toEqual(installed)
    // Once the history shows it, the next pass goes on from the installed ledger.
    history.push(...result.messages!)
    await runTurn($, turn('d', 'd', CHUNK), at(22, 16, 0))
    await runTurn($, turn('e', 'e', 8_000), at(22, 16, 2))
    await clock.settle()
    expect(seen.logs.filter((l) => l.includes('restarting the ledger'))).toEqual([])
    expect((stored['ledger:session-1'] as Ledger).anchor).toBe(installed.anchor)
    expect(seen.prompts.some((p) => p.includes(']: d\n'))).toBe(true)
  })

  test('chunks observed side by side carry forward the continuation fields an earlier one set and a later one never saw; "none" still clears', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    ember(on, {
      reply: constraining({}, {
        a: 'Active: a\nNext steps: run the tests\nWaiting for user: approve the plan',
        b: 'Active: b\nNext steps: none',
      }),
    })
    const runTurn = live(on, clock, history)

    await runTurn($, [...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK), ...turn('c', 'c', 8_000)], at(22, 14, 30))
    await clock.settle()

    const ledger = stored['ledger:session-1'] as Ledger
    expect(ledger.watermark.to).toBe(7)
    expect(ledger.currentTask).toBe('Active: b\nWaiting for user: approve the plan')
  })

  test("a correction observed beside a constraint an earlier chunk of its batch set is observed again beside it, so it can name what it reverses", async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = ember(on, {
      reply: constraining({
        setup: { quote: 'Use pnpm, never npm' },
        reverse: { quote: 'Use npm after all, pnpm breaks the lockfile', replaces: 'Use pnpm' },
      }),
    })
    const runTurn = live(on, clock, history)

    await runTurn($, [...turn('setup\nUse pnpm, never npm', 'r', CHUNK), ...turn('reverse\nUse npm after all, pnpm breaks the lockfile', 'r', CHUNK), ...turn('tail', 'r', 8_000)], at(22, 14, 0))
    await clock.settle()
    const result = await $.session.compact({ trigger: 'manual', messages: [...history] })

    const reversals = seen.prompts.filter((p) => p.includes(']: reverse\n'))
    expect(reversals).toHaveLength(2)
    expect(reversals[0]).not.toContain('Use pnpm, never npm')
    expect(reversals[1]).toMatch(/\n\[k[0-9a-f]+\] 🔴 [\d-]+ [\d:]+ User: "Use pnpm, never npm"\n/)
    expect(correctionsIn(result.messages?.[0]?.text)).toMatch(
      /^\* 🔴 [\d-]+ [\d:]+ User: "Use npm after all, pnpm breaks the lockfile" \(this replaces the earlier constraint [\d-]+ [\d:]+ User: "Use pnpm, never npm"\)$/,
    )
  })

  test("a subagent is observed in the background only once its context nears its compaction point", async ($, on) => {
    const clock = mock.clock(on)
    const { agents, stored } = world(on)
    on('session.usage', () => ({ value: { context: { window: 200_000 }, rateLimits: [] } }) as never)
    const seen = ember(on, { reply: readsIn })
    const step = steps(on)
    await clock.set(at(23, 9, 0))
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]

    // 20k of overhead and ~140k of history, short of the 200k window by more than SUBAGENT_OBSERVE_TOKENS.
    for (let n = 0; n < 14; n++) {
      agents['agent-1'].push(...agentCall('one', n, 40_000))
      await step($, 's', n, agents['agent-1'].length, 'agent-1')
      await clock.settle()
    }
    expect(seen.prompts).toEqual([])
    for (let n = 14; n < 16; n++) {
      agents['agent-1'].push(...agentCall('one', n, 40_000))
      await step($, 's', n, agents['agent-1'].length, 'agent-1')
      await clock.settle()
    }

    expect(seen.prompts.length).toBeGreaterThan(0)
    expect((stored['ledger:session-1/agent-1'] as Ledger).entries.length).toBeGreaterThan(0)
  })

  test("a compaction does not queue behind another loop's scheduling pass", async ($, on) => {
    const clock = mock.clock(on)
    const { gate, open } = gates()
    const { agents } = world(on, { holdGet: (key) => (key === 'ledger:session-1/agent-1' ? gate(1) : undefined) })
    const seen = ember(on, { reply: readsIn })
    const step = steps(on)
    agents['agent-1'] = [{ role: 'user', text: 'brief', toolUses: [] }]
    for (let n = 0; n < 6; n++) agents['agent-1'].push(...agentCall('one', n, 16_000))
    await step($, 's', 0, agents['agent-1'].length, 'agent-1')
    await clock.settle() // the subagent's pass holds its ledger read

    let done = false
    const compacting = $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)] }).then((r) => ((done = true), r))
    await clock.settle()

    expect(done).toBe(true)
    expect((await compacting).messages?.length).toBeGreaterThan(0)
    expect(seen.logs.at(-1)).toMatch(/^Compacted in /)
    open(1)
    await clock.settle()
  })

  test('at compaction, the git state is read while the Observer calls run, not before them', async ($, on) => {
    const clock = mock.clock(on)
    world(on)
    const { gate, open } = gates()
    const seen = ember(on, { reply: readsIn, git: () => gate(1).then(() => undefined) }) // outside a repository, once let go

    let done = false
    const compacting = $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)] }).then((r) => ((done = true), r))
    await clock.settle()
    expect([seen.git.length, seen.prompts.length, done]).toEqual([2, 1, false]) // the chunk observed while git runs
    open(1)
    await compacting
    expect(seen.logs.at(-1)).toMatch(/^Compacted in .* observed 3 messages on the spot/)
  })
})
