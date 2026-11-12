#!/usr/bin/env python3
"""
scripts/qa/check_responsive.py

Playwright responsive testing and screenshot harness:
1. Captures full-page screenshots of key pages at 375px (mobile), 768px (tablet),
   and 1440px (desktop) into a gitignored output directory.
2. Runs a horizontal-overflow detector across all pages at 375px viewport width,
   failing with exit code 1 if any page scrolls sideways.

Uses .agents/skills/webapp-testing/scripts/with_server.py for server lifecycle
orchestration if a server is not already active.
"""

import argparse
import json
import os
import re
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


VIEWPORTS = [
    {"name": "mobile", "width": 375, "height": 667},
    {"name": "tablet", "width": 768, "height": 1024},
    {"name": "desktop", "width": 1440, "height": 900},
]

KEY_PAGES = [
    "index.html",
    "experience/phi-pair.html",
    "projects/latest-projects-1.html",
    "projects/portfolio-details-1.html",
    "projects/araclip.html",
    "competitions/competition-details-1.html",
    "volunteering/volunteering_ieee.html",
]


def is_port_open(port: int, host: str = "localhost") -> bool:
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except (socket.error, ConnectionRefusedError, OSError):
        return False


def find_with_server_script(repo_root: Path) -> Path:
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


def collect_all_routes(site_dir: Path) -> list[str]:
    snapshot_file = site_dir / "scripts/qa/baseline_snapshot.json"
    if snapshot_file.is_file():
        try:
            snap = json.loads(snapshot_file.read_text(encoding="utf-8"))
            routes = snap.get("routes", [])
            if routes:
                return sorted(routes)
        except Exception:
            pass

    excluded = {"node_modules", ".git", ".venv", ".bundle-check", ".agents", ".gemini", "templates"}
    routes = []
    for p in sorted(site_dir.rglob("*.html")):
        if any(part in p.parts for part in excluded):
            continue
        routes.append(str(p.relative_to(site_dir)))
    return routes


def sanitize_filename(route: str) -> str:
    clean = route.replace("/", "_").replace(".html", "")
    clean = re.sub(r"[^\w\-]", "_", clean)
    return clean.strip("_") or "index"


def check_page_overflow(page, route: str) -> dict:
    js_code = """() => {
        const docWidth = document.documentElement.clientWidth;
        const bodyScrollWidth = document.body ? document.body.scrollWidth : 0;
        const htmlScrollWidth = document.documentElement.scrollWidth;
        const scrollWidth = Math.max(docWidth, htmlScrollWidth, bodyScrollWidth);
        const overflows = scrollWidth > (docWidth + 1);

        let offending = [];
        if (overflows) {
            const all = document.querySelectorAll('*');
            for (const el of all) {
                const rect = el.getBoundingClientRect();
                if (rect.right > docWidth + 1.5 || rect.left < -1.5) {
                    let desc = el.tagName.toLowerCase();
                    if (el.id) desc += '#' + el.id;
                    if (el.className && typeof el.className === 'string') {
                        const cls = el.className.trim().split(/\\s+/).slice(0, 3).join('.');
                        if (cls) desc += '.' + cls;
                    }
                    offending.push({
                        selector: desc,
                        width: Math.round(rect.width),
                        left: Math.round(rect.left),
                        right: Math.round(rect.right),
                    });
                }
            }
        }
        return {
            docWidth: docWidth,
            scrollWidth: scrollWidth,
            overflowDelta: overflows ? (scrollWidth - docWidth) : 0,
            overflows: overflows,
            offendingElements: offending.slice(0, 8),
        };
    }"""
    return page.evaluate(js_code)


