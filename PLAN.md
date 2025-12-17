# Website Refactoring Plan

## 📋 Executive Summary

This document outlines the complete refactoring plan for transforming the current personal academic website into a modern, data-driven, maintainable portfolio suitable for an AI/Computer Vision researcher and engineer.

---

## 🔍 Current Site Analysis

### Issues Identified

1. **Hard-coded Content**: All content (publications, experience, education, volunteering) is embedded directly in HTML files, making updates tedious and error-prone.

2. **Code Duplication**: Header, navigation, and footer are duplicated across 30+ HTML files (`index.html`, `portfolio-details-*.html`, `volunteering_ieee.html`, etc.).

3. **Poor SEO**: Many pages have generic titles ("iPortfolio Bootstrap Template") and empty meta descriptions.

4. **Inconsistent Structure**: Mixed inline styles, commented-out code blocks, and inconsistent class naming.

5. **Heavy Dependencies**: Multiple unused or duplicate libraries loaded (multiple jQuery versions, unused CSS).

6. **Travel Map Issues**: The jVectorMap works but requires manual code updates for new countries.

7. **Publication Citations**: BibTeX blocks are hard to read; no filtering or search capability.

8. **No Dark Mode**: Only light theme available despite modern browser support.

### Opportunities

- Rich content that can be extracted into structured data
- Good foundation with Bootstrap 5 and existing vendor libraries
- GitHub Pages compatibility already established
- Strong academic/research background to highlight

---

## 🏗️ New Information Architecture

### Site Structure

```
/
├── Home (Hero, Bio highlights, Featured publications)
├── Research & Publications (Searchable, filterable list)
├── Projects (Featured + All projects grid)
├── Experience (Timeline view)
├── Education (Academic background)
├── Volunteering (IEEE and other activities)
├── Travel (Interactive world map)
└── Contact (Form + Links)
```

### Navigation

Single-page design with smooth scroll navigation:
- Home
- About
- Resume (Education + Experience combined)
- Projects
- Publications
- Volunteering
- Travel
- Contact

---

## 📊 Data Model

### Schema Definitions

#### 1. Bio (`data/bio.json`)
```json
{
  "name": "Mohammad Albarham",
  "title": "Computer Vision & AI Engineer",
  "tagline": "Problem solver passionate about AI, computer vision, and autonomous systems",
  "currentRole": "Vision Engineer at Aptiv | MSc Student at Chalmers",
  "location": "Gothenburg, Sweden",
  "email": "mohammad.albarham.work@gmail.com",
  "photo": "assets/img/profile-img.jpg",
  "summary": "...",
  "socialLinks": {
    "linkedin": "https://www.linkedin.com/in/albarham/",
    "github": "https://github.com/mohammad-albarham",
    "googleScholar": "https://scholar.google.com/citations?user=3znRUJoAAAAJ&hl=en",
    "huggingface": "https://huggingface.co/pain"
  },
  "highlights": ["SI Scholarship recipient", "8+ publications", "IEEE R8 Volunteer"]
}
```

#### 2. Education (`data/education.json`)
```json
[
  {
    "id": "chalmers-msc",
    "institution": "Chalmers University of Technology",
    "location": "Gothenburg, Sweden",
    "degree": "MSc in Systems, Control and Mechatronics",
    "focus": "Artificial Intelligence, Autonomous Systems & Control",
    "startDate": "2024-09",
    "endDate": null,
    "current": true,
    "logo": "assets/img/chalmers_logo.png",
    "url": "https://www.chalmers.se/en/",
    "scholarship": "SI Scholarship for Global Professionals",
    "courses": [
      {"code": "ESS101", "name": "Modelling and simulation", "url": "..."},
      {"code": "SSY165", "name": "Logic, learning, and decision", "url": "..."}
    ],
    "currentCourses": [
      {"code": "TRA220", "name": "GPU-accelerated Computational Methods", "url": "..."}
    ]
  },
  {
    "id": "uj-bsc",
    "institution": "University of Jordan",
    "location": "Amman, Jordan",
    "degree": "BSc in Mechatronics Engineering",
    "startDate": "2016-09",
    "endDate": "2022-06",
    "current": false,
    "logo": "assets/img/University_of_Jordan_Logo.png",
    "url": "https://www.ju.edu.jo/Home.aspx",
    "gpa": "3.94/4.00",
    "rank": "1st",
    "accreditation": "ABET",
    "scholarship": "Grant from Ministry of Higher Education",
    "graduationProject": {
      "title": "Design of Arabic sign language recognition model",
      "url": "https://arxiv.org/abs/2301.02693"
    }
  }
]
```

