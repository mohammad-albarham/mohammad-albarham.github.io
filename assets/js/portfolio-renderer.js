/**
 * Modern Portfolio - Enhanced Rendering
 * Optimized for performance and clean code
 */

class PortfolioRenderer {
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
   * Load JSON data with caching
   */
  async loadData(filename) {
    if (this.dataCache.has(filename)) {
      return this.dataCache.get(filename);
    }

    try {
      const response = await fetch(`/data/${filename}.json`);
      if (!response.ok) throw new Error(`Failed to load ${filename}`);
      const data = await response.json();
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
   * Render Education Timeline
   */
  renderEducation(education) {
    const container = document.getElementById('education-container');
    if (!container || !education) return;

    const html = education.map(edu => `
      <div class="timeline-item ${edu.current ? 'current' : ''}" data-aos="fade-up">
        <div class="timeline-content">
          <div class="timeline-header">
            <img src="${edu.logo}" alt="${edu.institution}" class="timeline-logo" loading="lazy">
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
          ${edu.relevantCourses && edu.relevantCourses.length > 0 ? `
            <div class="timeline-tags">
              ${edu.relevantCourses.slice(0, 6).map(course => 
                `<span class="timeline-tag">${course}</span>`
              ).join('')}
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
            <img src="${exp.logo}" alt="${exp.company}" class="timeline-logo" loading="lazy">
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
            <img src="${vol.logo}" alt="${vol.organization}" class="timeline-logo" loading="lazy">
            <div class="timeline-title">
              <h4>${vol.role}</h4>
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
   * Render Projects with Image-Left Layout
   */
  renderProjects(projects) {
    const featuredContainer = document.getElementById('featured-projects-container');
    const allContainer = document.getElementById('all-projects-container');
    if (!projects) return;

    const renderProjectCard = (project) => `
      <div class="project-card ${project.featured ? 'featured' : ''}" data-aos="fade-up">
        <div class="project-image">
          <img src="${project.image}" alt="${project.title}" loading="lazy" 
               onerror="this.src='assets/img/portfolio-placeholder.jpg'">
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
    }
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
      const [education, experience, projects, volunteering] = await Promise.all([
        this.loadData('education'),
        this.loadData('experience'),
        this.loadData('projects'),
        this.loadData('volunteering')
      ]);

      // Render components
      if (education) this.renderEducation(education);
      if (experience) this.renderExperience(experience);
      if (projects) this.renderProjects(projects);
      if (volunteering) this.renderVolunteering(volunteering);

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
