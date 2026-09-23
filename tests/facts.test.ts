import { describe, expect, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'
import { condenseFacts, extractFacts, isFact } from '../hooks/facts'

const CWD = '/work/app'
const T = new Date(2026, 8, 23, 12, 0).getTime()
const min = (n: number) => T + n * 60_000

// One call and its result as two rows, `n` minutes in.
function call(tool: string, input: Record<string, unknown>, result: string, n = 0, isError = false): { rows: SessionMessage[]; at: number[] } {
  const id = `t${Math.random()}`
  return {
    rows: [
      { role: 'assistant', text: '', toolUses: [{ tool_use_id: id, tool, input }] },
      { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: id, text: result, isError }] },
    ],
    at: [min(n), min(n)],
  }
}
const bash = (command: string, result: string, n = 0, isError = false) => call('Bash', { command }, result, n, isError)
function facts(...calls: { rows: SessionMessage[]; at: number[] }[]) {
  return extractFacts(
    calls.flatMap((c) => c.rows),
    calls.flatMap((c) => c.at),
    CWD,
  ).map((f) => `${f.marker} ${f.text}`)
}

describe('edits', () => {
  test('Edit and Write calls collapse into one line per chunk, repeats counted, the cwd cut, a failed edit left out', () => {
    expect(
      facts(
        call('Edit', { file_path: '/work/app/src/a.ts', old_string: 'x', new_string: 'y' }, 'The file /work/app/src/a.ts has been updated.'),
        call('Edit', { file_path: '/work/app/src/a.ts', old_string: 'y', new_string: 'z' }, 'The file /work/app/src/a.ts has been updated.', 1),
        call('Write', { file_path: '/work/app/src/b.ts', content: '' }, 'File created successfully at: /work/app/src/b.ts', 2),
        call('Edit', { file_path: '/work/app/src/c.ts', old_string: 'q', new_string: 'r' }, 'String to replace not found in file.', 3, true),
      ),
    ).toEqual(['🟡 [edits] src/a.ts ×2, src/b.ts (created)'])
  })

  test('sd, sed -i, a redirect and tee in a Bash command are edits; /tmp is scratch', () => {
    expect(
      facts(
        bash("cd /work/app; sd 'new Response\\(pdf\\)' 'new Response(Buffer.from(pdf))' apps/x.test.ts", ''),
        bash("sed -i 's/a/b/' src/c.ts && printf 'x' > notes.md", ''),
        bash("cat > /tmp/body.md <<'EOF'\nhello > world.md\nEOF\necho done | tee -a log.txt", ''),
      ),
    ).toEqual(['🟡 [edits] apps/x.test.ts, src/c.ts, notes.md, log.txt'])
  })
})

