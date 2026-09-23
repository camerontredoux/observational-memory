# Issue tracker: GitHub

Issues and specs live in GitHub Issues for
`camerontredoux/observational-memory`.

Use the installed GitHub tooling. Infer the repository from the Git remote.

## Ticket operations

- Publish to the issue tracker: create a GitHub issue.
- Fetch a ticket: read its body, labels, and comments.
- List tickets: filter by state and the relevant labels.
- Record findings and questions as issue comments.
- Apply label names from `docs/agents/triage-labels.md`.
- When closing a ticket, explain its resolution.

GitHub issues and pull requests share a number space. Resolve which kind a
reference names before acting on it.

## Pull requests as a triage surface

PRs as a request surface: no.

If this flag changes to `yes`, include external pull requests in triage.
Read their descriptions, comments, labels, and diffs. Include authors with
association `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE`.
Exclude `OWNER`, `MEMBER`, and `COLLABORATOR`.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, with Notes, Decisions-so-far,
  and Fog sections.
- Child ticket: link it to the map as a GitHub sub-issue. If sub-issues
  are unavailable, use a task list in the map and a `Part of #<map>`
  line in the child.
- Ticket type: use `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling`, or `wayfinder:task`.
- Blocking: use native GitHub issue dependencies. If unavailable, use
  a `Blocked by: #<number>` line in the child. A ticket is unblocked
  when every blocker is closed.
- Frontier: select the first open child in map order that has no open
  blockers and no assignee.
- Claim: assign the selected ticket to the driving developer as the
  session's first tracker write.
- Resolve: comment with the answer, close the ticket, and add a context
  pointer to the map's Decisions-so-far section.
