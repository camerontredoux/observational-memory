# Against A /tmp/omv-code/base7 (dir): 78.3; reflection chain 81.0; long chain 61.8, recall-aware 43.6

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | chain Δ | long Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---|
| B /tmp/omv-code/rowcap (dir) | 78.3 | 0 | 0 / 0 / 0 | 0 | 0 | 1.0 | exact | – | same | – | 0 (9↑ 4↓) | -1.1 (34↑ 31↓); recall-aware 41.6 (-2.0) |

# Compaction A/B

A: A /tmp/omv-code/base7 (dir)
B: B /tmp/omv-code/rowcap (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 55.6 | 55.6 | 0 | 115/207 | 115/207 |  |  |
| constraints | 6 | 96.2 | 96.2 | 0 | 102/106 | 102/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 81.3 | 81.3 | 0 | 61/75 | 61/75 |  |  |
| approvals | 5 | 81.5 | 81.5 | 0 | 44/54 | 44/54 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 100.0 | 100.0 | 0 | 51/51 | 51/51 |  |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 82.1 | 82.1 | 0 | 142/173 | 142/173 |  |  |
| decisions | 5 | 100.0 | 100.0 | 0 | 55/55 | 55/55 |  |  |
| lessons | 7 | 59.2 | 59.2 | 0 | 29/49 | 29/49 |  |  |
| file-state | 7 | 64.6 | 64.6 | 0 | 51/79 | 51/79 |  |  |
| multi-hop | 7 | 52.3 | 52.3 | 0 | 23/44 | 23/44 |  |  |
| rationale | 7 | 50.9 | 50.9 | 0 | 28/55 | 28/55 |  |  |
| chronology | 6 | 75.5 | 75.5 | 0 | 357/473 | 357/473 |  |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| purpose | 5 | 0.0 | 0.0 | 0 | 0/24 | 0/24 |  |  |
| tokens | 6 | 73.4 | 73.4 | 0 | 3/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.3** | **78.3** | **0** | 80.6% | 80.6% | **0** | **0** |

Per transcript: om-orchestration 80.8 → 80.8 (0); om-v04 80.0 → 80.0 (0); firstmate-11 75.8 → 75.8 (0).
Flips: 0 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 0 up, 0 down, sign test p=1.0. Passed counts are over all samples.

Verdict: no difference.
efficiency: same (B vs A: mean tokens 0%, reduction ratio 0%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 19k |
| context tokens per cut, max | 31k | 31k |
| reduction ratio (compacted / replaced), mean | 12.1% | 12.1% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (0 unique items):


## Long chain (not in the total)

A: A /tmp/omv-code/base7 (dir) (long chain, every 5th cut)
B: B /tmp/omv-code/rowcap (dir) (long chain, every 5th cut)

A sample 1: long 335 calls, 0 fresh
B sample 1: long 291 calls, 188 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 43.9 | 45.8 | +1.9 | 93/212 | 97/212 | 6 | 2 |
| constraints | 6 | 96.5 | 96.5 | 0 | 247/256 | 247/256 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 258/258 | 258/258 |  |  |
| corrections | 8 | 99.6 | 99.6 | 0 | 514/516 | 514/516 |  |  |
| reversals | 6 | 45.8 | 49.8 | +3.9 | 93/203 | 101/203 | 16 | 8 |
| approvals | 5 | 50.0 | 50.0 | 0 | 24/48 | 24/48 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 48/48 | 48/48 |  |  |
| in-progress | 5 | 72.0 | 84.0 | +12.0 | 18/25 | 21/25 | 3 |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 85.7 | 88.3 | +2.6 | 66/77 | 68/77 | 5 | 3 |
| commits | 4 | 84.7 | 79.2 | -5.5 | 155/183 | 145/183 | 4 | 14 |
| failures | 6 | 60.0 | 60.0 | 0 | 6/10 | 6/10 |  |  |
| facts | 5 | 42.4 | 41.9 | -0.6 | 383/903 | 378/903 | 31 | 36 |
| decisions | 5 | 28.8 | 36.5 | +7.7 | 93/323 | 118/323 | 32 | 7 |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 47.8 | 41.9 | -5.9 | 235/492 | 206/492 | 1 | 30 |
| absent | 5 | 98.0 | 98.0 | 0 | 288/294 | 288/294 | 3 | 3 |
| tokens | 6 | 10.1 | 10.3 | +0.2 | 0/16 | 0/16 |  |  |
| budget | 3 | 87.4 | 84.9 | -2.5 | 5/16 | 5/16 |  |  |
| **total** | | **61.8** | **60.8** | **-1.1** | 65.5% | 65.5% | **101** | **103** |

Per transcript: long 61.8 → 60.8 (-1.1).
Flips: 101 up, 103 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 34 up, 31 down, sign test p=0.80. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens +2%, reduction ratio +2%, model tokens -12%, critical-path calls per transcript -111.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 43k | 45k |
| context tokens per cut, max | 72k | 73k |
| reduction ratio (compacted / replaced), mean | 29.1% | 29.7% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 283 (4802k / 220k) |
| Reflector calls (tokens in / out) | 10 (321k / 34k) | 8 (253k / 28k) |
| model tokens in + out | 6039k | 5303k |
| critical-path calls (tokens in / out) | 115 (1983k / 84k) | 4 (52k / 2.9k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (31 unique items):

- reversals long/firstmate-11-super-firstmate-pushed: ↑ at @55; ↓ at @40 @45 @50 @80
- facts long/firstmate-11-multi-gorman-prod-setup: ↓ at @35 @40 @45 @65 @70 @75 @80
- chronology long/path:/tmp/compact-test-last.json: ↓ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-port: ↓ at @40 @45 @65 @70 @75 @80
- facts long/om-orchestration-neg:fallback-cause: ↓ at @40 @45 @50 @60 @70 @75
- facts long/om-orchestration-exact:rescored-results: ↓ at @40 @45 @50
- absent long/om-v04-no-remote: ↓ at @40 @45 @50
- reversals long/om-orchestration-rule:push-now: ↓ at @40 @45 @50 @80
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/apps/web/src/components/change-orders/void-signed-change-order-dialog-template.tsx: ↓ at @45
- facts long/firstmate-11-why-sbom-passed: ↓ at @45 @50 @55 @60
- identifiers long/path:apps/web/src/server/integrations/esignature/documenso.ts: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/estimates/actions/stories/create-contract-dialog-template.stories.tsx: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/contracts/contract-detail-template.tsx: ↓ at @50
- facts long/om-orchestration-file:bench-baseline: ↓ at @55 @60
- commits long/pr:238: ↓ at @65 @70 @75 @80
- commits long/pr:1418: ↓ at @65 @70 @75 @80
- commits long/pr:1419: ↓ at @65 @70 @75 @80
- chronology long/version:2.1.280: ↓ at @65 @70 @75 @80
- chronology long/path:~/work/mods/compact-test: ↓ at @65 @70 @75 @80
- chronology long/firstmate-11-fork-push: ↓ at @65 @70 @75 @80
- chronology long/firstmate-11-sign-pr: ↓ at @65 @70 @75 @80
- chronology long/firstmate-11-save-fix-pr: ↓ at @65 @70 @75 @80
- decisions long/firstmate-11-sbom-cause: ↓ at @65 @70 @75 @80
- decisions long/firstmate-11-blank-body: ↓ at @65 @80
- facts long/firstmate-11-multi-prod-dump: ↓ at @65 @70 @75 @80
- facts long/firstmate-11-exact-libheif-version: ↓ at @65 @70 @75 @80
- identifiers long/path:docs/plans/ideas/efficiency.md: ↓ at @80
- commits long/commit:9466e8a: ↓ at @80
- commits long/commit:52891de: ↓ at @80
- chronology long/path:.claude/types: ↓ at @80
- decisions long/om-v04-why:timeout-not-retried: ↓ at @80

Better in B (34 unique items):

- identifiers long/path:~/work/firstmate/state/opie-line-items-disappeared.inbox/handled: ↑ at @35
- identifiers long/path:~/work/firstmate/state/opie-line-items-disappeared.status: ↑ at @35
- decisions long/om-v04-neg:sched-reset: ↑ at @35
- facts long/om-v04-hop:brief-pinned: ↑ at @35 @60
- decisions long/om-v04-why:gap-left: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-contract: ↑ at @35 @40 @45 @50 @55 @60
- facts long/long:v031-speed: ↑ at @35
- reversals long/firstmate-11-super-test-contract: ↑ at @35 @40 @45 @50 @55 @60
- identifiers long/path:hooks/stats.ts: ↑ at @40
- identifiers long/version:1.1.0: ↑ at @40
- identifiers long/path:tests/eval/runner.ts: ↑ at @40
- facts long/firstmate-11-file-captain-md: ↑ at @40 @45 @50 @55 @60
- facts long/firstmate-11-exact-db-url-var: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-testing-backup: ↑ at @40 @45 @50
- decisions long/om-orchestration-why:threshold: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- absent long/firstmate-11-abst-drug-quota: ↑ at @40 @45 @50
- reversals long/om-v04-sup:failure-cause: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- in-progress long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/packages/db/tmp-void-shots-seed.ts: ↑ at @45
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/packages/db/tmp-void-shots-seed.ts: ↑ at @45
- decisions long/om-orchestration-vcc-brief: ↑ at @45 @50
- in-progress long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-document-matching.test.ts: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-retype-on-revise.test.ts: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↑ at @50
- chronology long/path:hooks/hooks.json: ↑ at @55
- decisions long/om-orchestration-reviewer-model: ↑ at @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-orchestration-log: ↑ at @55
- facts long/om-orchestration-file:legacy-recall: ↑ at @55 @60
- commits long/commit:940b47b: ↑ at @65 @70 @75 @80
- decisions long/om-v04-merge-recall: ↑ at @65 @70 @75 @80
- facts long/om-v04-hop:made-up-answers: ↑ at @65 @80
- in-progress long/~/.treehouse/firstmate-a43bdc/1/firstmate/AGENTS.md: ↑ at @70
- files-edited long/~/.treehouse/firstmate-a43bdc/1/firstmate/AGENTS.md: ↑ at @70
- identifiers long/usd:$0.08: ↑ at @75

Recall-aware credit (not in any total): A 43.6, B 41.6 (-2.0)

## Reflection chain (not in the total)

A: A /tmp/omv-code/base7 (dir) (reflection chain)
B: B /tmp/omv-code/rowcap (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 17 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 50.7 | 50.4 | -0.4 | 136/268 | 135/268 |  | 1 |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 388/388 | 388/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 93/93 | 93/93 |  |  |
| in-progress | 5 | 75.7 | 75.7 | 0 | 28/37 | 28/37 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 |  |  |
| commits | 4 | 97.2 | 99.3 | +2.1 | 139/143 | 142/143 | 3 |  |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.0 | 97.7 | +0.7 | 292/301 | 294/301 | 2 |  |
| chronology | 6 | 45.8 | 45.9 | +0.1 | 518/1131 | 519/1131 | 4 | 3 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 25.1 | 25.1 | 0 | 1/31 | 1/31 |  |  |
| budget | 3 | 96.3 | 96.2 | -0.1 | 22/31 | 22/31 |  |  |
| **total** | | **81.0** | **81.0** | **0** | 77.8% | 78.0% | **9** | **4** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.0 → 81.0 (0).
Flips: 9 up, 4 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 4 up, 2 down, sign test p=0.69. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +0%, reduction ratio +0%, model tokens +0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 35k | 35k |
| context tokens per cut, max | 51k | 51k |
| reduction ratio (compacted / replaced), mean | 21.9% | 21.9% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (37k / 3.6k) | 1 (37k / 3.6k) |
| model tokens in + out | 1777k | 1778k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (2 unique items):

- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/settings.ts: ↓ at @29 @30 @31
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:Variance/pre-construction: ↓ at @30

Better in B (4 unique items):

- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1425: ↑ at @25 @26 @27
- facts om-v04+om-orchestration+firstmate-11+firstmate-6/lost-gorman-schema: ↑ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/communications.ts: ↑ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/validation.ts: ↑ at @30 @31

## A /tmp/omv-code/base7 (dir)

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

## A /tmp/omv-code/base7 (dir) (reflection chain)

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

## A /tmp/omv-code/base7 (dir) (long chain, every 5th cut)

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
| reduction ratio (compacted / replaced), mean | 29.1% | 29.1% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 10 (321k / 34k) | 10 (321k / 34k) |
| model tokens in + out | 6039k | 6039k |
| critical-path calls (tokens in / out) | 115 (1983k / 84k) | 115 (1983k / 84k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **43.6** — 437 of 1284 hand-authored facts held, 245 more pointed to by a source range om_recall can follow (½ each).
Reached: 6 reflections (10 Reflector calls), 325 Observer calls; constraint tier peak ~6040 tokens at cut 80; constraint-cap fallbacks at none.

## B /tmp/omv-code/rowcap (dir)

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

## B /tmp/omv-code/rowcap (dir) (reflection chain)

Total: **81.0**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 17 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 50.4 | 135/268 | 50.4 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 98.1 | 53/54 | 98.1 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 75.7 | 28/37 | 75.7 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 99.3 | 142/143 | 99.3 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 45.9 | 519/1131 | 45.9 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 25.1 | 1/31 | 25.1 |
| budget | 3 | 96.2 | 22/31 | 96.2 |
| **total** | | **81.0** | 78.0% | 81.0 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 35k | 35k |
| context tokens per cut, max | 51k | 51k |
| reduction ratio (compacted / replaced), mean | 21.9% | 21.9% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (37k / 3.6k) | 1 (37k / 3.6k) |
| model tokens in + out | 1778k | 1778k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/rowcap (dir) (long chain, every 5th cut)

Total: **60.8**

sample 1: long 291 calls, 188 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 45.8 | 97/212 | 45.8 |
| constraints | 6 | 96.5 | 247/256 | 96.5 |
| verbatim | 5 | 100.0 | 258/258 | 100.0 |
| corrections | 8 | 99.6 | 514/516 | 99.6 |
| reversals | 6 | 49.8 | 101/203 | 49.8 |
| approvals | 5 | 50.0 | 24/48 | 50.0 |
| asks | 5 | 100.0 | 48/48 | 100.0 |
| in-progress | 5 | 84.0 | 21/25 | 84.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 88.3 | 68/77 | 88.3 |
| commits | 4 | 79.2 | 145/183 | 79.2 |
| failures | 6 | 60.0 | 6/10 | 60.0 |
| facts | 5 | 41.9 | 378/903 | 41.9 |
| decisions | 5 | 36.5 | 118/323 | 36.5 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 41.9 | 206/492 | 41.9 |
| absent | 5 | 98.0 | 288/294 | 98.0 |
| tokens | 6 | 10.3 | 0/16 | 10.3 |
| budget | 3 | 84.9 | 5/16 | 84.9 |
| **total** | | **60.8** | 65.5% | 60.8 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 45k | 45k |
| context tokens per cut, max | 73k | 73k |
| reduction ratio (compacted / replaced), mean | 29.7% | 29.7% |
| Observer calls (tokens in / out) | 283 (4802k / 220k) | 283 (4802k / 220k) |
| Reflector calls (tokens in / out) | 8 (253k / 28k) | 8 (253k / 28k) |
| model tokens in + out | 5303k | 5303k |
| critical-path calls (tokens in / out) | 4 (52k / 2.9k) | 4 (52k / 2.9k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **41.6** — 445 of 1284 hand-authored facts held, 178 more pointed to by a source range om_recall can follow (½ each).
Reached: 6 reflections (8 Reflector calls), 283 Observer calls; constraint tier peak ~5284 tokens at cut 80; constraint-cap fallbacks at none.