describe('commands', () => {
  test('a command that succeeded is not a fact: neither a look nor work that changed no file', () => {
    expect(
      facts(
        bash('ls src; rg -n foo src | head; cat a.ts; git status; sed -n 1,20p a.ts', 'lots'),
        bash('cd /work/app && rtk proxy pnpm db:create-migration add_gorman 2>&1 | tail -3', 'Created'),
        bash('pnpm install', 'ok', 1),
        call('Bash', { command: 'pnpm dev', run_in_background: true }, 'Command running in background with ID: b1', 2),
      ),
    ).toEqual([])
  })

  test('a status echoed after a pipeline is read from the output: EXIT 1 fails the command before it', () => {
    const out = facts(
      bash(
        'cd /work/app; ./scripts/test-lock.sh pnpm --filter @oasis/web exec vitest run --project integration x.test.ts 2>&1 | tail -5; echo EXIT ${PIPESTATUS[0]}',
        '/work/app/apps/web:\n ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command failed with exit code 1: vitest run --project integration x.test.ts\nEXIT 1',
      ),
    )
    expect(out).toEqual([
      '🟡 [failed] ./scripts/test-lock.sh pnpm --filter @oasis/web exec vitest run --project integration x.test.ts (exit 1): ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command failed with exit code 1: vitest run --project integration x.test.ts',
    ])
  })

  test('a failed call reads its code from `Exit code N`; a failed look is low priority', () => {
    expect(
      facts(
        bash('pnpm build', 'Exit code 2\nsrc/a.ts: something\nError: build failed', 0, true),
        bash('ls missing', "Exit code 2\nls: cannot access 'missing': No such file or directory", 2, true),
      ),
    ).toEqual(['🟡 [failed] pnpm build (exit 2): Error: build failed', "🟢 [failed] ls missing (exit 2): ls: cannot access 'missing': No such file or directory"])
  })

  test('a rejected call is one failure; grep finding nothing is not a failure; the program named in the error is the one that failed', () => {
    expect(
      facts(
        bash('F=/work/app; $F/bin/state.sh x', "The user doesn't want to proceed with this tool use. The tool use was rejected.", 0, true),
        bash('rg -n foo src', 'Exit code 1', 1, true),
        bash('bin/report.sh; ls config/missing; wc -c a.md', "Exit code 1\nreport ok\nls: cannot access 'config/missing': No such file or directory\n12 a.md", 2, true),
      ),
    ).toEqual(['🟡 [failed] bin/state.sh x (rejected by the user)', "🟢 [failed] ls config/missing (exit 1): ls: cannot access 'config/missing': No such file or directory"])
  })

  test('a subshell and loop keywords are not commands; a python heredoc that writes a file is an edit, one that does not is nothing', () => {
    expect(
      facts(
        bash('(cd /work/app && make) ; for f in a b; do bin/one.sh $f > out/$f.txt; done', ''),
        bash("python3 - <<'EOF'\np='src/x.ts'\ns=open(p).read()\nopen(p,'w').write(s)\nEOF", '', 1),
        bash("python3 - <<'EOF'\nimport os\nos.remove('x')\nEOF", '', 2),
      ),
    ).toEqual(['🟡 [edits] src/x.ts'])
  })

  test('a function defined inline is not a command; a variable set from a command substitution is not expanded', () => {
    expect(
      facts(
        bash('rep() { :; }; make build', 'Exit code 2\nmake: *** [build] Error 1', 0, true),
        bash('S=/work/app/state/x.status; N=$(wc -l <$S); timeout 60 bash -c "until [ \\$(wc -l <$S) -gt $N ]; do sleep 5; done"', 'Exit code 124\ntimed out', 1, true),
      ),
    ).toEqual(['🟡 [failed] make build (exit 2): make: *** [build] Error 1', '🟡 [failed] bash -c "until [ $(wc -l <state/x.status) -gt $N ]; do sleep 5; done" (exit 124): timed out'])
  })
})

describe('refusals', () => {
  const CD = 'PreToolUse:Bash hook error: [check.sh]: {"hookSpecificOutput":{"permissionDecision":"deny"},"systemMessage":"[persistent-cd] a persistent cd is blocked"}'

  test('a hook refusal leads with its reason and names the segment the reason names; with none or several named, no command', () => {
    expect(
      facts(
        bash('cd /work/app/sub && bin/relaunch.sh', CD, 0, true),
        bash('bin/a.sh; bin/b.sh', 'PreToolUse:Bash hook error: {"systemMessage":"[no-chain] chained commands are blocked"}', 1, true),
        bash('bin/deploy.sh prod', 'PreToolUse:Bash hook error: {"permissionDecisionReason":"prod is frozen"}', 2, true),
        bash('sleep 45; bin/peek.sh x | tail -5', '<tool_use_error>Blocked: sleep 45 followed by: bin/peek.sh x tail -5. Use Monitor.</tool_use_error>', 3, true),
      ),
    ).toEqual([
      '🟡 [failed] blocked by a hook: [persistent-cd] a persistent cd is blocked (cd sub)',
      '🟡 [failed] blocked by a hook: [no-chain] chained commands are blocked',
      '🟡 [failed] blocked by a hook: prod is frozen (bin/deploy.sh prod)',
      '🟡 [failed] Blocked: sleep 45 followed by: bin/peek.sh x tail -5. Use Monitor.',
    ])
  })

  test('the same refusal repeated in a chunk is one line, counted from its first time, whatever the commands', () => {
    expect(facts(bash('cd /work/app/a && make', CD, 0, true), bash('cd b && make', CD, 5, true), bash('bin/x.sh', 'Exit code 1\nError: x', 6, true), bash('cd c', CD, 9, true))).toEqual([
      '🟡 [failed] bin/x.sh (exit 1): Error: x',
      '🟡 [failed] blocked by a hook: [persistent-cd] a persistent cd is blocked (×3 since 12:00)',
    ])
  })
})

