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

