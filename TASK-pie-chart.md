# Task: replace the language bar list with a labelled pie chart

## Outcome
On the rebuilt site, the `#programming-languages` section (home page) and the
`#languages` section (`/about/`) render the language breakdown as a **labelled
pie chart** in the spirit of the original site's chart, restyled so it belongs
to the new design system rather than the old one.

## Why
The original site (branch `feature/website-revamp`, worktree
`../darter`) draws this data as a pie with a name-and-percentage label on a
leader line per slice — see `assets/js/language-chart.js` and
`assets/css/components/language-chart.css` there for the geometry and the
de-collision logic. The rebuild currently renders flat horizontal bars
(`.lang-chart` / `.lang-row` in `assets/css/src/04-home.css`, markup produced by
`language_chart()` in `site/render.py`). The user wants the pie back, but
looking like it was designed for the new site.

## Deliverable
1. `site/render.py` — `language_chart()` emits inline SVG for the pie plus its
   labels. **Render it server-side in Python**; the rebuild is a static
   generator and this data is committed JSON (`data/programming-languages.json`),
   so there is no reason to ship a JS charting module. Keep the existing
   `<p class="lang-note">…</p>` text underneath, unchanged.
2. `assets/css/src/04-home.css` — replace the `.lang-*` bar rules with the pie's
   rules. Add nothing to any other CSS file.
3. Nothing else changes. Do not touch `assets/js/`, do not add a library, do not
   reintroduce `assets/css/components/language-chart.css`.

## Design constraints
- **Tokens only.** Every colour must come from `assets/css/src/01-tokens.css`.
  If the palette needs categorical slice colours it does not yet have, add them
  to `01-tokens.css` (both `:root` and `:root[data-theme="dark"]`) as new tokens
  and use them by name — no hex values outside that file. That rule is stated at
  the top of the tokens file; honour it.
- Slice colours should read as a family with `--brand` (#00796b teal), not as
  the old site's blue/orange categorical set. A brand-anchored sequential or
  tinted-categorical ramp is the obvious fit given the data is already sorted
  descending. Distinguishable in both themes; the 1–3% tail slices must stay
  visible.
- Type: `--font-heading` for slice names, `--font-mono` for percentages, matching
  how `.lang-name` / `.lang-pct` do it today.
- Must work in light and dark (`:root[data-theme="dark"]`) with no per-component
  hex overrides.

## Accessibility / responsive
- Keep an equivalent of today's `role="img"` + `aria-label` summary listing every
  language and percentage, so screen readers lose nothing.
- Below ~640px there is no room for leader lines: fall back to a compact layout
  (pie plus a two-column legend, or the existing bar list) — your call, but it
  must not overflow or overlap at 360px wide.
- No horizontal page scroll at any width.

## Verify before reporting done
1. `bash scripts/build.sh` succeeds.
2. `python3 scripts/check_site.py` passes (or is no worse than before — capture
   the before/after output).
3. `python3 tests/e2e.py` — run it; if it asserts on `.lang-row`, update the
   assertion to the new markup, do not delete the check.
4. Serve the site and look at it: home `#programming-languages` and
   `/about/#languages`, in light and dark, at 1280px and at 360px. A local
   server is already running on **http://localhost:8085** from this worktree.
   Save screenshots under `tests/screenshots/`.
5. Confirm the percentages rendered match `data/programming-languages.json`
   exactly (Python 33.0 … Arduino 1.0) and that the slices close the circle.

## Rules
- Work only in this worktree: `/Users/pain/orca/workspaces/mohammad-albarham.github.io/website-rebuild`.
- Commit on the current branch (`mohammad-albarham/website-rebuild`) when the
  checks above pass. **Do not push, do not open a PR.**
- Report back: what you changed, the check output, and the screenshot paths.
