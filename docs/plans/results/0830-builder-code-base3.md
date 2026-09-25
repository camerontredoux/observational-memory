# base3 = base2 + I28 + I25 + I34: built, exact vs base2

Dir: `/home/cameron/work/mods/observational-memory/.scratch/omv-code/base3` (real copy of base2). Diff against base2: `.scratch/omv-code/base3.diff` (hooks/register.ts and tests/register.test.ts only, +206/-32 lines). A/B: `.scratch/omv-code/ab-base3.md` / `.json`. base.txt not touched.

## What went in

- I28 pin-lifecycle: applied from phase2-code's commit 2f3bf13 (`git show`), not `.scratch/omv-code/i28-pins.diff`. That diff has only hooks/register.ts; the commit also carries the two tests. It applied cleanly with offsets; hunk 8 is a comment line, fuzz 2 because base2 has `renderGrouped` where fail11 had `renderLines`.
- I25 refl-tier: 4 of 6 hunks applied. Ported by hand:
  - `REFLECT_TIER_TOKENS = 6_000` next to I28's new `REFLECT_MIN_TARGET_TOKENS`.
  - Merged the tier into I28's bounded 🔴 share. `through` is `older` in order, taking I28's `red` entry (possibly shortened to an index line) by id, plus earlier-reflection lines while the tier fits. `sent` is `(!isRed(e) || moved.has(e.id)) && !(tier && e.r)`, so the 🔴 lines I28 moves to the Reflector are still sent. The target is still `REFLECT_TARGET_TOKENS - measure(red)`, as in I25, where tier lines don't count against it. I25's test applied as is.
- I34 retry-backoff: `/tmp/omv-build/i34-backoff.diff` as regenerated (mtime 08:24, includes builder-code2's `if (ids.size)` applyConstraints fix). Applied with offsets. Hunk 6 needed fuzz 2 because I25 changed the Reflector comment that follows it; the code is unchanged.
- Worktree: applied `.scratch/coord/rubric-revfix.diff` to tests/eval/rubric.ts first.

## Checks

- `bunx -p typescript tsc -p .`: 6 errors in 3 files, all missing fixtures.
- `claude plugin test`: 347 pass, 3 fail. The 3 are the known grp failures (background timing, corrections, budget/source ranges). All the new tests pass: I28's two (constraints over cap shorten to index lines; 🔴 lines over their reflection share), I25's (a later reflection passes earlier reflection lines through), and I34's (back-off doubling).
- `ab --a base2 --b base3 --holdout --chain --jobs 12 --json .scratch/omv-code/ab-base3.json`: exact.

| track | base2 | base3 | Δ | flips | fresh calls |
|---|---|---|---|---|---|
| main | 77.9 | 77.9 | 0 | 0↑ 0↓ | 0 (87 cached) |
| holdout | 79.3 | 79.3 | 0 | 0↑ 0↓ | 0 (44 cached) |
| chain | 81.5 | 81.5 | 0 | 0↑ 0↓ | 0 (110 cached) |

Efficiency is the same (18k / 19k / 33k mean context per cut). 0 items lost.

Note: a cache-exact chain means the Reflector saw byte-identical input. On this corpus, neither I28's 🔴 bound nor I25's tier changes what the Reflector gets. They are robustness fixes the bench does not exercise, as expected.
