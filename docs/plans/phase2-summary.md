# Phase 2 summary: compaction quality and speed (2026-09-25)

This is the closing record of Phase 1 (the A/B benchmark) and Phase 2 (improving compaction with it). Every idea, number and verdict is in `compaction-ideas.md`. Every worker report is in `results/`, and the code for each idea is in `docs/archive/plans/results/diffs/`. The goals are in `compaction-goals.md`.

## Where we are

**base8** is HEAD `af0940d` plus 22 kept changes. It landed as observational-memory v1.4.0 (commit `8003175`).

- Plugin copy as tested: `.scratch/omv-code/base8`
- The patch as applied: `docs/archive/plans/results/diffs/base8.diff`
- On landing, one fixture-only replay test (`replays a firstmate transcript`) expected 1 observation per chunk; carry5f makes it 2 and 6, and the test now says so. 373/0 tests.

### Scores

All scores come from `scripts/bench-compact.ts`, graded against the same rubric. The rubric changed during Phase 2 (see Benchmark changes), so these numbers are all regraded with the final rubric.

| Track | HEAD af0940d | base4 | base5 | base7 | base8 |
|---|---:|---:|---:|---:|---:|
| Main (3 sessions, 25 cuts) | 72.4 | 75.4 | 78.3 | 78.3 | 82.9 |
| Holdout (3 sessions, 14 cuts, informational) | 75.3 | 83.4 | 82.9 | 82.9 | 83.5 |
| Reflection chain (4 sessions, 31 cuts) | 70.0 | 81.9 | 80.5 | 81.0 | 80.7 |
| Long chain (13 sessions, 80 cuts) | 53.8 | 59.9 | 59.7 | 61.8 | 61.3 |
| Long chain, recall-aware credit | 32.7 | 35.4 | 43.4 | 43.6 | 41.3 |

### Efficiency

| Measure | HEAD af0940d | base7 | base8 |
|---|---:|---:|---:|
| Main context per cut, mean / max | 22k / 36k | 19k / 31k | 21k / 34k |
| Main reduction ratio (compacted / replaced) | 14.1% | 12.1% | 13.2% |
| Main model tokens (Observer in + out) | 1,290k | 1,217k | 1,217k |
| Long context per cut, mean / max | 48k / 79k | 43k / 72k | 45k / 69k |
| Long model tokens | 5,695k | 6,039k | 5,344k |
| Long Reflector calls | 6 | 10 | 9 |
| Long critical-path calls (compaction waits on them) | 113 | 115 | 4 |
| Long compactions that block | ~28 of 80 | 29 of 80 | 3 of 80 |

Latency in the replay is virtual: the benchmark counts calls and tokens, not seconds. The live plugin compacts in about 0.3–0.5 s when the background Observer has kept up. It blocks for 17–26 s when it hasn't (I56).

## What landed

Grouped by effect. Each ID links to its entry in `compaction-ideas.md`.

**Smaller context, no loss (deterministic, no model calls):**
- I3 grp: one source range per run of lines, not per line.
- I9 tail-mask: old tool results in the raw tail cut to head and tail (keep the newest 3, cap 250 tokens).
- I36 input-mask: the same for old oversized tool inputs; subagent briefs stay whole.
- I14 day-once: the date is written once per day.
- I15 user-dedup: a user message the corrections already quote isn't repeated.
- I38 wrap-dedup: repeated notices in the raw tail keep only the new lines.
- I44b2 users-short: short user prompts kept whole in more cuts, at the same size.

**More kept facts (deterministic):**
- I10 open-failures: a code-built list of failures not yet fixed.
- I55 lookup-fail: a lookup of a missing path is an open failure until a later call finds it.
- I35 refl-keep-ids: file paths the Reflector drops are put back.
- I37 image-prompt: user prompts that start with an image are kept.
- I42 replies (1k): the assistant's last reply of each turn that left context is quoted.
- I53 carry: up to 5 of the assistant's own sentences per chunk, copied word for word, when they hold a number, path, identifier or reason that no observation covers (carry5f). On base7: main +4.6 (29 up / 0 down), behavior 67.6% → 74.9%, context +9%.

**Observer:**
- I21 target9: a size target of about 9 lines per 10k-token chunk. The one prompt change that held up (main +2.0, p 0.0066).

**Reflector:**
- I25 refl-tier: a reflection doesn't condense an earlier reflection's lines again.
- I49 refl-retry: a too-short reflection retries with a changed prompt (long Reflector calls 18 → 10).

**Speed and robustness (bugs):**
- I54 rows-cap-step: past 4,096 history rows, mid-turn observation stopped, so long sessions blocked at compaction. Long critical-path calls 115 → 4, blocked cuts 29 → 3 of 80.
- I56 compact-align: the persistence check assumed the history ends where the context ends. A trailing `/compact` row broke it, so manual compaction discarded the background notes and blocked 17–26 s.
- I34 retry-backoff: a failing Observer retried with no delay and spun at 100% CPU.
- I28 pin-lifecycle: the constraint tier is bounded instead of falling off two cliffs.
- I51 quote-fix: I15's quote stubs read back the wrong span (157 polluted entries on the long chain).
- The `(source none)` fix: a line with no source took the next line's range when the ledger was rebuilt, which pointed `om_recall` at the wrong rows.

## What didn't work, and why

