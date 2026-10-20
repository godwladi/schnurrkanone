'use strict';
// ---------------------------------------------------------------------------
// Auftritte und Kunststücke der Helfer:
//   Geisterkatzen  – erscheinen aus einem Geisterwirbel (wachsen, drehen sich ein,
//                    Funkenring), wackeln ab und zu mit den Ohren und lösen sich
//                    beim Abgang in einem Wirbel auf
//   Hauptkatze     – wackelt ab und zu mit den Ohren
//   Maus-Drohne    – fliegt mit einer Rolle ein, dreht ab und zu eine Pirouette
//   Goldfisch      – der Ballon bläst sich auf, der Fisch macht Saltos im Glas
//                    (immer, wenn er Münzen bringt, und zwischendurch)
//   Nachteule      – flattert herab und landet, breitet die Flügel aus
//                    (beim Feuerraten-Ruf und zwischendurch)
// Verschwindet ein Helfer, spielt ein Abgang: Drohne fliegt davon, Ballon platzt,
// Eule flattert weg, Geisterkatze verwirbelt.
// Reine Darstellung: Position, Schaden und Zeiten der Helfer bleiben unverändert.
// ---------------------------------------------------------------------------

const APPEAR_T = 0.9;     // Dauer des Auftritts
const TRICK_T = { mouse: 0.9, fish: 0.8, owl: 1.3 };
const EAR_T = 0.7;    // Ohrenwackeln
const LEAVE_T = 0.75; // Abgang

