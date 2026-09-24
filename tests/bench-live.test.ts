import { describe, expect, test } from 'claude-code/testing'
import { RECALL_TOOL } from './eval/bench'
import type { RunRecord } from './eval/bench'
import { admitRun, autoCompactThreshold, checkPluginList, checkRecallOnly, describePlan, planRun, runIdOf, shellLine } from './eval/live'
import type { PlanInput } from './eval/live'
import { CONFIGURATIONS } from './eval/runner'
import type { Configuration } from './eval/runner'
import { growStep, scenarioById } from './eval/scenarios'

const SESSION = '0f1e2d3c-4b5a-4968-8776-655443322110'
const input = (config: Configuration, extra: Partial<PlanInput> = {}): PlanInput => ({
  config,
  version: 'new',
  scenario: scenarioById('repeated-compaction')!,
  run: 2,
  pluginRoot: '/repo',
  recallPluginSource: '/repo-under-test/tests/eval/recall-plugin',
  benchRoot: '/tmp/om-bench',
  pane: 'w1:p2',
  sessionId: SESSION,
  timeoutMs: 600_000,
  settleMs: 30_000,
  startTimeoutMs: 60_000,
  ...extra,
})
const env = (config: Configuration) => planRun(input(config)).settings.env

describe('the live run plan', () => {
  test('names each run from its scenario, configuration, version and run number, in characters safe for a path', () => {
    expect(runIdOf('om+recall', 'new', 'absent-fact', 3)).toBe('absent-fact.om-recall.new.r3')
    expect(() => runIdOf('om', 'Old Version', 'absent-fact', 1)).toThrow(/version/)
  })

  test("each configuration's settings load exactly its own plugin, or none, in place of the user's inline one", () => {
    expect(env('builtin').CLAUDE_CODE_PLUGIN_DIRS).toBe('')
    expect(env('builtin+recall').CLAUDE_CODE_PLUGIN_DIRS).toBe('/tmp/om-bench/repeated-compaction.builtin-recall.new.r2/recall-plugin')
    expect(env('om').CLAUDE_CODE_PLUGIN_DIRS).toBe('/repo')
    expect(env('om+recall').CLAUDE_CODE_PLUGIN_DIRS).toBe('/repo')
    // The plugin's stats go to the run's own directory, where the scorer reads the Observer's cost.
    expect(env('om').OM_STATS_DIR).toBe('/tmp/om-bench/repeated-compaction.om.new.r2/stats')
  })

  test('om alone denies om_recall on the command line; only the recall configurations allow it', () => {
    for (const config of CONFIGURATIONS) {
      const plan = planRun(input(config))
      expect(plan.claudeArgs.includes('--disallowed-tools')).toBe(config === 'om')
      const allow = plan.settings.permissions.allow
      expect(allow.includes(RECALL_TOOL)).toBe(config.endsWith('+recall'))
    }
    expect(planRun(input('om')).claudeArgs.join(' ')).toContain(`--disallowed-tools ${RECALL_TOOL}`)
  })

  test("the recall-only plugin is assembled from this checkout's plugin and the version's own recall module", () => {
    const plan = planRun(input('builtin+recall', { pluginRoot: '/old' }))
    const dir = '/tmp/om-bench/repeated-compaction.builtin-recall.new.r2/recall-plugin'
    expect(plan.copies).toEqual([
      { from: '/repo-under-test/tests/eval/recall-plugin', to: dir },
      { from: '/old/hooks/recall.ts', to: `${dir}/hooks/recall.ts` },
      { from: '/old/hooks/prompts.ts', to: `${dir}/hooks/prompts.ts` },
    ])
    expect(planRun(input('om')).copies).toEqual([])
  })

  test('writes the scenario files into a throwaway project and starts claude there with sonnet, the session id and the settings', () => {
    const plan = planRun(input('om'))
    expect(plan.projectDir).toBe('/tmp/om-bench/repeated-compaction.om.new.r2/project')
    expect(Object.keys(plan.files)).toContain('/tmp/om-bench/repeated-compaction.om.new.r2/project/src/flags.py')
    expect(plan.files[plan.settingsPath]).toBe(JSON.stringify(plan.settings, null, 2) + '\n')
    const [cd, start] = plan.steps
    expect(cd).toMatchObject({ kind: 'herdr', argv: ['pane', 'run', 'w1:p2', `cd '${plan.projectDir}'`] })
    expect(start).toMatchObject({ kind: 'herdr', argv: ['agent', 'start', plan.agent, '--kind', 'claude', '--pane', 'w1:p2', '--timeout', '60000', '--', ...plan.claudeArgs] })
    expect(plan.claudeArgs.slice(0, 6)).toEqual(['--model', 'sonnet', '--session-id', SESSION, '--settings', plan.settingsPath])
  })

  test('sends the prompts in order, waits between them, settles before each manual /compact, and ends with the continuation', () => {
    const plan = planRun(input('om+recall'))
    const s = scenarioById('repeated-compaction')!
    const sent = plan.steps.flatMap((st) => (st.kind === 'herdr' && st.argv[1] === 'prompt' ? [st.argv[3]!] : []))
    const expected = [...s.steps.map((x) => ('prompt' in x ? x.prompt : '/compact')), s.continuation]
    expect(sent).toEqual(expected)
    for (const st of plan.steps.filter((x) => x.kind === 'herdr' && x.argv[1] === 'prompt'))
      expect(st.kind === 'herdr' && st.argv.slice(4)).toEqual(['--wait', '--timeout', '600000'])
    const compacts = plan.steps.flatMap((st, i) => (st.kind === 'herdr' && st.argv[3] === '/compact' ? [i] : []))
    expect(compacts).toHaveLength(3)
    for (const i of compacts) expect(plan.steps[i - 1]).toEqual({ kind: 'settle', ms: 30_000, purpose: expect.any(String) })
  })

  test('OM_BRIEF=always reaches the session only as its own labelled variant of an observational configuration', () => {
    // Off by default: no configuration's settings carry the switch.
    for (const config of CONFIGURATIONS) expect('OM_BRIEF' in planRun(input(config)).settings.env).toBe(false)
    const plan = planRun(input('om+recall', { version: 'new-brief', brief: 'always' }))
    expect(plan.settings.env.OM_BRIEF).toBe('always')
    expect(plan.runId).toBe('repeated-compaction.om-recall.new-brief.r2')
    expect(plan.files[plan.settingsPath]).toContain('"OM_BRIEF": "always"')
    expect(describePlan(plan)).toContain('OM_BRIEF=always')
    // Its results never mix with old or new: the switch needs a label of its own.
    expect(() => planRun(input('om', { brief: 'always' }))).toThrow(/label/)
    expect(() => planRun(input('om', { version: 'old', brief: 'always' }))).toThrow(/label/)
    // Built-in compaction has no memory message for the brief to go in.
    expect(() => planRun(input('builtin+recall', { version: 'new-brief', brief: 'always' }))).toThrow(/observational/)
  })

  test('the dry run shows every command, every prompt and what the session should have loaded', () => {
    const plan = planRun(input('om'))
    const text = describePlan(plan)
    for (const st of plan.steps) if (st.kind === 'herdr') expect(text).toContain(`herdr ${shellLine(st.argv)}`)
    for (const x of scenarioById('repeated-compaction')!.steps) if ('prompt' in x) expect(text).toContain(x.prompt)
    expect(text).toContain('observational-memory from /repo')
    expect(text).toContain('om_recall: not offered')
    expect(text).toContain(`claude --settings ${plan.settingsPath} plugin list`)
  })
})

