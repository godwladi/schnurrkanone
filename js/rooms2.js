'use strict';
// ---------------------------------------------------------------------------
// Weitere Sonderräume: Flimmerkiste (TV), Untergrund, Zeitreise – je mit eigenen
// Gegnern, Bossen und einer Regel. Außerdem tauchen alle Sonderräume jetzt auch im
// Hauptspiel auf (ab Stufe 5 gelegentlich eine Stufe, nie zwei hintereinander).
//   Flimmerkiste – alle 10 s wird umgeschaltet: Sport (+30 % Feuerrate), Krimi
//                  (+30 % Schaden), Kochshow (heilt), Testbild (nichts)
//   Untergrund   – Tropfsteine fallen: auf Gegner (Schaden) und manchmal auf dich;
//                  den Schatten unter der Katze antippen zerschlägt den Stein
//   Zeitreise    – alle 15 s ein Zeitsprung: Urzeit, Mittelalter, Zukunft, jedes
//                  Zeitalter mit eigenen Gegnern
// ---------------------------------------------------------------------------

const ERAS = [
  { id: 'dino',   name: 'Urzeit',     icon: '🦖', sky: ['#ff9a5a', '#ffd9a0'], ground: '#6b4a2a', ground2: '#ffb347', accent: '#ff8a3c' },
  { id: 'knight', name: 'Mittelalter', icon: '🏰', sky: ['#2b3a7a', '#a58fd6'], ground: '#4a5a3a', ground2: '#c9b27a', accent: '#c9b27a' },
  { id: 'robot',  name: 'Zukunft',    icon: '🤖', sky: ['#0b0230', '#5a1a8a'], ground: '#1a1440', ground2: '#5ef0ff', accent: '#5ef0ff' },
];
const TV_CHANNELS = [
  { id: 'sport', name: 'Sport',    icon: '⚽', desc: '+30 % Feuerrate', col: '#6ee7a0' },
  { id: 'crime', name: 'Krimi',    icon: '🔍', desc: '+30 % Schaden',   col: '#ffb347' },
  { id: 'cook',  name: 'Kochshow', icon: '🍲', desc: 'Heilt langsam',   col: '#ff9ee0' },
  { id: 'test',  name: 'Testbild', icon: '📺', desc: 'Nichts los …',    col: '#c7b3ff' },
];

SPECIAL_ROOMS.push(
  { name: 'Flimmerkiste', special: 'tv', dark: true, sky: ['#120a2a', '#2e1a52'], hills: '#1e1238', hills2: '#28184a', ground: '#1c1236', ground2: '#ff4fd8',
    obstacle: 'telly', foes: ['telly', 'telly', 'remote'], accent: '#ff4fd8', debris: ['#8b5a2b', '#9fd8ff', '#2a2a2a'],
    desc: 'Alle 10 s wird umgeschaltet – jeder Kanal hat eine Wirkung' },
  { name: 'Untergrund', special: 'under', dark: true, sky: ['#0d0806', '#2a1c14'], hills: '#1a120c', hills2: '#241810', ground: '#20160f', ground2: '#ffb347',
    obstacle: 'mole', foes: ['mole', 'rat', 'rat'], accent: '#ffb347', debris: ['#5a4030', '#8a6a50', '#ffd34d'],
    desc: 'Tropfsteine fallen! Schatten unter der Katze antippen' },
  { name: 'Zeitreise', special: 'time', dark: true, sky: ['#0b0230', '#5a1a8a'], hills: '#1a1440', hills2: '#241a50', ground: '#1a1440', ground2: '#ffd34d',
    get obstacle() { return ERAS[Rooms.era].id; }, get foes() { return [ERAS[Rooms.era].id]; },
    accent: '#ffd34d', debris: ['#ffd34d', '#9aa3c0', '#3fa34d'],
    desc: 'Alle 15 s ein Zeitsprung – jedes Zeitalter hat eigene Gegner' },
);
RUN_BIOMES.push(...SPECIAL_ROOMS.slice(RUN_BIOMES.length - BIOMES.length));

