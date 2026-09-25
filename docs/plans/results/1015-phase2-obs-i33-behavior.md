# I33 handled behavior: done probes do not improve; reject by the rule (phase2-obs)

Run: .scratch/obs-i33/.scratch/runs/ab-i33-behavior.{md,json} (copy of builder-obs's i33-bench + home-path fix), base2 vs .scratch/omv-build/handled, --behavior, main corpus. Finished 10:00; 1 reader call retried once, all 75+75 answered.
- done: 37/40 vs 37/40 (2 up, 2 down). The handled items flip both ways: om-v04 handled:cleanup-worktrees@4 A 1/3 -> B 3/3, done:worktrees-removed@9 A 1/3 -> B 3/3; but done:worktrees-removed@4 A 3/3 -> B 1/3 "not done" and done:recall-merged@9 2/3 -> 1/3.
- all probes: 64.5% -> 63.9% (27 up / 32 down). value 196 -> 188, rule 65 -> 63, lessons 32 -> 35, next 38 -> 40, purpose 2 -> 1.
- retention: +0.8 (handled +0.9, firstmate-11 only), 1 unique item; efficiency same.
Rule was "keep I33 only if the done probes improve on base2" at +2% context: they don't, so I33 is rejected.
