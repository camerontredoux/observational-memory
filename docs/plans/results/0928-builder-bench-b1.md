B1 long chain (`--long`) built, recorded and graded.

Diff: ~/.claude/jobs/40c779b6/tmp/b1-long.diff (worktree .claude/worktrees/agent-a7613c00219f4508a, against its baseline 88e2f1d = main's working state at 07:42). It covers scripts/bench-compact.ts, scripts/bench-replay.ts, tests/eval/rubric.ts and tests/eval/replay.ts. The rubric/replay hunks include your revfix and homefix, which main already has, so skip those hunks when you land it.
Fixtures (local, gitignored): tests/fixtures/long.hard.local.ts (copy at ~/.claude/jobs/40c779b6/tmp/b1-long.hard.local.ts) and a regenerated tests/fixtures/rubric-controls.local.ts in the worktree. `bun scripts/bench-compact.ts corpus` writes the 10 new transcripts into tests/fixtures/replay/.

Transcripts, oldest first, 24 h apart, 80 compactions in all: work-5, lanterns-3, om-v04, opie3-4, firstmate-11, opie2-3, om-orchestration, opie2-5, opie3-6, opie4-3, om-2598, crewfm-16, om-lead (this session, 40c779b6). None are holdouts. om-2598 and 28895069 overlap, so only om-2598 is in.
Items: 185 existing items reused from om-v04, firstmate-11 and om-orchestration (member offsets, with ids prefixed by member), plus 7 hand-written long-range items (5 facts, 2 latest). Examples: the day-1 autoCompactWindow value needed until cut 80, the day-2 clockmaker detail, the v0.3.1 timing, "no claude forks" (set day 1, reversed day 11) and the handoff MVP marked denied on day 13. They are negative-controlled in the `controls` fixture against the corpus and holdout contexts; tests pass 348/0.
Grading covers every 5th cut (16 cuts). Recall-aware credit is kept apart from the totals: held = 1, pointed = ½ (the fact is missing, but a context line carries a source range whose transcript span holds the expected tokens), counted over fact×cut pairs.

Scores, cached regrade with the current main rubric fixes:
- base /tmp/omv-code/fail11: main 77.8, long 58.7, recall-aware 30.7 (329 held + 108 pointed of 1248)
- HEAD af0940d: main 75.1, long 53.7, recall-aware 30.9 (332 held + 107 pointed of 1248)
- Long-range items are the same on both sides: jev-removed 12/12, claude-forks 4/4, compact-test 3/4, auto-compact-window 10/16, clockmaker 3/15, v031-speed 0/12, handoff-mvp 0/1 (the stale form comes after the new one).

What the chain reached, same on both sides: 4 reflections (6 Reflector calls), 325 Observer calls. The constraint tier peaked at about 5.5k tokens at cut 80, below the 8k cap, so the cap was not reached and there were no fallbacks. Reaching the cap would take a longer chain or more constraint-heavy sessions.
Calls: 331 per plugin. HEAD made the same Observer/Reflector calls as base, so the whole recording made only 302 fresh Luna calls (pi, openai-codex/gpt-5.6-luna).
Run time: recording took about 69 min (08:08 to 09:17, both plugins in parallel, --jobs 12). A cached `run --long` takes about 4.5 min. Two cached base runs gave byte-identical stdout and JSON.
Also added to bench-replay: `--gap-hours N` and `--fallback recorded` (a failed compaction takes the source's own summary and the chain goes on; the fallbacks are listed in summary.json).
