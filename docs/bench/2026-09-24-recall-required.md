# Continuation-quality benchmark

Live runs: 12. Offline runs: 0. Live and offline runs are reported apart and never pooled.

Scoring: deterministic checks (regular expressions over the replies and tool calls after the continuation prompt, and over what om_recall returned); no model grading was used. A transport or prompt-format success is not a task success: a run that did not complete, or is invalid, never counts as one.
Cost: token-equivalent, an estimate: each assistant message's exact usage times PRICES_USD_PER_MTOK in tests/eval/bench.ts (sonnet $3/$15 in/out, $0.3 cache read, $3.75–$6 cache write; haiku $1/$5 in/out, $0.1 cache read, $1.25–$2 cache write; opus $5/$25 in/out, $0.5 cache read, $6.25–$10 cache write per million tokens). The memory model is the plugin's own Observer and Reflector, as its stats file measured it. The built-in compactor's own request is not a transcript message: a built-in run's cost includes it only through the host's cost-state record, so without one it leaves compaction out while an observational run's includes the Observer. Latencies are measured: the host's compaction duration and the transcript's timestamps.
Models that answered: claude-sonnet-5 (sessions started with sonnet).
Plugin version new: commit 7f84e06881a5e70a3cb96afefab0638527e71497.

## Live runs

### Per plugin version and configuration

Each measure over the valid runs: mean ± sample standard deviation [min–max], or the value alone for one run.

| version | configuration | runs | valid | task success | correctness | violations | repeated work | unsupported claims | recall calls | recall hits | recall result tokens (estimated) | cost (USD, estimated) | memory model (USD, measured) | reflections (measured) | compaction ms (measured) | continuation ms (measured) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| new | builtin | 3 | 3 | 0% | 0% ± 0% [0%–0%] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | – | 0 ± 0 [0–0] | 1.4367 ± 0.0070 [1.4291–1.4429] | 0.0000 ± 0.0000 [0.0000–0.0000] | – | 28811 ± 11770 [18492–41631] | 5033 ± 3398 [3011–8956] |
| new | builtin+recall | 3 | 3 | 0% | 0% ± 0% [0%–0%] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | – | 0 ± 0 [0–0] | 1.4152 ± 0.0247 [1.4003–1.4437] | 0.0000 ± 0.0000 [0.0000–0.0000] | – | 28042 ± 4674 [22869–31962] | 4090 ± 423 [3603–4363] |
| new | om | 3 | 3 | 0% | 0% ± 0% [0%–0%] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | – | 0 ± 0 [0–0] | 1.5044 ± 0.0448 [1.4749–1.5559] | 0.0131 ± 0.0005 [0.0125–0.0135] | 0.00 ± 0.00 [0.00–0.00] | 87 ± 2 [85–88] | 4059 ± 2474 [1869–6743] |
| new | om+recall | 3 | 3 | 33% | 33% ± 58% [0%–100%] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | 0.00 ± 0.00 [0.00–0.00] | 0.33 ± 0.58 [0.00–1.00] | 1/1 | 53 ± 91 [0–158] | 1.5625 ± 0.0944 [1.4999–1.6711] | 0.0141 ± 0.0023 [0.0124–0.0167] | 0.00 ± 0.00 [0.00–0.00] | 88 ± 1 [87–89] | 6410 ± 5328 [3066–12554] |

Highest task success (live, new): om+recall 33% (3 of 3 runs valid); builtin 0% (3 of 3 runs valid); builtin+recall 0% (3 of 3 runs valid); om 0% (3 of 3 runs valid).

### Task success per scenario

Successful runs out of valid runs.

| scenario | new builtin | new builtin+recall | new om | new om+recall |
|---|---|---|---|---|
| recall-required | 0/3 | 0/3 | 0/3 | 1/3 |

### Honest abstention

Not task success: of the valid runs that did not give the answer, how many said they could not find it (a regular expression over the reply; the failed-checks list keeps the replies that read as neither).

| scenario | new builtin | new builtin+recall | new om | new om+recall |
|---|---|---|---|---|
| recall-required | 3 of 3 | 3 of 3 | 3 of 3 | 2 of 2 |

### What carried each fact through observational compaction

