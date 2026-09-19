#!/usr/bin/env python3
"""Render the static site from data/*.json.

Python standard library only: no npm, no framework, nothing to install. Run it
through scripts/build.sh rather than directly, so the CSS/JS bundles and the
sitemap stay in step with the pages.

Pages produced:
    index.html          the whole story on one page; every legacy #anchor lives here
    projects/index.html every project, with a technology filter
    research/index.html every publication and competition, in full
    about/index.html    the long-form CV: education, courses, roles, service
    sitemap.xml         generated from the routes that actually exist on disk

The 32 hand-written detail pages under projects/, competitions/, experience/
and volunteering/ are NOT generated here — their galleries and write-ups are
not reproducible from JSON. site/restyle_legacy.py re-shells them instead.
"""

from __future__ import annotations

import html
import json
import math
import os
import re
from datetime import date, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SITE_URL = "https://mohammad-albarham.github.io"

MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# --- small helpers ---------------------------------------------------------

def load(name: str):
    with open(DATA / f"{name}.json", encoding="utf-8") as fh:
        return json.load(fh)


def e(value) -> str:
    """Escape for text content and double-quoted attributes."""
    return html.escape("" if value is None else str(value), quote=True)


def month(value: str | None, fallback: str = "Present") -> str:
    if not value:
        return fallback
    parts = str(value).split("-")
    if len(parts) >= 2:
        return f"{MONTHS[int(parts[1])]} {parts[0]}"
    return parts[0]


def span(start: str | None, end: str | None) -> str:
    return f"{month(start)} – {month(end)}"


def picture(src: str, alt: str, *, cls: str = "", width: int | None = None,
            height: int | None = None, eager: bool = False,
            sizes: str | None = None) -> str:
    """<picture> with the matching WebP from assets/img_webp when one exists."""
    src = src.lstrip("/")
    webp = re.sub(r"^assets/img/", "assets/img_webp/", src)
    webp = re.sub(r"\.(jpe?g|png)$", ".webp", webp, flags=re.I)
    attrs = [f'src="/{e(src)}"', f'alt="{e(alt)}"']
    if cls:
        attrs.append(f'class="{e(cls)}"')
    if width:
        attrs.append(f'width="{width}"')
    if height:
        attrs.append(f'height="{height}"')
    attrs.append('fetchpriority="high"' if eager else 'loading="lazy"')
    attrs.append('decoding="async"')
    if sizes:
        attrs.append(f'sizes="{e(sizes)}"')
    img = f"<img {' '.join(attrs)}>"
    if webp != src and (ROOT / webp).exists():
        return f'<picture><source srcset="/{e(webp)}" type="image/webp">{img}</picture>'
    return img


def tags(items, limit: int | None = None) -> str:
    items = list(items or [])
    shown = items[:limit] if limit else items
    lis = "".join(f'<li><span class="tag">{e(t)}</span></li>' for t in shown)
    if limit and len(items) > limit:
        lis += f'<li><span class="tag">+{len(items) - limit}</span></li>'
    return f'<ul class="tag-list">{lis}</ul>' if lis else ""


LINK_LABELS = {
    "github": ("bi-github", "Code"),
    "demo": ("bi-play-circle", "Demo"),
    "paper": ("bi-file-earmark-text", "Paper"),
    "report": ("bi-file-earmark-text", "Report"),
    "poster": ("bi-easel", "Poster"),
    "huggingface": ("bi-box", "Hugging Face"),
    "kaggle": ("bi-bar-chart", "Kaggle"),
    "roboflow": ("bi-bounding-box", "Roboflow"),
}


def link_row(links: dict | None, cls: str = "work-card-links") -> str:
    if not links:
        return ""
    out = []
    for key, url in links.items():
        if not url:
            continue
        icon, label = LINK_LABELS.get(key, ("bi-box-arrow-up-right", key.replace("-", " ").capitalize()))
        external = url.startswith("http")
        rel = ' target="_blank" rel="noopener noreferrer"' if external else ""
        href = url if external or url.startswith("/") else "/" + url
        out.append(f'<a href="{e(href)}"{rel}><i class="bi {icon}" aria-hidden="true"></i> {e(label)}</a>')
    return f'<div class="{cls}">{"".join(out)}</div>' if out else ""


def details_href(record: dict) -> str | None:
    page = record.get("detailsPage")
    if not page:
        return None
    return "/" + page.lstrip("/")


# --- page shell ------------------------------------------------------------

