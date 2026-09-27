// v0.4.9's om_recall, frozen as the evaluation baseline (issue #8): it lives here, not in `hooks/recall.ts`, so the
// production recall module carries no comparison machinery. The helpers it reads are copied as v0.4.9 had them, so a
// later change to production recall never moves the baseline it is compared against. `scripts/recall-cli.ts` and
// `tests/recall.test.ts` use it.

import type { SessionMessage } from 'claude-code'
import { COMPACT_WRAPPER, MEMORY_MARK } from '../../hooks/prompts'
import { SEARCH_MAX_HITS } from '../../hooks/recall'

const RECALL_TOOL = 'om_recall'
type Row = {
  type?: string
  isSidechain?: boolean
  timestamp?: string
  message?: { content?: string | Content[] }
}
type Content = { type: string; text?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; content?: unknown; is_error?: boolean }

const isMemoryText = (text: string) => text.startsWith(MEMORY_MARK) || text.startsWith(`${COMPACT_WRAPPER}\n\n${MEMORY_MARK}`)
function typedText(text: string) {
  const t = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()
  return !t || /^<[a-z][a-z-]*>/.test(t) || t.startsWith('[Image') ? undefined : t
}
const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// v0.4.9's om_recall over one transcript file, kept to compare against: every row part that holds all the query's
// words (any, when none holds all), newest last, each as a 400-character snippet.
export function legacyRecall(jsonl: string, query: string, limit = SEARCH_MAX_HITS) {
  const rows: SessionMessage[] = []
  const times: (number | undefined)[] = []
  for (const line of jsonl.split('\n')) {
    let r: Row
    try {
      r = JSON.parse(line) as Row
    } catch {
      continue
    }
    if ((r.type !== 'user' && r.type !== 'assistant') || r.isSidechain) continue
    const content = r.message?.content
    const blocks: Content[] = typeof content === 'string' ? [{ type: 'text', text: content }] : (content ?? [])
    const legacyResult = (c: unknown): string =>
      typeof c === 'string' ? c : Array.isArray(c) ? c.map((b: { text?: string }) => b.text ?? '').join('\n') : ''
    const m: SessionMessage = {
      role: r.type,
      text: blocks.flatMap((b) => (b.type === 'text' && b.text ? [b.text] : [])).join('\n'),
      toolUses: blocks.flatMap((b) => (b.type === 'tool_use' ? [{ tool_use_id: b.id ?? '', tool: b.name ?? '', input: (b.input ?? {}) as Record<string, unknown> }] : [])),
    }
    const results = blocks.flatMap((b) => (b.type === 'tool_result' ? [{ tool_use_id: b.tool_use_id ?? '', text: legacyResult(b.content), isError: !!b.is_error }] : []))
    if (results.length) m.toolResults = results
    if (!m.text && !m.toolUses.length && !results.length) continue
    rows.push(m)
    const time = r.timestamp ? Date.parse(r.timestamp) : NaN
    times.push(Number.isNaN(time) ? undefined : time)
  }
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return 'om_recall: give a query.'
  let asking = rows.length - 1
  while (asking >= 0 && !(rows[asking]!.role === 'user' && !rows[asking]!.toolResults?.length && !isMemoryText(rows[asking]!.text) && !rows[asking]!.text.startsWith(COMPACT_WRAPPER) && typedText(rows[asking]!.text) !== undefined)) asking--
  const names = new Map<string, string>()
  const parts: { i: number; label: string; text: string }[] = []
  rows.forEach((m, i) => {
    if (m.role === 'user' && isMemoryText(m.text)) return
    const when = times[i] === undefined ? '' : ` ${stamp(times[i]!)}`
    if (m.text && i !== asking) parts.push({ i, label: `${m.role}${when}`, text: m.text })
    for (const u of m.toolUses) {
      names.set(u.tool_use_id, u.tool)
      if (!u.tool.endsWith(`__${RECALL_TOOL}`)) parts.push({ i, label: `assistant${when} called ${u.tool}`, text: JSON.stringify(u.input) })
    }
    for (const r of m.toolResults ?? []) {
      const tool = names.get(r.tool_use_id) ?? 'tool'
      if (!tool.endsWith(`__${RECALL_TOOL}`)) parts.push({ i, label: `${tool} result${when}${r.isError ? ' (error)' : ''}`, text: r.text })
    }
  })
  const score = (text: string) => words.filter((w) => text.toLowerCase().includes(w)).length
  let hits = parts.filter((p) => score(p.text) === words.length)
  if (!hits.length) hits = parts.filter((p) => score(p.text) > 0).sort((a, b) => score(b.text) - score(a.text) || a.i - b.i)
  const shown = hits.slice(-limit).sort((a, b) => a.i - b.i)
  const out = [`${hits.length} match(es) for "${query}" in ${rows.length} messages${hits.length > shown.length ? `; showing the last ${shown.length}` : ''}.`]
  for (const p of shown) {
    const lower = p.text.toLowerCase()
    const at = Math.max(0, Math.min(...words.map((w) => lower.indexOf(w)).filter((n) => n >= 0)) - 100)
    const snippet = `${at > 0 ? '…' : ''}${p.text.slice(at, at + 400)}${at + 400 < p.text.length ? '…' : ''}`
    out.push(`\n[#${p.i} ${p.label}] ${snippet.replace(/\s+/g, ' ')}`)
  }
  return out.join('')
}
