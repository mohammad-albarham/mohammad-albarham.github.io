#!/usr/bin/env python3
"""
scripts/qa/check_links.py

Crawl every local HTML file in the site, resolve every href and src pointing to a
local path, and report anything that does not resolve on disk (including anchors
pointing at a missing element id or name).

Python standard library only. Exits with code 1 if broken links are found, 0 if clean.
"""

import argparse
import json
import os
import sys
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path


KNOWN_PREEXISTING_ANOMALIES = [
    {
        "file": "projects/latest-projects-1.html",
        "tag": "img",
        "attr": "src",
        "target": "../assets/img/portfolio/",
        "reason": "Image tag src points to directory instead of file",
    },
    {
        "file": "projects/latest-projects-2.html",
        "tag": "img",
        "attr": "src",
        "target": "../assets/img/portfolio/",
        "reason": "Image tag src points to directory instead of file",
    },
    {
        "file": "projects/latest-projects-3.html",
        "tag": "img",
        "attr": "src",
        "target": "../assets/img/portfolio/",
        "reason": "Image tag src points to directory instead of file",
    },
]


class HTMLContentParser(HTMLParser):
    """Parses an HTML document to extract IDs, named anchors, and href/src links."""

    def __init__(self):
        super().__init__()
        self.ids = set()
        self.references = []  # list of (tag, attr, val, line, col)

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        line, col = self.getpos()

        # Extract element ID
        elem_id = attrs_dict.get("id")
        if elem_id:
            self.ids.add(elem_id.strip())

        # Extract legacy anchor name
        if tag == "a":
            name_attr = attrs_dict.get("name")
            if name_attr:
                self.ids.add(name_attr.strip())

        # Extract links and sources
        for attr in ("href", "src"):
            val = attrs_dict.get(attr)
            if val is not None:
                self.references.append((tag, attr, val.strip(), line, col))


def is_known_preexisting(rel_file: str, tag: str, attr: str, target: str) -> bool:
    for anomaly in KNOWN_PREEXISTING_ANOMALIES:
        if (
            anomaly["file"] == rel_file
            and anomaly["tag"] == tag
            and anomaly["attr"] == attr
            and anomaly["target"] == target
        ):
            return True
    return False


def collect_html_files(site_dir: Path, include_templates: bool = False) -> list[Path]:
    """Finds all HTML files to check, ignoring build artifacts, venvs, and templates."""
    excluded_parts = {"node_modules", ".git", ".venv", ".bundle-check", ".agents", ".gemini"}
    if not include_templates:
        excluded_parts.add("templates")

    html_files = []
    for p in sorted(site_dir.rglob("*.html")):
        if any(part in p.parts for part in excluded_parts):
            continue
        html_files.append(p)
    return html_files


