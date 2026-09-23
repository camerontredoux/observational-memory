// Usage statistics: one JSON file per session, written only by that session, debounced off every hook. Global
// figures are merged from the files when asked for. A stats failure is logged once and never breaks anything.
const SAMPLES = 200 // raw samples kept per metric, newest, for medians and p90
const WRITE_DELAY_MS = 2_000
const DEFAULT_DIR = '.claude/plugins/data/observational-memory/stats' // under $HOME; OM_STATS_DIR overrides it

export type Sample = [at: number, value: number]
export type Metric = { count: number; sum: number; min: number; max: number; recent: Sample[] }
export type SessionStats = {
  version: 1
  sessionId: string
  cwd?: string
  firstSeen: number
  lastSeen: number
  backfilled?: boolean
  counts: Record<string, number> // events without a value: failures by class, fallbacks, recall hits from the file
  metrics: Record<string, Metric>
}
export type LunaCall = {
  kind: 'observer' | 'reflector'
  phase: 'background' | 'compaction'
  ok: boolean
  failure?: string
  ms: number
  input?: number
  output?: number
  cost?: number
  chunkTokens?: number
}
export type Compaction = {
  trigger: string
  ms: number
  fellBack: boolean
  tokensBefore?: number
  tokensAfter?: number
  syncCalls?: number
  syncMs?: number
  rowsObservedNow?: number
  rowsObservedBefore?: number
  memoryTokens?: number
  observations?: number
}
export type Reflection = { ms: number; tokensBefore: number; tokensAfter: number; level: number }

export const emptyStats = (sessionId: string, now: number, cwd?: string): SessionStats => ({
  version: 1,
  sessionId,
  ...(cwd ? { cwd } : {}),
  firstSeen: now,
  lastSeen: now,
  counts: {},
  metrics: {},
})

export function add(s: SessionStats, name: string, value: number | undefined, at: number) {
  if (value === undefined || !Number.isFinite(value)) return
  const m = (s.metrics[name] ??= { count: 0, sum: 0, min: value, max: value, recent: [] })
  m.count++
  m.sum += value
  m.min = Math.min(m.min, value)
  m.max = Math.max(m.max, value)
  m.recent.push([at, value])
  if (m.recent.length > SAMPLES) m.recent.splice(0, m.recent.length - SAMPLES)
  s.lastSeen = Math.max(s.lastSeen, at)
}
export const count = (s: SessionStats, name: string, by = 1) => void (s.counts[name] = (s.counts[name] ?? 0) + by)

// A failure's class: how pi ended, never what it said.
export function failureClass(message: string) {
  if (/timed? ?out|timeout/i.test(message)) return 'timeout'
  const exit = message.match(/^pi exited (\d+)(?:, stopReason (\w+))?/)
  if (exit?.[2]) return `stop-${exit[2]}`
  if (exit && exit[1] !== '0') return `exit-${exit[1]}`
  if (message.includes('no assistant message')) return 'no-message'
  if (message.includes('<observations>')) return 'no-observations'
  return 'error'
}

export function addLuna(s: SessionStats, c: LunaCall, at: number) {
  const key = `${c.kind}.${c.phase}`
  if (!c.ok) {
    add(s, `${key}.failed.ms`, c.ms, at)
    count(s, `${key}.failed.${c.failure ?? 'error'}`)
    return
  }
  add(s, `${key}.ms`, c.ms, at)
  add(s, `${key}.in`, c.input, at)
  add(s, `${key}.out`, c.output, at)
  add(s, `${key}.cost`, c.cost, at)
  add(s, `${key}.chunkTokens`, c.chunkTokens, at)
}

export function addCompaction(s: SessionStats, c: Compaction, at: number) {
  const key = `compaction.${c.trigger}`
  if (c.fellBack) count(s, `${key}.fellBack`)
  add(s, `${key}.ms`, c.ms, at)
  add(s, `${key}.tokensBefore`, c.tokensBefore, at)
  add(s, `${key}.tokensAfter`, c.tokensAfter, at)
  add(s, `${key}.syncCalls`, c.syncCalls, at)
  add(s, `${key}.syncMs`, c.syncMs, at)
  add(s, `${key}.rowsObservedNow`, c.rowsObservedNow, at)
  add(s, `${key}.rowsObservedBefore`, c.rowsObservedBefore, at)
  add(s, `${key}.memoryTokens`, c.memoryTokens, at)
  add(s, `${key}.observations`, c.observations, at)
}

export function addReflection(s: SessionStats, r: Reflection, at: number) {
  add(s, 'reflection.ms', r.ms, at)
  add(s, 'reflection.tokensBefore', r.tokensBefore, at)
  add(s, 'reflection.tokensAfter', r.tokensAfter, at)
  add(s, 'reflection.level', r.level, at)
}

