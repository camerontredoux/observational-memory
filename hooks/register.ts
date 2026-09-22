import type { EngineInterface, Register, SessionMessage } from 'claude-code'
import {
  COMPRESSION_GUIDANCE,
  OBSERVATION_CONTEXT_INSTRUCTIONS,
  OBSERVATION_CONTEXT_PROMPT,
  OBSERVATION_CONTINUATION_HINT,
  OBSERVER_SYSTEM_PROMPT,
  REFLECTOR_OUTPUT_SECTIONS,
  REFLECTOR_SYSTEM_PROMPT,
} from './prompts'

const MODEL = 'sonnet'
const KEEP_RAW_TOKENS = 6_000 // Mastra keeps 20% of its 30k observe threshold raw
const REFLECT_AT_TOKENS = 40_000
const TOOL_ARGS_MAX_TOKENS = 2_000
const TOOL_RESULT_MAX_TOKENS = 5_000
const MAX_OUTPUT_TOKENS = 32_000
const TIMEOUT_MS = 5 * 60_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Memory = { observations: string; currentTask?: string; suggestedResponse?: string }

const estimateTokens = (text: string) => Math.ceil(text.length / 4)

const truncate = (text: string, maxTokens: number) =>
  text.length <= maxTokens * 4
    ? text
    : `${text.slice(0, maxTokens * 4)}\n... [truncated ~${estimateTokens(text) - maxTokens} tokens]`

const messageText = (m: SessionMessage) =>
  [m.text, ...m.toolUses.map((u) => JSON.stringify(u.input) + (u.text ?? '')), ...(m.toolResults ?? []).map((r) => r.text)].join('\n')

