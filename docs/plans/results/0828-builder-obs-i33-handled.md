# I33 handled: builder-obs

- Dir: /tmp/omv-build/handled (copy of base2, /home/cameron/work/mods/observational-memory/.scratch/omv-code/base2)
- Diff: /tmp/omv-build/handled.diff (254 lines, against base2; `hooks/register.ts`, `tests/register.test.ts`)
- Rubric diff, staged, not applied to MAIN: ~/.claude/jobs/40c779b6/tmp/purpose/handled-rubric.diff (225 lines). It applies on top of purpose-rubric.diff and coord/rubric-revfix.diff (the reversals fix): `patch -p1 -i` in a plugin dir with both applied.
- The fail11 build is kept at /tmp/omv-build/handled-fail11 (+ handled-fail11.diff).

## What changed (plugin)

Each quoted user message in `<all-user-messages>` now says in its header whether a reply followed it. Code sets this from the rows, and no model decides it:
`* User @ 14:00 (5 chars; replied at 14:01):` or `(...; no reply yet):` when the message's turn was still running at the cut. The next compaction fills that in with the first reply. The continuation record's quoted latest request gets the same suffix. The status is only a fact next to the message's length. Whether the work is done stays the continuation record's job. The status follows base2's day-once form (a reply on the header's day gives only its time) and its dedup form (`(48 chars; replied at 14:11): quoted in the corrections above`). Statuses are parsed back and carried across compactions. Older memories without a status still parse.

## What changed (rubric, staged diff)

- `tests/eval/rubric.ts`: a `handled:` fact must hold on one line, like purpose. It is read against the quoted user messages: each message's header joined with its first line, or with the corrections' quote for a deduplicated one (`quotedLines`). Everything else keeps prose-only matching. The items report under the `done` gate (`behavior.ts` maps `handled:` to `done`).
- `scripts/bench-compact.ts`: negative controls include the quoted lines, so a foreign context's quotes are tested too.
- One hand-written item per main transcript, each an old request that was finished, where HANDLED = replied|done|completed|finished:
  - om-v04 `handled:cleanup-worktrees` (from 3): clean up the worktrees but keep v042
  - om-orchestration `handled:push-close-issues` (from 4): push, then close issues #1-#9
  - firstmate-11 `handled:three-issues-one-pr` (from 9): fix the 3 issues in one PR (#1422)
- `tests/replay.test.ts`: a unit test showing that the header with its first line counts as one line, that a status-less quote fails, that a "done" elsewhere does not count, and that the dedup form reads from the corrections.
- Negative controls: "no hand-authored item passes a foreign context or one before its from" passes with controls regenerated from base and from handled (`controls` writes the local fixture, 781 KB / 798 KB, under 1 MiB).

## Checks

- handled: `bunx -p typescript tsc -p .` gives only the 6 missing `.local` fixture errors. `claude plugin test` gives 345 pass / 4 fail, the same 4 failures as a copy of base2 (base2 now also fails "a memory whose constraints are over their own cap falls back", a 5 s timeout, besides the 3 known ones). The new tests pass: reply times, no reply yet then filled in, carried across compactions.
- Rubric bench (fail11 tests + obs-bench2 fixtures + purpose + revfix + handled): tsc gives only missing fixtures. Plugin tests give 344 pass / 3 fail, the 3 known ones.

## Cached model-free A/B (my run, rubric diff applied, vs base2)

main 75.1 → 76.0 (+0.8): handled gate 9/12 → 12/12, firstmate-11 +3.4, om-v04/om-orchestration 0. Holdout 0. Chain -0.4 (budget item `size` down at @17, tokens -1.1): the suffixes add about 2% to mean context tokens. Same cache keys, so the difference is deterministic. Without the handled items (plain rubric) the earlier run on fail11 was parity (77.5, identical calls).

## Command for the lane

This changes only rendered context (same Observer/Reflector cache keys), so the cached run is the measurement. In a bench dir with purpose + revfix + handled-rubric.diff applied:

    bun scripts/bench-compact.ts ab --a /home/cameron/work/mods/observational-memory/.scratch/omv-code/base2 --b /tmp/omv-build/handled --jobs 12
