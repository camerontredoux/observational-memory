[0m[31m[A /tmp/omv-code/base4 (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] om-orchestration[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] om-v04[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] firstmate-11[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout firstmate-6[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout crew-uspa-4[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] holdout firstmate-6[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] holdout crew-uspa-4[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] holdout crew-opie-4[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
[0m[31m[B /tmp/omv-code/rep1k (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
# Against A /tmp/omv-code/base4 (dir): 78.1; holdout 83.4; reflection chain 81.9

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) | chain Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---:|
| B /tmp/omv-code/rep1k (dir) | 78.6 | +0.5 | -0.1 / +0.9 / +0.5 | 10 | 0 | 0.0020 | exact | B | same | lessons +0.3, identifiers +0.1, tokens -0.1, decisions +0.1 | 0 (1↑ 0↓) | +0.1 (5↑ 0↓) B |

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

## Reflection chain (not in the total)

A: A /tmp/omv-code/base4 (dir) (reflection chain)
B: B /tmp/omv-code/rep1k (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 45.9 | +1.9 | 118/268 | 123/268 | 5 |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 388/388 | 388/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 93/93 | 93/93 |  |  |
| in-progress | 5 | 73.0 | 73.0 | 0 | 27/37 | 27/37 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 |  |  |
| commits | 4 | 99.3 | 99.3 | 0 | 142/143 | 142/143 |  |  |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.7 | 97.7 | 0 | 294/301 | 294/301 |  |  |
| chronology | 6 | 51.3 | 51.3 | 0 | 580/1131 | 580/1131 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 28.5 | 27.4 | -1.1 | 1/31 | 1/31 |  |  |
| budget | 3 | 97.5 | 97.5 | 0 | 23/31 | 23/31 |  |  |
| **total** | | **81.9** | **82.0** | **+0.1** | 79.2% | 79.4% | **5** | **0** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.9 → 82.0 (+0.1).
Flips: 5 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 5 up, 0 down, sign test p=0.063. Passed counts are over all samples.

Verdict: B is better: 0.1 weighted points, 1 of 1 transcripts agree, 5 unique items flip to B against 0 (not significant by the sign test).
efficiency: same (B vs A: mean tokens +1%, reduction ratio +1%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 33k | 33k |
| context tokens per cut, max | 57k | 57k |
| reduction ratio (compacted / replaced), mean | 20.9% | 21.1% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (5 unique items):

- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.06: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#5: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#6: ↑ at @11

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/base4 (dir) (holdout)
B: B /tmp/omv-code/rep1k (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 61.0 | 0 | 61/100 | 61/100 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 |  |  |
| files-edited | 5 | 80.0 | 80.0 | 0 | 12/15 | 12/15 |  |  |
| commits | 4 | 100.0 | 100.0 | 0 | 38/38 | 38/38 |  |  |
| failures | 6 | 100.0 | 100.0 | 0 | 16/16 | 16/16 |  |  |
| chronology | 6 | 61.1 | 62.5 | +1.4 | 44/72 | 45/72 | 1 |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 74.3 | 72.5 | -1.8 | 2/14 | 2/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **83.4** | **83.4** | **0** | 76.1% | 76.4% | **1** | **0** |

Per transcript: firstmate-6 81.4 → 81.8 (+0.3); crew-uspa-4 72.9 → 72.9 (0); crew-opie-4 79.5 → 79.2 (-0.3).
Flips: 1 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 1 up, 0 down, sign test p=1.0. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +3%, reduction ratio +3%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 19k |
| context tokens per cut, max | 29k | 30k |
| reduction ratio (compacted / replaced), mean | 12.0% | 12.3% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (594k / 30k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 624k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (1 unique items):

- chronology firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @3

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

## A /tmp/omv-code/base4 (dir) (holdout)

Total: **83.4**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 61/100 | 29.4 | 68.3 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 80.0 | 12/15 | 83.3 | 100.0 | 75.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 61.1 | 44/72 | 62.5 | 50.0 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 74.3 | 2/14 | 90.8 | 72.4 | 51.3 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.4** | 76.1% | 81.4 | 72.9 | 79.5 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 14k | 20k | 26k |
| context tokens per cut, max | 29k | 19k | 25k | 29k |
| reduction ratio (compacted / replaced), mean | 12.0% | 8.9% | 12.4% | 16.2% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A /tmp/omv-code/base4 (dir) (reflection chain)

Total: **81.9**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 118/268 | 44.0 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 73.0 | 27/37 | 73.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 99.3 | 142/143 | 99.3 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 51.3 | 580/1131 | 51.3 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 28.5 | 1/31 | 28.5 |
| budget | 3 | 97.5 | 23/31 | 97.5 |
| **total** | | **81.9** | 79.2% | 81.9 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 33k | 33k |
| context tokens per cut, max | 57k | 57k |
| reduction ratio (compacted / replaced), mean | 20.9% | 20.9% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

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

## B /tmp/omv-code/rep1k (dir) (holdout)

Total: **83.4**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 61/100 | 29.4 | 68.3 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 80.0 | 12/15 | 83.3 | 100.0 | 75.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 62.5 | 45/72 | 68.8 | 50.0 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 72.5 | 2/14 | 88.3 | 72.4 | 48.7 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.4** | 76.4% | 81.8 | 72.9 | 79.2 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 15k | 20k | 26k |
| context tokens per cut, max | 30k | 19k | 25k | 30k |
| reduction ratio (compacted / replaced), mean | 12.3% | 9.4% | 12.4% | 16.6% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/rep1k (dir) (reflection chain)

Total: **82.0**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 45.9 | 123/268 | 45.9 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 73.0 | 27/37 | 73.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 99.3 | 142/143 | 99.3 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 51.3 | 580/1131 | 51.3 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 27.4 | 1/31 | 27.4 |
| budget | 3 | 97.5 | 23/31 | 97.5 |
| **total** | | **82.0** | 79.4% | 82.0 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 33k | 33k |
| context tokens per cut, max | 57k | 57k |
| reduction ratio (compacted / replaced), mean | 21.1% | 21.1% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

[0m[31mresults: /tmp/omv-code/abfull-rep1k.json[0m
