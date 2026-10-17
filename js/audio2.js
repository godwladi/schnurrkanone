'use strict';
// ---------------------------------------------------------------------------
// Skill-Sounds (Laser, Fischregen, Fauchen), Miauen, Schild & Combo,
// sowie prozedurale Chiptune-Musik pro Biom
// ---------------------------------------------------------------------------

Object.assign(SFX, {
  sfxVol: 0.7,
  setVolume(v) { this.sfxVol = v; if (this.master) this.master.gain.value = 0.5 * v; },

  noiseF(dur, vol, delay, freq, type, q = 1) {
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf; src.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  },

  // Aufladen (0,42 s) + brummender Strahl (3 s) mit Knistern
  laserSfx() {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.42);
    f.type = 'bandpass'; f.frequency.setValueAtTime(600, t); f.frequency.exponentialRampToValueAtTime(3000, t + 0.42); f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.38); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.47);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.5);

    const t1 = t + 0.42, dur = 3;
    const out = c.createGain(), lp = c.createBiquadFilter();
    out.gain.setValueAtTime(0.0001, t1); out.gain.exponentialRampToValueAtTime(0.16, t1 + 0.04);
    out.gain.setValueAtTime(0.16, t1 + dur - 0.3); out.gain.exponentialRampToValueAtTime(0.0001, t1 + dur);
    lp.type = 'lowpass'; lp.frequency.value = 2400;
    lp.connect(out); out.connect(this.master);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 14; lg.gain.value = 16; lfo.connect(lg);
    for (const [type, fr, v] of [['sawtooth', 110, 0.5], ['square', 221, 0.22], ['sawtooth', 332, 0.18]]) {
      const os = c.createOscillator(), og = c.createGain();
      os.type = type; os.frequency.value = fr; lg.connect(os.frequency);
      og.gain.value = v; os.connect(og); og.connect(lp);
      os.start(t1); os.stop(t1 + dur + 0.05);
    }
    lfo.start(t1); lfo.stop(t1 + dur + 0.05);
    this.noise(0.25, 0.18, 0.42, 3000);
    for (let i = 0; i < 16; i++) this.noiseF(0.04, 0.07, 0.5 + i * 0.17 + Math.random() * 0.08, 6000, 'highpass');
    this.tone(700, 0.4, 'sine', 0.07, -550, 0.42 + dur - 0.1);
  },

  // Platschen, fallende Tropfen, Münzregen
  rainSfx() {
    this.noiseF(0.7, 0.2, 0, 1500, 'lowpass');
    this.noiseF(0.5, 0.08, 0.05, 4000, 'bandpass', 2);
    for (let i = 0; i < 18; i++) {
      const d = 0.08 + Math.random() * 1.5, f = U.rand(450, 900);
      this.tone(f, 0.1, 'sine', 0.1, f * 1.3, d);
    }
    [1568, 1976, 2349, 3136].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.06, 0, 0.15 + i * 0.07));
    for (let i = 0; i < 12; i++) {
      const d = 0.4 + Math.random() * 1.3;
      this.tone(U.rand(1500, 2100), 0.06, 'sine', 0.045, 0, d);
      this.tone(U.rand(2300, 2900), 0.07, 'sine', 0.03, 0, d + 0.04);
    }
  },

  // Zischen (Bandpass-Rauschen) + Knurren mit Tremolo + Wumms
  roarSfx() {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf; src.loop = true;
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(2200, t); bp.frequency.linearRampToValueAtTime(5200, t + 0.7); bp.Q.value = 0.9;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.04);
    g.gain.setValueAtTime(0.45, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.9);

    const o = c.createOscillator(), trem = c.createOscillator(), tg = c.createGain(), og = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(100, t + 0.1); o.frequency.linearRampToValueAtTime(68, t + 1.1);
    trem.frequency.value = 27; tg.gain.value = 0.09; trem.connect(tg);
    og.gain.setValueAtTime(0.0001, t + 0.1); og.gain.exponentialRampToValueAtTime(0.16, t + 0.2); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    tg.connect(og.gain);
    lp.type = 'lowpass'; lp.frequency.value = 650;
    o.connect(lp); lp.connect(og); og.connect(this.master);
    o.start(t + 0.1); trem.start(t + 0.1); o.stop(t + 1.2); trem.stop(t + 1.2);
    this.noise(0.45, 0.2, 0, 260);
    this.tone(70, 0.5, 'sine', 0.25, -30);
  },

  // synthetisches Miauen: Sägezahn durch wandernden Formantfilter
  meow(p = 1) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(470 * p, t); o.frequency.linearRampToValueAtTime(800 * p, t + 0.16); o.frequency.linearRampToValueAtTime(540 * p, t + 0.5);
    f1.type = 'bandpass'; f1.Q.value = 5;
    f1.frequency.setValueAtTime(650, t); f1.frequency.linearRampToValueAtTime(1350, t + 0.16); f1.frequency.linearRampToValueAtTime(750, t + 0.5);
    f2.type = 'peaking'; f2.frequency.value = 2600; f2.gain.value = 8;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.05);
    g.gain.setValueAtTime(0.65, t + 0.32); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(f1); f1.connect(f2); f2.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.6);
  },
});

