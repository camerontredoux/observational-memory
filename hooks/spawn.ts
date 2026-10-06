import { SPAWN_CONSTRAINTS_HEADER, spawnLeftOut } from './prompts'

const SPAWN_MAX_CHARS = 2_000
// A constraint line is `🔴 2026-09-22 09:00 User: "…"`: the subagent needs the words, not the marker or the time.
const MARKED = /^\S+\s+\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?\s+/

// The prompt a subagent runs with: the task, then the main session's constraints in force (oldest first). Past the
// cap the oldest are left out, with a line saying how many; the newest always stays. No constraints: the prompt as is.
export function withConstraints(prompt: string, constraints: readonly string[]): string {
  const items = constraints.map((c) => c.replace(MARKED, '').trim()).filter(Boolean)
  if (!items.length) return prompt
  const block = (from: number) =>
    [SPAWN_CONSTRAINTS_HEADER, ...(from ? [`- ${spawnLeftOut(from)}`] : []), ...items.slice(from).map((c) => `- ${c}`)].join('\n')
  let from = 0
  while (from < items.length - 1 && block(from).length > SPAWN_MAX_CHARS) from++
  return `${prompt}\n\n${block(from)}`
}
