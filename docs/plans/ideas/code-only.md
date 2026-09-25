# Code-only ideas

Proposals C1 to C6 for `compaction-ideas.md`. Each one changes only how `hooks/register.ts` selects or renders the compacted context. No Observer or Reflector input changes, so a cached A/B makes 0 model calls. Best first.

How they were measured. A throwaway simulator (`.scratch/ideas-code/csim.ts`) rewrote the finished contexts of a base3 replay (`.scratch/omv-code/base3`, 70 cuts: 25 main, 14 holdout, 31 chain). Its 70 contexts (`compaction-N.md`, `kept-N.json`) are byte-identical to base2's, so every number here holds for base2 as well. Grading ran from the main checkout's `tests/eval/rubric.ts`, reversals fix included. `bench-compact.ts run --contexts` then graded them against the same contexts unchanged. The grader copy at `.scratch/ideas-code/bench-compact.ts` also grades holdout and chain under `--contexts`. The base graded this way scores the same as its plugin run: 77.9 main, 79.3 holdout, 81.5 chain. Nothing here made a model call.

Two notes on reading the numbers:

- **"up" counts are mostly the tokens gate.** That gate scores size on a slope, so a smaller context gains partial credit on most cuts. The item lists name only the whole items that flipped.
- **The grader reads a changed tail row as prose only.** `proseContext` reads a kept row whole only when it matches a transcript row exactly. Any row these ideas shorten is graded by its prose lines alone. I checked each loss below: in every case the key was really cut out, so the losses are real, not grading artifacts.

Where the tail tokens go (fail11, main mean 8.1k per cut of kept tail): whole tool results, Bash arguments, results I9 already masked, assistant text, and injected wrapper rows. Across all tails, 32 tool-call argument payloads hold about 30.9k tokens. 120 copies of one Stop-hook notice ("firstmate watcher wake") hold 18.2k tokens.

| idea | tokens per cut (main / holdout / chain) | main | holdout | chain | items lost |
|---|---|---:|---:|---:|---|
| base2 (= base3) | 17.7k / 19.3k / 33.4k | 77.9 | 79.3 | 81.5 | |
| C1 image-prompt | +4 / +13 / +16 | 78.1 | 79.3 | 81.7 | none |
| C2 wrap-dedup | −173 / −189 / −226 | 77.9 | 79.3 | 81.7 | none |
| C3 reminder-strip | −227 / −271 / −306 | 77.9 | 79.4 | 81.7 | none |
| C4 arg-mask at 250 | −394 / −603 / −405 | 77.9 | 79.3 | 81.6 | 2 / 1 / 2 |
| C4 arg-mask at 500 | −218 / −181 / −200 | 77.9 | 79.3 | 81.5 | 2 / 0 / 1 |
| C5 wrap-mask | −587 / −163 / −548 | 77.9 | 79.3 | 81.7 | 2 / 0 / 0 |
| C1 + C2 + C3 + C4 at 250 | −622 / −845 / −690 | 78.2 | 79.4 | 82.1 | 2 / 1 / 2 |
| C6 users-first | 0 | 77.9 | 79.3 | 81.5 | none, 0 flips |

### C1 image-prompt: keep a typed prompt that starts with an image marker. proposed
- **Idea:** This is a bug fix. `typed()` in `register.ts` and `typedText()` in `recall.ts` drop any prompt whose text starts with `[Image`. That drops the image-note rows, as intended. It also drops a real prompt the user typed after pasting an image. firstmate-11 line 5039 is `[Image #10]\n\nNeed a follow up PR for the gorman PR. It printed out the entire address in the project address, instead of just the street address.` The user's follow-up request never reaches `<all-user-messages>`.
- **Evidence:** Putting the dropped prompts back (18 insertions over the 70 cuts) fixes corrections @10 and @11 and asks @10 on firstmate-11, and corrections @24 to @31 and asks @24 on the chain. It costs 4 to 16 tokens per cut. Replay fixtures hold image-prefixed prompts in 2 of 6 transcripts.
- **Change:** in both functions, strip leading `[Image #N]` and `[Image: source: …]` markers and blank lines, then keep the rest if any text is left. An image note with no text after it stays out. The two modules must agree, as the comment on `typed()` already requires.
- **Test tier:** cheap, exact. `typed()` runs only at compaction, where it builds `<all-user-messages>` (base3 `register.ts` line 1631). The Observer's input does not use it.
- **Expected:** main +0.2, chain +0.2, holdout 0, size unchanged.
- **Risk:** a prompt that is only an image marker plus a few words ("[Image #3] this") now takes a line in the memory. That is correct: the user said it.
- **Result:**

### C2 wrap-dedup: in the raw tail, drop the lines an injected row repeats from a newer one. proposed
- **Idea:** In the kept tail, an injected wrapper row (`INJECTED_WRAPPER`: task notifications, hook feedback) keeps its first line and any line that no newer wrapper row in the tail repeats. It ends with one short note that the rest is as in the newer notice. The newest copy of each notice stays whole.
- **Evidence:** a Stop-hook wake notice repeats the same six lines of instructions every time it fires: 120 copies, 18.2k tokens across the kept tails. The dedup saves 201 tokens per cut and loses no item on any track.
- **Change:** a `dedupWrappers(rows)` pass beside `maskTail`, over the rows the compaction returns, newest first, with a `Set` of the lines already seen.
- **Test tier:** cheap, exact.
- **Expected:** −1% context on main, −0.7% on the chain. No item moves.
- **Risk:** an older notice whose only different line was its first line reads as a copy. The first line, which names the event, is always kept. The next compaction's row hashes see the shortened row. As with I9's `unmask`, restore the original from the history before hashing. Wrapper rows carry no id, so match on the first line and the row position.
- **Result:**

