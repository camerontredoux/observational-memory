## observer lane: screens batch1 + batch2 (samples 1, main corpus, vs grp)

Runs: worktree .scratch/runs/ab-batch1-s1.{md,json}; /tmp/obs-bench2/.scratch/runs/ab-batch2-s1.{md,json} (purpose gate on, so A = 72.3 there vs 75.0 in batch1).

| arm | Δ vs A | Δ vs A' (A's resample, -1.7) | efficiency | read |
|---|---:|---:|---|---|
| I16 think (medium) | -1.0 | +0.7 | same | noise; s2 cached, running |
| I17 lean (1k tool-result cap) | -2.7 | -1.0 | model tokens -15% | loss (file-state -1.0, rationale -0.5) |
| I11 grp-sup (supersede) | -1.2 | +0.5 | model tokens +6% | noise, no gain |
| grp-obs2 | 0 | +1.7 | same | close call; s2 running |
| I26 session | -0.6 | +1.1 | same | no gain; purpose 0/24 (see below) |
| **I27a ctx-a** | **+1.7** | **+3.4** | ctx +4%, model +3% | **win candidate**: multi-hop 16→24/44, rationale 21→28/55, decisions 51→55, purpose 0→6/24; s2 running |
| I27a+b ctx-ab | -0.5 | +1.2 | model +6% | (b) takes away the (a) gain; absent 157→153 |

- The A sample-1 draw is lucky: A' and every fresh arm score about the same on constraints 102/106, approvals ~43/54 and failures 5/22, where A scores 106, 50 and 8. So at samples 1, every fresh arm starts about 1.7 behind. Read Δ against A' too.
- I27b repeat check: in 81 Observer calls that were shown RECORDED lines, 0/669 reply lines restate one (Jaccard ≥0.6 or ≥0.8). At ≥0.4, 13 match their own block against a chance level of 21 (another call's block). So (b) doesn't make the Observer repeat old lines; it just doesn't help.
- The purpose items are too strict for I26. The Session lines are good, for example "planning and executing an agent-team effort to implement the open observational-memory tickets…". They fail because each item needs 3–4 concept groups on one line: firstmate needs "crewmate" (the lines say "delegated workers"), om-orchestration needs benchmark + agent team + tickets together, and om-v04 needs subagent. I haven't changed them mid-comparison. Proposal: cut each item to 2–3 core groups, rerun controls, then regrade. The regrade is model-free from the cache.
- Next: s2 for ctx-a, think and grp-obs2 (/tmp/obs-bench2/.scratch/runs/ab-s2-ctxa-think-obs2.*), then I18 details and I19 span. I19 is built on lean, which lost, so I'll rebase span onto grp unless told otherwise.
