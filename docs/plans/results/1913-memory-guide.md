# Merged memory guide: shorter instruction text in the memory message

Question: can one merged, shorter set of instructions in the compacted memory message keep the model's behavior while it uses fewer tokens?

A: main `HEAD@bca4b4a` (v1.4.1). B1: `.scratch/omv-guide/guide`, the first draft. B2: `.scratch/omv-guide/guide2`, B1 with two dropped rules put back (the one fix attempt). The diff in `diffs/memory-guide.diff` is B2 against HEAD.

## Result

**Not kept yet.** The text is 45% smaller, and retention is exact. Behavior is 0 to 1.7 points lower in three of the four comparisons, and `value` is lower in all four. Those four comparisons share only two A draws, and no A-against-A reader resample exists. Thus I cannot tell a small real loss from reader noise. The bar was "behavior Δ ≥ 0 across samples, with no probe type clearly lower". B1 does not meet it. B2 meets it on sample 1 only.

| Run | Instruction tokens | Retention A → B | Behavior A → B (Δ) | Probes ↑ / ↓ | Probe types clearly lower |
|---|---:|---|---|---:|---|
| B1, sample 1 | 1058 → 532 | 82.9 → 83.0 (exact) | 73.9 → 72.8 (−1.1) | 33 / 43 | rationale −5, false −4, value −4 |
| B1, sample 2 | 1058 → 532 | 82.2 → 82.3 (exact) | 74.5 → 73.4 (−1.1) | 36 / 46 | file-state −7, value −8, rule −3 |
| B2, sample 1 | 1058 → 579 | 82.9 → 83.0 (exact) | 73.9 → 73.9 (0) | 29 / 29 | value −5 |
| B2, sample 2 | 1058 → 579 | 82.2 → 82.3 (exact) | 74.5 → 72.8 (−1.7) | 31 / 46 | value −9, file-state −5 |

Instruction tokens are the characters / 4 of `MEMORY_HEADER`, the guide, the resume block, `MEMORY_RECALL` and `COMPACTION_BRIEFING`, with recall available. Context tokens per cut are 21k in A and B (mean), and the mean is 2% lower in B. The only retention gate that moved is `tokens` (+1.1). Observer and Reflector calls: 0 fresh in every run, as the cache keys did not change.

Behavior per probe type (majority of 3 reader answers):

| Probe type | A s1 | B1 s1 | B2 s1 | A s2 | B1 s2 | B2 s2 |
|---|---:|---:|---:|---:|---:|---:|
| rule | 77/90 | 78 | 76 | 75/90 | 72 | 73 |
| permission | 29/29 | 29 | 29 | 29/29 | 29 | 29 |
| done | 24/28 | 24 | 23 | 21/28 | 24 | 21 |
| next | 40/69 | 39 | 41 | 36/69 | 41 | 37 |
| value | 210/286 | 206 | 205 | 218/286 | 210 | 209 |
| lessons | 42/49 | 40 | 43 | 40/49 | 42 | 45 |
| file-state | 46/79 | 48 | 48 | 61/79 | 54 | 56 |
| multi-hop | 37/44 | 37 | 38 | 31/44 | 30 | 29 |
| rationale | 38/55 | 33 | 39 | 39/55 | 39 | 38 |
| purpose | 3/24 | 6 | 4 | 4/24 | 4 | 4 |
| dropped | 32/39 | 32 | 32 | 32/39 | 32 | 32 |
| false | 83/102 | 79 | 83 | 80/102 | 79 | 78 |
| **all** | **73.9%** | **72.8%** | **73.9%** | **74.5%** | **73.4%** | **72.8%** |

## What the downs are

I read the B1 sample-1 downs one by one.

- 18 of 43 downs (25 of 46 in sample 2) are answers that are correct but whose quoted evidence is not verbatim in the context. The reader joins two quotes with `;`, and the grader rejects the quote. The ups have the same kind at a lower rate (15 of 33, 12 of 36).
- 7 downs in B1 s1 (9 in B1 s2) are "no answer": one reader reply at the cut was not valid JSON, and every probe at that cut fails. Both sides have such replies: A has 2 in sample 1, and B1 has 2 in each sample. `2714b61954aba55630a7c3e3-s1.txt` (B, om-v04@9) is one of them.
- `false/no-remote` and `false/upstream-push` (5 downs) are grader false negatives. B answered "None; nothing was pushed to GitHub." The pattern `(?<!not |n't |never |nothing )pushed to (github|origin)` matches "was pushed to GitHub".
- `rationale/why:opus-round` (4 downs, one probe at 4 cuts) is B answering "unknown", with a recall query, where A named the fixes. The context names the fixes but not which review found them, so both answers are defensible.

