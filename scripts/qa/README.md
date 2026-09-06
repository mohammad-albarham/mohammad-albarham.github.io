# Portfolio Regression QA Suite

Reusable regression validation toolkit built for Mohammad Albarham's portfolio website rebuild.
Maintained under `/tmp/portfolio-qa` (outside the repository).

---

## 1. Quick Start

### Run validation against baseline:
```bash
python3 /tmp/portfolio-qa/validate.py --site /Users/pain/orca/workspaces/mohammad-albarham.github.io/website-foundation
```

### Run validation against candidate rebuild:
```bash
python3 /tmp/portfolio-qa/validate.py --site /Users/pain/orca/workspaces/mohammad-albarham.github.io/website-rebuild
```

### Output as JSON:
```bash
python3 /tmp/portfolio-qa/validate.py --site /Users/pain/orca/workspaces/mohammad-albarham.github.io/website-rebuild --json
```

---

## 2. Core Validation Checks

The validator operates strictly using Python standard library (`html.parser`, `urllib.parse`, `json`, `argparse`, `pathlib`) and requires zero external pip packages.

1. **Check 1: Original Public HTML Route Paths (34 routes)**
   - Ensures all 34 historical HTML routes exist.
   - Supports both `route.html` and clean URL style `route/index.html`.
   - Prevents 404 broken links from external backlinks (CV, LinkedIn, Google Scholar, GitHub).

2. **Check 2: Homepage Legacy Anchor Targets**
   - Verifies that `index.html` preserves all critical legacy navigation section IDs:
     `#hero`, `#about`, `#programming-languages`, `#resume`, `#projects`, `#competitions`, `#publications`, `#volunteering`, `#travel`, `#contact`, `#main`.

3. **Check 3: Content & Data Record Retention**
   - Verifies that authentic biographical, professional, academic, and project records are retained across all 9 data categories (Bio, 5 Competitions, 2 Degrees, 8 Experience positions, 25 Projects, 8 Publications, 7 Volunteering entries, Travel map records, Programming languages).
   - Verifies against candidate `data/*.json` or statically inlined content.
   - Specifically avoids mistaking generic UI navigation text ("Projects", "About", "Resume") for authentic content records.

4. **Check 4: Project Detail Page Gallery Image & Content Loss Detection**
   - Scans all 24 project detail pages.
   - Verifies that gallery images are retained (comparing asset filenames/basenames).
   - Detects content text truncation or dropped description paragraphs (>60% word drop).
   - Validates preservation of external links (GitHub repositories, arXiv papers, Hugging Face models, dataset links).

---

## 3. Diagnostic Report: Pre-Existing Baseline Anomalies

To prevent coordinator or reviewer agents from blaming candidate rebuilds for pre-existing flaws, the suite separates known baseline defects:

1. **Directory Image Source Bug (`projects/latest-projects-1.html`, `2.html`, `3.html`)**:
   - Tag `<img src="../assets/img/portfolio/" alt="">` points to a directory path instead of an image file.
2. **Root-Relative Directory Anchors (`competitions/competition-details-[1..5].html`, `projects/araclip.html`, `experience/phi-pair.html`)**:
   - Navigation links use `/#hero`, `/#about`, `/#resume`, etc., which point to the root directory `/` rather than relative `../index.html#section`.
3. **Dead Commented References**:
   - `projects/portfolio-details-1.html` has commented-out references to non-existent `portfolio-details-2.jpg` and `portfolio-details-3.jpg`.
   - `volunteering/visited_countries.html` has a commented-out reference to `/js/jquery.js`.

---

## 4. File Inventory

- `/tmp/portfolio-qa/validate.py`: Executable validation script.
- `/tmp/portfolio-qa/baseline_snapshot.json`: 160 KB JSON snapshot of all routes, DOM IDs, data records, and project detail contents.
- `/tmp/portfolio-qa/generate_snapshot.py`: Snapshot generator script used to create or refresh `baseline_snapshot.json`.
- `/tmp/portfolio-qa/README.md`: This documentation.
