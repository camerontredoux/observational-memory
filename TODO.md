# Open issues

## Token estimates run low on dense text

OM estimates tokens as characters ÷ 4. Dense text (the v0.4.12 smoke chapters in `/tmp/om-tail/runs/smokeC`, `smokeD`
were ~2 characters per token) makes the kept raw tail about twice its estimate, so compactions come more often than
intended.

The compaction's final budget check scales the raw tail's estimate by the last response's measured density, so a result too
big for the window falls back to the built-in compaction; the scheduling thresholds (`CHUNK_TOKENS`, `KEEP_RAW_TOKENS`,
`RAW_MAX_TOKENS`) still use the plain estimate.

## Not fixing: on-the-spot observation after a compaction keeps only an oversized read

Seen only with a small window (the smokeC/smokeD runs: 60k window, 36 KB reads). When a compaction keeps only the
oversized newest read, the rows before it are ~9.4k estimated tokens, short of a 10k chunk, and the next read compacts
again ~3.5 s after the step that could start one, so each such compaction observes ~2 chunks on the spot (8–10 s).

Tried on branch `sched-reset`:
- Resetting the step count only when a check starts a chunk still left 2 on-the-spot calls per compaction and more
  than doubled scheduling passes in the replays.
- `675d1e3` (start a half chunk before an oversized raw tail) removed the on-the-spot calls, but compaction then cut at
  the background watermark and kept ~38k real tokens raw in the 60k window; the engine's rapid-refill breaker stopped
  the live smoke (`/tmp/om-tail/runs/smokeE`) after 6 of 8 chapters, where the old code finished 30.

With the usual 190k window a background chunk has minutes to land before the next compaction. If it matters later:
keep `675d1e3` and observe on the spot when cutting at the watermark would keep too much of the window raw (window size
from `$.session.usage()`).

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
fixed the manual `/compact` case, where the check failed on a trailing `/compact` row. Auto and subagent compactions
still fail it sometimes: 43 of 82 in session `40c779b6`, mostly subagents. On 2026-09-25 the opie session
(`0554dd5a`) failed it at 18:05 (auto) and at 18:10 (subagent), 0 rows observed beforehand, and blocked 17.8 s and
24.4 s. Its compactions that matched took about 0.2 s.

The cause is not known. The current guess is task notifications injected into the context (`queued_command`
attachments). A context that still lines up with the history row for row keeps all the background notes: the
ledger is checked against the history's rows, and only the raw tail comes from the context. It lines up when the
first differing row reads as no history row nearby and each differing row has the same role, tool calls and tool
results as the history's row there (`linesUp` in `hooks/register.ts`). Any other mismatch keeps the notes only when
every differing row is past the watermark; one under it restarts the ledger from the memory message. `notPersistent`
in `hooks/register.ts` counts how the two differ: `compaction.notPersistent.<trigger>`, the shape
(`extra`, `missing`, `changed`, `short`), `compaction.notPersistent.rows.<context kind>-<history kind>`, and the
`fromEnd`, `differing` and `rowsKept` metrics.

No mismatch had happened on v1.4.1 yet at 2026-09-25 21:45. Next: after a mismatch on v1.4.1, read those counts with
`/om-stats full` or in `~/.claude/plugins/data/observational-memory/stats/<session>.json`, then fix the cause. The
compaction A/B benchmark cannot test this: its replays never produce a mismatch.

On 2026-10-02 (v1.7.5), 7 subagent compactions in sessions `5ee0282a` and `e6ad9851` kept no notes and blocked 14 to
24 s. To match a mismatch to its compaction, compare the time of its `compaction.notPersistent.fromEnd` sample with the
subagent's `compact_boundary` time minus its `durationMs`.

3 of the 7 have a known cause, an engine bug with fork subagents. When subagent `a847200a` started forks `a3fbb496` and
`a455d07f`, Claude Code wrote the context each fork inherits into the parent's transcript, not into the fork's
transcript. The parent's transcript got the rows since its last compaction twice (144 rows with repeated uuids). Each
fork's transcript has only its 6 newest inherited rows, so its first line names a parent row that is not in the file.
The results:

- The two forks' first compactions found a context longer than the history (`short`), and all rows differed.
- The parent's next compaction found the copies in the middle of its history: 126 of 272 rows differed.

Other forks in the same sessions got the copy in their own transcript and matched. The plugin cannot fix this
safely. The inherited rows never reach the fork's history, so the plugin must observe them at compaction in any case.

The other 4 have no known cause: `a24fdd07` twice, `aa87bc4b` and `a509ebbe`. Their transcripts have no repeated rows
and no missing parent rows. `aa87bc4b` started no other agents. `a24fdd07` failed just after 5 `SendMessage` calls.
To find the cause, v1.7.6 writes each mismatch to
`~/.claude/plugins/data/observational-memory/mismatches/<session>-<time>-<n>.json`: each side's rows with their kind,
a short hash, length, tool names and first 80 characters (`captureMismatch`, tagged `[DEBUG-np01]`). Next: read the
captures from the next mismatches, fix the cause, then remove everything tagged `[DEBUG-np01]`.

## Engine bug: the kept raw tail shows twice after a compaction

After the plugin compacts, Claude Code shows the kept raw tail again, after the compaction notice. Auto-compaction
fires as a new prompt arrives, so the tail usually holds the previous turn's full answer, and the user sees it twice.

The cause is in the engine (2.1.282). When a `session.compact` hook's result stands, the engine gives every returned
message a new uuid, handle or not, and appends it after the boundary. Built-in compaction keeps the kept rows' uuids
and records them in the boundary's `preservedSegment`, so nothing shows twice. `SessionMessage` has no field that
marks the memory message as the compact summary. Keeping the handles on all rows brings back the resume leak that
`e547d11` fixed.

Since v1.7.1 the plugin hides the copies on screen instead (`ui.render`). The memory message draws as one line. The
rows right after it in the transcript, stamped within milliseconds of each other, are the copies, and their message,
tool group and tool rows draw as nothing. Their tool calls get fresh ids (`<id>__om<tag>`) so the originals stay
visible. Local slash command rows have no hook that hides them, so the kept tail leaves them out. The engine fix would
still be better: the copies stay in the transcript file, and a session resumed in another process shows them again.

`docs/plans/results/1515-dup-tail.md` has the live test arms, the evidence and a draft Claude Code bug report. The bug
is not filed yet. Arm C there (keep `handle` except on rows with `toolResults`) keeps the real assistant rows with
their thinking signatures and attachments, but it does not fix the duplicate.
