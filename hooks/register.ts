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
import { compact } from './jev/compact'
import { buildJevRequest, noulAnswer, parseJevResponse } from './jev/request'
import { estimateTokens as jevTokens } from './jev/state'
import type { JevAsker, JevQuestions, Message } from './jev/types'

const MODEL = 'sonnet'
const KEEP_RAW_TOKENS = 6_000 // Mastra keeps 20% of its 30k observe threshold raw
const REFLECT_AT_TOKENS = 40_000
const TOOL_ARGS_MAX_TOKENS = 2_000
const TOOL_RESULT_MAX_TOKENS = 5_000
const MAX_OUTPUT_TOKENS = 32_000
const TIMEOUT_MS = 5 * 60_000
const JEV_STATE_MAX_TOKENS = 25_000 // fast-jev-compaction's default, under Jev's 32k for state plus a question
const SKILL_KEEP_AT = 0.5
const SKILL_CONTEXT =
  'A coding assistant conversation is being compacted. `observations` is its memory of the older conversation, `recent` the messages kept verbatim. Each question asks whether a skill (instructions the assistant loaded earlier) still applies.'
const SKILL_EXCERPT_CHARS = 600
const SKILL_CRITERIA = {
  true: 'The skill sets a standing rule, style or workflow that the recent requests, or requests like them, fall under',
  false: 'The skill was for a one-off task that is finished, or its subject is unrelated to the recent requests',
}
const SKILL_BLOCK = /<skill name="([^"]*)">\n([\s\S]*?)\n<\/skill>(?=\n<skill name="|\n<\/skills-in-use>)/g
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type Skill = { skill: string; text: string }
type Memory = { observations: string; currentTask?: string; suggestedResponse?: string; skills?: Skill[] }

const estimateTokens = (text: string) => Math.ceil(text.length / 4)

const truncate = (text: string, maxTokens: number) =>
  text.length <= maxTokens * 4
    ? text
    : `${text.slice(0, maxTokens * 4)}\n... [truncated ~${estimateTokens(text) - maxTokens} tokens]`

const messageText = (m: SessionMessage) =>
  [m.text, ...m.toolUses.map((u) => JSON.stringify(u.input) + (u.text ?? '')), ...(m.toolResults ?? []).map((r) => r.text)].join('\n')

// Mastra's observer input: a date header, then one `Role: text` line per part, tool calls with their results.
function renderHistory(messages: readonly Message[], now: Date) {
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
    section('skills-in-use', memory.skills?.map((s) => `<skill name="${s.skill}">\n${s.text}\n</skill>`).join('\n')) +
    `\n\n<system-reminder>${OBSERVATION_CONTINUATION_HINT}</system-reminder>`
  return { role: 'user', text, toolUses: [] }
}

// The memory message a previous compaction left at the head of the transcript.
function priorMemory(first: SessionMessage | undefined): Memory | undefined {
  if (first?.role !== 'user' || !first.text.startsWith(OBSERVATION_CONTEXT_PROMPT)) return undefined
  const skillsAt = first.text.indexOf('\n\n<skills-in-use>\n')
  const head = skillsAt < 0 ? first.text : first.text.slice(0, skillsAt)
  const start = head.indexOf('<observations>\n')
  const end = head.lastIndexOf('\n</observations>')
  if (start < 0 || end < start) return undefined
  const skills = skillsAt < 0 ? [] : first.text.slice(skillsAt).matchAll(SKILL_BLOCK)
  return {
    observations: head.slice(start + '<observations>\n'.length, end),
    currentTask: tag(head, 'current-task'),
    suggestedResponse: tag(head, 'suggested-response'),
    skills: [...skills].map((m) => ({ skill: m[1]!, text: m[2]! })),
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

const jevAsker = ($: EngineInterface, apiKey: string): JevAsker => ({
  async ask(state, questions) {
    const request = buildJevRequest({ apiKey }, state, questions)
    const r = await $.http.fetch(request.url, { method: request.method, headers: request.headers, body: request.body })
    return parseJevResponse(r.status, r.ok, r.text)
  },
})

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))

// fast-jev-compaction over the older section only: the memory message before it and the raw tail after it
// ride along as context, pinned, and are cut off again. Any failure observes the section unpruned.
async function prune(
  $: EngineInterface,
  jev: JevAsker | undefined,
  head: readonly SessionMessage[],
  older: readonly SessionMessage[],
  tail: readonly SessionMessage[],
): Promise<readonly Message[]> {
  if (!jev) {
    $.ui.log('observational-memory: no TYPESAFE_API_KEY, observing without the Jev pre-pass')
    return older
  }
  try {
    const { messages, stats } = await compact([...head, ...older, ...tail], jev, { preserveRecentMessages: tail.length })
    $.ui.log(
      `observational-memory: Jev kept ${stats.kept}, truncated ${stats.resultsDropped}, removed ${stats.callsDropped} calls ` +
        `in ${stats.requests} requests`,
    )
    return messages.slice(head.length, messages.length - tail.length)
  } catch (error) {
    $.ui.log(`observational-memory: Jev pre-pass skipped (${errorText(error)}), observing unpruned`)
    return older
  }
}

