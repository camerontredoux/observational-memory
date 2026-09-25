[0m[31m[A /tmp/omv-code/base4 (dir)] om-orchestration[0m
[0m[31m[B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] om-orchestration[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] om-v04[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] firstmate-11[0m
[0m[31m[B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] om-v04[0m
[0m[31m[B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] firstmate-11[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout firstmate-6[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout crew-uspa-4[0m
[0m[31m[A /tmp/omv-code/base4 (dir)] holdout crew-opie-4[0m
[0m[31m[B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] holdout firstmate-6[0m
[0m[31m[B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] holdout crew-uspa-4[0m
[0m[31m[B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)] holdout crew-opie-4[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] om-orchestration[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] om-v04[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] firstmate-11[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] holdout firstmate-6[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] holdout crew-uspa-4[0m
[0m[31m[A' /tmp/omv-code/base4 (dir)] holdout crew-opie-4[0m
# Against A /tmp/omv-code/base4 (dir): 78.1; holdout 83.4

| B | total | Δ | Δ om-orchestration / om-v04 / firstmate-11 | unique ↑ | unique ↓ | p | noise | verdict | efficiency | gates that moved the total | holdout Δ (informational) |
|---|---:|---:|---|---:|---:|---:|---|---|---|---|---:|
| B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir) | 80.7 | +2.5 | +1.5 / +3.8 / +2.3 | 43 | 20 | 0.0052 | A' -1.1 | B | same | rationale +0.7, multi-hop +0.7, approvals -0.5, lessons +0.5 | -0.3 (6↑ 9↓) |

# Compaction A/B

A: A /tmp/omv-code/base4 (dir)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)

A sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh
B sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | A | B | Δ | A passed | B passed | ↑ | ↓ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 47.3 | 54.1 | +6.8 | 98/207 | 112/207 | 21 | 7 |
| constraints | 6 | 100.0 | 96.2 | -3.8 | 106/106 | 102/106 |  | 4 |
| verbatim | 5 | 100.0 | 100.0 | 0 | 109/109 | 109/109 |  |  |
| corrections | 8 | 100.0 | 100.0 | 0 | 87/87 | 87/87 |  |  |
| reversals | 6 | 84.0 | 80.0 | -4.0 | 63/75 | 60/75 | 2 | 5 |
| approvals | 5 | 92.6 | 77.8 | -14.8 | 50/54 | 42/54 |  | 8 |
| asks | 5 | 100.0 | 100.0 | 0 | 74/74 | 74/74 |  |  |
| in-progress | 5 | 79.2 | 79.2 | 0 | 19/24 | 19/24 |  |  |
| handoff | 8 | 100.0 | 100.0 | 0 | 44/44 | 44/44 |  |  |
| files-edited | 5 | 97.8 | 97.8 | 0 | 45/46 | 45/46 |  |  |
| commits | 4 | 98.0 | 100.0 | +2.0 | 50/51 | 51/51 | 1 |  |
| failures | 6 | 86.4 | 86.4 | 0 | 19/22 | 19/22 |  |  |
| facts | 5 | 71.7 | 80.9 | +9.2 | 124/173 | 140/173 | 18 | 2 |
| decisions | 5 | 92.7 | 100.0 | +7.3 | 51/55 | 55/55 | 4 |  |
| lessons | 7 | 44.9 | 55.1 | +10.2 | 22/49 | 27/49 | 6 | 1 |
| file-state | 7 | 58.2 | 64.6 | +6.3 | 46/79 | 51/79 | 12 | 7 |
| multi-hop | 7 | 36.4 | 50.0 | +13.6 | 16/44 | 22/44 | 10 | 4 |
| rationale | 7 | 36.4 | 50.9 | +14.5 | 20/55 | 28/55 | 8 |  |
| chronology | 6 | 72.9 | 75.5 | +2.5 | 345/473 | 357/473 | 22 | 10 |
| recall | 5 | 84.6 | 84.6 | 0 | 55/65 | 55/65 |  |  |
| absent | 5 | 100.0 | 100.0 | 0 | 157/157 | 157/157 |  |  |
| tokens | 6 | 79.5 | 75.6 | -3.9 | 4/25 | 3/25 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 25/25 | 25/25 |  |  |
| **total** | | **78.1** | **80.7** | **+2.5** | 78.4% | 81.1% | **104** | **48** |

Per transcript: om-orchestration 82.3 → 83.9 (+1.5); om-v04 78.2 → 82.0 (+3.8); firstmate-11 75.4 → 77.8 (+2.3).
Flips: 104 up, 48 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 43 up, 20 down, sign test p=0.0052. Passed counts are over all samples.

Verdict: B is better: 2.5 weighted points, 3 of 3 transcripts agree, 43 unique items flip to B against 20.
efficiency: same (B vs A: mean tokens +6%, reduction ratio +6%, model tokens -6%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ -1.1, 65 up / 101 down (29 / 36 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 17k | 19k |
| context tokens per cut, max | 28k | 30k |
| reduction ratio (compacted / replaced), mean | 11.0% | 11.7% |
| Observer calls (tokens in / out) | 87 (1226k / 63k) | 87 (1147k / 70k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1290k | 1217k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

Worse in B (20 unique items):

- identifiers om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @1
- constraints om-orchestration/rule:worktree-only: ↓ at @2 @3 @4 @5
- chronology om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2: ↓ at @3 @4 @5
- reversals om-orchestration/sup:live-harness: ↓ at @3 @4 @5
- facts om-orchestration/exact:rescored-results: ↓ at @4 @5
- identifiers om-orchestration/branch:issue-11: ↓ at @5
- lessons om-orchestration/neg:tool-search: ↓ at @5
- chronology om-v04/path:hooks/prompts.ts: ↓ at @3 @4
- chronology om-v04/path:openai-codex/gpt-5.6-luna: ↓ at @3 @4 @6 @8
- approvals om-v04/scope:ctx-worktree: ↓ at @3 @4 @5 @6 @7 @8 @9
- identifiers om-v04/path:hooks/prompts.ts: ↓ at @4
- identifiers om-v04/path:openai-codex/gpt-5.6-luna: ↓ at @6
- identifiers om-v04/path:tests/fixtures/crewmate.local.ts: ↓ at @6
- identifiers om-v04/path:.claude/types/claude-code.d.ts: ↓ at @6
- chronology om-v04/path:.claude/types: ↓ at @6
- multi-hop om-v04/hop:151-messages: ↓ at @6 @7 @8 @9
- reversals om-v04/sup:subagent-observed: ↓ at @8 @9
- file-state firstmate-11/file-claude-json-key: ↓ at @5 @6 @7 @8 @9 @10 @11
- approvals firstmate-11/line 3147: ↓ at @8
- identifiers firstmate-11/path:data/opie-gorman-pdf-on-contract-signed/prod-dump/prod.dump: ↓ at @9

Better in B (43 unique items):

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
- identifiers om-v04/path:~/work/mods/observational-memory/.claude-plugin/plugin.json: ↑ at @7
- lessons om-v04/neg:vcc-install: ↑ at @7 @9
- multi-hop om-v04/hop:settle-error-fix: ↑ at @7 @8 @9
- chronology om-v04/order:parser-line-by-line: ↑ at @7 @8 @9
- identifiers om-v04/number:0.05: ↑ at @8
- file-state om-v04/file:parser-debug: ↑ at @8 @9
- decisions om-v04/merge-recall: ↑ at @9
- multi-hop om-v04/hop:made-up-answers: ↑ at @9
- rationale om-v04/why:skill-stub: ↑ at @9
- facts firstmate-11/tools: ↑ at @4 @5 @6 @7 @8 @9 @10 @11
- chronology firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @5 @6
- multi-hop firstmate-11/multi-watcher-5415: ↑ at @5 @6 @7 @8
- rationale firstmate-11/why-imports-not-codex: ↑ at @5 @6
- identifiers firstmate-11/path:~/work/firstmate/projects/oasis-pavers-and-pools-opie: ↑ at @6
- reversals firstmate-11/super-test-db: ↑ at @7 @9
- decisions firstmate-11/sbom-cause: ↑ at @9 @10 @11
- facts firstmate-11/exact-libheif-version: ↑ at @9 @10 @11
- rationale firstmate-11/why-date-backdate: ↑ at @9 @10 @11
- commits firstmate-11/pr:1425: ↑ at @11

## Holdout (mechanical gates only; not in the total)

A: A /tmp/omv-code/base4 (dir) (holdout)
B: B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir) (holdout)

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
| tokens | 6 | 74.3 | 71.3 | -3.0 | 2/14 | 1/14 |  |  |
| budget | 3 | 100.0 | 100.0 | 0 | 14/14 | 14/14 |  |  |
| **total** | | **83.4** | **83.1** | **-0.3** | 76.1% | 75.2% | **6** | **9** |

Per transcript: firstmate-6 81.4 → 82.1 (+0.7); crew-uspa-4 72.9 → 71.7 (-1.2); crew-opie-4 79.5 → 77.9 (-1.6).
Flips: 6 up, 9 down (item × cut, over 1 paired sample); by unique item (gate, id; net over its cuts): 5 up, 7 down, sign test p=0.77. Passed counts are over all samples.

Verdict: none (informational: one draw per arm cannot support one; use --samples N).
efficiency: better (B vs A: mean tokens +5%, reduction ratio +5%, model tokens -12%, critical-path calls per transcript 0.0; ±10%, or ±1 critical-path call per transcript, counts).

B's Observer/Reflector inputs differ from A's, so its replies are other model draws: part of Δ is sampling noise, and the real unit is one Observer draw per transcript. A vs A' (A's resample): Δ +0.8, 8 up / 3 down (6 / 3 unique items).

| efficiency | A | B |
|---|---:|---:|
| context tokens per cut, mean | 19k | 20k |
| context tokens per cut, max | 29k | 30k |
| reduction ratio (compacted / replaced), mean | 12.0% | 12.5% |
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

## B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir)

Total: **80.7**

sample 1: om-orchestration 23 calls, 0 fresh; om-v04 38 calls, 0 fresh; firstmate-11 26 calls, 0 fresh

| gate | weight | score | passed | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|---:|---:|
| identifiers | 10 | 54.1 | 112/207 | 58.2 | 58.3 | 42.9 |
| constraints | 6 | 96.2 | 102/106 | 92.2 | 100.0 | 100.0 |
| verbatim | 5 | 100.0 | 109/109 | 100.0 | 100.0 | 100.0 |
| corrections | 8 | 100.0 | 87/87 | 100.0 | 100.0 | 100.0 |
| reversals | 6 | 80.0 | 60/75 | 78.6 | 38.9 | 97.7 |
| approvals | 5 | 77.8 | 42/54 | 100.0 | 71.8 | 83.3 |
| asks | 5 | 100.0 | 74/74 | 100.0 | 100.0 | 100.0 |
| in-progress | 5 | 79.2 | 19/24 | 71.4 | 91.7 | 60.0 |
| handoff | 8 | 100.0 | 44/44 | 100.0 | 100.0 | 100.0 |
| files-edited | 5 | 97.8 | 45/46 | 92.9 | 100.0 | 100.0 |
| commits | 4 | 100.0 | 51/51 | – | – | 100.0 |
| failures | 6 | 86.4 | 19/22 | 100.0 | 100.0 | 78.6 |
| facts | 5 | 80.9 | 140/173 | 92.0 | 76.8 | 76.1 |
| decisions | 5 | 100.0 | 55/55 | 100.0 | 100.0 | 100.0 |
| lessons | 7 | 55.1 | 27/49 | 83.3 | 73.9 | 25.0 |
| file-state | 7 | 64.6 | 51/79 | 76.5 | 100.0 | 41.5 |
| multi-hop | 7 | 50.0 | 22/44 | 55.6 | 42.1 | 56.3 |
| rationale | 7 | 50.9 | 28/55 | 25.0 | 76.5 | 46.2 |
| chronology | 6 | 75.5 | 357/473 | 78.3 | 70.4 | 80.1 |
| recall | 5 | 84.6 | 55/65 | 100.0 | 70.8 | 89.7 |
| absent | 5 | 100.0 | 157/157 | 100.0 | 100.0 | 100.0 |
| tokens | 6 | 75.6 | 3/25 | 88.1 | 63.2 | 80.0 |
| budget | 3 | 100.0 | 25/25 | 100.0 | 100.0 | 100.0 |
| **total** | | **80.7** | 81.1% | 83.9 | 82.0 | 77.8 |

Efficiency (not in the total):

| metric | all | om-orchestration | om-v04 | firstmate-11 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 19k | 15k | 22k | 17k |
| context tokens per cut, max | 30k | 18k | 30k | 29k |
| reduction ratio (compacted / replaced), mean | 11.7% | 9.7% | 13.9% | 10.7% |
| Observer calls (tokens in / out) | 87 (1147k / 70k) | 23 (295k / 19k) | 38 (526k / 31k) | 26 (325k / 21k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 1217k | 314k | 557k | 346k |
| critical-path calls (tokens in / out) | 2 (29k / 1.6k) | 0 (0 / 0) | 0 (0 / 0) | 2 (29k / 1.6k) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

## B /home/cameron/work/mods/observational-memory/.scratch/omv/target9-b4 (dir) (holdout)

Total: **83.1**

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
| tokens | 6 | 71.3 | 1/14 | 87.8 | 69.2 | 48.4 |
| budget | 3 | 100.0 | 14/14 | 100.0 | 100.0 | 100.0 |
| **total** | | **83.1** | 75.2% | 82.1 | 71.7 | 77.9 |

Efficiency (not in the total):

| metric | all | firstmate-6 | crew-uspa-4 | crew-opie-4 |
|---|---:|---:|---:|---:|
| context tokens per cut, mean | 20k | 15k | 21k | 26k |
| context tokens per cut, max | 30k | 20k | 26k | 30k |
| reduction ratio (compacted / replaced), mean | 12.5% | 9.5% | 13.0% | 16.7% |
| Observer calls (tokens in / out) | 44 (512k / 35k) | 16 (184k / 12k) | 16 (188k / 13k) | 12 (139k / 9.9k) |
| Reflector calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |
| model tokens in + out | 547k | 196k | 202k | 149k |
| critical-path calls (tokens in / out) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) | 0 (0 / 0) |

Critical path: the Observer/Reflector calls started inside register.ts's session.compact hook, which compaction waits for (calls.json atCompaction); a background call that only finishes during compaction counts as background. Ratio: against the source session's preTokens at the cut. Latency is virtual: calls and tokens are measured, time is not (the replay's clock is simulated).

[0m[31mresults: /tmp/omv-code/abfull-base4-t9.json[0m
