# Animation System Documentation

This document describes the animation system used on the portfolio website, including the neural network banner and GSAP-powered scroll/interaction effects.

## Overview

The animation system consists of two main components:

1. **Neural Banner** (`neural-banner.js`) - A lightweight SVG-based neural network visualization
2. **GSAP Animations** (`gsap-animations.js`) - Scroll-triggered reveals and micro-interactions

Both systems are designed for:
- ✅ **Performance** - SVG instead of canvas, CSS transitions over JS animations
- ✅ **Accessibility** - Respects `prefers-reduced-motion`
- ✅ **Graceful degradation** - Works without JS
- ✅ **Easy customization** - Simple configuration objects

---

## Neural Banner

### Files
- `assets/js/neural-banner.js` - SVG generation and minimal animation
- `assets/css/neural-banner.css` - Styling and CSS transitions

### Features
- Simple neural network with 4 layers (input, 2 hidden, output)
- SVG-based for crisp rendering at any size
- Load-in animation: nodes and connections fade in with stagger
- Idle animation: subtle random node pulse every 3 seconds

### Configuration

Edit the `CONFIG` object at the top of `neural-banner.js`:

```javascript
const CONFIG = {
  // Network structure: [input, hidden1, hidden2, output]
  layers: [4, 5, 5, 3],
  
  // Visual settings
  nodeRadius: 6,
  nodeSpacing: 50,      // Vertical spacing
  layerSpacing: 100,    // Horizontal spacing
  
  // Colors
  colors: {
    node: '#149ddd',           // Node stroke color
    nodeFill: 'rgba(20, 157, 221, 0.15)',
    connection: 'rgba(79, 195, 247, 0.25)',
    activeNode: '#4fc3f7',     // Pulse color
  },
  
  // Animation timing
  pulseInterval: 3000,  // ms between random highlights
  pulseDuration: 1500   // ms for pulse animation
};
```

### Customizing the Network

**Change number of layers/nodes:**
```javascript
// More layers, more nodes
layers: [3, 6, 8, 6, 3]

// Simpler network
layers: [3, 4, 2]
```

**Adjust spacing:**
```javascript
nodeSpacing: 40,      // Tighter vertical spacing
layerSpacing: 120,    // More spread out horizontally
```

### Public API

```javascript
// Stop the idle pulse animation
NeuralBanner.stop();

// Manually pulse a specific node (by index)
NeuralBanner.pulseNode(5);

// Re-initialize (if needed)
NeuralBanner.init();
```

---

## GSAP Scroll Animations

### Files
- `assets/js/gsap-animations.js` - All GSAP-based animations

### External Dependencies
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
```

### Animated Elements

| Element | Animation | Trigger |
|---------|-----------|---------|
| `.section-title` | Fade up | Scroll into view |
| `.resume-item` | Slide from left | Scroll into view |
| `.portfolio-item` | Scale up | Scroll into view |
| `.publication-item` | Fade up staggered | Scroll into view |
| `.hero-container` | Parallax fade | Scroll past hero |
| `.btn` | Hover scale + ripple | Mouse interaction |
| `.social-links a` | Rotate on hover | Mouse interaction |

### Configuration

Edit the configuration objects in `gsap-animations.js`:

```javascript
const SCROLL_CONFIG = {
  trigger: {
    start: 'top 85%',      // When to start animation
    end: 'bottom 15%',
    toggleActions: 'play none none reverse'
  },
  duration: {
    fast: 0.4,
    normal: 0.6,
    slow: 0.8
  },
  ease: {
    smooth: 'power2.out',
    bounce: 'back.out(1.4)'
  }
};

const BUTTON_CONFIG = {
  hover: {
    scale: 1.05,
    duration: 0.3
  },
  press: {
    scale: 0.95,
    duration: 0.1
  },
  ripple: {
    enabled: true,
    color: 'rgba(255, 255, 255, 0.3)'
  }
};
```

### Adding Animations to New Sections

**Method 1: Use existing classes**
```html
<!-- Auto-animated by class name -->
<div class="section-title">...</div>
<div class="resume-item">...</div>
<div class="portfolio-item">...</div>
```

**Method 2: Use data attributes for parallax**
```html
<div data-parallax="0.2">
  This element will have parallax scrolling
</div>
```

**Method 3: Add custom GSAP animation**
```javascript
gsap.from('.my-element', {
  scrollTrigger: {
    trigger: '.my-element',
    start: 'top 80%'
  },
  y: 50,
  opacity: 0,
  duration: 0.6
});
```

### Public API

```javascript
// Refresh ScrollTrigger after dynamic content loads
GSAPAnimations.refresh();

// Kill all scroll triggers
GSAPAnimations.kill();
```

---

## Accessibility

### Reduced Motion

Both systems respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations are disabled or instant */
}
```

When reduced motion is preferred:
- Neural banner shows static (no pulse animation)
- GSAP uses instant transitions
- Scroll indicator doesn't animate

### Testing Reduced Motion

**Chrome DevTools:**
1. Open Settings (⚙️)
2. Rendering → Emulate CSS media feature prefers-reduced-motion

**macOS:**
System Preferences → Accessibility → Display → Reduce motion

---

## Performance Notes

### Why SVG over Canvas?
- No per-frame JavaScript loops
- GPU-accelerated CSS transitions
- Browser handles optimization
- Crisper at any resolution

### Tips
1. The neural banner uses CSS transitions for load-in, not JS
2. Idle pulse animation runs every 3 seconds (not continuously)
3. GSAP ScrollTrigger is already optimized for scroll throttling
4. All scripts use `defer` for non-blocking load

---

## File Structure

```
assets/
├── css/
│   ├── neural-banner.css      # Banner styles + transitions
│   ├── button-animations.css  # Button hover effects
│   └── ...
├── js/
│   ├── neural-banner.js       # SVG neural network
│   ├── gsap-animations.js     # Scroll + interactions
│   └── ...
```

## Dependencies

| Library | Version | Purpose | CDN |
|---------|---------|---------|-----|
| GSAP | 3.12.5 | Scroll animations | cdnjs |
| ScrollTrigger | 3.12.5 | Scroll detection | cdnjs |

Both libraries are loaded from CDN with `defer` attribute for non-blocking load.
