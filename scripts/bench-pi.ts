#!/usr/bin/env bun
// Drives one live continuation-quality run in pi (https://pi.dev) with pi's own observational-memory extension, and
// scores it with the same scenarios and checks as scripts/bench-live.ts, so that implementation can be compared with
// this plugin. Live runs spend model tokens: only the person running the benchmark starts them. Not typechecked by
// `tsc -p .` (Bun's Node APIs).
//
//   bun scripts/bench-pi.ts run --scenario absent-fact --run 1 --budget-usd 20 [--dry-run] [--version pi-om]
//     [--results FILE] [--model openai-codex/gpt-5.6-sol] [--timeout-ms 600000] [--settle-ms 30000] [--ceiling-usd 1]
//   bun scripts/bench-pi.ts score --run-dir /tmp/om-bench/<runId> [--append] [--results FILE]
//
// The report is bench-live.ts's: `bun scripts/bench-live.ts report --results FILE --versions v130,pi-om`.
//
// run: prints the plan, then, unless --dry-run:
//   1. refuses to start when the results JSONL's live runs plus the reserve would pass --budget-usd (live.ts admitRun);
//   2. writes the scenario's files (tests/eval/pi.ts piFiles) to /tmp/om-bench/<runId>/project, and pins the
//      extension's settings in the project's .pi/settings.json: the `observational-memory` block of
//      ~/.pi/agent/settings.json as it is now, with the extension on, and, in a scenario that compacts on request,
//      a 6,000-token kept tail (this plugin's) in place of pi's 20,000;
//   3. starts `pi --mode rpc` in the project with the model, no discovered extensions, skills, prompt templates,
//      context files (AGENTS.md, CLAUDE.md) or APPEND_SYSTEM.md,
//      only the extension, the bench guard (tests/eval/pi-guard.ts: bash runs only the scenario's commands) and pi's
//      built-in tools plus om_recall; checks, with zero-token RPC commands, that the model is the one asked for and
//      that the extension's commands are the only extension commands loaded;
//   4. sends each prompt and waits until the session is idle (not streaming, not compacting, nothing queued, for 10 s
//      in a row); at each compaction point waits --settle-ms and sends RPC `compact` (pi's /compact, which the
//      extension's session_before_compact hook answers); a `grow` step sends its prompt again, each after the pause,
//      until the session file has a new compaction (the extension compacts on its own at its compactAtContextTokens);
//   5. converts the session file (tests/eval/pi.ts), scores it with bench.ts, and appends the record, labelled live,
//      configuration om+recall, to the results JSONL (default /tmp/om-bench/pi-results.jsonl).
// A failed step stops the run and records it as incomplete; the budget counts it at the worst run's cost.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { makeRecord, parseTranscript, runCost } from '../tests/eval/bench'
import type { RunMeta, RunRecord } from '../tests/eval/bench'
import { admitRun, runIdOf } from '../tests/eval/live'
import { convertPiSession, piFiles } from '../tests/eval/pi'
import { growStep, SCENARIOS, scenarioById } from '../tests/eval/scenarios'
import { fail, num, options, str } from './cli'

const HERE = resolve(import.meta.dir, '..')
const BENCH_ROOT = '/tmp/om-bench'
const AGENT_DIR = `${process.env.HOME}/.pi/agent`
const EXTENSION = `${AGENT_DIR}/local-packages/pi-global-extensions/pi-observational-memory-vcc`
const GUARD = `${HERE}/tests/eval/pi-guard.ts`
const TOOLS = 'read,bash,edit,write,grep,find,ls,om_recall'
const EXPECTED_COMMANDS = ['om', 'om:status', 'om:compact', 'om:consolidate']

function readRecords(path: string): RunRecord[] {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as RunRecord)
}

function commitOf(dir: string): string {
  const r = Bun.spawnSync(['git', '-C', dir, 'rev-parse', 'HEAD'])
  const dirty = Bun.spawnSync(['git', '-C', dir, 'status', '--porcelain', '--', '.']).stdout.toString().trim()
  return `${r.stdout.toString().trim()}${dirty ? '-dirty' : ''}`
}

type PiMeta = RunMeta & { piSessionFile?: string; compactionMs?: (number | undefined)[]; piSettings?: unknown; piVersion?: string }

