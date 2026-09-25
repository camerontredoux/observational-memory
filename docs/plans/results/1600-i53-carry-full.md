# Against A .scratch/omv-code/base7 (dir): 78.3; holdout 82.9; reflection chain 81.0; long chain 61.8, recall-aware 43.6

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) | chain Δ | long Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---:|---|
| B .scratch/omv/carry5f (dir) | 82.9 | +4.6 | +1.7 / +5.4 / +5.2 | 29 | 0 | 3.7e-9 | exact | B | same | multi-hop +1.4, lessons +1.1, rationale +0.8, file-state +0.4 | 0 (1↑ 0↓) | -0.3 (156↑ 16↓) | -1.0 (63↑ 55↓); recall-aware 45.5 (+1.9) |
| B .scratch/omv/carry3f (dir) | 81.4 | +3.0 | +1.6 / +4.2 / +3.0 | 19 | 0 | 0.0000038 | exact | B | same | multi-hop +1.4, rationale +0.7, reversals +0.4, facts +0.2 | +0.1 (1↑ 0↓) | -0.1 (103↑ 27↓) | +0.4 (39↑ 44↓); recall-aware 42.1 (-1.5) |

Behavior (probes passed): A 67.6%; B .scratch/omv/carry5f (dir) 74.9%; B .scratch/omv/carry3f (dir) 70.7%

# Compaction A/B

A: A .scratch/omv-code/base7 (dir)
B: B .scratch/omv/carry5f (dir)

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

A: A .scratch/omv-code/base7 (dir) (long chain, every 5th cut)
B: B .scratch/omv/carry5f (dir) (long chain, every 5th cut)

A sample 1: long 335 calls, 0 fresh
B sample 1: long 334 calls, 9 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 43.9 | 47.6 | +3.8 | 93/212 | 101/212 | 13 | 5 |
| constraints | 6 | 96.5 | 96.5 | 0 | 247/256 | 247/256 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 258/258 | 258/258 |  |  |
| corrections | 8 | 99.6 | 99.6 | 0 | 514/516 | 514/516 |  |  |
| reversals | 6 | 45.8 | 49.8 | +3.9 | 93/203 | 101/203 | 15 | 7 |
| approvals | 5 | 50.0 | 50.0 | 0 | 24/48 | 24/48 | 1 | 1 |
| asks | 5 | 100.0 | 100.0 | 0 | 48/48 | 48/48 |  |  |
| in-progress | 5 | 72.0 | 72.0 | 0 | 18/25 | 18/25 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 85.7 | 85.7 | 0 | 66/77 | 66/77 |  |  |
| commits | 4 | 84.7 | 68.3 | -16.4 | 155/183 | 125/183 | 4 | 34 |
| failures | 6 | 60.0 | 60.0 | 0 | 6/10 | 6/10 |  |  |
| facts | 5 | 42.4 | 47.6 | +5.2 | 383/903 | 430/903 | 75 | 28 |
| decisions | 5 | 28.8 | 28.2 | -0.6 | 93/323 | 91/323 | 23 | 25 |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 47.8 | 48.2 | +0.4 | 235/492 | 237/492 | 50 | 48 |
| absent | 5 | 98.0 | 98.0 | 0 | 288/294 | 288/294 | 5 | 5 |
| tokens | 6 | 10.1 | 8.4 | -1.8 | 0/16 | 0/16 |  |  |
| budget | 3 | 87.4 | 85.9 | -1.5 | 5/16 | 4/16 | 1 | 2 |
| **total** | | **61.8** | **60.8** | **-1.0** | 65.5% | 66.4% | **187** | **155** |

