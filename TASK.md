# Task: Design system + homepage rebuild (Phase 1, critical path)

You are an IMPLEMENTATION agent. Read `AGENTS.md` and `docs/site-rebuild-brief.md`
in this worktree first. Also read the skill at `.agents/skills/frontend-design/SKILL.md`
and follow it.

## Outcome
A reusable CSS design system for this site, plus `index.html` rebuilt on top of it,
in the visual spirit of https://nico.dev — clean, playful, fast, personal — but an
ORIGINAL design for Mohammad Albarham. Do not copy nico.dev's markup, CSS, copy or
assets; it is inspiration only.

## Deliverables
1. `assets/css/revamp/tokens.css` — CSS custom properties: color, type scale,
   spacing scale, radii, shadow definitions, breakpoints.
2. `assets/css/revamp/base.css` — reset/normalize, element defaults, focus-visible rings.
3. `assets/css/revamp/components.css` — the component set the site actually needs:
   pill navigation, outlined card with hard offset shadow, tag/badge, button,
   section header, avatar/portrait, link styles, footer.
4. `docs/design-system.md` — short spec: the tokens, each component, when to use it,
   and a copy-pasteable HTML snippet per component. Downstream agents will build the
   inner pages from this document, so it must be precise and self-sufficient.
5. `index.html` rebuilt to use the new system.

## Hard constraints (non-negotiable)
- **Content authenticity**: every fact, name, date, role, project, publication,
  competition and volunteering entry currently on the homepage must survive verbatim.
  Reword nothing. Invent nothing. Delete nothing.
- **Route + anchor preservation**: keep every existing `id` anchor on the homepage
  (`#hero, #about, #programming-languages, #resume, #projects, #competitions,
  #publications, #volunteering, #travel, #contact, #main`) and every outbound link
  target. No route may 404.
- **Scope**: You may create files under `assets/css/revamp/`, create
  `docs/design-system.md`, and edit `index.html`. Do NOT edit any other HTML page,
  any file in `data/`, `scripts/`, or existing CSS files. Later phases handle those.
- Static HTML/CSS/vanilla JS only — this is a GitHub Pages site. No build step,
  no framework, no npm dependency.
- Responsive (mobile/tablet/desktop) and WCAG 2.1 AA: real contrast ratios,
  visible keyboard focus, semantic landmarks, alt text preserved.
- **Do not push, do not open a PR, do not touch any git remote.** Commit locally only.

## Verification (you must run this and it must PASS before you report done)
```
python3 scripts/qa/validate.py --site .
```
It checks route preservation, homepage anchors, data-record retention and project
pages. The 3 reported "pre-existing baseline anomalies" are expected — do not fix them.
Also open index.html in a browser and confirm it renders at 375px, 768px and 1440px.

## Reporting
Commit your work locally with a descriptive message. Then report back:
what you built, the QA output, and anything you were unsure about.
Do not start other phases. Stop when this is done.
