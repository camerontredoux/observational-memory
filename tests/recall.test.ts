import { describe, expect, test } from 'claude-code/testing'
import { MEMORY_HEADER } from '../hooks/prompts'
import { legacyRecall, liveTranscript, loadTranscript, parseInput, recall } from '../hooks/recall'
import type { RecallInput, RecallIo } from '../hooks/recall'

const OLD = 'aaaaaaaa-1111-4111-8111-111111111111'
const NEW = 'bbbbbbbb-2222-4222-8222-222222222222'
const DIR = '/p'
const T = (m: number) => new Date(Date.UTC(2026, 8, 22, 12, m)).toISOString()
const hm = (m: number) => {
  const d = new Date(Date.UTC(2026, 8, 22, 12, m))
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

let uuid = 0
const msg = (type: 'user' | 'assistant', m: number, content: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ type, uuid: `u-${++uuid}`, timestamp: T(m), message: { role: type, content }, ...extra })
const BIG = Array.from({ length: 301 }, (_, i) => (i === 249 ? 'row 250 has the NEEDLE-42 marker' : `row ${i + 1}`)).join('\n')
const call = { type: 'tool_use', id: 'u1', name: 'Bash', input: { command: 'cat big.txt' }, caller: { type: 'direct' } }

// The old file: a long tool result, an om_recall call, a compaction whose kept rows are written again without their
// call metadata, then the move to the new file.
const oldFile = [
  msg('user', 0, 'start the KIWI job'),
  msg('assistant', 1, [{ type: 'text', text: 'Looking' }, call]),
  msg('user', 1, [{ type: 'tool_result', tool_use_id: 'u1', content: BIG }]),
  msg('assistant', 2, [{ type: 'tool_use', id: 'r1', name: 'mcp__observational-memory__om_recall', input: { query: 'KIWI' } }]),
  msg('user', 2, [{ type: 'tool_result', tool_use_id: 'r1', content: '1 match(es) for "KIWI"' }]),
  JSON.stringify({ type: 'system', subtype: 'compact_boundary', uuid: 'b-1' }),
  msg('user', 3, `${MEMORY_HEADER}\n\n<observations>\n* 🔴 KIWI job started\n</observations>`),
  msg('assistant', 3, [{ type: 'text', text: 'Looking' }, { ...call, caller: undefined }]),
  msg('user', 3, [{ type: 'tool_result', tool_use_id: 'u1', content: BIG }]),
  msg('assistant', 5, [{ type: 'text', text: 'After compaction, the plan is ALPHA.' }]),
  JSON.stringify({ type: 'continued-in', sessionId: OLD, continuedInSessionId: NEW }),
].join('\n')
const newFile = [
  JSON.stringify({ type: 'ai-title', aiTitle: 'KIWI', sessionId: NEW }),
  msg('user', 10, 'where is NEEDLE-42?', { logicalParentUuid: 'u-10' }),
  msg('assistant', 11, [{ type: 'text', text: 'Checking the old file.' }]),
].join('\n')
const subagent = [
  msg('user', 1, 'Find the GRAPE-9 config', { isSidechain: true }),
  msg('assistant', 1, [{ type: 'text', text: 'GRAPE-9 lives in config.ts' }], { isSidechain: true }),
].join('\n')

function memoryIo(files: Record<string, string>): RecallIo & { reads: string[] } {
  const reads: string[] = []
  return {
    reads,
    read: async (path) => {
      reads.push(path)
      if (!(path in files)) throw new Error(`ENOENT: ${path}`)
      return files[path]!
    },
    list: async (dir) => {
      const names = Object.keys(files)
        .filter((p) => p.startsWith(`${dir}/`))
        .map((p) => p.slice(dir.length + 1).split('/')[0]!)
      return [...new Set(names)]
    },
    continuing: async (dir, names, id) => names.find((n) => files[`${dir}/${n}`]?.includes(`"continuedInSessionId":"${id}"`)),
  }
}
const chain = (extra: Record<string, string> = {}) =>
  memoryIo({ [`${DIR}/${OLD}.jsonl`]: oldFile, [`${DIR}/${NEW}.jsonl`]: newFile, [`${DIR}/cccccccc-3333-4333-8333-333333333333.jsonl`]: 'unrelated', ...extra })
