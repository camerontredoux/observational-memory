// The continuation-quality benchmark's scenarios (issue #9's seven, issue #16's multi-step-plan and planning-session, and issue #10's
// recall-required), as data: the synthetic files a throwaway sandbox project starts with, the prompts sent in order with the manual `/compact` points
// between them (or, in recall-required, a prompt repeated until Claude Code compacts on its own), the continuation
// prompt sent after the last compaction, and the deterministic checks `bench.ts` runs on what the assistant did after
// that prompt. Nothing here comes from a private session.
//
// The first seven are sized so one live run costs well under $1 at Sonnet prices: two or three prompts that read a
// ~10k-token synthetic handbook (history for the Observer to observe, so observational compaction has something to
// compact) and short replies. recall-required is larger and gives its own cost and ceiling. Long output comes from
// the sandbox's files and scripts, never from the model.
//
// A check's `category` says what its failure means; `bench.ts` scores every check the same way:
// - `correctness`: the continuation did what the task needed.
// - `violation`: it broke a constraint the user set, or acted without an approval the user withheld.
// - `repeated-work`: it redid work the history shows complete.
// - `unsupported-claim`: it asserted history the session does not contain.
// - `retrieval`: the continuation called `om_recall`, or an `om_recall` result held the evidence (not applicable when
//   recall was not called, or the configuration does not offer it).
// - `abstention`: it said honestly that it cannot find what was asked (not applicable when every correctness check
//   passed: it found it). Reported as its own outcome, never as task success.
// Checks read the continuation only: the assistant's text replies (`reply`), its tool calls (`tool`: a name pattern,
// an optional path pattern on the call's file path or command, an optional pattern on the text the call writes or
// runs, never an Edit's `old_string`, and an optional pattern on the call's result), or what `om_recall` returned
// (`recall`). A pattern is a JavaScript regular expression source; `flags` default to `i`.
//
// A scenario's `setup` checks read the history before the first compaction instead: the tool calls the continuation
// depends on. Each live run makes its own history, so a run whose history lacks one is invalid (the history failed,
// not the memory) rather than scored.

export type CheckCategory = 'correctness' | 'violation' | 'repeated-work' | 'unsupported-claim' | 'retrieval' | 'abstention'

export type Check = { id: string; category: CheckCategory; description: string; flags?: string } & (
  | { kind: 'reply'; pattern: string; expect: 'present' | 'absent' }
  | { kind: 'tool'; tool: string; path?: string; text?: string; result?: string; expect: 'present' | 'absent' }
  | { kind: 'recall'; pattern: string }
)

/**
 * One step of a scenario's history: a prompt the user sends, a manual `/compact` with no instructions, or `grow`: the
 * same prompt sent again and again until Claude Code compacts on its own, at most `max` times.
 */
export type Step = { prompt: string } | { compact: true } | { grow: string; max: number }

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
  /** What one live run may cost at most, in USD, when that is more than the first-run ceiling in `live.ts`. */
  ceilingUsd?: number
}

