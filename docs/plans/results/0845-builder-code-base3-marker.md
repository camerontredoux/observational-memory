# base3: `(source none)` marker plus the stale tests (builder-code)

Base3 is at `/home/cameron/work/mods/observational-memory/.scratch/omv-code/base3`. Its diff against base2 is `.scratch/omv-code/base3.diff`: `hooks/register.ts` and `tests/register.test.ts`, +268/-51 lines. This job fixes the attribution bug and the two stale tests described in `0845-builder-code-base3-fails.md`.

## What changed

- **Bug fix, `hooks/register.ts`:**
  - `renderGrouped` now writes `(source none)` after the last line of a sourceless run when a sourced run comes next. The constant is `NO_SOURCE`.
  - `parseMemory` removes that marker when it reads the memory back, and keeps the line sourceless.
  - Before the fix, `parseMemory`'s `reduceRight` gave a sourceless reflected line the source of the next run. That merged the two runs and lost the attribution.
  - A sourceless line with no marker still takes the source of the line after it. That is how the grouped form works: a run gives its source once, after its last line.
- **Tests, `tests/register.test.ts`:**
  - Stale grouped-trailer and date-header expectations are updated.
  - Existing tests that expected sourceless lines now expect the marker.
  - New test: a memory that mixes sourced and sourceless lines renders, carries forward and renders again unchanged.
  - The budget test is rebuilt. The old version no longer went over budget, because grouped rendering writes one trailer per run. It now uses 1,200 single-line runs, which fit the 15k budget without their ranges and go over it with them. It also runs real turns, so that the ledger is stored before the over-budget cut and the ranges come back at a later cut with room for them.

## Checks

- `claude plugin test`: 351 pass, 0 fail. The three known base failures are gone.
- `bunx -p typescript tsc -p .`: only the 6 missing-fixture errors.

## Cached A/B, base2 vs base3 (`--holdout --chain`, 0 fresh calls)

| track | base2 | base3 | Δ | flips |
|---|---|---|---|---|
| main | 77.9 | 77.9 | 0 | 0↑ 0↓ |
| holdout | 79.3 | 79.3 | 0 | 0↑ 0↓ |
| chain | 81.5 | 81.5 | 0 | 0↑ 0↓ |

Efficiency is unchanged: context per cut is a mean of 18k and a max of 28k on main, and a mean of 33k and a max of 57k on the chain. The marker does appear in the later chain cuts (up to 7 lines per cut), on reflected lines that used to take the next run's source. No rubric gate grades provenance, so the score does not move.

## Verdict

Kept. It is a correctness fix for source attribution, costs nothing on any track, and the suite is now green.
