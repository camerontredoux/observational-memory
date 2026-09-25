## builder-obs: I27a ctx-a rebased onto fail11, two versions (ready to record)

- ctx-a-only (I27a without I26): dir /tmp/omv-build/ctx-a, diff /tmp/omv-build/ctx-a.diff (against /tmp/omv-code/fail11; paths are omv-code/fail11/... vs omv-build/ctx-a/..., apply with -p2).
- session+ctx-a (I26 + I27a, as tested): dir /tmp/omv-build/session-ctx-a, diff /tmp/omv-build/session-ctx-a.diff (same form).
- What changed: /tmp/omv/session's diff against /tmp/omv/grp and /tmp/omv/ctx-a's diff against /tmp/omv/session, applied unchanged to fail11 (register.ts hunks offset ~36 lines; the grp to fail11 changes don't touch them). For ctx-a-only, the prompts.ts hunk failed as expected, since its context line holds I26's "keep its Session line" clause. I wrote the same I27a sentence in by hand in the base wording: "...even when the chunk adds nothing. That record is also what the session is working on: weigh the chunk by it, record in full the events that bear on its goal and work, and name on a step's line the goal it serves when the chunk shows it. From the record: keep each of its Waiting for user...". The register.ts change (the reframed CONTINUATION intro in the Observer's request) is identical in both.
- Checks, both dirs: tsc shows only the 6 missing-fixture errors. claude plugin test: 342 pass, 3 fail (the base's 3).
- Record (the Observer prompt changes, so no cached A/B):
  `bun scripts/bench-compact.ts ab --a /tmp/omv-code/fail11 --b /tmp/omv-build/session-ctx-a --record --no-chain --no-holdout --jobs 12`
  `bun scripts/bench-compact.ts ab --a /tmp/omv-code/fail11 --b /tmp/omv-build/ctx-a --record --no-chain --no-holdout --jobs 12`
