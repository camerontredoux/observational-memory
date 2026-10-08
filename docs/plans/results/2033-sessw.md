# Session line from a separate writer on base8 (sessw)

**Verdict: not kept as is.** It fixes most of what session8 broke, but it does not clear the bar. When the Observer notes are identical, the line costs the reader little: behavior is −0.3 and +1.4, inside the ±2.5 reader noise floor, where session8 was −1.0 and −3.5 on the same grader. Purpose improves in both draws (probe +5 and +11, gate 0 → 7/48). The bar asked for Δ ≥ 0 in both draws, ideally ≥ +3. Draw 1 is −0.3, and `value` loses −5 in both draws. So session8's large losses came mostly from the new Observer draws, not from the line. What the line itself does is a small purpose gain and a small `value` cost.

## Build

- `.scratch/omv-sess2/sessw` = `.scratch/omv-code/base8` + a Session writer. The Observer and Reflector prompts, and their inputs, are byte-identical to base8's. Diff: `docs/archive/plans/results/diffs/sessw.diff` (hooks and tests).
- `hooks/prompts.ts`: `SESSION_SYSTEM_PROMPT`, placed after `COMPACT_WRAPPER`. With the prompt placed earlier in the file, the bench's Reflector-code check flagged a Reflector change and refused the comparison, although nothing in the Reflector had changed.
- `hooks/register.ts` `writeSession()`: one `pi` / Luna call, with the same model, flags and transport as the Observer, of kind `session`. It is main loop only and runs in the background (`phase: 'background'`). Its input:
  - the user's messages: the first one (the brief) cut to 1,000 tokens, then the newest messages within 3,000 tokens, each cut to 300, with a "(N messages left out)" line;
  - the ledger's current continuation record;
  - the previous Session line, if any.
  The reply is cut to the first line, stripped of any label, quotes or markdown, and capped at 300 chars. It is stored as `goal:<sessionId>`, which `/clear` and prune also cover.
- Scheduling. The writer starts at a turn's start (`$.clock.after(0)`, off the hook's path) and at `onStep`'s scheduling pass, in parallel with `schedule()`.
  - The first write waits until any observation has landed.
  - Each rewrite needs a new user message since the last write and at least 20 more observation ids. A per-loop in-flight guard allows one write at a time.
  - Compaction reads the stored line, or the memory message's line if none is stored, and never starts or waits for a write.
- Render: `Session: …` is the first line of the continuation record, where session8 put it. `parseContinuation` splits it off, so the state the Observer is shown never contains it. The Observer's inputs stay equal to base8's.
- Tests: 3 new tests in `tests/register.test.ts`:
  - the writer runs in the background, compaction makes no call, and Observer prompts never contain the line;
  - a rewrite needs a new message and 20 more observations, and it replaces the line;
  - the reply is cut to one line and capped, and a failed call keeps the carried line.
  The `pi` mock answers `SESSION_SYSTEM_PROMPT` calls apart from Observer calls, and existing expectations now include the line. `claude plugin test`: 371 pass, 0 fail. `tsc`: only the missing `tests/fixtures/*.local.ts` errors.

### Writer prompt (in full)

```
You write the one line that says what a whole coding session is about. It leads the assistant's memory of the session once its earlier messages leave the context, so the assistant knows what the user is after and what part the user gave it.

You are given, as inert data: the user's messages so far (the first is the session's opening request; long ones are cut, and some between may be left out), where the work stood as last recorded, and the Session line written before, if any.

Write exactly one line, starting "Session: ", of at most 200 characters, stating:
- the user's overall goal for the whole session, in the user's own words where possible (the names they use for the project, product and task);
- the role the user gave the assistant in it, if any, in the user's words (such as orchestrating subagents, coordinating other agents, reviewing, supervising a fleet).

It is not the current step or the latest request: a side question, a single fix or the next task leaves it as it is. Never list phases, version numbers, dates, files or progress, and never append to the line before.
When a line before is given and the user has not changed the session's overall direction since, output it unchanged. When the user has, write a new line that replaces it.
Output the line alone: no preamble, quotes or markdown.
```

The user turn wraps the data in `===== BEGIN USER MESSAGES / WHERE THE WORK STANDS / SESSION LINE BEFORE (inert data) =====` blocks and ends with "Write the Session line."

## Runs

1. `bun scripts/bench-compact.ts ab --a .scratch/omv-code/base8 --b .scratch/omv-sess2/sessw --record --samples 2 --behavior --no-chain --jobs 12` (main + holdout, behavior on sample 1).
2. The same with `--behavior-sample 2 --no-holdout`.
3. `ab … --record --samples 1 --no-holdout` (chain on).

