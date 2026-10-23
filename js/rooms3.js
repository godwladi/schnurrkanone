'use strict';
// ---------------------------------------------------------------------------
// Drei neue Gebiete mit eigenen Gegnern, Bossen und Regeln:
//   Mäusefestung     – Belagerung: Ratten-Katapulte schleudern Käselaibe. Antippen schickt
//                      den Laib zurück auf die Gegner, sonst trifft er die Katze.
//                      Gegner: Mäuse-Ritter, Ratten-Katapult · Boss: Rattenkönigin Brie
//   Versunkenes Wrack – Luftblasen steigen auf: antippen gibt Schnurr-Meter und heilt.
//                      Besiegte Tintenfische vernebeln kurz die Sicht.
//                      Gegner: Kugelfisch (bläht sich auf), Krabbe, Tintenfisch · Boss: Kraken
//   Spiegelkabinett  – Jahrmarkt der Spiegel: das ganze Spielfeld klappt um, die Katze steht
//                      rechts, die Gegner kommen von links (Texte bleiben lesbar).
//                      Gegner: Clowns-Maus, Ballon-Pudel (zerfällt in zwei), Spiegel-Geist
//                      Boss: die Spiegelkatze – eine dunkle Kopie deiner Katze mit deiner Waffe
// Im Hauptspiel sind es reguläre Gebiete (je 10 Stufen ab Stufe 71), im Streifzug Räume,
// außerdem tauchen sie wie die anderen Sonderräume ab und zu als einzelne Stufe auf.
// ---------------------------------------------------------------------------

SPECIAL_ROOMS.push(
  { name: 'Mäusefestung', special: 'fort', dark: true, sky: ['#2a1640', '#c76a4a'], hills: '#3a2440', hills2: '#4a2c48', ground: '#5a4a52', ground2: '#ffcf3a',
    obstacle: 'queen', foes: ['mknight', 'mknight', 'catapult'], accent: '#ffcf3a', debris: ['#aab2c4', '#ffcf3a', '#8b5a2b'],
    desc: 'Käse-Katapulte! Fliegende Käselaibe antippen – sie fliegen zurück' },
  { name: 'Versunkenes Wrack', special: 'wreck', dark: true, sky: ['#021a33', '#0a6a8a'], hills: '#063048', hills2: '#0a4060', ground: '#c9b27a', ground2: '#7ef9ff',
    obstacle: 'kraken', foes: ['puffer', 'crab', 'squid'], accent: '#7ef9ff', debris: ['#7ef9ff', '#ffcf6a', '#e8573f'],
    desc: 'Luftblasen antippen: Schnurr-Meter und Heilung' },
  { name: 'Spiegelkabinett', special: 'mirror', dark: true, sky: ['#1a0a2e', '#4a1a5a'], hills: '#2a1040', hills2: '#3a1650', ground: '#2a1a3a', ground2: '#ff7ad9',
    obstacle: 'mirrorcat', foes: ['clown', 'poodle', 'glassling'], accent: '#ff7ad9', debris: ['#e6fbff', '#ff7ad9', '#ffd34d'],
    desc: 'Alles ist verkehrt: die Gegner kommen von links!' },
);
RUN_BIOMES.push(...SPECIAL_ROOMS.slice(RUN_BIOMES.length - BIOMES.length));
// Hauptspiel: als reguläre Gebiete in den Kreis (Stufe 1–70 bleiben unverändert)
{
  const by = n => BIOMES.concat(SPECIAL_ROOMS).find(b => b.name === n);
  const at = n => MAIN_CYCLE.findIndex(b => b && b.name === n);
  MAIN_CYCLE.splice(at('Flimmerkiste') + 1, 0, by('Mäusefestung'));
  MAIN_CYCLE.splice(at('Neon-City') + 1, 0, by('Spiegelkabinett'));
  MAIN_CYCLE.splice(at('Sternenmeer') + 1, 0, by('Versunkenes Wrack'));
}

Object.assign(BOSS_NAMES, {
  queen: 'Rattenkönigin Brie', mknight: 'Sir Piepsalot', catapult: 'Katapult-Kalle',
  kraken: 'Kraken Krakatau', puffer: 'Kugel-Kuno', crab: 'Käpt’n Kneifer', squid: 'Tinte-Tilda',
  mirrorcat: 'Die Spiegelkatze', clown: 'Clown Kicher', poodle: 'Ballon-Bello', glassling: 'Glasgeist',
});
Object.assign(BOSS_ATTACKS, {
  queen:     { icon: '🧀', name: 'Käsekanonade', n: 3, speed: 0.9, size: 1.1, dmg: 0.7, sky: true },
  mknight:   { icon: '🗡️', name: 'Lanzenstoß',   n: 1, speed: 1.4, size: 1,   dmg: 1 },
  catapult:  { icon: '🧀', name: 'Käselaib',     n: 1, speed: 0.8, size: 1.3, dmg: 1.2, sky: true },
  kraken:    { icon: '🌀', name: 'Strudel',      n: 2, speed: 1,   size: 1.3, dmg: 0.9 },
  puffer:    { icon: '✴️', name: 'Stacheln',     n: 3, speed: 1.3, size: 0.8, dmg: 0.5 },
  crab:      { icon: '🟤', name: 'Kieselwurf',   n: 2, speed: 1.1, size: 0.9, dmg: 0.7 },
  squid:     { icon: '🌑', name: 'Tintenkugel',  n: 1, speed: 1,   size: 1.2, dmg: 1 },
  mirrorcat: { icon: '🐾', name: 'Spiegelpfote', n: 3, speed: 1.2, size: 1,   dmg: 0.7 },
  clown:     { icon: '🎈', name: 'Ballonwurf',   n: 2, speed: 0.9, size: 1.1, dmg: 0.7 },
  poodle:    { icon: '🎈', name: 'Ballonwurf',   n: 1, speed: 1,   size: 1.1, dmg: 0.8 },
  glassling: { icon: '💠', name: 'Splitter',     n: 3, speed: 1.4, size: 0.8, dmg: 0.5 },
});
Object.assign(OBST_H, { queen: 92, mknight: 72, catapult: 64, kraken: 96, puffer: 62, crab: 48, squid: 84, mirrorcat: 86, clown: 92, poodle: 72, glassling: 88 });
Object.assign(OBST_W, { queen: 70, mknight: 50, catapult: 74, kraken: 86, puffer: 58, crab: 74, squid: 46, mirrorcat: 70, clown: 44, poodle: 70, glassling: 50 });
const bobPuffer = (t, o) => Math.sin(t * 2 + o.id) * 4 - 8;
const bobSquid = (t, o) => Math.sin(t * 1.6 + o.id) * 6 - 10;
const bobGlass = (t, o) => Math.sin(t * 2.4 + o.id) * 3 - 4;
Object.assign(FACE, {
  queen:     { x: -10, y: -72, s: 0.51, my: 8 },
  mknight:   { x: -6,  y: -50, s: 0.5,  my: 8 },
  catapult:  { x: 30,  y: -38, s: 0.42 },
  kraken:    { x: -3,  y: -64, s: 0.86 },
  puffer:    { x: -8,  y: -34, s: 0.72, bob: bobPuffer },
  crab:      { x: 2,   y: -24, s: 0.55 },
  squid:     { x: 0,   y: -50, s: 0.62, bob: bobSquid },
  clown:     { x: -3,  y: -76, s: 0.48 },
  poodle:    { x: -22, y: -64, s: 0.42 },
  glassling: { x: 0,   y: -56, s: 0.7,  bob: bobGlass, glow: '#e6fbff' },
});
Object.assign(FOE_FLOAT, { puffer: -8, squid: -10, glassling: -4 });
Object.assign(CRACK_ZONE, {
  queen: [-8, -41, 18], mknight: [2, -28, 15], catapult: [-28, -22, 56, 10], kraken: [5, -64, 26],
  puffer: [0, -32, 20], crab: [4, -22, 18], squid: [0, -58, 14], clown: [0, -50, 11], poodle: [4, -36, 12], glassling: [0, -50, 16],
});
Object.assign(SWAY, { queen: 0.015, mknight: 0.02, clown: 0.06, poodle: 0.04, squid: 0.03 });
SONGS.queen = { ...SONGS.snowman, tempo: 112 };
SONGS.kraken = { ...SONGS.asteroid, tempo: 92 };
SONGS.mirrorcat = { ...SONGS.vending, tempo: 132 };
for (const k of ['mknight', 'catapult']) SONGS[k] = SONGS.queen;
for (const k of ['puffer', 'crab', 'squid']) SONGS[k] = SONGS.kraken;
for (const k of ['clown', 'poodle', 'glassling']) SONGS[k] = SONGS.mirrorcat;

