# Adding New Content to the Portfolio

This guide explains how to add new projects, publications, and other content to the portfolio website.

## Table of Contents
- [Adding a New Project](#adding-a-new-project)
- [Adding a New Publication](#adding-a-new-publication)
- [Adding Volunteering Experience](#adding-volunteering-experience)
- [File Structure Overview](#file-structure-overview)

---

## Adding a New Project

### Step 1: Add to `data/projects.json`

Add a new entry to the projects array in `data/projects.json`:

```json
{
  "id": "unique-project-id",
  "title": "Project Title",
  "category": "ai",  // Options: ai, computer-vision, tools, embedded, dataset, ml, application, mechatronics
  "tags": ["Tag1", "Tag2", "Tag3"],
  "featured": true,  // Set to true to show in featured section
  "image": "assets/img/portfolio/your-image.png",
  "shortDescription": "Brief one-line description for cards",
  "description": "Longer description for detail page",
  "technologies": ["Python", "PyTorch", "etc"],
  "links": {
    "github": "https://github.com/...",
    "paper": "https://...",
    "huggingface": "https://huggingface.co/...",
    "demo": "https://..."
  },
  "year": 2024,
  "detailsPage": "projects/your-project.html"  // Optional: link to detail page
}
```

### Step 2: Add Project Image

1. Place your project image in `assets/img/portfolio/`
2. Recommended image sizes:
   - Thumbnail: 400x300px (for cards)
   - Main image: 1200x800px (for detail page)
3. Use compressed formats (WebP preferred, or optimized JPEG/PNG)

### Step 3: Create Detail Page (Optional)

Copy the template from `templates/project-template.html` to `projects/your-project.html` and customize:

```bash
cp templates/project-template.html projects/your-project.html
```

Replace these placeholders in the template:
- `{{PROJECT_TITLE}}` - Full project title
- `{{PROJECT_TITLE_SHORT}}` - Short title for breadcrumb
- `{{PROJECT_DESCRIPTION}}` - Meta description (150-160 chars)
- `{{PROJECT_KEYWORDS}}` - Comma-separated keywords
- `{{PROJECT_ID}}` - Unique identifier
- `{{PROJECT_IMAGE}}` - Path to main image
- `{{PROJECT_YEAR}}` - Year of project
- `{{PROJECT_CATEGORY}}` - Category name
- `{{TECHNOLOGY_TAGS}}` - Technology badges HTML
- `{{PROJECT_LINKS}}` - Links HTML
- `{{PROJECT_DESCRIPTION_FULL}}` - Full description
- `{{KEY_FEATURES}}` - Feature list items
- `{{ADDITIONAL_CONTENT}}` - Extra content sections

---

## Adding a New Publication

### Step 1: Add to `data/publications.json`

Add a new entry to the publications array:

```json
{
  "id": "unique-pub-id-year",
  "title": "Publication Title",
  "authors": [
    {"name": "Your Name", "isMe": true},
    {"name": "Co-author", "isMe": false}
  ],
  "venue": "Full Conference/Journal Name",
  "venueShort": "SHORT @ CONF",
  "type": "conference",  // Options: journal, conference, workshop, preprint
  "year": 2024,
  "volume": "15",  // Optional
  "pages": "100-110",  // Optional
  "doi": "https://doi.org/...",  // Optional
  "url": "https://link-to-paper.com",
  "pdfUrl": "https://direct-pdf-link.pdf",  // Optional
  "huggingface": "https://huggingface.co/...",  // Optional
  "github": "https://github.com/...",  // Optional
  "abstract": "Paper abstract text...",
  "keywords": ["keyword1", "keyword2"],
  "bibtex": "@inproceedings{...\n  ...\n}",
  "featured": false  // Set true for featured publications
}
```

### BibTeX Format Tips
- Use `\n` for newlines in the bibtex field
- Escape quotes if needed
- Keep consistent formatting

---

## Adding Volunteering Experience

### Add to `data/volunteering.json`

```json
{
  "id": "unique-vol-id",
  "organization": "Organization Name",
  "position": "Your Role/Position",
  "location": "City, Country",
  "startDate": "2023-01",
  "endDate": null,  // null for ongoing
  "current": true,
  "description": "Description of your role and contributions",
  "highlights": [
    "Achievement or responsibility 1",
    "Achievement or responsibility 2"
  ],
  "logo": "assets/img/volunteering/org-logo.png",
  "url": "https://organization-website.com",
  "detailsPage": "volunteering/detail-page.html"  // Optional
}
```

---

## File Structure Overview

```
mohammad-albarham.github.io/
├── index.html              # Main page
├── data/                   # Data files (JSON)
│   ├── projects.json       # All projects
│   ├── publications.json   # All publications
│   ├── volunteering.json   # Volunteering experiences
│   ├── education.json      # Education history
│   ├── experience.json     # Work experience
│   └── travel.json         # Travel/countries visited
├── projects/               # Project detail pages
│   ├── portfolio-details-*.html
│   └── latest-projects-*.html
├── volunteering/           # Volunteering detail pages
├── publications/           # Publication-related pages
├── templates/              # Reusable templates
│   ├── project-template.html
│   └── page-template.html
├── assets/
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── img/               # Images
│       └── portfolio/     # Project images
└── scripts/               # Utility scripts
```

---

## Quick Reference: CSS Classes

### Project Cards
- `.project-card` - Main card container
- `.project-card-featured` - Featured project styling
- `.tech-tag` - Technology badge

### Publications
- `.publication-card` - Publication container
- `.pub-type-journal` - Journal paper styling
- `.pub-type-conference` - Conference paper styling
- `.pub-type-workshop` - Workshop paper styling
- `.pub-type-preprint` - Preprint styling

### General
- `.section-title` - Section headings
- `.section-subtitle` - Subsection headings
- `.btn-primary` - Primary button
- `.btn-outline-*` - Outline buttons

---

## Image Optimization Tips

### Automatic Optimization

Use the built-in image optimization script to compress images and create WebP versions:

```bash
# Install requirements first (one-time)
pip install Pillow

# List large images that need optimization
python scripts/optimize_images.py --list-large 100

# Run optimization (creates backups automatically)
python scripts/optimize_images.py --quality 85 --max-width 1920

# Dry run - see what would happen without making changes
python scripts/optimize_images.py --dry-run
```

The script will:
- Compress JPEG/PNG images
- Resize oversized images (max 1920px width)
- Create WebP versions in `assets/img_webp/`
- Backup originals to `assets/img_backup/`

### Manual Optimization

1. **Format**: Use WebP for best compression, fallback to JPEG
2. **Size**: 
   - Cards: 400x300px
   - Headers: 1200x400px
   - Detail images: 800px width max
3. **Compression**: Use tools like:
   - [Squoosh](https://squoosh.app/)
   - [TinyPNG](https://tinypng.com/)
   - ImageOptim (Mac)

### Responsive Images

The site includes responsive image CSS that:
- Makes all images responsive by default
- Uses `object-fit: cover` for consistent card images
- Supports lazy loading via native `loading="lazy"`
- Handles error states for broken images

To enable WebP with fallback, use the picture element:

```html
<picture>
  <source srcset="assets/img_webp/image.webp" type="image/webp">
  <img src="assets/img/image.jpg" alt="Description" loading="lazy">
</picture>
```

---

## Testing Changes

1. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```
2. Open http://localhost:8000 in your browser
3. Check browser console for any JavaScript errors
4. Test on mobile viewport

---

## Deployment

Changes are automatically deployed when pushed to the `main` branch via GitHub Pages.

```bash
git add .
git commit -m "Add new project: Project Name"
git push origin main
```
