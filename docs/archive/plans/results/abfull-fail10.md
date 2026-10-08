[0m[31m[A /tmp/omv-code/mask3-250 (dir)] om-orchestration[0m
[0m[31m[A /tmp/omv-code/mask3-250 (dir)] om-v04[0m
[0m[31m[A /tmp/omv-code/mask3-250 (dir)] firstmate-11[0m
[0m[31m[A /tmp/omv-code/mask3-250 (dir)] holdout firstmate-6[0m
[0m[31m[A /tmp/omv-code/mask3-250 (dir)] holdout crew-uspa-4[0m
[0m[31m[A /tmp/omv-code/mask3-250 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/fail10 (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/fail10 (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/fail10 (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/fail10 (dir)] holdout firstmate-6[0m
[0m[31m[A /tmp/omv-code/mask3-250 (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
[0m[31m[B /tmp/omv-code/fail10 (dir)] holdout crew-uspa-4[0m
[0m[31m[B /tmp/omv-code/fail10 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/fail10 (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
# Against A /tmp/omv-code/mask3-250 (dir): 75.1; holdout 74.1; reflection chain 71.3

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) | chain Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---:|
| B /tmp/omv-code/fail10 (dir) | 77.4 | +2.3 | +4.5 / +0.1 / +2.8 | 12 | 0 | 0.00049 | exact | B | same | failures +2.2, chronology +0.1 | +5.1 (11↑ 0↓) | +3.9 (29↑ 0↓) B |

# Compaction A/B

A: A /tmp/omv-code/mask3-250 (dir)
B: B /tmp/omv-code/fail10 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 46.9 | 47.3 | +0.5 | 97/207 | 98/207 | 1 |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 106/106 | 106/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 97.7 | 97.7 | 0 | 85/87 | 85/87 |  |  |
| reversals | 6 | 77.3 | 77.3 | 0 | 58/75 | 58/75 |  |  |
| approvals | 5 | 92.6 | 92.6 | 0 | 50/54 | 50/54 |  |  |
| asks | 5 | 98.6 | 98.6 | 0 | 73/74 | 73/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 98.0 | 0 | 50/51 | 50/51 |  |  |
| failures | 6 | 36.4 | 86.4 | +50.0 | 8/22 | 19/22 | 11 |  |
| facts | 5 | 71.7 | 71.7 | 0 | 124/173 | 124/173 |  |  |
| decisions | 5 | 92.7 | 92.7 | 0 | 51/55 | 51/55 |  |  |
| lessons | 7 | 44.9 | 44.9 | 0 | 22/49 | 22/49 |  |  |
| file-state | 7 | 58.2 | 58.2 | 0 | 46/79 | 46/79 |  |  |
| multi-hop | 7 | 36.4 | 36.4 | 0 | 16/44 | 16/44 |  |  |
| rationale | 7 | 36.4 | 36.4 | 0 | 20/55 | 20/55 |  |  |
| chronology | 6 | 68.7 | 71.0 | +2.3 | 325/473 | 336/473 | 11 |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 77.1 | 76.4 | -0.8 | 3/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **75.1** | **77.4** | **+2.3** | 76.4% | 77.5% | **23** | **0** |

Per transcript: om-orchestration 77.7 → 82.2 (+4.5); om-v04 78.0 → 78.0 (+0.1); firstmate-11 71.4 → 74.2 (+2.8).
Flips: 23 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 12 up, 0 down, sign test p=0.00049. Passed counts are over all samples.

Verdict: B is better: 2.3 weighted points, 3 of 3 transcripts agree, 12 unique items flip to B against 0.
efficiency: same (B vs A: mean tokens +1%, reduction ratio +1%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 18k | 18k |
| context tokens per cut, max | 29k | 29k |
| reduction ratio (compacted / replaced), mean | 11.4% | 11.6% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1226k / 63k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1290k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (12 unique items):

- failures om-orchestration/line 1105: ↑ at @2 @3 @4
- identifiers om-v04/path:.claude-plugin/plugin.json: ↑ at @8
- chronology om-v04/path:.claude-plugin/plugin.json: ↑ at @8
- failures firstmate-11/line 116: ↑ at @2 @3
- chronology firstmate-11/path:main...origin/main: ↑ at @3 @4 @5 @6 @7 @8 @9 @10 @11
- failures firstmate-11/line 1037: ↑ at @5
- failures firstmate-11/line 1658: ↑ at @6
- failures firstmate-11/line 1813: ↑ at @7
- failures firstmate-11/line 3044: ↑ at @9
- failures firstmate-11/line 3599: ↑ at @10
- failures firstmate-11/line 4201: ↑ at @11
- chronology firstmate-11/path:bin/fm-crew-state.sh: ↑ at @11

## Reflection chain (not in the total)

A: A /tmp/omv-code/mask3-250 (dir) (reflection chain)
B: B /tmp/omv-code/fail10 (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 43.3 | 44.0 | +0.7 | 116/268 | 118/268 | 2 |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 97.9 | 97.9 | 0 | 380/388 | 380/388 |  |  |
| reversals | 6 | 15.4 | 15.4 | 0 | 2/13 | 2/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 98.9 | 98.9 | 0 | 92/93 | 92/93 |  |  |
| in-progress | 5 | 70.3 | 73.0 | +2.7 | 26/37 | 27/37 | 1 |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 90.6 | 95.3 | +4.7 | 58/64 | 61/64 | 3 |  |
| commits | 4 | 99.3 | 99.3 | 0 | 142/143 | 142/143 |  |  |
| failures | 6 | 25.7 | 91.4 | +65.7 | 9/35 | 32/35 | 23 |  |
| facts | 5 | 97.7 | 97.7 | 0 | 294/301 | 294/301 |  |  |
| chronology | 6 | 50.2 | 50.2 | 0 | 568/1131 | 568/1131 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 25.0 | 24.2 | -0.8 | 1/31 | 1/31 |  |  |
| budget | 3 | 96.0 | 95.7 | -0.4 | 19/31 | 19/31 |  |  |
| **total** | | **71.3** | **75.3** | **+3.9** | 77.4% | 78.2% | **29** | **0** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 71.3 → 75.3 (+3.9).
Flips: 29 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 18 up, 0 down, sign test p=0.0000076. Passed counts are over all samples.

Verdict: B is better: 3.9 weighted points, 1 of 1 transcripts agree, 18 unique items flip to B against 0.
efficiency: same (B vs A: mean tokens +1%, reduction ratio +1%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 35k | 35k |
| context tokens per cut, max | 59k | 60k |
| reduction ratio (compacted / replaced), mean | 22.0% | 22.2% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (18 unique items):

- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 2084: ↑ at @4 @6
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 3438: ↑ at @7 @8
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 4349: ↑ at @9 @10
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 7297: ↑ at @11 @12 @13
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 11867: ↑ at @16 @17
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 12788: ↑ at @19
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 13409: ↑ at @20
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 13564: ↑ at @21
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 14795: ↑ at @23
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 15350: ↑ at @24
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/firstmate/bin/fm-peek.sh: ↑ at @25
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 15952: ↑ at @25
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/firstmate/data/projects.md: ↑ at @26
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 17383: ↑ at @26 @28
- in-progress om-v04+om-orchestration+firstmate-11+firstmate-6//tmp/parse_q.py: ↑ at @29
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6//tmp/parse_q.py: ↑ at @29 @30 @31
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 19306: ↑ at @29 @30
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 19742: ↑ at @30 @31

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/mask3-250 (dir) (holdout)
B: B /tmp/omv-code/fail10 (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 60.0 | 61.0 | +1.0 | 60/100 | 61/100 | 1 |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 67.6 | 67.6 | 0 | 23/34 | 23/34 |  |  |
| in-progress | 5 | 46.4 | 50.0 | +3.6 | 13/28 | 14/28 | 1 |  |
| files-edited | 5 | 60.0 | 80.0 | +20.0 | 9/15 | 12/15 | 3 |  |
| commits | 4 | 100.0 | 100.0 | 0 | 38/38 | 38/38 |  |  |
| failures | 6 | 43.8 | 81.3 | +37.5 | 7/16 | 13/16 | 6 |  |
| chronology | 6 | 61.1 | 61.1 | 0 | 44/72 | 44/72 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 73.1 | 72.2 | -0.9 | 2/14 | 2/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **74.1** | **79.2** | **+5.1** | 68.9% | 72.1% | **11** | **0** |

Per transcript: firstmate-6 71.2 → 81.2 (+10.0); crew-uspa-4 72.5 → 72.8 (+0.3); crew-opie-4 65.3 → 65.2 (-0.1).
Flips: 11 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 6 up, 0 down, sign test p=0.031. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +1%, reduction ratio +1%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 20k |
| context tokens per cut, max | 30k | 30k |
| reduction ratio (compacted / replaced), mean | 12.2% | 12.4% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (594k / 30k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 624k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (6 unique items):

- failures firstmate-6/line 85: ↑ at @1 @3
- in-progress firstmate-6//tmp/parse_q.py: ↑ at @4
- files-edited firstmate-6//tmp/parse_q.py: ↑ at @4 @5 @6
- failures firstmate-6/line 1838: ↑ at @4 @5
- failures firstmate-6/line 2274: ↑ at @5 @6
- identifiers crew-uspa-4/const:FETCH_HEAD: ↑ at @3

## A /tmp/omv-code/mask3-250 (dir)

Total: **75.1**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 46.9 | 97/207 | 52.2 | 45.2 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 97.7 | 85/87 | 100.0 | 100.0 | 96.0 |
| reversals | 6 | 77.3 | 58/75 | 100.0 | 50.0 | 81.4 |
| approvals | 5 | 92.6 | 50/54 | 100.0 | 89.7 | 100.0 |
| asks | 5 | 98.6 | 73/74 | 100.0 | 100.0 | 96.9 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 98.0 | 50/51 | – | – | 98.0 |
| failures | 6 | 36.4 | 8/22 | 0.0 | 100.0 | 21.4 |
| facts | 5 | 71.7 | 124/173 | 82.0 | 76.8 | 59.7 |
| decisions | 5 | 92.7 | 51/55 | 100.0 | 95.0 | 80.0 |
| lessons | 7 | 44.9 | 22/49 | 100.0 | 47.8 | 25.0 |
| file-state | 7 | 58.2 | 46/79 | 58.8 | 57.1 | 58.5 |
| multi-hop | 7 | 36.4 | 16/44 | 33.3 | 42.1 | 31.3 |
| rationale | 7 | 36.4 | 20/55 | 8.3 | 70.6 | 26.9 |
| chronology | 6 | 68.7 | 325/473 | 77.4 | 65.5 | 67.1 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 77.1 | 3/25 | 88.6 | 67.2 | 80.0 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **75.1** | 76.4% | 77.7 | 78.0 | 71.4 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 18k | 15k | 21k | 17k |
| context tokens per cut, max | 29k | 18k | 29k | 28k |
| reduction ratio (compacted / replaced), mean | 11.4% | 9.6% | 13.2% | 10.7% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A /tmp/omv-code/mask3-250 (dir) (holdout)

Total: **74.1**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 60.0 | 60/100 | 29.4 | 66.7 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 67.6 | 23/34 | 100.0 | 100.0 | 8.3 |
| in-progress | 5 | 46.4 | 13/28 | 53.8 | 12.5 | 71.4 |
| files-edited | 5 | 60.0 | 9/15 | 33.3 | 100.0 | 75.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 43.8 | 7/16 | 33.3 | – | 57.1 |
| chronology | 6 | 61.1 | 44/72 | 62.5 | 50.0 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 73.1 | 2/14 | 89.3 | 71.9 | 50.0 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **74.1** | 68.9% | 71.2 | 72.5 | 65.3 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 15k | 20k | 26k |
| context tokens per cut, max | 30k | 19k | 26k | 30k |
| reduction ratio (compacted / replaced), mean | 12.2% | 9.2% | 12.5% | 16.4% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A /tmp/omv-code/mask3-250 (dir) (reflection chain)

Total: **71.3**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 43.3 | 116/268 | 43.3 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 97.9 | 380/388 | 97.9 |
| reversals | 6 | 15.4 | 2/13 | 15.4 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 98.9 | 92/93 | 98.9 |
| in-progress | 5 | 70.3 | 26/37 | 70.3 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 90.6 | 58/64 | 90.6 |
| commits | 4 | 99.3 | 142/143 | 99.3 |
| failures | 6 | 25.7 | 9/35 | 25.7 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 50.2 | 568/1131 | 50.2 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 25.0 | 1/31 | 25.0 |
| budget | 3 | 96.0 | 19/31 | 96.0 |
| **total** | | **71.3** | 77.4% | 71.3 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 35k | 35k |
| context tokens per cut, max | 59k | 59k |
| reduction ratio (compacted / replaced), mean | 22.0% | 22.0% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/fail10 (dir)

Total: **77.4**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 98/207 | 52.2 | 46.4 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 97.7 | 85/87 | 100.0 | 100.0 | 96.0 |
| reversals | 6 | 77.3 | 58/75 | 100.0 | 50.0 | 81.4 |
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
| chronology | 6 | 71.0 | 336/473 | 77.4 | 66.0 | 73.3 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 76.4 | 3/25 | 88.1 | 66.2 | 79.3 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **77.4** | 77.5% | 82.2 | 78.0 | 74.2 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 18k | 15k | 21k | 17k |
| context tokens per cut, max | 29k | 18k | 29k | 28k |
| reduction ratio (compacted / replaced), mean | 11.6% | 9.7% | 13.4% | 10.9% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/fail10 (dir) (holdout)

Total: **79.2**

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
| tokens | 6 | 72.2 | 2/14 | 88.2 | 71.5 | 49.0 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **79.2** | 72.1% | 81.2 | 72.8 | 65.2 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 15k | 20k | 26k |
| context tokens per cut, max | 30k | 20k | 26k | 30k |
| reduction ratio (compacted / replaced), mean | 12.4% | 9.4% | 12.6% | 16.6% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/fail10 (dir) (reflection chain)

Total: **75.3**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 118/268 | 44.0 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 97.9 | 380/388 | 97.9 |
| reversals | 6 | 15.4 | 2/13 | 15.4 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 98.9 | 92/93 | 98.9 |
| in-progress | 5 | 73.0 | 27/37 | 73.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 99.3 | 142/143 | 99.3 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 50.2 | 568/1131 | 50.2 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 24.2 | 1/31 | 24.2 |
| budget | 3 | 95.7 | 19/31 | 95.7 |
| **total** | | **75.3** | 78.2% | 75.3 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 35k | 35k |
| context tokens per cut, max | 60k | 60k |
| reduction ratio (compacted / replaced), mean | 22.2% | 22.2% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

[0m[31mresults: /tmp/omv-code/abfull-fail10.json[0m
