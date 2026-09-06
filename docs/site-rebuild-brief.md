# Site Rebuild Brief & Architecture Foundation

## 1. Verified Tooling & Environment Setup

- **Orca CLI**: `/usr/local/bin/orca` (v1.4.197). Verified functional and healthy. No reinstallation or modification needed.
- **Repository Worktree**: `/Users/pain/orca/workspaces/mohammad-albarham.github.io/website-foundation` on branch `mohammad-albarham/website-foundation`.
- **Operating Model**: Defined in `AGENTS.md`. Codex strictly serves as orchestrator, coordinator, reviewer, and integrator. Implementation is assigned exclusively to Claude Code Opus 5 Medium and agy Gemini 3.8 Flash Medium in visible Orca tabs (max 2 concurrent writers per provider, each in dedicated worktrees).

---

## 2. Skill Provenance & Version Lock

The following skills were downloaded and installed using the internal skill installer (`install-skill-from-github.py`):

- **Upstream Repository**: `https://github.com/anthropics/skills`
- **Commit Reference**: `main` @ `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f`
  - *Commit Title*: "Update frontend-design skill to avoid generic design defaults (#1713)"
  - *Commit Date*: 2026-09-03T16:37:13Z
- **Installed Skills**:
  1. `.agents/skills/frontend-design`:
     - Focus: Distinctive aesthetic direction, intentional typography, thoughtful color schemes, layout craft, and avoidance of generic template defaults.
     - License: Apache 2.0 (`LICENSE.txt` included).
  2. `.agents/skills/webapp-testing`:
     - Focus: End-to-end web testing using Playwright, console log capture, element discovery, and background test server lifecycle orchestration (`with_server.py`).
     - License: Apache 2.0 (`LICENSE.txt` included).

---

## 3. Compact Content Inventory

The existing website hosts authentic historical content across multiple structured directories:

- **Root Pages**:
  - `index.html`: Main landing page with biography, introduction, core expertise, and navigation index.
  - `sitemap.xml` & `robots.txt`: Search engine crawling and URL hierarchy definitions.
  - `googleebff4c42c46c6acf.html`: Search Console verification marker.
- **Content Sections**:
  - `experience/`: Chronological professional history, engineering roles, responsibilities, and accomplishments.
  - `projects/`: Detailed software, machine learning, and personal projects with technical descriptions and links.
  - `competitions/`: Competitive programming, hackathon participation, awards, and milestones.
  - `volunteering/`: Community contributions, educational mentorship, and leadership roles.
- **Supporting Assets & Data**:
  - `data/`: Structured JSON/data stores supporting content sections.
  - `forms/`: Contact handling and feedback forms.
  - `assets/`: Media files, iconography, images, styles, and legacy client scripts.

---

## 4. Reference Site Analysis (`nico.dev`)

- **References**:
  - Live site: `https://nico.dev`
  - Source repository: `https://github.com/nico-martin/nico.dev`
- **Design Characteristics**:
  - **Typography & Scale**: Crisp typography with high-contrast hierarchy, clear typographic rhythm, and strong focal points.
  - **Color Palette**: Dark-mode primary aesthetic with rich neutrals and purposeful, vibrant accent colors for interactive states and badges.
  - **Layout & Interaction**: Content-first grid layout, generous negative space, micro-interactions with subtle easing, and responsive adaptivity.
- **Licensing & Copyright Constraints**:
  - Personal portfolios, brand identities, and custom visual assets are proprietary to their creators.
  - **Strict Policy**: `nico.dev` serves solely as architectural and visual inspiration for clean, fast developer presentation. All styling, layout templates, components, and copy must be original implementations built specifically for Mohammad Albarham. No assets or copyrighted code may be copied.

---

## 5. Existing Route Preservation Needs

To prevent 404 errors, maintain link equity, and respect external backlinks (e.g., CV links, LinkedIn, GitHub profiles), all existing canonical routes and entrypoints must be preserved:
- `/` (Home / Biography)
- `/experience/`
- `/projects/`
- `/competitions/`
- `/volunteering/`
- Canonical asset paths and anchor identifiers across all legacy sections.

---

## 6. Recommended Static-Compatible Approach

1. **Static Architecture**:
   - Deliver purely static HTML5, CSS3, and modern vanilla JavaScript or lightweight static compilation targeting GitHub Pages.
   - Zero runtime server dependency: Ensure instant page loads, offline resiliency, and low maintenance overhead.
2. **Quality & Standards**:
   - Full responsive layout (mobile, tablet, desktop).
   - Strict WCAG 2.1 AA accessibility (color contrast, keyboard focus rings, semantic tags, ARIA labels where required).
   - Fast Lighthouse scores across Performance, Accessibility, Best Practices, and SEO.
3. **Execution Guardrails**:
   - Implementation exclusively carried out by designated worker agents in visible tabs.
   - No production deployment or branch push without explicit user sign-off.
