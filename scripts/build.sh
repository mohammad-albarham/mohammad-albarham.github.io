#!/bin/bash
# Build the site.
#
#   scripts/build.sh          render pages + bundle CSS/JS
#   scripts/build.sh --check  rebuild into a temp dir and diff against what is
#                             committed; exits non-zero if anything is stale
#
# The --check mode covers BOTH the bundles and the generated HTML, so a commit
# that edits assets/css/src/*.css or data/*.json without rebuilding fails.
# Legacy detail pages are re-shelled by site/restyle_legacy.py, which is a
# one-shot migration and deliberately not part of this build.

set -euo pipefail
cd "$(dirname "$0")/.."

# Order matters: later files win in the cascade.
CSS_FILES=(
  assets/css/src/01-tokens.css
  assets/css/src/02-base.css
  assets/css/src/03-chrome.css
  assets/css/src/04-home.css
  assets/css/src/05-legacy.css
  assets/css/src/06-pages.css
)

JS_FILES=(
  assets/js/src/01-nav.js
  assets/js/src/02-theme.js
  assets/js/src/03-filters.js
  assets/js/src/04-bibtex.js
  assets/js/src/05-travel.js
)

# jVectorMap + the world map data are loaded on demand by the travel section,
# never in the main bundle.
TRAVEL_FILES=(
  assets/js/jquery-jvectormap-1.2.2.min.js
  assets/js/worldmap.js
)

GENERATED_PAGES=(index.html projects/index.html research/index.html about/index.html sitemap.xml)

bundle() {
  local dir="$1"
  mkdir -p "$dir/assets/css" "$dir/assets/js"
  cat "${CSS_FILES[@]}"    > "$dir/assets/css/site.css"
  cat "${JS_FILES[@]}"     > "$dir/assets/js/site.js"
  cat "${TRAVEL_FILES[@]}" > "$dir/assets/js/travel-map.js"
}

if [[ "${1:-}" == "--check" ]]; then
  out="$(mktemp -d)"
  trap 'rm -rf "$out"' EXIT

  bundle "$out"
  python3 site/render.py --out "$out" > /dev/null

  status=0
  check() {
    if cmp -s "$out/$1" "$1"; then
      printf '  ok        %s\n' "$1"
    else
      printf '  STALE     %s\n' "$1"
      status=1
    fi
  }
  check assets/css/site.css
  check assets/js/site.js
  check assets/js/travel-map.js
  for page in "${GENERATED_PAGES[@]}"; do check "$page"; done

  if [[ $status -ne 0 ]]; then
    echo
    echo "Committed output does not match its sources. Run: scripts/build.sh"
  fi
  exit $status
fi

bundle .
python3 site/render.py

printf '  site.css       %8s bytes\n' "$(wc -c < assets/css/site.css | tr -d ' ')"
printf '  site.js        %8s bytes\n' "$(wc -c < assets/js/site.js | tr -d ' ')"
printf '  travel-map.js  %8s bytes (lazy-loaded)\n' "$(wc -c < assets/js/travel-map.js | tr -d ' ')"
