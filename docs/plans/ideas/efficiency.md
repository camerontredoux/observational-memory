# Context-efficiency ideas

Proposals E1 to E5 for `compaction-ideas.md`, on what goes into the compacted context and what it costs. Best first.

How they were measured. E1, E3 and E4 change only how a finished context is assembled, so no model call is needed to test them. A throwaway simulator (`~/.claude/jobs/40c779b6/tmp/ideas-eff/sim.ts`) rewrote the 25 main-corpus contexts of a finished replay, and `bench-compact.ts run --contexts` graded them against the same contexts unchanged. Each Δ below is against that unchanged base, not against a plugin run. The E1 base was a pre-I3 replay (73.1 through `--contexts`). The E3 and E4 base was the I3 `grp` replay (75.0, the same as its plugin run). E2 and E5 change model inputs, so they need `--record`. Nothing here made a model call.

Where the tokens go (I3 `grp`, main corpus, mean per cut of 21.3k): raw tail 11.2k, observations 6.3k, verbatim user messages 3.2k, skills 1.1k, constraints 0.4k, the rest under 1k. On the reflection chain (mean 38.1k per cut, max 50k without skills): observations 18.2k, raw tail 11.4k, user messages 4.7k, constraints 1.5k. The chain is where size matters: its budget gate passes 17/31 cuts.

### E1 tail-cap: cap old tool results in the raw tail at 1000 tokens. proposed
- **Idea:** In the raw tail that compaction keeps, cut each tool result longer than 1000 tokens to its first and last 500 tokens with the existing `omissionMarker(…, 'result')`, except in the newest 4 rows. This is X1 (tail-mask) with a cap the simulator shows is lossless. X1's 500-character mask is more aggressive than any cap measured here, and the aggressive caps lost quality.
- **Evidence:** 25 cuts, the same contexts with only the tail changed:

  | variant | total | Δ | context mean / max | lost |
  |---|---:|---:|---|---|
  | base | 73.1 | | 22k / 35k | |
  | `cap:2000`, all but newest 4 rows | 73.2 | +0.1 | 22k / 35k | nothing |
  | `cap:1000`, all but newest 4 rows | 73.2 | +0.1 | 21k / 35k | file-state 58.2→57.0 |
  | `gapcap:500`, older than the newest 6k tokens | 73.0 | −0.1 | 20k / 30k | file-state −3.8, multi-hop −2.3, rationale −1.8 |
  | `gapcap:250`, older than the newest 6k tokens | 73.0 | −0.1 | 20k / 30k | the same |
  | `keep:3000`, tail cut to 3k tokens | 70.2 | −2.9 | | failures 22.7→0, lessons 44.9→34.7 |
  | `gapdrop`, tail cut to its newest 6k tokens | 71.7 | −1.4 | 17k | failures 22.7→4.5 |

  Tool results over 2,000 tokens hold 64.5k tokens across the 25 tails, of which 28.5k is above the 2,000 cap and 58.1k above a 1,000 cap. Single results reach 6,500 tokens. Cutting whole rows from the tail (`gapdrop`, `keep:N`) costs the failures and lessons gates. So cap the size of what is kept, not the number of rows kept.
- **Change:** `hooks/register.ts`, where the compaction returns the rows from the cut on: pass each `toolResults` text older than the newest 4 rows through `excerpt(text, TAIL_RESULT_MAX_TOKENS)` with a new `TAIL_RESULT_MAX_TOKENS = 1_000`. Keep error results whole. X1 names a condition to check first: whether the next compaction's `persistent` hash test sees the capped copy or the original. The same condition applies here.
- **Test tier:** cheap. No model input changes, so the cached replies still hit and the result is exact.
- **Expected:** Context about −1k per cut (−5%), max unchanged, quality unchanged. If phase2 tests X1, run it at 1000 tokens as well as at 500 characters. The simulator says the smaller cap costs file-state and rationale for about 1k more tokens saved.
- **Risk:** The model may re-read a file or re-run a command whose middle was cut. Keeping the newest 4 rows and every error whole limits this. The bench can't see it.
- **Result:**

