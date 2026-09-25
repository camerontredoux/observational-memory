[0m[31m[A /tmp/omv-code/base4 (dir)] om-orchestration[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] om-v04[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/rep2kp (dir)] om-orchestration[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout firstmate-6[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout crew-uspa-4[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/rep2kp (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/rep2kp (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/rep2kp (dir)] holdout firstmate-6[0m
[0m[31m[B /tmp/omv-code/rep2kp (dir)] holdout crew-uspa-4[0m
[0m[31m[B /tmp/omv-code/rep2kp (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/rep3kp (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/rep3kp (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/rep3kp (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/rep3kp (dir)] holdout firstmate-6[0m
[0m[31m[B /tmp/omv-code/rep3kp (dir)] holdout crew-uspa-4[0m
[0m[31m[B /tmp/omv-code/rep3kp (dir)] holdout crew-opie-4[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
[0m[31m[B /tmp/omv-code/rep2kp (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
[0m[31m[B /tmp/omv-code/rep3kp (dir)] chain om-v04+om-orchestration+firstmate-11+firstmate-6[0m
# Against A /tmp/omv-code/base4 (dir): 78.1; holdout 83.4; reflection chain 81.9

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) | chain Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---:|
| B /tmp/omv-code/rep2kp (dir) | 79.7 | +1.6 | +1.5 / +1.0 / +2.2 | 25 | 0 | 6.0e-8 | exact | B | same | rationale +0.5, lessons +0.4, multi-hop +0.2, tokens -0.2 | +0.1 (3↑ 0↓) | -1.0 (8↑ 3↓) |
| B /tmp/omv-code/rep3kp (dir) | 80.8 | +2.7 | +2.7 / +1.7 / +3.5 | 29 | 0 | 3.7e-9 | exact | tradeoff | worse | rationale +0.7, lessons +0.6, multi-hop +0.6, file-state +0.5 | 0 (3↑ 0↓) | -1.6 (11↑ 4↓) |

# Compaction A/B

A: A /tmp/omv-code/base4 (dir)
B: B /tmp/omv-code/rep2kp (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 50.2 | +2.9 | 98/207 | 104/207 | 6 |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 106/106 | 106/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 84.0 | 85.3 | +1.3 | 63/75 | 64/75 | 1 |  |
| approvals | 5 | 92.6 | 92.6 | 0 | 50/54 | 50/54 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 100.0 | +2.0 | 50/51 | 51/51 | 1 |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 71.7 | 74.0 | +2.3 | 124/173 | 128/173 | 4 |  |
| decisions | 5 | 92.7 | 96.4 | +3.6 | 51/55 | 53/55 | 2 |  |
| lessons | 7 | 44.9 | 53.1 | +8.2 | 22/49 | 26/49 | 4 |  |
| file-state | 7 | 58.2 | 60.8 | +2.5 | 46/79 | 48/79 | 2 |  |
| multi-hop | 7 | 36.4 | 40.9 | +4.5 | 16/44 | 18/44 | 2 |  |
| rationale | 7 | 36.4 | 45.5 | +9.1 | 20/55 | 25/55 | 5 |  |
| chronology | 6 | 72.9 | 73.2 | +0.2 | 345/473 | 346/473 | 1 |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 79.5 | 74.3 | -5.3 | 4/25 | 2/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.1** | **79.7** | **+1.6** | 78.4% | 79.7% | **28** | **0** |

Per transcript: om-orchestration 82.3 → 83.8 (+1.5); om-v04 78.2 → 79.2 (+1.0); firstmate-11 75.4 → 77.6 (+2.2).
Flips: 28 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 25 up, 0 down, sign test p=6.0e-8. Passed counts are over all samples.

Verdict: B is better: 1.6 weighted points, 3 of 3 transcripts agree, 25 unique items flip to B against 0.
efficiency: same (B vs A: mean tokens +9%, reduction ratio +9%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 17k | 19k |
| context tokens per cut, max | 28k | 30k |
| reduction ratio (compacted / replaced), mean | 11.0% | 12.0% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1226k / 63k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1290k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (25 unique items):

- file-state om-orchestration/file:testing-guide: ↑ at @1
- rationale om-orchestration/why:lanes: ↑ at @2
- rationale om-orchestration/why:opus-round: ↑ at @2 @3
- identifiers om-orchestration/version:1.1.0: ↑ at @5
- identifiers om-v04/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @1
- identifiers om-v04/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @2
- facts om-v04/str:retrying-rows: ↑ at @5
- lessons om-v04/neg:hook-output-refuted: ↑ at @6
- reversals om-v04/sup:stall-cause: ↑ at @6
- lessons om-v04/neg:subagent-veto: ↑ at @7
- identifiers om-v04/usd:$0.04: ↑ at @8
- identifiers om-v04/number:0.04: ↑ at @8
- identifiers om-v04/number:0.06: ↑ at @8
- chronology firstmate-11/path:~/.codex/AGENTS.md: ↑ at @5
- file-state firstmate-11/file-learnings-16gb: ↑ at @5
- multi-hop firstmate-11/multi-watcher-5415: ↑ at @5
- rationale firstmate-11/why-imports-not-codex: ↑ at @5
- lessons firstmate-11/neg-tab-price: ↑ at @6
- facts firstmate-11/scope-prod-write: ↑ at @7
- decisions firstmate-11/sbom-cause: ↑ at @9 @10
- facts firstmate-11/exact-libheif-version: ↑ at @9 @10
- rationale firstmate-11/why-sbom-passed: ↑ at @9
- commits firstmate-11/pr:1425: ↑ at @11
- lessons firstmate-11/neg-address-split: ↑ at @11
- multi-hop firstmate-11/multi-gorman-prod-setup: ↑ at @11

## Reflection chain (not in the total)

A: A /tmp/omv-code/base4 (dir) (reflection chain)
B: B /tmp/omv-code/rep2kp (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 46.6 | +2.6 | 118/268 | 125/268 | 7 |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 388/388 | 388/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 100.0 | +1.9 | 53/54 | 54/54 | 1 |  |
| asks | 5 | 100.0 | 100.0 | 0 | 93/93 | 93/93 |  |  |
| in-progress | 5 | 73.0 | 73.0 | 0 | 27/37 | 27/37 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 |  |  |
| commits | 4 | 99.3 | 99.3 | 0 | 142/143 | 142/143 |  |  |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.7 | 97.7 | 0 | 294/301 | 294/301 |  |  |
| chronology | 6 | 51.3 | 51.3 | 0 | 580/1131 | 580/1131 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 28.5 | 24.3 | -4.2 | 1/31 | 1/31 |  |  |
| budget | 3 | 97.5 | 96.3 | -1.2 | 23/31 | 20/31 |  | 3 |
| **total** | | **81.9** | **80.9** | **-1.0** | 79.2% | 79.4% | **8** | **3** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.9 → 80.9 (-1.0).
Flips: 8 up, 3 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 8 up, 1 down, sign test p=0.039. Passed counts are over all samples.

Verdict: no verdict: the weighted score favours A (-1.0), but the unique-item flips favour B (8 up, 1 down).
efficiency: same (B vs A: mean tokens +6%, reduction ratio +6%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 33k | 35k |
| context tokens per cut, max | 57k | 59k |
| reduction ratio (compacted / replaced), mean | 20.9% | 22.1% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (1 unique items):

- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↓ at @17 @28 @30

Better in B (8 unique items):

- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @1
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @2
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.06: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#5: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#6: ↑ at @11
- approvals om-v04+om-orchestration+firstmate-11+firstmate-6/line 14898: ↑ at @22

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/base4 (dir) (holdout)
B: B /tmp/omv-code/rep2kp (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 62.0 | +1.0 | 61/100 | 62/100 | 1 |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 |  |  |
| files-edited | 5 | 80.0 | 80.0 | 0 | 12/15 | 12/15 |  |  |
| commits | 4 | 100.0 | 100.0 | 0 | 38/38 | 38/38 |  |  |
| failures | 6 | 100.0 | 100.0 | 0 | 16/16 | 16/16 |  |  |
| chronology | 6 | 61.1 | 63.9 | +2.8 | 44/72 | 46/72 | 2 |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 74.3 | 70.9 | -3.3 | 2/14 | 2/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **83.4** | **83.5** | **+0.1** | 76.1% | 76.9% | **3** | **0** |

Per transcript: firstmate-6 81.4 → 83.0 (+1.6); crew-uspa-4 72.9 → 72.9 (0); crew-opie-4 79.5 → 78.9 (-0.5).
Flips: 3 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 2 up, 0 down, sign test p=0.50. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +5%, reduction ratio +5%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 20k |
| context tokens per cut, max | 29k | 31k |
| reduction ratio (compacted / replaced), mean | 12.0% | 12.6% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (594k / 30k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 624k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (2 unique items):

- chronology firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @3 @5
- identifiers firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @5

# Compaction A/B

A: A /tmp/omv-code/base4 (dir)
B: B /tmp/omv-code/rep3kp (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 51.2 | +3.9 | 98/207 | 106/207 | 8 |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 106/106 | 106/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 84.0 | 85.3 | +1.3 | 63/75 | 64/75 | 1 |  |
| approvals | 5 | 92.6 | 92.6 | 0 | 50/54 | 50/54 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 100.0 | +2.0 | 50/51 | 51/51 | 1 |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 71.7 | 74.0 | +2.3 | 124/173 | 128/173 | 4 |  |
| decisions | 5 | 92.7 | 96.4 | +3.6 | 51/55 | 53/55 | 2 |  |
| lessons | 7 | 44.9 | 57.1 | +12.2 | 22/49 | 28/49 | 6 |  |
| file-state | 7 | 58.2 | 67.1 | +8.9 | 46/79 | 53/79 | 7 |  |
| multi-hop | 7 | 36.4 | 47.7 | +11.4 | 16/44 | 21/44 | 5 |  |
| rationale | 7 | 36.4 | 50.9 | +14.5 | 20/55 | 28/55 | 8 |  |
| chronology | 6 | 72.9 | 73.8 | +0.8 | 345/473 | 349/473 | 4 |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 79.5 | 71.3 | -8.2 | 4/25 | 2/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.1** | **80.8** | **+2.7** | 78.4% | 80.6% | **46** | **0** |

Per transcript: om-orchestration 82.3 → 85.0 (+2.7); om-v04 78.2 → 79.9 (+1.7); firstmate-11 75.4 → 78.9 (+3.5).
Flips: 46 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 29 up, 0 down, sign test p=3.7e-9. Passed counts are over all samples.

Verdict: tradeoff: B +2.7 quality for +14% mean tokens (more than 10% more tokens is never "better").
efficiency: worse (B vs A: mean tokens +14%, reduction ratio +14%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 17k | 20k |
| context tokens per cut, max | 28k | 32k |
| reduction ratio (compacted / replaced), mean | 11.0% | 12.5% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1226k / 63k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1290k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (29 unique items):

- file-state om-orchestration/file:testing-guide: ↑ at @1 @2 @3 @4
- rationale om-orchestration/why:lanes: ↑ at @2
- rationale om-orchestration/why:opus-round: ↑ at @2 @3 @4
- identifiers om-orchestration/version:1.1.0: ↑ at @5
- identifiers om-v04/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @1
- identifiers om-v04/usd:$0.0015: ↑ at @1
- identifiers om-v04/number:0.0015: ↑ at @1
- identifiers om-v04/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @2
- facts om-v04/str:retrying-rows: ↑ at @5
- lessons om-v04/neg:hook-output-refuted: ↑ at @6
- reversals om-v04/sup:stall-cause: ↑ at @6
- lessons om-v04/neg:subagent-veto: ↑ at @7 @8
- lessons om-v04/neg:vcc-install: ↑ at @7
- identifiers om-v04/usd:$0.04: ↑ at @8
- identifiers om-v04/number:0.04: ↑ at @8
- identifiers om-v04/number:0.06: ↑ at @8
- multi-hop om-v04/hop:made-up-answers: ↑ at @9
- chronology firstmate-11/path:~/.codex/AGENTS.md: ↑ at @5 @6 @7 @8
- file-state firstmate-11/file-learnings-16gb: ↑ at @5 @6 @7
- multi-hop firstmate-11/multi-watcher-5415: ↑ at @5 @6 @7
- rationale firstmate-11/why-imports-not-codex: ↑ at @5 @6
- lessons firstmate-11/neg-tab-price: ↑ at @6
- facts firstmate-11/scope-prod-write: ↑ at @7
- decisions firstmate-11/sbom-cause: ↑ at @9 @10
- facts firstmate-11/exact-libheif-version: ↑ at @9 @10
- rationale firstmate-11/why-sbom-passed: ↑ at @9 @10
- commits firstmate-11/pr:1425: ↑ at @11
- lessons firstmate-11/neg-address-split: ↑ at @11
- multi-hop firstmate-11/multi-gorman-prod-setup: ↑ at @11

## Reflection chain (not in the total)

A: A /tmp/omv-code/base4 (dir) (reflection chain)
B: B /tmp/omv-code/rep3kp (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 47.8 | +3.7 | 118/268 | 128/268 | 10 |  |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 388/388 | 388/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 100.0 | +1.9 | 53/54 | 54/54 | 1 |  |
| asks | 5 | 100.0 | 100.0 | 0 | 93/93 | 93/93 |  |  |
| in-progress | 5 | 73.0 | 73.0 | 0 | 27/37 | 27/37 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 |  |  |
| commits | 4 | 99.3 | 99.3 | 0 | 142/143 | 142/143 |  |  |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.7 | 97.7 | 0 | 294/301 | 294/301 |  |  |
| chronology | 6 | 51.3 | 51.3 | 0 | 580/1131 | 580/1131 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 28.5 | 22.1 | -6.4 | 1/31 | 0/31 |  |  |
| budget | 3 | 97.5 | 95.5 | -2.0 | 23/31 | 19/31 |  | 4 |
| **total** | | **81.9** | **80.3** | **-1.6** | 79.2% | 79.4% | **11** | **4** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.9 → 80.3 (-1.6).
Flips: 11 up, 4 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 11 up, 1 down, sign test p=0.0063. Passed counts are over all samples.

Verdict: no verdict: the weighted score favours A (-1.6), but the unique-item flips favour B (11 up, 1 down).
efficiency: same (B vs A: mean tokens +9%, reduction ratio +9%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 33k | 36k |
| context tokens per cut, max | 57k | 60k |
| reduction ratio (compacted / replaced), mean | 20.9% | 22.7% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (1 unique items):

- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↓ at @13 @17 @28 @30

Better in B (11 unique items):

- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @1
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.0015: ↑ at @1
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.0015: ↑ at @1
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @2
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.06: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#5: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#6: ↑ at @11
- approvals om-v04+om-orchestration+firstmate-11+firstmate-6/line 14898: ↑ at @22
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:ByteBotSoftware/oasis-pavers-and-pools-opie: ↑ at @28

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/base4 (dir) (holdout)
B: B /tmp/omv-code/rep3kp (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 62.0 | +1.0 | 61/100 | 62/100 | 1 |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 |  |  |
| files-edited | 5 | 80.0 | 80.0 | 0 | 12/15 | 12/15 |  |  |
| commits | 4 | 100.0 | 100.0 | 0 | 38/38 | 38/38 |  |  |
| failures | 6 | 100.0 | 100.0 | 0 | 16/16 | 16/16 |  |  |
| chronology | 6 | 61.1 | 63.9 | +2.8 | 44/72 | 46/72 | 2 |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 74.3 | 70.1 | -4.1 | 2/14 | 2/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **83.4** | **83.4** | **0** | 76.1% | 76.9% | **3** | **0** |

Per transcript: firstmate-6 81.4 → 82.8 (+1.4); crew-uspa-4 72.9 → 72.9 (0); crew-opie-4 79.5 → 78.9 (-0.5).
Flips: 3 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 2 up, 0 down, sign test p=0.50. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +6%, reduction ratio +6%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 20k |
| context tokens per cut, max | 29k | 31k |
| reduction ratio (compacted / replaced), mean | 12.0% | 12.7% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (594k / 30k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 624k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (2 unique items):

- chronology firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @3 @5
- identifiers firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @5

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

## B /tmp/omv-code/rep2kp (dir)

Total: **79.7**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 50.2 | 104/207 | 53.7 | 52.4 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 85.3 | 64/75 | 100.0 | 55.6 | 93.0 |
| approvals | 5 | 92.6 | 50/54 | 100.0 | 89.7 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 74.0 | 128/173 | 82.0 | 78.6 | 64.2 |
| decisions | 5 | 96.4 | 53/55 | 100.0 | 95.0 | 93.3 |
| lessons | 7 | 53.1 | 26/49 | 100.0 | 56.5 | 35.0 |
| file-state | 7 | 60.8 | 48/79 | 64.7 | 57.1 | 61.0 |
| multi-hop | 7 | 40.9 | 18/44 | 33.3 | 42.1 | 43.8 |
| rationale | 7 | 45.5 | 25/55 | 33.3 | 70.6 | 34.6 |
| chronology | 6 | 73.2 | 346/473 | 77.4 | 66.0 | 79.5 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 74.3 | 2/25 | 84.8 | 63.7 | 78.1 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **79.7** | 79.7% | 83.8 | 79.2 | 77.6 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 16k | 22k | 18k |
| context tokens per cut, max | 30k | 18k | 30k | 30k |
| reduction ratio (compacted / replaced), mean | 12.0% | 10.3% | 14.0% | 11.1% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/rep2kp (dir) (holdout)

Total: **83.5**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 62.0 | 62/100 | 35.3 | 68.3 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 80.0 | 12/15 | 83.3 | 100.0 | 75.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 63.9 | 46/72 | 75.0 | 50.0 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 70.9 | 2/14 | 86.1 | 72.4 | 46.6 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.5** | 76.9% | 83.0 | 72.9 | 78.9 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 15k | 20k | 27k |
| context tokens per cut, max | 31k | 21k | 25k | 31k |
| reduction ratio (compacted / replaced), mean | 12.6% | 9.8% | 12.4% | 17.0% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/rep2kp (dir) (reflection chain)

Total: **80.9**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 46.6 | 125/268 | 46.6 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 100.0 | 54/54 | 100.0 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 73.0 | 27/37 | 73.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 99.3 | 142/143 | 99.3 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 51.3 | 580/1131 | 51.3 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 24.3 | 1/31 | 24.3 |
| budget | 3 | 96.3 | 20/31 | 96.3 |
| **total** | | **80.9** | 79.4% | 80.9 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 35k | 35k |
| context tokens per cut, max | 59k | 59k |
| reduction ratio (compacted / replaced), mean | 22.1% | 22.1% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/rep3kp (dir)

Total: **80.8**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 51.2 | 106/207 | 53.7 | 54.8 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 85.3 | 64/75 | 100.0 | 55.6 | 93.0 |
| approvals | 5 | 92.6 | 50/54 | 100.0 | 89.7 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 74.0 | 128/173 | 82.0 | 78.6 | 64.2 |
| decisions | 5 | 96.4 | 53/55 | 100.0 | 95.0 | 93.3 |
| lessons | 7 | 57.1 | 28/49 | 100.0 | 65.2 | 35.0 |
| file-state | 7 | 67.1 | 53/79 | 82.4 | 57.1 | 65.9 |
| multi-hop | 7 | 47.7 | 21/44 | 33.3 | 47.4 | 56.3 |
| rationale | 7 | 50.9 | 28/55 | 41.7 | 70.6 | 42.3 |
| chronology | 6 | 73.8 | 349/473 | 77.4 | 66.0 | 81.4 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 71.3 | 2/25 | 81.4 | 60.0 | 75.9 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **80.8** | 80.6% | 85.0 | 79.9 | 78.9 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 17k | 23k | 18k |
| context tokens per cut, max | 32k | 20k | 32k | 31k |
| reduction ratio (compacted / replaced), mean | 12.5% | 10.9% | 14.6% | 11.5% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/rep3kp (dir) (holdout)

Total: **83.4**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 62.0 | 62/100 | 35.3 | 68.3 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 80.0 | 12/15 | 83.3 | 100.0 | 75.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 63.9 | 46/72 | 75.0 | 50.0 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 70.1 | 2/14 | 84.3 | 72.4 | 46.6 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.4** | 76.9% | 82.8 | 72.9 | 78.9 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 16k | 20k | 27k |
| context tokens per cut, max | 31k | 22k | 25k | 31k |
| reduction ratio (compacted / replaced), mean | 12.7% | 10.1% | 12.4% | 17.0% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/rep3kp (dir) (reflection chain)

Total: **80.3**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 47.8 | 128/268 | 47.8 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 100.0 | 54/54 | 100.0 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 73.0 | 27/37 | 73.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 99.3 | 142/143 | 99.3 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 51.3 | 580/1131 | 51.3 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 22.1 | 0/31 | 22.1 |
| budget | 3 | 95.5 | 19/31 | 95.5 |
| **total** | | **80.3** | 79.4% | 80.3 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 36k | 36k |
| context tokens per cut, max | 60k | 60k |
| reduction ratio (compacted / replaced), mean | 22.7% | 22.7% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

[0m[31mresults: /tmp/omv-code/abfull-repp.json[0m
