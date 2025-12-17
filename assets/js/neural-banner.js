/**
 * Neural Network Visualization - Manim Style
 * 
 * Inspired by 3Blue1Brown/Manim neural network visualizations
 * Features:
 * - Input image grid (MNIST-style)
 * - Multiple hidden layers with nodes
 * - Animated connections with signal flow
 * - Output layer with prediction highlighting
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Network architecture
    inputGrid: { rows: 7, cols: 7 },  // Simplified input grid (like downsampled MNIST)
    layers: [8, 10, 10, 10],          // Hidden layers + output (last is output with 10 digits)
    
    // Visual settings
    nodeRadius: 6,
    nodeSpacing: 28,
    layerSpacing: 100,
    inputCellSize: 8,
    inputGap: 1,
    
    // Colors
    colors: {
      background: '#040b14',
      node: {
        stroke: '#149ddd',
        fill: 'rgba(20, 157, 221, 0.08)',
        active: 'rgba(79, 195, 247, 0.7)',
        activeStroke: '#4fc3f7'
      },
      connection: {
        default: 'rgba(79, 195, 247, 0.08)',
        positive: '#4fc3f7',
        negative: '#ff6b6b',
        signal: '#ffc107'
      },
      input: {
        empty: 'rgba(255, 255, 255, 0.03)',
        filled: 'rgba(255, 255, 255, 0.9)'
      },
      output: {
        prediction: '#4caf50',
        text: '#fff'
      }
    },
    
    // Animation timing (ms)
    timing: {
      initialDelay: 500,
      layerStagger: 80,
      nodeStagger: 30,
      connectionDraw: 400,
      signalFlow: 2500,
      signalInterval: 4000,
      predictionHighlight: 300
    },
    
    // Output labels
    outputLabels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  };

  // ============================================
  // STATE
  // ============================================
  let svg = null;
  let nodes = [];        // Array of arrays: nodes[layer][index]
  let connections = [];  // Array of arrays: connections[layer][index]
  let inputCells = [];
  let outputLabels = [];
  let signalTimer = null;
  let currentPrediction = 7;  // Default prediction
  let reducedMotion = false;

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    const container = document.querySelector('.nn-visual');
    if (!container) return;

    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Clear existing
    container.innerHTML = '';
    
    // Create SVG
    createSVG(container);
    
    // Build network
    createInputGrid();
    createNetworkLayers();
    createConnections();
    createOutputLabels();
    
    // Animate entrance
    requestAnimationFrame(() => {
      container.classList.add('nn-ready');
      animateEntrance();
    });
  }

  // ============================================
  // SVG CREATION
  // ============================================
  function createSVG(container) {
    const { inputGrid, layers, layerSpacing, nodeSpacing, inputCellSize, inputGap } = CONFIG;
    
    // Calculate dimensions
    const inputWidth = inputGrid.cols * (inputCellSize + inputGap);
    const maxNodes = Math.max(...layers);
    const networkHeight = maxNodes * nodeSpacing;
    const totalWidth = inputWidth + 60 + (layers.length * layerSpacing) + 40;
    const totalHeight = Math.max(inputGrid.rows * (inputCellSize + inputGap), networkHeight) + 80;
    
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
    svg.setAttribute('class', 'nn-svg');
    svg.setAttribute('aria-label', 'Neural network visualization');
    
    // Add defs for filters and gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="nn-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="nn-signal-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="signal-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${CONFIG.colors.connection.signal}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${CONFIG.colors.connection.signal}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${CONFIG.colors.connection.signal}" stop-opacity="0"/>
      </linearGradient>
    `;
    svg.appendChild(defs);
    
    // Create layer groups (order matters for z-index)
    ['connections', 'signals', 'input', 'nodes', 'labels'].forEach(id => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `nn-${id}-group`);
      svg.appendChild(g);
    });
    
    container.appendChild(svg);
  }

  // ============================================
  // INPUT GRID (MNIST-style)
  // ============================================
  function createInputGrid() {
    const { inputGrid, inputCellSize, inputGap, colors } = CONFIG;
    const group = svg.querySelector('.nn-input-group');
    
    // Sample "digit" pattern (stylized "7")
    const pattern = generateDigitPattern(currentPrediction);
    
    const startX = 20;
    const startY = (parseFloat(svg.getAttribute('viewBox').split(' ')[3]) - 
                   inputGrid.rows * (inputCellSize + inputGap)) / 2;
    
    inputCells = [];
    
    for (let row = 0; row < inputGrid.rows; row++) {
      for (let col = 0; col < inputGrid.cols; col++) {
        const x = startX + col * (inputCellSize + inputGap);
        const y = startY + row * (inputCellSize + inputGap);
        const intensity = pattern[row][col];
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', inputCellSize);
        rect.setAttribute('height', inputCellSize);
        rect.setAttribute('fill', intensity > 0 ? colors.input.filled : colors.input.empty);
        rect.setAttribute('fill-opacity', intensity > 0 ? intensity : 0.03);
        rect.setAttribute('class', 'nn-input-cell');
        rect.setAttribute('data-row', row);
        rect.setAttribute('data-col', col);
        
        group.appendChild(rect);
        inputCells.push({ element: rect, row, col, intensity });
      }
    }
  }

  // Generate digit pattern for input visualization
  function generateDigitPattern(digit) {
    const patterns = {
      0: [
        [0,0.5,0.9,0.9,0.9,0.5,0],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0.9,0.5,0,0,0,0.5,0.9],
        [0.9,0.3,0,0,0,0.3,0.9],
        [0.9,0.5,0,0,0,0.5,0.9],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0.5,0.9,0.9,0.9,0.5,0]
      ],
      1: [
        [0,0,0.3,0.9,0.5,0,0],
        [0,0.3,0.9,0.9,0.3,0,0],
        [0,0,0,0.9,0.3,0,0],
        [0,0,0,0.9,0.3,0,0],
        [0,0,0,0.9,0.3,0,0],
        [0,0,0,0.9,0.3,0,0],
        [0,0.5,0.9,0.9,0.9,0.5,0]
      ],
      2: [
        [0,0.5,0.9,0.9,0.9,0.5,0],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0,0,0,0.3,0.9,0.5],
        [0,0,0.5,0.9,0.9,0.5,0],
        [0,0.5,0.9,0.5,0,0,0],
        [0.5,0.9,0.3,0,0,0,0],
        [0.9,0.9,0.9,0.9,0.9,0.9,0.9]
      ],
      3: [
        [0,0.5,0.9,0.9,0.9,0.5,0],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0,0,0,0.3,0.9,0.5],
        [0,0,0.5,0.9,0.9,0.5,0],
        [0,0,0,0,0.3,0.9,0.5],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0.5,0.9,0.9,0.9,0.5,0]
      ],
      4: [
        [0,0,0,0,0.5,0.9,0.3],
        [0,0,0,0.5,0.9,0.9,0.3],
        [0,0,0.5,0.9,0.3,0.9,0.3],
        [0,0.5,0.9,0.3,0,0.9,0.3],
        [0.9,0.9,0.9,0.9,0.9,0.9,0.9],
        [0,0,0,0,0,0.9,0.3],
        [0,0,0,0,0,0.9,0.3]
      ],
      5: [
        [0.9,0.9,0.9,0.9,0.9,0.9,0.9],
        [0.9,0.3,0,0,0,0,0],
        [0.9,0.9,0.9,0.9,0.9,0.5,0],
        [0,0,0,0,0.3,0.9,0.5],
        [0,0,0,0,0.3,0.9,0.5],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0.5,0.9,0.9,0.9,0.5,0]
      ],
      6: [
        [0,0.5,0.9,0.9,0.9,0.5,0],
        [0.5,0.9,0.3,0,0,0,0],
        [0.9,0.5,0,0,0,0,0],
        [0.9,0.9,0.9,0.9,0.9,0.5,0],
        [0.9,0.5,0,0,0.3,0.9,0.5],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0.5,0.9,0.9,0.9,0.5,0]
      ],
      7: [
        [0.9,0.9,0.9,0.9,0.9,0.9,0.9],
        [0.3,0,0,0,0.3,0.9,0.5],
        [0,0,0,0,0.5,0.9,0.3],
        [0,0,0,0.5,0.9,0.3,0],
        [0,0,0.5,0.9,0.3,0,0],
        [0,0,0.9,0.5,0,0,0],
        [0,0,0.9,0.5,0,0,0]
      ],
      8: [
        [0,0.5,0.9,0.9,0.9,0.5,0],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0.5,0.9,0.9,0.9,0.5,0],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0.5,0.9,0.9,0.9,0.5,0]
      ],
      9: [
        [0,0.5,0.9,0.9,0.9,0.5,0],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0.5,0.9,0.3,0,0.3,0.9,0.5],
        [0,0.5,0.9,0.9,0.9,0.9,0.9],
        [0,0,0,0,0,0.5,0.9],
        [0,0,0,0,0.3,0.9,0.5],
        [0,0.5,0.9,0.9,0.9,0.5,0]
      ]
    };
    return patterns[digit] || patterns[7];
  }

  // ============================================
  // NETWORK LAYERS (Nodes)
  // ============================================
  function createNetworkLayers() {
    const { layers, nodeRadius, nodeSpacing, layerSpacing, inputGrid, inputCellSize, inputGap, colors } = CONFIG;
    const group = svg.querySelector('.nn-nodes-group');
    
    const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
    const svgHeight = viewBox[3];
    
    // Starting X position (after input grid)
    const inputWidth = inputGrid.cols * (inputCellSize + inputGap);
    const startX = 20 + inputWidth + 60;
    
    nodes = [];
    
    layers.forEach((nodeCount, layerIdx) => {
      const layerX = startX + layerIdx * layerSpacing;
      const layerHeight = (nodeCount - 1) * nodeSpacing;
      const startY = (svgHeight - layerHeight) / 2;
      
      const layerNodes = [];
      
      for (let i = 0; i < nodeCount; i++) {
        const y = startY + i * nodeSpacing;
        const isOutputLayer = layerIdx === layers.length - 1;
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', layerX);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', isOutputLayer ? nodeRadius + 2 : nodeRadius);
        circle.setAttribute('fill', colors.node.fill);
        circle.setAttribute('stroke', colors.node.stroke);
        circle.setAttribute('stroke-width', '1.5');
        circle.setAttribute('class', `nn-node nn-layer-${layerIdx}`);
        circle.setAttribute('data-layer', layerIdx);
        circle.setAttribute('data-index', i);
        
        group.appendChild(circle);
        layerNodes.push({
          element: circle,
          x: layerX,
          y: y,
          layer: layerIdx,
          index: i
        });
      }
      
      nodes.push(layerNodes);
    });
  }

  // ============================================
  // CONNECTIONS
  // ============================================
  function createConnections() {
    const { colors } = CONFIG;
    const group = svg.querySelector('.nn-connections-group');
    
    connections = [];
    
    // Connect input to first hidden layer (sparse connections for clarity)
    const inputConnections = createInputConnections(group);
    connections.push(inputConnections);
    
    // Connect hidden layers
    for (let l = 0; l < nodes.length - 1; l++) {
      const layerConnections = [];
      const fromNodes = nodes[l];
      const toNodes = nodes[l + 1];
      
      fromNodes.forEach((from, fi) => {
        toNodes.forEach((to, ti) => {
          // Create connection line
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', from.x);
          line.setAttribute('y1', from.y);
          line.setAttribute('x2', to.x);
          line.setAttribute('y2', to.y);
          line.setAttribute('stroke', colors.connection.default);
          line.setAttribute('stroke-width', '0.8');
          line.setAttribute('class', 'nn-connection');
          line.setAttribute('data-from-layer', l);
          line.setAttribute('data-from-index', fi);
          line.setAttribute('data-to-layer', l + 1);
          line.setAttribute('data-to-index', ti);
          
          group.appendChild(line);
          layerConnections.push({
            element: line,
            from: { layer: l, index: fi },
            to: { layer: l + 1, index: ti }
          });
        });
      });
      
      connections.push(layerConnections);
    }
  }

  function createInputConnections(group) {
    const { inputGrid, inputCellSize, inputGap, colors } = CONFIG;
    const layerConnections = [];
    
    const inputWidth = inputGrid.cols * (inputCellSize + inputGap);
    const startX = 20 + inputWidth;
    
    const viewBox = svg.getAttribute('viewBox').split(' ').map(Number);
    const svgHeight = viewBox[3];
    const inputStartY = (svgHeight - inputGrid.rows * (inputCellSize + inputGap)) / 2;
    
    // Connect from center of input grid to first layer nodes
    const centerX = 20 + inputWidth / 2;
    const centerY = inputStartY + (inputGrid.rows * (inputCellSize + inputGap)) / 2;
    
    // Sparse connections from different parts of input
    const connectionPoints = [
      { x: 20 + inputWidth, y: inputStartY + inputCellSize },
      { x: 20 + inputWidth, y: inputStartY + inputGrid.rows * (inputCellSize + inputGap) / 2 },
      { x: 20 + inputWidth, y: inputStartY + (inputGrid.rows - 1) * (inputCellSize + inputGap) }
    ];
    
    connectionPoints.forEach((from, fi) => {
      nodes[0].forEach((to, ti) => {
        // Only create some connections for visual clarity
        if ((fi + ti) % 2 === 0) {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', from.x);
          line.setAttribute('y1', from.y);
          line.setAttribute('x2', to.x);
          line.setAttribute('y2', to.y);
          line.setAttribute('stroke', colors.connection.default);
          line.setAttribute('stroke-width', '0.6');
          line.setAttribute('stroke-opacity', '0.5');
          line.setAttribute('class', 'nn-connection nn-input-connection');
          
          group.appendChild(line);
          layerConnections.push({
            element: line,
            from: { type: 'input', index: fi },
            to: { layer: 0, index: ti }
          });
        }
      });
    });
    
    return layerConnections;
  }

  // ============================================
  // OUTPUT LABELS
  // ============================================
  function createOutputLabels() {
    const group = svg.querySelector('.nn-labels-group');
    const lastLayerNodes = nodes[nodes.length - 1];
    
    outputLabels = [];
    
    lastLayerNodes.forEach((node, i) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x + 20);
      text.setAttribute('y', node.y + 4);
      text.setAttribute('fill', CONFIG.colors.output.text);
      text.setAttribute('font-size', '11');
      text.setAttribute('font-family', 'monospace');
      text.setAttribute('class', 'nn-output-label');
      text.textContent = CONFIG.outputLabels[i] || i;
      
      group.appendChild(text);
      outputLabels.push(text);
    });
  }

  // ============================================
  // ENTRANCE ANIMATION
  // ============================================
  function animateEntrance() {
    if (reducedMotion) {
      showAllElements();
      highlightPrediction(currentPrediction);
      return;
    }

    const { timing } = CONFIG;
    
    // Fade in input grid
    inputCells.forEach((cell, i) => {
      cell.element.style.opacity = '0';
      setTimeout(() => {
        cell.element.style.transition = 'opacity 0.3s ease';
        cell.element.style.opacity = cell.intensity > 0 ? cell.intensity : '0.03';
      }, timing.initialDelay + i * 5);
    });
    
    // Animate nodes layer by layer
    nodes.forEach((layerNodes, layerIdx) => {
      layerNodes.forEach((node, nodeIdx) => {
        node.element.style.opacity = '0';
        node.element.style.transform = 'scale(0)';
        
        const delay = timing.initialDelay + 300 + 
                      layerIdx * timing.layerStagger + 
                      nodeIdx * timing.nodeStagger;
        
        setTimeout(() => {
          node.element.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          node.element.style.opacity = '1';
          node.element.style.transform = 'scale(1)';
        }, delay);
      });
    });
    
    // Draw connections
    const totalNodeDelay = timing.initialDelay + 300 + 
                           nodes.length * timing.layerStagger + 
                           Math.max(...nodes.map(l => l.length)) * timing.nodeStagger;
    
    connections.forEach((layerConns, layerIdx) => {
      layerConns.forEach((conn, connIdx) => {
        conn.element.style.opacity = '0';
        
        setTimeout(() => {
          conn.element.style.transition = `opacity ${timing.connectionDraw}ms ease`;
          conn.element.style.opacity = '1';
        }, totalNodeDelay + layerIdx * 100 + connIdx * 2);
      });
    });
    
    // Show output labels
    outputLabels.forEach((label, i) => {
      label.style.opacity = '0';
      setTimeout(() => {
        label.style.transition = 'opacity 0.3s ease';
        label.style.opacity = '0.7';
      }, totalNodeDelay + connections.length * 100 + i * 50);
    });
    
    // Start signal flow after entrance
    setTimeout(() => {
      highlightPrediction(currentPrediction);
      startSignalFlow();
    }, totalNodeDelay + 1500);
  }

  function showAllElements() {
    inputCells.forEach(cell => {
      cell.element.style.opacity = cell.intensity > 0 ? cell.intensity : '0.03';
    });
    nodes.forEach(layer => layer.forEach(n => n.element.style.opacity = '1'));
    connections.forEach(layer => layer.forEach(c => c.element.style.opacity = '1'));
    outputLabels.forEach(l => l.style.opacity = '0.7');
  }

  // ============================================
  // SIGNAL FLOW ANIMATION
  // ============================================
  function startSignalFlow() {
    if (reducedMotion) return;
    
    runSignalFlow();
    signalTimer = setInterval(runSignalFlow, CONFIG.timing.signalInterval);
  }

  function runSignalFlow() {
    const { timing, colors } = CONFIG;
    const signalGroup = svg.querySelector('.nn-signals-group');
    
    // Clear previous signals
    signalGroup.innerHTML = '';
    
    // Randomly select active nodes for this pass
    const activeNodes = nodes.map(layer => {
      const count = Math.ceil(layer.length * 0.5); // 50% active
      const shuffled = [...Array(layer.length).keys()].sort(() => Math.random() - 0.5);
      return new Set(shuffled.slice(0, count));
    });
    
    // Animate layer by layer
    nodes.forEach((layerNodes, layerIdx) => {
      setTimeout(() => {
        // Highlight active nodes in this layer
        layerNodes.forEach((node, nodeIdx) => {
          if (activeNodes[layerIdx].has(nodeIdx)) {
            node.element.style.transition = 'fill 0.2s ease, filter 0.2s ease';
            node.element.style.fill = colors.node.active;
            node.element.style.filter = 'url(#nn-glow)';
            
            // Reset after delay
            setTimeout(() => {
              node.element.style.fill = colors.node.fill;
              node.element.style.filter = 'none';
            }, 400);
          }
        });
        
        // Animate connections to next layer
        if (layerIdx < connections.length - 1) {
          const layerConns = connections[layerIdx + 1];
          layerConns.forEach(conn => {
            if (activeNodes[layerIdx].has(conn.from.index)) {
              animateConnectionSignal(conn, signalGroup);
            }
          });
        }
      }, layerIdx * 300);
    });
    
    // Highlight prediction at the end
    setTimeout(() => {
      highlightPrediction(currentPrediction);
    }, nodes.length * 300 + 200);
  }

  function animateConnectionSignal(conn, signalGroup) {
    const fromNode = nodes[conn.from.layer][conn.from.index];
    const toNode = nodes[conn.to.layer][conn.to.index];
    
    // Create signal dot
    const signal = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    signal.setAttribute('r', '3');
    signal.setAttribute('fill', CONFIG.colors.connection.signal);
    signal.setAttribute('filter', 'url(#nn-signal-glow)');
    signal.setAttribute('class', 'nn-signal');
    
    signalGroup.appendChild(signal);
    
    // Animate along connection
    const duration = 250;
    const startTime = performance.now();
    
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const x = fromNode.x + (toNode.x - fromNode.x) * eased;
      const y = fromNode.y + (toNode.y - fromNode.y) * eased;
      
      signal.setAttribute('cx', x);
      signal.setAttribute('cy', y);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        signal.remove();
      }
    }
    
    requestAnimationFrame(animate);
    
    // Briefly highlight the connection
    conn.element.style.transition = 'stroke 0.1s ease, stroke-width 0.1s ease';
    conn.element.style.stroke = CONFIG.colors.connection.positive;
    conn.element.style.strokeWidth = '1.5';
    
    setTimeout(() => {
      conn.element.style.stroke = CONFIG.colors.connection.default;
      conn.element.style.strokeWidth = '0.8';
    }, 200);
  }

  // ============================================
  // PREDICTION HIGHLIGHT
  // ============================================
  function highlightPrediction(digit) {
    const { colors, timing } = CONFIG;
    const lastLayer = nodes[nodes.length - 1];
    
    lastLayer.forEach((node, i) => {
      const isActive = i === digit;
      
      node.element.style.transition = `fill ${timing.predictionHighlight}ms ease, 
                                        stroke ${timing.predictionHighlight}ms ease, 
                                        filter ${timing.predictionHighlight}ms ease`;
      
      if (isActive) {
        node.element.style.fill = colors.output.prediction;
        node.element.style.stroke = colors.output.prediction;
        node.element.style.filter = 'url(#nn-glow)';
        outputLabels[i].style.fill = colors.output.prediction;
        outputLabels[i].style.fontWeight = 'bold';
      } else {
        node.element.style.fill = colors.node.fill;
        node.element.style.stroke = colors.node.stroke;
        node.element.style.filter = 'none';
        outputLabels[i].style.fill = colors.output.text;
        outputLabels[i].style.fontWeight = 'normal';
      }
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================
  function setPrediction(digit) {
    if (digit >= 0 && digit <= 9) {
      currentPrediction = digit;
      updateInputPattern(digit);
      highlightPrediction(digit);
    }
  }

  function updateInputPattern(digit) {
    const pattern = generateDigitPattern(digit);
    const { inputGrid } = CONFIG;
    
    inputCells.forEach(cell => {
      const intensity = pattern[cell.row][cell.col];
      cell.intensity = intensity;
      cell.element.style.transition = 'fill-opacity 0.3s ease';
      cell.element.setAttribute('fill-opacity', intensity > 0 ? intensity : 0.03);
    });
  }

  function stop() {
    if (signalTimer) {
      clearInterval(signalTimer);
      signalTimer = null;
    }
  }

  function cyclePredictions() {
    let digit = 0;
    setPrediction(digit);
    
    setInterval(() => {
      digit = (digit + 1) % 10;
      setPrediction(digit);
    }, 5000);
  }

  // ============================================
  // EXPOSE & INIT
  // ============================================
  window.NeuralBanner = {
    init,
    stop,
    setPrediction,
    cyclePredictions,
    runSignalFlow
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
