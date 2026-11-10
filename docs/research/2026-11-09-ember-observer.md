# Muse Ember as the Observer, in place of GPT-6 Luna

v1.17.0 moved the Observer, Reflector and Session writer from GPT-6 Luna (through `pi`) to `muse-ember-1.0` over
Meta's Responses API (`POST https://api.meta.ai/v1/responses`). Harness: `~/work/scratch/ember-ab/ab2.ts`, live calls
on real Observer chunks with the current `OBSERVER_SYSTEM_PROMPT`.

## Luna baseline (om_stats, 10,066 background Observer calls)

Median 12.2 s, p90 20.5 s. Median cost $0.0017, p90 $0.0037. Median input 12,687 tokens, output 706, cached 2,816.

## Live A/B, 12 calls per model over 4 sessions

| | Luna (low) | Ember (medium) | Ember (low, shared cache key) |
|---|---|---|---|
| Mean time | 16.8 s | 3.3 s | 3.0 s |
| Mean cost | $0.00157 | $0.00206 | $0.00183 |
| Mean output tokens | 726 | 1,474 (about 470 reasoning) | — |
| Cache hits | 10/12 | 4/12 (per-session key) | 10/12 |

Medium effort cost the same as low and read no better. Ember kept more exact identifiers and user wording; its lines
ran longer (326 characters against 256). Quality was graded comparable on a read of every pair.

Settings that landed: low effort, `store: false`, one `prompt_cache_key` per role (`om-observer`, `om-reflector`,
`om-session`) with `24h` retention, 32k max output tokens. Pricing: $0.10 input, $0.004 cached, $0.50 output per
million tokens. Strict JSON-schema output (`text.format`) worked on two probes (`so-probe.ts`).
