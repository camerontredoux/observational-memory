# phase2-obs: I53 carry-sweep (cached) and the purpose-item check

## I53 carry-sweep

I53 extends I46 clause-line. Before, only reason clauses were carried. Now a sentence qualifies if it has a specific (a number with a unit, a path or file name, a `code` span, $, #NNN, a hash) or a reason marker, and the Observer's lines leave it out. Rules:
- Selection is deterministic, by code, from the chunk's own assistant rows. Each carried sentence is verbatim, inside the source range, as its own `Assistant said:` line placed in time order.
- Scoring: the specifics no line holds ×3, plus new words, plus 2 for a reason marker.
- Skipped: code blocks, tables, headings, quotes, fragments under 6 words, and lead-ins ending in ":".

Every arm is cached against base7 (0 Observer calls, `strict`). Main is graded in full; the holdout uses the mechanical gates only.

| arm | carried per chunk | main | Δ | unique ↑/↓ | p | context | points per 1k tokens | holdout Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| base7 | 0 | 78.3 | | | | 19.2k | | |
| clause-line (I46) | 2 reasons | 80.1 | +1.8 | 7/0 | .016 | +3.9% | 2.41 | +0.1 |
| carry2 | 2 | 80.5 | +2.2 | 14/0 | 1e-4 | +4.7% | 2.39 | +0.1 |
| carry3 / carry3f | 3 | 81.4 | +3.0 | 19/0 | 4e-6 | +6.7% / +6.6% | 2.41 | +0.1 |
| carry5 / carry5f | 5 | 82.9 | +4.6 | 29/0 | 4e-9 | +9.6% / +9.4% | 2.53 | 0 |
| carry8 | 8 | 83.4 | +5.0 | 31/0 | 9e-10 | +13.2% | 1.98 | |
| carry12 | 12 | 83.9 | +5.6 | 37/1 | 3e-10 | +16.6% | 1.75 | |

The "f" arms add the fragment filter. They score the same as the plain arms at slightly lower size, so they are the ones to take. Up to 5 carried sentences, the gain stays linear at ~2.4–2.5 points per 1k tokens. Past 5 it falls off. carry5f is the knee.

Gates that move: multi-hop +1.4, lessons +1.1, rationale +0.8, file-state +0.4. All three transcripts gain (+1.7 / +5.4 / +5.2). No main item is lost at 5 or fewer.

Sample of what carry5 carries (om-v04, cut 9): "It's 14.6k characters, about 3.7k tokens, roughly 2% of the 190k window."; "Size: it leaves 7–21k tokens in context after compaction, versus 13–33k with Luna."; "so that OM still compacts when the newest message is a tool result too big to keep, instead of falling back to the built-in summary." The fragment filter removes the few junk lines, such as "`b8d50671:147`." and "What happened in your crewmate (...):".

Checks: carry5f passes tsc and plugin tests 360/0. Diffs against base7 are at `tmp/i53/carry3f.diff` and `tmp/i53/carry5f.diff`. The dirs are `.scratch/omv/carry{2,3,5,8,12,3f,5f}`.

Not yet measured: these numbers come from the hand-written main rubric, whose items come from assistant statements. So carried verbatim assistant text is exactly what they reward. Before landing, carry5f (and carry3f, the cheaper option) needs a run with behavior probes, chain and long. The reader needs 150 calls, and chain/long need fresh Reflector draws, because the Reflector reads the extra lines. The base7 Reflector-noise run now in progress gives the long noise floor for that run too.

## Purpose items: fair or not?

I compared I26's Session lines (from the session-t9 / session-ctx-a-t9 replays) with each item's expects. I also counted how often the transcripts themselves use each word.

- **om-orchestration** (agent team + ticket/issue + benchmark): fair. Some Session lines already pass, for example "orchestrating implementation of open tickets #2–#9 with agent teams, … and a paid benchmark comparison". Other lines fail because they drop "agent teams" and say "two-agent reviews" instead.
- **om-v04** (orchestrator + subagent + observational-memory): fair. The user says it in message 2: "yes build it in a subagent. opus low, you are the orchestrator." The Session lines describe the product goal instead of the assistant's role: "improving observational-memory for large coding sessions, especially long crewmate and subagent turns". They never say "orchestrat", and their "subagent" only matches by accident. The rubric defines purpose as goal plus the assistant's role, so the line fails fairly.
- **firstmate-11** (firstmate + crewmate + oasis/opie + gorman/sbom/uspa/line item): half fair. Every Session line says "Supervising the Firstmate fleet across the Oasis Opie and USPA projects". That covers 3 of the 4 groups, but the lines say "fleet", never "crewmate". In the transcript, "fleet" (1,296) is more common than "crewmate" (1,165). I propose adding 'fleet' to the crewmate group. It is the transcript's own main term for the same thing, not a word I invented. But it is also a word I26 uses, so under your earlier rule this is your call.

What would get the line written in base7? base7 has no line that states the goal. The gap analysis found all the purpose tokens are in the context, just scattered across lines. Two options, both cheap:
1. Bring back I26's Session field alone (about 100 tokens, under 0.5% context), and require the role in the user's own words: "Session: the overall goal and the assistant's role in it, in the user's words (e.g. who it orchestrates or supervises)." That would add "orchestrator" for om-v04 and keep "agent teams" for om-orchestration. firstmate-11 passes only if 'fleet' is accepted. I26 was rejected together with I27a (retention −0.6, behavior +2.7) and was never screened alone. session-t9 is already built on base5.
2. Carry by code the user's first sentence that states the role or goal, as a pinned "User said:" line. This is deterministic, but it misses om-v04, where the brief sits in a handoff file.

My recommendation is (1), screened alone on base7 with the role wording: 1 sample, main + holdout + behavior. Purpose's gate weight is 5, and the gap analysis puts 3.4 points there.
