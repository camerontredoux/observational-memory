#!/usr/bin/env bun
// Drives one live continuation-quality run (issue #9) in a real, interactive Claude Code session in a herdr pane,
// then scores its transcript. Live runs spend model tokens (a claude.ai subscription's, priced token-equivalent):
// only the person or orchestrator running the benchmark starts them. Not typechecked by `tsc -p .` (Bun's Node APIs).
//
//   bun scripts/bench-live.ts list
//   bun scripts/bench-live.ts run --config om+recall --version new --scenario absent-fact --run 1 --pane w1:p2 \
//     --budget-usd 20 [--dry-run] [--plugin-root DIR] [--results FILE] [--timeout-ms 600000] [--settle-ms 30000]
//     [--ceiling-usd 1] [--start-timeout-ms 60000] [--brief always]
//   bun scripts/bench-live.ts score --run-dir /tmp/om-bench/<runId> [--append] [--results FILE]
//   bun scripts/bench-live.ts report [--results FILE] [--versions old,new] [--out FILE]
//
// run: prints the plan (every herdr command and prompt, what the session should have loaded, the per-run ceiling and
// the autocompact threshold the session will have, which the run never sets), then, unless --dry-run:
//   1. refuses to start when the results JSONL's live runs plus the worst completed run's cost (before any, the
//      --ceiling-usd, default $1), or the scenario's own per-run ceiling when that is more, would pass --budget-usd;
//   2. writes the scenario's synthetic files to /tmp/om-bench/<runId>/project and the session's settings beside it
//      (and, for builtin+recall, assembles the recall-only plugin from tests/eval/recall-plugin and the version's
//      hooks/recall.ts and hooks/prompts.ts); an existing run directory is never overwritten: use another --run;
//   3. checks, with `claude --settings <file> plugin list --json` (no tokens), that exactly the configuration's plugin
//      loads, and refuses to start otherwise;
//   4. in the pane (which must exist and be at a shell prompt; this script creates, splits and closes none): cd into
//      the project, `herdr agent start` Claude Code (--model sonnet, the settings, dontAsk permissions), each prompt
//      with `herdr agent prompt --wait`, a pause and a manual `/compact` (no instructions) at each compaction point
//      (recall-required instead sends its growth prompt again after each turn until the session's transcript has a
//      new compact_boundary row, at most the scenario's cap: without one the run stops incomplete), the continuation
//      prompt, then `/exit`, which leaves the pane at its shell for the next run;
//   5. finds the session's transcript under ~/.claude/projects (and any file it continued in), reads the plugin's
//      stats file for the Observer's cost, scores the run, and appends its record, labelled live, to the results JSONL.
// A failed step stops the run, leaves the session as it is for inspection, and records the run as incomplete: the
// budget counts it at the worst run's cost. Isolation (why --settings, not --plugin-dir or --bare) is documented in
// tests/eval/live.ts. Claude Code may ask whether to trust the new project directory: answer it in the pane.
//
// Plugin versions: new is the main checkout; old is the c6c86a3 worktree at <main>/.worktrees/bench-old, which the
// orchestrator creates; --plugin-root names any other. The results default to /tmp/om-bench/results.jsonl.
//
// Overlapping memory protections (the observations, the verbatim user messages, the skills): the report's "What
// carried each fact" table measures, per compaction, which parts of the memory message held each scenario fact, with
// every protection in place. To weigh removing one, build that variant in its own worktree and run it as another
// version (--version no-user-messages --plugin-root <worktree>): the report sets it beside new, run for run. Nothing
// removes a protection by default.
//
// The always-on brief (OM_BRIEF=always, off by default): `--brief always` puts it in the session's settings, for om or
// om+recall under a version label of its own (--version new-brief; the plugin root defaults to the main checkout), so
// the report sets the variant beside new rather than mixing its runs in. The run's meta.json records it.
//
// score: rescores a run directory from its meta.json (after a run that stopped before scoring, or a scorer change).
// report: the markdown report of the results: per plugin version and configuration n, mean and spread; live and
// offline apart; every live cell not yet run, for the versions given.
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { makeRecord, parseTranscript, renderReport, runCost } from '../tests/eval/bench'
import type { RunMeta, RunRecord } from '../tests/eval/bench'
import { admitRun, autoCompactThreshold, checkPluginList, checkRecallOnly, describePlan, MODEL, planRun } from '../tests/eval/live'
import type { Plan } from '../tests/eval/live'
import { CONFIGURATIONS } from '../tests/eval/runner'
import type { Configuration } from '../tests/eval/runner'
import { growStep, SCENARIOS, scenarioById } from '../tests/eval/scenarios'
import { fail, findTranscripts, mainCheckout, num, options, send, str } from './cli'