// zusätzliche Effekte in play() einklinken
const _play = SFX.play.bind(SFX);
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  switch (name) {
    case 'laser': return this.laserSfx();
    case 'rain': return this.rainSfx();
    case 'roar': return this.roarSfx();
    case 'meow': return this.meow(arg || 1);
    case 'shield':
      [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.07, f * 0.03, i * 0.05));
      this.tone(200, 0.5, 'triangle', 0.1, 250); return;
    case 'shieldHit': if (this.throttle(name, 80)) this.tone(U.rand(1900, 2500), 0.05, 'sine', 0.035); return;
    case 'shieldBreak':
      this.noiseF(0.5, 0.3, 0, 7000, 'highpass');
      for (let i = 0; i < 9; i++) this.tone(U.rand(2000, 5200), 0.16, 'triangle', 0.05, 0, i * 0.03);
      this.tone(160, 0.45, 'sawtooth', 0.12, -110); return;
    case 'combo': {
      const f = 523 * Math.pow(2, Math.min(24, arg || 0) / 12);
      this.tone(f, 0.09, 'square', 0.06); this.tone(f * 1.5, 0.12, 'triangle', 0.06, 0, 0.06); return;
    }
    case 'event': [1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.3, 'sine', 0.07, 0, i * 0.09)); return;
    case 'pop':
      this.tone(500, 0.12, 'sine', 0.2, 900); this.noiseF(0.1, 0.25, 0, 4000, 'highpass');
      [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.16, 'square', 0.05, 0, 0.08 + i * 0.06)); return;
  }
  return _play(name, arg);
};

// ---------------------------------------------------------------------------
// Musik: 4-Takt-Loops mit Bass, Arpeggio, Pad und Drums
// prog: [Grundton-Versatz, Moll?] je Takt
// ---------------------------------------------------------------------------
const SONGS = {
  tree:     { root: 60, tempo: 112, prog: [[0, 0], [7, 0], [9, 1], [5, 0]], boss: [[9, 1], [5, 0], [7, 0], [4, 1]], bass: [0, 6, 8, 14], arpEvery: 1, arpPat: [0, 1, 2, 3, 2, 1], arpWave: 'square', kick: [0, 8], snare: [4, 12], pad: true },
  cactus:   { root: 62, tempo: 100, prog: [[0, 1], [1, 0], [0, 1], [10, 0]], boss: [[0, 1], [1, 0], [3, 0], [1, 0]], bass: [0, 3, 8, 11], arpEvery: 2, arpPat: [0, 2, 1, 3], arpWave: 'triangle', kick: [0, 10], snare: [4, 12], pad: true },
  snowman:  { root: 64, tempo: 92,  prog: [[0, 0], [5, 0], [9, 1], [7, 0]], boss: [[9, 1], [5, 0], [0, 0], [7, 0]], bass: [0, 8], arpEvery: 1, arpPat: [0, 2, 3, 2], arpWave: 'sine', arpOct: 12, kick: [0], snare: [8], pad: true },
  lavarock: { root: 57, tempo: 128, prog: [[0, 1], [8, 0], [3, 0], [10, 0]], boss: [[0, 1], [1, 0], [0, 1], [11, 0]], bass: [0, 2, 4, 6, 8, 10, 12, 14], arpEvery: 2, arpPat: [0, 1, 2, 1], arpWave: 'sawtooth', kick: [0, 4, 8, 12], snare: [4, 12], pad: false },
  vending:  { root: 59, tempo: 118, prog: [[0, 1], [5, 1], [10, 0], [3, 0]], boss: [[0, 1], [8, 0], [10, 0], [7, 1]], bass: [0, 3, 6, 8, 11, 14], arpEvery: 1, arpPat: [0, 1, 2, 3, 2, 1, 0, 2], arpWave: 'sawtooth', kick: [0, 8], snare: [4, 12], pad: true },
  asteroid: { root: 55, tempo: 90,  prog: [[0, 0], [4, 1], [9, 1], [5, 0]], boss: [[0, 1], [3, 0], [8, 0], [7, 0]], bass: [0, 10], arpEvery: 2, arpPat: [0, 2, 3, 1], arpWave: 'sine', arpOct: 12, kick: [0], snare: [8], pad: true },
};

