# 🚀 Modern Portfolio Website - Mohammad Albarham

A fast, clean, and maintainable personal academic portfolio website built with performance and user experience in mind.

## ✨ Features

- **⚡ Ultra-fast loading** - Optimized CSS/JS, lazy loading, minimal dependencies
- **📱 Fully responsive** - Beautiful on desktop, tablet, and mobile
- **🎨 Modern design** - Clean, professional aesthetic inspired by top academic portfolios
- **📊 Data-driven** - All content managed through JSON files
- **🌙 Dark mode** - System preference detection with manual toggle
- **♿ Accessible** - ARIA labels, semantic HTML, keyboard navigation
- **🔍 SEO optimized** - Proper meta tags, Open Graph, structured data
- **📈 Analytics ready** - Google Analytics integration

## 📁 Project Structure

```
/
├── index.html                          # Main homepage
├── assets/
│   ├── css/
│   │   ├── style.css                   # Base template styles
│   │   ├── modern-portfolio.css        # ⭐ Enhanced modern styles
│   │   ├── dark-mode.css               # Dark theme styles
│   │   └── components/
│   │       ├── publications.css        # Publication cards & filters
│   │       └── timeline.css            # Timeline component (legacy)
│   ├── js/
│   │   ├── main.js                     # Core functionality
│   │   ├── portfolio-renderer.js       # ⭐ Main rendering logic
│   │   ├── publications.js             # Publications manager
│   │   ├── theme.js                    # Dark mode toggle
│   │   ├── data-loader.js              # Data fetching utility
│   │   └── utils.js                    # Helper functions
│   ├── img/                            # Images and logos
│   └── vendor/                         # Third-party libraries
├── data/                               # ⭐ All content data (JSON)
│   ├── bio.json                        # Personal info & highlights
│   ├── education.json                  # Academic background
│   ├── experience.json                 # Work experience
│   ├── projects.json                   # Portfolio projects
│   ├── publications.json               # Research publications
│   ├── volunteering.json               # Volunteer activities
│   └── travel.json                     # Countries visited
├── templates/
│   └── page-template.html              # ⭐ Reusable inner page template
├── projects/                           # Project detail pages
├── publications/                       # Publication detail pages
└── volunteering/                       # Volunteering detail pages
```

## 🎯 Key Files

### Main Application Files
- **`index.html`** - Main homepage with all sections
- **`assets/css/modern-portfolio.css`** - Enhanced styles for timelines, projects, and modern UI
- **`assets/js/portfolio-renderer.js`** - Core rendering logic for all dynamic content

### Data Files (JSON)
All content is stored in `/data/` as JSON files for easy maintenance:

| File | Purpose | Example Entry |
|------|---------|---------------|
| `bio.json` | Personal info, tagline, social links | Name, title, email, highlights |
| `education.json` | Academic degrees | University, degree, dates, GPA |
| `experience.json` | Work history | Company, role, dates, responsibilities |
| `projects.json` | Portfolio projects | Title, description, tech stack, links |
| `publications.json` | Research papers | Title, authors, venue, DOI, BibTeX |
| `volunteering.json` | IEEE & volunteer roles | Organization, role, dates, impact |
| `travel.json` | Countries visited | Continent, country codes, colors |

---

## 📝 How to Update Content

### Adding Education

Edit [`data/education.json`](data/education.json):

```json
{
  "degree": "Master of Science in Computer Science",
  "field": "Data Science & AI",
  "institution": "Chalmers University of Technology",
  "location": "Gothenburg, Sweden",
  "url": "https://www.chalmers.se",
  "logo": "assets/img/logos/chalmers.png",
  "startDate": "2023-09",
  "endDate": "2025-06",
  "current": true,
  "gpa": "4.5/5.0",
  "scholarship": "Swedish Institute Scholarship for Global Professionals",
  "focus": "Specializing in Computer Vision, Deep Learning, and Machine Learning",
  "relevantCourses": ["Machine Learning", "Deep Learning", "Computer Vision"]
}
```

**Required fields:** `degree`, `institution`, `location`, `startDate`, `endDate`, `logo`  
**Optional fields:** `gpa`, `rank`, `scholarship`, `graduationProject`, `relevantCourses`, `current`

---

### Adding Experience

Edit [`data/experience.json`](data/experience.json):

