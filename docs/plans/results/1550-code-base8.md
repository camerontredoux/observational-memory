# phase2-code: base8 (final code-lane base), I54 verdict, I56 fix

## base8

- Plugin dir: `/home/cameron/work/mods/observational-memory/.scratch/omv-code/base8` (also `/tmp/omv-code/base8`).
- Contents: base7 + I55 lookup-fail + I54 rowcap + I56 align. The I53 carry arm is not in yet; it waits on phase2-obs's verdict and patch path.
- Diff: `/tmp/omv-code/base8.diff`, 2,185 lines, git style, a/ and b/ paths relative to the repo root. It runs from MAIN's current `hooks/` and committed tests to base8's. It touches `hooks/{prompts,recall,register,vcc}.ts` and `tests/{register,vcc,recall}.test.ts`.
  - It leaves out the benchmark files (`tests/eval/`, `tests/replay.test.ts`, where main's copies are newer), the fixtures, and the main-only `tests/ranking.test.ts` / `tests/eval/ranking.ts`.
  - Main's hooks haven't changed since the merge base (af0940d; #25 touched only the bench and ranking files).
  - Checked by applying it with `patch -p1` to a copy of main's hooks/ and tests/: all 7 files come out byte-identical to base8's. I didn't run `git apply --check` itself, because worktree isolation blocks git in other directories.
- Checks: `claude plugin test` 368/0. tsc: only the 6 missing-fixture errors (recall.test.ts:73, register.test.ts:3096, replay.test.ts:850).

## Final A/B: base8 vs base7, MAIN checkout's bench, all tracks cached (0 fresh)

Report: `/tmp/omv-code/final-base8.md` (json alongside).

| track | base7 | base8 | Δ | unique ↑/↓ |
|---|---:|---:|---:|---|
| main | 78.3 | 78.3 | 0 (exact) | 0/0 |
| holdout | 82.9 | 83.4 | +0.5 | 4/0 (I55) |
| chain | 81.0 | 81.0 | 0 | 4/2 |
| long | 61.8 | 61.7 | -0.1 | 36/31, p=0.63 (base7 resample noise 16/12) |
| long recall-aware | 43.6 | 41.6 | -2.0 | |

**Efficiency:**
- Main: same (19k mean context, 1,217k model tokens, 2 critical-path calls).
- Long: 115 → 4 critical-path calls (1,983k → 52k tokens in). Blocked cuts 29/80 → 3/80. Summed Observer time per cut 26.8 s → 0.9 s (an upper bound on blocking). Model tokens 6,039k → 5,303k (-12%). Observer calls 325 → 283, Reflector 10 → 8. Mean context 43k → 44k (+2%, inside ±10%).

**Long gates that moved** (these are I54's resampled draws; I55 adds failures +20):
- Up: failures +20.0 (6→8/10), in-progress +12.0, decisions +7.7, reversals +3.9, files-edited +2.6, identifiers +1.9.
- Down: chronology -5.9 (30 down, mostly @65–80), commits -5.5 (PRs 238/1418/1419), budget -2.5.

## Per-idea verdicts

- **I55 lookup-fail: kept.** A failed lookup of a missing path is carried until a later call names the file. The name-based clear applies only to pure lookups. Holdout +0.5 (4/0), long +1.0 (2/0), otherwise exact; 366/0 on its own. Diff `/tmp/omv-code/i55-lookfail.diff`.
- **I54 rowcap: kept, on the latency goal.** At the 4,096-row cap, `onStep` now finds the scheduled row by its hash suffix, so mid-turn scheduling works again.
  - Long 61.8 → 60.8 (-1.1), 34/31 unique; recall-aware -2.0. That's fresh-draw churn (188/291 long calls were fresh when recorded), about twice base7's resample noise and netting to zero.
  - Critical path and model tokens as above; main, holdout and chain unchanged.
  - Caveat: the live session never passed 4,096 rows (max 3.7k), so the gain only shows in very long sessions.
  - Report `/tmp/omv-code/ab-rowcap-long.md`.
- **I56 align: kept (bug fix).**
  - Change: session.compact tries history offsets up to 8 rows short of the end (each slice in call order) and takes the first where every row's hash matches. It no longer assumes the history ends where `e.messages` does.
  - Logging: when no offset matches, the log line now also gives the number of differing rows and where the first reads nearby.
  - Tests: a trailing `/compact` row now keeps the ledger with no sync Observer call; that test fails on b8full.
  - Benchmark: exact on all tracks. Diff `/tmp/omv-code/i56-align.diff`.
  - Open: the auto and subagent notPersistent causes. The only logged shape fits parallel results that the context holds merged in one row while the history holds one row per call. The new log line will show whether that's right.

## Other variant dirs

- b8lite = base7 + I55. b8full = base7 + I55 + I54. i56 = b8full + I56 = base8.
