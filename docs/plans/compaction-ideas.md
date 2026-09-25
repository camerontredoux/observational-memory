# Compaction ideas queue

The ideas for Phase 2 (see `compaction-goals.md`). Idea agents propose, the coordinator prunes and queues, and the Phase 2 agent tries them in queue order and records the result here.

## Process

The main session is the coordinator. It keeps this file current and decides every step below. The agents don't talk to each other freely; they work in rounds, and the coordinator starts each one.

| Agent | Role | Writes to |
|---|---|---|
| `phase2-obs` (replaced `phase2`, stopped 06:50) | **Observer lane:** changes to the Observer/Reflector prompt or input, which need `--record`. Tests queued ideas in its own worktree (`.claude/worktrees/agent-aae8af6bc51de6810`). It never edits main-checkout files except this one. Cheap test first (`--no-chain --no-holdout`); the full test only for Reflector changes, big changes, or to confirm a stack of wins. After each result, it sends the coordinator a progress message. | this file (Result, status), `~/.claude/jobs/40c779b6/tmp/phase2-log.md` |
| `ideas-observer` | Proposes ideas about what the Observer captures (its prompt and input). | `docs/plans/ideas/observer.md` (O1..) |
| `ideas-efficiency` | Proposes ideas about what goes into the context and what it costs: assembly, tail, skills, reflection, store + om_recall. | `docs/plans/ideas/efficiency.md` (E1..) |
| `ideas-outside` | Does bounded web research on other systems. It labels each idea incremental or redesign; redesigns are parked until the current design plateaus. | `docs/plans/ideas/outside.md` (X1..) |
| `phase2-code` | **Code lane:** exact, free code-path changes (assembly, tail, formatting, code-built sections), in its own worktree. It starts from phase2's current best (I3 grp) and sends its wins to the coordinator, who stacks them. | this file, `~/.claude/jobs/40c779b6/tmp/phase2-code-log.md` |
| `phase2-refl` | **Reflector lane:** the Reflector, its thresholds and prompt, and the reflection-chain track (the lowest score, 65.8). Records chain samples. Own worktree. | this file, `~/.claude/jobs/40c779b6/tmp/phase2-refl-log.md` |
| `handoff-mvp` (stopped, I8 rejected) | A one-off MVP test of I8 (Amp-style handoff, alone and as a hybrid with OM) in its own worktree. | `~/.claude/jobs/40c779b6/tmp/handoff-mvp.md` |

Handoffs: every worker writes each meaningful result as one file in `~/.claude/jobs/40c779b6/tmp/inbox/`, named `<HHMM>-<agent>-<short-name>.md`: the variant, plugin dir, Δ against its base and HEAD, efficiency, verdict, and next step. Then it sends the coordinator a one-line message naming the file. The coordinator moves a file to `inbox/read/` once it has acted on it: queue status updated, wins stacked. The 10-minute heartbeat lists unread handoffs, so a compaction or a burst of messages loses nothing.

Each round:
1. The idea agents write at most 5 plans each, tied to evidence, then stop. They edit no code and make no model calls.
2. The coordinator prunes them. It moves the accepted ones here as **queued**, in priority order, and marks the rest **dropped** with a reason. It drops ideas that break `compaction-goals.md`, duplicate an entry, or gain only in a benchmark blind spot.
3. phase2 takes the top **queued** entry, tests it, and records the result and status. It doesn't sit idle when the queue is empty.
4. The coordinator starts the next idea round only when the queue runs low, or when results change the picture. In that round, each idea agent reads the other files and the results, critiques and combines them, and proposes new ideas. This keeps usage bounded.
5. Lanes run in parallel. Each queue entry names its lane. At most one `--record` run per agent at a time, to stay within the codex subscription's limits. The coordinator stacks the lanes' wins into one candidate and confirms it with the full test (`--samples 2`).
6. The coordinator lands a winner in the main checkout only after the full test and `claude plugin test` pass. The user's live sessions load the plugin from the main checkout.

State: idea round 1 started 2026-09-25 06:40. phase2 is working on its own ideas until the queue has entries.

