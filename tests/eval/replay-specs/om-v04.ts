// The user's standing constraints and the questions for om-v04.jsonl (this repository's v0.4 work, 9 compactions):
// each quote is the user's own words in the span named, which `bench-replay.ts dry-run` checks against the
// transcript. A pattern shows the constraint in a compacted context; it is loose on purpose, since a summary
// paraphrases. No constraint here was reversed later in the session.
import type { ReplaySpec } from '../replay'

export const spec: ReplaySpec = {
  constraints: [
    { id: 'subagent-opus-low', quote: 'yes build it in a subagent. opus low, you are the orchestrator.', setIn: 0, held: ['opus[ ,(/-]*low', 'low[ -]effort opus'] },
    { id: 'first-message-brief', quote: 'first message always stays as the standing brief', setIn: 1, held: ['standing brief', 'first (user )?message.{0,80}(stays|kept|keep|pinned|always)'] },
    { id: 'keep-note-count', quote: 'go for it, and keep the +11 notes sure', setIn: 2, held: ['\\+\\d+ notes', '\\+N notes'] },
    { id: 'leave-rare-fallbacks', quote: 'yaeh leave it if fallbacks are rare', setIn: 7, held: ['fallbacks? (are|is) rare', 'leave .{0,60}fallback', 'fallback.{0,60}(leave|as is|rare)'] },
    {
      id: 'quiet-subagent-logs',
      quote: 'I dont need to know in the main chat that a subagent compacted.',
      setIn: 7,
      held: ['subagent.{0,120}(not|no|never|without).{0,40}(main chat|orchestrator|notif)', '(quiet|silence|hide|suppress).{0,60}subagent', 'subagent.{0,80}(quiet|silent|suppress)'],
    },
    { id: 'no-lavish', quote: 'Stop the lavish session i dont like lavish', setIn: 8, held: ["(dislike|don'?t like|does ?n[o']t like|not like|no|avoid) lavish", 'lavish.{0,60}(stop|dislike|avoid|not)'] },
  ],
  questions: [
    { id: 'subagent-model', ask: 'Which model and effort level did the user choose for the build subagent?', from: 1, expect: ['opus', 'low'] },
    { id: 'test-transcript', ask: 'Which project directory holds the long session the user pointed to as testing material?', from: 1, expect: ['oasis-pavers-and-pools-opie'] },
    { id: 'standing-brief', ask: 'What did the user say must always stay in the context as the standing brief?', from: 2, expect: ['first message'] },
    { id: 'log-notes', ask: 'Which part of the compaction logs did the user ask to keep when standardizing them?', from: 3, expect: ['+11 notes'] },
    { id: 'vcc-repo', ask: 'Which GitHub repository did the user link as the official VCC implementation?', from: 7, expect: ['lllyasviel/VCC'] },
    { id: 'subagent-logs', ask: 'What did the user want done about subagent compaction messages?', from: 8 },
    { id: 'lavish', ask: 'What did the user say about lavish?', from: 9 },
  ],
}
