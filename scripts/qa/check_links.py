#!/usr/bin/env python3
"""
scripts/qa/check_links.py

Crawl every local HTML file in the site, resolve every href and src pointing to a
local path, and report anything that does not resolve on disk (including anchors
pointing at a missing element id or name).

Baseline-aware:
- Compares findings against scripts/qa/baseline_links.json by default.
- Exits 0 if all findings are known baseline items (no regressions).
- Exits 1 if any NEW broken links / missing anchors are detected (regressions).
- In --strict mode, exits 1 on ANY finding (zero tolerance).
- In --update-baseline mode, writes current findings to the baseline file.
"""

import argparse
from datetime import datetime, timezone
import json
import os
import sys
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path


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


def make_link_key(rel_file: str, tag: str, attr: str, target: str) -> str:
    """Generate a stable finding key that does not depend on line numbers."""
    return f"{rel_file}::{tag}::{attr}::{target}"


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
                        "key": make_link_key(rel_source, tag, attr, raw_url),
                        "file": rel_source,
                        "line": line,
                        "col": col,
                        "tag": tag,
                        "attr": attr,
                        "url": raw_url,
                        "error": "Empty src attribute",
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
                broken_items.append({
                    "key": make_link_key(rel_source, tag, attr, raw_url),
                    "file": rel_source,
                    "line": line,
                    "col": col,
                    "tag": tag,
                    "attr": attr,
                    "url": raw_url,
                    "error": error_msg,
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
                        broken_items.append({
                            "key": make_link_key(rel_source, tag, attr, raw_url),
                            "file": rel_source,
                            "line": line,
                            "col": col,
                            "tag": tag,
                            "attr": attr,
                            "url": raw_url,
                            "error": f"Anchor '#{fragment}' not found in target file '{resolved_file.name}'",
                        })

    return {
        "site_dir": str(site_dir),
        "html_files_checked": len(html_files),
        "total_references": total_references,
        "local_references": local_references,
        "broken_count": len(broken_items),
        "broken_items": broken_items,
    }


def load_baseline(baseline_file: Path) -> dict:
    if not baseline_file.is_file():
        return {"items": []}
    try:
        return json.loads(baseline_file.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[WARN] Failed to read baseline file {baseline_file}: {e}", file=sys.stderr)
        return {"items": []}


def save_baseline(baseline_file: Path, items: list[dict]):
    baseline_file.parent.mkdir(parents=True, exist_ok=True)
    clean_items = []
    for item in items:
        clean_items.append({
            "key": item["key"],
            "file": item["file"],
            "tag": item["tag"],
            "attr": item["attr"],
            "url": item["url"],
            "error": item["error"],
        })
    data = {
        "description": "Baseline of accepted pre-existing link and anchor issues",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total_items": len(clean_items),
        "items": clean_items,
    }
    baseline_file.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Updated baseline written to: {baseline_file} ({len(clean_items)} items)")


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
        "--baseline",
        default=None,
        help="Path to baseline JSON file (default: scripts/qa/baseline_links.json)",
    )
    parser.add_argument(
        "--update-baseline",
        action="store_true",
        help="Record current findings as the new baseline and exit 0",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Strict mode: exit non-zero on any finding, ignoring baseline",
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
    site_path = Path(args.site).resolve()

    if not site_path.is_dir():
        print(f"Error: Site directory does not exist: {site_path}", file=sys.stderr)
        sys.exit(2)

    baseline_path = (
        Path(args.baseline).resolve()
        if args.baseline
        else site_path / "scripts/qa/baseline_links.json"
    )

    results = check_site_links(
        site_path,
        include_templates=args.include_templates,
        verbose=args.verbose,
    )

    if args.update_baseline:
        save_baseline(baseline_path, results["broken_items"])
        sys.exit(0)

    # Baseline comparison
    baseline_data = load_baseline(baseline_path)
    baseline_map = {item["key"]: item for item in baseline_data.get("items", [])}
    current_map = {item["key"]: item for item in results["broken_items"]}

    regressions = [item for key, item in current_map.items() if key not in baseline_map]
    fixed_items = [item for key, item in baseline_map.items() if key not in current_map]
    preexisting = [item for key, item in current_map.items() if key in baseline_map]

    summary = {
        **results,
        "baseline_file": str(baseline_path),
        "baseline_items_count": len(baseline_map),
        "preexisting_count": len(preexisting),
        "regressions_count": len(regressions),
        "fixed_count": len(fixed_items),
        "regressions": regressions,
        "fixed_items": fixed_items,
        "preexisting": preexisting,
    }

    if args.json_output:
        print(json.dumps(summary, indent=2))
        if args.strict:
            sys.exit(1 if results["broken_count"] > 0 else 0)
        sys.exit(1 if len(regressions) > 0 else 0)

    print("=" * 72)
    print("PORTFOLIO LINK & ANCHOR INTEGRITY REPORT")
    print("=" * 72)
    print(f"Site Root           : {results['site_dir']}")
    print(f"HTML Files Checked  : {results['html_files_checked']}")
    print(f"Total References    : {results['total_references']}")
    print(f"Local Path Checks   : {results['local_references']}")
    print(f"Broken Links Found  : {results['broken_count']}")
    print(f"Baseline File       : {baseline_path.name} ({len(baseline_map)} accepted)")
    print(f"Regressions (NEW)   : {len(regressions)}")
    print(f"Fixed from Baseline : {len(fixed_items)}")
    print("-" * 72)

    if regressions:
        print(f"\n[FAIL] REBUILD REGRESSIONS / NEW BROKEN LINKS ({len(regressions)}):")
        for item in regressions:
            print(f"  • {item['file']}:{item['line']} <{item['tag']} {item['attr']}=\"{item['url']}\">")
            print(f"    Error: {item['error']}")

    if fixed_items:
        print(f"\n[INFO] FIXED ITEMS (in baseline, no longer failing): ({len(fixed_items)}):")
        for item in fixed_items:
            print(f"  ✓ {item['file']} <{item['tag']} {item['attr']}=\"{item['url']}\">")

    if preexisting:
        print(f"\n[INFO] ACCEPTED PRE-EXISTING BASELINE ANOMALIES ({len(preexisting)}):")
        for item in preexisting:
            print(f"  • {item['file']}:{item['line']} <{item['tag']} {item['attr']}=\"{item['url']}\">")
            print(f"    Notice: {item['error']}")

    print("\n" + "=" * 72)

    if args.strict:
        if results["broken_count"] > 0:
            print(f"STRICT MODE: Failing due to {results['broken_count']} total link finding(s).")
            sys.exit(1)
        print("STRICT MODE: Zero link findings. PASS.")
        sys.exit(0)

    if regressions:
        print(f"GATE FAILED: {len(regressions)} new regression(s) detected.")
        sys.exit(1)

    print(f"GATE PASSED: 0 regressions (all {len(preexisting)} findings match baseline).")
    sys.exit(0)


if __name__ == "__main__":
    main()
