#!/usr/bin/env python3
"""Render the static site from data/*.json.

Python standard library only: no npm, no framework, nothing to install. Run it
through scripts/build.sh rather than directly, so the CSS/JS bundles and the
sitemap stay in step with the pages.

Pages produced:
    index.html              the front door: who I am, news, and a card per section
    about/index.html        the bio, what I work on, and the language breakdown
    experience/index.html   professional experience, in full
    education/index.html    education and coursework, in full
    resume/index.html       redirect to experience / education
    projects/index.html     every project, with a technology filter
    research/index.html     every publication, in full
    competitions/index.html every competition and contest result, with write-ups
    volunteering/index.html IEEE service and the travel map
    contact/index.html      how to reach me
    sitemap.xml             generated from the routes that actually exist on disk

One section, one page. The homepage keeps every legacy `#anchor` as a link to
the page that section now lives on, and LEGACY_HASHES forwards old deep links.

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


def when(start: str | None, end: str | None, location: str, current: bool = False) -> str:
    """The date / place line under a timeline entry's title."""
    now = '<span class="cv-now">Current</span>' if current else ""
    return (f'<p class="cv-when">'
            f'<span class="meta"><i class="bi bi-calendar3" aria-hidden="true"></i> {span(start, end)}</span>'
            f'<span class="meta"><i class="bi bi-geo-alt" aria-hidden="true"></i> {e(location)}</span>'
            f'{now}</p>')


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
    "pdf": ("bi-file-earmark-pdf", "PDF"),
    "doi": ("bi-link-45deg", "DOI"),
    "dataset": ("bi-database", "Dataset"),
    "ieeeDataport": ("bi-database", "IEEE DataPort"),
    "languageModel": ("bi-boxes", "Language model"),
    "asrModel": ("bi-mic", "ASR model"),
    "twitterDataset": ("bi-database", "Tweets dataset"),
    "demo": ("bi-play-circle", "Demo"),
    "paper": ("bi-file-earmark-text", "Paper"),
    "report": ("bi-file-earmark-text", "Report"),
    "poster": ("bi-easel", "Poster"),
    "huggingface": ("bi-box", "Hugging Face"),
    "kaggle": ("bi-bar-chart", "Kaggle"),
    "roboflow": ("bi-bounding-box", "Roboflow"),
    "details": ("bi-arrow-right-circle", "Learn More"),
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
    # (url, label, brand, icon). `brand` picks the .social-<brand> colours in
    # 03-chrome.css. Monochrome marks are the official ones from Simple Icons
    # and inherit `fill: currentColor`; Hugging Face keeps its full-colour logo.
    ("https://www.linkedin.com/in/albarham/", "LinkedIn", "linkedin",
     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'),
    ("https://github.com/mohammad-albarham", "GitHub", "github",
     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>'),
    ("https://x.com/m_albarham", "X (Twitter)", "x",
     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>'),
    ("https://scholar.google.com/citations?user=3znRUJoAAAAJ&hl=en", "Google Scholar", "scholar",
     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>'),
    ("https://huggingface.co/pain", "Hugging Face", "huggingface",
     '<svg class="social-color" viewBox="0 0 95 88" aria-hidden="true">'
     '<path fill="#FFD21E" d="M47.21 76.5a34.75 34.75 0 1 0 0-69.5 34.75 34.75 0 0 0 0 69.5Z"/><path fill="#FF9D0B" d="M81.96 41.75a34.75 34.75 0 1 0-69.5 0 34.75 34.75 0 0 0 69.5 0Zm-73.5 0a38.75 38.75 0 1 1 77.5 0 38.75 38.75 0 0 1-77.5 0Z"/><path fill="#3A3B45" d="M58.5 32.3c1.28.44 1.78 3.06 3.07 2.38a5 5 0 1 0-6.76-2.07c.61 1.15 2.55-.72 3.7-.32ZM34.95 32.3c-1.28.44-1.79 3.06-3.07 2.38a5 5 0 1 1 6.76-2.07c-.61 1.15-2.56-.72-3.7-.32Z"/><path fill="#FF323D" d="M46.96 56.29c9.83 0 13-8.76 13-13.26 0-2.34-1.57-1.6-4.09-.36-2.33 1.15-5.46 2.74-8.9 2.74-7.19 0-13-6.88-13-2.38s3.16 13.26 13 13.26Z"/><path fill="#3A3B45" fill-rule="evenodd" d="M39.43 54a8.7 8.7 0 0 1 5.3-4.49c.4-.12.81.57 1.24 1.28.4.68.82 1.37 1.24 1.37.45 0 .9-.68 1.33-1.35.45-.7.89-1.38 1.32-1.25a8.61 8.61 0 0 1 5 4.17c3.73-2.94 5.1-7.74 5.1-10.7 0-2.34-1.57-1.6-4.09-.36l-.14.07c-2.31 1.15-5.39 2.67-8.77 2.67s-6.45-1.52-8.77-2.67c-2.6-1.29-4.23-2.1-4.23.29 0 3.05 1.46 8.06 5.47 10.97Z" clip-rule="evenodd"/><path fill="#FF9D0B" d="M70.71 37a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM24.21 37a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM17.52 48c-1.62 0-3.06.66-4.07 1.87a5.97 5.97 0 0 0-1.33 3.76 7.1 7.1 0 0 0-1.94-.3c-1.55 0-2.95.59-3.94 1.66a5.8 5.8 0 0 0-.8 7 5.3 5.3 0 0 0-1.79 2.82c-.24.9-.48 2.8.8 4.74a5.22 5.22 0 0 0-.37 5.02c1.02 2.32 3.57 4.14 8.52 6.1 3.07 1.22 5.89 2 5.91 2.01a44.33 44.33 0 0 0 10.93 1.6c5.86 0 10.05-1.8 12.46-5.34 3.88-5.69 3.33-10.9-1.7-15.92-2.77-2.78-4.62-6.87-5-7.77-.78-2.66-2.84-5.62-6.25-5.62a5.7 5.7 0 0 0-4.6 2.46c-1-1.26-1.98-2.25-2.86-2.82A7.4 7.4 0 0 0 17.52 48Zm0 4c.51 0 1.14.22 1.82.65 2.14 1.36 6.25 8.43 7.76 11.18.5.92 1.37 1.31 2.14 1.31 1.55 0 2.75-1.53.15-3.48-3.92-2.93-2.55-7.72-.68-8.01.08-.02.17-.02.24-.02 1.7 0 2.45 2.93 2.45 2.93s2.2 5.52 5.98 9.3c3.77 3.77 3.97 6.8 1.22 10.83-1.88 2.75-5.47 3.58-9.16 3.58-3.81 0-7.73-.9-9.92-1.46-.11-.03-13.45-3.8-11.76-7 .28-.54.75-.76 1.34-.76 2.38 0 6.7 3.54 8.57 3.54.41 0 .7-.17.83-.6.79-2.85-12.06-4.05-10.98-8.17.2-.73.71-1.02 1.44-1.02 3.14 0 10.2 5.53 11.68 5.53.11 0 .2-.03.24-.1.74-1.2.33-2.04-4.9-5.2-5.21-3.16-8.88-5.06-6.8-7.33.24-.26.58-.38 1-.38 3.17 0 10.66 6.82 10.66 6.82s2.02 2.1 3.25 2.1c.28 0 .52-.1.68-.38.86-1.46-8.06-8.22-8.56-11.01-.34-1.9.24-2.85 1.31-2.85Z"/><path fill="#FFD21E" d="M38.6 76.69c2.75-4.04 2.55-7.07-1.22-10.84-3.78-3.77-5.98-9.3-5.98-9.3s-.82-3.2-2.69-2.9c-1.87.3-3.24 5.08.68 8.01 3.91 2.93-.78 4.92-2.29 2.17-1.5-2.75-5.62-9.82-7.76-11.18-2.13-1.35-3.63-.6-3.13 2.2.5 2.79 9.43 9.55 8.56 11-.87 1.47-3.93-1.71-3.93-1.71s-9.57-8.71-11.66-6.44c-2.08 2.27 1.59 4.17 6.8 7.33 5.23 3.16 5.64 4 4.9 5.2-.75 1.2-12.28-8.53-13.36-4.4-1.08 4.11 11.77 5.3 10.98 8.15-.8 2.85-9.06-5.38-10.74-2.18-1.7 3.21 11.65 6.98 11.76 7.01 4.3 1.12 15.25 3.49 19.08-2.12Z"/><path fill="#FF9D0B" d="M77.4 48c1.62 0 3.07.66 4.07 1.87a5.97 5.97 0 0 1 1.33 3.76 7.1 7.1 0 0 1 1.95-.3c1.55 0 2.95.59 3.94 1.66a5.8 5.8 0 0 1 .8 7 5.3 5.3 0 0 1 1.78 2.82c.24.9.48 2.8-.8 4.74a5.22 5.22 0 0 1 .37 5.02c-1.02 2.32-3.57 4.14-8.51 6.1-3.08 1.22-5.9 2-5.92 2.01a44.33 44.33 0 0 1-10.93 1.6c-5.86 0-10.05-1.8-12.46-5.34-3.88-5.69-3.33-10.9 1.7-15.92 2.78-2.78 4.63-6.87 5.01-7.77.78-2.66 2.83-5.62 6.24-5.62a5.7 5.7 0 0 1 4.6 2.46c1-1.26 1.98-2.25 2.87-2.82A7.4 7.4 0 0 1 77.4 48Zm0 4c-.51 0-1.13.22-1.82.65-2.13 1.36-6.25 8.43-7.76 11.18a2.43 2.43 0 0 1-2.14 1.31c-1.54 0-2.75-1.53-.14-3.48 3.91-2.93 2.54-7.72.67-8.01a1.54 1.54 0 0 0-.24-.02c-1.7 0-2.45 2.93-2.45 2.93s-2.2 5.52-5.97 9.3c-3.78 3.77-3.98 6.8-1.22 10.83 1.87 2.75 5.47 3.58 9.15 3.58 3.82 0 7.73-.9 9.93-1.46.1-.03 13.45-3.8 11.76-7-.29-.54-.75-.76-1.34-.76-2.38 0-6.71 3.54-8.57 3.54-.42 0-.71-.17-.83-.6-.8-2.85 12.05-4.05 10.97-8.17-.19-.73-.7-1.02-1.44-1.02-3.14 0-10.2 5.53-11.68 5.53-.1 0-.19-.03-.23-.1-.74-1.2-.34-2.04 4.88-5.2 5.23-3.16 8.9-5.06 6.8-7.33-.23-.26-.57-.38-.98-.38-3.18 0-10.67 6.82-10.67 6.82s-2.02 2.1-3.24 2.1a.74.74 0 0 1-.68-.38c-.87-1.46 8.05-8.22 8.55-11.01.34-1.9-.24-2.85-1.31-2.85Z"/><path fill="#FFD21E" d="M56.33 76.69c-2.75-4.04-2.56-7.07 1.22-10.84 3.77-3.77 5.97-9.3 5.97-9.3s.82-3.2 2.7-2.9c1.86.3 3.23 5.08-.68 8.01-3.92 2.93.78 4.92 2.28 2.17 1.51-2.75 5.63-9.82 7.76-11.18 2.13-1.35 3.64-.6 3.13 2.2-.5 2.79-9.42 9.55-8.55 11 .86 1.47 3.92-1.71 3.92-1.71s9.58-8.71 11.66-6.44c2.08 2.27-1.58 4.17-6.8 7.33-5.23 3.16-5.63 4-4.9 5.2.75 1.2 12.28-8.53 13.36-4.4 1.08 4.11-11.76 5.3-10.97 8.15.8 2.85 9.05-5.38 10.74-2.18 1.69 3.21-11.65 6.98-11.76 7.01-4.31 1.12-15.26 3.49-19.08-2.12Z"/>'
     '</svg>'),
]

NAV = [
    ("/", "Home", "home"),
    ("/about/", "About", "about"),
    ("/experience/", "Experience", "experience"),
    ("/education/", "Education", "education"),
    ("/projects/", "Projects", "projects"),
    ("/research/", "Research", "research"),
    ("/competitions/", "Competitions", "competitions"),
    ("/volunteering/", "Volunteering", "volunteering"),
    ("/contact/", "Contact", "contact"),
]

EMAIL = "mohammad.albarham.work@gmail.com"


def social_list(cls: str = "social") -> str:
    lis = "".join(
        f'<li><a class="social-{brand}" href="{e(url)}" aria-label="{e(label)}" target="_blank" rel="noopener noreferrer">{icon}</a></li>'
        for url, label, brand, icon in SOCIAL
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

<link rel="icon" href="/assets/img/favicon.png?v=2">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png?v=2">

<link rel="preload" href="/assets/fonts/nunito-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/nunito-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/assets/vendor/bootstrap-icons/bootstrap-icons.min.css">
<link rel="stylesheet" href="/assets/css/site.css">

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
          <li><a href="/about/">About</a></li>
          <li><a href="/experience/">Experience</a></li>
          <li><a href="/education/">Education</a></li>
          <li><a href="/projects/">Projects</a></li>
          <li><a href="/research/">Research</a></li>
          <li><a href="/competitions/">Competitions</a></li>
          <li><a href="/volunteering/">Volunteering</a></li>
          <li><a href="/contact/">Contact</a></li>
        </ul>
      </div>
      <div>
        <h2>Sections</h2>
        <ul>
          <li><a href="/experience/">Experience</a></li>
          <li><a href="/education/">Education</a></li>
          <li><a href="/research/#publications">Publications</a></li>
          <li><a href="/competitions/">Competitions</a></li>
          <li><a href="/about/#programming-languages">Programming languages</a></li>
          <li><a href="/volunteering/#travel">Travel</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; {year} Mohammad Albarham</span>
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
    links = dict(project.get("links") or {})
    if not links and project.get("detailsPage"):
        links["details"] = project["detailsPage"]
    return f"""<article class="work-card" data-tech="{e(techs)}">
  {image}
  <div class="work-card-body">
    {f'<p class="meta">{e(year)}</p>' if year else ''}
    <h3>{heading}</h3>
    <p>{e(project.get('shortDescription') or project.get('description') or '')}</p>
    {tags(project.get('technologies'), limit=4)}
    {link_row(links)}
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


# Everything a paper can point at, in the order the buttons should read.
PUB_LINKS = ["url", "pdfUrl", "doi", "github", "huggingface", "kaggle", "roboflow",
             "ieeeDataport", "languageModel", "asrModel", "twitterDataset"]
PUB_LINK_KEYS = {"url": "paper", "pdfUrl": "pdf", "huggingface": "huggingface"}
TYPE_LABELS = {"journal": "Journal", "conference": "Conference",
               "workshop": "Workshop", "preprint": "Preprint"}


def pub_authors(pub: dict) -> str:
    return ", ".join(
        f'<span class="me">{e(a["name"])}</span>' if a.get("isMe") else e(a["name"])
        for a in pub.get("authors") or []
    )


def pub_where(pub: dict) -> str:
    where = pub.get("venue") or ""
    if pub.get("volume"):
        where += f", vol. {pub['volume']}"
    if pub.get("pages"):
        where += f", p. {pub['pages']}"
    return where


def publication(pub: dict, *, full: bool) -> str:
    """One paper. `full` adds the abstract, the keywords and the BibTeX; the
    compact form is for the featured strip, where the same paper appears
    again further down the page."""
    links = {PUB_LINK_KEYS.get(key, key): pub[key] for key in PUB_LINKS if pub.get(key)}
    star = ('<span class="pub-featured"><i class="bi bi-star-fill" aria-hidden="true"></i> Featured</span>'
            if pub.get("featured") else "")
    title = e(pub["title"])
    if pub.get("url"):
        title = f'<a href="{e(pub["url"])}" target="_blank" rel="noopener noreferrer">{title}</a>'

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
        extra = abstract + tags(pub.get("keywords")) + bibtex

    cls = "pub" if full else "pub pub-compact"
    return f"""<article class="{cls}" data-tech="{e(pub.get('type'))}" data-year="{e(pub.get('year'))}">
  <div class="pub-head">
    <span class="meta">{e(pub.get('year'))}</span>
    <span class="pub-badge">{e(pub.get('venueShort') or pub.get('type'))}</span>
    {star}
  </div>
  <h3>{title}</h3>
  <p class="pub-authors">{pub_authors(pub)}</p>
  <p class="pub-venue">{e(pub_where(pub))}</p>
  {link_row(links, cls="pub-links")}
  {extra}
</article>"""


# Only the placings the record actually holds. A first place would want its
# own gold pair in 01-tokens.css.
MEDALS = {2: ("silver", "2nd"), 3: ("bronze", "3rd")}


def prizes(comp: dict) -> list:
    """`award` is a string on some records and a list of strings on others."""
    prize = comp.get("award") or []
    return [prize] if isinstance(prize, str) else list(prize)


def award(comp: dict) -> str:
    """One competition: the placing, the photo, and everything the record
    carries underneath it — every distinction, the highlights, and the links."""
    href = details_href(comp)
    title = e(comp["title"])
    heading = f'<a href="{e(href)}">{title}</a>' if href else title

    rank = comp.get("rank")
    metal, ordinal = MEDALS.get(rank, ("plain", ""))
    if rank:
        badge = (f'<span class="award-rank"><span aria-hidden="true">{e(rank)}</span>'
                 f'<span class="visually-hidden">{e(ordinal)} place</span></span>')
    else:
        badge = ('<span class="award-rank"><i class="bi bi-trophy" aria-hidden="true"></i>'
                 '<span class="visually-hidden">Awarded</span></span>')
    chips = "".join(f"<li>{e(p)}</li>" for p in prizes(comp))

    image = ""
    if comp.get("image"):
        image = picture(comp["image"], comp["title"], sizes="(max-width: 40rem) 100vw, 20rem")
        if href:
            image = f'<a href="{e(href)}" tabindex="-1" aria-hidden="true">{image}</a>'

    highlights = comp.get("highlights") or []
    more = ""
    if highlights:
        items = "".join(f"<li>{e(h)}</li>" for h in highlights)
        more = f"""<details class="award-more">
  <summary><i class="bi bi-list-ul" aria-hidden="true"></i> {len(highlights)} highlights</summary>
  <ul>{items}</ul>
</details>"""

    links = {**({"details": href} if href else {}), **(comp.get("links") or {})}
    where = ""
    if comp.get("location"):
        where = f'<span class="meta"><i class="bi bi-geo-alt" aria-hidden="true"></i> {e(comp["location"])}</span>'

    return f"""<article class="award-card award-{metal}">
  {image}
  <div class="award-body">
    <div class="award-head">
      {badge}
      <ul class="award-prizes">{chips}</ul>
    </div>
    <h3>{heading}</h3>
    <p class="award-when">
      <span class="meta"><i class="bi bi-calendar3" aria-hidden="true"></i> {month(comp.get('date'))}</span>
      {where}
    </p>
    <p class="award-org">{e(comp.get('organizer'))}</p>
    <p>{e(comp.get('shortDescription') or comp.get('description') or '')}</p>
    {tags(comp.get('technologies'), limit=4)}
    {more}
    {link_row(links, cls="award-links")}
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
</div>"""


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

def news_date(value: str) -> str:
    """News entries carry a day, unlike the month-precision dates elsewhere."""
    stamp = datetime.strptime(value, "%Y-%m-%d")
    return f"{stamp.day} {MONTHS[stamp.month]} {stamp.year}"


def news_block(items: list) -> str:
    """The news feed. Empty until data/news.json has entries — an honest empty
    state beats a fake placeholder post."""
    if not items:
        return """<p class="news-empty">No news yet. New papers, releases and talks
       will be posted here.</p>"""
    entries = []
    for item in items:
        link = item.get("url")
        title = e(item["title"])
        if link:
            external = link.startswith("http")
            rel = ' target="_blank" rel="noopener noreferrer"' if external else ""
            title = f'<a href="{e(link)}"{rel}>{title}</a>'
        body = f'<p>{e(item["body"])}</p>' if item.get("body") else ""
        entries.append(f"""<li class="news-item">
  <p class="meta"><time datetime="{e(item['date'])}">{news_date(item['date'])}</time></p>
  <h3>{title}</h3>
  {body}
</li>""")
    return f'<ul class="news-list">{"".join(entries)}</ul>'


# Old deep links (/#travel and friends) used to land on a section of the one-page
# homepage. Each section now has a page of its own, so the homepage forwards them
# instead of leaving a visitor on a page that no longer holds that content.
LEGACY_HASHES = {
    "about": "/about/",
    "programming-languages": "/about/#programming-languages",
    "resume": "/experience/",
    "experience": "/experience/",
    "education": "/education/",
    "projects": "/projects/",
    "publications": "/research/",
    "competitions": "/competitions/",
    "volunteering": "/volunteering/",
    "travel": "/volunteering/#travel",
    "contact": "/contact/",
}


def render_home(d) -> str:
    bio, projects, pubs, comps, vols = d["bio"], d["projects"], d["publications"], d["competitions"], d["volunteering"]
    featured = [p for p in projects if p.get("featured")]
    unique_countries = len({c for codes in d["travel"]["visited"].values() for c in codes})
    venues = len({p.get("venueShort") or p.get("venue") for p in pubs})

    body = f"""
<section id="hero" class="hero">
  <div class="wrap hero-grid">
    <div class="rise">
      <p class="hero-where"><i class="bi bi-geo-alt" aria-hidden="true"></i> {e(bio['location']['city'])}, {e(bio['location']['country'])}</p>
      <h1 class="display">Mohammad<br>Albarham</h1>
      <p class="hero-role">{e(bio['title'])}</p>
      <p class="lead">I am working as an Associate Software Engineer with a focus on vision
         and perception systems at Aptiv. In my free time, I like to contribute to open-source
         projects and create cool, useful tools.</p>
      {social_list()}
    </div>
    <div class="hero-portrait rise rise-2">
      {picture('assets/img/profile-img-hero.jpg', 'Mohammad Albarham', width=768, height=960, eager=True, sizes='(max-width: 60rem) 100vw, 24rem')}
    </div>
  </div>
</section>

<section id="news" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">News</h2>
    </div>
    {news_block(d['news'])}
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="doorways">
      <a class="doorway doorway-about rise rise-2" id="about" href="/about/">
        <h2>About <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>Who I am, what I work on, and the languages my public repositories are written in.</p>
        <p class="meta">language breakdown</p>
      </a>
      <a class="doorway doorway-cv rise rise-2" id="resume" href="/experience/">
        <span id="experience" hidden></span>
        <h2>Experience <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>Roles and responsibilities from a mechatronics bench in Amman to vision systems in Gothenburg.</p>
        <p class="meta">{len(d['experience'])} roles &middot; Aptiv, RISE, Kenda AI</p>
      </a>
      <a class="doorway doorway-work rise rise-2" id="projects" href="/projects/">
        <h2>Projects <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>Computer vision, Arabic NLP, embedded systems and the tools built along the way.</p>
        <p class="meta">{len(projects)} projects &middot; {len(featured)} featured</p>
      </a>
      <a class="doorway doorway-research rise rise-3" id="publications" href="/research/">
        <h2>Research <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>Peer-reviewed papers on cross-lingual retrieval, Arabic sign language and Arabic NLP.</p>
        <p class="meta">{len(pubs)} publications &middot; {venues} venues</p>
      </a>
      <a class="doorway doorway-service rise rise-3" id="volunteering" href="/volunteering/">
        <h2>Volunteering <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>IEEE service across a student branch, two sections and Region 8 &mdash; and the countries it took me to.</p>
        <p class="meta">{len(vols)} posts &middot; {unique_countries} countries</p>
      </a>
      <a class="doorway doorway-contact rise rise-3" id="contact" href="/contact/">
        <h2>Contact <span class="arrow" aria-hidden="true">&rarr;</span></h2>
        <p>Email, where I am, and every profile worth following.</p>
        <p class="meta">{len(SOCIAL)} profiles &middot; no contact form</p>
      </a>
    </div>
    <p class="doorway-more">Also here:
      <a id="education" href="/education/">education</a> &middot;
      <a id="programming-languages" href="/about/#programming-languages">programming languages</a> &middot;
      <a id="competitions" href="/competitions/">competitions</a> &middot;
      <a id="travel" href="/volunteering/#travel">travel</a></p>
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
        "sameAs": [url for url, *_ in SOCIAL],
        "description": bio["summary"],
    }, indent=2)

    return shell(
        title="Mohammad Albarham",
        description=("Mohammad Albarham is a computer vision and AI engineer in Gothenburg: "
                     "advanced safety systems at Aptiv, an MSc from Chalmers, and published "
                     "research in cross-lingual retrieval and Arabic NLP."),
        canonical="/",
        body=body,
        current="home",
        head_extra=f'<script type="application/ld+json">{ld}</script>',
        body_end=('<script>\n'
                  '// Forward the one-page site\'s old section links to the page that\n'
                  '// section now lives on, on load and on a later hash change.\n'
                  '(function () {\n'
                  f'  var moved = {json.dumps(LEGACY_HASHES, separators=(",", ":"))};\n'
                  '  function go() {\n'
                  '    var to = moved[location.hash.slice(1)];\n'
                  '    if (to) location.replace(to);\n'
                  '  }\n'
                  '  go();\n'
                  '  window.addEventListener(\'hashchange\', go);\n'
                  '})();\n'
                  '</script>'),
    )


def experience_sorted(experience: list) -> list:
    return sorted(experience, key=lambda j: j.get("startDate") or "", reverse=True)


def render_projects(d) -> str:
    projects = sorted(d["projects"], key=lambda p: (-(p.get("year") or 0), p["title"]))
    open_source = [p for p in projects if p.get("openSource")]
    controls, grid = filter_block([p for p in projects if not p.get("openSource")], "all-projects")
    body = f"""
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">Projects</h1>
    </div>
    <h2 class="section-title title-with-icon">
      <span class="title-icon title-icon-research"><i class="bi bi-github" aria-hidden="true"></i></span>
      Open Source Projects</h2>
    <div class="card-grid" id="open-source-projects">{"".join(work_card(p) for p in open_source)}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <h2 class="section-title">Other projects</h2>
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


def pub_filters(pubs: list) -> str:
    """One chip per publication type, plus All. The count rides on the chip so
    you know what a filter costs before you press it."""
    counts: dict[str, int] = {}
    for pub in pubs:
        counts[pub["type"]] = counts.get(pub["type"], 0) + 1
    order = [t for t in TYPE_LABELS if t in counts] + sorted(set(counts) - set(TYPE_LABELS))
    chips = ['<li><button type="button" class="filter-chip" data-tech-value="all" '
             'aria-pressed="true">All papers</button></li>']
    chips += [f'<li><button type="button" class="filter-chip" data-tech-value="{e(t)}" '
              f'aria-pressed="false">{e(TYPE_LABELS.get(t, t.capitalize()))} '
              f'<span aria-hidden="true">{counts[t]}</span></button></li>'
              for t in order]
    return f"""<div data-filter-group="all-publications" data-filter-status="publications-status"
     data-filter-noun="papers" data-filter-section=".year-group">
  <ul class="filters" role="group" aria-label="Filter publications by type">{''.join(chips)}</ul>
</div>
<p class="filter-status" id="publications-status" role="status" aria-live="polite"></p>"""


def render_research(d) -> str:
    pubs = sorted(d["publications"], key=lambda p: (-p["year"], p["title"]))
    featured = [p for p in pubs if p.get("featured")]
    venues = len({p.get("venueShort") or p.get("venue") for p in pubs})

    by_year: dict[int, list] = {}
    for pub in pubs:
        by_year.setdefault(pub["year"], []).append(pub)
    groups = "".join(
        f'<section class="year-group"><h2 class="year-head">{year}'
        f'<span class="meta">{len(items)} paper{"" if len(items) == 1 else "s"}</span></h2>'
        + "".join(publication(p, full=True) for p in items)
        + "</section>"
        for year, items in sorted(by_year.items(), reverse=True)
    )

    featured_block = ""
    if featured:
        featured_block = f"""
<section id="featured" class="section">
  <div class="wrap">
    <h2 class="section-title title-with-icon">
      <span class="title-icon title-icon-featured"><i class="bi bi-star-fill" aria-hidden="true"></i></span>
      Featured</h2>
    <p class="section-note">The {len(featured)} I would hand someone first. Each one appears
       again below with its abstract and BibTeX.</p>
    <div class="pub-featured-strip">{''.join(publication(p, full=False) for p in featured)}</div>
  </div>
</section>"""

    body = f"""
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">Research</h1>
      <p class="lead">{len(pubs)} publications on cross-lingual image retrieval, Arabic
         sign language recognition and Arabic NLP &mdash; with abstracts, DOIs and BibTeX
         for each.</p>
      <p class="section-note" style="margin-top:0.75rem">Looking for competition and contest results? <a href="/competitions/">See Competitions &rarr;</a></p>
    </div>
    <dl class="stat-row">
      <div><dt>Publications</dt><dd>{len(pubs)}</dd></div>
      <div><dt>Venues</dt><dd>{venues}</dd></div>
      <div><dt>Years</dt><dd>{min(by_year)}&ndash;{max(by_year)}</dd></div>
      <div><dt>Featured</dt><dd>{len(featured)}</dd></div>
    </dl>
  </div>
</section>
{featured_block}

<section id="publications" class="section">
  <div class="wrap">
    <h2 class="section-title title-with-icon">
      <span class="title-icon title-icon-research"><i class="bi bi-journal-text" aria-hidden="true"></i></span>
      Publications</h2>
    {pub_filters(pubs)}
    <div id="all-publications">{groups}</div>
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
        description=(f"{len(pubs)} peer-reviewed publications from Mohammad Albarham on "
                     "cross-lingual image retrieval and Arabic NLP, with abstracts and BibTeX."),
        canonical="/research/",
        body=body,
        current="research",
        head_extra=f'<script type="application/ld+json">{ld}</script>',
        body_end=('<script>\n'
                  'if (location.hash === "#competitions" || location.hash === "#contests") {\n'
                  '  location.replace("/competitions/");\n'
                  '}\n'
                  '</script>'),
    )


def render_competitions(d) -> str:
    comps = sorted(d["competitions"], key=lambda c: c.get("date") or "", reverse=True)
    podiums = sum(1 for c in comps if (c.get("rank") or 99) <= 3)
    distinctions = sum(len(prizes(c)) for c in comps)
    comp_years = sorted((c["date"] or "")[:4] for c in comps if c.get("date"))
    comp_years = f"{comp_years[0]}&ndash;{comp_years[-1]}" if comp_years else ""

    body = f"""
<section id="competitions" class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">Competitions</h1>
      <p class="lead">Kaggle leaderboards, ICPC problem sets and firefighting robot
         arenas &mdash; {len(comps)} competitive engineering challenges, with full write-ups and photos.</p>
    </div>
    <dl class="stat-row">
      <div><dt>Contests</dt><dd>{len(comps)}</dd></div>
      <div><dt>Podium finishes</dt><dd>{podiums}</dd></div>
      <div><dt>Distinctions</dt><dd>{distinctions}</dd></div>
      <div><dt>Years</dt><dd>{comp_years}</dd></div>
    </dl>
    <div class="card-grid">{''.join(award(c) for c in comps)}</div>
  </div>
</section>
"""
    ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Competitions — Mohammad Albarham",
        "url": SITE_URL + "/competitions/",
        "description": (f"{len(comps)} competition results from Mohammad Albarham across "
                        "Kaggle, robotics and algorithmic challenges."),
    }, indent=2)
    return shell(
        title="Competitions — Mohammad Albarham",
        description=(f"{len(comps)} competition and contest results from Mohammad Albarham, "
                     f"with {podiums} podium finishes across Kaggle, robotics and algorithmic contests."),
        canonical="/competitions/",
        body=body,
        current="competitions",
        head_extra=f'<script type="application/ld+json">{ld}</script>',
    )