SOCIAL = [
    ("https://www.linkedin.com/in/albarham/", "LinkedIn", '<i class="bi bi-linkedin" aria-hidden="true"></i>'),
    ("https://github.com/mohammad-albarham", "GitHub", '<i class="bi bi-github" aria-hidden="true"></i>'),
    ("https://scholar.google.com/citations?user=3znRUJoAAAAJ&hl=en", "Google Scholar",
     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 1 9l11 6 9-4.91V17h2V9zM6 13.2V17c0 2.2 2.7 4 6 4s6-1.8 6-4v-3.8l-6 3.3z"/></svg>'),
    ("https://huggingface.co/pain", "Hugging Face",
     # Face and hands inherit `fill: currentColor` from .social svg like the
     # other icons; the eyes and smile are evenodd holes so the button shows
     # through them.
     '<svg viewBox="0 0 24 24" aria-hidden="true">'
     '<ellipse cx="4.1" cy="15.9" rx="2.4" ry="3" transform="rotate(-28 4.1 15.9)"/>'
     '<ellipse cx="19.9" cy="15.9" rx="2.4" ry="3" transform="rotate(28 19.9 15.9)"/>'
     '<path fill-rule="evenodd" d="M12 3a7.6 7.6 0 1 0 0 15.2A7.6 7.6 0 0 0 12 3z'
     'M9 9.9a1.4 1.8 0 1 0 0 3.6 1.4 1.8 0 0 0 0-3.6z'
     'M15 9.9a1.4 1.8 0 1 0 0 3.6 1.4 1.8 0 0 0 0-3.6z'
     'M8.4 13.6h7.2a3.6 3.6 0 0 1-7.2 0z"/>'
     '</svg>'),
]

NAV = [
    ("/projects/", "Projects", "projects"),
    ("/research/", "Research", "research"),
    ("/about/", "About & CV", "about"),
    ("/#contact", "Contact", "contact"),
]

EMAIL = "mohammad.albarham.work@gmail.com"


def social_list(cls: str = "social") -> str:
    lis = "".join(
        f'<li><a href="{e(url)}" aria-label="{e(label)}" target="_blank" rel="noopener noreferrer">{icon}</a></li>'
        for url, label, icon in SOCIAL
    )
    return f'<ul class="{cls}">{lis}</ul>'


def shell(*, title: str, description: str, canonical: str, body: str,
          current: str = "", head_extra: str = "", body_end: str = "",
          og_image: str = "/assets/img/profile-img-1200.jpg") -> str:
    pills = "".join(
        '<li><a href="{0}"{1}>{2}</a></li>'.format(
            e(href), ' aria-current="page"' if key == current else "", e(label))
        for href, label, key in NAV
    )
    year = date.today().year
    return f"""<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<meta name="author" content="Mohammad Albarham">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{e(SITE_URL + canonical)}">
<meta name="theme-color" content="#00796b">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Mohammad Albarham">
<meta property="og:url" content="{e(SITE_URL + canonical)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:image" content="{e(SITE_URL + og_image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(description)}">
<meta name="twitter:image" content="{e(SITE_URL + og_image)}">

<link rel="icon" href="/assets/img/favicon.png">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">

<link rel="preload" href="/assets/fonts/nunito-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/nunito-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.min.css">
<link rel="stylesheet" href="/assets/css/site.css">

<script>
// Apply the saved theme before first paint so the page never flashes.
(function () {{
  try {{
    var saved = localStorage.getItem('ma-theme');
    var dark = saved ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  }} catch (e) {{}}
}})();
</script>
{head_extra}
<script async src="https://www.googletagmanager.com/gtag/js?id=G-VJHNQN2HWX"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){{dataLayer.push(arguments);}}
gtag('js', new Date());
gtag('config', 'G-VJHNQN2HWX');
</script>
</head>

<body>
<a class="skip-link" href="#main">Skip to main content</a>

<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="/">
      {picture('assets/img/profile-img-240.jpg', 'Mohammad Albarham', width=34, height=34, eager=True)}
      <span>Mohammad Albarham</span>
    </a>
    <nav aria-label="Primary">
      <ul class="nav-pills" id="nav-pills">{pills}</ul>
    </nav>
    <div class="topbar-actions">
      <button class="icon-btn theme-toggle" type="button" aria-pressed="false" aria-label="Switch to dark theme">
        <i class="bi bi-moon" aria-hidden="true"></i><i class="bi bi-sun" aria-hidden="true"></i>
      </button>
      <button class="icon-btn nav-toggle" type="button" aria-expanded="false"
              aria-controls="nav-pills" aria-label="Open navigation">
        <i class="bi bi-list" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</header>

<main id="main">
{body}
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <h2>Mohammad Albarham</h2>
        <p>Computer vision and AI engineer in Gothenburg, Sweden. Autonomous
           systems, multi-modal models and Arabic NLP.</p>
        <p><a href="mailto:{e(EMAIL)}">{e(EMAIL)}</a></p>
        {social_list()}
      </div>
      <div>
        <h2>Pages</h2>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/projects/">Projects</a></li>
          <li><a href="/research/">Research</a></li>
          <li><a href="/about/">About &amp; CV</a></li>
        </ul>
      </div>
      <div>
        <h2>Sections</h2>
        <ul>
          <li><a href="/#resume">Experience</a></li>
          <li><a href="/#publications">Publications</a></li>
          <li><a href="/#competitions">Competitions</a></li>
          <li><a href="/#volunteering">Volunteering</a></li>
          <li><a href="/#travel">Travel</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; {year} Mohammad Albarham</span>
      <span>Built as a static site, hosted on GitHub Pages</span>
      <span><a href="/sitemap.xml">Sitemap</a></span>
    </div>
  </div>
</footer>

<script src="/assets/js/site.js" defer></script>
{body_end}
</body>

</html>
"""


# --- shared section builders ----------------------------------------------

def work_card(project: dict) -> str:
    href = details_href(project) or (project.get("links") or {}).get("github")
    title = e(project["title"])
    heading = f'<a href="{e(href)}">{title}</a>' if href else title
    image = ""
    if project.get("image"):
        image = picture(project["image"], project["title"], sizes="(max-width: 40rem) 100vw, 20rem")
        if href:
            image = f'<a href="{e(href)}" tabindex="-1" aria-hidden="true">{image}</a>'
    techs = "|".join(project.get("technologies") or [])
    year = project.get("year")
    return f"""<article class="work-card" data-tech="{e(techs)}">
  {image}
  <div class="work-card-body">
    {f'<p class="meta">{e(year)}</p>' if year else ''}
    <h3>{heading}</h3>
    <p>{e(project.get('shortDescription') or project.get('description') or '')}</p>
    {tags(project.get('technologies'), limit=4)}
    {link_row(project.get('links'))}
  </div>
</article>"""


def filter_block(projects: list, grid_id: str) -> tuple[str, str]:
    """Chips + the grid they drive. Only technologies used more than once
    become a chip — a filter with one result behind it is not a filter."""
    counts: dict[str, int] = {}
    for project in projects:
        for tech in project.get("technologies") or []:
            counts[tech] = counts.get(tech, 0) + 1
    common = sorted((t for t, n in counts.items() if n >= 2),
                    key=lambda t: (-counts[t], t))[:10]
    chips = ['<li><button type="button" class="filter-chip" data-tech-value="all" '
             'aria-pressed="true">All projects</button></li>']
    chips += [f'<li><button type="button" class="filter-chip" data-tech-value="{e(t)}" '
              f'aria-pressed="false">{e(t)} <span aria-hidden="true">{counts[t]}</span></button></li>'
              for t in common]
    controls = f"""<div data-filter-group="{grid_id}" data-filter-status="{grid_id}-status">
  <ul class="filters" role="group" aria-label="Filter projects by technology">{''.join(chips)}</ul>
</div>
<p class="filter-status" id="{grid_id}-status" role="status" aria-live="polite"></p>"""
    grid = f'<div class="card-grid" id="{grid_id}">{"".join(work_card(p) for p in projects)}</div>'
    return controls, grid


def publication(pub: dict, *, full: bool) -> str:
    authors = ", ".join(
        f'<span class="me">{e(a["name"])}</span>' if a.get("isMe") else e(a["name"])
        for a in pub.get("authors") or []
    )
    links = {}
    if pub.get("url"):
        links["paper"] = pub["url"]
    if pub.get("pdfUrl"):
        links["pdf"] = pub["pdfUrl"]
    if pub.get("doi"):
        links["doi"] = pub["doi"]
    if pub.get("huggingface"):
        links["huggingface"] = pub["huggingface"]
    link_html = "".join(
        f'<a href="{e(url)}" target="_blank" rel="noopener noreferrer">{e(label.upper() if label in ("doi", "pdf") else label.capitalize())}</a>'
        for label, url in links.items()
    )
    where = pub.get("venue") or ""
    if pub.get("volume"):
        where += f", vol. {pub['volume']}"
    if pub.get("pages"):
        where += f", p. {pub['pages']}"

    extra = ""
    if full:
        bib_id = f"bibtex-{e(pub['id'])}"
        abstract = f'<p class="pub-abstract">{e(pub.get("abstract") or "")}</p>' if pub.get("abstract") else ""
        bibtex = ""
        if pub.get("bibtex"):
            bibtex = f"""<details>
  <summary><i class="bi bi-quote" aria-hidden="true"></i> BibTeX</summary>
  <pre id="{bib_id}">{e(pub['bibtex'])}</pre>
  <button type="button" class="btn btn-sm copy-bibtex" data-bibtex-for="{bib_id}">Copy BibTeX</button>
</details>"""
        extra = abstract + bibtex

    return f"""<article class="pub" data-type="{e(pub.get('type'))}" data-year="{e(pub.get('year'))}">
  <div class="pub-head">
    <span class="meta">{e(pub.get('year'))}</span>
    <span class="pub-badge">{e(pub.get('venueShort') or pub.get('type'))}</span>
  </div>
  <h3>{e(pub['title'])}</h3>
  <p class="pub-authors">{authors}</p>
  <p class="pub-venue">{e(where)}</p>
  <div class="pub-links">{link_html}</div>
  {extra}
</article>"""


def award(comp: dict) -> str:
    href = details_href(comp)
    title = e(comp["title"])
    heading = f'<a href="{e(href)}">{title}</a>' if href else title
    rank = comp.get("rank")
    badge = (f'<span class="award-rank">{e(rank)}</span>' if rank
             else '<span class="award-rank"><i class="bi bi-trophy" aria-hidden="true"></i></span>')
    # `award` is a string on some records and a list of strings on others.
    prize = comp.get("award") or ""
    prize = " · ".join(prize) if isinstance(prize, list) else prize
    return f"""<article class="award-card">
  {badge}
  <div>
    <h3>{heading}</h3>
    <p class="meta">{e(prize)} · {month(comp.get('date'))} · {e(comp.get('organizer'))}</p>
    <p>{e(comp.get('shortDescription') or comp.get('description') or '')}</p>
  </div>
</article>"""


def service_row(role: dict) -> str:
    logo = picture(role["logo"], role["organization"], width=48, height=48) if role.get("logo") else "<span></span>"
    org = e(role["organization"])
    if role.get("url"):
        org = f'<a href="{e(role["url"])}" target="_blank" rel="noopener noreferrer">{org}</a>'
    return f"""<div class="service-row">
  {logo}
  <div>
    <h3>{e(role['position'])}</h3>
    <p class="service-org">{org}</p>
  </div>
  <p class="meta">{span(role.get('startDate'), role.get('endDate'))}</p>
</div>"""


def _lang_slices(languages: list[dict]) -> list[dict]:
    """Angles for each slice, clockwise from 12 o'clock. The percentages sum to
    100, so the sweeps close the circle exactly."""
    slices = []
    angle = 0.0
    for index, entry in enumerate(languages):
        sweep = entry["pct"] / 100 * 360
        slices.append({
            "name": entry["name"],
            "pct": entry["pct"],
            "start": angle,
            "end": angle + sweep,
            "mid": angle + sweep / 2,
            "color": f"var(--lang-{index % 13 + 1})",
        })
        angle += sweep
    return slices


def _point_at(cx: float, cy: float, r: float, angle: float) -> tuple[float, float]:
    radians = math.radians(angle)
    return cx + r * math.sin(radians), cy - r * math.cos(radians)


def _lang_paths(slices: list[dict], cx: float, cy: float, r: float) -> str:
    paths = []
    for s in slices:
        x1, y1 = _point_at(cx, cy, r, s["start"])
        x2, y2 = _point_at(cx, cy, r, s["end"])
        large = 1 if s["end"] - s["start"] > 180 else 0
        d = (f"M {cx} {cy} L {x1:.2f} {y1:.2f} "
             f"A {r} {r} 0 {large} 1 {x2:.2f} {y2:.2f} Z")
        paths.append(f'<path class="lang-slice" d="{d}" fill="{s["color"]}"/>')
    return "\n    ".join(paths)


def _lang_leaders(slices: list[dict], cx: float, cy: float, r: float,
                  height: float, gap: float = 84, spacing: float = 24) -> str:
    """Name-and-percentage labels outside the pie on a leader line, placed at
    their slice's mid-angle then pushed apart vertically so the 1% tail stays
    readable."""
    labels = []
    for s in slices:
        ax, ay = _point_at(cx, cy, r, s["mid"])
        right = s["mid"] <= 180
        labels.append({**s, "ax": ax, "ay": ay, "right": right, "ideal": ay,
                       "y": ay, "x": cx + r + gap if right else cx - r - gap})

    for side in (True, False):
        column = sorted((l for l in labels if l["right"] is side),
                        key=lambda l: l["ideal"])
        cursor = 18.0
        for label in column:
            label["y"] = max(label["ideal"], cursor)
            cursor = label["y"] + spacing
        floor = height - 18.0
        for label in reversed(column):
            label["y"] = min(label["y"], floor)
            floor = label["y"] - spacing

    out = []
    for l in labels:
        elbow = l["x"] - 14 if l["right"] else l["x"] + 14
        ox, oy = _point_at(cx, cy, r + 10, l["mid"])
        points = (f'{l["ax"]:.1f},{l["ay"]:.1f} {ox:.1f},{oy:.1f} '
                  f'{elbow:.1f},{l["y"]:.1f} {l["x"]:.1f},{l["y"]:.1f}')
        out.append(f"""<polyline class="lang-leader" points="{points}"/>
    <text class="lang-label" x="{l['x']:.1f}" y="{l['y']:.1f}" dx="{6 if l['right'] else -6}"
          text-anchor="{'start' if l['right'] else 'end'}" dominant-baseline="middle"
          ><tspan class="lang-label-name">{e(l['name'])}</tspan><tspan
           class="lang-label-pct" dx="6">{l['pct']:.1f}%</tspan></text>""")
    return "\n    ".join(out)


def language_chart(langs: dict) -> str:
    """A labelled pie, rendered here rather than in the browser: the data is
    committed JSON, so the geometry can be baked into the page. The wide SVG
    carries leader-line labels; below 40rem CSS swaps it for a plain pie plus a
    two-column legend, which is the only layout that fits at 360px."""
    slices = _lang_slices(langs["languages"])
    summary = ", ".join(f"{l['name']} {l['pct']:.1f} percent"
                        for l in langs["languages"])

    wide = f"""<svg class="lang-pie lang-pie--wide" viewBox="0 0 880 470"
       aria-hidden="true" focusable="false">
    {_lang_paths(slices, 440, 235, 150)}
    {_lang_leaders(slices, 440, 235, 150, 470)}
  </svg>"""

    compact = f"""<svg class="lang-pie lang-pie--compact" viewBox="0 0 300 300"
       aria-hidden="true" focusable="false">
    {_lang_paths(slices, 150, 150, 145)}
  </svg>"""

    legend = "".join(
        f"""<li><span class="lang-swatch" style="background:{s['color']}"></span>
    <span class="lang-legend-name">{e(s['name'])}</span>
    <span class="lang-legend-pct">{s['pct']:.1f}%</span></li>"""
        for s in slices
    )

    return f"""<div class="lang-chart" role="img"
     aria-label="Share of hand-written code by language: {e(summary)}">
  {wide}
  {compact}
  <ul class="lang-legend">{legend}</ul>
</div>
<p class="lang-note">{e(langs['method'])} Measured across {langs['repositories']} public
repositories and {langs['notebooks']} notebooks
({langs['totalBytes'] / 1_000_000:.1f} MB of source), from {e(langs['source'])}.</p>"""


def travel_block(travel: dict) -> str:
    """The country list is rendered here, at build time. The vector map is a
    progressive extra loaded only when the section approaches the viewport."""
    regions = []
    chips = []
    listed: set[str] = set()
    for continent, codes in travel["visited"].items():
        values = {("_1" if c == "XK" else c): 1 for c in codes}
        regions.append({
            "values": values,
            "scale": ["#b9e6df", travel["continentColors"][continent]],
            "normalizeFunction": "polynomial",
        })
        for code in sorted(set(codes)):
            # Turkey is listed under both Asia and Europe; show it once.
            if code in listed:
                continue
            listed.add(code)
            flag = "".join(chr(0x1F1E6 + ord(ch) - ord("A")) for ch in code)
            name = travel["countryNames"].get(code, code)
            chips.append(f'<li><span aria-hidden="true">{flag}</span> {e(name)}</li>')
    unique = len({c for codes in travel["visited"].values() for c in codes})
    payload = html.escape(json.dumps(regions, separators=(",", ":")), quote=True)
    return f"""<p class="lead">I have visited <strong>{unique} countries</strong> across
<strong>{len(travel['visited'])} continents</strong>.</p>
<div id="travel-map" data-regions="{payload}"></div>
<ul class="country-list">{''.join(chips)}</ul>
<p class="meta">Map built with <a href="https://github.com/bjornd/jvectormap"
   target="_blank" rel="noopener noreferrer">jVectorMap</a>; the idea is borrowed
   from <a href="https://www.julian.ac/travel/" target="_blank" rel="noopener noreferrer">Julian</a>.</p>"""


def band_row(*, when: str, who: str, what: str, href: str | None = None,
             extra: str = "") -> str:
    inner = (f'<span class="band-when">{when}</span>'
             f'<span class="band-who">{who}</span>'
             f'<span class="band-what">{what}{extra}</span>'
             f'<span class="band-go" aria-hidden="true">&rarr;</span>')
    if href:
        return f'<a class="band-row" href="{e(href)}">{inner}</a>'
    return f'<div class="band-row">{inner}</div>'


# --- pages -----------------------------------------------------------------

def render_home(d) -> str:
    bio, projects, pubs, comps, vols = d["bio"], d["projects"], d["publications"], d["competitions"], d["volunteering"]
    featured = [p for p in projects if p.get("featured")]
    featured_pubs = [p for p in pubs if p.get("featured")]

    experience_rows = "".join(
        band_row(when=span(job.get("startDate"), job.get("endDate")),
                 who=e(job["company"]),
                 what=e(job["position"]),
                 href=details_href(job),
                 extra=f' <span class="meta">{e(job["location"])}</span>')
        for job in experience_sorted(d["experience"])
    )
    education_rows = "".join(
        band_row(when=span(s.get("startDate"), s.get("endDate")),
                 who=e(s["institution"]),
                 what=e(s["degree"]))
        for s in d["education"]
    )

    keywords = tags(bio.get("keywords"))
    controls, grid = filter_block(featured, "featured-projects")

    body = f"""
<section id="hero" class="hero">
  <div class="wrap hero-grid">
    <div class="rise">
      <p class="hero-where"><i class="bi bi-geo-alt" aria-hidden="true"></i> {e(bio['location']['city'])}, {e(bio['location']['country'])}</p>
      <h1 class="display">Mohammad<br>Albarham</h1>
      <p class="hero-role">{e(bio['title'])}</p>
      <p class="lead">Advanced Safety &amp; User Experience engineer in vision systems at Aptiv,
         MSc from Chalmers. I work on autonomous systems, multi-modal systems and open
         source projects &mdash; and I publish what I learn.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/projects/">See the projects</a>
        <a class="btn" href="/research/">Read the research</a>
      </div>
      {social_list()}
    </div>
    <figure class="humanoid-figure">
      <div class="humanoid-stage">
        <img class="humanoid-poster" src="/assets/img/humanoid-hero.webp" width="782" height="962" alt="A humanoid robot with a satin metal shell, articulated joints and a blue illuminated visor." fetchpriority="high">
        <canvas tabindex="0" role="img" aria-label="Interactive 3D humanoid robot. Use arrow keys to rotate; Home to reset." aria-describedby="humanoid-controls"></canvas>
      </div>
      <figcaption>
        <p class="humanoid-title">Intelligence, in motion.</p>
        <p class="humanoid-interest">Exploring my interest in humanoid robotics.</p>
        <p id="humanoid-controls" class="humanoid-hint">Drag to explore · Arrow keys to rotate</p>
      </figcaption>
    </figure>
    <script src="/assets/js/humanoid-hero.js" defer></script>
  </div>

  <div class="wrap">
    <div class="doorways">
      <a class="doorway doorway-work rise rise-2" href="/projects/">
        <h2>Projects <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>Computer vision, Arabic NLP, embedded systems and the tools built along the way.</p>
        <p class="meta">{len(projects)} projects &middot; {len(featured)} featured</p>
      </a>
      <a class="doorway doorway-research rise rise-3" href="/research/">
        <h2>Research <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>Peer-reviewed papers on cross-lingual retrieval and Arabic sign language, plus competition results.</p>
        <p class="meta">{len(pubs)} publications &middot; {len(comps)} competitions</p>
      </a>
      <a class="doorway doorway-cv rise rise-3" href="/about/">
        <h2>About &amp; CV <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>The full record: degrees, coursework, roles, responsibilities and IEEE service.</p>
        <p class="meta">{len(d['experience'])} roles &middot; {len(d['education'])} degrees &middot; {len(vols)} volunteer posts</p>
      </a>
    </div>
  </div>
</section>

<section id="about" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">About</h2>
    </div>
    <div class="about-body">
      <p class="lead">{e(bio['summary'])}</p>
      <p>{e(bio['currentRole'])}</p>
      {keywords}
    </div>
  </div>
</section>

<section id="resume" class="band">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Where I have worked and studied</h2>
      <p>Nine years from a mechatronics bench in Amman to vision systems for advanced
         safety in Gothenburg.</p>
    </div>
    <h3>Experience</h3>
    {experience_rows}
    <h3 style="margin-top:2.5rem">Education</h3>
    {education_rows}
    <p class="band-foot"><a href="/about/">Full CV, coursework and responsibilities &rarr;</a></p>
  </div>
</section>

<section id="projects" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Selected work</h2>
      <p>Eight projects that show the range: segmentation and retrieval models,
         Arabic language and sign-language datasets, and the hardware that started it.</p>
    </div>
    {controls}
    {grid}
    <p style="margin-top:2rem"><a class="btn" href="/projects/">All {len(projects)} projects</a></p>
  </div>
</section>

<section id="publications" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Research</h2>
      <p>Cross-lingual image retrieval, Arabic sign language recognition and Arabic NLP,
         published with collaborators in Sharjah, Jordan and beyond.</p>
    </div>
    {''.join(publication(p, full=False) for p in featured_pubs)}
    <p style="margin-top:2rem"><a class="btn" href="/research/">All {len(pubs)} publications, with abstracts and BibTeX</a></p>
  </div>
</section>

<section id="competitions" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Competitions</h2>
      <p>Hackathons, Kaggle days and robotics contests, from firefighting robots to
         logistics forecasting.</p>
    </div>
    <div class="card-grid">{''.join(award(c) for c in comps)}</div>
  </div>
</section>

<section id="programming-languages" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Programming languages</h2>
      <p>Not a self-assessment &mdash; this is measured from what is actually in my
         public repositories.</p>
    </div>
    {language_chart(d['languages'])}
  </div>
</section>

<section id="volunteering" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Volunteering</h2>
      <p>IEEE has been the constant since my student branch days &mdash; seven roles
         across a student branch, two sections and Region 8.</p>
    </div>
    {''.join(service_row(v) for v in vols)}
    <p style="margin-top:2rem"><a class="btn" href="/volunteering/volunteering_ieee.html">
      <i class="bi bi-images" aria-hidden="true"></i> IEEE photo gallery</a></p>
  </div>
</section>

<section id="travel" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Travel</h2>
    </div>
    {travel_block(d['travel'])}
    <p style="margin-top:1.5rem"><a href="/volunteering/visited_countries.html">The older map page &rarr;</a></p>
  </div>
</section>

<section id="contact" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Get in touch</h2>
      <p>Email is the reliable way to reach me. There is no contact form here on
         purpose: this site is static, so a form would have nowhere to send your
         message and no honest way to tell you it arrived.</p>
    </div>
    <div class="contact-grid">
      <div class="contact-card">
        <h3>Email</h3>
        <p class="contact-email"><a href="mailto:{e(EMAIL)}">{e(EMAIL)}</a></p>
      </div>
      <div class="contact-card">
        <h3>Location</h3>
        <p>{e(bio['location']['city'])}, {e(bio['location']['country'])}</p>
      </div>
      <div class="contact-card">
        <h3>Elsewhere</h3>
        {social_list()}
      </div>
    </div>
  </div>
</section>
"""
    ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Mohammad Albarham",
        "url": SITE_URL + "/",
        "image": SITE_URL + "/assets/img/profile-img-1200.jpg",
        "email": f"mailto:{EMAIL}",
        "jobTitle": bio["title"],
        "worksFor": {"@type": "Organization", "name": "Aptiv"},
        "alumniOf": {"@type": "CollegeOrUniversity",
                     "name": "Chalmers University of Technology"},
        "address": {"@type": "PostalAddress",
                    "addressLocality": bio["location"]["city"],
                    "addressCountry": bio["location"]["country"]},
        "sameAs": [url for url, _, _ in SOCIAL],
        "description": bio["summary"],
    }, indent=2)

    return shell(
        title="Mohammad Albarham — Computer Vision & AI Engineer",
        description=("Mohammad Albarham is a computer vision and AI engineer in Gothenburg: "
                     "advanced safety systems at Aptiv, an MSc from Chalmers, and published "
                     "research in cross-lingual retrieval and Arabic NLP."),
        canonical="/",
        body=body,
        head_extra=f'<script type="application/ld+json">{ld}</script>',
    )


