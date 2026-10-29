#!/usr/bin/env python3
"""Re-shell the hand-written detail pages onto the new design system.

The 32 pages under projects/, competitions/, experience/ and volunteering/
carry content that exists nowhere else: image galleries, competition write-ups,
result tables, PDF and poster links, course notes. None of it is derivable from
data/*.json, so this script does not regenerate those pages — it keeps their
<main> content byte-for-byte and replaces everything around it: the head, the
300px sidebar, the vendor <script> tags and the old footer.

It is idempotent. On the first run the preserved region is wrapped in
<div class="detail-body" data-legacy-content>; on later runs that wrapper is
what gets read back, so re-running never nests shells or re-strips content.

    python3 site/restyle_legacy.py           rewrite the pages in place
    python3 site/restyle_legacy.py --check   report which pages would change
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from functools import lru_cache
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from render import ROOT, DATA, e, picture, shell  # noqa: E402

SECTIONS = {
    "projects": ("Projects", "/projects/", "projects"),
    "competitions": ("Competitions", "/competitions/", "competitions"),
    "experience": ("Experience", "/experience/", "experience"),
    "volunteering": ("About & CV", "/about/#service", "about"),
}

# Pages with no record in data/*.json. Titles read off the pages themselves.
STANDALONE = {
    "projects/araclip.html": (
        "AraCLIP",
        "AraCLIP: connecting Arabic text and images with cross-lingual "
        "contrastive pre-training.",
    ),
    "volunteering/volunteering_ieee.html": (
        "IEEE volunteering gallery",
        "Photographs from Mohammad Albarham's IEEE volunteering, from the "
        "University of Jordan student branch to Region 8.",
    ),
}


@lru_cache(maxsize=1)
def records() -> dict[str, dict]:
    """Map every detailsPage route to the record that describes it."""
    found = {}
    for name in ("projects", "competitions", "experience"):
        for record in json.loads((DATA / f"{name}.json").read_text(encoding="utf-8")):
            page = record.get("detailsPage")
            if page:
                found[page.lstrip("/")] = record
    # Legacy alias route for AraCLIP
    if "projects/araclip.html" in found and "projects/latest-projects-1.html" not in found:
        found["projects/latest-projects-1.html"] = found["projects/araclip.html"]
    return found


def inner_main(source: str) -> str | None:
    """The content to keep: the marked region if this page was already
    migrated, otherwise <main> with the old breadcrumb strip removed."""
    marked = re.search(
        r'<div class="detail-body" data-legacy-content>(.*?)\n</div>\n</div>\n',
        source, re.S)
    if marked:
        return marked.group(1)

    main = re.search(r"<main[^>]*>(.*?)</main>", source, re.S)
    if not main:
        return None
    body = main.group(1)
    # The old breadcrumb strip is replaced by a real page header.
    body = re.sub(r'<section id="breadcrumbs".*?</section>', "", body, flags=re.S)
    return body


def clean(body: str) -> tuple[str, int]:
    """Drop <img> tags whose src points at a directory rather than a file.

    Several pages carry `<img src="../assets/img/portfolio/" alt="">`, which has
    never resolved to anything and renders as a broken-image icon. Removing the
    tag is the only change made to the preserved markup."""
    broken = re.compile(r'\s*<img\b[^>]*\bsrc="(?:[^"]*/)?"[^>]*>\s*', re.I)
    cleaned, count = broken.subn("\n", body)
    return cleaned, count


def meta_for(route: str, source: str, record: dict | None) -> tuple[str, str]:
    if record:
        title = record.get("title") or record.get("position") or route
        description = (record.get("shortDescription")
                       or record.get("description")
                       or f"{title} — a project by Mohammad Albarham.")
        return title, description
    if route in STANDALONE:
        return STANDALONE[route]
    existing = re.search(r"<title>(.*?)</title>", source, re.S)
    title = html.unescape(existing.group(1).strip()) if existing else route
    title = re.sub(r"\s*[-–—|]\s*Mohammad Al-?[Bb]arham.*$", "", title).strip()
    described = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', source)
    return title, html.unescape(described.group(1)) if described else title


def hero_image(record: dict | None, body: str) -> str:
    """A lead image, but only for pages whose own content has none — most
    detail pages open with the very image the card already used."""
    if not record or not record.get("image") or "<img" in body:
        return ""
    return picture(record["image"], record.get("title") or "",
                   cls="detail-hero", sizes="(max-width: 60rem) 100vw, 70rem")


def build_page(path: Path) -> str | None:
    route = path.relative_to(ROOT).as_posix()
    source = path.read_text(encoding="utf-8")

    body = inner_main(source)
    if body is None:
        return None
    body, dropped = clean(body)

    record = records().get(route)
    title, description = meta_for(route, source, record)
    section, section_href, nav_key = SECTIONS[route.split("/")[0]]

    facts = []
    if record:
        for key in ("year", "award", "organizer", "company"):
            value = record.get(key)
            if not value:
                continue
            # `award` is a string on some competitions and a list on others.
            facts.extend(str(v) for v in value) if isinstance(value, list) else facts.append(str(value))
    facts_html = f'<p class="meta">{e(" · ".join(facts))}</p>' if facts else ""

    header = f"""
