# Portfolio Regression & Quality Assurance Harness

Comprehensive automated quality assurance suite built for Mohammad Albarham's portfolio website rebuild. Designed to prevent regressions, preserve historical routes/content, verify local link and anchor integrity, audit accessibility standards, and prevent responsive layout breakage.

The harness is **baseline-aware**: it compares results against committed baseline snapshots, allowing development agents and orchestrators to immediately distinguish **new regressions** from **pre-existing historical debt**.

---

## 1. Quick Start

### Run the entire QA suite (all four gates):
```bash
./scripts/qa/run_all.sh
```
*In default baseline-aware mode, exits `0` if no new regressions are introduced.*

### Run in strict zero-tolerance mode:
Fails (exit code `1`) on any finding, including pre-existing baseline issues:
```bash
./scripts/qa/run_all.sh --strict
```

### Run against an external build worktree:
```bash
./scripts/qa/run_all.sh /path/to/candidate-site
```

### Stop immediately on the first failing gate:
```bash
./scripts/qa/run_all.sh --fail-fast
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
  1. *Public HTML Routes*: Asserts all 34 historical routes exist (supporting both `route.html` and clean URL `route/index.html`).
  2. *Homepage Legacy Anchors*: Confirms `index.html` preserves critical section IDs (`#hero`, `#about`, `#programming-languages`, `#resume`, `#projects`, `#competitions`, `#publications`, `#volunteering`, `#travel`, `#contact`).
  3. *Content Retention*: Confirms authentic records are retained across all 9 data categories (Bio, 5 Competitions, 2 Degrees, 8 Experience positions, 25 Projects, 8 Publications, 7 Volunteering entries, Travel map records, Programming languages).
  4. *Project Detail Integrity*: Ensures 24 project detail pages retain gallery images, avoid description truncation, and retain external links.

---

### Gate 2: Link & Anchor Integrity Checker (`check_links.py`)
Crawls every local HTML file, resolves every `href` and `src` pointing to local paths, and verifies that every target resource and anchor `#id` exists on disk.

- **Implementation**: Python standard library only.
- **Baseline file**: `scripts/qa/baseline_links.json` (3 accepted pre-existing defects).
- **Run commands**:
  ```bash
  # Default (baseline-aware: exits 0 if no new broken links):
  python3 scripts/qa/check_links.py --site .

  # Strict mode (fails on any broken link, including baseline):
  python3 scripts/qa/check_links.py --site . --strict

  # Recalibrate/update baseline file:
  python3 scripts/qa/check_links.py --site . --update-baseline

  # JSON format:
  python3 scripts/qa/check_links.py --site . --json
  ```
- **Checks**:
  1. *Local Path Resolution*: Resolves document-relative (`../assets/...`) and root-relative (`/assets/...`) paths against the file system.
  2. *Resource Type Validation*: Ensures tags like `<img src="...">` or `<script src="...">` point to files rather than directories.
  3. *DOM Anchor Validation*: Parses target HTML files to verify that fragment identifiers (`#section`) match a valid element `id` or named anchor `<a name="...">`.
  4. *Regression Gate*: Exits `0` when all findings are known baseline items; exits `1` if any new broken links or anchors are found; reports fixed links as positive improvements.

---

### Gate 3: WCAG 2.1 AA Accessibility Auditor (`check_a11y.py`)
Automated headless browser accessibility audit executing axe-core over every site route served by a local static HTTP server.

> [!IMPORTANT]
> **Technical Debt Warning**: The accessibility baseline of **168 violations is technical debt to be burned down, NOT an acceptable target or goal.** The website rebuild is expected to aggressively resolve these issues, particularly color contrast and empty links.

