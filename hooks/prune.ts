import type { EngineInterface, On, SessionStartInput, SessionStartResult } from 'claude-code'
import { brief } from './stats'

// `$.store` is one JSON file capped at 4 MiB, and each session leaves its keys (`<kind>:<sessionId>`) behind.
const PRUNE_AFTER_DAYS = 30
const DAY = 24 * 60 * 60 * 1000
const STORE_CAP = 4 * 1024 * 1024
const KINDS = ['ledger', 'times', 'live', 'skills', 'turns', 'transcript', 'seen']
const LAST_RUN = 'prune:last' // outside KINDS: shared by every process, never pruned
// The engine's refusal of a write that would take the whole file over its cap.
const CAP_ERROR = /the store would be \d+ characters, over the \d+ limit/

type Session = { id: string; keys: string[]; at?: number; bytes: number }

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))
const size = (value: unknown) => JSON.stringify(value)?.length ?? 0
const valid = (t: unknown) => (typeof t === 'number' && Number.isFinite(t) && t > 0 ? [t] : [])
// A session's last activity from its `times:` or `seen:` value; a malformed mark counts for nothing.
const timesOf = (kind: string, value: unknown) =>
  kind === 'times' && Array.isArray(value) ? value.flatMap((m) => valid(m?.at)) : kind === 'seen' ? valid(value) : []
const latest = (times: number[]) => (times.length ? Math.max(...times) : undefined)

// Each session's keys and last activity: its newest turn time, or failing that when the pruner first saw it.
// Sizes, which need every value read, only when asked.
async function sessions($: EngineInterface, withSizes: boolean) {
  const all = new Map<string, Session & { times: number[] }>()
  for (const key of await $.store.keys()) {
    const at = key.indexOf(':')
    if (at < 1) continue
    const kind = key.slice(0, at)
    if (!KINDS.includes(kind)) continue
    const id = key.slice(at + 1).split('/')[0]! // a subagent's keys, `<kind>:<session>/<agent>`, go with its session
    const s = all.get(id) ?? all.set(id, { id, keys: [], bytes: 0, times: [] }).get(id)!
    s.keys.push(key)
    if (!withSizes && kind !== 'times' && kind !== 'seen') continue
    const value = await $.store.get(key)
    if (withSizes) s.bytes += key.length + size(value)
    s.times.push(...timesOf(kind, value))
  }
  return [...all.values()].map(({ times, ...s }): Session => ({ ...s, at: latest(times) }))
}

// The sessions whose process still runs, from the engine's registry: `<config>/sessions/<pid>.json`. Rejects when
// that cannot be told, so the caller prunes nothing.
async function liveSessions($: EngineInterface) {
  const home = await $.env.get('HOME')
  const root = (await $.env.get('CLAUDE_CONFIG_DIR')) ?? (home ? `${home}/.claude` : undefined)
  if (!root) throw new Error('no HOME to find the sessions folder')
  if (!(await $.fs.exists('/proc/self'))) throw new Error('no /proc to tell which sessions run')
  const dir = `${root}/sessions`
  const live = new Set<string>()
  for (const f of await $.fs.list(dir)) {
    if (f.kind !== 'file' || !f.name.endsWith('.json')) continue
    const s = JSON.parse(String(await $.fs.read(`${dir}/${f.name}`)))
    if (typeof s?.sessionId !== 'string') throw new Error(`${f.name} names no session`)
    if (await isAlive($, s.pid, s.procStart)) live.add(s.sessionId)
  }
  return live
}

// Alive unless its /proc entry is gone or now belongs to a process started at another tick (a reused pid).
async function isAlive($: EngineInterface, pid: unknown, procStart: unknown) {
  if (typeof pid !== 'number') return true
  if (!(await $.fs.exists(`/proc/${pid}`))) return false
  if (typeof procStart !== 'string') return true
  const stat = await $.fs.read(`/proc/${pid}/stat`).then(String, () => undefined)
  const started = stat?.slice(stat.lastIndexOf(')') + 2).split(' ')[19] // field 22, after the command's parentheses
  return started === undefined || started === procStart
}