```json
{
  "position": "Senior Computer Vision Engineer",
  "company": "Aptiv",
  "location": "Gothenburg, Sweden",
  "url": "https://www.aptiv.com",
  "logo": "assets/img/logos/aptiv.png",
  "startDate": "2024-01",
  "endDate": null,
  "current": true,
  "description": "Working on autonomous vehicle perception systems",
  "responsibilities": [
    "Developed real-time object detection pipelines",
    "Improved model accuracy by 15% through data augmentation",
    "Led integration of LiDAR and camera fusion algorithms"
  ],
  "technologies": ["Python", "PyTorch", "C++", "ROS", "OpenCV"]
}
```

**Required fields:** `position`, `company`, `location`, `startDate`, `logo`  
**Optional fields:** `endDate`, `url`, `description`, `responsibilities`, `technologies`, `current`

---

### Adding Projects

Edit [`data/projects.json`](data/projects.json):

```json
{
  "id": "my-awesome-project",
  "title": "AraCLIP: Arabic Image Retrieval",
  "category": "ai",
  "tags": ["Computer Vision", "NLP", "Deep Learning"],
  "featured": true,
  "image": "assets/img/portfolio/araclip.png",
  "shortDescription": "Cross-lingual Arabic text-to-image retrieval model",
  "description": "Detailed project description goes here...",
  "technologies": ["PyTorch", "Transformers", "HuggingFace"],
  "links": {
    "github": "https://github.com/username/project",
    "demo": "https://demo.example.com",
    "paper": "https://arxiv.org/abs/...",
    "huggingface": "https://huggingface.co/model"
  },
  "year": 2024,
  "detailsPage": "projects/araclip.html"
}
```

**Required fields:** `id`, `title`, `image`, `shortDescription`, `technologies`  
**Optional fields:** `featured`, `description`, `links`, `detailsPage`, `category`, `tags`, `year`

**Project images:** Place in `assets/img/portfolio/` and use relative path

---

### Adding Publications

Edit [`data/publications.json`](data/publications.json):

```json
{
  "id": "araclip-2024",
  "title": "AraCLIP: Bridging Vision and Arabic Language",
  "authors": [
    {"name": "Mohammad Albarham", "isMe": true, "url": "#"},
    {"name": "Co-Author Name", "isMe": false, "url": "https://..."}
  ],
  "venue": "ACL 2024",
  "fullVenue": "Annual Meeting of the Association for Computational Linguistics",
  "type": "conference",
  "year": 2024,
  "month": "June",
  "doi": "10.18653/v1/...",
  "urls": {
    "paper": "https://aclanthology.org/...",
    "arxiv": "https://arxiv.org/abs/...",
    "code": "https://github.com/...",
    "demo": "https://huggingface.co/..."
  },
  "bibtex": "@inproceedings{albarham2024araclip,\n  title={...},\n  author={...},\n  booktitle={...},\n  year={2024}\n}",
  "keywords": ["Computer Vision", "NLP", "Arabic"],
  "featured": true
}
```

**Required fields:** `id`, `title`, `authors`, `venue`, `type`, `year`  
**Optional fields:** `doi`, `urls`, `bibtex`, `keywords`, `featured`, `abstract`

**Publication types:** `journal`, `conference`, `preprint`, `workshop`, `book-chapter`

---

### Adding Volunteering

Edit [`data/volunteering.json`](data/volunteering.json):

```json
{
  "role": "Chair, Student Activities Committee",
  "organization": "IEEE Region 8 (Europe, Middle East, Africa)",
  "location": "Europe",
  "logo": "assets/img/logos/ieee.png",
  "startDate": "2023-01",
  "endDate": null,
  "current": true,
  "description": "Leading student engagement initiatives across 100+ countries",
  "responsibilities": [
    "Coordinate activities for 150,000+ student members",
    "Organize regional conferences and competitions",
    "Mentor student branch leaders"
  ]
}
```

**Required fields:** `role`, `organization`, `startDate`, `logo`  
**Optional fields:** `endDate`, `location`, `description`, `responsibilities`, `current`

---

### Adding Countries to Travel Map

Edit [`data/travel.json`](data/travel.json):

```json
{
  "visited": {
    "Europe": ["SE", "GB", "DE", "FR", "ES"],
    "Asia": ["JO", "AE", "SA"],
    "Africa": ["EG", "MA"],
    "North America": ["US", "CA"]
  },
  "continentColors": {
    "Europe": "#3498db",
    "Asia": "#e74c3c",
    "Africa": "#f39c12",
    "North America": "#9b59b6"
  },
  "countryNames": {
    "SE": "Sweden",
    "GB": "United Kingdom",
    "JO": "Jordan"
  }
}
```

**Country codes:** Use [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) codes (e.g., `SE` for Sweden, `US` for USA)

---