def check_site_links(site_dir: Path, include_templates: bool = False, verbose: bool = False):
    site_dir = site_dir.resolve()
    html_files = collect_html_files(site_dir, include_templates=include_templates)

    parsed_files = {}
    for p in html_files:
        parser = HTMLContentParser()
        try:
            content = p.read_text(encoding="utf-8", errors="replace")
            parser.feed(content)
            parsed_files[p] = parser
        except Exception as e:
            if verbose:
                print(f"[WARN] Failed to read {p}: {e}", file=sys.stderr)

    total_references = 0
    local_references = 0
    broken_items = []

    domain_prefixes = (
        "https://mohammad-albarham.github.io",
        "http://mohammad-albarham.github.io",
    )

    for p, parser in parsed_files.items():
        rel_source = str(p.relative_to(site_dir))
        for tag, attr, raw_url, line, col in parser.references:
            total_references += 1

            if not raw_url:
                if attr == "src":
                    broken_items.append({
                        "file": rel_source,
                        "line": line,
                        "col": col,
                        "tag": tag,
                        "attr": attr,
                        "url": raw_url,
                        "error": "Empty src attribute",
                        "preexisting": False,
                    })
                continue

            # Strip domain if pointing to own site
            url_to_parse = raw_url
            for prefix in domain_prefixes:
                if url_to_parse.startswith(prefix):
                    url_to_parse = url_to_parse[len(prefix):] or "/"
                    break

            parsed = urllib.parse.urlsplit(url_to_parse)

            # Skip non-local schemes
            if parsed.scheme in ("http", "https", "mailto", "tel", "javascript", "data"):
                continue

            local_references += 1
            raw_path = urllib.parse.unquote(parsed.path)
            fragment = urllib.parse.unquote(parsed.fragment) if parsed.fragment else ""

            # Target file determination
            target_path = None
            if not raw_path:
                # Same-document link: e.g. href="#about"
                target_path = p
            elif raw_path.startswith("/"):
                # Root-relative path: e.g. /assets/css/style.css or /experience/
                sub = raw_path.lstrip("/")
                target_path = site_dir / sub
                if raw_path == "/":
                    target_path = site_dir / "index.html"
            else:
                # Document-relative path: e.g. ../assets/img/foo.png
                target_path = (p.parent / raw_path).resolve()

            # Resolution on disk
            resolved_file = None
            error_msg = None

            if target_path.is_file():
                resolved_file = target_path
            elif target_path.is_dir():
                if tag in ("img", "script", "source", "video", "audio"):
                    error_msg = f"Resource '{attr}' points to a directory ({target_path.name}/), not a file"
                elif (target_path / "index.html").is_file():
                    resolved_file = target_path / "index.html"
                else:
                    error_msg = f"Directory '{raw_path}' does not contain an index.html"
            else:
                # Check clean URL alternative: path.html
                if not target_path.suffix and target_path.with_suffix(".html").is_file():
                    resolved_file = target_path.with_suffix(".html")
                elif (target_path.parent / f"{target_path.name}.html").is_file():
                    resolved_file = target_path.parent / f"{target_path.name}.html"
                else:
                    error_msg = f"Target does not exist on disk: {raw_path}"

            if error_msg:
                is_pre = is_known_preexisting(rel_source, tag, attr, raw_url)
                broken_items.append({
                    "file": rel_source,
                    "line": line,
                    "col": col,
                    "tag": tag,
                    "attr": attr,
                    "url": raw_url,
                    "error": error_msg,
                    "preexisting": is_pre,
                })
                continue

            # Anchor validation
            if fragment and resolved_file:
                # Skip standard top-of-page empty fragment '#'
                if fragment != "":
                    # Fetch IDs for the target file
                    target_parser = parsed_files.get(resolved_file)
                    if not target_parser and resolved_file.suffix == ".html" and resolved_file.is_file():
                        target_parser = HTMLContentParser()
                        try:
                            target_parser.feed(resolved_file.read_text(encoding="utf-8", errors="replace"))
                            parsed_files[resolved_file] = target_parser
                        except Exception:
                            pass

                    if target_parser and fragment not in target_parser.ids:
                        is_pre = is_known_preexisting(rel_source, tag, attr, raw_url)
                        broken_items.append({
                            "file": rel_source,
                            "line": line,
                            "col": col,
                            "tag": tag,
                            "attr": attr,
                            "url": raw_url,
                            "error": f"Anchor '#{fragment}' not found in target file '{resolved_file.name}'",
                            "preexisting": is_pre,
                        })

    return {
        "site_dir": str(site_dir),
        "html_files_checked": len(html_files),
        "total_references": total_references,
        "local_references": local_references,
        "broken_count": len(broken_items),
        "broken_items": broken_items,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Verify static link and anchor integrity across all local HTML files."
    )
    parser.add_argument(
        "--site",
        default=".",
        help="Root directory of the portfolio site (default: current directory)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="json_output",
        help="Print machine-readable JSON output",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed information during execution",
    )
    parser.add_argument(
        "--include-templates",
        action="store_true",
        help="Include files in templates/ directory",
    )

    args = parser.parse_args()
    site_path = Path(args.site)

    if not site_path.is_dir():
        print(f"Error: Site directory does not exist: {site_path}", file=sys.stderr)
        sys.exit(2)

    results = check_site_links(
        site_path,
        include_templates=args.include_templates,
        verbose=args.verbose,
    )

    if args.json_output:
        print(json.dumps(results, indent=2))
        sys.exit(1 if results["broken_count"] > 0 else 0)

    print("=" * 72)
    print("PORTFOLIO LINK & ANCHOR INTEGRITY REPORT")
    print("=" * 72)
    print(f"Site Root           : {results['site_dir']}")
    print(f"HTML Files Checked  : {results['html_files_checked']}")
    print(f"Total References    : {results['total_references']}")
    print(f"Local Path Checks   : {results['local_references']}")
    print(f"Broken Links Found  : {results['broken_count']}")
    print("-" * 72)

    if results["broken_count"] == 0:
        print("✓ All local links, media sources, and anchor targets resolve on disk.")
        print("=" * 72)
        sys.exit(0)

    preexisting_items = [b for b in results["broken_items"] if b["preexisting"]]
    new_items = [b for b in results["broken_items"] if not b["preexisting"]]

    if new_items:
        print(f"\n[FAIL] REBUILD REGRESSIONS / NEW BROKEN LINKS ({len(new_items)}):")
        for item in new_items:
            print(f"  • {item['file']}:{item['line']} <{item['tag']} {item['attr']}=\"{item['url']}\">")
            print(f"    Error: {item['error']}")

    if preexisting_items:
        print(f"\n[INFO] PRE-EXISTING BASELINE ANOMALIES ({len(preexisting_items)}):")
        for item in preexisting_items:
            print(f"  • {item['file']}:{item['line']} <{item['tag']} {item['attr']}=\"{item['url']}\">")
            print(f"    Notice: {item['error']}")

    print("\n" + "=" * 72)
    # Return non-zero because broken items were detected
    sys.exit(1)


if __name__ == "__main__":
    main()
