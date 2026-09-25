# I30 remind (builder-code)

Base: /tmp/omv-code/fail11 (grp + mask3-250 + I10). Variant: /tmp/omv-build/i30-remind, diff /tmp/omv-build/i30-remind.diff (hooks/register.ts, hooks/vcc.ts, tests/vcc.test.ts).

## What changed
- `vcc.ts`: `reminders(cold, work, context)` pulls at most 5 (`REMIND_MAX`) lines of the out-of-context history. A line qualifies when it shares 2 or more "names" with the work: paths, files, flags, snake_case, camelCase, CONSTANTS, or words with digits. The work is the ledger's Active + Next steps plus the raw tail's text and tool inputs. Lines already in the compacted context are skipped, the rest are ranked by the IDF of the shared names, and the kept lines are shown in time order. If no line qualifies, it returns nothing. `renderReminder` gives `- YYYY-MM-DD HH:MM Who: text` (each line up to 300 chars).
- `register.ts`: at compaction, the cold history is `rows.slice(0, offset)`. That covers older memory messages' observation lines (Observed), typed prompts (User) and assistant text (Assistant). The reminders go into the continuation record as a new "Earlier in this session, out of context now..." section after open failures. `parseFailures`'s section end knows about the new section. No model calls.
- Unit test in tests/vcc.test.ts: the cap, rarest names first, time order, lines already in context skipped, nothing when no names are shared.

## Checks
- tsc: only the missing-fixture errors.
- `claude plugin test`: 343 pass, 3 fail (the 3 known grp failures in register.test.ts).

## Δ vs base (cached, 0 fresh calls, deterministic)
- main: 77.5 → 77.6 (+0.1). Per transcript +0.3 / -0.1 / +0.1. 3↑ 1↓ unique, p=0.62. Bench verdict "B is better", not significant.
  - ↑ file-state om-orchestration/file:scenarios-fix @5
  - ↑ reversals om-v04/sup:skill-stub-wording @7
  - ↑ file-state firstmate-11/file-gorman-pdf-script @5
  - ↓ reversals om-v04/sup:main-tests @9: a reminder brought back an old "82 tests" line, which the grader counts as stale (current is 101).
- holdout: 79.2 → 79.2 (0), 0 flips.
- chain: 75.3 → 75.2 (-0.1), 0 flips. The chain harness passes only the chained context as history (offset 0, no cold rows), so I30 never fires there. The chain can't test this idea.
- efficiency: main context +1% (18k → 19k mean, max 29k → 30k), holdout +0%, model tokens 0.

## Variant tried and dropped
- i30b: a line had to share a name with Active/Next steps and also one with the tail. main -0.1 (0↑ 2↓: sup:test-count-3 and ord:6-after-5 at om-orchestration @4). Worse, so dropped.

## Verdict: rejected (marginal)
The gain is within noise (+0.1, p=0.62). The lines the code picks are often weak matches, e.g. "Compaction triggers at your `autoCompactWindow` (190k)". Pulling old lines by identifier also brings back superseded values (the stale test count). That is the reversal risk the plan names, and the only loss comes from it. The recall cue already lets the model fetch these lines when it needs them. The diff stays available if a long-chain track that has cold history (B1) wants to re-test it.
