# mohammad-albarham.github.io

Personal site of Mohammad Albarham — computer vision and AI engineer in Gothenburg.

**Live:** <https://mohammad-albarham.github.io/>

A static site: no framework, no Node, no runtime server. Pages are generated from
`data/*.json` by a Python script that uses nothing outside the standard library,
and the generated HTML is committed. GitHub Pages serves the repository as-is.

## Quick start

```bash
git clone https://github.com/mohammad-albarham/mohammad-albarham.github.io.git
cd mohammad-albarham.github.io

python3 -m http.server 8765        # preview at http://localhost:8765
```

Use a server rather than opening `index.html` from the filesystem: links and
assets are root-relative (`/assets/...`), so `file://` will not resolve them.

## Build

```bash
scripts/build.sh          # regenerate pages and bundle CSS/JS
scripts/build.sh --check  # fail if anything committed is out of date
```

`--check` rebuilds into a temporary directory and diffs. It covers **both** the
CSS/JS bundles and the generated HTML, so a commit that edits
`assets/css/src/*.css`, `assets/js/src/*.js` or `data/*.json` without rebuilding
is caught. Run it before committing.

Editing a file under `assets/css/src/` or `assets/js/src/` has no effect until
you rebuild — pages load only the concatenated `assets/css/site.css` and
`assets/js/site.js`. The file lists live at the top of `scripts/build.sh`;
order matters for the CSS cascade.

## Checks

```bash
python3 scripts/check_site.py
```

Structural checks, no dependencies. Fails on a broken internal link, a missing
legacy route, a missing homepage anchor, a record in `data/*.json` that never
reached a page, or a contact form that could not actually send anything.

```bash
# one-time setup for the browser tests
python3 -m venv .venv
.venv/bin/pip install playwright
.venv/bin/python -m playwright install chromium

.venv/bin/python .agents/skills/webapp-testing/scripts/with_server.py \
  --server "python3 -m http.server 8765" --port 8765 \
  -- .venv/bin/python tests/e2e.py
```

49 browser checks across desktop (1440×900) and mobile (390×844): every page
answers 200, the theme toggle persists, the mobile nav opens and closes, the
project filter narrows the grid and announces it, BibTeX expands and copies,
the contact link is a real `mailto:`, the travel map lazy-loads, every legacy
detail route still serves a page, no page scrolls sideways on a phone, and no
page logs a console error. Screenshots are written to `tests/screenshots/`.

## Structure

```
data/                  content, as JSON — the single source of truth
site/
  render.py            data -> index.html, projects/, research/, about/, sitemap.xml
  restyle_legacy.py    re-shells the 32 hand-written detail pages
assets/
  css/src/*.css        design tokens, base, chrome, home, legacy, pages
  css/site.css         built; do not edit
  js/src/*.js          nav, theme, filters, bibtex, travel
  js/site.js           built; do not edit
  fonts/               self-hosted Nunito, Nunito Sans, JetBrains Mono + OFL licences
scripts/
  build.sh             build + --check
  check_site.py        structural checks
tests/e2e.py           Playwright checks and screenshots
projects/ competitions/ experience/ volunteering/
                       hand-written detail pages (see below)
```

## Editing content

Everything on the generated pages comes from `data/`:

| File | Holds |
|---|---|
| `bio.json` | name, title, location, summary, social links |
| `education.json` | degrees, coursework, graduation projects |
| `experience.json` | roles, responsibilities, technologies |
| `projects.json` | projects, tags, links, `detailsPage` |
| `publications.json` | papers, abstracts, DOIs, BibTeX |
| `competitions.json` | contests, awards, highlights, galleries |
| `volunteering.json` | IEEE and other service |
| `travel.json` | visited countries, per-continent colours |
| `programming-languages.json` | measured language shares |

Edit the JSON, run `scripts/build.sh`, commit both the data and the regenerated
HTML.

### The hand-written detail pages

The 32 pages under `projects/`, `competitions/`, `experience/` and
`volunteering/` are **not** generated. They hold galleries, result tables,
figures, posters and long-form write-ups that do not exist in `data/*.json`, and
their filenames are linked from search engines and CVs, so they are preserved
exactly.

`site/restyle_legacy.py` only replaces the shell around them — head, nav,
breadcrumb, footer. The preserved region is marked in each file:

```html
<div class="detail-body" data-legacy-content>
  ... original markup, untouched ...
</div>
```

Edit inside that region freely. Re-running the script keeps your edits:

```bash
python3 site/restyle_legacy.py           # apply the current shell
python3 site/restyle_legacy.py --check   # report pages whose shell is stale
```

To add a new detail page, copy an existing one, put your content inside the
marked region, add a `detailsPage` entry in the matching JSON file, and run
`scripts/build.sh` so the sitemap picks it up.

## Design

- **Type:** Nunito for headings (800), Nunito Sans for body (300–400),
  JetBrains Mono for data labels. Self-hosted; see `assets/fonts/README.md`
  for provenance and licences.
- **Colour:** teal `#00796b` on white, ink `#15171c`, with indigo, amber and
  rose reserved for research, competitions and service respectively — the
  accent tells you what kind of thing you are looking at.
- **Tokens:** every colour is defined once, in `assets/css/src/01-tokens.css`.
  Dark mode overrides those tokens and nothing else.
- Motion is limited to one entrance animation and hover states, and
  `prefers-reduced-motion` disables it.

## Contact

There is no contact form. GitHub Pages serves static files and cannot run the
old PHP handler, so any form here would have to either post to a third-party
service or quietly discard the message. The site shows the email address as a
plain `mailto:` link instead.

The unused `forms/` directory is kept for reference; nothing links to it.

## Hosting

`.github/workflows/pages.yml` publishes the repository to GitHub Pages on every
push to `main`. There is no build step in CI — what is committed is what ships,
which is why `scripts/build.sh --check` matters.

## Credits

- Travel map: [jVectorMap](https://github.com/bjornd/jvectormap); the idea comes
  from [Julian](https://www.julian.ac/travel/).
- Icons: [Bootstrap Icons](https://icons.getbootstrap.com/) (MIT).
- Fonts: Nunito, Nunito Sans and JetBrains Mono, all SIL OFL 1.1.

## Licence

MIT for the code. Content, photographs and written material are
© Mohammad Albarham.
