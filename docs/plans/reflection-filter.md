# Reflection as a poison filter

## Goal

Make reflection run in real sessions and remove observations that are garbage or stale and won't affect future behaviour, instead of only condensing a memory once it reaches 40k.

## Decided

- Keep reflection. The user: "a lot of our observations are old and useless or are poorly stored". Reflection "should act as a poison filter".
- Delete only: no merging or rewriting. Code checks that every surviving line matches an input line byte for byte, which avoids the losses I20/I45 saw from rewriting.
- Run it again only after the ledger grows by about +5k since the last pass, so a pass that finds little junk doesn't repeat on every chunk.
- Keep the 40k condensing Reflector as a backstop for now. Revisit once the filter is measured.
- Trigger at 15k, as Pi does. The user: "maybe we should be doing 15k then". Real memories peak at about 35k (median 9k), and the Reflector has never run in 322 real sessions. Pi's consolidator fires at a 15k pool and drains it to 10k (`pi-observational-memory-vcc/src/config.ts:58-59`). Our 40k came from Mastra's default (`reflection.observationTokens: 40_000`), not from Pi.

## Rejected

- Lowering the threshold for the current condensing Reflector. I20, I23 and I45 showed that every earlier or more frequent condensing reflection lost commits, chronology and identifiers (`docs/plans/phase2-summary.md`).

## Open

- What counts as garbage or stale? Candidates from 12 real ledgers (~3,500 lines, 10–26k observation tokens; store in `~/.claude/plugins/store/observational-memory_*.json` and `~/.claude/plugins/data/observational-memory/archive/`). About 30–40% of lines look deletable:
  - assistant remarks that restate a nearby line (~12%)
  - reads and inspections that record no finding (~8–10%)
  - routine check passes superseded by a later pass (~6–8%)
  - transient state: waits, CI mid-run, next steps that `currentTask` supersedes (~4–5%)
  - the same fact recorded again in different words (~4%)
  - failed attempts later fixed, with no lesson (~3–4%)
  - meta and hedge notes, scratch scaffolding, badly stored lines (~4%)
- Must keep: decisions with reasons (even in "Assistant said" lines), user requests and approvals, commit/PR/issue/branch identifiers, code facts with `file:line`, measured results, root causes and lessons, and failures that taught something. So no category can be cut on wording alone; the model judges each line.
- Priority markers can't guide it: ~85% of lines are 🟡, 13% ✅, one 🟢. Making 🔴 exempt costs nothing (8 lines).
- Separate issue: `corrections` holds context-free approvals stored as standing constraints (`🔴 User: "yeah."`, `"Go for it"`). The filter doesn't touch corrections.
- How strict should the filter be? v3 is strict: about 11% deleted, and it loses no cited specifics by construction. A middle setting would accept a specific found in any kept line, not only the cited one.
- What stays exempt: 🔴 lines, the newest N tokens, lines an earlier filter pass already kept.
- Should deleted lines stay reachable through `om_recall`? Their source ranges remain in the transcript.
- How do we measure it: `bench-compact --long` A/B, plus a check that no rubric item is lost from the lines it deleted?

## Next steps

1. (done) Dry run v1 (`scripts/filter-dryrun.ts`, 12 ledgers, newest 4k tokens and 🔴 protected): deleted 15–48% of lines (about 31% on average) for ~$0.03 in total. Audit of all 1,196 deletions: 73% fine, 23% lost a minor specific still in git or the transcript, and 4.2% (50) wrong (lost lessons, figures, decisions, open work, user statements). Most wrong ones cited nothing, cited only deleted lines, or cited a same-topic line that lacked the fact.
2. (done) v3: the prompt requires a cited kept line holding every figure, identifier and reason, and has a longer keep list. Code refuses a deletion that cites no line, cites itself or a deleted line, or names a protected line, and refuses a restated/repeated deletion whose cited line lacks one of its backticked tokens, SHAs, #numbers or numbers. Result: 1–24% deleted (about 11% on average). Most refusals: 315 cited lines lacked a specific, 262 named a protected line, 127 cited nothing.
3. (done) Middle setting, tried two ways:
   - v4, the strict prompt plus looser code: 3–31% deleted, about 13% on average. The strict prompt itself makes the model propose less.
   - Simulated with no new model calls: v1's loose prompt and replies plus code checks, scored with the audit's verdicts for each line.

   | code checks on v1's replies | lines deleted | tokens | wrong | minor |
   |---|---:|---:|---:|---:|
   | none (v1) | 35% | −31% | 4.2% | 23% |
   | no chains; restated/repeated specifics must be in some kept line | 23% | −21% | 2.8% | 15% |
   | + transient must cite a line | 21% | −19% | 2.1% | 15% |
   | + never delete a line with a reason word (because, since, cannot, root cause, must, never, rule…) | 18% | −17% | 1.7% | 13% |

4. (done) v5, the last row run for real: a loose prompt, code checks for citations and specifics, transient must cite, and the reason-word guard. It deleted 671 of 3,439 lines (about 19.5%, about 18% of tokens) for ~$0.03. Audit: 578 fine (86.1%), 85 minor (12.7%), 8 wrong (1.2%). The wrong ones: a cited line kept the action but lost a reason, figure, the user's hypothesis or the list of options (5); a transient line holding open work cited an earlier line (2); a no-finding line that reported a result (1). Possible fixes: transient, superseded-check and fixed-failure must cite a *later* line (catches 2, refuses 18 fine and 2 minor), and a prompt that limits no-finding to reads and searches that found nothing.
5. Build it and A/B it on main and `--long`.
