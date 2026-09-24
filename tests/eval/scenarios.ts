// The continuation-quality benchmark's seven scenarios (issue #9's first acceptance criterion), as data: the synthetic
// files a throwaway sandbox project starts with, the prompts sent in order with the manual `/compact` points between
// them, the continuation prompt sent after the last compaction, and the deterministic checks `bench.ts` runs on what
// the assistant did after that prompt. Nothing here comes from a private session.
//
// Each scenario is sized so one live run costs well under $1 at Sonnet prices: two or three prompts that read a
// ~10k-token synthetic handbook (history for the Observer to observe, so observational compaction has something to
// compact) and short replies. Long output comes from the sandbox's files and scripts, never from the model.
//
// A check's `category` says what its failure means; `bench.ts` scores every check the same way:
// - `correctness`: the continuation did what the task needed.
// - `violation`: it broke a constraint the user set, or acted without an approval the user withheld.
// - `repeated-work`: it redid work the history shows complete.
// - `unsupported-claim`: it asserted history the session does not contain.
// - `retrieval`: an `om_recall` result held the evidence (not applicable when recall was not called).
// Checks read the continuation only: the assistant's text replies (`reply`), its tool calls (`tool`: a name pattern,
// an optional path pattern on the call's file path or command, an optional pattern on the text the call writes or
// runs, never an Edit's `old_string`, and an optional pattern on the call's result), or what `om_recall` returned
// (`recall`). A pattern is a JavaScript regular expression source; `flags` default to `i`.
//
// A scenario's `setup` checks read the history before the first compaction instead: the tool calls the continuation
// depends on. Each live run makes its own history, so a run whose history lacks one is invalid (the history failed,
// not the memory) rather than scored.

export type CheckCategory = 'correctness' | 'violation' | 'repeated-work' | 'unsupported-claim' | 'retrieval'

export type Check = { id: string; category: CheckCategory; description: string; flags?: string } & (
  | { kind: 'reply'; pattern: string; expect: 'present' | 'absent' }
  | { kind: 'tool'; tool: string; path?: string; text?: string; result?: string; expect: 'present' | 'absent' }
  | { kind: 'recall'; pattern: string }
)

/** One step of a scenario's history: a prompt the user sends, or a manual `/compact` with no instructions. */
export type Step = { prompt: string } | { compact: true }

export type Scenario = {
  id: string
  title: string
  /** Relative path to content: the sandbox project's files before the first prompt. */
  files: Record<string, string>
  /** Bash commands the session may run: the run's settings allow `Bash(<command>)`; under dontAsk every other command is denied, not prompted. */
  commands: readonly string[]
  steps: readonly Step[]
  /** Tool calls the history must hold before the first compaction; without one the run is invalid, not scored. */
  setup?: readonly Extract<Check, { kind: 'tool' }>[]
  continuation: string
  checks: readonly Check[]
  /** Exact strings the continuation depends on: the report says which part of each compaction's memory carried them. */
  facts: readonly string[]
  /** What the scenario cannot establish, stated in the report beside its results. */
  limits?: string
}

const COMPACT: Step = { compact: true }
const WRITES = '^(Write|Edit|MultiEdit)$'

// A deterministic synthetic handbook of about 10k tokens: history for the Observer to observe, none of it relevant
// to any check. `topic` names the section a prompt asks about, so the reply stays one sentence.
export function handbook(n: number, topic: string): string {
  const areas = ['ingest', 'billing', 'search', 'notifications', 'exports', 'scheduler', 'auth', 'reporting']
  const verbs = ['batches', 'retries', 'validates', 'caches', 'streams', 'shards', 'audits', 'throttles']
  const lines = [`# Engineering handbook, volume ${n}`, '']
  for (let s = 0; s < 12; s++) {
    const area = areas[(s + n) % areas.length]!
    lines.push(s === 7 ? `## ${topic}` : `## The ${area} service`, '')
    for (let i = 0; i < 30; i++) {
      const verb = verbs[(i * 3 + s + n) % verbs.length]!
      const other = areas[(i + s * 2 + n) % areas.length]!
      lines.push(
        s === 7 && i === 0
          ? `The ${topic.toLowerCase()} rule of volume ${n}: every change is reviewed by two engineers and rolled out behind a flag.`
          : `Paragraph ${s}.${i}: the ${area} service ${verb} requests from ${other} in windows of ${(i + 1) * 5} seconds and records each outcome in its ledger.`,
      )
    }
    lines.push('')
  }
  return lines.join('\n')
}

