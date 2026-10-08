# Observational memory: direction

## Goal

Make long Claude Code sessions (firstmate, orchestrators, long planning) keep working across many compactions: keep the user's words and rules exactly, keep what the work needs, and resume where it left off. Measure every change against built-in compaction on live sessions and real transcripts.

## Decided

- **Use `om+recall`** (observational memory with `om_recall`) as the setup going forward. Why: compaction is fast, with no big model call at compaction time. Constraints held 100% on every replay (446/446 on the chain). Handoff questions scored 8/10 against built-in's 3/10 on om-orchestration. `recall-required` went from 1/3 to 6/6 once recall stayed visible. Evidence: `docs/bench/`.
- **Keep the user's messages and 🔴 constraints verbatim, in code**, not in a model's summary. The Reflector passes 🔴 lines through untouched (v1.3.0).
- **Keep `om_recall` a tool, visible after compaction without ToolSearch** (v1.1.0), and end the memory with a note on when to search it. Why: calls went from 0 to about 1 per run, and success from 1/3 to 6/6.
- **Rank whole-term matches first in `om_recall`**, rather than switching to BM25 or multi-region results (v1.2.0). Why: the observed miss was `shard-101` losing to lines that merely contained `101`. Whole-term ranking fixes that at a fraction of the complexity.
- **Model-free brief as a fallback only** (v1.2.0), used when the Observer fails, instead of Claude Code's built-in summary. Why: fallbacks had made about 1 in 6 runs invalid; after it, there were 0 fallbacks in 33 compactions. The always-on brief showed no gain (6/6 either way) and costs context.
- **The Reflector keeps recent work and aims near its target** (v1.3.0): the newest ~12k tokens stay untouched, it aims for 60–90% of 20k, and it refuses results under 40%. Why: v1.2.0 crushed memory to 18% and kept 1 of 10 needed identifiers; v1.3.0 landed at 81% and kept 8 of 8.
- **Standing system-prompt note and handoff-shaped continuation record** (v1.3.0): next steps, what the user was told, and git state read by code. A long first message (crewmate brief) keeps its head and tail. Taken from Codex's design where it needs no trained model.
- **Keep the full transcript file on disk.** Compaction replaces what the model sees, not the file. `om_recall` needs the file. Codex keeps its files too (up to 36 MB here).
- **Planning sessions keep a running plan doc** (`~/.agents/docs/planning-sessions.md`), in the main conversation only. Why: OM keeps a plan's facts, but not one current view of it; the doc survives any compaction method.
- **Process:** tickets in GitHub issues; worktrees in `.worktrees/`; no spec/standards reviews for now (speed over ceremony); one version bump per release; paid runs only with a stated budget and a dry run first. Treat a one-run difference as noise: the same code scored 56–68% on needed identifiers across runs, so a claimed gain needs 3+ runs per arm.

## Rejected

- **Merging the VCC summary (`vcc-brief` branch) into main.** It scored within noise of Observer memory plus recall and needed more recall prompting and cost. Kept only as the fallback brief.
- **Always-on brief.** No measured gain.
- **BM25 and multi-region recall results.** Whole-term ranking addressed the actual miss.
- **Shrinking or rewriting the session file on compaction, like people assume Codex does.** Codex doesn't either, and recall depends on the file.
- **Fork handoff as a replacement for OM (#16).** It never failed (72/72) and tied everything on the original scenarios, but it did worse on both plan scenarios (1–2 fewer of 3). The content was right; the authority was wrong: cautions became stops ("ask before every step"), and a rule it had read was listed as the user's decision. Cost: about 6¢ per compaction, against under 1¢ per run for OM. Even with a fixed prompt, the best case is a tie at about 10× the cost, still needing recall for exact details. Results: `docs/bench/2026-09-24-fork.md` on branch `issue-16` (not merged; read it with `git show issue-16:docs/bench/2026-09-24-fork.md`).
- **Observer that reads the whole conversation before its chunk** (`OM_OBSERVER_CONTEXT=full`, branch `observer-full-context`, not merged). One run each on om-orchestration and om-v04: no measurable quality gain (needed identifiers 57% vs 54% and 53% vs 65%, inside the 56–68% spread between runs of the same code; handoff 5/10 vs 4/10 and 2/6 vs 3/6). Cost 2.6–3× per Observer call, because prompt caching never hit (pi's cache key is a fresh session id per call). Latency +1–2 s. Notes read better on plan and budget, but it dropped an approval gate, gave a 🔴 to the assistant's own event, and re-observed earlier events with wrong times. Worth retrying only with a stable cache key, a guard against lines stamped before the chunk, and 3+ runs per arm.
- **Treating the v1.3.0 om+recall "drop" as a regression.** It was the harness: mixed fact/handoff sessions and last-reply-only scoring. Matched, v1.3.0 scored 28/44 against v1.2.0's 29/44, within noise. The om-v04 drop was Observer variance.

## Open

- **The working model's own note (from #16):** the Observer can only infer the working model's intentions from outside. The candidate fix is a short note written by the working model at compaction via `$.model.fork`, only on what the rest of the memory can't know: hypotheses it ruled out, temporary edits to undo, what it was thinking, and the exact next action. Added to OM's memory, clearly labelled as the model's own notes, not the user's, and framed as information rather than orders. Its value: nothing else can see the model's intentions, and no scenario so far has tested that. The whole-conversation Observer did not close this gap (see Rejected), so this note remains the only candidate. To test it properly, a scenario needs its key state in the model's reasoning, not in the visible conversation (for example debugging with a ruled-out hypothesis and a temporary debug edit).
- **A second reflection** has never run in any test (the chain ended at ~38.7k of 40k). Compression levels 2–4 are untested live.
- **Sonnet 5 sometimes redirects output to keep context small.** The benchmark's `logs.sh` now refuses it; watch for the same behaviour in other scenarios.

## Next steps

Finished branches are kept but have no worktree: `issue-16`, `observer-full-context`, `vcc-brief`, `fact-log`. The `.worktrees/bench-*` snapshots stay for rerunning old versions.


1. Decide whether the working model's own note is worth testing; it needs a scenario whose key state is in the model's reasoning.
2. Merge #16's evaluation-only branch so its results and harness fixes are on main.
3. Push a chain long enough to force a second reflection, and check it.