### Builders (07:45): code is written ahead of the test slots
- The test lanes (obs, refl, code) spend most of their time waiting on recordings. Builders write the queued ideas that aren't built yet, so a lane always has a ready variant when its slot frees.
- **Base:** the current best stack is named in ~/.claude/jobs/40c779b6/tmp/base.txt. Every builder keeps each idea as one diff in /tmp/omv-build/<idea>.diff and a plugin copy in /tmp/omv-build/<idea>/ built on that base. When the coordinator moves the base (a new keeper), builders re-apply their diffs to it and re-run the checks.
- **Control variable:** each idea is still A/B'd alone against the base, so a result says what that one change did. When two keepers stack, the stack gets its own confirmation run against the old base.
- **Model-free ideas** (exact, cached): the builder also runs the cached A/B itself, since that needs no recording slot. Ideas that need recordings go to their lane's queue ready-built.
- builder-code: I30 remind, I31 working-set, I14 day-once, I15 user-dedup (phase2-code took I28). builder-obs: I21 target, I33 handled (with its rubric items), and I18/I19 rebased onto the base. builder-bench: B1 long-chain track.

## Statuses

- **proposed**: written by an idea agent, not yet reviewed.
- **queued**: accepted by the coordinator; phase2 tries it next, in queue order.
- **trying**: phase2 is on it.
- **kept**: an A/B showed a gain (or a lossless saving), and it's in the current best.
- **rejected**: tried, no gain or a regression. Don't retry unless a new angle is written down.
- **dropped**: pruned without trying (duplicate, against the goals, or unmeasurable).
- **parked**: plausible but not now; for example, it only pays off after something else lands, or it needs a redesign.

## Entry format

`### I<n> <short name>. <status>`, then:
- **Idea:** one or two sentences.
- **Evidence:** the gates or item ids it targets, or the measurement that motivates it.
- **Change:** the files and what changes.
- **Test tier:** cheap (main only), or full (chain + holdout, `--samples`).
- **Expected:** quality and efficiency effect.
- **Risk:** what could get worse, including anything the benchmark can't see.
- **Result:** filled in by phase2 (variant, Δ, efficiency, verdict).

## Queue

### I1 nosrc: drop the source ranges. rejected
- **Idea:** render the observations without their "(source A to B)" trailers.
- **Result:** +0.2 exact and context −6%, but om_recall uses the ranges and the benchmark can't see that loss. Replaced by I3.

### I2 sk1: keep skills for 1 turn instead of 3. rejected
- **Result:** 0.0 exact, context about the same. Behaviour risk for no gain.

### I3 grp: one source range per run of lines. kept
- **Idea:** write a range once, after the last line of a run of lines that share it. The instructions say a range closes its run, and parseMemory copies it back to each line.
- **Result:** +0.2 exact, no item flips, context −5% (22k→21k, max 36k→34k), ratio 14.1→13.3%, no model change. The new base.

### I4 thinking: give the Observer the assistant's reasoning (#22, PR #27). parked
- **Idea:** serialize puts each thinking block, capped at 1k tokens, before the action it led to, as `[Assistant reasoning @ ...]`. The Observer records it only as 🟡 "Assistant reasoned/suspected ...". PR #27 (branch of #22) has the code and tests.
- **Evidence:** the weakest gates are rationale 38, failures 36, lessons 45, multi-hop 36. Stated reasons and ruled-out approaches often live only in thinking, which the Observer never sees today.
- **Change:** port PR #27's `serialize`/`reasoningIn` and the prompt paragraph onto the current base. Check first that the replay harness feeds thinking: PR #27 reads `$.session.messages({ as: 'api' })`, and the replay's fake session may not provide it. If it doesn't, feed the replay from the raw transcript's thinking blocks.
- **Test tier:** Observer input changes, so `--record --samples 2` per arm (3 when close); full test before keeping.
- **Expected:** rationale/failures/lessons up. Observer input tokens up, so watch the efficiency gate. If it is over +10%, try a smaller cap (500) or thinking only for chunks with a decision or failure.
- **Risk:** reasoning recorded as fact. Check a sample of notes for 🟡 attribution.
- **Result:** parked 2026-09-25 06:50. The Observer-lane agent was stopped by an API safeguard flag (`reasoning_extraction`) while it worked on this. Leave it to the user to decide whether and how to pursue it.