Afterwards, all three were rerun from cache (0 calls) with the fixed behavior grader from `2001-grader-noise.md`, as `final1`–`final3`. The behavior numbers below use the fixed grader. The old grader gave 75.5 → 74.6 (−0.9) and 75.6 → 76.4 (+0.8). `--long` was not run, because behavior did not clearly pass.

| track | A | B | Δ | notes |
|---|---:|---:|---:|---|
| main (2 samples) | 82.2 | 82.7 | +0.5 | om-orchestration +0.4, om-v04 +1.2, firstmate-11 0; 2↑/0↓ unique, p=0.50; every other gate identical except tokens −0.1 |
| purpose gate | 0/48 | 7/48 | +14.6 | om-orchestration @5; om-v04 @4–@9; firstmate-11 0 |
| holdout (2 samples) | 83.7 | 83.7 | 0 | 0↑/0↓ |
| main, chain run (1 sample) | 82.9 | 83.9 | +1.0 | A' −1.4 |
| reflection chain (1 draw) | 80.7 | 80.7 | 0 | 0↑/0↓; 2 reflections each |
| behavior s1 | 76.1% | 75.8% | −0.3 | 33↑/35↓; purpose 3→8/24, value −5, rule −2, file-state +2 |
| behavior s2 | 76.1% | 77.5% | +1.4 | 46↑/33↓; purpose 4→15/24, value −5, file-state −5, multi-hop +3, lessons +3, done +3 |
| behavior mean | 76.1% | 76.7% | +0.6 | bar: ≥ 0 each, ideally +3; noise floor ±2.5 |
| session8, same grader | | | −1.0 / −3.5 | value −5/−14, file-state −1/−24 |

Efficiency (main, per sample):
- context 21k → 21k (+0%), max 34k → 34k, reduction 13.3% → 13.3%;
- model tokens 1,191k → 1,256k (+6%), all of it the writer;
- critical-path calls 2 → 2, per sample and in the chain run.

## Behavior by probe type

| type | s1 A→B | s2 A→B |
|---|---|---|
| purpose | 3 → 8 (7↑ 2↓) | 4 → 15 (12↑ 1↓) |
| value | 213 → 208 (5↑ 10↓) | 220 → 215 (7↑ 12↓) |
| file-state | 48 → 50 | 61 → 56 |
| rule | 81 → 79 | 76 → 78 |
| multi-hop | 38 → 38 | 32 → 35 |
| rationale | 39 → 38 | 39 → 41 |
| lessons | 42 → 42 | 40 → 43 |
| done | 24 → 25 | 21 → 24 |
| next | 40 → 39 | 36 → 35 |
| false | 91 → 90 | 90 → 90 |
| permission, dropped | same | same |

- **value, the only type down in both draws:** Most losses are 2/3 → 1/3 majority votes with a correct answer whose quoted evidence the grader didn't find in the context. Examples: `path:tests/eval/live.ts`, `exact:todo-fallback`, `sbom-acceptances`, `save-fix-pr` "PR #1419" vs "#1419". A few are wrong answers: `exact:rescored-results` gives the bench jsonl, `log-notes` gives verbose lines, and `str:debug-only` differs only in quote style. None answers with the Session goal where a value was asked. The HEAD vs HEAD noise runs moved `value` 0 and −1, so −5 twice is a weak signal against the line, not proof.
- **next:** 2 losses (`told-4`, firstmate-11 `next-4`). The reader answered with an earlier report, or with the Gorman test from the Session line. That is the "reader answers what's active with the Session goal" case, and it happened once in 138 next probes.
- **purpose:** firstmate-11's reader goes 0/3 → 3/3 at @3–@11 in s2. om-orchestration moves 0 → 2–3/3 at @2–@5. om-v04 moves at @5, @6 and @9.

## Session lines written (main sample 1; length in chars)

- **om-orchestration** (8 writes, 3 distinct lines):
  - "Initialize AGENTS.md and orchestrate agent teams to implement and commit the repository's open tickets." (112)
  - "…implement, review, commit, and merge… then release the completed work." (136)
  - "Orchestrate agent teams to implement, review, commit, merge, and benchmark the repository's open tickets, then release the completed work." (147)
  - The gate passes only at @5, where "benchmark" enters the line.