const Anim = {
  had: null,          // was beim letzten Bild schon da war (null = erstes Bild, kein Auftritt)
  appear: {},         // Schlüssel → Startzeit des Auftritts
  trick: {},          // Schlüssel → Startzeit des Kunststücks
  next: {},           // Schlüssel → Zeit des nächsten zufälligen Kunststücks
  ears: {},           // 'main' | 'ghost1..3' → Startzeit des Ohrenwackelns
  earNext: {},
  snap: {},           // letzter bekannter Zustand (Waffe der Geisterkatze) für den Abgang
  leaving: [],        // { k, t0, w, i }

  keys() {
    const out = [];
    for (let i = 1; i < 4; i++) if (S.slots[i]) out.push('ghost' + i);
    for (const id of ['mouse', 'fish', 'owl']) if (S.pets[id] > 0) out.push(id);
    return out;
  },

  update(B) {
    const now = B.t, cur = this.keys();
    if (this.had) {
      for (const k of cur) if (!this.had.has(k)) { this.leaving = this.leaving.filter(l => l.k !== k); this.start(B, k); }
      for (const k of this.had) if (!cur.includes(k)) this.leave(B, k);
    }
    this.had = new Set(cur);
    for (let i = 1; i < 4; i++) if (S.slots[i]) this.snap['ghost' + i] = S.slots[i];
    this.leaving = this.leaving.filter(l => now - l.t0 < LEAVE_T);
    // zufällige Kunststücke der Begleiter, Ohrenwackeln bei Katze und Geistern
    for (const k of cur) {
      if (this.appear[k] !== undefined && now - this.appear[k] < APPEAR_T) continue;
      if (k.startsWith('ghost') || Shades.isFrozen('pet:' + k)) continue;
      if (this.next[k] === undefined) this.next[k] = now + U.rand(4, 12);
      if (now >= this.next[k]) { this.doTrick(B, k); this.next[k] = now + U.rand(7, 15); }
    }
    for (const k of ['main'].concat(cur.filter(k => k.startsWith('ghost')))) {
      if (this.earNext[k] === undefined) this.earNext[k] = now + U.rand(3, 9);
      if (now >= this.earNext[k]) { this.ears[k] = now; this.earNext[k] = now + U.rand(5, 13); }
    }
  },

  start(B, k) {
    this.appear[k] = B.t;
    this.next[k] = B.t + U.rand(6, 12);
    const p = this.pos(B, k), cs = B.cs;
    if (!p) return;
    const col = k.startsWith('ghost') ? '#c9d6ff' : k === 'fish' ? '#ffd166' : k === 'owl' ? '#fde68a' : '#c7d2fe';
    FX.addRing(p.x, p.y, 70 * cs, col, 0.5, 6);
    FX.addRing(p.x, p.y, 36 * cs, '#ffffff', 0.35, 4);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      B.particle(p.x + Math.cos(a) * 40 * cs, p.y + Math.sin(a) * 40 * cs, -Math.sin(a) * 160 - Math.cos(a) * 60, Math.cos(a) * 160 - Math.sin(a) * 60, U.pick([col, '#ffffff']), 0.7, U.rand(4, 7) * cs, 0, false, 'star');
    }
    SFX.play('appear', k.startsWith('ghost') ? 0 : 1);
  },

  doTrick(B, k) { this.trick[k] = B.t; },

  leave(B, k) {
    const ghost = k.startsWith('ghost'), i = ghost ? +k.slice(5) : 0;
    const p = this.pos(B, k), cs = B.cs;
    this.leaving.push({ k, t0: B.t, w: ghost ? this.snap[k] : null, i, x: p.x, y: p.y });
    delete this.appear[k]; delete this.trick[k]; delete this.ears[k];
    const col = ghost ? '#c9d6ff' : k === 'fish' ? '#ffd166' : k === 'owl' ? '#fde68a' : '#c7d2fe';
    FX.addRing(p.x, p.y, 50 * cs, col, 0.4, 4);
    for (let n = 0; n < 12; n++) B.particle(p.x + U.rand(-14, 14) * cs, p.y + U.rand(-14, 14) * cs, U.rand(-60, 60), U.rand(-160, -40), U.pick([col, '#ffffff']), 0.8, U.rand(3, 6) * cs, -40, false, 'star');
    SFX.play('vanish', ghost ? 0 : 1);
  },

  // Ohrenwackeln: Versatz der Ohrspitzen (links/rechts abwechselnd)
  ear(k) {
    const p = this.prog(this.ears, k, EAR_T);
    if (p < 0) return null;
    const env = Math.sin(p * Math.PI);
    return { l: Math.sin(p * Math.PI * 6) * 5 * env, r: Math.sin(p * Math.PI * 6 + Math.PI) * 5 * env };
  },

  // Abgänge zeichnen (nach den Geisterkatzen und Begleitern, gleiche Ebene)
  drawLeaving(ctx, B) {
    const t = B.t, cs = B.cs;
    for (const l of this.leaving) {
      const p = U.clamp((t - l.t0) / LEAVE_T, 0, 1), e = p * p;
      ctx.save();
      if (l.w) {
        // Geisterkatze verwirbelt: dreht sich auf, schrumpft, steigt auf und verblasst
        const sp = B.slotPos(l.i), gx = sp.x - 13 * sp.s, gy = sp.y - 6 * sp.s;
        ctx.translate(gx, gy - e * 40 * cs); ctx.rotate(e * Math.PI * 2.5); ctx.scale(1 - e * 0.95, 1 - e * 0.95 + Math.sin(p * Math.PI) * 0.15); ctx.translate(-gx, -gy);
        ctx.globalAlpha *= 1 - p;
        Draw.ghostCat(ctx, sp.x, sp.y, sp.s, t, { weapon: l.w, recoil: 0, bodyRecoil: 0, phase: l.i * 2.1, dpr: B.dpr, eye: '#7ef9ff', look: { x: -0.6, y: 0.2 }, laserEyes: 0, fury: 0, roar: false, eyesOut: [] });
      } else {
        const pp = B.petPos(l.k);
        let dx = 0, dy = 0, s = 1, rot = 0, a = 1 - p, wings = 0;
        if (l.k === 'mouse') { dx = e * 260; dy = -e * 140; rot = -e * Math.PI * 3; }
        if (l.k === 'fish') { s = p < 0.35 ? 1 + p * 1.2 : Math.max(0, 1.42 - (p - 0.35) * 3); a = p < 0.35 ? 1 : 1 - p; }
        if (l.k === 'owl') { dy = -e * 160; dx = -e * 40; wings = 1; }
        if (l.k === 'fish' && p > 0.35 && !l.popped) { // Ballon platzt
          l.popped = true;
          for (let n = 0; n < 14; n++) B.particle(pp.x, pp.y, U.rand(-220, 220), U.rand(-220, 120), U.pick(['#bde7ff', '#ffffff', '#ffa62b']), 0.6, U.rand(3, 6) * cs, 400, false, 'spark');
          SFX.play('pop');
        }
        ctx.globalAlpha *= a;
        ctx.translate(pp.x + dx * cs, pp.y + dy * cs); ctx.rotate(rot); ctx.scale(s, s);
        _petDraw.call(Draw, ctx, l.k, 0, 0, t, cs, { wings });
      }
      ctx.restore();
    }
  },
  // von außen: Kunststück zu einem passenden Moment (Münzen, Eulenruf)
  cue(k) { if (Battle && this.had && this.had.has(k)) this.trick[k] = Battle.t; },

  pos(B, k) {
    if (k.startsWith('ghost')) return B.slotPos(+k.slice(5));
    return B.petPos(k);
  },

  // 0..1 Fortschritt, oder -1 wenn nicht aktiv
  prog(map, k, dur) {
    const s = map[k];
    if (s === undefined) return -1;
    const p = (Battle.t - s) / dur;
    if (p >= 1 || p < 0) { delete map[k]; return -1; }
    return p;
  },

  // Verwandlung für eine Geisterkatze: Wachsen mit Überschwingen, Eindrehen, Purzelbaum
  ghost(i) {
    const k = 'ghost' + i, a = this.prog(this.appear, k, APPEAR_T);
    const o = { s: 1, rot: 0, alpha: 1, dy: 0 };
    if (a >= 0) {
      const e = 1 - Math.pow(1 - a, 3);
      o.s = a < 0.7 ? e * 1.18 : 1.18 - (a - 0.7) / 0.3 * 0.18 * 1;
      o.rot = (1 - e) * -Math.PI * 1.5;
      o.alpha = Math.min(1, a * 2.5);
      o.dy = (1 - e) * 26;
    }
    return o;
  },

  // Verwandlung + Kunststück-Angaben für einen Begleiter
  pet(id) {
    const o = { dx: 0, dy: 0, s: 1, rot: 0, alpha: 1, spin: 0, wings: 0 };
    if (Shades.isFrozen('pet:' + id)) return o; // im Eis erstarrt: keine Kunststücke
    const a = this.prog(this.appear, id, APPEAR_T), tr = this.prog(this.trick, id, TRICK_T[id]);
    const e = a >= 0 ? 1 - Math.pow(1 - a, 3) : 1;
    if (a >= 0) {
      if (id === 'mouse') { o.dx = (1 - e) * 220; o.dy = -(1 - e) * 90; o.rot = (1 - e) * Math.PI * 4; o.alpha = Math.min(1, a * 3); }
      if (id === 'fish') { o.s = a < 0.6 ? e * 1.3 : 1.3 - (a - 0.6) / 0.4 * 0.3; o.dy = (1 - e) * 20; o.spin = (1 - e) * Math.PI * 2; }
      if (id === 'owl') { o.dy = -(1 - e) * 140; o.wings = 1 - Math.max(0, a - 0.75) / 0.25; o.alpha = Math.min(1, a * 3); }
    }
    if (tr >= 0) {
      const ease = tr < 0.5 ? 2 * tr * tr : 1 - Math.pow(-2 * tr + 2, 2) / 2;
      if (id === 'mouse') { o.rot += ease * Math.PI * 2; o.dy -= Math.sin(tr * Math.PI) * 14; }
      if (id === 'fish') o.spin += ease * Math.PI * 2;
      if (id === 'owl') { o.wings = Math.max(o.wings, Math.sin(Math.min(1, tr * 1.25) * Math.PI)); o.dy -= Math.sin(tr * Math.PI) * 6; }
    }
    return o;
  },
};

