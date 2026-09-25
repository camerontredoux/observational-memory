## builder-obs: I18 details, rebased onto fail11 (ready to record)

- Dir: /tmp/omv-build/details. Diff: /tmp/omv-build/details.diff (against /tmp/omv-code/fail11 = grp + mask3-250 + I10).
- What changed: /tmp/omv/details's diff against its grp base, applied unchanged (both hunks clean, offset 36 lines). `detailsOf` lists the backticked terms, versions, numbers with a unit, constants, PR/commit ids and paths from the chunk's assistant prose (not tool calls or results, not ones a user message holds), deduplicated, in order, capped at 40 entries / 300 tokens, between DETAILS markers after the chunk. One Observer paragraph: put each listed detail that belongs to an event you record on that event's line; never write a line only to hold a detail, or a line that is a list.
- Checks: tsc: only the 6 missing-fixture errors. claude plugin test: 342 pass, 3 fail (the base's 3 known register.test.ts failures, same names).
- Observer input and prompt change, so every Observer call is fresh.
- Record (cheap tier first):
  `bun scripts/bench-compact.ts ab --a /tmp/omv-code/fail11 --b /tmp/omv-build/details --record --no-chain --no-holdout --jobs 12`
  Then the holdout (the queue's caveat: part of a gain may be matching the rubric; judge on the holdout and `--behavior`).