def experience_sorted(experience: list) -> list:
    return sorted(experience, key=lambda j: j.get("startDate") or "", reverse=True)


def render_projects(d) -> str:
    projects = sorted(d["projects"], key=lambda p: (-(p.get("year") or 0), p["title"]))
    controls, grid = filter_block(projects, "all-projects")
    body = f"""
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">Projects</h1>
      <p class="lead">Every project on this site: {len(projects)} of them, from instance
         segmentation for urban streetscapes to a firefighting robot and a CNC machine
         built from scratch. Cards with a title link lead to a full write-up.</p>
    </div>
    {controls}
    {grid}
  </div>
</section>
"""
    return shell(
        title="Projects — Mohammad Albarham",
        description=(f"All {len(projects)} of Mohammad Albarham's projects across computer "
                     "vision, Arabic NLP, embedded systems and mechatronics."),
        canonical="/projects/",
        body=body,
        current="projects",
    )


def render_research(d) -> str:
    pubs = sorted(d["publications"], key=lambda p: (-p["year"], p["title"]))
    comps = sorted(d["competitions"], key=lambda c: c.get("date") or "", reverse=True)
    by_year: dict[int, list] = {}
    for pub in pubs:
        by_year.setdefault(pub["year"], []).append(pub)
    groups = "".join(
        f'<h2 class="section-title" style="margin-top:2.5rem">{year}</h2>'
        + "".join(publication(p, full=True) for p in items)
        for year, items in sorted(by_year.items(), reverse=True)
    )
    body = f"""
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">Research</h1>
      <p class="lead">{len(pubs)} publications on cross-lingual image retrieval, Arabic
         sign language recognition and Arabic NLP &mdash; with abstracts, DOIs and BibTeX
         for each. Competition results follow below.</p>
    </div>
    {groups}
  </div>
</section>

<section id="competitions" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Competitions</h2>
      <p>{len(comps)} contests, with the full write-ups on their own pages.</p>
    </div>
    <div class="card-grid">{''.join(award(c) for c in comps)}</div>
  </div>
</section>
"""
    ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Research — Mohammad Albarham",
        "url": SITE_URL + "/research/",
        "hasPart": [{
            "@type": "ScholarlyArticle",
            "headline": p["title"],
            "datePublished": str(p["year"]),
            "author": [{"@type": "Person", "name": a["name"]} for a in p["authors"]],
            **({"identifier": p["doi"]} if p.get("doi") else {}),
        } for p in pubs],
    }, indent=2)
    return shell(
        title="Research — Mohammad Albarham",
        description=(f"{len(pubs)} peer-reviewed publications and {len(comps)} competition "
                     "results from Mohammad Albarham, with abstracts and BibTeX."),
        canonical="/research/",
        body=body,
        current="research",
        head_extra=f'<script type="application/ld+json">{ld}</script>',
    )


