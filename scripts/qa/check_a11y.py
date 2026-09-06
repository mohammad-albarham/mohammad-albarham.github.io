#!/usr/bin/env python3
"""
scripts/qa/check_a11y.py

Playwright + axe-core accessibility checker over every page, run against a local
static server. Reports WCAG 2.1 AA violations grouped by page and rule.

Uses .agents/skills/webapp-testing/scripts/with_server.py for server lifecycle
orchestration. Exits with code 1 if violations are found, 0 if clean.
"""

import argparse
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

# Try importing playwright and axe_core_python
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print(
        "Error: Playwright is required. Please install via: pip install playwright",
        file=sys.stderr,
    )
    sys.exit(2)

try:
    from axe_core_python.sync_playwright import Axe
except ImportError:
    print(
        "Error: axe-core-python is required. Please install via: pip install axe-core-python",
        file=sys.stderr,
    )
    sys.exit(2)


WCAG_21_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]


def is_port_open(port: int, host: str = "localhost") -> bool:
    """Check if a TCP port is accepting connections."""
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except (socket.error, ConnectionRefusedError, OSError):
        return False


def find_with_server_script(repo_root: Path) -> Path:
    """Locate with_server.py in webapp-testing skill."""
    candidates = [
        repo_root / ".agents/skills/webapp-testing/scripts/with_server.py",
        repo_root / "scripts/with_server.py",
    ]
    for c in candidates:
        if c.is_file():
            return c
    # Fallback search
    matches = list(repo_root.rglob("with_server.py"))
    if matches:
        return matches[0]
    return None


def collect_site_pages(site_dir: Path) -> list[str]:
    """Collect relative route paths for all HTML pages in the site."""
    excluded_parts = {"node_modules", ".git", ".venv", ".bundle-check", ".agents", ".gemini", "templates"}
    pages = []

    # If baseline snapshot exists, prefer its canonical route list
    snapshot_file = site_dir / "scripts/qa/baseline_snapshot.json"
    if snapshot_file.is_file():
        try:
            snap = json.loads(snapshot_file.read_text(encoding="utf-8"))
            routes = snap.get("routes", [])
            if routes:
                return sorted(routes)
        except Exception:
            pass

    for p in sorted(site_dir.rglob("*.html")):
        if any(part in p.parts for part in excluded_parts):
            continue
        rel = str(p.relative_to(site_dir))
        pages.append(rel)
    return pages