def render_contests_redirect() -> str:
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Competitions — Mohammad Albarham</title>
<link rel="canonical" href="https://mohammad-albarham.github.io/competitions/">
<meta http-equiv="refresh" content="0; url=/competitions/">
<script>location.replace("/competitions/");</script>
</head>
<body>
<p>Redirecting to <a href="/competitions/">Competitions</a>...</p>
</body>
</html>
"""


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
            extras.append(f'<a class="btn btn-sm" href="/{e(course["projectUrl"].lstrip("/"))}">View related project</a>')
        for link in course.get("links") or []:
            extras.append(f'<a class="btn btn-sm" href="{e(link["url"])}" target="_blank" rel="noopener noreferrer">{e(link["label"])}</a>')
        suffix = f'<p class="course-links">{"".join(extras)}</p>' if extras else ""
        code = f'<span class="meta">{e(course["code"])}</span> ' if course.get("code") else ""
        items.append(f"<li>{code}{label}{suffix}</li>")
    return f'<h4>Coursework</h4><ul class="course-list">{"".join(items)}</ul>'


def render_about(d) -> str:
    bio = d["bio"]
    body = f"""
<section id="about" class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">About</h1>
    </div>
    <div class="cv-intro">
      {picture('assets/img/profile-img-1200.jpg', 'Mohammad Albarham', cls='cv-portrait', width=1200, height=1200, sizes='(max-width: 48rem) 100vw, 16rem')}
      <div>
        <p class="lead">{e(bio['summary'])}</p>
        <p class="cv-intro-actions">
          <a class="btn" href="/experience/">Experience &rarr;</a>
          <a class="btn" href="/education/">Education &rarr;</a>
        </p>
      </div>
    </div>
  </div>
