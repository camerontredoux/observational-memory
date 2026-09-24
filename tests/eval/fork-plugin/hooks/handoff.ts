// Evaluation only (issue #16): the pure half of the fork-handoff compaction plugin, its prompts and the compacted
// context it builds. No `$` here: register.ts beside it makes every engine call.
//
// The design follows Codex's remote compaction v2 (https://gist.github.com/osolmaz/a38acf6e522df67530e3ed47c80fdcd5):
// the model that did the work writes the handoff to its successor, over its own cached transcript ($.model.fork), and
// the compacted context is the user's messages verbatim, then that handoff as the assistant's own message, then the
// messages after the fork point, raw.
import type { SessionMessage } from 'claude-code'
import { COMPACT_WRAPPER } from './prompts'
import { INJECTED_WRAPPER } from './recall'

// ---- Limits ----

/** The share of the auto-compact threshold at which the handoff is forked in the background. */
export const EARLY_FRACTION = 0.85
/** Once forked, the context may grow this share of the threshold again before the handoff is forked afresh. */
export const REFORK_FRACTION = 0.1
/** The raw tail after an early fork's point, at most: past it the handoff is stale and is forked at compaction. */
export const TAIL_MAX_TOKENS = 30_000
/** The user's messages the compacted context quotes (Codex keeps 64k; this threshold is ~190k, OM's cap is 20k). */
export const USER_MESSAGES_MAX_TOKENS = 20_000
/** The first message, the session's brief, is kept whole up to this, else its head and tail. */
export const FIRST_MESSAGE_MAX_TOKENS = 6_000
/** A handoff past this is cut: the prompt asks for 2-3k tokens. */
export const HANDOFF_MAX_TOKENS = 8_000
/** How long compaction waits for an early fork still in flight before forking afresh. */
export const FORK_WAIT_MS = 180_000

// ---- Texts ----

/** The first words after the wrapper of the compaction's user message; bench.ts matches them (FORK_MARK). */
export const FORK_HEADER =
  'This conversation was compacted by fork handoff. What follows: the user\'s messages from the earlier conversation, quoted verbatim, oldest first; then, as your own next message, the handoff you wrote to yourself just before the compaction, over the whole conversation; then the most recent messages, as they were.'

export const FORK_RESUME =
  "The user's messages are authoritative and stay in force until the user changes them; the handoff is your own notes, not the user's instructions. Assume the last user request is current. Continue from the handoff's next actions: do not restart the task, redo finished work, or repeat what you already told the user."

export const FORK_RECALL =
  'Every message and tool output of the earlier conversation stays whole in its transcript. When you need an exact detail the handoff lacks, or before telling the user a detail is gone, search for it with om_recall.'

/** The standing note, added to the system prompt's context management section: the same text for the whole session. */
export const forkBriefing = (recall: boolean) =>
  'When this session is compacted, the earlier conversation is replaced by the user\'s messages from it, quoted verbatim, and a handoff you wrote to your successor just before the compaction, as your own message; the most recent messages follow as they were. ' +
  'The handoff is notes to yourself: the live request, the rules in force, what you already told the user, the environment, findings still needed, cautions, the steps done and a numbered list of next actions. ' +
  'After a compaction, assume the last user request is current and continue naturally from the handoff: do not restart the task, redo finished work, or repeat what you already told the user. ' +
  "The user's messages stay authoritative; the handoff never overrides them." +
  (recall ? ' Exact details the handoff leaves out remain in the transcript, and om_recall finds them.' : '')