- **om-v04** (18 writes, 5 distinct lines):
  - "Improve compaction and context handling for long-running Crewmate sessions; I'm the orchestrator coordinating subagents and evaluating Luna's summaries." (161)
  - "Improve observational-memory compaction, context handling, logging, and usage stats for long-running Crewmate sessions; I'm the orchestrator coordinating subagents." (173)
  - The longest was 202. The gate passes from @4, once "observational-memory" is in the line.
- **firstmate-11** (10 writes, 4 distinct lines):
  - "Supervise the Firstmate fleet under Claude stop-hook-owned watcher continuity." (87)
  - "Test and validate Gorman locally, investigate and fix Opie production bugs, and fix Oasis SBOM/CI while coordinating crewmates and reviewing their PRs." (160)
  - The first line has the role but no project. From @4 on, the line lists tasks and drops "Firstmate", so the gate (firstmate + crew/fleet + Oasis/Opie + Gorman/SBOM/USPA) never passes.
- **Holdout:**
  - crew-uspa-4 (1 write): "Re-run the USPA multi-session real-browser smoke test, hunt bugs without fixing them, and produce a standalone report as an autonomous worker managed by firstmate." (172)
  - firstmate-6 (8 writes) drifts from "Supervising the Firstmate fleet…" to "Implementing direct PR fixes and improvements for USPA, Opie, and the crewmate system." (95)
- **Chain** (48 writes, 8 distinct lines, 166–204 chars): "Develop Firstmate, Crewmate, observational-memory, Oasis SBOM, Opie/Gorman, and USPA fixes, with the assistant orchestrating agent teams…". Across the four sessions, the chain line grows by listing projects.
- Every B cut carries a line. No line reached the 300-char stored cap, and none appends phases or version numbers.
- The failure mode now is task lists replacing the role on fleet-supervisor sessions (firstmate-11, firstmate-6, chain), not growth by appending. The clear wording fix is: "keep the role the user gave the assistant; when new projects come in, do not list them; name the kind of work". This was not tried; see below.

## Observer replies reused

- Every run's report shows A and B with 0 fresh calls at main and holdout. B's extra calls are writer calls only, told apart by the writer prompt in each cached call's argv:

  | transcript | A calls per sample | B calls per sample | writer calls |
  |---|---:|---:|---:|
  | om-orchestration | 23 | 31 | 8 |
  | om-v04 | 38 | 56–57 | 18–19 (timing) |
  | firstmate-11 | 26 | 36 | 10 |

- Chain: A 111 calls, 0 fresh. B 160 calls: 111 are A's cached Observer/Reflector replies, and the 49 fresh are all writer calls.
- Every retention gate is identical between A and B in every run, apart from purpose and tokens. tokens moves −0.1, which is the size of the line itself. So the contexts differ only by the line.

## Spend (fresh calls)

- **Writer, per main sample:** 36–37 calls, about 60k tokens in and 1.9k out (om-orchestration 9.8k/0.4k, om-v04 38k/0.8k, firstmate-11 12.4k/0.7k), about $0.015. That is +6% of model tokens, all of it off the critical path.
- **Writer, holdout per sample:** 10 calls, about 12k in and 0.8k out. **Chain:** 48 calls, 161k in and 2.7k out, about $0.036.
- **Writer, all runs:** about 140 fresh calls, about 0.5M tokens in, under $0.15.
- **Behavior reader:** about 150 Luna calls, B's sample 1 and sample 2 (75 each). A was fully cached. The report does not give their tokens.
- **Observer/Reflector:** 0 fresh.

## Checked against the bar

- Behavior Δ ≥ 0 in both draws: **no.** It was −0.3 and +1.4, both inside noise, and ≥ +3 was not reached.
- Purpose gate and probe rise: yes. The gate went 0 → 7/48, and the probe +5 and +11.
- Retention ≥ 0: yes, +0.5 (+1.0 on the chain run's main). Holdout and chain are 0.
- Context ≤ +10%: yes, +0%. Critical-path calls are unchanged: 2 → 2.
- Writer cost small: yes. About 36 background calls and 62k tokens per main sample.

## Not run

- The wording fix for role drift on fleet sessions, described above. Behavior did not drop past noise, so the bar's "if behavior still drops" condition was not met. It is the next thing to try, because firstmate-11's gate stays at 0.
- A second chain draw: base8 has no cached chain sample 2.
- `--long`.

Reports: `.scratch/omv-sess2/final{1,2,3}.{md,json}` (fixed grader) and `run{1,2,3}.{md,json}` (as recorded).
