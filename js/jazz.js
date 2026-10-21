'use strict';
// ---------------------------------------------------------------------------
// Titelmusik: Old-School-Jazz im Swing, komplett mit WebAudio erzeugt.
//   Walking Bass (Viertel, Annäherung an den nächsten Grundton), Ride-Becken
//   „ding – ding-da – ding“, Charlston-Akkorde am Klavier und ein Altsaxophon
//   (Sägezahn durch Formantfilter, Vibrato, Atemgeräusch, Gleiten zwischen Tönen).
// 16 Takte in F: | F | D7 | Gm7 | C7 | Am7 | D7 | Gm7 | C7 | F7 | B♭ | B♭m7 | E♭7 | Am7 | D7 | Gm7 | C7 |
// Raster: 12 Triolen-Achtel je Takt; Swing-Achtel liegen auf 0 und 2 jedes Schlags.
// ---------------------------------------------------------------------------

const JAZZ_CHORDS = [
  [65, 'maj'], [62, 'dom'], [67, 'min'], [60, 'dom'], [69, 'min'], [62, 'dom'], [67, 'min'], [60, 'dom'],
  [65, 'dom'], [70, 'maj'], [70, 'min'], [63, 'dom'], [69, 'min'], [62, 'dom'], [67, 'min'], [60, 'dom'],
];
const JAZZ_TONES = { maj: [0, 4, 7, 11, 14], dom: [0, 4, 7, 10, 14], min: [0, 3, 7, 10, 14] };
const JAZZ_VOICING = { maj: [4, 7, 11, 14], dom: [4, 10, 14, 21], min: [3, 7, 10, 14] }; // ohne Grundton
const JAZZ_COMP = [[0, 5], [2, 8], [5, 11], [3, 9], [0, 8], [5, 9]];
// Erkennungsmotiv (Takt 1–2 und 9–10): [Raster-Position ab Phrasenbeginn, Länge, Ton]
const JAZZ_HOOK = [[0, 2, 72], [2, 1, 69], [3, 2, 72], [5, 1, 74], [6, 5, 76], [12, 2, 74], [14, 1, 72], [15, 2, 69], [17, 1, 67], [18, 6, 69]];

