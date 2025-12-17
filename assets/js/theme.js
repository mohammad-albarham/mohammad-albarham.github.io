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
   * Get preferred theme based on system preference
   */
  getPreferredTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = storedTheme || preferredTheme;
  document.documentElement.setAttribute('data-theme', theme);
})();
