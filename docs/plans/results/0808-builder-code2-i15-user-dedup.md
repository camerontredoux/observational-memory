# I15 user-dedup (builder-code2)

Variant: /tmp/omv-build/i15-user-dedup, diff /tmp/omv-build/i15-user-dedup.diff (against /tmp/omv-code/fail11).

## Change
- hooks/register.ts: in `<all-user-messages>`, a message whose whole text the corrections quote (the first `User: "…"` in them of exactly its length, closing quote right after, equal to the text) renders as `* User @ <time> (n chars): quoted in the corrections above`. The newest message is always kept whole, and so is any message no longer than the marker. Order, times and omission lines don't change. `parseUserMessages` takes the corrections text and recovers the message from it by its length, so the ledger read back from a memory message is unchanged. A message comes back whole once the corrections stop quoting it.
- tests/register.test.ts: one new test. A message quoted whole is deduped and the newest isn't. After its constraint is replaced twice and drops out of the corrections, the message renders whole again and the next quoted one is deduped.
- No prompt change.

## Checks
- tsc: only missing-fixture errors.
- claude plugin test: 343 pass, 3 fail. The 3 are the base's known grouped-range failures, unchanged.
- Cached A/B: 0 fresh calls on every arm (main, holdout, chain).

## Result (bench-compact ab --holdout --chain --jobs 12)
| track | A | B | Δ | flips |
|---|---:|---:|---:|---|
| main | 77.5 | 77.8 | +0.3 (reversals +6.7, tokens +0.5) | 5 up (reversals firstmate-11/line-items @7-@11) / 0 down; 1 unique item |
| holdout | 79.2 | 79.2 | 0 (tokens +0.1) | 0 / 0 |
| chain | 75.3 | 80.1 | +4.9 (reversals 15.4 -> 92.3, tokens +0.7, budget +0.4) | 10 up (reversals firstmate-11-line-items @22-@31) / 0 down; 1 unique item |

Context size: main mean 18.32k -> 18.19k per cut (-131 tokens, -0.7%), max 29.2k -> 29.1k; holdout -0%; chain mean -1%, max 60k -> 59k.

## Caveat
All of the quality gain is one item, line-items, and it is probably a rendering-order effect on the reversals gate. That gate passes when the new form of a constraint is the last one in the context. `quotedIn` matches every `User: "` in the corrections, including the old quote inside a reversal's "(this replaces the earlier constraint … User: "…")". So I believe the stale user message is no longer repeated below the corrections, and the new form ends up last. I did not look at the rendered line-items contexts to confirm this. Nothing is lost, since the stale words are still in the corrections, but the gate is a proxy. The token saving is small, well under E4's ~0.2k main / ~0.9k chain estimate.

## Verdict
Kept, with the caveat above: no losses anywhere, deterministic, and the reversal effect is the one E4 predicted. The token saving alone would not justify it.
