# bench-compact: the Luna behavior check

Status: approved by the user on 2026-09-25. Not built yet.

## Where this stands

- `scripts/bench-compact.ts` is the deterministic A/B benchmark for compaction. It is being built in the worktree `.claude/worktrees/agent-a519773dc159f74c7` (branch `worktree-agent-a519773dc159f74c7`), not yet in the main checkout. The rubric is in `tests/eval/rubric.ts`.
- It replays 3 real transcripts (`om-orchestration`, `om-v04`, `firstmate-11`; 25 cut points) through the plugin and grades each compacted context for **retention**: whether the right facts are in the text.
- HEAD baseline before the sensitivity round: 88.5.
- A subagent is running a sensitivity round now: flip counts in the A/B output, harder items for saturated gates, stricter size scoring, and variants that must separate clearly.
- **Next step, decided:** when the sensitivity round is finished, send the design below to the same subagent to build. Do not start it before then.

## Why

Retention does not show whether a model reading the context acts correctly. A fact buried in noise or stated ambiguously passes retention and can still be missed. The behavior check measures that, cheaply, as a final check during A/B.

## Decisions

1. Luna is the **reader**, not the judge. **Code** grades its answers.
2. It runs only with a `--behavior` flag. The retention run stays fast and free.
3. **3 samples** per probe, majority vote.

## Design

**Model and setup:** pi, `openai-codex/gpt-5.6-luna`, `--thinking max`. Use `--system-prompt` (it replaces pi's coding prompt). No tools, no extensions, no skills, no context files, no APPEND_SYSTEM.md. This runs on the Codex subscription. Never use Anthropic models through pi.

**Input:** at each cut point, the compacted context exactly as the next turn would see it, followed by the probes.

**Probes:** each probe comes from an existing rubric item. There is no second set of criteria.

| Kind | Example | Correct answer |
|---|---|---|
| Rule now | "What is the current indentation rule?" | the latest form, never the stale one |
| Permission | "May you run `purge-cache.sh` now?" | exactly `yes`, `no` or `ask` |
| Done or not | "Is the `ff_invoice_v2` migration finished? Should you redo it?" | done, do not redo |
| Next step | "What were you doing when the context ended, and what is next?" | matches the handoff |
| Exact value | "What is the commit SHA of the release fix?" | the exact string |
| Dropped fact | "What was the shard-101 checksum?" | `unknown`, plus a `recall_query` that finds it with `om_recall` |
| False fact | "Which port did we agree on for staging?" (never agreed) | `unknown`, not a guess |

**Evidence quotes:** every answer that is not `unknown` must include a verbatim quote from the context. Code checks that the quote is a substring of the context. An answer without a valid quote is wrong. This catches guesses and answers from outside knowledge.

**System prompt (draft):**

```
You are a continuation auditor. Below is the complete context an AI coding agent
has after its memory was compacted. You are that agent, about to continue.

Answer each probe using ONLY this context. Rules:
1. Never use outside knowledge or guess. If the context does not settle the
   answer, answer "unknown".
2. Every non-unknown answer must include "evidence": an exact, character-for-
   character quote from the context (10–200 chars) that supports it.
3. If two statements conflict, the later one wins. Say so in "note".
4. For permission probes answer exactly one of: "yes", "no", "ask".
5. For dropped facts, answer "unknown" and give "recall_query": the keywords you
   would search the session history with.
6. Output one JSON array, one object per probe, in probe order, with keys
   id, answer, evidence, note, recall_query. No other text.
```

**Grading:** code checks each answer against the rubric item: the expected strings, the permission word, `unknown` where required, and the evidence substring. A `recall_query` is checked by running the real `om_recall` search (`hooks/recall.ts`) with it over the transcript up to the cut.

**Cost and noise:**

- Cache answers by (context hash + probe + prompt hash). When A and B produce the identical context at a cut point, the answers are reused, so only cuts whose contexts differ cost calls.
- 3 samples per probe, majority vote. The report lists probes whose samples disagreed.

**Report:** a separate **behavior** score beside the retention score, never blended into it: per gate, passed/total for A and B, the flips, and the disagreements. This makes a result like "retention equal, behavior better" visible.
