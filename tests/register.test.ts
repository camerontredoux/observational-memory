import { describe, expect, mock, test } from 'claude-code/testing'
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

// What the plugin reads beneath it besides the model: the environment, its store and the session id.
function world(on: On, env: Record<string, string> = {}) {
  mock.env(on, env)
  mock.store(on)
  on('session.id', () => ({ value: 'session-1' }))
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
    mock.clock(on)
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
    expect(result.messages?.[0]?.text).toContain('<observations>\nDate: Sep 22, 2026\n* 🔴 Explored the auth module\n</observations>')
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
      'Skill `deploy` is still needed for the ongoing work',
      'Skill `lint` is still needed for the ongoing work',
    ])
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
})