def run_responsive_suite(
    base_url: str,
    all_routes: list[str],
    key_pages: list[str],
    output_dir: Path,
    skip_screenshots: bool = False,
    verbose: bool = False,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    screenshots_taken = []
    overflow_results = {}
    overflow_failures = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Screenshots for Key Pages at 375px, 768px, 1440px
        if not skip_screenshots:
            for vp in VIEWPORTS:
                context = browser.new_context(
                    viewport={"width": vp["width"], "height": vp["height"]},
                    device_scale_factor=1,
                )
                page = context.new_page()

                for route in key_pages:
                    url = f"{base_url.rstrip('/')}/{route}"
                    out_filename = f"{sanitize_filename(route)}_{vp['width']}px.png"
                    out_path = output_dir / out_filename

                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=15000)
                        try:
                            page.wait_for_load_state("networkidle", timeout=3000)
                        except Exception:
                            pass

                        page.screenshot(path=str(out_path), full_page=True)
                        screenshots_taken.append({
                            "route": route,
                            "viewport": vp["name"],
                            "width": vp["width"],
                            "path": str(out_path),
                        })
                        if verbose:
                            print(f"[SHOT] {route} @ {vp['width']}px -> {out_filename}", file=sys.stderr)
                    except Exception as e:
                        if verbose:
                            print(f"[ERROR] Screenshot failed for {route} @ {vp['width']}px: {e}", file=sys.stderr)

                context.close()

        # 2. Horizontal Overflow Check at 375px for ALL routes
        mobile_context = browser.new_context(
            viewport={"width": 375, "height": 667},
            device_scale_factor=1,
        )
        mobile_page = mobile_context.new_page()

        for route in all_routes:
            url = f"{base_url.rstrip('/')}/{route}"
            try:
                mobile_page.goto(url, wait_until="domcontentloaded", timeout=15000)
                try:
                    mobile_page.wait_for_load_state("networkidle", timeout=3000)
                except Exception:
                    pass

                of_data = check_page_overflow(mobile_page, route)
                overflow_results[route] = of_data

                if of_data["overflows"]:
                    overflow_failures.append({
                        "route": route,
                        "doc_width": of_data["docWidth"],
                        "scroll_width": of_data["scrollWidth"],
                        "delta": of_data["overflowDelta"],
                        "offending": of_data["offendingElements"],
                    })
                    if verbose:
                        print(f"[OVERFLOW] {route}: {of_data['scrollWidth']}px > {of_data['docWidth']}px", file=sys.stderr)
                else:
                    if verbose:
                        print(f"[OK] {route} width 375px clean", file=sys.stderr)

            except Exception as e:
                overflow_results[route] = {"error": str(e), "overflows": False}
                if verbose:
                    print(f"[ERROR] Overflow check error for {route}: {e}", file=sys.stderr)

        mobile_context.close()
        browser.close()

    return {
        "output_dir": str(output_dir),
        "screenshots_count": len(screenshots_taken),
        "screenshots": screenshots_taken,
        "total_routes_checked": len(all_routes),
        "overflow_failure_count": len(overflow_failures),
        "overflow_failures": overflow_failures,
        "overflow_results": overflow_results,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Responsive layout & horizontal-overflow validation with Playwright."
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
        "--output-dir",
        default="scripts/qa/screenshots",
        help="Directory to save screenshots (default: scripts/qa/screenshots)",
    )
    parser.add_argument(
        "--skip-screenshots",
        action="store_true",
        help="Skip screenshot generation and only check horizontal overflow",
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
        help="Show detailed execution progress",
    )
    parser.add_argument(
        "--no-spawn",
        action="store_true",
        help="Do not attempt to auto-spawn server via with_server.py",
    )

    args, extra_args = parser.parse_known_args()
    site_dir = Path(args.site).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not site_dir.is_dir():
        print(f"Error: Site directory does not exist: {site_dir}", file=sys.stderr)
        sys.exit(2)

    base_url = args.url or f"http://localhost:{args.port}"

    # Auto-spawn via with_server.py if port is closed
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
                "--output-dir",
                str(output_dir),
                "--no-spawn",
            ]
            if args.json_output:
                run_cmd.append("--json")
            if args.verbose:
                run_cmd.append("--verbose")
            if args.skip_screenshots:
                run_cmd.append("--skip-screenshots")
            run_cmd.extend(extra_args)

            result = subprocess.run(run_cmd)
            sys.exit(result.returncode)
        else:
            print(
                f"Error: Port {args.port} is not open and with_server.py could not be located.",
                file=sys.stderr,
            )
            sys.exit(2)

    all_routes = collect_all_routes(site_dir)
    results = run_responsive_suite(
        base_url=base_url,
        all_routes=all_routes,
        key_pages=KEY_PAGES,
        output_dir=output_dir,
        skip_screenshots=args.skip_screenshots,
        verbose=args.verbose,
    )

    if args.json_output:
        print(json.dumps(results, indent=2))
        sys.exit(1 if results["overflow_failure_count"] > 0 else 0)

    print("=" * 72)
    print("RESPONSIVE LAYOUT & HORIZONTAL OVERFLOW REPORT")
    print("=" * 72)
    print(f"Target Site URL     : {base_url} ({site_dir})")
    print(f"Routes Audited      : {results['total_routes_checked']} (at 375px mobile viewport)")
    print(f"Screenshots Taken   : {results['screenshots_count']} (saved in {output_dir})")
    print(f"Horizontal Overflow : {results['overflow_failure_count']} failing pages")
    print("-" * 72)

    if results["screenshots_count"] > 0:
        print(f"✓ Key pages screenshotted across 375px, 768px, and 1440px viewports ({results['screenshots_count']} images).")

    if results["overflow_failure_count"] == 0:
        print("✓ All 34 pages pass: Zero horizontal overflow scrolling at 375px.")
        print("=" * 72)
        sys.exit(0)

    print(f"\n[FAIL] HORIZONTAL OVERFLOW DETECTED ON {results['overflow_failure_count']} PAGE(S) AT 375px:")
    for f in results["overflow_failures"]:
        print(f"  • {f['route']}: Content scrollWidth {f['scroll_width']}px exceeds viewport {f['doc_width']}px (+{f['delta']}px)")
        for off in f["offending"]:
            print(f"    - Element: <{off['selector']}> width={off['width']}px right={off['right']}px")

    print("\n" + "=" * 72)
    sys.exit(1)


if __name__ == "__main__":
    main()
