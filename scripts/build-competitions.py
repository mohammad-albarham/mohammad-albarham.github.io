#!/usr/bin/env python3
"""
Generate competitions/*.html from data/competitions.json.

The competition detail pages are static HTML, so editing data/competitions.json
alone does not change them. Re-run this script after every edit:

    python3 scripts/build-competitions.py
    python3 scripts/build-competitions.py --check   # report drift, write nothing

Each entry's "detailsPage" decides the output path, and "gallery" lists the
photos shown under the main image. Images are emitted as <picture> elements
preferring assets/img_webp/...webp with the original as fallback; a missing
WebP is reported, because a <source> that 404s leaves a broken image rather
than falling back to the <img>.
"""

import argparse
import html
import json
import os
import sys
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'competitions.json')
TEMPLATE = os.path.join(ROOT, 'templates', 'competition-template.html')

MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

# Keep in sync with PortfolioRenderer.LINK_LABELS in assets/js/portfolio-renderer.js.
LINK_LABELS = {
    'github': ('bi-github', 'GitHub Repository'),
    'demo': ('bi-play-circle', 'Live Demo'),
    'site': ('bi-link-45deg', 'Competition Site'),
    'kaggle': ('bi-bar-chart', 'Kaggle'),
    'paper': ('bi-file-text', 'Paper'),
}

warnings = []


def month_year(date_str):
    year, month = date_str.split('-')
    return f'{MONTHS[int(month) - 1]} {year}'


def url(path):
    """Percent-encode a path for use in an href/src, keeping the separators."""
    return quote(path, safe='/')


def webp_for(src):
    """Mirror of PortfolioRenderer.picture(): assets/img/x.jpg -> assets/img_webp/x.webp."""
    if not src.startswith('assets/img/'):
        return None
    base, ext = os.path.splitext(src)
    if ext.lower() not in ('.png', '.jpg', '.jpeg', '.gif'):
        return None
    return base.replace('assets/img/', 'assets/img_webp/', 1) + '.webp'


def picture(src, alt, css_class='', indent=16, lightbox=None):
    """Build a <picture> that prefers WebP, warning when a variant is missing.

    When `lightbox` is a gallery name, the picture is wrapped in the
    .portfolio-lightbox anchor that main.js already binds GLightbox to. The
    anchor points at the WebP rather than the original, so opening a photo
    costs ~150KB instead of several megabytes.
    """
    if not os.path.exists(os.path.join(ROOT, src)):
        warnings.append(f'missing image: {src}')
    pad = ' ' * indent
    cls = f' class="{css_class}"' if css_class else ''
    # Filenames may contain spaces and other characters that are not URL-safe.
    img = (f'<img src="/{url(src)}" alt="{html.escape(alt, quote=True)}"{cls} loading="lazy">')

    webp = webp_for(src)
    has_webp = bool(webp) and os.path.exists(os.path.join(ROOT, webp))
    if webp and not has_webp:
        warnings.append(
            f'no WebP for {src} (expected {webp}) - serving the original, which may be large')

    if has_webp:
        body = (f'<picture>\n{pad}  <source srcset="/{url(webp)}" type="image/webp">\n'
                f'{pad}  {img}\n{pad}</picture>')
    else:
        body = img

    if not lightbox:
        return body

    full = webp if has_webp else src
    return (f'<a href="/{url(full)}" class="portfolio-lightbox" '
            f'data-gallery="{html.escape(lightbox, quote=True)}" '
            f'title="{html.escape(alt, quote=True)}">\n{pad}  {body}\n{pad}</a>')


def award_badges(comp):
    """One badge per award; "award" is a single string or a list of them."""
    awards = comp.get('award') or []
    if isinstance(awards, str):
        awards = [awards]
    rank = f' rank-{comp["rank"]}' if comp.get('rank') else ''
    return '\n              '.join(
        f'<span class="competition-award{rank}">\n'
        f'                <i class="bi bi-trophy-fill" aria-hidden="true"></i>{html.escape(a)}\n'
        f'              </span>'
        for a in awards)