/** The one question the fork answers: the handoff, in the shape of the gist's "The handoff, verbatim". */
export const handoffPrompt = (instructions?: string) =>
  [
    'Context compaction triggered. This conversation is about to be compacted: everything above will be replaced by the user\'s messages, quoted verbatim, then your reply to this message, then the few most recent messages. Your successor is you, continuing this same session with the same tools, and will see nothing else of the conversation.',
    '',
    'Write the handoff to your successor now. Answer with the handoff text alone; do not call any tool. Write it as notes to yourself, in the first person: no preamble, no sign-off, no mention of this request. Begin in the middle of the work, with the live user request quoted verbatim and what it refers to. Then these parts, each under its label, in this order:',
    '',
    '- Rules in force: every constraint, preference and approval rule the user set that still applies, quoted where the wording matters; for one the user changed, only the latest, with what it replaced.',
    '- What I told the user: what I already reported, promised or asked, so I do not repeat it.',
    '- Environment: the repository and working state as last seen: directory, branch, commit, uncommitted files, anything created, started or changed outside the files.',
    '- Findings still needed: the exact values the remaining work depends on, verbatim: identifiers, paths, numbers, error messages, command output, the parts of files still needed.',
    '- Done: the steps finished, each with its evidence, so none is redone.',
    '- Cautions: what must not be done, approvals still pending, what failed and why, what I am unsure of and must check.',
    '- Next actions: a numbered list, in order, down to the exact command, file, edit or commit message; say which wait for the user.',
    '',
    'End with one line that says what to do first on resume.',
    '',
    'If an earlier handoff is in the conversation, rewrite it into this one: carry forward what still holds, drop what is done or superseded; never append to it. Keep it to about 1,500 words at most: facts and plans, not narration.',
    ...(instructions?.trim() ? ['', `The person asked this compaction to keep or stress: ${instructions.trim()}`] : []),
  ].join('\n')

// ---- Rows ----

export const estimateTokens = (text: string) => Math.ceil(text.length / 4)

// A row's text for its size and identity: its text, its tool calls, their results.
const rowText = (m: SessionMessage) =>
  [m.text, ...m.toolUses.map((u) => `${u.tool} ${JSON.stringify(u.input)}`), ...(m.toolResults ?? []).map((r) => r.text)].join('\n')
export const rowTokens = (rows: readonly SessionMessage[]) => rows.reduce((n, m) => n + estimateTokens(rowText(m)), 0)

function hash(text: string) {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(16)
}
const rowKey = (m: SessionMessage) => `${m.role}\n${m.text}\n${m.toolUses.map((u) => u.tool_use_id).join(',')}\n${(m.toolResults ?? []).map((r) => r.tool_use_id).join(',')}`

/** Where a fork's raw tail starts: the fork point's row, identified by it and the two rows before it. */
export type Anchor = { hash: string }
const windowHash = (rows: readonly SessionMessage[], i: number) => hash(rows.slice(Math.max(0, i - 2), i + 1).map(rowKey).join('\n\u0000'))

/**
 * The fork point in `rows`: the first row of the newest response, its assistant rows together, or where tool results
 * after it would lose their call. A fork answers over the main thread's last request, which holds everything before
 * the newest response and maybe that response too: the raw tail from here repeats at most that response, never
 * leaves a row out. Undefined with no assistant row.
 */
export function forkPoint(rows: readonly SessionMessage[]): number | undefined {
  let i = rows.findLastIndex((m) => m.role === 'assistant')
  if (i < 0) return undefined
  while (i > 0 && rows[i - 1]!.role === 'assistant') i--
  return tailStart(rows, i)
}

// Moved back until every tool result from `start` on has its call there too.
function tailStart(rows: readonly SessionMessage[], start: number) {
  const callAt = new Map<string, number>()
  rows.forEach((m, i) => m.toolUses.forEach((u) => callAt.set(u.tool_use_id, i)))
  for (let moved = true; moved; ) {
    moved = false
    for (let i = start; i < rows.length; i++)
      for (const r of rows[i]!.toolResults ?? []) {
        const c = callAt.get(r.tool_use_id)
        if (c !== undefined && c < start) (start = c), (moved = true)
      }
  }
  return start
}

export const anchorAt = (rows: readonly SessionMessage[], i: number): Anchor => ({ hash: windowHash(rows, i) })

