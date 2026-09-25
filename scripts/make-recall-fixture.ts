#!/usr/bin/env bun
// Writes tests/fixtures/recall-chain.local.ts (gitignored, never commit it) from a copied transcript chain, for the
// real-chain test in tests/recall.test.ts: every .jsonl and .meta.json under the directory, keyed by its path in it.
// `claude plugin test` imports no module over 1 MiB, so each transcript keeps only the rows that test reads, every
// other row left an empty line so each reference keeps its line number.
//   bun scripts/make-recall-fixture.ts [/tmp/om-recall/chain]
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { loadTranscript } from '../hooks/recall'
import type { RecallIo } from '../hooks/recall'

const OLD = 'a79f045b-2bea-4864-b384-cc8e7124b683.jsonl'
const NEW = 'b8d50671-d9df-4001-9679-8d1ba9ec834c.jsonl'
// The lines the test reads, inclusive: the page of a79f045b:73 and its neighbours, the outline from a79f045b:2108 to
// b8d50671:65 (the compaction at a79f045b:2133 and the move), and the vitest output up to b8d50671:185.
const WANT: Record<string, [number, number][]> = {
  [OLD]: [[60, 90], [2100, 2202]],
  [NEW]: [[1, 70], [140, 190]],
}
const SUBAGENT_LINES = 10 // a subagent transcript is only counted and named
const LIMIT = 1024 * 1024

const dir = process.argv[2] ?? '/tmp/om-recall/chain'
const files: Record<string, string> = {}
const walk = (rel: string) => {
  for (const name of readdirSync(`${dir}/${rel}`)) {
    const path = rel ? `${rel}/${name}` : name
    if (statSync(`${dir}/${path}`).isDirectory()) walk(path)
    else if (/\.(jsonl|meta\.json)$/.test(name)) files[path] = readFileSync(`${dir}/${path}`, 'utf8')
  }
}
walk('')

const ioOver = (all: Record<string, string>): RecallIo => ({
  read: async (path) => {
    if (!(path in all)) throw new Error(`ENOENT: ${path}`)
    return all[path]!
  },
  list: async (d) => [...new Set(Object.keys(all).filter((p) => p.startsWith(`${d}/`)).map((p) => p.slice(d.length + 1).split('/')[0]!))],
  continuing: async (d, names, id) => names.find((n) => all[`${d}/${n}`]?.includes(`"continuedInSessionId":"${id}"`)),
  now: async () => Date.now(),
})
// Each block as the test's chain reads it: its file and line, its kind, and all of it to compare.
const blocksOf = async (all: Record<string, string>) => {
  const c = await loadTranscript(ioOver(Object.fromEntries(Object.entries(all).map(([k, v]) => [`/c/${k}`, v]))), `/c/${NEW}`, { asking: true })
  return c.main.blocks.map((b) => {
    const [tag, line] = b.ref.split(/[:.]/)
    return { file: tag === OLD.slice(0, 8) ? OLD : NEW, line: Number(line), kind: b.kind, asking: !!b.asking, all: `${b.ref} ${b.kind} ${b.tool} ${b.asking}\n${b.text}` }
  })
}
const whole = await blocksOf(files)

// Lines to keep, by file: the wanted ones, those holding vitest's summary, the move, the prompt that asked, and each
// compaction with the first line after it read as new, not a copy, so a compaction ends where it does in the whole chain.
const keep = new Map([OLD, NEW].map((f) => [f, new Set<number>()]))
const texts = new Map([OLD, NEW].map((f) => [f, files[f]!.split('\n')]))
const rows = new Map([OLD, NEW].map((f) => [f, texts.get(f)!.map((l) => (l ? JSON.parse(l) : {}))]))
// Only messages, compactions and the move are read: an attachment or a title is left out wherever it is.
const read = (r: { type?: string; subtype?: string }) => r.type === 'user' || r.type === 'assistant' || r.type === 'continued-in' || r.subtype === 'compact_boundary'
const add = (f: string, n: number) => read(rows.get(f)![n - 1]!) && !keep.get(f)!.has(n) && !!keep.get(f)!.add(n)
for (const [f, ranges] of Object.entries(WANT)) for (const [a, b] of ranges) for (let n = a; n <= b; n++) add(f, n)
for (const b of whole) if (b.asking) add(b.file, b.line)
const copying = new Map([OLD, NEW].map((f) => [f, [] as [number, number][]])) // lines a compaction's copies may be on
for (const [f, rs] of rows)
  rs.forEach((r, i) => {
    if (r.type === 'continued-in' || texts.get(f)![i]!.includes('Test Files')) add(f, i + 1)
    if (r.subtype !== 'compact_boundary') return
    const next = whole.find((b) => b.file === f && b.line > i + 1 && b.kind !== 'memory' && b.kind !== 'summary')
    add(f, i + 1)
    if (next) add(f, next.line)
    copying.get(f)!.push([i + 1, next?.line ?? Infinity])
  })