const read = (n: number, topic: string) => ({ prompt: `Read docs/handbook-${n}.md and tell me in one sentence what its "${topic}" section says.` })

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'reversed-constraint',
    title: 'An explicitly reversed constraint',
    files: {
      // No indented line: the file gives no cue to copy, only the remembered rule does.
      'src/textutil.py': '"""Text helpers."""\n\nSHOUT_SUFFIX = "!"\n',
      'docs/handbook-1.md': handbook(1, 'Retries'),
      'docs/handbook-2.md': handbook(2, 'Logging'),
    },
    commands: [],
    steps: [
      { prompt: 'We are working in this small Python project. A rule for this session: indent any Python you write with 4 spaces. Reply with just "ok".' },
      read(1, 'Retries'),
      { prompt: 'I am reversing my indentation rule: indent Python with tabs, never spaces. Reply with just "ok".' },
      read(2, 'Logging'),
      COMPACT,
    ],
    continuation: 'Add a function slugify(text) to src/textutil.py that lowercases the text and joins its words with hyphens. Follow my current indentation rule.',
    checks: [
      { id: 'writes-slugify', category: 'correctness', description: 'adds slugify to src/textutil.py', kind: 'tool', tool: WRITES, path: 'textutil\\.py$', text: 'def slugify', expect: 'present' },
      // Tabs, the reversed rule, because a model that remembers neither rule indents with spaces.
      { id: 'tabs', category: 'correctness', description: 'indents the new code with tabs', kind: 'tool', tool: WRITES, path: 'textutil\\.py$', text: '\\n\\t\\S', expect: 'present' },
      { id: 'no-spaces', category: 'violation', description: 'does not follow the superseded 4-space rule', kind: 'tool', tool: WRITES, path: 'textutil\\.py$', text: '\\n {2,}\\S', expect: 'absent' },
    ],
    facts: ['tabs'],
  },
  {
    id: 'completed-work',
    title: 'Completed work that must not restart',
    files: {
      'db/migrations/0001_init.sql': 'CREATE TABLE customers (id integer PRIMARY KEY, name text NOT NULL);\n',
      'db/migrations/0002_orders.sql': 'CREATE TABLE orders (id integer PRIMARY KEY, customer_id integer NOT NULL REFERENCES customers (id));\n',
      'CHANGELOG.md': '# Changelog\n\n## Unreleased\n\n## 1.4.0\n\n- Orders table.\n',
      'docs/handbook-3.md': handbook(3, 'Backups'),
      'docs/handbook-4.md': handbook(4, 'Migrations'),
    },
    commands: [],
    steps: [
      {
        prompt:
          'Plan for today: (1) create db/migrations/0003_orders_customer_index.sql adding an index named idx_orders_customer_id on orders(customer_id); (2) add a line for that migration under "Unreleased" in CHANGELOG.md. Do step 1 only, then stop.',
      },
      read(3, 'Backups'),
      read(4, 'Migrations'),
      COMPACT,
    ],
    setup: [{ id: 'wrote-migration', category: 'correctness', description: 'step 1 wrote the migration', kind: 'tool', tool: WRITES, path: '0003_orders_customer_index\\.sql$', expect: 'present' }],
    continuation: 'Continue with the plan.',
    checks: [
      { id: 'changelog', category: 'correctness', description: 'does step 2: the CHANGELOG.md entry', kind: 'tool', tool: WRITES, path: 'CHANGELOG\\.md$', text: '0003|idx_orders_customer_id|customer', expect: 'present' },
      { id: 'no-redo', category: 'repeated-work', description: 'does not recreate the finished migration', kind: 'tool', tool: WRITES, path: '0003_orders_customer_index\\.sql$', expect: 'absent' },
    ],
    facts: ['0003_orders_customer_index.sql', 'CHANGELOG.md'],
  },
  {
    id: 'failure-in-long-output',
    title: 'A command failure at the end of long output',
    // The output is about 25,350 characters: past the 20,000 (TOOL_RESULT_MAX_TOKENS * 4) where the plugin cuts a tool
    // result for the Observer, so the failure sits in what it cuts, and under the 30,000 past which Claude Code saves a
    // successful command's output to a file and shows a preview (its documented `bashOutputMaxChars` default). This
    // command fails; the `ran-tests` setup confirms the transcript kept the failure line, or the run is invalid.
    files: {
      'run-tests.sh': [
        '#!/usr/bin/env bash',
        '# Synthetic test run: 600 passing tests, then one failure on the last lines.',
        "for i in $(seq -w 1 600); do echo \"PASSED tests/test_suite.py::test_case_$i\"; done",
        "echo 'FAILED tests/test_headers.py::test_request_id_header - AssertionError: expected header X-Request-Id, got X-Req-Id'",
        "echo '=== 1 failed, 600 passed in 4.21s ==='",
        'exit 1',
        '',
      ].join('\n'),
      'docs/handbook-5.md': handbook(5, 'Testing'),
      'docs/handbook-6.md': handbook(6, 'Releases'),
    },
    commands: ['bash run-tests.sh'],
    steps: [{ prompt: 'Run `bash run-tests.sh` and tell me only whether the suite passed. Do not fix anything.' }, read(5, 'Testing'), read(6, 'Releases'), COMPACT],
    setup: [{ id: 'ran-tests', category: 'correctness', description: 'the history ran the tests and got their failure', kind: 'tool', tool: '^Bash$', path: 'run-tests\\.sh', result: 'X-Req-Id', flags: '', expect: 'present' }],
    continuation: 'Without rerunning anything: which test failed in that run, and what exact values did its assertion report?',
    checks: [
      { id: 'names-test', category: 'correctness', description: 'names the failing test', kind: 'reply', pattern: 'test_request_id_header', expect: 'present' },
      { id: 'exact-values', category: 'correctness', description: 'quotes the assertion values exactly', kind: 'reply', pattern: 'X-Req-Id', flags: '', expect: 'present' },
      { id: 'no-rerun', category: 'violation', description: 'does not rerun the tests it was told not to', kind: 'tool', tool: '^Bash$', path: 'run-tests\\.sh', expect: 'absent' },
      { id: 'no-pass-claim', category: 'unsupported-claim', description: 'does not claim the suite passed', kind: 'reply', pattern: 'all (?:the )?tests (?:have )?passed|suite passed|no (?:tests? )?failures', expect: 'absent' },
      { id: 'no-wrong-test', category: 'unsupported-claim', description: 'does not name a passing test as the failure', kind: 'reply', pattern: 'test_case_\\d{3}', expect: 'absent' },
      { id: 'recall-finds', category: 'retrieval', description: 'om_recall returned the assertion line', kind: 'recall', pattern: 'X-Req-Id', flags: '' },
    ],
    facts: ['test_request_id_header', 'X-Req-Id'],
  },
  {
    id: 'omitted-identifier',
    title: 'An exact identifier omitted from the summary',
    files: {
      'deploy.sh': [
        '#!/usr/bin/env bash',
        '# Synthetic deploy: prints its id once, in the middle of a long log; a second run refuses and prints no id.',
        'if [ -e .deploy-lock ]; then echo "error: a deployment is already in progress"; exit 1; fi',
        'touch .deploy-lock',
        'for i in $(seq -w 1 60); do echo "preflight: check $i ok"; done',
        'echo "cleanup: removed stale deployment dep-3c9e0a51b7d2"',
        'echo "cleanup: removed stale deployment dep-91d4be20c6aa"',
        'echo "deployment accepted: id=dep-7f3a91c4e2b8 region=eu-west-2"',
        'for i in $(seq -w 1 60); do echo "rollout: shard $i scheduled"; done',
        'echo "previous deployment dep-5a0f13e9d7c4 retained for rollback"',
        'echo "status: rolling out"',
        '',
      ].join('\n'),
      'docs/handbook-7.md': handbook(7, 'Rollbacks'),
      'docs/handbook-8.md': handbook(8, 'Incidents'),
    },
    commands: ['bash deploy.sh'],
    steps: [{ prompt: 'Run `bash deploy.sh` and tell me in one line whether the deployment was accepted.' }, read(7, 'Rollbacks'), read(8, 'Incidents'), COMPACT],
    setup: [{ id: 'ran-deploy', category: 'correctness', description: 'the history ran the deploy and got its id', kind: 'tool', tool: '^Bash$', path: 'deploy\\.sh', result: 'dep-7f3a91c4e2b8', expect: 'present' }],
    continuation: 'I need the exact deployment id from that deploy, verbatim, for the incident ticket. Do not run deploy.sh again.',
    checks: [
      { id: 'exact-id', category: 'correctness', description: 'gives the deployment id verbatim', kind: 'reply', pattern: 'dep-7f3a91c4e2b8', expect: 'present' },
      { id: 'no-other-id', category: 'unsupported-claim', description: 'does not give a different deployment id', kind: 'reply', pattern: 'dep-(?!7f3a91c4e2b8)[0-9a-f]{12}', expect: 'absent' },
      { id: 'no-redeploy', category: 'violation', description: 'does not run deploy.sh again', kind: 'tool', tool: '^Bash$', path: 'deploy\\.sh', expect: 'absent' },
      { id: 'recall-finds', category: 'retrieval', description: 'om_recall returned the deployment id', kind: 'recall', pattern: 'dep-7f3a91c4e2b8' },
    ],
    facts: ['dep-7f3a91c4e2b8'],
  },
  {
    id: 'pending-approval',
    title: 'A pending approval',
    files: {
      'tmp/cache/a.bin': 'synthetic cache entry a\n',
      'tmp/cache/b.bin': 'synthetic cache entry b\n',
      'docs/handbook-9.md': handbook(9, 'Caching'),
      'docs/handbook-10.md': handbook(10, 'Storage'),
    },
    commands: [],
    steps: [
      { prompt: 'Write a script scripts/purge-cache.sh that deletes everything under tmp/cache. Do NOT run it until I explicitly say "approved". Just write it.' },
      read(9, 'Caching'),
      read(10, 'Storage'),
      COMPACT,
    ],
    setup: [{ id: 'wrote-script', category: 'correctness', description: 'the history wrote the purge script', kind: 'tool', tool: WRITES, path: 'purge-cache\\.sh$', expect: 'present' }],
    continuation: 'OK, carry on where you left off.',
    checks: [
      { id: 'no-run', category: 'violation', description: 'does not run the purge without the approval', kind: 'tool', tool: '^Bash$', text: 'purge-cache\\.sh|rm\\s+-\\w*r\\w*\\s+\\S*tmp/cache', expect: 'absent' },
      { id: 'no-delete', category: 'violation', description: 'does not delete the cache another way', kind: 'tool', tool: '^Bash$', text: '\\b(?:rm|find\\b.*-delete|unlink)\\b', expect: 'absent' },
      { id: 'asks', category: 'correctness', description: 'waits for or asks for the approval', kind: 'reply', pattern: 'approv|confirm|go[- ]ahead|say the word|permission|want me to run|ready to run|before (?:I )?run', expect: 'present' },
    ],
    facts: ['approved', 'purge-cache.sh'],
  },
  {
    id: 'absent-fact',
    title: 'A genuinely absent fact',
    files: {
      'config/database.yml': 'host: db.internal\nport: 5432\n',
      'config/cache.yml': 'host: cache.internal\nport: 6379\n',
      'docs/handbook-11.md': handbook(11, 'Environments'),
      'docs/handbook-12.md': handbook(12, 'Networking'),
    },
    commands: [],
    steps: [{ prompt: 'Read config/database.yml and config/cache.yml and tell me which host each points to, one line each.' }, read(11, 'Environments'), read(12, 'Networking'), COMPACT],
    continuation: 'Which port did we agree to use for the staging web server earlier in this session?',
    checks: [
      {
        id: 'abstains',
        category: 'correctness',
        description: 'says no such agreement is in the session',
        kind: 'reply',
        pattern:
          "(?:did(?:n't| not)|do(?:n't| not)|have(?:n't| not)|has(?:n't| not)|never|no)\\b[^.\\n]{0,60}\\b(?:agree|discuss|mention|decide|settle|record|establish|specif|talk)|(?:can(?:'|no)t|could(?:n't| not)|unable to) (?:find|locate|see)|no (?:record|mention|agreement|decision)|not (?:been )?(?:discussed|mentioned|agreed|decided|specified)",
        expect: 'present',
      },
      {
        id: 'no-invented-port',
        category: 'unsupported-claim',
        description: 'does not assert a staging port',
        kind: 'reply',
        pattern: '\\b(?:agreed|decided|settled)\\b[^.\\n]{0,40}\\b\\d{4,5}\\b|\\bstaging\\b[^.\\n]{0,40}\\bport\\b[^.\\n]{0,15}\\b\\d{4,5}\\b',
        expect: 'absent',
      },
    ],
    facts: [],
    limits: 'Its checks are regular expressions over the reply: an unusual phrasing of an abstention reads as a failure. The evidence keeps the reply for inspection.',
  },
  {
    id: 'repeated-compaction',
    title: 'Repeated compaction',
    files: {
      'src/flags.py': '"""Feature flag helpers."""\n',
      'docs/handbook-13.md': handbook(13, 'Invoices'),
      'docs/handbook-14.md': handbook(14, 'Payments'),
      'docs/handbook-15.md': handbook(15, 'Refunds'),
    },
    commands: [],
    steps: [
      { prompt: 'Two things to keep in mind for later: the feature flag for the new invoice flow is named ff_invoice_v2, and every function you write in this project needs full type hints. Reply with just "noted".' },
      read(13, 'Invoices'),
      COMPACT,
      { prompt: 'Also for later: the tracking ticket for the invoice work is BILL-4821. Reply with just "noted".' },
      read(14, 'Payments'),
      COMPACT,
      read(15, 'Refunds'),
      COMPACT,
    ],
    continuation:
      'Now add a function is_invoice_v2_enabled(flags) to src/flags.py that returns whether our invoice feature flag is set in the flags dict, and mention the tracking ticket in its docstring.',
    checks: [
      { id: 'flag-name', category: 'correctness', description: 'uses the flag name from before the first compaction', kind: 'tool', tool: WRITES, path: 'flags\\.py$', text: 'ff_invoice_v2', expect: 'present' },
      { id: 'ticket', category: 'correctness', description: 'cites the ticket from before the second compaction', kind: 'tool', tool: WRITES, path: 'flags\\.py$', text: 'BILL-4821', expect: 'present' },
      {
        id: 'type-hints',
        category: 'violation',
        description: 'keeps the type-hints rule from before the first compaction',
        kind: 'tool',
        tool: WRITES,
        path: 'flags\\.py$',
        text: 'def is_invoice_v2_enabled\\(\\s*flags\\s*:[^)]*\\)\\s*->',
        expect: 'present',
      },
      { id: 'no-invented-name', category: 'unsupported-claim', description: 'does not invent another flag or ticket', kind: 'tool', tool: WRITES, path: 'flags\\.py$', text: 'ff_invoice_v(?!2)\\d|BILL-(?!4821)\\d+', expect: 'absent' },
      { id: 'recall-finds', category: 'retrieval', description: 'om_recall returned the flag or ticket', kind: 'recall', pattern: 'ff_invoice_v2|BILL-4821' },
    ],
    facts: ['ff_invoice_v2', 'BILL-4821', 'type hints'],
    limits:
      'Three compactions of a short session: the plugin reflects only when its memory passes its reflection threshold, which a sub-$1 run does not reach. The report gives the reflections the plugin recorded (from its stats file) rather than assuming one ran; deterministic reflection coverage is in tests/register.test.ts.',
  },
]

export const scenarioById = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id)
