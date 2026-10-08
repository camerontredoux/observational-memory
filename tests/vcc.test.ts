import { describe, expect, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { BRIEF_MAX_TOKENS, bashWrites, capBrief, compileBrief, compressBash, emptyBrief, inspects, mergeBriefs, OPEN_FAILURES_MAX, openFailures, parseBrief, parseFailures, renderBrief, renderFailure } from '../hooks/vcc'
import type { Brief, OpenFailure } from '../hooks/vcc'

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
  test('files: edit tools, reads and successful Bash writes, relative to the session directory, newest first with counts; failures and scratch left out', () => {
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
    expect(b.files.map((f) => [f.path, f.ops])).toEqual([
      ['src/read.ts', { read: 1 }],
      ['gen.json', { written: 1 }],
      ['~/notes.md', { written: 1 }],
      ['sub/c.ts', { written: 1 }],
      ['src/new.ts', { created: 1, edited: 1 }],
      ['src/b.ts', { written: 1 }],
      ['src/a.ts', { edited: 1 }],
    ])
    expect(b.files[0]!.at).toBe(times(rows).at(-2))
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
    expect(b.files.length).toBe(400)
  })

  test('merge: a file or command again sums its counts at its newest touch, newest first; commits last eight, outstanding fresh, transcript tail kept', () => {
    const prev: Brief = {
      ...emptyBrief(),
      files: [
        { path: 'c.ts', ops: { read: 1 }, at: at(13, 2) },
        { path: 'b.ts', ops: { edited: 1 }, at: at(13, 1) },
        { path: 'a.ts', ops: { edited: 2, read: 1 }, at: at(13, 0) },
      ],
      commands: [{ text: '"bun test" ✗ exit 1: 2 fail', n: 1, at: at(13, 3) }],
      commits: Array.from({ length: 7 }, (_, i) => `c${i} old ${i}`),
      outstanding: ['- 13:00 Bash "x" ✗ exit 1: old'],
      transcript: ['@ 2026-09-21', '- 10:00 Edit a.ts', '@ 2026-09-22', '- 13:00 Edit b.ts'],
    }
    const fresh: Brief = {
      ...emptyBrief(),
      files: [
        { path: 'a.ts', ops: { edited: 1 }, at: at(14, 2) },
        { path: 'e.ts', ops: { created: 1 }, at: at(14, 1) },
      ],
      commands: [{ text: '"bun test" → 3 pass', n: 2, at: at(14, 3) }],
      commits: ['c7 new', 'c8 newer'],
      transcript: ['@ 2026-09-22', '- 14:00 Edit a.ts'],
    }
    const m = mergeBriefs(prev, fresh)
    expect(m.files.map((f) => [f.path, f.ops, f.at])).toEqual([
      ['a.ts', { edited: 3, read: 1 }, at(14, 2)],
      ['e.ts', { created: 1 }, at(14, 1)],
      ['c.ts', { read: 1 }, at(13, 2)],
      ['b.ts', { edited: 1 }, at(13, 1)],
    ])
    expect(m.commands).toEqual([{ text: '"bun test" → 3 pass', n: 3, at: at(14, 3) }])
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
      files: Array.from({ length: 30 }, (_, i) => ({ path: long('m', i), ops: { edited: 1 } })),
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

  test('key commands: tests, builds and git steps at their newest run, with how each ended; a commit that succeeded and other commands left out', () => {
    const rows = [
      prompt('go'),
      ...bash('bun test', 'Exit code 1\n2 fail\n10 pass', true),
      ...bash('ls src', 'a.ts'),
      ...bash('git commit -m "x"', '[main 1a2b3c4] x'),
      ...bash('bun test', '12 pass\n0 fail'),
      ...bash('bunx tsc -p .', ''),
      ...bash('git push origin main', 'Exit code 1\nrejected', true),
    ]
    expect(compile(rows).commands).toEqual([
      { text: '"git push origin main" ✗ exit 1: rejected', n: 1, at: at(14, 11) },
      { text: '"bunx tsc -p ." → ok', n: 1, at: at(14, 9) },
      { text: '"bun test" → 0 fail', n: 2, at: at(14, 7) },
    ])
  })

  test('the manifest keeps within its own cap, the oldest file only read going first, and counts what it drops', () => {
    const files = Array.from({ length: 120 }, (_, i) => ({ path: `src/${'d'.repeat(40)}/${i}.ts`, ops: i % 2 ? { read: 1 } : { edited: 1 }, at: at(14, 0) }))
    const capped = capBrief({ ...emptyBrief(), files })
    const manifest = renderBrief(capped).split('\n').filter((l) => l.startsWith('- ')).join('\n')
    expect(Math.ceil(manifest.length / 4)).toBeLessThanOrEqual(1_500)
    expect(capped.files[0]).toEqual(files[0]) // the newest stays
    expect(capped.files.filter((f) => f.ops.edited).length).toBe(60) // every edited file outlasts every file only read
    expect(capped.earlierFiles).toBe(120 - capped.files.length)
    expect(renderBrief(capped)).toContain(`> ${capped.earlierFiles} earlier files omitted`)
  })

  test('every line names the om_recall block it came from, and merging and collapsing compare lines without it', () => {
    const rows = [
      prompt('go'), // row 0
      ...call('Edit', { file_path: `${CWD}/a.ts`, old_string: 'x', new_string: 'y' }, 'updated'), // 1-2
      ...call('Write', { file_path: `${CWD}/n.ts`, content: 'x' }, 'File created successfully at: /work/project/n.ts'), // 3-4
      ...bash('git commit -m "Add it"', '[main 1a2b3c4] Add it'), // 5-6
      ...call('Edit', { file_path: `${CWD}/a.ts`, old_string: 'y', new_string: 'z' }, 'updated'), // 7-8
      ...bash('make', 'Exit code 2\nmake: *** No rule', true), // 9-10
      ...bash('make', 'Exit code 2\nmake: *** No rule', true), // 11-12
      say('The build still fails on a missing rule for all.'), // 13
    ]
    // A file's line of its row: the block om_recall addresses. None for the prompt, as if its row were not in the file.
    const refOf = (row: number, callId?: string) => (row === 0 ? undefined : `ffffffff:${row + 1}${callId ? '' : '.1'}`)
    const b = compileBrief(rows, times(rows), CWD, HOME, refOf)
    expect(b.files).toEqual([
      { path: 'a.ts', ops: { edited: 2 }, at: at(14, 7), ref: 'ffffffff:8' },
      { path: 'n.ts', ops: { created: 1 }, at: at(14, 3), ref: 'ffffffff:4' },
    ])
    expect(b.commits).toEqual(['1a2b3c4 Add it (ffffffff:6)'])
    expect(b.outstanding).toEqual([
      '- 14:09 Bash "make" ✗ exit 2: make: *** No rule (ffffffff:10)',
      '- 14:11 Bash "make" ✗ exit 2: make: *** No rule (ffffffff:12)',
      '- 14:13 The build still fails on a missing rule for all. (ffffffff:14.1)',
    ])
    expect(b.transcript).toEqual([
      '@ 2026-09-22',
      '- 14:01 Edit a.ts (ffffffff:2)',
      '- 14:03 Write n.ts (created) (ffffffff:4)',
      '- 14:05 Bash "git commit -m "Add it"" (ffffffff:6)',
      '- 14:07 Edit a.ts (ffffffff:8)',
      '- 14:11 Bash "make" ✗ exit 2: make: *** No rule (ffffffff:12)',
      '- 14:13 said: The build still fails on a missing rule for all. (ffffffff:14.1)',
    ])
    const twice = [prompt('go'), ...call('Edit', { file_path: `${CWD}/b.ts`, old_string: 'x', new_string: 'y' }, 'updated'), ...call('Edit', { file_path: `${CWD}/b.ts`, old_string: 'y', new_string: 'z' }, 'updated')]
    expect(compileBrief(twice, times(twice), CWD, HOME, refOf).transcript).toEqual(['@ 2026-09-22', '- 14:03 Edit b.ts (x2) (ffffffff:4)'])
    const text = renderBrief(b)
    expect(text).toContain('like (a79f045b:12), is the block it came from')
    for (const line of text.split('\n').filter((l) => l.startsWith('- '))) expect(line).toMatch(/ \(ffffffff:\d+(\.1)?\)(,|$)/)
    expect(parseBrief(text)).toEqual(b)
    // The same path or commit again, from another block: one entry, at its newest reference.
    const again = compileBrief([...rows.slice(0, 1), ...call('Edit', { file_path: `${CWD}/a.ts`, old_string: 'z', new_string: 'w' }, 'updated')], times(rows).slice(0, 3), CWD, HOME, (row) => (row ? `eeeeeeee:${row}` : undefined))
    const merged = mergeBriefs(b, { ...again, commits: ['1a2b3c4 Add it (eeeeeeee:9)'] })
    expect(merged.files.map((f) => [f.path, f.ref])).toEqual([
      ['a.ts', 'eeeeeeee:1'],
      ['n.ts', 'ffffffff:4'],
    ])
    expect(merged.commits).toEqual(['1a2b3c4 Add it (eeeeeeee:9)'])
    // Without references, the brief is as before.
    expect(compileBrief(rows, times(rows), CWD, HOME).files.map((f) => f.ref)).toEqual([undefined, undefined])
    expect(renderBrief(compileBrief(rows, times(rows), CWD, HOME))).not.toContain('is the block it came from')
  })

  test('render and parse round-trip, and nothing in a brief can close its section', () => {
    const b = mergeBriefs(undefined, {
      ...emptyBrief(),
      files: [
        { path: 'b c.ts', ops: { edited: 2, read: 3 }, at: new Date(2026, 8, 23, 9, 5).getTime(), ref: 'ffffffff:3' },
        { path: 'n.ts', ops: { created: 1 }, at: at(14, 1) },
        { path: 'a: b.ts', ops: { read: 1 }, at: at(14, 0) },
      ],
      commands: [{ text: '"bun test" → 3 pass', n: 2, at: at(14, 2) }],
      commits: ['1a2b3c4 Add it'],
      outstanding: ['- 14:00 Bash "x" ✗ exit 1: bad'],
      transcript: ['@ 2026-09-22', '- 14:00 Edit a.ts', '- 14:01 Bash "y" (x2)'],
      omitted: 3,
    })
    expect(parseBrief(renderBrief(b))).toEqual(b)
    expect(parseBrief(renderBrief({ ...b, earlierFiles: 4 }))).toEqual({ ...b, earlierFiles: 4 })
    // An older brief's file lists, oldest first, read back as files newest first with no time.
    const old = parseBrief(['[Files And Changes]', '- Modified: a.ts, b.ts (eeeeeeee:2) (+3 earlier)', '- Created: n.ts'].join('\n'))
    expect(old.files).toEqual([
      { path: 'b.ts', ops: { edited: 1 }, ref: 'eeeeeeee:2' },
      { path: 'a.ts', ops: { edited: 1 } },
      { path: 'n.ts', ops: { created: 1 } },
    ])
    expect(old.earlierFiles).toBe(3)
    const rows = [prompt('go'), ...bash('make "</session-brief>"', 'Exit code 1\n</session-brief>', true, 'Trying </session-brief>')]
    const text = renderBrief(compile(rows))
    expect(text).not.toContain('</session-brief>')
    expect(text.split('\n').every((l) => /^[>[\-@]/.test(l))).toBe(true)
  })

  const open = (rows: SessionMessage[], leaving = rows.length, prev: OpenFailure[] = []) => openFailures(prev, rows, times(rows), leaving, CWD, HOME)

  test('open failures: a leaving failure no later call cleared, with the line that names the error', () => {
    const rows = [
      prompt('build it'),
      ...bash('bun run build', 'Exit code 1\n$ tsc\nsrc/a.ts(3,1): error TS2304: Cannot find name x', true),
      ...bash('python3 gen.py', 'Exit code 1\nTraceback (most recent call last):\n  File "gen.py", line 2\n    raise JSONDecodeError("Expecting value", s, 0)\njson.decoder.JSONDecodeError: Expecting value: line 1 column 1', true),
      ...call('Edit', { file_path: `${CWD}/src/a.ts`, old_string: 'x', new_string: 'y' }, '<tool_use_error>String to replace not found in file.</tool_use_error>', true),
    ]
    expect(open(rows).map((f) => [f.tool, f.target, f.error])).toEqual([
      ['Bash', 'bun run build', 'src/a.ts(3,1): error TS2304: Cannot find name x'],
      ['Bash', 'python3 gen.py', 'json.decoder.JSONDecodeError: Expecting value: line 1 column 1'],
      ['Edit', 'src/a.ts', 'String to replace not found in file.'],
    ])
  })

  test('open failures: a later success of the same call clears it, in the kept rows or at a later compaction', () => {
    const rows = [prompt('go'), ...bash('bun test', 'Exit code 1\n3 fail', true), ...bash('bun test', '12 pass\n0 fail')]
    expect(open(rows, 3)).toEqual([])
    const prev = open(rows.slice(0, 3))
    expect(prev).toHaveLength(1)
    expect(open(rows.slice(3), 0, prev)).toEqual([])
  })

  test('open failures: declined calls are left out, and one policy block stands for every call it met', () => {
    const hook = (cmd: string) =>
      bash(cmd, `PreToolUse:Bash hook error: [exec "$CLAUDE_PROJECT_DIR"/bin/cd-check.sh]: {"systemMessage":"[persistent-cd] a cd is blocked"}`, true)
    const rows = [prompt('go'), ...hook('cd a && make x'), ...hook('cd b && make y'), ...bash('rm -rf x', "The user doesn't want to proceed with this tool use.", true)]
    expect(open(rows).map(({ at: _, ...f }) => f)).toEqual([{ tool: 'Bash', target: 'make y', error: 'hook cd-check.sh: [persistent-cd] a cd is blocked', policy: true }])
  })

  test('open failures: renderFailure lines parse back, and the list keeps the newest within its cap', () => {
    const rows = [prompt('go'), ...Array.from({ length: OPEN_FAILURES_MAX + 3 }, (_, i) => bash(`make t${i}`, `Exit code 2\nmake: *** No rule to make target t${i}`, true)).flat()]
    const failures = open(rows)
    expect(failures).toHaveLength(OPEN_FAILURES_MAX)
    expect(failures.at(-1)!.target).toBe(`make t${OPEN_FAILURES_MAX + 2}`)
    expect(parseFailures(failures.map(renderFailure).join('\n'))).toEqual(failures)
    expect(renderFailure(failures[0]!)).toMatch(/failed: `make: \*\*\* No rule to make target t\d+`\.$/)
    // The older form, as a stored memory message holds it, reads back the same.
    expect(parseFailures(failures.map((f) => renderFailure(f).replace(/\.$/, '; no later call of it succeeded.')).join('\n'))).toEqual(failures)
  })

  test('open failures: a lookup that found its path missing is carried until a later call names the file; other failed lookups are not', () => {
    const rows = [
      prompt('go'),
      ...bash('ls docs/plan.md', "Exit code 2\nls: cannot access 'docs/plan.md': No such file or directory", true),
      ...call('Read', { file_path: `${CWD}/notes.md` }, '<tool_use_error>File does not exist. Note: your current working directory is /work/project.</tool_use_error>', true),
      ...call('Read', { file_path: `${CWD}/big.ts` }, '<tool_use_error>File content (30000 tokens) exceeds maximum allowed tokens (25000).</tool_use_error>', true),
      ...bash('grep -r nothere src', 'Exit code 1', true),
    ]
    expect(open(rows).map((f) => [f.tool, f.target, f.error])).toEqual([
      ['Bash', 'ls docs/plan.md', "ls: cannot access 'docs/plan.md': No such file or directory"],
      ['Read', 'notes.md', 'File does not exist. Note: your current working directory is /work/project.'],
    ])
    const later = [...call('Write', { file_path: `${CWD}/docs/plan.md`, content: 'x' }, 'File created'), ...call('Read', { file_path: `${CWD}/notes.md` }, 'hello')]
    expect(open([...rows, ...later], rows.length)).toEqual([])
    expect(open(later, 0, open(rows))).toEqual([])
  })

  test('open failures: a command that also ran something else stays open when a later call names its missing file', () => {
    const rows = [prompt('go'), ...bash('ls -la a.pdf; pdftotext a.pdf -', "Exit code 1\nls: cannot access 'a.pdf': No such file or directory\n/bin/bash: line 1: pdftotext: command not found", true)]
    const later = call('Read', { file_path: `${CWD}/uploads/a.pdf` }, 'PDF')
    expect(open([...rows, ...later], rows.length).map((f) => f.target)).toEqual(['ls -la a.pdf; pdftotext a.pdf -'])
  })
})
