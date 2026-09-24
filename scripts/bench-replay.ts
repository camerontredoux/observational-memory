#!/usr/bin/env bun
// Retention over many real compactions (issue #13): chains each configuration's compaction through a long real
// transcript at the session's own compaction points, scores what every compacted context still holds, and writes the
// report. The scoring, the plans and the report are `tests/eval/replay.ts`; this script reads and writes files, runs
// the om replay and drives the built-in chain. Not typechecked by `tsc -p .` (Bun's Node APIs).
//
//   bun scripts/bench-replay.ts dry-run [--transcripts om-orchestration,om-v04,firstmate-11] [--dir DIR]
//   bun scripts/bench-replay.ts om --transcript NAME [--pi stub|strict|live] [--max-calls N] [--boundaries N]
//     [--src DIR] [--out DIR]
//   bun scripts/bench-replay.ts builtin --transcript NAME --pane w1:p2 --budget-usd N [--live] [--out DIR]
//   bun scripts/bench-replay.ts report [--transcripts ...] [--configs recorded,om,...] [--out FILE]
//
// The transcripts are private copies, gitignored, in the main checkout's tests/fixtures/replay/ (--dir overrides).
// Each transcript's constraint list and questions: tests/eval/replay-specs/<name>.ts, or, for a transcript whose
// content may not be committed (firstmate-11), tests/fixtures/<name>.replay.local.ts (gitignored); without one only
// identifiers are scored. Results go under /tmp/om-replay/<transcript>/<configuration>/.
//
// dry-run: parses each transcript, checks its spec against the user's own messages, and prints every model call a
//   full run would make (om's Observer and Reflector calls, the built-in chain's /compact calls, the question
//   stage's headless Sonnet sessions) with estimated tokens and cost per configuration. It spends nothing.
// om: replays the transcript through the checkout's (or --src's) hooks/register.ts with a hand-built `$` on a
//   virtual clock, and compacts where the session compacted, each compaction on the previous one's output. Observer
//   and Reflector calls go to pi through a response cache (/tmp/om-replay/luna-cache, and /tmp/om-vcc/luna-cache
//   read too): --pi stub answers every call with a canned reply built from its prompt (free; checks the chain, not a
//   measurement), --pi strict (the default) fails on a call not cached, --pi live runs pi on a miss, at most
//   --max-calls times (default 0), and caches it. Writes compaction-N.md (the memory message), kept-N.json (the rows
//   kept raw), calls.json, log.txt and summary.json to /tmp/om-replay/<name>/om-<pi>.
// builtin: the live built-in chain (planBuiltinChain): seeds a sandbox session with span 0's raw rows, resumes it in
//   the herdr pane with no observational-memory plugin, /compact, exits, reads the summary and kept rows back,
//   appends the next span's rows after them and repeats. Without --live it prints the plan and stops. With --live it
//   refuses unless the estimated cost of its /compact calls is within --budget-usd. Not yet run: whether Claude Code
//   resumes a session whose later rows were appended by another writer is unverified; a failed step stops the chain
//   and says which step, rather than making up a summary.
// report: scores, per transcript, the session's own compactions ("recorded") and every configuration with results
//   under /tmp/om-replay (--configs: only these), and prints the report (or writes it to --out). A private transcript
//   gets aggregate numbers only.
import { createHash } from 'crypto'
import { spawnSync } from 'child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import type { SessionMessage } from 'claude-code'
import type { Boundary, ConfigResult, Context, ReplaySpec, Transcript } from '../tests/eval/replay'
import { checkSpec, describePlan, lastCompaction, parseTranscript, planBuiltinChain, planCalls, planQuestionSession, questionsAt, renderTranscript, replayChain, REPLAY_CONFIGURATIONS, seedRows } from '../tests/eval/replay'
import { shellLine } from '../tests/eval/live'