Per transcript: long 61.8 → 60.8 (-1.0).
Flips: 187 up, 155 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 63 up, 55 down, sign test p=0.52. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +2%, reduction ratio +3%, model tokens -0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 43k | 44k |
| context tokens per cut, max | 72k | 74k |
| reduction ratio (compacted / replaced), mean | 29.0% | 29.8% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 10 (321k / 34k) | 9 (301k / 28k) |
| model tokens in + out | 6039k | 6013k |
| critical-path calls (tokens in / out) | 115 (1983k / 84k) | 115 (1992k / 84k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (55 unique items):

- budget long/size: ↑ at @35; ↓ at @20 @40
- facts long/om-orchestration-orchestration-log: ↑ at @80; ↓ at @45 @50
- identifiers long/path:.claude/types/claude-code.d.ts: ↓ at @15
- identifiers long/path:/tmp/cmp2/run.py: ↓ at @15
- decisions long/om-v04-neg:c029150-dropped: ↓ at @15
- facts long/long:clockmaker-clocks: ↓ at @15
- chronology long/om-v04-main-0.4.13: ↓ at @25 @30 @35
- decisions long/om-v04-no-subagent-threshold: ↓ at @25 @30
- decisions long/om-v04-neg:sched-reset: ↓ at @25 @30
- facts long/om-v04-hop:moved-transcript: ↓ at @25 @30 @35
- decisions long/om-v04-why:skill-stub: ↓ at @25 @30 @35
- decisions long/om-v04-why:timeout-not-retried: ↓ at @25 @30 @35
- identifiers long/usd:$0.0025: ↓ at @35
- identifiers long/number:0.0025: ↓ at @35
- chronology long/path:hooks/register.ts: ↓ at @35
- chronology long/path:/tmp/compact-test-last.json: ↓ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- decisions long/om-v04-merge-recall: ↓ at @35 @40 @45 @50 @55 @60
- facts long/om-v04-todo-gap: ↓ at @35
- facts long/om-v04-file:skill-rule: ↓ at @35
- approvals long/om-v04-scope:no-lavish: ↓ at @35
- facts long/long:auto-compact-window: ↓ at @35
- reversals long/om-v04-sup:todo-commit: ↓ at @35
- identifiers long/path:~/work/mods/precompact: ↓ at @40
- commits long/pr:1418: ↓ at @45 @50 @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sign-pr: ↓ at @45 @50 @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-why-sbom-passed: ↓ at @45 @50 @55 @60
- facts long/om-orchestration-file:live-agent-name: ↓ at @45 @50
- commits long/pr:1420: ↓ at @55 @60 @65 @70 @75 @80
- commits long/pr:1421: ↓ at @55 @60
- commits long/pr:1422: ↓ at @55 @60
- commits long/pr:1423: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/path:tests/register.test.ts: ↓ at @55 @60
- chronology long/version:2.1.280: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/path:~/work/mods/compact-test: ↓ at @55 @60 @65 @70 @75 @80
- absent long/invented-hashes: ↓ at @55 @60 @65 @70 @75
- chronology long/firstmate-11-fork-push: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sbom-followups-pr: ↓ at @55 @60
- decisions long/firstmate-11-sbom-cause: ↓ at @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-tools: ↓ at @55 @60
- facts long/firstmate-11-exact-libheif-version: ↓ at @55 @60 @65 @70 @75 @80
- decisions long/om-orchestration-herdr-panes: ↓ at @55 @60
- facts long/om-orchestration-file:bench-baseline: ↓ at @55 @60
- reversals long/firstmate-11-order-sbom-prs: ↓ at @55 @60 @65 @80
- commits long/commit:00b682b: ↓ at @60 @65 @70 @75 @80
- commits long/pr:238: ↓ at @80
- commits long/pr:1417: ↓ at @80
- commits long/pr:1419: ↓ at @80
- commits long/pr:1424: ↓ at @80
- commits long/pr:1425: ↓ at @80
- chronology long/firstmate-11-gorman-pr: ↓ at @80
- chronology long/firstmate-11-save-fix-pr: ↓ at @80
- chronology long/firstmate-11-street-address-pr: ↓ at @80
- facts long/firstmate-11-multi-prod-dump: ↓ at @80
- facts long/firstmate-11-multi-gorman-prod-setup: ↓ at @80
- reversals long/firstmate-11-super-firstmate-pushed: ↓ at @80

Better in B (63 unique items):

- chronology long/path:.claude-plugin/plugin.json: ↑ at @5 @10 @15
- chronology long/path:hooks/hooks.json: ↑ at @5
- chronology long/path:~/.claude/skills: ↑ at @5 @10 @15 @20 @30
- identifiers long/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↑ at @10 @15
- identifiers long/path:.claude-plugin/plugin.json: ↑ at @10
- identifiers long/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @10
- decisions long/om-v04-neg:subagent-veto: ↑ at @15 @20
- decisions long/om-v04-neg:hook-output-refuted: ↑ at @15 @20
- facts long/om-v04-hop:brief-pinned: ↑ at @15 @20 @25 @30 @60 @65 @70 @75
- facts long/om-v04-str:retrying-rows: ↑ at @15 @20
- chronology long/om-v04-order:firstmate-version-switch: ↑ at @15 @20
- reversals long/om-v04-sup:skill-stub-wording: ↑ at @15 @20
- chronology long/om-v04-order:parser-line-by-line: ↑ at @15 @20 @25 @30
- chronology long/path:/tmp/cctypes/claude-code.d.ts: ↑ at @20 @25 @30
- chronology long/path:/tmp/cctypes: ↑ at @20 @25 @30
- chronology long/uuid:c88abd43-9e84-435f-9568-5a04d505bb9e: ↑ at @20 @25 @30
- decisions long/om-v04-thinking-low: ↑ at @20 @25 @30 @80
- decisions long/om-v04-neg:vcc-install: ↑ at @20
- facts long/om-v04-file:pi-isolation: ↑ at @20 @25 @30 @35 @40 @45 @50
- facts long/om-v04-file:parser-debug: ↑ at @20 @25 @30
- facts long/om-v04-hop:settle-error-fix: ↑ at @20
- approvals long/om-v04-scope:ctx-worktree: ↑ at @20
- decisions long/om-v04-why:parallel-order: ↑ at @20 @25 @30 @35 @40 @45 @50
- reversals long/om-v04-sup:subagent-observed: ↑ at @20
- facts long/firstmate-11-neg-tailnet-signin: ↑ at @25 @30
- absent long/firstmate-11-abst-drug-quota: ↑ at @25 @30 @35 @45 @50
- facts long/firstmate-11-claude-json-backup: ↑ at @30 @35 @40 @45 @50
- facts long/firstmate-11-file-prod-change-backup: ↑ at @30 @40
- facts long/firstmate-11-multi-accounts-sign: ↑ at @30 @35 @40
- facts long/firstmate-11-exact-ssh-tunnel: ↑ at @30
- facts long/firstmate-11-why-pm-assigned-only: ↑ at @30 @35 @40
- decisions long/om-v04-why:gap-left: ↑ at @35 @40 @45 @50
- identifiers long/path:hooks/stats.ts: ↑ at @40
- identifiers long/usd:$1.50: ↑ at @40
- identifiers long/version:1.1.0: ↑ at @40
- identifiers long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings: ↑ at @40
- identifiers long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings/migration.sql: ↑ at @40
- identifiers long/number:1.50: ↑ at @40
- facts long/firstmate-11-file-captain-md: ↑ at @40
- facts long/firstmate-11-file-claude-json-key: ↑ at @40 @45 @50
- facts long/firstmate-11-file-sbom-acceptances: ↑ at @40 @45 @50
- facts long/firstmate-11-multi-password-exposure: ↑ at @40
- facts long/firstmate-11-exact-db-url-var: ↑ at @40 @45 @50
- facts long/firstmate-11-why-blank-body-block: ↑ at @40
- facts long/om-orchestration-hop:x-req-id: ↑ at @40 @45 @50
- facts long/om-orchestration-hop:first-recall: ↑ at @40 @45 @50
- decisions long/om-orchestration-why:pin-new: ↑ at @40 @45 @50
- reversals long/om-v04-sup:failure-cause: ↑ at @40 @45 @50
- reversals long/firstmate-11-super-sbom-pages: ↑ at @40 @45 @50
- chronology long/om-orchestration-ticket-7: ↑ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ticket-5: ↑ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ticket-6: ↑ at @55 @60 @65 @70 @75
- facts long/om-orchestration-neg:tool-search: ↑ at @55 @60 @65 @70 @75
- facts long/om-orchestration-exact:audit-line: ↑ at @55 @60 @65 @70 @75
- reversals long/om-orchestration-sup:test-count-5: ↑ at @55 @60 @65 @70 @75
- facts long/om-orchestration-sup:rr-spend: ↑ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ord:5-after-7: ↑ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ord:6-after-5: ↑ at @55 @60 @65 @70 @75
- commits long/commit:940b47b: ↑ at @65 @70 @75 @80
- facts long/om-v04-hop:made-up-answers: ↑ at @65 @70 @75
- identifiers long/usd:$0.09: ↑ at @75
- identifiers long/usd:$0.08: ↑ at @75
- identifiers long/number:0.09: ↑ at @75

Both ways (3 unique items):

- chronology long/path:.claude/types: ↑ at @40; ↓ at @15
- reversals long/firstmate-11-order-rename-then-subject: ↑ at @60; ↓ at @80
- facts long/om-orchestration-neg:fallback-cause: ↑ at @80; ↓ at @60

Recall-aware credit (not in any total): A 43.6, B 45.5 (+1.9)

## Reflection chain (not in the total)

A: A .scratch/omv-code/base7 (dir) (reflection chain)
B: B .scratch/omv/carry5f (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 111 calls, 2 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 50.7 | 53.4 | +2.6 | 136/268 | 143/268 | 10 | 3 |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 388/388 | 388/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 100.0 | +1.9 | 53/54 | 54/54 | 1 |  |
| asks | 5 | 100.0 | 100.0 | 0 | 93/93 | 93/93 |  |  |
| in-progress | 5 | 75.7 | 75.7 | 0 | 28/37 | 28/37 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 |  |  |
| commits | 4 | 97.2 | 97.9 | +0.7 | 139/143 | 140/143 | 1 |  |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.0 | 97.0 | 0 | 292/301 | 292/301 |  |  |
| chronology | 6 | 45.8 | 57.8 | +12.0 | 518/1131 | 654/1131 | 143 | 7 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 25.1 | 20.7 | -4.4 | 1/31 | 1/31 |  |  |
| budget | 3 | 96.3 | 95.0 | -1.3 | 22/31 | 17/31 | 1 | 6 |
| **total** | | **81.0** | **80.7** | **-0.3** | 77.8% | 81.8% | **156** | **16** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.0 → 80.7 (-0.3).
Flips: 156 up, 16 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 22 up, 6 down, sign test p=0.0037. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +5%, reduction ratio +5%, model tokens +2%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 35k | 37k |
| context tokens per cut, max | 51k | 54k |
| reduction ratio (compacted / replaced), mean | 21.9% | 23.0% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (37k / 3.6k) | 2 (72k / 8.4k) |
| model tokens in + out | 1777k | 1817k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (6 unique items):

- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @13; ↓ at @10 @11 @19 @20 @21 @22
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.11: ↓ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.11: ↓ at @12
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/settings.json: ↓ at @12 @14 @15
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.003: ↓ at @12 @13 @14 @15
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-vcc: ↓ at @14

Better in B (22 unique items):

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
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1379: ↑ at @31

## Holdout (mechanical gates only; not in the total)

A: A .scratch/omv-code/base7 (dir) (holdout)
B: B .scratch/omv/carry5f (dir) (holdout)

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
| commits | 4 | 97.4 | 100.0 | +2.6 | 37/38 | 38/38 | 1 |  |
| failures | 6 | 100.0 | 100.0 | 0 | 16/16 | 16/16 |  |  |
| chronology | 6 | 59.7 | 59.7 | 0 | 43/72 | 43/72 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 69.5 | 68.3 | -1.2 | 1/14 | 1/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **82.9** | **83.0** | **0** | 75.2% | 75.5% | **1** | **0** |

Per transcript: firstmate-6 81.9 → 81.9 (0); crew-uspa-4 71.7 → 71.7 (0); crew-opie-4 77.6 → 77.5 (-0.1).
Flips: 1 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 1 up, 0 down, sign test p=1.0. Passed counts are over all samples.

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


Better in B (1 unique items):

- commits firstmate-6/pr:1379: ↑ at @6

## Behavior A/B (Luna reader; not blended into retention)

| gate | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|
| rule | 71/90 | 77/90 | 11 | 5 |
| permission | 29/29 | 29/29 |  |  |
| done | 25/28 | 23/28 |  | 2 |
| next | 40/69 | 40/69 | 2 | 2 |
| value | 190/286 | 209/286 | 24 | 5 |
| lessons | 41/49 | 43/49 | 4 | 2 |
| file-state | 37/79 | 50/79 | 17 | 4 |
| multi-hop | 27/44 | 38/44 | 11 |  |
| rationale | 27/55 | 41/55 | 15 | 1 |
| purpose | 5/24 | 3/24 |  | 2 |
| dropped | 31/39 | 32/39 | 1 |  |
| false | 81/102 | 85/102 | 7 | 3 |
| **all** | **67.6%** | **74.9%** | **92** | **26** |

310 of 894 probes got the same answers in A and B (identical contexts reuse the cached answers).

Worse in B (26):

- rule@2 om-orchestration/rule:paid-runs: A 3/3 "yes" → B 1/3 "yes" (wrong)
- purpose@4 om-orchestration/purpose:agent-teams-tickets: A 2/3 "Use agent teams to implement and merge the tickets, then test whether …" → B 0/3 "Orchestrate implementation and merging of the observational-memory tic…" (wrong)
- rule@4 om-orchestration/sup:test-count-3: A 2/3 "239" → B 0/3 "239" (wrong)
- rationale@4 om-v04/why:parallel-order: A 3/3 "Parallel tool-call ordering caused the mismatch; commit 1dee8ac fixed …" → B 1/3 no answer
- rule@7 om-v04/sup:failure-cause: A 2/3 "Luna emitted malformed unclosed observation sections, omitting `</obse…" → B 1/3 "The Observer replies omitted `</observations>` before `<current-task>`…" (wrong)
- value@8 om-v04/log-notes: A 3/3 "Keep the detailed lines in debug logs and retain the visible +N notes …" → B 0/3 "Keep the +N notes count visible, while retaining detailed lines verbat…", evidence not in the context: "go for it, and keep the +11 notes sure; retaining every detailed log l…"
- next@8 om-v04/told-8: A 2/3 "The comparison was still running as a background shell job; 31 of 144 …" → B 0/3 "The comparison was still running as a background shell job, not a suba…" (wrong)
- file-state@8 om-v04/file:skill-rule: A 2/3 "Skills invoked during the last three main-thread turns keep full text;…" → B 1/3 "Skills invoked during the last three main-thread turns stay full; the …", evidence not in the context: "Skill trimming committed as `1078259` / skills invoked in the last thr…"
- rule@8 om-v04/sup:stall-cause: A 2/3 "The ledger was invalidated by the v0.4.4-to-v0.4.5 parallel-call order…" → B 1/3 "A parallel-call ordering change invalidated the ledger, so OM synchron…" (wrong)
- false@8 om-v04/no-remote: A 2/3 "None; no commit was pushed." → B 1/3 "None; nothing was pushed to GitHub." (wrong)
- value@8 om-v04/path:hooks/register.ts: A 3/3 "`~/work/mods/observational-memory/hooks/register.ts`" → B 1/3 unknown
- done@9 om-v04/done:recall-merged: A 3/3 "done — v0.4.13 at 958b3b1" → B 1/3 "done — v0.4.13" (wrong)
- file-state@9 om-v04/file:skill-rule: A 3/3 "Skills invoked during the last three main-thread turns keep full text;…" → B 0/3 "Skills invoked during the last three main-thread turns keep full text;…", evidence not in the context: "Skill trimming committed as `1078259` on `skill-trim`; Older skills ar…"
- value@9 om-v04/order:firstmate-version-switch: A 2/3 "After the 14:31 compaction." → B 0/3 "After; the 14:31 compaction preceded the later 0.4.5 merge at 15:08.", evidence not in the context: ""auto-compactions at 13:31, 14:12, 14:22, 14:31, and 15:12"; "main was…"
- false@9 om-v04/no-remote: A 3/3 "None; nothing was pushed." → B 1/3 "None; nothing was pushed to GitHub." (wrong)
- value@9 om-v04/path:~/.claude/projects: A 3/3 "~/.claude/projects" → B 0/3 unknown
- lessons@4 firstmate-11/neg-tailnet-signin: A 3/3 "Google returns to localhost, so sign-in cannot complete through the ta…" → B 1/3 "The tailnet address redirects back to localhost, so use the server its…", evidence not in the context: "The tailnet address won't work for sign-in, because Google sends you b…"
- file-state@4 firstmate-11/file-learnings-16gb: A 3/3 "Never run or brief a whole test suite at once; run touched test files …" → B 1/3 "Never run or brief a whole test suite at once; run touched test files …", evidence not in the context: "## Never run or brief a whole test suite at once, in any repo <!--a:20…"
- lessons@5 firstmate-11/neg-tailnet-signin: A 3/3 "Google redirects the tailnet sign-in back to localhost, so use the SSH…" → B 1/3 "Google returns to localhost, so run `ssh -L 5173:127.0.0.1:5173 camero…", evidence not in the context: "From your laptop, forward the port first with `ssh -L 5173:127.0.0.1:5…"
- false@6 firstmate-11/upstream-push: A 2/3 "No push to the `upstream` remote is recorded; `74153fae` was pushed to…" → B 0/3 "74153fae, pushed to origin/the firstmate fork." (wrong)
- next@6 firstmate-11/last-ask:2679: A 2/3 "Keep filing" → B 1/3 "For gorman, it needs to autofill dates too" (wrong)
- file-state@7 firstmate-11/file-sbom-acceptances: A 3/3 "`.github/sbom-license-acceptances.json`; `libheif-js` with LGPL-3.0-on…" → B 0/3 "`.github/sbom-license-acceptances.json`; `libheif-js` with `LGPL-3.0-o…", evidence not in the context: "The accepted list is .github/sbom-license-acceptances.json. / libheif-…"
- rule@9 firstmate-11/super-herdr-updated: A 2/3 "no" → B 1/3 "yes" (wrong)
- done@9 firstmate-11/pr:1423: A 3/3 "done" → B 0/3 "done; do not redo", evidence not in the context: "PR #1423 was merged by `camerontredoux` at 2026-09-23T16:41:15Z; the w…"
- value@10 firstmate-11/port: A 3/3 "5173" → B 1/3 "5173", evidence not in the context: "local server on port 5173 remained available"
- purpose@10 firstmate-11/purpose:firstmate-crew: A 2/3 "A Firstmate fleet/operations coding session coordinating crewmates on …" → B 0/3 "A software-engineering session to ship and safely test Oasis/Opie fixe…" (wrong)

Better in B (92):

- rationale@2 om-orchestration/why:lanes: A 0/3 "They form a sequential dependency chain within the compaction lane; th…" (wrong) → B 3/3 "Because they all change the shared register.ts, so they are serialized…"
- rationale@3 om-orchestration/why:pin-new: A 0/3 "To ensure each setup loaded the intended plugin/version rather than ma…" (wrong) → B 3/3 "To keep each run on a stable plugin commit and prevent a merge from re…"
- rationale@3 om-orchestration/why:opus-round: A 1/3 unknown → B 2/3 "It found issues around subagent window limits, runtime usage budgeting…"
- value@3 om-orchestration/ord:5-after-7: A 0/3 "#5", evidence not in the context: ""Assistant merged issue #7 as `43af930`"; "Assistant merged issue #5 i…" → B 2/3 "ticket #5"
- value@3 om-orchestration/ord:6-after-5: A 0/3 "#6", evidence not in the context: ""Assistant merged issue #5 into main as `674b1ae`"; "Ticket #6 is merg…" → B 2/3 "ticket #6"
- value@3 om-orchestration/path:tests/eval/live.ts: A 1/3 "~/work/mods/observational-memory/tests/eval/live.ts", evidence not in the context: "Assistant edited `tests/eval/live.ts`; `~/work/mods/observational-memo…" → B 2/3 "~/work/mods/observational-memory/tests/eval/live.ts"
- next@4 om-orchestration/told-4: A 0/3 "The build had started and nothing had been spent." (wrong) → B 2/3 "That the issue #10 build had started and nothing had been spent yet."
- value@4 om-orchestration/exact:todo-fallback: A 1/3 "“observational-memory: Observation failed. Using built-in compaction”;…", evidence not in the context: ""The session transcript explicitly said `observational-memory: Observa…" → B 2/3 "observational-memory: Observation failed. Using built-in compaction"
- rationale@4 om-orchestration/why:pin-new: A 0/3 "To isolate and pin the exact plugin version under test instead of foll…" (wrong) → B 3/3 "To pin the exact plugin version and prevent a merge into main from rel…"
- rule@4 om-orchestration/rule:paid-runs: A 1/3 "yes", evidence not in the context: ""Go for it"; "User selected a `$50 cap` for the proposed benchmark mat…" → B 3/3 "yes, under a $50 cap"
- value@4 om-orchestration/ord:5-after-7: A 0/3 "#5", evidence not in the context: "Assistant merged issue #5 into main as `674b1ae`." → B 2/3 "#5"
- false@4 om-orchestration/abst:mismatch-cause: A 0/3 "Manual `/compact` calls observed the whole conversation, so the normal…" (wrong) → B 3/3 unknown
- rationale@5 om-orchestration/why:pin-new: A 0/3 "To pin the benchmark to a reproducible plugin checkout instead of a mo…" (wrong) → B 3/3 "To keep runs reproducible and prevent a merge into main from reloading…"
- value@5 om-orchestration/sup:rr-spend: A 0/3 "$17.76 estimated.", evidence not in the context: "the complete 12-run `recall-required` matrix finished: all runs valid;…" → B 3/3 "$17.76"
- rule@5 om-orchestration/rule:paid-runs: A 1/3 "yes", evidence not in the context: "$50 cap" → B 2/3 "yes"
- false@5 om-orchestration/abst:rr2-fallback: A 1/3 "It still remained just below the Observer-compaction trigger, so no Ob…" (wrong) → B 2/3 unknown
- file-state@3 om-v04/file:prune-guards: A 0/3 "Running and current sessions are ineligible; only ended sessions are c…", evidence not in the context: ""It never deletes a running session or the current one."; "keep OM_NO_…" → B 3/3 "It re-checks each candidate immediately before deletion; smoke tests u…"
- multi-hop@3 om-v04/hop:brief-pinned: A 0/3 "The recorded smoke-test brief was 730 characters; the `pin-brief` bran…" (wrong) → B 3/3 "14.6k characters, about 3.7k tokens; the pin-brief branch made it pers…"
- value@3 om-v04/str:debug-only: A 1/3 "`$.ui.log(text, { to: 'debug' })`" (wrong) → B 2/3 "$.ui.log(text, { to: "debug" })"
- value@3 om-v04/path:.claude-plugin/plugin.json: A 0/3 "`~/work/mods/observational-memory/.claude-plugin/plugin.json`", evidence not in the context: ""installed from `~/work/mods/observational-memory`"; "`.claude-plugin/…" → B 2/3 "~/work/mods/observational-memory/.claude-plugin/plugin.json"
- next@4 om-v04/next-4: A 1/3 "Monitor v0.4.5 for recurring nonpersistent mismatches and investigate …" (wrong) → B 2/3 "Add a one-time retry for a failed compaction observer chunk before fal…"
- file-state@4 om-v04/file:prune-guards: A 0/3 unknown → B 2/3 "It re-checks each session immediately before deletion; `OM_NO_PRUNE=1`…"
- file-state@5 om-v04/file:prune-guards: A 0/3 no answer → B 2/3 "It re-checks each session immediately before deletion; `OM_NO_PRUNE` d…"
- multi-hop@5 om-v04/hop:brief-pinned: A 0/3 no answer → B 3/3 "About 14.6k characters, roughly 3.7k tokens; the `pin-brief` branch ma…"
- value@5 om-v04/str:retrying-rows: A 0/3 no answer → B 3/3 "retrying rows X-Y at compaction once (reason)"
- false@5 om-v04/no-remote: A 1/3 no answer → B 3/3 "None"
- dropped@5 om-v04/tmp-deleted: A 1/3 no answer → B 3/3 "`/tmp/pcres`, `/tmp/om-live`, `/tmp/skillprobe`, `/tmp/probeplugin`, `…"
- lessons@6 om-v04/neg:hook-output-refuted: A 1/3 "Partly, but not alone: the later breakdown attributed about 26k tokens…" (wrong) → B 3/3 "No; hook output was tallied at only about 16k characters."
- file-state@6 om-v04/file:skill-rule: A 0/3 "Skills invoked during the last three main-thread turns keep their full…", evidence not in the context: ""Older skills are reduced to one-line stubs while skills invoked in th…" → B 2/3 "Skills invoked during the last three main-thread turns keep full text;…"
- file-state@6 om-v04/file:prune-guards: A 0/3 "It uses a live-session/process check and protects live sessions; `OM_N…", evidence not in the context: ""/proc behavior and macOS pruning remain unverified." / "The smoke scr…" → B 3/3 "It rechecks whether a session is live immediately before deletion; `OM…"
- multi-hop@6 om-v04/hop:brief-pinned: A 0/3 "The recorded smoke brief was 730 characters; the pin-brief branch, com…", evidence not in the context: ""the 730-character BRIEF-7Q preserved verbatim as the sole `<all-user-…" → B 3/3 "About 14.6k characters, roughly 3.7k tokens; branch `pin-brief` made i…"
- value@6 om-v04/str:retrying-rows: A 0/3 "It records the rejected reply's length and the first 500 characters in…" (wrong) → B 3/3 "`retrying rows X-Y at compaction once (reason)`"
- rationale@6 om-v04/why:skill-stub: A 0/3 unknown → B 2/3 "Because `om_recall` only returns short excerpts, not a skill's full te…"
- rule@6 om-v04/sup:failure-cause: A 0/3 "Luna omitted `</observations>` before `<current-task>`, so OM rejected…" (wrong) → B 2/3 "Luna omitted the closing `</observations>` tag, so OM rejected the goo…"
- rule@6 om-v04/sup:skill-stub-wording: A 0/3 unknown → B 3/3 "Invoke the skill again to reread it; use `om_recall` only to locate wh…"
- value@7 om-v04/log-notes: A 1/3 "The detailed log information should be retained verbatim in debug logs…" (wrong) → B 2/3 "The visible +N notes count, such as +11 notes"
- lessons@7 om-v04/neg:close-tag-prompt: A 0/3 "Because Luna still returned malformed replies without the closing tag;…" (wrong) → B 3/3 "Because the prompt instruction still failed to produce a closing tag 4…"
- file-state@7 om-v04/file:prune-guards: A 0/3 "It preserves sessions detected as live, with current-session protectio…", evidence not in the context: "running sessions remained, and `/proc` behavior and macOS pruning rema…" → B 3/3 "It rechecks live-session status immediately before deletion; `OM_NO_PR…"
- multi-hop@7 om-v04/hop:brief-pinned: A 0/3 "The recorded brief was 730 characters; the pin-brief branch made the f…" (wrong) → B 3/3 "About 14.6k characters, or 3.7k tokens; the `pin-brief` branch made th…"
- value@7 om-v04/str:retrying-rows: A 0/3 "It records a fast Observer failure and one retry; timeouts are not ret…" (wrong) → B 3/3 "`retrying rows X-Y at compaction once (reason)`"
- rationale@7 om-v04/why:skill-stub: A 0/3 unknown → B 2/3 "Because `om_recall` cannot recover full skill text; it only returns 40…"
- rule@7 om-v04/sup:skill-stub-wording: A 0/3 unknown → B 3/3 "Invoke the skill again; use `om_recall` only to find where it was load…"
- value@7 om-v04/path:/tmp/om-stall/firstmate.jsonl: A 1/3 "/tmp/om-stall/firstmate.jsonl", evidence not in the context: "copied the Firstmate transcript to `/tmp/om-stall/firstmate.jsonl`" → B 2/3 "/tmp/om-stall/firstmate.jsonl"
- lessons@8 om-v04/neg:close-tag-prompt: A 0/3 "The replay showed malformed replies omitted the closing observations t…" (wrong) → B 3/3 "Because the prompt instruction failed 4 times in 10 and was no better …"
- file-state@8 om-v04/file:prune-guards: A 1/3 unknown → B 3/3 "It rechecks the session immediately before deletion; `OM_NO_PRUNE` dis…"
- multi-hop@8 om-v04/hop:brief-pinned: A 0/3 "The brief was 730 characters; the pin-brief branch made it remain in `…" (wrong) → B 2/3 "About 14.6k characters, or 3.7k tokens; the `pin-brief` branch pinned …"
- value@8 om-v04/str:retrying-rows: A 0/3 unknown → B 3/3 "`retrying rows X-Y at compaction once (reason)`"
- rationale@8 om-v04/why:skill-stub: A 0/3 unknown → B 2/3 "Because `om_recall` cannot return the full skill text; it only returns…"
- rule@8 om-v04/sup:recall-cap: A 1/3 "16k per reply.", evidence not in the context: "recall-v2 ... 16k response caps" → B 3/3 "16,000 characters, about 4,000 tokens, shared with neighboring read co…"
- rule@8 om-v04/sup:failure-cause: A 1/3 "The Observer replies omitted `</observations>` before `<current-task>`…" (wrong) → B 3/3 "The Observer replies omitted the closing `</observations>` tag before …"
- rule@8 om-v04/sup:skill-stub-wording: A 1/3 unknown → B 3/3 "Invoke the skill again; use `om_recall` only to find where it was load…"
- lessons@9 om-v04/neg:close-tag-prompt: A 0/3 "Because Luna still omitted the closing tag; the parser had to tolerate…" (wrong) → B 3/3 "Because the prompt instruction was unreliable: Luna still failed four …"
- file-state@9 om-v04/file:prune-guards: A 1/3 "It uses live-session/process protection; `OM_NO_PRUNE=1` disables prun…", evidence not in the context: "live-session-safe pruning; OM_NO_PRUNE=1" → B 3/3 "It re-checks candidates immediately before deletion; `OM_NO_PRUNE` dis…"
- multi-hop@9 om-v04/hop:brief-pinned: A 0/3 "The recorded smoke brief was 730 characters (`BRIEF-7Q`); `pin-brief` …" (wrong) → B 3/3 "About 14.6k characters, or 3.7k tokens; the pin-brief branch made the …"
- value@9 om-v04/str:retrying-rows: A 0/3 unknown → B 3/3 "`retrying rows X-Y at compaction once (reason)`"
- rationale@9 om-v04/why:skill-stub: A 0/3 "It tells the agent to invoke the skill again to reread its text, while…" (wrong) → B 3/3 "Because om_recall only returns short excerpts, not the skill's full te…"
- rationale@9 om-v04/why:gap-left: A 1/3 "It was left unfixed because the attempted fix stopped the live smoke w…", evidence not in the context: "the engine's rapid-refill breaker stopped the live smoke" → B 2/3 "It was left unfixed because the attempted fix broke the live 60k run b…"
- rationale@9 om-v04/why:no-luna-kept-out: A 0/3 "Luna was kept because no-Luna scored slightly higher but required subs…" (wrong) → B 2/3 "Luna is much better at retaining information without prompting: 83% ve…"
- rule@9 om-v04/sup:stall-cause: A 1/3 "Background observation had stalled, so the 15:12 compaction had to syn…" (wrong) → B 3/3 "The v0.4.4-to-v0.4.5 parallel-call ordering change invalidated the led…"
- false@9 om-v04/near:store-vs-runner-cap: A 1/3 "no — the shared store is capped at 4 MiB, not 1 MiB" (wrong) → B 3/3 "no; the store is capped at 4 MiB"
- value@4 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "ssh -L 5173:127.0.0.1:5173 cameron-server"
- file-state@5 firstmate-11/file-learnings-16gb: A 0/3 unknown → B 3/3 "Never run a whole test suite at once because the 16GB server swaps."
- false@5 firstmate-11/upstream-push: A 1/3 "74153fae" (wrong) → B 2/3 "No commit was pushed to the `upstream` remote; `74153fae` was pushed t…"
- file-state@6 firstmate-11/file-captain-md: A 1/3 unknown → B 3/3 "Use `apps/web/.env.local` for real Google sign-in, never stub login, a…"
- file-state@6 firstmate-11/file-learnings-16gb: A 0/3 unknown → B 3/3 "Do not run a whole suite at once; run touched tests individually becau…"
- value@6 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "ssh -L 5173:127.0.0.1:5173 cameron-server"
- rationale@6 firstmate-11/why-pm-assigned-only: A 1/3 "Only when they are the primary or secondary PM; an unassigned PM does …" (wrong) → B 3/3 "A PM sees Sign only when they are the primary or secondary PM; on othe…"
- rationale@6 firstmate-11/why-sign-permission: A 1/3 "The button incorrectly checked the mark-signed permission; it now chec…" (wrong) → B 2/3 "The button incorrectly checked Mark Signed permission; it now checks t…"
- rule@6 firstmate-11/super-test-db: A 1/3 "`oasis_gorman_prodclone`", evidence not in the context: "local Gorman app running against the migrated `oasis_gorman_prodclone`…" → B 3/3 "oasis_gorman_prodclone"
- value@6 firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: A 1/3 unknown → B 2/3 "~/work/firstmate/projects/oasis-pavers-and-pools-opie"
- file-state@7 firstmate-11/file-learnings-16gb: A 0/3 unknown → B 3/3 "Do not run a whole test suite at once because the 16GB server swaps."
- multi-hop@7 firstmate-11/multi-accounts-sign: A 0/3 unknown → B 3/3 "Whether the Accounts role should retain in-person Sign on contracts."
- value@7 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "`ssh -L 5173:127.0.0.1:5173 cameron-server`"
- rationale@7 firstmate-11/why-pm-assigned-only: A 0/3 "A PM sees it only on contracts assigned to that PM; PM Lead is the una…" (wrong) → B 2/3 "An ordinary PM sees it on assigned contracts; signing any contract wou…"
- file-state@8 firstmate-11/file-captain-md: A 0/3 "Do not merge while the captain is testing; leave it paused for the cap…" (wrong) → B 3/3 "Use the project's existing `.env.local` so the captain can sign in wit…"
- file-state@8 firstmate-11/file-learnings-16gb: A 0/3 unknown → B 3/3 "Do not run a whole test suite at once; the 16GB server swaps."
- multi-hop@8 firstmate-11/multi-accounts-sign: A 0/3 unknown → B 3/3 "Whether the Accounts role should retain in-person Sign on contracts."
- value@8 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "ssh -L 5173:127.0.0.1:5173 cameron-server"
- false@8 firstmate-11/upstream-push: A 0/3 "74153fae" (wrong) → B 2/3 "none; only the fork was pushed, to `74153fae`"
- value@9 firstmate-11/port: A 1/3 "5173", evidence not in the context: "local server was available at `http://localhost:5173` and returned HTT…" → B 2/3 "5173"
- file-state@9 firstmate-11/file-learnings-16gb: A 0/3 unknown → B 3/3 "Do not run a whole test suite at once; run touched tests individually …"
- file-state@9 firstmate-11/file-sbom-acceptances: A 1/3 "`.github/sbom-license-acceptances.json`; `libheif-js` with LGPL-3.0-on…", evidence not in the context: "`.github/sbom-license-acceptances.json` / `PR #1420 adds weak-copyleft…" → B 2/3 "`.github/sbom-license-acceptances.json`; `libheif-js` (LGPL-3.0-only)."
- multi-hop@9 firstmate-11/multi-accounts-sign: A 0/3 unknown → B 3/3 "Whether the Accounts role should keep in-person Sign on contracts."
- value@9 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "ssh -L 5173:127.0.0.1:5173 cameron-server"
- rule@9 firstmate-11/order-sbom-prs: A 1/3 "PR #1420 came first: weak-copyleft gating and acceptance of libheif-js…", evidence not in the context: "PR #1420 adds weak-copyleft gating and accepts `libheif-js` (LGPL-3.0-…" → B 2/3 "PR 1420 came first: weak-copyleft gating and acceptance handling. PR 1…"
- file-state@10 firstmate-11/file-learnings-16gb: A 0/3 unknown → B 3/3 "Do not run a whole test suite at once because the 16GB server swaps; r…"
- multi-hop@10 firstmate-11/multi-gorman-prod-setup: A 1/3 "Upload the PDF in Reference Data, place the five fields, re-pick the j…", evidence not in the context: "Then, on the Contract Signed card, choose that document and enter Gorm…" → B 2/3 "Upload the Job Information Report, place the five fields, switch the j…"
- value@10 firstmate-11/exact-db-url-var: A 1/3 unknown → B 3/3 "Reset the `read_only` Neon role's password and update `PRODUCTION_READ…"
- rationale@10 firstmate-11/why-pm-assigned-only: A 0/3 "A PM sees it on contracts assigned to that PM; not every contract beca…" (wrong) → B 2/3 "An ordinary PM sees it only on contracts where they are the assigned P…"
- multi-hop@11 firstmate-11/multi-accounts-sign: A 0/3 unknown → B 3/3 "Whether the Accounts role should keep in-person Sign on contracts."
- value@11 firstmate-11/exact-db-url-var: A 0/3 unknown → B 3/3 "Reset the Neon `read_only` role password and update `PRODUCTION_READ_O…"
- false@11 firstmate-11/near-pm-every-contract: A 1/3 "No, not an ordinary PM; only the assigned PM qualifies. An unassigned …", evidence not in the context: "Even if PM Lead isnt the pm on that it should see the Sign in person b…" → B 3/3 "No, not as an unassigned regular PM; the PM Lead role is the exception…"

Samples disagreed: A 181, B 163:

- A purpose@1 om-orchestration/purpose:agent-teams-tickets: 1/3
- A file-state@1 om-orchestration/file:testing-guide: 2/3
- A next@2 om-orchestration/told-2: 2/3
- A file-state@2 om-orchestration/file:testing-guide: 1/3
- A rationale@2 om-orchestration/why:opus-round: 2/3
- A value@3 om-orchestration/hard-cap: 2/3
- A multi-hop@3 om-orchestration/hop:usage: 2/3
- A rationale@3 om-orchestration/why:cut-builtin-recall-new: 1/3
- A rationale@3 om-orchestration/why:opus-round: 1/3
- A dropped@3 om-orchestration/deploy-id: 2/3
- A value@3 om-orchestration/path:tests/eval/live.ts: 1/3
- A purpose@4 om-orchestration/purpose:agent-teams-tickets: 2/3
- A multi-hop@4 om-orchestration/hop:bench-worktrees: 2/3
- A value@4 om-orchestration/exact:not-persistent: 2/3
- A value@4 om-orchestration/exact:rescored-results: 2/3
- A value@4 om-orchestration/exact:todo-fallback: 1/3
- A rationale@4 om-orchestration/why:cut-builtin-recall-new: 1/3
- A rationale@4 om-orchestration/why:opus-round: 2/3
- A rule@4 om-orchestration/sup:test-count-3: 2/3
- A value@4 om-orchestration/sup:om-invalid: 1/3
- A value@4 om-orchestration/sup:main-head-4: 2/3
- A rule@4 om-orchestration/rule:paid-runs: 1/3
- A value@4 om-orchestration/ord:6-after-5: 2/3
- A dropped@4 om-orchestration/deploy-id: 2/3
- A next@5 om-orchestration/told-5: 2/3
- A lessons@5 om-orchestration/neg:tool-search: 1/3
- A lessons@5 om-orchestration/neg:vcc-brief-test: 2/3
- A value@5 om-orchestration/exact:todo-fallback: 2/3
- A rationale@5 om-orchestration/why:opus-round: 2/3
- A rule@5 om-orchestration/sup:live-harness: 2/3
- A rule@5 om-orchestration/rule:paid-runs: 1/3
- A value@5 om-orchestration/ord:5-after-7: 2/3
- A value@5 om-orchestration/ord:6-after-5: 2/3
- A false@5 om-orchestration/dist:old-omrecall-94: 1/3
- A false@5 om-orchestration/abst:rr2-fallback: 1/3
- A next@1 om-v04/next-1: 2/3
- A next@1 om-v04/told-1: 2/3
- A false@2 om-v04/no-remote: 2/3
- A done@3 om-v04/done:worktrees-removed: 2/3
- A value@3 om-v04/haiku-not-faster: 1/3
- A value@3 om-v04/str:debug-only: 1/3
- A value@4 om-v04/log-notes: 1/3
- A next@4 om-v04/next-4: 1/3
- A value@4 om-v04/scope:ctx-worktree: 2/3
- A permission@5 om-v04/permission:delete-tmp: 2/3
- A done@5 om-v04/done:tmp-sessions-deleted: 2/3
- A done@5 om-v04/done:worktrees-removed: 2/3
- A value@5 om-v04/subagent-model: 2/3
- A value@5 om-v04/standing-brief: 2/3
- A value@5 om-v04/log-notes: 2/3
- A value@5 om-v04/main-0.4.6: 2/3
- A value@5 om-v04/kept-v042: 2/3
- A value@5 om-v04/thinking-low: 2/3
- A lessons@5 om-v04/neg:c029150-dropped: 2/3
- A file-state@5 om-v04/file:pi-isolation: 2/3
- A value@5 om-v04/str:not-persistent: 2/3
- A rationale@5 om-v04/why:timeout-not-retried: 2/3
- A rationale@5 om-v04/why:parallel-order: 2/3
- A false@5 om-v04/no-remote: 1/3
- A false@5 om-v04/abs:narration: 2/3
- A false@5 om-v04/scope:cmp-kept: 2/3
- A dropped@5 om-v04/tmp-deleted: 1/3
- A value@5 om-v04/path:.claude-plugin/plugin.json: 1/3
- A value@6 om-v04/log-notes: 1/3
- A lessons@6 om-v04/neg:hook-output-refuted: 1/3
- A multi-hop@6 om-v04/hop:151-messages: 2/3
- A multi-hop@6 om-v04/hop:settle-error-fix: 2/3
- A rationale@6 om-v04/why:parallel-order: 2/3
- A value@6 om-v04/order:firstmate-version-switch: 1/3
- A false@6 om-v04/near:sha-swap: 2/3
- A value@7 om-v04/log-notes: 1/3
- A next@7 om-v04/told-7: 2/3
- A file-state@7 om-v04/file:skill-rule: 2/3
- A file-state@7 om-v04/file:parser-debug: 2/3
- A multi-hop@7 om-v04/hop:moved-transcript: 2/3
- A value@7 om-v04/order:firstmate-version-switch: 2/3
- A rule@7 om-v04/sup:failure-cause: 2/3
- A false@7 om-v04/no-remote: 1/3
- A false@7 om-v04/near:build-labels: 1/3
- A false@7 om-v04/near:sha-swap: 1/3
- A next@7 om-v04/last-ask:4179: 2/3
- A value@7 om-v04/path:/tmp/om-stall/firstmate.jsonl: 1/3
- A next@8 om-v04/told-8: 2/3
- A value@8 om-v04/main-0.4.12: 1/3
- A file-state@8 om-v04/file:skill-rule: 2/3
- A file-state@8 om-v04/file:parser-debug: 2/3
- A file-state@8 om-v04/file:prune-guards: 1/3
- A value@8 om-v04/order:firstmate-version-switch: 1/3
- A rule@8 om-v04/sup:recall-cap: 1/3
- A rule@8 om-v04/sup:stall-cause: 2/3
- A rule@8 om-v04/sup:failure-cause: 1/3
- A rule@8 om-v04/sup:skill-stub-wording: 1/3
- A false@8 om-v04/no-remote: 2/3
- A false@8 om-v04/near:store-vs-runner-cap: 2/3
- A false@8 om-v04/near:build-labels: 1/3
- A false@8 om-v04/abs:hook-trim: 2/3
- A false@8 om-v04/abs:subagent-300k: 2/3
- A value@8 om-v04/path:tests/register.test.ts: 1/3
- A value@9 om-v04/log-notes: 1/3
- A value@9 om-v04/main-0.4.13: 2/3
- A purpose@9 om-v04/purpose:om-plugin-orchestrator: 1/3
- A lessons@9 om-v04/neg:vcc-install: 2/3
- A file-state@9 om-v04/file:prune-guards: 1/3
- A multi-hop@9 om-v04/hop:151-messages: 2/3
- A rationale@9 om-v04/why:gap-left: 1/3
- A value@9 om-v04/order:firstmate-version-switch: 2/3
- A rule@9 om-v04/sup:main-tests: 2/3
- A rule@9 om-v04/sup:stall-cause: 1/3
- A rule@9 om-v04/sup:failure-cause: 2/3
- A false@9 om-v04/near:store-vs-runner-cap: 1/3
- A false@9 om-v04/near:build-labels: 2/3
- A false@9 om-v04/near:sha-swap: 1/3
- A false@9 om-v04/abs:hook-trim: 2/3
- A false@9 om-v04/abs:subagent-300k: 2/3
- A dropped@9 om-v04/tmp-deleted: 2/3
- A next@4 firstmate-11/next-4: 1/3
- A rule@5 firstmate-11/super-herdr-updated: 2/3
- A false@5 firstmate-11/upstream-push: 1/3
- A permission@6 firstmate-11/permission:prod-read-only: 2/3
- A value@6 firstmate-11/saved-item: 2/3
- A next@6 firstmate-11/told-6: 1/3
- A value@6 firstmate-11/gorman-pr: 2/3
- A value@6 firstmate-11/sign-pr: 2/3
- A value@6 firstmate-11/save-fix-pr: 2/3
- A value@6 firstmate-11/port: 2/3
- A value@6 firstmate-11/tools: 2/3
- A lessons@6 firstmate-11/neg-tailnet-signin: 2/3
- A lessons@6 firstmate-11/neg-documenso-local: 2/3
- A lessons@6 firstmate-11/neg-tab-price: 2/3
- A file-state@6 firstmate-11/file-captain-md: 1/3
- A file-state@6 firstmate-11/file-gorman-pdf-script: 2/3
- A file-state@6 firstmate-11/file-prod-change-backup: 2/3
- A multi-hop@6 firstmate-11/multi-watcher-5415: 2/3
- A value@6 firstmate-11/scope-prod-write: 2/3
- A value@6 firstmate-11/scope-mark-signed: 2/3
- A rationale@6 firstmate-11/why-pm-assigned-only: 1/3
- A rationale@6 firstmate-11/why-sign-permission: 1/3
- A rule@6 firstmate-11/super-saved-item: 2/3
- A rule@6 firstmate-11/super-test-db: 1/3
- A rule@6 firstmate-11/super-firstmate-pushed: 2/3
- A false@6 firstmate-11/upstream-push: 2/3
- A false@6 firstmate-11/near-pm-every-contract: 2/3
- A false@6 firstmate-11/near-dump-deleted: 2/3
- A false@6 firstmate-11/abst-drug-quota: 2/3
- A false@6 firstmate-11/abst-password-rotated: 2/3
- A dropped@6 firstmate-11/hook-backup: 2/3
- A dropped@6 firstmate-11/fork-sha: 2/3
- A done@6 firstmate-11/pr:1418: 2/3
- A next@6 firstmate-11/last-ask:2679: 2/3
- A value@6 firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: 1/3
- A purpose@7 firstmate-11/purpose:firstmate-crew: 1/3
- A file-state@7 firstmate-11/file-captain-md: 2/3
- A rule@7 firstmate-11/super-test-db: 2/3
- A rule@7 firstmate-11/super-herdr-updated: 2/3
- A false@7 firstmate-11/upstream-push: 2/3
- A purpose@8 firstmate-11/purpose:firstmate-crew: 2/3
- A rule@8 firstmate-11/super-test-db: 2/3
- A rule@8 firstmate-11/super-herdr-updated: 1/3
- A done@8 firstmate-11/pr:1421: 2/3
- A value@9 firstmate-11/port: 1/3
- A file-state@9 firstmate-11/file-sbom-acceptances: 1/3
- A rule@9 firstmate-11/super-test-db: 2/3
- A rule@9 firstmate-11/super-herdr-updated: 2/3
- A rule@9 firstmate-11/order-sbom-prs: 1/3
- A false@9 firstmate-11/near-pm-every-contract: 2/3
- A value@9 firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: 1/3
- A purpose@10 firstmate-11/purpose:firstmate-crew: 2/3
- A lessons@10 firstmate-11/neg-address-split: 2/3
- A file-state@10 firstmate-11/file-captain-md: 2/3
- A multi-hop@10 firstmate-11/multi-accounts-sign: 2/3
- A multi-hop@10 firstmate-11/multi-gorman-prod-setup: 1/3
- A value@10 firstmate-11/exact-db-url-var: 1/3
- A false@10 firstmate-11/upstream-push: 1/3
- A done@10 firstmate-11/pr:1423: 1/3
- A value@11 firstmate-11/port: 2/3
- A purpose@11 firstmate-11/purpose:firstmate-crew: 1/3
- A file-state@11 firstmate-11/file-learnings-16gb: 2/3
- A rule@11 firstmate-11/super-gorman-document: 2/3
- A false@11 firstmate-11/near-pm-every-contract: 1/3
- A done@11 firstmate-11/pr:1425: 2/3
- A value@11 firstmate-11/path:config/stow-pass-horizon: 2/3
- B purpose@1 om-orchestration/purpose:agent-teams-tickets: 1/3
- B value@1 om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: 2/3
- B rationale@2 om-orchestration/why:opus-round: 2/3
- B rule@2 om-orchestration/rule:paid-runs: 1/3
- B file-state@3 om-orchestration/file:testing-guide: 1/3
- B multi-hop@3 om-orchestration/hop:bench-worktrees: 2/3
- B multi-hop@3 om-orchestration/hop:usage: 2/3
- B value@3 om-orchestration/exact:not-persistent: 2/3
- B rationale@3 om-orchestration/why:cut-builtin-recall-new: 1/3
- B rationale@3 om-orchestration/why:opus-round: 2/3
- B rule@3 om-orchestration/sup:live-harness: 2/3
- B value@3 om-orchestration/ord:5-after-7: 2/3
- B value@3 om-orchestration/ord:6-after-5: 2/3
- B value@3 om-orchestration/path:tests/eval/live.ts: 2/3
- B value@4 om-orchestration/budget: 2/3
- B next@4 om-orchestration/told-4: 2/3
- B multi-hop@4 om-orchestration/hop:x-req-id: 2/3
- B rule@4 om-orchestration/rule:worktree-only: 2/3
- B value@4 om-orchestration/exact:todo-fallback: 2/3
- B rationale@4 om-orchestration/why:opus-round: 2/3
- B value@4 om-orchestration/ord:5-after-7: 2/3
- B value@4 om-orchestration/ord:6-after-5: 2/3
- B false@4 om-orchestration/abst:rr2-fallback: 1/3
- B next@5 om-orchestration/told-5: 2/3
- B purpose@5 om-orchestration/purpose:agent-teams-tickets: 1/3
- B lessons@5 om-orchestration/neg:vcc-brief-test: 2/3
- B file-state@5 om-orchestration/file:testing-guide: 1/3
- B value@5 om-orchestration/exact:todo-fallback: 2/3
- B rule@5 om-orchestration/sup:live-harness: 2/3
- B rule@5 om-orchestration/rule:paid-runs: 2/3
- B false@5 om-orchestration/abst:rr2-fallback: 2/3
- B done@3 om-v04/done:worktrees-removed: 2/3
- B value@3 om-v04/log-notes: 1/3
- B value@3 om-v04/scope:ctx-worktree: 1/3
- B value@3 om-v04/str:debug-only: 2/3
- B value@3 om-v04/path:.claude-plugin/plugin.json: 2/3
- B permission@4 om-v04/permission:delete-tmp: 2/3
- B done@4 om-v04/done:tmp-sessions-deleted: 2/3
- B value@4 om-v04/subagent-model: 2/3
- B value@4 om-v04/standing-brief: 2/3
- B next@4 om-v04/next-4: 2/3
- B value@4 om-v04/kept-v042: 2/3
- B value@4 om-v04/thinking-low: 2/3
- B value@4 om-v04/haiku-not-faster: 1/3
- B lessons@4 om-v04/neg:c029150-dropped: 2/3
- B file-state@4 om-v04/file:pi-isolation: 2/3
- B file-state@4 om-v04/file:prune-guards: 2/3
- B multi-hop@4 om-v04/hop:brief-pinned: 1/3
- B value@4 om-v04/scope:ctx-worktree: 2/3
- B value@4 om-v04/str:not-persistent: 2/3
- B rationale@4 om-v04/why:parallel-order: 1/3
- B false@4 om-v04/no-remote: 2/3
- B false@4 om-v04/abs:narration: 2/3
- B false@4 om-v04/scope:cmp-kept: 2/3
- B dropped@4 om-v04/tmp-deleted: 2/3
- B next@4 om-v04/last-ask:2354: 2/3
- B value@4 om-v04/path:~/.claude/plugins/store/observational-memory_inline-8aabd6f3acbe.json: 2/3
- B value@5 om-v04/log-notes: 2/3
- B file-state@5 om-v04/file:prune-guards: 2/3
- B value@5 om-v04/path:.claude-plugin/plugin.json: 1/3
- B value@6 om-v04/haiku-not-faster: 1/3
- B file-state@6 om-v04/file:pi-isolation: 2/3
- B file-state@6 om-v04/file:skill-rule: 2/3
- B multi-hop@6 om-v04/hop:151-messages: 2/3
- B rationale@6 om-v04/why:skill-stub: 2/3
- B value@6 om-v04/order:firstmate-version-switch: 1/3
- B rule@6 om-v04/sup:failure-cause: 2/3
- B false@6 om-v04/no-remote: 1/3
- B false@6 om-v04/near:sha-swap: 2/3
- B value@6 om-v04/path:/tmp/om-stall/firstmate.jsonl: 1/3
- B value@7 om-v04/log-notes: 2/3
- B next@7 om-v04/told-7: 2/3
- B file-state@7 om-v04/file:skill-rule: 2/3
- B rationale@7 om-v04/why:skill-stub: 2/3
- B rule@7 om-v04/sup:stall-cause: 2/3
- B rule@7 om-v04/sup:failure-cause: 1/3
- B false@7 om-v04/no-remote: 1/3
- B false@7 om-v04/near:build-labels: 1/3
- B false@7 om-v04/abs:hook-trim: 2/3
- B next@7 om-v04/last-ask:4179: 2/3
- B value@7 om-v04/path:/tmp/cmp2/run.py: 2/3
- B value@7 om-v04/path:/tmp/om-stall/firstmate.jsonl: 2/3
- B lessons@8 om-v04/neg:c029150-dropped: 2/3
- B lessons@8 om-v04/neg:subagent-veto: 2/3
- B file-state@8 om-v04/file:skill-rule: 1/3
- B file-state@8 om-v04/file:parser-debug: 2/3
- B multi-hop@8 om-v04/hop:settle-error-fix: 2/3
- B multi-hop@8 om-v04/hop:brief-pinned: 2/3
- B rationale@8 om-v04/why:skill-stub: 2/3
- B rationale@8 om-v04/why:parallel-order: 2/3
- B value@8 om-v04/order:firstmate-version-switch: 1/3
- B rule@8 om-v04/sup:stall-cause: 1/3
- B false@8 om-v04/no-remote: 1/3
- B false@8 om-v04/abs:subagent-300k: 2/3
- B value@8 om-v04/path:tests/register.test.ts: 1/3
- B value@8 om-v04/path:hooks/register.ts: 1/3
- B done@9 om-v04/done:recall-merged: 1/3
- B value@9 om-v04/main-0.4.13: 2/3
- B lessons@9 om-v04/neg:sched-reset: 2/3
- B lessons@9 om-v04/neg:subagent-veto: 2/3
- B lessons@9 om-v04/neg:vcc-install: 2/3
- B file-state@9 om-v04/file:parser-debug: 2/3
- B rationale@9 om-v04/why:timeout-not-retried: 2/3
- B rationale@9 om-v04/why:parallel-order: 2/3
- B rationale@9 om-v04/why:gap-left: 2/3
- B rationale@9 om-v04/why:no-luna-kept-out: 2/3
- B rule@9 om-v04/sup:todo-commit: 2/3
- B false@9 om-v04/no-remote: 1/3
- B false@9 om-v04/near:build-labels: 2/3
- B false@9 om-v04/abs:hook-trim: 2/3
- B next@4 firstmate-11/next-4: 1/3
- B lessons@4 firstmate-11/neg-session-cookie: 2/3
- B lessons@4 firstmate-11/neg-tailnet-signin: 1/3
- B file-state@4 firstmate-11/file-learnings-16gb: 1/3
- B lessons@5 firstmate-11/neg-tailnet-signin: 1/3
- B value@5 firstmate-11/exact-ssh-tunnel: 2/3
- B rule@5 firstmate-11/super-herdr-updated: 2/3
- B false@5 firstmate-11/upstream-push: 2/3
- B value@5 firstmate-11/path:bin/fm-brief.sh: 2/3
- B file-state@6 firstmate-11/file-prod-change-backup: 2/3
- B rationale@6 firstmate-11/why-sign-permission: 2/3
- B rationale@6 firstmate-11/why-imports-not-codex: 1/3
- B rule@6 firstmate-11/super-herdr-updated: 1/3
- B next@6 firstmate-11/last-ask:2679: 1/3
- B value@6 firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: 2/3
- B value@7 firstmate-11/scope-prod-write: 2/3
- B rationale@7 firstmate-11/why-pm-assigned-only: 2/3
- B rule@7 firstmate-11/super-herdr-updated: 2/3
- B false@7 firstmate-11/upstream-push: 2/3
- B purpose@8 firstmate-11/purpose:firstmate-crew: 2/3
- B file-state@8 firstmate-11/file-sbom-acceptances: 1/3
- B rationale@8 firstmate-11/why-pm-assigned-only: 1/3
- B rationale@8 firstmate-11/why-date-backdate: 2/3
- B rule@8 firstmate-11/super-herdr-updated: 1/3
- B false@8 firstmate-11/upstream-push: 2/3
- B false@8 firstmate-11/near-pm-every-contract: 2/3
- B done@8 firstmate-11/pr:1421: 2/3
- B value@9 firstmate-11/port: 2/3
- B file-state@9 firstmate-11/file-sbom-acceptances: 2/3
- B value@9 firstmate-11/scope-hold-1417: 2/3
- B rationale@9 firstmate-11/why-blank-body-block: 2/3
- B rationale@9 firstmate-11/why-pm-assigned-only: 1/3
- B rule@9 firstmate-11/super-gorman-document: 2/3
- B rule@9 firstmate-11/super-herdr-updated: 1/3
- B rule@9 firstmate-11/order-sbom-prs: 2/3
- B false@9 firstmate-11/near-pm-every-contract: 2/3
- B done@9 firstmate-11/pr:1422: 2/3
- B value@10 firstmate-11/port: 1/3
- B file-state@10 firstmate-11/file-sbom-acceptances: 1/3
- B multi-hop@10 firstmate-11/multi-prod-dump: 2/3
- B multi-hop@10 firstmate-11/multi-gorman-prod-setup: 2/3
- B rationale@10 firstmate-11/why-pm-assigned-only: 2/3
- B rule@10 firstmate-11/super-gorman-document: 2/3
- B rule@10 firstmate-11/order-sbom-prs: 1/3
- B false@10 firstmate-11/upstream-push: 1/3
- B done@10 firstmate-11/pr:1423: 1/3
- B value@10 firstmate-11/path:bin/fm-session-start.sh: 1/3
- B value@11 firstmate-11/gorman-pr: 2/3
- B file-state@11 firstmate-11/file-sbom-acceptances: 1/3
- B rule@11 firstmate-11/super-gorman-document: 2/3
- B rule@11 firstmate-11/order-rename-then-subject: 1/3
- B rule@11 firstmate-11/order-sbom-prs: 1/3
- B value@11 firstmate-11/path:config/stow-pass-horizon: 2/3

# Compaction A/B

A: A .scratch/omv-code/base7 (dir)
B: B .scratch/omv/carry3f (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 55.6 | 58.0 | +2.4 | 115/207 | 120/207 | 5 |  |
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
| lessons | 7 | 59.2 | 63.3 | +4.1 | 29/49 | 31/49 | 2 |  |
| file-state | 7 | 64.6 | 65.8 | +1.3 | 51/79 | 52/79 | 1 |  |
| multi-hop | 7 | 52.3 | 79.5 | +27.3 | 23/44 | 35/44 | 12 |  |
| rationale | 7 | 50.9 | 65.5 | +14.5 | 28/55 | 36/55 | 8 |  |
| chronology | 6 | 75.5 | 77.4 | +1.9 | 357/473 | 366/473 | 9 |  |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| purpose | 5 | 0.0 | 0.0 | 0 | 0/24 | 0/24 |  |  |
| tokens | 6 | 73.4 | 69.0 | -4.4 | 3/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.3** | **81.4** | **+3.0** | 80.6% | 83.3% | **56** | **0** |

Per transcript: om-orchestration 80.8 → 82.3 (+1.6); om-v04 80.0 → 84.2 (+4.2); firstmate-11 75.8 → 78.8 (+3.0).
Flips: 56 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 19 up, 0 down, sign test p=0.0000038. Passed counts are over all samples.

Verdict: B is better: 3.0 weighted points, 3 of 3 transcripts agree, 19 unique items flip to B against 0.
efficiency: same (B vs A: mean tokens +7%, reduction ratio +7%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 20k |
| context tokens per cut, max | 31k | 33k |
| reduction ratio (compacted / replaced), mean | 12.1% | 12.9% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (19 unique items):

- chronology om-orchestration/path:.claude/types: ↑ at @3 @4 @5
- rationale om-orchestration/why:pin-new: ↑ at @3 @4 @5
- identifiers om-orchestration/path:.claude/types: ↑ at @4
- identifiers om-orchestration/usd:$1.50: ↑ at @5
- identifiers om-orchestration/number:1.50: ↑ at @5
- identifiers om-v04/number:0.003: ↑ at @1
- multi-hop om-v04/hop:brief-pinned: ↑ at @3 @4 @5 @6 @7 @8 @9
- facts om-v04/str:retrying-rows: ↑ at @5 @6 @7 @8 @9
- reversals om-v04/sup:skill-stub-wording: ↑ at @6 @7 @8 @9
- lessons om-v04/neg:subagent-veto: ↑ at @8 @9
- reversals om-v04/sup:subagent-observed: ↑ at @8 @9
- reversals om-v04/sup:recall-cap: ↑ at @8
- identifiers om-v04/number:15.6: ↑ at @9
- facts firstmate-11/exact-ssh-tunnel: ↑ at @4 @6 @7 @8 @9
- chronology firstmate-11/path:~/.codex/AGENTS.md: ↑ at @5 @6 @7 @8 @9 @10
- file-state firstmate-11/file-prod-change-backup: ↑ at @7
- multi-hop firstmate-11/multi-accounts-sign: ↑ at @7 @8 @9 @10 @11
- rationale firstmate-11/why-pm-assigned-only: ↑ at @7 @8 @9 @10 @11
- facts firstmate-11/exact-db-url-var: ↑ at @10 @11

## Long chain (not in the total)

A: A .scratch/omv-code/base7 (dir) (long chain, every 5th cut)
B: B .scratch/omv/carry3f (dir) (long chain, every 5th cut)

A sample 1: long 335 calls, 0 fresh
B sample 1: long 336 calls, 11 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 43.9 | 45.3 | +1.4 | 93/212 | 96/212 | 7 | 4 |
| constraints | 6 | 96.5 | 96.5 | 0 | 247/256 | 247/256 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 258/258 | 258/258 |  |  |
| corrections | 8 | 99.6 | 99.6 | 0 | 514/516 | 514/516 |  |  |
| reversals | 6 | 45.8 | 47.8 | +2.0 | 93/203 | 97/203 | 10 | 6 |
| approvals | 5 | 50.0 | 47.9 | -2.1 | 24/48 | 23/48 | 2 | 3 |
| asks | 5 | 100.0 | 100.0 | 0 | 48/48 | 48/48 |  |  |
| in-progress | 5 | 72.0 | 72.0 | 0 | 18/25 | 18/25 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 85.7 | 85.7 | 0 | 66/77 | 66/77 |  |  |
| commits | 4 | 84.7 | 80.3 | -4.4 | 155/183 | 147/183 | 1 | 9 |
| failures | 6 | 60.0 | 60.0 | 0 | 6/10 | 6/10 |  |  |
| facts | 5 | 42.4 | 41.7 | -0.7 | 383/903 | 377/903 | 31 | 37 |
| decisions | 5 | 28.8 | 28.5 | -0.3 | 93/323 | 92/323 | 17 | 18 |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 47.8 | 44.7 | -3.0 | 235/492 | 220/492 | 19 | 34 |
| absent | 5 | 98.0 | 99.0 | +1.0 | 288/294 | 291/294 | 5 | 2 |
| tokens | 6 | 10.1 | 8.1 | -2.1 | 0/16 | 0/16 |  |  |
| budget | 3 | 87.4 | 88.2 | +0.8 | 5/16 | 6/16 | 3 | 2 |
| **total** | | **61.8** | **62.2** | **+0.4** | 65.5% | 65.0% | **95** | **115** |

Per transcript: long 61.8 → 62.2 (+0.4).
Flips: 95 up, 115 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 39 up, 44 down, sign test p=0.66. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +1%, reduction ratio +2%, model tokens +1%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 43k | 44k |
| context tokens per cut, max | 72k | 66k |
| reduction ratio (compacted / replaced), mean | 29.0% | 29.6% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 10 (321k / 34k) | 11 (358k / 33k) |
| model tokens in + out | 6039k | 6075k |
| critical-path calls (tokens in / out) | 115 (1983k / 84k) | 115 (1990k / 83k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (44 unique items):

- chronology long/path:hooks/hooks.json: ↓ at @30 @70 @75
- chronology long/om-v04-main-0.4.13: ↓ at @30 @35
- decisions long/om-v04-no-subagent-threshold: ↓ at @30
- decisions long/om-v04-neg:sched-reset: ↓ at @30
- facts long/om-v04-hop:moved-transcript: ↓ at @30 @35
- approvals long/om-v04-scope:no-lavish: ↓ at @30 @35
- decisions long/om-v04-why:skill-stub: ↓ at @30 @35
- identifiers long/path:~/work/mods/precompact: ↓ at @40
- reversals long/firstmate-11-order-sbom-prs: ↓ at @40 @45 @50
- facts long/om-v04-hop:made-up-answers: ↓ at @45 @50 @60
- facts long/firstmate-11-why-sbom-passed: ↓ at @45 @50 @55 @60
- decisions long/om-orchestration-assistant-model: ↓ at @45 @50
- decisions long/om-orchestration-reviewer-model: ↓ at @45 @50
- facts long/om-orchestration-orchestration-log: ↓ at @45 @50 @70 @75
- facts long/om-orchestration-file:scenarios-fix: ↓ at @45 @50
- facts long/om-orchestration-hop:bench-worktrees: ↓ at @45 @50
- facts long/om-orchestration-exact:not-persistent: ↓ at @45 @50
- absent long/om-v04-no-remote: ↓ at @45 @50
- reversals long/om-orchestration-rule:push-now: ↓ at @45 @50
- chronology long/om-orchestration-ord:5-after-7: ↓ at @45 @50
- commits long/pr:1421: ↓ at @55 @60
- commits long/pr:1422: ↓ at @55 @60
- chronology long/path:tests/register.test.ts: ↓ at @55 @60
- chronology long/path:/tmp/compact-test-last.json: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/version:2.1.280: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/path:~/work/mods/compact-test: ↓ at @55 @60 @65 @70 @75 @80
- decisions long/om-v04-merge-recall: ↓ at @55 @60
- chronology long/firstmate-11-sbom-followups-pr: ↓ at @55 @60
- decisions long/firstmate-11-sbom-cause: ↓ at @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-tools: ↓ at @55 @60
- facts long/firstmate-11-multi-prod-dump: ↓ at @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-exact-libheif-version: ↓ at @55 @60 @65 @70 @75 @80
- decisions long/om-orchestration-herdr-panes: ↓ at @55 @60
- facts long/om-orchestration-file:bench-baseline: ↓ at @55 @60
- approvals long/line 38131: ↓ at @60
- reversals long/firstmate-11-order-rename-then-subject: ↓ at @65
- commits long/pr:1424: ↓ at @70 @75 @80
- chronology long/path:.claude-plugin/plugin.json: ↓ at @70 @75
- chronology long/firstmate-11-street-address-pr: ↓ at @70 @75 @80
- identifiers long/path:scripts/bench-replay.ts: ↓ at @75
- identifiers long/path:tests/eval/replay-specs: ↓ at @75
- identifiers long/number:0.30: ↓ at @75
- commits long/commit:9466e8a: ↓ at @80
- commits long/commit:e2146bf: ↓ at @80

Better in B (39 unique items):

- identifiers long/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @10
- decisions long/om-v04-neg:subagent-veto: ↑ at @15 @20 @25
- decisions long/om-v04-neg:hook-output-refuted: ↑ at @15 @20 @25
- facts long/om-v04-hop:brief-pinned: ↑ at @15 @60 @65
- facts long/om-v04-str:retrying-rows: ↑ at @15 @20 @25
- chronology long/om-v04-order:firstmate-version-switch: ↑ at @15
- reversals long/om-v04-sup:skill-stub-wording: ↑ at @15 @20 @25
- chronology long/om-v04-order:parser-line-by-line: ↑ at @15 @20 @25
- chronology long/path:/tmp/cctypes/claude-code.d.ts: ↑ at @20 @25 @30 @35 @40 @45 @50
- chronology long/path:/tmp/cctypes: ↑ at @20 @25 @30 @35 @40 @45 @50
- decisions long/om-v04-neg:vcc-install: ↑ at @20 @25
- facts long/om-v04-file:parser-debug: ↑ at @20 @25
- facts long/om-v04-hop:settle-error-fix: ↑ at @20 @25
- approvals long/om-v04-scope:ctx-worktree: ↑ at @20 @25
- decisions long/om-v04-why:parallel-order: ↑ at @20 @25 @30 @35
- reversals long/om-v04-sup:subagent-observed: ↑ at @20 @25
- absent long/firstmate-11-abst-drug-quota: ↑ at @25 @30 @35 @45 @50
- facts long/firstmate-11-claude-json-backup: ↑ at @30 @35
- facts long/firstmate-11-file-prod-change-backup: ↑ at @30 @40 @45 @50
- facts long/firstmate-11-multi-accounts-sign: ↑ at @30 @35
- facts long/firstmate-11-exact-ssh-tunnel: ↑ at @30
- facts long/firstmate-11-why-pm-assigned-only: ↑ at @30 @35
- budget long/size: ↑ at @30 @45 @55; ↓ at @15 @20
- decisions long/om-v04-why:gap-left: ↑ at @35 @40 @45 @50
- identifiers long/path:hooks/stats.ts: ↑ at @40
- identifiers long/usd:$1.50: ↑ at @40
- identifiers long/version:1.1.0: ↑ at @40
- identifiers long/path:/tmp/om-v043: ↑ at @40
- identifiers long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings: ↑ at @40
- identifiers long/number:1.50: ↑ at @40
- chronology long/path:.claude/types: ↑ at @40
- facts long/firstmate-11-file-captain-md: ↑ at @40 @45 @50
- facts long/firstmate-11-multi-password-exposure: ↑ at @40
- facts long/firstmate-11-exact-db-url-var: ↑ at @40 @45 @50
- facts long/om-orchestration-hop:x-req-id: ↑ at @40
- reversals long/om-v04-sup:todo-commit: ↑ at @40 @45 @50
- commits long/commit:940b47b: ↑ at @65
- reversals long/firstmate-11-super-firstmate-pushed: ↑ at @70 @75
- decisions long/om-v04-thinking-low: ↑ at @80

Both ways (1 unique items):

- facts long/om-orchestration-neg:fallback-cause: ↑ at @65 @80; ↓ at @45 @50

Recall-aware credit (not in any total): A 43.6, B 42.1 (-1.5)

## Reflection chain (not in the total)

A: A .scratch/omv-code/base7 (dir) (reflection chain)
B: B .scratch/omv/carry3f (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 112 calls, 3 fresh

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
| commits | 4 | 97.2 | 97.9 | +0.7 | 139/143 | 140/143 | 1 |  |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.0 | 97.0 | 0 | 292/301 | 292/301 |  |  |
| chronology | 6 | 45.8 | 52.3 | +6.5 | 518/1131 | 591/1131 | 87 | 14 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 25.1 | 20.4 | -4.8 | 1/31 | 1/31 |  |  |
| budget | 3 | 96.3 | 95.6 | -0.7 | 22/31 | 17/31 | 4 | 9 |
| **total** | | **81.0** | **80.9** | **-0.1** | 77.8% | 80.0% | **103** | **27** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.0 → 80.9 (-0.1).
Flips: 103 up, 27 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 17 up, 10 down, sign test p=0.25. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +5%, reduction ratio +5%, model tokens +4%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 35k | 36k |
| context tokens per cut, max | 51k | 55k |
| reduction ratio (compacted / replaced), mean | 21.9% | 23.0% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (37k / 3.6k) | 3 (109k / 11k) |
| model tokens in + out | 1777k | 1857k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (10 unique items):

- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @13 @15 @28 @30; ↓ at @10 @11 @12 @20 @21 @22 @23 @24 @26
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory-prune: ↓ at @13 @14 @15
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043/fixture.jsonl: ↓ at @13 @14 @15
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/store/observational-memory_inline-8aabd6f3acbe.json: ↓ at @13 @14 @15
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043: ↓ at @13 @14 @15
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-flow: ↓ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-vcc: ↓ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043: ↓ at @14
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/settings.json: ↓ at @14 @15
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:ByteBotSoftware/oasis-pavers-and-pools-opie: ↓ at @28

Better in B (17 unique items):

- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.003: ↑ at @1
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @6 @7 @8 @9 @10 @11 @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @9 @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.30: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$51: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.30: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.37: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.37: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$1.50: ↑ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:1.50: ↑ at @14
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/commit:b8d5067: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.003: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp2: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/uuid:b8d50671-d9df-4001-9679-8d1ba9ec834c: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp2/run.py: ↑ at @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- approvals om-v04+om-orchestration+firstmate-11+firstmate-6/line 14898: ↑ at @22
- commits om-v04+om-orchestration+firstmate-11+firstmate-6/pr:1379: ↑ at @31

## Holdout (mechanical gates only; not in the total)

A: A .scratch/omv-code/base7 (dir) (holdout)
B: B .scratch/omv/carry3f (dir) (holdout)

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
| commits | 4 | 97.4 | 100.0 | +2.6 | 37/38 | 38/38 | 1 |  |
| failures | 6 | 100.0 | 100.0 | 0 | 16/16 | 16/16 |  |  |
| chronology | 6 | 59.7 | 59.7 | 0 | 43/72 | 43/72 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 69.5 | 68.5 | -1.0 | 1/14 | 1/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **82.9** | **83.0** | **+0.1** | 75.2% | 75.5% | **1** | **0** |

Per transcript: firstmate-6 81.9 → 81.9 (0); crew-uspa-4 71.7 → 71.7 (0); crew-opie-4 77.6 → 77.5 (-0.1).
Flips: 1 up, 0 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 1 up, 0 down, sign test p=1.0. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +1%, reduction ratio +1%, model tokens 0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector calls are the same as A's (same cache keys): the difference is deterministic, not sampling noise.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 20k | 21k |
| context tokens per cut, max | 31k | 31k |
| reduction ratio (compacted / replaced), mean | 12.9% | 13.0% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 44 (512k / 35k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 547k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (0 unique items):


Better in B (1 unique items):

- commits firstmate-6/pr:1379: ↑ at @6

## Behavior A/B (Luna reader; not blended into retention)

| gate | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|
| rule | 71/90 | 74/90 | 9 | 6 |
| permission | 29/29 | 29/29 |  |  |
| done | 25/28 | 26/28 | 1 |  |
| next | 40/69 | 40/69 | 1 | 1 |
| value | 190/286 | 199/286 | 17 | 8 |
| lessons | 41/49 | 37/49 |  | 4 |
| file-state | 37/79 | 38/79 | 6 | 5 |
| multi-hop | 27/44 | 35/44 | 10 | 2 |
| rationale | 27/55 | 39/55 | 12 |  |
| purpose | 5/24 | 4/24 |  | 1 |
| dropped | 31/39 | 31/39 | 1 | 1 |
| false | 81/102 | 80/102 | 5 | 6 |
| **all** | **67.6%** | **70.7%** | **62** | **34** |

316 of 894 probes got the same answers in A and B (identical contexts reuse the cached answers).

Worse in B (34):

- value@1 om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: A 3/3 "~/work/mods/observational-memory/.worktrees/issue-2" → B 0/3 unknown
- purpose@4 om-orchestration/purpose:agent-teams-tickets: A 2/3 "Use agent teams to implement and merge the tickets, then test whether …" → B 1/3 "Orchestrate agents to implement and merge the open tickets, then test …" (wrong)
- dropped@5 om-orchestration/deploy-id: A 3/3 unknown, recall "deployment id omitted-identifier exact deployment-id" finds it → B 1/3 unknown, recall "deployment id exact omitted-identifier run" misses
- false@3 om-v04/no-remote: A 3/3 "None; nothing was pushed." → B 1/3 "None; nothing was pushed to GitHub." (wrong)
- value@5 om-v04/log-notes: A 2/3 "The visible `+11 notes` increment." → B 1/3 "The detailed observer diagnostics, kept verbatim in debug logs." (wrong)
- multi-hop@6 om-v04/hop:151-messages: A 2/3 "A 0.4.4-to-0.4.5 switch changed parallel-call ordering, invalidating t…" → B 1/3 "The 0.4.4/0.4.5 parallel-call ordering change invalidated the saved no…", evidence not in the context: "The saved background notes no longer matched the history. OM threw tho…"
- multi-hop@6 om-v04/hop:settle-error-fix: A 2/3 "Luna sometimes left the observations block unclosed, causing the obser…" → B 1/3 "The Observer's unclosed `<observations>` reply was rejected twice, the…", evidence not in the context: "That summary was then cut off when the agent was stopped, which produc…"
- rule@6 om-v04/sup:stall-cause: A 3/3 "The version switch corrected parallel-call ordering, invalidated the o…" → B 1/3 "A 0.4.4-to-0.4.5 parallel-call ordering change invalidated the ledger,…", evidence not in the context: "The saved background notes no longer matched the history. OM threw tho…"
- false@6 om-v04/near:sha-swap: A 2/3 "No. 73ec629 is the 0.4.9 commit, not 0.4.7." → B 1/3 no answer
- file-state@7 om-v04/file:skill-rule: A 2/3 "Skills invoked during the last three main-thread turns; trimming was 1…" → B 1/3 "Skills invoked during the last three main-thread turns; shipped in 0.4…", evidence not in the context: "skills invoked in the last three turns remain full; commit `f14b857` c…"
- value@7 om-v04/order:firstmate-version-switch: A 2/3 "After its 14:31 compaction." → B 0/3 "After.", evidence not in the context: "main was fast-forwarded to `9792607`; auto-compactions at 13:31, 14:12…"
- rule@7 om-v04/sup:stall-cause: A 3/3 "The version switch changed parallel-call ordering, invalidated the led…" → B 0/3 "Background observation stopped, leaving a backlog that compaction sync…", evidence not in the context: "Firstmate background observation ran once at 14:37 for rows 1–56, then…"
- rule@7 om-v04/sup:failure-cause: A 2/3 "Luna emitted malformed unclosed observation sections, omitting `</obse…" → B 1/3 "Luna returned malformed replies that omitted `</observations>` before …" (wrong)
- value@8 om-v04/log-notes: A 3/3 "Keep the detailed lines in debug logs and retain the visible +N notes …" → B 0/3 "The detailed log lines and metrics, kept verbatim in debug logs." (wrong)
- next@8 om-v04/told-8: A 2/3 "The comparison was still running as a background shell job; 31 of 144 …" → B 0/3 "The comparison was still running as a background shell job, not a suba…" (wrong)
- lessons@8 om-v04/neg:subagent-veto: A 3/3 "No. There is no per-subagent threshold; vetoing compaction was conside…" → B 1/3 "No. There is one process-wide threshold; a 300k subagent threshold was…" (wrong)
- false@8 om-v04/no-remote: A 2/3 "None; no commit was pushed." → B 0/3 "None; no commit was pushed to GitHub." (wrong)
- false@8 om-v04/abs:subagent-300k: A 2/3 "no" → B 1/3 "No. A separate 300k subagent threshold was not implemented." (wrong)
- value@9 om-v04/main-0.4.13: A 2/3 "Version 0.4.13; main tip 2991463 (release commit 958b3b1)." → B 0/3 "0.4.13 at commit 2991463", evidence not in the context: "2991463 TODO: leave the small-window on-the-spot observation as is; no…"
- lessons@9 om-v04/neg:sched-reset: A 3/3 "675d1e3 was not merged because its live smoke hit the rapid-refill bre…" → B 1/3 "It was not merged: it removed the pauses in the test but caused the li…", evidence not in the context: "675d1e3 (start a half chunk before an oversized raw tail) removed the …"
- lessons@9 om-v04/neg:subagent-veto: A 3/3 "No. There is one process-wide threshold; vetoing subagent compaction w…" → B 0/3 "No. Claude Code has one process-wide threshold; raising it toward 300k…", evidence not in the context: "one process-wide autoCompactWindow (currently 190000 in ~/.claude/sett…"
- file-state@9 om-v04/file:skill-rule: A 3/3 "Skills invoked during the last three main-thread turns keep full text;…" → B 1/3 "Skills invoked during the last three main-thread turns keep full text;…", evidence not in the context: "Skill trimming committed as `1078259` on `skill-trim`; ... skills invo…"
- value@9 om-v04/order:firstmate-version-switch: A 2/3 "After the 14:31 compaction." → B 1/3 "After", evidence not in the context: "auto-compactions at 13:31, 14:12, 14:22, 14:31, and 15:12 / committed …"
- rule@9 om-v04/sup:todo-commit: A 3/3 "2991463; it records the small-window on-the-spot gap as intentionally …" → B 1/3 "2991463; it records the small-window on-the-spot gap as intentionally …", evidence not in the context: "2991463 TODO: leave the small-window on-the-spot observation as is; no…"
- rule@9 om-v04/sup:failure-cause: A 2/3 "The Observer produced replies without the closing `</observations>` ta…" → B 1/3 "The Observer replies were malformed: they omitted `</observations>` be…" (wrong)
- false@9 om-v04/abs:subagent-300k: A 2/3 "no" → B 1/3 "no", evidence not in the context: "Claude Code exposes one process-wide `autoCompactWindow` (currently 19…"
- value@9 om-v04/path:~/.claude/projects: A 3/3 "~/.claude/projects" → B 1/3 unknown
- file-state@4 firstmate-11/file-learnings-16gb: A 3/3 "Never run or brief a whole test suite at once; run touched test files …" → B 1/3 "Never run or brief a whole test suite at once; run touched files one a…", evidence not in the context: "## Never run or brief a whole test suite at once, in any repo <!--a:20…"
- lessons@5 firstmate-11/neg-tailnet-signin: A 3/3 "Google redirects the tailnet sign-in back to localhost, so use the SSH…" → B 1/3 "Google redirects the tailnet URL back to localhost, so the captain mus…" (wrong)
- file-state@6 firstmate-11/file-prod-change-backup: A 2/3 "It is backed up in `data/opie-line-items-disappeared/prod-line-items-c…" → B 1/3 "The backup is `data/opie-line-items-disappeared/prod-line-items-change…", evidence not in the context: ""data/opie-line-items-disappeared/prod-line-items-change.md"; "product…"
- value@6 firstmate-11/scope-prod-write: A 2/3 "Retitle 001.41 and replace its description, create 001.42 and 001.43, …" → B 1/3 "Only retitle/update 001.41 and create 001.42/001.43 from the client te…", evidence not in the context: "retitle 001.41 to “001.41 - Pre-Screen Application & Submittal Package…"
- file-state@7 firstmate-11/file-sbom-acceptances: A 3/3 "`.github/sbom-license-acceptances.json`; `libheif-js` with LGPL-3.0-on…" → B 1/3 "`.github/sbom-license-acceptances.json`; `libheif-js` was added.", evidence not in the context: "The accepted list is .github/sbom-license-acceptances.json.; libheif-j…"
- rule@7 firstmate-11/super-herdr-updated: A 2/3 "no" → B 1/3 "yes" (wrong)
- false@7 firstmate-11/upstream-push: A 2/3 "None; the recorded push was to the firstmate fork, ending at 74153fae." → B 1/3 "None was pushed to upstream; the fork’s `origin` was pushed to 74153fa…" (wrong)

Better in B (62):

- rationale@2 om-orchestration/why:lanes: A 0/3 "They form a sequential dependency chain within the compaction lane; th…" (wrong) → B 3/3 "They all change register.ts, so those tickets are sequenced to avoid o…"
- rationale@3 om-orchestration/why:pin-new: A 0/3 "To ensure each setup loaded the intended plugin/version rather than ma…" (wrong) → B 3/3 "To isolate the benchmark from main changing and reloading a different …"
- rationale@3 om-orchestration/why:opus-round: A 1/3 unknown → B 2/3 "It found several robustness issues: subagent window limits, runtime-us…"
- rationale@4 om-orchestration/why:pin-new: A 0/3 "To isolate and pin the exact plugin version under test instead of foll…" (wrong) → B 3/3 "To pin a stable plugin version and prevent a merge from reloading the …"
- rule@4 om-orchestration/rule:paid-runs: A 1/3 "yes", evidence not in the context: ""Go for it"; "User selected a `$50 cap` for the proposed benchmark mat…" → B 3/3 "yes"
- value@4 om-orchestration/ord:5-after-7: A 0/3 "#5", evidence not in the context: "Assistant merged issue #5 into main as `674b1ae`." → B 2/3 "Ticket #5"
- rationale@5 om-orchestration/why:pin-new: A 0/3 "To pin the benchmark to a reproducible plugin checkout instead of a mo…" (wrong) → B 3/3 "To keep the benchmark pinned and reproducible, avoiding a main-branch …"
- false@5 om-orchestration/abst:rr2-fallback: A 1/3 "It still remained just below the Observer-compaction trigger, so no Ob…" (wrong) → B 2/3 unknown
- value@4 om-v04/main-0.4.5: A 0/3 "v0.4.5 at commit 9792607" (wrong) → B 2/3 "0.4.5 at commit 9792607"
- file-state@4 om-v04/file:prune-guards: A 0/3 unknown → B 3/3 "It re-checks each session immediately before deletion; smoke tests use…"
- multi-hop@4 om-v04/hop:brief-pinned: A 0/3 "730 characters; the `pin-brief` branch pinned it." (wrong) → B 2/3 "About 14.6k characters, roughly 3.7k tokens; branch pin-brief pinned i…"
- file-state@5 om-v04/file:prune-guards: A 0/3 no answer → B 3/3 "It re-checks whether a session is live immediately before deletion; sm…"
- multi-hop@5 om-v04/hop:brief-pinned: A 0/3 no answer → B 3/3 "About 14.6k characters, or 3.7k tokens; branch pin-brief"
- value@5 om-v04/str:retrying-rows: A 0/3 no answer → B 3/3 "retrying rows X-Y at compaction once (reason)"
- dropped@5 om-v04/tmp-deleted: A 1/3 no answer → B 3/3 "/tmp/pcres, /tmp/om-live, /tmp/skillprobe, /tmp/probeplugin, /tmp/obs-…"
- value@6 om-v04/str:retrying-rows: A 0/3 "It records the rejected reply's length and the first 500 characters in…" (wrong) → B 2/3 "`retrying rows X-Y at compaction once (reason)`"
- value@6 om-v04/order:firstmate-version-switch: A 1/3 "After it: firstmate loaded 0.4.5 at about 15:08, after the 14:31 compa…", evidence not in the context: "At about 15:08, the session loaded 0.4.5" → B 2/3 "After its 14:31 compaction"
- rule@6 om-v04/sup:skill-stub-wording: A 0/3 unknown → B 2/3 "Invoke the skill again to reread it."
- false@6 om-v04/no-remote: A 0/3 "None recorded; no commit was pushed to GitHub." (wrong) → B 2/3 "none"
- multi-hop@7 om-v04/hop:brief-pinned: A 0/3 "The recorded brief was 730 characters; the pin-brief branch made the f…" (wrong) → B 3/3 "About 14.6k characters, or 3.7k tokens; the pin-brief branch made it p…"
- value@7 om-v04/str:retrying-rows: A 0/3 "It records a fast Observer failure and one retry; timeouts are not ret…" (wrong) → B 3/3 "`retrying rows X-Y at compaction once (reason)`"
- rule@7 om-v04/sup:skill-stub-wording: A 0/3 unknown → B 3/3 "Invoke the skill again to reread it."
- value@7 om-v04/path:/tmp/om-stall/firstmate.jsonl: A 1/3 "/tmp/om-stall/firstmate.jsonl", evidence not in the context: "copied the Firstmate transcript to `/tmp/om-stall/firstmate.jsonl`" → B 2/3 "/tmp/om-stall/firstmate.jsonl"
- file-state@8 om-v04/file:prune-guards: A 1/3 unknown → B 3/3 "It re-checks each candidate immediately before deletion; `OM_NO_PRUNE=…"
- multi-hop@8 om-v04/hop:brief-pinned: A 0/3 "The brief was 730 characters; the pin-brief branch made it remain in `…" (wrong) → B 3/3 "The brief is about 14.6k characters, or 3.7k tokens; pin-brief made th…"
- value@8 om-v04/str:retrying-rows: A 0/3 unknown → B 3/3 "`retrying rows X-Y at compaction once (reason)`"
- rule@8 om-v04/sup:recall-cap: A 1/3 "16k per reply.", evidence not in the context: "recall-v2 ... 16k response caps" → B 3/3 "16,000 characters, about 4,000 tokens."
- rule@8 om-v04/sup:failure-cause: A 1/3 "The Observer replies omitted `</observations>` before `<current-task>`…" (wrong) → B 2/3 "The replies were malformed: they omitted the closing `</observations>`…"
- rule@8 om-v04/sup:skill-stub-wording: A 1/3 unknown → B 3/3 "Invoke the skill again to reread it."
- file-state@9 om-v04/file:prune-guards: A 1/3 "It uses live-session/process protection; `OM_NO_PRUNE=1` disables prun…", evidence not in the context: "live-session-safe pruning; OM_NO_PRUNE=1" → B 3/3 "It protects live sessions and rechecks each session immediately before…"
- multi-hop@9 om-v04/hop:brief-pinned: A 0/3 "The recorded smoke brief was 730 characters (`BRIEF-7Q`); `pin-brief` …" (wrong) → B 2/3 "The brief was about 14.6k characters, roughly 3.7k tokens; the pin-bri…"
- value@9 om-v04/str:retrying-rows: A 0/3 unknown → B 3/3 "`retrying rows X-Y at compaction once (reason)`"
- rationale@9 om-v04/why:gap-left: A 1/3 "It was left unfixed because the attempted fix stopped the live smoke w…", evidence not in the context: "the engine's rapid-refill breaker stopped the live smoke" → B 2/3 "It was left unfixed because the proposed fix broke the small-window li…"
- rule@9 om-v04/sup:stall-cause: A 1/3 "Background observation had stalled, so the 15:12 compaction had to syn…" (wrong) → B 3/3 "A parallel-call ordering change invalidated the ledger, forcing a one-…"
- false@9 om-v04/near:store-vs-runner-cap: A 1/3 "no — the shared store is capped at 4 MiB, not 1 MiB" (wrong) → B 3/3 "no; it is capped at 4 MiB"
- next@4 firstmate-11/next-4: A 1/3 "Test Google sign-in, then the Mark signed → filled-PDF flow using the …" (wrong) → B 3/3 "Reattach or relaunch the Gorman crewmate after the Herdr update crash."
- value@4 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "ssh -L 5173:127.0.0.1:5173 cameron-server"
- file-state@6 firstmate-11/file-captain-md: A 1/3 unknown → B 3/3 "Use `apps/web/.env.local` for real Google sign-in, never stub login, a…"
- value@6 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "`ssh -L 5173:127.0.0.1:5173 cameron-server`"
- rationale@6 firstmate-11/why-pm-assigned-only: A 1/3 "Only when they are the primary or secondary PM; an unassigned PM does …" (wrong) → B 3/3 "A PM sees it only on contracts where they are the primary or secondary…"
- rationale@6 firstmate-11/why-sign-permission: A 1/3 "The button incorrectly checked the mark-signed permission; it now chec…" (wrong) → B 2/3 "They were checking the “mark signed” permission; now the button checks…"
- rule@6 firstmate-11/super-test-db: A 1/3 "`oasis_gorman_prodclone`", evidence not in the context: "local Gorman app running against the migrated `oasis_gorman_prodclone`…" → B 3/3 "`oasis_gorman_prodclone`"
- multi-hop@7 firstmate-11/multi-accounts-sign: A 0/3 unknown → B 3/3 "Whether Accounts should also have in-person Sign on change orders; it …"
- value@7 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "ssh -L 5173:127.0.0.1:5173 cameron-server"
- rationale@7 firstmate-11/why-pm-assigned-only: A 0/3 "A PM sees it only on contracts assigned to that PM; PM Lead is the una…" (wrong) → B 2/3 "An assigned PM sees it; an unassigned ordinary PM does not. Allowing a…"
- file-state@8 firstmate-11/file-captain-md: A 0/3 "Do not merge while the captain is testing; leave it paused for the cap…" (wrong) → B 3/3 "Run captain testing with the project's existing `apps/web/.env.local`,…"
- multi-hop@8 firstmate-11/multi-accounts-sign: A 0/3 unknown → B 3/3 "Whether Accounts should retain in-person Sign on for change orders; it…"
- value@8 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "`ssh -L 5173:127.0.0.1:5173 cameron-server`"
- rationale@8 firstmate-11/why-pm-assigned-only: A 0/3 "A PM sees it only on contracts assigned to that PM; PM Lead visibility…" (wrong) → B 2/3 "An ordinary PM sees it only on contracts assigned to that PM; allowing…"
- rule@8 firstmate-11/super-herdr-updated: A 1/3 "yes" (wrong) → B 2/3 "no"
- false@8 firstmate-11/upstream-push: A 0/3 "74153fae" (wrong) → B 3/3 "No official-upstream push is recorded; `74153fae` was pushed to the fi…"
- value@9 firstmate-11/port: A 1/3 "5173", evidence not in the context: "local server was available at `http://localhost:5173` and returned HTT…" → B 2/3 "5173"
- multi-hop@9 firstmate-11/multi-accounts-sign: A 0/3 unknown → B 3/3 "Whether the Accounts role should retain in-person Sign on for contract…"
- value@9 firstmate-11/exact-ssh-tunnel: A 0/3 unknown → B 3/3 "ssh -L 5173:127.0.0.1:5173 cameron-server"
- rationale@9 firstmate-11/why-pm-assigned-only: A 0/3 "An ordinary PM sees it only on contracts assigned to that PM; PM Lead …" (wrong) → B 2/3 "An ordinary PM sees it only on contracts assigned to that PM; PM Lead …"
- multi-hop@10 firstmate-11/multi-gorman-prod-setup: A 1/3 "Upload the PDF in Reference Data, place the five fields, re-pick the j…", evidence not in the context: "Then, on the Contract Signed card, choose that document and enter Gorm…" → B 2/3 "Upload the Job Information Report, place the five fields, configure th…"
- value@10 firstmate-11/exact-db-url-var: A 1/3 unknown → B 3/3 "Reset the `read_only` role in Neon and update `PRODUCTION_READ_ONLY_DA…"
- rationale@10 firstmate-11/why-pm-assigned-only: A 0/3 "A PM sees it on contracts assigned to that PM; not every contract beca…" (wrong) → B 2/3 "A regular PM sees it only on contracts where they are the assigned PM;…"
- done@10 firstmate-11/pr:1423: A 1/3 "done", evidence not in the context: "PR #1423 was merged by `camerontredoux` at `2026-09-23T16:41:15Z`" → B 2/3 "done"
- multi-hop@11 firstmate-11/multi-accounts-sign: A 0/3 unknown → B 3/3 "Whether the Accounts role should retain in-person Sign on contracts."
- value@11 firstmate-11/exact-db-url-var: A 0/3 unknown → B 3/3 "Reset Neon’s `read_only` role and update `PRODUCTION_READ_ONLY_DATABAS…"
- false@11 firstmate-11/near-pm-every-contract: A 1/3 "No, not an ordinary PM; only the assigned PM qualifies. An unassigned …", evidence not in the context: "Even if PM Lead isnt the pm on that it should see the Sign in person b…" → B 3/3 "no"

Samples disagreed: A 181, B 185:

- A purpose@1 om-orchestration/purpose:agent-teams-tickets: 1/3
- A file-state@1 om-orchestration/file:testing-guide: 2/3
- A next@2 om-orchestration/told-2: 2/3
- A file-state@2 om-orchestration/file:testing-guide: 1/3
- A rationale@2 om-orchestration/why:opus-round: 2/3
- A value@3 om-orchestration/hard-cap: 2/3
- A multi-hop@3 om-orchestration/hop:usage: 2/3
- A rationale@3 om-orchestration/why:cut-builtin-recall-new: 1/3
- A rationale@3 om-orchestration/why:opus-round: 1/3
- A dropped@3 om-orchestration/deploy-id: 2/3
- A value@3 om-orchestration/path:tests/eval/live.ts: 1/3
- A purpose@4 om-orchestration/purpose:agent-teams-tickets: 2/3
- A multi-hop@4 om-orchestration/hop:bench-worktrees: 2/3
- A value@4 om-orchestration/exact:not-persistent: 2/3
- A value@4 om-orchestration/exact:rescored-results: 2/3
- A value@4 om-orchestration/exact:todo-fallback: 1/3
- A rationale@4 om-orchestration/why:cut-builtin-recall-new: 1/3
- A rationale@4 om-orchestration/why:opus-round: 2/3
- A rule@4 om-orchestration/sup:test-count-3: 2/3
- A value@4 om-orchestration/sup:om-invalid: 1/3
- A value@4 om-orchestration/sup:main-head-4: 2/3
- A rule@4 om-orchestration/rule:paid-runs: 1/3
- A value@4 om-orchestration/ord:6-after-5: 2/3
- A dropped@4 om-orchestration/deploy-id: 2/3
- A next@5 om-orchestration/told-5: 2/3
- A lessons@5 om-orchestration/neg:tool-search: 1/3
- A lessons@5 om-orchestration/neg:vcc-brief-test: 2/3
- A value@5 om-orchestration/exact:todo-fallback: 2/3
- A rationale@5 om-orchestration/why:opus-round: 2/3
- A rule@5 om-orchestration/sup:live-harness: 2/3
- A rule@5 om-orchestration/rule:paid-runs: 1/3
- A value@5 om-orchestration/ord:5-after-7: 2/3
- A value@5 om-orchestration/ord:6-after-5: 2/3
- A false@5 om-orchestration/dist:old-omrecall-94: 1/3
- A false@5 om-orchestration/abst:rr2-fallback: 1/3
- A next@1 om-v04/next-1: 2/3
- A next@1 om-v04/told-1: 2/3
- A false@2 om-v04/no-remote: 2/3
- A done@3 om-v04/done:worktrees-removed: 2/3
- A value@3 om-v04/haiku-not-faster: 1/3
- A value@3 om-v04/str:debug-only: 1/3
- A value@4 om-v04/log-notes: 1/3
- A next@4 om-v04/next-4: 1/3
- A value@4 om-v04/scope:ctx-worktree: 2/3
- A permission@5 om-v04/permission:delete-tmp: 2/3
- A done@5 om-v04/done:tmp-sessions-deleted: 2/3
- A done@5 om-v04/done:worktrees-removed: 2/3
- A value@5 om-v04/subagent-model: 2/3
- A value@5 om-v04/standing-brief: 2/3
- A value@5 om-v04/log-notes: 2/3
- A value@5 om-v04/main-0.4.6: 2/3
- A value@5 om-v04/kept-v042: 2/3
- A value@5 om-v04/thinking-low: 2/3
- A lessons@5 om-v04/neg:c029150-dropped: 2/3
- A file-state@5 om-v04/file:pi-isolation: 2/3
- A value@5 om-v04/str:not-persistent: 2/3
- A rationale@5 om-v04/why:timeout-not-retried: 2/3
- A rationale@5 om-v04/why:parallel-order: 2/3
- A false@5 om-v04/no-remote: 1/3
- A false@5 om-v04/abs:narration: 2/3
- A false@5 om-v04/scope:cmp-kept: 2/3
- A dropped@5 om-v04/tmp-deleted: 1/3
- A value@5 om-v04/path:.claude-plugin/plugin.json: 1/3
- A value@6 om-v04/log-notes: 1/3
- A lessons@6 om-v04/neg:hook-output-refuted: 1/3
- A multi-hop@6 om-v04/hop:151-messages: 2/3
- A multi-hop@6 om-v04/hop:settle-error-fix: 2/3
- A rationale@6 om-v04/why:parallel-order: 2/3
- A value@6 om-v04/order:firstmate-version-switch: 1/3
- A false@6 om-v04/near:sha-swap: 2/3
- A value@7 om-v04/log-notes: 1/3
- A next@7 om-v04/told-7: 2/3
- A file-state@7 om-v04/file:skill-rule: 2/3
- A file-state@7 om-v04/file:parser-debug: 2/3
- A multi-hop@7 om-v04/hop:moved-transcript: 2/3
- A value@7 om-v04/order:firstmate-version-switch: 2/3
- A rule@7 om-v04/sup:failure-cause: 2/3
- A false@7 om-v04/no-remote: 1/3
- A false@7 om-v04/near:build-labels: 1/3
- A false@7 om-v04/near:sha-swap: 1/3
- A next@7 om-v04/last-ask:4179: 2/3
- A value@7 om-v04/path:/tmp/om-stall/firstmate.jsonl: 1/3
- A next@8 om-v04/told-8: 2/3
- A value@8 om-v04/main-0.4.12: 1/3
- A file-state@8 om-v04/file:skill-rule: 2/3
- A file-state@8 om-v04/file:parser-debug: 2/3
- A file-state@8 om-v04/file:prune-guards: 1/3
- A value@8 om-v04/order:firstmate-version-switch: 1/3
- A rule@8 om-v04/sup:recall-cap: 1/3
- A rule@8 om-v04/sup:stall-cause: 2/3
- A rule@8 om-v04/sup:failure-cause: 1/3
- A rule@8 om-v04/sup:skill-stub-wording: 1/3
- A false@8 om-v04/no-remote: 2/3
- A false@8 om-v04/near:store-vs-runner-cap: 2/3
- A false@8 om-v04/near:build-labels: 1/3
- A false@8 om-v04/abs:hook-trim: 2/3
- A false@8 om-v04/abs:subagent-300k: 2/3
- A value@8 om-v04/path:tests/register.test.ts: 1/3
- A value@9 om-v04/log-notes: 1/3
- A value@9 om-v04/main-0.4.13: 2/3
- A purpose@9 om-v04/purpose:om-plugin-orchestrator: 1/3
- A lessons@9 om-v04/neg:vcc-install: 2/3
- A file-state@9 om-v04/file:prune-guards: 1/3
- A multi-hop@9 om-v04/hop:151-messages: 2/3
- A rationale@9 om-v04/why:gap-left: 1/3
- A value@9 om-v04/order:firstmate-version-switch: 2/3
- A rule@9 om-v04/sup:main-tests: 2/3
- A rule@9 om-v04/sup:stall-cause: 1/3
- A rule@9 om-v04/sup:failure-cause: 2/3
- A false@9 om-v04/near:store-vs-runner-cap: 1/3
- A false@9 om-v04/near:build-labels: 2/3
- A false@9 om-v04/near:sha-swap: 1/3
- A false@9 om-v04/abs:hook-trim: 2/3
- A false@9 om-v04/abs:subagent-300k: 2/3
- A dropped@9 om-v04/tmp-deleted: 2/3
- A next@4 firstmate-11/next-4: 1/3
- A rule@5 firstmate-11/super-herdr-updated: 2/3
- A false@5 firstmate-11/upstream-push: 1/3
- A permission@6 firstmate-11/permission:prod-read-only: 2/3
- A value@6 firstmate-11/saved-item: 2/3
- A next@6 firstmate-11/told-6: 1/3
- A value@6 firstmate-11/gorman-pr: 2/3
- A value@6 firstmate-11/sign-pr: 2/3
- A value@6 firstmate-11/save-fix-pr: 2/3
- A value@6 firstmate-11/port: 2/3
- A value@6 firstmate-11/tools: 2/3
- A lessons@6 firstmate-11/neg-tailnet-signin: 2/3
- A lessons@6 firstmate-11/neg-documenso-local: 2/3
- A lessons@6 firstmate-11/neg-tab-price: 2/3
- A file-state@6 firstmate-11/file-captain-md: 1/3
- A file-state@6 firstmate-11/file-gorman-pdf-script: 2/3
- A file-state@6 firstmate-11/file-prod-change-backup: 2/3
- A multi-hop@6 firstmate-11/multi-watcher-5415: 2/3
- A value@6 firstmate-11/scope-prod-write: 2/3
- A value@6 firstmate-11/scope-mark-signed: 2/3
- A rationale@6 firstmate-11/why-pm-assigned-only: 1/3
- A rationale@6 firstmate-11/why-sign-permission: 1/3
- A rule@6 firstmate-11/super-saved-item: 2/3
- A rule@6 firstmate-11/super-test-db: 1/3
- A rule@6 firstmate-11/super-firstmate-pushed: 2/3
- A false@6 firstmate-11/upstream-push: 2/3
- A false@6 firstmate-11/near-pm-every-contract: 2/3
- A false@6 firstmate-11/near-dump-deleted: 2/3
- A false@6 firstmate-11/abst-drug-quota: 2/3
- A false@6 firstmate-11/abst-password-rotated: 2/3
- A dropped@6 firstmate-11/hook-backup: 2/3
- A dropped@6 firstmate-11/fork-sha: 2/3
- A done@6 firstmate-11/pr:1418: 2/3
- A next@6 firstmate-11/last-ask:2679: 2/3
- A value@6 firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: 1/3
- A purpose@7 firstmate-11/purpose:firstmate-crew: 1/3
- A file-state@7 firstmate-11/file-captain-md: 2/3
- A rule@7 firstmate-11/super-test-db: 2/3
- A rule@7 firstmate-11/super-herdr-updated: 2/3
- A false@7 firstmate-11/upstream-push: 2/3
- A purpose@8 firstmate-11/purpose:firstmate-crew: 2/3
- A rule@8 firstmate-11/super-test-db: 2/3
- A rule@8 firstmate-11/super-herdr-updated: 1/3
- A done@8 firstmate-11/pr:1421: 2/3
- A value@9 firstmate-11/port: 1/3
- A file-state@9 firstmate-11/file-sbom-acceptances: 1/3
- A rule@9 firstmate-11/super-test-db: 2/3
- A rule@9 firstmate-11/super-herdr-updated: 2/3
- A rule@9 firstmate-11/order-sbom-prs: 1/3
- A false@9 firstmate-11/near-pm-every-contract: 2/3
- A value@9 firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: 1/3
- A purpose@10 firstmate-11/purpose:firstmate-crew: 2/3
- A lessons@10 firstmate-11/neg-address-split: 2/3
- A file-state@10 firstmate-11/file-captain-md: 2/3
- A multi-hop@10 firstmate-11/multi-accounts-sign: 2/3
- A multi-hop@10 firstmate-11/multi-gorman-prod-setup: 1/3
- A value@10 firstmate-11/exact-db-url-var: 1/3
- A false@10 firstmate-11/upstream-push: 1/3
- A done@10 firstmate-11/pr:1423: 1/3
- A value@11 firstmate-11/port: 2/3
- A purpose@11 firstmate-11/purpose:firstmate-crew: 1/3
- A file-state@11 firstmate-11/file-learnings-16gb: 2/3
- A rule@11 firstmate-11/super-gorman-document: 2/3
- A false@11 firstmate-11/near-pm-every-contract: 1/3
- A done@11 firstmate-11/pr:1425: 2/3
- A value@11 firstmate-11/path:config/stow-pass-horizon: 2/3
- B file-state@1 om-orchestration/file:testing-guide: 2/3
- B rule@1 om-orchestration/rule:paid-runs: 2/3
- B purpose@2 om-orchestration/purpose:agent-teams-tickets: 1/3
- B rationale@2 om-orchestration/why:opus-round: 2/3
- B rule@2 om-orchestration/rule:paid-runs: 2/3
- B file-state@3 om-orchestration/file:testing-guide: 1/3
- B rationale@3 om-orchestration/why:opus-round: 2/3
- B value@3 om-orchestration/ord:5-after-7: 1/3
- B value@3 om-orchestration/ord:6-after-5: 1/3
- B dropped@3 om-orchestration/deploy-id: 2/3
- B value@3 om-orchestration/path:tests/eval/live.ts: 1/3
- B next@4 om-orchestration/told-4: 1/3
- B purpose@4 om-orchestration/purpose:agent-teams-tickets: 1/3
- B rule@4 om-orchestration/rule:worktree-only: 2/3
- B value@4 om-orchestration/exact:todo-fallback: 1/3
- B rationale@4 om-orchestration/why:cut-builtin-recall-new: 1/3
- B rule@4 om-orchestration/sup:test-count-3: 2/3
- B value@4 om-orchestration/ord:5-after-7: 2/3
- B value@4 om-orchestration/ord:6-after-5: 2/3
- B false@4 om-orchestration/dist:old-omrecall-94: 1/3
- B false@4 om-orchestration/abst:mismatch-cause: 1/3
- B purpose@5 om-orchestration/purpose:agent-teams-tickets: 1/3
- B lessons@5 om-orchestration/neg:tool-search: 1/3
- B lessons@5 om-orchestration/neg:vcc-brief-test: 2/3
- B file-state@5 om-orchestration/file:testing-guide: 1/3
- B file-state@5 om-orchestration/file:live-agent-name: 1/3
- B file-state@5 om-orchestration/file:scenarios-fix: 1/3
- B multi-hop@5 om-orchestration/hop:bench-worktrees: 2/3
- B rule@5 om-orchestration/rule:worktree-only: 2/3
- B value@5 om-orchestration/sup:rr-spend: 1/3
- B rule@5 om-orchestration/sup:live-harness: 2/3
- B rule@5 om-orchestration/rule:paid-runs: 1/3
- B value@5 om-orchestration/ord:5-after-7: 2/3
- B value@5 om-orchestration/ord:6-after-5: 2/3
- B false@5 om-orchestration/abst:mismatch-cause: 2/3
- B false@5 om-orchestration/abst:rr2-fallback: 2/3
- B dropped@5 om-orchestration/deploy-id: 1/3
- B permission@3 om-v04/permission:delete-tmp: 2/3
- B done@3 om-v04/done:tmp-sessions-deleted: 2/3
- B done@3 om-v04/done:worktrees-removed: 2/3
- B value@3 om-v04/subagent-model: 2/3
- B value@3 om-v04/standing-brief: 2/3
- B value@3 om-v04/main-0.4.4: 2/3
- B value@3 om-v04/kept-v042: 2/3
- B value@3 om-v04/thinking-low: 2/3
- B lessons@3 om-v04/neg:c029150-dropped: 2/3
- B file-state@3 om-v04/file:pi-isolation: 2/3
- B file-state@3 om-v04/file:prune-guards: 1/3
- B multi-hop@3 om-v04/hop:brief-pinned: 1/3
- B value@3 om-v04/str:debug-only: 1/3
- B false@3 om-v04/no-remote: 1/3
- B false@3 om-v04/abs:narration: 2/3
- B false@3 om-v04/scope:cmp-kept: 2/3
- B dropped@3 om-v04/tmp-deleted: 2/3
- B value@3 om-v04/path:.claude-plugin/plugin.json: 1/3
- B next@4 om-v04/next-4: 1/3
- B value@4 om-v04/main-0.4.5: 2/3
- B multi-hop@4 om-v04/hop:brief-pinned: 2/3
- B value@4 om-v04/scope:ctx-worktree: 2/3
- B rationale@4 om-v04/why:parallel-order: 2/3
- B value@5 om-v04/log-notes: 1/3
- B rationale@5 om-v04/why:parallel-order: 2/3
- B false@5 om-v04/no-remote: 1/3
- B next@5 om-v04/last-ask:3108: 1/3
- B permission@6 om-v04/permission:delete-tmp: 2/3
- B done@6 om-v04/done:tmp-sessions-deleted: 2/3
- B done@6 om-v04/done:worktrees-removed: 2/3
- B value@6 om-v04/subagent-model: 2/3
- B value@6 om-v04/standing-brief: 2/3
- B value@6 om-v04/log-notes: 1/3
- B value@6 om-v04/kept-v042: 2/3
- B value@6 om-v04/thinking-low: 2/3
- B lessons@6 om-v04/neg:c029150-dropped: 2/3
- B lessons@6 om-v04/neg:close-tag-prompt: 2/3
- B lessons@6 om-v04/neg:hook-output-refuted: 1/3
- B file-state@6 om-v04/file:pi-isolation: 2/3
- B file-state@6 om-v04/file:prune-guards: 1/3
- B multi-hop@6 om-v04/hop:151-messages: 1/3
- B multi-hop@6 om-v04/hop:settle-error-fix: 1/3
- B multi-hop@6 om-v04/hop:brief-pinned: 1/3
- B value@6 om-v04/str:not-persistent: 2/3
- B value@6 om-v04/str:retrying-rows: 2/3
- B rationale@6 om-v04/why:timeout-not-retried: 2/3
- B rationale@6 om-v04/why:parallel-order: 2/3
- B value@6 om-v04/order:firstmate-version-switch: 2/3
- B rule@6 om-v04/sup:stall-cause: 1/3
- B rule@6 om-v04/sup:skill-stub-wording: 2/3
- B false@6 om-v04/no-remote: 2/3
- B false@6 om-v04/near:sha-swap: 1/3
- B false@6 om-v04/abs:narration: 2/3
- B false@6 om-v04/abs:hook-trim: 2/3
- B false@6 om-v04/scope:cmp-kept: 2/3
- B dropped@6 om-v04/tmp-deleted: 2/3
- B next@6 om-v04/last-ask:3525: 2/3
- B value@6 om-v04/path:/tmp/om-stall/firstmate.jsonl: 1/3
- B value@7 om-v04/log-notes: 1/3
- B next@7 om-v04/told-7: 2/3
- B lessons@7 om-v04/neg:hook-output-refuted: 2/3
- B file-state@7 om-v04/file:skill-rule: 1/3
- B file-state@7 om-v04/file:prune-guards: 1/3
- B rule@7 om-v04/sup:failure-cause: 1/3
- B false@7 om-v04/no-remote: 1/3
- B false@7 om-v04/near:sha-swap: 1/3
- B next@7 om-v04/last-ask:4179: 2/3
- B value@7 om-v04/path:/tmp/cmp2/run.py: 2/3
- B value@7 om-v04/path:/tmp/om-stall/firstmate.jsonl: 2/3
- B rule@8 om-v04/rule:leave-rare-fallbacks: 2/3
- B value@8 om-v04/haiku-not-faster: 1/3
- B lessons@8 om-v04/neg:c029150-dropped: 2/3
- B lessons@8 om-v04/neg:subagent-veto: 1/3
- B lessons@8 om-v04/neg:vcc-install: 2/3
- B file-state@8 om-v04/file:skill-rule: 2/3
- B file-state@8 om-v04/file:parser-debug: 2/3
- B multi-hop@8 om-v04/hop:151-messages: 2/3
- B value@8 om-v04/order:firstmate-version-switch: 1/3
- B rule@8 om-v04/sup:stall-cause: 2/3
- B rule@8 om-v04/sup:failure-cause: 2/3
- B value@8 om-v04/order:parser-line-by-line: 2/3
- B false@8 om-v04/abs:subagent-300k: 1/3
- B value@8 om-v04/path:tests/register.test.ts: 1/3
- B done@9 om-v04/done:recall-merged: 2/3
- B lessons@9 om-v04/neg:sched-reset: 1/3
- B file-state@9 om-v04/file:skill-rule: 1/3
- B file-state@9 om-v04/file:parser-debug: 2/3
- B multi-hop@9 om-v04/hop:settle-error-fix: 2/3
- B multi-hop@9 om-v04/hop:brief-pinned: 2/3
- B value@9 om-v04/scope:no-lavish: 1/3
- B rationale@9 om-v04/why:timeout-not-retried: 2/3
- B rationale@9 om-v04/why:gap-left: 2/3
- B value@9 om-v04/order:firstmate-version-switch: 1/3
- B value@9 om-v04/order:tailstart-report-stale: 2/3
- B rule@9 om-v04/sup:todo-commit: 1/3
- B rule@9 om-v04/sup:failure-cause: 1/3
- B false@9 om-v04/no-remote: 2/3
- B false@9 om-v04/near:build-labels: 2/3
- B false@9 om-v04/abs:hook-trim: 2/3
- B false@9 om-v04/abs:subagent-300k: 1/3
- B value@9 om-v04/path:~/.claude/projects: 1/3
- B lessons@4 firstmate-11/neg-session-cookie: 2/3
- B lessons@4 firstmate-11/neg-tailnet-signin: 2/3
- B file-state@4 firstmate-11/file-learnings-16gb: 1/3
- B false@4 firstmate-11/upstream-push: 1/3
- B lessons@5 firstmate-11/neg-tailnet-signin: 1/3
- B rationale@5 firstmate-11/why-imports-not-codex: 1/3
- B rule@5 firstmate-11/super-herdr-updated: 2/3
- B false@5 firstmate-11/upstream-push: 1/3
- B next@6 firstmate-11/told-6: 1/3
- B file-state@6 firstmate-11/file-prod-change-backup: 1/3
- B value@6 firstmate-11/scope-prod-write: 1/3
- B rationale@6 firstmate-11/why-sign-permission: 2/3
- B rationale@6 firstmate-11/why-imports-not-codex: 1/3
- B false@6 firstmate-11/upstream-push: 2/3
- B next@6 firstmate-11/last-ask:2679: 2/3
- B file-state@7 firstmate-11/file-prod-change-backup: 1/3
- B file-state@7 firstmate-11/file-sbom-acceptances: 1/3
- B value@7 firstmate-11/scope-prod-write: 2/3
- B rationale@7 firstmate-11/why-pm-assigned-only: 2/3
- B rule@7 firstmate-11/super-herdr-updated: 1/3
- B false@7 firstmate-11/upstream-push: 1/3
- B done@7 firstmate-11/pr:1420: 2/3
- B purpose@8 firstmate-11/purpose:firstmate-crew: 2/3
- B file-state@8 firstmate-11/file-sbom-acceptances: 1/3
- B rationale@8 firstmate-11/why-pm-assigned-only: 2/3
- B rationale@8 firstmate-11/why-date-backdate: 2/3
- B rule@8 firstmate-11/super-herdr-updated: 2/3
- B done@8 firstmate-11/pr:1421: 2/3
- B value@9 firstmate-11/port: 2/3
- B file-state@9 firstmate-11/file-sbom-acceptances: 1/3
- B rationale@9 firstmate-11/why-pm-assigned-only: 2/3
- B rule@9 firstmate-11/super-gorman-document: 2/3
- B rule@9 firstmate-11/super-herdr-updated: 2/3
- B rule@9 firstmate-11/order-sbom-prs: 1/3
- B false@9 firstmate-11/near-pm-every-contract: 2/3
- B done@9 firstmate-11/pr:1423: 2/3
- B value@9 firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: 1/3
- B value@10 firstmate-11/port: 2/3
- B file-state@10 firstmate-11/file-sbom-acceptances: 1/3
- B multi-hop@10 firstmate-11/multi-gorman-prod-setup: 2/3
- B rationale@10 firstmate-11/why-pm-assigned-only: 2/3
- B rule@10 firstmate-11/order-sbom-prs: 1/3
- B done@10 firstmate-11/pr:1423: 2/3
- B value@10 firstmate-11/path:bin/fm-session-start.sh: 1/3
- B next@11 firstmate-11/told-11: 2/3
- B file-state@11 firstmate-11/file-captain-md: 1/3
- B rationale@11 firstmate-11/why-pm-assigned-only: 1/3

## A .scratch/omv-code/base7 (dir)

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

## A .scratch/omv-code/base7 (dir) (holdout)

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

## A .scratch/omv-code/base7 (dir) (reflection chain)

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

## A .scratch/omv-code/base7 (dir) (long chain, every 5th cut)

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

## B .scratch/omv/carry5f (dir)

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

## B .scratch/omv/carry5f (dir) (holdout)

Total: **83.0**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 59.0 | 59/100 | 29.4 | 68.3 | 55.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 86.7 | 13/15 | 83.3 | 100.0 | 87.5 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 59.7 | 43/72 | 75.0 | 44.1 | 72.7 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 68.3 | 1/14 | 83.2 | 69.2 | 44.9 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.0** | 75.5% | 81.9 | 71.7 | 77.5 |

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

## B .scratch/omv/carry5f (dir) (reflection chain)

Total: **80.7**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 111 calls, 2 fresh

| gate | weight | score | passed | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|---:|---:|
| identifiers | 10 | 53.4 | 143/268 | 53.4 |
| constraints | 6 | 100.0 | 446/446 | 100.0 |
| verbatim | 5 | 100.0 | 459/459 | 100.0 |
| corrections | 8 | 100.0 | 388/388 | 100.0 |
| reversals | 6 | 92.3 | 12/13 | 92.3 |
| approvals | 5 | 100.0 | 54/54 | 100.0 |
| asks | 5 | 100.0 | 93/93 | 100.0 |
| in-progress | 5 | 75.7 | 28/37 | 75.7 |
| handoff | 8 | 100.0 | 44/44 | 100.0 |
| files-edited | 5 | 95.3 | 61/64 | 95.3 |
| commits | 4 | 97.9 | 140/143 | 97.9 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.0 | 292/301 | 97.0 |
| chronology | 6 | 57.8 | 654/1131 | 57.8 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 20.7 | 1/31 | 20.7 |
| budget | 3 | 95.0 | 17/31 | 95.0 |
| **total** | | **80.7** | 81.8% | 80.7 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 37k | 37k |
| context tokens per cut, max | 54k | 54k |
| reduction ratio (compacted / replaced), mean | 23.0% | 23.0% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 2 (72k / 8.4k) | 2 (72k / 8.4k) |
| model tokens in + out | 1817k | 1817k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv/carry5f (dir) (long chain, every 5th cut)

Total: **60.8**

sample 1: long 334 calls, 9 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 47.6 | 101/212 | 47.6 |
| constraints | 6 | 96.5 | 247/256 | 96.5 |
| verbatim | 5 | 100.0 | 258/258 | 100.0 |
| corrections | 8 | 99.6 | 514/516 | 99.6 |
| reversals | 6 | 49.8 | 101/203 | 49.8 |
| approvals | 5 | 50.0 | 24/48 | 50.0 |
| asks | 5 | 100.0 | 48/48 | 100.0 |
| in-progress | 5 | 72.0 | 18/25 | 72.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 85.7 | 66/77 | 85.7 |
| commits | 4 | 68.3 | 125/183 | 68.3 |
| failures | 6 | 60.0 | 6/10 | 60.0 |
| facts | 5 | 47.6 | 430/903 | 47.6 |
| decisions | 5 | 28.2 | 91/323 | 28.2 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 48.2 | 237/492 | 48.2 |
| absent | 5 | 98.0 | 288/294 | 98.0 |
| tokens | 6 | 8.4 | 0/16 | 8.4 |
| budget | 3 | 85.9 | 4/16 | 85.9 |
| **total** | | **60.8** | 66.4% | 60.8 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 44k | 44k |
| context tokens per cut, max | 74k | 74k |
| reduction ratio (compacted / replaced), mean | 29.8% | 29.8% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 9 (301k / 28k) | 9 (301k / 28k) |
| model tokens in + out | 6013k | 6013k |
| critical-path calls (tokens in / out) | 115 (1992k / 84k) | 115 (1992k / 84k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **45.5** — 472 of 1284 hand-authored facts held, 224 more pointed to by a source range om_recall can follow (½ each).
Reached: 7 reflections (9 Reflector calls), 325 Observer calls; constraint tier peak ~6040 tokens at cut 80; constraint-cap fallbacks at none.

## B .scratch/omv/carry3f (dir)

Total: **81.4**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 58.0 | 120/207 | 62.7 | 64.3 | 42.9 |
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
| lessons | 7 | 63.3 | 31/49 | 83.3 | 87.0 | 30.0 |
| file-state | 7 | 65.8 | 52/79 | 76.5 | 100.0 | 43.9 |
| multi-hop | 7 | 79.5 | 35/44 | 55.6 | 84.2 | 87.5 |
| rationale | 7 | 65.5 | 36/55 | 50.0 | 76.5 | 65.4 |
| chronology | 6 | 77.4 | 366/473 | 81.1 | 70.4 | 83.9 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| purpose | 5 | 0.0 | 0/24 | 0.0 | 0.0 | 0.0 |
| tokens | 6 | 69.0 | 3/25 | 81.8 | 54.0 | 75.4 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **81.4** | 83.3% | 82.3 | 84.2 | 78.8 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 17k | 25k | 18k |
| context tokens per cut, max | 33k | 20k | 33k | 31k |
| reduction ratio (compacted / replaced), mean | 12.9% | 10.9% | 15.6% | 11.6% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 23 (295k / 19k) | 38 (526k / 31k) | 26 (325k / 21k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 314k | 557k | 346k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv/carry3f (dir) (holdout)

Total: **83.0**

sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | score | passed | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 59.0 | 59/100 | 29.4 | 68.3 | 55.0 |
| corrections | 8 | 100.0 | 18/18 | 100.0 | – | – |
| approvals | 5 | 100.0 | 2/2 | 100.0 | – | – |
| asks | 5 | 100.0 | 34/34 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 50.0 | 14/28 | 61.5 | 12.5 | 71.4 |
| files-edited | 5 | 86.7 | 13/15 | 83.3 | 100.0 | 87.5 |
| commits | 4 | 100.0 | 38/38 | 100.0 | – | – |
| failures | 6 | 100.0 | 16/16 | 100.0 | – | 100.0 |
| chronology | 6 | 59.7 | 43/72 | 75.0 | 44.1 | 72.7 |
| absent | 5 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 68.5 | 1/14 | 83.5 | 69.2 | 45.2 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.0** | 75.5% | 81.9 | 71.7 | 77.5 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 21k | 16k | 21k | 27k |
| context tokens per cut, max | 31k | 22k | 26k | 31k |
| reduction ratio (compacted / replaced), mean | 13.0% | 10.2% | 13.0% | 17.3% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 16 (184k / 12k) | 16 (188k / 13k) | 12 (139k / 9.9k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 196k | 202k | 149k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv/carry3f (dir) (reflection chain)

Total: **80.9**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 112 calls, 3 fresh

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
| commits | 4 | 97.9 | 140/143 | 97.9 |
| failures | 6 | 91.4 | 32/35 | 91.4 |
| facts | 5 | 97.0 | 292/301 | 97.0 |
| chronology | 6 | 52.3 | 591/1131 | 52.3 |
| absent | 5 | 100.0 | 31/31 | 100.0 |
| tokens | 6 | 20.4 | 1/31 | 20.4 |
| budget | 3 | 95.6 | 17/31 | 95.6 |
| **total** | | **80.9** | 80.0% | 80.9 |

Efficiency (not in the total):

| metric | all | om-v04+om-orchestration+firstmate-11+firstmate-6 |
|---|---:|---:|
| context tokens per cut, mean | 36k | 36k |
| context tokens per cut, max | 55k | 55k |
| reduction ratio (compacted / replaced), mean | 23.0% | 23.0% |
| Observer calls (tokens in / out) | 109 (1647k / 89k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 3 (109k / 11k) | 3 (109k / 11k) |
| model tokens in + out | 1857k | 1857k |
| critical-path calls (tokens in / out) | 2 (31k / 1.8k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B .scratch/omv/carry3f (dir) (long chain, every 5th cut)

Total: **62.2**

sample 1: long 336 calls, 11 fresh

| gate | weight | score | passed | long |
|---|---:|---:|---:|---:|
| identifiers | 10 | 45.3 | 96/212 | 45.3 |
| constraints | 6 | 96.5 | 247/256 | 96.5 |
| verbatim | 5 | 100.0 | 258/258 | 100.0 |
| corrections | 8 | 99.6 | 514/516 | 99.6 |
| reversals | 6 | 47.8 | 97/203 | 47.8 |
| approvals | 5 | 47.9 | 23/48 | 47.9 |
| asks | 5 | 100.0 | 48/48 | 100.0 |
| in-progress | 5 | 72.0 | 18/25 | 72.0 |
| handoff | 8 | 100.0 | 7/7 | 100.0 |
| files-edited | 5 | 85.7 | 66/77 | 85.7 |
| commits | 4 | 80.3 | 147/183 | 80.3 |
| failures | 6 | 60.0 | 6/10 | 60.0 |
| facts | 5 | 41.7 | 377/903 | 41.7 |
| decisions | 5 | 28.5 | 92/323 | 28.5 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 44.7 | 220/492 | 44.7 |
| absent | 5 | 99.0 | 291/294 | 99.0 |
| tokens | 6 | 8.1 | 0/16 | 8.1 |
| budget | 3 | 88.2 | 6/16 | 88.2 |
| **total** | | **62.2** | 65.0% | 62.2 |

Efficiency (not in the total):

| metric | all | long |
|---|---:|---:|
| context tokens per cut, mean | 44k | 44k |
| context tokens per cut, max | 66k | 66k |
| reduction ratio (compacted / replaced), mean | 29.6% | 29.6% |
| Observer calls (tokens in / out) | 325 (5437k / 247k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 11 (358k / 33k) | 11 (358k / 33k) |
| model tokens in + out | 6075k | 6075k |
| critical-path calls (tokens in / out) | 115 (1990k / 83k) | 115 (1990k / 83k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Recall-aware credit (not in any total): **42.1** — 424 of 1284 hand-authored facts held, 233 more pointed to by a source range om_recall can follow (½ each).
Reached: 7 reflections (11 Reflector calls), 325 Observer calls; constraint tier peak ~6040 tokens at cut 80; constraint-cap fallbacks at none.

