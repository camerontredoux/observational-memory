# The Reflector on real data, 2026-09-24

The Reflector condenses the memory's observations once they pass `REFLECT_AT_TOKENS` (40k), to come under
`REFLECT_TARGET_TOKENS` (20k). Before this run it had never run on real data. None of the 38 real sessions with stats
had a reflection, and the largest memory was 23k tokens. The three real-transcript replays peaked at about 23k.
Unit tests checked only its mechanics, with stubbed replies.

This report covers one long replay that makes the Reflector run naturally. It scores each reflection without a
model, then asks headless Sonnet questions at the boundaries just before and just after the reflection. The replay
includes private firstmate transcripts, so this report gives aggregate numbers only. The only quoted examples come
from the two committed `om-*` sessions.

## The long session

No single real session reaches 40k. The session with the most compactions has 11 (firstmate-11), and its memory
peaked at about 23k. The 28 MB firstmate transcript has one compaction, at about 967k tokens. At the rate measured
below (about 2.3k tokens of memory per 158k-token window), that would make roughly 14k, so it was not replayed.

`bench-replay.ts` now accepts a chain as a transcript name: `om-v04+om-orchestration+firstmate-11+firstmate-6`. It
replays the four sessions in order as one continued session: 9 + 5 + 11 + 6 = 31 compactions, about 1.3M tokens of
real traffic. The ledger, the memory and the corrections carry across the joins. Every session except the last is
shifted back in time so that it ends an hour before the next one starts. Each session's spec is shifted to its
boundaries. firstmate-6 is a local copy of a live 16 MB firstmate session, taken with 6 compactions. The chain
approximates one very long orchestrator session. It is not one: the sessions span two repositories, and the user
never typed them as a single conversation.

The replay's `$.session.messages()` now answers only the newest 4096 rows, as the engine does. The chain has more
rows than that, so the cap matters here.

```
bun scripts/bench-replay.ts om --transcript om-v04+om-orchestration+firstmate-11+firstmate-6 --pi live --max-calls 200
bun scripts/bench-replay.ts reflections --transcript om-v04+om-orchestration+firstmate-11+firstmate-6
bun scripts/bench-replay.ts questions --transcript om-v04+om-orchestration+firstmate-11+firstmate-6 --configs om,om+recall --boundaries 22,23,31 --budget-usd 4 --live
```

## It triggered naturally, once, after boundary 22

The chain ran twice with the real Observer and Reflector (pi, Luna). The two runs differ only in how the first run
shifted timestamps (see "Measurement fixes" below). Both behaved the same way:

| run | Observer calls | Reflector calls | failures | reflections | memory message at boundary 22 → 23 | pi cost |
|---|---:|---:|---:|---:|---|---:|
| 1 | 109 | 1 | 0 | 1, after boundary 22 | ~48.9k → ~13.2k tokens | $0.43 (38 calls from cache) |
| 2 | 109 | 1 | 0 | 1, after boundary 22 | ~48.3k → ~13.5k tokens | $0.42 |

The observations first passed 40k in the firstmate-11 part of the chain, 7 compactions into it. Before that the memory
message grew by about 2.3k tokens per compaction. After the reflection it grew back from 13.5k to 23.4k by boundary
31, so a second reflection would come about 15 compactions later. The chain does not reach it.

| run | tokens before → after (target) | level | lines replaced → written | newer lines left alone | Reflector call |
|---|---|---:|---|---:|---|
| 1 | 40,302 → 2,905 (20,000) | 1 | 658 → 38 | 0 | 54k in, 3.9k out, 75 s, $0.016, ok |
| 2 | 40,265 → 3,697 (20,000) | 1 | 669 → 50 | 0 | 54k in, 4.8k out, 92 s, $0.017, ok |

Both reflections succeeded at the first compression level, with no retries and no failures.

## What each reflection kept (no model)

`bench-replay.ts reflections` compares the ledger just before each reflection with the ledger just after it
(`scoreReflection`):

| measure | run 1 | run 2 |
|---|---|---|
| Corrections section passes through unchanged | yes (63 corrections) | yes (72 corrections) |
| Constraints in force, whole memory | 19 → 19 of 20 | 20 → 20 of 20 |
| Constraints in force, observations alone | 15 → 4 | 13 → 4 |
| 🔴 lines replaced → written | 5 → 4 | 7 → 6 |
| Identifiers a later boundary needs, held before → kept after | 8 → 0 | 10 → 1 |
| Early identifiers (first seen in span 0, needed later) | 26 → 4 of 39 | 29 → 7 of 39 |
| Written lines with a source range | 38/38 | 50/50 (1 spans everything replaced) |
| Median source-range width | 12 → 42 min | 12 → 32 min |
| Widest source range written | 9.4 h | 33 h |

- **Constraints held, but only because of the corrections section.** Every constraint in force survived in the
  memory, and the corrections section passed through untouched. In the observations alone, 9 of 13 (run 2) and 11 of
  15 (run 1) went missing. In run 1 the missing ones from the committed sessions were om-v04's subagent model, standing brief, note count, rare fallbacks and
  quiet subagent logs, and om-orchestration's merge-after-review, two reviewers, reviewer effort and three runs. The
  design relies on the corrections section and the user messages to hold constraints, and in this run they did.
- **It compressed about 10×, not 2×.** The target was "at most ~20k tokens … about 49% of their size or less". The
  Reflector returned 7–9% of the input. The prompt makes 20k a ceiling, not an aim, and at level 1 the model went far
  past it. Most of what was lost is what 20k would have had room for.
