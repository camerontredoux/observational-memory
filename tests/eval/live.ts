// The live continuation-quality run (issue #9), as data: what `scripts/bench-live.ts` writes, copies and runs for one
// (configuration, plugin version, scenario, run), what the session should load, and whether the budget admits the
// run. Pure: no file system, process or herdr call here, so the tests check the plan itself; the script executes it.
//
// Isolation, found with zero-token commands (`claude --help`, `claude --settings <file> plugin list --json`):
// - The user's observational-memory plugin is `observational-memory@inline`, loaded from the directories in
//   `CLAUDE_CODE_PLUGIN_DIRS`, which ~/.claude/settings.json sets in its `env`. `--plugin-dir` adds a plugin beside it
//   and cannot remove it; `--bare` needs an API key, and the account is a claude.ai subscription.
// - `--settings <file>` with its own `env.CLAUDE_CODE_PLUGIN_DIRS` replaces the user's value: `""` loads no
//   observational-memory plugin, a path loads that directory's plugin alone. The rest of the user's settings (hooks,
//   herdr's state reporting among them) still apply, the same in every configuration.
// - om without recall: `--disallowed-tools mcp__observational-memory__om_recall`, a command-line flag, not a plugin
//   setting. builtin+recall: an evaluation-only plugin (tests/eval/recall-plugin) that registers om_recall alone.
// - `--permission-mode dontAsk` with an allow list in the settings: the session never stops at a permission prompt;
//   what the list leaves out is denied (the attempt stays in the transcript for the checks).
// - Auto-compaction: the run sets no window (no `autoCompactWindow` in its settings, no `--autocompact`, no
//   `CLAUDE_CODE_AUTO_COMPACT_WINDOW`), so the session compacts at its own threshold: the user's `autoCompactWindow`
//   (an any-file setting, so --settings leaves it in force), or Claude Code's default for the model (per its
//   model-config docs, about 967k tokens for Sonnet 5's native 1M window). `autoCompactThreshold` says which.

import { RECALL_TOOL } from './bench'
import type { RunRecord } from './bench'
import type { Configuration } from './runner'
import { recallAvailable, usesObservationalCompaction } from './runner'
import type { Scenario } from './scenarios'

export const MODEL = 'sonnet'
/** What one run is assumed to cost at most before any live run has completed: the scenarios are sized well under it. */
export const FIRST_RUN_CEILING_USD = 1

export type PlanInput = {
  config: Configuration
  /** `old`, `new`, or another label: lower-case letters, digits and hyphens. */
  version: string
  scenario: Scenario
  run: number
  /** The plugin version's checkout: its hooks/ is what om and om+recall load, and whose recall builtin+recall uses. */
  pluginRoot: string
  /** tests/eval/recall-plugin in the checkout running the benchmark. */
  recallPluginSource: string
  benchRoot: string
  /** An existing herdr pane at a shell prompt. */
  pane: string
  sessionId: string
  /** Per prompt: how long `herdr agent prompt --wait` waits for the turn to end. */
  timeoutMs: number
  /** The pause before each `/compact`, so every configuration's background work (the Observer's) has time to finish. */
  settleMs: number
  /** How long `herdr agent start` waits for Claude Code to be ready. */
  startTimeoutMs: number
  /**
   * `always`: the session runs with OM_BRIEF=always, so every observational compaction's memory also carries the
   * code-compiled session brief (hooks/register.ts). Off unless given; only under a version label of its own.
   */
  brief?: 'always'
}

export type PlanStep =
  | { kind: 'herdr'; argv: string[]; purpose: string; prompt?: string; stallOk?: boolean }
  | { kind: 'settle'; ms: number; purpose: string }
  /** Send `argv` (a prompt), after a `settleMs` pause, again after each turn until the transcript has a new compaction, at most `max` times. */
  | { kind: 'grow'; argv: string[]; purpose: string; prompt: string; max: number; settleMs: number }

/** The session's `--settings` file. */
export type Settings = { env: { CLAUDE_CODE_PLUGIN_DIRS: string; OM_STATS_DIR: string; OM_BRIEF?: 'always' }; permissions: { allow: string[] } }

export type Plan = {
  input: PlanInput
  runId: string
  runDir: string
  projectDir: string
  settingsPath: string
  statsDir: string
  settings: Settings
  claudeArgs: string[]
  /** Directories and files copied before the run, in order. */
  copies: { from: string; to: string }[]
  /** Absolute path to content, written before the run. */
  files: Record<string, string>
  agent: string
  /** The observational-memory plugin directory the session must load, or undefined for none. */
  expectedPlugin?: string
  steps: PlanStep[]
}

