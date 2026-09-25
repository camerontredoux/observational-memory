# phase2-obs: base7 Reflector-only noise floor (base7 vs base7′)

Command, run in `.scratch/obs-bench4` (a MAIN copy plus one new option):
`ab --a base7 --b base7-r2 --b-reflector-sample 2 --record --long --no-holdout --jobs 12`.
Output: `.scratch/runs/ab-base7-reflnoise.{md,json}`.

The new option, `--b-reflector-sample K`, sends B's Reflector calls to their own cache, `luna-cache-r<K>`. B's Observer calls still come from the main cache. It is implemented in bench-replay as `--reflector-cache DIR`. Run with B = a copy of A, it redraws only the Reflector calls. Cost: 11 fresh calls on long and 2 on chain.

Results:
- Main: exact, as expected.
- Long: +0.3, unique 16↑/12↓ (p .57). Recall-aware +1.8.
- Chain: +0.1, unique 3↑/1↓.
- The noise losses cluster too. 7 of the 12↓ first appear at cut 65, 3 at cut 40, and 1 each at cuts 45 and 75. One Reflector draw can drop a group of items at one cut.

That gives the long keep rule: count long as a loss only if unique ↓ is over ~25 (about 2× noise) and the losses are not clustered at one or two cuts. I46's 51↓ has 37 of its losses at cuts 50/60. That is a cluster of the same shape as the noise run's cut-65 cluster, but about 3× its size.

To land it in MAIN, the option is a 10-line diff to `scripts/bench-replay.ts` plus `scripts/bench-compact.ts`, in `.scratch/obs-bench4`.
