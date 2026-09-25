# Against A /tmp/omv-code/base7 (dir): 78.3; holdout 82.9; reflection chain 81.0; long chain 61.8, recall-aware 43.6

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) | chain Δ | long Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---:|---|
| B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir) | 82.9 | +4.6 | +1.7 / +5.4 / +5.2 | 29 | 0 | 3.7e-9 | exact | B | same | multi-hop +1.4, lessons +1.1, rationale +0.8, file-state +0.4 | +0.6 (5↑ 0↓) | -0.2 (165↑ 17↓) | -0.5 (82↑ 79↓); recall-aware 41.3 (-2.3) |

# Compaction A/B

A: A /tmp/omv-code/base7 (dir)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 55.6 | 59.9 | +4.3 | 115/207 | 124/207 | 9 |  |
| constraints | 6 | 96.2 | 96.2 | 0 | 102/106 | 102/106 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 81.3 | 90.7 | +9.3 | 61/75 | 68/75 | 7 |  |
| approvals | 5 | 81.5 | 81.5 | 0 | 44/54 | 44/54 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 100.0 | 100.0 | 0 | 51/51 | 51/51 |  |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 82.1 | 89.0 | +6.9 | 142/173 | 154/173 | 12 |  |
| decisions | 5 | 100.0 | 100.0 | 0 | 55/55 | 55/55 |  |  |
| lessons | 7 | 59.2 | 81.6 | +22.4 | 29/49 | 40/49 | 11 |  |
| file-state | 7 | 64.6 | 73.4 | +8.9 | 51/79 | 58/79 | 7 |  |
| multi-hop | 7 | 52.3 | 79.5 | +27.3 | 23/44 | 35/44 | 12 |  |
| rationale | 7 | 50.9 | 67.3 | +16.4 | 28/55 | 37/55 | 9 |  |
| chronology | 6 | 75.5 | 79.3 | +3.8 | 357/473 | 375/473 | 18 |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| purpose | 5 | 0.0 | 0.0 | 0 | 0/24 | 0/24 |  |  |
| tokens | 6 | 73.4 | 67.1 | -6.3 | 3/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.3** | **82.9** | **+4.6** | 80.6% | 84.7% | **85** | **0** |

Per transcript: om-orchestration 80.8 → 82.4 (+1.7); om-v04 80.0 → 85.4 (+5.4); firstmate-11 75.8 → 81.0 (+5.2).
Flips: 85 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 29 up, 0 down, sign test p=3.7e-9. Passed counts are over all samples.