const SAFE = /^[a-z0-9][a-z0-9-]*$/

export function runIdOf(config: Configuration, version: string, scenario: string, run: number): string {
  if (!SAFE.test(version)) throw new Error(`version "${version}": use lower-case letters, digits and hyphens`)
  if (!SAFE.test(scenario)) throw new Error(`scenario "${scenario}": use lower-case letters, digits and hyphens`)
  if (!Number.isInteger(run) || run < 0) throw new Error(`run ${run}: use a whole number`)
  return `${scenario}.${config.replace('+', '-')}.${version}.r${run}`
}

export function planRun(input: PlanInput): Plan {
  const { config, scenario: s, pluginRoot } = input
  const runId = runIdOf(config, input.version, s.id, input.run)
  if (input.brief && (input.version === 'old' || input.version === 'new'))
    throw new Error(`--brief ${input.brief}: give the variant a version label of its own (such as new-brief), so its runs never mix with ${input.version}'s`)
  if (input.brief && !usesObservationalCompaction(config)) throw new Error(`--brief ${input.brief}: ${config} has no observational compaction to carry the brief`)
  const runDir = `${input.benchRoot.replace(/\/$/, '')}/${runId}`
  const projectDir = `${runDir}/project`
  const settingsPath = `${runDir}/settings.json`
  const statsDir = `${runDir}/stats`
  const recallDir = `${runDir}/recall-plugin`
  const expectedPlugin = config === 'builtin' ? undefined : config === 'builtin+recall' ? recallDir : pluginRoot.replace(/\/$/, '')
  const settings: Settings = {
    env: { CLAUDE_CODE_PLUGIN_DIRS: expectedPlugin ?? '', OM_STATS_DIR: statsDir, ...(input.brief ? { OM_BRIEF: input.brief } : {}) },
    permissions: { allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', ...s.commands.map((c) => `Bash(${c})`), ...(recallAvailable(config) ? [RECALL_TOOL] : [])] },
  }
  const claudeArgs = [
    ...['--model', MODEL, '--session-id', input.sessionId, '--settings', settingsPath, '--permission-mode', 'dontAsk'],
    ...(usesObservationalCompaction(config) && !recallAvailable(config) ? ['--disallowed-tools', RECALL_TOOL] : []),
  ]
  const copies =
    config === 'builtin+recall'
      ? [
          { from: input.recallPluginSource, to: recallDir },
          { from: `${pluginRoot}/hooks/recall.ts`, to: `${recallDir}/hooks/recall.ts` },
          { from: `${pluginRoot}/hooks/prompts.ts`, to: `${recallDir}/hooks/prompts.ts` },
        ]
      : []
  const files: Record<string, string> = Object.fromEntries(Object.entries(s.files).map(([p, text]) => [`${projectDir}/${p}`, text]))
  files[settingsPath] = JSON.stringify(settings, null, 2) + '\n'

  const agent = `bench-${input.sessionId.slice(0, 8)}` // herdr names are at most 32 characters; a run id can be longer
  const { pane, timeoutMs } = input
  const promptArgv = (text: string) => ['agent', 'prompt', agent, text, '--wait', '--timeout', String(timeoutMs)]
  const prompt = (text: string, purpose: string, stallOk = false): PlanStep => ({
    kind: 'herdr',
    argv: promptArgv(text),
    purpose,
    prompt: text,
    ...(stallOk ? { stallOk } : {}),
  })
  const steps: PlanStep[] = [
    { kind: 'herdr', argv: ['pane', 'run', pane, `cd '${projectDir}'`], purpose: 'enter the sandbox project' },
    {
      kind: 'herdr',
      argv: ['agent', 'start', agent, '--kind', 'claude', '--pane', pane, '--timeout', String(input.startTimeoutMs), '--', ...claudeArgs],
      purpose: 'start Claude Code with this configuration',
    },
  ]
  let compactions = 0
  s.steps.forEach((st, i) => {
    if ('prompt' in st) return steps.push(prompt(st.prompt, `scenario prompt ${i + 1}`))
    if ('grow' in st)
      return steps.push({
        kind: 'grow',
        argv: promptArgv(st.grow),
        prompt: st.grow,
        max: st.max,
        settleMs: input.settleMs,
        purpose: `growth prompt, each after a ${input.settleMs / 1000} s pause for background work (as a pausing user would), repeated until Claude Code compacts on its own (a new compact_boundary row in the transcript), at most ${st.max} times; after ${st.max} without one the run stops incomplete`,
      })
    compactions++
    steps.push({ kind: 'settle', ms: input.settleMs, purpose: 'let background work finish before compacting, as a pausing user would' })
    // Observational compaction can finish before herdr sees the agent working: a stalled wait is then not a failure.
    steps.push(prompt('/compact', `manual compaction ${compactions}, no instructions`, true))
  })
  steps.push(prompt(s.continuation, 'the continuation prompt the checks score'))
  steps.push({ kind: 'herdr', argv: ['pane', 'run', pane, '/exit'], purpose: 'end the session, so the plugin writes its stats and the pane returns to the shell' })
  steps.push({ kind: 'settle', ms: 5_000, purpose: 'let the session write its last rows and stats' })
  return { input, runId, runDir, projectDir, settingsPath, statsDir, settings, claudeArgs, copies, files, agent, ...(expectedPlugin ? { expectedPlugin } : {}), steps }
}

const quote = (s: string) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`)
export const shellLine = (argv: readonly string[]) => argv.map(quote).join(' ')

/** What the dry run prints, and the live run prints first: every command and prompt, and what the session should load. */
export function describePlan(plan: Plan): string {
  const { input } = plan
  const recall = recallAvailable(input.config)
  const loaded =
    input.config === 'builtin'
      ? 'no observational-memory plugin (built-in compaction)'
      : input.config === 'builtin+recall'
        ? `observational-memory from ${plan.expectedPlugin}: the recall-only eval plugin (om_recall alone, built-in compaction), with the recall of ${input.pluginRoot}`
        : `observational-memory from ${plan.expectedPlugin} (observational compaction${input.brief ? `, with OM_BRIEF=${input.brief}: every memory message carries the session brief` : ''})`
  const out = [
    `Run ${plan.runId}: configuration ${input.config}, plugin version ${input.version}, scenario ${input.scenario.id}, session ${input.sessionId}`,
    `Sandbox: ${plan.runDir}`,
    '',
    'The session should have loaded:',
    `- ${loaded}`,
    `- om_recall: ${recall ? `offered and allowed, as ${RECALL_TOOL}` : input.config === 'om' ? `not offered (--disallowed-tools ${RECALL_TOOL})` : 'not offered (no plugin registers it)'}`,
    `- model ${MODEL}; permission mode dontAsk; allowed: ${plan.settings.permissions.allow.join(', ')}`,
    `- no other observational-memory plugin: not the user's inline one`,
    `Checked before starting (zero tokens), from ${plan.projectDir}: claude --settings ${plan.settingsPath} plugin list --json`,
    'In the pane, /plugin (or /mcp for the om_recall server) shows the same.',
    '',
    'Files:',
    ...Object.keys(plan.files).map((p) => `- ${p}`),
    ...plan.copies.map((c) => `- copy ${c.from} -> ${c.to}`),
    '',
    'Steps:',
    ...plan.steps.map((st, i) => `${i + 1}. ${st.kind === 'settle' ? `wait ${st.ms / 1000} s` : `herdr ${shellLine(st.argv)}`}   # ${st.purpose}`),
    '',
    'Prompts, in order:',
    ...plan.steps.flatMap((st) => (st.kind === 'grow' ? [`- ${st.prompt} (1 to ${st.max} times)`] : st.kind === 'herdr' && st.prompt ? [`- ${st.prompt}`] : [])),
    '',
    input.scenario.ceilingUsd === undefined ? `Per-run ceiling: --ceiling-usd (default $${FIRST_RUN_CEILING_USD}) until a live run completes, then the worst completed run.` : `Per-run ceiling: $${input.scenario.ceilingUsd}, the scenario's own (its comment in tests/eval/scenarios.ts gives the expected cost), or the worst completed run when that is more.`,
    '',
    `If Claude Code asks whether to trust ${plan.projectDir}, answer it in the pane within ${input.startTimeoutMs / 1000} s.`,
  ]
  return out.join('\n') + '\n'
}

