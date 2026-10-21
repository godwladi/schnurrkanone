'use strict';
// ---------------------------------------------------------------------------
// Grenzbruch & Raritäten
// Zwei Omega-Waffen (Stufe XV) gleicher Art verschmelzen zu „Grenzbruch ★1“ – die
// Waffe überschreitet ihre Grenze und bekommt eine eigene Fähigkeit. Jeder weitere
// Stern (bis ★5) macht sie stärker. Kisten liefern weiterhin höchstens Stufe XV.
// Jede Stufe gehört zu einer Rarität (Common … Mythic Rare), sichtbar als Plakette.
// ---------------------------------------------------------------------------

const LIMIT_FROM = 16;     // erste Grenzbruch-Stufe (MAX_TIER, BOX_MAX_TIER und TIERS in data.js)

const RARITY = [
  { id: 'C',  name: 'Common',         from: 1,  col: '#b8c0cc' },
  { id: 'R',  name: 'Rare',           from: 4,  col: '#5ab0ff' },
  { id: 'SR', name: 'Super Rare',     from: 7,  col: '#c084fc' },
  { id: 'UR', name: 'Ultra Rare',     from: 10, col: '#ffb347' },
  { id: 'LR', name: 'Legendary Rare', from: 13, col: '#ff5d73' },
  { id: 'MR', name: 'Mythic Rare',    from: 16, col: '#ffd34d' },
];

// Fähigkeit je Waffe (s = Sterne 1–5)
const LIMIT_SKILLS = {
  pistol:  { icon: '💥', name: 'Querschläger',  desc: s => `${20 + 6 * s} % der Treffer prallen auf einen zweiten Gegner ab (${60 + 10 * s} % Schaden)` },
  shotgun: { icon: '🔥', name: 'Drachenschrot', desc: s => `${10 + 3 * s} % der Schrotkugeln setzen in Brand (stark)` },
  laser:   { icon: '⚡', name: 'Prismastrahl',  desc: s => `${18 + 4 * s} % der Treffer springen als Blitz auf ${1 + Math.floor(s / 2)} weitere Gegner` },
  rocket:  { icon: '🐟', name: 'Streubombe',    desc: s => `Explosionen werfen ${2 + Math.floor(s / 2)} Mini-Fische (${35 + 5 * s} % Schaden)` },
  yarn:    { icon: '❄️', name: 'Wollnetz',      desc: s => `${15 + 4 * s} % der Treffer verfangen und vereisen den Gegner (+25 % Schaden)` },
};

