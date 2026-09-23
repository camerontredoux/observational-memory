// The session brief: a deterministic, model-free record of the compacted transcript (files changed, commits,
// failures left open at its end, and a ranked transcript of its high-value tool events), merged across compactions
// by code and never read by the Reflector.
//
// Adapted from pi-vcc v0.7.0 (https://github.com/sting8k/pi-vcc, MIT, Copyright (c) 2026 sting8k and pi-vcc
// contributors), by way of the pi-observational-memory-vcc adaptation (src/vcc/core/{normalize,filter-noise,brief,
// rank,summarize,build-sections}.ts, src/vcc/extract/{files,commits}.ts). Normalization is rewritten for Claude
// Code's rows: a tool call carries its own result, and Bash commands are read for the files they write.
// See THIRD_PARTY_NOTICES.md and LICENSES/pi-vcc-MIT.txt.
import type { SessionMessage } from 'claude-code'

export const BRIEF_MAX_TOKENS = 3_000 // the whole section, a hard cap
const TRANSCRIPT_MAX_TOKENS = 2_000 // pi-vcc's ranked-transcript ceiling (briefBudgetCeilingTokens), across compactions
const TRANSCRIPT_FRESH_TOKENS = 1_400 // of it, the newest span's; the rest keeps the tail of earlier spans
const FILES_SHOWN = 15 // per category, newest kept; the rest counted
const COMMITS_KEPT = 8 // pi-vcc's formatCommits limit
const OUTSTANDING_MAX = 5
const OUTSTANDING_TAIL = 30 // blocks at the end of the span read for open failures
const PRESERVE_RECENT = 8 // newest blocks kept in the transcript before ranking, as pi-vcc's preserveRecentBlocks
const LINE_CHARS = 200 // one transcript or outstanding line at most
const BASH_CAP = 160
const HEREDOC_BODY_CAP = 60

export type Brief = {
  modified: string[] // oldest first, newest last
  created: string[]
  earlierModified: number // paths dropped past FILES_SHOWN, counted
  earlierCreated: number
  commits: string[]
  outstanding: string[] // replaced at every compaction, never merged
  transcript: string[] // `@ YYYY-MM-DD` day lines and `- HH:MM ...` event lines
  omitted: number // transcript lines dropped for the cap, counted
}
export const emptyBrief = (): Brief => ({ modified: [], created: [], earlierModified: 0, earlierCreated: 0, commits: [], outstanding: [], transcript: [], omitted: 0 })

// ── normalization ──

type Result = { text: string; isError: boolean }
type Block =
  | { kind: 'user'; i: number; at?: number }
  | { kind: 'assistant'; i: number; at?: number; text: string }
  | { kind: 'tool'; i: number; at?: number; name: string; input: Record<string, unknown>; result?: Result }

// pi-vcc's filter-noise list, with Claude Code's own bookkeeping tools and this plugin's.
const NOISE_TOOLS = new Set(['TodoWrite', 'TodoRead', 'ToolSearch', 'Skill', 'ExitPlanMode', 'EnterPlanMode', 'AskUserQuestion', 'Monitor', 'TaskStop'])
const isNoiseTool = (name: string) => NOISE_TOOLS.has(name) || name.startsWith('mcp__observational-memory__')

// ANSI escapes and control characters out, newlines kept (pi-vcc sanitize); and nothing that could close the section.
const sanitize = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/<(\/?)session-brief>/g, '‹$1session-brief›')
const oneLine = (text: string) => sanitize(text).replace(/\s+/g, ' ').trim()
const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)

// Rows in call order, each tool call joined to its result; typed prompts kept as markers for where a turn closes.
function normalize(rows: readonly SessionMessage[], at: readonly (number | undefined)[]): Block[] {
  const blocks: Block[] = []
  const calls = new Map<string, Extract<Block, { kind: 'tool' }>>()
  rows.forEach((m, i) => {
    const t = at[i]
    if (m.role === 'user') {
      for (const r of m.toolResults ?? []) {
        const call = calls.get(r.tool_use_id)
        if (call) call.result = { text: sanitize(r.text), isError: r.isError === true }
      }
      if (!m.toolResults?.length && m.text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim()) blocks.push({ kind: 'user', i, at: t })
      return
    }
    const text = sanitize(m.text).trim()
    if (text && text !== '(no content)') blocks.push({ kind: 'assistant', i, at: t, text })
    for (const u of m.toolUses) {
      if (!u.tool || isNoiseTool(u.tool)) continue
      const call: Extract<Block, { kind: 'tool' }> = { kind: 'tool', i, at: t, name: u.tool, input: u.input ?? {} }
      if (u.text !== undefined) call.result = { text: sanitize(u.text), isError: u.isError === true }
      calls.set(u.tool_use_id, call)
      blocks.push(call)
    }
  })
  return blocks
}

