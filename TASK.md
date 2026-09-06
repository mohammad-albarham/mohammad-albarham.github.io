# Task: Extend the QA harness with visual, a11y and link checking (Phase 1, parallel)

You are an IMPLEMENTATION agent. Read `AGENTS.md` and `docs/site-rebuild-brief.md`
in this worktree first. Also read `.agents/skills/webapp-testing/SKILL.md` and follow it.

## Context
`scripts/qa/validate.py` already exists and passes. It covers route preservation,
homepage anchors, data-record retention and project detail pages. Run it once to
see what it does. Do not rewrite or regress it.

## Outcome
The rebuild of this site is about to land. We need automated gates that catch what
`validate.py` cannot: broken links, accessibility regressions, and responsive
layout breakage.

## Deliverables (all under `scripts/qa/`)
1. `scripts/qa/check_links.py` — crawl every local HTML file, resolve every
   `href`/`src` that points at a local path, and report anything that does not
   resolve on disk (including anchors that point at a missing `id`). Python
   standard library only. Non-zero exit on failure.
2. `scripts/qa/check_a11y.py` — Playwright + axe-core over every page, run against
   a local static server. Report WCAG 2.1 AA violations grouped by page and rule.
   Use `.agents/skills/webapp-testing/scripts/with_server.py` for server lifecycle.
3. `scripts/qa/check_responsive.py` — Playwright screenshots of the key pages at
   375px, 768px and 1440px into a gitignored output dir, plus a horizontal-overflow
   detector that fails when any page scrolls sideways at 375px.
4. `scripts/qa/README.md` — update it to document all four checks and how to run them.
5. A single `scripts/qa/run_all.sh` that runs everything and exits non-zero on any failure.

## Hard constraints
- **Scope**: you may only create/edit files under `scripts/qa/` and add a
  `.gitignore` entry for the screenshot output dir. Do NOT edit `index.html`,
  any page under `experience/ projects/ competitions/ volunteering/`, anything in
  `data/`, or any CSS. Another agent is rebuilding those right now and you will collide.
- Record the CURRENT site's a11y/link results as a documented baseline so we can
  tell pre-existing problems from rebuild regressions. Do not fix site problems —
  report them.
- **Do not push, do not open a PR, do not touch any git remote.** Commit locally only.

## Verification
Every script must run end to end against this worktree and produce output. Paste the
actual output in your report — do not describe what it would do.

## Reporting
Commit locally with a descriptive message, then report: what each check found,
the baseline numbers, and which findings are pre-existing.
Stop when this is done. Do not start other phases.
