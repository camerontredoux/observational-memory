# red-example: the Observer example's standing constraint is a `<corrections>` quote, and no 🔴 line goes in `<observations>`

Branch `worktree-wf_1600353f-010-3` on v1.6.0 (`065b312`), worktree `.claude/worktrees/wf_1600353f-010-3`. The change is commit `331b65f`. This is item 23 of `docs/plans/optimization-review.md`. Raw output is in `~/.claude/scratch/i23/`: `ab.md`, `ab.json`, `ab.err`, and the counting scripts `redcount.ts`, `dump.ts` and `runs.ts`.

**Verdict: land. It fixes a contradiction, and the benchmark shows no measurable change.** The 🔴 lines now go where the rules say. 🔴 lines in `<observations>` fall from 39 to 7 over the same 472 Observer calls, and the corrections, constraints and reversals gates hold. The total (+0.8) is inside the noise floor (1.8). The gates that fell (identifiers, approvals) and the behavior drop (−2.4) match A's own sample-to-sample swing or the signature of any fresh Observer draw, so I do not count them as caused by the change.

## Change

`hooks/prompts.ts`, `OBSERVER_SYSTEM_PROMPT`, two lines:

- The example's `<corrections>` block gets `* 🔴 2026-09-23 14:31 User: "Don't change the public API of src/auth for this"`. The paraphrased line `* 🔴 2026-09-23 14:31 User decided the fix must not change the public API of src/auth` leaves the example's `<observations>`. Before, the example broke the prompt's own rule: put a constraint in `<corrections>`, word for word, and do not repeat it in `<observations>`.
- "Only the user's own words in a [User] block make a line 🔴." becomes "A 🔴 line goes only in <corrections>, quoting a [User] block; <observations> never holds one."

`groundRed` stays as the backstop. It turns a 🔴 line that the user's messages do not back into 🟡. No test pins either line, so no test changed. `claude plugin test`: 403 pass, 0 fail. `bunx -p typescript tsc -p .`: 6 errors, all missing `tests/fixtures/*.local.ts` modules, as on main.

## Method

```
flock /home/cameron/work/mods/observational-memory/.scratch/bench.lock \
  bun scripts/bench-compact.ts ab --a 065b312 \
  --b /home/cameron/work/mods/observational-memory/.claude/worktrees/wf_1600353f-010-3 \
  --record --samples 2 --behavior --continuation --jobs 8 \
  --json ~/.claude/scratch/i23/ab.json > ~/.claude/scratch/i23/ab.md 2> ~/.claude/scratch/i23/ab.err
```

- I did not run a strict pass first. The Observer system prompt is in every Observer cache key, so no B key can match an A key. The run confirms it: B made 665 calls, 0 cache hits.
- A's 670 Observer, Session writer and Reflector calls all came from the cache.
- `ab.err` has one `reader call failed (1/2)` with an empty message. The script retries once, and there is no `(2/2)` line, so the retry passed. All 150 reader calls returned. No Observer or Reflector call failed, and no replay fell back to the built-in summary.
- `redcount.ts` reads each cached Observer reply that the run used and counts 🔴 lines in `<observations>` against 🔴 lines in `<corrections>`. `runs.ts` adds up each replay's `summary.json` (calls, tokens, cost) and the `observer.*.demoted` counter that `groundRed` writes.

## Where the 🔴 lines go

The same 472 Observer calls per side: main corpus, holdout and reflection chain, 2 samples each.

| | A (065b312) | B |
|---|---:|---:|
| 🔴 lines in `<observations>` | 39 | **7** |
| replies with a 🔴 line in `<observations>` | 34 | 7 |
| of those lines, in replies with no `<corrections>` | 31 | 7 |
| 🔴 lines in `<corrections>` | 140 | 111 |
| replies with `<corrections>` | 88 | 69 |
| 🔴 lines `groundRed` turned into 🟡 (all 14 replays) | 35 | 8 |

