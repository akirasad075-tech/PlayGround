/**
 * Tiny procedural soundtrack and SFX engine. No audio files, no network.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.delay = null;
    this.noise = null;
    this.muted = this.readMuted();
    this.musicTimer = 0;
    this.step = 0;
    this.nextNoteAt = 0;
    this.musicWanted = false;
    this.unlocked = false;
    this.tempo = 78;
  }

  readMuted() {
    try { return localStorage.getItem('didnapper2-muted') === '1'; }
    catch { return false; }
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
    } catch {
      return null;
    }

    const ctx = this.ctx;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 24;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.29;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.72;

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.2;

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.72;

    // A small feedback delay gives the score a stone-hall tail.
    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.31;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(this.master);

    this.musicBus.connect(compressor);
    this.musicBus.connect(delay);
    this.sfxBus.connect(compressor);
    compressor.connect(this.master);
    this.master.connect(ctx.destination);
    this.delay = delay;

    const len = Math.floor(ctx.sampleRate * 0.8);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4);
    }
    this.noise = buffer;

    this.unlocked = true;
    return ctx;
  }

  unlock() {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (this.musicWanted) this.startMusic();
  }

  setMuted(muted) {
    this.muted = muted;
    try { localStorage.setItem('didnapper2-muted', muted ? '1' : '0'); } catch {}
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.72, this.ctx.currentTime + 0.08);
    }
    return muted;
  }

  toggleMuted() { return this.setMuted(!this.muted); }

  startMusic() {
    this.musicWanted = true;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (this.musicTimer) return;
    this.nextNoteAt = ctx.currentTime + 0.15;
    this.step = 0;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, ctx.currentTime);
    this.musicBus.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1.3);
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 90);
    this.scheduleMusic();
  }

  stopMusic(fade = 0.5) {
    this.musicWanted = false;
    if (!this.ctx || !this.musicBus) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0.0001, now + fade);
  }

  scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.musicWanted) return;
    const secondsPerStep = 60 / this.tempo / 2;
    while (this.nextNoteAt < ctx.currentTime + 0.3) {
      this.playMusicStep(this.step, this.nextNoteAt);
      this.step = (this.step + 1) % 64;
      this.nextNoteAt += secondsPerStep;
    }
  }

  playMusicStep(step, at) {
    // 4-bar minor progression: Dm - Bb - F - Gm - A (last bar pivots home).
    const chordIndex = Math.floor(step / 16) % 5;
    const chords = [
      [146.83, 174.61, 220.0, 293.66],   // Dm
      [116.54, 146.83, 174.61, 233.08],  // Bb
      [87.31, 130.81, 174.61, 220.0],    // F
      [98.0, 116.54, 146.83, 196.0],     // Gm
      [110.0, 138.59, 164.81, 220.0],    // A
    ];
    const chord = chords[chordIndex];
    const local = step % 16;

    if (local === 0) {
      this.pad(chord, at, 3.7);
      this.pluck(chord[0] / 2, at, 0.16, 3.2);
    }

    const arp = [0, 1, 2, 3, 2, 1, 3, 2, 1, 2, 3, 1, 0, 2, 3, 2];
    const note = chord[arp[local]] * (local % 4 === 3 ? 2 : 1);
    const accent = local === 0 ? 1 : local % 4 === 0 ? 0.7 : 0.46;
    this.pluck(note, at, 0.075 * accent, 1.3);

    if (local === 8 && Math.random() > 0.25) {
      this.pluck(chord[2] * 2, at + 0.02, 0.05, 1.8);
    }
  }

  pluck(freq, at, gain, decay) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, at);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(5200, freq * 7.5), at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 1.8), at + decay * 0.75);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(filter).connect(g).connect(this.musicBus);
    osc.start(at);
    osc.stop(at + decay + 0.03);
  }

  pad(chord, at, duration) {
    const ctx = this.ctx;
    if (!ctx) return;
    for (let i = 0; i < chord.length; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = chord[i] * (i === 0 ? 0.5 : 0.5);
      osc.detune.value = (i - 1.5) * 3;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(0.018, at + 0.7);
      g.gain.linearRampToValueAtTime(0.0001, at + duration);
      osc.connect(g).connect(this.musicBus);
      osc.start(at);
      osc.stop(at + duration + 0.05);
    }
  }

  tone(freq, { type = 'sine', at = 0, dur = 0.18, gain = 0.2, slide = null, bus = null, filter = null } = {}) {
    const ctx = this.ensure();
    if (!ctx) return;
    const start = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    let node = osc;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = filter.type || 'lowpass';
      f.frequency.value = filter.freq || 1200;
      f.Q.value = filter.q || 0.8;
      node = node.connect(f);
    }
    node.connect(g).connect(bus || this.sfxBus);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  burst({ at = 0, dur = 0.25, gain = 0.2, freq = 900, q = 0.8, type = 'bandpass', slide = null } = {}) {
    const ctx = this.ensure();
    if (!ctx || !this.noise) return;
    const start = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, start);
    filter.Q.value = q;
    if (slide) filter.frequency.exponentialRampToValueAtTime(Math.max(60, slide), start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(filter).connect(g).connect(this.sfxBus);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  play(name) {
    if (!this.unlocked) return;
    switch (name) {
      case 'ui':
        this.tone(720, { type: 'sine', dur: 0.07, gain: 0.07, slide: 900 });
        break;
      case 'jump':
        this.tone(330, { type: 'triangle', dur: 0.16, gain: 0.1, slide: 690 });
        this.burst({ dur: 0.12, gain: 0.04, freq: 1200, slide: 600 });
        break;
      case 'doublejump':
        this.tone(480, { type: 'triangle', dur: 0.18, gain: 0.1, slide: 980 });
        this.tone(960, { type: 'sine', dur: 0.12, gain: 0.035, at: 0.03, slide: 1500 });
        break;
      case 'land':
        this.burst({ dur: 0.13, gain: 0.09, freq: 380, type: 'lowpass', slide: 120 });
        break;
      case 'lasso':
        this.burst({ dur: 0.19, gain: 0.075, freq: 1800, q: 1.4, slide: 520 });
        this.tone(240, { type: 'sine', dur: 0.1, gain: 0.05, slide: 440 });
        break;
      case 'grapple':
        this.tone(190, { type: 'triangle', dur: 0.28, gain: 0.1, slide: 520 });
        this.burst({ dur: 0.2, gain: 0.06, freq: 1400, slide: 300 });
        break;
      case 'stun':
        this.burst({ dur: 0.2, gain: 0.12, freq: 220, type: 'lowpass', slide: 80 });
        this.tone(160, { type: 'square', dur: 0.12, gain: 0.05, slide: 90 });
        [880, 1180, 1480].forEach((f, i) => this.tone(f, { type: 'sine', dur: 0.36, gain: 0.045, at: 0.07 + i * 0.035, slide: f * 1.1 }));
        break;
      case 'capture':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone(f, { type: 'sine', dur: 0.5, gain: 0.09, at: i * 0.07, slide: f * 1.02 });
        });
        this.tone(130.81, { type: 'triangle', dur: 0.7, gain: 0.08, at: 0, slide: 196 });
        break;
      case 'alert':
        this.tone(392, { type: 'sawtooth', dur: 0.28, gain: 0.06, filter: { freq: 1200 } });
        this.tone(415.3, { type: 'sawtooth', dur: 0.32, gain: 0.055, at: 0.03, filter: { freq: 1200 } });
        this.burst({ dur: 0.3, gain: 0.05, freq: 700, slide: 200 });
        break;
      case 'hit':
        this.burst({ dur: 0.28, gain: 0.18, freq: 700, type: 'lowpass', slide: 150 });
        this.tone(140, { type: 'sawtooth', dur: 0.3, gain: 0.08, slide: 55 });
        break;
      case 'checkpoint':
        [659.25, 987.77, 1318.5].forEach((f, i) => this.tone(f, { type: 'sine', dur: 0.7, gain: 0.055, at: i * 0.06 }));
        break;
      case 'portal':
        [196, 293.66, 392, 523.25, 659.25, 783.99].forEach((f, i) => {
          this.tone(f, { type: 'sine', dur: 0.9, gain: 0.055, at: i * 0.055 });
        });
        break;
      case 'wipeout':
        this.tone(220, { type: 'triangle', dur: 0.6, gain: 0.08, slide: 55 });
        this.burst({ dur: 0.5, gain: 0.1, freq: 900, type: 'lowpass', slide: 100 });
        break;
      default:
        break;
    }
  }
}
