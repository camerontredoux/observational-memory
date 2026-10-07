import { atom, read, update } from 'claude-code'
import type { On } from 'claude-code'
import type { Worker } from '../types'
import { errorText } from './prune'

// The band above the prompt while the Observer or the Reflector runs in the background, drawn as
// pi-observational-memory draws its widget: `◐ [observer]` spinning while a call runs, then `✓ [observer] +4` or
// `✗ [observer]` for SETTLED_MS once it ends. register.ts starts and settles the workers; this module draws them, and
// a tick moves the spinner and drops the settled ones. The values live in $.state so a tick redraws the band alone,
// not every transcript row this plugin's other render hooks select.
const FRAMES = ['◐', '◓', '◑', '◒']
const FRAME_MS = 120
const SETTLED_MS = 5_000
// pi's github-dark-default theme: accent, success, error and muted.
const ACCENT = '#2f81f7'
const SUCCESS = '#3fb950'
const ERROR = '#f85149'
const MUTED = '#7d8590'

const workers = atom({ plugin: 'observational-memory', key: 'workers' } as const, [] as Worker[])
const frame = atom({ plugin: 'observational-memory', key: 'frame' } as const, 0)

// A worker's id names the load of this code that started it. A hot reload cancels the old code's pending waits, so a
// worker it started never settles: the new load's session.start drops it, or it would spin until the session ends.
const LOAD = Math.random().toString(36).slice(2, 8)
let seq = 0
export const newWorker = (kind: Worker['kind']): Worker => ({ id: `${kind}-${LOAD}-${++seq}`, kind })
const orphaned = (w: Worker) => !w.settled && !w.id.startsWith(`${w.kind}-${LOAD}-`)
export const started = (worker: Worker) => (ws: Worker[]) => [...ws, worker]
// `outcome` undefined drops the worker at once: its call ended with the loop, or its result was discarded.
export const settled = (worker: Worker, at: number, outcome: { added?: number } | 'failed' | undefined) => (ws: Worker[]) =>
  outcome === undefined
    ? ws.filter((w) => w.id !== worker.id)
    : ws.map((w) => (w.id === worker.id ? { ...w, settled: outcome === 'failed' ? { at, failed: true as const } : { at, ...outcome } } : w))

export const registerWorkers = (on: On) => {
  on('session.start', { isInteractive: true }, async ($, e, next) => {
    await update($, workers, (ws) => (ws.some(orphaned) ? ws.filter((w) => !orphaned(w)) : ws)).catch((error) =>
      $.ui.log(`the workers band could not drop a reload's workers (${errorText(error)})`, { to: 'debug' }),
    )
    $.clock.every(FRAME_MS, async () => {
      try {
        const ws = await read($, workers)
        if (!ws.length) return
        const now = await $.clock.now()
        if (ws.some((w) => w.settled && now - w.settled.at >= SETTLED_MS))
          await update($, workers, (all) => all.filter((w) => !w.settled || now - w.settled.at < SETTLED_MS))
        if (ws.some((w) => !w.settled)) await update($, frame, (f) => (f + 1) % FRAMES.length)
      } catch (error) {
        $.ui.log(`the workers band could not tick (${errorText(error)})`, { to: 'debug' })
      }
    })
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const ws = await read($, workers)
    if (!ws.length || e.props.hasSurvey) return next(e)
    const spinner = FRAMES[await read($, frame)] ?? FRAMES[0]
    const { Box, Text } = $.ui.resolve(e)
    const segment = (w: Worker) => {
      const label = `[${w.kind}]`
      if (!w.settled) return Text({ color: ACCENT, children: [`${spinner} ${label}`] })
      if (w.settled.failed) return Text({ children: [Text({ color: ERROR, children: ['✗'] }), Text({ color: MUTED, children: [` ${label}`] })] })
      const added = w.settled.added ? [Text({ color: SUCCESS, children: [` +${w.settled.added}`] })] : []
      return Text({ children: [Text({ color: SUCCESS, children: ['✓'] }), Text({ color: MUTED, children: [` ${label}`] }), ...added] })
    }
    // The band alone while it shows: the engine's own (an opaque element) draws a blank row under it.
    return Box({ flexDirection: 'row', columnGap: 3, children: ws.map(segment) })
  })
}

// The footer's figures, which register.ts writes for the status line script: O is the history waiting for an Observer
// call against a chunk, C the observations against a reflection, X the context against auto-compaction, and the
// dollars what the model calls have cost.
export type Gauges = { pending: number; chunk: number; ledger: number; reflectAt: number; context?: number; compactAt?: number; cost: number }
