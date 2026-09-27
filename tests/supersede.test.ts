import { describe, expect, test } from 'claude-code/testing'
import { superseded } from '../hooks/supersede'

const hidden = (lines: string[]) => superseded(lines).map((s) => lines[s.index])

describe('superseded status lines', () => {
  test('an older report of a PR’s status goes once a newer report repeats it', () => {
    const lines = [
      '🟡 2026-09-23 18:16 Assistant found PR #1417 ready for review, with the worker handling validation.',
      '🟡 2026-09-23 18:20 Assistant edited `hooks/register.ts` to add the retry.',
      '✅ 2026-09-23 19:26 PR #1417 checks were green, it was ready for review and then merged by the worker.',
    ]
    expect(superseded(lines)).toEqual([{ index: 0, by: 2 }])
  })

  test('the same subject by URL, host:port or task id', () => {
    expect(
      hidden([
        '✅ 2026-09-23 14:31 The local server at `http://localhost:5173` responded with HTTP 302.',
        '✅ 2026-09-23 18:33 Tool reported the local app at http://localhost:5173 returned HTTP 302.',
      ]),
    ).toEqual(['✅ 2026-09-23 14:31 The local server at `http://localhost:5173` responded with HTTP 302.'])
    expect(
      hidden([
        '🟡 2026-09-23 10:00 Task opie-gorman-pdf was paused awaiting review.',
        '🟡 2026-09-23 11:00 Task opie-gorman-pdf resumed and is running.',
      ]),
    ).toHaveLength(1)
  })

  test('the rendered form, with no date, reads the same', () => {
    expect(hidden(['🟡 14:39 PR #238 checks were pending.', '✅ 15:00 PR #238 checks were green.'])).toEqual(['🟡 14:39 PR #238 checks were pending.'])
  })

  test('never a 🔴 line, a 🟢 line or the user’s words', () => {
    const newer = '✅ 2026-09-23 19:26 PR #1417 checks were green and it was merged.'
    expect(hidden(['🔴 2026-09-23 18:00 PR #1417 checks were pending.', newer])).toEqual([])
    expect(hidden(['🟢 2026-09-23 18:00 PR #1417 checks were pending.', newer])).toEqual([])
    expect(hidden(['🟡 2026-09-23 18:00 User said PR #1417 checks were pending.', newer])).toEqual([])
  })

  test('never a line with a reason, a decision, a failure, a finding, a question or a quote', () => {
    const newer = '✅ 2026-09-23 19:26 PR #1417 checks were green and it was merged.'
    for (const older of [
      'PR #1417 remains green and awaiting review because the no-push rule is in force.',
      'Assistant decided PR #1417 stays parked awaiting review.',
      'PR #1417 checks failed on lint and are running again.',
      'Assistant found that PR #1417 checks are pending on a missing secret.',
      'Is PR #1417 still awaiting review?',
      'Assistant said: "PR #1417 is green."',
      'PR #1417 is ready for review but not mergeable.',
      'PR #1417 was paused and should stay open.',
    ])
      expect(hidden([`🟡 2026-09-23 18:00 ${older}`, newer])).toEqual([])
  })

  test('never a line with a specific no newer line repeats', () => {
    const newer = '✅ 2026-09-23 19:26 PR #1417 checks were green and it was merged.'
    expect(hidden(['🟡 2026-09-23 18:00 PR #1417 checks green at head `20198da4`.', newer])).toEqual([])
    expect(hidden(['🟡 2026-09-23 18:00 PR #1417 checks green, 37/37 tests passed.', newer])).toEqual([])
    expect(hidden(['🟡 2026-09-23 18:00 PR #1417 checks green with 11 checks.', newer])).toEqual([])
    // A small number counts only with its noun: `11 checks` elsewhere is not `11 lines`.
    expect(hidden(['🟡 2026-09-23 18:00 PR #1417 checks green; 11 lines changed.', '✅ 2026-09-23 19:26 PR #1417 checks green with 11 checks, merged.'])).toEqual([])
  })

  test('never a line with more than a few words of its own', () => {
    expect(
      hidden([
        '🟡 2026-09-23 18:00 PR #1417 checks green; migration adds three nullable template columns for delivery.',
        '✅ 2026-09-23 19:26 PR #1417 checks were green and it was merged.',
      ]),
    ).toEqual([])
  })

  test('a newer line about another subject, a question or with no status supersedes nothing', () => {
    const older = '🟡 2026-09-23 18:00 PR #1417 checks were pending.'
    expect(hidden([older, '✅ 2026-09-23 19:00 PR #1418 checks were pending and green.'])).toEqual([])
    expect(hidden([older, '🟡 2026-09-23 19:00 Are PR #1417 checks green yet?'])).toEqual([])
    expect(hidden([older, '🟡 2026-09-23 19:00 User said PR #1417 checks were green.'])).toEqual([])
    expect(hidden([older, '🔴 2026-09-23 19:00 PR #1417 checks were green.'])).toEqual([])
    expect(hidden([older, '🟡 2026-09-23 19:00 Assistant read PR #1417 description.'])).toEqual([])
  })

  test('a file is not a status subject: file state stays', () => {
    expect(
      hidden([
        '✅ 2026-09-23 13:20 `tests/register.test.ts` tests passed.',
        '✅ 2026-09-23 18:30 `tests/register.test.ts` tests passed again.',
      ]),
    ).toEqual([])
  })

  test('a hidden line covers nothing: each older line needs a report that stays in view', () => {
    const lines = [
      '🟡 2026-09-23 10:00 PR #7070 checks queued, run 01M375KZMHWBG5M66R86E8E1EC.',
      '🟡 2026-09-23 11:00 PR #7070 checks running, run 01M375KZMHWBG5M66R86E8E1EC.',
      '✅ 2026-09-23 12:00 PR #7070 checks green.',
    ]
    // No newer line repeats the 11:00 line's run id: it stays, and it covers the 10:00 line.
    expect(superseded(lines)).toEqual([{ index: 0, by: 1 }])
    const plain = ['🟡 2026-09-23 10:00 PR #7070 checks queued.', '🟡 2026-09-23 11:00 PR #7070 checks running.', '✅ 2026-09-23 12:00 PR #7070 checks green.']
    expect(superseded(plain)).toEqual([
      { index: 0, by: 2 },
      { index: 1, by: 2 },
    ])
  })
})