</section>

<section id="programming-languages" class="section">
  <div class="wrap">
    <div class="section-head">
      <h2 class="section-title">Programming languages</h2>
    </div>
    {language_chart(d['languages'])}
  </div>
</section>
"""
    return shell(
        title="About — Mohammad Albarham",
        description=("Mohammad Albarham: computer vision and AI engineer in Gothenburg, "
                     "working on autonomous systems, multi-modal models and Arabic NLP."),
        canonical="/about/",
        body=body,
        current="about",
    )


def render_education(d) -> str:
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
        if len(facts) > 1:
            facts_html = f'<ul class="cv-facts meta">{"".join(f"<li>{f}</li>" for f in facts)}</ul>'
        elif facts:
            facts_html = f'<p class="meta">{facts[0]}</p>'
        else:
            facts_html = ""
        project = ""
        if school.get("graduationProject"):
            gp = school["graduationProject"]
            project = (f'<p><strong>Graduation project:</strong> '
                       f'<a href="{e(gp["url"])}" target="_blank" rel="noopener noreferrer">{e(gp["title"])}</a></p>')
        logo = picture(school["logo"], school["institution"], width=56, height=56) if school.get("logo") else ""
        schools.append(f"""<li class="cv-item{' is-current' if school.get('current') else ''}">
  <article class="cv-entry">
    <div class="cv-entry-head">
      {logo}
      <div>
        <h3>{e(school['degree'])}</h3>
        <p class="cv-org"><a href="{e(school.get('url') or '#')}" target="_blank" rel="noopener noreferrer">{e(school['institution'])}</a></p>
        {when(school.get('startDate'), school.get('endDate'), school['location'], school.get('current'))}
      </div>
    </div>
    <p>{e(school.get('focus') or '')}</p>
    {facts_html}
    {project}
    {course_list(school)}
  </article>
