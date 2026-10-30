/* ============================================================
   SAPHIRA: BOUND & BLADE — procedural pixel art library
   Every sprite, tile, prop, portrait and backdrop is drawn here.
   ============================================================ */
const Art = (() => {
  const T = 24;

  /* ---------- deterministic noise ---------- */
  function hash(x, y, s = 0) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  function pick(arr, r) { return arr[Math.floor(r * arr.length) % arr.length]; }

  /* ---------- drawing helpers ---------- */
  function rect(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }
  function poly(ctx, pts, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  }
  function ellipse(ctx, x, y, rx, ry, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function shadow(ctx, x, y, rx, ry, alpha = 0.28) {
    ellipse(ctx, 0, 0, rx, ry, `rgba(2,7,10,${alpha})`);
  }

  /* ============================================================
     TILES (baked into the world cache)
     ============================================================ */
  function drawTile(ctx, type, tx, ty, kind) {
    const x = tx * T;
    const y = ty * T;
    const r = hash(tx, ty, kind === 'prison' ? 91 : 17);

    if (kind === 'prison') {
      if (type === 5) { drawPrisonWall(ctx, x, y, tx, ty); return; }
      if (type === 7) { drawPrisonFloor(ctx, x, y, tx, ty, true); drawBars(ctx, x, y); return; }
      if (type === 8) { drawPrisonFloor(ctx, x, y, tx, ty); drawStairs(ctx, x, y); return; }
      drawPrisonFloor(ctx, x, y, tx, ty);
      return;
    }

    if (type === 4) {
      rect(ctx, x, y, T, T, '#346f8d');
      rect(ctx, x, y + 4, T, 3, '#3f809d');
      rect(ctx, x, y + 14, T, 2, '#2c607b');
      if (r > 0.55) rect(ctx, x + 4, y + 8, 7, 1, '#63a8c2');
      if (r > 0.8) rect(ctx, x + 14, y + 18, 5, 1, '#75b6cc');
      return;
    }
    if (type === 1) {
      rect(ctx, x, y, T, T, '#a98a5f');
      rect(ctx, x + ((hash(tx, ty, 3) * 10) | 0), y + 5, 3, 2, '#8f6e49');
      rect(ctx, x + 6, y + 15, 4, 2, '#c1a274');
      rect(ctx, x + 15, y + 9, 2, 2, '#86643f');
      if (r > 0.6) rect(ctx, x + 11, y + 20, 5, 1, '#94734e');
      rect(ctx, x, y, T, 1, 'rgba(255,235,190,0.04)');
      return;
    }
    if (type === 2) { // tree floor
      rect(ctx, x, y, T, T, '#2f6b3d');
      if (r > 0.6) rect(ctx, x + 4, y + 12, 6, 1, '#3e7d49');
      return;
    }
    if (type === 3) { // rock floor
      rect(ctx, x, y, T, T, r > 0.5 ? '#3f7e49' : '#397742');
      if (r > 0.5) rect(ctx, x + 3, y + 4, 5, 1, '#4c8c54');
      return;
    }

    // grass
    const bg = r > 0.5 ? '#3a7844' : r > 0.2 ? '#3f7e49' : '#437f4a';
    rect(ctx, x, y, T, T, bg);
    if (r > 0.55) rect(ctx, x + 2 + ((r * 11) | 0), y + 5, 1, 3, '#54945a');
    if (r > 0.75) rect(ctx, x + 14, y + 15, 1, 4, '#325f38');
    if (r > 0.9) {
      rect(ctx, x + 7, y + 18, 3, 1, '#2f6139');
      rect(ctx, x + 8, y + 17, 1, 3, '#2f6139');
    }
    if (r > 0.86 && r < 0.93) {
      rect(ctx, x + 17, y + 5, 2, 2, '#e0cf7a');
      rect(ctx, x + 19, y + 6, 1, 2, '#6e9c52');
    }
  }

  function drawPrisonFloor(ctx, x, y, tx, ty, underBars) {
    const r = hash(tx, ty, 44);
    const base = r > 0.55 ? '#343b4a' : r > 0.25 ? '#303746' : '#2c3341';
    rect(ctx, x, y, T, T, base);
    rect(ctx, x, y, T, 1, '#3d4658');
    rect(ctx, x, y + T - 1, 1, 1, '#232934');
    rect(ctx, x, y, 1, T, '#3a4253');
    if (r > 0.62) {
      rect(ctx, x + 8, y + 13, 7, 1, '#262c38');
      rect(ctx, x + 11, y + 14, 1, 4, '#262c38');
    }
    if (r > 0.82) {
      rect(ctx, x + 17, y + 5, 4, 1, '#454d5f');
      rect(ctx, x + 5, y + 18, 2, 2, '#3c4454');
    }
    if (r > 0.93) rect(ctx, x + 13, y + 8, 2, 2, '#556030');
    if (underBars) rect(ctx, x, y, T, 2, '#252b36');
  }

  function drawPrisonWall(ctx, x, y, tx, ty) {
    const r = hash(tx, ty, 77);
    rect(ctx, x, y, T, T, '#232935');
    rect(ctx, x, y, T, 2, '#363f50');
    // brick courses
    const offset = (ty % 2) * 12;
    for (let row = 0; row < 3; row++) {
      rect(ctx, x, y + row * 8 + 2, T, 1, '#1a1f29');
      rect(ctx, x + ((offset + row * 5) % 24), y + row * 8 + 2, 1, 7, '#1a1f29');
      if (r > 0.55) rect(ctx, x + 3 + ((r * 15 + row * 3) | 0) % 16, y + row * 8 + 4, 5, 1, '#3b4455');
    }
    if (r > 0.8) {
      rect(ctx, x + 5, y + 9, 2, 1, '#4b5632');
      rect(ctx, x + 7, y + 10, 1, 2, '#4b5632');
    }
    if (r > 0.9) rect(ctx, x + 15, y + 17, 1, 6, '#171c25');
  }

  function drawBars(ctx, x, y) {
    rect(ctx, x, y, T, 2, '#171b23');
    for (let i = 2; i < T; i += 6) {
      rect(ctx, x + i, y, 3, T, '#4d5564');
      rect(ctx, x + i, y, 1, T, '#77808f');
      rect(ctx, x + i + 2, y, 1, T, '#2b313c');
    }
    rect(ctx, x, y + 4, T, 2, '#3a414e');
    rect(ctx, x, y + 17, T, 2, '#3a414e');
  }

  function drawStairs(ctx, x, y) {
    for (let i = 0; i < 5; i++) {
      const inset = i * 2;
      rect(ctx, x + inset, y + 20 - i * 4, T - inset * 2, 4, i % 2 ? '#4d5567' : '#586174');
      rect(ctx, x + inset, y + 20 - i * 4, T - inset * 2, 1, '#798295');
      rect(ctx, x + inset, y + 23 - i * 4, T - inset * 2, 1, '#252b36');
    }
  }

  /* ============================================================
     FOREST PROPS
     ============================================================ */
  function drawTree(ctx, x, y, variant, t = 0, scale = 1) {
    const r = variant;
    const sway = Math.sin(t * 0.8 + variant * 6.2) * 1.4;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    shadow(ctx, 0, 0, 15, 6, 0.32);
    // trunk
    rect(ctx, -4, -24, 8, 24, '#4a3124');
    rect(ctx, -2, -24, 3, 24, '#68452f');
    rect(ctx, 2, -20, 2, 18, '#38251c');
    // roots
    rect(ctx, -8, -3, 5, 3, '#4a3124');
    rect(ctx, 4, -2, 5, 2, '#38251c');
    // branches
    rect(ctx, -11, -30, 9, 2, '#4a3124');
    rect(ctx, 3, -36, 9, 2, '#4a3124');
    // canopy blobs
    const cx = sway;
    ellipse(ctx, cx - 10, -42, 13, 11, r > 0.5 ? '#2e633d' : '#2a5c39');
    ellipse(ctx, cx + 10, -43, 12, 10, '#356f43');
    ellipse(ctx, cx, -51, 15, 12, r > 0.45 ? '#3e7d4a' : '#3a7647');
    ellipse(ctx, cx - 5, -55, 9, 7, '#4b8f53');
    ellipse(ctx, cx + 8, -50, 8, 8, '#47884f');
    // highlights
    ellipse(ctx, cx - 7, -58, 6, 4, '#61a363');
    ellipse(ctx, cx + 4, -60, 4, 3, '#6caf6c');
    ellipse(ctx, cx - 16, -47, 5, 3, '#559a5b');
    ellipse(ctx, cx + 15, -48, 4, 3, '#589c5d');
    // dark under-canopy
    ellipse(ctx, cx - 1, -39, 11, 4, 'rgba(16,42,25,0.34)');
    // hanging leaves
    if (r > 0.55) {
      rect(ctx, cx - 18, -39, 2, 5, '#2c6039');
      rect(ctx, cx + 18, -42, 2, 4, '#2c6039');
    }
    ctx.restore();
  }

  function drawPine(ctx, x, y, variant, t = 0, scale = 1) {
    const sway = Math.sin(t * 0.6 + variant * 4) * 1;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    shadow(ctx, 0, 0, 13, 5, 0.3);
    rect(ctx, -3, -18, 6, 18, '#3e2b20');
    for (let i = 0; i < 4; i++) {
      const yy = -24 - i * 10;
      const w = 17 - i * 3;
      poly(ctx, [-w + sway * (i / 4), yy, w + sway * (i / 4), yy, sway * (i / 4), yy - 17], i % 2 ? '#234f38' : '#2a5c3e');
    }
    poly(ctx, [-4, -65, 4, -65, 0, -75], '#2f6846');
    ctx.restore();
  }

  function drawRock(ctx, x, y, variant) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 12, 5, 0.28);
    poly(ctx, [-13, 0, -11, -8, -5, -13, 4, -12, 11, -6, 12, 0], variant > 0.5 ? '#6b7278' : '#62696f');
    poly(ctx, [-11, -7, -5, -12, 3, -11, 3, -7], '#7e858a');
    poly(ctx, [4, -10, 10, -5, 11, 0, 2, 0], '#4d555c');
    rect(ctx, -6, -5, 4, 2, '#8c9398');
    if (variant > 0.6) rect(ctx, 5, -4, 3, 2, '#566b3c');
    ctx.restore();
  }

  function drawBush(ctx, x, y, variant) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 10, 4, 0.22);
    ellipse(ctx, -6, -7, 8, 7, '#2d663d');
    ellipse(ctx, 6, -8, 8, 7, '#367344');
    ellipse(ctx, 0, -11, 9, 8, '#43834e');
    ellipse(ctx, -2, -14, 5, 3, '#57975c');
    if (variant > 0.6) {
      rect(ctx, 4, -9, 2, 2, '#d9c56f');
      rect(ctx, -8, -7, 2, 2, '#c4b064');
    }
    ctx.restore();
  }

  function drawFlowers(ctx, x, y, variant) {
    const c = variant > 0.5 ? '#e7d488' : '#c9a6e0';
    rect(ctx, x - 3, y - 4, 1, 4, '#3b7042');
    rect(ctx, x + 2, y - 3, 1, 3, '#3b7042');
    rect(ctx, x - 4, y - 5, 2, 2, c);
    rect(ctx, x + 1, y - 5, 2, 2, c);
    rect(ctx, x - 6, y - 2, 2, 2, c);
  }

  function drawTent(ctx, x, y, variant, t = 0) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 31, 8, 0.35);
    // back canvas
    poly(ctx, [-32, 0, -32, -24, 0, -56, 32, -24, 32, 0], '#7a2f2c');
    poly(ctx, [-32, -24, 0, -56, 4, -54, -25, -21], '#9e3f37');
    poly(ctx, [0, -56, 32, -24, 28, -22, 0, -51], '#682925');
    // stripes
    poly(ctx, [-20, 0, -20, -28, -11, -37, -11, 0], 'rgba(235,181,115,0.16)');
    poly(ctx, [8, 0, 8, -44, 16, -36, 16, 0], 'rgba(235,181,115,0.12)');
    // opening
    poly(ctx, [-10, 0, -9, -27, 0, -43, 9, -27, 10, 0], '#281a18');
    poly(ctx, [-6, -1, -6, -25, 0, -36, 6, -25, 6, -1], '#120d0d');
    rect(ctx, -1, -34, 2, 12, '#6e3b25');
    // poles + ropes
    rect(ctx, -33, -24, 2, 24, '#563a25');
    rect(ctx, 31, -24, 2, 24, '#563a25');
    rect(ctx, 0, -56, 2, 3, '#c5a064');
    // pennant
    poly(ctx, [2, -56, 20, -52, 2, -46], '#d5a14a');
    ctx.restore();
  }

  function drawCampfire(ctx, x, y, t = 0) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    const glow = ctx.createRadialGradient(0, -8, 2, 0, -8, 32);
    glow.addColorStop(0, 'rgba(255,173,70,0.26)');
    glow.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-34, -42, 68, 68);
    shadow(ctx, 0, 0, 15, 5, 0.3);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ellipse(ctx, Math.cos(a) * 12, Math.sin(a) * 5 - 1, 3, 2, i % 2 ? '#626a6f' : '#7c8387');
    }
    rect(ctx, -11, -5, 21, 4, '#4d3222');
    rect(ctx, -7, -8, 18, 3, '#5f3f29');
    const f = Math.sin(t * 11) * 1.5;
    const f2 = Math.cos(t * 8.3) * 2;
    poly(ctx, [-7, -6, -2 + f2, -21, 1, -13, 5 + f, -26, 7, -8], '#e07a32');
    poly(ctx, [-4, -6, 0 + f, -17, 2, -10, 4 - f2, -20, 5, -6], '#f4bb4e');
    poly(ctx, [-2, -6, 1, -12, 2, -8], '#fff0b0');
    // sparks
    for (let i = 0; i < 4; i++) {
      const sx = Math.sin(t * 2 + i * 2.4) * 9;
      const sy = -16 - ((t * 14 + i * 9) % 26);
      rect(ctx, sx, sy, 1, 1, 'rgba(255,209,120,0.8)');
    }
    ctx.restore();
  }

  function drawSign(ctx, x, y, label) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 8, 3, 0.28);
    rect(ctx, -2, -34, 4, 34, '#5b3e27');
    rect(ctx, -15, -36, 30, 15, '#7a5530');
    rect(ctx, -15, -36, 30, 2, '#a07644');
    rect(ctx, -13, -33, 23, 1, 'rgba(45,28,16,0.8)');
    rect(ctx, -13, -30, 18, 1, 'rgba(45,28,16,0.7)');
    rect(ctx, -13, -27, 21, 1, 'rgba(45,28,16,0.6)');
    if (label === 'fox') {
      poly(ctx, [7, -35, 12, -31, 8, -31, 6, -27, 4, -31, 0, -31, 5, -35], '#c55743');
    }
    ctx.restore();
  }

  function drawChest(ctx, x, y, opened) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 12, 4, 0.3);
    rect(ctx, -12, -12, 24, 12, '#6d4528');
    rect(ctx, -12, -12, 24, 2, '#8a5c34');
    rect(ctx, -12, -4, 24, 1, '#4b2d1b');
    if (opened) {
      poly(ctx, [-12, -12, -12, -20, 12, -20, 12, -12], '#5a3a23');
      rect(ctx, -10, -18, 20, 5, '#2c1b12');
      rect(ctx, -6, -16, 4, 1, '#f1c777');
    } else {
      poly(ctx, [-12, -12, -12, -18, 12, -18, 12, -12], '#7c5130');
      rect(ctx, -12, -13, 24, 1, '#4b2d1b');
    }
    rect(ctx, -2, -13, 4, 5, '#d2a84d');
    rect(ctx, -1, -12, 2, 2, '#60421d');
    ctx.restore();
  }

  function drawCrate(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 12, 4, 0.3);
    rect(ctx, -11, -20, 22, 20, '#76502f');
    rect(ctx, -11, -20, 22, 2, '#946a40');
    rect(ctx, -11, -4, 22, 2, '#4f3520');
    rect(ctx, -9, -18, 18, 1, '#5c3e25');
    rect(ctx, -9, -11, 3, 1, '#5c3e25');
    rect(ctx, 6, -11, 3, 1, '#5c3e25');
    rect(ctx, -2, -20, 4, 20, '#5a3d25');
    ctx.restore();
  }

  function drawBarrel(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 9, 3, 0.3);
    rect(ctx, -8, -18, 16, 18, '#6b482c');
    rect(ctx, -8, -18, 16, 2, '#8f643e');
    rect(ctx, -8, -13, 16, 2, '#4a3020');
    rect(ctx, -8, -4, 16, 2, '#4a3020');
    rect(ctx, -5, -17, 2, 16, '#845a37');
    rect(ctx, -1, -16, 1, 14, '#5c3e26');
    ctx.restore();
  }

  function drawBanner(ctx, x, y, t = 0) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    rect(ctx, -1, -48, 3, 48, '#58412a');
    rect(ctx, -2, -50, 5, 3, '#caa258');
    const wave = Math.sin(t * 1.4) * 2;
    poly(ctx, [2, -48, 26, -45 + wave, 22, -36, 26, -28 - wave, 2, -30], '#9c3b33');
    poly(ctx, [2, -45, 20, -43 + wave, 18, -37, 20, -32 - wave, 2, -34], '#b84c40');
    // fox mark
    poly(ctx, [8, -42, 12, -38, 15, -42, 13, -35, 10, -33, 7, -35], '#e7c583');
    ctx.restore();
  }

  function drawStump(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 9, 4, 0.28);
    rect(ctx, -7, -10, 14, 10, '#5a3d29');
    ellipse(ctx, 0, -10, 7, 3, '#8a623f');
    ellipse(ctx, 0, -10, 4, 1.6, '#6f4b31');
    rect(ctx, -7, -4, 14, 1, '#422c1e');
    ctx.restore();
  }

  function drawTable(ctx, x, y, withKnife) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    shadow(ctx, 0, 0, 24, 6, 0.3);
    rect(ctx, -23, -18, 46, 6, '#9a7246');
    rect(ctx, -23, -18, 46, 2, '#b28a59');
    rect(ctx, -23, -12, 46, 6, '#784f2f');
    rect(ctx, -20, -8, 4, 8, '#5f3e26');
    rect(ctx, 16, -8, 4, 8, '#5f3e26');
    rect(ctx, -14, -15, 16, 1, '#6d4930');
    // map / paper
    poly(ctx, [-16, -19, -4, -21, -2, -13, -14, -12], '#d9c9a3');
    rect(ctx, -12, -18, 6, 1, 'rgba(82,66,43,0.7)');
    rect(ctx, -13, -16, 8, 1, 'rgba(82,66,43,0.6)');
    // candle
    rect(ctx, 10, -24, 5, 6, '#d6c39a');
    rect(ctx, 11, -28, 3, 5, '#f5d889');
    if (withKnife) {
      rect(ctx, 14, -11, 9, 2, '#cbdce6');
      rect(ctx, 22, -11, 4, 2, '#6d4a2c');
      rect(ctx, 15, -11, 8, 1, '#f4fbff');
      const gl = Math.sin(performance.now() / 280) * 0.5 + 0.5;
      rect(ctx, 17, -13 - gl * 2, 1, 1, `rgba(255,244,180,${0.5 + gl * 0.5})`);
    }
    ctx.restore();
  }

  function drawBed(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    rect(ctx, -22, -9, 44, 18, '#5d432c');
    rect(ctx, -20, -8, 40, 16, '#a78a4f');
    for (let i = 0; i < 5; i++) rect(ctx, -18 + i * 8, -7, 1, 14, '#8f7442');
    rect(ctx, -20, -8, 40, 2, '#c0a263');
    rect(ctx, -21, 6, 42, 3, '#47311f');
    ctx.restore();
  }

  function drawBucket(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    poly(ctx, [-6, -9, 6, -9, 4, 0, -4, 0], '#56606b');
    ellipse(ctx, 0, -9, 6, 2, '#303944');
    rect(ctx, -5, -5, 10, 1, '#717b85');
    rect(ctx, -4, -2, 8, 1, '#717b85');
    ctx.restore();
  }

  function drawTorch(ctx, x, y, t = 0) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    const glow = ctx.createRadialGradient(0, -10, 2, 0, -10, 38);
    glow.addColorStop(0, 'rgba(255,167,73,0.28)');
    glow.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-40, -50, 80, 80);
    rect(ctx, -2, -14, 4, 14, '#4b4034');
    rect(ctx, -4, -16, 8, 3, '#2c2822');
    const f = Math.sin(t * 12 + x) * 1.4;
    poly(ctx, [-4, -16, -1 + f, -29, 2, -21, 4 - f, -31, 5, -16], '#e58633');
    poly(ctx, [-2, -16, 0 + f, -24, 2, -18, 3 - f, -25, 3, -16], '#ffd06d');
    ctx.restore();
  }

  function drawChains(ctx, x, y) {
    for (let i = 0; i < 5; i++) {
      const a = i * 0.6;
      rect(ctx, x + Math.sin(a) * 3, y + i * 5, 2, 4, '#5c6670');
      rect(ctx, x + Math.sin(a) * 3 + 1, y + i * 5 + 1, 1, 2, '#2b333c');
    }
  }

  function drawSwordRack(ctx, x, y) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    rect(ctx, -12, -22, 2, 22, '#4e3d2d');
    rect(ctx, 10, -22, 2, 22, '#4e3d2d');
    rect(ctx, -12, -18, 24, 2, '#6e573d');
    rect(ctx, -12, -8, 24, 2, '#6e573d');
    rect(ctx, -8, -20, 2, 11, '#b7c9d3');
    rect(ctx, -9, -9, 4, 1, '#d2a84d');
    ctx.restore();
  }

  /* ============================================================
     CHARACTERS — world scale
     ============================================================ */
  function drawSaphira(ctx, x, y, opts = {}) {
    const dir = opts.dir || 'down';
    const moving = !!opts.moving;
    const phase = opts.phase || 0;
    const scale = opts.scale || 1;
    const t = opts.t || 0;
    const sword = opts.sword !== false;
    const bob = moving ? Math.abs(Math.sin(phase * 9)) * 1.2 : Math.sin(t * 2.1) * 0.4;
    const legSwing = moving ? Math.sin(phase * 10) * 2.2 : 0;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    if (dir === 'left') ctx.scale(-1, 1);
    shadow(ctx, 0, 0, 9, 3.5, 0.3);

    if (dir === 'left' || dir === 'right') {
      // side / three-quarter view
      const capeSway = moving ? Math.sin(phase * 8) * 2.5 : Math.sin(t * 1.7) * 1;
      poly(ctx, [-7, -20 + bob, -12 - capeSway, -6, -5, -2, 1, -5, 1, -20 + bob], '#2f638d');
      poly(ctx, [-6, -19 + bob, -9 - capeSway * 0.6, -8, -4, -4, -1, -7, -2, -19 + bob], '#3f7ba7');
      // legs
      rect(ctx, -4 + legSwing, -8, 4, 8, '#33465e');
      rect(ctx, 1 - legSwing, -8, 4, 8, '#2b3c52');
      rect(ctx, -5 + legSwing, -3, 5, 3, '#1f2a3a');
      rect(ctx, 0 - legSwing, -3, 5, 3, '#1f2a3a');
      // torso
      poly(ctx, [-7, -20 + bob, 3, -22 + bob, 8, -16 + bob, 6, -8 + bob, -5, -7 + bob], '#76b9df');
      poly(ctx, [-6, -19 + bob, 3, -21 + bob, 7, -16 + bob, 5, -12 + bob, -4, -11 + bob], '#9dd8f5');
      rect(ctx, -5, -11 + bob, 11, 2, '#3a6e94');
      rect(ctx, -4, -10 + bob, 4, 2, '#d5a84e');
      // arm
      rect(ctx, 4, -17 + bob, 4, 8, '#6aaed5');
      rect(ctx, 5, -10 + bob, 4, 3, '#d7e9f4');
      // head
      rect(ctx, -3, -29 + bob, 9, 9, '#efc397');
      rect(ctx, -3, -29 + bob, 9, 2, '#d9a97c');
      // hair
      poly(ctx, [-5, -29 + bob, -3, -33 + bob, 5, -33 + bob, 8, -28 + bob, 8, -19 + bob, 5, -22 + bob, 4, -28 + bob, -2, -28 + bob, -2, -21 + bob, -5, -24 + bob], '#d8b052');
      // helmet
      poly(ctx, [-4, -30 + bob, -2, -35 + bob, 4, -35 + bob, 7, -31 + bob, 7, -28 + bob, -4, -28 + bob], '#b9d7e8');
      rect(ctx, -4, -31 + bob, 11, 2, '#dff2fc');
      rect(ctx, 0, -35 + bob, 3, 2, '#5da8d2');
      // face details
      rect(ctx, 4, -26 + bob, 1, 1, '#25384a');
      rect(ctx, 3, -24 + bob, 3, 1, '#c98f69');
      // ponytail
      poly(ctx, [-6, -27 + bob, -10, -24 + bob, -11, -16 + bob, -7, -18 + bob, -5, -23 + bob], '#e4c268');
      rect(ctx, -9, -22 + bob, 2, 5, '#f0d27a');
      // pauldron
      rect(ctx, -3, -21 + bob, 5, 4, '#cfe8f6');
      rect(ctx, -2, -20 + bob, 3, 2, '#8fbed8');
      if (sword) {
        // blade held low, pointing ahead
        ctx.save();
        ctx.translate(7, -12 + bob);
        ctx.rotate(-0.35);
        rect(ctx, 0, -1, 14, 2, '#dbe9f2');
        rect(ctx, 1, -1, 12, 1, '#ffffff');
        rect(ctx, -2, -3, 2, 6, '#d1a44b');
        rect(ctx, -5, -1, 3, 2, '#6b4a2c');
        ctx.restore();
      }
    } else if (dir === 'up') {
      const capeSway = moving ? Math.sin(phase * 8) * 2 : Math.sin(t * 1.8);
      // cape
      poly(ctx, [-8, -20 + bob, -9 + capeSway, -4, 0, -1, 9 + capeSway, -4, 8, -20 + bob], '#2f638d');
      poly(ctx, [-6, -19 + bob, -6 + capeSway * 0.7, -7, 0, -4, 6 + capeSway * 0.7, -7, 6, -19 + bob], '#417da8');
      // legs
      rect(ctx, -5 + legSwing, -8, 4, 8, '#33465e');
      rect(ctx, 1 - legSwing, -8, 4, 8, '#2b3c52');
      rect(ctx, -6 + legSwing, -3, 5, 3, '#1f2a3a');
      rect(ctx, 1 - legSwing, -3, 5, 3, '#1f2a3a');
      // torso
      poly(ctx, [-7, -20 + bob, 7, -20 + bob, 8, -9 + bob, 0, -7 + bob, -8, -9 + bob], '#76b9df');
      poly(ctx, [-6, -19 + bob, 6, -19 + bob, 6, -12 + bob, 0, -10 + bob, -6, -12 + bob], '#98d3f1');
      rect(ctx, -5, -11 + bob, 10, 2, '#3a6e94');
      // arms
      rect(ctx, -10, -18 + bob, 3, 9, '#6aaed5');
      rect(ctx, 7, -18 + bob, 3, 9, '#6aaed5');
      // head / hair
      rect(ctx, -4, -30 + bob, 9, 10, '#d8b052');
      rect(ctx, -3, -29 + bob, 7, 5, '#f0d27a');
      poly(ctx, [0, -29 + bob, 3, -26 + bob, 1, -20 + bob, -1, -20 + bob], '#c79f44');
      // helmet back
      poly(ctx, [-5, -30 + bob, -3, -35 + bob, 4, -35 + bob, 7, -30 + bob, 6, -27 + bob, -4, -27 + bob], '#b9d7e8');
      rect(ctx, -1, -36 + bob, 3, 3, '#5da8d2');
      // shoulders
      rect(ctx, -10, -21 + bob, 5, 4, '#cfe8f6');
      rect(ctx, 5, -21 + bob, 5, 4, '#cfe8f6');
      // blade at side
      if (sword) {
        ctx.save();
        ctx.translate(10, -8 + bob);
        ctx.rotate(0.25);
        rect(ctx, 0, 0, 2, 15, '#dbe9f2');
        rect(ctx, 0, 0, 1, 14, '#ffffff');
        rect(ctx, -2, -2, 6, 2, '#d1a44b');
        ctx.restore();
      }
    } else {
      const capeSway = moving ? Math.sin(phase * 8) * 2 : Math.sin(t * 1.9);
      // cape behind
      poly(ctx, [-8, -20 + bob, -10 + capeSway, -6, -4, -2, 4, -2, 10 + capeSway, -6, 8, -20 + bob], '#2f638d');
      poly(ctx, [-6, -20 + bob, -7 + capeSway * 0.7, -8, -3, -5, 3, -5, 7 + capeSway * 0.7, -8, 6, -20 + bob], '#3f7ba7');
      // legs
      rect(ctx, -5 + legSwing, -8, 4, 8, '#33465e');
      rect(ctx, 1 - legSwing, -8, 4, 8, '#2b3c52');
      rect(ctx, -6 + legSwing, -3, 5, 3, '#1f2a3a');
      rect(ctx, 1 - legSwing, -3, 5, 3, '#1f2a3a');
      // torso
      poly(ctx, [-7, -20 + bob, 7, -20 + bob, 8, -12 + bob, 5, -7 + bob, -5, -7 + bob, -8, -12 + bob], '#76b9df');
      poly(ctx, [-6, -19 + bob, 6, -19 + bob, 6, -13 + bob, 3, -9 + bob, -3, -9 + bob, -6, -13 + bob], '#a5dcf7');
      // belt
      rect(ctx, -6, -10 + bob, 12, 2, '#3a6e94');
      rect(ctx, -2, -10 + bob, 4, 2, '#d5a84e');
      // arms
      rect(ctx, -10, -18 + bob, 4, 8, '#6aaed5');
      rect(ctx, -10, -11 + bob, 4, 3, '#d7e9f4');
      rect(ctx, 6, -18 + bob, 4, 8, '#6aaed5');
      rect(ctx, 6, -11 + bob, 4, 3, '#d7e9f4');
      // head
      rect(ctx, -4, -30 + bob, 9, 9, '#efc397');
      rect(ctx, -4, -30 + bob, 9, 1, '#f7d5ae');
      // hair sides
      rect(ctx, -6, -29 + bob, 3, 7, '#d8b052');
      rect(ctx, 4, -29 + bob, 3, 7, '#d8b052');
      rect(ctx, -2, -23 + bob, 5, 2, '#c99f43');
      // helmet
      poly(ctx, [-5, -30 + bob, -3, -36 + bob, 4, -36 + bob, 7, -31 + bob, 7, -28 + bob, -5, -28 + bob], '#b9d7e8');
      rect(ctx, -5, -31 + bob, 12, 2, '#e1f3fd');
      rect(ctx, -1, -36 + bob, 3, 3, '#5da8d2');
      rect(ctx, -5, -29 + bob, 2, 5, '#d3ebf7');
      rect(ctx, 4, -29 + bob, 2, 5, '#d3ebf7');
      // eyes
      rect(ctx, -3, -26 + bob, 2, 1, '#2c4a64');
      rect(ctx, 2, -26 + bob, 2, 1, '#2c4a64');
      rect(ctx, -1, -24 + bob, 1, 1, '#d29a74');
      rect(ctx, -1, -22 + bob, 2, 1, '#b4775e');
      // shoulders
      rect(ctx, -11, -20 + bob, 5, 4, '#d6ecf8');
      rect(ctx, 6, -20 + bob, 5, 4, '#d6ecf8');
      rect(ctx, -10, -19 + bob, 4, 1, '#91c2dc');
      rect(ctx, 7, -19 + bob, 4, 1, '#91c2dc');
      if (sword) {
        // scabbard at left hip
        ctx.save();
        ctx.translate(-7, -7 + bob);
        ctx.rotate(0.55);
        rect(ctx, 0, 0, 2, 17, '#8e5a35');
        rect(ctx, 0, 0, 1, 17, '#c08a52');
        rect(ctx, -2, -1, 6, 2, '#d1a44b');
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawBoundSaphira(ctx, x, y, opts = {}) {
    const t = opts.t || 0;
    const scale = opts.scale || 1;
    const struggle = Math.sin(t * 1.7) * 0.7 + (opts.struggle ? Math.sin(t * 13) * 1.4 : 0);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    shadow(ctx, 0, 0, 12, 4.5, 0.34);
    // legs folded
    rect(ctx, -9, -5, 8, 5, '#33465e');
    rect(ctx, 1, -5, 8, 5, '#2b3c52');
    rect(ctx, -10, -2, 8, 2, '#1f2a3a');
    rect(ctx, 2, -2, 8, 2, '#1f2a3a');
    // torso, leaning
    poly(ctx, [-8, -17 + struggle, 5, -19 + struggle, 9, -10 + struggle, 4, -4 + struggle, -7, -5 + struggle], '#76b9df');
    poly(ctx, [-6, -16 + struggle, 4, -17 + struggle, 6, -11 + struggle, 2, -7 + struggle, -4, -8 + struggle], '#99d4f1');
    // arms pulled behind
    rect(ctx, -9, -13 + struggle, 3, 7, '#6aaed5');
    rect(ctx, 7, -13 + struggle, 3, 7, '#6aaed5');
    // head bowed
    rect(ctx, -3, -26 + struggle, 9, 8, '#efc397');
    rect(ctx, -3, -26 + struggle, 9, 1, '#d9a97c');
    rect(ctx, -4, -27 + struggle, 10, 3, '#d8b052');
    poly(ctx, [-6, -28 + struggle, -3, -32 + struggle, 5, -32 + struggle, 8, -27 + struggle, 7, -21 + struggle, 5, -24 + struggle, 3, -20 + struggle, -3, -20 + struggle, -3, -24 + struggle, -6, -23 + struggle], '#d8b052');
    // helmet knocked loose
    poly(ctx, [-5, -29 + struggle, -2, -34 + struggle, 5, -33 + struggle, 7, -29 + struggle, 5, -27 + struggle, -4, -28 + struggle], '#b9d7e8');
    rect(ctx, -1, -34 + struggle, 3, 2, '#5da8d2');
    // face (eyes lowered)
    rect(ctx, -2, -23 + struggle, 2, 1, '#2c4a64');
    rect(ctx, 2, -23 + struggle, 2, 1, '#2c4a64');
    rect(ctx, 0, -21 + struggle, 2, 1, '#b4775e');
    // rope coils around torso
    ctx.strokeStyle = '#c7a267';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, -13 + struggle); ctx.lineTo(8, -16 + struggle);
    ctx.moveTo(-9, -10 + struggle); ctx.lineTo(8, -13 + struggle);
    ctx.moveTo(-8, -7 + struggle); ctx.lineTo(6, -10 + struggle);
    ctx.stroke();
    ctx.strokeStyle = '#8c6a3e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -12 + struggle); ctx.lineTo(8, -15 + struggle);
    ctx.stroke();
    // wrist ropes
    rect(ctx, -10, -15 + struggle, 3, 3, '#c7a267');
    rect(ctx, 7, -15 + struggle, 3, 3, '#c7a267');
    // rope tails
    ctx.strokeStyle = '#b48c55';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, -11 + struggle); ctx.quadraticCurveTo(13, -7, 11, -2);
    ctx.moveTo(-9, -11 + struggle); ctx.quadraticCurveTo(-13, -6, -11, -3);
    ctx.stroke();
    // ankle rope
    ctx.strokeStyle = '#c7a267';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -3); ctx.lineTo(7, -3);
    ctx.stroke();
    ctx.restore();
  }

  function drawBandit(ctx, x, y, opts = {}) {
    const dir = opts.dir || 'right';
    const moving = !!opts.moving;
    const phase = opts.phase || 0;
    const scale = opts.scale || 1;
    const t = opts.t || 0;
    const bob = moving ? Math.abs(Math.sin(phase * 9)) * 1 : Math.sin(t * 2.5 + x) * 0.4;
    const legSwing = moving ? Math.sin(phase * 10) * 2 : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    if (dir === 'left') ctx.scale(-1, 1);
    shadow(ctx, 0, 0, 8.5, 3.5, 0.3);
    if (dir === 'left' || dir === 'right') {
      rect(ctx, -4 + legSwing, -8, 4, 8, '#4b3a2b');
      rect(ctx, 1 - legSwing, -8, 4, 8, '#392c22');
      rect(ctx, -5 + legSwing, -3, 5, 3, '#241b15');
      rect(ctx, 0 - legSwing, -3, 5, 3, '#241b15');
      poly(ctx, [-7, -19 + bob, 3, -21 + bob, 8, -15 + bob, 6, -7 + bob, -5, -7 + bob], '#6e4a31');
      poly(ctx, [-5, -18 + bob, 3, -19 + bob, 6, -15 + bob, 4, -11 + bob, -3, -12 + bob], '#946843');
      rect(ctx, -5, -10 + bob, 11, 2, '#42301f');
      rect(ctx, 4, -17 + bob, 4, 8, '#8b5d3b');
      // head
      rect(ctx, -3, -28 + bob, 8, 8, '#d7a377');
      rect(ctx, -4, -29 + bob, 10, 3, '#4b3427');
      // bandana over lower face
      rect(ctx, -4, -23 + bob, 10, 4, '#b8433d');
      rect(ctx, -4, -23 + bob, 10, 1, '#d05a4e');
      rect(ctx, 5, -21 + bob, 2, 3, '#8d312d');
      // eyes
      rect(ctx, 1, -26 + bob, 2, 1, '#1d1613');
      rect(ctx, 5, -26 + bob, 1, 1, '#1d1613');
      // dagger
      ctx.save();
      ctx.translate(7, -11 + bob);
      ctx.rotate(-0.2);
      rect(ctx, 0, -1, 8, 2, '#b9c8d1');
      rect(ctx, 1, -1, 7, 1, '#eef7fb');
      rect(ctx, -2, -2, 2, 4, '#7d562f');
      ctx.restore();
    } else {
      rect(ctx, -5 + legSwing, -8, 4, 8, '#4b3a2b');
      rect(ctx, 1 - legSwing, -8, 4, 8, '#392c22');
      rect(ctx, -6 + legSwing, -3, 5, 3, '#241b15');
      rect(ctx, 1 - legSwing, -3, 5, 3, '#241b15');
      poly(ctx, [-7, -19 + bob, 7, -19 + bob, 8, -8 + bob, 0, -6 + bob, -8, -8 + bob], '#6e4a31');
      poly(ctx, [-5, -18 + bob, 5, -18 + bob, 5, -11 + bob, 0, -9 + bob, -5, -11 + bob], '#946843');
      rect(ctx, -6, -10 + bob, 12, 2, '#42301f');
      rect(ctx, -9, -17 + bob, 3, 8, '#8b5d3b');
      rect(ctx, 6, -17 + bob, 3, 8, '#8b5d3b');
      rect(ctx, -3, -28 + bob, 8, 8, '#d7a377');
      rect(ctx, -4, -29 + bob, 10, 3, '#4b3427');
      rect(ctx, -4, -23 + bob, 10, 4, '#b8433d');
      rect(ctx, -4, -23 + bob, 10, 1, '#d05a4e');
      rect(ctx, 1, -26 + bob, 2, 1, '#1d1613');
      rect(ctx, 5, -26 + bob, 2, 1, '#1d1613');
    }
    ctx.restore();
  }

  function drawGuard(ctx, x, y, opts = {}) {
    const dir = opts.dir || 'left';
    const moving = !!opts.moving;
    const phase = opts.phase || 0;
    const scale = opts.scale || 1;
    const t = opts.t || 0;
    const bob = moving ? Math.abs(Math.sin(phase * 8)) * 1 : Math.sin(t * 2 + x) * 0.35;
    const legSwing = moving ? Math.sin(phase * 9) * 2 : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    if (dir === 'left') ctx.scale(-1, 1);
    shadow(ctx, 0, 0, 10, 4, 0.32);
    // legs
    rect(ctx, -5 + legSwing, -9, 4, 9, '#3e3a3d');
    rect(ctx, 1 - legSwing, -9, 4, 9, '#302e31');
    rect(ctx, -6 + legSwing, -3, 5, 3, '#1d1c1e');
    rect(ctx, 1 - legSwing, -3, 5, 3, '#1d1c1e');
    // body leather + mail
    poly(ctx, [-8, -21 + bob, 7, -21 + bob, 9, -12 + bob, 6, -8 + bob, -6, -8 + bob, -9, -12 + bob], '#5b3a35');
    poly(ctx, [-6, -20 + bob, 5, -20 + bob, 7, -13 + bob, 4, -10 + bob, -4, -10 + bob, -7, -13 + bob], '#7a4b42');
    rect(ctx, -7, -12 + bob, 14, 2, '#30201e');
    rect(ctx, -2, -12 + bob, 4, 2, '#a8894c');
    // arm + spear
    rect(ctx, 5, -19 + bob, 4, 9, '#6d443b');
    rect(ctx, -10, -19 + bob, 4, 9, '#6d443b');
    // head + helmet
    rect(ctx, -3, -30 + bob, 8, 9, '#d0a071');
    poly(ctx, [-5, -31 + bob, -3, -35 + bob, 4, -35 + bob, 7, -31 + bob, 7, -28 + bob, -5, -28 + bob], '#5a5e63');
    rect(ctx, -5, -29 + bob, 12, 2, '#7e848a');
    rect(ctx, -1, -36 + bob, 3, 3, '#8f2f2a');
    rect(ctx, 0, -27 + bob, 5, 2, '#2a2420');
    rect(ctx, 3, -27 + bob, 1, 2, '#1c1714');
    // pauldron
    rect(ctx, -10, -21 + bob, 5, 4, '#6c6f73');
    rect(ctx, 6, -21 + bob, 5, 4, '#55585c');
    // spear
    ctx.save();
    ctx.translate(9, -6 + bob);
    rect(ctx, 0, -29, 2, 30, '#6e523a');
    poly(ctx, [-2, -29, 1, -38, 4, -29], '#bfd0da');
    rect(ctx, 0, -33, 1, 5, '#f3fbff');
    ctx.restore();
    ctx.restore();
  }

  function drawChief(ctx, x, y, opts = {}) {
    const t = opts.t || 0;
    const scale = opts.scale || 1;
    const bob = Math.sin(t * 1.8) * 0.7;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    if (opts.dir === 'left') ctx.scale(-1, 1);
    shadow(ctx, 0, 0, 16, 6, 0.38);
    // legs
    rect(ctx, -9, -13, 7, 13, '#3d3126');
    rect(ctx, 2, -13, 7, 13, '#30271e');
    rect(ctx, -11, -4, 9, 4, '#1e1813');
    rect(ctx, 2, -4, 9, 4, '#1e1813');
    // fur cloak
    poly(ctx, [-14, -30 + bob, 12, -30 + bob, 16, -8 + bob, 8, -4 + bob, -12, -4 + bob], '#4b3b2f');
    for (let i = 0; i < 7; i++) rect(ctx, -13 + i * 4, -9 + (i % 2) * 2 + bob, 3, 4, '#66513d');
    // body
    poly(ctx, [-11, -30 + bob, 10, -30 + bob, 13, -17 + bob, 8, -10 + bob, -9, -10 + bob, -13, -17 + bob], '#7a4236');
    poly(ctx, [-8, -28 + bob, 8, -28 + bob, 10, -18 + bob, 5, -13 + bob, -6, -13 + bob, -9, -18 + bob], '#9a5543');
    rect(ctx, -9, -17 + bob, 19, 3, '#35231c');
    rect(ctx, -5, -17 + bob, 7, 3, '#c19a4d');
    // arms
    rect(ctx, -16, -28 + bob, 6, 14, '#7d4a3a');
    rect(ctx, 11, -28 + bob, 6, 14, '#7d4a3a');
    // head
    rect(ctx, -6, -43 + bob, 13, 12, '#c99066');
    rect(ctx, -5, -34 + bob, 11, 3, '#6e3d2a');
    // braided beard
    rect(ctx, -5, -35 + bob, 10, 3, '#5f3927');
    poly(ctx, [-4, -32 + bob, 5, -32 + bob, 3, -26 + bob, 0, -23 + bob, -2, -27 + bob], '#6b402b');
    // eyes / scar
    rect(ctx, -2, -39 + bob, 3, 1, '#1d1411');
    rect(ctx, 5, -39 + bob, 2, 1, '#1d1411');
    rect(ctx, 6, -41 + bob, 1, 5, '#9e5e4a');
    // horned helmet
    poly(ctx, [-8, -44 + bob, -5, -50 + bob, 7, -50 + bob, 10, -44 + bob, 8, -42 + bob, -6, -42 + bob], '#4b4e52');
    rect(ctx, -8, -45 + bob, 18, 3, '#70757a');
    rect(ctx, -2, -50 + bob, 4, 3, '#a33d34');
    poly(ctx, [-9, -46 + bob, -16, -54 + bob, -12, -44 + bob], '#d8cfb4');
    poly(ctx, [10, -46 + bob, 17, -54 + bob, 13, -44 + bob], '#d8cfb4');
    // axe
    ctx.save();
    ctx.translate(15, -6 + bob);
    ctx.rotate(-0.12);
    rect(ctx, 0, -34, 3, 36, '#5b402b');
    poly(ctx, [-8, -34, 4, -40, 6, -24, -8, -22], '#9aa6ad');
    poly(ctx, [-6, -32, 2, -36, 4, -26, -6, -25], '#ccd7dc');
    ctx.restore();
    ctx.restore();
  }

  /* ============================================================
     ATTACK FX
     ============================================================ */
  function drawSlash(ctx, x, y, angle, progress, color = 'rgba(180,230,255,0.9)') {
    const p = Math.max(0, Math.min(1, progress));
    const a0 = angle - 1.25 + p * 1.8;
    const r = 34;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(0, 0, r, a0 - 0.55, a0 + 0.55);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, a0 - 0.4, a0 + 0.4);
    ctx.stroke();
    ctx.restore();
  }

  /* ============================================================
     PORTRAITS
     ============================================================ */
  function drawPortrait(canvas, who = 'saphira') {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 96, 96);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    // subtle glow behind bust
    const g = ctx.createRadialGradient(48, 39, 6, 48, 46, 44);
    g.addColorStop(0, who === 'saphira' || who === 'saphira-bound' ? 'rgba(89,164,211,0.30)' : 'rgba(146,101,66,0.24)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);

    if (who === 'narrator') {
      ctx.strokeStyle = 'rgba(241,199,119,0.85)';
      ctx.lineWidth = 2;
      ctx.translate(48, 46);
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-15, -15, 30, 30);
      ctx.strokeStyle = 'rgba(241,199,119,0.35)';
      ctx.strokeRect(-22, -22, 44, 44);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#f1c777';
      ctx.font = '20px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', 0, 1);
      ctx.restore();
      return;
    }

    if (who === 'saphira-bound') {
      // loose hair, no helmet, rope
      ctx.fillStyle = '#2a4f70';
      ctx.beginPath(); ctx.moveTo(20, 96); ctx.quadraticCurveTo(24, 72, 38, 68); ctx.lineTo(58, 68); ctx.quadraticCurveTo(74, 73, 78, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9ed6f2';
      ctx.beginPath(); ctx.moveTo(28, 96); ctx.quadraticCurveTo(32, 78, 42, 73); ctx.lineTo(55, 73); ctx.quadraticCurveTo(66, 79, 69, 96); ctx.closePath(); ctx.fill();
      // neck
      ctx.fillStyle = '#c99267'; ctx.fillRect(41, 61, 15, 12);
      // face
      ctx.fillStyle = '#efc397';
      ctx.beginPath(); ctx.moveTo(34, 38); ctx.lineTo(63, 38); ctx.lineTo(62, 57); ctx.quadraticCurveTo(53, 67, 44, 62); ctx.lineTo(35, 54); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d9a87b'; ctx.fillRect(35, 50, 4, 9);
      // hair
      ctx.fillStyle = '#d8b052';
      ctx.beginPath(); ctx.moveTo(27, 39); ctx.quadraticCurveTo(30, 24, 48, 24); ctx.quadraticCurveTo(69, 25, 69, 43); ctx.lineTo(66, 54); ctx.lineTo(62, 36); ctx.lineTo(38, 35); ctx.lineTo(34, 55); ctx.lineTo(29, 50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#efd47c'; ctx.beginPath(); ctx.moveTo(32, 30); ctx.quadraticCurveTo(42, 22, 55, 27); ctx.lineTo(50, 31); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c49a3e'; ctx.fillRect(26, 45, 5, 21); ctx.fillRect(64, 47, 5, 19);
      // brows/eyes
      ctx.fillStyle = '#7f5b2a'; ctx.fillRect(40, 41, 7, 2); ctx.fillRect(53, 41, 6, 2);
      ctx.fillStyle = '#22384a'; ctx.fillRect(41, 45, 5, 3); ctx.fillRect(54, 45, 4, 3);
      ctx.fillStyle = '#8ac7e8'; ctx.fillRect(42, 45, 2, 2); ctx.fillRect(55, 45, 1, 2);
      ctx.fillStyle = '#b47a62'; ctx.fillRect(50, 50, 3, 2);
      ctx.fillStyle = '#a05854'; ctx.fillRect(48, 56, 7, 1);
      // rope across shoulder
      ctx.strokeStyle = '#c7a267'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(23, 87); ctx.lineTo(72, 70); ctx.stroke();
      ctx.strokeStyle = '#8c6a3e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(24, 86); ctx.lineTo(71, 69); ctx.stroke();
      ctx.restore();
      return;
    }

    if (who === 'saphira' || who === 'saphira-sad') {
      const sad = who === 'saphira-sad';
      // shoulders
      ctx.fillStyle = '#23415e';
      ctx.beginPath(); ctx.moveTo(16, 96); ctx.quadraticCurveTo(21, 73, 38, 68); ctx.lineTo(60, 68); ctx.quadraticCurveTo(77, 74, 82, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7fc4e8';
      ctx.beginPath(); ctx.moveTo(24, 96); ctx.quadraticCurveTo(28, 79, 41, 74); ctx.lineTo(56, 74); ctx.quadraticCurveTo(69, 80, 73, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b9e4fa';
      ctx.beginPath(); ctx.moveTo(30, 96); ctx.lineTo(38, 81); ctx.lineTo(47, 88); ctx.lineTo(44, 96); ctx.closePath(); ctx.fill();
      // gold trim
      ctx.fillStyle = '#d9ad5e'; ctx.fillRect(24, 91, 9, 2); ctx.fillRect(65, 91, 9, 2);
      // neck
      ctx.fillStyle = '#bd835d'; ctx.fillRect(41, 61, 16, 12);
      ctx.fillStyle = '#eac091'; ctx.fillRect(42, 60, 13, 9);
      // face
      ctx.fillStyle = '#efc397';
      ctx.beginPath(); ctx.moveTo(34, 37); ctx.lineTo(64, 37); ctx.lineTo(63, 55); ctx.quadraticCurveTo(57, 66, 48, 66); ctx.quadraticCurveTo(39, 64, 34, 54); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#dfac7e'; ctx.fillRect(64, 44, 2, 9);
      // brows
      ctx.fillStyle = '#8c642e';
      if (sad) { ctx.fillRect(40, 39, 8, 2); ctx.fillRect(54, 38, 7, 2); }
      else { ctx.fillRect(40, 40, 7, 2); ctx.fillRect(54, 39, 6, 2); }
      // eyes
      ctx.fillStyle = '#1d3245'; ctx.fillRect(41, 44, 6, 3); ctx.fillRect(55, 44, 5, 3);
      ctx.fillStyle = '#8fd4ff'; ctx.fillRect(43, 44, 2, 2); ctx.fillRect(56, 44, 1, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(44, 44, 1, 1); ctx.fillRect(57, 44, 1, 1);
      // nose, mouth
      ctx.fillStyle = '#c98f69'; ctx.fillRect(51, 50, 3, 3);
      ctx.fillStyle = sad ? '#9c5b58' : '#a85b54'; ctx.fillRect(48, 57, 7, 1);
      if (!sad) { ctx.fillStyle = '#c57568'; ctx.fillRect(50, 59, 3, 1); }
      // hair
      ctx.fillStyle = '#d8b052';
      ctx.beginPath(); ctx.moveTo(32, 40); ctx.quadraticCurveTo(32, 26, 49, 25); ctx.quadraticCurveTo(67, 27, 67, 43); ctx.lineTo(65, 51); ctx.lineTo(60, 34); ctx.lineTo(38, 34); ctx.lineTo(34, 54); ctx.lineTo(31, 49); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#edcf75'; ctx.fillRect(36, 29, 22, 3);
      // ponytail
      ctx.fillStyle = '#c9a044';
      ctx.beginPath(); ctx.moveTo(63, 31); ctx.quadraticCurveTo(78, 38, 73, 58); ctx.lineTo(66, 54); ctx.quadraticCurveTo(70, 41, 60, 36); ctx.closePath(); ctx.fill();
      // helmet
      ctx.fillStyle = '#d7edf9';
      ctx.beginPath(); ctx.moveTo(31, 33); ctx.lineTo(36, 20); ctx.lineTo(57, 19); ctx.lineTo(68, 31); ctx.lineTo(67, 37); ctx.lineTo(31, 37); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a9cee2'; ctx.fillRect(31, 33, 37, 5);
      ctx.fillStyle = '#5da8d2';
      ctx.beginPath(); ctx.moveTo(45, 19); ctx.lineTo(53, 19); ctx.lineTo(51, 9); ctx.lineTo(47, 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eaf8ff'; ctx.fillRect(33, 24, 30, 3);
      // cheek guards
      ctx.fillStyle = '#c1dce9'; ctx.fillRect(28, 33, 5, 16); ctx.fillRect(65, 33, 5, 14);
      ctx.fillStyle = '#8bb9d0'; ctx.fillRect(28, 46, 4, 3); ctx.fillRect(66, 44, 3, 3);
      ctx.restore();
      return;
    }

    if (who === 'bandit') {
      ctx.fillStyle = '#2b2019'; ctx.beginPath(); ctx.moveTo(14, 96); ctx.quadraticCurveTo(19, 70, 39, 65); ctx.lineTo(60, 65); ctx.quadraticCurveTo(80, 72, 84, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6d4a31'; ctx.beginPath(); ctx.moveTo(24, 96); ctx.lineTo(34, 75); ctx.lineTo(65, 76); ctx.lineTo(73, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#946843'; ctx.fillRect(40, 80, 20, 16);
      ctx.fillStyle = '#c99066'; ctx.fillRect(41, 60, 16, 13);
      ctx.fillStyle = '#d7a377'; ctx.beginPath(); ctx.moveTo(33, 35); ctx.lineTo(65, 35); ctx.lineTo(63, 55); ctx.quadraticCurveTo(55, 64, 46, 62); ctx.quadraticCurveTo(36, 57, 33, 48); ctx.closePath(); ctx.fill();
      // hood
      ctx.fillStyle = '#4b3427'; ctx.beginPath(); ctx.moveTo(26, 47); ctx.quadraticCurveTo(25, 24, 50, 21); ctx.quadraticCurveTo(75, 25, 71, 53); ctx.lineTo(64, 46); ctx.lineTo(62, 33); ctx.lineTo(37, 32); ctx.lineTo(33, 49); ctx.closePath(); ctx.fill();
      // bandana across mouth
      ctx.fillStyle = '#b8433d'; ctx.fillRect(31, 49, 36, 12);
      ctx.fillStyle = '#d05a4e'; ctx.fillRect(31, 49, 36, 3);
      ctx.fillStyle = '#8d312d'; ctx.fillRect(65, 52, 12, 6);
      ctx.fillStyle = '#3a241d'; ctx.fillRect(68, 54, 8, 2);
      // eyes
      ctx.fillStyle = '#f0d3b0'; ctx.fillRect(38, 42, 10, 5); ctx.fillRect(55, 41, 9, 5);
      ctx.fillStyle = '#241812'; ctx.fillRect(41, 44, 4, 2); ctx.fillRect(57, 43, 3, 2);
      ctx.fillStyle = '#7f2d29'; ctx.fillRect(34, 38, 10, 2); ctx.fillRect(55, 37, 11, 2);
      // scar
      ctx.fillStyle = '#a36a55'; ctx.fillRect(61, 38, 1, 8);
      ctx.restore();
      return;
    }

    if (who === 'chief') {
      ctx.fillStyle = '#2a1c18'; ctx.beginPath(); ctx.moveTo(8, 96); ctx.quadraticCurveTo(14, 68, 36, 63); ctx.lineTo(63, 63); ctx.quadraticCurveTo(84, 70, 90, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6b3b31'; ctx.beginPath(); ctx.moveTo(19, 96); ctx.lineTo(30, 72); ctx.lineTo(69, 72); ctx.lineTo(79, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#9a5543'; ctx.fillRect(36, 79, 25, 17);
      ctx.fillStyle = '#b87a50'; ctx.fillRect(40, 58, 18, 16);
      // face
      ctx.fillStyle = '#c99066'; ctx.beginPath(); ctx.moveTo(28, 33); ctx.lineTo(71, 33); ctx.lineTo(68, 57); ctx.quadraticCurveTo(57, 67, 45, 63); ctx.quadraticCurveTo(32, 56, 28, 45); ctx.closePath(); ctx.fill();
      // beard
      ctx.fillStyle = '#5f3927'; ctx.beginPath(); ctx.moveTo(33, 48); ctx.quadraticCurveTo(38, 64, 50, 72); ctx.quadraticCurveTo(62, 64, 65, 49); ctx.lineTo(58, 54); ctx.quadraticCurveTo(51, 59, 43, 54); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#74452f'; ctx.fillRect(42, 58, 18, 3);
      // brows eyes
      ctx.fillStyle = '#4b2c20'; ctx.fillRect(34, 39, 12, 3); ctx.fillRect(54, 38, 11, 3);
      ctx.fillStyle = '#1d1411'; ctx.fillRect(36, 44, 6, 3); ctx.fillRect(55, 43, 5, 3);
      ctx.fillStyle = '#e0b06a'; ctx.fillRect(38, 44, 1, 1); ctx.fillRect(56, 43, 1, 1);
      // scar
      ctx.fillStyle = '#9e5e4a'; ctx.fillRect(61, 36, 2, 12);
      // horned helmet
      ctx.fillStyle = '#4b4e52'; ctx.beginPath(); ctx.moveTo(24, 33); ctx.lineTo(30, 14); ctx.lineTo(49, 10); ctx.lineTo(70, 19); ctx.lineTo(78, 34); ctx.lineTo(70, 37); ctx.lineTo(28, 37); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#70757a'; ctx.fillRect(27, 30, 47, 5);
      ctx.fillStyle = '#3b3e42'; ctx.fillRect(31, 18, 34, 3);
      ctx.fillStyle = '#a33d34'; ctx.fillRect(46, 12, 6, 5);
      // horns
      ctx.fillStyle = '#d8cfb4';
      ctx.beginPath(); ctx.moveTo(26, 24); ctx.quadraticCurveTo(10, 21, 8, 8); ctx.quadraticCurveTo(18, 14, 31, 17); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(75, 24); ctx.quadraticCurveTo(90, 19, 91, 7); ctx.quadraticCurveTo(82, 15, 69, 17); ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }

    if (who === 'guard') {
      ctx.fillStyle = '#2a2626'; ctx.beginPath(); ctx.moveTo(13, 96); ctx.quadraticCurveTo(18, 70, 38, 65); ctx.lineTo(60, 65); ctx.quadraticCurveTo(82, 71, 86, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5b3a35'; ctx.beginPath(); ctx.moveTo(24, 96); ctx.lineTo(33, 74); ctx.lineTo(66, 74); ctx.lineTo(74, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7a4b42'; ctx.fillRect(39, 80, 20, 16);
      ctx.fillStyle = '#d0a071'; ctx.fillRect(40, 57, 18, 14);
      // helm
      ctx.fillStyle = '#5a5e63'; ctx.beginPath(); ctx.moveTo(28, 39); ctx.lineTo(32, 20); ctx.lineTo(50, 16); ctx.lineTo(68, 23); ctx.lineTo(73, 41); ctx.lineTo(69, 58); ctx.lineTo(28, 58); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7e848a'; ctx.fillRect(29, 36, 44, 5);
      ctx.fillStyle = '#2d2f32'; ctx.fillRect(34, 42, 34, 10);
      ctx.fillStyle = '#8f2f2a'; ctx.fillRect(46, 18, 6, 5);
      ctx.fillStyle = '#b7c0c7'; ctx.fillRect(36, 44, 12, 3); ctx.fillRect(54, 44, 11, 3);
      ctx.fillStyle = '#121416'; ctx.fillRect(39, 46, 7, 2); ctx.fillRect(56, 46, 6, 2);
      ctx.fillStyle = '#3e4145'; ctx.fillRect(28, 58, 44, 4);
      // red sash
      ctx.fillStyle = '#8f2f2a'; ctx.fillRect(31, 92, 34, 4);
      ctx.restore();
      return;
    }

    ctx.restore();
  }

  /* ============================================================
     BACKDROPS
     ============================================================ */
  function drawTitleBackground(ctx, w, h, t) {
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#07111e');
    sky.addColorStop(0.45, '#10283a');
    sky.addColorStop(0.72, '#1b3d4b');
    sky.addColorStop(1, '#0b1a20');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // stars
    for (let i = 0; i < 64; i++) {
      const x = hash(i, 1, 5) * w;
      const y = hash(i, 7, 9) * h * 0.6;
      const a = 0.18 + hash(i, 2, 3) * 0.55 + Math.sin(t * 1.5 + i) * 0.12;
      rect(ctx, x, y, hash(i, 4, 2) > 0.8 ? 2 : 1, 1, `rgba(214,236,250,${Math.max(0.05, a)})`);
    }

    // moon
    const mx = w * 0.74;
    const my = h * 0.24;
    const moonGlow = ctx.createRadialGradient(mx, my, 8, mx, my, 100);
    moonGlow.addColorStop(0, 'rgba(219,237,250,0.32)');
    moonGlow.addColorStop(0.4, 'rgba(154,203,232,0.1)');
    moonGlow.addColorStop(1, 'rgba(154,203,232,0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(mx - 110, my - 110, 220, 220);
    ellipse(ctx, mx, my, 30, 30, '#dcecf6');
    ellipse(ctx, mx - 7, my - 5, 26, 26, '#c9dfec');
    ellipse(ctx, mx + 7, my + 3, 6, 4, 'rgba(154,180,198,0.3)');
    ellipse(ctx, mx - 6, my + 10, 4, 3, 'rgba(154,180,198,0.26)');
    ellipse(ctx, mx - 14, my - 12, 9, 6, 'rgba(255,255,255,0.2)');

    // thin clouds
    for (let i = 0; i < 4; i++) {
      const cy = h * 0.18 + i * 26;
      const cx = ((t * (5 + i * 2) + i * 190) % (w + 240)) - 120;
      ctx.fillStyle = `rgba(143,190,214,${0.04 + i * 0.008})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 120 + i * 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // far mountains
    ctx.fillStyle = '#0c202b';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.66);
    for (let x = 0; x <= w; x += 40) {
      const y = h * 0.58 - hash(x, 3, 11) * 44;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // mid pines
    for (let i = 0; i < 22; i++) {
      const x = hash(i, 21, 8) * w;
      const y = h * 0.72 + hash(i, 4, 4) * 24;
      const s = 0.55 + hash(i, 8, 3) * 0.7;
      drawPine(ctx, x, y, hash(i, 3, 8), t * 0.2, s, '#183b32');
    }

    // distant camp glow
    const campX = w * 0.84;
    const campY = h * 0.76;
    const campGlow = ctx.createRadialGradient(campX, campY, 2, campX, campY, 68);
    campGlow.addColorStop(0, 'rgba(255,155,63,0.24)');
    campGlow.addColorStop(1, 'rgba(255,155,63,0)');
    ctx.fillStyle = campGlow;
    ctx.fillRect(campX - 80, campY - 80, 160, 160);
    drawTent(ctx, campX - 10, campY, 1, t);
    drawBanner(ctx, campX + 34, campY - 2, t);

    // foreground ground
    const ground = ctx.createLinearGradient(0, h * 0.72, 0, h);
    ground.addColorStop(0, '#132b27');
    ground.addColorStop(1, '#07100f');
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.78);
    ctx.quadraticCurveTo(w * 0.3, h * 0.72, w * 0.55, h * 0.8);
    ctx.quadraticCurveTo(w * 0.8, h * 0.88, w, h * 0.77);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // foreground pines / framing
    drawPine(ctx, w * 0.06, h * 0.94, 0.2, t * 0.4, 2.2);
    drawPine(ctx, w * 0.94, h * 0.96, 0.7, t * 0.3, 2.5);
    drawPine(ctx, w * 0.16, h * 1.02, 0.5, t * 0.3, 1.6);

    // Saphira silhouette-ish figure at lower left, looking toward camp
    drawSaphira(ctx, w * 0.26, h * 0.93, { dir: 'right', moving: false, t, scale: 2.3, sword: true });
    // ground shadow/mist
    ctx.fillStyle = 'rgba(122,177,177,0.045)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.82, w * 0.45, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // grass foreground blades
    for (let i = 0; i < 88; i++) {
      const x = hash(i, 31, 2) * w;
      const y = h * 0.88 + hash(i, 12, 7) * h * 0.12;
      rect(ctx, x, y, 1, 3 + hash(i, 5, 1) * 7, 'rgba(40,86,68,0.8)');
    }

    // fireflies
    for (let i = 0; i < 16; i++) {
      const x = hash(i, 44, 3) * w + Math.sin(t * 0.7 + i * 2.1) * 14;
      const y = h * 0.5 + hash(i, 9, 4) * h * 0.38 + Math.cos(t * 0.55 + i) * 8;
      const a = 0.25 + Math.sin(t * 2 + i * 1.7) * 0.22;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, `rgba(255,229,151,${Math.max(0.05, a)})`);
      g.addColorStop(1, 'rgba(255,229,151,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 8, y - 8, 16, 16);
    }
  }

  function drawBattleBackground(ctx, w, h, t, boss) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    if (boss) {
      sky.addColorStop(0, '#150d12');
      sky.addColorStop(0.45, '#2a161c');
      sky.addColorStop(0.78, '#42251f');
      sky.addColorStop(1, '#1a0f0c');
    } else {
      sky.addColorStop(0, '#0b1b2a');
      sky.addColorStop(0.48, '#1c3d4b');
      sky.addColorStop(0.8, '#2b5345');
      sky.addColorStop(1, '#13251d');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // moon / camp glow
    if (boss) {
      const gx = w * 0.78;
      const gy = h * 0.5;
      const g = ctx.createRadialGradient(gx, gy, 4, gx, gy, 180);
      g.addColorStop(0, 'rgba(255,128,48,0.28)');
      g.addColorStop(1, 'rgba(255,128,48,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - 190, gy - 190, 380, 380);
      drawTent(ctx, w * 0.8, h * 0.48, 0.3, t);
      drawBanner(ctx, w * 0.62, h * 0.49, t);
      drawCampfire(ctx, w * 0.8, h * 0.55, t);
    } else {
      const gx = w * 0.72;
      const gy = h * 0.2;
      const g = ctx.createRadialGradient(gx, gy, 10, gx, gy, 130);
      g.addColorStop(0, 'rgba(198,226,240,0.22)');
      g.addColorStop(1, 'rgba(198,226,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(gx - 140, gy - 140, 280, 280);
      ellipse(ctx, gx, gy, 24, 24, '#cfe3ee');
    }

    // mist bands
    for (let i = 0; i < 3; i++) {
      const y = h * 0.35 + i * 28;
      ctx.fillStyle = `rgba(180,215,224,${0.035 + i * 0.01})`;
      ctx.beginPath();
      ctx.ellipse(((t * (9 + i * 4) + i * 240) % (w + 300)) - 150, y, 170 + i * 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // far forest wall
    for (let i = 0; i < 13; i++) {
      const x = hash(i, 12, 6) * w;
      const y = h * 0.58 + hash(i, 1, 7) * 18;
      drawPine(ctx, x, y, hash(i, 3, 9), t * 0.2, 0.8 + hash(i, 7, 2) * 0.6);
    }

    // side framing trunks
    drawTree(ctx, w * 0.05, h * 0.9, 0.2, t * 0.5, 1.9);
    drawTree(ctx, w * 0.96, h * 0.94, 0.8, t * 0.5, 2.1);

    // ground
    const ground = ctx.createLinearGradient(0, h * 0.6, 0, h);
    ground.addColorStop(0, boss ? '#38231c' : '#264d3b');
    ground.addColorStop(0.5, boss ? '#24160f' : '#1c392c');
    ground.addColorStop(1, boss ? '#100a07' : '#0d1c16');
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.68);
    ctx.quadraticCurveTo(w * 0.3, h * 0.63, w * 0.5, h * 0.67);
    ctx.quadraticCurveTo(w * 0.7, h * 0.71, w, h * 0.65);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // clearing ellipse
    ctx.fillStyle = boss ? 'rgba(80,48,27,0.28)' : 'rgba(56,98,69,0.28)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.86, w * 0.42, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    // grass tufts
    for (let i = 0; i < 60; i++) {
      const x = hash(i, 21, 3) * w;
      const y = h * 0.7 + hash(i, 5, 4) * h * 0.3;
      const c = boss ? '#5b3a28' : '#3e7050';
      rect(ctx, x, y, 1, 3 + hash(i, 2, 2) * 6, c);
    }

    // drifting leaves / embers
    for (let i = 0; i < 20; i++) {
      const x = (hash(i, 31, 4) * w + t * (7 + i % 4) * 2) % (w + 20) - 10;
      const y = h * 0.3 + hash(i, 8, 8) * h * 0.55 + Math.sin(t * 1.2 + i) * 8;
      const c = boss ? 'rgba(255,156,83,0.55)' : 'rgba(167,206,144,0.42)';
      rect(ctx, x, y, 2, 1, c);
    }
  }

  function drawVisionCone(ctx, guard, points, alert) {
    if (!points || points.length < 4) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.closePath();
    const g = ctx.createRadialGradient(guard.x, guard.y - 10, 4, guard.x, guard.y - 10, guard.range || 120);
    const col = alert > 0.65 ? '255,94,78' : alert > 0.25 ? '255,181,83' : '244,211,120';
    g.addColorStop(0, `rgba(${col},${0.14 + alert * 0.14})`);
    g.addColorStop(0.65, `rgba(${col},${0.07 + alert * 0.09})`);
    g.addColorStop(1, `rgba(${col},0.01)`);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = `rgba(${col},${0.1 + alert * 0.16})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }

  return {
    T,
    hash,
    rng,
    drawTile,
    drawBars,
    drawTree,
    drawPine,
    drawRock,
    drawBush,
    drawFlowers,
    drawTent,
    drawCampfire,
    drawSign,
    drawChest,
    drawCrate,
    drawBarrel,
    drawBanner,
    drawStump,
    drawTable,
    drawBed,
    drawBucket,
    drawTorch,
    drawChains,
    drawSwordRack,
    drawSaphira,
    drawBoundSaphira,
    drawBandit,
    drawGuard,
    drawChief,
    drawSlash,
    drawPortrait,
    drawTitleBackground,
    drawBattleBackground,
    drawVisionCone
  };
})();
