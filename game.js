/* =========================================================================
   DIDNAPPER 2 — MOONLIGHT RESCUE
   A self-contained, touch-first stealth mini game.
   ========================================================================= */
(() => {
  'use strict';

  const WORLD_W = 1280;
  const WORLD_H = 1440;
  const TILE = 80;
  const COLS = 16;
  const ROWS = 18;
  const TAU = Math.PI * 2;
  const STORAGE_SOUND = 'did2.sound';
  const STORAGE_BEST = 'did2.best';

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE_POINTER = window.matchMedia('(pointer: coarse)').matches;

  const FRIEND_STYLES = [
    { dress: '#ff9c82', trim: '#ffe0b8', hair: '#3a2630' },
    { dress: '#82cfff', trim: '#e0f7ff', hair: '#2c294b' },
    { dress: '#c8a1ff', trim: '#f4e6ff', hair: '#d8ae74' },
    { dress: '#96e7a7', trim: '#e8ffd9', hair: '#573722' },
    { dress: '#ffd17c', trim: '#fff2c8', hair: '#49302c' },
    { dress: '#ffa6c7', trim: '#ffe8ef', hair: '#2f334c' },
    { dress: '#8be4dc', trim: '#e3fffb', hair: '#6a3f29' }
  ];

  /* ------------------------------------------------------------------ levels */

  const LEVELS = [
    {
      name: 'Garden Gate',
      place: 'The west garden',
      objective: 'Free Poppy from the garden cage.',
      intro: 'The garden is asleep. One small lantern is not.',
      clearLine: 'Poppy is out. The old gate clicks shut behind you.',
      names: ['Poppy'],
      par: 32,
      map: [
        '################',
        '#P.............#',
        '#..............#',
        '#...C.##.......#',
        '#.....##.......#',
        '#..............#',
        '#..............#',
        '#..............#',
        '#....##........#',
        '#....##........#',
        '#..............#',
        '#......##......#',
        '#......##......#',
        '#..............#',
        '#....b....b....#',
        '#..............#',
        '#..............#',
        '################'
      ],
      guards: [
        { path: [[3, 5], [3, 2], [9, 2], [9, 5]], range: 226, fov: 1.2, speed: 63 }
      ],
      lamps: [[4, 5], [12, 10]],
      fireflies: 34
    },
    {
      name: 'The Long Walk',
      place: 'The hedge walk',
      objective: 'Two friends are waiting in the hedge maze.',
      intro: 'The hedges remember every footstep. Walk softly.',
      clearLine: 'Two more lanterns in the window. Two friends on the path home.',
      names: ['Mina', 'June'],
      par: 58,
      map: [
        '################',
        '#P.............#',
        '#.....b........#',
        '#...###....##..#',
        '#...###....##..#',
        '#..............#',
        '#......#.......#',
        '#......#..C....#',
        '#......#.......#',
        '#...b..####....#',
        '#......#.......#',
        '#......#.......#',
        '#..............#',
        '#....##....##..#',
        '#....##....##..#',
        '#..............#',
        '#........C.....#',
        '################'
      ],
      guards: [
        { path: [[12, 2], [12, 10], [10, 15], [3, 15], [3, 5]], range: 228, fov: 1.22, speed: 67 },
        { path: [[3, 7], [13, 7], [13, 12], [5, 12]], range: 236, fov: 1.18, speed: 62 }
      ],
      lamps: [[2, 3], [13, 9], [8, 16]],
      fireflies: 42
    },
    {
      name: 'Fountain Court',
      place: 'The old fountain',
      objective: 'Three cages surround the old fountain.',
      intro: 'Three guards. Three cages. The fountain keeps the moon.',
      clearLine: 'The fountain rings once as the last cage opens.',
      names: ['Wren', 'Sable', 'Iris'],
      par: 76,
      map: [
        '################',
        '#P.............#',
        '#....b....b....#',
        '#..###....###..#',
        '#..###....###..#',
        '#..............#',
        '#....C....C....#',
        '#..............#',
        '#....######....#',
        '#....######....#',
        '#..............#',
        '#......C.......#',
        '#..............#',
        '#..##......##..#',
        '#..##......##..#',
        '#....b....b....#',
        '#..............#',
        '################'
      ],
      guards: [
        { path: [[4, 5], [11, 5], [11, 10], [4, 10]], range: 240, fov: 1.26, speed: 65 },
        { path: [[2, 2], [13, 2], [13, 6], [2, 6]], range: 222, fov: 1.16, speed: 70 },
        { path: [[3, 15], [12, 15], [12, 11], [3, 11]], range: 232, fov: 1.22, speed: 62 }
      ],
      lamps: [[2, 7], [13, 7], [8, 12]],
      fireflies: 48,
      centerpiece: { col: 5, row: 8, cols: 6, rows: 2, type: 'pool' }
    },
    {
      name: 'Moonlit Manor',
      place: 'The last garden',
      objective: 'The last four friends. One way out.',
      intro: 'Four lanterns left. Four cages. One very long way home.',
      clearLine: 'The manor lights go dark. Nobody follows you home.',
      names: ['Tessa', 'Lark', 'Nyx', 'Ember'],
      par: 98,
      map: [
        '################',
        '#P....#........#',
        '#.....#...C....#',
        '#..#..#........#',
        '#..#..#..###...#',
        '#..#...........#',
        '#..#....#......#',
        '#.......#..C...#',
        '#....#..#......#',
        '#....#.........#',
        '#....#....###..#',
        '#.........#....#',
        '#..C......#....#',
        '#....#....#....#',
        '#....#.........#',
        '#...........C..#',
        '#..b........b..#',
        '################'
      ],
      guards: [
        { path: [[13, 1], [13, 5], [9, 5], [9, 1]], range: 238, fov: 1.22, speed: 68 },
        { path: [[2, 5], [7, 5], [7, 10], [2, 10]], range: 230, fov: 1.2, speed: 64 },
        { path: [[12, 7], [12, 12], [14, 12], [14, 7]], range: 222, fov: 1.16, speed: 71 },
        { path: [[2, 16], [13, 16], [13, 11], [2, 11]], range: 242, fov: 1.26, speed: 62 }
      ],
      lamps: [[1, 7], [14, 4], [8, 16]],
      fireflies: 54
    }
  ];

  /* ------------------------------------------------------------------ helpers */

  const clamp = (v, min, max) => v < min ? min : v > max ? max : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const pad2 = n => String(n).padStart(2, '0');

  function angleDiff(a, b) {
    let d = (a - b + Math.PI) % TAU;
    if (d < 0) d += TAU;
    return d - Math.PI;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${pad2(s)}`;
  }

  function hash2(x, y, seed = 0) {
    let h = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + seed * 977, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.28);
    ctx.bezierCurveTo(x, y, x - s * 0.55, y - s * 0.08, x - s * 0.55, y + s * 0.4);
    ctx.bezierCurveTo(x - s * 0.55, y + s * 0.72, x - s * 0.12, y + s * 0.9, x, y + s * 1.16);
    ctx.bezierCurveTo(x + s * 0.12, y + s * 0.9, x + s * 0.55, y + s * 0.72, x + s * 0.55, y + s * 0.4);
    ctx.bezierCurveTo(x + s * 0.55, y - s * 0.08, x, y, x, y + s * 0.28);
    ctx.closePath();
  }

  function applyDeadzone(value, zone) {
    const a = Math.abs(value);
    if (a <= zone) return 0;
    return Math.sign(value) * ((a - zone) / (1 - zone));
  }

  /* ------------------------------------------------------------------ audio */

  const Sound = {
    ctx: null,
    master: null,
    ambient: null,
    enabled: true,
    ready: false,

    init() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.78 : 0;
        this.master.connect(this.ctx.destination);

        this.ambient = this.ctx.createGain();
        this.ambient.gain.value = 0;
        this.ambient.connect(this.master);

        [55, 82.5].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.value = i ? 0.011 : 0.017;
          osc.connect(gain);
          gain.connect(this.ambient);
          osc.start();
        });

        const seconds = 2;
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * seconds, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let last = 0;
        for (let i = 0; i < data.length; i += 1) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.018 * white) / 1.018;
          data[i] = last * 3.2;
        }
        const noise = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const noiseGain = this.ctx.createGain();
        noise.buffer = buffer;
        noise.loop = true;
        filter.type = 'lowpass';
        filter.frequency.value = 380;
        noiseGain.gain.value = 0.016;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ambient);
        noise.start();

        this.ambient.gain.setTargetAtTime(0.6, this.ctx.currentTime, 1.4);
        this.ready = true;
      } catch {
        this.ctx = null;
      }
    },

    resume() {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    },

    setEnabled(on) {
      this.enabled = !!on;
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(this.enabled ? 0.78 : 0, this.ctx.currentTime, 0.04);
      }
    },

    tone(freq, duration = 0.1, opts = {}) {
      if (!this.ctx) return;
      const { type = 'sine', volume = 0.1, delay = 0, slide = null } = opts;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + duration);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.025);
    },

    noise(duration = 0.08, opts = {}) {
      if (!this.ctx) return;
      const { volume = 0.08, delay = 0, frequency = 700, type = 'bandpass', q = 0.8 } = opts;
      const t0 = this.ctx.currentTime + delay;
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      filter.type = type;
      filter.frequency.value = frequency;
      filter.Q.value = q;
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      source.start(t0);
    },

    ui() {
      this.tone(620, 0.055, { type: 'triangle', volume: 0.06 });
      this.tone(930, 0.045, { type: 'sine', volume: 0.035, delay: 0.028 });
    },

    step() {
      this.noise(0.035, { volume: 0.024, frequency: 520, type: 'bandpass', q: 1.1 });
    },

    alert() {
      this.tone(340, 0.09, { type: 'square', volume: 0.035 });
      this.tone(470, 0.12, { type: 'square', volume: 0.028, delay: 0.08 });
    },

    rescue() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this.tone(f, 0.26, { type: 'sine', volume: 0.075, delay: i * 0.072 });
        this.tone(f * 2, 0.14, { type: 'triangle', volume: 0.018, delay: i * 0.072 });
      });
    },

    gateReady() {
      [392, 523.25, 659.25].forEach((f, i) => {
        this.tone(f, 0.32, { type: 'sine', volume: 0.06, delay: i * 0.1 });
      });
    },

    caught() {
      this.tone(140, 0.38, { type: 'sawtooth', volume: 0.06, slide: 48 });
      this.noise(0.28, { volume: 0.08, frequency: 220, type: 'lowpass' });
    },

    clear() {
      [392, 493.88, 587.33, 783.99, 987.77].forEach((f, i) => {
        this.tone(f, 0.38, { type: 'sine', volume: 0.07, delay: i * 0.1 });
      });
    },

    win() {
      [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        this.tone(f, 0.55, { type: 'sine', volume: 0.065, delay: i * 0.115 });
        this.tone(f * 0.5, 0.5, { type: 'triangle', volume: 0.018, delay: i * 0.115 });
      });
    }
  };

  function buzz(pattern) {
    if (REDUCED_MOTION) return;
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {}
  }

  /* -------------------------------------------------------------------- DOM */

  const $ = id => document.getElementById(id);
  const DOM = {
    canvas: $('game'),
    hud: $('hud'),
    levelNum: $('hudLevelNum'),
    levelName: $('hudLevelName'),
    objective: $('hudObjective'),
    friendTrack: $('friendTrack'),
    stealthPill: $('stealthPill'),
    stealthText: $('stealthText'),
    soundBtn: $('soundBtn'),
    soundIconUse: $('soundIconUse'),
    pauseBtn: $('pauseBtn'),
    toast: $('toast'),
    sting: $('sting'),
    joyHint: $('joyHint'),
    joystick: $('joystick'),
    joyThumb: $('joyThumb'),
    tiltChip: $('tiltChip'),
    actionBtn: $('actionBtn'),
    actionIcon: $('actionIcon'),
    actionLabel: $('actionLabel'),
    actionSub: $('actionSub'),
    levelIntro: $('levelIntro'),
    introKicker: $('introKicker'),
    introName: $('introName'),
    introObjective: $('introObjective'),
    caughtOverlay: $('caughtOverlay'),
    titleScreen: $('titleScreen'),
    howScreen: $('howScreen'),
    pauseScreen: $('pauseScreen'),
    clearScreen: $('clearScreen'),
    winScreen: $('winScreen'),
    playBtn: $('playBtn'),
    howBtn: $('howBtn'),
    titleTiltBtn: $('titleTiltBtn'),
    titleTiltLabel: $('titleTiltLabel'),
    bestLine: $('bestLine'),
    howCloseBtn: $('howCloseBtn'),
    howPlayBtn: $('howPlayBtn'),
    pauseSoundBtn: $('pauseSoundBtn'),
    pauseSoundSub: $('pauseSoundSub'),
    pauseTiltBtn: $('pauseTiltBtn'),
    pauseTiltSub: $('pauseTiltSub'),
    recenterBtn: $('recenterBtn'),
    pauseLine: $('pauseLine'),
    resumeBtn: $('resumeBtn'),
    restartBtn: $('restartBtn'),
    quitBtn: $('quitBtn'),
    motionNote: $('motionNote'),
    clearTitle: $('clearTitle'),
    clearStars: $('clearStars'),
    clearTime: $('clearTime'),
    clearFreed: $('clearFreed'),
    clearSpots: $('clearSpots'),
    clearLine: $('clearLine'),
    nextBtn: $('nextBtn'),
    clearQuitBtn: $('clearQuitBtn'),
    winTitle: $('winTitle'),
    winTime: $('winTime'),
    winSpots: $('winSpots'),
    winBest: $('winBest'),
    againBtn: $('againBtn'),
    winQuitBtn: $('winQuitBtn')
  };
  const ctx = DOM.canvas.getContext('2d');

  /* ------------------------------------------------------------------- state */

  const G = {
    mode: 'title',
    time: 0,
    levelIndex: 0,
    level: null,
    walk: [],
    bushes: [],
    walls: [],
    lamps: [],
    captives: [],
    guards: [],
    followers: [],
    particles: [],
    fireflies: [],
    trail: [],
    trailTimer: 0,
    gate: null,
    player: null,
    seed: 1,
    levelTime: 0,
    attempts: 0,
    spottedInLevel: 0,
    session: null,
    interact: null,
    actionSig: '',
    introTimer: 0,
    caughtTimer: 0,
    clearTimer: 0,
    clearShown: false,
    shake: 0,
    danger: 0,
    camera: { x: WORLD_W / 2, y: WORLD_H / 2 },
    view: { w: window.innerWidth, h: window.innerHeight, z: 1, dpr: 1 },
    input: { joyX: 0, joyY: 0, active: false, pointer: null, baseX: 0, baseY: 0 },
    keys: new Set(),
    tilt: {
      supported: 'DeviceOrientationEvent' in window,
      enabled: false,
      calibrated: false,
      baseA: 0,
      baseB: 0,
      rawA: 0,
      rawB: 0,
      x: 0,
      y: 0,
      hasReading: false,
      watchdog: 0
    },
    toastTimer: 0,
    lastStealth: '',
    lastFrame: 0,
    attract: true
  };

  // Stored preferences are best-effort only (private browsing can throw).
  try {
    const storedSound = localStorage.getItem(STORAGE_SOUND);
    if (storedSound === 'off') Sound.enabled = false;
  } catch {}

  /* --------------------------------------------------------------- ui utils */

  function setMode(mode) {
    G.mode = mode;
    document.body.dataset.state = mode;
  }

  const SCREEN_IDS = {
    title: DOM.titleScreen,
    how: DOM.howScreen,
    pause: DOM.pauseScreen,
    clear: DOM.clearScreen,
    win: DOM.winScreen
  };

  function setScreen(name) {
    Object.entries(SCREEN_IDS).forEach(([key, el]) => {
      el.classList.toggle('is-active', key === name);
    });
  }

  function showToast(text, tone = '', duration = 2400) {
    window.clearTimeout(G.toastTimer);
    DOM.toast.textContent = text;
    DOM.toast.dataset.tone = tone;
    DOM.toast.classList.add('is-show');
    G.toastTimer = window.setTimeout(() => DOM.toast.classList.remove('is-show'), duration);
  }

  function flashSting(kind) {
    DOM.sting.classList.remove('flash-good', 'flash-bad');
    void DOM.sting.offsetWidth;
    DOM.sting.classList.add(kind === 'bad' ? 'flash-bad' : 'flash-good');
  }

  function getBestSeconds() {
    try {
      const ms = Number(localStorage.getItem(STORAGE_BEST));
      return Number.isFinite(ms) && ms > 0 ? ms / 1000 : null;
    } catch {
      return null;
    }
  }

  function setBestSeconds(seconds) {
    try {
      localStorage.setItem(STORAGE_BEST, String(Math.round(seconds * 1000)));
    } catch {}
  }

  function refreshBestLine() {
    const best = getBestSeconds();
    DOM.bestLine.textContent = best ? `Best escape · ${formatTime(best)}` : 'No escapes logged yet';
  }

  function syncSoundUI() {
    DOM.soundIconUse.setAttribute('href', Sound.enabled ? '#ico-sound' : '#ico-mute');
    DOM.soundBtn.setAttribute('aria-label', Sound.enabled ? 'Mute sound' : 'Turn sound on');
    DOM.soundBtn.title = Sound.enabled ? 'Mute sound' : 'Turn sound on';
    DOM.pauseSoundBtn.classList.toggle('is-on', Sound.enabled);
    DOM.pauseSoundSub.textContent = Sound.enabled ? 'Crickets & chimes' : 'Muted';
  }

  function setSound(on) {
    Sound.setEnabled(on);
    if (on) {
      Sound.resume();
      Sound.ui();
    }
    syncSoundUI();
    try {
      localStorage.setItem(STORAGE_SOUND, on ? 'on' : 'off');
    } catch {}
  }

  function syncTiltUI() {
    const on = G.tilt.enabled;
    document.body.classList.toggle('tilt-on', on);
    DOM.titleTiltBtn.classList.toggle('is-on', on);
    DOM.titleTiltBtn.setAttribute('aria-pressed', String(on));
    DOM.titleTiltLabel.textContent = on ? 'Tilt on' : 'Tilt controls';
    DOM.pauseTiltBtn.classList.toggle('is-on', on);
    DOM.pauseTiltSub.textContent = on ? 'On — tilt to steer' : 'Optional motion steering';
    DOM.recenterBtn.hidden = !on;
    DOM.motionNote.textContent = !G.tilt.supported
      ? 'This browser does not expose motion sensors. Touch and keyboard controls still work.'
      : on
        ? 'Hold your phone naturally. Tap “Recenter tilt” whenever you change position.'
        : 'Motion access is requested only when you turn tilt on.';
  }

  /* ------------------------------------------------------------------ levels */

  function tileCenter(col, row) {
    return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
  }

  function nearestOpen(col, row) {
    if (G.walk[row] && G.walk[row][col]) return { c: col, r: row };
    for (let radius = 1; radius < Math.max(COLS, ROWS); radius += 1) {
      for (let dr = -radius; dr <= radius; dr += 1) {
        for (let dc = -radius; dc <= radius; dc += 1) {
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
          const c = col + dc;
          const r = row + dr;
          if (G.walk[r] && G.walk[r][c]) return { c, r };
        }
      }
    }
    return { c: 1, r: 1 };
  }

  function buildLevel(index, attract = false) {
    const def = LEVELS[index];
    G.level = def;
    G.levelIndex = index;
    G.seed = index * 137 + 19;
    G.attract = attract;
    G.walk = [];
    G.walls = [];
    G.bushes = [];
    G.captives = [];
    G.guards = [];
    G.followers = [];
    G.particles = [];
    G.fireflies = [];
    G.lamps = [];
    G.trail = [];
    G.trailTimer = 0;
    G.levelTime = 0;
    G.interact = null;
    G.actionSig = '';
    G.danger = 0;
    G.shake = 0;
    G.gate = null;
    G.player = null;

    let start = { c: 1, r: 1 };
    const captiveCells = [];

    for (let r = 0; r < ROWS; r += 1) {
      const line = (def.map[r] || '').padEnd(COLS, '#');
      G.walk[r] = [];
      for (let c = 0; c < COLS; c += 1) {
        const ch = line[c];
        const wall = ch === '#';
        G.walk[r][c] = !wall;
        if (wall) {
          G.walls.push({ c, r });
        }
        if (ch === 'P') start = { c, r };
        if (ch === 'C') captiveCells.push({ c, r });
        if (ch === 'b') {
          const p = tileCenter(c, r);
          G.bushes.push({ c, r, x: p.x, y: p.y + 3, seed: hash2(c, r, G.seed) });
        }
      }
    }

    const startPoint = tileCenter(start.c, start.r);
    G.gate = { ...start, x: startPoint.x, y: startPoint.y, ready: false };

    const spawnY = walkable(start.c, start.r + 1) ? startPoint.y + 27 : startPoint.y;
    G.player = {
      x: startPoint.x,
      y: spawnY,
      radius: 17,
      dir: -Math.PI / 2,
      moving: false,
      hidden: false,
      anim: 0,
      step: 0,
      lastX: startPoint.x,
      lastY: startPoint.y
    };

    captiveCells.forEach((cell, i) => {
      const p = tileCenter(cell.c, cell.r);
      G.captives.push({
        id: i,
        name: def.names[i] || `Friend ${i + 1}`,
        x: p.x,
        y: p.y + 2,
        col: cell.c,
        row: cell.r,
        freed: false,
        phase: hash2(cell.c, cell.r, G.seed + 4) * TAU,
        style: FRIEND_STYLES[(index * 2 + i) % FRIEND_STYLES.length]
      });
    });

    def.guards.forEach((data, i) => {
      const first = data.path[0];
      const p = tileCenter(first[0], first[1]);
      const next = data.path[1] || first;
      const np = tileCenter(next[0], next[1]);
      G.guards.push({
        id: i,
        x: p.x,
        y: p.y,
        facing: Math.atan2(np.y - p.y, np.x - p.x),
        route: [],
        target: null,
        patrolIndex: 1 % data.path.length,
        path: data.path,
        wait: 0,
        scanFacing: 0,
        alert: 0,
        state: 'patrol',
        chaseTimer: 0,
        repath: 0,
        lastSeen: { x: p.x, y: p.y },
        anim: hash2(i, 4, G.seed) * 8,
        speed: data.speed || 64,
        chaseSpeed: 127,
        range: data.range || 230,
        fov: data.fov || 1.2,
        wasAlerted: false
      });
    });

    def.lamps.forEach(([c, r]) => {
      const p = tileCenter(c, r);
      G.lamps.push({ c, r, x: p.x, y: p.y, phase: hash2(c, r, G.seed + 8) * TAU });
    });

    const rand = mulberry32(G.seed * 7919 + 13);
    for (let i = 0; i < (def.fireflies || 36); i += 1) {
      G.fireflies.push({
        x: 40 + rand() * (WORLD_W - 80),
        y: 40 + rand() * (WORLD_H - 80),
        baseX: 0,
        baseY: 0,
        amp: 8 + rand() * 28,
        speed: 0.25 + rand() * 0.8,
        phase: rand() * TAU,
        size: 0.7 + rand() * 1.5
      });
      const f = G.fireflies[G.fireflies.length - 1];
      f.baseX = f.x;
      f.baseY = f.y;
    }

    if (attract) {
      const open = nearestOpen(7, 7);
      const p = tileCenter(open.c, open.r);
      G.player.x = p.x;
      G.player.y = p.y;
      G.camera.x = WORLD_W / 2;
      G.camera.y = WORLD_H / 2;
      for (let i = 0; i < 48; i += 1) {
        G.trail.push({ x: G.player.x, y: G.player.y });
      }
    } else {
      for (let i = 0; i < 48; i += 1) {
        G.trail.push({ x: G.player.x, y: G.player.y });
      }
      G.camera.x = G.player.x;
      G.camera.y = G.player.y;
    }

    buildFriendTrack();
    updateHud(true);
    updateActionUI();
  }

  function buildFriendTrack() {
    if (!G.level) return;
    DOM.friendTrack.innerHTML = G.captives.map((c, i) =>
      `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-heart"></use></svg>`
    ).join('');
    DOM.friendTrack.setAttribute('aria-label', `0 of ${G.captives.length} friends freed`);
  }

  function updateFriendTrack() {
    const hearts = DOM.friendTrack.querySelectorAll('svg');
    let freed = 0;
    G.captives.forEach((c, i) => {
      if (c.freed) freed += 1;
      if (hearts[i]) hearts[i].classList.toggle('is-free', c.freed);
    });
    DOM.friendTrack.setAttribute('aria-label', `${freed} of ${G.captives.length} friends freed`);
  }

  function allFreed() {
    return G.captives.length > 0 && G.captives.every(c => c.freed);
  }

  function objectiveText() {
    if (!G.level) return '';
    const left = G.captives.filter(c => !c.freed).length;
    if (left === 0) return 'Return to the gate';
    if (left === 1) {
      const one = G.captives.find(c => !c.freed);
      return `Free ${one.name}`;
    }
    return `Free ${left} friends`;
  }

  function updateHud(force = false) {
    if (!G.level) return;
    DOM.levelNum.textContent = pad2(G.levelIndex + 1);
    DOM.levelName.textContent = G.level.name;
    DOM.objective.textContent = objectiveText();

    let tone = 'quiet';
    let label = 'QUIET';
    const alerted = G.guards.some(g => g.state === 'chase' || g.alert > 0.42);
    if (G.player && G.player.hidden && !G.guards.some(g => g.state === 'chase')) {
      tone = 'hidden';
      label = 'HIDDEN';
    } else if (alerted) {
      tone = 'seen';
      label = 'SEEN';
    }
    const stealthKey = tone + label;
    if (force || G.lastStealth !== stealthKey) {
      G.lastStealth = stealthKey;
      DOM.stealthPill.dataset.tone = tone;
      DOM.stealthText.textContent = label;
    }
  }

  /* -------------------------------------------------------------- pathfinding */

  function walkable(c, r) {
    return !!(G.walk[r] && G.walk[r][c]);
  }

  function findPath(sc, sr, tc, tr) {
    if (!walkable(sc, sr) || !walkable(tc, tr)) return [];
    if (sc === tc && sr === tr) return [];

    const keyOf = (c, r) => c + ',' + r;
    const open = [{ c: sc, r: sr, g: 0, f: Math.abs(tc - sc) + Math.abs(tr - sr), parent: null }];
    const closed = new Set();

    while (open.length) {
      let bestIndex = 0;
      for (let i = 1; i < open.length; i += 1) {
        if (open[i].f < open[bestIndex].f) bestIndex = i;
      }
      const node = open.splice(bestIndex, 1)[0];
      const key = keyOf(node.c, node.r);
      if (closed.has(key)) continue;
      closed.add(key);

      if (node.c === tc && node.r === tr) {
        const cells = [];
        let n = node;
        while (n) {
          cells.push(n);
          n = n.parent;
        }
        cells.reverse();
        cells.shift();
        return cells.map(cell => {
          const p = tileCenter(cell.c, cell.r);
          return { x: p.x, y: p.y, c: cell.c, r: cell.r };
        });
      }

      const neighbors = [
        [node.c + 1, node.r],
        [node.c - 1, node.r],
        [node.c, node.r + 1],
        [node.c, node.r - 1]
      ];
      for (const [c, r] of neighbors) {
        if (!walkable(c, r)) continue;
        const nk = keyOf(c, r);
        if (closed.has(nk)) continue;
        open.push({
          c,
          r,
          g: node.g + 1,
          f: node.g + 1 + Math.abs(tc - c) + Math.abs(tr - r),
          parent: node
        });
      }
    }
    return [];
  }

  function setPatrolTarget(guard) {
    const [c, r] = guard.path[guard.patrolIndex];
    const target = nearestOpen(c, r);
    const p = tileCenter(target.c, target.r);
    guard.target = { c: target.c, r: target.r, x: p.x, y: p.y };
    guard.route = findPath(
      Math.floor(guard.x / TILE),
      Math.floor(guard.y / TILE),
      target.c,
      target.r
    );
  }

  function followRoute(agent, speed, dt) {
    let remaining = speed * dt;
    let moved = false;
    while (remaining > 0.001 && agent.route.length) {
      const node = agent.route[0];
      const dx = node.x - agent.x;
      const dy = node.y - agent.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.001) {
        agent.route.shift();
        continue;
      }
      agent.facing = Math.atan2(dy, dx);
      if (d <= remaining) {
        agent.x = node.x;
        agent.y = node.y;
        agent.route.shift();
        remaining -= d;
        moved = true;
      } else {
        agent.x += (dx / d) * remaining;
        agent.y += (dy / d) * remaining;
        remaining = 0;
        moved = true;
      }
    }
    if (moved) agent.anim += dt * (speed / 31);
    return moved;
  }

  function moveDirect(agent, tx, ty, speed, dt) {
    const dx = tx - agent.x;
    const dy = ty - agent.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return;
    const step = Math.min(d, speed * dt);
    agent.x += (dx / d) * step;
    agent.y += (dy / d) * step;
    agent.facing = Math.atan2(dy, dx);
    agent.anim += dt * (speed / 31);
  }

  /* -------------------------------------------------------------------- input */

  function beginJoystick(event) {
    if (G.mode !== 'playing' || G.tilt.enabled || G.input.active) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const x = clamp(event.clientX, 74, window.innerWidth - 74);
    const y = clamp(event.clientY, 94, window.innerHeight - 92);
    G.input.active = true;
    G.input.pointer = event.pointerId;
    G.input.baseX = x;
    G.input.baseY = y;
    G.input.joyX = 0;
    G.input.joyY = 0;
    DOM.joystick.style.transform = `translate3d(${x - 71}px, ${y - 71}px, 0)`;
    DOM.joyThumb.style.transform = 'translate(0px, 0px)';
    DOM.joystick.classList.add('is-active');
    DOM.joyHint.classList.add('is-seen');
    try {
      DOM.canvas.setPointerCapture(event.pointerId);
    } catch {}
    event.preventDefault();
  }

  function moveJoystick(event) {
    if (!G.input.active || event.pointerId !== G.input.pointer) return;
    const dx = event.clientX - G.input.baseX;
    const dy = event.clientY - G.input.baseY;
    const len = Math.hypot(dx, dy);
    const max = 48;
    const scale = len > max ? max / len : 1;
    const tx = dx * scale;
    const ty = dy * scale;
    G.input.joyX = tx / max;
    G.input.joyY = ty / max;
    DOM.joyThumb.style.transform = `translate(${tx}px, ${ty}px)`;
    event.preventDefault();
  }

  function endJoystick(event) {
    if (!G.input.active) return;
    if (event && event.pointerId !== G.input.pointer) return;
    G.input.active = false;
    G.input.pointer = null;
    G.input.joyX = 0;
    G.input.joyY = 0;
    DOM.joystick.classList.remove('is-active');
    DOM.joyThumb.style.transform = 'translate(0px, 0px)';
  }

  function keyboardVector() {
    let x = 0;
    let y = 0;
    if (G.keys.has('ArrowLeft') || G.keys.has('a') || G.keys.has('q')) x -= 1;
    if (G.keys.has('ArrowRight') || G.keys.has('d')) x += 1;
    if (G.keys.has('ArrowUp') || G.keys.has('w') || G.keys.has('z')) y -= 1;
    if (G.keys.has('ArrowDown') || G.keys.has('s')) y += 1;
    return { x, y };
  }

  function movementVector() {
    const keys = keyboardVector();
    if (keys.x || keys.y) return keys;

    if (G.input.active) {
      if (Math.hypot(G.input.joyX, G.input.joyY) > 0.06) {
        return { x: G.input.joyX, y: G.input.joyY };
      }
      return { x: 0, y: 0 };
    }

    if (G.tilt.enabled && G.tilt.calibrated) {
      return { x: G.tilt.x, y: G.tilt.y };
    }
    return { x: 0, y: 0 };
  }

  /* --------------------------------------------------------------------- tilt */

  function rotatedTilt(beta, gamma) {
    let angle = 0;
    if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
      angle = window.screen.orientation.angle;
    } else if (typeof window.orientation === 'number') {
      angle = window.orientation;
    }
    angle = ((angle % 360) + 360) % 360;
    if (angle === 90) return { a: -beta, b: gamma };
    if (angle === 180) return { a: -gamma, b: -beta };
    if (angle === 270) return { a: beta, b: -gamma };
    return { a: gamma, b: beta };
  }

  function handleOrientation(event) {
    if (!G.tilt.enabled) return;
    if (event.beta == null && event.gamma == null) return;
    const beta = Number(event.beta) || 0;
    const gamma = Number(event.gamma) || 0;
    const rotated = rotatedTilt(beta, gamma);
    G.tilt.rawA = rotated.a;
    G.tilt.rawB = rotated.b;
    G.tilt.hasReading = true;

    if (!G.tilt.calibrated) {
      G.tilt.baseA = rotated.a;
      G.tilt.baseB = rotated.b;
      G.tilt.calibrated = true;
      G.tilt.x = 0;
      G.tilt.y = 0;
      return;
    }

    let x = (rotated.a - G.tilt.baseA) / 17;
    let y = -(rotated.b - G.tilt.baseB) / 17;
    x = applyDeadzone(clamp(x, -1, 1), 0.07);
    y = applyDeadzone(clamp(y, -1, 1), 0.07);
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    G.tilt.x = x;
    G.tilt.y = y;
  }

  async function enableTilt() {
    if (G.tilt.enabled) return true;
    if (!G.tilt.supported) {
      showToast('Tilt controls are not available on this browser.', 'warn');
      return false;
    }

    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') {
      DOM.titleTiltLabel.textContent = 'Asking…';
      try {
        const permission = await D.requestPermission();
        if (permission !== 'granted') {
          syncTiltUI();
          showToast('Motion access was not granted. Touch controls are ready.', 'warn', 3200);
          return false;
        }
      } catch {
        syncTiltUI();
        showToast('Motion access could not be requested. Touch controls are ready.', 'warn', 3200);
        return false;
      }
    }

    if (!G.tilt.listening) {
      window.addEventListener('deviceorientation', handleOrientation, true);
      G.tilt.listening = true;
    }
    G.tilt.enabled = true;
    G.tilt.calibrated = false;
    G.tilt.hasReading = false;
    G.tilt.x = 0;
    G.tilt.y = 0;
    endJoystick();
    syncTiltUI();
    showToast('Tilt on — hold naturally and lean to walk.', 'good', 3000);
    Sound.resume();
    Sound.ui();

    window.clearTimeout(G.tilt.watchdog);
    G.tilt.watchdog = window.setTimeout(() => {
      if (G.tilt.enabled && !G.tilt.hasReading) {
        disableTilt(true);
        showToast('No motion data arrived. Touch controls are back on.', 'warn', 3200);
      }
    }, 1900);
    return true;
  }

  function disableTilt(silent = false) {
    G.tilt.enabled = false;
    G.tilt.calibrated = false;
    G.tilt.x = 0;
    G.tilt.y = 0;
    if (G.tilt.listening) {
      window.removeEventListener('deviceorientation', handleOrientation, true);
      G.tilt.listening = false;
    }
    window.clearTimeout(G.tilt.watchdog);
    syncTiltUI();
    if (!silent) showToast('Tilt off. Drag anywhere to move.', '', 2200);
  }

  function toggleTilt() {
    if (G.tilt.enabled) {
      disableTilt();
      return;
    }
    enableTilt();
  }

  function recenterTilt() {
    if (!G.tilt.enabled) return;
    if (G.tilt.hasReading) {
      G.tilt.baseA = G.tilt.rawA;
      G.tilt.baseB = G.tilt.rawB;
    }
    G.tilt.calibrated = false;
    G.tilt.x = 0;
    G.tilt.y = 0;
    showToast('Tilt recentred. Hold your phone where it feels comfortable.', 'good', 2600);
    Sound.ui();
  }

  /* --------------------------------------------------------------- gameplay */

  function wallAtPoint(x, y) {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    return !(G.walk[r] && G.walk[r][c]);
  }

  function circleHitsWall(x, y, radius) {
    const minC = Math.floor((x - radius) / TILE);
    const maxC = Math.floor((x + radius) / TILE);
    const minR = Math.floor((y - radius) / TILE);
    const maxR = Math.floor((y + radius) / TILE);
    for (let r = minR; r <= maxR; r += 1) {
      for (let c = minC; c <= maxC; c += 1) {
        if (G.walk[r] && G.walk[r][c]) continue;
        const left = c * TILE;
        const top = r * TILE;
        const nx = clamp(x, left, left + TILE);
        const ny = clamp(y, top, top + TILE);
        if (dist2(x, y, nx, ny) < radius * radius) return true;
      }
    }
    return false;
  }

  function bushAt(x, y) {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    return G.bushes.some(b => b.c === c && b.r === r);
  }

  function rayDistance(x, y, angle, maxDistance) {
    const step = 7;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let d = 0; d < maxDistance; d += step) {
      if (wallAtPoint(x + cos * d, y + sin * d)) return d;
    }
    return maxDistance;
  }

  function canSee(guard) {
    if (G.mode !== 'playing' || !G.player || G.player.hidden) return false;
    const p = G.player;
    const dx = p.x - guard.x;
    const dy = p.y - guard.y;
    const d = Math.hypot(dx, dy);
    const fov = guard.state === 'chase' ? Math.min(2.25, guard.fov * 1.5) : guard.fov;
    const range = guard.state === 'chase' ? guard.range * 1.12 : guard.range;
    if (d > range || d < 1) return false;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angle, guard.facing)) > fov / 2) return false;
    return rayDistance(guard.x, guard.y, angle, d) >= d - 8;
  }

  function updatePatrol(guard, dt) {
    if (guard.wait > 0) {
      guard.wait -= dt;
      guard.facing = guard.scanFacing + Math.sin(G.time * 2.1 + guard.id) * 0.55;
      return;
    }

    if (!guard.target) setPatrolTarget(guard);
    followRoute(guard, guard.speed, dt);

    if (guard.route.length === 0 && guard.target) {
      const arrived = dist(guard.x, guard.y, guard.target.x, guard.target.y) < 8;
      if (arrived) {
        guard.wait = 0.45 + hash2(guard.id, guard.patrolIndex, G.seed) * 0.65;
        guard.scanFacing = guard.facing;
        guard.patrolIndex = (guard.patrolIndex + 1) % guard.path.length;
        guard.target = null;
      } else {
        setPatrolTarget(guard);
        if (guard.route.length === 0) {
          guard.wait = 0.8;
          guard.patrolIndex = (guard.patrolIndex + 1) % guard.path.length;
          guard.target = null;
        }
      }
    }
  }

  function updateChase(guard, dt, seen) {
    if (seen) {
      guard.chaseTimer = 4.1;
      guard.lastSeen.x = G.player.x;
      guard.lastSeen.y = G.player.y;
    } else {
      guard.chaseTimer -= dt;
    }

    if (guard.chaseTimer <= 0) {
      guard.state = 'patrol';
      guard.alert = 0.22;
      guard.target = null;
      guard.route = [];
      return;
    }

    guard.repath -= dt;
    if (seen) {
      moveDirect(guard, G.player.x, G.player.y, guard.chaseSpeed, dt);
    } else {
      if (guard.repath <= 0 || guard.route.length === 0) {
        const target = nearestOpen(
          Math.floor(guard.lastSeen.x / TILE),
          Math.floor(guard.lastSeen.y / TILE)
        );
        guard.route = findPath(
          Math.floor(guard.x / TILE),
          Math.floor(guard.y / TILE),
          target.c,
          target.r
        );
        guard.repath = 0.3;
      }
      followRoute(guard, guard.chaseSpeed, dt);
      if (guard.route.length === 0 && dist(guard.x, guard.y, guard.lastSeen.x, guard.lastSeen.y) < 12) {
        guard.chaseTimer -= dt * 1.4;
      }
    }

    if (!G.player.hidden && dist(guard.x, guard.y, G.player.x, G.player.y) < 31) {
      caughtBy(guard);
    }
  }

  function updateGuards(dt, detect) {
    G.guards.forEach(guard => {
      const seen = detect && canSee(guard);

      if (detect) {
        if (seen) {
          const d = dist(guard.x, guard.y, G.player.x, G.player.y);
          guard.alert = Math.min(1, guard.alert + dt * (1.02 + 0.62 * (1 - d / guard.range)));
          guard.lastSeen.x = G.player.x;
          guard.lastSeen.y = G.player.y;
          if (guard.alert > 0.36 && !guard.wasAlerted) {
            guard.wasAlerted = true;
            Sound.alert();
            buzz(14);
          }
          if (guard.alert >= 1 && guard.state !== 'chase') {
            guard.state = 'chase';
            guard.chaseTimer = 4.2;
            guard.route = [];
            guard.repath = 0;
            Sound.alert();
            G.shake = Math.max(G.shake, 7);
            buzz([18, 30, 18]);
          }
        } else {
          guard.alert = Math.max(0, guard.alert - dt * 0.62);
          if (guard.alert < 0.18) guard.wasAlerted = false;
          if (guard.state === 'chase') guard.chaseTimer -= dt * 0.42;
        }
      } else if (guard.state === 'chase') {
        guard.state = 'patrol';
        guard.alert = 0;
        guard.target = null;
        guard.route = [];
      }

      if (guard.state === 'chase') updateChase(guard, dt, seen);
      else updatePatrol(guard, dt);
    });
  }

  function updatePlayer(dt) {
    const p = G.player;
    if (!p) return;
    const vector = movementVector();
    let len = Math.hypot(vector.x, vector.y);
    if (len > 1) {
      vector.x /= len;
      vector.y /= len;
      len = 1;
    }

    p.hidden = bushAt(p.x, p.y);
    const speed = p.hidden ? 126 : 210;
    p.moving = len > 0.08;

    if (p.moving) {
      const vx = vector.x * speed;
      const vy = vector.y * speed;
      p.dir = Math.atan2(vector.y, vector.x);
      const nextX = p.x + vx * dt;
      if (!circleHitsWall(nextX, p.y, p.radius)) p.x = nextX;
      const nextY = p.y + vy * dt;
      if (!circleHitsWall(p.x, nextY, p.radius)) p.y = nextY;
      p.anim += dt * (speed / 26);
      p.step -= dt;
      if (p.step <= 0) {
        p.step = p.hidden ? 0.42 : 0.28;
        Sound.step();
        if (!p.hidden) spawnDust(p.x, p.y + 12);
      }
    } else {
      p.anim += dt * 1.2;
    }

    G.trailTimer += dt;
    const moved = dist(p.x, p.y, p.lastX, p.lastY);
    if (G.trailTimer > 0.035 && moved > 0.25) {
      G.trailTimer = 0;
      p.lastX = p.x;
      p.lastY = p.y;
      G.trail.push({ x: p.x, y: p.y });
      if (G.trail.length > 220) G.trail.shift();
    }

    computeInteract();
  }

  function updateFollowers(dt) {
    G.followers.forEach((f, i) => {
      const idx = Math.max(0, G.trail.length - 1 - (i + 1) * 11);
      const target = G.trail[idx] || { x: G.player.x, y: G.player.y };
      const t = 1 - Math.pow(0.0008, dt);
      f.x = lerp(f.x, target.x, t);
      f.y = lerp(f.y, target.y, t);
      f.bob = Math.sin(G.time * 4.2 + i * 1.7) * 1.8;
    });
  }

  function nearestTarget() {
    let best = null;
    let bestD = Infinity;
    G.captives.forEach(c => {
      if (c.freed) return;
      const d = dist2(G.player.x, G.player.y, c.x, c.y);
      if (d < bestD) {
        bestD = d;
        best = { type: 'captive', x: c.x, y: c.y, name: c.name, id: c.id };
      }
    });
    if (best) return best;
    if (G.gate) return { type: 'gate', x: G.gate.x, y: G.gate.y, name: 'the gate', id: -1 };
    return null;
  }

  function computeInteract() {
    if (G.mode !== 'playing' || !G.player) {
      G.interact = null;
      updateActionUI();
      return;
    }

    let closest = null;
    let closestD = 76 * 76;
    G.captives.forEach(c => {
      if (c.freed) return;
      const d = dist2(G.player.x, G.player.y, c.x, c.y);
      if (d < closestD) {
        closestD = d;
        closest = { type: 'captive', captive: c, x: c.x, y: c.y, id: c.id };
      }
    });

    if (!closest && allFreed() && G.gate) {
      const d = dist2(G.player.x, G.player.y, G.gate.x, G.gate.y);
      if (d < 92 * 92) closest = { type: 'gate', x: G.gate.x, y: G.gate.y, id: -1 };
    }

    G.interact = closest;
    updateActionUI();
  }

  function updateActionUI() {
    if (!G.interact || G.mode !== 'playing') {
      DOM.actionBtn.classList.remove('is-ready');
      G.actionSig = '';
      return;
    }

    const type = G.interact.type;
    const sig = type + ':' + G.interact.id;
    DOM.actionBtn.classList.add('is-ready');
    DOM.actionBtn.dataset.type = type;

    if (sig !== G.actionSig) {
      G.actionSig = sig;
      if (type === 'gate') {
        DOM.actionIcon.firstElementChild.setAttribute('href', '#ico-exit');
        DOM.actionLabel.textContent = 'ESCAPE';
        DOM.actionSub.textContent = 'the gate';
        DOM.actionBtn.setAttribute('aria-label', 'Escape through the gate');
      } else {
        DOM.actionIcon.firstElementChild.setAttribute('href', '#ico-unlock');
        DOM.actionLabel.textContent = 'FREE';
        DOM.actionSub.textContent = G.interact.captive.name;
        DOM.actionBtn.setAttribute('aria-label', `Free ${G.interact.captive.name}`);
      }
    }
  }

  function spawnDust(x, y) {
    if (G.particles.length > 160) return;
    G.particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 5,
      vx: (Math.random() - 0.5) * 14,
      vy: -4 - Math.random() * 8,
      life: 0.45,
      max: 0.45,
      size: 1.5 + Math.random() * 2,
      color: 'rgba(168, 190, 184, 0.42)',
      type: 'dust',
      gravity: 0
    });
  }

  function burst(x, y, colors, count = 18, type = 'spark') {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const speed = 25 + Math.random() * 105;
      const color = colors[Math.floor(Math.random() * colors.length)];
      G.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.6 + Math.random() * 0.65,
        max: 1.25,
        size: 2 + Math.random() * 3.5,
        color,
        type,
        gravity: type === 'heart' ? 25 : 40,
        spin: (Math.random() - 0.5) * 5
      });
    }
  }

  function updateParticles(dt) {
    for (let i = G.particles.length - 1; i >= 0; i -= 1) {
      const p = G.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        G.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.vx *= 1 - dt * 1.1;
      p.vy *= 1 - dt * 0.6;
      if (p.spin) p.rot = (p.rot || 0) + p.spin * dt;
    }
  }

  function updateCamera(dt, snap = false) {
    let targetX;
    let targetY;

    if (G.mode === 'title') {
      targetX = WORLD_W / 2 + Math.sin(G.time * 0.075) * 150;
      targetY = WORLD_H / 2 + Math.cos(G.time * 0.052) * 105;
    } else if (G.player) {
      targetX = G.player.x + Math.cos(G.player.dir) * Math.min(60, 18 + (G.player.moving ? 34 : 0));
      targetY = G.player.y + Math.sin(G.player.dir) * Math.min(60, 18 + (G.player.moving ? 34 : 0));
    } else {
      targetX = WORLD_W / 2;
      targetY = WORLD_H / 2;
    }

    const overscan = 120;
    const viewWorldW = G.view.w / G.view.z;
    const viewWorldH = G.view.h / G.view.z;
    const halfW = viewWorldW / 2;
    const halfH = viewWorldH / 2;
    targetX = viewWorldW >= WORLD_W
      ? WORLD_W / 2
      : clamp(targetX, halfW - overscan, WORLD_W - halfW + overscan);
    targetY = viewWorldH >= WORLD_H + overscan * 2
      ? WORLD_H / 2
      : clamp(targetY, halfH - overscan, WORLD_H - halfH + overscan);

    if (snap) {
      G.camera.x = targetX;
      G.camera.y = targetY;
    } else {
      const t = 1 - Math.pow(0.00001, dt);
      G.camera.x = lerp(G.camera.x, targetX, t);
      G.camera.y = lerp(G.camera.y, targetY, t);
    }

    G.shake = Math.max(0, G.shake - dt * 24);
    const dangerTarget = G.mode === 'playing'
      ? Math.min(1, G.guards.reduce((m, g) => Math.max(m, g.state === 'chase' ? 1 : g.alert * 0.7), 0))
      : 0;
    G.danger = lerp(G.danger, dangerTarget, 1 - Math.pow(0.004, dt));
  }

  function doAction() {
    if (G.mode !== 'playing') return;
    computeInteract();
    if (!G.interact) return;

    if (G.interact.type === 'captive') {
      const captive = G.interact.captive;
      if (captive.freed) return;
      captive.freed = true;

      G.followers.push({
        name: captive.name,
        x: captive.x,
        y: captive.y,
        bob: 0,
        style: captive.style,
        phase: captive.phase
      });

      burst(captive.x, captive.y - 10, ['#ffd176', '#ff9d7d', '#fff4cd', '#65e8c2'], 22, 'spark');
      burst(captive.x, captive.y - 18, ['#ff886b', '#ffb09a'], 5, 'heart');
      G.shake = Math.max(G.shake, 3.5);
      Sound.rescue();
      buzz([18, 26, 18]);
      updateFriendTrack();
      updateHud();
      computeInteract();

      const remaining = G.captives.filter(c => !c.freed).length;
      if (remaining === 0) {
        G.gate.ready = true;
        Sound.gateReady();
        flashSting('good');
        burst(G.gate.x, G.gate.y - 8, ['#65e8c2', '#ffd176', '#fff7dc'], 26, 'spark');
        showToast('Everyone is free — return to the gate!', 'good', 3200);
      } else {
        showToast(`${captive.name} is free! ${remaining} friend${remaining === 1 ? '' : 's'} left.`, 'good', 2600);
      }
      return;
    }

    if (G.interact.type === 'gate' && allFreed()) {
      completeLevel();
    }
  }

  function caughtBy(guard) {
    if (G.mode !== 'playing') return;
    G.attempts += 1;
    G.spottedInLevel += 1;
    if (G.session) G.session.spotted += 1;
    setMode('caught');
    endJoystick();
    G.keys.clear();
    G.shake = 14;
    G.danger = 1;
    DOM.caughtOverlay.classList.add('is-show');
    flashSting('bad');
    Sound.caught();
    buzz([45, 55, 90]);
    updateActionUI();
    updateHud(true);
    G.caughtTimer = REDUCED_MOTION ? 0.85 : 1.5;
    if (guard) {
      guard.alert = 1;
      guard.state = 'chase';
    }
  }

  function retryAfterCaught() {
    DOM.caughtOverlay.classList.remove('is-show');
    buildLevel(G.levelIndex, false);
    G.levelTime = 0;
    setMode('playing');
    updateHud(true);
    updateActionUI();
    updateCamera(0, true);
    showToast('Back at the gate. Try a quieter route.', '', 2400);
  }

  function completeLevel() {
    if (G.mode !== 'playing') return;
    const result = {
      time: G.levelTime,
      spotted: G.spottedInLevel,
      attempts: G.attempts,
      level: G.levelIndex
    };
    if (G.session) {
      G.session.results[G.levelIndex] = result;
      G.session.totalTime += G.levelTime;
    }
    setMode('clear');
    endJoystick();
    G.keys.clear();
    G.interact = null;
    updateActionUI();
    G.shake = 7;
    G.gate.ready = true;
    flashSting('good');
    burst(G.gate.x, G.gate.y - 5, ['#ffd176', '#65e8c2', '#fff4d1'], 30, 'spark');
    Sound.clear();
    buzz([20, 30, 20, 30, 55]);
    G.clearTimer = REDUCED_MOTION ? 0.7 : 1.2;
    G.clearShown = false;
    updateHud(true);
  }

  function ratingFor(result) {
    if (!result) return 1;
    const par = LEVELS[result.level].par;
    if (result.spotted === 0 && result.time <= par) return 3;
    if (result.spotted <= 1 && result.time <= par * 1.55) return 2;
    return 1;
  }

  function showClearScreen() {
    if (G.clearShown) return;
    const result = G.session && G.session.results[G.levelIndex];
    const isLast = G.levelIndex >= LEVELS.length - 1;
    if (isLast) {
      showWinScreen();
      return;
    }
    G.clearShown = true;
    const stars = ratingFor(result);
    DOM.clearTitle.textContent = LEVELS[G.levelIndex].name;
    DOM.clearTime.textContent = formatTime(result ? result.time : G.levelTime);
    DOM.clearFreed.textContent = `${G.captives.length}/${G.captives.length}`;
    DOM.clearSpots.textContent = String(result ? result.spotted : G.spottedInLevel);
    DOM.clearLine.textContent = LEVELS[G.levelIndex].clearLine;
    DOM.clearStars.innerHTML = [0, 1, 2].map(i =>
      `<span class="${i < stars ? 'is-on' : ''}" aria-hidden="true">★</span>`
    ).join('');
    DOM.clearStars.setAttribute('aria-label', `${stars} of 3 stars`);
    const next = LEVELS[G.levelIndex + 1];
    const nextLabel = DOM.nextBtn.querySelector('span');
    if (nextLabel) nextLabel.textContent = `Next: ${next.name}`;
    setScreen('clear');
    setMode('clear');
    updateActionUI();
    Sound.ui();
  }

  function showWinScreen() {
    setScreen('win');
    setMode('win');
    updateActionUI();
    endJoystick();
    const total = G.session ? G.session.totalTime : 0;
    const spotted = G.session ? G.session.spotted : 0;
    const previous = getBestSeconds();
    const isNew = previous == null || total < previous;
    if (isNew) setBestSeconds(total);
    const best = isNew ? total : previous;
    DOM.winTime.textContent = formatTime(total);
    DOM.winSpots.textContent = String(spotted);
    DOM.winBest.textContent = isNew ? `★ ${formatTime(total)}` : formatTime(best);
    DOM.winBest.title = isNew ? 'New best run' : 'Best run';
    refreshBestLine();
    Sound.win();
  }

  /* ------------------------------------------------------------------ screens */

  function beginLevel(index) {
    setScreen(null);
    G.attempts = 0;
    G.spottedInLevel = 0;
    buildLevel(index, false);
    G.introTimer = REDUCED_MOTION ? 1.5 : 2.9;
    DOM.introKicker.textContent = `LEVEL ${pad2(index + 1)} · ${LEVELS[index].place.toUpperCase()}`;
    DOM.introName.textContent = LEVELS[index].name;
    DOM.introObjective.textContent = LEVELS[index].objective;
    DOM.levelIntro.classList.add('is-show');
    DOM.caughtOverlay.classList.remove('is-show');
    DOM.joyHint.classList.remove('is-seen');
    setMode('intro');
    updateHud(true);
    updateActionUI();
    updateCamera(0, true);
    Sound.resume();
  }

  function skipIntro() {
    if (G.mode !== 'intro') return;
    DOM.levelIntro.classList.remove('is-show');
    setMode('playing');
    updateHud(true);
    updateActionUI();
    showToast(LEVELS[G.levelIndex].objective, '', 2500);
    Sound.ui();
    if (G.levelIndex === 0) {
      window.setTimeout(() => {
        if (G.mode === 'playing') showToast('Drag the left side to move · tap FREE near a cage', 'good', 3400);
      }, 2700);
    }
  }

  function startRun() {
    Sound.resume();
    Sound.ui();
    G.session = { totalTime: 0, spotted: 0, results: [] };
    G.attempts = 0;
    setScreen(null);
    beginLevel(0);
  }

  function nextLevel() {
    if (G.levelIndex >= LEVELS.length - 1) {
      showWinScreen();
      return;
    }
    setScreen(null);
    beginLevel(G.levelIndex + 1);
  }

  function pauseGame() {
    if (G.mode !== 'playing') return;
    setMode('paused');
    endJoystick();
    G.keys.clear();
    const lines = [
      'The lanterns will wait.',
      'The garden holds its breath.',
      'A quiet moment under the moon.',
      'Every rescue needs a breath.'
    ];
    DOM.pauseLine.textContent = lines[Math.floor(Math.random() * lines.length)];
    syncSoundUI();
    syncTiltUI();
    setScreen('pause');
    Sound.ui();
  }

  function resumeGame() {
    if (G.mode !== 'paused') return;
    setScreen(null);
    setMode('playing');
    G.lastFrame = performance.now();
    Sound.ui();
  }

  function restartLevel() {
    setScreen(null);
    beginLevel(G.levelIndex);
    Sound.ui();
  }

  function quitToTitle() {
    setScreen('title');
    setMode('title');
    DOM.levelIntro.classList.remove('is-show');
    DOM.caughtOverlay.classList.remove('is-show');
    DOM.toast.classList.remove('is-show');
    endJoystick();
    G.keys.clear();
    G.session = null;
    buildLevel(0, true);
    refreshBestLine();
    updateActionUI();
    Sound.ui();
  }

  function handleVisibility() {
    if (document.hidden && G.mode === 'playing') pauseGame();
  }

  /* ------------------------------------------------------------------- loop */

  function update(dt) {
    G.time += dt;

    if (G.mode === 'title') {
      updateGuards(dt * 0.55, false);
      updateParticles(dt);
      updateCamera(dt);
      return;
    }

    if (G.mode === 'intro') {
      updateGuards(dt, false);
      updateParticles(dt);
      updateCamera(dt);
      G.introTimer -= dt;
      if (G.introTimer <= 0) skipIntro();
      return;
    }

    if (G.mode === 'playing') {
      G.levelTime += dt;
      updatePlayer(dt);
      updateGuards(dt, true);
      updateFollowers(dt);
      updateParticles(dt);
      updateCamera(dt);
      updateHud();
      return;
    }

    if (G.mode === 'caught') {
      updateParticles(dt * 0.55);
      updateCamera(dt);
      G.caughtTimer -= dt;
      if (G.caughtTimer <= 0) retryAfterCaught();
      return;
    }

    if (G.mode === 'clear') {
      updateParticles(dt);
      updateCamera(dt);
      G.clearTimer -= dt;
      if (G.clearTimer <= 0) showClearScreen();
      return;
    }

    if (G.mode === 'win') {
      updateParticles(dt);
      updateCamera(dt);
    }
  }

  /* ----------------------------------------------------------------- render */

  function drawVoid() {
    const pad = 360;
    const grad = ctx.createRadialGradient(WORLD_W / 2, WORLD_H * 0.45, 220, WORLD_W / 2, WORLD_H * 0.45, WORLD_W * 0.85);
    grad.addColorStop(0, '#0a1a2a');
    grad.addColorStop(0.65, '#06111d');
    grad.addColorStop(1, '#030a12');
    ctx.fillStyle = grad;
    ctx.fillRect(-pad, -pad, WORLD_W + pad * 2, WORLD_H + pad * 2);

    for (let i = 0; i < 28; i += 1) {
      const h = hash2(i, 3, G.seed + 9);
      const x = -pad + h * (WORLD_W + pad * 2);
      const y = -pad + hash2(i, 8, G.seed + 2) * (WORLD_H + pad * 2);
      const a = 0.1 + hash2(i, 2, G.seed) * 0.25;
      ctx.fillStyle = `rgba(154, 207, 211, ${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + hash2(i, 6, G.seed) * 1.5, 0, TAU);
      ctx.fill();
    }
  }

  function drawFloor() {
    ctx.fillStyle = '#07111d';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    const palette = ['#173149', '#19364f', '#142c43', '#1b3b55'];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (!G.walk[r][c]) continue;
        const x = c * TILE;
        const y = r * TILE;
        const h = hash2(c, r, G.seed);
        ctx.fillStyle = palette[Math.floor(h * palette.length)];
        ctx.fillRect(x, y, TILE, TILE);

        ctx.strokeStyle = 'rgba(2, 8, 14, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);

        ctx.fillStyle = `rgba(160, 204, 210, ${0.012 + h * 0.012})`;
        ctx.fillRect(x + 3, y + 3, TILE - 6, 1.5);

        if (h > 0.34) {
          const px = x + 10 + hash2(c + 17, r, G.seed) * 58;
          const py = y + 13 + hash2(c, r + 23, G.seed) * 54;
          ctx.fillStyle = 'rgba(154, 193, 190, 0.1)';
          ctx.beginPath();
          ctx.ellipse(px, py, 1.5 + h * 2.2, 0.8 + h, h * 2, 0, TAU);
          ctx.fill();
        }

        if (h > 0.77) {
          ctx.strokeStyle = 'rgba(3, 11, 18, 0.18)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 20 + h * 12, y + 52);
          ctx.lineTo(x + 31 + h * 12, y + 61);
          ctx.lineTo(x + 39 + h * 12, y + 58);
          ctx.stroke();
        }

        if (h > 0.63 && r > 0 && !G.walk[r - 1][c]) {
          ctx.fillStyle = 'rgba(45, 111, 78, 0.12)';
          ctx.beginPath();
          ctx.ellipse(x + 15 + h * 45, y + 4, 12 + h * 9, 4, 0, 0, TAU);
          ctx.fill();
        }
      }
    }

    for (const wall of G.walls) drawHedge(wall.c, wall.r);
  }

  function drawHedge(c, r) {
    const x = c * TILE;
    const y = r * TILE;
    const h = hash2(c, r, G.seed + 2);
    const inset = 2.5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    rr(ctx, x + inset + 3, y + inset + 6, TILE - inset * 2, TILE - inset * 2, 11);
    ctx.fill();

    const grad = ctx.createLinearGradient(0, y + 4, 0, y + TILE - 4);
    grad.addColorStop(0, h > 0.5 ? '#2b7858' : '#266c50');
    grad.addColorStop(0.42, '#1a583f');
    grad.addColorStop(1, '#0d3529');
    ctx.fillStyle = grad;
    rr(ctx, x + inset, y + inset, TILE - inset * 2, TILE - inset * 2, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(130, 210, 164, 0.14)';
    ctx.lineWidth = 1;
    rr(ctx, x + inset + 0.5, y + inset + 0.5, TILE - inset * 2 - 1, TILE - inset * 2 - 1, 10);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(179, 241, 196, 0.13)';
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 7);
    ctx.lineTo(x + TILE - 12, y + 7);
    ctx.stroke();

    for (let i = 0; i < 5; i += 1) {
      const lx = x + 9 + hash2(c * 9 + i, r, G.seed + i) * (TILE - 18);
      const ly = y + 10 + hash2(c, r * 9 + i, G.seed + 31) * (TILE - 20);
      const lw = 2.5 + hash2(c + i * 3, r + i, G.seed) * 4;
      ctx.fillStyle = `rgba(84, 166, 111, ${0.09 + hash2(i, c, G.seed) * 0.09})`;
      ctx.beginPath();
      ctx.ellipse(lx, ly, lw * 1.5, lw * 0.72, h * 3 + i, 0, TAU);
      ctx.fill();
    }

    if (h > 0.76) {
      ctx.fillStyle = 'rgba(255, 214, 135, 0.42)';
      ctx.beginPath();
      ctx.arc(x + 15 + h * 48, y + 18 + h * 35, 1.2, 0, TAU);
      ctx.fill();
    }
  }

  function drawPool() {
    const piece = G.level && G.level.centerpiece;
    if (!piece) return;
    const x = piece.col * TILE + 6;
    const y = piece.row * TILE + 6;
    const w = piece.cols * TILE - 12;
    const h = piece.rows * TILE - 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    rr(ctx, x + 5, y + 7, w, h, 34);
    ctx.fill();

    ctx.fillStyle = '#183e46';
    rr(ctx, x, y, w, h, 32);
    ctx.fill();

    const water = ctx.createLinearGradient(x, y, x, y + h);
    water.addColorStop(0, '#0c3342');
    water.addColorStop(0.55, '#0c2b3a');
    water.addColorStop(1, '#082330');
    ctx.fillStyle = water;
    rr(ctx, x + 8, y + 8, w - 16, h - 16, 26);
    ctx.fill();

    ctx.strokeStyle = 'rgba(140, 215, 219, 0.2)';
    ctx.lineWidth = 2;
    rr(ctx, x + 2, y + 2, w - 4, h - 4, 31);
    ctx.stroke();

    for (let i = 0; i < 7; i += 1) {
      const wy = y + 20 + hash2(i, 4, G.seed) * (h - 40);
      const wx = x + 20 + hash2(i, 9, G.seed) * (w - 40);
      const ww = 32 + hash2(i, 2, G.seed) * 90;
      ctx.strokeStyle = `rgba(132, 220, 218, ${0.05 + hash2(i, 1, G.seed) * 0.09})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(wx, wy, ww, 3.5 + hash2(i, 7, G.seed) * 4, 0, 0, Math.PI * 1.4);
      ctx.stroke();
    }

    const rand = mulberry32(G.seed + 333);
    for (let i = 0; i < 3; i += 1) {
      const lx = x + 30 + rand() * (w - 60);
      const ly = y + 26 + rand() * (h - 52);
      ctx.fillStyle = '#1a6347';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 7 + rand() * 5, 3.5 + rand() * 2, rand() * 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 205, 195, 0.5)';
      ctx.beginPath();
      ctx.arc(lx + 2, ly - 1, 1.3, 0, TAU);
      ctx.fill();
    }
  }

  function drawLampGlow(lamp) {
    const pulse = 0.94 + Math.sin(G.time * 1.4 + lamp.phase) * 0.06;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(lamp.x, lamp.y - 6, 0, lamp.x, lamp.y - 6, 150 * pulse);
    grad.addColorStop(0, 'rgba(255, 208, 125, 0.16)');
    grad.addColorStop(0.4, 'rgba(255, 184, 94, 0.07)');
    grad.addColorStop(1, 'rgba(255, 174, 80, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 6, 150 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawLampPost(lamp) {
    const bob = Math.sin(G.time * 1.5 + lamp.phase) * 1.2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.27)';
    ctx.beginPath();
    ctx.ellipse(lamp.x + 4, lamp.y + 18, 12, 5, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#384d52';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lamp.x, lamp.y + 17);
    ctx.lineTo(lamp.x, lamp.y - 12);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 226, 158, 0.12)';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 19 + bob, 14, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#ffe3a0';
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y - 19 + bob, 5.5, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#fff9da';
    ctx.beginPath();
    ctx.arc(lamp.x - 1.5, lamp.y - 20.5 + bob, 2.1, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#25383d';
    ctx.fillRect(lamp.x - 7, lamp.y - 25 + bob, 14, 3);
    ctx.fillRect(lamp.x - 5, lamp.y - 12 + bob, 10, 3);
  }

  function drawVisionCones() {
    G.guards.forEach(guard => {
      const chase = guard.state === 'chase';
      const fov = chase ? Math.min(2.25, guard.fov * 1.5) : guard.fov;
      const range = chase ? guard.range * 1.12 : guard.range;
      const start = guard.facing - fov / 2;
      const rays = 34;
      const points = [];

      for (let i = 0; i <= rays; i += 1) {
        const a = start + (i / rays) * fov;
        const d = rayDistance(guard.x, guard.y, a, range);
        points.push({ x: guard.x + Math.cos(a) * d, y: guard.y + Math.sin(a) * d });
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(guard.x, guard.y, 8, guard.x, guard.y, range);
      if (chase) {
        grad.addColorStop(0, 'rgba(255, 82, 78, 0.27)');
        grad.addColorStop(0.55, 'rgba(255, 67, 65, 0.13)');
        grad.addColorStop(1, 'rgba(255, 55, 55, 0)');
      } else {
        grad.addColorStop(0, 'rgba(255, 207, 119, 0.23)');
        grad.addColorStop(0.62, 'rgba(255, 191, 101, 0.1)');
        grad.addColorStop(1, 'rgba(255, 181, 92, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = chase ? 'rgba(255, 123, 116, 0.18)' : 'rgba(255, 220, 151, 0.12)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(points[0].x, points[0].y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawGate() {
    if (!G.gate) return;
    const ready = allFreed();
    const x = G.gate.x;
    const y = G.gate.y;
    const pulse = 0.86 + Math.sin(G.time * 2.2) * 0.14;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 23, 45, 14, 0, 0, TAU);
    ctx.fill();

    if (ready) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(x, y - 4, 2, x, y - 4, 95 * pulse);
      glow.addColorStop(0, 'rgba(101, 232, 194, 0.35)');
      glow.addColorStop(0.45, 'rgba(101, 232, 194, 0.12)');
      glow.addColorStop(1, 'rgba(101, 232, 194, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y - 4, 95 * pulse, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = ready ? '#2c7f6e' : '#44555a';
    rr(ctx, x - 39, y - 22, 14, 52, 4);
    ctx.fill();
    rr(ctx, x + 25, y - 22, 14, 52, 4);
    ctx.fill();

    ctx.fillStyle = ready ? '#89e3c8' : '#6c7f81';
    rr(ctx, x - 38, y - 23, 12, 3, 1.5);
    ctx.fill();
    rr(ctx, x + 26, y - 23, 12, 3, 1.5);
    ctx.fill();

    ctx.fillStyle = ready ? 'rgba(101, 232, 194, 0.17)' : 'rgba(72, 89, 92, 0.26)';
    rr(ctx, x - 25, y - 17, 50, 45, 5);
    ctx.fill();

    if (!ready) {
      ctx.strokeStyle = 'rgba(153, 178, 176, 0.42)';
      ctx.lineWidth = 2;
      for (let i = -16; i <= 16; i += 11) {
        ctx.beginPath();
        ctx.moveTo(x + i, y - 13);
        ctx.lineTo(x + i, y + 24);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x - 24, y + 3);
      ctx.lineTo(x + 24, y + 3);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const portal = ctx.createLinearGradient(x, y - 22, x, y + 28);
      portal.addColorStop(0, 'rgba(226, 255, 242, 0.52)');
      portal.addColorStop(0.45, 'rgba(101, 232, 194, 0.26)');
      portal.addColorStop(1, 'rgba(101, 232, 194, 0.04)');
      ctx.fillStyle = portal;
      rr(ctx, x - 22, y - 16, 44, 45, 4);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = ready ? '#78e0c0' : '#607273';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 40, y - 24);
    ctx.quadraticCurveTo(x, y - 50, x + 40, y - 24);
    ctx.stroke();

    if (ready) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(133, 255, 217, 0.8)';
      ctx.beginPath();
      ctx.arc(x, y - 50, 2.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = ready ? 'rgba(190, 255, 232, 0.8)' : 'rgba(155, 174, 172, 0.5)';
    ctx.font = '700 8px "Avenir Next", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('E X I T', x, y + 43);
  }

  function drawCage(cage) {
    const { x, y } = cage;
    const pulse = 0.5 + Math.sin(G.time * 2 + cage.phase) * 0.5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 20, 25, 8, 0, 0, TAU);
    ctx.fill();

    if (!cage.freed) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(x, y - 3, 0, x, y - 3, 48 + pulse * 18);
      glow.addColorStop(0, 'rgba(255, 127, 103, 0.16)');
      glow.addColorStop(0.55, 'rgba(255, 139, 111, 0.06)');
      glow.addColorStop(1, 'rgba(255, 139, 111, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y - 3, 48 + pulse * 18, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const bars = cage.freed ? 'rgba(149, 169, 164, 0.38)' : 'rgba(255, 207, 126, 0.78)';
    ctx.strokeStyle = bars;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(x, y + 18, 23, 7, 0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y - 19, 21, 6.5, 0, 0, TAU);
    ctx.stroke();

    const barCount = 6;
    for (let i = 0; i < barCount; i += 1) {
      const bx = x - 21 + (i / (barCount - 1)) * 42;
      const open = cage.freed && i >= barCount - 2;
      ctx.beginPath();
      ctx.moveTo(bx, y - 18);
      if (open) {
        ctx.lineTo(bx + 12, y + 9);
      } else {
        ctx.lineTo(bx, y + 18);
      }
      ctx.stroke();
    }

    if (!cage.freed) {
      const st = cage.style;
      const bob = Math.sin(G.time * 2.2 + cage.phase) * 1.2;
      ctx.save();
      ctx.translate(x, y + bob);
      ctx.fillStyle = st.dress;
      rr(ctx, -10, 2, 20, 16, 8);
      ctx.fill();
      ctx.fillStyle = st.trim;
      rr(ctx, -10, 13, 20, 4, 2);
      ctx.fill();
      ctx.fillStyle = '#f0c6a4';
      ctx.beginPath();
      ctx.arc(0, -7, 8.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = st.hair;
      ctx.beginPath();
      ctx.arc(-2, -8, 8.6, Math.PI * 0.92, Math.PI * 2.04);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-7, -2, 3.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3b2b32';
      ctx.beginPath();
      ctx.arc(-2.5, -6, 0.9, 0, TAU);
      ctx.arc(2.2, -6, 0.9, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(68, 44, 44, 0.55)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, -2.5, 2.4, 0.17 * Math.PI, 0.83 * Math.PI);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255, 210, 130, 0.32)';
      for (let i = 0; i < 3; i += 1) {
        const a = G.time * 0.8 + cage.phase + i * 2.1;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * (18 + i * 4), y - 12 + Math.sin(a) * 8, 1.2, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawBushBase(bush) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    ctx.beginPath();
    ctx.ellipse(bush.x + 3, bush.y + 10, 31, 13, 0, 0, TAU);
    ctx.fill();

    for (let i = 0; i < 6; i += 1) {
      const a = hash2(bush.c + i, bush.r, G.seed) * TAU;
      const d = 8 + hash2(bush.c, bush.r + i, G.seed) * 19;
      const rr2 = 12 + hash2(i, bush.c, G.seed) * 10;
      ctx.fillStyle = i % 2 ? '#124b37' : '#0e3c2d';
      ctx.beginPath();
      ctx.arc(bush.x + Math.cos(a) * d, bush.y + Math.sin(a) * d * 0.65, rr2, 0, TAU);
      ctx.fill();
    }
  }

  function drawBushCanopy(bush) {
    ctx.save();
    ctx.globalAlpha = 0.84;
    for (let i = 0; i < 6; i += 1) {
      const a = hash2(bush.c + i + 7, bush.r + 3, G.seed) * TAU;
      const d = 6 + hash2(bush.c + 3, bush.r + i, G.seed) * 17;
      const rr2 = 10 + hash2(i + 2, bush.c, G.seed) * 8;
      ctx.fillStyle = i % 2 ? '#1a6447' : '#17563e';
      ctx.beginPath();
      ctx.arc(bush.x + Math.cos(a) * d, bush.y + Math.sin(a) * d * 0.6 - 3, rr2, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 0.9;
    for (let i = 0; i < 8; i += 1) {
      const a = hash2(bush.c + i * 3, bush.r + 11, G.seed) * TAU;
      const d = 4 + hash2(i, bush.c + 5, G.seed) * 23;
      ctx.fillStyle = `rgba(110, 198, 138, ${0.13 + hash2(i, bush.r, G.seed) * 0.13})`;
      ctx.beginPath();
      ctx.ellipse(
        bush.x + Math.cos(a) * d,
        bush.y + Math.sin(a) * d * 0.6 - 7,
        4.2,
        1.8,
        a + G.time * 0.12,
        0,
        TAU
      );
      ctx.fill();
    }
    if (bush.seed > 0.55) {
      ctx.fillStyle = 'rgba(255, 205, 174, 0.62)';
      ctx.beginPath();
      ctx.arc(bush.x + 13, bush.y - 10, 1.5, 0, TAU);
      ctx.arc(bush.x - 9, bush.y - 2, 1.1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGuard(guard) {
    const chase = guard.state === 'chase';
    const bob = Math.sin(guard.anim * 1.8) * 1.4;
    const step = Math.sin(guard.anim * 1.8) * 3.2;
    const headX = Math.cos(guard.facing) * 2.5;
    const headY = Math.sin(guard.facing) * 1.2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(guard.x + 2, guard.y + 15, 18, 6.5, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#1b1c33';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(guard.x - 5, guard.y + 8);
    ctx.lineTo(guard.x - 6 + step, guard.y + 15);
    ctx.moveTo(guard.x + 5, guard.y + 8);
    ctx.lineTo(guard.x + 6 - step, guard.y + 15);
    ctx.stroke();

    const coat = ctx.createLinearGradient(guard.x, guard.y - 17, guard.x, guard.y + 13);
    coat.addColorStop(0, chase ? '#5c2642' : '#3a2d55');
    coat.addColorStop(1, chase ? '#2a1229' : '#1d1a35');
    ctx.fillStyle = coat;
    rr(ctx, guard.x - 13, guard.y - 12 + bob, 26, 26, 11);
    ctx.fill();

    ctx.fillStyle = chase ? '#b64b58' : '#75659a';
    ctx.fillRect(guard.x - 13, guard.y + 4 + bob, 26, 3);

    ctx.fillStyle = '#c99f83';
    ctx.beginPath();
    ctx.arc(guard.x + headX, guard.y - 19 + bob + headY, 9, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#1b1b2f';
    ctx.beginPath();
    ctx.arc(guard.x + headX, guard.y - 22 + bob + headY, 10, Math.PI, TAU);
    ctx.fill();
    ctx.fillRect(guard.x + headX - 12, guard.y - 22 + bob + headY, 24, 3);
    ctx.fillStyle = '#29284a';
    rr(ctx, guard.x + headX - 13, guard.y - 27 + bob + headY, 26, 5, 2);
    ctx.fill();

    ctx.fillStyle = chase ? '#ff6b67' : '#f0d696';
    ctx.beginPath();
    ctx.arc(guard.x + headX - 3 + Math.cos(guard.facing) * 2, guard.y - 18 + bob, 1.2, 0, TAU);
    ctx.arc(guard.x + headX + 3 + Math.cos(guard.facing) * 2, guard.y - 18 + bob, 1.2, 0, TAU);
    ctx.fill();

    const side = guard.facing + Math.PI / 2;
    const lx = guard.x + Math.cos(side) * 15;
    const ly = guard.y + Math.sin(side) * 7 - 4;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 28);
    lg.addColorStop(0, chase ? 'rgba(255, 124, 104, 0.35)' : 'rgba(255, 213, 132, 0.35)');
    lg.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(lx, ly, 28, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#5d4a3e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 4);
    ctx.lineTo(lx, ly + 10);
    ctx.stroke();
    ctx.fillStyle = chase ? '#ffd0c0' : '#ffe9aa';
    ctx.beginPath();
    ctx.arc(lx, ly, 3.2, 0, TAU);
    ctx.fill();

    if (guard.alert > 0.06) {
      ctx.strokeStyle = chase
        ? 'rgba(255, 93, 89, 0.8)'
        : `rgba(255, 198, 105, ${0.28 + guard.alert * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y + 17, 17, -Math.PI / 2, -Math.PI / 2 + TAU * guard.alert);
      ctx.stroke();
    }

    if (chase || guard.alert > 0.34) {
      const mark = chase ? '!' : '?';
      const my = guard.y - 40 + Math.sin(G.time * 7) * 2;
      ctx.fillStyle = chase ? '#ff6963' : '#ffd176';
      ctx.beginPath();
      ctx.arc(guard.x, my, 8.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#20161c';
      ctx.font = '800 12px "Arial Black", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mark, guard.x, my + 0.5);
      ctx.textBaseline = 'alphabetic';
    }
  }

  function drawPlayer() {
    const p = G.player;
    if (!p) return;
    const bob = p.moving ? Math.sin(p.anim * 2.5) * 1.7 : Math.sin(G.time * 2.1) * 0.7;
    const step = p.moving ? Math.sin(p.anim * 2.5) * 4 : 0;
    const faceX = Math.cos(p.dir) * 3.4;
    const faceY = Math.sin(p.dir) * 1.7;
    const hiddenAlpha = p.hidden ? 0.82 : 1;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(p.x, p.y - 6, 0, p.x, p.y - 6, 98);
    glow.addColorStop(0, 'rgba(255, 214, 130, 0.11)');
    glow.addColorStop(0.5, 'rgba(255, 203, 109, 0.045)');
    glow.addColorStop(1, 'rgba(255, 195, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 6, 98, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = hiddenAlpha;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(p.x + 2, p.y + 15, 17, 6.2, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#233c3a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y + 8);
    ctx.lineTo(p.x - 6 + step, p.y + 15);
    ctx.moveTo(p.x + 5, p.y + 8);
    ctx.lineTo(p.x + 6 - step, p.y + 15);
    ctx.stroke();

    const cloak = ctx.createLinearGradient(p.x, p.y - 16, p.x, p.y + 14);
    cloak.addColorStop(0, '#68e8c3');
    cloak.addColorStop(0.34, '#2eb79b');
    cloak.addColorStop(1, '#126757');
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(p.x - 12, p.y - 8 + bob);
    ctx.quadraticCurveTo(p.x - 17, p.y + 5 + bob, p.x - 10, p.y + 12 + bob);
    ctx.quadraticCurveTo(p.x, p.y + 16 + bob, p.x + 10, p.y + 12 + bob);
    ctx.quadraticCurveTo(p.x + 17, p.y + 5 + bob, p.x + 12, p.y - 8 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffd176';
    ctx.beginPath();
    ctx.moveTo(p.x - 10, p.y - 7 + bob);
    ctx.lineTo(p.x + 11, p.y - 7 + bob);
    ctx.lineTo(p.x + 7, p.y - 3 + bob);
    ctx.lineTo(p.x - 7, p.y - 3 + bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f0c5a2';
    ctx.beginPath();
    ctx.arc(p.x + faceX, p.y - 17 + bob + faceY, 8.7, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#272033';
    ctx.beginPath();
    ctx.arc(p.x + faceX - 1, p.y - 19 + bob + faceY, 9.1, Math.PI * 0.92, Math.PI * 2.05);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x + faceX - 7, p.y - 12 + bob + faceY, 3.4, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = '#153f39';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(p.x + faceX, p.y - 17 + bob + faceY, 9.6, Math.PI * 1.02, Math.PI * 1.95);
    ctx.stroke();

    ctx.fillStyle = '#2c2a34';
    ctx.beginPath();
    ctx.arc(p.x + faceX - 2.4 + Math.cos(p.dir) * 1.7, p.y - 15 + bob + faceY, 0.9, 0, TAU);
    ctx.arc(p.x + faceX + 2.4 + Math.cos(p.dir) * 1.7, p.y - 15 + bob + faceY, 0.9, 0, TAU);
    ctx.fill();

    const scarf = p.dir + Math.PI;
    ctx.strokeStyle = '#ffcf69';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(scarf) * 3, p.y - 6 + bob);
    ctx.quadraticCurveTo(
      p.x - Math.cos(scarf) * 16 + Math.sin(G.time * 4) * 2,
      p.y - 2 + Math.sin(scarf) * 7 + bob,
      p.x - Math.cos(scarf) * 24,
      p.y + 1 + Math.sin(scarf) * 10 + bob
    );
    ctx.stroke();

    const side = p.dir + Math.PI / 2;
    const lx = p.x + Math.cos(side) * 13;
    const ly = p.y + Math.sin(side) * 6 - 3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const light = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30);
    light.addColorStop(0, 'rgba(255, 220, 140, 0.34)');
    light.addColorStop(1, 'rgba(255, 205, 100, 0)');
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(lx, ly, 30, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#5a463b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 3);
    ctx.lineTo(lx, ly + 8);
    ctx.stroke();
    ctx.fillStyle = '#fff0b7';
    ctx.beginPath();
    ctx.arc(lx, ly, 2.8, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  function drawFollower(f, index) {
    const bob = f.bob;
    const faceX = Math.cos(G.time * 0.7 + index) * 1.4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    ctx.beginPath();
    ctx.ellipse(f.x + 2, f.y + 11, 11, 4, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = f.style.dress;
    rr(ctx, f.x - 8, f.y - 5 + bob, 16, 15, 7);
    ctx.fill();
    ctx.fillStyle = f.style.trim;
    rr(ctx, f.x - 8, f.y + 5 + bob, 16, 3, 1.5);
    ctx.fill();

    ctx.fillStyle = '#eec3a1';
    ctx.beginPath();
    ctx.arc(f.x + faceX, f.y - 11 + bob, 6.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = f.style.hair;
    ctx.beginPath();
    ctx.arc(f.x + faceX - 0.5, f.y - 12 + bob, 7.1, Math.PI * 0.92, Math.PI * 2.04);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(f.x + faceX - 5.5, f.y - 6 + bob, 2.5, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#3a2b33';
    ctx.beginPath();
    ctx.arc(f.x + faceX - 1.8, f.y - 10.3 + bob, 0.7, 0, TAU);
    ctx.arc(f.x + faceX + 1.8, f.y - 10.3 + bob, 0.7, 0, TAU);
    ctx.fill();
  }

  function drawParticles() {
    G.particles.forEach(p => {
      const alpha = clamp(p.life / Math.max(0.16, p.max * 0.5), 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      } else if (p.type === 'heart') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        heartPath(ctx, 0, 0, p.size * 1.2);
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawFireflies() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    G.fireflies.forEach(f => {
      const x = f.baseX + Math.sin(G.time * f.speed + f.phase) * f.amp;
      const y = f.baseY + Math.cos(G.time * f.speed * 0.72 + f.phase * 1.3) * f.amp * 0.5;
      const alpha = 0.22 + Math.sin(G.time * 1.4 + f.phase) * 0.13;
      ctx.fillStyle = `rgba(255, 232, 152, ${Math.max(0.04, alpha)})`;
      ctx.beginPath();
      ctx.arc(x, y, f.size * 1.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 249, 208, ${Math.max(0.15, alpha * 1.8)})`;
      ctx.beginPath();
      ctx.arc(x, y, f.size * 0.55, 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawWorld() {
    drawVoid();
    drawFloor();
    drawPool();

    G.lamps.forEach(drawLampGlow);
    drawVisionCones();

    drawGate();
    G.captives.forEach(drawCage);

    G.bushes.forEach(drawBushBase);
    G.lamps.forEach(drawLampPost);

    G.guards.forEach(drawGuard);
    G.followers.forEach(drawFollower);
    drawPlayer();

    G.bushes.forEach(drawBushCanopy);

    drawParticles();
    drawFireflies();
  }

  function worldToScreen(x, y) {
    return {
      x: (x - G.camera.x) * G.view.z + G.view.w / 2,
      y: (y - G.camera.y) * G.view.z + G.view.h / 2
    };
  }

  function drawDangerVignette() {
    if (G.danger < 0.02) return;
    const w = G.view.w;
    const h = G.view.h;
    const pulse = 0.78 + Math.sin(G.time * 4.6) * 0.22;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
    grad.addColorStop(0, 'rgba(176, 16, 31, 0)');
    grad.addColorStop(0.65, `rgba(176, 16, 31, ${0.045 * G.danger * pulse})`);
    grad.addColorStop(1, `rgba(136, 8, 23, ${0.26 * G.danger * pulse})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawCompass() {
    if (G.mode !== 'playing' || !G.player) return;
    const target = nearestTarget();
    if (!target) return;
    const w = G.view.w;
    const h = G.view.h;
    const p = worldToScreen(target.x, target.y);
    const dx = p.x - w / 2;
    const dy = p.y - h / 2;
    const angle = Math.atan2(dy, dx);
    const d = dist(G.player.x, G.player.y, target.x, target.y);

    const marginX = 54;
    const marginTop = 118;
    const marginBottom = 148;
    const onScreen = p.x > marginX && p.x < w - marginX && p.y > marginTop && p.y < h - marginBottom;

    if (onScreen) {
      if (d < 260) return;
      const bob = Math.sin(G.time * 3 + target.id) * 2.5;
      ctx.save();
      ctx.translate(p.x, p.y - 38 + bob);
      ctx.globalAlpha = 0.68;
      ctx.fillStyle = target.type === 'gate' ? '#65e8c2' : '#ffd176';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.font = '700 8px "Avenir Next", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(d / TILE)}m`, 0, -10);
      ctx.restore();
      return;
    }

    const x = clamp(p.x, marginX, w - marginX);
    const y = clamp(p.y, marginTop, h - marginBottom);
    const pulse = 0.82 + Math.sin(G.time * 3.2) * 0.18;
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(6, 18, 29, 0.7)';
    ctx.strokeStyle = target.type === 'gate' ? 'rgba(101, 232, 194, 0.42)' : 'rgba(255, 209, 118, 0.36)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.rotate(angle);
    ctx.fillStyle = target.type === 'gate' ? '#8ff5d7' : '#ffda8a';
    ctx.globalAlpha = 0.9 * pulse;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(3, -5.5);
    ctx.lineTo(3, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#e6eee8';
    ctx.font = '700 7px "Avenir Next", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(target.type === 'gate' ? 'GATE' : `${Math.round(d / TILE)}m`, x, y + 34);
    ctx.restore();
  }

  function drawScreenOverlay() {
    drawDangerVignette();
    drawCompass();
  }

  function render() {
    const w = G.view.w;
    const h = G.view.h;
    const shakeX = G.shake > 0.01 ? (Math.random() - 0.5) * G.shake : 0;
    const shakeY = G.shake > 0.01 ? (Math.random() - 0.5) * G.shake : 0;

    ctx.setTransform(G.view.dpr, 0, 0, G.view.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#040b13';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2 - G.camera.x * G.view.z + shakeX, h / 2 - G.camera.y * G.view.z + shakeY);
    ctx.scale(G.view.z, G.view.z);
    drawWorld();
    ctx.restore();

    drawScreenOverlay();
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    DOM.canvas.width = Math.floor(w * dpr);
    DOM.canvas.height = Math.floor(h * dpr);
    DOM.canvas.style.width = w + 'px';
    DOM.canvas.style.height = h + 'px';
    G.view.dpr = dpr;
    G.view.w = w;
    G.view.h = h;
    G.view.z = clamp(Math.max(w / WORLD_W, h / WORLD_H), 0.5, 1.55);

    if (G.mode === 'playing' && G.player) updateCamera(0, true);
    else if (G.mode === 'title') updateCamera(0, true);
  }

  function loop(now) {
    if (!G.lastFrame) G.lastFrame = now;
    const dt = clamp((now - G.lastFrame) / 1000, 0.001, 0.05);
    G.lastFrame = now;
    update(dt);
    render();
    window.requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------- boot & events */

  function bindEvents() {
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('orientationchange', () => {
      window.setTimeout(() => {
        resize();
        if (G.tilt.enabled) {
          G.tilt.calibrated = false;
          G.tilt.x = 0;
          G.tilt.y = 0;
        }
      }, 180);
    });

    DOM.canvas.addEventListener('pointerdown', beginJoystick, { passive: false });
    window.addEventListener('pointermove', moveJoystick, { passive: false });
    window.addEventListener('pointerup', endJoystick);
    window.addEventListener('pointercancel', endJoystick);
    window.addEventListener('blur', () => {
      G.keys.clear();
      endJoystick();
    });
    DOM.canvas.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });

    document.addEventListener('visibilitychange', handleVisibility);

    window.addEventListener('keydown', event => {
      const tag = event.target && event.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON';

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        if (!typing) event.preventDefault();
      }

      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        if (G.mode === 'playing') {
          pauseGame();
          event.preventDefault();
        } else if (G.mode === 'paused') {
          resumeGame();
          event.preventDefault();
        }
        return;
      }

      if (typing) return;

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'q', 'z'].includes(key)) {
        G.keys.add(key);
      }

      if (G.mode === 'intro' && (key === ' ' || key === 'Enter')) {
        skipIntro();
        event.preventDefault();
        return;
      }

      if (G.mode === 'playing' && (key === ' ' || key === 'e' || key === 'Enter')) {
        if (!event.repeat) doAction();
        event.preventDefault();
        return;
      }

      if (key === 'm') {
        setSound(!Sound.enabled);
        event.preventDefault();
      }

      if (G.mode === 'title' && key === 'Enter') {
        startRun();
        event.preventDefault();
      }
    });

    window.addEventListener('keyup', event => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      G.keys.delete(key);
    });

    DOM.playBtn.addEventListener('click', startRun);
    DOM.howBtn.addEventListener('click', () => {
      setScreen('how');
      Sound.resume();
      Sound.ui();
    });
    DOM.titleTiltBtn.addEventListener('click', toggleTilt);
    DOM.howCloseBtn.addEventListener('click', () => setScreen('title'));
    DOM.howPlayBtn.addEventListener('click', startRun);
    DOM.pauseBtn.addEventListener('click', pauseGame);
    DOM.soundBtn.addEventListener('click', () => setSound(!Sound.enabled));
    DOM.pauseSoundBtn.addEventListener('click', () => setSound(!Sound.enabled));
    DOM.pauseTiltBtn.addEventListener('click', toggleTilt);
    DOM.recenterBtn.addEventListener('click', recenterTilt);
    DOM.resumeBtn.addEventListener('click', resumeGame);
    DOM.restartBtn.addEventListener('click', restartLevel);
    DOM.quitBtn.addEventListener('click', quitToTitle);
    DOM.nextBtn.addEventListener('click', nextLevel);
    DOM.clearQuitBtn.addEventListener('click', quitToTitle);
    DOM.againBtn.addEventListener('click', startRun);
    DOM.winQuitBtn.addEventListener('click', quitToTitle);
    DOM.levelIntro.addEventListener('click', skipIntro);

    DOM.actionBtn.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      doAction();
    });
    DOM.actionBtn.addEventListener('click', event => {
      if (event.detail === 0) doAction();
    });

  }

  function exposeDebugApi() {
    window.DID2 = {
      get state() {
        return {
          mode: G.mode,
          level: G.levelIndex,
          levelName: G.level && G.level.name,
          player: G.player ? { x: G.player.x, y: G.player.y, hidden: G.player.hidden } : null,
          freed: G.captives.filter(c => c.freed).map(c => c.name),
          total: G.captives.length,
          gateReady: allFreed(),
          camera: { x: G.camera.x, y: G.camera.y },
          guards: G.guards.map(g => ({ x: g.x, y: g.y, state: g.state, alert: g.alert })),
          tilt: { enabled: G.tilt.enabled, calibrated: G.tilt.calibrated },
          view: { ...G.view }
        };
      },
      start: startRun,
      startAt(index = 0) {
        G.session = { totalTime: 0, spotted: 0, results: [] };
        setScreen(null);
        beginLevel(clamp(index, 0, LEVELS.length - 1));
      },
      skipIntro,
      pause: pauseGame,
      resume: resumeGame,
      freeAll() {
        G.captives.forEach(c => {
          if (!c.freed) {
            c.freed = true;
            G.followers.push({ name: c.name, x: c.x, y: c.y, bob: 0, style: c.style, phase: c.phase });
          }
        });
        if (G.gate) G.gate.ready = true;
        updateFriendTrack();
        updateHud(true);
        computeInteract();
      },
      finish() {
        if (G.mode === 'playing') completeLevel();
      },
      toggleTilt,
      showHow() {
        setScreen('how');
      }
    };
  }

  function init() {
    resize();
    syncSoundUI();
    syncTiltUI();
    refreshBestLine();
    buildLevel(0, true);
    setMode('title');
    setScreen('title');
    updateActionUI();
    bindEvents();
    exposeDebugApi();
    G.lastFrame = performance.now();
    window.requestAnimationFrame(loop);
  }

  init();
})();
