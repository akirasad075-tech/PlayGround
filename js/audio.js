/* ============================================================
   SAPHIRA: BOUND & BLADE — procedural audio
   No external samples. Everything is synthesized in the browser.
   ============================================================ */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let noiseBuffer = null;
  let timer = null;
  let muted = false;
  let mode = 'none';
  let nextTime = 0;
  let step = 0;

  try {
    muted = localStorage.getItem('saphira.muted') === '1';
  } catch (e) { /* storage unavailable */ }

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const MUSIC = {
    title: {
      dur: 0.58,
      len: 32,
      melody: [76, null, null, 79, null, 76, null, 72, 74, null, null, 77, null, 74, null, 71,
               72, null, null, 76, null, 72, null, 69, 71, null, 74, null, 79, null, 76, null],
      bass: [45, null, null, null, null, null, null, null, 41, null, null, null, null, null, null, null,
             43, null, null, null, null, null, null, null, 40, null, null, null, null, null, null, null],
      pad: [57, 60, 64]
    },
    forest: {
      dur: 0.46,
      len: 32,
      melody: [79, null, 76, null, null, 72, null, null, 74, null, 77, null, null, 81, null, null,
               76, null, 72, null, null, 69, null, null, 71, null, 74, null, 79, null, 76, null],
      bass: [45, null, null, null, null, null, 52, null, 41, null, null, null, null, null, 48, null,
             43, null, null, null, null, null, 50, null, 40, null, null, null, null, null, 47, null],
      pad: [57, 60, 64]
    },
    prison: {
      dur: 0.72,
      len: 16,
      melody: [null, null, 64, null, null, 63, null, null, null, 59, null, null, null, null, 62, null],
      bass: [33, null, null, null, 33, null, null, null, 31, null, null, null, 28, null, null, null],
      pad: [45, 48, 52]
    },
    battle: {
      dur: 0.235,
      len: 16,
      melody: [69, null, 72, 76, null, 72, 74, null, 69, null, 72, 79, null, 76, 74, null],
      bass: [33, null, 33, null, 36, null, 31, null, 33, null, 33, null, 36, null, 31, null],
      pad: [57, 60, 64]
    },
    ending: {
      dur: 0.52,
      len: 24,
      melody: [76, null, 79, null, 84, null, 83, null, 81, null, 79, null, 76, null, 79, null, 81, null, 84, null, 88, null, 86, null],
      bass: [45, null, null, null, 41, null, null, null, 43, null, null, null, 40, null, null, null, 45, null, null, null, 48, null, null, null],
      pad: [57, 60, 64]
    }
  };

  function makeNoise() {
    if (!ctx) return null;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = white * 0.65 + last * 3.2;
    }
    return buffer;
  }

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.42;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.34;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.85;
    sfxBus.connect(master);
    noiseBuffer = makeNoise();
    if (!timer) timer = setInterval(tick, 120);
  }

  function unlock() {
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, time, dur, type = 'sine', vol = 0.2, bus = musicBus, glide = null) {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), time);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glide), time + dur);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), time + Math.min(0.035, dur * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(time);
    osc.stop(time + dur + 0.06);
  }

  function noise(time, dur, vol = 0.1, filterFreq = 1200, bus = sfxBus, type = 'bandpass') {
    if (!ctx || !noiseBuffer || !bus) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFreq, time);
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  function scheduleMusic(m, s, t) {
    const pattern = MUSIC[m];
    if (!pattern) return;
    const note = pattern.melody[s];
    const bass = pattern.bass[s];
    if (note != null) {
      if (m === 'battle') {
        tone(midi(note), t, 0.17, 'triangle', 0.10);
        tone(midi(note + 12), t, 0.09, 'sine', 0.025);
      } else if (m === 'prison') {
        tone(midi(note), t, 0.52, 'sine', 0.07);
        tone(midi(note + 12), t + 0.02, 0.2, 'triangle', 0.015);
      } else {
        tone(midi(note), t, 0.72, 'triangle', 0.07);
        tone(midi(note + 12), t + 0.015, 0.25, 'sine', 0.016);
      }
    }
    if (bass != null) {
      tone(midi(bass), t, m === 'battle' ? 0.14 : 0.9, m === 'battle' ? 'square' : 'sine', m === 'battle' ? 0.05 : 0.09);
    }
    if (s === 0 && pattern.pad) {
      pattern.pad.forEach((p, i) => tone(midi(p), t + i * 0.015, pattern.dur * 6, 'sine', 0.012));
    }
    if (m === 'battle' && s % 4 === 0) noise(t, 0.045, 0.035, 1800, musicBus, 'highpass');
    if (m === 'prison' && s === 8) noise(t, 0.3, 0.023, 520, musicBus, 'bandpass');
  }

  function tick() {
    if (!ctx || muted || mode === 'none') return;
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (nextTime < now) nextTime = now + 0.04;
    let guard = 0;
    while (nextTime < now + 0.32 && guard++ < 8) {
      const pattern = MUSIC[mode];
      if (!pattern) break;
      scheduleMusic(mode, step % pattern.len, nextTime);
      step = (step + 1) % pattern.len;
      nextTime += pattern.dur;
    }
  }

  function setMode(next) {
    mode = next || 'none';
    step = 0;
    if (ctx) nextTime = ctx.currentTime + 0.06;
  }

  function setMuted(value) {
    muted = !!value;
    try { localStorage.setItem('saphira.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : 0.42, ctx.currentTime, 0.04);
    }
  }

  function toggleMute() {
    setMuted(!muted);
    if (!muted) {
      unlock();
      if (mode !== 'none') setMode(mode);
    }
    return muted;
  }

  const FX = {
    ui() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(880, t, 0.05, 'triangle', 0.07, sfxBus);
    },
    select() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(523, t, 0.06, 'triangle', 0.08, sfxBus);
      tone(784, t + 0.05, 0.09, 'triangle', 0.06, sfxBus);
    },
    swing() {
      if (!ctx) return;
      const t = ctx.currentTime;
      noise(t, 0.16, 0.13, 2200, sfxBus, 'highpass');
      tone(420, t, 0.13, 'sawtooth', 0.045, sfxBus, 140);
    },
    hit() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(160, t, 0.14, 'square', 0.12, sfxBus, 55);
      noise(t, 0.12, 0.16, 900, sfxBus, 'lowpass');
    },
    crit() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(640, t, 0.09, 'square', 0.08, sfxBus, 240);
      tone(130, t + 0.03, 0.22, 'sawtooth', 0.13, sfxBus, 48);
      noise(t, 0.2, 0.17, 1600, sfxBus, 'bandpass');
    },
    miss() {
      if (!ctx) return;
      const t = ctx.currentTime;
      noise(t, 0.18, 0.08, 3600, sfxBus, 'highpass');
      tone(260, t, 0.14, 'sine', 0.04, sfxBus, 180);
    },
    heal() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.35, 'sine', 0.07, sfxBus));
    },
    guard() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(220, t, 0.25, 'triangle', 0.09, sfxBus);
      tone(330, t, 0.3, 'sine', 0.05, sfxBus);
      noise(t, 0.1, 0.06, 3000, sfxBus, 'bandpass');
    },
    potion() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [392, 523, 784].forEach((f, i) => tone(f, t + i * 0.08, 0.3, 'sine', 0.06, sfxBus));
      noise(t, 0.15, 0.04, 800, sfxBus, 'bandpass');
    },
    fail() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(220, t, 0.18, 'triangle', 0.09, sfxBus, 196);
      tone(165, t + 0.16, 0.3, 'triangle', 0.08, sfxBus, 110);
    },
    success() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [523, 659, 880].forEach((f, i) => tone(f, t + i * 0.08, 0.32, 'triangle', 0.075, sfxBus));
    },
    pickup() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(784, t, 0.08, 'sine', 0.06, sfxBus);
      tone(1175, t + 0.07, 0.16, 'sine', 0.05, sfxBus);
    },
    alert() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(880, t, 0.1, 'square', 0.07, sfxBus);
      tone(880, t + 0.16, 0.16, 'square', 0.07, sfxBus);
    },
    capture() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(180, t, 1.4, 'sawtooth', 0.1, sfxBus, 34);
      tone(90, t + 0.1, 1.5, 'sine', 0.09, sfxBus, 27);
      noise(t, 1.0, 0.06, 300, sfxBus, 'lowpass');
    },
    battleStart() {
      if (!ctx) return;
      const t = ctx.currentTime;
      tone(110, t, 0.32, 'sawtooth', 0.08, sfxBus, 220);
      noise(t, 0.3, 0.08, 700, sfxBus, 'bandpass');
      tone(220, t + 0.18, 0.4, 'triangle', 0.07, sfxBus);
    },
    victory() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.55, 'triangle', 0.08, sfxBus));
      tone(261, t, 1.0, 'sine', 0.06, sfxBus);
    },
    levelup() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [659, 784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.5, 'sine', 0.07, sfxBus));
    },
    step() {
      if (!ctx) return;
      const t = ctx.currentTime;
      noise(t, 0.035, 0.018, 700, sfxBus, 'lowpass');
    }
  };

  function sfx(name) {
    if (muted) return;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const fn = FX[name];
    if (fn) fn();
  }

  return {
    unlock,
    setMode,
    sfx,
    toggleMute,
    setMuted,
    isMuted: () => muted,
    getMode: () => mode
  };
})();
