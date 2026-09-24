// Evaluation only: issue #9's builtin+recall configuration. The om_recall tool of hooks/register.ts and nothing else:
// no compaction, observation, stats or pruning hook, so the host's built-in compaction runs as with no plugin.
// scripts/bench-live.ts copies this directory into a run's sandbox with the plugin version's own recall.ts and
// prompts.ts beside it. Kept in step with hooks/register.ts's `session.start` registration (tests/register.test.ts checks
// they register the same om_recall), its `tool.call` handler, and its om_recall `tool.describe` and
// `classic.SessionStart` handlers (tests/register.test.ts checks both pin om_recall after a compaction).
import type { EngineInterface, Register } from 'claude-code'
import { COMPACT_WRAPPER } from './prompts'
import { liveTranscript, loadTranscript, recall, SEARCH_MAX_HITS } from './recall'
import type { RecallInput, RecallIo } from './recall'

declare module 'claude-code' {
  interface McpToolInputs {
    'mcp__observational-memory__om_recall': RecallInput
  }
}

const transcriptKey = (sessionId: string) => `transcript:${sessionId}`
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error))
const log = ($: EngineInterface, text: string) => $.ui.log(`om_recall (eval): ${text}`, { to: 'debug' })

// As hooks/register.ts's recallIo: `cat` for a file over `$.fs.read`'s 4 MiB.
const recallIo = ($: EngineInterface): RecallIo => ({
  read: async (path) => {
    const size = await $.fs.stat(path).then((s) => s.size, () => undefined)
    if (size !== undefined && size < 4 * 1024 * 1024) return String(await $.fs.read(path))
    const cat = $.process.spawn({ argv: ['cat', '--', path] })
    let text = ''
    let error = ''
    for await (const c of cat) c.stream === 'stdout' ? (text += c.text) : (error += c.text)
    if ((await cat.result).code !== 0) throw new Error(error.trim() || `could not read ${path}`)
    return text
  },
  list: async (dir) => ((await $.fs.exists(dir)) ? (await $.fs.list(dir)).map((f) => f.name) : []),
  continuing: async (dir, names, id) => {
    if (!names.length) return undefined
    const r = await $.process.run(['grep', '-lF', `"continuedInSessionId":"${id}"`, '--', ...names.map((n) => `${dir}/${n}`)])
    const hit = r.stdout.split('\n')[0]
    return hit ? hit.slice(hit.lastIndexOf('/') + 1) : undefined
  },
})

async function noteTranscript($: EngineInterface, e: { session_id: string; transcript_path: string }) {
  if (e.transcript_path) await $.store.set(transcriptKey(e.session_id), e.transcript_path).catch((error) => log($, `could not record the transcript path (${errorText(error)})`))
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    await $.tool
      .register({
        name: 'om_recall',
        description:
          "Use it before telling the user you no longer have a detail from earlier in this session, or that it was never " +
          "shown: a summary that does not show a tool's full output is not evidence that the output is lost. Use it too " +
          "whenever the summary lacks a detail you need: exact text, a tool's output, a quote, what happened when. It " +
          "searches, reads and outlines this session's full transcript, which keeps every message and tool output whole: " +
          'what compaction removed from context, the earlier files a moved session continued from, optionally its ' +
          'subagents. Search first: its excerpts, the best lines of each ' +
          'matching block, usually answer, and it names query terms that occur nowhere, so do not search again to confirm an ' +
          'absence. Read a block only when its excerpt is not enough, and only the lines you need. Outline only to orient, ' +
          'one page. Stop as soon as you have the answer. search (a query alone): words, all of which must appear (failing ' +
          'that, blocks holding some, rarest first), "quoted phrases" or /regex/. read (a ref alone, like a79f045b:2133): a block, a page of lines ' +
          'at a time. outline (neither): a line per message or tool call, for a from/to range. files: the files the session ' +
          'read, edited or wrote, each with the blocks that touched it; a query narrows them by path.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', maxLength: 500, description: 'Words, "quoted phrases" or /regex/flags to find, e.g. a file name, an error, a marker; with files, part of a path' },
            mode: { type: 'string', enum: ['search', 'read', 'outline', 'files'], description: 'Default: search with a query, read with a ref alone, else outline' },
            ref: { type: 'string', description: 'A block reference from a search or outline, to read; a subagent reference, to outline its transcript' },
            lines: { type: 'string', description: 'Lines of the block to read, e.g. "1-200" or "201-" (read)' },
            before: { type: 'number', description: 'Blocks before the read one to show too, at most 5 (read)' },
            after: { type: 'number', description: 'Blocks after the read one to show too, at most 5 (read)' },
            from: { type: 'string', description: 'Range start: a reference, "HH:MM" or "YYYY-MM-DD HH:MM" (outline, search)' },
            to: { type: 'string', description: 'Range end, inclusive, the same forms (outline, search)' },
            limit: { type: 'number', description: `Most search matches to return (default and most ${SEARCH_MAX_HITS})` },
            subagents: { type: 'boolean', description: "Search the subagents' transcripts too (default false)" },
          },
        },
      })
      .catch((error) => log($, `could not register om_recall (${errorText(error)})`))
    return next(e)
  })

  // The transcript file when known; the live history, without times, otherwise.
  on('tool.call', { tool: 'mcp__observational-memory__om_recall' }, async ($, e) => {
    const [rows, sessionId] = await Promise.all([$.session.messages(), $.session.id()])
    const path = (await $.store.get(transcriptKey(sessionId))) as string | undefined
    let corpus: Awaited<ReturnType<typeof loadTranscript>> | undefined
    if (path) corpus = await loadTranscript(recallIo($), path, { asking: true }).catch((error) => (log($, `could not read ${path} (${errorText(error)})`), undefined))
    const found = await recall(corpus?.main.blocks.length ? corpus : liveTranscript(rows, rows.map(() => undefined), rows.length >= 4096), e)
    return { result: found.text }
  })

  // As hooks/register.ts's: om_recall joins the tool list once a compaction has run.
  on('tool.describe', { tool: 'mcp__observational-memory__om_recall' }, async ($, e, next) => {
    const described = await next(e)
    const compacted = await $.session.messages().then((rows) => rows.some((m) => m.role === 'user' && m.text.startsWith(COMPACT_WRAPPER)), () => false)
    return compacted ? { ...described, isDeferred: false } : described
  })

  on('classic.SessionStart', async ($, e, next) => {
    if (e.source === 'compact') $.ui.invalidate('tool.describe')
    await noteTranscript($, e)
    return next(e)
  })
  on('classic.Stop', async ($, e, next) => (await noteTranscript($, e), next(e)))
}
