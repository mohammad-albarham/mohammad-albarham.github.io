#!/bin/bash
# Build assets/css/bundle.css and assets/js/bundle.js from their source files.
#
# index.html loads only the bundles, so any edit to a source file below requires
# re-running this script to take effect.
#
# Usage:
#   scripts/build.sh          build the bundles
#   scripts/build.sh --check  build to a temp dir and diff against the committed
#                             bundles without overwriting them

set -euo pipefail
cd "$(dirname "$0")/.."

# Order matters: later files override earlier ones in the CSS cascade.
CSS_FILES=(
  assets/css/jquery-jvectormap-1.2.2.css
  assets/css/style.css
  assets/css/modern-portfolio.css
  assets/css/optimized-sidebar.css
  assets/css/hero.css
  assets/css/responsive-images.css
  assets/css/section-headers.css
  assets/css/components/publications.css
  assets/css/components/competitions.css
  assets/css/neural-network.css
  assets/css/dark-mode.css
  assets/css/buttons.css
  assets/css/enhancements.css
)

JS_FILES=(
  assets/js/utils.js
  assets/js/data-loader.js
  assets/js/portfolio-renderer.js
  assets/js/theme.js
  assets/js/publications.js
  assets/js/animations.js
  assets/js/neural-banner.js
  assets/js/site-enhancements.js
  assets/js/particles-config.js
  assets/js/main.js
)

# jVectorMap and the world map data are loaded on demand by the travel section
# (see the lazy loader in index.html), not shipped in the main bundle.
TRAVEL_FILES=(
  assets/js/jquery-jvectormap-1.2.2.min.js
  assets/js/worldmap.js
)

if [[ "${1:-}" == "--check" ]]; then
  out=".bundle-check"
  rm -rf "$out"; mkdir -p "$out"
  cat "${CSS_FILES[@]}" > "$out/bundle.css"
  cat "${JS_FILES[@]}"  > "$out/bundle.js"
  cat "${TRAVEL_FILES[@]}" > "$out/travel-map.js"
  status=0
  for f in bundle.css:assets/css/bundle.css bundle.js:assets/js/bundle.js travel-map.js:assets/js/travel-map.js; do
    built="$out/${f%%:*}"; committed="${f##*:}"
    if cmp -s "$built" "$committed"; then
      echo "  ok        $committed"
    else
      echo "  DIFFERS   $committed ($(wc -c < "$built") built vs $(wc -c < "$committed") committed)"
      status=1
    fi
  done
  rm -rf "$out"
  exit $status
fi

cat "${CSS_FILES[@]}"    > assets/css/bundle.css
cat "${JS_FILES[@]}"     > assets/js/bundle.js
cat "${TRAVEL_FILES[@]}" > assets/js/travel-map.js

printf '  bundle.css     %8s bytes\n' "$(wc -c < assets/css/bundle.css | tr -d ' ')"
printf '  bundle.js      %8s bytes\n' "$(wc -c < assets/js/bundle.js | tr -d ' ')"
printf '  travel-map.js  %8s bytes (lazy-loaded)\n' "$(wc -c < assets/js/travel-map.js | tr -d ' ')"