export function addRecall(s: SessionStats, matches: number, fromFile: boolean, at: number) {
  add(s, 'recall.matches', matches, at)
  if (fromFile) count(s, 'recall.fromFile')
}

// Nearest rank over sorted values.
export function percentile(sorted: readonly number[], p: number) {
  if (!sorted.length) return NaN
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))]!
}

// `7d`, `12h`, `30m` back from `now`, or an ISO date; undefined when it reads as neither.
export function parseSince(text: string, now: number) {
  const rel = text.match(/^(\d+(?:\.\d+)?)([mhdw])$/)
  if (rel) return now - Number(rel[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[rel[2] as 'm' | 'h' | 'd' | 'w']
  const t = Date.parse(text)
  return Number.isNaN(t) ? undefined : t
}

// Several sessions as one. Past `since`, a metric is rebuilt from the samples at or after it, and a session's
// counts stand whole when it was seen after `since`. `approximate` when any samples were capped.
export function merge(files: readonly SessionStats[], since?: number) {
  const out = emptyStats('merged', Infinity)
  out.lastSeen = -Infinity
  let approximate = false
  let sessions = 0
  for (const f of files) {
    if (since !== undefined && f.lastSeen < since) continue
    sessions++
    out.firstSeen = Math.min(out.firstSeen, f.firstSeen)
    out.lastSeen = Math.max(out.lastSeen, f.lastSeen)
    for (const [k, n] of Object.entries(f.counts)) count(out, k, n)
    for (const [k, m] of Object.entries(f.metrics)) {
      if (m.count > m.recent.length) approximate = true
      if (since !== undefined) {
        for (const [at, v] of m.recent) if (at >= since) add(out, k, v, at)
        continue
      }
      const o = (out.metrics[k] ??= { count: 0, sum: 0, min: m.min, max: m.max, recent: [] })
      o.count += m.count
      o.sum += m.sum
      o.min = Math.min(o.min, m.min)
      o.max = Math.max(o.max, m.max)
      o.recent.push(...m.recent)
    }
  }
  return { stats: out, sessions, approximate }
}

const num = (n: number) =>
  !Number.isFinite(n) ? '-' : Math.abs(n) >= 100 || Number.isInteger(n) ? String(Math.round(n)) : n >= 1 ? n.toFixed(1) : n.toFixed(4)
const sumOf = (s: SessionStats, suffix: string) =>
  Object.entries(s.metrics).reduce((t, [k, m]) => (k.endsWith(suffix) && !k.includes('.failed.') ? t + m.sum : t), 0)
const countOf = (s: SessionStats, re: RegExp) => Object.entries(s.metrics).reduce((t, [k, m]) => (re.test(k) ? t + m.count : t), 0)

// The report om_stats and /om-stats answer: totals, then one row per metric. Durations are ms, cost USD.
export function formatReport(title: string, merged: ReturnType<typeof merge>) {
  const { stats: s, sessions, approximate } = merged
  if (!sessions) return `${title}: no stats recorded yet.`
  const calls = countOf(s, /^(observer|reflector)\.\w+\.(failed\.)?ms$/)
  const failed = countOf(s, /\.failed\.ms$/)
  const compactions = countOf(s, /^compaction\.[\w-]+\.ms$/)
  const when = (t: number) => (Number.isFinite(t) ? new Date(t).toISOString().slice(0, 16).replace('T', ' ') : '-')
  const lines = [
    `## ${title}`,
    '',
    `${sessions} session(s), ${when(s.firstSeen)} to ${when(s.lastSeen)} UTC. ${compactions} compaction(s), ${calls} Luna call(s) ` +
      `(${failed} failed), $${sumOf(s, '.cost').toFixed(4)}, ${sumOf(s, '.in')} tokens in, ${sumOf(s, '.out')} out.`,
    '',
    '| metric | count | sum | mean | median | p90 | min | max |',
    '|---|---|---|---|---|---|---|---|',
  ]
  for (const k of Object.keys(s.metrics).sort()) {
    const m = s.metrics[k]!
    const sorted = m.recent.map(([, v]) => v).sort((a, b) => a - b)
    lines.push(`| ${k} | ${m.count} | ${num(m.sum)} | ${num(m.sum / m.count)} | ${num(percentile(sorted, 50))} | ${num(percentile(sorted, 90))} | ${num(m.min)} | ${num(m.max)} |`)
  }
  const counts = Object.entries(s.counts).sort(([a], [b]) => a.localeCompare(b))
  if (counts.length) lines.push('', `Counts: ${counts.map(([k, n]) => `${k} ${n}`).join(', ')}`)
  if (approximate) lines.push('', `Medians and p90 are approximate: they come from the newest ${SAMPLES} samples per metric per session.`)
  return lines.join('\n')
}

// The engine-facing half. The engine never lets `$` cross an import, so register.ts hands over these calls instead.
export type Io = {
  now: () => Promise<number>
  sessionId: () => Promise<string>
  cwd: () => Promise<string>
  home: () => Promise<string | undefined>
  dir: () => Promise<string | undefined> // OM_STATS_DIR
  read: (path: string) => Promise<string>
  write: (path: string, text: string) => Promise<void>
  list: (path: string) => Promise<{ name: string; kind: string }[]>
  after: (ms: number, fn: () => void) => { cancel: () => void }
  log: (text: string) => void
}

// The sessions this process has touched, each loaded once and written after a pause.
const live = new Map<string, Promise<SessionStats>>()
const pending = new Map<string, { cancel: () => void }>()
let warned = false

function warn(io: Io, error: unknown) {
  if (warned) return
  warned = true
  io.log(`stats not saved (${error instanceof Error ? error.message : String(error)}); carrying on without them`)
}

export async function statsDir(io: Io) {
  const dir = await io.dir()
  if (dir) return dir.replace(/\/$/, '')
  const home = await io.home()
  if (!home) throw new Error('no HOME to keep stats under')
  return `${home}/${DEFAULT_DIR}`
}

const parse = (text: string) => JSON.parse(text) as SessionStats

async function load(io: Io, sessionId: string) {
  const stored = await io.read(`${await statsDir(io)}/${sessionId}.json`).then(parse, () => undefined)
  if (stored?.version === 1) return { ...stored, backfilled: undefined } // a resumed or backfilled session continues
  const [now, cwd] = await Promise.all([io.now(), io.cwd().catch(() => undefined)])
  return emptyStats(sessionId, now, cwd)
}

async function write(io: Io, sessionId: string) {
  pending.get(sessionId)?.cancel()
  pending.delete(sessionId)
  const s = await live.get(sessionId)
  if (s) await io.write(`${await statsDir(io)}/${sessionId}.json`, JSON.stringify(s))
}

// Applies `fn` to the session's stats and schedules the write. Never throws, never waits on the file system.
export function record(io: Io, sessionId: string, fn: (s: SessionStats, at: number) => void) {
  if (!live.has(sessionId)) {
    const loading = load(io, sessionId)
    loading.catch(() => live.delete(sessionId))
    live.set(sessionId, loading)
  }
  void (async () => {
    const [s, at] = await Promise.all([live.get(sessionId)!, io.now()])
    fn(s, at)
    s.lastSeen = Math.max(s.lastSeen, at)
    if (!pending.has(sessionId)) pending.set(sessionId, io.after(WRITE_DELAY_MS, () => void write(io, sessionId).catch((e) => warn(io, e))))
  })().catch((e) => warn(io, e))
}

// Writes a session's pending stats now: at the session's end, and before a report reads the files.
export async function flush(io: Io, sessionId: string) {
  if (pending.has(sessionId)) await write(io, sessionId).catch((e) => warn(io, e))
}

// `all`, or one session (this one by default), optionally only since `7d` or an ISO date.
export async function report(io: Io, args: { scope?: string; sessionId?: string; since?: string }) {
  const [current, now] = await Promise.all([io.sessionId(), io.now()])
  const since = args.since ? parseSince(args.since, now) : undefined
  if (args.since && since === undefined) return `om_stats: cannot read since "${args.since}" (try 7d, 12h or 2026-09-01).`
  await flush(io, current)
  const dir = await statsDir(io)
  const read = (name: string) => io.read(`${dir}/${name}`).then(parse, () => undefined)
  let files: SessionStats[]
  let title: string
  if (args.scope === 'all') {
    const names = (await io.list(dir).catch(() => [])).filter((e) => e.kind === 'file' && e.name.endsWith('.json')).map((e) => e.name)
    files = (await Promise.all(names.map(read))).filter((f): f is SessionStats => f?.version === 1)
    title = 'observational-memory stats, all sessions'
  } else {
    const id = args.sessionId || current
    const f = (await live.get(id)?.catch(() => undefined)) ?? (await read(`${id}.json`))
    files = f ? [f] : []
    title = `observational-memory stats, session ${id}${f?.cwd ? ` (${f.cwd})` : ''}`
  }
  if (since !== undefined) title += ` since ${new Date(since).toISOString().slice(0, 16).replace('T', ' ')} UTC`
  return formatReport(title, merge(files, since))
}

export function parseArgs(text: string) {
  const out: { scope?: string; sessionId?: string; since?: string } = {}
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (word === 'all' || word === 'session') out.scope = word
    else if (/^\d+(?:\.\d+)?[mhdw]$/.test(word) || /^\d{4}-\d{2}-\d{2}/.test(word)) out.since = word
    else out.sessionId = word
  }
  return out
}
