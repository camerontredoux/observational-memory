import type { EngineInterface, On } from 'claude-code'
import type { Entry } from './memory'
import { errorText, key } from './prune'

// /notes: the observation ledger of the transcript in view, in a pane the person scrolls. It reads the ledger
// register.ts stores, and while the pane is up looks at it again every POLL_MS, drawing again when it changed.
// prune.ts holds the plugin's one store.set hook, so the pane cannot hear the writes themselves.
const PANE = 'om-notes'
const TITLE = 'Observations'
const COMMAND = 'notes'
const POLL_MS = 3_000

// The part of register.ts's Ledger the pane draws.
type Ledger = { entries: Entry[]; corrections: string[]; chunks: { lines: string[] }[]; currentTask?: string; seq: number }

// `🔴 2026-09-23 14:30 User asked …`: the marker, the day, the time and the text.
const LINE = /^(\S+)\s+(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})\s+([\s\S]*)$/

const isUp = async ($: EngineInterface) => (await $.ui.panes()).some((pane) => pane.id === PANE)

// The ledger key the pane last drew, and whether a poll runs: a reload starts both over, and the next draw polls again.
let shown: string | undefined
let polling = false
const changeOf = (l: Ledger | undefined) =>
  l ? `${l.seq}|${l.entries.length}|${l.entries.at(-1)?.id}|${l.chunks.length}|${l.corrections.length}|${l.currentTask}` : ''
async function poll($: EngineInterface) {
  if (polling) return
  polling = true
  try {
    let drawn = shown && changeOf((await $.store.get(shown)) as Ledger | undefined)
    while (await isUp($)) {
      await $.clock.sleep(POLL_MS)
      const now = shown && changeOf((await $.store.get(shown)) as Ledger | undefined)
      if (now !== drawn) (drawn = now), $.ui.invalidate('ui.render')
    }
  } catch (error) {
    $.ui.log(`/${COMMAND} stopped following the ledger (${errorText(error)})`, { to: 'debug' })
  } finally {
    polling = false
  }
}

export const registerNotes = (on: On) => {
  // A pane is for a person: a non-interactive session gets no command.
  on('session.start', { isInteractive: true }, async ($, e, next) => {
    await $.command
      .register({ name: COMMAND, description: 'Show the observations of the transcript in view in a pane' })
      .catch((error) => $.ui.log(`could not register /${COMMAND} (${errorText(error)})`, { to: 'debug' }))
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($) => {
    const opened = await $.ui.open({ id: PANE, title: TITLE, focus: true, closeOnEscape: true })
    return { text: opened.isPlaced ? 'Observations pane opened; the arrows scroll it, Esc closes it.' : `Observations pane not shown (${opened.reason}).` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const sessionId = await $.session.id()
    const agentId = e.props.view.agentId
    shown = key('ledger', agentId === undefined ? sessionId : `${sessionId}/${agentId}`)
    const ledger = (await $.store.get(shown)) as Ledger | undefined
    void poll($)
    const entries = ledger?.entries ?? []
    const pending = (ledger?.chunks ?? []).flatMap((c) => c.lines)
    const corrections = ledger?.corrections ?? []
    const whose = agentId === undefined ? 'this session' : 'this agent'

    if (!entries.length && !pending.length && !corrections.length)
      return (
        <Box flexDirection="column">
          <Text dimColor>No observations for {whose} yet.</Text>
          <Text dimColor>The Observer writes them in the background, about every 10k tokens of history.</Text>
        </Box>
      )

    let day = ''
    const line = (text: string, reflected = false) => {
      const m = text.match(LINE)
      if (!m) return <Text wrap="wrap">{text}</Text>
      const head = m[2] !== day ? ((day = m[2]!), <Text bold>{day}</Text>) : null
      return (
        <Box flexDirection="column">
          {head}
          <Text wrap="wrap">
            {m[1]} <Text dimColor>{m[3]}</Text> {m[4]}
            {reflected ? <Text dimColor> (condensed)</Text> : null}
          </Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text dimColor>
          {entries.length} observations{pending.length ? `, ${pending.length} pending` : ''}
          {corrections.length ? `, ${corrections.length} constraints` : ''} for {whose}
        </Text>
        {corrections.length ? (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Constraints in force</Text>
            {corrections.map((c) => (
              <Text wrap="wrap">{c}</Text>
            ))}
          </Box>
        ) : null}
        {ledger?.currentTask ? (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Current task</Text>
            <Text wrap="wrap">{ledger.currentTask}</Text>
          </Box>
        ) : null}
        {entries.length ? (
          <Box flexDirection="column" marginTop={1}>
            {entries.map((entry) => line(entry.line, entry.r))}
          </Box>
        ) : null}
        {pending.length ? (
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Pending (observed past a gap, not yet committed)</Text>
            {((day = ''), pending.map((p) => line(p)))}
          </Box>
        ) : null}
      </Box>
    )
  })
}
