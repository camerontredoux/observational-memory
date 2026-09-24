// The user's standing constraints and the questions for om-orchestration.jsonl (this repository's v1.0 work, 5
// compactions): each quote is the user's own words in the span named, which `bench-replay.ts dry-run` checks against
// the transcript. A pattern shows the constraint in a compacted context; it is loose on purpose, since a summary
// paraphrases. No constraint here was reversed later in the session.
import type { ReplaySpec } from '../replay'

export const spec: ReplaySpec = {
  constraints: [
    { id: 'merge-after-review', quote: 'Merge yourself after review.', setIn: 0, held: ['merge (it )?yourself', 'merges? .{0,40}after (the )?reviews?', 'self-merge'] },
    { id: 'one-version-bump', quote: 'One major version bump at the end.', setIn: 0, held: ['one (major )?version bump', '(single|one) (major )?bump', 'bump .{0,40}(once|at the end)'] },
    { id: 'three-lanes-at-once', quote: 'Run all three lanes at once.', setIn: 0, held: ['three lanes', 'lanes .{0,30}(at once|in parallel|concurrent)'] },
    { id: 'two-reviewers', quote: 'I want it to actually use two separate agents, one for spec and one for standards', setIn: 0, held: ['spec\\b.{0,60}standards', 'standards.{0,60}\\bspec\\b'] },
    { id: 'worktrees-dir', quote: 'And worktrees should be made in .worktrees', setIn: 0, held: ['\\.worktrees'] },
    { id: 'reviewer-effort', quote: 'Reviewer agents should always be at or above the effort level of the implemeter', setIn: 0, held: ['at or above', 'reviewers?.{0,80}effort.{0,40}(≥|>=|at least|above|implement)'] },
    { id: 'guidance-not-limits', quote: 'We need more clear guidance rather than strict rules', setIn: 0, held: ['guidance rather than', 'not (strict|hard) (rules|limits)', 'no hard limits'] },
    { id: 'spend-limit', quote: 'spending limit is like $30-$50', setIn: 0, held: ['\\$30', '\\$50'] },
    { id: 'three-runs', quote: 'idk like 3 runs per config', setIn: 0, held: ['(3|three) runs'] },
    { id: 'larger-window-recall', quote: 'yeah we should do a scenario where it compacts on a larger window and requires om_recall to be used.', setIn: 3, held: ['larger (context )?window', 'recall-required'] },
  ],
  questions: [
    { id: 'worktrees', ask: 'In which directory must the agents create their git worktrees?', from: 1, expect: ['.worktrees'] },
    { id: 'base-spec', ask: 'Which GitHub issue is the base spec for the open tickets?', from: 1, expect: ['#1'] },
    { id: 'reviewers', ask: 'How does the code review step split its work between agents?', from: 1, expect: ['spec', 'standards'] },
    { id: 'budget', ask: 'What spending limit did the user set for benchmark runs with paid models?', from: 1, expect: ['30', '50'] },
    { id: 'runs', ask: 'How many runs per configuration did the user ask for?', from: 1 },
    { id: 'reviewer-effort', ask: "How must a reviewer agent's effort level compare with the implementer's?", from: 1 },
    { id: 'larger-window', ask: 'What new benchmark scenario did the user ask for after asking how big the context windows were?', from: 4 },
    { id: 'pi-extension', ask: 'Where did the user say the Pi observational-memory extension lives?', from: 5, expect: ['.pi'] },
  ],
}
