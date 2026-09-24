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
| 1 | 2 | 1/2 (50%) |
| 2 | 11 | 10/11 (91%) |
| 3 | 19 | 13/19 (68%) |
| 4 | 7 | 4/7 (57%) |
| 5 | 22 | 15/22 (68%) |
| all | 61 | 43/61 (70%) |

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
| 1 | 16/25 (64%) | 9/9 (100%) |
| 2 | 18/25 (72%) | 9/9 (100%) |
| 3 | 17/25 (68%) | 9/9 (100%) |
| 4 | 19/25 (76%) | 9/9 (100%) |
| 5 | 18/25 (72%) | 9/9 (100%) |

### Needed identifiers missing (first 12 per configuration)

- recorded: <a session> (@1), /tmp/om-bench/results.jsonl (@2), ~/.claude/debug (@3), $0.37 (@3), $0.41 (@3), ~/.agents/docs/documentation-style.md (@3), docs/agents/issue-tracker.md (@3), docs/agents/triage-labels.md (@3), /tmp/om-bench/batch-wJ2_p (@4), agent/observer/prompt.ts (@4), .claude/types (@4), hooks/stats.ts (@5), and 6 more

### Constraints in force missing

- recorded: none

### Question stage (planned, not run)

8 questions, 5 with an exact-string check and 3 needing a model grader; 33 asks per configuration over the 5 boundaries.

Sources: recorded: the session's own compaction.

## om-v04

13 MB, 9 real compactions at about 159k tokens; 6 constraints, 6 questions.

### Needed identifiers held

| boundary | needed | recorded |
|---:|---:|---:|
| 1 | 8 | 3/8 (38%) |
| 2 | 5 | 5/5 (100%) |
| 3 | 2 | 2/2 (100%) |
| 4 | 11 | 8/11 (73%) |
| 5 | 3 | 3/3 (100%) |
| 6 | 16 | 14/16 (88%) |
| 7 | 12 | 10/12 (83%) |
| 8 | 6 | 5/6 (83%) |
| 9 | 5 | 5/5 (100%) |
| all | 68 | 55/68 (81%) |

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
| 1 | 20/27 (74%) | 1/1 (100%) |
| 2 | 26/27 (96%) | 1/1 (100%) |
| 3 | 24/27 (89%) | 1/1 (100%) |
| 4 | 22/27 (81%) | 1/1 (100%) |
| 5 | 24/27 (89%) | 1/1 (100%) |
| 6 | 21/27 (78%) | 1/1 (100%) |
| 7 | 22/27 (81%) | 1/1 (100%) |
| 8 | 22/27 (81%) | 1/1 (100%) |
| 9 | 22/27 (81%) | 1/1 (100%) |

### Needed identifiers missing (first 12 per configuration)

- recorded: ~/.claude/plugins/store/observational-memory_inline- (@1), $0.0029 (@1), $0.0034 (@1), $0.0016 (@1), $0.0015 (@1), <a session> (@4), <a session> (@4), turn.start/turn.complete (@4), <a session> (@6), ~/.claude/settings.json (@6), /tmp/pj (@7), /tmp/cmp2/probes (@7), and 1 more

### Constraints in force missing

- recorded: none

### Question stage (planned, not run)

6 questions, 4 with an exact-string check and 2 needing a model grader; 30 asks per configuration over the 9 boundaries.

Sources: recorded: the session's own compaction.

## firstmate-11

20 MB, 11 real compactions at about 160k tokens; 8 constraints, 3 questions.

### Needed identifiers held

| boundary | needed | recorded |
|---:|---:|---:|
| 1 | 0 | – |
| 2 | 6 | 4/6 (67%) |
| 3 | 12 | 3/12 (25%) |
| 4 | 8 | 4/8 (50%) |
| 5 | 6 | 4/6 (67%) |
| 6 | 3 | 1/3 (33%) |
| 7 | 1 | 1/1 (100%) |
| 8 | 1 | 1/1 (100%) |
| 9 | 3 | 2/3 (67%) |
| 10 | 4 | 1/4 (25%) |
| 11 | 2 | 2/2 (100%) |
| all | 46 | 23/46 (50%) |

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
| 1 | 10/14 (71%) | – |
| 2 | 6/14 (43%) | – |
| 3 | 7/14 (50%) | – |
| 4 | 9/14 (64%) | – |
| 5 | 10/14 (71%) | – |
| 6 | 10/14 (71%) | – |
| 7 | 10/14 (71%) | – |
| 8 | 8/14 (57%) | – |
| 9 | 8/14 (57%) | – |
| 10 | 9/14 (64%) | – |
| 11 | 12/14 (86%) | – |

### Question stage (planned, not run)

3 questions, 3 with an exact-string check and 0 needing a model grader; 12 asks per configuration over the 11 boundaries.

Sources: recorded: the session's own compaction.