def run_a11y_audit(
    base_url: str,
    routes: list[str],
    verbose: bool = False,
) -> dict:
    """Runs Playwright and axe-core across all specified routes."""
    axe = Axe()
    results_by_page = {}
    rule_aggregates = {}
    total_violations_count = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = context.new_page()

        for route in routes:
            url = f"{base_url.rstrip('/')}/{route}"
            if verbose:
                print(f"Auditing [{route}] -> {url}...", file=sys.stderr)

            try:
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
                try:
                    page.wait_for_load_state("networkidle", timeout=3000)
                except Exception:
                    pass

                axe_res = axe.run(
                    page,
                    options={"runOnly": {"type": "tag", "values": WCAG_21_AA_TAGS}},
                )
                violations = axe_res.get("violations", [])

                page_violations = []
                for v in violations:
                    rule_id = v["id"]
                    impact = v.get("impact", "unknown")
                    help_text = v.get("help", "")
                    help_url = v.get("helpUrl", "")
                    node_count = len(v.get("nodes", []))
                    total_violations_count += node_count

                    nodes_summary = []
                    for node in v.get("nodes", []):
                        nodes_summary.append({
                            "target": node.get("target", []),
                            "html": node.get("html", "")[:120],
                            "failure_summary": node.get("failureSummary", ""),
                        })

                    item = {
                        "rule_id": rule_id,
                        "impact": impact,
                        "help": help_text,
                        "help_url": help_url,
                        "node_count": node_count,
                        "nodes": nodes_summary,
                    }
                    page_violations.append(item)

                    # Update rule aggregates
                    if rule_id not in rule_aggregates:
                        rule_aggregates[rule_id] = {
                            "rule_id": rule_id,
                            "impact": impact,
                            "help": help_text,
                            "help_url": help_url,
                            "total_nodes": 0,
                            "affected_pages": [],
                        }
                    rule_aggregates[rule_id]["total_nodes"] += node_count
                    if route not in rule_aggregates[rule_id]["affected_pages"]:
                        rule_aggregates[rule_id]["affected_pages"].append(route)

                results_by_page[route] = {
                    "violation_types_count": len(page_violations),
                    "violations": page_violations,
                }

            except Exception as e:
                results_by_page[route] = {
                    "error": str(e),
                    "violation_types_count": 0,
                    "violations": [],
                }
                if verbose:
                    print(f"[ERROR] Failed checking {route}: {e}", file=sys.stderr)

        browser.close()

    return {
        "wcag_tags": WCAG_21_AA_TAGS,
        "total_pages_checked": len(routes),
        "total_violations_count": total_violations_count,
        "unique_rules_violated": len(rule_aggregates),
        "rule_aggregates": rule_aggregates,
        "pages": results_by_page,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Check WCAG 2.1 AA accessibility across all portfolio pages using axe-core and Playwright."
    )
    parser.add_argument(
        "--site",
        default=".",
        help="Root directory of the portfolio site (default: current directory)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port for local test server (default: 8000)",
    )
    parser.add_argument(
        "--url",
        default=None,
        help="Base URL of already running static server (e.g. http://localhost:8000)",
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
        help="Show detailed progress during audit",
    )
    parser.add_argument(
        "--no-spawn",
        action="store_true",
        help="Do not attempt to auto-spawn server via with_server.py",
    )

    args, extra_args = parser.parse_known_args()
    site_dir = Path(args.site).resolve()

    if not site_dir.is_dir():
        print(f"Error: Site directory does not exist: {site_dir}", file=sys.stderr)
        sys.exit(2)

    base_url = args.url or f"http://localhost:{args.port}"

    # Server lifecycle handling:
    # If the server is not ready and --no-spawn is not set, use with_server.py to orchestrate
    if not is_port_open(args.port) and not args.url and not args.no_spawn:
        with_server_script = find_with_server_script(site_dir)
        if with_server_script and with_server_script.is_file():
            server_cmd = f"{sys.executable} -m http.server {args.port} --directory {site_dir}"
            run_cmd = [
                sys.executable,
                str(with_server_script),
                "--server",
                server_cmd,
                "--port",
                str(args.port),
                "--",
                sys.executable,
                str(Path(__file__).resolve()),
                "--site",
                str(site_dir),
                "--port",
                str(args.port),
                "--no-spawn",
            ]
            if args.json_output:
                run_cmd.append("--json")
            if args.verbose:
                run_cmd.append("--verbose")
            run_cmd.extend(extra_args)

            result = subprocess.run(run_cmd)
            sys.exit(result.returncode)
        else:
            print(
                f"Error: Port {args.port} is not open and with_server.py could not be located.",
                file=sys.stderr,
            )
            sys.exit(2)

    pages = collect_site_pages(site_dir)
    results = run_a11y_audit(base_url, pages, verbose=args.verbose)

    if args.json_output:
        print(json.dumps(results, indent=2))
        sys.exit(1 if results["total_violations_count"] > 0 else 0)

    print("=" * 72)
    print("WCAG 2.1 AA ACCESSIBILITY AUDIT REPORT (axe-core)")
    print("=" * 72)
    print(f"Site Target         : {base_url} ({site_dir})")
    print(f"Pages Audited       : {results['total_pages_checked']}")
    print(f"Total Violations    : {results['total_violations_count']}")
    print(f"Rules Violated      : {results['unique_rules_violated']}")
    print("-" * 72)

    print("\nVIOLATIONS GROUPED BY PAGE AND RULE:")
    pages_with_violations = 0
    for page_path, page_data in results["pages"].items():
        v_list = page_data.get("violations", [])
        if not v_list:
            print(f"\n✓ {page_path}: Clean (0 violations)")
            continue

        pages_with_violations += 1
        print(f"\n✗ {page_path}: {len(v_list)} rule violation(s)")
        for v in v_list:
            print(f"  • [{v['impact'].upper()}] {v['rule_id']} ({v['node_count']} element(s)): {v['help']}")
            if args.verbose:
                for node in v["nodes"][:3]:
                    print(f"    - Target: {node['target']}")
                    print(f"      HTML  : {node['html']}")

    print("\n" + "-" * 72)
    print("VIOLATION SUMMARY ACROSS SITE BY RULE:")
    for rule_id, rule_info in sorted(results["rule_aggregates"].items(), key=lambda x: -x[1]["total_nodes"]):
        print(
            f"  • {rule_id:<20} [{rule_info['impact'].upper():<8}]: {rule_info['total_nodes']} node(s) across {len(rule_info['affected_pages'])} page(s)"
        )
        print(f"    Help: {rule_info['help']}")

    print("\n" + "=" * 72)
    sys.exit(1 if results["total_violations_count"] > 0 else 0)


if __name__ == "__main__":
    main()
