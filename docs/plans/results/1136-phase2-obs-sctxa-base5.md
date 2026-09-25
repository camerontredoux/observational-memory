# I26+I27a on base5 (t9-rep1k): behavior +4.8, retention -1.4, context +1% (phase2-obs)

Run: /tmp/obs-bench2/.scratch/runs/ab-sctxa-t9.{md,json}; A t9-rep1k (= base5), B .scratch/omv-build/session-ctx-a-t9 (base5 + session-ctx-a.diff; tsc clean, plugin tests 357/0). --samples 1 --behavior, main + holdout, no chain. Finished 11:14; no rate-limit errors.

## Context vs base5
main mean 19k -> 19k (+1%), max 31k -> 31k; model tokens +3%. Holdout context +1%, model tokens +15%. Efficiency same.

## Behavior by probe type (A -> B, up/down)
| probe | A | B | up | down |
|---|---:|---:|---:|---:|
| rule | 73/90 | 74/90 | 4 | 3 |
| permission | 29/29 | 29/29 | | |
| done | 25/28 | 20/28 | 1 | 6 |
| next | 37/69 | 38/69 | 3 | 2 |
| value | 190/286 | 206/286 | 32 | 16 |
| lessons | 39/49 | 39/49 | 4 | 4 |
| file-state | 33/79 | 48/79 | 18 | 3 |
| multi-hop | 21/44 | 21/44 | 6 | 6 |
| rationale | 25/55 | 28/55 | 6 | 3 |
| purpose | 4/24 | 5/24 | 4 | 3 |
| dropped | 32/39 | 32/39 | | |
| false | 80/102 | 91/102 | 13 | 2 |
| all | 65.8% | 70.6% | 91 | 48 |
done's loss is one fact: om-v04 done:worktrees-removed goes "done" -> "not done" at cuts 5-9 (the B draw lost the worktree removal and never got it back). done:recall-merged@9 "done (v0.4.13)" graded wrong looks like a pattern artifact.

## Retention flips
- main: 78.3 -> 77.0, -1.4, inside the A' noise floor 1.9; 37 up / 99 down item x cut, 18 up / 36 down unique, p=0.020. By transcript: om-orchestration +1.2, om-v04 -1.7, firstmate-11 -3.4.
  Down: facts -9.2 (testing-backup @1-5, firstmate-11 tools @4-11, claude-json-backup @5-11), rationale -9.1, multi-hop -6.8, chronology -5.7, files-edited -4.3, absent -2.5. Up: purpose +8.3 (0 -> 2 of 24), file-state +6.3, reversals +2.7, approvals +1.9.
- holdout: 82.9 -> 83.3, +0.4; 1 up / 0 down.

## Read
The behavior gain is real in size (file-state +15, value +16, false +11) at ~1% context. But retention turns negative on base5, where on fail11 it was +1.7 / +0.9 / +2.2. The main losses are whole facts dropped by one Observer draw and never recovered, so part of it is draw noise at samples 1. Still, target9 already pays for the detail gain I27a gave on fail11, and the two overlap. Purpose, the item I26 was built for, moves by only 1-2 of 24 on both the rubric and the probe. My recommendation: not a land on this evidence. If you want to settle it, a 2nd main sample is ~87 fresh calls.
