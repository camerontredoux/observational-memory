// Mechanical facts read from a chunk's tool calls and results, without a model: files edited, commands that failed or
// were refused, test and typecheck counts, git commits, branches, pushes and PRs. The Observer is told these are
// recorded and writes only what needs understanding. Each fact line carries a tag after its time, `[edits]` and so
// on, which is how the reflector's pass and a reader tell them apart from the Observer's lines.
import type { SessionMessage } from 'claude-code'

export type Fact = { at?: number; marker: '🟡' | '🟢' | '✅'; text: string }


const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit'])
const MAX_FAILED = 4 // [failed] lines per chunk; the rest counted on the last
const CMD_CHARS = 120
const NO_MATCH = new Set(['rg', 'grep', 'ffgrep', 'diff', 'cmp', 'test', '[', '[[']) // exit 1 is their answer, not a failure
const ERROR_CHARS = 160

// Commands that only look: skipped unless they fail. `sed -i`, `find -delete` and the like are caught separately.
const LOOKS = new Set(
  ('cd ls cat head tail rg grep ffgrep fdfind fd find sed awk wc echo printf pwd which type eza tree file stat jq yq date sleep true false ' +
    'export set unset cut sort uniq tr diff cmp test [ [[ basename dirname realpath readlink du df ps env printenv whoami hostname uname nl less ' +
    'more column xxd od bat ast-grep codegraph mkdir for while do done if then else fi case esac read local wait').split(' '),
)
const GIT_LOOKS = new Set(['status', 'log', 'diff', 'show', 'rev-parse', 'remote', 'ls-files', 'blame', 'grep', 'fetch', 'branch', 'describe', 'reflog', 'shortlog', 'config', 'worktree', 'stash'])
const GH_LOOKS = /^gh(?:-axi)? (?:\S+ )?(?:view|list|status|checks|diff|api|search)\b/
// A word that names a test, typecheck or lint run: `vitest`, `pnpm test:db`, `bun test`, `pnpm -r typecheck`. Paths are not.
const RUNNER_WORD = /^(?:vitest|jest|mocha|pytest|tsc|eslint|biome|test|typecheck|lint|validate)(?::[\w:-]+)?$|^[\w-]+:(?:test|typecheck|lint)$/
// A test script run by path (`./run-tests.sh`, `bin/fm-test-run.sh`) or a test file handed to an interpreter.
const TEST_PROGRAM = /(?:^|[_.-])tests?(?:[_.-]|$)/
const TEST_FILE = /\.(?:test|spec)\.\w+$|(?:^|\/)tests?\/\S+\.(?:sh|bash|py|ts|js|mjs|rb)$/
const isRunner = (s: Segment) => {
  if (looks(s) || writes(s).length) return false
  const w = head(s.words).filter((x) => !x.quoted)
  return w.some((x) => RUNNER_WORD.test(x.text) || TEST_FILE.test(x.text)) || (!!w[0] && /\//.test(w[0].text) && TEST_PROGRAM.test(name(s.words)))
}

type Word = { text: string; quoted: boolean }
type Segment = { words: Word[]; raw: string; pipe: Word[][]; heredocs: string[] } // one simple command, its pipe filters after it, its heredoc bodies

// A shell command cut into simple commands: at `;`, `&&`, `||`, `&` and newlines outside quotes, `$(...)` and
// heredoc bodies; each cut at `|` into the command and its filters.
function segments(command: string): Segment[] {
  const out: Segment[] = []
  let words: Word[] = []
  let pipe: Word[][] = []
  let word = ''
  let quoted = false
  let raw = ''
  let depth = 0
  let bodies: string[] = []
  const heredocs: { tag: string; bodies: string[] }[] = []
  const endWord = () => {
    if (word || quoted) words.push({ text: word, quoted })
    word = ''
    quoted = false
  }
  const endCommand = (piped: boolean) => {
    endWord()
    if (piped) {
      pipe.push(words)
      words = []
      return
    }
    if (pipe.length || words.length) {
      const [first, ...filters] = [...pipe, words].map(bare).filter((w) => w.length)
      if (first) out.push({ words: first, raw: raw.trim(), pipe: filters, heredocs: bodies })
    }
    bodies = []
    words = []
    pipe = []
    raw = ''
  }
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!
    if (c === '\\' && i + 1 < command.length) {
      word += command[++i]
      raw += c + command[i]
      continue
    }
    if (c === "'" || c === '"') {
      let end = i + 1
      while (end < command.length && command[end] !== c) end += c === '"' && command[end] === '\\' ? 2 : 1
      end = Math.min(end, command.length)
      word += c === '"' ? command.slice(i + 1, end).replace(/\\(["\\$`])/g, '$1') : command.slice(i + 1, end)
      raw += command.slice(i, end + 1)
      quoted = true
      i = end
      continue
    }
    if (c === '$' && command[i + 1] === '(') depth++
    else if (c === ')' && depth) depth--
    if (depth) {
      word += c
      raw += c
      continue
    }
    if (c === '<' && command[i + 1] === '<' && command[i + 2] !== '<') {
      const m = command.slice(i).match(/^<<-?\s*(['"]?)([\w.-]+)\1/)
      if (m) {
        heredocs.push({ tag: m[2]!, bodies })
        raw += m[0]
        i += m[0].length - 1
        continue
      }
    }
    if (c === '\n') {
      endCommand(false)
      for (const h of heredocs.splice(0)) {
        const rest = command.slice(i + 1)
        const end = rest.search(new RegExp(`^\\s*${h.tag.replace(/[.-]/g, '\\$&')}\\s*$`, 'm'))
        h.bodies.push(end < 0 ? rest : rest.slice(0, end))
        if (end < 0) i = command.length
        else i += 1 + end + (rest.slice(end).match(/^.*$/m)?.[0].length ?? 0)
      }
      continue
    }
    const redirect = c === '&' && (command[i - 1] === '>' || command[i + 1] === '>') // `2>&1`, `&>file`
    if (c === ';' || (c === '|' && command[i + 1] === '|') || (c === '&' && !redirect)) {
      endCommand(false)
      if (command[i + 1] === c) i++
      continue
    }
    if (c === '|') {
      endCommand(true)
      continue
    }
    if (c === ' ' || c === '\t') {
      endWord()
      raw += c
      continue
    }
    word += c
    raw += c
  }
  endCommand(false)
  return out
}

// Shell grammar around a simple command: `do`, `then`, `{`, a subshell's parens.
const KEYWORDS = new Set(['do', 'done', 'then', 'else', 'elif', 'fi', 'esac', '{', '}', '(', ')', '!'])
function bare(words: Word[]) {
  const w = words.map((x) => (x.quoted ? x : { ...x, text: x.text.replace(/^\(+/, '').replace(/\)+$/, '') }))
  while (w.length && !w[0]!.quoted && (KEYWORDS.has(w[0]!.text) || !w[0]!.text)) w.shift()
  while (w.length && !w.at(-1)!.quoted && KEYWORDS.has(w.at(-1)!.text)) w.pop()
  return w
}

// The words that name the command: env assignments and wrappers (`rtk proxy`, `timeout 60`, `time`) dropped.
function head(words: readonly Word[]) {
  let w = [...words]
  for (;;) {
    const first = w[0]?.text
    if (!first) return w
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(first)) w = w.slice(1)
    else if (first === 'rtk' && w[1]?.text === 'proxy') w = w.slice(2)
    else if (first === 'rtk' || first === 'time' || first === 'command' || first === 'nohup' || first === 'exec') w = w.slice(1)
    else if (first === 'timeout') w = w.slice(/^\d/.test(w[1]?.text ?? '') ? 2 : 1)
    else return w
  }
}

const name = (words: readonly Word[]) => (head(words)[0]?.text ?? '').replace(/^.*\//, '')

function looks(s: Segment) {
  const w = head(s.words)
  const n = name(s.words)
  if (!n || /\(\)?$|^[{}]$/.test(n)) return true // an assignment alone, a function's definition (`f()`, its parens stripped to `f(`)
  if (n === 'git') return GIT_LOOKS.has(w[1]?.text ?? '') && !(w[1]?.text === 'branch' && w.length > 2 && !w[2]!.text.startsWith('-')) && w[1]?.text !== 'stash'
  if (GH_LOOKS.test(w.map((x) => x.text).join(' '))) return true
  if (n === 'sed') return !w.some((x) => /^-[a-zA-Z]*i/.test(x.text) && !x.quoted)
  if (n === 'find') return !w.some((x) => x.text === '-delete' || x.text === '-exec')
  if (n === 'echo' || n === 'printf' || n === 'cat') return !writes(s).length
  return LOOKS.has(n)
}

// Files a command writes: a redirect, `tee`, `sd` and `sed -i`. /tmp and /dev are scratch.
function writes(s: Segment, vars: ReadonlyMap<string, string> = new Map()) {
  const paths: string[] = []
  const all = [s.words, ...s.pipe]
  for (const words of all)
    words.forEach((w, i) => {
      if (w.quoted) return
      const m = w.text.match(/^\d?>>?(.*)$/)
      if (m) {
        const target = m[1] || words[i + 1]?.text
        if (target && !target.startsWith('&')) paths.push(target)
      }
    })
  for (const words of all) {
    const w = head(words)
    const n = name(words)
    const args = w.slice(1).filter((x) => x.quoted || !x.text.startsWith('-'))
    if (n === 'tee') paths.push(...args.map((x) => x.text))
    if (n === 'sd') paths.push(...args.slice(2).map((x) => x.text))
    if (n === 'sed' && w.some((x) => /^-[a-zA-Z]*i/.test(x.text) && !x.quoted)) {
      const exprAt = w.findIndex((x) => x.text === '-e' || x.text === '--expression')
      paths.push(...(exprAt >= 0 ? args : args.slice(1)).filter((x) => !x.quoted).map((x) => x.text))
    }
  }
  for (const body of s.heredocs) paths.push(...scriptWrites(body))
  return paths
    .map((p) => expand(p, vars))
    .filter((p) => p && !/^\/(tmp|dev)\//.test(p) && p !== '/dev/null' && !p.includes('$'))
}

// Files an inline script (a Python or JS heredoc) writes: `open(p, 'w')`, `Path(p).write_text`, `writeFileSync(p`,
// a variable read back from its last string assignment.
function scriptWrites(body: string) {
  const vars = new Map<string, string>()
  const out: string[] = []
  const arg = String.raw`(?:(['"])([^'"\n]+)\1|([A-Za-z_]\w*))`
  const calls = [
    new RegExp(String.raw`\bopen\(\s*${arg}\s*,\s*(?:mode\s*=\s*)?['"][wax]`, 'g'),
    new RegExp(String.raw`\bPath\(\s*${arg}\s*\)\.write_(?:text|bytes)\(`, 'g'),
    new RegExp(String.raw`\b(?:writeFileSync|appendFileSync|writeFile|Bun\.write)\(\s*${arg}`, 'g'),
  ]
  for (const line of body.split('\n')) {
    const set = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(['"])([^'"]+)\2\s*;?\s*$/)
    if (set) vars.set(set[1]!, set[3]!)
    for (const re of calls) for (const m of line.matchAll(re)) out.push(m[2] ?? vars.get(m[3]!) ?? '')
  }
  return out
}

// `echo EXIT ${PIPESTATUS[0]}` or `echo "TC=$?"`: the label a command's status is printed under.
function statusLabel(s: Segment) {
  if (name(s.words) !== 'echo' && name(s.words) !== 'printf') return undefined
  const text = s.raw.replace(/^\S+\s+/, '')
  const m = text.match(/^["']?([A-Za-z_]+)[ =:]*["']?\s*["']?\$(?:\{PIPESTATUS\[\d+\]\}|\?|\{\?\})/)
  return m?.[1]
}

const oneLine = (text: string, max: number) => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

const expand = (text: string, vars: ReadonlyMap<string, string>) => text.replace(/\$\{?([A-Za-z_]\w*)\}?/g, (m, v: string) => vars.get(v) ?? m)

// A command's words without its wrappers and redirects.
const argv = (s: Segment, vars: ReadonlyMap<string, string> = new Map()) =>
  head(s.words)
    .map((w) => (w.quoted && !w.text.includes('$') ? w : { ...w, text: expand(w.text, vars) }))
    .filter((w, i, all) => w.quoted || !(/^(?:\d?[<>]|&>)/.test(w.text) || (/^\d?[<>]{1,2}$/.test(all[i - 1]?.text ?? '') && !all[i - 1]!.quoted)))

// A command as shown: its own words, the `cd` and status echo and filters around it left out, the cwd cut from paths.
const shown = (s: Segment, cwd: string | undefined, vars?: ReadonlyMap<string, string>) =>
  oneLine(relative(argv(s, vars).map((w) => (/\s/.test(w.text) ? JSON.stringify(w.text) : w.text)).join(' '), cwd), CMD_CHARS)

function relative(text: string, cwd: string | undefined) {
  if (!cwd) return text
  const base = cwd.replace(/\/+$/, '')
  return text.split(`${base}/`).join('').split(base).join('.')
}

// The line of a failed result worth quoting: a tool error's own message, else the first line that names an error.
function errorLine(text: string, program = '') {
  const body = text.replace(/^Exit code \d+\n?/, '')
  const system = body.match(/"systemMessage":"((?:[^"\\]|\\.)*)"/)?.[1]
  const tool = body.match(/<tool_use_error>([\s\S]*?)<\/tool_use_error>/)?.[1]
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
  const own = program ? lines.find((l) => l.startsWith(`${program}: `)) : undefined
  const named = own ?? lines.find((l) => /\b(error|Error|ERR|ERROR|FAIL|failed|fatal|cannot|not found|No such file|denied|refused|Traceback|Exception|blocked)\b/.test(l))
  return oneLine((system ?? tool ?? named ?? lines.at(-1) ?? '').replace(/\u001b\[[\d;]*m/g, ''), ERROR_CHARS)
}

type Kind = 'tests' | 'types' | 'lint'
type Check = { ok: boolean; text: string; kind: Kind }
const kindOf = (s: Segment): Kind => (/\b(?:tsc|typecheck)\b/.test(s.raw) ? 'types' : /\b(?:lint|eslint|biome)\b/.test(s.raw) ? 'lint' : 'tests')

// Test, typecheck and lint counts a runner printed: vitest, jest, bun, pytest, tsc, eslint; and, when `harness` says
// the command ran tests, a test script's own summary (harnessChecks).
function checksIn(output: string, harness: boolean): Check[] {
  const text = output.replace(/\u001b\[[\d;]*m/g, '')
  const out: Check[] = []
  for (const m of text.matchAll(/^\s*Tests?\s+((?:\d+ \w+(?: \| )?)+)\s*\((\d+)\)/gm)) {
    const files = text.slice(0, m.index).match(/Test Files\s+(?:(\d+) failed \| )?(?:\d+ \w+ \| )*?(\d+) passed.*\((\d+)\)\s*$/m)
    const failed = Number(m[1]!.match(/(\d+) failed/)?.[1] ?? 0)
    out.push({ kind: 'tests', ok: !failed, text: `${m[1]!.replace(/ \| /g, ', ')} of ${m[2]}${files ? ` (${plural(Number(files[3]), 'file')})` : ''}` })
  }
  if (!out.length)
    for (const m of text.matchAll(/^Tests:\s+(.*?),?\s*(\d+) total/gm)) out.push({ kind: 'tests', ok: !/\d+ failed/.test(m[1]!), text: `${m[1]!.replace(/,\s*$/, '')} of ${m[2]}` })
  if (!out.length) {
    const pass = [...text.matchAll(/^\s*(\d+) pass\s*$/gm)]
    const fail = [...text.matchAll(/^\s*(\d+) fail\s*$/gm)]
    pass.forEach((p, i) => {
      const f = Number(fail[i]?.[1] ?? 0)
      out.push({ kind: 'tests', ok: !f, text: `${p[1]} passed${f ? `, ${f} failed` : ''}` })
    })
  }
  if (!out.length)
    for (const m of text.matchAll(/^=+ (.*?\b\d+ (?:passed|failed)\b.*?) in [\d.]+s\b.*=+$/gm)) out.push({ kind: 'tests', ok: !/\d+ (?:failed|error)/.test(m[1]!), text: m[1]! })
  if (!out.length && harness) out.push(...harnessChecks(text))
  const ts = [...text.matchAll(/^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/gm)]
  if (ts.length) {
    const [first] = ts
    const where = first![1]!.replace(/^.*?: /, '').trim()
    out.push({ kind: 'types', ok: false, text: `${plural(ts.length, 'type error')}, first ${first![4]} at ${where}:${first![2]}: ${oneLine(first![5]!, 100)}` })
  }
  const lint = text.match(/✖ (\d+) problems? \((\d+) errors?, (\d+) warnings?\)/)
  if (lint) out.push({ kind: 'lint', ok: lint[2] === '0', text: `lint ${plural(Number(lint[2]), 'error')}, ${plural(Number(lint[3]), 'warning')}` })
  return out
}

// A shell test script's summary, in the first form found: `total=N failed=M`; a line like `N passed, M failed`,
// `N tests passed` or `ok N/M` (the last such line); TAP `ok` / `not ok` lines; `PASS` / `FAIL` lines. Read only from a
// command that ran tests, since the same words turn up in any text.
function harnessChecks(text: string): Check[] {
  const counts = (p: number, f: number): Check[] => [{ kind: 'tests', ok: !f, text: p || !f ? `${p} passed${f ? `, ${f} failed` : ''}` : `${f} failed` }]
  const total = [...text.matchAll(/\btotal=(\d+)\b.*?\bfailed=(\d+)\b/g)].at(-1)
  if (total) {
    const [t, f] = [Number(total[1]), Number(total[2])]
    return [{ kind: 'tests', ok: !f, text: `${f ? `${f} failed, ` : ''}${t - f} passed of ${t}` }]
  }
  const lines = text.split('\n').map((l) => l.trim())
  for (const line of lines.toReversed()) {
    const both = line.match(/\b(\d+) (?:tests? )?pass(?:ed|es)?\b.*?\b(\d+) (?:tests? )?fail(?:ed|ures?|s)?\b/i)
    if (both) return counts(Number(both[1]), Number(both[2]))
    const failFirst = line.match(/\b(\d+) (?:tests? )?fail(?:ed|ures?|s)?\b.*?\b(\d+) (?:tests? )?pass(?:ed|es)?\b/i)
    if (failFirst) return counts(Number(failFirst[2]), Number(failFirst[1]))
    const passed = line.match(/\b(\d+) tests? passed\b/i)
    if (passed) return counts(Number(passed[1]), 0)
    const failed = line.match(/\b(\d+) tests? failed\b/i)
    if (failed) return counts(0, Number(failed[1]))
    const ratio = line.match(/^(?:ok|pass(?:ed)?)\b:?\s+(\d+)\s*\/\s*(\d+)$/i)
    if (ratio) return [{ kind: 'tests', ok: ratio[1] === ratio[2], text: `${ratio[1]} passed of ${ratio[2]}` }]
  }
  const tap = lines.filter((l) => /^(?:not )?ok\b(?:\s+\d+)?(?:\s+-|$)/.test(l))
  if (tap.length) return counts(tap.filter((l) => l.startsWith('ok')).length, tap.filter((l) => l.startsWith('not')).length)
  const pf = lines.filter((l) => /^(?:PASS|FAIL)(?:ED)?\b/.test(l))
  if (pf.length) return counts(pf.filter((l) => l.startsWith('PASS')).length, pf.filter((l) => l.startsWith('FAIL')).length)
  return []
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

type Outcome = { code?: number; background?: boolean }

// Each simple command's exit status, where the output shows it: a status it echoed, else the whole call's
// (Claude Code prefixes a failed call's result with `Exit code N`), given to the last command that did work.
function outcomes(segs: readonly Segment[], result: { text: string; isError: boolean } | undefined, background: boolean) {
  const out = new Map<Segment, Outcome>()
  if (!result) return out
  let last: Segment | undefined
  const lines = result.text.split('\n')
  for (const s of segs) {
    const label = statusLabel(s)
    if (label && last) {
      const code = [...lines].reverse().find((l) => new RegExp(`^${label}[ =:]*(\\d+)\\s*$`).test(l.trim()))
      if (code) out.set(last, { code: Number(code.trim().match(/(\d+)\s*$/)![1]) })
      continue
    }
    if (!looks(s)) last = s
  }
  const whole = result.isError ? Number(result.text.match(/^Exit code (\d+)/)?.[1] ?? 1) : background ? undefined : 0
  // A list's status is its last command's. A failure is put on that command; success, on every command that did work.
  const named = segs.find((s) => name(s.words) && lines.some((l) => l.startsWith(`${name(s.words)}: `)))
  const lastRun = named ?? [...segs].reverse().find((s) => !statusLabel(s))
  if (result.isError) {
    if (lastRun && !out.has(lastRun)) out.set(lastRun, { code: whole })
  } else for (const s of segs) if (!looks(s) && !statusLabel(s) && !out.has(s)) out.set(s, whole === undefined ? { background: true } : { code: 0 })
  return out
}

type Git = { at?: number; text: string }

function gitFacts(s: Segment, output: string, ok: boolean): string[] {
  const w = argv(s).map((x) => x.text)
  if (!ok) return []
  if (w[0] === 'git') {
    const sub = w.indexOf('-C') === 1 ? w.slice(3) : w.slice(1)
    if ((sub[0] === 'checkout' && sub[1] === '-b') || (sub[0] === 'switch' && sub[1] === '-c') || (sub[0] === 'branch' && sub[1] && !sub[1].startsWith('-')))
      return [`created branch ${sub[sub[0] === 'branch' ? 1 : 2]}`]
    if (sub[0] === 'commit') {
      const m = output.match(/^\[([^\]\s]+)(?: \([^)]*\))? ([0-9a-f]{7,40})\] (.+)$/m)
      if (m) return [`committed ${m[2]} "${oneLine(m[3]!, 100)}" on ${m[1]}`]
      const msg = sub[sub.indexOf('-m') + 1]
      return [`committed${sub.includes('-m') && msg ? ` "${oneLine(msg.split('\n')[0]!, 100)}"` : ''}`]
    }
    if (sub[0] === 'push') return [`pushed${sub.slice(1).filter((x) => !x.startsWith('-')).length ? ` ${sub.slice(1).filter((x) => !x.startsWith('-')).join(' ')}` : ''}`]
    if ((sub[0] === 'merge' || sub[0] === 'rebase' || sub[0] === 'cherry-pick') && sub[1] === '--abort') return [`${sub[0]} aborted`]
    if (sub[0] === 'merge' || sub[0] === 'rebase' || sub[0] === 'cherry-pick' || sub[0] === 'reset' || sub[0] === 'revert') {
      const conflicts = sub[0] !== 'reset' && /^CONFLICT \(|^Automatic merge failed|^error: could not apply/m.test(output)
      return [`${`${sub[0]} ${oneLine(sub.slice(1).join(' '), 60)}`.trim()}${conflicts ? ': conflicts' : ''}`]
    }
  }
  if (/^gh(?:-axi)?$/.test(w[0] ?? '') && w[1] === 'pr' && ['create', 'merge'].includes(w[2] ?? '')) {
    const url = output.match(/https:\/\/github\.com\/\S+\/pull\/\d+/)?.[0]
    return [`${w[2] === 'create' ? 'opened PR' : 'merged PR'}${url ? ` ${url}` : w[3] ? ` ${w[3]}` : ''}`]
  }
  return []
}

// The facts of rows [0, rows.length): `at[i]` is row i's time. `cwd` is cut from paths.
export function extractFacts(rows: readonly SessionMessage[], at: readonly (number | undefined)[], cwd?: string): Fact[] {
  const results = new Map<string, { text: string; isError: boolean; at?: number }>()
  rows.forEach((m, i) => {
    for (const u of m.toolUses) if (u.text !== undefined) results.set(u.tool_use_id, { text: u.text, isError: !!u.isError, at: at[i] })
    for (const r of m.toolResults ?? []) results.set(r.tool_use_id, { text: r.text, isError: r.isError, at: at[i] })
  })
  const edits = new Map<string, { n: number; created: boolean }>()
  let editAt: number | undefined
  const failed: Fact[] = []
  const refusals = new Map<string, { first?: number; at?: number; n: number; command?: string }>() // reason → its calls
  const checks: Fact[] = []
  const git: Git[] = []
  const edit = (path: string, t: number | undefined, created = false) => {
    const p = relative(path, cwd)
    const e = edits.get(p) ?? { n: 0, created: false }
    edits.set(p, { n: e.n + 1, created: e.created || created })
    editAt = t ?? editAt
  }
  rows.forEach((m, i) => {
    for (const u of m.toolUses) {
      const r = results.get(u.tool_use_id)
      const t = r?.at ?? at[i]
      const input = u.input as Record<string, unknown>
      if (EDIT_TOOLS.has(u.tool)) {
        const path = input.file_path ?? input.notebook_path
        if (typeof path === 'string' && r && !r.isError) edit(path, t, u.tool === 'Write' && /\bcreated\b/i.test(r.text))
        continue
      }
      if (u.tool !== 'Bash' || typeof input.command !== 'string' || !r) continue
      const segs = segments(input.command)
      const text = r.text
      const vars = new Map<string, string>()
      // A variable set to a string, itself expanded; one set from a command's output stays as written.
      for (const x of segs)
        for (const w of x.words) {
          const m = w.text.match(/^([A-Za-z_]\w*)=(.*)$/s)
          if (m && !/\$\(|`/.test(m[2]!)) vars.set(m[1]!, expand(m[2]!, vars))
        }
      const refused = r.isError && refusal(text)
      if (refused === REJECTED) {
        const s = segs.find((x) => !looks(x)) ?? segs[0]
        if (s) failed.push({ at: t, marker: '🟡', text: `[failed] ${shown(s, cwd, vars)} (${refused})` })
        continue
      }
      if (refused) {
        // The command a refusal is about: the one segment its reason names, or the only segment; else none is shown.
        const named = segs.filter((x) => name(x.words) && new RegExp(`(?<![\\w.])${name(x.words).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`).test(refused))
        const s = named.length === 1 ? named[0] : segs.length === 1 ? segs[0] : undefined
        const was = refusals.get(refused)
        refusals.delete(refused)
        refusals.set(refused, { first: was?.first ?? t, at: t, n: (was?.n ?? 0) + 1, command: s && shown(s, cwd, vars) })
        continue
      }
      const ends = outcomes(segs, r, input.run_in_background === true)
      const runners = segs.filter(isRunner)
      const found = checksIn(text, runners.length > 0)
      const checked = new Set<Segment>() // runners whose result is a [checks] line
      const nth = new Map<Kind, number>()
      for (const c of found) {
        const mine = runners.filter((s) => kindOf(s) === c.kind)
        const k = nth.get(c.kind) ?? 0
        nth.set(c.kind, k + 1)
        const s = mine[Math.min(k, mine.length - 1)] ?? runners[0]
        if (s) checked.add(s)
        checks.push({ at: t, marker: c.ok ? '✅' : '🟡', text: `[checks] ${s ? `${shown(s, cwd)}: ` : ''}${c.text}` })
      }
      for (const s of segs) {
        if (statusLabel(s)) continue
        const end = ends.get(s)
        const bad = end?.code !== undefined && end.code !== 0 && !(end.code === 1 && NO_MATCH.has(name(s.words)))
        for (const p of writes(s, vars)) if (!bad) edit(p, t)
        for (const g of gitFacts(s, text, !bad)) git.push({ at: t, text: g })
        if (bad) {
          if (checked.has(s)) continue
          const why = errorLine(text, name(s.words))
          if (looks(s) && !/\b(error|cannot|not found|No such file|denied)\b/i.test(why)) continue // a look that printed no reason
          failed.push({ at: t, marker: looks(s) ? '🟢' : '🟡', text: `[failed] ${shown(s, cwd, vars)} (exit ${end!.code}): ${why}` })
          continue
        }
        if (!looks(s) && !checked.has(s) && runners.includes(s) && end?.code === 0 && kindOf(s) === 'types')
          checks.push({ at: t, marker: '✅', text: `[checks] ${shown(s, cwd)}: no type errors` })
      }
    }
  })
  const facts: Fact[] = []
  if (edits.size)
    facts.push({
      at: editAt,
      marker: '🟡',
      text: `[edits] ${[...edits].map(([p, e]) => `${p}${e.created ? ' (created)' : ''}${e.n > 1 ? ` ×${e.n}` : ''}`).join(', ')}`,
    })
  if (git.length) {
    const items = [...new Set(settleGit(git.map((g) => g.text)))]
    facts.push({ at: git.at(-1)!.at, marker: gitMarker(items), text: `[git] ${items.join('; ')}` })
  }
  facts.push(...dedupe(checks))
  for (const [why, r] of refusals)
    failed.push({ at: r.at, marker: '🟡', text: `[failed] ${why}${r.n > 1 ? ` (×${r.n}${since(r.first, r.at)})` : r.command ? ` (${r.command})` : ''}` })
  const fails = dedupe(failed).sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
  facts.push(...fails.slice(0, MAX_FAILED))
  if (fails.length > MAX_FAILED) facts[facts.length - 1]!.text += ` (+${fails.length - MAX_FAILED} more failures)`
  return facts.sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
}

// ` since HH:MM`, the time a repeated line first happened, when that is not the minute of its last.
function since(first: number | undefined, last: number | undefined) {
  if (first === undefined || last === undefined) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const [a, b] = [new Date(first), new Date(last)]
  const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const clock = `${pad(a.getHours())}:${pad(a.getMinutes())}`
  if (day(a) === day(b) && clock === `${pad(b.getHours())}:${pad(b.getMinutes())}`) return ''
  return ` since ${day(a) === day(b) ? '' : `${day(a)} `}${clock}`
}

// A merge, rebase or cherry-pick's abort put on the one it ends: `merge X: conflicts` then `merge aborted` becomes
// `merge X aborted`. An abort with none before it stays.
function settleGit(items: readonly string[]) {
  const out: string[] = []
  for (const item of items) {
    const op = item.match(/^(merge|rebase|cherry-pick) aborted$/)?.[1]
    const at = op ? out.findLastIndex((x) => x.startsWith(`${op} `) && !x.endsWith(' aborted')) : -1
    if (at >= 0) out[at] = `${out[at]!.replace(/: conflicts$/, '')} aborted`
    else out.push(item)
  }
  return out
}
const gitMarker = (items: readonly string[]) => (items.some((x) => /: conflicts$| aborted$/.test(x)) ? '🟡' : '✅')

const REJECTED = 'rejected by the user'

// A call that never ran: a hook denied it, a guard blocked it, or the user rejected it.
function refusal(text: string) {
  if (/^The user doesn't want to proceed/.test(text)) return REJECTED
  const hook = text.match(/^PreToolUse:\S+ hook error/)
  if (hook) {
    const why = text.match(/"(?:systemMessage|permissionDecisionReason)":"((?:[^"\\]|\\.)*)"/)?.[1]
    return `blocked by a hook${why ? `: ${oneLine(why, 100)}` : ''}`
  }
  const tool = text.match(/^<tool_use_error>(Blocked[\s\S]*?)<\/tool_use_error>/)?.[1]
  return tool ? oneLine(tool, 100) : undefined
}

// Repeats of one line collapse into the last, counted.
function dedupe(facts: readonly Fact[]) {
  const by = new Map<string, Fact & { n: number }>()
  for (const f of facts) {
    const was = by.get(f.text)
    by.delete(f.text)
    by.set(f.text, { ...f, n: (was?.n ?? 0) + 1 })
  }
  return [...by.values()].map(({ n, ...f }) => ({ ...f, text: n > 1 ? `${f.text} (×${n})` : f.text }))
}

const TAGGED = /^(\S+) (?:(\d{4}-\d{2}-\d{2} \d{2}):(\d{2}) )?\[(edits|ran|failed|checks|git)\] (.*)$/u

// Fact lines condensed for a reflection, by code rather than the reflector, so none is garbled: [ran] lines (no longer
// written) and failed looks dropped, each check's latest result kept, an hour's [edits] lines merged into one, a
// refusal repeated across chunks kept once at its last, counted since its first, and an abort put on the merge,
// rebase or cherry-pick it ended. Lines are `<marker> [YYYY-MM-DD HH:MM ]<tagged text>`; the result is in time order.
export function condenseFacts(lines: readonly string[]): string[] {
  const out: { line: string; at: string }[] = []
  const checks = new Map<string, number>() // runner → index in out
  const edits = new Map<string, { i: number; files: Map<string, { n: number; created: boolean }> }>() // hour → line
  const refusals = new Map<string, { i: number; n: number; first: string }>() // reason → line
  const gits: { i: number; at: string; items: string[] }[] = []
  const gitLine = (g: { at: string; items: readonly string[] }) => `${gitMarker(g.items)} ${g.at ? `${g.at} ` : ''}[git] ${g.items.join('; ')}`
  for (const line of lines) {
    const m = line.match(TAGGED)
    if (!m) continue
    const [, marker, hour = '', min = '', tag, text] = m
    const at = hour ? `${hour}:${min}` : ''
    const stamped = (t: string) => `${marker} ${at ? `${at} ` : ''}[${tag}] ${t}`
    if (tag === 'ran' || (tag === 'failed' && marker === '🟢')) continue
    if (tag === 'failed' && /^(?:blocked by a hook|Blocked)\b/.test(text!)) {
      const c = text!.match(/^(.*?) \(×(\d+)(?: since ([^()]+))?\)$/) ?? text!.match(/^(.*?)(?: \([^()]*\))?$/)!
      const [why, n] = [c[1]!, Number(c[2] ?? 1)]
      const first = c[3] ? (/^\d\d:\d\d$/.test(c[3]) && at ? `${at.slice(0, 10)} ${c[3]}` : c[3]) : at
      const was = refusals.get(why)
      if (!was) {
        refusals.set(why, { i: out.push({ line, at }) - 1, n, first })
        continue
      }
      out[was.i] = { line: '', at: '' }
      const earliest = was.first && (!first || was.first < first) ? was.first : first
      const since = !earliest || earliest === at ? '' : ` since ${earliest.slice(0, 10) === at.slice(0, 10) ? earliest.slice(11) : earliest}`
      refusals.set(why, { i: out.push({ line: stamped(`${why} (×${was.n + n}${since})`), at }) - 1, n: was.n + n, first: earliest })
      continue
    }
    if (tag === 'git') {
      const items = text!.split('; ')
      const kept = items.filter((item) => {
        const op = item.match(/^(merge|rebase|cherry-pick) aborted$/)?.[1]
        const prior = op && gits.findLast((g) => g.items.some((x) => x.startsWith(`${op} `) && !x.endsWith(' aborted')))
        if (!prior) return true
        prior.items = settleGit([...prior.items, item])
        out[prior.i] = { line: gitLine(prior), at: prior.at }
        return false
      })
      if (!kept.length) continue
      const g = { i: out.length, at, items: kept }
      out.push({ line: kept.length === items.length ? line : gitLine(g), at })
      gits.push(g)
      continue
    }
    if (tag === 'checks') {
      const runner = text!.match(/^(.*?): /)?.[1] ?? ''
      const was = checks.get(runner)
      if (was !== undefined) out[was] = { line: '', at: '' }
      checks.set(runner, out.push({ line, at }) - 1)
      continue
    }
    if (tag === 'edits') {
      const e = edits.get(hour)
      const files = e?.files ?? new Map<string, { n: number; created: boolean }>()
      for (const item of text!.split(', ')) {
        const f = item.match(/^(.*?)( \(created\))?(?: ×(\d+))?$/)!
        const had = files.get(f[1]!) ?? { n: 0, created: false }
        files.set(f[1]!, { n: had.n + Number(f[3] ?? 1), created: had.created || !!f[2] })
      }
      if (e) out[e.i] = { line: '', at: '' }
      const merged = [...files].map(([p, x]) => `${p}${x.created ? ' (created)' : ''}${x.n > 1 ? ` ×${x.n}` : ''}`).join(', ')
      edits.set(hour, { i: out.push({ line: stamped(merged), at }) - 1, files })
      continue
    }
    out.push({ line, at })
  }
  return out.filter((o) => o.line).map((o) => o.line)
}

export const isFact = (line: string) => TAGGED.test(line)