<section class="detail-header">
  <div class="wrap">
    <nav aria-label="Breadcrumb">
      <ol class="breadcrumb">
        <li><a href="/">Home</a></li>
        <li><a href="{e(section_href)}">{e(section)}</a></li>
        <li aria-current="page">{e(title)}</li>
      </ol>
    </nav>
    <h1 class="page-title">{e(title)}</h1>
    {facts_html}
    {hero_image(record, body)}
  </div>
</section>
"""

    page_body = f"""{header}
<div class="wrap">
<div class="detail-body" data-legacy-content>{body}
</div>
</div>

<section class="section">
  <div class="wrap">
    <p><a class="btn" href="{e(section_href)}"><i class="bi bi-arrow-left" aria-hidden="true"></i> Back to {e(section)}</a></p>
  </div>
</section>
"""

    # visited_countries.html scripts its own jVectorMap instance inside the
    # preserved markup and used to get jQuery from the old shell's CDN tag.
    # Serve it locally, before the content that calls it.
    head_extra = ""
    if "jvectormap" in body.lower() or "jquery" in body.lower():
        head_extra = '<script src="/assets/js/jquery.js"></script>'

    out = shell(
        title=f"{title} — Mohammad Albarham",
        description=description,
        canonical="/" + route,
        body=page_body,
        current=nav_key,
        head_extra=head_extra,
        og_image="/" + record["image"] if record and record.get("image") else "/assets/img/profile-img-1200.jpg",
    )
    if dropped:
        print(f"    (dropped {dropped} image tag(s) with a directory src)")
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true",
                        help="report pages that would change; do not write")
    args = parser.parse_args()

    changed, skipped = [], []
    for directory in SECTIONS:
        for path in sorted((ROOT / directory).glob("*.html")):
            if path.name == "index.html":
                continue
            built = build_page(path)
            if built is None:
                skipped.append(path.relative_to(ROOT).as_posix())
                continue
            route = path.relative_to(ROOT).as_posix()
            if built == path.read_text(encoding="utf-8"):
                print(f"  ok        {route}")
                continue
            changed.append(route)
            if args.check:
                print(f"  STALE     {route}")
            else:
                path.write_text(built, encoding="utf-8")
                print(f"  restyled  {route}")

    for route in skipped:
        print(f"  SKIPPED   {route} (no <main> element found)")
    if skipped:
        return 1
    if args.check and changed:
        print(f"\n{len(changed)} legacy page(s) out of date. Run: python3 site/restyle_legacy.py")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
