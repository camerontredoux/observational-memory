# I38 wrap-dedup (C2), on base3 (builder-code)

The variant is at `/tmp/omv-build/i38-wrap-dedup`, a copy of base3 with the `(source none)` marker fix and I35 already in it. Its diff against base3 is `/tmp/omv-build/i38-wrap-dedup.diff`: `hooks/register.ts` and `tests/register.test.ts`, +65/-4 lines. The A/B output is `/tmp/omv-build/i38-wrap-dedup.ab.md` and `.ab.json`.

## What changed

- **`dedupWrappers(rows)`** runs over the raw tail the compaction returns, after `maskTail`:
  - It walks the tail newest first and looks only at injected wrapper rows (`INJECTED_WRAPPER`, the same test `typed()` uses).
  - An older wrapper row keeps its first line, its blank lines, and any line that no newer wrapper row repeats. It then ends with `(repeated lines as in the newer notice below; <hash of the original text>)`.
  - The newest copy of each notice stays whole.
  - A row is left as it was when the cut would not shorten it.
- **The cut and the budget do not change.** `tailTokens` is untouched, so the cut stays where base3 puts it, as in the simulator.
- **Restore, inside `unmask`:**
  - While reading the history, `unmask` also indexes wrapper rows by `hash(text)`.
  - A row that ends in the note is replaced by the history's row with that hash, provided the first line matches.
  - Wrapper rows have no `tool_use_id`, so the hash is the key. Identical copies can stand in for each other, which makes the row index unnecessary.
  - `loopHistory` and the live context both pass through `unmask`, so the Observer, the row hashes and the times all see the original text.
  - The hash costs about 3 tokens per shortened row.
- **Unit test:** `an older wrapper row in the raw tail keeps only the lines a newer one does not repeat, and reads whole again after the compaction`.
  - It checks the shortened form of the older notice and that the newest stays whole.
  - After the compaction, the background Observer reads both notices whole and never sees the note.
  - The next compaction is persistent and cuts at the watermark with no Observer call.
  - With the restore turned off, the test fails: the Observer gets the note.

## Checks

- `bunx -p typescript tsc -p .`: only the 6 missing-fixture errors.
- `claude plugin test`: 353 pass, 0 fail.

## Cached A/B vs base3 (`--holdout --chain`, 0 fresh calls on every track)

| track | base3 | I38 | Δ | unique flips | tokens per cut |
|---|---|---|---|---|---|
| main | 77.9 | 77.9 | 0 (exact) | 0↑ 0↓ | 17,721 → 17,551 (−170) |
| holdout | 79.28 | 79.33 | +0.05 | 0↑ 0↓ | 19,325 → 19,139 (−187) |
| chain | 81.45 | 81.64 | +0.19 | 0↑ 0↓ | 33,541 → 33,320 (−221) |

The simulator predicted −173 / −189 / −226. The holdout and chain gains all come from the size slope of the tokens gate; no whole item flips. Efficiency is "same" at −1% mean tokens. The max per cut and the model tokens do not change.

## Verdict

Kept. It loses no item on any track, saves about 1% of context on every track, and the restore keeps the Observer and the ledger on the original rows.
