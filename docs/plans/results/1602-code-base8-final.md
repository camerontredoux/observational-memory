# phase2-code: base8 final, with I53 carry5f stacked in (supersedes 1550-code-base8.md)

## base8

- **Plugin dir:** `/home/cameron/work/mods/observational-memory/.scratch/omv-code/base8` (also `/tmp/omv-code/base8`).
- **Contents:** base7 + I55 lookup-fail + I54 rowcap + I56 align + I53 carry5f.
- **How carry5f went in:** `docs/plans/results/diffs/carry5f.diff`, applied with `patch -p1`.
  - Both hunks applied cleanly, 21 lines further down than in base7.
  - The change it makes is identical to `.scratch/omv/carry5f` vs base7; only line offsets differ.
  - carry5f touches only `hooks/register.ts`.
  - The pre-carry register.ts is saved at `/tmp/omv-code/base8-register.pre-carry.ts`.
- **Checks:** `claude plugin test` 368/0. tsc shows only the 6 missing-fixture errors (recall.test.ts:73, register.test.ts:3096 ×4, replay.test.ts:850).

## Diff against MAIN

- **Path:** `/tmp/omv-code/base8.diff`, 2,254 lines, git style, a/ and b/ paths from the repo root.
- **What it covers:** it runs from MAIN's current `hooks/` and committed tests to base8. It touches `hooks/{prompts,recall,register,vcc}.ts` and `tests/{register,vcc,recall}.test.ts`.
- **What it leaves out:** `tests/eval/`, `tests/replay.test.ts` (main's copies are newer), the fixtures, and the main-only ranking files.
- **Verified:** `patch -p1` on a fresh copy of MAIN's `hooks/` and `tests/` makes all 7 files byte-identical to base8.
- **Apply command (not run):** `cd /home/cameron/work/mods/observational-memory && git apply /tmp/omv-code/base8.diff`.

## Final A/B: base8 vs base7

- **How it ran:** the MAIN checkout's bench, `--long --record`.
- **Fresh calls:** exactly 7, all Reflector calls in the long run (calls 118, 119, 152, 186, 223, 224, 262). Main, holdout and chain had 0 fresh.
- **Report:** `/tmp/omv-code/final-base8c.md`, with `.json` and `.err` alongside.

| track | base7 | base8 | Δ | unique ↑/↓ | notes |
|---|---:|---:|---:|---|---|
| main | 78.3 | 82.9 | **+4.6** | 29/0, p=3.7e-9 | Exact, same cache keys. Per transcript: om-orchestration +1.7, om-v04 +5.4, firstmate-11 +5.2. Gains in multi-hop, lessons, rationale, file-state. |
| holdout | 82.9 | 83.5 | +0.6 | 3/0 | I55 plus carry. |
| chain | 81.0 | 80.7 | -0.2 | 26/7, p=0.0013 | Chronology +12.4 (147↑ 7↓), commits +2.8, identifiers +2.2. The total falls only because the size gates drop: tokens -4.4, budget -1.3. |
| long | 61.8 | 61.3 | -0.5 | 82/79, p=0.87 | Recall-aware 43.6 → 41.3 (-2.3). See the caveat below. |

**Efficiency:**
- **Main:** "same". Mean context 19k → 21k (+9%, inside ±10%), max 31k → 34k. Model tokens and critical-path calls are unchanged.
- **Chain:** +5% context.
- **Long:** "better".
  - Critical-path calls 115 → 4 (1,983k → 52k tokens in).
  - Model tokens 6,039k → 5,344k (-12%).
  - Observer calls 325 → 283; Reflector calls 10 → 9.
  - Mean context 43k → 45k (+4%); max 72k → 69k.

## Long-chain caveat

The commits gate fell 84.7 → 60.7 (46 down).
- **Where:** PRs 238 and 1417–1425 are lost from @50 on. Commits 00b682b, 2adb842 and 9466e8a go at @75/@80.
- **Cause:** PR 1418 is still in compaction-45 of the base8 run, then gone. Fresh Reflector call 152 falls there, so this is one new Reflector draw condensing the PR list. It's the Reflector-loss class, not a code-path loss.
- **Compared with earlier runs:** base8 without carry had commits -5.5, and carry on its own had long -1.0 (63↑ 55↓).
- **Elsewhere on long:** gains in failures +20, in-progress +12, facts +3.2, identifiers +2.4, files-edited +2.6.
- **Noise:** there's no resample of A, so the long noise floor is unknown. It is one draw per side.

## Per-idea verdicts (unchanged from 1550 except I53)

- **I53 carry5f:** kept (phase2-obs verdict); stacked here.
- **I55 lookup-fail:** kept. Diff `/tmp/omv-code/i55-lookfail.diff`.
- **I54 rowcap:** kept, on latency.
- **I56 align:** kept as a bug fix. Diff `/tmp/omv-code/i56-align.diff`.
- **Still open:** why auto and subagent compactions come out notPersistent. The new log line will show whether merged parallel results are the cause.

`--behavior` was not rerun on base8. The carry report has the behavior numbers: 67.6% → 74.9%.

Stopping here as asked.