def course_list(school: dict) -> str:
    courses = school.get("completedCourses") or []
    if not courses:
        return ""
    items = []
    for course in courses:
        label = e(course["name"])
        if course.get("url"):
            label = f'<a href="{e(course["url"])}" target="_blank" rel="noopener noreferrer">{label}</a>'
        extras = []
        if course.get("projectUrl"):
            extras.append(f'<a href="/{e(course["projectUrl"].lstrip("/"))}">project write-up</a>')
        for link in course.get("links") or []:
            extras.append(f'<a href="{e(link["url"])}" target="_blank" rel="noopener noreferrer">{e(link["label"])}</a>')
        suffix = f' <span class="meta">({" · ".join(extras)})</span>' if extras else ""
        code = f'<span class="meta">{e(course["code"])}</span> ' if course.get("code") else ""
        items.append(f"<li>{code}{label}{suffix}</li>")
    return f'<h4>Coursework</h4><ul class="course-list">{"".join(items)}</ul>'


def render_about(d) -> str:
    bio = d["bio"]

    schools = []
    for school in d["education"]:
        facts = []
        if school.get("gpa"):
            facts.append(f'GPA {e(school["gpa"])}')
        if school.get("rank"):
            facts.append(f'ranked {e(school["rank"])} in cohort')
        if school.get("accreditation"):
            facts.append(e(school["accreditation"]))
        if school.get("scholarship"):
            facts.append(e(school["scholarship"]))
        project = ""
        if school.get("graduationProject"):
            gp = school["graduationProject"]
            project = (f'<p><strong>Graduation project:</strong> '
                       f'<a href="{e(gp["url"])}" target="_blank" rel="noopener noreferrer">{e(gp["title"])}</a></p>')
        logo = picture(school["logo"], school["institution"], width=56, height=56) if school.get("logo") else ""
        schools.append(f"""<article class="cv-entry">
  <div class="cv-entry-head">
    {logo}
    <div>
      <h3>{e(school['degree'])}</h3>
      <p class="cv-org"><a href="{e(school.get('url') or '#')}" target="_blank" rel="noopener noreferrer">{e(school['institution'])}</a>
         &middot; {e(school['location'])}</p>
      <p class="meta">{span(school.get('startDate'), school.get('endDate'))}</p>
    </div>
  </div>
  <p>{e(school.get('focus') or '')}</p>
  {f'<p class="meta">{" · ".join(facts)}</p>' if facts else ''}
  {project}
  {course_list(school)}
</article>""")

    roles = []
    for job in experience_sorted(d["experience"]):
        logo = picture(job["logo"], job["company"], width=56, height=56) if job.get("logo") else ""
        duties = "".join(f"<li>{e(r)}</li>" for r in job.get("responsibilities") or [])
        supervisors = ""
        if job.get("supervisors"):
            names = ", ".join(
                f'<a href="{e(s["url"])}" target="_blank" rel="noopener noreferrer">{e(s["name"])}</a>'
                for s in job["supervisors"])
            supervisors = f'<p class="meta">Supervised by {names}</p>'
        more = ""
        if details_href(job):
            more = f'<p><a class="btn btn-sm" href="{e(details_href(job))}">Read the full write-up</a></p>'
        org = e(job["company"])
        if job.get("url"):
            org = f'<a href="{e(job["url"])}" target="_blank" rel="noopener noreferrer">{org}</a>'
        roles.append(f"""<article class="cv-entry">
  <div class="cv-entry-head">
    {logo}
    <div>
      <h3>{e(job['position'])}</h3>
      <p class="cv-org">{org} &middot; {e(job['location'])} &middot; {e(job['type'])}</p>
      <p class="meta">{span(job.get('startDate'), job.get('endDate'))}</p>
    </div>
  </div>
  <p>{e(job.get('description') or '')}</p>
  {f'<ul>{duties}</ul>' if duties else ''}
  {supervisors}
  {tags(job.get('technologies'))}
  {more}
</article>""")

    body = f"""
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">About &amp; CV</h1>
    </div>
    <div class="cv-intro">
      {picture('assets/img/profile-img-1200.jpg', 'Mohammad Albarham', cls='cv-portrait', width=1200, height=1200, sizes='(max-width: 48rem) 100vw, 16rem')}
      <div>
        <p class="lead">{e(bio['summary'])}</p>
        <p>{e(bio['tagline'])}</p>
        <p><a href="mailto:{e(EMAIL)}">{e(EMAIL)}</a> &middot; {e(bio['location']['city'])}, {e(bio['location']['country'])}</p>
        {social_list()}
      </div>
    </div>
  </div>
</section>

<section id="education" class="section">
  <div class="wrap">
    <h2 class="section-title">Education</h2>
    {''.join(schools)}
  </div>
</section>

<section id="experience" class="section">
  <div class="wrap">
    <h2 class="section-title">Experience</h2>
    {''.join(roles)}
  </div>
</section>

<section id="service" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Volunteering &amp; service</h2>
      <p>Every IEEE role, from the University of Jordan student branch through to the
         Sweden Section and Region 8.</p>
    </div>
    {''.join(service_row(v) for v in d['volunteering'])}
    <p style="margin-top:2rem"><a class="btn" href="/volunteering/volunteering_ieee.html">
      <i class="bi bi-images" aria-hidden="true"></i> IEEE photo gallery</a></p>
  </div>
</section>

<section id="languages" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Programming languages</h2>
    </div>
    {language_chart(d['languages'])}
  </div>
</section>
"""
    return shell(
        title="About & CV — Mohammad Albarham",
        description=("The full CV of Mohammad Albarham: MSc from Chalmers, BSc from the "
                     "University of Jordan, eight engineering and research roles, and "
                     "seven IEEE volunteer posts."),
        canonical="/about/",
        body=body,
        current="about",
    )


