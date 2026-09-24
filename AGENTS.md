## Codebase

A Claude Code function-hooks plugin that replaces compaction with observational memory.

### Layout

- `hooks/register.ts` registers every hook. It holds the ledger, the background observation and reflection, and compaction. `hooks/hooks.json` lists the events it handles.
- `hooks/recall.ts` is the `om_recall` tool. `hooks/stats.ts` is `om_stats` and `/om-stats`. `hooks/prune.ts` prunes old sessions from `$.store`.
- `hooks/prompts.ts` holds the model prompts and the compaction texts. The Observer and Reflector prompts are the plugin's own; edit them there. Its header names the texts copied from other sources. Copy those again from their source rather than editing them.
- `.claude/types/` holds the plugin API types. Claude Code writes these files. Do not edit them.
- `scripts/` holds developer tools. They are not part of the plugin. Each file's header gives its usage.
- `tests/eval/runner.ts` replays one scenario through the four configurations built-in, built-in+recall, om, and om+recall compaction, and records reproducible, machine-readable measurements of what each cost (not how good its output was: that is the continuation-quality benchmark). Its header gives its usage and the live-transport limitation.
- The continuation-quality benchmark: `tests/eval/scenarios.ts` holds its scenarios, `tests/eval/bench.ts` scores a run's transcript and renders the report, `tests/eval/live.ts` plans a live run, and `scripts/bench-live.ts` drives one in a herdr pane (its header gives the usage). `tests/eval/recall-plugin/` is the evaluation-only plugin with `om_recall` alone, for the built-in+recall configuration. `docs/bench/` keeps past results as baselines.

### Code rules

- The engine does not let `$` cross an import. A helper module takes plain I/O functions from its caller, as `recall.ts` takes `RecallIo` and `stats.ts` takes `Io`.
- `claude plugin test` does not import a module over 1 MiB. Keep each fixture module under that limit. `scripts/make-recall-fixture.ts` shows how to trim one.

### Checks

- Tests: `claude plugin test`.
- Types: `bunx -p typescript tsc -p .`. The only expected errors are missing `tests/fixtures/*.local.ts` modules.
- Replay tests import `tests/fixtures/*.local.ts` modules built from private transcripts. Each test's comment names the script that writes its module. Without the module, the test passes without replaying (`recall.test.ts` prints a `SKIP` line). Keep these modules local; they are gitignored.

### Releases

A user-visible change bumps `version` in `.claude-plugin/plugin.json`. The commit subject is `observational-memory vX.Y.Z: <change>`. When the change adds or changes behaviour, update the `description` in `plugin.json` and in `hooks/hooks.json`.

Known issues that are not tracked on GitHub live in `TODO.md`.

## Agent skills

### Issue tracker

Track issues and specs in GitHub Issues. Before reading or publishing tickets, read `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage labels. Before classifying issues, read `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout. Before exploring the codebase, read `docs/agents/domain.md`.
