# Portfolio Enhancement — Design

**Date:** 2026-08-11
**Scope:** Bug fixes, performance, hero rebuild, projects grid + filter. Existing visual language is kept.

## Problem

A browser audit of `index.html` served locally found three verified bugs, 3.26 MB of page weight
across 29 requests, and a landing view that communicates nothing about who the site belongs to.

### Verified bugs

1. **Broken HTML nesting.** `#about` opens at `index.html:261` and never closes, so it contains
   every subsequent section — measured height 24,570px of a 25,574px page. A stray `</section>`
   at `index.html:482` closes contact's `<div class="container">` instead. Confirmed with
   `html.parser`: two mismatches, zero unclosed tags at EOF (the errors cancel out, which is why
   the page still renders).
2. **About section is empty.** Only the section-title paragraph renders. `data/bio.json` has
   `"highlights": []`, and the hardcoded About copy contradicts `bio.json.summary` — the page says
   "part-time Vision Engineer … while completing my master's degree"; the JSON says the master's
   is complete and the role is full-time.
3. **Sponsorship links still present** despite commit `b5df81a` ("remove sponsorship links"):
   Ko-fi and GitHub Sponsors buttons plus a 712px Ko-fi iframe at `index.html:461-487`.

### Measured performance

Total 3.26 MB / 29 requests. Largest contributors:

| Resource | Transfer |
|---|---|
| `assets/img/profile-img.jpg` | 1.91 MB (1254px natural, displayed at 120px) |
| `assets/js/bundle.js` | 290 KB |
| `assets/vendor/bootstrap/css/bootstrap.min.css` | 228 KB |
| `bootstrap-icons` woff2 + css | 211 KB |
| `boxicons` woff2 + css | 180 KB |
| `assets/css/bundle.css` | 123 KB |

`bundle.js` embeds jVectorMap (33 KB) and `worldmap.js` (144 KB) — 177 KB of travel-map code
shipped on every page load for one section far down the page. jQuery loads from CDN solely to
support it. The profile image carries both `loading="lazy"` and `fetchpriority="high"`.

### UX findings

- The hero contains no name, title, tagline, or call to action. On mobile the sidebar is hidden,
  so the hero's entire text content is `"SELECT A DIGIT: 0 1 2 … 9 SCROLL"`.
- The only `<h1>` is the sidebar name; the hero has no heading.
- Projects render as 3 featured + 17 "All Projects" cards, all identical full-width rows, with no
  grid, filter, or search. Featured and non-featured are visually indistinguishable.
- `.mobile-nav-toggle` is an `<i>` element, so mobile navigation is unreachable by keyboard.
- No skip-to-content link.

## Build system (prerequisite)

`index.html` loads `assets/css/bundle.css` and `assets/js/bundle.js`. Neither is produced by
`optimize.sh`, and no build script exists — so editing a source file has no effect on the live
page. Byte-mapping both bundles shows each is a plain concatenation:

**`bundle.js`** (296,669 bytes)

| Range | Content |
|---|---|
| 0–1519 | `utils.js` |
| 1519–12718 | `data-loader.js` |
| 12718–46041 | `jquery-jvectormap-1.2.2.min.js` |
| 46041–190355 | `worldmap.js` |
| 190355–204703 | `portfolio-renderer.js` |
| 204703–207775 | `theme.js` |
| 207775–228693 | `publications.js` |
| 228693–249346 | **orphan** — "Lightweight Animation Module" |
| 249346–276436 | `neural-banner.js` |
| 276436–289305 | **orphan** — "Site Enhancements JavaScript" |
| 289305–290726 | `particles-config.js` |
| 290726–296669 | `main.js` |

**`bundle.css`** (125,615 bytes)

| Range | Content |
|---|---|
| 0–681 | `jquery-jvectormap-1.2.2.css` |
| 681–22489 | `style.css` |
| 22489–40729 | `modern-portfolio.css` |
| 40729–46951 | `optimized-sidebar.css` |
| 46951–68358 | **orphan** — "Optimized Hero Section Styles" |
| 68358–76923 | `responsive-images.css` |
| 76923–81083 | **orphan** — "Section Headers Fix" |
| 81083–89174 | `components/publications.css` |
| 89174–95704 | **orphan** — "Neural Network Visualization" |
| 95704–102627 | `dark-mode.css` |
| 102627–125615 | **orphan** — "Enhanced Button & Interactive Element Styles" |

The six orphan blocks exist only inside the bundles and have no source file. They are extracted to
real source files so nothing is lost, then a `scripts/build.sh` regenerates both bundles from
explicit ordered lists.

**Safety gate:** the build must reproduce both bundles **byte-identically** before any content
change is made. That check is the foundation for everything downstream.

## Changes

### 1. Build system
Extract the six orphan blocks to sources; add `scripts/build.sh`; verify byte-identical
reproduction; then move jVectorMap + `worldmap.js` out of `bundle.js` into `assets/js/travel-map.js`.

### 2. Bug fixes
Close `#about` correctly, remove the stray `</section>`, delete the support section and Ko-fi
iframe, and correct `bio.json.currentRole` (still reads "MSc Student at Chalmers").

### 3. About section
Rendered from `bio.json` by `portfolio-renderer.js`, matching the existing data-driven pattern:
the `summary` paragraph as the single source of truth (replacing the stale hardcoded copy), a
stats row computed at runtime from the JSON files (publications, projects, roles, countries — no
hardcoded numbers), and keyword chips from `bio.keywords`.

### 4. Hero
Two columns at ≥992px: identity left, the existing neural-network demo right. Identity is a real
`<h1>` with the name, a role line, the tagline, and three CTAs (View Projects / Publications /
Get in touch). Stacks identity-first on mobile. The sidebar name drops from `<h1>` to a `<p>` so
the document has exactly one `h1` and a correct heading outline.

No CV download button: no CV PDF exists in the repo.

### 5. Projects
"All Projects" becomes a responsive grid (1 / 2 / 3 columns at mobile / ≥768 / ≥1200). Featured
projects keep the wide row format so they stay visually distinct. A filter bar above the grid is
built from real `technologies` values; with 57 distinct tags across 24 projects, only tags used by
≥2 projects get a chip (~10), plus "All". Plain client-side filtering, no library.

### 6. Performance

| Change | Effect |
|---|---|
| Resize `profile-img.jpg` to 240px, WebP + JPEG fallback; drop `loading="lazy"` | ~1.9 MB |
| Drop boxicons; map its 15 used icons to bootstrap-icons (already loaded, 47 icons in use) | ~180 KB |
| Load `travel-map.js` + jQuery only when `#travel` nears the viewport | ~265 KB deferred |
| Inline the Hugging Face logo instead of `<object data=…svg>` | ~26 KB |

Target: 3.26 MB → ~500 KB.

### 7. Accessibility
Add a skip-to-content link; convert `.mobile-nav-toggle` from `<i>` to `<button>`.

## Verification

1. `html.parser` reports zero mismatches and zero unclosed tags for every modified HTML file.
2. `scripts/build.sh` reproduces bundles byte-identically at the safety gate (before content changes).
3. Re-measure `transferSize` in-browser and compare against the 3.26 MB baseline.
4. Screenshots at desktop and mobile widths, in light and dark themes.
5. Keyboard tab-through reaches the skip link, nav, hero CTAs, and mobile nav toggle.
6. Travel map still renders after being moved to lazy loading; project filter chips filter correctly.

## Out of scope

Typography/color redesign, inner project page restyling, and the 39 MB `assets/img` directory
(only files the homepage actually requests are addressed).
