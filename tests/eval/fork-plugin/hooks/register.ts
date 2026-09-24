// Evaluation only: issue #16's fork and fork+recall configurations. Compaction the way Codex does it: the session's own
// model writes a handoff to its successor with `$.model.fork`, over its own cached transcript, and the compacted
// context is the user's messages verbatim, that handoff as the assistant's own message, and the messages after the
// fork point. No observation, reflection or memory: nothing of hooks/register.ts runs here. handoff.ts holds the
// prompts and builds the context; recall-hooks.ts is the recall-only plugin's om_recall, which the fork configuration
// disallows with --disallowed-tools, as om does.
//
// - Early: once a main-thread step's context passes EARLY_FRACTION of the auto-compact threshold, the handoff is
//   forked in the background, so it is ready when compaction comes and a context already over its limit never has to
//   be sent again. It is forked afresh once the context grows REFORK_FRACTION of the threshold past it.
// - At compaction: the early handoff when it answered and its raw tail is under TAIL_MAX_TOKENS (one still in flight
//   is waited for, up to FORK_WAIT_MS); else a fork now. With no handoff either way the built-in compaction runs, and
//   the stats count a fallback.
// - Main conversation only: a subagent's compaction is the built-in one; a precompute is skipped (nothing to keep).
// - Stats: every fork's usage (cache reads among it), time and outcome, and every compaction's path, time and the gap
//   between its handoff and it, in $OM_STATS_DIR/<session>.json (bench.ts parseStats reads them).
//
// scripts/bench-live.ts copies this directory into a run's sandbox with the plugin version's recall.ts and prompts.ts
// and the recall-only plugin's register.ts (as recall-hooks.ts) beside it.
import type { EngineInterface, ModelUsage, Register, SessionCompactInput, SessionMessage } from 'claude-code'
import {
  anchorAt,
  compactedContext,
  EARLY_FRACTION,
  estimateTokens,
  FORK_WAIT_MS,
  forkBriefing,
  forkPoint,
  handoffPrompt,
  locate,
  REFORK_FRACTION,
  rowTokens,
  TAIL_MAX_TOKENS,
  typed,
} from './handoff'
import type { Anchor } from './handoff'
import { register as registerRecall } from './recall-hooks'

const RECALL_TOOL_NAME = 'om_recall'
const GIT_TIMEOUT_MS = 5_000
const ENV_FILES_MAX = 20
const ENV_LINE_MAX_CHARS = 200

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))
const log = ($: EngineInterface, text: string) => $.ui.log(`fork-handoff: ${text}`, { to: 'debug' })
const show = ($: EngineInterface, text: string) => $.ui.log(`fork-handoff: ${text}`)
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

// ---- One session's state, in this process ----

type Handoff = { text: string; usage: ModelUsage; anchor: Anchor; startedAt: number; readyAt: number }
type Fork = { phase: 'early' | 'compaction'; startedAt: number; tokens: number; anchor: Anchor; result: Promise<Handoff | undefined> }
type Session = { threshold?: number; model?: string; fork?: Fork; stats: Stats; writing: Promise<void> }

type Stats = {
  version: 1
  sessionId: string
  model?: string
  counts: Record<string, number>
  metrics: Record<string, { count: number; sum: number }>
  forks: { phase: Fork['phase']; outcome: string; ms: number; usage?: ModelUsage; contextTokens?: number }[]
  compactions: { trigger: string; path: 'early' | 'compaction' | 'fellBack'; ms: number; gapMs?: number; handoffTokens?: number; tailRows?: number; tailTokens?: number; userMessages?: number }[]
}

const sessions = new Map<string, Session>()
const sessionOf = (id: string) => {
  let s = sessions.get(id)
  if (!s) sessions.set(id, (s = { stats: { version: 1, sessionId: id, counts: {}, metrics: {}, forks: [], compactions: [] }, writing: Promise.resolve() }))
  return s
}

const count = (s: Stats, key: string, n = 1) => void (s.counts[key] = (s.counts[key] ?? 0) + n)
const add = (s: Stats, key: string, value: number) => {
  const m = (s.metrics[key] ??= { count: 0, sum: 0 })
  m.count++
  m.sum += value
}

