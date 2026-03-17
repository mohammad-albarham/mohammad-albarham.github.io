/**
 * Utility function to copy text to clipboard
 * Usage: <button onclick="copyToClipboard(this)">Copy</button>
 * where the button is inside an accordion-body
 */
function copyToClipboard(button) {
  const code = button.previousElementSibling?.querySelector('code') || 
               button.closest('.accordion-body')?.querySelector('code');
  
  if (!code) {
    alert('Could not find code to copy');
    return;
  }

  const textToCopy = code.innerText;
  const textarea = document.createElement('textarea');
  textarea.value = textToCopy;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  // Provide user feedback
  const originalText = button.textContent;
  button.textContent = 'Copied!';
  setTimeout(() => {
    button.textContent = originalText;
  }, 2000);
}

/**
 * Initialize date display
 */
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date();
  const formattedDate = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  
  const dateElement = document.getElementById('current-date');
  if (dateElement) {
    dateElement.textContent = formattedDate;
  }
});

/**
 * Handle contact form submission
 */
function submitForm() {
  alert('Thank you for your email!');
  return true;
}

function onHiddenIframeLoad() {
  const form = document.getElementById('gform');
  if (form) {
    form.reset();
  }
}
/**
 * Theme Toggle Module
 * Handles dark/light mode switching with persistence
 */

class ThemeManager {
  constructor() {
    this.theme = this.getStoredTheme() || this.getPreferredTheme();
    this.init();
  }

  /**
   * Get theme from localStorage
   */
  getStoredTheme() {
    return localStorage.getItem('theme');
  }

  /**
   * Get preferred theme (default to light)
   */
  getPreferredTheme() {
    return 'light';
  }


  /**
   * Initialize theme on page load
   */
  init() {
    this.applyTheme(this.theme);
    this.createToggleButton();
    this.setupSystemPreferenceListener();
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.theme = theme;
    localStorage.setItem('theme', theme);
    this.updateToggleButton();
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#18191a' : '#ffffff');
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const newTheme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  /**
   * Create the theme toggle button
   */
  createToggleButton() {
    // Check if button already exists
    if (document.querySelector('.theme-toggle')) return;

    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.setAttribute('aria-label', 'Toggle dark mode');
    button.innerHTML = `
      <i class="bi bi-moon-fill"></i>
      <i class="bi bi-sun-fill"></i>
    `;
    
    button.addEventListener('click', () => this.toggle());
    document.body.appendChild(button);
  }

  /**
   * Update toggle button icon based on current theme
   */
  updateToggleButton() {
    const button = document.querySelector('.theme-toggle');
    if (button) {
      const moonIcon = button.querySelector('.bi-moon-fill');
      const sunIcon = button.querySelector('.bi-sun-fill');
      
      if (this.theme === 'dark') {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
      } else {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
      }
    }
  }

  /**
   * Listen for system preference changes
   */
  setupSystemPreferenceListener() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually set a preference
      if (!localStorage.getItem('theme')) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});

