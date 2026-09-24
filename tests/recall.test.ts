import { describe, expect, test } from 'claude-code/testing'
import { MEMORY_HEADER } from '../hooks/prompts'
import { legacyRecall } from './eval/legacy-recall'
import { liveTranscript, loadTranscript, parseInput, recall, refsOf } from '../hooks/recall'
import type { SessionMessage } from 'claude-code'
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

// The test runner prints what a test file logs; the hooks module's own globals have no console.
declare const console: { warn: (message: string) => void }
const realChain = await import('./fixtures/recall-chain.local').then(
  (m: { files: Record<string, string> }) => m.files,
  (error: unknown) => (String(error).includes('no such file') ? undefined : error instanceof Error ? error : new Error(String(error))),
)

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

  // A chain of N files, each continuing into the next; io.reads records only the files actually read.
  const forwardChain = (n: number) => {
    const ids = Array.from({ length: n }, (_, i) => `f${i}`)
    const files: Record<string, string> = {}
    ids.forEach((id, i) => {
      const rows = [msg('user', i, `chunk ${id}`)]
      if (i < n - 1) rows.push(JSON.stringify({ type: 'continued-in', sessionId: id, continuedInSessionId: ids[i + 1] }))
      files[`${DIR}/${id}.jsonl`] = rows.join('\n')
    })
    return { io: memoryIo(files), path: `${DIR}/${ids[0]}.jsonl`, ids }
  }

  test('a chain longer than the file cap is read only up to the cap, and the coverage gap is reported', async () => {
    const { io, path } = forwardChain(50) // comfortably longer than any reasonable cap
    const corpus = await loadTranscript(io, path, { asking: true })
    // Only files actually read are counted; the count matches the reads made, short of the whole chain.
    expect(corpus.files.length).toBeLessThan(50)
    expect(io.reads.length).toBe(corpus.files.length)
    expect(corpus.note).toMatch(new RegExp(`${corpus.files.length}`))
    const found = await recall(corpus, { mode: 'search', query: 'chunk', subagents: false })
    expect(found.text).toContain(`(${corpus.note})`)
    const outlined = await recall(corpus, { mode: 'outline' })
    expect(outlined.text).toContain(`(${corpus.note})`)
  })

  test('a chain within the cap has no coverage note', async () => {
    const { io, path } = forwardChain(3)
    const corpus = await loadTranscript(io, path, { asking: true })
    expect(corpus.files.length).toBe(3)
    expect(corpus.note).toBeUndefined()
  })

  test('a chain file that fails to read stops the chain there, without losing what was already read', async () => {
    const { io: inner, ids } = forwardChain(3)
    const io: RecallIo = { ...inner, read: async (p) => (p.endsWith(`${ids[2]}.jsonl`) ? Promise.reject(new Error('EACCES')) : inner.read(p)) }
    const corpus = await loadTranscript(io, `${DIR}/${ids[0]}.jsonl`, { asking: true })
    expect(corpus.files).toEqual([ids[0], ids[1]])
    expect(corpus.main.blocks.some((b) => b.text === `chunk ${ids[0]}`)).toBe(true)
    expect(corpus.note).toMatch(/could not (be )?read/)
  })

  test('an unreadable predecessor leaves a gap behind it, but the requested file and anything after it still load', async () => {
    const { io: inner, ids } = forwardChain(3)
    const io: RecallIo = { ...inner, read: async (p) => (p.endsWith(`${ids[0]}.jsonl`) ? Promise.reject(new Error('EACCES')) : inner.read(p)) }
    // f0 -> f1 -> f2, requested from the middle file f1: f0 is an older predecessor, unreadable.
    const corpus = await loadTranscript(io, `${DIR}/${ids[1]}.jsonl`, { asking: true })
    expect(corpus.files).toEqual([ids[1], ids[2]])
    expect(corpus.main.blocks.some((b) => b.text === `chunk ${ids[1]}`)).toBe(true)
    expect(corpus.main.blocks.some((b) => b.text === `chunk ${ids[2]}`)).toBe(true)
    expect(corpus.main.blocks.some((b) => b.text === `chunk ${ids[0]}`)).toBe(false)
    expect(corpus.note).toMatch(/could not (be )?read/)
  })

  test('a failure discovering a predecessor, not just reading one, is also reported as an unreadable link', async () => {
    const { io: inner, ids } = forwardChain(3)
    const io: RecallIo = { ...inner, continuing: async () => Promise.reject(new Error('EACCES')) }
    // Requested from the newest file: looking back for its predecessor fails before any file content is unreadable.
    const corpus = await loadTranscript(io, `${DIR}/${ids[2]}.jsonl`, { asking: true })
    expect(corpus.files).toEqual([ids[2]])
    expect(corpus.main.blocks.some((b) => b.text === `chunk ${ids[2]}`)).toBe(true)
    expect(corpus.note).toMatch(/could not (be )?read/)
  })

  test('a directory that cannot be listed reports that chain discovery failed', async () => {
    const inner = chain()
    const io: RecallIo = { ...inner, list: async () => Promise.reject(new Error('EACCES')) }
    const corpus = await loadTranscript(io, `${DIR}/${NEW}.jsonl`, { asking: true })
    expect(corpus.files).toEqual(['bbbbbbbb'])
    expect(corpus.note).toMatch(/discover|list/)
  })

  test('a query alone searches, as before; a ref alone reads; nothing outlines', async () => {
    expect(parseInput({ query: 'x' })).toMatchObject({ mode: 'search', query: 'x' })
    expect(parseInput({ ref: 'aaaaaaaa:3' })).toMatchObject({ mode: 'read', ref: 'aaaaaaaa:3' })
    expect(parseInput({})).toMatchObject({ mode: 'outline' })
    expect(parseInput({ query: 'x', limit: 99 })).toMatchObject({ limit: 20 })
    expect(parseInput({ mode: 'search' })).toBe('om_recall: give a query.')
    expect(parseInput({ mode: 'nope' })).toBe('om_recall: mode is search, read, outline or files.')
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

  test('the asking message is excluded whole: every part of it, not just its last block', async () => {
    const io = memoryIo({ [`${DIR}/${NEW}.jsonl`]: msg('user', 1, [{ type: 'text', text: 'where is NEEDLE-42?' }, { type: 'text', text: 'also check GIZMO-7' }]) })
    expect(await run({ query: 'NEEDLE-42' }, io)).toMatch(/^0 match/)
    expect(await run({ query: 'GIZMO-7' }, io)).toMatch(/^0 match/)
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
  const boundary = (id: string) => JSON.stringify({ type: 'system', subtype: 'compact_boundary', uuid: id })
  const memory = (m: number) => msg('user', m, `${MEMORY_HEADER}\n\n<observations>\n* noted\n</observations>`)

  test('replay is recognized by content still in the model’s context, not by matching anywhere in the session', async () => {
    // A later, genuinely new message repeats an earlier one's exact text. It is not the compaction's copy of it (the
    // content between the two boundaries holds no such copy), so content equality alone must not delete it.
    const newEvent = [
      msg('user', 1, 'the MANGO plan is set'),
      boundary('b-1'),
      memory(2),
      msg('assistant', 3, 'noted'),
      boundary('b-2'),
      memory(4),
      msg('user', 5, 'the MANGO plan is set'),
    ]
    expect(await run({ query: 'MANGO' }, session(newEvent))).toMatch(/^2 match/)

    // A message kept across two compactions: the second boundary's copy of it is still the same one event.
    const keptTwice = [
      msg('user', 1, 'the KIWI plan is set'),
      boundary('c-1'),
      memory(2),
      msg('user', 1, 'the KIWI plan is set'), // the first boundary's copy
      msg('assistant', 3, 'noted'),
      boundary('c-2'),
      memory(4),
      msg('user', 1, 'the KIWI plan is set'), // the second boundary's copy of the still-kept message
      msg('assistant', 3, 'noted'), // the second boundary's copy of the still-kept reply
    ]
    expect(await run({ query: 'KIWI' }, session(keptTwice))).toMatch(/^1 match/)
  })

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

  test('a quoted phrase matches across any run of whitespace, as aligned command output spaces its words', async () => {
    const io = () => session([...result(20, 'v', ' Test Files  10 passed (10)\n      Tests  110 passed (110)')])
    expect(await run({ query: '"Test Files 10 passed"' }, io())).toMatch(/^1 match\(es\) for "Test Files 10 passed" in [^\n]*\n\[bbbbbbbb:2 [^\n]*\n {2}1: {2}Test Files 10 passed \(10\)\n/)
    expect(await run({ query: '"tests   110\tpassed"' }, io())).toMatch(/^1 match\(es\)[^\n]*\n\[bbbbbbbb:2 [^\n]*\n {2}2: {2}Tests 110 passed \(110\)\n/)
    expect(await run({ query: '"Files 10passed"' }, io())).toMatch(/^0 match/)
  })

  test('a phrase across a newline, or split only by the display wrap, is excerpted at its real location', async () => {
    // The phrase is one real event, written across two lines; the excerpt must show where it actually is, not a
    // default first line.
    const io = session([msg('assistant', 20, 'preface\nthe ALPHA\nplan is set\ntrailer')])
    const across = await run({ query: '"ALPHA plan"' }, io)
    expect(across).toMatch(/^1 match/)
    expect(across).toContain('2-3: the ALPHA plan is set')

    // A single long line, wrapped only for display at WRAP characters, with the phrase straddling that cut.
    const long = `${'A'.repeat(990)} ALPHA plan ${'B'.repeat(50)}`
    const wrapped = await run({ query: '"ALPHA plan"' }, session([msg('assistant', 20, long)]))
    expect(wrapped).toMatch(/^1 match/)
    expect(wrapped).toContain('1-2: ')
    expect(wrapped).toContain('ALPHA plan')
    expect(wrapped).not.toMatch(/1: {2}A{100}/) // not a default cut from the line's own start
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

  // recall-required.om-recall.new.r3: `shard-101` showed lines 10 and 19, whose byte counts hold 101 inside 101047290
  // and 101989851, beside line 101, the only one that holds shard-101, with "10 more matching lines" after it.
  test('a line that holds a compound term whole outranks lines that hold only its parts', async () => {
    const regions = ['eu-west-2', 'us-east-1', 'ap-south-1', 'eu-central-1']
    // tests/eval/scenarios.ts's shards.sh, its checksums made up.
    const audit = Array.from({ length: 200 }, (_, k) => {
      const n = k + 1
      const i = String(n).padStart(3, '0')
      return `shard-${i} region=${regions[n % 4]} objects=${(n * 7919) % 90000 + 10000} bytes=${(n * 104729) % 900000000 + 100000000} replicas=${(n % 3) + 2} checksum=ck-${i}0000000000000 status=verified`
    })
    const io = () => session(result(20, 'shards', [...audit, 'audit complete: 200 shards verified'].join('\n')))
    const found = await run({ query: 'shard-101' }, io())
    expect(found).toContain('  101: shard-101 region=us-east-1 objects=89819 ')
    expect(found).not.toMatch(/\n {2}(10|19): /)
    expect(found).not.toContain('more matching line')
    // A compound no line holds whole is still excerpted by its parts.
    expect(await run({ query: 'shard-verified' }, io())).toMatch(/\n {2}1: shard-001 [^\n]*\n[^\n]*\n[^\n]*\n  … 198 more matching lines\n/)
  })

  test('files: each file the session read, edited or wrote, newest first, with the blocks that touched it', async () => {
    const tool = (m: number, id: string, name: string, input: Record<string, unknown>, text: string, error = false) => [
      msg('assistant', m, [{ type: 'tool_use', id, name, input }]),
      msg('user', m, [{ type: 'tool_result', tool_use_id: id, content: text, ...(error ? { is_error: true } : {}) }]),
    ]
    const rows = [
      ...tool(1, 't1', 'Read', { file_path: '/p/src/a.ts' }, '1\tconst a = 1'), // lines 1-2
      ...tool(2, 't2', 'Edit', { file_path: '/p/src/a.ts', old_string: '1', new_string: '2' }, 'updated'), // 3-4
      ...tool(3, 't3', 'Write', { file_path: '/p/notes.md', content: 'x' }, 'File created successfully at: /p/notes.md'), // 5-6
      ...tool(4, 't4', 'Edit', { file_path: '/p/missing.ts', old_string: 'a', new_string: 'b' }, 'File does not exist.', true), // 7-8
      ...tool(5, 't5', 'Bash', { command: 'cat /p/src/a.ts' }, 'const a = 2'), // 9-10
      ...tool(6, 't6', 'Read', { file_path: '/p/src/a.ts' }, '1\tconst a = 2'), // 11-12
      ...tool(7, 't7', 'mcp__observational-memory__om_recall', { mode: 'files' }, 'files'), // 13-14
    ]
    const listed = await run({ mode: 'files' }, session(rows))
    expect(listed.split('\n')).toEqual([
      'Files named by the Read, Edit, MultiEdit, Write, NotebookRead, NotebookEdit calls of 1 transcript file (bbbbbbbb), newest first: 3 files. Read a block for what a call did: {"mode": "read", "ref": "<ref>"}.',
      '/p/src/a.ts: read bbbbbbbb:1, bbbbbbbb:11; edited bbbbbbbb:3',
      '/p/missing.ts: edit failed bbbbbbbb:7',
      '/p/notes.md: wrote bbbbbbbb:5',
    ])
    // A query narrows the list to the paths that hold it.
    expect(await run({ mode: 'files', query: 'notes' }, session(rows))).toContain('1 file whose path holds "notes"')
    expect(await run({ mode: 'files', query: 'notes' }, session(rows))).not.toContain('a.ts')

    // Many files and many touches stay within the bounds: the oldest refs of a file are counted, the oldest files too.
    const many = Array.from({ length: 300 }, (_, k) => tool(k % 50, `m${k}`, 'Read', { file_path: `/p/dir/file-${k % 150}.ts` }, 'x')).flat()
    const big = await run({ mode: 'files' }, session(many))
    expect(big.length).toBeLessThan(16_000)
    expect(big).toMatch(/^Files named by .*: 150 files\./)
    expect(big).toMatch(/\n\d+ more files; narrow with a query: \{"mode": "files", "query": "<part of a path>"\}\.$/)
    const reads = Array.from({ length: 12 }, (_, k) => tool(k, `r${k}`, 'Read', { file_path: '/p/hot.ts' }, 'x')).flat()
    expect(await run({ mode: 'files' }, session(reads))).toContain('/p/hot.ts: read (+7 earlier) bbbbbbbb:15, bbbbbbbb:17, bbbbbbbb:19, bbbbbbbb:21, bbbbbbbb:23')
  })

  test("refsOf: a compacted row's block, by its tool call's id or its text; none for the live history", async () => {
    const sub = `${DIR}/${NEW}/subagents`
    const rows = [
      msg('user', 1, 'start the PEAR job'), // line 1
      msg('assistant', 2, [{ type: 'text', text: 'Running it.' }]), // 2
      msg('assistant', 2, [{ type: 'tool_use', id: 'p1', name: 'Bash', input: { command: 'make pear' } }]), // 3
      msg('user', 3, [{ type: 'tool_result', tool_use_id: 'p1', content: 'ok' }]), // 4
    ]
    const io = memoryIo({
      [`${DIR}/${NEW}.jsonl`]: rows.join('\n'),
      [`${sub}/agent-a1b2c3d4e5f6a7b8c.jsonl`]: [msg('assistant', 4, [{ type: 'tool_use', id: 's1', name: 'Read', input: { file_path: '/p/x' } }], { isSidechain: true })].join('\n'),
    })
    const corpus = await loadTranscript(io, `${DIR}/${NEW}.jsonl`)
    const live: SessionMessage[] = [
      { role: 'user', text: 'start the PEAR job', toolUses: [] },
      { role: 'assistant', text: 'Running it.', toolUses: [{ tool_use_id: 'p1', tool: 'Bash', input: { command: 'make pear' } }] },
      { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'p1', text: 'ok', isError: false }] },
      { role: 'assistant', text: 'Not in the file.', toolUses: [] },
    ]
    const refOf = await refsOf(corpus, live)
    expect([refOf(0), refOf(1), refOf(1, 'p1'), refOf(3), refOf(1, 'nope')]).toEqual(['bbbbbbbb:1', 'bbbbbbbb:2', 'bbbbbbbb:3', undefined, undefined])
    // A subagent's rows are found in its own transcript.
    expect((await refsOf(corpus, [], 'a1b2c3d4e5f6a7b8c'))(0, 's1')).toBe('a1b2c3d4:1')
    expect((await refsOf(liveTranscript(live, [], false), live))(1, 'p1')).toBeUndefined()
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
    expect(await run({ query: 'GRAPE-9' }, io())).toBe(
      '0 match(es) for "GRAPE-9" in 6 blocks of 2 transcript files.\n' +
        'No occurrences in the main transcript of: grape-9.\n' +
        '1 subagent transcript not searched: repeat with "subagents": true.',
    )
    const found = await run({ query: 'GRAPE-9', subagents: true }, io())
    expect(found).toContain('2 match(es) for "GRAPE-9" in 8 blocks of 2 transcript files and 1 subagent transcript.')
    expect(found).toContain('[a1b2c3d4:2 ')
    expect(await run({ mode: 'outline' }, io())).toContain('Bash: cat big.txt → aaaaaaaa:3 (301 lines) [subagent a1b2c3d4]')
    expect(await run({ mode: 'outline', ref: 'a1b2c3d4' }, io())).toContain(`a1b2c3d4:1 ${hm(1)} USER: Find the GRAPE-9 config`)
    expect(await run({ ref: 'a1b2c3d4:2' }, io())).toContain('GRAPE-9 lives in config.ts')
    // A reference bound in the main thread bounds a subagent's by time: up to the block after it, not at it.
    expect(await run({ query: 'GRAPE-9', subagents: true, to: 'aaaaaaaa:3' }, io())).toMatch(/^2 match/)
    expect(await run({ query: 'GRAPE-9', subagents: true, to: 'aaaaaaaa:2.2' }, io())).toMatch(/^0 match/)
    // Subagents are excluded whether or not the main transcript alone found something: a match there is not proof
    // there is nothing more in the transcripts left unsearched.
    const foundInMain = await run({ query: '"plan is ALPHA"' }, io())
    expect(foundInMain).toContain('1 subagent transcript not searched: repeat with "subagents": true.')
  })

  test('an absent term gets a scoped statement even alone, naming what was excluded, not proof the event never happened', async () => {
    // GRAPE-9 exists only in the excluded subagent transcript: the statement must not read as a claim it never
    // happened anywhere, only that it was not found in what this search actually covered.
    const sub = `${DIR}/${OLD}/subagents`
    const io = chain({ [`${sub}/agent-a1b2c3d4e5f6a7b8c.jsonl`]: subagent, [`${sub}/agent-a1b2c3d4e5f6a7b8c.meta.json`]: JSON.stringify({ agentType: 'Explore', toolUseId: 'u1' }) })
    const found = await run({ query: 'GRAPE-9' }, io)
    expect(found).toContain('No occurrences in the main transcript of: grape-9.')
    expect(found).toContain('subagent transcript not searched')
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

  // The real chain Claude Code moved a crewmate session across, copied to /tmp/om-recall/chain and cut down to the rows
  // this test reads, in a gitignored module, by scripts/make-recall-fixture.ts. Without it the test is skipped, saying
  // so; a module the harness will not import fails it.
  const REAL = 'a real moved session: both files, compaction replays read once, blocks readable in full'
  if (!realChain) console.warn(`SKIP recall > ${REAL}: no tests/fixtures/recall-chain.local.ts; bun scripts/make-recall-fixture.ts writes it`)
  else test(REAL, { timeoutMs: 60_000 }, async () => {
    if (realChain instanceof Error) throw realChain
    const io = memoryIo(Object.fromEntries(Object.entries(realChain).map(([k, v]) => [`/c/${k}`, v])))
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
    expect((await recall(c, { query: '"Test Files 10 passed"', to: 'b8d50671:147' })).text).toContain('  61:  Test Files 10 passed (10)')
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
