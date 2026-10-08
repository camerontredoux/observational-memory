# rules: only standing constraints are 🔴 corrections; one-time approvals are 🟡

A is HEAD (55c17a7, v1.5.0). B is HEAD plus the Observer prompt change in `docs/archive/plans/results/diffs/rules.diff`. The change:

- `PRIORITY_MARKERS` 🔴 now means a standing constraint: a rule, preference, prohibition or scope limit that stays in force, or a correction of something said earlier. A one-time go-ahead for one action is not one. The 🟡 line now lists one-time approvals.
- The Corrections paragraph lists standing constraints and corrections only. A new paragraph says that a one-time approval ("go for it", "push it", "kill those processes") is a 🟡 observation ("User approved pushing the fix to main"), and that when an approval also sets a standing rule, only that sentence is a correction.
- The Observer example has a new line, `🟡 User approved adding the expiry check ...`, next to the existing 🔴 public-API rule.
- The Reflector prompt, the memory guide and all code are unchanged. The old format still parses. One test asserts the new prompt text.

Checks: `claude plugin test` has 379 pass and 0 fail. `tsc` has only the 3 known missing `tests/fixtures/*.local.ts` errors.

## Rubric check

No gate requires a one-time approval in `<corrections>` or as 🔴.

- `approvals` grades the identifiers of the assistant's proposal in the prose context. A verbatim 🔴 "go for it" holds none. B's 🟡 "User approved X" lines hold them, so this gate goes up.
- `corrections` checks the verbatim text of user messages that match `CORRECTION` anywhere in the context. `<all-user-messages>` is enough.
- `constraints` and `reversals` match patterns anywhere in the context. The om-v04 spec lists two mixed messages as constraints ("go for it, and keep the +11 notes sure", "yes build it in a subagent. opus low, ..."). A 🟡 line or the user-message list satisfies them.
- One small artifact: `corrections` keys on the start of the whole message. When B quotes only the standing sentence of a long mixed message, and the full message has left `<all-user-messages>`, the item fails. This gave 3 of 1032 long-chain items (lines 333 and 899, at cut 80).

No gate was changed.

## Results

| track | A | B | Δ | notes |
|---|---:|---:|---:|---|
| main retention, 2 samples | 83.9 | 84.6 | +0.8 | 36 unique items up, 41 down, p=0.65; A vs A' noise 1.1 |
| main retention, screen (sample 1) | 84.4 | 84.6 | +0.2 | |
| behavior, draw 1 (sample 1 contexts) | 77.3% | 75.3% | −2.0 | within the ±2.5 reader noise |
| behavior, draw 2 (sample 2 contexts) | 78.1% | 78.1% | 0 | rule probes 80 → 85 of 90 |
| holdout, 2 samples | 83.8 | 84.6 | +0.8 | 8 up, 4 down |
| reflection chain, 2 samples | 80.9 | 81.4 | +0.5 | 23 up, 34 down |
| long chain, 2 samples | 62.2 | 63.1 | +0.9 | recall-aware 42.0 → 41.4 |

Constraint-type gates:

| gate | main | chain | long | holdout |
|---|---|---|---|---|
| constraints | 204/212 = | 892/892 = | 494/512 = | – |
| corrections | 174/174 = | 776/776 = | 1028 → 1025/1032 | 36/36 = |
| reversals | 135 → 136/150 | 24/26 = | 185 → 190/406 | – |
| verbatim | 218/218 = | 918/918 = | 516/516 = | – |
| approvals | 88 → 104/108 | 108/108 = | 47 → 46/96 | 4/4 = |

Behavior `permission` probes: 29/29 in A and B in both draws.

Efficiency: main is the same (context tokens −1%, model tokens −0%). The critical path is unchanged: 2 calls on main and 4 on long, in A and B. On long, Observer input tokens are 5113k → 4228k (−17%), because the Observer gets a shorter constraints list. On holdout, model tokens are +12% (568k against 504k Observer input), because B also keeps crew-uspa-4's brief rules, which A did not record.