// ── shell reading ──

const HEREDOC_OPEN = /(?<![\w)])<<-?\s*["']?([A-Za-z_]\w*)["']?/
// The line index a heredoc opened on `lines[i]` closes on, or -1 (pi-vcc's hardened heredocCloseIndex).
function heredocClose(lines: readonly string[], i: number) {
  const term = lines[i]!.match(HEREDOC_OPEN)?.[1]
  if (!term) return -1
  for (let j = i + 1; j < lines.length; j++) if (lines[j]!.trim() === term) return j
  return -1
}
// A command's shell lines, heredoc bodies apart.
function splitHeredocs(command: string) {
  const lines = command.split('\n')
  const shell: string[] = []
  const bodies: { opener: string; body: string[] }[] = []
  for (let i = 0; i < lines.length; i++) {
    shell.push(lines[i]!)
    const close = heredocClose(lines, i)
    if (close < 0) continue
    bodies.push({ opener: lines[i]!, body: lines.slice(i + 1, close) })
    i = close
  }
  return { shell, bodies }
}

// Words of one shell line, quotes removed, operators as their own words.
function words(line: string) {
  const out: string[] = []
  let cur: string | undefined
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!
    if (c === "'" || c === '"') {
      const end = line.indexOf(c, i + 1)
      cur = (cur ?? '') + line.slice(i + 1, end < 0 ? line.length : end)
      i = end < 0 ? line.length : end
    } else if (c === '\\' && i + 1 < line.length) cur = (cur ?? '') + line[++i]
    else if (/\s/.test(c)) {
      if (cur !== undefined) out.push(cur)
      cur = undefined
    } else if (';&|()<>'.includes(c)) {
      if (cur !== undefined && !(c === '>' && /^\d$/.test(cur))) out.push(cur)
      let op = c
      if (c === '>' && cur !== undefined && /^\d$/.test(cur)) op = `${cur}>`
      cur = undefined
      while (i + 1 < line.length && ';&|<>'.includes(line[i + 1]!) && op.length < 3) op += line[++i]
      out.push(op)
    } else cur = (cur ?? '') + c
  }
  if (cur !== undefined) out.push(cur)
  return out
}
const OPERATORS = new Set([';', '&&', '||', '|', '&', '(', ')'])
function segments(ws: readonly string[]) {
  const out: string[][] = [[]]
  for (const w of ws) {
    if (OPERATORS.has(w)) out.push([])
    else out.at(-1)!.push(w)
  }
  return out.filter((s) => s.length)
}

function resolvePath(raw: string, dir: string, home?: string) {
  let p = raw
  if (home && (p === '~' || p.startsWith('~/'))) p = home + p.slice(1)
  if (!p.startsWith('/')) p = `${dir.replace(/\/$/, '')}/${p}`
  const parts: string[] = []
  for (const s of p.split('/')) {
    if (s === '..') parts.pop()
    else if (s && s !== '.') parts.push(s)
  }
  return `/${parts.join('/')}`
}
const SCRATCH = /^\/(?:tmp|dev|proc|var\/tmp)(?:\/|$)/

