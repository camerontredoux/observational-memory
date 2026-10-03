// The `claude-code` module's state library for the hooks loaded under plain bun (bench-replay's om replay), where the
// bare specifier would otherwise resolve to npm's unrelated `claude-code` package. Importing this module registers a
// Bun runtime plugin, so import it before the dynamic import of hooks/register.ts. Claude Code and `claude plugin test`
// supply their own module and never load this one.
//
// atom, read and update as .claude/types/claude-code.d.ts describes them, over the caller's `$.state`: an atom is its
// reference and initial, a read answers the initial while nothing is written, and an update writes with `ifVersion`
// and tries again on a miss. Only what the hooks import: an import of anything else (derive, memberOf, the shapes of
// `atom(ref, initial, { shape })`) fails at load, rather than running something unlike the engine's.
import { plugin } from 'bun'

type Ref = { plugin: string; key: string; id?: string }
type Atom<T> = { readonly ref: Ref; readonly initial: T }
type State = {
  get: (ref: Ref) => Promise<{ value: unknown; version: number }>
  set: (ref: Ref, value: unknown, options?: { ifVersion?: number }) => Promise<{ isSet: boolean; version: number }>
}
type Dollar = { state: State }

const isAtom = (source: Ref | Atom<unknown>): source is Atom<unknown> => 'ref' in source

export const atom = <T>(ref: Ref, initial: T, options?: { shape: string }): Atom<T> => {
  if (options !== undefined) throw new Error('the claude-code shim has no shaped atoms')
  return Object.freeze({ ref: Object.freeze({ ...ref }), initial })
}

export async function read<T>($: Dollar, source: Atom<T> | Ref): Promise<T | undefined> {
  const { value } = await $.state.get(isAtom(source) ? source.ref : source)
  return value === undefined && isAtom(source) ? (source.initial as T) : (value as T | undefined)
}

export async function update<T>($: Dollar, target: Atom<T> | Ref, change: (value: T) => T): Promise<T> {
  const ref = isAtom(target) ? target.ref : target
  for (;;) {
    const held = await $.state.get(ref)
    const next = change((held.value === undefined && isAtom(target) ? target.initial : held.value) as T)
    if ((await $.state.set(ref, next, { ifVersion: held.version })).isSet) return next
  }
}

plugin({
  name: 'claude-code shim',
  setup(build) {
    build.module('claude-code', () => ({ exports: { atom, read, update }, loader: 'object' }))
  },
})