// ---------------------------------------------------------------- Zeichnen der neuen Gegner
// lokale Koordinaten: Füße bei (0, 0), y nach oben negativ, Blick nach links (zur Katze)
const ln3 = (ctx, x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
// Kopie der aktiven Katze: dunkel (Spiegelkatze) oder golden (Katzenkönig der Goldenen Arena, warden.js)
const shadowCat = gold => {
  const c = CAT_BY_ID[S.activeCat] || CATS[0];
  return gold ? { ...c, fur: '#ffcf3a', belly: '#fff1a8', stripe: '#c9902a', eye: '#ff4d6d', ghost: false }
    : { ...c, fur: '#2e2448', belly: '#4b3a72', stripe: '#171030', eye: '#ff2d55', ghost: false };
};
Object.assign(NEW_FOES, {
  mknight(ctx, o, t) { // Maus in Rüstung mit Rundschild und Lanze
    const st = Math.sin(t * 5 + o.id) * 2;
    ctx.strokeStyle = '#c9a6b8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(16, -12); ctx.quadraticCurveTo(34, -10, 30, -30); ctx.stroke(); // Schwanz
    Draw.rrect(ctx, -10, -12, 8, 12 + st * 0.5, 3, '#7d8494'); Draw.rrect(ctx, 4, -12, 8, 12 - st * 0.5, 3, '#7d8494');
    Draw.ellipse(ctx, 2, -28, 17, 18, '#aab2c4');
    Draw.rrect(ctx, -14, -26, 32, 5, 2, '#7d8494');
    Draw.circle(ctx, -14, -66, 8, '#9a9cac'); Draw.circle(ctx, -14, -66, 4.5, '#ffb3c6');
    Draw.circle(ctx, 8, -68, 8, '#9a9cac'); Draw.circle(ctx, 8, -68, 4.5, '#ffb3c6');
    Draw.circle(ctx, -4, -52, 14, '#a7a9b8');
    Draw.ellipse(ctx, -18, -48, 7, 5, '#a7a9b8'); Draw.circle(ctx, -24, -48, 3, '#ff7a9a');
    ctx.beginPath(); ctx.arc(-4, -54, 15, Math.PI * 1.08, Math.PI * 1.92); ctx.lineTo(-4, -56); ctx.closePath(); ctx.fillStyle = '#c9d0e0'; ctx.fill();
    // Lanze mit Wimpel
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3; ln3(ctx, 14, -26, -6, -88);
    Draw.tri(ctx, [-8, -86], [-2, -88], [-10, -98], '#ffd34d');
    Draw.tri(ctx, [-4, -80], [-4, -72], [-18 + Math.sin(t * 8) * 2, -77], '#ff4d6d');
    // Rundschild vorne
    Draw.circle(ctx, -18, -26, 13, '#d93a55'); Draw.circle(ctx, -18, -26, 9, '#ffd34d'); Draw.circle(ctx, -18, -26, 4, '#d93a55');
  },
  catapult(ctx, o, t) { // Holzkatapult mit Ratte am Hebel
    const fire = o.windup > 0 ? Math.sin((1 - o.windup / 0.35) * Math.PI) : 0;
    Draw.rrect(ctx, -32, -22, 64, 10, 3, '#8b5a2b');
    Draw.tri(ctx, [-10, -20], [8, -20], [-1, -46], '#7a4a2a');
    for (const wx of [-20, 20]) { Draw.circle(ctx, wx, -9, 9, '#5a3a1a'); Draw.circle(ctx, wx, -9, 3, '#c9a27a'); }
    ctx.save(); ctx.translate(-1, -42); ctx.rotate(-0.35 - fire * 1.5 + Math.sin(t * 2 + o.id) * 0.04);
    Draw.rrect(ctx, -2, -2.5, 42, 5, 2, '#a0692f');
    Draw.rrect(ctx, 34, -10, 12, 9, 3, '#6b4a2a');
    if (fire < 0.5) Draw.tri(ctx, [35, -9], [46, -9], [40, -17], '#ffcf3a');
    ctx.restore();
    // Ratte am Hebel
    Draw.ellipse(ctx, 30, -26, 11, 10, '#7d7f8f');
    Draw.circle(ctx, 30, -40, 10, '#8a8c9c');
    Draw.circle(ctx, 24, -50, 5, '#8a8c9c'); Draw.circle(ctx, 24, -50, 2.5, '#ffb3c6');
    Draw.circle(ctx, 36, -51, 5, '#8a8c9c'); Draw.circle(ctx, 36, -51, 2.5, '#ffb3c6');
    Draw.circle(ctx, 21, -38, 2.5, '#ff7a9a');
  },
  queen(ctx, o, t) { // Rattenkönigin auf dem Käsethron (auf Boss-Größe der anderen Gebiete verkleinert)
    ctx.scale(0.82, 0.82);
    Draw.rrect(ctx, -4, -112, 56, 112, 10, '#ffcf3a');
    for (const [hx, hy, hr] of [[10, -96, 6], [34, -84, 8], [20, -64, 5], [40, -40, 6], [12, -30, 4]]) Draw.circle(ctx, hx, hy, hr, '#e0a800');
    Draw.rrect(ctx, -42, -40, 90, 16, 6, '#ffd34d');
    ctx.strokeStyle = '#d98a9a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(24, -26); ctx.quadraticCurveTo(52, -14 + Math.sin(t * 3) * 4, 46, -4); ctx.stroke();
    Draw.ellipse(ctx, 4, -47, 37, 41, '#ffffff'); // Umhang mit Hermelin-Saum
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + i * 0.12); Draw.circle(ctx, 4 + Math.cos(a) * 36, -47 + Math.sin(a) * 40, 1.6, '#1a1a1a'); }
    Draw.ellipse(ctx, 4, -49, 33, 37, '#b3203a');
    Draw.ellipse(ctx, -6, -52, 22, 26, '#8a8c9c');
    Draw.ellipse(ctx, -10, -46, 12, 16, '#c9b8c8');
    Draw.circle(ctx, -24, -102, 9, '#9a9cac'); Draw.circle(ctx, -24, -102, 5, '#ffb3c6');
    Draw.circle(ctx, 2, -104, 9, '#9a9cac'); Draw.circle(ctx, 2, -104, 5, '#ffb3c6');
    Draw.circle(ctx, -12, -86, 17, '#9a9cac');
    Draw.ellipse(ctx, -28, -82, 9, 7, '#9a9cac'); Draw.circle(ctx, -36, -82, 3.5, '#ff7a9a');
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ln3(ctx, -34, -80, -46, -84); ln3(ctx, -34, -79, -46, -76);
    // Zepter mit Käsekugel
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ln3(ctx, -28, -46, -38, -98);
    Draw.circle(ctx, -39, -102, 7, '#ffcf3a'); Draw.circle(ctx, -41, -104, 2, '#e0a800');
  },
  puffer(ctx, o, t) { // Kugelfisch: ab halbem Leben aufgebläht mit langen Stacheln
    ctx.translate(0, bobPuffer(t, o));
    const sw = o.hp < o.maxHp * 0.5 ? 1.25 : 1, r = 22 * sw, cy = -32;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + 0.2, l = r + (sw > 1 ? 10 : 5);
      Draw.tri(ctx, [Math.cos(a - 0.12) * r, cy + Math.sin(a - 0.12) * r], [Math.cos(a + 0.12) * r, cy + Math.sin(a + 0.12) * r], [Math.cos(a) * l, cy + Math.sin(a) * l], '#e0a030');
    }
    Draw.tri(ctx, [r - 4, cy], [r + 14, cy - 10 + Math.sin(t * 9) * 3], [r + 14, cy + 10 - Math.sin(t * 9) * 3], '#ffb347');
    Draw.circle(ctx, 0, cy, r, '#ffcf6a');
    Draw.ellipse(ctx, 0, cy + r * 0.4, r * 0.8, r * 0.5, '#fff1c2');
    for (const [dx, dy] of [[6, -14], [12, -4], [2, -20]]) Draw.circle(ctx, dx * sw, cy + dy * sw * 0.6, 2.5, '#d98a2a');
    Draw.ellipse(ctx, 4, cy + 4, 7, 4, '#ffb347');
  },
  crab(ctx, o, t) { // Krabbe mit großer Schild-Schere vorne
    const w = Math.sin(t * 6 + o.id);
    ctx.strokeStyle = '#c23a28'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ln3(ctx, -6 + i * 6, -16, -18 + i * 4, -2 + (i % 2 ? w : -w) * 2); ln3(ctx, 12 + i * 5, -16, 26 + i * 4, -2 + (i % 2 ? -w : w) * 2); }
    ln3(ctx, -4, -30, -6, -42); ln3(ctx, 8, -30, 10, -42);
    Draw.circle(ctx, -6, -44, 3.5, '#ff8a6a'); Draw.circle(ctx, 10, -44, 3.5, '#ff8a6a');
    Draw.ellipse(ctx, 4, -22, 26, 15, '#e8573f');
    Draw.ellipse(ctx, 0, -28, 14, 5, '#ff8a6a');
    // kleine Schere hinten, große vorne
    Draw.ellipse(ctx, 30, -30, 7, 6, '#e8573f'); Draw.tri(ctx, [32, -34], [40, -40], [36, -30], '#e8573f');
    ctx.save(); ctx.translate(-30, -26); ctx.rotate(Math.sin(t * 3 + o.id) * 0.12);
    Draw.ellipse(ctx, 0, 0, 15, 12, '#ff6a4f');
    Draw.tri(ctx, [-8, -8], [-22, -14], [-12, -2], '#ff6a4f'); Draw.tri(ctx, [-8, 6], [-22, 10], [-12, 2], '#ff6a4f');
    Draw.ellipse(ctx, 2, -3, 7, 4, '#ffa08a');
    ctx.restore();
  },
  squid(ctx, o, t) { // schwebender Tintenfisch mit wehenden Armen
    ctx.translate(0, bobSquid(t, o));
    ctx.strokeStyle = '#7a5ce0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const x0 = -13 + i * 5.2, sw = Math.sin(t * 4 + i + o.id) * 7;
      ctx.beginPath(); ctx.moveTo(x0, -36); ctx.quadraticCurveTo(x0 + sw, -20, x0 - sw * 0.6, -4); ctx.stroke();
    }
    Draw.ellipse(ctx, 0, -56, 18, 26, '#9d7bff');
    Draw.tri(ctx, [-16, -70], [16, -70], [0, -92], '#8a6cff');
    for (const [dx, dy] of [[-8, -64], [7, -70], [2, -44]]) Draw.circle(ctx, dx, dy, 2.5, '#c9b8ff');
  },
  kraken(ctx, o, t) { // Riesenkrake: Arme ringeln sich nach vorne
    ctx.scale(0.82, 0.82);
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, k = i % 3, sw = Math.sin(t * 2.2 + i * 1.3 + o.id) * 10;
      const x0 = side * (8 + k * 10), x1 = side * (38 + k * 14) + sw, x2 = side * (30 + k * 18) - sw * 0.5;
      ctx.strokeStyle = '#a3345a'; ctx.lineWidth = 13 - k * 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, -44); ctx.quadraticCurveTo(x1, -30, x2, -6); ctx.stroke();
      ctx.strokeStyle = '#ffb3c6'; ctx.lineWidth = 3;
      for (let j = 1; j < 4; j++) { const q = j / 4; Draw.circle(ctx, x0 + (x2 - x0) * q + side * 2, -44 + 38 * q, 2.4, '#ffb3c6'); }
    }
    Draw.ellipse(ctx, 6, -80, 42, 46, '#c2456b');
    Draw.ellipse(ctx, 6, -52, 34, 12, '#a3345a');
    for (const [dx, dy, r] of [[24, -104, 6], [36, -84, 4], [-14, -108, 4], [28, -64, 3]]) Draw.circle(ctx, dx, dy, r, '#e07a9a');
  },
  clown(ctx, o, t) { // Clowns-Maus auf dem Einrad, jongliert
    const roll = t * 6 + o.id;
    Draw.circle(ctx, 0, -14, 14, '#3a3f4f'); Draw.circle(ctx, 0, -14, 10, '#8a8f9f');
    ctx.strokeStyle = '#3a3f4f'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const a = roll + i * Math.PI / 3; ln3(ctx, Math.cos(a) * 10, -14 + Math.sin(a) * 10, -Math.cos(a) * 10, -14 - Math.sin(a) * 10); }
    ctx.lineWidth = 3; ln3(ctx, 0, -14, 0, -38);
    Draw.ellipse(ctx, 0, -52, 13, 16, '#ff5d8f');
    for (const [dx, dy] of [[-5, -58], [5, -50], [-3, -44], [6, -60]]) Draw.circle(ctx, dx, dy, 2.2, '#ffd34d');
    Draw.rrect(ctx, -10, -66, 20, 5, 2, '#5ab0ff');
    Draw.circle(ctx, -12, -84, 7, '#d7d9e3'); Draw.circle(ctx, -12, -84, 3.5, '#ffb3c6');
    Draw.circle(ctx, 8, -86, 7, '#d7d9e3'); Draw.circle(ctx, 8, -86, 3.5, '#ffb3c6');
    Draw.circle(ctx, -2, -76, 12, '#e6e8f0');
    Draw.circle(ctx, -14, -73, 4.5, '#ff2d55');
    Draw.tri(ctx, [-10, -86], [8, -88], [0, -106], '#5ab0ff'); Draw.circle(ctx, 0, -107, 3.5, '#ffd34d');
    // Jonglierbälle
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + i * 2.1 + o.id;
      Draw.circle(ctx, -16 + Math.cos(a) * 12, -96 + Math.sin(a) * 9 - Math.abs(Math.sin(a)) * 6, 4, ['#ff4d6d', '#6ee7a0', '#ffd34d'][i]);
    }
  },
  poodle(ctx, o, t) { // Ballontier-Pudel aus glänzenden Ballon-Würsten
    const col = o.half ? '#7fe0ff' : '#ff8ec4', hi = 'rgba(255,255,255,0.55)';
    const st = Math.sin(t * 6 + o.id) * 2;
    for (const [lx, ph] of [[-12, 1], [-4, -1], [14, -1], [22, 1]]) Draw.ellipse(ctx, lx, -12 + st * ph * 0.5, 5, 12, col);
    Draw.ellipse(ctx, 6, -34, 24, 10, col);
    Draw.ellipse(ctx, -16, -48, 7, 14, col);
    Draw.ellipse(ctx, -20, -64, 13, 10, col);
    Draw.ellipse(ctx, -34, -62, 9, 6, col);
    Draw.ellipse(ctx, -12, -72, 5, 9, col);
    Draw.ellipse(ctx, 30, -46 + Math.sin(t * 5) * 2, 6, 11, col);
    for (const [hx, hy] of [[0, -38], [-22, -68], [-36, -64], [30, -50], [-16, -52]]) Draw.ellipse(ctx, hx, hy, 4, 2, hi);
    Draw.circle(ctx, -42, -62, 2.5, '#ff2d55');
  },
  glassling(ctx, o, t) { // Spiegel-Geist: wandelnder Spiegel im Goldrahmen
    ctx.translate(0, bobGlass(t, o));
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    const st = Math.sin(t * 6 + o.id) * 3;
    ln3(ctx, -8, -16, -12, 0 + st * 0.3); ln3(ctx, 8, -16, 12, 0 - st * 0.3);
    Draw.ellipse(ctx, 0, -50, 24, 36, '#ffd34d');
    Draw.ellipse(ctx, 0, -50, 20, 32, '#c9a227');
    const g = ctx.createLinearGradient(-18, -82, 18, -18);
    g.addColorStop(0, '#e6fbff'); g.addColorStop(0.5, '#9fd8ff'); g.addColorStop(1, '#c9b8ff');
    Draw.ellipse(ctx, 0, -50, 17, 29, g);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, -50, 17, 29, 0, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    const sh = ((t * 0.6 + o.id * 0.3) % 1.6) * 60 - 40;
    ln3(ctx, -20 + sh, -20, 0 + sh, -80); ctx.lineWidth = 2; ln3(ctx, -10 + sh, -20, 10 + sh, -80);
    ctx.restore();
    Draw.tri(ctx, [-6, -86], [6, -86], [0, -96], '#ffd34d');
  },
  mirrorcat(ctx, o, t) { // Spiegelkatze: dunkle Kopie der eigenen Katze mit der eigenen Waffe
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    FX.drawGlow(ctx, 0, -40, 60, o.kind === 'goldcat' ? '#ffcf3a' : '#b48cff', 0.35 + Math.sin(t * 3) * 0.1);
    ctx.restore();
    // getroffen: dasselbe Schmerz-Gesicht wie die eigene Katze (> <, offenes Maul, Tränen,
    // Zurückzucken); harte Treffer mit kreisenden Sternen, wenig Leben: besorgt
    const hurt = o.hurtT || 0, ouch = U.clamp(hurt / 0.28, 0, 1), flinch = ouch * ouch;
    const ox = flinch ? -flinch * 7 + Math.sin(t * 60) * flinch * 2.5 : 0;
    ctx.save(); ctx.scale(-1, 1); // schaut nach links zur Katze
    Draw.cat(ctx, ox, 0, 1, shadowCat(o.kind === 'goldcat'), t, {
      weapon: S.slots[0] || null, look: { x: 1, y: 0 }, fury: ouch ? 0 : o.enraged ? 1 : 0.4,
      ouch, ouchBig: hurt > 0.32, worry: !ouch && o.hp < o.maxHp * 0.3, squash: flinch * 0.14,
    });
    ctx.restore();
  },
});