By sample, B's 🔴 lines in `<observations>` are main 0 and 3, holdout 0 and 0, chain 3 and 1. A's are 9 and 6, 10 and 2, 5 and 7.

Over all of A's prompt in the shared cache, the item's baseline holds exactly. `luna-cache` has 973 replies, with 72 🔴 lines in `<observations>`, and 61 of them are in replies with no `<corrections>`. Over all 2,054 cached A replies there are 143 such lines, which is 7.0 per 100 replies. B has 1.5 per 100.

None of B's 7 remaining lines is a standing constraint:

- 2 are a user's question ("User asked whether Luna is doing a good job as an observer").
- 2 are a quoted user message that is not a rule (`User: "<task-notification>" notifications were routine…`, `User: "I found the change order, it was CO-00855-02…"`).
- 3 are review or tool findings (the `hooks/prune.ts` blockers, the rejected `builtin+recall` batch).

`groundRed` keeps a line that the user's words back, so the two questions and the change-order quote can still be pinned as 🔴. That is the old failure, at a lower rate. Over the same calls, the 🔴 lines in `<observations>` that name the user ("User …") fall from 9 (A) to 4 (B).

B writes fewer correction lines, but it does not keep fewer rules. A split some user messages into one line per sentence. For example, firstmate-11 sample 1 has 7 A lines from the 18:10 message and 1 B line. The constraints gate (96.2) and the corrections gate (100) are the same on both sides.

