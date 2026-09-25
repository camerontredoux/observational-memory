# Against A /home/cameron/work/mods/observational-memory/.scratch/omv-code/base4 (dir): 78.1; reflection chain 81.9; long chain 59.8, recall-aware 32.6

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | chain Δ | long Δ |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|---|
| B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base5 (dir) | 81.2 | +3.1 | +1.5 / +4.8 / +3.2 | 50 | 19 | 0.00024 | A' -1.1 | tradeoff | worse | multi-hop +0.8, rationale +0.7, lessons +0.7, identifiers +0.6 | -1.4 (72↑ 122↓) | -0.1 (68↑ 56↓); recall-aware 37.6 (+5.0) |

# Compaction A/B

A: A /home/cameron/work/mods/observational-memory/.scratch/omv-code/base4 (dir)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base5 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 55.6 | +8.2 | 98/207 | 115/207 | 24 | 7 |
| constraints | 6 | 100.0 | 96.2 | -3.8 | 106/106 | 102/106 |  | 4 |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 84.0 | 81.3 | -2.7 | 63/75 | 61/75 | 3 | 5 |
| approvals | 5 | 92.6 | 81.5 | -11.1 | 50/54 | 44/54 |  | 6 |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 100.0 | +2.0 | 50/51 | 51/51 | 1 |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 71.7 | 82.1 | +10.4 | 124/173 | 142/173 | 19 | 1 |
| decisions | 5 | 92.7 | 100.0 | +7.3 | 51/55 | 55/55 | 4 |  |
| lessons | 7 | 44.9 | 59.2 | +14.3 | 22/49 | 29/49 | 8 | 1 |
| file-state | 7 | 58.2 | 64.6 | +6.3 | 46/79 | 51/79 | 12 | 7 |
| multi-hop | 7 | 36.4 | 52.3 | +15.9 | 16/44 | 23/44 | 10 | 3 |
| rationale | 7 | 36.4 | 50.9 | +14.5 | 20/55 | 28/55 | 8 |  |
| chronology | 6 | 72.9 | 75.5 | +2.5 | 345/473 | 357/473 | 22 | 10 |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 79.5 | 73.3 | -6.2 | 4/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.1** | **81.2** | **+3.1** | 78.4% | 81.6% | **111** | **44** |

Per transcript: om-orchestration 82.3 → 83.8 (+1.5); om-v04 78.2 → 83.0 (+4.8); firstmate-11 75.4 → 78.6 (+3.2).
Flips: 111 up, 44 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 50 up, 19 down, sign test p=0.00024. Passed counts are over all samples.