// Ballon-Pudel zerfallen immer in zwei Hälften (Teiler)
const _r3Make = Battle.makeObstacle;
Battle.makeObstacle = function (boss) {
  const o = _r3Make.call(this, boss);
  if (o && o.kind === 'poodle' && !o.boss && !o.trait && !o.shade) o.trait = 'splitter';
  return o;
};

// ---------------------------------------------------------------- Raum-Regeln
Object.assign(Rooms, { cheese: [], cheeseT: 5, bubbles: [], bubbleT: 1, inkT: 0 });
const _r3Reset = Rooms.reset;
Rooms.reset = function () { _r3Reset.call(this); this.cheese = []; this.cheeseT = 5; this.bubbles = []; this.bubbleT = 1; this.inkT = 0; };

const _r3Update = Rooms.update;
Rooms.update = function (dt, B) {
  _r3Update.call(this, dt, B);
  const k = this.kind(), cs = B.cs;
  this.inkT = Math.max(0, this.inkT - dt);
  if (k === 'fort') {
    this.cheeseT -= dt;
    if (this.cheeseT <= 0) {
      this.cheeseT = U.rand(5, 7.5);
      // vom Katapult (falls da), sonst von rechts außerhalb
      const cat = B.obs.find(o => o.kind === 'catapult' && !o.dead && !o.fleeing && o.x < (B.Wp || B.W));
      const sx = cat ? cat.x : (B.Wp || B.W) + 40, sy = cat ? cat.y - 60 * cs : B.groundY * 0.5;
      if (cat) cat.windup = 0.35;
      const c = Vitals.catPoint(B);
      this.cheese.push({ sx, sy, ex: c.x, ey: c.y, t: 0, T: 1.9, back: false, rot: 0 });
      SFX.play('throw');
    }
    for (const ch of this.cheese) {
      ch.t += dt; ch.rot += dt * (ch.back ? -9 : 6);
      const q = Math.min(1, ch.t / ch.T), arc = (ch.back ? 140 : 200) * cs;
      ch.x = ch.sx + (ch.ex - ch.sx) * q; ch.y = ch.sy + (ch.ey - ch.sy) * q - Math.sin(q * Math.PI) * arc;
      if (q < 1) continue;
      ch.done = true;
      if (ch.back) {
        const o = B.obs.find(o => o.id === ch.id && !o.dead) || B.front();
        if (o) { B.damage(o, o.maxHp * (o.boss ? 0.04 : 0.3), false, false, 'cheese'); B.text(o.x, o.y - OBST_H[o.kind] * o.scale - 20 * cs, 'KÄSETREFFER!', '#ffcf3a', 16 * cs, true); }
      } else {
        Vitals.hurt(B, Vitals.ref().maxHp * 0.06);
      }
      for (let i = 0; i < 10; i++) B.particle(ch.x, ch.y, U.rand(-160, 160), U.rand(-260, -60), U.pick(['#ffcf3a', '#e0a800', '#fff1a8']), 0.7, U.rand(3, 6) * cs, 1100, true, 'chunk');
      B.shake = Math.max(B.shake, 5);
      SFX.play('crack', 1);
    }
    this.cheese = this.cheese.filter(c => !c.done);
  } else this.cheese = [];
  if (k === 'wreck') {
    this.bubbleT -= dt;
    if (this.bubbleT <= 0 && this.bubbles.length < 5) {
      this.bubbleT = U.rand(1.3, 2.4);
      this.bubbles.push({ x: U.rand(B.catX + 60 * cs, (B.Wp || B.W) - 40), y: B.groundY - 6, r: U.rand(11, 16) * cs, ph: Math.random() * 6 });
    }
    for (const b of this.bubbles) { b.y -= (55 + b.r * 2) * dt; b.ph += dt * 3; if (b.y < -30) b.done = true; }
    this.bubbles = this.bubbles.filter(b => !b.done);
  } else this.bubbles = [];
};

