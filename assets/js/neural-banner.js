/**
 * Neural Network Banner - Data Flow Visualization
 * 
 * Shows AI processing: input → layer activations → output
 * Lightweight SVG + CSS transitions
 */

(function() {
  'use strict';

  const CONFIG = {
    layers: [4, 6, 6, 3],
    nodeRadius: 8,
    nodeSpacing: 45,
    layerSpacing: 120,
    
    colors: {
      node: '#149ddd',
      nodeFill: 'rgba(20, 157, 221, 0.1)',
      connection: 'rgba(79, 195, 247, 0.15)',
      activeNode: '#4fc3f7',
      input: '#ffc107',
      output: '#4caf50'
    },
    
    flowInterval: 4000,
    layerDelay: 350
  };

  let nodes = [];
  let connections = [];
  let inputArrows = [];
  let outputArrows = [];
  let flowTimer = null;

  function init() {
    const container = document.querySelector('.nn-visual');
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    createNetwork(container);
    
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.classList.add('nn-ready');
        
        if (!reducedMotion) {
          setTimeout(() => {
            runDataFlow();
            flowTimer = setInterval(runDataFlow, CONFIG.flowInterval);
          }, 1000);
        }
      });
    });
  }

  function createNetwork(container) {
    const { layers, nodeRadius, nodeSpacing, layerSpacing, colors } = CONFIG;
    
    const maxNodes = Math.max(...layers);
    const width = (layers.length - 1) * layerSpacing + 160;
    const height = (maxNodes - 1) * nodeSpacing + 80;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'nn-svg');
    svg.setAttribute('aria-hidden', 'true');
    
    // Defs: filters, markers
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <marker id="arrowIn" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="${colors.input}"/>
      </marker>
      <marker id="arrowOut" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="${colors.output}"/>
      </marker>
    `;
    svg.appendChild(defs);
    
    // Groups
    const connectionsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const arrowsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    const nodePositions = [];
    nodes = [];
    connections = [];
    inputArrows = [];
    outputArrows = [];
    
    const startX = 60;
    
    // Create nodes
    layers.forEach((nodeCount, layerIdx) => {
      const layerX = startX + layerIdx * layerSpacing;
      const layerHeight = (nodeCount - 1) * nodeSpacing;
      const startY = (height - layerHeight) / 2;
      
      const layerNodes = [];
      const layerPos = [];
      
      for (let i = 0; i < nodeCount; i++) {
        const y = startY + i * nodeSpacing;
        layerPos.push({ x: layerX, y });
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', layerX);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', nodeRadius);
        circle.setAttribute('class', 'nn-node');
        circle.setAttribute('data-layer', layerIdx);
        circle.setAttribute('data-index', i);
        nodesGroup.appendChild(circle);
        layerNodes.push(circle);
      }
      
      nodePositions.push(layerPos);
      nodes.push(layerNodes);
    });
    
    // Create connections
    for (let l = 0; l < nodePositions.length - 1; l++) {
      const layerConns = [];
      nodePositions[l].forEach((from, fi) => {
        nodePositions[l + 1].forEach((to, ti) => {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', from.x);
          line.setAttribute('y1', from.y);
          line.setAttribute('x2', to.x);
          line.setAttribute('y2', to.y);
          line.setAttribute('class', 'nn-connection');
          connectionsGroup.appendChild(line);
          layerConns.push({ line, from: fi, to: ti });
        });
      });
      connections.push(layerConns);
    }
    
    // Input arrows
    nodePositions[0].forEach(pos => {
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      arrow.setAttribute('x1', pos.x - 35);
      arrow.setAttribute('y1', pos.y);
      arrow.setAttribute('x2', pos.x - 12);
      arrow.setAttribute('y2', pos.y);
      arrow.setAttribute('class', 'nn-input-arrow');
      arrow.setAttribute('marker-end', 'url(#arrowIn)');
      arrowsGroup.appendChild(arrow);
      inputArrows.push(arrow);
    });
    
    // Output arrows
    const lastLayer = nodePositions[nodePositions.length - 1];
    lastLayer.forEach(pos => {
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      arrow.setAttribute('x1', pos.x + 12);
      arrow.setAttribute('y1', pos.y);
      arrow.setAttribute('x2', pos.x + 35);
      arrow.setAttribute('y2', pos.y);
      arrow.setAttribute('class', 'nn-output-arrow');
      arrow.setAttribute('marker-end', 'url(#arrowOut)');
      arrowsGroup.appendChild(arrow);
      outputArrows.push(arrow);
    });
    
    svg.appendChild(connectionsGroup);
    svg.appendChild(nodesGroup);
    svg.appendChild(arrowsGroup);
    container.appendChild(svg);
  }

  /**
   * Animate data flowing through the network
   */
  function runDataFlow() {
    const { layerDelay } = CONFIG;
    
    // 1. Input arrows light up
    inputArrows.forEach(a => a.classList.add('active'));
    
    // 2. Layer-by-layer activation
    nodes.forEach((layerNodes, layerIdx) => {
      setTimeout(() => {
        // Activate ~60% of nodes randomly
        const count = Math.ceil(layerNodes.length * 0.6);
        const shuffled = [...layerNodes].sort(() => Math.random() - 0.5);
        const active = shuffled.slice(0, count);
        
        active.forEach(node => {
          node.classList.add('active');
          setTimeout(() => node.classList.remove('active'), layerDelay * 2);
        });
        
        // Light up connections from active nodes
        if (layerIdx < connections.length) {
          const activeIdx = active.map(n => +n.getAttribute('data-index'));
          connections[layerIdx].forEach(c => {
            if (activeIdx.includes(c.from)) {
              c.line.classList.add('active');
              setTimeout(() => c.line.classList.remove('active'), layerDelay * 1.5);
            }
          });
        }
      }, layerDelay * layerIdx);
    });
    
    // 3. Output arrows light up
    setTimeout(() => {
      outputArrows.forEach(a => a.classList.add('active'));
      setTimeout(() => {
        inputArrows.forEach(a => a.classList.remove('active'));
        outputArrows.forEach(a => a.classList.remove('active'));
      }, layerDelay);
    }, layerDelay * nodes.length);
  }

  function stop() {
    if (flowTimer) clearInterval(flowTimer);
    flowTimer = null;
  }

  window.NeuralBanner = { init, stop, runDataFlow };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