function score(meta: PiMeta, error?: string): RunRecord {
  const file = meta.piSessionFile
  const s = scenarioById(meta.scenario)!
  if (!file || !existsSync(file)) return { ...meta, error: error ?? 'no pi session file' }
  const { jsonl, stats } = convertPiSession(readFileSync(file, 'utf8'), growStep(s) ? 'auto' : 'manual', meta.compactionMs)
  writeFileSync(`${BENCH_ROOT}/${meta.runId}/transcript.claude.jsonl`, jsonl)
  const t = parseTranscript(jsonl)
  const m: RunMeta = { ...meta, transcripts: [file] }
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

// One pi process in RPC mode: commands by id, and every event line logged.
class Rpc {
  private proc
  private waiting = new Map<string, (r: any) => void>()
  private next = 0
  private buffer = ''
  exited = false
  constructor(args: string[], cwd: string, env: Record<string, string>, private log: string) {
    this.proc = spawn('pi', args, { cwd, env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] })
    this.proc.stdout.on('data', (d: Buffer) => {
      this.buffer += d.toString()
      let i: number
      while ((i = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, i)
        this.buffer = this.buffer.slice(i + 1)
        let ev: any
        try {
          ev = JSON.parse(line)
        } catch {
          continue
        }
        if (ev.type === 'response' && this.waiting.has(ev.id)) {
          this.waiting.get(ev.id)!(ev)
          this.waiting.delete(ev.id)
        }
        // Keep the log small: skip the streaming deltas.
        if (!/_update$|_delta$/.test(ev.type)) appendFileSync(this.log, `${new Date().toISOString()} ${line.slice(0, 2000)}\n`)
      }
    })
    this.proc.stderr.on('data', (d: Buffer) => appendFileSync(this.log, `stderr ${d}`))
    this.proc.on('exit', () => (this.exited = true))
  }
  send(command: Record<string, unknown>, timeoutMs = 60_000): Promise<any> {
    const id = `b${++this.next}`
    return new Promise((ok, no) => {
      const t = setTimeout(() => (this.waiting.delete(id), no(new Error(`${command.type}: no response in ${timeoutMs} ms`))), timeoutMs)
      this.waiting.set(id, (r) => (clearTimeout(t), ok(r)))
      this.proc.stdin.write(JSON.stringify({ ...command, id }) + '\n')
    })
  }
  /** Until the session has been idle (not streaming, not compacting, nothing queued) for `quietMs` in a row. */
  async idle(timeoutMs: number, quietMs = 10_000): Promise<void> {
    const end = Date.now() + timeoutMs
    let since = 0
    while (Date.now() < end) {
      if (this.exited) throw new Error('pi exited')
      const s = (await this.send({ type: 'get_state' })).data
      const busy = s.isStreaming || s.isCompacting || s.pendingMessageCount > 0
      if (busy) since = 0
      else if (!since) since = Date.now()
      else if (Date.now() - since >= quietMs) return
      await Bun.sleep(1_000)
    }
    throw new Error(`the session was not idle within ${timeoutMs} ms`)
  }
  stop() {
    this.proc.stdin.end()
    setTimeout(() => this.proc.kill(), 10_000).unref()
  }
}

const compactionsIn = (file: string | undefined) =>
  file && existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('"type":"compaction"')).length : 0

