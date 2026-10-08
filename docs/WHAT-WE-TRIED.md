# What we tried

Read this first before you start new compaction work. It lists each idea once, with its verdict and where the evidence is.

Verdicts:

- **landed**: in the plugin now. The version is in the result.
- **failed**: measured and rejected.
- **parked**: built or partly measured, not merged. Its branch is archived as the tag `archive/<branch>`, which keeps the code.
- **inconclusive**: not measured well enough to decide, or no result note exists.

Scores are from `scripts/bench-compact.ts` unless the row says otherwise. "Main" is the 3-session main corpus, "holdout" the 3 held-out sessions, "long" the 13-session long chain. One recorded draw has about ±2 points of noise on main, so a smaller difference decides nothing.

`I<n>` IDs are entries in `docs/plans/compaction-ideas.md`. `results/` means `docs/plans/results/`. Archived material is in `docs/archive/`.

## Lessons so far

1. Code that copies text verbatim (I10, I35, I42, I53) gave the reliable gains. Prompt changes that ask the Observer to write more of something did not.
2. The Observer is the ceiling. Most missing points are facts it saw and did not write (`results/1405-code-gap-b7.md`).
3. Earlier or more frequent reflection always lost commits, chronology and identifiers.
4. The biggest speed wins were bugs (I54, I56), not designs.
5. A gain on main alone is not enough. Check the holdout and the long chain, with 2+ draws.

## Ideas

