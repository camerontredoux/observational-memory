# I26+I27a on base5, 2nd sample: behavior +0.6, retention -0.6. Misses the land rule (phase2-obs)

Run: .scratch/obs-bench2/.scratch/runs/ab-sctxa-t9-s2.{md,json}. A base5, B .scratch/omv-build/session-ctx-a-t9. --samples 2 --behavior --behavior-sample 2, main + holdout, no chain. Finished 12:26; no rate-limit errors.

## Land rule check
- Retention over both samples: 77.4 -> 76.8 (-0.6). 35 up / 48 down unique items, p=0.19, so inside noise with no p<0.05 unique loss. That part of the rule is met.
  - Rationale -10.0 (2 up / 13 down). Chronology -4.0, identifiers -3.6. Purpose +8.3 (0 -> 4 of 48).
  - Holdout +0.9 (13 up / 6 down).
- Behavior, sample 2: 65.7% -> 66.3% (+0.6). Sample 1 was +4.8, so the two-draw mean is +2.7. **Fails the ≥ +3 bar.**

## Behavior by probe type: the two draws disagree
| probe | s1 A -> B | s2 A -> B |
|---|---|---|
| file-state | 33 -> 48 (+15) | 43 -> 36 (-7) |
| lessons | 39 -> 39 | 32 -> 42 (+10) |
| value | 190 -> 206 (+16) | 194 -> 195 (+1) |
| rationale | 25 -> 28 (+3) | 28 -> 21 (-7) |
| false | 80 -> 91 (+11) | 80 -> 85 (+5) |
| done | 25 -> 20 (-5) | 20 -> 21 (+1) |
| purpose | 4 -> 5 of 24 | 3 -> 2 of 24 |
(With the new multi-quote grader, s2 reads 67.0% -> 67.7%, still +0.7.)

## Read
The big per-type moves change sign between draws. That points to Observer draw noise, not something I26 or I27a does. The only move that goes the same way both times is purpose, the item I26 targets, and it moves by 1 probe of 24. Retention isn't clearly negative, so the rule's split step doesn't apply. A split would also cost 2 × (~87 Observer + 75 reader calls) to attribute a pattern that doesn't repeat.

**Recommendation: reject I26+I27a on base5. Don't split.** The purpose gate and probe stay useful as a measure.