How many of the valid runs' compactions held each scenario fact in their memory message, by part (observations, corrections, all-user-messages, skills, ...), and how often a single part alone held it. This measures the overlap between the memory's protections; none is removed to measure it.

| version | configuration | scenario | fact | compactions holding it | by part | by one part alone |
|---|---|---|---|---|---|---|
| new | om | recall-required | ck-d3e5a2bc17ea3a55 | 0 of 3 | – | – |
| new | om+recall | recall-required | ck-d3e5a2bc17ea3a55 | 0 of 3 | – | – |

### Failed checks, with evidence

- recall-required.om-recall.new.r1 (om+recall, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-om-recall-new-r1-project/1617ef2c-2c5c-4b1f-93cc-961d88fc2004.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that. The only output I captured from `shards.sh` was the final summary line — `audit complete: 200 shards verified` — not per-shard checksums, so shard-101's checksum never appeared in what I saw.
  
  Since you've told me not to rerun `shards.sh` or read outside this project, I don't have..."
- recall-required.om-recall.new.r1 (om+recall, new, recall-required): called-recall [retrieval]: called om_recall. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-om-recall-new-r1-project/1617ef2c-2c5c-4b1f-93cc-961d88fc2004.jsonl
  Evidence: no call to /^mcp__observational-memory__om_recall$/ among 0 tool call(s)
- recall-required.om.new.r3 (om, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-om-new-r3-project/c1f58e96-1e21-4638-b4a8-2ab90585a3d6.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that. The shards.sh run earlier only reported a summary line — "audit complete: 200 shards verified" — not per-shard checksums, and I wasn't told to capture its full output at the time.
  
  Since you've said not to run shards.sh again, I can't get it that way. If there's a log file or outp..."
- recall-required.om-recall.new.r2 (om+recall, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-om-recall-new-r2-project/33beb318-42b6-46bc-b273-e0e568f007fd.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that. I only ran `bash shards.sh` once earlier, and it printed a summary line — `audit complete: 200 shards verified` — not per-shard checksums. Nothing in my session output shows a checksum for shard-101, and per your instruction I won't rerun shards.sh or read files outside this proje..."
- recall-required.om-recall.new.r2 (om+recall, new, recall-required): called-recall [retrieval]: called om_recall. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-om-recall-new-r2-project/33beb318-42b6-46bc-b273-e0e568f007fd.jsonl
  Evidence: no call to /^mcp__observational-memory__om_recall$/ among 0 tool call(s)
- recall-required.builtin-recall.new.r1 (builtin+recall, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-recall-new-r1-project/83fafd3f-8547-428f-8fdb-129a77912369.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that. My earlier `shards.sh` run only had me report the one-line summary ("audit complete: 200 shards verified") — I never captured or saw a per-shard checksum for shard-101, and I don't have it stored anywhere else in this project. Since you've ruled out rerunning the script, I can't g..."
- recall-required.builtin-recall.new.r1 (builtin+recall, new, recall-required): called-recall [retrieval]: called om_recall. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-recall-new-r1-project/83fafd3f-8547-428f-8fdb-129a77912369.jsonl
  Evidence: no call to /^mcp__observational-memory__om_recall$/ among 0 tool call(s)
- recall-required.builtin-recall.new.r2 (builtin+recall, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-recall-new-r2-project/93646f75-6202-4e9b-bf36-5aec57b81c81.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that — the full shard-by-shard output from that earlier `shards.sh` run wasn't kept; only the format and the final summary line ("audit complete: 200 shards verified") survived into my context. I don't have shard-101's checksum stored anywhere.
  
  Since you've said not to rerun `shards.sh..."
- recall-required.builtin-recall.new.r2 (builtin+recall, new, recall-required): called-recall [retrieval]: called om_recall. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-recall-new-r2-project/93646f75-6202-4e9b-bf36-5aec57b81c81.jsonl
  Evidence: no call to /^mcp__observational-memory__om_recall$/ among 0 tool call(s)
- recall-required.builtin.new.r1 (builtin, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-new-r1-project/d372b83a-e8d3-4749-8c3a-c17507f29fa9.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that — the earlier `shards.sh` run's full output isn't in my context (the summary I have only kept the final line, "audit complete: 200 shards verified," not the per-shard details). I can't get the shard-101 checksum without re-running the script, and you've said not to do that.
  
  If you..."
- recall-required.om.new.r1 (om, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-om-new-r1-project/b5af32a5-7ab9-40a8-988b-657e9b7e2dee.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that. Earlier, `bash shards.sh` printed only a one-line summary — "audit complete: 200 shards verified" — not per-shard checksums, and I haven't seen shard-101's checksum in this session anywhere.
  
  Since you've told me not to run `shards.sh` again or read outside this project, I can't g..."
- recall-required.builtin-recall.new.r3 (builtin+recall, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-recall-new-r3-project/e6b5d713-2681-4832-962f-6a878b29b0c8.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that checksum. The full shards.sh output was compacted out of my context — I only kept a summary noting it verified 200 shards, not the per-shard checksum lines. I can't reconstruct shard-101's checksum from memory, and you've ruled out rerunning the script or reading other files, so I ..."
- recall-required.builtin-recall.new.r3 (builtin+recall, new, recall-required): called-recall [retrieval]: called om_recall. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-recall-new-r3-project/e6b5d713-2681-4832-962f-6a878b29b0c8.jsonl
  Evidence: no call to /^mcp__observational-memory__om_recall$/ among 0 tool call(s)
- recall-required.builtin.new.r2 (builtin, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-new-r2-project/1098cd65-c0f3-417f-9ec6-67814028cd41.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't actually have that — the earlier `shards.sh` run only came through to me as a summary ("audit complete: 200 shards verified"), not the per-shard output, so I never saw a checksum for shard-101 specifically.
  
  Since you asked me not to rerun `shards.sh`, I can't get it right now. If you want i..."
- recall-required.om.new.r2 (om, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-om-new-r2-project/6fc73e4a-e87f-4753-9ffb-a8ced08c65d6.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that. My earlier run of `shards.sh` only returned the summary line "audit complete: 200 shards verified" — I never saw a per-shard checksum for shard-101, and there's no log file in this project directory that captured the full output (just `logs.sh`, `shards.sh`, `.logs-part`, and an e..."
- recall-required.builtin.new.r3 (builtin, new, recall-required): exact-checksum [correctness]: gives the checksum verbatim. Transcripts: /home/cameron/.claude/projects/-tmp-om-bench-recall-required-builtin-new-r3-project/f3892426-7dae-4fec-a824-59144da428d5.jsonl
  Evidence: no match for /ck-d3e5a2bc17ea3a55/ in the reply: "I don't have that — the earlier run of `shards.sh` only had me report the final summary line ("audit complete: 200 shards verified"), not the per-shard checksum output. I never captured shard-101's line specifically, and I don't want to guess or fabricate a checksum.
  
  Since you don't want me to run ..."

## Not run, or no valid run

- new builtin reversed-constraint: not run live
- new builtin completed-work: not run live
- new builtin failure-in-long-output: not run live
- new builtin omitted-identifier: not run live
- new builtin pending-approval: not run live
- new builtin absent-fact: not run live
- new builtin repeated-compaction: not run live
- new builtin+recall reversed-constraint: not run live
- new builtin+recall completed-work: not run live
- new builtin+recall failure-in-long-output: not run live
- new builtin+recall omitted-identifier: not run live
- new builtin+recall pending-approval: not run live
- new builtin+recall absent-fact: not run live
- new builtin+recall repeated-compaction: not run live
- new om reversed-constraint: not run live
- new om completed-work: not run live
- new om failure-in-long-output: not run live
- new om omitted-identifier: not run live
- new om pending-approval: not run live
- new om absent-fact: not run live
- new om repeated-compaction: not run live
- new om+recall reversed-constraint: not run live
- new om+recall completed-work: not run live
- new om+recall failure-in-long-output: not run live
- new om+recall omitted-identifier: not run live
- new om+recall pending-approval: not run live
- new om+recall absent-fact: not run live
- new om+recall repeated-compaction: not run live

## Scenario limits

- recall-required: It needs a compaction Claude Code starts on its own, at the session's threshold: a run whose threshold the growth prompts do not reach stops incomplete. Nothing stops the session from searching its own transcript files (under ~/.claude/projects) with Read, Grep or Glob; the continuation forbids it, and a run that does fails no-transcript-read, a violation. An abstention is a regular expression over the reply: an unusual wording reads as none. The evidence keeps the reply.
