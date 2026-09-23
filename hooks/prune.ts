import type { EngineInterface, On, SessionStartInput, SessionStartResult } from 'claude-code'

// `$.store` is one JSON file capped at 4 MiB, and each session leaves its keys (`<kind>:<sessionId>`) behind.
const PRUNE_AFTER_DAYS = 30
const DAY = 24 * 60 * 60 * 1000
const STORE_CAP = 4 * 1024 * 1024
const KINDS = ['ledger', 'times', 'live', 'skills', 'transcript', 'seen']

type Session = { id: string; keys: string[]; at?: number; bytes: number }

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))
const size = (value: unknown) => JSON.stringify(value)?.length ?? 0

// Each session's keys and last activity: its newest turn time, or failing that when the pruner first saw it.
async function sessions($: EngineInterface) {
  const all = new Map<string, Session>()
  for (const key of await $.store.keys()) {
    const at = key.indexOf(':')
    if (!KINDS.includes(key.slice(0, at))) continue
    const id = key.slice(at + 1)
    const s = all.get(id) ?? all.set(id, { id, keys: [], bytes: 0 }).get(id)!
    s.keys.push(key)
    const value = await $.store.get(key)
    s.bytes += key.length + size(value)
    const times = key.startsWith('times:') && Array.isArray(value) ? value.map((m) => Number(m?.at) || 0) : []
    const seen = key.startsWith('seen:') && typeof value === 'number' ? [value] : []
    for (const t of [...times, ...seen]) s.at = Math.max(s.at ?? 0, t)
  }
  return [...all.values()]
}

async function drop($: EngineInterface, gone: Session[], why: string) {
  for (const s of gone) for (const key of s.keys) await $.store.delete(key)
  if (gone.length)
    $.ui.log(
      `pruned ${gone.length} session(s) ${why}: ${gone.map((s) => s.id).join(', ')} ` +
        `(${gone.reduce((n, s) => n + s.keys.length, 0)} keys, ~${Math.round(gone.reduce((n, s) => n + s.bytes, 0) / 1024)} KiB)`,
    )
}

// Drops every session untouched for PRUNE_AFTER_DAYS but the current one; one with no time is stamped now.
async function prune($: EngineInterface, current: string) {
  const now = await $.clock.now()
  const all = (await sessions($)).filter((s) => s.id !== current)
  for (const s of all.filter((s) => s.at === undefined)) await $.store.set(`seen:${s.id}`, now)
  await drop($, all.filter((s) => s.at !== undefined && now - s.at > PRUNE_AFTER_DAYS * DAY), `untouched for ${PRUNE_AFTER_DAYS} days`)
}

let lastRun: number | undefined

// In the background, at most once a day per process.
async function start($: EngineInterface, e: SessionStartInput, next: (e: SessionStartInput) => Promise<SessionStartResult>) {
  void $.clock
    .now()
    .then(async (now) => {
      if (lastRun !== undefined && now - lastRun < DAY) return
      lastRun = now
      await prune($, await $.session.id())
    })
    .catch((error) => $.ui.log(`could not prune old sessions (${errorText(error)})`))
  return next(e)
}

export function registerPrune(on: On) {
  // register.ts holds the bare session.start hook; a matcher per value of isInteractive covers every session.
  on('session.start', { isInteractive: true }, start)
  on('session.start', { isInteractive: false }, start)
  // A write the cap refuses: drop the oldest other sessions until it fits, then write again.
  on('store.set', async ($, e, next) => {
    try {
      return await next(e)
    } catch (error) {
      const current = await $.session.id()
      const all = await sessions($)
      let total = all.reduce((n, s) => n + s.bytes, 0) + size(e.value) - size(await $.store.get(e.key)) // the value it replaces
      if (total < STORE_CAP * 0.9 && !/MiB|size|limit|large/i.test(errorText(error))) throw error
      const gone: Session[] = []
      for (const s of all.filter((s) => s.id !== current).sort((a, b) => (a.at ?? 0) - (b.at ?? 0))) {
        if (total < STORE_CAP * 0.75) break
        gone.push(s)
        total -= s.bytes
      }
      await drop($, gone, 'to fit the store under its size cap')
      return next(e)
    }
  })
}
