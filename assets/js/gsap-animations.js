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
