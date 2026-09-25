# Observer idea plan for base5's weak behavior probes (phase2-obs). Plan only, nothing built

Source: base5's side of the I26+I27a behavior run (.scratch/obs-bench2/.scratch/runs/ab-sctxa-t9.json, sample 1): rationale 25/55, multi-hop 21/44, lessons 39/49, so 63 failed probes. Checked each failed item against base5's contexts (the controls modules) and the transcript (sims in .scratch/obs-bench2/.scratch/sim/).

## What the failures are
1. **14 of 63 aren't memory losses.** Every expected fact is in the context: why:parallel-order, why:lanes, hop:bench-worktrees, hop:151-messages, hop:settle-error-fix, neg:subagent-veto, neg:hook-output-refuted, why:gap-left, neg:vcc-brief-test, why-date-backdate, multi-prod-dump. Most fail as "evidence not in the context". Across all base5 probes, 62 of 306 failures are evidence misses, and ~30 of those look like two quotes joined ("a"; "b"). A multi-hop answer needs two facts, but the grader requires one contiguous quote. Fix (bench, not Observer): accept joined quotes when every piece is in the context. It's staged in .scratch/obs-bench3/tests/eval/behavior.ts. A cached regrade was blocked because the reader cache keys changed with the rebuilt rubric, so I stopped it before it spent calls. I'll regrade s2's behavior from cache once s2 finishes (0 calls). Do this before judging any idea on multi-hop.
2. **The real losses: 17 items, 14 of them stated in the assistant's own end-of-turn reports.** The Observer saw them and compressed them away. Examples: "Why not a prompt fix: ... failed 4 times in 10" (neg:close-tag-prompt), "What I cut: ... would take the total to about $51, over your cap" (why:cut-builtin-recall-new), "a merge during a run would reload..." (why:pin-new), "Your weekly usage: ..." (hop:usage). One firstmate report (PR #1418) holds three items by itself: why-sign-permission ("Cause: ... mark signed ... now checks the same permission as Send"), why-pm-assigned-only ("...would take a server change") and multi-accounts-sign ("#1098 ... should accounts keep it?"). Only 3 are in tool output alone (neg-session-cookie, why-imports-not-codex, multi-password-exposure), and none of those was cut by the 5k tool-result cap.
3. **Size of the source.** Over all 2,969 cached Observer calls, replies keep 30% of the distinctive tokens (numbers, #ids, hashes, `code`) in assistant prose, and 34% in reason-marked sentences. So reasons aren't dropped more than other specifics: the Observer compresses every report about 3x. End-of-turn replies are ~440 tokens each (om-v04: 90 replies, ~40k tokens, ~42 bold-labeled sections per boundary). A line per section would cost ~1.5k tokens per boundary, so anything here has to be selective. I42 covers only the newest replies within 1k, so a report stops being covered one or two cuts after it's written. The failed items above fail from cut from+1 onward.

## Ideas (none repeats I11/I16/I17/I18/I19/I22/I33 or the obs1/grp-obs2 prompt rules)

### I46 clause-carry (code, after the Observer's reply; recommended first)
- **Change:** for each observation line, code finds the end-of-turn report it summarizes by shared distinctive tokens (PR/issue #, hash, path, `code` term). If that report section has a reason or qualifier clause (because / would / so / over your cap / Cause: / Why not / "N times in M" / a $ or % figure) whose distinctive token the line lacks, code appends the clause verbatim in quotes to the line. Caps: one clause per line, ≤25 words, ≤2 per chunk.
- **Moves:** close-tag-prompt, cut-builtin-recall-new, pin-new, usage, why-sign-permission, why-pm-assigned-only, neg-address-split, no-luna-kept-out: 8 of the 14 report items, ~30 of the failed probes.
- **Not a repeat:** I18 gave the Observer a list of details before it wrote, and Luna ignored most of them (-0.3). Here code adds the clause after the reply, so nothing depends on Luna complying. Observer replies don't change, so the screen needs 0 fresh Observer calls, only the reader calls for --behavior.
- **Cost:** est. +3–5% context (1–2 missing reason tokens per chunk at ~30 tokens per clause). No model tokens.
- **Step 1, no build:** simulate on base5's cached contexts how many target items the carried clauses hold, and the tokens. Build only if it holds ≥6 of the 17 items at ≤+3% context.
- **Risk:** close to the padded-prose concern (assistant sentences naming identifiers), so judge on --behavior rationale/lessons, not the rubric.

### I47 open-asks field (Observer, continuation record, like I26's Session line)
- **Change:** a carried "Open asks:" field in the continuation record: questions the assistant put to the user that no later user message settled ("That's your call: should accounts keep it on contracts?", "Tell me if PMs should be able to sign any contract, which would take a server change"). The Observer drops an ask once the user answers it. Capped at ~100 tokens.
- **Moves:** multi-accounts-sign and why-pm-assigned-only: 10 failed probes (cuts 7–11). Maybe next/done probes too.
- **Source size:** end-of-turn replies hold 26 / 21 / 7 ask sentences (~360 / 330 / 120 tokens per transcript), and most get answered by the next user message, so the field stays small.
- **Not a repeat:** I33 marked the user's messages answered/open and didn't move the done probes. This carries the assistant's own pending questions, which the memory loses entirely today (0/5 cuts hold #1098).
- **Cost:** ≤100 tokens (~+0.5%). Fresh Observer calls (Observer lane). Needs a purpose-style hand item per transcript, which only the reader should judge (like I26).

### I48 reports-first input (Observer input shape; lowest confidence)
- **Change:** the Observer's chunk marks each end-of-turn reply as "[Assistant's report to the user @ HH:MM]" and repeats those reports in a short section after the chunk, since they're the session's own summary. The target9 line target stays as is, so lines shift from narration of reads and tool steps toward the reports.
- **Moves:** in principle all 14 report items. hop:brief-pinned, skill-stub, opus-round and tool-search aren't covered by I46.
- **Cost:** context ~0 (line count fixed by target9). Observer input +5–10% when reports are repeated.
- **Risk:** it's closest to the prompt-only changes that were noise (obs1, grp-obs2). Screen it only if I46 misses its sim bar.

## Order I'd run
1. Multi-quote regrade after s2 (0 calls). It resets the multi-hop baseline.
2. I46 sim, then build and screen main + holdout + --behavior (cached Observer; reader calls only).
3. I47 build and screen (fresh Observer calls, samples 1).
4. I48 only if I46 misses its bar.
