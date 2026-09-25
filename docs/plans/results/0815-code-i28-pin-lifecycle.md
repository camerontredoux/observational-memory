# I28 pin-lifecycle: kept (robustness; no benchmark change at the real cap)

Dir: /home/cameron/work/mods/observational-memory/.scratch/omv-code/pin3 (fail11 + I28). Commit 2f3bf13 on branch i28-pins (atop I10 9b207eb). Diff (register.ts only): .scratch/omv-code/i28-pins.diff.

## Change (hooks/register.ts)
- Cliff 1, constraints over CONSTRAINTS_MAX_TOKENS (8k): no more OVER_CAP throw to the built-in compaction. `boundPins` renders the oldest as index lines, e.g. `🔴 User: "Leave module 0 as it is, and do not touch…" (older constraint, shortened: om_recall "Leave module 0 as it is,")`. Lines that share 2+ terms with the current task or raw tail, then the newest, go back whole while they fit. A line no longer than its index line stays whole. The ledger keeps every line whole; only the rendering shortens.
- Cliff 2, the Reflector's 🔴 share: 🔴 lines plus the kept newest notes are bounded to REFLECT_TARGET - REFLECT_MIN_TARGET_TOKENS (2k), so the Reflector always gets at least a 2k target. Over that share the older 🔴 lines shorten the same way; still over, the oldest go to the Reflector with the rest. It logs `the 🔴 lines were over their share of the reflection target: N shortened, M condensed`.

## Results (full: main + holdout + chain, 0 fresh calls)
| variant | vs fail11 main | holdout | chain | efficiency |
|---|---:|---:|---:|---|
| pin3 (8k cap) | 0 (exact) | 0 | 0 | same |
| cap1k-pin3 (cap lowered to 1k so overflow fires) | 0 | 0 | +0.4 (tokens +0.5, budget +0.4; 0↑ 0↓) | same (chain max 60k→59k) |
pin3 vs grp: +2.6 (13↑ 5↓), holdout +6.1, chain +6.3. vs HEAD 5836aba: +2.7, holdout +6.3, chain +9.5. These are fail11's numbers, since pin3 grades the same.

- The corpus never reaches either cliff at the real caps: constraints peak at ~2.7k tokens (chain cut 31), and the 🔴 share log never fires. The benefit is for longer sessions, the ones the goal targets. It is proven by two new unit tests, one per cliff. On the old code the constraint test falls back and the reflection test throws.
- At the 1k cap, chain cut 31 shows 19 shortened constraints, and the constraints gate still passes 446/446. So that gate can't see shortening, which means it isn't evidence that a lower cap is safe. I kept 8k.
- Fixed while testing: the shortening now handles `\"` inside quotes and literal `\n` in constraint text.

## Checks
- claude plugin test: 347 pass, 3 fail (the base's 3 known grouped-range failures). Replaced the "falls back over the cap" test and added the Reflector-share test.
- tsc: only missing-fixture errors.
