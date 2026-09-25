# I21 target: s2 + holdout hold; target9 keeps the gain at +6% context (phase2-obs)

## target (fail11 build) s2 + holdout vs fail11
.claude/worktrees/agent-aae8af6bc51de6810/.scratch/runs/ab-target-s2.{md,json}
- main +2.7 (77.2 -> 79.9), p=0.00013, 64 up / 27 down; +3.1 / +4.1 / +1.8 per transcript
- holdout +1.2 (27 up / 16 down)
- gates: file-state +1.2, multi-hop +0.6, rationale +0.6, tokens -0.5
- efficiency worse: mean context +17% (18k -> 21k), max 29k -> 35k. Verdict tradeoff.
- Not padding: 91 paired replies, 11.3 vs 7.4 lines per reply at the same ~27 words per line; the extra lines hold task IDs, worktree paths, commits, PR heads.

## Size screen vs base2, samples 1 (ab-target-size-s1.{md,json})
| B | total | delta | p | context mean | model tokens | efficiency | verdict |
|---|---:|---:|---:|---|---:|---|---|
| target12 (800 tok/line, ~12 per 10k) | 80.3 | +2.4 | 0.0027 | 18k -> 20k (+16%) | -2% | worse | tradeoff |
| target9 (1,100 tok/line, ~9 per 10k) | 80.4 | +2.5 | 0.0052 | 18k -> 19k (+6%) | -6% | same | B |
A' noise -1.1. target9 gates: rationale +0.7, multi-hop +0.7, lessons +0.5, approvals -0.5. Observer output tokens 63k -> 70k (target12: 84k).
The tighter number keeps all of the gain at less than half the size cost, inside the ±10% efficiency band.

## Next (running)
target9 rebuilt on base3 (.scratch/omv/target9-b3; tsc clean, plugin tests 352/0), recording s2 + holdout vs base3:
ab-target9-b3-s2.{md,json}. Sample 1 main comes from cache.
