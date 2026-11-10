import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { HttpResponse, On } from 'claude-code'
import { loadTranscript, recall } from '../hooks/recall'
import type { RecallInput } from '../hooks/recall'
import { EMBER_KEY_PATH, ember, httpError, memoryIo, world } from './harness'

// om_recall's librarian: Ember points at lines of a search's best hits, and code pastes them, each grown to its unit.
const PATH = '/t/aaaaaaaa-1111-4111-8111-111111111111.jsonl'
const SUBAGENTS = '/t/aaaaaaaa-1111-4111-8111-111111111111/subagents'
const RECALL = 'mcp__observational-memory__om_recall'
const T = (m: number) => new Date(Date.UTC(2026, 8, 22, 12, m)).toISOString()
const row = (type: 'user' | 'assistant', m: number, content: unknown, extra: Record<string, unknown> = {}) => JSON.stringify({ type, timestamp: T(m), message: { role: type, content }, ...extra })
const use = (id: string, name: string, input: Record<string, unknown>) => [{ type: 'tool_use', id, name, input }]
const result = (id: string, content: string) => [{ type: 'tool_result', tool_use_id: id, content, is_error: false }]

const STANDARD = [
  '# Standards', // 1
  'Read before any PR.',
  '## PR body standard', // 3
  'The PLUM PR body has:',
  '- Summary of the change', // 5
  '- Evidence with numbers',
  '- Known gaps', // 7
  '## Release',
  'Ship it on a weekday.', // 9
  'Ask in the channel first.',
  'Wait for the green build.', // 11
  'Then run:',
  '```bash', // 13
  'bun scripts/deploy.ts \\',
  '  --channel stable', // 15
  '```',
  'Then tag it.', // 17
].join('\n')
const COMMAND = "gh-axi pr create \\\n  --title 'PLUM brief' \\\n  --body-file brief.md"

// The session's transcript: a prompt, a Bash call (row 2) and its result (3), a Read call (4) of the standard (5),
// then `more` rows and the prompt that asks.
const transcript = (more: string[] = []) =>
  [
    row('user', 0, 'write the PLUM brief'),
    row('assistant', 1, use('b1', 'Bash', { command: COMMAND, description: 'Open the PR' })),
    row('user', 1, result('b1', 'https://github.com/acme/app/pull/7')),
    row('assistant', 2, use('r1', 'Read', { file_path: '/docs/STANDARD.md' })),
    row('user', 2, result('r1', STANDARD)),
    ...more,
    row('user', 9, 'where did the PLUM PR go?'),
  ].join('\n') + '\n'

const reply = (ranges: { ref: string; from: number; to: number }[], answer = 'The lines that answer it.') => JSON.stringify({ found: true, answer, ranges })

// A session whose transcript file holds `text` (and `extra` files), Ember answering the librarian with `librarian`.
async function session($: Engine, on: On, text: string, librarian?: (prompt: string) => string | HttpResponse | Error | Promise<never>, extra: Record<string, string> = {}) {
  const clock = mock.clock(on)
  const w = world(on)
  Object.assign(w.files, { [PATH]: text, ...extra })
  const seen = ember(on, librarian ? { librarian } : {})
  on('classic.Stop', () => ({}))
  await $.classic.Stop({ session_id: 'session-1', transcript_path: PATH, stop_hook_active: false })
  const search = async (input: RecallInput) => String((await $.tool.call({ tool: RECALL, ...input })).result)
  return { clock, seen, search, ...w }
}

// The search's answer without the librarian, as om_recall gave it before.
async function today(text: string, input: RecallInput, extra: Record<string, string> = {}) {
  return (await recall(await loadTranscript(memoryIo({ [PATH]: text, ...extra }), PATH, { asking: true }), input)).text
}

// Each `   n | line` pasted under `[ref] lines`, as [ref, n, line].
const pastedLines = (text: string) => {
  const out: [string, number, string][] = []
  let ref = ''
  for (const l of text.split('\n')) {
    const head = l.match(/^\[([\w-]+:[\d.]+)\] lines \d+-\d+/)
    if (head) ref = head[1]!
    const m = l.match(/^ *(\d+) \| (.*)$/)
    if (m && ref) out.push([ref, Number(m[1]), m[2]!])
    if (!l.trim()) ref = ''
  }
  return out
}

