// Superseded status lines: an older 🟡/✅ line that only reports where something stood (a PR's checks, a server's
// HTTP status, a task's hold) is hidden from the rendered memory once a newer line reports the same subject's status
// again and says everything the older one did. The ledger keeps every line; om_recall still finds its source.
// Deterministic and conservative: a line with a reason, a decision, a failure, a finding, the user's words or a quote
// is never hidden, and neither is a line with a specific (a number, id, path, version) or more than a couple of words
// that no newer visible line repeats. No `$` here; the caller passes the lines.

// Ledger form: `🟡 2026-09-23 14:30 text`; the rendered form drops the date but the rules read the text alone.
const HEAD = /^(🔴|🟡|🟢|✅) (?:\d{4}-\d{2}-\d{2} )?(?:\d{2}:\d{2} )?/

// What a status report says: where a PR, a run, a server or a task stands.
const STATUS =
  /\b(?:green|passed|passing|pending|queued|running|in progress|started|starting|awaiting|waiting|ready|mergeable|merged|parked|paused|held|on hold|resumed|idle|alive|up and running|is up|was up|remains?|remained|still|returned HTTP|responded|HTTP \d{3}|registered|re-registered|polls?|checks?|CI|status|state|open|reviewable|in review|deployed|live|restarted|relaunched|running)\b/i