Verdict: tradeoff: B +3.1 quality for +10% mean tokens (more than 10% more tokens is never "better").
efficiency: worse (B vs A: mean tokens +10%, reduction ratio +10%, model tokens -6%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ -1.1, 65 up / 101 down (29 / 36 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 17k | 19k |
| context tokens per cut, max | 28k | 31k |
| reduction ratio (compacted / replaced), mean | 11.0% | 12.1% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (19 unique items):

- identifiers om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @1
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
- identifiers om-v04/path:openai-codex/gpt-5.6-luna: ↓ at @6
- identifiers om-v04/path:tests/fixtures/crewmate.local.ts: ↓ at @6
- identifiers om-v04/path:.claude/types/claude-code.d.ts: ↓ at @6
- chronology om-v04/path:.claude/types: ↓ at @6
- multi-hop om-v04/hop:151-messages: ↓ at @7 @8 @9
- reversals om-v04/sup:subagent-observed: ↓ at @8 @9
- file-state firstmate-11/file-claude-json-key: ↓ at @5 @6 @7 @8 @9 @10 @11
- identifiers firstmate-11/path:data/opie-gorman-pdf-on-contract-signed/prod-dump/prod.dump: ↓ at @9

Better in B (50 unique items):

- facts om-orchestration/testing-backup: ↑ at @1 @2 @3 @4 @5
- file-state om-orchestration/file:testing-guide: ↑ at @1
- rationale om-orchestration/why:lanes: ↑ at @1 @2
- identifiers om-orchestration/path:tests/eval/bench.ts: ↑ at @2
- identifiers om-orchestration/path:tests/eval/scenarios.ts: ↑ at @2 @3
- chronology om-orchestration/path:hooks/stats.ts: ↑ at @3 @4 @5
- file-state om-orchestration/file:scenarios-fix: ↑ at @4 @5
- multi-hop om-orchestration/hop:x-req-id: ↑ at @4 @5
- identifiers om-orchestration/path:hooks/stats.ts: ↑ at @5
- identifiers om-orchestration/version:1.1.0: ↑ at @5
- identifiers om-orchestration/path:~/work/mods/observational-memory/docs/bench/2026-09-24-v1.0.0.jsonl: ↑ at @5
- chronology om-orchestration/ticket-10: ↑ at @5
- facts om-orchestration/sup:v1-spend: ↑ at @5
- facts om-orchestration/sup:rr-run-cost: ↑ at @5
- identifiers om-v04/path:.claude-plugin/plugin.json: ↑ at @1 @2 @3 @4 @5
- identifiers om-v04/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @2 @9
- chronology om-v04/path:.claude-plugin/plugin.json: ↑ at @3 @4 @5 @7
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
- facts firstmate-11/tools: ↑ at @4 @5 @6 @7 @8 @9 @10 @11
- chronology firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @5 @6
- multi-hop firstmate-11/multi-watcher-5415: ↑ at @5 @6 @7 @8
- rationale firstmate-11/why-imports-not-codex: ↑ at @5 @6
- identifiers firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @6
- lessons firstmate-11/neg-tab-price: ↑ at @6
- facts firstmate-11/scope-prod-write: ↑ at @7
- reversals firstmate-11/super-test-db: ↑ at @7 @9
- decisions firstmate-11/sbom-cause: ↑ at @9 @10 @11
- facts firstmate-11/exact-libheif-version: ↑ at @9 @10 @11
- rationale firstmate-11/why-date-backdate: ↑ at @9 @10 @11
- commits firstmate-11/pr:1425: ↑ at @11

## Long chain (not in the total)

A: A /home/cameron/work/mods/observational-memory/.scratch/omv-code/base4 (dir) (long chain, every 5th cut)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base5 (dir) (long chain, every 5th cut)

A sample 1: long 331 calls, 0 fresh
B sample 1: long 343 calls, 310 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 44.8 | 43.4 | -1.4 | 95/212 | 92/212 | 7 | 10 |
| constraints | 6 | 91.4 | 96.5 | +5.1 | 234/256 | 247/256 | 13 |  |
| verbatim | 5 | 89.1 | 97.3 | +8.1 | 230/258 | 251/258 | 21 |  |
| corrections | 8 | 68.0 | 70.3 | +2.3 | 351/516 | 363/516 | 14 | 2 |
| reversals | 6 | 48.3 | 44.3 | -3.9 | 98/203 | 90/203 | 23 | 31 |
| approvals | 5 | 60.4 | 50.0 | -10.4 | 29/48 | 24/48 |  | 5 |
| asks | 5 | 100.0 | 100.0 | 0 | 48/48 | 48/48 |  |  |
| in-progress | 5 | 76.0 | 72.0 | -4.0 | 19/25 | 18/25 |  | 1 |
| handoff | 8 | 100.0 | 100.0 | 0 | 7/7 | 7/7 |  |  |
| files-edited | 5 | 84.4 | 85.7 | +1.3 | 65/77 | 66/77 | 4 | 3 |
| commits | 4 | 68.3 | 84.7 | +16.4 | 125/183 | 155/183 | 33 | 3 |
| failures | 6 | 60.0 | 60.0 | 0 | 6/10 | 6/10 |  |  |
| facts | 5 | 31.4 | 37.7 | +6.3 | 272/867 | 327/867 | 79 | 24 |
| decisions | 5 | 25.4 | 29.1 | +3.7 | 82/323 | 94/323 | 30 | 18 |
| lessons | 7 | 100.0 | 100.0 | 0 | 12/12 | 12/12 |  |  |
| chronology | 6 | 52.4 | 48.0 | -4.5 | 258/492 | 236/492 | 36 | 58 |
| absent | 5 | 99.0 | 98.0 | -1.0 | 291/294 | 288/294 |  | 3 |
| tokens | 6 | 10.4 | 8.8 | -1.7 | 0/16 | 0/16 |  |  |
| budget | 3 | 88.4 | 87.6 | -0.9 | 6/16 | 5/16 | 1 | 2 |
| **total** | | **59.8** | **59.6** | **-0.1** | 57.9% | 60.5% | **261** | **160** |

Per transcript: long 59.8 → 59.6 (-0.1).
Flips: 261 up, 160 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 68 up, 56 down, sign test p=0.32. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: worse (B vs A: mean tokens +3%, reduction ratio +4%, model tokens +10%, critical-path calls per transcript +2.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 43k | 44k |
| context tokens per cut, max | 68k | 67k |
| reduction ratio (compacted / replaced), mean | 28.3% | 29.3% |
| Observer calls (tokens in / out) | 325 (5259k / 209k) | 325 (5437k / 247k) |
| Reflector calls (tokens in / out) | 6 (196k / 20k) | 18 (537k / 55k) |
| model tokens in + out | 5683k | 6276k |
| critical-path calls (tokens in / out) | 114 (1878k / 67k) | 116 (2014k / 87k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (56 unique items):

- budget long/size: ↑ at @20; ↓ at @30 @75
- chronology long/path:hooks/hooks.json: ↑ at @25 @30; ↓ at @5 @55 @80
- decisions long/om-v04-why:timeout-not-retried: ↑ at @80; ↓ at @40 @45 @50
- identifiers long/path:~/.claude/plugins/data/observational-memory/stats: ↓ at @10
- chronology long/version:0.1.0: ↓ at @10 @15 @20
- chronology long/path:~/work/lanterns: ↓ at @10 @15 @20
- identifiers long/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↓ at @15
- chronology long/path:.claude-plugin/plugin.json: ↓ at @15 @35 @55
- decisions long/om-v04-haiku-not-faster: ↓ at @15 @20
- approvals long/om-v04-scope:ctx-worktree: ↓ at @15 @20
- reversals long/om-v04-sup:stall-cause: ↓ at @15 @20 @25 @30 @35 @40 @45 @50
- chronology long/path:/tmp/cctypes/claude-code.d.ts: ↓ at @20
- chronology long/path:/tmp/cctypes: ↓ at @20 @25 @30 @35 @40 @45 @50
- chronology long/uuid:c88abd43-9e84-435f-9568-5a04d505bb9e: ↓ at @20
- decisions long/om-v04-thinking-low: ↓ at @20
- decisions long/om-v04-neg:c029150-dropped: ↓ at @20
- facts long/om-v04-file:pi-isolation: ↓ at @20 @25 @30 @35 @40 @45 @50
- facts long/long:clockmaker-clocks: ↓ at @20
- absent long/firstmate-11-abst-drug-quota: ↓ at @25 @30 @35
- reversals long/om-v04-sup:subagent-observed: ↓ at @25 @30 @35 @40 @45 @50
- reversals long/om-v04-sup:main-tests: ↓ at @25 @30 @35 @40 @45 @50 @80
- identifiers long/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↓ at @30
- identifiers long/version:1.1.0: ↓ at @40
- identifiers long/path:tests/eval/runner.ts: ↓ at @40
- identifiers long/path:/tmp/om-flow: ↓ at @40
- identifiers long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings: ↓ at @40
- chronology long/om-v04-main-0.4.13: ↓ at @40 @45 @50
- facts long/om-v04-file:skill-rule: ↓ at @40 @45 @50
- approvals long/om-v04-scope:no-lavish: ↓ at @40 @45 @50
- facts long/firstmate-11-file-prod-change-backup: ↓ at @40 @45 @50
- facts long/firstmate-11-file-sbom-acceptances: ↓ at @40 @45 @50
- reversals long/om-v04-sup:todo-commit: ↓ at @40 @45 @50
- reversals long/om-v04-sup:failure-cause: ↓ at @40 @45 @50
- reversals long/firstmate-11-super-sbom-pages: ↓ at @40 @45 @50
- facts long/om-v04-vcc-repo: ↓ at @45 @45 @50 @50
- decisions long/om-orchestration-vcc-brief: ↓ at @45 @50
- in-progress long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/estimates/actions/create-contract-dialog-template.tsx: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-retype-on-revise.test.ts: ↓ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/contract-send.test.ts: ↓ at @50
- chronology long/om-orchestration-runner-merge: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/om-orchestration-ticket-7: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/om-orchestration-ticket-5: ↓ at @55 @60 @65 @70 @75 @80
- chronology long/om-orchestration-ticket-6: ↓ at @55 @60 @65 @70 @75 @80
- decisions long/om-orchestration-assistant-model: ↓ at @55 @60 @65 @70 @75
- chronology long/om-orchestration-ord:6-after-5: ↓ at @55 @60 @65 @70 @75 @80
- identifiers long/path:tests/fm-brief.test.sh: ↓ at @60
- commits long/commit:940b47b: ↓ at @65 @70
- chronology long/path:tests/register.test.ts: ↓ at @65 @70 @75
- decisions long/om-orchestration-herdr-panes: ↓ at @65 @70 @75 @80
- identifiers long/uuid:28895069-a753-4a74-88b2-e0d5d4628d43: ↓ at @75
- commits long/commit:9466e8a: ↓ at @75
- identifiers long/path:~/.claude/projects: ↓ at @80
- corrections long/line 44915: ↓ at @80
- corrections long/line 44927: ↓ at @80
- facts long/om-orchestration-neg:fallback-cause: ↓ at @80

Better in B (68 unique items):

- identifiers long/path:/tmp/om-v043/fixture.jsonl: ↑ at @10 @15
- identifiers long/number:0.0039: ↑ at @10
- decisions long/om-v04-neg:vcc-install: ↑ at @15
- facts long/om-v04-file:prune-guards: ↑ at @15
- facts long/om-v04-hop:settle-error-fix: ↑ at @15
- decisions long/om-v04-why:parallel-order: ↑ at @15
- identifiers long/path:apps/web/.env.local: ↑ at @20
- decisions long/om-v04-neg:sched-reset: ↑ at @20 @25 @30
- facts long/om-v04-hop:made-up-answers: ↑ at @20 @25 @30 @35 @45 @50 @60
- decisions long/om-v04-why:gap-left: ↑ at @20 @25 @30
- decisions long/om-v04-no-subagent-threshold: ↑ at @25 @30
- facts long/om-v04-todo-gap: ↑ at @25 @30 @35
- facts long/om-v04-hop:moved-transcript: ↑ at @25 @30 @35
- decisions long/om-v04-why:skill-stub: ↑ at @25 @30 @35
- facts long/firstmate-11-tools: ↑ at @25 @30 @35 @40 @45 @50 @55 @60
- facts long/firstmate-11-file-captain-md: ↑ at @25 @30 @35
- commits long/pr:1424: ↑ at @35
- facts long/firstmate-11-multi-password-exposure: ↑ at @35
- facts long/firstmate-11-multi-gorman-prod-setup: ↑ at @35 @40 @45 @50 @55 @60 @65 @70 @75 @80
- reversals long/firstmate-11-order-rename-then-subject: ↑ at @35 @40 @45 @65 @70 @75 @80
- identifiers long/path:.worktrees/issue-11: ↑ at @40
- facts long/om-orchestration-file:scenarios-fix: ↑ at @40 @45 @50
- facts long/om-orchestration-exact:rescored-results: ↑ at @40 @45 @50
- facts long/om-orchestration-exact:todo-fallback: ↑ at @40 @45 @50
- reversals long/firstmate-11-super-firstmate-pushed: ↑ at @40 @45 @50 @80
- reversals long/om-orchestration-rule:push-now: ↑ at @40 @45 @50 @80
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/2/oasis-pavers-and-pools-opie/apps/web/src/components/change-orders/void-signed-change-order-dialog.tsx: ↑ at @45
- facts long/firstmate-11-why-sbom-passed: ↑ at @45 @50 @55 @60; ↓ at @30 @35
- facts long/om-orchestration-sup:main-head-5: ↑ at @45 @50
- constraints long/firstmate-11-sonnet-low: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-single-pr: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-sonnet-low: ↑ at @50 @55 @60 @65 @70 @75 @80
- verbatim long/firstmate-11-email-subject: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 12660: ↑ at @50 @55 @60 @65 @70 @75 @80
- corrections long/line 15720: ↑ at @50 @55 @60 @65 @70 @75 @80
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/components/estimates/actions/create-contract-dialog.tsx: ↑ at @50
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/apps/web/src/server/features/contracts/optional-documents.test.ts: ↑ at @50
- constraints long/firstmate-11-email-subject: ↑ at @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-email-subject: ↑ at @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-base-spec: ↑ at @55
- files-edited long/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/4/oasis-pavers-and-pools-opie/apps/web/src/server/features/communications/communication-template.service.test.ts: ↑ at @55
- commits long/pr:238: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1418: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1420: ↑ at @55 @60 @65 @70 @75 @80
- commits long/pr:1421: ↑ at @55 @60
- commits long/pr:1422: ↑ at @55 @60
- commits long/pr:1423: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/path:/tmp/compact-test-last.json: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/version:2.1.280: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/path:~/work/mods/compact-test: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/issue:#1: ↑ at @55
- decisions long/om-v04-merge-recall: ↑ at @55 @60
- chronology long/firstmate-11-fork-push: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sign-pr: ↑ at @55 @60 @65 @70 @75 @80
- chronology long/firstmate-11-sbom-followups-pr: ↑ at @55 @60
- decisions long/firstmate-11-sbom-cause: ↑ at @55 @60 @65 @70 @75 @80
- decisions long/firstmate-11-sbom-accepted: ↑ at @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-multi-prod-dump: ↑ at @55 @60 @65 @70 @75 @80
- facts long/firstmate-11-exact-libheif-version: ↑ at @55 @60 @65 @70 @75 @80
- facts long/om-orchestration-file:bench-baseline: ↑ at @55 @60
- facts long/long:auto-compact-window: ↑ at @55 @60 @65 @70 @75 @80
- reversals long/firstmate-11-order-sbom-prs: ↑ at @55 @60 @65 @80
- decisions long/firstmate-11-blank-body: ↑ at @60 @65
- reversals long/firstmate-11-line-items: ↑ at @65 @70 @75 @80; ↓ at @50
- identifiers long/path:tests/eval/replay-specs: ↑ at @75
- identifiers long/number:0.30: ↑ at @75
- commits long/commit:00b682b: ↑ at @75 @80
- commits long/commit:7f4f391: ↑ at @75 @80

Both ways (1 unique items):

- chronology long/path:.claude/types: ↑ at @80; ↓ at @20

Recall-aware credit (not in any total): A 32.6, B 37.6 (+5.0)

## Reflection chain (not in the total)

A: A /home/cameron/work/mods/observational-memory/.scratch/omv-code/base4 (dir) (reflection chain)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base5 (dir) (reflection chain)

A sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 0 fresh
B sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 108 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 44.0 | 50.7 | +6.7 | 118/268 | 136/268 | 27 | 9 |
| constraints | 6 | 100.0 | 100.0 | 0 | 446/446 | 446/446 |  |  |
| verbatim | 5 | 100.0 | 100.0 | 0 | 459/459 | 459/459 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 388/388 | 388/388 |  |  |
| reversals | 6 | 92.3 | 92.3 | 0 | 12/13 | 12/13 |  |  |
| approvals | 5 | 98.1 | 98.1 | 0 | 53/54 | 53/54 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 93/93 | 93/93 |  |  |
| in-progress | 5 | 73.0 | 75.7 | +2.7 | 27/37 | 28/37 | 1 |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 95.3 | 95.3 | 0 | 61/64 | 61/64 | 3 | 3 |
| commits | 4 | 99.3 | 97.2 | -2.1 | 142/143 | 139/143 |  | 3 |
| failures | 6 | 91.4 | 91.4 | 0 | 32/35 | 32/35 |  |  |
| facts | 5 | 97.7 | 97.0 | -0.7 | 294/301 | 292/301 |  | 2 |
| chronology | 6 | 51.3 | 45.8 | -5.5 | 580/1131 | 518/1131 | 39 | 101 |
| absent | 5 | 100.0 | 100.0 | 0 | 31/31 | 31/31 |  |  |
| tokens | 6 | 28.5 | 24.4 | -4.1 | 1/31 | 1/31 |  |  |
| budget | 3 | 97.5 | 95.8 | -1.7 | 23/31 | 21/31 | 2 | 4 |
| **total** | | **81.9** | **80.5** | **-1.4** | 79.2% | 77.8% | **72** | **122** |

Per transcript: om-v04+om-orchestration+firstmate-11+firstmate-6 81.9 → 80.5 (-1.4).
Flips: 72 up, 122 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 29 up, 26 down, sign test p=0.79. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: same (B vs A: mean tokens +6%, reduction ratio +6%, model tokens +0%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. Some replies were fresh calls in this run. No resample of A is recorded: the noise floor is unknown.

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 33k | 35k |
| context tokens per cut, max | 57k | 51k |
| reduction ratio (compacted / replaced), mean | 20.9% | 22.2% |
| Observer calls (tokens in / out) | 109 (1656k / 79k) | 109 (1647k / 89k) |
| Reflector calls (tokens in / out) | 1 (38k / 4.6k) | 1 (37k / 3.6k) |
| model tokens in + out | 1777k | 1777k |
| critical-path calls (tokens in / out) | 2 (31k / 1.6k) | 2 (31k / 1.8k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (26 unique items):

- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043/fixture.jsonl: ↑ at @4 @5 @6; ↓ at @16 @17 @18 @19
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043: ↑ at @4 @6; ↓ at @16 @17 @18 @19
- budget om-v04+om-orchestration+firstmate-11+firstmate-6/size: ↑ at @16 @19; ↓ at @13 @26 @28 @30
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp: ↓ at @3 @4 @5 @6 @7 @8 @9 @10 @11 @12 @13 @14 @15 @16 @17 @18 @19
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/cmp: ↓ at @7
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/TODO.md: ↓ at @10 @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/version:1.0.0: ↓ at @11
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

Better in B (29 unique items):

- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-v043/fixture.jsonl: ↑ at @2 @6
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie: ↑ at @3 @4 @5 @6 @7 @8 @9 @10 @11 @12 @13 @14 @15 @16 @17 @18 @19 @20 @21 @22 @23 @24 @25 @26 @27 @28 @29 @30 @31
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:.claude-plugin/plugin.json: ↑ at @4 @5
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron-work-mods: ↑ at @4 @6
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/uuid:5fdeae60-01fd-46f7-910e-745a4011321c: ↑ at @4
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/commit:5fdeae6: ↑ at @4
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:.claude-plugin/plugin.json: ↑ at @4 @5
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron--treehouse-oasis-pavers-and-pools-opie-a804cf-3-oasis-pavers-and-pools-opie: ↑ at @6
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/.claude/projects/-home-cameron-work-mods/5fdeae60-01fd-46f7-910e-745a4011321c/subagents: ↑ at @6
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.04: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.06: ↑ at @8
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory/.worktrees/issue-2: ↑ at @10
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#5: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/issue:#6: ↑ at @11
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$0.11: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/number:0.11: ↑ at @12
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/usd:$17.76: ↑ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:~/work/mods/observational-memory/docs/bench/2026-09-24-v1.0.0.jsonl: ↑ at @14
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:/tmp/om-vcc: ↑ at @14
- in-progress om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/tests/bench.test.ts: ↑ at @14
- files-edited om-v04+om-orchestration+firstmate-11+firstmate-6/~/work/mods/observational-memory/tests/bench.test.ts: ↑ at @14 @15 @16
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:bin/fm-update.sh: ↑ at @17
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/const:PRODUCTION_READ_ONLY_DATABASE_URL: ↑ at @23
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @24
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:ByteBotSoftware/oasis-pavers-and-pools-opie: ↑ at @28
- chronology om-v04+om-orchestration+firstmate-11+firstmate-6/path:packages/db/src/schema/settings.ts: ↑ at @29 @30 @31
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:Variance/pre-construction: ↑ at @30
- identifiers om-v04+om-orchestration+firstmate-11+firstmate-6/path:apps/web/src/components/drug-testing/drug-test-list.tsx: ↑ at @30

## A /home/cameron/work/mods/observational-memory/.scratch/omv-code/base4 (dir)

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

## A /home/cameron/work/mods/observational-memory/.scratch/omv-code/base4 (dir) (reflection chain)

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

## A /home/cameron/work/mods/observational-memory/.scratch/omv-code/base4 (dir) (long chain, every 5th cut)

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

## B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base5 (dir)

Total: **81.2**

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
| tokens | 6 | 73.3 | 3/25 | 85.8 | 60.8 | 77.9 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **81.2** | 81.6% | 83.8 | 83.0 | 78.6 |

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

## B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base5 (dir) (reflection chain)

Total: **80.5**

sample 1: om-v04+om-orchestration+firstmate-11+firstmate-6 110 calls, 108 fresh

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

## B /home/cameron/work/mods/observational-memory/.scratch/omv-code/base5 (dir) (long chain, every 5th cut)

Total: **59.6**

sample 1: long 343 calls, 310 fresh

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
| facts | 5 | 37.7 | 327/867 | 37.7 |
| decisions | 5 | 29.1 | 94/323 | 29.1 |
| lessons | 7 | 100.0 | 12/12 | 100.0 |
| chronology | 6 | 48.0 | 236/492 | 48.0 |
| absent | 5 | 98.0 | 288/294 | 98.0 |
| tokens | 6 | 8.8 | 0/16 | 8.8 |
| budget | 3 | 87.6 | 5/16 | 87.6 |
| **total** | | **59.6** | 60.5% | 59.6 |

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

Recall-aware credit (not in any total): **37.6** — 396 of 1248 hand-authored facts held, 147 more pointed to by a source range om_recall can follow (½ each).
Reached: 6 reflections (18 Reflector calls), 325 Observer calls; constraint tier peak ~6040 tokens at cut 80; constraint-cap fallbacks at none.

