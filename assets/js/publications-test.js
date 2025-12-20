/**
 * Publications Testing Module
 * Provides utilities to validate Publications section functionality
 * Usage: Open browser console and call PublicationsTest.runAllTests()
 */

const PublicationsTest = {
  results: [],
  
  /**
   * Log test result
   */
  log(testName, passed, message = '') {
    const result = {
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    this.results.push(result);
    
    const icon = passed ? '✅' : '❌';
    const style = passed ? 'color: green; font-weight: bold;' : 'color: red; font-weight: bold;';
    console.log(`%c${icon} ${testName}`, style, message);
    
    return passed;
  },
  
  /**
   * Test: Publications Manager exists
   */
  testManagerExists() {
    const passed = typeof window.publicationsManager !== 'undefined' 
                   && window.publicationsManager !== null;
    return this.log('Publications Manager Exists', passed, 
                    passed ? 'Manager initialized' : 'Manager not found');
  },
  
  /**
   * Test: Publications data loaded
   */
  testDataLoaded() {
    const manager = window.publicationsManager;
    const passed = manager && Array.isArray(manager.publications) && manager.publications.length > 0;
    return this.log('Publications Data Loaded', passed,
                    passed ? `${manager.publications.length} publications loaded` : 'No data found');
  },
  
  /**
   * Test: Filter controls exist
   */
  testFilterControlsExist() {
    const yearFilter = document.getElementById('pub-filter-year');
    const typeFilter = document.getElementById('pub-filter-type');
    const searchInput = document.getElementById('pub-search');
    const resetBtn = document.getElementById('pub-reset-filters');
    
    const passed = yearFilter && typeFilter && searchInput && resetBtn;
    const missing = [];
    if (!yearFilter) missing.push('year filter');
    if (!typeFilter) missing.push('type filter');
    if (!searchInput) missing.push('search input');
    if (!resetBtn) missing.push('reset button');
    
    return this.log('Filter Controls Exist', passed,
                    passed ? 'All controls present' : `Missing: ${missing.join(', ')}`);
  },
  
  /**
   * Test: Reset filters functionality
   */
  async testResetFilters() {
    const manager = window.publicationsManager;
    if (!manager) {
      return this.log('Reset Filters Functionality', false, 'Manager not found');
    }
    
    // Set some filters
    manager.filters.year = '2024';
    manager.filters.type = 'conference';
    manager.filters.search = 'test';
    
    // Call reset
    manager.resetFilters();
    
    // Verify filters are cleared
    const passed = manager.filters.year === 'all' 
                   && manager.filters.type === 'all' 
                   && manager.filters.search === '';
    
    return this.log('Reset Filters Functionality', passed,
                    passed ? 'Filters reset successfully' : 'Filters not properly reset');
  },
  
  /**
   * Test: BibTeX data integrity
   */
  testBibtexIntegrity() {
    const manager = window.publicationsManager;
    if (!manager || !manager.publications) {
      return this.log('BibTeX Data Integrity', false, 'No publications to test');
    }
    
    let issues = [];
    let validCount = 0;
    
    manager.publications.forEach(pub => {
      if (pub.bibtex) {
        try {
          // Check if BibTeX can be encoded/decoded
          const encoded = encodeURIComponent(pub.bibtex);
          const decoded = decodeURIComponent(encoded);
          
          if (decoded !== pub.bibtex) {
            issues.push(`${pub.id}: Encoding mismatch`);
          } else {
            validCount++;
          }
          
          // Check for basic BibTeX structure
          if (!pub.bibtex.includes('@') || !pub.bibtex.includes('{')) {
            issues.push(`${pub.id}: Invalid BibTeX format`);
          }
        } catch (error) {
          issues.push(`${pub.id}: ${error.message}`);
        }
      }
    });
    
    const passed = issues.length === 0 && validCount > 0;
    return this.log('BibTeX Data Integrity', passed,
                    passed ? `${validCount} valid BibTeX entries` : `Issues: ${issues.join(', ')}`);
  },
  
  /**
   * Test: Cite buttons exist
   */
  testCiteButtonsExist() {
    const citeButtons = document.querySelectorAll('.cite-btn');
    const bibtexDivs = document.querySelectorAll('.pub-bibtex');
    
    const passed = citeButtons.length > 0 && bibtexDivs.length > 0;
    return this.log('Cite Buttons Exist', passed,
                    passed ? `${citeButtons.length} cite buttons, ${bibtexDivs.length} BibTeX sections` 
                           : 'No cite buttons found');
  },
  
  /**
   * Test: Cite button click simulation
   */
  async testCiteButtonClick() {
    const citeBtn = document.querySelector('.cite-btn');
    if (!citeBtn) {
      return this.log('Cite Button Click', false, 'No cite button found to test');
    }
    
    const pubId = citeBtn.dataset.pubId;
    const bibtexDiv = document.getElementById(`bibtex-${pubId}`);
    
    if (!bibtexDiv) {
      return this.log('Cite Button Click', false, `BibTeX div not found for ${pubId}`);
    }
    
    // Simulate click
    const wasShowing = bibtexDiv.classList.contains('show');
    citeBtn.click();
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const isShowing = bibtexDiv.classList.contains('show');
    const passed = wasShowing !== isShowing; // State should have toggled
    
    return this.log('Cite Button Click', passed,
                    passed ? 'BibTeX toggle working' : 'Toggle failed');
  },
  
  /**
   * Test: Copy to clipboard button exists
   */
  testCopyButtonsExist() {
    const copyButtons = document.querySelectorAll('.copy-bibtex');
    const passed = copyButtons.length > 0;
    
    return this.log('Copy Buttons Exist', passed,
                    passed ? `${copyButtons.length} copy buttons found` : 'No copy buttons found');
  },
  
  /**
   * Test: Filtering functionality
   */
  async testFiltering() {
    const manager = window.publicationsManager;
    if (!manager) {
      return this.log('Filtering Functionality', false, 'Manager not found');
    }
    
    const totalPubs = manager.publications.length;
    
    // Test year filter
    if (manager.publications.length > 0) {
      const firstYear = manager.publications[0].year;
      manager.filters.year = firstYear.toString();
      const filtered = manager.getFilteredPublications();
      
      const yearFilterWorks = filtered.every(pub => pub.year === firstYear);
      
      // Reset
      manager.filters.year = 'all';
      
      if (!yearFilterWorks) {
        return this.log('Filtering Functionality', false, 'Year filter not working');
      }
    }
    
    // Test type filter
    const types = manager.getTypes();
    if (types.length > 0) {
      manager.filters.type = types[0];
      const filtered = manager.getFilteredPublications();
      
      const typeFilterWorks = filtered.every(pub => pub.type === types[0]);
      
      // Reset
      manager.filters.type = 'all';
      
      if (!typeFilterWorks) {
        return this.log('Filtering Functionality', false, 'Type filter not working');
      }
    }
    
    return this.log('Filtering Functionality', true, 'All filters working correctly');
  },
  
  /**
   * Test: Search functionality
   */
  async testSearch() {
    const manager = window.publicationsManager;
    if (!manager || manager.publications.length === 0) {
      return this.log('Search Functionality', false, 'No publications to search');
    }
    
    // Get a word from first publication title
    const searchTerm = manager.publications[0].title.split(' ')[0].toLowerCase();
    manager.filters.search = searchTerm;
    
    const filtered = manager.getFilteredPublications();
    const passed = filtered.length > 0 && filtered.length <= manager.publications.length;
    
    // Reset
    manager.filters.search = '';
    
    return this.log('Search Functionality', passed,
                    passed ? `Found ${filtered.length} results for "${searchTerm}"` : 'Search not working');
  },
  
  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('%c🧪 Starting Publications Tests...', 'font-size: 16px; font-weight: bold; color: #149ddd;');
    console.log('─'.repeat(50));
    
    this.results = [];
    
    // Run tests in sequence
    this.testManagerExists();
    this.testDataLoaded();
    this.testFilterControlsExist();
    await this.testResetFilters();
    this.testBibtexIntegrity();
    this.testCiteButtonsExist();
    await this.testCiteButtonClick();
    this.testCopyButtonsExist();
    await this.testFiltering();
    await this.testSearch();
    
    // Summary
    console.log('─'.repeat(50));
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    const passRate = ((passed / total) * 100).toFixed(1);
    const summaryStyle = failed === 0 
      ? 'font-size: 14px; font-weight: bold; color: green;'
      : 'font-size: 14px; font-weight: bold; color: orange;';
    
    console.log(`%c📊 Test Summary: ${passed}/${total} passed (${passRate}%)`, summaryStyle);
    
    if (failed > 0) {
      console.log('%c⚠️  Failed tests:', 'color: red; font-weight: bold;');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`   • ${r.test}: ${r.message}`);
      });
    }
    
    return {
      passed,
      failed,
      total,
      passRate,
      results: this.results
    };
  },
  
  /**
   * Quick validation (subset of tests)
   */
  async quickValidate() {
    console.log('%c⚡ Quick Validation', 'font-size: 14px; font-weight: bold;');
    
    this.results = [];
    
    this.testManagerExists();
    this.testDataLoaded();
    this.testFilterControlsExist();
    this.testCiteButtonsExist();
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    return passed === total;
  }
};

// Make available globally
window.PublicationsTest = PublicationsTest;

// Auto-run quick validation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => PublicationsTest.quickValidate(), 1000);
  });
} else {
  setTimeout(() => PublicationsTest.quickValidate(), 1000);
}

console.log('%c📝 Publications Test Module Loaded', 'color: #149ddd; font-weight: bold;');
console.log('Run PublicationsTest.runAllTests() for comprehensive testing');
console.log('Run PublicationsTest.quickValidate() for quick validation');
