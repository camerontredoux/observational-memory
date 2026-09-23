#!/usr/bin/env bun
// Runs om_recall, the same code the plugin runs, against a transcript file outside a session. Not typechecked by
// `tsc -p .` (it uses Bun's Node APIs); run it with bun.
import { readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { legacyRecall, loadTranscript, recall, SEARCH_MAX_HITS } from '../hooks/recall'
import type { RecallInput, RecallIo } from '../hooks/recall'

const USAGE = `Usage: bun scripts/recall-cli.ts <transcript.jsonl> [options] [query words...]

Runs the om_recall tool over a Claude Code transcript and prints what the tool returns. The transcript is read
with the files it continued from (found by their "continued-in" row in the same directory) and after it, as the
plugin reads the session's whole transcript. Every block (user message, assistant text, tool call, tool result)
has a reference like a79f045b:2133: the transcript file's first 8 characters and the line of its row.

Modes (default: search with a query, read with --ref alone, outline with neither):
  search    Find blocks. The query is words (all must appear, case-insensitive; failing that, any),
            "quoted phrases", or /regex/flags. Prints each hit's reference and its matching lines.
  read      Print one block in full by --ref, a page at a time (--lines), with neighbours (--before/--after).
  outline   The session in order: user messages and assistant text cut short, each tool call on one line
            with its reference and a pointer to its result. Pages with --from.

Options:
  --mode search|read|outline
  --ref REF          the block to read, or a subagent's tag to outline (read, outline)
  --lines A-B        lines of the block to read: "40-120", "40-", "40" (read)
  --before N         blocks before the read one to show too, at most 5 (read)
  --after N          blocks after the read one to show too, at most 5 (read)
  --from X           range start: a reference, "HH:MM" or "YYYY-MM-DD HH:MM" (search, outline)
  --to Y             range end, inclusive, the same forms (search, outline)
  --limit N          most search hits, at most ${SEARCH_MAX_HITS} (default ${SEARCH_MAX_HITS})
  --subagents        search the subagent transcripts too
  --json '{...}'     the tool's input as JSON, e.g. '{"mode":"read","ref":"a79f045b:2133","lines":"1-50"}'
  --asking           treat the newest user prompt as the question, never a match, as the live tool does
  --legacy           run v0.4.9's om_recall search instead: this one file only, 400-character snippets
  -h, --help         this text

Examples:
  bun scripts/recall-cli.ts ~/.claude/projects/<project>/<session>.jsonl '"Tests passed"'
  bun scripts/recall-cli.ts <file> --mode outline --from 12:40 --to 13:00
  bun scripts/recall-cli.ts <file> --ref a79f045b:2133 --lines 1-80
  bun scripts/recall-cli.ts <file> '/error TS\\d+/'
  bun scripts/recall-cli.ts <file> --legacy migration contract`

const io: RecallIo = {
  read: async (path) => readFileSync(path, 'utf8'),
  list: async (dir) => readdirSync(dir),
  continuing: async (dir, names, id) => {
    if (!names.length) return undefined
    const r = spawnSync('grep', ['-lF', `"continuedInSessionId":"${id}"`, ...names.map((n) => `${dir}/${n}`)], { encoding: 'utf8' })
    const hit = r.stdout?.split('\n')[0]
    return hit ? hit.slice(hit.lastIndexOf('/') + 1) : undefined
  },
}

const args = process.argv.slice(2)
if (!args.length || args.includes('-h') || args.includes('--help')) {
  console.log(USAGE)
  process.exit(args.length ? 0 : 2)
}
const input: Record<string, unknown> = {}
const words: string[] = []
let path: string | undefined
let legacy = false
let asking = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]!
  const value = () => {
    const v = args[++i]
    if (v === undefined) {
      console.error(`${a} needs a value\n\n${USAGE}`)
      process.exit(2)
    }
    return v
  }
  if (a === '--legacy') legacy = true
  else if (a === '--asking') asking = true
  else if (a === '--subagents') input.subagents = true
  else if (a === '--json') Object.assign(input, JSON.parse(value()))
  else if (['--mode', '--ref', '--lines', '--from', '--to'].includes(a)) input[a.slice(2)] = value()
  else if (['--before', '--after', '--limit'].includes(a)) input[a.slice(2)] = Number(value())
  else if (a.startsWith('--')) {
    console.error(`unknown option ${a}\n\n${USAGE}`)
    process.exit(2)
  } else if (path === undefined) path = a
  else words.push(a)
}
if (!path) {
  console.error(USAGE)
  process.exit(2)
}
if (words.length) input.query = words.join(' ')

if (legacy) {
  if (typeof input.query !== 'string') {
    console.error('--legacy searches: give a query')
    process.exit(2)
  }
  console.log(legacyRecall(readFileSync(path, 'utf8'), input.query, typeof input.limit === 'number' ? input.limit : SEARCH_MAX_HITS))
} else {
  const corpus = await loadTranscript(io, path, { asking })
  console.log((await recall(corpus, input as RecallInput)).text)
}