// Deletes each session unless, read again just before, it is the current one or `stale` no longer holds of its time.
async function drop($: EngineInterface, gone: Session[], why: string, stale: (s: Session, at: number | undefined) => boolean) {
  const dropped: Session[] = []
  for (const s of gone) {
    if (s.id === (await $.session.id())) continue
    const [times, seen] = await Promise.all([$.store.get(`times:${s.id}`), $.store.get(`seen:${s.id}`)])
    if (!stale(s, latest([...timesOf('times', times), ...timesOf('seen', seen)]))) continue
    for (const key of s.keys) await $.store.delete(key)
    dropped.push(s)
  }
  if (dropped.length)
    $.ui.log(
      `pruned ${dropped.length} session(s) ${why}: ${dropped.map((s) => s.id).join(', ')} ` +
        `(${dropped.reduce((n, s) => n + s.keys.length, 0)} keys${why.includes('cap') ? `, ~${Math.round(dropped.reduce((n, s) => n + s.bytes, 0) / 1024)} KiB` : ''})`,
      { to: 'debug' },
    )
}

// Drops every session untouched for PRUNE_AFTER_DAYS but the current one and those still running; one with no
// time is stamped now.
async function prune($: EngineInterface, current: string) {
  const now = await $.clock.now()
  const old = (at: number | undefined) => at !== undefined && now - at > PRUNE_AFTER_DAYS * DAY
  const all = (await sessions($, false)).filter((s) => s.id !== current)
  for (const s of all.filter((s) => s.at === undefined)) await $.store.set(`seen:${s.id}`, now)
  const candidates = all.filter((s) => old(s.at))
  if (!candidates.length) return
  const live = await liveSessions($)
  await drop($, candidates.filter((s) => !live.has(s.id)), `untouched for ${PRUNE_AFTER_DAYS} days`, (_, at) => old(at))
}

// In the background, at most once a day across every process sharing the store.
async function start($: EngineInterface, e: SessionStartInput, next: (e: SessionStartInput) => Promise<SessionStartResult>) {
  void (async () => {
    if (await $.env.get('OM_NO_PRUNE')) return
    const [now, last] = await Promise.all([$.clock.now(), $.store.get(LAST_RUN)])
    if (valid(last).length && now - (last as number) < DAY) return
    await $.store.set(LAST_RUN, now)
    await prune($, await $.session.id())
  })().catch((error) => {
    $.ui.log(`could not prune old sessions (${errorText(error)})`, { to: 'debug' })
    $.ui.log(`Cleanup failed (${brief(errorText(error))}) and will retry tomorrow`)
  })
  return next(e)
}

export function registerPrune(on: On) {
  // register.ts holds the bare session.start hook; a matcher per value of isInteractive covers every session.
  on('session.start', { isInteractive: true }, start)
  on('session.start', { isInteractive: false }, start)
  // A write the cap refuses: drop the oldest other sessions not running until it fits, then write again.
  on('store.set', async ($, e, next) => {
    try {
      return await next(e)
    } catch (error) {
      if (await $.env.get('OM_NO_PRUNE')) throw error
      const all = await sessions($, true)
      let total = all.reduce((n, s) => n + s.bytes, 0) + size(e.value) - size(await $.store.get(e.key)) // the value it replaces
      // Only the cap: the engine's refusal, or failing its wording a write that measurably cannot fit.
      if (!CAP_ERROR.test(errorText(error)) && total <= STORE_CAP) throw error
      const [current, live] = await Promise.all([$.session.id(), liveSessions($).catch(() => undefined)])
      if (!live) throw error
      const gone: Session[] = []
      // A session with no time yet may have just started: it is left alone.
      for (const s of all.filter((s) => s.id !== current && !live.has(s.id) && s.at !== undefined).sort((a, b) => a.at! - b.at!)) {
        if (total < STORE_CAP * 0.75) break
        gone.push(s)
        total -= s.bytes
      }
      await drop($, gone, 'to fit the store under its size cap', (s, at) => at !== undefined && at <= s.at!)
      return next(e)
    }
  })
}