### I5 observer-tool: the Observer records through a schema-checked tool (#19, PR #26). parked
- **Idea:** replace the tagged-text reply with a `record_observations` tool call, checked against a schema and the chunk.
- **Why parked:** it's a reliability change, not a quality one, and it rewrites the Observer's output format. Every prompt experiment would have to be rebased onto it. Test it once the Observer prompt work settles, as one `--record --samples 2` A/B for cost, turns and rejected calls.

### I6 durable-tier: move condensed notes to topic files (#21). queued (after I25), lane reflector
- **Why parked:** the issue's own rule is to build it only if a second reflection loses detail that recall doesn't cover. No track runs a second reflection yet; the chain reflects once. Revisit if the context-size work needs it, or if a Reflector change forces a second reflection.

- **Unparked (user, after the r28 finding):** with the Reflector at 28k the chain reflects twice, and the second reflection loses all 8 facts only the first reflection's lines held: #21's trigger. Depends on I25: run it after I25's result. If I25 keeps those facts at a bounded size, record that and close I6 again; if facts are still lost or the reflected block grows too big, build I6.

### I7 tasks: carry pending work in the task list (#28). parked
- **Why parked:** the corpus transcripts barely use tasks, so the benchmark can't measure it. It's a small separate feature (mirror TaskCreated/TaskCompleted and list open tasks in the continuation). Build it outside the A/B loop with its own tests, after Phase 2's first winner lands.

### I8 handoff: Amp-style handoff, alone and as a hybrid with OM. rejected (user, after the speed results)
- **Idea:** re-test #16's fork handoff on the new benchmark, reshaped the way Amp does it: goal-conditioned, pointing to detail instead of copying it, with the authority bug fixed. Two arms: **amp** (the handoff replaces the observations; user messages and 🔴 constraints stay) and **hybrid** (OM plus a ≤1.5k note from the working model: the goal, reasons, ruled-out approaches, the next action).
- **Evidence:** #16 was rejected on the old, easy benchmark with few runs. The new benchmark's weakest gates (rationale, failures, lessons, multi-hop) are what a model that read the whole conversation should carry.
- **Test tier:** full, `--samples 2`. gpt-5.6-sol through pi stands in for the working model.
- **Risk:** it's a blocking model call at compaction time, against the goals. The agent must also check whether the note can be written in the background.
- **Result:** pending. Results go to `~/.claude/jobs/40c779b6/tmp/handoff-mvp.md`.

- **Result:** stopped before scoring. Real pi latency on the critical path: amp 38 to 48 s per compaction (about 60k tokens in, 2.4k out), about as slow as built-in compaction; hybrid 8 to 18 s. The stand-in writer also often answered the last message instead of writing the note. The user judged it tested and denied: a blocking model call that long goes against the goals. Worktree agent-ab208b160703dbdea, branches handoff-amp and handoff-hybrid.

