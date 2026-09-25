# Observer ideas

Proposals O1 to O5 for `compaction-ideas.md`, about what the Observer captures: its prompt, its input and its settings. Best first. No code was changed. The benchmark runs below replayed cached Observer replies only (0 fresh calls).

## Evidence

The baseline is HEAD af0940d on the hardened bench, `run --plugin HEAD --no-chain --no-holdout`. With `--samples 2` the total is 73.9 (samples 74.8 and 73.1). The weakest gates are failures 29.5, rationale 35.5, multi-hop 37.5, lessons 44.9, identifiers 46.9 and file-state 58.9.

The scripts and the extracted Observer calls (input and reply of all 87 calls of the sample 1 runs) are in `~/.claude/jobs/40c779b6/tmp/`: `obsH/<fixture>/NNN.{in,out}`, and `classify.ts`, `where.ts`, `drop.ts`, `cap.ts`.

1. **The Observer sees the fact and drops it.** Sample 1 fails 55 hand-authored fact items (hard and rubric). For 48 of them, every expected token is in one Observer chunk, but no Observer reply holds them all. In 27 of these, the reply records the event but drops a second detail, such as the number, the reason or the exact string. For example, `neg:close-tag-prompt` keeps `</observations>` but drops "4 times in 10".
2. **The dropped details are in the assistant's own prose.** 60 expected tokens are in no Observer reply. 58 of them are in an assistant message in the chunk. 41 of these 58 are numbers, versions, paths, constants or backticked terms, so code can find them. For 43 of the 55 failed items, one assistant message (its text, sometimes with its tool call and result) holds every expected token.
3. **The facts are in the smallest part of the chunk.** By characters, a chunk is 57% tool results (Bash 51%, Read 4%), 19.5% tool-call arguments, 11% task notifications, 10.4% assistant prose and 0.7% user messages.
4. **The Observer writes a nearly fixed amount and barely reasons.** Each call reads about 14k tokens: about 10k of chunk and about 4k of prompt. Each reply is about 730 tokens: 7.5 observation lines (median 8, max 12), and 30% of the reply is the continuation. Calls with 8k to 13k input tokens write 62 output tokens per 1k input. Calls with 13k or more write 51. At `--thinking low` the reasoning is 91 tokens per call on average (max 177).
5. **Prompt rules alone did not move the items.** The `/tmp/omv/obs1` variant adds six Observer rules: keep the why, keep what was ruled out, keep what files now do, keep findings, keep links, and quote failed commands' errors. It scores 73.5 (1 sample), with rationale 23.6. Against HEAD sample 1, 24 hard items pass that failed and 30 fail that passed. HEAD sample 2 against sample 1 gives 21 and 27. The rules are inside the noise.

Points 1, 4 and 5 together say that the limit is how much the Observer selects and writes per chunk, not what the prompt tells it to value. O1 to O5 act on that limit: what the Observer is pointed at (O1), how much it thinks (O2), how much it writes per span (O4, O5), and what it reads (O3).

## Queue

### O1 details: list the details the assistant stated, as a checklist in the Observer's input. proposed
- **Idea:** Code finds the specific details in the chunk's assistant prose: backticked terms, numbers with a unit or percent, versions, constants, PR and commit ids, and paths. It lists them after the chunk as inert data. The Observer puts each listed detail that belongs to an event it records on that event's line, and leaves out the ones that don't matter.
- **Evidence:** Points 1 and 2: 41 of the 58 dropped tokens that are in assistant prose are details that code can find. Prompt rules that name kinds of detail had no effect (point 5). A list names the actual strings in this chunk, which a rule can't.
- **Change:** `hooks/register.ts`, where the Observer prompt is built (near line 670): add `detailsOf(rows)` over assistant text only, not tool calls or results. Deduplicate it, drop details already in a user message, and cap it at about 40 entries or 300 tokens, in chunk order. Render it after the chunk between markers, like the CONTINUATION block. `hooks/prompts.ts`: one Observer paragraph, for example "Each listed detail that belongs to an event you record goes on that event's line. Leave out details that don't matter. Don't write a line only to hold a detail."
- **Test tier:** The Observer input changes, so `--record --samples 2` per arm. Then full (chain and holdout), because it changes every observation.
- **Expected:** Up on lessons, rationale, multi-hop, file-state and identifiers. Observer input goes up by about 300 tokens per call (+2%). Output goes up by about 10 to 20%. Context tokens per cut go up slightly.
- **Risk:** The hand-authored items were written from facts the assistant stated, so part of the gain may come from matching the rubric. Judge the idea on the holdout and with `--behavior`. The Observer may pad lines with trivial numbers. Check a sample of replies, and check that lines don't turn into identifier lists (`isList` lines count for nothing and still cost tokens).
- **Result:**