const Music = {
  on: true, vol: 0.5,
  gain: null, filter: null, timer: null, step: 0, nextTime: 0,

  start() {
    const c = SFX.ctx;
    if (!c || this.timer) return;
    this.gain = c.createGain();
    this.gain.gain.value = 0;
    this.filter = c.createBiquadFilter();
    this.filter.type = 'lowpass'; this.filter.frequency.value = 3200;
    this.filter.connect(this.gain); this.gain.connect(c.destination);
    this.nextTime = c.currentTime + 0.15;
    this.timer = setInterval(() => this.schedule(), 25);
    this.apply();
  },
  apply() {
    if (!this.gain) return;
    this.gain.gain.setTargetAtTime(this.on ? 0.18 * this.vol : 0, SFX.ctx.currentTime, 0.4);
  },
  song() {
    const base = SONGS[biomeFor(S.stage).obstacle];
    if (Battle.bossState === 'active') return { ...base, tempo: base.tempo * 1.15, prog: base.boss, isBoss: true };
    return base;
  },
  schedule() {
    const c = SFX.ctx;
    if (c.state !== 'running') return;
    if (this.nextTime < c.currentTime - 0.5) this.nextTime = c.currentTime + 0.05; // nach Pause/Tabwechsel
    while (this.nextTime < c.currentTime + 0.12) {
      const s = this.song();
      if (this.on) this.playStep(s, this.step, this.nextTime);
      this.nextTime += 60 / s.tempo / 4;
      this.step = (this.step + 1) % 64;
    }
  },
  note: m => 440 * Math.pow(2, (m - 69) / 12),
  voice(type, freq, t, dur, vol, attack = 0.005) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.filter);
    o.start(t); o.stop(t + dur + 0.02);
  },
  drum(kind, t, vol) {
    const c = SFX.ctx;
    if (kind === 'kick') {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.27);
      return;
    }
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = SFX.noiseBuf;
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const dur = kind === 'hat' ? 0.04 : 0.15;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.gain);
    src.start(t); src.stop(t + dur + 0.02);
  },
  playStep(s, step, t) {
    const bar = Math.floor(step / 16) % 4, st = step % 16;
    const [off, minor] = s.prog[bar];
    const root = s.root + off;
    const tones = [0, minor ? 3 : 4, 7, 12];
    const beat = 60 / s.tempo;
    if (s.bass.includes(st)) this.voice('triangle', this.note(root - 24), t, beat * 0.45, 0.55);
    if (st % s.arpEvery === 0) {
      const idx = s.arpPat[(st / s.arpEvery) % s.arpPat.length];
      this.voice(s.arpWave, this.note(root + tones[idx] + (s.arpOct || 0)), t, beat * 0.3, s.arpWave === 'sine' ? 0.18 : 0.08);
    }
    if (st === 0 && s.pad) for (const k of [0, 1, 2]) this.voice('sine', this.note(root + tones[k]), t, beat * 3.8, 0.05, 0.4);
    if (s.kick.includes(st) || (s.isBoss && st % 4 === 0)) this.drum('kick', t, 0.7);
    if (s.snare.includes(st)) this.drum('snare', t, 0.22);
    if (st % 2 === 0 || Battle.frenzy > 0) this.drum('hat', t, st % 4 === 2 ? 0.1 : 0.05);
  },
};

// Musik startet mit dem Audio-Kontext (erste Nutzer-Interaktion)
const _init = SFX.init.bind(SFX);
SFX.init = function () {
  _init();
  if (this.ctx) { this.setVolume(this.sfxVol); Music.start(); }
};