## 🎨 Creating Inner Pages

### Using the Template

Use [`templates/page-template.html`](templates/page-template.html) as the base for all inner pages.

**Replace these placeholders:**
- `{{PAGE_TITLE}}` - Page title (e.g., "AraCLIP Project")
- `{{PAGE_DESCRIPTION}}` - SEO description
- `{{PAGE_KEYWORDS}}` - SEO keywords
- `{{PAGE_URL}}` - Relative URL (e.g., "projects/araclip.html")
- `{{PAGE_IMAGE}}` - Social media share image
- `{{BREADCRUMB_ITEMS}}` - Additional breadcrumb items
- `{{PAGE_CONTENT}}` - Main content HTML
- `{{PAGE_SCRIPTS}}` - Additional JS scripts

### Example: Project Detail Page

```html
<!-- Replace placeholders in page-template.html -->
<title>AraCLIP: Arabic Image Retrieval | Mohammad Albarham</title>
<meta name="description" content="Cross-lingual Arabic text-to-image retrieval using CLIP">

<!-- Breadcrumbs -->
<li><a href="/#projects">Projects</a></li>

<!-- Main Content -->
<div class="project-details">
  <h1>AraCLIP: Bridging Vision and Arabic Language</h1>
  <img src="/assets/img/portfolio/araclip.png" alt="AraCLIP" class="img-fluid mb-4">
  <p>Detailed project description...</p>
  
  <h2>Key Features</h2>
  <ul>
    <li>Cross-lingual knowledge distillation from CLIP</li>
    <li>10% improvement over multilingual models</li>
  </ul>
</div>
```

**Folder organization:**
- Project pages → `/projects/project-name.html`
- Publication pages → `/publications/paper-name.html`
- Volunteering pages → `/volunteering/activity-name.html`

---

## 🎭 Styling Guidelines

### Timeline Items

Timelines are automatically styled with the classes in `modern-portfolio.css`:

- `.timeline` - Container for timeline
- `.timeline-item` - Individual entry
- `.timeline-content` - Content card
- `.timeline-header` - Logo + title section
- `.timeline-logo` - Company/university logo (48×48px)
- `.timeline-current-badge` - "Current" badge for active roles

**Adding a "current" item:** Set `"current": true` in JSON

### Project Cards

Projects use image-left, text-right layout:

- `.project-card` - Container
- `.project-image` - Left image (280px wide)
- `.project-content` - Right content area
- `.project-title` - Project name
- `.tech-tag` - Technology badge
- `.project-link` - CTA button

**Featured projects:** Set `"featured": true` in JSON to add a star badge

### Color Palette

The design uses CSS custom properties defined in `modern-portfolio.css`:

```css
--primary-color: #0563bb;      /* Primary blue */
--text-primary: #272829;       /* Dark text */
--text-secondary: #626970;     /* Medium text */
--bg-primary: #ffffff;         /* White background */
--bg-secondary: #f5f8fd;       /* Light gray */
```

**Dark mode:** Colors automatically adjust with `[data-theme="dark"]`

---

## 🌙 Dark Mode

Dark mode is implemented with:
- System preference detection
- Manual toggle (added to navbar automatically)
- localStorage persistence

**Files:** `assets/css/dark-mode.css`, `assets/js/theme.js`

**Customizing colors:** Edit CSS variables in `dark-mode.css`:

```css
[data-theme="dark"] {
  --primary-color: #409fff;
  --bg-primary: #0d1117;
  --text-primary: #e6edf3;
}
```

---

## ⚡ Performance Optimization

### Current Optimizations

✅ Lazy loading for images (`loading="lazy"`)  
✅ Deferred JS loading (`defer` attribute)  
✅ CSS custom properties (no JS for theming)  
✅ Intersection Observer for scroll animations  
✅ Minimal dependencies (no heavy frameworks)  
✅ Efficient data caching in `PortfolioRenderer`

### Recommended Optimizations

1. **Image optimization:**
   ```bash
   # Install imageoptim or use online tools
   # Compress all images in assets/img/
   # Target: <100KB per image, use WebP format
   ```

2. **Minify CSS/JS:**
   ```bash
   # Use online minifiers or build tools
   npm install -g clean-css-cli uglify-js
   cleancss -o style.min.css style.css
   uglifyjs main.js -o main.min.js
   ```

3. **CDN for fonts:**
   Already using Google Fonts CDN with `&display=swap`

