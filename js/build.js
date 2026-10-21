'use strict';
// ---------------------------------------------------------------------------
// Build-Segen im Streifzug: statt nur Prozentwerten verändern sie, wie der Kampf
// abläuft, und ergeben zusammen Kombis.
//   Feuer  – Glutkrallen (Treffer entzünden) → Flammenmeer (Brennende explodieren)
//   Eis    – Frostkrallen (Treffer frieren ein) → Splitterfrost (mehr Schaden, Splitter)
//   Pfote  – Pfotensturm (jeder 5. Pfotenhieb = Schockwelle)
//   Parade – Konterkunst (Paraden heilen, Schild lädt schneller)
//   Blitz  – Kettenblitz (Treffer springen auf weitere Gegner)
// Kombis: Thermoschock (Feuer + Eis), Kampfkatze (Pfote + Parade),
//         Gewitterglück (Blitz + Glückssträhne)
// ---------------------------------------------------------------------------

BOONS.splice(BOONS.findIndex(b => b.id === 'life'), 0,
  { id: 'ember',   icon: '🔥', name: 'Glutkrallen',   tag: 'Feuer',  desc: '10 % der Treffer setzen Gegner 3 s in Brand',
    fx: n => `${10 * n} % Brandchance · Brand ${35 * n} % DPS je s` },
  { id: 'pyre',    icon: '💥', name: 'Flammenmeer',   tag: 'Feuer',  req: 'ember', max: 3, desc: 'Brennende Gegner explodieren beim Tod (1,5× DPS im Umkreis)',
    fx: n => `Brand-Explosion ${(1.5 * n).toFixed(1)}× DPS` },
  { id: 'frost',   icon: '❄️', name: 'Frostkrallen',  tag: 'Eis',    desc: '8 % der Treffer frieren Gegner 1,5 s ein: +25 % Schaden, Boss wirft langsamer',
    fx: n => `${8 * n} % Frostchance · +25 % Schaden an Vereisten` },
  { id: 'shatter', icon: '💠', name: 'Splitterfrost', tag: 'Eis',    req: 'frost', max: 3, desc: 'Vereiste Gegner nehmen +50 % Schaden und zersplittern beim Tod',
    fx: n => `+${25 + 50 * n} % Schaden an Vereisten · Splitter` },
  { id: 'storm',   icon: '💫', name: 'Pfotensturm',   tag: 'Pfote',  desc: 'Jeder 5. Pfotenhieb schickt eine Pfoten-Welle übers Feld: 2 s Schaden an allen, stößt zurück, 4× am Boss-Schild',
    fx: n => `alle ${Build.stormNeed(n)} Hiebe · Welle ${Build.stormSecs(n)} s Schaden` },
  { id: 'counter', icon: '🛡️', name: 'Konterkunst',   tag: 'Parade', desc: 'Paraden heilen 4 % und laden das Schild 3 s schneller',
    fx: n => `Paraden heilen ${4 * n} % · Schild −${3 * n} s` },
  { id: 'chain',   icon: '⚡', name: 'Kettenblitz',   tag: 'Blitz',  desc: '12 % der Treffer springen als Blitz auf einen weiteren Gegner (60 % Schaden)',
    fx: n => `${12 * n} % Blitzchance · 60 % Schaden` },
);
for (const b of BOONS) BOON_BY_ID[b.id] = b;

const SYNERGIES = [
  { id: 'thermo', a: 'ember', b: 'frost', icon: '💥', name: 'Thermoschock',  desc: 'Trifft Frost auf Feuer (oder Feuer auf Frost), explodiert der Gegner: 3× DPS' },
  { id: 'brawl',  a: 'storm', b: 'counter', icon: '🐾', name: 'Kampfkatze', desc: 'Paraden zählen als 2 Pfotenhiebe, jede Schockwelle heilt 3 %' },
  { id: 'luck',   a: 'chain', b: 'yarn', icon: '🍀', name: 'Gewitterglück', desc: 'Kettenblitze springen auf bis zu 3 Gegner' },
];
const TAG_COL = { Feuer: '#ff8a3c', Eis: '#7ec8ff', Pfote: '#ff8fb0', Parade: '#9fffd0', Blitz: '#ffd34d' };