const BENCH_ROOT = '/tmp/om-bench'
const HERE = resolve(import.meta.dir, '..')

// The checkout's commit, marked `-dirty` when it has uncommitted changes: what a version label stood for in this run.
function commitOf(root: string): string {
  const head = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' })
  if (head.status !== 0) return 'unknown (not a git checkout)'
  const dirty = spawnSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).stdout.trim()
  return `${head.stdout.trim()}${dirty ? '-dirty' : ''}`
}

function readRecords(path: string): RunRecord[] {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split('\n')
    .flatMap((line, i) => {
      if (!line.trim()) return []
      try {
        return [JSON.parse(line) as RunRecord]
      } catch {
        console.error(`${path}:${i + 1}: not JSON, skipped`)
        return []
      }
    })
}

function score(meta: RunMeta, error?: string): RunRecord {
  const transcripts = meta.sessionId ? findTranscripts(meta.sessionId) : []
  const stats = meta.stats && existsSync(meta.stats) ? readFileSync(meta.stats, 'utf8') : undefined
  const { stats: statsPath, ...rest } = meta
  const m: RunMeta = { ...rest, transcripts, ...(stats === undefined ? {} : { stats: statsPath }) }
  if (!transcripts.length) return { ...m, error: error ?? `no transcript for session ${meta.sessionId} under ~/.claude/projects` }
  const t = readTranscript(transcripts)
  if (error) return { ...m, cost: runCost(meta.configuration, t, stats), error }
  return makeRecord(m, t, stats)
}

function summary(r: RunRecord, results: string) {
  const s = r.score
  const lines = [`${r.runId}: ${r.error ? `incomplete: ${r.error}` : s?.valid ? (s.taskSuccess ? 'task success' : 'task failed') : `invalid: ${s?.invalid.join('; ')}`}`]
  if (r.cost) lines.push(`cost: ${r.cost.total.status === 'unavailable' ? `unavailable (${r.cost.total.reason})` : `$${r.cost.total.value.toFixed(4)} (${r.cost.total.status})`}`)
  for (const c of s?.checks ?? []) if (c.outcome === 'fail') lines.push(`failed ${c.id} [${c.category}]: ${c.evidence}`)
  lines.push(`transcripts: ${r.transcripts.join(', ') || 'none'}`, `recorded in ${results}`)
  return lines.join('\n')
}

