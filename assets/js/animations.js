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