### C3 reminder-strip: drop `<system-reminder>` blocks from kept user rows, except the newest. proposed
- **Idea:** Remove `<system-reminder>…</system-reminder>` blocks from user rows in the kept tail, except in the newest user row. Claude Code sends these blocks again every turn, and the host adds its current copy after the compaction.
- **Evidence:** the blocks cost 276 tokens per cut alone. They lose no item: holdout +0.1, chain +0.2. After C2 they add only 69 tokens per cut, because C2 already removes most of the repeats.
- **Change:** one `replace` on `m.text` for kept user rows without tool results, in the same pass as C2. `typed()` already strips these blocks from the memory's copy.
- **Test tier:** cheap, exact.
- **Expected:** −1.3% context alone, about −0.4% on top of C2. Take it with C2 or not at all.
- **Risk:** a reminder that carries live state, such as hook feedback that asks for an action. Keeping the newest row whole covers the current one. The simulator stripped all of them, including the newest, and still lost nothing. Same hash note as C2.
- **Result:**

### C4 arg-mask: cut old tool-call arguments in the raw tail to 250 tokens. proposed
- **Idea:** I9 masks old tool results in the tail. The calls that made them are left whole: a `Write` body, an `Edit`'s `old_string` and `new_string`, a long Bash heredoc. Cut each string field of a tool call to its head and tail with `excerpt`, except in the newest 3 calls. The marker names the call, not the result.
- **Evidence:** saves 441 tokens per cut (−2.2% main, −3.1% holdout, −1.2% chain). At 500 tokens it saves 203. The items lost were really in the cut middle: `turn.start/turn.complete` and `/tmp/om-v043/fixture.jsonl` (chronology, om-v04 @5 and @8), `/tmp/r.new` (identifiers, crew-uspa-4 @2), and `PR 1379` (commits, chain @30). At 500 tokens only the two om-v04 chronology items are lost.
- **Change:** extend `maskTail` to `toolUses[].input` string fields, with `TAIL_CALL_MAX_TOKENS = 250` and a count of the newest 3 calls. Leave `file_path`, `path`, `pattern` and `url` whole. `unmask` needs the same step, by `tool_use_id`, so the Observer and the row hashes see the original call.
- **Test tier:** cheap, exact.
- **Expected:** the savings above. Quality ±0.1.
- **Risk:** the model may redo an edit it can't see whole in its tail. The newest 3 calls stay whole, and om_recall returns the original. Start at 500 tokens if the coordinator wants no chain loss.
- **Result:**

### C5 wrap-mask: cut every injected row but the newest to 60 tokens. tradeoff
- **Idea:** This is a stronger form of C2. Every wrapper row except the newest is cut to 60 tokens with `excerpt`, whether or not it repeats a newer one.
- **Evidence:** saves 490 tokens per cut, but loses files-edited @3 on om-orchestration (a workflow script path) and chronology @7 on om-v04 (`main-0.4.9`). Task notifications carry results that name files and branches, and C2 keeps those.
- **Change, test tier:** as C2.
- **Expected:** about 2.5× C2's saving on main, with 2 items lost.
- **Risk:** it loses what subagents reported. Prefer C2. Run C5 only if the budget gate needs more room on the chain.
- **Result:**

### C6 users-first: render `<skills-in-use>` and `<all-user-messages>` before `<observations>`. parked
- **Idea:** Put the newest notes last, next to the tail, so they come after the old verbatim user messages that they may supersede.
- **Evidence:** 0 flips on all three tracks, size unchanged. The rubric can't see this change: the latest-wins items already pass or fail on the order inside each block.
- **Why parked:** any benefit would show in behavior only. Test it with `--behavior` when a recording slot is free, next to I33.
- **Result:**

## Recommended bundle

C1 + C2 + C3 + C4 at 250 tokens, as one cheap A/B on base2 or base3. The simulator gives 78.2 / 79.4 / 82.1 (+0.3 / +0.1 / +0.6) with context −3.5% main, −4.4% holdout and −2.1% chain. It loses the 5 C4 items listed above. If those matter more than 200 tokens per cut, use C4 at 500 tokens instead.

## Checked and not proposed

- **Skills already in the tail:** 0 tokens of `<skills-in-use>` repeat text that a kept row holds.
- **User messages already in the tail:** 2 tokens per cut repeat. I15 and the tail's start already handle this.
- **Observations that repeat the tail:** none by design. `tailStart` never keeps rows under the watermark.
- **Identifier lists for absent keys:** most failed identifiers were last seen in tool results (89) or tool arguments (63), and 69 were over 80k tokens behind the cut. A code-built list would not be credited, because `isList` gives a bare list nothing, and I31 (working-set) was rejected for the same reason.
