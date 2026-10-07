#!/usr/bin/env bun
// Copies the plugin into ~/.claude/skills/observational-memory, where Claude Code loads it and reloads it on change.
// Not part of the plugin. Not typechecked by `tsc -p .` (Bun's Node APIs).
//
//   bun scripts/deploy.ts            check, then copy once
//   bun scripts/deploy.ts --watch    copy again after each save under hooks/, types/ or .claude-plugin/plugin.json
//   bun scripts/deploy.ts --force    overwrite files someone edited in the installed copy
//
// 1. Runs `tsc -p .` and `claude plugin validate .`. A type error in a local fixture (tests/fixtures/*.local.ts) does
//    not count: those modules are private and gitignored. Any other failure copies nothing, so a running session
//    never reloads a half-finished edit.
// 2. Refuses when a shipped file in the installed copy differs from what the last deploy wrote (an edit made there
//    would be lost). The first deploy compares against this repo instead.
// 3. Copies the shipped files, deletes shipped files the repo no longer has, and records what it wrote in .deployed.
// The plugin API types in .claude/types/ are not copied back: AGENTS.md says how to refresh them.
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, watch, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'
import { spawnSync } from 'node:child_process'

const REPO = resolve(import.meta.dir, '..')
const INSTALLED = join(homedir(), '.claude/skills/observational-memory')
const SHIPPED = ['hooks', 'types', 'LICENSES', 'THIRD_PARTY_NOTICES.md', '.claude-plugin/plugin.json']
const MANIFEST = join(INSTALLED, '.deployed')
const POINTER = `# observational-memory (installed copy)

This folder is the installed copy of the observational-memory plugin. Claude Code loads it from here.

The source is the git repo at ~/work/mods/observational-memory. Work there, not here:

1. Change to ~/work/mods/observational-memory and read its AGENTS.md.
2. Edit the files in the repo.
3. Run \`bun scripts/deploy.ts\` in the repo. It overwrites this folder's shipped files, and refuses when a file here
   changed since the last deploy.

\`bun scripts/deploy.ts\` writes this file.
`

const args = new Set(process.argv.slice(2))

function files(root: string): string[] {
  return SHIPPED.flatMap((p) => {
    const full = join(root, p)
    if (!existsSync(full)) return []
    if (statSync(full).isFile()) return [p]
    return readdirSync(full, { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => join(d.parentPath, d.name).slice(root.length + 1))
  }).sort()
}

const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

function typecheck(): boolean {
  const r = spawnSync('bunx', ['-p', 'typescript', 'tsc', '-p', '.'], { cwd: REPO, encoding: 'utf8' })
  const errors = `${r.stdout}${r.stderr}`.split('\n').filter((l) => /error TS\d+/.test(l) && !/\.local\.ts\(/.test(l))
  if (errors.length) console.error(errors.join('\n'))
  return errors.length === 0
}

function deploy(): boolean {
  if (!typecheck() || spawnSync('claude', ['plugin', 'validate', '.'], { cwd: REPO, stdio: 'inherit' }).status !== 0) {
    console.error('deploy: checks failed; nothing copied')
    return false
  }

  const repoFiles = files(REPO)
  const previous: Record<string, string> = existsSync(MANIFEST)
    ? JSON.parse(readFileSync(MANIFEST, 'utf8'))
    : Object.fromEntries(repoFiles.map((f) => [f, hash(join(REPO, f))]))
  const drifted = files(INSTALLED).filter((f) => previous[f] !== hash(join(INSTALLED, f)))
  if (drifted.length && !args.has('--force')) {
    console.error(`deploy: these installed files changed since the last deploy:\n  ${drifted.join('\n  ')}`)
    console.error(`Copy the changes into ${REPO}, or rerun with --force to overwrite them.`)
    return false
  }

  for (const f of files(INSTALLED)) if (!repoFiles.includes(f)) rmSync(join(INSTALLED, f))
  for (const f of repoFiles) {
    mkdirSync(dirname(join(INSTALLED, f)), { recursive: true })
    cpSync(join(REPO, f), join(INSTALLED, f))
  }
  writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(repoFiles.map((f) => [f, hash(join(REPO, f))])), null, 2))
  writeFileSync(join(INSTALLED, 'AGENTS.md'), POINTER)
  // Claude Code reads .claude/CLAUDE.md as project context; a CLAUDE.md at a plugin's root draws a validate warning.
  mkdirSync(join(INSTALLED, '.claude'), { recursive: true })
  writeFileSync(join(INSTALLED, '.claude/CLAUDE.md'), '@../AGENTS.md\n')

  console.log(`deploy: copied ${repoFiles.length} files to ${INSTALLED}`)
  return true
}

const ok = deploy()
if (!args.has('--watch')) process.exit(ok ? 0 : 1)

let timer: Timer | undefined
for (const p of SHIPPED) {
  if (!existsSync(join(REPO, p))) continue
  watch(join(REPO, p), { recursive: true }, () => {
    clearTimeout(timer)
    timer = setTimeout(deploy, 300)
  })
}
console.log('deploy: watching for saves (ctrl+c to stop)')
