// The behavior check of `scripts/bench-compact.ts --behavior`: probes built from rubric items, asked of a reader model
// (Luna) given a compacted context, and graded by code. Pure: the caller makes the model and om_recall calls.
import type { Context, ReplaySpec, Transcript } from './replay'
import { contextText, holds, isTyped, neededIdentifiers } from './replay'
import type { Expect, Gate, RubricSpec } from './rubric'
import { hasExpect, itemGate, norm } from './rubric'

export type BGate = 'rule' | 'permission' | 'done' | 'next' | 'value' | 'lessons' | 'file-state' | 'multi-hop' | 'rationale' | 'purpose' | 'dropped' | 'false'
export const BGATES: BGate[] = ['rule', 'permission', 'done', 'next', 'value', 'lessons', 'file-state', 'multi-hop', 'rationale', 'purpose', 'dropped', 'false']
/** A rubric item's probe gate: the hard types keep their retention gate's name; constraints and reversals are rules. */
const bgate = (g: Gate): BGate => (g === 'constraints' || g === 'reversals' ? 'rule' : g === 'lessons' || g === 'file-state' || g === 'multi-hop' || g === 'rationale' || g === 'purpose' ? g : 'value')
/** `answer`: a pattern (case-insensitive) for rule/value/next, the word for permission, the short SHA for done. */
export type Probe = { gate: BGate; id: string; ask: string; answer?: string; expect?: readonly Expect[]; quoteOf?: string; query?: readonly string[] }
export type Answer = { id?: string; answer?: unknown; evidence?: unknown; note?: unknown; recall_query?: unknown }

export const PROMPT = `You are a continuation auditor. Below is the complete context an AI coding agent
has after its memory was compacted. You are that agent, about to continue.

Answer each probe using ONLY this context. Rules:
1. Never use outside knowledge or guess. If the context does not settle the
   answer, answer "unknown".
2. Every non-unknown answer must include "evidence": an exact, character-for-
   character quote from the context (10–200 chars) that supports it.
3. If two statements conflict, the later one wins. Say so in "note".
4. For permission probes answer exactly one of: "yes", "no", "ask".
5. Whenever you answer "unknown", give "recall_query": the keywords you would
   search the session history with to find the answer.
6. Output one JSON array, one object per probe, in probe order, with keys
   id, answer, evidence, note, recall_query. No other text.`

const inSpan = (x: { from: number; to?: number }, n: number) => x.from <= n && (x.to === undefined || n <= x.to)
const hasAll = (text: string, p: Probe) => p.expect!.every((e) => hasExpect(squash(text).toLowerCase(), norm(text), e, /^(?:exact|str)[:-]/.test(p.id)))
const COMMIT = /^\[([\w./-]+)(?: \(root-commit\))? ([0-9a-f]{7,40})\] (.{8,120})$/gm
/** A stable pseudo-random order: the same sample of mechanical probes every run. */
const rank = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)

