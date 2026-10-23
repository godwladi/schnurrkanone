'use strict';
// ---------------------------------------------------------------------------
// Erzwächter: jeder 100. Raum im Streifzug. Größer, zäher (×2,2 Leben, +20 s), goldener
// Runenring und drei Phasen mit je einer Fähigkeit (bei 75 %, 50 % und 25 % Leben):
//   Runenkreis  – vier Runenkristalle umkreisen ihn; solange einer leuchtet, nimmt er
//                 nur 25 % Schaden. Kristalle antippen zerschlägt sie (nach 12 s verlöschen sie).
//   Beschwörung – zwei Alpha-Leibwächter stellen sich vor ihn und fangen die Kugeln ab.
//   Meteorhagel – sechs Meteore stürzen auf die Katze; Schatten antippen zerschlägt sie.
//                 Danach ist er rasend und wirft schneller.
// Jeder Erzwächter hat sein festes Gebiet passend zum Schlüssel (Raum 100 Flüsterwald …
// Raum 900 Spiegelkabinett); Raum 1000 ist die Goldene Arena mit dem Goldenen Katzenkönig.
// Belohnung: ein Wächter-Schlüssel (10 Stück bis Raum 1000). Jeder Schlüssel gibt dauerhaft
// +5 % Schaden und +5 % Münzen, der goldene zehnte zusätzlich +25 %.
// ---------------------------------------------------------------------------

const ERZ_EVERY = 100;
const WARDEN_KEYS = [
  { n: 100,  icon: '🌿', name: 'Moosschlüssel',       col: '#6ee7a0', biome: 'Flüsterwald' },
  { n: 200,  icon: '🌵', name: 'Sandschlüssel',       col: '#ffbe76', biome: 'Sonnenwüste' },
  { n: 300,  icon: '❄️', name: 'Frostschlüssel',      col: '#9dbdff', biome: 'Frostgipfel' },
  { n: 400,  icon: '🔥', name: 'Glutschlüssel',       col: '#ff6a2b', biome: 'Lavagrund' },
  { n: 500,  icon: '💡', name: 'Neonschlüssel',       col: '#ff4fd8', biome: 'Neon-City' },
  { n: 600,  icon: '⭐', name: 'Sternenschlüssel',    col: '#ffe680', biome: 'Sternenmeer' },
  { n: 700,  icon: '🌑', name: 'Schattenschlüssel',   col: '#b48cff', biome: 'Die Leere' },
  { n: 800,  icon: '⏳', name: 'Zeitschlüssel',       col: '#ffd34d', biome: 'Zeitreise' },
  { n: 900,  icon: '💠', name: 'Spiegelschlüssel',    col: '#7ef9ff', biome: 'Spiegelkabinett' },
  { n: 1000, icon: '👑', name: 'Goldener Katzenschlüssel', col: '#ffcf3a', biome: 'Goldene Arena' },
];
const ERZ_PHASES = [
  { at: 0.75, id: 'runes',  name: 'RUNENKREIS!',  sub: 'Tippe die Kristalle an – solange sie leuchten, schützen sie ihn' },
  { at: 0.5,  id: 'summon', name: 'BESCHWÖRUNG!', sub: 'Zwei Alpha-Leibwächter stellen sich vor den Erzwächter' },
  { at: 0.25, id: 'meteor', name: 'METEORHAGEL!', sub: 'Schatten unter der Katze antippen – danach ist er rasend' },
];

// Goldene Arena: nur Raum 1000 (steht nicht in SPECIAL_ROOMS, wird also nie zufällig gewählt)
RUN_BIOMES.push({ name: 'Goldene Arena', special: 'arena', dark: true, sky: ['#1a0e04', '#7a4a0c'], hills: '#3a2208', hills2: '#4a2c0c',
  ground: '#4a300c', ground2: '#ffcf3a', obstacle: 'goldcat', foes: ['mknight', 'glassling', 'squid'], accent: '#ffcf3a',
  debris: ['#ffcf3a', '#fff1a8', '#b8860b'], desc: 'Das Finale der tausend Räume' });
