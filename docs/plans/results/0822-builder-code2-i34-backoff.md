# I34 backoff (builder-code2)

Base: /home/cameron/work/mods/observational-memory/.scratch/omv-code/base2 (fail11 + I14 + I15). Variant: /tmp/omv-build/i34-backoff. Diff: /tmp/omv-build/i34-backoff.diff (122 lines: hooks/register.ts, tests/register.test.ts).

## Change

- After a failed background Observer call, `backOff()` in hooks/register.ts stops that loop from starting new calls for `RETRY_MS` (5 s). The wait doubles with each failure in a row, up to `RETRY_MAX_MS` (5 min). When the wait ends, a `$.clock.after` timer runs one scheduling pass.
- `schedule()` returns right away while the loop is backing off. That covers turn/step passes and the freed-slot handoff, so a failing pi no longer busy-loops through the slots.
- Calls already in flight that fail during the wait count as the same failure. Four parallel calls failing together give one 5 s wait, not 5, 10, 20 and 40 s.
- A call that lands clears the loop's backoff. `end()` also clears it, together with `sinceScheduled` and `waiting`.
- Timeouts (`!chunk` false) and landings discarded because the loop ended don't back off.
- Compaction's own Observer calls are unchanged. Backoff only gates background scheduling.

## Tests

- New test: a failing pi with 6 chunks. 4 calls go out, then nothing until 5 s have passed, then 4 more, then nothing until another 10 s. Once pi answers, all chunks land (watermark 23). After a landing, the next failure waits 5 s again.
- Changed test: "a reply pi did not finish" now reaches its second call through the back-off timer (`clock.advance(5_000)`). A later turn no longer triggers it, because that turn's `clock.set` would run the timer chain until a call succeeded.
- `claude plugin test`: 345 pass, 3 fail. The failures are the known ones: background timestamps, corrections section and over-budget source ranges.
- The constraints-cap test ("falls back rather than drop any") timed out once at 5.4 s against its 5 s limit, at load average about 9.5. It passed on the rerun in 3.95 s. The test is load-sensitive and doesn't involve scheduling.
- `bunx -p typescript tsc -p .`: only missing-fixture errors (6 errors in 3 files).

## Cached A/B (rubric with the coordinator's reversals fix)

| track | base2 | I34 | Δ | flips |
|---|---:|---:|---:|---|
| main | 77.9 | 77.9 | 0 | 0 up / 0 down |
| holdout | 79.3 | 79.3 | 0 | 0 up / 0 down |
| chain | 81.5 | 81.5 | 0 | 0 up / 0 down |

- 0 fresh calls in every track. B's calls have the same cache keys as A's, so the difference is exactly zero.
- Context size is unchanged: 33k mean / 57k max per chain cut, and efficiency is "same".
- The replay never makes pi fail, so the benchmark can't measure the benefit. The unit test is the only evidence for it.
- Results: /tmp/omv-build/ab-i34.log and /tmp/omv-build/ab-i34.json. `--out` is ignored and the script writes the shared `.scratch/bench-compact/ab.json`, so I copied that file.

## Verdict

Kept. It is a reliability fix with no effect on quality or size. A failing pi (auth, network, rate limit) now costs at most one call per back-off window per loop, instead of refilling all 4 slots as each call fails.
