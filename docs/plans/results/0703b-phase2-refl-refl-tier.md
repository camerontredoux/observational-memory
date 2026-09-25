
### I24 refl-tier: a reflection does not condense an earlier reflection's lines again. proposed, lane reflector
- **Evidence (r28 chain, /tmp/omv-refl/tiers.ts):** the second reflection resends the first's 24 reflected lines (~2.6k) with 285 new notes. Of the 8 rubric facts that only those reflected lines held, it loses all 8 (neg:c029150-dropped, why:gap-left, merge-recall, ...); of the 32 held only by notes, it loses 16. Condensing a line twice loses it.
- **Change:** `hooks/register.ts`: an entry the Reflector wrote carries `r: true`; the next reflection passes those through like 🔴 lines (in time order) and condenses only the notes. Variant /tmp/omv-refl/tier (on r28).
- **Risk:** the reflected block grows by ~3k per reflection. Bound it later (condense the reflected tier only when it passes a share of the target).