Object.assign(BOSS_NAMES, { goldcat: 'Der Goldene Katzenkönig' });
Object.assign(BOSS_ATTACKS, { goldcat: { icon: '👑', name: 'Kronenwurf', n: 3, speed: 1.2, size: 1.1, dmg: 0.8 } });
Object.assign(OBST_H, { goldcat: 86 }); Object.assign(OBST_W, { goldcat: 70 });
NEW_FOES.goldcat = NEW_FOES.mirrorcat; // gleiche Figur, goldene Farben (rooms3.js)
SONGS.goldcat = { ...SONGS.vending, tempo: 120 };

const Warden = {
  crystals: [], meteors: [], meteorLeft: 0, meteorT: 0,

  keys() { return (S.wardenKeys = S.wardenKeys || []); },
  isErzRoom() { return Run.active && Run.room() % ERZ_EVERY === 0; },
  // festes Gebiet des Erzwächters (Index in RUN_BIOMES); ab Raum 1100 wiederholt sich der Kreis
  biomeFor(room) {
    const key = WARDEN_KEYS[(room / ERZ_EVERY - 1) % WARDEN_KEYS.length];
    const i = RUN_BIOMES.findIndex(b => b.name === key.biome);
    return i < 0 ? 0 : i;
  },
  // Dauerbonus aller Schlüssel
  mul() { const k = this.keys(); return (1 + 0.05 * k.length) * (k.includes(1000) ? 1.25 : 1); },

  setup(B, o) {
    o.erz = true; o.erzRoom = Run.room(); o.erzPhase = 0;
    o.hp = o.maxHp = o.maxHp * 2.2;
    // größer als ein Wächter, aber Krone, Name und Lebensbalken bleiben unter der Raumleiste
    const room = B.groundY - (B.uiTop ? B.uiTop() : 120) - 90 * B.cs;
    o.scale = Math.min(o.scale * 1.12, Math.max(o.scale * 0.85, room / OBST_H[o.kind]));
    o.shieldAt = [0.75, 0.5, 0.25];
    B.bossTimeMax += 20; B.bossTimer = B.bossTimeMax;
    this.crystals = []; this.meteors = []; this.meteorLeft = 0;
    const key = WARDEN_KEYS.find(k => k.n === o.erzRoom);
    B.showBanner(`ERZWÄCHTER DES ${o.erzRoom}. RAUMS!`, `${BOSS_NAMES[o.kind]} · ${B.bossTimeMax} s${key ? ` · bewacht den ${key.name}` : ''}`, '#ffcf3a');
    B.shake = 18; B.whiteFlash = Math.max(B.whiteFlash || 0, 0.4);
  },

  update(dt, B) {
    const o = B.bossObj;
    if (!o || !o.erz || o.dead) { this.crystals = []; this.meteors = []; this.meteorLeft = 0; return; }
    if (o.dying > 0 || B.bossIntro > 0) return;
    // nächste Phase, sobald das Leben unter die Schwelle fällt
    const ph = ERZ_PHASES[o.erzPhase];
    if (ph && o.hp <= o.maxHp * ph.at) { o.erzPhase++; this.start(B, o, ph); }
    // Kristalle kreisen und verlöschen nach 12 s
    for (const c of this.crystals) c.t += dt;
    this.crystals = this.crystals.filter(c => !c.done && c.t < 12);
    // Meteore: nacheinander anfliegen lassen
    if (this.meteorLeft > 0) {
      this.meteorT -= dt;
      if (this.meteorT <= 0) {
        this.meteorLeft--; this.meteorT = 1;
        const p = Vitals.catPoint(B);
        this.meteors.push({ x: p.x + U.rand(-24, 24) * B.cs, y: -40, vy: 0, warn: 1.1, r: U.rand(14, 19) * B.cs, rot: 0 });
      }
    }
    for (const m of this.meteors) {
      if (m.warn > 0) { m.warn -= dt; continue; }
      m.vy += 2400 * dt; m.y += m.vy * dt; m.rot += dt * 6;
      const hy = Vitals.catPoint(B).y - 16 * B.cs;
      if (m.y >= hy) {
        m.done = true;
        Vitals.hurt(B, Vitals.ref().maxHp * 0.08);
        for (let i = 0; i < 14; i++) B.particle(m.x, hy, U.rand(-200, 200), U.rand(-300, -60), U.pick(['#ff6a2b', '#ffd34d', '#5a3a2a']), 0.7, U.rand(3, 7) * B.cs, 1200, true, 'chunk');
        FX.addRing(m.x, hy, 70 * B.cs, '#ff8a3c', 0.3, 6);
        B.shake = Math.max(B.shake, 10);
        SFX.play('boom');
      }
    }
    this.meteors = this.meteors.filter(m => !m.done);
  },

  start(B, o, ph) {
    B.showBanner(ph.name, ph.sub, '#ffcf3a');
    SFX.play('boss');
    B.shake = Math.max(B.shake, 12);
    FX.addRing(o.x, o.y - OBST_H[o.kind] * o.scale * 0.5, 220 * B.cs, '#ffcf3a', 0.5, 9);
    if (ph.id === 'runes') {
      this.crystals = [0, 1, 2, 3].map(i => ({ a: i * Math.PI / 2, t: 0 }));
    } else if (ph.id === 'summon') {
      for (let i = 0; i < 2; i++) {
        const m = B.makeObstacle(false);
        const bm = biomeFor(S.stage);
        if (m.shade || m.treasure) { m.shade = null; m.kind = bm.foes ? U.pick(bm.foes) : bm.obstacle; }
        m.treasure = false; m.golden = m.fruit = false;
        if (!m.alpha) { m.alpha = true; m.hp = m.maxHp = m.maxHp * 4; m.scale *= 1.25; }
        m.bossMinion = true; m.minionIdx = i; m.x = B.W + 60 + i * 70;
        B.obs.unshift(m);
      }
    } else if (ph.id === 'meteor') {
      this.meteorLeft = 6; this.meteorT = 0.6;
      o.enraged = true;
    }
  },

  // Kristall-Lage (Welt): kreisen um die Körpermitte
  crystalPos(B, o, c) {
    const h = OBST_H[o.kind] * o.scale, a = c.a + B.t * 1.4;
    return { x: o.x + Math.cos(a) * h * 0.62, y: o.y - h * 0.55 + Math.sin(a) * h * 0.42 };
  },

  tap(B, x, y) {
    const o = B.bossObj;
    if (!o || !o.erz) return false;
    for (const c of this.crystals) {
      const p = this.crystalPos(B, o, c);
      if (Math.hypot(x - p.x, y - p.y) < 34 * B.cs) {
        c.done = true;
        for (let i = 0; i < 12; i++) B.particle(p.x, p.y, U.rand(-220, 220), U.rand(-260, 80), U.pick(['#ffcf3a', '#fff1a8', '#c9a6ff']), 0.6, U.rand(3, 6) * B.cs, 700, true, 'chunk');
        FX.addRing(p.x, p.y, 40 * B.cs, '#ffcf3a', 0.25, 5);
        B.text(p.x, p.y - 20 * B.cs, this.crystals.filter(k => !k.done).length ? 'KRISTALL ZERSCHLAGEN!' : 'RUNENKREIS GEBROCHEN!', '#ffcf3a', 15 * B.cs, true);
        SFX.play('crack', 2);
        return true;
      }
    }
    for (const m of this.meteors) {
      const my = m.warn > 0 ? B.groundY - 30 * B.cs : m.y;
      if (Math.abs(x - m.x) < 52 * B.cs && (Math.hypot(x - m.x, y - my) < 56 * B.cs || Math.abs(y - B.groundY) < 50 * B.cs)) {
        m.done = true;
        B.purr = Math.min(100, B.purr + 6);
        B.text(m.x, Math.max(60, my), 'ZERSCHLAGEN!', '#ffcf3a', 16 * B.cs, true);
        FX.addRing(m.x, Math.max(60, my), 44 * B.cs, '#ffcf3a', 0.25, 4);
        SFX.play('parry');
        return true;
      }
    }
    return false;
  },

  // Runenring, Aura, Kristalle und Meteore (in Weltkoordinaten, auch gespiegelt richtig)
  draw(ctx, o, t) {
    const B = Battle, h = OBST_H[o.kind] * o.scale, cx = o.x + (o.kx || 0), cy = o.y - h * 0.5, cs = B.cs;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    FX.drawGlow(ctx, cx, cy, h * 1.05, o.enraged ? '#ff6a2b' : '#ffcf3a', 0.32 + Math.sin(t * 3) * 0.08);
    ctx.globalCompositeOperation = 'source-over';
    // Runenring am Boden
    ctx.translate(cx, o.y);
    ctx.scale(1, 0.32);
    ctx.strokeStyle = 'rgba(255,207,58,0.75)'; ctx.lineWidth = 3;
    const R0 = h * 0.62;
    ctx.beginPath(); ctx.arc(0, 0, R0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R0 * 0.82, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + t * 0.8;
      Draw.circle(ctx, Math.cos(a) * R0 * 0.91, Math.sin(a) * R0 * 0.91, 4.5, i % 2 ? '#ffcf3a' : '#fff1a8');
    }
    ctx.restore();
  },
  drawFront(ctx, o, t) {
    const B = Battle, cs = B.cs;
    for (const c of this.crystals) {
      const p = this.crystalPos(B, o, c), fade = c.t > 10 ? (12 - c.t) / 2 : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';
      FX.drawGlow(ctx, p.x, p.y, 26 * cs, '#ffcf3a', 0.6 + Math.sin(t * 8 + c.a) * 0.15);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,207,58,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(o.x, o.y - OBST_H[o.kind] * o.scale * 0.55); ctx.stroke();
      ctx.translate(p.x, p.y); ctx.rotate(t * 2 + c.a); ctx.scale(cs, cs);
      Draw.tri(ctx, [0, -16], [10, 0], [0, 16], '#ffe680'); Draw.tri(ctx, [0, -16], [-10, 0], [0, 16], '#ffcf3a');
      Draw.tri(ctx, [0, -9], [4, 0], [0, 6], '#ffffff');
      ctx.restore();
    }
    if (this.crystals.length && !(o.dying > 0)) {
      ctx.save(); ctx.font = `900 ${12 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.9)';
      const ty = o.y - 14 * cs, txt = `🛡️ Nur 25 % Schaden · ${this.crystals.length} Kristalle antippen!`; // unten am Körper, über dem Schnurr-Meter
      ctx.strokeText(txt, o.x, ty); ctx.fillStyle = '#ffcf3a'; ctx.fillText(txt, o.x, ty); ctx.restore();
    }
    for (const m of this.meteors) {
      if (m.warn > 0) {
        const a = 0.35 + Math.sin(B.t * 20) * 0.15;
        ctx.save(); ctx.globalAlpha = a; Draw.ellipse(ctx, m.x, B.groundY - 2, m.r * 1.8 * (1.4 - m.warn * 0.4), m.r * 0.5, '#ff4d6d');
        ctx.globalAlpha = 1; ctx.font = `900 ${13 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const ay = B.groundY - 112 * cs; // über dem Kopf der Katze, die Skill-Leiste verdeckt sonst den Hinweis
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.9)'; ctx.strokeText('☄️ ANTIPPEN!', m.x, ay); ctx.fillStyle = '#ffcf3a'; ctx.fillText('☄️ ANTIPPEN!', m.x, ay);
        ctx.restore();
        continue;
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.drawGlow(ctx, m.x, m.y, m.r * 2.6, '#ff6a2b', 0.8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.translate(m.x, m.y); ctx.rotate(m.rot);
      Draw.circle(ctx, 0, 0, m.r, '#5a3a2a'); Draw.circle(ctx, -m.r * 0.3, -m.r * 0.2, m.r * 0.3, '#3a2418'); Draw.circle(ctx, m.r * 0.35, m.r * 0.3, m.r * 0.2, '#3a2418');
      ctx.restore();
    }
  },

  // Belohnung nach dem Sieg: Schlüssel (einmalig je Erzwächter-Raum)
  reward(B, o) {
    this.crystals = []; this.meteors = []; this.meteorLeft = 0;
    const key = WARDEN_KEYS.find(k => k.n === o.erzRoom);
    const ks = this.keys();
    if (!key || ks.includes(key.n)) {
      S.bones += 25;
      B.showBanner('ERZWÄCHTER BESIEGT!', '+25 🦴 – diesen Schlüssel hast du schon', '#ffcf3a');
      return;
    }
    ks.push(key.n); ks.sort((a, b) => a - b);
    recalc(); Save.write();
    SFX.play('achievement');
    setTimeout(() => UI.modal({
      title: '🗝️ Wächter-Schlüssel!', cls: 'keymodal',
      html: `<div class="key-hero" style="--kc:${key.col}"><i>${key.icon}</i><b>${key.name}</b><small>vom Erzwächter des ${key.n}. Raums</small></div>
        <p>Dauerhaft <b>+5 % Schaden</b> und <b>+5 % Münzen</b>${key.n === 1000 ? ' – und der goldene Schlüssel noch einmal <b>+25 %</b>!' : ''} (überall, auch im Hauptspiel).</p>
        ${this.ringHtml()}
        <p class="muted">${ks.length < 10 ? `Noch ${10 - ks.length} Schlüssel bis Raum 1000.` : 'Alle zehn Schlüssel! Das Tor der Tausend Räume steht dir offen.'}</p>`,
      buttons: [{ label: 'Weiter', cls: 'primary' }],
    }), 600);
  },

  // Schlüsselbund: 10 Plätze, gesammelte leuchten
  ringHtml() {
    const ks = this.keys();
    return `<div class="keyring">${WARDEN_KEYS.map(k => {
      const has = ks.includes(k.n);
      return `<span class="${has ? 'on' : ''}" style="--kc:${k.col}" title="${has ? k.name : `Raum ${k.n}`}"><i>${has ? k.icon : '🔒'}</i><small>${k.n}</small></span>`;
    }).join('')}</div>`;
  },
};

// ---------------------------------------------------------------- Einhängen
// Wegkarte vor einem Erzwächter-Raum: nur eine Pflicht-Tür ins feste Gebiet
const _wDoors = Path.rollDoors;
Path.rollDoors = function (afterStop) {
  if (Run.room() % ERZ_EVERY === 0) return [{ type: 'fight', biome: Warden.biomeFor(Run.room()), guard: true, erz: true }];
  return _wDoors.call(this, afterStop);
};
// Absicherung (z. B. eine noch gespeicherte alte Wegkarte): Erzwächter-Raum immer im festen Gebiet
const _wEnter = Run.enterRoom;
Run.enterRoom = function (biome, kind) {
  if (Run.room() % ERZ_EVERY === 0) { biome = Warden.biomeFor(Run.room()); kind = 'fight'; }
  return _wEnter.call(this, biome, kind);
};
// Hintergrund der Goldenen Arena: Ränge mit Publikum, Säulen mit Fackeln, goldener Sand, Konfetti
const _wBg = Rooms.drawBg;
Rooms.drawBg = function (ctx, B, biome) {
  if (biome.special !== 'arena') return _wBg.call(this, ctx, B, biome);
  const W = B.W, H = B.H, gy = B.groundY, t = B.t, sc = B.scroll;
  this.sky(ctx, B, biome);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  FX.drawGlow(ctx, W * 0.55, gy * 0.3, Math.min(W, H) * 0.45, '#ffcf3a', 0.25);
  ctx.restore();
  for (let r = 0; r < 3; r++) {
    const y = gy - 150 + r * 38;
    ctx.fillStyle = r % 2 ? '#3a2208' : '#4a2c0c'; ctx.fillRect(-20, y, W + 40, 38);
    for (let x = -((sc * 0.2 + r * 17) % 22); x < W + 22; x += 22) Draw.circle(ctx, x, y + 10, 5, `hsl(${Math.round(x * 7 + r * 60) % 360},60%,${Math.round(45 + Math.sin(t * 3 + x) * 10)}%)`);
  }
  const sp = 160, so = (sc * 0.4) % sp;
  for (let x = -so; x < W + sp; x += sp) {
    Draw.rrect(ctx, x - 14, gy - 190, 28, 190, 6, '#c9a227'); Draw.rrect(ctx, x - 20, gy - 200, 40, 14, 4, '#ffd34d');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    FX.drawGlow(ctx, x, gy - 214, 40, '#ff8a3c', 0.6 + Math.sin(t * 12 + x) * 0.12); FX.drawGlow(ctx, x, gy - 216, 12, '#fff1a8', 0.9);
    ctx.restore();
  }
  ctx.fillStyle = biome.ground; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
  ctx.fillStyle = 'rgba(255,207,58,0.18)';
  for (let x = -(sc % 30); x < W + 30; x += 30) ctx.fillRect(x, gy + 12, 16, 3);
  for (let i = 0; i < 18; i++) {
    const x = (i * 83 + t * 30) % (W + 40) - 20, y = ((t * (40 + i % 4 * 12) + i * 57) % (gy + 20)) - 20;
    ctx.fillStyle = `hsl(${i * 40},90%,62%)`; ctx.fillRect(x, y, 4, 7);
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.fillStyle = biome.ground2; ctx.fillRect(-20, gy, W + 40, 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
};
const _wSpawn = Battle.spawnBoss;
Battle.spawnBoss = function () {
  _wSpawn.call(this);
  if (Warden.isErzRoom() && this.bossObj) Warden.setup(this, this.bossObj);
};
const _wUpdate = Battle.update;
Battle.update = function (dt) { _wUpdate.call(this, dt); Warden.update(dt, this); };
const _wDamage = Battle.damage;
Battle.damage = function (o, amount, canCrit, quiet, src) {
  if (o && o.erz && Warden.crystals.length) amount *= 0.25; // Runenkreis schützt
  return _wDamage.call(this, o, amount, canCrit, quiet, src);
};
const _wKill = Battle.kill;
Battle.kill = function (o) {
  const win = !o.dead && o.erz;
  _wKill.call(this, o);
  if (win) Warden.reward(this, o);
};
const _wTap = Rooms.tap;
Rooms.tap = function (B, x, y) { return Warden.tap(B, x, y) || _wTap.call(this, B, x, y); };
const _wDraw = Draw.obstacle;
Draw.obstacle = function (ctx, o, biome, t) {
  if (o.erz && !o.dead) Warden.draw(ctx, o, t);
  _wDraw.call(this, ctx, o, biome, t);
  if (o.erz && !o.dead) Warden.drawFront(ctx, o, t);
};
// Dauerbonus der Schlüssel
const _wRecalc = recalc;
recalc = function () {
  _wRecalc();
  const k = Warden.mul();
  if (k === 1) return;
  R.dmgMult *= k; R.dps *= k; R.clickDmg *= k; R.coinMult *= k;
};
// Reiter Streifzug: Schlüsselbund und Hinweis auf die Erzwächter
const _wTab = UI.tab_run;
UI.tab_run = function () {
  const html = _wTab.call(this);
  if (S.best < RUN_UNLOCK) return html;
  return html + `<div class="sec"><h3>🗝️ Wächter-Schlüssel <small>${Warden.keys().length} / 10</small></h3>
    <p class="muted">Jeder <b>100. Raum</b> ist ein Erzwächter mit Runenkreis, Beschwörung und Meteorhagel. Sein Schlüssel gibt dauerhaft +5 % Schaden und Münzen.</p>
    ${Warden.ringHtml()}</div>`;
};