### I9 tail-mask (X1 + E1): cap or mask old tool results in the raw tail. kept (mask3-250), lane code
- **Merged with E1** (`ideas/efficiency.md`): a 1000-token cap with the newest 4 rows exempt measured 73.2 against 73.1 and saved ~1k per cut. Tighter caps lost file-state, multi-hop and rationale; dropping whole rows (`gapdrop`) lost badly (failures 22.7 to 4.5). Start from E1's setting and sweep toward X1's 500 chars; don't drop rows. E1's sim script: `~/.claude/jobs/40c779b6/tmp/ideas-eff/sim.ts`.
- **Idea:** see `ideas/outside.md` X1. Mask successful tool results older than the newest 3 and over 500 chars down to a head plus the om_recall marker. Keep errors and all prose.
- **Test tier:** cheap, then full. Check the `persistent` hash (register.ts ~1348) against masked rows. Before rejecting on identifier/fact losses, check the lost items by hand, since masked rows become prose-only in grading.
- **Result:** mask3-250 (newest 3 results and errors whole, older successful results over 250 tokens cut to head+tail+marker): +0.2 vs grp (0↑ 6↓, p=0.031, no verdict), holdout +0.9, chain +2.4; context −14% main, −17% holdout, −8% chain; Observer keys unchanged. mask3-1000: +0.1 (0↑ 2↓), context −6%. Keep N (2/3/5) barely matters. 5 of the 6 losses are real (detail in the cut middle of large results, still retrievable with om_recall), 1 is a grading artifact. Dirs /tmp/omv-code/mask3-{250,1000}; log `~/.claude/jobs/40c779b6/tmp/phase2-code-log.md`.
- **Result (phase2-code):** `/tmp/omv-code/mask3-250` keeps the newest 3 results and all errors whole. Older successful results over 250 tokens are cut to their head and tail plus the om_recall marker. On grp: main +0.2 (0↑ 6↓), holdout +0.9, chain +2.4. Context −14% main, −17% holdout, −8% chain. Against HEAD: context −19%, chain +5.5. Same cache keys, so the scores are exact. 5 of the 6 losses are real: the detail sat in the cut middle of a big tool result and is still recoverable with om_recall. mask3-1000: +0.1, context −6%. The number kept whole (2, 3 or 5) barely matters; the cap sets the tradeoff.
- **Decision (coordinator):** kept at 250. Smaller context with the detail still in storage is the goal. It stacks with grp. Follow-up I24.

### I24 mask-keep-cited: keep the lines of a masked tool result that the assistant later cites. rejected, lane code
- **Idea:** when the tail mask cuts a tool result, keep the lines in the cut middle that hold a token the assistant later named (a path, number, identifier). Targets the 5 real losses of I9 at a small token cost.
- **Test tier:** cheap and exact (same cache keys).
- **Result:** 0.0 against mask3-250, no flips, context +1%. The variants that also cite from later tool results, rank the lines and allow 200 tokens still lose the same 5 items. The lost terms are never named again in the tail, so no citation signal can reach them. Diff: /tmp/omv-code/i24-cite.diff.

- **Result (phase2-code):** 0.0 against mask3-250, no flips, context +1%. Wider variants (citations from later tool results, ranked lines, a 200-token budget) lose the same 5 items. The lost terms are never named again in the tail, so no citation signal reaches them; om_recall still holds them. Details: inbox/read/0745-code-i24-mask-keep-cited.md.

