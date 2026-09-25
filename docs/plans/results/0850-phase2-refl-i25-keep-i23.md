# phase2-refl: I25 is ready to keep (on grp, full-tested); I23 share is informational; r28's full test

## I25 refl-tier on grp's 40k thresholds: KEEP candidate (full test passed)
- **Plugin dir:** my worktree /home/cameron/work/mods/observational-memory/.claude/worktrees/agent-af7a4f8405d9357d6 (grp + I25). Patches: .scratch/omv-refl/i25-tier.register.patch (hooks/register.ts, +7 lines) and i25-tier.test.patch (one new test).
- **Change:** an entry the Reflector wrote carries `r: true`. A later reflection passes those lines through unchanged (in time order, like 🔴 lines) while they total ≤ REFLECT_TIER_TOKENS = 6k, and condenses only the notes. Past 6k they're condensed again, so the reflected block stays bounded.
- **Full test** (`ab --a grp --b <worktree> --samples 2 --jobs 12`, .scratch/omv-refl/ab5.txt): main 74.1 → 74.1, holdout 73.5 → 73.5, chain 69.3 → 69.3, all **exact**, 0 fresh calls. At 40k the chain reflects once, so no reflected line exists yet and I25 changes nothing on the bench. Efficiency is identical.
- **What it buys** (measured with r28's thresholds, where the chain reflects twice): reflection 2 loses 15 of 55 memory facts instead of 27, and 0 of the 8 held only by the first reflection's lines instead of all 8. It needs one fewer Reflector call (r28 retried) and adds +1.7k of memory after reflection 2. The chain rubric doesn't show this: facts is 294/301 in every arm.
- **claude plugin test:** 346 pass, 3 fail. The same 3 fail on grp alone (they expect a per-line `(source …)` trailer, which grp groups): "observes in the background after turn.complete…", "the user's corrections are quoted in their own section…", "a memory over its budget with source ranges…". They belong to grp's change and need updating when grp lands. The new test "a later reflection passes an earlier reflection's lines through as they were, and condenses only the notes" passes with I25. On grp without I25 the register test file doesn't complete.
- Types: clean apart from the expected fixture errors.
- **Verdict: keep I25** (a safety change: bench-neutral at today's thresholds, and it fixes the second-reflection loss #21 was about). **I6 closes.**

## r28 (I20) full test (--samples 2, holdout, .scratch/omv-refl/ab3.txt): not kept
- tierb (r28 + I25) vs grp: chain 69.3 → 72.2 (+2.9), r28 alone +3.0. Main and holdout exact. The bench says **"no verdict: the weighted score favours B, but the unique-item flips favour A (2 up, 22 down, p=0.00004)"**. The gain is budget fit (34 → 44 of 62 cuts ≤ 40k, max context 65k → 51k, mean -9%). The loss is chronology (-6.9) and identifiers (-1.7): the first reflection at @13 drops paths grp keeps until @19. Model tokens +0%.
- My read: reflecting earlier trades recall for budget. It's a policy call for you: the budget gate scales the total, yet the item flips go the other way.

## I23 refl-share (target ≥ 0.5 × input, on tierb), screen --samples 1 (.scratch/omv-refl/ab4.txt): informational, not kept
- Chain 71.1 (+2.2 vs grp, -0.3 vs tier). Main exact. Luna ignores the bigger target: at a target of 8k (was ~5.7k) it wrote 3.2k (was 2.6k). Memory after reflection 2 is 14.9k (tier 13.3k). Reflector 2 calls 50k / 7.5k.
- Facts lost: reflection 1 lost 11 of 46 (tier 19), reflection 2 lost 13 of 61 (tier 15 of 55). But r28why's first reflection also lost only 12 on a different prompt, so first-reflection loss swings 11 to 19 between single draws. Can't separate from noise at one sample, and the rubric doesn't score it. Not worth a second sample: the model doesn't use the room, so the lever is weak.

## Next
Remaining lever, proposed (lane reflector, **I26 refl-keep-ids**): the first reflection's item losses are paths and identifiers (hooks/stats.ts, /tmp/om-v043, .claude/types). A deterministic pass could re-attach, to the reflected block, identifiers that appear in the condensed notes but in no output line: a code-side list of dropped paths, capped at ~300 tokens, with no model call. I'll build and screen it on tierb unless you redirect.
