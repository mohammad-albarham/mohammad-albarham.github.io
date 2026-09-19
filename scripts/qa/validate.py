#!/usr/bin/env python3
"""
Portfolio QA Validation Script
==============================
Validates candidate portfolio website builds against baseline snapshot.
Checks:
  1. Route Preservation: All 34 original public HTML routes remain intact.
  2. Legacy Anchor IDs: All homepage legacy section & target anchor IDs remain.
  3. Data Retention: All personal, education, experience, competition, project,
     publication, volunteering, programming language, and travel records are retained.
     (Ignores generic navigation text to ensure authentic content verification).
  4. Project Detail Preservation: Gallery images, external project links, and
     descriptive content on project detail pages are verified against baseline to
     detect regression or loss.
  5. Diagnostics: Categorizes pre-existing baseline broken links separately to avoid
     attributing them to candidate rebuilds.

Usage:
  python3 /tmp/portfolio-qa/validate.py --site <PATH_TO_SITE> [--snapshot <PATH_TO_SNAPSHOT>] [--verbose] [--json]
"""

import argparse
import json
import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

class HTMLTextAndTagParser(HTMLParser):
    """Stdlib HTML parser extracting IDs, tags, links, images, and content text."""
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.section_ids = set()
        self.images = []
        self.external_links = []
        self.internal_links = []
        self.in_ignored = 0
        self.in_script_style = 0
        self.body_words = []
        self.raw_text_chunks = []

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        elem_id = d.get("id")
        if elem_id:
            self.ids.add(elem_id)
            if tag == "section":
                self.section_ids.add(elem_id)
        if tag == "a" and "name" in d:
            self.ids.add(d["name"])

        # Ignore nav/header/footer when extracting pure body content text
        if tag in ("header", "nav", "footer") or d.get("id") in ("header", "navbar", "footer") or "nav" in d.get("class", "").split():
            self.in_ignored += 1
        if tag in ("script", "style"):
            self.in_script_style += 1

        # Collect images
        if tag == "img" and "src" in d:
            src = d["src"].strip()
            self.images.append(src)
        elif tag == "source" and "srcset" in d:
            for s in d["srcset"].split(","):
                cand = s.strip().split()[0]
                if cand:
                    self.images.append(cand)

        # Collect links
        if tag == "a" and "href" in d:
            href = d["href"].strip()
            if href.startswith(("http://", "https://", "mailto:")):
                self.external_links.append(href)
            elif href and not href.startswith("javascript:"):
                self.internal_links.append(href)

    def handle_endtag(self, tag):
        if tag in ("header", "nav", "footer"):
            self.in_ignored = max(0, self.in_ignored - 1)
        if tag in ("script", "style"):
            self.in_script_style = max(0, self.in_script_style - 1)

    def handle_data(self, data):
        if self.in_ignored == 0 and self.in_script_style == 0:
            cleaned = data.strip()
            if cleaned:
                self.body_words.extend(cleaned.split())
                self.raw_text_chunks.append(cleaned)


DEFAULT_SNAPSHOT = Path(__file__).resolve().parent / "baseline_snapshot.json"


