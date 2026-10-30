import { AudioEngine } from './audio.js';
import { InputManager } from './input.js';
import { Renderer } from './renderer.js';
import {
  WORLD, SOLIDS, LEDGES, LADDERS, ANCHORS, CHECKPOINTS, PRINCESSES, GUARDS,
  floorIndexForY, FLOOR_NAMES,
} from './level.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const approach = (v, target, delta) => {
  if (v < target) return Math.min(target, v + delta);
  if (v > target) return Math.max(target, v - delta);
  return target;
};
const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const FIXED = 1 / 120;
const GRAVITY = 1980;
const MOVE_SPEED = 262;
const CLIMB_SPEED = 178;

class Guard {
  constructor(data, index) {
    this.x1 = data.x1;
    this.x2 = data.x2;
    this.x = (data.x1 + data.x2) / 2;
    this.y = data.y;
    this.floor = data.floor;
    this.speed = data.speed;
    this.dir = data.facing || 1;
    this.state = 'patrol';
    this.awareness = 0;
    this.alertTimer = 0;
    this.dazedTimer = 0;
    this.pauseTimer = Math.random() * 0.8;
    this.attackTimer = 0;
    this.anim = Math.random() * 10;
    this.hitFlash = 0;
    this.seen = false;
    this.index = index;
    this.investigateX = null;
    this.investigateTimer = 0;
    this.alertCooldown = 0;
  }

  reset() {
    this.x = (this.x1 + this.x2) / 2;
    this.state = 'patrol';
    this.awareness = 0;
    this.alertTimer = 0;
    this.dazedTimer = 0;
    this.attackTimer = 0;
    this.investigateX = null;
    this.investigateTimer = 0;
    this.seen = false;
  }

  investigate(x, seconds = 2.6) {
    if (this.state === 'dazed' || this.state === 'alert') return;
    this.investigateX = clamp(x, this.x1, this.x2);
    this.investigateTimer = seconds;
    this.awareness = Math.max(this.awareness, 0.35);
  }
}

class Princess {
  constructor(data, index) {
    this.data = data;
    this.name = data.name;
    this.title = data.title;
    this.x = data.x;
    this.y = data.y;
    this.home = data.home;
    this.dir = index % 2 ? 1 : -1;
    this.state = 'free';
    this.panic = 0;
    this.anim = Math.random() * 8;
    this.capturedAt = 0;
    this.orbX = data.x;
    this.orbY = data.y - 40;
    this.index = index;
    this.floatT = Math.random() * 6;
    this.color = data.color;
    this.accent = data.accent;
  }

