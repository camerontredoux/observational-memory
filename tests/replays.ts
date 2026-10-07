// The tests that replay private transcripts, each taking its gitignored fixture module (tests/fixtures/*.local.ts).
// The test runner loads no module holding import(), so a test file cannot import a module that may be absent:
// tests/fixtures.local.test.ts (gitignored), which `bun scripts/wire-fixtures.ts` writes, imports the modules present
// and runs these. A script that writes a fixture module runs it; the comment over each test names that script.
import { expect, mock, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { FLOOR_NOTE } from '../hooks/prompts'
import { loadTranscript, recall } from '../hooks/recall'
import { negativeControl } from './eval/rubric'
import { briefIn, memoryIo, nextStepIn, overloaded, models, steps, SUMMARY, userMessagesIn, world } from './harness'
import type { Ledger } from './harness'

type Turns = { rows: SessionMessage[]; at: number[]; step: boolean[]; compactions: { at: number; preTokens: number }[]; brief: string }
type Firstmate = { rows: SessionMessage[]; at: number[]; start: number; live: number; events: { kind: 'start' | 'step' | 'complete' | 'reload' | 'compact'; rows: number; at: number }[] }

// A real crewmate turn, replayed from a private transcript: /tmp/om-v043/make-fixture.py writes the module
// (gitignored).
export const crewmate = (fx: Turns) =>
  test('replays a crewmate transcript: one long turn, observed in the background, compacted with no Observer call', { timeoutMs: 120_000 }, async ($, on) => {
    const clock = mock.clock(on, { now: fx.at[0] })
    const { history, stored } = world(on)
    const seen = models(on, { hold: () => clock.sleep(12_000), reply: () => '<observations>\n* 🟡 Read a file\n</observations>' })
    const step = steps(on)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))
    const tokens = (m: SessionMessage) =>
      Math.ceil([m.text, ...m.toolUses.map((u) => `${u.tool} ${JSON.stringify(u.input)}`), ...(m.toolResults ?? []).map((r) => r.text)].join('\n').length / 4)

    history.push(fx.rows[0]!)
    await $.turn.start({ text: fx.brief, turnId: 't' })
    let index = 0
    let live = 0 // where the live context starts in the history
    const report: { lunaAtCompaction: number; midTurnLanded: number; rawTokens: number; nextStep: boolean }[] = []
    for (let i = 1; i < fx.rows.length; i++) {
      await clock.set(Math.max(clock.now(), fx.at[i]!))
      if (fx.compactions.some((c) => c.at === i)) {
        const before = seen.prompts.length
        const landed = seen.logs.filter((l) => l.includes('in the background')).length
        const result = await $.session.compact({ trigger: 'auto', messages: history.slice(live) })
        const text = result.messages?.[0]?.text ?? ''
        const watermark = history.length - (result.messages!.length - 1)
        report.push({
          lunaAtCompaction: seen.prompts.length - before,
          midTurnLanded: landed,
          rawTokens: history.slice(watermark).reduce((n, m) => n + tokens(m), 0),
          nextStep: nextStepIn(text) !== undefined,
        })
        expect(userMessagesIn(text)).toEqual([fx.brief])
        live = history.length
        history.push(...result.messages!)
      }
      if (fx.step[i]) await step($, 't', index++, history.length)
      history.push(fx.rows[i]!)
      await clock.settle()
    }
    await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 't', reason: 'answer' })

    expect(report).toHaveLength(fx.compactions.length)
    for (const r of report) {
      expect(r.lunaAtCompaction).toBe(0)
      expect(r.midTurnLanded).toBeGreaterThan(0)
      expect(r.rawTokens).toBeLessThanOrEqual(6_000 + 10_000 + 2_000) // the raw tail and about one chunk, as chunks end past CHUNK_TOKENS
      expect(r.nextStep).toBe(false)
    }
    const ledger = stored['ledger:session-1'] as Ledger
    for (const e of ledger.entries) expect(e.line).toMatch(/^\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} /)
  })