// Written whole after each change, one write at a time; nowhere without OM_STATS_DIR.
function save($: EngineInterface, s: Session) {
  s.writing = s.writing
    .then(async () => {
      const dir = await $.env.get('OM_STATS_DIR')
      if (dir) await $.fs.write(`${dir.replace(/\/$/, '')}/${s.stats.sessionId}.json`, JSON.stringify(s.stats))
    })
    .catch((error) => log($, `stats not saved (${errorText(error)})`))
}

function noteFork($: EngineInterface, s: Session, phase: Fork['phase'], outcome: string, ms: number, usage?: ModelUsage, contextTokens?: number) {
  const st = s.stats
  st.model = s.model ?? st.model
  st.forks.push({ phase, outcome, ms, ...(usage ? { usage } : {}), ...(contextTokens ? { contextTokens } : {}) })
  count(st, outcome === 'answered' ? `fork.${phase}.answered` : `fork.${phase}.failed.${outcome}`)
  add(st, `fork.${phase}.ms`, ms)
  if (usage) {
    add(st, `fork.${phase}.input`, usage.input_tokens)
    add(st, `fork.${phase}.output`, usage.output_tokens)
    add(st, `fork.${phase}.cacheRead`, usage.cache_read_input_tokens)
    add(st, `fork.${phase}.cacheWrite`, usage.cache_creation_input_tokens)
  }
  save($, s)
}

// ---- Forking ----

// One fork: the handoff when the model answered with text, else undefined (the reason logged and counted).
function fork($: EngineInterface, s: Session, phase: Fork['phase'], rows: readonly SessionMessage[], startedAt: number, tokens: number, instructions?: string): Fork | undefined {
  const at = forkPoint(rows)
  if (at === undefined) return undefined
  const anchor = anchorAt(rows, at)
  const result = $.model
    .fork({ prompt: handoffPrompt(instructions) })
    .then(async (r) => {
      const readyAt = await $.clock.now()
      const usage = 'usage' in r ? r.usage : undefined
      const outcome = r.isAnswered ? (r.text.trim() ? 'answered' : 'empty-reply') : r.reason
      noteFork($, s, phase, outcome, readyAt - startedAt, usage, tokens || undefined)
      log(
        $,
        `${phase} fork ${outcome} in ${seconds(readyAt - startedAt)}` +
          (usage ? `: ${usage.input_tokens} in, ${usage.cache_read_input_tokens} cache read, ${usage.cache_creation_input_tokens} cache write, ${usage.output_tokens} out` : ''),
      )
      return r.isAnswered && r.text.trim() ? { text: r.text, usage: r.usage, anchor, startedAt, readyAt } : undefined
    })
    .catch(async (error) => {
      noteFork($, s, phase, 'error', (await $.clock.now()) - startedAt)
      log($, `${phase} fork failed: ${errorText(error)}`)
      return undefined
    })
  return { phase, startedAt, tokens, anchor, result }
}

// The auto-compact threshold, once per session: the breakdown's, else the window's.
async function thresholdOf($: EngineInterface, s: Session) {
  if (s.threshold === undefined) {
    const usage = await $.session.usage({ breakdown: 'summary' })
    s.threshold = usage.context.breakdown?.autoCompactThreshold ?? usage.context.breakdown?.rawMaxTokens ?? usage.context.window
  }
  return s.threshold
}

// After a main-thread step: past EARLY_FRACTION of the threshold, fork the handoff in the background, unless one
// forked (or forking) within REFORK_FRACTION of the threshold of this context.
async function maybeFork($: EngineInterface, usage: ModelUsage) {
  const tokens = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens + usage.output_tokens
  const s = sessionOf(await $.session.id())
  const threshold = await thresholdOf($, s)
  if (tokens < EARLY_FRACTION * threshold) return
  if (s.fork && tokens - s.fork.tokens < REFORK_FRACTION * threshold) return
  const [rows, startedAt] = await Promise.all([$.session.messages(), $.clock.now()])
  const f = fork($, s, 'early', rows, startedAt, tokens)
  if (!f) return
  s.fork = f
  log($, `context ${tokens} tokens, ${Math.round((tokens / threshold) * 100)}% of the ${threshold}-token threshold: forking the handoff early`)
}