// Never hidden: reasons, decisions, lessons, failures, findings, requests, instructions, questions and plans.
const KEEP =
  /\b(?:because|since|so that|so the|due to|reason|why|in order|instead|rather|decid\w*|chose|choice|prefer\w*|agree\w*|approv\w*|lesson|learn\w*|realiz\w*|root cause|caus\w*|fail\w*|error\w*|broke\w*|broken|bug\w*|crash\w*|regress\w*|warn\w*|leak\w*|risk\w*|must|should|never|always|don't|do not|cannot|can't|won't|not|no longer|block\w*|rule|requir\w*|constraint|asked|asks|question|found that|discover\w*|notic\w*|turns? out|fix\w*|workaround|important|todo|next|plan\w*|wants?|told|recommend\w*|suggest\w*|unless|until|only|except|but|however|although|though|if|mismatch\w*|missing|conflict\w*|denied|refused|timed? ?out|stale|wrong|incorrect|unknown|gone|lost|down)\b|\?|"|“/i

// A subject: a PR or issue number, a URL or host:port, a slug or task id, a path or file name, a run id.
function subjects(text: string) {
  const keys = new Set<string>()
  for (const m of text.matchAll(/\b(?:PR|pull request|issue)\s*#?(\d{2,})\b|\/pull\/(\d+)\b|(?:^|[\s(`])#(\d{2,})\b/gi)) keys.add(`#${m[1] ?? m[2] ?? m[3]}`)
  for (const m of text.matchAll(/\bhttps?:\/\/([^\s`)'",;]+)/gi)) {
    const url = m[1]!.replace(/[.,;:]+$/, '').replace(/\/$/, '')
    if (!/\/pull\/\d+$/.test(url)) keys.add(url.toLowerCase())
  }
  for (const m of text.matchAll(/\b(localhost|127\.0\.0\.1):(\d{2,5})\b/gi)) keys.add(`localhost:${m[2]}`)
  for (const m of text.matchAll(/\b[a-z0-9]+(?:-[a-z0-9]+){2,}\b/gi)) keys.add(m[0].toLowerCase())
  for (const m of text.matchAll(/\b[0-9A-Z]{20,}\b/g)) keys.add(m[0])
  return keys
}

// The specifics a line carries: every number, id, version, path and quoted term. Each must reappear in a newer
// visible line for the older one to go.
function specifics(text: string) {
  const out = new Set<string>()
  // The subject's own forms (`PR 1417`, `#1417`, its URL) match by subject, not by spelling.
  const rest = text
    .replace(/\b(?:PR|pull request|issue)\s*#?\d{2,}\b|(?:^|(?<=[\s(`]))#\d{2,}\b/gi, ' ')
    .replace(/\bhttps?:\/\/[^\s`)'",;]+/gi, (u) => (/\/pull\/\d+\/?$/.test(u) ? ' ' : u))
  for (const m of rest.matchAll(/`([^`\n]+)`/g)) if (!/\/pull\/\d+\/?$/.test(m[1]!)) out.add(m[1]!.toLowerCase())
  for (const m of rest.replace(/`[^`\n]+`/g, ' ').matchAll(/([\w./:@-]*\d[\w./:@-]*)(\s+[a-z][\w-]*)?/gi)) {
    const t = m[1]!.replace(/[.,;:]+$/, '').toLowerCase()
    if (!t || /^\d{2}:\d{2}$/.test(t)) continue
    // A bare small number means nothing without its noun: `11 lines`, `302` alone is a status code only with HTTP.
    out.add(/^\d{1,3}$/.test(t) && m[2] ? `${t}${m[2].toLowerCase()}` : t)
  }
  return out
}

// A specific reappears as a whole token; a bare number of up to three digits with the word after it.
function has(text: string, s: string) {
  const at = (from: number) => text.indexOf(s, from)
  for (let i = at(0); i >= 0; i = at(i + 1)) {
    const before = text[i - 1] ?? ' '
    const after = text[i + s.length] ?? ' '
    if (!/[\w./-]/.test(before) && !/[\w/-]/.test(after.replace('.', ' '))) return true
  }
  return false
}

const STOP = new Set(
  'the a an and or of to in on at for with by from as is was were be been are it its this that these those into onto then than also again now there their his her our your after before while during over under about via per all any each both some more most other same new newer latest local locally assistant tool worker agent reported reports report confirmed confirms verified verifies said says showed shows noted notes stated states which who whom what when where has have had having did does done still remains remained'
    .split(' '),
)
const words = (text: string) => (text.toLowerCase().match(/[a-z][a-z0-9_'-]{2,}/g) ?? []).filter((w) => !STOP.has(w))
const statusWords = new Set(
  words(
    'green passed passing pending queued running progress started starting awaiting waiting ready mergeable merged parked paused held hold resumed idle alive returned http responded registered re-registered poll polls check checks status state open reviewable review deployed live restarted relaunched server up',
  ),
)

// How many of a status line's content words may be its own and it still counts as status only.
export const SUPERSEDE_OWN_WORDS = 4

export type Superseded = { index: number; by: number }
type Line = { i: number; marker?: string; text: string; lower: string; subjects: Set<string>; status: boolean; words: Set<string> }

// The lines, oldest first; which of them a newer line supersedes, each with the index of the newer line that repeats
// the most of it. Newest first, so a line is judged against the lines that stay in view.
export function superseded(lines: readonly string[]): Superseded[] {
  const out: Superseded[] = []
  const visible: Line[] = []
  for (let i = lines.length - 1; i >= 0; i--) {
    const head = lines[i]!.match(HEAD)
    const text = head ? lines[i]!.slice(head[0].length) : lines[i]!
    const line = { i, marker: head?.[1], text, lower: text.toLowerCase(), subjects: subjects(text), status: STATUS.test(text), words: new Set(words(text)) }
    const by = supersededBy(line, visible)
    if (by === undefined) visible.push(line)
    else out.push({ index: i, by })
  }
  return out.reverse()
}

const reports = (l: Line) => (l.marker === '🟡' || l.marker === '✅') && l.status && !/^(?:User|Captain)\b/i.test(l.text)

function supersededBy(line: Line, newer: readonly Line[]) {
  if (!reports(line) || !line.subjects.size || KEEP.test(line.text)) return undefined
  // The newer status reports about one of its subjects: not the user's words, a question or a 🔴 line.
  const same = newer.filter((n) => reports(n) && !n.text.includes('?') && [...line.subjects].some((s) => n.subjects.has(s)))
  if (!same.length) return undefined
  const later = newer.map((n) => n.lower).join('\n')
  if ([...specifics(line.text)].some((s) => !has(later, s))) return undefined
  // Its words against the newer report that repeats the most of them: status only when that one says nearly all of it.
  const ownOf = (n: Line) => [...line.words].filter((w) => !n.words.has(w) && !statusWords.has(w) && ![...line.subjects].some((s) => s.includes(w)))
  const best = same.map((n) => ({ n, own: ownOf(n).length })).reduce((a, b) => (b.own < a.own ? b : a))
  return best.own <= SUPERSEDE_OWN_WORDS ? best.n.i : undefined
}
