// The continuation score of `scripts/bench-compact.ts --continuation`: the same graded items (rubric.ts retention items,
// behavior.ts probes), regrouped by what the next agent needs to continue the work and weighted by it. Additive: the
// flat and tiered totals are unchanged beside it. Pure: no file system or model.
//
// Categories (CATEGORY_WEIGHTS): goal (the session's purpose), status (done vs not done, next steps, what waits on the
// user), rules (standing constraints and permissions), decisions (and their reasons), lessons (dead ends and failures
// not to repeat), state (what files and features do now), findings (facts that still matter), references (the paths,
// commits and PRs needed to continue), history (event order and old values om_recall recovers). Inside a category an
// item weighs its tier's weight (rubric.ts TIER: a lookup item ¼) and earns its tiered credit (a missed fact the
// context points to by a source range om_recall can follow: 0.9 if lookup, 0.25 if core). The retention score is
// scaled by the budget gate's fit, as the totals are; context size is its own small category.
import type { BGate } from './behavior'
import type { Gate, Item, Tier } from './rubric'
import { TIER, tieredCredit, tierOf } from './rubric'

export type Category = 'goal' | 'status' | 'rules' | 'decisions' | 'lessons' | 'state' | 'findings' | 'references' | 'history' | 'size'
export const CATEGORIES: Category[] = ['goal', 'status', 'rules', 'decisions', 'lessons', 'state', 'findings', 'references', 'history', 'size']
export const CATEGORY_WEIGHTS: Record<Category, number> = { goal: 10, status: 10, rules: 10, decisions: 8, lessons: 9, state: 8, findings: 6, references: 4, history: 1, size: 4 }

/** A retention gate's category. The budget gate scales the score (see continuation), in no category. */
const GATE_CATEGORY: Record<Exclude<Gate, 'budget'>, Category> = {
  purpose: 'goal',
  handoff: 'status', asks: 'status', approvals: 'status', 'in-progress': 'status',
  constraints: 'rules', corrections: 'rules', reversals: 'rules', verbatim: 'rules',
  decisions: 'decisions', rationale: 'decisions',
  lessons: 'lessons', failures: 'lessons',
  'file-state': 'state',
  facts: 'findings', 'multi-hop': 'findings', absent: 'findings',
  identifiers: 'references', commits: 'references', 'files-edited': 'references',
  chronology: 'history', recall: 'history',
  tokens: 'size',
}
/** A behavior probe's category: its gate's, a lookup value probe a reference. */
const BGATE_CATEGORY: Record<BGate, Category> = {
  purpose: 'goal', done: 'status', next: 'status', rule: 'rules', permission: 'rules', rationale: 'decisions', lessons: 'lessons',
  'file-state': 'state', value: 'findings', 'multi-hop': 'findings', false: 'findings', dropped: 'history',
}
// A hand-authored item's category by its id's type prefix (docs/research/hard-compaction-items.md), before its gate's:
// an order of events or a time something was said is history; a superseded value (sup, super) is the current state of
// the work, not a rule, whatever gate grades it; a scope item (what the user permitted) is a rule.
const ID_CATEGORY: [RegExp, Category][] = [
  [/^(?:ord(?:er)?|when|told|time|chrono)[:-]/, 'history'],
  [/^(?:sup|super)[:-]/, 'state'],
  [/^scope[:-]/, 'rules'],
]
const byId = (id: string) => ID_CATEGORY.find(([re]) => re.test(id))?.[1]

/** An item's category: its id's, else its gate's; a lookup item in findings or state is a reference. */
export function categoryOf(i: Pick<Item, 'gate' | 'id' | 'tier'>): Category | undefined {
  if (i.gate === 'budget') return undefined
  const c = byId(i.id) ?? GATE_CATEGORY[i.gate]
  return (c === 'findings' || c === 'state') && tierOf(i) === 'lookup' ? 'references' : c
}
/** A behavior probe's category, as its retention item's (its id carries the transcript's name first). */
export function probeCategory(p: { gate: BGate; id: string; tier?: Tier }): Category {
  const c = byId(p.id.slice(p.id.indexOf('/') + 1)) ?? BGATE_CATEGORY[p.gate]
  return (c === 'findings' || c === 'state') && p.tier === 'lookup' ? 'references' : c
}

export type ContinuationScore = { total: number; categories: Partial<Record<Category, { score: number; items: number }>> }

/** `xs`: [category, tier, credit 0-1]; the weighted mean over the categories with items, 0-100, times `fit`. */
function weigh(xs: readonly (readonly [Category | undefined, Tier, number])[], fit = 1): ContinuationScore {
  const categories: ContinuationScore['categories'] = {}
  for (const c of CATEGORIES) {
    const ys = xs.filter(([k]) => k === c)
    const den = ys.reduce((s, [, t]) => s + TIER.weight[t], 0)
    if (den) categories[c] = { score: (100 * ys.reduce((s, [, t, x]) => s + TIER.weight[t] * x, 0)) / den, items: ys.length }
  }
  const used = Object.keys(categories) as Category[]
  const w = used.reduce((s, c) => s + CATEGORY_WEIGHTS[c], 0)
  return { total: w ? (fit * used.reduce((s, c) => s + CATEGORY_WEIGHTS[c] * categories[c]!.score, 0)) / w : 0, categories }
}

/** The continuation score of one sample's retention items. */
export function continuation(items: readonly Item[]): ContinuationScore {
  const budget = items.filter((i) => i.gate === 'budget')
  const fit = budget.length ? budget.reduce((s, i) => s + i.score, 0) / budget.length : 1
  return weigh(items.map((i) => [categoryOf(i), tierOf(i), tieredCredit(i)] as const), fit)
}

/** The continuation score of behavior probes (majority-vote pass or fail). */
export function continuationBehavior(items: readonly { gate: BGate; id: string; pass: boolean; tier?: Tier }[]): ContinuationScore {
  return weigh(items.map((i) => [probeCategory(i), i.tier ?? 'core', i.pass ? 1 : 0] as const))
}
