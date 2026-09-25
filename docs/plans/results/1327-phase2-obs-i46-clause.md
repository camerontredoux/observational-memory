# I46 clause-carry vs base5: retention +1.7, 0 items lost, but misses the target-probe bar (phase2-obs)

Run: .scratch/obs-bench2/.scratch/runs/ab-i46-behavior.{md,json}. A base5; B .scratch/omv/clause-line and .scratch/omv/clause-code. --samples 2, main + holdout, no chain, --behavior on sample 2, with the new multi-quote grader. No fresh Observer calls: the clause is added by code after the reply, so the Observer cache keys don't change. 144 reader calls, no rate-limit errors. Both variants: tsc clean, plugin tests 357/0. Diffs: tmp/i46/clause-line.diff, tmp/i46/clause-code.diff.

## What it does
Code scans the chunk's assistant sentences for a reason or qualifier marker ("because", "would take", "over your cap", "Cause:", "Why not ...:", ...). It keeps a sentence when it names a specific (a $ or % figure, "N in M", #id, hash, `code`, file) or 3+ words that the Observer's lines don't already hold. At most 2 clauses per chunk, each ≤25 words, verbatim from that chunk's rows, so the chunk's source range (and pointed()/om_recall) still covers it. Deterministic.
- clause-line: each clause becomes its own `🟡 HH:MM Assistant said: "..."` line, at its time.
- clause-code: appends the clause to the best-matching observation line.

## Results
| | clause-line | clause-code |
|---|---|---|
| main retention (2 samples) | 77.4 -> 79.0 (+1.7), 9 up / **0 down**, p=0.004 | 79.1 (+1.7), 10 up / **0 down**, p=0.002 |
| holdout | +0.1, 2 up / 0 down | +0.1, 2 up / 0 down |
| context, main mean | **+4%** | +3% |
| behavior, all probes | 67.0% -> **68.9%** (+1.9) | 67.2% (+0.2) |
| behavior rationale | 32 -> 38 of 55 | 32 -> 39 |
| behavior lessons | 36 -> 38 of 49 | 36 -> 38 |
| behavior file-state | 43 -> 53 of 79 | 43 -> 47 |
| behavior multi-hop | 22 -> 21 of 44 | 22 -> 18 |
| behavior value | 194 -> 193 of 286 | 194 -> 189 |
| **target items recovered (bar ≥ 6 of 17)** | **4** (1 worse) | **5** (1 worse) |
| negative control, foreign passes | 7 -> 7 | 1 -> 1 |
Retention gates that moved: rationale +19.1, lessons +8.2, file-state +7.6, tokens -2.6. Nothing else moved.

## Target items (probe cuts passed, base5 -> clause-line / clause-code)
Recovered: why:pin-new 0/3 -> 3/3 / 3/3; neg:close-tag-prompt 1/4 -> 4/4 / 4/4; why-pm-assigned-only 1/6 -> 6/6 / 5/6; neg-address-split 0/2 -> 1/2 / 1/2; why-imports-not-codex 0/2 -> 0/2 / 1/2 (clause-code only).
Not moved: multi-accounts-sign 0/5, brief-pinned 0/7, skill-stub 0/4, usage 1/3, opus-round 2/4, no-luna-kept-out 0/1, password-exposure 0/2. why-sign-permission goes 1/6 -> 0/6 on clause-line; neg-session-cookie goes 3/4 -> 2/4 on both.
Two targets (cut-builtin-recall-new 2/2, tool-search 1/1) already pass on base5's sample-2 draw, so this draw leaves 15 to recover.

## Read
- Retention: a clean win. +1.7 over two samples with zero unique losses on main and holdout.
- The rubric's rationale +19 is much bigger than the reader's +6/+7. Some of that rubric credit is for the carried assistant sentence itself. This is the padding concern from the plan, so I judge on behavior.
- By the bar you set, I46 misses: 4-5 target items recovered against ≥6. clause-code meets ≤+3% but its overall behavior is flat (+0.2). clause-line has the better behavior (+1.9) but costs +4%.
- The recovered items are the report-reason ones I46 was built for: pin-new, close-tag-prompt, pm-assigned-only. The misses need what I47 targets (multi-accounts-sign, an open question to the user) or facts outside a reason sentence (brief-pinned, skill-stub, usage).

**Recommendation:** don't land it on the bar as set. If you'd trade the +1% overshoot for +1.9 behavior and +1.7 retention with no losses, clause-line is the candidate; its cost is deterministic. Otherwise it's rejected, and I'll move to I47 open-asks (fresh Observer calls, samples 1).
