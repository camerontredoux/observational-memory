import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import {
  chainSpec,
  chainTranscripts,
  checkAnswer,
  checkSpec,
  contextOf,
  describeCalls,
  hookDriver,
  drift,
  holds,
  identifiersIn,
  lastCompaction,
  leftOut,
  neededIdentifiers,
  parseAnswers,
  parseTranscript,
  planBuiltinChain,
  planCalls,
  planQuestionSession,
  questionRun,
  questionSeedRows,
  questionsAt,
  recallCallsIn,
  answerTexts,
  questionGroups,
  renderReflections,
  renderTranscript,
  replayChain,
  scoreAnswers,
  scoreConstraints,
  scoreIdentifiers,
  scoreReflection,
  seedRows,
  tallyQuestions,
  uncompacted,
} from './eval/replay'
import type { ConstraintSpec, Context, QuestionResult, Reflection, ReplaySpec } from './eval/replay'
import type { Configuration } from './eval/runner'

// Synthetic transcripts in Claude Code's JSONL shape. A compaction is a `compact_boundary` row, then its summary and
// the rows it kept raw, both stamped before the boundary (as Claude Code writes them), then the session goes on.
type Raw = Record<string, any>
const T0 = Date.UTC(2026, 8, 24, 12, 0)
function session() {
  const rows: Raw[] = []
  let t = 0
  let n = 0
  const stamp = (back = 0) => new Date(T0 + (t += 1000) - back).toISOString()
  const row = (type: 'user' | 'assistant', content: unknown, extra: Raw = {}) => ({ uuid: `u${++n}`, timestamp: stamp(), sessionId: 's', cwd: '/w', isSidechain: false, type, message: { id: `m${n}`, role: type, content }, ...extra })
  const s = {
    rows,
    user: (text: string, extra: Raw = {}) => (rows.push(row('user', text, extra)), s),
    reply: (text: string) => (rows.push(row('assistant', [{ type: 'text', text }])), s),
    tool: (name: string, input: Raw, result: string) => {
      rows.push(row('assistant', [{ type: 'tool_use', id: `c${n}`, name, input }]))
      rows.push(row('user', [{ type: 'tool_result', tool_use_id: `c${n - 1}`, content: result }]))
      return s
    },
    // The boundary, then its summary and `kept` user rows re-written with stamps before it.
    compact: (summary: string, kept: string[] = [], preTokens = 150_000) => {
      const at = stamp()
      rows.push({ uuid: `b${++n}`, timestamp: at, type: 'system', subtype: 'compact_boundary', compactMetadata: { trigger: 'auto', preTokens, postTokens: 5000 } })
      const before = new Date(Date.parse(at) - 500).toISOString()
      rows.push({ ...row('user', summary), isCompactSummary: true, timestamp: before })
      for (const k of kept) rows.push({ ...row('user', k), timestamp: before })
      return s
    },
    raw: (r: Raw) => (rows.push(r), s),
    text: () => rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
  }
  return s
}

// Three boundaries: the user sets two constraints before boundary 1 and reverses one before boundary 2.
function threeBoundaries() {
  return session()
    .user('Worktrees go in .worktrees. Spend at most $30 on this.')
    .reply('Working in hooks/register.ts at commit 1a2b3c4d.')
    .tool('Bash', { command: 'git log -1' }, 'commit 9f8e7d6c')
    .compact('Summary one: the user wants worktrees in .worktrees.', ['kept: see tests/kept-file.ts'])
    .user('Actually spend up to $50 now.')
    .reply('Back in hooks/register.ts; 1a2b3c4d and tests/kept-file.ts are unchanged.')
    .compact('Summary two.')
    .user('Look at issue #13 please.')
    .reply('Commit 9f8e7d6c touched hooks/register.ts.')
    .compact('Summary three.')
    .user('thanks')
    .reply('Done with #13.')
}

describe('transcript parsing', () => {
  test('cuts the transcript into spans at its boundaries, each with the summary and the rows kept raw', () => {
    const t = parseTranscript(threeBoundaries().text())
    expect(t.boundaries.map((b) => b.n)).toEqual([1, 2, 3])
    expect(t.spans.length).toBe(4)
    expect(t.boundaries[0]!.summary).toBe('Summary one: the user wants worktrees in .worktrees.')
    expect(t.boundaries[0]!.kept.map((r) => r.text)).toEqual(['kept: see tests/kept-file.ts'])
    expect(t.boundaries[0]!.preTokens).toBe(150_000)
    expect(t.spans[1]!.map((r) => r.text)).toEqual(['Actually spend up to $50 now.', 'Back in hooks/register.ts; 1a2b3c4d and tests/kept-file.ts are unchanged.'])
    expect(t.spans[0]!.some((r) => r.toolResults?.[0]?.text === 'commit 9f8e7d6c')).toBe(true)
    expect(t.cwd).toBe('/w')
  })

  test('leaves out sidechain rows, repeated rows and meta rows, and turns a skill load into its event', () => {
    const s = session().user('first').reply('ok')
    s.raw({ ...s.rows[1], message: { ...s.rows[1]!.message } }) // a resumed session repeats a row
      .user('from a subagent', { isSidechain: true })
      .user('Base directory for this skill: /skills/tdd\n\nThe skill body', { isMeta: true })
      .user('<command-name>/clear</command-name>', { isMeta: true })
    const t = parseTranscript(s.text())
    expect(t.spans[0]!.map((r) => r.text)).toEqual(['first', 'ok'])
    expect(t.events.filter((e) => e.kind === 'skill').map((e) => (e as { skill: string }).skill)).toEqual(['tdd'])
    expect(t.events.map((e) => e.kind)).toEqual(['row', 'start', 'step', 'row', 'skill', 'complete'])
  })
})