- **Prompt-only Observer changes are noise.** I11 supersede, I16 medium thinking, I18 details, I19 smaller chunks, I26 session line, I27 observer context, I33 handled marks and I48 reports-first all moved main by less than the ±2-point draw noise, or flipped sign between draws. Only I21's size target held.
- **Earlier or more frequent reflection always loses content.** I20 reflect-early, I23 refl-share, I45 (three threshold shapes) and I22 refl-why cut the long context but lost commits, chronology and identifiers. The Reflector keeps the gist and drops the specifics.
- **Handoff notes are slow.** I8 Amp-style handoff took 38–48 s per compaction (8–18 s as a hybrid), and the note writing was unreliable. Rejected by the user.
- **Cutting sections loses what the rubric can't see as lost until later.** I44a per-line stubs, I44c correction caps, I30 remind, I31 working set, I41 newest-cap, I24 mask-keep-cited, I39 reminder-strip and I50 SHA cues saved little or lost real content.
- **Observing more often costs more than it saves.** I52a frontier doubled Observer calls to shrink the raw tail, and the extra lines cancelled the saving.

## Lessons

1. **Deterministic carries beat prompt changes.** Copying verbatim text by code (I10, I35, I42, I46, I53) gave the reliable gains. Asking the Observer to write more of something did not.
2. **The Observer is the ceiling.** The gap analysis on base7 (`results/1405-code-gap-b7.md`) found that 14.2 of the 21.7 missing main points are facts the Observer saw and didn't write. The code paths lose almost nothing. A model-free compaction (I13) scores 60.9, so the Observer is worth about 17 points.
3. **Long sessions are bounded by size and the Reflector.** On the long chain, 16.7 of 38.0 missing points are cuts over the 40k budget, and 7.2 are specifics the Reflector drops. The context follows a sawtooth (about 44k mean) and doesn't grow without bound.
4. **The biggest speed wins were bugs, not designs.** I54 and I56 made compaction non-blocking where it wasn't. Neither showed in quality scores.
5. **Storage plus `om_recall` bends the curve.** Recall-aware credit rose 32.7 → 43.6 through exact source ranges, with no extra context. Changes that narrowed ranges (I44a) lost that credit.
6. **One draw decides nothing when the Observer's input changes.** Cached A/Bs are exact. A recorded A/B has about ±2 points of draw noise on main, and about 16 up / 12 down item churn on the long chain.

## Benchmark (Phase 1) and its changes

`scripts/bench-compact.ts` replays real transcripts at their own compaction points from cached Observer and Reflector replies, and grades each compacted context by code. Tracks: main, holdout, reflection chain and long chain (`--long`). `--behavior` adds a reader model (Luna) that answers probes on each context. The efficiency scorecard is kept apart from the quality total. A/B verdicts use unique-item sign tests, a resample noise floor, and a hard rule that a gain with more than +10% context is a tradeoff, not a win.

It was hardened against known attacks: identifier lists, prose-wrapped lists, padded sentences and user-message dumps no longer beat the plugin. Negative controls check that no item passes on a different transcript's context.

Grader fixes during Phase 2 (each moved every variant the same way):
- Reversals: short lines that quote the user's own words count (I15 had looked like a gain because of this).
- Home paths: five comparisons now normalize `/home/cameron` (holdout +4 for every variant).
- Dayless source-range ends take the heading's day (recall-aware +1.2).
- Behavior answers for multi-hop probes may join up to 3 verbatim parts.
- The purpose gate and its items; 'fleet' accepted for firstmate-11.

Known limits:
- Latency is virtual. Live timing needs a live run.
- The purpose gate scores 0/24 for every variant: the facts are present but never on one short line.
- Holdout and long each rest on one Observer draw per variant.
- base8's long score (61.3, recall-aware 41.3) is below base7's (61.8, 43.6). Most of the drop is the commits gate: one fresh Reflector call near cut 45 condensed a PR list, and PRs 238 and 1417–1425 were gone from cut 50 on. That fits Reflector sampling (base7's Reflector resample churned 16 up / 12 down), but only one draw was taken, so it isn't proven.
- `--behavior` was not rerun on base8. The behavior gain (67.6% → 74.9%) is carry5f's, measured on base7.
- Rubric items come from assistant statements, so carries of assistant text (I42, I53) can be rubric-fitted. The behavior probe is the check.

## Open issues

- **I57 duplicate tail (engine bug).** After our compaction, Claude Code gives every kept message a new uuid and shows it again, so the last answer appears twice. The memory message also shows as a long user prompt. No plugin-side fix exists (`results/1515-dup-tail.md` has the evidence and a draft bug report). Not filed yet.
- **I56 auto and subagent mismatches.** The manual case is fixed. Auto and subagent compactions still fail the persistence check sometimes (43 of 82 in session 40c779b6, mostly subagents). Since v1.4.1 a mismatch keeps the background notes up to the first differing row, and the stats count how it differs: by trigger, by shape (`extra`, `missing`, `changed`, `short`), by the two rows' kinds, how far from the end, and the rows kept. `/om-stats full` shows the cause. The current guess is task notifications injected into the context.
- **Arm C (I57).** A one-line change that keeps real assistant rows (thinking signatures, attachments) instead of stand-in rows. It doesn't fix the duplicate. Not in base8.
- **Parked:** I4 thinking (#22, PR #27), I5 observer-tool (PR #26), I7 tasks (#28), I32 threads, I40 users-first, I43 file-ledger, I42 at 2k.

## Next steps

1. Decide whether to file the I57 engine bug.
2. Read the `compaction.notPersistent.*` counts in `/om-stats full` after some sessions on v1.4.1, then fix I56's remaining cases.
3. If quality work resumes, the lever is what the Observer writes (lesson 2). Try deterministic carries first.
