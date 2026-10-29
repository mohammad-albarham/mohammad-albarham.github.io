#!/usr/bin/env python3
"""End-to-end checks + screenshots, driven by Playwright.

Run through the site server so root-relative URLs behave exactly as they do on
GitHub Pages:

    .venv/bin/python .agents/skills/webapp-testing/scripts/with_server.py \
        --server "python3 -m http.server 8765" --port 8765 \
        -- .venv/bin/python tests/e2e.py

Screenshots land in tests/screenshots/. Any console error on any visited page
fails the run, as does a failed request for a same-origin asset.
"""

from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:8765"
SHOTS = Path(__file__).resolve().parent / "screenshots"
DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}

failures: list[str] = []
passes: list[str] = []


def check(condition: bool, label: str) -> bool:
    (passes if condition else failures).append(label)
    print(("  ok        " if condition else "  FAIL      ") + label)
    return condition


def watch(page):
    """Collect console errors and failed same-origin requests."""
    problems: list[str] = []
    page.on("console", lambda m: problems.append(f"console.{m.type}: {m.text}")
            if m.type == "error" else None)
    page.on("requestfailed", lambda r: problems.append(f"request failed: {r.url}")
            if r.url.startswith(BASE) else None)
    return problems


def shoot(page, name: str, *, full: bool = True) -> None:
    SHOTS.mkdir(parents=True, exist_ok=True)
    if full:
        # Images are loading="lazy"; walk the page so a full-page capture shows
        # what a reader actually sees rather than empty placeholders.
        page.evaluate("""async () => {
            const step = window.innerHeight * 0.8;
            for (let y = 0; y < document.body.scrollHeight; y += step) {
                window.scrollTo(0, y);
                await new Promise(r => setTimeout(r, 60));
            }
            window.scrollTo(0, 0);
        }""")
        page.wait_for_load_state("networkidle")
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)
    print(f"            screenshot tests/screenshots/{name}.png")


