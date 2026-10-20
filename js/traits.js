'use strict';
// ---------------------------------------------------------------------------
// Gegner mit eigener Mechanik – damit Waffenwahl, Pfote und Skills zählen:
//   Gepanzert – Kugeln machen nur 35 % (Pfote, Rakete, Laser, Talente wirken voll)
//   Flieger   – schwebt: Bogenschüsse (Wolle, Haarballen) fliegen darunter durch
//   Heiler    – heilt die anderen Gegner (grüne Strahlen); zuerst wegpfoten!
//   Teiler    – zerfällt beim Tod in zwei kleine Hälften
//   Bombe     – Lunte brennt vorne ab (7 s) und explodiert an der Katze;
//               Pfotenhiebe schubsen sie zurück und verlängern die Lunte
// Dazu Boss-Phase 2: ab 50 % Leben wird der Boss wütend, wirft schneller und
// kündigt Großangriffe an – riesige Geschosse, die man parieren sollte.
// ---------------------------------------------------------------------------

const TRAITS = {
  armor:  { icon: 'armor', name: 'Gepanzert', col: '#c9d0e0', from: 12, room: 2, w: 1,   tip: 'Kugeln machen nur 35 % Schaden. Pfotenhiebe, Raketen, Laser und Talente wirken voll.' },
  flyer:  { icon: 'wing',  name: 'Flieger',   col: '#bfeaff', from: 14, room: 2, w: 1,   tip: 'Schwebt über dem Boden: Bogenschüsse (Wollknäuel, Haarballen) fliegen darunter durch.' },
  splitter: { icon: 'split', name: 'Teiler', col: '#ff8fb0', from: 16, room: 3, w: 0.9, tip: 'Zerfällt beim Tod in zwei kleine Hälften.' },
  healer: { icon: 'plus',  name: 'Heiler',    col: '#6ee7a0', from: 20, room: 3, w: 0.8, tip: 'Heilt die anderen Gegner – am besten zuerst wegpfoten!' },
  bomber: { icon: 'fuse',  name: 'Bombe',     col: '#ff8a3c', from: 25, room: 4, w: 0.7, tip: 'Vorne brennt die Lunte ab. Pfotenhiebe schubsen sie zurück – sonst knallt es an der Katze.' },
};
const FUSE_T = 7;
const PHASE2_FROM = 8;     // Hauptspiel: ab dieser Stufe haben Bosse eine 2. Phase (Streifzug ab Raum 3)
const BIG_EVERY = 6.5;     // Sekunden zwischen Großangriffen in Phase 2

