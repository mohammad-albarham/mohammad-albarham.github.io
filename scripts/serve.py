#!/usr/bin/env python3
"""Local development server mimicking GitHub Pages clean URL resolution.

GitHub Pages serves `foo.html` when `/foo` is requested without an extension.
Python's standard `http.server` does not do this, causing 404s for detail pages
such as `/projects/latest-projects-5`.

This server wraps SimpleHTTPRequestHandler to:
1. Try exact path match.
2. If path not found and `<path>.html` exists, serve `<path>.html` as text/html.
3. If `<path>/` with trailing slash is requested for a file, redirect to `/path`.
4. Support standard port configuration (default 8765).
"""

from __future__ import annotations

import argparse
import http.server
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent


class GitHubPagesHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # If a trailing slash was requested for an extensionless file route
        # (e.g. /projects/latest-projects-5/), redirect to the clean URL
        # (/projects/latest-projects-5) so relative asset links (../assets/...)
        # resolve against the correct parent directory.
        if path.endswith("/") and len(path) > 1:
            clean_path = path.rstrip("/")
            disk_path = ROOT / clean_path.lstrip("/")
            if not disk_path.is_dir() and (ROOT / f"{clean_path.lstrip('/')}.html").is_file():
                query = f"?{parsed.query}" if parsed.query else ""
                self.send_response(http.HTTPStatus.MOVED_PERMANENTLY)
                self.send_header("Location", clean_path + query)
                self.end_headers()
                return None

        return super().send_head()

    def translate_path(self, path: str) -> str:
        translated = super().translate_path(path)
        if os.path.exists(translated):
            return translated

        # Clean URL fallback: /projects/latest-projects-5 -> projects/latest-projects-5.html
        if os.path.isfile(translated + ".html"):
            return translated + ".html"

        # Trailing slash fallback if reached: /foo/ -> /foo.html
        clean = translated.rstrip(os.path.sep)
        if os.path.isfile(clean + ".html"):
            return clean + ".html"

        return translated

    def guess_type(self, path: str) -> str:
        # Ensure translated .html paths are served with the right MIME type
        if path.endswith(".html"):
            return "text/html; charset=utf-8"
        return super().guess_type(path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview server with GitHub Pages clean URL support.")
    parser.add_argument("port", nargs="?", type=int, default=8765, help="Port to listen on (default: 8765)")
    parser.add_argument("--bind", "-b", default="0.0.0.0", help="Address to bind to (default: 0.0.0.0)")
    args = parser.parse_args()

    server_address = (args.bind, args.port)
    try:
        with http.server.ThreadingHTTPServer(server_address, GitHubPagesHandler) as httpd:
            print(f"Serving HTTP on http://{args.bind}:{args.port} (mapped to {ROOT})")
            print("Press Ctrl+C to stop.")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
