# Portfolio Regression & Quality Assurance Harness

Comprehensive automated quality assurance suite built for Mohammad Albarham's portfolio website rebuild. Designed to prevent regressions, preserve historical routes/content, ensure accessibility standards, verify link integrity, and prevent responsive layout breakage.

---

## 1. Quick Start

### Run the entire QA suite (all four gates):
```bash
./scripts/qa/run_all.sh
```

To run against an external or candidate build directory:
```bash
./scripts/qa/run_all.sh /path/to/site
```

To stop immediately upon the first gate failure:
```bash
./scripts/qa/run_all.sh . --fail-fast
```

---

## 2. The Four Automated QA Gates

### Gate 1: Route & Content Regression Validator (`validate.py`)
Verifies route preservation, legacy navigation anchor targets, structured data record retention, and project detail page integrity.

- **Implementation**: Python standard library (`html.parser`, `urllib.parse`, `json`, `argparse`, `pathlib`). Zero pip dependencies.
- **Run command**:
  ```bash
  python3 scripts/qa/validate.py --site .
  # Machine-readable JSON output:
  python3 scripts/qa/validate.py --site . --json
  ```
- **Checks**:
  1. *Public HTML Routes*: Asserts all 34 historical routes exist (supporting both `route.html` and `route/index.html`).
  2. *Homepage Legacy Anchors*: Confirms `index.html` preserves section IDs (`#hero`, `#about`, `#programming-languages`, `#resume`, `#projects`, `#competitions`, `#publications`, `#volunteering`, `#travel`, `#contact`).
  3. *Content Retention*: Confirms authentic records are retained across all 9 data categories (Bio, 5 Competitions, 2 Degrees, 8 Experience positions, 25 Projects, 8 Publications, 7 Volunteering entries, Travel map records, Programming languages).
  4. *Project Detail Integrity*: Ensures 24 project detail pages retain gallery images, avoid description truncation, and retain external repository links.

---

### Gate 2: Link & Anchor Integrity Checker (`check_links.py`)
Crawls every local HTML file, resolves every `href` and `src` pointing to local paths, and verifies that every target resource and anchor `#id` exists on disk.

- **Implementation**: Python standard library only. Non-zero exit code on failure.
- **Run command**:
  ```bash
  python3 scripts/qa/check_links.py --site .
  # Machine-readable JSON output:
  python3 scripts/qa/check_links.py --site . --json
  # Verbose link reporting:
  python3 scripts/qa/check_links.py --site . -v
  ```
- **Checks**:
  1. *Local Path Resolution*: Resolves document-relative (`../assets/...`) and root-relative (`/assets/...`) paths against the file system.
  2. *Resource Type Validation*: Ensures tags like `<img src="...">` or `<script src="...">` point to files rather than directories.
  3. *DOM Anchor Validation*: Parses target HTML files to verify that fragment identifiers (`#section`) match a valid element `id` or named anchor `<a name="...">`.
  4. *Clean URL Handling*: Resolves extension-less paths to corresponding `.html` or `/index.html` files.

---

### Gate 3: WCAG 2.1 AA Accessibility Auditor (`check_a11y.py`)
Automated headless browser accessibility audit executing axe-core over every site route served by a local static HTTP server.

