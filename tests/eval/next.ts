// The next-action check of `scripts/bench-compact.ts --next`: a reader model (Luna) given a compacted context proposes
// the agent's next actions, and code compares them with what the real agent did right after the cut. Pure: the caller
// makes the model calls. Unlike the probes it asks nothing about the past; it tests whether the context lets the work go on.
import type { Context, Row, Transcript } from './replay'
import { contextText, estimateTokens, identifiersIn, isTyped, messageText } from './replay'

/** How many of the real agent's tool calls after the cut count as the gold continuation. */
export const NEXT_K = 3

/** One action, reduced to what makes two the same: its family (`read`, `edit`, `search`, `git commit`, `bun test`…) and the files it names. */
export type Act = { family: string; targets: string[]; text: string }

export const NEXT_PROMPT = `You are an AI coding agent whose memory was just compacted. Below is the complete
context you have now. Continue the work exactly where it stands.

Do not run anything. Instead, write the next ${NEXT_K} actions you would take, in order:
the tool calls you would make (Read, Edit, Write, Bash, Grep, Glob, Agent, or another
tool the context shows), with their real arguments: full file paths, the exact
command. If you would first reply to the user without a tool, or stop and wait for
the user, give one action {"tool": "reply"} and stop there.

Output one JSON array, nothing else:
[{"tool": "Bash", "input": {"command": "..."}}, {"tool": "Read", "input": {"file_path": "..."}}]`

// A shell command's leading `cd … &&`, env assignments, and wrappers (`rtk`, `timeout N`), which do not change what it does.
const PREFIX = /^(?:cd\s+\S+\s*(?:&&|;)\s*|[A-Z_][A-Z0-9_]*=\S*\s+|rtk\s+|proxy\s+|timeout\s+\d+[smh]?\s+|time\s+)+/
const READS = new Set(['cat', 'sed', 'head', 'tail', 'less', 'bat', 'nl', 'wc'])
const SEARCHES = new Set(['rg', 'grep', 'fdfind', 'fd', 'find', 'ls', 'eza', 'tree', 'ast-grep'])
const EDITS = new Set(['sd', 'patch', 'mv', 'cp', 'rm', 'mkdir', 'touch'])
// Commands named by their first two words: `git commit`, `gh pr`, `bun test`, `claude plugin`.
const TWO_WORD = new Set(['git', 'gh', 'gh-axi', 'bun', 'bunx', 'npm', 'npx', 'pnpm', 'claude', 'cargo', 'go', 'docker', 'herdr', 'systemctl', 'uv'])
const TOOL_FAMILY: Record<string, string> = { Read: 'read', Edit: 'edit', MultiEdit: 'edit', Write: 'edit', NotebookEdit: 'edit', Grep: 'search', Glob: 'search', Agent: 'agent', Task: 'agent', Workflow: 'agent' }

/** The files an input names, by their last two segments, so a worktree's copy and the main checkout's match. */
const targetsOf = (text: string) => [...new Set([...identifiersIn(text)].filter(([, k]) => k === 'path').map(([p]) => p.split('/').filter(Boolean).slice(-2).join('/')))]

