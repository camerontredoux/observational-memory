# Open issues

## Token estimates run low on dense text

OM estimates tokens as characters ÷ 4. Dense text (the v0.4.12 smoke chapters in `/tmp/om-tail/runs/smokeC`, `smokeD`
were ~2 characters per token) makes the kept raw tail about twice its estimate, so compactions come more often than
intended. Since v0.4.14 a compaction in that shape cuts at the background watermark and keeps the reads since it raw;
the replay of it in `tests/register.test.ts` then compacts on every read rather than every second one (no Observer
call at any).