- **Implementation**: Playwright + `axe-core-python`. Uses `.agents/skills/webapp-testing/scripts/with_server.py` for background server lifecycle orchestration.
- **Ruleset**: WCAG 2.1 Level AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`).
- **Run command**:
  ```bash
  python3 scripts/qa/check_a11y.py --site . --port 8000
  # Machine-readable JSON output:
  python3 scripts/qa/check_a11y.py --site . --port 8000 --json
  # If static server is already running:
  python3 scripts/qa/check_a11y.py --url http://localhost:8000
  ```
- **Checks**:
  1. Color contrast ratios for normal and large text.
  2. Discernible link and button accessible names.
  3. Valid ARIA attributes and roles.
  4. Page landmarks, headings hierarchy, and HTML language attributes.
  5. Outputs findings grouped by page and by rule, with an aggregate summary table.

---

### Gate 4: Responsive Layout & Mobile Overflow Checker (`check_responsive.py`)
Validates responsive behavior across viewports and detects horizontal scrolling breakage on mobile screens.

- **Implementation**: Playwright headless browser testing. Uses `with_server.py` for server lifecycle.
- **Run command**:
  ```bash
  python3 scripts/qa/check_responsive.py --site . --port 8000
  # Check horizontal overflow only without writing screenshot files:
  python3 scripts/qa/check_responsive.py --site . --skip-screenshots
  # Custom screenshot output directory:
  python3 scripts/qa/check_responsive.py --site . --output-dir /tmp/screenshots
  ```
- **Checks**:
  1. *Horizontal Overflow Detection*: Measures `document.documentElement.scrollWidth` and `document.body.scrollWidth` at **375px mobile viewport** across all 34 routes. Fails (exit code 1) if any element causes sideways scrolling (`scrollWidth > clientWidth`). Offending DOM elements are extracted and reported.
  2. *Multi-Viewport Screenshots*: Captures full-page screenshots of key representative pages at **375px** (mobile), **768px** (tablet), and **1440px** (desktop) into the gitignored output directory `scripts/qa/screenshots/`.

---

## 3. Documented Baseline Findings & Pre-Existing Anomalies

To allow reviewer and orchestrator agents to distinguish between candidate rebuild regressions and historical issues in the existing codebase, this baseline audit documents the pre-existing state of the site.

### Baseline Summary Metrics

| Gate | Check | Baseline Result | Pre-Existing Issues |
|---|---|---|---|
| **Gate 1** | Route Preservation | **34 / 34 routes PASS** | None |
| **Gate 1** | Homepage Anchors | **10 / 10 anchors PASS** | None |
| **Gate 1** | Content Retention | **9 / 9 categories PASS** | None |
| **Gate 1** | Project Detail Content | **24 / 24 pages PASS** | None |
| **Gate 2** | Link & Anchor Integrity | **1184 local paths checked** | **3 pre-existing broken links** |
| **Gate 3** | WCAG 2.1 AA Accessibility | **34 routes audited** | **168 violations across 4 rules** |
| **Gate 4** | Mobile Horizontal Overflow | **34 routes audited at 375px** | **0 overflow failures (PASS)** |

---

### Known Pre-Existing Defects (Do NOT Blame Rebuild)

1. **Directory Image Source Bug (`projects/latest-projects-1.html`, `2.html`, `3.html`)**:
   - Tag: `<img src="../assets/img/portfolio/" alt="">` at line 142.
   - Fault: The `src` attribute points to a folder directory path instead of an image asset.
   - Identified by: `validate.py` diagnostic check & `check_links.py`.

2. **Empty Link Tag (`projects/portfolio-details-20.html`)**:
   - Tag: `<a href="https://www.youtube.com/playlist?list=PLR7GqPO_6lTiSDCSYFWXj8JvYrMdA805v"></a>` at lines 164–166.
   - Fault: Anchor element has no text, no accessible name, and no `aria-label`.
   - Identified by: `check_a11y.py` (`link-name`).

3. **Plain-Text Verification File (`googleebff4c42c46c6acf.html`)**:
   - Content: `google-site-verification: googleebff4c42c46c6acf.html`
   - Fault: File is a bare text token for Google Search Console verification without HTML structure.
   - Identified by: `check_a11y.py` (`document-title`, `html-has-lang`).

4. **Bootstrap Theme Color Contrast Deficiencies**:
   - Scope: 165 element nodes across 32 pages.
   - Fault: Legacy template uses light grey text (`#6c757d`, `#8492a6`, `#999`) on white backgrounds and dark blue icons on semi-transparent backgrounds that fail WCAG AA 4.5:1 ratio requirements.
   - Identified by: `check_a11y.py` (`color-contrast`).

---

## 4. File Inventory

- `scripts/qa/run_all.sh`: Unified runner for all four QA gates.
- `scripts/qa/validate.py`: Route, anchor, and data retention regression validator.
- `scripts/qa/check_links.py`: Local static link, image source, and anchor checker.
- `scripts/qa/check_a11y.py`: Playwright + axe-core WCAG 2.1 AA accessibility auditor.
- `scripts/qa/check_responsive.py`: Responsive layout validator and 375px horizontal overflow detector.
- `scripts/qa/baseline_snapshot.json`: Reference JSON snapshot of original routes and data records.
- `scripts/qa/generate_snapshot.py`: Snapshot extraction utility.
- `scripts/qa/screenshots/`: Gitignored directory containing responsive screenshot captures.
- `scripts/qa/README.md`: This documentation.