// Käselaib zurückschicken bzw. Blase platzen lassen
const _r3Tap = Rooms.tap;
Rooms.tap = function (B, x, y) {
  const cs = B.cs;
  for (const ch of this.cheese) {
    if (ch.back || ch.done || ch.t < 0.15) continue;
    if (Math.hypot(x - ch.x, y - ch.y) < 48 * cs) {
      const tg = B.front();
      ch.back = true; ch.sx = ch.x; ch.sy = ch.y; ch.t = 0; ch.T = 0.8;
      ch.ex = tg ? tg.x : (B.Wp || B.W) * 0.8; ch.ey = tg ? tg.y - OBST_H[tg.kind] * tg.scale * 0.5 : B.groundY - 40; ch.id = tg ? tg.id : -1;
      B.text(ch.x, ch.y - 24 * cs, 'ZURÜCK!', '#ffcf3a', 16 * cs, true);
      FX.addRing(ch.x, ch.y, 40 * cs, '#ffcf3a', 0.25, 4);
      B.purr = Math.min(100, B.purr + 6);
      SFX.play('parry');
      return true;
    }
  }
  for (const b of this.bubbles) {
    if (b.done || Math.hypot(x - b.x, y - b.y) > b.r + 22 * cs) continue;
    b.done = true;
    B.purr = Math.min(100, B.purr + 8);
    Vitals.heal(B, 0.03, true);
    B.text(b.x, b.y - 10 * cs, '+8 🐾', '#7ef9ff', 14 * cs, true);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B.particle(b.x, b.y, Math.cos(a) * 120, Math.sin(a) * 120, '#e6fbff', 0.35, 3 * cs, 0, false, 'spark'); }
    SFX.play('pop');
    return true;
  }
  return _r3Tap.call(this, B, x, y);
};

