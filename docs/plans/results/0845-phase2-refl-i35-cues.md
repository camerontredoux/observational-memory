# phase2-refl: I35 dropped-path clause cues (lane reflector)

**What it is:** after a reflection is accepted, each path that the condensed notes name but the Reflector's reply leaves out (checked by last path segment) comes back as the clause of the latest note that named it, at that note's time, r-marked (tier pass-through). Most-named paths go first, capped at REFLECT_CUE_TOKENS = 300. There is no model call and the Reflector input doesn't change: this is deterministic post-processing (`withDroppedPaths` in register.ts, one call right after the level loop).

## Results (fixed rubric, samples 2, chain + holdout + main)

| B vs A | main | holdout | chain | unique items on the chain | ctx mean/max on the chain | Reflector in/out | model tokens |
|---|---|---|---|---|---|---|---|
| base3+I35 vs base3 (ab9, rechecked on the live base3 in ab10 with 0 model calls) | 77.3, exact | 79.7, exact | 81.5 → 81.5 (chronology +1.0, 22↑ 0↓) | 1 up / 0 down | 34k/57k, same | same | same |
| base3+r28+I35 vs base3 (ab9, your requested final test) | exact | exact | 81.5 → 83.7 (+2.2; tokens +6.4, budget +2.3 (56/62 vs 44/62 cuts), identifiers -1.1, chronology -0.4) | 6 up / 17 down, p=0.035 (favors A) | 31k/47k vs 34k/57k | 51k/6.1k vs 43k/5.9k | +0.4% |
| I35 (tierb+cues) vs tierb, s1 screen (ab7) | exact | – | 75.9 → 76.6 (chronology +10.1) | 11 up / 2 down, p=0.022 | same | same | same |
| I35 vs grp (ab8, s2) | 74.4, exact | 73.5, exact | 73.7 → 77.1 (+3.4) | 6 up / 17 down | 35k/52k vs 38k/65k | 51k vs 43k in | +0.4% |

On r28 thresholds, the cues win back most of the chronology that re-condensing lost: tierb vs grp is chronology -6.9, and I35 vs grp is -0.4. The 17 unique items that still regress all fall at cuts @13-@21, where r28 has already reflected and grp/base3 still hold those notes raw. That is the cost of reflecting early, and a 300-token cue can't fully pay it back.

## Verdict
- **base3 + I35 at 40k: KEEP.** No change on main or holdout, 1 up / 0 down on the chain, no efficiency cost (≤300 tokens, no model call), deterministic. Tests: `claude plugin test` on live-base3+I35 gives 351 pass, 1 fail, and the one failure ("a memory over its budget with source ranges…") also fails on live base3 (350 pass, 1 fail). The new test fails without the change. Typecheck is clean.
- **base3 + r28 + I35: not kept under the unique-item rule** (6 up / 17 down, p=0.035). It is your call as an efficiency trade: mean context -9%, max context -18%, budget 44→56 of 62 cuts, and chain +2.2, at the cost of per-item retention at @13-21.

## Files
- Patches against the live base3 (with NO_SOURCE): `/home/cameron/work/mods/observational-memory/.claude/worktrees/agent-af7a4f8405d9357d6/.scratch/i35-cues.base3.register.patch` (61 lines), `.../.scratch/i35-cues.base3.test.patch` (29 lines).
- Plugin dirs: `.../.scratch/b3now-i35` (live base3 + I35), `.../.scratch/b3r28i35` (base3 + r28 + I35), `.../.scratch/i35` (tierb + I35).
- Bench outputs: `.../.scratch/ab7.txt`, `ab8.txt`, `ab9.txt`, `ab10.txt`.

## Next
If you want the r28 efficiency without the @13-21 losses, the next thing to try is raising REFLECT_CUE_TOKENS on the r28 variant only (for example 600), or lowering the r28 KEEP less (28k/14k/10k), so the notes that reflecting early condenses stay raw longer.

Note: my ab8 was launched twice by accident, because the first launch's tool result was lost. The two runs overlapped for a few minutes. The second was served from the first's cache, and the results are consistent.