describe('the chain', () => {
  test('compacts at every boundary, each compaction on the previous output and the rows since', async () => {
    const t = parseTranscript(threeBoundaries().text())
    const inputs: string[][] = []
    const steps = await replayChain(t, {
      row: async () => {},
      compact: async (live, b) => (inputs.push(live.map((m) => m.text)), [{ role: 'user', text: `memory ${b.n}`, toolUses: [] }]),
    })
    expect(steps.length).toBe(3)
    expect(inputs[0]).toEqual(['Worktrees go in .worktrees. Spend at most $30 on this.', 'Working in hooks/register.ts at commit 1a2b3c4d.', '', ''])
    expect(inputs[1]).toEqual(['memory 1', 'Actually spend up to $50 now.', 'Back in hooks/register.ts; 1a2b3c4d and tests/kept-file.ts are unchanged.'])
    expect(inputs[2]![0]).toBe('memory 2')
    expect(contextOf(steps[2]!.output).summary).toBe('memory 3')
  })

  test('stops right after the compaction asked for, and shows the driver the whole history', async () => {
    const t = parseTranscript(threeBoundaries().text())
    let last: readonly SessionMessage[] = []
    const steps = await replayChain(
      t,
      { row: async (_r, h) => void (last = [...h]), compact: async () => [{ role: 'user', text: 'memory', toolUses: [] }] },
      1,
    )
    expect(steps.length).toBe(1)
    expect(last.length).toBe(4) // span 0's rows: user, reply, tool call, tool result
  })
})