/** The probes at boundary `n`, from the ReplaySpec, the RubricSpec, and mechanically from the transcript. */
export function probes(t: Transcript, n: number, spec?: ReplaySpec, rubric?: RubricSpec): Probe[] {
  const out: Probe[] = []
  for (const p of rubric?.probes ?? []) if (inSpan(p, n)) out.push({ gate: p.kind, id: `${p.kind}:${p.of}`, ask: p.ask, answer: p.answer })
  for (const q of spec?.questions ?? [])
    if (q.expect?.length && inSpan(q, n)) out.push({ gate: q.to === undefined ? 'value' : 'next', id: q.id, ask: q.ask, expect: q.expect })
  for (const f of rubric?.facts ?? [])
    if (f.ask && inSpan(f, n)) out.push({ gate: bgate(itemGate(f.id, f.gate, 'facts')), id: f.id, ask: f.ask, answer: f.answer, expect: f.expect })
  for (const l of rubric?.latest ?? []) if (l.ask && inSpan(l, n)) out.push({ gate: bgate(itemGate(l.id, l.gate, 'reversals')), id: l.id, ask: l.ask, answer: l.answer ?? l.current })
  for (const a of rubric?.absent ?? []) if (a.ask && inSpan(a, n)) out.push({ gate: 'false', id: a.id, ask: a.ask, answer: a.pattern })
  for (const r of rubric?.recall ?? []) if (r.ask && inSpan(r, n)) out.push({ gate: 'dropped', id: r.id, ask: r.ask, expect: r.expect, query: r.expect })

  const before = t.spans.slice(0, n).flat()
  // Done or not: the newest commits of the last three spans, asked by subject.
  const made = t.spans.slice(Math.max(0, n - 3), n).flat().flatMap((r) => (r.toolResults ?? []).flatMap((x) => [...x.text.matchAll(COMMIT)]))
  const subjects = new Set<string>()
  for (const m of made.reverse()) {
    if (subjects.has(m[3]!) || subjects.size >= 2) continue
    subjects.add(m[3]!)
    out.push({ gate: 'done', id: `commit:${m[2]!.slice(0, 7)}`, ask: `Has a commit with the subject "${m[3]}" already been made? If it has, answer "done" and give its short SHA; if not, "not done". Should you make it again?`, answer: m[2]!.slice(0, 7) })
  }
  // And the newest pull requests the assistant reported merged in the last three spans.
  const merged = new Set<string>()
  for (const r of t.spans.slice(Math.max(0, n - 3), n).flat().reverse())
    if (r.role === 'assistant')
      for (const m of r.text.matchAll(/[^.\n]*github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+)[^.\n]*/g))
        if (/\bmerged\b/i.test(m[0]) && !/\b(not|n't|once|when|after|until)\b[^.]{0,30}merged/i.test(m[0]) && merged.size < 2) merged.add(m[1]!)
  for (const pr of merged) out.push({ gate: 'done', id: `pr:${pr}`, ask: `Is the work of PR #${pr} finished and merged? Answer "done" or "not done". Should you redo it?` })
  // The next step: the user's newest message, quoted.
  const last = before.filter(isTyped).at(-1)
  if (last) out.push({ gate: 'next', id: `last-ask:${last.line}`, ask: "What is the user's most recent request to you? Quote it in evidence.", quoteOf: last.text })
  // Exact values: two paths used after the cut, asked by their file name.
  const paths = neededIdentifiers(t, n).filter((x) => x.kind === 'path')
  const base = (p: string) => p.slice(p.lastIndexOf('/') + 1)
  const unique = paths.filter((x) => base(x.key).length >= 6 && paths.filter((y) => base(y.key) === base(x.key)).length === 1)
  for (const x of unique.sort((a, b) => rank(a.key) - rank(b.key)).slice(0, 2))
    out.push({ gate: 'value', id: `path:${x.key}`, ask: `What is the full path of \`${base(x.key)}\` in this session?`, answer: x.key })
  return out
}

/** The model's input: the context exactly as the next turn sees it, then the probes. */
export function input(context: Context, ps: readonly Probe[]) {
  const lines = ps.map((p, i) => JSON.stringify({ id: `p${i + 1}`, ...(p.gate === 'permission' ? { kind: 'permission' } : {}), probe: p.ask }))
  return `<context>\n${contextText(context)}\n</context>\n\nProbes:\n${lines.join('\n')}\n`
}

export function parse(reply: string, n: number): Answer[] {
  const a = reply.indexOf('[')
  const b = reply.lastIndexOf(']')
  try {
    const xs = JSON.parse(reply.slice(a, b + 1)) as Answer[]
    return Array.from({ length: n }, (_, i) => xs.find((x) => x.id === `p${i + 1}`) ?? xs[i] ?? {})
  } catch {
    return Array.from({ length: n }, () => ({}))
  }
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim()
const str = (x: unknown) => (typeof x === 'string' ? x : x === undefined || x === null ? '' : JSON.stringify(x))
export const isUnknown = (a: Answer) => /^unknown\b/i.test(str(a.answer).trim())

/** Grades one answer. `ctx` is the squashed context text; `recalled`, what om_recall's search returned for its recall_query. */
export function gradeAnswer(p: Probe, a: Answer, ctx: string, recalled?: string): { pass: boolean; why: string } {
  const ans = squash(str(a.answer))
  const ev = squash(str(a.evidence))
  const short = (s: string) => (s.length > 70 ? `${s.slice(0, 70)}…` : s)
  const said = `"${short(ans)}"`
  if (!ans) return { pass: false, why: 'no answer' }
  if (isUnknown(a)) {
    if (p.gate === 'false') return { pass: true, why: 'unknown' }
    if (p.gate === 'dropped') {
      const ok = !!recalled && p.query!.every((e) => squash(recalled).toLowerCase().includes(e.toLowerCase()))
      return { pass: ok, why: `unknown, recall "${short(str(a.recall_query))}" ${ok ? 'finds it' : 'misses'}` }
    }
    return { pass: false, why: 'unknown' }
  }
  // A quote survives the reader dropping markdown and quote marks, and a trailing ellipsis.
  const bare = (s: string) => squash(s.replace(/[`*_"'“”‘’]/g, '').replace(/(?:…|\.\.\.)$/, '')).toLowerCase()
  if (ev.length < (p.quoteOf ? 2 : 8) || !bare(ctx).includes(bare(ev))) return { pass: false, why: `${said}, evidence not in the context: "${short(ev)}"` }
  const both = `${ans}\n${ev}`
  const ok = (() => {
    switch (p.gate) {
      case 'permission':
        return ans.toLowerCase().replace(/[^a-z]/g, '') === p.answer
      case 'done':
        return /^(done|yes)\b/i.test(ans) && !/\bnot done\b/i.test(ans) && (!p.answer || new RegExp(`\\b${p.answer}`, 'i').test(both))
      case 'false':
        return /^(no|none|never|not|nothing)\b/i.test(ans) && !new RegExp(p.answer!, 'i').test(ans)
      case 'next':
        if (p.quoteOf) {
          const q = squash(p.quoteOf).toLowerCase()
          const e = ev.toLowerCase()
          return (e.length >= 10 && q.includes(e)) || e.includes(q.slice(0, 100))
        }
        return hasAll(both, p)
      default:
        if (p.id.startsWith('path:')) return holds(both, p.answer!, 'path') || both.includes(p.answer!.replace(/^~/, ''))
        return p.answer ? new RegExp(p.answer, 'i').test(both) : hasAll(both, p)
    }
  })()
  return { pass: ok, why: `${said}${ok ? '' : ' (wrong)'}` }
}

export const contextSquashed = (c: Context) => squash(contextText(c))