### E2 chunk-cap: cap tool results at 1000 tokens in the Observer's chunk. proposed
- **Idea:** Lower the Observer's per-result cap `TOOL_RESULT_MAX_TOKENS` from 5000 to 1000 tokens for successful results. Keep 5000 for error results. Then size chunks by that capped text, so each 10k-token call covers more history.
- **Evidence:** Observer input is 95% of the model tokens: 1,226k of 1,290k on the main corpus, over 87 calls. I read 134 cached Observer inputs (main corpus and chain). The mean chunk is 10.1k tokens, and 5.95k of it (59%) is tool results. Above a 1000-token cap there are 1.45k tokens per chunk (14%); above 1500, 0.97k; above 2500, 0.46k. The Observer writes about 740 tokens per call, so most long results produce nothing in its notes. Chunk sizing uses `estimateTokens(rowText(m))`, the uncapped row, so a lower cap alone shortens each call but does not reduce the number of calls. Sizing by the capped text does both.
- **Change:** `hooks/register.ts`: `TOOL_RESULT_MAX_TOKENS` to 1000 for results without `isError` (in `serialize`, line 349). Make the per-row count that `nextChunk` adds up (the `tokens` array built at line 286) use the serialized, capped size. `excerpt` already keeps the head and the tail, where the command echo and the error or summary usually are.
- **Test tier:** full with `--record --samples 2`. Every Observer input changes. That is paid, so the coordinator must approve it.
- **Expected:** Observer input tokens −10 to −14% (about 1,226k to 1,070k) and about 10% fewer calls. Output tokens about the same. Critical-path calls are unchanged or fewer, because each chunk covers more history.
- **Risk:** The Observer may lose identifiers or facts that are only in the middle of a long result, such as a path in a listing or a count in a diff stat. Check identifiers (47) and facts (68). The failures gate should not move, because error results keep their 5000-token cap. If identifiers drop, try 1500 (0.97k per chunk saved).
- **Result:**