// Apply theme immediately to prevent flash of wrong theme
(function() {
  const storedTheme = localStorage.getItem('theme');
  const theme = storedTheme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();

/**
 * Data Loader Module
 * Handles loading and caching of JSON data files for the portfolio website.
 * 
 * Usage:
 *   const dataLoader = new DataLoader();
 *   const publications = await dataLoader.load('publications');
 *   const bio = await dataLoader.load('bio');
 */

class DataLoader {
  constructor(basePath = 'data/') {
    this.basePath = basePath;
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Load a JSON data file
   * @param {string} dataType - The type of data to load (e.g., 'publications', 'bio', 'education')
   * @returns {Promise<Object|Array>} - The loaded data
   */
  async load(dataType) {
    // Return cached data if available
    if (this.cache.has(dataType)) {
      return this.cache.get(dataType);
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(dataType)) {
      return this.loadingPromises.get(dataType);
    }

    // Create new loading promise
    const loadingPromise = this._fetchData(dataType);
    this.loadingPromises.set(dataType, loadingPromise);

    try {
      const data = await loadingPromise;
      this.cache.set(dataType, data);
      return data;
    } finally {
      this.loadingPromises.delete(dataType);
    }
  }

  /**
   * Fetch data from JSON file
   * @private
   */
  async _fetchData(dataType) {
    const url = `${this.basePath}${dataType}.json`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${dataType}: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error loading ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Load multiple data types at once
   * @param {string[]} dataTypes - Array of data types to load
   * @returns {Promise<Object>} - Object with data type keys
   */
  async loadMultiple(dataTypes) {
    const results = await Promise.all(
      dataTypes.map(type => this.load(type).then(data => [type, data]))
    );
    return Object.fromEntries(results);
  }

  /**
   * Clear the cache
   * @param {string} [dataType] - Optional specific data type to clear
   */
  clearCache(dataType) {
    if (dataType) {
      this.cache.delete(dataType);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Preload all data files
   */
  async preloadAll() {
    const dataTypes = ['bio', 'education', 'experience', 'publications', 'projects', 'volunteering', 'travel'];
    return this.loadMultiple(dataTypes);
  }
}

// Create global instance
window.dataLoader = new DataLoader();

/**
 * Utility functions for rendering data
 */
const DataRenderer = {
  /**
   * Format a date string
   * @param {string} dateStr - Date string in YYYY-MM format
   * @param {boolean} showPresent - Whether to show "Present" for null end dates
   */
  formatDate(dateStr, showPresent = true) {
    if (!dateStr) {
      return showPresent ? 'Present' : '';
    }
    
    const [year, month] = dateStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  },

  /**
   * Format date range
   */
  formatDateRange(startDate, endDate) {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    return `${start} - ${end}`;
  },

  /**
   * Format authors list with highlighting
   */
  formatAuthors(authors, highlightMe = true) {
    return authors.map(author => {
      if (author.isMe && highlightMe) {
        return `<strong>${author.name}</strong>`;
      }
      return author.name;
    }).join(', ');
  },

  /**
   * Create publication card HTML
   */
  createPublicationCard(pub) {
    const typeClass = `pub-type-${pub.type}`;
    const featuredBadge = pub.featured ? '<span class="badge bg-warning text-dark">Featured</span>' : '';
    
    let links = [];
    if (pub.pdfUrl) links.push(`<a href="${pub.pdfUrl}" class="btn btn-sm btn-outline-primary" target="_blank" rel="noopener"><i class="bi bi-file-pdf"></i> PDF</a>`);
    if (pub.url) links.push(`<a href="${pub.url}" class="btn btn-sm btn-outline-secondary" target="_blank" rel="noopener"><i class="bi bi-link-45deg"></i> Paper</a>`);
    if (pub.huggingface) links.push(`<a href="${pub.huggingface}" class="btn btn-sm btn-outline-warning" target="_blank" rel="noopener"><i class="bi bi-box"></i> HuggingFace</a>`);
    if (pub.github) links.push(`<a href="${pub.github}" class="btn btn-sm btn-outline-dark" target="_blank" rel="noopener"><i class="bi bi-github"></i> Code</a>`);
    
    // Validate and escape bibtex for HTML attribute storage
    let escapedBibtex = '';
    let bibtexDisplay = 'No BibTeX available';
    let hasBibtex = false;
    
    if (pub.bibtex && pub.bibtex.trim()) {
      try {
        escapedBibtex = encodeURIComponent(pub.bibtex);
        bibtexDisplay = pub.bibtex;
        hasBibtex = true;
      } catch (error) {
        console.warn(`Failed to encode BibTeX for publication ${pub.id}:`, error);
        bibtexDisplay = 'Error: Invalid BibTeX format';
      }
    }
    
    // Only show cite button if BibTeX is available
const citeButton = hasBibtex 
  ? `<button class="btn btn-sm btn-outline-info cite-btn" 
       data-pub-id="${pub.id}" 
       data-bibtex="${escapedBibtex}" 
       data-pub-title="${pub.title.replace(/"/g, '&quot;')}" 
       title="Show BibTeX citation" 
       aria-label="Show BibTeX citation for ${pub.title.replace(/"/g, '')}">
       <i class="bi bi-quote"></i> Cite
     </button>`
  : '';
    
    return `
      <div class="publication-card ${typeClass}" data-year="${pub.year}" data-type="${pub.type}" data-keywords="${pub.keywords?.join(',') || ''}">
        <div class="pub-header">
          <span class="pub-year">${pub.year}</span>
          <span class="pub-venue">${pub.venueShort || pub.venue}</span>
          ${featuredBadge}
        </div>
        <h4 class="pub-title">
          <a href="${pub.url || '#'}" target="_blank" rel="noopener">${pub.title}</a>
        </h4>
        <p class="pub-authors">${this.formatAuthors(pub.authors)}</p>
        <p class="pub-venue-full">${pub.venue}</p>
        <div class="pub-links">
          ${links.join(' ')}
          ${citeButton}
        </div>
      </div>
    `;
  },

  /**
   * Create experience/education timeline item
   */
  createTimelineItem(item, type = 'experience') {
    const dateRange = this.formatDateRange(item.startDate, item.endDate);
    const currentBadge = item.current ? '<span class="badge bg-success">Current</span>' : '';
    
    let content = '';
    if (type === 'experience') {
      content = `
        <ul class="responsibilities">
          ${item.responsibilities?.map(r => `<li>${r}</li>`).join('') || ''}
        </ul>
      `;
    } else if (type === 'education') {
      content = `
        <p class="focus">${item.focus || ''}</p>
        ${item.gpa ? `<p class="gpa"><strong>GPA:</strong> ${item.gpa}</p>` : ''}
        ${item.scholarship ? `<p class="scholarship"><strong>Scholarship:</strong> ${item.scholarship}</p>` : ''}
      `;
    }
    
    return `
      <div class="timeline-item ${item.current ? 'current' : ''}">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            ${item.logo ? `<img src="${item.logo}" alt="${item.company || item.institution}" class="timeline-logo">` : ''}
            <div class="timeline-title-group">
              <h4 class="timeline-title">${item.position || item.degree}</h4>
              <p class="timeline-subtitle">
                ${item.url ? `<a href="${item.url}" target="_blank">${item.company || item.institution}</a>` : (item.company || item.institution)}
                ${currentBadge}
              </p>
            </div>
          </div>
          <p class="timeline-date">${dateRange}</p>
          <p class="timeline-location"><i class="bi bi-geo-alt"></i> ${item.location}</p>
          ${item.description ? `<p class="timeline-description">${item.description}</p>` : ''}
          ${content}
        </div>
      </div>
    `;
  },

  /**
   * Create project card HTML
   */
  createProjectCard(project) {
    const featuredBadge = project.featured ? '<span class="project-badge">Featured</span>' : '';
    const webpImage = project.image.replace('assets/img/', 'assets/img_webp/').replace(/\.(jpg|jpeg|png)$/, '.webp');
    
    let links = [];
    if (project.links?.github) links.push(`<a href="${project.links.github}" target="_blank"><i class="bx bxl-github"></i></a>`);
    if (project.links?.demo) links.push(`<a href="${project.links.demo}" target="_blank"><i class="bx bx-link-external"></i></a>`);
    if (project.links?.paper) links.push(`<a href="${project.links.paper}" target="_blank"><i class="bx bx-file"></i></a>`);
    if (project.links?.huggingface) links.push(`<a href="${project.links.huggingface}" target="_blank"><i class="bx bx-box"></i></a>`);
    
    return `
      <div class="col-lg-4 col-md-6 portfolio-item filter-${project.category}" data-category="${project.category}" data-featured="${project.featured}">
        <div class="portfolio-wrap">
          ${featuredBadge}
          <picture>
            <source srcset="${webpImage}" type="image/webp">
            <img src="${project.image}" class="img-fluid" alt="${project.title}" loading="lazy">
          </picture>
          <div class="portfolio-info">

            <h4>${project.title}</h4>
            <p>${project.shortDescription}</p>
            <div class="portfolio-links">
              <a href="${project.image}" data-gallery="portfolioGallery" class="portfolio-lightbox" title="${project.title}">
                <i class="bx bx-plus"></i>
              </a>
              ${project.detailsPage ? `<a href="${project.detailsPage}" title="More Details"><i class="bx bx-link"></i></a>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Create volunteering card
   */
  createVolunteeringCard(vol) {
    const dateRange = this.formatDateRange(vol.startDate, vol.endDate);
    const currentBadge = vol.current ? '<span class="badge bg-success">Current</span>' : '';
    
    return `
      <div class="volunteer-card ${vol.current ? 'current' : ''}" data-category="${vol.category}" data-level="${vol.level}">
        <div class="volunteer-header">
          ${vol.logo ? `<img src="${vol.logo}" alt="${vol.organization}" class="volunteer-logo">` : ''}
          <div>
            <h4 class="volunteer-title">${vol.position} ${currentBadge}</h4>
            <p class="volunteer-org">
              ${vol.url ? `<a href="${vol.url}" target="_blank">${vol.organization}</a>` : vol.organization}
            </p>
          </div>
        </div>
        <p class="volunteer-date"><i class="bi bi-calendar"></i> ${dateRange}</p>
        ${vol.description ? `<p class="volunteer-description">${vol.description}</p>` : ''}
      </div>
    `;
  }
};

// Export for use in other modules
window.DataRenderer = DataRenderer;
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
/**
 * Publications Module
 * Handles filtering, searching, and rendering of publications
 */

class PublicationsManager {
  constructor(containerId = 'publications-container') {
    this.container = document.getElementById(containerId);
    this.publications = [];
    this.filters = {
      year: 'all',
      type: 'all',
      search: ''
    };
    this.clickHandlerAdded = false;
  }

  /**
   * Initialize the publications manager
   */
  async init() {
    try {
      this.publications = await window.dataLoader.load('publications');
      this.render();
      this.setupFilterListeners();
      
      // Only add click handler once
      if (!this.clickHandlerAdded) {
        this.setupDocumentClickHandlers();
        this.clickHandlerAdded = true;
      }
    } catch (error) {
      console.error('Failed to initialize publications:', error);
      this.showError();
    }
  }

  /**
   * Reset all filters to default state
   */
  resetFilters() {
    this.filters = {
      year: 'all',
      type: 'all',
      search: ''
    };

    // Reset UI controls
    const yearFilter = document.getElementById('pub-filter-year');
    const typeFilter = document.getElementById('pub-filter-type');
    const searchInput = document.getElementById('pub-search');

    if (yearFilter) yearFilter.value = 'all';
    if (typeFilter) typeFilter.value = 'all';
    if (searchInput) searchInput.value = '';

    // Re-render with default filters
    this.render();

    // Provide visual feedback
    const resetBtn = document.getElementById('pub-reset-filters');
    if (resetBtn) {
      const originalText = resetBtn.innerHTML;
      resetBtn.innerHTML = '<i class="bi bi-check-lg"></i> Reset!';
      resetBtn.classList.add('btn-success');
      resetBtn.classList.remove('btn-outline-secondary');
      
      setTimeout(() => {
        resetBtn.innerHTML = originalText;
        resetBtn.classList.remove('btn-success');
        resetBtn.classList.add('btn-outline-secondary');
      }, 1500);
    }
  }

  /**
   * Setup document-wide click handlers for cite buttons
   */
  setupDocumentClickHandlers() {
    console.log('Setting up document click handlers for cite buttons');
    
    // Use event delegation for cite buttons (they're dynamically added)
    document.addEventListener('click', (e) => {
      const citeBtn = e.target.closest('.cite-btn');
      if (citeBtn) {
        console.log('Cite button clicked:', citeBtn);
        e.preventDefault();
        e.stopPropagation();
        
        const bibtex = citeBtn.dataset.bibtex;
        const title = citeBtn.dataset.pubTitle;
        
        console.log('BibTeX data:', bibtex ? 'Found' : 'Missing');
        console.log('Modal instance:', window.bibtexModal ? 'Found' : 'Missing');
        
        if (bibtex && window.bibtexModal) {
          console.log('Opening modal with title:', title);
          window.bibtexModal.open(bibtex, title);
        } else {
          console.error('Cannot open modal:', {
            hasBibtex: !!bibtex,
            hasModal: !!window.bibtexModal
          });
        }
      }
    });
    
    console.log('Click handler registered');
  }

  /**
   * Setup filter and search event listeners (called on each render)
   */
  setupFilterListeners() {
    // Year filter
    const yearFilter = document.getElementById('pub-filter-year');
    if (yearFilter) {
      yearFilter.addEventListener('change', (e) => {
        this.filters.year = e.target.value;
        this.render();
      });
    }

    // Type filter
    const typeFilter = document.getElementById('pub-filter-type');
    if (typeFilter) {
      typeFilter.addEventListener('change', (e) => {
        this.filters.type = e.target.value;
        this.render();
      });
    }

    // Search input with proper debouncing
    const searchInput = document.getElementById('pub-search');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        // Don't clear the timer, just reset it
        clearTimeout(debounceTimer);
        // Store the value immediately so it doesn't disappear
        const searchValue = e.target.value;
        debounceTimer = setTimeout(() => {
          this.filters.search = searchValue.toLowerCase();
          this.render();
        }, 400); // Increased debounce time for smoother typing
      });

      // Prevent form submission
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(debounceTimer);
          this.filters.search = e.target.value.toLowerCase();
          this.render();
        }
      });
    }

    // Reset button
    const resetBtn = document.getElementById('pub-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetFilters();
      });
    }
  }

  /**
   * Filter publications based on current filters
   */
  getFilteredPublications() {
    return this.publications.filter(pub => {
      // Year filter
      if (this.filters.year !== 'all' && pub.year.toString() !== this.filters.year) {
        return false;
      }

      // Type filter
      if (this.filters.type !== 'all' && pub.type !== this.filters.type) {
        return false;
      }

      // Search filter
      if (this.filters.search) {
        const searchStr = this.filters.search.toLowerCase();
        const searchable = [
          pub.title,
          pub.venue,
          pub.abstract || '',
          ...(pub.keywords || []),
          ...pub.authors.map(a => a.name)
        ].join(' ').toLowerCase();
        
        if (!searchable.includes(searchStr)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get unique years from publications
   */
  getYears() {
    const years = [...new Set(this.publications.map(p => p.year))];
    return years.sort((a, b) => b - a);
  }

  /**
   * Get unique types from publications
   */
  getTypes() {
    return [...new Set(this.publications.map(p => p.type))];
  }

  /**
   * Render filter controls
   */
  renderFilters() {
    const years = this.getYears();
    const types = this.getTypes();

    const yearOptions = ['<option value="all">All Years</option>']
      .concat(years.map(y => `<option value="${y}">${y}</option>`))
      .join('');

    const typeLabels = {
      journal: 'Journal',
      conference: 'Conference',
      workshop: 'Workshop',
      preprint: 'Preprint'
    };

    const typeOptions = ['<option value="all">All Types</option>']
      .concat(types.map(t => `<option value="${t}">${typeLabels[t] || t}</option>`))
      .join('');

    return `
      <div class="publications-filters mb-4">
        <div class="row g-3 align-items-center">
          <div class="col-md-4">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input type="text" id="pub-search" class="form-control" placeholder="Search publications..." aria-label="Search publications">
            </div>
          </div>
          <div class="col-md-2">
            <select id="pub-filter-year" class="form-select" aria-label="Filter by year">
              ${yearOptions}
            </select>
          </div>
          <div class="col-md-2">
            <select id="pub-filter-type" class="form-select" aria-label="Filter by type">
              ${typeOptions}
            </select>
          </div>
          <div class="col-md-2">
            <button id="pub-reset-filters" class="btn btn-outline-secondary w-100" title="Reset all filters">
              <i class="bi bi-arrow-counterclockwise"></i> Reset
            </button>
          </div>
          <div class="col-md-2 text-end">
            <span class="pub-count" id="pub-count"></span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the publications list
   */
  render() {
    if (!this.container) return;

    // Store current search input value before re-rendering
    const searchInput = document.getElementById('pub-search');
    const currentSearchValue = searchInput ? searchInput.value : '';

    const filtered = this.getFilteredPublications();
    
    // Group by year
    const grouped = {};
    filtered.forEach(pub => {
      if (!grouped[pub.year]) {
        grouped[pub.year] = [];
      }
      grouped[pub.year].push(pub);
    });

    // Sort years descending
    const sortedYears = Object.keys(grouped).sort((a, b) => b - a);

    let html = this.renderFilters();

    // Featured publications first
    const featured = filtered.filter(p => p.featured);
    if (featured.length > 0 && this.filters.year === 'all' && this.filters.type === 'all' && !this.filters.search) {
      html += `
        <div class="featured-publications mb-5">
          <h3 class="section-subtitle"><i class="bi bi-star-fill text-warning"></i> Featured Publications</h3>
          <div class="publications-list">
            ${featured.map(pub => DataRenderer.createPublicationCard(pub)).join('')}
          </div>
        </div>
      `;
    }

    // All publications by year
    html += '<div class="publications-by-year">';
    sortedYears.forEach(year => {
      html += `
        <div class="year-group" data-aos="fade-up">
          <h3 class="year-header">${year}</h3>
          <div class="publications-list">
            ${grouped[year].map(pub => DataRenderer.createPublicationCard(pub)).join('')}
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.container.innerHTML = html;

    // Restore search input value after re-rendering
    const newSearchInput = document.getElementById('pub-search');
    if (newSearchInput && currentSearchValue) {
      newSearchInput.value = currentSearchValue;
    }

    // Update count
    const countEl = document.getElementById('pub-count');
    if (countEl) {
      countEl.textContent = `${filtered.length} publication${filtered.length !== 1 ? 's' : ''}`;
    }

    // Re-setup filter listeners for dynamic content
    this.setupFilterListeners();

    // Refresh AOS animations if available
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  }

  /**
   * Copy text to clipboard with visual feedback
   */
  async copyToClipboard(text, btn) {
    if (!text) {
      console.warn('No text to copy');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      
      // Store original button content
      const originalHTML = btn.innerHTML;
      const originalClasses = btn.className;
      
      // Show success state
      btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
      btn.classList.add('copied');
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
      
      // Reset after 2 seconds
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('copied', 'btn-success');
        btn.classList.add('btn-primary');
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy:', err);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show success
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy to Clipboard';
          btn.classList.remove('copied');
        }, 2000);
      } catch (fallbackErr) {
        // Show error state
        btn.innerHTML = '<i class="bi bi-x-lg"></i> Failed';
        btn.classList.add('btn-danger');
        setTimeout(() => {
          btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy to Clipboard';
          btn.classList.remove('btn-danger');
        }, 2000);
      }
    }
  }

  /**
   * Show error message
   */
  showError() {
    if (this.container) {
      this.container.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i>
          Failed to load publications. Please try refreshing the page.
        </div>
      `;
    }
  }
}

/**
 * BibTeX Modal Manager
 * Handles displaying BibTeX citations in an accessible modal
 */
class BibtexModal {
  constructor() {
    console.log('BibtexModal: Constructor called');
    this.modal = null;
    this.overlay = null;
    this.isOpen = false;
    this.previousFocus = null;
    this.focusableElements = [];
    this.createModal();
    this.setupEventListeners();
    console.log('BibtexModal: Initialization complete');
  }

  /**
   * Create modal DOM structure
   */
  createModal() {
    console.log('BibtexModal: Creating modal elements');
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'bibtex-modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'bibtex-modal';
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true');
    this.modal.setAttribute('aria-labelledby', 'bibtex-modal-title');
    this.modal.setAttribute('aria-hidden', 'true');

    this.modal.innerHTML = `
      <div class="bibtex-modal-content">
        <div class="bibtex-modal-header">
          <h3 id="bibtex-modal-title" class="bibtex-modal-title">
            <i class="bi bi-quote"></i> BibTeX Citation
          </h3>
          <button class="bibtex-modal-close" aria-label="Close modal" title="Close (ESC)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="bibtex-modal-body">
          <pre><code class="bibtex-code" id="bibtex-code"></code></pre>
        </div>
        <div class="bibtex-modal-footer">
          <button class="btn btn-primary bibtex-copy-btn" id="bibtex-copy-btn">
            <i class="bi bi-clipboard"></i> Copy BibTeX
          </button>
          <button class="btn btn-outline-secondary bibtex-close-btn">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);
    console.log('BibtexModal: Elements appended to body');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    console.log('BibtexModal: Setting up event listeners');
    
    // Close button
    const closeBtn = this.modal.querySelector('.bibtex-modal-close');
    closeBtn.addEventListener('click', () => {
      console.log('Close button clicked');
      this.close();
    });

    // Close button in footer
    const footerCloseBtn = this.modal.querySelector('.bibtex-close-btn');
    footerCloseBtn.addEventListener('click', () => {
      console.log('Footer close button clicked');
      this.close();
    });

    // Copy button
    const copyBtn = this.modal.querySelector('.bibtex-copy-btn');
    copyBtn.addEventListener('click', () => this.copyBibtex());

    // Click outside to close
    this.overlay.addEventListener('click', () => this.close());

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Tab trap for accessibility
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && this.isOpen) {
        this.handleTabKey(e);
      }
    });
  }

  /**
   * Handle Tab key for focus trap
   */
  handleTabKey(e) {
    const focusable = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const focusableArray = Array.from(focusable);
    const firstFocusable = focusableArray[0];
    const lastFocusable = focusableArray[focusableArray.length - 1];

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  }

  /**
   * Open modal with BibTeX content
   */
  open(bibtex, title = '') {
    console.log('BibtexModal.open() called', { bibtex: bibtex ? 'present' : 'missing', title });
    
    if (this.isOpen) {
      console.log('Modal already open, ignoring');
      return;
    }

    // Store the element that triggered the modal
    this.previousFocus = document.activeElement;

    // Decode and set BibTeX content
    const decodedBibtex = decodeURIComponent(bibtex);
    console.log('Decoded BibTeX length:', decodedBibtex.length);
    
    const codeElement = this.modal.querySelector('#bibtex-code');
    codeElement.textContent = decodedBibtex;
    this.currentBibtex = decodedBibtex;

    // Update title if provided
    if (title) {
      const titleElement = this.modal.querySelector('#bibtex-modal-title');
      titleElement.innerHTML = `<i class="bi bi-quote"></i> ${title}`;
    }

    // Show modal
    console.log('Showing modal...');
    this.isOpen = true;
    this.overlay.classList.add('active');
    this.modal.classList.add('active');
    this.overlay.setAttribute('aria-hidden', 'false');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    console.log('Modal visible');

    // Focus the close button
    setTimeout(() => {
      const closeBtn = this.modal.querySelector('.bibtex-modal-close');
      closeBtn.focus();
      console.log('Focus set to close button');
    }, 100);
  }

  /**
   * Close modal
   */
  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.overlay.classList.remove('active');
    this.modal.classList.remove('active');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Return focus to the element that opened the modal
    if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  }

  /**
   * Copy BibTeX to clipboard
   */
  async copyBibtex() {
    const btn = this.modal.querySelector('.bibtex-copy-btn');
    const originalHTML = btn.innerHTML;

    try {
      await navigator.clipboard.writeText(this.currentBibtex);
      
      // Show success state
      btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
      btn.classList.add('btn-success');
      btn.classList.remove('btn-primary');
      
      // Reset after 2 seconds
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy:', err);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = this.currentBibtex;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-primary');
        
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('btn-success');
          btn.classList.add('btn-primary');
        }, 2000);
      } catch (fallbackErr) {
        btn.innerHTML = '<i class="bi bi-x-lg"></i> Failed';
        btn.classList.add('btn-danger');
        btn.classList.remove('btn-primary');
        
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.classList.remove('btn-danger');
          btn.classList.add('btn-primary');
        }, 2000);
      }
    }
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Publications.js: DOM loaded');
  
  // Always initialize BibTeX modal (needed for cite buttons)
  window.bibtexModal = new BibtexModal();
  console.log('BibtexModal initialized:', window.bibtexModal);
  
  // Initialize publications manager if container exists
  const pubContainer = document.getElementById('publications-container');
  if (pubContainer) {
    console.log('Publications container found, initializing manager...');
    window.publicationsManager = new PublicationsManager('publications-container');
    window.publicationsManager.init();
  } else {
    console.warn('Publications container not found');
  }
});

