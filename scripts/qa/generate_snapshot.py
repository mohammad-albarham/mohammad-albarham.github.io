#!/usr/bin/env python3
"""
Generate baseline snapshot for Mohammad Al-Barham's portfolio website.
Captures:
1. All 34 public HTML routes
2. Homepage legacy anchor and container IDs
3. All structured data records across 9 data files
4. Content, gallery images, and external links for all project detail pages
5. Pre-existing baseline broken references and anomalies
"""

import json
import re
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote

BASELINE_PATH = Path("/Users/pain/orca/workspaces/mohammad-albarham.github.io/website-foundation")
OUTPUT_PATH = Path("/tmp/portfolio-qa/baseline_snapshot.json")

class DOMIdExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.sections = []
        self.containers = []
        self.in_ignored = 0

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        elem_id = d.get("id")
        if elem_id:
            self.ids.add(elem_id)
            if tag == "section":
                self.sections.append(elem_id)
            if "-container" in elem_id or elem_id in ("country-flags", "map", "particles-js"):
                self.containers.append(elem_id)

class DetailPageExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_ignored = 0
        self.in_script_style = 0
        self.images = []
        self.raw_images = []
        self.external_links = []
        self.headings = []
        self.current_heading = None
        self.paragraphs = []
        self.current_p = None
        self.title = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag in ("header", "nav", "footer") or d.get("id") in ("header", "navbar", "footer") or "nav" in d.get("class", "").split():
            self.in_ignored += 1
        if tag in ("script", "style"):
            self.in_script_style += 1

        if self.in_ignored == 0 and self.in_script_style == 0:
            if tag in ("h1", "h2", "h3", "h4"):
                self.current_heading = []
            elif tag in ("p", "li"):
                self.current_p = []
            elif tag == "img" and "src" in d:
                src = d["src"].strip()
                self.raw_images.append(src)
                if not any(k in src for k in ["profile-img", "favicon", "hf-logo", "apple-touch-icon"]):
                    img_name = Path(src).name
                    self.images.append({
                        "src": src,
                        "filename": img_name if img_name else src,
                        "is_directory": src.endswith("/") or img_name == ""
                    })
            elif tag == "source" and "srcset" in d:
                srcset = d["srcset"].strip()
                if not any(k in srcset for k in ["profile-img", "favicon"]):
                    img_name = Path(srcset.split()[0]).name
                    self.images.append({
                        "src": srcset,
                        "filename": img_name,
                        "is_directory": False
                    })
            elif tag == "a" and "href" in d:
                href = d["href"].strip()
                if href.startswith(("http://", "https://", "mailto:")):
                    self.external_links.append(href)

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag in ("header", "nav", "footer"):
            self.in_ignored = max(0, self.in_ignored - 1)
        if tag in ("script", "style"):
            self.in_script_style = max(0, self.in_script_style - 1)

        if self.in_ignored == 0 and self.in_script_style == 0:
            if tag in ("h1", "h2", "h3", "h4") and self.current_heading is not None:
                text = " ".join(" ".join(self.current_heading).split())
                if text:
                    self.headings.append(text)
                self.current_heading = None
            elif tag in ("p", "li") and self.current_p is not None:
                text = " ".join(" ".join(self.current_p).split())
                if text:
                    self.paragraphs.append(text)
                self.current_p = None

    def handle_data(self, data):
        if self.in_title:
            self.title += data.strip()
        elif self.in_ignored == 0 and self.in_script_style == 0:
            clean = data.strip()
            if clean:
                if self.current_heading is not None:
                    self.current_heading.append(clean)
                elif self.current_p is not None:
                    self.current_p.append(clean)

