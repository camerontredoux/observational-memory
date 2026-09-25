# phase2-refl: I45 shallow arm on rt (ab45sh, s1, --long + chain + main + holdout). REJECTED

Variant: worktree `.scratch/shallow` (/home/cameron/work/mods/observational-memory/.claude/worktrees/agent-af7a4f8405d9357d6/.scratch/shallow) = rt + AT 28k, KEEP 14k, TARGET 22k, TIER 3k. The passed-through earlier reflections now count inside the target. They are condensed again once they would leave the Reflector under the 2k minimum. A = .scratch/rt, which has the same Reflector inputs as base6. Output: /tmp/omv-refl/ab45sh.{txt,json}. Long runs: A a66de52f79-long, B 8985728277-long.

| | rt (≈ base6 Reflector) | shallow |
|---|---:|---:|
| main / holdout | 78.3 / 82.9 | exact / exact |
| chain | 80.5 | 83.2 (+2.6; 3↑ / 13↓ unique, p 0.021) |
| chain context mean / max | 35k / 51k | 33k / 47k |
| chain Reflector calls | 1 (37k / 3.6k) | 5 (94k / 22k) |
| long total | 59.7 | 61.2 (+1.5; 29↑ / 59↓ unique, p 0.0018) |
| long recall-aware | 43.1 | 36.8 (−6.3) |
| long context mean / max (bench) | 44k / 67k | 39k / 58k |
| long Reflector calls, tokens in / out, call time | 10, 321k / 34k, 642 s | 16, 276k / 60k, 1168 s |
| long reflections installed | 6 | 14 |

Long gates: commits −20.8, chronology −10.0, approvals −6.3, reversals −5.9, decisions −2.8, facts −2.4. The gain comes only from budget +5.0 and tokens +0.9.

Reading: gentler, more frequent passes lose less than l24 (−6.3 recall-aware vs −12.5; 29↑/59↓ vs 15↑/75↓), but the loss is still clear. They also cost more Reflector output and call time than rt. In all three arms (l32, l24, shallow), the losses sit in commits and chronology: short SHAs and dates are what condensing drops first.

Verdict: rejected. I45 as a threshold change is closed on my side. Every arm that shrinks the ledger fails the unique-item bar on the long chain.
Next: I50 (proposed, lane reflector), sha/date cues. Extend I35's dropped-path cues (withDroppedPaths) to commit SHAs dropped by a reflection: re-attach the latest clause naming each one, inside the same cue cap, with no model call. First step, no model: measure on the existing runs how many lost commits items a SHA cue would have held. If it holds most of commits −20.8, rerun l24/shallow with it on base6.
