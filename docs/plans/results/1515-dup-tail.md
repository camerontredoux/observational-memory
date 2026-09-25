# Duplicate kept tail after an observational-memory compaction

Engine: Claude Code 2.1.282. Every live session ran `--model haiku` on the subscription, driven in herdr panes. Each arm loaded its own copy of the worktree plugin (`/tmp/duptail/{A,B,C}/plugin`) through a `--settings` file whose `env.CLAUDE_CODE_PLUGIN_DIRS` pointed at that copy. The user's plugin and settings were not touched. Every session ran the same script: `echo alpha-1111`, then `echo beta-2222` with a `FINAL-ANSWER-BETA` poem, then `/compact` with no instructions, then a follow-up question. After that I ran `/exit`, `claude --resume <id>`, `/context`, and one tool turn. The plugin's floor kept the last turn (the prompt, the tool pair and the final answer). A fourth session (Z) ran built-in compaction with no om plugin, as a baseline.

## Result

**None of the plugin-side arms fixes the duplicate rendering.** The cause is in the engine. When a `session.compact` hook's result stands, every message in it gets a fresh uuid, whether it has a handle or not, and is written after the boundary as a "replacement". The boundary carries no `preservedSegment`. The only thing the handle changes is which message object gets copied. Arm C fixes resume and makes the kept rows more faithful to the originals, but the tail still shows twice.

| Arm | Kept rows rewritten after the boundary (JSONL) | Tail shown twice in the pane | Resume stays compacted | Next turn, and turn after resume |
|---|---|---|---|---|
| A: handles stripped (current) | yes: new uuids, `model: "<synthetic>"`, thinking-only rows turned into `(no content)` rows, attachments dropped | yes | yes: the chain reaches the boundary at line 67 | fine, no API errors |
| B: all handles kept | yes: new uuids, real model rows | yes | **no**: the tool_result row's parent is the pre-compaction assistant row (line 74, parent line 51). The chain from the leaf runs back to line 6, and the resumed pane shows the raw history with no memory message | fine, no API errors |
| C: handles kept except on tool_result rows | yes: new uuids, real model rows, thinking signatures and attachments kept | yes | yes: the chain reaches the boundary | fine, no API errors |
| Z: built-in `/compact` (baseline) | **no**: the kept rows (the final answer and its turn_duration) keep their uuids, and the boundary has `preservedSegment` and `preservedMessages` | **no** | yes (by design) | n/a |

Resume token figures (`/context` Messages / the next API input): A 2.5k / 21.5k, B 3.5k / 22.5k, C 2.7k / 21.5k. The session is tiny, so the gap is small. The parent chain and the resumed pane are the decisive evidence for B.

Transcripts:
- `~/.claude/projects/-tmp-duptail-A-project/fd9ec864-5cfa-4cd4-ad56-a47ec409b263.jsonl`
- `~/.claude/projects/-tmp-duptail-B-project/a7c57b36-b6f2-455f-b335-3a7b13daca60.jsonl`
- `~/.claude/projects/-tmp-duptail-C-project/a0795635-3f94-4c94-8ec1-bd01b3f068e6.jsonl`
- `~/.claude/projects/-tmp-duptail-Z-project/95c41b68-2967-42ee-9d68-f37bbd013522.jsonl`