def render(comp, template):
    title = comp['title']
    techs = comp.get('technologies') or []

    location_row = ''
    if comp.get('location'):
        location_row = ('<li>\n                  '
                        '<strong><i class="bi bi-geo-alt"></i> Location</strong>\n'
                        f'                  <span>{html.escape(comp["location"])}</span>\n'
                        '                </li>')

    tech_tags = ('\n                    '.join(
        f'<span class="tech-tag">{html.escape(t)}</span>' for t in techs)
        or '<span class="tech-tag">Add technologies in data/competitions.json</span>')

    links = comp.get('links') or {}
    link_items = []
    for key, url in links.items():
        if not url:
            continue
        icon, label = LINK_LABELS.get(key, ('bi-link-45deg', key))
        link_items.append(
            f'<a href="{html.escape(url, quote=True)}" class="project-link" '
            f'target="_blank" rel="noopener"><i class="bi {icon}"></i> {html.escape(label)}</a>')
    link_html = '\n                '.join(link_items) or (
        '<p class="mb-0" style="color: var(--text-secondary, #626970);">'
        'No links yet &mdash; add them in data/competitions.json.</p>')

    # One GLightbox gallery per competition, so the arrows step through this
    # competition's photos only. The main image is the first item.
    gallery_name = comp['id']

    gallery = comp.get('gallery') or []
    gallery_html = '\n                '.join(
        picture(img, f'{title} - photo {i}', lightbox=gallery_name)
        for i, img in enumerate(gallery, 1))
    if not gallery_html:
        gallery_html = ('<!-- Add photos by listing them under "gallery" in '
                        'data/competitions.json, then re-run scripts/build-competitions.py -->')

    # "body" is optional free HTML; without it the description alone is shown.
    description_full = comp.get('body') or f'<p>{html.escape(comp.get("description", ""))}</p>'

    # The whole Highlights block is dropped when there is nothing to list, so
    # the page never shows an empty section.
    highlights = comp.get('highlights') or []
    if highlights:
        items = '\n                '.join(
            f'<li>{html.escape(h, quote=False)}</li>' for h in highlights)
        highlights_block = ('<div class="project-features">\n'
                            '              <h3>Highlights</h3>\n'
                            '              <ul>\n'
                            f'                {items}\n'
                            '              </ul>\n'
                            '            </div>')
    else:
        highlights_block = ''

    out = template
    for key, value in [
        ('{{TITLE_SHORT}}', html.escape(title[:40])),
        ('{{TITLE}}', html.escape(title)),
        ('{{DESCRIPTION}}', html.escape(comp.get('shortDescription', ''), quote=True)),
        ('{{KEYWORDS}}', html.escape(', '.join(techs + [comp.get('organizer', ''), 'competition']), quote=True)),
        ('{{PAGE_FILE}}', os.path.basename(comp['detailsPage'])),
        ('{{MAIN_IMAGE}}', picture(comp['image'], title, css_class='img-fluid main-image',
                                   indent=14, lightbox=gallery_name)),
        ('{{IMAGE}}', comp['image']),
        ('{{AWARD_BADGES}}', award_badges(comp)),
        ('{{DATE}}', month_year(comp['date'])),
        ('{{ORGANIZER}}', html.escape(comp.get('organizer', ''))),
        ('{{LOCATION_ROW}}', location_row),
        ('{{TECH_TAGS}}', tech_tags),
        ('{{LINKS}}', link_html),
        ('{{GALLERY}}', gallery_html),
        ('{{DESCRIPTION_FULL}}', description_full),
        ('{{HIGHLIGHTS_BLOCK}}', highlights_block),
    ]:
        out = out.replace(key, value)

    if '{{' in out:
        raise SystemExit(f'unreplaced placeholder in {comp["detailsPage"]}')
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true',
                        help='report which pages would change without writing them')
    args = parser.parse_args()

    with open(DATA, encoding='utf-8') as f:
        comps = json.load(f)
    with open(TEMPLATE, encoding='utf-8') as f:
        template = f.read()

    changed = 0
    for comp in comps:
        out_path = os.path.join(ROOT, comp['detailsPage'])
        rendered = render(comp, template)

        existing = None
        if os.path.exists(out_path):
            with open(out_path, encoding='utf-8') as f:
                existing = f.read()

        if existing == rendered:
            print(f'  ok        {comp["detailsPage"]}')
            continue

        changed += 1
        if args.check:
            print(f'  DIFFERS   {comp["detailsPage"]}')
        else:
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(rendered)
            print(f'  wrote     {comp["detailsPage"]}')

    for w in sorted(set(warnings)):
        print(f'  WARNING   {w}', file=sys.stderr)

    if args.check and changed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
