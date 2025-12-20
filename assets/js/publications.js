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
  }

  /**
   * Initialize the publications manager
   */
  async init() {
    try {
      this.publications = await window.dataLoader.load('publications');
      this.render();
      this.setupEventListeners();
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
   * Setup filter and search event listeners
   */
  setupEventListeners() {
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

    // Cite button click handlers - using event delegation
    document.addEventListener('click', (e) => {
      // Handle cite button clicks
      if (e.target.closest('.cite-btn')) {
        e.preventDefault();
        const btn = e.target.closest('.cite-btn');
        const pubId = btn.dataset.pubId;
        
        if (!pubId) {
          console.error('Cite button missing data-pub-id attribute');
          return;
        }
        
        const bibtexDiv = document.getElementById(`bibtex-${pubId}`);
        
        if (!bibtexDiv) {
          console.error(`BibTeX div not found for publication: ${pubId}`);
          // Show error feedback
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<i class="bi bi-exclamation-circle"></i> Error';
          btn.classList.add('btn-danger');
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('btn-danger');
          }, 2000);
          return;
        }
        
        // Toggle bibtex visibility
        const isShowing = bibtexDiv.classList.toggle('show');
        
        // Toggle button active state
        btn.classList.toggle('active', isShowing);
        btn.setAttribute('aria-expanded', isShowing);
        
        // Close other open bibtex sections
        document.querySelectorAll('.pub-bibtex.show').forEach(el => {
          if (el.id !== `bibtex-${pubId}`) {
            el.classList.remove('show');
            const otherBtn = document.querySelector(`[data-pub-id="${el.id.replace('bibtex-', '')}"]`);
            if (otherBtn) {
              otherBtn.classList.remove('active');
              otherBtn.setAttribute('aria-expanded', 'false');
            }
          }
        });
        
        // Scroll to bibtex if showing
        if (isShowing) {
          setTimeout(() => {
            bibtexDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 350); // Match CSS transition duration
        }
      }

      // Handle copy button clicks
      if (e.target.closest('.copy-bibtex')) {
        e.preventDefault();
        const btn = e.target.closest('.copy-bibtex');
        const bibtex = decodeURIComponent(btn.dataset.bibtex);
        this.copyToClipboard(bibtex, btn);
      }
    });
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

    // Re-setup event listeners for dynamic content
    this.setupEventListeners();

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const pubContainer = document.getElementById('publications-container');
  if (pubContainer) {
    window.publicationsManager = new PublicationsManager('publications-container');
    window.publicationsManager.init();
  }
});