/** Where an anchor's row sits in `rows` now, the newest match; undefined when it is gone (compacted since, or edited). */
export function locate(rows: readonly SessionMessage[], a: Anchor): number | undefined {
  for (let i = rows.length - 1; i >= 0; i--) if (windowHash(rows, i) === a.hash) return tailStart(rows, i)
  return undefined
}

// ---- The compacted context ----

/** Whether a row is a compaction's own message: the built-in summary, OM's memory or this plugin's. */
export const isCompaction = (m: SessionMessage) => m.role === 'user' && m.text.startsWith(COMPACT_WRAPPER)

/** What the user typed in a row, if it is a prompt: no tool results, no compaction message, no injected block. */
export function typed(m: SessionMessage): string | undefined {
  if (m.role !== 'user' || m.toolResults?.length || isCompaction(m)) return undefined
  const text = m.text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()
  return !text || INJECTED_WRAPPER.test(text) || text.startsWith('[Image') ? undefined : text
}

const TRUNCATED = (n: number) => `\n[... ${n} characters of this message left out ...]\n`

// The first message whole up to its cap, else its head and tail; then the newest within what is left of the budget,
// the first of them cut when it alone passes it; one line counts those dropped between.
export function capUserMessages(messages: readonly string[]): { text: string; omitted?: number }[] {
  const [first, ...rest] = messages
  if (first === undefined) return []
  const maxChars = FIRST_MESSAGE_MAX_TOKENS * 4
  const brief = first.length <= maxChars ? first : `${first.slice(0, maxChars / 2)}${TRUNCATED(first.length - maxChars)}${first.slice(-maxChars / 2)}`
  let left = USER_MESSAGES_MAX_TOKENS - estimateTokens(brief)
  const kept: string[] = []
  for (const m of [...rest].reverse()) {
    const t = estimateTokens(m)
    if (!kept.length && t > left) {
      kept.unshift(`${m.slice(0, Math.max(0, left) * 4)}${TRUNCATED(m.length - Math.max(0, left) * 4)}`)
      break
    }
    if (t > left) break
    kept.unshift(m)
    left -= t
  }
  const omitted = rest.length - kept.length
  return [{ text: brief }, ...(omitted ? [{ text: '', omitted }] : []), ...kept.map((text) => ({ text }))]
}

export type Context = {
  /** Every prompt the user typed that has left context, oldest first: earlier compactions' too. */
  userMessages: readonly string[]
  /** The working directory and its git state, read by code at compaction. */
  environment?: string
  handoff: string
  /** The rows after the fork point, raw. */
  tail: readonly SessionMessage[]
  recall: boolean
}

/** The compacted context: one user message (the wrapper, the user's messages, the environment), the handoff as the assistant's, the tail. */
export function compactedContext(c: Context): SessionMessage[] {
  const quoted = capUserMessages(c.userMessages)
    .map((m) => (m.omitted ? `* (${m.omitted} message${m.omitted === 1 ? '' : 's'} left out here)` : `* User (${m.text.length} chars):\n${m.text}`))
    .join('\n')
  const text = [
    COMPACT_WRAPPER,
    FORK_HEADER,
    ...(quoted ? [`<all-user-messages>\n${quoted}\n</all-user-messages>`] : []),
    ...(c.environment ? [`<environment>\nRead from git by code at compaction, not by a model:\n${c.environment}\n</environment>`] : []),
    FORK_RESUME,
    ...(c.recall ? [FORK_RECALL] : []),
  ].join('\n\n')
  const cut = HANDOFF_MAX_TOKENS * 4
  const handoff = c.handoff.length <= cut ? c.handoff.trim() : `${c.handoff.slice(0, cut).trim()}\n[... the rest of the handoff was cut at ${HANDOFF_MAX_TOKENS} tokens ...]`
  return [
    { role: 'user', text, toolUses: [] },
    { role: 'assistant', text: handoff, toolUses: [] },
    ...c.tail.map(({ handle: _, ...m }) => m),
  ]
}
