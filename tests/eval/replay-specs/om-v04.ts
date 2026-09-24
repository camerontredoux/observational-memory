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
    { id: 'standing-brief', ask: 'What did the user say must always stay in the context as the standing brief?', from: 2, expect: ['first'] },
    { id: 'log-notes', ask: 'Which part of the compaction logs did the user ask to keep when standardizing them?', from: 3, expect: ['+11 notes'] },
    { id: 'vcc-repo', ask: 'Which GitHub repository did the user link as the official VCC implementation?', from: 7, expect: ['lllyasviel/VCC'] },
    { id: 'subagent-logs', ask: 'What did the user want done about subagent compaction messages?', from: 8 },
    { id: 'lavish', ask: 'What did the user say about lavish?', from: 9 },
    // The handoff, each at one boundary (#15's continuation record): what the assistant did right after the cut
    // in the real session, and its last report to the user before it.
    { id: 'next-1', ask: 'What was the assistant about to do next when this context begins?', from: 1, to: 1, expect: ['stats'] },
    { id: 'told-1', ask: 'What had the assistant most recently reported to the user?', from: 1, to: 1, expect: ['brief'] },
    { id: 'next-2', ask: 'What was the assistant about to do next when this context begins?', from: 2, to: 2, expect: ['APPEND_SYSTEM.md'] },
    { id: 'told-2', ask: 'What had the assistant most recently reported to the user?', from: 2, to: 2, expect: ['minimal'] },
    { id: 'next-3', ask: 'What was the assistant about to do next when this context begins?', from: 3, to: 3, expect: ['concurrent'] },
    { id: 'told-3', ask: 'What had the assistant most recently reported to the user?', from: 3, to: 3, expect: ['25 messages'] },
    { id: 'next-4', ask: 'What was the assistant about to do next when this context begins?', from: 4, to: 4, expect: ['retry'] },
    { id: 'next-5', ask: 'What was the assistant about to do next when this context begins?', from: 5, to: 5, expect: ['replay'] },
    { id: 'told-5', ask: 'What had the assistant most recently reported to the user?', from: 5, to: 5, expect: ['stall'] },
    { id: 'next-6', ask: 'What was the assistant about to do next when this context begins?', from: 6, to: 6, expect: ['vcc'] },
    { id: 'told-6', ask: 'What had the assistant most recently reported to the user?', from: 6, to: 6, expect: ['script'] },
    { id: 'next-7', ask: 'What was the assistant about to do next when this context begins?', from: 7, to: 7, expect: ['recall-v2'] },
    { id: 'told-7', ask: 'What had the assistant most recently reported to the user?', from: 7, to: 7, expect: ['vcc-brief'] },
    { id: 'next-8', ask: 'What was the assistant about to do next when this context begins?', from: 8, to: 8, expect: ['subagent'] },
    { id: 'told-8', ask: 'What had the assistant most recently reported to the user?', from: 8, to: 8, expect: ['144'] },
    { id: 'next-9', ask: 'What was the assistant about to do next when this context begins?', from: 9, to: 9, expect: ['default'] },
    { id: 'told-9', ask: 'What had the assistant most recently reported to the user?', from: 9, to: 9, expect: ['power'] },
  ],
}