### I10 open-failures (X2): a code-built list of open failures, in prose. kept (fail11, on top of mask3-250), lane code
- **Idea:** see X2. Cap it at 8 entries or ~500 tokens.
- **Caveat:** the failures gate uses nearly the same selection rule, so a gain there proves little alone. Keep it only if the other gates hold and a `--behavior` probe or the holdout agrees.
- **Result (phase2-code):** fail11 against mask3-250: +2.4 (13↑ 0↓, p=0.00024), holdout +5.1 (6↑ 0↓ unique, p=0.031), chain +3.9 (18↑ 0↓); context +1%, model tokens 0. Against grp: +2.6 (13↑ 5↓, the 5 are I9's), holdout +6.1, chain +6.3, context −13%. Against HEAD: +2.7, holdout +6.3, chain +9.5, context −18%. No gate lost an item on any track. Most of the gain is the failures gate. Outside it: files-edited, in-progress and identifiers for paths named in a failure (holdout /tmp/parse_q.py, FETCH_HEAD; chain fm-peek.sh, projects.md), and chronology (main...origin/main, plugin.json, secondmates.md). So the holdout agrees, but mostly through the same gate. No `--behavior` probe was run: it makes model calls on every changed context. Hand-checked: lines name the real error (a hook's script and reason, a Python error's last line); declined calls are left out. Dir /tmp/omv-code/fail11, worktree commit 9b207eb (branch i10-failures), diff /tmp/omv-code/i10-failures.diff.

- **Result (08:00, kept):** fail11 on mask3-250: main +2.4 (13 up, 0 down, p=0.00024), holdout +5.1 (6/0), chain +3.9 (18/0), context +1%. Vs HEAD: main +2.7, holdout +6.3, chain +9.5, context -18%. Most of the gain is in the failures gate, so check it with --behavior in the stack confirmation run. Dir /tmp/omv-code/fail11, diff /tmp/omv-code/i10-failures.diff. It is the new base (base.txt).

### I11 supersede (X3): a new observation retires the older one it replaces. trying (batch1), lane observer
- **Idea:** see X3. Test tier: full, `--samples 2`.

### I12 contrast (X4): learn Observer guidelines from lost items. parked
- **Why parked:** high risk of fitting the rubric. Revisit if the Observer lane stalls. Any model call must go through pi and openai-codex.

### I13 cliff (X5): model-free compaction as a control arm. parked, lane code
- **Why parked:** it's a measurement, not a candidate. The code lane runs it once its queue is empty, to show how many points per token the Observer buys.

### I14 day-once (E3): write the date once per day in the memory. queued, lane code
- **Idea:** see `ideas/efficiency.md` E3. No gate items changed; saves ~0.6k per cut on the main corpus and 1.9k on the chain.
- **Risk:** om_recall's from/to and multi-day sessions. Make sure the model can still build a full date for a range, and that a line after a day change is unambiguous.

### I15 user-dedup (E4): don't repeat user messages the memory already quotes whole. queued, lane code
- **Idea:** see E4. 75.3 against 75.0 (the +0.3 comes from the reversals gate), saving ~0.2k per cut and 0.9k on the chain.
- **Risk:** verbatim user messages are a proven guarantee. Dedupe only on an exact whole quote.

### I16 think (O2): Observer at `--thinking medium` instead of low. trying (batch1), lane observer
- **Idea:** see `ideas/observer.md` O2. 48 of the 55 failed facts were inside one Observer chunk and dropped, and the Observer reasons only ~91 tokens per call. Prompt rules alone didn't beat the noise (obs1: 24 up, 30 down against HEAD's own 21/27).
- **Watch:** model tokens (~+3% expected) and background latency.

### I17 lean (O3 + E2): cap each tool result in the Observer's input at 1k tokens instead of 5k. trying (batch1), lane observer
- **Idea:** see O3 and E2. The replay of 87 chunks lost 1 of 223 expected tokens and cut 25% of tool-result text; Observer input ~10–14% smaller. Batch it with I16 in one recording.

### I18 details (O1): code lists the details stated in the chunk; the Observer puts each on its event's line. queued, lane observer
- **Caveat:** part of a gain may be matching the rubric. Judge on the holdout and `--behavior`.

### I19 span (O4): CHUNK_TOKENS 10k to 7k, on top of I17. queued, lane observer

### I21 target (O5): a size target for the Observer, ~12 lines per 10k chunk. queued, lane observer (last)
- **Caveat:** it must land with a saving (I17/I19) to stay within the efficiency rule.

Round 1 pruning, 2026-09-25 06:55: all 15 proposals kept or merged. X1+E1 became I9, O3+E2 became I17. X4 and X5 are parked (I12, I13). Recording through pi and openai-codex is the user's subscription, not a paid API, so E2/E5 need no extra approval.

### I20 reflect-early (E5): start the Reflector at 28k instead of 40k. trying, lane reflector (full tier, chain)
- **Evidence:** on the chain, observations reach 32k before the first reflection, and 14 of 31 cuts go over the 40k budget.
- **Variants:** /tmp/omv-refl/r24, r28, r30, r32 (REFLECT_AT/TARGET/KEEP 24/12/7k, 28/14/8k, 30/15/9k, 32/16/10k), on I3 grp.

