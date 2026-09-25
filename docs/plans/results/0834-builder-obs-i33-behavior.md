# I33 handled: behavior run, ready and not started (builder-obs)

## The done probes

Each of the 3 handled items already has an `ask`, so `behavior.ts` builds a `done` probe from it (`handled:` → `done`):
"Has the user's request "<quote>" already been handled? Answer "done" or "not done". Should you start it again?"

Without an `answer`, a `done` probe passes on any "done" with a quote from the context. So the handled header alone (`(40 chars; replied at 14:20):`) would pass it, which is circular too. Each item now has an `answer` taken from the transcript's own outcome (what the assistant reported after the request). The reader's answer or evidence must carry that outcome; the words "replied" and "done" alone don't count:

- om-v04 `handled:cleanup-worktrees`: the reply removed six worktrees (-v043, -v044, -stats, -prune, -observer, -pin) and kept -v042. `answer: '(six|6) worktrees|v043|v044|v0\.4\.[34]'`
- om-orchestration `handled:push-close-issues`: main pushed, all nine issues closed, #2–#9 each commented. `answer: '(nine|9) issues|all (nine|9)|1\s*(-|–|to|through)\s*#?9|2\s*(-|–|to|through)\s*#?9'`
- firstmate-11 `handled:three-issues-one-pr`: the fixes landed in PR #1422, which the user merged. `answer: '1422'`

The patterns sit in the grading, not in the reader's input. The Luna cache key (context + asks + prompt + argv) is unchanged by them. A new unit test in `tests/replay.test.ts` shows a "done" with only the header as evidence fails, and one with the outcome passes, while "not done" fails.

Caveat: a "done" now needs the outcome to be in the context, so this probe also depends on how well the observations keep that outcome. handled can only win where the outcome is present and the header tips the reader from "not done"/unknown to "done". The per-probe `why` (answer and evidence) in the report shows which case applies.

## Where

Rubric diff, updated (still staged, not applied to MAIN): ~/.claude/jobs/40c779b6/tmp/purpose/handled-rubric.diff (253 lines), on top of purpose-rubric.diff and coord/rubric-revfix.diff; it dry-runs clean on that stack (`patch -p1`). The fixture copies with all three applied are in my worktree: .claude/worktrees/agent-aaa771729c87a4229/.build/i33-bench/ (a full bench dir: fail11 plugin + obs-bench2 fixtures + purpose + revfix + handled rubric). Checks there: tsc gives only missing fixtures; plugin tests 345 pass / 3 fail, the 3 known ones, and the negative control passes.

Variant: /tmp/omv-build/handled (base2 + handled.diff); A: /home/cameron/work/mods/observational-memory/.scratch/omv-code/base2.

## Command (not run)

From a bench dir with the three rubric diffs applied (or from the i33-bench dir above):

    bun scripts/bench-compact.ts ab --a /home/cameron/work/mods/observational-memory/.scratch/omv-code/base2 --b /tmp/omv-build/handled --jobs 12 --no-holdout --no-chain --behavior

(behavior only reads the main corpus. The retention A/B with holdout and chain is already in 0828-builder-obs-i33-handled.md.)

## Expected Luna calls

150 in total: per side, 906 probes at 25 cuts, 75 reader calls (25 cuts × 3 samples), 75 not cached. B's contexts all differ from A's (every memory has quoted user messages), so no call is shared. The handled probes are 12 per side (item × cut). I counted this with a stub `pi` in PATH that exits 1 at once, so no model was called and nothing was cached (log: /tmp/omv-build/.behavior-dry-count.log). Observer/Reflector replies are all cached (no --record).

## Also

On the coordinator's word I undid my base2 rebases of details/span/span-lean/target/ctx-a/session-ctx-a. /tmp/omv-build/<name> and <name>.diff are their fail11 builds again, as handed off at 07:52/07:59.