/** Problems with `claude plugin list --json` for the plan's settings: none when exactly the expected plugin loads, cleanly. */
export function checkPluginList(json: string, plan: Plan): string[] {
  let entries: { id?: string; enabled?: boolean; installPath?: string; errors?: unknown[] }[]
  try {
    entries = JSON.parse(json)
    if (!Array.isArray(entries)) throw new Error('not a list')
  } catch (error) {
    return [`claude plugin list did not print JSON (${error instanceof Error ? error.message : String(error)})`]
  }
  const trim = (p?: string) => (p ?? '').replace(/\/$/, '')
  const om = entries.filter((e) => e.enabled && String(e.id).startsWith('observational-memory@'))
  const problems: string[] = []
  if (!plan.expectedPlugin) {
    if (om.length) problems.push(`expected no observational-memory plugin, found ${om.map((e) => trim(e.installPath)).join(', ')}`)
  } else {
    if (om.length !== 1 || trim(om[0]!.installPath) !== plan.expectedPlugin)
      problems.push(`expected observational-memory from ${plan.expectedPlugin} alone, found ${om.map((e) => trim(e.installPath)).join(', ') || 'none'}`)
  }
  for (const e of om) if (e.errors?.length) problems.push(`${e.id} at ${trim(e.installPath)}: ${e.errors.map(String).join('; ')}`)
  return problems
}