// Mastra's observer input: a date header, then one `Role: text` line per part, tool calls with their results.
function renderHistory(messages: readonly SessionMessage[], now: Date) {
  const lines = [`${MONTHS[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}:`]
  for (const m of messages) {
    if (m.text) lines.push(`${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    for (const u of m.toolUses) {
      lines.push(`Tool Call ${u.tool}: ${truncate(JSON.stringify(u.input), TOOL_ARGS_MAX_TOKENS)}`)
      if (u.text === undefined) continue
      const kind = u.isError ? 'Tool Error' : 'Tool Result'
      lines.push(`${kind} ${u.tool}: ${truncate(u.text, TOOL_RESULT_MAX_TOKENS) || '[empty result]'}`)
    }
  }
  return lines.join('\n')
}

// The tag must start a line, as Mastra parses it.
const tag = (text: string, name: string) =>
  text.match(new RegExp(`^[ \\t]*<${name}>([\\s\\S]*?)^[ \\t]*</${name}>`, 'im'))?.[1]?.trim() || undefined

function parseOutput(text: string): Memory {
  const blocks = [...text.matchAll(/^[ \t]*<observations>([\s\S]*?)^[ \t]*<\/observations>/gim)]
  const observations = blocks.length
    ? blocks.map((b) => b[1]?.trim() ?? '').filter(Boolean).join('\n')
    : text.split('\n').filter((l) => /^\s*([-*]|\d+\.)\s/.test(l)).join('\n')
  return { observations, currentTask: tag(text, 'current-task'), suggestedResponse: tag(text, 'suggested-response') }
}

const section = (name: string, value?: string) => (value ? `\n\n<${name}>\n${value}\n</${name}>` : '')

function memoryMessage(memory: Memory): SessionMessage {
  const text =
    `${OBSERVATION_CONTEXT_PROMPT}\n\n${OBSERVATION_CONTEXT_INSTRUCTIONS}\n\n<observations>\n${memory.observations}\n</observations>` +
    section('current-task', memory.currentTask) +
    section('suggested-response', memory.suggestedResponse) +
    `\n\n<system-reminder>${OBSERVATION_CONTINUATION_HINT}</system-reminder>`
  return { role: 'user', text, toolUses: [] }
}

// The memory message a previous compaction left at the head of the transcript.
function priorMemory(first: SessionMessage | undefined): Memory | undefined {
  if (first?.role !== 'user' || !first.text.startsWith(OBSERVATION_CONTEXT_PROMPT)) return undefined
  const start = first.text.indexOf('<observations>\n')
  const end = first.text.lastIndexOf('\n</observations>')
  if (start < 0 || end < start) return undefined
  return {
    observations: first.text.slice(start + '<observations>\n'.length, end),
    currentTask: tag(first.text, 'current-task'),
    suggestedResponse: tag(first.text, 'suggested-response'),
  }
}

// Where the raw tail starts: at least KEEP_RAW_TOKENS back from the end, on a person's prompt, so no
// tool result is kept without its call. 0 when the only such prompt is the first message.
function tailStart(messages: readonly SessionMessage[]) {
  const isPrompt = (m: SessionMessage) => m.role === 'user' && !m.toolResults?.length
  let i = messages.length
  for (let tokens = 0; i > 0 && tokens < KEEP_RAW_TOKENS; ) tokens += estimateTokens(messageText(messages[--i]!))
  for (let j = i; j < messages.length; j++) if (isPrompt(messages[j]!)) return j
  for (let j = i - 1; j > 0; j--) if (isPrompt(messages[j]!)) return j
  return 0
}

async function complete($: EngineInterface, system: string, prompt: string) {
  const r = await $.model.complete({ model: MODEL, system, prompt, maxTokens: MAX_OUTPUT_TOKENS, timeoutMs: TIMEOUT_MS })
  if (!r.isAnswered) throw new Error(`model call failed: ${r.reason}`)
  return r.text
}

function observerPrompt(history: string, prior?: Memory) {
  let prompt = `## New Message History to Observe\n\n${history}\n\n---\n\n`
  if (prior) {
    prompt += `## Previous Observations\n\n${prior.observations}\n\n---\n\n`
    prompt += 'Do not repeat these existing observations. Your new observations will be appended to the existing observations.\n\n'
    const metadata = [
      prior.currentTask && `- prior current-task: ${prior.currentTask}`,
      prior.suggestedResponse && `- prior suggested-response: ${prior.suggestedResponse}`,
    ].filter(Boolean)
    if (metadata.length) {
      prompt += `## Prior Thread Metadata\n\n${metadata.join('\n')}\n\n`
      prompt += 'Use the prior current-task, suggested-response as continuity hints, then update them based on the new messages.\n\n---\n\n'
    }
  }
  return (
    prompt +
    '## Your Task\n\nExtract new observations from the message history above. Do not repeat observations that are already in the previous observations. Add your new observations in the format specified in your instructions.'
  )
}

// Mastra's ladder: each attempt re-sends the original log with stronger guidance, levels 1 to 4; the last
// non-empty attempt stands even if it is still over the threshold.
async function reflect($: EngineInterface, memory: Memory): Promise<Memory> {
  let reflected: Memory | undefined
  for (let level = 1; level <= 4; level++) {
    const prompt =
      `## OBSERVATIONS TO REFLECT ON\n\n${memory.observations}\n\n---\n\n` +
      "Please analyze these observations and produce a refined, condensed version that will become the assistant's entire memory going forward." +
      `\n\n${COMPRESSION_GUIDANCE[level]}\n\n## Additional Output Sections\n\n${REFLECTOR_OUTPUT_SECTIONS}`
    const parsed = parseOutput(await complete($, REFLECTOR_SYSTEM_PROMPT, prompt))
    if (!parsed.observations.trim()) continue
    reflected = { ...parsed, currentTask: memory.currentTask } // Mastra keeps the observer's current task
    if (estimateTokens(parsed.observations) < REFLECT_AT_TOKENS) break
  }
  if (!reflected) throw new Error('reflector produced empty output at every compression level')
  return reflected
}

export const register: Register = (on) => {
  on('session.compact', async ($, e, next) => {
    const prior = priorMemory(e.messages[0])
    const messages = prior ? e.messages.slice(1) : e.messages
    const start = tailStart(messages)
    if (start === 0) return next(e) // one long turn: nothing can be observed without splitting it

    const now = new Date(await $.clock.now())
    const observed = parseOutput(
      await complete($, OBSERVER_SYSTEM_PROMPT, observerPrompt(renderHistory(messages.slice(0, start), now), prior)),
    )
    if (!observed.observations) throw new Error('observer produced no observations')

    let memory: Memory = {
      ...observed,
      observations: prior
        ? `${prior.observations}\n\n--- message boundary (${now.toISOString()}) ---\n\n${observed.observations}`
        : observed.observations,
    }
    const reflecting = estimateTokens(memory.observations) >= REFLECT_AT_TOKENS
    if (reflecting) memory = await reflect($, memory)

    $.ui.log(
      `observational-memory: observed ${start} messages, kept ${messages.length - start}; ` +
        `log ~${estimateTokens(memory.observations)} tokens${reflecting ? ', reflected' : ''}`,
    )
    return { messages: [memoryMessage(memory), ...messages.slice(start)] }
  }).catch(($, e, next) => {
    // Any failure falls back to the built-in compaction rather than leaving the session over its limit.
    if (next.called) return { skip: `observational-memory: ${next.error.message}` }
    $.ui.log(`observational-memory: ${next.error.message}; using the built-in compaction`)
    return next(e)
  })
}
