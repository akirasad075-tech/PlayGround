/* ============================================================
   SAPHIRA: BOUND & BLADE — game logic
   ============================================================ */
(() => {
  'use strict';

  const W = 640;
  const H = 360;
  const T = 24;
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const angleNorm = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const motionReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- DOM ---------- */
  const el = {
    hud: $('hud'), hudPortrait: $('hud-portrait'),
    hudName: $('hud-name'), hudLevel: $('hud-level'),
    hpFill: $('hp-fill'), hpText: $('hp-text'),
    mpFill: $('mp-fill'), mpText: $('mp-text'),
    staminaRow: $('stamina-row'), staminaFill: $('stamina-fill'), staminaText: $('stamina-text'),
    statusChip: $('status-chip'), agiChip: $('agi-chip'), goldText: $('gold-text'),
    objective: $('objective'), objectiveText: $('objective-text'),
    stealthMeter: $('stealth-meter'), stealthLabel: $('stealth-label'), stealthFill: $('stealth-fill'),
    soundBtn: $('btn-sound'), tiltBtn: $('btn-tilt'), helpBtn: $('btn-help'),
    mapTitle: $('map-title'), mapEyebrow: $('map-eyebrow'), mapName: $('map-name'), mapSub: $('map-sub'),
    contextHint: $('context-hint'), contextText: $('context-text'),
    controls: $('controls'), joystick: $('joystick'), stick: $('stick'),
    btnA: $('btn-a'), btnB: $('btn-b'), btnALabel: $('btn-a-label'), btnAIcon: $('btn-a-icon'),
    dialogue: $('dialogue'), dialoguePortrait: $('dialogue-portrait'),
    dialogueSpeaker: $('dialogue-speaker'), dialogueText: $('dialogue-text'), dialogueTap: $('dialogue-tap'),
    battleUI: $('battle-ui'), enemyStrip: $('enemy-strip'), battleRound: $('battle-round'), battleTurn: $('battle-turn'),
    battleLog: $('battle-log'), battleHpFill: $('battle-hp-fill'), battleHpText: $('battle-hp-text'),
    battleMpFill: $('battle-mp-fill'), battleMpText: $('battle-mp-text'), battlePotions: $('battle-potions'),
    potionBtnCount: $('potion-btn-count'), battleCommands: $('battle-commands'),
    modalLayer: $('modal-layer'), modalCard: $('modal-card'), modalEyebrow: $('modal-eyebrow'),
    modalTitle: $('modal-title'), modalBody: $('modal-body'), modalOptions: $('modal-options'), modalClose: $('modal-close'),
    titleScreen: $('title-screen'), startBtn: $('btn-start'), titleHelpBtn: $('btn-title-help'),
    endingScreen: $('ending-screen'), endingStats: $('ending-stats'), againBtn: $('btn-again'),
    bigBanner: $('big-banner'), bigBannerText: $('big-banner-text'),
    rotateHint: $('rotate-hint'), rotateContinue: $('btn-rotate-continue'),
    toast: $('toast'), fade: $('fade')
  };

  /* ---------- persistent player ---------- */
  const player = {
    x: 0, y: 0, dir: 'down', moving: false, walkPhase: 0,
    level: 1, xp: 0, xpNext: 50,
    hp: 76, maxHp: 76, mp: 18, maxMp: 18,
    atk: 13, def: 6, baseAgi: 10, agi: 10, luck: 5,
    gold: 0, potions: 2,
    stamina: 100, maxStamina: 100,
    captured: false, bound: false, hasSword: true, guard: false,
    battles: 0, escapes: 0
  };

  const state = {
    scene: 'title', time: 0, paused: true,
    modalOpen: false, dialogueActive: false, transitioning: false,
    map: null, cam: { x: 0, y: 0, shake: 0 },
    forest: null, prisonMap: null, prison: null,
    nearest: null, nearestSignature: '',
    battle: null, boss: null, bossDefeated: false,
    encounterCooldown: 0, invuln: 0,
    started: false, forcedLuck: null, targetLabel: '',
    lastFrame: 0, introDone: false
  };

  /* ---------- generic UI ---------- */
  let toastTimer = null;
  function toast(message, ms = 2400) {
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), ms);
  }

  let bannerTimer = null;
  function showBanner(text, win = false, ms = 2100) {
    el.bigBannerText.textContent = text;
    el.bigBanner.classList.toggle('win', win);
    el.bigBanner.classList.remove('hidden');
    // restart CSS animation
    el.bigBanner.style.animation = 'none';
    void el.bigBanner.offsetWidth;
    el.bigBanner.style.animation = '';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => el.bigBanner.classList.add('hidden'), ms);
  }

  function showMapTitle(eyebrow, name, sub) {
    el.mapEyebrow.textContent = eyebrow;
    el.mapName.textContent = name;
    el.mapSub.textContent = sub;
    el.mapTitle.classList.remove('hidden');
    el.mapTitle.style.animation = 'none';
    void el.mapTitle.offsetWidth;
    el.mapTitle.style.animation = '';
    setTimeout(() => {
      if (el.mapName.textContent === name) el.mapTitle.classList.add('hidden');
    }, 3800);
  }

  function setObjective(text) {
    state.targetLabel = text;
    el.objectiveText.textContent = text;
  }

  async function fadeOut(ms = 650) {
    el.fade.style.transitionDuration = ms + 'ms';
    el.fade.classList.add('show');
    await sleep(ms + 20);
  }
  async function fadeIn(ms = 650) {
    el.fade.style.transitionDuration = ms + 'ms';
    el.fade.classList.remove('show');
    await sleep(ms + 20);
  }

  function refreshHUD() {
    el.hpFill.style.width = `${clamp((player.hp / player.maxHp) * 100, 0, 100)}%`;
    el.hpText.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
    el.mpFill.style.width = `${clamp((player.mp / player.maxMp) * 100, 0, 100)}%`;
    el.mpText.textContent = `${Math.max(0, Math.floor(player.mp))} / ${player.maxMp}`;
    el.hudLevel.textContent = `Lv. ${player.level}`;
    el.goldText.textContent = player.gold;
    el.agiChip.textContent = `AGI ${player.captured ? 0 : player.baseAgi}`;
    const inPrison = state.scene === 'prison';
    el.staminaRow.classList.toggle('hidden', !inPrison);
    el.staminaFill.style.width = `${clamp((player.stamina / player.maxStamina) * 100, 0, 100)}%`;
    el.staminaText.textContent = `Stamina ${Math.round(player.stamina)}`;

    if (player.captured) {
      el.statusChip.textContent = 'Captured · AGI 0';
      el.statusChip.className = 'chip status';
      el.statusChip.classList.remove('hidden');
    } else if (inPrison && state.prison && state.prison.stealth) {
      el.statusChip.textContent = 'Sneaking';
      el.statusChip.className = 'chip status free';
      el.statusChip.classList.remove('hidden');
    } else if (inPrison) {
      el.statusChip.textContent = 'Unbound';
      el.statusChip.className = 'chip status free';
      el.statusChip.classList.remove('hidden');
    } else {
      el.statusChip.classList.add('hidden');
    }

    Art.drawPortrait(el.hudPortrait, player.captured ? 'saphira-bound' : 'saphira');
    updateStealthUI();
  }

  function updateStealthUI() {
    const p = state.prison;
    const active = state.scene === 'prison' && p && p.stealth;
    el.stealthMeter.classList.toggle('hidden', !active);
    if (!active) return;
    const d = clamp(p.detection || 0, 0, 1);
    el.stealthFill.style.width = `${d * 100}%`;
    if (d > 0.72) {
      el.stealthLabel.textContent = 'SEEN!';
      el.stealthMeter.classList.add('watched');
    } else if (d > 0.26) {
      el.stealthLabel.textContent = 'Watched';
      el.stealthMeter.classList.add('watched');
    } else {
      el.stealthLabel.textContent = 'Unseen';
      el.stealthMeter.classList.remove('watched');
    }
  }

  function setSceneUI() {
    const title = state.scene === 'title';
    const battle = state.scene === 'battle';
    const ending = state.scene === 'ending';
    document.body.classList.toggle('in-game', state.scene === 'forest' || state.scene === 'prison' || battle);
    el.hud.classList.toggle('hidden', title || battle || ending);
    el.battleUI.classList.toggle('hidden', !battle);
    el.endingScreen.classList.toggle('hidden', !ending);
    el.titleScreen.classList.toggle('gone', !title);
    syncControls();
    refreshHUD();
  }

  const ICON_SWORD = '<path d="M6.9 3.2 3.2 6.9l8.5 8.5 1.8-1.8-3.3-3.3 7.5-7.5L19 4.2 21.8 1.4l.8.8-2.8 2.8 1.4 1.4-7.5 7.5 1.8 1.8 2.5-2.5 2.1 2.1-1.4 1.4 1.4 1.4-2.5 2.5-1.4-1.4-1.4 1.4-2.5-2.5 4.2-4.2-8.5-8.5z"/>';
  const ICON_SCROLL = '<path d="M6 3h12a2 2 0 0 1 2 2v1h-2V5H6v2H4V5a2 2 0 0 1 2-2zm12 5h2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2h14V8zM6 10h10v2H6v-2zm0 4h10v2H6v-2z"/>';

  function syncControls() {
    const active = (state.scene === 'forest' || state.scene === 'prison') &&
      !state.dialogueActive && !state.modalOpen && !state.transitioning;
    el.controls.classList.toggle('hidden', !active);
    if (!active) {
      el.contextHint.classList.add('hidden');
      return;
    }
    const prison = state.scene === 'prison';
    el.btnALabel.textContent = prison ? 'Plan' : 'Blade';
    el.btnAIcon.innerHTML = prison ? ICON_SCROLL : ICON_SWORD;
    el.btnA.setAttribute('aria-label', prison ? 'Plan your escape' : 'Swing sword');
    el.btnB.disabled = !state.nearest;
    el.btnB.style.opacity = state.nearest ? '' : '0.38';
    const nearest = state.nearest;
    if (nearest) {
      el.contextHint.classList.remove('hidden');
      el.contextText.textContent = nearest.label;
    } else {
      el.contextHint.classList.add('hidden');
    }
  }

  function setModalState(open) {
    state.modalOpen = open;
    state.paused = open || state.dialogueActive || state.transitioning || state.scene === 'title' || state.scene === 'ending';
    syncControls();
  }

  /* ---------- dialogue ---------- */
  const DLG = { lines: [], i: 0, typing: false, timer: null, full: '', onDone: null };
  const SPEAKERS = {
    saphira: { name: 'Saphira', portrait: 'saphira' },
    'saphira-sad': { name: 'Saphira', portrait: 'saphira-bound' },
    narrator: { name: 'Chronicle', portrait: 'narrator' },
    bandit: { name: 'Bandit', portrait: 'bandit' },
    chief: { name: 'Chief Rusk', portrait: 'chief' },
    guard: { name: 'Watchman', portrait: 'guard' }
  };

  function say(lines, onDone) {
    if (!lines || !lines.length) { if (onDone) onDone(); return; }
    DLG.lines = lines.slice();
    DLG.i = 0;
    DLG.onDone = onDone || null;
    DLG.typing = false;
    clearInterval(DLG.timer);
    state.dialogueActive = true;
    state.paused = true;
    el.dialogue.classList.remove('hidden');
    syncControls();
    renderDialogueLine();
  }

  function renderDialogueLine() {
    const line = DLG.lines[DLG.i];
    if (!line) return finishDialogue();
    const info = SPEAKERS[line.who] || SPEAKERS.narrator;
    el.dialogueSpeaker.textContent = line.speaker || info.name;
    Art.drawPortrait(el.dialoguePortrait, line.portrait || info.portrait);
    DLG.full = line.text;
    DLG.typing = true;
    el.dialogueText.textContent = '';
    el.dialogueTap.textContent = motionReduce ? 'Tap to continue' : 'Tap to reveal';
    clearInterval(DLG.timer);
    let i = 0;
    const speed = line.slow ? 28 : 17;
    if (motionReduce) {
      el.dialogueText.textContent = DLG.full;
      DLG.typing = false;
      el.dialogueTap.textContent = 'Tap to continue';
      return;
    }
    DLG.timer = setInterval(() => {
      i++;
      el.dialogueText.textContent = DLG.full.slice(0, i);
      if (i >= DLG.full.length) {
        clearInterval(DLG.timer);
        DLG.typing = false;
        el.dialogueTap.textContent = 'Tap to continue';
      }
    }, speed);
  }

  function advanceDialogue() {
    if (!state.dialogueActive) return;
    if (DLG.typing) {
      clearInterval(DLG.timer);
      el.dialogueText.textContent = DLG.full;
      DLG.typing = false;
      el.dialogueTap.textContent = 'Tap to continue';
      return;
    }
    DLG.i++;
    if (DLG.i >= DLG.lines.length) return finishDialogue();
    renderDialogueLine();
  }

  function finishDialogue() {
    clearInterval(DLG.timer);
    DLG.typing = false;
    state.dialogueActive = false;
    el.dialogue.classList.add('hidden');
    state.paused = state.modalOpen || state.transitioning || state.scene === 'title' || state.scene === 'ending';
    syncControls();
    const cb = DLG.onDone;
    DLG.onDone = null;
    if (cb) cb();
  }

  /* ---------- modal ---------- */
  const MODAL = { allowClose: true, onClose: null, options: [] };

  function openModal(opts = {}) {
    MODAL.allowClose = opts.allowClose !== false;
    MODAL.onClose = opts.onClose || null;
    MODAL.options = opts.options || [];
    el.modalEyebrow.textContent = opts.eyebrow || 'SAPHIRA';
    el.modalTitle.textContent = opts.title || '';
    el.modalBody.innerHTML = opts.body || '';
    el.modalOptions.innerHTML = '';
    el.modalClose.classList.toggle('hidden', !MODAL.allowClose);
    el.modalClose.textContent = opts.closeLabel || 'Back';
    el.modalLayer.classList.remove('hidden');
    el.modalCard.scrollTop = 0;
    el.modalBody.scrollTop = 0;

    MODAL.options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className = 'option-btn' + (opt.className ? ' ' + opt.className : '');
      b.disabled = !!opt.disabled;
      b.innerHTML = `
        <span class="opt-num">${opt.num || i + 1}</span>
        <span class="opt-main">
          <span class="opt-title">${opt.title || ''}</span>
          ${opt.desc ? `<span class="opt-desc">${opt.desc}</span>` : ''}
        </span>
        ${opt.tag ? `<span class="opt-tag ${opt.tagLocked ? 'locked' : ''}">${opt.tag}</span>` : ''}
      `;
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (b.disabled) return;
        Sound.sfx('ui');
        if (opt.onSelect) opt.onSelect();
      });
      el.modalOptions.appendChild(b);
    });

    setModalState(true);
  }

  function closeModal(force = false) {
    if (!state.modalOpen) return;
    if (!MODAL.allowClose && !force) return;
    el.modalLayer.classList.add('hidden');
    setModalState(false);
    const cb = MODAL.onClose;
    MODAL.onClose = null;
    if (cb) cb();
  }

  /* ---------- input ---------- */
  const keys = new Set();
  const joy = { active: false, x: 0, y: 0, pointerId: null };
  const motion = {
    enabled: false, supported: typeof DeviceOrientationEvent !== 'undefined',
    baseBeta: null, baseGamma: null, x: 0, y: 0
  };

  function inputVector() {
    let x = 0, y = 0;
    if (joy.active) {
      x = joy.x; y = joy.y;
    } else {
      if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
      if (x === 0 && y === 0 && motion.enabled) {
        x = motion.x; y = motion.y;
      }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    if (len < 0.16) return { x: 0, y: 0 };
    return { x, y };
  }

  function dirFromVector(x, y) {
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left';
    return y > 0 ? 'down' : 'up';
  }

  function movePlayer(dt, speed) {
    if (state.paused || !state.map) return;
    const v = inputVector();
    if (v.x === 0 && v.y === 0) {
      player.moving = false;
      return;
    }
    player.dir = dirFromVector(v.x, v.y);
    player.moving = true;
    player.walkPhase += dt * (6 + speed * 0.055);
    const map = state.map;
    const nx = player.x + v.x * speed * dt;
    if (World.canStand(map, nx, player.y, 7)) player.x = nx;
    const ny = player.y + v.y * speed * dt;
    if (World.canStand(map, player.x, ny, 7)) player.y = ny;

    player.stepTimer = (player.stepTimer || 0) + dt;
    if (player.stepTimer > 0.34) {
      player.stepTimer = 0;
      if (state.scene === 'forest' && Math.random() < 0.7) Sound.sfx('step');
    }
  }

  function updateCamera(dt, map, snap = false) {
    if (!map) return;
    const maxX = Math.max(0, map.w * T - W);
    const maxY = Math.max(0, map.h * T - H);
    const tx = clamp(player.x - W / 2, 0, maxX);
    const ty = clamp(player.y - H / 2 - 14, 0, maxY);
    if (snap) {
      state.cam.x = tx;
      state.cam.y = ty;
    } else {
      const k = 1 - Math.exp(-dt * 7.5);
      state.cam.x = lerp(state.cam.x, tx, k);
      state.cam.y = lerp(state.cam.y, ty, k);
    }
    state.cam.shake = Math.max(0, state.cam.shake - dt * 42);
  }

  function shake(amount) {
    state.cam.shake = Math.max(state.cam.shake, amount);
  }

  /* ---------- tilt / motion ---------- */
  function readTilt(e) {
    const angle = (screen.orientation && typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle
      : (window.orientation || 0);
    let rawX = e.gamma || 0;
    let rawY = e.beta || 0;
    if (angle === 90) { rawX = e.beta || 0; rawY = -(e.gamma || 0); }
    else if (angle === 270 || angle === -90) { rawX = -(e.beta || 0); rawY = e.gamma || 0; }
    if (motion.baseBeta === null) {
      motion.baseBeta = rawY;
      motion.baseGamma = rawX;
    }
    const dx = rawX - motion.baseGamma;
    const dy = rawY - motion.baseBeta;
    let x = clamp(dx / 15, -1, 1);
    let y = clamp(dy / 15, -1, 1);
    if (Math.abs(x) < 0.18) x = 0;
    if (Math.abs(y) < 0.18) y = 0;
    motion.x = x;
    motion.y = y;
  }

  function onDeviceOrientation(e) {
    if (!motion.enabled) return;
    readTilt(e);
  }

  async function toggleTilt() {
    Sound.unlock();
    if (motion.enabled) {
      motion.enabled = false;
      motion.x = 0; motion.y = 0;
      el.tiltBtn.classList.remove('active');
      el.tiltBtn.setAttribute('aria-pressed', 'false');
      toast('Tilt controls off.');
      return;
    }
    if (!('DeviceOrientationEvent' in window)) {
      toast('This device does not provide motion sensing.');
      return;
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          toast('Motion permission was declined. The joystick still works.');
          return;
        }
      } catch (err) {
        toast('Motion permission needs a secure (https) page.');
        return;
      }
    }
    motion.enabled = true;
    motion.baseBeta = null;
    motion.baseGamma = null;
    el.tiltBtn.classList.add('active');
    el.tiltBtn.setAttribute('aria-pressed', 'true');
    toast('Tilt controls on — hold your device comfortably level.');
  }

  /* ---------- sound UI ---------- */
  function refreshSoundButton() {
    const muted = Sound.isMuted();
    el.soundBtn.classList.toggle('muted', muted);
    el.soundBtn.setAttribute('aria-label', muted ? 'Enable sound' : 'Toggle sound');
    el.soundBtn.title = muted ? 'Sound off' : 'Sound on';
  }

  function musicModeForScene() {
    if (state.scene === 'title') return 'title';
    if (state.scene === 'ending') return 'ending';
    if (state.scene === 'battle') return 'battle';
    if (state.scene === 'prison') return 'prison';
    return 'forest';
  }

  function unlockAudio() {
    Sound.unlock();
    if (state.scene === 'title') Sound.setMode('title');
  }

  /* ---------- help / pause ---------- */
  function openHelp() {
    if (state.scene === 'battle') {
      toast('Finish the duel first.');
      return;
    }
    if (state.modalOpen) return;
    openModal({
      eyebrow: 'FIELD MANUAL',
      title: 'How to Play',
      allowClose: true,
      closeLabel: 'Return',
      body: `
        <p><strong>Move</strong> with the joystick, WASD, or arrow keys. Optional tilt controls are in the top bar.</p>
        <p><strong>Blade</strong> (Space / J, or the gold Blade button) swings Saphira's sword. Strike a bandit, or walk into one, to start a turn-based duel.</p>
        <p><strong>Interact</strong> (B / E / F) examines signs, chests, tables, and anything marked with a <em>✦</em>.</p>
        <p><strong>In battle:</strong> Attack, Shield Bash (stuns), Mend, Guard, Potion, or Flee. Speed decides turn order.</p>
        <p><strong>No game over:</strong> if Saphira's HP reaches zero, she is <em>Captured</em>, not killed. She wakes in the Bandit Hideout prison cell, bound and without her sword.</p>
        <p><strong>Escape:</strong> open <strong>Plan</strong> to try the ropes (50% luck), search for a sharp object, or slip past the guards. <em>Sneak Out</em> unlocks once the ropes are gone.</p>
        <p><strong>Stealth:</strong> stay out of the amber vision cones. Crates, barrels, and walls block a guard's line of sight. If caught, you are dragged back to the cell and tied up again.</p>
        <p class="help-note">On iPhone/iPad, tilt requires motion permission; the game asks for it when you tap <em>Tilt</em>.</p>
      `
    });
  }

  /* ---------- story: beginning ---------- */
  async function beginJourney() {
    if (state.started) return;
    state.started = true;
    Sound.unlock();
    Sound.sfx('select');
    el.titleScreen.classList.add('gone');
    await sleep(320);
    await fadeOut(420);
    initForest();
    state.scene = 'forest';
    state.transitioning = false;
    setSceneUI();
    Sound.setMode('forest');
    await fadeIn(800);
    state.paused = false;
    showOpening();
  }

  function showOpening() {
    say([
      { who: 'narrator', text: 'The Dawnstone of Aldermere was stolen on the night of the red moon. The trail of the Red Fox bandits ends here, in a forest that eats its own echoes.' },
      { who: 'saphira', text: 'I am Saphira, knight of the Azure Order. I have sworn to return the stone before the thaw.' },
      { who: 'narrator', text: 'The bandits answer to a chief called Rusk. They say he keeps a fortress beneath the roots of the old camp, behind a hundred red banners.' },
      { who: 'saphira', text: 'Then I will knock on his door.' },
      { who: 'narrator', text: 'Follow the trail. Strike the Red Fox bandits with your blade to begin a duel. If your HP reaches zero you will not die — you will wake in their prison. Escape, and the forest is yours again.', slow: true }
    ], () => {
      setObjective('Follow the trail north to the Red Fox camp.');
      showMapTitle('CHAPTER I', 'Bandit Forest', 'Where the red fox banners fly');
      toast('Move with the joystick or arrow keys. Tap Blade to strike.');
      refreshHUD();
      syncControls();
    });
  }

  /* ---------- map setup ---------- */
  function initForest() {
    state.forest = World.createForest();
    state.map = state.forest;
    state.boss = {
      x: 41 * T + 12, y: 7 * T + 22,
      active: false, defeated: false, moving: false, dir: 'left', phase: 0,
      name: 'Chief Rusk', level: 3
    };
    resetForestEnemies();
    player.x = state.forest.spawn.x;
    player.y = state.forest.spawn.y;
    player.dir = 'down';
    player.moving = false;
    player.walkPhase = 0;
    state.cam.x = 0; state.cam.y = 0;
    updateCamera(0, state.forest, true);
    state.invuln = 2;
    state.encounterCooldown = 1.5;
    state.nearest = null;
    state.nearestSignature = '';
    state.scene = 'forest';
    setObjective('Follow the trail north to the Red Fox camp.');
    refreshHUD();
    syncControls();
  }

  function resetForestEnemies() {
    if (!state.forest) return;
    for (const e of state.forest.enemies) {
      e.defeated = false;
      e.x = e.homeX;
      e.y = e.homeY;
      e.alert = 0;
      e.dir = 'left';
      e.target = null;
      e.wait = 0.5;
    }
  }

  /* ---------- sound / motion bindings helper ---------- */
  function setupUtilityButtons() {
    refreshSoundButton();
    el.soundBtn.addEventListener('click', () => {
      Sound.unlock();
      Sound.toggleMute();
      refreshSoundButton();
      if (!Sound.isMuted()) Sound.setMode(musicModeForScene());
      Sound.sfx('ui');
    });
    el.tiltBtn.addEventListener('click', toggleTilt);
    el.helpBtn.addEventListener('click', openHelp);
    el.titleHelpBtn.addEventListener('click', openHelp);
    el.rotateContinue.addEventListener('click', () => {
      el.rotateHint.classList.add('dismissed');
      Sound.unlock();
      Sound.sfx('ui');
    });
    el.startBtn.addEventListener('click', beginJourney);
    el.againBtn.addEventListener('click', () => location.reload());
    window.addEventListener('deviceorientation', onDeviceOrientation);
    window.addEventListener('orientationchange', () => {
      motion.baseBeta = null;
      motion.baseGamma = null;
    });
  }

  /* ============================================================
     BANDIT FOREST — exploration
     ============================================================ */
  function updateForest(dt) {
    const map = state.forest;
    if (!map) return;
    state.invuln = Math.max(0, state.invuln - dt);
    state.encounterCooldown = Math.max(0, state.encounterCooldown - dt);
    movePlayer(dt, 82);
    updateForestEnemies(dt);
    updateForestBoss(dt);
    updateSword(dt);
    updateNearestForest();
    updateCamera(dt, map);
  }

  function updateForestEnemies(dt) {
    const map = state.forest;
    for (const e of map.enemies) {
      if (e.defeated) continue;
      e.phase += dt * 3;
      const d = dist(e.x, e.y, player.x, player.y);
      if (d < 34 && state.invuln <= 0 && state.encounterCooldown <= 0 && !state.transitioning) {
        startBattle({ enemy: e, ambush: false });
        return;
      }
      if (e.wait > 0) {
        e.wait -= dt;
        e.moving = false;
        if (d < 105) {
          e.alert = Math.min(1, e.alert + dt * 2);
          e.dir = player.x < e.x ? 'left' : 'right';
        } else {
          e.alert = Math.max(0, e.alert - dt);
        }
        continue;
      }
      e.alert = Math.max(0, e.alert - dt * 0.7);
      if (!e.target) {
        const angle = Math.random() * Math.PI * 2;
        const r = 12 + Math.random() * 34;
        const tx = e.homeX + Math.cos(angle) * r;
        const ty = e.homeY + Math.sin(angle) * r;
        if (World.canStand(map, tx, ty, 6)) e.target = { x: tx, y: ty };
        else e.wait = 0.4;
        continue;
      }
      const dx = e.target.x - e.x;
      const dy = e.target.y - e.y;
      const dd = Math.hypot(dx, dy);
      if (dd < 3) {
        e.target = null;
        e.wait = 0.8 + Math.random() * 2.4;
        e.moving = false;
      } else {
        const sp = 17;
        e.x += (dx / dd) * sp * dt;
        e.y += (dy / dd) * sp * dt;
        e.dir = dx < 0 ? 'left' : 'right';
        e.moving = true;
      }
      if (d < 54 && e.wait <= 0) {
        // a curious bandit drifts toward the knight
        e.dir = player.x < e.x ? 'left' : 'right';
      }
    }
  }

  function updateForestBoss(dt) {
    const b = state.boss;
    if (!b || !b.active || b.defeated) return;
    b.phase += dt;
    const d = dist(b.x, b.y, player.x, player.y);
    if (d < 46 && !state.bossApproach && !state.transitioning) {
      state.bossApproach = true;
      say([
        { who: 'chief', text: 'So the little knight chewed through my ropes. Did you come to beg for your sword back?' },
        { who: 'saphira', text: 'I came to return something of yours. Your axe. Point first.' },
        { who: 'narrator', text: 'Chief Rusk hefts the great axe. The campfire throws his shadow across the clearing.' }
      ], () => startBossBattle());
    }
  }

  function updateSword(dt) {
    if (!state.sword) return;
    state.sword.t -= dt;
    state.sword.cd -= dt;
    if (state.sword.t <= 0) state.sword = null;
  }

  function swingSword() {
    if (state.scene !== 'forest' || state.paused) return;
    if (state.sword && state.sword.cd > 0) return;
    Sound.sfx('swing');
    state.sword = { t: 0.27, dur: 0.27, cd: 0.44, dir: player.dir };
    const dx = player.dir === 'left' ? -1 : player.dir === 'right' ? 1 : 0;
    const dy = player.dir === 'up' ? -1 : player.dir === 'down' ? 1 : 0;
    const hx = player.x + dx * 23;
    const hy = player.y - 12 + dy * 20;
    for (const e of state.forest.enemies) {
      if (e.defeated) continue;
      if (dist(hx, hy, e.x, e.y - 12) < 35 && state.invuln <= 0) {
        startBattle({ enemy: e, ambush: true });
        return;
      }
    }
    if (state.boss && state.boss.active && !state.boss.defeated && dist(hx, hy, state.boss.x, state.boss.y - 14) < 46) {
      state.bossApproach = true;
      say([
        { who: 'chief', text: 'A blade in my own camp? Bold. Foolish, but bold.' },
        { who: 'saphira', text: 'I only need one good swing.' }
      ], () => startBossBattle(true));
    }
  }

  function forestInteractables() {
    const out = [];
    if (!state.forest) return out;
    for (const p of state.forest.props) {
      if (!p.interact) continue;
      out.push({ x: p.x, y: p.y, radius: p.type === 'campTent' ? 54 : 42, label: p.interact.label, key: p.interact.key, prop: p });
    }
    return out;
  }

  function updateNearestForest() {
    let best = null, bestD = 1e9;
    for (const it of forestInteractables()) {
      const d = dist(player.x, player.y, it.x, it.y);
      if (d < it.radius && d < bestD) { best = it; bestD = d; }
    }
    const sig = best ? best.key + ':' + best.label : '';
    if (sig !== state.nearestSignature) {
      state.nearestSignature = sig;
      state.nearest = best;
      syncControls();
    }
  }

  function interactForest() {
    if (!state.nearest || state.paused) return;
    const it = state.nearest;
    Sound.sfx('select');
    if (it.key === 'sign') {
      say([
        { who: 'narrator', text: 'A clawed sign leans over the trail: “RED FOX FOREST. Trespassers become guests. Guests become ransom.”' },
        { who: 'saphira', text: 'Charming.' }
      ]);
      return;
    }
    if (it.key === 'chest') {
      const p = it.prop;
      if (p.opened) {
        toast('The supply chest is empty.');
        return;
      }
      p.opened = true;
      player.potions += 1;
      player.gold += 12;
      Sound.sfx('pickup');
      refreshHUD();
      toast('Found a potion and 12 gold.');
      return;
    }
    if (it.key === 'camp') {
      if (state.boss && state.boss.defeated) {
        say([{ who: 'narrator', text: 'Only ash and broken banners remain. The Dawnstone is already on its way home.' }]);
      } else if (state.boss && state.boss.active) {
        say([{ who: 'saphira', text: 'Rusk is here. I can feel the weight of that axe from across the clearing.' }]);
      } else {
        say([
          { who: 'saphira', text: 'The chief’s tent is empty. He is deeper in the camp, behind a dozen blades.' },
          { who: 'narrator', text: 'The Red Foxes take prisoners. A knight who falls here would wake in their cells — still alive, still dangerous.' },
          { who: 'saphira', text: 'A prison is still a way inside. If I fall, I will make their hospitality expensive.' }
        ], () => {
          setObjective('The camp is too well guarded. Grow stronger — or let them take you alive.');
          toast('Objective updated. Defeat more bandits, or risk capture.');
        });
      }
    }
  }

  /* ---------- forest render ---------- */
  function renderForest(time) {
    const map = state.forest;
    if (!map) return;
    const sx = state.cam.shake ? (Math.random() * 2 - 1) * state.cam.shake : 0;
    const sy = state.cam.shake ? (Math.random() * 2 - 1) * state.cam.shake : 0;
    const cam = { x: Math.round(state.cam.x + sx), y: Math.round(state.cam.y + sy) };
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    World.drawGround(ctx, map, cam);
    World.drawWater(ctx, map, cam, time);

    const renderables = [];
    for (const o of World.visibleObjectTiles(map, cam)) {
      const x = o.tx * T + 12 + (Art.hash(o.tx, o.ty, 8) - 0.5) * 6;
      const y = o.ty * T + 22;
      if (o.type === 2) {
        const scale = 0.9 + Art.hash(o.tx, o.ty, 5) * 0.24;
        renderables.push({ y, draw: () => Art.drawTree(ctx, x, y, Art.hash(o.tx, o.ty, 3), time, scale) });
      } else {
        renderables.push({ y, draw: () => Art.drawRock(ctx, x, y, Art.hash(o.tx, o.ty, 4)) });
      }
    }
    for (const p of World.visibleProps(map, cam)) {
      if (p.type === 'campTent') continue;
      renderables.push({ y: p.y, draw: () => World.drawProp(ctx, p, time) });
    }
    for (const e of map.enemies) {
      if (e.defeated) continue;
      renderables.push({
        y: e.y,
        draw: () => {
          Art.drawBandit(ctx, e.x, e.y, { dir: e.dir, moving: e.moving, phase: e.phase, t: time + e.bob, scale: 1 });
          if (e.alert > 0.12) {
            const a = Math.min(1, e.alert);
            ctx.save();
            ctx.globalAlpha = a;
            ctx.fillStyle = '#0b1018';
            ctx.beginPath();
            ctx.arc(e.x, e.y - 38, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f1c777';
            ctx.font = 'bold 7px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', e.x, e.y - 35.5);
            ctx.restore();
          }
        }
      });
    }
    if (state.boss && state.boss.active && !state.boss.defeated) {
      const b = state.boss;
      renderables.push({
        y: b.y,
        draw: () => {
          Art.drawChief(ctx, b.x, b.y, { t: time, scale: 1.5, dir: 'left' });
          ctx.save();
          ctx.textAlign = 'center';
          ctx.font = '700 7px "Segoe UI", sans-serif';
          ctx.fillStyle = 'rgba(4,8,12,0.7)';
          ctx.fillRect(b.x - 27, b.y - 82, 54, 10);
          ctx.fillStyle = '#f1c777';
          ctx.fillText('CHIEF RUSK', b.x, b.y - 75);
          ctx.restore();
        }
      });
    }

    // player
    if (player.captured) {
      renderables.push({ y: player.y, draw: () => Art.drawBoundSaphira(ctx, player.x, player.y, { t: time, struggle: player.moving }) });
    } else {
      renderables.push({
        y: player.y,
        draw: () => Art.drawSaphira(ctx, player.x, player.y, {
          dir: player.dir, moving: player.moving, phase: player.walkPhase, t: time, sword: true
        })
      });
    }
    renderables.sort((a, b) => a.y - b.y);
    for (const item of renderables) item.draw();

    // sword arc
    if (state.sword) {
      const p = 1 - Math.max(0, state.sword.t) / state.sword.dur;
      const ang = state.sword.dir === 'right' ? 0 : state.sword.dir === 'left' ? Math.PI : state.sword.dir === 'down' ? Math.PI / 2 : -Math.PI / 2;
      Art.drawSlash(ctx, player.x, player.y - 14, ang, p, 'rgba(185,232,255,0.95)');
    }

    // fireflies
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of map.lights) {
      if (l.type !== 'firefly') continue;
      if (l.x < cam.x - 30 || l.x > cam.x + W + 30 || l.y < cam.y - 30 || l.y > cam.y + H + 30) continue;
      const a = 0.24 + Math.sin(time * 1.7 + l.phase) * 0.2;
      const x = l.x + Math.sin(time * 0.7 + l.phase) * 12;
      const y = l.y + Math.cos(time * 0.55 + l.phase) * 9;
      const g = ctx.createRadialGradient(x, y, 0, x, y, l.r);
      g.addColorStop(0, `rgba(255,231,155,${Math.max(0, a)})`);
      g.addColorStop(1, 'rgba(255,231,155,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
      ctx.fillStyle = `rgba(255,246,205,${Math.max(0.2, a + 0.3)})`;
      ctx.fillRect(x - 0.5, y - 0.5, 1.4, 1.4);
    }
    ctx.restore();

    // objective beacon in world
    if (state.boss && state.boss.active && !state.boss.defeated) {
      drawBeacon(ctx, state.boss.x, state.boss.y - 12, time, 'rgba(241,199,119,');
    } else {
      drawBeacon(ctx, map.camp.x, map.camp.y + 4, time, 'rgba(143,212,255,');
    }

    ctx.restore();

    // off-screen compass & on-screen marker
    if (!state.dialogueActive && !state.modalOpen) {
      const target = state.boss && state.boss.active && !state.boss.defeated
        ? { x: state.boss.x, y: state.boss.y - 20, label: 'RUSK' }
        : { x: map.camp.x, y: map.camp.y - 10, label: 'CAMP' };
      drawCompass(target, cam);
    }
  }

  function drawBeacon(ctx, x, y, time, colorPrefix) {
    const pulse = (time * 0.55) % 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = colorPrefix + (0.5 * (1 - pulse)) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 8 + pulse * 22, 4 + pulse * 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = colorPrefix + '0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // diamond
    const bob = Math.sin(time * 2.2) * 2;
    ctx.save();
    ctx.translate(x, y - 44 + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = colorPrefix + '0.9)';
    ctx.fillRect(-2.5, -2.5, 5, 5);
    ctx.restore();
  }

  function drawCompass(target, cam) {
    const sx = target.x - cam.x;
    const sy = target.y - cam.y;
    const onScreen = sx > 22 && sx < W - 22 && sy > 56 && sy < H - 32;
    if (onScreen) return;
    const cx = W / 2, cy = H / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    const margin = 32;
    const r = Math.min((W / 2 - margin) / Math.max(0.0001, Math.abs(Math.cos(a))), (H / 2 - margin) / Math.max(0.0001, Math.abs(Math.sin(a))));
    const px = clamp(cx + Math.cos(a) * r, 28, W - 28);
    const py = clamp(cy + Math.sin(a) * r, 62, H - 58);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(7,13,22,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(241,199,119,0.34)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#f1c777';
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(231,241,248,0.75)';
    ctx.font = '600 7px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(target.label, px, py + 22);
    ctx.restore();
  }

  /* ============================================================
     BANDIT HIDEOUT — prison, escape and stealth
     ============================================================ */
  function enterPrison(fresh = true) {
    if (fresh || !state.prisonMap) {
      state.prisonMap = World.createPrison();
    }
    const map = state.prisonMap;
    state.map = map;
    if (fresh || !state.prison) {
      state.prison = {
        phase: 'bound', knife: false, searching: false,
        stealth: false, detection: 0, grace: 0
      };
    }
    const table = map.props.find((p) => p.type === 'table');
    if (table) table.knife = fresh ? true : !state.prison.knife;
    if (fresh) {
      state.prison.phase = 'bound';
      state.prison.knife = false;
      state.prison.searching = false;
      state.prison.stealth = false;
      state.prison.detection = 0;
      state.prison.grace = 0;
      player.stamina = player.maxStamina;
    }
    World.resetGuards(map);
    player.x = map.spawn.x;
    player.y = map.spawn.y;
    player.dir = 'down';
    player.moving = false;
    player.walkPhase = 0;
    player.captured = true;
    player.bound = true;
    player.agi = 0;
    player.hasSword = false;
    player.guard = false;
    player.hp = Math.max(14, Math.round(player.maxHp * 0.42));
    player.mp = Math.round(player.maxMp * 0.3);
    state.scene = 'prison';
    state.nearest = null;
    state.nearestSignature = '';
    state.invuln = 0;
    state.cam.x = 0; state.cam.y = 0;
    updateCamera(0, map, true);
    setObjective('Open PLAN to escape the cell.');
    setSceneUI();
    refreshHUD();
    syncControls();
    Sound.setMode('prison');
  }

  function updatePrison(dt) {
    const map = state.prisonMap;
    const p = state.prison;
    if (!map || !p) return;

    if (p.phase === 'bound') {
      player.stamina = Math.min(player.maxStamina, player.stamina + dt * 1.35);
    }
    p.grace = Math.max(0, p.grace - dt);

    movePlayer(dt, p.phase === 'bound' ? 42 : 76);
    updatePrisonGuards(dt);
    if (state.transitioning) return;

    // picking up the knife at the guard table
    if (!p.knife) {
      const table = map.props.find((prop) => prop.type === 'table');
      if (table && dist(player.x, player.y, table.x, table.y) < 48) {
        if (p.searching || p.phase === 'bound') {
          // Auto-pickup only after choosing the search option; otherwise B searches.
          if (p.searching) pickUpKnife(table);
        }
      }
    }

    // leaving the cell while free begins the stealth phase
    if (p.phase === 'free' && !p.stealth && player.x > 10 * T + 10) {
      startStealth(true);
    }

    // reaching the stairs finishes the escape
    if (p.stealth && !state.transitioning) {
      const r = map.stairsRect;
      if (player.x > r.x && player.x < r.x + r.w && player.y > r.y - 8 && player.y < r.y + r.h + 20) {
        completeEscape();
        return;
      }
    }

    updateNearestPrison();
    updateCamera(dt, map);

    state.hudAccum = (state.hudAccum || 0) + dt;
    if (state.hudAccum > 0.22) {
      state.hudAccum = 0;
      el.staminaFill.style.width = `${clamp((player.stamina / player.maxStamina) * 100, 0, 100)}%`;
      el.staminaText.textContent = `Stamina ${Math.round(player.stamina)}`;
      updateStealthUI();
    }
  }

  function updatePrisonGuards(dt) {
    const map = state.prisonMap;
    const p = state.prison;
    if (!map || !map.guards) return;
    let maxDetect = 0;

    for (const g of map.guards) {
      if (!g.sweepBase) g.sweepBase = g.angle || 0;
      g.phase += dt * 1.4;

      if (g.pause > 0) {
        g.pause -= dt;
        g.moving = false;
        g.angle = g.sweepBase + Math.sin(state.time * 0.95 + g.phase) * 0.5;
        g.dir = Math.cos(g.angle) < 0 ? 'left' : 'right';
      } else {
        if (!g.target) {
          g.i = (g.i + 1) % g.route.length;
          g.target = g.route[g.i];
        }
        const dx = g.target.x - g.x;
        const dy = g.target.y - g.y;
        const dd = Math.hypot(dx, dy);
        if (dd < 2) {
          g.pause = g.delay + Math.random() * 0.5;
          g.sweepBase = g.angle;
          g.target = null;
          g.moving = false;
        } else {
          const sp = g.speed;
          g.x += (dx / dd) * sp * dt;
          g.y += (dy / dd) * sp * dt;
          g.angle = Math.atan2(dy, dx);
          g.dir = dx < 0 ? 'left' : 'right';
          g.moving = true;
        }
      }

      if (p.stealth && !state.transitioning && p.grace <= 0) {
        const eyeX = g.x;
        const eyeY = g.y - 13;
        const d = dist(player.x, player.y - 8, eyeX, eyeY);
        const a = Math.atan2((player.y - 8) - eyeY, player.x - eyeX);
        const diff = Math.abs(angleNorm(a - g.angle));
        const inCone = d < g.range && diff < g.fov / 2;
        const tooClose = d < 28;
        const blocked = !World.hasLineOfSight(map, eyeX, eyeY, player.x, player.y - 8);
        const seen = !blocked && (inCone || tooClose);
        if (seen) {
          g.detect = Math.min(1, g.detect + dt * (0.78 + (1 - d / g.range) * 1.05));
          g.warned = true;
        } else {
          g.detect = Math.max(0, g.detect - dt * 0.72);
          if (g.detect <= 0) g.warned = false;
        }
        maxDetect = Math.max(maxDetect, g.detect);
      } else {
        g.detect = Math.max(0, g.detect - dt * 2);
      }
    }

    p.detection = maxDetect;
    if (p.stealth && maxDetect >= 1 && !state.transitioning) {
      caughtByGuards();
    }
  }

  function prisonInteractables() {
    const out = [];
    if (!state.prisonMap) return out;
    for (const p of state.prisonMap.props) {
      if (!p.interact) continue;
      out.push({
        x: p.x, y: p.y,
        radius: p.type === 'table' ? 52 : 44,
        label: p.interact.label, key: p.interact.key, prop: p
      });
    }
    if (state.prison && state.prison.stealth) {
      const r = state.prisonMap.stairsRect;
      out.push({
        x: r.x + r.w / 2, y: r.y + r.h / 2 + 12,
        radius: 58, label: 'Climb the stairs to freedom', key: 'stairs', prop: null
      });
    }
    return out;
  }

  function updateNearestPrison() {
    let best = null, bestD = 1e9;
    for (const it of prisonInteractables()) {
      const d = dist(player.x, player.y, it.x, it.y);
      if (d < it.radius && d < bestD) { best = it; bestD = d; }
    }
    const sig = best ? best.key + ':' + best.label : '';
    if (sig !== state.nearestSignature) {
      state.nearestSignature = sig;
      state.nearest = best;
      syncControls();
    }
  }

  function pickUpKnife(table) {
    const p = state.prison;
    if (!p || p.knife) return;
    p.knife = true;
    p.searching = false;
    if (table) table.knife = false;
    Sound.sfx('pickup');
    toast('Guard’s knife acquired. Open PLAN to cut the ropes.');
    setObjective('Open PLAN and cut the ropes with the knife.');
    refreshHUD();
    state.nearestSignature = '';
  }

  function interactPrison() {
    if (!state.nearest || state.paused) return;
    const it = state.nearest;
    Sound.sfx('select');
    if (it.key === 'stairs') {
      if (state.prison.stealth) completeEscape();
      else toast('You need to begin your escape first.');
      return;
    }
    if (it.key === 'table') {
      if (!state.prison.knife) {
        const table = state.prisonMap.props.find((p) => p.type === 'table');
        pickUpKnife(table);
      } else {
        toast('The table holds only maps and a cold candle now.');
      }
      return;
    }
    if (it.key === 'bed') {
      player.stamina = Math.min(player.maxStamina, player.stamina + 24);
      refreshHUD();
      toast('You catch your breath on the straw. Stamina +24.');
      return;
    }
    if (it.key === 'rack') {
      say([
        { who: 'narrator', text: 'The weapon rack is empty. A fresh scrape in the dust leads toward the gate.' },
        { who: 'saphira-sad', text: 'They have my sword. I will take it back with interest.' }
      ]);
      return;
    }
  }

  /* ---------- escape plan menu ---------- */
  function openEscapeMenu(result = '', resultClass = '') {
    const p = state.prison;
    if (!p) return;
    const free = p.phase === 'free';
    const stamina = Math.round(player.stamina);
    const body = `
      <p>The ropes bite into your wrists. Somewhere above, boots pace the stone.</p>
      <div class="stat-line"><span>Bonds</span><span>${free ? 'Cut — hands free' : 'Tight rope'}</span></div>
      <div class="stat-line"><span>Agility</span><span>${free ? player.baseAgi : 0}</span></div>
      <div class="stat-line"><span>Knife</span><span>${p.knife ? 'Guard’s knife' : 'None'}</span></div>
      <div class="stamina-wrap">
        <div class="stamina-label"><span>Stamina</span><span>${stamina} / ${player.maxStamina}</span></div>
        <div class="bar"><div style="width:${clamp((player.stamina / player.maxStamina) * 100, 0, 100)}%"></div></div>
      </div>
      ${result ? `<div class="result ${resultClass}">${result}</div>` : ''}
    `;

    const options = [];
    options.push({
      title: free ? 'Bonds Already Loosened' : 'Attempt to Loosen Bonds',
      desc: free ? 'Your wrists are free. Keep them that way.' : 'A 50% luck check. Failure costs 18 stamina.',
      tag: free ? 'DONE' : '50%',
      disabled: free,
      onSelect: () => attemptLoosen()
    });

    if (p.knife) {
      options.push({
        title: free ? 'Knife in Hand' : 'Cut the Ropes with the Guard’s Knife',
        desc: free ? 'The blade is tucked into your belt.' : 'The small knife will part the rope cleanly.',
        tag: free ? 'DONE' : 'CERTAIN',
        disabled: free,
        onSelect: () => cutRopes()
      });
    } else {
      options.push({
        title: 'Search for a Sharp Object',
        desc: free ? 'You already searched the guard’s table.' : 'Shuffle slowly to the guard’s table and steal the small knife.',
        tag: free ? '—' : 'SLOW',
        disabled: free,
        onSelect: () => beginSearchForKnife()
      });
    }

    if (p.stealth) {
      options.push({
        title: 'Escape in Progress',
        desc: 'Reach the stairs at the end of the guard hall. Stay out of the vision cones.',
        tag: 'ACTIVE',
        onSelect: () => closeModal(true)
      });
    } else {
      options.push({
        title: 'Sneak Out',
        desc: free ? 'Begin the escape. Avoid the patrolling guards’ line of sight.' : 'Locked until your bonds are removed.',
        tag: free ? 'READY' : 'LOCKED',
        disabled: !free,
        tagLocked: !free,
        onSelect: () => {
          closeModal(true);
          startStealth();
        }
      });
    }

    openModal({
      eyebrow: 'PLAN YOUR ESCAPE',
      title: free ? 'The cell is quiet' : 'Bound and watched',
      body,
      options,
      allowClose: true,
      closeLabel: 'Back to the cell'
    });
  }

  function attemptLoosen() {
    const roll = randInt(1, 100);
    let success = roll <= 50;
    if (state.forcedLuck === true) success = true;
    if (state.forcedLuck === false) success = false;
    if (success) {
      removeBonds('luck');
      Sound.sfx('success');
      openEscapeMenu(`The knot slips free. Luck roll: <b>${roll}</b> / 100 — success.`, 'good');
    } else {
      player.stamina = Math.max(0, player.stamina - 18);
      Sound.sfx('fail');
      refreshHUD();
      openEscapeMenu(`The knot holds fast. Luck roll: <b>${roll}</b> / 100 — failure. Stamina −18.`, 'bad');
    }
  }

  function beginSearchForKnife() {
    closeModal(true);
    state.prison.searching = true;
    setObjective('Shuffle slowly to the guard’s table and search for a knife.');
    toast('The ropes slow every step. Reach the guard’s table.');
    syncControls();
  }

  function cutRopes() {
    if (!state.prison.knife) return;
    removeBonds('knife');
    Sound.sfx('success');
    openEscapeMenu('The knife saws through the ropes in three quick strokes. Your hands are free.', 'good');
  }

  function removeBonds(source) {
    const p = state.prison;
    if (!p || p.phase === 'free') return;
    p.phase = 'free';
    p.searching = false;
    player.captured = false;
    player.bound = false;
    player.agi = player.baseAgi;
    setObjective('Sneak out. Reach the stairs at the far end of the guard hall.');
    refreshHUD();
    state.nearestSignature = '';
    if (player.x > 10 * T + 10 && !p.stealth) startStealth(true);
  }

  function startStealth(quiet = false) {
    const p = state.prison;
    if (!p || p.phase !== 'free' || p.stealth || state.transitioning) return;
    p.stealth = true;
    p.detection = 0;
    p.grace = 1.25;
    for (const g of state.prisonMap.guards) g.detect = 0;
    Sound.setMode('prison');
    Sound.sfx('alert');
    setObjective('Stay out of the guards’ sight. Reach the stairs.');
    refreshHUD();
    if (!quiet) {
      toast('The watch is alert. Keep to the shadows — crates and walls break their line of sight.', 3600);
    }
  }

  async function caughtByGuards() {
    if (state.transitioning) return;
    state.transitioning = true;
    state.paused = true;
    state.prison.stealth = false;
    state.prison.searching = false;
    syncControls();
    Sound.sfx('alert');
    showBanner('CAUGHT');
    shake(6);
    await sleep(900);
    await fadeOut(550);

    const map = state.prisonMap;
    player.x = map.spawn.x;
    player.y = map.spawn.y;
    player.dir = 'down';
    player.captured = true;
    player.bound = true;
    player.agi = 0;
    player.hasSword = false;
    player.stamina = Math.max(0, player.stamina - 15);
    player.hp = Math.max(14, Math.round(player.maxHp * 0.42));
    state.prison.phase = 'bound';
    state.prison.detection = 0;
    state.prison.grace = 0;
    state.transitioning = false;
    state.paused = false;
    World.resetGuards(map);
    updateCamera(0, map, true);
    refreshHUD();
    setObjective(state.prison.knife ? 'Cut the ropes with the knife. Then try the hall again.' : 'Loosen or cut the ropes again.');
    syncControls();
    await fadeIn(650);
    await sleep(250);
    say([
      { who: 'guard', text: 'Going somewhere, little knight? The chief wants you breathing. He said nothing about comfortable.' },
      { who: 'narrator', text: 'Rough hands drag you back through the door. The knots are tighter this time.' },
      { who: 'saphira-sad', text: 'I will need a sharper plan.' }
    ], () => {
      openEscapeMenu('You are back in the cell. The guards have returned to their patrol.', 'bad');
    });
  }

  async function completeEscape() {
    if (state.transitioning) return;
    state.transitioning = true;
    state.paused = true;
    state.prison.stealth = false;
    syncControls();
    Sound.sfx('success');
    showBanner('ESCAPED', true);
    player.escapes += 1;
    await sleep(1000);
    await fadeOut(750);

    state.scene = 'forest';
    state.map = state.forest;
    state.prison.stealth = false;
    player.captured = false;
    player.bound = false;
    player.agi = player.baseAgi;
    player.hasSword = true;
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.stamina = player.maxStamina;
    player.x = state.forest.spawn.x;
    player.y = state.forest.spawn.y;
    player.dir = 'down';
    player.moving = false;
    state.boss.active = true;
    state.boss.defeated = false;
    state.bossApproach = false;
    resetForestEnemies();
    state.invuln = 3;
    state.encounterCooldown = 2;
    state.nearest = null;
    state.nearestSignature = '';
    state.cam.x = 0; state.cam.y = 0;
    updateCamera(0, state.forest, true);
    setSceneUI();
    Sound.setMode('forest');
    setObjective('Return to the Red Fox camp. Defeat Chief Rusk.');
    await fadeIn(800);
    state.transitioning = false;
    state.paused = false;
    showMapTitle('CHAPTER II', 'Bandit Forest', 'No ropes. No mercy.');
    say([
      { who: 'narrator', text: 'You reclaim your sword from the guard post and climb into the night. Behind you, the hideout wakes too late.' },
      { who: 'saphira', text: 'They wanted a captive. They got a reckoning.' },
      { who: 'narrator', text: 'The Red Fox camp glows through the trees. Chief Rusk is waiting — and so is the Dawnstone.' }
    ], () => {
      setObjective('Defeat Chief Rusk at the Red Fox camp.');
      toast('Red Fox bandits have returned to the forest. Rusk waits at the camp.');
      refreshHUD();
      syncControls();
    });
  }

  /* ---------- prison render ---------- */
  function renderPrison(time) {
    const map = state.prisonMap;
    const p = state.prison;
    if (!map) return;
    const sx = state.cam.shake ? (Math.random() * 2 - 1) * state.cam.shake : 0;
    const sy = state.cam.shake ? (Math.random() * 2 - 1) * state.cam.shake : 0;
    const cam = { x: Math.round(state.cam.x + sx), y: Math.round(state.cam.y + sy) };

    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    World.drawGround(ctx, map, cam);

    // vision cones behind the figures
    if (p.stealth) {
      for (const g of map.guards) {
        const pts = World.visionPolygon(map, g);
        Art.drawVisionCone(ctx, g, pts, g.detect);
      }
    }

    const renderables = [];
    for (const prop of World.visibleProps(map, cam)) {
      if (prop.type === 'campTent') continue;
      renderables.push({ y: prop.y, draw: () => World.drawProp(ctx, prop, time) });
    }
    if (p.stealth) {
      for (const g of map.guards) {
        renderables.push({
          y: g.y,
          draw: () => {
            Art.drawGuard(ctx, g.x, g.y, { dir: g.dir, moving: g.moving, phase: g.phase, t: time, scale: 1.04 });
            if (g.detect > 0.03) {
              const w = 18;
              ctx.save();
              ctx.fillStyle = 'rgba(4,8,14,0.82)';
              ctx.fillRect(g.x - w / 2, g.y - 44, w, 4);
              ctx.fillStyle = g.detect > 0.6 ? '#e76f6a' : '#f1c777';
              ctx.fillRect(g.x - w / 2 + 1, g.y - 43, (w - 2) * g.detect, 2);
              ctx.fillStyle = g.detect > 0.6 ? '#ff998f' : '#f1c777';
              ctx.font = 'bold 8px "Segoe UI", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(g.detect > 0.6 ? '!' : '?', g.x, g.y - 48);
              ctx.restore();
            }
          }
        });
      }
    }

    if (player.bound || player.captured) {
      renderables.push({
        y: player.y,
        draw: () => Art.drawBoundSaphira(ctx, player.x, player.y, { t: time, struggle: player.moving })
      });
    } else {
      renderables.push({
        y: player.y,
        draw: () => Art.drawSaphira(ctx, player.x, player.y, {
          dir: player.dir, moving: player.moving, phase: player.walkPhase, t: time, sword: false
        })
      });
    }
    renderables.sort((a, b) => a.y - b.y);
    for (const item of renderables) item.draw();

    // draw bars in front when the player is inside the cell
    if (player.x < 10 * T + 12) {
      const x0 = Math.max(0, Math.floor((cam.x - 24) / T));
      const x1 = Math.min(map.w - 1, Math.ceil((cam.x + W + 24) / T));
      const y0 = Math.max(0, Math.floor((cam.y - 24) / T));
      const y1 = Math.min(map.h - 1, Math.ceil((cam.y + H + 24) / T));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (map.tiles[y][x] === World.BARS) Art.drawBars(ctx, x * T, y * T);
        }
      }
    }

    // dust motes
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const x = (Art.hash(i, 4, 3) * (map.w * T) + Math.sin(time * 0.3 + i) * 18) % (map.w * T);
      const y = (Art.hash(i, 7, 2) * (map.h * T) + Math.cos(time * 0.22 + i) * 12) % (map.h * T);
      if (x < cam.x || x > cam.x + W || y < cam.y || y > cam.y + H) continue;
      ctx.fillStyle = `rgba(180,198,210,${0.08 + 0.05 * Math.sin(time + i)})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();

    // objective beacon
    if (p.searching && !p.knife) {
      const table = map.props.find((prop) => prop.type === 'table');
      if (table) drawBeacon(ctx, table.x, table.y - 4, time, 'rgba(241,199,119,');
    } else if (p.phase === 'free') {
      const r = map.stairsRect;
      drawBeacon(ctx, r.x + r.w / 2, r.y + r.h - 12, time, 'rgba(143,212,255,');
    }
    ctx.restore();

    // darkness and torch light
    drawPrisonLighting(cam, time);

    // danger vignette
    if (p.stealth && p.detection > 0.02) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.82);
      g.addColorStop(0, 'rgba(120,20,14,0)');
      g.addColorStop(1, `rgba(150,25,18,${0.38 * p.detection})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    if (!state.dialogueActive && !state.modalOpen) {
      if (p.searching && !p.knife) {
        const table = map.props.find((prop) => prop.type === 'table');
        if (table) drawCompass({ x: table.x, y: table.y - 20, label: 'TABLE' }, cam);
      } else if (p.phase === 'free') {
        const r = map.stairsRect;
        drawCompass({ x: r.x + r.w / 2, y: r.y + 8, label: 'STAIRS' }, cam);
      }
    }
  }

  function drawPrisonLighting(cam, time) {
    if (!state.lightCanvas) {
      state.lightCanvas = document.createElement('canvas');
      state.lightCanvas.width = W;
      state.lightCanvas.height = H;
    }
    const lc = state.lightCanvas.getContext('2d');
    lc.clearRect(0, 0, W, H);
    lc.globalCompositeOperation = 'source-over';
    lc.fillStyle = 'rgba(3,6,13,0.73)';
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';

    for (const l of state.prisonMap.lights) {
      const x = l.x - cam.x;
      const y = l.y - cam.y;
      if (x < -l.r || x > W + l.r || y < -l.r || y > H + l.r) continue;
      const flicker = l.type === 'torch' ? Math.sin(time * 9 + l.phase) * 4 : 0;
      const r = l.r + flicker;
      const g = lc.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,0.96)');
      g.addColorStop(0.46, 'rgba(0,0,0,0.68)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const px = player.x - cam.x;
    const py = player.y - 16 - cam.y;
    const pg = lc.createRadialGradient(px, py, 2, px, py, 74);
    pg.addColorStop(0, 'rgba(0,0,0,0.95)');
    pg.addColorStop(0.55, 'rgba(0,0,0,0.6)');
    pg.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = pg;
    lc.fillRect(px - 80, py - 80, 160, 160);
    lc.globalCompositeOperation = 'source-over';

    ctx.drawImage(state.lightCanvas, 0, 0);

    // warm torch bloom above the darkness
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of state.prisonMap.lights) {
      if (l.type !== 'torch') continue;
      const x = l.x - cam.x;
      const y = l.y - cam.y;
      if (x < -90 || x > W + 90 || y < -90 || y > H + 90) continue;
      const flicker = 0.86 + Math.sin(time * 8 + l.phase) * 0.14;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 92 * flicker);
      g.addColorStop(0, 'rgba(255,166,77,0.16)');
      g.addColorStop(0.45, 'rgba(255,130,48,0.05)');
      g.addColorStop(1, 'rgba(255,130,48,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 100, y - 100, 200, 200);
    }
    ctx.restore();
  }

  /* ============================================================
     TURN-BASED BATTLE
     ============================================================ */
  function makeMinion(level = 1) {
    const lv = Math.max(1, level);
    return {
      id: 'm' + Math.random().toString(36).slice(2, 7),
      name: 'Bandit Minion', level: lv, boss: false,
      maxHp: 28 + lv * 6, hp: 28 + lv * 6,
      atk: 9 + Math.round(lv * 1.2), def: 3 + lv,
      agi: 6.5 + lv * 0.45, gold: 10 + lv * 4, xp: 16 + lv * 4,
      stunned: 0, dead: false, deadAt: 0, hitFlash: 0, mapRef: null
    };
  }

  function makeBoss(level = 3) {
    const lv = Math.max(3, level);
    return {
      id: 'boss' + Math.random().toString(36).slice(2, 7),
      name: 'Chief Rusk', level: lv, boss: true,
      maxHp: 112 + lv * 12, hp: 112 + lv * 12,
      atk: 17 + Math.round(lv * 1.1), def: 8 + Math.floor(lv * 0.6),
      agi: 9 + lv * 0.3, gold: 120, xp: 100,
      stunned: 0, dead: false, deadAt: 0, hitFlash: 0, mapRef: null
    };
  }

  async function startBattle({ enemy = null, ambush = false } = {}) {
    if (state.scene === 'battle' || state.transitioning) return;
    state.transitioning = true;
    state.paused = true;
    syncControls();
    Sound.unlock();
    Sound.sfx('battleStart');
    Sound.setMode('battle');

    const source = enemy;
    const level = enemy ? Math.max(1, enemy.level || 1) : Math.max(1, player.level);
    const foe = makeMinion(level);
    foe.mapRef = source;

    const b = {
      enemies: [foe], boss: false, ambush,
      round: 0, phase: 'intro', order: [], oidx: 0,
      target: 0, log: [], fx: [], lunge: null, shake: 0,
      enemyFlash: {}, playerFlash: 0,
      returnX: player.x, returnY: player.y,
      sourceEnemy: source, startedAt: state.time, busy: false
    };
    state.battle = b;
    player.battles += 1;
    player.guard = false;

    await fadeOut(220);
    state.scene = 'battle';
    setSceneUI();
    el.controls.classList.add('hidden');
    el.contextHint.classList.add('hidden');
    refreshBattleUI();
    addBattleLog(ambush ? 'Ambush! You strike before the bandit can draw.' : 'A Bandit Minion blocks the trail!');
    if (ambush) foe.stunned = 1;
    updateBattleUI();
    await fadeIn(280);
    state.transitioning = false;
    state.paused = false;
    if (ambush) toast('Ambush! The bandit loses their first turn.');
    setTimeout(beginBattleRound, 620);
  }

  async function startBossBattle(ambushed = false) {
    if (state.scene === 'battle' || state.transitioning) return;
    state.transitioning = true;
    state.paused = true;
    syncControls();
    Sound.unlock();
    Sound.sfx('battleStart');
    Sound.setMode('battle');
    const foe = makeBoss(player.level);
    foe.mapRef = null;
    const b = {
      enemies: [foe], boss: true, ambush: ambushed,
      round: 0, phase: 'intro', order: [], oidx: 0,
      target: 0, log: [], fx: [], lunge: null, shake: 0,
      enemyFlash: {}, playerFlash: 0,
      returnX: player.x, returnY: player.y,
      sourceEnemy: null, startedAt: state.time, busy: false
    };
    state.battle = b;
    player.battles += 1;
    player.guard = false;
    await fadeOut(260);
    state.scene = 'battle';
    setSceneUI();
    el.controls.classList.add('hidden');
    el.contextHint.classList.add('hidden');
    refreshBattleUI();
    addBattleLog('Chief Rusk hefts his axe. The campfire gutters.');
    updateBattleUI();
    await fadeIn(300);
    state.transitioning = false;
    state.paused = false;
    setTimeout(beginBattleRound, 650);
  }

  function addBattleLog(text) {
    const b = state.battle;
    if (!b) return;
    b.log.push(text);
    if (b.log.length > 4) b.log.shift();
    updateBattleLog();
  }

  function addFx(fx) {
    if (!state.battle) return;
    state.battle.fx.push(fx);
  }

  function damageNumber(x, y, text, color = '#ffe6b0') {
    addFx({ type: 'text', x, y, text, color, life: 1, maxLife: 1, vy: -34 });
  }

  function spawnSlash(x, y, angle, color) {
    addFx({ type: 'slash', x, y, angle, color, life: 0.34, maxLife: 0.34 });
  }

  function battleEnemyPos(i, count) {
    if (state.battle && state.battle.boss) return { x: 452, y: 252 };
    if (count <= 1) return { x: 452, y: 252 };
    if (count === 2) return i === 0 ? { x: 414, y: 246 } : { x: 500, y: 258 };
    return { x: 390 + i * 62, y: 246 + (i % 2) * 10 };
  }

  function playerBattlePos() {
    return { x: 170, y: 252 };
  }

  function beginBattleRound() {
    const b = state.battle;
    if (!b || b.phase === 'won' || b.phase === 'lost') return;
    if (b.enemies.every((e) => e.dead)) { winBattle(); return; }
    b.round += 1;
    b.phase = 'round';
    b.oidx = 0;
    const order = [{
      type: 'player', spd: player.baseAgi + Math.random() * 2, ref: null
    }];
    for (const e of b.enemies) {
      if (!e.dead) order.push({ type: 'enemy', spd: e.agi + Math.random() * 2, ref: e });
    }
    order.sort((a, c) => c.spd - a.spd);
    b.order = order;
    updateBattleUI();
    setTimeout(nextBattleTurn, 420);
  }

  function nextBattleTurn() {
    const b = state.battle;
    if (!b || b.phase === 'won' || b.phase === 'lost' || state.scene !== 'battle') return;
    if (b.enemies.every((e) => e.dead)) { winBattle(); return; }
    if (player.hp <= 0) { loseBattle(); return; }
    if (b.oidx >= b.order.length) {
      b.phase = 'roundEnd';
      updateBattleUI();
      setTimeout(beginBattleRound, 440);
      return;
    }
    const turn = b.order[b.oidx++];
    if (turn.type === 'enemy' && turn.ref.dead) { setTimeout(nextBattleTurn, 60); return; }
    if (turn.type === 'player') {
      player.guard = false;
      b.phase = 'player';
      updateBattleUI();
      return;
    }
    const e = turn.ref;
    b.phase = 'enemy';
    updateBattleUI();
    if (e.stunned > 0) {
      e.stunned = 0;
      addBattleLog(`${e.name} is stunned and loses the turn.`);
      updateBattleUI();
      setTimeout(nextBattleTurn, 520);
      return;
    }
    setTimeout(() => enemyTurn(e), 480);
  }

  function battleTarget() {
    const b = state.battle;
    if (!b) return null;
    let t = b.enemies[b.target];
    if (!t || t.dead) {
      t = b.enemies.find((e) => !e.dead) || null;
      if (t) b.target = b.enemies.indexOf(t);
    }
    return t;
  }

  function rollDamage(atk, def, critChance) {
    let base = atk + (Math.random() * 5 - 2);
    base = Math.max(1, base * (1 - def / (def + 30)));
    const crit = Math.random() < critChance;
    if (crit) base *= 1.6;
    return { dmg: Math.max(1, Math.round(base)), crit };
  }

  async function battleCommand(act) {
    const b = state.battle;
    if (!b || b.phase !== 'player' || state.scene !== 'battle') return;
    const target = battleTarget();
    if (!target) return;
    b.phase = 'resolving';
    b.busy = true;
    updateBattleUI();
    Sound.sfx('ui');
    const pp = playerBattlePos();
    const count = b.enemies.filter((e) => !e.dead).length;
    const ep = battleEnemyPos(b.enemies.indexOf(target), count);

    if (act === 'attack') {
      Sound.sfx('swing');
      b.lunge = { who: 'player', t: 0, dur: 0.3 };
      await sleep(150);
      spawnSlash(ep.x - 26, ep.y - 52, -0.35, 'rgba(185,232,255,0.95)');
      if (Math.random() < 0.06) {
        addBattleLog('The bandit ducks under your blade.');
        damageNumber(ep.x, ep.y - 60, 'MISS', '#b9c9d6');
        Sound.sfx('miss');
      } else {
        const { dmg, crit } = rollDamage(player.atk, target.def, 0.08 + player.luck * 0.012);
        target.hp = Math.max(0, target.hp - dmg);
        target.hitFlash = 0.28;
        b.shake = crit ? 5.5 : 3;
        damageNumber(ep.x, ep.y - 60, String(dmg), crit ? '#ffd36a' : '#fff0c8');
        addBattleLog(crit ? `Critical strike! ${dmg} damage.` : `Saphira strikes for ${dmg} damage.`);
        Sound.sfx(crit ? 'crit' : 'hit');
        if (target.hp <= 0) {
          target.dead = true;
          target.deadAt = state.time;
          addBattleLog(`${target.name} collapses.`);
        }
      }
      updateBattleUI();
      await sleep(520);
    } else if (act === 'bash') {
      if (player.mp < 5) { b.phase = 'player'; updateBattleUI(); return; }
      player.mp -= 5;
      Sound.sfx('swing');
      b.lunge = { who: 'player', t: 0, dur: 0.28 };
      await sleep(130);
      const { dmg, crit } = rollDamage(player.atk * 1.3, target.def, 0.05);
      target.hp = Math.max(0, target.hp - dmg);
      target.hitFlash = 0.32;
      target.stunned = 1;
      b.shake = 4;
      spawnSlash(ep.x - 20, ep.y - 50, 0.15, 'rgba(255,215,120,0.95)');
      damageNumber(ep.x, ep.y - 60, String(dmg), '#ffd36a');
      addBattleLog(`Shield Bash! ${dmg} damage and ${target.name} is stunned.`);
      Sound.sfx('crit');
      if (target.hp <= 0) {
        target.dead = true;
        target.deadAt = state.time;
        addBattleLog(`${target.name} collapses.`);
      }
      updateBattleUI();
      await sleep(540);
    } else if (act === 'heal') {
      if (player.mp < 7 || player.hp >= player.maxHp) { b.phase = 'player'; updateBattleUI(); return; }
      player.mp -= 7;
      const amount = Math.min(player.maxHp - player.hp, 26 + player.level * 3);
      player.hp += amount;
      Sound.sfx('heal');
      addFx({ type: 'ring', x: pp.x, y: pp.y - 30, color: 'rgba(127,211,155,', life: 0.8, maxLife: 0.8 });
      damageNumber(pp.x, pp.y - 72, `+${amount}`, '#9df0b5');
      addBattleLog(`Mend restores ${amount} HP.`);
      updateBattleUI();
      await sleep(560);
    } else if (act === 'guard') {
      player.guard = true;
      player.mp = Math.min(player.maxMp, player.mp + 4);
      Sound.sfx('guard');
      addFx({ type: 'ring', x: pp.x, y: pp.y - 26, color: 'rgba(143,212,255,', life: 0.7, maxLife: 0.7 });
      addBattleLog('Saphira raises her guard. Incoming damage reduced; +4 MP.');
      updateBattleUI();
      await sleep(420);
    } else if (act === 'potion') {
      if (player.potions <= 0 || player.hp >= player.maxHp) { b.phase = 'player'; updateBattleUI(); return; }
      player.potions -= 1;
      const amount = Math.min(player.maxHp - player.hp, 36);
      player.hp += amount;
      Sound.sfx('potion');
      addFx({ type: 'ring', x: pp.x, y: pp.y - 30, color: 'rgba(241,199,119,', life: 0.8, maxLife: 0.8 });
      damageNumber(pp.x, pp.y - 72, `+${amount}`, '#ffe39f');
      addBattleLog(`You drink a potion. ${amount} HP restored.`);
      updateBattleUI();
      await sleep(520);
    } else if (act === 'flee') {
      if (b.boss) {
        addBattleLog('There is no fleeing Chief Rusk.');
        b.phase = 'player';
        updateBattleUI();
        return;
      }
      if (Math.random() < 0.7) {
        addBattleLog('Saphira breaks away and escapes into the trees.');
        updateBattleUI();
        await sleep(500);
        fleeBattle();
        return;
      }
      addBattleLog('The bandit cuts off your escape!');
      Sound.sfx('fail');
      updateBattleUI();
      await sleep(480);
    }

    b.busy = false;
    if (!checkBattleEnd()) {
      await sleep(180);
      nextBattleTurn();
    }
  }

  async function enemyTurn(e) {
    const b = state.battle;
    if (!b || b.phase !== 'enemy' || e.dead) { nextBattleTurn(); return; }
    const count = b.enemies.filter((x) => !x.dead).length;
    const ep = battleEnemyPos(b.enemies.indexOf(e), count);
    const pp = playerBattlePos();
    b.lunge = { who: 'enemy', id: e.id, t: 0, dur: 0.32 };
    updateBattleUI();
    await sleep(160);

    const heavy = b.boss && b.round % 3 === 0;
    const trick = !b.boss && Math.random() < 0.16;
    if (heavy) {
      addBattleLog('Rusk sweeps the great axe in a wide arc!');
      b.shake = 7;
    } else if (trick) {
      addBattleLog('The bandit throws a fistful of grit!');
    }

    await sleep(120);
    let raw = e.atk * (heavy ? 1.55 : trick ? 0.6 : 1) + (Math.random() * 4 - 1);
    raw = Math.max(1, raw * (1 - player.def / (player.def + 34)));
    if (player.guard) raw *= 0.34;
    let dmg = Math.max(1, Math.round(raw));
    player.hp = Math.max(0, player.hp - dmg);
    b.playerFlash = 0.35;
    b.shake = Math.max(b.shake, heavy ? 7 : 3.2);
    damageNumber(pp.x, pp.y - 72, String(dmg), player.guard ? '#a9d9f5' : '#ff9b8d');
    if (player.guard) addBattleLog(`Saphira blocks most of it. ${dmg} damage.`);
    else if (heavy) addBattleLog(`The axe bites deep. ${dmg} damage.`);
    else if (trick) addBattleLog(`Grit stings your eyes. ${dmg} damage. ${Math.random() < 0.5 ? 'A few coins vanish.' : 'Your focus wavers.'}`);
    else addBattleLog(`${e.name} hits for ${dmg} damage.`);

    if (trick && player.gold > 0 && Math.random() < 0.5) {
      const stolen = Math.min(player.gold, randInt(2, 5));
      player.gold -= stolen;
    }
    Sound.sfx('hit');
    updateBattleUI();
    await sleep(600);
    if (player.hp <= 0) { loseBattle(); return; }
    nextBattleTurn();
  }

  function checkBattleEnd() {
    const b = state.battle;
    if (!b) return true;
    if (player.hp <= 0) { loseBattle(); return true; }
    if (b.enemies.every((e) => e.dead)) { winBattle(); return true; }
    return false;
  }

  async function winBattle() {
    const b = state.battle;
    if (!b || b.phase === 'won' || b.phase === 'lost') return;
    b.phase = 'won';
    state.transitioning = true;
    updateBattleUI();
    Sound.sfx('victory');
    Sound.setMode('forest');
    showBanner('VICTORY', true);
    let gold = 0, xp = 0;
    for (const e of b.enemies) { gold += e.gold; xp += e.xp; }
    player.gold += gold;
    const leveled = gainXP(xp);
    if (b.boss) {
      state.boss.defeated = true;
      state.boss.active = false;
      state.bossApproach = false;
    } else if (b.sourceEnemy) {
      b.sourceEnemy.defeated = true;
    }
    refreshHUD();
    addBattleLog(`Victory! +${gold} gold, +${xp} XP.`);
    if (leveled) addBattleLog(`Level up! Saphira is now level ${player.level}.`);
    await sleep(1650);
    await fadeOut(500);
    state.battle = null;
    el.battleUI.classList.add('hidden');
    if (b.boss) {
      showEnding();
      await fadeIn(800);
      return;
    }
    state.scene = 'forest';
    state.map = state.forest;
    player.x = b.returnX;
    player.y = b.returnY;
    player.dir = 'down';
    player.moving = false;
    state.invuln = 2.5;
    state.encounterCooldown = 2.5;
    state.transitioning = false;
    state.paused = false;
    state.nearest = null;
    state.nearestSignature = '';
    updateCamera(0, state.forest, true);
    setSceneUI();
    Sound.setMode('forest');
    await fadeIn(520);
    toast(`Victory — ${gold} gold earned${leveled ? ' · Level up!' : ''}.`);
    refreshHUD();
  }

  async function loseBattle() {
    const b = state.battle;
    if (!b || b.phase === 'lost' || b.phase === 'won') return;
    b.phase = 'lost';
    state.transitioning = true;
    Sound.sfx('capture');
    Sound.setMode('none');
    showBanner('CAPTURED', false, 2500);
    addBattleLog('Saphira falls. The bandits take her alive.');
    updateBattleUI();
    await sleep(1500);
    await fadeOut(900);

    const lostGold = Math.floor(player.gold * 0.3);
    player.gold -= lostGold;
    player.hp = 0;
    player.hasSword = false;
    player.captured = true;
    player.bound = true;
    player.agi = 0;
    player.stamina = player.maxStamina;
    state.battle = null;
    el.battleUI.classList.add('hidden');
    state.bossApproach = false;
    enterPrison(true);
    state.transitioning = false;
    state.paused = false;
    setSceneUI();
    showMapTitle('INTERLUDE', 'Bandit Hideout', 'Prison Cell');
    Sound.setMode('prison');
    await fadeIn(900);
    toast(`They took ${lostGold} gold and your sword.`, 3200);
    say([
      { who: 'narrator', text: 'The world tilts. Rough hands, rough rope. The forest shrinks to a point of light — then nothing.' },
      { who: 'narrator', text: 'You wake on cold stone. Your sword is gone. Your wrists are bound.' },
      { who: 'saphira-sad', text: 'They took my blade. They did not take my nerve.' },
      { who: 'narrator', text: 'Open PLAN to try the ropes, search for something sharp, or wait for a chance to slip past the guards. Saphira cannot attack while bound.', slow: true }
    ], () => {
      refreshHUD();
      openEscapeMenu();
    });
  }

  async function fleeBattle() {
    const b = state.battle;
    if (!b) return;
    state.transitioning = true;
    state.paused = true;
    Sound.setMode('forest');
    await fadeOut(380);
    state.battle = null;
    el.battleUI.classList.add('hidden');
    state.scene = 'forest';
    state.map = state.forest;
    player.x = b.returnX;
    player.y = b.returnY;
    state.invuln = 3.5;
    state.encounterCooldown = 3.5;
    updateCamera(0, state.forest, true);
    setSceneUI();
    state.transitioning = false;
    state.paused = false;
    await fadeIn(420);
    toast('You escaped the duel — but the bandit is still out there.');
  }

  function gainXP(amount) {
    player.xp += amount;
    let leveled = false;
    while (player.xp >= player.xpNext) {
      player.xp -= player.xpNext;
      player.level += 1;
      player.xpNext = Math.round(player.xpNext * 1.35);
      player.maxHp += 12;
      player.maxMp += 4;
      player.atk += 2;
      player.def += 1;
      player.baseAgi += 1;
      player.luck += 1;
      player.hp = player.maxHp;
      player.mp = player.maxMp;
      if (!player.captured) player.agi = player.baseAgi;
      leveled = true;
    }
    if (leveled) {
      Sound.sfx('levelup');
      refreshHUD();
    }
    return leveled;
  }

  /* ---------- battle UI ---------- */
  function updateBattleLog() {
    const b = state.battle;
    if (!b) return;
    el.battleLog.innerHTML = '';
    const lines = b.log.slice(-3);
    for (const line of lines) {
      const d = document.createElement('div');
      d.className = 'log-line';
      d.textContent = line;
      el.battleLog.appendChild(d);
    }
  }

  function renderEnemyCards() {
    const b = state.battle;
    if (!b) return;
    el.enemyStrip.innerHTML = '';
    b.enemies.forEach((e, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'enemy-card' + (i === b.target && !e.dead ? ' targeted' : '') + (e.dead ? ' dead' : '');
      btn.dataset.index = i;
      btn.disabled = e.dead;
      const pct = clamp((e.hp / e.maxHp) * 100, 0, 100);
      btn.innerHTML = `
        <div class="ec-top">
          <span class="ec-name">${e.name}</span>
          <span class="ec-level">LV ${e.level}${e.boss ? ' · CHIEF' : ''}</span>
        </div>
        <div class="bar"><div style="width:${pct}%"></div></div>
        <div class="ec-hp">${Math.max(0, e.hp)} / ${e.maxHp} HP</div>
        ${e.stunned > 0 && !e.dead ? '<div class="ec-status">Stunned</div>' : ''}
      `;
      btn.addEventListener('click', () => {
        if (!state.battle || state.battle.phase !== 'player' || e.dead) return;
        state.battle.target = i;
        Sound.sfx('ui');
        updateBattleUI();
      });
      el.enemyStrip.appendChild(btn);
    });
  }

  function updateBattleButtons() {
    const b = state.battle;
    if (!b) return;
    const yourTurn = b.phase === 'player';
    el.battleCommands.querySelectorAll('[data-act]').forEach((btn) => {
      const act = btn.dataset.act;
      let disabled = !yourTurn;
      if (yourTurn) {
        if (act === 'bash' && player.mp < 5) disabled = true;
        if (act === 'heal' && (player.mp < 7 || player.hp >= player.maxHp)) disabled = true;
        if (act === 'potion' && (player.potions <= 0 || player.hp >= player.maxHp)) disabled = true;
        if (act === 'flee' && b.boss) disabled = true;
      }
      btn.disabled = disabled;
      btn.classList.toggle('disabled-by-cost', disabled && yourTurn);
    });
  }

  function updateBattleUI() {
    const b = state.battle;
    if (!b) return;
    el.battleRound.textContent = b.round > 0 ? `ROUND ${b.round}` : 'STEEL DRAWN';
    const labels = {
      intro: 'Steel drawn', round: 'Turn order…', player: 'Your move',
      resolving: 'Resolving…', enemy: 'Enemy turn', roundEnd: 'Round end',
      won: 'Victory', lost: 'Captured'
    };
    el.battleTurn.textContent = labels[b.phase] || 'Battle';
    el.battleHpFill.style.width = `${clamp((player.hp / player.maxHp) * 100, 0, 100)}%`;
    el.battleHpText.textContent = `${Math.max(0, Math.ceil(player.hp))} / ${player.maxHp}`;
    el.battleMpFill.style.width = `${clamp((player.mp / player.maxMp) * 100, 0, 100)}%`;
    el.battleMpText.textContent = `${Math.max(0, Math.floor(player.mp))} MP`;
    el.battlePotions.textContent = player.potions;
    el.potionBtnCount.textContent = player.potions;
    renderEnemyCards();
    updateBattleButtons();
    updateBattleLog();
  }

  function refreshBattleUI() {
    updateBattleUI();
  }

  function updateBattle(dt) {
    const b = state.battle;
    if (!b) return;
    b.shake = Math.max(0, b.shake - dt * 34);
    b.playerFlash = Math.max(0, b.playerFlash - dt);
    if (b.lunge) {
      b.lunge.t += dt;
      if (b.lunge.t >= b.lunge.dur) b.lunge = null;
    }
    for (const e of b.enemies) {
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.dead && !e.deadAt) e.deadAt = state.time;
    }
    for (const fx of b.fx) {
      fx.life -= dt;
      if (fx.vy) fx.y += fx.vy * dt;
    }
    b.fx = b.fx.filter((fx) => fx.life > 0);
  }

  function lungeOffset(which, id) {
    const b = state.battle;
    if (!b || !b.lunge) return 0;
    if (b.lunge.who !== which) return 0;
    if (which === 'enemy' && b.lunge.id !== id) return 0;
    const p = clamp(b.lunge.t / b.lunge.dur, 0, 1);
    const amount = Math.sin(p * Math.PI) * (b.lunge.who === 'player' ? 48 : 44);
    return b.lunge.who === 'player' ? amount : -amount;
  }

  function renderBattle(time) {
    const b = state.battle;
    if (!b) return;
    const sx = b.shake ? (Math.random() * 2 - 1) * b.shake : 0;
    const sy = b.shake ? (Math.random() * 2 - 1) * b.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);
    Art.drawBattleBackground(ctx, W, H, time, b.boss);

    const pp = playerBattlePos();
    const count = b.enemies.filter((e) => !e.dead).length;
    const alive = b.enemies.filter((e) => !e.dead);
    const target = battleTarget();

    // enemies
    b.enemies.forEach((e, i) => {
      const pos = battleEnemyPos(i, Math.max(1, alive.length));
      const alpha = e.dead ? Math.max(0, 1 - (time - e.deadAt) / 0.72) : 1;
      if (alpha <= 0) return;
      const lx = lungeOffset('enemy', e.id);
      const bob = Math.sin(time * 2 + i * 2.4) * 0.7;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (e.hitFlash > 0) ctx.filter = 'brightness(1.9) saturate(0.55)';
      if (e.boss) {
        Art.drawChief(ctx, pos.x + lx, pos.y + bob, { t: time, scale: 2.75, dir: 'left' });
      } else {
        Art.drawBandit(ctx, pos.x + lx, pos.y + bob, { dir: 'left', moving: false, t: time + i, scale: 2.25 });
      }
      ctx.restore();

      if (!e.dead) {
        const bw = e.boss ? 76 : 58;
        const bx = pos.x - bw / 2;
        const by = pos.y - (e.boss ? 88 : 74);
        ctx.fillStyle = 'rgba(4,8,13,0.7)';
        ctx.fillRect(bx - 2, by - 2, bw + 4, 8);
        ctx.fillStyle = e.hp / e.maxHp > 0.35 ? '#c94b45' : '#e87861';
        ctx.fillRect(bx, by, bw * clamp(e.hp / e.maxHp, 0, 1), 4);
        if (target === e && b.phase === 'player') {
          const bob2 = Math.sin(time * 4) * 2;
          ctx.save();
          ctx.translate(pos.x, by - 13 + bob2);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = 'rgba(241,199,119,0.95)';
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
        }
        if (e.stunned > 0) {
          ctx.save();
          ctx.fillStyle = '#f1c777';
          ctx.font = '700 8px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('✦ stunned', pos.x, by - 11);
          ctx.restore();
        }
      }
    });

    // player
    const lx = lungeOffset('player');
    const pBob = Math.sin(time * 2.2) * 0.8;
    ctx.save();
    if (b.playerFlash > 0) ctx.filter = 'brightness(1.6) saturate(0.7)';
    Art.drawSaphira(ctx, pp.x + lx, pp.y + pBob, {
      dir: 'right', moving: false, t: time, scale: 2.4, sword: true
    });
    ctx.restore();
    if (player.guard) {
      ctx.save();
      ctx.strokeStyle = 'rgba(143,212,255,0.46)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(pp.x, pp.y - 34, 38 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(143,212,255,0.12)';
      ctx.beginPath();
      ctx.arc(pp.x, pp.y - 34, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // fx
    for (const fx of b.fx) {
      const p = 1 - fx.life / fx.maxLife;
      if (fx.type === 'slash') {
        Art.drawSlash(ctx, fx.x, fx.y, fx.angle, p, fx.color);
      } else if (fx.type === 'text') {
        const a = clamp(fx.life / fx.maxLife * 1.5, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = '700 15px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(5,8,12,0.8)';
        ctx.fillText(fx.text, fx.x + 1, fx.y + 2);
        ctx.fillStyle = fx.color;
        ctx.fillText(fx.text, fx.x, fx.y);
        ctx.restore();
      } else if (fx.type === 'ring') {
        const a = clamp(fx.life / fx.maxLife, 0, 1);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = fx.color + (a * 0.55) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(fx.x, fx.y, 12 + p * 34, 6 + p * 14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // red edge on player hit
    if (b.playerFlash > 0) {
      const a = (b.playerFlash / 0.35) * 0.3;
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.24, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, 'rgba(150,20,12,0)');
      g.addColorStop(1, `rgba(150,20,12,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  /* ============================================================
     ENDING
     ============================================================ */
  function showEnding() {
    state.scene = 'ending';
    state.paused = true;
    state.transitioning = false;
    state.battle = null;
    state.nearest = null;
    clearInterval(DLG.timer);
    DLG.onDone = null;
    state.dialogueActive = false;
    state.modalOpen = false;
    el.dialogue.classList.add('hidden');
    el.modalLayer.classList.add('hidden');
    el.battleUI.classList.add('hidden');
    el.controls.classList.add('hidden');
    el.contextHint.classList.add('hidden');
    el.mapTitle.classList.add('hidden');
    setSceneUI();
    el.endingStats.innerHTML = [
      `<span>Level <b>${player.level}</b></span>`,
      `<span>Battles <b>${player.battles}</b></span>`,
      `<span>Escapes <b>${player.escapes}</b></span>`,
      `<span>Gold <b>${player.gold}</b></span>`
    ].join('');
    Sound.setMode('ending');
    Sound.sfx('victory');
    refreshHUD();
  }

  /* ============================================================
     MAIN LOOP
     ============================================================ */
  function updateScene(dt) {
    if (state.scene === 'forest' && !state.paused) {
      updateForest(dt);
    } else if (state.scene === 'prison' && !state.paused) {
      updatePrison(dt);
    }
    if (state.scene === 'battle') updateBattle(dt);
  }

  function renderScene() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.clearRect(0, 0, W, H);

    if (state.scene === 'forest') {
      renderForest(state.time);
    } else if (state.scene === 'prison') {
      renderPrison(state.time);
    } else if (state.scene === 'battle') {
      renderBattle(state.time);
    } else {
      Art.drawTitleBackground(ctx, W, H, state.time);
      if (state.scene === 'ending') {
        ctx.save();
        ctx.fillStyle = 'rgba(4, 10, 16, 0.32)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }
  }

  function tick(ts) {
    requestAnimationFrame(tick);
    const prev = state.lastFrame || ts;
    const dt = Math.min(0.05, Math.max(0, (ts - prev) / 1000));
    state.lastFrame = ts;
    state.time += dt;
    updateScene(dt);
    renderScene();
  }

  /* ============================================================
     INPUT BINDINGS
     ============================================================ */
  const MOVE_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'KeyA', 'KeyD', 'KeyW', 'KeyS'
  ]);

  function primaryAction() {
    if (state.paused || state.transitioning) return;
    if (state.scene === 'forest') {
      swingSword();
    } else if (state.scene === 'prison') {
      Sound.sfx('ui');
      openEscapeMenu();
    }
  }

  function secondaryAction() {
    if (state.paused || state.transitioning) return;
    if (state.scene === 'forest') interactForest();
    else if (state.scene === 'prison') interactPrison();
  }

  function onKeyDown(e) {
    const code = e.code;
    if (MOVE_KEYS.has(code) || code === 'Space' || code === 'Enter') {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      e.preventDefault();
    }
    Sound.unlock();

    if (code === 'Escape') {
      if (state.modalOpen) { closeModal(); return; }
      if (state.scene === 'prison' && !state.paused && !state.transitioning) {
        openEscapeMenu();
      }
      return;
    }

    if (state.dialogueActive) {
      if (code === 'Space' || code === 'Enter' || code === 'KeyJ' || code === 'KeyE' || code === 'KeyF') {
        if (!e.repeat) advanceDialogue();
      }
      return;
    }

    if (state.modalOpen) return;

    if (state.scene === 'title') {
      if (!e.repeat && (code === 'Space' || code === 'Enter')) beginJourney();
      return;
    }
    if (state.scene === 'ending') return;

    if (state.scene === 'battle') {
      const b = state.battle;
      if (!b || b.phase !== 'player' || e.repeat) return;
      const acts = {
        Digit1: 'attack', Digit2: 'bash', Digit3: 'heal',
        Digit4: 'guard', Digit5: 'potion', Digit6: 'flee',
        Numpad1: 'attack', Numpad2: 'bash', Numpad3: 'heal',
        Numpad4: 'guard', Numpad5: 'potion', Numpad6: 'flee'
      };
      if (acts[code]) battleCommand(acts[code]);
      return;
    }

    if (state.scene === 'forest' || state.scene === 'prison') {
      if (MOVE_KEYS.has(code)) {
        keys.add(code);
        return;
      }
      if (e.repeat) return;
      if (code === 'Space' || code === 'KeyJ') {
        primaryAction();
        return;
      }
      if (code === 'KeyE' || code === 'KeyF' || code === 'KeyB') {
        secondaryAction();
        return;
      }
      if (code === 'KeyP' && state.scene === 'prison') {
        if (!state.paused) openEscapeMenu();
        return;
      }
      if (code === 'KeyH') openHelp();
    }
  }

  function onKeyUp(e) {
    keys.delete(e.code);
  }

  function clearInput() {
    keys.clear();
    resetJoystick();
  }

  function resetJoystick() {
    joy.active = false;
    joy.x = 0;
    joy.y = 0;
    joy.pointerId = null;
    el.joystick.classList.remove('active');
    el.stick.style.transform = '';
  }

  function moveStick(e) {
    const rect = el.joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let x = (e.clientX - cx) / (rect.width * 0.34);
    let y = (e.clientY - cy) / (rect.height * 0.34);
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    joy.x = x;
    joy.y = y;
    const reach = rect.width * 0.28;
    el.stick.style.transform = `translate(${x * reach}px, ${y * reach}px)`;
  }

  function bindInput() {
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInput();
    });

    el.joystick.addEventListener('pointerdown', (e) => {
      if (!(state.scene === 'forest' || state.scene === 'prison')) return;
      if (state.paused || state.transitioning || state.dialogueActive || state.modalOpen) return;
      e.preventDefault();
      joy.active = true;
      joy.pointerId = e.pointerId;
      el.joystick.classList.add('active');
      try { el.joystick.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      moveStick(e);
      Sound.unlock();
    });
    el.joystick.addEventListener('pointermove', (e) => {
      if (!joy.active || e.pointerId !== joy.pointerId) return;
      e.preventDefault();
      moveStick(e);
    });
    const release = (e) => {
      if (e && e.pointerId !== undefined && e.pointerId !== joy.pointerId) return;
      resetJoystick();
    };
    el.joystick.addEventListener('pointerup', release);
    el.joystick.addEventListener('pointercancel', release);
    el.joystick.addEventListener('lostpointercapture', release);

    el.btnA.addEventListener('click', () => {
      Sound.unlock();
      if (state.dialogueActive) { advanceDialogue(); return; }
      if (state.modalOpen) return;
      primaryAction();
    });
    el.btnB.addEventListener('click', () => {
      Sound.unlock();
      if (state.dialogueActive) { advanceDialogue(); return; }
      if (state.modalOpen) return;
      secondaryAction();
    });

    el.dialogue.addEventListener('pointerdown', (e) => {
      if (!state.dialogueActive) return;
      e.preventDefault();
      Sound.unlock();
      advanceDialogue();
    });
    el.dialogue.addEventListener('click', (e) => e.stopPropagation());

    el.modalClose.addEventListener('click', () => closeModal());
    el.modalLayer.addEventListener('click', (e) => {
      if (e.target === el.modalLayer) closeModal();
    });

    el.battleCommands.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      battleCommand(btn.dataset.act);
    });

    canvas.addEventListener('pointerdown', unlockAudio);
    document.body.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
    window.addEventListener('resize', () => {
      if (joy.active) resetJoystick();
    });
  }

  /* ============================================================
     DEBUG API
     ============================================================ */
  function exposeDebug() {
    const debug = {
      state, player, World, Art,
      inputs: { keys, joy, motion },
      stopInput() { clearInput(); },
      setLuck(value) { state.forcedLuck = value === null ? null : !!value; },
      teleport(x, y) {
        player.x = x;
        player.y = y;
        if (state.map) updateCamera(0, state.map, true);
      },
      setHP(value) {
        player.hp = clamp(value, 0, player.maxHp);
        refreshHUD();
      },
      hurt(amount) {
        player.hp = clamp(player.hp - amount, 0, player.maxHp);
        refreshHUD();
      },
      heal() {
        player.hp = player.maxHp;
        player.mp = player.maxMp;
        player.stamina = player.maxStamina;
        refreshHUD();
      },
      gotoForest() {
        state.started = true;
        el.titleScreen.classList.add('gone');
        state.transitioning = false;
        state.paused = false;
        initForest();
        setSceneUI();
        Sound.setMode('forest');
      },
      gotoPrison(fresh = true) {
        state.started = true;
        el.titleScreen.classList.add('gone');
        if (!state.forest) initForest();
        state.transitioning = false;
        state.paused = false;
        enterPrison(fresh);
        state.transitioning = false;
        state.paused = false;
        syncControls();
      },
      startBattle() {
        if (!state.forest) debug.gotoForest();
        return startBattle({ enemy: null });
      },
      startBossBattle() {
        if (!state.forest) debug.gotoForest();
        state.boss.active = true;
        return startBossBattle(true);
      },
      giveKnife() {
        if (!state.prison) return;
        state.prison.knife = true;
        refreshHUD();
      },
      freeBonds() {
        if (!state.prison) return;
        removeBonds('debug');
        syncControls();
      },
      openEscapeMenu(result = '', resultClass = '') {
        openEscapeMenu(result, resultClass);
      },
      ending() { showEnding(); },
      winBattle() { return winBattle(); },
      loseBattle() { return loseBattle(); }
    };
    window.__saphira = debug;
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function init() {
    Art.drawPortrait(el.hudPortrait, 'saphira');
    Art.drawPortrait(el.dialoguePortrait, 'saphira');
    setupUtilityButtons();
    bindInput();
    setSceneUI();
    refreshHUD();
    syncControls();
    exposeDebug();
    state.lastFrame = 0;
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
