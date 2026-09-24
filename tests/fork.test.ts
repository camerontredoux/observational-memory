import { describe, expect, test } from 'claude-code/testing'
import type { ModelForkResult, On, SessionMessage } from 'claude-code'
import { COMPACT_WRAPPER } from '../hooks/prompts'
import { capUserMessages, FORK_HEADER, forkPoint, TAIL_MAX_TOKENS, USER_MESSAGES_MAX_TOKENS } from './eval/fork-plugin/hooks/handoff'
import { register } from './eval/fork-plugin/hooks/register'

// The fork plugin's hooks by event, run with a `$` each test builds, as register.test.ts runs the recall-only plugin's:
// the test kit loads an inline plugin from its register function alone, without its module's top-level helpers.
// A hook's `.catch` handler is kept beside it and run when the hook throws.
type Hook = (...args: any[]) => any
function hooks() {
  const found = new Map<string, { hook: Hook; onError?: Hook }>()
  const on = (event: string, ...rest: unknown[]) => {
    const entry = { hook: rest.at(-1) as Hook, onError: undefined as Hook | undefined }
    found.set(event, entry)
    return { catch: (h: Hook) => void (entry.onError = h) }
  }
  register(on as unknown as On, {} as never)
  return found
}
const plugin = hooks()

const USAGE = { input_tokens: 3, output_tokens: 900, cache_creation_input_tokens: 400, cache_read_input_tokens: 150_000 }
const HANDOFF = 'Live request: "ship the parser".\nNext actions:\n1. Run the tests.\nFirst: run the tests.'

// A session: its id, history, a store, stats files, a clock the test moves, git answers, and $.model.fork answered by
// `answer` (a promise the test may hold). Every call the plugin makes is recorded.
function session(
  id: string,
  o: {
    threshold?: number
    answer?: (prompt: string) => ModelForkResult | Promise<ModelForkResult>
    tools?: string[]
    git?: boolean
  } = {},
) {
  const history: SessionMessage[] = []
  const store: Record<string, unknown> = {}
  const files: Record<string, string> = {}
  const forks: string[] = []
  const logs: string[] = []
  const screen: string[] = []
  let now = 1_000_000
  const timers: { at: number; fn: () => void; live: boolean }[] = []
  const $ = {
    session: {
      id: async () => id,
      messages: async () => [...history],
      cwd: async () => '/work/project',
      usage: async () => ({ context: { window: 200_000, breakdown: { autoCompactThreshold: o.threshold ?? 100_000 } } }),
    },
    model: {
      fork: async (r: { prompt: string }) => (forks.push(r.prompt), (o.answer ?? (() => ({ isAnswered: true, text: HANDOFF, usage: USAGE })))(r.prompt)),
    },
    clock: {
      now: async () => now,
      after: (ms: number, fn: () => void) => {
        const t = { at: now + ms, fn, live: true }
        timers.push(t)
        if (ms === 0) void Promise.resolve().then(() => t.live && ((t.live = false), fn()))
        return { cancel: () => void (t.live = false) }
      },
    },
    store: {
      get: async (k: string) => (store[k] === undefined ? undefined : JSON.parse(JSON.stringify(store[k]))),
      set: async (k: string, v: unknown) => void (store[k] = JSON.parse(JSON.stringify(v))),
      delete: async (k: string) => void delete store[k],
    },
    env: { get: async (k: string) => (k === 'OM_STATS_DIR' ? '/stats' : undefined) },
    fs: { write: async (p: string, t: string) => void (files[p] = t) },
    process: {
      run: async (argv: string[]) =>
        o.git === false
          ? { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository' }
          : argv.includes('status')
            ? { exitCode: 0, stdout: '## main...origin/main\n M src/parser.ts\n', stderr: '' }
            : { exitCode: 0, stdout: 'abc1234\tAdd the parser\n', stderr: '' },
    },
    tool: { list: async () => (o.tools ?? []).map((name) => ({ name })) },
    ui: { log: (text: string, opts?: { to?: string }) => void (opts?.to === 'debug' ? logs : screen).push(text) },
  }
  const settle = async () => {
    for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0))
  }
  // Moves the clock, firing the timers it passes.
  const advance = async (ms: number) => {
    now += ms
    for (const t of timers) if (t.live && t.at <= now) (t.live = false), t.fn()
    await settle()
  }
  const builtin = { messages: [{ role: 'user' as const, text: `${COMPACT_WRAPPER}\n\nbuilt-in summary`, toolUses: [] }] }
  const compact = async (e: { trigger: 'manual' | 'auto' | 'precompute'; messages: SessionMessage[]; instructions?: string; agentId?: string }) => {
    const { hook, onError } = plugin.get('session.compact')!
    let called = false
    const next = async () => ((called = true), builtin)
    try {
      return await hook($, e, next)
    } catch (error) {
      return onError!($, e, Object.assign(next, { called, error }))
    }
  }
  // One main-thread model request whose context came to `tokens`.
  const step = async (tokens: number, agentId?: string) => {
    const hook = plugin.get('turn.step')!.hook
    const usage = { input_tokens: 10, output_tokens: 90, cache_creation_input_tokens: 0, cache_read_input_tokens: tokens - 100, model: 'claude-sonnet-5' }
    const gen = hook($, { turnId: 't', index: 0, model: 'claude-sonnet-5', messageCount: history.length, ...(agentId ? { agentId } : {}) }, async function* () {
      return { turnId: 't', index: 0, answer: '', toolUses: [], stopReason: 'end_turn', usage }
    })
    for (let r = await gen.next(); !r.done; r = await gen.next());
    await settle()
  }
  const stats = () => JSON.parse(files[`/stats/${id}.json`] ?? 'null')
  return { $, history, store, forks, logs, screen, compact, step, advance, settle, stats, builtin }
}

