'use strict';
// ---------------------------------------------------------------------------
// Hilfsfunktionen, Sound-Synthese (WebAudio) und Speichern
// ---------------------------------------------------------------------------

const U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: a => a[Math.floor(Math.random() * a.length)],
  lerp: (a, b, t) => a + (b - a) * t,
  roman(n) {
    const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of m) while (n >= v) { s += r; n -= v; }
    return s;
  },
  fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + U.fmt(-n);
    if (n < 1000) return (n < 10 && n % 1 !== 0) ? n.toFixed(1) : Math.floor(n).toString();
    const e = Math.floor(Math.log10(n) / 3);
    let suffix;
    if (e <= 4) suffix = ['K', 'M', 'B', 'T'][e - 1];
    else { const k = e - 5; suffix = String.fromCharCode(97 + Math.floor(k / 26) % 26) + String.fromCharCode(97 + k % 26); }
    const v = n / Math.pow(1000, e);
    return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)) + suffix;
  },
  fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) return `${h} h ${m} min`;
    return `${m}:${String(s).padStart(2, '0')}`;
  },
  today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
  weightedPick(items, wKey = 'w') {
    const total = items.reduce((s, i) => s + i[wKey], 0);
    let r = Math.random() * total;
    for (const it of items) { r -= it[wKey]; if (r <= 0) return it; }
    return items[items.length - 1];
  },
};

const SFX = {
  ctx: null, master: null, on: true, last: {}, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0) {
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, delay = 0, freq = 1200) {
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.noiseBuf;
    f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  },
  throttle(key, ms) {
    const n = performance.now();
    if (this.last[key] && n - this.last[key] < ms) return false;
    this.last[key] = n; return true;
  },
  play(name, arg) {
    if (!this.on || !this.ctx) return;
    switch (name) {
      case 'shoot':  if (this.throttle(name, 75)) this.tone(U.rand(520, 680), 0.05, 'square', 0.025, -300); break;
      case 'rocket': if (this.throttle(name, 120)) this.noise(0.25, 0.07, 0, 500); break;
      case 'hit':    if (this.throttle(name, 60)) this.noise(0.05, 0.05, 0, 2500); break;
      case 'crit':   if (this.throttle(name, 90)) this.tone(1200, 0.08, 'triangle', 0.08, 500); break;
      case 'kill':   if (this.throttle(name, 50)) { this.noise(0.18, 0.12, 0, 700); this.tone(200, 0.14, 'sawtooth', 0.05, -130); } break;
      case 'coin':   if (this.throttle(name, 40)) { const f = U.rand(1300, 1700); this.tone(f, 0.06, 'sine', 0.06); this.tone(f * 1.5, 0.08, 'sine', 0.045, 0, 0.04); } break;
      case 'paw':    if (this.throttle(name, 30)) this.tone(320, 0.07, 'triangle', 0.1, -170); break;
      case 'merge':  [523, 659, 784, 1047].forEach((f, i) => this.tone(f * (1 + (arg || 0) * 0.05), 0.13, 'triangle', 0.12, 0, i * 0.05)); break;
      case 'buy':    this.tone(660, 0.07, 'square', 0.06); this.tone(990, 0.09, 'square', 0.06, 0, 0.05); break;
      case 'error':  this.tone(150, 0.14, 'square', 0.07, -40); break;
      case 'boss':   this.tone(110, 0.7, 'sawtooth', 0.14, -50); this.tone(164, 0.7, 'sawtooth', 0.1, -60, 0.12); this.noise(0.6, 0.08, 0, 300); break;
      case 'victory':[392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'square', 0.08, 0, i * 0.075)); break;
      case 'fail':   [400, 300, 200].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, 0, i * 0.13)); break;
      case 'tick':   this.tone(1700, 0.025, 'square', 0.035); break;
      case 'frenzy': this.tone(200, 0.6, 'sawtooth', 0.09, 900); this.tone(300, 0.6, 'square', 0.05, 1200, 0.1); break;
      case 'laser':  this.tone(900, 1.2, 'sawtooth', 0.05, -500); break;
      case 'achievement': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.1, 0, i * 0.09)); break;
      case 'reveal': {
        const r = arg || 0;
        const base = [440, 523, 587, 659, 784][r];
        [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(base * m, 0.3 + r * 0.1, 'triangle', 0.1, 0, i * 0.07));
        if (r >= 3) [2, 2.5, 3].forEach((m, i) => this.tone(base * m, 0.4, 'sine', 0.07, 0, 0.35 + i * 0.08));
        break;
      }
    }
  },
};

const SAVE_KEY = 'schnurrkanone_save_v1';
const Save = {
  write() {
    S.lastSave = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* Speicher voll oder gesperrt */ }
  },
  read() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  },
  // füllt fehlende Felder eines geladenen Spielstands mit Standardwerten auf
  fill(def, obj) {
    if (obj === null || typeof obj !== 'object' || Array.isArray(def)) return obj === undefined ? def : obj;
    for (const k of Object.keys(def)) {
      if (!(k in obj)) obj[k] = def[k];
      else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) obj[k] = Save.fill(def[k], obj[k]);
    }
    return obj;
  },
  exportString() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); },
  importString(str) { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); },
};