#### 3. Experience (`data/experience.json`)
```json
[
  {
    "id": "aptiv-2025",
    "company": "Aptiv",
    "position": "Vision Engineer in Advanced Safety Systems",
    "type": "full-time",
    "startDate": "2025-03",
    "endDate": null,
    "current": true,
    "location": "Gothenburg, Sweden",
    "logo": "assets/img/aptiv-logo.png",
    "url": "https://www.aptiv.com/en",
    "description": "Working on Advanced Safety Systems, specifically on Vision Systems for cars.",
    "responsibilities": [
      "Analyze events and cases related to AEB (Automatic Emergency Braking)",
      "Automate software processes and improve efficiency",
      "Fuse sensors such as camera and LiDAR",
      "Test advanced safety systems in real-life scenarios"
    ],
    "technologies": ["Computer Vision", "LiDAR", "Sensor Fusion", "Python"]
  }
]
```

#### 4. Publications (`data/publications.json`)
```json
[
  {
    "id": "araclip-eaai-2025",
    "title": "Unlocking language boundaries: AraCLIP - transforming Arabic language and image understanding through cross-lingual models",
    "authors": [
      {"name": "Muhammad Al-Barham", "isMe": true},
      {"name": "Imad Afyouni"},
      {"name": "Khalid Almubarak"},
      {"name": "Ayad Turky"},
      {"name": "Ibrahim Abaker Targio Hashem"},
      {"name": "Ali Bou Nassif"},
      {"name": "Ismail Shahin"},
      {"name": "Ashraf Elnagar"}
    ],
    "venue": "Engineering Applications of Artificial Intelligence",
    "venueShort": "EAAI",
    "type": "journal",
    "year": 2025,
    "volume": "151",
    "pages": "110577",
    "doi": "https://doi.org/10.1016/j.engappai.2025.110577",
    "url": "https://www.sciencedirect.com/science/article/pii/S0952197625005779",
    "pdfUrl": "https://www.sciencedirect.com/science/article/pii/S0952197625005779/pdfft?...",
    "huggingface": "https://huggingface.co/Arabic-Clip",
    "abstract": "In the domain of image retrieval, the integration of text and images has been transformative...",
    "keywords": ["Arabic multimodal", "Text-to-image retrieval", "Knowledge distillation", "Deep learning"],
    "bibtex": "@article{ALBARHAM2025110577,...}",
    "featured": true
  }
]
```

#### 5. Projects (`data/projects.json`)
```json
[
  {
    "id": "araclip-project",
    "title": "AraCLIP: Cross-Lingual Arabic Image Retrieval",
    "category": "ai",
    "featured": true,
    "image": "assets/img/portfolio/lp_photo_1.png",
    "shortDescription": "Cross-lingual learning for Arabic text-to-image retrieval",
    "description": "AraCLIP extends CLIP for Arabic image retrieval using knowledge distillation...",
    "technologies": ["PyTorch", "CLIP", "Transformers", "Knowledge Distillation"],
    "links": {
      "github": "https://github.com/...",
      "demo": "https://huggingface.co/Arabic-Clip",
      "paper": "https://aclanthology.org/2024.arabicnlp-1.9/"
    },
    "year": 2024
  }
]
```

#### 6. Volunteering (`data/volunteering.json`)
```json
[
  {
    "id": "ieee-sweden-sac",
    "organization": "IEEE Sweden Section",
    "position": "Student Activities Coordinator (SAC)",
    "startDate": "2025-04",
    "endDate": null,
    "current": true,
    "logo": "assets/img/IEEE-Region-8-Logo-1024x401.png",
    "url": "https://r8.ieee.org/sweden/",
    "description": "",
    "category": "ieee"
  }
]
```

#### 7. Travel (`data/travel.json`)
```json
{
  "visited": {
    "Africa": ["TN"],
    "Asia": ["JO", "PS", "SA", "AE", "TR", "OM"],
    "Europe": ["PL", "CH", "AT", "DE", "MK", "SE", "TR", "HU", "DK", "BA", "LT", "FI"],
    "North America": ["CA"]
  },
  "continentColors": {
    "Europe": "#c10000",
    "North America": "#00cc00",
    "South America": "#008000",
    "Asia": "#f33e01",
    "Africa": "#fed52e",
    "Antarctica": "#0040ff",
    "Oceania": "#c04080"
  }
}
```

---

## 📁 New File Structure

