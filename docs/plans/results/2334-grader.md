# Grader tiers: core vs lookup

Branch `exp-grader` (worktree `.scratch/par/grader`): 86c97db adds the tiers and 282aa48 fixes how the long chain assigns them. No model calls were made. The HEAD vs v1.5.1 numbers are a cache-only regrade (`out/r3.md` and `out/r3.json` in the worktree). They were produced under 86c97db and then recounted offline under the 282aa48 tier fix; the fix changes only the tiered figures.

## Tiers

- **core**: the goal, decisions and their reasons, rules, open work and next steps, risks and cleanup, lessons, and the current state of files and features. An agent that loses one of these acts differently.
- **lookup**: an exact hash, path, PR number, string, version or count that matters only as a value. `om_recall` can fetch it again once the context says where to look.
- **Weights**: in the tiered total, a lookup item weighs 0.25 and a core item weighs 1. A missed item that the context points to through a `(source A to B)` range earns a share of full credit: 0.9 for lookup, 0.25 for core. Knowing where to look is not the same as knowing the fact.
- **How an item gets its tier**:
  - A hand-authored item uses its own `tier`.
  - Otherwise, an `exact:` or `str:` item is lookup and anything else is core. Recall items are lookup.
  - Mechanical gates are lookup: identifiers, verbatim, commits, files-edited, in-progress, chronology and recall.
  - Behavior probes carry tiers too. Path-value and recall-dropped probes are lookup; the rest are core or follow the item's tier.
- **Totals**: the flat total, the verdict and the flat recall-aware credit are unchanged. The tiered forms print beside them.

## Item counts

The fixtures and specs hold 268 hand-authored items: **184 core and 84 lookup**. The lookup count includes 12 recall items. Mixed items such as todo-gap and multi-prod-dump stayed core. The main-0.4.x items ("version on main + hash") were tagged lookup, which is a judgment call.

In the long chain, the recall-aware count covers 1284 fact×cut checks: **849 core and 435 lookup**.

## A tier bug fixed along the way (282aa48)

The long chain and the replay chain prefix every id with its member's name, for example `om-orchestration-exact:audit-line`. Because of that prefix, the exact:/str: default graded those items as core. The tier is now settled on the unprefixed id, and a regression test covers this.

The same prefix also turns off exact matching (`isExact`) for those items in the long chain. That predates this branch and affects the flat totals, so I left it alone.

## HEAD (v1.5.0, 55c17a7) vs v1.5.1 (f2afcdf)

| track | flat A → B | tiered A → B |
|---|---|---|
| main | 84.4 → 84.7 (+0.3) | 86.7 → 86.8 (+0.1); core 87.9 → 88.1, lookup 84.3 → 84.1 |
| reflection chain | 81.0 → 81.3 (+0.3) | 84.3 → 84.8 (+0.5) |
| long chain | 61.7 → 64.0 (+2.3) | 63.7 → 65.8 (+2.1); core 69.7 → 71.5, lookup 57.0 → 60.4 |
| long recall-aware | 42.0 → 37.8 (-4.2) | 37.9 → 35.2 (-2.7) (fixed tiers; 36.9 → 34.4 before the fix) |

The long-chain figures come from 86c97db. They count members' exact:/str: items as core. That affects only the recall-aware row, which was recounted with the fix.

### Where v1.5.1's long-chain recall-aware loss comes from

| tier | checks | held A → B | pointed A → B | flat credit units A → B | tiered points lost |
|---|---:|---|---|---|---:|
| core | 849 | 285 → 269 (-16) | 103 → 94 | 336.5 → 316.0 (-20.5) | -1.9 |
| lookup | 435 | 193 → 159 (-34) | 19 → 21 | 202.5 → 169.5 (-33.0) | -0.8 |

Counted flat, the loss is **mostly lookup**: 33 of the 53.5 lost credit units (62%). Lookup items make up a third of the checks but account for two thirds of the dropped holds. Lookup held fell 7.8 points (193/435 → 159/435); core held fell 1.9 points.

Weighted by importance, the loss is **mostly core**: 1.9 of the 2.7 tiered points (70%). A lost lookup item counts only a quarter, and a pointed lookup keeps 0.9. What remains is a real core loss of 16 held facts. The largest net drops are:

- `om-v04-file:parser-debug` (-10 cuts)
- `om-orchestration-purpose:agent-teams-tickets` (-7)
- `firstmate-11-multi-prod-dump` (-5)
- `om-orchestration-exact:audit-line` (-5, core by the id default only through the prefix bug; it is really lookup)

Long-chain pass counts by gate and tier (A → B) confirm the same pattern:

- facts: core 280 → 252 (-28 of 572), lookup 141 → 121 (-20 of 331)
- chronology (lookup): 235 → 207 (-28)
- commits (lookup): 111 → 141 (+30)
- decisions (core): 98 → 115 (+17)
- reversals (core): 68 → 62

I could not reproduce the "facts 829→754" figure from `r3.md`. The long facts gate there reads 421 → 373 of 903, and hand-authored holds read 478 → 428 of 1284.

## af0940d vs HEAD

Not run yet. The first attempt died in the machine crash. The rerun, and a rerun of HEAD vs v1.5.1 under 282aa48, are queued on `.scratch/bench.lock` behind six other runs. They will write `.scratch/par/grader/out/af.md` and `out/r3b.md`.

## Checks

- `claude plugin test`: 380 pass, 0 fail.
- `bunx -p typescript tsc -p .`: only the known missing `tests/fixtures/*.local.ts` errors.
