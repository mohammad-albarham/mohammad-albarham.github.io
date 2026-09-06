# Agent Coordination & Roles

## Role Definitions & Boundaries

1. **Orchestrator (Coordinator & Reviewer Only)**
   - The orchestrator role is held by one agent at a time (initially Codex, currently Claude Code).
   - The orchestrator only orchestrates, manages, reviews, validates, and integrates work across tasks.
   - **Strict Rule:** The orchestrator NEVER implements website code directly. Editing coordination docs (AGENTS.md, briefs) and integrating/merging worker output is orchestration, not implementation.
   - Responsible for issue breakdown, verification, diff review, merge management, and multi-agent coordination.

2. **Implementation Agents (Claude Code Opus 5 Medium & agy Gemini 3.8 Flash Medium)**
   - All website implementation work is assigned exclusively to:
     - Claude Code Opus 5 Medium
     - agy Gemini 3.8 Flash Medium
   - Must execute in **visible Orca tabs**.
   - Concurrency limits: Maximum **2 concurrent agents per provider**.
   - Worktree isolation: Each writer agent must operate in its **own dedicated git worktree**.
   - **No hidden or built-in subagents** are permitted; all agents must be explicitly orchestrated and visible.

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
