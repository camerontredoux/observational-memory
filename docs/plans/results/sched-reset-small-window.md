# Not fixing: on-the-spot observation after a compaction keeps only an oversized read

Moved from `TODO.md` on 2026-10-08. The smoke runs it cites (`/tmp/om-tail/runs/smokeC`, `smokeD`, `smokeE`) are deleted.
Branch `sched-reset` keeps the code (`675d1e3`).

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