### I22 refl-why: the Reflector keeps decisions' reasons and failures' causes. trying, lane reflector
- **Idea:** rank "decisions with their reasons, approaches tried and dropped or failed, with why" second in the Reflector's keep list (it was last, inside "the arc"), tell it a merged line keeps them in a few words, and replace the harder levels' "outcomes and cues only" with "outcomes, decisions with their reasons, failures with their causes, and cues".
- **Evidence (measured on the grp chain, model-free, /tmp/omv-refl/drops.ts):** the one reflection (after boundary 19) condenses 452 notes (~22.4k tokens) into 31 lines (~3.6k), 6x. Of the 46 member rubric facts its input held whole, it loses 22: decisions 7 of 13 (haiku-not-faster, no-subagent-threshold, neg:c029150-dropped, why:timeout-not-retried, assistant-model, herdr-panes, why:lanes), facts 7 of 17, chronology 7 of 14, approvals 1 of 2.
- **Change:** `hooks/prompts.ts` REFLECTOR_SYSTEM_PROMPT and REFLECTION_GUIDANCE. Variant /tmp/omv-refl/why.
- **Test tier:** chain, `--record --samples 2`; main and holdout must replay exactly.
- **Risk:** longer reflected lines, so a reflection over its target retries at a harder level. Watch Reflector calls and tokens.

### I23 refl-share: the Reflector's target scales with what it condenses. proposed, lane reflector
- **Idea:** today the Reflector gets what the fixed 20k total leaves after the 12k kept recent notes and the 🔴 lines (~7.5k for 22.4k of input), and Luna lands near half of that (3.6k; the floor is 0.4). Give it a target that is a share of its input (say 30 to 35%) and start it sooner (I20), so the memory after a reflection is no bigger than now.
- **Evidence:** the 6x compression above is where the chain's lost facts go; the 12k kept recent notes are never condensed.
- **Change:** `maybeReflect` in `hooks/register.ts`: the target and the floor. Test tier: chain, `--record --samples 2`.
- **Risk:** a bigger reflected block raises context size; the earlier start or a smaller keep must pay for it.


### I25 refl-tier: a reflection does not condense an earlier reflection's lines again. proposed, lane reflector
- **Evidence (r28 chain, /tmp/omv-refl/tiers.ts):** the second reflection resends the first's 24 reflected lines (~2.6k) with 285 new notes. Of the 8 rubric facts that only those reflected lines held, it loses all 8 (neg:c029150-dropped, why:gap-left, merge-recall, ...); of the 32 held only by notes, it loses 16. Condensing a line twice loses it.
- **Change:** `hooks/register.ts`: an entry the Reflector wrote carries `r: true`; the next reflection passes those through like 🔴 lines (in time order) and condenses only the notes. Variant /tmp/omv-refl/tier (on r28).
- **Risk:** the reflected block grows by ~3k per reflection. Bound it later (condense the reflected tier only when it passes a share of the target).

### I26 session-line: a standing "Session:" line in the continuation record. queued, lane observer (NEXT after batch1, user priority)
- **Idea:** the continuation record's first field says what the whole session is about, in 1 to 2 lines: the user's overall goal, the phases so far, and any role the assistant holds (for example "coordinator of the phase2 lanes"). The Observer carries it forward from the record before and changes it only when the user changes direction. `Active:` stays as the current goal.
- **Why:** nothing in the compacted context states the session's purpose today. `Active:` is replaced every chunk and follows the latest thread, so a side question can push the big goal out of it. The first user message is kept verbatim, but it is often a small first ask, not the goal. Our own coordinator role survived compaction only because it was written into a task and this doc.
- **Cost:** about 50 tokens per context, no extra calls.
- **Test:** the rubric has no purpose gate. Add 1 purpose item per transcript (hand-written, negative-controlled), plus a `--behavior` probe "what is this session about, and what is the overall goal?". Record with `--samples 2`.

- **Bench addition, pending landing:** the `purpose` gate (weight 3; one prose line of at most 600 chars), 3 hand-written purpose items and a behaviour probe. Diff: ~/.claude/jobs/40c779b6/tmp/purpose/purpose-rubric.diff, negative-controlled, tests 346/0 in /tmp/obs-bench2. Land it in the main checkout only when no lane run is reading fixtures: the worktrees' fixtures are symlinks into main, and the bench loads them while grading. Totals before and after it aren't comparable.