Object.assign(BOSS_NAMES, { telly: 'Der Quotenkönig', remote: 'Lord Zapper', mole: 'Maulwurf-Baron', rat: 'Rattenkönig', dino: 'Tyranno-Max', knight: 'Sir Blechbüchse', robot: 'Omega-Toaster' });
Object.assign(BOSS_ATTACKS, {
  telly:  { icon: '📡', name: 'Störsignal', n: 2, speed: 1,   size: 1,   dmg: 0.8 },
  remote: { icon: '🔋', name: 'Batterien',  n: 3, speed: 1.2, size: 0.9, dmg: 0.6 },
  mole:   { icon: '🟤', name: 'Erdbrocken', n: 3, speed: 1,   size: 1,   dmg: 0.7, sky: true },
  rat:    { icon: '🧀', name: 'Käsewurf',   n: 2, speed: 1.2, size: 1,   dmg: 0.8 },
  dino:   { icon: '🦴', name: 'Knochen',    n: 2, speed: 1,   size: 1.1, dmg: 0.9 },
  knight: { icon: '🗡️', name: 'Dolche',     n: 3, speed: 1.3, size: 0.9, dmg: 0.6 },
  robot:  { icon: '🔩', name: 'Schrauben',  n: 3, speed: 1.1, size: 0.9, dmg: 0.6 },
});
Object.assign(OBST_H, { telly: 80, remote: 86, mole: 72, rat: 52, dino: 74, knight: 96, robot: 94 });
Object.assign(OBST_W, { telly: 62, remote: 34, mole: 60, rat: 70, dino: 66, knight: 50, robot: 52 });
const bobRemote = (t, o) => -Math.abs(Math.sin(t * 3 + o.id)) * 6;
const bobRobot = (t, o) => Math.sin(t * 2.5 + o.id) * 3 - 4;
Object.assign(FACE, {
  telly:  { x: -5, y: -40, s: 0.8, glow: '#e6fbff' },
  remote: { x: 0,  y: -56, s: 0.62, bob: bobRemote },
  mole:   { x: 0,  y: -37, s: 0.8, my: 22 },               // Mund unter der rosa Nase
  rat:    { x: -25, y: -32, s: 0.6, eyes: [-7, 6], my: 12 }, // Kopf schaut leicht zur Schnauze
  dino:   { x: -8, y: -62, s: 0.7, profile: true, mx: -17, my: 22, nx: -30, ny: -4 }, // Seitenauge, Maul unter den Zähnen
  knight: { x: 0,  y: -78, s: 0.62, glow: '#ffd34d', visor: true }, // Augen im Sehschlitz
  robot:  { x: 0,  y: -74, s: 0.62, glow: '#5ef0ff', bob: bobRobot },
});
Object.assign(FOE_FLOAT, { robot: -4, remote: -3 });
Object.assign(CRACK_ZONE, {
  telly: [-28, -66, 56, 54], remote: [-11, -78, 22, 70], mole: [0, -26, 20], rat: [8, -22, 15],
  dino: [8, -32, 17], knight: [-16, -56, 32, 40], robot: [-20, -58, 40, 40],
});
Object.assign(SWAY, { mole: 0.02, dino: 0.03, knight: 0.015 });
SONGS.telly = { ...SONGS.vending, tempo: 126 };
SONGS.mole = { ...SONGS.lavarock, tempo: 96 };
SONGS.dino = { ...SONGS.tree, tempo: 120 };
SONGS.knight = { ...SONGS.snowman, tempo: 104 };
SONGS.robot = { ...SONGS.vending, tempo: 140 };
for (const k of ['remote', 'rat']) SONGS[k] = SONGS[k === 'remote' ? 'telly' : 'mole'];

