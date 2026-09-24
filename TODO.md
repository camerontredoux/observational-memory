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

## A reversal in a chunk observed beside the constraint's own chunk replaces nothing

The Observer is shown the constraints in force before its chunk: the ledger's and those of the chunks already landed
before it (`constraintsBefore` in `hooks/register.ts`). Chunks observed in parallel, in one scheduling pass or at
compaction, do not see each other's, so when one sets a constraint and the next reverses it, the Observer of the second
cannot name the first by its id and both stand as constraints in force, the reversal after it. Nothing is dropped; the
memory shows both, newest last.
