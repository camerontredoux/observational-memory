[0m[31m[A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] om-orchestration[0m
[0m[31m[A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] om-v04[0m
[0m[31m[A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] firstmate-11[0m
[0m[31m[A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] holdout firstmate-6[0m
[0m[31m[A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] holdout crew-uspa-4[0m
[0m[31m[A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] holdout firstmate-6[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] holdout crew-uspa-4[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] holdout crew-opie-4[0m
# Against A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir): 80.7; holdout 83.1

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|
| B /tmp/omv-code/t9-rep2k (dir) | 82.2 | +1.5 | +1.9 / +1.5 / +1.9 | 22 | 0 | 4.8e-7 | exact | B | same | lessons +0.4, file-state +0.3, tokens -0.2, multi-hop +0.2 | -0.3 (0↑ 0↓) **(!)** |

WARNING: B is better on the main corpus but worse on the holdout (-0.3, 0 up, 0 down): suspect fitting to the specs.
# Compaction A/B

A: A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)
B: B /tmp/omv-code/t9-rep2k (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 54.1 | 56.0 | +1.9 | 112/207 | 116/207 | 4 |  |
| constraints | 6 | 96.2 | 99.1 | +2.8 | 102/106 | 105/106 | 3 |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 80.0 | 84.0 | +4.0 | 60/75 | 63/75 | 3 |  |
| approvals | 5 | 77.8 | 81.5 | +3.7 | 42/54 | 44/54 | 2 |  |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 100.0 | 100.0 | 0 | 51/51 | 51/51 |  |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 80.9 | 82.7 | +1.7 | 140/173 | 143/173 | 3 |  |
| decisions | 5 | 100.0 | 100.0 | 0 | 55/55 | 55/55 |  |  |
| lessons | 7 | 55.1 | 63.3 | +8.2 | 27/49 | 31/49 | 4 |  |
| file-state | 7 | 64.6 | 69.6 | +5.1 | 51/79 | 55/79 | 4 |  |
| multi-hop | 7 | 50.0 | 54.5 | +4.5 | 22/44 | 24/44 | 2 |  |
| rationale | 7 | 50.9 | 54.5 | +3.6 | 28/55 | 30/55 | 2 |  |
| chronology | 6 | 75.5 | 75.7 | +0.2 | 357/473 | 358/473 | 1 |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 75.6 | 70.2 | -5.4 | 3/25 | 2/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **80.7** | **82.2** | **+1.5** | 81.1% | 82.4% | **28** | **0** |

Per transcript: om-orchestration 83.9 → 85.7 (+1.9); om-v04 82.0 → 83.5 (+1.5); firstmate-11 77.8 → 79.6 (+1.9).
Flips: 28 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 22 up, 0 down, sign test p=4.8e-7. Passed counts are over all samples.

WARNING: B is better on the main corpus but worse on the holdout (-0.3, 0 up, 0 down): suspect fitting to the specs.

Verdict: B is better: 1.5 weighted points, 3 of 3 transcripts agree, 22 unique items flip to B against 0.
efficiency: same (B vs A: mean tokens +9%, reduction ratio +9%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 20k |
| context tokens per cut, max | 30k | 32k |
| reduction ratio (compacted / replaced), mean | 11.7% | 12.7% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (22 unique items):

- file-state om-orchestration/file:testing-guide: ↑ at @2 @3 @4
- constraints om-orchestration/rule:worktree-only: ↑ at @2 @3 @4
- facts om-orchestration/exact:rescored-results: ↑ at @4
- lessons om-orchestration/neg:tool-search: ↑ at @5
- identifiers om-v04/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @1
- approvals om-v04/scope:ctx-worktree: ↑ at @3
- facts om-v04/str:retrying-rows: ↑ at @5
- multi-hop om-v04/hop:151-messages: ↑ at @6
- reversals om-v04/sup:stall-cause: ↑ at @6
- lessons om-v04/neg:subagent-veto: ↑ at @7
- identifiers om-v04/usd:$0.04: ↑ at @8
- identifiers om-v04/number:0.04: ↑ at @8
- identifiers om-v04/number:0.06: ↑ at @8
- reversals om-v04/sup:subagent-observed: ↑ at @8 @9
- chronology firstmate-11/path:~/.codex/AGENTS.md: ↑ at @5
- file-state firstmate-11/file-learnings-16gb: ↑ at @5
- lessons firstmate-11/neg-tab-price: ↑ at @6
- facts firstmate-11/scope-prod-write: ↑ at @7
- approvals firstmate-11/line 3147: ↑ at @8
- rationale firstmate-11/why-sbom-passed: ↑ at @9 @10
- lessons firstmate-11/neg-address-split: ↑ at @11
- multi-hop firstmate-11/multi-gorman-prod-setup: ↑ at @11

## Holdout (mechanical gates only; not in the total)

A: A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir) (holdout)
B: B /tmp/omv-code/t9-rep2k (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 59.0 | 59.0 | 0 | 59/100 | 59/100 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 |  |  |
| files-edited | 5 | 86.7 | 86.7 | 0 | 13/15 | 13/15 |  |  |
| commits | 4 | 97.4 | 97.4 | 0 | 37/38 | 37/38 |  |  |
| failures | 6 | 100.0 | 100.0 | 0 | 16/16 | 16/16 |  |  |
| chronology | 6 | 59.7 | 59.7 | 0 | 43/72 | 43/72 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 71.3 | 68.2 | -3.1 | 1/14 | 1/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **83.1** | **82.8** | **-0.3** | 75.2% | 75.2% | **0** | **0** |

Per transcript: firstmate-6 82.1 → 81.7 (-0.4); crew-uspa-4 71.7 → 71.7 (0); crew-opie-4 77.9 → 77.4 (-0.4).
Flips: 0 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 0 up, 0 down, sign test p=1.0. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +4%, reduction ratio +4%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 20k | 21k |
| context tokens per cut, max | 30k | 32k |
| reduction ratio (compacted / replaced), mean | 12.5% | 13.1% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 44 (512k / 35k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 547k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (0 unique items):


## A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)

Total: **80.7**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 54.1 | 112/207 | 58.2 | 58.3 | 42.9 |
| constraints | 6 | 96.2 | 102/106 | 92.2 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 80.0 | 60/75 | 78.6 | 38.9 | 97.7 |
| approvals | 5 | 77.8 | 42/54 | 100.0 | 71.8 | 83.3 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 80.9 | 140/173 | 92.0 | 76.8 | 76.1 |
| decisions | 5 | 100.0 | 55/55 | 100.0 | 100.0 | 100.0 |
| lessons | 7 | 55.1 | 27/49 | 83.3 | 73.9 | 25.0 |
| file-state | 7 | 64.6 | 51/79 | 76.5 | 100.0 | 41.5 |
| multi-hop | 7 | 50.0 | 22/44 | 55.6 | 42.1 | 56.3 |
| rationale | 7 | 50.9 | 28/55 | 25.0 | 76.5 | 46.2 |
| chronology | 6 | 75.5 | 357/473 | 78.3 | 70.4 | 80.1 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 75.6 | 3/25 | 88.1 | 63.2 | 80.0 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **80.7** | 81.1% | 83.9 | 82.0 | 77.8 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 15k | 22k | 17k |
| context tokens per cut, max | 30k | 18k | 30k | 29k |
| reduction ratio (compacted / replaced), mean | 11.7% | 9.7% | 13.9% | 10.7% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 23 (295k / 19k) | 38 (526k / 31k) | 26 (325k / 21k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 314k | 557k | 346k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir) (holdout)

Total: **83.1**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 59.0 | 59/100 | 29.4 | 68.3 | 55.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 86.7 | 13/15 | 83.3 | 100.0 | 87.5 |
| commits | 4 | 97.4 | 37/38 | 97.4 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 59.7 | 43/72 | 75.0 | 44.1 | 72.7 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 71.3 | 1/14 | 87.8 | 69.2 | 48.4 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.1** | 75.2% | 82.1 | 71.7 | 77.9 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 15k | 21k | 26k |
| context tokens per cut, max | 30k | 20k | 26k | 30k |
| reduction ratio (compacted / replaced), mean | 12.5% | 9.5% | 13.0% | 16.7% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 16 (184k / 12k) | 16 (188k / 13k) | 12 (139k / 9.9k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 196k | 202k | 149k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/t9-rep2k (dir)

Total: **82.2**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 56.0 | 116/207 | 58.2 | 63.1 | 42.9 |
| constraints | 6 | 99.1 | 105/106 | 98.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 84.0 | 63/75 | 78.6 | 55.6 | 97.7 |
| approvals | 5 | 81.5 | 44/54 | 100.0 | 74.4 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 82.7 | 143/173 | 94.0 | 78.6 | 77.6 |
| decisions | 5 | 100.0 | 55/55 | 100.0 | 100.0 | 100.0 |
| lessons | 7 | 63.3 | 31/49 | 100.0 | 78.3 | 35.0 |
| file-state | 7 | 69.6 | 55/79 | 94.1 | 100.0 | 43.9 |
| multi-hop | 7 | 54.5 | 24/44 | 55.6 | 47.4 | 62.5 |
| rationale | 7 | 54.5 | 30/55 | 25.0 | 76.5 | 53.8 |
| chronology | 6 | 75.7 | 358/473 | 78.3 | 70.4 | 80.7 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 70.2 | 2/25 | 81.7 | 57.4 | 75.5 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **82.2** | 82.4% | 85.7 | 83.5 | 79.6 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 17k | 24k | 18k |
| context tokens per cut, max | 32k | 20k | 32k | 31k |
| reduction ratio (compacted / replaced), mean | 12.7% | 10.9% | 15.1% | 11.6% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 23 (295k / 19k) | 38 (526k / 31k) | 26 (325k / 21k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 314k | 557k | 346k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/t9-rep2k (dir) (holdout)

Total: **82.8**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 59.0 | 59/100 | 29.4 | 68.3 | 55.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 86.7 | 13/15 | 83.3 | 100.0 | 87.5 |
| commits | 4 | 97.4 | 37/38 | 97.4 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 59.7 | 43/72 | 75.0 | 44.1 | 72.7 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 68.2 | 1/14 | 83.2 | 69.2 | 44.7 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **82.8** | 75.2% | 81.7 | 71.7 | 77.4 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 21k | 16k | 21k | 27k |
| context tokens per cut, max | 32k | 22k | 26k | 32k |
| reduction ratio (compacted / replaced), mean | 13.1% | 10.3% | 13.0% | 17.4% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 16 (184k / 12k) | 16 (188k / 13k) | 12 (139k / 9.9k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 196k | 202k | 149k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

[0m[31mresults: /tmp/omv-code/abfull-t9-t9rep2k.json[0m