// ---------------------------------------------------------------- Zeichnen der neuen Gegner
const line = (ctx, x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
const NEW_FOES = {
  telly(ctx, o, t) { // Röhrenfernseher mit Hasenohr-Antenne
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    line(ctx, -18, -10, -24, 0); line(ctx, 18, -10, 24, 0);
    ctx.strokeStyle = '#c9ccd6'; ctx.lineWidth = 2;
    const w = Math.sin(t * 3 + o.id) * 3;
    line(ctx, -4, -68, -18 + w, -88); line(ctx, 4, -68, 16 - w, -90);
    Draw.circle(ctx, -18 + w, -88, 3, '#ff4d6d'); Draw.circle(ctx, 16 - w, -90, 3, '#ff4d6d');
    Draw.rrect(ctx, -31, -70, 62, 62, 10, '#8b5a2b');
    Draw.rrect(ctx, -31, -70, 62, 8, 6, '#a0692f');
    // flimmernder Bildschirm
    const g = ctx.createLinearGradient(0, -62, 0, -16);
    g.addColorStop(0, '#bfe9ff'); g.addColorStop(1, '#5aa8d8');
    Draw.rrect(ctx, -25, -63, 40, 46, 9, g);
    ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) ctx.fillRect(-24, -62 + ((t * 40 + i * 8 + o.id * 5) % 44), 38, 1.5);
    ctx.globalAlpha = 1;
    Draw.circle(ctx, 23, -54, 3.5, '#3a2a1a'); Draw.circle(ctx, 23, -43, 3.5, '#3a2a1a');
    Draw.rrect(ctx, 19, -32, 8, 12, 2, '#5a3a1a');
  },
  remote(ctx, o, t) { // hüpfende Fernbedienung
    ctx.translate(0, bobRemote(t, o));
    Draw.rrect(ctx, -15, -86, 30, 86, 12, '#2a2a33');
    Draw.rrect(ctx, -12, -83, 24, 80, 10, '#3a3a46');
    Draw.circle(ctx, 0, -76, 4.5, (Math.floor(t * 2 + o.id) % 2) ? '#ff4d6d' : '#ff9aa8');
    const cols = ['#5ab0ff', '#6ee7a0', '#ffd34d', '#ff7ad9'];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) Draw.rrect(ctx, -9 + c * 7, -34 + r * 8, 5, 5, 2, r === 2 ? cols[c] : '#8a8a9a');
    Draw.rrect(ctx, -6, -8, 12, 3, 1.5, '#8a8a9a');
  },
  mole(ctx, o, t) { // Maulwurf mit Grubenhelm und Lampe
    const dig = Math.sin(t * 6 + o.id) * 2;
    Draw.ellipse(ctx, 0, -28, 28, 28, '#6b4a3a');
    Draw.ellipse(ctx, 0, -18, 17, 16, '#8a6650');
    // Grabschaufeln
    Draw.ellipse(ctx, -27, -14 + dig, 9, 6, '#ffb3c6'); Draw.ellipse(ctx, 27, -14 - dig, 9, 6, '#ffb3c6');
    // Helm mit Lampe
    ctx.beginPath(); ctx.arc(0, -46, 22, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#ffcf3a'; ctx.fill();
    Draw.rrect(ctx, -25, -48, 50, 5, 2, '#e0a800');
    Draw.circle(ctx, -6, -60, 6, '#fff6c2');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(t * 5) * 0.1;
    Draw.tri(ctx, [-6, -60], [-60, -40], [-60, -76], '#fff6c2'); ctx.restore();
    Draw.ellipse(ctx, 0, -26, 6, 4.5, '#ff7a9a');
  },
  rat(ctx, o, t) { // Kanalratte mit Ringelschwanz
    const w = Math.sin(t * 8 + o.id) * 4;
    ctx.strokeStyle = '#d98a9a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(30, -16); ctx.quadraticCurveTo(48, -10 + w, 40, -32); ctx.quadraticCurveTo(34, -44, 46, -46); ctx.stroke();
    Draw.ellipse(ctx, 6, -20, 30, 19, '#7d7f8f');
    Draw.ellipse(ctx, 8, -14, 18, 10, '#9a9cac');
    Draw.circle(ctx, -22, -30, 15, '#8a8c9c');
    Draw.circle(ctx, -24, -46, 7, '#8a8c9c'); Draw.circle(ctx, -24, -46, 4, '#ffb3c6');
    Draw.circle(ctx, -12, -44, 6, '#8a8c9c'); Draw.circle(ctx, -12, -44, 3.5, '#ffb3c6');
    Draw.circle(ctx, -37, -27, 3.5, '#ff7a9a');
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    line(ctx, -36, -26, -48, -30); line(ctx, -36, -25, -48, -23);
    Draw.rrect(ctx, -10, -4, 6, 6, 2, '#6a6c7a'); Draw.rrect(ctx, 16, -4, 6, 6, 2, '#6a6c7a');
  },
  dino(ctx, o, t) { // kleiner T-Rex
    const step = Math.sin(t * 6 + o.id) * 3;
    Draw.tri(ctx, [20, -40], [52, -24 + step * 0.5], [20, -22], '#4caf50');
    Draw.rrect(ctx, -2, -12, 9, 13 + step, 3, '#3f9b4a'); Draw.rrect(ctx, 14, -12, 9, 13 - step, 3, '#3f9b4a');
    Draw.ellipse(ctx, 8, -32, 24, 21, '#4caf50');
    Draw.ellipse(ctx, 2, -26, 13, 13, '#9be08f');
    Draw.rrect(ctx, -34, -70, 36, 26, 10, '#4caf50');
    Draw.rrect(ctx, -34, -52, 30, 8, 4, '#3f9b4a');
    ctx.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) Draw.tri(ctx, [-32 + i * 7, -52], [-28 + i * 7, -52], [-30 + i * 7, -48], '#ffffff');
    ctx.strokeStyle = '#3f9b4a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; line(ctx, -10, -36, -16, -30 + step);
    for (let i = 0; i < 3; i++) Draw.tri(ctx, [-6 + i * 10, -70 + i * 6], [2 + i * 10, -70 + i * 8], [-2 + i * 10, -78 + i * 6], '#ff8a3c');
  },
  knight(ctx, o, t) { // Ritterrüstung mit Federbusch und Schild
    const sw = Math.sin(t * 2 + o.id) * 0.08;
    Draw.rrect(ctx, -14, -14, 11, 14, 3, '#7d8494'); Draw.rrect(ctx, 3, -14, 11, 14, 3, '#7d8494');
    Draw.rrect(ctx, -18, -58, 36, 46, 8, '#aab2c4');
    Draw.rrect(ctx, -18, -30, 36, 6, 2, '#7d8494');
    Draw.rrect(ctx, -16, -90, 32, 34, 10, '#c9d0e0');
    Draw.rrect(ctx, -12, -80, 24, 4, 2, '#3a3f4f');
    ctx.save(); ctx.translate(0, -90); ctx.rotate(sw);
    for (let i = 0; i < 4; i++) Draw.ellipse(ctx, 4 + i * 4, -6 - i * 3, 6, 9, i % 2 ? '#ff4d6d' : '#d93a55');
    ctx.restore();
    // Schild vorne
    ctx.beginPath(); ctx.moveTo(-34, -56); ctx.lineTo(-14, -56); ctx.lineTo(-14, -34); ctx.quadraticCurveTo(-24, -20, -24, -20); ctx.quadraticCurveTo(-34, -30, -34, -34); ctx.closePath();
    ctx.fillStyle = '#3a6df0'; ctx.fill(); ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#ffd34d'; line(ctx, -24, -54, -24, -26); line(ctx, -32, -44, -16, -44);
  },
  robot(ctx, o, t) { // Zukunfts-Roboter auf Raupenketten
    ctx.translate(0, bobRobot(t, o));
    Draw.rrect(ctx, -24, -12, 48, 14, 7, '#3a3f4f');
    for (let i = 0; i < 5; i++) Draw.circle(ctx, -18 + i * 9, -5, 3, (Math.floor(t * 8) + i) % 2 ? '#6a6f80' : '#8a8f9f');
    Draw.rrect(ctx, -22, -60, 44, 48, 8, '#9aa3c0');
    Draw.rrect(ctx, -14, -50, 28, 18, 4, '#1a1440');
    for (let i = 0; i < 4; i++) Draw.rrect(ctx, -11 + i * 6.5, -36 - (Math.sin(t * 7 + i + o.id) * 0.5 + 0.5) * 12, 4, 2, 1, '#5ef0ff');
    Draw.rrect(ctx, -16, -88, 32, 28, 8, '#b9c0d8');
    ctx.strokeStyle = '#6a6f80'; ctx.lineWidth = 2; line(ctx, 0, -88, 0, -98);
    Draw.circle(ctx, 0, -100, 3.5, Math.sin(t * 6) > 0 ? '#ff4d6d' : '#ffd34d');
    ctx.strokeStyle = '#9aa3c0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const a = Math.sin(t * 4 + o.id) * 6;
    line(ctx, -22, -48, -34, -34 + a); line(ctx, 22, -48, 32, -34 - a);
  },
};
// ---------------------------------------------------------------- Sonderräume im Hauptspiel
// Fest je Stufe (gleiche Stufe = gleicher Raum, auch nach einem K.O.), etwa jede 7. Stufe
// ab Stufe 5, nie zwei Sonderräume hintereinander und nie auf einer Zehner-Stufe.
const roomHash = st => (Math.imul(st * 7919 + 13, 2654435761) >>> 0);
function mainSpecial(st) {
  if (st < 5 || st % 10 === 0) return null;
  if (roomHash(st) % 100 >= 15) return null;
  if (st > 5 && mainSpecial(st - 1)) return null;
  return SPECIAL_ROOMS[roomHash(st * 31 + 7) % SPECIAL_ROOMS.length];
}
// Gebietsfolge im Hauptspiel: die Sonderräume sind reguläre Gebiete wie die Sonnenwüste
// (je 10 Stufen). Die ersten beiden Gebiete bleiben gleich, danach wechseln sie sich ab.
const MAIN_CYCLE = ['Flüsterwald', 'Sonnenwüste', 'Wurmloch', 'Frostgipfel', 'Untergrund', 'Lavagrund', 'Flimmerkiste',
  'Neon-City', 'World Wide Web', 'Sternenmeer', 'Die Leere', 'Zeitreise'].map(n => BIOMES.concat(SPECIAL_ROOMS).find(b => b.name === n));
