# phase2-refl: queue entries to paste into docs/plans/compaction-ideas.md

The worktree isolation guard refuses my edits to the main checkout's compaction-ideas.md (Edit tool: "Edit the worktree copy of this file instead of the shared-checkout path"). I did not work around it. Please paste these (replace I20's status line, add I22/I23 after it; renumber if taken).

### I20 reflect-early (E5): start the Reflector at 28k instead of 40k. trying, lane reflector (full tier, chain)
- **Evidence:** on the chain, observations reach 32k before the first reflection, and 14 of 31 cuts go over the 40k budget.
- **Variants:** /tmp/omv-refl/r24, r28, r30, r32 (REFLECT_AT/TARGET/KEEP 24/12/7k, 28/14/8k, 30/15/9k, 32/16/10k), on I3 grp.

### I22 refl-why: the Reflector keeps decisions' reasons and failures' causes. trying, lane reflector
- **Idea:** rank "decisions with their reasons, approaches tried and dropped or failed, with why" second in the Reflector's keep list (it was last, inside "the arc"), tell it a merged line keeps them in a few words, and replace the harder levels' "outcomes and cues only" with "outcomes, decisions with their reasons, failures with their causes, and cues".
- **Evidence (measured on the grp chain, model-free, /tmp/omv-refl/drops.ts):** the one reflection (after boundary 19) condenses 452 notes (~22.4k tokens) into 31 lines (~3.6k), 6x. Of the 46 member rubric facts its input held whole, it loses 22: decisions 7 of 13 (haiku-not-faster, no-subagent-threshold, neg:c029150-dropped, why:timeout-not-retried, assistant-model, herdr-panes, why:lanes), facts 7 of 17, chronology 7 of 14, approvals 1 of 2.
- **Change:** `hooks/prompts.ts` REFLECTOR_SYSTEM_PROMPT and REFLECTION_GUIDANCE. Variant /tmp/omv-refl/why.
- **Test tier:** chain, `--record --samples 2`; main and holdout must replay exactly.
- **Risk:** longer reflected lines, so a reflection over its target retries at a harder level. Watch Reflector calls and tokens.

### I23 refl-share: the Reflector's target scales with what it condenses. proposed, lane reflector
- **Idea:** today the Reflector gets what the fixed 20k total leaves after the 12k kept recent notes and the 🔴 lines (~7.5k for 22.4k of input), and Luna lands near half of that (3.6k; the floor is 0.4). Give it a target that is a share of its input (say 30 to 35%) and start it sooner (I20), so the memory after a reflection is no bigger than now.
- **Evidence:** the 6x compression above is where the chain's lost facts go; the 12k kept recent notes are never condensed.
- **Change:** `maybeReflect` in `hooks/register.ts`: the target and the floor. Test tier: chain, `--record --samples 2`.
- **Risk:** a bigger reflected block raises context size; the earlier start or a smaller keep must pay for it.
