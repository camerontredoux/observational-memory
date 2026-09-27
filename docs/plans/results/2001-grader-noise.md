# Behavior grader fixes, reader noise floor, and regrades of memory-guide and session8

## Grader fixes (tests/eval/behavior.ts, no reader cache change)

- **False-claim probes:** a denial such as "None; nothing was pushed to GitHub" failed, because the absent pattern matched the answer. The pattern is now tested only on clauses that don't deny.
- **Unparsable replies:** the reader sometimes writes joined quotes as `"a"; "b"` unescaped inside the JSON evidence string, which blanked every answer at that cut. 29 of 1,954 cached replies were affected. `parse()` now reads such a reply answer by answer and escapes the evidence's bare quotes: 1,194 of their 1,201 answers are recovered.
- **Order items (`ord:`, `order:`):** graded as value probes with one quote, but the question needs two events. They now take up to three quote parts, like multi-hop. `"a" / "b"` also counts as a join.
- Tests: 3 new cases in `tests/replay.test.ts`.

## Reader noise floor

- New flag `--b-reader-sample K` (ab): B's reader answers are cached apart, so B = A gives fresh reader draws on identical contexts.
- HEAD vs HEAD, fixed grader: sample 1 **+0.2**, sample 2 **+2.4** (76.1 → 76.3, 76.1 → 78.5).
- Per type, the same contexts move up to next +8, lessons +6, multi-hop +5, file-state +4. value moved 0 and −1.
- So a behavior Δ inside about ±2.5 on one sample is reader noise.

## Regrades from cache (0 calls), fixed grader

| Comparison | Sample 1 | Sample 2 | Reading |
|---|---:|---:|---|
| Noise: HEAD vs HEAD | +0.2 | +2.4 | the floor |
| memory-guide B2 vs HEAD | +0.4 | −0.4 | inside noise |
| session8 vs base8 | −1.0 | −3.5 | sample 2 past the floor |

- **memory-guide B2:** the old grader's −1.7 on sample 2 was mostly the bugs above. `value` is still −3 and −5, against 0 and −1 in the noise runs. The flips are mostly 2/3 → 1/3 majority votes, and evidence-format misses, not wrong values. Landed in the working tree as v1.4.2 (instructions 1,058 → 579 tokens).
- **session8:** still rejected. Purpose +10 and +6, but value −5/−14, file-state −1/−24, multi-hop −7/+1. The separate-writer test (sessw) settles whether the line or the new Observer draws cause this.

Reports: `.scratch/regrade/v2-*.md`.