const mainBiome = st => MAIN_CYCLE[Math.floor((st - 1) / 10) % MAIN_CYCLE.length];
// zusätzlich ab und zu eine einzelne Sonderraum-Stufe mitten in einem normalen Gebiet
biomeFor = st => { const b = mainBiome(st); return b.special ? b : mainSpecial(st) || b; };

// ---------------------------------------------------------------- Raum-Regeln
Object.assign(Rooms, {
  era: 0, eraT: 15, chan: 3, chanT: 10, staticT: 0, rocks: [], rockT: 4,
  cur() { if (Run.active) return RUN_BIOMES[S.run.biome % RUN_BIOMES.length]; const b = biomeFor(S.stage); return b.special ? b : null; },
  channel() { return this.kind() === 'tv' ? TV_CHANNELS[this.chan] : null; },
  rateMul() { const c = this.channel(); return c && c.id === 'sport' ? 1.3 : 1; },
  dmgMul() { const c = this.channel(); return c && c.id === 'crime' ? 1.3 : 1; },
});

const _roomsReset = Rooms.reset;
Rooms.reset = function () { _roomsReset.call(this); this.rocks = []; this.rockT = 4; this.eraT = 15; this.chanT = 10; };

const _roomsUpdate = Rooms.update;
Rooms.update = function (dt, B) {
  _roomsUpdate.call(this, dt, B);
  const k = this.kind();
  this.staticT = Math.max(0, this.staticT - dt);
  if (k === 'tv') {
    this.chanT -= dt;
    if (this.chanT <= 0) {
      this.chanT = 10;
      let n; do n = U.randi(0, TV_CHANNELS.length - 1); while (n === this.chan);
      this.chan = n; this.staticT = 0.5;
      const c = TV_CHANNELS[n];
      B.text(B.W / 2, B.groundY * 0.45, `${c.icon} ${c.name}: ${c.desc}`, c.col, 20 * B.cs, true);
      SFX.play('zap');
    }
    if (TV_CHANNELS[this.chan].id === 'cook') Vitals.heal(B, 0.012 * dt, true);
  }
  if (k === 'time') {
    this.eraT -= dt;
    if (this.eraT <= 0) {
      this.eraT = 15;
      this.era = (this.era + 1) % ERAS.length;
      const e = ERAS[this.era];
      B.whiteFlash = Math.max(B.whiteFlash, 0.6); FX.ambient = [];
      // die alten Gegner verschwinden im Zeitstrudel (Boss bleibt)
      for (const o of B.obs) if (!o.boss && !o.dead && !o.shade && !o.treasure) o.fleeing = true;
      B.showBanner('ZEITSPRUNG!', `${e.icon} ${e.name}`, e.accent);
      SFX.play('warp');
    }
  }
  if (k === 'under') {
    this.rockT -= dt;
    if (this.rockT <= 0) {
      this.rockT = U.rand(2.6, 4.2);
      const foes = B.obs.filter(o => !o.dead && !o.fleeing && o.x < (B.Wp || B.W) - 20);
      const onCat = !foes.length || Math.random() < 0.3;
      const tg = onCat ? null : U.pick(foes);
      const x = onCat ? Vitals.catPoint(B).x : tg.x;
      this.rocks.push({ x, y: -30, vy: 0, warn: 0.9, onCat, id: tg ? tg.id : -1, r: U.rand(12, 17) * B.cs, rot: U.rand(0, 6) });
    }
    for (const r of this.rocks) {
      if (r.warn > 0) { r.warn -= dt; continue; }
      r.vy += 2200 * dt; r.y += r.vy * dt; r.rot += dt * 5;
      if (!r.onCat) { const o = B.obs.find(o => o.id === r.id && !o.dead); if (o) r.x = o.x; }
      const hitY = r.onCat ? Vitals.catPoint(B).y - 20 * B.cs : B.groundY - 50 * B.cs;
      if (r.y >= hitY) {
        r.done = true;
        for (let i = 0; i < 10; i++) B.particle(r.x, hitY, U.rand(-160, 160), U.rand(-260, -60), U.pick(['#5a4030', '#8a6a50', '#c9a27a']), 0.7, U.rand(3, 6) * B.cs, 1200, true, 'chunk');
        B.shake = Math.max(B.shake, 6);
        SFX.play('crack', 2);
        if (r.onCat) Vitals.hurt(B, Vitals.ref().maxHp * 0.06);
        else { const o = B.obs.find(o => o.id === r.id && !o.dead); if (o) B.damage(o, o.maxHp * (o.boss ? 0.03 : 0.25), false, false, 'rock'); }
      }
    }
    this.rocks = this.rocks.filter(r => !r.done);
  } else this.rocks = [];
};