describe('the om chain through hooks/register.ts', () => {
  // The plugin under test at every boundary, driven as `bench-replay.ts om` drives it (hookDriver), with pi answering
  // each Observer chunk by naming its user prompts. Each span is a turn with a 10k-token tool result, so compaction
  // has older history to observe and a tail to keep raw.
  function chained() {
    const s = session()
    for (const [i, word] of ['alpha', 'bravo', 'charlie', 'delta'].entries()) {
      if (i) s.compact(`recorded summary ${i}`)
      s.user(word).tool('Read', { file_path: `/src/${word}.ts` }, 'x'.repeat(40_000)).reply(`${word} read`).user(`${word}2`).reply('ok')
    }
    return parseTranscript(s.text())
  }

  test('each compaction is a memory built on the previous compaction and the rows since', async ($, on) => {
    const clock = mock.clock(on)
    let history: readonly SessionMessage[] = []
    const stored: Record<string, unknown> = {}
    mock.env(on, { OM_STATS_DIR: '/stats', HOME: '/home/u' })
    on('session.id', () => ({ value: 'replay' }))
    on('session.cwd', () => ({ value: '/w' }))
    on('session.messages', () => ({ value: [...history] }))
    on('agent.list', () => ({ value: [] }))
    on('store.keys', () => ({ value: Object.keys(stored) }))
    on('store.get', ($, e) => ({ value: stored[e.key] === undefined ? undefined : structuredClone(stored[e.key]) }))
    on('store.set', ($, e) => ((stored[e.key] = structuredClone(e.value)), { value: undefined }))
    on('store.delete', ($, e) => (delete stored[e.key], { value: undefined }))
    on('fs.read', ($, e) => {
      throw new Error(`ENOENT: ${e.path}`)
    })
    on('fs.write', () => ({ value: undefined }))
    on('fs.exists', () => ({ value: false }))
    on('command.register', ($, e) => ({ value: { command: e.name } }))
    on('ui.log', () => ({ value: undefined }))
    on('turn.start', ($, e) => ({ turnId: e.turnId }))
    on('turn.complete', () => ({ text: '' }))
    on('turn.step', async function* ($, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use' as const, usage: null }
    })
    on('skill.prompt', ($, e) => ({ text: e.text }))
    const observed: string[][] = []
    on('process.run', ($, e) => {
      if (e.argv[0] === 'git') return { value: { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository\n' } } // outside a repository
      const prompt = e.init?.stdin ?? ''
      const words = [...prompt.matchAll(/^\[User[^\]]*\]: (\w+)$/gm)].map((m) => m[1]!)
      observed.push(words)
      const text = `<observations>\n${words.map((w) => `* 🔴 Saw ${w}`).join('\n') || '* 🟡 Nothing'}\n</observations>\n<continuation>\nActive: ${words.at(-1)}\n</continuation>`
      const message = { role: 'assistant', content: [{ type: 'text', text }], stopReason: 'stop', usage: { input: 1, output: 1, cost: { total: 0 } } }
      return { value: { exitCode: 0, stdout: JSON.stringify({ type: 'message_end', message }), stderr: '' } }
    })

    const inputs: string[][] = []
    const steps = await replayChain(
      chained(),
      hookDriver({
        at: (time) => clock.set(Math.max(time, clock.now())),
        history: (h) => void (history = h),
        turnStart: async (text) => void (await $.turn.start({ text, turnId: 't' })),
        step: async (index, messageCount) => {
          const stream = $.turn.step({ turnId: 't', index, model: 'claude', messageCount })
          for await (const _ of stream);
        },
        turnComplete: async () => void (await $.turn.complete({ answer: '', durationMs: 0, isAborted: false, turnId: 't', reason: 'answer' })),
        skill: async (skill, text) => void (await $.skill.prompt({ skill, text })),
        compact: async (live) => {
          inputs.push(live.map((m) => m.text))
          await clock.settle()
          return (await $.session.compact({ trigger: 'auto', messages: [...live] })).messages ?? []
        },
      }),
    )

    expect(steps.length).toBe(3)
    const memories = steps.map((st) => contextOf(st.output).summary)
    // Each compaction's input starts with the previous one's output, not the session's own summary.
    for (const n of [1, 2]) expect(inputs[n]![0]).toBe(memories[n - 1]!)
    for (const memory of memories) expect(memory).not.toContain('recorded summary')
    // Span 0 was observed once, at compaction 1; the last compaction never saw its rows, and its memory still holds it.
    expect(observed).toEqual([['alpha'], ['alpha2', 'bravo'], ['bravo2', 'charlie']])
    expect(inputs[2]!.slice(1).some((text) => text.startsWith('alpha'))).toBe(false)
    expect(memories[2]).toContain('Saw alpha (source')
    expect(memories[2]).toContain('Saw charlie (source')
  })
})

describe('identifiers', () => {
  test('finds each kind, by its key', () => {
    const found = identifiersIn(
      'At 1a2b3c4d in /home/someone/work/x/hooks/register.ts, issue #13, $0.41 and $1,200, v1.1.0, pane w1:p2, run 0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b.',
    )
    expect(Object.fromEntries(found)).toEqual({
      '1a2b3c4': 'commit',
      '~/work/x/hooks/register.ts': 'path',
      '#13': 'issue',
      '$0.41': 'usd',
      '$1200': 'usd',
      '1.1.0': 'version',
      'w1:p2': 'pane',
      '0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b': 'uuid',
    })
  })

  test('leaves out what only looks like one: a shell variable, a word of hex, prose with a slash, a system path, a URL', () => {
    expect([...identifiersIn('awk {print $1}; deadbeef; 12345678; pass/fail and Observer/Reflector; /dev/null; https://example.com/a/b.ts').keys()]).toEqual([])
  })

  test('a context holds a path by its last two segments, and a hash by its prefix', () => {
    expect(holds('edited hooks/register.ts', '~/work/x/hooks/register.ts', 'path')).toBe(true)
    expect(holds('edited register.ts', '~/work/x/hooks/register.ts', 'path')).toBe(false)
    expect(holds('at 1a2b3c4', '1a2b3c4', 'commit')).toBe(true)
    expect(holds('at 1a2b3c4d9', '1a2b3c4', 'commit')).toBe(true)
  })

  test('a path through a dot-directory is one, under home or not', () => {
    expect(Object.fromEntries(identifiersIn('read ~/.agents/docs/github.md, /home/someone/.claude/projects/p/s.jsonl and .worktrees/issue-13/a.ts'))).toEqual({
      '~/.agents/docs/github.md': 'path',
      '~/.claude/projects/p/s.jsonl': 'path',
      '.worktrees/issue-13/a.ts': 'path',
    })
  })

  test('a context holds an identifier only as a whole token, not inside a longer one', () => {
    expect(holds('see issue #13', '#1', 'issue')).toBe(false)
    expect(holds('see #1.', '#1', 'issue')).toBe(true)
    expect(holds('cost $0.415', '$0.41', 'usd')).toBe(false)
    expect(holds('cost $1,200 in all', '$1200', 'usd')).toBe(true)
    expect(holds('on v1.1.0.', '1.1.0', 'version')).toBe(true)
    expect(holds('on 1.1.0.2 and 11.1.0', '1.1.0', 'version')).toBe(false)
    expect(holds('edited hooks/register.tsx', 'hooks/register.ts', 'path')).toBe(false)
    expect(holds('in x1a2b3c4', '1a2b3c4', 'commit')).toBe(false)
  })

  test("a boundary needs what the assistant used after it, knew before it, and neither kept raw nor re-read", () => {
    const t = parseTranscript(threeBoundaries().text())
    // Boundary 1: 1a2b3c4d was seen before and used after; tests/kept-file.ts was kept raw; $50 is new.
    expect(neededIdentifiers(t, 1).map((x) => x.key)).toEqual(['hooks/register.ts', '1a2b3c4'])
    // Boundary 2: 9f8e7d6c was a tool result before boundary 1; #13 the user said after the boundary, so it was re-read.
    expect(neededIdentifiers(t, 2).map((x) => x.key)).toEqual(['hooks/register.ts', '9f8e7d6'])
    // Boundary 3: now #13 is from before the boundary, and the assistant recalls it.
    expect(neededIdentifiers(t, 3).map((x) => x.key)).toEqual(['#13'])
  })

  test('a later use of what the assistant itself said after the boundary is not needed again', () => {
    const t = parseTranscript(session().reply('see src/a.ts').compact('s').user('go').reply('src/a.ts first').reply('src/a.ts again').text())
    expect(neededIdentifiers(t, 1).map((x) => [x.key, x.line])).toEqual([['src/a.ts', 5]])
  })

  test('scores what a context holds', () => {
    const t = parseTranscript(threeBoundaries().text())
    const s = scoreIdentifiers(neededIdentifiers(t, 1), { summary: 'We were in hooks/register.ts.', kept: [] })
    expect(s.held.map((x) => x.key)).toEqual(['hooks/register.ts'])
    expect(s.missing.map((x) => x.key)).toEqual(['1a2b3c4'])
  })
})

describe('constraints', () => {
  const budget: ConstraintSpec = { id: 'budget', quote: 'Spend at most $30', setIn: 0, held: ['\\$30'], reversal: { quote: 'spend up to $50', in: 1, held: ['\\$50'] } }
  const worktrees: ConstraintSpec = { id: 'worktrees', quote: 'Worktrees go in .worktrees.', setIn: 0, held: ['\\.worktrees'] }
  const late: ConstraintSpec = { id: 'late', quote: 'Look at issue #13', setIn: 2, held: ['#13'] }

  test('a constraint is in force from the boundary after it was set until its reversal', () => {
    const ctx: Context = { summary: 'Worktrees in .worktrees; budget $30.', kept: [] }
    expect(scoreConstraints([budget, worktrees, late], 1, ctx)).toEqual({ inForce: [{ id: 'budget', held: true }, { id: 'worktrees', held: true }], reversed: [] })
    // After the reversal the old budget alone is stale; with the new one beside it, it is not.
    expect(scoreConstraints([budget, worktrees, late], 2, ctx).reversed).toEqual([{ id: 'budget', stale: true }])
    expect(scoreConstraints([budget], 2, { summary: 'Was $30, now $50.', kept: [] }).reversed).toEqual([{ id: 'budget', stale: false }])
    expect(scoreConstraints([budget, worktrees, late], 3, { summary: 'nothing', kept: [{ text: 'issue #13', toolUses: [] }] }).inForce).toEqual([
      { id: 'worktrees', held: false },
      { id: 'late', held: true },
    ])
  })

  test("checks each quote against what the user typed in the span it names", () => {
    const t = parseTranscript(threeBoundaries().text())
    expect(checkSpec(t, { constraints: [budget, worktrees, late], questions: [{ id: 'q', ask: '?', from: 3 }] })).toEqual([])
    const bad: ReplaySpec = {
      constraints: [
        { ...worktrees, setIn: 1 },
        { ...budget, reversal: { ...budget.reversal!, quote: 'never said' } },
        { id: 'early', quote: 'Actually spend up to $50 now.', setIn: 1, held: ['x'], reversal: { quote: 'Spend at most $30', in: 0, held: ['y'] } },
        { id: 'regex', quote: 'thanks', setIn: 3, held: ['('] },
        { ...late, id: 'budget' },
      ],
      questions: [
        { id: 'q', ask: '?', from: 4 },
        { id: 'next-2', ask: '?', from: 2, to: 1 },
        { id: 'told-3', ask: '?', from: 3, to: 4 },
        { id: 'told-3', ask: '?', from: 3, to: 3 },
      ],
    }
    expect(checkSpec(t, bad)).toEqual([
      'worktrees: no user message in span 1 says "Worktrees go in .worktrees."',
      'budget reversal: no user message in span 1 says "never said"',
      'early: reversed before it was set',
      'regex: a pattern that is not a regular expression: (',
      'budget: a repeated id',
      'q: asked from boundary 4, which the transcript does not have',
      "next-2: asked to boundary 1, before boundary 2 or past the transcript's 3",
      "told-3: asked to boundary 4, before boundary 3 or past the transcript's 3",
      'told-3: a repeated question id',
    ])
  })

  test('drift follows what was known before boundary 1 across every boundary', () => {
    const t = parseTranscript(threeBoundaries().text())
    const contexts: (Context | undefined)[] = [
      { summary: 'hooks/register.ts, 1a2b3c4, 9f8e7d6, .worktrees', kept: [] },
      undefined,
      { summary: 'hooks/register.ts', kept: [] },
    ]
    expect(drift(t, [worktrees, budget], contexts)).toEqual([
      { boundary: 1, identifiers: { held: 3, total: 3 }, constraints: { held: 1, total: 1 } },
      { boundary: 3, identifiers: { held: 1, total: 3 }, constraints: { held: 0, total: 1 } },
    ])
  })
})

describe('the question stage', () => {
  const questions = [
    { id: 'dir', ask: 'Where do worktrees go?', from: 1, expect: ['.worktrees'] },
    { id: 'why', ask: 'Why?', from: 1 },
  ]

  test('checks an exact answer and says which need a grader', () => {
    expect(checkAnswer(questions[0]!, 'In  .WORKTREES of the repo')).toBe('pass')
    expect(checkAnswer(questions[0]!, 'unknown')).toBe('fail')
    expect(checkAnswer(questions[1]!, 'because')).toBe('needs a model grader')
    // Whole tokens: #13 is not #1, and "slow" does not say "low".
    expect(checkAnswer({ id: 'spec', ask: '?', from: 1, expect: ['#1'] }, 'It is #13')).toBe('fail')
    expect(checkAnswer({ id: 'spec', ask: '?', from: 1, expect: ['#1'] }, 'It is #1.')).toBe('pass')
    expect(checkAnswer({ id: 'model', ask: '?', from: 1, expect: ['opus', 'low'] }, 'opus is too slow')).toBe('fail')
    expect(parseAnswers('Sure.\n- dir: .worktrees\n`why`: tidy\nother: x\ndir: again', questions)).toEqual(
      new Map([
        ['dir', '.worktrees'],
        ['why', 'tidy'],
      ]),
    )
  })

  test('asks a question from its first boundary on, or only up to its last', () => {
    const spec: ReplaySpec = {
      constraints: [],
      questions: [
        { id: 'fact', ask: '?', from: 2 },
        { id: 'next-3', ask: '?', from: 3, to: 3 },
        { id: 'told', ask: '?', from: 1, to: 2 },
      ],
    }
    expect([1, 2, 3, 4].map((n) => questionsAt(spec, n).map((q) => q.id))).toEqual([['told'], ['fact', 'told'], ['fact', 'next-3'], ['fact']])
    expect(questionsAt(undefined, 1)).toEqual([])
    expect(questionsAt(spec, 3, /^(next|told)-/).map((q) => q.id)).toEqual(['next-3'])
  })

  test("asks a boundary's handoff questions in a session of their own, apart from the standing fact questions", () => {
    const qs = [
      { id: 'fact', ask: '?', from: 1 },
      { id: 'next-3', ask: '?', from: 3, to: 3 },
      { id: 'told-3', ask: '?', from: 3, to: 3 },
      { id: 'lost', ask: '?', from: 2 },
    ]
    // Asked together, Sonnet answered the handoff from the memory too, "unknown" included, and seldom searched.
    expect(questionGroups(qs).map((g) => [g.group, g.questions.map((q) => q.id)])).toEqual([
      ['facts', ['fact', 'lost']],
      ['handoff', ['next-3', 'told-3']],
    ])
    expect(questionGroups(qs.slice(1, 3)).map((g) => g.group)).toEqual(['handoff'])
    expect(questionGroups([])).toEqual([])
  })

  test("asks om's configurations about the om run named, the live one unless another is, and the built-in ones about the built-in chain", () => {
    expect(['om', 'om+recall', 'builtin', 'builtin+recall'].map((c) => questionRun(c as Configuration))).toEqual(['om-live', 'om-live', 'builtin', 'builtin'])
    expect(['om', 'om+recall', 'builtin+recall'].map((c) => questionRun(c as Configuration, 'om-v130'))).toEqual(['om-v130', 'om-v130', 'builtin'])
  })

  test('plans a plain session with the context in its prompt, and a +recall one on a seeded copy of the transcript', () => {
    const base = { boundary: 2, context: { summary: 'SUMMARY', kept: [{ text: 'KEPT', toolUses: [] }] }, questions, runDir: '/r', sessionId: 'sid', recallPluginDir: '/r/recall-plugin' }
    const plain = planQuestionSession({ ...base, config: 'om' })
    expect(plain.prompt).toContain('<context>\nSUMMARY\n\nKEPT\n</context>')
    expect(plain.prompt).toContain('dir: Where do worktrees go?\nwhy: Why?')
    // The prompt goes on stdin: a compacted context can pass Linux's cap on one argument.
    expect(plain.argv).toEqual(['claude', '-p', '--model', 'sonnet', '--settings', '/r/q-om-2/settings.json', '--output-format', 'json', '--strict-mcp-config', '--tools', ''])
    expect(plain.settings.env.CLAUDE_CODE_PLUGIN_DIRS).toBe('')
    expect(plain.seed).toBeUndefined()
    const recall = planQuestionSession({ ...base, config: 'builtin+recall' })
    expect(recall.prompt).not.toContain('SUMMARY')
    // `--tools ''` would take om_recall away too: ToolSearch alone stays, and dontAsk denies what is not allowed.
    expect(recall.argv.slice(-8)).toEqual(['--tools', 'ToolSearch', '--permission-mode', 'dontAsk', '--resume', 'sid', '--allowedTools', 'mcp__observational-memory__om_recall'])
    expect(recall.settings.env.CLAUDE_CODE_PLUGIN_DIRS).toBe('/r/recall-plugin')
    expect(recall.seed).toEqual({ sessionId: 'sid', through: 2, summary: 'SUMMARY\n\nKEPT' })
    // A handoff session has its own directory beside the facts one at the same boundary.
    expect(planQuestionSession({ ...base, config: 'om', group: 'handoff' }).settingsPath).toBe('/r/q-om-2-handoff/settings.json')
  })

  test("a +recall session's seed is the transcript up to the boundary, then the context as a compaction", () => {
    const s = threeBoundaries()
    const rows = questionSeedRows(s.text(), { sessionId: 'new', through: 2, summary: 'CONTEXT' }, '/sandbox', { boundary: 'B', summary: 'S' })
    const texts = rows.map((r) => (typeof r.message?.content === 'string' ? r.message.content : r.subtype ?? r.message?.content?.[0]?.type))
    expect(texts).toEqual(['Worktrees go in .worktrees. Spend at most $30 on this.', 'text', 'tool_use', 'tool_result', 'Actually spend up to $50 now.', 'text', 'compact_boundary', 'CONTEXT'])
    expect(rows.every((r) => r.sessionId === 'new' && r.cwd === '/sandbox')).toBe(true)
    expect(rows.at(-2)!.logicalParentUuid).toBe(rows.at(-3)!.uuid)
    expect(rows.at(-1)).toMatchObject({ parentUuid: 'B', isCompactSummary: true, uuid: 'S' })
  })
})

describe('question results', () => {
  const qs = [
    { id: 'dir', ask: 'Where do worktrees go?', from: 1, expect: ['.worktrees'] },
    { id: 'issue', ask: 'Which issue?', from: 1, expect: ['#13'] },
    { id: 'why', ask: 'Why?', from: 1 },
  ]
  const result = (config: QuestionResult['config'], boundary: number, text: string, extra: Partial<QuestionResult> = {}): QuestionResult => ({
    config,
    boundary,
    sessionId: 's',
    costUsd: 0.25,
    answers: scoreAnswers(qs, text),
    ...extra,
  })

  test('scores every question asked: an unanswered one fails its exact check, one with no expected string is unscored', () => {
    expect(scoreAnswers(qs, 'dir: .worktrees\nwhy: tidy')).toEqual([
      { id: 'dir', answer: '.worktrees', check: 'pass' },
      { id: 'issue', answer: '', check: 'fail' },
      { id: 'why', answer: 'tidy', check: 'needs a model grader' },
    ])
  })

  test("a +recall session's answers come from every reply after its seeded compaction, a later reply's answer replacing an earlier one", () => {
    const text = (id: string, t: string) => ({ type: 'assistant', uuid: id, message: { id, role: 'assistant', content: [{ type: 'text', text: t }] } })
    const real = session().user('find it').reply('dir: from the real session').compact('real summary')
    const rows = questionSeedRows(real.text(), { sessionId: 'q', through: 1, summary: 'CONTEXT' }, '/sandbox', { boundary: 'B', summary: 'S' })
    const later = new Date(Date.UTC(2027, 0, 1)).toISOString()
    rows.push(
      { type: 'user', uuid: 'p', parentUuid: 'S', timestamp: later, message: { role: 'user', content: 'questions' } },
      // Answers first, then a search for what it did not know, then only the answers it looked up.
      { ...text('a1', 'dir: .worktrees\nissue: unknown'), parentUuid: 'p', timestamp: later },
      { type: 'assistant', uuid: 'a2', parentUuid: 'a1', timestamp: later, message: { id: 'a2', role: 'assistant', content: [{ type: 'tool_use', id: 'c1', name: 'mcp__observational-memory__om_recall', input: { query: 'issue' } }] } },
      { ...text('a3', 'issue: #13'), parentUuid: 'a2', timestamp: later },
    )
    expect(answerTexts(rows)).toEqual(['dir: .worktrees\nissue: unknown', 'issue: #13'])
    expect(scoreAnswers(qs, answerTexts(rows))).toEqual([
      { id: 'dir', answer: '.worktrees', check: 'pass' },
      { id: 'issue', answer: '#13', check: 'pass' },
      { id: 'why', answer: '', check: 'needs a model grader' },
    ])
    expect(answerTexts(session().reply('no compaction').rows)).toEqual([])
  })

  test('tallies each configuration: the last session per boundary, exact answers, unscored ones, failed sessions and om_recall calls', () => {
    const tallies = tallyQuestions([
      result('om+recall', 1, 'dir: unknown', { recallCalls: 0 }),
      result('om', 1, 'dir: .worktrees\nissue: #13'),
      result('om+recall', 1, 'dir: .worktrees\nissue: #13', { recallCalls: 2 }), // run again: this one counts
      result('om+recall', 2, 'dir: .worktrees', { recallCalls: 0 }),
      { ...result('om+recall', 3, ''), answers: [], error: 'error_max_turns: stopped', recallCalls: 1 },
    ])
    expect(tallies).toEqual([
      { config: 'om', boundaries: [1], sessions: 1, failed: 0, exact: { correct: 2, asked: 2 }, unscored: 1, costUsd: 0.25 },
      { config: 'om+recall', boundaries: [1, 2, 3], sessions: 3, failed: 1, exact: { correct: 3, asked: 4 }, unscored: 2, recall: { calling: 2, calls: 3 }, costUsd: 0.75 },
    ])
  })

  test("counts a boundary's facts and handoff sessions apart, the last of each", () => {
    const handoff = { group: 'handoff' as const }
    const tallies = tallyQuestions([
      result('om+recall', 1, 'dir: .worktrees', { recallCalls: 0 }),
      result('om+recall', 1, 'issue: unknown', { ...handoff, recallCalls: 0 }),
      result('om+recall', 1, 'issue: #13', { ...handoff, recallCalls: 3 }), // run again: this one counts
    ])
    expect(tallies).toEqual([
      { config: 'om+recall', boundaries: [1], sessions: 2, failed: 0, exact: { correct: 2, asked: 4 }, unscored: 2, recall: { calling: 1, calls: 3 }, costUsd: 0.5 },
    ])
  })

  test("counts a +recall session's om_recall calls after its seeded compaction, not the real session's before it", () => {
    const recall = (id: string) => ({ type: 'tool_use', id, name: 'mcp__observational-memory__om_recall', input: { query: 'x' } })
    // The real session called om_recall before its boundary; the seed keeps that call.
    const real = session().user('find it')
    real.raw({ ...real.rows[0], uuid: 'orig', type: 'assistant', message: { role: 'assistant', content: [recall('c0')] } }).compact('real summary')
    const rows = questionSeedRows(real.text(), { sessionId: 'q', through: 1, summary: 'CONTEXT' }, '/sandbox', { boundary: 'B', summary: 'S' })
    expect(rows.some((r) => r.message?.content?.[0]?.name === 'mcp__observational-memory__om_recall')).toBe(true)
    const later = new Date(Date.UTC(2027, 0, 1)).toISOString()
    rows.push(
      { type: 'user', uuid: 'p', parentUuid: 'S', timestamp: later, message: { role: 'user', content: 'questions' } },
      { type: 'assistant', uuid: 'a', parentUuid: 'p', timestamp: later, message: { id: 'm', role: 'assistant', content: [recall('c1')] } },
    )
    expect(recallCallsIn(rows)).toBe(1)
    expect(recallCallsIn(session().reply('no compaction').rows)).toBe(0)
  })
})

describe('the built-in chain', () => {
  test("seeds a span's own rows, re-parented one after the other, without the previous compaction's output", () => {
    const s = threeBoundaries()
    const rows = seedRows(s.text(), 1, { sessionId: 'new', cwd: '/sandbox', parentUuid: 'leaf' })
    expect(rows.map((r) => r.message.content[0]?.text ?? r.message.content)).toEqual(['Actually spend up to $50 now.', 'Back in hooks/register.ts; 1a2b3c4d and tests/kept-file.ts are unchanged.'])
    expect(rows[0]).toMatchObject({ parentUuid: 'leaf', sessionId: 'new', cwd: '/sandbox' })
    expect(rows[1]!.parentUuid).toBe(rows[0]!.uuid)
    // Without `from`, each row keeps its own stamp.
    expect(rows.map((r) => r.timestamp)).toEqual(rows.map((r) => s.rows.find((o) => o.uuid === r.uuid)!.timestamp))
  })

  test('seeded rows appended after a compaction can be stamped later than it, one millisecond apart', () => {
    const from = Date.UTC(2027, 0, 1)
    const rows = seedRows(threeBoundaries().text(), 1, { sessionId: 'new', cwd: '/sandbox', parentUuid: 'leaf', from })
    expect(rows.map((r) => r.timestamp)).toEqual([new Date(from).toISOString(), new Date(from + 1).toISOString()])
  })

  test("reads a resumed session's last compaction back, and the row the next span continues from", () => {
    const c = lastCompaction(threeBoundaries().text())!
    expect(c.summary).toBe('Summary three.')
    expect(c.kept.map((r) => r.text)).toEqual(['thanks', 'Done with #13.'])
    expect(c.leaf).toBe(threeBoundaries().rows.at(-1)!.uuid)
    expect(c.boundaries).toBe(3)
    expect(c.preTokens).toBe(150_000)
    expect(lastCompaction(session().user('no compaction').text())).toBeUndefined()
  })

  test('a collected compaction must be the next one, and must have compacted at least half of what was appended', () => {
    const c = lastCompaction(threeBoundaries().text())
    expect(uncompacted(c, 3, 200_000)).toBeUndefined()
    expect(uncompacted(c, 3, 400_000)).toBe('it compacted 150000 tokens, under half of the ~400000 appended before it: the resumed session did not see them')
    expect(uncompacted(c, 4, 1_000)).toBe('3 compactions, expected 4')
    expect(uncompacted(undefined, 1, 1_000)).toBe('no compaction with a summary')
    expect(uncompacted({ ...c!, summary: '' }, 3, 1_000)).toBe('no compaction with a summary')
    const { preTokens: _, ...unsized } = c!
    expect(uncompacted(unsized, 3, 1_000)).toBe('no compacted size (compactMetadata.preTokens) to check the appended rows against')
  })

  test('plans each boundary as seed, resume, /compact, exit, settle and collect, with no plugin loaded', () => {
    const plan = planBuiltinChain({ runDir: '/r', sessionId: 'abcdef12-0000', pane: 'w1:p2', boundaries: 2, timeoutMs: 900_000, startTimeoutMs: 60_000 })
    expect(plan.settings.env.CLAUDE_CODE_PLUGIN_DIRS).toBe('')
    expect(plan.steps.map((s) => s.kind)).toEqual(['herdr', 'seed', 'herdr', 'herdr', 'herdr', 'settle', 'collect', 'seed', 'herdr', 'herdr', 'herdr', 'settle', 'collect'])
    const resume = plan.steps[2] as { argv: string[] }
    expect(resume.argv).toContain('--resume')
    expect(resume.argv).toContain('/r/settings.json')
    expect((plan.steps[3] as { argv: string[] }).argv.slice(3, 4)).toEqual(['/compact'])
  })
})

describe('the plan and the report', () => {
  const spec: ReplaySpec = {
    constraints: [{ id: 'worktrees', quote: 'Worktrees go in .worktrees.', setIn: 0, held: ['\\.worktrees'] }],
    questions: [{ id: 'dir', ask: 'Where do worktrees go?', from: 2, expect: ['.worktrees'] }],
  }

  test('plans every model call: observation per chunk, reflections, one /compact per boundary, questions per configuration', () => {
    const t = parseTranscript(threeBoundaries().text())
    const calls = planCalls('t', t, spec)
    expect(calls.filter((c) => c.stage === 'observer').length).toBe(4) // one small chunk per span
    expect(calls.filter((c) => c.stage === 'reflector').map((c) => c.boundary)).toEqual([1, 2])
    expect(calls.filter((c) => c.stage === 'compaction').map((c) => [c.boundary, c.inTokens])).toEqual([
      [1, 150_000],
      [2, 150_000],
      [3, 150_000],
    ])
    expect(calls.filter((c) => c.stage === 'question').map((c) => `${c.boundary} ${c.configs.join()}`)).toEqual(
      [2, 3].flatMap((b) => ['builtin', 'builtin+recall', 'om', 'om+recall'].map((config) => `${b} ${config}`)),
    )
    // A boundary with handoff questions plans a second session per configuration.
    const withHandoff = planCalls('t', t, { ...spec, questions: [...spec.questions, { id: 'next-3', ask: '?', from: 3, to: 3 }] })
    expect(withHandoff.filter((c) => c.stage === 'question' && c.boundary === 3).length).toBe(8)
    const recall = calls.find((c) => c.stage === 'question' && c.configs[0] === 'om+recall')!
    const plain = calls.find((c) => c.stage === 'question' && c.configs[0] === 'om')!
    expect(recall.usd).toBeGreaterThan(plain.usd)
    // A stub replay's Observer calls replace the estimate of them; reflections stay estimated.
    const stubbed = planCalls('t', t, spec, { omCalls: [{ kind: 'observer', inTokens: 1000 }, { kind: 'observer', inTokens: 2000 }] })
    expect(stubbed.filter((c) => c.stage === 'observer').map((c) => c.inTokens)).toEqual([1000, 2000])
    expect(stubbed.filter((c) => c.stage === 'reflector').length).toBe(2)
    const text = describeCalls(calls)
    expect(text).toStartWith(`Dry run: ${calls.length} planned model call(s), none made.`)
    expect(text).toContain('| om+recall |')
    expect(text).toContain('| all (each call once) |')
  })

  test('reports per boundary and configuration, with the drift curve', () => {
    const t = parseTranscript(threeBoundaries().text())
    const results = [
      { config: 'recorded', source: 'own', contexts: t.boundaries.map((b) => ({ summary: b.summary, kept: b.kept })) },
      { config: 'om', source: 'replay', contexts: [{ summary: 'hooks/register.ts 1a2b3c4 .worktrees', kept: [] }, undefined, undefined] },
    ]
    const text = renderTranscript({ name: 'demo', t, spec, results })
    expect(text).toContain('## demo')
    expect(text).toContain('| 1 | 2 | 0/2 (0%) | 2/2 (100%) |')
    expect(text).toContain('| 2 | 2 | 0/2 (0%) | not run |')
    expect(text).toContain('| 1 | 1 | 1/1 (100%) | 0/0 | 1/1 (100%) | 0/0 |')
    expect(text).toContain('### Drift: what was known before boundary 1')
    expect(text).toContain('- recorded: hooks/register.ts (@1), 1a2b3c4 (@1)')
    expect(text).toContain('1 questions, 1 with an exact-string check and 0 needing a model grader; 2 asks per configuration over the 3 boundaries.')
  })

  test('reports the question stage per configuration once it has run, and a private transcript without its questions or answers', () => {
    const t = parseTranscript(threeBoundaries().text())
    const recorded = [{ config: 'recorded', source: 'own', contexts: t.boundaries.map((b) => ({ summary: b.summary, kept: b.kept })) }]
    const questions: QuestionResult[] = [
      { config: 'om', boundary: 2, sessionId: 's1', costUsd: 0.1, answers: [{ id: 'dir', answer: 'in .worktrees', check: 'pass' }] },
      { config: 'om+recall', boundary: 2, sessionId: 's2', costUsd: 0.3, answers: [{ id: 'dir', answer: 'somewhere-secret', check: 'fail' }], recallCalls: 2 },
      { config: 'om+recall', boundary: 3, sessionId: 's3', costUsd: 0.2, answers: [{ id: 'dir', answer: 'in .worktrees', check: 'pass' }], recallCalls: 0 },
    ]
    const text = renderTranscript({ name: 'demo', t, spec, results: recorded, questions })
    expect(text).not.toContain('(planned, not run)')
    expect(text).toContain('| om | 2 | 1 | 1/1 (100%) | 0 | – | $0.1000 |')
    expect(text).toContain('| om+recall | 2, 3 | 2 | 1/2 (50%) | 0 | 2 in 1/2 sessions | $0.5000 |')
    expect(text).toContain('- om+recall: dir (@2)')
    const hidden = renderTranscript({ name: 'private', t, spec, results: recorded, questions, private: true })
    expect(hidden).toContain('| om+recall | 2, 3 | 2 | 1/2 (50%) | 0 | 2 in 1/2 sessions | $0.5000 |')
    for (const secret of ['dir', 'worktrees', 'somewhere-secret', 's2']) expect(hidden).not.toContain(secret)
  })

  test('leaves out a cached or live om replay whose pi calls failed or went uncounted, and nothing else', () => {
    expect(leftOut('om-strict', { luna: { failed: 0 } })).toBeUndefined()
    expect(leftOut('om-live', { luna: { failed: 2 } })).toBe('2 pi call(s) failed')
    expect(leftOut('om-strict', undefined)).toBe('no pi call count (summary.json)')
    expect(leftOut('om-stub', undefined)).toBeUndefined()
    expect(leftOut('om-v130', { luna: { failed: 1 } })).toBe('1 pi call(s) failed')
    expect(leftOut('om-v130', { luna: { failed: 0 } })).toBeUndefined()
    expect(leftOut('builtin', undefined)).toBeUndefined()
  })

  test("a public transcript's list of missing identifiers does not say which session one named", () => {
    const t = parseTranscript(
      session().user('session 0f1e2d3c: read /home/u/.claude/projects/p/0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b.jsonl, not ~/.claude/projects/q').compact('s').reply('0f1e2d3c at /home/u/.claude/projects/p/0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b.jsonl and ~/.claude/projects/q, then hooks/a.ts').text(),
    )
    const text = renderTranscript({ name: 'demo', t, results: [{ config: 'recorded', source: 'own', contexts: [{ summary: 'nothing', kept: [] }] }] })
    expect(text).toContain('- recorded: <a session> (@1), <a session> (@1), <a session> (@1)')
    expect(text).not.toContain('0f1e2d3c')
  })

  test('a private transcript gets aggregate numbers only', () => {
    const t = parseTranscript(threeBoundaries().text())
    const text = renderTranscript({ name: 'private', t, spec, results: [{ config: 'recorded', source: 'own', contexts: t.boundaries.map((b) => ({ summary: b.summary, kept: b.kept })) }], private: true })
    expect(text).not.toContain('hooks/register.ts')
    expect(text).not.toContain('worktrees')
    expect(text).toContain('### Needed identifiers held')
  })
})

describe('a chain of transcripts', () => {
  // Another session's rows, with uuids of their own (session() numbers every session's alike).
  const second = () => ({ text: () => session().user('Second session: start on issue #7.').reply('On #7.').compact('S').user('bye').text().replace(/"uuid":"/g, '"uuid":"2-') })

  test('joins them into one session, each before the last shifted back to end before the next one starts', () => {
    const first = threeBoundaries().text()
    const { text, offsets } = chainTranscripts([first, second().text()], 60_000)
    expect(offsets).toEqual([0, 3])
    const t = parseTranscript(text)
    expect(t.boundaries.map((b) => b.n)).toEqual([1, 2, 3, 4])
    // The second's span 0 continues the first's last span, and its boundary 1 is the chain's boundary 4.
    expect(t.spans[3]!.map((r) => r.text)).toEqual(['thanks', 'Done with #13.', 'Second session: start on issue #7.', 'On #7.'])
    expect(t.boundaries[3]!.summary).toBe('S')
    const times = t.events.map((e) => e.at)
    expect(times).toEqual([...times].sort((a, b) => a - b))
    // The last keeps its own times; the first now ends a minute before it starts.
    const own = parseTranscript(second().text())
    expect(t.spans[3]![2]!.at).toBe(own.spans[0]![0]!.at)
    expect(Math.max(...t.spans[3]!.slice(0, 2).map((r) => r.at))).toBe(own.spans[0]![0]!.at - 60_000)
    // The rows a compaction kept raw stay stamped before its boundary, so they are still its output.
    expect(t.boundaries[3]!.kept).toEqual([])
    expect(chainTranscripts([first]).text).toBe(first)
  })

  test("shifts each member's spec to its boundaries, its ids prefixed with its name", () => {
    const { text, offsets } = chainTranscripts([threeBoundaries().text(), second().text()])
    const one: ReplaySpec = { constraints: [{ id: 'budget', quote: 'Spend at most $30', setIn: 0, held: ['\\$30'], reversal: { quote: 'spend up to $50', in: 1, held: ['\\$50'] } }], questions: [{ id: 'q', ask: '?', from: 1 }] }
    const two: ReplaySpec = {
      constraints: [{ id: 'issue', quote: 'start on issue #7', setIn: 0, held: ['#7'] }],
      questions: [
        { id: 'q', ask: '?', from: 1 },
        { id: 'next-1', ask: '?', from: 1, to: 1 },
      ],
    }
    const spec = chainSpec([
      { name: 'a', offset: offsets[0]!, spec: one },
      { name: 'b', offset: offsets[1]!, spec: two },
      { name: 'c', offset: 4 },
    ])
    expect(spec.constraints.map((c) => [c.id, c.setIn, c.reversal?.in])).toEqual([
      ['a-budget', 0, 1],
      ['b-issue', 3, undefined],
    ])
    expect(spec.questions.map((q) => [q.id, q.from, q.to])).toEqual([
      ['a-q', 1, undefined],
      ['b-q', 4, undefined],
      ['b-next-1', 4, 4],
    ])
    expect(checkSpec(parseTranscript(text), spec)).toEqual([])
  })
})

describe('reflections', () => {
  const t = () => parseTranscript(threeBoundaries().text())
  const worktrees: ConstraintSpec = { id: 'worktrees', quote: 'Worktrees go in .worktrees.', setIn: 0, held: ['\\.worktrees'] }
  const spec: ReplaySpec = { constraints: [worktrees], questions: [] }
  const corrections = ['🔴 2026-09-24 12:00 User: "Worktrees go in .worktrees."']
  // Three observations replaced by two, a newer one left alone.
  const reflection: Reflection = {
    at: 0,
    afterBoundary: 1,
    before: {
      corrections,
      entries: [
        { id: 'o1', line: '🔴 2026-09-24 12:00 User wants worktrees in .worktrees', source: { from: 0, to: 60_000 } },
        { id: 'o2', line: '🟡 2026-09-24 12:02 Assistant read hooks/register.ts at 1a2b3c4d; git log showed 9f8e7d6c', source: { from: 120_000, to: 240_000 } },
        { id: 'o3', line: '🟢 2026-09-24 12:03 Assistant listed files' },
        { id: 'o4', line: '🟡 2026-09-24 12:10 User asked about issue #13', source: { from: 600_000, to: 660_000 } },
      ],
    },
    after: {
      corrections,
      entries: [
        { id: 'o5', line: '🟡 2026-09-24 12:02 Assistant worked in hooks/register.ts', source: { from: 0, to: 240_000 } },
        { id: 'o6', line: '🟢 2026-09-24 12:03 Assistant listed files', source: { from: 0, to: 60_000 } },
        { id: 'o4', line: '🟡 2026-09-24 12:10 User asked about issue #13', source: { from: 600_000, to: 660_000 } },
      ],
    },
    logged: { tokensBefore: 41_000, tokensAfter: 18_000, level: 2 },
  }

  test('scores what a reflection kept of the memory before it', () => {
    const s = scoreReflection(t(), spec, reflection)
    expect(s.lines).toEqual({ replaced: 3, written: 2, untouched: 1 })
    expect(s.red).toEqual({ replaced: 1, written: 0 })
    expect(s.correctionsUnchanged).toBe(true)
    // The corrections still hold the constraint; the observations alone lost it.
    expect(s.constraints).toEqual({ before: 1, after: 1, total: 1, lost: [] })
    expect(s.constraintsInObservations).toEqual({ before: 1, after: 0, lost: ['worktrees'] })
    // Boundaries 2 and 3 need hooks/register.ts, 9f8e7d6 and #13, all held before; the reflection lost the hash.
    expect(s.identifiers.heldBefore).toBe(3)
    expect(s.identifiers.keptAfter).toBe(2)
    expect(s.identifiers.lost.map((x) => x.key)).toEqual(['9f8e7d6'])
    expect(s.early).toEqual({ total: 3, heldBefore: 3, keptAfter: 1 })
    // o5 got the whole span of what it replaced (the plugin's fallback), o6 a range of its own.
    expect(s.sources).toEqual({ replaced: 2, written: 2, wholeSpan: 1, medianMinutes: { replaced: 2, written: 4 } })
  })

  test('a changed corrections section shows', () => {
    const changed = { ...reflection, after: { ...reflection.after, corrections: [] } }
    const s = scoreReflection(t(), spec, changed)
    expect(s.correctionsUnchanged).toBe(false)
    expect(s.constraints.lost).toEqual(['worktrees'])
  })

  test('renders a row per reflection, and a private replay without what was lost', () => {
    const text = renderReflections({ name: 'demo', t: t(), spec, reflections: [reflection], target: 20_000 })
    expect(text).toContain('| 1 | 1 | 41,000 → 18,000 (20,000) | 2 | 3 → 2 (1) | 1 → 0 | yes | 1 → 1 of 1 | 1 → 0 | 2/3 (67%) | 3 → 1 of 3 | 2/2 (1) | 2 → 4 |')
    expect(text).toContain('from the observations alone worktrees; identifiers lost 9f8e7d6')
    const quiet = renderReflections({ name: 'demo', t: t(), spec, reflections: [reflection], target: 20_000, private: true })
    expect(quiet).not.toContain('9f8e7d6')
    expect(quiet).not.toContain('worktrees')
    expect(renderReflections({ name: 'demo', t: t(), reflections: [], target: 20_000 })).toContain('No reflection ran.')
  })
})