const HERE = resolve(import.meta.dir, '..')
const OUT_ROOT = '/tmp/om-replay'
const CACHE = `${OUT_ROOT}/luna-cache`
const OLD_CACHE = '/tmp/om-vcc/luna-cache'
const TRANSCRIPTS = ['om-orchestration', 'om-v04', 'firstmate-11']
// Transcripts whose content (memories, questions, answers, excerpts) never leaves this machine: aggregate numbers only.
const PRIVATE = new Set(['firstmate-11'])
// Virtual latency of one pi call, as /tmp/om-vcc/replay.ts had it: fixed, so every replay schedules identically.
const OBSERVER_MS = 15_000
const REFLECTOR_MS = 30_000
const SESSION = 'replay'

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}
function options(argv: string[]) {
  const o: Record<string, string | true> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (!a.startsWith('--')) fail(`unexpected argument ${a}`)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) o[a.slice(2)] = true
    else ((o[a.slice(2)] = next), i++)
  }
  return o
}
const str = (o: Record<string, string | true>, k: string) => (typeof o[k] === 'string' ? (o[k] as string) : undefined)
const num = (o: Record<string, string | true>, k: string, dflt?: number) => {
  const v = str(o, k)
  if (v === undefined) return dflt
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) fail(`--${k} ${v}: not a number`)
  return n
}
function mainCheckout() {
  const r = spawnSync('git', ['-C', HERE, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' })
  if (r.status !== 0) fail(`cannot find the main checkout from ${HERE}: ${r.stderr}`)
  return dirname(r.stdout.trim())
}
const transcriptDir = (o: Record<string, string | true>) => str(o, 'dir') ?? `${mainCheckout()}/tests/fixtures/replay`
const names = (o: Record<string, string | true>) => (str(o, 'transcripts') ?? TRANSCRIPTS.join(',')).split(',').filter(Boolean)

function load(o: Record<string, string | true>, name: string) {
  const path = `${transcriptDir(o)}/${name}.jsonl`
  if (!existsSync(path)) fail(`${path}: no such transcript`)
  const text = readFileSync(path, 'utf8')
  return { path, text, bytes: statSync(path).size, t: parseTranscript(text) }
}
async function specOf(name: string): Promise<ReplaySpec | undefined> {
  for (const file of [`${HERE}/tests/eval/replay-specs/${name}.ts`, `${HERE}/tests/fixtures/${name}.replay.local.ts`])
    if (existsSync(file)) return (await import(file)).spec as ReplaySpec
  return undefined
}
async function checkedSpec(name: string, t: Transcript) {
  const spec = await specOf(name)
  const problems = spec ? checkSpec(t, spec) : []
  if (problems.length) fail(`${name}: the spec does not match the transcript:\n${problems.map((p) => `  ${p}`).join('\n')}`)
  return spec
}

// ---- dry-run ----

async function dryRun(o: Record<string, string | true>) {
  const calls = []
  for (const name of names(o)) {
    const { t } = load(o, name)
    const spec = await checkedSpec(name, t)
    const stub = `${OUT_ROOT}/${name}/om-stub/calls.json`
    const omCalls = existsSync(stub) ? (JSON.parse(readFileSync(stub, 'utf8')) as { kind: 'observer' | 'reflector'; inTokens: number }[]) : undefined
    console.log(`${name}: ${t.boundaries.length} boundaries; ${spec ? `${spec.constraints.length} constraints, ${spec.questions.length} questions` : 'no spec: identifiers only, no questions'}; om calls ${omCalls ? `from ${stub}` : 'estimated'}`)
    const planned = planCalls(name, t, spec, omCalls ? { omCalls } : {})
    calls.push(...planned)
    // What the question stage would run, once per configuration at the first boundary with questions.
    const first = planned.find((c) => c.stage === 'question')?.boundary
    if (spec && first)
      for (const config of REPLAY_CONFIGURATIONS) {
        const b = t.boundaries[first - 1]!
        const q = planQuestionSession({ config, boundary: first, context: { summary: b.summary, kept: b.kept }, questions: questionsAt(spec, first), runDir: `${OUT_ROOT}/${name}/questions`, sessionId: '<session id>', recallPluginDir: `${OUT_ROOT}/${name}/questions/recall-plugin` })
        const argv = q.argv.map((a) => (a === q.prompt ? `<prompt: ${q.prompt.length} chars>` : a))
        console.log(`  question session, ${config} @${first}: ${shellLine(argv)}${q.seed ? ` (resumes a seeded copy of spans 0-${first - 1})` : ''}; the session's own compaction stands in for the context`)
      }
  }
  console.log(`\n${describePlan(calls)}`)
}

// ---- om: the offline replay through a build's hooks ----

type PiResult = { exitCode: number; stdout: string; stderr: string }
type Call = { kind: 'observer' | 'reflector'; atCompaction: boolean; start: number; prompt: string; inTokens: number; hit: boolean; realMs?: number; in: number; out: number; cost: number; ok: boolean }

function piMessage(stdout: string) {
  let message: any
  for (const line of stdout.split('\n'))
    if (line.startsWith('{"type":"message_end"'))
      try {
        const e = JSON.parse(line)
        if (e.message?.role === 'assistant') message = e.message
      } catch {}
  return message
}
// A canned reply from the prompt alone: each block's first words as an observation (the Reflector's: every other
// line). Enough for the chain to run; says nothing about what Luna would keep.
function stub(prompt: string): PiResult {
  const reflect = prompt.startsWith('## OBSERVATIONS TO REFLECT ON')
  const lines = reflect
    ? [...prompt.matchAll(/^\* .+$/gm)].map((m) => m[0]).filter((_, i) => i % 2 === 0)
    : [...prompt.matchAll(/^\[(User|Assistant)(?: @ ([\d-]+ [\d:]+))?\]: (.{0,60})/gm)].map((m) => `* 🟡 ${m[2] ?? ''} ${m[1]} said ${m[3]!.replace(/\s+/g, ' ')}`)
  const text = `<observations>\n${lines.join('\n') || '* 🟡 Nothing to note'}\n</observations>` + (reflect ? '' : '\n<continuation>\nActive: stub\n</continuation>')
  const usage = { input: Math.ceil(prompt.length / 4), output: Math.ceil(text.length / 4), cost: { total: 0 } }
  const message = { role: 'assistant', content: [{ type: 'text', text }], stopReason: 'stop', usage }
  return { exitCode: 0, stderr: '', stdout: JSON.stringify({ type: 'message_end', message }) }
}

async function om(o: Record<string, string | true>) {
  const name = str(o, 'transcript') ?? fail('--transcript: one of ' + TRANSCRIPTS.join(', '))
  const piMode = (str(o, 'pi') ?? 'strict') as 'stub' | 'strict' | 'live'
  if (!['stub', 'strict', 'live'].includes(piMode)) fail(`--pi ${piMode}: stub, strict or live`)
  let liveLeft = num(o, 'max-calls', 0)!
  const src = resolve(str(o, 'src') ?? HERE)
  const { path, t } = load(o, name)
  const upTo = Math.min(num(o, 'boundaries', t.boundaries.length)!, t.boundaries.length)
  const out = str(o, 'out') ?? `${OUT_ROOT}/${name}/om-${piMode}`
  if (existsSync(out) && readdirSync(out).length) fail(`${out} exists: move it or pass another --out`)
  mkdirSync(`${out}/stats`, { recursive: true })
  mkdirSync(CACHE, { recursive: true })
  const env: Record<string, string> = { HOME: process.env.HOME ?? '/root', OM_NO_PRUNE: '1', OM_STATS_DIR: `${out}/stats` }

  // The engine: a hand-built `$`, a virtual clock, and pi calls that land after a fixed virtual latency.
  let now = t.events[0]?.at ?? 0
  // The chain's history (every row, each compaction's output after the rows it compacted), as the engine shows it.
  let history: readonly SessionMessage[] = []
  const store = new Map<string, string>()
  const logs: { at: number; text: string; to?: string }[] = []
  let timers = 0
  type Pending = { due: number; result: Promise<PiResult>; resolve: (v: PiResult) => void }
  const pending: Pending[] = []
  const calls: Call[] = []
  let compacting = false

  async function runPi(argv: string[], stdin: string, init: { cwd?: string }) {
    if (piMode === 'stub') return { r: stub(stdin), hit: false }
    const hash = createHash('sha256').update(argv.join('\0')).update('\0\0').update(stdin).digest('hex')
    for (const dir of [CACHE, OLD_CACHE])
      if (existsSync(`${dir}/${hash}.json`)) {
        const c = JSON.parse(readFileSync(`${dir}/${hash}.json`, 'utf8'))
        return { r: { exitCode: c.exitCode, stdout: c.stdout, stderr: c.stderr }, hit: true, realMs: c.ms as number }
      }
    if (piMode === 'strict') throw new Error(`strict: no cached pi reply for ${hash}`)
    if (liveLeft <= 0) throw new Error(`--max-calls reached: no live pi call for ${hash}`)
    liveLeft--
    const started = Date.now()
    const p = Bun.spawn(argv, { cwd: init.cwd, stdin: new TextEncoder().encode(stdin), stdout: 'pipe', stderr: 'pipe' })
    const [stdout, stderr, exitCode] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited])
    const ms = Date.now() - started
    if (exitCode === 0) writeFileSync(`${CACHE}/${hash}.json`, JSON.stringify({ argv, stdin, stdout, stderr, exitCode, ms, at: new Date().toISOString() }))
    return { r: { exitCode, stdout, stderr }, hit: false, realMs: ms }
  }

  const inOut = (p: string) => p === out || p.startsWith(`${out}/`)
  const RECALL_TOOL_NAME = 'mcp__observational-memory__om_recall'
  const $: any = {
    session: {
      id: async () => SESSION,
      messages: async () => history,
      cwd: async () => t.cwd ?? '/',
      usage: async () => {
        throw new Error('no usage in a replay')
      },
    },
    store: {
      get: async (k: string) => (store.has(k) ? JSON.parse(store.get(k)!) : undefined),
      set: async (k: string, v: unknown) => void store.set(k, JSON.stringify(v)),
      delete: async (k: string) => void store.delete(k),
      keys: async () => [...store.keys()],
    },
    clock: {
      now: async () => now,
      after: (ms: number, fn: () => void) => {
        // after(0) is OM's way off the hook's path: counted, so a drain waits for it. The stats file's write delay
        // runs on real time and is flushed at the end.
        if (ms > 0) {
          const h = setTimeout(fn, 10)
          return { cancel: () => clearTimeout(h) }
        }
        timers++
        let live = true
        setTimeout(() => {
          timers--
          if (live) fn()
        }, 0)
        return { cancel: () => void (live = false) }
      },
    },
    env: { get: async (k: string) => env[k] ?? null },
    agent: { list: async () => [] },
    tool: { list: async () => [{ name: RECALL_TOOL_NAME }], register: async () => {} },
    command: { register: async () => {} },
    fs: {
      read: async (p: string) => {
        if (!inOut(p)) throw new Error(`ENOENT: ${p} (outside the replay)`)
        return readFileSync(p, 'utf8')
      },
      write: async (p: string, text: string) => {
        if (!inOut(p)) throw new Error(`EACCES: ${p} (outside the replay)`)
        mkdirSync(dirname(p), { recursive: true })
        writeFileSync(p, text)
      },
      list: async (p: string) => (inOut(p) && existsSync(p) ? readdirSync(p).map((n) => ({ name: n, kind: 'file', size: statSync(`${p}/${n}`).size, isLink: false })) : []),
      exists: async (p: string) => inOut(p) && existsSync(p),
      stat: async (p: string) => {
        if (!inOut(p) || !existsSync(p)) throw new Error(`ENOENT: ${p}`)
        return { kind: 'file', size: statSync(p).size, mtimeMs: statSync(p).mtimeMs, isLink: false }
      },
    },
    process: {
      run: (argv: string[], init: { cwd?: string; stdin?: string } = {}) => {
        if (argv[0] !== 'pi') return Promise.reject(new Error(`the replay runs pi alone, not ${argv[0]}`))
        const stdin = init.stdin ?? ''
        const kind = stdin.startsWith('## OBSERVATIONS TO REFLECT ON') ? 'reflector' : 'observer'
        const call: Call = { kind, atCompaction: compacting, start: now, prompt: createHash('sha256').update(stdin).digest('hex').slice(0, 16), inTokens: Math.ceil((stdin.length + (argv[argv.indexOf('--system-prompt') + 1] ?? '').length) / 4), hit: false, in: 0, out: 0, cost: 0, ok: false }
        calls.push(call)
        const result = runPi(argv, stdin, init).then(
          ({ r, hit, realMs }) => {
            const m = piMessage(r.stdout)
            Object.assign(call, { hit, realMs, ok: r.exitCode === 0 && !!m, in: m?.usage?.input ?? 0, out: m?.usage?.output ?? 0, cost: m?.usage?.cost?.total ?? 0 })
            return r
          },
          (error: Error) => ({ exitCode: 1, stdout: '', stderr: error.message }),
        )
        return new Promise<PiResult>((resolve) => pending.push({ due: now + (kind === 'reflector' ? REFLECTOR_MS : OBSERVER_MS), result, resolve }))
      },
      spawn: () => {
        throw new Error('the replay spawns nothing')
      },
    },
    ui: { invalidate: () => {} },
  }
  $.ui.log = (text: any, opts?: any) => void logs.push({ at: now, text: typeof text === 'string' ? text : text.text, to: opts?.to ?? text?.to })

  const hooks: Record<string, any> = {}
  const on: any = (event: string, a: any, b?: any) => {
    if (b === undefined) hooks[event] = a
    else if (!(event in hooks)) hooks[event] = b // filtered hooks (a tool's, a command's) never fire in a replay
    return { catch: (fn: any) => void (hooks[`${event}:catch`] = fn) }
  }
  const mod = await import(`${src}/hooks/register.ts`)
  mod.register(on, {} as any)

  const tick = () => new Promise((r) => setTimeout(r, 0))
  async function drain() {
    for (let quiet = 0; quiet < 3; ) {
      await tick()
      quiet = timers === 0 ? quiet + 1 : 0
    }
  }
  // Moves the clock to `to`, landing each pi call due by then in order, OM's work after each one drained.
  async function advance(to: number) {
    await drain()
    for (;;) {
      const next = pending.filter((p) => p.due <= to).sort((a, b) => a.due - b.due)[0]
      if (!next) break
      pending.splice(pending.indexOf(next), 1)
      now = Math.max(now, next.due)
      next.resolve(await next.result)
      await drain()
    }
    now = Math.max(now, to)
  }
  // The compaction, and its fallback: with no built-in compaction to fall back to, a fallback is an error.
  async function compact(live: readonly SessionMessage[], boundary: Boundary) {
    compacting = true
    let done = false
    const input = { trigger: 'auto', messages: [...live] }
    const builtin = async () => {
      throw new Error('the built-in compaction (a fallback) is not replayed')
    }
    const run = (async () => {
      try {
        return await hooks['session.compact']($, input, builtin)
      } catch (error) {
        const next = { called: false, error }
        const fallback = await hooks['session.compact:catch']?.($, input, next)
        throw new Error(`compaction ${boundary.n} fell back (${(error as Error).message}): ${JSON.stringify(fallback)?.slice(0, 200)}`)
      }
    })().finally(() => (done = true))
    for (await drain(); !done; await drain()) {
      const next = pending.sort((a, b) => a.due - b.due)[0]
      if (!next) {
        await tick()
        continue
      }
      pending.splice(pending.indexOf(next), 1)
      now = Math.max(now, next.due)
      next.resolve(await next.result)
    }
    const r = await run
    compacting = false
    return r.messages as SessionMessage[]
  }

  await hooks['classic.SessionStart']($, { source: 'startup', session_id: SESSION, transcript_path: path }, async (e: unknown) => e)
  const wall0 = performance.now()
  let index = 0
  const steps = await replayChain(
    t,
    {
      at: advance,
      row: async (_row, h) => void (history = h),
      event: async (e, h) => {
        history = h
        if (e.kind === 'start') await hooks['turn.start']($, { text: h.at(-1)!.text, turnId: 't' }, async () => ({ turnId: 't' }))
        else if (e.kind === 'step') {
          const gen = hooks['turn.step']($, { turnId: 't', index: index++, model: 'claude', messageCount: h.length }, async function* () {
            return { turnId: 't', index, answer: '', toolUses: [], stopReason: 'tool_use', usage: null }
          })
          for (let r = await gen.next(); !r.done; r = await gen.next());
        } else if (e.kind === 'complete') await hooks['turn.complete']($, { answer: '', durationMs: 0, isAborted: false, turnId: 't', reason: 'answer' }, async () => ({ text: '' }))
        else if (e.kind === 'skill') await hooks['skill.prompt']($, { skill: e.skill, text: e.text }, async () => ({ text: e.text }))
      },
      compact: async (live, boundary) => {
        const before = calls.length
        const output = await compact(live, boundary)
        writeFileSync(`${out}/compaction-${boundary.n}.md`, output[0]?.text ?? '')
        writeFileSync(`${out}/kept-${boundary.n}.json`, JSON.stringify(output.slice(1), null, 1))
        console.log(`[${name}] compaction ${boundary.n}: ${live.length} live rows in, memory ~${Math.ceil((output[0]?.text.length ?? 0) / 4)} tokens, ${output.length - 1} kept raw, ${calls.length - before} pi call(s) at compaction`)
        return output
      },
    },
    upTo,
  )
  while (pending.length) await advance(Math.min(...pending.map((p) => p.due)))
  await drain()
  await hooks['session.end']($, { sessionId: SESSION, reason: 'other' }, async () => ({ sessionId: SESSION }))
  const sum = (f: (c: Call) => number) => calls.reduce((s, c) => s + f(c), 0)
  const summary = {
    transcript: name,
    src,
    pi: piMode,
    boundaries: steps.length,
    luna: {
      calls: calls.length,
      observer: calls.filter((c) => c.kind === 'observer').length,
      reflector: calls.filter((c) => c.kind === 'reflector').length,
      atCompaction: calls.filter((c) => c.atCompaction).length,
      failed: calls.filter((c) => !c.ok).length,
      cacheHits: calls.filter((c) => c.hit).length,
      tokensIn: sum((c) => c.in),
      tokensOut: sum((c) => c.out),
      cost: +sum((c) => c.cost).toFixed(5),
    },
    wallMs: Math.round(performance.now() - wall0),
  }
  writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 1))
  writeFileSync(`${out}/calls.json`, JSON.stringify(calls.map((c) => ({ ...c, start: new Date(c.start).toISOString() })), null, 1))
  writeFileSync(`${out}/log.txt`, logs.map((l) => `${new Date(l.at).toISOString()} ${l.to ?? ''} ${l.text}`).join('\n'))
  console.log(`[${name}] ${JSON.stringify(summary)}`)
  process.exit(0)
}