// A real subagent's run, replayed from a private transcript: /tmp/om-sub/make-fixture.py writes the module
// (gitignored). Its session compacted it three times at ~157-160k tokens, observing everything before the raw tail on
// the spot (22.4 s, 15.4 s, 13.0 s). Here each Observer call takes 15 s of the replay's clock.
export const subagent = (fx: Turns) =>
  test('replays a subagent transcript: its own steps observe it in the background, and each compaction makes no Observer call', { timeoutMs: 120_000 }, async ($, on) => {
    const clock = mock.clock(on, { now: fx.at[0] })
    const { agents, stored } = world(on)
    const seen = models(on, { hold: () => clock.sleep(15_000), reply: () => '<observations>\n* 🟡 Read a file\n</observations>' })
    const step = steps(on)
    on('turn.complete', () => ({ text: '' }))
    const rows: SessionMessage[] = (agents['agent-1'] = [fx.rows[0]!])
    const tokens = (m: SessionMessage) =>
      Math.ceil([m.text, ...m.toolUses.map((u) => `${u.tool} ${JSON.stringify(u.input)}`), ...(m.toolResults ?? []).map((r) => r.text)].join('\n').length / 4)

    let index = 0
    let live = 0 // where the live context starts in the subagent's history
    const report: { lunaAtCompaction: number; landed: number; rawTokens: number; nextStep: boolean }[] = []
    for (let i = 1; i < fx.rows.length; i++) {
      await clock.set(Math.max(clock.now(), fx.at[i]!))
      if (fx.compactions.some((c) => c.at === i)) {
        const before = seen.prompts.length
        const result = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: rows.slice(live) })
        const text = result.messages?.[0]?.text ?? ''
        report.push({
          lunaAtCompaction: seen.prompts.length - before,
          landed: seen.logs.filter((l) => l.includes('in the background')).length,
          rawTokens: result.messages!.slice(1).reduce((n, m) => n + tokens(m), 0),
          nextStep: nextStepIn(text) !== undefined,
        })
        expect(userMessagesIn(text)).toEqual([fx.brief])
        live = rows.length
        rows.push(...result.messages!)
      }
      if (fx.step[i]) await step($, 's', index++, rows.length, 'agent-1')
      rows.push(fx.rows[i]!)
      await clock.settle()
    }
    await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })

    expect(report).toHaveLength(fx.compactions.length)
    for (const r of report) {
      expect(r.lunaAtCompaction).toBe(0)
      expect(r.landed).toBeGreaterThan(0)
      expect(r.rawTokens).toBeLessThanOrEqual(6_000 + 5_000 + 10_000) // the raw tail, a scheduling interval, a chunk in flight
      expect(r.nextStep).toBe(false)
    }
    expect(seen.screen).toEqual([])
    expect(seen.logs.filter((l) => l.startsWith('Compacted'))).toEqual(fx.compactions.map(() => expect.stringMatching(/^Compacted subagent in 0 ms · memory \d+ notes$/)))
    expect(Object.keys(stored)).toEqual([]) // the finished subagent's keys are gone
  })

