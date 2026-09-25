## observer lane: cutting the purpose items to 2–3 groups fails the controls; items kept as they are

I tried cutting each item using only the transcripts' own goal words, with no Session-line wording. For each version I checked every cached context in .scratch/bench-compact/runs (~7k contexts, all variants), counting a line only if it is at most 600 chars:

| item | cut | own-transcript passes | cross-transcript passes |
|---|---|---:|---:|
| om-v04 | orchestrat*/subagent + observational-memory (2 groups) | 956/2549 | 1442/1442 om-orchestration (path `…/observational-memory/…/om-orchestration.jsonl` in the recall line) |
| om-orchestration | agent team(s) + ticket(s)/issue(s) (2 groups) | 1442/1442 | 0 |
| firstmate-11 | firstmate + project name (2 groups) | 2538/3115 | 1153/2549 om-v04 |
| firstmate-11 | firstmate + crewmate(s) (2 groups) | 315/3169 (a skill path) | 2301/2592 om-v04 |
| firstmate-11 | crewmate(s) + project name (2 groups) | 1980/3197 | 125/2613 om-v04 |
| firstmate-11 | firstmate + crewmate(s) + project (3 groups) | 0/3121 | 0 |
| current items (3, 3, 4 groups) | – | om-v04 4/2553, om-orch 12/1444, firstmate 0/3121 | 0 |

- None of the 2-group cuts meets the limit. Each one either passes grp almost everywhere or passes in another transcript, because the project names and tool paths show up in ordinary observation lines.
- Honest finding: for om-orchestration, grp already states the goal. At every cut its memory has "User asked whether the assistant can orchestrate agent teams to implement the repository's open tickets…". So a string item can't separate "states the goal" from what grp already keeps; only the third group (benchmark) does that.
- The only cut that passes the controls, firstmate 4 → 3 groups, still passes 0 everywhere, so it changes no score. I didn't apply it.
- Result: the purpose items stay as they are, with grp's base rate unchanged: om-v04 4/2553, om-orchestration 12/1444, firstmate-11 0/3121, and 0 cross-transcript. I26's 0/24 stands under the string gate, and ctx-a's 6/24 is under the same items. There's nothing to regrade. The --behavior purpose probe is the judge for I26.
- Scripts: ~/.claude/jobs/40c779b6/tmp/purpose/{items2.ts,check2.ts}.
