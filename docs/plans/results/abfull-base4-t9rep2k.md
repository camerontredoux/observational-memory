[0m[31m[A /tmp/omv-code/base4 (dir)] om-orchestration[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] om-orchestration[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] om-v04[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] firstmate-11[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] om-v04[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] firstmate-11[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout firstmate-6[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout crew-uspa-4[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout crew-opie-4[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] holdout firstmate-6[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] holdout crew-uspa-4[0m
[0m[31m[B /tmp/omv-code/t9-rep2k (dir)] holdout crew-opie-4[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] om-orchestration[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] om-v04[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] firstmate-11[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] holdout firstmate-6[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] holdout crew-uspa-4[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] holdout crew-opie-4[0m
# Against A /tmp/omv-code/base4 (dir): 78.1; holdout 83.4

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|
| B /tmp/omv-code/t9-rep2k (dir) | 82.2 | +4.0 | +3.4 / +5.3 / +4.2 | 57 | 17 | 0.0000034 | A' -1.1 | tradeoff | worse | lessons +0.9, multi-hop +0.9, rationale +0.9, identifiers +0.6 | -0.6 (6↑ 9↓) |

# Compaction A/B

A: A /tmp/omv-code/base4 (dir)
B: B /tmp/omv-code/t9-rep2k (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 56.0 | +8.7 | 98/207 | 116/207 | 25 | 7 |
| constraints | 6 | 100.0 | 99.1 | -0.9 | 106/106 | 105/106 |  | 1 |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 84.0 | 84.0 | 0 | 63/75 | 63/75 | 3 | 3 |
| approvals | 5 | 92.6 | 81.5 | -11.1 | 50/54 | 44/54 |  | 6 |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 100.0 | +2.0 | 50/51 | 51/51 | 1 |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 71.7 | 82.7 | +11.0 | 124/173 | 143/173 | 20 | 1 |
| decisions | 5 | 92.7 | 100.0 | +7.3 | 51/55 | 55/55 | 4 |  |
| lessons | 7 | 44.9 | 63.3 | +18.4 | 22/49 | 31/49 | 9 |  |
| file-state | 7 | 58.2 | 69.6 | +11.4 | 46/79 | 55/79 | 16 | 7 |
| multi-hop | 7 | 36.4 | 54.5 | +18.2 | 16/44 | 24/44 | 11 | 3 |
| rationale | 7 | 36.4 | 54.5 | +18.2 | 20/55 | 30/55 | 10 |  |
| chronology | 6 | 72.9 | 75.7 | +2.7 | 345/473 | 358/473 | 23 | 10 |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 79.5 | 70.2 | -9.3 | 4/25 | 2/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.1** | **82.2** | **+4.0** | 78.4% | 82.4% | **122** | **38** |

Per transcript: om-orchestration 82.3 → 85.7 (+3.4); om-v04 78.2 → 83.5 (+5.3); firstmate-11 75.4 → 79.6 (+4.2).
Flips: 122 up, 38 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 57 up, 17 down, sign test p=0.0000034. Passed counts are over all samples.

Verdict: tradeoff: B +4.0 quality for +16% mean tokens (more than 10% more tokens is never "better").
efficiency: worse (B vs A: mean tokens +16%, reduction ratio +16%, model tokens -6%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ -1.1, 65 up / 101 down (29 / 36 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 17k | 20k |
| context tokens per cut, max | 28k | 32k |
| reduction ratio (compacted / replaced), mean | 11.0% | 12.7% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (17 unique items):

- identifiers om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @1
- chronology om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @3 @4 @5
- reversals om-orchestration/sup:live-harness: ↓ at @3 @4 @5
- identifiers om-orchestration/branch:issue-11: ↓ at @5
- constraints om-orchestration/rule:worktree-only: ↓ at @5
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
- file-state firstmate-11/file-claude-json-key: ↓ at @5 @6 @7 @8 @9 @10 @11
- identifiers firstmate-11/path:data/opie-gorman-pdf-on-contract-signed/prod-dump/prod.dump: ↓ at @9

Better in B (57 unique items):

- facts om-orchestration/testing-backup: ↑ at @1 @2 @3 @4 @5
- file-state om-orchestration/file:testing-guide: ↑ at @1 @2 @3 @4
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
- identifiers om-v04/path:~/.claude/plugins/store/observational-memory_inline-: ↑ at @1
- identifiers om-v04/path:~/.claude/plugins/data/observational-memory/stats: ↑ at @2 @9
- chronology om-v04/path:.claude-plugin/plugin.json: ↑ at @3 @4 @5 @7
- file-state om-v04/file:prune-guards: ↑ at @3 @4 @5 @6 @7 @8 @9
- chronology om-v04/path:/tmp/om-v043/fixture.jsonl: ↑ at @4 @5 @6 @7 @9
- identifiers om-v04/path:~/.pi/agent: ↑ at @5
- facts om-v04/str:retrying-rows: ↑ at @5
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
- chronology firstmate-11/path:~/.codex/AGENTS.md: ↑ at @5
- chronology firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @5 @6
- file-state firstmate-11/file-learnings-16gb: ↑ at @5
- multi-hop firstmate-11/multi-watcher-5415: ↑ at @5 @6 @7 @8
- rationale firstmate-11/why-imports-not-codex: ↑ at @5 @6
- identifiers firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @6
- lessons firstmate-11/neg-tab-price: ↑ at @6
- facts firstmate-11/scope-prod-write: ↑ at @7
- reversals firstmate-11/super-test-db: ↑ at @7 @9
- decisions firstmate-11/sbom-cause: ↑ at @9 @10 @11
- facts firstmate-11/exact-libheif-version: ↑ at @9 @10 @11
- rationale firstmate-11/why-sbom-passed: ↑ at @9 @10
- rationale firstmate-11/why-date-backdate: ↑ at @9 @10 @11
- commits firstmate-11/pr:1425: ↑ at @11
- lessons firstmate-11/neg-address-split: ↑ at @11
- multi-hop firstmate-11/multi-gorman-prod-setup: ↑ at @11

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/base4 (dir) (holdout)
B: B /tmp/omv-code/t9-rep2k (dir) (holdout)

A sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh
B sample 1: firstmate-6 16 calls, 0 fresh; crew-uspa-4 16 calls, 0 fresh; crew-opie-4 12 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 61.0 | 59.0 | -2.0 | 61/100 | 59/100 | 3 | 5 |
| corrections | 8 | 100.0 | 100.0 | 0 | 18/18 | 18/18 |  |  |
| approvals | 5 | 100.0 | 100.0 | 0 | 2/2 | 2/2 |  |  |
| asks | 5 | 100.0 | 100.0 | 0 | 34/34 | 34/34 |  |  |
| in-progress | 5 | 50.0 | 50.0 | 0 | 14/28 | 14/28 |  |  |
| files-edited | 5 | 80.0 | 86.7 | +6.7 | 12/15 | 13/15 | 1 |  |
| commits | 4 | 100.0 | 97.4 | -2.6 | 38/38 | 37/38 |  | 1 |
| failures | 6 | 100.0 | 100.0 | 0 | 16/16 | 16/16 |  |  |
| chronology | 6 | 61.1 | 59.7 | -1.4 | 44/72 | 43/72 | 2 | 3 |
| absent | 5 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| tokens | 6 | 74.3 | 68.2 | -6.1 | 2/14 | 1/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **83.4** | **82.8** | **-0.6** | 76.1% | 75.2% | **6** | **9** |

Per transcript: firstmate-6 81.4 → 81.7 (+0.3); crew-uspa-4 72.9 → 71.7 (-1.2); crew-opie-4 79.5 → 77.4 (-2.0).
Flips: 6 up, 9 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 5 up, 7 down, sign test p=0.77. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens +9%, reduction ratio +9%, model tokens -12%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ +0.8, 8 up / 3 down (6 / 3 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 21k |
| context tokens per cut, max | 29k | 32k |
| reduction ratio (compacted / replaced), mean | 12.0% | 13.1% |
| Observer calls (tokens in / out) | 44 (594k / 30k) | 44 (512k / 35k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 624k | 547k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (7 unique items):

- identifiers firstmate-6/issue:#238: ↓ at @2
- commits firstmate-6/pr:1379: ↓ at @6
- identifiers crew-uspa-4/path:~/work/firstmate/data/uspa-multisession-smoke-rerun-b/shots: ↓ at @3 @4
- chronology crew-uspa-4/path:~/work/firstmate/data/uspa-multisession-smoke-rerun-b/shots: ↓ at @3 @4
- identifiers crew-opie-4/const:TEST_DATABASE_URL: ↓ at @2
- identifiers crew-opie-4/path:~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/brief.md: ↓ at @3
- chronology crew-opie-4/path:~/work/firstmate/data/opie-gorman-pdf-on-contract-signed/brief.md: ↓ at @3

Better in B (5 unique items):

- chronology firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @3 @5
- identifiers firstmate-6/path:ByteBotSoftware/uspa-iron-competition: ↑ at @5
- identifiers crew-uspa-4/path:/tmp/uspa-b-exports: ↑ at @3
- identifiers crew-uspa-4/path:exports/scenarioC-B2fix: ↑ at @4
- files-edited crew-opie-4/~/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie/packages/core/src/project-address.ts: ↑ at @4

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

## B /tmp/omv-code/t9-rep2k (dir)

Total: **82.2**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 56.0 | 116/207 | 58.2 | 63.1 | 42.9 |
| constraints | 6 | 99.1 | 105/106 | 98.0 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 84.0 | 63/75 | 78.6 | 55.6 | 97.7 |
| approvals | 5 | 81.5 | 44/54 | 100.0 | 74.4 | 100.0 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 82.7 | 143/173 | 94.0 | 78.6 | 77.6 |
| decisions | 5 | 100.0 | 55/55 | 100.0 | 100.0 | 100.0 |
| lessons | 7 | 63.3 | 31/49 | 100.0 | 78.3 | 35.0 |
| file-state | 7 | 69.6 | 55/79 | 94.1 | 100.0 | 43.9 |
| multi-hop | 7 | 54.5 | 24/44 | 55.6 | 47.4 | 62.5 |
| rationale | 7 | 54.5 | 30/55 | 25.0 | 76.5 | 53.8 |
| chronology | 6 | 75.7 | 358/473 | 78.3 | 70.4 | 80.7 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 70.2 | 2/25 | 81.7 | 57.4 | 75.5 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **82.2** | 82.4% | 85.7 | 83.5 | 79.6 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 17k | 24k | 18k |
| context tokens per cut, max | 32k | 20k | 32k | 31k |
| reduction ratio (compacted / replaced), mean | 12.7% | 10.9% | 15.1% | 11.6% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 23 (295k / 19k) | 38 (526k / 31k) | 26 (325k / 21k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 314k | 557k | 346k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /tmp/omv-code/t9-rep2k (dir) (holdout)

Total: **82.8**

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
| tokens | 6 | 68.2 | 1/14 | 83.2 | 69.2 | 44.7 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **82.8** | 75.2% | 81.7 | 71.7 | 77.4 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 21k | 16k | 21k | 27k |
| context tokens per cut, max | 32k | 22k | 26k | 32k |
| reduction ratio (compacted / replaced), mean | 13.1% | 10.3% | 13.0% | 17.4% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 16 (184k / 12k) | 16 (188k / 13k) | 12 (139k / 9.9k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 196k | 202k | 149k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

[0m[31mresults: /tmp/omv-code/abfull-base4-t9rep2k.json[0m
