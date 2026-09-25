## code lane: I10 open-failures: kept (fail11, stacked on mask3-250)

- What: the continuation record gets a "Tool failures still open" section, built by code (hooks/vcc.ts openFailures): failed or hook-blocked calls whose rows leave context and that no later call of the same command/file cleared. Newest 8, about 500 tokens. It is carried across compactions (parsed back from the record) and cleared when a later call succeeds. Declined calls are left out; one policy block stands for every call it met.
- vs mask3-250: +2.4 (13↑ 0↓), holdout +5.1 (6↑ 0↓), chain +3.9 (18↑ 0↓), context +1%. vs grp: +2.6, holdout +6.1, chain +6.3, context -13%. vs HEAD: +2.7, holdout +6.3, chain +9.5, context -18%.
- Caveat check: no item lost on any track. Most of the gain is the failures gate; outside it, a few identifier, files-edited and chronology items. --behavior not run (it calls models on changed contexts); say if you want it.
- Dir /tmp/omv-code/fail11. Worktree commit 9b207eb (branch i10-failures, on top of I9 223d60b). Diff: /tmp/omv-code/i10-failures.diff (register.ts, vcc.ts, tests/vcc.test.ts). claude plugin test: 346 pass, 3 fail, the same 3 grp-inherited source-range tests as before.
- Next: I28 pin-lifecycle.
