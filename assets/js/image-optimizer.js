/**
 * Image Optimization Module
 * Handles lazy loading, error states, and image performance optimization
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    lazyLoadThreshold: '200px',  // Start loading when image is 200px from viewport
    fadeInDuration: 300,
    placeholderClass: 'img-placeholder',
    loadedClass: 'loaded',
    errorClass: 'error'
  };

  /**
   * Initialize native lazy loading with fallback
   */
  function initLazyLoading() {
    // Check for native lazy loading support
    if ('loading' in HTMLImageElement.prototype) {
      // Native lazy loading supported - add loading="lazy" to images without it
      document.querySelectorAll('img:not([loading])').forEach(img => {
        // Skip small icons and already visible images
        if (img.width < 50 || img.height < 50) return;
        img.setAttribute('loading', 'lazy');
      });
    } else {
      // Fallback to IntersectionObserver
      initIntersectionObserverLazyLoad();
    }
  }

  /**
   * IntersectionObserver fallback for lazy loading
   */
  function initIntersectionObserverLazyLoad() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if (lazyImages.length === 0) return;

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          loadImage(img);
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: CONFIG.lazyLoadThreshold,
      threshold: 0
    });

    lazyImages.forEach(img => imageObserver.observe(img));
  }

  /**
   * Load a single image
   */
  function loadImage(img) {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;
    
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
    
    if (srcset) {
      img.srcset = srcset;
      img.removeAttribute('data-srcset');
    }
    
    img.classList.add(CONFIG.loadedClass);
  }

  /**
   * Handle image load events
   */
  function handleImageLoad(event) {
    const img = event.target;
    img.classList.add(CONFIG.loadedClass);
    img.classList.remove(CONFIG.placeholderClass);
  }

  /**
   * Handle image error events
   */
  function handleImageError(event) {
    const img = event.target;
    img.classList.add(CONFIG.errorClass);
    img.classList.remove(CONFIG.placeholderClass);
    
    // Try WebP fallback if available
    if (img.src.endsWith('.webp') && img.dataset.fallback) {
      img.src = img.dataset.fallback;
      img.classList.remove(CONFIG.errorClass);
      return;
    }
    
    // Set a placeholder or hide the image
    console.warn('Image failed to load:', img.src);
  }

  /**
   * Add loading and error handlers to all images
   */
  function setupImageHandlers() {
    document.querySelectorAll('img').forEach(img => {
      // Skip images that are already set up
      if (img.dataset.optimized) return;
      
      img.addEventListener('load', handleImageLoad);
      img.addEventListener('error', handleImageError);
      img.dataset.optimized = 'true';
      
      // If image is already loaded, mark it
      if (img.complete && img.naturalHeight !== 0) {
        img.classList.add(CONFIG.loadedClass);
      }
    });
  }

  /**
   * Add decoding="async" for non-critical images
   */
  function setupAsyncDecoding() {
    document.querySelectorAll('img:not([decoding])').forEach(img => {
      // Skip critical above-the-fold images
      const rect = img.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) return;
      
      img.setAttribute('decoding', 'async');
    });
  }

  /**
   * Preload critical images (like hero, profile)
   */
  function preloadCriticalImages() {
    const criticalSelectors = [
      '.profile-img',
      '#header .profile img',
      '.hero img'
    ];
    
    criticalSelectors.forEach(selector => {
      const img = document.querySelector(selector);
      if (img && img.src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = img.src;
        document.head.appendChild(link);
      }
    });
  }

  /**
   * WebP support detection
   */
  function checkWebPSupport() {
    const webP = new Image();
    webP.onload = webP.onerror = function() {
      const hasWebP = webP.height === 2;
      document.documentElement.classList.add(hasWebP ? 'webp-support' : 'no-webp-support');
      
      // If WebP supported, swap images that have WebP versions
      if (hasWebP) {
        swapToWebP();
      }
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  }

  /**
   * Swap images to WebP if available
   */
  function swapToWebP() {
    document.querySelectorAll('img[data-webp]').forEach(img => {
      const webpSrc = img.dataset.webp;
      
      // Store original as fallback
      img.dataset.fallback = img.src;
      
      // Test if WebP version exists before swapping
      const testImg = new Image();
      testImg.onload = function() {
        img.src = webpSrc;
      };
      testImg.onerror = function() {
        // WebP doesn't exist, keep original
      };
      testImg.src = webpSrc;
    });
  }

  /**
   * Optimize images for current viewport
   */
  function optimizeForViewport() {
    // Use ResizeObserver for responsive image handling
    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(entries => {
        entries.forEach(entry => {
          const img = entry.target;
          const width = entry.contentRect.width;
          
          // If srcset is defined, browser handles it
          // Otherwise, we can add width hints
          if (!img.sizes && img.srcset) {
            img.sizes = `${Math.ceil(width)}px`;
          }
        });
      });

      document.querySelectorAll('img[srcset]').forEach(img => {
        resizeObserver.observe(img);
      });
    }
  }

  /**
   * Create a low-quality image placeholder (LQIP)
   */
  function createPlaceholder(img) {
    if (!img.parentElement) return;
    
    const placeholder = document.createElement('div');
    placeholder.className = CONFIG.placeholderClass;
    placeholder.style.width = img.width ? `${img.width}px` : '100%';
    placeholder.style.height = img.height ? `${img.height}px` : '200px';
    
    img.parentElement.insertBefore(placeholder, img);
    
    img.addEventListener('load', () => {
      placeholder.remove();
    }, { once: true });
  }

  /**
   * Initialize all image optimizations
   */
  function init() {
    // Only run if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Core optimizations
    initLazyLoading();
    setupImageHandlers();
    setupAsyncDecoding();
    
    // WebP support check
    checkWebPSupport();
    
    // Viewport optimization
    optimizeForViewport();

    // Watch for dynamically added images
    if ('MutationObserver' in window) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeName === 'IMG') {
              setupImageHandlers();
              if (!node.loading) {
                node.setAttribute('loading', 'lazy');
              }
            }
            // Check for images inside added containers
            if (node.querySelectorAll) {
              node.querySelectorAll('img').forEach(img => {
                if (!img.dataset.optimized) {
                  img.addEventListener('load', handleImageLoad);
                  img.addEventListener('error', handleImageError);
                  img.dataset.optimized = 'true';
                  if (!img.loading) {
                    img.setAttribute('loading', 'lazy');
                  }
                }
              });
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Export for manual usage
  window.ImageOptimizer = {
    init,
    loadImage,
    preloadCriticalImages,
    checkWebPSupport
  };

  // Auto-initialize
  init();

})();
