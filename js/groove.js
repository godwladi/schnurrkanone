'use strict';
// ---------------------------------------------------------------------------
// Groove-Engine v1 (MOONSHOT.md, Säule 1): der Kampf läuft im Takt der Spielmusik.
// Beat-Uhr: Music.playStep merkt sich die Audio-Zeit jeder Viertel. Pfotenhiebe
// auf dem hörbaren Schlag (±90 ms, „Perfekt“ ±40 ms) sind „Im Takt!“: ×2/×3
// Pfotenschaden, +1 Schnurr-Meter, Noten steigen auf. 8 in Folge zünden den Groove:
// 8 s lang +25 % Schaden, die Band spielt ein Saxophon-Lick, goldener Takt-Ring.
// Unter der Katze pulsiert ein Ring auf jedem Schlag. Nur aktiv, solange Musik läuft;
// daneben getippt reißt nur die Serie, sonst passiert nichts.
// ---------------------------------------------------------------------------

const Groove = {
  beats: [], streak: 0, best: 0, timeT: 0, pulse: 0, lastBeat: 0, mult: 1,
  WIN: 0.09, PERFECT: 0.04, NEED: 8, DUR: 8,

  live() { return Music.on && SFX.ctx && SFX.ctx.state === 'running' && !(typeof Title !== 'undefined' && Title.open); },
  // Audio-Zeit, die gerade aus dem Lautsprecher kommt
  heard() { const c = SFX.ctx; return c.currentTime - (c.outputLatency || 0) - (c.baseLatency || 0); },
  // Abstand (s) zum nächsten gemerkten Schlag, Infinity ohne Beat-Uhr
  offset() {
    if (!this.live()) return Infinity;
    const now = this.heard();
    let best = Infinity;
    for (const b of this.beats) if (Math.abs(now - b) < Math.abs(best)) best = now - b;
    return best;
  },
  onStep(step, t, tempo) {
    if (step % 4) return;
    this.beats.push(t);
    if (this.beats.length > 8) this.beats.shift();
    this.beatLen = 60 / tempo;
  },

  // aus Battle.paw (nur echte Hiebe): Takt werten
  judge(B, x, y) {
    const off = Math.abs(this.offset());
    if (off > this.WIN) { if (off !== Infinity && this.streak >= 3) B.text(x, y - 30 * B.cs, 'aus dem Takt', '#b9a3ff', 12 * B.cs); this.streak = 0; return 1; }
    const perfect = off <= this.PERFECT;
    this.streak++;
    S.stats.grooveBest = Math.max(S.stats.grooveBest || 0, this.streak);
    B.purr = Math.min(100, B.purr + 1);
    B.text(x, y - 34 * B.cs, (perfect ? 'Perfekt! ' : 'Im Takt! ') + '×' + this.streak, perfect ? '#ffd34d' : '#9fdcff', (perfect ? 16 : 14) * B.cs, perfect);
    for (let i = 0; i < (perfect ? 3 : 2); i++) B.parts.push({ x: x + U.rand(-14, 14), y, vx: U.rand(-25, 25), vy: U.rand(-110, -70), life: 1, max: 1, size: 18 * B.cs, emoji: U.pick(['♪', '♫']), grav: 0 });
    FX.addRing(x, y, 46 * B.cs, perfect ? '#ffd34d' : '#9fdcff', 0.3, 3);
    if (typeof Hints !== 'undefined') Hints.once('groove', 'Im Takt!', 'Pfotenhiebe genau auf dem Schlag der Musik machen mehr Schaden. 8 in Folge zünden den Groove.', 'music');
    if (this.streak % this.NEED === 0) this.ignite(B);
    return perfect ? 3 : 2;
  },
  ignite(B) {
    const fresh = this.timeT <= 0;
    this.timeT = this.DUR;
    B.showBanner('GROOVE!', '+25 % Schaden, solange die Band spielt', '#ffd34d');
    FX.addRing(B.catX, B.groundY - 30 * B.cs, 260, '#ffd34d', 0.6, 8);
    if (fresh) this.lick();
  },
  // kurzes Saxophon-Lick über die Spielmusik, im Takt ab dem nächsten Schlag
  lick() {
    if (!Music.gain || typeof Jazz === 'undefined') return;
    const s = Music.song(), beat = 60 / s.tempo;
    const next = this.beats.length ? this.beats[this.beats.length - 1] : SFX.ctx.currentTime + 0.05;
    let t = next; while (t < SFX.ctx.currentTime + 0.03) t += beat;
    const root = s.root + 12, out = { room: Music.gain };
    let from = 0;
    for (const [at, len, iv] of [[0, 0.5, 0], [0.5, 0.5, 3], [1, 0.5, 5], [1.5, 0.5, 7], [2, 1.5, 10], [3.5, 1, 12]]) {
      const f = Music.note(root + iv);
      Jazz.sax.call(out, f, t + at * beat, len * beat * 0.92, from);
      from = f;
    }
  },
  dmgMul() { return this.timeT > 0 ? 1.25 : 1; },

  update(dt) {
    if (this.timeT > 0) this.timeT = Math.max(0, this.timeT - dt);
    if (!this.live()) { this.pulse = 0; return; }
    const now = this.heard();
    for (const b of this.beats) if (b <= now && b > this.lastBeat) { this.lastBeat = b; this.pulse = 1; }
    this.pulse = Math.max(0, this.pulse - dt * 4);
  },
  // Takt-Ring am Boden unter der Hauptkatze (Welt-Koordinaten, folgt dem Spiegelkabinett)
  drawRing(ctx, x, y, s) {
    if (!this.live() || this.pulse <= 0.01) return;
    const g = this.timeT > 0, k = this.pulse;
    ctx.save();
    ctx.globalAlpha = (g ? 0.55 : 0.28) * k;
    ctx.strokeStyle = g ? '#ffd34d' : '#ffffff';
    ctx.lineWidth = (g ? 4 : 2.5) * s;
    ctx.beginPath();
    ctx.ellipse(x, y + 2 * s, (30 + (1 - k) * 22) * s, (7 + (1 - k) * 5) * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },
};

// ---------------------------------------------------------------- Einhängen
const _gStep = Music.playStep;
Music.playStep = function (s, step, t) { Groove.onStep(step, t, s.tempo); return _gStep.call(this, s, step, t); };

const _gUpdate = Battle.update;
Battle.update = function (dt) { _gUpdate.call(this, dt); Groove.update(dt); };

// Pfotenschaden im Takt: Faktor nur für die Dauer dieses Hiebs
const _gPaw = Battle.paw;
Battle.paw = function (x, y) {
  const clicks = S.stats.clicks;
  const before = this.parts.length;
  _gPaw.call(this, x, y);
  // Nur echte Hiebe werten (nicht Parade, Ballon, Katze streicheln, Gelähmt …): die zählen keinen Klick
  const p = this.parts.slice(before).find(q => q.emoji === '🐾');
  if (S.stats.clicks === clicks || !p) return;
  const m = Groove.judge(this, p.x, p.y);
  if (m > 1 && Groove.lastHit && !Groove.lastHit.dead) this.damage(Groove.lastHit, R.clickDmg * (this.frenzy > 0 ? 3 : 1) * (m - 1), false, true, 'paw');
};
// Ziel des letzten Pfotenhiebs merken (für den Takt-Bonus)
const _gDamage = Battle.damage;
Battle.damage = function (o, amount, canCrit, quiet, src) {
  if (src === 'paw') Groove.lastHit = o;
  return _gDamage.call(this, o, amount * Groove.dmgMul(), canCrit, quiet, src);
};

const _gCat = Draw.cat;
Draw.cat = function (ctx, x, y, s, cat, t, opt = {}) {
  if (opt.lamp != null) Groove.drawRing(ctx, x, y, s);
  return _gCat.call(this, ctx, x, y, s, cat, t, opt);
};