// Run 1 of the v0.4.10 subagent smoke (/tmp/om-sub/live/run1), replayed from its subagent's transcript:
// /tmp/om-tail/make-fixture.py writes the module (gitignored). The subagent read 36 KB files (~9k tokens each, more
// than the raw tail's budget) and was compacted five times, each right after a read; every one fell back to the
// built-in summary. Here the Observer fails until the first compaction, as in run 1, so the floor briefs what leaves
// context; the engine appends its memory message to the subagent's history. Each later compaction must match that
// history and cut at the background watermark.
export const fallback = (fx: Turns) =>
  test('replays run 1 of the subagent smoke: after the floor stands in for a failed Observer, later compactions match the history and make no Observer call', { timeoutMs: 120_000 }, async ($, on) => {
    const clock = mock.clock(on, { now: fx.at[0] })
    const { agents, stored } = world(on)
    let failing = true
    const seen = models(on, { hold: () => (failing ? undefined : clock.sleep(15_000)), reply: () => '<observations>\n* 🟡 Read a chapter\n</observations>', fail: () => (failing ? overloaded() : undefined) })
    const step = steps(on)
    on('turn.complete', () => ({ text: '' }))
    let builtin = 0
    on('session.compact', () => (builtin++, { messages: [SUMMARY] }))
    const rows: SessionMessage[] = (agents['agent-1'] = [fx.rows[0]!])

    let index = 0
    let live = 0 // where the live context starts in the subagent's history
    const report: { lunaAtCompaction: number; floor: boolean }[] = []
    for (let i = 1; i < fx.rows.length; i++) {
      await clock.set(Math.max(clock.now(), fx.at[i]!))
      if (fx.compactions.some((c) => c.at === i)) {
        const before = seen.prompts.length
        const result = await $.session.compact({ trigger: 'auto', agentId: 'agent-1', messages: rows.slice(live) })
        report.push({ lunaAtCompaction: seen.prompts.length - before, floor: briefIn(result.messages![0]!.text)?.startsWith(FLOOR_NOTE) ?? false })
        live = rows.length
        rows.push(...result.messages!)
        failing = false
      }
      if (fx.step[i]) await step($, 's', index++, rows.length, 'agent-1')
      rows.push(fx.rows[i]!)
      await clock.settle()
    }
    await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 's', reason: 'answer', agentId: 'agent-1' })

    expect(builtin).toBe(0)
    expect(report).toHaveLength(fx.compactions.length)
    expect(report[0]!).toEqual({ lunaAtCompaction: expect.any(Number), floor: true })
    for (const r of report.slice(1)) expect(r).toEqual({ lunaAtCompaction: 0, floor: false })
    expect(seen.logs.filter((l) => l.startsWith('compaction not persistent') || l.includes('restarting the ledger'))).toEqual([])
    expect(seen.screen).toEqual([])
    expect(seen.logs.filter((l) => l.startsWith('Compacted'))).toEqual([
      expect.stringMatching(/^Compacted subagent in 0 ms · memory 0 notes · \d+ messages in a brief compiled by code \(the Observer failed\)$/),
      ...fx.compactions.slice(1).map(() => expect.stringMatching(/^Compacted subagent in 0 ms · memory \d+ notes?$/)),
    ])
    expect(Object.keys(stored)).toEqual([])
  })

// A real firstmate stretch, replayed from a private transcript: /tmp/om-stall/work/make-fixture.ts writes the
// module (gitignored). From the context the 14:31 compaction left to the 15:11 compaction: short turns, many opened
// by a task notification, with a parallel block that compaction wrote back grouped.
export const firstmate = (fx: Firstmate) =>
  test('replays a firstmate transcript: short turns are observed in the background, and compaction cuts at the watermark', { timeoutMs: 120_000 }, async ($, on) => {
    const clock = mock.clock(on, { now: fx.at[0] })
    const { history } = world(on)
    const seen = models(on, { hold: () => clock.sleep(16_000), reply: () => '<observations>\n* 🟡 Read a file\n</observations>' })
    const step = steps(on)
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))

    history.push(...fx.rows.slice(0, fx.start))
    let turn = 0
    let index = 0
    let atCompaction = -1
    for (const e of fx.events) {
      while (history.length < e.rows) {
        await clock.set(Math.max(clock.now(), fx.at[history.length]!))
        history.push(fx.rows[history.length]!)
        await clock.settle()
      }
      await clock.set(Math.max(clock.now(), e.at))
      if (e.kind === 'start') {
        turn++
        index = 0
        await $.turn.start({ text: history.at(-1)!.text, turnId: `t${turn}` })
      } else if (e.kind === 'step') await step($, `t${turn}`, index++, history.length)
      else if (e.kind === 'complete') await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: `t${turn}`, reason: 'answer' })
      else if (e.kind === 'compact') {
        const before = seen.prompts.length
        await $.session.compact({ trigger: 'auto', messages: history.slice(fx.live) })
        atCompaction = seen.prompts.length - before
      }
      await clock.settle()
    }

    // As the session logged: rows 1-56 at 14:37:56; then too little new history for a chunk past the raw tail
    // until the turn that ended at 15:08:26. Past the stub's one line, each chunk carries the assistant's own sentences.
    expect(seen.logs.filter((l) => l.includes('in the background'))).toEqual([
      'observed rows 1-56 in the background, 2 observations; watermark 56, 0 chunk(s) waiting on a gap',
      'observed rows 56-139 in the background, 6 observations; watermark 139, 0 chunk(s) waiting on a gap',
    ])
    expect(seen.logs).not.toContain('the transcript changed under the observations; restarting the ledger from the memory message')
    expect(atCompaction).toBe(0)
    expect(seen.logs.at(-2)).toMatch(/^cut at the background watermark with no Observer call/)
  })

