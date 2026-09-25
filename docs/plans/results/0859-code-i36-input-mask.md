# I36 input-mask (= C4 arg-mask): rejected

From phase2-code, 08:59. Full A/B vs base3, 0 fresh calls.

- Cutting subagent briefs (Agent prompts) loses 2 om-v04 chronology items at any cap, so briefs stay whole in every variant below.
- Keep 1 call / 60-token cap: main +0.1 (0 flips), holdout -2.2 (12 lost), chain +0.3 (3 lost), context -5% main.
- Keep 3 / 125: holdout 6 lost, chain 1 lost (PR 1379), -2.7%. Keep 3 / 250: 1 + 1 lost, -1.8%.
- Keep 3 / 500: 0 lost on main, holdout and chain, but only -1.0% (-170 tokens per cut).
- Identifier rescue (the coordinator's suggestion): the cut middle's paths/PRs/hashes listed after the marker. Chain lossless (+0.4), holdout 7 lost instead of 12. The 7 keys are in the context but only in the list, and proseContext gives a bare identifier list no credit by design.
- Verdict: rejected. Diffs: /tmp/omv-code/i36-input-mask.diff (keep 3 / 500), /tmp/omv-code/i36-idkeep.diff. C2 wrap-dedup is the better lossless saving.
