// What the replay benchmark (`replay.ts`, `scripts/bench-replay.ts`) shares about the configurations it compares and
// the headless sessions it runs: the four configurations, the session model and its prices, the recall tool's name,
// and the checks on what a session will load. Pure: no file system, process or model call here.

/** The four configurations compared (issue #1), in the order they are always reported. */
export type Configuration = 'builtin' | 'builtin+recall' | 'om' | 'om+recall'
export const CONFIGURATIONS: readonly Configuration[] = ['builtin', 'builtin+recall', 'om', 'om+recall']

/** Whether `om_recall` is offered to the assistant in this configuration. */
export const recallAvailable = (config: Configuration): boolean => config.endsWith('+recall')

export const MODEL = 'sonnet'
export const RECALL_TOOL = 'mcp__observational-memory__om_recall'

// List prices in USD per million tokens, matched against a model id. Cache writes: the five-minute and one-hour rates.
export const PRICES_USD_PER_MTOK: readonly { model: RegExp; input: number; output: number; cacheWrite5m: number; cacheWrite1h: number; cacheRead: number }[] = [
  { model: /sonnet/i, input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.3 },
  { model: /haiku/i, input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.1 },
  { model: /opus/i, input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 },
]

const quote = (s: string) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`)
export const shellLine = (argv: readonly string[]) => argv.map(quote).join(' ')

/** Problems with `claude plugin list --json`: none when exactly the expected plugin loads, cleanly (none expected: no observational-memory plugin). */
export function checkPluginList(json: string, plan: { expectedPlugin?: string }): string[] {
  let entries: { id?: string; enabled?: boolean; installPath?: string; errors?: unknown[] }[]
  try {
    entries = JSON.parse(json)
    if (!Array.isArray(entries)) throw new Error('not a list')
  } catch (error) {
    return [`claude plugin list did not print JSON (${error instanceof Error ? error.message : String(error)})`]
  }
  const trim = (p?: string) => (p ?? '').replace(/\/$/, '')
  const om = entries.filter((e) => e.enabled && String(e.id).startsWith('observational-memory@'))
  const problems: string[] = []
  if (!plan.expectedPlugin) {
    if (om.length) problems.push(`expected no observational-memory plugin, found ${om.map((e) => trim(e.installPath)).join(', ')}`)
  } else {
    if (om.length !== 1 || trim(om[0]!.installPath) !== plan.expectedPlugin)
      problems.push(`expected observational-memory from ${plan.expectedPlugin} alone, found ${om.map((e) => trim(e.installPath)).join(', ') || 'none'}`)
  }
  for (const e of om) if (e.errors?.length) problems.push(`${e.id} at ${trim(e.installPath)}: ${e.errors.map(String).join('; ')}`)
  return problems
}

const RECALL_ONLY_HOOKS = ['session.start', `tool.call{tool=${RECALL_TOOL}}`, `tool.describe{tool=${RECALL_TOOL}}`, 'classic.SessionStart', 'classic.Stop']

/** Problems with `claude plugin validate` of an assembled recall-only plugin: it must pass and handle om_recall alone. */
export function checkRecallOnly(validateOutput: string): string[] {
  const problems = /Validation passed/.test(validateOutput) ? [] : ['claude plugin validate did not pass']
  const hooks = [...validateOutput.matchAll(/^\s*❯ .* hooks: (.*)$/gm)].flatMap((m) => m[1]!.split(', ').map((h) => h.trim()))
  const extra = hooks.filter((h) => !RECALL_ONLY_HOOKS.includes(h))
  if (!hooks.includes(`tool.call{tool=${RECALL_TOOL}}`)) problems.push('it handles no om_recall call')
  if (extra.length) problems.push(`it handles more than om_recall: ${extra.join(', ')}`)
  return problems
}