def build_snapshot():
    print(f"Generating snapshot from {BASELINE_PATH}...")

    # 1. Routes (HTML files excluding templates and node_modules)
    routes = sorted([
        str(p.relative_to(BASELINE_PATH))
        for p in BASELINE_PATH.glob("**/*.html")
        if "node_modules" not in p.parts and "templates" not in p.parts
    ])

    # 2. Homepage anchors
    index_html = (BASELINE_PATH / "index.html").read_text(encoding="utf-8")
    index_parser = DOMIdExtractor()
    index_parser.feed(index_html)

    homepage_anchors = {
        "section_ids": index_parser.sections,
        "container_ids": sorted(list(set(index_parser.containers))),
        "structural_ids": ["hero", "about", "programming-languages", "resume", "projects", "competitions", "publications", "volunteering", "travel", "contact", "main"],
        "all_ids": sorted(list(index_parser.ids))
    }

    # 3. Data records
    data_records = {}
    data_dir = BASELINE_PATH / "data"
    for json_file in sorted(data_dir.glob("*.json")):
        with open(json_file, "r", encoding="utf-8") as f:
            data_records[json_file.stem] = json.load(f)

    # 4. Project detail pages
    project_pages = {}
    for p in sorted(BASELINE_PATH.glob("projects/*.html")):
        parser = DetailPageExtractor()
        parser.feed(p.read_text(encoding="utf-8", errors="ignore"))
        rel_path = str(p.relative_to(BASELINE_PATH))
        words = sum(len(para.split()) for para in parser.paragraphs)
        project_pages[rel_path] = {
            "title": parser.title,
            "headings": parser.headings,
            "gallery_images": parser.images,
            "external_links": sorted(list(set(parser.external_links))),
            "paragraphs": parser.paragraphs,
            "word_count": words,
            "has_directory_img_bug": any(img["is_directory"] for img in parser.images)
        }

    # Also capture other detail pages (competitions, experience, volunteering)
    other_detail_pages = {}
    other_files = [
        "experience/phi-pair.html",
        "volunteering/volunteering_ieee.html",
        "volunteering/visited_countries.html",
    ] + sorted([f"competitions/competition-details-{i}.html" for i in range(1, 6)])

    for f_rel in other_files:
        path = BASELINE_PATH / f_rel
        if path.exists():
            parser = DetailPageExtractor()
            parser.feed(path.read_text(encoding="utf-8", errors="ignore"))
            words = sum(len(para.split()) for para in parser.paragraphs)
            other_detail_pages[f_rel] = {
                "title": parser.title,
                "headings": parser.headings,
                "gallery_images": parser.images,
                "external_links": sorted(list(set(parser.external_links))),
                "paragraphs": parser.paragraphs,
                "word_count": words
            }

    # 5. Pre-existing broken references
    pre_existing_issues = [
        {
            "category": "directory_image_source",
            "files": [
                "projects/latest-projects-1.html",
                "projects/latest-projects-2.html",
                "projects/latest-projects-3.html"
            ],
            "reference": "../assets/img/portfolio/",
            "issue": "Tag <img src=\"../assets/img/portfolio/\"> points to directory instead of image file"
        },
        {
            "category": "root_directory_anchors",
            "files": [
                "competitions/competition-details-1.html",
                "competitions/competition-details-2.html",
                "competitions/competition-details-3.html",
                "competitions/competition-details-4.html",
                "competitions/competition-details-5.html",
                "experience/phi-pair.html",
                "projects/araclip.html"
            ],
            "reference": "/#section (e.g. /#hero, /#about, /#resume, /#projects, etc.)",
            "issue": "Links use root-relative directory anchors (/#section) rather than file-relative anchors (../index.html#section)"
        },
        {
            "category": "commented_missing_files",
            "files": [
                "projects/portfolio-details-1.html",
                "volunteering/visited_countries.html"
            ],
            "reference": "portfolio-details-2.jpg, portfolio-details-3.jpg, /js/jquery.js",
            "issue": "Commented-out HTML code references non-existent files"
        }
    ]

    snapshot = {
        "metadata": {
            "baseline_path": str(BASELINE_PATH),
            "generated_at": datetime.now().isoformat(),
            "total_routes": len(routes),
            "total_project_pages": len(project_pages),
            "total_competitions": len(data_records.get("competitions", [])),
            "total_education": len(data_records.get("education", [])),
            "total_experience": len(data_records.get("experience", [])),
            "total_projects": len(data_records.get("projects", [])),
            "total_publications": len(data_records.get("publications", [])),
            "total_volunteering": len(data_records.get("volunteering", []))
        },
        "routes": routes,
        "homepage_anchors": homepage_anchors,
        "data_records": data_records,
        "project_detail_pages": project_pages,
        "other_detail_pages": other_detail_pages,
        "pre_existing_issues": pre_existing_issues
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)

    print(f"Snapshot successfully saved to {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size} bytes)")

if __name__ == "__main__":
    build_snapshot()
