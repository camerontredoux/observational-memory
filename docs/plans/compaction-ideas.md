# Compaction ideas queue

The ideas for Phase 2 (see `compaction-goals.md`). Idea agents propose, the coordinator prunes and queues, and the Phase 2 agent tries them in queue order and records the result here.

## Process

The main session is the coordinator. It keeps this file current and decides every step below. The agents don't talk to each other freely; they work in rounds, and the coordinator starts each one.

| Agent | Role | Writes to |
|---|---|---|
| `phase2` | Tests queued ideas in its own worktree (`.claude/worktrees/agent-aae8af6bc51de6810`). It never edits main-checkout files except this one. Cheap test first (`--no-chain --no-holdout`); the full test only for Reflector changes, big changes, or to confirm a stack of wins. After each result, it sends the coordinator a progress message. | this file (Result, status), `~/.claude/jobs/40c779b6/tmp/phase2-log.md` |
| `ideas-observer` | Proposes ideas about what the Observer captures (its prompt and input). | `docs/plans/ideas/observer.md` (O1..) |
| `ideas-efficiency` | Proposes ideas about what goes into the context and what it costs: assembly, tail, skills, reflection, store + om_recall. | `docs/plans/ideas/efficiency.md` (E1..) |
| `ideas-outside` | Does bounded web research on other systems. It labels each idea incremental or redesign; redesigns are parked until the current design plateaus. | `docs/plans/ideas/outside.md` (X1..) |
| `handoff-mvp` | A one-off MVP test of I8 (Amp-style handoff, alone and as a hybrid with OM) in its own worktree. | `~/.claude/jobs/40c779b6/tmp/handoff-mvp.md` |

Each round:
1. The idea agents write at most 5 plans each, tied to evidence, then stop. They edit no code and make no model calls.
2. The coordinator prunes them. It moves the accepted ones here as **queued**, in priority order, and marks the rest **dropped** with a reason. It drops ideas that break `compaction-goals.md`, duplicate an entry, or gain only in a benchmark blind spot.
3. phase2 takes the top **queued** entry, tests it, and records the result and status. It doesn't sit idle when the queue is empty.
4. The coordinator starts the next idea round only when the queue runs low, or when results change the picture. In that round, each idea agent reads the other files and the results, critiques and combines them, and proposes new ideas. This keeps usage bounded.
5. The coordinator lands a winner in the main checkout only after the full test and `claude plugin test` pass. The user's live sessions load the plugin from the main checkout.

State: idea round 1 started 2026-09-25 06:40. phase2 is working on its own ideas until the queue has entries.

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

### I4 thinking: give the Observer the assistant's reasoning (#22, PR #27). queued
- **Idea:** serialize puts each thinking block, capped at 1k tokens, before the action it led to, as `[Assistant reasoning @ ...]`. The Observer records it only as 🟡 "Assistant reasoned/suspected ...". PR #27 (branch of #22) has the code and tests.
- **Evidence:** the weakest gates are rationale 38, failures 36, lessons 45, multi-hop 36. Stated reasons and ruled-out approaches often live only in thinking, which the Observer never sees today.
- **Change:** port PR #27's `serialize`/`reasoningIn` and the prompt paragraph onto the current base. Check first that the replay harness feeds thinking: PR #27 reads `$.session.messages({ as: 'api' })`, and the replay's fake session may not provide it. If it doesn't, feed the replay from the raw transcript's thinking blocks.
- **Test tier:** Observer input changes, so `--record --samples 2` per arm (3 when close); full test before keeping.
- **Expected:** rationale/failures/lessons up. Observer input tokens up, so watch the efficiency gate. If it is over +10%, try a smaller cap (500) or thinking only for chunks with a decision or failure.
- **Risk:** reasoning recorded as fact. Check a sample of notes for 🟡 attribution.

### I5 observer-tool: the Observer records through a schema-checked tool (#19, PR #26). parked
- **Idea:** replace the tagged-text reply with a `record_observations` tool call, checked against a schema and the chunk.
- **Why parked:** it's a reliability change, not a quality one, and it rewrites the Observer's output format. Every prompt experiment would have to be rebased onto it. Test it once the Observer prompt work settles, as one `--record --samples 2` A/B for cost, turns and rejected calls.

### I6 durable-tier: move condensed notes to topic files (#21). parked
- **Why parked:** the issue's own rule is to build it only if a second reflection loses detail that recall doesn't cover. No track runs a second reflection yet; the chain reflects once. Revisit if the context-size work needs it, or if a Reflector change forces a second reflection.

### I7 tasks: carry pending work in the task list (#28). parked
- **Why parked:** the corpus transcripts barely use tasks, so the benchmark can't measure it. It's a small separate feature (mirror TaskCreated/TaskCompleted and list open tasks in the continuation). Build it outside the A/B loop with its own tests, after Phase 2's first winner lands.

### I8 handoff: Amp-style handoff, alone and as a hybrid with OM. trying (agent `handoff-mvp`)
- **Idea:** re-test #16's fork handoff on the new benchmark, reshaped the way Amp does it: goal-conditioned, pointing to detail instead of copying it, with the authority bug fixed. Two arms: **amp** (the handoff replaces the observations; user messages and 🔴 constraints stay) and **hybrid** (OM plus a ≤1.5k note from the working model: the goal, reasons, ruled-out approaches, the next action).
- **Evidence:** #16 was rejected on the old, easy benchmark with few runs. The new benchmark's weakest gates (rationale, failures, lessons, multi-hop) are what a model that read the whole conversation should carry.
- **Test tier:** full, `--samples 2`. gpt-5.6-sol through pi stands in for the working model.
- **Risk:** it's a blocking model call at compaction time, against the goals. The agent must also check whether the note can be written in the background.
- **Result:** pending. Results go to `~/.claude/jobs/40c779b6/tmp/handoff-mvp.md`.