// Tintenfisch besiegt → Tinte vernebelt kurz die Sicht
const _r3Kill = Battle.kill;
Battle.kill = function (o) {
  if (!o.dead && o.kind === 'squid' && Rooms.kind() === 'wreck') Rooms.inkT = 1.4;
  return _r3Kill.call(this, o);
};

// ---------------------------------------------------------------- Hintergründe
const _r3Bg = Rooms.drawBg;
Rooms.drawBg = function (ctx, B, biome) {
  const k = biome.special;
  if (k === 'fort') this.bgFort(ctx, B, biome);
  else if (k === 'wreck') this.bgWreck(ctx, B, biome);
  else if (k === 'mirror') this.bgMirror(ctx, B, biome);
  else _r3Bg.call(this, ctx, B, biome);
};

Rooms.bgFort = function (ctx, B, biome) {
  const W = B.W, H = B.H, gy = B.groundY, t = B.t, sc = B.scroll;
  this.sky(ctx, B, biome);
  // Käsemond
  const mx = W * 0.78, my = gy * 0.24, mr = Math.min(46, W * 0.07);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.drawGlow(ctx, mx, my, mr * 2.4, '#ffcf3a', 0.35); ctx.restore();
  Draw.circle(ctx, mx, my, mr, '#ffd34d');
  for (const [dx, dy, r] of [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.14], [-0.05, 0.38, 0.1], [0.3, -0.35, 0.08]]) Draw.circle(ctx, mx + dx * mr, my + dy * mr, r * mr, '#e0a800');
  // ferne Burg mit Mausohren-Fahnen
  const bx = W * 0.35 - (sc * 0.12) % (W + 500) + (sc * 0.12 > W * 0.35 + 250 ? W + 500 : 0);
  ctx.fillStyle = '#2a1a3a';
  ctx.fillRect(bx - 110, gy - 120, 220, 120);
  for (const tx of [-130, 90]) {
    ctx.fillRect(bx + tx, gy - 180, 40, 180);
    Draw.tri(ctx, [bx + tx - 6, gy - 180], [bx + tx + 46, gy - 180], [bx + tx + 20, gy - 222], '#3a2448');
    ctx.strokeStyle = '#3a2448'; ctx.lineWidth = 2; ln3(ctx, bx + tx + 20, gy - 222, bx + tx + 20, gy - 246);
    const fw = Math.sin(t * 4 + tx) * 3;
    Draw.tri(ctx, [bx + tx + 20, gy - 246], [bx + tx + 20, gy - 234], [bx + tx + 40 + fw, gy - 240], '#ff4d6d');
    Draw.circle(ctx, bx + tx + 30 + fw * 0.5, gy - 244, 3, '#ff4d6d');
  }
  for (let i = 0; i < 4; i++) { ctx.fillStyle = Math.sin(t * 3 + i) > -0.4 ? '#ffcf3a' : '#a08020'; ctx.fillRect(bx - 70 + i * 40, gy - 86, 10, 16); }
  // Burgmauer mit Zinnen hinter dem Weg
  const wy = gy - 70;
  ctx.fillStyle = biome.hills2; ctx.fillRect(-20, wy, W + 40, 70);
  const zs = 44, off = (sc * 0.5) % zs;
  for (let x = -zs - off; x < W + zs; x += zs) ctx.fillRect(x, wy - 16, zs * 0.55, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let r = 0; r < 3; r++) for (let x = -zs - off + (r % 2) * 22; x < W + zs; x += zs) ctx.fillRect(x, wy + 8 + r * 20, zs - 6, 2);
  // Fackeln
  for (let i = 0; i < 3; i++) {
    const fx = ((i * 330 - sc * 0.5) % (W + 300) + W + 300) % (W + 300) - 100, fy = wy + 22;
    Draw.rrect(ctx, fx - 3, fy, 6, 18, 2, '#5a3a1a');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    FX.drawGlow(ctx, fx, fy - 4, 42, '#ff8a3c', 0.55 + Math.sin(t * 13 + i) * 0.1);
    FX.drawGlow(ctx, fx, fy - 6, 12, '#ffe08a', 0.9);
    ctx.restore();
  }
  // Kopfsteinpflaster
  ctx.fillStyle = biome.ground; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  const cw = 26, co = sc % cw;
  for (let r = 0; r < 4; r++) for (let x = -cw - co + (r % 2) * 13; x < W + cw; x += cw) ctx.fillRect(x, gy + 6 + r * 12, cw - 4, 8);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.fillStyle = biome.ground2; ctx.fillRect(-20, gy, W + 40, 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
};

