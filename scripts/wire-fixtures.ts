#!/usr/bin/env bun
// Writes tests/fixtures.local.test.ts (gitignored), which runs each replay test in tests/replays.ts whose fixture
// module tests/fixtures/<name>.local.ts is present. The test runner loads no module holding import(), so a committed
// test file cannot import a module that may be absent; this file imports only the ones there. With none present it
// removes the file. The scripts that write a fixture module run it; run it by hand after writing one another way.
//   bun scripts/wire-fixtures.ts
import { existsSync, rmSync, writeFileSync } from 'node:fs'

const HERE = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const FIXTURES = `${HERE}/tests/fixtures`
const OUT = `${HERE}/tests/fixtures.local.test.ts`

// Each replay in tests/replays.ts and the module it takes, as a plain module namespace.
const PLAIN = { crewmate: 'crewmate', subagent: 'subagent', fallback: 'fallback', firstmate: 'firstmate', recallChain: 'recall-chain' }

export async function wireFixtures() {
  const imports: string[] = []
  const calls: string[] = []
  for (const [replay, module] of Object.entries(PLAIN)) {
    if (!existsSync(`${FIXTURES}/${module}.local.ts`)) continue
    imports.push(`import * as ${replay} from './fixtures/${module}.local'`)
    calls.push(`  replays.${replay}(${replay})`)
  }
  // The negative control's items, then one module per transcript, named in the first.
  if (existsSync(`${FIXTURES}/rubric-controls.local.ts`)) {
    const { names } = (await import(`${FIXTURES}/rubric-controls.local.ts`)) as { names?: string[] }
    if (!names) throw new Error('tests/fixtures/rubric-controls.local.ts is in the old one-module form: rerun bun scripts/bench-compact.ts controls')
    const parts = names.map((name, i) => {
      imports.push(`import * as control${i} from './fixtures/rubric-controls.${name}.local'`)
      return `${JSON.stringify(name)}: control${i}`
    })
    imports.push(`import * as rubricControls from './fixtures/rubric-controls.local'`)
    calls.push(`  replays.rubricControls({ items: rubricControls.items as Parameters<typeof replays.rubricControls>[0]['items'], parts: { ${parts.join(', ')} } })`)
  }
  if (!calls.length) {
    rmSync(OUT, { force: true })
    console.log(`${OUT}: no fixture modules, removed`)
    return
  }
  const body = [
    '// Written by `bun scripts/wire-fixtures.ts` for the fixture modules present. Gitignored: never commit.',
    "import { describe } from 'claude-code/testing'",
    "import * as replays from './replays'",
    ...imports,
    '',
    "describe('replays', () => {",
    ...calls,
    '})',
    '',
  ].join('\n')
  writeFileSync(OUT, body)
  console.log(`${OUT}: ${calls.length} replay(s)`)
}

if (import.meta.main) await wireFixtures()