4. **Preconnect to external resources:**
   Already added in `<head>`:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   ```

### Testing Performance

1. **Lighthouse (Chrome DevTools):**
   - Open Chrome DevTools (F12)
   - Go to "Lighthouse" tab
   - Run audit for Performance, Accessibility, SEO
   - Target: 90+ scores

2. **WebPageTest:**
   - Visit [webpagetest.org](https://www.webpagetest.org)
   - Enter your URL
   - Check load time, First Contentful Paint, Speed Index

---

## 🚀 Deployment

### GitHub Pages

1. **Push changes:**
   ```bash
   git add .
   git commit -m "Update portfolio content"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from branch `main`
   - Folder: `/` (root)

3. **Custom domain (optional):**
   - Add `CNAME` file with your domain
   - Configure DNS records

### Build Process

**No build required!** This is a static site that runs directly in the browser.

Optional: Create a build script for production:

```bash
#!/bin/bash
# build.sh - Optional production build

# Minify CSS
cleancss -o assets/css/modern-portfolio.min.css assets/css/modern-portfolio.css

# Minify JS
uglifyjs assets/js/portfolio-renderer.js -o assets/js/portfolio-renderer.min.js

# Optimize images (requires imageoptim-cli)
imageoptim --directory assets/img/

echo "Build complete!"
```

---

## 🐛 Troubleshooting

### Content Not Loading

**Problem:** Timeline or projects section shows "Loading..."

**Solution:**
1. Check browser console for errors (F12)
2. Verify JSON files are valid (use [jsonlint.com](https://jsonlint.com))
3. Ensure file paths are correct (relative to site root)
4. Check that `portfolio-renderer.js` is loaded

### Images Not Displaying

**Problem:** Broken image icons

**Solution:**
1. Verify image paths in JSON files
2. Check that images exist in `assets/img/`
3. Use relative paths: `assets/img/portfolio/image.png`
4. Add fallback images with `onerror` attribute

### Dark Mode Not Working

**Problem:** Theme toggle doesn't appear or doesn't persist

**Solution:**
1. Check that `theme.js` is loaded
2. Clear browser localStorage
3. Verify CSS file order (dark-mode.css loaded last)
4. Check console for errors

### Animations Not Smooth

**Problem:** Laggy scroll animations

**Solution:**
1. Reduce number of animated elements
2. Enable GPU acceleration (already in CSS)
3. Check browser hardware acceleration is enabled
4. Test on different devices

---

## 📚 Dependencies

### Core Libraries

| Library | Version | Purpose | Size |
|---------|---------|---------|------|
| Bootstrap | 5.3 | UI framework, grid system | ~25KB (min) |
| jQuery | 3.7 | DOM manipulation, jVectorMap | ~30KB (min) |
| jVectorMap | 1.2.2 | Travel map visualization | ~15KB |
| Particles.js | 2.0 | Header animation | ~12KB |

### Vendor Libraries (Included)

- Bootstrap Icons - Icon font
- AOS (Animate On Scroll) - Scroll animations (optional)
- GLightbox - Image lightbox (optional)

### External Resources

- Google Fonts (Open Sans, Raleway)
- Academicons (Scholar icon)
- Google Analytics

**Total size:** ~150KB (CSS + JS, minified)

---

## 🎓 Credits & Inspiration

This portfolio design is inspired by:

- [Lane McIntosh](https://www.lanemcintosh.com/#cv) - Clean timeline design
- [Maggy Liang](https://maggyl.github.io/) - Project card layout
- [Georg Hess](https://georghess.se/publications/) - Publication filtering

**Template base:** [iPortfolio by BootstrapMade](https://bootstrapmade.com/iportfolio-bootstrap-portfolio-websites-template/)

---

## 📞 Support

For questions or issues:

1. Check this README first
2. Look for console errors (F12 → Console tab)
3. Review JSON file syntax
4. Open an issue on GitHub (if applicable)

---

## 📄 License

This portfolio is open source and free to use. Attribution to original template creators is appreciated.

**Template:** iPortfolio by BootstrapMade (MIT License)  
**Customizations:** Mohammad Albarham © 2025

---

## 🔄 Version History

### v2.0.0 (December 2024)
- ✨ Complete refactor with data-driven architecture
- 🎨 Modern timeline design for Education/Experience/Volunteering
- 🖼️ Image-left project cards
- 🌙 Dark mode with system preference detection
- ⚡ Performance optimizations (lazy loading, Intersection Observer)
- 📁 Organized folder structure for inner pages
- 📚 Comprehensive documentation

### v1.0.0 (2023)
- Initial portfolio website with Bootstrap template

---

**Last updated:** December 17, 2025  
**Maintained by:** Mohammad Albarham
