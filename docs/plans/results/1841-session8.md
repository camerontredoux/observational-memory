# I26 Session-only on base8 (session8)

**Verdict: rejected.** The Session line fixes the purpose gate on wording for 2 of 3 transcripts and leaves retention flat or slightly up, but the reader loses in both behavior draws (−1.0, −4.0). The bar was +3.

## Build

- `.scratch/omv-sess/session8` = `.scratch/omv-code/base8` + the I26 part of `session-ctx-a.diff` only: the Observer prompt's `Session:` field and example, "keep its Session line…", `session` in `FIELD`, and `carry()` keeping the previous Session line when a newer record leaves it out, placing it first and capping it at 100 tokens. I27a is not included. Diff: `diffs/session8.diff`.
- One new test covers the Session line leading the record, carrying, being replaced, and being bounded. `claude plugin test`: 369 pass, 0 fail. `tsc`: only the missing `tests/fixtures/*.local.ts` errors.
- A = the `base8` dir: 0 fresh main or holdout calls in both samples, and chain sample 1 is cached. main HEAD (v1.4.1) was not used, because base8 has the cache.
- session8-sticky was not built. Every B compaction in both samples has a Session line (main 25/25 cuts per sample, holdout too). `carry()` already keeps the old line when the Observer drops it, so the sticky variant would behave the same.

## Runs

- `bench-compact.ts ab --a base8 --b session8 --record --samples 2 --behavior --no-chain --jobs 12` (main + holdout, 2 samples, behavior on sample 1).
- The same with `--behavior-sample 2 --no-holdout`: behavior on sample 2, 0 fresh Observer calls.
- `ab … --samples 1 --no-holdout` (chain on): one chain draw. Chain sample 2 was skipped, because base8 has no cached chain sample 2 and recording it would cost about 111 more A calls.
- `--long` was not run, because the result was not positive.

| track | A | B | Δ | notes |
|---|---:|---:|---:|---|
| main (2 samples) | 82.2 (82.9, 81.5) | 83.4 (83.9, 82.9) | +1.2 (s1 +1.0, s2 +1.4) | 37↑/36↓ unique, p=1.0; A spread 1.4, A' −1.4; samples overlap |
| main without purpose | | | ≈ +0.2 | purpose contributes +1.0 of the +1.2 |
| purpose gate | 0/48 | 13/48 | +27.1 | om-orchestration 30%, om-v04 0%, firstmate-11 50% |
| holdout (2 samples) | 83.7 | 84.2 | +0.5 | 11↑/5↓ unique; script flags model tokens +18% (see below) |
| chain (1 draw) | 80.7 | 81.6 | +0.9 | chronology −7.8 (62↑/150↓); 3 reflections vs 2 |
| behavior s1 | 74.0% | 73.0% | −1.0 | purpose 3→13/24; multi-hop −6, value −6, rule −4, done −3, lessons −3 |
| behavior s2 | 74.4% | 70.4% | −4.0 | purpose 4→10/24; file-state −24, value −20 |
| behavior mean | 74.2% | 71.7% | −2.5 | bar +3 |

Efficiency: main context 21k→21k (−0%), max 34k→34k, model tokens +2%, critical-path calls 2→2. Holdout context +1%. Holdout model tokens are +18% (523k→617k per sample), almost all input. That is more than a ~150-token prompt addition explains, and A's own holdout input swings 96k–139k between samples on crew-opie-4, so it is mostly draw noise. Chain context −3%.

## Checked against the bar

- Retention Δ ≥ 0 in both samples: yes (+1.0, +1.4), but it is within A's spread 1.4, and without purpose it is ≈ 0.
- Purpose gate rises: yes, 0 → 13/48.
- Behavior ≥ +3: no, −1.0 and −4.0. The purpose probe rises (+10, +6 net), but other types lose in both draws, so the "purpose rises without other losses" clause fails too.
- Context ≤ +10%: yes. No new critical-path calls: yes.

## What the Observer wrote

- om-orchestration passes from cut 3/4 on, once "benchmark" joins the line: "orchestrating agent-team implementation of the observational-memory plugin, now released as v1.0.0, benchmarked against built-in compaction…".
- om-v04 is 0/16 on wording. The lines name the product and the phases but never the orchestrator role and "subagent" together. Sample 1: "improving and evaluating observational-memory through v0.4.5, coordinating logging, statistics…". Sample 2: "…The assistant is orchestrating parallel low-effort Opus builds…", and "subagent" appears only from cut 7, by which time "orchestrating" has gone.
- firstmate-11 passes once Oasis/Gorman/SBOM/USPA enter the line: "Supervising the Firstmate fleet and delivering production-safe direct PRs for Oasis, including the Gorman PDF workflow". Early cuts fail on "Oasis/Opie" plus "Gorman/SBOM/USPA".
- The line grows by appending phases and version numbers (up to ~330 chars). The 400-char cap was not hit.
- absent −9 (firstmate-11 `old-no-mistakes`, one sample) comes from an ordinary observation line: "installed versions were no-mistakes v1.60.2". That is Observer draw noise, not the Session line.

## Spend (fresh calls)

- Observer/Reflector: 369 fresh (main 170, holdout 88, chain 111). About 5.08M tokens in and 0.34M out: main 2.27M/151k, holdout 1.16M/75k, chain 1.65M/112k.
- Behavior reader: 243 Luna calls (A 18 + 75, B 75 + 75). The report does not give their tokens.

Reports: `.scratch/omv-sess/ab-s2.{md,json}`, `ab-bs2.md`, `ab-chain.{md,json}`.
