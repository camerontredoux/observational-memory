# Against A af0940d@af0940d: 72.4; holdout 75.3; reflection chain 70.0; long chain 53.8, recall-aware 32.7

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) | chain Δ | long Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---:|---|
| B .scratch/omv-code/base4 (dir) | 75.4 | +3.0 | +5.0 / +0.8 / +3.6 | 15 | 5 | 0.041 | exact | B | better | failures +2.1, tokens +0.7, chronology +0.2, corrections +0.1 | +8.1 (14↑ 1↓) | +11.9 (61↑ 7↓) B | +6.1 (50↑ 17↓); recall-aware 35.4 (+2.6) |
| B .scratch/omv-code/base5 (dir) | 78.3 | +5.9 | +6.4 / +5.4 / +6.6 | 63 | 23 | 0.000019 | A' -1.7 | B | better | failures +2.1, multi-hop +0.8, lessons +0.7, rationale +0.6 | +7.6 (20↑ 10↓) | +10.6 (127↑ 123↓) | +5.9 (86↑ 47↓); recall-aware 43.4 (+10.7) |
| B .scratch/omv-code/base7 (dir) | 78.3 | +5.9 | +6.4 / +5.4 / +6.6 | 63 | 23 | 0.000019 | A' -1.7 | B | better | failures +2.1, multi-hop +0.8, lessons +0.7, rationale +0.6 | +7.6 (20↑ 10↓) | +11.0 (128↑ 123↓) | +8.0 (110↑ 46↓); recall-aware 43.6 (+10.8) |

# Compaction A/B

A: A af0940d@af0940d
B: B .scratch/omv-code/base4 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 47.3 | 0 | 98/207 | 98/207 | 1 | 1 |
| constraints | 6 | 100.0 | 100.0 | 0 | 106/106 | 106/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 97.7 | 100.0 | +2.3 | 85/87 | 87/87 | 2 |  |
| reversals | 6 | 85.3 | 84.0 | -1.3 | 64/75 | 63/75 |  | 1 |
| approvals | 5 | 92.6 | 92.6 | 0 | 50/54 | 50/54 |  |  |
| asks | 5 | 98.6 | 100.0 | +1.4 | 73/74 | 74/74 | 1 |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 98.0 | 0 | 50/51 | 50/51 |  |  |
| failures | 6 | 36.4 | 86.4 | +50.0 | 8/22 | 19/22 | 11 |  |
| facts | 5 | 71.7 | 71.7 | 0 | 124/173 | 124/173 |  |  |
| decisions | 5 | 92.7 | 92.7 | 0 | 51/55 | 51/55 |  |  |
| lessons | 7 | 44.9 | 44.9 | 0 | 22/49 | 22/49 |  |  |
| file-state | 7 | 59.5 | 58.2 | -1.3 | 47/79 | 46/79 |  | 1 |
| multi-hop | 7 | 36.4 | 36.4 | 0 | 16/44 | 16/44 |  |  |
| rationale | 7 | 38.2 | 36.4 | -1.8 | 21/55 | 20/55 |  | 1 |
| chronology | 6 | 69.1 | 72.9 | +3.8 | 327/473 | 345/473 | 19 | 1 |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| purpose | 5 | 0.0 | 0.0 | 0 | 0/24 | 0/24 |  |  |
| tokens | 6 | 62.9 | 79.5 | +16.6 | 1/25 | 4/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **72.4** | **75.4** | **+3.0** | 76.1% | 77.5% | **34** | **5** |

Per transcript: om-orchestration 74.4 → 79.3 (+5.0); om-v04 74.5 → 75.3 (+0.8); firstmate-11 69.2 → 72.7 (+3.6).
Flips: 34 up, 5 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 15 up, 5 down, sign test p=0.041. Passed counts are over all samples.

