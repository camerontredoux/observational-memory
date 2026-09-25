# phase2-refl I25 refl-tier: a reflection doesn't condense an earlier reflection's lines again (screen, --samples 1)

Variant: /tmp/omv-refl/tier (r28 + tier), and /tmp/omv-refl/tierb (the same plus a bound: earlier reflections' lines pass through only while they fit REFLECT_TIER_TOKENS = 6k, and past that they are condensed again). On the chain the tier is 2.6k at the second reflection, so tier and tierb make the same calls. Change: `hooks/register.ts` only: `Entry.r`, the pass-through in `maybeReflect`, `r: true` on reflected lines. ~6 lines.

## Result (ab vs grp, --samples 1, /tmp/omv-refl/ab2.txt)
| arm | main | chain | Δ grp | Δ HEAD 65.8 | unique up/down | ctx mean/max | Reflector calls | model tokens |
|---|---:|---:|---:|---:|---|---|---|---:|
| grp | 75.0 | 68.9 | – | +3.1 | – | 38k/65k | 1 (38k/4.6k) | 1777k |
| r28 | 75.0 | 71.5 | +2.6 | +5.7 | 3/22 | 35k/52k | 3 (81k/9.0k) | 1825k |
| tier | 75.0 (exact) | 71.4 | +2.5 | +5.6 | 3/18 (p=0.0015) | 35k/52k | 2 (51k/5.5k) | 1792k |

## The facts, measured straight from the reflections (/tmp/omv-refl/whole.ts: rubric facts the whole memory held before reflection 2 and lacks after it)
- r28: 55 held, **27 lost**, including all 8 held only by the first reflection's lines (main-0.4.13, merge-recall, todo-gap, neg:c029150-dropped, file:pi-isolation, hop:moved-transcript, scope:gap-filed-only, why:gap-left).
- tier: 55 held, **15 lost**, and **0 of those 8**. The remaining 15 are new notes the second reflection condensed (om-orchestration decisions, exact strings, multi-hop).
- Size: memory after reflection 2 is 13.3k against r28's 11.6k (+1.7k). tierb's bound caps the tier at 6k. Reflector cost falls: 2 calls instead of 3 (r28's second reflection needed a retry), -33k model tokens.
- **The chain rubric doesn't see this.** Its facts gate is 294/301 in every arm (grp, r28, why, tier), so 12 facts kept across reflection 2 add nothing to the total. The chain score can't judge Reflector retention. It needs lost-* or facts items that span the second reflection (the fixture owner's call).
- tier's unique-item losses against grp (18) are r28's cost of reflecting early: the first reflection at @13 drops paths that grp holds until @19 (hooks/stats.ts, /tmp/om-v043, /tmp/cmp*, .claude/types). That comes from I20, not from tier.

## Verdict
- **I25: works.** It keeps the 8 reflected-only facts at a bounded size (tierb, 6k cap) and costs less than r28. By your rule, **I6 durable-tier closes again**: the loss #21 worries about is the double condensing, and I25 stops it in-ledger with no files, no new tool and no disk tier. What remains is the first-pass loss (16-22k to ~3k), and a disk tier wouldn't fix that either.
- Running the full test now: `ab --a grp --b tierb,r28 --samples 2 --jobs 12 --record` with holdout (/tmp/omv-refl/ab3.txt). Next: I23 (the target scales with input), on tierb.