export type Admission = { admit: boolean; spentUsd: number; reserveUsd: number; reason: string }

/**
 * Whether the budget admits one more live run: what the live runs so far cost, plus as much again as the worst
 * completed run (before any, `ceilingUsd`), or the scenario's own per-run ceiling when that is more, must stay within
 * `budgetUsd`. A live run that did not complete or has no total counts at the worst run's cost, or its own when
 * larger: what it spent is not known. Offline runs cost nothing.
 */
export function admitRun(records: readonly RunRecord[], budgetUsd: number, ceilingUsd = FIRST_RUN_CEILING_USD, scenarioCeilingUsd = 0): Admission {
  const live = records.filter((r) => r.mode === 'live')
  const total = (r: RunRecord) => (r.cost?.total.status === 'estimated' || r.cost?.total.status === 'measured' ? r.cost.total.value : undefined)
  const complete = live.filter((r) => !r.error && total(r) !== undefined).map((r) => total(r)!)
  const worst = complete.length ? Math.max(...complete) : ceilingUsd
  const reserve = Math.max(worst, scenarioCeilingUsd)
  const spent = live.reduce((t, r) => t + (!r.error && total(r) !== undefined ? total(r)! : Math.max(worst, total(r) ?? 0)), 0)
  const spentUsd = Math.round(spent * 1e6) / 1e6
  const admit = spentUsd + reserve <= budgetUsd
  const why = reserve > worst ? "the scenario's per-run ceiling" : complete.length ? 'the worst completed run' : 'the first-run ceiling'
  const reason = `${live.length} live run(s) so far, $${spentUsd.toFixed(4)}; reserving $${reserve.toFixed(4)} (${why}) against a $${budgetUsd} budget`
  return { admit, spentUsd, reserveUsd: reserve, reason }
}

/**
 * The autocompact threshold a run's session will have, which the run does not set: from the environment variable
 * (which overrides every other source), else the user's `autoCompactWindow`, else Claude Code's default for the model.
 */
export function autoCompactThreshold(userSettingsJson: string | undefined, envWindow: string | undefined): string {
  const head = 'Auto-compaction: the run sets no window; the session has'
  if (envWindow) return `Auto-compaction: the run sets no window, but CLAUDE_CODE_AUTO_COMPACT_WINDOW=${envWindow} is set in this environment: if the pane has it too, it overrides every setting.`
  let window: unknown
  try {
    window = userSettingsJson === undefined ? undefined : (JSON.parse(userSettingsJson) as { autoCompactWindow?: unknown }).autoCompactWindow
  } catch {
    return `${head} a threshold this script cannot tell: it cannot read ~/.claude/settings.json.`
  }
  if (window !== undefined) return `${head} autoCompactWindow ${String(window)} from ~/.claude/settings.json.`
  return `${head} Claude Code's default for the model (about 967k tokens for Sonnet 5): a growth cap far below that ends the run incomplete.`
}

const RECALL_ONLY_HOOKS = ['session.start', `tool.call{tool=${RECALL_TOOL}}`, `tool.describe{tool=${RECALL_TOOL}}`, 'classic.SessionStart', 'classic.Stop']

/** Problems with `claude plugin validate` of an assembled recall-only plugin: it must pass and handle om_recall alone. */
export function checkRecallOnly(validateOutput: string): string[] {
  const problems = /Validation passed/.test(validateOutput) ? [] : ['claude plugin validate did not pass']
  const hooks = [...validateOutput.matchAll(/^\s*❯ .* hooks: (.*)$/gm)].flatMap((m) => m[1]!.split(', ').map((h) => h.trim()))
  const extra = hooks.filter((h) => !RECALL_ONLY_HOOKS.includes(h))
  if (!hooks.includes(`tool.call{tool=${RECALL_TOOL}}`)) problems.push('it handles no om_recall call')
  if (extra.length) problems.push(`it handles more than om_recall: ${extra.join(', ')}`)
  return problems
}
