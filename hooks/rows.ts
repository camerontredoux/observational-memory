// The session's rows as compaction reads and keeps them: what a row says and its hash, and the raw tail a compaction
// hands back, cut (maskTail, dedupWrappers) and read whole again (unmask). Free of `$`, so register.ts and the tests
// import it.
import type { SessionMessage } from 'claude-code'
import { excerpt, hash, noteSource, omissionMarker } from './memory'
import { INJECTED_WRAPPER, originalId } from './recall'

// What a row says, a tool result counted once, on the user row that carries it.
export const rowText = (m: SessionMessage) =>
  [m.text, ...m.toolUses.map((u) => `${u.tool} ${JSON.stringify(u.input)}`), ...(m.toolResults ?? []).map((r) => r.text)].join('\n')

export const rowHash = (m: SessionMessage) => hash(`${m.role}\n${rowText(m)}`)
export const isPrompt = (m: SessionMessage) => m.role === 'user' && !m.toolResults?.length

// The raw tail a compaction keeps: past its newest TAIL_WHOLE_RESULTS tool results, each successful result over
// TAIL_RESULT_MAX_TOKENS keeps its head and tail around an om_recall marker (maskTail).
const TAIL_WHOLE_RESULTS = 3
const TAIL_RESULT_MAX_TOKENS = 250
// Past the newest TAIL_WHOLE_INPUTS tool calls, each string argument of a call that did not fail over
// TAIL_INPUT_MAX_TOKENS keeps its head and tail the same way (a heredoc, a subagent's prompt, an edit's text).
const TAIL_WHOLE_INPUTS = 3
const TAIL_INPUT_MAX_TOKENS = 500
// The raw tail a compaction hands back: the newest TAIL_WHOLE_RESULTS tool results and every error whole, each other
// result over TAIL_RESULT_MAX_TOKENS cut to its head and tail. om_recall finds the whole result in the transcript.
export function maskTail(rows: readonly SessionMessage[]) {
  let seen = 0
  let calls = 0
  const cutValue = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const text = excerpt(v, TAIL_INPUT_MAX_TOKENS, 'input')
      return text.length < v.length ? text : v
    }
    if (Array.isArray(v)) return v.map(cutValue)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cutValue(x)]))
    return v
  }
  const cutInputs = (m: SessionMessage): SessionMessage => {
    const toolUses = m.toolUses.toReversed().map((u) => {
      if (++calls <= TAIL_WHOLE_INPUTS || u.isError || u.tool === 'Agent' || JSON.stringify(u.input).length <= TAIL_INPUT_MAX_TOKENS * 4) return u
      const input = cutValue(u.input) as Record<string, unknown>
      return JSON.stringify(input).length < JSON.stringify(u.input).length ? { ...u, input } : u
    })
    return toolUses.every((u, i) => u === m.toolUses.at(-1 - i)) ? m : { ...m, toolUses: toolUses.toReversed() }
  }
  return rows
    .toReversed()
    .map((m) => {
      if (m.toolUses.length) m = cutInputs(m)
      if (!m.toolResults?.length) return m
      // A cut that would not shorten the result (the marker outweighs what it omits) leaves it whole.
      const cut = (r: NonNullable<SessionMessage['toolResults']>[number]) => {
        const text = excerpt(r.text, TAIL_RESULT_MAX_TOKENS)
        return text.length < r.text.length ? { ...r, text } : r
      }
      const toolResults = m.toolResults.toReversed().map((r) => (++seen <= TAIL_WHOLE_RESULTS || r.isError ? r : cut(r)))
      return toolResults.every((r, i) => r === m.toolResults!.at(-1 - i)) ? m : { ...m, toolResults: toolResults.toReversed() }
    })
    .toReversed()
}
const MASKED = new RegExp(noteSource(omissionMarker(0, 'result')))
// A local slash command's rows (`/compact`, `/effort`): its caveat, its echo and what it printed, all three engine
// framing. The kept tail leaves them out, as the transcript would draw their copies with no render hook to hide them.
// An echo with no output after it is a prompt command's (a skill's), whose arguments are the person's request: kept.
// But a local command's output can be a system row the context does not carry (a skipped `/compact`'s "Not
// compacted"), and its caveat is an isMeta row the engine leaves out of a compaction's messages, so a `/compact` echo,
// never a prompt command's, goes whatever follows it.
const COMMAND_ROW = /^<(local-command-caveat|command-name|command-message|command-args|local-command-stdout|local-command-stderr)>[^]*?<\/\1>\s*/
const framing = (m: SessionMessage | undefined, tags: RegExp) => {
  if (!m || !isPrompt(m) || !tags.test(m.text.trim())) return false
  let text = m.text.trim()
  for (let rest = text.replace(COMMAND_ROW, ''); rest !== text; rest = text.replace(COMMAND_ROW, '')) text = rest
  return !text
}
const OUTPUT = /^<(?:local-command-caveat|local-command-std(?:out|err))>/
const COMPACT_ECHO = /^\s*<command-name>\/compact<\/command-name>/
export const withoutLocalCommands = <M extends SessionMessage>(rows: readonly M[]) =>
  rows.filter(
    (m, i) =>
      !framing(m, OUTPUT) &&
      !(framing(m, /^<command-name>/) && (framing(rows[i + 1], /^<local-command-std(?:out|err)>/) || COMPACT_ECHO.test(m.text))),
  )
