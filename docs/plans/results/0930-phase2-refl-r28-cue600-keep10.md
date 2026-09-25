# phase2-refl: the screen you asked for, r28 + I35 with (a) cue 600 or (b) keep 10k, vs base3

A is a frozen copy of base3 taken at 08:40, before builder-code's in-place edits: `.../agent-af7a4f8405d9357d6/.scratch/b3now`. Each variant is that copy plus I35 plus r28 (28k/14k), with the one change named. All runs use the fixed rubric.

## Chain screen, s1 (ab11)
| B | chain | unique items up / down | ctx mean/max | Reflector calls (in/out) |
|---|---|---|---|---|
| base3 (A) | 81.5 | – | 33k / 57k | 1 (38k / 4.6k) |
| r28 + I35, cue 300 | 83.5 (+2.0) | 7 / 9 (p=0.80) | 31k / 47k | 2 (50k / 5.9k) |
| **(a) r28 + I35, cue 600** | 83.4 (+1.9) | **7 / 7** | 31k / 47k | 2 (50k / 6.0k) |
| (b) 28k/14k/**keep 10k** + I35 | 82.7 (+1.3; chronology -3.3) | 4 / 13 (p=0.049) | 31k / 48k | 2 (46k / 4.2k) |

(b) is worse: keeping more raw leaves the Reflector less room, and its reply loses more. Dropped.

(a) met your bar at s1, so I ran the full check on it.

## (a) cue 600, full test s2, chain + holdout + main (ab12)
- main 77.3 and holdout 79.7, both exact.
- chain 81.5 → 83.8 (+2.3): tokens +5.6, budget +2.2 (55/62 cuts vs 44/62), chronology +1.8, identifiers -0.7.
- **unique items 6 up / 13 down (p=0.17)**. Sample 2 is worse than sample 1's 7/7. For comparison, cue 300 was 6 up / 17 down (p=0.035) at s2.
- ctx 31k/47k vs 34k/57k (mean -9%, max -18%). Reflector 50k/6.2k vs 43k/5.9k in/out (2 calls each). Model tokens +0.4%.
- Tests: `claude plugin test` gives 351 pass, 1 fail, the same failure as base3. The KEEP test had its fixture sized for 40k/12k/20k, so I rescaled it to 28k/8k/14k. The I35 test is included. Typecheck is clean.
- The losses are still the same kind: paths from notes around cuts @13-@19 (hooks/prompts.ts, .claude/types, /tmp/cmp, ~/work/mods/observational-memory-prune, ~/.claude/settings.json). Reflecting early condenses them away, and base3 still holds them raw at those cuts. They are all om_recall-findable details.

## Verdict
(a) cue 600 is the best r28 form: it has the whole size win, and 13 losses at s2 vs 17 for cue 300. It still misses "losses ≤ gains" at s2 (6/13, n.s.), so by the rule it stays **on hold for B1**, not kept. If you judge the size win to be enough, the patch is ready.

## Files
- `.../agent-af7a4f8405d9357d6/.scratch/i35-r28-cue600.base3.register.patch` (69 lines) and `.../i35-r28-cue600.base3.test.patch` (63 lines; the I35 test plus the rescaled KEEP test). These are against the 08:40 base3, so rebase them onto builder-code's base3 once it reports.
- Plugin dirs: `.scratch/s-cue600`, `.scratch/s-keep10`, `.scratch/s-r28`. Bench outputs: `.scratch/ab11.txt`, `.scratch/ab12.txt`.