async function run(o: Record<string, string | true>) {
  const version = str(o, 'version') ?? 'pi-om'
  const scenario = scenarioById(str(o, 'scenario') ?? '') ?? fail(`--scenario: one of ${SCENARIOS.map((s) => s.id).join(', ')}`)
  const runNo = num(o, 'run') ?? fail('--run: the run number')
  const dry = o['dry-run'] === true
  const budget = num(o, 'budget-usd') ?? (dry ? undefined : fail('--budget-usd: the total the live runs may cost'))
  const results = str(o, 'results') ?? `${BENCH_ROOT}/pi-results.jsonl`
  const model = str(o, 'model') ?? 'openai-codex/gpt-5.6-sol'
  const timeoutMs = num(o, 'timeout-ms', 600_000)!
  const settleMs = num(o, 'settle-ms', 30_000)!
  const runId = runIdOf('om+recall', version, scenario.id, runNo)
  const runDir = `${BENCH_ROOT}/${runId}`
  const projectDir = `${runDir}/project`
  const globalOm = JSON.parse(readFileSync(`${AGENT_DIR}/settings.json`, 'utf8'))['observational-memory'] ?? {}
  // pi keeps the newest 20,000 tokens (the extension up to 25,000), more than a scenario that compacts on request
  // holds, so there it would compact nothing. Those runs keep this plugin's raw tail instead (KEEP_RAW_TOKENS in
  // hooks/register.ts); a scenario that grows to the extension's own threshold keeps pi's defaults.
  const TAIL = 6_000
  const small = !growStep(scenario)
  const om = { ...globalOm, defaultEnabled: true, ...(small ? { tailTokens: TAIL, vcc: { ...globalOm.vcc, maxTailTokens: TAIL } } : {}) }
  const piSettings = { 'observational-memory': om, ...(small ? { compaction: { keepRecentTokens: TAIL } } : {}) }
  const args = ['--mode', 'rpc', '--model', model, '--no-extensions', '-e', `${EXTENSION}/src/index.ts`, '-e', GUARD, '--no-skills', '--no-prompt-templates', '--no-context-files', '--append-system-prompt', `${runDir}/append-system.md`, '--tools', TOOLS, '--session-dir', `${runDir}/sessions`]
  const env = { OM_BENCH_BASH: JSON.stringify(scenario.commands) }

  const grow = growStep(scenario)
  console.log(
    [
      `Run ${runId}: pi with its observational-memory extension (${EXTENSION}, ${commitOf(EXTENSION)}), scenario ${scenario.id}`,
      `Sandbox: ${runDir}`,
      `pi ${args.join(' ')}   # in ${projectDir}, OM_BENCH_BASH=${env.OM_BENCH_BASH}`,
      `Extension settings (.pi/settings.json): ${JSON.stringify(piSettings)}`,
      `Compaction: ${grow ? `the extension's own, at compactAtContextTokens (${globalOm.compactAtContextTokens ?? 'its default, 150000'}), up to ${grow.max} growth prompts` : `RPC compact after a ${settleMs / 1000} s pause, ${scenario.steps.filter((x) => 'compact' in x).length} time(s)`}`,
      'Prompts, in order:',
      ...scenario.steps.flatMap((st) => ('prompt' in st ? [`- ${st.prompt}`] : 'grow' in st ? [`- ${st.grow} (1 to ${st.max} times)`] : ['- (compact)'])),
      `- ${scenario.continuation}`,
    ].join('\n'),
  )
  const admission = admitRun(readRecords(results), budget ?? Infinity, num(o, 'ceiling-usd'), scenario.ceilingUsd)
  console.log(budget === undefined ? `Budget: none given (dry run); ${admission.reason.replace(/ against .*/, '')}.` : `Budget: ${admission.reason}: ${admission.admit ? 'admitted' : 'refused'}.`)
  if (dry) return console.log('Dry run: nothing written, pi not started.')
  if (!admission.admit) fail('Not starting: the run could take the total past --budget-usd.')
  if (existsSync(runDir)) fail(`${runDir} exists: a run is never overwritten; use another --run`)

  for (const [p, text] of Object.entries(piFiles(scenario))) (mkdirSync(dirname(`${projectDir}/${p}`), { recursive: true }), writeFileSync(`${projectDir}/${p}`, text))
  mkdirSync(`${projectDir}/.pi`, { recursive: true })
  // Empty: in place of the user's ~/.pi/agent/APPEND_SYSTEM.md, which pi loads unless given one.
  writeFileSync(`${runDir}/append-system.md`, '')
  writeFileSync(`${projectDir}/.pi/settings.json`, JSON.stringify(piSettings, null, 2) + '\n')
  const log = `${runDir}/rpc.log`
  const pi = new Rpc(args, projectDir, env, log)

  const meta: PiMeta = {
    runId,
    mode: 'live',
    configuration: 'om+recall',
    version,
    scenario: scenario.id,
    run: runNo,
    startedAt: new Date().toISOString(),
    model,
    transcripts: [],
    pluginRoot: EXTENSION,
    pluginCommit: commitOf(EXTENSION),
    piSettings,
    piVersion: Bun.spawnSync(['pi', '--version']).stdout.toString().trim(),
    compactionMs: [],
    admission: { budgetUsd: budget!, spentUsd: admission.spentUsd, reserveUsd: admission.reserveUsd },
  }
  let error: string | undefined
  try {
    const state = (await pi.send({ type: 'get_state' })).data
    meta.piSessionFile = state.sessionFile
    const commands = ((await pi.send({ type: 'get_commands' })).data?.commands ?? []) as { name: string; source: string; sourceInfo?: { source?: string } }[]
    // pi's own built-in extensions (such as llama.cpp's /llama) are inline: they add commands, not tools.
    const ext = commands.filter((c) => c.source === 'extension' && c.sourceInfo?.source !== 'inline').map((c) => c.name)
    const problems = [
      ...(`${state.model?.provider}/${state.model?.id}` === model ? [] : [`model ${state.model?.provider}/${state.model?.id}, not ${model}`]),
      ...(ext.sort().join(',') === [...EXPECTED_COMMANDS].sort().join(',') ? [] : [`extension commands ${ext.join(', ') || 'none'}, not ${EXPECTED_COMMANDS.join(', ')}`]),
      ...commands.filter((c) => c.source !== 'extension').map((c) => `unexpected ${c.source} command ${c.name}`),
    ]
    if (problems.length) throw new Error(`the session would not run the configuration alone:\n- ${problems.join('\n- ')}`)
    console.log(`Checked: ${model}, thinking ${state.thinkingLevel}; extension commands ${ext.join(', ')}; session ${state.sessionFile}`)
    writeFileSync(`${runDir}/meta.json`, JSON.stringify(meta, null, 2) + '\n')

    const prompt = async (text: string) => {
      const r = await pi.send({ type: 'prompt', message: text })
      if (!r.success) throw new Error(`prompt refused: ${r.error}`)
      await pi.idle(timeoutMs)
    }
    for (const [i, st] of scenario.steps.entries()) {
      console.log(`step ${i + 1}/${scenario.steps.length}`)
      if ('prompt' in st) await prompt(st.prompt)
      else if ('compact' in st) {
        await Bun.sleep(settleMs)
        const t0 = Date.now()
        const r = await pi.send({ type: 'compact' }, timeoutMs)
        if (!r.success) throw new Error(`compact failed: ${r.error}`)
        meta.compactionMs!.push(Date.now() - t0)
        await pi.idle(timeoutMs, 3_000)
      } else {
        const before = compactionsIn(meta.piSessionFile)
        let sent = 0
        while (sent < st.max && compactionsIn(meta.piSessionFile) === before) {
          sent++
          console.log(`  growth prompt ${sent}/${st.max}`)
          await Bun.sleep(settleMs)
          await prompt(st.grow)
        }
        if (compactionsIn(meta.piSessionFile) === before) throw new Error(`no compaction after ${st.max} growth prompts`)
        meta.compactionMs!.push(undefined)
        console.log(`  the session compacted after ${sent} growth prompt(s)`)
      }
    }
    console.log('continuation')
    await prompt(scenario.continuation)
    // Observers still running write their cost when they finish.
    await Bun.sleep(15_000)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    console.error(`${error}\nThe RPC log is ${log}.`)
  }
  pi.stop()
  writeFileSync(`${runDir}/meta.json`, JSON.stringify(meta, null, 2) + '\n')
  const record = score(meta, error)
  appendFileSync(results, JSON.stringify(record) + '\n')
  writeFileSync(`${runDir}/record.json`, JSON.stringify(record, null, 2) + '\n')
  console.log(summary(record, results))
  process.exit(error ? 1 : 0)
}

function rescore(o: Record<string, string | true>) {
  const dir = str(o, 'run-dir') ?? fail('--run-dir: a run directory under /tmp/om-bench')
  const record = score(JSON.parse(readFileSync(`${dir}/meta.json`, 'utf8')) as PiMeta)
  const results = str(o, 'results') ?? `${BENCH_ROOT}/pi-results.jsonl`
  if (o.append === true) appendFileSync(results, JSON.stringify(record) + '\n')
  console.log(o.append === true ? summary(record, results) : JSON.stringify(record, null, 2))
}

const [command = 'run', ...rest] = process.argv.slice(2)
const o = options(rest)
if (command === 'run') await run(o)
else if (command === 'score') rescore(o)
else fail(`unknown command ${command}: run or score`)