def run(browser) -> None:
    # --- desktop pass: every page, with console watching -------------------
    context = browser.new_context(viewport=DESKTOP, device_scale_factor=1)
    page = context.new_page()
    problems = watch(page)

    routes = [
        ("/", "home"),
        ("/about/", "about"),
        ("/experience/", "experience"),
        ("/education/", "education"),
        ("/projects/", "projects"),
        ("/research/", "research"),
        ("/competitions/", "competitions"),
        ("/volunteering/", "volunteering"),
        ("/contact/", "contact"),
        ("/projects/latest-projects-5.html", "detail-project"),
        ("/competitions/competition-details-1.html", "detail-competition"),
        ("/experience/phi-pair.html", "detail-experience"),
        ("/volunteering/volunteering_ieee.html", "detail-gallery"),
    ]
    for route, name in routes:
        response = page.goto(BASE + route, wait_until="networkidle")
        check(response is not None and response.ok, f"GET {route} -> {response.status if response else 'no response'}")
        check(page.locator("h1").count() >= 1, f"{route} has an <h1>")
        shoot(page, f"desktop-{name}")

    # --- resume redirect --------------------------------------------------
    response = page.goto(BASE + "/resume/", wait_until="networkidle")
    check(response is not None and response.ok, "GET /resume/ -> 200")
    check(page.url.endswith("/experience/"), f"/resume/ forwards to /experience/ (got {page.url})")

    # --- legacy routes all answer -----------------------------------------
    legacy = [f"/projects/portfolio-details-{n}.html" for n in
              [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20, 21]]
    legacy += [f"/projects/latest-projects-{n}.html" for n in range(1, 6)]
    legacy += [f"/competitions/competition-details-{n}.html" for n in range(1, 6)]
    legacy += ["/projects/araclip.html", "/experience/phi-pair.html",
               "/volunteering/volunteering_ieee.html"]
    bad = []
    for route in legacy:
        response = page.goto(BASE + route, wait_until="domcontentloaded")
        if not (response and response.ok and page.locator(".detail-body").count() == 1):
            bad.append(route)
    check(not bad, f"all {len(legacy)} legacy detail routes serve a restyled page"
                   + (f" (failed: {bad})" if bad else ""))

    # --- homepage anchors still resolve ------------------------------------
    page.goto(BASE + "/", wait_until="networkidle")
    anchors = ["hero", "about", "programming-languages", "resume", "projects",
               "competitions", "publications", "volunteering", "travel", "contact"]
    missing = [a for a in anchors if page.locator(f"#{a}").count() == 0]
    check(not missing, f"all {len(anchors)} legacy homepage anchors present"
                       + (f" (missing: {missing})" if missing else ""))

    # Each of those sections now lives on its own page, so an old deep link has
    # to land there rather than on a homepage that no longer holds the content.
    for anchor, target in [("travel", "/about/#travel"),
                           ("competitions", "/competitions/"),
                           ("contact", "/contact/")]:
        page.goto(BASE + "/", wait_until="domcontentloaded")
        page.evaluate("hash => { location.hash = hash; }", anchor)
        page.wait_for_url(f"**{target}", timeout=5000, wait_until="domcontentloaded")
        check(page.url.endswith(target), f"/#{anchor} forwards to {target} (got {page.url})")

    # --- project filter -----------------------------------------------------
    page.goto(BASE + "/projects/", wait_until="networkidle")
    total = page.locator("#all-projects .work-card").count()
    check(total == 25, f"projects page lists every project ({total} cards)")
    chip = page.locator('.filter-chip[data-tech-value="PyTorch"]')
    check(chip.count() == 1, "a PyTorch filter chip exists")
    chip.first.click()
    visible = page.locator("#all-projects .work-card:not(.is-hidden)").count()
    check(0 < visible < total, f"filtering narrows the grid ({visible} of {total})")
    check("of 25 projects tagged PyTorch" in page.locator("#all-projects-status").inner_text(),
          "filter status is announced")
    page.locator('.filter-chip[data-tech-value="all"]').click()
    check(page.locator("#all-projects .work-card:not(.is-hidden)").count() == total,
          "'All projects' restores the full grid")
    shoot(page, "desktop-projects-filtered")

    # --- BibTeX & Research (no competitions on research page) ---------------
    page.goto(BASE + "/research/", wait_until="networkidle")
    check(page.locator("#all-publications .pub").count() == 8, "research page lists all 8 publications")
    check(page.locator("#competitions").count() == 0, "research page no longer contains #competitions section")
    check(page.locator(".award-card").count() == 0, "research page no longer contains award cards")
    details = page.locator("details").first
    details.locator("summary").click()
    check(details.locator("pre").is_visible(), "BibTeX opens")
    check("@" in details.locator("pre").inner_text(), "BibTeX entry has content")
    button = details.locator(".copy-bibtex")
    button.click()
    page.wait_for_timeout(250)
    check(button.inner_text() != "Copy BibTeX",
          f"copy button reports what happened ('{button.inner_text()}')")

    # --- Competitions page --------------------------------------------------
    page.goto(BASE + "/competitions/", wait_until="networkidle")
    check(page.locator(".award-card").count() == 5, "competitions page lists all 5 competitions")
    check(page.locator("#competitions").count() >= 1, "competitions page has #competitions section")

    # --- contact ------------------------------------------------------------
    page.goto(BASE + "/contact/", wait_until="networkidle")
    mailto = page.locator('a[href^="mailto:"]')
    check(mailto.count() >= 1, f"{mailto.count()} mailto: links on the contact page")
    check(mailto.first.get_attribute("href") == "mailto:mohammad.albarham.work@gmail.com",
          "mailto: points at the real address")
    check(page.locator("form").count() == 0, "no contact form pretending to send anything")

    # --- travel map ---------------------------------------------------------
    page.goto(BASE + "/about/#travel", wait_until="networkidle")
    page.wait_for_timeout(1500)
    check(page.locator("#travel-map svg").count() == 1, "travel map renders after lazy load")
    check(page.locator(".country-list li").count() == 24,
          "country list is in the HTML before any script runs")

    check(not problems, "no console errors or failed requests on the desktop pass"
                        + (f" ({problems[:6]})" if problems else ""))
    context.close()

    # --- mobile pass --------------------------------------------------------
    context = browser.new_context(viewport=MOBILE, device_scale_factor=2, is_mobile=True,
                                  has_touch=True)
    page = context.new_page()
    mobile_problems = watch(page)
    page.goto(BASE + "/", wait_until="networkidle")

    pills = page.locator("#nav-pills")
    check(not pills.is_visible(), "mobile nav is collapsed on load")
    toggle = page.locator(".nav-toggle")
    check(toggle.is_visible(), "mobile nav toggle is visible")
    toggle.click()
    check(pills.is_visible(), "mobile nav opens")
    check(toggle.get_attribute("aria-expanded") == "true", "aria-expanded tracks the disclosure")
    shoot(page, "mobile-home-nav-open", full=False)
    pills.locator('a[href="/projects/"]').click()
    page.wait_for_load_state("networkidle")
    check(page.url.endswith("/projects/"), "mobile nav navigates")
    check(not page.locator("#nav-pills").is_visible(), "mobile nav closes after navigating")

    # No horizontal overflow anywhere on a phone.
    for route, name in [("/", "mobile-home"), ("/projects/", "mobile-projects"),
                        ("/research/", "mobile-research"), ("/competitions/", "mobile-competitions"),
                        ("/about/", "mobile-about"),
                        ("/experience/", "mobile-experience"), ("/education/", "mobile-education"),
                        ("/volunteering/", "mobile-volunteering"),
                        ("/contact/", "mobile-contact"),
                        ("/projects/latest-projects-5.html", "mobile-detail")]:
        page.goto(BASE + route, wait_until="networkidle")
        overflow = page.evaluate(
            "() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(overflow <= 1, f"{route} has no horizontal overflow on a 390px viewport ({overflow}px)")
        shoot(page, name)

    check(not mobile_problems, "no console errors or failed requests on the mobile pass"
                               + (f" ({mobile_problems[:6]})" if mobile_problems else ""))
    context.close()


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            run(browser)
        finally:
            browser.close()
    print()
    print(f"{len(passes)} passed, {len(failures)} failed")
    for failure in failures:
        print(f"  FAIL  {failure}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
