# Negative-control fixture split per transcript; guard passes on base5; one real leak fixed (phase2-obs)

Diff for MAIN (applies clean with `git apply --check` from the main checkout): ~/.claude/jobs/40c779b6/tmp/purpose-controls.diff (240 lines). It bundles:
- purpose gate: tests/eval/rubric.ts, tests/eval/behavior.ts, tests/replay.test.ts (unit test), the three *.rubric.local.ts purpose items (unchanged from 0737/0756).
- --behavior-sample K in scripts/bench-compact.ts: the reader answers on sample K's contexts (default 1, as before).
- controls split: `controls` writes tests/fixtures/rubric-controls.local.ts (items + transcript names, 43 KB) and one rubric-controls.<name>.local.ts per transcript (lines + cuts). Largest on base5: om-v04 292 KB; total 1.17 MB, which one module could no longer hold. Each module is checked against the 1 MiB limit before anything is written. The test imports the parts listed in `names` and rebuilds the same contexts, so its meaning is unchanged. An old one-module fixture fails with "rerun controls" instead of passing vacuously.
- om-v04.hard.local.ts: `hop:made-up-answers` gets `shared: ['om-orchestration']`.

## The leak the fresh guard found
Against base5's contexts the guard failed once: om-v04/hop:made-up-answers passed om-orchestration@5. That's real, not a rubric bug: base5 quotes assistant replies (I42), and om-orchestration's own transcript reports the same Luna-notes table ("`main` (Luna notes) | 83% | 94%", plus "abstaining from inventing"). The fact is in that transcript, so `shared` is the rubric's convention for it. No purpose item passed any foreign context.

## Checks (in /tmp/obs-bench2 = MAIN's bench code + this diff)
`controls --plugin base5`: 7 modules written, all under 1 MiB. tsc clean. `claude plugin test`: 346 pass / 0 fail, with the negative control reading base5's contexts. Before the `shared` fix it was 345 / 1 (the leak above).
After applying in MAIN, rerun `bun scripts/bench-compact.ts controls --plugin .scratch/omv-code/base5` to write the new modules there.
