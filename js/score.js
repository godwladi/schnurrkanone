'use strict';
// ---------------------------------------------------------------------------
// Adaptive Partitur (MOONSHOT.md, Säule 2): die Spielmusik folgt dem Kampf.
// Über die Biom-Musik (audio2.js) legen sich Schichten, je nach Lage:
//   Combo ab 20  → Bläser-Stöße auf der Zwei und Vier (Akkord des Takts)
//   Raserei      → volle Band: Walking Bass in Vierteln, Bläser auch auf den Achteln
//   Groove       → das Saxophon improvisiert über die Akkorde (groove.js)
//   wenig Leben  → gedämpfter Klang (Tiefpass) mit Herzschlag-Bass
//   Vernichtungsschlag lädt → Crescendo: steigender Ton und Trommelwirbel
// Alles im Raster des Musik-Schedulers, damit es im Takt bleibt.
// ---------------------------------------------------------------------------

const Score = {
  saxBus: null, last: 72, muffle: 0,

  // eigener Kanal fürs Saxophon (Jazz.sax ist für den leiseren Titel abgemischt)
  bus() {
    if (!this.saxBus && Music.gain) {
      this.saxBus = SFX.ctx.createGain(); this.saxBus.gain.value = 3.2;
      this.saxBus.connect(Music.gain);
    }
    return this.saxBus;
  },
  sax(f, t, dur, from) { const b = this.bus(); if (b) Jazz.sax.call({ room: b }, f, t, dur, from); },

  lowHp() { return (Run.active || Battle.bossState === 'active') && Vitals.frac() < 0.35 && Vitals.ref().hp > 0; },
  charge() { return Battle.bossObj && Vitals.charging(Battle) ? 1 - U.clamp(Battle.bossTimer / ULT_WARN, 0, 1) : -1; },

  layer(s, step, t) {
    const B = Battle, st = step % 16, bar = Math.floor(step / 16) % 4;
    const [off, minor] = s.prog[bar], root = s.root + off, beat = 60 / s.tempo;
    const third = minor ? 3 : 4, chord = [0, third, 7, minor ? 10 : 11];
    const frenzy = B.frenzy > 0, brass = frenzy || B.combo >= 20;

    // Bläser: kurze Akkord-Stöße (Sägezahn + Rechteck eine Oktave tiefer)
    if (brass && (st === 4 || st === 12 || (frenzy && (st === 6 || st === 14)))) {
      const v = st % 8 === 4 ? 0.05 : 0.035;
      for (const iv of [chord[1], chord[2], chord[3]]) {
        Music.voice('sawtooth', Music.note(root + iv + 12), t, beat * 0.22, v, 0.012);
        Music.voice('square', Music.note(root + iv), t, beat * 0.22, v * 0.5, 0.012);
      }
    }
    // Raserei: Walking Bass auf jeder Viertel (Grundton, Terz, Quinte, Durchgangston)
    if (frenzy && st % 4 === 0) {
      const walk = [0, third, 7, st === 12 ? 11 : 9][st / 4];
      Music.voice('triangle', Music.note(root + walk - 24), t, beat * 0.9, 0.42);
    }
    // Groove: Saxophon-Improvisation, Akkordtöne mit Durchgängen, Achtel im Swing
    if (Groove.timeT > 0.6 && st % 2 === 0 && Math.random() < (st % 4 === 0 ? 0.8 : 0.5)) {
      const pool = chord.concat([chord[2] + 2, 12, 12 + third]).map(i => root + 12 + i);
      let n = pool.reduce((a, b) => Math.abs(b - this.last) < Math.abs(a - this.last) && b !== this.last ? b : a, pool[0]);
      if (Math.random() < 0.45) n = U.pick(pool);
      const swing = st % 4 === 2 ? beat * 0.08 : 0, len = beat * (Math.random() < 0.25 ? 0.95 : 0.45);
      this.sax(Music.note(n), t + swing, len, Music.note(this.last));
      this.last = n;
    }
    // Wenig Leben: Herzschlag (lub-dub) auf jedem Takt
    if (this.lowHp() && (st === 0 || st === 3)) Music.drum('kick', t, st ? 0.45 : 0.65);
    // Vernichtungsschlag lädt: steigender Ton auf jeder Achtel, am Ende Trommelwirbel
    const k = this.charge();
    if (k >= 0) {
      if (st % 2 === 0) Music.voice('sawtooth', Music.note(s.root - 12 + Math.round(k * 12)), t, beat * 0.5, 0.04 + k * 0.06, 0.05);
      if (k > 0.55) Music.drum('snare', t, 0.08 + k * 0.14);
    }
  },

  // Klangfarbe nachführen: bei wenig Leben dumpf, sonst offen
  tone() {
    if (!Music.filter) return;
    const want = this.lowHp() ? 1 : 0;
    if (want === this.muffle) return;
    this.muffle = want;
    Music.filter.frequency.setTargetAtTime(want ? 850 : 3200, SFX.ctx.currentTime, 0.35);
  },
};

const _sStep = Music.playStep;
Music.playStep = function (s, step, t) {
  _sStep.call(this, s, step, t);
  if (this.on) Score.layer(s, step, t);
};
const _sSched = Music.schedule;
Music.schedule = function () { Score.tone(); return _sSched.call(this); };

// Groove-Lick über den lauteren Saxophon-Kanal
Groove.lick = (function (orig) {
  return function () {
    const j = Jazz.sax;
    Jazz.sax = function (f, t, dur, from) { Score.sax(f, t, dur, from); };
    try { orig.call(this); } finally { Jazz.sax = j; }
  };
})(Groove.lick);

// Alles wippt im Takt: Katze und Gegner federn auf jedem Schlag kurz (nur Zeichnung,
// Trefferflächen bleiben). Dezent im Normalfall, kräftiger bei Groove, Raserei und Combo 20+.
Score.bob = function () {
  if (!Groove.live() || Groove.pulse <= 0.01) return 0;
  const B = Battle, loud = Groove.timeT > 0 || B.frenzy > 0 || B.combo >= 20;
  const p = Groove.pulse * Groove.pulse;
  return p * (loud ? 0.06 : 0.025);
};
Score.squash = function (ctx, x, y, k) {
  ctx.translate(x, y); ctx.scale(1 + k * 0.5, 1 - k); ctx.translate(-x, -y);
};
const _sCat = Draw.cat;
Draw.cat = function (ctx, x, y, s, cat, t, opt = {}) {
  const k = opt.lamp != null ? Score.bob() : 0;
  if (!k) return _sCat.call(this, ctx, x, y, s, cat, t, opt);
  ctx.save(); Score.squash(ctx, x, y, k);
  try { return _sCat.call(this, ctx, x, y, s, cat, t, opt); } finally { ctx.restore(); }
};
const _sObst = Draw.obstacle;
Draw.obstacle = function (ctx, o, biome, t) {
  const k = o.dead || o.dying > 0 ? 0 : Score.bob() * (o.boss ? 0.6 : 1);
  if (!k) return _sObst.call(this, ctx, o, biome, t);
  ctx.save(); Score.squash(ctx, o.x, o.y, k);
  try { return _sObst.call(this, ctx, o, biome, t); } finally { ctx.restore(); }
};
