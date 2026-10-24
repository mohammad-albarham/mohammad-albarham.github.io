#!/usr/bin/env python3
"""Re-point the navigation and footer links of the hand-written detail pages.

site/render.py owns the chrome of the generated pages, but the 32 detail pages
under projects/, competitions/, experience/ and volunteering/ carry a copy of
that chrome baked in by the one-shot site/restyle_legacy.py. When the site map
changes, this script rewrites just the three link blocks — nav pills, footer
Pages, footer Sections — so every page agrees on where the sections live.

    python3 scripts/sync-legacy-chrome.py [--check]
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "site"))

from render import NAV, e  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LEGACY_DIRS = ["projects", "competitions", "experience", "volunteering"]

# Which nav pill a detail page belongs under.
CURRENT_BY_DIR = {
    "projects": "projects",
    "competitions": "competitions",
    "experience": "experience",
    "volunteering": "volunteering",
}

FOOTER_PAGES = """<h2>Pages</h2>
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
        </ul>"""

FOOTER_SECTIONS = """<h2>Sections</h2>
        <ul>
          <li><a href="/experience/">Experience</a></li>
          <li><a href="/education/">Education</a></li>
          <li><a href="/research/#publications">Publications</a></li>
          <li><a href="/competitions/">Competitions</a></li>
          <li><a href="/about/#programming-languages">Programming languages</a></li>
          <li><a href="/about/#travel">Travel</a></li>
        </ul>"""


def pills(current: str) -> str:
    inner = "".join(
        '<li><a href="{0}"{1}>{2}</a></li>'.format(
            e(href), ' aria-current="page"' if key == current else "", e(label))
        for href, label, key in NAV
    )
    return f'<ul class="nav-pills" id="nav-pills">{inner}</ul>'


def rewrite(text: str, current: str) -> str:
    text = re.sub(r'<ul class="nav-pills" id="nav-pills">.*?</ul>',
                  lambda _: pills(current), text, flags=re.S)
    text = re.sub(r"<h2>Pages</h2>\s*<ul>.*?</ul>",
                  lambda _: FOOTER_PAGES, text, flags=re.S)
    text = re.sub(r"<h2>Sections</h2>\s*<ul>.*?</ul>",
                  lambda _: FOOTER_SECTIONS, text, flags=re.S)
    return text


def main() -> int:
    check = "--check" in sys.argv
    stale = []
    for directory in LEGACY_DIRS:
        for path in sorted((ROOT / directory).glob("*.html")):
            if path.name == "index.html":
                continue
            before = path.read_text(encoding="utf-8")
            after = rewrite(before, CURRENT_BY_DIR[directory])
            if before == after:
                continue
            stale.append(path.relative_to(ROOT))
            if not check:
                path.write_text(after, encoding="utf-8")
    label = "STALE" if check else "updated"
    for path in stale:
        print(f"  {label}  {path}")
    if not stale:
        print("  all detail pages already in step")
    return 1 if (check and stale) else 0


if __name__ == "__main__":
    raise SystemExit(main())
