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
   turn until the transcript has a new `compact_boundary` row, at most 30 times.
3. The continuation asks for the checksum verbatim.

The run sets no autocompact window. The session compacts at its own threshold: your `autoCompactWindow` in
`~/.claude/settings.json`, or Claude Code's default for the model (about 967k tokens for Sonnet 5). The dry run prints
which threshold applies. The 30 growth prompts add about 250k–350k tokens: enough for a 190k threshold. With a
threshold above that, no compaction happens and the run stops as incomplete.

Each run costs about $2–$3.50 at a 190k threshold. The scenario's per-run ceiling is $5, and the budget reserves it
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