// A reply that was thinking alone: its copy loses the thinking, and the engine writes it as "(no content)". The kept
// tail leaves it out.
export const isEmptyReply = (m: SessionMessage) => m.role === 'assistant' && !m.toolUses.length && ['', '(no content)'].includes(m.text.trim())
const isWrapper = (m: SessionMessage) => isPrompt(m) && INJECTED_WRAPPER.test(m.text.trim())
// An injected wrapper row in the raw tail (a task notification, hook feedback) that a newer one repeats keeps its
// first line and the lines no newer one has, then names the whole row by its hash for unmask.
const REPEATED = /\n\(repeated lines as in the newer notice below; ([0-9a-f]+)\)$/
export function dedupWrappers(rows: readonly SessionMessage[]) {
  const newer = new Set<string>()
  return rows
    .toReversed()
    .map((m) => {
      if (!isWrapper(m)) return m
      const lines = m.text.split('\n')
      const keep = lines.filter((l, i) => i === 0 || !l.trim() || !newer.has(l))
      for (const l of lines) if (l.trim()) newer.add(l)
      const text = `${keep.join('\n').replace(/\n{2,}/g, '\n')}\n(repeated lines as in the newer notice below; ${hash(m.text)})`
      return keep.length < lines.length && text.length < m.text.length ? { ...m, text } : m
    })
    .toReversed()
}
// A result maskTail cut reads whole again wherever the history still holds it (the rows before the compaction that
// cut it, under the same tool use id), and so does a wrapper row dedupWrappers cut (under its hash): the Observer, the
// row hashes and the times see the row as it was.
export function unmask(rows: readonly SessionMessage[], history: readonly SessionMessage[]) {
  const whole = new Map<string, string>()
  const wrappers = new Map<string, string>()
  for (const m of history) {
    for (const r of m.toolResults ?? []) {
      const id = originalId(r.tool_use_id)
      if (r.text.length > (whole.get(id)?.length ?? -1)) whole.set(id, r.text)
    }
    if (isWrapper(m)) wrappers.set(hash(m.text), m.text)
  }
  const original = (r: NonNullable<SessionMessage['toolResults']>[number]) => {
    const at = r.text.search(MASKED)
    const w = at < 0 ? undefined : whole.get(originalId(r.tool_use_id))
    return w && w.length > r.text.length && w.startsWith(r.text.slice(0, at)) ? w : undefined
  }
  const wrapper = (m: SessionMessage) => {
    const id = isPrompt(m) ? m.text.match(REPEATED)?.[1] : undefined
    const w = id && wrappers.get(id)
    return w && w.startsWith(m.text.slice(0, m.text.indexOf('\n'))) ? w : undefined
  }
  const inputs = new Map<string, Record<string, unknown>>()
  for (const m of history) for (const u of m.toolUses) if (!INPUT_MASKED.test(JSON.stringify(u.input))) inputs.set(originalId(u.tool_use_id), u.input)
  const input = (u: SessionMessage['toolUses'][number]) => (INPUT_MASKED.test(JSON.stringify(u.input)) ? inputs.get(originalId(u.tool_use_id)) : undefined)
  return rows
    .map((m) => (m.toolUses.some(input) ? { ...m, toolUses: m.toolUses.map((u) => ({ ...u, input: input(u) ?? u.input })) } : m))
    .map((m) => {
      const w = wrapper(m)
      if (w) return { ...m, text: w }
      return m.toolResults?.some(original) ? { ...m, toolResults: m.toolResults.map((r) => ({ ...r, text: original(r) ?? r.text })) } : m
    })
}
// Found in a call's input as JSON, where the marker's newlines are escaped: the marker without them.
const INPUT_MASKED = new RegExp(noteSource(omissionMarker(0, 'input').trim()))
// A context as the compaction that installed it is compared: no local command's rows, and no command echo.
export const contextHash = (rows: readonly SessionMessage[]) =>
  hash(withoutLocalCommands(rows).filter((m) => !framing(m, /^<command-name>/)).map(rowHash).join('\n'))
