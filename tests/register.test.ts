import { describe, expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On, SessionMessage } from 'claude-code'

const turn = (prompt: string, reply: string, size = 0): SessionMessage[] => [
  { role: 'user', text: prompt, toolUses: [] },
  {
    role: 'assistant',
    text: reply,
    toolUses: [{ tool_use_id: `t-${prompt}`, tool: 'Read', input: { file_path: `/src/${prompt}.ts` }, text: 'x'.repeat(size) }],
  },
  { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: `t-${prompt}`, text: 'x'.repeat(size), isError: false }] },
  { role: 'assistant', text: `${reply} done`, toolUses: [] },
]

const OBSERVER_REPLY = `<observations>
Date: Sep 22, 2026
* 🔴 (14:30) User asked to fix auth
</observations>
<current-task>
Primary: fix auth
</current-task>`

// What the plugin reads beneath it besides the model: the environment, its store, the session id and the
// main conversation's history, which the test grows as the engine would.
function world(on: On, env: Record<string, string> = {}) {
  mock.env(on, env)
  mock.store(on)
  on('session.id', () => ({ value: 'session-1' }))
  const history: SessionMessage[] = []
  on('session.messages', () => ({ value: history }))
  return history
}

const USAGE = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

// The Observer answers every model.complete; its prompts and the ui.log lines are collected.
function observer(on: On, reply = OBSERVER_REPLY) {
  const seen = { prompts: [] as string[], logs: [] as string[] }
  on('model.complete', ($, e) => {
    seen.prompts.push(e.prompt)
    return { value: { isAnswered: true, text: reply, usage: USAGE } }
  })
  on('ui.log', ($, e) => {
    seen.logs.push(e.text)
    return { value: undefined }
  })
  return seen
}

type JevBody = { state: unknown; questions: Record<string, { instructions: string }> }

// A fake Jev: `answer` gives each question's noul probability.
function jev(on: On, answer: (name: string, instructions: string) => number, status = 200) {
  const requests: { headers?: Record<string, string>; body: JevBody }[] = []
  on('http.fetch', ($, e) => {
    const body = JSON.parse(e.init?.body ?? '{}') as JevBody
    requests.push({ headers: e.init?.headers, body })
    const answers = Object.fromEntries(Object.entries(body.questions).map(([n, q]) => [n, { noul: answer(n, q.instructions) }]))
    const text = status === 200 ? JSON.stringify({ answers }) : 'overloaded'
    return { value: { status, ok: status === 200, headers: {}, text } }
  })
  return requests
}

// Local time on a day of September 2026.
const at = (day: number, hour: number, minute: number) => new Date(2026, 8, day, hour, minute).getTime()

// A store the test can read: the plugin's buffer, times and skills.
function visibleStore(on: On) {
  const stored: Record<string, unknown> = {}
  on('store.get', ($, e) => ({ value: stored[e.key] }))
  on('store.set', ($, e) => ((stored[e.key] = JSON.parse(JSON.stringify(e.value))), { value: undefined }))
  on('store.delete', ($, e) => (delete stored[e.key], { value: undefined }))
  return stored
}

// A live main conversation: its history grown one turn at a time between a turn.start at `startAt` and a
// turn.complete a minute later.
function live(on: On, clock: MockClock, transcript: SessionMessage[]) {
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  return {
    transcript,
    async turn($: Engine, messages: SessionMessage[], startAt: number) {
      const turnId = `turn-${transcript.length}`
      await clock.set(startAt)
      transcript.push(messages[0]!)
      await $.turn.start({ text: messages[0]!.text, turnId })
      await clock.advance(60_000)
      transcript.push(...messages.slice(1))
      await $.turn.complete({ answer: '', durationMs: 60_000, isAborted: false, turnId, reason: 'answer' })
    },
  }
}

