# Behavior grader: joined quotes for fact-joining probes (phase2-obs). Diff for MAIN

Diff: ~/.claude/jobs/40c779b6/tmp/grader-multiquote.diff (65 lines, tests/eval/behavior.ts + tests/replay.test.ts). `git apply --check` is clean on MAIN as of 12:5x. Plugin tests in .scratch/obs-bench2 (MAIN + this diff): 347 pass / 0 fail.

## Rule
- Only multi-hop, rationale and lessons probes may join quotes. Their evidence may have up to 3 parts: `"a"; "b"`, `"a" and "b"`, `a; b`, `a … b`, or a JSON array. Each part must be at least 8 characters and verbatim in the context, after the same markdown/quote-mark stripping as today.
- Every other probe (value, path, rule, next, and so on) still needs one contiguous quote.
- `gradeAnswer(..., parts)` takes an override (1 = the old grader). The local control check uses it.

## Why it's gated by probe type
My first cut allowed `; ` joins on every probe. On the negative control, two new foreign passes appeared (session-ctx-a-t9 at om-v04@8): value/path probes answered with `"~/work/mods/observational-memory; tests/register.test.ts"`, a full path stitched from two pieces that other transcripts also contain. So a stitched value is no quote. After gating by type, foreign passes are unchanged (see below). The unit test covers both cases: the same stitched evidence fails as a value probe and passes as a multi-hop one.

## base5 before -> after (sample 2 answers, graded from cache, 0 calls)
| probe | old grader | new grader |
|---|---:|---:|
| lessons | 32/49 | 36/49 |
| multi-hop | 18/44 | 22/44 |
| rationale | 28/55 | 32/55 |
| every other type | unchanged | unchanged |
| **all** | **65.7%** | **67.0%** (+1.3) |
session-ctx-a-t9 goes 66.3% -> 67.7%.

## Negative control
Every answer whose evidence joins quotes was graded against every other transcript's contexts, with one quote and with the new rule:
- base5: 333 joined answers. Own context passes 133 -> 160. **Any foreign context passes 4 -> 4.**
- session-ctx-a-t9: 323 joined answers. Own 165 -> 195. **Foreign 1 -> 1.**
The check lives in .scratch/obs-bench2/scripts/bench-compact.ts behind OM_BEHAVIOR_CONTROL=1. It's local and not part of the diff. I can add it if you want it in MAIN.

## Note on cache keys
The reader's input includes the transcript path, and that path is under the bench dir. So behavior answers cache per checkout: a copy in another dir (my obs-bench3) misses every reader call. That's why my earlier regrade missed; I stopped it after ~20 calls. Regrades have to run from the checkout that recorded the answers.

## One claim to correct
My plan said ~30 multi-hop failures were joined quotes. Most of the joined answers are in other probe types. Multi-hop gains 4 probes (18 -> 22), not ~30.