Helper scripts: `/tmp/duptail/show.py` (lists rows) and `/tmp/duptail/chain.py` (walks the leaf's parent chain).

## Why no plugin-side fix exists (engine 2.1.282 bundle, minified names)

- `Udr` runs the `session.compact` chain. If the hook's messages equal the rows core returned (`p8e`), the core result stands, with preserved uuids. Otherwise it goes to `g8e`.
- `g8e = (e,n,r) => ({ kind: "replaced", messages: Qxn(n.messagesOf(e.messages).filter(...)) })`.
- `messagesOf` maps a message that has a valid handle back to the engine's own message group. A message without a handle is rebuilt by `d8e` from its role, text and tool blocks. That rebuild produces `<synthetic>` rows, text-only tool results, and `(no content)` for thinking-only rows.
- `Qxn = e => e.map(n => n.type === "assistant" ? m8e(n) : { ...n, uuid: randomUUID() })`. `m8e` also gives a fresh uuid and zeroes the usage. **Every message gets a new uuid, handle or not.**
- `Rpr` builds the result as `{ boundaryMarker (with preservedSegment/preservedMessages cleared), summaryMessages: [], replacement: n, messagesToKeep: [] }`. The replacement is appended as new rows, and the UI renders them as new messages.
- The transcript writer sets `parentUuid = sourceToolAssistantUUID` for a user row that carries one. A tool_result row copied with its handle keeps the old assistant's uuid there, and that uuid exists before the boundary. This is arm B's resume leak, and the reason for e547d11.
- The built-in path (`URe`) instead records `preservedSegment: { headUuid, anchorUuid, tailUuid }` and `preservedMessages` on the boundary, and keeps the kept messages' uuids. The loader relinks them to the summary. Nothing is rewritten.

A plugin can only reach the uuid-preserving path by returning core's own rows unchanged, which needs core's model summary. A tail with no kept rows (the tail folded into the memory text) would still show the same content inside the memory message.

## A second visible issue found along the way

The hook's first message (the memory) is written as a plain user row, with no `isCompactSummary` or `isVisibleInTranscriptOnly`. The pane renders the whole memory text as a user prompt, dozens of lines long (arms A, B and C). Built-in compaction's summary shows only as "Compacted (ctrl+o to see full summary)". `SessionMessage` has no field a hook could set to mark it.

## Recommendation

- Do not change the handle stripping for this bug. B brings back the resume leak, and A and C both still duplicate.
- Arm C is an optional, separate improvement. On resume it behaves the same as A. It also keeps the real assistant rows (model, thinking signatures, message ids) and the prompt's attachments, and it stops emitting `<synthetic>` `(no content)` rows. The change is one line: keep `handle` except on rows with `toolResults`. I did not implement it because it does not fix this bug. Say if you want it, with a unit test next to "The engine stamps a handle".
- File the engine bug below.

No diff: no arm fixes both problems, so nothing was implemented in the worktree.

## Draft Claude Code bug report

**Title:** `session.compact`: a hook's kept messages are re-created with new uuids and shown again. A message kept with its `handle` should keep its row, as built-in compaction's `preservedSegment` does

**Version:** 2.1.282 (function hooks, `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`)

**What happens.** A `session.compact` hook returns `[summaryMessage, ...keptMessages]`, where each kept message is one of `e.messages` handed back with its engine `handle`. The docs for SessionCompacted say "A message with the engine's `handle` stands as the engine has it". Instead, `g8e`/`Qxn` gives every returned message a fresh uuid, handle or not. `Rpr` appends them after the `compact_boundary` as a `replacement`, and the boundary has no `preservedSegment`/`preservedMessages`. As a result:

1. The UI renders the kept messages a second time, after the compaction notice. Auto-compaction fires as a new prompt arrives, so the tail almost always holds the previous turn's full final answer, and the user sees it twice.
2. A kept tool_result row keeps its `sourceToolAssistantUUID`, which is the pre-compaction assistant's uuid. The writer uses that as its `parentUuid`, so the chain from the leaf crosses the boundary and `claude --resume` reloads the whole raw history as if no compaction had happened. A hook can avoid this only by stripping the handles, and then the rows are rebuilt from text: `model: "<synthetic>"`, `(no content)` rows in place of thinking-only rows, no thinking signatures, no attachments.
3. The hook's summary message is written as an ordinary user row, with no `isCompactSummary` or `isVisibleInTranscriptOnly`, so the whole summary renders as a user prompt.

**Expected.** Treat a hook's handled messages the way the built-in compaction treats `messagesToKeep`. A message returned with a valid, unchanged `handle` keeps its original uuid and row, is not rewritten, and is recorded in the boundary's `preservedSegment`/`preservedMessages` (anchor: the hook's last message before them), so that the loader relinks it on resume. Only messages without a handle, or with changed content, should be built fresh, and their parent pointers should stay after the boundary (don't carry `sourceToolAssistantUUID` from a pre-boundary row). Mark the hook's leading summary message as the compact summary, as core's is.

**Repro (haiku, about 2 minutes).** A plugin whose `session.compact` hook returns `[{ role: 'user', text: 'SUMMARY', toolUses: [] }, ...e.messages.slice(-5)]`, the last turn with its handles. Run two turns that each run `echo`, then `/compact`.
- Transcript: the kept rows appear again after `compact_boundary`, with new uuids and pre-compaction timestamps. The tool_result copy's `parentUuid` is the old assistant uuid from before the boundary.
- Pane: the last prompt and answer are shown twice.
- `claude --resume <id>`: the raw pre-compaction history is back.
- Stripping the handles fixes resume but not the duplicate, and it degrades the rows.
- Built-in `/compact` on the same session: the tail keeps its uuids, the boundary has `preservedSegment`, and nothing is shown twice.

**Evidence.** Session 40c779b6: line 8037 is the original answer (14:48:18). The `compact_boundary` is at line 8049. Lines 8051 to 8097 are fresh copies with new uuids, all stamped 14:50:03.609 with `model: "<synthetic>"`, and line 8097 is the answer again. The four controlled sessions listed above cover the handles-stripped, handles-kept, tool_result-only-stripped and built-in arms.
