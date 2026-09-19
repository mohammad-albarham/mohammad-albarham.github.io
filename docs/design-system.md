# Design system — mohammad-albarham.github.io

The visual system for the site: one token file, one base layer, one component
set. Written for whoever builds the inner pages next, so every component below
has a copy-pasteable snippet that works with no other setup.

Static CSS only. No build step, no framework, no npm dependency.

---

## 1. How to load it

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap">

<link href="assets/css/revamp/tokens.css" rel="stylesheet">
<link href="assets/css/revamp/base.css" rel="stylesheet">
<link href="assets/css/revamp/components.css" rel="stylesheet">
```

Order matters: `tokens` → `base` → `components`. Use paths relative to the page
(`../assets/css/revamp/…` from `projects/`, `experience/`, etc.).

There is a fourth file, `assets/css/revamp/site.css`. **It is not part of the
system.** It exists only because the homepage still loads the legacy
`assets/css/bundle.css` for blocks that JavaScript renders (the timeline,
project and publication cards, the language chart, the neural-network demo).
It re-points the legacy tokens at the new ones and undoes the old page chrome.
Load it **only** on a page that also loads `bundle.css`, and always last.

Dark mode is driven by `data-theme="dark"` on `<html>`, written by
`assets/js/theme.js`. Every token has a dark value; components need no dark
variants of their own.

---

## 2. The idea, in one paragraph

The page is white, quiet and left-aligned. Its one signature is the **hard
offset shadow**: an outlined rectangle displaced by an unblurred 6px in the
section's accent colour — a stereo disparity, not a drop shadow. Interaction
*converges* it: the displacement halves and the element steps into it. That is
the only motion in the system, and it only ever answers a user's action.

The accent is **semantic, not decorative**. Three scopes, set with a
`data-accent` attribute on the `<section>`:

| Scope                  | Colour | Means                                             | Used by                     |
| ---------------------- | ------ | ------------------------------------------------- | --------------------------- |
| *(none)* / `base`      | cobalt | who he is, where he studied, how to reach him     | about, resume, travel, contact |
| `build`                | amber  | things he made                                    | projects, competitions      |
| `write`                | rose   | things he wrote or gave                           | publications, volunteering  |

Everything inside a scope repaints: card shadows, badges, section rules, list
markers, filter chips, the active nav pill.

```html
<section id="projects" class="ds-section" data-accent="build"> … </section>
```

**House rules.** Sentence case everywhere — no ALL-CAPS labels or eyebrows. No
`→` appended to link or button text. No monospace for data labels. No numbered
`01 / 02 / 03` markers unless the content really is a sequence. No
fade-and-slide-up on every card.

---

## 3. Tokens

All in `tokens.css` on `:root`. Never hard-code a colour, size or duration in a
component — add a token or use an existing one.

### Colour

| Token | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--ds-paper` | `#ffffff` | `#0f1420` | page ground |
| `--ds-paper-alt` | `#f2f5fb` | `#161d2e` | alternating sections |
| `--ds-paper-sunk` | `#e7ecf7` | `#1e2740` | wells, inputs |
| `--ds-ink` | `#141b2e` | `#eef1f8` | body text, card outlines |
| `--ds-ink-muted` | `#4c5670` | `#a3adc4` | secondary text |
| `--ds-rule` | `#d9dfec` | `#2c3651` | hairlines |
| `--ds-cobalt` | `#1746c4` | `#8fb0ff` | default accent |
| `--ds-amber` | `#f5c451` | `#f7cf7a` | fill only |
| `--ds-amber-ink` | `#7a4a06` | `#f7cf7a` | amber as text |
| `--ds-rose` | `#b02a5b` | `#ff9ac0` | |
| `--ds-positive` | `#16704a` | `#6fd6a6` | "current" / "active" |

Measured contrast on `--ds-paper` (light): ink 17.1:1, muted 7.3:1, cobalt
7.8:1, amber-ink 7.5:1, rose 6.3:1, ink-on-amber-fill 10.5:1. Dark theme is
7.5:1 or better on every pair. All clear WCAG 2.1 AA; most clear AAA.

