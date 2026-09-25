# I31 working-set: rejected (no change in quality, +1k tokens per cut)

Variant: `/tmp/omv-build/i31-workset/`. Diff: `/tmp/omv-build/i31-workset.diff`, against the current base `/tmp/omv-code/fail11` (I3 grp + I9 mask3-250 + I10 open-failures).

## What changed

- `hooks/vcc.ts`: `workingSet(rows, prev)` builds, with no model, the files the session read or edited (last read/edit time for each) and the last run of each test or typecheck command (passed/failed, time). Reads come from Read and from read-only Bash (`cat`, `sed -n`, `head`, `tail`, `rg` on files). Edits come from Edit/Write and Bash writes, with redirect tokens filtered out. Plus `renderWorkingSet`/`parseWorkingSet`, capped by count.
- `hooks/register.ts`: at compaction it carries the working set forward from the previous continuation, merges in the new rows, stats each file to mark `changed on disk since`, and renders `Files and test runs seen in this session, found by code: om_recall returns the last read of a file not changed since:` after the environment block.
- Tests: a working-set case in `tests/vcc.test.ts` (latest read/edit, test results, parse round-trip, caps, changed-on-disk). `tests/register.test.ts` helpers now strip the new section before comparing continuations and environments.
- Test runs no longer carry pass counts. An older run's `Ran 214 tests` read as the suite's count now, and that cost two `sup:test-count` reversals in om-orchestration (the first full run came out 77.4, -0.2).

## Measurements vs fail11 (cached, `--jobs 12`, no fresh Observer calls)

| track | A | B | Δ | flips |
|---|---|---|---|---|
| main | 77.5 | 77.5 | 0 (om-orchestration -0.1) | 0↑ 0↓, p=1.0 |
| holdout | 79.2 | 79.1 | -0.1 | 0↑ 0↓ |
| chain | 75.3 | 75.0 | -0.3 | 0↑ 0↓ |

Efficiency counts as "same". Mean context per cut goes 18k→19k on main, 20k→20k on holdout and 35k→36k on the chain, with max +1k on each track. The small negative Δs come from size-weighted gates, not from any item flipping.

Motivation measured on the replay fixtures: 92 unchanged rereads after 39 cuts, across 6 transcripts. The rubric has no gate for rereads or file awareness, so the benchmark cannot credit the list. Whether it cuts rereads would take a live or behavior run, and that means model calls.

## Checks

- `bunx -p typescript tsc -p .`: 6 errors in 3 files, all missing fixture modules (same as the base).
- `claude plugin test`: 344 pass, 3 fail. These are the base's 3 known `register.test.ts` failures (background timing, corrections, budget/source ranges).

## Verdict: rejected

It is neutral on every graded track and costs about 1k tokens per cut. The list also fills with incidental paths (rtk tee logs, workflow scripts), and test counts had to come out because they go stale. It could come back if a behavior probe for "re-read vs recall" is added, since that is the one thing it is built to help.
