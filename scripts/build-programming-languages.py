#!/usr/bin/env python3
"""
Generate data/programming-languages.json from the GitHub repositories owned by the user.

The site reads the committed JSON, so visitors make no API calls. Re-run this
after you want the figure refreshed:

    python3 scripts/build-programming-languages.py
    python3 scripts/build-programming-languages.py --check   # report drift, write nothing

Requires the `gh` CLI, authenticated (`gh auth login`). The anonymous API
allows 60 requests/hour, which is not enough for one full run.

Why this does not simply read GitHub's /languages endpoint: that endpoint
reports bytes on disk, and for this account bytes on disk are mostly not code.
A committed .ipynb embeds its own output cells as base64 images, so a notebook
that plots anything is overwhelmingly encoded PNG -- across 179 notebooks here,
120 MB of .ipynb held 1.5 MB of source, about 1%. Vendored libraries (jQuery,
Bootstrap, jVectorMap) count against whoever commits them. Left uncorrected
those two effects put Python above 90% and invent a large JavaScript share.

So instead this walks each repository's file tree and counts only what was
actually written: files whose extension appears in EXT_LANG, excluding paths
matching SKIP, and for notebooks only the source of their code cells.
"""

import argparse
import collections
import concurrent.futures
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "data", "programming-languages.json")
USER = "mohammad-albarham"

# Extensions counted as code, and the language each is reported as. Anything
# absent is ignored, which is what drops the PDFs, datasets and media that
# dominate these repositories by size. HTML and CSS share a slice, as they do
# on the chart this figure is modelled on.
EXT_LANG = {
    ".py": "Python", ".pyw": "Python", ".pyx": "Python",
    ".ipynb": "__NOTEBOOK__",
    ".cpp": "C++", ".cc": "C++", ".cxx": "C++", ".hpp": "C++", ".hh": "C++",
    ".c": "C", ".h": "C",
    ".rs": "Rust",
    ".js": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript", ".jsx": "JavaScript",
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".html": "HTML & CSS", ".htm": "HTML & CSS",
    ".css": "HTML & CSS", ".scss": "HTML & CSS", ".sass": "HTML & CSS",
    ".java": "Java",
    ".kt": "Kotlin", ".kts": "Kotlin",
    ".swift": "Swift",
    ".go": "Go",
    ".rb": "Ruby",
    ".lua": "Lua",
    ".m": "MATLAB",
    ".r": "R",
    ".sql": "SQL",
    ".sh": "Shell", ".bash": "Shell", ".zsh": "Shell",
    ".ino": "Arduino",
    ".s": "Assembly", ".asm": "Assembly",
    ".tex": "TeX", ".sty": "TeX", ".cls": "TeX",
    ".v": "Verilog", ".vhd": "VHDL", ".vhdl": "VHDL",
}

# Third-party and machine-generated code, which is committed here but was not
# written here.
SKIP = re.compile(
    r"(^|/)("
    r"node_modules|vendor|third_party|thirdparty|external|deps|"
    r"dist|build|target|\.venv|venv|site-packages|__pycache__|"
    r"migrations|generated|assets/vendor"
    r")/|"
    r"\.min\.(js|css)$|"
    r"(^|/)(jquery|bootstrap|popper|highlight|particles|swiper|aos)[.\-]",
    re.I,
)

# Languages below this share of the total are collected into "Other" rather
# than drawn as their own slice.
TAIL_THRESHOLD_PCT = 0.5


def gh_api(path):
    """Call the GitHub API through the gh CLI, returning parsed JSON or None."""
    result = subprocess.run(
        ["gh", "api", path], capture_output=True, text=True
    )
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def own_repositories():
    """Every repository the user wrote: not forked, not archived."""
    repos = {}
    for page in range(1, 11):
        batch = gh_api(f"users/{USER}/repos?per_page=100&type=owner&page={page}")
        if not batch:
            break
        for repo in batch:
            if not repo["fork"] and not repo["archived"]:
                repos[repo["name"]] = repo
        if len(batch) < 100:
            break
    return repos


def notebook_code_bytes(job):
    """Bytes of source in a notebook's code cells, ignoring its output cells."""
    repo, sha, path = job
    url = (
        f"https://raw.githubusercontent.com/{USER}/{repo}/{sha}/"
        + urllib.parse.quote(path)
    )
    try:
        with urllib.request.urlopen(url, timeout=90) as response:
            notebook = json.loads(response.read().decode("utf-8", "replace"))
    except Exception as error:
        print(f"  ! {repo}/{path}: {type(error).__name__}", file=sys.stderr)
        return None, 0

    language = (
        notebook.get("metadata", {}).get("kernelspec", {}).get("language")
        or notebook.get("metadata", {}).get("language_info", {}).get("name")
        or "python"
    ).lower()

    total = 0
    for cell in notebook.get("cells", []):
        if cell.get("cell_type") != "code":
            continue
        source = cell.get("source", "")
        if isinstance(source, list):
            source = "".join(source)
        total += len(source.encode("utf-8"))

    # A notebook's language is the kernel's. Python kernels are reported as
    # Python -- the request that prompted this figure was for notebooks to
    # count as the language they are written in, not as a format.
    if language.startswith("py"):
        return "Python", total
    return language.title(), total


