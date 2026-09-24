# Retention over many real compactions

Scored with no model. "recorded" is the session's own compaction as it ran (the plugin version the session had);
the others are chained replays at the same boundaries. A needed identifier is one the assistant used after the
boundary, first seen before it, not kept raw by the session's own compaction, and not shown again before that use.
The +recall configurations differ only at the question stage, which is planned and not run.

## om-orchestration

11 MB, 5 real compactions at about 158k tokens; 10 constraints, 8 questions.

### Needed identifiers held

| boundary | needed | recorded |
|---:|---:|---:|
| 1 | 0 | – |
| 2 | 10 | 9/10 (90%) |
| 3 | 17 | 14/17 (82%) |
| 4 | 7 | 4/7 (57%) |
| 5 | 21 | 15/21 (71%) |
| all | 55 | 42/55 (76%) |

### Constraints in force held

| boundary | in force | recorded held | stale |
|---:|---:|---:|---:|
| 1 | 9 | 9/9 (100%) | 0/0 |
| 2 | 9 | 9/9 (100%) | 0/0 |
| 3 | 9 | 9/9 (100%) | 0/0 |
| 4 | 10 | 10/10 (100%) | 0/0 |
| 5 | 10 | 10/10 (100%) | 0/0 |

### Drift: what was known before boundary 1

| boundary | recorded ids | recorded constraints |
|---:|---:|---:|
| 1 | 15/22 (68%) | 9/9 (100%) |
| 2 | 17/22 (77%) | 9/9 (100%) |
| 3 | 16/22 (73%) | 9/9 (100%) |
| 4 | 18/22 (82%) | 9/9 (100%) |
| 5 | 17/22 (77%) | 9/9 (100%) |

### Needed identifiers missing (first 12 per configuration)

- recorded: /tmp/om-bench/results.jsonl (@2), $0.41 (@3), docs/agents/issue-tracker.md (@3), docs/agents/triage-labels.md (@3), /tmp/om-bench/batch-wJ2_p (@4), agent/observer/prompt.ts (@4), .claude/types (@4), hooks/stats.ts (@5), $1.50 (@5), /tmp/om-bench/jobs- (@5), /tmp/om-bench/batch-wJ2_p (@5), /tmp/om-bench/batch-wJ2_pE.log (@5), and 1 more

### Constraints in force missing

- recorded: none

### Question stage (planned, not run)

8 questions, 5 with an exact-string check and 3 needing a model grader; 33 asks per configuration over the 5 boundaries.

Sources: recorded: the session's own compaction.

## om-v04

13 MB, 9 real compactions at about 159k tokens; 6 constraints, 7 questions.

### Needed identifiers held

| boundary | needed | recorded |
|---:|---:|---:|
| 1 | 7 | 3/7 (43%) |
| 2 | 3 | 3/3 (100%) |
| 3 | 2 | 2/2 (100%) |
| 4 | 8 | 6/8 (75%) |
| 5 | 1 | 1/1 (100%) |
| 6 | 11 | 11/11 (100%) |
| 7 | 11 | 9/11 (82%) |
| 8 | 4 | 4/4 (100%) |
| 9 | 3 | 3/3 (100%) |
| all | 50 | 42/50 (84%) |

### Constraints in force held

| boundary | in force | recorded held | stale |
|---:|---:|---:|---:|
| 1 | 1 | 1/1 (100%) | 0/0 |
| 2 | 2 | 2/2 (100%) | 0/0 |
| 3 | 3 | 3/3 (100%) | 0/0 |
| 4 | 3 | 3/3 (100%) | 0/0 |
| 5 | 3 | 3/3 (100%) | 0/0 |
| 6 | 3 | 3/3 (100%) | 0/0 |
| 7 | 3 | 3/3 (100%) | 0/0 |
| 8 | 5 | 5/5 (100%) | 0/0 |
| 9 | 6 | 6/6 (100%) | 0/0 |

### Drift: what was known before boundary 1

| boundary | recorded ids | recorded constraints |
|---:|---:|---:|
| 1 | 16/22 (73%) | 1/1 (100%) |
| 2 | 21/22 (95%) | 1/1 (100%) |
| 3 | 20/22 (91%) | 1/1 (100%) |
| 4 | 18/22 (82%) | 1/1 (100%) |
| 5 | 20/22 (91%) | 1/1 (100%) |
| 6 | 18/22 (82%) | 1/1 (100%) |
| 7 | 18/22 (82%) | 1/1 (100%) |
| 8 | 18/22 (82%) | 1/1 (100%) |
| 9 | 18/22 (82%) | 1/1 (100%) |

### Needed identifiers missing (first 12 per configuration)

- recorded: $0.0029 (@1), $0.0034 (@1), $0.0016 (@1), $0.0015 (@1), b776c4b (@4), turn.start/turn.complete (@4), /tmp/pj (@7), /tmp/cmp2/probes (@7)

### Constraints in force missing

- recorded: none

### Question stage (planned, not run)

7 questions, 5 with an exact-string check and 2 needing a model grader; 39 asks per configuration over the 9 boundaries.

Sources: recorded: the session's own compaction.

## firstmate-11

20 MB, 11 real compactions at about 160k tokens; 8 constraints, 3 questions.

### Needed identifiers held

| boundary | needed | recorded |
|---:|---:|---:|
| 1 | 0 | – |
| 2 | 7 | 5/7 (71%) |
| 3 | 11 | 2/11 (18%) |
| 4 | 5 | 3/5 (60%) |
| 5 | 6 | 5/6 (83%) |
| 6 | 2 | 0/2 (0%) |
| 7 | 1 | 1/1 (100%) |
| 8 | 1 | 1/1 (100%) |
| 9 | 2 | 2/2 (100%) |
| 10 | 4 | 1/4 (25%) |
| 11 | 2 | 2/2 (100%) |
| all | 41 | 22/41 (54%) |

### Constraints in force held

| boundary | in force | recorded held | stale |
|---:|---:|---:|---:|
| 1 | 0 | – | 0/0 |
| 2 | 0 | – | 0/0 |
| 3 | 0 | – | 0/0 |
| 4 | 0 | – | 0/0 |
| 5 | 1 | 1/1 (100%) | 0/1 |
| 6 | 2 | 2/2 (100%) | 0/1 |
| 7 | 2 | 2/2 (100%) | 0/1 |
| 8 | 3 | 3/3 (100%) | 0/1 |
| 9 | 4 | 4/4 (100%) | 0/1 |
| 10 | 7 | 7/7 (100%) | 0/1 |
| 11 | 7 | 7/7 (100%) | 0/1 |

### Drift: what was known before boundary 1

| boundary | recorded ids | recorded constraints |
|---:|---:|---:|
| 1 | 10/13 (77%) | – |
| 2 | 7/13 (54%) | – |
| 3 | 8/13 (62%) | – |
| 4 | 10/13 (77%) | – |
| 5 | 11/13 (85%) | – |
| 6 | 11/13 (85%) | – |
| 7 | 11/13 (85%) | – |
| 8 | 10/13 (77%) | – |
| 9 | 9/13 (69%) | – |
| 10 | 9/13 (69%) | – |
| 11 | 11/13 (85%) | – |

### Question stage (planned, not run)

3 questions, 3 with an exact-string check and 0 needing a model grader; 12 asks per configuration over the 11 boundaries.

Sources: recorded: the session's own compaction.