- **Implementation**: Playwright + `axe-core-python`. Uses `.agents/skills/webapp-testing/scripts/with_server.py` for background server lifecycle orchestration.
- **Baseline file**: `scripts/qa/baseline_a11y.json` (keyed stably by `page::rule_id::target_selector` without line-number dependence).
- **Ruleset**: WCAG 2.1 Level AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`).
- **Run commands**:
  ```bash
  # Default (baseline-aware: exits 0 if no new a11y regressions):
  python3 scripts/qa/check_a11y.py --site . --port 8000

  # Strict mode (fails on any violation, zero tolerance):
  python3 scripts/qa/check_a11y.py --site . --port 8000 --strict

  # Update baseline file after burning down debt:
  python3 scripts/qa/check_a11y.py --site . --port 8000 --update-baseline

  # Connect to already running server:
  python3 scripts/qa/check_a11y.py --url http://localhost:8000
  ```
- **Checks**:
  1. Color contrast ratios for normal and large text.
  2. Discernible link and button accessible names.
  3. Valid ARIA attributes and roles.
  4. Page landmarks, headings hierarchy, and HTML language attributes.
  5. Outputs findings grouped by page and rule, plus burn-down notifications for fixed debt.

---

### Gate 4: Responsive Layout & Mobile Overflow Checker (`check_responsive.py`)
Validates responsive behavior across viewports and detects horizontal scrolling breakage on mobile screens.

- **Implementation**: Playwright headless browser testing. Uses `with_server.py` for server lifecycle.
- **Run commands**:
  ```bash
  # Full check + screenshot generation:
  python3 scripts/qa/check_responsive.py --site . --port 8000

  # Overflow check only (skips screenshot capture):
  python3 scripts/qa/check_responsive.py --site . --skip-screenshots

  # Custom screenshot destination:
  python3 scripts/qa/check_responsive.py --site . --output-dir /tmp/screenshots
  ```
- **Checks**:
  1. *Horizontal Overflow Detection*: Evaluates all 34 routes at **375px mobile viewport width**. Fails (exit code `1`) if `scrollWidth > clientWidth`. Offending DOM elements and pixel deltas are reported.
  2. *Multi-Viewport Screenshots*: Captures full-page screenshots of key representative pages at **375px** (mobile), **768px** (tablet), and **1440px** (desktop) into the gitignored output directory `scripts/qa/screenshots/`.

---

## 3. Documented Baseline Findings & Pre-Existing Technical Debt

| Gate | Check | Baseline Status | Technical Debt / Pre-Existing Issues |
|---|---|---|---|
| **Gate 1** | Route Preservation | **34 / 34 routes PASS** | None |
| **Gate 1** | Homepage Anchors | **10 / 10 anchors PASS** | None |
| **Gate 1** | Content Retention | **9 / 9 categories PASS** | None |
| **Gate 1** | Project Detail Content | **24 / 24 pages PASS** | None |
| **Gate 2** | Link & Anchor Integrity | **1184 local paths checked** | **3 pre-existing directory image source bugs** |
| **Gate 3** | WCAG 2.1 AA Accessibility | **34 routes audited** | **168 pre-existing violations to be burned down** |
| **Gate 4** | Mobile Horizontal Overflow | **34 routes audited at 375px** | **0 overflow failures (PASS)** |

---

### Accepted Pre-Existing Baseline Defects

1. **Directory Image Source Bug (`projects/latest-projects-1.html`, `2.html`, `3.html`)**:
   - Tag: `<img src="../assets/img/portfolio/" alt="">` at line 142.
   - Fault: The `src` attribute points to a folder directory path instead of an image asset.
   - Tracked in: `scripts/qa/baseline_links.json`.

2. **Empty Accessible Link (`projects/portfolio-details-20.html`)**:
   - Tag: `<a href="https://www.youtube.com/playlist?list=PLR7GqPO_6lTiSDCSYFWXj8JvYrMdA805v"></a>` (lines 164–166).
   - Fault: Anchor element has no text, child elements, or `aria-label` (axe rule `link-name`).
   - Tracked in: `scripts/qa/baseline_a11y.json`.

3. **Plain-Text Verification Token (`googleebff4c42c46c6acf.html`)**:
   - Content: `google-site-verification: googleebff4c42c46c6acf.html`
   - Fault: File is a bare text token for Google Search Console verification without HTML structure, `<title>`, or `lang` attribute (axe rules `document-title`, `html-has-lang`).
   - Tracked in: `scripts/qa/baseline_a11y.json`.

4. **Bootstrap Theme Low Color Contrast (165 instances)**:
   - Scope: 165 element nodes across 32 pages.
   - Fault: Legacy template uses light grey text (`#6c757d`, `#8492a6`, `#999`) and muted icons on light/dark backgrounds that fail WCAG AA 4.5:1 ratio requirements.
   - Tracked in: `scripts/qa/baseline_a11y.json` — **target for reduction in rebuild**.

---

## 4. File Inventory

- `scripts/qa/run_all.sh`: Unified runner for all four QA gates (baseline-aware by default).
- `scripts/qa/validate.py`: Route, anchor, and data retention regression validator.
- `scripts/qa/check_links.py`: Baseline-aware local static link, image source, and anchor checker.
- `scripts/qa/check_a11y.py`: Baseline-aware Playwright + axe-core WCAG 2.1 AA accessibility auditor.
- `scripts/qa/check_responsive.py`: Responsive layout validator and 375px horizontal overflow detector.
- `scripts/qa/baseline_snapshot.json`: Reference JSON snapshot of original routes and data records.
- `scripts/qa/baseline_links.json`: Committed baseline of accepted link and anchor findings.
- `scripts/qa/baseline_a11y.json`: Committed baseline of accepted accessibility findings.
- `scripts/qa/generate_snapshot.py`: Snapshot extraction utility for `baseline_snapshot.json`.
- `scripts/qa/screenshots/`: Gitignored directory containing responsive screenshot captures.
- `scripts/qa/README.md`: This documentation.