**Resolved accent** — use these in components, never a named colour:
`--ds-accent`, `--ds-accent-ink` (accent as text), `--ds-accent-wash` (tint),
`--ds-accent-on-fill` (text that sits on the accent).

> ⚠️ A `var()` nested inside a custom property is substituted where that
> property is **declared**, not where it is used. Any new token whose value
> mentions `--ds-accent` must be redeclared inside each `[data-accent]` block,
> as `--ds-shadow-hard*` are, or it will freeze at cobalt page-wide.

### Type

- Display: `--ds-font-display` — **Space Grotesk** (600/700). Headings only.
- Body: `--ds-font-body` — **IBM Plex Sans** (400/500/600/700).
- No monospace anywhere.

17px base, 1.25 modular scale:

| Token | Size | Use |
| --- | --- | --- |
| `--ds-text-xs` | 12.6px | counts, captions |
| `--ds-text-sm` | 14.2px | meta, tags, links in a row |
| `--ds-text-base` | 16px | UI default |
| `--ds-text-body` | 17px | running prose |
| `--ds-text-md` | 20px | lead paragraphs |
| `--ds-text-lg` | 25px | card titles, `h4` |
| `--ds-text-xl` | 31px | `h3` |
| `--ds-text-2xl` | 39px | section headings, `h2` |
| `--ds-text-3xl` | 49px | `h1` |
| `--ds-text-4xl` | 61px | `h1` ≥1024px |

Weights `--ds-weight-regular|medium|semibold|bold` (400/500/600/700).
Leading `--ds-leading-tight` 1.06, `--ds-leading-snug` 1.25,
`--ds-leading-body` 1.65. Tracking `--ds-tracking-tight` (-0.02em) only at
display sizes. Measure `--ds-measure` 68ch, `--ds-measure-narrow` 54ch — keep
prose under 80 characters a line.

### Spacing — 4px base

`--ds-space-1` 4px · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 24 · `-6` 32 · `-7` 48 ·
`-8` 64 · `-9` 96 · `-10` 128

### Radii, borders, shadows

`--ds-radius-sm` 6px · `-md` 12px · `-lg` 20px · `-pill` 999px
`--ds-border-hairline` 1px (quiet edges) · `--ds-border-solid` 2px (cards, pills)

`--ds-shadow-hard-sm` 3px · `--ds-shadow-hard` 6px · `--ds-shadow-hard-lg` 10px
— all `Xpx Xpx 0 0 var(--ds-accent)`.
`--ds-shadow-soft` — floating UI only (theme toggle, back-to-top). Never on a card.

### Focus, motion, layout

`--ds-focus-ring` is a two-part ring: a 2px paper spacer then a 3px
`--ds-focus-color` band, so it stays visible on any surface. `base.css` puts it
on `:focus-visible`; components restate it where Bootstrap out-specifies them.

`--ds-duration-fast` 120ms · `--ds-duration` 180ms ·
`--ds-ease` `cubic-bezier(.2,.7,.3,1)`. `base.css` honours
`prefers-reduced-motion: reduce`.

`--ds-container` 1120px · `--ds-container-narrow` 760px · `--ds-gutter` 24px ·
`--ds-nav-height` 64px.

### Breakpoints

CSS cannot read a custom property inside `@media`, so these are the written
record. Do not invent others.

| Name | Value | Threshold |
| --- | --- | --- |
| `--ds-bp-sm` | 480px | large phone |
| `--ds-bp-md` | 768px | tablet; single→two column |
| `--ds-bp-lg` | 1024px | laptop |
| `--ds-bp-xl` | 1280px | wide desktop |

One exception: the pill nav swaps to its toggle at **1199px**, because ten
section labels plus the portrait need 1008px of pill. It is written in
`components.css` next to the rule that needs it.

---

## 4. Components

### Layout

`.ds-container` — max 1120px, centred, gutters. `--narrow` for 760px.
`.ds-section` — vertical rhythm; `--alt` paints `--ds-paper-alt`.
`.ds-stack` — 24px between direct children. `.ds-prose` — caps at 68ch.

```html
<section id="about" class="ds-section ds-section--alt" data-accent="base">
  <div class="ds-container"> … </div>
</section>
```

