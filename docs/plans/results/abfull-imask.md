[0m[31m[A /tmp/omv-code/base3 (dir)] om-orchestration[0m
[0m[31m[A /tmp/omv-code/base3 (dir)] om-v04[0m
[0m[31m[A /tmp/omv-code/base3 (dir)] firstmate-11[0m
[0m[31m[A /tmp/omv-code/base3 (dir)] holdout firstmate-6[0m
[0m[31m[A /tmp/omv-code/base3 (dir)] holdout crew-uspa-4[0m
[0m[31m[A /tmp/omv-code/base3 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/imaskna60k1 (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/imaskna60k1 (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/imaskna60k1 (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/imaskna60k1 (dir)] holdout firstmate-6[0m
[0m[31m[B /tmp/omv-code/imaskna60k1 (dir)] holdout crew-uspa-4[0m
[0m[31m[A /tmp/omv-code/base3 (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
[0m[31m[B /tmp/omv-code/imaskna60k1 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/imaskna60k1 (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
[0m[31m[B /tmp/omv-code/imaskna60 (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/imaskna60 (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/imaskna60 (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/imaskna60 (dir)] holdout firstmate-6[0m
[0m[31m[B /tmp/omv-code/imaskna60 (dir)] holdout crew-uspa-4[0m
[0m[31m[B /tmp/omv-code/imaskna60 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/imaskna60 (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
# Against A /tmp/omv-code/base3 (dir): 77.9; holdout 79.3; reflection chain 81.4

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) | chain Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---:|
| B /tmp/omv-code/imaskna60k1 (dir) | 78.0 | +0.1 | +0.1 / +0.1 / +0.1 | 0 | 0 | 1.0 | exact | – | same | tokens +0.1 | -2.2 (0↑ 12↓) | +0.3 (1↑ 3↓) |
| B /tmp/omv-code/imaskna60 (dir) | 78.0 | +0.1 | +0.1 / +0.1 / +0.1 | 0 | 0 | 1.0 | exact | – | same | tokens +0.1 | -2.2 (0↑ 12↓) | +0.3 (1↑ 3↓) |

# Compaction A/B

A: A /tmp/omv-code/base3 (dir)
B: B /tmp/omv-code/imaskna60k1 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 47.3 | 0 | 98/207 | 98/207 |  |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 106/106 | 106/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 97.7 | 97.7 | 0 | 85/87 | 85/87 |  |  |
| reversals | 6 | 84.0 | 84.0 | 0 | 63/75 | 63/75 |  |  |
| approvals | 5 | 92.6 | 92.6 | 0 | 50/54 | 50/54 |  |  |
| asks | 5 | 98.6 | 98.6 | 0 | 73/74 | 73/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 98.0 | 0 | 50/51 | 50/51 |  |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 71.7 | 71.7 | 0 | 124/173 | 124/173 |  |  |
| decisions | 5 | 92.7 | 92.7 | 0 | 51/55 | 51/55 |  |  |
| lessons | 7 | 44.9 | 44.9 | 0 | 22/49 | 22/49 |  |  |
| file-state | 7 | 58.2 | 58.2 | 0 | 46/79 | 46/79 |  |  |
| multi-hop | 7 | 36.4 | 36.4 | 0 | 16/44 | 16/44 |  |  |
| rationale | 7 | 36.4 | 36.4 | 0 | 20/55 | 20/55 |  |  |
| chronology | 6 | 72.9 | 72.9 | 0 | 345/473 | 345/473 |  |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 78.4 | 81.0 | +2.6 | 4/25 | 4/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **77.9** | **78.0** | **+0.1** | 78.2% | 78.2% | **0** | **0** |

Per transcript: om-orchestration 82.3 → 82.4 (+0.1); om-v04 78.2 → 78.3 (+0.1); firstmate-11 75.0 → 75.1 (+0.1).
Flips: 0 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 0 up, 0 down, sign test p=1.0. Passed counts are over all samples.

Verdict: no verdict: the weighted score favours B (+0.1), but the unique-item flips favour neither (0 up, 0 down).
efficiency: same (B vs A: mean tokens -5%, reduction ratio -5%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 18k | 17k |
| context tokens per cut, max | 28k | 28k |
| reduction ratio (compacted / replaced), mean | 11.2% | 10.7% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1226k / 63k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1290k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (0 unique items):


## Reflection chain (not in the total)

A: A /tmp/omv-code/base3 (dir) (reflection chain)
B: B /tmp/omv-code/imaskna60k1 (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 44.0 | 0 | 118/268 | 118/268 |  |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 97.9 | 97.9 | 0 | 380/388 | 380/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 98.9 | 98.9 | 0 | 92/93 | 92/93 |  |  |
| in-progress | 5 | 73.0 | 70.3 | -2.7 | 27/37 | 26/37 |  | 1 |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 |  |  |
| commits | 4 | 99.3 | 98.6 | -0.7 | 142/143 | 141/143 |  | 1 |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.7 | 97.7 | 0 | 294/301 | 294/301 |  |  |
| chronology | 6 | 51.3 | 51.2 | -0.1 | 580/1131 | 579/1131 |  | 1 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 27.5 | 29.8 | +2.2 | 1/31 | 1/31 |  |  |
| budget | 3 | 97.3 | 97.7 | +0.4 | 23/31 | 24/31 | 1 |  |
| **total** | | **81.4** | **81.7** | **+0.3** | 79.0% | 78.9% | **1** | **3** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.4 → 81.7 (+0.3).
Flips: 1 up, 3 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 1 up, 3 down, sign test p=0.62. Passed counts are over all samples.

Verdict: no verdict: the weighted score favours B (+0.3), but the unique-item flips favour A (1 up, 3 down).
efficiency: same (B vs A: mean tokens -2%, reduction ratio -2%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 34k | 33k |
| context tokens per cut, max | 57k | 56k |
| reduction ratio (compacted / replaced), mean | 21.1% | 20.6% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (3 unique items):

- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:apps/web/.env.local: ↓ at @16
- in-progress om-v04+om-orchestration+firstmate-11+firstmate-6//tmp/pr1426b.png: ↓ at @29
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1379: ↓ at @30

Better in B (1 unique items):

- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @29

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/base3 (dir) (holdout)
B: B /tmp/omv-code/imaskna60k1 (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 58.0 | -3.0 | 61/100 | 58/100 |  | 3 |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 67.6 | 67.6 | 0 | 23/34 | 23/34 |  |  |
| in-progress | 5 | 50.0 | 39.3 | -10.7 | 14/28 | 11/28 |  | 3 |
| files-edited | 5 | 80.0 | 66.7 | -13.3 | 12/15 | 10/15 |  | 2 |
| commits | 4 | 100.0 | 100.0 | 0 | 38/38 | 38/38 |  |  |
| failures | 6 | 81.3 | 81.3 | 0 | 13/16 | 13/16 |  |  |
| chronology | 6 | 61.1 | 55.6 | -5.6 | 44/72 | 40/72 |  | 4 |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 73.1 | 79.1 | +6.1 | 2/14 | 2/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **79.3** | **77.1** | **-2.2** | 72.1% | 68.7% | **0** | **12** |

Per transcript: firstmate-6 81.3 → 81.0 (-0.3); crew-uspa-4 72.9 → 71.6 (-1.3); crew-opie-4 65.3 → 60.8 (-4.5).
Flips: 0 up, 12 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 0 up, 12 down, sign test p=0.00049. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens -9%, reduction ratio -9%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 18k |
| context tokens per cut, max | 30k | 27k |
| reduction ratio (compacted / replaced), mean | 12.2% | 11.1% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (594k / 30k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 624k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (12 unique items):

- in-progress firstmate-6//tmp/pr1426b.png: ↓ at @4
- identifiers crew-uspa-4/path:/tmp/r.new: ↓ at @2
- identifiers crew-uspa-4/path:apps/web/.env.local: ↓ at @4
- identifiers crew-uspa-4/path:smoke/.repl.pid: ↓ at @4
- chronology crew-uspa-4/path:/tmp/uspa-b-dev.log: ↓ at @4
- chronology crew-uspa-4/path:~/work/firstmate/state/uspa-multisession-smoke-rerun-b.inbox/handled: ↓ at @4
- chronology crew-uspa-4/path:apps/web/.env.local: ↓ at @4
- chronology crew-uspa-4/path:apps/web/.env: ↓ at @4
- in-progress crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.test.ts: ↓ at @3
- in-progress crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.ts: ↓ at @3
- files-edited crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.ts: ↓ at @3
- files-edited crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.test.ts: ↓ at @3

Better in B (0 unique items):


# Compaction A/B

A: A /tmp/omv-code/base3 (dir)
B: B /tmp/omv-code/imaskna60 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 47.3 | 0 | 98/207 | 98/207 |  |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 106/106 | 106/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 97.7 | 97.7 | 0 | 85/87 | 85/87 |  |  |
| reversals | 6 | 84.0 | 84.0 | 0 | 63/75 | 63/75 |  |  |
| approvals | 5 | 92.6 | 92.6 | 0 | 50/54 | 50/54 |  |  |
| asks | 5 | 98.6 | 98.6 | 0 | 73/74 | 73/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 98.0 | 0 | 50/51 | 50/51 |  |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 71.7 | 71.7 | 0 | 124/173 | 124/173 |  |  |
| decisions | 5 | 92.7 | 92.7 | 0 | 51/55 | 51/55 |  |  |
| lessons | 7 | 44.9 | 44.9 | 0 | 22/49 | 22/49 |  |  |
| file-state | 7 | 58.2 | 58.2 | 0 | 46/79 | 46/79 |  |  |
| multi-hop | 7 | 36.4 | 36.4 | 0 | 16/44 | 16/44 |  |  |
| rationale | 7 | 36.4 | 36.4 | 0 | 20/55 | 20/55 |  |  |
| chronology | 6 | 72.9 | 72.9 | 0 | 345/473 | 345/473 |  |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 78.4 | 80.6 | +2.2 | 4/25 | 4/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **77.9** | **78.0** | **+0.1** | 78.2% | 78.2% | **0** | **0** |

Per transcript: om-orchestration 82.3 → 82.4 (+0.1); om-v04 78.2 → 78.3 (+0.1); firstmate-11 75.0 → 75.1 (+0.1).
Flips: 0 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 0 up, 0 down, sign test p=1.0. Passed counts are over all samples.

Verdict: no verdict: the weighted score favours B (+0.1), but the unique-item flips favour neither (0 up, 0 down).
efficiency: same (B vs A: mean tokens -4%, reduction ratio -4%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 18k | 17k |
| context tokens per cut, max | 28k | 28k |
| reduction ratio (compacted / replaced), mean | 11.2% | 10.8% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1226k / 63k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1290k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (0 unique items):


## Reflection chain (not in the total)

A: A /tmp/omv-code/base3 (dir) (reflection chain)
B: B /tmp/omv-code/imaskna60 (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 44.0 | 0 | 118/268 | 118/268 |  |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 97.9 | 97.9 | 0 | 380/388 | 380/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 98.9 | 98.9 | 0 | 92/93 | 92/93 |  |  |
| in-progress | 5 | 73.0 | 70.3 | -2.7 | 27/37 | 26/37 |  | 1 |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 |  |  |
| commits | 4 | 99.3 | 98.6 | -0.7 | 142/143 | 141/143 |  | 1 |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.7 | 97.7 | 0 | 294/301 | 294/301 |  |  |
| chronology | 6 | 51.3 | 51.2 | -0.1 | 580/1131 | 579/1131 |  | 1 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 27.5 | 29.4 | +1.9 | 1/31 | 1/31 |  |  |
| budget | 3 | 97.3 | 97.7 | +0.4 | 23/31 | 24/31 | 1 |  |
| **total** | | **81.4** | **81.7** | **+0.3** | 79.0% | 78.9% | **1** | **3** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.4 → 81.7 (+0.3).
Flips: 1 up, 3 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 1 up, 3 down, sign test p=0.62. Passed counts are over all samples.

Verdict: no verdict: the weighted score favours B (+0.3), but the unique-item flips favour A (1 up, 3 down).
efficiency: same (B vs A: mean tokens -2%, reduction ratio -2%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 34k | 33k |
| context tokens per cut, max | 57k | 56k |
| reduction ratio (compacted / replaced), mean | 21.1% | 20.7% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (3 unique items):

- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:apps/web/.env.local: ↓ at @16
- in-progress om-v04+om-orchestration+firstmate-11+firstmate-6//tmp/pr1426b.png: ↓ at @29
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1379: ↓ at @30

Better in B (1 unique items):

- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @29

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/base3 (dir) (holdout)
B: B /tmp/omv-code/imaskna60 (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 58.0 | -3.0 | 61/100 | 58/100 |  | 3 |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 67.6 | 67.6 | 0 | 23/34 | 23/34 |  |  |
| in-progress | 5 | 50.0 | 39.3 | -10.7 | 14/28 | 11/28 |  | 3 |
| files-edited | 5 | 80.0 | 66.7 | -13.3 | 12/15 | 10/15 |  | 2 |
| commits | 4 | 100.0 | 100.0 | 0 | 38/38 | 38/38 |  |  |
| failures | 6 | 81.3 | 81.3 | 0 | 13/16 | 13/16 |  |  |
| chronology | 6 | 61.1 | 55.6 | -5.6 | 44/72 | 40/72 |  | 4 |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 73.1 | 78.9 | +5.9 | 2/14 | 2/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **79.3** | **77.1** | **-2.2** | 72.1% | 68.7% | **0** | **12** |

Per transcript: firstmate-6 81.3 → 81.0 (-0.3); crew-uspa-4 72.9 → 71.5 (-1.4); crew-opie-4 65.3 → 60.8 (-4.5).
Flips: 0 up, 12 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 0 up, 12 down, sign test p=0.00049. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens -9%, reduction ratio -9%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 18k |
| context tokens per cut, max | 30k | 27k |
| reduction ratio (compacted / replaced), mean | 12.2% | 11.1% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (594k / 30k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 624k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (12 unique items):

- in-progress firstmate-6//tmp/pr1426b.png: ↓ at @4
- identifiers crew-uspa-4/path:/tmp/r.new: ↓ at @2
- identifiers crew-uspa-4/path:apps/web/.env.local: ↓ at @4
- identifiers crew-uspa-4/path:smoke/.repl.pid: ↓ at @4
- chronology crew-uspa-4/path:/tmp/uspa-b-dev.log: ↓ at @4
- chronology crew-uspa-4/path:~/work/firstmate/state/uspa-multisession-smoke-rerun-b.inbox/handled: ↓ at @4
- chronology crew-uspa-4/path:apps/web/.env.local: ↓ at @4
- chronology crew-uspa-4/path:apps/web/.env: ↓ at @4
- in-progress crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.test.ts: ↓ at @3
- in-progress crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.ts: ↓ at @3
- files-edited crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.ts: ↓ at @3
- files-edited crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.test.ts: ↓ at @3

Better in B (0 unique items):


## A /tmp/omv-code/base3 (dir)

Total: **77.9**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 98/207 | 52.2 | 46.4 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 97.7 | 85/87 | 100.0 | 100.0 | 96.0 |
| reversals | 6 | 84.0 | 63/75 | 100.0 | 50.0 | 93.0 |
| approvals | 5 | 92.6 | 50/54 | 100.0 | 89.7 | 100.0 |
| asks | 5 | 98.6 | 73/74 | 100.0 | 100.0 | 96.9 |
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
| tokens | 6 | 78.4 | 4/25 | 90.1 | 69.0 | 80.8 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **77.9** | 78.2% | 82.3 | 78.2 | 75.0 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 18k | 15k | 21k | 17k |
| context tokens per cut, max | 28k | 17k | 28k | 28k |
| reduction ratio (compacted / replaced), mean | 11.2% | 9.4% | 12.9% | 10.6% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A /tmp/omv-code/base3 (dir) (holdout)

Total: **79.3**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 61/100 | 29.4 | 68.3 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 67.6 | 23/34 | 100.0 | 100.0 | 8.3 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 80.0 | 12/15 | 83.3 | 100.0 | 75.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 81.3 | 13/16 | 100.0 | – | 57.1 |
| chronology | 6 | 61.1 | 44/72 | 62.5 | 50.0 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 73.1 | 2/14 | 89.1 | 72.3 | 49.8 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **79.3** | 72.1% | 81.3 | 72.9 | 65.3 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 15k | 20k | 26k |
| context tokens per cut, max | 30k | 19k | 25k | 30k |
| reduction ratio (compacted / replaced), mean | 12.2% | 9.3% | 12.4% | 16.5% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A /tmp/omv-code/base3 (dir) (reflection chain)

Total: **81.4**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 118/268 | 44.0 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 97.9 | 380/388 | 97.9 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 98.9 | 92/93 | 98.9 |
| in-progress | 5 | 73.0 | 27/37 | 73.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 99.3 | 142/143 | 99.3 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 51.3 | 580/1131 | 51.3 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 27.5 | 1/31 | 27.5 |
| budget | 3 | 97.3 | 23/31 | 97.3 |
| **total** | | **81.4** | 79.0% | 81.4 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 34k | 34k |
| context tokens per cut, max | 57k | 57k |
| reduction ratio (compacted / replaced), mean | 21.1% | 21.1% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/imaskna60k1 (dir)

Total: **78.0**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 98/207 | 52.2 | 46.4 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 97.7 | 85/87 | 100.0 | 100.0 | 96.0 |
| reversals | 6 | 84.0 | 63/75 | 100.0 | 50.0 | 93.0 |
| approvals | 5 | 92.6 | 50/54 | 100.0 | 89.7 | 100.0 |
| asks | 5 | 98.6 | 73/74 | 100.0 | 100.0 | 96.9 |
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
| tokens | 6 | 81.0 | 4/25 | 93.0 | 71.8 | 83.2 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **78.0** | 78.2% | 82.4 | 78.3 | 75.1 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 17k | 14k | 20k | 16k |
| context tokens per cut, max | 28k | 16k | 28k | 28k |
| reduction ratio (compacted / replaced), mean | 10.7% | 8.8% | 12.4% | 10.1% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/imaskna60k1 (dir) (holdout)

Total: **77.1**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 58.0 | 58/100 | 29.4 | 63.5 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 67.6 | 23/34 | 100.0 | 100.0 | 8.3 |
| in-progress | 5 | 39.3 | 11/28 | 53.8 | 12.5 | 42.9 |
| files-edited | 5 | 66.7 | 10/15 | 83.3 | 100.0 | 50.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 81.3 | 13/16 | 100.0 | – | 57.1 |
| chronology | 6 | 55.6 | 40/72 | 62.5 | 38.2 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 79.1 | 2/14 | 92.1 | 82.3 | 56.6 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **77.1** | 68.7% | 81.0 | 71.6 | 60.8 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 18k | 14k | 17k | 24k |
| context tokens per cut, max | 27k | 18k | 21k | 27k |
| reduction ratio (compacted / replaced), mean | 11.1% | 8.7% | 10.5% | 15.3% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/imaskna60k1 (dir) (reflection chain)

Total: **81.7**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 118/268 | 44.0 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 97.9 | 380/388 | 97.9 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 98.9 | 92/93 | 98.9 |
| in-progress | 5 | 70.3 | 26/37 | 70.3 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 98.6 | 141/143 | 98.6 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 51.2 | 579/1131 | 51.2 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 29.8 | 1/31 | 29.8 |
| budget | 3 | 97.7 | 24/31 | 97.7 |
| **total** | | **81.7** | 78.9% | 81.7 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 33k | 33k |
| context tokens per cut, max | 56k | 56k |
| reduction ratio (compacted / replaced), mean | 20.6% | 20.6% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/imaskna60 (dir)

Total: **78.0**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 98/207 | 52.2 | 46.4 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 97.7 | 85/87 | 100.0 | 100.0 | 96.0 |
| reversals | 6 | 84.0 | 63/75 | 100.0 | 50.0 | 93.0 |
| approvals | 5 | 92.6 | 50/54 | 100.0 | 89.7 | 100.0 |
| asks | 5 | 98.6 | 73/74 | 100.0 | 100.0 | 96.9 |
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
| tokens | 6 | 80.6 | 4/25 | 92.6 | 71.1 | 82.8 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **78.0** | 78.2% | 82.4 | 78.3 | 75.1 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 17k | 14k | 20k | 16k |
| context tokens per cut, max | 28k | 16k | 28k | 28k |
| reduction ratio (compacted / replaced), mean | 10.8% | 8.9% | 12.5% | 10.2% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/imaskna60 (dir) (holdout)

Total: **77.1**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 58.0 | 58/100 | 29.4 | 63.5 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 67.6 | 23/34 | 100.0 | 100.0 | 8.3 |
| in-progress | 5 | 39.3 | 11/28 | 53.8 | 12.5 | 42.9 |
| files-edited | 5 | 66.7 | 10/15 | 83.3 | 100.0 | 50.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 81.3 | 13/16 | 100.0 | – | 57.1 |
| chronology | 6 | 55.6 | 40/72 | 62.5 | 38.2 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 78.9 | 2/14 | 92.0 | 81.7 | 56.5 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **77.1** | 68.7% | 81.0 | 71.5 | 60.8 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 18k | 14k | 17k | 24k |
| context tokens per cut, max | 27k | 18k | 21k | 27k |
| reduction ratio (compacted / replaced), mean | 11.1% | 8.7% | 10.6% | 15.3% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/imaskna60 (dir) (reflection chain)

Total: **81.7**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 118/268 | 44.0 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 97.9 | 380/388 | 97.9 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 98.9 | 92/93 | 98.9 |
| in-progress | 5 | 70.3 | 26/37 | 70.3 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 98.6 | 141/143 | 98.6 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 51.2 | 579/1131 | 51.2 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 29.4 | 1/31 | 29.4 |
| budget | 3 | 97.7 | 24/31 | 97.7 |
| **total** | | **81.7** | 78.9% | 81.7 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 33k | 33k |
| context tokens per cut, max | 56k | 56k |
| reduction ratio (compacted / replaced), mean | 20.7% | 20.7% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

[0m[31mresults: /tmp/omv-code/abfull-imask.json[0m
