# phase2-obs: I48 reports-first on base7 (samples 1): rejected

Run: `ab --a base7 --b reports-mark,reports-rep --record --samples 1 --no-chain --behavior --jobs 12`. Output: `.scratch/runs/ab-i48-s1.{md,json}`.

| arm | main Δ | unique ↑/↓ | p | holdout Δ | behavior | efficiency |
|---|---:|---:|---:|---:|---:|---|
| reports-mark | −0.9 | 27/39 | .18 | +1.6 (12↑ 2↓) | 67.4% → 68.1% (+0.7) | same |
| reports-rep | −0.7 | 20/32 | .13 | +1.1 (8↑ 1↓) | 67.4% → 69.9% (+2.5) | worse (Observer input) |

The main noise floor is A′ −1.9, so both main deltas are inside noise. Neither arm meets the keep rule (main ≥ +1.5 with no significant unique loss, or behavior recovering ≥ 2 of brief-pinned / skill-stub / usage without losses).
- Of the target probes, only brief-pinned is recovered, and only by reports-mark (@3–@9).
- Both arms lose 6 done probes (25 → 20 of 28).
- purpose falls 4 → 1 in reports-mark.
- reports-rep's +2.5 behavior comes mostly from value and file-state. It also costs extra Observer input.

Verdict: reject I48 (both arms). Both pass tsc and plugin tests 360/0. The variant dirs are `.scratch/omv/reports-mark` and `.scratch/omv/reports-rep`.
