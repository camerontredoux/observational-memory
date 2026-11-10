// What the benchmark scripts (bench-replay.ts and others) share: their options, failing, the main checkout, a
// session's transcripts under ~/.claude/projects, a herdr step in a live pane, and a live Ember call. Not a script of
// its own. Not typechecked by `tsc -p .` (Bun's Node APIs).
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { shellLine } from '../tests/eval/config'

const HERE = resolve(import.meta.dir, '..')

export function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

export type Options = Record<string, string | true>
export function options(argv: string[]): Options {
  const o: Options = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (!a.startsWith('--')) fail(`unexpected argument ${a}`)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) o[a.slice(2)] = true
    else ((o[a.slice(2)] = next), i++)
  }
  return o
}
export const str = (o: Options, k: string) => (typeof o[k] === 'string' ? (o[k] as string) : undefined)
export const num = (o: Options, k: string, dflt?: number) => {
  const v = str(o, k)
  if (v === undefined) return dflt
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) fail(`--${k} ${v}: not a number`)
  return n
}

/** The main checkout, from this one or any of its worktrees. */
export function mainCheckout() {
  const r = spawnSync('git', ['-C', HERE, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' })
  if (r.status !== 0) fail(`cannot find the main checkout from ${HERE}: ${r.stderr}`)
  return dirname(r.stdout.trim())
}

/** Ember on Meta's Responses API, as hooks/register.ts calls it, and its prices in dollars per million tokens. */
export const EMBER_URL = 'https://api.meta.ai/v1/responses'
export const EMBER_MODEL = 'muse-ember-1.0'
const EMBER_PRICE = { input: 0.1, cached: 0.004, output: 0.5 }
const EMBER_KEY_FILE = `${process.env.HOME}/.config/observational-memory/muse-api-key`
// Every live Ember call a benchmark makes appends its usage here, one JSON line, for `muse-usage` (~/.local/bin).
// `run` is the PID of the benchmark's top process: the first script to load this module sets it, and the scripts it
// spawns inherit it, so a run's spend is counted while that process lives.
const USAGE_LOG = `${process.env.HOME}/.cache/om-bench-compact/usage.jsonl`
process.env.OM_BENCH_RUN ||= String(process.pid)

/**
 * One live Ember request with `body`, a Responses API request as JSON. The API key is read from its file for this call
 * alone and never returned, logged or stored. Rejects on a network failure or past `timeoutMs`.
 */
export async function ember(body: string, timeoutMs: number): Promise<{ status: number; text: string }> {
  const key = readFileSync(EMBER_KEY_FILE, 'utf8').trim()
  if (!key) throw new Error('no Ember API key in ~/.config/observational-memory/muse-api-key')
  const res = await fetch(EMBER_URL, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(timeoutMs) })
  const text = await res.text()
  const u = emberReply(text)
  try {
    mkdirSync(dirname(USAGE_LOG), { recursive: true })
    appendFileSync(USAGE_LOG, JSON.stringify({ at: Date.now(), run: Number(process.env.OM_BENCH_RUN), pid: process.pid, in: u.input, cached: u.cached, out: u.output, cost: u.cost }) + '\n')
  } catch {} // the ledger is for reporting only; a call never fails on it
  return { status: res.status, text }
}

/** A Responses API reply, read as hooks/register.ts reads it: its message text, whether it completed, its usage and cost. */
export function emberReply(text: string) {
  let r: any = {}
  try {
    r = JSON.parse(text) ?? {}
  } catch {}
  const message = ((r.output ?? []) as any[]).flatMap((o) => (o.type === 'message' ? (o.content ?? []) : [])).flatMap((c: any) => (c.type === 'output_text' && c.text ? [c.text] : [])).join('')
  const cached: number = r.usage?.input_tokens_details?.cached_tokens ?? 0
  const input: number = r.usage?.input_tokens ?? 0
  const output: number = r.usage?.output_tokens ?? 0
  const cost = ((input - cached) * EMBER_PRICE.input + cached * EMBER_PRICE.cached + output * EMBER_PRICE.output) / 1e6
  return { completed: r.status === 'completed' && !!message, message, error: String(r.error?.code ?? r.status ?? ''), input, cached, output, cost }
}

/** Where Claude Code keeps the transcripts of sessions run in `cwd`. */
export const projectsDir = (cwd: string) => `${process.env.HOME}/.claude/projects/${cwd.replace(/[^A-Za-z0-9]/g, '-')}`

/** The session's transcript and every file it continued in (a moved session), oldest first. */
export function findTranscripts(sessionId: string): string[] {
  const root = `${process.env.HOME}/.claude/projects`
  const dir = existsSync(root) ? readdirSync(root).map((d) => `${root}/${d}`).find((d) => existsSync(`${d}/${sessionId}.jsonl`)) : undefined
  if (!dir) return []
  const files = [`${dir}/${sessionId}.jsonl`]
  for (;;) {
    const next = readFileSync(files.at(-1)!, 'utf8').match(/"continuedInSessionId":"([0-9a-f-]{36})"/)?.[1]
    const path = next && `${dir}/${next}.jsonl`
    if (!path || files.includes(path) || !existsSync(path)) return files
    files.push(path)
  }
}

export function herdr(argv: string[]) {
  const r = spawnSync('herdr', argv, { encoding: 'utf8' })
  return `${r.stdout ?? ''}${r.stderr ?? ''}`
}

/**
 * Runs one herdr step and recovers from what a live pane does to it; returns why it failed, or undefined. `prompt`
 * is the text the step types, `stallOk` that herdr seeing no work start (a fast compaction) is no failure.
 */
export async function send(st: { argv: string[]; prompt?: string; stallOk?: boolean }, head: string, pane: string, log: string): Promise<string | undefined> {
  const stallOk = st.stallOk === true
  const starting = st.argv[0] === 'agent' && st.argv[1] === 'start'
  if (starting) await Bun.sleep(1_000) // the `cd` before it leaves the pane briefly busy: `agent start` wants an idle shell
  const r = spawnSync('herdr', st.argv, { encoding: 'utf8' })
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim()
  appendFileSync(log, `${new Date().toISOString()} ${head}\n$ herdr ${shellLine(st.argv)}\nexit ${r.status}\n${out}\n\n`)
  if (r.status === 0) return
  // Each run's sandbox is a new folder, so Claude Code asks whether to trust it: accept, then wait for the prompt.
  if (starting && /agent_not_ready/.test(out) && /trust this folder/.test(herdr(['pane', 'read', pane]))) {
    herdr(['pane', 'send-keys', pane, 'down', 'enter'])
    const w = spawnSync('herdr', ['agent', 'wait', st.argv[2]!, '--until', 'idle', '--timeout', '60000'], { encoding: 'utf8' })
    appendFileSync(log, `accepted the folder trust prompt; agent wait exit ${w.status}\n\n`)
    await Bun.sleep(3_000) // the prompt box redraws after the trust dialog closes, and drops keys sent while it does
    if (w.status === 0) return
  }
  // A prompt typed while the prompt box redraws is lost: herdr then sees no work start. Send it again once.
  if (st.prompt && !stallOk && /agent_prompt_stalled/.test(out) && !herdr(['pane', 'read', pane]).includes(st.prompt.slice(0, 40))) {
    await Bun.sleep(2_000)
    const again = spawnSync('herdr', st.argv, { encoding: 'utf8' })
    const out2 = `${again.stdout ?? ''}${again.stderr ?? ''}`.trim()
    appendFileSync(log, `the prompt did not reach the session; sent it again: exit ${again.status}\n${out2}\n\n`)
    if (again.status === 0) return
  }
  if (stallOk && /agent_prompt_stalled/.test(out)) {
    console.log('  herdr saw no working state (a fast compaction); carrying on')
    return
  }
  return `exit ${r.status}: ${out.slice(0, 500)}`
}
