B1 landing and base4's long baseline.

1) Landing in MAIN: not done. It needs your hand.
- The harness keeps me in my worktree: `cd /home/cameron/work/mods/observational-memory` puts me back in the worktree, and git in MAIN is refused. My original brief also said not to edit MAIN, so I haven't written there. MAIN is untouched; one stray `patch` ran in my worktree, skipped every hunk, and I removed its .rej files.
- It is ready to apply: from MAIN run `patch -p1 < ~/.claude/jobs/40c779b6/tmp/b1-long-clean.diff`. This diff leaves out the revfix and homefix hunks. It applies cleanly (no fuzz) to copies of MAIN's current bench-compact.ts, bench-replay.ts and rubric.ts. The patched copies are in the worktree at .scratch/land/try/ for comparison.
- Fixtures to copy into MAIN's tests/fixtures/ as real files: ~/.claude/jobs/40c779b6/tmp/b1-long.hard.local.ts (as long.hard.local.ts) and b1-rubric-controls.local.ts (as rubric-controls.local.ts).
- Then run `bun scripts/bench-compact.ts corpus` in MAIN; my worktree has its own tests/fixtures/replay, so I couldn't check MAIN's.
- The header line: the --long entry now names `bench-replay --gap-hours 24` and `--fallback recorded`.
- One new grading fix is in the diff: rubric.ts `pointed()` now reads a source range of times only ("(source 13:20 to 13:20)"), taking its day from the nearest "@ YYYY-MM-DD" header above it. base4 writes its ranges that way, and without the fix it got 0 pointed. fail11 and HEAD are unchanged by it.
- Checks in the worktree with the fix: tsc shows only the missing-fixture errors, and `claude plugin test` passes 348/0. A cached `run --long` of fail11 gives main 77.8 / long 58.7 / recall-aware 30.7, same as before.

2) base4's long baseline (.scratch/omv-code/base4), recorded with `run --record --long --jobs 12` in about 9 min:
- 5 fresh calls, all on the long chain; the main corpus was fully cached.
- main 78.1, long 59.7, recall-aware 32.5 (353 held + 106 pointed of 1248).
- For comparison: fail11 58.7 / 30.7, HEAD af0940d 53.7 / 30.9.
- It reached 4 reflections (6 Reflector calls). The constraint tier peaked at ~5.5k tokens at cut 80, below the 8k cap, with no fallbacks.
