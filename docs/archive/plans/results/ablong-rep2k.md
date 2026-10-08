[0m[31m[A /tmp/omv-code/base4 (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/rep-r40c (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/rep-r40c (dir)] om-v04[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/rep-r40c (dir)] firstmate-11[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] firstmate-11[0m
# Against A /tmp/omv-code/base4 (dir): 78.1

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|
| B /tmp/omv-code/rep-r40c (dir) | 79.8 | +1.7 | +0.9 / +1.2 / +2.4 | 25 | 0 | 6.0e-8 | exact | B | same | lessons +0.4, rationale +0.4, multi-hop +0.4, tokens -0.2 |

# Compaction A/B

A: A /tmp/omv-code/base4 (dir)
B: B /tmp/omv-code/rep-r40c (dir)

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
| file-state | 7 | 58.2 | 62.0 | +3.8 | 46/79 | 49/79 | 3 |  |
| multi-hop | 7 | 36.4 | 43.2 | +6.8 | 16/44 | 19/44 | 3 |  |
| rationale | 7 | 36.4 | 43.6 | +7.3 | 20/55 | 24/55 | 4 |  |
| chronology | 6 | 72.9 | 73.2 | +0.2 | 345/473 | 346/473 | 1 |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 79.5 | 74.2 | -5.4 | 4/25 | 2/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.1** | **79.8** | **+1.7** | 78.4% | 79.7% | **29** | **0** |

Per transcript: om-orchestration 82.3 → 83.2 (+0.9); om-v04 78.2 → 79.4 (+1.2); firstmate-11 75.4 → 77.8 (+2.4).
Flips: 29 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 25 up, 0 down, sign test p=6.0e-8. Passed counts are over all samples.

Verdict: B is better: 1.7 weighted points, 3 of 3 transcripts agree, 25 unique items flip to B against 0.
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

- file-state om-orchestration/file:testing-guide: ↑ at @1 @4
- rationale om-orchestration/why:lanes: ↑ at @2
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
- multi-hop om-v04/hop:made-up-answers: ↑ at @9
- chronology firstmate-11/path:~/.codex/AGENTS.md: ↑ at @5
- file-state firstmate-11/file-learnings-16gb: ↑ at @5
- multi-hop firstmate-11/multi-watcher-5415: ↑ at @5
- rationale firstmate-11/why-imports-not-codex: ↑ at @5
- lessons firstmate-11/neg-tab-price: ↑ at @6
- facts firstmate-11/scope-prod-write: ↑ at @7
- decisions firstmate-11/sbom-cause: ↑ at @9 @10
- facts firstmate-11/exact-libheif-version: ↑ at @9 @10
- rationale firstmate-11/why-sbom-passed: ↑ at @9 @10
- commits firstmate-11/pr:1425: ↑ at @11
- lessons firstmate-11/neg-address-split: ↑ at @11
- multi-hop firstmate-11/multi-gorman-prod-setup: ↑ at @11

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

## B /tmp/omv-code/rep-r40c (dir)

Total: **79.8**

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
| file-state | 7 | 62.0 | 49/79 | 70.6 | 57.1 | 61.0 |
| multi-hop | 7 | 43.2 | 19/44 | 33.3 | 47.4 | 43.8 |
| rationale | 7 | 43.6 | 24/55 | 16.7 | 70.6 | 38.5 |
| chronology | 6 | 73.2 | 346/473 | 77.4 | 66.0 | 79.5 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 74.2 | 2/25 | 84.7 | 63.6 | 78.0 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **79.8** | 79.7% | 83.2 | 79.4 | 77.8 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 16k | 22k | 18k |
| context tokens per cut, max | 30k | 19k | 30k | 30k |
| reduction ratio (compacted / replaced), mean | 12.0% | 10.3% | 14.0% | 11.1% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

[0m[31mresults: /tmp/omv-code/ablong-rep2k.json[0m