Verdict: B is better: 4.6 weighted points, 3 of 3 transcripts agree, 29 unique items flip to B against 0.
efficiency: same (B vs A: mean tokens +9%, reduction ratio +9%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 21k |
| context tokens per cut, max | 31k | 34k |
| reduction ratio (compacted / replaced), mean | 12.1% | 13.2% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (29 unique items):

- identifiers om-orchestration/usd:$0.37: ↑ at @3
- identifiers om-orchestration/number:0.37: ↑ at @3
- chronology om-orchestration/path:.claude/types: ↑ at @3 @4 @5
- rationale om-orchestration/why:pin-new: ↑ at @3 @4 @5
- identifiers om-orchestration/path:.claude/types: ↑ at @4
- identifiers om-orchestration/usd:$1.50: ↑ at @5
- identifiers om-orchestration/number:1.50: ↑ at @5
- identifiers om-v04/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @1
- identifiers om-v04/number:0.003: ↑ at @1
- chronology om-v04/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @3 @4 @5 @6 @7 @8 @9
- chronology om-v04/path:hooks/prompts.ts: ↑ at @3 @4
- multi-hop om-v04/hop:brief-pinned: ↑ at @3 @4 @5 @6 @7 @8 @9
- identifiers om-v04/path:hooks/prompts.ts: ↑ at @4
- facts om-v04/str:retrying-rows: ↑ at @5 @6 @7 @8 @9
- reversals om-v04/sup:skill-stub-wording: ↑ at @6 @7 @8 @9
- lessons om-v04/neg:close-tag-prompt: ↑ at @7 @8 @9
- lessons om-v04/neg:subagent-veto: ↑ at @8 @9
- reversals om-v04/sup:subagent-observed: ↑ at @8 @9
- reversals om-v04/sup:recall-cap: ↑ at @8
- identifiers om-v04/number:15.6: ↑ at @9
- rationale om-v04/why:no-luna-kept-out: ↑ at @9
- lessons firstmate-11/neg-tailnet-signin: ↑ at @4 @5 @6 @7 @8 @9
- facts firstmate-11/exact-ssh-tunnel: ↑ at @4 @6 @7 @8 @9
- chronology firstmate-11/path:~/.codex/AGENTS.md: ↑ at @5 @6 @7 @8 @9 @10
- file-state firstmate-11/file-learnings-16gb: ↑ at @5 @6 @7 @8 @9 @10
- file-state firstmate-11/file-prod-change-backup: ↑ at @7
- multi-hop firstmate-11/multi-accounts-sign: ↑ at @7 @8 @9 @10 @11
- rationale firstmate-11/why-pm-assigned-only: ↑ at @7 @8 @9 @10 @11
- facts firstmate-11/exact-db-url-var: ↑ at @10 @11

## Long chain (not in the total)

A: A /tmp/omv-code/base7 (dir) (long chain, every 5th cut)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir) (long chain, every 5th cut)

A sample 1: long 335 calls, 0 fresh
B sample 1: long 292 calls, 7 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 43.9 | 46.2 | +2.4 | 93/212 | 98/212 | 16 | 11 |
| constraints | 6 | 96.5 | 96.5 | 0 | 247/256 | 247/256 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 258/258 | 258/258 |  |  |
| corrections | 8 | 99.6 | 99.6 | 0 | 514/516 | 514/516 |  |  |
| reversals | 6 | 45.8 | 46.8 | +1.0 | 93/203 | 95/203 | 18 | 16 |
| approvals | 5 | 50.0 | 50.0 | 0 | 24/48 | 24/48 | 1 | 1 |
| asks | 5 | 100.0 | 100.0 | 0 | 48/48 | 48/48 |  |  |
| in-progress | 5 | 72.0 | 84.0 | +12.0 | 18/25 | 21/25 | 3 |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 85.7 | 88.3 | +2.6 | 66/77 | 68/77 | 5 | 3 |
| commits | 4 | 84.7 | 60.7 | -24.0 | 155/183 | 111/183 | 2 | 46 |
| failures | 6 | 60.0 | 80.0 | +20.0 | 6/10 | 8/10 | 2 |  |
| facts | 5 | 42.4 | 45.6 | +3.2 | 383/903 | 412/903 | 81 | 52 |
| decisions | 5 | 28.8 | 30.3 | +1.5 | 93/323 | 98/323 | 32 | 27 |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 47.8 | 49.0 | +1.2 | 235/492 | 241/492 | 55 | 49 |
| absent | 5 | 98.0 | 99.3 | +1.4 | 288/294 | 292/294 | 6 | 2 |
| tokens | 6 | 10.1 | 7.1 | -3.0 | 0/16 | 0/16 |  |  |
| budget | 3 | 87.4 | 85.2 | -2.2 | 5/16 | 3/16 |  | 2 |
| **total** | | **61.8** | **61.3** | **-0.5** | 65.5% | 65.9% | **221** | **209** |