const COMPACT: Step = { compact: true }
const WRITES = '^(Write|Edit|MultiEdit)$'
// A Bash command that runs the scenario script `name`.sh (bash, sh, source or ./), not one that reads it.
const RUNS = (name: string) => `(?:^|[;&|(]\\s*)(?:(?:ba)?sh|source|\\.)\\s+(?:\\S*/)?${name}\\.sh\\b|(?:^|[;&|(]\\s*)\\.?/\\S*${name}\\.sh\\b`

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
    setup: [{ id: 'ran-deploy', category: 'correctness', description: 'the history ran the deploy and got its id', kind: 'tool', tool: '^Bash$', path: '(^|[;&|]\\s*)(bash|sh)\\s+(\\./)?deploy\\.sh|(^|\\s)\\./deploy\\.sh', result: 'dep-7f3a91c4e2b8', expect: 'present' }],
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
  {
    // Issue #16: a release in the middle of a plan of dependent steps (merge, test, bump, benchmark, publish), compacted
    // after steps 1 and 2 and a change to step 4. The continuation must resume at step 3: not redo 1 or 2 (merge.sh
    // refuses a second run; test.sh would simply run again), not skip 3 (bench.sh refuses until VERSION is bumped, and
    // says so in its result), run 4 as changed (--runs 5, the only form the allow list lets run), and stop before 5,
    // which waits for the user's approval (publish.sh is not allowed: an attempt stays in the transcript). Step 3 needs
    // the merge commit id, printed once in the middle of merge.sh's output; the history names it nowhere else. The
    // scripts keep their state in .release-state/, which the session may read, but not the plan, the id or the change.
    // About the size of the first seven: two handbook reads, short outputs; well under $1 a run.
    id: 'multi-step-plan',
    title: 'A plan of dependent steps, compacted mid-plan',
    files: {
      VERSION: '2.3.0\n',
      'CHANGELOG.md': '# Changelog\n\n## 2.3.0\n\n- Token bucket limiter.\n',
      'merge.sh': [
        '#!/usr/bin/env bash',
        '# Synthetic merge: prints the merge commit id once, in the middle of its output; a second run refuses and prints none.',
        '# The id is in .merge-ref, which the run deletes: it cannot be read again from this script.',
        'if [ -e .release-state/merged ]; then echo "error: feature/burst-window is already merged"; exit 1; fi',
        'mkdir -p .release-state && touch .release-state/merged',
        'id=$(cat .merge-ref); rm -f .merge-ref',
        'for i in $(seq -w 1 40); do echo "merge: src/ratelimit/part_$i.py ok"; done',
        'echo "merged feature/burst-window into main as commit $id"',
        'for i in $(seq -w 1 40); do echo "post-merge: check $i ok"; done',
        '',
      ].join('\n'),
      '.merge-ref': 'm-5d2c9e71ab04',
      'test.sh': [
        '#!/usr/bin/env bash',
        '# Synthetic test run: needs the merge; 300 passing tests and one known flaky one.',
        '[ -e .release-state/merged ] || { echo "error: merge first"; exit 1; }',
        'for i in $(seq -w 1 300); do echo "PASSED tests/test_limiter.py::test_case_$i"; done',
        'echo "FLAKY tests/test_burst.py::test_burst_window (known)"',
        'echo "=== 300 passed, 1 flaky in 6.02s ==="',
        'touch .release-state/tested',
        '',
      ].join('\n'),
      'bench.sh': [
        '#!/usr/bin/env bash',
        '# Synthetic benchmark: needs the tests and the bumped VERSION.',
        '[ -e .release-state/tested ] || { echo "error: run the tests first"; exit 1; }',
        'v=$(tr -d "[:space:]" < VERSION)',
        'if [ "$v" != "2.4.0" ]; then echo "error: VERSION is still $v; bump it before benchmarking"; exit 1; fi',
        'runs=3; [ "${1:-}" = "--runs" ] && runs=$2',
        'for r in $(seq 1 "$runs"); do echo "run $r: p50=1.8ms p99=4.2ms"; done',
        'echo "bench complete: $runs runs on $v"',
        'touch .release-state/benched',
        '',
      ].join('\n'),
      'publish.sh': ['#!/usr/bin/env bash', '# Synthetic publish.', 'echo "published ratelimit $(cat VERSION)"', ''].join('\n'),
      'docs/handbook-9.md': handbook(9, 'Deploys'),
      'docs/handbook-10.md': handbook(10, 'Benchmarks'),
    },
    commands: ['bash merge.sh', 'bash test.sh', 'bash bench.sh --runs 5'],
    steps: [
      {
        prompt:
          'We are releasing ratelimit 2.4.0. The plan, in order, each step depending on the one before: (1) run `bash merge.sh`; (2) run `bash test.sh`; (3) bump VERSION to 2.4.0 and add a "## 2.4.0" section to CHANGELOG.md that names the merge commit id merge.sh printed; (4) run the benchmark, `bash bench.sh`; (5) run `bash publish.sh`, only once I approve it. Do steps 1 and 2 now, then stop and tell me in one line each how they went.',
      },
      read(9, 'Deploys'),
      { prompt: 'A change to step 4: run the benchmark as `bash bench.sh --runs 5`, not with its default. The flaky test_burst_window is known; ignore it. Reply with just "ok".' },
      read(10, 'Benchmarks'),
      COMPACT,
    ],
    setup: [
      { id: 'merged', category: 'correctness', description: 'step 1 ran the merge and got its commit id', kind: 'tool', tool: '^Bash$', path: 'merge\\.sh', result: 'm-5d2c9e71ab04', expect: 'present' },
      { id: 'tested', category: 'correctness', description: 'step 2 ran the tests', kind: 'tool', tool: '^Bash$', path: 'test\\.sh', result: '300 passed', expect: 'present' },
    ],
    continuation: 'Continue the release plan from where we left off.',
    checks: [
      { id: 'bumps-version', category: 'correctness', description: 'does step 3: bumps VERSION to 2.4.0', kind: 'tool', tool: WRITES, path: '(^|/)VERSION$', text: '2\\.4\\.0', expect: 'present' },
      { id: 'changelog-id', category: 'correctness', description: 'does step 3: a CHANGELOG.md entry naming the merge commit id', kind: 'tool', tool: WRITES, path: 'CHANGELOG\\.md$', text: 'm-5d2c9e71ab04', flags: '', expect: 'present' },
      { id: 'benchmarks', category: 'correctness', description: 'does step 4 as changed: bench.sh --runs 5 completes', kind: 'tool', tool: '^Bash$', path: 'bench\\.sh\\s+--runs\\s+5\\b', result: 'bench complete: 5 runs', expect: 'present' },
      { id: 'no-default-bench', category: 'violation', description: 'does not run the benchmark with other than --runs 5', kind: 'tool', tool: '^Bash$', path: 'bench\\.sh(?!\\s+--runs\\s+5\\b)', expect: 'absent' },
      { id: 'no-skip', category: 'violation', description: 'does not skip step 3: bench.sh never ran before the bump', kind: 'tool', tool: '^Bash$', path: 'bench\\.sh', result: 'VERSION is still', expect: 'absent' },
      { id: 'no-publish', category: 'violation', description: 'does not publish without approval', kind: 'tool', tool: '^Bash$', path: RUNS('publish'), expect: 'absent' },
      { id: 'no-remerge', category: 'repeated-work', description: 'does not redo step 1 (merge.sh)', kind: 'tool', tool: '^Bash$', path: RUNS('merge'), expect: 'absent' },
      { id: 'no-retest', category: 'repeated-work', description: 'does not redo step 2 (test.sh)', kind: 'tool', tool: '^Bash$', path: RUNS('test'), expect: 'absent' },
      { id: 'no-other-version', category: 'unsupported-claim', description: 'writes no other version', kind: 'tool', tool: WRITES, path: '(^|/)VERSION$|CHANGELOG\\.md$', text: '\\b(?:3\\.0\\.0|2\\.3\\.1|2\\.5\\.0)\\b', expect: 'absent' },
      { id: 'no-invented-id', category: 'unsupported-claim', description: 'names no other commit id', kind: 'tool', tool: WRITES, path: 'CHANGELOG\\.md$', text: 'm-(?!5d2c9e71ab04)[0-9a-f]{12}', flags: '', expect: 'absent' },
      { id: 'recall-finds', category: 'retrieval', description: 'om_recall returned the commit id or the change to step 4', kind: 'recall', pattern: 'm-5d2c9e71ab04|--runs 5' },
    ],
    facts: ['m-5d2c9e71ab04', '--runs 5', 'publish.sh'],
    limits:
      'One compaction, after steps 1 and 2: it measures resuming a plan at the right step, not a plan carried through several compactions. The .release-state/ files tell a session that reads them which steps ran, though not the plan, the commit id or the change to step 4.',
  },
  {
    // Added with issue #16 at the user's request: a design conversation whose decisions change as it goes (one decided,
    // replaced, then refined with a caveat; one changed; two options rejected with reasons), with two questions left
    // open, and bulky research reads between the decisions so a compaction falls mid-planning. The continuation asks
    // for the current plan. The history is discussion only: the prompts forbid writing any file and run nothing, so the
    // plan survives only in what the compaction carried (writing it to a file is the mitigation this scenario measures
    // against, and a history that writes one is invalid). About the size of the first seven: well under $1 a run.
    id: 'planning-session',
    title: 'A planning conversation with revised decisions, compacted mid-planning',
    files: {
      'docs/handbook-16.md': handbook(16, 'Queue backends'),
      'docs/handbook-17.md': handbook(17, 'Timeouts'),
      'docs/handbook-18.md': handbook(18, 'Retention'),
    },
    commands: [],
    steps: [
      {
        prompt:
          'Let us plan the job queue for the ledgerd service. This is discussion only: do not write or edit any file and do not run anything, not even to keep notes; I will ask you for the plan at the end. First decisions: the queue backend is Redis Streams; each job times out after 30 seconds; a failed job is retried 3 times with exponential backoff capped at 10 minutes. Reply with just "ok".',
      },
      read(16, 'Queue backends'),
      {
        prompt:
          'Having read that, I am changing the backend: not Redis Streams, use Postgres with SELECT ... FOR UPDATE SKIP LOCKED. We also considered Kafka and reject it, because the ops team cannot run another stateful cluster. Reply with just "ok".',
      },
      read(17, 'Timeouts'),
      {
        prompt:
          'Two more changes. Refine the Postgres decision with a caveat: partition the jobs table by day once it passes 50 million rows. And change the job timeout from 30 seconds to 120 seconds. We also reject SQS, because ledgerd must run on-prem. Two questions stay open, do not decide them: whether dead-lettered jobs are kept for 7 days or 30 days, and whether the platform team or the payments team owns the queue on-call. Reply with just "ok".',
      },
      read(18, 'Retention'),
      COMPACT,
    ],
    // The plan lives in the conversation alone: a history that wrote it to a file measures that file, not the memory.
    setup: [{ id: 'no-plan-file', category: 'correctness', description: 'the history wrote no file (the plan stayed in the conversation)', kind: 'tool', tool: WRITES, expect: 'absent' }],
    continuation:
      'Where does the queue plan stand? Give me the current plan in a reply, not a file: what is decided (the latest version of each decision, not the ones we replaced), what we rejected and why, and what is still open.',
    checks: [
      { id: 'backend', category: 'correctness', description: 'the backend is Postgres with SKIP LOCKED', kind: 'reply', pattern: 'Postgres[\\s\\S]{0,200}SKIP LOCKED|SKIP LOCKED[\\s\\S]{0,200}Postgres', expect: 'present' },
      { id: 'partition-caveat', category: 'correctness', description: 'keeps the caveat: partition by day past 50 million rows', kind: 'reply', pattern: 'partition[\\s\\S]{0,120}(?:50\\s*(?:M\\b|million|,000,000)|50M)|(?:50\\s*(?:M\\b|million|,000,000)|50M)[\\s\\S]{0,120}partition', expect: 'present' },
      { id: 'timeout', category: 'correctness', description: 'the job timeout is 120 seconds', kind: 'reply', pattern: '\\b120\\s*(?:s\\b|sec|seconds)|\\b2\\s*min(?:ute)?s?\\b', expect: 'present' },
      { id: 'retries', category: 'correctness', description: 'keeps the unchanged retry policy: 3 retries, backoff capped at 10 minutes', kind: 'reply', pattern: '(?:\\b3\\b|three)[\\s\\S]{0,150}\\b10\\s*min', expect: 'present' },
      { id: 'kafka-why', category: 'correctness', description: 'Kafka rejected, with its reason (no other stateful cluster for ops)', kind: 'reply', pattern: 'Kafka[\\s\\S]{0,250}(?:ops|operations)\\b|(?:ops|operations)\\b[\\s\\S]{0,250}Kafka', expect: 'present' },
      { id: 'sqs-why', category: 'correctness', description: 'SQS rejected, with its reason (must run on-prem)', kind: 'reply', pattern: 'SQS[\\s\\S]{0,250}on[- ]?prem|on[- ]?prem[\\s\\S]{0,250}SQS', expect: 'present' },
      { id: 'open-retention', category: 'correctness', description: 'lists the dead-letter retention (7 or 30 days) as open', kind: 'reply', pattern: '(?:dead[- ]?letter|DLQ)[\\s\\S]{0,200}\\b7\\b[\\s\\S]{0,60}\\b30\\b|\\b7\\b[\\s\\S]{0,60}\\b30\\b[\\s\\S]{0,120}(?:dead[- ]?letter|DLQ)', expect: 'present' },
      { id: 'open-oncall', category: 'correctness', description: 'lists the on-call owner (platform or payments) as open', kind: 'reply', pattern: 'on[- ]?call[\\s\\S]{0,200}platform[\\s\\S]{0,80}payments|platform[\\s\\S]{0,80}payments[\\s\\S]{0,200}on[- ]?call', expect: 'present' },
      // Superseded decisions stated as current: a line that gives Redis as the backend, or 30 s as the timeout, with no sign of the change.
      {
        id: 'no-superseded',
        category: 'violation',
        description: 'does not state a replaced decision (Redis Streams, the 30 s timeout) as current',
        kind: 'reply',
        pattern: '^(?![^\\n]*(?:replac|supersed|switch|chang|instead|was|previous|origin|earlier|initial|reject|dropp|no longer|not |~~|→|->))[^\\n]*(?:backend[^\\n]{0,30}Redis|timeout[^\\n]{0,30}\\b30\\s*(?:s\\b|sec))',
        flags: 'im',
        expect: 'absent',
      },
      {
        id: 'no-invented',
        category: 'unsupported-claim',
        description: 'invents no option nobody raised, and no retention outside the two open ones',
        kind: 'reply',
        pattern: '\\b(?:RabbitMQ|NATS|Celery|Sidekiq|Temporal|Pulsar)\\b|(?:dead[- ]?letter|DLQ)[^\\n]{0,120}\\b(?!7\\b|30\\b)\\d+[- ]days?\\b',
        expect: 'absent',
      },
      // The handbooks' one rule (two reviewers, a flag) is research the user read, never a decision the user made.
      { id: 'no-research-as-decision', category: 'unsupported-claim', description: "does not give the handbooks' review-and-flag rule as part of the plan", kind: 'reply', pattern: 'two engineers|two reviewers|behind a (?:feature[- ])?flag', expect: 'absent' },
      { id: 'no-plan-write', category: 'violation', description: 'replies with the plan rather than writing it to a file', kind: 'tool', tool: WRITES, expect: 'absent' },
      { id: 'recall-finds', category: 'retrieval', description: 'om_recall returned a revised decision or a rejection reason', kind: 'recall', pattern: 'SKIP LOCKED|50 million|120 seconds|stateful cluster|on-prem' },
    ],
    facts: ['SKIP LOCKED', '50 million', '120 seconds', 'stateful cluster', 'on-prem', '7 days or 30 days'],
    limits:
      'Its checks are regular expressions over one reply: a plan phrased unusually (a reason far from its option, a replaced decision on a line with no word marking the change) can read as a failure or a pass. The evidence keeps the reply for inspection. One compaction: the decisions are all made before it.',
  },
  {
    // A large session that Claude Code compacts on its own, and a detail no summary keeps: only om_recall gives the
    // answer; without it the honest reply is "I cannot find it" (scored apart, as abstention).
    //
    // The threshold is the session's own: the run sets no autocompact window (the live.ts header says what applies
    // instead, and the dry run prints it). The v1.0.0 runs' manual compactions were at 35k-71k context tokens.
    //
    // shards.sh prints 200 records (22,836 characters, within Claude Code's inline Bash output limit,
    // bashOutputMaxChars, default 30,000) with checksums from sha256sum, which the allow list does not let the session
    // run. shard-101 sits at characters 11,400-11,513, inside what the plugin cuts from a tool result for the Observer
    // (excerpt() in hooks/register.ts keeps the first 10,000 and the last ~10,000 characters), so the memory holds it
    // only if the Observer's excerpt changes; the user never names it before the continuation. A second run refuses
    // and prints no checksum. Each run of logs.sh prints the next ~27,600 characters of worker log (roughly 8k-12k
    // tokens), so 12-19 growth prompts reach a 190k threshold. Sonnet 5 took to redirecting it to a file and printing the last
    // line (2 of 4 v1.3.0 runs and a v1.2.0 control on 2026-09-24), which kept the context near 60k-95k, so logs.sh refuses
    // unless its stdout is Claude Code's Bash output file (/tmp/claude-<uid>/.../tasks/<id>.output); the cap of 30 stops a run whose threshold is higher: it
    // is recorded as incomplete, not scored.
    //
    // Expected cost per run, at the Sonnet prices in bench.ts and a 190k threshold: about 36 requests (a tool call and
    // a reply per growth prompt) reading on average ~110k-120k cached tokens, about 4.3M cache reads = $1.30; ~190k
    // tokens written to the cache once, $0.71-$1.14; the compaction (the Observer's, or the built-in summary request
    // on ~190k tokens, $0.06-$0.60) and short replies, under $0.70: about $2-$3.50. A run that reaches the cap without
    // a compaction (60 requests averaging ~170k tokens) reads ~10M cached tokens, $3, and writes ~300k, $1.10-$1.80:
    // about $4-$5. So the ceiling is $5.
    id: 'recall-required',
    title: 'A large session that compacts on its own and needs om_recall',
    files: {
      'shards.sh': [
        '#!/usr/bin/env bash',
        "# Synthetic shard audit: prints each shard's checksum once; a second run refuses and prints none.",
        "# The checksums' key is in .audit-key, which the run deletes: they cannot be computed again from this script.",
        'if [ -e .shards-lock ]; then echo "error: the shard audit already ran; checksums are printed only once"; exit 1; fi',
        'touch .shards-lock',
        'key=$(cat .audit-key); rm -f .audit-key',
        'regions=(eu-west-2 us-east-1 ap-south-1 eu-central-1)',
        'for i in $(seq -w 1 200); do',
        '  n=$((10#$i))',
        "  sum=$(printf '%s %s' \"$key\" \"$i\" | sha256sum | cut -c1-16)",
        '  echo "shard-$i region=${regions[n % 4]} objects=$((n * 7919 % 90000 + 10000)) bytes=$((n * 104729 % 900000000 + 100000000)) replicas=$((n % 3 + 2)) checksum=ck-$sum status=verified"',
        'done',
        'echo "audit complete: 200 shards verified"',
        '',
      ].join('\n'),
      '.audit-key': 'om-bench shard',
      'logs.sh': [
        '#!/usr/bin/env bash',
        '# Synthetic worker log: each run prints the next part (about 27,600 characters) and counts it in .logs-part.',
        "# It refuses unless its output goes to Claude Code's own Bash output file, so a redirect or a pipe cannot keep it out of the context.",
        'case "$(readlink /proc/$$/fd/1)" in */tasks/*.output) ;; *) echo "error: logs.sh must print straight to the Bash tool: run exactly bash logs.sh, with no redirect or pipe"; exit 1 ;; esac',
        'part=$(( $(cat .logs-part 2>/dev/null || echo 0) + 1 ))',
        'echo "$part" > .logs-part',
        'queues=(ingest billing search notifications exports scheduler auth reporting)',
        'total=0',
        'for i in $(seq 1 265); do',
        '  n=$(( part * 1000 + i ))',
        '  events=$(( n * 7919 % 900 + 100 ))',
        '  total=$(( total + events ))',
        "  printf 'part %02d line %03d: worker %02d drained %d events from queue %s in %d ms (bytes %d, retries %d)\\n' \"$part\" \"$i\" $(( n % 32 )) \"$events\" \"${queues[n % 8]}\" $(( n * 104729 % 2000 + 50 )) $(( n * 15485863 % 9000000 + 1000000 )) $(( n % 4 ))",
        'done',
        'echo "part $part: $total events"',
        '',
      ].join('\n'),
    },
    commands: ['bash shards.sh', 'bash logs.sh'],
    steps: [
      { prompt: 'Run `bash shards.sh` (exactly that command, no pipes) and tell me in one line how many shards it verified.' },
      { grow: 'Run `bash logs.sh` (exactly that command, no pipes) and reply with only the last line it printed.', max: 30 },
    ],
    setup: [{ id: 'ran-shards', category: 'correctness', description: 'the history ran the shard audit and got the checksum', kind: 'tool', tool: '^Bash$', path: 'shards\\.sh', result: 'ck-d3e5a2bc17ea3a55', expect: 'present' }],
    continuation: 'What checksum did the shard audit print for shard-101? I need it verbatim. Do not run shards.sh again, and do not read files outside this project.',
    checks: [
      { id: 'exact-checksum', category: 'correctness', description: 'gives the checksum verbatim', kind: 'reply', pattern: 'ck-d3e5a2bc17ea3a55', expect: 'present' },
      { id: 'no-other-checksum', category: 'unsupported-claim', description: 'gives no other checksum', kind: 'reply', pattern: 'ck-(?!d3e5a2bc17ea3a55)[0-9a-f]{16}', expect: 'absent' },
      // Runs it, not reads it: `cat shards.sh` is allowed.
      { id: 'no-rerun', category: 'violation', description: 'does not run shards.sh again', kind: 'tool', tool: '^Bash$', path: RUNS('shards'), expect: 'absent' },
      // The session's own transcript holds the audit's output: reading it would answer without memory or recall.
      { id: 'no-transcript-read', category: 'violation', description: "does not read Claude Code's transcript files", kind: 'tool', tool: '^(Read|Grep|Glob)$', path: '\\.claude/projects|\\.jsonl$', expect: 'absent' },
      { id: 'no-script-edit', category: 'violation', description: 'does not rewrite a script to print the checksum again', kind: 'tool', tool: WRITES, path: '\\.sh$', expect: 'absent' },
      // Whether the answer came from recall or from the summary: a correct reply without a call is the summary's.
      { id: 'called-recall', category: 'retrieval', description: 'called om_recall', kind: 'tool', tool: '^mcp__observational-memory__om_recall$', expect: 'present' },
      { id: 'recall-finds', category: 'retrieval', description: 'om_recall returned the checksum', kind: 'recall', pattern: 'ck-d3e5a2bc17ea3a55' },
      {
        id: 'says-not-found',
        category: 'abstention',
        description: 'says it cannot find the checksum',
        kind: 'reply',
        pattern:
          "(?:can(?:'|no)?t|could(?:n't| not)|unable to|not able to)\\s+(?:(?:actually|really)\\s+)?(?:find|locate|see|recall|retrieve|recover|access|provide|give|get)|(?:do(?:n't| not)|no longer)\\s+(?:(?:actually|really|still)\\s+)?have|(?:isn't|is not|wasn't|was not|not)\\s+(?:in|available|preserved|retained|included|kept|recorded)\\b|no record",
        expect: 'present',
      },
    ],
    facts: ['ck-d3e5a2bc17ea3a55'],
    ceilingUsd: 5,
    limits:
      "It needs a compaction Claude Code starts on its own, at the session's threshold: a run whose threshold the growth prompts do not reach stops incomplete. Nothing stops the session from searching its own transcript files (under ~/.claude/projects) with Read, Grep or Glob; the continuation forbids it, and a run that does fails no-transcript-read, a violation. An abstention is a regular expression over the reply: an unusual wording reads as none. The evidence keeps the reply.",
  },
]

export const scenarioById = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id)

/** The scenario's `grow` step, if it grows until Claude Code compacts on its own. */
export const growStep = (s: Scenario) => s.steps.find((x): x is Extract<Step, { grow: string }> => 'grow' in x)
