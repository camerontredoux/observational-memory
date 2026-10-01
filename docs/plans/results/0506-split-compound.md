# split-compound: the Observer's "split compound statements" rule now agrees with the size rule

Branch `worktree-wf_1600353f-010-5` on v1.6.0 (`065b312`), worktree `.claude/worktrees/wf_1600353f-010-5`. The change is commit `5c16fe9`. This is item 25 of `docs/plans/optimization-review.md`. Raw output is in `~/.claude/scratch/i25/`: `ab.md`, `ab.json`, `ab.err`, and the counting scripts `notes.ts`, `gates.ts`, `runs.ts` and `overlap.ts`.

**Verdict: land. It fixes a contradiction, and the benchmark shows no measurable change.** The Observer's output keeps the same shape: 6.3 notes per reply and 51.7 tokens per note on both sides. The total (+0.6) is inside the noise floor (1.8). The identifiers drop (−4.3) and the approvals drop (−9.3) match what any fresh Observer draw does against A's cached draws, so I do not count them as caused by the change.

## Change

`hooks/prompts.ts`, `OBSERVER_SYSTEM_PROMPT`, one line:

- Before: "Split compound statements into separate observations. One observation per independent fact."
- After: "Split unrelated events into separate observations. Keep each event's own details on its line: the value measured, the reason given, the error quoted, the path changed."

The old line came from pi-observational-memory. It pulled against the prompt's size rule, which says to "put the value measured, the reason given, the error quoted or the path changed on the line of its event". One rule said to split a fact from its reason. The other said to keep them together.

I chose to reword the line, not delete it. The line still does a job the other rules do not: it keeps the Observer from fusing unrelated events into one long line. "One observation per line" is a format rule, and "Group repeated similar tool calls" covers only repeated calls. Deleting the line would drop that guard. The new wording keeps the split for unrelated events and uses the size rule's own list of details, so the two rules read as one.

No test pins either line, so no test changed. `claude plugin test`: 403 pass, 0 fail. `bunx -p typescript tsc -p .`: 6 errors, all missing `tests/fixtures/*.local.ts` modules, as on main. The prompt is 76 characters longer (91 to 167).

## Method

```
flock /home/cameron/work/mods/observational-memory/.scratch/bench.lock \
  bun scripts/bench-compact.ts ab --a 065b312 \
  --b /home/cameron/work/mods/observational-memory/.claude/worktrees/wf_1600353f-010-5 \
  --record --samples 2 --behavior --continuation --jobs 8 \
  --json ~/.claude/scratch/i25/ab.json > ~/.claude/scratch/i25/ab.md 2> ~/.claude/scratch/i25/ab.err
```

