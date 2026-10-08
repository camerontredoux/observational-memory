[0m[31m[A /tmp/omv-code/base4 (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] om-v04[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] firstmate-11[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] long long[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] long long[0m
# Against A /tmp/omv-code/base4 (dir): 78.1; long chain 59.8, recall-aware 32.6

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | long Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---|
| B /tmp/omv-code/rep1k (dir) | 78.6 | +0.5 | -0.1 / +0.9 / +0.5 | 10 | 0 | 0.0020 | exact | B | same | lessons +0.3, identifiers +0.1, tokens -0.1, decisions +0.1 | 0 (0↑ 0↓); recall-aware 32.6 (0) |

# Compaction A/B

A: A /tmp/omv-code/base4 (dir)
B: B /tmp/omv-code/rep1k (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 48.8 | +1.4 | 98/207 | 101/207 | 3 |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 106/106 | 106/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 84.0 | 85.3 | +1.3 | 63/75 | 64/75 | 1 |  |
| approvals | 5 | 92.6 | 92.6 | 0 | 50/54 | 50/54 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 98.0 | 0 | 50/51 | 50/51 |  |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 71.7 | 72.8 | +1.2 | 124/173 | 126/173 | 2 |  |
| decisions | 5 | 92.7 | 94.5 | +1.8 | 51/55 | 52/55 | 1 |  |
| lessons | 7 | 44.9 | 51.0 | +6.1 | 22/49 | 25/49 | 3 |  |
| file-state | 7 | 58.2 | 58.2 | 0 | 46/79 | 46/79 |  |  |
| multi-hop | 7 | 36.4 | 36.4 | 0 | 16/44 | 16/44 |  |  |
| rationale | 7 | 36.4 | 36.4 | 0 | 20/55 | 20/55 |  |  |
| chronology | 6 | 72.9 | 72.9 | 0 | 345/473 | 345/473 |  |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 79.5 | 77.3 | -2.2 | 4/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.1** | **78.6** | **+0.5** | 78.4% | 78.8% | **10** | **0** |

Per transcript: om-orchestration 82.3 → 82.2 (-0.1); om-v04 78.2 → 79.1 (+0.9); firstmate-11 75.4 → 75.9 (+0.5).
Flips: 10 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 10 up, 0 down, sign test p=0.0020. Passed counts are over all samples.

Verdict: B is better: 0.5 weighted points, 2 of 3 transcripts agree, 10 unique items flip to B against 0.
efficiency: same (B vs A: mean tokens +4%, reduction ratio +4%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 17k | 18k |
| context tokens per cut, max | 28k | 29k |
| reduction ratio (compacted / replaced), mean | 11.0% | 11.4% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1226k / 63k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1290k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (10 unique items):

- lessons om-v04/neg:hook-output-refuted: ↑ at @6
- reversals om-v04/sup:stall-cause: ↑ at @6
- lessons om-v04/neg:subagent-veto: ↑ at @7
- identifiers om-v04/usd:$0.04: ↑ at @8
- identifiers om-v04/number:0.04: ↑ at @8
- identifiers om-v04/number:0.06: ↑ at @8
- lessons firstmate-11/neg-tab-price: ↑ at @6
- facts firstmate-11/scope-prod-write: ↑ at @7
- decisions firstmate-11/sbom-cause: ↑ at @9
- facts firstmate-11/exact-libheif-version: ↑ at @9

## Long chain (not in the total)

A: A /tmp/omv-code/base4 (dir) (long chain, every 5th cut)
B: B /tmp/omv-code/rep1k (dir) (long chain, every 5th cut)

A sample 1: long 331 calls, 0 fresh
B sample 1: long 331 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 44.8 | 44.8 | 0 | 95/212 | 95/212 |  |  |
| constraints | 6 | 91.4 | 91.4 | 0 | 234/256 | 234/256 |  |  |
| verbatim | 5 | 89.1 | 89.1 | 0 | 230/258 | 230/258 |  |  |
| corrections | 8 | 68.0 | 68.0 | 0 | 351/516 | 351/516 |  |  |
| reversals | 6 | 48.3 | 48.3 | 0 | 98/203 | 98/203 |  |  |
| approvals | 5 | 60.4 | 60.4 | 0 | 29/48 | 29/48 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 48/48 | 48/48 |  |  |
| in-progress | 5 | 76.0 | 76.0 | 0 | 19/25 | 19/25 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 84.4 | 84.4 | 0 | 65/77 | 65/77 |  |  |
| commits | 4 | 68.3 | 68.3 | 0 | 125/183 | 125/183 |  |  |
| failures | 6 | 60.0 | 60.0 | 0 | 6/10 | 6/10 |  |  |
| facts | 5 | 31.4 | 31.4 | 0 | 272/867 | 272/867 |  |  |
| decisions | 5 | 25.4 | 25.4 | 0 | 82/323 | 82/323 |  |  |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 52.4 | 52.4 | 0 | 258/492 | 258/492 |  |  |
| absent | 5 | 99.0 | 99.0 | 0 | 291/294 | 291/294 |  |  |
| tokens | 6 | 10.4 | 10.2 | -0.3 | 0/16 | 0/16 |  |  |
| budget | 3 | 88.4 | 88.4 | 0 | 6/16 | 6/16 |  |  |
| **total** | | **59.8** | **59.8** | **0** | 57.9% | 57.9% | **0** | **0** |

Per transcript: long 59.8 → 59.8 (0).
Flips: 0 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 0 up, 0 down, sign test p=1.0. Passed counts are over all samples.

Verdict: no difference.
efficiency: same (B vs A: mean tokens +0%, reduction ratio +1%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 43k | 43k |
| context tokens per cut, max | 68k | 68k |
| reduction ratio (compacted / replaced), mean | 28.3% | 28.4% |
| Observer calls (tokens in / out) | 325 (5259k / 209k) | 325 (5259k / 209k) |
| Reflector calls (tokens in / out) | 6 (196k / 20k) | 6 (196k / 20k) |
| model tokens in + out | 5683k | 5683k |
| critical-path calls (tokens in / out) | 114 (1878k / 67k) | 114 (1878k / 67k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (0 unique items):


Recall-aware credit (not in any total): A 32.6, B 32.6 (0)

## A /tmp/omv-code/base4 (dir)

Total: **78.1**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 98/207 | 52.2 | 46.4 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 84.0 | 63/75 | 100.0 | 50.0 | 93.0 |
| approvals | 5 | 92.6 | 50/54 | 100.0 | 89.7 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 98.0 | 50/51 | – | – | 98.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 71.7 | 124/173 | 82.0 | 76.8 | 59.7 |
| decisions | 5 | 92.7 | 51/55 | 100.0 | 95.0 | 80.0 |
| lessons | 7 | 44.9 | 22/49 | 100.0 | 47.8 | 25.0 |
| file-state | 7 | 58.2 | 46/79 | 58.8 | 57.1 | 58.5 |
| multi-hop | 7 | 36.4 | 16/44 | 33.3 | 42.1 | 31.3 |
| rationale | 7 | 36.4 | 20/55 | 8.3 | 70.6 | 26.9 |
| chronology | 6 | 72.9 | 345/473 | 77.4 | 66.0 | 78.9 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 79.5 | 4/25 | 91.1 | 69.4 | 82.6 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **78.1** | 78.4% | 82.3 | 78.2 | 75.4 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 17k | 14k | 20k | 16k |
| context tokens per cut, max | 28k | 17k | 28k | 28k |
| reduction ratio (compacted / replaced), mean | 11.0% | 9.2% | 12.8% | 10.2% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A /tmp/omv-code/base4 (dir) (long chain, every 5th cut)

Total: **59.8**

sample 1: long 331 calls, 0 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 44.8 | 95/212 | 44.8 |
| constraints | 6 | 91.4 | 234/256 | 91.4 |
| verbatim | 5 | 89.1 | 230/258 | 89.1 |
| corrections | 8 | 68.0 | 351/516 | 68.0 |
| reversals | 6 | 48.3 | 98/203 | 48.3 |
| approvals | 5 | 60.4 | 29/48 | 60.4 |
| asks | 5 | 100.0 | 48/48 | 100.0 |
| in-progress | 5 | 76.0 | 19/25 | 76.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 84.4 | 65/77 | 84.4 |
| commits | 4 | 68.3 | 125/183 | 68.3 |
| failures | 6 | 60.0 | 6/10 | 60.0 |
| facts | 5 | 31.4 | 272/867 | 31.4 |
| decisions | 5 | 25.4 | 82/323 | 25.4 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 52.4 | 258/492 | 52.4 |
| absent | 5 | 99.0 | 291/294 | 99.0 |
| tokens | 6 | 10.4 | 0/16 | 10.4 |
| budget | 3 | 88.4 | 6/16 | 88.4 |
| **total** | | **59.8** | 57.9% | 59.8 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 43k | 43k |
| context tokens per cut, max | 68k | 68k |
| reduction ratio (compacted / replaced), mean | 28.3% | 28.3% |
| Observer calls (tokens in / out) | 325 (5259k / 209k) | 325 (5259k / 209k) |
| Reflector calls (tokens in / out) | 6 (196k / 20k) | 6 (196k / 20k) |
| model tokens in + out | 5683k | 5683k |
| critical-path calls (tokens in / out) | 114 (1878k / 67k) | 114 (1878k / 67k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **32.6** — 354 of 1248 hand-authored facts held, 106 more pointed to by a source range om_recall can follow (½ each).
Reached: 4 reflections (6 Reflector calls), 325 Observer calls; constraint tier peak ~5471 tokens at cut 80; constraint-cap fallbacks at none.

## B /tmp/omv-code/rep1k (dir)

Total: **78.6**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 48.8 | 101/207 | 52.2 | 50.0 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 85.3 | 64/75 | 100.0 | 55.6 | 93.0 |
| approvals | 5 | 92.6 | 50/54 | 100.0 | 89.7 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 98.0 | 50/51 | – | – | 98.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 72.8 | 126/173 | 82.0 | 76.8 | 62.7 |
| decisions | 5 | 94.5 | 52/55 | 100.0 | 95.0 | 86.7 |
| lessons | 7 | 51.0 | 25/49 | 100.0 | 56.5 | 30.0 |
| file-state | 7 | 58.2 | 46/79 | 58.8 | 57.1 | 58.5 |
| multi-hop | 7 | 36.4 | 16/44 | 33.3 | 42.1 | 31.3 |
| rationale | 7 | 36.4 | 20/55 | 8.3 | 70.6 | 26.9 |
| chronology | 6 | 72.9 | 345/473 | 77.4 | 66.0 | 78.9 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 77.3 | 3/25 | 88.9 | 67.0 | 80.4 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **78.6** | 78.8% | 82.2 | 79.1 | 75.9 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 18k | 15k | 21k | 17k |
| context tokens per cut, max | 29k | 18k | 29k | 28k |
| reduction ratio (compacted / replaced), mean | 11.4% | 9.6% | 13.3% | 10.7% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/rep1k (dir) (long chain, every 5th cut)

Total: **59.8**

sample 1: long 331 calls, 0 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 44.8 | 95/212 | 44.8 |
| constraints | 6 | 91.4 | 234/256 | 91.4 |
| verbatim | 5 | 89.1 | 230/258 | 89.1 |
| corrections | 8 | 68.0 | 351/516 | 68.0 |
| reversals | 6 | 48.3 | 98/203 | 48.3 |
| approvals | 5 | 60.4 | 29/48 | 60.4 |
| asks | 5 | 100.0 | 48/48 | 100.0 |
| in-progress | 5 | 76.0 | 19/25 | 76.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 84.4 | 65/77 | 84.4 |
| commits | 4 | 68.3 | 125/183 | 68.3 |
| failures | 6 | 60.0 | 6/10 | 60.0 |
| facts | 5 | 31.4 | 272/867 | 31.4 |
| decisions | 5 | 25.4 | 82/323 | 25.4 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 52.4 | 258/492 | 52.4 |
| absent | 5 | 99.0 | 291/294 | 99.0 |
| tokens | 6 | 10.2 | 0/16 | 10.2 |
| budget | 3 | 88.4 | 6/16 | 88.4 |
| **total** | | **59.8** | 57.9% | 59.8 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 43k | 43k |
| context tokens per cut, max | 68k | 68k |
| reduction ratio (compacted / replaced), mean | 28.4% | 28.4% |
| Observer calls (tokens in / out) | 325 (5259k / 209k) | 325 (5259k / 209k) |
| Reflector calls (tokens in / out) | 6 (196k / 20k) | 6 (196k / 20k) |
| model tokens in + out | 5683k | 5683k |
| critical-path calls (tokens in / out) | 114 (1878k / 67k) | 114 (1878k / 67k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **32.6** — 354 of 1248 hand-authored facts held, 106 more pointed to by a source range om_recall can follow (½ each).
Reached: 4 reflections (6 Reflector calls), 325 Observer calls; constraint tier peak ~5471 tokens at cut 80; constraint-cap fallbacks at none.

[0m[31mresults: /tmp/omv-code/ablong-rep1k.json[0m