// ---- builtin: the live built-in chain ----

function herdr(argv: string[]) {
  const r = spawnSync('herdr', argv, { encoding: 'utf8' })
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
}
// The session's JSONL, following the files it continued in.
function sessionFile(dir: string, sessionId: string) {
  let file = `${dir}/${sessionId}.jsonl`
  for (let seen = new Set<string>(); existsSync(file) && !seen.has(file); ) {
    seen.add(file)
    const next = readFileSync(file, 'utf8').match(/"continuedInSessionId":"([0-9a-f-]{36})"/)?.[1]
    if (!next || !existsSync(`${dir}/${next}.jsonl`)) break
    file = `${dir}/${next}.jsonl`
  }
  return file
}

async function builtin(o: Record<string, string | true>) {
  const name = str(o, 'transcript') ?? fail('--transcript: one of ' + TRANSCRIPTS.join(', '))
  const pane = str(o, 'pane') ?? fail('--pane: an existing herdr pane at a shell prompt (herdr pane list)')
  const budget = num(o, 'budget-usd') ?? fail('--budget-usd: the most this chain may cost')
  const { text, t } = load(o, name)
  const runDir = str(o, 'out') ?? `${OUT_ROOT}/${name}/builtin`
  const sessionId = crypto.randomUUID()
  const plan = planBuiltinChain({ runDir, sessionId, pane, boundaries: t.boundaries.length, timeoutMs: 900_000, startTimeoutMs: 60_000 })
  const cost = planCalls(name, t).filter((c) => c.stage === 'compaction').reduce((n, c) => n + c.usd, 0)
  console.log(`Built-in chain for ${name}: ${t.boundaries.length} /compact calls, estimated $${cost.toFixed(2)} (budget $${budget}); session ${sessionId} in ${plan.projectDir}`)
  plan.steps.forEach((st, i) => console.log(`${i + 1}. ${st.kind === 'herdr' ? `herdr ${shellLine(st.argv)}` : st.kind}   # ${st.purpose}`))
  if (!o.live) return console.log('\nPlan only: pass --live to run it. Nothing written, herdr not called.')
  if (cost > budget) fail(`the estimated $${cost.toFixed(2)} is over --budget-usd ${budget}`)
  if (existsSync(runDir)) fail(`${runDir} exists: move it or pass another --out`)
  mkdirSync(plan.projectDir, { recursive: true })
  writeFileSync(plan.settingsPath, JSON.stringify(plan.settings, null, 2) + '\n')
  const listed = spawnSync('claude', ['--settings', plan.settingsPath, 'plugin', 'list', '--json'], { encoding: 'utf8', cwd: plan.projectDir })
  if (/"id":\s*"observational-memory@[^"]*"[^}]*"enabled":\s*true/.test(listed.stdout ?? '')) fail('observational-memory loads with these settings: the built-in chain would not be built-in')
  const projects = `${process.env.HOME}/.claude/projects/${plan.projectDir.replace(/[^A-Za-z0-9]/g, '-')}`
  mkdirSync(projects, { recursive: true })
  let id = sessionId
  let leaf: string | null = null
  const log = `${runDir}/steps.log`
  for (const st of plan.steps) {
    appendFileSync(log, `${new Date().toISOString()} ${st.kind}: ${st.purpose}\n`)
    if (st.kind === 'settle') await new Promise((r) => setTimeout(r, st.ms))
    else if (st.kind === 'seed') {
      const rows = seedRows(text, st.span, { sessionId: id, cwd: plan.projectDir, parentUuid: leaf })
      appendFileSync(sessionFile(projects, id), rows.map((r) => JSON.stringify(r)).join('\n') + '\n')
      leaf = rows.at(-1)?.uuid ?? leaf
    } else if (st.kind === 'collect') {
      const file = sessionFile(projects, id)
      id = file.slice(file.lastIndexOf('/') + 1, -'.jsonl'.length)
      const c = lastCompaction(readFileSync(file, 'utf8'))
      if (!c || c.summary === '' || !readFileSync(file, 'utf8').includes('compact_boundary')) fail(`step "${st.purpose}": no compaction in ${file}; see ${log}`)
      const boundaries = parseTranscript(readFileSync(file, 'utf8')).boundaries.length
      if (boundaries !== st.boundary) fail(`step "${st.purpose}": ${file} holds ${boundaries} compactions, expected ${st.boundary}`)
      writeFileSync(`${runDir}/compaction-${st.boundary}.md`, c.summary)
      writeFileSync(`${runDir}/kept-${st.boundary}.json`, JSON.stringify(c.kept.map(({ at: _, uuid: _u, line: _l, ...m }) => m), null, 1))
      leaf = c.leaf ?? leaf
      console.log(`compaction ${st.boundary}: summary ~${Math.ceil(c.summary.length / 4)} tokens, ${c.kept.length} kept`)
    } else {
      const argv = st.argv.map((a) => (a === sessionId ? id : a))
      const r = herdr(argv)
      appendFileSync(log, `$ herdr ${shellLine(argv)}\n${r.out}\n`)
      if (!r.ok && !(st.stallOk && /agent_prompt_stalled/.test(r.out))) fail(`step "${st.purpose}" failed: ${r.out.slice(0, 500)}; the pane is left as it is`)
    }
  }
}

