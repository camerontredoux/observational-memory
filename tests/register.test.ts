import { describe, expect, mock, test } from 'claude-code/testing'
import type { SessionMessage } from 'claude-code'

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

describe('register', () => {
  test('observes older turns and keeps the recent ones whole, behind the observation log', async ($, on) => {
    mock.clock(on)
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
    expect(logs).toEqual(['observational-memory: observed 4 messages, kept 4; log ~14 tokens'])
  })

  test('a second compaction hands the observer the log and appends to it', async ($, on) => {
    mock.clock(on)
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
    expect(logs).toEqual(['observational-memory: model call failed: empty-reply; using the built-in compaction'])
  })

  test('a log past 40k tokens goes to the reflector, which replaces it', async ($, on) => {
    mock.clock(on)
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
})
