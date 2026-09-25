# I14 day-once (builder-code2)

Variant: /tmp/omv-build/i14-day-once, diff /tmp/omv-build/i14-day-once.diff (against /tmp/omv-code/fail11).

## Change
- hooks/register.ts: the observations and the all-user-messages section write a `@ YYYY-MM-DD` line once per day, before that day's first line; each line then carries only `HH:MM`, and a source range's ends drop the date when it is the line's day (`(source 23:59 to 2026-09-23 00:00)` keeps it across midnight). Corrections keep full dates (they are quoted constraints). `parseMemory` / `parseUserMessages` read the day lines back and restore full stamps, so the ledger read from a memory message is unchanged.
- hooks/prompts.ts: MEMORY_INSTRUCTIONS says dates are written once per day on an `@` line.
- tests/register.test.ts: the helpers that read rendered observations and user messages restore full stamps from the day lines; one new test (dates once per day across midnight, read back through a second compaction); the big-memory fallback test's padding grew from 6k to 8k lines since the memory is now smaller.

## Checks
- tsc: only missing-fixture errors.
- claude plugin test: 343 pass, 3 fail (the base's 3 known grouped-range failures, unchanged).
- Cached A/B: 0 fresh calls on every arm (main, holdout, chain); Observer/Reflector cache keys identical.

## Result (bench-compact ab --holdout --chain --jobs 12)
| track | A | B | Δ | flips |
|---|---:|---:|---:|---|
| main | 77.5 | 77.6 | +0.1 (tokens gate only) | 0 up / 0 down |
| holdout | 79.2 | 79.3 | +0.1 (tokens gate only) | 0 / 0 |
| chain | 75.3 | 76.6 | +1.3 (tokens +2.8, budget +1.4) | 3 up (budget size @13 @28 @30) / 0 down |

Context size: main mean 18.3k -> 17.9k per cut (-469 tokens, -2.6%), max 29.2k -> 28.6k; holdout 20k -> 19k (-1%); chain mean 35k -> 34k (-4%), max 60k -> 57k. No quality gate moved on any track.

## Verdict
Kept: deterministic, pure saving, no item lost; somewhat under E3's estimate on main (~0.5k vs ~0.6k), in line on the chain.
