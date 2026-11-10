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

## Structured output (v1.18.0)

The Observer and Reflector now answer to strict JSON schemas (`hooks/reply.ts`), so the plugin reads fields instead of
parsing tagged sections line by line. The text-format repairs went with it: unclosed or missing tags, unmarked lines
joined to the line before, multi-line 🔴 quotes, and the "no `<observations>` block" retry. A reply that is not the
schema's JSON fails as `bad-json`, retried as any failed call is. The schema leaves 🔴 out of `observations`: the
user's constraints come only through `corrections`.

A/B on the same 12 recorded chunks, Ember low, text prompt against JSON prompt (`~/work/scratch/ember-ab/ab3.ts`,
runs 7 and 8):

| | failures | mean ms | cost/call | output tokens | observations/chunk | chars/observation |
| --- | --- | --- | --- | --- | --- | --- |
| text | 0/12 | 2,951 | $0.00189 | 1,449 | 8.5 | 370 |
| JSON | 0/12 | 2,730 | $0.00184 | 1,323 | 8.4 | 314 |

The first JSON prompt left `told_the_user` null in 5 of 12 chunks where the text prompt wrote it. After the field's
prompt and schema description said when to write it, the 4 left null were chunks where the text prompt had written only
filler ("none recorded", "no report yet").