// One turn: the prompt, a Read call with its result of `size` characters, and the answer.
const turn = (prompt: string, size = 0): SessionMessage[] => [
  { role: 'user', text: prompt, toolUses: [] },
  { role: 'assistant', text: `on ${prompt}`, toolUses: [{ tool_use_id: `t-${prompt}`, tool: 'Read', input: { file_path: `/src/${prompt}.ts` } }] },
  { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: `t-${prompt}`, text: 'x'.repeat(size), isError: false }] },
  { role: 'assistant', text: `${prompt} done`, toolUses: [] },
]
const quoted = (text: string) => [...text.matchAll(/\* User \(\d+ chars\):\n([^\n]*)/g)].map((m) => m[1])

describe('fork plugin', () => {
  test('compaction forks the handoff and keeps the user messages, the handoff as the assistant, then the newest response raw', async () => {
    const s = session('s-compact')
    s.history.push(...turn('ship the parser', 400), ...turn('<system-reminder>noise</system-reminder>', 0), ...turn('also lint it', 400))
    const result = await s.compact({ trigger: 'manual', messages: s.history.map((m, i) => ({ ...m, handle: `h${i}` })) })

    expect(s.forks).toHaveLength(1)
    expect(s.forks[0]).toContain('Write the handoff to your successor now')
    const [head, handoff, ...tail] = result.messages
    expect(head.role).toBe('user')
    expect(head.text.startsWith(`${COMPACT_WRAPPER}\n\n${FORK_HEADER}`)).toBe(true)
    expect(quoted(head.text)).toEqual(['ship the parser', 'also lint it']) // injected reminders are not the user's
    expect(head.text).toContain('Branch: main...origin/main\nHEAD: abc1234 Add the parser\nUncommitted changes (git status --short, 1 file):\n M src/parser.ts')
    expect(head.text).not.toContain('om_recall') // not offered in the fork configuration
    expect(handoff).toEqual({ role: 'assistant', text: HANDOFF, toolUses: [] })
    // The fork answered over the request before the newest response: that response is kept raw, without handles.
    expect(tail).toEqual([s.history.at(-1)])
    expect(s.stats().compactions).toEqual([expect.objectContaining({ trigger: 'manual', path: 'compaction', tailRows: 1, userMessages: 2 })])
    expect(s.stats().forks).toEqual([expect.objectContaining({ phase: 'compaction', outcome: 'answered', usage: USAGE })])
    expect(s.stats().counts).toEqual({ 'fork.compaction.answered': 1, 'compaction.manual.forkedAtCompaction': 1 })
    expect(s.screen.at(-1)).toMatch(/^fork-handoff: Compacted in 0\.0s with a handoff forked now \(~\d+ tokens\)$/)
  })

  test('mid-turn, the raw tail starts at the call whose results come after it', async () => {
    const s = session('s-midturn')
    s.history.push(...turn('ship the parser'), { role: 'user', text: 'run it', toolUses: [] })
    s.history.push({ role: 'assistant', text: 'running', toolUses: [{ tool_use_id: 'b1', tool: 'Bash', input: { command: 'make' } }] })
    s.history.push({ role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'b1', text: 'ok', isError: false }] })
    const result = await s.compact({ trigger: 'auto', messages: [...s.history] })
    expect(result.messages.slice(2)).toEqual(s.history.slice(-2))
    expect(quoted(result.messages[0].text)).toEqual(['ship the parser', 'run it'])
  })

  test('past 85% of the auto-compact threshold a step forks the handoff early, once per 10% of growth, and compaction uses it', async () => {
    const s = session('s-early', { threshold: 100_000 })
    s.history.push(...turn('ship the parser', 400))
    await s.step(80_000)
    expect(s.forks).toHaveLength(0)
    await s.step(86_000)
    expect(s.forks).toHaveLength(1)
    await s.step(95_000) // under 10% of the threshold past the last fork
    expect(s.forks).toHaveLength(1)
    await s.step(90_000, 'agent-1') // a subagent's context is not the main one's
    expect(s.forks).toHaveLength(1)
    s.history.push(...turn('also lint it', 400))
    await s.step(97_000)
    expect(s.forks).toHaveLength(2)

    await s.advance(5_000)
    s.history.push({ role: 'user', text: 'and the docs', toolUses: [] }, { role: 'assistant', text: 'on it', toolUses: [] })
    const result = await s.compact({ trigger: 'auto', messages: [...s.history] })
    expect(s.forks).toHaveLength(2) // no fork at compaction
    expect(result.messages[1].text).toBe(HANDOFF)
    // Everything after the second fork's point, raw: the answer it saw last and what came after.
    expect(result.messages.slice(2)).toEqual(s.history.slice(-3))
    expect(quoted(result.messages[0].text)).toEqual(['ship the parser', 'also lint it'])
    expect(s.stats().compactions).toEqual([expect.objectContaining({ trigger: 'auto', path: 'early', gapMs: 5_000, tailRows: 3 })])
    expect(s.stats().counts['compaction.auto.earlyHandoff']).toBe(1)
    expect(s.stats().forks.map((f: { phase: string; contextTokens: number }) => [f.phase, f.contextTokens])).toEqual([
      ['early', 86_000],
      ['early', 97_000],
    ])
  })

  test('an early handoff with too much after it is stale: compaction forks afresh', async () => {
    const s = session('s-stale')
    s.history.push(...turn('ship the parser', 400))
    await s.step(90_000)
    s.history.push(...turn('grow', (TAIL_MAX_TOKENS + 1_000) * 4))
    await s.compact({ trigger: 'auto', messages: [...s.history] })
    expect(s.forks).toHaveLength(2)
    expect(s.logs.some((l) => /^fork-handoff: the early handoff is stale: ~3\d{4} tokens came after it: forking now$/.test(l))).toBe(true)
    expect(s.stats().compactions[0].path).toBe('compaction')
  })

  test('an early fork still in flight is waited for; one that failed is replaced by a fork at compaction', async () => {
    let release!: (r: ModelForkResult) => void
    let n = 0
    const s = session('s-inflight', {
      answer: () => (n++ === 0 ? new Promise((r) => (release = r)) : { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded_error', usage: USAGE }),
    })
    s.history.push(...turn('ship the parser', 400))
    await s.step(90_000)
    const compacted = s.compact({ trigger: 'auto', messages: [...s.history] })
    await s.settle()
    release({ isAnswered: true, text: HANDOFF, usage: USAGE })
    expect((await compacted).messages[1].text).toBe(HANDOFF)
    expect(s.forks).toHaveLength(1)

    // Next time the early fork fails, and so does the one at compaction: the built-in compaction runs.
    s.history.push(...turn('again', 400))
    await s.step(90_000)
    const result = await s.compact({ trigger: 'auto', messages: [...s.history] })
    expect(result).toBe(s.builtin)
    expect(s.forks).toHaveLength(3)
    expect(s.screen.at(-1)).toBe('fork-handoff: No handoff from the fork. Using built-in compaction')
    expect(s.stats().counts).toMatchObject({ 'fork.early.failed.api-error': 1, 'fork.compaction.failed.api-error': 1, 'compaction.auto.fellBack': 1 })
    expect(s.stats().compactions.map((c: { path: string }) => c.path)).toEqual(['early', 'fellBack'])
  })

  test('with nothing to fork, an empty reply or a rejected fork, the built-in compaction runs', async () => {
    for (const [name, answer] of [
      ['s-nothing', () => ({ isAnswered: false, reason: 'nothing-to-fork' }) as ModelForkResult],
      ['s-empty', () => ({ isAnswered: true, text: '  ', usage: USAGE }) as ModelForkResult],
      ['s-reject', () => Promise.reject(new Error('blocked'))],
    ] as const) {
      const s = session(name, { answer })
      s.history.push(...turn('ship the parser'))
      expect(await s.compact({ trigger: 'manual', messages: [...s.history] })).toBe(s.builtin)
      expect(s.stats().compactions).toEqual([expect.objectContaining({ path: 'fellBack' })])
    }
    const none = session('s-no-response')
    expect(await none.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'hi', toolUses: [] }] })).toBe(none.builtin)
    expect(none.forks).toHaveLength(0)
  })

  test("a subagent's compaction is the built-in one, and a precompute installs nothing", async () => {
    const s = session('s-agent')
    s.history.push(...turn('ship the parser'))
    expect(await s.compact({ trigger: 'auto', agentId: 'a1', messages: [...s.history] })).toBe(s.builtin)
    expect(await s.compact({ trigger: 'precompute', messages: [...s.history] })).toEqual({ skip: expect.stringContaining('fork-handoff') })
    expect(s.forks).toHaveLength(0)
  })

  test('/compact instructions go into the fork prompt, and an early handoff is not used for them', async () => {
    const s = session('s-instr')
    s.history.push(...turn('ship the parser', 400))
    await s.step(90_000)
    await s.compact({ trigger: 'manual', messages: [...s.history], instructions: 'keep the error text' })
    expect(s.forks).toHaveLength(2)
    expect(s.forks[1]).toContain('The person asked this compaction to keep or stress: keep the error text')
  })

  test("the next compaction quotes the earlier compactions' user messages too, never a compaction's own message", async () => {
    const s = session('s-twice', { tools: ['om_recall'] })
    s.history.push(...turn('ship the parser'), ...turn('also lint it'))
    const first = await s.compact({ trigger: 'auto', messages: [...s.history] })
    expect(first.messages[0].text).toContain('search for it with om_recall')
    const second = await s.compact({ trigger: 'auto', messages: [...first.messages, ...turn('and the docs')] })
    expect(quoted(second.messages[0].text)).toEqual(['ship the parser', 'also lint it', 'and the docs'])
    const cleared = plugin.get('session.end')!.hook
    await cleared(s.$, { sessionId: 's-twice', reason: 'clear' }, async () => undefined)
    expect(s.store).toEqual({})
  })

  test('without git, the compacted context has no environment', async () => {
    const s = session('s-nogit', { git: false })
    s.history.push(...turn('ship the parser'))
    expect((await s.compact({ trigger: 'manual', messages: [...s.history] })).messages[0].text).not.toContain('<environment>')
  })

  test('the standing note follows the context management section, naming om_recall only when it is offered', async () => {
    const section = plugin.get('prompt.section')!.hook
    const next = async () => ({ text: '# Context management\nCore text.' })
    const without = await section(session('s-note').$, { name: 'context_management', text: null }, next)
    expect(without.text).toMatch(/^# Context management\nCore text\.\n\nWhen this session is compacted, /)
    expect(without.text).not.toContain('om_recall')
    const withRecall = await section(session('s-note2', { tools: ['om_recall'] }).$, { name: 'context_management', text: null }, next)
    expect(withRecall.text).toContain('om_recall finds them')
  })

  test("the user's messages are capped: the first kept, then the newest, with a count of those left out", () => {
    const big = 'y'.repeat(USER_MESSAGES_MAX_TOKENS * 4 * 0.4)
    const kept = capUserMessages(['brief', big, big, big, 'last'])
    expect(kept.map((m) => m.omitted ?? m.text.slice(0, 5))).toEqual(['brief', 1, 'yyyyy', 'yyyyy', 'last'])
    const huge = capUserMessages(['z'.repeat(40_000)])[0]!.text
    expect(huge).toContain('characters of this message left out')
    expect(huge.length).toBeLessThan(25_000)
  })

  test('the fork point is the newest response, whole', () => {
    const rows: SessionMessage[] = [
      { role: 'user', text: 'a', toolUses: [] },
      { role: 'assistant', text: 'thinking', toolUses: [] },
      { role: 'assistant', text: '', toolUses: [{ tool_use_id: 'x', tool: 'Read', input: {} }] },
      { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'x', text: 'r', isError: false }] },
    ]
    expect(forkPoint(rows)).toBe(1)
    expect(forkPoint([rows[0]!])).toBeUndefined()
  })
})