describe('checks', () => {
  test('vitest counts, with files, pass as ✅ and fail as 🟡, the runner named', () => {
    expect(
      facts(
        bash('pnpm exec vitest run a.test.ts', ' Test Files  2 passed (2)\n      Tests  13 passed (13)\n   Duration  3.33s'),
        bash('pnpm exec vitest run b.test.ts', ' Test Files  1 failed | 1 passed (2)\n      Tests  1 failed | 12 passed (13)', 1, true),
      ),
    ).toEqual(['✅ [checks] pnpm exec vitest run a.test.ts: 13 passed of 13 (2 files)', '🟡 [checks] pnpm exec vitest run b.test.ts: 1 failed, 12 passed of 13 (2 files)'])
  })

  test('tsc errors are counted with the first; a clean typecheck is a pass; lint counts errors and warnings', () => {
    expect(
      facts(
        bash(
          './scripts/test-lock.sh --lane typecheck pnpm -r typecheck 2>&1 | grep -E "error TS|Done"; echo TC ${PIPESTATUS[0]}',
          "packages/core typecheck: Done\napps/web typecheck: src/x.test.ts(275,75): error TS2345: Argument of type 'Uint8Array' is not assignable to parameter of type 'BodyInit'.\nTC 1",
        ),
        bash('pnpm -r typecheck 2>&1 | grep "error TS"; echo TC ${PIPESTATUS[0]}; pnpm lint 2>&1 | tail -3; echo LINT $?', '✖ 81 problems (0 errors, 81 warnings)\nTC 0\nLINT 0', 1),
      ),
    ).toEqual([
      "🟡 [checks] ./scripts/test-lock.sh --lane typecheck pnpm -r typecheck: 1 type error, first TS2345 at src/x.test.ts:275: Argument of type 'Uint8Array' is not assignable to parameter of type 'BodyInit'.",
      '✅ [checks] pnpm lint: lint 0 errors, 81 warnings',
      '✅ [checks] pnpm -r typecheck: no type errors',
    ])
  })

  test('bun-style `N pass` / `N fail` and a plain `N passed, M failed` are read', () => {
    expect(facts(bash('bun test', ' 70 pass\n 0 fail\nRan 70 tests across 3 files.'), bash('claude plugin test .', 'Tests: 5 passed, 1 failed, 6 total', 1, true))).toEqual([
      '✅ [checks] bun test: 70 passed',
      '🟡 [checks] claude plugin test .: 5 passed, 1 failed of 6',
    ])
  })

  test('a test script’s own output: TAP ok/not ok lines, a total=/failed= summary, `N tests passed`, `ok N/M`, PASS/FAIL lines', () => {
    expect(
      facts(
        bash('bash tests/fm-teardown.test.sh 2>&1 | tail -5', 'ok - tears down\nok - keeps the branch\nnot ok - teardown failed with a real backlog'),
        bash(
          'bin/fm-test-run.sh tests/a.test.sh tests/b.test.sh',
          'FM_TEST_BEGIN 2026-09-23T12:00:00Z tests/a.test.sh family=x expected_gate_skip=none\nok - a\nnot ok - b\nFM_TEST_END 2026-09-23T12:00:01Z tests/a.test.sh exit=1 duration_ms=5 gate_skip=false\nFM_TEST_SUMMARY total=2 failed=1 skipped_gate=0 duration_ms=900\nFM_TEST_SUMMARY_FAMILY family=x count=2 duration_ms=900 failed=1',
          1,
        ),
        bash('./run-tests.sh', 'Running 12 tests\nAll 12 tests passed', 2),
        bash('make test', 'ok 7/8', 3),
        bash('bash tests/smoke.sh', 'PASS: login\nPASS: logout\nFAIL: signup', 4),
        bash('python3 tests/run.py', 'Results: 5 passed, 2 failed', 5),
      ),
    ).toEqual([
      '🟡 [checks] bash tests/fm-teardown.test.sh: 2 passed, 1 failed',
      '🟡 [checks] bin/fm-test-run.sh tests/a.test.sh tests/b.test.sh: 1 failed, 1 passed of 2',
      '✅ [checks] ./run-tests.sh: 12 passed',
      '🟡 [checks] make test: 7 passed of 8',
      '🟡 [checks] bash tests/smoke.sh: 2 passed, 1 failed',
      '🟡 [checks] python3 tests/run.py: 5 passed, 2 failed',
    ])
  })

  test('pass and fail wording in the output of a command that ran no tests is not a check', () => {
    expect(
      facts(
        bash('cat data/report.md', '| tests/a.test.sh | 1 | 67 / 1 `not ok - relaunch` |\nok - listed\nAll 3 tests passed\n5 passed, 1 failed\nPASS: x'),
        bash('gh pr checks 12', 'Lint\tpass\t1m\nUnit\tfail\t2m', 1),
        bash('bin/fm-wake-drain.sh', 'PASS: nothing\nok 3/3\n4 passed, 0 failed', 2),
      ),
    ).toEqual([])
  })

  test('the same result twice in a chunk is one line, counted', () => {
    const run = () => bash('pnpm exec vitest run a.test.ts', '      Tests  6 passed (6)')
    expect(facts(run(), run())).toEqual(['✅ [checks] pnpm exec vitest run a.test.ts: 6 passed of 6 (×2)'])
  })
})

