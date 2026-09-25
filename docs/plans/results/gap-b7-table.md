
## main: 2123 items at 11 cuts, total 78.3, 21.7 points missing

| gate (w) | 1 not in any chunk | 2 Observer compression | 3 lost after observation | 4 in context, grader misses | 5 other | size | total lost |
|---|---:|---:|---:|---:|---:|---:|---:|
| purpose (5) | – | 1 / 0.15 | – | 23 / 3.40 | – | – | 3.55 |
| identifiers (10) | 3 / 0.10 | 75 / 2.57 | 2 / 0.07 | 12 / 0.41 | – | – | 3.15 |
| rationale (7) | – | 26 / 2.35 | – | 1 / 0.09 | – | – | 2.44 |
| multi-hop (7) | – | 21 / 2.37 | – | – | – | – | 2.37 |
| lessons (7) | – | 20 / 2.03 | – | – | – | – | 2.03 |
| file-state (7) | – | 28 / 1.76 | – | – | – | – | 1.76 |
| tokens (6) | – | – | – | – | – | 22 / 1.13 | 1.13 |
| chronology (6) | – | 87 / 0.78 | – | 29 / 0.26 | – | – | 1.04 |
| reversals (6) | – | 9 / 0.51 | – | 5 / 0.28 | – | – | 0.79 |
| in-progress (5) | – | 2 / 0.30 | – | 3 / 0.44 | – | – | 0.74 |
| approvals (5) | – | 10 / 0.66 | – | – | – | – | 0.66 |
| facts (5) | 5 / 0.10 | 24 / 0.49 | – | 2 / 0.04 | – | – | 0.64 |
| failures (6) | 3 / 0.58 | – | – | – | – | – | 0.58 |
| recall (5) | – | – | – | – | 10 / 0.55 | – | 0.55 |
| constraints (6) | – | 4 / 0.16 | – | – | – | – | 0.16 |
| files-edited (5) | – | 1 / 0.08 | – | – | – | – | 0.08 |
| **all** | **11 / 0.79** | **308 / 14.19** | **2 / 0.07** | **75 / 4.93** | **10 / 0.55** | **22 / 1.13** | **21.66** |