export function actOf(tool: string, input: unknown): Act {
  const raw = typeof input === 'string' ? input : JSON.stringify(input ?? {})
  if (tool !== 'Bash') return { family: TOOL_FAMILY[tool] ?? tool.toLowerCase(), targets: targetsOf(raw), text: `${tool} ${raw}` }
  const command = String((input as { command?: unknown })?.command ?? raw).trim().replace(PREFIX, '')
  const words = command.split(/\s+/)
  const first = words[0]!.replace(/^.*\//, '')
  const second = words.slice(1).find((w) => !w.startsWith('-')) ?? ''
  const family = READS.has(first) ? 'read' : SEARCHES.has(first) ? 'search' : EDITS.has(first) ? 'edit' : TWO_WORD.has(first) ? `${first} ${second}`.trim() : first
  // Only the first command's files: `cd x && rg … ; sed -n 1,9p y` searches, then reads y.
  return { family, targets: targetsOf(command.split(/\s*(?:&&|;|\|\|)\s*/)[0]!), text: `Bash ${command}` }
}

/** Two actions match when they are the same family and, when both name files, share one. */
export const same = (a: Act, b: Act) => a.family === b.family && (!a.targets.length || !b.targets.length || a.targets.some((t) => b.targets.includes(t)))

/**
 * The gold continuation at boundary `n`: the real agent's first NEXT_K tool calls after the cut, up to the user's next
 * typed message. When the agent replied without a tool first, the gold is one `reply`. Undefined when the span starts
 * with the user's message (nothing to continue) or holds no action.
 */
export function gold(t: Transcript, n: number): Act[] | undefined {
  const acts: Act[] = []
  for (const r of t.spans[n] ?? []) {
    if (isTyped(r)) break
    if (r.role !== 'assistant') continue
    if (!r.toolUses.length && r.text.trim() && !acts.length) return [{ family: 'reply', targets: [], text: r.text.slice(0, 200) }]
    for (const u of r.toolUses) if (acts.length < NEXT_K) acts.push(actOf(u.tool, u.input))
    if (acts.length >= NEXT_K) break
  }
  return acts.length ? acts : undefined
}

/** The reader's input: the context exactly as the next turn sees it. */
export const nextInput = (context: Context) => `<context>\n${contextText(context)}\n</context>\n\nYour next ${NEXT_K} actions, as the JSON array:\n`

export function parseActs(reply: string): Act[] {
  const a = reply.indexOf('[')
  const b = reply.lastIndexOf(']')
  try {
    const xs = JSON.parse(reply.slice(a, b + 1)) as { tool?: unknown; input?: unknown }[]
    return xs.filter((x) => typeof x?.tool === 'string').slice(0, NEXT_K).map((x) => (x.tool === 'reply' ? { family: 'reply', targets: [], text: 'reply' } : actOf(x.tool as string, x.input)))
  } catch {
    return []
  }
}

/** One reply's grade: `first`, its first action matches the gold's first; `recall`, the share of gold actions any of its actions matches. */
export function gradeActs(proposed: readonly Act[], g: readonly Act[]) {
  return { first: !!proposed[0] && same(proposed[0], g[0]!), recall: g.filter((x) => proposed.some((p) => same(p, x))).length / g.length }
}

/**
 * The reference contexts at boundary `n`, the same for every plugin: `builtin`, the session's own compaction (its summary and
 * kept rows); `kept`, the kept rows alone (no memory: the floor); `raw`, the transcript's newest rows before the cut up to
 * `rawTokens` (no compaction: near the ceiling, as much as the reader reads). With `memoryOnly`, see `memoryOnly`.
 */
export function references(t: Transcript, n: number, rawTokens: number, memoryOnly = false): Record<'builtin' | 'kept' | 'raw', Context> {
  const b = t.boundaries[n - 1]!
  // The kept rows are copies under new uuids, so they are matched by content.
  const kept = new Set(b.kept.map(messageText))
  const before: Row[] = t.spans.slice(0, n).flat().filter((r) => !memoryOnly || !kept.has(messageText(r)))
  const raw: Row[] = []
  let tokens = 0
  for (const r of before.toReversed()) {
    tokens += estimateTokens(messageText(r))
    if (tokens > rawTokens) break
    raw.unshift(r)
  }
  if (memoryOnly) return { builtin: { summary: b.summary, kept: [] }, kept: { summary: '', kept: [] }, raw: { summary: '', kept: raw } }
  return { builtin: { summary: b.summary, kept: b.kept }, kept: { summary: '', kept: b.kept }, raw: { summary: '', kept: raw } }
}

/**
 * `--next-memory-only`: each context without the rows the compaction kept raw, so the check sees what the memory alone
 * carries forward. The kept rows are the same in every context and settle the next few actions on their own; the `kept`
 * floor becomes an empty context, and `raw` the history before them.
 */
export const memoryOnly = (c: Context): Context => ({ summary: c.summary, kept: [] })
