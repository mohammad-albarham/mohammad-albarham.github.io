# Agent Coordination & Roles

## Role Definitions & Boundaries

1. **Codex (Coordinator & Reviewer Only)**
   - Codex only orchestrates, manages, reviews, validates, and integrates work across tasks.
   - **Strict Rule:** Codex NEVER implements website code directly.
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
