# I44b2 users-short: kept (code lane)

Plugin dir: /tmp/omv-code/b5u3s8r6 (base5 + I44b2). Diff: /tmp/omv-code/i44b2-users-short.diff (capUserMessages in register.ts, plus register tests).

Change: the all-user-messages section keeps the brief at its old 8k cap. After the brief:
- the newest prompts are kept within 3k (at least the 2k newest reserve);
- past that, the last three prompts stay whole within 6k;
- every prompt of 400 chars or fewer stays whole within 8k.

One omitted-count line marks each dropped run. Before, long pastes filled the 10k cap and pushed out the short corrections, asks and approvals.

Against base5, post-12:05 rubric:
- main 0 (exact), holdout 0, chain +0.3.
- long +1.8 (32 up / 3 down). Corrections 363→514/516, verbatim 258/258, facts +2.3, asks 48/48.
- recall-aware 43.4→43.9.
- Long mean context +0.3%, main unchanged. So this is a quality fix, not a size bound.

Controls:
- A 600-char cutoff keeps corrections at +19.6 (vs +20.7 at 400), so the gain doesn't depend on the rubric's 400 limit.
- The recovered messages are the user's real prompts.

Size-leaning alternatives: b5u2s4r6 (long +3.2, context -4.6%) and b5u2s6r6 (long +2.4, context -2.1%).

Tests: claude plugin test 358/0.