const Traits = {
  curType: null, // Waffentyp der Kugel, die gerade trifft (für Panzer)

  chance() {
    if (Run.active) return Run.room() >= 2 ? (S.run.elite ? 0.3 : 0.16) : 0;
    return S.stage >= 12 ? 0.14 : 0;
  },
  roll(o) {
    if (o.boss || o.treasure || o.shade || o.golden || o.mini || Math.random() > this.chance()) return o;
    const ok = Object.entries(TRAITS).filter(([, t]) => Run.active ? Run.room() >= t.room : S.stage >= t.from);
    if (!ok.length) return o;
    const id = U.weightedPick(ok.map(([id, t]) => ({ id, w: t.w }))).id;
    o.trait = id;
    if (id === 'armor') { o.hp = o.maxHp = o.maxHp * 1.2; }
    if (id === 'bomber') { o.fuse = FUSE_T; o.hp = o.maxHp = o.maxHp * 0.8; }
    if (id === 'healer') o.hp = o.maxHp = o.maxHp * 0.9;
    Hints.once('trait_' + id, `${TRAITS[id].name}`, TRAITS[id].tip, TRAITS[id].icon);
    return o;
  },

  // ---------------------------------------------------------------- Ablauf
  update(dt, B) {
    for (const o of B.obs) {
      if (o.dead || o.fleeing || o.dying > 0) continue;
      if (o.trait === 'healer' && Math.random() < dt * 1.2) {
        // pulsierende Heilung an alle anderen
        const others = B.obs.filter(x => x !== o && !x.dead && !x.fleeing && !(x.dying > 0) && x.hp < x.maxHp);
        for (const x of others) {
          x.hp = Math.min(x.maxHp, x.hp + x.maxHp * (x.boss ? 0.006 : 0.05));
          this.beams.push({ x1: o.x, y1: this.cy(o), x2: x.x, y2: this.cy(x), t: 0.35 });
        }
        if (others.length) { FX.addRing(o.x, this.cy(o), 50 * B.cs, '#6ee7a0', 0.3, 3); SFX.play('healPulse'); }
      }
      if (o.trait === 'bomber' && o.x <= B.frontX + 6) {
        o.fuse -= dt;
        if (Math.random() < dt * 30) B.particle(o.x + 14 * B.cs, o.y - OBST_H[o.kind] * o.scale - 6 * B.cs, U.rand(-40, 40), U.rand(-90, -30), U.pick(['#ffd34d', '#ff8a3c', '#fff']), 0.35, 2.2 * B.cs, 120, false, 'spark');
        if (Math.ceil(o.fuse) !== o.fuseTick) { o.fuseTick = Math.ceil(o.fuse); SFX.play('fuse'); }
        if (o.fuse <= 0) this.detonate(B, o);
      }
    }
    for (const b of this.beams) b.t -= dt;
    this.beams = this.beams.filter(b => b.t > 0);
    this.updateBoss(dt, B);
  },
  cy: o => o.y - OBST_H[o.kind] * o.scale * 0.5,
  beams: [],

  detonate(B, o) {
    const cy = this.cy(o);
    o.trait = null; // explodiert nur einmal
    Vitals.explode(B, B.catX + 30 * B.cs, B.groundY - 20 * B.cs, 0.55);
    for (let i = 0; i < 20; i++) B.particle(o.x, cy, U.rand(-300, 300), U.rand(-320, 60), U.pick(['#ff8a3c', '#ffd34d', '#3a3a4a']), U.rand(0.4, 0.8), U.rand(4, 8) * B.cs, 500, false, 'spark');
    B.text(B.catX + 20 * B.cs, B.groundY - 110 * B.cs, 'BUMM!', '#ff8a3c', 24 * B.cs, true);
    const blocked = Vitals.hurt(B, Vitals.ref().maxHp * (Run.active ? 0.16 : 0.1), true);
    if (!blocked) Vitals.dazed = Math.max(Vitals.dazed, 1.2); // kurz benommen: Waffen schweigen
    B.damage(o, o.hp + 1, false, true, 'build'); // die Bombe ist danach weg
    B.shake = Math.max(B.shake, 14);
  },

  onPaw(B, o) {
    if (o && o.trait === 'bomber' && !o.dead) {
      o.x += 90 * B.cs; o.fuse = Math.min(FUSE_T, o.fuse + 2.2); o.kx = 14 * B.cs;
      B.text(o.x, this.cy(o) - 50 * B.cs, 'WEGGEPFOTET!', '#ffd34d', 15 * B.cs, true);
    }
  },

  onKill(B, o) {
    if (o.trait !== 'splitter') return;
    for (const dx of [-26, 26]) {
      const m = Battle.makeObstacle(false);
      Object.assign(m, { kind: o.kind, mini: true, trait: null, golden: false, fruit: false, treasure: false, shade: null, x: o.x + dx * B.cs, scale: o.scale * 0.62, hp: o.maxHp * 0.3, maxHp: o.maxHp * 0.3 });
      m.kx = dx * 0.5; m.squash = 0.25;
      B.obs.push(m);
    }
    FX.addRing(o.x, this.cy(o), 70 * B.cs, '#ff8fb0', 0.3, 5);
    SFX.play('split');
  },

  // ---------------------------------------------------------------- Boss-Phase 2
  bigT: 0, charge: 0,
  phaseOn() { return Run.active ? Run.room() >= 3 : S.stage >= PHASE2_FROM; },
  checkPhase(B, o) {
    if (!o.boss || o.phase2 || o.hp <= 0 || o.hp / o.maxHp > 0.5 || !this.phaseOn()) return;
    o.phase2 = true;
    this.bigT = 2.5; this.charge = 0;
    B.showBanner('PHASE 2!', `${BOSS_NAMES[o.kind]} wird wütend – Großangriffe parieren!`, '#ff4d6d');
    FX.addRing(o.x, this.cy(o), 260 * B.cs, '#ff4d6d', 0.6, 12);
    B.shake = Math.max(B.shake, 16); B.punchZoom(0.06, o.x, this.cy(o));
    SFX.play('phase');
    Hints.once('phase2', 'Boss-Phase 2', 'Ab halbem Leben kündigt der Boss Großangriffe an. Tippe das riesige Geschoss an (Parade) – es trifft den Boss hart und betäubt ihn. Oder halte das Schild bereit.', 'crown');
  },
  updateBoss(dt, B) {
    const o = B.bossState === 'active' ? B.bossObj : null;
    if (!o || !o.phase2 || o.dead || o.dying > 0 || o.fleeing || Vitals.stun > 0 || Vitals.koPending || Run.busy()) { this.charge = 0; return; }
    if (this.charge > 0) {
      this.charge -= dt;
      if (Math.random() < dt * 50) {
        const a = Math.random() * Math.PI * 2, d = U.rand(60, 120) * B.cs, cy = this.cy(o);
        B.particle(o.x + Math.cos(a) * d, cy + Math.sin(a) * d, -Math.cos(a) * d * 3, -Math.sin(a) * d * 3, U.pick(['#ff4d6d', '#ffd34d']), 0.3, 3.5 * B.cs, 0, false, 'spark');
      }
      if (this.charge <= 0) this.bigShot(B, o);
      return;
    }
    this.bigT -= dt;
    if (this.bigT <= 0) { this.bigT = BIG_EVERY * U.rand(0.85, 1.15); this.charge = 1.1; o.windup = 1.1; SFX.play('charge'); }
  },
  bigShot(B, o) {
    const a = BOSS_ATTACKS[o.kind] || BOSS_ATTACKS.tree, h = OBST_H[o.kind] * o.scale;
    const sx = o.x - OBST_W[o.kind] * o.scale * 0.3, sy = o.y - h * 0.65;
    Vitals.shots.push({ from: o.id, sx, sy, x: sx, y: sy, ex: 0, ey: 0, t: 0, rot: 0, spin: 3, T: 1.9, arc: 150 * B.cs, sky: false, icon: a.icon, size: 2.3, dmg: a.dmg * 30, big: true });
    o.windup = 0.35;
    SFX.play('throw');
  },

  // ---------------------------------------------------------------- Zeichnen
  draw(ctx, B) {
    const t = B.t, cs = B.cs;
    ctx.save();
    // Heilstrahlen
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const b of this.beams) {
      ctx.globalAlpha = b.t / 0.35; ctx.strokeStyle = '#6ee7a0'; ctx.lineWidth = 4 * cs;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.quadraticCurveTo((b.x1 + b.x2) / 2, Math.min(b.y1, b.y2) - 40 * cs, b.x2, b.y2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const o of B.obs) {
      if (o.dead || o.fleeing || !o.trait && !o.phase2) continue;
      const h = OBST_H[o.kind] * o.scale, w = OBST_W[o.kind] * o.scale, cy = o.y - h * 0.5;
      if (o.trait === 'flyer') { // Flügel und abgehobener Schatten
        for (const sx of [-1, 1]) {
          ctx.save(); ctx.translate(o.x + sx * w * 0.42, cy - h * 0.1); ctx.rotate(sx * (0.25 + Math.sin(t * 14 + o.id) * 0.35)); ctx.scale(sx, 1);
          Icons.draw(ctx, 'wing', 12 * cs, -6 * cs, 30 * cs * o.scale / cs);
          ctx.restore();
        }
      }
      if (o.trait === 'armor') { // Panzerplatten-Glanz
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#e6ecf8'; ctx.lineWidth = 3 * cs;
        ctx.beginPath(); ctx.arc(o.x, cy, h * 0.55, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (o.trait === 'healer') { ctx.globalCompositeOperation = 'lighter'; FX.drawGlow(ctx, o.x, cy, h * 0.8, '#6ee7a0', 0.22 + Math.sin(t * 4) * 0.08); ctx.globalCompositeOperation = 'source-over'; }
      if (o.trait === 'bomber' && o.x <= B.frontX + 6) { // Lunten-Ring
        const f = U.clamp(o.fuse / FUSE_T, 0, 1), r = h * 0.62, hot = f < 0.35;
        ctx.lineWidth = 5 * cs; ctx.strokeStyle = 'rgba(255,138,60,0.25)';
        ctx.beginPath(); ctx.arc(o.x, cy, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = hot && Math.sin(t * 24) > 0 ? '#ff4d6d' : '#ff8a3c';
        ctx.beginPath(); ctx.arc(o.x, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
        ctx.font = `900 ${12 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.9)';
        const lbl = `${o.fuse.toFixed(1)} s · WEGPFOTEN!`;
        ctx.strokeText(lbl, o.x, cy + r + 12 * cs); ctx.fillStyle = '#ffd34d'; ctx.fillText(lbl, o.x, cy + r + 12 * cs);
      }
      // Eigenschafts-Plakette links am Lebensbalken
      if (o.trait) {
        const by = o.y - h - (o.boss ? 40 : 16) * cs + 3 * cs, bx = o.x - (o.boss ? 60 : 28) * cs - 12 * cs;
        Draw.circle(ctx, bx, by, 10 * cs, 'rgba(20,10,30,0.85)');
        ctx.strokeStyle = TRAITS[o.trait].col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx, by, 10 * cs, 0, Math.PI * 2); ctx.stroke();
        Icons.draw(ctx, TRAITS[o.trait].icon, bx, by, 15 * cs);
      }
      if (o.phase2 && !(o.dying > 0)) { // wütender Boss: pulsierende rote Aura
        ctx.globalCompositeOperation = 'lighter';
        FX.drawGlow(ctx, o.x, cy, h * 1.1, '#ff1e46', 0.22 + Math.sin(t * 8) * 0.1 + (this.charge > 0 ? 0.3 : 0));
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // Großangriff wird geladen: Warnung über dem Boss
    const bo = B.bossObj;
    if (bo && this.charge > 0) {
      const cy = this.cy(bo), r = OBST_H[bo.kind] * bo.scale * (0.7 + (1 - this.charge / 1.1) * 0.4);
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 4 * cs; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(bo.x, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // riesige Geschosse beschriften
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of Vitals.shots) {
      if (!s.big || s.back || s.t < 0) continue;
      ctx.font = `900 ${13 * cs}px "Segoe UI", sans-serif`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,30,0.9)';
      ctx.strokeText('ANTIPPEN!', s.x, s.y - 40 * cs); ctx.fillStyle = Math.sin(t * 16) > 0 ? '#ffd34d' : '#ffffff'; ctx.fillText('ANTIPPEN!', s.x, s.y - 40 * cs);
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------- Hinweise beim ersten Mal
const Hints = {
  once(key, title, text, icon = 'bulb') {
    S.hints = S.hints || {};
    if (S.hints[key]) return;
    S.hints[key] = true;
    UI.toast(`<i class="ic ic-${icon}">${Icons.svg(icon)}</i> <b>${title}</b><br><small>${text}</small>`, 'tip');
  },
};

// ---------------------------------------------------------------- Einhängen
const _tMake = Battle.makeObstacle;
Battle.makeObstacle = function (boss) { return Traits.roll(_tMake.call(this, boss)); };
const _tHit = Battle.onBulletHit;
Battle.onBulletHit = function (b, o) { Traits.curType = b.type; try { _tHit.call(this, b, o); } finally { Traits.curType = null; } };
const _tDmg = Battle.damage;
Battle.damage = function (o, amount, canCrit, quiet, src = 'bullet') {
  if (o && o.trait === 'armor' && (src === 'bullet' || src === 'pet' || src === 'chain') && Traits.curType !== 'rocket' && Traits.curType !== 'talent') {
    amount *= 0.35;
    if (Math.random() < 0.08) { this.text(o.x + U.rand(-20, 20), o.y - OBST_H[o.kind] * o.scale - 8, 'KLONK', '#c9d0e0', 12 * this.cs); SFX.play('clank'); }
  }
  _tDmg.call(this, o, amount, canCrit, quiet, src);
  if (o && o.boss) Traits.checkPhase(this, o);
};
const _tKill = Battle.kill;
Battle.kill = function (o) {
  const was = o.dead, wasMini = o.mini;
  _tKill.call(this, o);
  if (was) return;
  Traits.onKill(this, o);
  if (wasMini && !o.boss) { if (S.farm) S.farmKills = Math.max(0, S.farmKills - 1); else S.kills = Math.max(0, S.kills - 1); } // Hälften zählen nicht als eigene Zerstörung
};
const _tPaw = Battle.paw;
Battle.paw = function (x, y) {
  let tgt = null;
  if (x !== undefined) tgt = this.obs.find(o => !o.dead && !o.fleeing && Math.abs(x - o.x) < OBST_W[o.kind] * o.scale * 0.75 && y > o.y - OBST_H[o.kind] * o.scale - 20 && y < o.y + 15);
  tgt = tgt || this.front();
  const c0 = S.stats.clicks;
  _tPaw.call(this, x, y);
  if (S.stats.clicks > c0) Traits.onPaw(this, tgt);
};
const _tReflect = Vitals.reflectHit;
Vitals.reflectHit = function (B, o, s) {
  _tReflect.call(this, B, o, s);
  if (s.big && o && !o.dead) { // parierter Großangriff: Volltreffer und kurz betäubt
    o.hp = Math.max(1, o.hp - o.maxHp * 0.06);
    this.stun = Math.max(this.stun, 1.6);
    B.text(o.x, o.y - OBST_H[o.kind] * o.scale - 30 * B.cs, 'VOLLTREFFER!', '#5effc8', 24 * B.cs, true);
    B.shake = Math.max(B.shake, 12);
  }
};
const _tAtk = Run.atkMul;
Run.atkMul = function () { const b = Battle.bossObj; return _tAtk.call(this) * (b && b.phase2 && Battle.bossState === 'active' ? 0.75 : 1); };
const _tUpd = Battle.update;
Battle.update = function (dt) { _tUpd.call(this, dt); Traits.update(this.frameDt || dt, this); };
const _tDraw = Talents.draw;
Talents.draw = function (ctx, B) { _tDraw.call(this, ctx, B); Traits.draw(ctx, B); };
