# Benchmark baselines

Each baseline is one run of the continuation-quality benchmark (`scripts/bench-live.ts`). It has two files:

- `<date>-<version>.jsonl`: one scored record per live run.
- `<date>-<version>.md`: the report made from those records.

To compare a change against a baseline:

1. Run the benchmark on the change with its own version label, so its runs stay apart from the baseline's `new`:
   `bun scripts/bench-live.ts run --version candidate --plugin-root <worktree> ...`
2. Put both result files into one file, and render one report from it:

```sh
cat docs/bench/2026-09-24-v1.0.0.jsonl /tmp/om-bench/results.jsonl > /tmp/om-bench/compare.jsonl
bun scripts/bench-live.ts report --results /tmp/om-bench/compare.jsonl --versions new,candidate
```

## The recall-required scenario

`recall-required` tests `om_recall` after a compaction that Claude Code starts on its own. The v1.0.0 baseline did not
test this: its compactions were manual `/compact` commands at 35k–71k context tokens.

1. `shards.sh` prints 200 shard records once. The continuation later asks for the checksum of one of them.
2. The growth prompt runs `logs.sh`, about 27,600 characters of log per run. `bench-live.ts` sends it again after each
   turn until the transcript has a new `compact_boundary` row, at most 30 times. Before each send it waits
   `--settle-ms` (default 30 s) so the plugin's background work can finish, as it does before a manual `/compact`.
3. The continuation asks for the checksum verbatim.

The run sets no autocompact window. The session compacts at its own threshold: your `autoCompactWindow` in
`~/.claude/settings.json`, or Claude Code's default for the model (about 967k tokens for Sonnet 5). The dry run prints
which threshold applies. The 30 growth prompts add about 250k–350k tokens: enough for a 190k threshold. With a
threshold above that, no compaction happens and the run stops as incomplete.

Each run cost $1.40–$1.67 at a 190k threshold (9 growth prompts, compaction at about 155k tokens). The scenario's per-run ceiling is $5, and the budget reserves it
before each run. Give these runs their own results file (`--results`), so that the baseline's runs do not use the
budget:

```sh
bun scripts/bench-live.ts run --config om+recall --version new --scenario recall-required --run 1 --pane <pane> \
  --budget-usd 50 --results /tmp/om-bench/recall-required.jsonl --dry-run
```

Remove `--dry-run` to start the run. The report shows honest abstention ("I cannot find it") in its own table. It is
not task success.

## Record paths

The records keep the local paths of their run directories and transcripts. Those files are not in the repository, so
`bench-live.ts score` cannot rescore a baseline on another machine.

## 2026-09-24, v1.0.0

- 127 live runs in real Claude Code sessions (Sonnet 5), driven through herdr panes. Token-equivalent cost: $47.82.
- Plugin versions: `old` is v0.4.15 (`c6c86a3`). `new` is v1.0.0 (`5c2f030`).
- Configurations: built-in and built-in+recall on `old` only; om and om+recall on `old` and `new`.
- Scored with the checks at `5318e8c`.

Limits of this baseline:

- `om_recall` was called in no run, so each "+recall" configuration behaved as its twin without recall.
- No reflection ran, so the Reflector is not tested.
- Every om run observed the whole conversation at `/compact` (`compaction.notPersistent`). Its compaction times are the
  slow path. In normal sessions, compaction mostly uses the background observations.
- A run whose conversation fits in the raw tail falls back to the built-in compaction and is invalid. This happened in
  7 of 43 `old` om runs and 7 of 42 `new` om runs. See `TODO.md`.
- The report says "not run" for `new` om+recall `omitted-identifier`. All 3 of those runs ran and were invalid. The
  report now says "0 of 3 valid" for such a cell.

## 2026-09-24, recall-required

- 12 live runs of `recall-required` (Sonnet 5): 3 each of built-in, built-in+recall, om and om+recall, all on v1.0.0
  (`7f84e06`). Token-equivalent cost: $17.76.
- Every run was valid. Each compacted on its own at about 155k tokens (`autoCompactWindow: 190000`).
- Task success: om+recall 1 of 3; built-in, built-in+recall and om 0 of 3. No run invented a checksum. Every run that
  failed said honestly that it could not give the checksum.

What it shows:

- `om_recall` works when called. The one success searched for `shard-101` and returned the checksum verbatim.
- The model rarely calls it. In 5 of the 6 runs that offered `om_recall`, the model did not call it and said the
  shard audit had printed only its summary line.
- Both summaries cause this. The om memory said only that `shards.sh` "reported `audit complete: 200 shards
  verified`", and the built-in summary did the same. The om memory was the same in all three om+recall runs, so the
  one success was the model's choice, not a better memory.
- Scored with the checks at the commit that adds this section: the first abstention pattern missed "I don't actually
  have that", and was widened.

## 2026-09-24, v1.1.0 recall-required

- 9 live runs of `recall-required` (Sonnet 5) on v1.1.0 (`7bec0a9`), labelled `candidate`: 6 om+recall and
  3 built-in+recall. Token-equivalent cost: $15.65. The report sets them beside the v1.0.0 runs above.
- Every run was valid and compacted on its own at a 190k threshold.
- Task success: om+recall 6 of 6 (v1.0.0: 1 of 3); built-in+recall 3 of 3 (v1.0.0: 0 of 3).

What it shows:

- Every run called `om_recall` exactly once after compaction, with no ToolSearch call before it. The pin from #11
  works live: the tool is in the list once the session has compacted.
- The memory did not change. In all 6 om+recall runs it still said only that `shards.sh` reported `audit complete: 200
  shards verified`: the Observer's new rule for listed records did not fire here. The gain came from the tool being
  visible and the recall note at the end of the memory, and it carries to the built-in summary, which has the same
  tool and note.
- 3 and 6 runs are small samples. They show the change, not a rate.