const run = async (input: RecallInput, io = chain(), path = `${DIR}/${NEW}.jsonl`) => (await recall(await loadTranscript(io, path, { asking: true }), input)).text

describe('recall', () => {
  test('follows the continued-in chain back from the new file, and forward from the old one', async () => {
    const io = chain()
    const back = await run({ query: 'NEEDLE-42' }, io)
    expect(io.reads).toEqual([`${DIR}/${OLD}.jsonl`, `${DIR}/${NEW}.jsonl`])
    // The newest prompt asked, so it is no match; the replayed result after the compaction is read once.
    expect(back).toBe(
      '1 match(es) for "NEEDLE-42" in 6 blocks of 2 transcript files.\n' +
        `[aaaaaaaa:3 · 2026-09-22 ${hm(1)} · Bash result] 301 lines\n` +
        '  250: row 250 has the NEEDLE-42 marker\n' +
        'Only if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "aaaaaaaa:3", "lines": "240-260"}.',
    )
    const forward = await run({ query: '"plan is ALPHA"' }, chain(), `${DIR}/${OLD}.jsonl`)
    expect(forward).toMatch(/^1 match\(es\) for "plan is ALPHA" in 6 blocks of 2 transcript files\./)
    expect(await run({ mode: 'outline' }, chain(), `${DIR}/${OLD}.jsonl`)).toContain('bbbbbbbb:3')
  })

  test('a query alone searches, as before; a ref alone reads; nothing outlines', async () => {
    expect(parseInput({ query: 'x' })).toMatchObject({ mode: 'search', query: 'x' })
    expect(parseInput({ ref: 'aaaaaaaa:3' })).toMatchObject({ mode: 'read', ref: 'aaaaaaaa:3' })
    expect(parseInput({})).toMatchObject({ mode: 'outline' })
    expect(parseInput({ query: 'x', limit: 99 })).toMatchObject({ limit: 20 })
    expect(parseInput({ mode: 'search' })).toBe('om_recall: give a query.')
    expect(parseInput({ mode: 'nope' })).toBe('om_recall: mode is search, read or outline.')
    const found = await run({ query: 'kiwi job', limit: 5 })
    expect(found).toMatch(/^1 match\(es\) for "kiwi job" in 6 blocks of 2 transcript files\.\n\[aaaaaaaa:1 · [\d-]+ [\d:]+ · user\] 1 line\n  1: start the KIWI job\n/)
  })

  test("never matches the memory message, om_recall's own calls and results, or the prompt that asked", async () => {
    const found = await run({ query: 'KIWI' })
    expect(found).toContain('aaaaaaaa:1 ')
    expect(found).not.toContain('aaaaaaaa:4')
    expect(found).not.toContain('aaaaaaaa:5')
    expect(found).not.toContain('aaaaaaaa:7')
    expect(found).toMatch(/^1 match/)
    expect(await run({ query: '"where is NEEDLE"' })).toMatch(/^0 match/)
  })

  test('regex and quoted phrases', async () => {
    expect(await run({ query: '/needle-\\d+/' })).toMatch(/^1 match\(es\) for \/needle-\\d\+\/ in .*\n\[aaaaaaaa:3 [^\n]*\n  250: row 250 has the NEEDLE-42 marker/)
    expect(await run({ query: '/NEEDLE-4[0-9]/' })).toContain('250: row 250')
    expect(await run({ query: '/(unclosed/' })).toMatch(/^om_recall: not a valid regular expression/)
    expect(await run({ query: '"plan is ALPHA"' })).toContain('aaaaaaaa:10')
    // A phrase must appear as written: failing that, blocks holding some of the terms, chosen by the rarest.
    expect(await run({ query: '"ALPHA plan"' })).toMatch(/^0 match/)
    expect(await run({ query: 'ALPHA plan' })).toMatch(/^1 match/)
  })

  // A session of its own: one file, the given user and assistant rows, then the prompt that asked.
  const session = (rows: string[]) => memoryIo({ [`${DIR}/${NEW}.jsonl`]: [...rows, msg('user', 59, 'what happened?')].join('\n') })
  const result = (m: number, id: string, text: string) => [
    msg('assistant', m, [{ type: 'tool_use', id, name: 'Bash', input: { command: `run ${id}` } }]),
    msg('user', m, [{ type: 'tool_result', tool_use_id: id, content: text }]),
  ]

  test('search shows the lines holding the most and rarest terms, spread apart, cut around the rarest', async () => {
    const out = Array.from({ length: 300 }, (_, i) => {
      const n = i + 1
      if (n <= 5 || n === 280) return `import { it } from "vitest" // ${n}`
      if (n === 10 || n === 11) return `throw new Error("failed fixture ${n}")`
      if (n === 200) return ' FAIL vitest: 1 failed'
      if (n === 150) return `vitest ${'x'.repeat(600)} QUINCE-3 here`
      return `line ${n}`
    }).join('\n')
    const io = session(result(20, 'v1', out))
    expect(await run({ query: 'vitest failed' }, io)).toBe(
      `1 match(es) for "vitest failed" in 2 blocks of 1 transcript file.\n` +
        `[bbbbbbbb:2 · 2026-09-22 ${hm(20)} · Bash result] 300 lines\n` +
        '  10: throw new Error("failed fixture 10")\n' +
        '  200:  FAIL vitest: 1 failed\n' +
        '  280: import { it } from "vitest" // 280\n' +
        '  … 7 more matching lines\n' +
        'Only if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "bbbbbbbb:2", "lines": "190-210"}.',
    )
    // A long line is cut around its rarest term, not its first.
    expect(await run({ query: 'vitest QUINCE-3' }, session(result(20, 'v1', out)))).toContain(`  150: …${'x'.repeat(186)} QUINCE-3 here\n`)
  })

  test('search ranks blocks with the terms on one line above those that scatter them, newest first among equals', async () => {
    const io = session([
      ...result(20, 'a', 'Test Files 2 passed (2)'),
      ...result(21, 'b', 'Test the files\nnothing passed yet'),
      ...result(22, 'c', 'files to test\nall passed'),
    ])
    expect(await run({ query: 'test files passed', limit: 1 }, io)).toBe(
      '3 match(es) for "test files passed" in 6 blocks of 1 transcript file; showing 1, those with the most terms on one line.\n' +
        `[bbbbbbbb:2 · 2026-09-22 ${hm(20)} · Bash result] 1 line\n` +
        '  1: Test Files 2 passed (2)\n' +
        '2 more matches not shown; only if none above answers, narrow the query or give "from" or "to".\n' +
        'Only if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "bbbbbbbb:2", "lines": "1-1"}.',
    )
    // Blocks alike are cut newest first, and the older ones are one "to" away.
    const alike = session([...result(20, 'a', 'PEAR one'), ...result(21, 'b', 'PEAR two'), ...result(22, 'c', 'PEAR three')])
    expect(await run({ query: 'PEAR', limit: 2 }, alike)).toMatch(
      /^3 match\(es\) for "PEAR" in 6 blocks of 1 transcript file; showing 2, the newest\.\n[\s\S]*\n1 older match not shown; only if none above answers, repeat with "to": "bbbbbbbb:3"\.\n/,
    )
  })

  test('with no block holding every term, rare terms outrank common ones, and absent terms are named', async () => {
    const io = session([
      ...Array.from({ length: 8 }, (_, i) => msg('assistant', 20 + i, `the common path ${i}`)),
      msg('assistant', 30, 'RARE-9 was set'),
      ...Array.from({ length: 8 }, (_, i) => msg('assistant', 31 + i, `another common path ${i}`)),
    ])
    const found = await run({ query: 'common RARE-9 lunar checksum', limit: 2 }, io)
    expect(found.split('\n').slice(0, 3)).toEqual([
      '17 match(es) for "common RARE-9 lunar checksum" in 17 blocks of 1 transcript file; no block holds every term, so these hold some, chosen by the rarest; showing 2.',
      'No occurrences in this session of: lunar, checksum.',
      `[bbbbbbbb:9 · 2026-09-22 ${hm(30)} · assistant] 1 line`,
    ])
    // Nothing found says which terms are absent, so there is nothing to search again for.
    expect((await run({ query: 'lunar checksum' }, io)).split('\n')).toEqual(['0 match(es) for "lunar checksum" in 17 blocks of 1 transcript file.', 'No occurrences in this session of: lunar, checksum.'])
    expect((await run({ query: 'lunar checksum', from: 'bbbbbbbb:3' }, io)).split('\n')[1]).toBe('No occurrences in this range of: lunar, checksum.')
  })

  test('a compound term matches its parts when it appears nowhere whole, and is not called absent', async () => {
    const io = session([msg('assistant', 20, 'the RAW TRACE TOKEN is 7f3a'), msg('assistant', 21, 'nothing here')])
    const found = await run({ query: 'RAW_TOKEN' }, io)
    expect(found).toMatch(/^1 match\(es\) for "RAW_TOKEN" in 2 blocks of 1 transcript file; no block holds every term, so these hold some, chosen by the rarest\.\n\[bbbbbbbb:1 [^\n]*\n  1: the RAW TRACE TOKEN is 7f3a\n/)
    expect(await run({ query: 'RAW_TOKEN zebra' }, io)).toContain('\nNo occurrences in this session of: zebra.\n')
  })

  test('every mode keeps its whole response under one size cap', async () => {
    const wide = (n: number) => Array.from({ length: n }, (_, i) => `${i} ${'w'.repeat(900)}`).join('\n')
    const io = session([
      ...Array.from({ length: 6 }, (_, i) => msg('assistant', 20 + i, `before ${wide(8)}`)),
      ...result(30, 'big', wide(60)),
      ...Array.from({ length: 6 }, (_, i) => msg('assistant', 31 + i, `after ${wide(8)}`)),
    ])
    const read = await run({ ref: 'bbbbbbbb:8', before: 5, after: 5 }, io)
    expect(read.length).toBeLessThanOrEqual(16_000)
    expect(read).toContain('[bbbbbbbb:8 ')
    expect(read).toMatch(/\n… \d+ more lines \([\d,]+ characters\); only if you still need them: \{"mode": "read", "ref": "bbbbbbbb:8", "lines": "\d+-\d+"\}\./)
    expect(read).toContain('[bbbbbbbb:9 ')
    expect((await run({ query: 'w' }, io)).length).toBeLessThanOrEqual(16_000)
    expect((await run({ mode: 'outline' }, io)).length).toBeLessThanOrEqual(16_000)
  })

  test('a long argument is refused before it is searched or echoed', async () => {
    expect(await run({ query: 'x'.repeat(501) })).toBe('om_recall: query is at most 500 characters; search for its rarest words.')
    expect(await run({ ref: `aaaaaaaa:${'1'.repeat(600)}` })).toBe('om_recall: ref is at most 500 characters.')
  })

  test('after three om_recall calls in one turn, a reminder to answer from what was found', async () => {
    const recallRows = (n: number) =>
      Array.from({ length: n }, (_, i) => [
        msg('assistant', 40 + i, [{ type: 'tool_use', id: `r${i}`, name: 'mcp__observational-memory__om_recall', input: { query: 'PEAR' } }]),
        msg('user', 40 + i, [{ type: 'tool_result', tool_use_id: `r${i}`, content: 'found' }]),
      ]).flat()
    // This call, not yet answered, is in the transcript too.
    const pending = msg('assistant', 50, [{ type: 'tool_use', id: 'now', name: 'mcp__observational-memory__om_recall', input: { query: 'PEAR' } }])
    const turn = (n: number) => memoryIo({ [`${DIR}/${NEW}.jsonl`]: [msg('user', 1, 'the PEAR is ripe'), msg('user', 30, 'what about the PEAR?'), ...recallRows(n), pending].join('\n') })
    expect(await run({ query: 'PEAR' }, turn(2))).not.toContain('om_recall calls')
    expect((await run({ query: 'PEAR' }, turn(3))).split('\n').at(-1)).toBe('This is om_recall call 4 this turn: answer from what you have found unless a specific fact is still missing.')
    expect((await run({ ref: 'bbbbbbbb:1' }, turn(5))).split('\n').at(-1)).toBe('This is om_recall call 6 this turn: answer from what you have found unless a specific fact is still missing.')
  })

  test('read pages a long block with a continuation, and shows neighbours', async () => {
    const first = await run({ ref: 'aaaaaaaa:3' })
    const lines = first.split('\n')
    expect(lines[0]).toBe(`[aaaaaaaa:3 · 2026-09-22 ${hm(1)} · Bash result] lines 1-200 of 301 (call: aaaaaaaa:2.2)`)
    expect(lines[1]).toBe('   1 | row 1')
    expect(lines).toHaveLength(202)
    expect(lines.at(-1)).toBe('… 101 more lines (832 characters); only if you still need them: {"mode": "read", "ref": "aaaaaaaa:3", "lines": "201-301"}.')
    const rest = await run({ mode: 'read', ref: 'aaaaaaaa:3', lines: '201-' })
    expect(rest.split('\n')[0]).toContain('lines 201-301 of 301')
    expect(rest).toContain(' 250 | row 250 has the NEEDLE-42 marker')
    expect(rest).not.toContain('more line')
    expect(await run({ ref: 'aaaaaaaa:3', lines: '250' })).toBe(
      `[aaaaaaaa:3 · 2026-09-22 ${hm(1)} · Bash result] lines 250-250 of 301 (call: aaaaaaaa:2.2)\n 250 | row 250 has the NEEDLE-42 marker\n… 51 more lines (407 characters); only if you still need them: {"mode": "read", "ref": "aaaaaaaa:3", "lines": "251-301"}.`,
    )
    // A row holding several blocks: its reference alone finds the first.
    const call = await run({ ref: 'aaaaaaaa:2', after: 1 })
    expect(call.split('\n')[0]).toBe(`[aaaaaaaa:2.1 · 2026-09-22 ${hm(1)} · assistant] lines 1-1 of 1`)
    expect(call).toContain(`[aaaaaaaa:2.2 · 2026-09-22 ${hm(1)} · Bash call]\ncommand: cat big.txt`)
    expect(await run({ ref: 'aaaaaaaa:99' })).toMatch(/^om_recall: no block aaaaaaaa:99/)
    // A full session id works as the tag.
    expect(await run({ ref: `${OLD}:3`, lines: '1' })).toContain('row 1')
  })

  test('outline: one line per message and tool call, in order, without memory content or om_recall, paged', async () => {
    const all = await run({ mode: 'outline' })
    expect(all.split('\n')).toEqual([
      `Outline of 2 transcript files (aaaaaaaa → bbbbbbbb): 7 entries, 2026-09-22 ${hm(0)} to 2026-09-22 ${hm(11)}. Tool calls point → at their results; read a block only for what this lacks: {"mode": "read", "ref": "<ref>"}.`,
      '— 2026-09-22 —',
      `aaaaaaaa:1 ${hm(0)} USER: start the KIWI job`,
      `aaaaaaaa:2.1 ${hm(1)} ASSISTANT: Looking`,
      `aaaaaaaa:2.2 ${hm(1)} Bash: cat big.txt → aaaaaaaa:3 (301 lines)`,
      `aaaaaaaa:7 ${hm(3)} [compaction: memory message]`,
      `aaaaaaaa:10 ${hm(5)} ASSISTANT: After compaction, the plan is ALPHA.`,
      `bbbbbbbb:2 ${hm(10)} USER: where is NEEDLE-42?`,
      `bbbbbbbb:3 ${hm(11)} ASSISTANT: Checking the old file.`,
    ])
    const range = await run({ mode: 'outline', from: 'aaaaaaaa:2', to: hm(5) })
    expect(range).toContain('aaaaaaaa:2.1')
    expect(range).toContain('aaaaaaaa:10')
    expect(range).not.toContain('aaaaaaaa:1 ')
    expect(range).not.toContain('bbbbbbbb:2')
    // A bound on a row that holds no block (the compaction boundary) starts at the next block.
    expect((await run({ mode: 'outline', from: 'aaaaaaaa:6' })).split('\n')[2]).toBe(`aaaaaaaa:7 ${hm(3)} [compaction: memory message]`)
    // Paging: past the cap, a continuation from the next entry.
    const many = Array.from({ length: 150 }, (_, i) => msg('user', 20, `prompt ${i}`)).join('\n')
    const paged = await run({ mode: 'outline' }, memoryIo({ [`${DIR}/${NEW}.jsonl`]: many }))
    expect(paged.split('\n')).toHaveLength(1 + 120 + 1)
    expect(paged.split('\n').at(-1)).toBe('31 more entries; only if you still need them: {"mode": "outline", "from": "bbbbbbbb:120"}.')
  })

  test('subagent transcripts: listed, searched with the flag, outlined by their tag', async () => {
    const sub = `${DIR}/${OLD}/subagents`
    const io = () =>
      chain({ [`${sub}/agent-a1b2c3d4e5f6a7b8c.jsonl`]: subagent, [`${sub}/agent-a1b2c3d4e5f6a7b8c.meta.json`]: JSON.stringify({ agentType: 'Explore', description: 'find config', toolUseId: 'u1' }) })
    expect(await run({ query: 'GRAPE-9' }, io())).toBe('0 match(es) for "GRAPE-9" in 6 blocks of 2 transcript files.\n1 subagent transcript not searched: repeat with "subagents": true.')
    const found = await run({ query: 'GRAPE-9', subagents: true }, io())
    expect(found).toContain('2 match(es) for "GRAPE-9" in 8 blocks of 2 transcript files and 1 subagent transcript.')
    expect(found).toContain('[a1b2c3d4:2 ')
    expect(await run({ mode: 'outline' }, io())).toContain('Bash: cat big.txt → aaaaaaaa:3 (301 lines) [subagent a1b2c3d4]')
    expect(await run({ mode: 'outline', ref: 'a1b2c3d4' }, io())).toContain(`a1b2c3d4:1 ${hm(1)} USER: Find the GRAPE-9 config`)
    expect(await run({ ref: 'a1b2c3d4:2' }, io())).toContain('GRAPE-9 lives in config.ts')
    // A reference bound in the main thread bounds a subagent's by time: up to the block after it, not at it.
    expect(await run({ query: 'GRAPE-9', subagents: true, to: 'aaaaaaaa:3' }, io())).toMatch(/^2 match/)
    expect(await run({ query: 'GRAPE-9', subagents: true, to: 'aaaaaaaa:2.2' }, io())).toMatch(/^0 match/)
  })

  test('the live history, with no file: rows addressed by index', async () => {
    const c = liveTranscript(
      [
        { role: 'user', text: 'remember MANGO', toolUses: [] },
        { role: 'assistant', text: '', toolUses: [{ tool_use_id: 't', tool: 'Read', input: { file_path: '/a.ts' } }] },
        { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 't', text: 'MANGO = 1', isError: false }] },
        { role: 'user', text: 'where is MANGO?', toolUses: [] },
      ],
      [],
      true,
    )
    const found = (await recall(c, { query: 'MANGO' })).text
    expect(found).toBe(
      '2 match(es) for "MANGO" in 3 blocks of the live history (only the newest 4 messages of the live history are readable).\n' +
        '[#0 · user] 1 line\n  1: remember MANGO\n[#2 · Read result] 1 line\n  1: MANGO = 1\nOnly if an excerpt is not enough, read just the lines you need: {"mode": "read", "ref": "#2", "lines": "1-1"}.',
    )
    expect((await recall(c, { ref: '#1' })).text).toBe('[#1 · Read call] lines 1-1 of 1 (result: #2)\n   1 | file_path: /a.ts')
  })

  test('legacy: v0.4.9 search over one file', () => {
    expect(legacyRecall(oldFile, 'plan alpha')).toMatch(/^1 match\(es\) for "plan alpha" in \d+ messages\.\n\[#\d+ assistant [\d-]+ [\d:]+\] After compaction, the plan is ALPHA\.$/)
  })

  // The real chain Claude Code moved a crewmate session across, copied to /tmp/om-recall/chain and turned into a
  // gitignored module by scripts/make-recall-fixture.ts. Without it the test has nothing to read and passes.
  test('a real moved session: both files, compaction replays read once, blocks readable in full', { timeoutMs: 60_000 }, async () => {
    const fx = (await import('./fixtures/recall-chain.local').catch(() => undefined)) as { files: Record<string, string> } | undefined
    if (!fx) return
    const io = memoryIo(Object.fromEntries(Object.entries(fx.files).map(([k, v]) => [`/c/${k}`, v])))
    const c = await loadTranscript(io, '/c/b8d50671-d9df-4001-9679-8d1ba9ec834c.jsonl', { asking: true })
    const outline = (await recall(c, { mode: 'outline', from: 'a79f045b:2108', to: 'b8d50671:65' })).text
    expect(outline).toMatch(/^Outline of 2 transcript files \(a79f045b → b8d50671\): [\d,]+ entries,.*; 1 subagent transcript \(af4c8dc0\)\./)
    expect(outline).toContain('a79f045b:2134')
    expect(outline).toContain('b8d50671:62')
    // What the compaction wrote again after its boundary is read once, where it first was.
    expect(outline).not.toContain('a79f045b:2140')
    expect(outline).not.toContain('(no content)')
    const found = (await recall(c, { query: '"Test Files" passed' })).text
    expect(found).toMatch(/^\d+ match\(es\) for ""Test Files" passed" in [\d,]+ blocks of 2 transcript files\./)
    expect(found).toContain('[a79f045b:1902 ')
    expect(found).toContain('[b8d50671:')
    // vitest's colour codes are gone, so its summary line reads, and matches, as printed.
    expect((await recall(c, { query: '"Test Files 10 passed"', to: 'b8d50671:147' })).text).toContain('  61: Test Files 10 passed (10)')
    const page = (await recall(c, { ref: 'a79f045b:73' })).text
    expect(page.split('\n')[0]).toMatch(/^\[a79f045b:73 · .* · Bash result\] lines 1-\d+ of 748 \(call: a79f045b:70\)$/)
    expect(page.split('\n').at(-1)).toMatch(/^… \d+ more lines \([\d,]+ characters\); only if you still need them: \{"mode": "read", "ref": "a79f045b:73", "lines": "\d+-\d+"\}\.$/)
    expect(page.length).toBeLessThan(14_000)
    // In a long result, the line holding every term shows, not the first lines holding one.
    expect((await recall(c, { query: 'Test Files passed' })).text).toContain('\n  55:  Test Files 1 failed | 1 passed (2)\n')
    const wide = (await recall(c, { ref: 'a79f045b:73', before: 5, after: 5 })).text
    expect(wide.length).toBeLessThanOrEqual(16_000)
    expect(wide).toContain('[a79f045b:78 ')
    expect((await recall(c, { query: 'gorman lunar checksum' })).text.split('\n')[1]).toBe('No occurrences in the main transcript of: lunar, checksum.')
    expect((await recall(c, { query: 'plan', subagents: true })).text).toContain('and 1 subagent transcript')
  })
})