> On a page that also loads `bundle.css`, the legacy `#main section` rule
> out-specifies `.ds-section`; `site.css` restores the padding. On a clean page
> `.ds-section` is enough.

### Section header

A heading, a short thick rule that is the accent made literal, and one plain
sentence saying what the section holds. The count chip is optional — use it
only where the number is itself a fact worth stating.

```html
<div class="ds-section-header">
  <h2>Publications <span class="ds-section-count">8</span></h2>
  <p>My research contributions in AI, Computer Vision, and Arabic NLP</p>
</div>
```

`.ds-subhead` is the quieter header for a group inside a section.

```html
<h3 class="ds-subhead">Featured Projects</h3>
```

### Card

The workhorse: outline plus hard offset in the section accent.

```html
<article class="ds-card ds-card--interactive">
  <h3 class="ds-card__title"><a href="projects/araclip.html">AraCLIP</a></h3>
  <p class="ds-card__meta"><span>2024</span><span>ArabicNLP @ ACL</span></p>
  <div class="ds-card__body">
    <p>Cross-lingual learning for effective Arabic image retrieval.</p>
  </div>
  <div class="ds-card__footer">
    <ul class="ds-link-row">
      <li><a href="#">Paper</a></li>
      <li><a href="#">Code</a></li>
    </ul>
  </div>
</article>
```

Modifiers: `--interactive` (converges on hover/focus-within — use when the whole
card is a target), `--flush` (no padding, card holds its own layout), `--quiet`
(outline only, no displacement — for a card nested inside a card), `--lg` (10px
displacement, for one hero-weight card per page).

Parts: `__title`, `__meta`, `__body`, `__footer`.

### Tag & badge

`.ds-tag` states a **fact** about the thing (a technology, a topic) and stays
neutral. `.ds-badge` states a **status** (featured, current, awarded) and takes
the accent. Don't reach for a badge when a tag will do.

```html
<ul class="ds-tag-list">
  <li><span class="ds-tag">PyTorch</span></li>
  <li><span class="ds-tag">DINOv3</span></li>
</ul>

<span class="ds-badge">Featured</span>
<span class="ds-badge ds-badge--outline">Preprint</span>
<span class="ds-badge ds-badge--current">Active</span>
```

### Button

Carries the same displacement as a card so the two read as one family. Label it
with the verb that happens; never append an arrow glyph.

```html
<a href="#projects" class="ds-btn ds-btn--primary">View projects</a>
<a href="/contact/" class="ds-btn">Get in touch</a>
<button type="button" class="ds-btn ds-btn--ghost ds-btn--sm">Reset filters</button>

<div class="ds-btn-row"> … several buttons … </div>
```

`--primary` fills with the accent, `--ghost` is borderless until hover,
`--sm` is compact. `[disabled]` / `[aria-disabled="true"]` dims and disables.

### Pill navigation

One outlined pill floating over the page, sticky at the top. The active item
fills with the accent of the section it points at, so the nav's colour says
where you are. Below 1199px the labels collapse behind the toggle.

Three things the site's existing JavaScript requires and you must keep:
`id="navbar"` on the `<nav>`, `class="nav-link scrollto"` on each link
(`assets/js/main.js` reads `#navbar .scrollto` and adds `.active`), and
`class="mobile-nav-toggle"` on the button (it toggles `body.mobile-nav-active`).

```html
<header class="ds-nav">
  <a class="ds-nav__brand" href="index.html" aria-label="Mohammad Albarham — home">
    <span class="ds-avatar ds-avatar--sm">
      <img src="assets/img/profile-img-240.jpg" alt="" width="40" height="40">
    </span>
    <span class="ds-nav__brand-name">Mohammad Albarham</span>
  </a>

  <nav id="navbar" class="ds-nav__nav" aria-label="Page sections">
    <ul class="ds-nav__list">
      <li><a href="#about" class="nav-link scrollto" data-accent="base">About</a></li>
      <li><a href="#projects" class="nav-link scrollto" data-accent="build">Projects</a></li>
      <li><a href="#publications" class="nav-link scrollto" data-accent="write">Publications</a></li>
    </ul>
  </nav>

  <div class="ds-nav__actions">
    <button type="button" class="mobile-nav-toggle ds-icon-btn ds-nav__toggle"
      aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="navbar">
      <i class="bi bi-list" aria-hidden="true"></i>
    </button>
  </div>
</header>
```