Budget fit scaling (the total times the budget gate's mean fit 1.000) costs a further 0.00 points on top of the table.

Cells: failed items / weighted points lost.

Sub-causes:

| cause | sub-cause | items | points |
|---|---|---:|---:|
| 1 | not in the source as worded | 5 | 0.65 |
| 1 | never chunked | 5 | 0.10 |
| 1 | chunk cut it | 1 | 0.03 |
| 2 | Observer compression | 308 | 14.19 |
| 3 | tail masking | 1 | 0.03 |
| 3 | continuation superseded | 1 | 0.03 |
| 4 | all tokens held (order/line rule) | 27 | 3.43 |
| 4 | in prose (wording/grounding/order) | 40 | 1.34 |
| 4 | not prose (non-genuine kept row or bare list) | 8 | 0.15 |
| 5 | no needle (recall) | 10 | 0.55 |

Examples (3 per cell, most points first):

**purpose × 4 in context, grader misses** (23 items, 3.40 points)
- @1 `om-orchestration/purpose:agent-teams-tickets` [all tokens held (order/line rule)] needle ``
- @1 `om-v04/purpose:om-plugin-orchestrator` [all tokens held (order/line rule)] needle ``
- @3 `firstmate-11/purpose:firstmate-crew` [all tokens held (order/line rule)] needle ``

**identifiers × 2 Observer compression** (75 items, 2.57 points)
- @1 `om-orchestration/path:~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/subagents/workflows/wf_d73f83f3-8e1` [Observer compression] needle `~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a` — line 674: Transcript dir: /home/cameron/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/subagents/workflows/wf_d73f83f3-8e1
- @2 `om-orchestration/path:~/.claude/settings.json` [Observer compression] needle `~/.claude/settings.json` — line 1390: To re-run with edited post-processing: Workflow({scriptPath: '/home/cameron/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/workflows/scripts/ticket-wf_3c818956-577.js', resumeFr
- @2 `om-orchestration/path:hooks/hooks.json` [Observer compression] needle `hooks/hooks.json` — line 1399: tests/eval/recall-plugin/hooks/hooks.json          \|   6 +

**multi-hop × 2 Observer compression** (21 items, 2.37 points)
- @3 `om-orchestration/hop:usage` [Observer compression] needle `Max subscription | Max plan | Claude Max | subscription billing | the subscripti` — line 2217: **Your weekly usage:** these sessions use your Max subscription, not an API key. This session uses it too. The benchmark pane showed 40% of the weekly limit already used, and about 150 Sonnet sessions add a lot to that. If the li
- @5 `om-orchestration/hop:first-recall` [Observer compression] needle `0 of 127 | 0/127 | none of the 127 | none of 127 | no run called | none called` — line 3870: Bash({"command":"cd /home/cameron/work/mods/observational-memory; cat > /tmp/issue10.md <<'EOF'\n## Why\n\nThe v1.0.0 benchmark (`docs/bench/2026-09-24-v1.0.0.md`) compacted early: every compaction was a manual `/compact` at 35k–
- @3 `om-v04/hop:brief-pinned` [Observer compression] needle `3.7k | 3,700 | 3700 | 3.7 k | 3.7K` — line 776: To re-run with edited post-processing: Workflow({scriptPath: '/home/cameron/.claude/projects/-home-cameron-work-mods/5fdeae60-01fd-46f7-910e-745a4011321c/workflows/scripts/om-v043-build-wf_754a728c-352.js', resumeFromRunId: 'wf_75

**rationale × 2 Observer compression** (26 items, 2.35 points)
- @2 `om-orchestration/why:opus-round` [Observer compression] needle `1M main | 1M window | 1M-token window | 1M-window | main session's window | main` — line 1133: \| #2 compaction hardening \| **Merged.** The Opus round found a real bug: a subagent's budget used the main session's 1M window, so the size check never applied to subagents. Fixed, and tests were added. \|
- @3 `om-orchestration/why:cut-builtin-recall-new` [Observer compression] needle `$51 | 51 dollars | $51.00` — line 2339: **What I cut:** built-in+recall with the new plugin. Adding it would take the total to about $51, over your cap. It would only show whether ticket #4's recall changes help when built-in compaction is used. The comparison you aske
- @3 `om-orchestration/why:pin-new` [Observer compression] needle `mid-run | mid run | during a run | while a run | in the middle of a run` — line 2516: To find out, I started one probe run of the new plugin on `completed-work`. It runs from a pinned copy of the current main, so later merges can't reload it mid-run. Its result goes to the trial results file, not the real benchmar

**lessons × 2 Observer compression** (20 items, 2.03 points)
- @5 `om-orchestration/neg:tool-search` [Observer compression] needle `ToolSearch` — line 4716: - **Recall is always in view.** That's the ToolSearch problem #11 is fixing now.
- @7 `om-v04/neg:close-tag-prompt` [Observer compression] needle `4 times in 10` — line 3461: - **Why not a prompt fix:** telling Luna to always close the block failed 4 times in 10, no better than before.
- @8 `om-v04/neg:subagent-veto` [Observer compression] needle `300k | 300,000 | 300 k | 300K` — line 4153: **There is a workaround inside OM.** OM's compaction hook can veto any compaction by returning `{ skip }`, and it knows when the one compacting is a subagent. So OM could skip a subagent's compactions until it reaches, say, 300k.

**file-state × 2 Observer compression** (28 items, 1.76 points)
- @2 `om-orchestration/file:testing-guide` [Observer compression] needle `Decisions that need a human` — line 1133: - **A subagent edited your testing guide.** The #4 fixer rewrote the "Decisions that need a human" section of `~/.agents/docs/testing-conventions.md` again. Each point now explains its reason, which fits what you asked for, so I 
- @4 `firstmate-11/file-gorman-pdf-script` [Observer compression] needle `filled-pdfs` — line 1323: 3. Run `data/opie-gorman-pdf-on-contract-signed/get-gorman-pdf.sh`. It saves the filled PDF into that folder's `filled-pdfs/`.
- @5 `firstmate-11/file-learnings-16gb` [Observer compression] needle `16GB` — line 1587: - **Added:** never run a whole test suite at once in any repo, because the 16GB server swaps. This was an Opie-only note before.

**chronology × 2 Observer compression** (87 items, 0.78 points)
- @3 `om-orchestration/path:~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/subagents/workflows/wf_d73f83f3-8e1` [Observer compression] needle `~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a` — line 1018: Bash({"command":"git add hooks/recall.ts tests/eval/legacy-recall.ts tests/recall.test.ts scripts/recall-cli.ts && git commit -q -m \"tests/eval: move v0.4.9 legacyRecall out of the production recall module\n\nFrozen with copies 
- @3 `om-orchestration/path:camerontredoux/observational-memory` [Observer compression] needle `camerontredoux/observational-memory` — line 1209: https://github.com/camerontredoux/observational-memory/issues/1
- @3 `om-orchestration/path:~/.agents/docs/documentation-style.md` [Observer compression] needle `~/.agents/docs/documentation-style.md` — line 59: Bash({"command":"cat /home/cameron/.agents/docs/documentation-style.md; echo ----; fdfind -H -E .git -t f \| head -100; echo ----; cat TODO.md tsconfig.json .gitignore; cat .claude-plugin/*; ls .claude; wc -l hooks/* scripts/* test

**approvals × 2 Observer compression** (10 items, 0.66 points)
- @1 `om-v04/scope:tmp-sessions` [Observer compression] needle `test-1` — line 159: - **Test-1 and test-2 sessions in `~/.claude/projects/-home-cameron-work/`:** these still need your OK. Test 2's four main lines are the starting points for the other variants' rows in the comparison, so I'd keep them until the v0
- @4 `om-v04/scope:ctx-worktree` [Observer compression] needle `observational-memory-ctx` — line 2308: /home/cameron/work/mods/observational-memory-ctx  a73088a [experiment/context-observer]

**failures × 1 not in any chunk** (3 items, 0.58 points)
- @4 `firstmate-11/line 1499` [not in the source as worded] needle `ls: cannot access 'config/stow-pass-horizon': no such file o`

**recall × 5 other** (10 items, 0.55 points)
- @3 `om-v04/haiku-timing` [no needle (recall)] needle ``
- @9 `firstmate-11/salesman` [no needle (recall)] needle ``

**reversals × 2 Observer compression** (9 items, 0.51 points)
- @6 `om-v04/sup:skill-stub-wording` [Observer compression] needle `/stub[^\n]{0,120}invoke (it|the skill) again|invoke (it|the s/` — line 3273: **The stub wording changed from the plan.** It turns out `om_recall` can't return a skill's full text, only 400-character excerpts. So the stub tells firstmate to invoke the skill again to reread it, and uses `om_recall` only to 
- @7 `om-v04/sup:stall-cause` [Observer compression] needle `/(switch\w*|changed) (plugin )?versions|version switch|loaded/` — line 3335: 1. **The long compaction.** OM keeps notes on the conversation as it goes, so compaction is instant. In firstmate, an older OM version filed a few notes in the wrong order. The new version then saw notes that didn't match, threw 
- @8 `om-v04/sup:subagent-observed` [Observer compression] needle `/subagents? (now )?(take notes|are observed|observe)[^.\n]{0,/` — line 4743: You were right about the "Observed x messages" lines. Since 0.4.10, subagents take notes in the background, and those lines were subagent work that didn't say so.

**facts × 2 Observer compression** (24 items, 0.49 points)
- @4 `om-orchestration/sup:om-invalid` [Observer compression] needle `/7 of 42/` — line 3738: Bash({"command":"cd /home/cameron/work/mods/observational-memory; mkdir -p docs/bench; cp /tmp/om-bench/results-rescored.jsonl docs/bench/2026-09-24-v1.0.0.jsonl; cp /tmp/om-bench/report.md docs/bench/2026-09-24-v1.0.0.md; cat > 
- @5 `om-orchestration/exact:live-flags` [Observer compression] needle `--plugin-root` — line 4547: scripts/bench-live.ts:160:  const pluginRoot = resolve(str(o, 'plugin-root') ?? (version === 'new' ? main : version === 'old' ? `${main}/.worktrees/bench-old` : fail('--plugin-root: needed for a version other than old or new')))
- @5 `om-orchestration/exact:rescored-results` [Observer compression] needle `/tmp/om-bench/results-rescored.jsonl` — line 3738: Bash({"command":"cd /home/cameron/work/mods/observational-memory; mkdir -p docs/bench; cp /tmp/om-bench/results-rescored.jsonl docs/bench/2026-09-24-v1.0.0.jsonl; cp /tmp/om-bench/report.md docs/bench/2026-09-24-v1.0.0.md; cat > 

**in-progress × 4 in context, grader misses** (3 items, 0.44 points)
- @2 `om-v04//tmp/om-observer/replay.ts` [in prose (wording/grounding/order)] needle `/tmp/om-observer/replay.ts` — Read({"file_path":"/tmp/om-observer/replay.ts","offset":40,"limit":23})
- @1 `firstmate-11/~/.claude/projects/-home-cameron-work-firstmate/b776c4b4-a24d-4936-9268-d3f72c24b0c9/tool-results/hook-04d71cd2-f051-427f-91a2-8713c96d944f-stdout.txt` [in prose (wording/grounding/order)] needle `~/.claude/projects/-home-cameron-work-firstmate/b776c4b4-a24d-4936-9268-d3f72c24` — Read({"file_path":"~/.claude/projects/-home-cameron-work-firstmate/b776c4b4-a24d-4936-9268-d3f72c24b0c9/tool-results/hook-04d71cd2-f051-427f-91a2-8713c96d944f-stdout.txt","offset":334,"limit":360})
- @3 `firstmate-11/~/work/firstmate/AGENTS.md` [in prose (wording/grounding/order)] needle `~/work/firstmate/AGENTS.md` — * 🟡 14:21 Assistant read `~/work/firstmate/AGENTS.md`; it defines the firstmate role, including addressing the user as “captain.”

**identifiers × 4 in context, grader misses** (12 items, 0.41 points)
- @1 `om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2` [in prose (wording/grounding/order)] needle `~/work/mods/observational-memory/.worktrees/issue-2` — * 🟡 23:22 Ticket #2 completed its implement/review/fix workflow in `.worktrees/issue-2`, with changes in `hooks/register.ts`, `tests/register.test.ts`, and `TODO.md`; its implementation commit is `f3c2f4f`.
- @5 `om-orchestration/branch:issue-11` [in prose (wording/grounding/order)] needle `issue-11` — * 🟡 13:37 Assistant launched workflow `wf_a0344717-f98` to implement issue #11 in `.worktrees/issue-11`, review it with separate spec and standards agents, and fix findings.
- @1 `om-v04/const:USER_MESSAGES` [in prose (wording/grounding/order)] needle `USER_MESSAGES` — * 🟡 12:19 Assistant proposed building OM v0.4.2 with verbatim user messages, 🔴 priority restrictions, built-in-style optional-next-step wording, wrapper wording, and `om_recall` resume fixes.

**in-progress × 2 Observer compression** (2 items, 0.30 points)
- @1 `om-orchestration/~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/tool-results/btxquu5it.txt` [Observer compression] needle `~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a` — line 256: Read({"file_path":"/home/cameron/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/tool-results/btxquu5it.txt"})
- @4 `om-orchestration/~/.agents/docs/documentation-style.md` [Observer compression] needle `~/.agents/docs/documentation-style.md` — line 3721: Read({"file_path":"/home/cameron/.agents/docs/documentation-style.md"})

**reversals × 4 in context, grader misses** (5 items, 0.28 points)
- @3 `om-orchestration/sup:live-harness` [in prose (wording/grounding/order)] needle `/herdr agent start|herdr-driven|sessions in (another|a) herdr/` — * 🔴 2026-09-23 23:44 User: "What if you just spawned actual claude sessions in another herdr pane to test?"
- @8 `om-v04/sup:recall-cap` [in prose (wording/grounding/order)] needle `/16,000 char|16k char|16 ?KB/` — * 🟡 16:08 Assistant told the user the unexplained context growth was still under investigation; a tally showed hook output was only about 16k characters, not the previously suspected 56k.
- @5 `firstmate-11/line-items` [in prose (wording/grounding/order)] needle `/001\.41/` — * 🔴 2026-09-23 14:47 User: "Also look into production for Opie. Client is saying he saved 2 new line items, 001.42 and 001.43. Only 001.41 is saved, the other two are gone. Here is his message:\n\nThey disappeared. I just created three line

**chronology × 4 in context, grader misses** (29 items, 0.26 points)
- @3 `om-orchestration/path:~/work/mods/observational-memory/.worktrees/issue-2` [in prose (wording/grounding/order)] needle `~/work/mods/observational-memory/.worktrees/issue-2` — * 🟡 23:22 Ticket #2 completed its implement/review/fix workflow in `.worktrees/issue-2`, with changes in `hooks/register.ts`, `tests/register.test.ts`, and `TODO.md`; its implementation commit is `f3c2f4f`.
- @4 `om-orchestration/path:camerontredoux/observational-memory` [in prose (wording/grounding/order)] needle `camerontredoux/observational-memory` — `camerontredoux/observational-memory`.
- @4 `om-orchestration/path:docs/agents/issue-tracker.md` [in prose (wording/grounding/order)] needle `docs/agents/issue-tracker.md` — Bash({"command":"cd ~/work/mods/observational-memory; cat docs/agents/issue-tracker.md docs/agents/triage-labels.md \| head -60; sed -n 60,140p scripts/bench-live.ts \| rg -n \"ceiling\|settle\|compact\" "})

**constraints × 2 Observer compression** (4 items, 0.16 points)
- @2 `om-orchestration/rule:worktree-only` [Observer compression] needle `outside their worktree` — line 1133: - **A subagent edited your testing guide.** The #4 fixer rewrote the "Decisions that need a human" section of `~/.agents/docs/testing-conventions.md` again. Each point now explains its reason, which fits what you asked for, so I 

**purpose × 2 Observer compression** (1 items, 0.15 points)
- @2 `firstmate-11/purpose:firstmate-crew` [Observer compression] needle `crewmate | crewmates` — line 690: 3171866       18:46 claude --dangerously-skip-permissions --model opus --effort high ⁣FIRSTMATE_OP: v1 launch-brief: You are a crewmate: an autonomous worker agent managed by firstmate. Work on your own; do not wait for a human.  

**identifiers × 1 not in any chunk** (3 items, 0.10 points)
- @4 `om-v04/commit:b776c4b` [not in the source as worded] needle `b776c4b`
- @4 `om-v04/commit:5fdeae6` [not in the source as worded] needle `5fdeae6`
- @3 `firstmate-11/path:config/stow-pass-horizon` [chunk cut it] needle `config/stow-pass-horizon` — line 1259 (user tool result): 81	config/stow-pass-horizon  optional presence flag opting this home in to /stow's default-off pass-count decay horizon; LOCAL, gitignored, and not inherited; see docs/configuration.md "Stow pass horizon"

**facts × 1 not in any chunk** (5 items, 0.10 points)
- @5 `om-v04/str:retrying-rows` [never chunked] needle `retrying rows` — line 2586 (assistant): On screen you'll only see a failure if the retry fails too. The debug log records every retry as `retrying rows X-Y at compaction once (reason)`, and the stats count retries as extra observer calls during compaction.

**rationale × 4 in context, grader misses** (1 items, 0.09 points)
- @6 `firstmate-11/why-sign-permission` [not prose (non-genuine kept row or bare list)] needle `contract-sign-gate.ts` — apps/web/src/lib/contract-sign-gate.ts

**files-edited × 2 Observer compression** (1 items, 0.08 points)
- @2 `om-orchestration/~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/workflows/scripts/ticket-wf_3c818956-577.js` [Observer compression] needle `~/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a` — line 1390: To re-run with edited post-processing: Workflow({scriptPath: '/home/cameron/.claude/projects/-home-cameron-work-mods-observational-memory/28895069-a753-4a74-88b2-e0d5d4628d43/workflows/scripts/ticket-wf_3c818956-577.js', resumeFr

**identifiers × 3 lost after observation** (2 items, 0.07 points)
- @2 `om-orchestration/path:/tmp/om-bench/results.jsonl` [tail masking] needle `/tmp/om-bench/results.jsonl` — line 1407 (user tool result): // orchestrator creates; --plugin-root names any other. The results default to /tmp/om-bench/results.jsonl.
- @9 `om-v04/number:15.6` [continuation superseded] needle `15.6`

**facts × 4 in context, grader misses** (2 items, 0.04 points)
- @10 `firstmate-11/exact-db-url-var` [in prose (wording/grounding/order)] needle `read_only` — * 🔴 2026-09-23 14:40 User: "okay i want the gorman worker to use our prod credentials to clone prod so i get a real working state to work with. then ill test. just read only, it can read from .env.production and clone locally. will need to 

**identifiers × 5 other** (0 items, 0.00 points)

**constraints × 1 not in any chunk** (0 items, 0.00 points)

**constraints × 3 lost after observation** (0 items, 0.00 points)

**constraints × 4 in context, grader misses** (0 items, 0.00 points)

**constraints × 5 other** (0 items, 0.00 points)

**verbatim × 1 not in any chunk** (0 items, 0.00 points)

**verbatim × 2 Observer compression** (0 items, 0.00 points)

**verbatim × 3 lost after observation** (0 items, 0.00 points)

**verbatim × 4 in context, grader misses** (0 items, 0.00 points)

**verbatim × 5 other** (0 items, 0.00 points)

**facts × 3 lost after observation** (0 items, 0.00 points)

**facts × 5 other** (0 items, 0.00 points)

**handoff × 1 not in any chunk** (0 items, 0.00 points)

**handoff × 2 Observer compression** (0 items, 0.00 points)

**handoff × 3 lost after observation** (0 items, 0.00 points)

**handoff × 4 in context, grader misses** (0 items, 0.00 points)

**handoff × 5 other** (0 items, 0.00 points)

**corrections × 1 not in any chunk** (0 items, 0.00 points)

**corrections × 2 Observer compression** (0 items, 0.00 points)

**corrections × 3 lost after observation** (0 items, 0.00 points)

**corrections × 4 in context, grader misses** (0 items, 0.00 points)

**corrections × 5 other** (0 items, 0.00 points)

**approvals × 1 not in any chunk** (0 items, 0.00 points)

**approvals × 3 lost after observation** (0 items, 0.00 points)

**approvals × 4 in context, grader misses** (0 items, 0.00 points)

**approvals × 5 other** (0 items, 0.00 points)

**asks × 1 not in any chunk** (0 items, 0.00 points)

**asks × 2 Observer compression** (0 items, 0.00 points)

**asks × 3 lost after observation** (0 items, 0.00 points)

**asks × 4 in context, grader misses** (0 items, 0.00 points)

**asks × 5 other** (0 items, 0.00 points)

**in-progress × 1 not in any chunk** (0 items, 0.00 points)

**in-progress × 3 lost after observation** (0 items, 0.00 points)

**in-progress × 5 other** (0 items, 0.00 points)

**files-edited × 1 not in any chunk** (0 items, 0.00 points)

**files-edited × 3 lost after observation** (0 items, 0.00 points)

**files-edited × 4 in context, grader misses** (0 items, 0.00 points)

**files-edited × 5 other** (0 items, 0.00 points)

**absent × 1 not in any chunk** (0 items, 0.00 points)

**absent × 2 Observer compression** (0 items, 0.00 points)

**absent × 3 lost after observation** (0 items, 0.00 points)

**absent × 4 in context, grader misses** (0 items, 0.00 points)

**absent × 5 other** (0 items, 0.00 points)

**chronology × 1 not in any chunk** (0 items, 0.00 points)

**chronology × 3 lost after observation** (0 items, 0.00 points)

**chronology × 5 other** (0 items, 0.00 points)

**decisions × 1 not in any chunk** (0 items, 0.00 points)

**decisions × 2 Observer compression** (0 items, 0.00 points)

**decisions × 3 lost after observation** (0 items, 0.00 points)

**decisions × 4 in context, grader misses** (0 items, 0.00 points)

**decisions × 5 other** (0 items, 0.00 points)

**purpose × 1 not in any chunk** (0 items, 0.00 points)

**purpose × 3 lost after observation** (0 items, 0.00 points)

**purpose × 5 other** (0 items, 0.00 points)

**file-state × 1 not in any chunk** (0 items, 0.00 points)

**file-state × 3 lost after observation** (0 items, 0.00 points)

**file-state × 4 in context, grader misses** (0 items, 0.00 points)

**file-state × 5 other** (0 items, 0.00 points)

**rationale × 1 not in any chunk** (0 items, 0.00 points)

**rationale × 3 lost after observation** (0 items, 0.00 points)

**rationale × 5 other** (0 items, 0.00 points)

**reversals × 1 not in any chunk** (0 items, 0.00 points)

**reversals × 3 lost after observation** (0 items, 0.00 points)

**reversals × 5 other** (0 items, 0.00 points)

**recall × 1 not in any chunk** (0 items, 0.00 points)

**recall × 2 Observer compression** (0 items, 0.00 points)

**recall × 3 lost after observation** (0 items, 0.00 points)

**recall × 4 in context, grader misses** (0 items, 0.00 points)

**tokens × 1 not in any chunk** (0 items, 0.00 points)

**tokens × 2 Observer compression** (0 items, 0.00 points)

**tokens × 3 lost after observation** (0 items, 0.00 points)

**tokens × 4 in context, grader misses** (0 items, 0.00 points)

**tokens × 5 other** (0 items, 0.00 points)

**budget × 1 not in any chunk** (0 items, 0.00 points)

**budget × 2 Observer compression** (0 items, 0.00 points)

**budget × 3 lost after observation** (0 items, 0.00 points)

**budget × 4 in context, grader misses** (0 items, 0.00 points)

**budget × 5 other** (0 items, 0.00 points)

**failures × 2 Observer compression** (0 items, 0.00 points)

**failures × 3 lost after observation** (0 items, 0.00 points)

**failures × 4 in context, grader misses** (0 items, 0.00 points)

**failures × 5 other** (0 items, 0.00 points)

**multi-hop × 1 not in any chunk** (0 items, 0.00 points)

**multi-hop × 3 lost after observation** (0 items, 0.00 points)

**multi-hop × 4 in context, grader misses** (0 items, 0.00 points)

**multi-hop × 5 other** (0 items, 0.00 points)

**lessons × 1 not in any chunk** (0 items, 0.00 points)

**lessons × 3 lost after observation** (0 items, 0.00 points)

**lessons × 4 in context, grader misses** (0 items, 0.00 points)

**lessons × 5 other** (0 items, 0.00 points)

**commits × 1 not in any chunk** (0 items, 0.00 points)

**commits × 2 Observer compression** (0 items, 0.00 points)

**commits × 3 lost after observation** (0 items, 0.00 points)

**commits × 4 in context, grader misses** (0 items, 0.00 points)

**commits × 5 other** (0 items, 0.00 points)


## long: 1119 items at 4 cuts (20, 40, 60, 80), total 62.0, 38.0 points missing

| gate (w) | 1 not in any chunk | 2 Observer compression | 3 lost after observation | 4 in context, grader misses | 5 other | size | total lost |
|---|---:|---:|---:|---:|---:|---:|---:|
| tokens (6) | – | – | – | – | – | 4 / 4.80 | 4.80 |
| identifiers (10) | 1 / 0.15 | 13 / 1.97 | 5 / 0.76 | 7 / 1.06 | – | – | 3.94 |
| decisions (5) | – | 32 / 1.52 | 35 / 1.66 | – | – | – | 3.17 |
| reversals (6) | – | 15 / 1.39 | 14 / 1.29 | 4 / 0.37 | – | – | 3.05 |
| chronology (6) | – | 32 / 1.31 | 38 / 1.56 | 2 / 0.08 | – | – | 2.95 |
| failures (6) | – | 1 / 2.73 | – | – | – | – | 2.73 |
| facts (5) | – | 79 / 1.36 | 75 / 1.29 | 2 / 0.03 | – | – | 2.69 |
| approvals (5) | – | 4 / 1.07 | 3 / 0.80 | – | – | – | 1.87 |
| commits (4) | 2 / 0.13 | – | 2 / 0.13 | 4 / 0.27 | – | – | 0.54 |
| budget (3) | – | – | – | – | – | 2 / 0.43 | 0.43 |
| constraints (6) | – | 3 / 0.21 | – | – | – | – | 0.21 |
| corrections (8) | 1 / 0.05 | 1 / 0.05 | – | – | – | – | 0.10 |
| absent (5) | – | – | – | – | 1 / 0.05 | – | 0.05 |
| **all** | **4 / 0.33** | **180 / 11.60** | **172 / 7.50** | **19 / 1.82** | **1 / 0.05** | **6 / 5.22** | **26.52** |

Budget fit scaling (the total times the budget gate's mean fit 0.844) costs a further 11.45 points on top of the table.

Cells: failed items / weighted points lost.

Sub-causes:

| cause | sub-cause | items | points |
|---|---|---:|---:|
| 1 | not in the source as worded | 3 | 0.18 |
| 1 | only after the cut | 1 | 0.15 |
| 2 | Observer compression | 180 | 11.60 |
| 3 | Reflector | 166 | 7.19 |
| 3 | continuation superseded | 6 | 0.31 |
| 4 | in prose (wording/grounding/order) | 15 | 1.70 |
| 4 | not prose (non-genuine kept row or bare list) | 4 | 0.12 |
| 5 | no needle (absent) | 1 | 0.05 |

Examples (3 per cell, most points first):

**failures × 2 Observer compression** (1 items, 2.73 points)
- @20 `long/line 8951` [Observer compression] needle `ls: cannot access '../../../../src/components/reference-data` — line 8951: ls: cannot access '../../../../src/components/reference-data/communications/*.stories.tsx': No such file or directory

**identifiers × 2 Observer compression** (13 items, 1.97 points)
- @20 `long/path:~/components/ui/combobox` [Observer compression] needle `~/components/ui/combobox` — line 7452: - **Q9 (settings UI)** summed to 3.5/16. Seven answers confidently said the picker used `MultiCombobox`. The transcript shows the single-select `Combobox` from `~/components/ui/combobox` (line 1855), so those were flagged. Most a
- @20 `long/path:docs/guides/test-infrastructure.md` [Observer compression] needle `docs/guides/test-infrastructure.md` — line 9561: Bash({"command":"cd /home/cameron/.treehouse/oasis-pavers-and-pools-opie-a804cf/3/oasis-pavers-and-pools-opie; sed -n 80,200p docs/guides/test-infrastructure.md \| rg -n -i \"database\|TEST_DATABASE\|migrat\" ; head -40 scripts/d
- @40 `long/path:/tmp/om-bench/jobs-` [Observer compression] needle `/tmp/om-bench/jobs-` — line 22694: Bash({"command":"cat /tmp/om-bench/batch.sh; ls /tmp/om-bench/jobs-* 2>/dev/null \| head -3; head -2 /tmp/om-bench/jobs-NA.txt 2>/dev/null"})

**decisions × 3 lost after observation** (35 items, 1.66 points)
- @20 `long/om-v04-thinking-low` [Reflector] needle `--thinking low` — * 🟡 2026-09-12 16:08 Assistant inspected `hooks/register.ts`: OM invokes `pi -p --model openai-codex/gpt-5.6-luna --thinking low` with isolation flags, working directory `/tmp`, and no tools, extensions, skills, context files, prompt templa
- @20 `long/om-v04-neg:c029150-dropped` [Reflector] needle `c029150` — * 🟡 2026-09-12 15:46 Assistant said commit `c029150` (newest-chunk-only current-task merge) would be omitted because 2/7 chunks returned no task and goal-level tasks make the existing fallback preferable; v0.4.3 and pin-brief remained in pr
- @20 `long/om-v04-neg:vcc-install` [Reflector] needle `/recall | recall command | recall slash command` — * 🟡 2026-09-12 19:15 Assistant found that official VCC is a post-compaction recall/view compiler, not a compaction replacement: it creates numbered full transcripts and shortened outlines with tool-call line pointers, and its `/recall` skil

**chronology × 3 lost after observation** (38 items, 1.56 points)
- @20 `long/path:.claude/types` [Reflector] needle `.claude/types` — * 🟡 2026-09-12 15:55 Tool output from `.claude/types/claude-code.d.ts` confirmed `precompute` results are retained for a later compaction only if the conversation still leads, and that `session.compact` receives the context messages. (sourc
- @20 `long/uuid:c88abd43-9e84-435f-9568-5a04d505bb9e` [Reflector] needle `c88abd43-9e84-435f-9568-5a04d505bb9e` — * 🟡 2026-09-10 04:53 Assistant listed the repository’s `mods/` tree, which contains `README.md`, `agents-md`, `diff`, `sec-default`, `telemetry`, `tsconfig.json`, and `types`; full output was saved to `/home/cameron/.claude/projects/-home-c
- @40 `long/path:/tmp/cctypes/claude-code.d.ts` [Reflector] needle `/tmp/cctypes/claude-code.d.ts` — * 🟡 2026-09-10 13:25 Assistant inspected Claude Code’s `$.model.fork` API in `/tmp/cctypes/claude-code.d.ts`;

**decisions × 2 Observer compression** (32 items, 1.52 points)
- @20 `long/om-v04-haiku-not-faster` [Observer compression] needle `1.6` — line 3179: \| 3 (12.5k tokens) \| 12.9 s, 464 out \| 10.1 s, 745 out \| ~1.6× \| $0.052 \|
- @20 `long/om-v04-neg:close-tag-prompt` [Observer compression] needle `4 times in 10` — line 5596: - **Why not a prompt fix:** telling Luna to always close the block failed 4 times in 10, no better than before.
- @20 `long/om-v04-neg:subagent-veto` [Observer compression] needle `300k | 300,000 | 300 k | 300K` — line 6288: **There is a workaround inside OM.** OM's compaction hook can veto any compaction by returning `{ skip }`, and it knows when the one compacting is a subagent. So OM could skip a subagent's compactions until it reaches, say, 300k.

**reversals × 2 Observer compression** (15 items, 1.39 points)
- @20 `long/om-v04-sup:subagent-observed` [Observer compression] needle `/subagents? (now )?(take notes|are observed|observe)[^.\n]{0,/` — line 7619: Write({"file_path":"/tmp/om-flow/om-flow.html","content":"<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<title>Observational memory: how it flows</title>\n<script type=\"module\">\n  import mermaid from 'https://cdn.
- @20 `long/om-v04-sup:stall-cause` [Observer compression] needle `/(switch\w*|changed) (plugin )?versions|version switch|loaded/` — line 5470: 1. **The long compaction.** OM keeps notes on the conversation as it goes, so compaction is instant. In firstmate, an older OM version filed a few notes in the wrong order. The new version then saw notes that didn't match, threw 
- @20 `long/om-v04-sup:skill-stub-wording` [Observer compression] needle `/stub[^\n]{0,120}invoke (it|the skill) again|invoke (it|the s/` — line 5408: **The stub wording changed from the plan.** It turns out `om_recall` can't return a skill's full text, only 400-character excerpts. So the stub tells firstmate to invoke the skill again to reread it, and uses `om_recall` only to 

**facts × 2 Observer compression** (79 items, 1.36 points)
- @20 `long/om-v04-file:parser-debug` [Observer compression] needle `line by line | line-by-line | per line | each line | a line at a time` — line 8068: 18	// What pi 0.85.1 prints with `--mode json` for one answer: one event per line, the prompt echoed, the answer
- @20 `long/om-v04-file:prune-guards` [Observer compression] needle `OM_NO_PRUNE` — line 8125: (pass) register > OM_NO_PRUNE turns pruning off [43.18ms]
- @20 `long/om-v04-hop:151-messages` [Observer compression] needle `151 messages` — line 5453: - OM threw those notes away and observed all 151 messages at the 15:12 compaction.

**chronology × 2 Observer compression** (32 items, 1.31 points)
- @20 `long/version:0.1.0` [Observer compression] needle `0.1.0` — line 414: Bash({"command":"D=~/work/mods/observational-memory\ncat > $D/.claude-plugin/plugin.json <<'EOF'\n{\n  \"name\": \"observational-memory\",\n  \"version\": \"0.1.0\",\n  \"description\": \"Compaction as Mastra's observational memor
- @20 `long/path:claude-code/testing` [Observer compression] needle `claude-code/testing` — line 8068: 1	import { describe, expect, mock, test } from 'claude-code/testing'
- @20 `long/issue:#1` [Observer compression] needle `#1` — line 4937: 15:12:27 assistant Bash: F=/home/cameron/work/firstmate; B=$F/data/opie-sign-in-person-roles/brief.md cat > /tmp/intent.txt <<'EOF' New bug foir opie: [Image #1] this is the v

**reversals × 3 lost after observation** (14 items, 1.29 points)
- @40 `long/om-v04-sup:todo-commit` [Reflector] needle `/2991463/` — * ✅ 2026-09-12 21:43 Assistant committed `TODO.md` as `6e23307`, documenting the oversized-read gap, likely `schedule()` fix, smoke evidence, and token-estimation issue. Later `TODO.md` was updated as `2991463` to document dense-text token 
- @40 `long/om-v04-sup:main-tests` [Reflector] needle `/\b101 (tests|passed)|\b101 of 101/` — * ✅ 2026-09-12 23:15 Main merged recall-v2 as `958b3b1`, version `0.4.13`; 101 tests, TypeScript, and validation passed. `om_recall` now searches, reads, and outlines the whole session. (source 2026-09-12 22:50 to 2026-09-12 23:15)
- @40 `long/om-v04-sup:failure-cause` [Reflector] needle `/unclosed|left open|forgot to close|without (the )?closing|cl/` — * 🟡 2026-09-12 18:41 …Assistant added regression tests in `tests/register.test.ts` for unclosed observations and rejection logging, and modified `hooks/register.ts` to use lenient `…

**facts × 3 lost after observation** (75 items, 1.29 points)
- @20 `long/om-v04-file:pi-isolation` [Reflector] needle `PI_ISOLATION` — * 🟡 2026-09-12 16:17 Assistant identified the proposed fix: add `--append-system-prompt ""` to `PI_ISOLATION` in `hooks/register.ts`, reducing roughly 470 input tokens per call; the change had not yet been made because the v0.4.4 fix agent 
- @20 `long/om-v04-hop:settle-error-fix` [Reflector] needle `0.4.8` — * ✅ 2026-09-12 18:41 Verified: the 0.4.8 fix passed 69 tests, TypeScript compilation, and plugin validation. (source 2026-09-12 18:41 to 2026-09-12 18:51)
- @20 `long/long:clockmaker-clocks` [Reflector] needle `Oswin` — * ✅ 2026-09-11 13:41 Assistant answered the story quiz that Oswin’s shop had 214 clocks, while noting the detail was still present verbatim rather than necessarily retained by observation. (source 2026-09-11 13:38 to 2026-09-12 14:47)

**approvals × 2 Observer compression** (4 items, 1.07 points)
- @20 `long/om-v04-scope:ctx-worktree` [Observer compression] needle `experiment/context-observer` — line 8319: A few old local branches weren't pushed: `pin-brief`, `observer-fixes`, `fact-log`, `vcc-brief`, `v0.4.2`, `sched-reset` and `experiment/context-observer`. I can push those too or delete the ones you don't need.

**identifiers × 4 in context, grader misses** (7 items, 1.06 points)
- @20 `long/path:apps/web/package.json` [in prose (wording/grounding/order)] needle `apps/web/package.json` — * 🟡 00:51 Initial exploration found contract-signing delivery services, document field editor and prefill-related code, and existing `pdf-lib` and `pdfjs-dist` dependencies in `apps/web/package.json`; implementation had not started. (source
- @40 `long/path:hooks/stats.ts` [in prose (wording/grounding/order)] needle `hooks/stats.ts` — * 🟡 01:02 `hooks/recall.ts`, `hooks/stats.ts`, and `hooks/prune.ts` provide recall, statistics, and pruning functionality. (source none)
- @40 `long/path:packages/db/drizzle/20260923124247_add_gorman_pdf_settings` [in prose (wording/grounding/order)] needle `packages/db/drizzle/20260923124247_add_gorman_pdf_settings` — * 🟡 00:51 –01:14 Gorman PDF feature was implemented in Opie. Relevant files include `apps/web/src/server/features/contracts/contract-signed-gorman-delivery.service.ts`, `contract-signed-pm-delivery.service.ts`, `lead.service.ts`, `contract.

**approvals × 3 lost after observation** (3 items, 0.80 points)
- @40 `long/om-v04-scope:no-lavish` [Reflector] needle `/tmp/om-flow/om-flow.html` — * ✅ 2026-09-12 23:31 Assistant stopped the Lavish feedback poll and ended the session for `/tmp/om-flow/om-flow.html`;

**identifiers × 3 lost after observation** (5 items, 0.76 points)
- @40 `long/usd:$1.50` [continuation superseded] needle `$1.50`
- @40 `long/path:/tmp/om-flow` [Reflector] needle `/tmp/om-flow` — * ✅ 2026-09-12 23:31 Assistant stopped the Lavish feedback poll and ended the session for `/tmp/om-flow/om-flow.html`;
- @40 `long/path:/tmp/om-v043` [Reflector] needle `/tmp/om-v043` — * 🟡 2026-09-12 15:23 Assistant’s build brief required testing against a copied fixture at `/tmp/om-v043/fixture.jsonl`, replay tests, real Luna measurement, a live smoke test, plugin tests/validation/typecheck, and adding comparison variant

**reversals × 4 in context, grader misses** (4 items, 0.37 points)
- @60 `long/firstmate-11-super-firstmate-pushed` [in prose (wording/grounding/order)] needle `/74153fae/` — * 🟡 01:47 –02:14 Firstmate was updated locally and pushed to the fork: main fast-forwarded from `5cfe99d5` to `74153fae` after upstream-sync merge `fd71ca8d` plus fixes `103e28a2`, `9c397e7d`, `e86c8286`, `e4573dfa`, `0d6ffed`, `0054cff7`, 
- @60 `long/firstmate-11-order-rename-then-subject` [in prose (wording/grounding/order)] needle `/#?1425\b/` — * ✅ 01:14 –04:22 Gorman PR #1417 merged into main at `495188e5a307853dbffb35015db83dca31491fe5`, after focused integration tests (10 files/110 tests), outbound tests (3), final targeted tests (5 files/49 tests), 168 test files/2,084 tests f
- @80 `long/om-v04-sup:main-tests` [in prose (wording/grounding/order)] needle `/\b101 (tests|passed)|\b101 of 101/` — * ✅ 01:02 `tests/fm-pr-merge.test.sh` passed all 101 tests with zero failures, including live target mismatch checks for GitHub and GitLab.

**commits × 4 in context, grader misses** (4 items, 0.27 points)
- @60 `long/pr:1427` [in prose (wording/grounding/order)] needle `1427` — * ✅ 01:02 Assistant opened direct PR #1427, “feat(change-orders): void a signed change order and undo what signing applied,” with screenshots and implementation details.
- @60 `long/pr:1429` [in prose (wording/grounding/order)] needle `1429` — * ✅ 04:22 Assistant opened non-draft PR #1429 at https://github.com/ByteBotSoftware/oasis-pavers-and-pools-opie/pull/1429 with only the help-text/comment fix and embedded screenshot; inbox message `003.msg` was acknowledged.

**constraints × 2 Observer compression** (3 items, 0.21 points)
- @40 `long/om-orchestration-rule:worktree-only` [Observer compression] needle `outside their worktree` — line 19670: - **A subagent edited your testing guide.** The #4 fixer rewrote the "Decisions that need a human" section of `~/.agents/docs/testing-conventions.md` again. Each point now explains its reason, which fits what you asked for, so I

**identifiers × 1 not in any chunk** (1 items, 0.15 points)
- @40 `long/version:1.1.0` [only after the cut] needle `1.1.0`

**commits × 1 not in any chunk** (2 items, 0.13 points)
- @60 `long/commit:9466e8a` [not in the source as worded] needle `9466e8a`
- @80 `long/commit:940b47b` [not in the source as worded] needle `940b47b`

**commits × 3 lost after observation** (2 items, 0.13 points)
- @80 `long/pr:1421` [Reflector] needle `1421` — * ✅ 2026-09-15 03:46 –04:22 SBOM work merged PRs #1420, #1421, #1422, and #1423. `libheif-js@1.19.8`/`LGPL-3.0-only` was initially unaccepted because `.github/scripts/generate-sbom-report.mjs:isCompliant` ignored weak copyleft; PR #1420 add
- @80 `long/pr:1422` [Reflector] needle `1422` — * ✅ 2026-09-15 03:46 –04:22 SBOM work merged PRs #1420, #1421, #1422, and #1423. `libheif-js@1.19.8`/`LGPL-3.0-only` was initially unaccepted because `.github/scripts/generate-sbom-report.mjs:isCompliant` ignored weak copyleft; PR #1420 add

**chronology × 4 in context, grader misses** (2 items, 0.08 points)
- @20 `long/path:/tmp/cctypes/claude-code.d.ts` [not prose (non-genuine kept row or bare list)] needle `/tmp/cctypes/claude-code.d.ts` — * 🟡 13:25 Assistant inspected Claude Code’s `$.model.fork` API in `/tmp/cctypes/claude-code.d.ts`;
- @20 `long/path:/tmp/cctypes` [not prose (non-genuine kept row or bare list)] needle `/tmp/cctypes` — * 🟡 13:25 Assistant inspected Claude Code’s `$.model.fork` API in `/tmp/cctypes/claude-code.d.ts`;

**absent × 5 other** (1 items, 0.05 points)
- @40 `long/firstmate-11-abst-drug-quota` [no needle (absent)] needle ``

**corrections × 1 not in any chunk** (1 items, 0.05 points)
- @80 `long/line 479` [not in the source as worded] needle `keep should always be tool calls. if a chat needed that tool, its relevant isnt `

**corrections × 2 Observer compression** (1 items, 0.05 points)
- @80 `long/line 719` [Observer compression] needle `wdym compactions adds to the full history instead of replacing it` — line 719: Wdym compactions adds to the full history instead of replacing it

**facts × 4 in context, grader misses** (2 items, 0.03 points)
- @40 `long/long:v031-speed` [not prose (non-genuine kept row or bare list)] needle `182` — * User @ 13:20 (182 chars):

**identifiers × 5 other** (0 items, 0.00 points)

**constraints × 1 not in any chunk** (0 items, 0.00 points)

**constraints × 3 lost after observation** (0 items, 0.00 points)

**constraints × 4 in context, grader misses** (0 items, 0.00 points)

**constraints × 5 other** (0 items, 0.00 points)

**verbatim × 1 not in any chunk** (0 items, 0.00 points)

**verbatim × 2 Observer compression** (0 items, 0.00 points)

**verbatim × 3 lost after observation** (0 items, 0.00 points)

**verbatim × 4 in context, grader misses** (0 items, 0.00 points)

**verbatim × 5 other** (0 items, 0.00 points)

**facts × 1 not in any chunk** (0 items, 0.00 points)

**facts × 5 other** (0 items, 0.00 points)

**corrections × 3 lost after observation** (0 items, 0.00 points)

**corrections × 4 in context, grader misses** (0 items, 0.00 points)

**corrections × 5 other** (0 items, 0.00 points)

**asks × 1 not in any chunk** (0 items, 0.00 points)

**asks × 2 Observer compression** (0 items, 0.00 points)

**asks × 3 lost after observation** (0 items, 0.00 points)

**asks × 4 in context, grader misses** (0 items, 0.00 points)

**asks × 5 other** (0 items, 0.00 points)

**in-progress × 1 not in any chunk** (0 items, 0.00 points)

**in-progress × 2 Observer compression** (0 items, 0.00 points)

**in-progress × 3 lost after observation** (0 items, 0.00 points)

**in-progress × 4 in context, grader misses** (0 items, 0.00 points)

**in-progress × 5 other** (0 items, 0.00 points)

**files-edited × 1 not in any chunk** (0 items, 0.00 points)

**files-edited × 2 Observer compression** (0 items, 0.00 points)

**files-edited × 3 lost after observation** (0 items, 0.00 points)

**files-edited × 4 in context, grader misses** (0 items, 0.00 points)

**files-edited × 5 other** (0 items, 0.00 points)

**failures × 1 not in any chunk** (0 items, 0.00 points)

**failures × 3 lost after observation** (0 items, 0.00 points)

**failures × 4 in context, grader misses** (0 items, 0.00 points)

**failures × 5 other** (0 items, 0.00 points)

**chronology × 1 not in any chunk** (0 items, 0.00 points)

**chronology × 5 other** (0 items, 0.00 points)

**absent × 1 not in any chunk** (0 items, 0.00 points)

**absent × 2 Observer compression** (0 items, 0.00 points)

**absent × 3 lost after observation** (0 items, 0.00 points)

**absent × 4 in context, grader misses** (0 items, 0.00 points)

**decisions × 1 not in any chunk** (0 items, 0.00 points)

**decisions × 4 in context, grader misses** (0 items, 0.00 points)

**decisions × 5 other** (0 items, 0.00 points)

**approvals × 1 not in any chunk** (0 items, 0.00 points)

**approvals × 4 in context, grader misses** (0 items, 0.00 points)

**approvals × 5 other** (0 items, 0.00 points)

**reversals × 1 not in any chunk** (0 items, 0.00 points)

**reversals × 5 other** (0 items, 0.00 points)

**tokens × 1 not in any chunk** (0 items, 0.00 points)

**tokens × 2 Observer compression** (0 items, 0.00 points)

**tokens × 3 lost after observation** (0 items, 0.00 points)

**tokens × 4 in context, grader misses** (0 items, 0.00 points)

**tokens × 5 other** (0 items, 0.00 points)

**budget × 1 not in any chunk** (0 items, 0.00 points)

**budget × 2 Observer compression** (0 items, 0.00 points)

**budget × 3 lost after observation** (0 items, 0.00 points)

**budget × 4 in context, grader misses** (0 items, 0.00 points)

**budget × 5 other** (0 items, 0.00 points)

**handoff × 1 not in any chunk** (0 items, 0.00 points)

**handoff × 2 Observer compression** (0 items, 0.00 points)

**handoff × 3 lost after observation** (0 items, 0.00 points)

**handoff × 4 in context, grader misses** (0 items, 0.00 points)

**handoff × 5 other** (0 items, 0.00 points)

**commits × 2 Observer compression** (0 items, 0.00 points)

**commits × 5 other** (0 items, 0.00 points)

**lessons × 1 not in any chunk** (0 items, 0.00 points)

**lessons × 2 Observer compression** (0 items, 0.00 points)

**lessons × 3 lost after observation** (0 items, 0.00 points)

**lessons × 4 in context, grader misses** (0 items, 0.00 points)

**lessons × 5 other** (0 items, 0.00 points)