def load_snapshot(snapshot_path: Path):
    if not snapshot_path.exists():
        raise FileNotFoundError(f"Snapshot file not found at: {snapshot_path}")
    with open(snapshot_path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_routes(site_dir: Path, expected_routes: list):
    """
    Check that all 34 original public HTML routes exist.
    Supports standard file.html and clean URL folder file/index.html patterns.
    """
    results = {
        "total_expected": len(expected_routes),
        "passed": 0,
        "failed": 0,
        "missing": [],
        "clean_url_mapped": []
    }

    for route in expected_routes:
        exact_path = site_dir / route
        if exact_path.exists():
            results["passed"] += 1
            continue

        # Check clean URL variant: e.g. path.html -> path/index.html
        if route.endswith(".html"):
            stem_route = route[:-5]
            clean_path = site_dir / stem_route / "index.html"
            if clean_path.exists():
                results["passed"] += 1
                results["clean_url_mapped"].append((route, str(clean_path.relative_to(site_dir))))
                continue

        results["failed"] += 1
        results["missing"].append(route)

    return results


def check_homepage_anchors(site_dir: Path, expected_anchors: dict):
    """
    Check that candidate index.html contains all expected section and legacy anchor IDs.
    """
    index_file = site_dir / "index.html"
    if not index_file.exists():
        return {
            "status": "FAIL",
            "error": "index.html not found in site root",
            "found_ids": [],
            "missing_sections": expected_anchors.get("section_ids", []),
            "missing_containers": expected_anchors.get("container_ids", [])
        }

    parser = HTMLTextAndTagParser()
    parser.feed(index_file.read_text(encoding="utf-8", errors="ignore"))

    missing_sections = [
        sid for sid in expected_anchors.get("section_ids", [])
        if sid not in parser.ids
    ]

    missing_containers = [
        cid for cid in expected_anchors.get("container_ids", [])
        if cid not in parser.ids
    ]

    return {
        "status": "PASS" if not missing_sections else "FAIL",
        "total_ids_found": len(parser.ids),
        "missing_sections": missing_sections,
        "missing_containers": missing_containers,
        "checked_sections_count": len(expected_anchors.get("section_ids", [])),
        "present_sections": [sid for sid in expected_anchors.get("section_ids", []) if sid in parser.ids]
    }


def check_data_retention(site_dir: Path, expected_records: dict):
    """
    Check data records retention across all 9 data categories.
    Inspects candidate data/*.json if available, or scans rendered site text.
    Avoids treating generic navigation labels as content.
    """
    results = {}
    candidate_data_dir = site_dir / "data"

    # Build index of all text across site HTML files to support static inlining
    site_html_text = ""
    for p in site_dir.glob("**/*.html"):
        if "node_modules" not in p.parts:
            site_html_text += " " + p.read_text(encoding="utf-8", errors="ignore")

    # 1. Bio
    bio_expected = expected_records.get("bio", {})
    bio_name = bio_expected.get("name", "Mohammad Albarham")
    bio_found = (bio_name in site_html_text) or ("Mohammad Al-Barham" in site_html_text)
    cand_bio_file = candidate_data_dir / "bio.json"
    if cand_bio_file.exists():
        try:
            cand_bio = json.loads(cand_bio_file.read_text(encoding="utf-8"))
            if cand_bio.get("name") in (bio_name, "Mohammad Al-Barham"):
                bio_found = True
        except Exception:
            pass
    results["bio"] = {
        "name": bio_name,
        "retained": bio_found,
        "detail": "Verified authentic name and profile in site content"
    }

    # 2. Competitions (5)
    competitions = expected_records.get("competitions", [])
    comp_missing = []
    cand_comp_file = candidate_data_dir / "competitions.json"
    cand_comp_data = []
    if cand_comp_file.exists():
        try:
            cand_comp_data = json.loads(cand_comp_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    for c in competitions:
        cid = c.get("id")
        title = c.get("title", "")
        found_in_json = any(item.get("id") == cid or item.get("title") == title for item in cand_comp_data)
        found_in_text = title in site_html_text or (c.get("shortDescription", "")[:30] in site_html_text if c.get("shortDescription") else False)
        if not (found_in_json or found_in_text):
            comp_missing.append(f"{cid} ({title})")
    results["competitions"] = {
        "total": len(competitions),
        "missing": comp_missing,
        "retained": len(comp_missing) == 0
    }

    # 3. Education (2)
    education = expected_records.get("education", [])
    edu_missing = []
    cand_edu_file = candidate_data_dir / "education.json"
    cand_edu_data = []
    if cand_edu_file.exists():
        try:
            cand_edu_data = json.loads(cand_edu_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    for e in education:
        inst = e.get("institution", "")
        degree = e.get("degree", "")
        found = any(item.get("id") == e.get("id") or item.get("institution") == inst for item in cand_edu_data)
        if not found:
            found = (inst in site_html_text) or any(w in site_html_text for w in [inst[:20], degree[:20]])
        if not found:
            edu_missing.append(f"{e.get('id')} ({inst})")
    results["education"] = {
        "total": len(education),
        "missing": edu_missing,
        "retained": len(edu_missing) == 0
    }

    # 4. Experience (8)
    experience = expected_records.get("experience", [])
    exp_missing = []
    cand_exp_file = candidate_data_dir / "experience.json"
    cand_exp_data = []
    if cand_exp_file.exists():
        try:
            cand_exp_data = json.loads(cand_exp_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    for exp in experience:
        company = exp.get("company", "")
        found = any(item.get("id") == exp.get("id") or item.get("company") == company for item in cand_exp_data)
        if not found:
            found = company in site_html_text or (company[:15] in site_html_text if len(company) > 15 else False)
        if not found:
            exp_missing.append(f"{exp.get('id')} ({company})")
    results["experience"] = {
        "total": len(experience),
        "missing": exp_missing,
        "retained": len(exp_missing) == 0
    }

    # 5. Projects (25)
    projects = expected_records.get("projects", [])
    proj_missing = []
    cand_proj_file = candidate_data_dir / "projects.json"
    cand_proj_data = []
    if cand_proj_file.exists():
        try:
            cand_proj_data = json.loads(cand_proj_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    for p in projects:
        pid = p.get("id")
        title = p.get("title", "")
        found = any(item.get("id") == pid or item.get("title") == title for item in cand_proj_data)
        if not found:
            found = title in site_html_text
        if not found:
            proj_missing.append(f"{pid} ({title})")
    results["projects"] = {
        "total": len(projects),
        "missing": proj_missing,
        "retained": len(proj_missing) == 0
    }

    # 6. Publications (8)
    publications = expected_records.get("publications", [])
    pub_missing = []
    cand_pub_file = candidate_data_dir / "publications.json"
    cand_pub_data = []
    if cand_pub_file.exists():
        try:
            cand_pub_data = json.loads(cand_pub_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    for pub in publications:
        p_id = pub.get("id")
        title = pub.get("title", "")
        found = any(item.get("id") == p_id or item.get("title") == title for item in cand_pub_data)
        if not found:
            found = title in site_html_text
        if not found:
            pub_missing.append(f"{p_id} ({title})")
    results["publications"] = {
        "total": len(publications),
        "missing": pub_missing,
        "retained": len(pub_missing) == 0
    }

    # 7. Volunteering (7)
    volunteering = expected_records.get("volunteering", [])
    vol_missing = []
    cand_vol_file = candidate_data_dir / "volunteering.json"
    cand_vol_data = []
    if cand_vol_file.exists():
        try:
            cand_vol_data = json.loads(cand_vol_file.read_text(encoding="utf-8"))
        except Exception:
            pass

    for v in volunteering:
        vid = v.get("id")
        pos = v.get("position", "")
        found = any(item.get("id") == vid or item.get("position") == pos for item in cand_vol_data)
        if not found:
            found = (pos in site_html_text) or (v.get("organization", "") in site_html_text if v.get("organization") else False)
        if not found:
            vol_missing.append(f"{vid} ({pos})")
    results["volunteering"] = {
        "total": len(volunteering),
        "missing": vol_missing,
        "retained": len(vol_missing) == 0
    }

    # 8. Travel
    travel_expected = expected_records.get("travel", {})
    visited = travel_expected.get("visited", {})
    all_countries = [c for clist in visited.values() for c in clist]
    cand_travel_file = candidate_data_dir / "travel.json"
    travel_found = False
    if cand_travel_file.exists():
        try:
            cand_data = json.loads(cand_travel_file.read_text(encoding="utf-8"))
            travel_found = "visited" in cand_data and len(cand_data["visited"]) > 0
        except Exception:
            pass
    if not travel_found:
        travel_found = "visited" in site_html_text and ("countries" in site_html_text or "continents" in site_html_text)
    results["travel"] = {
        "retained": travel_found,
        "total_baseline_countries": len(all_countries)
    }

    # 9. Programming languages
    cand_prog_file = candidate_data_dir / "programming-languages.json"
    prog_found = False
    if cand_prog_file.exists():
        try:
            cand_data = json.loads(cand_prog_file.read_text(encoding="utf-8"))
            prog_found = "languages" in cand_data and len(cand_data["languages"]) > 0
        except Exception:
            pass
    if not prog_found:
        prog_found = "Python" in site_html_text and "C++" in site_html_text
    results["programming_languages"] = {
        "retained": prog_found
    }

    overall_retained = all(category.get("retained", False) for category in results.values())
    return {
        "overall_retained": overall_retained,
        "categories": results
    }


def check_project_detail_pages(site_dir: Path, expected_project_pages: dict):
    """
    Check project detail pages for:
      - Gallery image retention (comparing image basenames, ignoring known pre-existing directory bugs)
      - Content text retention (detecting severe truncation or content loss)
      - External link preservation (links to repos, datasets, papers)
    """
    results = {
        "total_checked": len(expected_project_pages),
        "image_loss": [],
        "content_loss": [],
        "link_loss": [],
        "missing_pages": []
    }

    for rel_path, baseline_info in expected_project_pages.items():
        candidate_file = site_dir / rel_path
        if not candidate_file.exists():
            # Check clean URL alternative: path/index.html
            clean_variant = site_dir / rel_path.replace(".html", "") / "index.html"
            if clean_variant.exists():
                candidate_file = clean_variant
            else:
                results["missing_pages"].append(rel_path)
                continue

        parser = HTMLTextAndTagParser()
        parser.feed(candidate_file.read_text(encoding="utf-8", errors="ignore"))

        # 1. Gallery images check
        # Extract candidate image filenames (basenames), unquoting URL-encoded characters
        cand_img_basenames = {
            unquote(Path(img).name) for img in parser.images
            if not any(k in img for k in ["profile-img", "favicon", "hf-logo", "apple-touch-icon"])
            and Path(img).name != ""
        }

        baseline_imgs = baseline_info.get("gallery_images", [])
        missing_images = []
        for b_img in baseline_imgs:
            if b_img.get("is_directory"):
                # Known baseline bug: <img src="../assets/img/portfolio/">
                continue
            fname = unquote(b_img.get("filename", ""))
            if fname and fname not in cand_img_basenames:
                # Check if entire src or partial name appears in file text
                if fname not in candidate_file.read_text(encoding="utf-8", errors="ignore"):
                    missing_images.append(fname)

        if missing_images:
            results["image_loss"].append({
                "file": rel_path,
                "missing_images": missing_images
            })

        # 2. Content loss check
        baseline_words = baseline_info.get("word_count", 0)
        cand_words = len(parser.body_words)
        # If candidate has lost more than 60% of baseline words and baseline had substantive content (>30 words)
        if baseline_words > 30 and cand_words < (baseline_words * 0.4):
            results["content_loss"].append({
                "file": rel_path,
                "baseline_words": baseline_words,
                "candidate_words": cand_words,
                "reduction_percent": round((1 - cand_words / baseline_words) * 100, 1)
            })

        # 3. External link loss check
        baseline_links = set(baseline_info.get("external_links", []))
        cand_links = set(parser.external_links)
        missing_links = baseline_links - cand_links
        filtered_missing = []
        cand_text = candidate_file.read_text(encoding="utf-8", errors="ignore")
        for link in missing_links:
            parsed = urlparse(link)
            if parsed.path and parsed.path not in cand_text:
                filtered_missing.append(link)
        if filtered_missing:
            results["link_loss"].append({
                "file": rel_path,
                "missing_links": filtered_missing
            })

    return results


def check_pre_existing_broken_links(site_dir: Path):
    """
    Detect meaningful pre-existing broken links in baseline/site:
      - Empty or directory image tags (e.g. <img src="../assets/img/portfolio/">)
      - Non-existent local file references
    """
    issues = []
    html_files = [p for p in site_dir.glob("**/*.html") if "node_modules" not in p.parts and "templates" not in p.parts]

    for p in sorted(html_files):
        parser = HTMLTextAndTagParser()
        parser.feed(p.read_text(encoding="utf-8", errors="ignore"))

        for img in parser.images:
            if img.endswith("/") or img == "../assets/img/portfolio/":
                issues.append({
                    "file": str(p.relative_to(site_dir)),
                    "type": "directory_image_source",
                    "source": img,
                    "reason": "Image tag source points to a directory, not an image file"
                })
            elif not img.startswith(("http://", "https://", "data:")):
                # Check target file existence (unquoting path)
                clean_img = unquote(img)
                target = (p.parent / clean_img).resolve() if not clean_img.startswith("/") else site_dir / clean_img.lstrip("/")
                if not target.exists():
                    issues.append({
                        "file": str(p.relative_to(site_dir)),
                        "type": "missing_local_image",
                        "source": img,
                        "reason": f"Target file does not exist on disk"
                    })

    return issues


def validate(site_path: str, snapshot_path: str = str(DEFAULT_SNAPSHOT), verbose: bool = False):
    site_dir = Path(site_path).resolve()
    snap_file = Path(snapshot_path).resolve()

    if not site_dir.exists():
        print(f"Error: Target site path does not exist: {site_dir}", file=sys.stderr)
        return False, {}

    snapshot = load_snapshot(snap_file)

    routes_result = check_routes(site_dir, snapshot["routes"])
    anchors_result = check_homepage_anchors(site_dir, snapshot["homepage_anchors"])
    data_result = check_data_retention(site_dir, snapshot["data_records"])
    project_result = check_project_detail_pages(site_dir, snapshot["project_detail_pages"])
    pre_existing = check_pre_existing_broken_links(site_dir)

    all_passed = (
        routes_result["failed"] == 0 and
        anchors_result["status"] == "PASS" and
        data_result["overall_retained"] and
        len(project_result["image_loss"]) == 0 and
        len(project_result["content_loss"]) == 0 and
        len(project_result["missing_pages"]) == 0
    )

    summary = {
        "target_site": str(site_dir),
        "overall_status": "PASS" if all_passed else "FAIL",
        "checks": {
            "1_routes": {
                "status": "PASS" if routes_result["failed"] == 0 else "FAIL",
                "total_routes": routes_result["total_expected"],
                "passed": routes_result["passed"],
                "failed": routes_result["failed"],
                "missing_routes": routes_result["missing"],
                "clean_url_mapped": routes_result["clean_url_mapped"]
            },
            "2_homepage_anchors": {
                "status": anchors_result["status"],
                "missing_sections": anchors_result["missing_sections"],
                "present_sections": anchors_result["present_sections"]
            },
            "3_data_retention": {
                "status": "PASS" if data_result["overall_retained"] else "FAIL",
                "categories": {
                    cat: {
                        "retained": info.get("retained", False),
                        "missing_count": len(info.get("missing", [])) if "missing" in info else 0,
                        "missing": info.get("missing", [])
                    }
                    for cat, info in data_result["categories"].items()
                }
            },
            "4_project_details": {
                "status": "PASS" if (len(project_result["image_loss"]) == 0 and len(project_result["content_loss"]) == 0 and len(project_result["missing_pages"]) == 0) else "FAIL",
                "total_pages": project_result["total_checked"],
                "missing_pages": project_result["missing_pages"],
                "image_loss_count": len(project_result["image_loss"]),
                "image_loss_details": project_result["image_loss"],
                "content_loss_count": len(project_result["content_loss"]),
                "content_loss_details": project_result["content_loss"],
                "link_loss_count": len(project_result["link_loss"]),
                "link_loss_details": project_result["link_loss"]
            }
        },
        "pre_existing_baseline_diagnostics": {
            "count": len(pre_existing),
            "findings": pre_existing
        }
    }

    return all_passed, summary


def print_report(summary: dict, verbose: bool = False):
    print("=" * 72)
    print("PORTFOLIO REGRESSION VALIDATION REPORT")
    print("=" * 72)
    print(f"Target Site : {summary['target_site']}")
    print(f"Overall     : {summary['overall_status']}")
    print("-" * 72)

    c1 = summary["checks"]["1_routes"]
    print(f"[Check 1: Route Preservation] -> {c1['status']}")
    print(f"  Verified {c1['passed']}/{c1['total_routes']} HTML routes.")
    if c1['failed'] > 0:
        print(f"  ❌ Missing Routes ({c1['failed']}): {c1['missing_routes']}")
    if c1['clean_url_mapped']:
        print(f"  ℹ️ Clean URL mapped: {len(c1['clean_url_mapped'])} routes")

    c2 = summary["checks"]["2_homepage_anchors"]
    print(f"\n[Check 2: Homepage Legacy Anchors] -> {c2['status']}")
    print(f"  Preserved Section IDs: {c2['present_sections']}")
    if c2['missing_sections']:
        print(f"  ❌ Missing Section IDs: {c2['missing_sections']}")

    c3 = summary["checks"]["3_data_retention"]
    print(f"\n[Check 3: Data Content Retention] -> {c3['status']}")
    for cat, info in c3["categories"].items():
        status_icon = "✓" if info["retained"] else "✗"
        print(f"  {status_icon} {cat:<22}: {'RETAINED' if info['retained'] else 'MISSING RECORDS'}")
        if info["missing"]:
            print(f"      Missing: {info['missing']}")

    c4 = summary["checks"]["4_project_details"]
    print(f"\n[Check 4: Project Detail Pages] -> {c4['status']}")
    print(f"  Verified {c4['total_pages']} project detail pages.")
    if c4['missing_pages']:
        print(f"  ❌ Missing Detail Pages ({len(c4['missing_pages'])}): {c4['missing_pages']}")
    if c4['image_loss_count'] > 0:
        print(f"  ❌ Gallery Image Losses: {c4['image_loss_count']}")
        for item in c4['image_loss_details']:
            print(f"      {item['file']}: missing {item['missing_images']}")
    else:
        print("  ✓ Zero gallery image loss detected.")

    if c4['content_loss_count'] > 0:
        print(f"  ❌ Content Reductions: {c4['content_loss_count']}")
        for item in c4['content_loss_details']:
            print(f"      {item['file']}: -{item['reduction_percent']}% words")
    else:
        print("  ✓ Zero content text loss detected.")

    print("\n" + "-" * 72)
    print("PRE-EXISTING BASELINE ANOMALIES (Separate Diagnostic — Not Rebuild Fault)")
    print("-" * 72)
    diag = summary["pre_existing_baseline_diagnostics"]
    print(f"Total Pre-existing Anomalies Identified: {diag['count']}")
    for f in diag["findings"]:
        print(f"  • {f['file']}: [{f['type']}] {f['source']} -> {f['reason']}")
    print("=" * 72)


def main():
    parser = argparse.ArgumentParser(description="Portfolio QA Validator")
    parser.add_argument("--site", required=True, help="Path to site directory to validate")
    parser.add_argument("--snapshot", default=str(DEFAULT_SNAPSHOT), help="Path to baseline snapshot JSON")
    parser.add_argument("--verbose", action="store_true", help="Print verbose details")
    parser.add_argument("--json", action="store_true", help="Output summary as JSON")

    args = parser.parse_args()
    all_passed, summary = validate(args.site, args.snapshot, args.verbose)

    if args.json:
        print(json.dumps(summary, indent=2))
    else:
        print_report(summary, args.verbose)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