// Untergrund: Stein über der Katze antippen zerschlägt ihn
const _roomsTap = Rooms.tap;
Rooms.tap = function (B, x, y) {
  for (const r of this.rocks) {
    if (!r.onCat || r.done) continue;
    const ry = r.warn > 0 ? 40 : r.y;
    const cat = Vitals.catPoint(B);
    if (Math.abs(x - r.x) < 50 * B.cs && (Math.hypot(x - r.x, y - ry) < 50 * B.cs || Math.hypot(x - cat.x, y - (B.groundY - 4)) < 45 * B.cs)) {
      r.done = true;
      B.purr = Math.min(100, B.purr + 8);
      B.text(r.x, Math.max(60, ry), 'ZERSCHLAGEN!', '#ffd34d', 16 * B.cs, true);
      FX.addRing(r.x, Math.max(60, ry), 40, '#ffd34d', 0.25, 4);
      SFX.play('parry');
      return true;
    }
  }
  return _roomsTap.call(this, B, x, y);
};

// ---------------------------------------------------------------- Hintergründe
const _roomsBg = Rooms.drawBg;
Rooms.drawBg = function (ctx, B, biome) {
  const k = biome.special;
  if (k === 'tv') this.bgTv(ctx, B, biome);
  else if (k === 'under') this.bgUnder(ctx, B, biome);
  else if (k === 'time') this.bgTime(ctx, B, biome);
  else _roomsBg.call(this, ctx, B, biome);
};