async function run(o: Record<string, string | true>) {
  const config = str(o, 'config') as Configuration
  if (!CONFIGURATIONS.includes(config)) fail(`--config: one of ${CONFIGURATIONS.join(', ')}`)
  const version = str(o, 'version') ?? fail('--version: old, new, or a label with --plugin-root')
  const scenario = scenarioById(str(o, 'scenario') ?? '') ?? fail(`--scenario: one of ${SCENARIOS.map((s) => s.id).join(', ')}`)
  const runNo = num(o, 'run') ?? fail('--run: the run number')
  const pane = str(o, 'pane') ?? fail('--pane: an existing herdr pane at a shell prompt (herdr pane list)')
  const dry = o['dry-run'] === true
  const briefFlag = o['brief']
  if (briefFlag !== undefined && briefFlag !== 'always') fail('--brief: always, or leave it out')
  const brief = briefFlag === 'always' ? ('always' as const) : undefined
  const budget = num(o, 'budget-usd') ?? (dry ? undefined : fail('--budget-usd: the total the live runs may cost'))
  const results = str(o, 'results') ?? `${BENCH_ROOT}/results.jsonl`
  const main = mainCheckout()
  const pluginRoot = resolve(str(o, 'plugin-root') ?? (version === 'new' || brief ? main : version === 'old' ? `${main}/.worktrees/bench-old` : fail('--plugin-root: needed for a version other than old or new')))
  const plan: Plan = planRun({
    config,
    version,
    scenario,
    run: runNo,
    pluginRoot,
    recallPluginSource: `${HERE}/tests/eval/recall-plugin`,
    benchRoot: BENCH_ROOT,
    pane,
    sessionId: randomUUID(),
    timeoutMs: num(o, 'timeout-ms', 600_000)!,
    settleMs: num(o, 'settle-ms', 30_000)!,
    startTimeoutMs: num(o, 'start-timeout-ms', 60_000)!,
    ...(brief ? { brief } : {}),
  })
  console.log(describePlan(plan))
  const userSettings = `${process.env.HOME}/.claude/settings.json`
  console.log(autoCompactThreshold(existsSync(userSettings) ? readFileSync(userSettings, 'utf8') : undefined, process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW))
  if (config !== 'builtin' && !existsSync(`${pluginRoot}/hooks/register.ts`)) console.log(`WARNING: ${pluginRoot}/hooks/register.ts does not exist`)
  const admission = admitRun(readRecords(results), budget ?? Infinity, num(o, 'ceiling-usd'), scenario.ceilingUsd)
  console.log(budget === undefined ? `Budget: none given (dry run); ${admission.reason.replace(/ against .*/, '')}.` : `Budget: ${admission.reason}: ${admission.admit ? 'admitted' : 'refused'}.`)
  if (dry) return console.log('Dry run: nothing written, herdr not called.')
  if (!admission.admit) fail('Not starting: the run could take the total past --budget-usd.')
  if (existsSync(plan.runDir)) fail(`${plan.runDir} exists: a run is never overwritten; use another --run`)

  for (const [path, text] of Object.entries(plan.files)) (mkdirSync(dirname(path), { recursive: true }), writeFileSync(path, text))
  for (const c of plan.copies) cpSync(c.from, c.to, { recursive: true })
  if (plan.copies.length) {
    const v = spawnSync('claude', ['plugin', 'validate', plan.copies[0]!.to], { encoding: 'utf8' })
    const bad = checkRecallOnly(`${v.stdout}${v.stderr}`)
    if (bad.length) fail(`Not starting: the assembled recall-only plugin at ${plan.copies[0]!.to}:\n- ${bad.join('\n- ')}`)
    console.log('Recall-only check: the assembled plugin handles om_recall alone.')
  }
  mkdirSync(plan.statsDir, { recursive: true })
  const list = spawnSync('claude', ['--settings', plan.settingsPath, 'plugin', 'list', '--json'], { cwd: plan.projectDir, encoding: 'utf8' })
  const problems = checkPluginList(list.stdout, plan)
  if (problems.length) fail(`Not starting: the session would not load its configuration's plugin alone:\n- ${problems.join('\n- ')}`)
  console.log('Plugin check: the settings load exactly the expected plugin.')

  const meta: RunMeta = {
    runId: plan.runId,
    mode: 'live',
    configuration: config,
    version,
    scenario: scenario.id,
    run: runNo,
    startedAt: new Date().toISOString(),
    model: MODEL,
    sessionId: plan.input.sessionId,
    transcripts: [],
    stats: `${plan.statsDir}/${plan.input.sessionId}.json`,
    pluginRoot,
    pluginCommit: commitOf(pluginRoot),
    ...(brief ? { brief } : {}),
    admission: { budgetUsd: budget!, spentUsd: admission.spentUsd, reserveUsd: admission.reserveUsd },
  }
  writeFileSync(`${plan.runDir}/meta.json`, JSON.stringify(meta, null, 2) + '\n')
  const log = `${plan.runDir}/steps.log`
  let error: string | undefined
  for (const [i, st] of plan.steps.entries()) {
    const head = `${i + 1}/${plan.steps.length} ${st.purpose}`
    console.log(head)
    if (st.kind === 'settle') {
      await Bun.sleep(st.ms)
      continue
    }
    if (st.kind === 'grow') {
      // Claude Code compacts on its own when the context passes its threshold: send the prompt until a new
      // compact_boundary row shows in the transcript (the turn that compacted has then ended), at most st.max times.
      // Each waits first, as the manual path does before /compact, so the plugin's background work can finish.
      const before = compactionsIn(plan.input.sessionId)
      let now = before
      let sent = 0
      while (!error && sent < st.max && now === before) {
        sent++
        console.log(`  growth prompt ${sent}/${st.max}`)
        await Bun.sleep(st.settleMs)
        const failed = await send(st, `${head}: growth prompt ${sent}/${st.max}`, pane!, log)
        if (failed) error = `step ${i + 1} (growth prompt ${sent}) failed: ${failed}`
        now = compactionsIn(plan.input.sessionId)
      }
      if (!error && now === before) error = `step ${i + 1}: no compaction after ${st.max} growth prompts: the session's autocompact threshold is above what they reach`
      if (!error) appendFileSync(log, `the session compacted after ${sent} growth prompt(s)\n\n`)
    } else {
      const failed = await send(st, head, pane!, log)
      if (failed) error = `step ${i + 1} (${st.purpose}) failed: ${failed}`
    }
    if (error) {
      console.error(`${error}\nThe session is left as it is in pane ${pane}; the steps are logged in ${log}.`)
      break
    }
  }
  const record = score(meta, error)
  appendFileSync(results, JSON.stringify(record) + '\n')
  writeFileSync(`${plan.runDir}/record.json`, JSON.stringify(record, null, 2) + '\n')
  console.log(summary(record, results))
  if (error) process.exit(1)
}

