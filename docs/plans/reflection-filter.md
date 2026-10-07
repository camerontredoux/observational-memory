# Reflection as a poison filter

## Goal

Make reflection run in real sessions and remove observations that are garbage or stale and won't affect future behaviour, instead of only condensing a memory once it reaches 40k.

## Decided

- Keep reflection. The user: "a lot of our observations are old and useless or are poorly stored". Reflection "should act as a poison filter".
- Delete only: no merging or rewriting. Code checks that every surviving line matches an input line byte for byte, which avoids the losses I20/I45 saw from rewriting.
- Trigger at 15k, as Pi does. The user: "maybe we should be doing 15k then". Real memories peak at about 35k (median 9k), and the Reflector has never run in 322 real sessions. Pi's consolidator fires at a 15k pool and drains it to 10k (`pi-observational-memory-vcc/src/config.ts:58-59`). Our 40k came from Mastra's default (`reflection.observationTokens: 40_000`), not from Pi.

## Rejected

- Lowering the threshold for the current condensing Reflector. I20, I23 and I45 showed that every earlier or more frequent condensing reflection lost commits, chronology and identifiers (`docs/plans/phase2-summary.md`).

## Open

- What counts as garbage or stale? The criteria need writing down, with real examples taken from stored ledgers.
- Should the filter replace the 40k condensing Reflector or run alongside it?
- What stays exempt: 🔴 lines, the newest N tokens, lines an earlier filter pass already kept.
- Should deleted lines stay reachable through `om_recall`? Their source ranges remain in the transcript.
- How do we measure it: `bench-compact --long` A/B, plus a check that no rubric item is lost from the lines it deleted?

## Next steps

1. Pull real ledgers from the store and collect examples of garbage and stale lines, to ground the criteria.
2. Decide the open questions.
3. Build it and A/B it on main and `--long`.
