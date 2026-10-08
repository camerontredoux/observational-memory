import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { originalId } from '../hooks/recall'
import { originals, turn, COMPOSER, CHUNK, at, world, pi, live, observationsIn, call } from './harness'
import type { Ledger } from './harness'

// Grouped calls, the raw tail, matching a context to its history, and the stats.
describe('register: alignment', () => {
  // Parallel tool calls: the history holds each result right after its call, the live context all the calls, then
  // all the results (as a live haiku run with several Reads per response showed).
  const parallel = (name: string, n: number, size: number) => {
    const calls = Array.from({ length: n }, (_, i) => call(Number(`${name.charCodeAt(0)}${i}`), size))
    return { history: calls.flat(), context: [...calls.map((c) => c[0]!), ...calls.map((c) => c[1]!)] }
  }
  const tailKeepsCalls = (tail: readonly SessionMessage[]) => {
    const ids = new Set(tail.flatMap((m) => m.toolUses.map((u) => u.tool_use_id)))
    return tail.every((m) => (m.toolResults ?? []).every((r) => ids.has(r.tool_use_id)))
  }

  test('a context that groups parallel tool calls under the watermark still cuts there with no Observer call', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)
    const block = parallel('a', 4, 10_000)
    const answer = { role: 'assistant' as const, text: 'a done', toolUses: [] }

    await runTurn($, [{ role: 'user', text: 'a', toolUses: [] }, ...block.history, answer], at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await runTurn($, turn('c', 'c', 8_000), at(22, 15, 30))
    await clock.settle()
    const observed = seen.prompts.length
    const context = [history[0]!, ...block.context, ...history.slice(1 + block.history.length)]
    const result = await $.session.compact({ trigger: 'auto', messages: context.map((m, i) => ({ ...m, handle: `h${i}` })) })

    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    expect(seen.logs).not.toContain('the transcript changed under the observations; restarting the ledger from the memory message')
    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    expect(seen.logs.at(-1)).toMatch(/^Compacted in 0 ms · memory \d+ notes?$/)
    const tail = originals(result.messages!.slice(1))!
    expect(tail).toEqual(context.slice(context.length - tail.length))
    expect(tailKeepsCalls(tail)).toBe(true)
  })

  test('a context that groups parallel tool calls in the raw tail, at the same length as the history, is persistent', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await clock.settle()
    const observed = seen.prompts.length
    const block = parallel('c', 2, 2_000)
    history.push({ role: 'user', text: 'c', toolUses: [] }, ...block.history)
    const context = [...history.slice(0, history.length - block.history.length), ...block.context]
    expect(context).toHaveLength(history.length)
    const result = await $.session.compact({ trigger: 'auto', messages: context })

    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
    const tail = originals(result.messages!.slice(1))!
    expect(tail.slice(-4)).toEqual(block.context)
    expect(tailKeepsCalls(tail)).toBe(true)
  })

  test('after a compaction, a context that groups parallel tool calls matches the tail of the longer history', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await clock.settle()
    const first = await $.session.compact({ trigger: 'auto', messages: [...history] })
    history.push(...first.messages!)
    const memory = first.messages![0]!
    const block = parallel('d', 4, 10_000)
    await runTurn($, [{ role: 'user', text: 'd', toolUses: [] }, ...block.history, { role: 'assistant', text: 'd done', toolUses: [] }], at(22, 16, 0))
    await runTurn($, turn('e', 'e', CHUNK), at(22, 16, 30))
    await runTurn($, turn('f', 'f', 8_000), at(22, 17, 0))
    await clock.settle()
    const observed = seen.prompts.length
    const current = history.slice(history.indexOf(memory))
    const start = current.indexOf(block.history[0]!)
    const context = [...current.slice(0, start), ...block.context, ...current.slice(start + block.history.length)]
    await $.session.compact({ trigger: 'auto', messages: context })

    expect(history.length).toBeGreaterThan(context.length)
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
  })

  test('an older wrapper row in the raw tail keeps only the lines a newer one does not repeat, and reads whole again after the compaction', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)
    const notice = (id: string) => `<task-notification>\n<task-id>${id}</task-id>\nThe watcher woke: read the inbox, act on each new file, then reply to the lead with what changed.\n</task-notification>`

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await clock.settle()
    await runTurn($, [{ role: 'user', text: notice('w1'), toolUses: [] }, { role: 'assistant', text: 'read the inbox', toolUses: [] }], at(22, 15, 10))
    await runTurn($, [{ role: 'user', text: notice('w2'), toolUses: [] }, { role: 'assistant', text: 'read it again', toolUses: [] }], at(22, 15, 20))
    const first = await $.session.compact({ trigger: 'auto', messages: [...history] })
    const tail = first.messages!.slice(1).map((m) => m.text)
    expect(tail).toContain(notice('w2'))
    expect(tail.find((t) => t.includes('w1'))).toMatch(/^<task-notification>\n<task-id>w1<\/task-id>\n\(repeated lines as in the newer notice below; [0-9a-f]+\)$/)

    history.push(...first.messages!)
    const memory = first.messages![0]!
    await runTurn($, turn('c', 'c', CHUNK), at(22, 16, 0))
    await runTurn($, turn('d', 'd', 8_000), at(22, 16, 30))
    await clock.settle()
    const observed = seen.prompts.length
    await $.session.compact({ trigger: 'auto', messages: history.slice(history.indexOf(memory)) })

    // The Observer read both notices whole, and the next compaction matched the history with no Observer call.
    expect(seen.prompts.some((p) => p.includes('repeated lines as in the newer notice'))).toBe(false)
    expect(seen.prompts.join('\n').split('then reply to the lead').length - 1).toBe(2)
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
  })

  test('an older tool input and result the raw tail cut read whole again after the compaction', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)
    const script = `cat <<'EOF' > notes.txt\n${'a heredoc line\n'.repeat(300)}EOF`
    const output = `BEGIN build\n${'compiled module\n'.repeat(300)}END: build passed`

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await clock.settle()
    await runTurn(
      $,
      [
        { role: 'user', text: 'build', toolUses: [] },
        { role: 'assistant', text: '', toolUses: [{ tool_use_id: 't-build', tool: 'Bash', input: { command: script } }] },
        { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 't-build', text: output, isError: false }] },
        { role: 'assistant', text: 'built', toolUses: [] },
      ],
      at(22, 15, 10),
    )
    // Three newer calls and results, so the build's are past the ones the raw tail keeps whole.
    await runTurn($, turn('p', 'p'), at(22, 15, 20))
    await runTurn($, turn('q', 'q'), at(22, 15, 30))
    await runTurn($, turn('r', 'r'), at(22, 15, 40))
    const first = await $.session.compact({ trigger: 'auto', messages: [...history] })
    const call = first.messages!.flatMap((m) => m.toolUses).find((u) => originalId(u.tool_use_id) === 't-build')
    const result = first.messages!.flatMap((m) => m.toolResults ?? []).find((r) => originalId(r.tool_use_id) === 't-build')
    expect(String(call?.input.command)).toContain('om_recall can retrieve the full input')
    expect(result?.text).toContain('om_recall can retrieve the full result')
    expect(seen.prompts.join('\n')).not.toContain('compiled module') // not observed yet

    history.push(...first.messages!)
    const memory = first.messages![0]!
    await runTurn($, turn('c', 'c', CHUNK), at(22, 16, 0))
    await runTurn($, turn('d', 'd', 8_000), at(22, 16, 30))
    await clock.settle()
    const observed = seen.prompts.length
    await $.session.compact({ trigger: 'auto', messages: history.slice(history.indexOf(memory)) })

    // The Observer read the call and its result whole, and the next compaction matched the history with no Observer call.
    expect(seen.prompts.join('\n')).toContain(JSON.stringify({ command: script }))
    expect(seen.prompts.join('\n')).toContain(output)
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
  })

  // A compaction writes its kept tail back in the context's order, so the history then holds a parallel block
  // grouped. The background ledger and the next compaction must read it in the same order, or the watermark over
  // it looks changed and the whole backlog is observed on the spot (a firstmate session, upgraded mid-way to 0.4.5).
  test('a parallel block a compaction wrote back grouped, under the watermark, still cuts there with no Observer call', async ($, on) => {
    const clock = mock.clock(on)
    const { history, stored } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    const block = parallel('c', 2, 2_000)
    history.push({ role: 'user', text: 'c', toolUses: [] }, ...block.history)
    await clock.settle()
    const first = await $.session.compact({ trigger: 'auto', messages: [...history.slice(0, -block.history.length), ...block.context] })
    const memory = first.messages![0]!
    expect(originals(first.messages!.slice(-block.context.length))).toEqual(block.context)
    history.push(...first.messages!)
    await runTurn($, turn('d', 'd', CHUNK), at(22, 16, 0))
    await runTurn($, turn('e', 'e', CHUNK), at(22, 16, 30))
    await runTurn($, turn('f', 'f', 8_000), at(22, 17, 0))
    await clock.settle()
    const observed = seen.prompts.length
    const ledger = stored['ledger:session-1'] as Ledger
    const current = history.slice(history.lastIndexOf(memory))
    expect(ledger.watermark.to).toBeGreaterThan(current.indexOf(block.context.at(-1)!))
    await $.session.compact({ trigger: 'auto', messages: current })

    expect(seen.logs).not.toContain('the transcript changed under the observations; restarting the ledger from the memory message')
    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
  })

  test('a compaction finds its context when the history holds rows past it (the /compact command) and keeps the ledger', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await runTurn($, turn('c', 'c', 8_000), at(22, 15, 30))
    await clock.settle()
    const observed = seen.prompts.length
    expect(observed).toBeGreaterThan(0)
    const context = [...history]
    history.push({ role: 'user', text: '<command-name>/compact</command-name>', toolUses: [] })
    await $.session.compact({ trigger: 'manual', messages: context })

    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([])
    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
  })

  test('a main compaction whose context does not match the history says why, once, and counts it', async ($, on) => {
    const clock = mock.clock(on)
    const { history, files } = world(on)
    const seen = pi(on)
    on('session.compact', () => ({ messages: [{ role: 'user' as const, text: 'built-in summary', toolUses: [] }] }))

    history.push(...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000))
    await $.session.compact({ trigger: 'auto', messages: [...history, { role: 'user', text: 'not yet in the history', toolUses: [] }] })
    const changed = [...history]
    changed[2] = { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 't-a', text: '[Old tool result content cleared]', isError: false }] }
    await $.session.compact({ trigger: 'auto', messages: changed })
    await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: changed }) // a subagent's history it cannot read: no line
    await clock.advance(5_000)

    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent'))).toEqual([
      'compaction not persistent: the context has 9 messages, the history 8',
      'compaction not persistent: context message 2 differs from history row 2 (context user, 34 chars, 0 tool uses, 1 tool results; history user, 40001 chars, 0 tool uses, 1 tool results); 1 of 8 differ, the first reading as history row none within 8',
    ])
    const file = JSON.parse(files['/stats/session-1.json']!) as { counts: Record<string, number> }
    expect(file.counts['compaction.notPersistent']).toBe(2)
  })

  test('a context that differs from the history past the watermark keeps the ledger up to it and counts how it differs', async ($, on) => {
    const clock = mock.clock(on)
    const { history, files, stored } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await runTurn($, turn('c', 'c', 8_000), at(22, 15, 30))
    await clock.settle()
    const observed = seen.prompts.length
    const kept = (stored['ledger:session-1'] as Ledger).watermark.to
    expect(kept).toBeLessThan(history.length - 2)
    // The history holds a row the context lacks (`extra`); then its last row reads as none nearby (`changed`).
    await $.session.compact({ trigger: 'auto', messages: history.filter((_, i) => i !== history.length - 2) })
    const note = { role: 'user' as const, text: '<task-notification>done</task-notification>', toolUses: [] }
    await $.session.compact({ trigger: 'auto', messages: [...history.slice(0, -1), note] })
    await clock.advance(5_000)

    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.filter((l) => l.includes('restarting the ledger'))).toEqual([])
    expect(seen.logs.filter((l) => l.startsWith('cut at the background watermark with no Observer call'))).toHaveLength(2)
    const stats = JSON.parse(files['/stats/session-1.json']!) as { counts: Record<string, number>; metrics: Record<string, { sum: number; max: number }> }
    expect(stats.counts).toMatchObject({
      'compaction.notPersistent': 2,
      'compaction.notPersistent.auto': 2,
      'compaction.notPersistent.extra': 1,
      'compaction.notPersistent.changed': 1,
      'compaction.notPersistent.rows.reply-result': 1,
      'compaction.notPersistent.rows.injected-reply': 1,
    })
    expect(stats.metrics['compaction.notPersistent.fromEnd']!.max).toBeLessThanOrEqual(2)
    expect(stats.metrics['compaction.notPersistent.rowsKept']!.sum).toBe(2 * kept)
  })

  test('a context that differs from the history under the watermark only in a tool result keeps the ledger, checked against the history', async ($, on) => {
    const clock = mock.clock(on)
    const { history, files, stored } = world(on)
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, turn('a', 'a', CHUNK), at(22, 14, 30))
    await runTurn($, turn('b', 'b', CHUNK), at(22, 15, 0))
    await runTurn($, turn('c', 'c', 8_000), at(22, 15, 30))
    await clock.settle()
    const observed = seen.prompts.length
    const ledger = stored['ledger:session-1'] as Ledger
    expect(ledger.watermark.to).toBeGreaterThan(2)
    // The context alone reads a's result, under the watermark, differently: the history still holds it whole.
    const context = [...history]
    context[2] = { ...history[2]!, toolResults: [{ tool_use_id: 't-a', text: '[Old tool result content cleared]', isError: false }] }
    const result = await $.session.compact({ trigger: 'auto', messages: context })
    await clock.advance(5_000)

    expect(seen.prompts).toHaveLength(observed)
    expect(seen.logs.filter((l) => l.includes('restarting the ledger'))).toEqual([])
    expect(seen.logs.filter((l) => l.startsWith('cut at the background watermark with no Observer call'))).toHaveLength(1)
    expect(observationsIn(result.messages?.[0]?.text)?.replace(/ \(source .*\)$/gm, '')).toBe(ledger.entries.map((e) => `* ${e.line}`).join('\n'))
    expect(originals(result.messages?.slice(1))).toEqual(context.slice(ledger.watermark.to))
    const stats = JSON.parse(files['/stats/session-1.json']!) as { counts: Record<string, number>; metrics: Record<string, { sum: number }> }
    expect(stats.counts['compaction.notPersistent.rows.result-result']).toBe(1)
    expect(stats.metrics['compaction.notPersistent.rowsKept']!.sum).toBe(ledger.watermark.to)
  })

  test('stats: background calls and a compaction land in the session file, and om_stats and /om-stats report them', async ($, on) => {
    const clock = mock.clock(on)
    const { history, files } = world(on)
    pi(on)
    on('session.usage', () => ({ value: { context: { tokens: 90_000, window: 200_000 }, rateLimits: [] } }) as never) // the fields the hook reads
    const runTurn = live(on, clock, history)

    await runTurn($, [...turn('a', 'a', CHUNK), ...turn('b', 'b', CHUNK)], at(22, 14, 30))
    await clock.settle()
    history.push(...turn('c', 'c', CHUNK * 5), ...turn('d', 'd', 8_000))
    await $.session.compact({ trigger: 'manual', messages: [...history] })
    await clock.advance(5_000)

    const file = JSON.parse(files['/stats/session-1.json']!) as { cwd: string; metrics: Record<string, { count: number; sum: number }> }
    expect(file.cwd).toBe('/work/project')
    expect(file.metrics['observer.background.ms']?.count).toBe(2)
    expect(Math.round(file.metrics['observer.background.cost']!.sum * 1e7)).toBe(50_216)
    expect(file.metrics['observer.background.in']?.sum).toBe(18_412)
    expect(file.metrics['observer.background.cacheRead']?.sum).toBe(6_144) // pi's prompt-cache hits, apart from its input
    expect(file.metrics['observer.background.cacheWrite']?.sum).toBe(0)
    expect(file.metrics['observer.background.observations']?.sum).toBe(2)
    expect(file.metrics['observer.compaction.ms']?.count).toBeGreaterThan(0)
    expect(file.metrics['compaction.manual.syncCalls']?.sum).toBe(file.metrics['observer.compaction.ms']?.count)
    expect(file.metrics['compaction.manual.rowsObservedBefore']?.sum).toBe(7)
    expect(file.metrics['compaction.manual.tokensBefore']?.sum).toBe(90_000)
    expect(file.metrics['compaction.manual.estTokensAfter']?.sum).toBeLessThan(90_000)

    const summary = String((await $.tool.call({ tool: 'mcp__observational-memory__om_stats' })).result)
    expect(summary).toStartWith('observational-memory · this session (/work/project) · ')
    expect(summary).toMatch(/^Background   2 calls,/m)
    const tool = String((await $.tool.call({ tool: 'mcp__observational-memory__om_stats', full: true })).result)
    expect(tool).toContain('## observational-memory stats, session session-1 (/work/project)')
    expect(tool).toMatch(/1 compaction\(s\), \d+ Luna call\(s\) \(0 failed\)/)
    expect(tool).toMatch(/\| observer\.background\.ms \| 2 \|/)
    files['/stats/other.json'] = JSON.stringify({ version: 1, sessionId: 'other', firstSeen: 0, lastSeen: 0, counts: {}, metrics: { 'observer.background.ms': { count: 1, sum: 5, min: 5, max: 5, recent: [[0, 5]] } } })
    expect((await $.command.run({ command: 'om-stats', args: 'all', ...COMPOSER })).text).toStartWith('all sessions (2) · ')
    const all = await $.command.run({ command: 'om-stats', args: 'full all', ...COMPOSER })
    expect(all.text).toContain('## observational-memory stats, all sessions')
    expect(all.text).toMatch(/^2 session\(s\)/m)
    expect(all.text).toMatch(/\| observer\.background\.ms \| 3 \|/)
    const recent = await $.command.run({ command: 'om-stats', args: 'all 1d full', ...COMPOSER })
    expect(recent.text).toMatch(/^1 session\(s\)/m)
  })

  test('stats: a failed stats write is logged once and compaction and observation carry on', async ($, on) => {
    const clock = mock.clock(on)
    const { history } = world(on, { failWrites: true })
    const seen = pi(on)
    const runTurn = live(on, clock, history)

    await runTurn($, [...turn('a', 'a', CHUNK), ...turn('b', 'b', 8_000)], at(22, 14, 30))
    await clock.settle()
    const first = await $.session.compact({ trigger: 'manual', messages: [...history] })
    await clock.advance(5_000)
    history.splice(0, history.length, ...first.messages!, ...turn('c', 'c', CHUNK), ...turn('d', 'd', 8_000))
    const second = await $.session.compact({ trigger: 'manual', messages: [...history] })
    await clock.advance(5_000)

    expect(observationsIn(first.messages?.[0]?.text)).toBe('* 🔴 2026-09-22 14:30 User: "a" (source 2026-09-22 14:30 to 2026-09-22 14:30)')
    expect(second.messages?.[0]?.text).toContain('User: "c"')
    // A hook that throws is skipped, so the engine reports the write as unanswered.
    expect(seen.logs.filter((l) => l.startsWith('stats not saved'))).toEqual(['stats not saved (no implementation for fs.write); carrying on without them'])
    expect(seen.screen.filter((l) => l.startsWith('Stats'))).toEqual(['Stats failed (no implementation for fs.write) and will keep retrying quietly'])
  })
})
