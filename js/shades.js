'use strict';
// ---------------------------------------------------------------------------
// Schattenwesen: tauchen ab Stufe 6 gelegentlich auf, drängeln sich nach vorn und
// wirken einen Frost-Fluch. Ein Ring zeigt die verbleibende Zeit, eine Blase über
// dem Kopf, WAS eingefroren wird (ein Skill, das Katzen-Talent oder eine
// Geisterkatze samt Waffe oder einen Begleiter: Maus-Drohne, Goldfisch, Eule).
// Wird das Wesen nicht rechtzeitig besiegt, ist die Fähigkeit 15 s eingefroren –
// eingefrorene Geisterkatzen lassen sich nicht umrüsten, eingefrorene Begleiter
// verlieren so lange ihren Bonus. Pfotenhiebe machen 3× Schaden an Schatten (Licht!).
// ---------------------------------------------------------------------------

const SHADE_FROM = 6;          // ab dieser Stufe (im Streifzug ab Raum 3)
const SHADE_CHANCE = 0.07;     // je neu erscheinendem Gegner
const SHADE_CAST = 7;          // Sekunden bis zum Fluch
const FREEZE_TIME = 15;        // so lange bleibt die Fähigkeit eingefroren

const ICE_IN = 0.35;           // Sekunden, bis das Eis ganz geschlossen ist

