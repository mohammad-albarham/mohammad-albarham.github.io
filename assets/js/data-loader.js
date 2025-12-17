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
    if (pub.pdfUrl) links.push(`<a href="${pub.pdfUrl}" class="btn btn-sm btn-outline-primary" target="_blank"><i class="bi bi-file-pdf"></i> PDF</a>`);
    if (pub.url) links.push(`<a href="${pub.url}" class="btn btn-sm btn-outline-secondary" target="_blank"><i class="bi bi-link-45deg"></i> Paper</a>`);
    if (pub.huggingface) links.push(`<a href="${pub.huggingface}" class="btn btn-sm btn-outline-warning" target="_blank"><i class="bi bi-box"></i> HuggingFace</a>`);
    if (pub.github) links.push(`<a href="${pub.github}" class="btn btn-sm btn-outline-dark" target="_blank"><i class="bi bi-github"></i> Code</a>`);
    
    return `
      <div class="publication-card ${typeClass}" data-year="${pub.year}" data-type="${pub.type}" data-keywords="${pub.keywords?.join(',') || ''}">
        <div class="pub-header">
          <span class="pub-year">${pub.year}</span>
          <span class="pub-venue">${pub.venueShort || pub.venue}</span>
          ${featuredBadge}
        </div>
        <h4 class="pub-title">
          <a href="${pub.url || '#'}" target="_blank">${pub.title}</a>
        </h4>
        <p class="pub-authors">${this.formatAuthors(pub.authors)}</p>
        <p class="pub-venue-full">${pub.venue}</p>
        <div class="pub-links">
          ${links.join(' ')}
          <button class="btn btn-sm btn-outline-info cite-btn" data-pub-id="${pub.id}">
            <i class="bi bi-quote"></i> Cite
          </button>
        </div>
        <div class="pub-bibtex collapse" id="bibtex-${pub.id}">
          <pre><code>${pub.bibtex}</code></pre>
          <button class="btn btn-sm btn-primary copy-bibtex" data-bibtex="${encodeURIComponent(pub.bibtex)}">
            <i class="bi bi-clipboard"></i> Copy
          </button>
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
    
    let links = [];
    if (project.links?.github) links.push(`<a href="${project.links.github}" target="_blank"><i class="bx bxl-github"></i></a>`);
    if (project.links?.demo) links.push(`<a href="${project.links.demo}" target="_blank"><i class="bx bx-link-external"></i></a>`);
    if (project.links?.paper) links.push(`<a href="${project.links.paper}" target="_blank"><i class="bx bx-file"></i></a>`);
    if (project.links?.huggingface) links.push(`<a href="${project.links.huggingface}" target="_blank"><i class="bx bx-box"></i></a>`);
    
    return `
      <div class="col-lg-4 col-md-6 portfolio-item filter-${project.category}" data-category="${project.category}" data-featured="${project.featured}">
        <div class="portfolio-wrap">
          ${featuredBadge}
          <img src="${project.image}" class="img-fluid" alt="${project.title}">
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
