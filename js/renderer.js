import {
  WORLD, SOLIDS, LEDGES, LADDERS, ANCHORS, CHECKPOINTS, TORCHES, WINDOWS,
  BANNERS, BOOKSHELVES, PORTRAITS, CRATES, FLOOR_NAMES, floorIndexForY,
} from './level.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

function rr(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function makeStoneTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1430';
  g.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 12; row++) {
    const offset = row % 2 ? -54 : 0;
    for (let col = -1; col < 7; col++) {
      const x = col * 108 + offset;
      const y = row * 42;
      const shade = 10 + hash(row * 13 + col * 7) * 9;
      g.fillStyle = `hsl(258 22% ${shade}%)`;
      g.fillRect(x + 1.5, y + 1.5, 105, 39);
      g.strokeStyle = 'rgba(5,3,12,0.45)';
      g.lineWidth = 2;
      g.strokeRect(x + 1, y + 1, 107, 41);
      g.fillStyle = 'rgba(190,160,230,0.045)';
      g.fillRect(x + 3, y + 3, 101, 2);
    }
  }
  for (let i = 0; i < 190; i++) {
    const x = hash(i * 2.3) * 512;
    const y = hash(i * 5.7 + 3) * 512;
    const r = hash(i * 9.1) * 2.4;
    g.fillStyle = `rgba(${i % 3 ? '10,7,20' : '150,120,190'},${0.05 + hash(i) * 0.12})`;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
  for (let i = 0; i < 7; i++) {
    let x = hash(i * 7) * 512;
    let y = hash(i * 11) * 512;
    g.strokeStyle = 'rgba(6,4,14,0.45)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (hash(i * 3 + k) - 0.5) * 38;
      y += 8 + hash(i * 5 + k) * 25;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  return c;
}

function drawFlame(ctx, x, y, size, time, seed = 0) {
  const flick = Math.sin(time * 11 + seed) * 0.1 + Math.sin(time * 23 + seed * 2) * 0.06;
  const sway = Math.sin(time * 7.3 + seed * 1.7) * size * 0.16;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + flick, 1 - flick * 0.35);
  const grad = ctx.createRadialGradient(0, -size * 0.15, size * 0.04, 0, -size * 0.1, size);
  grad.addColorStop(0, '#fff7d0');
  grad.addColorStop(0.22, '#ffe08a');
  grad.addColorStop(0.55, '#f7a23a');
  grad.addColorStop(0.82, 'rgba(220,92,30,0.65)');
  grad.addColorStop(1, 'rgba(160,40,20,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.56);
  ctx.bezierCurveTo(-size * 0.52, size * 0.2, -size * 0.44 + sway, -size * 0.24, sway * 0.5, -size * 0.72);
  ctx.bezierCurveTo(size * 0.12 + sway, -size * 0.25, size * 0.5, size * 0.12, 0, size * 0.56);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,220,0.82)';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.1, size * 0.12, size * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawStar(ctx, x, y, r, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r);
  ctx.fill();
  ctx.restore();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.w = 1;
    this.h = 1;
    this.scale = 1;
    this.viewW = 1200;
    this.viewH = 800;
    this.camX = 0;
    this.camY = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.stone = makeStoneTexture();
    this.stonePattern = this.ctx.createPattern(this.stone, 'repeat');
    this.starField = Array.from({ length: 130 }, (_, i) => ({
      x: hash(i * 1.13),
      y: hash(i * 2.71 + 4) * 0.74,
      r: 0.4 + hash(i * 3.9) * 1.6,
      tw: hash(i * 5.3) * TAU,
      bright: 0.35 + hash(i * 7.7) * 0.65,
    }));
    this.motes = Array.from({ length: 58 }, (_, i) => ({
      x: hash(i * 4.1) * WORLD.w,
      y: 500 + hash(i * 6.3) * 1700,
      r: 0.8 + hash(i * 8.9) * 2.2,
      speed: 4 + hash(i * 3.3) * 11,
      phase: hash(i * 9.7) * TAU,
      drift: (hash(i * 2.2) - 0.5) * 16,
    }));
    this.petals = Array.from({ length: 18 }, (_, i) => ({
      x: hash(i * 3.7),
      y: hash(i * 8.3),
      s: 0.5 + hash(i * 4.4),
      speed: 0.01 + hash(i * 2.9) * 0.02,
      sway: hash(i * 7.1) * TAU,
    }));
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const aspect = this.w / this.h;
    if (aspect < 0.92) {
      this.scale = clamp(this.h / 980, 0.58, 1.2);
    } else {
      this.scale = clamp(Math.min(this.w / 1450, this.h / 900), 0.55, 1.32);
    }
    this.viewW = this.w / this.scale;
    this.viewH = this.h / this.scale;
  }

  info() {
    return {
      width: this.w,
      height: this.h,
      dpr: this.dpr,
      scale: this.scale,
      viewW: this.viewW,
      viewH: this.viewH,
    };
  }

  render(game, dt) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (game.state === 'menu') {
      this.drawMenu(game);
      return;
    }
    this.drawGame(game, dt);
  }

  worldToScreen(x, y) {
    return {
      x: (x - this.camX) * this.scale + this.w / 2 + this.shakeX,
      y: (y - this.camY) * this.scale + this.h / 2 + this.shakeY,
    };
  }

  inView(x, margin = 180) {
    return Math.abs(x - this.camX) < this.viewW / 2 + margin;
  }

  /* ================================================================
     Menu illustration
     ================================================================ */

  drawMenu(game) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const t = game.menuTime || 0;
    const portrait = h > w * 1.08;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05040e');
    sky.addColorStop(0.42, '#150d2e');
    sky.addColorStop(0.72, '#2c1a4b');
    sky.addColorStop(1, '#0d091d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (let i = 0; i < this.starField.length; i++) {
      const s = this.starField[i];
      const x = ((s.x * w * 1.15 - t * 3) % (w * 1.15) + w * 1.15) % (w * 1.15) - w * 0.07;
      const y = s.y * h;
      const tw = 0.58 + Math.sin(t * 1.7 + s.tw) * 0.42;
      ctx.globalAlpha = s.bright * tw * 0.8;
      ctx.fillStyle = i % 11 === 0 ? '#ffe3ad' : '#e8e5ff';
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, TAU);
      ctx.fill();
      if (s.r > 1.5) {
        ctx.globalAlpha *= 0.28;
        ctx.fillRect(x - s.r * 3, y - 0.4, s.r * 6, 0.8);
        ctx.fillRect(x - 0.4, y - s.r * 3, 0.8, s.r * 6);
      }
    }
    ctx.globalAlpha = 1;

    // Moon
    const moonX = portrait ? w * 0.76 : w * 0.78;
    const moonY = portrait ? h * 0.18 : h * 0.205;
    const moonR = Math.min(w, h) * (portrait ? 0.095 : 0.108);
    const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.5, moonX, moonY, moonR * 4.2);
    halo.addColorStop(0, 'rgba(255,229,175,0.26)');
    halo.addColorStop(0.42, 'rgba(223,191,255,0.1)');
    halo.addColorStop(1, 'rgba(120,90,200,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(moonX - moonR * 4.2, moonY - moonR * 4.2, moonR * 8.4, moonR * 8.4);

    const moon = ctx.createRadialGradient(moonX - moonR * 0.3, moonY - moonR * 0.35, moonR * 0.1, moonX, moonY, moonR);
    moon.addColorStop(0, '#fffdf0');
    moon.addColorStop(0.55, '#f7e7c2');
    moon.addColorStop(0.85, '#d8b98d');
    moon.addColorStop(1, '#b9956d');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,118,92,0.16)';
    ctx.beginPath();
    ctx.arc(moonX - moonR * 0.28, moonY - moonR * 0.16, moonR * 0.19, 0, TAU);
    ctx.arc(moonX + moonR * 0.3, moonY + moonR * 0.18, moonR * 0.13, 0, TAU);
    ctx.arc(moonX + moonR * 0.09, moonY - moonR * 0.42, moonR * 0.08, 0, TAU);
    ctx.fill();

    // Drifting clouds
    const clouds = [
      { x: 0.12, y: 0.3, w: 0.4, h: 0.05, a: 0.15, sp: 0.0016 },
      { x: 0.58, y: 0.22, w: 0.32, h: 0.04, a: 0.1, sp: -0.0011 },
      { x: 0.78, y: 0.34, w: 0.38, h: 0.06, a: 0.13, sp: 0.0008 },
      { x: 0.24, y: 0.46, w: 0.5, h: 0.05, a: 0.07, sp: -0.0006 },
    ];
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      const cx = ((c.x + t * c.sp) % 1.4 - 0.2) * w;
      const cy = c.y * h;
      const cw = c.w * w;
      const ch = c.h * h;
      const g = ctx.createRadialGradient(cx, cy, ch * 0.2, cx, cy, cw * 0.5);
      g.addColorStop(0, `rgba(151,130,196,${c.a})`);
      g.addColorStop(0.6, `rgba(112,95,163,${c.a * 0.55})`);
      g.addColorStop(1, 'rgba(80,65,130,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ch / cw * 2.4);
      ctx.beginPath();
      ctx.arc(0, 0, cw * 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Distant floating castle
    this.drawMenuCastle(w, h, portrait, t);

    // Horizon haze
    const haze = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.8);
    haze.addColorStop(0, 'rgba(120,92,170,0)');
    haze.addColorStop(0.55, 'rgba(83,57,122,0.28)');
    haze.addColorStop(1, 'rgba(22,13,38,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, h * 0.48, w, h * 0.34);

    // Rooftop
    const roofY = portrait ? h * 0.79 : h * 0.765;
    this.drawMenuRoof(w, h, roofY, portrait);

    // Thief
    const thiefX = portrait ? w * 0.72 : w * 0.735;
    const thiefScale = Math.min(w, h) * (portrait ? 0.0022 : 0.00195);
    this.drawThiefFigure(thiefX, roofY + 2, -1, thiefScale, {
      anim: t,
      moving: false,
      grounded: true,
      vy: 0,
      vx: 0,
      cloak: 0.5,
      active: true,
    });

    // Rope from her hand to a floating ring
    const ringX = portrait ? w * 0.38 : w * 0.53;
    const ringY = portrait ? h * 0.35 : h * 0.33;
    const handX = thiefX - 10 * thiefScale;
    const handY = roofY - 37 * thiefScale;
    ctx.save();
    ctx.strokeStyle = 'rgba(238,216,170,0.62)';
    ctx.lineWidth = Math.max(1, thiefScale * 0.9);
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.bezierCurveTo(handX - w * 0.05, handY - h * 0.12, ringX + w * 0.1, ringY + h * 0.16, ringX, ringY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,231,180,0.22)';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();

    // Floating gold ring
    const ringR = Math.min(w, h) * 0.021;
    const ringGlow = ctx.createRadialGradient(ringX, ringY, 0, ringX, ringY, ringR * 4);
    ringGlow.addColorStop(0, 'rgba(255,220,140,0.38)');
    ringGlow.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = ringGlow;
    ctx.fillRect(ringX - ringR * 4, ringY - ringR * 4, ringR * 8, ringR * 8);
    ctx.strokeStyle = '#ffd479';
    ctx.lineWidth = Math.max(1.4, ringR * 0.22);
    ctx.beginPath();
    ctx.ellipse(ringX, ringY, ringR, ringR * 0.9, Math.sin(t * 0.7) * 0.12, 0, TAU);
    ctx.stroke();
    drawStar(ctx, ringX, ringY - ringR * 1.8, ringR * 0.35, '#fff4c9', 0.8 + Math.sin(t * 2.2) * 0.2);

    // Warm window with a watching princess
    const winX = portrait ? w * 0.86 : w * 0.9;
    const winY = portrait ? h * 0.55 : h * 0.58;
    this.drawMenuWindow(winX, winY, portrait, t);

    // Fireflies / petals
    for (let i = 0; i < 26; i++) {
      const fx = ((hash(i * 2.1) * w + t * (8 + hash(i) * 15)) % (w + 40)) - 20;
      const fy = (hash(i * 5.7) * h + Math.sin(t * (0.4 + hash(i * 3.1)) + i) * 26) % h;
      const a = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i * 3.4));
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = i % 3 ? '#ffd479' : '#9ff3e1';
      ctx.beginPath();
      ctx.arc(fx, fy, 0.9 + hash(i * 7.7) * 1.5, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Soft foreground vignette to keep menu text readable.
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(3,2,9,0)');
    vig.addColorStop(0.66, 'rgba(3,2,9,0.18)');
    vig.addColorStop(1, 'rgba(3,2,9,0.72)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (portrait) {
      const bottom = ctx.createLinearGradient(0, h * 0.42, 0, h);
      bottom.addColorStop(0, 'rgba(5,4,12,0)');
      bottom.addColorStop(0.5, 'rgba(5,4,12,0.3)');
      bottom.addColorStop(1, 'rgba(5,4,12,0.84)');
      ctx.fillStyle = bottom;
      ctx.fillRect(0, h * 0.4, w, h * 0.6);
    }
  }

  drawMenuCastle(w, h, portrait, t) {
    const ctx = this.ctx;
    const base = portrait ? h * 0.74 : h * 0.705;
    ctx.save();
    // Far islands
    ctx.fillStyle = 'rgba(13,9,28,0.8)';
    ctx.beginPath();
    ctx.moveTo(w * 0.48, base);
    ctx.lineTo(w * 0.63, base - h * 0.02);
    ctx.lineTo(w * 0.79, base - h * 0.008);
    ctx.lineTo(w * 0.95, base + h * 0.015);
    ctx.lineTo(w * 0.99, base + h * 0.06);
    ctx.lineTo(w * 0.53, base + h * 0.05);
    ctx.closePath();
    ctx.fill();

    const towers = [
      { x: 0.56, y: base - h * 0.02, w: 0.052, h: 0.15, spire: 0.07 },
      { x: 0.63, y: base - h * 0.018, w: 0.075, h: 0.22, spire: 0.09 },
      { x: 0.72, y: base - h * 0.01, w: 0.05, h: 0.12, spire: 0.06 },
      { x: 0.82, y: base - h * 0.002, w: 0.068, h: 0.17, spire: 0.075 },
      { x: 0.9, y: base + h * 0.008, w: 0.043, h: 0.1, spire: 0.05 },
    ];
    for (let i = 0; i < towers.length; i++) {
      const tw = towers[i];
      const twPx = tw.w * w;
      const th = tw.h * h;
      const x = tw.x * w;
      const y = tw.y;
      const body = ctx.createLinearGradient(x, y - th, x, y);
      body.addColorStop(0, 'rgba(28,20,54,0.98)');
      body.addColorStop(1, 'rgba(9,7,20,0.98)');
      ctx.fillStyle = body;
      ctx.fillRect(x - twPx / 2, y - th, twPx, th);
      // Spire
      ctx.beginPath();
      ctx.moveTo(x - twPx * 0.62, y - th);
      ctx.lineTo(x, y - th - tw.spire * h);
      ctx.lineTo(x + twPx * 0.62, y - th);
      ctx.closePath();
      ctx.fill();
      // Moonlit edge
      ctx.strokeStyle = 'rgba(176,150,224,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - twPx / 2, y - th);
      ctx.lineTo(x - twPx / 2, y);
      ctx.stroke();
      // Windows
      const rows = Math.max(2, Math.floor(th / (h * 0.035)));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < 2; c++) {
          if (hash(i * 17 + r * 5 + c) < 0.35) continue;
          const wx = x - twPx * 0.24 + c * twPx * 0.38;
          const wy = y - th + th * (0.15 + r * 0.14);
          const lit = hash(i * 11 + r * 3 + c * 7) > 0.36;
          ctx.fillStyle = lit ? 'rgba(255,203,111,0.72)' : 'rgba(88,74,128,0.25)';
          ctx.fillRect(wx, wy, Math.max(1.2, twPx * 0.11), Math.max(2.6, th * 0.018));
          if (lit) {
            ctx.fillStyle = 'rgba(255,190,90,0.08)';
            ctx.fillRect(wx - 2, wy - 2, Math.max(5, twPx * 0.2), Math.max(7, th * 0.03));
          }
        }
      }
    }

    // Floating rock under the castle
    ctx.fillStyle = 'rgba(8,6,17,0.95)';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, base + h * 0.02);
    ctx.lineTo(w * 0.96, base + h * 0.025);
    ctx.lineTo(w * 0.86, base + h * 0.09);
    ctx.lineTo(w * 0.74, base + h * 0.115);
    ctx.lineTo(w * 0.61, base + h * 0.07);
    ctx.closePath();
    ctx.fill();
    // A few dangling little stones
    for (let i = 0; i < 8; i++) {
      const sx = w * (0.6 + hash(i * 4.2) * 0.3);
      const sy = base + h * (0.07 + hash(i * 7.1) * 0.08);
      const sz = 1 + hash(i * 9.4) * 4;
      ctx.fillStyle = 'rgba(8,6,17,0.9)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + Math.sin(t * 0.5 + i) * 2, sz, sz * 1.6, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawMenuRoof(w, h, roofY, portrait) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, roofY, 0, h);
    grad.addColorStop(0, '#221735');
    grad.addColorStop(0.12, '#171026');
    grad.addColorStop(1, '#080611');
    ctx.fillStyle = grad;
    ctx.fillRect(0, roofY, w, h - roofY);
    // Top lip
    ctx.fillStyle = '#3b2a55';
    ctx.fillRect(0, roofY, w, Math.max(2, h * 0.004));
    ctx.fillStyle = 'rgba(255,212,121,0.25)';
    ctx.fillRect(0, roofY, w, 1);
    // Stone joints
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1;
    for (let y = roofY + h * 0.04; y < h; y += h * 0.045) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Crenellations at the far left
    const crenW = Math.max(18, w * 0.026);
    const crenH = Math.max(10, h * 0.022);
    for (let x = -crenW; x < w * 0.42; x += crenW * 1.9) {
      ctx.fillStyle = '#2c1f42';
      ctx.fillRect(x, roofY - crenH, crenW, crenH);
      ctx.fillStyle = 'rgba(255,212,121,0.14)';
      ctx.fillRect(x, roofY - crenH, crenW, 1);
    }
    // Gentle moonlit gleam
    const gleam = ctx.createLinearGradient(w * 0.62, roofY, w * 0.82, h);
    gleam.addColorStop(0, 'rgba(255,220,170,0.09)');
    gleam.addColorStop(1, 'rgba(255,220,170,0)');
    ctx.fillStyle = gleam;
    ctx.fillRect(w * 0.55, roofY, w * 0.45, h - roofY);
    this.ctx.globalAlpha = 1;
  }

  drawMenuWindow(x, y, portrait, t) {
    const ctx = this.ctx;
    const ww = Math.min(this.w, this.h) * (portrait ? 0.08 : 0.06);
    const wh = ww * 1.7;
    ctx.save();
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, wh * 2);
    glow.addColorStop(0, 'rgba(255,198,104,0.22)');
    glow.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-wh * 2, -wh * 2, wh * 4, wh * 4);
    ctx.fillStyle = '#0b0716';
    ctx.fillRect(-ww / 2 - 4, -wh / 2 - 4, ww + 8, wh + 8);
    const warm = ctx.createLinearGradient(0, -wh / 2, 0, wh / 2);
    warm.addColorStop(0, '#ffe5a1');
    warm.addColorStop(0.55, '#f2b65e');
    warm.addColorStop(1, '#a96335');
    ctx.fillStyle = warm;
    ctx.fillRect(-ww / 2, -wh / 2, ww, wh);
    // Princess silhouette
    ctx.fillStyle = 'rgba(47,26,38,0.86)';
    ctx.beginPath();
    ctx.arc(0, -wh * 0.13, ww * 0.12, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-ww * 0.24, wh * 0.5);
    ctx.quadraticCurveTo(-ww * 0.2, -wh * 0.02, 0, -wh * 0.02);
    ctx.quadraticCurveTo(ww * 0.2, -wh * 0.02, ww * 0.26, wh * 0.5);
    ctx.closePath();
    ctx.fill();
    // Crown glint
    ctx.fillStyle = '#fff0b8';
    ctx.beginPath();
    ctx.moveTo(-ww * 0.09, -wh * 0.23);
    ctx.lineTo(0, -wh * 0.29);
    ctx.lineTo(ww * 0.09, -wh * 0.23);
    ctx.lineTo(ww * 0.04, -wh * 0.2);
    ctx.lineTo(-ww * 0.05, -wh * 0.2);
    ctx.closePath();
    ctx.fill();
    // Mullions
    ctx.strokeStyle = 'rgba(32,20,38,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -wh / 2);
    ctx.lineTo(0, wh / 2);
    ctx.moveTo(-ww / 2, -wh * 0.05);
    ctx.lineTo(ww / 2, -wh * 0.05);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,239,197,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-ww / 2, -wh / 2, ww, wh);
    ctx.restore();
    // Dust in the light
    ctx.fillStyle = 'rgba(255,238,190,0.5)';
    for (let i = 0; i < 5; i++) {
      const a = t * 0.3 + i * 1.7;
      ctx.globalAlpha = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(a));
      ctx.beginPath();
      ctx.arc(x + Math.sin(a) * ww * 0.4, y + Math.cos(a * 0.7) * wh * 0.4, 1, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ================================================================
     In-game rendering
     ================================================================ */

  drawGame(game, dt) {
    const ctx = this.ctx;
    const halfW = this.viewW / 2;
    const halfH = this.viewH / 2;
    this.camX = WORLD.w > this.viewW ? clamp(game.cam.x, halfW, WORLD.w - halfW) : WORLD.w / 2;
    this.camY = WORLD.h > this.viewH ? clamp(game.cam.y, halfH, WORLD.h - halfH) : WORLD.h / 2;

    const reduced = game.input?.reducedMotion;
    const shake = reduced ? 0 : game.shake;
    this.shakeX = (Math.random() - 0.5) * shake * 1.4;
    this.shakeY = (Math.random() - 0.5) * shake * 1.1;

    this.drawSky(game);

    ctx.save();
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.camX, -this.camY);

    this.drawKeepBack(game);
    this.drawWindows(game);
    this.drawLightShafts(game);
    this.drawFloors(game);
    this.drawLedges(game);
    this.drawDecor(game);
    this.drawLadders(game);
    this.drawTorches(game);
    this.drawCheckpoints(game);
    this.drawAnchors(game);
    this.drawPortal(game);
    this.drawVisionCones(game);
    this.drawGuards(game);
    this.drawPrincesses(game);
    this.drawPlayer(game);
    this.drawRopes(game);
    this.drawParticles(game);
    this.drawForegroundMotes(game);

    ctx.restore();

    this.drawLighting(game);
    this.drawScreenEffects(game, dt);
  }

  drawSky(game) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const t = game.clock || 0;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05040f');
    sky.addColorStop(0.45, '#120c28');
    sky.addColorStop(0.78, '#24163f');
    sky.addColorStop(1, '#0b0818');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Stars in gentle parallax.
    const px = (this.camX - 1400) * 0.02;
    for (let i = 0; i < this.starField.length; i++) {
      const s = this.starField[i];
      let x = ((s.x * w - px) % w + w) % w;
      const y = s.y * h;
      const tw = 0.55 + Math.sin(t * 1.3 + s.tw) * 0.45;
      ctx.globalAlpha = s.bright * tw * 0.72;
      ctx.fillStyle = i % 13 === 0 ? '#ffe2aa' : '#e9e6ff';
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, TAU);
      ctx.fill();
      if (s.r > 1.55) {
        ctx.globalAlpha *= 0.24;
        ctx.fillRect(x - s.r * 2.8, y - 0.4, s.r * 5.6, 0.8);
        ctx.fillRect(x - 0.4, y - s.r * 2.8, 0.8, s.r * 5.6);
      }
    }
    ctx.globalAlpha = 1;

    // Moon fixed to the sky, with a soft lavender halo.
    const moonX = w * (w < h ? 0.78 : 0.77) - (this.camX - 1400) * 0.012;
    const moonY = h * (w < h ? 0.15 : 0.185);
    const moonR = Math.min(w, h) * (w < h ? 0.075 : 0.095);
    const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 4.6);
    halo.addColorStop(0, 'rgba(255,230,180,0.24)');
    halo.addColorStop(0.4, 'rgba(210,186,255,0.09)');
    halo.addColorStop(1, 'rgba(110,88,190,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(moonX - moonR * 4.6, moonY - moonR * 4.6, moonR * 9.2, moonR * 9.2);

    const moon = ctx.createRadialGradient(moonX - moonR * 0.34, moonY - moonR * 0.36, moonR * 0.08, moonX, moonY, moonR);
    moon.addColorStop(0, '#fffdf0');
    moon.addColorStop(0.62, '#f5e4c0');
    moon.addColorStop(0.9, '#d6b78c');
    moon.addColorStop(1, '#b8956e');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(146,113,89,0.14)';
    ctx.beginPath();
    ctx.arc(moonX - moonR * 0.26, moonY - moonR * 0.12, moonR * 0.17, 0, TAU);
    ctx.arc(moonX + moonR * 0.25, moonY + moonR * 0.2, moonR * 0.11, 0, TAU);
    ctx.arc(moonX + moonR * 0.02, moonY + moonR * 0.42, moonR * 0.07, 0, TAU);
    ctx.fill();

    // Horizon skyline appears above the keep roof.
    const horizon = this.worldToScreen(0, 420).y;
    if (horizon > -260 && horizon < h + 100) {
      const shift = (this.camX - 1400) * 0.08;
      this.drawHorizon(horizon, shift, t);
    }

    // Thin clouds.
    for (let i = 0; i < 5; i++) {
      const cx = ((hash(i * 3.1) * w + t * (4 + i * 2) - (this.camX - 1400) * 0.03) % (w + 500)) - 250;
      const cy = h * (0.1 + hash(i * 4.7) * 0.42);
      const cw = w * (0.22 + hash(i * 2.3) * 0.3);
      const ch = Math.max(10, h * 0.022);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.5);
      g.addColorStop(0, 'rgba(140,118,186,0.09)');
      g.addColorStop(0.6, 'rgba(95,78,150,0.05)');
      g.addColorStop(1, 'rgba(70,58,120,0)');
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ch / (cw * 0.5) * 2.2);
      ctx.beginPath();
      ctx.arc(0, 0, cw * 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawHorizon(horizon, shift, t) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    ctx.save();
    // Far mountains.
    ctx.fillStyle = 'rgba(16,11,34,0.8)';
    ctx.beginPath();
    ctx.moveTo(-100, horizon + 34);
    for (let i = 0; i <= 12; i++) {
      const x = -100 + (w + 200) * (i / 12);
      const peak = horizon - 30 - hash(i * 6.3) * h * 0.1 - Math.sin(i * 0.9) * 24;
      ctx.lineTo(x + shift * 0.25, peak);
    }
    ctx.lineTo(w + 100, horizon + 34);
    ctx.closePath();
    ctx.fill();

    // Floating islands and distant towers.
    const bases = [
      { x: 0.58, y: horizon - h * 0.03, w: 0.16, h: 0.05 },
      { x: 0.82, y: horizon - h * 0.005, w: 0.12, h: 0.035 },
      { x: 0.34, y: horizon + h * 0.01, w: 0.1, h: 0.03 },
    ];
    for (let i = 0; i < bases.length; i++) {
      const b = bases[i];
      const bx = b.x * w + shift * 0.12;
      const by = b.y;
      const bw = b.w * w;
      ctx.fillStyle = '#0c081a';
      ctx.beginPath();
      ctx.moveTo(bx - bw * 0.5, by);
      ctx.lineTo(bx + bw * 0.5, by);
      ctx.lineTo(bx + bw * 0.3, by + b.h * h);
      ctx.lineTo(bx - bw * 0.12, by + b.h * h * 1.15);
      ctx.closePath();
      ctx.fill();
      const tw = bw * 0.12;
      const th = h * (0.07 + hash(i * 7.1) * 0.05);
      ctx.fillRect(bx - tw / 2, by - th, tw, th);
      ctx.beginPath();
      ctx.moveTo(bx - tw * 0.7, by - th);
      ctx.lineTo(bx, by - th - h * 0.035);
      ctx.lineTo(bx + tw * 0.7, by - th);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,201,110,0.5)';
      for (let k = 0; k < 3; k++) {
        if (hash(i * 13 + k) < 0.38) continue;
        ctx.fillRect(bx - tw * 0.2 + k * tw * 0.28, by - th * (0.25 + k * 0.2), 1.5, 2.2);
      }
    }
    // A faint bridge between islands.
    ctx.strokeStyle = 'rgba(16,11,34,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.42 + shift * 0.12, horizon - h * 0.01);
    ctx.quadraticCurveTo(w * 0.58 + shift * 0.12, horizon - h * 0.04, w * 0.74 + shift * 0.12, horizon - h * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  drawKeepBack(game) {
    const ctx = this.ctx;
    ctx.save();
    // Stone wall body.
    const wall = ctx.createLinearGradient(0, 400, 0, 2300);
    wall.addColorStop(0, 'rgba(17,12,34,0.96)');
    wall.addColorStop(0.36, 'rgba(20,14,40,0.98)');
    wall.addColorStop(0.75, 'rgba(13,10,28,0.99)');
    wall.addColorStop(1, 'rgba(8,6,18,0.99)');
    ctx.fillStyle = wall;
    ctx.fillRect(-80, 400, WORLD.w + 160, 1920);

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = this.stonePattern;
    ctx.fillRect(-80, 400, WORLD.w + 160, 1920);
    ctx.globalAlpha = 1;

    // Broad side shadows.
    const leftShadow = ctx.createLinearGradient(0, 0, 320, 0);
    leftShadow.addColorStop(0, 'rgba(2,1,8,0.55)');
    leftShadow.addColorStop(1, 'rgba(2,1,8,0)');
    ctx.fillStyle = leftShadow;
    ctx.fillRect(-80, 400, 420, 1920);
    const rightShadow = ctx.createLinearGradient(WORLD.w, 0, WORLD.w - 300, 0);
    rightShadow.addColorStop(0, 'rgba(2,1,8,0.5)');
    rightShadow.addColorStop(1, 'rgba(2,1,8,0)');
    ctx.fillStyle = rightShadow;
    ctx.fillRect(WORLD.w - 320, 400, 400, 1920);

    // Deep arch recesses in each bay.
    const floorTops = [2050, 1600, 1150, 700, 420];
    for (let f = 0; f < 4; f++) {
      const top = floorTops[f] - 350;
      const bottom = floorTops[f] - 24;
      for (let x = 40; x < WORLD.w; x += 450) {
        if (!this.inView(x + 150, 400)) continue;
        const bw = 300;
        ctx.beginPath();
        ctx.moveTo(x, bottom);
        ctx.lineTo(x, top + 80);
        ctx.quadraticCurveTo(x + bw / 2, top - 40, x + bw, top + 80);
        ctx.lineTo(x + bw, bottom);
        ctx.closePath();
        ctx.fillStyle = 'rgba(5,3,13,0.19)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(104,84,148,0.09)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Pilasters.
    for (let x = 90; x < WORLD.w; x += 520) {
      if (!this.inView(x, 260)) continue;
      const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
      g.addColorStop(0, 'rgba(5,3,12,0.24)');
      g.addColorStop(0.48, 'rgba(50,37,79,0.24)');
      g.addColorStop(0.6, 'rgba(124,98,170,0.12)');
      g.addColorStop(1, 'rgba(5,3,12,0.26)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 26, 405, 52, 1900);
      ctx.fillStyle = 'rgba(154,124,196,0.1)';
      ctx.fillRect(x - 27, 405, 2, 1900);
      // Capitals at each floor.
      for (const fy of floorTops) {
        if (fy < 420) continue;
        ctx.fillStyle = 'rgba(32,23,56,0.9)';
        ctx.fillRect(x - 36, fy - 26, 72, 12);
        ctx.fillStyle = 'rgba(178,142,92,0.22)';
        ctx.fillRect(x - 36, fy - 27, 72, 1.5);
      }
    }

    // Gold floor trim lines on the back wall.
    for (const fy of floorTops) {
      if (fy < 420) continue;
      ctx.fillStyle = 'rgba(181,134,74,0.15)';
      ctx.fillRect(0, fy - 5, WORLD.w, 1.5);
      ctx.fillStyle = 'rgba(8,5,16,0.32)';
      ctx.fillRect(0, fy - 3, WORLD.w, 3);
    }
    ctx.restore();
  }

  drawWindows(game) {
    const ctx = this.ctx;
    const floorTops = [2050, 1600, 1150, 700, 420];
    for (let i = 0; i < WINDOWS.length; i++) {
      const win = WINDOWS[i];
      if (!this.inView(win.x, 180)) continue;
      const floorTop = floorTops[win.floor];
      this.drawWindow(win.x, floorTop - 36, floorTop - 338, 122, game.clock, i);
    }
    this.drawRoseWindow(1745, 985, 96, game.clock);
  }

  drawWindow(cx, bottom, top, width, time, seed) {
    const ctx = this.ctx;
    const half = width / 2;
    const archY = top + half;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - half, bottom);
    ctx.lineTo(cx - half, archY);
    ctx.arc(cx, archY, half, Math.PI, 0);
    ctx.lineTo(cx + half, bottom);
    ctx.closePath();
    // Night sky inside.
    const sky = ctx.createLinearGradient(0, top, 0, bottom);
    sky.addColorStop(0, '#1b1646');
    sky.addColorStop(0.55, '#2b1b55');
    sky.addColorStop(1, '#5a3563');
    ctx.fillStyle = sky;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // Stars
    for (let i = 0; i < 18; i++) {
      const sx = cx - half + hash(seed * 17 + i * 3.1) * width;
      const sy = top + hash(seed * 11 + i * 5.7) * (bottom - top) * 0.8;
      const a = 0.28 + 0.6 * (0.5 + 0.5 * Math.sin(time * 1.7 + i * 2.3));
      ctx.globalAlpha = a;
      ctx.fillStyle = i % 5 ? '#f2ecff' : '#ffe3ab';
      ctx.fillRect(sx, sy, 1.2 + hash(i) * 1.3, 1.2 + hash(i) * 1.3);
    }
    ctx.globalAlpha = 1;
    // A far tower or two.
    ctx.fillStyle = 'rgba(20,13,38,0.72)';
    for (let i = 0; i < 3; i++) {
      const tx = cx - half + width * (0.14 + i * 0.31);
      const tw = 9 + hash(seed + i) * 8;
      const th = 30 + hash(seed * 3 + i) * 46;
      ctx.fillRect(tx, bottom - th, tw, th);
      ctx.beginPath();
      ctx.moveTo(tx - 3, bottom - th);
      ctx.lineTo(tx + tw / 2, bottom - th - 14);
      ctx.lineTo(tx + tw + 3, bottom - th);
      ctx.closePath();
      ctx.fill();
    }
    // Moon in a couple of windows.
    if ((seed === 2 || seed === 7)) {
      const mx = cx + half * 0.34;
      const my = top + (bottom - top) * 0.26;
      const mr = Math.min(18, width * 0.15);
      const halo = ctx.createRadialGradient(mx, my, mr * 0.3, mx, my, mr * 3.6);
      halo.addColorStop(0, 'rgba(255,232,180,0.35)');
      halo.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(mx - mr * 3.6, my - mr * 3.6, mr * 7.2, mr * 7.2);
      ctx.fillStyle = '#f8e9c8';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TAU);
      ctx.fill();
    }
    // Leaded glass pattern.
    ctx.strokeStyle = 'rgba(12,8,24,0.28)';
    ctx.lineWidth = 1;
    for (let x = cx - half; x < cx + half; x += 21) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    for (let y = top + 30; y < bottom; y += 38) {
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
    }
    // Rain streaks.
    ctx.strokeStyle = 'rgba(170,190,255,0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const rx = cx - half + hash(seed * 6 + i) * width;
      const ry = top + ((time * 90 + i * 53) % (bottom - top));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 14);
      ctx.stroke();
    }
    ctx.restore();

    // Mullions and frame.
    ctx.strokeStyle = 'rgba(24,16,46,0.92)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(cx, archY);
    ctx.lineTo(cx, bottom);
    ctx.stroke();
    ctx.lineWidth = 3.4;
    for (let y = top + 58; y < bottom - 20; y += 64) {
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(63,48,99,0.95)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx - half, bottom);
    ctx.lineTo(cx - half, archY);
    ctx.arc(cx, archY, half, Math.PI, 0);
    ctx.lineTo(cx + half, bottom);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(151,122,196,0.2)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // Sill.
    ctx.fillStyle = '#31244b';
    ctx.fillRect(cx - half - 10, bottom, width + 20, 8);
    ctx.fillStyle = 'rgba(255,220,160,0.16)';
    ctx.fillRect(cx - half - 10, bottom, width + 20, 1.5);
    ctx.restore();
  }

  drawRoseWindow(cx, cy, r, time) {
    if (!this.inView(cx, r + 150)) return;
    const ctx = this.ctx;
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.4);
    glow.addColorStop(0, 'rgba(145,120,255,0.14)');
    glow.addColorStop(1, 'rgba(145,120,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
    ctx.fillStyle = '#0e0a1d';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3a2b58';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 9, 0, TAU);
    ctx.fill();
    const glass = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    glass.addColorStop(0, '#b89cff');
    glass.addColorStop(0.24, '#6b5bc4');
    glass.addColorStop(0.52, '#3f347e');
    glass.addColorStop(0.78, '#2a1f58');
    glass.addColorStop(1, '#171031');
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    // Petal tracery.
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(14,10,30,0.65)';
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + time * 0.02;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52, r * 0.24, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(250,224,157,0.62)';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.14, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,225,170,0.2)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 9, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawLightShafts(game) {
    const ctx = this.ctx;
    const floorTops = [2050, 1600, 1150, 700, 420];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const win of WINDOWS) {
      if (!this.inView(win.x, 240)) continue;
      const floorTop = floorTops[win.floor];
      const top = floorTop - 338;
      const bottom = floorTop - 30;
      const beam = ctx.createLinearGradient(win.x, top, win.x - 40, floorTop);
      beam.addColorStop(0, 'rgba(150,170,255,0.06)');
      beam.addColorStop(0.65, 'rgba(140,160,255,0.03)');
      beam.addColorStop(1, 'rgba(140,160,255,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(win.x - 58, top + 40);
      ctx.lineTo(win.x + 58, top + 40);
      ctx.lineTo(win.x + 112, floorTop + 30);
      ctx.lineTo(win.x - 138, floorTop + 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  drawFloors(game) {
    const ctx = this.ctx;
    for (const s of SOLIDS) {
      if (s.kind !== 'floor') continue;
      if (s.x > this.camX + this.viewW / 2 + 100 || s.x + s.w < this.camX - this.viewW / 2 - 100) continue;
      // Body
      const g = ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
      g.addColorStop(0, '#3b2c5c');
      g.addColorStop(0.12, '#292047');
      g.addColorStop(0.72, '#171128');
      g.addColorStop(1, '#0d0918');
      ctx.fillStyle = g;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      // Stone texture
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.x, s.y, s.w, s.h);
      ctx.clip();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = this.stonePattern;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.globalAlpha = 1;
      // Brick seams
      ctx.strokeStyle = 'rgba(5,3,12,0.34)';
      ctx.lineWidth = 1;
      const seam = 74;
      for (let row = 0; row < Math.ceil(s.h / 26); row++) {
        const yy = s.y + 12 + row * 26;
        if (yy > s.y + s.h) break;
        ctx.beginPath();
        ctx.moveTo(s.x, yy);
        ctx.lineTo(s.x + s.w, yy);
        ctx.stroke();
        const offset = row % 2 ? seam / 2 : 0;
        for (let x = s.x + offset; x < s.x + s.w; x += seam) {
          ctx.beginPath();
          ctx.moveTo(x, yy - 13);
          ctx.lineTo(x, yy);
          ctx.stroke();
        }
      }
      ctx.restore();
      // Top lip
      ctx.fillStyle = '#4a3869';
      ctx.fillRect(s.x, s.y - 4, s.w, 5);
      ctx.fillStyle = 'rgba(255,222,155,0.34)';
      ctx.fillRect(s.x, s.y - 4, s.w, 1.4);
      ctx.fillStyle = 'rgba(6,4,14,0.55)';
      ctx.fillRect(s.x, s.y + 1, s.w, 2);
      // Carpet runner on the inhabited floors
      if (s.floor < 4 && s.w > 260) {
        ctx.fillStyle = 'rgba(114,40,68,0.28)';
        ctx.fillRect(s.x + 50, s.y - 2, s.w - 100, 3);
        ctx.fillStyle = 'rgba(226,174,92,0.2)';
        ctx.fillRect(s.x + 50, s.y - 2, s.w - 100, 0.8);
      }
      // Corbels under the lip
      for (let x = s.x + 24; x < s.x + s.w - 20; x += 96) {
        const cg = ctx.createLinearGradient(x, s.y + s.h, x, s.y + s.h + 17);
        cg.addColorStop(0, 'rgba(49,37,82,0.8)');
        cg.addColorStop(1, 'rgba(12,8,24,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(x, s.y + s.h - 2);
        ctx.lineTo(x + 15, s.y + s.h - 2);
        ctx.lineTo(x + 21, s.y + s.h + 14);
        ctx.lineTo(x - 6, s.y + s.h + 14);
        ctx.closePath();
        ctx.fill();
      }
      // Broken rubble at open ends
      this.drawRubble(s);
    }
    // Roof parapet behind the roof play space.
    this.drawRoofParapet();
  }

  drawRubble(s) {
    const ctx = this.ctx;
    const neighbors = SOLIDS.filter((o) => o.kind === 'floor' && Math.abs(o.y - s.y) < 2 && o !== s);
    const leftOpen = !neighbors.some((o) => Math.abs(o.x + o.w - s.x) < 3);
    const rightOpen = !neighbors.some((o) => Math.abs(o.x - (s.x + s.w)) < 3);
    ctx.fillStyle = 'rgba(31,22,51,0.9)';
    if (leftOpen) {
      for (let i = 0; i < 3; i++) {
        const bw = 8 + hash(s.x + i) * 14;
        const bh = 5 + hash(s.y + i * 2) * 8;
        ctx.fillRect(s.x, s.y - bh, bw, bh);
      }
    }
    if (rightOpen) {
      for (let i = 0; i < 3; i++) {
        const bw = 8 + hash(s.x + i * 3.7) * 14;
        const bh = 5 + hash(s.y + i * 5.1) * 8;
        ctx.fillRect(s.x + s.w - bw, s.y - bh, bw, bh);
      }
    }
  }

  drawRoofParapet() {
    const ctx = this.ctx;
    // Low crenellated wall on the far side of the roof, behind the player.
    const start = 1680;
    const end = 2800;
    const y = 352;
    if (!this.inView((start + end) / 2, (end - start) / 2 + 200)) return;
    ctx.fillStyle = 'rgba(20,14,37,0.92)';
    ctx.fillRect(start, y, end - start, 68);
    ctx.fillStyle = 'rgba(58,43,88,0.65)';
    ctx.fillRect(start, y, end - start, 5);
    for (let x = start; x < end; x += 62) {
      ctx.fillStyle = 'rgba(34,25,56,0.95)';
      ctx.fillRect(x, y - 22, 36, 24);
      ctx.fillStyle = 'rgba(255,220,160,0.1)';
      ctx.fillRect(x, y - 22, 36, 1.5);
    }
    // A thin moonlit rim.
    ctx.fillStyle = 'rgba(255,231,180,0.07)';
    ctx.fillRect(start, y - 2, end - start, 1);
  }

  drawLedges(game) {
    const ctx = this.ctx;
    for (const l of LEDGES) {
      if (!this.inView(l.x + l.w / 2, l.w / 2 + 120)) continue;
      const g = ctx.createLinearGradient(0, l.y, 0, l.y + l.h + 12);
      g.addColorStop(0, '#453364');
      g.addColorStop(0.4, '#2a2045');
      g.addColorStop(1, '#120d24');
      ctx.fillStyle = g;
      ctx.fillRect(l.x, l.y, l.w, l.h);
      ctx.fillStyle = 'rgba(255,224,166,0.22)';
      ctx.fillRect(l.x, l.y, l.w, 1.4);
      ctx.fillStyle = 'rgba(6,4,14,0.5)';
      ctx.fillRect(l.x, l.y + l.h, l.w, 1.2);
      // Stone joints
      ctx.strokeStyle = 'rgba(5,3,12,0.35)';
      ctx.lineWidth = 1;
      for (let x = l.x + 24; x < l.x + l.w; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, l.y + 1);
        ctx.lineTo(x, l.y + l.h);
        ctx.stroke();
      }
      // Corbels
      for (let x = l.x + 12; x < l.x + l.w; x += 34) {
        ctx.fillStyle = 'rgba(26,19,46,0.8)';
        ctx.beginPath();
        ctx.moveTo(x, l.y + l.h);
        ctx.lineTo(x + 10, l.y + l.h);
        ctx.lineTo(x + 14, l.y + l.h + 10);
        ctx.lineTo(x - 2, l.y + l.h + 10);
        ctx.closePath();
        ctx.fill();
      }
      if (l.kind === 'balcony') {
        // Gold railing sitting on the ledge, behind the action.
        ctx.strokeStyle = 'rgba(196,153,83,0.62)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(l.x + 4, l.y - 26);
        ctx.lineTo(l.x + l.w - 4, l.y - 26);
        ctx.moveTo(l.x + 4, l.y - 9);
        ctx.lineTo(l.x + l.w - 4, l.y - 9);
        ctx.stroke();
        for (let x = l.x + 8; x < l.x + l.w - 4; x += 19) {
          ctx.beginPath();
          ctx.moveTo(x, l.y - 26);
          ctx.lineTo(x, l.y - 2);
          ctx.stroke();
        }
        for (let x = l.x + 4; x < l.x + l.w; x += 19) {
          ctx.fillStyle = 'rgba(255,207,121,0.45)';
          ctx.beginPath();
          ctx.arc(x, l.y - 28, 2, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  drawDecor(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    const floorTops = [2050, 1600, 1150, 700, 420];

    // Banners.
    for (let i = 0; i < BANNERS.length; i++) {
      const b = BANNERS[i];
      if (!this.inView(b.x, 120)) continue;
      const fy = floorTops[b.floor];
      const top = fy - 332;
      const h = 206;
      const w = 46;
      const sway = Math.sin(t * 1.15 + i * 1.7) * 3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(b.x - w / 2, top);
      ctx.lineTo(b.x + w / 2, top);
      ctx.quadraticCurveTo(b.x + w / 2 + sway, top + h * 0.6, b.x + w / 2 + sway * 1.4, top + h - 24);
      ctx.lineTo(b.x + sway * 1.5, top + h);
      ctx.lineTo(b.x - w / 2 + sway * 1.4, top + h - 24);
      ctx.quadraticCurveTo(b.x - w / 2 - sway, top + h * 0.6, b.x - w / 2, top);
      ctx.closePath();
      const bg = ctx.createLinearGradient(b.x - w / 2, top, b.x + w / 2, top + h);
      bg.addColorStop(0, b.color);
      bg.addColorStop(0.55, 'rgba(31,15,44,0.94)');
      bg.addColorStop(1, 'rgba(15,8,26,0.94)');
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,140,0.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Gold sigil
      ctx.save();
      ctx.translate(b.x, top + h * 0.42);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = 'rgba(255,211,124,0.5)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,220,150,0.5)';
      ctx.beginPath();
      ctx.arc(b.x, top + h * 0.42, 2.2, 0, TAU);
      ctx.fill();
      // Rod
      ctx.fillStyle = 'rgba(194,156,90,0.75)';
      ctx.fillRect(b.x - w / 2 - 8, top - 4, w + 16, 4);
      ctx.beginPath();
      ctx.arc(b.x - w / 2 - 8, top - 2, 3, 0, TAU);
      ctx.arc(b.x + w / 2 + 8, top - 2, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Portraits.
    for (let i = 0; i < PORTRAITS.length; i++) {
      const p = PORTRAITS[i];
      if (!this.inView(p.x, 80)) continue;
      const fy = floorTops[1];
      const top = fy - 286;
      const w = 57;
      const h = 74;
      ctx.fillStyle = 'rgba(8,6,16,0.5)';
      ctx.fillRect(p.x - w / 2 + 3, top + 4, w, h);
      ctx.fillStyle = '#3d2a30';
      ctx.fillRect(p.x - w / 2, top, w, h);
      ctx.strokeStyle = 'rgba(216,172,100,0.68)';
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x - w / 2 + 2, top + 2, w - 4, h - 4);
      const inner = ctx.createLinearGradient(p.x, top, p.x, top + h);
      inner.addColorStop(0, 'rgba(72,50,82,0.9)');
      inner.addColorStop(1, 'rgba(24,16,35,0.95)');
      ctx.fillStyle = inner;
      ctx.fillRect(p.x - w / 2 + 7, top + 7, w - 14, h - 14);
      // Painted figure
      ctx.fillStyle = 'rgba(19,13,30,0.85)';
      ctx.beginPath();
      ctx.arc(p.x, top + 30, 8, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(p.x - 14, top + h - 11);
      ctx.quadraticCurveTo(p.x - 11, top + 40, p.x, top + 38);
      ctx.quadraticCurveTo(p.x + 11, top + 40, p.x + 14, top + h - 11);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,211,124,0.35)';
      ctx.beginPath();
      ctx.arc(p.x, top + 26, 1.4, 0, TAU);
      ctx.fill();
      // Plaque
      ctx.fillStyle = 'rgba(184,144,82,0.5)';
      ctx.fillRect(p.x - 9, top + h + 4, 18, 2);
    }

    // Bookshelves.
    for (let i = 0; i < BOOKSHELVES.length; i++) {
      const b = BOOKSHELVES[i];
      if (!this.inView(b.x + b.w / 2, b.w / 2 + 80)) continue;
      const fy = floorTops[2];
      const top = fy - 198;
      const h = 190;
      ctx.fillStyle = 'rgba(8,5,16,0.38)';
      ctx.fillRect(b.x + 4, top + 5, b.w, h);
      const wood = ctx.createLinearGradient(0, top, 0, top + h);
      wood.addColorStop(0, '#3b2741');
      wood.addColorStop(0.5, '#24172f');
      wood.addColorStop(1, '#150d21');
      ctx.fillStyle = wood;
      ctx.fillRect(b.x, top, b.w, h);
      ctx.strokeStyle = 'rgba(211,164,94,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 2, top + 2, b.w - 4, h - 4);
      // Shelves and books.
      for (let shelf = 0; shelf < 4; shelf++) {
        const sy = top + 30 + shelf * 40;
        ctx.fillStyle = 'rgba(10,7,18,0.75)';
        ctx.fillRect(b.x + 8, sy, b.w - 16, 3);
        let bx = b.x + 12;
        while (bx < b.x + b.w - 14) {
          const bw = 4 + hash(i * 7 + shelf * 3 + bx) * 8;
          const bh = 18 + hash(i * 11 + shelf + bx * 2) * 14;
          const colors = ['#79344b', '#3d4f7f', '#4e376f', '#6b5030', '#2f655e', '#5f2c3f'];
          ctx.fillStyle = colors[Math.floor(hash(bx + shelf * 5) * colors.length)];
          ctx.fillRect(bx, sy - bh, bw, bh);
          ctx.fillStyle = 'rgba(255,222,160,0.15)';
          ctx.fillRect(bx, sy - bh, bw, 1);
          bx += bw + 1.5;
        }
      }
      // Dust glow along top.
      ctx.fillStyle = 'rgba(255,221,160,0.06)';
      ctx.fillRect(b.x, top, b.w, 3);
    }

    // Crates.
    for (let i = 0; i < CRATES.length; i++) {
      const c = CRATES[i];
      if (!this.inView(c.x, 80)) continue;
      this.drawCrate(c.x, c.y, c.scale, i);
    }

    // A tall ornate mirror on floor 1.
    if (this.inView(2210, 120)) {
      const fy = floorTops[1];
      const top = fy - 224;
      ctx.save();
      ctx.fillStyle = 'rgba(7,5,14,0.55)';
      ctx.fillRect(2192, top + 6, 48, 150);
      ctx.fillStyle = '#4b3563';
      ctx.beginPath();
      ctx.moveTo(2190, fy - 8);
      ctx.lineTo(2190, top + 32);
      ctx.quadraticCurveTo(2214, top - 8, 2238, top + 32);
      ctx.lineTo(2238, fy - 8);
      ctx.closePath();
      ctx.fill();
      const mirror = ctx.createLinearGradient(2200, top, 2230, fy);
      mirror.addColorStop(0, 'rgba(175,196,255,0.25)');
      mirror.addColorStop(0.5, 'rgba(78,68,136,0.25)');
      mirror.addColorStop(1, 'rgba(21,15,40,0.42)');
      ctx.fillStyle = mirror;
      ctx.beginPath();
      ctx.moveTo(2198, fy - 14);
      ctx.lineTo(2198, top + 36);
      ctx.quadraticCurveTo(2214, top + 6, 2230, top + 36);
      ctx.lineTo(2230, fy - 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(216,172,100,0.46)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCrate(x, y, scale, seed) {
    const ctx = this.ctx;
    const size = 34 * scale;
    const top = y - size;
    ctx.save();
    ctx.fillStyle = 'rgba(4,3,10,0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, size * 0.62, 5, 0, 0, TAU);
    ctx.fill();
    const wood = ctx.createLinearGradient(x - size / 2, top, x + size / 2, y);
    wood.addColorStop(0, '#4a332c');
    wood.addColorStop(0.55, '#32221f');
    wood.addColorStop(1, '#1b1214');
    ctx.fillStyle = wood;
    ctx.fillRect(x - size / 2, top, size, size);
    ctx.strokeStyle = 'rgba(122,86,49,0.6)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x - size / 2 + 1, top + 1, size - 2, size - 2);
    ctx.strokeStyle = 'rgba(25,15,12,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size / 2 + 2, top + 2);
    ctx.lineTo(x + size / 2 - 2, y - 2);
    ctx.moveTo(x + size / 2 - 2, top + 2);
    ctx.lineTo(x - size / 2 + 2, y - 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,221,168,0.12)';
    ctx.fillRect(x - size / 2, top, size, 1.5);
    // A little stenciled crown.
    ctx.strokeStyle = 'rgba(210,167,95,0.55)';
    ctx.lineWidth = 1;
    const cx = x + (hash(seed * 3.3) - 0.5) * size * 0.2;
    const cy = top + size * 0.46;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 3);
    ctx.lineTo(cx - 5, cy - 2);
    ctx.lineTo(cx - 2, cy);
    ctx.lineTo(cx, cy - 4);
    ctx.lineTo(cx + 2, cy);
    ctx.lineTo(cx + 5, cy - 2);
    ctx.lineTo(cx + 5, cy + 3);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  drawLadders(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    for (const l of LADDERS) {
      if (!this.inView(l.x, 90)) continue;
      const top = l.top + 6;
      const bottom = l.bottom - 2;
      const sway = Math.sin(t * 0.8 + l.x) * 1.2;
      // Rope shadow.
      ctx.strokeStyle = 'rgba(3,2,8,0.5)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(l.x - 11 + sway, top);
      ctx.lineTo(l.x - 11 + sway, bottom);
      ctx.moveTo(l.x + 11 + sway, top);
      ctx.lineTo(l.x + 11 + sway, bottom);
      ctx.stroke();
      // Rope sides.
      ctx.strokeStyle = 'rgba(174,139,89,0.78)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(l.x - 11 + sway, top);
      ctx.lineTo(l.x - 11 + sway, bottom);
      ctx.moveTo(l.x + 11 + sway, top);
      ctx.lineTo(l.x + 11 + sway, bottom);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,221,160,0.16)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Rungs.
      for (let y = bottom - 10; y > top + 8; y -= 23) {
        ctx.strokeStyle = 'rgba(92,68,42,0.85)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(l.x - 11 + sway, y);
        ctx.lineTo(l.x + 11 + sway, y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(214,174,110,0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(l.x - 11 + sway, y - 1);
        ctx.lineTo(l.x + 11 + sway, y - 1);
        ctx.stroke();
      }
      // Top ring and bottom knot.
      ctx.strokeStyle = 'rgba(255,212,121,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(l.x + sway, l.top + 10, 7, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(184,140,85,0.9)';
      ctx.beginPath();
      ctx.arc(l.x + sway, l.bottom - 6, 4, 0, TAU);
      ctx.fill();
      // A little marker glow if close.
      const p = game.player;
      if (Math.abs(p.x - l.x) < 90) {
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(t * 3) * 0.15;
        ctx.strokeStyle = '#ffd479';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.ellipse(l.x, l.bottom, 22, 7, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawTorches(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    for (let i = 0; i < TORCHES.length; i++) {
      const torch = TORCHES[i];
      if (!this.inView(torch.x, 100)) continue;
      const x = torch.x;
      const y = torch.y;
      // Bracket
      ctx.fillStyle = '#2c203d';
      ctx.fillRect(x - 3, y + 14, 6, 26);
      ctx.fillStyle = '#59406f';
      ctx.fillRect(x - 12, y + 11, 24, 4);
      ctx.fillStyle = 'rgba(255,210,140,0.13)';
      ctx.fillRect(x - 12, y + 11, 24, 1);
      ctx.fillStyle = 'rgba(18,12,28,0.8)';
      ctx.beginPath();
      ctx.ellipse(x, y + 15, 7, 3, 0, 0, TAU);
      ctx.fill();
      drawFlame(ctx, x, y, 10, t, i * 2.1);
      // Embers
      ctx.globalAlpha = 0.5;
      for (let k = 0; k < 3; k++) {
        const life = ((t * (0.35 + k * 0.08) + i * 0.2 + k * 0.31) % 1);
        const ex = x + Math.sin(t * 2 + k * 3 + i) * (4 + life * 9);
        const ey = y - life * 54;
        ctx.fillStyle = k % 2 ? '#ffb85c' : '#ffd98d';
        ctx.beginPath();
        ctx.arc(ex, ey, 1.1 + (1 - life) * 1.5, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawCheckpoints(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    for (let i = 0; i < game.checkpoints.length; i++) {
      const cp = game.checkpoints[i];
      if (!this.inView(cp.x, 80)) continue;
      const x = cp.x;
      const y = cp.y;
      const active = cp.active;
      // Floor ring.
      ctx.strokeStyle = active ? 'rgba(255,212,121,0.32)' : 'rgba(120,104,160,0.16)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, 24 + (active ? Math.sin(t * 2 + i) * 2 : 0), 7, 0, 0, TAU);
      ctx.stroke();
      // Post.
      ctx.fillStyle = '#2a1d3d';
      ctx.fillRect(x - 2, y - 54, 4, 54);
      ctx.fillStyle = '#6d4e7e';
      ctx.fillRect(x - 2, y - 54, 1.2, 54);
      ctx.fillStyle = '#3a2a52';
      ctx.fillRect(x - 8, y - 58, 16, 5);
      // Lantern frame.
      ctx.fillStyle = '#24172f';
      ctx.fillRect(x - 10, y - 84, 20, 26);
      ctx.strokeStyle = active ? 'rgba(255,212,121,0.9)' : 'rgba(112,96,156,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 10, y - 84, 20, 26);
      ctx.strokeStyle = active ? 'rgba(255,220,150,0.55)' : 'rgba(100,88,150,0.35)';
      ctx.beginPath();
      ctx.moveTo(x, y - 84);
      ctx.lineTo(x, y - 58);
      ctx.moveTo(x - 10, y - 71);
      ctx.lineTo(x + 10, y - 71);
      ctx.stroke();
      if (active) {
        const lg = ctx.createRadialGradient(x, y - 72, 1, x, y - 72, 26);
        lg.addColorStop(0, 'rgba(255,224,150,0.5)');
        lg.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x - 30, y - 102, 60, 60);
        drawFlame(ctx, x, y - 70, 6.5, t, i * 3.1);
        // Rising motes
        for (let k = 0; k < 3; k++) {
          const life = (t * 0.16 + k * 0.33 + i * 0.19) % 1;
          ctx.globalAlpha = (1 - life) * 0.55;
          ctx.fillStyle = '#ffd479';
          ctx.beginPath();
          ctx.arc(x + Math.sin(life * 9 + k + i) * 11, y - 82 - life * 54, 1.3, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(120,105,180,0.18)';
        ctx.fillRect(x - 7, y - 80, 14, 18);
      }
      // Cap
      ctx.fillStyle = '#4b3563';
      ctx.beginPath();
      ctx.moveTo(x - 13, y - 84);
      ctx.lineTo(x, y - 94);
      ctx.lineTo(x + 13, y - 84);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawAnchors(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    for (let i = 0; i < ANCHORS.length; i++) {
      const a = ANCHORS[i];
      if (!this.inView(a.x, 110)) continue;
      const top = a.y - a.chain;
      const sway = Math.sin(t * 0.7 + i * 1.3) * 2.2;
      // Chain
      ctx.strokeStyle = 'rgba(175,143,90,0.6)';
      ctx.lineWidth = 1.2;
      for (let y = top; y < a.y - 12; y += 8) {
        const linkSway = (y - top) / Math.max(1, a.chain) * sway;
        ctx.beginPath();
        ctx.ellipse(a.x + linkSway, y, 1.8, 3.2, 0, 0, TAU);
        ctx.stroke();
      }
      const near = Math.hypot(game.player.x - a.x, game.player.y - 26 - a.y) < 350;
      // Ring
      ctx.save();
      ctx.translate(a.x + sway, a.y);
      ctx.rotate(Math.sin(t * 0.9 + i) * 0.06);
      ctx.strokeStyle = near ? 'rgba(255,224,150,0.95)' : 'rgba(206,167,99,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 13, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,216,133,0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 17, 0, 0, TAU);
      ctx.stroke();
      // Candles around the chandelier.
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * TAU + t * 0.08;
        const cx = Math.cos(ang) * 15;
        const cy = Math.sin(ang) * 12;
        ctx.fillStyle = '#e8d6ad';
        ctx.fillRect(cx - 1.2, cy - 6, 2.4, 6);
        drawFlame(ctx, cx, cy - 6, 3.4, t, i * 4 + k);
      }
      if (near) {
        ctx.globalAlpha = 0.35 + Math.sin(t * 3.4) * 0.16;
        ctx.strokeStyle = '#ffd479';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  drawPortal(game) {
    const ctx = this.ctx;
    const gate = WORLD.gate;
    if (!this.inView(gate.x, 180)) return;
    const t = game.clock || 0;
    const open = game.captures >= 3;
    const x = gate.x;
    const y = gate.y;
    const half = gate.w / 2;
    const top = y - gate.h + 18;
    ctx.save();
    // Steps
    ctx.fillStyle = '#2b2045';
    ctx.fillRect(x - half - 22, y - 8, gate.w + 44, 10);
    ctx.fillStyle = 'rgba(255,220,160,0.18)';
    ctx.fillRect(x - half - 22, y - 8, gate.w + 44, 1.4);
    // Stone arch
    ctx.fillStyle = '#2f2549';
    ctx.beginPath();
    ctx.moveTo(x - half, y - 8);
    ctx.lineTo(x - half, top + 40);
    ctx.quadraticCurveTo(x, top - 30, x + half, top + 40);
    ctx.lineTo(x + half, y - 8);
    ctx.lineTo(x + half - 15, y - 8);
    ctx.lineTo(x + half - 15, top + 48);
    ctx.quadraticCurveTo(x, top - 6, x - half + 15, top + 48);
    ctx.lineTo(x - half + 15, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(137,109,173,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner void
    const inner = ctx.createLinearGradient(0, top, 0, y);
    if (open) {
      inner.addColorStop(0, 'rgba(255,244,198,0.95)');
      inner.addColorStop(0.28, 'rgba(255,205,112,0.84)');
      inner.addColorStop(0.64, 'rgba(120,228,205,0.75)');
      inner.addColorStop(1, 'rgba(40,21,73,0.9)');
    } else {
      inner.addColorStop(0, 'rgba(62,54,128,0.9)');
      inner.addColorStop(0.6, 'rgba(30,25,73,0.94)');
      inner.addColorStop(1, 'rgba(12,9,27,0.98)');
    }
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.moveTo(x - half + 15, y - 12);
    ctx.lineTo(x - half + 15, top + 48);
    ctx.quadraticCurveTo(x, top - 6, x + half - 15, top + 48);
    ctx.lineTo(x + half - 15, y - 12);
    ctx.closePath();
    ctx.fill();

    // Swirls
    ctx.save();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = t * (0.35 + i * 0.08) + i * 1.9;
      const rr2 = 12 + i * 8;
      ctx.strokeStyle = open ? `rgba(${255 - i * 10},${220 - i * 8},${160 - i * 6},${0.28 - i * 0.026})` : `rgba(130,130,220,${0.12 - i * 0.012})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(a) * 5, y - 104 + Math.cos(a * 0.8) * 8, rr2, rr2 * 0.7, a * 0.2, 0, TAU);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = hash(i * 3.7) * TAU + t * 0.12;
      const rr2 = 8 + hash(i * 7.1) * 46;
      const px = x + Math.cos(a) * rr2;
      const py = y - 104 + Math.sin(a) * rr2 * 0.85;
      ctx.fillStyle = open ? 'rgba(255,244,190,0.8)' : 'rgba(160,160,235,0.3)';
      ctx.beginPath();
      ctx.arc(px, py, 0.9 + hash(i) * 1.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Three crown sockets on the arch.
    for (let i = 0; i < 3; i++) {
      const cx = x - 28 + i * 28;
      const cy = top + 26;
      ctx.fillStyle = i < game.captures ? '#ffd479' : 'rgba(14,10,28,0.7)';
      ctx.strokeStyle = i < game.captures ? 'rgba(255,233,174,0.9)' : 'rgba(126,106,170,0.5)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy + 5);
      ctx.lineTo(cx - 7, cy - 2);
      ctx.lineTo(cx - 3, cy + 1);
      ctx.lineTo(cx, cy - 5);
      ctx.lineTo(cx + 3, cy + 1);
      ctx.lineTo(cx + 7, cy - 2);
      ctx.lineTo(cx + 7, cy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // Capstone
    ctx.fillStyle = '#4a3568';
    ctx.beginPath();
    ctx.moveTo(x - 16, top + 5);
    ctx.lineTo(x, top - 18);
    ctx.lineTo(x + 16, top + 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,140,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Open gate beam
    if (open) {
      ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createLinearGradient(0, y, 0, top - 260);
      beam.addColorStop(0, 'rgba(255,225,150,0.22)');
      beam.addColorStop(1, 'rgba(255,225,150,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(x - 68, top - 260, 136, y - top + 260);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  castRay(x, y, angle, maxDist) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let dist = 0;
    while (dist < maxDist) {
      dist += 9;
      const px = x + dx * dist;
      const py = y + dy * dist;
      for (const s of SOLIDS) {
        if (px > s.x && px < s.x + s.w && py > s.y && py < s.y + s.h) {
          return { x: x + dx * (dist - 9), y: y + dy * (dist - 9), dist };
        }
      }
    }
    return { x: x + dx * maxDist, y: y + dy * maxDist, dist: maxDist };
  }

  drawVisionCones(game) {
    const ctx = this.ctx;
    for (const guard of game.guards) {
      if (guard.state === 'dazed') continue;
      const eyeX = guard.x + guard.dir * 9;
      const eyeY = guard.y - 47;
      const base = guard.dir > 0 ? 0 : Math.PI;
      const half = 0.55;
      const rays = 9;
      const points = [];
      for (let i = 0; i <= rays; i++) {
        const a = base - half + (half * 2 * i) / rays;
        points.push(this.castRay(eyeX, eyeY, a, 315));
      }
      const alert = guard.state === 'alert';
      const hot = Math.min(1, guard.awareness);
      const grad = ctx.createRadialGradient(eyeX, eyeY, 8, eyeX, eyeY, 315);
      if (alert) {
        grad.addColorStop(0, 'rgba(255,88,92,0.26)');
        grad.addColorStop(0.55, 'rgba(255,70,80,0.11)');
        grad.addColorStop(1, 'rgba(255,60,80,0)');
      } else {
        const r = 255;
        const g = Math.round(212 - hot * 95);
        const b = Math.round(120 - hot * 80);
        grad.addColorStop(0, `rgba(${r},${g},${b},${0.16 + hot * 0.08})`);
        grad.addColorStop(0.6, `rgba(${r},${g},${b},${0.06 + hot * 0.05})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      }
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      for (const pt of points) ctx.lineTo(pt.x, pt.y);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      // Faint edge
      ctx.strokeStyle = alert ? 'rgba(255,100,100,0.24)' : `rgba(255,214,140,${0.08 + hot * 0.12})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(points[0].x, points[0].y);
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawGuards(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    for (const guard of game.guards) {
      if (!this.inView(guard.x, 90)) continue;
      const moving = guard.state === 'patrol' || guard.state === 'alert' || guard.state === 'return';
      this.drawGuardFigure(guard, t, moving);
    }
  }

  drawGuardFigure(g, t, moving) {
    const ctx = this.ctx;
    const dazed = g.state === 'dazed';
    const alert = g.state === 'alert';
    const bob = moving && !dazed ? Math.abs(Math.sin(g.anim * 9)) * 1.1 : Math.sin(g.anim * 1.5) * 0.4;
    const walk = Math.sin(g.anim * 9);

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(2,1,7,0.46)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + 1, 20, 6, 0, 0, TAU);
    ctx.fill();

    ctx.translate(g.x, g.y - bob);
    ctx.scale(g.dir, 1);
    if (dazed) ctx.rotate(0.04);

    // Spear (behind body when patrolling)
    ctx.save();
    ctx.translate(7, -40);
    if (alert) ctx.rotate(-0.16);
    else ctx.rotate(-0.92);
    ctx.strokeStyle = '#6a4a2d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.lineTo(28, -58);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(226,190,128,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.lineTo(27, -58);
    ctx.stroke();
    // Spear head
    ctx.fillStyle = '#9495ac';
    ctx.beginPath();
    ctx.moveTo(28, -58);
    ctx.lineTo(36, -70);
    ctx.lineTo(30, -69);
    ctx.lineTo(25, -60);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();

    // Legs
    ctx.strokeStyle = '#1d1828';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    const legSwing = moving && !dazed ? walk * 6 : 0;
    ctx.beginPath();
    ctx.moveTo(-5, -26);
    ctx.lineTo(-6 - legSwing * 0.4, -13);
    ctx.lineTo(-8 - legSwing, 0);
    ctx.moveTo(5, -26);
    ctx.lineTo(5 + legSwing * 0.4, -13);
    ctx.lineTo(7 + legSwing, 0);
    ctx.stroke();
    // Boots
    ctx.fillStyle = '#12101c';
    ctx.beginPath();
    ctx.ellipse(-9 - legSwing, 0, 6, 3, 0, 0, TAU);
    ctx.ellipse(8 + legSwing, 0, 6, 3, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,212,121,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-13 - legSwing, -1);
    ctx.lineTo(-4 - legSwing, -1);
    ctx.moveTo(4 + legSwing, -1);
    ctx.lineTo(12 + legSwing, -1);
    ctx.stroke();

    // Tunic / armour
    const body = ctx.createLinearGradient(0, -50, 0, -20);
    body.addColorStop(0, '#4c2338');
    body.addColorStop(0.5, '#391b2d');
    body.addColorStop(1, '#241222');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-10, -24);
    ctx.quadraticCurveTo(-14, -38, -10, -49);
    ctx.lineTo(9, -49);
    ctx.quadraticCurveTo(14, -38, 10, -24);
    ctx.closePath();
    ctx.fill();
    // Chest plate
    ctx.fillStyle = '#333041';
    ctx.beginPath();
    ctx.moveTo(-8, -46);
    ctx.quadraticCurveTo(0, -51, 8, -46);
    ctx.lineTo(8, -35);
    ctx.quadraticCurveTo(0, -31, -8, -35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(192,154,88,0.42)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Belt
    ctx.fillStyle = '#1b1220';
    ctx.fillRect(-10, -27, 20, 4);
    ctx.fillStyle = 'rgba(218,173,91,0.8)';
    ctx.fillRect(-3, -27, 6, 3);
    // Shoulder plates
    ctx.fillStyle = '#3d344b';
    ctx.beginPath();
    ctx.ellipse(-9, -46, 5, 4, -0.3, 0, TAU);
    ctx.ellipse(9, -46, 5, 4, 0.3, 0, TAU);
    ctx.fill();
    // Sash
    ctx.strokeStyle = 'rgba(140,50,75,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -45);
    ctx.lineTo(7, -27);
    ctx.stroke();

    // Arms
    ctx.strokeStyle = '#2d1a2c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-9, -44);
    ctx.lineTo(-13, -32);
    ctx.lineTo(-8, -25);
    ctx.stroke();
    // Lantern arm
    ctx.beginPath();
    ctx.moveTo(9, -44);
    ctx.lineTo(14, -36);
    ctx.lineTo(15, -30);
    ctx.stroke();
    // Hand
    ctx.fillStyle = '#d5ae94';
    ctx.beginPath();
    ctx.arc(15, -29, 2.6, 0, TAU);
    ctx.fill();

    // Lantern
    ctx.fillStyle = '#3a2a30';
    ctx.fillRect(11, -28, 9, 11);
    ctx.strokeStyle = alert ? 'rgba(255,112,100,0.9)' : 'rgba(255,212,121,0.72)';
    ctx.lineWidth = 1;
    ctx.strokeRect(11, -28, 9, 11);
    ctx.fillStyle = alert ? 'rgba(255,90,90,0.85)' : 'rgba(255,210,120,0.85)';
    ctx.fillRect(13, -26, 5, 7);
    ctx.strokeStyle = '#3a2a30';
    ctx.beginPath();
    ctx.arc(15.5, -28, 3.5, Math.PI, 0);
    ctx.stroke();

    // Head & helmet
    ctx.fillStyle = '#d2a98d';
    ctx.beginPath();
    ctx.arc(0, -55, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#312c3f';
    ctx.beginPath();
    ctx.arc(0, -57, 8.6, Math.PI * 0.98, Math.PI * 2.02);
    ctx.lineTo(8, -51);
    ctx.lineTo(4, -50);
    ctx.lineTo(4, -56);
    ctx.lineTo(-4, -56);
    ctx.lineTo(-4, -50);
    ctx.lineTo(-8, -51);
    ctx.closePath();
    ctx.fill();
    // Nose guard
    ctx.fillStyle = '#40394f';
    ctx.fillRect(-1, -56, 2, 8);
    // Eye slit
    ctx.fillStyle = alert ? '#ff7770' : '#e8bf82';
    ctx.fillRect(3.5, -55, 3.2, 1.6);
    // Plume
    ctx.strokeStyle = alert ? 'rgba(255,96,86,0.9)' : 'rgba(134,45,68,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -65);
    ctx.quadraticCurveTo(-4, -75, -12, -73);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,170,150,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Dazed posture
    if (dazed) {
      ctx.fillStyle = 'rgba(8,6,16,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, -42, 16, 22, 0.1, 0, TAU);
      ctx.fill();
      const stars = 5;
      for (let i = 0; i < stars; i++) {
        const a = t * 2.4 + (i / stars) * TAU;
        const sx = Math.cos(a) * 17;
        const sy = -76 + Math.sin(a) * 5;
        drawStar(ctx, sx, sy, 2.6, '#ffd479', 0.7 + Math.sin(a) * 0.3);
      }
    } else if (g.awareness > 0.55 || alert) {
      const a = alert ? 1 : (g.awareness - 0.55) / 0.45;
      ctx.globalAlpha = a;
      ctx.fillStyle = alert ? '#ff6b6b' : '#ffd479';
      ctx.font = '800 17px "Avenir Next", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(alert ? '!' : '?', 0, -82);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawPrincesses(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    // Free princesses first.
    for (const p of game.princesses) {
      if (p.state !== 'free' || !this.inView(p.x, 90)) continue;
      this.drawPrincessFigure(p, t);
    }
    // Then their captured, moonlit orbs.
    for (const p of game.princesses) {
      if (p.state !== 'captured' || !this.inView(p.orbX, 100)) continue;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + p.index * 1.7);
      ctx.save();
      // Trail
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.13 + pulse * 0.08;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(p.orbX, p.orbY);
      ctx.lineTo(p.orbX - 18, p.orbY + 22);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Glow
      const glow = ctx.createRadialGradient(p.orbX, p.orbY, 2, p.orbX, p.orbY, 38);
      glow.addColorStop(0, `${p.accent}`);
      glow.addColorStop(0.24, `${p.color}`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.33 + pulse * 0.12;
      ctx.fillStyle = glow;
      ctx.fillRect(p.orbX - 38, p.orbY - 38, 76, 76);
      ctx.globalAlpha = 1;
      // Bubble
      const orb = ctx.createRadialGradient(p.orbX - 3, p.orbY - 4, 1, p.orbX, p.orbY, 14);
      orb.addColorStop(0, '#ffffff');
      orb.addColorStop(0.25, p.accent);
      orb.addColorStop(0.8, p.color);
      orb.addColorStop(1, 'rgba(20,10,36,0.4)');
      ctx.fillStyle = orb;
      ctx.beginPath();
      ctx.arc(p.orbX, p.orbY, 12, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Crown inside
      ctx.fillStyle = '#2a1738';
      ctx.beginPath();
      ctx.moveTo(p.orbX - 5, p.orbY + 2);
      ctx.lineTo(p.orbX - 5, p.orbY - 3);
      ctx.lineTo(p.orbX - 2.5, p.orbY - 1);
      ctx.lineTo(p.orbX, p.orbY - 5);
      ctx.lineTo(p.orbX + 2.5, p.orbY - 1);
      ctx.lineTo(p.orbX + 5, p.orbY - 3);
      ctx.lineTo(p.orbX + 5, p.orbY + 2);
      ctx.closePath();
      ctx.fill();
      // Orbit sparkles
      for (let i = 0; i < 3; i++) {
        const a = t * 2 + i * 2.1 + p.index;
        const rr = 17 + Math.sin(t * 1.3 + i) * 2;
        drawStar(ctx, p.orbX + Math.cos(a) * rr, p.orbY + Math.sin(a) * rr * 0.7, 2.1, '#fff1bf', 0.6 + pulse * 0.3);
      }
      // Face suggestion
      ctx.fillStyle = 'rgba(42,20,55,0.36)';
      ctx.beginPath();
      ctx.arc(p.orbX - 3, p.orbY, 0.9, 0, TAU);
      ctx.arc(p.orbX + 3, p.orbY, 0.9, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawPrincessFigure(p, t) {
    const ctx = this.ctx;
    const panic = p.panic > 0;
    const bob = Math.sin(t * 2.4 + p.index) * 1.2;
    const run = panic ? Math.sin(t * 17) * 3.4 : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(2,1,7,0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, 15, 4.5, 0, 0, TAU);
    ctx.fill();
    ctx.translate(p.x, p.y - bob);
    ctx.scale(p.dir, 1);

    // Hair behind
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(-3, -49);
    ctx.quadraticCurveTo(-14, -38, -11 + Math.sin(t * 2.2) * 2, -8);
    ctx.lineTo(-2, -14);
    ctx.lineTo(4, -6);
    ctx.quadraticCurveTo(-2, -34, 1, -48);
    ctx.closePath();
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Gown
    const gown = ctx.createLinearGradient(0, -38, 0, 0);
    gown.addColorStop(0, p.accent);
    gown.addColorStop(0.34, p.color);
    gown.addColorStop(1, 'rgba(44,22,57,0.98)');
    ctx.fillStyle = gown;
    ctx.beginPath();
    ctx.moveTo(-7, -35);
    ctx.quadraticCurveTo(-15, -12, -17, 0);
    ctx.quadraticCurveTo(0, 5, 17, 0);
    ctx.quadraticCurveTo(14, -13, 7, -35);
    ctx.closePath();
    ctx.fill();
    // Gold trim
    ctx.strokeStyle = 'rgba(255,221,150,0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-15, -1);
    ctx.quadraticCurveTo(0, 3, 15, -1);
    ctx.stroke();
    // Bodice
    ctx.fillStyle = 'rgba(255,232,218,0.92)';
    ctx.beginPath();
    ctx.moveTo(-6, -46);
    ctx.lineTo(6, -46);
    ctx.lineTo(7, -33);
    ctx.lineTo(-7, -33);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(-7, -40);
    ctx.lineTo(7, -40);
    ctx.lineTo(7, -33);
    ctx.lineTo(-7, -33);
    ctx.closePath();
    ctx.fill();
    // Arms
    ctx.strokeStyle = 'rgba(248,220,208,0.9)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    if (panic) {
      ctx.moveTo(-6, -42);
      ctx.lineTo(-13, -52);
      ctx.moveTo(6, -42);
      ctx.lineTo(13, -52);
    } else {
      ctx.moveTo(-6, -42);
      ctx.lineTo(-10, -31 + run * 0.3);
      ctx.moveTo(6, -42);
      ctx.lineTo(10, -31 - run * 0.3);
    }
    ctx.stroke();
    // Head
    ctx.fillStyle = '#f2d3c0';
    ctx.beginPath();
    ctx.arc(0, -53, 6.7, 0, TAU);
    ctx.fill();
    // Hair front
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(0, -55, 7.1, Math.PI * 0.95, Math.PI * 2.05);
    ctx.quadraticCurveTo(8, -52, 5, -49);
    ctx.quadraticCurveTo(0, -51, -5, -49);
    ctx.quadraticCurveTo(-8, -52, -7, -55);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#302036';
    if (panic) {
      ctx.beginPath();
      ctx.arc(2.5, -53, 1.1, 0, TAU);
      ctx.arc(5.7, -53, 1.1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(70,30,48,0.8)';
      ctx.beginPath();
      ctx.ellipse(4, -49.5, 1.4, 1.8, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(2.8, -53, 0.9, 0, TAU);
      ctx.arc(5.6, -53, 0.9, 0, TAU);
      ctx.fill();
    }
    // Blush
    ctx.fillStyle = 'rgba(241,127,164,0.3)';
    ctx.beginPath();
    ctx.arc(1.2, -51, 1.4, 0, TAU);
    ctx.arc(7, -51, 1.2, 0, TAU);
    ctx.fill();
    // Crown
    ctx.fillStyle = '#ffd479';
    ctx.beginPath();
    ctx.moveTo(-5, -59);
    ctx.lineTo(-5, -64);
    ctx.lineTo(-2, -61);
    ctx.lineTo(0, -66);
    ctx.lineTo(2, -61);
    ctx.lineTo(5, -64);
    ctx.lineTo(5, -59);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,248,215,0.75)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    // Sparkles
    for (let i = 0; i < 3; i++) {
      const a = t * 1.7 + i * 2.3 + p.index;
      drawStar(ctx, Math.cos(a) * 18, -34 + Math.sin(a) * 16, 1.7, p.accent, 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(a * 2)));
    }
    if (panic) {
      ctx.fillStyle = '#ffd479';
      ctx.font = '800 13px "Avenir Next", "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', 0, -78);
    }
    ctx.restore();
  }

  drawPlayer(game) {
    const p = game.player;
    if (!this.inView(p.x, 90)) return;
    const t = game.clock || 0;
    const flicker = p.invuln > 0 ? 0.35 + 0.55 * Math.abs(Math.sin(t * 26)) : 1;
    const moving = Math.abs(p.vx) > 26 && p.grounded;
    this.drawThiefFigure(p.x, p.y, p.facing, 1, {
      anim: p.anim,
      moving,
      grounded: p.grounded,
      vx: p.vx,
      vy: p.vy,
      climbing: p.climbing,
      grapple: p.grapple,
      lasso: p.ropeT > 0,
      alpha: flicker,
      hurt: p.hurt > 0,
    });
  }

  drawThiefFigure(x, y, facing, scale, opt = {}) {
    const ctx = this.ctx;
    const anim = opt.anim || 0;
    const moving = !!opt.moving;
    const grounded = opt.grounded !== false;
    const climbing = !!opt.climbing;
    const grappling = !!opt.grapple;
    const lasso = !!opt.lasso;
    const run = moving && grounded ? Math.sin(anim * 13) : 0;
    const bob = moving && grounded ? Math.abs(Math.sin(anim * 13)) * 1.2 : Math.sin(anim * 2.1) * 0.75;
    const sway = Math.sin(anim * 2.4) * 1.5 + clamp((opt.vx || 0) * 0.012, -4, 4) + (grounded ? 0 : 3);

    ctx.save();
    ctx.globalAlpha = opt.alpha ?? 1;

    // Shadow
    if (opt.shadow !== false) {
      ctx.fillStyle = 'rgba(2,1,7,0.42)';
      ctx.beginPath();
      ctx.ellipse(x, y + 1, 15 * scale, 4.5 * scale, 0, 0, TAU);
      ctx.fill();
    }

    ctx.translate(x, y - bob);
    ctx.scale(scale * facing, scale);

    const capeGrad = ctx.createLinearGradient(0, -46, 0, 4);
    capeGrad.addColorStop(0, '#3b2563');
    capeGrad.addColorStop(0.55, '#261744');
    capeGrad.addColorStop(1, '#140d27');
    ctx.fillStyle = capeGrad;
    ctx.beginPath();
    ctx.moveTo(3, -47);
    ctx.bezierCurveTo(-9, -46, -17, -28, -13 - sway, 2);
    ctx.lineTo(7 - sway * 0.3, 0);
    ctx.bezierCurveTo(10, -18, 9, -35, 5, -47);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(117,230,208,0.32)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-13 - sway, 2);
    ctx.quadraticCurveTo(-15 - sway, -12, 3, -47);
    ctx.stroke();

    // Scarf ribbons
    ctx.strokeStyle = 'rgba(117,230,208,0.85)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, -48);
    ctx.bezierCurveTo(-7, -55, -19, -51 + sway, -27, -57 + sway * 0.6);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(117,230,208,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(3, -48);
    ctx.bezierCurveTo(-8, -52, -17, -46, -24, -49 + sway * 0.5);
    ctx.stroke();

    // Back leg
    this.drawThiefLeg(ctx, -4, -23, run, -1, grounded, climbing);
    // Front leg
    this.drawThiefLeg(ctx, 3, -23, run, 1, grounded, climbing);

    // Torso
    const tunic = ctx.createLinearGradient(-7, -46, 7, -22);
    tunic.addColorStop(0, '#5b367f');
    tunic.addColorStop(0.45, '#38214f');
    tunic.addColorStop(1, '#241534');
    ctx.fillStyle = tunic;
    ctx.beginPath();
    ctx.moveTo(-7, -23);
    ctx.quadraticCurveTo(-9, -37, -4, -47);
    ctx.quadraticCurveTo(2, -50, 7, -46);
    ctx.quadraticCurveTo(9, -35, 7, -23);
    ctx.closePath();
    ctx.fill();
    // Belt
    ctx.fillStyle = '#1a1027';
    ctx.fillRect(-7.5, -27, 15, 4.2);
    ctx.fillStyle = 'rgba(255,212,121,0.9)';
    ctx.fillRect(-2, -27, 4, 3.4);
    // Pouch
    ctx.fillStyle = '#241832';
    ctx.beginPath();
    ctx.ellipse(-7, -23, 3.2, 4.2, -0.2, 0, TAU);
    ctx.fill();
    // Strap
    ctx.strokeStyle = 'rgba(211,166,98,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, -45);
    ctx.lineTo(6, -29);
    ctx.stroke();

    // Back arm
    ctx.strokeStyle = '#2c1a44';
    ctx.lineWidth = 4.3;
    ctx.beginPath();
    ctx.moveTo(-4, -43);
    const backHandX = -10 - run * 1.6;
    const backHandY = -29 + Math.abs(run) * 1.2;
    ctx.lineTo(backHandX, backHandY);
    ctx.stroke();
    ctx.fillStyle = '#e7c7b2';
    ctx.beginPath();
    ctx.arc(backHandX, backHandY, 2.4, 0, TAU);
    ctx.fill();

    // Front arm / lasso pose
    ctx.strokeStyle = '#3a2358';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(5, -43);
    let handX;
    let handY;
    if (grappling || lasso) {
      handX = 16;
      handY = -47;
    } else if (climbing) {
      handX = 10;
      handY = -53 + Math.sin(anim * 8) * 3;
    } else {
      handX = 10 + run * 2.2;
      handY = -32 + Math.abs(run) * 1.3;
    }
    ctx.lineTo(handX, handY);
    ctx.stroke();
    ctx.fillStyle = '#f0d0bb';
    ctx.beginPath();
    ctx.arc(handX, handY, 2.6, 0, TAU);
    ctx.fill();

    // Rope coil at hip
    ctx.strokeStyle = 'rgba(222,188,126,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-5, -30, 4, 0.2, Math.PI * 1.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-5, -30, 2.6, 0.4, Math.PI * 1.7);
    ctx.stroke();

    // Head
    // Hood
    ctx.fillStyle = '#2a1945';
    ctx.beginPath();
    ctx.moveTo(-7, -49);
    ctx.quadraticCurveTo(-9, -60, 0, -63);
    ctx.quadraticCurveTo(8, -62, 9, -52);
    ctx.lineTo(7, -47);
    ctx.lineTo(3, -50);
    ctx.lineTo(-4, -49);
    ctx.closePath();
    ctx.fill();
    // Hood peak
    ctx.beginPath();
    ctx.moveTo(-6, -56);
    ctx.quadraticCurveTo(-13, -60, -12, -52);
    ctx.quadraticCurveTo(-9, -53, -6, -50);
    ctx.closePath();
    ctx.fill();
    // Face
    ctx.fillStyle = '#f2d3c0';
    ctx.beginPath();
    ctx.ellipse(3, -53.4, 4.8, 5.4, 0.12, 0, TAU);
    ctx.fill();
    // Mask
    ctx.fillStyle = '#452b61';
    ctx.beginPath();
    ctx.moveTo(-1, -50.5);
    ctx.quadraticCurveTo(4, -47.8, 8.2, -50.5);
    ctx.lineTo(7.4, -48.8);
    ctx.quadraticCurveTo(3.6, -46.6, -0.5, -49.1);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = '#26152f';
    ctx.beginPath();
    ctx.arc(5.1, -54.2, 1.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(5.45, -54.6, 0.32, 0, TAU);
    ctx.fill();
    // Hair strand
    ctx.strokeStyle = 'rgba(244,235,220,0.92)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3.5, -58.5);
    ctx.quadraticCurveTo(-8.5, -54, -7.5, -48.5);
    ctx.stroke();
    // Hood trim
    ctx.strokeStyle = 'rgba(255,212,121,0.32)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(8.6, -52);
    ctx.quadraticCurveTo(8, -60, 0, -62.6);
    ctx.stroke();

    // Charm
    const charmPulse = 0.5 + 0.5 * Math.sin(anim * 3);
    ctx.fillStyle = `rgba(117,230,208,${0.65 + charmPulse * 0.3})`;
    ctx.beginPath();
    ctx.moveTo(7, -34);
    ctx.lineTo(9.2, -31.6);
    ctx.lineTo(7, -29.2);
    ctx.lineTo(4.8, -31.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,255,246,0.5)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Rim light on the moonlit side
    ctx.strokeStyle = 'rgba(255,225,170,0.17)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6.5, -24);
    ctx.quadraticCurveTo(-8, -37, -3.5, -46);
    ctx.stroke();

    if (opt.hurt) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,60,70,0.35)';
      ctx.fillRect(-20, -70, 45, 75);
    }
    ctx.restore();
  }

  drawThiefLeg(ctx, hipX, hipY, run, side, grounded, climbing) {
    let kneeX;
    let kneeY;
    let footX;
    let footY;
    if (climbing) {
      const phase = Math.sin((run + side) * 0.8);
      kneeX = hipX + side * 2;
      kneeY = hipY + 11;
      footX = hipX + side * 2.2 + phase * 1.5;
      footY = 0;
    } else if (!grounded) {
      kneeX = hipX + side * 4;
      kneeY = hipY + 8;
      footX = hipX + side * 7 + (side > 0 ? 2 : -3);
      footY = -3 + (side > 0 ? 0 : 4);
    } else {
      const swing = run * side * 0.75;
      kneeX = hipX + Math.sin(swing) * 8;
      kneeY = hipY + 11 - Math.abs(swing) * 1.8;
      footX = hipX + Math.sin(swing) * 14;
      footY = 0 - Math.max(0, Math.sin(swing)) * 2.5;
    }
    ctx.strokeStyle = '#1a1129';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY - 2);
    ctx.stroke();
    // Boot
    ctx.fillStyle = '#0e0918';
    ctx.beginPath();
    ctx.ellipse(footX + (side > 0 ? 1 : -1), footY, 5.2, 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(117,230,208,0.3)';
    ctx.fillRect(footX - 3, footY - 2.4, 6, 0.8);
  }

  drawRopes(game) {
    const ctx = this.ctx;
    const p = game.player;
    const t = game.clock || 0;
    if (p.grapple) {
      const a = p.grapple.anchor;
      const hx = p.x + p.facing * 13;
      const hy = p.y - 47;
      const mx = (hx + a.x) / 2 + Math.sin(t * 3) * 2;
      const my = (hy + a.y) / 2 + 4;
      ctx.save();
      ctx.strokeStyle = 'rgba(18,10,30,0.7)';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(mx, my, a.x, a.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(232,205,154,0.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(mx, my, a.x, a.y);
      ctx.stroke();
      // Tension sparkles
      for (let i = 0; i < 3; i++) {
        const u = ((t * 0.8 + i / 3) % 1);
        const sx = lerp(hx, a.x, u);
        const sy = lerp(hy, a.y, u);
        drawStar(ctx, sx, sy, 1.4, '#ffe3a6', 0.5);
      }
      ctx.restore();
    }
    if (p.ropeT > 0 && p.ropeTo) {
      ctx.save();
      ctx.globalAlpha = clamp(p.ropeT / 0.16, 0, 1);
      ctx.strokeStyle = 'rgba(238,212,160,0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x + p.facing * 12, p.y - 46);
      ctx.quadraticCurveTo(p.x + p.facing * 50, p.y - 60, p.ropeTo.x, p.ropeTo.y);
      ctx.stroke();
      ctx.restore();
    }
    for (const fx of game.ropeFx) {
      const alpha = clamp(fx.t / 0.28, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx.x1, fx.y1);
      ctx.quadraticCurveTo((fx.x1 + fx.x2) / 2, Math.min(fx.y1, fx.y2) - 20, fx.x2, fx.y2);
      ctx.stroke();
      drawStar(ctx, fx.x2, fx.y2, 3.4, fx.color, alpha);
      ctx.restore();
    }
  }

  drawParticles(game) {
    const ctx = this.ctx;
    ctx.save();
    for (const p of game.particles) {
      const alpha = clamp(p.life / p.max, 0, 1);
      if (alpha <= 0) continue;
      if (p.glow) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.8, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawForegroundMotes(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    // Dust motes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      if (!this.inView(m.x, 120)) continue;
      const y = 420 + ((m.y - 420 + t * m.speed) % 1780);
      const x = m.x + Math.sin(t * 0.4 + m.phase) * 14 + m.drift * Math.sin(t * 0.12 + m.phase);
      const a = 0.08 + 0.16 * (0.5 + 0.5 * Math.sin(t * 1.4 + m.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffe3b0';
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // Mist at the bottom of the atrium.
    const mist = ctx.createLinearGradient(0, 2100, 0, 2300);
    mist.addColorStop(0, 'rgba(77,88,157,0)');
    mist.addColorStop(0.55, 'rgba(88,100,170,0.13)');
    mist.addColorStop(1, 'rgba(140,160,225,0.25)');
    ctx.fillStyle = mist;
    ctx.beginPath();
    ctx.moveTo(-50, 2300);
    ctx.lineTo(-50, 2150);
    for (let x = -50; x <= WORLD.w + 50; x += 80) {
      ctx.lineTo(x, 2140 + Math.sin(x * 0.006 + t * 0.7) * 18 + Math.cos(x * 0.011 - t * 0.4) * 8);
    }
    ctx.lineTo(WORLD.w + 50, 2300);
    ctx.closePath();
    ctx.fill();
  }

  radialGlow(sx, sy, radius, inner, mid, outer = 'rgba(0,0,0,0)') {
    if (sx < -radius || sx > this.w + radius || sy < -radius || sy > this.h + radius) return;
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    g.addColorStop(0, inner);
    g.addColorStop(0.45, mid);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
  }

  drawLighting(game) {
    const ctx = this.ctx;
    const t = game.clock || 0;
    const s = this.scale;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Torch light.
    for (let i = 0; i < TORCHES.length; i++) {
      const torch = TORCHES[i];
      if (!this.inView(torch.x, 220)) continue;
      const pos = this.worldToScreen(torch.x, torch.y);
      const flicker = 0.92 + Math.sin(t * 11 + i * 2.1) * 0.05 + Math.sin(t * 23.7 + i) * 0.03;
      this.radialGlow(pos.x, pos.y, 155 * s * flicker, 'rgba(255,190,95,0.2)', 'rgba(255,138,58,0.07)');
      this.radialGlow(pos.x, pos.y, 46 * s, 'rgba(255,244,200,0.24)', 'rgba(255,190,90,0.05)');
    }

    // Chandeliers.
    for (let i = 0; i < ANCHORS.length; i++) {
      const a = ANCHORS[i];
      if (!this.inView(a.x, 140)) continue;
      const pos = this.worldToScreen(a.x, a.y);
      const p = 0.85 + Math.sin(t * 5 + i) * 0.08;
      this.radialGlow(pos.x, pos.y, 104 * s * p, 'rgba(255,223,150,0.15)', 'rgba(255,176,78,0.04)');
    }

    // Lanterns.
    for (const cp of game.checkpoints) {
      if (!cp.active || !this.inView(cp.x, 150)) continue;
      const pos = this.worldToScreen(cp.x, cp.y - 70);
      this.radialGlow(pos.x, pos.y, 118 * s, 'rgba(255,215,137,0.18)', 'rgba(255,170,75,0.05)');
    }

    // Guard lanterns.
    for (const guard of game.guards) {
      if (guard.state === 'dazed' || !this.inView(guard.x, 120)) continue;
      const pos = this.worldToScreen(guard.x + guard.dir * 15, guard.y - 27);
      const alert = guard.state === 'alert';
      this.radialGlow(pos.x, pos.y, 66 * s, alert ? 'rgba(255,105,100,0.16)' : 'rgba(255,198,112,0.13)', 'rgba(255,150,60,0.03)');
    }

    // Player's charm.
    const pp = this.worldToScreen(game.player.x, game.player.y - 32);
    const pulse = 0.7 + Math.sin(t * 4) * 0.15;
    this.radialGlow(pp.x, pp.y, 48 * s * pulse, 'rgba(117,230,208,0.14)', 'rgba(80,180,200,0.03)');

    // Moon gate.
    if (this.inView(WORLD.gate.x, 260)) {
      const gp = this.worldToScreen(WORLD.gate.x, WORLD.gate.y - 100);
      const open = game.captures >= 3;
      const r = (open ? 240 : 130) * s;
      this.radialGlow(gp.x, gp.y, r, open ? 'rgba(255,230,150,0.22)' : 'rgba(120,130,235,0.07)', open ? 'rgba(117,230,208,0.07)' : 'rgba(70,80,180,0.02)');
    }

    ctx.restore();
  }

  drawScreenEffects(game, dt) {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const t = game.clock || 0;

    // Alert edge glow.
    let alert = 0;
    for (const g of game.guards) {
      if (g.state === 'alert') alert = 1;
      else alert = Math.max(alert, g.awareness > 0.72 ? (g.awareness - 0.72) / 0.28 * 0.5 : 0);
    }
    if (alert > 0) {
      const pulse = 0.65 + 0.35 * Math.sin(t * 6.5);
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.max(w, h) * 0.72);
      g.addColorStop(0, 'rgba(255,40,60,0)');
      g.addColorStop(0.72, 'rgba(255,40,60,0)');
      g.addColorStop(1, `rgba(255,40,60,${0.16 * alert * pulse})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Low health pulse.
    if (game.hearts === 1 && game.state === 'playing') {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(150,10,30,0)');
      g.addColorStop(1, `rgba(150,10,30,${0.11 + Math.sin(t * 3) * 0.04})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Damage flash.
    if (game.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,48,60,${game.hurtFlash * 0.3})`;
      ctx.fillRect(0, 0, w, h);
    }
    // Capture flash.
    if (game.captureFlash > 0) {
      ctx.fillStyle = this.hexToRgba(game.flashColor || '#ffd479', game.captureFlash * 0.16);
      ctx.fillRect(0, 0, w, h);
    }

    // Steady vignette.
    const vig = ctx.createRadialGradient(w / 2, h * 0.47, Math.min(w, h) * 0.28, w / 2, h * 0.5, Math.max(w, h) * 0.78);
    vig.addColorStop(0, 'rgba(2,1,8,0)');
    vig.addColorStop(0.65, 'rgba(2,1,8,0.12)');
    vig.addColorStop(1, 'rgba(2,1,8,0.52)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // A little top/bottom cinematic shade.
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.14);
    top.addColorStop(0, 'rgba(3,2,9,0.4)');
    top.addColorStop(1, 'rgba(3,2,9,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * 0.14);
    const bottom = ctx.createLinearGradient(0, h, 0, h * 0.8);
    bottom.addColorStop(0, 'rgba(3,2,9,0.44)');
    bottom.addColorStop(1, 'rgba(3,2,9,0)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h * 0.8, w, h * 0.2);

    // Very faint grain, generated sparsely.
    if (!game.input?.reducedMotion) {
      ctx.globalAlpha = 0.025;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 22; i++) {
        const x = (hash(i * 3.1 + Math.floor(t * 12)) * w);
        const y = (hash(i * 7.7 + Math.floor(t * 12) * 1.7) * h);
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  hexToRgba(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(255,212,121,${alpha})`;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
