// A pi extension for the benchmark's pi runs (scripts/bench-pi.ts): pi's version of the Claude Code runs' dontAsk
// allow list. A bash call runs only when its command is exactly one of the scenario's commands (OM_BENCH_BASH, a JSON
// list); any other is blocked, and the attempt stays in the session for the checks.
export default function guard(pi: { on: (event: string, handler: (e: any) => unknown) => void }) {
  const allowed: string[] = JSON.parse((globalThis as any).process?.env?.OM_BENCH_BASH ?? '[]')
  pi.on('tool_call', (e) => {
    if (e.toolName !== 'bash') return
    const command = String(e.input?.command ?? '').trim()
    if (!allowed.includes(command)) return { block: true, reason: `Permission denied. Allowed commands: ${allowed.join(', ') || 'none'}` }
  })
}
