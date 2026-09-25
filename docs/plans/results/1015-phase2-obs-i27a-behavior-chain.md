# I26+I27a (session-ctx-a) behavior + chain vs fail11: behavior up, chain -0.7 (phase2-obs)

Run: /tmp/obs-bench2/.scratch/runs/ab-i27a-behavior-chain.{md,json}, fail11 vs .scratch/omv-build/session-ctx-a, --behavior, chain, main (cached sample), no holdout. Finished 09:35.
- main +2.2 is the same cached draw as the earlier confirmation, not new evidence (independent draws were +1.7 and +0.9).
- behavior: 62.6% -> 65.3% (75 up / 51 down). purpose 1/24 -> 3/24 (+2, 0 down); multi-hop 7 -> 20; rule 64 -> 77; dropped 30 -> 37; file-state 35 -> 42; rationale 25 -> 29. Worse: lessons 35 -> 28, false 84 -> 78, next 41 -> 37, value 189 -> 184.
- chain (one draw, informational): 79.8 -> 79.1, -0.7; 25 up / 21 down unique, p=0.66. Content gates go up (chronology +4.2, identifiers +1.9, in-progress +2.7, approvals +1.9); the loss is tokens -2.2 and budget -1.4 (context +4%, two Reflector calls instead of one).
Against the rule (chain doesn't drop and the purpose probe improves): purpose improves, but only by 2 of 24 probes. The chain drop comes from the size gates, not content, and it's one draw. My read: borderline. A second chain draw would settle it if you want to keep I27a in the running; otherwise drop it.
