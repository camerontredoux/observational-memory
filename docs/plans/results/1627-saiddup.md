# saiddup: leave out "Assistant said" lines that repeat <your-replies>

Branch `exp-saiddup` (commit 05e35df) on v151 (f2afcdf), worktree `.scratch/par/saiddup`.

## Change

`hooks/register.ts`:

- `unsaid(entries, replies)`: when the memory message is rendered, an observation line `… Assistant said: "<quote>"` is left out if its quote appears in a reply shown in `<your-replies>`. The comparison drops `**` and backticks, collapses whitespace and ignores case. Quotes shorter than 12 characters are always kept.
- The filter applies to the rendered observations only. `ledger.entries` is left alone, so the line comes back once its reply drops out of `<your-replies>`. It also comes back when the over-budget `briefer` cut empties the replies, and it is re-applied after the "source ranges left out" cut.
- The filter runs only when the ledger is stored with the memory message (`stores && installs`). Where it is not stored (a non-persistent context or a precompute), the next compaction reads the entries back from the memory message, so a line left out there would be lost for good. In that case nothing is left out.
- Source of the lines: the code carry `carryClauses` (at most 5 per chunk, `CARRIED_CLAUSES`) writes every `Assistant said: "…"` line. The Observer prompt never asks for that form. The filter matches the line form, so it also covers any Observer line written that way. The Observer prompt is unchanged, so every Observer cache key stays the same.
- The optional per-chunk cap was not added. `CARRIED_CLAUSES = 5` already caps the carry.

Test: `tests/register.test.ts`, "an Assistant said line quoting a reply the memory shows is left out, kept in the ledger, and shown again once the reply leaves the section". It checks that a duplicate is left out even with different case, spacing and backticks, that a non-duplicate is kept, that the ledger keeps the line, and that the line reappears after two large replies push its reply out. A mutation check (filter disabled) makes this test fail. `claude plugin test`: 380 pass. `tsc`: only the expected `*.local.ts` errors.

## Measurement

The root filesystem was full (0 bytes free, 188G/197G) during this run, so `bench-compact ab --record` failed with ENOSPC. I replayed A (v151, `.scratch/omv-rules/rules3`) and B through `bench-replay.ts om --pi strict` from the existing Observer/Reflector cache, writing the output to `/tmp`. Every Observer and Reflector reply came from the cache, so A and B got identical replies. I then graded both with `bench-compact ab --a contexts:… --b contexts:… --long`.

| track | cuts | A mean ctx tokens | lines omitted | per cut | tokens saved / cut | % of ctx |
|---|---:|---:|---:|---:|---:|---:|
| om-orchestration | 5 | 10,551 | 10 | 2.0 | 74 | 0.71% |
| om-v04 | 9 | 16,456 | 18 | 2.0 | 70 | 0.42% |
| firstmate-11 | 11 | 11,436 | 20 | 1.8 | 57 | 0.50% |
| firstmate-6 | 6 | 7,046 | 14 | 2.3 | 83 | 1.17% |
| chain (4 sessions) | 31 | 28,056 | 26 | 0.8 | 30 | 0.11% |
| long (13 sessions) | 80 | 34,123 | 31 | 0.4 | 13 | 0.04% |

(Tokens are chars/4 of the memory message.) The only other changed lines are source-range trailers that move to the previous line when the omitted line ended its source run. firstmate-11 has 311 carried `Assistant said` lines over its 11 cuts, about 28 per cut, and about 6% of them duplicate a shown reply. The `<your-replies>` section is capped at 1,000 tokens and holds only the last few replies, so most quotes do not appear there.

| | A (v151) | B (saiddup) |
|---|---:|---:|
| retention total | 84.7 | 84.8 |
| item flips | – | 0 up, 0 down |
| long chain | 64.0 | 64.0 (0 flips) |
| long recall-aware | 37.8 | 37.8 |
| handoff gate | 100.0 | 100.0 |
| critical-path calls | 0 new | 0 new |
| mean context tokens | – | −0% (−13 to −83 per cut) |

The retention tie is exact: only the `tokens` gate moved (+0.1).

Behavior was not measured. The Luna reader needs `pi`, which failed with ENOSPC taking its settings lock in `~/.pi/agent`, and all 150 reader calls were cache misses. So "next", "told" and "value" have no reading. The omitted lines are verbatim duplicates of text that stays in the same context, so a behavior change is unlikely, but that is unverified.

### Behavior rerun (failed, host-side)

A second attempt ran `bench-compact ab --a .scratch/omv-rules/rules3 --b .scratch/par/saiddup --record --samples 2 --behavior --jobs 6` once disk space was free. Both samples replayed for A and B. A's reader needed 32 uncached calls and B's needed 63. Every reader call then failed with `fetch failed`, and the run exited without a report. DNS was down: the machine had about 1 GB of its 30 GB free because several other parallel `bench-compact ab` runs were using 1–4.5 GB each. earlyoom and systemd kept killing `systemd-resolved` until systemd stopped restarting it ("Start request repeated too quickly"). Raw IP traffic still worked (ping 1.1.1.1 was fine). The replayed contexts and the reader answers that were already cached remain, so a rerun needs only the missing reader calls. That rerun needs free memory and a running `systemd-resolved` (`sudo systemctl reset-failed systemd-resolved && sudo systemctl start systemd-resolved`).

So behavior is still unmeasured.

## Verdict

The change is safe and matches the spec, but the gain is small: about 60–80 tokens per cut on single sessions (0.4–1.2%) and about 13–30 on long chains. It does not reach the ~4k characters of the firstmate case, because only quotes of the few replies still inside `<your-replies>` are duplicates. Most of the 28 lines per cut quote replies that already left that section, and this change keeps those on purpose. Cutting those would need a cap or a score threshold in `carryClauses`, which is a retention tradeoff rather than a duplicate. Before landing, run the behavior track (with `--samples 2`) once disk space allows.

Recommendation (retention and size evidence only): don't land. The gain is 0.04–1.2% of context. That doesn't justify another render-time filter with its `stores && installs` special case, or the unmeasured behavior risk. If it does land later, it should first get a clean behavior track.

## Behavior (rerun after the crash, 2 draws, no failed reader calls)

`.scratch/par/saiddup-out/beh.md`: behavior 78.3% (v151) vs 78.1% (saiddup), inside the ±2.5 noise floor; retention 83.8 vs 83.8, holdout unchanged. Verdict: land, stacked on v1.5.1. The saving is small (0.1–1% of the context).
