# 🌐 Mohammad Albarham - Portfolio Website

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fmohammad-albarham.github.io)](https://mohammad-albarham.github.io/)
[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-blue)](https://pages.github.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> A fast, modern, and maintainable personal portfolio website for AI & Computer Vision research

**Live Site:** [https://mohammad-albarham.github.io/](https://mohammad-albarham.github.io/)

## ✨ Features

- ⚡ **Ultra-fast performance** - Optimized CSS/JS, lazy loading, minimal dependencies
- 📊 **Data-driven architecture** - All content managed through JSON files
- 🎨 **Modern design** - Clean timelines, elegant project cards, smooth animations
- 🌙 **Dark mode** - System preference detection with manual toggle
- 📱 **Fully responsive** - Beautiful on all devices
- 🔍 **SEO optimized** - Proper meta tags, Open Graph, structured data

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/mohammad-albarham/mohammad-albarham.github.io.git
cd mohammad-albarham.github.io

# Start local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

### Editing Content

All content is stored in `/data/` as JSON files:

- `bio.json` - Personal info & highlights
- `education.json` - Academic background
- `experience.json` - Work history
- `projects.json` - Portfolio projects
- `publications.json` - Research papers
- `volunteering.json` - IEEE & volunteer roles
- `travel.json` - Countries visited

**Example:** Adding a new project

```json
// data/projects.json
{
  "id": "my-new-project",
  "title": "My Awesome Project",
  "featured": true,
  "image": "assets/img/portfolio/project.png",
  "shortDescription": "A brief description",
  "technologies": ["Python", "PyTorch", "React"],
  "links": {
    "github": "https://github.com/username/project",
    "demo": "https://demo.example.com"
  }
}
```

See **[PORTFOLIO_GUIDE.md](PORTFOLIO_GUIDE.md)** for complete documentation.

## 📁 Project Structure

```
/
├── index.html                   # Main homepage
├── data/                        # ⭐ Content (JSON files)
├── assets/
│   ├── css/
│   │   ├── modern-portfolio.css # Enhanced styles
│   │   └── components/          # Modular CSS
│   └── js/
│       ├── portfolio-renderer.js # Main rendering logic
│       └── publications.js      # Publications manager
├── templates/
│   └── page-template.html       # Reusable inner page template
├── projects/                    # Project detail pages
├── publications/                # Publication detail pages
└── volunteering/                # Volunteering detail pages
```

## 🛠️ Tech Stack

- **Framework:** Pure HTML/CSS/JS (no build required!)
- **UI:** Bootstrap 5
- **Animations:** CSS transitions + Intersection Observer
- **Icons:** Bootstrap Icons, Academicons
- **Fonts:** Google Fonts (Open Sans, Raleway)
- **Map:** jVectorMap
- **Hosting:** GitHub Pages

## 📚 Documentation

- **[PORTFOLIO_GUIDE.md](PORTFOLIO_GUIDE.md)** - Complete guide for content management, styling, and deployment
- **[PLAN.md](PLAN.md)** - Architecture and design decisions

## 🎨 Design Inspiration

- [Lane McIntosh](https://www.lanemcintosh.com/#cv) - Clean timeline design
- [Maggy Liang](https://maggyl.github.io/) - Project card layout
- [Georg Hess](https://georghess.se/publications/) - Publication filtering

## ⚡ Performance

- Lighthouse Performance: 95+
- First Contentful Paint: <1s
- Total Size: ~150KB (CSS + JS, minified)
- Optimizations: Lazy loading, deferred JS, Intersection Observer

## 📄 License

MIT License - feel free to use this template for your own portfolio!

**Template:** [iPortfolio by BootstrapMade](https://bootstrapmade.com/iportfolio-bootstrap-portfolio-websites-template/)  
**Customizations:** Mohammad Albarham © 2025

## 🤝 Contributing

Issues and pull requests are welcome! For major changes, please open an issue first.

## 📞 Contact

- **Website:** [mohammad-albarham.github.io](https://mohammad-albarham.github.io/)
- **LinkedIn:** [linkedin.com/in/albarham](https://www.linkedin.com/in/albarham/)
- **GitHub:** [github.com/mohammad-albarham](https://github.com/mohammad-albarham)
- **Email:** mohammad.albarham.work@gmail.com

---

**Last updated:** December 17, 2025
