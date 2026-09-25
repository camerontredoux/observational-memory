// The continuation-quality benchmark on pi (https://pi.dev) with its own observational-memory extension, so the same
// scenarios and checks can compare that implementation with this plugin. `scripts/bench-pi.ts` drives the session;
// this module is pure: it turns a pi session file into the Claude Code transcript shape `bench.ts` scores, and
// adapts a scenario's files to pi.
//
// What the conversion maps:
// - pi's tools to the Claude Code names the checks match: bash -> Bash, read -> Read, write -> Write, edit -> Edit
//   (each `oldText` becomes `old_string`, which the checks never read as written text), grep -> Grep, find -> Glob,
//   ls -> LS, om_recall -> RECALL_TOOL.
// - A `compaction` entry to a `compact_boundary` row and the summary row after it. pi records no trigger, so the
//   driver says which (`auto` in a scenario that grows until the session compacts on its own, `manual` otherwise).
//   A compaction the extension made (`fromHook`) carries its parts as tags: `<vcc>` (the structural brief compiled by
//   code), `<pi-om-memory>` (the observations, journey and memory map) and `<kept-tail>` (the text of the entries it
//   kept verbatim, which pi still sends). One pi made itself has no tag, so `bench.ts` reads it as the built-in path.
// - `om.cost` entries (the observer's and consolidator's own pi calls) to the stats file `parseStats` reads. A
//   consolidation counts as a reflection: it is the extension's step that condenses its observations.
// - The sum of pi's own per-message price (`usage.cost.total`) to a `cost-state` row, the host-reported total
//   `bench.ts` uses when its price table has no row for the model (GPT models, for one).
//
// In the extension's `append` mode the model sees the chain its `context` hook projects, not the compaction entry's
// summary. The entry holds the same VCC brief and memory, so the "what carried each fact" table reads it as the
// memory, an approximation the report states.

import { PI_MEMORY_MARK, RECALL_TOOL } from './bench'
import type { Scenario } from './scenarios'

const TOOLS: Record<string, string> = { bash: 'Bash', read: 'Read', write: 'Write', edit: 'Edit', grep: 'Grep', find: 'Glob', ls: 'LS', om_recall: RECALL_TOOL }

type Block = { type?: string; text?: string; id?: string; name?: string; arguments?: Record<string, unknown> }
const textOf = (content: unknown): string =>
  typeof content === 'string' ? content : Array.isArray(content) ? (content as Block[]).map((b) => (b.type === 'text' ? (b.text ?? '') : '')).join('\n') : ''

function toolInput(name: string, args: Record<string, unknown> = {}): Record<string, unknown> {
  const path = typeof args.path === 'string' ? { file_path: args.path } : {}
  if (name !== 'edit') return { ...args, ...path }
  const edits = Array.isArray(args.edits) ? (args.edits as { oldText?: unknown; newText?: unknown }[]) : []
  return { ...path, edits: edits.map((e) => ({ old_string: e.oldText, new_string: e.newText })) }
}

const MARKERS: [RegExp, string][] = [
  [/<!-- om:vcc:start version=\d+ -->/g, '<vcc>'],
  [/<!-- om:vcc:end -->/g, '</vcc>'],
  [/<!-- om:memory:start version=\d+ -->/g, PI_MEMORY_MARK],
  [/<!-- om:memory:end -->/g, PI_MEMORY_MARK.replace('<', '</')],
]

export type PiConversion = {
  /** The session as Claude Code transcript rows, one JSON object per line. */
  jsonl: string
  /** The stats file `parseStats` reads, from the session's `om.cost` entries. */
  stats: string
}

/**
 * Converts a pi session file. `trigger` is each compaction's trigger; `durationsMs` the driver's measured duration of
 * each compaction, in order, where it has one.
 */
