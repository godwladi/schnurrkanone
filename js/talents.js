'use strict';
// ---------------------------------------------------------------------------
// Katzen-Talente: jede aktive Katze hat eine eigene, automatisch ausgelöste
// Fähigkeit mit eigener Grafik und eigenem Sound. Dazu der Level-Up-Effekt.
// ---------------------------------------------------------------------------

const TALENTS = {
  hairball: { name: 'Haarballen',      icon: '🧶', cd: 10, desc: 'Spuckt alle 10 s einen Haarballen (3× DPS)' },
  shuriken: { name: 'Shuriken-Hagel',  icon: '✴️', cd: 6,  desc: 'Wirft alle 6 s drei Shuriken (je 1,5× DPS, durchschlagend)' },
  cannon:   { name: 'Breitseite',      icon: '💣', cd: 9,  desc: 'Feuert alle 9 s eine Kanonenkugel (6× DPS, Explosion)' },
  stars:    { name: 'Sternschauer',    icon: '🌠', cd: 8,  desc: 'Lässt alle 8 s fünf Sterne regnen (je 1,5× DPS)' },
  espresso: { name: 'Espresso',        icon: '☕', cd: 15, desc: 'Alle 15 s: 4 s lang +60% Feuerrate' },
  sword:    { name: 'Ritterschlag',    icon: '⚔️', cd: 7,  desc: 'Alle 7 s ein Schwerthieb (5× DPS, 3× gegen Bosse, zerschlägt Schilde)' },
  pixel:    { name: 'Pixelstrahl',     icon: '👾', cd: 8,  desc: 'Alle 8 s ein 8-Bit-Strahl durch alle Ziele (4× DPS)' },
  nebula:   { name: 'Nebelfokus',      icon: '🔮', cd: 12, desc: 'Alle 12 s: 3 s lang nur kritische Treffer' },
  galaxy:   { name: 'Schwarzes Loch',  icon: '🌀', cd: 14, desc: 'Alle 14 s ein Schwarzes Loch (10× DPS über 2 s)' },
  midas:    { name: 'Goldene Pfote',   icon: '👑', cd: 15, desc: 'Verwandelt alle 15 s das vorderste Hindernis in Gold' },
  quantum:  { name: 'Quantenkiste',    icon: '📦', cd: 10, desc: 'Alle 10 s: 50% Chance, ein Hindernis sofort aufzulösen' },
  ninefire: { name: 'Neun Feuer',      icon: '🔥', cd: 9,  desc: 'Schießt alle 9 s neun Feuerbälle (je 1,5× DPS)' },
};
const CAT_TALENT = {
  mieze: 'hairball', socke: 'hairball', grauchen: 'hairball', tiger: 'hairball', flocke: 'hairball',
  ninja: 'shuriken', kapitaen: 'cannon', luna: 'stars', mocca: 'espresso',
  maunz: 'sword', pixel: 'pixel', nebel: 'nebula',
  galaxia: 'galaxy', midas: 'midas', schroedinger: 'quantum', neunschwanz: 'ninefire',
};

const LEVEL_T = 2.6, LEVEL_STRIKE = 0.14; // Dauer des Level-Up-Effekts (s), Anteil des Herabfahrens