// jedes Bild nach dem Kampf-Update: neue Helfer erkennen, Kunststücke auslösen
const _battleUpdate = Battle.update;
Battle.update = function (dt) { _battleUpdate.call(this, dt); Anim.update(this); };

// Begleiter mit Auftritt und Kunststücken zeichnen
const _petDraw = Draw.pet;
Draw.pet = function (ctx, id, x, y, t, s = 1, opt = {}) {
  const o = Anim.pet(id);
  if (o.alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= o.alpha;
  ctx.translate(x + o.dx * s, y + o.dy * s);
  ctx.rotate(o.rot); ctx.scale(o.s, o.s);
  _petDraw.call(this, ctx, id, 0, 0, t, s, { ...opt, spin: o.spin, wings: o.wings });
  ctx.restore();
};

// Kunststücke zu passenden Momenten: Fisch bringt Münzen → Salto, Eule ruft → Flügel
const _updatePets = Battle.updatePets;
Battle.updatePets = function (dt, target) {
  const f0 = this.petT.fish, o0 = this.petT.owl;
  _updatePets.call(this, dt, target);
  if (S.pets.fish > 0 && this.petT.fish < f0) Anim.cue('fish');
  if (S.pets.owl > 0 && this.petT.owl < o0) Anim.cue('owl');
};

const _playA = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  if (name === 'vanish') {
    (arg ? [1175, 880, 659] : [1047, 784, 587, 392]).forEach((f, i) => this.tone(f, 0.16, 'sine', 0.05, -f * 0.15, i * 0.06));
    return;
  }
  if (name === 'pop') { this.noise(0.12, 0.12); this.tone(900, 0.06, 'square', 0.04, -500); return; }
  if (name === 'appear') {
    const base = arg ? [784, 988, 1319] : [523, 659, 880, 1175];
    base.forEach((f, i) => this.tone(f, 0.18, 'sine', 0.06, f * 0.1, i * 0.06));
    this.tone(1760, 0.3, 'triangle', 0.03, -400, 0.25);
    return;
  }
  return _playA.call(this, name, arg);
};