- I did not run a strict pass first. The Observer system prompt is in every Observer cache key, so no B key can match an A key. The run confirms it: B made 667 calls, 0 cache hits.
- A's 670 Observer and Reflector calls all came from the cache.
- `ab.err` has no failed reader call, rate limit or fallback. No Observer or Reflector call failed (`ok` on all 667 B calls), and no replay fell back to the built-in summary.
- B made one call fewer than A on three replays (om-v04 sample 2, firstmate-6 sample 1, the chain's sample 1). Every call B made returned, so these are not failures.
- `notes.ts` reads each cached Observer reply that the run used. It counts the lines in `<observations>` and `<corrections>`, and the output tokens. Tokens per note is the observation text's characters divided by 4.
- `gates.ts` reads `ab.json` for gate scores by sample and for flips one sample pair at a time. `overlap.ts` compares the identifier items this B lost with those item 23's B lost (`0313-red-example.md`, run against the same cached A).

## Notes per reply and tokens per note

The same 661–664 Observer replies per side: main corpus, holdout and reflection chain, 2 samples each.

| track | replies A / B | notes per reply A → B | tokens per note A → B | output tokens per reply A → B | corrections per reply A → B |
|---|---:|---:|---:|---:|---:|
| all | 664 / 661 | 6.3 → 6.3 | 51.7 → 51.7 | 592 → 590 | 0.21 → 0.20 |
| main | 244 / 243 | 6.1 → 6.1 | 51.6 → 51.1 | 584 → 573 | 0.26 → 0.21 |
| holdout | 108 / 107 | 7.2 → 7.3 | 52.1 → 52.2 | 653 → 657 | 0.16 → 0.14 |
| chain | 312 / 311 | 6.1 → 6.2 | 51.5 → 52.1 | 577 → 580 | 0.19 → 0.23 |

Every change is 1–2%. A's own samples differ by as much: notes per reply is 6.3 in both of A's samples, and 6.4 and 6.2 in B's. Output tokens per reply go 589 → 595 between A's samples and 595 → 585 between B's.

Lines with a semicolon are a rough sign of a compound line. Their share barely moves: main 51.7% → 51.3%, holdout 52.8% → 52.6%, chain 51.4% → 49.8%.

So the Observer did not change how it splits or groups. It was already following the size rule. The reworded line removes the contradiction without changing the output.

## Numbers

| | A (065b312) | B | Δ |
|---|---:|---:|---:|
| main total | 83.9 | 84.5 | **+0.6** (noise floor 1.8) |
| main, by sample | 84.8, 82.9 | 83.9, 85.0 | |
| tiered (core / lookup) | 86.0 (87.0 / 83.7) | 87.1 (88.6 / 82.6) | +1.1 |
| unique flips (gate, id) | | | 28 up, 35 down, p = 0.45 |
| holdout | 84.0 | 83.6 | −0.4 (2 up, 5 down unique, p = 0.45) |
| reflection chain | 81.6 | 80.6 | −1.0 (noise floor 0.5; 27 up, 31 down unique, p = 0.69) |
| behavior, probes passed (sample 1 contexts) | 79.2% | 80.1% | +0.9 (53 up, 45 down) |
| continuation retention | 80.6 | 83.4 | +2.8 |
| continuation behavior | 76.9 | 79.4 | +2.6 |

The report's verdict line is "no verdict": Δ 0.6 is inside the noise floor, and the samples overlap. The noise floor is the spread of A's two samples (84.8 against 82.9).

### The gates to watch

| gate | A | B | Δ | A sample 1 → 2 | B sample 1, 2 |
|---|---:|---:|---:|---|---|
| identifiers | 58.2 | 53.9 | −4.3 | 59.4 → 57.0 | 55.1, 52.7 |
| rationale | 60.0 | 62.7 | +2.7 | 61.8 → 58.2 | 58.2, 67.3 |
| approvals | 90.7 | 81.5 | −9.3 | 100 → 81.5 | 81.5, 81.5 |
| reversals | 93.3 | 90.0 | −3.3 | 90.7 → 96.0 | 93.3, 86.7 |
| corrections | 100 | 100 | 0 | 100 → 100 | 100, 100 |
| constraints | 96.2 | 96.2 | 0 | 96.2 → 96.2 | 96.2, 96.2 |

- **Identifiers.** The loss is on the main track only. Holdout identifiers are −0.5 (A 62 and 63, B 62 and 62). Chain identifiers are −0.7 (A 53.4 and 52.6, B 52.6 and 51.9). On main, both B samples are below both A samples. But this matches the other Observer prompt changes that were run with fresh draws against this cached A. `0518-noise.md` lost −4.3 on identifiers, and item 23 (`0313-red-example.md`) lost −5.1. The same items fail. Of the 21 identifier items × cuts that this B loses on average, item 23's B also loses 13. Both runs lose `$0.37`, `hooks/stats.ts`, `hooks/prompts.ts` and the om-v04 session id `5fdeae6`. `0518-noise.md` named `hooks/stats.ts` and `b4e9b52` among its losses. The identifier gate also needs the line that holds the identifier to share words with the transcript's own use of it. B's sample 1 still has `b4e9b52` at cut 3, in "merged issue #4 as `b4e9b52` and verified `claude plugin test`: 135 tests passed". That wording fails the check, and A's wording passes. This is draw noise in the wording, not a lost identifier. B would lose identifiers through terser lines, and its lines are not terser (51.7 tokens per note on both sides).
- **Rationale.** +2.7, inside A's own spread of 3.6. No item × cut is lower in B than in A on average. In the behavior probes, rationale goes from 39 to 37 of 55 (2 up, 4 down), which is reader noise.
- **Approvals.** The same 10 items account for all of it, and they are the same 10 that item 23 lost: om-v04 `scope:tmp-sessions` at cuts 1–4 and `scope:ctx-worktree` at cuts 4–9. A's sample 1 passes them, and A's sample 2 fails them. B fails them in both samples, so B equals A's sample 2.
- **Reversals.** −3.3, inside A's own spread of 5.3. The losses are `rule:push-now`, `sup:skill-stub-wording` and `sup:stall-cause`. Corrections and constraints hold on every track: 100 and 96.2 on main, 100 and 100 on the chain. Chain reversals are 92.3 on both sides.
- **Unique flips.** The sign test favours A slightly (28 up, 35 down, p = 0.45). A's sample 2 against A's sample 1 alone gives 20 up and 36 down, so draw noise tilts the same way. One pair at a time, B1 against A1 gives 19 up, 26 down, and B2 against A2 gives 22 up, 24 down.

Other gates that moved on main: decisions +15.5, purpose +18.8, multi-hop +4.5, lessons −5.1, chronology −1.7. Decisions and purpose rose the same way in `0518-noise.md` and item 23, so they come with a fresh draw. Lessons has an A spread of 14.3.

### Holdout and chain

The holdout loses 0.4. That is 1 item each on in-progress and files-edited and 1 net on identifiers. Its core tier is 100 on both sides.

The chain loses 1.0, and the report calls A better without significance. Most of it is chronology (−1.1, all lookup items: 152 up, 178 down) and the size gates (tokens −1.0, budget −0.9). Chain chronology swings by 6.9 points between A's own two samples (60.6 and 53.7), so the 0.5 noise floor of the chain total understates its noise. Core flips are 2 up and 1 down. `0518-noise.md` saw −1.7 on the chain with fresh draws, and item 23 saw +0.4.

### Behavior

Behavior is +0.9, inside the ±2.5 reader noise floor from `2001-grader-noise.md`. The rule gate fell from 81 to 74 of 90 (3 up, 10 down). 7 of the 10 losses are `sup:`, `super-` and `order-` probes (superseded values and the order of events). The other 3 are one probe, `rule:paid-runs`, at cuts 1, 3 and 5; item 23's B lost it too. The continuation score's rules category moved from 97.2 to 96.3 for retention and from 87.8 to 84.4 for behavior. Permission probes are 29 of 29 on both sides. File-state rose from 56 to 65 of 79, and lessons from 42 to 46 of 49. Multi-hop fell from 38 to 34 of 44, and 3 of those losses are one om-v04 fact, `hop:151-messages`.

### Efficiency and model tokens

| per sample, main corpus | A | B |
|---|---:|---:|
| context tokens per cut, mean / max | 20k / 34k | 20k / 33k |
| reduction ratio, mean | 12.9% | 12.8% |
| Observer calls (tokens in / out) | 122 (1136k / 71k) | 122 (1128k / 70k) |
| model tokens in + out | 1207k | 1198k (−1%) |
| critical-path calls | 0 | 0 |

The report's efficiency verdict is "same" on all three tracks. On the chain, mean context tokens are +2% and model tokens +1%. On the holdout, model tokens are +8%, inside the ±10% band.

## Fresh control

A fresh draw of v1.6.0 settles the identifiers and approvals drops. `bench-compact.ts run --plugin 065b312 --record --samples 3 --jobs 8` reused A's two cached samples and drew a third. In the third sample, the om-v04 replay made 54 fresh Observer calls of 57. The om-orchestration and firstmate-11 replays came from an earlier v1.6.0 draw in `luna-cache-s3`. Raw output is in `~/.claude/scratch/tmp.DcqpGdjq4I/`: `control.md` and `control.json`.

| main corpus, v1.6.0 | sample 1 | sample 2 | sample 3 (fresh) |
|---|---:|---:|---:|
| total | 84.8 | 82.9 | 83.5 |
| identifiers | 59.4 | 57.0 | 50.7 |
| approvals | 100 | 81.5 | 98.1 |

- **Identifiers.** v1.6.0's own draws go from 50.7 to 59.4. The B samples of item 23 (56.5, 49.8) and item 25 (55.1, 52.7) are in that range. The drop is draw noise.
- **Approvals.** The 10 items depend on one detail in one om-v04 reply: a note that the `test-1`/`test-2` sessions remain, and the full worktree name `observational-memory-ctx`. v1.6.0 wrote it in 2 of 3 draws. Items 23 and 25 wrote it in 0 of 4 draws. That is one pass or fail per draw, and the split gives p = 0.14 (Fisher's exact test, one-sided). It does not show that either change causes the loss.

Items 23 and 25 landed together in v1.6.4. The combination was not benchmarked: each change was tested alone against v1.6.0.

## Cost

- B's Observer and Reflector calls: 667 fresh Luna calls (661 Observer, 6 Reflector). They used 6.86M tokens in and 0.41M out, which is $1.89 at the plugin's Luna price.
- Reader: 75 Luna calls for B. A's 75 reader answers came from the reader cache. The script does not meter reader tokens.
- A's replay cost nothing: all 670 of its Observer and Reflector calls came from the cache.
- The run waited 1 h 49 min on the bench lock and then took 78 minutes. B's reader pass took 32 minutes of that.
