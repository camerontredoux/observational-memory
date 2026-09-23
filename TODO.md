# Open issues

## Main thread observes on the spot after a compaction keeps only an oversized read

Found by the v0.4.12 smoke runs (`/tmp/om-tail/runs/smokeC`, `smokeD`: sonnet, 60k window, 36 KB reads).

When a compaction keeps only the oversized newest call/result pair, the unobserved rows before it come to about
9.4k estimated tokens, just short of the 10k needed to start a background chunk. The step that could start that
chunk doesn't, because after a check that starts nothing the step token count resets and needs another 5k tokens.
The next large read then triggers compaction at the same moment, so each such compaction makes about two Observer
calls on the spot (8–10 s). No fallbacks, no timeouts.

Likely fix: in `schedule()` (`hooks/register.ts`), reset the step token count only when a check actually starts a
chunk. Test first with a replay of smokeC/smokeD showing 0 on-the-spot Observer calls.

Related: OM estimates tokens as characters ÷ 4; dense text (the smoke chapters were ~2 characters per token) makes
the kept raw tail about twice its estimate, so compactions come more often than intended.
