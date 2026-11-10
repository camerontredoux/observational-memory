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

## Reading the replies as JSON, and shorter observations

Until this change the plugin still rendered each structured reply back to tagged lines and parsed those again. Now it
reads the fields: a correction's `quote` is checked against the user's messages as it stands, `replaces` is read as
given (the schema holds it to `^k[0-9a-f]{1,8}$`; a probe showed Ember's strict mode accepts `pattern`), and the
continuation is read as an object. The text-era repairs are gone: 🔴 demotion of observations, which the schema
already rules out, the Reflector's 🔴 demotion, and the old date-group reply form. Lines are still what the ledger and
the memory message store.

Grounding changed in two ways. A quote said to be relayed (`verbatim "…"`) now counts only in the assistant's own
text, not in tool results, so a file or web page cannot vouch for a constraint. A correction is dropped as a restated
constraint only when it shares 80% of its words with one in force (it was 30%); below that it is kept, or kept as 🟡
when no user message bears it out.

The test fake (`tests/harness.ts` `structured()`) now checks each reply against the schema and throws on one Ember
cannot give, such as a 🔴 observation.

The Observer prompt now asks for one fact per line (about 25 words, never more than 40), folds reading and searching
into the finding they gave, and lists what must stay exact: commands with their outcomes, edited paths, IDs, versions,
numbers, error text, and subagent briefs and reports. The size target went from one line per 1,100 chunk tokens to one
per 1,400 (~9 to ~7 lines per 10k chunk). The analysis of 34.7k stored lines found 22.8% of tokens on tool-mechanics
lines, which folding removes, and put the saving from ~9 to ~7 lines per 10k at 9.9% of stored tokens. 1,400 takes
that step and no further, since agents go back after compaction for exact commands, paths and subagent outcomes.
Status: landed, untested on bench.

## Scheduling, compaction and recall fixes (v1.19.0)

A code review after the move to Ember found these, all fixed in v1.19.0:

- **Timeouts sized for Ember.** Observer 20 s in the background and 10 s at compaction, with one retry inside the 30 s deadline. Reflector 90 s, Session line 20 s. Measured from 67 Ember calls: median 2.8 s, worst 12.3 s.
- **No duplicate calls at compaction.** Compaction waits up to 5 s for a background call already running over its rows before sending its own, and `schedule` skips the rows a compaction is observing.
- **The install window.** A background landing between a compaction storing its ledger and the history showing the new memory message no longer rebuilds the ledger from the old memory.
- **Chunks observed together.** A continuation field an earlier chunk of the batch set carries on where a later chunk, never shown it, doesn't give it. A chunk with its own corrections that was shown out-of-date constraints is observed again.
- **Subagents.** These are observed in the background only within 30k tokens of their compaction point. Most answer before they compact, and their ledger goes with them.
- **Retries and locks.** A range that fails 3 times waits for compaction. Each loop has its own lock.
- **om_recall:**
  - A bare `HH:MM` is the newest day it fits.
  - Regexes with repeated alternatives are refused.
  - Paths are searched as words.
  - Tool results are searched and labelled with their command or path.
  - Short blocks show whole.
  - Results are ranked by a score that weights rare terms and whole words.

The cache write after a compaction (~47k tokens median) was traced to Claude Code, not the plugin. About 16.5k of it is the session's own system prompt and tools, rewritten after any compaction because plugins can't place a cache marker. About 19.6k is the memory message and raw tail. The plugin injects nothing that misses the cache twice.