// ---- report ----

const readContexts = (dir: string, n: number): (Context | undefined)[] =>
  Array.from({ length: n }, (_, i) =>
    existsSync(`${dir}/compaction-${i + 1}.md`) ? { summary: readFileSync(`${dir}/compaction-${i + 1}.md`, 'utf8'), kept: existsSync(`${dir}/kept-${i + 1}.json`) ? JSON.parse(readFileSync(`${dir}/kept-${i + 1}.json`, 'utf8')) : [] } : undefined,
  )
const SOURCES: [string, string, string][] = [
  ['om-live', 'om', 'om replay of this checkout, Luna through pi (cached)'],
  ['om-strict', 'om', 'om replay of this checkout, Luna through pi (cached)'],
  ['om-stub', 'om (stub)', 'om replay of this checkout with pi stubbed: checks the chain, not a measurement'],
  ['builtin', 'built-in', 'live built-in chain (Sonnet)'],
]

async function report(o: Record<string, string | true>) {
  const parts: string[] = ['# Retention over many real compactions', '']
  parts.push(
    'Scored with no model. "recorded" is the session\'s own compaction as it ran (the plugin version the session had);',
    'the others are chained replays at the same boundaries. A needed identifier is one the assistant used after the',
    'boundary, first seen before it, not kept raw by the session\'s own compaction, and not shown again before that use.',
    'The +recall configurations differ only at the question stage, which is planned and not run.',
    '',
  )
  for (const name of names(o)) {
    const { t, bytes } = load(o, name)
    const spec = await checkedSpec(name, t)
    const results: ConfigResult[] = [{ config: 'recorded', source: "the session's own compaction", contexts: t.boundaries.map((b) => ({ summary: b.summary, kept: b.kept })) }]
    const only = str(o, 'configs')?.split(',')
    if (only) results.splice(0, results.length, ...results.filter((r) => only.includes(r.config)))
    for (const [dir, config, source] of SOURCES) {
      if (only && !only.includes(config)) continue
      const path = `${OUT_ROOT}/${name}/${dir}`
      if (results.some((r) => r.config === config) || !existsSync(`${path}/compaction-1.md`)) continue
      // A cached or live replay whose pi calls failed compacted on the floor or with what it had: not om's measurement.
      const failed = dir === 'om-stub' ? 0 : ((existsSync(`${path}/summary.json`) ? JSON.parse(readFileSync(`${path}/summary.json`, 'utf8')) : { luna: { failed: -1 } }).luna?.failed ?? -1)
      if (failed !== 0) {
        console.error(`${name}: ${path} left out: ${failed < 0 ? 'no summary.json' : `${failed} pi call(s) failed`}`)
        continue
      }
      results.push({ config, source, contexts: readContexts(path, t.boundaries.length) })
    }
    parts.push(renderTranscript({ name, t, results, bytes, private: PRIVATE.has(name), ...(spec ? { spec } : {}) }))
    parts.push(`Sources: ${results.map((r) => `${r.config}: ${r.source}`).join('; ')}.`, '')
  }
  const text = parts.join('\n')
  const file = str(o, 'out')
  if (file) writeFileSync(file, text), console.log(`wrote ${file}`)
  else console.log(text)
}

const [command, ...rest] = process.argv.slice(2)
const o = options(rest)
if (command === 'dry-run') await dryRun(o)
else if (command === 'om') await om(o)
else if (command === 'builtin') await builtin(o)
else if (command === 'report') await report(o)
else fail('usage: bun scripts/bench-replay.ts dry-run|om|builtin|report (see the header)')
