# Agent Coordination & Roles

## Role Definitions & Boundaries

## Core Directives & Quality Safeguards

- **Content Authenticity:** Preserve Mohammad's authentic voice, personal profile details, experience, volunteering records, competition records, and project content.
- **Route & URL Preservation:** Maintain all existing route structures, legacy URL paths, and anchor targets to ensure zero broken links and preserve search engine indexing.
- **Responsive Accessibility:** Build mobile-responsive, performant, and WCAG-accessible interfaces with clean semantic HTML.
- **Deployment Safety:** **Strictly no push or deployment to production/remote without explicit user approval.**

## Agent Launch Commands

Worker agents must be started in visible Orca tabs with these exact commands:

```bash
# Claude Code (Opus 5, medium effort)
claude '--dangerously-skip-permissions'

# agy (Gemini 3.8 Flash, medium effort)
/Users/pain/.local/bin/agy '--dangerously-skip-permissions'
```

Launch via `orca worktree create --agent ...` where possible, otherwise
`orca terminal create --worktree <selector> --command '<command above>'`,
then `orca terminal wait --for tui-idle` before `orca terminal send`.
