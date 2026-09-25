# Hard item types for bench-compact (research, 2026-09-25)

Collected from published evaluations of context compression and agent memory, to make `scripts/bench-compact.ts` hard to score well on.

## Item types, ranked

1. **Superseded value (latest wins, with noise):** a config value, port, flag or version set 3 or more times. Only the last value passes; an earlier value in the context that isn't marked superseded fails. (MemFail, https://arxiv.org/html/2605.26667v1)
2. **Negative knowledge:** an approach that was tried and abandoned, and why (a revert, a failing test after a fix). The context must say X failed and why. (Factory, https://factory.com/news/evaluating-compression; https://arxiv.org/pdf/2608.11775)
3. **File state now:** what a file contains or does after its last Edit/Write, not at its first mention. This is the weakest category in Factory's evaluation (2.19–2.45 out of 5).
4. **Multi-hop across spans:** two facts far apart that must be combined (a library switch early, its config path late). Both facts must be present and linked. (MemFail Long-Hop; LoCoMo, https://arxiv.org/abs/2402.17753)
5. **Near-miss distractor:** two similar values (two ports, two branches, old and new API paths). The reader must not pick the distractor. (Chroma Context Rot, https://www.trychroma.com/research/context-rot)
6. **Abstention:** a plausible question about something never discussed. The only passing answer is "not discussed". (LongMemEval, https://arxiv.org/abs/2410.10813)
7. **Scoped or revoked permission:** an instruction narrowed or revoked later. Only the current scope passes. (STATE-Bench, https://opensource.microsoft.com/blog/2026/05/19/introducing-state-bench-a-benchmark-for-ai-agent-memory/)
8. **Exact strings under paraphrase:** verbatim error lines, paths and flags, graded by exact substring match. (Factory: a paraphrased `/api/auth/login` moved a score from 4.8 to 3.2)
9. **Decision rationale:** "why X over Y". The reason is required, not just the outcome. (Factory's decision probe)
10. **Order:** which of two events came first, or the order in which A, B and C were tried. (LoCoMo temporal)

## Failure modes reported

- Trajectory elongation: repeated mistakes and redundant tool calls that pass/fail metrics don't see (https://arxiv.org/pdf/2608.16370; ACON, https://arxiv.org/abs/2510.00615).
- Lost file paths and exact error strings under summarization (Factory).
- Distractor interference and attention dilution (Chroma).
- LLM summarization often doesn't beat simple observation masking (JetBrains, https://arxiv.org/abs/2508.21433).
- An agent can recall a fact and still botch the procedure (STATE-Bench).

## Anti-gaming

- Pair retention with a size term. Our check: padding HEAD's contexts to 39k and 60k tokens scored 85.3 and 84.9, below HEAD's 85.7.
- Block keyword shortcuts: facts split across spans, distractors orthogonal to the answer.
- Grade use, not presence: the Luna reader with evidence quotes.