def collect_bytes():
    """Bytes of hand-written code per language across every owned repository."""
    repos = own_repositories()
    if not repos:
        sys.exit("No repositories returned. Is `gh` authenticated?")

    by_language = collections.Counter()
    notebook_jobs = []
    repos_counted = 0

    for name, repo in sorted(repos.items()):
        branch = repo.get("default_branch") or "main"
        tree = gh_api(f"repos/{USER}/{name}/git/trees/{branch}?recursive=1")
        if not tree or "tree" not in tree:
            continue
        repos_counted += 1
        if tree.get("truncated"):
            print(f"  ! tree truncated, undercounting: {name}", file=sys.stderr)

        for blob in tree["tree"]:
            if blob["type"] != "blob":
                continue
            path = blob["path"]
            if SKIP.search(path):
                continue
            extension = "." + path.rsplit("/", 1)[-1].rsplit(".", 1)[-1].lower()
            language = EXT_LANG.get(extension)
            if language is None:
                continue
            if language == "__NOTEBOOK__":
                notebook_jobs.append((name, tree["sha"], path))
            else:
                by_language[language] += blob.get("size", 0)

    print(f"  {repos_counted} repositories, {len(notebook_jobs)} notebooks")

    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        for language, size in pool.map(notebook_code_bytes, notebook_jobs):
            if language:
                by_language[language] += size

    return by_language, repos_counted, len(notebook_jobs)


def to_percentages(by_language):
    """Whole-number percentages that sum to exactly 100, small values pooled.

    Rounding each share independently does not generally sum to 100, so the
    remainders decide which entries round up (the largest-remainder method).
    """
    total = sum(by_language.values())
    if not total:
        sys.exit("No code found.")

    kept, tail = {}, 0
    for language, size in by_language.items():
        if 100 * size / total >= TAIL_THRESHOLD_PCT:
            kept[language] = size
        else:
            tail += size
    if tail:
        kept["Other"] = kept.get("Other", 0) + tail

    exact = {lang: 100 * size / total for lang, size in kept.items()}
    floors = {lang: int(value) for lang, value in exact.items()}
    shortfall = 100 - sum(floors.values())
    by_remainder = sorted(exact, key=lambda l: exact[l] - floors[l], reverse=True)
    for language in by_remainder[:shortfall]:
        floors[language] += 1

    # "Other" sorts last however small the real tail is; the rest by size.
    ordered = sorted(
        (l for l in floors if l != "Other"), key=lambda l: -exact[l]
    )
    if "Other" in floors:
        ordered.append("Other")

    return [
        {"name": language, "pct": floors[language], "bytes": kept[language]}
        for language in ordered
        if floors[language] > 0
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="report whether data/programming-languages.json is stale; write nothing",
    )
    args = parser.parse_args()

    by_language, repo_count, notebook_count = collect_bytes()
    languages = to_percentages(by_language)
    total_bytes = sum(by_language.values())

    payload = {
        "source": f"github.com/{USER}",
        "method": (
            "Hand-written code only, across public non-fork repositories. "
            "Notebook code cells count as their kernel language; notebook "
            "outputs, vendored libraries, datasets and media are excluded."
        ),
        "repositories": repo_count,
        "notebooks": notebook_count,
        "totalBytes": total_bytes,
        "languages": languages,
    }

    rendered = json.dumps(payload, indent=2) + "\n"

    for entry in languages:
        print(f"  {entry['pct']:3d}%  {entry['name']}")
    print(f"  {total_bytes / 1e6:.2f} MB of code")

    if args.check:
        existing = ""
        if os.path.exists(OUTPUT):
            with open(OUTPUT, encoding="utf-8") as handle:
                existing = handle.read()
        # generatedAt moves on every run, so compare only the measured figures.
        if json.loads(existing or "{}").get("languages") == languages:
            print("  ok        data/programming-languages.json")
            return 0
        print("  DIFFERS   data/programming-languages.json")
        return 1

    with open(OUTPUT, "w", encoding="utf-8") as handle:
        handle.write(rendered)
    print(f"  wrote {os.path.relpath(OUTPUT, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
