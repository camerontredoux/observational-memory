// Jev (TypeSafe's System One model): a typed yes/no question over a JSON state, answered as a probability. The
// Observer decides by prompt what is a standing rule and what a correction replaces; code asks Jev the same questions
// one line at a time (jevCheck in register.ts). Opt-in: OM_JEV=1 and TYPESAFE_API_KEY. What it sends: the user's sentences of the chunk and
// the constraints they may replace. Any failure answers undefined, and the caller keeps the Observer's decision.
export const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
export const JEV_MODEL = 'jev-latest'
export const JEV_TIMEOUT_MS = 10_000

export type Noul = { type: 'noul'; instructions: string; criteria: { true: string; false: string } }

// Is `sentence`, said by the user, a standing rule rather than a one-time request or go-ahead?
export const STANDING: Noul = {
  type: 'noul',
  instructions:
    'The user said `sentence` (part of `message`) to a coding assistant. Does `sentence` set a standing constraint: a rule, preference, prohibition or limit that stays in force after the current action is done?',
  criteria: {
    true: 'A rule for the rest of the work: "always run the linter first", "never push to main", "use bun here", "keep the changelog short", "only touch files under src/"',
    false: 'A one-time request, question, go-ahead or remark: "go for it", "push it", "run the tests", "what does this do?", "thanks", "looks good"',
  },
}

// Does `new_message` lift or change `old_rule` for the rest of the work, rather than approve one action?
export const LIFTS: Noul = {
  type: 'noul',
  instructions:
    'A coding assistant works under `old_rule`, set by the user earlier. The user then said `new_message`. Does `new_message` lift, change or reverse `old_rule` for the rest of the work?',
  criteria: {
    true: 'The user changes or drops the rule itself: "you can push to main from now on", "forget what I said about npm, use bun", "ignore that limit"',
    false: 'The user approves one action, answers a question or says something else, and `old_rule` stays in force afterwards: "push this fix", "yes do it", "go ahead"',
  },
}
