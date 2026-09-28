# redcheck: every 🔴 line is checked against the user's own messages

Branch `exp-redcheck` (commits `af52f2f` and `5cf345b`) on v151 (f2afcdf), worktree `.scratch/par/redcheck`. Raw output: `.scratch/par/redcheck-out/` (`ab.txt`, `ab.json`, `ab.err`, and the per-track replays with their `log.txt` under `replays/`).

## Verdict

Keep it. The check demoted 49 🔴 lines across all tracks. I read all 49, and each one was words the user never said in that session. The constraints and corrections gates did not move on any track, and reversals rose on the long chain. Behavior rose by 1.9 points. The standard and holdout totals did not change, and the check adds no model call. The one soft spot is the long chain: its weighted total fell by 1.0, but its unique-item flips favour B 70 to 36 (p = 0.0012).

## Change

`hooks/register.ts`, where the Observer reply is parsed:

- `userSaid()` collects what the user said in the chunk. That covers each real prompt's text with system reminders removed, and the answers the user picked or typed for `AskUserQuestion`. Tool results, task notifications and compaction summaries are not included.
- The second commit adds two sources of the user's words that reach a chunk another way. The first is a compaction summary's `<corrections>` and `<all-user-messages>`, which quote the user and are copied by code. The second is a quote the chunk relays as the user's words "verbatim". A message typed while the assistant was working gets no row of its own, and only the assistant's echo of it shows up.
- `grounded()` works in two ways:
  - A line with a quote is grounded when some quote in it appears in what the user said. The match ignores case, whitespace and quote style.
  - A line without a quote is grounded when at least 30% of its stemmed content words appear in one user message.
- An ungrounded 🔴 line in `<observations>` or `<corrections>` is kept as 🟡, never dropped. Each one gets a debug log line with its first 160 characters, and `observer.<phase>.demoted` counts them in stats.
- A correction's `(replaces …)` handling is unchanged. A replacement takes effect only when the correction itself is grounded in the user's messages, so an invented correction cannot replace a real rule.

Tests (`tests/register.test.ts`) cover these cases:

- A grounded quote is kept.
- A paraphrase is kept.
- A constraint invented from a worker's state file is demoted, logged and counted.
- A quote the chunk relays as the user's verbatim words is kept, and one it only mentions is demoted.
- A grounded correction with `(replaces …)` still replaces the rule it names.
- An ungrounded replacement leaves the rule in force.

Some existing fixtures had 🔴 lines that no user message backed, such as `🔴 Saw a`. They now carry user text that backs them. `claude plugin test`: 382 pass, 0 fail. `tsc` shows only the expected missing `*.local.ts` modules.

## Measurement

`flock .scratch/bench.lock bun scripts/bench-compact.ts ab --a .scratch/omv-rules/rules3 --b .scratch/par/redcheck --samples 2 --behavior --long --jobs 8 --record`

The first run was poisoned. The shared Luna cache (`~/.cache/om-bench-compact/luna-cache*`) held 986 replies recorded during a network outage. Each one was a clean `exit 0` with `stopReason: error, fetch failed`. The replay counted them as cache hits, so 61 of the long chain's Observer calls were silently empty. I moved those files to `~/.cache/om-bench-compact/quarantine-fetch-failed-20260928/` and ran the benchmark again. The rerun has no failed calls. Other agents' runs that read the cache before this fix may be affected.

| track | A (v151) | B (redcheck) | Δ | constraints / corrections / reversals (A → B) |
|---|---:|---:|---:|---|
| standard total | 83.8 | 83.8 | 0 (no flips) | 96.2 / 100 / 93.3, same |
| holdout | 83.9 | 84.0 | 0 (1↑ 1↓) | corrections 100, same |
| reflection chain | 81.3 | 81.5 | +0.2 (15↑ 16↓ unique) | 100 / 100 / 92.3, same |
| long chain | 64.3 | 63.3 | -1.0 (70↑ 36↓ unique, p 0.0012) | 96.5 / 99.3 same; reversals 44.1 → 45.8 |
| long, recall-aware | 37.8 | 40.9 | +3.1 | |
| behavior (probes passed) | 77.4% | 79.3% | +1.9 | rule probes 75/90 → 81/90 |
| critical-path calls | 2 / 0 / 2 / 4 | 2 / 0 / 2 / 4 | 0 | (standard / holdout / chain / long) |