Verdict: B is better: 3.0 weighted points, 3 of 3 transcripts agree, 15 unique items flip to B against 5.
efficiency: better (B vs A: mean tokens -22%, reduction ratio -22%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 22k | 17k |
| context tokens per cut, max | 36k | 28k |
| reduction ratio (compacted / replaced), mean | 14.1% | 11.0% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1226k / 63k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1290k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (5 unique items):

- identifiers om-orchestration/path:/tmp/om-bench/results.jsonl: ↓ at @2
- chronology om-v04/usd:$0.0029: ↓ at @5
- file-state firstmate-11/file-gorman-pdf-script: ↓ at @5
- rationale firstmate-11/why-sign-permission: ↓ at @6
- reversals firstmate-11/super-test-db: ↓ at @9

Better in B (15 unique items):

- failures om-orchestration/line 1105: ↑ at @2 @3 @4
- identifiers om-v04/path:.claude-plugin/plugin.json: ↑ at @8
- chronology om-v04/path:.claude-plugin/plugin.json: ↑ at @8
- failures firstmate-11/line 116: ↑ at @2 @3
- chronology firstmate-11/path:main...origin/main: ↑ at @3 @4 @5 @6 @7 @8 @9 @10 @11
- chronology firstmate-11/path:data/secondmates.md: ↑ at @4 @5 @6 @7 @8 @9 @10 @11
- failures firstmate-11/line 1037: ↑ at @5
- failures firstmate-11/line 1658: ↑ at @6
- failures firstmate-11/line 1813: ↑ at @7
- failures firstmate-11/line 3044: ↑ at @9
- corrections firstmate-11/line 5039: ↑ at @10 @11
- asks firstmate-11/line 5039: ↑ at @10
- failures firstmate-11/line 3599: ↑ at @10
- failures firstmate-11/line 4201: ↑ at @11
- chronology firstmate-11/path:bin/fm-crew-state.sh: ↑ at @11

## Long chain (not in the total)

A: A af0940d@af0940d (long chain, every 5th cut)
B: B .scratch/omv-code/base4 (dir) (long chain, every 5th cut)

A sample 1: long 331 calls, 0 fresh
B sample 1: long 331 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 45.3 | 44.8 | -0.5 | 96/212 | 95/212 | 4 | 5 |
| constraints | 6 | 91.4 | 91.4 | 0 | 234/256 | 234/256 |  |  |
| verbatim | 5 | 89.1 | 89.1 | 0 | 230/258 | 230/258 |  |  |
| corrections | 8 | 66.5 | 68.0 | +1.6 | 343/516 | 351/516 | 8 |  |
| reversals | 6 | 44.3 | 48.3 | +3.9 | 90/203 | 98/203 | 16 | 8 |
| approvals | 5 | 54.2 | 60.4 | +6.3 | 26/48 | 29/48 | 3 |  |
| asks | 5 | 93.8 | 100.0 | +6.3 | 45/48 | 48/48 | 3 |  |
| in-progress | 5 | 76.0 | 76.0 | 0 | 19/25 | 19/25 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 84.4 | 84.4 | 0 | 65/77 | 65/77 |  |  |
| commits | 4 | 65.0 | 68.3 | +3.3 | 119/183 | 125/183 | 11 | 5 |
| failures | 6 | 30.0 | 60.0 | +30.0 | 3/10 | 6/10 | 3 |  |
| facts | 5 | 32.6 | 33.6 | +1.0 | 294/903 | 303/903 | 20 | 11 |
| decisions | 5 | 23.2 | 25.4 | +2.2 | 75/323 | 82/323 | 9 | 2 |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 48.2 | 52.4 | +4.3 | 237/492 | 258/492 | 27 | 6 |
| absent | 5 | 100.0 | 99.0 | -1.0 | 294/294 | 291/294 |  | 3 |
| tokens | 6 | 7.2 | 10.4 | +3.2 | 0/16 | 0/16 |  |  |
| budget | 3 | 83.5 | 88.4 | +4.9 | 4/16 | 6/16 | 3 | 1 |
| **total** | | **53.8** | **59.9** | **+6.1** | 56.5% | 58.2% | **107** | **41** |

Per transcript: long 53.8 → 59.9 (+6.1).
Flips: 107 up, 41 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 50 up, 17 down, sign test p=0.000067. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: worse (B vs A: mean tokens -12%, reduction ratio -12%, model tokens -0%, critical-path calls per transcript +1.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 48k | 43k |
| context tokens per cut, max | 79k | 68k |
| reduction ratio (compacted / replaced), mean | 32.2% | 28.3% |
| Observer calls (tokens in / out) | 325 (5259k / 209k) | 325 (5259k / 209k) |
| Reflector calls (tokens in / out) | 6 (209k / 19k) | 6 (196k / 20k) |
| model tokens in + out | 5695k | 5683k |
| critical-path calls (tokens in / out) | 113 (1849k / 64k) | 114 (1878k / 67k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (17 unique items):

- identifiers long/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↓ at @10
- identifiers long/path:.claude-plugin/plugin.json: ↓ at @10
- identifiers long/path:/tmp/om-v043/fixture.jsonl: ↓ at @15
- facts long/om-v04-hop:moved-transcript: ↓ at @30
- facts long/firstmate-11-why-blank-body-block: ↓ at @40 @45 @50
- absent long/firstmate-11-abst-drug-quota: ↓ at @40 @45 @50
- reversals long/firstmate-11-order-rename-then-subject: ↓ at @40 @45
- facts long/firstmate-11-neg-address-split: ↓ at @50
- reversals long/firstmate-11-line-items: ↓ at @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-multi-prod-dump: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/om-orchestration-ord:5-after-7: ↓ at @55 @60 @65 @70 @75
- decisions long/firstmate-11-blank-body: ↓ at @60 @65
- identifiers long/path:tests/eval/replay-specs: ↓ at @75
- identifiers long/number:0.30: ↓ at @75
- commits long/commit:940b47b: ↓ at @75 @80
- commits long/commit:00b682b: ↓ at @75
- commits long/commit:7f4f391: ↓ at @75

Better in B (50 unique items):

- failures long/line 5573: ↑ at @15
- budget long/size: ↑ at @15 @30 @75; ↓ at @55
- chronology long/path:/tmp/cctypes: ↑ at @25 @30 @35 @40 @45 @50
- failures long/line 13573: ↑ at @30
- corrections long/line 15568: ↑ at @35 @40 @45
- failures long/line 16161: ↑ at @35
- identifiers long/path:~/work/mods/compact-test: ↑ at @40
- identifiers long/path:/tmp/om-flow: ↑ at @40
- commits long/pr:238: ↑ at @40 @45 @50
- chronology long/path:/tmp/compact-test-last.json: ↑ at @40 @45 @50
- chronology long/version:2.1.280: ↑ at @40 @45 @50
- chronology long/path:~/work/mods/compact-test: ↑ at @40 @45 @50
- facts long/om-v04-file:pi-isolation: ↑ at @40 @45 @50
- facts long/om-v04-file:skill-rule: ↑ at @40 @45 @50
- approvals long/om-v04-scope:no-lavish: ↑ at @40 @45 @50
- decisions long/om-v04-why:timeout-not-retried: ↑ at @40 @45 @50
- facts long/firstmate-11-file-sbom-acceptances: ↑ at @40 @45 @50
- facts long/firstmate-11-exact-libheif-version: ↑ at @40 @45 @50
- facts long/long:compact-test: ↑ at @40
- reversals long/om-v04-sup:subagent-observed: ↑ at @40 @45 @50
- reversals long/om-v04-sup:todo-commit: ↑ at @40 @45 @50
- reversals long/om-v04-sup:stall-cause: ↑ at @40 @45 @50
- reversals long/om-v04-sup:failure-cause: ↑ at @40 @45 @50
- reversals long/firstmate-11-super-sbom-pages: ↑ at @40 @45 @50
- facts long/om-v04-vcc-repo: ↑ at @45 @45 @50 @50
- facts long/firstmate-11-email-subject: ↑ at @50
- corrections long/line 19141: ↑ at @50
- corrections long/line 23568: ↑ at @50 @55
- corrections long/line 23987: ↑ at @50 @55
- asks long/line 24108: ↑ at @50
- asks long/line 24567: ↑ at @50
- asks long/line 27881: ↑ at @50
- identifiers long/path:tests/eval/recall-plugin/hooks/prompts.ts: ↑ at @55
- commits long/pr:1425: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/path:hooks/register.ts: ↑ at @55
- chronology long/path:tests/register.test.ts: ↑ at @55
- chronology long/path:.claude-plugin/plugin.json: ↑ at @55 @80; ↓ at @10
- chronology long/path:hooks/hooks.json: ↑ at @55 @80
- decisions long/om-orchestration-herdr-panes: ↑ at @55 @60 @65 @70 @75 @80
- commits long/commit:9466e8a: ↑ at @75
- reversals long/firstmate-11-order-sbom-prs: ↑ at @75
- identifiers long/path:~/.claude/projects: ↑ at @80
- chronology long/firstmate-11-street-address-pr: ↑ at @80
- facts long/firstmate-11-port: ↑ at @80
- chronology long/om-orchestration-runner-merge: ↑ at @80
- chronology long/om-orchestration-ticket-7: ↑ at @80
- chronology long/om-orchestration-ticket-5: ↑ at @80
- chronology long/om-orchestration-ticket-6: ↑ at @80
- facts long/om-orchestration-orchestration-log: ↑ at @80
- chronology long/om-orchestration-ord:6-after-5: ↑ at @80

Both ways (1 unique items):

- commits long/pr:1424: ↑ at @80; ↓ at @35

Recall-aware credit (not in any total): A 32.7, B 35.4 (+2.6)

## Reflection chain (not in the total)

A: A af0940d@af0940d (reflection chain)
B: B .scratch/omv-code/base4 (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 43.7 | 44.0 | +0.4 | 117/268 | 118/268 | 2 | 1 |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 97.9 | 100.0 | +2.1 | 380/388 | 388/388 | 8 |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 98.9 | 100.0 | +1.1 | 92/93 | 93/93 | 1 |  |
| in-progress | 5 | 70.3 | 73.0 | +2.7 | 26/37 | 27/37 | 1 |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 90.6 | 95.3 | +4.7 | 58/64 | 61/64 | 3 |  |
| commits | 4 | 100.0 | 99.3 | -0.7 | 143/143 | 142/143 |  | 1 |
| failures | 6 | 25.7 | 91.4 | +65.7 | 9/35 | 32/35 | 23 |  |
| facts | 5 | 97.7 | 97.7 | 0 | 294/301 | 294/301 |  |  |
| chronology | 6 | 50.7 | 51.3 | +0.6 | 573/1131 | 580/1131 | 12 | 5 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 16.5 | 28.5 | +12.0 | 1/31 | 1/31 |  |  |
| budget | 3 | 89.3 | 97.5 | +8.2 | 12/31 | 23/31 | 11 |  |
| **total** | | **70.0** | **81.9** | **+11.9** | 77.7% | 79.2% | **61** | **7** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 70.0 → 81.9 (+11.9).
Flips: 61 up, 7 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 22 up, 6 down, sign test p=0.0037. Passed counts are over all samples.

Verdict: B is better: 11.9 weighted points, 1 of 1 transcripts agree, 22 unique items flip to B against 6.
efficiency: better (B vs A: mean tokens -19%, reduction ratio -19%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 41k | 33k |
| context tokens per cut, max | 72k | 57k |
| reduction ratio (compacted / replaced), mean | 25.9% | 20.9% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (6 unique items):

- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.0029: ↓ at @5
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:openai-codex/gpt-5.6-luna: ↓ at @10 @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-bench/results.jsonl: ↓ at @11
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie: ↓ at @23
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/settings.ts: ↓ at @29
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1379: ↓ at @31

Better in B (22 unique items):

- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 2084: ↑ at @4 @6
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 3438: ↑ at @7 @8
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 4349: ↑ at @9 @10
- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @10 @11 @12 @13 @14 @17 @21 @22 @26 @28 @30
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 7297: ↑ at @11 @12 @13
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 11867: ↑ at @16 @17
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 12788: ↑ at @19
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 13409: ↑ at @20
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:tests/register.test.ts: ↑ at @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 13564: ↑ at @21
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 14795: ↑ at @23
- corrections om-v04+om-orchestration+firstmate-11+firstmate-6/line 16790: ↑ at @24 @25 @26 @27 @28 @29 @30 @31
- asks om-v04+om-orchestration+firstmate-11+firstmate-6/line 16790: ↑ at @24
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

A: A af0940d@af0940d (holdout)
B: B .scratch/omv-code/base4 (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 60.0 | 61.0 | +1.0 | 60/100 | 61/100 | 1 |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 | 1 | 1 |
| files-edited | 5 | 60.0 | 80.0 | +20.0 | 9/15 | 12/15 | 3 |  |
| commits | 4 | 100.0 | 100.0 | 0 | 38/38 | 38/38 |  |  |
| failures | 6 | 43.8 | 100.0 | +56.3 | 7/16 | 16/16 | 9 |  |
| chronology | 6 | 61.1 | 61.1 | 0 | 44/72 | 44/72 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 57.0 | 74.3 | +17.3 | 1/14 | 2/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **75.3** | **83.4** | **+8.1** | 72.4% | 76.1% | **14** | **1** |

Per transcript: firstmate-6 70.2 → 81.4 (+11.2); crew-uspa-4 70.4 → 72.9 (+2.5); crew-opie-4 72.8 → 79.5 (+6.6).
Flips: 14 up, 1 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 7 up, 1 down, sign test p=0.070. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens -21%, reduction ratio -21%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 24k | 19k |
| context tokens per cut, max | 40k | 29k |
| reduction ratio (compacted / replaced), mean | 15.1% | 12.0% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (594k / 30k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 624k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (1 unique items):

- in-progress crew-opie-4/~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/job-info-report-yellow-fields.png: ↓ at @2

Better in B (7 unique items):

- failures firstmate-6/line 85: ↑ at @1 @3
- in-progress firstmate-6//tmp/parse_q.py: ↑ at @4
- files-edited firstmate-6//tmp/parse_q.py: ↑ at @4 @5 @6
- failures firstmate-6/line 1838: ↑ at @4 @5
- failures firstmate-6/line 2274: ↑ at @5 @6
- identifiers crew-uspa-4/const:FETCH_HEAD: ↑ at @3
- failures crew-opie-4/line 1200: ↑ at @2 @3 @4

# Compaction A/B

A: A af0940d@af0940d
B: B .scratch/omv-code/base5 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 55.6 | +8.2 | 98/207 | 115/207 | 25 | 8 |
| constraints | 6 | 100.0 | 96.2 | -3.8 | 106/106 | 102/106 |  | 4 |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 97.7 | 100.0 | +2.3 | 85/87 | 87/87 | 2 |  |
| reversals | 6 | 85.3 | 81.3 | -4.0 | 64/75 | 61/75 | 2 | 5 |
| approvals | 5 | 92.6 | 81.5 | -11.1 | 50/54 | 44/54 |  | 6 |
| asks | 5 | 98.6 | 100.0 | +1.4 | 73/74 | 74/74 | 1 |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 100.0 | +2.0 | 50/51 | 51/51 | 1 |  |
| failures | 6 | 36.4 | 86.4 | +50.0 | 8/22 | 19/22 | 11 |  |
| facts | 5 | 71.7 | 82.1 | +10.4 | 124/173 | 142/173 | 19 | 1 |
| decisions | 5 | 92.7 | 100.0 | +7.3 | 51/55 | 55/55 | 4 |  |
| lessons | 7 | 44.9 | 59.2 | +14.3 | 22/49 | 29/49 | 8 | 1 |
| file-state | 7 | 59.5 | 64.6 | +5.1 | 47/79 | 51/79 | 12 | 8 |
| multi-hop | 7 | 36.4 | 52.3 | +15.9 | 16/44 | 23/44 | 10 | 3 |
| rationale | 7 | 38.2 | 50.9 | +12.7 | 21/55 | 28/55 | 8 | 1 |
| chronology | 6 | 69.1 | 75.5 | +6.3 | 327/473 | 357/473 | 41 | 11 |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| purpose | 5 | 0.0 | 0.0 | 0 | 0/24 | 0/24 |  |  |
| tokens | 6 | 62.9 | 73.3 | +10.4 | 1/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **72.4** | **78.3** | **+5.9** | 76.1% | 80.6% | **144** | **48** |

Per transcript: om-orchestration 74.4 → 80.8 (+6.4); om-v04 74.5 → 80.0 (+5.4); firstmate-11 69.2 → 75.8 (+6.6).
Flips: 144 up, 48 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 63 up, 23 down, sign test p=0.000019. Passed counts are over all samples.

Verdict: B is better: 5.9 weighted points, 3 of 3 transcripts agree, 63 unique items flip to B against 23.
efficiency: better (B vs A: mean tokens -14%, reduction ratio -14%, model tokens -6%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ -1.7, 64 up / 100 down (29 / 37 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 22k | 19k |
| context tokens per cut, max | 36k | 31k |
| reduction ratio (compacted / replaced), mean | 14.1% | 12.1% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (23 unique items):

- identifiers om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @1
- identifiers om-orchestration/path:/tmp/om-bench/results.jsonl: ↓ at @2
- constraints om-orchestration/rule:worktree-only: ↓ at @2 @3 @4 @5
- chronology om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @3 @4 @5
- reversals om-orchestration/sup:live-harness: ↓ at @3 @4 @5
- identifiers om-orchestration/branch:issue-11: ↓ at @5
- lessons om-orchestration/neg:tool-search: ↓ at @5
- facts om-orchestration/exact:rescored-results: ↓ at @5
- chronology om-v04/path:hooks/prompts.ts: ↓ at @3 @4
- chronology om-v04/path:openai-codex/gpt-5.6-luna: ↓ at @3 @4 @6 @8
- identifiers om-v04/path:hooks/prompts.ts: ↓ at @4
- approvals om-v04/scope:ctx-worktree: ↓ at @4 @5 @6 @7 @8 @9
- chronology om-v04/usd:$0.0029: ↓ at @5
- identifiers om-v04/path:openai-codex/gpt-5.6-luna: ↓ at @6
- identifiers om-v04/path:tests/fixtures/crewmate.local.ts: ↓ at @6
- identifiers om-v04/path:.claude/types/claude-code.d.ts: ↓ at @6
- chronology om-v04/path:.claude/types: ↓ at @6
- multi-hop om-v04/hop:151-messages: ↓ at @7 @8 @9
- reversals om-v04/sup:subagent-observed: ↓ at @8 @9
- file-state firstmate-11/file-claude-json-key: ↓ at @5 @6 @7 @8 @9 @10 @11
- file-state firstmate-11/file-gorman-pdf-script: ↓ at @5
- rationale firstmate-11/why-sign-permission: ↓ at @6
- identifiers firstmate-11/path:data/opie-gorman-pdf-on-contract-signed/prod-dump/prod.dump: ↓ at @9

Better in B (63 unique items):

- facts om-orchestration/testing-backup: ↑ at @1 @2 @3 @4 @5
- file-state om-orchestration/file:testing-guide: ↑ at @1
- rationale om-orchestration/why:lanes: ↑ at @1 @2
- identifiers om-orchestration/path:tests/eval/bench.ts: ↑ at @2
- identifiers om-orchestration/path:tests/eval/scenarios.ts: ↑ at @2 @3
- failures om-orchestration/line 1105: ↑ at @2 @3 @4
- chronology om-orchestration/path:hooks/stats.ts: ↑ at @3 @4 @5
- file-state om-orchestration/file:scenarios-fix: ↑ at @4 @5
- multi-hop om-orchestration/hop:x-req-id: ↑ at @4 @5
- identifiers om-orchestration/path:hooks/stats.ts: ↑ at @5
- identifiers om-orchestration/version:1.1.0: ↑ at @5
- identifiers om-orchestration/path:~/work/mods/observational-memory/docs/bench/2026-09-24-v1.0.0.jsonl: ↑ at @5
- chronology om-orchestration/ticket-10: ↑ at @5
- facts om-orchestration/sup:v1-spend: ↑ at @5
- facts om-orchestration/sup:rr-run-cost: ↑ at @5
- identifiers om-v04/path:.claude-plugin/plugin.json: ↑ at @1 @2 @3 @4 @5 @8
- identifiers om-v04/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @2 @9
- chronology om-v04/path:.claude-plugin/plugin.json: ↑ at @3 @4 @5 @7 @8
- file-state om-v04/file:prune-guards: ↑ at @3 @4 @5 @6 @7 @8 @9
- chronology om-v04/path:/tmp/om-v043/fixture.jsonl: ↑ at @4 @5 @6 @7 @9
- identifiers om-v04/path:~/.pi/agent: ↑ at @5
- identifiers om-v04/path:/tmp/om-v043/fixture.jsonl: ↑ at @6 @7
- identifiers om-v04/const:OM_NO_PRUNE: ↑ at @6 @8
- chronology om-v04/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @6 @7 @8 @9
- lessons om-v04/neg:hook-output-refuted: ↑ at @6 @7 @8 @9
- reversals om-v04/sup:stall-cause: ↑ at @6
- identifiers om-v04/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↑ at @7
- lessons om-v04/neg:subagent-veto: ↑ at @7
- lessons om-v04/neg:vcc-install: ↑ at @7 @9
- multi-hop om-v04/hop:settle-error-fix: ↑ at @7 @8 @9
- chronology om-v04/order:parser-line-by-line: ↑ at @7 @8 @9
- identifiers om-v04/usd:$0.04: ↑ at @8
- identifiers om-v04/number:0.05: ↑ at @8
- identifiers om-v04/number:0.04: ↑ at @8
- identifiers om-v04/number:0.06: ↑ at @8
- file-state om-v04/file:parser-debug: ↑ at @8 @9
- decisions om-v04/merge-recall: ↑ at @9
- multi-hop om-v04/hop:made-up-answers: ↑ at @9
- rationale om-v04/why:skill-stub: ↑ at @9
- failures firstmate-11/line 116: ↑ at @2 @3
- chronology firstmate-11/path:main...origin/main: ↑ at @3 @4 @5 @6 @7 @8 @9 @10 @11
- chronology firstmate-11/path:data/secondmates.md: ↑ at @4 @5 @6 @7 @8 @9 @10 @11
- facts firstmate-11/tools: ↑ at @4 @5 @6 @7 @8 @9 @10 @11
- failures firstmate-11/line 1037: ↑ at @5
- chronology firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @5 @6
- multi-hop firstmate-11/multi-watcher-5415: ↑ at @5 @6 @7 @8
- rationale firstmate-11/why-imports-not-codex: ↑ at @5 @6
- identifiers firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @6
- failures firstmate-11/line 1658: ↑ at @6
- lessons firstmate-11/neg-tab-price: ↑ at @6
- failures firstmate-11/line 1813: ↑ at @7
- facts firstmate-11/scope-prod-write: ↑ at @7
- reversals firstmate-11/super-test-db: ↑ at @7
- failures firstmate-11/line 3044: ↑ at @9
- decisions firstmate-11/sbom-cause: ↑ at @9 @10 @11
- facts firstmate-11/exact-libheif-version: ↑ at @9 @10 @11
- rationale firstmate-11/why-date-backdate: ↑ at @9 @10 @11
- corrections firstmate-11/line 5039: ↑ at @10 @11
- asks firstmate-11/line 5039: ↑ at @10
- failures firstmate-11/line 3599: ↑ at @10
- commits firstmate-11/pr:1425: ↑ at @11
- failures firstmate-11/line 4201: ↑ at @11
- chronology firstmate-11/path:bin/fm-crew-state.sh: ↑ at @11

## Long chain (not in the total)

A: A af0940d@af0940d (long chain, every 5th cut)
B: B .scratch/omv-code/base5 (dir) (long chain, every 5th cut)

A sample 1: long 331 calls, 0 fresh
B sample 1: long 343 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 45.3 | 43.4 | -1.9 | 96/212 | 92/212 | 6 | 10 |
| constraints | 6 | 91.4 | 96.5 | +5.1 | 234/256 | 247/256 | 13 |  |
| verbatim | 5 | 89.1 | 97.3 | +8.1 | 230/258 | 251/258 | 21 |  |
| corrections | 8 | 66.5 | 70.3 | +3.9 | 343/516 | 363/516 | 22 | 2 |
| reversals | 6 | 44.3 | 44.3 | 0 | 90/203 | 90/203 | 18 | 18 |
| approvals | 5 | 54.2 | 50.0 | -4.2 | 26/48 | 24/48 |  | 2 |
| asks | 5 | 93.8 | 100.0 | +6.3 | 45/48 | 48/48 | 3 |  |
| in-progress | 5 | 76.0 | 72.0 | -4.0 | 19/25 | 18/25 |  | 1 |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 84.4 | 85.7 | +1.3 | 65/77 | 66/77 | 4 | 3 |
| commits | 4 | 65.0 | 84.7 | +19.7 | 119/183 | 155/183 | 40 | 4 |
| failures | 6 | 30.0 | 60.0 | +30.0 | 3/10 | 6/10 | 3 |  |
| facts | 5 | 32.6 | 40.2 | +7.6 | 294/903 | 363/903 | 84 | 15 |
| decisions | 5 | 23.2 | 29.1 | +5.9 | 75/323 | 94/323 | 30 | 11 |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 48.2 | 48.0 | -0.2 | 237/492 | 236/492 | 49 | 50 |
| absent | 5 | 100.0 | 98.0 | -2.0 | 294/294 | 288/294 |  | 6 |
| tokens | 6 | 7.2 | 8.8 | +1.5 | 0/16 | 0/16 |  |  |
| budget | 3 | 83.5 | 87.6 | +4.1 | 4/16 | 5/16 | 2 | 1 |
| **total** | | **53.8** | **59.7** | **+5.9** | 56.5% | 60.9% | **295** | **123** |

Per transcript: long 53.8 → 59.7 (+5.9).
Flips: 295 up, 123 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 86 up, 47 down, sign test p=0.00091. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: worse (B vs A: mean tokens -9%, reduction ratio -9%, model tokens +10%, critical-path calls per transcript +3.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 48k | 44k |
| context tokens per cut, max | 79k | 67k |
| reduction ratio (compacted / replaced), mean | 32.2% | 29.3% |
| Observer calls (tokens in / out) | 325 (5259k / 209k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 6 (209k / 19k) | 18 (537k / 55k) |
| model tokens in + out | 5695k | 6276k |
| critical-path calls (tokens in / out) | 113 (1849k / 64k) | 116 (2014k / 87k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (47 unique items):

- chronology long/path:tests/register.test.ts: ↑ at @55; ↓ at @65 @70 @75
- chronology long/path:.claude-plugin/plugin.json: ↑ at @80; ↓ at @10 @15 @35
- identifiers long/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↓ at @10 @15
- identifiers long/path:.claude-plugin/plugin.json: ↓ at @10
- identifiers long/path:~/.claude/plugins/data/observational-memory/stats: ↓ at @10
- chronology long/version:0.1.0: ↓ at @10 @15 @20
- chronology long/path:~/work/lanterns: ↓ at @10 @15 @20
- decisions long/om-v04-haiku-not-faster: ↓ at @15 @20
- approvals long/om-v04-scope:ctx-worktree: ↓ at @15 @20
- reversals long/om-v04-sup:stall-cause: ↓ at @15 @20 @25 @30 @35
- chronology long/path:/tmp/cctypes/claude-code.d.ts: ↓ at @20
- chronology long/path:/tmp/cctypes: ↓ at @20
- chronology long/uuid:c88abd43-9e84-435f-9568-5a04d505bb9e: ↓ at @20
- decisions long/om-v04-thinking-low: ↓ at @20
- decisions long/om-v04-neg:c029150-dropped: ↓ at @20
- facts long/om-v04-file:pi-isolation: ↓ at @20 @25 @30 @35
- facts long/long:clockmaker-clocks: ↓ at @20
- absent long/firstmate-11-abst-drug-quota: ↓ at @25 @30 @35 @40 @45 @50
- reversals long/om-v04-sup:subagent-observed: ↓ at @25 @30 @35
- reversals long/om-v04-sup:main-tests: ↓ at @25 @30 @35 @40 @45 @50 @80
- identifiers long/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↓ at @30
- identifiers long/version:1.1.0: ↓ at @40
- identifiers long/path:tests/eval/runner.ts: ↓ at @40
- identifiers long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings: ↓ at @40
- chronology long/om-v04-main-0.4.13: ↓ at @40 @45 @50
- facts long/firstmate-11-file-prod-change-backup: ↓ at @40 @45 @50
- facts long/firstmate-11-why-blank-body-block: ↓ at @40 @45 @50
- decisions long/om-orchestration-vcc-brief: ↓ at @45 @50
- reversals long/firstmate-11-line-items: ↓ at @50 @55 @60
- in-progress long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/estimates/actions/create-contract-dialog-template.tsx: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-retype-on-revise.test.ts: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↓ at @50
- facts long/firstmate-11-neg-address-split: ↓ at @50
- chronology long/om-orchestration-runner-merge: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ticket-7: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ticket-5: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ticket-6: ↓ at @55 @60 @65 @70 @75
- decisions long/om-orchestration-assistant-model: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ord:5-after-7: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ord:6-after-5: ↓ at @55 @60 @65 @70 @75
- identifiers long/path:tests/fm-brief.test.sh: ↓ at @60
- commits long/commit:940b47b: ↓ at @65 @70 @75 @80
- identifiers long/uuid:28895069-a753-4a74-88b2-e0d5d4628d43: ↓ at @75
- corrections long/line 44915: ↓ at @80
- corrections long/line 44927: ↓ at @80
- facts long/om-orchestration-neg:fallback-cause: ↓ at @80

Better in B (86 unique items):

- identifiers long/path:/tmp/om-v043/fixture.jsonl: ↑ at @10
- identifiers long/number:0.0039: ↑ at @10
- failures long/line 5573: ↑ at @15
- decisions long/om-v04-neg:vcc-install: ↑ at @15
- facts long/om-v04-file:prune-guards: ↑ at @15
- facts long/om-v04-hop:settle-error-fix: ↑ at @15
- decisions long/om-v04-why:parallel-order: ↑ at @15
- budget long/size: ↑ at @15 @20; ↓ at @55
- identifiers long/path:apps/web/.env.local: ↑ at @20
- decisions long/om-v04-neg:sched-reset: ↑ at @20 @25 @30
- facts long/om-v04-hop:made-up-answers: ↑ at @20 @25 @30 @35 @45 @50 @60
- decisions long/om-v04-why:gap-left: ↑ at @20 @25 @30
- chronology long/path:hooks/hooks.json: ↑ at @25 @30; ↓ at @5
- decisions long/om-v04-no-subagent-threshold: ↑ at @25 @30
- facts long/om-v04-todo-gap: ↑ at @25 @30 @35
- facts long/om-v04-hop:moved-transcript: ↑ at @25 @35
- decisions long/om-v04-why:skill-stub: ↑ at @25 @30 @35
- facts long/firstmate-11-tools: ↑ at @25 @30 @35 @40 @45 @50 @55 @60
- facts long/firstmate-11-file-captain-md: ↑ at @25 @30 @35
- failures long/line 13573: ↑ at @30
- corrections long/line 15568: ↑ at @35 @40 @45
- failures long/line 16161: ↑ at @35
- facts long/firstmate-11-multi-password-exposure: ↑ at @35
- facts long/firstmate-11-multi-gorman-prod-setup: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- reversals long/firstmate-11-order-rename-then-subject: ↑ at @35 @65 @70 @75 @80
- identifiers long/path:.worktrees/issue-11: ↑ at @40
- identifiers long/path:~/work/mods/compact-test: ↑ at @40
- commits long/pr:238: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- chronology long/path:/tmp/compact-test-last.json: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- chronology long/version:2.1.280: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- chronology long/path:~/work/mods/compact-test: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-exact-libheif-version: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-file:scenarios-fix: ↑ at @40 @45 @50
- facts long/om-orchestration-exact:rescored-results: ↑ at @40 @45 @50
- facts long/om-orchestration-exact:todo-fallback: ↑ at @40 @45 @50
- facts long/long:compact-test: ↑ at @40
- reversals long/firstmate-11-super-firstmate-pushed: ↑ at @40 @45 @50 @80
- reversals long/om-orchestration-rule:push-now: ↑ at @40 @45 @50 @80
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/apps/web/src/components/change-orders/void-signed-change-order-dialog.tsx: ↑ at @45
- facts long/firstmate-11-why-sbom-passed: ↑ at @45 @50 @55 @60; ↓ at @30 @35
- facts long/om-orchestration-sup:main-head-5: ↑ at @45 @50
- constraints long/firstmate-11-sonnet-low: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-single-pr: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-sonnet-low: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-email-subject: ↑ at @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-email-subject: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 12660: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 15720: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 19141: ↑ at @50
- corrections long/line 23568: ↑ at @50 @55
- corrections long/line 23987: ↑ at @50 @55
- asks long/line 24108: ↑ at @50
- asks long/line 24567: ↑ at @50
- asks long/line 27881: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/estimates/actions/create-contract-dialog.tsx: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/optional-documents.test.ts: ↑ at @50
- identifiers long/path:tests/eval/recall-plugin/hooks/prompts.ts: ↑ at @55
- constraints long/firstmate-11-email-subject: ↑ at @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-base-spec: ↑ at @55
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/4/oasis-pavers-and-pools-opie/apps/web/src/server/features/communications/communication-template.service.test.ts: ↑ at @55
- commits long/pr:1418: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1420: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1421: ↑ at @55 @60
- commits long/pr:1422: ↑ at @55 @60
- commits long/pr:1423: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1425: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/path:hooks/register.ts: ↑ at @55
- chronology long/issue:#1: ↑ at @55
- decisions long/om-v04-merge-recall: ↑ at @55 @60
- chronology long/firstmate-11-fork-push: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sign-pr: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sbom-followups-pr: ↑ at @55 @60
- decisions long/firstmate-11-sbom-cause: ↑ at @55 @60 @65 @70 @75 @80
- decisions long/firstmate-11-sbom-accepted: ↑ at @55 @60 @65 @70 @75 @80
- decisions long/om-orchestration-herdr-panes: ↑ at @55 @60
- facts long/om-orchestration-purpose:agent-teams-tickets: ↑ at @55 @60 @65 @70 @75
- facts long/om-orchestration-file:bench-baseline: ↑ at @55 @60
- facts long/long:auto-compact-window: ↑ at @55 @60 @65 @70 @75 @80
- reversals long/firstmate-11-order-sbom-prs: ↑ at @55 @60 @65 @75 @80
- commits long/commit:00b682b: ↑ at @80
- commits long/commit:7f4f391: ↑ at @80
- commits long/pr:1424: ↑ at @80
- decisions long/om-v04-why:timeout-not-retried: ↑ at @80
- chronology long/firstmate-11-street-address-pr: ↑ at @80
- facts long/firstmate-11-port: ↑ at @80
- facts long/om-orchestration-orchestration-log: ↑ at @80

Both ways (1 unique items):

- chronology long/path:.claude/types: ↑ at @80; ↓ at @20

Recall-aware credit (not in any total): A 32.7, B 43.4 (+10.7)

## Reflection chain (not in the total)

A: A af0940d@af0940d (reflection chain)
B: B .scratch/omv-code/base5 (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 43.7 | 50.7 | +7.1 | 117/268 | 136/268 | 29 | 10 |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 97.9 | 100.0 | +2.1 | 380/388 | 388/388 | 8 |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 98.9 | 100.0 | +1.1 | 92/93 | 93/93 | 1 |  |
| in-progress | 5 | 70.3 | 75.7 | +5.4 | 26/37 | 28/37 | 2 |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 90.6 | 95.3 | +4.7 | 58/64 | 61/64 | 6 | 3 |
| commits | 4 | 100.0 | 97.2 | -2.8 | 143/143 | 139/143 |  | 4 |
| failures | 6 | 25.7 | 91.4 | +65.7 | 9/35 | 32/35 | 23 |  |
| facts | 5 | 97.7 | 97.0 | -0.7 | 294/301 | 292/301 |  | 2 |
| chronology | 6 | 50.7 | 45.8 | -4.9 | 573/1131 | 518/1131 | 49 | 104 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 16.5 | 24.4 | +7.9 | 1/31 | 1/31 |  |  |
| budget | 3 | 89.3 | 95.8 | +6.5 | 12/31 | 21/31 | 9 |  |
| **total** | | **70.0** | **80.5** | **+10.6** | 77.7% | 77.8% | **127** | **123** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 70.0 → 80.5 (+10.6).
Flips: 127 up, 123 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 51 up, 29 down, sign test p=0.018. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens -15%, reduction ratio -14%, model tokens +0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 41k | 35k |
| context tokens per cut, max | 72k | 51k |
| reduction ratio (compacted / replaced), mean | 25.9% | 22.2% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (37k / 3.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (29 unique items):

- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043/fixture.jsonl: ↑ at @4 @5 @6; ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043: ↑ at @4 @6; ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp: ↓ at @3 @4 @5 @6 @7 @8 @9 @10 @11 @12 @13 @14 @15 @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.0029: ↓ at @5
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp: ↓ at @7
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/TODO.md: ↓ at @10 @11
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:openai-codex/gpt-5.6-luna: ↓ at @10 @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/version:1.0.0: ↓ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-bench/results.jsonl: ↓ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/const:CHUNK_TOKENS: ↓ at @11
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6/~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/workflows/scripts/ticket-wf_3c818956-577.js: ↓ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory/TODO.md: ↓ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:tests/eval/runner.ts: ↓ at @14
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory-prune: ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/commit:b8d5067: ↓ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/settings.json: ↓ at @16 @17 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/store/observational-memory_inline-8aabd6f3acbe.json: ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.003: ↓ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp2: ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/uuid:b8d50671-d9df-4001-9679-8d1ba9ec834c: ↓ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp2/run.py: ↓ at @16 @17 @18 @19
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↓ at @20 @23 @27
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/core/src/constants/index.ts: ↓ at @23 @24 @25 @26 @27
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1425: ↓ at @25 @26 @27
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/core/src/constants/index.ts: ↓ at @27
- facts om-v04+om-orchestration+firstmate-11+firstmate-6/lost-gorman-schema: ↓ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/communications.ts: ↓ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/validation.ts: ↓ at @30 @31
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1379: ↓ at @31

Better in B (51 unique items):

- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043/fixture.jsonl: ↑ at @2 @6
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie: ↑ at @3 @4 @5 @6 @7 @8 @9 @10 @11 @12 @13 @14 @15 @16 @17 @18 @19 @20 @21 @22 @24 @25 @26 @27 @28 @29 @30 @31
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:.claude-plugin/plugin.json: ↑ at @4 @5
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron-work-mods: ↑ at @4 @6
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/uuid:5fdeae60-01fd-46f7-910e-745a4011321c: ↑ at @4
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/commit:5fdeae6: ↑ at @4
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 2084: ↑ at @4 @6
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:.claude-plugin/plugin.json: ↑ at @4 @5
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie: ↑ at @6
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron-work-mods/5fdeae60-01fd-46f7-910e-745a4011321c/subagents: ↑ at @6
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 3438: ↑ at @7 @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.06: ↑ at @8
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 4349: ↑ at @9 @10
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory/.worktrees/issue-2: ↑ at @10
- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @10 @11 @12 @14 @16 @17 @19 @21 @22
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#5: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#6: ↑ at @11
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 7297: ↑ at @11 @12 @13
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.11: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.11: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$17.76: ↑ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory/docs/bench/2026-09-24-v1.0.0.jsonl: ↑ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-vcc: ↑ at @14
- in-progress om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/tests/bench.test.ts: ↑ at @14
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/tests/bench.test.ts: ↑ at @14 @15 @16
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 11867: ↑ at @16 @17
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:bin/fm-update.sh: ↑ at @17
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 12788: ↑ at @19
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 13409: ↑ at @20
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:tests/register.test.ts: ↑ at @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 13564: ↑ at @21
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/const:PRODUCTION_READ_ONLY_DATABASE_URL: ↑ at @23
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 14795: ↑ at @23
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @24
- corrections om-v04+om-orchestration+firstmate-11+firstmate-6/line 16790: ↑ at @24 @25 @26 @27 @28 @29 @30 @31
- asks om-v04+om-orchestration+firstmate-11+firstmate-6/line 16790: ↑ at @24
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 15350: ↑ at @24
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/firstmate/bin/fm-peek.sh: ↑ at @25
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 15952: ↑ at @25
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/firstmate/data/projects.md: ↑ at @26
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 17383: ↑ at @26 @28
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:ByteBotSoftware/oasis-pavers-and-pools-opie: ↑ at @28
- in-progress om-v04+om-orchestration+firstmate-11+firstmate-6//tmp/parse_q.py: ↑ at @29
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6//tmp/parse_q.py: ↑ at @29 @30 @31
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 19306: ↑ at @29 @30
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:Variance/pre-construction: ↑ at @30
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:apps/web/src/components/drug-testing/drug-test-list.tsx: ↑ at @30
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 19742: ↑ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/settings.ts: ↑ at @30 @31

## Holdout (mechanical gates only; not in the total)

A: A af0940d@af0940d (holdout)
B: B .scratch/omv-code/base5 (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 60.0 | 59.0 | -1.0 | 60/100 | 59/100 | 4 | 5 |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 | 1 | 1 |
| files-edited | 5 | 60.0 | 86.7 | +26.7 | 9/15 | 13/15 | 4 |  |
| commits | 4 | 100.0 | 97.4 | -2.6 | 38/38 | 37/38 |  | 1 |
| failures | 6 | 43.8 | 100.0 | +56.3 | 7/16 | 16/16 | 9 |  |
| chronology | 6 | 61.1 | 59.7 | -1.4 | 44/72 | 43/72 | 2 | 3 |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 57.0 | 69.5 | +12.5 | 1/14 | 1/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **75.3** | **82.9** | **+7.6** | 72.4% | 75.2% | **20** | **10** |

Per transcript: firstmate-6 70.2 → 81.9 (+11.7); crew-uspa-4 70.4 → 71.7 (+1.3); crew-opie-4 72.8 → 77.6 (+4.7).
Flips: 20 up, 10 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 12 up, 8 down, sign test p=0.50. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens -15%, reduction ratio -15%, model tokens -12%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ +0.7, 8 up / 3 down (6 / 3 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 24k | 20k |
| context tokens per cut, max | 40k | 31k |
| reduction ratio (compacted / replaced), mean | 15.1% | 12.9% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (512k / 35k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 547k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (8 unique items):

- identifiers firstmate-6/issue:#238: ↓ at @2
- commits firstmate-6/pr:1379: ↓ at @6
- identifiers crew-uspa-4/path:~/work/firstmate/data/uspa-multisession-smoke-rerun-b/shots: ↓ at @3 @4
- chronology crew-uspa-4/path:~/work/firstmate/data/uspa-multisession-smoke-rerun-b/shots: ↓ at @3 @4
- identifiers crew-opie-4/const:TEST_DATABASE_URL: ↓ at @2
- in-progress crew-opie-4/~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/job-info-report-yellow-fields.png: ↓ at @2
- identifiers crew-opie-4/path:~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/brief.md: ↓ at @3
- chronology crew-opie-4/path:~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/brief.md: ↓ at @3

Better in B (12 unique items):

- failures firstmate-6/line 85: ↑ at @1 @3
- chronology firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @3 @5
- in-progress firstmate-6//tmp/parse_q.py: ↑ at @4
- files-edited firstmate-6//tmp/parse_q.py: ↑ at @4 @5 @6
- failures firstmate-6/line 1838: ↑ at @4 @5
- identifiers firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @5
- failures firstmate-6/line 2274: ↑ at @5 @6
- identifiers crew-uspa-4/path:/tmp/uspa-b-exports: ↑ at @3
- identifiers crew-uspa-4/const:FETCH_HEAD: ↑ at @3
- identifiers crew-uspa-4/path:exports/scenarioC-B2fix: ↑ at @4
- failures crew-opie-4/line 1200: ↑ at @2 @3 @4
- files-edited crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.ts: ↑ at @4

# Compaction A/B

A: A af0940d@af0940d
B: B .scratch/omv-code/base7 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 55.6 | +8.2 | 98/207 | 115/207 | 25 | 8 |
| constraints | 6 | 100.0 | 96.2 | -3.8 | 106/106 | 102/106 |  | 4 |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 97.7 | 100.0 | +2.3 | 85/87 | 87/87 | 2 |  |
| reversals | 6 | 85.3 | 81.3 | -4.0 | 64/75 | 61/75 | 2 | 5 |
| approvals | 5 | 92.6 | 81.5 | -11.1 | 50/54 | 44/54 |  | 6 |
| asks | 5 | 98.6 | 100.0 | +1.4 | 73/74 | 74/74 | 1 |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 100.0 | +2.0 | 50/51 | 51/51 | 1 |  |
| failures | 6 | 36.4 | 86.4 | +50.0 | 8/22 | 19/22 | 11 |  |
| facts | 5 | 71.7 | 82.1 | +10.4 | 124/173 | 142/173 | 19 | 1 |
| decisions | 5 | 92.7 | 100.0 | +7.3 | 51/55 | 55/55 | 4 |  |
| lessons | 7 | 44.9 | 59.2 | +14.3 | 22/49 | 29/49 | 8 | 1 |
| file-state | 7 | 59.5 | 64.6 | +5.1 | 47/79 | 51/79 | 12 | 8 |
| multi-hop | 7 | 36.4 | 52.3 | +15.9 | 16/44 | 23/44 | 10 | 3 |
| rationale | 7 | 38.2 | 50.9 | +12.7 | 21/55 | 28/55 | 8 | 1 |
| chronology | 6 | 69.1 | 75.5 | +6.3 | 327/473 | 357/473 | 41 | 11 |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| purpose | 5 | 0.0 | 0.0 | 0 | 0/24 | 0/24 |  |  |
| tokens | 6 | 62.9 | 73.4 | +10.5 | 1/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **72.4** | **78.3** | **+5.9** | 76.1% | 80.6% | **144** | **48** |

Per transcript: om-orchestration 74.4 → 80.8 (+6.4); om-v04 74.5 → 80.0 (+5.4); firstmate-11 69.2 → 75.8 (+6.6).
Flips: 144 up, 48 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 63 up, 23 down, sign test p=0.000019. Passed counts are over all samples.

Verdict: B is better: 5.9 weighted points, 3 of 3 transcripts agree, 63 unique items flip to B against 23.
efficiency: better (B vs A: mean tokens -14%, reduction ratio -14%, model tokens -6%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ -1.7, 64 up / 100 down (29 / 37 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 22k | 19k |
| context tokens per cut, max | 36k | 31k |
| reduction ratio (compacted / replaced), mean | 14.1% | 12.1% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (23 unique items):

- identifiers om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @1
- identifiers om-orchestration/path:/tmp/om-bench/results.jsonl: ↓ at @2
- constraints om-orchestration/rule:worktree-only: ↓ at @2 @3 @4 @5
- chronology om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @3 @4 @5
- reversals om-orchestration/sup:live-harness: ↓ at @3 @4 @5
- identifiers om-orchestration/branch:issue-11: ↓ at @5
- lessons om-orchestration/neg:tool-search: ↓ at @5
- facts om-orchestration/exact:rescored-results: ↓ at @5
- chronology om-v04/path:hooks/prompts.ts: ↓ at @3 @4
- chronology om-v04/path:openai-codex/gpt-5.6-luna: ↓ at @3 @4 @6 @8
- identifiers om-v04/path:hooks/prompts.ts: ↓ at @4
- approvals om-v04/scope:ctx-worktree: ↓ at @4 @5 @6 @7 @8 @9
- chronology om-v04/usd:$0.0029: ↓ at @5
- identifiers om-v04/path:openai-codex/gpt-5.6-luna: ↓ at @6
- identifiers om-v04/path:tests/fixtures/crewmate.local.ts: ↓ at @6
- identifiers om-v04/path:.claude/types/claude-code.d.ts: ↓ at @6
- chronology om-v04/path:.claude/types: ↓ at @6
- multi-hop om-v04/hop:151-messages: ↓ at @7 @8 @9
- reversals om-v04/sup:subagent-observed: ↓ at @8 @9
- file-state firstmate-11/file-claude-json-key: ↓ at @5 @6 @7 @8 @9 @10 @11
- file-state firstmate-11/file-gorman-pdf-script: ↓ at @5
- rationale firstmate-11/why-sign-permission: ↓ at @6
- identifiers firstmate-11/path:data/opie-gorman-pdf-on-contract-signed/prod-dump/prod.dump: ↓ at @9

Better in B (63 unique items):

- facts om-orchestration/testing-backup: ↑ at @1 @2 @3 @4 @5
- file-state om-orchestration/file:testing-guide: ↑ at @1
- rationale om-orchestration/why:lanes: ↑ at @1 @2
- identifiers om-orchestration/path:tests/eval/bench.ts: ↑ at @2
- identifiers om-orchestration/path:tests/eval/scenarios.ts: ↑ at @2 @3
- failures om-orchestration/line 1105: ↑ at @2 @3 @4
- chronology om-orchestration/path:hooks/stats.ts: ↑ at @3 @4 @5
- file-state om-orchestration/file:scenarios-fix: ↑ at @4 @5
- multi-hop om-orchestration/hop:x-req-id: ↑ at @4 @5
- identifiers om-orchestration/path:hooks/stats.ts: ↑ at @5
- identifiers om-orchestration/version:1.1.0: ↑ at @5
- identifiers om-orchestration/path:~/work/mods/observational-memory/docs/bench/2026-09-24-v1.0.0.jsonl: ↑ at @5
- chronology om-orchestration/ticket-10: ↑ at @5
- facts om-orchestration/sup:v1-spend: ↑ at @5
- facts om-orchestration/sup:rr-run-cost: ↑ at @5
- identifiers om-v04/path:.claude-plugin/plugin.json: ↑ at @1 @2 @3 @4 @5 @8
- identifiers om-v04/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @2 @9
- chronology om-v04/path:.claude-plugin/plugin.json: ↑ at @3 @4 @5 @7 @8
- file-state om-v04/file:prune-guards: ↑ at @3 @4 @5 @6 @7 @8 @9
- chronology om-v04/path:/tmp/om-v043/fixture.jsonl: ↑ at @4 @5 @6 @7 @9
- identifiers om-v04/path:~/.pi/agent: ↑ at @5
- identifiers om-v04/path:/tmp/om-v043/fixture.jsonl: ↑ at @6 @7
- identifiers om-v04/const:OM_NO_PRUNE: ↑ at @6 @8
- chronology om-v04/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @6 @7 @8 @9
- lessons om-v04/neg:hook-output-refuted: ↑ at @6 @7 @8 @9
- reversals om-v04/sup:stall-cause: ↑ at @6
- identifiers om-v04/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↑ at @7
- lessons om-v04/neg:subagent-veto: ↑ at @7
- lessons om-v04/neg:vcc-install: ↑ at @7 @9
- multi-hop om-v04/hop:settle-error-fix: ↑ at @7 @8 @9
- chronology om-v04/order:parser-line-by-line: ↑ at @7 @8 @9
- identifiers om-v04/usd:$0.04: ↑ at @8
- identifiers om-v04/number:0.05: ↑ at @8
- identifiers om-v04/number:0.04: ↑ at @8
- identifiers om-v04/number:0.06: ↑ at @8
- file-state om-v04/file:parser-debug: ↑ at @8 @9
- decisions om-v04/merge-recall: ↑ at @9
- multi-hop om-v04/hop:made-up-answers: ↑ at @9
- rationale om-v04/why:skill-stub: ↑ at @9
- failures firstmate-11/line 116: ↑ at @2 @3
- chronology firstmate-11/path:main...origin/main: ↑ at @3 @4 @5 @6 @7 @8 @9 @10 @11
- chronology firstmate-11/path:data/secondmates.md: ↑ at @4 @5 @6 @7 @8 @9 @10 @11
- facts firstmate-11/tools: ↑ at @4 @5 @6 @7 @8 @9 @10 @11
- failures firstmate-11/line 1037: ↑ at @5
- chronology firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @5 @6
- multi-hop firstmate-11/multi-watcher-5415: ↑ at @5 @6 @7 @8
- rationale firstmate-11/why-imports-not-codex: ↑ at @5 @6
- identifiers firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @6
- failures firstmate-11/line 1658: ↑ at @6
- lessons firstmate-11/neg-tab-price: ↑ at @6
- failures firstmate-11/line 1813: ↑ at @7
- facts firstmate-11/scope-prod-write: ↑ at @7
- reversals firstmate-11/super-test-db: ↑ at @7
- failures firstmate-11/line 3044: ↑ at @9
- decisions firstmate-11/sbom-cause: ↑ at @9 @10 @11
- facts firstmate-11/exact-libheif-version: ↑ at @9 @10 @11
- rationale firstmate-11/why-date-backdate: ↑ at @9 @10 @11
- corrections firstmate-11/line 5039: ↑ at @10 @11
- asks firstmate-11/line 5039: ↑ at @10
- failures firstmate-11/line 3599: ↑ at @10
- commits firstmate-11/pr:1425: ↑ at @11
- failures firstmate-11/line 4201: ↑ at @11
- chronology firstmate-11/path:bin/fm-crew-state.sh: ↑ at @11

## Long chain (not in the total)

A: A af0940d@af0940d (long chain, every 5th cut)
B: B .scratch/omv-code/base7 (dir) (long chain, every 5th cut)

A sample 1: long 331 calls, 0 fresh
B sample 1: long 335 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 45.3 | 43.9 | -1.4 | 96/212 | 93/212 | 8 | 11 |
| constraints | 6 | 91.4 | 96.5 | +5.1 | 234/256 | 247/256 | 13 |  |
| verbatim | 5 | 89.1 | 100.0 | +10.9 | 230/258 | 258/258 | 28 |  |
| corrections | 8 | 66.5 | 99.6 | +33.1 | 343/516 | 514/516 | 171 |  |
| reversals | 6 | 44.3 | 45.8 | +1.5 | 90/203 | 93/203 | 18 | 15 |
| approvals | 5 | 54.2 | 50.0 | -4.2 | 26/48 | 24/48 |  | 2 |
| asks | 5 | 93.8 | 100.0 | +6.3 | 45/48 | 48/48 | 3 |  |
| in-progress | 5 | 76.0 | 72.0 | -4.0 | 19/25 | 18/25 |  | 1 |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 84.4 | 85.7 | +1.3 | 65/77 | 66/77 | 4 | 3 |
| commits | 4 | 65.0 | 84.7 | +19.7 | 119/183 | 155/183 | 40 | 4 |
| failures | 6 | 30.0 | 60.0 | +30.0 | 3/10 | 6/10 | 3 |  |
| facts | 5 | 32.6 | 42.4 | +9.9 | 294/903 | 383/903 | 105 | 16 |
| decisions | 5 | 23.2 | 28.8 | +5.6 | 75/323 | 93/323 | 30 | 12 |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 48.2 | 47.8 | -0.4 | 237/492 | 235/492 | 48 | 50 |
| absent | 5 | 100.0 | 98.0 | -2.0 | 294/294 | 288/294 |  | 6 |
| tokens | 6 | 7.2 | 10.1 | +2.9 | 0/16 | 0/16 |  |  |
| budget | 3 | 83.5 | 87.4 | +3.9 | 4/16 | 5/16 | 2 | 1 |
| **total** | | **53.8** | **61.8** | **+8.0** | 56.5% | 65.5% | **473** | **121** |

Per transcript: long 53.8 → 61.8 (+8.0).
Flips: 473 up, 121 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 110 up, 46 down, sign test p=3.2e-7. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: worse (B vs A: mean tokens -10%, reduction ratio -10%, model tokens +6%, critical-path calls per transcript +2.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 48k | 43k |
| context tokens per cut, max | 79k | 72k |
| reduction ratio (compacted / replaced), mean | 32.2% | 29.0% |
| Observer calls (tokens in / out) | 325 (5259k / 209k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 6 (209k / 19k) | 10 (321k / 34k) |
| model tokens in + out | 5695k | 6039k |
| critical-path calls (tokens in / out) | 113 (1849k / 64k) | 115 (1983k / 84k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (46 unique items):

- chronology long/path:tests/register.test.ts: ↑ at @55; ↓ at @65 @70 @75
- identifiers long/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↓ at @10 @15
- identifiers long/path:.claude-plugin/plugin.json: ↓ at @10
- identifiers long/path:~/.claude/plugins/data/observational-memory/stats: ↓ at @10
- chronology long/version:0.1.0: ↓ at @10 @15 @20
- chronology long/path:.claude-plugin/plugin.json: ↓ at @10 @15 @35
- chronology long/path:~/work/lanterns: ↓ at @10 @15 @20
- decisions long/om-v04-haiku-not-faster: ↓ at @15 @20
- approvals long/om-v04-scope:ctx-worktree: ↓ at @15 @20
- reversals long/om-v04-sup:stall-cause: ↓ at @15 @20 @25 @30 @35
- chronology long/path:/tmp/cctypes/claude-code.d.ts: ↓ at @20
- chronology long/path:/tmp/cctypes: ↓ at @20
- chronology long/uuid:c88abd43-9e84-435f-9568-5a04d505bb9e: ↓ at @20
- decisions long/om-v04-thinking-low: ↓ at @20
- decisions long/om-v04-neg:c029150-dropped: ↓ at @20
- facts long/om-v04-file:pi-isolation: ↓ at @20 @25 @30 @35
- facts long/long:clockmaker-clocks: ↓ at @20
- absent long/firstmate-11-abst-drug-quota: ↓ at @25 @30 @35 @40 @45 @50
- reversals long/om-v04-sup:subagent-observed: ↓ at @25 @30 @35
- reversals long/om-v04-sup:main-tests: ↓ at @25 @30 @35 @40 @45 @50 @80
- identifiers long/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↓ at @30
- identifiers long/version:1.1.0: ↓ at @40
- identifiers long/path:tests/eval/runner.ts: ↓ at @40
- identifiers long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings: ↓ at @40
- chronology long/om-v04-main-0.4.13: ↓ at @40 @45 @50
- facts long/firstmate-11-file-prod-change-backup: ↓ at @40 @45 @50
- facts long/firstmate-11-why-blank-body-block: ↓ at @40 @45 @50
- decisions long/om-orchestration-why:pin-new: ↓ at @40
- decisions long/om-orchestration-vcc-brief: ↓ at @45 @50
- in-progress long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/estimates/actions/create-contract-dialog-template.tsx: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-retype-on-revise.test.ts: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↓ at @50
- facts long/firstmate-11-neg-address-split: ↓ at @50
- chronology long/om-orchestration-runner-merge: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ticket-7: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ticket-5: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ticket-6: ↓ at @55 @60 @65 @70 @75
- decisions long/om-orchestration-assistant-model: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ord:5-after-7: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ord:6-after-5: ↓ at @55 @60 @65 @70 @75
- identifiers long/path:tests/fm-brief.test.sh: ↓ at @60
- commits long/commit:940b47b: ↓ at @65 @70 @75 @80
- facts long/om-orchestration-neg:fallback-cause: ↓ at @65 @80
- identifiers long/uuid:28895069-a753-4a74-88b2-e0d5d4628d43: ↓ at @75
- identifiers long/path:~/.claude/jobs/40c779b6/tmp/ideas-eff/sim.ts: ↓ at @80

Better in B (110 unique items):

- identifiers long/path:/tmp/om-v043/fixture.jsonl: ↑ at @10
- identifiers long/number:0.0039: ↑ at @10
- failures long/line 5573: ↑ at @15
- decisions long/om-v04-neg:vcc-install: ↑ at @15
- facts long/om-v04-file:prune-guards: ↑ at @15
- facts long/om-v04-hop:settle-error-fix: ↑ at @15
- decisions long/om-v04-why:parallel-order: ↑ at @15
- budget long/size: ↑ at @15 @20; ↓ at @55
- identifiers long/path:apps/web/.env.local: ↑ at @20
- decisions long/om-v04-neg:sched-reset: ↑ at @20 @25 @30
- facts long/om-v04-hop:made-up-answers: ↑ at @20 @25 @30 @35 @45 @50 @60
- decisions long/om-v04-why:gap-left: ↑ at @20 @25 @30
- chronology long/path:hooks/hooks.json: ↑ at @25 @30; ↓ at @5
- decisions long/om-v04-no-subagent-threshold: ↑ at @25 @30
- facts long/om-v04-todo-gap: ↑ at @25 @30 @35
- facts long/om-v04-hop:moved-transcript: ↑ at @25 @35
- decisions long/om-v04-why:skill-stub: ↑ at @25 @30 @35
- facts long/firstmate-11-tools: ↑ at @25 @30 @35 @40 @45 @50 @55 @60
- facts long/firstmate-11-file-captain-md: ↑ at @25 @30 @35
- failures long/line 13573: ↑ at @30
- corrections long/line 479: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75
- corrections long/line 719: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75
- corrections long/line 956: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- corrections long/line 972: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- corrections long/line 1045: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- corrections long/line 1103: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- corrections long/line 1143: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- corrections long/line 1450: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- corrections long/line 1632: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- corrections long/line 3548: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- corrections long/line 15568: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- failures long/line 16161: ↑ at @35
- facts long/firstmate-11-multi-password-exposure: ↑ at @35
- facts long/firstmate-11-multi-gorman-prod-setup: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- reversals long/firstmate-11-order-rename-then-subject: ↑ at @35 @65 @70 @75 @80
- identifiers long/path:.worktrees/issue-11: ↑ at @40
- identifiers long/path:~/work/mods/compact-test: ↑ at @40
- commits long/pr:238: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- chronology long/path:/tmp/compact-test-last.json: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- chronology long/version:2.1.280: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- chronology long/path:~/work/mods/compact-test: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-exact-libheif-version: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-file:scenarios-fix: ↑ at @40 @45 @50
- facts long/om-orchestration-exact:rescored-results: ↑ at @40 @45 @50
- facts long/om-orchestration-exact:todo-fallback: ↑ at @40 @45 @50
- facts long/long:compact-test: ↑ at @40
- reversals long/firstmate-11-super-firstmate-pushed: ↑ at @40 @45 @50 @80
- reversals long/om-orchestration-rule:push-now: ↑ at @40 @45 @50 @80
- facts long/om-v04-vcc-repo: ↑ at @45 @45 @50 @50 @55 @55 @60 @60 @65 @65 @70 @70 @75 @75 @80 @80
- corrections long/line 5646: ↑ at @45 @50 @55 @60 @65 @70 @75 @80
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/apps/web/src/components/change-orders/void-signed-change-order-dialog.tsx: ↑ at @45
- facts long/firstmate-11-why-sbom-passed: ↑ at @45 @50 @55 @60; ↓ at @30 @35
- facts long/om-orchestration-sup:main-head-5: ↑ at @45 @50
- constraints long/firstmate-11-sonnet-low: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-autofill-dates: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-single-pr: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-sonnet-low: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-email-subject: ↑ at @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-email-subject: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 12660: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 15431: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 15720: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 19141: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 23568: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 23987: ↑ at @50 @55 @60 @65 @70 @75 @80
- asks long/line 24108: ↑ at @50
- asks long/line 24567: ↑ at @50
- asks long/line 27881: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/estimates/actions/create-contract-dialog.tsx: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/optional-documents.test.ts: ↑ at @50
- identifiers long/path:tests/eval/recall-plugin/hooks/prompts.ts: ↑ at @55
- identifiers long/number:0.08: ↑ at @55 @75
- constraints long/firstmate-11-email-subject: ↑ at @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-base-spec: ↑ at @55
- facts long/om-orchestration-pi-extension: ↑ at @55 @60 @65 @70 @75 @80
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/4/oasis-pavers-and-pools-opie/apps/web/src/server/features/communications/communication-template.service.test.ts: ↑ at @55
- commits long/pr:1418: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1420: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1421: ↑ at @55 @60
- commits long/pr:1422: ↑ at @55 @60
- commits long/pr:1423: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1425: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/path:hooks/register.ts: ↑ at @55
- chronology long/issue:#1: ↑ at @55
- decisions long/om-v04-merge-recall: ↑ at @55 @60
- chronology long/firstmate-11-fork-push: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sign-pr: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sbom-followups-pr: ↑ at @55 @60
- decisions long/firstmate-11-sbom-cause: ↑ at @55 @60 @65 @70 @75 @80
- decisions long/firstmate-11-sbom-accepted: ↑ at @55 @60 @65 @70 @75 @80
- decisions long/om-orchestration-herdr-panes: ↑ at @55 @60
- facts long/om-orchestration-purpose:agent-teams-tickets: ↑ at @55 @60 @65 @70 @75
- facts long/om-orchestration-file:bench-baseline: ↑ at @55 @60
- facts long/long:auto-compact-window: ↑ at @55 @60 @65 @70 @75 @80
- reversals long/firstmate-11-order-sbom-prs: ↑ at @55 @60 @65 @75 @80
- corrections long/line 32181: ↑ at @60 @65 @70 @75 @80
- corrections long/line 36313: ↑ at @80
- corrections long/line 36857: ↑ at @80
- corrections long/line 37442: ↑ at @80
- corrections long/line 37578: ↑ at @80
- corrections long/line 37589: ↑ at @80
- corrections long/line 37688: ↑ at @80
- corrections long/line 37772: ↑ at @80
- corrections long/line 45395: ↑ at @80
- commits long/commit:00b682b: ↑ at @80
- commits long/commit:7f4f391: ↑ at @80
- commits long/pr:1424: ↑ at @80
- decisions long/om-v04-why:timeout-not-retried: ↑ at @80
- chronology long/firstmate-11-street-address-pr: ↑ at @80
- facts long/firstmate-11-port: ↑ at @80

Both ways (1 unique items):

- chronology long/path:.claude/types: ↑ at @80; ↓ at @20

Recall-aware credit (not in any total): A 32.7, B 43.6 (+10.8)

## Reflection chain (not in the total)

A: A af0940d@af0940d (reflection chain)
B: B .scratch/omv-code/base7 (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 43.7 | 50.7 | +7.1 | 117/268 | 136/268 | 29 | 10 |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 97.9 | 100.0 | +2.1 | 380/388 | 388/388 | 8 |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 98.9 | 100.0 | +1.1 | 92/93 | 93/93 | 1 |  |
| in-progress | 5 | 70.3 | 75.7 | +5.4 | 26/37 | 28/37 | 2 |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 90.6 | 95.3 | +4.7 | 58/64 | 61/64 | 6 | 3 |
| commits | 4 | 100.0 | 97.2 | -2.8 | 143/143 | 139/143 |  | 4 |
| failures | 6 | 25.7 | 91.4 | +65.7 | 9/35 | 32/35 | 23 |  |
| facts | 5 | 97.7 | 97.0 | -0.7 | 294/301 | 292/301 |  | 2 |
| chronology | 6 | 50.7 | 45.8 | -4.9 | 573/1131 | 518/1131 | 49 | 104 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 16.5 | 25.1 | +8.6 | 1/31 | 1/31 |  |  |
| budget | 3 | 89.3 | 96.3 | +7.0 | 12/31 | 22/31 | 10 |  |
| **total** | | **70.0** | **81.0** | **+11.0** | 77.7% | 77.8% | **128** | **123** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 70.0 → 81.0 (+11.0).
Flips: 128 up, 123 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 51 up, 29 down, sign test p=0.018. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens -16%, reduction ratio -15%, model tokens +0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 41k | 35k |
| context tokens per cut, max | 72k | 51k |
| reduction ratio (compacted / replaced), mean | 25.9% | 21.9% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (37k / 3.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (29 unique items):

- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043/fixture.jsonl: ↑ at @4 @5 @6; ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043: ↑ at @4 @6; ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp: ↓ at @3 @4 @5 @6 @7 @8 @9 @10 @11 @12 @13 @14 @15 @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.0029: ↓ at @5
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp: ↓ at @7
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/TODO.md: ↓ at @10 @11
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:openai-codex/gpt-5.6-luna: ↓ at @10 @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/version:1.0.0: ↓ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-bench/results.jsonl: ↓ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/const:CHUNK_TOKENS: ↓ at @11
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6/~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/workflows/scripts/ticket-wf_3c818956-577.js: ↓ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory/TODO.md: ↓ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:tests/eval/runner.ts: ↓ at @14
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory-prune: ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/commit:b8d5067: ↓ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/settings.json: ↓ at @16 @17 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/store/observational-memory_inline-8aabd6f3acbe.json: ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.003: ↓ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp2: ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/uuid:b8d50671-d9df-4001-9679-8d1ba9ec834c: ↓ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp2/run.py: ↓ at @16 @17 @18 @19
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↓ at @20 @23 @27
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/core/src/constants/index.ts: ↓ at @23 @24 @25 @26 @27
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1425: ↓ at @25 @26 @27
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/core/src/constants/index.ts: ↓ at @27
- facts om-v04+om-orchestration+firstmate-11+firstmate-6/lost-gorman-schema: ↓ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/communications.ts: ↓ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/validation.ts: ↓ at @30 @31
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1379: ↓ at @31

Better in B (51 unique items):

- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043/fixture.jsonl: ↑ at @2 @6
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie: ↑ at @3 @4 @5 @6 @7 @8 @9 @10 @11 @12 @13 @14 @15 @16 @17 @18 @19 @20 @21 @22 @24 @25 @26 @27 @28 @29 @30 @31
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:.claude-plugin/plugin.json: ↑ at @4 @5
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron-work-mods: ↑ at @4 @6
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/uuid:5fdeae60-01fd-46f7-910e-745a4011321c: ↑ at @4
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/commit:5fdeae6: ↑ at @4
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 2084: ↑ at @4 @6
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:.claude-plugin/plugin.json: ↑ at @4 @5
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie: ↑ at @6
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron-work-mods/5fdeae60-01fd-46f7-910e-745a4011321c/subagents: ↑ at @6
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 3438: ↑ at @7 @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.06: ↑ at @8
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 4349: ↑ at @9 @10
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory/.worktrees/issue-2: ↑ at @10
- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @10 @11 @12 @14 @16 @17 @19 @21 @22 @26
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#5: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#6: ↑ at @11
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 7297: ↑ at @11 @12 @13
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.11: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.11: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$17.76: ↑ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory/docs/bench/2026-09-24-v1.0.0.jsonl: ↑ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-vcc: ↑ at @14
- in-progress om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/tests/bench.test.ts: ↑ at @14
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/tests/bench.test.ts: ↑ at @14 @15 @16
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 11867: ↑ at @16 @17
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:bin/fm-update.sh: ↑ at @17
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 12788: ↑ at @19
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 13409: ↑ at @20
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:tests/register.test.ts: ↑ at @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 13564: ↑ at @21
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/const:PRODUCTION_READ_ONLY_DATABASE_URL: ↑ at @23
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 14795: ↑ at @23
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @24
- corrections om-v04+om-orchestration+firstmate-11+firstmate-6/line 16790: ↑ at @24 @25 @26 @27 @28 @29 @30 @31
- asks om-v04+om-orchestration+firstmate-11+firstmate-6/line 16790: ↑ at @24
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 15350: ↑ at @24
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/firstmate/bin/fm-peek.sh: ↑ at @25
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 15952: ↑ at @25
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/firstmate/data/projects.md: ↑ at @26
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 17383: ↑ at @26 @28
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:ByteBotSoftware/oasis-pavers-and-pools-opie: ↑ at @28
- in-progress om-v04+om-orchestration+firstmate-11+firstmate-6//tmp/parse_q.py: ↑ at @29
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6//tmp/parse_q.py: ↑ at @29 @30 @31
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 19306: ↑ at @29 @30
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:Variance/pre-construction: ↑ at @30
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:apps/web/src/components/drug-testing/drug-test-list.tsx: ↑ at @30
- failures om-v04+om-orchestration+firstmate-11+firstmate-6/line 19742: ↑ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/settings.ts: ↑ at @30 @31

## Holdout (mechanical gates only; not in the total)

A: A af0940d@af0940d (holdout)
B: B .scratch/omv-code/base7 (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 60.0 | 59.0 | -1.0 | 60/100 | 59/100 | 4 | 5 |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 | 1 | 1 |
| files-edited | 5 | 60.0 | 86.7 | +26.7 | 9/15 | 13/15 | 4 |  |
| commits | 4 | 100.0 | 97.4 | -2.6 | 38/38 | 37/38 |  | 1 |
| failures | 6 | 43.8 | 100.0 | +56.3 | 7/16 | 16/16 | 9 |  |
| chronology | 6 | 61.1 | 59.7 | -1.4 | 44/72 | 43/72 | 2 | 3 |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 57.0 | 69.5 | +12.5 | 1/14 | 1/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **75.3** | **82.9** | **+7.6** | 72.4% | 75.2% | **20** | **10** |

Per transcript: firstmate-6 70.2 → 81.9 (+11.7); crew-uspa-4 70.4 → 71.7 (+1.3); crew-opie-4 72.8 → 77.6 (+4.7).
Flips: 20 up, 10 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 12 up, 8 down, sign test p=0.50. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens -15%, reduction ratio -15%, model tokens -12%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ +0.7, 8 up / 3 down (6 / 3 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 24k | 20k |
| context tokens per cut, max | 40k | 31k |
| reduction ratio (compacted / replaced), mean | 15.1% | 12.9% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (512k / 35k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 547k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (8 unique items):

- identifiers firstmate-6/issue:#238: ↓ at @2
- commits firstmate-6/pr:1379: ↓ at @6
- identifiers crew-uspa-4/path:~/work/firstmate/data/uspa-multisession-smoke-rerun-b/shots: ↓ at @3 @4
- chronology crew-uspa-4/path:~/work/firstmate/data/uspa-multisession-smoke-rerun-b/shots: ↓ at @3 @4
- identifiers crew-opie-4/const:TEST_DATABASE_URL: ↓ at @2
- in-progress crew-opie-4/~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/job-info-report-yellow-fields.png: ↓ at @2
- identifiers crew-opie-4/path:~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/brief.md: ↓ at @3
- chronology crew-opie-4/path:~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/brief.md: ↓ at @3

Better in B (12 unique items):

- failures firstmate-6/line 85: ↑ at @1 @3
- chronology firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @3 @5
- in-progress firstmate-6//tmp/parse_q.py: ↑ at @4
- files-edited firstmate-6//tmp/parse_q.py: ↑ at @4 @5 @6
- failures firstmate-6/line 1838: ↑ at @4 @5
- identifiers firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @5
- failures firstmate-6/line 2274: ↑ at @5 @6
- identifiers crew-uspa-4/path:/tmp/uspa-b-exports: ↑ at @3
- identifiers crew-uspa-4/const:FETCH_HEAD: ↑ at @3
- identifiers crew-uspa-4/path:exports/scenarioC-B2fix: ↑ at @4
- failures crew-opie-4/line 1200: ↑ at @2 @3 @4
- files-edited crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.ts: ↑ at @4

## A af0940d@af0940d

Total: **72.4**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 98/207 | 53.7 | 45.2 | 42.9 |
| constraints | 6 | 100.0 | 106/106 | 100.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 97.7 | 85/87 | 100.0 | 100.0 | 96.0 |
| reversals | 6 | 85.3 | 64/75 | 100.0 | 50.0 | 95.3 |
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
| file-state | 7 | 59.5 | 47/79 | 58.8 | 57.1 | 61.0 |
| multi-hop | 7 | 36.4 | 16/44 | 33.3 | 42.1 | 31.3 |
| rationale | 7 | 38.2 | 21/55 | 8.3 | 70.6 | 30.8 |
| chronology | 6 | 69.1 | 327/473 | 77.4 | 66.0 | 67.7 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| purpose | 5 | 0.0 | 0/24 | 0.0 | 0.0 | 0.0 |
| tokens | 6 | 62.9 | 1/25 | 75.6 | 53.3 | 65.1 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **72.4** | 76.1% | 74.4 | 74.5 | 69.2 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 22k | 19k | 25k | 22k |
| context tokens per cut, max | 36k | 22k | 36k | 31k |
| reduction ratio (compacted / replaced), mean | 14.1% | 12.0% | 15.7% | 13.7% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 23 (331k / 17k) | 38 (541k / 27k) | 26 (355k / 19k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 348k | 568k | 374k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A af0940d@af0940d (holdout)

Total: **75.3**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 60.0 | 60/100 | 29.4 | 66.7 | 65.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 53.8 | 12.5 | 85.7 |
| files-edited | 5 | 60.0 | 9/15 | 33.3 | 100.0 | 75.0 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 43.8 | 7/16 | 33.3 | – | 57.1 |
| chronology | 6 | 61.1 | 44/72 | 62.5 | 50.0 | 77.3 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 57.0 | 1/14 | 78.4 | 56.2 | 25.7 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **75.3** | 72.4% | 70.2 | 70.4 | 72.8 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 24k | 18k | 24k | 33k |
| context tokens per cut, max | 40k | 24k | 29k | 40k |
| reduction ratio (compacted / replaced), mean | 15.1% | 11.3% | 15.3% | 20.7% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 16 (203k / 10k) | 16 (228k / 11k) | 12 (163k / 8.7k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 213k | 239k | 172k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A af0940d@af0940d (reflection chain)

Total: **70.0**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 43.7 | 117/268 | 43.7 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 97.9 | 380/388 | 97.9 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 98.9 | 92/93 | 98.9 |
| in-progress | 5 | 70.3 | 26/37 | 70.3 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 90.6 | 58/64 | 90.6 |
| commits | 4 | 100.0 | 143/143 | 100.0 |
| failures | 6 | 25.7 | 9/35 | 25.7 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 50.7 | 573/1131 | 50.7 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 16.5 | 1/31 | 16.5 |
| budget | 3 | 89.3 | 12/31 | 89.3 |
| **total** | | **70.0** | 77.7% | 70.0 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 41k | 41k |
| context tokens per cut, max | 72k | 72k |
| reduction ratio (compacted / replaced), mean | 25.9% | 25.9% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1656k / 79k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (38k / 4.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## A af0940d@af0940d (long chain, every 5th cut)

Total: **53.8**

sample 1: long 331 calls, 0 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 45.3 | 96/212 | 45.3 |
| constraints | 6 | 91.4 | 234/256 | 91.4 |
| verbatim | 5 | 89.1 | 230/258 | 89.1 |
| corrections | 8 | 66.5 | 343/516 | 66.5 |
| reversals | 6 | 44.3 | 90/203 | 44.3 |
| approvals | 5 | 54.2 | 26/48 | 54.2 |
| asks | 5 | 93.8 | 45/48 | 93.8 |
| in-progress | 5 | 76.0 | 19/25 | 76.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 84.4 | 65/77 | 84.4 |
| commits | 4 | 65.0 | 119/183 | 65.0 |
| failures | 6 | 30.0 | 3/10 | 30.0 |
| facts | 5 | 32.6 | 294/903 | 32.6 |
| decisions | 5 | 23.2 | 75/323 | 23.2 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 48.2 | 237/492 | 48.2 |
| absent | 5 | 100.0 | 294/294 | 100.0 |
| tokens | 6 | 7.2 | 0/16 | 7.2 |
| budget | 3 | 83.5 | 4/16 | 83.5 |
| **total** | | **53.8** | 56.5% | 53.8 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 48k | 48k |
| context tokens per cut, max | 79k | 79k |
| reduction ratio (compacted / replaced), mean | 32.2% | 32.2% |
| Observer calls (tokens in / out) | 325 (5259k / 209k) | 325 (5259k / 209k) |
| Reflector calls (tokens in / out) | 6 (209k / 19k) | 6 (209k / 19k) |
| model tokens in + out | 5695k | 5695k |
| critical-path calls (tokens in / out) | 113 (1849k / 64k) | 113 (1849k / 64k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **32.7** — 364 of 1284 hand-authored facts held, 113 more pointed to by a source range om_recall can follow (½ each).
Reached: 4 reflections (6 Reflector calls), 325 Observer calls; constraint tier peak ~5471 tokens at cut 80; constraint-cap fallbacks at none.

## B .scratch/omv-code/base4 (dir)

Total: **75.4**

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
| purpose | 5 | 0.0 | 0/24 | 0.0 | 0.0 | 0.0 |
| tokens | 6 | 79.5 | 4/25 | 91.1 | 69.4 | 82.6 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **75.4** | 77.5% | 79.3 | 75.3 | 72.7 |

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

## B .scratch/omv-code/base4 (dir) (holdout)

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

## B .scratch/omv-code/base4 (dir) (reflection chain)

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

## B .scratch/omv-code/base4 (dir) (long chain, every 5th cut)

Total: **59.9**

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
| facts | 5 | 33.6 | 303/903 | 33.6 |
| decisions | 5 | 25.4 | 82/323 | 25.4 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 52.4 | 258/492 | 52.4 |
| absent | 5 | 99.0 | 291/294 | 99.0 |
| tokens | 6 | 10.4 | 0/16 | 10.4 |
| budget | 3 | 88.4 | 6/16 | 88.4 |
| **total** | | **59.9** | 58.2% | 59.9 |

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

Recall-aware credit (not in any total): **35.4** — 385 of 1284 hand-authored facts held, 139 more pointed to by a source range om_recall can follow (½ each).
Reached: 4 reflections (6 Reflector calls), 325 Observer calls; constraint tier peak ~5471 tokens at cut 80; constraint-cap fallbacks at none.

## B .scratch/omv-code/base5 (dir)

Total: **78.3**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 55.6 | 115/207 | 58.2 | 61.9 | 42.9 |
| constraints | 6 | 96.2 | 102/106 | 92.2 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 81.3 | 61/75 | 78.6 | 44.4 | 97.7 |
| approvals | 5 | 81.5 | 44/54 | 100.0 | 74.4 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 82.1 | 142/173 | 94.0 | 76.8 | 77.6 |
| decisions | 5 | 100.0 | 55/55 | 100.0 | 100.0 | 100.0 |
| lessons | 7 | 59.2 | 29/49 | 83.3 | 78.3 | 30.0 |
| file-state | 7 | 64.6 | 51/79 | 76.5 | 100.0 | 41.5 |
| multi-hop | 7 | 52.3 | 23/44 | 55.6 | 47.4 | 56.3 |
| rationale | 7 | 50.9 | 28/55 | 25.0 | 76.5 | 46.2 |
| chronology | 6 | 75.5 | 357/473 | 78.3 | 70.4 | 80.1 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| purpose | 5 | 0.0 | 0/24 | 0.0 | 0.0 | 0.0 |
| tokens | 6 | 73.3 | 3/25 | 85.8 | 60.8 | 77.9 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **78.3** | 80.6% | 80.8 | 80.0 | 75.8 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 16k | 23k | 18k |
| context tokens per cut, max | 31k | 19k | 31k | 30k |
| reduction ratio (compacted / replaced), mean | 12.1% | 10.1% | 14.4% | 11.1% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 23 (295k / 19k) | 38 (526k / 31k) | 26 (325k / 21k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 314k | 557k | 346k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv-code/base5 (dir) (holdout)

Total: **82.9**

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
| tokens | 6 | 69.5 | 1/14 | 85.3 | 69.2 | 45.9 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **82.9** | 75.2% | 81.9 | 71.7 | 77.6 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 16k | 21k | 27k |
| context tokens per cut, max | 31k | 21k | 26k | 31k |
| reduction ratio (compacted / replaced), mean | 12.9% | 9.9% | 13.0% | 17.1% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 16 (184k / 12k) | 16 (188k / 13k) | 12 (139k / 9.9k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 196k | 202k | 149k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv-code/base5 (dir) (reflection chain)

Total: **80.5**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 50.7 | 136/268 | 50.7 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 75.7 | 28/37 | 75.7 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 97.2 | 139/143 | 97.2 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.0 | 292/301 | 97.0 |
| chronology | 6 | 45.8 | 518/1131 | 45.8 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 24.4 | 1/31 | 24.4 |
| budget | 3 | 95.8 | 21/31 | 95.8 |
| **total** | | **80.5** | 77.8% | 80.5 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 35k | 35k |
| context tokens per cut, max | 51k | 51k |
| reduction ratio (compacted / replaced), mean | 22.2% | 22.2% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (37k / 3.6k) | 1 (37k / 3.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv-code/base5 (dir) (long chain, every 5th cut)

Total: **59.7**

sample 1: long 343 calls, 0 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 43.4 | 92/212 | 43.4 |
| constraints | 6 | 96.5 | 247/256 | 96.5 |
| verbatim | 5 | 97.3 | 251/258 | 97.3 |
| corrections | 8 | 70.3 | 363/516 | 70.3 |
| reversals | 6 | 44.3 | 90/203 | 44.3 |
| approvals | 5 | 50.0 | 24/48 | 50.0 |
| asks | 5 | 100.0 | 48/48 | 100.0 |
| in-progress | 5 | 72.0 | 18/25 | 72.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 85.7 | 66/77 | 85.7 |
| commits | 4 | 84.7 | 155/183 | 84.7 |
| failures | 6 | 60.0 | 6/10 | 60.0 |
| facts | 5 | 40.2 | 363/903 | 40.2 |
| decisions | 5 | 29.1 | 94/323 | 29.1 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 48.0 | 236/492 | 48.0 |
| absent | 5 | 98.0 | 288/294 | 98.0 |
| tokens | 6 | 8.8 | 0/16 | 8.8 |
| budget | 3 | 87.6 | 5/16 | 87.6 |
| **total** | | **59.7** | 60.9% | 59.7 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 44k | 44k |
| context tokens per cut, max | 67k | 67k |
| reduction ratio (compacted / replaced), mean | 29.3% | 29.3% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 18 (537k / 55k) | 18 (537k / 55k) |
| model tokens in + out | 6276k | 6276k |
| critical-path calls (tokens in / out) | 116 (2014k / 87k) | 116 (2014k / 87k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **43.4** — 432 of 1284 hand-authored facts held, 251 more pointed to by a source range om_recall can follow (½ each).
Reached: 6 reflections (18 Reflector calls), 325 Observer calls; constraint tier peak ~6040 tokens at cut 80; constraint-cap fallbacks at none.

## B .scratch/omv-code/base7 (dir)

Total: **78.3**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 55.6 | 115/207 | 58.2 | 61.9 | 42.9 |
| constraints | 6 | 96.2 | 102/106 | 92.2 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 81.3 | 61/75 | 78.6 | 44.4 | 97.7 |
| approvals | 5 | 81.5 | 44/54 | 100.0 | 74.4 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 82.1 | 142/173 | 94.0 | 76.8 | 77.6 |
| decisions | 5 | 100.0 | 55/55 | 100.0 | 100.0 | 100.0 |
| lessons | 7 | 59.2 | 29/49 | 83.3 | 78.3 | 30.0 |
| file-state | 7 | 64.6 | 51/79 | 76.5 | 100.0 | 41.5 |
| multi-hop | 7 | 52.3 | 23/44 | 55.6 | 47.4 | 56.3 |
| rationale | 7 | 50.9 | 28/55 | 25.0 | 76.5 | 46.2 |
| chronology | 6 | 75.5 | 357/473 | 78.3 | 70.4 | 80.1 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| purpose | 5 | 0.0 | 0/24 | 0.0 | 0.0 | 0.0 |
| tokens | 6 | 73.4 | 3/25 | 85.8 | 60.9 | 78.0 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **78.3** | 80.6% | 80.8 | 80.0 | 75.8 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 16k | 23k | 18k |
| context tokens per cut, max | 31k | 19k | 31k | 30k |
| reduction ratio (compacted / replaced), mean | 12.1% | 10.1% | 14.4% | 11.1% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 23 (295k / 19k) | 38 (526k / 31k) | 26 (325k / 21k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 314k | 557k | 346k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv-code/base7 (dir) (holdout)

Total: **82.9**

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
| tokens | 6 | 69.5 | 1/14 | 85.3 | 69.2 | 45.9 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **82.9** | 75.2% | 81.9 | 71.7 | 77.6 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 16k | 21k | 27k |
| context tokens per cut, max | 31k | 21k | 26k | 31k |
| reduction ratio (compacted / replaced), mean | 12.9% | 9.9% | 13.0% | 17.1% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 16 (184k / 12k) | 16 (188k / 13k) | 12 (139k / 9.9k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 196k | 202k | 149k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv-code/base7 (dir) (reflection chain)

Total: **81.0**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 50.7 | 136/268 | 50.7 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 75.7 | 28/37 | 75.7 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 97.2 | 139/143 | 97.2 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.0 | 292/301 | 97.0 |
| chronology | 6 | 45.8 | 518/1131 | 45.8 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 25.1 | 1/31 | 25.1 |
| budget | 3 | 96.3 | 22/31 | 96.3 |
| **total** | | **81.0** | 77.8% | 81.0 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 35k | 35k |
| context tokens per cut, max | 51k | 51k |
| reduction ratio (compacted / replaced), mean | 21.9% | 21.9% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (37k / 3.6k) | 1 (37k / 3.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv-code/base7 (dir) (long chain, every 5th cut)

Total: **61.8**

sample 1: long 335 calls, 0 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 43.9 | 93/212 | 43.9 |
| constraints | 6 | 96.5 | 247/256 | 96.5 |
| verbatim | 5 | 100.0 | 258/258 | 100.0 |
| corrections | 8 | 99.6 | 514/516 | 99.6 |
| reversals | 6 | 45.8 | 93/203 | 45.8 |
| approvals | 5 | 50.0 | 24/48 | 50.0 |
| asks | 5 | 100.0 | 48/48 | 100.0 |
| in-progress | 5 | 72.0 | 18/25 | 72.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 85.7 | 66/77 | 85.7 |
| commits | 4 | 84.7 | 155/183 | 84.7 |
| failures | 6 | 60.0 | 6/10 | 60.0 |
| facts | 5 | 42.4 | 383/903 | 42.4 |
| decisions | 5 | 28.8 | 93/323 | 28.8 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 47.8 | 235/492 | 47.8 |
| absent | 5 | 98.0 | 288/294 | 98.0 |
| tokens | 6 | 10.1 | 0/16 | 10.1 |
| budget | 3 | 87.4 | 5/16 | 87.4 |
| **total** | | **61.8** | 65.5% | 61.8 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 43k | 43k |
| context tokens per cut, max | 72k | 72k |
| reduction ratio (compacted / replaced), mean | 29.0% | 29.0% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 10 (321k / 34k) | 10 (321k / 34k) |
| model tokens in + out | 6039k | 6039k |
| critical-path calls (tokens in / out) | 115 (1983k / 84k) | 115 (1983k / 84k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **43.6** — 437 of 1284 hand-authored facts held, 245 more pointed to by a source range om_recall can follow (½ each).
Reached: 6 reflections (10 Reflector calls), 325 Observer calls; constraint tier peak ~6040 tokens at cut 80; constraint-cap fallbacks at none.

