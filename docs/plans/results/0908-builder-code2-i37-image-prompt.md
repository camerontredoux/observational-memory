# I37 image-prompt (C1): builder-code2

Variant: /home/cameron/work/mods/observational-memory/.scratch/omv-build/i37-image-prompt (diff i37-image-prompt.diff alongside, 106 lines, against base3).

## Change
- `hooks/register.ts`, `hooks/recall.ts`: a prompt that starts with `[Image #N]` (or holds the pasted-image markers) is a real prompt again. It is quoted and rendered with its marker. A note that is nothing but image markers is still left out.
- Tests: `tests/register.test.ts` and `tests/recall.test.ts` cover a prompt after a pasted image and an image-only note.

## Checks
- `claude plugin test`: 354 pass, 0 fail. `tsc`: only the 6 missing-fixture errors.
- Cached A/B vs base3 (`--holdout --chain --jobs 12`): 0 fresh calls in every arm, and B's Observer/Reflector cache keys match A's.

## Δ vs base3
| track | A | B | Δ | flips |
|---|---:|---:|---:|---|
| main | 77.9 | 78.1 | +0.2 | 3 up, 0 down (corrections firstmate-11/line 5039 @10 @11, asks line 5039 @10) |
| holdout | 79.3 | 79.3 | 0 | 0 |
| chain | 81.4 | 81.6 | +0.2 | 9 up, 0 down (corrections 8, asks 1) |

firstmate-11 goes from 75.0 to 75.3. Line 5039 is the Gorman follow-up request that base3 lost.

## Context size
Main mean goes from 17,721 to 17,725 tokens per cut (+4). The max is unchanged at 28.5k and the chain is unchanged.

## Verdict
Kept. It fixes a real bug: a prompt that started with a pasted image was dropped from the quoted messages.