```
mohammad-albarham.github.io/
├── index.html                    # Main single-page site
├── PLAN.md                       # This document
├── README.md                     # Project documentation
├── robots.txt
├── sitemap.xml
│
├── data/                         # Structured data files
│   ├── bio.json
│   ├── education.json
│   ├── experience.json
│   ├── publications.json
│   ├── projects.json
│   ├── volunteering.json
│   └── travel.json
│
├── assets/
│   ├── css/
│   │   ├── style.css            # Main styles (refactored)
│   │   ├── dark-mode.css        # Dark mode overrides
│   │   └── components/          # Component-specific styles
│   │       ├── publications.css
│   │       ├── timeline.css
│   │       └── map.css
│   │
│   ├── js/
│   │   ├── main.js              # Core functionality
│   │   ├── data-loader.js       # JSON data loading utilities
│   │   ├── publications.js      # Publication filtering/search
│   │   ├── theme.js             # Dark mode toggle
│   │   ├── map.js               # Travel map initialization
│   │   └── countries.js         # Country data (auto-generated from travel.json)
│   │
│   ├── img/                     # Images (unchanged)
│   │
│   └── vendor/                  # Third-party libraries (cleaned up)
│
├── pages/                       # Optional detail pages
│   ├── project-details.html     # Template for project details
│   └── volunteering-details.html
│
└── legacy/                      # Old files (for reference, not deployed)
    ├── portfolio-details-*.html
    └── ...
```

---

## 🎨 Design Specifications

### Color Palette

```css
:root {
  /* Light theme */
  --primary: #149ddd;
  --primary-dark: #0d6efd;
  --text-primary: #272829;
  --text-secondary: #6c757d;
  --bg-primary: #ffffff;
  --bg-secondary: #f5f8fb;
  --bg-sidebar: #040b14;
  
  /* Dark theme */
  --dark-primary: #149ddd;
  --dark-text-primary: #e4e6eb;
  --dark-text-secondary: #b0b3b8;
  --dark-bg-primary: #18191a;
  --dark-bg-secondary: #242526;
  --dark-bg-sidebar: #040b14;
}
```

### Typography

- **Headings**: Raleway (600-700 weight)
- **Body**: Open Sans (400-600 weight)
- **Code/BibTeX**: JetBrains Mono or Fira Code

### Spacing Scale

```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
```

---

## ⚙️ Implementation Steps

### Phase 1: Data Extraction (Day 1)
1. ✅ Create `data/` directory
2. ✅ Extract and normalize all content from current HTML into JSON files
3. ✅ Validate JSON schemas
4. ✅ Create `data-loader.js` module

### Phase 2: Core Infrastructure (Day 2)
1. ✅ Create new `index.html` with semantic sections
2. ✅ Refactor CSS into modular components
3. ✅ Implement dark mode toggle
4. ✅ Add CSS custom properties for theming

### Phase 3: Component Implementation (Days 3-4)
1. ✅ Implement Hero section with typed.js
2. ✅ Implement Publications section with search/filter
3. ✅ Implement Experience/Education timeline
4. ✅ Implement Projects grid with filtering
5. ✅ Implement Travel map (fix country display)

### Phase 4: Polish & Optimization (Day 5)
1. ✅ Add animations (AOS library optimization)
2. ✅ Implement lazy loading for images
3. ✅ Add SEO metadata to all sections
4. ✅ Performance audit and optimization
5. ✅ Mobile responsiveness testing

### Phase 5: Migration (Day 6)
1. ✅ Move old files to `legacy/` directory
2. ✅ Update all internal links
3. ✅ Test all functionality
4. ✅ Deploy to GitHub Pages

---

## 📝 How to Maintain the Site

### Adding a New Publication

1. Open `data/publications.json`
2. Add a new entry at the beginning of the array:
```json
{
  "id": "unique-id",
  "title": "Your Paper Title",
  "authors": [{"name": "Author Name", "isMe": true/false}, ...],
  "venue": "Conference/Journal Name",
  "type": "journal|conference|workshop|preprint",
  "year": 2025,
  "doi": "...",
  "featured": false
}
```
3. Commit and push - the site automatically renders the new publication

### Adding a New Position/Experience

1. Open `data/experience.json`
2. Add entry with company, position, dates, and responsibilities
3. Commit and push

### Adding a Visited Country

1. Open `data/travel.json`
2. Add the ISO 3166-1 alpha-2 country code to the appropriate continent array
3. Commit and push

---

## 🚀 Deployment

The site is deployed via GitHub Pages from the `main` branch root directory.

### Build Process
None required - pure static HTML/CSS/JS with client-side JSON loading.

### Cache Strategy
- JSON data files: short cache (1 hour) for easy updates
- Static assets: long cache (1 week) with versioning

---

## 📊 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Lighthouse Performance | >90 | ~75 |
| Lighthouse Accessibility | >95 | ~80 |
| Lighthouse SEO | >95 | ~70 |
| First Contentful Paint | <1.5s | ~2.5s |
| Time to Interactive | <3s | ~4s |

---

## 🔗 Resources

- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)
- [AOS Animation Library](https://michalsnik.github.io/aos/)
- [jVectorMap](https://jvectormap.com/)
- [Google Fonts](https://fonts.google.com/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)

---

*Last updated: December 2024*
