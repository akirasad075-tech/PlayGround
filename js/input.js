/**
 * Unified keyboard, touch, and optional device-tilt input.
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const DEADZONE = 0.1;

export class InputManager {
  constructor() {
    this.down = new Set();
    this.edges = new Set();
    this.keys = new Set();
    this.stick = { x: 0, y: 0, active: false, pointerId: null };
    this.joystickEl = null;
    this.knobEl = null;
    this.touchButtons = [];
    this.enabled = true;

    this.tilt = {
      enabled: false,
      available: typeof window !== 'undefined' && ('DeviceOrientationEvent' in window || 'DeviceMotionEvent' in window),
      needsPermission: false,
      permission: 'unknown',
      axis: 0,
      raw: null,
      baseline: null,
      sensitivity: 1,
      lastMotion: 0,
      source: 'none',
    };
    this.orientationHandler = null;
    this.motionHandler = null;

    this.onPauseKey = null;
    this.onMuteKey = null;
    this.reducedMotion = false;
    try {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.tilt.sensitivity = Number(localStorage.getItem('didnapper2-tilt-sensitivity')) || 1;
    } catch {}
    this.detectPermissionNeed();
  }

  detectPermissionNeed() {
    try {
      this.tilt.needsPermission = typeof DeviceMotionEvent !== 'undefined'
        && typeof DeviceMotionEvent.requestPermission === 'function';
    } catch {
      this.tilt.needsPermission = false;
    }
  }

  attach() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e), { passive: false });
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });
    this.bindTouch();
  }

  onKeyDown(e) {
    if (e.code === 'Tab') return;
    let action = null;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': action = 'left'; break;
      case 'ArrowRight': case 'KeyD': action = 'right'; break;
      case 'ArrowUp': case 'KeyW': action = 'up'; break;
      case 'ArrowDown': case 'KeyS': action = 'down'; break;
      case 'Space': case 'KeyZ': case 'KeyK': action = 'jump'; break;
      case 'KeyE': case 'KeyJ': case 'ShiftLeft': case 'ShiftRight': action = 'lasso'; break;
      case 'Escape': case 'KeyP':
        if (!e.repeat && this.onPauseKey) this.onPauseKey();
        e.preventDefault();
        return;
      case 'KeyM':
        if (!e.repeat && this.onMuteKey) this.onMuteKey();
        return;
      default: return;
    }
    e.preventDefault();
    if (!this.keys.has(action)) this.edges.add(action);
    this.keys.add(action);
  }

  onKeyUp(e) {
    const map = {
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      Space: 'jump', KeyZ: 'jump', KeyK: 'jump',
      KeyE: 'lasso', KeyJ: 'lasso', ShiftLeft: 'lasso', ShiftRight: 'lasso',
    };
    const action = map[e.code];
    if (!action) return;
    e.preventDefault();
    this.keys.delete(action);
  }

  bindTouch() {
    this.joystickEl = document.getElementById('joystick');
    this.knobEl = document.getElementById('stickKnob');
    if (this.joystickEl) this.bindJoystick(this.joystickEl, this.knobEl);

    const pair = (id, action) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!el.hasPointerCapture?.(event.pointerId)) el.setPointerCapture?.(event.pointerId);
        this.press(action);
        el.classList.add('pressed');
        this.vibrate(7);
      });
      const release = (event) => {
        event.preventDefault();
        this.release(action);
        el.classList.remove('pressed');
      };
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', () => { this.release(action); el.classList.remove('pressed'); });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      this.touchButtons.push(el);
    };
    pair('jumpBtn', 'jump');
    pair('lassoBtn', 'lasso');
  }

  bindJoystick(el, knob) {
    let rect = null;
    let maxRadius = 42;
    const begin = (event) => {
      if (this.stick.pointerId !== null) return;
      event.preventDefault();
      event.stopPropagation();
      el.setPointerCapture?.(event.pointerId);
      this.stick.pointerId = event.pointerId;
      this.stick.active = true;
      el.classList.add('active');
      rect = el.getBoundingClientRect();
      maxRadius = rect.width * 0.31;
      update(event);
    };
    const update = (event) => {
      if (!rect) rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = event.clientX - cx;
      let dy = event.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > maxRadius) {
        dx = (dx / len) * maxRadius;
        dy = (dy / len) * maxRadius;
      }
      this.stick.x = dx / maxRadius;
      this.stick.y = dy / maxRadius;
      if (knob) knob.style.transform = `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px))`;
    };
    const end = (event) => {
      if (this.stick.pointerId !== event.pointerId) return;
      this.stick.pointerId = null;
      this.stick.active = false;
      this.stick.x = 0;
      this.stick.y = 0;
      el.classList.remove('active');
      if (knob) {
        knob.style.transform = 'translate(-50%, -50%)';
      }
    };
    el.addEventListener('pointerdown', begin);
    el.addEventListener('pointermove', (event) => {
      if (this.stick.pointerId === event.pointerId) {
        event.preventDefault();
        update(event);
      }
    });
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  press(action) {
    if (!this.down.has(action)) this.edges.add(action);
    this.down.add(action);
  }

  release(action) {
    this.down.delete(action);
  }

  releaseAll() {
    this.down.clear();
    this.keys.clear();
    this.stick.active = false;
    this.stick.pointerId = null;
    this.stick.x = 0;
    this.stick.y = 0;
    if (this.joystickEl) this.joystickEl.classList.remove('active');
    if (this.knobEl) this.knobEl.style.transform = 'translate(-50%, -50%)';
    for (const el of this.touchButtons) el.classList.remove('pressed');
  }

  isDown(action) {
    return this.down.has(action) || this.keys.has(action);
  }

  pressed(action) {
    return this.edges.has(action);
  }

  endFrame() {
    this.edges.clear();
  }

  get axisX() {
    let value = 0;
    if (this.isDown('left')) value -= 1;
    if (this.isDown('right')) value += 1;
    if (Math.abs(this.stick.x) > DEADZONE) value += this.stick.x;
    if (this.tilt.enabled && Math.abs(this.tilt.axis) > DEADZONE) value += this.tilt.axis;
    return clamp(value, -1, 1);
  }

  get axisY() {
    let value = 0;
    if (this.isDown('up')) value -= 1;
    if (this.isDown('down')) value += 1;
    if (Math.abs(this.stick.y) > DEADZONE) value += this.stick.y;
    return clamp(value, -1, 1);
  }

  get hasTouch() {
    return (navigator.maxTouchPoints || 0) > 0
      || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
      || window.innerWidth < 820;
  }

  vibrate(ms = 8) {
    if (this.reducedMotion) return;
    try { navigator.vibrate?.(ms); } catch {}
  }

  setTiltSensitivity(value) {
    this.tilt.sensitivity = clamp(Number(value) || 1, 0.4, 2);
    try { localStorage.setItem('didnapper2-tilt-sensitivity', String(this.tilt.sensitivity)); } catch {}
  }

  async enableTilt() {
    this.detectPermissionNeed();
    if (!this.tilt.available) {
      this.tilt.permission = 'unsupported';
      return { ok: false, reason: 'unsupported' };
    }

    // Must be called directly from the user's tap on iOS 13+. Fire both requests
    // in the same gesture so Safari treats them as user-initiated.
    try {
      const requests = [];
      if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        requests.push(DeviceMotionEvent.requestPermission());
      }
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        requests.push(DeviceOrientationEvent.requestPermission());
      }
      if (requests.length) {
        const results = await Promise.all(requests);
        if (results.some((state) => state !== 'granted')) {
          this.tilt.permission = 'denied';
          return { ok: false, reason: 'denied' };
        }
      }
    } catch {
      this.tilt.permission = 'denied';
      return { ok: false, reason: 'denied' };
    }

    this.tilt.permission = 'granted';
    this.attachTiltListeners();
    this.tilt.enabled = true;
    this.tilt.baseline = null;
    this.tilt.axis = 0;
    this.tilt.raw = null;
    this.tilt.lastMotion = performance.now();
    return { ok: true };
  }

  attachTiltListeners() {
    if (!this.orientationHandler) {
      this.orientationHandler = (event) => {
        if (event.gamma == null && event.beta == null) return;
        const angle = this.screenAngle();
        const beta = event.beta || 0;
        const gamma = event.gamma || 0;
        let value;
        if (angle === 90) value = -beta;
        else if (angle === -90 || angle === 270) value = beta;
        else if (angle === 180) value = -gamma;
        else value = gamma;
        this.updateTilt(value, 'orientation');
      };
      window.addEventListener('deviceorientation', this.orientationHandler, true);
    }
    if (!this.motionHandler) {
      this.motionHandler = (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc || acc.x == null) return;
        // Only use motion as a fallback when orientation data has gone quiet.
        if (performance.now() - this.tilt.lastMotion < 250) return;
        const angle = (this.screenAngle() * Math.PI) / 180;
        const ax = acc.x;
        const ay = acc.y;
        const value = ax * Math.cos(angle) - ay * Math.sin(angle);
        this.updateTilt(value * 5.6, 'motion');
      };
      window.addEventListener('devicemotion', this.motionHandler, true);
    }
  }

  screenAngle() {
    let angle = 0;
    try {
      angle = screen.orientation?.angle ?? window.orientation ?? 0;
    } catch {}
    angle = Number(angle) || 0;
    if (angle > 180) angle -= 360;
    return angle;
  }

  updateTilt(raw, source) {
    if (!this.tilt.enabled) return;
    this.tilt.raw = raw;
    this.tilt.source = source;
    this.tilt.lastMotion = performance.now();
    if (this.tilt.baseline === null) {
      this.tilt.baseline = raw;
      return;
    }
    // Re-baseline very slowly so the calmer moments drift back to center.
    this.tilt.baseline += (raw - this.tilt.baseline) * 0.0009;
    const degrees = (raw - this.tilt.baseline) / 19;
    const scaled = degrees * this.tilt.sensitivity;
    const dead = 0.09;
    let value = 0;
    if (Math.abs(scaled) > dead) {
      value = Math.sign(scaled) * Math.min(1, (Math.abs(scaled) - dead) / (1 - dead));
      value = Math.sign(value) * Math.pow(Math.abs(value), 1.18);
    }
    this.tilt.axis += (value - this.tilt.axis) * 0.24;
  }

  disableTilt() {
    this.tilt.enabled = false;
    this.tilt.axis = 0;
    this.tilt.baseline = null;
    if (this.orientationHandler) {
      window.removeEventListener('deviceorientation', this.orientationHandler, true);
      this.orientationHandler = null;
    }
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler, true);
      this.motionHandler = null;
    }
  }

  toggleTilt() {
    if (this.tilt.enabled) {
      this.disableTilt();
      return Promise.resolve({ ok: true, enabled: false });
    }
    return this.enableTilt().then((result) => ({ ...result, enabled: result.ok }));
  }

  recenterTilt() {
    this.tilt.baseline = this.tilt.raw;
    this.tilt.axis = 0;
  }
}