// The early handoff, if it answered (waited for up to FORK_WAIT_MS) and its tail in `e.messages` is short enough.
async function early($: EngineInterface, s: Session, e: SessionCompactInput) {
  const f = s.fork
  if (!f || e.instructions?.trim()) return undefined
  let timer: { cancel: () => void } | undefined
  const late = new Promise<undefined>((resolve) => (timer = $.clock.after(FORK_WAIT_MS, () => resolve(undefined))))
  const h = await Promise.race([f.result, late])
  timer?.cancel()
  if (!h) return log($, 'the early handoff is missing (it failed, or is still in flight): forking now'), undefined
  const at = locate(e.messages, h.anchor)
  if (at === undefined) return log($, "the early handoff's fork point is not in the context: forking now"), undefined
  const tail = e.messages.slice(at)
  const tokens = rowTokens(tail)
  if (tokens > TAIL_MAX_TOKENS) return log($, `the early handoff is stale: ~${tokens} tokens came after it: forking now`), undefined
  return { h, tail }
}

// ---- The working directory, as hooks/register.ts's environmentOf reads it ----

async function environmentOf($: EngineInterface) {
  try {
    const cwd = await $.session.cwd()
    const git = (...args: string[]) =>
      $.process.run(['git', '--no-optional-locks', ...args], { cwd, timeoutMs: GIT_TIMEOUT_MS }).then((r) => {
        if (r.exitCode !== 0) throw new Error(`git ${args[0]} exited ${r.exitCode}`)
        return r.stdout
      })
    const [status, head] = await Promise.all([git('status', '--short', '--branch'), git('log', '-1', '--format=%h%x09%s')])
    const [branch, ...files] = status.split('\n').filter((l) => l.trim())
    const line = (text: string) => {
      const t = text.replace(/[\t\r]+/g, ' ').trimEnd()
      return t.length <= ENV_LINE_MAX_CHARS ? t : `${t.slice(0, ENV_LINE_MAX_CHARS - 1)}…`
    }
    return [
      line(`Working directory: ${cwd}`),
      ...(branch?.startsWith('## ') ? [line(`Branch: ${branch.slice(3)}`)] : []),
      ...(head.trim() ? [line(`HEAD: ${head.trim()}`)] : []),
      ...(files.length
        ? [`Uncommitted changes (git status --short, ${files.length} file${files.length === 1 ? '' : 's'}):`, ...files.slice(0, ENV_FILES_MAX).map(line), ...(files.length > ENV_FILES_MAX ? [`... and ${files.length - ENV_FILES_MAX} more`] : [])]
        : ['Uncommitted changes: none']),
    ].join('\n')
  } catch {
    return undefined
  }
}

const promptsKey = (sessionId: string) => `fork:prompts:${sessionId}`
const recallOffered = ($: EngineInterface) => $.tool.list().then((tools) => tools.some((t) => t.name === RECALL_TOOL_NAME), () => true)