describe('register: librarian', () => {
  test("pastes the lines Ember points at, exactly as the block holds them, then the search's head and its other hits", async ($, on) => {
    const { clock, seen, search, files } = await session($, on, transcript(), () => reply([{ ref: 'aaaaaaaa:5', from: 6, to: 6 }], 'The standard lists\nthree parts.'))

    const found = await search({ query: 'PLUM', need: 'write the PR body to the standard' })

    const body = seen.librarianCalls[0]!.body
    expect(body).toMatchObject({ model: 'muse-ember-1.0', reasoning: { effort: 'low' }, store: false, prompt_cache_key: 'om-librarian', prompt_cache_retention: '24h' })
    expect(body.text).toMatchObject({ format: { type: 'json_schema', name: 'librarian', strict: true } })
    // The need goes to Ember with the query, and every block with its lines numbered.
    expect(seen.librarian[0]).toStartWith('What the agent said it will do with the result:\nwrite the PR body to the standard\n\nIts search query: PLUM\n\n')
    expect(seen.librarian[0]).toContain('=== block aaaaaaaa:5: result of Read (17 lines) ===\n   1 | # Standards\n   2 | Read before any PR.\n')
    // The answer on one line, then the list Ember pointed into, whole, with a line each way.
    expect(found).toStartWith('The standard lists three parts.\n\n[aaaaaaaa:5] lines 4-8\n   4 | The PLUM PR body has:\n   5 | - Summary of the change\n   6 | - Evidence with numbers\n   7 | - Known gaps\n   8 | ## Release\n\n3 match(es) for "PLUM" in ')
    const lines = STANDARD.split('\n')
    expect(pastedLines(found).map(([, n, l]) => [n, l])).toEqual([4, 5, 6, 7, 8].map((n) => [n, lines[n - 1]]))
    // The hits not pasted stay listed, each by its head and best line, so any of them can be read.
    expect(found).toMatch(/\nOther hits, not pasted above; read one with \{"mode": "read", "ref": …\}:\n\[aaaaaaaa:1 · [^\]]+ · user\] 1 line\n  1: write the PLUM brief\n\[aaaaaaaa:2 · [^\]]+ · Bash call\] 4 lines\n  2: /)
    expect(found).not.toContain('[aaaaaaaa:5 ·')
    await clock.advance(5_000)
    const stats = JSON.parse(files['/stats/session-1.json']!) as { metrics: Record<string, { count: number; sum: number }> }
    expect(stats.metrics['librarian.search.ms']?.count).toBe(1)
    expect(stats.metrics['librarian.search.cost']?.sum).toBeGreaterThan(0)
    expect(stats.metrics['recall.matches']).toMatchObject({ count: 1, sum: 3 })
  })

  test('grows each range to its whole unit: the section of a heading, a fenced block, the whole command of a call', async ($, on) => {
    const { seen, search } = await session($, on, transcript(), () =>
      reply([
        { ref: 'aaaaaaaa:5', from: 3, to: 3 },
        { ref: 'aaaaaaaa:5', from: 15, to: 15 },
        { ref: 'aaaaaaaa:2', from: 2, to: 2 },
      ]),
    )

    const found = await search({ query: 'PLUM' })

    expect(seen.librarian[0]).toStartWith('What the agent said it will do with the result:\n(not said)\n\nIts search query: PLUM\n\n')
    const units = found.split('\n\n').filter((p) => p.startsWith('['))
    expect(units.map((u) => u.split('\n')[0])).toEqual(['[aaaaaaaa:5] lines 2-8', '[aaaaaaaa:5] lines 12-17', '[aaaaaaaa:2] lines 1-4'])
    expect(units[1]).toContain('  13 | ```bash\n  14 | bun scripts/deploy.ts \\\n  15 |   --channel stable\n  16 | ```')
    expect(units[2]).toBe("[aaaaaaaa:2] lines 1-4\n   1 | command: gh-axi pr create \\\n   2 |   --title 'PLUM brief' \\\n   3 |   --body-file brief.md\n   4 | description: Open the PR")
  })

  test("a matched result goes to Ember with the call that made it, which it can point into", async ($, on) => {
    const { seen, search } = await session($, on, transcript(), () => reply([{ ref: 'aaaaaaaa:2', from: 1, to: 1 }]))

    const found = await search({ query: 'pull/7' })

    // Only the result holds the term; its call follows it, labelled as its pair.
    expect(seen.librarian[0]).toContain('=== block aaaaaaaa:3: result of Bash (1 lines) ===\n   1 | https://github.com/acme/app/pull/7\n=== end aaaaaaaa:3 ===\n\n=== block aaaaaaaa:2: tool call Bash; the pair of block aaaaaaaa:3, not itself matched (4 lines) ===')
    expect(found).toContain("[aaaaaaaa:2] lines 1-4\n   1 | command: gh-axi pr create \\\n   2 |   --title 'PLUM brief' \\\n   3 |   --body-file brief.md\n   4 | description: Open the PR")
    // The result, the hit, is still named.
    expect(found).toContain('\n[aaaaaaaa:3 · ')
  })

  test('the same lines in two blocks are pasted once; the other block stays listed', async ($, on) => {
    const again = [row('assistant', 3, use('r2', 'Read', { file_path: '/docs/STANDARD.md' })), row('user', 3, result('r2', STANDARD))]
    const { search } = await session($, on, transcript(again), () =>
      reply([
        { ref: 'aaaaaaaa:5', from: 6, to: 6 },
        { ref: 'aaaaaaaa:7', from: 6, to: 6 },
      ]),
    )

    const found = await search({ query: 'PLUM' })

    expect(found.match(/^\[aaaaaaaa:\d+\] lines/gm)).toEqual(['[aaaaaaaa:5] lines'])
    expect(found).not.toContain('More lines over the size cap')
    expect(found).toMatch(/\n\[aaaaaaaa:7 · [^\]]+ · Read result \/docs\/STANDARD\.md\] 17 lines\n/)
  })

  // Two results of 40 lines of about 100 characters each, every line holding PLUM.
  const big = (name: string, lines = 40) => [`## ${name}`, ...Array.from({ length: lines }, (_, i) => `${name} PLUM line ${i + 1} ${'x'.repeat(80)}`)].join('\n')
  const bigTranscript = (lines: number) =>
    transcript([row('assistant', 3, use('c1', 'Read', { file_path: '/a.md' })), row('user', 3, result('c1', big('One', lines))), row('assistant', 4, use('c2', 'Read', { file_path: '/b.md' })), row('user', 4, result('c2', big('Two')))])

  test('fills 6,000 characters in Ember\'s order, never cutting a unit: one that does not fit becomes a pointer', async ($, on) => {
    const { search } = await session($, on, bigTranscript(40), () =>
      reply([
        { ref: 'aaaaaaaa:7', from: 1, to: 1 },
        { ref: 'aaaaaaaa:9', from: 1, to: 1 },
      ]),
    )

    const found = await search({ query: 'PLUM line' })

    expect(found).toContain('[aaaaaaaa:7] lines 1-41\n')
    expect(found).toContain('  41 | One PLUM line 40 ')
    expect(found).not.toContain('[aaaaaaaa:9] lines')
    expect(found).toContain('\n\nMore lines over the size cap (read with om_recall): aaaaaaaa:9 lines 1-41\n\n')
    expect(found.indexOf('\n\nMore lines over')).toBeLessThan(6_000)
  })

  test('the first unit is pasted whole up to 10,000 characters, past the 6,000 cap', async ($, on) => {
    const { search } = await session($, on, bigTranscript(80), () =>
      reply([
        { ref: 'aaaaaaaa:7', from: 1, to: 1 },
        { ref: 'aaaaaaaa:9', from: 1, to: 1 },
      ]),
    )

    const found = await search({ query: 'PLUM line' })

    expect(found).toContain('[aaaaaaaa:7] lines 1-81\n')
    expect(found).toContain('  81 | One PLUM line 80 ')
    const pasted = found.indexOf('\n\nMore lines over')
    expect(pasted).toBeGreaterThan(6_000)
    expect(pasted).toBeLessThan(10_000)
    expect(found).toContain('More lines over the size cap (read with om_recall): aaaaaaaa:9 lines 1-41')
  })

  test('a subagent block is among the candidates though the search leaves subagents out; it is labelled with its thread', async ($, on) => {
    const sub = [
      row('user', 1, 'Find the GRAPE-9 config', { isSidechain: true }),
      row('assistant', 1, [{ type: 'text', text: 'GRAPE-9 lives in config.ts' }], { isSidechain: true }),
    ].join('\n')
    const files = { [`${SUBAGENTS}/agent-a1b2c3d4e5f6a7b8c.jsonl`]: sub, [`${SUBAGENTS}/agent-a1b2c3d4e5f6a7b8c.meta.json`]: JSON.stringify({ agentType: 'Explore', description: 'find config' }) }
    const { seen, search } = await session($, on, transcript(), (prompt) => (prompt.includes('Its search query: GRAPE-9\n') ? reply([{ ref: 'a1b2c3d4:2', from: 1, to: 1 }]) : JSON.stringify({ found: false, answer: 'No.', ranges: [] })), files)

    const found = await search({ query: 'GRAPE-9' })
    const without = await search({ query: 'GRAPE-9 config.ts nowhere' })

    expect(seen.librarian[0]).toContain('=== block a1b2c3d4:2: assistant message, in subagent a1b2c3d4 (Explore: find config) (1 lines) ===\n   1 | GRAPE-9 lives in config.ts')
    expect(found).toStartWith('The lines that answer it.\n\n[a1b2c3d4:2] lines 1-1, in subagent a1b2c3d4 (Explore: find config)\n   1 | GRAPE-9 lives in config.ts\n\n0 match(es) for "GRAPE-9" in ')
    // When the librarian stands aside, the search is today's: the subagent left out, as asked.
    expect(without).toBe(await today(transcript(), { query: 'GRAPE-9 config.ts nowhere' }, files))
    expect(without).toContain('1 subagent transcript not searched: repeat with "subagents": true.')
  })

  const fallbacks: [string, string, ((prompt: string) => string | HttpResponse | Error | Promise<never>) | undefined, string][] = [
    ['an HTTP error', 'Ember librarian #1 failed (http-500)', () => httpError(500, 'server_error'), 'librarian.search.failed.http-500'],
    ['a timeout', 'Ember librarian #1 failed (timeout) after 8s', () => new Promise<never>(() => {}), 'librarian.search.failed.timeout'],
    ['a reply that is not its JSON', 'Ember librarian #1 failed (bad-json)', () => 'the standard is in block 5', 'librarian.search.failed.bad-json'],
    ['found: false', 'Ember librarian: nothing pasted (not-found); the search answers with its excerpts', undefined, 'librarian.search.fallback.not-found'],
    [
      'no range inside a block it was given',
      'Ember librarian: nothing pasted (no-ranges); the search answers with its excerpts',
      () =>
        reply([
          { ref: 'zzzzzzzz:5', from: 1, to: 2 },
          { ref: 'aaaaaaaa:5', from: 0, to: 2 },
          { ref: 'aaaaaaaa:5', from: 3, to: 18 },
          { ref: 'aaaaaaaa:5', from: 4, to: 3 },
        ]),
      'librarian.search.fallback.no-ranges',
    ],
    ['no API key', 'Ember librarian failed (no-key)', undefined, 'librarian.search.failed.no-key'],
  ]
  for (const [what, logged, librarian, counted] of fallbacks)
    test(`${what}: the search answers exactly as without the librarian, logged and counted`, async ($, on) => {
      const { clock, seen, search, files } = await session($, on, transcript(), librarian)
      if (counted.endsWith('no-key')) delete files[EMBER_KEY_PATH]

      const pending = search({ query: 'PLUM', need: 'write the PR body' })
      await clock.settle()
      await clock.advance(8_000)
      const found = await pending

      expect(found).toBe(await today(transcript(), { query: 'PLUM' }))
      expect(seen.logs.some((l) => l.startsWith(logged))).toBe(true)
      await clock.advance(5_000)
      const stats = JSON.parse(files['/stats/session-1.json']!) as { counts: Record<string, number> }
      expect(stats.counts[counted]).toBe(1)
    })

  test('/om-stats: the librarian, and how often a search is followed within 3 tool calls by a read of a block it named', async ($, on) => {
    // Each request's tool calls, as the model makes them.
    const uses: { name: string; input: unknown }[][] = []
    on('turn.step', async function* ($, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: uses.shift() ?? [], stopReason: 'tool_use' as const, usage: null }
    })
    const answers = [reply([{ ref: 'aaaaaaaa:5', from: 6, to: 6 }]), JSON.stringify({ found: false, answer: 'No.', ranges: [] })]
    const { clock, search } = await session($, on, transcript(), () => answers.shift()!)
    const step = async (toolUses: { name: string; input: unknown }[]) => {
      uses.push(toolUses)
      const s = $.turn.step({ turnId: 't', index: 0, model: 'claude', messageCount: 1 })
      for await (const _ of s);
    }

    await search({ query: 'PLUM' })
    await step([{ name: 'Bash', input: { command: 'ls' } }, { name: RECALL, input: { ref: 'aaaaaaaa:2' } }]) // a listed hit, read
    await search({ query: 'PLUM' })
    await step([{ name: RECALL, input: { ref: 'aaaaaaaa:4' } }]) // a block it did not name
    await step([{ name: 'Bash', input: { command: 'ls' } }, { name: 'Bash', input: { command: 'pwd' } }])
    await step([{ name: RECALL, input: { ref: 'aaaaaaaa:5' } }]) // the 4th call: too late
    await clock.advance(5_000)

    const summary = String((await $.tool.call({ tool: 'mcp__observational-memory__om_stats' })).result)
    expect(summary).toMatch(/^  Librarian  pasted lines for 1 of 2 searches, \$[\d.]+ in all, median [\d.]+ m?s; fell back on 1 \(not-found 1\)$/m)
    expect(summary).toMatch(/^  Read after 1 of 2 searches \(50%\) followed within 3 tool calls by a read of a block it named$/m)
  })
})