function readTranscript(files: readonly string[]) {
  return parseTranscript(files.map((p) => readFileSync(p, 'utf8')).join('\n'))
}

// How many compactions the session's transcript (and any file it continued in) records so far.
function compactionsIn(sessionId: string): number {
  return readTranscript(findTranscripts(sessionId)).entries.filter((e) => e.kind === 'boundary').length
}

function rescore(o: Record<string, string | true>) {
  const dir = str(o, 'run-dir') ?? fail('--run-dir: a run directory under /tmp/om-bench')
  const meta = JSON.parse(readFileSync(`${dir}/meta.json`, 'utf8')) as RunMeta
  const record = score(meta)
  const results = str(o, 'results') ?? `${BENCH_ROOT}/results.jsonl`
  if (o.append === true) appendFileSync(results, JSON.stringify(record) + '\n')
  console.log(o.append === true ? summary(record, results) : JSON.stringify(record, null, 2))
}

function report(o: Record<string, string | true>) {
  const records = readRecords(str(o, 'results') ?? `${BENCH_ROOT}/results.jsonl`)
  const versions = str(o, 'versions')?.split(',')
  const text = renderReport(records, versions ? { versions } : {})
  const out = str(o, 'out')
  if (out) writeFileSync(out, text)
  else process.stdout.write(text)
}

const [command = 'run', ...rest] = process.argv.slice(2)
const o = options(rest)
if (command === 'list') {
  console.log(`Configurations: ${CONFIGURATIONS.join(', ')}`)
  for (const s of SCENARIOS) {
    const grow = growStep(s)
    console.log(`${s.id}: ${s.title} (${grow ? `compacts on its own, within ${grow.max} growth prompts` : `${s.steps.filter((x) => 'compact' in x).length} compaction(s)`})`)
  }
} else if (command === 'run') await run(o)
else if (command === 'score') rescore(o)
else if (command === 'report') report(o)
else fail(`unknown command ${command}: list, run, score or report`)
