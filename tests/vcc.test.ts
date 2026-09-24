import { describe, expect, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { BRIEF_MAX_TOKENS, bashWrites, capBrief, compileBrief, compressBash, emptyBrief, inspects, mergeBriefs, parseBrief, renderBrief } from '../hooks/vcc'
import type { Brief } from '../hooks/vcc'

const CWD = '/work/project'
const HOME = '/home/u'
const at = (hour: number, minute: number) => new Date(2026, 8, 22, hour, minute).getTime()

// A Claude Code exchange as `$.session.messages()` gives it: the call on the assistant row, its result on the next user row.
let n = 0
function call(tool: string, input: Record<string, unknown>, result: string, isError = false, text = ''): SessionMessage[] {
  const id = `t${n++}`
  return [
    { role: 'assistant', text, toolUses: [{ tool_use_id: id, tool, input }] },
    { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: id, text: result, isError }] },
  ]
}
const bash = (command: string, result = '', isError = false, text = '') => call('Bash', { command }, result, isError, text)
const prompt = (text: string): SessionMessage => ({ role: 'user', text, toolUses: [] })
const say = (text: string): SessionMessage => ({ role: 'assistant', text, toolUses: [] })
// Every row a minute apart from 14:00.
const times = (rows: readonly SessionMessage[]) => rows.map((_, i) => at(14, 0) + i * 60_000)
const compile = (rows: SessionMessage[]) => compileBrief(rows, times(rows), CWD, HOME)