Per transcript: long 61.8 → 61.3 (-0.5).
Flips: 221 up, 209 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 82 up, 79 down, sign test p=0.87. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens +4%, reduction ratio +4%, model tokens -12%, critical-path calls per transcript -111.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 43k | 45k |
| context tokens per cut, max | 72k | 69k |
| reduction ratio (compacted / replaced), mean | 29.0% | 30.4% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 283 (4802k / 220k) |
| Reflector calls (tokens in / out) | 10 (321k / 34k) | 9 (293k / 29k) |
| model tokens in + out | 6039k | 5344k |
| critical-path calls (tokens in / out) | 115 (1983k / 84k) | 4 (52k / 2.9k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (79 unique items):

- chronology long/path:.claude/types: ↑ at @40; ↓ at @15 @80
- reversals long/firstmate-11-order-rename-then-subject: ↑ at @60; ↓ at @75 @80
- facts long/om-orchestration-neg:fallback-cause: ↑ at @80; ↓ at @40 @45 @50 @60 @70 @75
- identifiers long/path:.claude/types/claude-code.d.ts: ↓ at @15
- identifiers long/path:/tmp/cmp2/run.py: ↓ at @15
- decisions long/om-v04-neg:c029150-dropped: ↓ at @15
- facts long/long:clockmaker-clocks: ↓ at @15
- budget long/size: ↓ at @20 @40
- chronology long/om-v04-main-0.4.13: ↓ at @25 @30 @35
- decisions long/om-v04-no-subagent-threshold: ↓ at @25 @30
- decisions long/om-v04-neg:sched-reset: ↓ at @25 @30
- facts long/om-v04-hop:moved-transcript: ↓ at @25 @30 @35
- decisions long/om-v04-why:skill-stub: ↓ at @25 @30 @35
- decisions long/om-v04-why:timeout-not-retried: ↓ at @25 @30 @35 @80
- identifiers long/usd:$0.0025: ↓ at @35
- identifiers long/number:0.0025: ↓ at @35
- chronology long/path:hooks/register.ts: ↓ at @35
- decisions long/om-v04-merge-recall: ↓ at @35 @40 @45 @50 @55 @60
- facts long/om-v04-todo-gap: ↓ at @35
- facts long/om-v04-file:skill-rule: ↓ at @35
- approvals long/om-v04-scope:no-lavish: ↓ at @35
- facts long/firstmate-11-multi-gorman-prod-setup: ↓ at @35 @40 @45 @75 @80
- facts long/long:auto-compact-window: ↓ at @35
- reversals long/om-v04-sup:todo-commit: ↓ at @35
- identifiers long/path:~/work/mods/precompact: ↓ at @40
- facts long/om-orchestration-exact:rescored-results: ↓ at @40 @45 @50
- absent long/om-v04-no-remote: ↓ at @40 @45
- reversals long/om-orchestration-rule:push-now: ↓ at @40 @45 @50 @80
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/apps/web/src/components/change-orders/void-signed-change-order-dialog-template.tsx: ↓ at @45
- facts long/firstmate-11-why-sbom-passed: ↓ at @45 @50 @55 @60
- decisions long/om-orchestration-assistant-model: ↓ at @45 @50
- identifiers long/path:apps/web/src/server/integrations/esignature/documenso.ts: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/estimates/actions/stories/create-contract-dialog-template.stories.tsx: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/contracts/contract-detail-template.tsx: ↓ at @50
- commits long/pr:238: ↓ at @50 @55 @60 @65 @70 @75 @80
- commits long/pr:1418: ↓ at @50 @55 @60 @65 @70 @75 @80
- commits long/pr:1420: ↓ at @50 @55 @60 @65 @70 @75 @80
- commits long/pr:1421: ↓ at @50 @55 @60
- commits long/pr:1422: ↓ at @50 @55 @60
- commits long/pr:1423: ↓ at @50 @55 @60 @65 @70 @75 @80
- chronology long/path:/tmp/compact-test-last.json: ↓ at @50 @55 @60 @65 @70 @75 @80
- chronology long/version:2.1.280: ↓ at @50 @55 @60 @65 @70 @75 @80
- chronology long/path:~/work/mods/compact-test: ↓ at @50 @55 @60 @65 @70 @75 @80
- facts long/om-v04-hop:made-up-answers: ↓ at @50 @60
- chronology long/firstmate-11-sign-pr: ↓ at @50 @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sbom-followups-pr: ↓ at @50 @55 @60
- decisions long/firstmate-11-sbom-cause: ↓ at @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-tools: ↓ at @50 @55 @60
- facts long/firstmate-11-exact-libheif-version: ↓ at @50 @55 @60 @65 @70 @75 @80
- chronology long/om-orchestration-agents-commit: ↓ at @50
- chronology long/om-orchestration-worktrees-commit: ↓ at @50
- chronology long/om-orchestration-runner-merge: ↓ at @50
- facts long/om-orchestration-neg:tool-search: ↓ at @50
- facts long/om-orchestration-file:live-agent-name: ↓ at @50
- facts long/om-orchestration-file:scenarios-fix: ↓ at @50
- facts long/om-orchestration-file:bench-baseline: ↓ at @50 @55 @60
- facts long/om-orchestration-file:rr-docs: ↓ at @50
- facts long/om-orchestration-hop:bench-worktrees: ↓ at @50
- facts long/om-orchestration-exact:not-persistent: ↓ at @50
- facts long/om-orchestration-exact:todo-fallback: ↓ at @50
- reversals long/firstmate-11-order-sbom-prs: ↓ at @50 @55 @60 @65 @80
- reversals long/om-orchestration-sup:test-count-5: ↓ at @50
- facts long/om-orchestration-sup:main-head-5: ↓ at @50
- chronology long/om-orchestration-ord:5-after-7: ↓ at @50
- identifiers long/path:tests/eval/recall-plugin/hooks/prompts.ts: ↓ at @55
- identifiers long/path:tests/eval/replay-specs: ↓ at @75
- identifiers long/number:0.30: ↓ at @75
- commits long/commit:00b682b: ↓ at @75 @80
- commits long/commit:2adb842: ↓ at @75 @80
- commits long/pr:1417: ↓ at @75 @80
- commits long/pr:1424: ↓ at @75 @80
- commits long/pr:1425: ↓ at @75 @80
- chronology long/firstmate-11-gorman-pr: ↓ at @75 @80
- chronology long/firstmate-11-street-address-pr: ↓ at @75 @80
- facts long/firstmate-11-port: ↓ at @75 @80
- facts long/firstmate-11-multi-prod-dump: ↓ at @75 @80
- identifiers long/path:docs/plans/ideas/efficiency.md: ↓ at @80
- identifiers long/const:CHUNK_TOKENS: ↓ at @80
- commits long/commit:9466e8a: ↓ at @80

Better in B (82 unique items):

- chronology long/path:.claude-plugin/plugin.json: ↑ at @5 @10 @15 @35; ↓ at @50 @75
- chronology long/path:~/.claude/skills: ↑ at @5 @10 @15 @20 @30
- identifiers long/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↑ at @10 @15
- identifiers long/path:.claude-plugin/plugin.json: ↑ at @10
- identifiers long/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @10
- decisions long/om-v04-neg:subagent-veto: ↑ at @15 @20
- decisions long/om-v04-neg:hook-output-refuted: ↑ at @15 @20
- facts long/om-v04-hop:brief-pinned: ↑ at @15 @20 @25 @30 @60 @65 @70
- facts long/om-v04-str:retrying-rows: ↑ at @15 @20
- chronology long/om-v04-order:firstmate-version-switch: ↑ at @15 @20
- reversals long/om-v04-sup:skill-stub-wording: ↑ at @15 @20
- chronology long/om-v04-order:parser-line-by-line: ↑ at @15 @20 @25 @30
- failures long/line 8951: ↑ at @20
- chronology long/path:/tmp/cctypes/claude-code.d.ts: ↑ at @20 @25 @30
- chronology long/path:/tmp/cctypes: ↑ at @20 @25 @30
- chronology long/uuid:c88abd43-9e84-435f-9568-5a04d505bb9e: ↑ at @20 @25 @30 @35 @40 @45
- decisions long/om-v04-thinking-low: ↑ at @20 @25 @30 @80
- decisions long/om-v04-neg:vcc-install: ↑ at @20
- facts long/om-v04-file:pi-isolation: ↑ at @20 @25 @30 @35 @40 @45
- facts long/om-v04-file:parser-debug: ↑ at @20 @25 @30
- facts long/om-v04-hop:settle-error-fix: ↑ at @20
- approvals long/om-v04-scope:ctx-worktree: ↑ at @20
- decisions long/om-v04-why:parallel-order: ↑ at @20 @25 @30
- reversals long/om-v04-sup:subagent-observed: ↑ at @20
- facts long/firstmate-11-neg-tailnet-signin: ↑ at @25 @30
- absent long/firstmate-11-abst-drug-quota: ↑ at @25 @30 @35 @40 @45 @50
- facts long/firstmate-11-claude-json-backup: ↑ at @30 @35 @40 @45
- facts long/firstmate-11-file-prod-change-backup: ↑ at @30 @40
- facts long/firstmate-11-multi-accounts-sign: ↑ at @30 @35 @40 @45
- facts long/firstmate-11-exact-ssh-tunnel: ↑ at @30
- facts long/firstmate-11-why-pm-assigned-only: ↑ at @30 @35 @40 @45
- identifiers long/path:~/work/firstmate/state/opie-line-items-disappeared.inbox/handled: ↑ at @35
- identifiers long/path:~/work/firstmate/state/opie-line-items-disappeared.status: ↑ at @35
- facts long/firstmate-11-contract: ↑ at @35 @40 @45 @50 @55 @60 @65 @70
- reversals long/firstmate-11-super-test-contract: ↑ at @35 @40 @45 @50 @55 @60 @65 @70
- identifiers long/path:hooks/stats.ts: ↑ at @40
- identifiers long/usd:$1.50: ↑ at @40
- identifiers long/version:1.1.0: ↑ at @40
- identifiers long/path:tests/eval/runner.ts: ↑ at @40
- identifiers long/path:/tmp/om-v043: ↑ at @40
- identifiers long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings: ↑ at @40
- identifiers long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings/migration.sql: ↑ at @40
- identifiers long/number:1.50: ↑ at @40
- facts long/firstmate-11-file-captain-md: ↑ at @40
- facts long/firstmate-11-file-claude-json-key: ↑ at @40 @45
- facts long/firstmate-11-file-sbom-acceptances: ↑ at @40 @45
- facts long/firstmate-11-multi-password-exposure: ↑ at @40
- facts long/firstmate-11-exact-db-url-var: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-why-blank-body-block: ↑ at @40
- chronology long/om-orchestration-ticket-10: ↑ at @40 @45 @50 @55 @60 @65 @70
- facts long/om-orchestration-testing-backup: ↑ at @40
- facts long/om-orchestration-hop:x-req-id: ↑ at @40 @45
- facts long/om-orchestration-hop:first-recall: ↑ at @40 @45
- decisions long/om-orchestration-why:threshold: ↑ at @40 @45 @50 @55 @60 @65 @70 @75 @80
- decisions long/om-orchestration-why:pin-new: ↑ at @40 @45
- reversals long/om-v04-sup:failure-cause: ↑ at @40 @45; ↓ at @35
- reversals long/firstmate-11-super-sbom-pages: ↑ at @40 @45
- identifiers long/path:.github/workflows: ↑ at @45
- identifiers long/path:~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/db/src/schema/settings.ts: ↑ at @45
- in-progress long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/packages/db/tmp-void-shots-seed.ts: ↑ at @45
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/packages/db/tmp-void-shots-seed.ts: ↑ at @45
- decisions long/om-orchestration-vcc-brief: ↑ at @45
- facts long/om-orchestration-neg:multi-region: ↑ at @45
- in-progress long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-document-matching.test.ts: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-retype-on-revise.test.ts: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↑ at @50
- failures long/line 31069: ↑ at @50
- chronology long/om-orchestration-ticket-7: ↑ at @55 @60 @65 @70
- chronology long/om-orchestration-ticket-5: ↑ at @55 @60 @65 @70
- chronology long/om-orchestration-ticket-6: ↑ at @55 @60 @65 @70
- decisions long/om-orchestration-reviewer-model: ↑ at @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-orchestration-log: ↑ at @55 @80
- facts long/om-orchestration-file:legacy-recall: ↑ at @55 @60 @65 @70
- facts long/om-orchestration-exact:audit-line: ↑ at @55 @60 @65 @70
- facts long/om-orchestration-sup:rr-spend: ↑ at @55 @60 @65 @70
- chronology long/om-orchestration-ord:6-after-5: ↑ at @55 @60 @65 @70
- chronology long/path:tests/register.test.ts: ↑ at @65 @70
- decisions long/om-orchestration-herdr-panes: ↑ at @65 @70
- in-progress long/~/.treehouse/firstmate-a43bdc/1/firstmate/AGENTS.md: ↑ at @70
- files-edited long/~/.treehouse/firstmate-a43bdc/1/firstmate/AGENTS.md: ↑ at @70
- commits long/commit:940b47b: ↑ at @75 @80; ↓ at @60

Both ways (2 unique items):

- chronology long/path:hooks/hooks.json: ↑ at @5 @35; ↓ at @50 @75
- reversals long/firstmate-11-super-firstmate-pushed: ↑ at @55 @75; ↓ at @40 @45

Recall-aware credit (not in any total): A 43.6, B 41.3 (-2.3)

## Reflection chain (not in the total)

A: A /tmp/omv-code/base7 (dir) (reflection chain)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 111 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 50.7 | 53.0 | +2.2 | 136/268 | 142/268 | 10 | 4 |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 388/388 | 388/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 100.0 | +1.9 | 53/54 | 54/54 | 1 |  |
| asks | 5 | 100.0 | 100.0 | 0 | 93/93 | 93/93 |  |  |
| in-progress | 5 | 75.7 | 75.7 | 0 | 28/37 | 28/37 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 |  |  |
| commits | 4 | 97.2 | 100.0 | +2.8 | 139/143 | 143/143 | 4 |  |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.0 | 97.7 | +0.7 | 292/301 | 294/301 | 2 |  |
| chronology | 6 | 45.8 | 58.2 | +12.4 | 518/1131 | 658/1131 | 147 | 7 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 25.1 | 20.8 | -4.4 | 1/31 | 1/31 |  |  |
| budget | 3 | 96.3 | 94.9 | -1.3 | 22/31 | 17/31 | 1 | 6 |
| **total** | | **81.0** | **80.7** | **-0.2** | 77.8% | 82.0% | **165** | **17** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.0 → 80.7 (-0.2).
Flips: 165 up, 17 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 26 up, 7 down, sign test p=0.0013. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +5%, reduction ratio +5%, model tokens +2%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 35k | 37k |
| context tokens per cut, max | 51k | 54k |
| reduction ratio (compacted / replaced), mean | 21.9% | 23.1% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (37k / 3.6k) | 2 (72k / 8.4k) |
| model tokens in + out | 1777k | 1817k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (7 unique items):

- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @13; ↓ at @10 @11 @19 @20 @21 @22
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.11: ↓ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.11: ↓ at @12
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/settings.json: ↓ at @12 @14 @15
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.003: ↓ at @12 @13 @14 @15
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-vcc: ↓ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:Variance/pre-construction: ↓ at @30

Better in B (26 unique items):

- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @1
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.003: ↑ at @1
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @3 @4 @5 @6 @7 @8 @9 @10 @11
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @6 @7 @8 @9 @10 @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @9
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.30: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$51: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.30: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.37: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.37: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$1.50: ↑ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:1.50: ↑ at @14
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory-prune: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/commit:b8d5067: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043/fixture.jsonl: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/store/observational-memory_inline-8aabd6f3acbe.json: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp2: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/uuid:b8d50671-d9df-4001-9679-8d1ba9ec834c: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp2/run.py: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- approvals om-v04+om-orchestration+firstmate-11+firstmate-6/line 14898: ↑ at @22
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1425: ↑ at @25 @26 @27
- facts om-v04+om-orchestration+firstmate-11+firstmate-6/lost-gorman-schema: ↑ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/communications.ts: ↑ at @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/validation.ts: ↑ at @30 @31
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1379: ↑ at @31

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/base7 (dir) (holdout)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 59.0 | 61.0 | +2.0 | 59/100 | 61/100 | 2 |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 |  |  |
| files-edited | 5 | 86.7 | 86.7 | 0 | 13/15 | 13/15 |  |  |
| commits | 4 | 97.4 | 100.0 | +2.6 | 37/38 | 38/38 | 1 |  |
| failures | 6 | 100.0 | 100.0 | 0 | 16/16 | 16/16 |  |  |
| chronology | 6 | 59.7 | 62.5 | +2.8 | 43/72 | 45/72 | 2 |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 69.5 | 68.2 | -1.3 | 1/14 | 1/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **82.9** | **83.5** | **+0.6** | 75.2% | 76.6% | **5** | **0** |

Per transcript: firstmate-6 81.9 → 81.9 (0); crew-uspa-4 71.7 → 73.1 (+1.5); crew-opie-4 77.6 → 77.5 (-0.1).
Flips: 5 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 3 up, 0 down, sign test p=0.25. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +2%, reduction ratio +2%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 20k | 21k |
| context tokens per cut, max | 31k | 31k |
| reduction ratio (compacted / replaced), mean | 12.9% | 13.1% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 44 (512k / 35k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 547k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (3 unique items):

- commits firstmate-6/pr:1379: ↑ at @6
- identifiers crew-uspa-4/path:~/work/firstmate/data/uspa-multisession-smoke-rerun-b/shots: ↑ at @3 @4
- chronology crew-uspa-4/path:~/work/firstmate/data/uspa-multisession-smoke-rerun-b/shots: ↑ at @3 @4

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

## A /tmp/omv-code/base7 (dir) (holdout)

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
| reduction ratio (compacted / replaced), mean | 29.0% | 29.0% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 10 (321k / 34k) | 10 (321k / 34k) |
| model tokens in + out | 6039k | 6039k |
| critical-path calls (tokens in / out) | 115 (1983k / 84k) | 115 (1983k / 84k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **43.6** — 437 of 1284 hand-authored facts held, 245 more pointed to by a source range om_recall can follow (½ each).
Reached: 6 reflections (10 Reflector calls), 325 Observer calls; constraint tier peak ~6040 tokens at cut 80; constraint-cap fallbacks at none.

## B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir)

Total: **82.9**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 59.9 | 124/207 | 65.7 | 66.7 | 42.9 |
| constraints | 6 | 96.2 | 102/106 | 92.2 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 90.7 | 68/75 | 78.6 | 83.3 | 97.7 |
| approvals | 5 | 81.5 | 44/54 | 100.0 | 74.4 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 89.0 | 154/173 | 94.0 | 85.7 | 88.1 |
| decisions | 5 | 100.0 | 55/55 | 100.0 | 100.0 | 100.0 |
| lessons | 7 | 81.6 | 40/49 | 83.3 | 100.0 | 60.0 |
| file-state | 7 | 73.4 | 58/79 | 76.5 | 100.0 | 58.5 |
| multi-hop | 7 | 79.5 | 35/44 | 55.6 | 84.2 | 87.5 |
| rationale | 7 | 67.3 | 37/55 | 50.0 | 82.4 | 65.4 |
| chronology | 6 | 79.3 | 375/473 | 81.1 | 74.8 | 83.9 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| purpose | 5 | 0.0 | 0/24 | 0.0 | 0.0 | 0.0 |
| tokens | 6 | 67.1 | 3/25 | 79.6 | 50.8 | 74.8 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **82.9** | 84.7% | 82.4 | 85.4 | 81.0 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 21k | 18k | 26k | 19k |
| context tokens per cut, max | 34k | 21k | 34k | 32k |
| reduction ratio (compacted / replaced), mean | 13.2% | 11.3% | 16.2% | 11.7% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 23 (295k / 19k) | 38 (526k / 31k) | 26 (325k / 21k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 314k | 557k | 346k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir) (holdout)

Total: **83.5**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 61/100 | 29.4 | 71.4 | 55.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 86.7 | 13/15 | 83.3 | 100.0 | 87.5 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 62.5 | 45/72 | 75.0 | 50.0 | 72.7 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 68.2 | 1/14 | 83.2 | 69.0 | 44.9 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.5** | 76.6% | 81.9 | 73.1 | 77.5 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 21k | 16k | 21k | 27k |
| context tokens per cut, max | 31k | 22k | 26k | 31k |
| reduction ratio (compacted / replaced), mean | 13.1% | 10.3% | 13.0% | 17.3% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 16 (184k / 12k) | 16 (188k / 13k) | 12 (139k / 9.9k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 196k | 202k | 149k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir) (reflection chain)

Total: **80.7**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 111 calls, 0 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 53.0 | 142/268 | 53.0 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 100.0 | 54/54 | 100.0 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 75.7 | 28/37 | 75.7 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 100.0 | 143/143 | 100.0 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.7 | 294/301 | 97.7 |
| chronology | 6 | 58.2 | 658/1131 | 58.2 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 20.8 | 1/31 | 20.8 |
| budget | 3 | 94.9 | 17/31 | 94.9 |
| **total** | | **80.7** | 82.0% | 80.7 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 37k | 37k |
| context tokens per cut, max | 54k | 54k |
| reduction ratio (compacted / replaced), mean | 23.1% | 23.1% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 2 (72k / 8.4k) | 2 (72k / 8.4k) |
| model tokens in + out | 1817k | 1817k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base8 (dir) (long chain, every 5th cut)

Total: **61.3**

sample 1: long 292 calls, 7 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 46.2 | 98/212 | 46.2 |
| constraints | 6 | 96.5 | 247/256 | 96.5 |
| verbatim | 5 | 100.0 | 258/258 | 100.0 |
| corrections | 8 | 99.6 | 514/516 | 99.6 |
| reversals | 6 | 46.8 | 95/203 | 46.8 |
| approvals | 5 | 50.0 | 24/48 | 50.0 |
| asks | 5 | 100.0 | 48/48 | 100.0 |
| in-progress | 5 | 84.0 | 21/25 | 84.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 88.3 | 68/77 | 88.3 |
| commits | 4 | 60.7 | 111/183 | 60.7 |
| failures | 6 | 80.0 | 8/10 | 80.0 |
| facts | 5 | 45.6 | 412/903 | 45.6 |
| decisions | 5 | 30.3 | 98/323 | 30.3 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 49.0 | 241/492 | 49.0 |
| absent | 5 | 99.3 | 292/294 | 99.3 |
| tokens | 6 | 7.1 | 0/16 | 7.1 |
| budget | 3 | 85.2 | 3/16 | 85.2 |
| **total** | | **61.3** | 65.9% | 61.3 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 45k | 45k |
| context tokens per cut, max | 69k | 69k |
| reduction ratio (compacted / replaced), mean | 30.4% | 30.4% |
| Observer calls (tokens in / out) | 283 (4802k / 220k) | 283 (4802k / 220k) |
| Reflector calls (tokens in / out) | 9 (293k / 29k) | 9 (293k / 29k) |
| model tokens in + out | 5344k | 5344k |
| critical-path calls (tokens in / out) | 4 (52k / 2.9k) | 4 (52k / 2.9k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **41.3** — 469 of 1284 hand-authored facts held, 123 more pointed to by a source range om_recall can follow (½ each).
Reached: 7 reflections (9 Reflector calls), 283 Observer calls; constraint tier peak ~5284 tokens at cut 80; constraint-cap fallbacks at none.

