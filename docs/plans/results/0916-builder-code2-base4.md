# base4 = base3 + I37 + I38 + I36 (I39 rejected): builder-code2

Dir: /home/cameron/work/mods/observational-memory/.scratch/omv-code/base4. Diff against base3: omv-code/base4.diff (264 lines; `hooks/recall.ts`, `hooks/register.ts`, `tests/recall.test.ts`, `tests/register.test.ts`).

## Build
- Started from omv-build/i38-wrap-dedup (base3 + I38).
- The I37 diff applied cleanly.
- I36 (`/tmp/omv-code/i36-input-mask.diff`, keep 3 calls / 500 tokens, Agent prompts never cut): 3 of 4 hunks applied. The `unmask` hunk conflicted with I38's wrapper restore, so I merged it by hand. Tool inputs are restored first, then the wrapper and result restores run as in I38. `dedupWrappers(maskTail(...))` is unchanged; I36's input cut runs inside maskTail.

## Checks
- `claude plugin test`: 355 pass, 0 fail. The I9 tail-mask tests, I38's restore test and I37's tests all pass.
- `tsc`: only the 6 missing-fixture errors.
- Cached A/B vs base3 (`--holdout --chain --jobs 12`), graded with main's updated rubric and replay (home-path normalization): 0 fresh calls in every arm.

## Δ vs base3
| track | base3 | base4 | Δ | flips |
|---|---:|---:|---:|---|
| main | 77.9 | 78.1 | +0.2 | 3 up, 0 down (I37's firstmate-11 line 5039 corrections/asks) |
| holdout | 83.3 | 83.4 | +0.1 | 0 |
| chain | 81.4 | 81.9 | +0.5 | 9 up, 0 down |

## Context size
The main mean goes from 17,721 to 17,385 tokens per cut (−336). The max is unchanged at 28.5k. The chain mean goes from 34k to 33k, and the holdout max from 30k to 29k.

The savings add up. From the same cached run against base3 (before the rubric sync; sizes don't depend on the rubric), I36 alone saves −170 per cut, I38 alone −170 and I37 costs +4. That sums to −336, which is exactly base4's figure and in line with the expected −340.

## Verdict
base4 is ready: no items lost, +0.2 main, +0.5 chain, −336 tokens per cut.
