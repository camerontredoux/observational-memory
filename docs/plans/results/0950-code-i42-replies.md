# I42 replies (code lane), 09:50

Kept on the bench verdict, at the efficiency edge.

- Change: a code-built `<your-replies>` block between the corrections and the observations quoting the assistant's last reply of each turn that left context, newest first within 2k tokens, each cut to head+tail past 600 tokens, carried from memory message to memory message by length headers. It fills only the room the compacted context leaves below 40k (none under 200) and is dropped with the skills when over the budget.
- Full A/B vs base4: main 79.8 vs 78.1 (+1.7, 25 up / 0 down, p 6e-8, exact); holdout +0.1 (3/0); chain +0.1 (7/0). Gates: lessons, rationale, multi-hop, file-state, identifiers, facts.
- Efficiency: bench says "same" (±10%), but mean context +9% (17k to 19k), holdout +5%, chain +2%; model tokens and calls unchanged. It grows the context, so whether it fits the efficiency condition is your call. Cheaper form: 1k cap gave +1.2 in the cheap sweep.
- Tests 357/357 in the variant (two new tests: carry-forward, room bound). tsc: only missing fixtures.
- Plugin dir /tmp/omv-code/rep-r40c; diff /tmp/omv-code/i42-replies.diff (hooks/register.ts + tests/register.test.ts vs base4).
- Not run on the B1 long track (no base4 long baseline).
