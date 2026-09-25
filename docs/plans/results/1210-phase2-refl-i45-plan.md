# phase2-refl: I45 plan (Reflector trigger and target scaled down for the long chain)

Base: base5 (`.scratch/omv-code/base5`, copied to /tmp/omv-refl/b5). Variants: /tmp/omv-refl/<name>.

## What base5's long chain shows (run b5ad5a0f39-long, parts per cut)
- Mean context 45.7k per cut. Observations are the largest part: 22.6k mean, a 15k→34k sawtooth. The other parts on cuts 21–80: user messages ~9–10k, raw tail ~9k, corrections 2–6k (growing), continuation ~1k.
- 40k ledger tokens renders to ~31k in the observations section (grouped sources). A reflection lands at 17–21k.
- The 18 Reflector calls are 6 reflections plus 12 retries. Two whole episodes (4 calls each, ~30k in) failed as "no reflection between ~2.5k and ~6.3k": with 26 🔴 lines and 12k kept, the model's room was 6.3k, and it answered ~2.4–3k each time. The retry path keeps the level at 1 when a reply is too short, so it resends the same prompt.
- Because the budget item scales the whole total over 40k, most cuts from 18 on are penalised.

## Arms (Reflector constants only; Observer input unchanged, so only Reflector calls are fresh)
1. l32: AT 32k / TARGET 16k / KEEP 10k / TIER 5k
2. l24: AT 24k / TARGET 12k / KEEP 7k / TIER 4k
Then, depending on the curve:
3. goal-scaled trigger: AT falls as the carried corrections grow (AT = clamp(k − corrections tokens, lo, 40k)), so the observations shrink while the other parts grow day by day.
4. too-short retry fix: a reply under the floor retries with an explicit "keep more" instruction, not the same level-1 prompt (fewer wasted ~30k-input calls).

## How I'll judge it
- One `ab --long` (chain + main + holdout) at a time, s1 screen. Then s2 on the chain for the best arm (the Reflector's output changes).
- Bars: main and holdout exact (main never reflects at ≥24k; I'll confirm). The long total, recall-aware credit, and the lost-* gates must hold. Mean and max context must fall. Reflector tokens in and out must not rise much: expected lower, since a smaller input and fewer failed retries outweigh more reflections.
- Known risk: on the 4-session chain, r28 lost unique items (chronology/identifiers at @13–21 from reflecting earlier). With I35 cues and tiering in base5, that should be smaller. I'll report the chain's unique items apart.