const Shades = {
  frozen: {},   // 'skill:laser' | 'talent' | 'slot:2' | 'pet:owl' → Restsekunden
  at: {},       // Schlüssel → Battle.t beim Einfrieren (Figur erstarrt in dieser Haltung)

  isFrozen(key) { return (this.frozen[key] || 0) > 0; },
  since(key) { return this.at[key] !== undefined ? this.at[key] : Battle.t; },
  // Stärke des Eises: wächst beim Einfrieren zu, flackert kurz vor dem Auftauen (Risse)
  iceAmt(key) {
    const grow = U.clamp((Battle.t - this.since(key)) / ICE_IN, 0, 1), left = this.frozen[key] || 0;
    return left < 2.5 ? grow * (0.72 + Math.sin(Battle.t * (14 - left * 3)) * 0.28) : grow;
  },
  skillFrozen(id) { return this.isFrozen('skill:' + id); },
  slotFrozen(i) { return this.isFrozen('slot:' + i); },

  // was könnte eingefroren werden? (Hauptkatze/Platz 1 nie)
  targets() {
    const out = [];
    for (const sk of SKILLS) if (skillOpen(sk) && !this.skillFrozen(sk.id)) out.push({ key: 'skill:' + sk.id, icon: sk.icon, name: sk.name });
    for (let i = 1; i < 4; i++) if (S.slots[i] && !this.slotFrozen(i)) out.push({ key: 'slot:' + i, icon: WEAPONS[S.slots[i].t].icon, name: `Geisterkatze ${i + 1}` });
    for (const p of PETS) if (S.pets[p.id] > 0 && !this.isFrozen('pet:' + p.id)) out.push({ key: 'pet:' + p.id, icon: p.icon, name: p.name });
    if (!this.isFrozen('talent')) { const d = Talents.def(); out.push({ key: 'talent', icon: d.icon, name: d.name }); }
    return out;
  },

  // aus Battle.makeObstacle(): manche normalen Gegner werden zu Schattenwesen
  maybe(o) {
    if (o.boss || o.treasure) return o;
    const ok = Run.active ? S.run.depth >= 2 : S.stage >= SHADE_FROM;
    if (!ok || Math.random() > SHADE_CHANCE || Battle.obs.some(x => x.shade && !x.dead && !x.fleeing)) return o;
    const tg = this.targets();
    if (!tg.length) return o;
    o.kind = 'shade'; o.shade = { t: SHADE_CAST, target: U.pick(tg) };
    o.golden = o.fruit = false;
    o.hp = o.maxHp = o.maxHp * 2.5;
    return o;
  },

  // nach dem Erzeugen: Schatten drängelt sich ganz nach vorn
  onSpawn(B) {
    const i = B.obs.findIndex(o => o.shade && !o.shade.cast);
    if (i > 0) { const [o] = B.obs.splice(i, 1); B.obs.unshift(o); }
    const o = B.obs[0];
    if (o && o.shade && !o.shade.announced && !o.shade.cast && !o.fleeing) {
      o.shade.announced = true;
      B.showBanner('SCHATTENWESEN!', `Besiege es, sonst friert ${o.shade.target.icon} ${o.shade.target.name} ein`, '#b48cff');
      SFX.play('shadeCall');
    }
  },

  dmgMul(o, src) { return o.shade && src === 'paw' ? 3 : 1; },

  update(dt, B) {
    for (const k of Object.keys(this.frozen)) {
      this.frozen[k] -= dt;
      if (this.frozen[k] <= 0) { delete this.frozen[k]; this.thaw(B, k); }
    }
    for (const o of B.obs) {
      if (!o.shade || o.dead || o.fleeing || o.dying > 0) continue;
      // Zeit läuft erst, wenn der Schatten vorne angekommen ist
      if (o.x <= B.frontX + 4) o.shade.t -= dt;
      if (Math.random() < dt * 14) B.particle(o.x + U.rand(-20, 20) * B.cs, o.y - U.rand(10, 70) * B.cs, U.rand(-20, 20), U.rand(-60, -20), U.pick(['#1a0f2e', '#3b2466', '#b48cff']), 0.8, U.rand(4, 9) * B.cs, -10, false, 'smoke');
      if (o.shade.t <= 0) this.cast(B, o);
    }
  },

  cast(B, o) {
    const tg = o.shade.target;
    o.shade.cast = true;
    o.fleeing = true;
    this.frozen[tg.key] = FREEZE_TIME;
    this.at[tg.key] = B.t;
    if (tg.key === 'pet:owl') B.owlBuff = 0; // laufender Eulenruf verstummt
    // dunkler Strahl zum Ziel, Eis-Splitter
    const to = this.targetPoint(B, tg.key);
    this.beams.push({ x1: o.x, y1: o.y - OBST_H.shade * o.scale * 0.6, x2: to.x, y2: to.y, t: 0.5 });
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2, v = U.rand(80, 320);
      B.particle(to.x, to.y, Math.cos(a) * v, Math.sin(a) * v - 60, U.pick(['#bff8ff', '#7ef9ff', '#ffffff']), U.rand(0.5, 0.9), U.rand(3, 6) * B.cs, 500, false, 'spark');
    }
    FX.addRing(to.x, to.y, 90 * B.cs, '#bff8ff', 0.4, 8);
    FX.addRing(to.x, to.y, 40 * B.cs, '#ffffff', 0.25, 4);
    // Eiskristalle schießen sternförmig zusammen
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, d = 46 * B.cs;
      B.particle(to.x + Math.cos(a) * d, to.y + Math.sin(a) * d, -Math.cos(a) * d * 6, -Math.sin(a) * d * 6, '#e6fbff', 0.18, 2.4 * B.cs, 0, false, 'streak');
    }
    B.shake = Math.max(B.shake, 10);
    const what = tg.key.startsWith('pet:') ? 'Bonus fällt weg' : tg.key.startsWith('slot:') ? 'Waffe gesperrt' : 'gesperrt';
    B.showBanner('EINGEFROREN!', `${tg.icon} ${tg.name} · ${FREEZE_TIME} s ${what}`, '#7ef9ff');
    SFX.play('freeze');
    UI.refreshSkills();
  },

  thaw(B, key) {
    const to = this.targetPoint(B, key);
    delete this.at[key];
    // Eis zerspringt in Splitter, die zu Boden fallen
    for (let i = 0; i < 18; i++) {
      const p = B.particle(to.x + U.rand(-14, 14) * B.cs, to.y + U.rand(-14, 14) * B.cs, U.rand(-170, 170), U.rand(-220, -20), U.pick(['#bff8ff', '#e6fbff', '#7ec8ff']), U.rand(0.6, 1), U.rand(3, 6) * B.cs, 900, true, 'chunk');
      if (p) p.spin = U.rand(-14, 14);
    }
    FX.addRing(to.x, to.y, 60 * B.cs, '#e6fbff', 0.3, 5);
    if (!key.startsWith('skill:') && key !== 'talent') B.text(to.x, to.y - 30 * B.cs, 'AUFGETAUT!', '#bff8ff', 15 * B.cs, true);
    SFX.play('thaw');
    UI.refreshSkills();
  },

  onKill(B, o) {
    if (!o.shade || o.shade.cast) return;
    const cy = o.y - OBST_H.shade * o.scale * 0.5;
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, v = U.rand(100, 360);
      B.particle(o.x, cy, Math.cos(a) * v, Math.sin(a) * v, U.pick(['#ffffff', '#fff6c2', '#b48cff']), U.rand(0.5, 1), U.rand(4, 8) * B.cs, 0, false, 'star');
    }
    FX.addRing(o.x, cy, 140 * B.cs, '#fff6c2', 0.45, 8);
    const c = Econ.coins(S.stage) * R.coinMult * 6;
    Game.addCoins(c);
    B.purr = Math.min(100, B.purr + 15);
    B.showBanner('SCHATTEN GEBANNT!', `+${U.fmt(c)} 💰 · Schnurr-Meter +15`, '#fff6c2');
    SFX.play('banish');
  },

  // Bildschirmpunkt des eingefrorenen Ziels (Skill-Knopf → in Spielfeld-Koordinaten)
  targetPoint(B, key) {
    if (key.startsWith('slot:')) { const p = B.slotPos(+key.slice(5)); return { x: p.x, y: p.y - 10 * B.cs }; }
    if (key.startsWith('pet:')) return B.petPos(key.slice(4), this.since(key));
    const sel = key === 'talent' ? '#skills .talent' : `#skills .skill[data-skill="${key.slice(6)}"]`;
    const el = document.querySelector(sel), cr = B.cv.getBoundingClientRect();
    if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2 - cr.left, y: r.top + r.height / 2 - cr.top }; }
    return { x: B.catX, y: B.groundY - 40 * B.cs };
  },

  // ---------------------------------------------------------------- Zeichnen
  // Vereisen: Figur auf eine eigene Leinwand zeichnen, dann nur ihre Pixel blau färben
  // (source-atop) und mit Glanz zurückkopieren – wie beim Geröstet-Effekt, ohne ctx.filter
  iceCv: null,
  iceStart(ctx, B) {
    let c = this.iceCv;
    if (!c) c = this.iceCv = document.createElement('canvas');
    if (c.width !== B.cv.width || c.height !== B.cv.height) { c.width = B.cv.width; c.height = B.cv.height; }
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    x.setTransform(ctx.getTransform());
    return x;
  },
  iceEnd(ctx, x, amt = 1) {
    const c = this.iceCv;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.globalAlpha = 0.72 * amt; x.fillStyle = '#5fc8ff'; x.fillRect(0, 0, c.width, c.height);
    const g = x.createLinearGradient(0, 0, c.width * 0.3, c.height);
    for (let k = 0; k <= 10; k++) g.addColorStop(k / 10, k % 2 ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.35)');
    x.globalAlpha = amt; x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  },
  beams: [],
  drawWorld(ctx, B) {
    const t = B.t, cs = B.cs;
    // eingefrorene Geisterkatzen und Begleiter: Frost-Glitzern, Eiszapfen und Restzeit
    const iced = [];
    for (let i = 1; i < 4; i++) if (this.slotFrozen(i) && S.slots[i]) { const p = B.slotPos(i); iced.push({ key: 'slot:' + i, x: p.x, y: p.y, s: p.s, i, ly: 46 }); }
    for (const id of ['mouse', 'fish', 'owl']) {
      if (!this.isFrozen('pet:' + id) || !(S.pets[id] > 0)) continue;
      const p = B.petPos(id, this.since('pet:' + id));
      iced.push({ key: 'pet:' + id, x: p.x + 4 * cs, y: p.y + (id === 'owl' ? 6 : 10) * cs, s: cs * 0.75, i: id.length, ly: id === 'fish' ? 34 : 30 });
    }
    for (const q of iced) {
      const p = q, s = q.s, i = q.i, left = this.frozen[q.key];
      ctx.save();
      ctx.globalAlpha = this.iceAmt(q.key);
      for (let k = 0; k < 5; k++) {
        const a = k * 1.9 + i, tw = 0.5 + Math.sin(t * 4 + k * 2.3) * 0.5;
        const sx = p.x + Math.cos(a) * 22 * s - 4 * s, sy = p.y - 14 * s + Math.sin(a) * 18 * s;
        ctx.globalAlpha = tw; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(sx - 4 * s * tw, sy); ctx.lineTo(sx + 4 * s * tw, sy); ctx.moveTo(sx, sy - 4 * s * tw); ctx.lineTo(sx, sy + 4 * s * tw); ctx.stroke();
      }
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#d8f6ff';
      for (let k = 0; k < 4; k++) {
        const ix = p.x - 20 * s + k * 9 * s, iy = p.y + 6 * s, ih = (5 + (k % 2) * 4) * s;
        ctx.beginPath(); ctx.moveTo(ix - 2.5 * s, iy); ctx.lineTo(ix + 2.5 * s, iy); ctx.lineTo(ix, iy + ih); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.font = `800 ${11 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lx = p.x - 4 * s, ly = p.y - q.ly * s - (q.key.startsWith('pet:') ? 14 * cs : 0);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,30,50,0.85)'; ctx.strokeText(`❄ ${Math.ceil(left)} s`, lx, ly);
      ctx.fillStyle = '#e6fbff'; ctx.fillText(`❄ ${Math.ceil(left)} s`, lx, ly);
      ctx.restore();
    }
    // Countdown-Ring und Gedankenblase mit dem bedrohten Ziel
    for (const o of B.obs) {
      if (!o.shade || o.dead || o.fleeing) continue;
      const cy = o.y - OBST_H.shade * o.scale * 0.55, r = OBST_H.shade * o.scale * 0.62, f = U.clamp(o.shade.t / SHADE_CAST, 0, 1);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(180,140,255,0.25)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(o.x, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = f < 0.3 && Math.sin(t * 24) > 0 ? '#ff4d6d' : '#b48cff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(o.x, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
      const bx = o.x + r * 0.7, by = cy - r * 1.05 + Math.sin(t * 3) * 3;
      Draw.circle(ctx, o.x + r * 0.45, cy - r * 0.75, 3, 'rgba(255,255,255,0.8)');
      Draw.circle(ctx, bx, by, 15 * cs, 'rgba(230,251,255,0.92)');
      ctx.font = `${15 * cs}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.shade.target.icon, bx, by + 1);
      ctx.font = `${9 * cs}px "Segoe UI Emoji", sans-serif`; ctx.fillText('❄️', bx + 11 * cs, by - 10 * cs);
      ctx.font = `900 ${12 * cs}px "Segoe UI", sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.9)';
      ctx.strokeText(o.shade.t.toFixed(1), o.x, cy + r + 12 * cs); ctx.fillStyle = '#e6d9ff'; ctx.fillText(o.shade.t.toFixed(1), o.x, cy + r + 12 * cs);
      ctx.restore();
    }
    // Fluch-Strahl
    const dt = Battle.frameDt || 0.016;
    for (const b of this.beams) {
      b.t -= dt;
      ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = Math.max(0, b.t / 0.5);
      ctx.strokeStyle = '#3b2466'; ctx.lineWidth = 12 * cs; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = 3 * cs; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.restore();
    }
    this.beams = this.beams.filter(b => b.t > 0);
  },
};

// Talent ruht, solange es eingefroren ist (Abklingzeit bleibt stehen)
const _talentUpdate = Talents.update;
Talents.update = function (dt, B) {
  const cd = this.cd;
  _talentUpdate.call(this, dt, B);
  if (Shades.isFrozen('talent')) this.cd = Math.max(cd, 0.5);
};

const _playS = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  switch (name) {
    case 'shadeCall': this.tone(180, 0.9, 'sawtooth', 0.07, -90); this.tone(270, 0.9, 'sine', 0.06, -120, 0.1); this.noiseF(0.8, 0.08, 0, 500, 'lowpass'); return;
    case 'freeze': [2093, 1760, 1568, 1319].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.07, -200, i * 0.05)); this.noiseF(0.4, 0.2, 0, 6000, 'highpass'); return;
    case 'thaw': this.noiseF(0.3, 0.15, 0, 3000, 'bandpass', 2); [523, 659, 784].forEach((f, i) => this.tone(f, 0.15, 'sine', 0.05, 0, i * 0.05)); return;
    case 'banish': [784, 988, 1175, 1568, 2093].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.07, 0, i * 0.06)); return;
  }
  return _playS.call(this, name, arg);
};