// The files a Bash command writes: redirections, tee, sed -i, sd, and a Python heredoc that opens a file to write.
// Variables set in the command (`F=/x; B=$F/y`) and a leading `cd` are followed; anything unresolved is left out.
export function bashWrites(command: string, cwd: string, home?: string) {
  const vars = new Map<string, string>()
  const expand = (w: string) => w.replace(/\$\{?(\w+)\}?/g, (m, name: string) => vars.get(name) ?? (name === 'HOME' && home ? home : m))
  let dir = cwd
  const out: string[] = []
  const add = (raw: string) => {
    const w = expand(raw)
    if (!w || w.includes('$') || /[*?`]/.test(w) || w.startsWith('-') || w.startsWith('&')) return
    const p = resolvePath(w, dir, home)
    if (!SCRATCH.test(p)) out.push(p)
  }
  const { shell, bodies } = splitHeredocs(command)
  for (const line of shell)
    for (const seg of segments(words(line))) {
      let s = seg
      while (s.length && /^\w+=/.test(s[0]!) && !s[0]!.includes('$(')) {
        const [name, ...value] = s[0]!.split('=')
        vars.set(name!, expand(value.join('=')))
        s = s.slice(1)
      }
      if (s[0] === 'export') s = s.slice(1)
      if (!s.length) continue
      if (s[0] === 'cd' && s[1]) dir = resolvePath(expand(s[1]), dir, home)
      for (let k = 0; k < s.length - 1; k++) if (s[k] === '>' || s[k] === '>>' || s[k] === '&>' || s[k] === '1>' || s[k] === '>|') add(s[k + 1]!)
      const args = s.filter((w, k) => !/^(?:\d?>>?|&>|<|<<-?|>\|)$/.test(w) && !(k > 0 && /^(?:\d?>>?|&>|<|<<-?|>\|)$/.test(s[k - 1]!)))
      const cmd = args[0]
      if (cmd === 'tee') args.slice(1).filter((w) => !w.startsWith('-')).forEach(add)
      if (cmd === 'sed' && args.some((w) => /^-i/.test(w) || w === '--in-place')) {
        const rest = args.slice(1)
        const scriptGiven = rest.some((w) => w === '-e' || w === '-f')
        const operands = rest.filter((w, k) => !w.startsWith('-') && !(k > 0 && (rest[k - 1] === '-e' || rest[k - 1] === '-f')))
        operands.slice(scriptGiven ? 0 : 1).forEach(add)
      }
      if (cmd === 'sd') {
        const operands = args.slice(1).filter((w) => !w.startsWith('-'))
        operands.slice(2).forEach(add)
      }
    }
  for (const { opener, body } of bodies) {
    if (!/\bpython3?\b|\buv run\b/.test(opener)) continue
    const text = body.join('\n')
    const assigned = new Map<string, string>()
    for (const m of text.matchAll(/^\s*(\w+)\s*=\s*(?:Path\(\s*)?(?:r?['"])([^'"\n]+)['"]/gm)) assigned.set(m[1]!, m[2]!)
    const targets = [
      ...[...text.matchAll(/open\(\s*(\w+|'[^']+'|"[^"]+")\s*,\s*['"][wa]/g)].map((m) => m[1]!),
      ...[...text.matchAll(/(\w+)\.write_text\(/g)].map((m) => m[1]!),
      ...[...text.matchAll(/Path\(\s*('[^']+'|"[^"]+")\s*\)\.write_text\(/g)].map((m) => m[1]!),
    ]
    for (const t of targets) {
      const lit = /^['"]/.test(t) ? t.slice(1, -1) : assigned.get(t)
      if (lit) add(lit)
    }
  }
  return [...new Set(out)]
}

// pi-vcc's compressBash: heredoc bodies dropped (a one-line preview for an interpreter's), preamble and `cd`/variable
// segments dropped, pipe tails stripped, lines joined with `; ` and capped.
const TRIVIAL_LINE = /^(?:set\s+[-+]|cd\s+\S+$|export\s+\w+=|(?:source|\.)\s+\S+|pwd$|true$|:$|#)/
const PIPE_TAIL = /\s*\|\s*(?:head|tail|sort|wc|column|tr|cut|awk|uniq|rtk proxy grep|grep|rg)(?:\s[^|]*)?$/
const FILE_WRITER_HEREDOC = /(?:^|[|&;]\s*)(?:cat|tee|dd)\b/
const BODY_NOISE = /^(?:import\s|from\s+\S+\s+import|require\(|const\s+\w+\s*=\s*require|#|\/\/|"""|'''|"use strict")/
export function compressBash(raw: string) {
  const rawLines = raw.split('\n')
  const lines: string[] = []
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i]!
    const close = heredocClose(rawLines, i)
    if (close >= 0) {
      if (!FILE_WRITER_HEREDOC.test(line)) {
        const preview = rawLines.slice(i + 1, close).map((l) => l.trim()).find((l) => l && !BODY_NOISE.test(l))
        if (preview) line = `${line.trim()} ${clip(preview, HEREDOC_BODY_CAP)}`
      }
      i = close
    }
    lines.push(line.trim())
  }
  const strip = (line: string) => {
    // Leading `cd dir;`, `cd dir &&` and `VAR=value;` segments carry nothing the command itself does not.
    let l = line
    for (let prev = ''; prev !== l; ) {
      prev = l
      l = l.replace(/^\(?cd\s+\S+\s*(?:&&|;)\s*/, '').replace(/^\w+=(?:'[^']*'|"[^"]*"|[^\s;'"]*)\s*;\s*/, '').replace(/^rtk\s+(?:proxy\s+)?/, '')
    }
    for (let k = 0; k < 3; k++) l = l.replace(PIPE_TAIL, '')
    return l.trim()
  }
  const kept = lines.filter(Boolean)
  const meaningful = kept.filter((l) => !TRIVIAL_LINE.test(l)).map(strip).filter(Boolean)
  const chosen = meaningful.length ? meaningful : kept.slice(0, 1).map(strip)
  return clip(oneLine(chosen.join('; ')), BASH_CAP)
}

// ── extraction ──

const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit'])
const pathOf = (input: Record<string, unknown>) => {
  for (const k of ['file_path', 'notebook_path', 'path']) if (typeof input[k] === 'string') return input[k] as string
  return undefined
}
const commandOf = (b: Block) => (b.kind === 'tool' && b.name === 'Bash' && typeof b.input.command === 'string' ? b.input.command : undefined)

// How a path reads in the brief: under the session's directory, relative to it; under home, from `~`.
export function displayPath(path: string, cwd: string, home?: string) {
  const dir = cwd.replace(/\/$/, '')
  if (path.startsWith(`${dir}/`)) return path.slice(dir.length + 1)
  if (home && path.startsWith(`${home.replace(/\/$/, '')}/`)) return `~${path.slice(home.replace(/\/$/, '').length)}`
  return path
}

// Files written, by the edit tools (a Write that answered "File created" created it) or by a Bash command that
// succeeded; oldest first, each at its latest touch. A file created in the span is listed as created only.
function extractFiles(blocks: readonly Block[], cwd: string, home?: string) {
  const touched = new Map<string, 'modified' | 'created'>()
  const touch = (path: string, kind: 'modified' | 'created') => {
    const was = touched.get(path)
    touched.delete(path)
    touched.set(path, was === 'created' ? 'created' : kind)
  }
  for (const b of blocks) {
    if (b.kind !== 'tool' || b.result?.isError) continue
    if (EDIT_TOOLS.has(b.name)) {
      const p = pathOf(b.input)
      if (p) touch(displayPath(resolvePath(p, cwd, home), cwd, home), b.name === 'Write' && /^File created/.test(b.result?.text ?? '') ? 'created' : 'modified')
    }
    const command = commandOf(b)
    if (command && b.result) for (const p of bashWrites(command, cwd, home)) touch(displayPath(p, cwd, home), 'modified')
  }
  const modified: string[] = []
  const created: string[] = []
  for (const [p, kind] of touched) (kind === 'created' ? created : modified).push(p)
  return { modified, created }
}

// `git commit -m "..."`, `-m '...'`, and the `-m "$(cat <<'EOF' ... EOF)"` form, with the hash its result prints.
export function extractCommits(blocks: readonly Block[]) {
  const commits: string[] = []
  for (const b of blocks) {
    const command = commandOf(b)
    if (!command || !/\bgit\s+commit\b/.test(command) || b.kind !== 'tool' || b.result?.isError) continue
    const heredoc = command.match(/-m\s+"\$\(cat\s+<<-?\s*'?(\w+)'?\s*\n([\s\S]*?)\n\s*\1\s*\n?\s*\)"/)
    const inline = command.match(/git\s+commit[^\n]*?-m\s+(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/)
    const message = (heredoc?.[2] ?? inline?.[1] ?? inline?.[2] ?? '').replace(/\\(["'\\$`])/g, '$1').trim().split('\n')[0]!.trim()
    const text = b.result?.text ?? ''
    const hash = text.match(/\[[^\]\s]+(?: \([^)]*\))? ([0-9a-f]{7,12})\]/)?.[1]
    const subject = message || text.match(/\[[^\]]+\] (.+)/)?.[1]
    if (!subject) continue
    const line = oneLine(`${hash ? `${hash} ` : ''}${subject}`)
    if (!commits.includes(line)) commits.push(line)
  }
  return commits
}

