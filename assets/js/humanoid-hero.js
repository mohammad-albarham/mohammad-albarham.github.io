/**
 * Humanoid hero — a real-time 3D humanoid robot rendered with a small,
 * self-contained WebGL renderer written for this page.
 *
 * No external 3D library and no network fetch: the geometry is generated
 * procedurally at load time from two primitives (an exact rounded box and a
 * profile lathe), shaded by a single studio-lit program, and drawn over the
 * hero's own gradient on a transparent canvas.
 *
 * Budget notes, since this sits in the LCP viewport:
 *   - Procedural geometry, batched by joint and material.
 *   - Device pixel ratio is capped at 2.
 *   - Renders only while interaction is settling, on screen, in a visible tab.
 *   - Reduced motion disables pointer tracking and makes rotation immediate.
 */
(function () {
  'use strict';

  var STAGE_SELECTOR = '.humanoid-stage';

  /* ------------------------------------------------------------------ math */

  function m4() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  function m4mul(a, b, out) {
    // out = a * b (column-major, so `b` is applied first)
    var o = out || m4();
    for (var c = 0; c < 4; c++) {
      var b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4]     = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  }

  function m4perspective(fovY, aspect, near, far) {
    var f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far), o = m4();
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf;
    o[11] = -1; o[14] = 2 * far * near * nf; o[15] = 0;
    return o;
  }

  function normalize3(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  function cross3(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  function m4lookAt(eye, target, up) {
    var z = normalize3([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    var x = normalize3(cross3(up, z));
    var y = cross3(z, x);
    var o = m4();
    o[0] = x[0]; o[4] = x[1]; o[8]  = x[2];
    o[1] = y[0]; o[5] = y[1]; o[9]  = y[2];
    o[2] = z[0]; o[6] = z[1]; o[10] = z[2];
    o[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
    o[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
    o[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
    return o;
  }

  /** Translate * Rz * Ry * Rx * Scale, written straight into `out`. */
  function m4compose(t, r, s, out) {
    var o = out || m4();
    var cx = Math.cos(r[0]), sx = Math.sin(r[0]);
    var cy = Math.cos(r[1]), sy = Math.sin(r[1]);
    var cz = Math.cos(r[2]), sz = Math.sin(r[2]);
    var sX = s ? s[0] : 1, sY = s ? s[1] : 1, sZ = s ? s[2] : 1;
    o[0] = (cy * cz) * sX;
    o[1] = (cy * sz) * sX;
    o[2] = (-sy) * sX;
    o[3] = 0;
    o[4] = (sx * sy * cz - cx * sz) * sY;
    o[5] = (sx * sy * sz + cx * cz) * sY;
    o[6] = (sx * cy) * sY;
    o[7] = 0;
    o[8]  = (cx * sy * cz + sx * sz) * sZ;
    o[9]  = (cx * sy * sz - sx * cz) * sZ;
    o[10] = (cx * cy) * sZ;
    o[11] = 0;
    o[12] = t[0]; o[13] = t[1]; o[14] = t[2]; o[15] = 1;
    return o;
  }

  /** Inverse-transpose of the upper-left 3x3, for transforming normals. */
  function m3normal(m, out) {
    var o = out || new Float32Array(9);
    var a = m[0], b = m[1], c = m[2],
        d = m[4], e = m[5], f = m[6],
        g = m[8], h = m[9], i = m[10];
    var A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
    var det = a * A + b * B + c * C;
    if (!det) { o[0] = a; o[1] = b; o[2] = c; o[3] = d; o[4] = e; o[5] = f; o[6] = g; o[7] = h; o[8] = i; return o; }
    var id = 1 / det;
    // transpose(inverse(M)) — the cofactor matrix scaled by 1/det
    o[0] = A * id;                 o[1] = B * id;                 o[2] = C * id;
    o[3] = (c * h - b * i) * id;   o[4] = (a * i - c * g) * id;   o[5] = (b * g - a * h) * id;
    o[6] = (b * f - c * e) * id;   o[7] = (c * d - a * f) * id;   o[8] = (a * e - b * d) * id;
    return o;
  }

  /* -------------------------------------------------------------- geometry */

  function geo() { return { pos: [], nor: [], idx: [] }; }

  /**
   * Exact rounded box: the Minkowski sum of a box and a sphere of radius `r`.
   * Parameterised by the surface normal, with the quadrant/hemisphere signs
   * carried explicitly so the flat faces stay flat and the edges stay crisp.
   */
  function roundedBox(w, h, d, r, seg) {
    seg = Math.max(seg, 5);
    var a = Math.max(w / 2 - r, 0), b = Math.max(h / 2 - r, 0), c = Math.max(d / 2 - r, 0);
    var g = geo(), rows = [], cols = [], i, q;

    for (i = 0; i <= seg; i++) rows.push([(i / seg) * Math.PI / 2, 1]);
    for (i = 0; i <= seg; i++) rows.push([Math.PI / 2 + (i / seg) * Math.PI / 2, -1]);
    for (q = 0; q < 4; q++) {
      var sx = [1, -1, -1, 1][q], sz = [1, 1, -1, -1][q];
      for (i = 0; i <= seg; i++) cols.push([q * Math.PI / 2 + (i / seg) * Math.PI / 2, sx, sz]);
    }
    cols.push([Math.PI * 2, 1, 1]);

    for (var ri = 0; ri < rows.length; ri++) {
      var phi = rows[ri][0], sy = rows[ri][1];
      var sp = Math.sin(phi), cp = Math.cos(phi);
      for (var ci = 0; ci < cols.length; ci++) {
        var th = cols[ci][0];
        var nx = sp * Math.cos(th), ny = cp, nz = sp * Math.sin(th);
        g.nor.push(nx, ny, nz);
        g.pos.push(a * cols[ci][1] + r * nx, b * sy + r * ny, c * cols[ci][2] + r * nz);
      }
    }

    var stride = cols.length;
    for (var y = 0; y < rows.length - 1; y++) {
      for (var x = 0; x < stride - 1; x++) {
        var p0 = y * stride + x, p1 = p0 + 1, p2 = p0 + stride, p3 = p2 + 1;
        g.idx.push(p0, p1, p2, p1, p3, p2);
      }
    }
    // Close the flat top and bottom between the four rounded corners.
    [0, rows.length - 1].forEach(function (row) {
      var center = g.pos.length / 3, sign = row === 0 ? 1 : -1;
      g.pos.push(0, sign * (b + r), 0);
      g.nor.push(0, sign, 0);
      for (var x = 0; x < stride - 1; x++) {
        var v = row * stride + x;
        if (sign > 0) g.idx.push(center, v + 1, v);
        else g.idx.push(center, v, v + 1);
      }
    });
    return g;
  }

  function sphere(r, seg) { return roundedBox(0, 0, 0, r, seg); }

  /**
   * Revolve a 2D profile of [y, radius] pairs around Y. Adjacent segments
   * share a smoothed normal unless they meet at a hard angle, which keeps
   * limb tapers soft while end caps and collars stay crisp.
   */
  function lathe(profile, seg) {
    var g = geo(), segs = [], i;
    for (i = 0; i < profile.length - 1; i++) {
      var dy = profile[i + 1][0] - profile[i][0];
      var dr = profile[i + 1][1] - profile[i][1];
      var l = Math.sqrt(dy * dy + dr * dr) || 1;
      segs.push([dy / l, -dr / l]);          // profile-space normal
    }

    function ringNormalAt(si, side) {
      var n = segs[si], other = side < 0 ? segs[si - 1] : segs[si + 1];
      if (other && n[0] * other[0] + n[1] * other[1] > 0.55) {
        var x = n[0] + other[0], y = n[1] + other[1];
        var l = Math.sqrt(x * x + y * y) || 1;
        return [x / l, y / l];
      }
      return n;
    }

    var base = 0;
    for (i = 0; i < segs.length; i++) {
      var na = ringNormalAt(i, -1), nb = ringNormalAt(i, 1);
      var ends = [[profile[i], na], [profile[i + 1], nb]];
      for (var e = 0; e < 2; e++) {
        var py = ends[e][0][0], pr = ends[e][0][1], pn = ends[e][1];
        for (var k = 0; k <= seg; k++) {
          var t = (k / seg) * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
          g.pos.push(pr * ct, py, pr * st);
          if (pr === 0 && Math.abs(pn[0]) < 1e-6) g.nor.push(0, pn[1] > 0 ? 1 : -1, 0);
          else g.nor.push(pn[0] * ct, pn[1], pn[0] * st);
        }
      }
      for (var x2 = 0; x2 < seg; x2++) {
        var q0 = base + x2, q1 = q0 + 1, q2 = q0 + seg + 1, q3 = q2 + 1;
        g.idx.push(q0, q2, q1, q1, q2, q3);
      }
      base += 2 * (seg + 1);
    }
    return g;
  }

  /** Bake a translate/rotate/scale into a geometry's vertices. */
  function place(g, t, r, s) {
    var m = m4compose(t || [0, 0, 0], r || [0, 0, 0], s || [1, 1, 1]);
    var nm = m3normal(m);
    for (var i = 0; i < g.pos.length; i += 3) {
      var x = g.pos[i], y = g.pos[i + 1], z = g.pos[i + 2];
      g.pos[i]     = m[0] * x + m[4] * y + m[8]  * z + m[12];
      g.pos[i + 1] = m[1] * x + m[5] * y + m[9]  * z + m[13];
      g.pos[i + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      var a = g.nor[i], b = g.nor[i + 1], c = g.nor[i + 2];
      var nx = nm[0] * a + nm[3] * b + nm[6] * c;
      var ny = nm[1] * a + nm[4] * b + nm[7] * c;
      var nz = nm[2] * a + nm[5] * b + nm[8] * c;
      var l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      g.nor[i] = nx / l; g.nor[i + 1] = ny / l; g.nor[i + 2] = nz / l;
    }
    return g;
  }

  function merge(list) {
    var out = geo();
    for (var i = 0; i < list.length; i++) {
      var g = list[i], off = out.pos.length / 3, j;
      for (j = 0; j < g.pos.length; j++) { out.pos.push(g.pos[j]); out.nor.push(g.nor[j]); }
      for (j = 0; j < g.idx.length; j++) out.idx.push(g.idx[j] + off);
    }
    return out;
  }

  /* ------------------------------------------------------------- materials */

  function srgb(r, g, b) {
    return [Math.pow(r, 2.2), Math.pow(g, 2.2), Math.pow(b, 2.2)];
  }

  var MATERIALS = {
    // Satin ivory shell — the figure's main surface.
    shell:  { albedo: srgb(0.905, 0.893, 0.862), rough: 0.34, spec: 0.85, emissive: [0, 0, 0] },
    // Brushed aluminium for structural plates and the pelvis girdle.
    alloy:  { albedo: srgb(0.575, 0.605, 0.645), rough: 0.22, spec: 1.15, emissive: [0, 0, 0] },
    // Graphite for every joint, the neck column and the soft abdomen.
    joint:  { albedo: srgb(0.135, 0.145, 0.165), rough: 0.46, spec: 0.55, emissive: [0, 0, 0] },
    // Dark glass visor, near-black but very sharp.
    visor:  { albedo: srgb(0.045, 0.055, 0.075), rough: 0.07, spec: 1.6, emissive: [0.004, 0.012, 0.020] },
    // The page's own blue, used sparingly and only where light would be.
    accent: { albedo: srgb(0.055, 0.24, 0.36),  rough: 0.30, spec: 0.9, emissive: [0.045, 0.42, 0.66] }
  };

  /* ----------------------------------------------------------------- rig */

  /**
   * Skeleton heights, in figure units with the soles at y = 0 and the crown at
   * y = 1.52. Proportions follow a ~7.3-head canon: hip joints at 0.56 of the
   * total height, shoulders at 0.83, chin at 0.86.
   */
  var HIP_Y = 0.940, SHOULDER_Y = 1.285;
  var SHOULDER_X = 0.198;

  function buildFigure() {
    var nodes = {};
    function node(name, parent, t) {
      var n = { name: name, parent: parent ? nodes[parent] : null, t: t.slice(),
                r: [0, 0, 0], base: t.slice(), parts: {}, world: m4(), local: m4() };
      nodes[name] = n;
      return n;
    }
    function add(name, material, g) {
      var p = nodes[name].parts;
      (p[material] || (p[material] = [])).push(g);
    }

    node('root', null, [0, 0, 0]);
    node('hips', 'root', [0, HIP_Y, 0]);
    node('spine', 'hips', [0, 0.14, 0]);
    node('chest', 'spine', [0, 0.16, 0]);
    node('neck', 'chest', [0, 0.14, -0.006]);
    node('head', 'neck', [0, 0.083, 0.004]);

    /* ---- pelvis + abdomen ---- */
    add('hips', 'alloy', place(roundedBox(0.298, 0.155, 0.196, 0.066, 4), [0, 0.008, 0]));
    add('hips', 'joint', place(roundedBox(0.256, 0.09, 0.176, 0.045, 3), [0, -0.072, 0]));
    // Hip actuator caps, left and right.
    [-1, 1].forEach(function (s) {
      add('hips', 'joint', place(lathe([[-0.030, 0], [-0.030, 0.052], [0.014, 0.060], [0.030, 0.050], [0.030, 0]], 18),
        [s * 0.108, -0.028, 0], [0, 0, s * Math.PI / 2]));
    });
    add('spine', 'joint', place(lathe([
      [-0.075, 0.048], [-0.060, 0.088], [-0.020, 0.098], [0.020, 0.098], [0.060, 0.086], [0.075, 0.050]
    ], 22), [0, 0, 0], [0, 0, 0], [1, 1, 0.82]));
    // Three graphite ribs give the waist a mechanical read at silhouette scale.
    [-0.036, 0.006, 0.048].forEach(function (y, i) {
      add('spine', 'alloy', place(lathe([[-0.008, 0.086], [0, 0.100], [0.008, 0.086]], 22),
        [0, y, 0], [0, 0, 0], [1, 1, 0.84 - i * 0.005]));
    });

    /* ---- chest ---- */
    add('chest', 'shell', place(roundedBox(0.352, 0.232, 0.208, 0.078, 4), [0, 0.012, 0.004]));
    // Pectoral plates, tilted inward so the torso reads as sculpted, not slab.
    [-1, 1].forEach(function (s) {
      add('chest', 'shell', place(roundedBox(0.140, 0.132, 0.070, 0.032, 3),
        [s * 0.083, 0.030, 0.086], [0.12, s * -0.30, s * 0.10]));
    });
    // Clavicle yoke over the top of the chest.
    add('chest', 'alloy', place(roundedBox(0.300, 0.052, 0.150, 0.026, 3), [0, 0.118, 0.006], [-0.10, 0, 0]));
    // Back plate.
    add('chest', 'alloy', place(roundedBox(0.230, 0.180, 0.040, 0.020, 3), [0, 0.010, -0.104], [0.06, 0, 0]));
    // Sternum core: graphite bezel, thin alloy ring, small blue lamp.
    add('chest', 'joint', place(lathe([[-0.016, 0], [-0.016, 0.050], [0.006, 0.052], [0.016, 0.040], [0.016, 0]], 24),
      [0, 0.026, 0.098], [Math.PI / 2, 0, 0]));
    add('chest', 'accent', place(lathe([[-0.004, 0], [0.004, 0.026], [0.006, 0.024], [0.006, 0]], 24),
      [0, 0.026, 0.123], [Math.PI / 2, 0, 0]));

    /* ---- neck + head ---- */
    add('neck', 'joint', place(lathe([
      [-0.040, 0.040], [-0.020, 0.049], [0.010, 0.050], [0.030, 0.045], [0.042, 0.040]
    ], 20)));
    [-0.020, 0.010].forEach(function (y) {
      add('neck', 'alloy', place(lathe([[-0.005, 0.048], [0, 0.055], [0.005, 0.048]], 20), [0, y, 0]));
    });
    add('head', 'shell', place(roundedBox(0.158, 0.180, 0.184, 0.062, 5), [0, 0.010, -0.004]));
    // Brow ridge and jaw shell frame the visor.
    add('head', 'alloy', place(roundedBox(0.150, 0.030, 0.150, 0.014, 3), [0, 0.062, 0.010], [0.22, 0, 0]));
    add('head', 'joint', place(roundedBox(0.118, 0.062, 0.130, 0.030, 3), [0, -0.072, 0.006], [0.10, 0, 0]));
    // Visor: dark glass wrapping the front of the skull.
    add('head', 'visor', place(roundedBox(0.146, 0.078, 0.150, 0.034, 4), [0, 0.006, 0.020]));
    // A single restrained light bar behind the glass.
    add('head', 'accent', place(roundedBox(0.086, 0.008, 0.010, 0.004, 2), [0, 0.010, 0.098]));
    // Ear actuators.
    [-1, 1].forEach(function (s) {
      add('head', 'joint', place(lathe([[-0.014, 0], [-0.014, 0.030], [0.008, 0.032], [0.014, 0.026], [0.014, 0]], 18),
        [s * 0.080, 0.000, -0.006], [0, 0, s * Math.PI / 2]));
      add('head', 'accent', place(lathe([[-0.002, 0.016], [0.002, 0.020], [0.003, 0.016]], 16),
        [s * 0.089, 0.000, -0.006], [0, 0, s * Math.PI / 2]));
    });

    /* ---- arms ---- */
    [-1, 1].forEach(function (s) {
      var side = s < 0 ? 'L' : 'R';
      node('shoulder' + side, 'chest', [s * SHOULDER_X, SHOULDER_Y - 1.20, 0]);
      node('elbow' + side, 'shoulder' + side, [0, -0.272, 0]);
      node('wrist' + side, 'elbow' + side, [0, -0.246, 0]);

      add('shoulder' + side, 'joint', place(sphere(0.070, 4)));
      add('shoulder' + side, 'shell', place(roundedBox(0.116, 0.128, 0.140, 0.052, 4),
        [s * 0.020, 0.006, 0], [0, 0, s * -0.16]));
      // Upper arm: tapered, with a graphite band above the elbow.
      add('shoulder' + side, 'shell', place(lathe([
        [-0.250, 0.038], [-0.230, 0.044], [-0.150, 0.049], [-0.060, 0.055], [-0.010, 0.054], [0.010, 0.046]
      ], 20), [0, 0, 0], [0, 0, 0], [1, 1, 0.92]));
      add('shoulder' + side, 'joint', place(lathe([[-0.268, 0.036], [-0.256, 0.042], [-0.244, 0.036]], 18)));

      add('elbow' + side, 'joint', place(sphere(0.048, 4)));
      add('elbow' + side, 'alloy', place(roundedBox(0.030, 0.056, 0.076, 0.012, 3), [s * 0.036, -0.004, -0.012]));
      // Forearm, slightly wider across the front than the side.
      add('elbow' + side, 'shell', place(lathe([
        [-0.228, 0.032], [-0.212, 0.038], [-0.140, 0.042], [-0.060, 0.050], [-0.012, 0.048], [0.008, 0.040]
      ], 20), [0, 0, 0], [0, 0, 0], [0.94, 1, 1.06]));
      add('elbow' + side, 'joint', place(lathe([[-0.246, 0.028], [-0.234, 0.034], [-0.222, 0.028]], 18)));

      // Hand: palm, four fingers with a slight curl, and an opposed thumb.
      add('wrist' + side, 'joint', place(sphere(0.031, 3)));
      add('wrist' + side, 'shell', place(roundedBox(0.062, 0.078, 0.032, 0.014, 3), [0, -0.062, 0.002]));
      for (var f = 0; f < 4; f++) {
        add('wrist' + side, 'shell', place(roundedBox(0.014, 0.062, 0.016, 0.007, 2),
          [(f - 1.5) * 0.0165, -0.126, 0.006 + Math.abs(f - 1.5) * 0.002],
          [0.30 + Math.abs(f - 1.5) * 0.06, 0, 0]));
      }
      add('wrist' + side, 'shell', place(roundedBox(0.016, 0.050, 0.018, 0.008, 2),
        [s * -0.034, -0.082, 0.012], [0.35, 0, s * 0.55]));
    });

    /* ---- legs ---- */
    [-1, 1].forEach(function (s) {
      var side = s < 0 ? 'L' : 'R';
      node('hip' + side, 'hips', [s * 0.092, -0.048, 0]);
      node('knee' + side, 'hip' + side, [0, -0.412, 0]);
      node('ankle' + side, 'knee' + side, [0, -0.392, 0]);

      add('hip' + side, 'shell', place(lathe([
        [-0.380, 0.056], [-0.350, 0.064], [-0.230, 0.074], [-0.090, 0.086], [-0.020, 0.088], [0.020, 0.078]
      ], 22), [0, 0, 0], [0, 0, 0], [1, 1, 0.94]));
      add('hip' + side, 'joint', place(lathe([[-0.404, 0.052], [-0.390, 0.058], [-0.376, 0.052]], 20)));
      add('knee' + side, 'joint', place(sphere(0.060, 4)));
      // Kneecap shell over the graphite joint.
      add('knee' + side, 'shell', place(roundedBox(0.078, 0.096, 0.040, 0.018, 3), [0, -0.004, 0.046], [0.06, 0, 0]));
      add('knee' + side, 'shell', place(lathe([
        [-0.352, 0.040], [-0.330, 0.046], [-0.220, 0.050], [-0.110, 0.062], [-0.030, 0.064], [0.010, 0.056]
      ], 22), [0, 0, 0], [0, 0, 0], [0.96, 1, 1.04]));
      // Calf plate.
      add('knee' + side, 'alloy', place(roundedBox(0.062, 0.150, 0.030, 0.014, 3), [0, -0.130, -0.048], [-0.08, 0, 0]));
      add('knee' + side, 'joint', place(lathe([[-0.376, 0.036], [-0.362, 0.042], [-0.348, 0.036]], 20)));

      add('ankle' + side, 'joint', place(sphere(0.040, 4)));
      add('ankle' + side, 'shell', place(roundedBox(0.098, 0.056, 0.232, 0.024, 3), [0, -0.052, 0.044]));
      add('ankle' + side, 'joint', place(roundedBox(0.086, 0.024, 0.210, 0.010, 2), [0, -0.078, 0.046]));
    });

    /* ---- resting pose: a relaxed A-stance with a little asymmetry ---- */
    nodes.shoulderL.r = [-0.06, 0, 0.115];
    nodes.shoulderR.r = [-0.03, 0, -0.145];
    nodes.elbowL.r = [-0.20, 0, 0.05];
    nodes.elbowR.r = [-0.30, 0, -0.04];
    nodes.wristL.r = [0.05, 0, 0.04];
    nodes.wristR.r = [0.08, 0, -0.05];
    nodes.hipL.r = [0.03, 0, 0.030];
    nodes.hipR.r = [-0.05, 0, -0.045];
    nodes.kneeL.r = [-0.04, 0, -0.010];
    nodes.kneeR.r = [0.06, 0, 0.015];
    nodes.ankleL.r = [0.01, -0.10, 0];
    nodes.ankleR.r = [-0.01, 0.14, 0];
    nodes.hips.r = [0, 0.05, 0.012];
    nodes.chest.r = [0.02, -0.05, -0.012];
    nodes.head.r = [-0.02, 0.06, 0];

    // Shoulder nodes were declared in chest space with a placeholder Y; fix it
    // up now that the chest's own offset is known.
    nodes.shoulderL.t[1] = nodes.shoulderR.t[1] = SHOULDER_Y - (HIP_Y + 0.14 + 0.16);
    nodes.shoulderL.base = nodes.shoulderL.t.slice();
    nodes.shoulderR.base = nodes.shoulderR.t.slice();

    return nodes;
  }

  /* --------------------------------------------------------------- shaders */

  var PRECISION = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif'
  ].join('\n');

  var FIGURE_VS = [
    'attribute vec3 aPos;',
    'attribute vec3 aNor;',
    'uniform mat4 uProj, uView, uModel;',
    'uniform mat3 uNorMat;',
    'varying vec3 vN, vW;',
    'void main(){',
    '  vec4 w = uModel * vec4(aPos, 1.0);',
    '  vW = w.xyz;',
    '  vN = uNorMat * aNor;',
    '  gl_Position = uProj * uView * w;',
    '}'
  ].join('\n');

  // Three-point studio rig baked into the shader: a warm key from the upper
  // front left, a cool fill from the right, and a blue back rim that separates
  // the ivory shell from the dark hero gradient.
  var FIGURE_FS = [
    PRECISION,
    'varying vec3 vN, vW;',
    'uniform vec3 uEye, uAlbedo, uEmissive;',
    'uniform float uRough, uSpec;',
    'const vec3 KEY_DIR  = vec3(-0.46,  0.72,  0.52);',
    'const vec3 KEY_COL  = vec3(1.00,  0.965, 0.905) * 1.08;',
    'const vec3 FILL_DIR = vec3( 0.82,  0.16,  0.46);',
    'const vec3 FILL_COL = vec3(0.42,  0.55,  0.74) * 0.55;',
    'const vec3 RIM_DIR  = vec3( 0.18,  0.42, -0.88);',
    'const vec3 RIM_COL  = vec3(0.26,  0.62,  0.95) * 1.05;',
    'const vec3 SKY = vec3(0.115, 0.165, 0.235);',
    'const vec3 GND = vec3(0.022, 0.032, 0.048);',
    'vec3 lobe(vec3 n, vec3 v, vec3 dir, vec3 col, float shin, float spec){',
    '  vec3 l = normalize(dir);',
    '  float nl = max(dot(n, l), 0.0);',
    '  float sp = pow(max(dot(n, normalize(l + v)), 0.0), shin) * spec;',
    '  return col * (nl + sp * nl);',
    '}',
    'void main(){',
    '  vec3 n = normalize(vN);',
    '  vec3 v = normalize(uEye - vW);',
    '  if (!gl_FrontFacing) n = -n;',
    '  float shin = mix(180.0, 6.0, uRough);',
    '  vec3 light = mix(GND, SKY, n.y * 0.5 + 0.5);',
    '  light += lobe(n, v, KEY_DIR, KEY_COL, shin, uSpec);',
    '  light += lobe(n, v, FILL_DIR, FILL_COL, shin * 0.35, uSpec * 0.45);',
    '  light += lobe(n, v, RIM_DIR, RIM_COL, shin * 0.6, uSpec * 0.7);',
    '  vec3 c = uAlbedo * light + uEmissive;',
    // A narrow Fresnel edge in the page's blue, so the silhouette reads.
    '  c += vec3(0.10, 0.34, 0.52) * pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.55;',
    '  gl_FragColor = vec4(pow(max(c, 0.0), vec3(0.4545)), 1.0);',
    '}'
  ].join('\n');

  var SHADOW_VS = [
    'attribute vec2 aPos;',
    'uniform mat4 uProj, uView;',
    'uniform vec3 uCenter;',
    'uniform vec2 uSize;',
    'varying vec2 vUv;',
    'void main(){',
    '  vUv = aPos;',
    '  vec3 w = uCenter + vec3(aPos.x * uSize.x, 0.0, aPos.y * uSize.y);',
    '  gl_Position = uProj * uView * vec4(w, 1.0);',
    '}'
  ].join('\n');

  var SHADOW_FS = [
    PRECISION,
    'varying vec2 vUv;',
    'uniform float uOpacity;',
    'uniform vec3 uColor;',
    'void main(){',
    '  float d = length(vUv);',
    '  float a = pow(max(1.0 - d, 0.0), 2.6) * uOpacity;',
    '  gl_FragColor = vec4(uColor, a);',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------------ init */

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('shader: ' + log);
    }
    return s;
  }

  function program(gl, vs, fs, attribs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    for (var i = 0; i < attribs.length; i++) gl.bindAttribLocation(p, i, attribs[i]);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    return p;
  }

  function uniforms(gl, p, names) {
    var u = {};
    for (var i = 0; i < names.length; i++) u[names[i]] = gl.getUniformLocation(p, names[i]);
    return u;
  }

  function start(stage) {
    var canvas = stage.querySelector('canvas');
    if (!canvas) return;

    var opts = { alpha: true, antialias: true, premultipliedAlpha: false,
                 depth: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false };
    var gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return;

    var figureProg, shadowProg;
    try {
      figureProg = program(gl, FIGURE_VS, FIGURE_FS, ['aPos', 'aNor']);
      shadowProg = program(gl, SHADOW_VS, SHADOW_FS, ['aPos']);
    } catch (e) {
      return;
    }

    var fu = uniforms(gl, figureProg, ['uProj', 'uView', 'uModel', 'uNorMat', 'uEye', 'uAlbedo', 'uEmissive', 'uRough', 'uSpec']);
    var su = uniforms(gl, shadowProg, ['uProj', 'uView', 'uCenter', 'uSize', 'uOpacity', 'uColor']);

    /* upload geometry, one buffer set per (node, material) pair */
    var nodes = buildFigure();
    var draws = [];
    var triangles = 0;
    Object.keys(nodes).forEach(function (name) {
      var node = nodes[name];
      Object.keys(node.parts).forEach(function (mat) {
        var g = merge(node.parts[mat]);
        var vb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.pos), gl.STATIC_DRAW);
        var nb = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nb);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.nor), gl.STATIC_DRAW);
        var ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.idx), gl.STATIC_DRAW);
        triangles += g.idx.length / 3;
        draws.push({ node: node, mat: MATERIALS[mat], vb: vb, nb: nb, ib: ib, count: g.idx.length });
      });
      node.parts = null;
    });

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    /* ---------------------------------------------------------- view state */

    var order = Object.keys(nodes).map(function (k) { return nodes[k]; });
    var proj = m4(), view = m4(), norMat = new Float32Array(9);
    var EYE = [0.10, 0.95, 3.40], TARGET = [0, 0.79, 0];

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var still = !!(reduceMotion && reduceMotion.matches);

    var view_ = { orbitYaw: 0, orbitPitch: 0, lookX: 0, lookY: 0 };
    var target = { orbitYaw: 0, orbitPitch: 0, lookX: 0, lookY: 0 };
    var width = 0, height = 0, dpr = 1;
    var running = false, onScreen = false, dirty = true, frame = 0, lost = false;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
      var cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (cw === width && ch === height) return false;
      width = canvas.width = cw;
      height = canvas.height = ch;
      gl.viewport(0, 0, width, height);
      // Pull the camera back on narrow, tall frames so the figure always fits.
      var aspect = w / h;
      var fit = Math.min(1, aspect / 0.82);
      proj = m4perspective(29 * Math.PI / 180, aspect, 0.1, 20);
      EYE[2] = 3.40 / Math.max(fit, 0.55);
      return true;
    }

    function draw(time) {
      if (lost) return;
      var breathe = 0, sway = 0;

      nodes.root.t[1] = nodes.root.base[1] + breathe * 0.004;
      nodes.root.r[1] = view_.orbitYaw + view_.lookX * 0.10 - 0.28;
      nodes.root.r[0] = view_.orbitPitch;
      nodes.chest.r[0] = 0.02 + breathe * 0.010;
      nodes.chest.r[1] = -0.05 + view_.lookX * 0.16;
      nodes.head.r[1] = 0.06 + view_.lookX * 0.34;
      nodes.head.r[0] = -0.02 - view_.lookY * 0.20;
      nodes.shoulderL.r[0] = -0.06 + sway * 0.018;
      nodes.shoulderR.r[0] = -0.03 - sway * 0.018;
      nodes.elbowL.r[0] = -0.20 - sway * 0.012;
      nodes.elbowR.r[0] = -0.30 + sway * 0.012;

      for (var i = 0; i < order.length; i++) {
        var n = order[i];
        m4compose(n.t, n.r, null, n.local);
        if (n.parent) m4mul(n.parent.world, n.local, n.world);
        else n.world.set(n.local);
      }

      view = m4lookAt(EYE, TARGET, [0, 1, 0]);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      /* ground contact shadow, drawn first without writing depth */
      gl.useProgram(shadowProg);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniformMatrix4fv(su.uProj, false, proj);
      gl.uniformMatrix4fv(su.uView, false, view);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(0);
      gl.disableVertexAttribArray(1);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.uniform3f(su.uCenter, 0, 0.001, 0.03);
      gl.uniform2f(su.uSize, 0.62, 0.44);
      gl.uniform3f(su.uColor, 0.004, 0.012, 0.024);
      gl.uniform1f(su.uOpacity, 0.72);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.uniform3f(su.uCenter, 0, 0.0015, 0.03);
      gl.uniform2f(su.uSize, 1.05, 0.72);
      gl.uniform1f(su.uOpacity, 0.34);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.depthMask(true);
      gl.disable(gl.BLEND);

      /* figure */
      gl.useProgram(figureProg);
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.uniformMatrix4fv(fu.uProj, false, proj);
      gl.uniformMatrix4fv(fu.uView, false, view);
      gl.uniform3fv(fu.uEye, EYE);
      var lastNode = null;
      for (var d = 0; d < draws.length; d++) {
        var dr = draws[d];
        if (dr.node !== lastNode) {
          lastNode = dr.node;
          gl.uniformMatrix4fv(fu.uModel, false, dr.node.world);
          gl.uniformMatrix3fv(fu.uNorMat, false, m3normal(dr.node.world, norMat));
        }
        gl.uniform3fv(fu.uAlbedo, dr.mat.albedo);
        gl.uniform3fv(fu.uEmissive, dr.mat.emissive);
        gl.uniform1f(fu.uRough, dr.mat.rough);
        gl.uniform1f(fu.uSpec, dr.mat.spec);
        gl.bindBuffer(gl.ARRAY_BUFFER, dr.vb);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, dr.nb);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, dr.ib);
        gl.drawElements(gl.TRIANGLES, dr.count, gl.UNSIGNED_SHORT, 0);
      }
    }

    function settle() {
      // Ease the interactive values toward their targets; report whether the
      // scene still needs another frame.
      var moved = false, keys = ['orbitYaw', 'orbitPitch', 'lookX', 'lookY'];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], d = target[k] - view_[k];
        if (Math.abs(d) > 0.0004) { view_[k] += d * (still ? 1 : 0.085); moved = true; }
        else if (d !== 0) { view_[k] = target[k]; moved = true; }
      }
      return moved;
    }

    function tick(time) {
      frame = 0;
      if (lost || !onScreen || document.hidden) { running = false; return; }
      var changed = resize();
      var moving = settle();
      if (changed || moving || dirty) {
        dirty = false;
        draw(time);
      }
      if (running && moving) frame = requestAnimationFrame(tick);
      else running = false;
    }

    function wake() {
      if (lost || running || !onScreen || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(tick);
    }

    function renderOnce() {
      if (lost || !onScreen || document.hidden) return;
      resize();
      draw(performance.now());
    }

    function sleep() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    /* ------------------------------------------------------- interaction */

    var hero = stage.closest ? stage.closest('#hero') : null;
    var dragging = false, lastX = 0, lastY = 0, pointerId = null;

    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

    function onPointerMove(e) {
      if (still || dragging || e.pointerType === 'touch') return;
      var host = hero || stage;
      var r = host.getBoundingClientRect();
      target.lookX = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
      target.lookY = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
      if (still) { view_.lookX = target.lookX; view_.lookY = target.lookY; renderOnce(); }
      else wake();
    }

    function onLeave() {
      target.lookX = target.lookY = 0;
      if (still) { view_.lookX = view_.lookY = 0; renderOnce(); } else wake();
    }

    if (hero && window.PointerEvent) {
      hero.addEventListener('pointermove', onPointerMove, { passive: true });
      hero.addEventListener('pointerleave', onLeave, { passive: true });
    }

    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || !e.isPrimary) return;
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX; lastY = e.clientY;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      stage.classList.add('is-grabbing');
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pointerId) return;
      target.orbitYaw = clamp(target.orbitYaw + (e.clientX - lastX) * 0.0072, -1.15, 1.15);
      target.orbitPitch = clamp(target.orbitPitch + (e.clientY - lastY) * 0.0025, -0.16, 0.20);
      lastX = e.clientX; lastY = e.clientY;
      if (still) { view_.orbitYaw = target.orbitYaw; view_.orbitPitch = target.orbitPitch; renderOnce(); }
      else wake();
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (canvas.releasePointerCapture && pointerId !== null) {
        try { canvas.releasePointerCapture(pointerId); } catch (err) { /* already released */ }
      }
      pointerId = null;
      stage.classList.remove('is-grabbing');
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    canvas.addEventListener('keydown', function (e) {
      var yaw = 0, pitch = 0, reset = false;
      switch (e.key) {
        case 'ArrowLeft':  yaw = -0.22; break;
        case 'ArrowRight': yaw = 0.22; break;
        case 'ArrowUp':    pitch = -0.06; break;
        case 'ArrowDown':  pitch = 0.06; break;
        case 'Home': case 'Escape': reset = true; break;
        default: return;
      }
      e.preventDefault();
      if (reset) { target.orbitYaw = 0; target.orbitPitch = 0; }
      else {
        target.orbitYaw = clamp(target.orbitYaw + yaw, -1.15, 1.15);
        target.orbitPitch = clamp(target.orbitPitch + pitch, -0.16, 0.20);
      }
      if (still) { view_.orbitYaw = target.orbitYaw; view_.orbitPitch = target.orbitPitch; renderOnce(); }
      else wake();
    });

    /* --------------------------------------------------- lifecycle + fit */

    if (reduceMotion) {
      var onPref = function () {
        still = reduceMotion.matches;
        if (still) { target.lookX = target.lookY = view_.lookX = view_.lookY = 0; settle(); }
        dirty = true;
        if (still) { sleep(); renderOnce(); } else wake();
      };
      if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onPref);
      else if (reduceMotion.addListener) reduceMotion.addListener(onPref);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) sleep();
      else { dirty = true; if (still) renderOnce(); else wake(); }
    });

    window.addEventListener('resize', function () {
      dirty = true;
      if (still) renderOnce(); else wake();
    }, { passive: true });

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        if (!onScreen) sleep();
        else if (still) renderOnce();
        else wake();
      }, { rootMargin: '0px' }).observe(canvas);
    } else {
      onScreen = true;
    }

    // First paint: size, draw, then reveal and drop the static fallback.
    onScreen = true;
    resize();
    if (!width) return;
    draw(performance.now());
    stage.classList.add('is-live');
    if (still) renderOnce(); else wake();

    stage.setAttribute('data-triangles', String(triangles));
    stage.querySelector('.humanoid-poster').setAttribute('aria-hidden', 'true');
    canvas.addEventListener('webglcontextlost', function () {
      lost = true;
      sleep();
      stage.classList.remove('is-live');
      stage.querySelector('.humanoid-poster').removeAttribute('aria-hidden');
      // Keep the static render for this visit; do not repeatedly recreate a
      // context on devices whose GPU is under memory pressure.
    });
  }

  function boot() {
    var stages = document.querySelectorAll(STAGE_SELECTOR);
    for (var i = 0; i < stages.length; i++) {
      try { start(stages[i]); } catch (e) { /* leave the static fallback in place */ }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

