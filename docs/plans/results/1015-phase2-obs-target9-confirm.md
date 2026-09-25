# I21 target9 holds on base3 and base4 (phase2-obs)

## target9 on base3, s2 + holdout (recorded; finished 09:27)
.claude/worktrees/agent-aae8af6bc51de6810/.scratch/runs/ab-target9-b3-s2.{md,json}. Variant: .scratch/omv/target9-b3 (base3 + target9.diff: OBSERVER_TOKENS_PER_LINE 1_100, ~9 lines per 10k chunk).
- main: 77.3 -> 79.4, +2.0, p=0.0066, 64 up / 36 down unique, 3 of 3 transcripts agree (+2.7 / +2.8 / +2.4). Verdict B.
- efficiency same: mean context +7% (18k -> 19k), max 28k -> 30k, model tokens -5%.
- gates: rationale +0.6, multi-hop +0.5, file-state +0.4, lessons +0.4.
- holdout: 83.7 -> 83.5, -0.2, inside the noise floor 0.8; 9 up / 11 down unique, p=0.82. By transcript: firstmate-6 +1.1, crew-uspa-4 -1.6, crew-opie-4 -1.4 (identifiers -1.5, commits -2.6, chronology -1.4, tokens -2.3; files-edited +6.7). Holdout efficiency better: context +3%, model tokens -16%.
With the base2 screen (+2.5, one sample) that is three independent main draws: +2.5, +2.0 and s2's pair.

## Landing check: base4 + target9, cached (0 fresh calls)
.claude/worktrees/agent-aae8af6bc51de6810/.scratch/runs/ab-target9-b4-cached.{md,json}. Variant: .scratch/omv/target9-b4 (tsc clean, plugin tests 355/0).
- main 77.6 -> 79.6, +2.0, p=0.0066, same flips as on base3; context +8%, model tokens -5%, efficiency same. Verdict B.
- holdout 83.8 -> 83.6, -0.2 (11 up / 16 down item x cut); efficiency better.
target9 grades identically on base3 and base4, so I37/I38/I36 don't interact with it.