# --- sitemap ---------------------------------------------------------------

GENERATED = ["index.html", "projects/index.html", "research/index.html", "about/index.html"]
LEGACY_DIRS = ["projects", "competitions", "experience", "volunteering"]
NOT_INDEXED = {"googleebff4c42c46c6acf.html"}


def site_routes() -> list[str]:
    """Every indexable HTML route that exists on disk, newest sections first.

    Built by looking at the filesystem rather than from a hand-kept list, which
    is how the previous sitemap came to be missing 14 live pages.
    """
    routes = ["/"]
    for page in GENERATED[1:]:
        routes.append("/" + page.replace("index.html", ""))
    for directory in LEGACY_DIRS:
        for path in sorted((ROOT / directory).glob("*.html")):
            if path.name == "index.html" or path.name in NOT_INDEXED:
                continue
            routes.append(f"/{directory}/{path.name}")
    return routes


def render_sitemap() -> str:
    today = date.today().isoformat()
    urls = "".join(
        f"  <url>\n    <loc>{SITE_URL}{route}</loc>\n"
        f"    <lastmod>{today}</lastmod>\n"
        f"    <priority>{'1.0' if route == '/' else '0.8' if route.count('/') == 2 and route.endswith('/') else '0.6'}</priority>\n"
        f"  </url>\n"
        for route in site_routes()
    )
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n'.replace(
                "www.sitemap.org", "www.sitemaps.org")
            + urls + "</urlset>\n")


# --- entry point -----------------------------------------------------------

def build(out: Path | None = None) -> list[str]:
    out = out or ROOT
    d = {
        "bio": load("bio"),
        "projects": load("projects"),
        "experience": load("experience"),
        "education": load("education"),
        "publications": load("publications"),
        "competitions": load("competitions"),
        "volunteering": load("volunteering"),
        "travel": load("travel"),
        "languages": load("programming-languages"),
    }
    pages = {
        "index.html": render_home(d),
        "projects/index.html": render_projects(d),
        "research/index.html": render_research(d),
        "about/index.html": render_about(d),
        "sitemap.xml": render_sitemap(),
    }
    written = []
    for name, content in pages.items():
        target = out / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        written.append(name)
    return written


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", type=Path, default=None,
                        help="write into this directory instead of the repository root")
    args = parser.parse_args()
    for name in build(args.out):
        print(f"  rendered  {name}")
