# phase2-refl ab1: I20 reflect-early (r28) and I22 refl-why, screened at --samples 1

Run: `ab --a /tmp/omv/grp --b /tmp/omv-refl/r28,/tmp/omv-refl/why,/tmp/omv-refl/r28why --samples 1 --jobs 12 --no-holdout --record` (3m43s with --jobs 12). Output /tmp/omv-refl/ab1.txt, ab1.json.

| arm | plugin dir | main Δ | chain | chain Δ vs grp | unique items up/down (p) | ctx mean / max | Reflector calls (in/out) | model tokens |
|---|---|---:|---:|---:|---|---|---|---:|
| grp (A) | /tmp/omv/grp | 75.0 | 68.9 | 0 | – | 38k / 65k | 1 (38k / 4.6k) | 1777k |
| r28 (I20: 28k/14k/8k) | /tmp/omv-refl/r28 | 0 (exact) | 71.5 | +2.6 | 3 / 22 (p=0.00016) | 35k / 52k | 3 (81k / 9.0k) | 1825k (+3%) |
| why (I22 prompt) | /tmp/omv-refl/why | 0 (exact) | 69.1 | +0.2 | 0 / 2 (p=0.50) | 38k / 65k | 1 (38k / 3.4k) | 1777k |
| r28why (both) | /tmp/omv-refl/r28why | 0 (exact) | 71.4 | +2.5 | 3 / 21 (p=0.00028) | 35k / 52k | 3 (81k / 9.1k) | 1825k |

Against HEAD (chain 65.8): r28 +5.7, why +3.3 (grp's own +3.1 included).

## What the numbers mean
- **r28's +2.6 is all budget fit, and recall pays for it.** Budget 17→22 of 31 cuts under 40k, tokens 20.0→23.8, max context 65k→52k, mean -8%. But chronology falls 50.7→43.2 (-7.4, 103 item×cut flips down) and identifiers 43.7→41.4, and unique items go 3 up and 22 down, a significant sign test. Two reflections instead of one (after boundaries 12 and 26), each condensing ~16k into ~3k.
- **I22 (the prompt) does not help.** Loss measured straight from the reflection's input and output (/tmp/omv-refl/drops.ts, the 46 rubric facts the input held): grp loses 22, why loses 25 (decisions 7 → 9). On the r28 base, the first reflection improves (19 lost → 12), but the second loses 31 of 48, against r28's 25 of 41: it re-condensed the decisions the first had kept (thinking-low, haiku-not-faster, no-subagent-threshold). Wording can't keep facts at a 6x squeeze, and the chain rubric has no rationale/lessons gate to reward it. **why: dropped.**
- **The cause is structural.** The loss comes from compression ratio (~16-22k to 2.3-3.6k) and from condensing reflected lines a second time (I25 evidence: all 8 facts held only by reflected lines are lost).

## Verdict and next step
- r28: **close call, not kept on its own.** It fixes the budget, but a significant recall loss comes with that. It's the base for I25.
- why / r28why: dropped.
- Next: I25 tier on r28 (/tmp/omv-refl/tier, built), screened at --samples 1. Then I6 or I23 per your order.