describe('git', () => {
  test('branch, commit with hash and subject, push and a PR, on one line', () => {
    expect(
      facts(
        bash('git checkout -b fm/gorman && no-mistakes doctor 2>&1 | tail -20', 'ok'),
        bash('git add -A && git commit -m "Add Gorman PDF"', '[fm/gorman 1a2b3c4] Add Gorman PDF\n 3 files changed', 1),
        bash('git push -u origin fm/gorman', 'done', 2),
        bash('gh pr create --fill', 'https://github.com/o/r/pull/1417', 3),
      ),
    ).toEqual([
      '✅ [git] created branch fm/gorman; committed 1a2b3c4 "Add Gorman PDF" on fm/gorman; pushed origin fm/gorman; opened PR https://github.com/o/r/pull/1417',
    ])
  })

  test('a failed push is a failure, not a push; a hash in unrelated output is not a commit', () => {
    expect(
      facts(bash('git push origin main', 'Exit code 1\n! [rejected] main -> main (fetch first)\nerror: failed to push', 0, true), bash('bin/status.sh', '20198da4a no-mistakes(document): Document Gorman PDF', 1)),
    ).toEqual(['🟡 [failed] git push origin main (exit 1): error: failed to push'])
  })

  test('a merge or rebase that printed conflicts is not completed; an abort later in the chunk marks it aborted; an abort alone says so', () => {
    const conflict = 'Auto-merging bin/a.sh\nCONFLICT (content): Merge conflict in bin/a.sh\nAutomatic merge failed; fix conflicts and then commit the result.'
    expect(facts(bash('git merge --no-edit upstream/main 2>&1 | tail -30', conflict), bash('git merge --abort && git status -sb', '## main', 1))).toEqual([
      '🟡 [git] merge --no-edit upstream/main aborted',
    ])
    expect(facts(bash('git merge upstream/main | tail', conflict))).toEqual(['🟡 [git] merge upstream/main: conflicts'])
    expect(facts(bash('git rebase main | tail', 'CONFLICT (content): Merge conflict in a.ts\nerror: could not apply 1a2b3c4... x'), bash('git cherry-pick --abort', '', 1), bash('git rebase --abort', '', 2))).toEqual([
      '🟡 [git] rebase main aborted; cherry-pick aborted',
    ])
    expect(facts(bash('git merge feature', 'Merge made by the ort strategy.'), bash('git commit -m "x"', '[main 1a2b3c4] x', 1))).toEqual(['✅ [git] merge feature; committed 1a2b3c4 "x" on main'])
  })
})