const Jazz = {
  tempo: 132, gain: null, timer: null, step: 0, nextTime: 0, playing: false, lastSax: 72,
  phrase: [],

  start() {
    const c = SFX.ctx;
    if (!c) return;
    if (!this.gain) {
      this.gain = c.createGain(); this.gain.gain.value = 0;
      this.room = c.createBiquadFilter(); this.room.type = 'lowpass'; this.room.frequency.value = 5200;
      this.room.connect(this.gain); this.gain.connect(c.destination);
    }
    this.playing = true;
    this.apply();
    if (this.timer) return;
    this.step = 0; this.nextTime = c.currentTime + 0.12;
    this.timer = setInterval(() => this.schedule(), 25);
  },
  stop(fade = 0.8) {
    this.playing = false;
    if (this.gain) this.gain.gain.setTargetAtTime(0, SFX.ctx.currentTime, fade / 3);
    setTimeout(() => { if (!this.playing) { clearInterval(this.timer); this.timer = null; } }, fade * 1000 + 200);
  },
  apply() { if (this.gain) this.gain.gain.setTargetAtTime(this.playing && S.music ? 0.32 * (S.musicVol ?? 0.5) : 0, SFX.ctx.currentTime, 0.3); },

  schedule() {
    const c = SFX.ctx;
    if (!c || c.state !== 'running') return;
    if (this.nextTime < c.currentTime - 0.5) this.nextTime = c.currentTime + 0.05;
    const dt = 60 / this.tempo / 3;
    while (this.nextTime < c.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime, dt);
      this.nextTime += dt;
      this.step = (this.step + 1) % (12 * 16);
    }
  },
  note: m => 440 * Math.pow(2, (m - 69) / 12),

  playStep(step, t, dt) {
    const bar = Math.floor(step / 12), pos = step % 12;
    const [root, q] = JAZZ_CHORDS[bar], [nRoot] = JAZZ_CHORDS[(bar + 1) % 16];
    const beat = dt * 3;
    // Bass: Viertel – Grundton, Akkordton, Akkordton, chromatische Annäherung
    if (pos % 3 === 0) {
      const b = pos / 3, low = r => 36 + ((r - 36) % 12 + 12) % 12;
      const tones = JAZZ_TONES[q];
      const m = b === 0 ? low(root) : b === 3 ? low(nRoot) + (Math.random() < 0.5 ? 1 : -1) : low(root) + tones[b === 1 ? U.pick([1, 2]) : U.pick([2, 3])];
      this.bass(this.note(m), t, beat * 0.95);
    }
    // Schlagzeug: Ride mit Swing, Hi-Hat-Fuß auf 2 und 4, leiser Besen
    if ([0, 3, 5, 6, 9, 11].includes(pos)) this.ride(t, pos === 5 || pos === 11 ? 0.035 : 0.06);
    if (pos === 3 || pos === 9) { this.hat(t, 0.08); if (Math.random() < 0.5) this.brush(t, 0.05); }
    if (pos === 11 && Math.random() < 0.25) this.brush(t, 0.08);
    // Klavier: Charleston-Muster je Takt
    if (pos === 0) this.compPat = U.pick(JAZZ_COMP);
    if (this.compPat && this.compPat.includes(pos)) this.piano(root, q, t, pos % 3 === 2 ? beat * 0.5 : beat * 0.85);
    // Saxophon: Phrasen über je 2 Takte, dazwischen Pausen (Frage – Antwort)
    if (step % 24 === 0) this.planPhrase(bar, step);
    for (const n of this.phrase) if (n.at === step) this.sax(this.note(n.m), t, n.len * dt, n.prev ? this.note(n.prev) : null);
  },

  planPhrase(bar, step) {
    this.phrase = [];
    const block = Math.floor(bar / 2) % 8;
    if (block === 0 || block === 4) { // Erkennungsmotiv
      let prev = this.lastSax;
      for (const [p, len, m] of JAZZ_HOOK) { this.phrase.push({ at: step + p, len, m: block === 4 ? m - 2 : m, prev }); prev = m; }
      this.lastSax = prev;
      return;
    }
    if (block % 2 === 1 && Math.random() < 0.7) return; // Atempause, das Klavier antwortet
    let m = this.lastSax, p = U.pick([0, 2, 3]);
    while (p < 22) {
      const b = bar + (p >= 12 ? 1 : 0), [root, q] = JAZZ_CHORDS[b % 16];
      const onBeat = p % 3 === 0;
      const tones = JAZZ_TONES[q].map(x => root + x).flatMap(x => [x, x + 12, x - 12]).filter(x => x >= 62 && x <= 81);
      let next;
      if (onBeat || Math.random() < 0.4) next = tones.sort((a, c) => Math.abs(a - m) - Math.abs(c - m))[U.randi(0, 2)];
      else next = m + U.pick([-2, -1, 1, 2, -3]);
      next = U.clamp(next, 62, 81);
      const len = p >= 18 ? 22 - p + U.randi(0, 2) : U.pick([1, 2, 2, 3]);
      this.phrase.push({ at: step + p, len, m: next, prev: m });
      m = next;
      p += len === 1 ? (p % 3 === 2 ? 1 : 2) : len;
      if (Math.random() < 0.12) p += 3; // kurze Luftpause in der Phrase
    }
    this.lastSax = m;
  },

  // ---------------------------------------------------------------- Instrumente
  bass(f, t, dur) {
    const c = SFX.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f / 2;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(380, t + 0.18);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.room);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  },
  ride(t, vol) {
    const c = SFX.ctx, g = c.createGain(), hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 5200;
    for (const f of [5200, 7300, 8900]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f + U.rand(-30, 30); o.connect(hp); o.start(t); o.stop(t + 0.5); }
    const n = c.createBufferSource(); n.buffer = SFX.noiseBuf; n.connect(hp); n.start(t); n.stop(t + 0.5);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(vol * 0.25, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    hp.connect(g); g.connect(this.room);
  },
  hat(t, vol) {
    const c = SFX.ctx, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = SFX.noiseBuf; f.type = 'highpass'; f.frequency.value = 8000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    n.connect(f); f.connect(g); g.connect(this.room); n.start(t); n.stop(t + 0.07);
  },
  brush(t, vol) {
    const c = SFX.ctx, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = SFX.noiseBuf; f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    n.connect(f); f.connect(g); g.connect(this.room); n.start(t); n.stop(t + 0.25);
  },
  piano(root, q, t, dur) {
    const c = SFX.ctx, base = 52 + ((root - 52) % 12 + 12) % 12;
    for (const iv of JAZZ_VOICING[q]) {
      const f = this.note(base + iv), o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.002;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.008); g.gain.exponentialRampToValueAtTime(0.012, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
      o.connect(g); o2.connect(g); g.connect(this.room);
      o.start(t); o2.start(t); o.stop(t + dur + 0.3); o2.stop(t + dur + 0.3);
    }
  },
  // Altsaxophon: Sägezahn → Tiefpass mit Anblas-Hüllkurve → zwei Formanten, Vibrato und Atem
  sax(f, t, dur, from) {
    const c = SFX.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain();
    const vib = c.createOscillator(), vg = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(from || f * 0.97, t); // vom letzten Ton herübergleiten bzw. leicht von unten ansetzen
    o.frequency.exponentialRampToValueAtTime(f, t + (from ? 0.045 : 0.06));
    vib.frequency.value = 5.4; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(dur > 0.4 ? f * 0.012 : f * 0.004, t + Math.min(dur, 0.5));
    vib.connect(vg); vg.connect(o.frequency);
    lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(3200, t + 0.06); lp.frequency.exponentialRampToValueAtTime(2000, t + Math.max(0.1, dur));
    f1.type = 'peaking'; f1.frequency.value = 1150; f1.Q.value = 1.4; f1.gain.value = 9;
    f2.type = 'peaking'; f2.frequency.value = 2600; f2.Q.value = 2; f2.gain.value = 5;
    const end = t + dur;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.055, t + 0.035); g.gain.setValueAtTime(0.05, Math.max(t + 0.04, end - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.08);
    o.connect(lp); lp.connect(f1); f1.connect(f2); f2.connect(g); g.connect(this.room);
    // Atem am Tonanfang
    const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = SFX.noiseBuf; nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 1;
    ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.02, t + 0.02); ng.gain.exponentialRampToValueAtTime(0.004, t + 0.12); ng.gain.exponentialRampToValueAtTime(0.0001, end + 0.05);
    n.connect(nf); nf.connect(ng); ng.connect(this.room);
    o.start(t); vib.start(t); n.start(t);
    o.stop(end + 0.1); vib.stop(end + 0.1); n.stop(end + 0.1);
  },
};

// Spielmusik schweigt (und rechnet nicht), solange der Titel läuft
const _jSched = Music.schedule;
Music.schedule = function () { if (typeof Title !== 'undefined' && Title.open) return; _jSched.call(this); };
const _jApply = Music.apply;
Music.apply = function () {
  if (!this.gain) return;
  if (typeof Title !== 'undefined' && Title.open) { this.gain.gain.setTargetAtTime(0, SFX.ctx.currentTime, 0.2); return; }
  _jApply.call(this);
};
