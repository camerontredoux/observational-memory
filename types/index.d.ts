// A background model call the band above the prompt shows: running until `settled` is set, then for a few seconds
// after with how it ended (`added` observations, or `failed`).
export type Worker = {
  id: string
  kind: 'observer' | 'reflector'
  settled?: { at: number; failed?: true; added?: number }
}

declare module 'claude-code' {
  interface PluginState {
    'observational-memory': {
      workers: Worker[]
      frame: number
    }
  }
}
