# phase2-refl: I45 threshold arms l32 / l24 on base5 (ab45a, s1, --long, chain, main, holdout)

Variants: /tmp/omv-refl/l32 (AT 32k / TARGET 16k / KEEP 10k / TIER 5k) and /tmp/omv-refl/l24 (24k / 12k / 7k / 4k). Everything else is base5. Output: /tmp/omv-refl/ab45a.{txt,json}. Long runs: b5 b5ad5a0f39-long, l32 69da3ff67b-long, l24 ef6a98b78a-long.

| | base5 | l32 | l24 |
|---|---:|---:|---:|
| main / holdout | 78.3 / 82.9 | exact | exact |
| chain total | 80.5 | 82.6 (+2.1; 3↑ / 12↓ unique, p 0.035) | 84.4 (+3.8; 5↑ / 14↓, p 0.064) |
| chain context mean / max | 35k / 51k | 33k / 52k | 29k / 44k |
| long total | 59.7 | 61.7 (+1.9) | 64.3 (+4.6) |
| long unique items | – | 19↑ / 76↓ (p 3e-9) | 15↑ / 75↓ (p 9e-11) |
| long recall-aware | 43.4 | 34.1 (−9.3) | 30.9 (−12.5) |
| long context mean / max (bench) | 44k / 67k | 40k / 58k | 36k / 57k |
| long cuts over 40k (my count) | 63/80 | 52/80 | 30/80 |
| long Reflector calls (fresh) | 18 (14) | 7 (7) | 12 (12) |
| long Reflector tokens in / out | 537k / 55k | 181k / 19k | 217k / 25k |
| long Reflector call time | 1064 s | 378 s | 527 s |
| long reflections installed / failed | 6 / 2 | 7 / 0 | 10 / 0 |

Reading:
- The totals rise only through tokens and budget: the budget item scales the whole total over 40k. Every content gate falls. On the long chain l24 loses commits −27.9, chronology −16.9, facts −7.9, decisions −7.7, reversals −5.4 and identifiers −3.3. The losses start at @25–35, where the earlier reflection first bites.
- Recall-aware credit falls too. A condensed line loses the subject words that "pointed" credit needs, so its source range stops helping. That loss is inherent to condensing more; the ranges can't recover it.
- Cost is the good part. The lower triggers use fewer and smaller Reflector calls: 181–217k in versus 537k, and half the call time. That is because no reflection fails at 24k/32k. base5's failures come from the 20k target: with the 🔴 lines and 12k kept, the model gets ~6k of room and answers ~2.5k, just under the 0.4 floor.

Verdict: rejected as built. Both arms fail the unique-item bar by a wide margin on the chain and the long chain, and recall-aware drops 9–12 points. Scaling the trigger down alone buys size by dropping content.

Next:
- Arm 4 (rt, the retry fix, on its own) is recording now: /tmp/omv-refl/ab45rt.
- If you want to try one more I45 shape (I'll wait for a go): shallow, frequent reflections. Trigger 28k, keep 14k, target 20k, so each pass condenses only ~6–12k of the oldest notes into ~3–5k (ratio ~0.4 rather than ~0.1). The sawtooth amplitude halves (mean ledger ~24k vs ~30k) with gentler condensing per pass. Risk: double condensing once the earlier reflections' lines pass TIER, so I'd make TIER count inside the target.