/**
 * Lightweight Animation Module
 * Minimal, performance-friendly animations for the portfolio
 * Uses CSS animations with JavaScript intersection observer for scroll triggers
 */

// Animation configuration
const AnimationConfig = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px',
  once: true // Only animate once
};

/**
 * Initialize scroll-triggered animations
 */
function initScrollAnimations() {
  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Remove all animation classes and show content immediately
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  // Create intersection observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const animation = el.dataset.animate || 'fadeIn';
        const delay = el.dataset.animateDelay || 0;
        
        setTimeout(() => {
          el.classList.add('animate-' + animation);
          el.classList.add('animated');
        }, parseInt(delay));

        if (AnimationConfig.once) {
          observer.unobserve(el);
        }
      }
    });
  }, {
    threshold: AnimationConfig.threshold,
    rootMargin: AnimationConfig.rootMargin
  });

  // Observe all elements with data-animate attribute
  document.querySelectorAll('[data-animate]').forEach(el => {
    // Set initial state
    el.style.opacity = '0';
    observer.observe(el);
  });
}

/**
 * Smooth counter animation for statistics
 */
function animateCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = parseInt(counter.dataset.counter);
        const duration = parseInt(counter.dataset.duration) || 2000;
        const start = 0;
        const startTime = performance.now();
        
        function updateCounter(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function (easeOutQuad)
          const eased = 1 - (1 - progress) * (1 - progress);
          
          counter.textContent = Math.floor(start + (target - start) * eased);
          
          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          } else {
            counter.textContent = target;
          }
        }
        
        requestAnimationFrame(updateCounter);
        observer.unobserve(counter);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

/**
 * Stagger animation for list items
 */
function animateStagger(container, selector, baseDelay = 100) {
  const items = container.querySelectorAll(selector);
  items.forEach((item, index) => {
    item.style.animationDelay = `${index * baseDelay}ms`;
  });
}

/**
 * Smooth scroll to element
 */
function smoothScrollTo(targetId) {
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

/**
 * Parallax effect (lightweight)
 */
function initParallax() {
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  
  if (parallaxElements.length === 0) return;
  
  let ticking = false;
  
  function updateParallax() {
    const scrollY = window.scrollY;
    
    parallaxElements.forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.5;
      const yPos = -(scrollY * speed);
      el.style.transform = `translate3d(0, ${yPos}px, 0)`;
    });
    
    ticking = false;
  }
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
}

/**
 * Text typing animation
 */
function typeText(element, text, speed = 50) {
  let index = 0;
  element.textContent = '';
  
  function type() {
    if (index < text.length) {
      element.textContent += text.charAt(index);
      index++;
      setTimeout(type, speed);
    }
  }
  
  type();
}

/**
 * Hover effect enhancement
 */