const Build = {
  pawCount: 0, bolts: [],
  syn(id) { const s = SYNERGIES.find(x => x.id === id); return Run.active && !!s && Run.n(s.a) > 0 && Run.n(s.b) > 0; },
  partners(id) { return SYNERGIES.filter(s => s.a === id || s.b === id).map(s => ({ s, other: BOON_BY_ID[s.a === id ? s.b : s.a] })); },
  live(B) { return B.obs.filter(o => !o.dead && !o.fleeing && !(o.dying > 0)); },
  cy: o => o.y - OBST_H[o.kind] * o.scale * 0.5,

  // ---------------------------------------------------------------- Wirkungen
  onHit(B, o, src) {
    if (o.dead || o.dying > 0) return;
    const n = id => Run.n(id);
    if (n('ember') && Math.random() < 0.1 * n('ember')) this.ignite(B, o);
    if (n('frost') && Math.random() < 0.08 * n('frost')) this.chill(B, o);
    if (n('chain') && src !== 'chain' && Math.random() < 0.12 * n('chain')) this.chain(B, o);
  },
  // auch von Waffen-Varianten genutzt (variants.js), deshalb mit Stärke als Parameter
  ignite(B, o, dps = R.dps * 0.35 * Run.n('ember')) {
    if (o.chill > 0 && this.syn('thermo')) { this.thermo(B, o); return; }
    o.burn = { t: 3, dps: Math.max(dps, o.burn && o.burn.t > 0 ? o.burn.dps : 0) };
  },
  chill(B, o, dur = 1.5) {
    if (o.burn && o.burn.t > 0 && this.syn('thermo')) { this.thermo(B, o); return; }
    if (!(o.chill > 0)) for (let i = 0; i < 6; i++) B.particle(o.x + U.rand(-20, 20) * B.cs, this.cy(o) + U.rand(-25, 25) * B.cs, U.rand(-60, 60), U.rand(-90, -10), '#e6fbff', 0.5, 2.4 * B.cs, 0, false, 'streak');
    o.chill = Math.max(o.chill || 0, dur);
  },
  thermo(B, o) {
    o.burn = null; o.chill = 0;
    if (B.t - (o.thermoAt || -9) < 2) return; // je Gegner höchstens alle 2 s (sonst stapelt es sich ins Unendliche)
    o.thermoAt = B.t;
    const cy = this.cy(o);
    FX.addRing(o.x, cy, 120 * B.cs, '#ffffff', 0.35, 8);
    FX.addRing(o.x, cy, 70 * B.cs, '#7ec8ff', 0.3, 6);
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(140, 380); B.particle(o.x, cy, Math.cos(a) * v, Math.sin(a) * v, U.pick(['#ffffff', '#7ec8ff', '#ff8a3c']), U.rand(0.2, 0.4), U.rand(2, 3) * B.cs, 300, false, 'streak'); }
    // Text und Knall höchstens alle 0,7 s, sonst flutet es bei vielen Stapeln den Bildschirm
    if (B.t - (this.thermoT || -9) > 0.7) { this.thermoT = B.t; B.text(o.x, cy - 40 * B.cs, 'THERMOSCHOCK!', '#bfeaff', 18 * B.cs, true); B.shake = Math.max(B.shake, 6); SFX.play('boom'); }
    B.damage(o, R.dps * 3, false, false, 'build');
  },
  chain(B, from, hops = this.syn('luck') ? 3 : 1) {
    let src = from;
    const hit = new Set([from.id]);
    for (let h = 0; h < hops; h++) {
      const cand = this.live(B).filter(o => !hit.has(o.id));
      if (!cand.length) break;
      const o = cand.sort((a, b) => Math.abs(a.x - src.x) - Math.abs(b.x - src.x))[0];
      hit.add(o.id);
      this.bolts.push({ x1: src.x, y1: this.cy(src), x2: o.x, y2: this.cy(o), t: 0.22, seed: Math.random() * 99 });
      B.damage(o, R.dps * 0.6 * 0.4, false, true, 'chain');
      src = o;
    }
    if (hit.size > 1) SFX.play('zap');
  },
  onKill(B, o) {
    if (!Run.active) return;
    const cy = this.cy(o);
    if (o.burn && o.burn.t > 0 && Run.n('pyre')) {
      const r = 140 * B.cs;
      FX.addRing(o.x, cy, r, '#ff8a3c', 0.35, 8);
      for (let i = 0; i < 16; i++) B.particle(o.x, cy, U.rand(-260, 260), U.rand(-300, 80), U.pick(['#ff6a2b', '#ffd34d', '#ffb347']), U.rand(0.3, 0.6), U.rand(4, 8) * B.cs, 300, false, 'spark');
      for (const x of this.live(B)) if (x !== o && Math.abs(x.x - o.x) < r) { B.damage(x, R.dps * 1.5 * Run.n('pyre'), false, true, 'build'); if (Run.n('ember')) x.burn = { t: 3, dps: R.dps * 0.35 * Run.n('ember') }; }
      if (B.t - (this.pyreT || -9) > 0.3) { this.pyreT = B.t; SFX.play('boom'); }
    }
    if (o.chill > 0 && Run.n('shatter')) {
      for (let i = 0; i < 14; i++) { const p = B.particle(o.x, cy, U.rand(-280, 280), U.rand(-320, 40), U.pick(['#bfeaff', '#ffffff', '#7ec8ff']), U.rand(0.5, 0.9), U.rand(3, 6) * B.cs, 900, true, 'chunk'); if (p) p.spin = U.rand(-14, 14); }
      for (const x of this.live(B)) if (x !== o && Math.abs(x.x - o.x) < 110 * B.cs) this.chill(B, x);
    }
  },
  // Pfotensturm: früher 3× Klickschaden (≈ ein Bruchteil einer Sekunde DPS) – kaum spürbar.
  // Jetzt eine Welle, die von der Katze übers Feld rollt: jeder Gegner, den sie erreicht,
  // nimmt n·2 s Dauerfeuer-Schaden (zählt als Pfote: Pfotenwirbel wirkt, Boss-Schild 4×) und
  // wird zurückgestoßen. Ab Stufe 2 genügen 4 Hiebe, ab Stufe 3 drei.
  stormNeed: n => (n >= 3 ? 3 : n >= 2 ? 4 : 5),
  stormSecs: n => 2 * n,
  waves: [],
  onPaw(B, weight = 1) {
    if (!Run.n('storm')) return;
    const n = Run.n('storm');
    this.pawCount += weight;
    this.pawPop = 0.25;
    if (this.pawCount < this.stormNeed(n)) return;
    this.pawCount = 0;
    const cx = B.catX + 30 * B.cs, cy = B.groundY - 30 * B.cs;
    this.waves.push({ x0: cx, r: 0, hit: new Set(), dmg: R.dps * this.stormSecs(n) });
    FX.addRing(cx, cy, 120 * B.cs, '#ffffff', 0.3, 8);
    B.text(cx + 40 * B.cs, cy - 60 * B.cs, 'PFOTENSTURM!', '#ff8fb0', 20 * B.cs, true);
    B.shake = Math.max(B.shake, 8);
    SFX.play('roar');
    if (this.syn('brawl')) Vitals.heal(B, 0.03, true);
  },
  updateWaves(dt, B) {
    for (const w of this.waves) {
      w.r += 950 * B.cs * dt;
      for (const o of this.live(B)) {
        if (w.hit.has(o.id) || o.x - w.x0 > w.r) continue;
        w.hit.add(o.id);
        B.damage(o, w.dmg, true, false, 'paw');
        if (!o.boss) o.x += 26 * B.cs; // zurückgestoßen (Bomben besonders willkommen)
        o.kx = (o.kx || 0) + 14 * B.cs; o.tilt = (o.tilt || 0) + 0.2;
        const cy = this.cy(o);
        for (let i = 0; i < 6; i++) B.particle(o.x, cy, U.rand(40, 260), U.rand(-220, 20), U.pick(['#ff8fb0', '#ffd6f3', '#ffffff']), 0.4, 3 * B.cs, 300, false, 'streak');
      }
      if (Math.random() < dt * 40) B.particle(w.x0 + w.r, B.groundY - U.rand(0, 20) * B.cs, U.rand(-30, 30), U.rand(-160, -60), U.pick(['#ff8fb0', '#ffd6f3']), 0.5, 3.5 * B.cs, 400, false, 'spark');
    }
    this.waves = this.waves.filter(w => w.x0 + w.r < B.W + 80);
    this.pawPop = Math.max(0, (this.pawPop || 0) - dt);
  },
  // Welle (rosa Bogen am Boden) und Ladeanzeige über der Katze (Pfotenabdrücke)
  drawStorm(ctx, B) {
    const cs = B.cs;
    for (const w of this.waves) {
      const x = w.x0 + w.r, a = U.clamp(1 - w.r / (B.W * 1.1), 0.25, 1);
      ctx.save();
      ctx.globalAlpha = a; ctx.lineCap = 'round';
      ctx.strokeStyle = '#ff8fb0'; ctx.lineWidth = 9 * cs;
      ctx.beginPath(); ctx.ellipse(x, B.groundY, 26 * cs, 120 * cs, 0, -Math.PI / 2, Math.PI / 2 * 0.05); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * cs;
      ctx.beginPath(); ctx.ellipse(x, B.groundY, 26 * cs, 120 * cs, 0, -Math.PI / 2, Math.PI / 2 * 0.05); ctx.stroke();
      ctx.restore();
    }
    if (!Run.n('storm')) return;
    const need = this.stormNeed(Run.n('storm')), have = Math.min(this.pawCount, need);
    const y = B.groundY - 108 * cs, gap = 15 * cs, x0 = B.catX + 6 * cs - (need - 1) * gap / 2;
    ctx.save();
    for (let i = 0; i < need; i++) {
      const on = i < have, s = (on && i === have - 1 ? 1 + (this.pawPop || 0) * 2 : 1) * 5.5 * cs, x = x0 + i * gap;
      ctx.globalAlpha = on ? 1 : 0.35;
      Draw.circle(ctx, x, y, s * 1.3, 'rgba(20,10,30,0.6)');
      Draw.circle(ctx, x, y + s * 0.25, s * 0.55, on ? '#ff8fb0' : '#ffffff');
      for (const [dx, dy] of [[-0.55, -0.45], [0, -0.7], [0.55, -0.45]]) Draw.circle(ctx, x + dx * s, y + dy * s, s * 0.22, on ? '#ff8fb0' : '#ffffff');
    }
    ctx.restore();
  },
  onParry(B) {
    if (Run.n('counter')) {
      Vitals.heal(B, 0.04 * Run.n('counter'), true);
      S.skillsCd.shield = Math.max(0, (S.skillsCd.shield || 0) - 3 * Run.n('counter'));
    }
    if (this.syn('brawl')) this.onPaw(B, 2);
  },

  update(dt, B) {
    this.updateWaves(dt, B);
    for (const o of B.obs) {
      if (o.dead || o.fleeing || o.dying > 0) continue;
      if (o.burn && o.burn.t > 0) {
        o.burn.t -= dt;
        B.damage(o, o.burn.dps * dt, false, true, 'burn');
        if (Math.random() < dt * 18) B.particle(o.x + U.rand(-0.35, 0.35) * OBST_W[o.kind] * o.scale, o.y - U.rand(0.2, 0.9) * OBST_H[o.kind] * o.scale, U.rand(-15, 15), U.rand(-110, -50), U.pick(['#ff6a2b', '#ffb347', '#ffd34d']), U.rand(0.3, 0.6), U.rand(2.5, 4.5) * B.cs, -40, false, 'spark');
      }
      if (o.chill > 0) {
        o.chill -= dt;
        if (o.boss) Vitals.atkT += dt * 0.6; // vereister Boss wirft langsamer
      }
    }
    for (const b of this.bolts) b.t -= dt;
    this.bolts = this.bolts.filter(b => b.t > 0);
  },

  // Zustände sichtbar machen (in der Welt, nach den Gegnern)
  draw(ctx, B) {
    const t = B.t, cs = B.cs;
    this.drawStorm(ctx, B);
    ctx.save();
    for (const o of B.obs) {
      if (o.dead || o.fleeing) continue;
      const h = OBST_H[o.kind] * o.scale, w = OBST_W[o.kind] * o.scale, cy = o.y - h * 0.5;
      if (o.chill > 0) {
        const a = Math.min(1, o.chill * 2);
        ctx.globalCompositeOperation = 'lighter';
        FX.drawGlow(ctx, o.x, cy, h * 0.75, '#7ec8ff', 0.35 * a);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.85 * a; ctx.fillStyle = '#e6fbff';
        for (let k = 0; k < 4; k++) { // Eiszapfen am Boden
          const ix = o.x - w * 0.35 + k * w * 0.23, ih = (6 + (k % 2) * 5) * cs;
          ctx.beginPath(); ctx.moveTo(ix - 3 * cs, o.y - 2); ctx.lineTo(ix + 3 * cs, o.y - 2); ctx.lineTo(ix, o.y - 2 - ih); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (o.burn && o.burn.t > 0) {
        ctx.globalCompositeOperation = 'lighter';
        FX.drawGlow(ctx, o.x, o.y - h * 0.3, h * 0.6, '#ff6a2b', 0.25 + Math.sin(t * 20 + o.id) * 0.08);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    // Kettenblitze: zackige Linie mit hellem Kern
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of this.bolts) {
      const pts = [[b.x1, b.y1]];
      for (let i = 1; i < 6; i++) { const k = i / 6; pts.push([b.x1 + (b.x2 - b.x1) * k + Math.sin(b.seed + i * 7 + t * 60) * 10 * cs, b.y1 + (b.y2 - b.y1) * k + Math.cos(b.seed + i * 5 + t * 50) * 12 * cs]); }
      pts.push([b.x2, b.y2]);
      for (const [col, lw] of [['rgba(255,211,77,0.5)', 7 * cs], ['#ffffff', 2 * cs]]) {
        ctx.globalAlpha = Math.min(1, b.t * 6); ctx.strokeStyle = col; ctx.lineWidth = lw;
        ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    }
    ctx.restore();
  },

  // ---------------------------------------------------------------- Anzeige
  tagHtml(b) { return b.tag ? `<span class="btag" style="--tc:${TAG_COL[b.tag]}">${b.tag}</span>` : ''; },
  synHint(b) {
    const ps = this.partners(b.id);
    if (!ps.length) return '';
    return ps.map(({ s, other }) => {
      const has = Run.n(other.id) > 0;
      return `<span class="bsyn ${has ? 'on' : ''}">${has ? '✨ Kombi aktiv mit' : 'Kombi mit'} ${other.icon} ${other.name}: <b>${s.name}</b></span>`;
    }).join('');
  },
  synHtml() {
    return `<div class="synlist">${SYNERGIES.map(s => {
      const on = this.syn(s.id), a = BOON_BY_ID[s.a], b = BOON_BY_ID[s.b];
      return `<div class="${on ? 'on' : ''}"><i>${s.icon}</i><b>${s.name}</b><small>${a.icon} ${a.name} + ${b.icon} ${b.name}<br>${s.desc}</small><em>${on ? 'aktiv' : `${Run.n(s.a) ? 1 : 0}/2`}</em></div>`;
    }).join('')}</div>`;
  },
};

// ---------------------------------------------------------------- Einhängen
const _bDamage = Battle.damage;
Battle.damage = function (o, amount, canCrit, quiet, src = 'bullet') {
  if (o && o.chill > 0) amount *= 1.25 + 0.5 * Run.n('shatter'); // Vereiste nehmen mehr Schaden
  const before = o && o.hp;
  _bDamage.call(this, o, amount, canCrit, quiet, src);
  if (Run.active && o && o.hp < before && src !== 'burn' && src !== 'build' && src !== 'parry') Build.onHit(this, o, src);
};
const _bKill = Battle.kill;
Battle.kill = function (o) { const was = o.dead; _bKill.call(this, o); if (!was) Build.onKill(this, o); };
const _bPaw = Battle.paw;
Battle.paw = function (x, y) {
  const n0 = S.stats.clicks;
  _bPaw.call(this, x, y);
  if (Run.active && S.stats.clicks > n0) Build.onPaw(this); // nur echte Pfotenhiebe (keine Parade/Werbung)
};
const _bParry = Vitals.tryParry;
Vitals.tryParry = function (B, x, y) { const ok = _bParry.call(this, B, x, y); if (ok && Run.active) Build.onParry(B); return ok; };
const _bUpdate = Battle.update;
Battle.update = function (dt) { _bUpdate.call(this, dt); Build.update(this.frameDt || dt, this); };
const _bTalDraw = Talents.draw;
Talents.draw = function (ctx, B) { _bTalDraw.call(this, ctx, B); Build.draw(ctx, B); };
