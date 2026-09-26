#!/usr/bin/env python3
"""
scripts/qa/check_a11y.py

Playwright + axe-core accessibility checker over every page, run against a local
static server. Reports WCAG 2.1 AA violations grouped by page and rule.

Baseline-aware:
- Compares findings against scripts/qa/baseline_a11y.json by default.
- Exit 0 when findings are a subset of the baseline (no new regressions).
- Exit 1 ONLY on findings absent from the baseline (regressions).
- Reports fixed findings (in baseline, now gone) as good news / burn-down progress.
- In --strict mode, exits 1 on ANY finding (zero tolerance).
- In --update-baseline mode, writes current findings to the baseline file and exits 0.

Uses .agents/skills/webapp-testing/scripts/with_server.py for server lifecycle
orchestration if a server is not already active on the target port.
"""

import argparse
from datetime import datetime, timezone
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

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


def make_a11y_key(route: str, rule_id: str, target: list[str]) -> str:
    """Generate a stable finding key that does not depend on line numbers."""
    target_str = " > ".join(target) if isinstance(target, list) else str(target)
    return f"{route}::{rule_id}::{target_str}"


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
    matches = list(repo_root.rglob("with_server.py"))
    if matches:
        return matches[0]
    return None


def collect_site_pages(site_dir: Path) -> list[str]:
    """Collect relative route paths for all HTML pages in the site."""
    excluded_parts = {"node_modules", ".git", ".venv", ".bundle-check", ".agents", ".gemini", "templates"}

    snapshot_file = site_dir / "scripts/qa/baseline_snapshot.json"
    if snapshot_file.is_file():
        try:
            snap = json.loads(snapshot_file.read_text(encoding="utf-8"))
            routes = snap.get("routes", [])
            if routes:
                return sorted(routes)
        except Exception:
            pass

    pages = []
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
    all_flat_violations = []

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
                    nodes = v.get("nodes", [])

                    nodes_summary = []
                    for node in nodes:
                        target = node.get("target", [])
                        html_snip = node.get("html", "")[:120]
                        failure_summary = node.get("failureSummary", "")
                        node_key = make_a11y_key(route, rule_id, target)

                        item_record = {
                            "key": node_key,
                            "page": route,
                            "rule_id": rule_id,
                            "impact": impact,
                            "help": help_text,
                            "target": target,
                            "html": html_snip,
                            "failure_summary": failure_summary,
                        }
                        nodes_summary.append(item_record)
                        all_flat_violations.append(item_record)

                    page_violations.append({
                        "rule_id": rule_id,
                        "impact": impact,
                        "help": help_text,
                        "help_url": help_url,
                        "node_count": len(nodes),
                        "nodes": nodes_summary,
                    })

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
                    rule_aggregates[rule_id]["total_nodes"] += len(nodes)
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
        "total_violations_count": len(all_flat_violations),
        "unique_rules_violated": len(rule_aggregates),
        "rule_aggregates": rule_aggregates,
        "flat_violations": all_flat_violations,
        "pages": results_by_page,
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
    unique_rules = set()
    for item in items:
        unique_rules.add(item["rule_id"])
        clean_items.append({
            "key": item["key"],
            "page": item["page"],
            "rule_id": item["rule_id"],
            "impact": item["impact"],
            "help": item["help"],
            "target": item["target"],
            "html": item.get("html", ""),
        })
    data = {
        "description": "Baseline of accepted pre-existing accessibility issues (technical debt to be burned down)",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "total_violations": len(clean_items),
        "unique_rules": len(unique_rules),
        "items": clean_items,
    }
    baseline_file.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Updated baseline written to: {baseline_file} ({len(clean_items)} violation instances across {len(unique_rules)} rules)")


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
        "--baseline",
        default=None,
        help="Path to baseline JSON file (default: scripts/qa/baseline_a11y.json)",
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
    baseline_path = (
        Path(args.baseline).resolve()
        if args.baseline
        else site_dir / "scripts/qa/baseline_a11y.json"
    )

    # Server lifecycle handling via with_server.py if port is closed
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
                "--baseline",
                str(baseline_path),
                "--no-spawn",
            ]
            if args.update_baseline:
                run_cmd.append("--update-baseline")
            if args.strict:
                run_cmd.append("--strict")
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

    if args.update_baseline:
        save_baseline(baseline_path, results["flat_violations"])
        sys.exit(0)

    # Baseline comparison
    baseline_data = load_baseline(baseline_path)
    baseline_map = {item["key"]: item for item in baseline_data.get("items", [])}
    current_map = {item["key"]: item for item in results["flat_violations"]}

    regressions = [item for key, item in current_map.items() if key not in baseline_map]
    fixed_items = [item for key, item in baseline_map.items() if key not in current_map]
    preexisting = [item for key, item in current_map.items() if key in baseline_map]

    summary = {
        **results,
        "baseline_file": str(baseline_path),
        "baseline_violations_count": len(baseline_map),
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
            sys.exit(1 if results["total_violations_count"] > 0 else 0)
        sys.exit(1 if len(regressions) > 0 else 0)

    print("=" * 72)
    print("WCAG 2.1 AA ACCESSIBILITY AUDIT REPORT (axe-core)")
    print("=" * 72)
    print(f"Site Target         : {base_url} ({site_dir})")
    print(f"Pages Audited       : {results['total_pages_checked']}")
    print(f"Current Violations  : {results['total_violations_count']}")
    print(f"Rules Violated      : {results['unique_rules_violated']}")
    print(f"Baseline File       : {baseline_path.name} ({len(baseline_map)} accepted)")
    print(f"Regressions (NEW)   : {len(regressions)}")
    print(f"Fixed from Baseline : {len(fixed_items)}")
    print("-" * 72)

    if regressions:
        print(f"\n[FAIL] REBUILD REGRESSIONS / NEW ACCESSIBILITY VIOLATIONS ({len(regressions)}):")
        for item in regressions:
            print(f"  • {item['page']}: [{item['impact'].upper()}] {item['rule_id']} at {' > '.join(item['target'])}")
            print(f"    Help: {item['help']}")

    if fixed_items:
        print(f"\n[INFO] TECHNICAL DEBT BURNED DOWN / FIXED ({len(fixed_items)}):")
        for item in fixed_items:
            print(f"  ✓ {item['page']}: {item['rule_id']} at {' > '.join(item['target'])}")

    if preexisting:
        print(f"\n[INFO] ACCEPTED PRE-EXISTING TECHNICAL DEBT ({len(preexisting)} instances):")
        rule_counts = {}
        for item in preexisting:
            rule_counts[item["rule_id"]] = rule_counts.get(item["rule_id"], 0) + 1
        for rule_id, count in sorted(rule_counts.items(), key=lambda x: -x[1]):
            print(f"  • {rule_id:<20}: {count} instance(s)")

    print("\n" + "=" * 72)

    if args.strict:
        if results["total_violations_count"] > 0:
            print(f"STRICT MODE: Failing due to {results['total_violations_count']} total a11y violation(s).")
            sys.exit(1)
        print("STRICT MODE: Zero a11y violations. PASS.")
        sys.exit(0)

    if regressions:
        print(f"GATE FAILED: {len(regressions)} new accessibility regression(s) detected.")
        sys.exit(1)

    print(f"GATE PASSED: 0 regressions (all {len(preexisting)} findings match baseline technical debt).")
    sys.exit(0)


if __name__ == "__main__":
    main()
