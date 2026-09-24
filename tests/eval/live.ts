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
}

export type PlanStep =
  | { kind: 'herdr'; argv: string[]; purpose: string; prompt?: string; stallOk?: boolean }
  | { kind: 'settle'; ms: number; purpose: string }

/** The session's `--settings` file. */
export type Settings = { env: { CLAUDE_CODE_PLUGIN_DIRS: string; OM_STATS_DIR: string }; permissions: { allow: string[] } }

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
  const runDir = `${input.benchRoot.replace(/\/$/, '')}/${runId}`
  const projectDir = `${runDir}/project`
  const settingsPath = `${runDir}/settings.json`
  const statsDir = `${runDir}/stats`
  const recallDir = `${runDir}/recall-plugin`
  const expectedPlugin = config === 'builtin' ? undefined : config === 'builtin+recall' ? recallDir : pluginRoot.replace(/\/$/, '')
  const settings: Settings = {
    env: { CLAUDE_CODE_PLUGIN_DIRS: expectedPlugin ?? '', OM_STATS_DIR: statsDir },
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
  const prompt = (text: string, purpose: string, stallOk = false): PlanStep => ({
    kind: 'herdr',
    argv: ['agent', 'prompt', agent, text, '--wait', '--timeout', String(timeoutMs)],
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
        : `observational-memory from ${plan.expectedPlugin} (observational compaction)`
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
    ...plan.steps.map((st, i) => `${i + 1}. ${st.kind === 'herdr' ? `herdr ${shellLine(st.argv)}` : `wait ${st.ms / 1000} s`}   # ${st.purpose}`),
    '',
    'Prompts, in order:',
    ...plan.steps.flatMap((st) => (st.kind === 'herdr' && st.prompt ? [`- ${st.prompt}`] : [])),
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
 * completed run (before any, `ceilingUsd`), must stay within `budgetUsd`. A live run that did not complete or has no
 * total counts at the worst run's cost, or its own when larger: what it spent is not known. Offline runs cost nothing.
 */
export function admitRun(records: readonly RunRecord[], budgetUsd: number, ceilingUsd = FIRST_RUN_CEILING_USD): Admission {
  const live = records.filter((r) => r.mode === 'live')
  const total = (r: RunRecord) => (r.cost?.total.status === 'estimated' || r.cost?.total.status === 'measured' ? r.cost.total.value : undefined)
  const complete = live.filter((r) => !r.error && total(r) !== undefined).map((r) => total(r)!)
  const worst = complete.length ? Math.max(...complete) : ceilingUsd
  const spent = live.reduce((t, r) => t + (!r.error && total(r) !== undefined ? total(r)! : Math.max(worst, total(r) ?? 0)), 0)
  const spentUsd = Math.round(spent * 1e6) / 1e6
  const admit = spentUsd + worst <= budgetUsd
  const reason = `${live.length} live run(s) so far, $${spentUsd.toFixed(4)}; reserving $${worst.toFixed(4)} (${complete.length ? 'the worst completed run' : 'the first-run ceiling'}) against a $${budgetUsd} budget`
  return { admit, spentUsd, reserveUsd: worst, reason }
}

const RECALL_ONLY_HOOKS = ['session.start', `tool.call{tool=${RECALL_TOOL}}`, 'classic.SessionStart', 'classic.Stop']

/** Problems with `claude plugin validate` of an assembled recall-only plugin: it must pass and handle om_recall alone. */
export function checkRecallOnly(validateOutput: string): string[] {
  const problems = /Validation passed/.test(validateOutput) ? [] : ['claude plugin validate did not pass']
  const hooks = [...validateOutput.matchAll(/^\s*❯ .* hooks: (.*)$/gm)].flatMap((m) => m[1]!.split(', ').map((h) => h.trim()))
  const extra = hooks.filter((h) => !RECALL_ONLY_HOOKS.includes(h))
  if (!hooks.includes(`tool.call{tool=${RECALL_TOOL}}`)) problems.push('it handles no om_recall call')
  if (extra.length) problems.push(`it handles more than om_recall: ${extra.join(', ')}`)
  return problems
}
