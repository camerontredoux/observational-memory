# Domain docs

This repository uses a single-context layout:

- `CONTEXT.md` at the repository root holds domain terms and context.
- `docs/adr/` holds architectural decision records.

## Before exploring

Read `CONTEXT.md` and the ADRs relevant to the area being explored.

If these documents do not exist, proceed silently. Do not propose creating
them solely because they are absent. The domain-modeling skill creates them
when terms or decisions are resolved.

## Use the domain vocabulary

Use the terms defined in `CONTEXT.md` in issue titles, proposals,
hypotheses, and test names. Respect any synonyms the glossary excludes.

If a needed concept is missing, check whether existing terminology fits.
Otherwise, note the gap for domain modeling.

## Flag decision conflicts

If a proposal contradicts an ADR, identify the ADR and explain why the
decision should be reconsidered. Do not silently override it.
