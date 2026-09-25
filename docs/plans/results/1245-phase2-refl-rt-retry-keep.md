# phase2-refl: rt, the Reflector retry fix on base5. KEEP (robustness, cost)

Variant: worktree `.scratch/rt` (/home/cameron/work/mods/observational-memory/.claude/worktrees/agent-af7a4f8405d9357d6/.scratch/rt). Patches against base5: `.scratch/rt-retry.base5.register.patch` (67 lines) and `.scratch/rt-retry.base5.test.patch` (64 lines), both in that worktree. Output: /tmp/omv-refl/ab45rt.{txt,json}. Long run: db51a67c47-long.

## The change (hooks/register.ts, maybeReflect)
1. No prompt is sent twice within a reflection (`asked` set).
2. After two replies under the floor in a row, the loop stops: the second "keep more detail" ask comes back the same length. base5 sent it three times.
3. With no reply in range, the fullest reply under the floor is installed if it reaches REFLECT_NEAR_FLOOR = 0.75 of the floor. It logs "installing the fullest, ~N tokens". A reply far under still fails, as before.
4. A reflection that failed at every attempt records its input per loop (`failedInput`). The same input isn't sent again: it logs "reflection skipped: …". base5 resent the four identical prompts on the next chunk. The record clears on the next success.

## Results (s1, --long, chain, main, holdout; 0 fresh calls: every reply the fix uses was already cached)
| | base5 | rt |
|---|---:|---:|
| main / holdout / chain | 78.3 / 82.9 / 80.5 | exact / exact / exact |
| long total | 59.7 | 59.7 (0; 0↑ / 2↓ unique, both at @80 only, p 0.5) |
| long recall-aware | 43.4 | 43.1 (−0.3) |
| long context mean / max | 44k / 67k | same |
| long Reflector calls | 18 | 10 |
| long Reflector tokens in / out | 537k / 55k | 321k / 34k (−40% / −38%) |
| long Reflector call time | 1064 s | 642 s |
| reflections installed / failed | 6 / 2 | 6 / 0 (one near-floor install at ~2449 vs the 2526 floor, 14 min earlier than base5's third try) |

## Checks
- `claude plugin test` in .scratch/rt: 358 pass, 0 fail.
- Unit tests: the far-under test now expects two distinct prompts, and a second chunk with the same condensable input sends none (logs "skipped"). A new test covers two just-under replies installing the fuller one. Both fail on base5 (4 prompts vs 2) and pass on rt.
- `tsc -p .scratch/rt`: clean apart from the fixture modules.
- Single sample: the chain replays exactly (its one reflection doesn't fail), so s2 on the chain would measure nothing new. On the long chain only the @80 cuts can differ.

Verdict: KEEP. It's a robustness and cost fix with no measurable quality change: 8 fewer Reflector calls and −216k input tokens on the long chain.
Next: the shallow, frequent I45 arm (28k / 14k keep / 20k target, TIER counted inside the target), built on rt.
