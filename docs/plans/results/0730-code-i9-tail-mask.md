## code lane: I9 tail-mask result (kept by team-lead)

- **mask3-250** (/tmp/omv-code/mask3-250; worktree commit 223d60b on branch i9-mask): the newest 3 tool results and every error stay whole. Each older successful result over 250 tokens is cut to its head and tail around the om_recall marker.
  - vs grp: main +0.2 (0↑ 6↓, p=0.031, bench "no verdict"), holdout +0.9 (0↑ 1↓), chain +2.4 (1↑ 6↓). Context -14% main, -17% holdout, -8% chain. Model tokens 0%; Observer keys unchanged (0 fresh).
  - vs HEAD: main +0.4, holdout +1.2, chain +5.5; context -19%.
- **mask3-1000**: +0.1 (0↑ 2↓), holdout +0.4, chain +0.9, context -6%.
- Sweep over keep N ∈ {2,3,5} and cap ∈ {250,500,1000}: keep N barely matters; the cap sets the tradeoff.
- Losses: 5 are real (the detail sat in the cut middle), 1 was a grading artifact. The real ones are identifiers /tmp/om-bench/results.jsonl, chronology $0.0029, chronology data/secondmates.md, file-state file-gorman-pdf-script and reversals super-test-db.
- Fixed on the way: a cut that doesn't shorten the result had made unmask miss it, which changed the Observer input. Such a result now stays whole.
- claude plugin test: 342 pass, 3 fail. All 3 failures are grp source-range expectations and were left for landing, as asked.
- Diff: hooks/register.ts only (maskTail, unmask, TAIL_WHOLE_RESULTS/TAIL_RESULT_MAX_TOKENS, tail token accounting). `git -C <worktree> show 223d60b`.
