# /// script
# requires-python = ">=3.11"
# ///
"""One-off backfill of observational-memory stats from session transcripts. Not part of the plugin.

Reads (never writes) ~/.claude/projects/**/*.jsonl for the plugin's log lines and the compactions around them, and
writes one stats file per session in the plugin's format, marked backfilled. A log line copied into several
transcripts (a fork, a resume) counts once, for the first session that has it. A session that already has a live
stats file is left alone.

    uv run scripts/backfill-stats.py [--projects DIR] [--out DIR] [--dry-run]
"""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

SAMPLES = 200
PREFIX = 'observational-memory: '
LUNA = re.compile(r'^Luna (observer|reflector)(?: level \d+)?: (\d+|\?) in, (\d+|\?) out, \$([\d.]+), ([\d.]+)s$')
OM_COMPACTION = re.compile(r'^(observed (\d+) rows now, |cut at the background watermark with no Observer call, )kept \d+ raw messages .*memory ~(\d+) tokens, (\d+) observations')
FALLBACK = re.compile(r'; using the built-in compaction$')
BACKGROUND = re.compile(r'^observed rows \d+-\d+ in the background, (\d+) observations')
REFLECTED = re.compile(r'^reflected \d+ observations \(~(\d+) tokens\) into \d+ \(~(\d+) tokens\) at compression level (\d+)')
OM_WINDOW_MS = 10 * 60_000  # a compact_boundary this soon after the plugin's compaction line is the plugin's


def ms(ts: str) -> int:
    return int(datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp() * 1000)


def empty(sid: str, at: int, cwd: str | None) -> dict:
    s = {'version': 1, 'sessionId': sid, 'firstSeen': at, 'lastSeen': at, 'backfilled': True, 'counts': {}, 'metrics': {}}
    if cwd:
        s['cwd'] = cwd
    return s


def add(s: dict, name: str, value, at: int) -> None:
    if value is None:
        return
    m = s['metrics'].setdefault(name, {'count': 0, 'sum': 0, 'min': value, 'max': value, 'recent': []})
    m['count'] += 1
    m['sum'] += value
    m['min'] = min(m['min'], value)
    m['max'] = max(m['max'], value)
    m['recent'] = (m['recent'] + [[at, value]])[-SAMPLES:]
    s['firstSeen'] = min(s['firstSeen'], at)
    s['lastSeen'] = max(s['lastSeen'], at)


def count(s: dict, name: str) -> None:
    s['counts'][name] = s['counts'].get(name, 0) + 1


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--projects', default=str(Path.home() / '.claude/projects'))
    ap.add_argument('--out', default=str(Path.home() / '.claude/plugins/data/observational-memory/stats'))
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    seen: set[tuple] = set()
    sessions: dict[str, dict] = {}
    files = sorted(Path(args.projects).rglob('*.jsonl'), key=lambda p: p.stat().st_mtime)
    for path in files:
        last_om: dict | None = None  # the plugin's compaction line waiting for its compact_boundary, per file
        with path.open(errors='replace') as f:
            for line in f:
                if '"type":"system"' not in line or ('observational-memory' not in line and 'compact_boundary' not in line):
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if row.get('type') != 'system' or not row.get('timestamp'):
                    continue
                at = ms(row['timestamp'])
                content = row.get('content') or ''
                sid = row.get('sessionId') or path.stem
                if row.get('subtype') == 'compact_boundary':
                    meta = row.get('compactMetadata') or {}
                    om, last_om = last_om, None
                    if not om or at - om['at'] > OM_WINDOW_MS:
                        continue  # a compaction the plugin had no part in
                    key = ('boundary', row['timestamp'], json.dumps(meta, sort_keys=True))
                    if key in seen:
                        continue
                    seen.add(key)
                    s = sessions.setdefault(sid, empty(sid, at, row.get('cwd')))
                    trigger = meta.get('trigger') or 'unknown'
                    k = f'compaction.{trigger}'
                    if om['fellBack']:
                        count(s, f'{k}.fellBack')
                    add(s, f'{k}.ms', meta.get('durationMs'), at)
                    add(s, f'{k}.tokensBefore', meta.get('preTokens'), at)
                    add(s, f'{k}.tokensAfter', meta.get('postTokens'), at)
                    for name in ('rowsObservedNow', 'memoryTokens', 'observations'):
                        add(s, f'{k}.{name}', om.get(name), at)
                    continue
                if not content.startswith(PREFIX):
                    continue
                text = content[len(PREFIX):]
                key = ('log', row['timestamp'], text)
                if key in seen:
                    continue
                seen.add(key)
                s = sessions.setdefault(sid, empty(sid, at, row.get('cwd')))
                if m := LUNA.match(text):
                    kind, tin, tout, cost, secs = m.groups()
                    k = f'{kind}.unknown'  # the log line does not say background or at compaction
                    add(s, f'{k}.ms', round(float(secs) * 1000), at)
                    add(s, f'{k}.in', None if tin == '?' else int(tin), at)
                    add(s, f'{k}.out', None if tout == '?' else int(tout), at)
                    add(s, f'{k}.cost', float(cost), at)
                elif m := OM_COMPACTION.match(text):
                    last_om = {'at': at, 'fellBack': False, 'rowsObservedNow': int(m.group(2) or 0), 'memoryTokens': int(m.group(3)), 'observations': int(m.group(4))}
                elif FALLBACK.search(text):
                    last_om = {'at': at, 'fellBack': True}
                elif m := BACKGROUND.match(text):
                    add(s, 'observer.background.observations', int(m.group(1)), at)
                elif m := REFLECTED.match(text):
                    add(s, 'reflection.tokensBefore', int(m.group(1)), at)
                    add(s, 'reflection.tokensAfter', int(m.group(2)), at)
                    add(s, 'reflection.level', int(m.group(3)), at)
                elif 'failed (' in text:
                    count(s, 'luna.failed.logged')  # a failure's log line, class unknown

    out = Path(args.out)
    written = skipped = calls = 0
    cost = 0.0
    compactions = 0
    for sid, s in sessions.items():
        if not s['metrics'] and not s['counts']:
            continue  # only other log lines (a restarted ledger, a dropped skill)
        target = out / f'{sid}.json'
        if target.exists() and not json.loads(target.read_text()).get('backfilled'):
            skipped += 1
            continue
        for k, m in s['metrics'].items():
            if re.fullmatch(r'(observer|reflector)\.unknown\.ms', k):
                calls += m['count']
            if k.endswith('.cost'):
                cost += m['sum']
            if re.fullmatch(r'compaction\.[\w-]+\.ms', k):
                compactions += m['count']
        if not args.dry_run:
            out.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps(s))
        written += 1
    print(f'{len(files)} transcripts read; {written} session file(s) {"would be " if args.dry_run else ""}written to {out}, '
          f'{skipped} left alone (live); {calls} Luna calls, ${cost:.4f}, {compactions} plugin compactions')


if __name__ == '__main__':
    main()