// An Observer whose observation names the prompts it was shown, so each chunk's reply is told apart.
function namingObserver(on: On, date = 'Sep 22, 2026') {
  const seen = { prompts: [] as string[], logs: [] as string[] }
  on('model.complete', ($, e) => {
    seen.prompts.push(e.prompt)
    const history = e.prompt.split('===== BEGIN MESSAGE HISTORY')[1]?.split('===== END MESSAGE HISTORY')[0] ?? ''
    const names = [...history.matchAll(/^User(?: \([^)]*\))?: (\w+)$/gm)].map((m) => m[1])
    const text = `<observations>\nDate: ${date}\n* 🔴 (14:30) Saw ${names.join(' ')}\n</observations>\n<current-task>\nPrimary: ${names.at(-1)}\n</current-task>`
    return { value: { isAnswered: true, text, usage: USAGE } }
  })
  on('ui.log', ($, e) => (seen.logs.push(e.text), { value: undefined }))
  return seen
}

const skillsIn = (text?: string) => text?.match(/<skills-in-use>\n([\s\S]*?)\n<\/skills-in-use>/)?.[1]

describe('register', () => {
  test('observes older turns and keeps the recent ones whole, behind the observation log', async ($, on) => {
    mock.clock(on)
    world(on)
    const prompts: string[] = []
    const logs: string[] = []
    on('model.complete', ($, e) => {
      prompts.push(e.prompt)
      return { value: { isAnswered: true, text: OBSERVER_REPLY, usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }
    })
    on('ui.log', ($, e) => {
      logs.push(e.text)
      return { value: undefined }
    })
    const old = turn('auth', 'Looking', 30_000)
    const recent = turn('tests', 'Running', 30_000)

    const result = await $.session.compact({ trigger: 'manual', messages: [...old, ...recent] })

    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toContain('User: auth')
    expect(prompts[0]).toContain('Tool Call Read: {"file_path":"/src/auth.ts"}')
    expect(prompts[0]).not.toContain('User: tests')
    expect(result.messages?.slice(1)).toEqual(recent)
    expect(result.messages?.[0]?.text).toContain('* 🔴 (14:30) User asked to fix auth')
    expect(result.messages?.[0]?.text).toContain('<current-task>\nPrimary: fix auth\n</current-task>')
    expect(logs).toEqual([
      'observational-memory: no TYPESAFE_API_KEY, observing without the Jev pre-pass',
      'observational-memory: observed 4 messages, kept 4; log ~14 tokens',
    ])
  })

  test('a second compaction hands the observer the log and appends to it', async ($, on) => {
    mock.clock(on)
    world(on)
    const prompts: string[] = []
    on('model.complete', ($, e) => {
      prompts.push(e.prompt)
      return { value: { isAnswered: true, text: OBSERVER_REPLY, usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }
    })
    on('ui.log', () => ({ value: undefined }))

    const first = await $.session.compact({ trigger: 'manual', messages: [...turn('auth', 'a', 30_000), ...turn('b', 'b', 30_000)] })
    const second = await $.session.compact({
      trigger: 'auto',
      messages: [...first.messages!, ...turn('c', 'c', 30_000)],
    })

    expect(prompts[1]).toContain('## Previous Observations\n\nDate: Sep 22, 2026')
    expect(prompts[1]).toContain('- prior current-task: Primary: fix auth')
    expect(second.messages?.[0]?.text).toMatch(/User asked to fix auth\n\n--- message boundary \(.+\) ---\n\nDate: Sep 22, 2026/)
    expect(second.messages?.slice(1).map((m) => m.text)).toEqual(['c', 'c', '', 'c done'])
  })

  test('falls back to the built-in compaction when the observer call fails', async ($, on) => {
    mock.clock(on)
    world(on)
    const builtin: SessionMessage[] = [{ role: 'user', text: 'built-in summary', toolUses: [] }]
    const logs: string[] = []
    on('model.complete', () => ({ value: { isAnswered: false, reason: 'empty-reply', usage: { input_tokens: 1, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }))
    on('ui.log', ($, e) => {
      logs.push(e.text)
      return { value: undefined }
    })
    on('session.compact', () => ({ messages: builtin }))

    const result = await $.session.compact({ trigger: 'auto', messages: [...turn('a', 'a', 30_000), ...turn('b', 'b', 30_000)] })

    expect(result.messages).toEqual(builtin)
    expect(logs).toEqual([
      'observational-memory: no TYPESAFE_API_KEY, observing without the Jev pre-pass',
      'observational-memory: model call failed: empty-reply; using the built-in compaction',
    ])
  })

  test('a log past 40k tokens goes to the reflector, which replaces it', async ($, on) => {
    mock.clock(on, { now: at(24, 12, 0) })
    world(on)
    const systems: string[] = []
    const prompts: string[] = []
    on('model.complete', ($, e) => {
      systems.push(e.system ?? '')
      prompts.push(e.prompt)
      const text = prompts.length === 1
        ? `<observations>\nDate: Sep 22, 2026\n${'* 🟡 (14:30) read a file\n'.repeat(8_000)}</observations>`
        : '<observations>\nDate: Sep 22, 2026\n* 🔴 Explored the auth module\n</observations>'
      return { value: { isAnswered: true, text, usage: { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }
    })
    on('ui.log', () => ({ value: undefined }))

    const result = await $.session.compact({ trigger: 'auto', messages: [...turn('a', 'a', 30_000), ...turn('b', 'b', 30_000)] })

    expect(prompts).toHaveLength(2)
    expect(systems[1]).toContain('memory consciousness')
    expect(prompts[1]).toContain('## COMPRESSION REQUIRED')
    expect(result.messages?.[0]?.text).toContain('<observations>\nDate: Sep 22, 2026 (2 days ago)\n* 🔴 Explored the auth module\n</observations>')
  })

  test('Jev prunes the older section before the observer sees it; the tail is context only', async ($, on) => {
    mock.clock(on)
    world(on, { TYPESAFE_API_KEY: 'test-key' })
    const seen = observer(on)
    const plan: Record<string, number> = { call_t1: 0.9, result_t1: 0.9, call_t2: 0.9, result_t2: 0.1, call_t3: 0.1, result_t3: 0.1 }
    const requests = jev(on, (name) => plan[name] ?? 0)
    const recent = turn('d', 'd', 30_000)

    const result = await $.session.compact({
      trigger: 'auto',
      messages: [...turn('a', 'a', 30_000), ...turn('b', 'b', 30_000), ...turn('c', 'c', 30_000), ...recent],
    })

    expect(requests).toHaveLength(1)
    expect(requests[0]?.headers?.authorization).toBe('Bearer test-key')
    expect(Object.keys(requests[0]!.body.questions).sort()).toEqual(Object.keys(plan).sort())
    expect(JSON.stringify(requests[0]!.body.state)).toContain('/src/d.ts')
    expect(seen.prompts[0]).toContain(`Tool Result Read: ${'x'.repeat(20_000)}`)
    expect(seen.prompts[0]).toContain(`Tool Call Read: {"file_path":"/src/b.ts"}\nTool Result Read: ${'x'.repeat(300)}\n[fast-jev-compaction truncated 29700 chars`)
    expect(seen.prompts[0]).not.toContain('/src/c.ts')
    expect(seen.prompts[0]).toContain('User: c')
    expect(result.messages?.slice(1)).toEqual(recent)
    expect(seen.logs[0]).toBe('observational-memory: Jev kept 1, truncated 1, removed 1 calls in 1 requests')
  })

  test('a Jev failure observes the older section unpruned and says why', async ($, on) => {
    mock.clock(on)
    world(on, { TYPESAFE_API_KEY: 'test-key' })
    const seen = observer(on)
    jev(on, () => 0, 503)
    on('session.compact', () => ({ messages: [{ role: 'user', text: 'built-in summary', toolUses: [] }] }))

    const result = await $.session.compact({ trigger: 'auto', messages: [...turn('a', 'a', 30_000), ...turn('b', 'b', 30_000)] })

    expect(seen.logs[0]).toBe('observational-memory: Jev pre-pass skipped (Jev request failed (503): overloaded), observing unpruned')
    expect(seen.prompts[0]).toContain(`Tool Call Read: {"file_path":"/src/a.ts"}\nTool Result Read: ${'x'.repeat(20_000)}`)
    expect(result.messages?.[0]?.text).toContain('* 🔴 (14:30) User asked to fix auth')
  })

  test('skills recorded at skill.prompt are kept in <skills-in-use> when Jev says they are still needed', async ($, on) => {
    mock.clock(on)
    world(on, { TYPESAFE_API_KEY: 'test-key' })
    const seen = observer(on, `${OBSERVER_REPLY}\n<suggested-response>\nRun the tests\n</suggested-response>`)
    const requests = jev(on, (name, instructions) => (name.startsWith('skill_') ? (instructions.includes('`deploy`') ? 0.8 : 0.2) : 0.9))
    on('skill.prompt', ($, e) => ({ text: `${e.text} (expanded)` }))

    expect(await $.skill.prompt({ skill: 'deploy', text: 'old deploy steps' })).toEqual({ text: 'old deploy steps (expanded)' })
    await $.skill.prompt({ skill: 'lint', text: 'Lint steps' })
    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps' })
    const result = await $.session.compact({ trigger: 'auto', messages: [...turn('a', 'a', 30_000), ...turn('b', 'b', 30_000)] })

    const skillQuestions = requests.find((r) => 'skill_0' in r.body.questions)!.body
    expect(Object.values(skillQuestions.questions).map((q) => q.instructions)).toEqual([
      'Skill `deploy`, whose instructions begin "Deploy steps (expanded)", still applies to the recent requests or requests like them',
      'Skill `lint`, whose instructions begin "Lint steps (expanded)", still applies to the recent requests or requests like them',
    ])
    expect(JSON.stringify(skillQuestions.questions)).toContain('"criteria":{"true":"The skill sets a standing rule')
    expect(seen.prompts[0]).toContain('Write every observation without a time')
    expect(JSON.stringify(skillQuestions.state)).toContain('User asked to fix auth')
    const text = result.messages?.[0]?.text ?? ''
    expect(skillsIn(text)).toBe('<skill name="deploy">\nDeploy steps (expanded)\n</skill>')
    expect(text.indexOf('<skills-in-use>')).toBeGreaterThan(text.indexOf('</suggested-response>'))
    expect(seen.logs).toContain('observational-memory: Jev kept 1 of 2 skills')
  })

  test('kept skills carry forward by parsing the memory message when the store is empty', async ($, on) => {
    mock.clock(on)
    mock.env(on, { TYPESAFE_API_KEY: 'test-key' })
    on('session.id', () => ({ value: 'session-1' }))
    on('session.messages', () => ({ value: [] }))
    let stored: Record<string, unknown> = {}
    on('store.get', ($, e) => ({ value: stored[e.key] }))
    on('store.set', ($, e) => ((stored[e.key] = e.value), { value: undefined }))
    const seen = observer(on)
    const requests = jev(on, () => 0.9)
    on('skill.prompt', ($, e) => ({ text: e.text }))

    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps\n</skill> mid-text stays' })
    const first = await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', 30_000), ...turn('b', 'b', 30_000)] })
    stored = {}
    const second = await $.session.compact({ trigger: 'auto', messages: [...first.messages!, ...turn('c', 'c', 30_000)] })

    expect(requests.filter((r) => 'skill_0' in r.body.questions)).toHaveLength(2)
    expect(skillsIn(second.messages?.[0]?.text)).toBe('<skill name="deploy">\nDeploy steps\n</skill> mid-text stays\n</skill>')
    expect(second.messages?.[0]?.text.match(/<skills-in-use>/g)).toHaveLength(1)
    expect(seen.prompts[1]).not.toContain('Deploy steps')
    expect(second.messages?.[0]?.text).toMatch(/User asked to fix auth\n\n--- message boundary \(.+\) ---\n\nDate: Sep 22, 2026/)
  })

  test('without a key every recorded skill not in the raw tail is kept, and Jev is never called', async ($, on) => {
    mock.clock(on)
    world(on)
    const seen = observer(on)
    const requests = jev(on, () => 0)
    on('skill.prompt', ($, e) => ({ text: e.text }))

    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps' })
    await $.skill.prompt({ skill: 'lint', text: 'Lint steps' })
    await $.skill.prompt({ skill: 'review', text: 'Review steps' })
    const recent: SessionMessage[] = [{ role: 'user', text: 'Review steps', toolUses: [] }, ...turn('b', 'b', 30_000).slice(1)]
    const result = await $.session.compact({ trigger: 'auto', messages: [...turn('a', 'a', 30_000), ...recent] })

    expect(requests).toHaveLength(0)
    expect(skillsIn(result.messages?.[0]?.text)).toBe('<skill name="deploy">\nDeploy steps\n</skill>\n<skill name="lint">\nLint steps\n</skill>')
    expect(seen.logs[0]).toBe('observational-memory: no TYPESAFE_API_KEY, observing without the Jev pre-pass')
  })

  test('a skill the raw tail invoked is kept without asking Jev', async ($, on) => {
    mock.clock(on)
    world(on, { TYPESAFE_API_KEY: 'test-key' })
    observer(on)
    const requests = jev(on, () => 0)
    on('skill.prompt', ($, e) => ({ text: e.text }))

    await $.skill.prompt({ skill: 'style', text: 'Start summaries with Gist:' })
    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps' })
    await $.skill.prompt({ skill: 'lint', text: 'Lint steps' })
    const recent: SessionMessage[] = [
      { role: 'user', text: '<command-message>style</command-message>\n<command-name>/style</command-name>', toolUses: [] },
      { role: 'assistant', text: '', toolUses: [{ tool_use_id: 's1', tool: 'Skill', input: { skill: 'deploy' }, text: 'Launching skill: deploy' }] },
      ...turn('b', 'b', 30_000).slice(2),
    ]
    const result = await $.session.compact({ trigger: 'auto', messages: [...turn('a', 'a', 30_000), ...recent] })

    const asked = requests.filter((r) => 'skill_0' in r.body.questions).map((r) => Object.keys(r.body.questions))
    expect(asked).toEqual([['skill_0']])
    expect(skillsIn(result.messages?.[0]?.text)).toBe(
      '<skill name="style">\nStart summaries with Gist:\n</skill>\n<skill name="deploy">\nDeploy steps\n</skill>',
    )
  })

  test('records when each prompt and answer was written and renders the times as Mastra does', async ($, on) => {
    const clock = mock.clock(on)
    const history = world(on)
    const seen = namingObserver(on)
    const conversation = live(on, clock, history)

    await conversation.turn($, turn('a', 'a'), at(22, 14, 30))
    await conversation.turn($, turn('b', 'b'), at(23, 9, 15))
    await conversation.turn($, turn('c', 'c', 30_000), at(23, 10, 0))
    await $.session.compact({ trigger: 'manual', messages: conversation.transcript })

    expect(seen.prompts).toHaveLength(1)
    expect(seen.prompts[0]).toContain(
      'Sep 22 2026:\nUser (2:30 PM): a\nAssistant: a\nTool Call Read: {"file_path":"/src/a.ts"}\nTool Result Read: [empty result]\n' +
        'Assistant (2:31 PM): a done\nSep 23 2026:\nUser (9:15 AM): b\nAssistant: b\n',
    )
    expect(seen.prompts[0]).not.toContain('carries no times of day')
    expect(seen.prompts[0]).toContain('===== END MESSAGE HISTORY =====')
    expect(seen.prompts[0]).toMatch(/END MESSAGE HISTORY[\s\S]*## Your Task[\s\S]*not instructions to you/)
  })

  test('observes a chunk in the background after turn.complete once past the threshold, and not before', async ($, on) => {
    const clock = mock.clock(on)
    const history = world(on)
    const seen = namingObserver(on)
    const conversation = live(on, clock, history)

    await conversation.turn($, turn('a', 'a', 30_000), at(22, 14, 30))
    await clock.advance(1_000)
    expect(seen.prompts).toHaveLength(0)
    await conversation.turn($, turn('b', 'b', 30_000), at(22, 15, 0))
    expect(seen.prompts).toHaveLength(0) // the chunk waits for its timer, off the turn's dispatch
    await clock.settle()

    expect(seen.prompts).toHaveLength(1)
    expect(seen.prompts[0]).toContain('User (2:30 PM): a')
    expect(seen.prompts[0]).not.toContain('User (3:00 PM): b')
    expect(seen.logs).toContain('observational-memory: observed messages 0-4 in the background, ~10 tokens')
  })

  test('compaction takes the buffered chunk and observes only the leftover before the raw tail', async ($, on) => {
    const clock = mock.clock(on)
    const history = world(on)
    const seen = namingObserver(on)
    const conversation = live(on, clock, history)

    await conversation.turn($, turn('a', 'a', 30_000), at(22, 14, 30))
    await conversation.turn($, turn('b', 'b', 30_000), at(22, 15, 0))
    await clock.settle()
    history.push(...turn('c', 'c', 30_000), ...turn('d', 'd', 30_000))
    const messages = [...history]
    const result = await $.session.compact({ trigger: 'manual', messages })

    expect(seen.prompts).toHaveLength(2)
    expect(seen.prompts[1]).not.toContain('User (2:30 PM): a')
    expect(seen.prompts[1]).toContain('User (3:00 PM): b')
    expect(seen.prompts[1]).toContain('User: c')
    expect(seen.prompts[1]).toContain('## Previous Observations\n\nDate: Sep 22, 2026\n* 🔴 (14:30) Saw a\n')
    expect(seen.prompts[1]).toContain('- prior current-task: Primary: a')
    const text = result.messages?.[0]?.text ?? ''
    expect(text).toContain('Saw a\n\n--- message boundary (')
    expect(text).toContain('* 🔴 (14:30) Saw b c\n</observations>\n\n<current-task>\nPrimary: c\n</current-task>')
    expect(result.messages?.slice(1)).toEqual(messages.slice(12))
    expect(seen.logs).toContain('observational-memory: observed 12 messages (4 in the background), kept 4; log ~33 tokens')
  })

  test('a buffer whose fingerprint no longer matches the transcript is discarded', async ($, on) => {
    const clock = mock.clock(on)
    const history = world(on)
    const seen = namingObserver(on)
    const conversation = live(on, clock, history)

    await conversation.turn($, turn('a', 'a', 30_000), at(22, 14, 30))
    await conversation.turn($, turn('b', 'b', 30_000), at(22, 15, 0))
    await clock.settle()
    // Rewound and asked something else: the first turn is no longer the one observed.
    const messages = [...turn('z', 'z', 30_000), ...turn('b', 'b', 30_000), ...turn('d', 'd', 30_000)]
    history.splice(0, history.length, ...messages)
    const result = await $.session.compact({ trigger: 'manual', messages })

    expect(seen.logs).toContain('observational-memory: the transcript changed under 1 buffered chunk(s); dropping them')
    expect(seen.prompts[1]).toContain('User: z')
    expect(seen.prompts[1]).not.toContain('## Previous Observations')
    expect(result.messages?.[0]?.text).not.toContain('Saw a')
  })

  test('a chunk still in flight at compaction is awaited, and the leftover observed meanwhile', async ($, on) => {
    const clock = mock.clock(on)
    const history = world(on)
    const seen = namingObserver(on)
    const conversation = live(on, clock, history)

    await conversation.turn($, turn('a', 'a', 30_000), at(22, 14, 30))
    await conversation.turn($, turn('b', 'b', 30_000), at(22, 15, 0))
    history.push(...turn('c', 'c', 30_000))
    const compacting = $.session.compact({ trigger: 'auto', messages: [...history] })
    await clock.settle() // the background chunk's timer fires while the compaction waits for it
    const result = await compacting

    expect(seen.prompts).toHaveLength(2)
    expect(seen.prompts.filter((p) => p.includes('User (2:30 PM): a'))).toHaveLength(1)
    expect(result.messages?.[0]?.text).toMatch(/Saw a\n\n--- message boundary \(.+\) ---\n\nDate: Sep 22, 2026 \(.+\)\n\* 🔴 \(14:30\) Saw b/)
    expect(seen.logs).toContain('observational-memory: observed 8 messages (4 in the background), kept 4; log ~33 tokens')
    expect(seen.logs.filter((l) => l.includes('in the background, ~'))).toEqual([]) // taken over, never buffered
  })

  test('relative dates are added when the memory message is written and stripped when it is read back', async ($, on) => {
    mock.clock(on, { now: at(25, 18, 0) })
    world(on)
    const prompts: string[] = []
    on('model.complete', ($, e) => {
      prompts.push(e.prompt)
      const date = prompts.length === 1 ? 'Sep 22, 2026' : 'Sep 25, 2026'
      return { value: { isAnswered: true, text: `<observations>\nDate: ${date}\n* 🔴 (14:30) Step ${prompts.length}\n</observations>`, usage: USAGE } }
    })
    on('ui.log', () => ({ value: undefined }))

    const first = await $.session.compact({ trigger: 'manual', messages: [...turn('a', 'a', 30_000), ...turn('b', 'b', 30_000)] })
    const second = await $.session.compact({ trigger: 'auto', messages: [...first.messages!, ...turn('c', 'c', 30_000)] })
    const third = await $.session.compact({ trigger: 'auto', messages: [...second.messages!, ...turn('d', 'd', 30_000)] })

    expect(first.messages?.[0]?.text).toContain('<observations>\nDate: Sep 22, 2026 (3 days ago)\n* 🔴 (14:30) Step 1\n')
    expect(prompts[1]).toContain('## Previous Observations\n\nDate: Sep 22, 2026\n* 🔴 (14:30) Step 1\n')
    expect(second.messages?.[0]?.text).toMatch(
      /Date: Sep 22, 2026 \(3 days ago\)\n\* 🔴 \(14:30\) Step 1\n\n--- message boundary \(.+\) ---\n\n\n\[3 days later\]\n\nDate: Sep 25, 2026 \(today\)\n/,
    )
    expect(prompts[2]).not.toMatch(/ago\)|today\)|later\]/)
    const text = third.messages?.[0]?.text ?? ''
    expect(text.match(/\(3 days ago\)/g)).toHaveLength(1)
    expect(text.match(/\[3 days later\]/g)).toHaveLength(1)
    expect(text.match(/\(today\)/g)).toHaveLength(2)
  })

  test('/clear drops the cleared session\'s times, buffer and skills', async ($, on) => {
    const clock = mock.clock(on)
    mock.env(on, {})
    on('session.id', () => ({ value: 'session-1' }))
    const history: SessionMessage[] = []
    on('session.messages', () => ({ value: history }))
    const stored = visibleStore(on)
    namingObserver(on)
    on('skill.prompt', ($, e) => ({ text: e.text }))
    const conversation = live(on, clock, history)

    await $.skill.prompt({ skill: 'deploy', text: 'Deploy steps' })
    await conversation.turn($, turn('a', 'a', 30_000), at(22, 14, 30))
    await conversation.turn($, turn('b', 'b', 30_000), at(22, 15, 0))
    await clock.settle()
    expect(Object.keys(stored).sort()).toEqual(['buffer:session-1', 'skills:session-1', 'times:session-1'])
    await $.session.end({ reason: 'clear', sessionId: 'session-1', resume: { id: 'session-1' } })

    expect(stored).toEqual({})
  })

  test('after a compaction the history goes on from the memory message: nothing before it is observed again, and the tail keeps its times', async ($, on) => {
    const clock = mock.clock(on)
    const history = world(on)
    const seen = namingObserver(on)
    const conversation = live(on, clock, history)

    await conversation.turn($, turn('a', 'a', 30_000), at(22, 14, 30))
    await conversation.turn($, turn('b', 'b', 30_000), at(22, 15, 0))
    await clock.settle()
    await conversation.turn($, turn('c', 'c', 30_000), at(22, 15, 30))
    await clock.settle()
    const result = await $.session.compact({ trigger: 'manual', messages: [...history] })
    expect(seen.prompts).toHaveLength(2) // both chunks in the background, nothing left over
    history.push(...result.messages!) // the engine appends the compaction's result to the history
    await conversation.turn($, turn('d', 'd', 30_000), at(22, 16, 0))
    await clock.settle()

    expect(seen.prompts).toHaveLength(3)
    expect(seen.prompts[2]).toContain('User (3:30 PM): c')
    expect(seen.prompts[2]).not.toContain('User (4:00 PM): d')
    expect(seen.prompts[2]).not.toMatch(/User \(.+\): [ab]$/m)
    expect(seen.prompts[2]).toContain('## Previous Observations\n\nDate: Sep 22, 2026\n* 🔴 (14:30) Saw a\n\n--- message boundary')
    expect(seen.logs).toContain('observational-memory: observed messages 1-5 in the background, ~10 tokens')
  })
})