// Then every row sharing a uuid or a tool call's id with one kept, and a compaction's copy the row it copied, so each
// kept row is read, or skipped as a copy, as it is in the whole chain.
const links = (f: string, n: number, all = false) => {
  const r = rows.get(f)![n - 1]! as { uuid?: string; type?: string; message?: { content?: unknown } }
  const content = r.message?.content
  const parts = (typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : []) as { type: string; text?: string; id?: string; tool_use_id?: string }[]
  const shown = parts.filter((p) => p.type !== 'thinking' && p.type !== 'redacted_thinking' && !(p.type === 'text' && (!p.text || p.text === '(no content)')))
  const copy = shown.length && (all || copying.get(f)!.some(([a, b]) => n > a && n < b))
  return [
    ...(r.uuid ? [`uuid ${r.uuid}`] : []),
    ...parts.flatMap((p) => [p.id, p.tool_use_id].filter(Boolean).map((id) => `tool ${id}`)),
    ...(copy ? [`content ${r.type}\n${shown.map((p) => p.id ?? p.tool_use_id ?? p.text ?? p.type).join('\n')}`] : []),
  ]
}
const byLink = new Map<string, [string, number][]>()
for (const [f, rs] of rows) rs.forEach((_, i) => links(f, i + 1, true).forEach((k) => byLink.set(k, [...(byLink.get(k) ?? []), [f, i + 1]])))
for (let grew = true; grew; ) {
  grew = false
  for (const [f, lines] of keep) for (const n of [...lines]) for (const k of links(f, n)) for (const [g, m] of byLink.get(k) ?? []) grew = add(g, m) || grew
}

const out: Record<string, string> = {}
for (const [path, text] of Object.entries(files)) {
  const lines = text.split('\n')
  const kept = keep.get(path)
  out[path] = path.includes('/subagents/') && path.endsWith('.jsonl') ? lines.slice(0, SUBAGENT_LINES).join('\n') : kept ? lines.map((l, i) => (kept.has(i + 1) ? l : '')).join('\n') : text
}

// Every kept row reads as it does in the whole chain, and no other row reads at all.
const expected = whole.filter((b) => keep.get(b.file)!.has(b.line)).map((b) => b.all)
const trimmed = (await blocksOf(out)).map((b) => b.all)
const bad = trimmed.findIndex((b, i) => b !== expected[i])
if (bad >= 0 || trimmed.length !== expected.length)
  throw new Error(`the trimmed chain reads differently from the whole one at block ${bad}: ${(trimmed[bad] ?? expected[bad] ?? '').split('\n')[0]}`)

const module = `// Generated by scripts/make-recall-fixture.ts from ${dir}. Never commit.\nexport const files: Record<string, string> = ${JSON.stringify(out)}\n`
const size = Buffer.byteLength(module)
if (size > LIMIT) throw new Error(`the fixture is ${size} bytes, over the ${LIMIT} claude plugin test imports`)
const path = new URL('../tests/fixtures/recall-chain.local.ts', import.meta.url).pathname
writeFileSync(path, module)
console.log(`${path}: ${Object.keys(out).length} files, ${[...keep.values()].reduce((n, s) => n + s.size, 0)} rows kept, ${size} bytes`)
