# base3 known failures: 1 was a stale expectation, 1 is a real grp bug, 1 is a stale premise. Stopped as asked.

Tests edited in place in `.scratch/omv-code/base3/tests/register.test.ts`. hooks unchanged. base3.diff not regenerated yet. plugin test now: 348 pass, 2 fail.

## 1. "observes in the background after turn.complete…": stale, fixed

The test expected every line to carry the chunk's `(source …)`. grp puts it once, after the run's last line. I changed the expectation to show the trailer on the last line only. It passes.

## 2. "the user's corrections are quoted in their own section…": real grp bug in the carry-forward parse

I updated the first memory-message assertion to I14's day form (`@ 2026-09-22` / `* 🟡 14:30 Explored the auth module (source 14:30 to 14:31)`). That assertion passes.

The second assertion reads the memory back after the store is cleared, and it fails for a real reason. The first message renders:

```
* 🟡 14:30 Explored the auth module (source 14:30 to 14:31)   <- reflected line with its own source
* 🟢 14:30 filler detail 0 … 1000                            <- reflected lines with no source
* 🟡 14:30 read a file with a long name … (source 14:30 to 14:31)  <- kept lines
```

After `parseMemory`, every filler line has the kept lines' source. The next render then merges everything into one run, and the Explored line's trailer disappears. The cause is `hooks/register.ts:1020-1022` in parseMemory:

```ts
entries: parseLines(dated(observations), undefined)
  .map(splitSource)
  .reduceRight<…>((out, e) => [e.source || !out[0]?.source ? e : { ...e, source: out[0].source }, ...out], []),
```

Any line without a trailer takes the source of the next line that has one. That breaks `reflectedSource`'s rule (`register.ts:415-417`): a reflected line that gives no source, or one outside the span, gets none, because "the whole span would say nothing about where it came from". In the rendered grouped form, the text cannot tell "sourceless" apart from "in the next run". So every carry-forward from the memory message (store lost, anchor mismatch) attaches a source to Reflector lines that had none, and om_recall gets pointed at the wrong span. The unit bench doesn't catch it because the replays keep the ledger in the store.

A possible fix, for your call: renderGrouped writes a marker such as `(source none)` on the last sourceless line before a sourced run, and parseMemory reads it as no source. That costs a few tokens only at those boundaries. Or accept the attribution and change test 2 to expect the merged run.

## 3. "a memory over its budget with source ranges…": stale premise, not a bug, not yet fixed

With per-line ranges, 800 lines went from ~7k to ~16k tokens, so the 15k budget forced the "source ranges left out" cut. Under grp the one chunk is a single run with one trailer, so the memory fits with its range. The cut never fires, and the expectation (800 bare lines) fails on the one trailer.

To keep what the test checks, it needs a memory with many runs. One chunk can't produce that, and adding more chunks adds only one trailer each. The practical route is to carry forward a memory message whose lines alternate between two ranges. That goes through the same parseMemory path as bug 2, but it isn't affected by it, because every line would have a trailer. I held off until you decide on 2.
