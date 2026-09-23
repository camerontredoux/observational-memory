# Open issues

## Token estimates run low on dense text

OM estimates tokens as characters ÷ 4. Dense text (the v0.4.12 smoke chapters in `/tmp/om-tail/runs/smokeC`, `smokeD`
were ~2 characters per token) makes the kept raw tail about twice its estimate, so compactions come more often than
intended.

The compaction's final budget check scales its estimate by the last response's measured density, so a result too
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
