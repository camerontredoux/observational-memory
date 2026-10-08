# What compaction improvements optimize for

Set by the user on 2026-09-25. Every compaction A/B is judged on all of these at once, not on quality alone.

## The purpose

Indefinite sessions. Compaction must be:

- **Fast and non-blocking.** The work happens in the background as the session runs. Compaction itself should do little or no synchronous model work. A change that makes compaction as slow as the built-in defeats the plugin's purpose.
- **Cheap.** Observer and Reflector tokens in and out are the cost.
- **A real reduction.** The compacted context must be much smaller than what it replaces. A compaction that barely shrinks the context does not do its job.
- **Faithful where it matters.** Keep the details, the purpose, and the current tasks, plans and goals.

## How to bend the curve

The trade for speed and accuracy is storage. The full transcript stays on disk, and `om_recall` recovers exact detail from it. So keep less in context, make what's kept point to what's stored, and don't buy quality with bigger contexts or more synchronous model calls.

## How to search for improvements

- Improve the current design (Observer + Reflector) while A/B tests keep finding real gains.
- When gains plateau below a good quality, research other approaches on the web. Keep the research small and bounded, with no open-ended loops.
- Then build a minimal alternative compaction plugin and A/B it against the current best. Observer + Reflector is not sacred: the benchmark exists to test that.
- Don't redesign while incremental changes still pay off.
- Test cheap first. While iterating, run the main corpus only (`--no-chain --no-holdout`, about 30 s). Run the full test (the reflection chain and holdout, with `--samples` when needed) when a change touches the Reflector, when it's big or affects many compactions, or to confirm a stack of cheap wins before calling a winner.

## How an A/B is judged

- Quality: the `bench-compact` total and its gates.
- Efficiency: the compacted size, the reduction ratio against the context it replaced, the Observer and Reflector tokens in and out, and the model calls on the compaction critical path.
- A quality gain that makes efficiency clearly worse is a regression, not a win.
