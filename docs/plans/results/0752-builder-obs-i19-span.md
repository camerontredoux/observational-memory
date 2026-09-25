## builder-obs: I19 span, two arms on fail11 (ready to record; see the test note)

- Dirs and diffs (against /tmp/omv-code/fail11):
  - /tmp/omv-build/span, /tmp/omv-build/span.diff: CHUNK_TOKENS 10k → 7k only (STEP_SCHEDULE_TOKENS follows).
  - /tmp/omv-build/span-lean, /tmp/omv-build/span-lean.diff: lean's TOOL_RESULT_MAX_TOKENS 5k → 1k plus CHUNK_TOKENS 7k; the test constant TOOL_RESULT_MAX_CHARS follows (1_000 * 4).
- Checks: tsc: only the 6 missing-fixture errors, both arms. claude plugin test: 335 pass, 11 fail in both arms: the base's 3, plus 8 that encode the 10k chunk size:
  - 4 expect chunk counts or row ranges cut at 10k ("Expected 19 Received 17" observer calls; "Read one-0, one-1, one-2" vs one-0, one-1; mid-turn rows 0-7/7-13 vs 0-5/5-9/9-13).
  - 4 time out (the fallback/floor tests, pi failing "overloaded"), plus "the file ran to its end" from the same. Cause, from the code: in runJob a failed call frees its slot and reschedules every waiting loop at once (clock.after(0)), so while pi keeps failing and more chunks wait than MAX_PARALLEL slots, the same gap is retried back-to-back with no delay. At 7k those tests have more than 4 chunks pending, so the test clock never settles. This is base behaviour (any loop with >4 chunks pending at 10k does the same while pi is down); the replay never fails pi, so recordings are unaffected. Worth a code-lane look.
  - Scaling the test's CHUNK constant to 28k makes it worse (16 fail); the tests need rewriting to the new size only if span wins.
- Every Observer call is fresh (chunk boundaries move). The Reflector runs sooner on the chain, so a keeper needs the full tier.
- Record both arms against the base in one run:
  `bun scripts/bench-compact.ts ab --a /tmp/omv-code/fail11 --b /tmp/omv-build/span,/tmp/omv-build/span-lean --record --no-chain --no-holdout --jobs 12`
  If lean's own verdict lands first, drop the arm it rules out.