function initHoverEffects() {
  // Card tilt effect
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    });
  });
}

/**
 * Initialize all animations
 */
function initAnimations() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initScrollAnimations();
      animateCounters();
      initHoverEffects();
    });
  } else {
    initScrollAnimations();
    animateCounters();
    initHoverEffects();
  }
}

// Export for use
window.PortfolioAnimations = {
  init: initAnimations,
  scrollAnimations: initScrollAnimations,
  counters: animateCounters,
  stagger: animateStagger,
  smoothScroll: smoothScrollTo,
  parallax: initParallax,
  typeText: typeText,
  hoverEffects: initHoverEffects
};

// Auto-initialize
initAnimations();
/**
 * GSAP Scroll Animations & UI Interactions
 * 
 * Features:
 * - Scroll-triggered section reveals (fade, slide, stagger)
 * - Parallax effects for visual depth
 * - Button hover/press micro-animations
 * - Smooth, professional transitions
 * 
 * ============================================
 * CUSTOMIZATION GUIDE:
 * ============================================
 * 
 * SCROLL ANIMATIONS:
 *   - Modify SCROLL_CONFIG for global settings
 *   - Each section type has its own animation settings
 *   - To add animations to new sections:
 *     1. Add appropriate class (reveal-fade, reveal-slide-up, etc.)
 *     2. Or call initSectionAnimation(selector, options)
 * 
 * BUTTON ANIMATIONS:
 *   - Modify BUTTON_CONFIG for hover/press effects
 *   - All buttons with .btn class get animations
 *   - Add .btn-animated class for enhanced effects
 * 
 * PARALLAX:
 *   - Add data-parallax="0.2" to elements
 *   - Value = parallax intensity (0.1 = subtle, 0.5 = strong)
 * 
 * PERFORMANCE:
 *   - Animations auto-disable on reduced motion preference
 *   - Uses will-change hints for GPU acceleration
 *   - Lazy initialization for off-screen elements
 * ============================================
 */