describe('the live plan of a scenario that compacts on its own', () => {
  const rr = scenarioById('recall-required')!
  const plan = planRun(input('om+recall', { scenario: rr }))
  const grow = growStep(rr)!

  test('repeats the growth prompt until a compaction shows in the transcript, capped, with no manual /compact', () => {
    const sent = plan.steps.flatMap((st) => (st.kind !== 'settle' && st.argv[1] === 'prompt' ? [st.argv[3]!] : []))
    expect(sent).toEqual([(rr.steps[0] as { prompt: string }).prompt, grow.grow, rr.continuation])
    const step = plan.steps.find((st) => st.kind === 'grow')!
    expect(step).toMatchObject({ kind: 'grow', prompt: grow.grow, max: 30, settleMs: plan.input.settleMs, argv: ['agent', 'prompt', plan.agent, grow.grow, '--wait', '--timeout', '600000'] })
    expect(plan.steps.some((st) => st.kind !== 'settle' && st.argv[3] === '/compact')).toBe(false)
    expect(plan.steps.filter((st) => st.kind === 'settle')).toHaveLength(1) // the one after /exit
  })

  test('sets no autocompact window: not in the settings, the environment or the command line', () => {
    expect(JSON.stringify(plan.settings)).not.toMatch(/autoCompact|AUTO_COMPACT/i)
    expect(plan.claudeArgs.join(' ')).not.toMatch(/autocompact/i)
  })

  test('the dry run shows the growth loop, its cap and the per-run ceiling', () => {
    const text = describePlan(plan)
    expect(text).toContain(`herdr ${shellLine(plan.steps.find((st) => st.kind === 'grow')!.argv)}`)
    expect(text).toContain('(as a pausing user would), repeated until Claude Code compacts on its own (a new compact_boundary row in the transcript), at most 30 times')
    expect(text).toContain('Per-run ceiling: $5')
    expect(describePlan(planRun(input('om')))).toContain('Per-run ceiling: --ceiling-usd (default $1) until a live run completes')
  })

  test("says which autocompact threshold the session will have, from the user's settings and the environment", () => {
    expect(autoCompactThreshold(JSON.stringify({ autoCompactWindow: 190000 }), undefined)).toBe(
      'Auto-compaction: the run sets no window; the session has autoCompactWindow 190000 from ~/.claude/settings.json.',
    )
    expect(autoCompactThreshold('{}', undefined)).toMatch(/^Auto-compaction: the run sets no window; the session has Claude Code's default for the model \(about 967k tokens for Sonnet 5\)/)
    expect(autoCompactThreshold(undefined, '300000')).toMatch(/CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000 is set in this environment/)
    expect(autoCompactThreshold('not json', undefined)).toMatch(/cannot read ~\/\.claude\/settings\.json/)
  })
})

describe('checking what a session will load', () => {
  const list = (entries: object[]) => JSON.stringify(entries)
  const om = { id: 'observational-memory@inline', enabled: true, installPath: '/repo', errors: [] }

  test('passes when exactly the expected plugin is loaded without errors, or none for built-in', () => {
    expect(checkPluginList(list([om, { id: 'vercel@x', enabled: false }]), planRun(input('om')))).toEqual([])
    expect(checkPluginList(list([{ id: 'vercel@x', enabled: false }]), planRun(input('builtin')))).toEqual([])
  })

  test("fails when the user's inline plugin, another copy, or a plugin with errors is loaded", () => {
    expect(checkPluginList(list([om]), planRun(input('builtin'))).join()).toMatch(/expected no observational-memory/)
    expect(checkPluginList(list([{ ...om, installPath: '/elsewhere' }]), planRun(input('om'))).join()).toMatch(/\/elsewhere/)
    expect(checkPluginList(list([{ ...om, errors: ['Path not found'] }]), planRun(input('om'))).join()).toMatch(/Path not found/)
    expect(checkPluginList('not json', planRun(input('om'))).join()).toMatch(/JSON/)
  })
})

describe('checking the assembled recall-only plugin', () => {
  // As `claude plugin validate` prints it.
  const validated = (hooks: string) => `Validating hooks: /tmp/p/hooks/hooks.json\n\n  ❯ ./register.ts hooks: ${hooks}\n  ❯ ./register.ts calls: $.tool.register\n\n✔ Validation passed\n`

  test('passes a plugin that handles om_recall, describes it, and records the transcript path, nothing else', () => {
    expect(checkRecallOnly(validated(`session.start, tool.call{tool=${RECALL_TOOL}}, tool.describe{tool=${RECALL_TOOL}}, classic.SessionStart, classic.Stop`))).toEqual([])
  })

  test('fails one that would also compact, or does not pass validation', () => {
    expect(checkRecallOnly(validated(`session.start, session.compact, tool.call{tool=${RECALL_TOOL}}`)).join()).toMatch(/more than om_recall: session\.compact/)
    expect(checkRecallOnly('✘ register.ts: cannot resolve ./recall').join()).toMatch(/did not pass/)
  })
})

describe('the run budget', () => {
  const rec = (mode: 'live' | 'offline', total?: number): RunRecord => ({
    runId: 'r',
    mode,
    configuration: 'om',
    version: 'new',
    scenario: 'absent-fact',
    run: 0,
    startedAt: '',
    model: 'sonnet',
    transcripts: [],
    ...(total === undefined
      ? { error: 'stalled' }
      : { cost: { tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, mainLoop: { status: 'estimated', value: total }, memoryModel: { status: 'measured', value: 0 }, hostReported: { status: 'unavailable', reason: '' }, total: { status: 'estimated', value: total } } }),
  })

  test('before any live run, reserves the per-run ceiling', () => {
    expect(admitRun([], 0.5, 1).admit).toBe(false)
    expect(admitRun([rec('offline', 50)], 1, 1)).toMatchObject({ admit: true, spentUsd: 0, reserveUsd: 1 })
  })

  test("refuses a run that could take the total past the budget, given the worst completed run's cost", () => {
    const done = [rec('live', 0.2), rec('live', 0.35)]
    expect(admitRun(done, 0.8)).toMatchObject({ admit: false, spentUsd: 0.55, reserveUsd: 0.35 })
    expect(admitRun(done, 1).admit).toBe(true)
  })

  test("reserves a scenario's own per-run ceiling when it is more than the worst completed run", () => {
    const done = [rec('live', 0.2), rec('live', 0.35)]
    expect(admitRun(done, 4, 1, 4)).toMatchObject({ admit: false, spentUsd: 0.55, reserveUsd: 4 })
    expect(admitRun(done, 5, 1, 4)).toMatchObject({ admit: true, reserveUsd: 4 })
    expect(admitRun([], 3, 1, 4).admit).toBe(false)
    expect(admitRun([rec('live', 5)], 10, 1, 4).reserveUsd).toBe(5)
    expect(admitRun(done, 5, 1, 4).reason).toContain("reserving $4.0000 (the scenario's per-run ceiling)")
  })

  test('counts a live run that did not complete at the worst cost, since what it spent is unknown', () => {
    expect(admitRun([rec('live', 0.2), rec('live')], 0.5)).toMatchObject({ admit: false, spentUsd: 0.4, reserveUsd: 0.2 })
    expect(admitRun([rec('live', 0.2)], 0).admit).toBe(false)
  })
})
