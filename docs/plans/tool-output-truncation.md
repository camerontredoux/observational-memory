# Tool-output truncation instead of compaction

> **Verdict: parked (2026-10-10).** Built and tested on the branch `truncation-pass` (tag `archive/truncation-pass`), not shipped. The pass keeps verbatim thinking for 40–70 more requests at ~$2 more per pass in prompt-cache cost, fires only in tool-heavy sessions where the observations already capture the work, and cannot fire in the reasoning-heavy sessions where kept thinking would matter. See "Prompt-cache cost" below and `assets/truncation-cache-cost.png`.


## Goal
A small mod that, when the session hits the auto-compaction threshold, clears old tool outputs (keeping the last few) instead of summarizing, so the conversation's user and assistant messages stay intact.

## Decided
- Mechanism: a `session.compact` hook. On the `auto` trigger it answers `{ messages }` itself without calling `next`, so no summarizer model call runs. Messages handed back with their `handle` stay as the engine has them; a message without one is rebuilt from `role`, `text`, `toolUses`, `toolResults`. Old messages lose their handle and get stub tool-result text; recent ones keep their handle. (Confirmed in the plugin API types; observational-memory uses the same hook.)
- Default: "clears out all but the last 3-5 tool calls and just leaves the tool call names" (Cameron's words). Tool-use blocks keep name + input; results become a one-line stub.

## Findings (72 crewmate sessions measured at their first auto-compaction, ~156k tokens)
- Tool results are ~40% of context (median ~61k tokens, calibrated; chars/4 undercounts by ~1.6×). Clearing all but the last 5 saves ~39% (p10 29%, p90 52%): 156k → ~95k.
- Input truncation to 200 chars adds ~14k (Bash heredocs 74%, Write 14%, Edit 8%): total ~49%, 156k → ~80k.
- N barely matters: N=3 vs N=10 differ by ~3k. Results are spread over ~64 calls.
- Untouchable by this approach: assistant output 23.5% (thinking alone 8.6%, up to 35%), system-reminder re-injections ~20k, fixed overhead ~12.5k, ~60–100 tokens of framing per tool call. These grow without bound, so truncation roughly doubles a session's life before a real compaction is needed; it does not replace it.
- Bash is 83% of result volume (max ~30k chars, client-truncated); Read has the biggest single results (up to 68k chars) and the only images (up to 14 screenshots per session, ~17k tokens).
- Safety: after compaction 50–89% of Reads are re-reads already; the model almost never quotes old output from memory. Stubbing mostly causes re-reads it does already.
- Must leave alone: the summary row (a user string), `isMeta` turn-companion rows. Check: does `Edit`'s read-before-edit check depend on the Read result being in message history? Does a rebuilt (handle-less) message drop thinking blocks (bonus ~13k) or break the API's thinking/signature rules?
- Study script and tables: `~/.claude/scratch/tmp.6Gve8W6S5B/` (`compaction_study.py`, `out_report.md`).

## Verified against the API declarations (2026-10-10)
- `SessionMessage` carries only `role`, `text`, `toolUses`, `toolResults`, `handle`. A message handed back without its handle is rebuilt from those fields, so it loses its thinking blocks.
- Tool results and images live in user messages; tool inputs and thinking live in assistant messages. Stubbing results/images keeps every assistant handle and all thinking. Truncating inputs rebuilds assistant messages and drops their thinking.
- observational-memory keeps a watermark of observed rows (`ledger.watermark`, `hooks/register.ts:125`); its compact hook runs on `session.compact` and falls back to the built-in compactor on failure.

- Edit's read-before-edit check reads engine state (`readFileState`, keyed by path), not message history (verified in the 2.1.296 binary). Stubbing a Read result does not block a later Edit. The engine's own clearing path deletes the `readFileState` entry for a cleared Read on purpose, forcing a re-Read; a plugin cannot do that, so after stubbing the model may Edit from memory. Edit requires an exact `old_string` match, so a wrong memory fails loudly rather than corrupting the file.
- The engine already has a "microcompact" that does this same thing: `[Old tool result content cleared]`, keep last 5 tool uses, clear at least 20k tokens, cleared content persisted to `tool-results/` with a `<persisted-output>` pointer in the stub. It is triggered only by ~65 min idle (cache already expired) or by an API prompt-too-long reject, behind a feature gate, and only for a fixed set of built-in tools. The plugin's contribution is making it threshold-triggered and watermark-gated.

## Ideas under discussion
- Build inside observational-memory, not a separate mod: stub only rows below the observation watermark, so nothing leaves context that memory has not captured.
- Repeat truncation at each threshold hit; fall through to observation-based compaction only when the projected post-truncation size is still above ~80% of the threshold.
- Stub text carries the om_recall ref (`[Bash: 4.2k chars cleared, exit 0 — om_recall a79f045b:2133]`) so cleared output is one cheap call away instead of a re-Read.
- Keep the first line of error results.

## Decisions
- Build inside observational-memory as a pre-step of its `session.compact` hook, not a standalone mod (user agreed 2026-10-10).
- No input truncation: it would rebuild assistant messages and drop their thinking.
- Transcript row: when a truncation pass runs, draw a row in the style of the memory row, `[memory] tool calls truncated · 61.2k tokens`. OM's memory row text lives in `MEMORY_ROW` (`hooks/register.ts:387`) and ui-extension copies it, so the new row's text needs the same pairing; the notice itself goes through `show($, text, agentId)` (`hooks/register.ts:200`), which is `$.ui.log` for the main loop and debug for subagents.
- Images in tool results are always stubbed, regardless of recency (user confirmed 2026-10-10).
- Keep window: last 10 tool calls keep their results and inputs verbatim (proposed; N=3 vs N=10 differs by ~3k tokens).

## Deviations in the build (2026-10-10)
- The transcript row is not restyled. `show` is `$.ui.log`, and the engine (2.1.296) draws a `$.ui.log` line as an informational system row of its own (`<plugin>: <text>`); no `ui.render` component reaches it: the terminal appends it as a `notice`-level informational message drawn straight, and `InfoNotice` is only the dim line under the logo (the binary's render sites: AskUserQuestion, UserMessage, AssistantMessage, CommandOutput, InfoNotice, PromptHint, SessionMode, Spinner, ToolGroup, ToolProgress, ToolResult, ToolUse, TurnDuration). The memory row is restyleable only because it is a UserMessage. So the line shows as `observational-memory: tool calls truncated · 61.2k tokens` (`TRUNCATED_ROW = 'tool calls truncated'`), dim, and ui-extension has no copy of `TRUNCATED_ROW`.
- The context size the share is measured against is `usage.context.breakdown.totalTokens`, else `usage.context.tokens` (there is no `usage.context.totalTokens`), else the rows' chars/4 estimate; a subagent always uses the estimate. The cleared amount is chars/4, so the share is conservative against a measured context.
- `unmask` changed so a stub restores: a stub starts with maskTail's marker (no head), is matched by tool id alone, and a stub never counts as the whole result (a result that quotes the marker, om_recall's or a Read of a transcript, still does) (an image's original text is empty, shorter than its stub).
- Three existing tests that compact on `auto` (two in `register-budget.test.ts`, the crewmate replay) now hit the pass first. They do what the engine does (`compactAuto` in `tests/harness.ts`): while the result is a truncation pass (every row back, the first unchanged), they write its rows to the history and compact again on `auto` with them as the context. No assertion changed.

## Measuring it
`bun scripts/truncation-report.ts [--since <days>] [--session <id-prefix>] [--json]` in observational-memory. It finds every truncation pass (from the store's `truncations:` records and from transcript boundaries with no memory message after them) and, for each, compares the tool calls after the pass with the same number before it: re-reads, om_recall calls, identical Bash reruns, Edit failures (string not found / not read), and assistant lines saying it no longer has an output. Also reports how many tool calls and tokens of work the pass deferred the real compaction by. Re-reads and recall up a little is the design working; edit failures or lost-detail notes up means raise `KEEP_RECENT_CALLS` or `TRUNCATE_MIN_SHARE`. Its `STUB` regex matches rows.ts's `clearedResult` text (checked against the ok, error and image forms).

## Prompt-cache cost (2026-10-10)
Model, with om_stats's 30-day figures (C=156k at the trigger, C0=47.5k after an OM compaction, g=0.9k growth a request, cache write ×2, read ×0.1): a pass clearing share s rewrites C(1−s) cold once and then reads a context that much larger for the s·C/g requests it buys; a compaction over the same requests rewrites C0 once and reads from C0. Extra cost of a pass ≈ (C − sC − C0)(2 + 0.1·sC/g). The lines cross only at s = (C − C0)/C ≈ 70% (≈ 88% against crewmate's 19k post-compaction), which a pass never reaches; a typical pass (37–39%) costs ~15k token-equivalents a request against ~9k, about 410k (~$2 at $5/MTok) more per pass. Chart: `assets/truncation-cache-cost.png`. So the pass is a quality-for-cost trade, not a saving; raising `TRUNCATE_MIN_SHARE` blocks the worst deals (small passes, where the cold write amortises over few requests) rather than finding a cheaper point.

## Rejected
- Rewriting context on every turn (`session.append` / `turn.step`): more moving parts, breaks prompt cache every turn. Compaction-time rewrite is a one-off cache break, same as built-in compaction.

## Open
- Whether the pass hurts task quality in practice: run the report after a week of crewmate sessions on v1.14.0 and compare before/after rates. The decided fallback is OM compaction on the next auto trigger (nothing left to clear or savings under the share); the keep count is the last 10 calls.