When I re-grade B1 sample 1 without the unparsable replies, the per-draw rates are A 72.1 / 71.2 / 74.6 and B 73.4 / 72.2 / 72.2. The means are equal (72.6). The majority vote is −1.2.

The fix attempt (B2) put back two rules that B1 had dropped. The first is "not another session's: the files you read or changed, the commands you ran, what the user asked and decided", because file-state and value probes ask for those. The second is the "will start / changed to / moved to" update cue. B2 recovered sample 1 (0) and lost more on sample 2 (−1.7). `value` stayed lower in both.

## The texts

Old (v1.4.1): `MEMORY_HEADER` (46 tokens), `MEMORY_INSTRUCTIONS` before the data (461: SESSION HISTORY, KNOWLEDGE UPDATES, SYSTEM REMINDERS), `MEMORY_CONTINUATION` in a plugin-written `<system-reminder>` after the data (222), `MEMORY_RECALL` (86), and `COMPACTION_BRIEFING` in the system prompt (243). Total 1058.

New (B2): `MEMORY_HEADER` (37), `<memory-guide>` before the data (228 with recall), `<resume>` as the message's last block (198 with recall), `COMPACTION_BRIEFING` (69). Total 579 (B1: 532).

Changes:

- Each rule is stated once. "Constraints stay in force" appears once. "Resume, do not redo" appears once, in `<resume>`. om_recall appears once in the guide (the `(source A to B)` note) and once in `<resume>`.
- The SYSTEM REMINDERS paragraph is removed. The fake `<system-reminder>` is replaced by `<resume>`.
- `<resume>` stays at the end, because it is the last text the model reads before the kept messages. It starts with "Continue from the latest message".
- The briefing no longer lists the sections. It names the two blocks and says "continue the work where it stood; do not restart it".
- `MEMORY_MARK` (the header's first words, which v1.4.1's header also starts with) replaces `MEMORY_HEADER` as the marker in `register.ts`, `recall.ts` and `tests/eval/legacy-recall.ts`. Thus old and new memory messages are both found. `tests/eval/bench.ts` has its own copy of the same `MEMORY_MARK` and `FLOOR_MARK`. It matches both formats with no change. `register.ts` still removes a `<system-reminder>` from an old memory message when it reads it.
- The new test "a memory message in v1.4.1's framing is read whole and written again in the new one" feeds a copied v1.4.1 message through `session.compact` and checks that the corrections, observations, continuation and user messages carry over, and that the old framing is gone.

## Checks

- `claude plugin test` in `.scratch/omv-guide/guide2`: 375 pass, 0 fail.
- `bunx -p typescript tsc -p .` in `.scratch/omv-guide/guide2`: 6 errors, all missing `tests/fixtures/*.local.ts` modules.

## Commands

```bash
bun scripts/bench-compact.ts ab --a HEAD --b .scratch/omv-guide/guide --behavior --json .scratch/omv-guide/ab-guide.json
bun scripts/bench-compact.ts ab --a HEAD --b .scratch/omv-guide/guide --behavior --samples 2 --behavior-sample 2 --no-chain --no-holdout --json .scratch/omv-guide/ab-guide-s2.json
bun scripts/bench-compact.ts ab --a HEAD --b .scratch/omv-guide/guide2 --behavior --no-chain --no-holdout --json .scratch/omv-guide/ab-guide2-s1.json
bun scripts/bench-compact.ts ab --a HEAD --b .scratch/omv-guide/guide2 --behavior --samples 2 --behavior-sample 2 --no-chain --no-holdout --json .scratch/omv-guide/ab-guide2-s2.json
```

Reports: `.scratch/omv-guide/ab-guide*.md`. The first run also has holdout (A 83.5, Δ +0.1) and reflection chain (A 80.7, Δ +0.3). Both are exact.

Cost: 393 fresh Luna reader calls (18 A + 75 B1 in run 1, 75 A + 75 B1 in run 2, 75 B2 in each of runs 3 and 4). There were 0 fresh Observer or Reflector calls. The script does not record reader tokens. At about 22k input tokens per call, this is about 9M input tokens.

## Not run

- An A-against-A reader resample, which is the noise floor for behavior. The script has no reader-resample option. Without it, a Δ of −1 cannot be called real or noise.
- `--long`, and the chain and holdout for samples 2 and B2.
- A live session. The benchmark reader does not see the system prompt, so the new `COMPACTION_BRIEFING` is not tested.
- A grader fix for the `no-remote` and `upstream-push` false-claim patterns.

## Next

1. Measure the reader noise floor: run A against a copy of A that differs only in a comment in the memory message, over two samples. This is about 150 reader calls.
2. If the floor is about 1 point or more, B2 is within noise, and it can be kept for its 479-token cut. If it is lower, look for the `value` loss in the guide's first line and in the removed SYSTEM REMINDERS paragraph.
