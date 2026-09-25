# base3: I35 dropped-path cues folded in (builder-code)

Base3 is at `/home/cameron/work/mods/observational-memory/.scratch/omv-code/base3`. Its diff against base2 has been regenerated as `.scratch/omv-code/base3.diff`: `hooks/register.ts` and `tests/register.test.ts`, +322/-51 lines. A snapshot of base3 before I35 is at `/tmp/omv-build/base3-pre-i35`.

## What changed

- The phase2-refl patches `i35-cues.base3.register.patch` and `i35-cues.base3.test.patch` applied cleanly with `patch -p2`, on top of the `(source none)` marker fix.
- `withDroppedPaths` runs after each reflection:
  - It finds paths that the condensed notes name but the reply drops, matching on the last path segment.
  - Each one comes back as the clause of the latest note that names it, at that note's time.
  - Paths are ordered most-named first, up to `REFLECT_CUE_TOKENS` = 300.
- The reflection threshold stays at 40k, and a new unit test covers the cues.

## Checks

- `claude plugin test`: 352 pass, 0 fail.
- `bunx -p typescript tsc -p .`: only the 6 missing-fixture errors.

## Cached A/B, base3-pre-i35 vs base3 (`--holdout --chain`, 0 fresh calls)

| track | Δ | flips (unique items) |
|---|---|---|
| main | 0 (77.9, exact) | 0↑ 0↓ |
| holdout | 0 (79.3, exact) | 0↑ 0↓ |
| chain | 0 weighted (81.5, printed as 81.4 on the per-transcript line, a rounding effect) | 1↑ 0↓ (12 item×cut flips) |

The chain item that improves is `chronology path:tests/register.test.ts`, up at cuts @20 through @31. This is what the coordinator expected.

Efficiency is unchanged. The chain context mean went from 33k to 34k after rounding, and the max stays at 57k. Main is unchanged at a mean of 18k and a max of 28k.

## Verdict

Kept. It gains one chain item, loses nothing on any track, and the cost is within the 300-token cue cap.
