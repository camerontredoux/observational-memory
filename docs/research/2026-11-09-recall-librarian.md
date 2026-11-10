# om_recall's librarian

An `om_recall` search answered with excerpts of its top hits. After a search, Claude often read a block because the
excerpt did not hold what it needed. The librarian asks Muse Ember which lines of the best hits answer the search.
Code then pastes those lines from the blocks. Ember never writes the text Claude gets.

Prototype: `~/work/scratch/recall-replay/` (`librarian.ts`, `librarian2.ts`, `librarian3.ts`; v3.1 is
`librarian3.ts --v31`).

## Method

- 25 real searches, each replayed against its transcript cut at the search call (`replay.ts`).
- 20 hard cases: the excerpt did not hold the text that the `read` after the search gave. 5 controls: the excerpt
  held it.
- Ember got the agent's words before the search, the query, and the top blocks of the search.
- A blind grader judged each output: was it enough for Claude's next step on its own?

## Versions

| | What changed |
|---|---|
| v1 | Ember quotes text from the top 5 blocks. Only verbatim quotes are kept. |
| v2 | Ember gives line ranges over numbered blocks. Code pastes those lines with 2 lines of padding. |
| v3 | Top 10 blocks, each with its paired call or result. Each range grows to its whole unit (a section, a list, a fenced block, a multi-line command, a call's argument), plus 1 line each way. Identical text is pasted once. A 6,000-character cap. |
| v3.1 | Ember lists ranges most important first. Each unit is pasted whole or becomes a `ref lines a-b` pointer. The first unit may run to 10,000 characters. |

## Results

The 20 hard cases:

| | Enough | Partly | Not enough |
|---|---|---|---|
| v1 | 4 | 9 | 7 |
| v2 | 11–12 | 4–6 | 3–4 |
| v3 | 13–14 | 4–5 | 2 |
| v3.1 | 15 | 5 | 0 |

Controls: 5 of 5 for v3.1. One v3.1 call took 1.75 s and cost about $0.0009 at the median (0.7 to 3.4 s, at most
$0.0031).

## What the plugin runs

`hooks/librarian.ts` ports v3.1. Every search asks it. It differs from the prototype in three ways:

- Its candidates include the subagents' transcripts, ranked with the main thread's, even when `subagents` is false.
  A burst test found the answer in a subagent transcript in 5 of 15 real recall bursts. A unit from a subagent is
  labelled with its thread.
- After the pasted units, the search's other hits stay listed, so every block the excerpts offered can still be read.
- An optional `need` input says what Claude will do with the result. It goes to Ember with the query.

When Ember fails, times out (8 s), gives bad JSON or `found: false`, gives no valid range, or has no key, the search
answers with its excerpts as before. The log and `/om-stats` record each fallback by class.

Port check: fed v3.1's recorded Ember replies, the port's pasted output is identical to v3.1's for all 25 cases,
apart from the thread label on subagent units. A live run of 3 cases ($0.0027 in all) pasted the same units as
v3.1, within a line, at 1.4 to 2.1 s per call.

## The metric to watch

`/om-stats` shows "Read after": the share of searches followed, within the next 3 tool calls, by a `read` of a block
the search named. The plugin counts the tool calls the model asks for in each request (`turn.step`), so a call that
is later denied or fails still counts. The count is kept in memory: a plugin reload or the session's end drops the
open searches, and a turn's end counts them as not read.
