## observer lane: I27a confirmation, s2 of ctx-a/think/grp-obs2, batch3 (details/span/target on fail11)

These are pre-revfix rubric scores (the runs started before the patch). A and B are comparable within each run.

### I27a
- Important: builder-obs's session-ctx-a on fail11 made 0 fresh main-corpus Observer calls. The grp→fail11 changes (mask, I10) don't touch the Observer input, so it reused /tmp/omv/ctx-a's sample-1 replies. Its fail11 main score of +2.2 (verdict B) is the SAME draw as the grp screen, not a second sample.
- Independent draws of I26+I27a (session+ctx-a), main corpus vs grp: s1 +1.7, s2 +0.9 (mean +1.3). The holdout on fail11 was fresh: +0.3 (8↑ 7↓).
  - multi-hop replicates: 16→24 and 17→27 of 44. rationale: 21→28 and 18→23 of 55.
  - file-state moves around: +1 in s1, 46→33 in s2. purpose: 6/24 in s1, 0/24 in s2.
- I27a without I26 (omv-build/ctx-a, fresh): main -0.4, holdout -0.3. multi-hop 16→19 and rationale 20→21 only, reversals 58→51. With a single draw each, the gain appears only with the Session line and the reframe together (I26 alone was -0.6).
- Running now: --behavior + chain for session-ctx-a vs fail11 (/tmp/obs-bench2/.scratch/runs/ab-i27a-behavior-chain.*), under the revfix rubric. Its main corpus is the cached draw again, so the new information is the behavior probes and the chain.

### s2 closes (two samples each, vs grp)
- I16 think: -0.9, +1.5 (mean +0.3) → noise, reject.
- grp-obs2: 0.0, +1.2 (mean +0.6) → noise, reject.

### batch3 on fail11 (s1, pre-revfix)
| arm | Δ | p | context | read |
|---|---:|---:|---|---|
| I21 target | **+2.4** | 0.0027 | **+16%** (tradeoff) | file-state 46→62, facts 124→135, multi-hop 16→24, rationale 20→25; approvals and constraints lose like every fresh arm |
| I19 span (7k chunks) | +0.5 | 0.029 | +10%, -0.7 critical-path calls | identifiers 98→116, multi-hop +7; file-state 46→40 |
| I18 details | -0.3 | 0.80 | same | noise, reject |
- target: s2 + holdout are recording now (<worktree>/.scratch/runs/ab-target-s2.*, revfix rubric). Its quality gain is the biggest so far, but its +16% context means it needs a saving to land (the queue pairs it with I17/I19). Next I'll check a sample of its replies for padding.