const skillsKey = async ($: EngineInterface) => `skills:${await $.session.id()}`
const mergeSkills = (...lists: readonly Skill[][]) => [...new Map(lists.flat().map((s) => [s.skill, s])).values()]

// Skills not already in the raw tail, kept when Jev says they are still needed, all of them without Jev.
async function skillsInUse(
  $: EngineInterface,
  jev: JevAsker | undefined,
  skills: readonly Skill[],
  observations: string,
  tail: readonly SessionMessage[],
  now: Date,
) {
  // A skill the raw tail invoked, by the Skill tool or as /name, is kept without asking.
  const invoked = new Set(
    tail.flatMap((m) => [
      ...m.toolUses.filter((u) => u.tool === 'Skill').map((u) => String(u.input.skill)),
      ...[...m.text.matchAll(/<command-name>\/([^<\s]+)<\/command-name>/g)].map((c) => c[1]!),
    ]),
  )
  const tailText = tail.map(messageText).join('\n')
  const unseen = skills.filter((s) => !tailText.includes(s.text.trim()))
  const recent = unseen.filter((s) => invoked.has(s.skill))
  const pending = unseen.filter((s) => !invoked.has(s.skill))
  if (!pending.length || !jev) return [...recent, ...pending]
  const state = { context: SKILL_CONTEXT, observations, recent: renderHistory(tail, now) }
  for (let over; (over = jevTokens(JSON.stringify(state)) - JEV_STATE_MAX_TOKENS) > 0; ) {
    const field = state.observations.length >= state.recent.length ? 'observations' : 'recent'
    state[field] = state[field].slice(Math.max(over, Math.ceil(state[field].length / 10))) // keep the newest
  }
  const questions: JevQuestions = Object.fromEntries(
    pending.map((s, i) => [
      `skill_${i}`,
      {
        type: 'noul',
        instructions: `Skill \`${s.skill}\`, whose instructions begin "${s.text.trim().slice(0, SKILL_EXCERPT_CHARS)}", still applies to the recent requests or requests like them`,
        criteria: SKILL_CRITERIA,
      },
    ]),
  )
  try {
    const { answers } = await jev.ask(state, questions)
    const kept = pending.filter((_, i) => noulAnswer(answers, `skill_${i}`) >= SKILL_KEEP_AT)
    $.ui.log(`observational-memory: Jev kept ${kept.length} of ${pending.length} skills`)
    return [...recent, ...kept]
  } catch (error) {
    $.ui.log(`observational-memory: keeping all ${pending.length} skills (${errorText(error)})`)
    return [...recent, ...pending]
  }
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
    '## Your Task\n\nExtract new observations from the message history above. Do not repeat observations that are already in the previous observations. Add your new observations in the format specified in your instructions.' +
    // Claude Code's messages carry no time of day, so a time would be invented.
    '\n\nThe message history above carries no times of day. Write every observation without a time: `* 🔴 User asked …`, not `* 🔴 (14:30) User asked …`.'
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
    const tail = messages.slice(start)

    const now = new Date(await $.clock.now())
    const apiKey = await $.env.get('TYPESAFE_API_KEY')
    const jev = apiKey ? jevAsker($, apiKey) : undefined
    const older = await prune($, jev, e.messages.slice(0, e.messages.length - messages.length), messages.slice(0, start), tail)
    const observed = parseOutput(await complete($, OBSERVER_SYSTEM_PROMPT, observerPrompt(renderHistory(older, now), prior)))
    if (!observed.observations) throw new Error('observer produced no observations')

    let memory: Memory = {
      ...observed,
      observations: prior
        ? `${prior.observations}\n\n--- message boundary (${now.toISOString()}) ---\n\n${observed.observations}`
        : observed.observations,
    }
    const reflecting = estimateTokens(memory.observations) >= REFLECT_AT_TOKENS
    if (reflecting) memory = await reflect($, memory)
    // A subagent's compaction carries only its own skills forward: the store holds the main conversation's.
    const recorded = e.agentId === undefined ? ((await $.store.get(await skillsKey($))) as Skill[] | undefined) : undefined
    memory.skills = await skillsInUse($, jev, mergeSkills(prior?.skills ?? [], recorded ?? []), memory.observations, tail, now)

    $.ui.log(
      `observational-memory: observed ${start} messages, kept ${messages.length - start}; ` +
        `log ~${estimateTokens(memory.observations)} tokens${reflecting ? ', reflected' : ''}`,
    )
    return { messages: [memoryMessage(memory), ...tail] }
  }).catch(($, e, next) => {
    // Any failure falls back to the built-in compaction rather than leaving the session over its limit.
    if (next.called) return { skip: `observational-memory: ${next.error.message}` }
    $.ui.log(`observational-memory: ${next.error.message}; using the built-in compaction`)
    return next(e)
  })

  // Subagent preloads fire here too; the event does not say which loop the skill loads into.
  on('skill.prompt', async ($, e, next) => {
    const r = await next(e)
    const key = await skillsKey($)
    const recorded = ((await $.store.get(key)) as Skill[] | undefined) ?? []
    await $.store
      .set(key, mergeSkills(recorded, [{ skill: e.skill, text: r.text }]))
      .catch((error) => $.ui.log(`observational-memory: could not record skill ${e.skill} (${errorText(error)})`))
    return r
  })
}