  reset() {
    this.x = this.data.x;
    this.y = this.data.y;
    this.state = 'free';
    this.panic = 0;
    this.orbX = this.x;
    this.orbY = this.y - 40;
  }
}

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);
    this.audio = new AudioEngine();
    this.input = new InputManager();
    this.input.attach();
    this.input.onPauseKey = () => this.togglePause();
    this.input.onMuteKey = () => this.toggleMute();

    this.state = 'menu';
    this.menuTime = 0;
    this.elapsed = 0;
    this.hearts = 3;
    this.maxHearts = 3;
    this.captures = 0;
    this.crownsShown = 0;
    this.heartsShown = 3;
    this.checkpointIndex = 0;
    this.respawn = { x: WORLD.start.x, y: WORLD.start.y };
    this.overPending = 0;
    this.shake = 0;
    this.hurtFlash = 0;
    this.captureFlash = 0;
    this.flashColor = '#ffd479';
    this.particles = [];
    this.ropeFx = [];
    this.accumulator = 0;
    this.alertToastAt = -99;
    this.gateToastAt = -99;
    this.sensorToastAt = -99;
    this.lastFrame = performance.now() / 1000;
    this.floorShown = -1;
    this.portalOpen = false;
    this.frameDt = 0;
    this.clock = 0;
    this.hintShown = false;
    this.settings = { tiltSensitivity: this.input.tilt.sensitivity };

    this.player = this.createPlayer();
    this.guards = [];
    this.princesses = [];
    this.checkpoints = [];

    this.ui = {};
    this.cacheUi();
    this.bindUi();
    this.resetRun(true);
    this.updateSoundUi();
    this.updateTiltUi();
    this.updateTouchUi();
    this.refreshHud(true);

    this.renderer.resize();
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.updateTouchUi();
    });
    window.addEventListener('orientationchange', () => {
      this.renderer.resize();
      this.updateTouchUi();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.togglePause(true);
    });
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('#app')) e.preventDefault();
    });

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.exposeDebug();
  }

  createPlayer() {
    return {
      x: WORLD.start.x,
      y: WORLD.start.y,
      w: 32,
      h: 60,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: true,
      coyote: 0.1,
      jumpBuffer: 0,
      airJumps: 1,
      climbing: null,
      grapple: null,
      invuln: 0,
      hurt: 0,
      anim: 0,
      stepTimer: 0,
      ropeT: 0,
      ropeTo: null,
      lastGrounded: true,
      drawTrail: 0,
      dead: false,
    };
  }

  cacheUi() {
    const $ = (id) => document.getElementById(id);
    this.ui = {
      menu: $('menu'),
      worldHud: $('worldHud'),
      touch: $('touchControls'),
      prompt: $('prompt'),
      promptKey: $('promptKey'),
      promptText: $('promptText'),
      toasts: $('toasts'),
      hearts: [...document.querySelectorAll('.heart')],
      crowns: [...document.querySelectorAll('.crown')],
      objectiveText: $('objectiveText'),
      objective: $('objective'),
      timer: $('timer'),
      floorText: $('floorText'),
      floorTag: $('floorTag'),
      alertBanner: $('alertBanner'),
      tiltBadge: $('tiltBadge'),
      tiltValue: $('tiltValue'),
      startBtn: $('startBtn'),
      helpBtn: $('helpBtn'),
      helpPanel: $('helpPanel'),
      tiltToggle: $('tiltToggle'),
      tiltState: $('tiltState'),
      menuMute: $('menuMute'),
      soundState: $('soundState'),
      muteBtn: $('muteBtn'),
      pauseBtn: $('pauseBtn'),
      pauseScreen: $('pauseScreen'),
      pauseCrowns: $('pauseCrowns'),
      pauseTime: $('pauseTime'),
      pauseFloor: $('pauseFloor'),
      pauseTiltToggle: $('pauseTiltToggle'),
      tiltSensitivity: $('tiltSensitivity'),
      pauseMute: $('pauseMute'),
      resumeBtn: $('resumeBtn'),
      restartBtn: $('restartBtn'),
      quitBtn: $('quitBtn'),
      gameOverScreen: $('gameOverScreen'),
      retryBtn: $('retryBtn'),
      overQuitBtn: $('overQuitBtn'),
      victoryScreen: $('victoryScreen'),
      resultTime: $('resultTime'),
      resultCrowns: $('resultCrowns'),
      resultRank: $('resultRank'),
      againBtn: $('againBtn'),
      victoryQuitBtn: $('victoryQuitBtn'),
      rotateHint: $('rotateHint'),
    };
  }

  bindUi() {
    const click = (el, fn) => {
      el?.addEventListener('click', (event) => {
        event.preventDefault();
        this.audio.unlock();
        this.audio.play('ui');
        fn(event);
      });
    };

    click(this.ui.startBtn, () => this.startGame());
    click(this.ui.helpBtn, () => {
      const hidden = this.ui.helpPanel.classList.toggle('hidden');
      this.ui.helpBtn.setAttribute('aria-expanded', String(!hidden));
    });
    click(this.ui.tiltToggle, () => this.toggleTilt());
    click(this.ui.menuMute, () => this.toggleMute());
    click(this.ui.muteBtn, () => this.toggleMute());
    click(this.ui.pauseBtn, () => this.togglePause());
    click(this.ui.pauseTiltToggle, () => this.toggleTilt());
    click(this.ui.pauseMute, () => this.toggleMute());
    click(this.ui.resumeBtn, () => this.resumeGame());
    click(this.ui.restartBtn, () => this.restartRun());
    click(this.ui.quitBtn, () => this.quitToMenu());
    click(this.ui.retryBtn, () => this.retryFromCheckpoint());
    click(this.ui.overQuitBtn, () => this.quitToMenu());
    click(this.ui.againBtn, () => this.startGame());
    click(this.ui.victoryQuitBtn, () => this.quitToMenu());

    this.ui.tiltSensitivity?.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      this.settings.tiltSensitivity = value;
      this.input.setTiltSensitivity(value);
    });
    if (this.ui.tiltSensitivity) this.ui.tiltSensitivity.value = String(this.settings.tiltSensitivity);
  }

  resetRun(fresh = false) {
    this.player = this.createPlayer();
    this.guards = GUARDS.map((data, i) => new Guard(data, i));
    this.princesses = PRINCESSES.map((data, i) => new Princess(data, i));
    this.checkpoints = CHECKPOINTS.map((cp, i) => ({
      ...cp,
      active: i === 0,
      pulse: 0,
    }));
    this.respawn = { x: WORLD.start.x, y: WORLD.start.y };
    this.checkpointIndex = 0;
    this.hearts = 3;
    this.captures = 0;
    this.crownsShown = 0;
    this.heartsShown = 3;
    this.elapsed = 0;
    this.overPending = 0;
    this.shake = 0;
    this.hurtFlash = 0;
    this.captureFlash = 0;
    this.particles.length = 0;
    this.ropeFx.length = 0;
    this.accumulator = 0;
    this.portalOpen = false;
    this.floorShown = -1;
    this.cam = { x: WORLD.start.x + 80, y: WORLD.start.y - 140 };
    this.refreshHud(true);
    if (fresh) {
      this.ui.hearts.forEach((el) => el.classList.remove('empty', 'pop'));
      this.ui.crowns.forEach((el) => el.classList.remove('filled', 'pop'));
      this.ui.objectiveText.textContent = 'Capture 3 princesses';
    }
  }

  startGame() {
    this.audio.unlock();
    this.audio.startMusic();
    this.resetRun(true);
    this.state = 'playing';
    this.ui.menu.classList.add('leaving');
    window.setTimeout(() => {
      if (this.state !== 'menu') this.ui.menu.classList.add('hidden');
    }, 380);
    this.ui.gameOverScreen.classList.add('hidden');
    this.ui.victoryScreen.classList.add('hidden');
    this.ui.pauseScreen.classList.add('hidden');
    this.ui.worldHud.classList.remove('hidden');
    this.updateTouchUi();
    this.updateTiltUi();
    document.body.classList.add('playing');
    this.showToast('Capture all three princesses. Stay out of the lamplight.', 'gold', 4200);
    window.setTimeout(() => {
      if (this.state === 'playing' && !this.hintShown) {
        this.hintShown = true;
        const jumpKey = this.input.hasTouch ? 'Jump' : 'Space';
        const lassoKey = this.input.hasTouch ? 'Lasso' : 'E';
        this.showToast(`${jumpKey} to jump · ${lassoKey} to lasso · Lanterns are checkpoints`, 'teal', 4600);
      }
    }, 2300);
  }

  quitToMenu() {
    this.state = 'menu';
    this.ui.pauseScreen.classList.add('hidden');
    this.ui.gameOverScreen.classList.add('hidden');
    this.ui.victoryScreen.classList.add('hidden');
    this.ui.worldHud.classList.add('hidden');
    this.ui.touch.classList.add('hidden');
    this.ui.prompt.classList.add('hidden');
    this.ui.menu.classList.remove('hidden', 'leaving');
    document.body.classList.remove('playing');
    this.updateTiltUi();
    this.audio.stopMusic(0.8);
    this.input.releaseAll();
  }

  restartRun() {
    this.ui.pauseScreen.classList.add('hidden');
    this.audio.play('ui');
    this.resetRun(true);
    this.state = 'playing';
    this.ui.worldHud.classList.remove('hidden');
    this.updateTouchUi();
    this.updateTiltUi();
    this.showToast('A fresh caper. The castle has not noticed you yet.', 'gold');
  }

  retryFromCheckpoint() {
    this.ui.gameOverScreen.classList.add('hidden');
    this.state = 'playing';
    this.hearts = 3;
    this.overPending = 0;
    this.captures = this.princesses.filter((p) => p.state === 'captured').length;
    this.heartsShown = 0;
    this.refreshHud(true);
    this.respawnPlayer(true);
    for (const guard of this.guards) guard.reset();
    this.ui.worldHud.classList.remove('hidden');
    this.updateTouchUi();
    this.updateTiltUi();
    this.showToast('Back on your feet. The lantern still burns.', 'teal');
  }

  togglePause(force = false) {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.ui.pauseCrowns.textContent = String(this.captures);
      this.ui.pauseTime.textContent = formatTime(this.elapsed);
      this.ui.pauseFloor.textContent = `${floorIndexForY(this.player.y) + 1}F`;
      this.ui.pauseScreen.classList.remove('hidden');
      this.ui.prompt.classList.add('hidden');
      this.input.releaseAll();
      this.updateTiltUi();
      this.audio.play('ui');
    } else if (this.state === 'paused') {
      this.resumeGame();
    }
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.pauseScreen.classList.add('hidden');
    this.updateTiltUi();
    this.audio.play('ui');
    this.lastFrame = performance.now() / 1000;
    this.accumulator = 0;
  }

  toggleMute() {
    const muted = this.audio.toggleMuted();
    this.audio.unlock();
    this.updateSoundUi();
    this.showToast(muted ? 'Sound muted. The castle holds its breath.' : 'Sound on.', muted ? 'danger' : 'teal', 1900);
    return muted;
  }

  updateSoundUi() {
    const muted = this.audio.muted;
    const state = muted ? 'Off' : 'On';
    if (this.ui.menuMute) {
      this.ui.menuMute.setAttribute('aria-pressed', String(muted));
      this.ui.menuMute.setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound');
    }
    if (this.ui.soundState) this.ui.soundState.textContent = state;
    if (this.ui.muteBtn) {
      this.ui.muteBtn.setAttribute('aria-pressed', String(muted));
      this.ui.muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    }
    if (this.ui.pauseMute) {
      this.ui.pauseMute.setAttribute('aria-pressed', String(muted));
      this.ui.pauseMute.querySelector('span').textContent = state;
    }
  }

  async toggleTilt() {
    if (this.input.tilt.enabled) {
      this.input.disableTilt();
      this.updateTiltUi();
      this.showToast('Tilt controls off. The joystick is yours.', 'teal', 2200);
      return;
    }
    this.showToast('Asking for motion access…', 'teal', 1600);
    const result = await this.input.toggleTilt();
    this.updateTiltUi();
    if (!result.ok) {
      if (result.reason === 'denied') {
        this.showToast('Motion access was declined. You can still use the joystick or keyboard.', 'danger', 5000);
      } else if (result.reason === 'unsupported') {
        this.showToast('This device has no tilt sensor. The joystick still works.', 'danger', 4200);
      } else {
        this.showToast('Tilt is unavailable right now. Use the joystick instead.', 'danger', 3600);
      }
      return;
    }
    this.showToast('Tilt on — hold your device the way you like, then lean to move.', 'teal', 4200);
    window.setTimeout(() => {
      if (this.input.tilt.enabled && this.input.tilt.source === 'none') {
        this.showToast('No motion data arrived. The joystick and keys still work.', 'gold', 3800);
      }
    }, 1700);
  }

  updateTiltUi() {
    const tilt = this.input.tilt;
    const enabled = tilt.enabled;
    const label = enabled ? 'On' : tilt.permission === 'denied' ? 'Denied' : 'Off';
    if (this.ui.tiltToggle) {
      this.ui.tiltToggle.setAttribute('aria-pressed', String(enabled));
      this.ui.tiltToggle.setAttribute('aria-label', enabled ? 'Disable tilt controls' : 'Enable tilt controls');
    }
    if (this.ui.tiltState) this.ui.tiltState.textContent = label;
    if (this.ui.pauseTiltToggle) {
      this.ui.pauseTiltToggle.setAttribute('aria-pressed', String(enabled));
      this.ui.pauseTiltToggle.querySelector('span').textContent = enabled ? 'On' : 'Off';
    }
    if (this.ui.tiltBadge) this.ui.tiltBadge.classList.toggle('hidden', !enabled || this.state !== 'playing');
    if (this.ui.tiltValue) {
      const value = enabled ? (this.input.tilt.source === 'motion' ? 'Motion' : 'Tilt') : 'Tilt';
      this.ui.tiltValue.textContent = value;
    }
    document.body.classList.toggle('tilt-on', enabled);
  }

  updateTouchUi() {
    const show = this.input.hasTouch && this.state === 'playing';
    this.ui.touch.classList.toggle('hidden', !show);
    document.body.classList.toggle('touch', this.input.hasTouch);
    if (this.ui.tiltBadge) {
      this.ui.tiltBadge.classList.toggle('hidden', !this.input.tilt.enabled || this.state !== 'playing');
    }
  }

  refreshHud(force = false) {
    const hearts = clamp(this.hearts, 0, this.maxHearts);
    if (force || hearts !== this.heartsShown) {
      this.ui.hearts.forEach((el, i) => {
        const empty = i >= hearts;
        if (el.classList.contains('empty') !== empty) {
          el.classList.toggle('empty', empty);
          if (!empty) {
            el.classList.remove('pop');
            void el.offsetWidth;
            el.classList.add('pop');
          }
        }
      });
      this.heartsShown = hearts;
    }

    if (force || this.captures !== this.crownsShown) {
      this.ui.crowns.forEach((el, i) => {
        const filled = i < this.captures;
        if (el.classList.contains('filled') !== filled) {
          el.classList.toggle('filled', filled);
          if (filled) {
            el.classList.remove('pop');
            void el.offsetWidth;
            el.classList.add('pop');
          }
        }
      });
      this.crownsShown = this.captures;
    }

    if (this.captures >= 3) {
      this.ui.objectiveText.textContent = 'Reach the moon gate';
      this.ui.objective.classList.add('complete');
    } else {
      this.ui.objectiveText.textContent = this.captures === 0
        ? 'Capture 3 princesses'
        : `${3 - this.captures} princess${3 - this.captures === 1 ? '' : 'es'} left`;
      this.ui.objective.classList.remove('complete');
    }
  }

  showToast(text, color = 'gold', duration = 2800) {
    if (!this.ui.toasts) return;
    const el = document.createElement('div');
    el.className = `toast ${color}`;
    el.innerHTML = `<span class="toast-icon"></span><span></span>`;
    el.lastElementChild.textContent = text;
    this.ui.toasts.appendChild(el);
    while (this.ui.toasts.children.length > 3) this.ui.toasts.firstElementChild.remove();
    window.setTimeout(() => {
      el.classList.add('out');
      window.setTimeout(() => el.remove(), 320);
    }, duration);
  }

  showPrompt(key, text) {
    if (!this.ui.prompt) return;
    if (!key && !text) {
      this.ui.prompt.classList.add('hidden');
      return;
    }
    if (this.ui.promptKey.textContent !== key) this.ui.promptKey.textContent = key;
    if (this.ui.promptText.textContent !== text) this.ui.promptText.textContent = text;
    this.ui.prompt.classList.remove('hidden');
  }

  hidePrompt() { this.ui.prompt?.classList.add('hidden'); }

  /* ----------------------------------------------------------------
     Main loop
     ---------------------------------------------------------------- */

  loop(nowMs) {
    const now = nowMs / 1000;
    let dt = now - this.lastFrame;
    this.lastFrame = now;
    if (!Number.isFinite(dt)) dt = 0;
    dt = clamp(dt, 0, 0.05);
    this.frameDt = dt;
    this.clock += dt;

    if (this.state === 'playing') {
      this.handleFrameInput();
      this.elapsed += dt;
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= FIXED && steps < 7) {
        this.step(FIXED);
        this.accumulator -= FIXED;
        steps++;
        if (this.state !== 'playing') break;
      }
      if (steps === 7) this.accumulator = 0;
      if (this.state === 'playing') {
        this.updateFrame(dt);
      }
      this.refreshHud();
      this.updateHudFrame(dt);
    } else if (this.state === 'menu') {
      this.menuTime += dt;
    } else if (this.state === 'paused') {
      this.updateHudFrame(dt);
    }

    this.renderer.render(this, dt);
    this.input.endFrame();
    requestAnimationFrame(this.loop);
  }

  handleFrameInput() {
    if (this.overPending > 0 || this.player.dead) return;
    if (this.input.pressed('jump')) {
      this.player.jumpBuffer = 0.15;
    }
    if (this.input.pressed('lasso')) {
      this.onLassoPress();
    }
  }

  updateFrame(dt) {
    const p = this.player;

    // Camera follows a point slightly ahead of the thief.
    const look = clamp(p.vx * 0.12, -70, 70) + p.facing * 40;
    const targetX = p.x + look;
    const targetY = p.y - 118 - (p.grapple ? 30 : 0);
    const smooth = 1 - Math.pow(0.001, dt);
    this.cam.x += (targetX - this.cam.x) * smooth;
    this.cam.y += (targetY - this.cam.y) * smooth;

    this.shake = Math.max(0, this.shake - dt * 30);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.4);
    this.captureFlash = Math.max(0, this.captureFlash - dt * 2.2);

    for (const fx of this.ropeFx) fx.t -= dt;
    if (this.ropeFx.length) this.ropeFx = this.ropeFx.filter((fx) => fx.t > 0);

    if (this.overPending > 0) {
      this.overPending -= dt;
      if (this.overPending <= 0) this.showGameOver();
    }

    // Checkpoint and portal checks each frame.
    this.checkCheckpoints();
    this.checkPortal();
    this.updatePrompt();
    this.updateAlertBanner();

    // Held grapple must be released when the button is.
    if (p.grapple && !this.input.isDown('lasso')) this.detachGrapple(false);

    // Fall into the mist.
    if (p.y > WORLD.mistY && !p.dead) this.mistFall();
  }

  /* ----------------------------------------------------------------
     Fixed-step simulation
     ---------------------------------------------------------------- */

  step(dt) {
    const p = this.player;
    p.anim += dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurt > 0) p.hurt -= dt;
    if (p.ropeT > 0) p.ropeT -= dt;
    if (p.jumpBuffer > 0) p.jumpBuffer -= dt;

    this.updatePlayer(dt);
    for (const guard of this.guards) this.updateGuard(guard, dt);
    for (const princess of this.princesses) this.updatePrincess(princess, dt);
    this.updateParticles(dt);

    for (const cp of this.checkpoints) cp.pulse += dt;
  }

  updatePlayer(dt) {
    const p = this.player;
    const input = this.input;
    if (this.overPending > 0 || p.dead) {
      // Let knockback and gravity finish the fall.
      this.moveAndCollide(dt);
      return;
    }

    const axis = input.axisX;
    const axisY = input.axisY;

    // Grabbing a ladder.
    if (!p.climbing) {
      const ladder = this.findLadder(p);
      if (ladder && Math.abs(axisY) > 0.28) {
        p.climbing = ladder;
        p.grapple = null;
        p.vx = 0;
        p.vy = 0;
        p.grounded = false;
        this.audio.play('grapple');
      }
    }

    if (p.climbing) {
      this.climb(dt, axisY);
      return;
    }

    const onGround = p.grounded;
    const targetSpeed = axis * MOVE_SPEED;
    const accel = onGround ? 2700 : 1750;
    if (Math.abs(axis) > 0.08) {
      p.vx = approach(p.vx, targetSpeed, accel * dt);
      p.facing = axis > 0 ? 1 : -1;
    } else {
      p.vx = approach(p.vx, 0, (onGround ? 3300 : 520) * dt);
    }

    // Jump handling.
    if (p.jumpBuffer > 0) {
      if (p.grounded || p.coyote > 0) {
        p.vy = -650;
        p.grounded = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        p.airJumps = 1;
        this.audio.play('jump');
        this.spawnDust(p.x, p.y, p.facing, 6, '#c9b9e8');
        this.shake = Math.max(this.shake, 1.2);
      } else if (p.airJumps > 0) {
        p.vy = -585;
        p.airJumps--;
        p.jumpBuffer = 0;
        this.audio.play('doublejump');
        this.spawnRing(p.x, p.y - 24, '#cbb8ff', 18);
        this.spawnDust(p.x, p.y - 12, -p.facing, 8, '#a895e8');
      }
    }

    // Variable jump height. Never fight an active grapple pull.
    if (p.vy < 0 && !input.isDown('jump') && !p.grapple) p.vy += 2500 * dt;

    // Grapple pull.
    if (p.grapple) {
      const a = p.grapple.anchor;
      const dx = a.x - p.x;
      const dy = a.y - (p.y - 26);
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;
      if (dist > 82) {
        const pull = 2250;
        p.vx += nx * pull * dt;
        p.vy += ny * pull * dt;
        p.vy += 310 * dt;
      } else {
        p.vx *= Math.pow(0.03, dt);
        p.vy *= Math.pow(0.03, dt);
        p.vy += 90 * dt;
      }
      if (axis) p.vx += axis * 260 * dt;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 760) {
        p.vx = (p.vx / speed) * 760;
        p.vy = (p.vy / speed) * 760;
      }
      p.grapple.t += dt;
      if (dist > 430 || p.grapple.t > 6) this.detachGrapple(false);
    } else {
      p.vy += GRAVITY * dt;
    }

    p.vy = clamp(p.vy, -900, 980);
    this.moveAndCollide(dt);

    // Coyote time.
    if (p.grounded) {
      p.coyote = 0.12;
      p.airJumps = 1;
    } else {
      p.coyote = Math.max(0, p.coyote - dt);
    }

    // Footstep dust.
    if (p.grounded && Math.abs(p.vx) > 80) {
      p.stepTimer -= dt;
      if (p.stepTimer <= 0) {
        p.stepTimer = 0.17;
        this.spawnDust(p.x - p.facing * 9, p.y, -p.facing, 2, '#8578aa');
        this.audio.play('step');
      }
    } else {
      p.stepTimer = 0;
    }
  }

  findLadder(p) {
    for (const ladder of LADDERS) {
      if (p.x > ladder.x - 28 && p.x < ladder.x + 28 && p.y > ladder.top - 6 && p.y < ladder.bottom + 22) {
        return ladder;
      }
    }
    return null;
  }

  climb(dt, axisY) {
    const p = this.player;
    const ladder = p.climbing;
    if (!ladder) return;
    if (this.input.pressed('jump') || p.jumpBuffer > 0) {
      p.jumpBuffer = 0;
      p.climbing = null;
      p.vy = -470;
      p.vx = p.facing * 190;
      p.grounded = false;
      this.audio.play('jump');
      return;
    }
    p.x += (ladder.x - p.x) * Math.min(1, dt * 16);
    p.vx = 0;
    p.vy = 0;
    if (Math.abs(axisY) > 0.1) {
      p.y += axisY * CLIMB_SPEED * dt;
    }
    p.y = clamp(p.y, ladder.top, ladder.bottom);
    if (p.y <= ladder.top + 1 && axisY < -0.1) {
      p.y = ladder.top;
      p.x = ladder.exitX;
      p.climbing = null;
      p.grounded = true;
      p.vy = 0;
      this.spawnDust(p.x, p.y, 1, 5, '#c9b9e8');
      this.audio.play('land');
      return;
    }
    if (p.y >= ladder.bottom - 1 && axisY > 0.1) {
      p.y = ladder.bottom;
      p.climbing = null;
      p.grounded = true;
      this.audio.play('land');
    }
  }

  moveAndCollide(dt) {
    const p = this.player;
    const half = p.w / 2;

    // Horizontal sweep.
    p.x += p.vx * dt;
    for (const s of SOLIDS) {
      if (p.x + half <= s.x || p.x - half >= s.x + s.w) continue;
      if (p.y <= s.y || p.y - p.h >= s.y + s.h) continue;
      if (p.vx > 0) p.x = s.x - half - 0.001;
      else if (p.vx < 0) p.x = s.x + s.w + half + 0.001;
      p.vx = 0;
    }
    p.x = clamp(p.x, half + 6, WORLD.w - half - 6);

    // Vertical sweep.
    const previousBottom = p.y;
    const previousTop = p.y - p.h;
    p.y += p.vy * dt;
    let landed = false;
    for (const s of SOLIDS) {
      if (p.x + half <= s.x || p.x - half >= s.x + s.w) continue;
      if (p.vy >= 0 && previousBottom <= s.y + 3 && p.y >= s.y) {
        p.y = s.y;
        p.vy = 0;
        landed = true;
      } else if (p.vy < 0 && previousTop >= s.y + s.h - 3 && p.y - p.h <= s.y + s.h) {
        p.y = s.y + s.h + p.h;
        p.vy = 0;
      }
    }

    // One-way ledges only catch a falling thief.
    if (p.vy >= 0) {
      for (const l of LEDGES) {
        if (p.x + half <= l.x || p.x - half >= l.x + l.w) continue;
        if (previousBottom <= l.y + 2 && p.y >= l.y) {
          p.y = l.y;
          p.vy = 0;
          landed = true;
        }
      }
    }

    const wasGrounded = p.grounded;
    p.grounded = landed;
    if (landed && !wasGrounded && p.vy >= 0) {
      // A soft landing effect; the velocity was already zeroed above.
      if (Math.abs(p.vy) < 10) this.spawnDust(p.x, p.y, 0, 3, '#7d6c9e');
    }
  }

  /* ----------------------------------------------------------------
     Actions
     ---------------------------------------------------------------- */

  onLassoPress() {
    const p = this.player;
    if (p.dead || this.overPending > 0) return;
    if (p.grapple) {
      this.detachGrapple(true);
      return;
    }

    const princess = this.nearestPrincess(118);
    if (princess) {
      this.capturePrincess(princess);
      return;
    }

    const guard = this.nearestGuard(158);
    if (guard) {
      this.stunGuard(guard);
      return;
    }

    const anchor = this.nearestAnchor(350);
    if (anchor) {
      this.startGrapple(anchor);
      return;
    }

    p.ropeT = 0.16;
    p.ropeTo = { x: p.x + p.facing * 88, y: p.y - 34 };
    this.audio.play('lasso');
  }

  nearestPrincess(range) {
    const p = this.player;
    let best = null;
    let bestD = range;
    for (const princess of this.princesses) {
      if (princess.state !== 'free') continue;
      const dx = princess.x - p.x;
      const dy = princess.y - p.y;
      if (Math.abs(dy) > 130) continue;
      const d = Math.hypot(dx * 0.65, dy * 0.4);
      if (d < bestD && Math.abs(dx) < range) {
        best = princess;
        bestD = d;
      }
    }
    return best;
  }

  nearestGuard(range) {
    const p = this.player;
    let best = null;
    let bestD = range;
    for (const guard of this.guards) {
      if (guard.state === 'dazed') continue;
      const dx = guard.x - p.x;
      const dy = guard.y - p.y;
      const d = Math.abs(dx);
      if (Math.abs(dy) < 70 && d < bestD) {
        best = guard;
        bestD = d;
      }
    }
    return best;
  }

  nearestAnchor(range) {
    const p = this.player;
    let best = null;
    let bestD = range;
    for (const anchor of ANCHORS) {
      const d = Math.hypot(anchor.x - p.x, (anchor.y - (p.y - 26)) * 1.1);
      if (d < bestD) {
        best = anchor;
        bestD = d;
      }
    }
    return best;
  }

  capturePrincess(princess) {
    const p = this.player;
    if (princess.state !== 'free') return;
    princess.state = 'captured';
    princess.capturedAt = this.elapsed;
    princess.orbX = princess.x;
    princess.orbY = princess.y - 50;
    this.captures++;
    this.captureFlash = 1;
    this.flashColor = princess.color;
    this.shake = Math.max(this.shake, 5);
    this.audio.play('capture');
    this.input.vibrate([12, 30, 18]);
    this.ropeFx.push({ x1: p.x, y1: p.y - 36, x2: princess.x, y2: princess.y - 48, t: 0.28, color: princess.color });
    this.burst(princess.x, princess.y - 48, 34, princess.color, 1.25);
    this.burst(princess.x, princess.y - 48, 18, '#ffd479', 0.8);
    this.refreshHud(true);
    const left = 3 - this.captures;
    this.showToast(`${princess.name} captured! ${this.captures}/3`, left === 0 ? 'gold' : 'rose', 3200);
    this.updateObjectiveSoon();
    for (const guard of this.guards) {
      if (Math.abs(guard.x - princess.x) < 560) guard.investigate(princess.x, 3.2);
    }
    if (left === 0) {
      this.portalOpen = true;
      this.audio.play('portal');
      window.setTimeout(() => {
        if (this.captures === 3) {
          this.showToast('All three crowns! The moon gate is open on the rooftop.', 'gold', 5200);
          this.burst(2050, 360, 28, '#ffd479', 1.2);
        }
      }, 520);
    }
  }

  updateObjectiveSoon() {
    window.setTimeout(() => {
      if (this.state === 'playing' || this.state === 'paused') this.refreshHud(true);
    }, 300);
  }

  stunGuard(guard) {
    const p = this.player;
    guard.state = 'dazed';
    guard.dazedTimer = 7.2;
    guard.awareness = 0;
    guard.alertTimer = 0;
    guard.attackTimer = 0;
    this.shake = Math.max(this.shake, 3);
    this.audio.play('stun');
    this.input.vibrate([8, 24, 8]);
    this.ropeFx.push({ x1: p.x, y1: p.y - 36, x2: guard.x, y2: guard.y - 46, t: 0.24, color: '#75e6d0' });
    this.burst(guard.x, guard.y - 52, 12, '#75e6d0', 0.7);
    this.showToast('Guard tied up. He will nap for a while.', 'teal', 2400);
    if (this.allGuardsAlerted()) this.updateAlertBanner();
  }

  startGrapple(anchor) {
    const p = this.player;
    p.grapple = { anchor, t: 0, length: Math.hypot(anchor.x - p.x, anchor.y - (p.y - 26)) };
    p.climbing = null;
    p.grounded = false;
    this.audio.play('grapple');
    this.input.vibrate(9);
  }

  detachGrapple(quiet = false) {
    const p = this.player;
    if (!p.grapple) return;
    p.grapple = null;
    if (!quiet) {
      p.vy -= 60;
      this.spawnRing(p.x, p.y - 26, '#ffd479', 12);
    }
  }

  /* ----------------------------------------------------------------
     Enemies and princesses
     ---------------------------------------------------------------- */

  updateGuard(guard, dt) {
    guard.anim += dt;
    if (guard.alertCooldown > 0) guard.alertCooldown -= dt;

    if (guard.state === 'dazed') {
      guard.dazedTimer -= dt;
      guard.awareness = 0;
      guard.seen = false;
      if (guard.dazedTimer <= 0) {
        guard.state = 'patrol';
        guard.awareness = 0.2;
        guard.pauseTimer = 0.4;
        this.burst(guard.x, guard.y - 60, 5, '#ffd479', 0.5);
      }
      return;
    }

    const p = this.player;
    const eyeX = guard.x + guard.dir * 9;
    const eyeY = guard.y - 47;
    const tx = p.x;
    const ty = p.y - 32;
    const dx = tx - eyeX;
    const dy = ty - eyeY;
    const dist = Math.hypot(dx, dy);
    const inFront = dx * guard.dir > -10;
    const inCone = dist < 315 && inFront && Math.abs(dy) < dist * 0.62 + 20;
    let seen = false;
    if (inCone && !p.dead && this.state === 'playing' && this.hasLineOfSight(eyeX, eyeY, tx, ty)) {
      seen = true;
    }
    guard.seen = seen;

    if (seen) {
      const closeness = 1 - dist / 315;
      guard.awareness += dt * (1.25 + closeness * 1.9);
    } else {
      guard.awareness -= dt * (guard.state === 'alert' ? 0.3 : 0.62);
    }
    guard.awareness = clamp(guard.awareness, 0, 1);

    if (guard.awareness >= 1 && guard.state !== 'alert') {
      guard.state = 'alert';
      guard.alertTimer = 5.2;
      guard.dir = dx >= 0 ? 1 : -1;
      this.audio.play('alert');
      this.input.vibrate([10, 40, 10]);
      this.shake = Math.max(this.shake, 5);
      if (this.elapsed - this.alertToastAt > 4) {
        this.alertToastAt = this.elapsed;
        this.showToast('Spotted! Break line of sight or lasso the guard.', 'danger', 3000);
      }
      for (const other of this.guards) {
        if (other !== guard && other.state === 'patrol' && Math.abs(other.x - guard.x) < 420) {
          other.awareness = Math.max(other.awareness, 0.35);
          other.investigate(guard.x + (p.x - guard.x) * 0.4, 2.2);
        }
      }
    }

    if (guard.state === 'alert') {
      guard.alertTimer -= dt;
      const toPlayer = p.x - guard.x;
      if (seen) guard.alertTimer = Math.max(guard.alertTimer, 2.4);
      if (Math.abs(toPlayer) > 14) {
        guard.dir = toPlayer > 0 ? 1 : -1;
        const speed = 150;
        const nx = guard.x + guard.dir * speed * dt;
        const min = guard.x1 - 80;
        const max = guard.x2 + 80;
        const next = clamp(nx, min, max);
        if (this.isGuardFooting(next, guard.y)) guard.x = next;
      }
      if (Math.abs(p.x - guard.x) < 35 && Math.abs((p.y - 30) - (guard.y - 30)) < 56) {
        this.hurtPlayer(guard.x);
      }
      if (guard.alertTimer <= 0 || Math.abs(p.x - guard.x) > 520) {
        guard.state = 'return';
        guard.awareness = Math.min(guard.awareness, 0.24);
        guard.alertTimer = 0;
      }
      return;
    }

    if (guard.state === 'return') {
      const target = clamp(guard.x, guard.x1, guard.x2);
      const dxr = target - guard.x;
      if (Math.abs(dxr) < 5) {
        guard.state = 'patrol';
        guard.pauseTimer = 0.5;
      } else {
        guard.dir = dxr > 0 ? 1 : -1;
        guard.x += guard.dir * guard.speed * 1.25 * dt;
      }
      return;
    }

    // Patrol or investigate.
    let target = null;
    if (guard.investigateTimer > 0) {
      guard.investigateTimer -= dt;
      target = guard.investigateX;
      if (guard.investigateTimer <= 0) {
        guard.investigateX = null;
        target = null;
      }
    }
    if (target != null) {
      const dxr = target - guard.x;
      if (Math.abs(dxr) > 10) {
        guard.dir = dxr > 0 ? 1 : -1;
        guard.x += guard.dir * guard.speed * 1.5 * dt;
        guard.x = clamp(guard.x, guard.x1, guard.x2);
      }
      return;
    }

    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      return;
    }
    guard.x += guard.dir * guard.speed * dt;
    if (guard.x <= guard.x1) {
      guard.x = guard.x1;
      guard.dir = 1;
      guard.pauseTimer = 0.6 + Math.random() * 0.5;
    } else if (guard.x >= guard.x2) {
      guard.x = guard.x2;
      guard.dir = -1;
      guard.pauseTimer = 0.6 + Math.random() * 0.5;
    }

    // A guard physically bumped by the thief notices immediately.
    if (Math.abs(p.x - guard.x) < 30 && Math.abs(p.y - guard.y) < 42 && guard.state !== 'dazed') {
      guard.awareness = 1;
      guard.state = 'alert';
      guard.alertTimer = 5;
      guard.dir = p.x >= guard.x ? 1 : -1;
      this.audio.play('alert');
      this.shake = Math.max(this.shake, 4);
    }
  }

  isGuardFooting(x, y) {
    return SOLIDS.some((s) => s.kind === 'floor' && x > s.x + 4 && x < s.x + s.w - 4 && Math.abs(s.y - y) < 4);
  }

  hasLineOfSight(x1, y1, x2, y2) {
    const steps = 14;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      for (const s of SOLIDS) {
        if (x > s.x + 1 && x < s.x + s.w - 1 && y > s.y + 1 && y < s.y + s.h - 1) {
          return false;
        }
      }
    }
    return true;
  }

  updatePrincess(princess, dt) {
    princess.anim += dt;
    princess.floatT += dt;
    const p = this.player;

    if (princess.state === 'captured') {
      const same = this.princesses.filter((q) => q.state === 'captured');
      const slot = same.indexOf(princess);
      const angle = this.clock * 0.9 + slot * 2.1;
      const tx = p.x + Math.cos(angle) * (44 + slot * 9) - p.facing * 8;
      const ty = p.y - 108 + Math.sin(angle * 1.3) * 13 + slot * 5;
      const k = 1 - Math.pow(0.0016, dt);
      princess.orbX += (tx - princess.orbX) * k;
      princess.orbY += (ty - princess.orbY) * k;
      return;
    }

    const dx = p.x - princess.x;
    const dy = p.y - princess.y;
    if (Math.abs(dx) < 250 && Math.abs(dy) < 150) {
      princess.panic = 1.25;
      princess.dir = dx > 0 ? -1 : 1;
    }

    if (princess.panic > 0) {
      princess.panic -= dt;
      princess.x += princess.dir * 178 * dt;
      if (princess.x < princess.home[0]) {
        princess.x = princess.home[0];
        princess.dir = 1;
      } else if (princess.x > princess.home[1]) {
        princess.x = princess.home[1];
        princess.dir = -1;
      }
    }
    // Keep her feet on the floor she belongs to.
    const fy = this.floorAtX(princess.x, princess.y);
    if (fy != null) princess.y = fy;
  }

  floorAtX(x, y) {
    let best = null;
    for (const s of SOLIDS) {
      if (s.kind !== 'floor') continue;
      if (x < s.x || x > s.x + s.w) continue;
      if (Math.abs(s.y - y) < 40) {
        if (best == null || s.y < best) best = s.y;
      }
    }
    return best;
  }

  /* ----------------------------------------------------------------
     Damage, respawn, checkpoints, portal
     ---------------------------------------------------------------- */

  hurtPlayer(sourceX) {
    const p = this.player;
    if (p.invuln > 0 || this.overPending > 0 || this.state !== 'playing') return;
    this.hearts = Math.max(0, this.hearts - 1);
    this.heartsShown = -99;
    p.invuln = 1.6;
    p.hurt = 0.5;
    p.vx = (p.x >= sourceX ? 1 : -1) * 430;
    p.vy = -360;
    p.grounded = false;
    p.climbing = null;
    p.grapple = null;
    this.shake = Math.max(this.shake, 13);
    this.hurtFlash = 1;
    this.audio.play('hit');
    this.input.vibrate([20, 40, 30]);
    this.burst(p.x, p.y - 34, 14, '#ff6b6b', 0.9);
    this.refreshHud(true);
    if (this.hearts <= 0) {
      p.dead = true;
      this.overPending = 1.35;
      this.showToast('Caught! The guards have you…', 'danger', 2400);
    } else {
      this.showToast('Oof. Keep to the shadows.', 'danger', 1700);
    }
  }

  mistFall() {
    const p = this.player;
    if (p.dead || this.overPending > 0) return;
    p.dead = true;
    this.hearts = Math.max(0, this.hearts - 1);
    this.heartsShown = -99;
    this.refreshHud(true);
    this.audio.play('wipeout');
    this.shake = Math.max(this.shake, 8);
    this.burst(p.x, WORLD.mistY - 20, 18, '#6d7fb8', 0.8);
    if (this.hearts <= 0) {
      this.overPending = 1.1;
      this.showToast('The mist takes you. No hearts left.', 'danger', 2400);
      return;
    }
    this.showToast('Lost to the mist. Back to the last lantern.', 'danger', 2600);
    this.respawnPlayer(false);
  }

  respawnPlayer(full = false) {
    const p = this.player;
    p.x = this.respawn.x;
    p.y = this.respawn.y;
    p.vx = 0;
    p.vy = 0;
    p.dead = false;
    p.grapple = null;
    p.climbing = null;
    p.invuln = 1.7;
    p.hurt = 0;
    p.grounded = true;
    p.airJumps = 1;
    p.facing = 1;
    this.cam.x = p.x + 80;
    this.cam.y = p.y - 140;
    this.accumulator = 0;
    for (const guard of this.guards) {
      guard.awareness = 0;
      guard.state = 'patrol';
      guard.alertTimer = 0;
      guard.investigateTimer = 0;
    }
    if (full) {
      this.hearts = 3;
      this.refreshHud(true);
    }
    this.spawnRing(p.x, p.y - 30, '#ffd479', 24);
  }

  checkCheckpoints() {
    const p = this.player;
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      if (cp.active) continue;
      if (Math.abs(p.x - cp.x) < 60 && Math.abs(p.y - cp.y) < 90) {
        cp.active = true;
        this.checkpointIndex = i;
        this.respawn = { x: cp.x, y: cp.y };
        this.audio.play('checkpoint');
        this.burst(cp.x, cp.y - 54, 20, '#ffd479', 0.8);
        if (this.hearts < this.maxHearts) {
          this.hearts++;
          this.heartsShown = -99;
          this.refreshHud(true);
        }
        this.showToast(`Lantern lit — ${cp.name}.`, 'gold', 2900);
      }
    }
  }

  checkPortal() {
    const p = this.player;
    const gate = WORLD.gate;
    if (Math.abs(p.x - gate.x) < 82 && p.y > gate.y - 90 && p.y < gate.y + 20) {
      if (this.captures >= 3) {
        this.winRun();
      } else if (this.elapsed - this.gateToastAt > 4) {
        this.gateToastAt = this.elapsed;
        const missing = this.princesses.filter((q) => q.state !== 'captured').map((q) => q.name);
        this.showToast(`The moon gate is sealed. Find ${missing.join(' & ')}.`, 'danger', 3600);
        this.audio.play('ui');
        p.vx = -180;
      }
    }
  }

  winRun() {
    if (this.state !== 'playing') return;
    this.state = 'victory';
    this.player.vx = 0;
    this.player.vy = 0;
    this.audio.play('portal');
    this.audio.stopMusic(1.4);
    this.captureFlash = 1;
    this.flashColor = '#ffd479';
    this.burst(2050, 360, 60, '#ffd479', 1.6);
    this.burst(2050, 360, 30, '#f17fa4', 1.1);
    const rank = this.elapsed <= 210 ? 'S' : this.elapsed <= 330 ? 'A' : this.elapsed <= 480 ? 'B' : 'C';
    window.setTimeout(() => {
      this.ui.resultTime.textContent = formatTime(this.elapsed);
      this.ui.resultCrowns.textContent = `${this.captures} / 3`;
      this.ui.resultRank.textContent = rank;
      this.ui.victoryScreen.classList.remove('hidden');
      this.ui.worldHud.classList.add('hidden');
      this.ui.touch.classList.add('hidden');
      this.updateTiltUi();
      this.hidePrompt();
    }, 900);
  }

  showGameOver() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    this.player.dead = true;
    this.audio.stopMusic(1.0);
    this.ui.gameOverScreen.classList.remove('hidden');
    this.ui.worldHud.classList.add('hidden');
    this.ui.touch.classList.add('hidden');
    this.updateTiltUi();
    this.hidePrompt();
  }

  updateAlertBanner() {
    const alert = this.guards.some((g) => g.state === 'alert' || g.awareness > 0.82);
    this.ui.alertBanner.classList.toggle('hidden', !alert);
  }

  updatePrompt() {
    if (this.state !== 'playing' || this.overPending > 0) {
      this.hidePrompt();
      return;
    }
    const p = this.player;
    const touch = this.input.hasTouch;
    const key = touch ? 'Lasso' : 'E';

    const princess = this.nearestPrincess(118);
    if (princess) {
      this.showPrompt(key, `Capture ${princess.name}`);
      return;
    }
    const guard = this.nearestGuard(158);
    if (guard) {
      this.showPrompt(key, 'Stun guard');
      return;
    }
    if (p.grapple) {
      this.showPrompt('Release', 'Let go of the rope');
      return;
    }
    const anchor = this.nearestAnchor(350);
    if (anchor) {
      this.showPrompt(key, 'Hold to grapple');
      return;
    }
    const ladder = this.findLadder(p);
    if (ladder) {
      this.showPrompt(touch ? 'Stick' : 'W/S', 'Climb the rope ladder');
      return;
    }
    this.hidePrompt();
  }

  updateHudFrame(dt) {
    const seconds = Math.floor(this.elapsed);
    if (this.ui.timer.textContent !== formatTime(seconds)) {
      this.ui.timer.textContent = formatTime(seconds);
    }
    const floor = floorIndexForY(this.player.y);
    if (floor !== this.floorShown) {
      this.floorShown = floor;
      this.ui.floorText.textContent = `${floor + 1}F · ${FLOOR_NAMES[floor] || 'The Spire'}`;
    }
    if (this.ui.tiltValue) {
      if (this.input.tilt.enabled) {
        this.ui.tiltValue.textContent = this.input.tilt.source === 'motion' ? 'Motion' : 'Tilt';
      }
    }
  }

  /* ----------------------------------------------------------------
     Particles / effects
     ---------------------------------------------------------------- */

  burst(x, y, count, color, power = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = (45 + Math.random() * 210) * power;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 30 * power,
        life: 0.45 + Math.random() * 0.9,
        max: 0.9 + Math.random() * 0.9,
        size: 1.5 + Math.random() * 3.2,
        color,
        gravity: 90,
        glow: true,
      });
    }
  }

  spawnDust(x, y, dir, count, color) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 4 - Math.random() * 10,
        vx: dir * (12 + Math.random() * 50) + (Math.random() - 0.5) * 30,
        vy: -18 - Math.random() * 46,
        life: 0.36 + Math.random() * 0.3,
        max: 0.66,
        size: 2 + Math.random() * 3.5,
        color,
        gravity: 30,
        glow: false,
      });
    }
  }

  spawnRing(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * 130,
        vy: Math.sin(a) * 80,
        life: 0.34,
        max: 0.34,
        size: 2.4,
        color,
        gravity: 0,
        glow: true,
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
      p.vx *= Math.pow(0.15, dt);
    }
    if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  allGuardsAlerted() {
    return this.guards.some((g) => g.state === 'alert');
  }

  /* ----------------------------------------------------------------
     Debug bridge
     ---------------------------------------------------------------- */

  exposeDebug() {
    const game = this;
    window.__didnapper = {
      version: '1.0.0',
      get state() { return game.state; },
      get game() { return game; },
      start: () => { game.startGame(); return true; },
      pause: () => game.togglePause(),
      resume: () => game.resumeGame(),
      teleport: (x, y) => {
        game.player.x = x;
        game.player.y = y;
        game.player.vx = 0;
        game.player.vy = 0;
        game.player.grounded = false;
        game.cam.x = x;
        game.cam.y = y - 120;
        return { x, y };
      },
      captureAll: () => {
        for (const princess of game.princesses) {
          if (princess.state === 'free') game.capturePrincess(princess);
        }
        return game.captures;
      },
      captureNearest: () => {
        const princess = game.princesses.find((q) => q.state === 'free');
        if (princess) {
          game.player.x = princess.x - 40;
          game.player.y = princess.y;
          game.capturePrincess(princess);
        }
        return game.captures;
      },
      hurt: () => game.hurtPlayer(game.player.x + 10),
      setHearts: (n) => { game.hearts = n; game.refreshHud(true); return game.hearts; },
      win: () => { game.captures = 3; game.princesses.forEach((q) => { q.state = 'captured'; }); game.refreshHud(true); game.teleportDebug = true; game.player.x = WORLD.gate.x; game.player.y = WORLD.gate.y; game.winRun(); return true; },
      settings: () => ({ ...game.settings, tilt: game.input.tilt }),
      enableTilt: () => game.toggleTilt(),
      getRenderInfo: () => game.renderer.info(),
    };
  }
}

const boot = () => {
  try {
    const game = new Game();
    window.__game = game;
  } catch (error) {
    console.error(error);
    const el = document.getElementById('bootError');
    if (el) el.classList.remove('hidden');
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