// The line of a failed tool result that says what went wrong.
function errorLine(text: string) {
  if (/^PreToolUse:\w+ hook error|^<tool_use_error>Blocked/.test(text)) return 'blocked by a hook'
  const lines = text.replace(/<\/?tool_use_error>/g, '').split('\n').map((l) => l.trim()).filter(Boolean)
  const body = lines.filter((l) => !/^Exit code \d+$/.test(l))
  return clip(oneLine(body.find((l) => /error|fail|not found|cannot|denied|refused|invalid|✗|Traceback|Exception|No such/i.test(l)) ?? body[0] ?? ''), 120)
}
const exitCode = (r: Result) => r.text.match(/^Exit code (\d+)/)?.[1]

const TEST_COMMAND = /\b(?:bun|bunx|npm|pnpm|yarn|node|pytest|cargo|go|mvn|gradle|vitest|jest|tsc|eslint|just|make|claude plugin)\b[^\n]*\b(?:test|spec|check|lint|build|tsc|typecheck|validate)\b/i
const WORKFLOW_COMMAND = /(?:^|[\s;&(])(?:gh\s+(?:pr|issue|run)\s+[a-z-]+|git\s+(?:commit|push|merge|rebase|revert|cherry-pick|tag|reset|checkout|switch|branch|worktree|stash)\b)/i
const GH_PR_POLL = /(?:^|\s)gh\s+pr\s+(?:view|checks)\s+(\d+)\b/i
const TRIVIAL_BASH_LINE = /^(?:set\s+[-+]|cd(?:\s+\S+)?$|export\s+\w+=|(?:source|\.)\s+\S+|pwd$|true$|:$|#|ls(?:\s|$)|echo\b|clear$|sleep\b)/
const isTrivialBash = (command: string) =>
  splitHeredocs(command)
    .shell.flatMap((l) => l.split(/\s*(?:;|&&)\s*/))
    .map((l) => l.trim())
    .filter((l) => l && !/^\w+=\S*$/.test(l))
    .every((l) => TRIVIAL_BASH_LINE.test(l))

// A test or type check's result in a line: the last line that counts passes, failures or errors.
function testSummary(text: string) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const hit = [...lines].reverse().find((l) => /\b\d+\s+(?:pass(?:ed|ing)?|fail(?:ed|ing|ures?)?|errors?|tests?)\b|error TS\d+|\bFAIL\b|\bPASS\b/i.test(l))
  return hit ? clip(oneLine(hit), 100) : undefined
}

const hhmm = (ms: number) => {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const day = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// One event as the brief shows it, after its time: the tool and its target or command, then how it ended.
function eventText(b: Block, cwd: string, home?: string) {
  if (b.kind === 'assistant') return `said: ${clip(oneLine(b.text), 160)}`
  if (b.kind !== 'tool') return ''
  const path = pathOf(b.input)
  const command = commandOf(b)
  let head: string
  if (command !== undefined) head = `Bash "${compressBash(command)}"`
  else if (path) head = `${b.name} ${displayPath(resolvePath(path, cwd, home), cwd, home)}${b.name === 'Write' && /^File created/.test(b.result?.text ?? '') ? ' (created)' : ''}`
  else {
    const arg = ['pattern', 'query', 'description', 'url', 'prompt'].map((k) => b.input[k]).find((v) => typeof v === 'string') as string | undefined
    head = arg ? `${b.name} "${clip(oneLine(arg), 80)}"` : b.name
  }
  if (!b.result) return head
  if (b.result.isError) {
    const code = exitCode(b.result)
    const why = errorLine(b.result.text)
    return `${head} ✗${code ? ` exit ${code}` : ''}${why ? `: ${why}` : ''}`
  }
  if (command && TEST_COMMAND.test(command)) {
    const summary = testSummary(b.result.text)
    if (summary) return `${head} → ${summary}`
  }
  return head
}
const eventLine = (b: Block, cwd: string, home?: string) => `- ${b.at === undefined ? '' : `${hhmm(b.at)} `}${clip(eventText(b, cwd, home), LINE_CHARS)}`

// ── Outstanding Context ──

const BLOCKER =
  /\b(fail(ed|s|ure|ing)?|broken|cannot|can't|won't work|does not work|doesn't work|still (broken|failing|wrong)|blocked|blocker|not (fixed|resolved|working)|crash(es|ed|ing)?)\b/i
const dedupKey = (b: Block) => {
  const command = commandOf(b)
  const poll = command?.match(GH_PR_POLL)
  if (poll) return `gh-pr-poll:${poll[1]}`
  if (command) return `bash:${compressBash(command)}`
  if (b.kind === 'tool') {
    const p = pathOf(b.input)
    return p ? `tool:${b.name}:${p}` : undefined
  }
  return undefined
}

// Failures near the end of the span that no later call in it repeated successfully, then the assistant's own
// lines there that name something failing or blocked (pi-vcc's blocker lines, the user's left out: they are quoted
// in full elsewhere).
function extractOutstanding(blocks: readonly Block[], cwd: string, home?: string) {
  const tail = blocks.slice(-OUTSTANDING_TAIL)
  const items: string[] = []
  tail.forEach((b, k) => {
    if (b.kind !== 'tool' || !b.result?.isError) return
    const key = dedupKey(b)
    const fixed = tail.slice(k + 1).some((later) => later.kind === 'tool' && later.result && !later.result.isError && key !== undefined && dedupKey(later) === key)
    if (!fixed) items.push(eventLine(b, cwd, home))
  })
  for (const b of tail) {
    if (b.kind !== 'assistant') continue
    const line = b.text.split('\n').map((l) => l.trim()).find((l) => BLOCKER.test(l) && l.length >= 15 && !/^[-*+>(]/.test(l) && /^["'`*_]?[A-Z`]/.test(l))
    if (line) items.push(`- ${b.at === undefined ? '' : `${hhmm(b.at)} `}${clip(oneLine(line), LINE_CHARS - 10)}`)
  }
  return [...new Set(items)].slice(-OUTSTANDING_MAX)
}

// ── ranked transcript (pi-vcc rank.ts) ──

type Ranked = { b: Block; score: number; important: boolean }
// Scored over the whole span, typed prompts included, so an answer that closes a turn is known by what follows it.
function rank(blocks: readonly Block[], modified: ReadonlySet<string>, cwd: string, home?: string): Ranked[] {
  const total = blocks.length
  const ranked = blocks.map((b, index): Ranked => {
    let score = total <= 1 ? 0 : Math.round((index / (total - 1)) * 12) // recency
    let important = false
    if (b.kind === 'assistant') score += 10
    if (b.kind === 'tool') {
      const command = commandOf(b)
      if (EDIT_TOOLS.has(b.name)) (score += 34), (important = true)
      else if (command && TEST_COMMAND.test(command)) (score += 26), (important = true)
      else if (/^(Read|Glob|Grep|LS)$/.test(b.name)) score += 6
      else score += 12
      if (command && WORKFLOW_COMMAND.test(command)) score += 14
      if (b.result?.isError) (score += 24), (important = true)
      else if (command && isTrivialBash(command)) score -= 16
      const p = pathOf(b.input)
      if (p && modified.has(displayPath(resolvePath(p, cwd, home), cwd, home))) score += 18
      if (command && bashWrites(command, cwd, home).length && !b.result?.isError) score += 18
    }
    return { b, score, important }
  })
  // The assistant's words just before an important event, and just after it, explain it.
  ranked.forEach((r, index) => {
    if (!r.important) return
    const before = ranked.slice(Math.max(0, index - 4), index).reverse().find((x) => x.b.kind === 'assistant')
    if (before) before.score += 7
    const after = ranked.slice(index + 1, index + 5).find((x) => x.b.kind === 'assistant')
    if (after) after.score += 5
  })
  // An answer that closes a turn (a prompt follows it, or nothing does) says what came of it.
  ranked.forEach((r, index) => {
    if (r.b.kind !== 'assistant' || r.b.text.length < 120) return
    const next = ranked[index + 1]
    if (!next || next.b.kind === 'user') r.score += 14
  })
  return ranked
}

// Which transcript lines say the same thing: a Bash command by its compressed form and outcome (a failure and
// its fixed rerun are both kept), a PR's polls as one, a read or search by its target. Edits are never merged.
function selectKey(b: Block) {
  if (b.kind !== 'tool') return undefined
  const command = commandOf(b)
  const poll = command?.match(GH_PR_POLL)
  if (poll) return `gh-pr-poll:${poll[1]}`
  if (command) return `bash:${compressBash(command)}:${b.result?.isError ? 'x' : 'ok'}`
  if (EDIT_TOOLS.has(b.name)) return undefined
  const target = pathOf(b.input) ?? b.input.pattern ?? b.input.query
  return typeof target === 'string' ? `tool:${b.name}:${target}` : undefined
}

// The newest PRESERVE_RECENT events, then the rest by score, within `maxChars` of rendered lines; in span order.
function selectTranscript(blocks: readonly Block[], modified: ReadonlySet<string>, maxChars: number, cwd: string, home?: string) {
  const events = rank(blocks, modified, cwd, home)
    .map((r, k) => ({ ...r, k }))
    .filter((r) => r.b.kind !== 'user')
  const lines = events.map((r) => eventLine(r.b, cwd, home))
  const selected = new Set<number>()
  const seen = new Set<string>()
  // Each day the span covers may take a `@ YYYY-MM-DD` line.
  let used = new Set(events.flatMap((r) => (r.b.at === undefined ? [] : [day(r.b.at)]))).size * '@ YYYY-MM-DD\n'.length
  const take = (e: number) => {
    const key = selectKey(events[e]!.b)
    if (selected.has(e) || (key && seen.has(key)) || used + lines[e]!.length + 1 > maxChars) return
    selected.add(e)
    used += lines[e]!.length + 1
    if (key) seen.add(key)
  }
  for (let e = events.length - 1; e >= Math.max(0, events.length - PRESERVE_RECENT); e--) take(e)
  events
    .map((r, e) => ({ score: r.score, e }))
    .sort((a, b) => b.score - a.score || b.e - a.e)
    .forEach(({ e }) => take(e))
  const out: string[] = []
  let lastDay: string | undefined
  const bare = (l: string) => l.replace(/^- (?:\d\d:\d\d )?/, '').replace(/ \(x\d+\)$/, '')
  for (const e of [...selected].sort((a, b) => a - b)) {
    const at = events[e]!.b.at
    if (at !== undefined && day(at) !== lastDay) out.push(`@ ${(lastDay = day(at))}`)
    // pi-vcc collapses a run of the same tool line: `(xN)`.
    const prev = out.at(-1)
    if (prev?.startsWith('- ') && bare(prev) === bare(lines[e]!)) {
      const n = Number(prev.match(/ \(x(\d+)\)$/)?.[1] ?? 1) + 1
      out[out.length - 1] = `${lines[e]!} (x${n})`
    } else out.push(lines[e]!)
  }
  return out
}

// ── compile, merge, cap ──

// The brief of rows [0, n) of a compaction's span: `rows` in call order, `at` each row's time.
export function compileBrief(rows: readonly SessionMessage[], at: readonly (number | undefined)[], cwd: string, home?: string): Brief {
  const blocks = normalize(rows, at)
  const { modified, created } = extractFiles(blocks, cwd, home)
  return {
    ...emptyBrief(),
    modified,
    created,
    commits: extractCommits(blocks).slice(-COMMITS_KEPT),
    outstanding: extractOutstanding(blocks, cwd, home),
    transcript: selectTranscript(blocks, new Set(modified), TRANSCRIPT_FRESH_TOKENS * 4, cwd, home),
  }
}

const tokens = (text: string) => Math.ceil(text.length / 4)

// The newest transcript lines within `maxChars`, led by the day line they fall under.
function transcriptTail(lines: readonly string[], maxChars: number) {
  let used = 0
  let k = lines.length
  while (k > 0 && used + lines[k - 1]!.length + 1 <= maxChars) used += lines[--k]!.length + 1
  const kept = lines.slice(k)
  const dayLine = lines.slice(0, k).findLast((l) => l.startsWith('@ '))
  const lead = kept[0]?.startsWith('@ ') || !kept.length || !dayLine ? [] : [dayLine]
  const dropped = lines.slice(0, k).filter((l) => l.startsWith('- ')).length
  return { lines: [...lead, ...kept], dropped }
}

// pi-vcc's mergePrevious: paths deduplicated per category (a path touched again moves to the newest end), the last
// COMMITS_KEPT commits, Outstanding Context fresh, and the transcript tail-budgeted with the fresh span first.
// The result is capped at BRIEF_MAX_TOKENS.
export function mergeBriefs(prev: Brief | undefined, fresh: Brief): Brief {
  const p = prev ?? emptyBrief()
  const createdAll = [...p.created.filter((x) => !fresh.created.includes(x)), ...fresh.created]
  const modifiedAll = [...p.modified.filter((x) => !fresh.modified.includes(x)), ...fresh.modified].filter((x) => !createdAll.includes(x))
  const shown = (all: string[]) => ({ list: all.slice(-FILES_SHOWN), over: Math.max(0, all.length - FILES_SHOWN) })
  const m = shown(modifiedAll)
  const c = shown(createdAll)
  const commits = [...p.commits.filter((x) => !fresh.commits.includes(x)), ...fresh.commits].slice(-COMMITS_KEPT)
  let transcript = fresh.transcript
  let omitted = p.omitted + fresh.omitted
  const freshChars = fresh.transcript.join('\n').length + 1
  const room = TRANSCRIPT_MAX_TOKENS * 4 - freshChars
  if (p.transcript.length) {
    const tail = transcriptTail(p.transcript, Math.max(0, room))
    omitted += tail.dropped
    const lastDay = tail.lines.findLast((l) => l.startsWith('@ '))
    transcript = [...tail.lines, ...(fresh.transcript[0] === lastDay ? fresh.transcript.slice(1) : fresh.transcript)]
  }
  const merged: Brief = {
    modified: m.list,
    created: c.list,
    earlierModified: p.earlierModified + m.over,
    earlierCreated: p.earlierCreated + c.over,
    commits,
    outstanding: fresh.outstanding,
    transcript,
    omitted,
  }
  return capBrief(merged)
}

// Over the cap, the oldest transcript lines go first, then the oldest paths, then the oldest commits.
export function capBrief(brief: Brief): Brief {
  const b = { ...brief, transcript: [...brief.transcript], modified: [...brief.modified], created: [...brief.created], commits: [...brief.commits], outstanding: [...brief.outstanding] }
  while (tokens(renderBrief(b)) > BRIEF_MAX_TOKENS) {
    const firstEvent = b.transcript.findIndex((l) => l.startsWith('- '))
    if (firstEvent >= 0) {
      const lead = b.transcript.slice(0, firstEvent).findLast((l) => l.startsWith('@ '))
      b.transcript.splice(0, firstEvent + 1)
      if (lead && b.transcript.length && !b.transcript[0]!.startsWith('@ ')) b.transcript.unshift(lead)
      if (!b.transcript.some((l) => l.startsWith('- '))) b.transcript = []
      b.omitted++
    } else if (b.modified.length) b.modified.shift(), b.earlierModified++
    else if (b.created.length) b.created.shift(), b.earlierCreated++
    else if (b.commits.length) b.commits.shift()
    else if (b.outstanding.length) b.outstanding.shift()
    else break
  }
  return b
}

// ── render and parse ──

export const BRIEF_NOTE =
  '> Compiled by code from the compacted transcript, not by a model: the files it changed, its commits, failures still open at its end, and its key tool events, oldest first. om_recall finds the full text.'
const FILES = '[Files And Changes]'
const COMMITS = '[Commits]'
const OUTSTANDING = '[Outstanding Context]'
const TRANSCRIPT = '[Brief Transcript]'
const earlierNote = (n: number) => (n ? ` (+${n} earlier)` : '')

// The section's body; every line starts with `>`, `[`, `-` or `@`, so no line inside it can open or close a tag.
export function renderBrief(b: Brief) {
  const parts: string[] = []
  if (b.modified.length || b.created.length) {
    parts.push(FILES)
    if (b.modified.length) parts.push(`- Modified: ${b.modified.join(', ')}${earlierNote(b.earlierModified)}`)
    if (b.created.length) parts.push(`- Created: ${b.created.join(', ')}${earlierNote(b.earlierCreated)}`)
  }
  if (b.commits.length) parts.push(COMMITS, ...b.commits.map((c) => `- ${c}`))
  if (b.outstanding.length) parts.push(OUTSTANDING, ...b.outstanding)
  if (b.transcript.length) parts.push(TRANSCRIPT, ...(b.omitted ? [`> ${b.omitted} earlier lines omitted`] : []), ...b.transcript)
  return parts.length ? [BRIEF_NOTE, ...parts].join('\n') : ''
}

export function parseBrief(body: string): Brief {
  const b = emptyBrief()
  let at = ''
  const files = (line: string, prefix: string) => {
    const rest = line.slice(prefix.length)
    const over = rest.match(/ \(\+(\d+) earlier\)$/)
    return { list: rest.replace(/ \(\+\d+ earlier\)$/, '').split(', ').filter(Boolean), over: Number(over?.[1] ?? 0) }
  }
  for (const line of body.split('\n')) {
    if ([FILES, COMMITS, OUTSTANDING, TRANSCRIPT].includes(line)) {
      at = line
      continue
    }
    if (at === FILES && line.startsWith('- Modified: ')) ({ list: b.modified, over: b.earlierModified } = files(line, '- Modified: '))
    else if (at === FILES && line.startsWith('- Created: ')) ({ list: b.created, over: b.earlierCreated } = files(line, '- Created: '))
    else if (at === COMMITS && line.startsWith('- ')) b.commits.push(line.slice(2))
    else if (at === OUTSTANDING && line.startsWith('- ')) b.outstanding.push(line)
    else if (at === TRANSCRIPT && /^> \d+ earlier lines omitted$/.test(line)) b.omitted = Number(line.match(/\d+/)![0])
    else if (at === TRANSCRIPT && (line.startsWith('- ') || line.startsWith('@ '))) b.transcript.push(line)
  }
  return b
}
