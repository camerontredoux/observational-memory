# Handoff MVP: re-recording after a writer bug

- Arms: amp (branch handoff-amp, c8dc4a7) and hybrid (branch handoff-hybrid, 5cd506f), in worktree
  /home/cameron/work/mods/observational-memory/.claude/worktrees/agent-ab208b160703dbdea.
- Delta vs HEAD: none yet. HEAD baseline is 73.9 (main corpus, samples 2).
- Bug found in the first recording: the stand-in writer (gpt-5.6-sol) often answered the conversation's last message
  instead of writing the note. Only 4 of 9 hybrid notes on om-v04 parsed, and about 18 of 25 amp handoffs across the corpus.
  Fixed by fencing the conversation as inert data and restating the task after it (the Observer's pattern). Checked on
  3 om-v04 cuts: 3 of 3 notes parse. The first recording was discarded.
- Efficiency so far (real pi latency from the recording): amp 9-48 s per compaction (mostly 38-48 s), about 60k tokens in
  and 2.4k out. Hybrid note 8-18 s, about 60k in and 0.3-0.6k out. Both calls run on the critical path, in parallel
  with the compaction's own Observer catch-up.
- Verdict so far: none.
- Next: main corpus, samples 2 per arm, recording in parallel (about 40-60 min). Then ab against HEAD, then the
  authority check.
