# phase2-refl: I50 sha/PR cues. Offline measure, then a base6 screen (ab50). NOT KEPT

## Offline measure (existing runs, no model): .scratch/shagain.ts, .scratch/shacue.ts in my worktree
- The long chain's commits failures are nearly all pull requests. The rubric's commits gate asks for every SHA and every PR URL the session made. On rt (≈ base6 Reflector, run a66de52f79-long), 28 commits items fail (6 unique): 4 PRs and 2 SHAs. On shallow (8985728277-long), 66 fail (14 unique), almost all PRs.
- The failing items a reflection had dropped (named in its input, absent in its reply): rt 2 of 6 unique (pr:1421, pr:1422), shallow 8 of 14. So the commits −20.8 on the threshold arms is mostly PR numbers condensed away.
- Cost: one verbatim clause per dropped PR is 0–140 tokens per reflection. Clauses for every dropped SHA cost 300–2,500 tokens per reflection (9–61 SHAs each), and failing SHA items were not ones a reflection dropped. So SHAs are out and PRs only are in.

## Built: PR cues on base6, `.scratch/b6pr` (worktree agent-af7a4f8405d9357d6)
I35's withDroppedPaths now also collects `#N` / `PR N` / `/pull/N` from the condensed notes. Each one the reply doesn't name comes back first, as its latest clause verbatim at that note's time. It sits inside the same REFLECT_CUE_TOKENS 300 cap, so context size doesn't change. Patches: `.scratch/i50-prcues.base6.register.patch` (54 lines), `.scratch/i50-prcues.base6.test.patch` (29 lines). Plugin test 360/0. The new test fails on base6 (359/1). tsc is clean apart from the fixtures.

## Screen: ab50, A .scratch/b6 (copy of base6) vs B b6pr, s1, --long + chain + main + holdout. Output /tmp/omv-refl/ab50.{txt,json}
| | base6 | b6pr |
|---|---:|---:|
| main / holdout / chain | 78.3 / exact / exact | exact |
| long total | 61.5 | 62.6 (+1.1; 12↑ / 12↓ unique, p 1.0) |
| long commits gate | 84.7 | 88.0 (+3.3) |
| long recall-aware | 43.6 | 42.4 (−1.2) |
| long context mean / max | 44k / 72k | 44k / 71k |
| long Reflector | 10 calls, 321k / 34k | 10 calls, 292k / 32k (7 fresh) |

- The cue lines change the tier that later reflections pass through or resend, so B's reflections 3–6 are other model draws. The 12↑/12↓ spread outside commits (chronology, decisions, facts at @40–@60) is draw noise, not the cue.
- Commits: pr:1422 is recovered (4 cuts). pr:1421 is in B's context after the cue ("PR #1421 fixed PDF layout/status coloring;") and still fails. The clause is too short for the grader's grounding words, so a clause-length cue can't earn it.
- Net: base6 has only 2 restorable PR items, and the cue gets 1. That isn't the real share you set as the bar. The threshold arms would recover more (8 of 14 on shallow), but they were rejected on other gates (chronology, reversals, recall-aware).

Verdict: not kept. It's cheap and harmless (size unchanged), with no measurable gain on base6. Patches are kept in case a later arm shrinks the ledger again: then the PR cue is the fix for its commits loss.
Next: I have no further queued Reflector item. I'll pause the lane unless you have one. Open candidate, not started: grounding-aware cues (whole line when the clause has under the grader's content words). I'm skeptical: it serves the grader more than a reader.
