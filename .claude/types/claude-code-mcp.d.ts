// The inputs of the MCP tools this session had, from each server's tools/list
// inputSchema; written by `/plugin-types` (src/plugins/functionHooks/mcp-tool-types/mcp-tool-declarations.ts).
// Merges into the engine's ToolCallInput (types/ McpToolInputs) so
// `e.tool === "mcp__<server>__<tool>"` narrows to the tool's arguments.
// Regenerate rather than edit.
export {}
declare module 'claude-code' {
  interface McpToolInputs {
    /** PRIMARY TOOL — call FIRST for almost any question OR before an edit: how does X work, architecture, a bug, where/what is X, surveying an area, or the symbols you are about to change. Returns the verbatim source of the relevant symbols grouped by file in ONE capped call (Read-equivalent — treat the shown source as already Read; do NOT re-open those files), plus the call path among them. Query can be a natural-language question OR a bag of symbol/file names. Usually the ONLY call you need — more accurate context, in far fewer tokens and round-trips than a search/Read/Grep loop. */
    mcp__codegraph__codegraph_explore: {
      /** Symbol names, file names, or short code terms to explore (e.g., "AuthService loginUser session-manager", "GraphTraverser BFS impact traversal.ts"). For a flow question, name the symbols spanning the flow (e.g. "mutateElement renderScene"). A natural-language question works too — no prior codegraph_search needed. */
      query: string
      /** Maximum number of files to include source code from (default: 12) */
      maxFiles?: number
      /** Absolute path to the project to query (or any directory inside it) — codegraph uses the nearest .codegraph/ index at or above that path. Omit to use this session's default project. Pass it to query a second codebase, or when the server root has no index of its own (e.g. a monorepo where only sub-projects are indexed, so there is no default project). */
      projectPath: string
    }
  }
}
