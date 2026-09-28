# noise: the Observer skips housekeeping, instruction-file and digest content, and corrected tool slips

Branch `exp-noise` (commit 626de97) on rules3 (f2afcdf), worktree `.scratch/par/noise`. Raw output: `.scratch/par/noise-out/` (`full.md`, `full.json`, `full.err`, `screen.json`, `noise-stats.ts`).

## Change

`hooks/prompts.ts`, the Observer's "What to observe" list, gets three lines:

- Skip routine housekeeping: acknowledgements, heartbeats, polling, and the lock holders, process, pane or job ids and wake or sequence numbers it passes through. Record it only when it failed, changed the state of the work, or the user asked about it. The prompt gives one example to skip and one to keep.
- Skip the content of instruction files (CLAUDE.md, AGENTS.md) and of digests injected at session start, because the harness loads them again after compaction. Still record what the assistant did or decided because of them.
- Skip a tool slip that the assistant corrected at once.

This changes the Observer prompt, so every Observer reply for B is a fresh call.

## Measurement

`flock .scratch/bench.lock bun scripts/bench-compact.ts ab --a .scratch/omv-rules/rules3 --b .scratch/par/noise --record --samples 2 --behavior --long --jobs 8`. `full.err` has no failed calls. B sample 1 reuses the replies from the earlier 1-sample screen. Sample 2 and the long chain are fresh. An earlier attempt overlapped the out-of-memory crash, so it was discarded and rerun.

`noise-stats.ts` counts observation lines per cut that match a housekeeping, digest/instruction-file or tool-slip regex. The regex is rough: it also counts some real work lines, such as a stuck worker pane.

| track | hk lines/cut A → B | digest lines/cut A → B | ctx tokens/cut A → B |
|---|---:|---:|---:|
| firstmate-11 | 12.1 → 9.6 | 9.6 → 7.5 | 11,312 → 11,210 |
| firstmate-6 | 3.9 → 1.8 | 2.5 → 1.5 | 7,094 → 6,899 |
| om-orchestration | 5.0 → 5.2 | 9.7 → 9.8 | 10,369 → 10,080 |
| om-v04 | 1.2 → 0.8 | 2.0 → 2.5 | 16,460 → 16,318 |
| crew-opie-4 | 2.1 → 1.4 | 0 → 0 | 17,163 → 17,231 |
| long (80 cuts) | 4.7 → 3.8 | 5.7 → 5.6 | 34,689 → 35,152 |

| | A (rules3) | B (noise) |
|---|---:|---:|
| retention total | 83.8 | 84.8 (+1.0; noise floor 1.8; unique flips 25 up, 35 down, p=0.25) |
| identifiers gate | 58.2 | 53.9 (−4.3; 11 up, 29 down) |
| decisions / purpose gates | 84.5 / 41.7 | 99.1 / 52.1 |
| holdout | 83.9 | +0.8 |
| reflection chain | 81.3 | −1.7 |
| long chain | 64.3 | 62.5 (−1.8; unique flips 93 up, 62 down) |
| long recall-aware | 37.8 | 43.5 |
| behavior (Luna reader) | 77.4% | 78.3% (55 up, 47 down; rule 75 → 83 of 90) |
| mean context tokens | 21k | 20k (−1%); long +1% |
| model tokens | 1234k | 1276k (+3%) |
| critical-path calls | 2 | 2 |

The prompt does what it says on the firstmate sessions: housekeeping lines fall by 20–55% and digest lines by 20–40%. Elsewhere it does little. The om-* sessions barely change, and the long chain drops by about one housekeeping line per cut. The saving is too small to matter: about 100–200 tokens per cut on firstmate and −1% of context overall. On the long chain the context grows by 1%.

The quality numbers disagree with each other, and none is significant. The retention total rises by 1.0, which is inside A's noise floor of 1.8, and more unique items flip down than up. The long chain drops by 1.8 while its item flips favour B. Behavior rises by 0.9 points, mostly on the rule gate. The consistent loss is the identifiers gate (−4.3). The lost identifiers are paths, commits and versions on om-orchestration and om-v04 (such as `hooks/stats.ts`, `b4e9b52`, `1.0.0`, `/tmp/om-v043/fixture.jsonl`). They are not the pane, PID or wake ids the rule targets. This could be Observer resampling, or the prompt could be making the Observer terser in general. Two samples cannot tell these apart.

## Verdict

Don't land. The change reduces firstmate housekeeping, but that only makes the context about 1% smaller. Retention and behavior show no significant effect, and identifier retention may suffer. A future attempt should drop the housekeeping lines mechanically at render time, so Observer replies stay the same and the size effect can be measured on its own, or it should be measured on a corpus with much more housekeeping than this one.
