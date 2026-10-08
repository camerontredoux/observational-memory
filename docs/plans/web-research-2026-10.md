# Web research: compaction ideas we have not tried (2026-10-07)

Four research agents searched the web for compaction and agent-memory ideas from 2024–2026. Each one covered one angle:

1. How other coding agents handle long sessions.
2. Research papers on context management for agents.
3. Practitioner context-engineering writing.
4. Open-source memory systems, and how to evaluate compaction.

Each agent had the list of ideas that we already tried, so it searched only for new ones. Many figures are vendor-run, self-reported, or come from an abstract only. The notes below mark these figures. Treat a small difference with the same care as our own ±2 noise band.

## What bears on our plateau

- **Memory that looks good on recall often does not change task success.** In [VibeMemBench](https://arxiv.org/abs/2609.23570), four memory systems failed to beat no memory in 11 of 12 pairings, which were scored by executable tests on 111 targets. A study of eight condensers on 60 DiscoveryBench tasks ([arXiv 2605.18854](https://arxiv.org/abs/2605.18854)) found that no condenser changed quality significantly. Only cost changed: LLM condensers added 24–94% tokens, and masking saved 8.6%.
- **Most published compaction gaps are as small as our noise.** Factory's [probe eval](https://factory.com/news/evaluating-compression) ranks the methods on gaps of 0.26–0.35 out of 5, with no significance test.
- **Masking can do as well as summarizing.** [The Complexity Trap (JetBrains)](https://arxiv.org/abs/2508.21433) replaced old tool outputs with a placeholder and kept the agent's actions. In 4 of 5 configurations, cost fell by about 50%, and the solve rate stayed about the same as with LLM summaries. Summary runs took 15% more turns, and the authors think that summaries hide failure signals. The effect was not the same for each model: solve rate went from −9.9 to +2.6 points for masking, and from −22.3 to +0.7 for summaries.
- **Our verbatim constraints are correct.** In [Lost in Compaction](https://arxiv.org/abs/2608.11242), ordinary compactors kept about 17% of user constraints. A separate extractor kept 90–96%. Claude Code's `/compact` kept 53% of safety rules after one round and 10% after five ([arXiv 2608.22752](https://arxiv.org/abs/2608.22752)). In [Governance Decay](https://arxiv.org/abs/2606.22528), constraints pinned verbatim had 0% violation. Our constraint gate is probably near its ceiling for this reason.
- **Rewriting a whole context loses content.** In [ACE](https://arxiv.org/abs/2510.04618), one rewrite reduced an 18,282-token context to 122 tokens, and accuracy fell below the no-memory baseline. Our Reflector rewrites the old part of the ledger, and so does Mastra's.
- **Completion metrics can hide cost.** In [Measure Before You Manage](https://arxiv.org/abs/2608.31057) and [arXiv 2608.16370](https://arxiv.org/abs/2608.16370), compression increased retrieval calls from 21 to 64 while completion stayed flat at 80–85%. Re-reads and repeated tool calls are a measurable cost that our benchmark does not count.
- **File tracking is the weakest point of every summarizer.** In Factory's eval, all three methods scored 2.19–2.45 out of 5 on the "artifact trail". Factory calls artifact tracking unsolved.
- **Similarity recall is weak for agent history.** In [ACON](https://arxiv.org/abs/2510.00615), retrieval scored 27.4 on AppWorld, FIFO scored 45.8, and no compression scored 56.0. This agrees with our BM25 result.

## Ideas not tried, ranked

| # | Idea | Evidence | Plugin fit |
|---|---|---|---|
| 1 | **Next-action continuation eval.** At each cut, a reader gets the compacted context and the next user message, and proposes the next 3–5 actions. Compare them with what the real agent did. Count re-reads and retries of commands that failed earlier. | [Slipstream](https://arxiv.org/abs/2605.08580) checked summaries against the agent's next steps: SWE-bench Verified went from 22.0% to 30.8%. The async-only ablation without that check gave no gain. | High. One reader call for each cut and configuration, with no sandbox. |
| 2 | **File and command manifest built by code.** List the files read, edited, and created, and the commands run, from tool calls. No model call. | Artifact trail is the weakest dimension (see above). [pi](https://pi.dev/docs/latest/compaction) appends `<read-files>` and `<modified-files>`. Three of four agents ranked it in their top 3. | Very high. Our memory has no manifest now. |
| 3 | **Stop context from growing.** Replace a large tool output with its head, its tail, and a pointer, and let `om_recall` fetch the full text. | Anthropic [context editing](https://claude.com/blog/context-management): 84% fewer tokens in a 100-turn eval (vendor). [Cursor](https://cursor.com/blog/dynamic-context-discovery) writes shell output to files. | Not known. This needs PostToolUse `updatedToolOutput` to work for built-in tools. |
| 4 | **Compact at natural boundaries.** Use PreCompact to wait for a commit, a passing test, or a finished subtask, with a hard limit. | [SelfCompact](https://arxiv.org/abs/2606.23525) and [AutoCompact](https://arxiv.org/abs/2610.02163) (+9.2 on SWE-bench Verified, trained). Neither isolates the timing. | Medium. PreCompact can block. |
| 5 | **Observer guidelines from paired failures (ACON).** Change the guidelines only from cuts where full context passes and our memory fails. Then test on held-out cuts. | [ACON](https://arxiv.org/abs/2510.00615): on AppWorld it matched full context with 26% fewer peak tokens, and it was 13 points above a generic summary. | High. This is offline. It is not the same as our prompt changes, because it uses specific failures in a paired design. |
| 6 | **Delta Reflector (ACE).** The Reflector writes add, update, and remove operations. Code applies them and refuses a removal that has no "supersedes" marker. | ACE: AppWorld 42.4 → 59.4. Three of four agents recommended it. | Low payoff. Our Reflector does not run in real sessions. |
| 7 | **Keep all user messages verbatim, within a token budget.** | Codex keeps them up to 64k ([gist](https://gist.github.com/osolmaz/a38acf6e522df67530e3ed47c80fdcd5)). | Medium. Our constraints already cover the most important part. |
| 8 | **`om_recall` returns an answer.** A model reads the transcript and answers the question, with citations, in place of excerpts. | Amp's [`read_thread`](https://ampcode.com/guides/context-management); [RLM](https://arxiv.org/abs/2512.24601) (secondary report). | Medium. The evidence is thin. |

Other mechanisms that the agents found:

- **Pin the first events verbatim.** OpenHands keeps the first N events of the session.
- **Pointer-addressable ledger.** Each line cites its source, and a tool returns that span verbatim ([ARC](https://arxiv.org/abs/2607.25066)). We have source ranges, so check how much of this we already do.
- **Subagents as context filters.** Send verbose work to a subagent that returns a digest. This is a user workflow, so a plugin can do little.
- **Reset in place of compaction.** Start a fresh session and keep the state in files and git. Sources: [Anthropic long-running harness](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), Ralph, and Amp Handoff. We already tried handoff variants.
- **Trained summarizers.** Examples are Cursor Composer, MEM1, MemAgent, and CompactionRL. A plugin cannot use them through an API.

## Closest designs to ours

- **[Mastra observational memory](https://mastra.ai/docs/memory/observational-memory).** The Observer runs about every 6k tokens and activates at 30k. The Reflector rewrites the whole log at a 40k target. Mastra reports LongMemEval 84.2% with gpt-4o and 94.9% with gpt-5-mini (vendor). An [HN critique](https://news.ycombinator.com/item?id=46992444) says that the design is tuned to that benchmark.
- **[stelmakhdigital/observational-memory](https://github.com/stelmakhdigital/observational-memory)** (a pi adapter). The memory is rendered by code, sorted by priority, and each line has a `sourceRange`. Text that looks like an injection is marked `[UNVERIFIED]`. A new line supersedes an old one and does not overwrite it. A reflector runs after 30 minutes idle. It has no task-outcome measurement.

## How to build the continuation eval (idea 1)

This design builds on `tests/eval/replay.ts`, which already cuts real transcripts at their compaction points.

1. At each cut, take the original agent's next K tool calls (K = 3–5) from the transcript. This is the gold continuation.
2. For each configuration, build the compacted context at that cut. Use no memory as the lower bound and the raw recent transcript as the upper bound.
3. Give a reader model the context and the next user message. Ask it for its next K actions, but do not run them.
4. Score each proposal by code. Check the target of the first action and of the first K actions: the same file, command family, or test. Also count re-reads of files that the context already covered, and repeats of commands that failed earlier.
5. Report effect retention as (config − none) / (full − none). Pair the configurations by cut, and bootstrap over the cuts.

Limits: the gold path is only one of the good paths, so a different good action loses points. Facts that the agent needs much later than K steps are not tested. For these reasons, keep the existing gates in addition to this eval.

## Result: the next-action check does not separate contexts

Built as `bench-compact.ts --next` (`tests/eval/next.ts`) and run on HEAD (v1.12.0) over 25 cuts, 3 Luna samples each.
Recall is the share of the real agent's next 3 actions that Luna proposed.

| context | with kept rows | memory only (`--next-memory-only`) |
|---|---:|---:|
| HEAD's memory | 23.3% | 2.2% |
| no memory (kept rows, or empty) | 23.6% | 12.0% |
| built-in summary | 20.0% | 7.3% |
| raw history, 120k tokens | 21.6% | 12.4% |

- With the kept rows, every context scores the same. The kept rows settle the next actions; the memory above them changes nothing.
- Without them, nothing beats the empty context. The empty context always proposes a reply, and 3 of 25 real continuations are replies.
  HEAD's memory leads Luna to reorient first (`git status`, 18 of 25 cuts), which a real agent does too but this transcript's agent did not.
- The real next actions are mostly unpredictable one-offs, so 25 cuts carry little signal.

So immediate continuation barely depends on the memory, as the published task-outcome studies found. What the memory carries
matters when the work needs something old, which the retention gates and behavior probes already test. Parked on branch
`next-action-check`.