- **It compressed the newest work as hard as the oldest.** No newer lines were left alone. The last few hours before
  the reflection were the work in progress, and they went from dozens of lines to a handful. The identifiers the next
  boundaries needed were almost all in that recent stretch: 0 of 8 and 1 of 10 survived.
- **Source ranges survive, but they get wider.** Every written line has a range, so om_recall can still go to the
  source. Merged lines cover wider windows (median 32–42 min, up to 33 h), so a recall search has more ground to
  cover.

### What it dropped or mangled

These examples come from reading both reflected memories. The two quoted ones come from the committed om-v04 session.

- **Reattribution.** Run 1 turned "🔴 Assistant assigned a subagent to implement the stats summary … use `full` …"
  into "🔴 User required concise human-readable `/om-stats` output while preserving detailed metrics behind `full`".
  That line gives the user as the author of the assistant's plan.
- **A user's words changed.** Run 2 turned the user's request to keep the detailed table "behind an `all` mode" into
  "behind `full`/a flag". The later build used `full`, but the 🔴 line no longer says what the user asked for.
- **Priority markers moved.** Run 2 promoted one 🟡 line to 🔴 and dropped two 🔴 lines. One was a bare "yeah go for
  it hanks" approval. The other was a rejected benchmark batch. Run 1 dropped the same bare approval.
- **Recent file-level detail dropped.** Examples are a schema path, a worktree path, a PR number in another
  repository, a config file a command reported missing, and which notes file got an edit. The questions below measure
  these.

Everything else checked out. No constraint in force was lost from the memory as a whole, and no Reflector reply was
malformed.

## Questions before and after (headless Sonnet)

At boundaries 22 (before), 23 (just after) and 31 (the end), each configuration was asked every committed question
from the chained specs: 10 to 12 with exact checks, plus 5 that need a grader. In addition, 5 local-only questions
covered identifiers the memory held before run 1's reflection and dropped in it. Exact checks follow; the 5
grader-only answers were read by hand and were correct at every boundary in every run.

| run | configuration | spec questions @22 → @23 → @31 | dropped-identifier questions @22 → @23 → @31 | om_recall calls |
|---|---|---|---|---|
| 1 | om | 9/10 → 11/11 → 12/12 (and 10/10 → 11/11 → 12/12) | 4/5 → 0/5 → 0/5 | none |
| 1 | om+recall | 9/10 → 11/11 → 12/12 (and 10/10 → 10/11 → 12/12) | 5/5 → 3/5 → 5/5 | 0, 14, 9 (dropped-identifier sessions) |
| 2 | om | 9/10 → 10/11 → 12/12 | 2/5 → 0/5 → 1/5 | none |
| 2 | om+recall | 9/10 → 11/11 → 11/12 | 4/5 → 3/5 → 4/5 | 7, 8, 20 |

- **Answers from the user's own words did not degrade.** The spec questions ask what the user said. The memory keeps
  those in its corrections and user messages, which the reflection does not touch. Every failure on them was a
  wording mismatch the exact check does not accept: "first user message" for "first message", and "+N notes" for
  "+11 notes".
- **Answers from the observations did degrade.** Without recall, the dropped-identifier questions went to 0/5 just
  after the reflection in both runs, and the answers said "unknown", not a wrong guess. At 31, om scored 0 and 1 of 5:
  a few items came back only because later sessions mentioned them again. One answer at 31 gave a different worktree
  (`…/5/…` for `…/2/…`).
- **Recall recovered most of it.** Just after the reflection, om+recall answered 3 of 5 in both runs, with 8–14
  om_recall calls. It found the same three each time: the PR, the worktree and the notes file. It missed the config
  file and gave a related constant file for the schema file, which is plausible but not what the check wanted.
- Before the reflection, with a 62k-token context, om alone missed 1 (run 1) and 3 (run 2) of the five dropped
  identifiers, even though the memory held them. In a memory that size, the answer can be there and still be missed.

## Spend

- pi (Observer and Reflector): $0.43 + $0.42 = $0.85, plus one free stub run. The cap was $3.
- Question sessions (Sonnet): $1.82 + $2.09 (run 1) + $2.16 (run 2) = $6.07. The cap was $10.
- The forced variant (a lower REFLECT_AT for the replay) was not needed and not built. The reflection happened
  naturally.

## Measurement fixes on the way

- In run 1, the chain shifted each session forward in time. That put the last sessions after the current time. A
  question session resumed on a seeded copy writes rows stamped with the current time, so they sorted before the
  seeded boundary, and `recallCallsIn` counted 0 om_recall calls. The chain now shifts earlier sessions back instead.
  Run 1's recall counts above were recounted from its session files, and run 2 counted them directly.
- The first stub run showed the reflection hook reading every `$.store.set` as a ledger. It now reads only ledgers
  with entries. The error was in the replay harness, not the plugin.

## Not verified

- A second reflection, one that condenses already-reflected lines, and compression levels 2–4 on real data. Both
  natural reflections succeeded at level 1.
- A single real session that reaches 40k on its own. None of the local sessions has more than 11 compactions.
- Continuation quality after a reflection in a live session: whether the assistant keeps working well on the
  shrunken memory. Only the question stage was measured.
- The grader-only answers were read by one person, and the dropped-identifier questions are five items written after
  seeing run 1. They show the direction of the effect, not a rate.