</li>""")

    body = f"""
<section id="education" class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title title-with-icon">
        <span class="title-icon title-icon-education"><i class="bi bi-mortarboard-fill" aria-hidden="true"></i></span>
        Education</h1>
    </div>
    <ol class="cv-timeline cv-timeline-education">{''.join(schools)}</ol>
  </div>
</section>
"""
    return shell(
        title="Education — Mohammad Albarham",
        description=("Academic background and coursework of Mohammad Albarham: MSc in Systems, Control "
                     "and Mechatronics from Chalmers, BSc in Mechatronics Engineering from the University of Jordan."),
        canonical="/education/",
        body=body,
        current="education",
    )


def render_experience(d) -> str:
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
            more = f'<p class="cv-entry-actions"><a class="btn btn-sm" href="{e(details_href(job))}">Read the full write-up</a></p>'
        org = e(job["company"])
        if job.get("url"):
            org = f'<a href="{e(job["url"])}" target="_blank" rel="noopener noreferrer">{org}</a>'
        roles.append(f"""<li class="cv-item{' is-current' if job.get('current') else ''}">
  <article class="cv-entry">
    <div class="cv-entry-head">
      {logo}
      <div>
        <h3>{e(job['position'])}</h3>
        <p class="cv-org">{org} &middot; {e(job['type'])}</p>
        {when(job.get('startDate'), job.get('endDate'), job['location'], job.get('current'))}
      </div>
    </div>
    <p>{e(job.get('description') or '')}</p>
    {f'<ul>{duties}</ul>' if duties else ''}
    {supervisors}
    {tags(job.get('technologies'))}
    {more}
  </article>