### I27 observer-context: the Observer knows what the session is working on. queued, lane observer (after I26)
- **Today:** each Observer call gets its chunk, the 🔴 constraints in force, and the previous continuation record (Active, Next steps and so on). The prompt frames that record only as something to carry forward ("for the <continuation> you write"), not as context for judging what matters. The Observer sees no earlier observations ("You do not see other chunks") and no session purpose.
- **Idea:** (a) reframe the record it already gets: "this is what the session is working on; weight events that bear on it, and name the goal a step serves". (b) Add the last ~1k tokens of observations, so it knows what's already recorded and can link new events to them. (c) I26's `Session:` line reaches the Observer automatically through the record.
- **Why:** a chunk read cold can't tell a key decision from a side detour, or know that "the 250 cap" refers to the tail mask. Mastra's observer gets its prior observations.
- **Test:** --record --samples 2 on the main corpus. (a) costs no tokens; (b) adds ~1k input tokens per call (~10%). Run a alone, then a+b. Overlaps with I11 (supersede shows older lines that share an identifier), so compare against I11's result.
- **Risk:** with prior observations in view, the Observer may repeat or rephrase them instead of observing the chunk.

## Round 2: long-lived sessions (docs/plans/ideas/longlived.md, agent ideas-longlived)

### I28 pin-lifecycle (L1): bound the constraint tier instead of falling off two cliffs. queued, lane code (next, bug-class)
- **Two cliffs confirmed by the coordinator in hooks/register.ts:** (1) line 1444: constraints over CONSTRAINTS_MAX_TOKENS=8k throw OVER_CAP, and the built-in compaction runs, losing every guarantee including the verbatim constraints. (2) line 1152: 🔴 lines plus the kept newest notes leave the Reflector a target under 1k tokens, it throws, and no reflection runs again. Only long sessions reach them, which is exactly the goal (indefinite sessions).
- **Idea:** when the tier passes its cap, keep the newest and still-referenced constraints whole and shorten the oldest to index lines (id, date, a few words, om_recall cue). The Reflector's 🔴 share gets the same bound, so it never starves.
- **Test:** step 1 is model-free: replay the chain with the cap lowered (for example 1k) so the overflow fires, and compare against the current code's fallback. Add a unit test for each cliff.

### I29 episode-index (L2): the reflected tier becomes episode lines no model rewrites again. queued (merged into the I25/I6 family), lane reflector
- Same family as I25 (don't re-condense) and I6 (#21 topic files). Handle it as I25's bounded form: when the reflected tier passes its share, fold the oldest reflected lines into one episode line each, written once. Needs the long chain (B1) to measure.

### I30 remind (L3): at compaction, code pulls up to 5 old lines that match the current work. queued, lane code
- Code (no model) searches the history already out of context for lines that share identifiers with the Active goal and the tail; it adds at most 5, or nothing. Cheap exact test. Risk: fitting the rubric, so judge it on the holdout too.

### I31 working-set (L5): list files read and tests run, and whether each changed since. queued, lane code
- A code-built list; targets re-reading after compaction (Codex #36664). Cheap exact for size; its quality benefit shows in behaviour, not in the rubric, so test it with --behavior too.

### I32 threads (L4): the continuation lists every open thread; an untouched one becomes a dormant line. parked (needs B1)
### I33 handled (L6): mark each quoted user message answered or open. proposed, lane observer
- Stops an old request being started again after a later compaction. Needs a rubric item per transcript, like I26's purpose items.

### B1 long-chain track: 10 to 15 transcripts a day apart, graded at every 5th cut, plus recall-aware credit. proposed, bench
- The benchmark gap behind I29 and I32, and the real test of "indefinite sessions". Recall-aware credit: partial credit when the context holds a line that om_recall can follow to the evidence. Needs more transcripts and one recording (Luna via pi). Build after the current lane batches, as its own agent.
