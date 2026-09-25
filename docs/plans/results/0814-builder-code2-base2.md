# base2 = fail11 + I14 day-once + I15 user-dedup (builder-code2)

Dir: /home/cameron/work/mods/observational-memory/.scratch/omv-code/base2 (real dir). Diff: .scratch/omv-code/base2.diff (against fail11; hooks/prompts.ts, hooks/register.ts, tests/register.test.ts). base.txt not touched. I31 was rejected, so it is not in.

## Stacking
I14 applied cleanly. For I15, one hunk (renderUserMessages/parseUserMessages) conflicted with I14's day-once headers, so I merged it by hand: the day-once header plus the "quoted in the corrections above" marker, and one parser regex with both the `@ day` line and the marker. The I15 unit test now expects day-once headers.

## Checks
- tsc: only missing-fixture errors.
- claude plugin test: 344 pass, 3 fail (the base's 3 known grouped-range failures).
- Cached A/B vs fail11 (--holdout --chain --jobs 12): 0 fresh calls on every arm.

## Result: the sum of the two, no losses
| track | fail11 | base2 | Δ | I14 + I15 alone |
|---|---:|---:|---:|---:|
| main | 77.5 | 77.9 | +0.4 (reversals +6.7, tokens +2.1) | +0.1 + 0.3 |
| holdout | 79.2 | 79.3 | +0.1 | +0.1 + 0 |
| chain | 75.3 | 81.5 | +6.2 (reversals +76.9, tokens +3.7, budget +1.7) | +1.3 + 4.9 |

Flips: main 5 up / 0 down (reversals firstmate-11/line-items @7-@11); chain 14 up / 0 down (line-items @22-@31, budget size @13 @17 @28 @30). Context size: main 18.32k -> 17.72k per cut (-600 tokens, -3.3%), max 29.2k -> 28.5k; holdout -1%; chain mean 35k -> 33k (-5%), max 60k -> 57k.

## The I15 caveat, checked in the rendered contexts: my guess was wrong, and the gain is a grading artifact
I read firstmate-11 compaction-8, -10 and -11, base2 (run fc68c77bb1) against fail11 (run b8684f97b4).
- There is no "replaces" clause here. The corrections hold both constraints as separate 🔴 lines: 15:02 `User: "Jus trealized it was line items 004.2 and 004.3"` and 15:04 `User: "no its 001.41"`.
- fail11: all-user-messages repeats both, stale first, then `no its 001.41`. So the context already ends on the new form.
- base2: the stale 47-char message becomes `* User @ 15:02 (47 chars): quoted in the corrections above`. `no its 001.41` stays whole because it is no longer than the marker.
- Why the gate flips: reversals reads the prose context (rubric.ts proseOnly, which needs at least 5 prose words per line). `no its 001.41`, as a message and as a correction line, has too few prose words and is dropped. In fail11, the last prose mention of 004.2 is the repeated stale user message, which comes after every prose 001.41 (the observations) -> fail. In base2, the last 004.2 is observation 15:17 ("ignoring unrelated 004.2 rows") and the last 001.41 is observation 15:31 -> pass.
- So fail11's context was already right: its last word on the subject is the new form. The +6.7 main / +76.9 chain reversals gain comes from the prose filter ignoring a short reversal, not from better memory. I15's real value is just its small token saving (-131 per cut on main). A possible rubric fix: in the reversals check, let a short user message or correction count as the new form. That is the rubric owner's call.