Rooms.bgTv = function (ctx, B, biome) {
  const W = B.W, H = B.H, gy = B.groundY, t = B.t;
  this.sky(ctx, B, biome);
  // Scheinwerferkegel von der Studiodecke
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x = W * (0.2 + i * 0.3) + Math.sin(t * 0.6 + i * 2) * 40;
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, `hsla(${[300, 190, 50][i]},90%,70%,0.28)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 10, 0); ctx.lineTo(x + 10, 0); ctx.lineTo(x + 110, gy); ctx.lineTo(x - 110, gy); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // Riesen-Bildschirm im Hintergrund mit dem aktuellen Kanal
  const sw = Math.min(W * 0.42, 340), sh = sw * 0.6, sx = W * 0.62 - sw / 2, sy = Math.max(60, gy * 0.18);
  Draw.rrect(ctx, sx - 12, sy - 12, sw + 24, sh + 24, 18, '#2a1a10');
  ctx.save(); ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, 12); ctx.clip();
  const c = TV_CHANNELS[this.chan].id;
  if (c === 'sport') {
    ctx.fillStyle = '#2f8a3c'; ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.strokeRect(sx + 8, sy + 8, sw - 16, sh - 16);
    line(ctx, sx + sw / 2, sy + 8, sx + sw / 2, sy + sh - 8);
    ctx.beginPath(); ctx.arc(sx + sw / 2, sy + sh / 2, sh * 0.18, 0, Math.PI * 2); ctx.stroke();
    Draw.circle(ctx, sx + sw / 2 + Math.sin(t * 2) * sw * 0.35, sy + sh / 2 + Math.cos(t * 3) * sh * 0.25, 6, '#ffffff');
  } else if (c === 'crime') {
    ctx.fillStyle = '#1a1424'; ctx.fillRect(sx, sy, sw, sh);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lx = sx + sw / 2 + Math.sin(t * 1.3) * sw * 0.3;
    FX.drawGlow(ctx, lx, sy + sh * 0.5, sh * 0.35, '#ffd34d', 0.5);
    ctx.restore();
    ctx.font = `${sh * 0.35}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🔍', lx, sy + sh * 0.5);
  } else if (c === 'cook') {
    ctx.fillStyle = '#ffe3c2'; ctx.fillRect(sx, sy, sw, sh);
    ctx.font = `${sh * 0.42}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍲', sx + sw / 2, sy + sh * 0.56);
    for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5; Draw.circle(ctx, sx + sw / 2 - 20 + i * 20, sy + sh * 0.25 - ((t * 20 + i * 9) % 30), 6, '#ffffff'); }
    ctx.globalAlpha = 1;
  } else {
    const cols = ['#ffffff', '#ffd34d', '#5ef0ff', '#6ee7a0', '#ff7ad9', '#ff4d6d', '#3a6df0'];
    cols.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(sx + i * sw / cols.length, sy, sw / cols.length + 1, sh * 0.75); });
    ctx.fillStyle = '#111'; ctx.fillRect(sx, sy + sh * 0.75, sw, sh * 0.25);
  }
  // Bildröhren-Zeilen
  ctx.globalAlpha = 0.15; ctx.fillStyle = '#000';
  for (let y = sy; y < sy + sh; y += 4) ctx.fillRect(sx, y, sw, 2);
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.font = `800 ${Math.max(11, sw * 0.05)}px "Segoe UI", "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff4d6d' : '#ffffff'; ctx.fillText('● LIVE', sx + sw - 8, sy + 8);
  // Studioboden: Schachbrett mit Fluchtpunkt
  ctx.fillStyle = biome.ground; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
  ctx.save(); ctx.beginPath(); ctx.rect(-20, gy, W + 40, H - gy + 20); ctx.clip();
  const rows = 6;
  for (let j = 0; j < rows; j++) {
    const y0 = gy + Math.pow(j / rows, 1.6) * (H - gy + 20), y1 = gy + Math.pow((j + 1) / rows, 1.6) * (H - gy + 20);
    const tw = 40 + j * 22, off = (B.scroll * (0.4 + j * 0.15)) % (tw * 2);
    for (let x = -tw * 2 - off; x < W + tw * 2; x += tw) {
      if ((Math.round((x + off) / tw) + j) % 2) continue;
      ctx.fillStyle = 'rgba(255,79,216,0.12)'; ctx.fillRect(x, y0, tw, y1 - y0);
    }
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.fillStyle = biome.ground2; ctx.fillRect(-20, gy, W + 40, 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
};

Rooms.bgUnder = function (ctx, B, biome) {
  const W = B.W, gy = B.groundY, t = B.t, sc = B.scroll;
  this.sky(ctx, B, biome);
  // Felswände mit Leuchtkristallen
  for (let layer = 0; layer < 2; layer++) {
    const sp = layer ? 0.5 : 0.2;
    ctx.fillStyle = layer ? biome.hills2 : biome.hills;
    ctx.beginPath(); ctx.moveTo(0, gy);
    for (let x = 0; x <= W + 20; x += 24) {
      const wx = x + sc * sp;
      ctx.lineTo(x, gy - (layer ? 50 : 100) - Math.abs(Math.sin(wx * 0.011 + layer)) * 60 - Math.sin(wx * 0.04) * 10);
    }
    ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
  }
  // Tropfsteine an der Decke
  const step = 38;
  for (let i = -1; i < W / step + 2; i++) {
    const wi = i + Math.floor(sc * 0.3 / step), h = (Math.imul(wi, 2654435761) >>> 0) % 1000 / 1000;
    const x = i * step - (sc * 0.3) % step, len = 20 + h * 60;
    Draw.tri(ctx, [x - 10 - h * 6, -2], [x + 10 + h * 6, -2], [x, len], h > 0.5 ? '#2e2016' : '#3a2a1c');
    if (h > 0.82) { // Wassertropfen
      const d = (t * 0.8 + h * 5) % 1;
      ctx.globalAlpha = 1 - d; Draw.ellipse(ctx, x, len + d * (gy - len), 2, 3, '#7ec8ff'); ctx.globalAlpha = 1;
    }
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const x = ((i * 173 - sc * 0.5) % (W + 100) + W + 100) % (W + 100) - 50, y = gy - 30 - (i * 37 % 70);
    FX.drawGlow(ctx, x, y, 22, ['#7ef9ff', '#c9a6ff', '#6ee7a0'][i % 3], 0.45 + Math.sin(t * 2 + i) * 0.15);
    Draw.tri(ctx, [x - 5, y + 6], [x + 5, y + 6], [x, y - 10], ['#bff8ff', '#e6d9ff', '#b5f5c8'][i % 3]);
  }
  ctx.restore();
  // Laterne an der Wand
  const lx = W * 0.15, ly = gy * 0.42;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.drawGlow(ctx, lx, ly, 90, '#ffb347', 0.35 + Math.sin(t * 9) * 0.04); ctx.restore();
  Draw.rrect(ctx, lx - 7, ly - 10, 14, 20, 3, '#ffd34d');
  // Schienen am Boden
  ctx.fillStyle = biome.ground; ctx.fillRect(-20, gy, W + 40, B.H - gy + 20);
  ctx.fillStyle = '#3a2a1c';
  for (let x = -((sc) % 30); x < W + 30; x += 30) ctx.fillRect(x, gy + 10, 14, 6);
  ctx.fillStyle = '#8a8f9f'; ctx.fillRect(-20, gy + 8, W + 40, 2); ctx.fillRect(-20, gy + 16, W + 40, 2);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.fillStyle = biome.ground2; ctx.fillRect(-20, gy, W + 40, 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
};

Rooms.bgTime = function (ctx, B, biome) {
  const W = B.W, H = B.H, gy = B.groundY, t = B.t, sc = B.scroll, e = ERAS[this.era];
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  g.addColorStop(0, e.sky[0]); g.addColorStop(1, e.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, gy + 20);
  // großes Uhrwerk im Himmel
  const cx = W * 0.7, cy = gy * 0.32, r = Math.min(90, W * 0.12);
  ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(ctx, cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.lineWidth = 4; line(ctx, cx, cy, cx + Math.cos(t * 2) * r * 0.75, cy + Math.sin(t * 2) * r * 0.75);
  ctx.lineWidth = 6; line(ctx, cx, cy, cx + Math.cos(t * 0.2) * r * 0.5, cy + Math.sin(t * 0.2) * r * 0.5);
  ctx.restore();
  if (e.id === 'dino') {
    // Vulkan mit Rauch, Palmen
    const vx = W * 0.3 - (sc * 0.1) % (W + 400) + (sc * 0.1 > W * 0.3 + 200 ? W + 400 : 0);
    ctx.fillStyle = '#5a3a2a'; ctx.beginPath(); ctx.moveTo(vx - 160, gy); ctx.lineTo(vx - 30, gy - 170); ctx.lineTo(vx + 30, gy - 170); ctx.lineTo(vx + 160, gy); ctx.closePath(); ctx.fill();
    Draw.rrect(ctx, vx - 30, gy - 174, 60, 10, 4, '#ff6a2b');
    for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.35; Draw.circle(ctx, vx + Math.sin(t + i) * 12, gy - 190 - ((t * 25 + i * 30) % 120), 16 + i * 4, '#7a6a6a'); }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const px = ((i * 260 - sc * 0.4) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px, gy); ctx.quadraticCurveTo(px + 10, gy - 50, px + 4, gy - 90); ctx.stroke();
      for (let j = 0; j < 5; j++) { const a = -Math.PI / 2 + (j - 2) * 0.6; Draw.ellipse(ctx, px + 4 + Math.cos(a) * 22, gy - 90 + Math.sin(a) * 10 + 8, 22, 6, '#3f9b4a'); }
    }
  } else if (e.id === 'knight') {
    // Burg-Silhouette und Mond
    Draw.circle(ctx, W * 0.15, gy * 0.22, 24, '#fff6e0');
    const bx = W * 0.42 - (sc * 0.15) % (W + 500) + (sc * 0.15 > W * 0.42 + 250 ? W + 500 : 0);
    ctx.fillStyle = '#1e2448';
    ctx.fillRect(bx - 120, gy - 110, 240, 110);
    for (const tx of [-130, 90]) { ctx.fillRect(bx + tx, gy - 170, 40, 170); Draw.tri(ctx, [bx + tx - 6, gy - 170], [bx + tx + 46, gy - 170], [bx + tx + 20, gy - 210], '#2a3060'); }
    for (let i = 0; i < 8; i++) ctx.fillRect(bx - 120 + i * 32, gy - 124, 18, 14);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = Math.sin(t * 3 + i) > -0.5 ? '#ffd34d' : '#a08020'; ctx.fillRect(bx - 60 + i * 50, gy - 80, 10, 16); }
    ctx.fillStyle = '#1e2448';
  } else {
    // Zukunft: Neon-Hochhäuser und fliegende Autos
    for (let layer = 0; layer < 2; layer++) {
      const sp = layer ? 0.5 : 0.2;
      for (let i = -1; i < W / 70 + 2; i++) {
        const bxx = i * 70 - (sc * sp) % 70, wi = i + Math.floor(sc * sp / 70);
        const h = 90 + ((Math.imul(wi + layer * 50, 2654435761) >>> 0) % 7) * 26 - layer * 40;
        ctx.fillStyle = layer ? '#2a1a60' : '#1a1040'; ctx.fillRect(bxx, gy - h, 56, h);
        ctx.fillStyle = layer ? 'rgba(94,240,255,0.5)' : 'rgba(255,79,216,0.35)';
        for (let y = gy - h + 10; y < gy - 10; y += 16) ctx.fillRect(bxx + 8, y, 40, 3);
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = ((t * (60 + i * 30) + i * 300) % (W + 200)) - 100, y = gy * (0.2 + i * 0.12);
      Draw.ellipse(ctx, x, y, 18, 6, '#c9d0e8'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.drawGlow(ctx, x - 20, y, 12, '#ff4fd8', 0.6); ctx.restore();
    }
  }
  ctx.fillStyle = e.ground; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.fillStyle = e.ground2; ctx.fillRect(-20, gy, W + 40, 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
};

// ---------------------------------------------------------------- Bildschirm-Ebene
const _roomsScreen = Rooms.drawScreen;
Rooms.drawScreen = function (ctx, B) {
  _roomsScreen.call(this, ctx, B);
  const k = this.kind(), iB = B.insetB || 0, cs = B.cs;
  const pill = (txt, col) => {
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '800 12px "Segoe UI", "Segoe UI Emoji", sans-serif';
    const w = ctx.measureText(txt).width + 22;
    Draw.rrect(ctx, 12, B.H - 104 - iB, w, 24, 12, 'rgba(20,10,40,0.75)');
    ctx.fillStyle = col; ctx.fillText(txt, 23, B.H - 92 - iB);
    ctx.restore();
  };
  if (k === 'tv') {
    const c = TV_CHANNELS[this.chan];
    pill(`${c.icon} ${c.name} · ${c.desc} · ${Math.ceil(this.chanT)} s`, c.col);
    if (this.staticT > 0) { // Bildrauschen beim Umschalten
      ctx.save(); ctx.globalAlpha = this.staticT * 1.2;
      for (let i = 0; i < 160; i++) { ctx.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#555'; ctx.fillRect(Math.random() * B.W, Math.random() * B.H, U.rand(8, 40), 2); }
      ctx.restore();
    }
  } else if (k === 'time') {
    const e = ERAS[this.era];
    pill(`${e.icon} ${e.name} · Zeitsprung in ${Math.ceil(this.eraT)} s`, e.accent);
  } else if (k === 'under') {
    for (const r of this.rocks) {
      if (r.warn > 0) { // Schatten am Boden warnt vor dem Einschlag
        const gy = r.onCat ? B.groundY - 2 : B.groundY - 2, a = 0.35 + Math.sin(B.t * 20) * 0.15;
        ctx.save(); ctx.globalAlpha = a; Draw.ellipse(ctx, r.x, gy, r.r * 1.6 * (1.4 - r.warn * 0.5), r.r * 0.5, r.onCat ? '#ff4d6d' : '#000');
        if (r.onCat) {
          ctx.globalAlpha = 1; ctx.font = `900 ${13 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.9)'; ctx.strokeText('▲ ANTIPPEN!', r.x, gy + 16 * cs); ctx.fillStyle = '#ffd34d'; ctx.fillText('▲ ANTIPPEN!', r.x, gy + 16 * cs);
        }
        ctx.restore();
        continue;
      }
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      Draw.tri(ctx, [-r.r * 0.6, -r.r * 1.4], [r.r * 0.6, -r.r * 1.4], [0, r.r], '#5a4030');
      Draw.tri(ctx, [-r.r * 0.2, -r.r * 1.2], [r.r * 0.3, -r.r * 1.2], [0, r.r * 0.4], '#8a6a50');
      ctx.restore();
    }
  }
};

const _playR2 = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  if (name === 'zap') { this.noiseF ? this.noiseF(0.3, 0.12, 0, 4000, 'highpass') : this.noise(0.3, 0.12); [440, 880].forEach((f, i) => this.tone(f, 0.06, 'square', 0.05, 0, 0.25 + i * 0.05)); return; }
  if (name === 'warp') { this.tone(200, 0.7, 'sine', 0.08, 900); this.tone(300, 0.7, 'triangle', 0.05, 1200, 0.1); return; }
  return _playR2.call(this, name, arg);
};
