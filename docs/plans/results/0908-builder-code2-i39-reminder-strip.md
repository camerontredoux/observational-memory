# I39 reminder-strip (C3): builder-code2

Variant: /home/cameron/work/mods/observational-memory/.scratch/omv-build/i39-reminder-strip (diff i39-reminder-strip.diff, 96 lines, against base3). Stacked variant: omv-build/i38-i39 (diff i38-i39.diff, against i38-wrap-dedup).

## Change
- `hooks/register.ts`: `stripReminders` runs on the raw tail a compaction hands back. It removes the `<system-reminder>` blocks from every prompt except the newest one. Each stripped prompt ends in `(system reminders omitted; <hash>)`. A prompt that is nothing but reminders stays whole. `unmask` uses the hash to restore the whole prompt from the history, so the Observer, the row hashes and the times see the prompt as it was.
- My first version restored a prompt by looking up its text with the reminders removed. That was ambiguous: a plain prompt with the same words as a reminded prompt was also "restored". The cached A/B caught it: 103 of 105 firstmate-11 Observer calls changed. The hash marker fixes this, and the A/B now makes 0 fresh calls.
- Test: `tests/register.test.ts` checks that the newest prompt keeps its reminders, that older ones are stripped and marked, that a reminder-only prompt stays whole, and that the next compaction's Observer sees the whole prompt and never the marker.

## Checks
- `claude plugin test`: 353 pass, 0 fail (I38+I39: 354 pass, 0 fail). `tsc`: only the 6 missing-fixture errors.
- Cached A/B: 0 fresh calls in every arm.

## Δ
| track | vs base3 | vs I38 (stacked) |
|---|---:|---:|
| main | 0 (firstmate-11 +0.1) | 0 |
| holdout | +0.1 | 0 |
| chain | +0.2 | 0 |
| item flips | 0 | 0 |
| main mean context per cut | 17,721 → 17,539 (−182) | 17,551 → 17,529 (−23) |

## Verdict
Rejected. Alone it saves 182 tokens per cut, but on top of I38 it saves only 23, well under the ~100-token bar. I didn't check why; the likely reason is that most of the repeated reminders sit in rows I38's wrapper dedup already trims. It stays out of base4.