Rooms.bgWreck = function (ctx, B, biome) {
  const W = B.W, H = B.H, gy = B.groundY, t = B.t, sc = B.scroll;
  this.sky(ctx, B, biome);
  // Lichtstrahlen von der Wasseroberfläche
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = W * (0.1 + i * 0.22) + Math.sin(t * 0.5 + i * 1.7) * 30;
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, 'rgba(160,240,255,0.22)'); g.addColorStop(1, 'rgba(160,240,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 14, 0); ctx.lineTo(x + 14, 0); ctx.lineTo(x + 70, gy); ctx.lineTo(x - 50, gy); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // Wellen-Linie oben
  ctx.strokeStyle = 'rgba(200,250,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = -20; x <= W + 20; x += 16) ctx.lineTo(x, 6 + Math.sin(x * 0.04 + t * 2) * 3);
  ctx.stroke();
  // Schiffswrack (Rumpf, Mast, Bullaugen) im Hintergrund
  const sx = W * 0.55 - (sc * 0.1) % (W + 600) + (sc * 0.1 > W * 0.55 + 300 ? W + 600 : 0), sy = gy - 10;
  ctx.fillStyle = '#0b3048';
  ctx.beginPath(); ctx.moveTo(sx - 170, sy - 70); ctx.lineTo(sx + 150, sy - 96); ctx.lineTo(sx + 120, sy); ctx.lineTo(sx - 140, sy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#0b3048'; ctx.lineWidth = 7; ln3(ctx, sx - 20, sy - 82, sx + 10, sy - 230);
  ctx.lineWidth = 4; ln3(ctx, sx - 60, sy - 190, sx + 70, sy - 206);
  ctx.fillStyle = 'rgba(11,48,72,0.8)'; ctx.beginPath(); ctx.moveTo(sx + 2, sy - 196); ctx.lineTo(sx + 60, sy - 200); ctx.lineTo(sx + 30, sy - 120); ctx.closePath(); ctx.fill();
  for (let i = 0; i < 4; i++) { Draw.circle(ctx, sx - 90 + i * 55, sy - 46 - i * 6, 8, '#06202f'); Draw.circle(ctx, sx - 90 + i * 55, sy - 46 - i * 6, 5, 'rgba(126,249,255,0.25)'); }
  // Seetang
  for (let i = 0; i < 9; i++) {
    const x = ((i * 137 - sc * 0.5) % (W + 120) + W + 120) % (W + 120) - 60, h = 50 + (i * 23) % 50;
    ctx.strokeStyle = i % 2 ? '#1f8a5a' : '#2fae6e'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, gy);
    for (let j = 1; j <= 4; j++) ctx.lineTo(x + Math.sin(t * 1.5 + i + j * 0.8) * 8 * j / 4, gy - h * j / 4);
    ctx.stroke();
  }
  // kleine Hintergrund-Blasen
  ctx.fillStyle = 'rgba(220,250,255,0.35)';
  for (let i = 0; i < 14; i++) {
    const x = (i * 97 + Math.sin(t + i) * 10) % W, y = gy - ((t * (18 + i % 5 * 6) + i * 41) % gy);
    Draw.circle(ctx, x, y, 1.5 + i % 3, 'rgba(220,250,255,0.35)');
  }
  // Sandboden mit Muscheln
  ctx.fillStyle = biome.ground; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
  ctx.fillStyle = 'rgba(120,90,40,0.25)';
  for (let x = -((sc) % 40); x < W + 40; x += 40) Draw.ellipse(ctx, x + 10, gy + 14 + (x % 3), 8, 2, 'rgba(120,90,40,0.25)');
  for (let i = 0; i < 4; i++) { const x = ((i * 211 - sc) % (W + 80) + W + 80) % (W + 80) - 40; Draw.tri(ctx, [x - 6, gy + 8], [x + 6, gy + 8], [x, gy + 1], '#ffb3c6'); }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.fillStyle = biome.ground2; ctx.fillRect(-20, gy, W + 40, 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
};

Rooms.bgMirror = function (ctx, B, biome) {
  // breit zeichnen: gespiegelt muss auch der Streifen unter der Symbolleiste (quer) bedeckt sein
  const W = B.W, H = B.H, gy = B.groundY, t = B.t, sc = B.scroll, x0 = -(B.insetR || 0) - 60, x1 = W + (B.insetR || 0) + 60;
  const g = ctx.createLinearGradient(0, 0, 0, gy);
  g.addColorStop(0, biome.sky[0]); g.addColorStop(1, biome.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(x0, -20, x1 - x0, gy + 20);
  // Zeltbahnen
  const sw = 46, so = (sc * 0.15) % (sw * 2);
  for (let x = x0 - sw * 2 - so; x < x1; x += sw * 2) {
    ctx.fillStyle = 'rgba(255,122,217,0.13)';
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, 0); ctx.lineTo(x + sw * 1.15, gy); ctx.lineTo(x - sw * 0.15, gy); ctx.closePath(); ctx.fill();
  }
  // Lichterkette
  const ly = Math.max(40, gy * 0.12);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let x = x0; x <= x1; x += 10) ctx.lineTo(x, ly + Math.abs(Math.sin((x + sc * 0.2) * 0.012)) * 26);
  ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let x = x0 + 20 - (sc * 0.2) % 40; x <= x1; x += 40) {
    const yy = ly + Math.abs(Math.sin((x + sc * 0.2) * 0.012)) * 26 + 4, i = Math.round((x + sc * 0.2) / 40);
    const on = Math.sin(t * 4 + i) > -0.3;
    FX.drawGlow(ctx, x, yy, 14, ['#ffd34d', '#ff7ad9', '#7ef9ff'][((i % 3) + 3) % 3], on ? 0.8 : 0.25);
  }
  ctx.restore();
  // Zerrspiegel an der Wand: Goldrahmen, wabernde Spiegelung
  const mw = 70, gap = 150, mo = (sc * 0.35) % gap;
  for (let x = x0 - mo; x < x1 + gap; x += gap) {
    const i = Math.round((x + sc * 0.35) / gap), wob = Math.sin(t * 2 + i) * 0.18;
    const my = gy - 175, mh = 150;
    Draw.rrect(ctx, x - 6, my - 6, mw + 12, mh + 12, 36, '#c9a227');
    Draw.rrect(ctx, x - 2, my - 2, mw + 4, mh + 4, 33, '#ffd34d');
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, my, mw, mh, 30); ctx.clip();
    const mg = ctx.createLinearGradient(x, my, x + mw, my + mh);
    mg.addColorStop(0, '#3a2a6a'); mg.addColorStop(0.5, '#7a5ab0'); mg.addColorStop(1, '#2a1a4a');
    ctx.fillStyle = mg; ctx.fillRect(x, my, mw, mh);
    // verzerrte Katzen-Silhouette im Spiegel
    ctx.globalAlpha = 0.35;
    Draw.ellipse(ctx, x + mw / 2, my + mh * 0.62, mw * (0.28 + wob), mh * (0.22 - wob * 0.4), '#ff9ee0');
    Draw.circle(ctx, x + mw / 2, my + mh * 0.34, mw * (0.18 - wob * 0.3), '#ff9ee0');
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
    const sh = ((t * 0.5 + i * 0.37) % 2) * mw * 1.5 - mw * 0.5;
    ln3(ctx, x + sh, my + mh, x + sh + 50, my);
    ctx.restore();
  }
  // Schachbrett-Boden
  ctx.fillStyle = biome.ground; ctx.fillRect(x0, gy, x1 - x0, H - gy + 20);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, gy, x1 - x0, H - gy + 20); ctx.clip();
  for (let j = 0; j < 5; j++) {
    const y0 = gy + Math.pow(j / 5, 1.5) * (H - gy + 20), y1 = gy + Math.pow((j + 1) / 5, 1.5) * (H - gy + 20);
    const tw = 36 + j * 18, off = (sc * (0.5 + j * 0.15)) % (tw * 2);
    for (let x = x0 - tw * 2 - off; x < x1 + tw * 2; x += tw) {
      if ((Math.round((x + off) / tw) + j) % 2) continue;
      ctx.fillStyle = 'rgba(255,122,217,0.14)'; ctx.fillRect(x, y0, tw, y1 - y0);
    }
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.fillStyle = biome.ground2; ctx.fillRect(x0, gy, x1 - x0, 2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
};

// ---------------------------------------------------------------- Bildschirm-Ebene (Käse, Blasen, Tinte)
const _r3Screen = Rooms.drawScreen;
Rooms.drawScreen = function (ctx, B) {
  _r3Screen.call(this, ctx, B);
  const k = this.kind(), cs = B.cs, t = B.t, iB = B.insetB || 0;
  const pill = (txt, col) => {
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '800 12px "Segoe UI", "Segoe UI Emoji", sans-serif';
    const w = ctx.measureText(txt).width + 22;
    Draw.rrect(ctx, 12, B.H - 104 - iB, w, 24, 12, 'rgba(20,10,40,0.75)');
    ctx.fillStyle = col; ctx.fillText(txt, 23, B.H - 92 - iB);
    ctx.restore();
  };
  if (k === 'fort') {
    for (const ch of this.cheese) {
      if (!ch.back) { // Zielschatten an der Katze
        ctx.save(); ctx.globalAlpha = 0.3 + Math.sin(t * 18) * 0.12; Draw.ellipse(ctx, ch.ex, B.groundY - 2, 26 * cs * Math.min(1, ch.t / ch.T + 0.3), 7 * cs, '#ff4d6d'); ctx.restore();
      }
      ctx.save(); ctx.translate(ch.x, ch.y); ctx.rotate(ch.rot); ctx.scale(cs, cs);
      Draw.circle(ctx, 0, 0, 15, '#ffcf3a');
      Draw.rrect(ctx, -15, -3, 30, 6, 2, '#ffe08a');
      Draw.circle(ctx, -6, -6, 3, '#e0a800'); Draw.circle(ctx, 6, 5, 2.5, '#e0a800'); Draw.circle(ctx, 5, -8, 2, '#e0a800');
      ctx.restore();
      if (!ch.back && ch.t < ch.T * 0.85) {
        ctx.save(); ctx.font = `900 ${12 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.9)'; ctx.strokeText('ANTIPPEN!', ch.x, ch.y - 26 * cs);
        ctx.fillStyle = '#ffcf3a'; ctx.fillText('ANTIPPEN!', ch.x, ch.y - 26 * cs); ctx.restore();
      }
    }
    pill(`🧀 Käselaibe antippen – sie fliegen zurück`, '#ffcf3a');
  } else if (k === 'wreck') {
    for (const b of this.bubbles) {
      const r = b.r * (1 + Math.sin(b.ph) * 0.06);
      ctx.save();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = '#e6fbff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x + Math.sin(b.ph) * 4, b.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#7ef9ff'; ctx.fill();
      ctx.globalAlpha = 0.8; Draw.ellipse(ctx, b.x + Math.sin(b.ph) * 4 - r * 0.35, b.y - r * 0.4, r * 0.25, r * 0.15, '#ffffff');
      ctx.restore();
    }
    if (this.inkT > 0) { // Tintenwolke
      ctx.save(); ctx.globalAlpha = Math.min(0.75, this.inkT * 0.6);
      for (let i = 0; i < 7; i++) Draw.circle(ctx, (B.Wp || B.W) * (0.2 + (i * 0.13) % 0.7), B.H * (0.3 + (i * 0.21) % 0.4), Math.min(B.W, B.H) * (0.18 + (i % 3) * 0.05), '#140a2a');
      ctx.restore();
    }
    pill('🐟 Luftblasen antippen: Schnurr-Meter und Heilung', '#7ef9ff');
  } else if (k === 'mirror') {
    pill('✨ Spiegelkabinett – die Gegner kommen von links', '#ff9ee0');
  }
};

// Blasen-Plopp
const _playR3 = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  if (name === 'pop') { this.tone(900, 0.06, 'sine', 0.07, 600); this.tone(1400, 0.05, 'sine', 0.04, 0, 0.03); return; }
  return _playR3.call(this, name, arg);
};

// ---------------------------------------------------------------- Spiegelung (Spiegelkabinett)
// Die Welt wird beim Zeichnen um die Mitte des Spielfelds geklappt (Kartenwende-Animation).
// Texte werden an ihrer Stelle zurückgedreht, damit sie lesbar bleiben; Tipps werden
// in Weltkoordinaten zurückgerechnet, Münzen fliegen trotzdem zur richtigen Anzeige.
const Mirror = {
  k: 1, last: 0,
  want() { return Rooms.kind() === 'mirror'; },
  axis(B) { return (B.Wp || B.W) / 2; },
  flipped() { return this.k < 0; },
  // Bildschirm-x → Welt-x
  toWorld(B, x) { const c = this.axis(B); return Math.abs(this.k) < 0.2 ? null : c + (x - c) / this.k; },
  apply(ctx, B) {
    const now = performance.now(), dt = Math.min(0.1, (now - (this.last || now)) / 1000); this.last = now;
    const tgt = this.want() ? -1 : 1;
    if (this.k !== tgt) {
      const was = this.k;
      this.k = tgt < this.k ? Math.max(tgt, this.k - dt * 3.2) : Math.min(tgt, this.k + dt * 3.2);
      if (was > 0 !== this.k > 0) { // Kante der Wende: Blitz und Banner
        B.whiteFlash = Math.max(B.whiteFlash || 0, 0.35);
        if (tgt < 0) B.showBanner('SPIEGELKABINETT!', 'Alles ist verkehrt – die Gegner kommen von links', '#ff7ad9');
        SFX.play('warp');
      }
    }
    ctx._mir = this.k < 0;
    if (this.k === 1) return;
    const c = this.axis(B);
    ctx.translate(c, 0); ctx.scale(this.k, 1); ctx.translate(-c, 0);
  },
  end(ctx) { ctx._mir = false; },
};
// Texte im gespiegelten Bild zurückdrehen (gilt auch für die Symbol-Bilder aus icons.js)
(function () {
  const P = CanvasRenderingContext2D.prototype, fill = P.fillText, stroke = P.strokeText;
  P.fillText = function (s, x, y, mw) {
    if (!this._mir) return fill.call(this, s, x, y, mw);
    this.save(); this.translate(x, y); this.scale(-1, 1);
    const r = fill.call(this, s, 0, 0, mw); this.restore(); return r;
  };
  P.strokeText = function (s, x, y, mw) {
    if (!this._mir) return stroke.call(this, s, x, y, mw);
    this.save(); this.translate(x, y); this.scale(-1, 1);
    const r = stroke.call(this, s, 0, 0, mw); this.restore(); return r;
  };
})();
// Tipps ins Spielfeld: Bildschirm → Welt
Battle.onPointer = function (e) {
  SFX.init();
  const r = this.cv.getBoundingClientRect();
  let x = e.clientX - r.left;
  if (Mirror.k !== 1) { x = Mirror.toWorld(this, x); if (x === null) return; }
  this.paw(x, e.clientY - r.top);
};
// Münzen/Gräten fliegen zur echten Anzeige; Schatten-Strahlen treffen die echten Knöpfe
const _mirUpdate = Battle.update;
Battle.update = function (dt) {
  if (Mirror.k === 1 || !this.targets || Math.abs(Mirror.k) < 0.2) return _mirUpdate.call(this, dt);
  const T = this.targets, m = {};
  for (const key of Object.keys(T)) m[key] = { ...T[key], x: Mirror.toWorld(this, T[key].x) };
  this.targets = m;
  try { return _mirUpdate.call(this, dt); } finally { this.targets = T; }
};
const _mirTarget = Shades.targetPoint;
Shades.targetPoint = function (B, key) {
  const p = _mirTarget.call(this, B, key);
  if (Mirror.k === 1 || key.startsWith('slot:') || key.startsWith('pet:') || Math.abs(Mirror.k) < 0.2) return p;
  return { ...p, x: Mirror.toWorld(B, p.x) };
};