export const register: Register = (on, options) => {
  registerRecall(on, options)

  on('session.compact', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    if (e.trigger === 'precompute') return { skip: 'fork-handoff: the handoff is forked at compaction, not ahead of it' }
    const [sessionId, started] = await Promise.all([$.session.id(), $.clock.now()])
    const s = sessionOf(sessionId)
    const trigger = e.trigger
    const fallBack = async (why: string) => {
      show($, `${why}. Using built-in compaction`)
      const r = await next(e)
      const ms = (await $.clock.now()) - started
      count(s.stats, `compaction.${trigger}.fellBack`)
      add(s.stats, 'compaction.ms', ms)
      s.stats.compactions.push({ trigger, path: 'fellBack', ms })
      s.fork = undefined
      save($, s)
      return r
    }
    let found = await early($, s, e)
    let path: 'early' | 'compaction' = 'early'
    if (!found) {
      const f = fork($, s, 'compaction', e.messages, started, 0, e.instructions)
      if (!f) return fallBack('No response to hand off from')
      const h = await f.result
      const at = h && locate(e.messages, h.anchor)
      if (!h || at === undefined) return fallBack('No handoff from the fork')
      found = { h, tail: e.messages.slice(at) }
      path = 'compaction'
    }
    const { h, tail } = found
    const tailFrom = e.messages.length - tail.length
    const key = promptsKey(sessionId)
    const [prior, environment, recall] = await Promise.all([
      $.store.get(key).then((v) => (Array.isArray(v) ? (v as string[]) : []), () => [] as string[]),
      environmentOf($),
      recallOffered($),
    ])
    const userMessages = [...prior, ...e.messages.slice(0, tailFrom).flatMap((m) => typed(m) ?? [])]
    const messages = compactedContext({ userMessages, ...(environment ? { environment } : {}), handoff: h.text, tail, recall })
    await $.store.set(key, userMessages).catch((error) => log($, `could not record the user's messages (${errorText(error)})`))
    const ms = (await $.clock.now()) - started
    const handoffTokens = estimateTokens(h.text)
    const tailTokens = rowTokens(tail)
    const gapMs = started - h.readyAt
    count(s.stats, `compaction.${trigger}.${path === 'early' ? 'earlyHandoff' : 'forkedAtCompaction'}`)
    add(s.stats, 'compaction.ms', ms)
    add(s.stats, 'handoff.tokens', handoffTokens)
    add(s.stats, 'tail.tokens', tailTokens)
    s.stats.compactions.push({ trigger, path, ms, ...(path === 'early' ? { gapMs } : {}), handoffTokens, tailRows: tail.length, tailTokens, userMessages: userMessages.length })
    s.fork = undefined
    save($, s)
    log($, `compacted with the ${path === 'early' ? `early handoff (ready ${seconds(gapMs)} before)` : 'handoff forked at compaction'}: handoff ~${handoffTokens} tokens, ${tail.length} raw rows (~${tailTokens} tokens), ${userMessages.length} user message(s)`)
    show($, `Compacted in ${seconds(ms)} with ${path === 'early' ? 'the handoff forked early' : 'a handoff forked now'} (~${handoffTokens} tokens)`)
    return { messages }
  }).catch(async ($, e, next) => {
    if (next.called) return { skip: `fork-handoff: ${next.error.message}` }
    log($, `${next.error.message}; using the built-in compaction`)
    show($, 'Compaction failed. Using built-in compaction')
    const sessionId = await $.session.id()
    const s = sessionOf(sessionId)
    count(s.stats, `compaction.${e.trigger}.fellBack`)
    s.stats.compactions.push({ trigger: e.trigger, path: 'fellBack', ms: 0 })
    save($, s)
    return next(e)
  })

  // Each main-thread step's context, off the request's path: the early fork's trigger.
  on('turn.step', async function* ($, e, next) {
    const r = yield* next(e)
    if (e.agentId === undefined && r.usage) {
      const usage = r.usage
      void $.session.id().then((id) => void (sessionOf(id).model = usage.model ?? e.model), () => {})
      $.clock.after(0, () => void maybeFork($, usage).catch((error) => log($, errorText(error))))
    }
    return r
  })

  // The standing note, after core's context management text: the same for the whole session, so the section stays cached.
  on('prompt.section', { name: 'context_management' }, async ($, e, next) => {
    const [{ text }, recall] = await Promise.all([next(e), recallOffered($)])
    return { text: text ? `${text}\n\n${forkBriefing(recall)}` : `# Context management\n${forkBriefing(recall)}` }
  })

  on('session.end', async ($, e, next) => {
    const s = sessions.get(e.sessionId)
    if (s) await s.writing
    if (e.reason === 'clear') {
      sessions.delete(e.sessionId)
      await $.store.delete(promptsKey(e.sessionId)).catch(() => {})
    }
    return next(e)
  })
}
