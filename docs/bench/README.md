# Benchmark baselines

Each baseline is one run of the continuation-quality benchmark (`scripts/bench-live.ts`). That benchmark was retired
in `9c171a7`; see git history for its scripts and usage. The files here are historical baselines. Each has two files:

- `<date>-<version>.jsonl`: one scored record per live run.
- `<date>-<version>.md`: the report made from those records.

The reports of the superseded v1.0.0, v1.1.0 recall-required and v1.2.0 baselines are in `docs/archive/bench/`.
Their `.jsonl` records stay here, because `scripts/bench-bm25.ts` reads every `docs/bench/*.jsonl`.

## The recall-required scenario

`recall-required` tests `om_recall` after a compaction that Claude Code starts on its own. The v1.0.0 baseline did not
test this: its compactions were manual `/compact` commands at 35k–71k context tokens.

1. `shards.sh` prints 200 shard records once. The continuation later asks for the checksum of one of them.
2. The growth prompt runs `logs.sh`, about 27,600 characters of log per run. `bench-live.ts` sends it again after each
   turn until the transcript has a new `compact_boundary` row, at most 30 times. Before each send it waits
   `--settle-ms` (default 30 s) so the plugin's background work can finish, as it does before a manual `/compact`.
3. The continuation asks for the checksum verbatim.

The run sets no autocompact window. The session compacts at its own threshold: your `autoCompactWindow` in
`~/.claude/settings.json`, or Claude Code's default for the model (about 967k tokens for Sonnet 5). The dry run prints
which threshold applies. The 30 growth prompts add about 250k–350k tokens: enough for a 190k threshold. With a
threshold above that, no compaction happens and the run stops as incomplete.

Each run cost $1.40–$1.67 at a 190k threshold (9 growth prompts, compaction at about 155k tokens). The scenario's per-run ceiling is $5, and the budget reserves it
before each run. Give these runs their own results file (`--results`), so that the baseline's runs do not use the
budget. The report shows honest abstention ("I cannot find it") in its own table. It is
not task success.

## Record paths

The records keep the local paths of their run directories and transcripts. Those files are not in the repository, so
`bench-live.ts score` cannot rescore a baseline on another machine.

## 2026-09-24, v1.0.0

- 127 live runs in real Claude Code sessions (Sonnet 5), driven through herdr panes. Token-equivalent cost: $47.82.
- Plugin versions: `old` is v0.4.15 (`c6c86a3`). `new` is v1.0.0 (`5c2f030`).
- Configurations: built-in and built-in+recall on `old` only; om and om+recall on `old` and `new`.
- Scored with the checks at `5318e8c`.

Limits of this baseline:

- `om_recall` was called in no run, so each "+recall" configuration behaved as its twin without recall.
- No reflection ran, so the Reflector is not tested.
- Every om run observed the whole conversation at `/compact` (`compaction.notPersistent`). Its compaction times are the
  slow path. In normal sessions, compaction mostly uses the background observations.
- A run whose conversation fits in the raw tail falls back to the built-in compaction and is invalid. This happened in
  7 of 43 `old` om runs and 7 of 42 `new` om runs. See `TODO.md`.
- The report says "not run" for `new` om+recall `omitted-identifier`. All 3 of those runs ran and were invalid. The
  report now says "0 of 3 valid" for such a cell.

## 2026-09-24, recall-required

- 12 live runs of `recall-required` (Sonnet 5): 3 each of built-in, built-in+recall, om and om+recall, all on v1.0.0
  (`7f84e06`). Token-equivalent cost: $17.76.
- Every run was valid. Each compacted on its own at about 155k tokens (`autoCompactWindow: 190000`).
- Task success: om+recall 1 of 3; built-in, built-in+recall and om 0 of 3. No run invented a checksum. Every run that
  failed said honestly that it could not give the checksum.

What it shows:

- `om_recall` works when called. The one success searched for `shard-101` and returned the checksum verbatim.
- The model rarely calls it. In 5 of the 6 runs that offered `om_recall`, the model did not call it and said the
  shard audit had printed only its summary line.