</li>""")

    body = f"""
<section id="experience" class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title title-with-icon">
        <span class="title-icon"><i class="bi bi-briefcase-fill" aria-hidden="true"></i></span>
        Experience</h1>
    </div>
    <ol class="cv-timeline">{''.join(roles)}</ol>
  </div>
</section>
"""
    return shell(
        title="Experience — Mohammad Albarham",
        description=(f"Professional experience of Mohammad Albarham: {len(d['experience'])} engineering and "
                     "research roles across Aptiv, University of Sharjah, Kenda AI, and more."),
        canonical="/experience/",
        body=body,
        current="experience",
    )


def render_resume_redirect() -> str:
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Resume — Mohammad Albarham</title>
<link rel="canonical" href="https://mohammad-albarham.github.io/experience/">
<meta http-equiv="refresh" content="0; url=/experience/">
<script>
if (window.location.hash === '#education') {
  window.location.replace("/education/");
} else {
  window.location.replace("/experience/");
}
</script>
</head>
<body>
<div id="resume" hidden></div>
<div id="education" hidden></div>
<div id="experience" hidden></div>
<p>Redirecting to <a href="/experience/">Experience</a> or <a href="/education/">Education</a>...</p>
</body>
</html>
"""


def render_volunteering(d) -> str:
    vols = d["volunteering"]
    body = f"""
<section id="volunteering" class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">Volunteering</h1>
      <p class="lead">IEEE has been the constant since my student branch days &mdash;
         {len(vols)} roles across a student branch, two sections and Region 8.</p>
    </div>
    <h2 class="visually-hidden">IEEE roles</h2>
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
"""
    return shell(
        title="Volunteering & travel — Mohammad Albarham",
        description=(f"{len(vols)} IEEE volunteer roles held by Mohammad Albarham, from a "
                     "student branch through to Region 8 — and the countries visited along the way."),
        canonical="/volunteering/",
        body=body,
        current="volunteering",
    )