test('every line is tagged, stamped by its last row, and sorted by time; isFact knows them once stamped', () => {
  const rows = [
    call('Edit', { file_path: '/work/app/a.ts' }, 'updated', 5),
    bash('pnpm exec vitest run', '      Tests  1 passed (1)', 2),
  ]
  const out = extractFacts(rows.flatMap((c) => c.rows), rows.flatMap((c) => c.at), CWD)
  expect(out.map((f) => f.at)).toEqual([min(2), min(5)])
  expect(out.every((f) => isFact(`${f.marker} 2026-09-23 12:00 ${f.text}`))).toBe(true)
  expect(isFact('🟡 2026-09-23 12:00 [edits] a.ts')).toBe(true)
  expect(isFact('✅ 2026-09-23 12:00 completed: edits [edits] a.ts')).toBe(false)
})

test('condensing collapses a hook refusal repeated across chunks into its last, counted since its first; other failures stay', () => {
  expect(
    condenseFacts([
      '🟡 2026-09-22 23:50 [failed] blocked by a hook: [persistent-cd] x (cd a)',
      '🟡 2026-09-23 13:39 [failed] blocked by a hook: [persistent-cd] x (×3 since 13:30)',
      '🟡 2026-09-23 14:00 [failed] pnpm build (exit 1): Error: boom',
      '🟡 2026-09-23 14:10 [failed] blocked by a hook: prod is frozen (bin/deploy.sh)',
      '🟡 2026-09-23 15:12 [failed] blocked by a hook: [persistent-cd] x',
    ]),
  ).toEqual([
    '🟡 2026-09-23 14:00 [failed] pnpm build (exit 1): Error: boom',
    '🟡 2026-09-23 14:10 [failed] blocked by a hook: prod is frozen (bin/deploy.sh)',
    '🟡 2026-09-23 15:12 [failed] blocked by a hook: [persistent-cd] x (×5 since 2026-09-22 23:50)',
  ])
  expect(condenseFacts(['🟡 2026-09-23 13:27 [failed] blocked by a hook: y (cd a)', '🟡 2026-09-23 13:39 [failed] blocked by a hook: y (×2 since 13:30)'])).toEqual([
    '🟡 2026-09-23 13:39 [failed] blocked by a hook: y (×3 since 13:27)',
  ])
})

test('condensing marks a merge aborted in a later chunk as aborted and drops the abort', () => {
  expect(
    condenseFacts([
      '🟡 2026-09-23 13:27 [git] merge --no-edit upstream/main: conflicts',
      '🟡 2026-09-23 13:28 [git] merge aborted; pushed origin main',
      '🟡 2026-09-23 13:29 [git] rebase aborted',
    ]),
  ).toEqual(['🟡 2026-09-23 13:27 [git] merge --no-edit upstream/main aborted', '✅ 2026-09-23 13:28 [git] pushed origin main', '🟡 2026-09-23 13:29 [git] rebase aborted'])
})

test('condensing for a reflection drops [ran] and failed looks, keeps each check’s latest, merges an hour’s edits', () => {
  expect(
    condenseFacts([
      '🟡 2026-09-23 12:01 [edits] src/a.ts ×2, src/b.ts (created)',
      '🟢 2026-09-23 12:02 [ran] make; bin/x.sh ×3',
      '🟡 2026-09-23 12:03 [checks] pnpm typecheck: 1 type error, first TS2345 at a.ts:3: bad',
      '🟢 2026-09-23 12:04 [failed] ls missing (exit 2): ls: cannot access',
      '🟡 2026-09-23 12:05 User decided X',
      '🟡 2026-09-23 12:30 [edits] src/a.ts, src/c.ts',
      '✅ 2026-09-23 12:31 [checks] pnpm typecheck: no type errors',
      '✅ 2026-09-23 12:32 [git] committed abc1234 "Add X" on main',
      '🟡 2026-09-23 13:10 [edits] src/a.ts',
      '🟡 2026-09-23 13:11 [failed] pnpm build (exit 1): Error: boom',
    ]),
  ).toEqual([
    '🟡 2026-09-23 12:30 [edits] src/a.ts ×3, src/b.ts (created), src/c.ts',
    '✅ 2026-09-23 12:31 [checks] pnpm typecheck: no type errors',
    '✅ 2026-09-23 12:32 [git] committed abc1234 "Add X" on main',
    '🟡 2026-09-23 13:10 [edits] src/a.ts',
    '🟡 2026-09-23 13:11 [failed] pnpm build (exit 1): Error: boom',
  ])
})