- Both summaries cause this. The om memory said only that `shards.sh` "reported `audit complete: 200 shards
  verified`", and the built-in summary did the same. The om memory was the same in all three om+recall runs, so the
  one success was the model's choice, not a better memory.
- Scored with the checks at the commit that adds this section: the first abstention pattern missed "I don't actually
  have that", and was widened.

## 2026-09-24, v1.1.0 recall-required

- 9 live runs of `recall-required` (Sonnet 5) on v1.1.0 (`7bec0a9`), labelled `candidate`: 6 om+recall and
  3 built-in+recall. Token-equivalent cost: $15.65. The report sets them beside the v1.0.0 runs above.
- Every run was valid and compacted on its own at a 190k threshold.
- Task success: om+recall 6 of 6 (v1.0.0: 1 of 3); built-in+recall 3 of 3 (v1.0.0: 0 of 3).

What it shows:

- Every run called `om_recall` exactly once after compaction, with no ToolSearch call before it. The pin from #11
  works live: the tool is in the list once the session has compacted.
- The memory did not change. In all 6 om+recall runs it still said only that `shards.sh` reported `audit complete: 200
  shards verified`: the Observer's new rule for listed records did not fire here. The gain came from the tool being
  visible and the recall note at the end of the memory, and it carries to the built-in summary, which has the same
  tool and note.
- 3 and 6 runs are small samples. They show the change, not a rate.

## 2026-09-24, v1.2.0

- 21 live runs of om+recall (Sonnet 5) on v1.2.0 (`ca43bce`). Token-equivalent cost: $12.90.
  - `v120`: 3 runs each of the four scenarios that fell back in v1.0.0 (`omitted-identifier`,
    `failure-in-long-output`, `repeated-compaction`, `pending-approval`), and 3 of `recall-required`.
  - `v120-brief`: the same build with `OM_BRIEF=always`, 3 runs each of `omitted-identifier` and
    `repeated-compaction`.
- Scored with the checks at `fa17073`, which makes `omitted-identifier`'s setup need the deploy to run: one run only
  `cat`'d `deploy.sh`, found the id in its source, and without the fix counted as valid. It is invalid.

What it shows:

- No compaction fell back to the built-in summary: 0 of 33. In v1.0.0, 7 of 42 new om runs fell back, all 3 om+recall
  `omitted-identifier` runs among them. The floor stood in for 4 compactions, in 4 runs, and each of those runs
  succeeded.
- Task success on every valid run: v120 14 of 14 (`recall-required` 3 of 3, so the whole-term ranking did not break
  the v1.1.0 result); v120-brief 6 of 6.
- The always-on brief showed no gain here, because the default already succeeded every time. These scenarios cannot
  tell whether it helps; the real-transcript replay (#13) is the place to measure it.

## Retention over many real compactions

`scripts/bench-replay.ts` (its header gives the usage) replays three long real sessions at their own compaction
points, 5 to 11 compactions at about 158k tokens each, and chains each configuration's compaction through them. It
scores every compacted context with no model: the identifiers the assistant went on to use, the user's constraints
in force, and how both drift from boundary 1 on. The transcripts are private copies in the main checkout's
`tests/fixtures/replay/`. The constraint lists and questions for the two `om-*` sessions are in
`tests/eval/replay-specs/`; firstmate-11's stays local, and only its aggregate numbers are committed.

### 2026-09-24, the sessions' own compactions

`2026-09-24-replay-recorded.md` scores the compaction each session made as it ran. Every compaction in these
sessions was observational memory's (om-orchestration on v1.0, om-v04 on v0.4, firstmate-11 on the build it had
then), so this is not a built-in baseline. No built-in numbers exist until the live built-in chain runs.

| transcript | compactions | needed identifiers held | constraints in force held |
|---|---:|---:|---:|
| om-orchestration | 5 | 43/61 (70%) | all, at every boundary |
| om-v04 | 9 | 55/68 (81%) | all, at every boundary |
| firstmate-11 | 11 | 23/46 (50%) | all, at every boundary; the one reversed constraint never shown as in force |

Every memory held every constraint in force: the memory keeps the user's own words (its corrections are never
reflected, and the current build copies every user message into it by code).

### The dry run: what a full run would spend

`bun scripts/bench-replay.ts dry-run` lists every model call a full run would make over the three transcripts, and
spends nothing. Observer calls are counted from a stub replay of the checkout (`om --pi stub`); reflections and
everything else are estimates.

| configuration | calls | est. cost (a shared compaction counted in each) |
|---|---:|---:|
| builtin | 46 | $18.94 |
| builtin+recall | 46 | $23.36 |
| om | 130 | $4.44 |
| om+recall | 130 | $12.38 |
| all (each call once) | 218 | $41.79 |

Not run yet: the om replay with real Observer and Reflector calls (`--pi live`), the live built-in chain, and the
question stage. Whether Claude Code resumes a session whose rows another writer appended is the first thing the
built-in chain has to show; if it cannot, the chain stops and says which step failed.

### 2026-09-24, the Reflector on real data

`2026-09-24-reflector.md` gives the details. No real session grows the memory to the Reflector's 40k threshold. The
replay therefore chains four real sessions into one: `om-v04+om-orchestration+firstmate-11+firstmate-6`, with 31
compactions. It ran with the real Observer and Reflector twice. It includes private transcripts, so only aggregate
numbers are given here.

- The Reflector triggered naturally once per run, after boundary 22. It condensed ~40.3k tokens of observations to
  2.9k and 3.7k at level 1, with 658 and 669 lines down to 38 and 50. There were no failures and no retries.
- It overshot the 20k target about fivefold. It compressed the newest lines as hard as the oldest, and kept 0 of 8
  and 1 of 10 of the identifiers the next boundaries needed.
- Every constraint in force stayed in the memory, because the corrections section passed through unchanged. The
  observations alone lost 9 to 11 of them. Every written line kept a source range, but the ranges were wider
  (median 12 → 32–42 min).
- Sonnet's answers from what the user said did not degrade after the reflection. Questions on identifiers the
  reflection dropped went to 0/5 with om alone. om+recall recovered 3/5, with 8 to 14 om_recall calls.
- The replays cost $0.85 in pi and $6.07 in question sessions.

### 2026-09-24, v1.3.0

`2026-09-24-v1.3.0-replay.md` gives the details. It reruns the three replays and the chain with v1.3.0's real
Observer and Reflector. It also adds boundary-specific handoff questions (`next-N`, `told-N`): what the assistant was
about to do at boundary N, and what it had last told the user.

- The reflection now meets issue #14's size and 🔴 checks. It ran after boundary 19: 40,106 → 16,204 tokens (81% of
  the 20k target), with the newest 203 lines left alone. It kept 8 of the 8 identifiers the next boundaries needed,
  and kept all 10 🔴 lines byte for byte, promoting none. om alone answered 3 of the 5 lost-identifier questions
  at every later boundary (v1.2.0: 0 to 2). No second reflection happened: the memory reached ~38.7k of 40k by
  boundary 31.
- Every constraint in force was held on every replay.
- Handoff questions, over the three transcripts: om 15 → 18 of 44 and om+recall 29 → 26 of 44 (v1.2.0 → v1.3.0).
  The om+recall sessions called `om_recall` 26 times on v1.2.0 and twice on v1.3.0. On om-orchestration, built-in
  scored 3/10 and built-in+recall 4/10.
- Retention of needed identifiers moved by run: om-orchestration 56% → 61%, firstmate-11 37% → 50%, om-v04
  66% → 56%, chain 54% → 49%. The chain's loss came mostly before the reflection. om-v04's fact answers fell
  (om 25 → 23 of 27, om+recall 26 → 19). Each version has one run, so these moves may be Observer variance.
- Question sessions cost $20.93; the pi replays cost $0.76.
- Live runs (`2026-09-24-v1.3.0.{jsonl,md}`, om+recall only, Sonnet 5): 6 of 6 valid runs succeeded
  (`recall-required` 3/3, `repeated-compaction`, `reversed-constraint`, `pending-approval`), with no fallback to the
  built-in summary over 8 compactions (one on the floor). Three `recall-required` runs, two on v1.3.0 and a v1.2.0
  control, were incomplete: Sonnet redirected `logs.sh` to a file and read its last line, so the context never
  reached the auto-compact threshold. `logs.sh` now refuses a redirect or pipe (`92e3cba`); the run after the fix
  succeeded. Live runs cost $12.02.

### 2026-09-24, why v1.3.0's om+recall sessions stopped calling om_recall

The v1.3.0 question sessions called `om_recall` twice where v1.2.0's called it 26 times. The cause was the harness,
not the plugin.

- Question grouping. v1.3.0 asked each boundary's fact and handoff questions in one session. v1.2.0 asked the
  handoff questions alone. With the facts in the same session, Sonnet answered everything from the memory in one
  reply. At om-v04 boundaries 3 and 6 it wrote `next-3: unknown` and `told-3: unknown` and stopped without calling
  the tool. v1.2.0's fact-only sessions called `om_recall` in none of 14 sessions either.
- The standing compaction note is not the cause. Question sessions load the recall-only plugin
  (`tests/eval/recall-plugin`), which sends no system-prompt note. The recall note at the end of the memory has the
  same wording and position in both versions, and the assembled recall plugins are byte-identical.
- A second harness bug: a +recall session's JSON `result` holds only its last reply. At om-v04 boundary 2 the model
  answered the facts, then searched, then answered only the handoff questions, so two correct fact answers scored as
  empty. Answers are now read from every reply in the transcript.

Both are fixed in `bfddc94`. The question stage now puts a boundary's handoff questions in a session of their own.
`om --cache DIR` gives a replay a fresh pi cache, so it samples the Observer again instead of reading back the
first run's cached replies.

Matched rerun: v1.3.0's memory (`om-v130`), handoff questions asked alone, as v1.2.0's were:

| transcript | om_recall calls v1.2.0 → v1.3.0 | om+recall handoff v1.2.0 → v1.3.0 |
|---|---:|---:|
| om-orchestration | 9 → 6 | 5/10 → 5/10 |
| om-v04 | 8 → 3 | 12/17 → 12/17 |
| firstmate-11 | 9 → 8 | 12/17 → 11/17 |
| all three | 26 → 17 | 29/44 → 28/44 (mixed sessions: 26/44, 2 calls) |

om alone, handoff questions asked alone, on om-orchestration and om-v04: 11/27 (v1.2.0: 12/27). The same v1.3.0 memory
asked in mixed sessions scored 12/27, so single sessions move by about ±2 on the same input. v1.3.0 searched a little
less for the same score. Its continuation record already states the next steps and what was told to the user. One
run cannot separate that from noise.

om-v04's fact drop is Observer variance. Two more v1.3.0 replays, each with its own pi cache, with fact questions
asked alone:

| om-v04 run | needed identifiers held | om facts | om+recall facts |
|---|---:|---:|---:|
| v1.2.0 | 45/68 (66%) | 25/27 | 26/27 |
| v1.3.0, run 1 (mixed sessions) | 38/68 (56%) | 23/27 | 21/27 (19 before the reply fix) |
| v1.3.0, run 2 | 44/68 (65%) | 25/27 | 25/27 |
| v1.3.0, run 3 | 46/68 (68%) | 26/27 | 24/27 |

In run 1 the Observer never recorded the proposed log format that contains "+11 notes", so `log-notes` failed at
most boundaries. Runs 2 and 3 recorded it from boundary 4 on, as v1.2.0 did.

Cost: $13.44 in question sessions, $0.28 in pi. The question stage's estimates ran about twice the actual cost.


## 2026-09-25, BM25 inside the whole-term gate (issue #20)

`2026-09-25-bm25.md` gives the details. `scripts/bench-bm25.ts` ranks 90 real `om_recall` queries (17 from benchmark
runs, 73 from replay question sessions) and 8 synthetic ones two ways, with no model. It compares the current order
with pi's BM25-lite (k1 = 1.2, b = 0.75, 20% noise floor on multi-term queries, cap 50) inside the same whole-term
gate. BM25 ranked the needed block higher on 7 real queries and lower on 12, and first on 70 against 75. The current
ranking stays, and BM25 stays rejected.