const Limit = {
  stars: w => (w && w.r >= LIMIT_FROM ? w.r - LIMIT_FROM + 1 : 0),
  rarity: r => RARITY.reduce((a, x) => (r >= x.from ? x : a), RARITY[0]),
  skillText(w) { const s = this.stars(w), k = LIMIT_SKILLS[w.t]; return s ? `${k.icon} ${k.name}: ${k.desc(s)}` : ''; },
  // Zusatzschaden der Fähigkeiten grob als Faktor (für den Streifzug-Deckel)
  dpsMul() { let n = 0; for (const w of S.slots) n += this.stars(w); return 1 + 0.1 * n / 4; },

  // ---------------------------------------------------------------- Fähigkeiten im Kampf
  onHit(B, b, o) {
    const s = b.lim;
    if (!s || !o || o.dead || o.dying > 0) return;
    const live = () => B.obs.filter(x => x !== o && !x.dead && !x.fleeing && !(x.dying > 0) && x.x < B.W);
    if (b.type === 'pistol' && Math.random() < 0.2 + 0.06 * s) {
      const t = U.pick(live());
      if (t) {
        const y1 = o.y - OBST_H[o.kind] * o.scale * 0.5, y2 = t.y - OBST_H[t.kind] * t.scale * 0.5;
        this.streaks.push({ x1: o.x, y1, x2: t.x, y2, t: 0.18, col: b.color });
        B.damage(t, b.dmg * (0.6 + 0.1 * s), true, true, 'limit');
      }
    } else if (b.type === 'shotgun' && Math.random() < 0.1 + 0.03 * s) {
      Build.ignite(B, o, Math.max(b.dmg * (1.5 + 0.3 * s), R.dps * (0.1 + 0.03 * s)));
    } else if (b.type === 'laser' && Math.random() < 0.18 + 0.04 * s) {
      Build.chain(B, o, 1 + Math.floor(s / 2));
    } else if (b.type === 'yarn' && Math.random() < 0.15 + 0.04 * s) {
      Build.chill(B, o, 1.2 + 0.2 * s);
      o.kx = (o.kx || 0) + 10 * B.cs;
    } else if (b.type === 'rocket') {
      const n = 2 + Math.floor(s / 2), pool = live();
      for (let i = 0; i < n && pool.length; i++) {
        const t = pool.splice(U.randi(0, pool.length - 1), 1)[0];
        const ty = t.y - OBST_H[t.kind] * t.scale * 0.5;
        this.minis.push({ x: o.x, y: o.y - OBST_H[o.kind] * o.scale * 0.6, tx: t.x, ty, t: 0, T: 0.45 + i * 0.08, tgt: t, dmg: b.dmg * (0.35 + 0.05 * s) });
      }
    }
  },
  streaks: [], minis: [],
  update(dt, B) {
    for (const k of this.streaks) k.t -= dt;
    this.streaks = this.streaks.filter(k => k.t > 0);
    for (const m of this.minis) {
      m.t += dt;
      if (m.t >= m.T && !m.done) {
        m.done = true;
        if (m.tgt && !m.tgt.dead && !(m.tgt.dying > 0)) B.damage(m.tgt, m.dmg, true, true, 'limit');
        FX.addRing(m.tx, m.ty, 46 * B.cs, '#ffd28a', 0.25, 4);
        B.particle(m.tx, m.ty, 0, 0, '#ffb347', 0.12, 40 * B.cs, 0, false, 'flash');
      }
    }
    this.minis = this.minis.filter(m => !m.done);
  },
  draw(ctx, B) {
    if (!this.streaks.length && !this.minis.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const k of this.streaks) {
      ctx.globalAlpha = k.t / 0.18; ctx.strokeStyle = k.col; ctx.lineWidth = 3 * B.cs;
      ctx.beginPath(); ctx.moveTo(k.x1, k.y1); ctx.lineTo(k.x2, k.y2); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (const m of this.minis) { // kleiner Fisch auf einer Bogenbahn
      const p = Math.min(1, m.t / m.T), x = m.x + (m.tx - m.x) * p, y = m.y + (m.ty - m.y) * p - Math.sin(p * Math.PI) * 70 * B.cs;
      const a = Math.atan2(m.ty - m.y - Math.cos(p * Math.PI) * 70 * B.cs * Math.PI, m.tx - m.x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      Draw.ellipse(ctx, 0, 0, 8 * B.cs, 4 * B.cs, '#ffb347');
      Draw.tri(ctx, [-7 * B.cs, 0], [-13 * B.cs, -5 * B.cs], [-13 * B.cs, 5 * B.cs], '#ff8a3c');
      Draw.circle(ctx, 4 * B.cs, -1 * B.cs, 1.3 * B.cs, '#2a1a22');
      ctx.restore();
    }
    ctx.restore();
  },

  // ---------------------------------------------------------------- Grenzbruch feiern
  celebrate(w) {
    const k = LIMIT_SKILLS[w.t], s = this.stars(w);
    SFX.play('achievement');
    Battle.whiteFlash = Math.max(Battle.whiteFlash, 0.5);
    Battle.showBanner(s === 1 ? 'GRENZBRUCH!' : `GRENZBRUCH ★${s}!`, `${WEAPONS[w.t].name}: ${k.name}`, '#ffd34d');
    UI.modal({
      title: s === 1 ? '🌟 Grenzbruch!' : `🌟 Grenzbruch ★${s}`,
      cls: 'limitmodal',
      html: `<div class="lbhero"><span class="lbicon">${WEAPONS[w.t].icon}</span><span class="rbadge big" style="--rc:${RARITY[5].col}">MR</span></div>
        <p class="lbname"><b>${WEAPONS[w.t].name} ${U.roman(w.r)}</b></p>
        <p>${s === 1 ? 'Die Waffe hat ihre Grenze überschritten – eine neue Fähigkeit ist geboren:' : 'Die Fähigkeit wird stärker:'}</p>
        <div class="lbskill"><i>${k.icon}</i><div><b>${k.name}</b><small>${k.desc(s)}</small></div></div>
        ${s < 5 ? `<p class="muted">Zwei ${WEAPONS[w.t].name} ${U.roman(w.r)} verschmelzen zu ★${s + 1}.</p>` : '<p class="muted">Höchste Stufe erreicht – mehr geht nicht!</p>'}`,
      buttons: [{ label: 'Wahnsinn!', cls: 'primary' }],
    });
  },
};

// Stufen ab XVI heißen ★1 … ★5
const _lRoman = U.roman;
U.roman = n => (n >= LIMIT_FROM && n <= MAX_TIER ? '★' + (n - LIMIT_FROM + 1) : _lRoman(n));

// Verschmelzen zu einer Grenzbruch-Stufe: Feier und Hinweis
Game.listeners.push((ev, d) => {
  if (ev === 'merged' && d.w.r >= LIMIT_FROM) setTimeout(() => Limit.celebrate(d.w), 350);
});
const _lAuto = Game.autoMerge;
Game.autoMerge = function () {
  const before = new Set(S.grid.filter(w => w && w.r >= LIMIT_FROM));
  _lAuto.call(this);
  const fresh = S.grid.find(w => w && w.r >= LIMIT_FROM && !before.has(w));
  if (fresh) setTimeout(() => Limit.celebrate(fresh), 350);
};

// Kugeln tragen die Sterne ihrer Waffe
const _lFire = Battle.fire;
Battle.fire = function (i, w, target) {
  const n0 = this.bul.length;
  _lFire.call(this, i, w, target);
  const s = Limit.stars(w);
  if (s) for (let k = n0; k < this.bul.length; k++) this.bul[k].lim = s;
};
const _lHit = Battle.onBulletHit;
Battle.onBulletHit = function (b, o) { _lHit.call(this, b, o); if (b.lim) Limit.onHit(this, b, o); };
const _lUpd = Battle.update;
Battle.update = function (dt) { _lUpd.call(this, dt); Limit.update(this.frameDt || dt, this); };
const _lDraw = Talents.draw;
Talents.draw = function (ctx, B) { _lDraw.call(this, ctx, B); Limit.draw(ctx, B); };

// Waffenfeld: Raritäts-Plakette oben rechts, Grenzbruch mit goldenem Schimmer und Fähigkeit im Tooltip
const _lCell = UI.cellHtml;
UI.cellHtml = function (w, k, i, locked) {
  let h = _lCell.call(this, w, k, i, locked);
  if (!w || locked) return h;
  const ra = Limit.rarity(w.r), s = Limit.stars(w);
  h = h.replace('<span class="tier">', `<span class="rbadge" style="--rc:${ra.col}">${ra.id}</span><span class="tier">`);
  h = h.replace('\n(Doppelklick', `\nRarität: ${ra.name}${s ? '\n' + Limit.skillText(w) : ''}\n(Doppelklick`);
  if (s) h = h.replace('class="cell item', `class="cell item limit s${s}`);
  return h;
};
if (typeof SRC_LABEL !== 'undefined') { SRC_LABEL.limit = 'Grenzbruch'; SRC_COL.Grenzbruch = '#ffd34d'; }