// The real chain Claude Code moved a crewmate session across, copied to /tmp/om-recall/chain and cut down to the rows
// this test reads, in a gitignored module, by scripts/make-recall-fixture.ts.
const REAL = 'a real moved session: both files, compaction replays read once, blocks readable in full'
export const recallChain = (fx: { files: Record<string, string> }) =>
  test(REAL, { timeoutMs: 60_000 }, async () => {
    const io = memoryIo(Object.fromEntries(Object.entries(fx.files).map(([k, v]) => [`/c/${k}`, v])))
    const c = await loadTranscript(io, '/c/b8d50671-d9df-4001-9679-8d1ba9ec834c.jsonl', { asking: true })
    const outline = (await recall(c, { mode: 'outline', from: 'a79f045b:2108', to: 'b8d50671:65' })).text
    expect(outline).toMatch(/^Outline of 2 transcript files \(a79f045b → b8d50671\): [\d,]+ entries,.*; 1 subagent transcript \(af4c8dc0\)\./)
    expect(outline).toContain('a79f045b:2134')
    expect(outline).toContain('b8d50671:62')
    // What the compaction wrote again after its boundary is read once, where it first was.
    expect(outline).not.toContain('a79f045b:2140')
    expect(outline).not.toContain('(no content)')
    const found = (await recall(c, { query: '"Test Files" passed' })).text
    expect(found).toMatch(/^\d+ match\(es\) for ""Test Files" passed" in [\d,]+ blocks of 2 transcript files\./)
    expect(found).toContain('[a79f045b:1902 ')
    expect(found).toContain('[b8d50671:')
    // vitest's colour codes are gone, so its summary line reads, and matches, as printed.
    expect((await recall(c, { query: '"Test Files 10 passed"', to: 'b8d50671:147' })).text).toContain('  61:  Test Files 10 passed (10)')
    const page = (await recall(c, { ref: 'a79f045b:73' })).text
    expect(page.split('\n')[0]).toMatch(/^\[a79f045b:73 · .* · Bash result\] lines 1-\d+ of 748 \(call: a79f045b:70\)$/)
    expect(page.split('\n').at(-1)).toMatch(/^… \d+ more lines \([\d,]+ characters\); only if you still need them: \{"mode": "read", "ref": "a79f045b:73", "lines": "\d+-\d+"\}\.$/)
    expect(page.length).toBeLessThan(14_000)
    // In a long result, the line holding every term shows, not the first lines holding one.
    expect((await recall(c, { query: 'Test Files passed' })).text).toContain('\n  55:  Test Files 1 failed | 1 passed (2)\n')
    const wide = (await recall(c, { ref: 'a79f045b:73', before: 5, after: 5 })).text
    expect(wide.length).toBeLessThanOrEqual(16_000)
    expect(wide).toContain('[a79f045b:78 ')
    expect((await recall(c, { query: 'gorman lunar checksum' })).text.split('\n')[1]).toBe('No occurrences in the main transcript of: lunar, checksum.')
    expect((await recall(c, { query: 'plan', subagents: true })).text).toContain('and 1 subagent transcript')
  })

// The negative control over the real rubrics: no hand-authored item may pass a context that cannot answer it (another
// transcript's, or its own before the item's `from`). `bun scripts/bench-compact.ts controls` writes the module.
export const rubricControls = (fx: { items: Parameters<typeof negativeControl>[0]; parts: Record<string, { lines: string[]; cuts: { n: number; at: number[] }[] }> }) =>
  test('no hand-authored item passes a foreign context or one before its from', () => {
    const parts = Object.entries(fx.parts)
    const contexts = Object.fromEntries(parts.map(([name, p]) => [name, p.cuts.map((c) => ({ n: c.n, prose: c.at.map((i) => p.lines[i]).join('\n') }))]))
    expect(negativeControl(fx.items, contexts)).toEqual([])
  })
