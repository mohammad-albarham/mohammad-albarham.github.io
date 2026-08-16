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