const Talents = {
  cd: 4, fx: [], hole: null, espresso: 0, focus: 0, levelFx: 0, levelHit: true, lastCat: null,

  id() { return CAT_TALENT[S.activeCat] || 'hairball'; },
  def() { return TALENTS[this.id()]; },
  power() { return 1 + 0.1 * ((S.cats[S.activeCat] || 1) - 1); },
  rateMul() { return this.espresso > 0 ? 1.6 : 1; },

  update(dt, B) {
    if (this.lastCat !== S.activeCat) { this.lastCat = S.activeCat; this.cd = Math.min(this.cd, 3); }
    this.espresso = Math.max(0, this.espresso - dt);
    this.focus = Math.max(0, this.focus - dt);
    this.levelFx = Math.max(0, this.levelFx - dt);
    for (const f of this.fx) f.life -= dt;
    this.fx = this.fx.filter(f => f.life > 0);
    const lp = this.levelFx > 0 ? 1 - this.levelFx / LEVEL_T : 1;
    if (!this.levelHit && lp >= LEVEL_STRIKE) { this.levelHit = true; this.levelImpact(B); }
    if (lp > 0.2 && lp < 0.75 && Math.random() < dt * 30) {
      B.particle(B.catX + U.rand(-30, 30) * B.cs, B.groundY - U.rand(0, 40) * B.cs, U.rand(-20, 20), U.rand(-260, -120), U.pick(['#ffe680', '#ffffff', '#ffd34d']), 1, U.rand(5, 9) * B.cs, 0, false, 'star');
    }
    const h = this.hole;
    if (h) {
      h.t -= dt;
      for (const o of B.obs) {
        if (o.dead || o.fleeing || o.dying > 0) continue;
        if (Math.abs(o.x - h.x) < h.r * 1.4) {
          B.damage(o, R.dps * 5 * dt * this.power(), false, true, 'laser');
          if (!o.boss) o.x += (h.x - o.x) * Math.min(1, dt * 2);
        }
      }
      if (Math.random() < dt * 60) {
        const a = Math.random() * Math.PI * 2, d = h.r * U.rand(1.2, 2);
        B.particle(h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, -Math.cos(a) * d * 2.5, -Math.sin(a) * d * 2.5, U.pick(['#9d7bff', '#ff7ad9', '#ffffff']), 0.35, 3 * B.cs, 0, false, 'spark');
      }
      if (h.t <= 0) {
        FX.addRing(h.x, h.y, h.r * 2.5, '#c084fc', 0.4, 10);
        B.shake = Math.max(B.shake, 8);
        this.hole = null;
      }
    }
    const tgt = B.front();
    if (!tgt) return;
    this.cd -= dt;
    if (this.cd <= 0) { this.cd = this.def().cd; this.trigger(B, tgt); }
  },

  trigger(B, tgt) {
    const id = this.id(), p = this.power(), cs = B.cs;
    const mx = B.catX + 26 * cs, my = B.groundY - 38 * cs;
    const ty = tgt.y - OBST_H[tgt.kind] * tgt.scale * 0.5;
    B.text(B.catX + 10 * cs, B.groundY - 100 * cs, `${this.def().icon} ${this.def().name}!`, '#ffe14d', 15 * cs, true);
    FX.addRing(B.catX + 5 * cs, B.groundY - 35 * cs, 70 * cs, '#ffe680', 0.3, 5);
    // Haarballen kommt aus dem Maul, alles andere aus dem Lauf der Hauptwaffe
    const mz = B.muzzles[0] || { x: mx, y: my };
    const shot = (o) => {
      const fromGun = o.sprite !== 'hairball';
      if (fromGun) B.muzzleFx(mz.x, mz.y, o.color, 0.9);
      B.shootBullet(fromGun ? mz.x : mx, fromGun ? mz.y : my, tgt, Object.assign({ type: 'talent', noCrit: false }, o));
    };
    switch (id) {
      case 'hairball':
        shot({ dmg: R.dps * 3 * p, color: '#c9a27e', size: 10 * cs, speed: 650, sprite: 'hairball', arc: true });
        SFX.play('hairball'); break;
      case 'shuriken':
        for (let k = 0; k < 3; k++) shot({ dmg: R.dps * 1.5 * p, color: '#d7dde8', size: 9 * cs, speed: 1150 + k * 80, sprite: 'shuriken', spread: 0.12, pierce: 2 });
        SFX.play('meteor'); break;
      case 'cannon':
        shot({ dmg: R.dps * 6 * p, color: '#ffb347', size: 11 * cs, speed: 620, sprite: 'cannon', splash: 140 * cs });
        B.particle(mz.x, mz.y, 0, 0, '#ffb347', 0.15, 45 * cs, 0, false, 'flash');
        for (let i = 0; i < 10; i++) B.particle(mz.x, mz.y, U.rand(-60, 60), U.rand(-120, -20), 'rgba(255,255,255,0.6)', 0.8, U.rand(8, 14) * cs, -20, false, 'smoke');
        B.shake = Math.max(B.shake, 6);
        SFX.play('boom'); break;
      case 'stars': {
        // reihum auf alle sichtbaren Gegner verteilt; jeder Stern fliegt durch zu seinem Ziel
        const foes = B.obs.filter(o => !o.dead && !o.fleeing && !(o.dying > 0) && o.x < B.W - 20);
        if (!foes.length) foes.push(tgt);
        for (let k = 0; k < 5; k++) {
          const o = foes[k % foes.length], y0 = -40 - k * 45, vx = 260, vy = 760;
          const hy = o.y - OBST_H[o.kind] * o.scale * 0.55;
          B.bul.push({
            x: o.x - vx * (hy - y0) / vy + U.rand(-10, 10) * cs, y: y0, vx, vy, aim: o,
            dmg: R.dps * 1.5 * p, color: '#ffe680', size: 9 * cs, pierce: 0, splash: 0, arc: false, phase: 0, life: 3,
            hit: new Set(), type: 'talent', sprite: 'star', src: 'bullet', needY: true, trail: [],
          });
        }
        SFX.play('event'); break;
      }
      case 'espresso':
        this.espresso = 4;
        B.text(B.catX + 10 * cs, B.groundY - 120 * cs, '+60% Feuerrate', '#ffd6a5', 13 * cs);
        for (let i = 0; i < 12; i++) B.particle(B.catX + U.rand(-15, 25) * cs, B.groundY - 60 * cs, U.rand(-30, 30), U.rand(-120, -60), 'rgba(255,255,255,0.7)', 1.2, U.rand(6, 10) * cs, -20, false, 'smoke');
        SFX.play('slurp'); break;
      case 'sword':
        B.damage(tgt, R.dps * 5 * p * (tgt.boss ? 3 : 1), true, false, 'paw');
        this.fx.push({ type: 'slash', x: tgt.x, y: ty, r: OBST_H[tgt.kind] * tgt.scale * 0.7, life: 0.3, max: 0.3 });
        B.hitStop = Math.max(B.hitStop, 0.05);
        SFX.play('slash'); break;
      case 'pixel':
        for (const o of B.obs) if (!o.dead && !o.fleeing && !(o.dying > 0)) B.damage(o, R.dps * 4 * p, false, false, 'laser');
        this.fx.push({ type: 'pixel', x: mx, y: my, life: 0.45, max: 0.45 });
        SFX.play('pixel'); break;
      case 'nebula':
        this.focus = 3;
        FX.addRing(B.catX, B.groundY - 35 * cs, 160 * cs, '#c084fc', 0.5, 8);
        SFX.play('shield'); break;
      case 'galaxy':
        this.hole = { x: tgt.x, y: ty, t: 2, max: 2, r: 70 * cs };
        SFX.play('void'); break;
      case 'midas':
        if (!tgt.boss && !tgt.golden && !tgt.treasure) {
          tgt.golden = tgt.fruit = true;
          for (let i = 0; i < 25; i++) B.particle(tgt.x + U.rand(-30, 30), ty + U.rand(-40, 40), U.rand(-80, 80), U.rand(-160, -40), '#ffe680', 1, U.rand(6, 10) * cs, 0, false, 'star');
          B.text(tgt.x, ty - 50, 'GOLD!', '#ffd34d', 22 * cs, true);
        } else B.damage(tgt, R.dps * 3 * p, true);
        FX.addRing(tgt.x, ty, 90 * cs, '#ffd34d', 0.4, 6);
        SFX.play('reveal', 3); break;
      case 'quantum':
        this.fx.push({ type: 'box', x: tgt.x, y: ty, life: 0.6, max: 0.6 });
        if (!tgt.boss && Math.random() < 0.5) {
          B.text(tgt.x, ty - 50, 'Kollabiert!', '#a3e635', 20 * cs, true);
          B.damage(tgt, tgt.hp + 1, false);
        } else {
          B.text(tgt.x, ty - 50, 'Miau? Noch da.', '#cbd5e1', 15 * cs);
          B.damage(tgt, R.dps * 2 * p, true);
        }
        SFX.play('pop'); break;
      case 'ninefire':
        for (let k = 0; k < 9; k++) shot({ dmg: R.dps * 1.5 * p, color: '#ff7a2b', size: 7 * cs, speed: U.rand(700, 1050), sprite: 'fire', spread: 0.3 });
        SFX.play('rocket'); SFX.play('meow', 1.25); break;
    }
  },

  // Projektil-Grafiken der Talente
  drawBullet(ctx, b, t, yOff) {
    const s = b.size;
    ctx.save();
    ctx.translate(b.x, b.y + yOff);
    switch (b.sprite) {
      case 'hairball':
        ctx.rotate(t * 8);
        Draw.circle(ctx, 0, 0, s, '#b08968');
        ctx.strokeStyle = '#7f5539'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) { const a = i; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.3); ctx.lineTo(Math.cos(a) * s * 1.3, Math.sin(a) * s * 1.3); ctx.stroke(); }
        break;
      case 'shuriken':
        ctx.rotate(t * 25);
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.35 : s * 1.2, a = i * Math.PI / 4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
        Draw.circle(ctx, 0, 0, s * 0.2, '#374151');
        break;
      case 'cannon':
        Draw.circle(ctx, 0, 0, s, '#2b2b33');
        Draw.circle(ctx, -s * 0.3, -s * 0.3, s * 0.3, 'rgba(255,255,255,0.5)');
        break;
      case 'star':
        ctx.rotate(t * 6);
        ctx.fillStyle = '#ffe680';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.45 : s * 1.1, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill();
        break;
      case 'fire':
        Draw.circle(ctx, 0, 0, s, '#ff7a2b');
        Draw.circle(ctx, s * 0.2, 0, s * 0.55, '#ffe066');
        break;
    }
    ctx.restore();
  },

  // Effekte in der Szene (mit Kamera)
  draw(ctx, B) {
    const cs = B.cs, t = B.t;
    // Level-Up-Lichtsäule: Strahl fährt vom Himmel herab, blüht zur Säule auf,
    // atmet kurz und zerfällt dann in aufsteigende Funken
    if (this.levelFx > 0) this.drawLevel(ctx, B, 1 - this.levelFx / LEVEL_T);
    // Nebelfokus-Aura
    if (this.focus > 0) {
      ctx.save(); ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(B.catX + 5 * cs, B.groundY - 35 * cs, (48 + Math.sin(t * 10) * 4) * cs, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const h = this.hole;
    if (h) {
      const k = Math.min(1, (h.max - h.t) * 4, h.t * 3), r = h.r * k;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      FX.drawGlow(ctx, h.x, h.y, r * 2.6, '#9d7bff', 0.8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(h.x, h.y); ctx.rotate(t * 5);
      ctx.strokeStyle = 'rgba(255,122,217,0.8)'; ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.arc(r * 0.5, 0, r * 0.75, Math.PI * 0.9, Math.PI * 1.6); ctx.stroke(); }
      Draw.circle(ctx, 0, 0, r * 0.55, '#05030c');
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    for (const f of this.fx) {
      const a = f.life / f.max;
      ctx.save();
      if (f.type === 'slash') {
        ctx.globalAlpha = a;
        ctx.translate(f.x, f.y); ctx.rotate(-0.6);
        ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
        ctx.lineWidth = 10 * a * cs;
        ctx.beginPath(); ctx.arc(0, 0, f.r, -1.2 + (1 - a) * 0.6, 1.2 + (1 - a) * 0.6); ctx.stroke();
        ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 3 * cs;
        ctx.beginPath(); ctx.arc(0, 0, f.r * 0.85, -1.1, 1.1); ctx.stroke();
      } else if (f.type === 'pixel') {
        const cols = ['#ff5d73', '#ffd34d', '#6ee7a0', '#5ab0ff', '#c084fc'];
        const sz = 9 * cs;
        ctx.globalAlpha = Math.min(1, a * 2);
        for (let x = f.x, i = 0; x < B.W; x += sz, i++) {
          const wob = Math.sin(i * 0.8 + t * 30) * 3 * cs;
          ctx.fillStyle = cols[(i + Math.floor(t * 20)) % cols.length];
          ctx.fillRect(x, f.y - sz / 2 + wob, sz - 1, sz - 1);
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.fillRect(x + 2, f.y - sz / 2 + wob + 2, 2, 2);
        }
      } else if (f.type === 'box') {
        const sc = 1 + (1 - a) * 0.6;
        ctx.globalAlpha = a;
        ctx.translate(f.x, f.y); ctx.scale(sc, sc);
        Draw.rrect(ctx, -22 * cs, -18 * cs, 44 * cs, 36 * cs, 4, '#c4a173');
        ctx.fillStyle = '#5a4420'; ctx.font = `900 ${20 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, 2);
      }
      ctx.restore();
    }
  },

  levelUp(B, d) {
    this.levelFx = LEVEL_T; this.levelHit = false;
    B.showBanner(`LEVEL ${d.level}!`, `+1% Schaden & Münzen · +${d.bones} 🦴${d.chest ? ' · Gratis-Kiste!' : ''}`, '#ffd34d');
    SFX.play('levelup');
  },
  // Einschlag, sobald der Strahl die Katze erreicht: Ringe, Konfetti, Zoom-Stoß
  levelImpact(B) {
    const cx = B.catX + 5 * B.cs, cy = B.groundY - 35 * B.cs;
    FX.addRing(cx, cy, 160 * B.cs, '#ffd34d', 0.6, 10);
    FX.addRing(cx, B.groundY, 300 * B.cs, '#fff1a8', 0.9, 5);
    for (let i = 0; i < 60; i++) B.particle(cx + U.rand(-60, 60), cy - U.rand(0, 80), U.rand(-200, 200), U.rand(-450, -150), `hsl(${U.randi(30, 60)},95%,${U.randi(55, 80)}%)`, U.rand(1, 2), U.rand(4, 8), 400, false, 'confetti');
    B.punchZoom(0.05, cx, cy);
  },
  drawLevel(ctx, B, p) {
    const cs = B.cs, t = B.t, gy = B.groundY, cx = B.catX + 5 * cs;
    const out = x => 1 - Math.pow(1 - U.clamp(x, 0, 1), 3);
    const pA = U.clamp(p / LEVEL_STRIKE, 0, 1);              // Strahl fährt herab
    const pB = out((p - LEVEL_STRIKE) / 0.16);                // Säule blüht auf
    const pD = U.clamp((p - 0.66) / 0.34, 0, 1);              // Auflösen
    const fade = Math.pow(1 - pD, 1.6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // 1) Leitstrahl von oben, mit hellem Kopf
    if (pA < 1 || p < LEVEL_STRIKE + 0.08) {
      const tipY = gy * out(pA), a = pA < 1 ? 1 : 1 - (p - LEVEL_STRIKE) / 0.08;
      const lg = ctx.createLinearGradient(0, tipY - 160 * cs, 0, tipY);
      lg.addColorStop(0, 'rgba(255,240,170,0)'); lg.addColorStop(1, 'rgba(255,250,220,0.95)');
      ctx.globalAlpha = a; ctx.fillStyle = lg;
      ctx.fillRect(cx - 2.5 * cs, 0, 5 * cs, tipY);
      FX.drawGlow(ctx, cx, tipY, 26 * cs, '#fff6d0', a);
    }
    if (pB > 0) {
      // 2) weiche Säule: elliptischer Verlauf, am Boden am hellsten, nach oben/außen weich
      const breathe = 1 + Math.sin(t * 5) * 0.04;
      const w = 52 * cs * pB * (1 - pD * 0.75) * breathe, lift = pD * pD * 90 * cs;
      for (const [k, c0, c1] of [[1, 'rgba(255,214,100,0.32)', 'rgba(255,200,80,0.14)'], [0.32, 'rgba(255,250,225,0.45)', 'rgba(255,236,170,0.22)']]) {
        ctx.save();
        ctx.translate(cx, gy - lift); ctx.scale(w * k, gy * (0.85 + 0.15 * pB));
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        rg.addColorStop(0, c0); rg.addColorStop(0.4, c1); rg.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.globalAlpha = fade; ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(0, 0, 1, Math.PI, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // 3) Aura um die Katze + Bodenring, der sich beim Auflösen weitet
      ctx.globalAlpha = 1;
      FX.drawGlow(ctx, cx, gy - 32 * cs, (78 + Math.sin(t * 9) * 6) * cs * (0.6 + 0.4 * pB), '#ffd34d', 0.32 * fade);
      const rx = (34 + 14 * pB + pD * 50) * cs;
      ctx.globalAlpha = 0.75 * fade; ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 2.2 * cs;
      ctx.setLineDash([10 * cs, 7 * cs]); ctx.lineDashOffset = -t * 40 * cs;
      ctx.beginPath(); ctx.ellipse(cx, gy, rx, rx * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // 4) Lichtfunken steigen in der Säule auf und stieben beim Auflösen auseinander
      for (let i = 0; i < 22; i++) {
        const ph = (t * (0.45 + (i % 5) * 0.08) + i * 0.618) % 1;
        const spread = (0.35 + pD * 1.8) * 52 * cs;
        const x = cx + Math.sin(i * 12.9898 + t * 1.7) * spread * (0.4 + ph * 0.6);
        const y = gy - 10 * cs - ph * gy * (0.75 + pD * 0.3);
        const a = Math.sin(ph * Math.PI) * (pD > 0 ? 1 - pD * pD : pB);
        FX.drawGlow(ctx, x, y, (3 + (i % 3)) * cs * (1 + pD), i % 4 ? '#ffe680' : '#ffffff', a);
      }
    }
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// Talent-Sounds
// ---------------------------------------------------------------------------
const _play3 = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  switch (name) {
    case 'hairball':
      this.noiseF(0.08, 0.25, 0, 900, 'bandpass', 2);
      this.noiseF(0.1, 0.3, 0.12, 700, 'bandpass', 2);
      this.tone(300, 0.15, 'square', 0.06, -150, 0.22);
      return;
    case 'slash': {
      const c = this.ctx, t = c.currentTime;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noiseBuf; src.loop = true;
      f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(7000, t + 0.15);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.25);
      this.tone(2400, 0.3, 'triangle', 0.05, 0, 0.05);
      return;
    }
    case 'pixel':
      [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.06, 'square', 0.06, 0, i * 0.035));
      return;
    case 'void':
      this.tone(220, 1.6, 'sawtooth', 0.08, -170);
      this.tone(110, 1.8, 'sine', 0.15, -60);
      this.noiseF(1.6, 0.08, 0, 400, 'lowpass');
      return;
    case 'slurp':
      this.noiseF(0.25, 0.15, 0, 1200, 'bandpass', 4);
      this.tone(400, 0.2, 'sine', 0.08, 300, 0.05);
      this.tone(880, 0.15, 'triangle', 0.06, 0, 0.3);
      return;
    case 'levelup':
      [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.25, 'square', 0.06, 0, i * 0.06));
      [1047, 1319, 1568].forEach(f => this.tone(f, 0.9, 'triangle', 0.06, 0, 0.45));
      return;
  }
  return _play3.call(this, name, arg);
};
