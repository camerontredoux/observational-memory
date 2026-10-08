## Codebase

A Claude Code function-hooks plugin that replaces compaction with observational memory.

### Layout

- `hooks/register.ts` registers every hook. It holds the ledger, the background observation and reflection, and compaction. `hooks/hooks.json` lists the events it handles. Its `$`-free helpers live in plain modules: `hooks/rows.ts` reads the session's rows and cuts the raw tail a compaction keeps, and `hooks/pins.ts` bounds the pinned lines to their cap.
- `hooks/memory.ts` renders the memory message and reads it back at the next compaction. It also holds the constraint format that the memory message shares with the Observer's and Reflector's replies.
- `hooks/lines.ts` holds the observation line format: its marker, timestamp and source trailer, as the ledger, the memory message, the model replies, the notes pane and recall write and read it.
- `hooks/recall.ts` is the `om_recall` tool. `hooks/stats.ts` is `om_stats` and `/om-stats`. `hooks/prune.ts` prunes old sessions from `$.store`.
- `hooks/prompts.ts` holds the model prompts and the compaction texts. The Observer and Reflector prompts are the plugin's own; edit them there. Its header names the texts copied from other sources. Copy those again from their source rather than editing them.
- `.claude/types/` holds the plugin API types. Do not edit them. They are copies of what Claude Code writes to the gitignored `.claude-plugin/types/` each time it loads the mod: `claude-code.d.ts` is `claude-code/index.d.ts` then `claude-code-tools/index.d.ts`, and `claude-code-mcp.d.ts` is `claude-code-mcp/index.d.ts`. Copy them again after a Claude Code update.
- `scripts/` holds developer tools. They are not part of the plugin. Each file's header gives its usage.
- `tests/eval/runner.ts` replays one scenario through the four configurations built-in, built-in+recall, om, and om+recall compaction, and records reproducible, machine-readable measurements of what each cost (not how good its output was: that is the continuation-quality benchmark). Its header gives its usage and the live-transport limitation.
- The continuation-quality benchmark: `tests/eval/scenarios.ts` holds its scenarios, `tests/eval/bench.ts` scores a run's transcript and renders the report, `tests/eval/live.ts` plans a live run, and `scripts/bench-live.ts` drives one in a herdr pane (its header gives the usage). `tests/eval/recall-plugin/` is the evaluation-only plugin with `om_recall` alone, for the built-in+recall configuration. `docs/bench/` keeps past results as baselines.
- Retention over many real compactions: `tests/eval/replay.ts` cuts a long real transcript at its own compaction points, chains each configuration's compaction through them and scores what each compacted context holds, with no model. `tests/eval/replay-specs/` holds the constraint lists and questions for the committed transcripts. `scripts/bench-replay.ts` runs the replays, the dry run and the report (its header gives the usage).
- The compaction A/B benchmark: `scripts/bench-compact.ts` replays a fixed local corpus of real transcripts through one plugin version (`run`) or two (`ab`), from cached Observer/Reflector replies, and grades every compacted context against the weighted gates in `tests/eval/rubric.ts`, with an efficiency scorecard (size, reduction, model tokens, critical-path calls) kept apart from the quality total; with `--behavior`, a Luna reader also answers probes on each context, graded by `tests/eval/behavior.ts`; `tests/eval/report.ts` renders its cards and A/B tables. A four-session chain, the one track where the Reflector runs, is graded apart; `--long` chains 13 sessions a day apart through 80 compactions and reports recall-aware credit apart from the totals (the script's header gives the usage).

### Code rules

- The engine does not let `$` cross an import. A helper module takes plain I/O functions from its caller, as `recall.ts` takes `RecallIo` and `stats.ts` takes `Io`.
- `claude plugin test` does not import a module over 1 MiB. Keep each fixture module under that limit. `scripts/make-recall-fixture.ts` shows how to trim one. Nor does it load a module holding `import()`.

### Checks

- Tests: `claude plugin test`. The hook tests are split by area into `tests/register-*.test.ts`, which share the fakes in `tests/harness.ts`.
- Types: `bunx -p typescript tsc -p .`.
- The replay tests in `tests/replays.ts` take `tests/fixtures/*.local.ts` modules built from private transcripts. Each test's comment names the script that writes its module. The test runner loads no module holding `import()`, so `bun scripts/wire-fixtures.ts` writes `tests/fixtures.local.test.ts`, which imports the modules present and runs their tests; the scripts that write a module run it. Without a module, its test does not run. Keep these modules and that file local; they are gitignored.

### Deploy

This repo is the source. Claude Code loads the installed copy at `~/.claude/skills/observational-memory`. Never edit the installed copy.

1. Run the checks.
2. Run `bun scripts/deploy.ts`. It runs the type check and `claude plugin validate .`, then copies the shipped files to the installed copy. A running session reloads it. A deploy copies nothing when a check fails.

### Releases

A user-visible change bumps `version` in `.claude-plugin/plugin.json`. The commit subject is `observational-memory vX.Y.Z: <change>`. Keep the `description` in `plugin.json` a short summary of the plugin. The `description` in `hooks/hooks.json` lists the behaviour per hook event, one short clause each, without constants. When a change adds or changes what a hook does, update its clause there.

Known issues that are not tracked on GitHub live in `TODO.md`.

## Agent skills

### Issue tracker

Track issues and specs in GitHub Issues. Before reading or publishing tickets, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. Before classifying issues, read `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout. Before exploring the codebase, read `docs/agents/domain.md`.