| Idea | Verdict | Result | Evidence |
|---|---|---|---|
| **This week (2026-10-07/08)** | | | |
| Delete-only reflection filter at 15k, in place of the Reflector | parked | Long 62.5 → 42.9 without the 40k Reflector to bound the ledger. Main flat, 1–4% context saved for 8% more model tokens. | `docs/plans/reflection-filter.md`; tag `archive/reflection-filter` (`5642a87`) |
| Observer writes each event once, on its outcome line | parked | Observation bytes −4%, retention within noise, lessons down about 7 points in every draw. | tag `archive/observer-one-line` (`305de0a`) |
| Next-action continuation check (`bench-compact --next`) | parked | Memory, no memory, built-in and raw history all scored alike (20–24% with kept rows), so the check cannot separate contexts. | `docs/plans/web-research-2026-10.md`; tag `archive/next-action-check` (`37d3fe7`) |
| Code-built file and command manifest in the session brief | parked | Main 83.4 → 83.2, long 62.5 → 61.6, about +550 tokens per cut. | tag `archive/file-manifest` (`30eb005`) |
| ACON: Observer prompt tuned from mined failures | parked | Main +2.0, holdout −1.6. Invented a commit hash on the holdout. | `results/acon-2026-10.md`; tag `archive/observer-acon` (`0764dcf`) |
| Haiku as the Observer, with its own prompt rules | failed | Blind-graded against Luna on 20 chunks: did not beat it. | tag `archive/haiku-observer` (`93080a2`) |
| Web research on untried ideas | inconclusive | Published compaction gaps are about as small as our noise. Next-action check was the top pick (see above). | `docs/plans/web-research-2026-10.md` |
| **After v1.4.0 (2026-09-25 to 10-01)** | | | |
| Session line: goal and role lead the continuation record (sessw6) | landed | v1.5.0. Purpose probe 21/24. On the long chain a role carries into the next session at 21 of 80 cuts. | `results/0252-sessw6.md`, `results/0424-v150-land.md` |
| Session line written by the Observer (I26, session8), and writer drafts sessw to sessw5 | failed | session8: behavior −1.0 and −4.0. Writer drafts leaked prompt examples or drifted in role. | `results/1841-session8.md`, `results/2033-sessw.md` to `results/0202-sessw5.md` |
| Shorter memory guide | landed | v1.4.2. Instruction text 45% smaller, retention exact, behavior inside reader noise. | `results/1913-memory-guide.md`, `results/2001-grader-noise.md` |
| Only standing rules are 🔴 constraints; approvals are 🟡 (rules) | landed | v1.5.1. Approvals in corrections 37 → 3, correction tokens 34–60% lower. | `results/1218-rules.md` |
| Leave out "Assistant said" lines that repeat a shown reply (saiddup) | landed | v1.5.2. Saves 0.1–1% of the context. | `results/1627-saiddup.md` |
| Check each 🔴 line against the user's own words (redcheck) | landed | v1.5.3. Demoted 49 lines, all words the user never said. Behavior +1.9. | `results/0552-redcheck.md` |
| Hide an older status line a newer one repeats (supersede) | failed | Saves about 0.1% of the context; no gate moves. | `results/0128-supersede.md`; tag `archive/exp-supersede` |
| Observer skips housekeeping and instruction-file content (noise) | failed | About 1% smaller, no significant effect; identifiers may suffer. | `results/0518-noise.md`; tag `archive/exp-noise` |
| Background-written `<state>` status page leads the memory | failed | Retention −8.8, continuation −6.2, behavior −13.2. | `results/0652-state.md`; tag `archive/exp-state` |
| Grader tiers (core vs lookup) and `--continuation` score | landed | Bench only: a tiered total and a continuation score print beside the flat total. | `results/2334-grader.md`; commits `ca31475`, `5791773` |
| Optimization review: 38 fixes to store, compaction, API, prompts | landed | v1.6.0 to v1.6.4. Items 3, 14, 19 and 28 not done. | `docs/plans/optimization-review.md` |
| Observer example's 🔴 constraint goes in `<corrections>` (red-example) | landed | v1.6.4. 🔴 lines in observations 39 → 7; total inside noise. | `results/0313-red-example.md` |
| "Split unrelated events", not "compound statements" (split-compound) | landed | v1.6.4. Same output shape; total inside noise. | `results/0506-split-compound.md` |
| Manual compaction with nothing new uses the code-built brief | landed | v1.7.1, in another form. Tag `archive/fast-manual-compact` (v1.6.6) is not merged. | commit `cded72d` |
| Reflection cues: restore SHAs, PR ids, errors and numbers, not only paths | inconclusive | No result note. I50 (SHA cues) failed earlier. | tag `archive/reflect-cues` (`ab14848`) |
| Jev second opinion on the Observer's corrections | inconclusive | No result note. | tag `archive/exp-jev` (`ba6e342`) |
| Drop content-free user messages (acks) | inconclusive | Work in progress, no result note. | tag `archive/exp-acks` (`4ae1474`) |
| Half chunk before an oversized raw tail (sched-reset) | parked | Removed on-the-spot calls, but kept ~38k raw in a 60k window. Only matters with small windows. | `results/sched-reset-small-window.md`; tag `archive/sched-reset` (`675d1e3`) |
| **Phase 2 (2026-09-25), landed in v1.4.0 as base8** | | | |
| I3 grp: one source range per run of lines | landed | Smaller context, no loss. Replaced I1. | I3 |
| I9 tail-mask: cut old tool results in the raw tail | landed | Context −14% main; lost details stay reachable through `om_recall`. | I9 |
| I36 input-mask: cut old oversized tool inputs | landed | Lossless at keep 3 / 500 tokens; subagent briefs stay whole. | I36 |
| I14 day-once, I15 user-dedup, I38 wrap-dedup, I44b2 users-short | landed | Smaller or same-size context, no item lost. | I14, I15, I38, I44 |
| I10 open-failures and I55 lookup-fail | landed | Code-built list of failures still open. | I10, I55 |
| I35 refl-keep-ids: put back paths the Reflector drops | landed | Chain +1 item, others exact. | I35 |
| I37 image-prompt: keep prompts that start with an image | landed | Kept user prompts that were lost. | I37 |
| I42 replies: quote each turn's last reply, at 1k | landed | Main +1.7, 25 up / 0 down, context +9%. 2k version parked. | I42 |
| I53 carry5f: copy up to 5 assistant sentences per chunk verbatim | landed | Main +4.6, behavior 67.6% → 74.9%, context +9%. | I53 |
| I21 target9: Observer size target of about 9 lines per 10k chunk | landed | Main +2.0 (p 0.0066). The one prompt change that held. | I21 |
| I25 refl-tier and I49 refl-retry | landed | No re-condensing of reflected lines; long Reflector calls 18 → 10. | I25, I49 |
| I54 rows-cap-step (bug) | landed | Long critical-path calls 115 → 4, blocked compactions 29 → 3 of 80. | I54 |
| I56 compact-align (bug) | landed | Manual `/compact` no longer blocks 17–26 s. Auto and subagent mismatches remain open. | I56; `TODO.md` |
| I34 retry-backoff, I28 pin-lifecycle, I51 quote-fix (bugs) | landed | Robustness fixes: CPU spin, constraint-tier cliffs, wrong quote spans. | I34, I28, I51 |
| I13 cliff: model-free compaction as a control | inconclusive | Control arm only: 60.9, so the Observer is worth about 17 points. | I13 |
| I1 nosrc: drop source ranges | failed | Context −6% but breaks `om_recall`'s ranges. | I1 |
| I2 sk1: keep skills 1 turn instead of 3 | failed | No gain. | I2 |
| Observer prompt tweaks: I11, I16, I17, I18, I19, I27, I33, I48 | failed | Each moved main by less than the ±2 noise, or flipped sign between draws. | `docs/plans/phase2-summary.md` |
| Earlier or more reflection: I20, I22, I23, I45 | failed | Cut the long context but lost commits, chronology and identifiers. | I20, I22, I23, I45 |
| Cutting sections: I24, I30, I31, I39, I41, I44a, I44c, I50 | failed | Saved little or lost real content. | `docs/plans/phase2-summary.md` |
| I52a frontier: observe more often to shrink the raw tail | failed | Observer calls 87 → 167, main −1.6. | I52 |
| I46 clause-carry | failed | Long churn too high; superseded by I53. | I46 |
| I8 Amp-style handoff, alone and as a hybrid | failed | 38–48 s per compaction (8–18 s hybrid); rejected by the user. | I8; tags `archive/handoff-amp`, `archive/handoff-hybrid` |
| I6 durable tier, I29 episode index, I47 open asks | failed | Dropped: covered by I25 or by "Waiting for user". | I6, I29, I47 |
| I4 thinking: Observer reads the assistant's reasoning | parked | PR #27 closed unmerged. | I4; tag `archive/issue-22` |
| I5 observer-tool: Observer records through a schema-checked tool | parked | PR #26 closed unmerged. | I5; tag `archive/issue-19` |
| I7 tasks, I12 contrast, I32 threads, I40 users-first, I43 file-ledger | parked | Not built or not measured. | I7, I12, I32, I40, I43 |
| **Before Phase 2 (v1.0.0 to v1.3.0, live benchmark, retired in `9c171a7`)** | | | |
| `om_recall` visible after compaction without ToolSearch | landed | v1.1.0. recall-required success 1/3 → 6/6. | `docs/archive/bench/2026-09-24-v1.1.0-recall-required.md` |
| Whole-term ranking in `om_recall` | landed | v1.2.0. Fixed `shard-101` losing to lines holding `101`. | `docs/plans/om-direction.md` |
| Model-free brief as the fallback | landed | v1.2.0. Fallbacks: 7 of 42 om runs on v1.0.0, 0 of 33 compactions on v1.2.0. | `docs/archive/bench/2026-09-24-v1.2.0.md` |
| Reflector keeps recent work and aims near its target | landed | v1.3.0. Kept 8 of 8 needed identifiers (v1.2.0: 1 of 10). | `docs/bench/2026-09-24-v1.3.0.md`, `docs/bench/2026-09-24-reflector.md` |
| `#` in the prompt box offers matching memory lines (hash-recall) | landed | v1.9.0. | `docs/archive/plans/hash-recall.md` |
| BM25 ranking for `om_recall` (#20) | failed | Rank 1 on 70 of 90 real queries against 75 for the current order. | `docs/bench/2026-09-25-bm25.md` |
| qmd as a cross-session memory tier | parked | Plausible as an optional tier; no evidence our misses are semantic. | `docs/research/2026-09-26-qmd.md` |
| Fork handoff in place of OM (#16) | failed | Worse on both plan scenarios, about 10× the cost. | `docs/plans/om-direction.md`; tag `archive/issue-16` |
| VCC summary in place of Observer memory | failed | Within noise of OM plus recall, more cost. Kept only as the fallback brief. | `docs/plans/om-direction.md`; tag `archive/vcc-brief` |
| Always-on brief | failed | No gain (6/6 either way), costs context. | `docs/plans/om-direction.md` |
| Observer reads the whole conversation before its chunk | failed | No measurable gain, 2.6–3× cost per call. | `docs/plans/om-direction.md`; tag `archive/observer-full-context` |
| Pi's observational memory, compared with ours | inconclusive | Too little cross-implementation data to pick a winner. | `docs/research/2026-09-25-pi-om-design-verdict.md` |
| Early v0.4 branches: fact log, pinned first message, Observer sees prior observations, current task from newest chunk | inconclusive | Not merged; no result notes. v1.3.0 keeps a long first message's head and tail. | tags `archive/fact-log`, `archive/pin-brief`, `archive/experiment/context-observer`, `archive/observer-fixes` |