On the long chain, the loss comes from commits (-6.6), decisions (-2.9) and chronology (-1.7). Approvals (+4.2), facts (+1.9) and reversals (+1.7) gained. B's long chain had 16 and 49 fresh Observer calls. The demoted lines change the constraints-in-force list and the prior observations that later chunks see, so part of the Δ is draw noise. Efficiency is the same everywhere (model tokens within ±1%).

## Demotions per track

I counted them by replaying B's tracks from the now-complete cache (`--pi strict`, all cache hits) into `.scratch/par/redcheck-out/replays/`.

| track | sample 1 | sample 2 |
|---|---:|---:|
| om-orchestration / om-v04 / firstmate-11 | 5 / 1 / 3 | 3 / 2 / 1 |
| holdout firstmate-6 / crew-uspa-4 / crew-opie-4 | 4 / 0 / 0 | 1 / 0 / 1 |
| reflection chain | 7 | 7 |
| long chain | 7 | 7 |

There are 49 demotions in all, each a distinct line. I checked every line attributed to "User" against the source transcript. None was a real user rule.

## 20 demoted lines, checked

1. `User constraint recorded in worker status: rotate the leaked read-only production DB password; delete the 595 MB production dump…` (firstmate-6): the reported bug. It came from a worker's state file.
2. `Assistant reported that the read-only production database password appeared in session logs and should be rotated…`: an assistant report.
3. `User: "Do not touch production data or run anything against the production database; read CO-00855-02 only if…"` (firstmate-6, 14:08): the firstmate's own message to a worker (assistant tool_use, row 1789). The captain never typed it.
4. The same line at 14:16, from sample 2: same source.
5. `User instructed: "Do NOT write or run any data repair for CON-00855…"` (firstmate-6, 14:19): the firstmate's `fm-send` to the worker (row 2207).
6. `User: "Stop querying the production database now; you have what you need…"` (chain): the same firstmate `fm-send`.
7. `User required the worker to determine whether migrated signed change orders already had totals/milestones imported…` (chain): the firstmate's brief (row 1789).
8. `User: "no its 001.41"` (chain, om-v04 rows 50-77): in om-v04 this text is only inside a tool result, a transcript dump of the firstmate session that was being debugged. The real user message is in firstmate-11, where it is not demoted.
9. `User: "Go with your recommendation. My spec was wrong to say 'title unchanged'…"` (long): the firstmate's `fm-send --resolve-key` answer to a worker. "My spec" is the firstmate's spec. The worker sees it only as an inbox file read (tool result).
10. `User: "New requirement from the captain for PR #1417 (verbatim, also added to your brief's Task): "For gorman, it needs to autofill dates too""` (crew-opie-4): the firstmate's inbox message, read through a tool result. It is also a request, not a rule.
11. `User instructions embedded in the task brief require no pushing, no PR, no rebasing, and a real merge commit…` (firstmate-11): the firstmate wrote the brief in a heredoc. The chunk has no user block.
12. `User's follow-up requirements included local PDF rendering and visual verification, no generated files committed…` (long): the user said only "For sbom, fix this weird PDF formatting". The rest is the assistant's brief.
13. `User's standing no-push rule means the GitHub copy remains 282 changes behind…`: a status line that derives from a rule, not the rule itself.
14. `Assistant instructed that production writes, migrations, app processes, non-DATABASE_URL secrets… `: an assistant instruction to a worker.
15. `Assistant instructed the workflow never to start live runs, to use .worktrees/issue-10…`: an assistant instruction.
16. `Assistant told the user it would not delete test sessions without asking…`: an assistant commitment.
17. `Prune safety review found three blockers in hooks/prune.ts…`: a review finding from a subagent.
18. `Post-merge CI for #254 was red: Lint & Format and Unit Tests failed…`: a tool result.
19. `Tool reported live run startup failed because the generated Herdr agent name exceeded the 32-character limit`: a tool result.
20. `TypeScript compilation failed in tests/register.test.ts:217…`: a tool result.

The other 29 lines are the same kinds. There are review findings (such as the issue-#3 wrapper allowlist), benchmark run rejections, CI results, and assistant diagnoses and corrections of its own diagnoses.

## Known limits

- In a crew worker's session, the firstmate's instructions arrive as inbox-file tool results rather than user rows, so a worker's 🔴 lines for them are demoted to 🟡. That is what the task asked for, since the check reads the chunk's user blocks only. If crew sessions should treat `fm-task-inbox` messages as the user, that would be a separate, explicit source.
- The 30% overlap test for an unquoted line is loose on purpose, so that paraphrases pass. An invented line that shares most of its words with a real user message would still pass.