### E3 day-once: write the date once per day in the memory. proposed
- **Idea:** Render the observations and the verbatim user messages grouped by day. Put a `@ 2026-09-23` line before the first line of each day. Each line then gives only its time (`* 🟡 14:32 …`), and a same-day source range gives only times (`(source 14:30 to 14:41)`). The ledger keeps full dates. Only the rendered memory changes, as with I3.
- **Evidence:** On the I3 base, 25 cuts:

  | variant | total | chronology | saved per cut, main | saved per cut, chain |
  |---|---:|---:|---:|---:|
  | base | 75.0 | 69.1 | | |
  | observations by day | 75.0 | 69.1 | 417 tokens | 1,208 tokens |
  | user messages by day | 75.0 | 69.1 | 157 tokens | 681 tokens |

  No item changed in either variant, and the chronology gate did not move. The two parts together save about 0.6k tokens per cut on the main corpus and 1.9k on the chain (5% of the chain's 38k). The chain saves more because its memory is longer.
- **Change:** `hooks/register.ts`: `renderGrouped` writes the day lines and shortens the dates. The user-messages renderer does the same for its `User @ date time` headers. `parseMemory` puts the day back on each line when it reads an older memory message. That keeps the Reflector's date regex (`maybeReflect`) and the ledger unchanged. `hooks/prompts.ts`: `MEMORY_INSTRUCTIONS` says that a line's date is the nearest `@` line above it.
- **Test tier:** cheap, then the chain, because the saving is mostly there. The rendered memory is not a model input, except where an older memory message is read back, so the cached replies still hit.
- **Expected:** Quality unchanged. Context −0.6k per cut (main) and −1.9k per cut (chain). The chain's budget gate may go up.
- **Risk:** A reader may misdate a line far below its day line. On these single-day or two-day sessions the risk is small. A multi-day session is where it would show, and the corpus has few of those. The read-back parser is a new failure point: a day line that is lost would misdate every line after it. A round-trip test of `parseMemory` covers this.
- **Result:**

### E4 user-dedup: do not repeat a user message that the memory already quotes whole. proposed
- **Idea:** In `<all-user-messages>`, replace a message whose whole text (whitespace and case folded, 12 characters or more) is already in the corrections or the observations with `* User @ <date time>: quoted above`. The order and the times stay, so the section still reads as the full list of prompts.
- **Evidence:** On the I3 base: 75.3 against 75.0 (+0.3), 213 tokens saved per cut on the main corpus and 927 on the chain. The chain's last cut quotes 183 user messages (5.8k tokens), and 76 of them are already whole in the memory above. The +0.3 comes from the reversals gate: 5 firstmate-11 items stop showing a stale value after the new one. That is because the only copy after the new value was the repeated user message. That gain is real for a reader, but it also depends on how the gate is written. Most of the value is the chain's 0.9k tokens.
- **Change:** `hooks/register.ts`, where the user-messages section is built: fold the text of the corrections and observations once, then test each message against it. The newest prompt is never replaced, because the continuation quotes it for its exact wording. `NEWEST_RESERVE_TOKENS` does not change.
- **Test tier:** cheap, then the chain.
- **Expected:** +0 to +0.3. −0.2k per cut (main) and −0.9k per cut (chain). With E3, about −2.8k per cut on the chain.
- **Risk:** The copy that stays is in the corrections or observations, and the Reflector may later condense it. A message quoted whole in a 🟡 line can lose its wording after reflection, while the user-messages section no longer has it. To avoid this, match only against 🔴 lines and the corrections, which the Reflector passes through unchanged. That is what the constraints and verbatim gates protect. The measured saving above matched against everything, so the safe version saves somewhat less.
- **Result:**

### E5 reflect-sooner: start the Reflector at 28k instead of 40k. proposed
- **Idea:** Lower `REFLECT_AT_TOKENS` from 40k to 28k, `REFLECT_TARGET_TOKENS` from 20k to 14k, and `REFLECT_KEEP_TOKENS` from 12k to 8k, so that the observations never grow past about 28k tokens.
- **Evidence:** On the chain (I3 base), the observations grow from 1.9k to 32.4k tokens over 19 cuts before the first reflection. That reflection takes the ledger from 40.1k to 16.2k (655 notes into 234). They are the largest part of the chain's context, 18.2k of 38.1k per cut, and the budget gate fails at 14 of 31 cuts (contexts up to 65k against a 40k budget). The main corpus never reaches 40k, so it is unaffected. The reflection costs 38k input and 4.6k output tokens. A second one on the chain adds about 2% to its 1,777k model tokens.
- **Change:** `hooks/register.ts`: the three constants. The `target < 1_000` guard in `maybeReflect` stays safe, because the chain's 🔴 lines and 8k of recent notes leave about 5k of the 14k target.
- **Test tier:** full with `--record`. It changes Reflector calls, and `bench-compact.ts` refuses an A/B of a Reflector change without the chain. That is paid, so the coordinator must approve it.
- **Expected:** Chain observations about 18k to 13k per cut on average, context about 38k to 33k, and the budget gate up. About +40k model tokens per chain.
- **Risk:** More of the history goes through the Reflector sooner, and reflection is where the chain loses quality (68.9 against 75.0 on the main corpus). The measured context and budget gain may cost multi-hop and rationale items that the Reflector condenses. Test it only after the Reflector-quality ideas, because it makes their effect bigger in either direction. Issue #21 (durable memory tier) is the alternative that moves condensed notes out of context instead of rewriting them.
- **Result:**

## Not proposed

- **#28 task list:** it carries pending work, which is a quality question. The corpus rarely uses tasks, so the bench can't measure it.
- **#21 durable memory tier:** it would matter only after E5 or on sessions that reflect twice. om_recall already recovers most tested detail after one reflection. See E5's risk.
- **Skills:** a skill invoked in the last 3 turns adds up to 12.6k tokens at one cut, but I2 (1 turn) showed no gain. Nothing new to propose.