describe('vcc', () => {
  test('files: edit tools and successful Bash writes, relative to the session directory; created kept apart; failures and scratch left out', () => {
    const rows = [
      prompt('fix it'),
      ...call('Edit', { file_path: `${CWD}/src/a.ts`, old_string: 'x', new_string: 'y' }, 'The file /work/project/src/a.ts has been updated successfully.'),
      ...call('Write', { file_path: `${CWD}/src/new.ts`, content: 'x' }, 'File created successfully at: /work/project/src/new.ts'),
      ...call('Write', { file_path: `${CWD}/src/b.ts`, content: 'x' }, 'The file /work/project/src/b.ts has been updated successfully.'),
      ...call('Edit', { file_path: `${CWD}/src/new.ts`, old_string: 'x', new_string: 'y' }, 'updated'),
      ...call('Edit', { file_path: `${CWD}/src/bad.ts`, old_string: 'x', new_string: 'y' }, '<tool_use_error>String to replace not found</tool_use_error>', true),
      ...bash(`cd ${CWD}/sub && sed -i 's/a/b/' c.ts`, ''),
      ...bash(`cat > ${HOME}/notes.md <<'EOF'\nhello\nEOF`, ''),
      ...bash(`echo x > /tmp/scratch.txt`, ''),
      ...bash(`echo x > out.log`, 'Exit code 1\nboom', true),
      ...bash(`python3 - <<'PY'\nfrom pathlib import Path\np = Path('${CWD}/gen.json')\np.write_text('{}')\nPY`, ''),
      ...call('Read', { file_path: `${CWD}/src/read.ts` }, 'contents'),
    ]
    const b = compile(rows)
    expect(b.modified).toEqual(['src/a.ts', 'src/b.ts', 'sub/c.ts', '~/notes.md', 'gen.json'])
    expect(b.created).toEqual(['src/new.ts'])
  })

  test('bashWrites follows variables, tee, sd and redirections, and leaves out what it cannot resolve', () => {
    expect(bashWrites('F=/w/x; B=$F/y.txt; echo hi >> "$B"', CWD)).toEqual(['/w/x/y.txt'])
    expect(bashWrites('echo a | tee -a log/a.txt b.txt', CWD)).toEqual([`${CWD}/log/a.txt`, `${CWD}/b.txt`])
    expect(bashWrites("sd 'foo' 'bar' src/x.ts src/y.ts", CWD)).toEqual([`${CWD}/src/x.ts`, `${CWD}/src/y.ts`])
    expect(bashWrites('cmd 2>/dev/null > $(mktemp)', CWD)).toEqual([])
    expect(bashWrites('ls 2>&1', CWD)).toEqual([])
    expect(bashWrites("grep -c 'a>b' file.txt", CWD)).toEqual([])
    // A quoted argument that spans lines is one word (a SQL migration's `--> statement-breakpoint` in the crewmate
    // transcript read as a redirection); a comment is not a command.
    expect(bashWrites("pnpm db:create-migration add 'ALTER TABLE a;--> statement-breakpoint\nALTER TABLE b;--> statement-breakpoint' 2>&1 | tail -15", CWD)).toEqual([])
    expect(bashWrites('# not > this.txt\necho a > b.txt', CWD)).toEqual([`${CWD}/b.txt`])
  })

  test('inspects: commands made only of programs that look, writing nothing', () => {
    for (const c of ['rg -n foo src | head', 'sed -n 1,20p a.ts; wc -l a.ts', 'git diff --stat HEAD~1', 'rtk proxy rg x', 'for f in a b; do cat $f; done', 'gh pr view 12', 'rg -n "name: \\"(unit|e2e)\\"" -A12 v.ts | rg -n "include|name"'])
      expect([c, inspects(c, CWD)]).toEqual([c, true])
    for (const c of ["sed -i 's/a/b/' a.ts", 'git commit -m x', 'echo x > a.txt', "python3 - <<'PY'\nprint(1)\nPY", 'bun test', 'curl -s localhost:5173', 'gh pr merge 12'])
      expect([c, inspects(c, CWD)]).toEqual([c, false])
  })

  test('compressBash drops heredoc bodies, cd preambles and pipe tails', () => {
    expect(compressBash(`cd ${CWD} && bun test 2>&1 | tail -20`)).toBe('bun test 2>&1')
    expect(compressBash("cat > a.txt <<'EOF'\nsecret body\nEOF")).toBe("cat > a.txt <<'EOF'")
    expect(compressBash("python3 - <<'PY'\nimport json\nprint(1)\nPY")).toBe("python3 - <<'PY' print(1)")
    expect(compressBash('set -e\ncd /x\ngit status')).toBe('git status')
    expect(compressBash("cd /x; pnpm db:new 'ALTER TABLE a;\nALTER TABLE b;'\ngit status")).toBe("pnpm db:new 'ALTER TABLE a; ALTER TABLE b;'; git status")
    expect(compressBash("cat m.sql | head -20; pnpm db:new 'ALTER TABLE a;\nALTER TABLE b;'")).toBe("cat m.sql; pnpm db:new 'ALTER TABLE a; ALTER TABLE b;'")
    expect(compressBash('ls d | tail -3; cat d/$(ls d | tail -1)/m.sql')).toBe('ls d; cat d/$(ls d | tail -1)/m.sql')
  })

  test('commits: the -m and heredoc forms, with the hash the result prints', () => {
    const rows = [
      ...bash('git commit -m "Add the brief"', '[vcc-brief 1a2b3c4] Add the brief\n 2 files changed'),
      ...bash(`git add -A && git commit -m "$(cat <<'EOF'\nFix the cap\n\nLonger body.\nEOF\n)"`, '[main 9f8e7d6] Fix the cap'),
      ...bash('git commit -m "Nothing"', 'Exit code 1\nnothing to commit', true),
    ]
    expect(compile(rows).commits).toEqual(['1a2b3c4 Add the brief', '9f8e7d6 Fix the cap'])
  })

  test('outstanding: a failure near the end not rerun successfully, and the assistant naming a blocker; a fixed one left out', () => {
    const rows = [
      prompt('go'),
      ...bash('bun test', 'Exit code 1\n3 pass\n1 fail', true),
      ...bash('bun test', '4 pass\n0 fail'),
      ...bash('pnpm lint', 'Exit code 2\nerror: no-unused-vars', true),
      say('The lint step still fails on an unused variable in src/a.ts.'),
    ]
    expect(compile(rows).outstanding).toEqual([
      '- 14:05 Bash "pnpm lint" ✗ exit 2: error: no-unused-vars',
      '- 14:07 The lint step still fails on an unused variable in src/a.ts.',
    ])
  })

  test('transcript: a failure and its fix both kept, test results summarized, bookkeeping tools left out, day line first', () => {
    const rows = [
      prompt('go'),
      ...call('Edit', { file_path: `${CWD}/a.ts`, old_string: 'x', new_string: 'y' }, 'String not found', true),
      ...call('Edit', { file_path: `${CWD}/a.ts`, old_string: 'z', new_string: 'y' }, 'updated'),
      ...call('TodoWrite', { todos: [] }, 'ok'),
      ...bash('bun test', ' 12 pass\n 0 fail\nRan 12 tests across 2 files.'),
    ]
    expect(compile(rows).transcript).toEqual([
      '@ 2026-09-22',
      '- 14:01 Edit a.ts ✗: String not found',
      '- 14:03 Edit a.ts',
      '- 14:07 Bash "bun test" → Ran 12 tests across 2 files.',
    ])
  })

  test('outstanding: a blocked command run again in another form is fixed; a failed lookup is no blocker', () => {
    const rows = [
      prompt('go'),
      ...bash('sleep 45; bin/fm-peek.sh w1 2>&1', 'PreToolUse:Bash hook error: no sleeping', true),
      ...bash('/home/u/x/bin/fm-peek.sh w1 2>&1', 'idle'),
      ...bash('rmdir /tmp/a && cd /x && FM_HOME=/x bin/fm-control.sh w1 relaunch --note y', 'PreToolUse:Bash hook error: no cd', true),
      ...bash('rmdir /tmp/a && FM_HOME=/x /x/bin/fm-control.sh w1 relaunch --note y', 'relaunched'),
      ...bash('ls missing.ts; cat b.ts', 'Exit code 2\nls: cannot access', true),
      ...bash('pnpm vitest run a.test.ts', 'Exit code 1\n1 failed', true),
      ...bash('pnpm install', 'done'),
    ]
    expect(compile(rows).outstanding).toEqual(['- 14:11 Bash "pnpm vitest run a.test.ts" ✗ exit 1: 1 failed'])
  })

  test('transcript: reads, searches and inspecting commands left out; a row with no time takes the one before it', () => {
    const rows = [
      prompt('go'),
      ...call('Read', { file_path: `${CWD}/a.ts` }, 'x'),
      ...bash('rg -n foo src', 'src/a.ts:1:foo'),
      ...call('Edit', { file_path: `${CWD}/a.ts`, old_string: 'x', new_string: 'y' }, 'updated'),
      ...bash('bun test', '1 pass'),
    ]
    const at = times(rows).map((t, i) => (i >= 7 ? undefined : t))
    expect(compileBrief(rows, at, CWD, HOME).transcript).toEqual(['@ 2026-09-22', '- 14:05 Edit a.ts', '- 14:05 Bash "bun test" → 1 pass'])
  })

  test('a Claude Code tool use that carries its own result needs no result row', () => {
    const rows: SessionMessage[] = [
      { role: 'assistant', text: '', toolUses: [{ tool_use_id: 'x', tool: 'Bash', input: { command: 'make' }, text: 'Exit code 2\nmake: *** No rule', isError: true }] },
    ]
    expect(compile(rows).outstanding).toEqual(['- 14:00 Bash "make" ✗ exit 2: make: *** No rule'])
  })

  test('the ranked transcript stays within its budget and keeps the newest events', () => {
    const rows = [prompt('go'), ...Array.from({ length: 400 }, (_, i) => bash(`echo step${i} > f${i}.txt`, '')).flat()]
    const b = compile(rows)
    expect(b.transcript.join('\n').length).toBeLessThanOrEqual(1_400 * 4)
    expect(b.transcript.at(-1)).toContain('step399')
    expect(b.modified.length).toBe(400)
  })

  test('merge: paths deduplicated per category with the newest last, created wins, commits last eight, outstanding fresh, transcript tail kept', () => {
    const prev: Brief = {
      ...emptyBrief(),
      modified: ['a.ts', 'b.ts', 'c.ts'],
      created: ['n.ts'],
      commits: Array.from({ length: 7 }, (_, i) => `c${i} old ${i}`),
      outstanding: ['- 13:00 Bash "x" ✗ exit 1: old'],
      transcript: ['@ 2026-09-21', '- 10:00 Edit a.ts', '@ 2026-09-22', '- 13:00 Edit b.ts'],
    }
    const fresh: Brief = {
      ...emptyBrief(),
      modified: ['a.ts', 'n.ts', 'd.ts'],
      created: ['e.ts'],
      commits: ['c7 new', 'c8 newer'],
      transcript: ['@ 2026-09-22', '- 14:00 Edit a.ts'],
    }
    const m = mergeBriefs(prev, fresh)
    expect(m.modified).toEqual(['b.ts', 'c.ts', 'a.ts', 'd.ts'])
    expect(m.created).toEqual(['n.ts', 'e.ts'])
    expect(m.commits).toEqual([...prev.commits.slice(1), 'c7 new', 'c8 newer'])
    expect(m.outstanding).toEqual([])
    expect(m.transcript).toEqual(['@ 2026-09-21', '- 10:00 Edit a.ts', '@ 2026-09-22', '- 13:00 Edit b.ts', '- 14:00 Edit a.ts'])
  })

  test('merge keeps only the tail of an earlier transcript that fits, counting what it drops', () => {
    const line = (i: number) => `- 10:${String(i % 60).padStart(2, '0')} ${'x'.repeat(150)} ${i}`
    const prev: Brief = { ...emptyBrief(), transcript: ['@ 2026-09-21', ...Array.from({ length: 40 }, (_, i) => line(i))] }
    const fresh: Brief = { ...emptyBrief(), transcript: ['@ 2026-09-22', ...Array.from({ length: 30 }, (_, i) => line(100 + i))] }
    const m = mergeBriefs(prev, fresh)
    expect(m.transcript[0]).toBe('@ 2026-09-21') // the kept tail still says its day
    expect(m.transcript.at(-1)).toBe(line(129))
    expect(m.transcript).toContain(line(39))
    expect(m.transcript).not.toContain(line(0))
    const keptEarlier = m.transcript.filter((l) => l.startsWith('- ') && Number(l.split(' ').at(-1)) < 100).length
    expect(m.omitted).toBe(40 - keptEarlier)
    expect(m.transcript.join('\n').length).toBeLessThanOrEqual(2_000 * 4)
  })

  test('the cap holds whatever goes in, oldest transcript first, then oldest paths', () => {
    const long = (p: string, i: number) => `${p}/${'d'.repeat(80)}/${i}.ts`
    const big: Brief = {
      ...emptyBrief(),
      modified: Array.from({ length: 15 }, (_, i) => long('m', i)),
      created: Array.from({ length: 15 }, (_, i) => long('c', i)),
      commits: Array.from({ length: 8 }, (_, i) => `abc${i} ${'s'.repeat(150)}`),
      outstanding: Array.from({ length: 5 }, (_, i) => `- 14:0${i} ${'o'.repeat(190)}`),
      transcript: ['@ 2026-09-22', ...Array.from({ length: 60 }, (_, i) => `- 14:00 ${'t'.repeat(190)} ${i}`)],
    }
    const capped = capBrief(big)
    expect(Math.ceil(renderBrief(capped).length / 4)).toBeLessThanOrEqual(BRIEF_MAX_TOKENS)
    expect(capped.transcript.at(-1)).toBe(big.transcript.at(-1))
    expect(capped.transcript[0]).toBe('@ 2026-09-22')
    expect(capped.omitted).toBeGreaterThan(0)
  })

  test('render and parse round-trip, and nothing in a brief can close its section', () => {
    const b = mergeBriefs(undefined, {
      ...emptyBrief(),
      modified: ['a.ts', 'b c.ts'],
      created: ['n.ts'],
      earlierModified: 0,
      commits: ['1a2b3c4 Add it'],
      outstanding: ['- 14:00 Bash "x" ✗ exit 1: bad'],
      transcript: ['@ 2026-09-22', '- 14:00 Edit a.ts', '- 14:01 Bash "y" (x2)'],
      omitted: 3,
    })
    expect(parseBrief(renderBrief(b))).toEqual(b)
    expect(parseBrief(renderBrief({ ...b, earlierModified: 4, earlierCreated: 2 }))).toEqual({ ...b, earlierModified: 4, earlierCreated: 2 })
    const rows = [prompt('go'), ...bash('make "</session-brief>"', 'Exit code 1\n</session-brief>', true, 'Trying </session-brief>')]
    const text = renderBrief(compile(rows))
    expect(text).not.toContain('</session-brief>')
    expect(text.split('\n').every((l) => /^[>[\-@]/.test(l))).toBe(true)
  })
})