Put `data-accent` on each **link** so its active fill matches its destination.
`.ds-nav__brand-name` is hidden at widths that show the labels; the portrait
alone links home, which is why the anchor carries an `aria-label`.

`.ds-icon-btn` is the round icon-only control (40px) used in the pill and for
social links.

> `main.js` scrolls anchors with `window.scrollTo(el.offsetTop)`, which ignores
> `scroll-padding-top`. A section's own top padding is therefore what keeps its
> heading out from under the sticky pill: keep it at `--ds-space-9` (96px) or
> more.

### Avatar / portrait

Circular, outlined, displaced. `--ds-avatar-size` is the only knob.

```html
<span class="ds-avatar ds-avatar--lg">
  <img src="assets/img/profile-img-240.jpg" alt="Mohammad Albarham">
</span>
```

`--sm` 40px (no displacement) · default 96px · `--lg` 168px.
Decorative avatars take `alt=""`; a portrait that identifies someone gets a real
alt.

### Links

`base.css` already styles a bare `<a>`: accent colour, underline on, 1px,
0.18em offset. Underlines stay on — colour must never be the only signal.

- `.ds-link` — same treatment, applied explicitly.
- `.ds-link--plain` — no underline. Only inside a card whose whole surface is
  already the affordance.
- `.ds-link-row` — a `<ul>` of small labelled links (repo, paper, demo).

```html
<ul class="ds-link-row">
  <li><a href="…"><i class="bi bi-github" aria-hidden="true"></i> GitHub</a></li>
  <li><a href="…"><i class="bi bi-file-text" aria-hidden="true"></i> Paper</a></li>
</ul>
```

### Footer

```html
<footer class="ds-footer">
  <div class="ds-container ds-footer__inner">
    <p>&copy; <span id="footer-year">2025</span> Mohammad Albarham. All Rights Reserved.</p>
    <div class="ds-footer__meta">
      <span>Built with &hearts; for open science</span>
      <span>Last updated: <span id="current-date"></span></span>
    </div>
  </div>
</footer>
```

---

## 5. Accessibility floor

Non-negotiable on every page:

- **Contrast** — only token pairs from §3. Never `--ds-amber` as text; use
  `--ds-amber-ink`. Never white on amber.
- **Focus** — every interactive element shows `--ds-focus-ring` on
  `:focus-visible`. Bootstrap ships its own focus shadow on `.nav-link`, `.btn`
  and `.form-control` at a higher specificity: if a control carries one of those
  classes, restate the ring (see the "Focus, restated" block in
  `components.css`). A scroll container clips the ring — pad it and pull the
  padding back with a negative margin.
- **Landmarks** — one `<header>`, one `<main id="main">`, one `<footer>`;
  `<nav aria-label="…">`. Keep the skip link as the first focusable element.
- **Motion** — `prefers-reduced-motion: reduce` is honoured in `base.css`. Don't
  add motion that isn't a response to a user action.
- **No JS dependency for content** — never ship an element at `opacity: 0`
  waiting for an observer to reveal it.
- **Alt text** — decorative images `alt=""`; icons `aria-hidden="true"` with the
  meaning in adjacent text or an `aria-label`.

---

## 6. Extending it

1. Reach for an existing component first.
2. Need a new one? Add a flat `ds-`-prefixed class in `components.css`, nested
   at most one level (`.ds-thing__part`). Deep nesting makes it unoverridable.
3. Only tokens for values. If the token doesn't exist, add it to `tokens.css`
   with the light and dark values and a comment saying what it is for.
4. If the value mentions `--ds-accent`, redeclare it in all three
   `[data-accent]` blocks (see the warning in §3).
5. Overriding legacy CSS: check whether the legacy rule uses the `background`
   *shorthand* — setting `background-color` alone leaves its gradient on top.
   The same applies to `padding` vs `padding-top`.