def render_contact(d) -> str:
    bio = d["bio"]
    body = f"""
<section id="contact" class="section">
  <div class="wrap">
    <div class="section-head">
      <h1 class="page-title">Get in touch</h1>
      <p class="lead">Email is the reliable way to reach me. There is no contact form here on
         purpose: this site is static, so a form would have nowhere to send your
         message and no honest way to tell you it arrived.</p>
    </div>
    <div class="contact-grid">
      <div class="contact-card">
        <h2>Email</h2>
        <p class="contact-email"><a href="mailto:{e(EMAIL)}">{e(EMAIL)}</a></p>
      </div>
      <div class="contact-card">
        <h2>Location</h2>
        <p>{e(bio['location']['city'])}, {e(bio['location']['country'])}</p>
      </div>
      <div class="contact-card">
        <h2>Elsewhere</h2>
        {social_list()}
      </div>
    </div>
  </div>
</section>
"""
    return shell(
        title="Contact — Mohammad Albarham",
        description=("How to reach Mohammad Albarham: email, location in Gothenburg, "
                     "and every profile worth following."),
        canonical="/contact/",
        body=body,
        current="contact",
    )


# --- sitemap ---------------------------------------------------------------

GENERATED = ["index.html", "about/index.html", "experience/index.html", "education/index.html",
             "projects/index.html", "research/index.html", "competitions/index.html",
             "volunteering/index.html", "contact/index.html"]
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
        "news": load("news"),
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
        "about/index.html": render_about(d),
        "experience/index.html": render_experience(d),
        "education/index.html": render_education(d),
        "resume/index.html": render_resume_redirect(),
        "projects/index.html": render_projects(d),
        "research/index.html": render_research(d),
        "competitions/index.html": render_competitions(d),
        "contests/index.html": render_contests_redirect(),
        "volunteering/index.html": render_volunteering(d),
        "contact/index.html": render_contact(d),
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
