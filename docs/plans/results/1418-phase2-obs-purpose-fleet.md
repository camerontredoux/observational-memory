# phase2-obs: purpose 'fleet' alternative, staged for MAIN

This is a fixture-only change to `tests/fixtures/firstmate-11.rubric.local.ts` (purpose:firstmate-crew):
- The crewmate group accepts 'fleet', the transcript's own term (1,296 uses vs 1,165 for "crewmate").
- The behavior probe's answer regex accepts `(crew|fleet)` to match.

Staged at `~/.claude/jobs/40c779b6/tmp/purpose-fleet/`:
- `fleet.diff`. Apply from MAIN with `patch -p0 < fleet.diff`. A dry run applies cleanly.
- `fixtures/rubric-controls*.local.ts`: controls regenerated from base7 with the new item (`bun scripts/bench-compact.ts controls --plugin .scratch/omv-code/base7`). There are 7 modules, the largest 292 KB. You can instead regenerate them in MAIN after applying the diff.

Checked in `.scratch/obs-bench5`, a copy of MAIN with the diff applied:
- `claude plugin test` passes 350/0, so the negative-control guard still passes. om-v04 (51 uses of "fleet") and om-orchestration (26) do not pass firstmate-11's purpose item cross-transcript.
- base7's purpose gate stays 0/24 from cache, so no current baseline changes. Only a variant that writes a goal line can gain from it.

om-v04 is left as it is.
