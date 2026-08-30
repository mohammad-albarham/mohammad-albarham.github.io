/**
 * Modern Portfolio - Enhanced Rendering
 * Optimized for performance and clean code
 */

class PortfolioRenderer {
  /**
   * Icon and label for well-known competition link keys. Any other key is
   * rendered with a generic link icon and the key itself as the label, so
   * data/competitions.json can use free-form labels like "Competition link".
   */
  static LINK_LABELS = {
    github: { icon: 'bi-github', label: 'GitHub' },
    demo: { icon: 'bi-play-circle', label: 'Live Demo' },
    site: { icon: 'bi-link-45deg', label: 'Competition Site' },
    kaggle: { icon: 'bi-bar-chart', label: 'Kaggle' },
    paper: { icon: 'bi-file-text', label: 'Paper' },
    report: { icon: 'bi-file-earmark-pdf', label: 'Report' },
    poster: { icon: 'bi-easel', label: 'Poster' }
  };

  constructor() {
    this.dataCache = new Map();
    this.observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      this.observerOptions
    );
  }

  /**
   * Intersection Observer callback for scroll animations
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('aos-animate', 'active');
        this.observer.unobserve(entry.target);
      }
    });
  }

  /**
   * Observe elements for scroll animations
   */
  observeElements(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => this.observer.observe(el));
  }

  /**
   * Build a <picture> that prefers the WebP in assets/img_webp/ and falls back
   * to the original. The WebP copies are sized for how they actually render
   * (96px for logos, 800px for cards) rather than at full resolution.
   *
   * @param {string} src   original path, e.g. assets/img/portfolio/p1.png
   * @param {string} alt   alt text
   * @param {object} opts  {className, width, height, eager}
   */
  picture(src, alt, opts = {}) {
    const { className = '', width, height, eager = false } = opts;
    const safeAlt = String(alt || '').replace(/"/g, '&quot;');
    const webp = src.startsWith('assets/img/')
      ? src.replace('assets/img/', 'assets/img_webp/').replace(/\.(png|jpe?g|gif)$/i, '.webp')
      : null;
    const dims = `${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''}`;
    const loading = eager ? ' fetchpriority="high"' : ' loading="lazy"';
    const img = `<img src="${src}" alt="${safeAlt}" class="${className}"${dims}${loading} decoding="async">`;
    return webp
      ? `<picture><source srcset="${webp}" type="image/webp">${img}</picture>`
      : img;
  }

  /**
   * Load JSON data with caching
   */
  async loadData(filename) {
    if (this.dataCache.has(filename)) {
      return this.dataCache.get(filename);
    }

    try {
      // Prefer the shared loader: it de-duplicates in-flight requests, so asking
      // for a file that publications.js also needs costs a single fetch.
      // Errors are still swallowed to null so one bad file cannot abort init().
      const data = window.dataLoader
        ? await window.dataLoader.load(filename)
        : await (async () => {
            const response = await fetch(`data/${filename}.json`);
            if (!response.ok) throw new Error(`Failed to load ${filename}`);
            return response.json();
          })();
      this.dataCache.set(filename, data);
      return data;
    } catch (error) {
      console.error(`Error loading ${filename}:`, error);
      return null;
    }
  }

  /**
   * Format date range
   */
  formatDateRange(startDate, endDate) {
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const start = formatDate(startDate);
    const end = endDate === 'present' || !endDate ? 'Present' : formatDate(endDate);
    return `${start} – ${end}`;
  }

  /**
   * Render a single course list item, with optional reference links
   */
  courseItem(c) {
    const label = `${c.code} – ${c.name}`;
    const title = c.url
      ? `<a href="${c.url}" target="_blank" rel="noopener">${label}</a>`
      : label;
    const links = c.links && c.links.length > 0
      ? `<span class="course-links">${c.links.map(l =>
          `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`
        ).join('')}</span>`
      : '';
    const projectLink = c.projectUrl
      ? `<div class="course-project-link-row">
          <a class="course-project-link" href="${c.projectUrl}">
            <i class="bi bi-folder2-open" aria-hidden="true"></i> View related project
          </a>
        </div>`
      : '';
    return `<li>${title}${links}${projectLink}</li>`;
  }

  /**
   * Render Education Timeline
   */
  renderEducation(education) {
    const container = document.getElementById('education-container');
    if (!container || !education) return;

    const html = education.map(edu => `
      <div class="timeline-item ${edu.current ? 'current' : ''}" data-aos="fade-up">
        <div class="timeline-content">
          <div class="timeline-header">
            ${this.picture(edu.logo, edu.institution, {className: 'timeline-logo', width: 48, height: 48})}
            <div class="timeline-title">
              <h4><a href="${edu.url}" target="_blank" rel="noopener">${edu.degree}</a></h4>
              <p class="timeline-institution">${edu.institution}</p>
            </div>
          </div>
          <div class="timeline-meta">
            <span class="timeline-date">
              <i class="bi bi-calendar3"></i>
              ${this.formatDateRange(edu.startDate, edu.endDate)}
            </span>
            <span class="timeline-location">
              <i class="bi bi-geo-alt"></i>
              ${edu.location}
            </span>
            ${edu.current ? '<span class="timeline-current-badge"><i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i> Current</span>' : ''}
          </div>
          <div class="timeline-description">
            <p>${edu.focus}</p>
            ${edu.scholarship ? `<p><strong>🎓 Scholarship:</strong> ${edu.scholarship}</p>` : ''}
            ${edu.gpa ? `
              <p>
                <strong>GPA:</strong> ${edu.gpa}
                ${edu.rank ? ` | <strong>Rank:</strong> ${edu.rank}` : ''}
              </p>
            ` : ''}
            ${edu.graduationProject ? `
              <p>
                <strong>Graduation Project:</strong> 
                <a href="${edu.graduationProject.url}" target="_blank" rel="noopener">${edu.graduationProject.title}</a>
                ${edu.graduationProject.grade ? ` (Grade: ${edu.graduationProject.grade})` : ''}
              </p>
            ` : ''}
          </div>
          ${edu.completedCourses && edu.completedCourses.length > 0 ? `
            <div class="timeline-courses">
              <p class="courses-label">Courses completed so far:</p>
              <ul>
                ${edu.completedCourses.map(c => this.courseItem(c)).join('')}
              </ul>
            </div>
          ` : ''}
          ${edu.currentCourses && edu.currentCourses.length > 0 ? `
            <div class="timeline-courses">
              <p class="courses-label">Current Courses:</p>
              <ul>
                ${edu.currentCourses.map(c => this.courseItem(c)).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="timeline">${html}</div>`;
    this.observeElements('.timeline-item');
  }

  /**
   * Render Experience Timeline
   */
  renderExperience(experience) {
    const container = document.getElementById('experience-container');
    if (!container || !experience) return;

    const html = experience.map(exp => `
      <div class="timeline-item ${exp.current ? 'current' : ''}" data-aos="fade-up">
        <div class="timeline-content">
          <div class="timeline-header">
            ${this.picture(exp.logo, exp.company, {className: 'timeline-logo', width: 48, height: 48})}
            <div class="timeline-title">
              <h4>${exp.position}</h4>
              <p class="timeline-institution">
                ${exp.url ? `<a href="${exp.url}" target="_blank" rel="noopener">${exp.company}</a>` : exp.company}
              </p>
            </div>
          </div>
          <div class="timeline-meta">
            <span class="timeline-date">
              <i class="bi bi-calendar3"></i>
              ${this.formatDateRange(exp.startDate, exp.endDate)}
            </span>
            <span class="timeline-location">
              <i class="bi bi-geo-alt"></i>
              ${exp.location}
            </span>
            ${exp.current ? '<span class="timeline-current-badge"><i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i> Current</span>' : ''}
          </div>
          <div class="timeline-description">
            <p>${exp.description}</p>
            ${exp.responsibilities && exp.responsibilities.length > 0 ? `
              <div class="timeline-highlights">
                <ul>
                  ${exp.responsibilities.slice(0, 4).map(resp => `<li>${resp}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
          ${exp.technologies && exp.technologies.length > 0 ? `
            <div class="timeline-tags">
              ${exp.technologies.slice(0, 8).map(tech => 
                `<span class="timeline-tag">${tech}</span>`
              ).join('')}
            </div>
          ` : ''}
          ${exp.detailsPage ? `
            <a href="${exp.detailsPage}" class="timeline-details-link">
              <i class="bi bi-arrow-right-circle"></i> Learn more
            </a>
          ` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="timeline">${html}</div>`;
    this.observeElements('.timeline-item');
  }

  /**
   * Render Volunteering Timeline
   */
  renderVolunteering(volunteering) {
    const container = document.getElementById('volunteering-container');
    if (!container || !volunteering) return;

    const html = volunteering.map(vol => `
      <div class="timeline-item ${vol.current ? 'current' : ''}" data-aos="fade-up">
        <div class="timeline-content">
          <div class="timeline-header">
            ${this.picture(vol.logo, vol.organization, {className: 'timeline-logo', width: 48, height: 48})}
            <div class="timeline-title">
              <h4>${vol.position || vol.role}</h4>
              <p class="timeline-institution">${vol.organization}</p>
            </div>
          </div>
          <div class="timeline-meta">
            <span class="timeline-date">
              <i class="bi bi-calendar3"></i>
              ${this.formatDateRange(vol.startDate, vol.endDate)}
            </span>
            ${vol.location ? `
              <span class="timeline-location">
                <i class="bi bi-geo-alt"></i>
                ${vol.location}
              </span>
            ` : ''}
            ${vol.current ? '<span class="timeline-current-badge"><i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i> Active</span>' : ''}
          </div>
          <div class="timeline-description">
            <p>${vol.description}</p>
            ${vol.responsibilities && vol.responsibilities.length > 0 ? `
              <div class="timeline-highlights">
                <ul>
                  ${vol.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="timeline">${html}</div>`;
    this.observeElements('.timeline-item');
  }

  /**
   * Format a single "YYYY-MM" as "Mar 2023".
   * Parsed by hand rather than via Date so the month cannot slip backwards in
   * timezones behind UTC.
   */
  formatMonthYear(dateStr) {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
  }

  /**
   * Render Competitions
   *
   * Reuses the project card classes so a competition looks identical to a
   * project; the only competition-specific markup is the award badge and the
   * date/organizer/location meta line.
   */
  renderCompetitions(competitions) {
    const container = document.getElementById('competitions-container');
    if (!container || !competitions) return;

    const html = competitions.map(comp => `
      <div class="project-card" data-aos="fade-up"
           data-tech="${(comp.technologies || []).join('|')}">
        <div class="project-image">
          ${this.picture(comp.image, comp.title)}
        </div>
        <div class="project-content">
          <div class="project-header">
            ${[].concat(comp.award || []).map(award => `
              <span class="competition-award${comp.rank ? ` rank-${comp.rank}` : ''}">
                <i class="bi bi-trophy-fill" aria-hidden="true"></i>${award}
              </span>`).join('')}
            <h3 class="project-title">
              ${comp.detailsPage
                ? `<a href="${comp.detailsPage}">${comp.title}</a>`
                : comp.title
              }
            </h3>
            <p class="competition-meta">
              <span><i class="bi bi-calendar3" aria-hidden="true"></i>${this.formatMonthYear(comp.date)}</span>
              ${comp.organizer ? `<span><i class="bi bi-people" aria-hidden="true"></i>${comp.organizer}</span>` : ''}
              ${comp.location ? `<span><i class="bi bi-geo-alt" aria-hidden="true"></i>${comp.location}</span>` : ''}
            </p>
          </div>
          <div class="project-description">
            ${comp.description || comp.shortDescription || ''}
          </div>
          ${comp.technologies && comp.technologies.length > 0 ? `
            <div class="project-tech">
              ${comp.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
          ` : ''}
          <div class="project-links">
            ${Object.entries(comp.links || {}).map(([key, url]) => {
              const known = PortfolioRenderer.LINK_LABELS[key];
              const icon = known ? known.icon : 'bi-link-45deg';
              const label = known ? known.label : key;
              return `<a href="${url}" class="project-link" target="_blank" rel="noopener">
                <i class="bi ${icon}"></i> ${label}
              </a>`;
            }).join('')}
            ${comp.detailsPage ?
              `<a href="${comp.detailsPage}" class="project-link">
                <i class="bi bi-arrow-right-circle"></i> Learn More
              </a>` : ''
            }
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="projects-grid">${html}</div>`;
    this.observeElements('#competitions-container .project-card');
  }

  /**
   * Render Projects with Image-Left Layout
   */
  renderProjects(projects) {
    const featuredContainer = document.getElementById('featured-projects-container');
    const allContainer = document.getElementById('all-projects-container');
    if (!projects) return;

    const renderProjectCard = (project) => `
      <div class="project-card ${project.featured ? 'featured' : ''}" data-aos="fade-up"
           data-tech="${(project.technologies || []).join('|')}">
        <div class="project-image">
          ${this.picture(project.image, project.title)}
        </div>
        <div class="project-content">
          <div class="project-header">
            <h3 class="project-title">
              ${project.detailsPage ? 
                `<a href="${project.detailsPage}">${project.title}</a>` : 
                project.title
              }
            </h3>
          </div>
          <div class="project-description">
            ${project.description || project.shortDescription}
          </div>
          ${project.technologies && project.technologies.length > 0 ? `
            <div class="project-tech">
              ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
            </div>
          ` : ''}
          <div class="project-links">
            ${project.links?.github ? 
              `<a href="${project.links.github}" class="project-link" target="_blank" rel="noopener">
                <i class="bi bi-github"></i> GitHub
              </a>` : ''
            }
            ${project.links?.demo ? 
              `<a href="${project.links.demo}" class="project-link primary" target="_blank" rel="noopener">
                <i class="bi bi-play-circle"></i> Live Demo
              </a>` : ''
            }
            ${project.links?.paper ? 
              `<a href="${project.links.paper}" class="project-link" target="_blank" rel="noopener">
                <i class="bi bi-file-text"></i> Paper
              </a>` : ''
            }
            ${project.links?.huggingface ? 
              `<a href="${project.links.huggingface}" class="project-link" target="_blank" rel="noopener">
                🤗 HuggingFace
              </a>` : ''
            }
            ${project.detailsPage ? 
              `<a href="${project.detailsPage}" class="project-link">
                <i class="bi bi-arrow-right-circle"></i> Learn More
              </a>` : ''
            }
          </div>
        </div>
      </div>
    `;

    const featured = projects.filter(p => p.featured);
    const allProjects = projects.filter(p => !p.featured);

    if (featuredContainer && featured.length > 0) {
      featuredContainer.innerHTML = `
        <div class="projects-grid">
          ${featured.map(renderProjectCard).join('')}
        </div>
      `;
      this.observeElements('#featured-projects-container .project-card');
    }

    if (allContainer && allProjects.length > 0) {
      allContainer.innerHTML = `
        <div class="projects-grid">
          ${allProjects.map(renderProjectCard).join('')}
        </div>
      `;
      this.observeElements('#all-projects-container .project-card');
      this.renderProjectFilters(allProjects);
    }
  }

  /**
   * Build the technology filter bar from the projects actually present.
   *
   * There are far too many distinct technologies to show one chip each, so only
   * those shared by at least two projects earn a chip. The rest stay visible as
   * tags on the cards themselves.
   */
  renderProjectFilters(projects) {
    const filterBar = document.getElementById('project-filters');
    const status = document.getElementById('project-filter-status');
    const container = document.getElementById('all-projects-container');
    if (!filterBar || !container) return;

    const counts = new Map();
    projects.forEach(p => (p.technologies || []).forEach(
      tech => counts.set(tech, (counts.get(tech) || 0) + 1)
    ));

    const tags = [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    if (tags.length === 0) return;

    filterBar.innerHTML = `
      <button type="button" class="project-filter active" data-filter="*"
              aria-pressed="true">All <span class="filter-count">${projects.length}</span></button>
      ${tags.map(([tech, n]) => `
        <button type="button" class="project-filter" data-filter="${tech}" aria-pressed="false">
          ${tech} <span class="filter-count">${n}</span>
        </button>
      `).join('')}
    `;

    const cards = () => [...container.querySelectorAll('.project-card')];

    filterBar.addEventListener('click', event => {
      const button = event.target.closest('.project-filter');
      if (!button) return;

      const filter = button.dataset.filter;

      filterBar.querySelectorAll('.project-filter').forEach(b => {
        const active = b === button;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      let shown = 0;
      cards().forEach(card => {
        const techs = (card.dataset.tech || '').split('|');
        const match = filter === '*' || techs.includes(filter);
        card.hidden = !match;
        if (match) shown++;
      });

      if (status) {
        status.textContent = filter === '*'
          ? ''
          : `Showing ${shown} project${shown === 1 ? '' : 's'} tagged "${filter}".`;
      }
    });
  }

  /**
   * Render the about section from bio.json
   */
  renderAbout(bio) {
    const container = document.getElementById('about-container');
    if (!container || !bio) return;

    container.innerHTML = `
      <div class="about-grid">
        <div class="about-body">
          <p class="about-summary">${bio.summary || ''}</p>
          ${bio.keywords && bio.keywords.length ? `
            <ul class="about-keywords" aria-label="Areas of focus">
              ${bio.keywords.map(k => `<li>${k}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Initialize lazy loading for images
   */
  initLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('loading' in HTMLImageElement.prototype) {
      images.forEach(img => {
        img.addEventListener('load', () => {
          img.classList.add('loaded');
        });
      });
    } else {
      // Fallback for browsers that don't support lazy loading
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    }
  }

  /**
   * Initialize all components
   */
  async init() {
    try {
      // Load all data in parallel for better performance
      const [education, experience, projects, competitions, volunteering, bio] = await Promise.all([
        this.loadData('education'),
        this.loadData('experience'),
        this.loadData('projects'),
        this.loadData('competitions'),
        this.loadData('volunteering'),
        this.loadData('bio')
      ]);

      // Render components
      if (education) this.renderEducation(education);
      if (experience) this.renderExperience(experience);
      if (projects) this.renderProjects(projects);
      if (competitions) this.renderCompetitions(competitions);
      if (volunteering) this.renderVolunteering(volunteering);
      if (bio) this.renderAbout(bio);

      // Initialize lazy loading
      this.initLazyLoading();

      // Dispatch custom event when rendering is complete
      window.dispatchEvent(new CustomEvent('portfolioRendered'));
    } catch (error) {
      console.error('Error initializing portfolio:', error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.portfolioRenderer = new PortfolioRenderer();
    window.portfolioRenderer.init();
  });
} else {
  window.portfolioRenderer = new PortfolioRenderer();
  window.portfolioRenderer.init();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PortfolioRenderer;
}