(function() {
  'use strict';

  // Check for GSAP
  if (typeof gsap === 'undefined') {
    console.warn('GSAP not loaded. Scroll animations disabled.');
    return;
  }

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    console.log('Scroll animations: Reduced motion preferred, using instant transitions');
  }

  // ============================================
  // CONFIGURATION
  // ============================================
  
  const SCROLL_CONFIG = {
    // Global scroll trigger settings
    trigger: {
      start: 'top 85%',      // When animation starts
      end: 'bottom 15%',     // When animation ends
      toggleActions: 'play none none reverse' // onEnter, onLeave, onEnterBack, onLeaveBack
    },
    
    // Animation durations (seconds)
    duration: {
      fast: 0.4,
      normal: 0.6,
      slow: 0.8
    },
    
    // Stagger settings for lists
    stagger: {
      amount: 0.4,         // Total stagger time
      from: 'start'        // start, end, center, edges, random
    },
    
    // Easing functions
    ease: {
      smooth: 'power2.out',
      bounce: 'back.out(1.4)',
      elastic: 'elastic.out(1, 0.5)',
      snap: 'power4.out'
    }
  };

  const BUTTON_CONFIG = {
    hover: {
      scale: 1.05,
      duration: 0.3,
      ease: 'power2.out'
    },
    press: {
      scale: 0.95,
      duration: 0.1
    },
    ripple: {
      enabled: true,
      color: 'rgba(255, 255, 255, 0.3)',
      duration: 0.6
    }
  };

  // ============================================
  // SCROLL TRIGGER SETUP
  // ============================================

  // Register ScrollTrigger plugin
  if (gsap.registerPlugin && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  /**
   * Initialize section fade-in animations
   */
  function initSectionReveals() {
    // Section titles - slide up with fade
    gsap.utils.toArray('.section-title').forEach(title => {
      gsap.from(title, {
        scrollTrigger: {
          trigger: title,
          start: SCROLL_CONFIG.trigger.start,
          toggleActions: SCROLL_CONFIG.trigger.toggleActions
        },
        y: 30,
        opacity: prefersReducedMotion ? 1 : 0,
        duration: SCROLL_CONFIG.duration.normal,
        ease: SCROLL_CONFIG.ease.smooth
      });
    });

    // Resume items - staggered slide in
    gsap.utils.toArray('.resume-item').forEach(item => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: SCROLL_CONFIG.trigger.start,
          toggleActions: SCROLL_CONFIG.trigger.toggleActions
        },
        x: -30,
        opacity: prefersReducedMotion ? 1 : 0,
        duration: SCROLL_CONFIG.duration.normal,
        ease: SCROLL_CONFIG.ease.smooth
      });
    });

    // Portfolio/project cards - scale up
    const portfolioItems = gsap.utils.toArray('.portfolio-item, .highlight-item');
    portfolioItems.forEach((item, index) => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: SCROLL_CONFIG.trigger.start,
          toggleActions: SCROLL_CONFIG.trigger.toggleActions
        },
        scale: prefersReducedMotion ? 1 : 0.9,
        opacity: prefersReducedMotion ? 1 : 0,
        duration: SCROLL_CONFIG.duration.normal,
        delay: index * 0.1,
        ease: SCROLL_CONFIG.ease.smooth
      });
    });

    // Publication items
    gsap.utils.toArray('.publication-item, .pub-item').forEach((item, index) => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: SCROLL_CONFIG.trigger.start,
          toggleActions: SCROLL_CONFIG.trigger.toggleActions
        },
        y: 20,
        opacity: prefersReducedMotion ? 1 : 0,
        duration: SCROLL_CONFIG.duration.normal,
        delay: index * 0.05,
        ease: SCROLL_CONFIG.ease.smooth
      });
    });

    // Skills progress bars
    gsap.utils.toArray('.skill-item').forEach(item => {
      const progressBar = item.querySelector('.progress-bar');
      if (progressBar) {
        const targetWidth = progressBar.style.width || progressBar.getAttribute('aria-valuenow') + '%';
        
        gsap.from(progressBar, {
          scrollTrigger: {
            trigger: item,
            start: 'top 90%',
            toggleActions: 'play none none none'
          },
          width: 0,
          duration: SCROLL_CONFIG.duration.slow,
          ease: SCROLL_CONFIG.ease.smooth
        });
      }
    });
  }

  /**
   * Initialize parallax effects
   */
  function initParallax() {
    if (prefersReducedMotion) return;
    
    // Parallax elements with data attribute
    gsap.utils.toArray('[data-parallax]').forEach(elem => {
      const speed = parseFloat(elem.dataset.parallax) || 0.2;
      
      gsap.to(elem, {
        scrollTrigger: {
          trigger: elem,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        },
        y: `${speed * 100}%`,
        ease: 'none'
      });
    });

    // Hero content subtle parallax
    const heroContainer = document.querySelector('.hero-container');
    if (heroContainer) {
      gsap.to(heroContainer, {
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true
        },
        y: 100,
        opacity: 0,
        ease: 'none'
      });
    }
  }

  /**
   * Initialize navigation scroll effects
   */
  function initNavScrollEffects() {
    // Smooth scroll indicator fade on scroll
    const scrollIndicator = document.querySelector('.hero-scroll-indicator');
    if (scrollIndicator) {
      gsap.to(scrollIndicator, {
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: '30% top',
          scrub: true
        },
        opacity: 0,
        y: 20,
        ease: 'none'
      });
    }
  }

  // ============================================
  // BUTTON INTERACTIONS
  // ============================================

  /**
   * Initialize button hover/press animations
   */
  function initButtonAnimations() {
    const buttons = document.querySelectorAll('.btn, .nav-link, .social-links a, button[type="submit"]');
    
    buttons.forEach(btn => {
      // Skip if already initialized
      if (btn.dataset.gsapInit) return;
      btn.dataset.gsapInit = 'true';

      // Hover animations
      btn.addEventListener('mouseenter', () => {
        if (prefersReducedMotion) return;
        gsap.to(btn, {
          scale: BUTTON_CONFIG.hover.scale,
          duration: BUTTON_CONFIG.hover.duration,
          ease: BUTTON_CONFIG.hover.ease
        });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          scale: 1,
          duration: BUTTON_CONFIG.hover.duration,
          ease: BUTTON_CONFIG.hover.ease
        });
      });

      // Press animation
      btn.addEventListener('mousedown', () => {
        gsap.to(btn, {
          scale: BUTTON_CONFIG.press.scale,
          duration: BUTTON_CONFIG.press.duration
        });
      });

      btn.addEventListener('mouseup', () => {
        gsap.to(btn, {
          scale: BUTTON_CONFIG.hover.scale,
          duration: BUTTON_CONFIG.press.duration
        });
      });

      // Ripple effect
      if (BUTTON_CONFIG.ripple.enabled && btn.classList.contains('btn')) {
        btn.addEventListener('click', createRipple);
      }
    });
  }

  /**
   * Create ripple effect on click
   */
  function createRipple(e) {
    if (prefersReducedMotion) return;
    
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    
    const ripple = document.createElement('span');
    ripple.className = 'gsap-ripple';
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: ${BUTTON_CONFIG.ripple.color};
      pointer-events: none;
      transform: scale(0);
    `;
    
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    
    // Ensure button has relative positioning
    if (getComputedStyle(btn).position === 'static') {
      btn.style.position = 'relative';
    }
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    
    gsap.to(ripple, {
      scale: 1,
      opacity: 0,
      duration: BUTTON_CONFIG.ripple.duration,
      ease: 'power2.out',
      onComplete: () => ripple.remove()
    });
  }

  // ============================================
  // CARD & CONTAINER INTERACTIONS
  // ============================================

  /**
   * Initialize hover effects for cards
   */
  function initCardAnimations() {
    const cards = document.querySelectorAll('.highlight-item, .portfolio-item, .skill-item');
    
    cards.forEach(card => {
      if (card.dataset.gsapInit) return;
      card.dataset.gsapInit = 'true';

      card.addEventListener('mouseenter', () => {
        if (prefersReducedMotion) return;
        gsap.to(card, {
          y: -5,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
          duration: 0.3,
          ease: 'power2.out'
        });
      });
    });
  }

  /**
   * Initialize social icon animations
   */
  function initSocialIconAnimations() {
    const socialLinks = document.querySelectorAll('.social-links a');
    
    socialLinks.forEach((link, index) => {
      if (link.dataset.gsapInit) return;
      link.dataset.gsapInit = 'true';

      // Staggered entrance animation
      gsap.from(link, {
        y: 20,
        opacity: prefersReducedMotion ? 1 : 0,
        duration: 0.4,
        delay: 1 + index * 0.1,
        ease: 'back.out(1.4)'
      });

      // Hover rotation
      link.addEventListener('mouseenter', () => {
        if (prefersReducedMotion) return;
        gsap.to(link, {
          rotation: 360,
          duration: 0.5,
          ease: 'power2.out'
        });
      });

      link.addEventListener('mouseleave', () => {
        gsap.to(link, {
          rotation: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      });
    });
  }

  // ============================================
  // TEXT ANIMATIONS
  // ============================================

  /**
   * Initialize text reveal animations for hero
   */
  function initHeroTextAnimation() {
    const heroTitle = document.querySelector('.hero-container h1');
    const heroSubtitle = document.querySelector('.hero-container p');
    
    if (heroTitle) {
      gsap.from(heroTitle, {
        y: 50,
        opacity: prefersReducedMotion ? 1 : 0,
        duration: 0.8,
        delay: 0.3,
        ease: 'power3.out'
      });
    }
    
    if (heroSubtitle) {
      gsap.from(heroSubtitle, {
        y: 30,
        opacity: prefersReducedMotion ? 1 : 0,
        duration: 0.8,
        delay: 0.5,
        ease: 'power3.out'
      });
    }
  }

  // ============================================
  // SCROLL PROGRESS INDICATOR
  // ============================================

  /**
   * Create and animate scroll progress bar
   */
  function initScrollProgress() {
    // Create progress bar
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.setAttribute('aria-hidden', 'true');
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, #149ddd, #0563bb);
      z-index: 9999;
      transform-origin: left;
      transform: scaleX(0);
    `;
    document.body.appendChild(progressBar);
    
    // Animate on scroll
    gsap.to(progressBar, {
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.3
      },
      scaleX: 1,
      ease: 'none'
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize all animations
   */
  function init() {
    // Wait for GSAP plugins to be ready
    if (typeof ScrollTrigger === 'undefined') {
      console.warn('ScrollTrigger not loaded');
    }

    // Initialize all animation systems
    initSectionReveals();
    initParallax();
    initNavScrollEffects();
    initButtonAnimations();
    initCardAnimations();
    initSocialIconAnimations();
    initHeroTextAnimation();
    initScrollProgress();

    // Refresh ScrollTrigger after images load
    window.addEventListener('load', () => {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.GSAPAnimations = {
    init: init,
    refresh: function() {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    },
    kill: function() {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.getAll().forEach(st => st.kill());
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
/**
 * Neural Network Visualization - Manim Style
 * 
 * Inspired by 3Blue1Brown/Manim neural network visualizations
 * Features:
 * - Input image grid (MNIST-style)
 * - Multiple hidden layers with nodes
 * - Animated connections with signal flow
 * - Output layer with prediction highlighting
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Network architecture
    inputGrid: { rows: 7, cols: 7 },  // Simplified input grid (like downsampled MNIST)
    layers: [8, 10, 10, 10],          // Hidden layers + output (last is output with 10 digits)
    
    // Visual settings
    nodeRadius: 6,
    nodeSpacing: 28,
    layerSpacing: 100,
    inputCellSize: 12,
    inputGap: 2,
    
    // Colors
    colors: {
      background: '#040b14',
      node: {
        stroke: '#149ddd',
        fill: 'rgba(20, 157, 221, 0.08)',
        active: 'rgba(79, 195, 247, 0.7)',
        activeStroke: '#4fc3f7'
      },
      connection: {
        default: 'rgba(79, 195, 247, 0.08)',
        positive: '#4fc3f7',
        negative: '#ff6b6b',
        signal: '#ffc107'
      },
      input: {
        empty: 'rgba(100, 120, 150, 0.15)',
        filled: '#ffffff'
      },
      output: {
        prediction: '#4caf50',
        text: '#fff'
      }
    },
    
    // Animation timing (ms)
    timing: {
      initialDelay: 500,
      layerStagger: 80,
      nodeStagger: 30,
      connectionDraw: 400,
      signalFlow: 2500,
      signalInterval: 4000,
      predictionHighlight: 300
    },
    
    // Output labels
    outputLabels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  };

  // ============================================
  // STATE
  // ============================================
  let svg = null;
  let nodes = [];        // Array of arrays: nodes[layer][index]
  let connections = [];  // Array of arrays: connections[layer][index]
  let inputCells = [];
  let outputLabels = [];
  let signalTimer = null;
  let currentPrediction = 7;  // Default prediction
  let reducedMotion = false;

  /**
   * INITIALIZATION
   */
  async function init() {
    const container = document.querySelector('.nn-visual');
    if (!container) return;

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Clear existing
    container.innerHTML = '';
    
    // Create SVG (fragment-based)
    const fragment = document.createDocumentFragment();
    createSVG(fragment);
    
    // Build network with small delays to avoid blocking
    createInputGrid(fragment);
    await nextTick();
    createNetworkLayers(fragment);
    await nextTick();
    createConnections(fragment);
    await nextTick();
    createOutputLabels(fragment);
    
    container.appendChild(fragment);
    svg = container.querySelector('svg');

    // Setup digit selector buttons
    setupDigitSelector();
    
    // Animate entrance
    requestAnimationFrame(() => {
      container.classList.add('nn-ready');
      animateEntrance();
    });

    if (!reducedMotion) {
      setTimeout(startSignalFlow, CONFIG.timing.initialDelay);
    }
  }

  function nextTick() {
    return new Promise(resolve => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(resolve);
      } else {
        setTimeout(resolve, 10);
      }
    });
  }



  // ============================================
  // DIGIT SELECTOR
  // ============================================
  function setupDigitSelector() {
    const buttons = document.querySelectorAll('.nn-digit-btn');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const digit = parseInt(btn.getAttribute('data-digit'), 10);
        
        // Update active state
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update visualization
        setPrediction(digit);
        
        // Trigger signal flow
        runSignalFlow();
      });
    });
  }

  // ============================================
  // SVG CREATION
  // ============================================
  function createSVG(container) {
    const { inputGrid, layers, layerSpacing, nodeSpacing, inputCellSize, inputGap } = CONFIG;
    
    // Calculate dimensions
    const inputWidth = inputGrid.cols * (inputCellSize + inputGap);
    const maxNodes = Math.max(...layers);
    const networkHeight = maxNodes * nodeSpacing;
    const totalWidth = inputWidth + 60 + (layers.length * layerSpacing) + 40;
    const totalHeight = Math.max(inputGrid.rows * (inputCellSize + inputGap), networkHeight) + 80;
    
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute('class', 'nn-svg');
    svg.setAttribute('aria-label', 'Neural network visualization');
    
    // Add defs for filters and gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="nn-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="nn-signal-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="signal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${CONFIG.colors.connection.signal}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${CONFIG.colors.connection.signal}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${CONFIG.colors.connection.signal}" stop-opacity="0"/>
      </linearGradient>
    `;
    svg.appendChild(defs);
    
    // Create layer groups (order matters for z-index)
    ['connections', 'signals', 'input', 'nodes', 'labels'].forEach(id => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `nn-${id}-group`);
      svg.appendChild(g);
    });
    
    container.appendChild(svg);
  }

  // ============================================
  // INPUT GRID (MNIST-style)
  // ============================================
  function createInputGrid() {
    const { inputGrid, inputCellSize, inputGap, colors } = CONFIG;
    const group = svg.querySelector('.nn-input-group');
    
    // Sample "digit" pattern (stylized "7")
    const pattern = generateDigitPattern(currentPrediction);
    
    const startX = 20;
    const startY = (parseFloat(svg.getAttribute('viewBox').split(' ')[3]) - 
                   inputGrid.rows * (inputCellSize + inputGap)) / 2;
    
    inputCells = [];
    
    for (let row = 0; row < inputGrid.rows; row++) {
      for (let col = 0; col < inputGrid.cols; col++) {
        const x = startX + col * (inputCellSize + inputGap);
        const y = startY + row * (inputCellSize + inputGap);
        const intensity = pattern[row][col];
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', inputCellSize);
        rect.setAttribute('height', inputCellSize);
        rect.setAttribute('rx', '2');  // Slight rounding
        // Filled pixels = white, empty pixels = invisible
        rect.setAttribute('fill', intensity === 1 ? '#ffffff' : '#000000');
        rect.setAttribute('fill-opacity', intensity === 1 ? '1' : '0');
        rect.setAttribute('class', 'nn-input-cell');
        rect.setAttribute('data-row', row);
        rect.setAttribute('data-col', col);
        
        group.appendChild(rect);
        inputCells.push({ element: rect, row, col, intensity });
      }
    }
  }

  // Generate digit pattern for input visualization
  function generateDigitPattern(digit) {
    // Using 1 for filled pixels, 0 for empty - crisp clear digits
    const patterns = {
      0: [
        [0,1,1,1,1,1,0],
        [1,1,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [0,1,1,1,1,1,0]
      ],
      1: [
        [0,0,1,1,0,0,0],
        [0,1,1,1,0,0,0],
        [0,0,1,1,0,0,0],
        [0,0,1,1,0,0,0],
        [0,0,1,1,0,0,0],
        [0,0,1,1,0,0,0],
        [1,1,1,1,1,1,0]
      ],
      2: [
        [0,1,1,1,1,1,0],
        [1,1,0,0,0,1,1],
        [0,0,0,0,0,1,1],
        [0,0,1,1,1,1,0],
        [0,1,1,0,0,0,0],
        [1,1,0,0,0,0,0],
        [1,1,1,1,1,1,1]
      ],
      3: [
        [0,1,1,1,1,1,0],
        [1,1,0,0,0,1,1],
        [0,0,0,0,0,1,1],
        [0,0,1,1,1,1,0],
        [0,0,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [0,1,1,1,1,1,0]
      ],
      4: [
        [0,0,0,0,1,1,0],
        [0,0,0,1,1,1,0],
        [0,0,1,1,1,1,0],
        [0,1,1,0,1,1,0],
        [1,1,1,1,1,1,1],
        [0,0,0,0,1,1,0],
        [0,0,0,0,1,1,0]
      ],
      5: [
        [1,1,1,1,1,1,1],
        [1,1,0,0,0,0,0],
        [1,1,1,1,1,1,0],
        [0,0,0,0,0,1,1],
        [0,0,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [0,1,1,1,1,1,0]
      ],
      6: [
        [0,1,1,1,1,1,0],
        [1,1,0,0,0,0,0],
        [1,1,0,0,0,0,0],
        [1,1,1,1,1,1,0],
        [1,1,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [0,1,1,1,1,1,0]
      ],
      7: [
        [1,1,1,1,1,1,1],
        [0,0,0,0,0,1,1],
        [0,0,0,0,1,1,0],
        [0,0,0,1,1,0,0],
        [0,0,1,1,0,0,0],
        [0,0,1,1,0,0,0],
        [0,0,1,1,0,0,0]
      ],
      8: [
        [0,1,1,1,1,1,0],
        [1,1,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [0,1,1,1,1,1,0],
        [1,1,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [0,1,1,1,1,1,0]
      ],
      9: [
        [0,1,1,1,1,1,0],
        [1,1,0,0,0,1,1],
        [1,1,0,0,0,1,1],
        [0,1,1,1,1,1,1],
        [0,0,0,0,0,1,1],
        [0,0,0,0,0,1,1],
        [0,1,1,1,1,1,0]
      ]
    };
    return patterns[digit] || patterns[7];
  }

  // ============================================
  // NETWORK LAYERS (Nodes)
  // ============================================
  function createNetworkLayers() {
    const { layers, nodeRadius, nodeSpacing, layerSpacing, inputGrid, inputCellSize, inputGap, colors } = CONFIG;
    const group = svg.querySelector('.nn-nodes-group');
    
    const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
    const svgHeight = viewBox[3];
    
    // Starting X position (after input grid)
    const inputWidth = inputGrid.cols * (inputCellSize + inputGap);
    const startX = 20 + inputWidth + 60;
    
    nodes = [];
    
    layers.forEach((nodeCount, layerIdx) => {
      const layerX = startX + layerIdx * layerSpacing;
      const layerHeight = (nodeCount - 1) * nodeSpacing;
      const startY = (svgHeight - layerHeight) / 2;
      
      const layerNodes = [];
      
      for (let i = 0; i < nodeCount; i++) {
        const y = startY + i * nodeSpacing;
        const isOutputLayer = layerIdx === layers.length - 1;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', layerX);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', isOutputLayer ? nodeRadius + 2 : nodeRadius);
        circle.setAttribute('fill', colors.node.fill);
        circle.setAttribute('stroke', colors.node.stroke);
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('class', `nn-node nn-layer-${layerIdx}`);
        circle.setAttribute('data-layer', layerIdx);
        circle.setAttribute('data-index', i);
        
        group.appendChild(circle);
        layerNodes.push({
          element: circle,
          x: layerX,
          y: y,
          layer: layerIdx,
          index: i
        });
      }
      
      nodes.push(layerNodes);
    });
  }

  // ============================================
  // CONNECTIONS
  // ============================================
  function createConnections() {
    const { colors } = CONFIG;
    const group = svg.querySelector('.nn-connections-group');
    
    connections = [];
    
    // Connect input to first hidden layer (sparse connections for clarity)
    const inputConnections = createInputConnections(group);
    connections.push(inputConnections);
    
    // Connect hidden layers
    for (let l = 0; l < nodes.length - 1; l++) {
      const layerConnections = [];
      const fromNodes = nodes[l];
      const toNodes = nodes[l + 1];
      
      fromNodes.forEach((from, fi) => {
        toNodes.forEach((to, ti) => {
          // Create connection line
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', from.x);
          line.setAttribute('y1', from.y);
          line.setAttribute('x2', to.x);
          line.setAttribute('y2', to.y);
          line.setAttribute('stroke', colors.connection.default);
          line.setAttribute('stroke-width', '0.8');
          line.setAttribute('class', 'nn-connection');
          line.setAttribute('data-from-layer', l);
          line.setAttribute('data-from-index', fi);
          line.setAttribute('data-to-layer', l + 1);
          line.setAttribute('data-to-index', ti);
          
          group.appendChild(line);
          layerConnections.push({
            element: line,
            from: { layer: l, index: fi },
            to: { layer: l + 1, index: ti }
          });
        });
      });
      
      connections.push(layerConnections);
    }
  }

  function createInputConnections(group) {
    const { inputGrid, inputCellSize, inputGap, colors } = CONFIG;
    const layerConnections = [];
    
    const inputWidth = inputGrid.cols * (inputCellSize + inputGap);
    const startX = 20 + inputWidth;
    
    const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
    const svgHeight = viewBox[3];
    const inputStartY = (svgHeight - inputGrid.rows * (inputCellSize + inputGap)) / 2;
    
    // Connect from center of input grid to first layer nodes
    const centerX = 20 + inputWidth / 2;
    const centerY = inputStartY + (inputGrid.rows * (inputCellSize + inputGap)) / 2;
    
    // Sparse connections from different parts of input
    const connectionPoints = [
      { x: 20 + inputWidth, y: inputStartY + inputCellSize },
      { x: 20 + inputWidth, y: inputStartY + inputGrid.rows * (inputCellSize + inputGap) / 2 },
      { x: 20 + inputWidth, y: inputStartY + (inputGrid.rows - 1) * (inputCellSize + inputGap) }
    ];
    
    connectionPoints.forEach((from, fi) => {
      nodes[0].forEach((to, ti) => {
        // Only create some connections for visual clarity
        if ((fi + ti) % 2 === 0) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', from.x);
          line.setAttribute('y1', from.y);
          line.setAttribute('x2', to.x);
          line.setAttribute('y2', to.y);
          line.setAttribute('stroke', colors.connection.default);
          line.setAttribute('stroke-width', '0.6');
          line.setAttribute('stroke-opacity', '0.5');
          line.setAttribute('class', 'nn-connection nn-input-connection');
          
          group.appendChild(line);
          layerConnections.push({
            element: line,
            from: { type: 'input', index: fi },
            to: { layer: 0, index: ti }
          });
        }
      });
    });
    
    return layerConnections;
  }

  // ============================================
  // OUTPUT LABELS
  // ============================================
  function createOutputLabels() {
    const group = svg.querySelector('.nn-labels-group');
    const lastLayerNodes = nodes[nodes.length - 1];
    
    outputLabels = [];
    
    lastLayerNodes.forEach((node, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x + 20);
      text.setAttribute('y', node.y + 4);
      text.setAttribute('fill', CONFIG.colors.output.text);
      text.setAttribute('font-size', '11');
      text.setAttribute('font-family', 'monospace');
      text.setAttribute('class', 'nn-output-label');
      text.textContent = CONFIG.outputLabels[i] || i;
      
      group.appendChild(text);
      outputLabels.push(text);
    });
  }

  // ============================================
  // ENTRANCE ANIMATION
  // ============================================
  function animateEntrance() {
    if (reducedMotion) {
      showAllElements();
      highlightPrediction(currentPrediction);
      return;
    }

    const { timing } = CONFIG;
    
    // Fade in input grid
    inputCells.forEach((cell, i) => {
      cell.element.style.opacity = '0';
      setTimeout(() => {
        cell.element.style.transition = 'opacity 0.3s ease';
        cell.element.style.opacity = cell.intensity > 0 ? cell.intensity : '0.03';
      }, timing.initialDelay + i * 5);
    });
    
    // Animate nodes layer by layer
    nodes.forEach((layerNodes, layerIdx) => {
      layerNodes.forEach((node, nodeIdx) => {
        node.element.style.opacity = '0';
        node.element.style.transform = 'scale(0)';
        
        const delay = timing.initialDelay + 300 + 
                      layerIdx * timing.layerStagger + 
                      nodeIdx * timing.nodeStagger;
        
        setTimeout(() => {
          node.element.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          node.element.style.opacity = '1';
          node.element.style.transform = 'scale(1)';
        }, delay);
      });
    });
    
    // Draw connections
    const totalNodeDelay = timing.initialDelay + 300 + 
                           nodes.length * timing.layerStagger + 
                           Math.max(...nodes.map(l => l.length)) * timing.nodeStagger;
    
    connections.forEach((layerConns, layerIdx) => {
      layerConns.forEach((conn, connIdx) => {
        conn.element.style.opacity = '0';
        
        setTimeout(() => {
          conn.element.style.transition = `opacity ${timing.connectionDraw}ms ease`;
          conn.element.style.opacity = '1';
        }, totalNodeDelay + layerIdx * 100 + connIdx * 2);
      });
    });
    
    // Show output labels
    outputLabels.forEach((label, i) => {
      label.style.opacity = '0';
      setTimeout(() => {
        label.style.transition = 'opacity 0.3s ease';
        label.style.opacity = '0.7';
      }, totalNodeDelay + connections.length * 100 + i * 50);
    });
    
    // Start signal flow after entrance
    setTimeout(() => {
      highlightPrediction(currentPrediction);
      startSignalFlow();
    }, totalNodeDelay + 1500);
  }

  function showAllElements() {
    inputCells.forEach(cell => {
      cell.element.style.opacity = cell.intensity > 0 ? cell.intensity : '0.03';
    });
    nodes.forEach(layer => layer.forEach(n => n.element.style.opacity = '1'));
    connections.forEach(layer => layer.forEach(c => c.element.style.opacity = '1'));
    outputLabels.forEach(l => l.style.opacity = '0.7');
  }

  // ============================================
  // SIGNAL FLOW ANIMATION
  // ============================================
  function startSignalFlow() {
    if (reducedMotion) return;
    
    runSignalFlow();
    signalTimer = setInterval(runSignalFlow, CONFIG.timing.signalInterval);
  }

  function runSignalFlow() {
    const { timing, colors } = CONFIG;
    const signalGroup = svg.querySelector('.nn-signals-group');
    
    // Clear previous signals
    signalGroup.innerHTML = '';
    
    // Randomly select active nodes for this pass
    const activeNodes = nodes.map(layer => {
      const count = Math.ceil(layer.length * 0.5); // 50% active
      const shuffled = [...Array(layer.length).keys()].sort(() => Math.random() - 0.5);
      return new Set(shuffled.slice(0, count));
    });
    
    // Animate layer by layer
    nodes.forEach((layerNodes, layerIdx) => {
      setTimeout(() => {
        // Highlight active nodes in this layer
        layerNodes.forEach((node, nodeIdx) => {
          if (activeNodes[layerIdx].has(nodeIdx)) {
            node.element.style.transition = 'fill 0.2s ease, filter 0.2s ease';
            node.element.style.fill = colors.node.active;
            node.element.style.filter = 'url(#nn-glow)';
            
            // Reset after delay
            setTimeout(() => {
              node.element.style.fill = colors.node.fill;
              node.element.style.filter = 'none';
            }, 400);
          }
        });
        
        // Animate connections to next layer
        if (layerIdx < connections.length - 1) {
          const layerConns = connections[layerIdx + 1];
          layerConns.forEach(conn => {
            if (activeNodes[layerIdx].has(conn.from.index)) {
              animateConnectionSignal(conn, signalGroup);
            }
          });
        }
      }, layerIdx * 300);
    });
    
    // Highlight prediction at the end
    setTimeout(() => {
      highlightPrediction(currentPrediction);
    }, nodes.length * 300 + 200);
  }

  function animateConnectionSignal(conn, signalGroup) {
    const fromNode = nodes[conn.from.layer][conn.from.index];
    const toNode = nodes[conn.to.layer][conn.to.index];
    
    // Create signal dot
    const signal = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    signal.setAttribute('r', '3');
    signal.setAttribute('fill', CONFIG.colors.connection.signal);
    signal.setAttribute('filter', 'url(#nn-signal-glow)');
    signal.setAttribute('class', 'nn-signal');
    
    signalGroup.appendChild(signal);
    
    // Animate along connection
    const duration = 250;
    const startTime = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const x = fromNode.x + (toNode.x - fromNode.x) * eased;
      const y = fromNode.y + (toNode.y - fromNode.y) * eased;
      
      signal.setAttribute('cx', x);
      signal.setAttribute('cy', y);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        signal.remove();
      }
    }
    
    requestAnimationFrame(animate);
    
    // Briefly highlight the connection
    conn.element.style.transition = 'stroke 0.1s ease, stroke-width 0.1s ease';
    conn.element.style.stroke = CONFIG.colors.connection.positive;
    conn.element.style.strokeWidth = '1.5';
    
    setTimeout(() => {
      conn.element.style.stroke = CONFIG.colors.connection.default;
      conn.element.style.strokeWidth = '0.8';
    }, 200);
  }

  // ============================================
  // PREDICTION HIGHLIGHT
  // ============================================
  function highlightPrediction(digit) {
    const { colors, timing } = CONFIG;
    const lastLayer = nodes[nodes.length - 1];
    
    lastLayer.forEach((node, i) => {
      const isActive = i === digit;
      
      node.element.style.transition = `fill ${timing.predictionHighlight}ms ease, 
                                        stroke ${timing.predictionHighlight}ms ease, 
                                        filter ${timing.predictionHighlight}ms ease`;
      
      if (isActive) {
        node.element.style.fill = colors.output.prediction;
        node.element.style.stroke = colors.output.prediction;
        node.element.style.filter = 'url(#nn-glow)';
        outputLabels[i].style.fill = colors.output.prediction;
        outputLabels[i].style.fontWeight = 'bold';
      } else {
        node.element.style.fill = colors.node.fill;
        node.element.style.stroke = colors.node.stroke;
        node.element.style.filter = 'none';
        outputLabels[i].style.fill = colors.output.text;
        outputLabels[i].style.fontWeight = 'normal';
      }
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================
  function setPrediction(digit) {
    if (digit >= 0 && digit <= 9) {
      currentPrediction = digit;
      updateInputPattern(digit);
      highlightPrediction(digit);
    }
  }

  function updateInputPattern(digit) {
    const pattern = generateDigitPattern(digit);
    
    if (inputCells.length === 0) {
      return;
    }
    
    inputCells.forEach(cell => {
      const row = cell.row;
      const col = cell.col;
      const intensity = pattern[row][col];
      
      cell.intensity = intensity;
      
      if (intensity === 1) {
        // FILLED PIXEL - bright white, full opacity
        cell.element.setAttribute('fill', '#ffffff');
        cell.element.setAttribute('fill-opacity', '1');
        cell.element.style.opacity = '1';  // Override animation styles
      } else {
        // EMPTY PIXEL - completely invisible
        cell.element.setAttribute('fill', '#000000');
        cell.element.setAttribute('fill-opacity', '0');
        cell.element.style.opacity = '0';  // Override animation styles
      }
    });
  }

  function stop() {
    if (signalTimer) {
      clearInterval(signalTimer);
      signalTimer = null;
    }
  }

  function cyclePredictions() {
    let digit = 0;
    setPrediction(digit);
    
    setInterval(() => {
      digit = (digit + 1) % 10;
      setPrediction(digit);
    }, 5000);
  }

  // ============================================
  // EXPOSE & INIT
  // ============================================
  window.NeuralBanner = {
    init,
    stop,
    setPrediction,
    cyclePredictions,
    runSignalFlow
  };

  // Optimize with IntersectionObserver
  function setupIntersectionObserver() {
    const container = document.querySelector('.nn-visual');
    if (!container || !window.IntersectionObserver) {
      window.addEventListener('load', () => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => init());
        } else {
          setTimeout(init, 1000);
        }
      });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!svg) {
            // Lazy init only when in view AND after load
            if (document.readyState === 'complete') {
              init();
            } else {
              window.addEventListener('load', () => {
                setTimeout(init, 500); // Small extra delay to clear TBT window
              });
            }
          } else {
            startSignalFlow();
          }
        } else {
          stop();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(container);
  }

  setupIntersectionObserver();

})();


/**
 * Site Enhancements JavaScript
 * - Page loader
 * - Page transitions
 * - Back-to-top with progress
 * - Theme toggle
 * - Skills animation
 * - Contact form validation
 * - Portfolio filtering effects
 */

(function() {
  'use strict';

  // ============================================
  // 1. PAGE LOADER
  // ============================================
  const PageLoader = {
    loader: null,
    progressBar: null,
    progress: 0,
    
    init() {
      this.loader = document.querySelector('.page-loader');
      this.progressBar = document.querySelector('.loader-progress-bar');
      
      if (!this.loader) return;
      
      // Simulate loading progress
      this.simulateProgress();
      
      // Hide loader when page is fully loaded
      window.addEventListener('load', () => {
        this.complete();
      });
      
      // Fallback timeout
      setTimeout(() => this.complete(), 5000);
    },
    
    simulateProgress() {
      const interval = setInterval(() => {
        this.progress += Math.random() * 15;
        if (this.progress >= 90) {
          clearInterval(interval);
          this.progress = 90;
        }
        this.updateProgress();
      }, 100);
    },
    
    updateProgress() {
      if (this.progressBar) {
        this.progressBar.style.width = `${this.progress}%`;
      }
    },
    
    complete() {
      this.progress = 100;
      this.updateProgress();
      
      setTimeout(() => {
        if (this.loader) {
          this.loader.classList.add('loaded');
          document.body.classList.add('page-loaded');
        }
      }, 300);
    }
  };

  // ============================================
  // 2. PAGE TRANSITIONS
  // ============================================
  const PageTransitions = {
    overlay: null,
    
    init() {
      this.overlay = document.querySelector('.page-transition');
      if (!this.overlay) return;
      
      // Intercept internal links
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        
        // Only handle internal page links (not anchors, external, or special)
        if (href && 
            !href.startsWith('#') && 
            !href.startsWith('http') && 
            !href.startsWith('mailto') &&
            !href.startsWith('tel') &&
            href.endsWith('.html')) {
          
          link.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigate(href);
          });
        }
      });
    },
    
    navigate(url) {
      document.body.classList.add('page-transitioning');
      this.overlay.classList.add('active');
      
      setTimeout(() => {
        window.location.href = url;
      }, 500);
    }
  };

  // ============================================
  // 3. BACK TO TOP WITH PROGRESS
  // ============================================
  const BackToTop = {
    button: null,
    progressCircle: null,
    
    init() {
      this.button = document.querySelector('.back-to-top');
      if (!this.button) return;
      
      // Add progress ring SVG
      this.addProgressRing();
      
      // Scroll listener
      window.addEventListener('scroll', () => this.onScroll(), { passive: true });
      
      // Click handler
      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        this.scrollToTop();
      });
      
      // Initial check
      this.onScroll();
    },
    
    addProgressRing() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'progress-ring');
      svg.setAttribute('viewBox', '0 0 56 56');
      svg.innerHTML = `
        <circle class="progress-bg" cx="28" cy="28" r="25"/>
        <circle class="progress-value" cx="28" cy="28" r="25"/>
      `;
      this.button.appendChild(svg);
      this.progressCircle = svg.querySelector('.progress-value');
    },
    
    onScroll() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollTop / scrollHeight;
      
      // Show/hide button
      if (scrollTop > 300) {
        this.button.classList.add('active');
      } else {
        this.button.classList.remove('active');
      }
      
      // Update progress ring
      if (this.progressCircle) {
        const circumference = 157; // 2 * PI * 25
        const offset = circumference * (1 - progress);
        this.progressCircle.style.strokeDashoffset = offset;
      }
    },
    
    scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // ============================================
  // 4. THEME TOGGLE
  // ============================================
  const ThemeToggle = {
    button: null,
    currentTheme: 'light',
    
    init() {
      this.button = document.querySelector('.theme-toggle');
      if (!this.button) return;
      
      // Get saved theme or system preference
      this.currentTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      
      // Apply theme
      this.applyTheme(this.currentTheme);
      
      // Click handler
      this.button.addEventListener('click', () => this.toggle());
      
      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    },
    
    toggle() {
      this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
      this.applyTheme(this.currentTheme);
      localStorage.setItem('theme', this.currentTheme);
      
      // Button animation
      this.button.style.transform = 'scale(0.9)';
      setTimeout(() => {
        this.button.style.transform = '';
      }, 150);
    },
    
    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      this.currentTheme = theme;
      
      // Update meta theme-color
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', theme === 'dark' ? '#0a192f' : '#0563bb');
      }
    }
  };

  // ============================================
  // 5. SKILLS ANIMATION
  // ============================================
  const SkillsAnimation = {
    init() {
      const skillBars = document.querySelectorAll('.skill-progress');
      if (!skillBars.length) return;
      
      // Use Intersection Observer for lazy animation
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const bar = entry.target;
            const targetWidth = bar.getAttribute('data-progress') || bar.style.width;
            
            setTimeout(() => {
              bar.style.width = targetWidth;
            }, 100);
            
            observer.unobserve(bar);
          }
        });
      }, { threshold: 0.3 });
      
      skillBars.forEach(bar => {
        // Store target width and reset
        const width = bar.style.width || bar.getAttribute('data-progress');
        bar.setAttribute('data-progress', width);
        bar.style.width = '0';
        
        observer.observe(bar);
      });
    }
  };

  // ============================================
  // 6. CONTACT FORM ENHANCEMENTS
  // ============================================
  const ContactForm = {
    form: null,
    
    init() {
      this.form = document.querySelector('.php-email-form');
      if (!this.form) return;
      
      // Setup floating labels
      this.setupFloatingLabels();
      
      // Real-time validation
      this.setupValidation();
    },
    
    setupFloatingLabels() {
      const inputs = this.form.querySelectorAll('.form-control');
      
      inputs.forEach(input => {
        // Add placeholder for CSS detection
        if (!input.placeholder) {
          input.placeholder = ' ';
        }
        
        // Check initial value
        if (input.value) {
          input.classList.add('has-value');
        }
        
        // Input events
        input.addEventListener('input', () => {
          input.classList.toggle('has-value', input.value.length > 0);
        });
        
        input.addEventListener('focus', () => {
          input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
          input.parentElement.classList.remove('focused');
          this.validateField(input);
        });
      });
    },
    
    setupValidation() {
      const inputs = this.form.querySelectorAll('.form-control[required]');
      
      inputs.forEach(input => {
        input.addEventListener('blur', () => this.validateField(input));
        input.addEventListener('input', () => {
          if (input.classList.contains('is-invalid')) {
            this.validateField(input);
          }
        });
      });
    },
    
    validateField(input) {
      const isValid = input.checkValidity();
      
      input.classList.remove('is-valid', 'is-invalid');
      
      if (input.value.length > 0) {
        input.classList.add(isValid ? 'is-valid' : 'is-invalid');
      }
      
      return isValid;
    }
  };

  // ============================================
  // 7. PORTFOLIO FILTERING EFFECTS
  // ============================================
  const PortfolioEffects = {
    init() {
      const filters = document.querySelectorAll('.portfolio-filters li, [data-filter]');
      const items = document.querySelectorAll('.portfolio-item');
      
      if (!filters.length || !items.length) return;
      
      filters.forEach(filter => {
        filter.addEventListener('click', () => {
          const filterValue = filter.getAttribute('data-filter') || '*';
          
          // Update active state
          filters.forEach(f => f.classList.remove('filter-active'));
          filter.classList.add('filter-active');
          
          // Animate items
          this.filterItems(items, filterValue);
        });
      });
    },
    
    filterItems(items, filterValue) {
      items.forEach((item, index) => {
        const shouldShow = filterValue === '*' || 
          item.classList.contains(filterValue.replace('.', ''));
        
        // Fade out
        item.classList.add('filtering');
        
        setTimeout(() => {
          item.style.display = shouldShow ? '' : 'none';
          
          if (shouldShow) {
            item.classList.remove('filtering');
            item.classList.add('filtered-in');
            
            // Remove animation class after it completes
            setTimeout(() => {
              item.classList.remove('filtered-in');
            }, 500);
          }
        }, 200 + (index * 50));
      });
    }
  };

  // ============================================
  // 8. SECTION DIVIDERS (Dynamic Creation)
  // ============================================
  const SectionDividers = {
    init() {
      // Add wave dividers between sections
      const sections = document.querySelectorAll('section.section-bg');
      
      sections.forEach(section => {
        // Add top divider
        if (!section.querySelector('.section-divider.wave-top')) {
          const topDivider = this.createDivider('top');
          section.insertBefore(topDivider, section.firstChild);
        }
      });
    },
    
    createDivider(position) {
      const div = document.createElement('div');
      div.className = `section-divider wave-${position}`;
      div.innerHTML = `
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,64 C200,100 400,20 600,64 C800,108 1000,44 1200,64 L1200,120 L0,120 Z"></path>
        </svg>
      `;
      return div;
    }
  };

  // ============================================
  // INITIALIZE ALL
  // ============================================
  function init() {
    PageLoader.init();
    BackToTop.init();
    ThemeToggle.init();
    SkillsAnimation.init();
    ContactForm.init();
    PortfolioEffects.init();
    // SectionDividers.init(); // Optional - uncomment to auto-add dividers
    
    // Page transitions last (after loader)
    setTimeout(() => {
      PageTransitions.init();
    }, 100);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.SiteEnhancements = {
    PageLoader,
    PageTransitions,
    BackToTop,
    ThemeToggle,
    SkillsAnimation,
    ContactForm,
    PortfolioEffects,
    SectionDividers
  };

})();
// Particles.js configuration for header background
document.addEventListener('DOMContentLoaded', function() {
  particlesJS("particles-js", {
    "particles": {
      "number": {
        "value": 100,
        "density": {
          "enable": true,
          "value_area": 800
        }
      },
      "color": {
        "value": "#ffffff"
      },
      "shape": {
        "type": "circle",
        "stroke": {
          "width": 0,
          "color": "#000000"
        },
        "polygon": {
          "nb_sides": 5
        }
      },
      "opacity": {
        "value": 0.5,
        "random": false,
        "anim": {
          "enable": false,
          "speed": 1,
          "opacity_min": 0.1,
          "sync": false
        }
      },
      "size": {
        "value": 3,
        "random": true,
        "anim": {
          "enable": false,
          "speed": 40,
          "size_min": 0.1,
          "sync": false
        }
      },
      "line_linked": {
        "enable": true,
        "distance": 100,
        "color": "#ffffff",
        "opacity": 0.3,
        "width": 1
      },
      "move": {
        "enable": true,
        "speed": 3,
        "direction": "none",
        "random": false,
        "straight": false,
        "out_mode": "out",
        "bounce": false,
        "attract": {
          "enable": false,
          "rotateX": 600,
          "rotateY": 1200
        }
      }
    }
  });
});
/**
* Template Name: iPortfolio
* Updated: May 30 2023 with Bootstrap v5.3.0
* Template URL: https://bootstrapmade.com/iportfolio-bootstrap-portfolio-websites-template/
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/
(function() {
  "use strict";

  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim()
    if (all) {
      return [...document.querySelectorAll(el)]
    } else {
      return document.querySelector(el)
    }
  }

  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all)
    if (selectEl) {
      if (all) {
        selectEl.forEach(e => e.addEventListener(type, listener))
      } else {
        selectEl.addEventListener(type, listener)
      }
    }
  }

  /**
   * Easy on scroll event listener 
   */
  const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
  }

  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select('#navbar .scrollto', true)
  const navbarlinksActive = () => {
    let position = window.scrollY + 200
    navbarlinks.forEach(navbarlink => {
      if (!navbarlink.hash) return
      let section = select(navbarlink.hash)
      if (!section) return
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        navbarlink.classList.add('active')
      } else {
        navbarlink.classList.remove('active')
      }
    })
  }
  window.addEventListener('load', navbarlinksActive)
  onscroll(document, navbarlinksActive)

  /**
   * Scrolls to an element with header offset
   */
  const scrollto = (el) => {
    let elementPos = select(el).offsetTop
    window.scrollTo({
      top: elementPos,
      behavior: 'smooth'
    })
  }

  /**
   * Back to top button
   */
  let backtotop = select('.back-to-top')
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add('active')
      } else {
        backtotop.classList.remove('active')
      }
    }
    window.addEventListener('load', toggleBacktotop)
    onscroll(document, toggleBacktotop)
  }

  /**
   * Mobile nav toggle
   */
  on('click', '.mobile-nav-toggle', function(e) {
    select('body').classList.toggle('mobile-nav-active')
    this.classList.toggle('bi-list')
    this.classList.toggle('bi-x')
  })

  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on('click', '.scrollto', function(e) {
    if (select(this.hash)) {
      e.preventDefault()

      let body = select('body')
      if (body.classList.contains('mobile-nav-active')) {
        body.classList.remove('mobile-nav-active')
        let navbarToggle = select('.mobile-nav-toggle')
        navbarToggle.classList.toggle('bi-list')
        navbarToggle.classList.toggle('bi-x')
      }
      scrollto(this.hash)
    }
  }, true)

  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener('load', () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash)
      }
    }
  });

  /**
   * Hero type effect
   */
  const typed = select('.typed')
  if (typed) {
    let typed_strings = typed.getAttribute('data-typed-items')
    typed_strings = typed_strings.split(',')
    new Typed('.typed', {
      strings: typed_strings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000
    });
  }

  /**
   * Skills animation
   */
  let skilsContent = select('.skills-content');
  if (skilsContent) {
    new Waypoint({
      element: skilsContent,
      offset: '80%',
      handler: function(direction) {
        let progress = select('.progress .progress-bar', true);
        progress.forEach((el) => {
          el.style.width = el.getAttribute('aria-valuenow') + '%'
        });
      }
    })
  }

  /**
   * Porfolio isotope and filter
   */
  window.addEventListener('load', () => {
    let portfolioContainer = select('.portfolio-container');
    if (portfolioContainer) {
      let portfolioIsotope = new Isotope(portfolioContainer, {
        itemSelector: '.portfolio-item'
      });

      let portfolioFilters = select('#portfolio-flters li', true);

      on('click', '#portfolio-flters li', function(e) {
        e.preventDefault();
        portfolioFilters.forEach(function(el) {
          el.classList.remove('filter-active');
        });
        this.classList.add('filter-active');

        portfolioIsotope.arrange({
          filter: this.getAttribute('data-filter')
        });
        portfolioIsotope.on('arrangeComplete', function() {
          AOS.refresh()
        });
      }, true);
    }

  });

  /**
   * Initiate portfolio lightbox 
   */
  const portfolioLightbox = GLightbox({
    selector: '.portfolio-lightbox'
  });

  /**
   * Portfolio details slider
   */
  new Swiper('.portfolio-details-slider', {
    speed: 400,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    }
  });

  /**
   * Testimonials slider
   */
  new Swiper('.testimonials-slider', {
    speed: 600,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false
    },
    slidesPerView: 'auto',
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true
    },
    breakpoints: {
      320: {
        slidesPerView: 1,
        spaceBetween: 20
      },

      1200: {
        slidesPerView: 3,
        spaceBetween: 20
      }
    }
  });

  /**
   * Animation on scroll
   */
  window.addEventListener('load', () => {
    AOS.init({
      duration: 1000,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    })
  });

  /**
   * Initiate Pure Counter 
   */
  new PureCounter();

})()