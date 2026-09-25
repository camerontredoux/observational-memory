## builder-obs: I21 target on fail11 (ready to record)

- Dir: /tmp/omv-build/target. Diff: /tmp/omv-build/target.diff (against /tmp/omv-code/fail11).
- What changed: the Observer's request gets a size target line before its closing sentence: "Size target: about N observation lines for the ~T tokens of the chunk, as room for its events and their details.", with T = the serialized chunk's tokens and N = round(T / OBSERVER_TOKENS_PER_LINE), OBSERVER_TOKENS_PER_LINE = 800 (≈12 lines for a 10k chunk, against 7.5 today), at least 1. OBSERVER_SYSTEM_PROMPT gets one "Size." paragraph before "What to observe": the target is room to keep detail, not a ceiling to get far under; spend it on events and their details (value, reason, error, path on the event's line); never on routine steps, never pad; a routine chunk may need fewer. Nothing enforces it (no retry or discard, unlike the Reflector).
- Checks: tsc: only the 6 missing-fixture errors. claude plugin test: 342 pass, 3 fail (the base's 3).
- Every Observer call is fresh. Expected: more lines per chunk and a bigger memory; the queue says it must land with a saving (I17/I19), so watch context tokens (+10% makes it a tradeoff) and check a sample of replies for padding.
- Record:
  `bun scripts/bench-compact.ts ab --a /tmp/omv-code/fail11 --b /tmp/omv-build/target --record --no-chain --no-holdout --jobs 12`
