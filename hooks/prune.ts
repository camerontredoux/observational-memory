import type { EngineInterface, On, SessionStartInput, SessionStartResult } from 'claude-code'
import { clipLine } from './stats'

// `$.store` is one JSON file capped at 4 MiB, and each session leaves its keys (`<kind>:<sessionId>`) behind.
//
// Every Claude Code process shares that file, so pruning is not atomic across them (see TODO.md). It narrows the
// window instead: just before deleting a session it lists and reads the session's keys again, its subagents'
// included, and asks the sessions registry again which sessions run, deleting nothing when that cannot be told.
const PRUNE_AFTER_DAYS = 30
const DAY = 24 * 60 * 60 * 1000
const STORE_CAP = 4 * 1024 * 1024
const PRUNE_TO = 0.6 // the daily run drops the oldest sessions until the store is under this share of its cap
// Every kind of session key: register.ts builds its keys with `key`, so a kind it stores is one this prunes.
export const KINDS = ['ledger', 'times', 'live', 'skills', 'turns', 'transcript', 'seen', 'goal'] as const
export const key = (kind: (typeof KINDS)[number], id: string) => `${kind}:${id}`
const LAST_RUN = 'prune:last' // outside KINDS: shared by every process, never pruned
// Kinds v0.3 and v0.4 stored and nothing reads now: the daily run deletes their keys, whatever their session.
const LEGACY = /^(fork|buffer):/
// The engine's refusal of a write that would take the whole file over its cap.
const CAP_ERROR = /the store would be \d+ characters, over the \d+ limit/

type Session = { id: string; keys: string[]; at?: number; bytes: number }

// The session a key belongs to, or none: a subagent's keys, `<kind>:<session>/<agent>`, go with its session.
function sessionOf(key: string) {
  const at = key.indexOf(':')
  return at < 1 || !(KINDS as readonly string[]).includes(key.slice(0, at)) ? undefined : { kind: key.slice(0, at), id: key.slice(at + 1).split('/')[0]! }
}

export const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))
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
    const of = sessionOf(key)
    if (!of) continue
    const { kind, id } = of
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

// Deletes each session unless, checked again just before, it is the current one, has a key the scan did not list
// (a subagent started since), `stale` no longer holds of its newest time across its own and its subagents' keys, or
// it runs now (resumed since). When which sessions run cannot be told, it stops and rejects, deleting no more. It
// stops too once `enough` answers true after a deletion. Returns the sessions deleted, sized as they were read.
async function drop(
  $: EngineInterface,
  gone: Session[],
  why: string,
  stale: (s: Session, at: number | undefined) => boolean,
  enough: () => Promise<boolean> = async () => false,
) {
  const dropped: Session[] = []
  try {
    for (const s of gone) {
      if (s.id === (await $.session.id())) continue
      const keys = (await $.store.keys()).filter((k) => sessionOf(k)?.id === s.id)
      if (keys.some((k) => !s.keys.includes(k))) continue
      const times: number[] = []
      let bytes = 0
      for (const key of keys) {
        const value = await $.store.get(key)
        bytes += key.length + size(value)
        times.push(...timesOf(sessionOf(key)!.kind, value))
      }
      if (!stale(s, latest(times)) || (await liveSessions($)).has(s.id)) continue
      for (const key of keys) await $.store.delete(key)
      dropped.push({ ...s, keys, bytes })
      if (await enough()) break
    }
  } finally {
    if (dropped.length)
      $.ui.log(
        `pruned ${dropped.length} session(s) ${why}: ${dropped.map((s) => s.id).join(', ')} ` +
          `(${dropped.reduce((n, s) => n + s.keys.length, 0)} keys${why.includes('cap') ? `, ~${Math.round(dropped.reduce((n, s) => n + s.bytes, 0) / 1024)} KiB` : ''})`,
        { to: 'debug' },
      )
  }
  return dropped
}

// Deletes the legacy keys, then drops every session untouched for PRUNE_AFTER_DAYS, then the oldest until the store
// is under PRUNE_TO of its cap, but the current one and those still running; one with no time is stamped now and kept.
async function prune($: EngineInterface, current: string) {
  const now = await $.clock.now()
  const old = (at: number | undefined) => at !== undefined && now - at > PRUNE_AFTER_DAYS * DAY
  const legacy = (await $.store.keys()).filter((k) => LEGACY.test(k))
  for (const k of legacy) await $.store.delete(k)
  if (legacy.length) $.ui.log(`deleted ${legacy.length} legacy fork: and buffer: key(s)`, { to: 'debug' })
  const scanned = await sessions($, true)
  const all = scanned.filter((s) => s.id !== current)
  for (const s of all.filter((s) => s.at === undefined)) await $.store.set(key('seen', s.id), now)
  const candidates = all.filter((s) => old(s.at))
  let total = scanned.reduce((n, s) => n + s.bytes, 0)
  if (!candidates.length && total < STORE_CAP * PRUNE_TO) return
  const live = await liveSessions($)
  const aged = await drop($, candidates.filter((s) => !live.has(s.id)), `untouched for ${PRUNE_AFTER_DAYS} days`, (_, at) => old(at))
  total -= aged.reduce((n, s) => n + s.bytes, 0)
  const gone: Session[] = []
  for (const s of all.filter((s) => !old(s.at) && !live.has(s.id) && s.at !== undefined).sort((a, b) => a.at! - b.at!)) {
    if (total < STORE_CAP * PRUNE_TO) break
    gone.push(s)
    total -= s.bytes
  }
  await drop($, gone, `to keep the store under ${PRUNE_TO * 100}% of its size cap`, (s, at) => at !== undefined && at <= s.at!)
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
    $.ui.log(`Cleanup failed (${clipLine(errorText(error))}) and will retry tomorrow`)
  })
  return next(e)
}

export function registerPrune(on: On) {
  // register.ts holds the bare session.start hook; a matcher per value of isInteractive covers every session.
  on('session.start', { isInteractive: true }, start)
  on('session.start', { isInteractive: false }, start)
  // A write the cap refuses, a last resort behind the daily run: drop the oldest other session not running and write
  // again, until it fits. Sessions are ordered by their times alone, never sized.
  on('store.set', async ($, e, next) => {
    // The write, or undefined when the cap refuses it: in the engine's wording, as core's rejection or a `{ deny }`
    // from a hook beneath.
    const write = () =>
      next(e).then(
        (r) => (CAP_ERROR.test(r.deny ?? '') ? undefined : r),
        (error) => (CAP_ERROR.test(errorText(error)) ? undefined : Promise.reject(error)),
      )
    let written = await write()
    // Where it cannot prune, the refused write is made again for its refusal to reach the caller.
    if (written || (await $.env.get('OM_NO_PRUNE'))) return written ?? next(e)
    const [current, live] = await Promise.all([$.session.id(), liveSessions($).catch(() => undefined)])
    if (!live) return next(e)
    // A session with no time yet may have just started: it is left alone.
    const gone = (await sessions($, false)).filter((s) => s.id !== current && !live.has(s.id) && s.at !== undefined).sort((a, b) => a.at! - b.at!)
    const fits = async () => !!(written = await write())
    // Liveness that cannot be told again stops the drops; the write is tried with the room already made.
    await drop($, gone, 'to fit the store under its size cap', (s, at) => at !== undefined && at <= s.at!, fits).catch((error) =>
      $.ui.log(`could not prune to fit the store under its size cap (${errorText(error)})`, { to: 'debug' }),
    )
    return written ?? next(e)
  })
}