### O2 think: run the Observer at `--thinking medium`. proposed
- **Idea:** Give Observer calls a higher reasoning level than the current `low`. Keep the Reflector at `low` for this A/B.
- **Evidence:** Point 4: 91 reasoning tokens on average for a 14k-token chunk. Choosing which of about 60 details in a chunk to keep, and which line each belongs to, is a selection task. Point 5 suggests that at `low` the model doesn't act on more instructions. This is also the cheapest change to test.
- **Change:** `hooks/register.ts:33`: `PI` holds `--thinking low` for every call (line 616 runs both the Observer and the Reflector). Take the level as a parameter and pass `medium` for Observer calls.
- **Test tier:** `--record --samples 2` per arm (3 when close). Try `high` only if `medium` gains.
- **Expected:** Up on the same gates as O1, with an unknown size. Reasoning is paid as output: at about 500 tokens per call, that is about +40k tokens, or +3% of model tokens. Context size stays about the same.
- **Risk:** Slower calls. The 2 critical-path calls at compaction take longer, and a call that passes its timeout is not retried at compaction, so the compaction falls back to the brief. Check `calls.json` for timeouts and wall time per call.
- **Result:**

### O3 lean: cap each tool result in the Observer's chunk at 1k tokens. proposed
- **Idea:** Lower `TOOL_RESULT_MAX_TOKENS` from 5000 to 1000. `excerpt` keeps the head and the tail of a longer result with its omission marker. om_recall still reads the full result. This changes only the Observer's input. X1 masks results in the raw tail, which is a different place.
- **Evidence:** Point 3: tool results are 57% of the chunk. In a replay of the 87 chunks with 1k-, 1.5k- and 2k-token caps, 1 of the 223 expected tokens that are in a chunk falls in the cut part at each cap (`neg:vcc-brief-test`, "48%"). The caps cut 25.1%, 16.7% and 11.6% of the tool-result characters.
- **Change:** `hooks/register.ts:53`, and the matching constant in `tests/register.test.ts:52`.
- **Test tier:** `--record --samples 2`. It changes chunk boundaries, so all Observer calls are fresh.
- **Expected:** Chunk text goes down about 14%. With `CHUNK_TOKENS` fixed, each call covers more transcript, so there are about 87 → 75 calls and about 10 to 14% fewer Observer input tokens. Quality stays about the same. But each call now has more transcript for the same reply size (point 4), so O4 should spend the saving.
- **Risk:** The replay only checks tokens that the rubric knows. Identifiers that are only in the middle of a long Read or log, and errors in the middle of long test output, can be lost. Compare the identifiers and failures gates item by item against the base.
- **Result:**

### O4 span: lower `CHUNK_TOKENS` from 10k to 7k, on top of O3. proposed
- **Idea:** Each Observer call covers less transcript. It writes about the same amount per call, so the memory gets more lines per hour of work. O3 pays for most of the extra calls.
- **Evidence:** Point 4: smaller inputs get more output per input token (62 against 51 per 1k). Point 1: 48 of 55 failed items were inside one chunk, so the loss is per call, not across chunk boundaries. All current calls read 8k or more, so the gain at 7k is extrapolated. The test measures it.
- **Change:** `hooks/register.ts:36`. `STEP_SCHEDULE_TOKENS` follows it (`CHUNK_TOKENS / 2`).
- **Test tier:** `--record --samples 2`, stacked on O3 and compared against O3 alone and against the base. Then full, because the Reflector runs sooner on the chain.
- **Expected:** With O3, each call covers about 81% of today's span, so there are about 107 calls (+23%). Observer input tokens stay about the same: chunk text is 14% smaller, and about 20 more calls add about 4k tokens of prompt each (about +80k). Output goes up about 20%. Observations and context size go up, so the Reflector runs sooner on the chain.
- **Risk:** More chunk boundaries split more facts (4 failed items are split across blocks today). A larger memory means earlier and deeper reflection, which the chain track grades. If context per cut rises by more than 10%, it breaks the efficiency rule unless X1 or another saving lands with it.
- **Result:**

### O5 target: give the Observer a size target, as the Reflector has. proposed
- **Idea:** Tell the Observer how much room it has, based on the chunk's size, as "room to keep detail, not a ceiling". For example, about one observation line per 800 tokens of chunk that isn't routine reads or listings. That is about 12 lines for a 10k chunk, against 7.5 today.
- **Evidence:** Point 4: the reply size is nearly fixed. The prompt calls the job "to compress ONE chunk" (`hooks/prompts.ts:18`) and gives no size. The Reflector has a size target and a "KEEP MORE DETAIL" level because replies far under the target dropped detail. A number is a different kind of instruction from the value rules that failed in point 5.
- **Change:** `hooks/prompts.ts`: the Observer's request gets the target, computed in `hooks/register.ts` from the chunk's token count. Say that the target is for events and their details, not for extra lines about routine steps.
- **Test tier:** `--record --samples 2`.
- **Expected:** About 40 to 60% more observation lines per chunk, and up on the same gates as O1. Observations in context go from about 7.5k to about 10k tokens before reflection, so context per cut goes up about 10%. It must land with a saving (X1, or O3 without O4).
- **Risk:** Padding. The model may fill the target with routine steps, which lowers the grounding and adds tokens without facts. Overlaps with O4: both raise lines per span. Test O5 alone first because it adds no calls. If it gains, test O4 only on top of it.
- **Result:**
