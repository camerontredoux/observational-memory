# `#` recall: memory in the prompt box's typeahead

Spec, 2026-10-06. Uses `prompt.autocomplete`, added in Claude Code 2.1.292.

## Goal

The person types `#` and a word in the prompt box and sees the session's matching memory lines (observations and constraints) as typeahead rows. Taking a row writes that line into the prompt. Memory becomes something the person can steer with directly, instead of only the model reaching it through `om_recall`.

## The event

From the 2.1.292 types (`PromptAutocompleteInput`, `PromptAutocompleteResult`, `PromptAutocompleteSuggestion`):

- It fires as the person types, for the non-whitespace token ending at the cursor. Its input is `{ text, cursor, token, start }`. `token` is never empty.
- Nothing waits on it. The engine's own rows draw first and plugin rows join beneath them, unhighlighted.
- A hook returns `{ suggestions: [{ text, label?, description? }] }`. Taking a row writes `text` over the token, the cursor after it, and the box's new token is asked again. `label` is the one-line row (the `text` when absent); `description` is a dim line beside it, cut to the row by the surface.
- Register with a token matcher: `on("prompt.autocomplete", { token: /^#/ }, hook)`. Keep what other plugins gave by spreading `(await next(e)).suggestions`.
- A test raises it as `await $.prompt.autocomplete({ text, cursor, token, start })`.

## Behaviour

1. **Trigger.** A token that is `#` then a letter (`/^#\p{L}/u`).
   - `#` alone (a markdown heading being typed), `##`, `#!` and `#123` (an issue reference, which another plugin may answer) show nothing.
   - The query is the token after `#`, lower-cased and split into words on every character that is not a letter or digit: `#auth-tok` is `auth`, `tok`.
2. **Source.** The main session's ledger: `entries` (the observation lines, the Reflector's included) and `corrections` (the constraints in force).
   - Subagent loops are left out: their ledgers are dropped when the subagent finishes, so their lines would come and go under the person's hands.
   - No transcript search: the event fires per keystroke, and `om_recall`'s search over the transcript is too slow for that.
3. **Matching.** A line's words are its text without the marker, the date and time, and a constraint's `(this replaces the earlier constraint …)` note, lower-cased and split the same way as the query. A line matches when every query word is a prefix of one of its words, so `#auth` matches "authentication" and `#auth-tok` matches "auth token".
4. **Ranking.**
   - Constraints first.
   - Then by marker: 🔴, 🟡, 🟢, ✅. A line with no marker ranks last.
   - Then newest first: by the line's date and time, then by its place in the ledger (later is newer).
   - Rows whose `text` repeats an earlier row's are dropped (a 🔴 observation can quote the same words as a constraint).
   - At most 8 rows.
5. **Row.**
   - `text`: the line's words as they read, without the marker, date and time or replaced-constraint note, then one space: `User asked to keep errored Bash results folded `. The trailing space ends the token, so the box asks nothing more of this row's last word and the person types on.
   - `label`: the marker and that same text, on one line (whitespace runs collapsed), cut to 100 characters with `…`.
   - `description`: the line's date and time as the line gives them (`2026-09-22 09:00`), then ` · constraint` for a correction or ` · condensed` for a Reflector line (`r: true`), as the /notes pane names it. A line with no time gives only the tag, or no description.
6. **No match, no ledger yet** (a fresh session before the first observation), **or a failure** reading or matching: return what `next(e)` gave, unchanged. The hook never throws.
7. **Order with other plugins.** Other plugins' rows from `next(e)` come first, this plugin's after them.

## Decisions on the draft's open questions

1. **What taking a row writes:** the line as it reads, without the marker and date (the draft's option a). The person sees exactly what goes in and can edit it. A quote wrapper adds words the person did not choose, and a reference the model must expand costs a tool call for every use.
2. **Trigger character:** `#` then a letter. Plugin rows join beneath the engine's own and other plugins' rows rather than replacing them, so a clash costs at most a few extra rows; requiring a letter keeps headings, shebangs and issue numbers out. A longer prefix such as `#om:` would make the feature hard to find and slower to type.
3. **Scope:** the main session only (see Source).
4. **Reflected lines:** ranked like any other line. They are already older than the Observer's newer lines, so newest-first places them; the description tags them `condensed`.

## Cost

The hook must not await `$.store` per keystroke.

- `register.ts` keeps an in-memory index per main session id: each line's row fields and its words, built by `hash-recall.ts`.
- Every write of a main loop's ledger rebuilds that session's index from the ledger just written, after the write succeeds. The writes go through one helper (`saveLedger`) so none is missed: the Observer's commit, the step-time reconcile, the Reflector, and the three writes in compaction. A subagent loop's write updates nothing.
- The hook reads only the index and `$.session.id()`.
- If the index is missing (a hooks-worker restart, a resumed session), the first keystroke reads `$.store.get(ledgerKey(sessionId))` once, builds the index and answers from it. Keystrokes that arrive while that read is in flight share it. A ledger with no lines, or none at all, is cached as an empty index, so the store is not read again. A load that lands after a write already built the index does not replace it.
- `session.end` with reason `clear` drops the session's index, as it drops the ledger.

## Where it goes

- `hooks/hash-recall.ts`: pure functions, no `$` and no I/O: `queryOf(token)` (the query words, or none for a token that is not a trigger), `indexOf(ledger)` (the index of `{ entries, corrections }`), and `suggest(index, query)` (the rows, ranked and capped). Its header says what it is, like the other modules'.
- `hooks/register.ts`: the index map, `saveLedger`, the cold load, the `prompt.autocomplete` hook, and the drop on `/clear`.
- `hooks/hooks.json`: `prompt.autocomplete` with one clause for its behaviour.
- `.claude-plugin/plugin.json`: version 1.9.0, and a short clause in `description`. The commit subject is `observational-memory v1.9.0: # in the prompt box offers matching memory lines`.

## Tests (`claude plugin test`, a new `tests/hash-recall.test.ts`)

- `#auth` against a stubbed ledger returns the matching lines: constraints first, then by marker, then newest, at most 8, with `text`, `label` and `description` as above.
- `#auth-tok` matches "auth token" and not "auth only"; `#AUTH` matches like `#auth`.
- `#`, `##`, `#123` and `#zzz` (no match) return `next(e)`'s suggestions unchanged.
- Another plugin's suggestions from `next(e)` are kept, ahead of this plugin's rows.
- A Reflector line is described `condensed`; a constraint's replaced-constraint note is not in its `text`.
- The hook makes no `$.store` call when the index is warm, and one call in all for several keystrokes from cold.
- A ledger commit updates the rows the next keystroke sees.
- A subagent's ledger lines never show.
- After `/clear`, the cleared session's lines no longer show.

## Checks

- `claude plugin test`.
- Types: the committed `.claude/types` are Claude Code 2.1.286's and lack `prompt.autocomplete`, so `tsc -p .` reports it until `/plugin-types` writes the 2.1.292 declarations. Until then, check with `bunx -p typescript tsc -p .claude-plugin/types`, the 2.1.292 declarations the engine lays beside the mod. Errors in the gitignored `tests/fixtures/*.local.ts` modules predate this work.
