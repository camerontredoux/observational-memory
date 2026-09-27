# supersede: hide an older status report that a newer one repeats

Branch `exp-supersede` (commit 394134e) on v151 (f2afcdf), worktree `.scratch/par/supersede`.

## Change

- `hooks/supersede.ts` (new): `superseded(lines)` returns the index of each older 🟡/✅ status line that a newer line hides. A status line only reports where something stands, such as a PR's checks, a server's HTTP status or a task's hold. The newer line must report the same subject (PR or issue number, URL, `localhost:port`, slug, path, run id). It must also repeat every specific of the older line, and the older line can have at most `SUPERSEDE_OWN_WORDS` (4) words of its own. A line is never hidden if it has a reason, decision, failure, finding, request, question or quote. The module is deterministic and makes no model call.
- `hooks/register.ts`: `shown(entries)` applies the filter when the observations are rendered, in the normal render and in the "source ranges left out" cut. `ledger.entries` does not change. The Observer and Reflector prompts do not change, so every Observer/Reflector cache key stays the same.
- Tests: `tests/supersede.test.ts` holds the unit rules. `tests/register.test.ts` has "an older status report a newer one repeats is left out of the memory". `claude plugin test`: 390 pass. `tsc`: only the expected `*.local.ts` errors.

Known gap: the filter runs even when the ledger is not stored with the memory message (a non-persistent context or a precompute). In that case the next compaction rebuilds the entries from the memory message with `fresh()`, and the hidden lines are lost for good. The comment "the ledger keeps it" is then wrong. saiddup avoids this with a `stores && installs` guard, and this branch has no such guard.

## Measurement

Command, run under `.scratch/bench.lock`:

```
bun scripts/bench-compact.ts ab --a v151 --b .scratch/par/supersede --samples 2 --behavior --long --jobs 8 --record --json .scratch/par/supersede-out/ab.json
```

The output is in `.scratch/par/supersede-out/` (`ab.md`, `ab.err`, `ab.json`). Earlier attempts failed in the ENOSPC, out-of-memory and DNS outages. This run had no failed calls. All Observer/Reflector calls came from the cache, and they are the same for A and B (same cache keys), so every difference is deterministic.

Lines hidden: `.scratch/par/supersede-out/count.ts` applies `superseded()` to the `<observations>` of A's replayed contexts. B's contexts give 0, which confirms that the filter ran.

| track | cuts (per sample) | lines hidden (samples 1 / 2) | tokens hidden per cut | % of mean context |
|---|---:|---:|---:|---:|
| om-orchestration | 5 | 0 / 0 | 0 | 0 |
| om-v04 | 9 | 0 / 0 | 0 | 0 |
| firstmate-11 | 11 | 7 / 5 | 14–25 | ~0.1% |
| holdout (firstmate-6, crew-uspa-4, crew-opie-4) | 14 | 1 / 0 | ~2 | ~0 |
| chain (4 sessions) | 31 | 24 / 0 | ~27 | ~0.1% |
| long (13 sessions) | 80 | 109 / 101 | ~41–43 | ~0.1% |

(Tokens are chars/4.) The long chain renders about 340 status lines per cut, and the filter hides about 1.3 of them.

Before and after:

| | A (v151) | B (supersede) |
|---|---:|---:|
| retention total | 83.8 | 83.8 (0 flips) |
| holdout | 83.9 | 83.9 (0 flips) |
| reflection chain | 81.3 | 81.4 (0 flips) |
| long chain | 64.3 | 64.4 (0 flips) |
| long recall-aware | 37.8 | 37.8 |
| behavior (probes passed) | 77.4% | 77.5% |
| mean context tokens | 21k (long 43k) | same (−0%) |
| critical-path calls | 2 | 2 |

Behavior: 797 of 894 probes got the same context. B was worse on 2 probes and better on 3. Each side had 138 probes on which the samples disagreed. So +0.1 is inside the reader's noise floor (±2.5).

Hide quality: most hidden lines are correct, for example "✅ PR #1417 checks were green" hidden by a later line that repeats it with more detail. A few hidden lines lose a detail:

- "✅ Assistant verified USPA PR #238 is open, mergeable, and all substantive checks passed; the PR implements option C for issue #202's drug-test quota" is hidden by "🟡 Assistant reported that USPA PR #238 was green but awaiting the captain's drug-test quota …". The detail "option C" is lost.
- "✅ Verified: Gorman PR #1417 completed local validation, documentation, and style checks; GitHub CI had started" is hidden by a line about PR 1424 and the PR 1417 production dump.

## Verdict

Don't land. No gate moves, behavior is inside the noise, and the size saving is about 0.1% of the context (about 40 tokens per cut on the long chain, 0 on om-orchestration and om-v04). The filter hides a few lines whose detail the newer line does not repeat. It also needs a `stores && installs` guard before it can be safe in the non-persistent path. The cost is a 108-line heuristic module with no measurable benefit.
