#!/usr/bin/env python3
"""Structural checks over the built site.

    python3 scripts/check_site.py

Fails (exit 1) on: a broken internal link, a missing legacy route, a missing
homepage anchor, or a record in data/*.json that never made it onto a page.
These are the failures that would quietly break search-engine links or drop
someone's work off the site, so they are checked rather than eyeballed.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent

# Routes that existed before the rebuild and must keep working. External sites,
# CVs and search results link to these.
LEGACY_ROUTES = [
    "/index.html",
    "/googleebff4c42c46c6acf.html",
    "/robots.txt",
    "/sitemap.xml",
    "/experience/phi-pair.html",
    "/projects/araclip.html",
    "/volunteering/volunteering_ieee.html",
] + [f"/projects/latest-projects-{n}.html" for n in range(1, 6)] \
  + [f"/projects/portfolio-details-{n}.html"
     for n in [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21]] \
  + [f"/competitions/competition-details-{n}.html" for n in range(1, 6)]

# Anchors the old single-page site exposed. Anything linking to
# mohammad-albarham.github.io/#publications must still land somewhere real.
HOME_ANCHORS = ["hero", "about", "programming-languages", "resume", "projects",
                "competitions", "publications", "volunteering", "travel", "contact"]

failures: list[str] = []
notes: list[str] = []


def fail(message: str) -> None:
    failures.append(message)


def html_files() -> list[Path]:
    return sorted(p for p in ROOT.rglob("*.html")
                  if not any(part in {".git", "node_modules", ".venv", "templates",
                                      ".agents", "docs"} for part in p.parts))


def resolve(route: str) -> Path:
    path = ROOT / route.lstrip("/")
    return path / "index.html" if path.is_dir() else path


# --- 1. legacy routes still exist -----------------------------------------

def check_legacy_routes() -> None:
    for route in LEGACY_ROUTES:
        if not resolve(route).exists():
            fail(f"legacy route missing: {route}")
    notes.append(f"{len(LEGACY_ROUTES)} legacy routes present")


# --- 2. homepage anchors ---------------------------------------------------

def check_anchors() -> None:
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    ids = set(re.findall(r'\bid="([^"]+)"', home))
    for anchor in HOME_ANCHORS:
        if anchor not in ids:
            fail(f"homepage anchor missing: #{anchor}")
    notes.append(f"{len(HOME_ANCHORS)} homepage anchors present")


# --- 3. internal links resolve --------------------------------------------

SKIP_SCHEMES = {"http", "https", "mailto", "tel", "data", "javascript"}


def check_links() -> None:
    checked = 0
    for page in html_files():
        text = page.read_text(encoding="utf-8")
        ids = set(re.findall(r'\bid="([^"]+)"', text))
        # Commented-out markup is not a live link.
        text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
        for attr, value in re.findall(r'\b(href|src|srcset)="([^"]+)"', text):
            for raw in (value.split(",") if attr == "srcset" else [value]):
                raw = raw.strip()
                # Only srcset uses space as a descriptor separator; ordinary
                # paths on this site legitimately contain spaces.
                if attr == "srcset":
                    raw = raw.split(" ")[0]
                if not raw:
                    continue
                parsed = urlparse(raw)
                if parsed.scheme in SKIP_SCHEMES or raw.startswith("//"):
                    continue
                if raw.startswith("#"):
                    if raw[1:] and raw[1:] not in ids:
                        fail(f"{page.relative_to(ROOT)}: dead in-page anchor {raw}")
                    continue
                target = (ROOT / unquote(parsed.path).lstrip("/") if parsed.path.startswith("/")
                          else (page.parent / unquote(parsed.path)).resolve())
                if target.is_dir():
                    target = target / "index.html"
                checked += 1
                if not target.exists():
                    fail(f"{page.relative_to(ROOT)}: broken {attr} -> {raw}")
    notes.append(f"{checked} internal links/assets resolved across {len(html_files())} pages")


# --- 4. every record reaches a page ---------------------------------------

def check_coverage() -> None:
    pages = {p: p.read_text(encoding="utf-8") for p in html_files()}
    everything = "\n".join(pages.values())

    def load(name):
        return json.loads((ROOT / "data" / f"{name}.json").read_text(encoding="utf-8"))

    def present(needle: str) -> bool:
        # Titles are HTML-escaped on the page; compare on a normalised form.
        norm = re.sub(r"\s+", " ", needle).strip()
        flat = re.sub(r"\s+", " ", everything)
        return norm in flat or norm.replace("&", "&amp;") in flat

    counts = {}
    for name, key in [("projects", "title"), ("publications", "title"),
                      ("competitions", "title"), ("experience", "position"),
                      ("volunteering", "position"), ("education", "degree")]:
        records = load(name)
        counts[name] = len(records)
        for record in records:
            if not present(record[key]):
                fail(f"{name}: '{record[key]}' does not appear on any page")

    languages = load("programming-languages")
    for lang in languages["languages"]:
        if not present(lang["name"]):
            fail(f"programming-languages: {lang['name']} missing from the chart")
    counts["languages"] = len(languages["languages"])

    travel = load("travel")
    codes = {c for codes in travel["visited"].values() for c in codes}
    for code in codes:
        name = travel["countryNames"].get(code)
        if name and name not in everything:
            fail(f"travel: {name} missing from the country list")
    counts["countries"] = len(codes)

    notes.append("content rendered: " + ", ".join(f"{v} {k}" for k, v in counts.items()))


# --- 5. contact is honest --------------------------------------------------

def check_contact() -> None:
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    if "mailto:mohammad.albarham.work@gmail.com" not in home:
        fail("homepage does not expose a mailto: contact link")
    for page in html_files():
        text = page.read_text(encoding="utf-8")
        if re.search(r'<form\b', text, re.I):
            fail(f"{page.relative_to(ROOT)}: contains a <form>, which cannot submit "
                 "from a static host without a third-party service")
        if re.search(r'action="[^"]*\.php"', text, re.I):
            fail(f"{page.relative_to(ROOT)}: posts to a PHP endpoint, which GitHub Pages never runs")
    notes.append("contact is a mailto: link; no form anywhere in the built site")


def main() -> int:
    check_legacy_routes()
    check_anchors()
    check_links()
    check_coverage()
    check_contact()

    for note in notes:
        print(f"  ok        {note}")
    for failure in failures:
        print(f"  FAIL      {failure}")
    print()
    print(f"{len(failures)} failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
