# Open issues

## Token estimates run low on dense text

OM estimates tokens as characters ÷ 4. Dense text (code, other scripts) can take about twice that. `planBudget` in
`hooks/register.ts` already scales the raw tail's estimate by the last response's measured density for the
compaction's budget check. Two gaps remain:

- The scheduling thresholds (`CHUNK_TOKENS`, `KEEP_RAW_TOKENS`, `RAW_MAX_TOKENS`) still use the plain estimate. On
  dense text the kept raw tail is larger than intended, so compactions come more often.
- `planBudget` measures density for the main loop only. A subagent's density is always 1.

## Store writes are not atomic across processes

Every Claude Code process shares the plugin's one store file, which offers single-key get, set, delete and keys and no
transaction or compare-and-set. The ledger lock and the loop stamps in `hooks/register.ts` order one process's work
only. The pruner (`hooks/prune.ts`) checks a session's keys, their times and the sessions registry again just before
deleting it, but a process that writes to that session between the last check and the deletes can still lose the
write. Two processes can also both pass the daily `prune:last` check; that repeats the work and deletes nothing more.

## Chunks observed side by side do not see each other's constraints or continuation record

The Observer is shown the constraints in force and where the work stood before its chunk: the ledger's and those of the
chunks already landed before it (`beforeRows` in `hooks/register.ts`). Chunks observed in parallel, in one scheduling
pass or at compaction, do not see each other's. When one sets a constraint and the next reverses it, the Observer of
the second cannot name the first by its id, and both stand as constraints in force, the reversal after it: nothing is
dropped, and the memory shows both, newest last. The continuation record is that of the newest chunk that writes one, so a gate or a
completed request that only the chunk before it recorded drops out of the record; the observations still hold it.

## Auto and subagent compactions sometimes find a context that differs from the history

Before a compaction uses the background notes, it checks that the live context matches the session history. v1.4.0
fixed the manual `/compact` case. Auto and subagent compactions still fail the check sometimes, mostly in subagents
(43 of 82 in session `40c779b6`; 7 subagent compactions on 2026-10-02, each blocked 14 to 24 s).

What the plugin does now: a context that lines up with the history row for row (`linesUp` in `hooks/register.ts`)
keeps all the background notes. Any other mismatch keeps the notes up to the first differing row. `notPersistent`
counts each mismatch by trigger, shape, row kinds and distance from the end; `/om-stats full` shows the counts.

Known cause for some: an engine bug with fork subagents. Claude Code writes the context a fork inherits into the
parent's transcript, not the fork's, so both histories differ from their contexts. The plugin cannot fix this.

No known cause for the rest (subagents `a24fdd07`, `aa87bc4b`, `a509ebbe`, `a6261f17`). They show no repeated or
missing rows. The guess is task notifications injected into the context.

The per-mismatch file capture (`captureMismatch`, tagged `[DEBUG-np01]`) is removed. It came in with `354618b`
(v1.7.6) and wrote each side's row shapes to
`~/.claude/plugins/data/observational-memory/mismatches/<session>-<time>-<n>.json`. To find the cause, restore it
from that commit, collect captures from new mismatches, then fix the cause and remove it again.

## Workflow agents get no background observation

A workflow's agents (`"agentType":"workflow-subagent"`) write their transcripts to
`<project>/<session>/subagents/workflows/wf_*/agent-<id>.jsonl`. `$.agent.list()` does not list their ids, and
`$.session.messages({ agentId })` refuses their history. So `onStep` in `hooks/register.ts` returns for them, and
each of their compactions observes the whole context on the spot. In sessions `6396851a` and `28895069`, 57 of 57
such compactions blocked, each with 5 to 7 Observer calls and for 17 to 24 s. This has been so since v0.4.10.

A fix must read the agent's history from its transcript file. The rows must hash the same as the engine's
`e.messages` (`rowHash`), for the background passes and for the compaction's alignment. The engine does not
document how it maps transcript lines to `SessionMessage` rows. First, confirm that `turn.step` fires with a
workflow agent's id.

## Fast subagents outrun the background observation

A subagent that reads fast fills its window before background chunks land. For example, Explore `a1a60770` grew
from 16k to 152k tokens in 65 s. At its compaction more than `RAW_MAX_TOKENS` was unobserved, so it observed on the
spot. `MAX_PARALLEL` is shared across the main loop and every subagent. Two changes could help, each with a cost:

- Let the raw tail grow to what the budget leaves after the memory message. The compacted context is then larger,
  and the next compaction comes sooner.
- Give a free slot to the loop nearest its compaction threshold first. Other loops then wait longer.

## Engine bug: the kept raw tail shows twice after a compaction

After the plugin compacts, Claude Code (2.1.282) gives every returned message a new uuid and appends it after the
boundary, so the kept raw tail shows again. Built-in compaction avoids this through the boundary's
`preservedSegment`, which a `session.compact` hook cannot set. Since v1.7.1 the plugin hides the copies on screen
(`ui.render`, tool ids `<id>__om<tag>`), but they stay in the transcript file and show again on a resume in another
process. An engine fix is still needed.

`docs/plans/results/1515-dup-tail.md` has the evidence, the live test arms and a draft Claude Code bug report. The
bug is not filed yet.