One case shows the fix. On the chain, sample 2, A wrote `🔴 User instructed: "Stop querying the production database now; …"` in `<observations>` with no `<corrections>` entry. B, sample 1, wrote the same words as a `<corrections>` quote. (`0552-redcheck.md` found that this text is the firstmate's own message to a worker, and `groundRed` demoted it there. So the example shows where the line goes, not a real user rule.)

## Numbers

| | A (065b312) | B | Δ |
|---|---:|---:|---:|
| main total | 83.9 | 84.7 | **+0.8** (noise floor 1.8) |
| main, by sample | 84.8, 82.9 | 85.4, 84.0 | |
| tiered (core / lookup) | 86.0 (87.0 / 83.7) | 87.5 (89.2 / 81.3) | +1.5 |
| unique flips (gate, id) | | | 24 up, 50 down, p = 0.0034 |
| holdout | 84.0 | 84.3 | +0.3 (8 up, 6 down unique, p = 0.79) |
| reflection chain | 81.6 | 81.9 | +0.4 (noise floor 0.5; 27 up, 28 down unique) |
| behavior, probes passed (sample 1 contexts) | 79.2% | 76.8% | −2.4 (43 up, 64 down) |
| continuation retention | 80.6 | 84.3 | +3.7 |
| continuation behavior | 76.9 | 75.3 | −1.6 |

The report's verdict line is "no verdict": Δ 0.8 is inside the noise floor and the samples overlap. The noise floor is the spread of A's two samples (84.8 against 82.9).

### The gates to watch

| gate | A | B | Δ | A sample 1 → 2 | B sample 1, 2 |
|---|---:|---:|---:|---|---|
| corrections | 100 | 100 | 0 | 100 → 100 | 100, 100 |
| constraints | 96.2 | 96.2 | 0 | 96.2 → 96.2 | 96.2, 96.2 |
| reversals | 93.3 | 94.0 | +0.7 | 90.7 → 96.0 | 90.7, 97.3 |
| approvals | 90.7 | 81.5 | −9.3 | 100 → 81.5 | 81.5, 81.5 |
| identifiers | 58.2 | 53.1 | −5.1 | 59.4 → 57.0 | 56.5, 49.8 |

- **Corrections, constraints, reversals.** These hold on every track. Holdout and chain corrections are 100 on both sides. Chain reversals are 92.3 on both sides. In the continuation score, the rules category is 97.2 against 97.3 for retention and 87.8 against 87.8 for behavior. Permission probes are 29 of 29 on both sides.
- **Approvals.** The same 10 items account for all of it: om-v04 `scope:tmp-sessions` at cuts 1–4 and `scope:ctx-worktree` at cuts 4–9. A's sample 1 passes them, and A's sample 2 fails them. B fails them in both samples, so B equals A's sample 2. The items need exact names in the context (`-tmp` and `test-1`; `observational-memory-ctx` and `experiment/context-observer`). Of the four draws, only A's sample 1 has them. For example, only A's sample 1 reply says the `test-1`/`test-2` sessions remain. This is wording in 🟡 and ✅ lines, not 🔴 placement.
- **Identifiers.** The loss is on the main track only. Holdout identifiers are +1.0 and chain identifiers are +0.6. Most of it is one draw: B's sample 2 on om-v04 has 47 of 84, against 56–59 for the other three draws. Its biggest loss is `.claude-plugin/plugin.json`. One early reply left that path out, and the item fails at cuts 1–5. The path lives in 🟡 version-bump lines, which the change does not touch. `0518-noise.md`, another Observer prompt change with fresh draws against the same cached A, moved the same gates the same way: identifiers −4.3, decisions 84.5 → 99.1, purpose 41.7 → 52.1. Here they are −5.1, 84.5 → 98.2 and 41.7 → 60.4. So these moves come with a fresh draw against A's cached draws, not with this change.
- **Unique flips.** The sign test favours A (24 up, 50 down, p = 0.0034). But A's sample 2 against A's sample 1 alone gives 20 up and 36 down, so draw noise alone tilts this way. One pair at a time, B is close to that: B1 against A1 gives 24 up, 37 down, and B2 against A2 gives 25 up, 27 down.

Other gates that moved on main: decisions +13.6, file-state +12.7, purpose +18.8, multi-hop +5.7, files-edited −5.4, lessons −4.1, chronology −2.5. Lessons has an A spread of 14.3. The rest follow the fresh-draw pattern above.

### Behavior

Behavior is −2.4, inside the ±2.5 reader noise floor from `2001-grader-noise.md`. That floor is for identical contexts. Here B's contexts are fresh draws, which adds more noise. The rule gate fell from 81 to 73 of 90, but 10 of its 11 losses are `sup:`, `super-` and `order-` probes (superseded values and order of events). The continuation score files those under state and history, and its rules category did not move. The one real rule probe that flipped is `rule:paid-runs`: B answered "yes" without the $50 cap. B's replies record the `$50` cap as 🟡 lines, as A's do. Multi-hop fell from 38 to 29 of 44 (1 up, 10 down). 6 of the 10 losses are two om-v04 facts (`hop:brief-pinned`, `hop:151-messages`). Each fact is carried forward from one reply, so one difference in wording fails it at every later cut.

### Efficiency and model tokens

| per sample, main corpus | A | B |
|---|---:|---:|
| context tokens per cut, mean / max | 20k / 34k | 20k / 33k |
| reduction ratio, mean | 12.9% | 12.8% |
| Observer calls (tokens in / out) | 122 (1136k / 71k) | 122 (1167k / 70k) |
| model tokens in + out | 1207k | 1237k (+2%) |
| critical-path calls | 0 | 0 |

The report's efficiency verdict is "same" on all three tracks. The prompt is 27 characters longer.

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

- B's Observer, Session writer and Reflector calls: 665 fresh Luna calls (660 Observer and Session writer, 5 Reflector). They used 6.83M tokens in and 0.41M out, which is $1.88 at the plugin's Luna price.
- Reader: 150 Luna calls, 75 for each side. A's answers were not in the reader cache either. The script does not meter reader tokens. From the context sizes, the input is about 1.6M tokens per side, and the output is not counted.
- A's replay cost nothing: all 670 of its Observer, Session writer and Reflector calls came from the cache.
- The reader passes took 34 minutes for A and 35 minutes for B.
