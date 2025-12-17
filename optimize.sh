#!/bin/bash

# Portfolio Performance Optimization Script
# This script helps optimize the website for production

echo "🚀 Portfolio Performance Optimization"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required tools are installed
command -v convert >/dev/null 2>&1 || { 
  echo -e "${YELLOW}⚠️  ImageMagick not installed. Image optimization will be skipped.${NC}"
  echo "   Install with: brew install imagemagick"
  IMAGE_OPT=false
}

# 1. Optimize Images
echo "📸 Optimizing images..."
if [ "$IMAGE_OPT" != "false" ]; then
  find assets/img -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | while read img; do
    # Get file size
    original_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
    
    # Optimize based on file type
    if [[ $img == *.png ]]; then
      convert "$img" -strip -quality 85 "$img.tmp" && mv "$img.tmp" "$img"
    else
      convert "$img" -strip -quality 85 -sampling-factor 4:2:0 "$img.tmp" && mv "$img.tmp" "$img"
    fi
    
    # Get new file size
    new_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
    savings=$((original_size - new_size))
    
    if [ $savings -gt 0 ]; then
      echo "   ✓ $(basename "$img"): Saved $(numfmt --to=iec $savings 2>/dev/null || echo "$savings bytes")"
    fi
  done
else
  echo "   ⏭️  Skipped (ImageMagick not installed)"
fi

echo ""

# 2. Minify CSS (if clean-css-cli is installed)
echo "🎨 Minifying CSS..."
if command -v cleancss >/dev/null 2>&1; then
  cleancss -o assets/css/modern-portfolio.min.css assets/css/modern-portfolio.css
  cleancss -o assets/css/dark-mode.min.css assets/css/dark-mode.css
  echo "   ✓ CSS minified"
else
  echo "   ⏭️  Skipped (clean-css-cli not installed)"
  echo "   Install with: npm install -g clean-css-cli"
fi

echo ""

# 3. Minify JavaScript (if uglify-js is installed)
echo "📦 Minifying JavaScript..."
if command -v uglifyjs >/dev/null 2>&1; then
  uglifyjs assets/js/portfolio-renderer.js -o assets/js/portfolio-renderer.min.js -c -m
  uglifyjs assets/js/publications.js -o assets/js/publications.min.js -c -m
  uglifyjs assets/js/theme.js -o assets/js/theme.min.js -c -m
  echo "   ✓ JavaScript minified"
else
  echo "   ⏭️  Skipped (uglify-js not installed)"
  echo "   Install with: npm install -g uglify-js"
fi

echo ""

# 4. Check file sizes
echo "📊 File Size Report:"
echo "   CSS Files:"
if [ -f "assets/css/modern-portfolio.min.css" ]; then
  css_size=$(stat -f%z "assets/css/modern-portfolio.min.css" 2>/dev/null || stat -c%s "assets/css/modern-portfolio.min.css" 2>/dev/null)
  echo "      modern-portfolio.min.css: $(numfmt --to=iec $css_size 2>/dev/null || echo "$css_size bytes")"
fi

echo "   JS Files:"
if [ -f "assets/js/portfolio-renderer.min.js" ]; then
  js_size=$(stat -f%z "assets/js/portfolio-renderer.min.js" 2>/dev/null || stat -c%s "assets/js/portfolio-renderer.min.js" 2>/dev/null)
  echo "      portfolio-renderer.min.js: $(numfmt --to=iec $js_size 2>/dev/null || echo "$js_size bytes")"
fi

echo ""

# 5. Generate sitemap
echo "🗺️  Generating sitemap..."
cat > sitemap.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mohammad-albarham.github.io/</loc>
    <lastmod>2024-12-17</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mohammad-albarham.github.io/projects/araclip.html</loc>
    <lastmod>2024-12-17</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
EOF
echo "   ✓ Sitemap generated"

echo ""
echo -e "${GREEN}✨ Optimization complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the website locally: python3 -m http.server 8080"
echo "2. Run Lighthouse audit in Chrome DevTools"
echo "3. Commit and push changes to GitHub"
echo ""