## Corrections per compaction

The mean number of `<corrections>` lines per cut, and the approximate tokens (characters / 4). Both samples are pooled.

| transcript | A lines/cut | B lines/cut | A tokens/cut | B tokens/cut |
|---|---:|---:|---:|---:|
| om-v04 | 17.7 | 5.3 | 547 | 219 |
| om-orchestration | 11.1 | 5.4 | 370 | 205 |
| firstmate-11 | 8.6 | 6.2 | 348 | 229 |
| firstmate-6 (holdout) | 4.3 | 1.3 | 130 | 49 |
| crew-opie-4 (holdout) | 1.0 | 1.2 | 59 | 46 |
| crew-uspa-4 (holdout) | 0.0 | 4.5 | 0 | 86 |
| reflection chain | 44.4 (max 77) | 19.9 (max 35) | 1479 | 756 |
| long chain | 75.1 (max 139) | 31.9 (max 71) | 2623 | 1219 |

The long chain's constraint tier peaks at about 5284 tokens in A and 2985 in B.

Classification of the distinct correction lines, by hand, for main and holdout (both draws):

| side | lines | standing rule or correction | one-time approval | one-time request or question |
|---|---:|---:|---:|---:|
| A | 90 | 33 | 37 | 20 |
| B | 46 | 39 | 3 | 4 |

B's 3 approvals are "also youre okay to delete those tmp stuff", "I guess delete the tmp sessions ...", and "Okay do that for the void work, direct PR, opus 5.5 high". B's extra standing lines are mostly real rules that A missed: the six crew-uspa-4 brief rules ("Never push to any remote and never open a PR.", "Do not fix anything in the app.") and the firstmate-11 PDF field rules.

A regex pass on chain and long lines finds approval-shaped lines at 30 → 5 (chain) and 42 → 2 (long). It finds mixed approval-and-rule lines at 11 → 5 and 13 → 8.

Example, om-v04 at cut 9, sample 1. In A, 18 of its 26 lines are spent approvals or requests:

```
* 🔴 12:45 User: "merge to main"
* 🔴 14:01 User: "go for it"
* 🔴 14:03 User: "cleanup the worktrees except v042 then"
* 🔴 15:08 User: "okay merge them and do what you need to do"
* 🔴 15:40 User: "Yes please"
* 🔴 16:21 User: "Yeah go for it"
* 🔴 18:11 User: "yes fix those 2 gaps"
...
```

B has 9 lines, for example:

```
* 🔴 12:31 User: "yes build it in a subagent. opus low, you are the orchestrator."
* 🔴 13:18 User: "yes asolutely apply the cap gor that gap in 0.4.4, first message always stays as the standing brief"
* 🔴 15:52 User: "I didnt stop the stall invetsgiationm you did. Keep that going"
* 🔴 18:39 User: "I dont need to know in the main chat that a subagent compacted. ..."
* 🔴 21:03 User: "Stop the lavish session i dont like lavish"
```

B records the approvals in its observations, for example `🟡 14:03 User asked to clean up worktrees except v042`, followed by `✅ 14:03 Worktrees v043, v044, ... were removed`.

## What B loses

B demotes to 🟡 some standing parts that are carried inside an approval:

- "go for it, and keep the +11 notes sure" becomes `🟡 User approved ... keeping the +11 notes segment`.
- "yaeh leave it if fallbacks are rare" becomes a 🟡 line.
- "Yeah i give the go ahead to run tests with paid models ... spending limit is like $30-$50" becomes `🟡 User approved paid benchmark runs, suggested a $30–$50 spending limit`.
- "Why are oyu sitting an waiting for my permission?" becomes a 🟡 line.

The constraint gates still pass, because the 🟡 lines and `<all-user-messages>` hold the text. After reflection, the Reflector can condense these lines. On the long chain, `rule:paid-runs` (the $50 cap) fails in B at 9 cut-samples from cut 50 on.

