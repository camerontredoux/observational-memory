# code: base7 gap analysis (recording-free)

Where each failed rubric item on base7 is first lost. Main track: all 11 cuts. Long chain: cuts 20/40/60/80. All from cache, 0 fresh.

Method: `rubric.ts` now records on each failed item the strings it looks for ("needles", gap-only patch `/tmp/omv-code/needles.py`). `gap.ts` (loaded by `bench-compact.ts` under `DUMP_GAP`) traces each needle back: in the context at all? in the source before the cut? in any Observer chunk (stdin up to `END CHUNK`)? in any Observer reply? in the last Reflector's input or reply? The earliest stage that lost it wins. Points are the item's share of the weighted total (weight / total weight / items in gate).

Files: full table with 3 examples per cell `/tmp/omv-code/gap-b7-table.md`; per-item JSON lines `/tmp/omv-code/gap.jsonl`; tools `/tmp/omv-code/{gap.ts,gaptable.py,needles.py}`.

## Main (78.3, 21.7 points missing)

| cause | items | points |
|---|---:|---:|
| 1 not in any Observer chunk | 11 | 0.79 |
| 2 in a chunk, Observer did not write it | 308 | **14.19** |
| 3 observed, lost later | 2 | 0.07 |
| 4 in the context, the grader does not credit it | 75 | 4.93 |
| 5 no needle (recall) | 10 | 0.55 |
| size (tokens gate) | 22 | 1.13 |

- Cause 2 by gate: identifiers 2.57, multi-hop 2.37, rationale 2.35, lessons 2.03, file-state 1.76, chronology 0.78, approvals 0.66, reversals 0.51, facts 0.49. The facts sit in assistant replies (numbers, the why, "filled-pdfs/", "16GB", "4 times in 10", "$51") or in tool calls and results (paths). Observer lane territory; I42 replies already recovers part of it in code.
- Cause 4 is mostly **purpose: 23 items, 3.40 points**. All tokens are in the context, but no single line of 600 characters or fewer holds them all. Nothing writes a one-line "what this session is about". A cheap Observer or continuation field could close it. Observer lane, or a rubric question.
- The rest of cause 4 (1.5): identifiers that are present but not grounded (the line lacks the source's content words), and `$0.0029` found only in a non-genuine kept row.
- Cause 1 is small: `retrying rows` (never chunked), and `ls: cannot access 'config/stow-pass-horizon'` (failures, 0.58). The open-failures list skips `ls` as a lookup (`isLook`).
- Code-path losses (cause 3) are nearly zero on main: 1 tail-masked path, 1 superseded continuation.

## Long, cuts 20/40/60/80 (62.0, 38.0 points missing)

| cause | items | points |
|---|---:|---:|
| 1 not in any chunk | 4 | 0.33 |
| 2 Observer compression | 180 | **11.60** |
| 3 lost after observation (Reflector 166 items / 7.19, superseded continuation 6 / 0.31) | 172 | **7.50** |
| 4 grader does not credit | 19 | 1.82 |
| size: tokens gate 4.80 + budget gate 0.43 | 6 | 5.22 |
| size: budget fit scaling (cuts 60 and 80 are 62k and 55k over the 40k budget; the total is scaled by 0.844) | – | **11.45** |

- **Size is the largest long loss: 16.7 of 38 points.** Cuts 60/80 run 55–62k against a 40k budget. I44's windowing cut size but cost recall-aware credit, so the fix has to shrink without dropping content that recall points at.
- The Reflector drops 166 items (7.19): decisions 1.66, chronology 1.56, reversals 1.29, facts 1.29, approvals 0.80, identifiers 0.76. Typical drops: `--thinking low`, `c029150`, `PI_ISOLATION`, `0.4.8`, `2991463`, `101 tests`. It keeps the gist and loses the identifier.
- The one long `failures` item is worth 2.73 points on its own (it is the only failures item at those cuts): again an `ls: cannot access …` failure that `isLook` filters out of the open-failures list.

## Code-lane follow-ups

1. Open-failures: keep lookup failures of a missing path (`ls`/`cat`/Read "No such file", "cannot access") that nothing later cleared. Rubric-visible at main 0.58 and long 2.73. I will test it after the critical-path investigation.
2. Long size: 16.7 points. Candidates need recall-aware credit to stay flat.
3. Purpose and Observer compression: Observer lane.
