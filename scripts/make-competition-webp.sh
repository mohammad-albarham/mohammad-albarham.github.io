#!/bin/bash
# Create the assets/img_webp/competitions/... twin for every competition image
# that does not have one yet.
#
# The detail pages serve images through <picture> with a WebP <source>. A
# <source> that 404s leaves a broken image rather than falling back to the
# <img>, so every original needs a twin. Originals are often several MB
# straight off a phone; the WebP is capped at 1600px, which is plenty for the
# lightbox.
#
# Usage:
#   scripts/make-competition-webp.sh          convert what is missing
#   scripts/make-competition-webp.sh --force  rebuild every twin

set -euo pipefail
cd "$(dirname "$0")/.."

command -v magick >/dev/null 2>&1 || {
  echo "ImageMagick not found. Install with: brew install imagemagick" >&2
  exit 1
}

force=false
[[ "${1:-}" == "--force" ]] && force=true

converted=0
skipped=0

# -print0 / read -d '' so filenames containing spaces survive.
while IFS= read -r -d '' src; do
  dest="${src/assets\/img\//assets/img_webp/}"
  dest="${dest%.*}.webp"

  if [[ -f "$dest" && "$force" == false ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  mkdir -p "$(dirname "$dest")"
  magick "$src" -auto-orient -resize '1600x1600>' -quality 82 "$dest"
  printf '  %-58s %6sKB -> %5sKB\n' \
    "$(basename "$src")" \
    "$(( $(wc -c < "$src") / 1024 ))" \
    "$(( $(wc -c < "$dest") / 1024 ))"
  converted=$((converted + 1))
done < <(find assets/img/competitions -type f \
           \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.gif' \) -print0)

echo "  ${converted} converted, ${skipped} already present"