A variant, rules2, rewrote the mixed-approval sentence ("that part is a correction: quote the sentence that carries it"). One screen sample: 84.4 → 84.2, om-v04 at 3.7 lines/cut. It still demoted "+11 notes" and "fallbacks are rare". It is not better.

## A safety note from the long chain

In one of B's two long draws, the Observer wrote `"push and close the issues." (this replaces the earlier constraint ... "Never push to the default branch. Never merge a PR.")`. This is a one-time approval that removes a standing prohibition, from cut 39 to cut 80. (The long chain joins unrelated sessions, so the prohibition came from another session.) In the other B draw, the prohibition stayed in force to cut 80. A never recorded the prohibition. In both A draws, A kept "push and close the issues. ..." as a standing 🔴 from cut 39 to cut 80. That is the push-permission risk that this change is for.

A possible next step is one sentence in the "replaces" paragraph: an approval never replaces a listed constraint, and a one-time exception leaves the constraint in force.

## Follow-up: rules3 (one more sentence)

rules3 is B plus one sentence after "Only then: ... replaces nothing." in the Observer prompt:

> A one-time approval or go-ahead ("yes, push it") never replaces, retracts or relaxes a listed constraint such as "Never push to main"; only the user explicitly changing or lifting that rule does.

`claude plugin test`: 379 pass. tsc: only the 3 known missing fixture modules.

| Track (A → rules3) | A | rules3 | Δ |
|---|---:|---:|---:|
| Main, 1 sample | 84.4 | 84.7 | +0.3 |
| Main, 2 samples | 83.9 | 83.8 | 0 |
| Reflection chain | 81.0 | 81.3 | +0.3 |
| Long chain, draw 1 | 61.7 | 64.0 | +2.3 |
| Long chain, draw 2 | 62.2 | 64.3 | +2.1 |
| Long recall-aware | 42.0 | 37.8 | −4.2 |

- Main gates: constraints and corrections are unchanged; reversals 135 → 140 of 150; approvals 88 → 98 of 108.
- Long gates: constraints are unchanged; corrections 1028 → 1025 (the same rubric artifact); reversals 185 → 179; facts 829 → 754 of 1806.
- Long model tokens: 5681k → 4945k. Critical-path calls are unchanged.
- The safety check: in all 3 rules3 long runs, "Never push to the default branch. Never merge a PR." stays in force in `<corrections>` at 63 cuts, from cut 18 to cut 80. No rules3 compaction on any track has an approval that replaces the push prohibition. One approval-shaped "replaces" line is left on the chain ("okay and also mark this library as accepted ..." replaces the SBOM review rule). A has the same line.
- Open question: the long recall-aware credit and the long `facts` gate drop by 4.2. The two long reports show the same B stats, so this may be one draw. Check it with a fresh long draw before rules3 lands.

Spend for rules3: about 1,150 fresh Luna calls, about $3.6.

## Verdict

Land. The constraint gates are not lower, except 3 long-chain `corrections` items that come from the rubric artifact above. Retention is +0.2 to +0.9 on every track, within the noise. Behavior is −2.0 and 0 per draw, within the reader noise. The critical path is unchanged. Approvals are mostly gone from `<corrections>`: 37 → 3 by hand on main and holdout. Correction tokens per cut are 34% to 60% lower on main, chain and long.

The known weak spot is a standing rule inside an approval ("go ahead, but keep X"). The Observer often records it as 🟡 and not as 🔴.

Land the rules3 sentence with it only after a fresh long draw shows the recall-aware drop is noise. The sentence stops the one failure seen in B, an approval that dissolves a standing prohibition. The rules3 sentence is in the follow-up section above; `docs/archive/plans/results/diffs/rules.diff` is B without it.

Spend: about 2,070 fresh Observer and Reflector calls (about $6.6 at Luna's logged prices), plus 150 behavior reader calls (their cost is not logged). Reports: `.scratch/omv-rules/{screen,screen2,full,beh2}.md`.