export function convertPiSession(jsonl: string, trigger: 'auto' | 'manual', durationsMs: readonly (number | undefined)[] = []): PiConversion {
  const rows: Record<string, any>[] = jsonl.split('\n').flatMap((l) => {
    try {
      return l.trim() ? [JSON.parse(l)] : []
    } catch {
      return []
    }
  })
  const out: object[] = []
  const cost: Record<string, { count: number; sum: number }> = {}
  let compactions = 0
  let piCostUsd = 0
  // Each entry's text as the kept tail shows it: what a compaction kept verbatim is searched for the scenario facts.
  const shown = new Map<string, string>()
  const order: string[] = []
  for (const row of rows) {
    const at = { uuid: row.id, timestamp: row.timestamp }
    if (row.type === 'custom' && row.customType === 'om.cost') {
      const key = row.data?.role === 'consolidator' ? 'reflector.consolidator.cost' : 'observer.pi.cost'
      const c = (cost[key] ??= { count: 0, sum: 0 })
      c.count++
      c.sum += Number(row.data?.costUsd) || 0
      continue
    }
    if (row.type === 'compaction') {
      const kept = order.slice(Math.max(0, order.indexOf(row.firstKeptEntryId))).map((id) => shown.get(id) ?? '')
      let text = String(row.summary ?? '')
      if (row.fromHook) {
        for (const [from, to] of MARKERS) text = text.replace(from, to)
        if (!text.includes(PI_MEMORY_MARK)) text = `${PI_MEMORY_MARK}\n${text}\n${PI_MEMORY_MARK.replace('<', '</')}`
        text += `\n<kept-tail>\n${kept.join('\n')}\n</kept-tail>`
      }
      const ms = durationsMs[compactions++]
      out.push({ type: 'system', subtype: 'compact_boundary', ...at, compactMetadata: { trigger, preTokens: row.tokensBefore, ...(ms === undefined ? {} : { durationMs: ms }) } })
      out.push({ type: 'user', uuid: `${row.id}-summary`, timestamp: row.timestamp, isCompactSummary: true, message: { role: 'user', content: text } })
      continue
    }
    if (row.type !== 'message' || !row.message) continue
    const m = row.message
    order.push(row.id)
    if (m.role === 'user') {
      shown.set(row.id, textOf(m.content))
      out.push({ type: 'user', ...at, message: { role: 'user', content: textOf(m.content) } })
    } else if (m.role === 'assistant') {
      const blocks = (Array.isArray(m.content) ? m.content : []) as Block[]
      const content = blocks.flatMap((b): object[] =>
        b.type === 'text' ? [{ type: 'text', text: b.text ?? '' }] : b.type === 'toolCall' ? [{ type: 'tool_use', id: b.id, name: TOOLS[b.name ?? ''] ?? b.name, input: toolInput(b.name ?? '', b.arguments) }] : [],
      )
      shown.set(row.id, blocks.map((b) => (b.type === 'text' ? b.text : b.type === 'toolCall' ? JSON.stringify(b.arguments) : '')).join('\n'))
      const u = m.usage ?? {}
      piCostUsd += Number(u.cost?.total) || 0
      // pi asks Anthropic for five-minute cache writes unless PI_CACHE_RETENTION=long.
      const usage = { input_tokens: u.input, output_tokens: u.output, cache_read_input_tokens: u.cacheRead, cache_creation_input_tokens: u.cacheWrite, cache_creation: { ephemeral_5m_input_tokens: u.cacheWrite } }
      out.push({ type: 'assistant', ...at, message: { id: row.id, model: m.model, usage, content } })
    } else if (m.role === 'toolResult') {
      shown.set(row.id, textOf(m.content))
      out.push({ type: 'user', ...at, message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: m.toolCallId, content: textOf(m.content), is_error: m.isError === true }] } })
    }
  }
  out.push({ type: 'cost-state', totalCostUSD: Math.round(piCostUsd * 1e6) / 1e6 })
  const reflections = cost['reflector.consolidator.cost']?.count ?? 0
  const stats = { counts: {}, metrics: { ...cost, ...(reflections ? { 'reflection.ms': { count: reflections } } : {}) } }
  return { jsonl: out.map((r) => JSON.stringify(r)).join('\n') + '\n', stats: JSON.stringify(stats) }
}

/**
 * The scenario's files for a pi run. `logs.sh` drops its check that its output goes to Claude Code's Bash output
 * file: pi's bash tool reads a pipe, and the run's guard (tests/eval/pi-guard.ts) allows exactly `bash logs.sh`, so
 * neither a redirect nor a pipe gets past it.
 */
export function piFiles(s: Scenario): Record<string, string> {
  const files = { ...s.files }
  if (files['logs.sh']) files['logs.sh'] = files['logs.sh'].split('\n').filter((l) => !l.includes('/proc/$$/fd/1') && !l.includes("Claude Code's own Bash output file")).join('\n')
  return files
}
