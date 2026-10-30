/* ============================================================
   SAPHIRA: BOUND & BLADE — world generation and collision
   Two hand-built procedural maps: Bandit Forest & Prison Cell.
   ============================================================ */
const World = (() => {
  const T = 24;
  const WALL = 5, BARS = 7, FLOOR = 6, STAIRS = 8;

  function tileAt(map, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return WALL;
    return map.tiles[ty][tx];
  }

  function tileSolid(t) {
    return t === 2 || t === 3 || t === 4 || t === 5 || t === 7;
  }

  function isSolidAt(map, px, py) {
    if (px < 0 || py < 0 || px >= map.w * T || py >= map.h * T) return true;
    if (tileSolid(tileAt(map, Math.floor(px / T), Math.floor(py / T)))) return true;
    for (const p of map.props) {
      if (!p.solid) continue;
      const dx = px - p.x;
      const dy = py - (p.y - 4);
      if (dx * dx + dy * dy < p.solid * p.solid) return true;
    }
    return false;
  }

  function canStand(map, x, y, r = 7) {
    if (x < r || y < r || x > map.w * T - r || y > map.h * T - r) return false;
    const pts = [
      [x, y - r * 0.45], [x, y + r * 0.2], [x - r, y - 2], [x + r, y - 2],
      [x - r * 0.7, y - r * 0.3], [x + r * 0.7, y - r * 0.3]
    ];
    for (const [px, py] of pts) {
      if (tileSolid(tileAt(map, Math.floor(px / T), Math.floor(py / T)))) return false;
    }
    for (const p of map.props) {
      if (!p.solid) continue;
      const dx = x - p.x;
      const dy = (y - 2) - (p.y - 5);
      const rr = r + p.solid;
      if (dx * dx + dy * dy < rr * rr) return false;
    }
    return true;
  }

  /* ============================================================
     BANDIT FOREST
     ============================================================ */
  function createForest() {
    const w = 48, h = 34;
    const map = {
      kind: 'forest', id: 'forest', name: 'Bandit Forest',
      w, h, tiles: [], props: [], decor: [], enemies: [], lights: [],
      spawn: { x: 7.5 * T, y: 30 * T, dir: 'down' },
      camp: { x: 40 * T, y: 7 * T },
      cache: null
    };
    for (let y = 0; y < h; y++) {
      map.tiles.push(new Array(w).fill(0));
    }

    const pathPts = [
      [7, 30], [8, 28], [11, 26], [15, 25], [19, 22], [21, 19],
      [24, 17], [27, 15], [30, 13], [33, 11], [36, 9], [40, 7]
    ];

    function distToPath(tx, ty) {
      let best = 999;
      for (let i = 0; i < pathPts.length - 1; i++) {
        const [x1, y1] = pathPts[i];
        const [x2, y2] = pathPts[i + 1];
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        let u = ((tx - x1) * dx + (ty - y1) * dy) / len2;
        u = Math.max(0, Math.min(1, u));
        const px = x1 + dx * u, py = y1 + dy * u;
        const d = Math.hypot(tx - px, ty - py);
        if (d < best) best = d;
      }
      return best;
    }

    // carve the winding trail and clearings
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const d = distToPath(x, y);
        if (d < 1.45) map.tiles[y][x] = 1;
        if (Math.hypot(x - 7, y - 30) < 4.3) map.tiles[y][x] = 1;
        if (Math.hypot(x - 40, y - 7) < 5.4) map.tiles[y][x] = 1;
      }
    }

    // border woods
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
        if (edge) map.tiles[y][x] = 2;
      }
    }

    // pond
    for (let y = 6; y < 17; y++) {
      for (let x = 9; x < 20; x++) {
        const d = Math.hypot((x - 14) / 4.4, (y - 11) / 2.9);
        if (d < 1) map.tiles[y][x] = 4;
        else if (d < 1.22 && map.tiles[y][x] === 0 && distToPath(x, y) > 2.4) map.tiles[y][x] = 3;
      }
    }

    // forest density
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        if (map.tiles[y][x] !== 0) continue;
        const d = distToPath(x, y);
        if (d < 2.5) continue;
        if (Math.hypot(x - 7, y - 30) < 3.8) continue;
        if (Math.hypot(x - 40, y - 7) < 4.6) continue;
        const n = Art.hash(x, y, 11);
        if (n > 0.87) map.tiles[y][x] = 2;
        else if (n > 0.84 && d > 3.5) map.tiles[y][x] = 3;
      }
    }

    // second pass: cluster trees
    const snapshot = map.tiles.map((row) => row.slice());
    for (let y = 3; y < h - 3; y++) {
      for (let x = 3; x < w - 3; x++) {
        if (snapshot[y][x] !== 0) continue;
        const d = distToPath(x, y);
        if (d < 2.8) continue;
        if (Math.hypot(x - 40, y - 7) < 5) continue;
        let n = 0;
        if (snapshot[y - 1][x] === 2) n++;
        if (snapshot[y + 1][x] === 2) n++;
        if (snapshot[y][x - 1] === 2) n++;
        if (snapshot[y][x + 1] === 2) n++;
        if (n >= 2 && Art.hash(x, y, 21) > 0.45) map.tiles[y][x] = 2;
      }
    }

    const P = (tx, ty) => ({ x: tx * T + 12, y: ty * T + 22 });

    // start area: sign, chest, trail
    let p = P(9, 28);
    map.props.push({ type: 'sign', x: p.x, y: p.y, solid: 5, label: 'forest', interact: { key: 'sign', label: 'Read the trail sign' } });
    p = P(5, 30);
    map.props.push({ type: 'chest', x: p.x, y: p.y, solid: 8, blocksSight: true, opened: false, interact: { key: 'chest', label: 'Open the supply chest' } });

    // camp
    const tent1 = P(38, 5);
    map.props.push({ type: 'tent', x: tent1.x, y: tent1.y, solid: 24, blocksSight: true, variant: 0 });
    const tent2 = P(43, 9);
    map.props.push({ type: 'tent', x: tent2.x, y: tent2.y, solid: 22, blocksSight: true, variant: 1 });
    const fire = P(40, 8);
    map.props.push({ type: 'campfire', x: fire.x, y: fire.y, solid: 9, light: true });
    const ban = P(36, 6);
    map.props.push({ type: 'banner', x: ban.x, y: ban.y, solid: 3 });
    const ban2 = P(44, 6);
    map.props.push({ type: 'banner', x: ban2.x, y: ban2.y, solid: 3 });
    const crateC = P(42, 4);
    map.props.push({ type: 'crate', x: crateC.x, y: crateC.y, solid: 10, blocksSight: true });
    const barrelC = P(39, 10);
    map.props.push({ type: 'barrel', x: barrelC.x, y: barrelC.y, solid: 8, blocksSight: true });
    const tentGuard = P(40, 6);
    map.props.push({ type: 'campTent', x: tentGuard.x, y: tentGuard.y, solid: 0, blocksSight: false, interact: { key: 'camp', label: 'Search the chief’s tent' } });

    // scattered decoration
    const bushSpots = [[11, 28], [18, 26], [23, 22], [27, 19], [31, 15], [35, 12], [38, 11], [6, 26], [13, 22], [21, 16], [29, 20], [34, 17], [43, 20], [41, 15], [12, 6], [26, 8], [8, 15]];
    for (const [x, y] of bushSpots) {
      const q = P(x, y);
      map.props.push({ type: 'bush', x: q.x, y: q.y, solid: 0, variant: Art.hash(x, y, 4) });
    }
    const stumpSpots = [[20, 27], [32, 17], [36, 20], [10, 19], [30, 5]];
    for (const [x, y] of stumpSpots) {
      const q = P(x, y);
      map.props.push({ type: 'stump', x: q.x, y: q.y, solid: 7 });
    }

    // enemies along the trail
    const enemySpots = [[14, 25], [20, 21], [26, 17], [31, 12], [36, 9]];
    enemySpots.forEach(([x, y], i) => {
      const q = P(x, y);
      map.enemies.push({
        id: 'e' + i,
        type: 'minion',
        name: 'Bandit Minion',
        x: q.x, y: q.y, homeX: q.x, homeY: q.y,
        dir: i % 2 ? 'left' : 'right',
        moving: false, phase: Art.hash(i, 2, 3) * 5,
        alert: 0, defeated: false, target: null, wait: 0.5 + i * 0.3,
        bob: Art.hash(i, 9, 2) * 6.28,
        level: 1 + Math.floor(i / 2)
      });
    });

    // fireflies / light motes
    for (let i = 0; i < 38; i++) {
      map.lights.push({
        type: 'firefly',
        x: 3 * T + Art.hash(i, 3, 7) * (w - 6) * T,
        y: 3 * T + Art.hash(i, 8, 2) * (h - 6) * T,
        phase: Art.hash(i, 1, 6) * 6.28,
        r: 7 + Art.hash(i, 4, 4) * 8
      });
    }

    buildCache(map);
    return map;
  }

  /* ============================================================
     BANDIT HIDEOUT — PRISON CELL
     ============================================================ */
  function createPrison() {
    const w = 32, h = 20;
    const map = {
      kind: 'prison', id: 'prison', name: 'Bandit Hideout',
      w, h, tiles: [], props: [], decor: [], enemies: [], lights: [],
      spawn: { x: 6.4 * T, y: 16.4 * T, dir: 'down' },
      tablePos: { x: 16 * T + 12, y: 10 * T + 22 },
      stairsRect: { x: 27.4 * T, y: 3.3 * T, w: 3.6 * T, h: 2.2 * T },
      cellRect: { x: 2 * T, y: 11 * T, w: 9 * T, h: 8 * T },
      cache: null
    };

    for (let y = 0; y < h; y++) map.tiles.push(new Array(w).fill(WALL));

    const carve = (x1, y1, x2, y2, type = FLOOR) => {
      for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) map.tiles[y][x] = type;
    };

    // cell, guard hall, upper stair room
    carve(3, 12, 9, 18);
    carve(11, 9, 30, 18);
    carve(23, 3, 30, 7);
    carve(26, 8, 27, 8);
    // cell doorway + bars
    carve(10, 16, 10, 17);
    for (let y = 12; y <= 18; y++) {
      if (y !== 16 && y !== 17) map.tiles[y][10] = BARS;
    }
    // stair tiles
    for (let y = 4; y <= 4; y++) for (let x = 28; x <= 30; x++) map.tiles[y][x] = STAIRS;

    const P = (tx, ty) => ({ x: tx * T + 12, y: ty * T + 22 });

    // cell furnishings
    let q = P(4, 17);
    map.props.push({ type: 'bed', x: q.x, y: q.y, solid: 16, blocksSight: false, interact: { key: 'bed', label: 'Rest on the straw' } });
    q = P(8.5, 13.2);
    map.props.push({ type: 'bucket', x: q.x, y: q.y, solid: 5 });
    q = P(3.2, 13);
    map.props.push({ type: 'chains', x: q.x, y: q.y, solid: 0 });

    // guard table with the knife
    q = P(16, 10);
    map.tablePos = { x: q.x, y: q.y };
    map.props.push({
      type: 'table', x: q.x, y: q.y, solid: 18, blocksSight: true, knife: true,
      interact: { key: 'table', label: 'Search the guard’s table' }
    });

    // cover
    const crates = [[14, 14.4], [22, 13.8], [27, 17], [24.5, 10.6], [12.5, 16.2]];
    for (const [x, y] of crates) {
      q = P(x, y);
      map.props.push({ type: 'crate', x: q.x, y: q.y, solid: 10, blocksSight: true });
    }
    const barrels = [[12.5, 10.2], [29, 10], [20.5, 17.1], [25.5, 15.1], [28.5, 12.6]];
    for (const [x, y] of barrels) {
      q = P(x, y);
      map.props.push({ type: 'barrel', x: q.x, y: q.y, solid: 8, blocksSight: true });
    }

    // decorative rack
    q = P(30, 17);
    map.props.push({ type: 'swordRack', x: q.x, y: q.y, solid: 8, blocksSight: true, interact: { key: 'rack', label: 'Inspect the weapon rack' } });
    q = P(13, 18.2);
    map.props.push({ type: 'chains', x: q.x, y: q.y, solid: 0 });

    // torches and light pools
    const torches = [[12, 9.4], [20, 9.4], [29.5, 9.4], [25.8, 3.4], [3, 12.2], [30.3, 14]];
    for (const [x, y] of torches) {
      q = P(x, y);
      map.props.push({ type: 'torch', x: q.x, y: q.y, solid: 0 });
      map.lights.push({ type: 'torch', x: q.x, y: q.y - 24, r: 84, phase: Art.hash(x, y, 5) });
    }
    map.lights.push({ type: 'torch', x: map.spawn.x, y: map.spawn.y - 40, r: 48, phase: 2.1 });

    // guards — patrol routes in pixel space
    const route = (pts) => pts.map(([x, y]) => ({ x: x * T + 12, y: y * T + 20 }));
    map.guards = [
      { id: 'g1', route: route([[12.4, 16.6], [18.6, 16.6], [18.6, 12.3], [12.4, 12.3]]), speed: 36, fov: 0.95, range: 124, delay: 0.6 },
      { id: 'g2', route: route([[21, 15.4], [28.4, 15.4], [28.4, 10.4], [21, 10.4]]), speed: 31, fov: 0.9, range: 118, delay: 1.2 },
      { id: 'g3', route: route([[24.2, 6.4], [29.2, 6.4], [29.2, 4.6], [24.2, 4.6]]), speed: 27, fov: 0.95, range: 108, delay: 0.9 }
    ].map((g) => ({
      ...g,
      i: 0, x: g.route[0].x, y: g.route[0].y, dir: 'right', moving: true,
      target: g.route[1], angle: 0, detect: 0, alert: 0, phase: Art.hash(g.id.charCodeAt(1), 1, 2) * 5,
      pause: 0.4
    }));

    buildCache(map);
    return map;
  }

  /* ============================================================
     CACHE + DECOR
     ============================================================ */
  function buildCache(map) {
    const c = document.createElement('canvas');
    c.width = map.w * T;
    c.height = map.h * T;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        Art.drawTile(g, map.tiles[y][x], x, y, map.kind);
      }
    }

    if (map.kind === 'forest') {
      // path edge tufts and flowers baked into the ground
      for (let y = 1; y < map.h - 1; y++) {
        for (let x = 1; x < map.w - 1; x++) {
          const t = map.tiles[y][x];
          if (t === 0) {
            const n = Art.hash(x, y, 33);
            if (n > 0.7) {
              const px = x * T + 4 + (n * 15) % 14;
              const py = y * T + 5 + (n * 31) % 14;
              g.fillStyle = n > 0.9 ? '#dfcb79' : '#548f56';
              g.fillRect(px, py, 1, 4);
              if (n > 0.9) g.fillRect(px - 1, py - 1, 3, 2);
            }
            // soft shadow under nearby trees
            if (map.tiles[y - 1][x] === 2) {
              g.fillStyle = 'rgba(13,34,20,0.18)';
              g.beginPath();
              g.ellipse(x * T + 12, y * T + 8, 15, 6, 0, 0, Math.PI * 2);
              g.fill();
            }
          }
          if (t === 1) {
            const n = Art.hash(x, y, 44);
            if (n > 0.72) {
              g.fillStyle = n > 0.9 ? '#c5a878' : '#91704b';
              g.fillRect(x * T + (n * 19) % 18, y * T + (n * 29) % 18, 2, 1);
            }
            if (n > 0.94) {
              g.fillStyle = 'rgba(73,55,33,0.35)';
              g.fillRect(x * T + 3, y * T + 7, 8, 1);
            }
          }
        }
      }
      // pond edge
      for (let y = 1; y < map.h - 1; y++) {
        for (let x = 1; x < map.w - 1; x++) {
          if (map.tiles[y][x] !== 4) continue;
          g.fillStyle = 'rgba(180,220,220,0.18)';
          if (map.tiles[y - 1][x] !== 4) g.fillRect(x * T, y * T, T, 2);
          if (map.tiles[y][x - 1] !== 4) g.fillRect(x * T, y * T, 2, T);
          g.fillStyle = 'rgba(16,58,44,0.3)';
          if (map.tiles[y + 1][x] !== 4) g.fillRect(x * T, y * T + T - 2, T, 2);
        }
      }
    } else {
      // stone seams, wall bases, damp patches
      for (let y = 1; y < map.h - 1; y++) {
        for (let x = 1; x < map.w - 1; x++) {
          if (map.tiles[y][x] !== FLOOR && map.tiles[y][x] !== STAIRS) continue;
          if (map.tiles[y - 1][x] === WALL || map.tiles[y - 1][x] === BARS) {
            g.fillStyle = 'rgba(0,0,0,0.24)';
            g.fillRect(x * T, y * T, T, 7);
          }
          const n = Art.hash(x, y, 58);
          if (n > 0.86) {
            g.fillStyle = 'rgba(10,14,20,0.28)';
            g.fillRect(x * T + 3, y * T + 9, 10 + n * 6, 1);
          }
          if (n > 0.94) {
            g.fillStyle = 'rgba(80,107,62,0.22)';
            g.fillRect(x * T + 2, y * T + 2, 4, 2);
          }
        }
      }
      // cell bars floor shadow
      for (let y = 11; y <= 19; y++) {
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.fillRect(10 * T, y * T, T, T);
      }
    }

    map.cache = c;
    map.flatCanvas = c;
  }

  /* ============================================================
     RENDERING HELPERS
     ============================================================ */
  function drawGround(ctx, map, cam) {
    const vx = Math.max(0, Math.floor(cam.x));
    const vy = Math.max(0, Math.floor(cam.y));
    const vw = Math.min(640, map.w * T - vx);
    const vh = Math.min(360, map.h * T - vy);
    ctx.drawImage(map.cache, vx, vy, vw, vh, vx, vy, vw, vh);
  }

  function drawWater(ctx, map, cam, t) {
    const x0 = Math.floor(cam.x / T) - 1;
    const y0 = Math.floor(cam.y / T) - 1;
    const x1 = x0 + Math.ceil(640 / T) + 2;
    const y1 = y0 + Math.ceil(360 / T) + 2;
    for (let y = Math.max(0, y0); y < Math.min(map.h, y1); y++) {
      for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) {
        if (map.tiles[y][x] !== 4) continue;
        const px = x * T, py = y * T;
        const shimmer = Math.sin(t * 1.6 + x * 1.7 + y) * 3;
        ctx.fillStyle = 'rgba(143,203,218,0.16)';
        ctx.fillRect(px + 3, py + 7 + shimmer, 11, 1);
        ctx.fillRect(px + 12, py + 15 - shimmer, 8, 1);
        if ((x + y) % 3 === 0) {
          ctx.fillStyle = 'rgba(211,240,243,0.22)';
          ctx.fillRect(px + 7, py + 11 + Math.sin(t * 2 + x) * 2, 4, 1);
        }
      }
    }
  }

  function drawProp(ctx, p, t) {
    switch (p.type) {
      case 'tent': Art.drawTent(ctx, p.x, p.y, p.variant, t); break;
      case 'campfire': Art.drawCampfire(ctx, p.x, p.y, t); break;
      case 'sign': Art.drawSign(ctx, p.x, p.y, p.label); break;
      case 'chest': Art.drawChest(ctx, p.x, p.y, p.opened); break;
      case 'crate': Art.drawCrate(ctx, p.x, p.y); break;
      case 'barrel': Art.drawBarrel(ctx, p.x, p.y); break;
      case 'banner': Art.drawBanner(ctx, p.x, p.y, t); break;
      case 'stump': Art.drawStump(ctx, p.x, p.y); break;
      case 'bush': Art.drawBush(ctx, p.x, p.y, p.variant); break;
      case 'table': Art.drawTable(ctx, p.x, p.y, p.knife); break;
      case 'bed': Art.drawBed(ctx, p.x, p.y); break;
      case 'bucket': Art.drawBucket(ctx, p.x, p.y); break;
      case 'torch': Art.drawTorch(ctx, p.x, p.y, t); break;
      case 'chains': Art.drawChains(ctx, p.x, p.y); break;
      case 'swordRack': Art.drawSwordRack(ctx, p.x, p.y); break;
      case 'campTent': break; // invisible interaction anchor
      default: break;
    }
  }

  function visibleProps(map, cam) {
    const pad = 90;
    return map.props.filter((p) =>
      p.x > cam.x - pad && p.x < cam.x + 640 + pad &&
      p.y > cam.y - pad && p.y < cam.y + 360 + pad
    );
  }

  function visibleObjectTiles(map, cam) {
    const out = [];
    const x0 = Math.max(0, Math.floor((cam.x - 60) / T));
    const y0 = Math.max(0, Math.floor((cam.y - 90) / T));
    const x1 = Math.min(map.w - 1, Math.ceil((cam.x + 700) / T));
    const y1 = Math.min(map.h - 1, Math.ceil((cam.y + 420) / T));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = map.tiles[y][x];
        if (t === 2 || t === 3) out.push({ tx: x, ty: y, type: t });
      }
    }
    return out;
  }

  /* ============================================================
     GUARDS / STEALTH
     ============================================================ */
  function hasLineOfSight(map, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 6);
    for (let i = 1; i < steps; i++) {
      const u = i / steps;
      const x = ax + dx * u;
      const y = ay + dy * u;
      if (tileSolid(tileAt(map, Math.floor(x / T), Math.floor(y / T)))) return false;
      for (const p of map.props) {
        if (!p.blocksSight) continue;
        const pdx = x - p.x;
        const pdy = y - (p.y - 8);
        const r = (p.solid || 6) + 3;
        if (pdx * pdx + pdy * pdy < r * r) return false;
      }
    }
    return true;
  }

  function visionPolygon(map, guard) {
    const ex = guard.x;
    const ey = guard.y - 12;
    const fov = guard.fov || 0.95;
    const range = guard.range || 120;
    const pts = [ex, ey];
    const rays = 17;
    for (let i = 0; i <= rays; i++) {
      const a = guard.angle - fov / 2 + (fov * i) / rays;
      let dist = range;
      const step = 5;
      for (let d = step; d <= range; d += step) {
        const x = ex + Math.cos(a) * d;
        const y = ey + Math.sin(a) * d;
        let blocked = tileSolid(tileAt(map, Math.floor(x / T), Math.floor(y / T)));
        if (!blocked) {
          for (const p of map.props) {
            if (!p.blocksSight) continue;
            const pdx = x - p.x;
            const pdy = y - (p.y - 8);
            const r = (p.solid || 6) + 2;
            if (pdx * pdx + pdy * pdy < r * r) { blocked = true; break; }
          }
        }
        if (blocked) { dist = d; break; }
      }
      pts.push(ex + Math.cos(a) * dist, ey + Math.sin(a) * dist);
    }
    return pts;
  }

  function resetGuards(map) {
    for (const g of map.guards) {
      g.i = 0;
      g.x = g.route[0].x;
      g.y = g.route[0].y;
      g.target = g.route[1 % g.route.length];
      g.detect = 0;
      g.alert = 0;
      g.pause = 0.5;
      g.moving = true;
      g.angle = Math.atan2(g.target.y - g.y, g.target.x - g.x);
      g.dir = Math.cos(g.angle) < 0 ? 'left' : 'right';
    }
  }

  return {
    T,
    WALL, BARS, FLOOR, STAIRS,
    createForest,
    createPrison,
    tileAt,
    tileSolid,
    isSolidAt,
    canStand,
    buildCache,
    drawGround,
    drawWater,
    drawProp,
    visibleProps,
    visibleObjectTiles,
    hasLineOfSight,
    visionPolygon,
    resetGuards
  };
})();
