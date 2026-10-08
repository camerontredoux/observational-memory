# state: a background-written `<state>` status page leads the memory, and the observations it covers are trimmed

Branch `exp-state` on v151 (f2afcdf), worktree `.scratch/par/state`. The commits are f9e3a98 (a cherry-pick of exp-grader's 86c97db: core/lookup tiers), 9dc89ed (the state page) and 0c2fbab (`--continuation`). The diff against v151 is in `docs/archive/plans/results/diffs/state.diff`.

**Verdict: do not land.** Under the current benchmark it is clearly worse: retention drops 8.8 points, 128 unique items go down and 3 go up, and all 3 transcripts agree. Under the continuation score it is also worse: retention -6.2 and behavior -13.2, both well beyond the ≈±2.5 behavior noise. Rules and permissions hold, context is 19% smaller, and there is no new critical-path call. But it misses the bar on the continuation score, and the writer costs about 3× the Session writer.

## Change

- **Writer** (`writeState` in `hooks/register.ts`, `STATE_SYSTEM_PROMPT` in `hooks/prompts.ts`). It works like the Session writer: a background Luna call through the same `complete()` path, main loop only, scheduled next to `writeSession`, and never awaited by `session.compact`. It runs once 30 new observations have landed since the last page (`STATE_EVERY_OBSERVATIONS`). Its input is the previous page, the observations newer than that page (at most 24k tokens, newest first), the latest user messages, and the corrections. Its output is a page with these sections: Goal, Done, In progress, Waiting on user, Rules (which point to `<corrections>` rather than copy them), Decisions, Findings, Dead ends, and Key references. The target is 3k tokens or less, and it may drop only what is finished and no longer needed. The page is stored as `{text, covers, at}` under `state:<sessionId>`. `covers` holds the hashes of the observation lines the page was written from, so the page survives ledger ID resets. A failed or empty reply keeps the old page. The page also travels inside the memory message, so a resumed session can parse it back.
- **Compaction** uses the last stored page as it is, together with every observation newer than that page. It never waits for the writer.
- **Rendering.** `<state>` comes right after the memory guide, which gets one extra bullet explaining the page. `<corrections>`, `<your-replies>`, `<continuation>` (with its Session line) and `<all-user-messages>` are unchanged.
- **Trimming rule** (`trimObservations`, deterministic, no model call). The rendered observations keep:
  - every line newer than the page;
  - of the lines the page covers, the newest ones within 1k tokens (`STATE_OVERLAP_TOKENS`), so the page and what follows it join up;
  - past those, only 🔴 lines, ✅ lines, and lines matching a failure regex (fail/error/broke/regress/revert/timed out/rejected/dead end/abandoned/didn't work).

  A single line reports how many lines were left out and gives their source range for `om_recall`. The ledger itself is untouched, so the trim is applied only at render time.
- **Benchmark.** `bench-replay.ts` reports the Session and state writers' calls, tokens and cost per replay (`luna.writers`).

Tests (`tests/register.test.ts`, `the state page`):
- written in the background after 30 observations;
- compaction led by the page with the covered lines trimmed, including the case where the writer is still running or has failed;
- rewritten from the previous page plus the newer observations;
- a failed or empty writer keeps the previous page;
- recovered from the page carried in the memory message;
- trimming keeps the newer lines, the overlap, and 🔴/✅/failure lines.

`tests/replay.test.ts` covers the continuation score. `claude plugin test`: 384 pass, 0 fail. `tsc`: only the known missing `*.local.ts` errors.

## Continuation score (`bench-compact.ts --continuation`, `tests/eval/continuation.ts`)

1. It regrades the existing retention items and behavior probes. Nothing new is graded, and the flat and tiered totals are still reported beside it.
2. Each item goes into a category by gate, or by a hand-authored id prefix (order/told-at → history, sup → state, scope → rules). The weights are goal 10, status (done/next/waiting/handoff/asks/approvals) 10, rules (constraints/corrections/reversals/permissions) 10, lessons (dead ends/failures) 9, decisions+rationale 8, state (file/feature state, superseded values) 8, findings 6, references (identifiers/commits/files) 4, size 4, and history (chronology/recall) 1.
3. Within a category, a lookup item weighs ¼ (exp-grader tiers). A missed item that the context points to with a source range gets 0.9 credit if it is a lookup and 0.25 if it is core.
4. Retention is scaled by the budget gate's fit. Behavior is scored as majority pass per category with the same weights.
5. Every category already had probes, so I added no new behavior probes.

## Results

v151 (rules3) = A, state = B. Main corpus, 2 samples, behavior and long chain, run under `.scratch/bench.lock` with `--jobs 8`. I reran after the fetch-failed cache quarantine. No reader or writer call failed, and no page or answer holds an error string.

### Current benchmark (unchanged)

| | A v151 | B state | Δ |
|---|---:|---:|---:|
| retention total | 83.8 | 75.0 | **-8.8** (p=2.8e-34, 3 of 3 transcripts) |
| tiered (core / lookup) | 86.0 (87.0 / 83.7) | 80.3 (80.6 / 72.3) | -5.6 |
| behavior (probes passed) | 77.4% | 68.8% | -8.6 (41 up, 118 down) |
| holdout | 83.9 | 83.0 | -0.9 (0 up, 15 down) |
| reflection chain | 81.3 | 82.5 | +1.2 |
| long chain / recall-aware | 64.3 / 37.8 | 70.1 / 34.9 | +5.8 / -2.9 |

Gates that fell: file-state -40.5, multi-hop -33.0, chronology -23.8, files-edited -22.8, rationale -22.7, identifiers -19.3, lessons -11.2, decisions -10.0, reversals -6.0, facts -5.8, approvals -5.6. These gates held: constraints, corrections, verbatim, asks, handoff, commits, failures, recall. Behavior held rule 73 vs 75 and permission 29 vs 29. It fell on purpose (7 vs 19 of 24), file-state (35 vs 52), multi-hop (23 vs 35), rationale (29 vs 38) and value (197 vs 221).

### Continuation score

| category | w | A ret | B ret | Δ | A beh | B beh | Δ |
|---|---:|---:|---:|---:|---:|---:|---:|
| goal | 10 | 41.7 | 47.9 | +6.3 | 79.2 | 29.2 | **-50.0** |
| status | 10 | 97.2 | 95.4 | -1.8 | 61.3 | 60.0 | -1.3 |
| rules | 10 | 97.2 | 95.5 | -1.7 | 86.7 | 86.7 | 0 |
| decisions | 8 | 78.5 | 65.2 | -13.3 | 69.1 | 52.7 | -16.4 |
| lessons | 9 | 83.6 | 77.8 | -5.8 | 81.6 | 77.6 | -4.1 |
| state | 8 | 84.5 | 49.8 | **-34.7** | 68.1 | 53.8 | -14.3 |
| findings | 6 | 93.1 | 91.8 | -1.4 | 86.9 | 82.5 | -4.4 |
| references | 4 | 77.9 | 63.8 | -14.1 | 75.6 | 63.5 | -12.2 |
| history | 1 | 78.6 | 57.2 | -21.4 | 72.2 | 70.4 | -1.8 |
| size | 4 | 68.2 | 82.6 | +14.4 | – | – | – |
| **total** | | **80.6** | **74.3** | **-6.2** | **75.8** | **62.5** | **-13.2** |

Retention by sample: A 81.4 and 79.7; B 74.4 and 74.2. On the long chain (retention only), B scores 66.1 against A's 58.5 (+7.5). Nearly all of that gain comes from size (+23.4); decisions, findings and references are lower.

**Reference, HEAD v1.5.0 (55c17a7) = A, v151 = B, regraded from cache** (`--no-chain`, because v151's chain sample 2 is not cached):

| | v1.5.0 | v151 | Δ |
|---|---:|---:|---:|
| retention total / tiered | 83.9 / 86.0 | 83.8 / 86.0 | 0 / 0 |
| behavior | 77.3% | 77.4% | +0.1 |
| continuation retention | 81.4 | 80.6 | -0.8 |
| continuation behavior | 77.5 | 75.8 | -1.7 |

By category, the behavior deltas are goal 0, status -9.3, rules +7.8, decisions 0, lessons -10.2, state -3.4, findings +0.5, references +4.1 and history +0.6. These are per-category draws on 24 to 90 probes, so per-category behavior noise is large (±10 on a small category). Only moves on the scale of B's goal, state and decisions drops mean anything.

### Efficiency and cost

| | A v151 | B state |
|---|---:|---:|
| context tokens per cut, mean / max (main) | 21k / 34k | 17k / 26k (-19%) |
| long chain, mean / max | 43k / 66k | 31k / 48k (-28%) |
| model tokens in+out (main, incl. writers) | 1234k | 1422k (+15%) |
| critical-path calls | 2 | 2 (the writer is never on it) |
| Session writer, one full round | ≈$0.14 | ≈$0.14 |
| state writer, one full round | – | **≈$0.54** (main 3 sessions $0.075, holdout $0.03, chain $0.13, long $0.30); 89 calls on the long chain |

"Full round" means one sample over the main corpus, holdout, chain and long chain. The benchmark's "Observer calls" for B include the writer calls (they are tallied as background calls). The Observer replies themselves are identical to A's: 0 fresh calls. The efficiency verdict prints "worse" because model tokens rose by more than 10%.

## Why it loses

1. **Goal.** The reader answers "what is this session for" from the page's Goal section, which names the current subtasks (for example, "Complete Gorman's signed-contract PDF flow…"). It ignores the Session line lower down ("Supervising the firstmate fleet, coordinating…"). The Session line is still present, but the page leads and the reader trusts it. One fix would be to make the Goal's first line the Session line, verbatim.
2. **State, decisions, references, multi-hop.** The trim removes 82 of 172 observation lines at firstmate-11 cut 6. The page summarizes them, but the summary loses the specific values: which file changed, what a setting became, the second hop of a fact, and the reason behind a decision. The rubric and the probes ask for exactly those values. The source-range pointer brings retention credit back only for lookup items at 0.9. Core items get only 0.25, and the reader cannot call `om_recall`.
3. **Cost.** The rewrite reads up to 24k tokens and writes a 2k-token page every 30 observations, which is about 3.2× the Session writer's cost per round.

The bar was: continuation score up beyond noise, rules not lower, context not larger, no new critical-path calls, and reasonable writer cost. B passes on rules (category retention -1.7, from reversals; the constraints gate at 96.2 and corrections at 100 both equal A's, and rules behavior is equal), context and critical path. It fails on continuation (-6.2 retention, -13.2 behavior) and on cost.

## Example: firstmate-11, cut 6

- **Before** (v151, 40.5 kB): memory-guide, corrections, your-replies, `<observations>` with 172 lines starting at 13:26 session startup, skills, all-user-messages, continuation (Session line), resume.
- **After** (state, 31.6 kB): memory-guide (+1 bullet), then `<state>` (7.4 kB, about 1.8k tokens: Goal 2 lines, Done 10, In progress 6, Waiting on user 6, Rules 12, Decisions 7, Findings 9, Dead ends 5, Key references 11), then corrections, your-replies, and `<observations>` (90 lines). The observations open with the line `(82 earlier observations the <state> page covers are left out; om_recall can search them (source 2026-09-23 13:26 to 2026-09-23 14:48))`. After that come the surviving ✅, 🔴 and failure lines from that range, then the 1k-token overlap and everything newer. The skills, all-user-messages, continuation and resume sections are unchanged.

The page opens like this:

```
<state>
As of 2026-09-23 15:24:
## Goal
- Land the Gorman PDF-on-contract-signed work and keep its local server available for testing.
- Fix Opie line-item saving and Sign in person visibility for receptionist, PM Lead, and PM roles.
## Done
- Firstmate `main` is fast-forwarded to fork commit `74153fae`; no upstream push occurred.
…
## Rules
- No upstream pushes, PRs, or rebasing; use a real merge commit (corrections).
…
## Dead ends
- Direct merge of `upstream/main` into local `main` was abandoned due to conflicts.
…
```

## Spend

- State writer: about $1.7 metered across both samples of every track. Part of it came from a run that was killed because it started before the 05:50 cache quarantine; it was rerun.
- Reader: about 170 uncached Luna reader calls, not metered (72 for B's contexts, plus retries of calls that failed during the outage).
- Observer and Reflector: all cache hits.

Outputs are in `.scratch/par/state-bench/` (`ab1.md`/`.json` and `ref.md`/`.json`).
