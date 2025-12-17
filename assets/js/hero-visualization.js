/**
 * AI/Computer Vision Hero Visualization
 * 
 * An animated canvas visualization featuring:
 * - Neural network nodes and connections
 * - Camera rays / sensor beams
 * - Bounding box detection patterns
 * - Car silhouette with CV overlays
 * 
 * Performance optimized with:
 * - requestAnimationFrame throttling
 * - Visibility API pause/resume
 * - Reduced motion support
 * - Canvas optimization techniques
 * 
 * ============================================
 * CUSTOMIZATION GUIDE:
 * ============================================
 * 
 * To adjust colors:
 *   - Modify CONFIG.colors object below
 * 
 * To change animation speed:
 *   - Adjust CONFIG.animation.speed (0.1 = slow, 2 = fast)
 * 
 * To add/remove neural nodes:
 *   - Modify CONFIG.neuralNet.nodeCount
 * 
 * To adjust car/sensor visualization:
 *   - Modify CONFIG.car and CONFIG.sensors objects
 * 
 * To disable specific elements:
 *   - Set the element's 'enabled' property to false
 * ============================================
 */

(function() {
  'use strict';

  // Configuration object - adjust these values to customize
  const CONFIG = {
    // Color palette (matches site theme)
    colors: {
      primary: '#149ddd',        // Main accent blue
      secondary: '#0563bb',      // Darker blue
      accent: '#4fc3f7',         // Light blue
      neural: 'rgba(20, 157, 221, 0.6)',
      connection: 'rgba(79, 195, 247, 0.2)',
      bbox: 'rgba(76, 175, 80, 0.7)',      // Green for bounding boxes
      sensor: 'rgba(255, 193, 7, 0.4)',    // Yellow for sensor rays
      car: 'rgba(255, 255, 255, 0.15)'
    },
    
    // Animation settings
    animation: {
      speed: 1,           // Global speed multiplier
      fps: 30,            // Target frame rate (lower = better performance)
      enabled: true       // Master toggle
    },
    
    // Neural network visualization
    neuralNet: {
      enabled: true,
      nodeCount: 25,      // Number of floating nodes
      maxConnections: 3,  // Max connections per node
      connectionDistance: 150
    },
    
    // Car silhouette
    car: {
      enabled: true,
      opacity: 0.12,
      scale: 0.6
    },
    
    // Sensor/camera rays
    sensors: {
      enabled: true,
      rayCount: 5,
      spread: 45          // Degrees
    },
    
    // Bounding boxes
    boundingBoxes: {
      enabled: true,
      count: 3
    },
    
    // Data flow particles
    particles: {
      enabled: true,
      count: 20
    }
  };

  // Canvas and context
  let canvas, ctx;
  let animationId = null;
  let isVisible = true;
  let lastFrameTime = 0;
  const frameInterval = 1000 / CONFIG.animation.fps;
  
  // Animation state
  let nodes = [];
  let particles = [];
  let boundingBoxes = [];
  let time = 0;
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Initialize the visualization
   */
  function init() {
    // Don't run if user prefers reduced motion
    if (prefersReducedMotion) {
      console.log('Hero visualization: Reduced motion preferred, using static fallback');
      return;
    }
    
    // Find or create canvas
    canvas = document.getElementById('hero-canvas');
    if (!canvas) {
      const hero = document.getElementById('hero');
      if (!hero) return;
      
      canvas = document.createElement('canvas');
      canvas.id = 'hero-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      hero.insertBefore(canvas, hero.firstChild);
    }
    
    ctx = canvas.getContext('2d');
    
    // Handle resize
    resizeCanvas();
    window.addEventListener('resize', debounce(resizeCanvas, 250));
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Initialize elements
    initNodes();
    initParticles();
    initBoundingBoxes();
    
    // Start animation
    if (CONFIG.animation.enabled) {
      animate(0);
    }
  }

  /**
   * Resize canvas to match container
   */
  function resizeCanvas() {
    const hero = document.getElementById('hero');
    if (!hero || !canvas) return;
    
    const rect = hero.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    ctx.scale(dpr, dpr);
    
    // Reinitialize elements for new dimensions
    initNodes();
    initParticles();
    initBoundingBoxes();
  }

  /**
   * Initialize neural network nodes
   */
  function initNodes() {
    if (!CONFIG.neuralNet.enabled) return;
    
    nodes = [];
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    for (let i = 0; i < CONFIG.neuralNet.nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5 * CONFIG.animation.speed,
        vy: (Math.random() - 0.5) * 0.5 * CONFIG.animation.speed,
        radius: 2 + Math.random() * 3,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Initialize data flow particles
   */
  function initParticles() {
    if (!CONFIG.particles.enabled) return;
    
    particles = [];
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    for (let i = 0; i < CONFIG.particles.count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2,
        speed: 0.3 + Math.random() * 0.7,
        angle: Math.random() * Math.PI * 2,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
  }

  /**
   * Initialize bounding boxes
   */
  function initBoundingBoxes() {
    if (!CONFIG.boundingBoxes.enabled) return;
    
    boundingBoxes = [];
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    for (let i = 0; i < CONFIG.boundingBoxes.count; i++) {
      boundingBoxes.push({
        x: width * 0.3 + Math.random() * width * 0.4,
        y: height * 0.4 + Math.random() * height * 0.3,
        width: 40 + Math.random() * 60,
        height: 30 + Math.random() * 50,
        label: ['CAR', 'PERSON', 'VEHICLE'][i % 3],
        confidence: 0.85 + Math.random() * 0.14,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * Main animation loop
   */
  function animate(currentTime) {
    if (!isVisible || !CONFIG.animation.enabled) {
      animationId = requestAnimationFrame(animate);
      return;
    }
    
    // Throttle to target FPS
    const elapsed = currentTime - lastFrameTime;
    if (elapsed < frameInterval) {
      animationId = requestAnimationFrame(animate);
      return;
    }
    lastFrameTime = currentTime - (elapsed % frameInterval);
    
    // Clear canvas
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, width, height);
    
    // Update time
    time += 0.016 * CONFIG.animation.speed;
    
    // Draw layers (back to front)
    drawCarSilhouette(width, height);
    drawSensorRays(width, height);
    drawNeuralNetwork(width, height);
    drawDataParticles(width, height);
    drawBoundingBoxes(width, height);
    drawScanLines(width, height);
    
    animationId = requestAnimationFrame(animate);
  }

  /**
   * Draw car silhouette
   */
  function drawCarSilhouette(width, height) {
    if (!CONFIG.car.enabled) return;
    
    const centerX = width * 0.5;
    const centerY = height * 0.55;
    const scale = CONFIG.car.scale * Math.min(width / 800, 1);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    
    ctx.strokeStyle = CONFIG.colors.car;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    
    // Simple car silhouette path
    ctx.beginPath();
    
    // Body
    ctx.moveTo(-120, 20);
    ctx.lineTo(-100, 20);
    ctx.lineTo(-90, -10);
    ctx.lineTo(-50, -30);
    ctx.lineTo(40, -30);
    ctx.lineTo(70, -10);
    ctx.lineTo(100, 0);
    ctx.lineTo(120, 10);
    ctx.lineTo(120, 30);
    ctx.lineTo(-120, 30);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    // Windows
    ctx.beginPath();
    ctx.moveTo(-45, -25);
    ctx.lineTo(-20, -25);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-50, -10);
    ctx.closePath();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(-10, -25);
    ctx.lineTo(35, -25);
    ctx.lineTo(55, -10);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.stroke();
    
    // Wheels
    ctx.beginPath();
    ctx.arc(-70, 30, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(70, 30, 18, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Draw sensor/camera rays
   */
  function drawSensorRays(width, height) {
    if (!CONFIG.sensors.enabled) return;
    
    const carX = width * 0.5;
    const carY = height * 0.55;
    
    const spread = CONFIG.sensors.spread * Math.PI / 180;
    const rayCount = CONFIG.sensors.rayCount;
    const baseAngle = -Math.PI / 2; // Point forward
    const rayLength = Math.min(width, height) * 0.4;
    
    for (let i = 0; i < rayCount; i++) {
      const angleOffset = (i - (rayCount - 1) / 2) * (spread / (rayCount - 1));
      const angle = baseAngle + angleOffset;
      
      const waveOffset = Math.sin(time * 2 + i * 0.5) * 0.1;
      const opacity = 0.2 + waveOffset;
      
      // Create gradient ray
      const gradient = ctx.createLinearGradient(
        carX, carY,
        carX + Math.cos(angle) * rayLength,
        carY + Math.sin(angle) * rayLength
      );
      gradient.addColorStop(0, `rgba(255, 193, 7, ${opacity * 0.8})`);
      gradient.addColorStop(1, 'rgba(255, 193, 7, 0)');
      
      ctx.beginPath();
      ctx.moveTo(carX, carY - 30);
      ctx.lineTo(
        carX + Math.cos(angle) * rayLength,
        carY + Math.sin(angle) * rayLength - 30
      );
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Camera/sensor icon at front of car
    ctx.save();
    ctx.translate(carX, carY - 50);
    
    const pulseScale = 1 + Math.sin(time * 3) * 0.1;
    ctx.scale(pulseScale, pulseScale);
    
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.colors.primary;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(20, 157, 221, ${0.5 + Math.sin(time * 3) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Draw neural network nodes and connections
   */
  function drawNeuralNetwork(width, height) {
    if (!CONFIG.neuralNet.enabled || nodes.length === 0) return;
    
    // Update node positions
    nodes.forEach(node => {
      node.x += node.vx;
      node.y += node.vy;
      node.pulse += 0.02;
      
      // Bounce off edges
      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;
      
      // Keep in bounds
      node.x = Math.max(0, Math.min(width, node.x));
      node.y = Math.max(0, Math.min(height, node.y));
    });
    
    // Draw connections
    ctx.strokeStyle = CONFIG.colors.connection;
    ctx.lineWidth = 1;
    
    nodes.forEach((node, i) => {
      let connections = 0;
      for (let j = i + 1; j < nodes.length && connections < CONFIG.neuralNet.maxConnections; j++) {
        const other = nodes[j];
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < CONFIG.neuralNet.connectionDistance) {
          const opacity = 1 - distance / CONFIG.neuralNet.connectionDistance;
          ctx.strokeStyle = `rgba(79, 195, 247, ${opacity * 0.3})`;
          
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
          
          connections++;
        }
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const pulseSize = 1 + Math.sin(node.pulse) * 0.3;
      
      // Outer glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * pulseSize * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(20, 157, 221, ${0.1 + Math.sin(node.pulse) * 0.05})`;
      ctx.fill();
      
      // Core
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.colors.neural;
      ctx.fill();
    });
  }

  /**
   * Draw flowing data particles
   */
  function drawDataParticles(width, height) {
    if (!CONFIG.particles.enabled) return;
    
    particles.forEach(p => {
      // Update position
      p.x += Math.cos(p.angle) * p.speed * CONFIG.animation.speed;
      p.y += Math.sin(p.angle) * p.speed * CONFIG.animation.speed;
      
      // Wrap around edges
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;
      
      // Subtle angle drift
      p.angle += (Math.random() - 0.5) * 0.02;
      
      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(79, 195, 247, ${p.opacity})`;
      ctx.fill();
    });
  }

  /**
   * Draw CV-style bounding boxes
   */
  function drawBoundingBoxes(width, height) {
    if (!CONFIG.boundingBoxes.enabled) return;
    
    boundingBoxes.forEach(box => {
      // Animate pulse
      box.pulsePhase += 0.03;
      const pulse = Math.sin(box.pulsePhase) * 0.2;
      const opacity = 0.6 + pulse;
      
      // Box
      ctx.strokeStyle = `rgba(76, 175, 80, ${opacity})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);
      
      // Corner markers
      const cornerSize = 8;
      ctx.lineWidth = 3;
      ctx.strokeStyle = CONFIG.colors.bbox;
      
      // Top-left
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + cornerSize);
      ctx.lineTo(box.x, box.y);
      ctx.lineTo(box.x + cornerSize, box.y);
      ctx.stroke();
      
      // Top-right
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerSize, box.y);
      ctx.lineTo(box.x + box.width, box.y);
      ctx.lineTo(box.x + box.width, box.y + cornerSize);
      ctx.stroke();
      
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + box.height - cornerSize);
      ctx.lineTo(box.x, box.y + box.height);
      ctx.lineTo(box.x + cornerSize, box.y + box.height);
      ctx.stroke();
      
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
      ctx.stroke();
      
      // Label background
      ctx.fillStyle = `rgba(76, 175, 80, ${opacity * 0.9})`;
      const labelWidth = 70;
      const labelHeight = 16;
      ctx.fillRect(box.x, box.y - labelHeight - 2, labelWidth, labelHeight);
      
      // Label text
      ctx.font = '10px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${box.label} ${(box.confidence * 100).toFixed(0)}%`, box.x + 4, box.y - 5);
    });
  }

  /**
   * Draw subtle scan lines effect
   */
  function drawScanLines(width, height) {
    const scanY = (time * 100) % height;
    
    const gradient = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
    gradient.addColorStop(0, 'rgba(20, 157, 221, 0)');
    gradient.addColorStop(0.5, 'rgba(20, 157, 221, 0.05)');
    gradient.addColorStop(1, 'rgba(20, 157, 221, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, scanY - 30, width, 60);
  }

  /**
   * Handle visibility change
   */
  function handleVisibility() {
    isVisible = !document.hidden;
  }

  /**
   * Debounce utility
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Public API for external control
   */
  window.HeroVisualization = {
    init: init,
    pause: function() {
      CONFIG.animation.enabled = false;
    },
    resume: function() {
      CONFIG.animation.enabled = true;
    },
    setSpeed: function(speed) {
      CONFIG.animation.speed = speed;
    },
    toggleElement: function(element, enabled) {
      if (CONFIG[element]) {
        CONFIG[element].enabled = enabled;
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
