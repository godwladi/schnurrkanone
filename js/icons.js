'use strict';
// ---------------------------------------------------------------------------
// Eigener Symbolsatz statt System-Emojis (die sehen auf iPhone, Windows und
// Android verschieden aus, manche fehlen ganz). Jedes Symbol ist eine kleine
// SVG-Grafik im Stil der Katzen: weiche Formen, dunkle Kontur, Glanzlicht.
//   - HTML: Emojis in Texten werden automatisch durch die Symbole ersetzt
//     (MutationObserver), auch in Meldungen, Fenstern und Reitern.
//   - Leinwand: fillText/strokeText/measureText zeichnen Emojis als Bild.
// Unbekannte Emojis bleiben stehen (Konsole meldet sie einmal).
// ---------------------------------------------------------------------------

(function () {
const IK = '#2a1630'; // Konturfarbe
const NS = ' stroke="none"';
const P = (d, f, x = '') => `<path d="${d}" fill="${f}"${x}/>`;
const C = (cx, cy, r, f, x = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${x}/>`;
const E = (cx, cy, rx, ry, f, x = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${x}/>`;
const R = (x, y, w, h, rx, f, x2 = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${x2}/>`;
const HI = d => P(d, 'rgba(255,255,255,0.6)', NS);                       // Glanzlicht
const LN = (d, col = IK, w = 2) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
// dicke Linie mit Kontur (Knochen, Klingen, Strahlen)
const BAR = (d, col, w = 2.6) => `<path d="${d}" fill="none" stroke="${IK}" stroke-width="${w + 2.4}"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
const pts = (cx, cy, R1, r1, n, rot = -90) => Array.from({ length: n * 2 }, (_, i) => {
  const a = (rot + i * 180 / n) * Math.PI / 180, r = i % 2 ? r1 : R1;
  return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
}).join(' ');
const STAR = (cx, cy, R1, r1, n, f, rot) => `<polygon points="${pts(cx, cy, R1, r1, n, rot)}" fill="${f}"/>`;
const GEAR = (cx, cy, f) => {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a0 = i * Math.PI / 4;
    for (const [da, r] of [[-0.24, 9], [-0.15, 12.5], [0.15, 12.5], [0.24, 9], [0.54, 9]]) {
      const a = a0 + da;
      d += `${d ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `;
    }
  }
  return P(d + 'Z', f);
};
const LEAF = (x, y, rot, s, f) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${P('M0 0 C4 -6 12 -7 17 0 C12 7 4 6 0 0Z', f)}${LN('M2 0 L13 0', 'rgba(42,22,48,0.45)', 1.2)}</g>`;
const HEART = (f, s = 1, x = 0, y = 0) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M16 27 C6 20 3 14 5 9.5 C7 5 13 5 16 10 C19 5 25 5 27 9.5 C29 14 26 20 16 27Z', f)}${HI('M8.5 9 C9.5 7.2 11.6 7 12.6 8.4 C11 8.6 9.8 9.6 9.4 11Z')}</g>`;
const CATHEAD = (fur, opt = {}) => [
  P('M6 13 L7 3.5 L13.5 9.5Z', fur), P('M26 13 L25 3.5 L18.5 9.5Z', fur),
  P('M8.5 11 L8.8 6.5 L11.8 9.5Z', '#ff9eb5', NS), P('M23.5 11 L23.2 6.5 L20.2 9.5Z', '#ff9eb5', NS),
  E(16, 18, 12, 10.5, fur),
  opt.angry
    ? LN('M8.5 13.5 L13.5 15.5 M23.5 13.5 L18.5 15.5', IK, 2) + E(11, 17.5, 2, 2.2, IK, NS) + E(21, 17.5, 2, 2.2, IK, NS) + E(16, 24, 3.6, 3, '#5a1a2a') + P('M13.6 22.6 L14.6 25 L15.4 22.6Z M16.6 22.6 L17.4 25 L18.4 22.6Z', '#fff', NS)
    : opt.sleep
      ? LN('M8.5 17.5 Q11 19.5 13.5 17.5 M18.5 17.5 Q21 19.5 23.5 17.5', IK, 1.8) + LN('M14.5 22.5 Q16 24 17.5 22.5', IK, 1.5)
      : E(11, 17, 2.2, 2.8, IK, NS) + E(21, 17, 2.2, 2.8, IK, NS) + C(11.7, 16, 0.8, '#fff', NS) + C(21.7, 16, 0.8, '#fff', NS) + LN('M13.5 23 Q16 25 16 22.5 Q16 25 18.5 23', IK, 1.5),
  P('M14.8 20.5 L17.2 20.5 L16 22Z', '#ff7a9a', NS),
  HI('M9 11.5 C10.5 9.5 13 9 14.5 9.5 C12 10.5 10.5 12 10 13.5Z'),
].join('');

const ICONS = {
  // ---------------------------------------------------------------- Währungen & Grundsymbole
  coin: C(16, 16, 12.5, '#ffc93a') + C(16, 16, 9, '#ffdb6e', ' stroke="#d9951a" stroke-width="1.6"')
    + E(16, 18.3, 3.4, 2.8, '#d9951a', NS) + C(11.8, 14.2, 1.6, '#d9951a', NS) + C(14.4, 12, 1.6, '#d9951a', NS) + C(17.6, 12, 1.6, '#d9951a', NS) + C(20.2, 14.2, 1.6, '#d9951a', NS)
    + HI('M7.5 11 C9 7.5 12 6 15 5.8 C11.5 7.5 9.5 9.5 8.6 12.5Z'),
  bone: P('M3.5 16 C6 9 11 9.5 12.5 12 L12.5 20 C11 22.5 6 23 3.5 16Z', '#f3ead8')
    + BAR('M12 16 L24 16', '#f3ead8', 3) + BAR('M15 10 Q16.6 16 15 22 M18.6 10.5 Q20 16 18.6 21.5 M22 11.5 Q23.2 16 22 20.5', '#f3ead8', 1.6)
    + P('M24 16 L29.5 10 L28 16 L29.5 22Z', '#f3ead8') + C(7.6, 14.8, 1.4, IK, NS),
  mint: BAR('M16 29 Q15 20 17 9', '#4a9a52', 1.6) + LEAF(16, 14, -150, 0.85, '#5ed37a') + LEAF(16.5, 18, -30, 0.85, '#4fc46c') + LEAF(16.6, 10, -95, 0.75, '#7be38f') + LEAF(15.6, 23, -160, 0.6, '#5ed37a'),
  paw: E(16, 21, 7.4, 6.2, '#ff8fb0') + E(7.8, 13.2, 2.9, 3.6, '#ff8fb0') + E(12.6, 8.2, 2.9, 3.6, '#ff8fb0') + E(19.4, 8.2, 2.9, 3.6, '#ff8fb0') + E(24.2, 13.2, 2.9, 3.6, '#ff8fb0')
    + HI('M11.5 18.5 C12.5 16.6 15 16 17 16.4 C14.6 17 13 18.2 12.4 19.8Z'),
  sparkle: STAR(13, 17, 11, 3.2, 4, '#ffe066') + STAR(25, 7, 5, 1.6, 4, '#fff1a8') + STAR(25.5, 25, 3.8, 1.3, 4, '#ffd34d'),
  heart: HEART('#ff4d6d'),
  heartPink: HEART('#ff7ad9') + R(22, 3, 8, 8, 2.5, '#6ee7a0') + LN('M26 5 L26 9 M24 7 L28 7', '#fff', 1.8),
  hearts: HEART('#ff7ad9', 0.66, 0, 10) + HEART('#ff4d6d', 0.66, 10, 0),
  heartBlack: HEART('#3a2a50') + P('M16 21 C12 18 10.5 15.5 11.5 13.5', 'none', ' stroke="#b48cff" stroke-width="1.4"'),
  star: STAR(16, 16.5, 13, 5.6, 5, '#ffd34d') + HI('M11 12.5 L14 12.5 L15.5 8.5 L14.8 12.6Z'),
  dot: P('M16 6 L26 16 L16 26 L6 16Z', '#ffb347'),
  crown: P('M4.5 24 L3.5 9.5 L10.5 15 L16 5.5 L21.5 15 L28.5 9.5 L27.5 24Z', '#ffd34d') + R(4.5, 22, 23, 5, 2, '#f2b31b')
    + C(16, 17, 2.4, '#ff4d6d') + C(9.5, 19, 1.6, '#5ab0ff') + C(22.5, 19, 1.6, '#6ee7a0') + HI('M7 12.5 L9.5 14.5 L8 20Z'),
  fire: P('M16 29.5 C8.5 29.5 5 24 7 17.5 C8 14 11 12 11.2 6.5 C15 8.5 17 12 16.4 15.2 C18.2 13.6 19 11.5 19.4 9 C24 12.5 27.5 18 25.5 23.4 C24.2 27 20.5 29.5 16 29.5Z', '#ff6a2b')
    + P('M16 28 C12.3 28 10.4 25.3 11.4 22.3 C12.2 19.8 14.8 18.6 15 15.8 C18.3 17.6 21 20.6 20.3 24.2 C19.8 26.6 18.2 28 16 28Z', '#ffd34d', NS),
  bolt: P('M18.5 3 L6.5 18.5 L14.8 18.5 L12.8 29.5 L25.5 12.8 L17.2 12.8Z', '#ffd34d') + HI('M17 6 L10 15.5 L12 15.5Z'),
  check: P('M6 16.5 L13 23.5 L26.5 8.5', 'none', ` stroke="${IK}" stroke-width="7"`) + P('M6 16.5 L13 23.5 L26.5 8.5', 'none', ' stroke="#6ee7a0" stroke-width="3.6"'),
  cross: BAR('M8 8 L24 24 M24 8 L8 24', '#ff5d73', 3.6),
  warn: P('M16 3.5 L29.5 27 L2.5 27Z', '#ffd34d') + R(14.5, 10.5, 3, 9.5, 1.5, IK, NS) + C(16, 23.2, 1.8, IK, NS),
  arrowUp: P('M16 3.5 L27 15 L20 15 L20 28 L12 28 L12 15 L5 15Z', '#5ab0ff') + HI('M16 6.5 L22.5 13 L17.5 13Z'),
  dizzy: STAR(20, 12, 8.5, 3.5, 5, '#ffe066') + LN('M4 26 Q4 17 12 17 Q18 17 16 23 Q14 27 9.5 25', '#c7b3ff', 2.4),

  // ---------------------------------------------------------------- Belohnungen & Behälter
  box: P('M3.5 11 L16 5.5 L28.5 11 L16 16.5Z', '#f0c48a') + P('M3.5 11 L16 16.5 L16 29 L3.5 23.5Z', '#d9a066') + P('M28.5 11 L16 16.5 L16 29 L28.5 23.5Z', '#c4864a')
    + P('M9.5 8.4 L22 13.8 L22 18.5 L19 17.1 L19 14.8 L6.6 9.6Z', '#f8e3b8', NS),
  chest: R(4, 13, 24, 15, 2.5, '#9a6232') + P('M4 14 C4 6 28 6 28 14Z', '#b8763c') + R(4, 13, 24, 3.4, 1, '#ffd34d') + R(13.5, 13, 5, 7, 1.5, '#ffd34d') + C(16, 17, 1.1, IK, NS),
  gift: R(5, 13, 22, 15, 2, '#ff5d8f') + R(3.5, 9, 25, 6, 2, '#ff7aa8') + R(14, 9, 4, 19, 0, '#ffd34d')
    + E(11.5, 6.5, 4.5, 3, '#ffd34d') + E(20.5, 6.5, 4.5, 3, '#ffd34d') + C(16, 8, 2, '#f2b31b'),
  trophy: P('M8 4 L24 4 L23 13 C22 19 18.5 20.5 16 20.5 C13.5 20.5 10 19 9 13Z', '#ffd34d') + BAR('M8.5 7 C3 7 3.5 14 9.5 14 M23.5 7 C29 7 28.5 14 22.5 14', '#ffd34d', 1.8)
    + R(14, 20, 4, 4, 0, '#f2b31b') + R(9, 24, 14, 5, 2, '#b8763c') + HI('M11 6.5 L13.5 6.5 L13 14 L11.6 12Z'),
  medal: P('M9 3 L14 3 L17 12 L12 12Z', '#5ab0ff') + P('M23 3 L18 3 L15 12 L20 12Z', '#ff5d73') + C(16, 20, 8.5, '#ffd34d') + STAR(16, 20, 4.8, 2, 5, '#f2b31b'),
  balloon: BAR('M16 22 Q13 26 16.5 30', '#e6ecf8', 1) + E(16, 12.5, 9, 10.5, '#ff5d73') + P('M14.2 22 L17.8 22 L16 24.5Z', '#ff5d73') + HI('M10.5 9 C11 5.8 13.5 4.5 15.5 4.6 C13 6 11.8 8 11.6 11Z'),
  backpack: R(7, 8, 18, 21, 5, '#c084fc') + P('M11 8 C11 2.5 21 2.5 21 8', 'none', ` stroke="${IK}" stroke-width="2.4"`) + R(10, 17, 12, 8, 2.5, '#a066e6') + R(14.5, 15.5, 3, 4, 1, '#ffd34d'),

  // ---------------------------------------------------------------- Katzen & Tiere
  cat: CATHEAD('#f4a259'),
  catAngry: CATHEAD('#ff8a5c', { angry: true }),
  catSleep: CATHEAD('#c7b3ff', { sleep: true }) + LN('M23 4 L28 4 L23 9 L28 9', '#9fd0ff', 1.8),
  catLucky: CATHEAD('#ffd34d') + STAR(26.5, 26, 4.5, 1.6, 4, '#fff1a8'),
  mouse: BAR('M8 4 L24 4', '#c9ccd6', 1.6) + R(15, 4, 2, 5, 1, '#6b7080') + C(9, 11, 5, '#a8adb8') + C(9, 11, 2.8, '#ffb3c6', NS) + C(23, 11, 5, '#a8adb8') + C(23, 11, 2.8, '#ffb3c6', NS)
    + E(16, 19, 10, 8.5, '#bfc4ce') + C(12.2, 18, 1.6, IK, NS) + C(19.8, 18, 1.6, IK, NS) + C(16, 22.4, 1.8, '#ff7a9a') + LN('M10 23 L4 22 M10 24.5 L4.5 26 M22 23 L28 22 M22 24.5 L27.5 26', 'rgba(42,22,48,0.6)', 1),
  fish: P('M4 16 C9 7 21 7 25 16 C21 25 9 25 4 16Z', '#5ab0ff') + P('M24 16 L30 9.5 L29 16 L30 22.5Z', '#3a8ae0') + C(10, 14.5, 1.8, IK, NS)
    + LN('M14 10.5 Q16.5 16 14 21.5', 'rgba(42,22,48,0.5)', 1.4) + HI('M8 12.5 C11 9.5 16 9 19 10 C15 10.6 11.5 11.8 9.4 13.6Z'),
  goldfish: P('M5 16 C9 8 20 8 24 16 C20 24 9 24 5 16Z', '#ff8a2b') + P('M23 16 L30 9 L28 16 L30 23Z', '#ffb347') + P('M13 9.5 L17 4.5 L19 10Z', '#ffb347') + C(10.5, 14.5, 1.8, IK, NS) + HI('M9 12.5 C11.5 10 15.5 9.8 18 10.6 C14.6 11 12 12.2 10.2 13.8Z'),
  owl: P('M7 9 L9 3 L13 7Z', '#8b6b4a') + P('M25 9 L23 3 L19 7Z', '#8b6b4a') + E(16, 17.5, 10.5, 11.5, '#8b6b4a') + E(16, 21, 6.5, 7, '#d9c3a5')
    + C(11.5, 12.5, 4, '#fff') + C(20.5, 12.5, 4, '#fff') + C(11.5, 12.8, 2, IK, NS) + C(20.5, 12.8, 2, IK, NS) + P('M14.5 15.5 L17.5 15.5 L16 18.5Z', '#f4a259'),
  chick: E(16, 20, 10, 8.5, '#ffd34d') + C(16, 11, 7, '#ffe066') + C(13.5, 10, 1.4, IK, NS) + C(18.5, 10, 1.4, IK, NS) + P('M14.5 12.5 L17.5 12.5 L16 15Z', '#ff8a2b') + P('M5 22 C9 18 12 20 12 22Z', '#f2b31b'),
  dino: P('M6 13 C6 6 20 5 21 11 L21 16 L12 17 L12 26 L7 26 L7 18Z', '#4caf50') + P('M20 14 L29 20 L19 22Z', '#4caf50') + C(16, 10, 2, '#fff') + C(15.6, 10.2, 1, IK, NS)
    + P('M6 14.5 L18 14.5 L17 16.5 L7 16.5Z', '#3f9b4a', NS) + P('M8 14.5 L9 16 L10 14.5Z M11 14.5 L12 16 L13 14.5Z M14 14.5 L15 16 L16 14.5Z', '#fff', NS),
  ladybug: C(16, 18, 10.5, '#ff4d4d') + P('M8.5 11 C10 5 22 5 23.5 11Z', IK) + LN('M16 9 L16 28.5', IK, 1.6) + C(11.5, 17, 2, IK, NS) + C(20.5, 17, 2, IK, NS) + C(12.5, 23, 1.6, IK, NS) + C(19.5, 23, 1.6, IK, NS) + C(12.5, 8, 1.1, '#fff', NS) + C(19.5, 8, 1.1, '#fff', NS),
  bug: C(8, 18, 5, '#7be38f') + C(15, 16, 5.4, '#5ed37a') + C(22.5, 15, 6, '#4caf50') + C(24.5, 13.5, 1.4, IK, NS) + BAR('M23 9.5 L21 4.5 M26 10 L28 5', '#4caf50', 1.2),

  // ---------------------------------------------------------------- Waffen & Kampf
  gun: P('M3 10 C3 7.5 5 6.5 7 6.5 L21 6.5 C24 6.5 25.5 8.5 25.5 11 L25.5 15.5 L13.5 15.5 L11.5 26.5 L4.5 26.5 L6.5 15.5 C4 15.5 3 13.5 3 12Z', '#7ec8ff') + R(23, 8, 7, 5.5, 2.4, '#5b6b8f') + C(30, 10.75, 1.4, '#ff3355', NS) + R(5.5, 9, 4, 3, 1.2, '#ffd34d', NS) + E(9.2, 21.5, 2, 1.7, '#ff8fb0', NS) + HI('M6 8.5 L20 8.5 L19.2 10 L6 10Z'),
  boom: STAR(16, 16, 14, 6.5, 9, '#ffb347', -80) + STAR(16, 16, 8, 4, 7, '#ffe066', -60),
  laserpen: BAR('M4 26 L17 13', '#c7b3ff', 4.4) + BAR('M17 13 L21 9', '#5b6b8f', 4.4) + BAR('M22 8 L30 0', '#ff3355', 2) + C(22, 8, 2.2, '#ffffff', ' stroke="#ff3355" stroke-width="1.6"'),
  yarn: BAR('M8 25 Q3 29 2 23', '#ff7ad9', 1.6) + C(16, 16, 11, '#ff7ad9') + LN('M7 11 Q16 15 25 10 M6 17 Q16 22 26 16 M9 24 Q16 26 22 25.5 M12 6 Q19 14 17 27', 'rgba(42,22,48,0.4)', 1.5) + HI('M9 9 C11 6.2 14 5.3 16.5 5.4 C13.5 6.6 11.4 8.4 10.4 10.8Z'),
  rocket: P('M16 2.5 C22 7 23 14 21 22 L11 22 C9 14 10 7 16 2.5Z', '#e6ecf8') + C(16, 12, 3, '#5ab0ff') + P('M11 17 L6 23 L11 23Z M21 17 L26 23 L21 23Z', '#ff5d73') + P('M12.5 23 L19.5 23 L16 30Z', '#ffb347'),
  swords: BAR('M6 6 L24 24', '#dfe6f2', 3) + BAR('M26 6 L8 24', '#dfe6f2', 3) + BAR('M20 25 L25 20 M12 25 L7 20', '#ffb347', 2.4) + C(26, 26, 2, '#8b5a2b') + C(6, 26, 2, '#8b5a2b'),
  dagger: P('M25 4 L28 7 L14 21 L11 18Z', '#dfe6f2') + BAR('M9 15 L17 23', '#ffb347', 2.6) + BAR('M12 20 L6 26', '#8b5a2b', 3) + HI('M24.5 5.5 L26 7 L15 18Z'),
  shuriken: STAR(16, 16, 13.5, 4.5, 4, '#d7dde8', -45) + C(16, 16, 3, '#5b6b8f'),
  bomb: C(14.5, 18.5, 10.5, '#3a3a4a') + R(16, 5, 6, 5, 1.5, '#6b7080') + LN('M21.5 6 Q24 2 27.5 4', '#c4864a', 2) + STAR(28, 4, 3.6, 1.4, 5, '#ffd34d') + HI('M8.5 15 C9.5 12 12.5 10.3 15 10.3 C12.4 11.5 10.5 13.5 9.8 16Z'),
  shield: P('M16 2.5 L27.5 6.5 L26.6 16.5 C25.8 22.5 21.5 27 16 29.5 C10.5 27 6.2 22.5 5.4 16.5 L4.5 6.5Z', '#5ab0ff') + P('M16 6 L23.8 8.8 L23.2 16 C22.6 20.4 19.8 23.6 16 25.6Z', '#9fd0ff', NS)
    + HI('M7.5 8.5 L13 6.6 L12 9 L8.3 10.4Z'),
  target: C(16, 16, 13, '#ff5d73') + C(16, 16, 9, '#fff') + C(16, 16, 5, '#ff5d73') + C(16, 16, 1.8, '#fff', NS) + BAR('M16 16 L28 4', '#8b5a2b', 1.6) + P('M28 4 L30.5 2 L30 6 L26 6Z', '#6ee7a0'),
  eye: P('M2.5 16 C8 7 24 7 29.5 16 C24 25 8 25 2.5 16Z', '#fff') + C(16, 16, 6.4, '#ff3355') + C(16, 16, 3, IK, NS) + C(18.2, 13.6, 1.5, '#fff', NS),
  invader: P('M6 12 L10 12 L10 8 L13 8 L13 10 L19 10 L19 8 L22 8 L22 12 L26 12 L26 22 L23 22 L23 26 L20 26 L20 22 L12 22 L12 26 L9 26 L9 22 L6 22Z', '#a6f0b8') + R(11, 14, 3, 3, 0, IK, NS) + R(18, 14, 3, 3, 0, IK, NS),

  // ---------------------------------------------------------------- Natur & Wetter
  snow: BAR('M16 3 L16 29 M4.7 9.5 L27.3 22.5 M27.3 9.5 L4.7 22.5', '#bfeaff', 2.4) + BAR('M12.5 5 L16 8 L19.5 5 M12.5 27 L16 24 L19.5 27 M4 14 L8.6 12 L7.8 7.6 M28 18 L23.4 20 L24.2 24.4 M28 14 L23.4 12 L24.2 7.6 M4 18 L8.6 20 L7.8 24.4', '#bfeaff', 1.6),
  moon: P('M20 3.5 C11 4.5 6 11 6.5 17.5 C7 25 13.5 30 21 28.5 C24.5 27.8 27 26 28.5 23.5 C20 25.5 13 19 13.5 12 C14 8 16.5 5 20 3.5Z', '#ffe680') + C(13, 21, 1.8, '#f2c94c', NS) + C(10.4, 15, 1.2, '#f2c94c', NS),
  darkorb: C(16, 16, 12, '#2a1847') + C(16, 16, 8, '#4a2a7a', NS) + C(16, 16, 3.6, '#b48cff', NS) + HI('M9 11 C10.5 8 13.5 6.6 16 6.6 C13.2 8 11.2 9.8 10.2 12.6Z'),
  comet: BAR('M3 29 L15 17 M7 28 L16 21 M3 23 L12 15', '#7ef9ff', 2) + STAR(20, 12, 10, 4.2, 5, '#ffe066'),
  storm: P('M8 18 C3 18 3 11 8.5 11 C9 5 18 4 20 9.5 C25 8 28.5 12.5 26 17 C25 18 24 18 23 18Z', '#9aa3c0') + P('M17 16 L12 24 L16 24 L14.5 30 L21 21 L17 21 L19 16Z', '#ffd34d'),
  tree: R(13.5, 18, 5, 11, 1.5, '#8b5a2b') + C(10, 15, 6.5, '#3fa34d') + C(22, 15, 6.5, '#3fa34d') + C(16, 10, 8, '#5ed37a') + HI('M11 7 C12.5 4.5 15 3.6 17 3.8 C14.6 4.8 13 6.4 12.2 8.6Z'),
  cactus: R(12, 5, 8, 24, 4, '#4caf50') + P('M12 19 L7 19 C5 19 5 17 5 15 L5 10 L9 10 L9 15 L12 15Z', '#4caf50') + P('M20 16 L25 16 C27 16 27 14 27 12 L27 8 L23 8 L23 12 L20 12Z', '#4caf50') + C(16, 4, 2.2, '#ff7ad9'),
  acorn: P('M7 14 C7 22 11 28 16 29.5 C21 28 25 22 25 14Z', '#c4864a') + P('M5 15 C5 8 27 8 27 15Z', '#8b5a2b') + BAR('M16 9 L17 4.5', '#8b5a2b', 1.8),
  clover: HEART('#5ed37a', 0.5, 8, 0) + `<g transform="rotate(90 16 16)">${HEART('#4fc46c', 0.5, 8, 0)}</g>` + `<g transform="rotate(180 16 16)">${HEART('#5ed37a', 0.5, 8, 0)}</g>` + `<g transform="rotate(270 16 16)">${HEART('#4fc46c', 0.5, 8, 0)}</g>` + BAR('M18 18 Q22 24 20 29', '#3f9b4a', 1.6),
  rock: P('M4 22 L7 11 L16 6 L25 9 L28.5 19 L23 26 L10 27Z', '#8a6650') + P('M7 11 L16 6 L25 9 L17 13Z', '#a8826a', NS) + LN('M17 13 L16 20 L10 27', 'rgba(42,22,48,0.4)', 1.4),
  vortex: LN('M16 16 Q20 14 19 11 Q17 7 12 9 Q6 12 8 18 Q10 25 18 25 Q27 24 27 15 Q27 5 16 4', '#c084fc', 3) + C(16, 16, 2, '#7ef9ff', NS),
  diamond: P('M16 2.5 L28 16 L16 29.5 L4 16Z', '#7ef9ff') + P('M16 7 L23.5 16 L16 25 L8.5 16Z', '#bff8ff', NS) + P('M16 2.5 L16 29.5 M4 16 L28 16', 'none', ' stroke="rgba(42,22,48,0.4)" stroke-width="1.2"'),
  crystal: C(16, 14, 10.5, '#b48cff') + C(16, 14, 6, '#d9c3ff', NS) + R(8, 23, 16, 6, 2.5, '#8b5a2b') + HI('M9.5 10 C11 6.6 14 5 17 5 C13.6 6.6 11.4 8.8 10.6 11.6Z') + STAR(19, 15, 2.6, 1, 4, '#fff'),
  globe: C(16, 16, 12.5, '#5ab0ff') + P('M8 8 C11 10 9 13 12 15 C14 16 13 19 11 21 C8 20 5 17 5 13Z M19 5 C22 7 20 10 23 11 C26 12 27 15 27.5 17 C24 18 22 16 20 18 C18 20 20 24 18 27 C21 27 25 24 27 20', '#6ee7a0', NS) + LN('M3.5 16 L28.5 16 M16 3.5 Q9 16 16 28.5 Q23 16 16 3.5', 'rgba(42,22,48,0.35)', 1.1),

  // ---------------------------------------------------------------- Essen & Trinken
  soup: P('M3.5 15 L28.5 15 C28 23 23 27.5 16 27.5 C9 27.5 4 23 3.5 15Z', '#ff9ee0') + E(16, 15, 12.5, 3, '#ffb36b') + LN('M11 11 Q9 8 11 5 M16 11 Q14 8 16 4 M21 11 Q19 8 21 5', '#ffffff', 1.6),
  coffee: P('M5 12 L23 12 L21.5 26 C21 28 19 29 17 29 L11 29 C9 29 7 28 6.5 26Z', '#fff') + BAR('M23 15 C29 15 29 22 22 22', '#fff', 1.8) + E(14, 12, 9, 2.2, '#8b5a2b') + LN('M10 8 Q8.5 5.5 10 3 M15 8 Q13.5 5.5 15 3', '#c7b3ff', 1.6),
  milk: P('M9 4 L23 4 L21 29 L11 29Z', '#e8f4ff') + P('M10 12 L22 12 L21 29 L11 29Z', '#ffffff', NS) + LN('M10 12 L22 12', 'rgba(42,22,48,0.3)', 1) + HI('M12 6 L14 6 L13 26 L12 26Z'),
  cheese: P('M3.5 22 L27 10 L28.5 22Z', '#ffd34d') + P('M3.5 22 L28.5 22 L28.5 27 L3.5 27Z', '#f2b31b') + C(18, 17, 2, '#e8a317', NS) + C(23, 19.5, 1.4, '#e8a317', NS) + C(12, 24.5, 1.4, '#d9951a', NS),
  can: R(8, 5, 16, 23, 3, '#ff5d73') + R(8, 11, 16, 9, 0, '#fff') + E(16, 5.5, 8, 2, '#c9ccd6') + C(16, 15.5, 2.6, '#ff8fb0', NS),

  // ---------------------------------------------------------------- Zeit
  hourglass: R(6, 3, 20, 4, 1.5, '#8b5a2b') + R(6, 25, 20, 4, 1.5, '#8b5a2b') + P('M8.5 7 L23.5 7 C23.5 12 17.5 14 17.5 16 C17.5 18 23.5 20 23.5 25 L8.5 25 C8.5 20 14.5 18 14.5 16 C14.5 14 8.5 12 8.5 7Z', '#e6fbff') + P('M11 23.5 L21 23.5 C20.5 21 17 20 16 18.5 C15 20 11.5 21 11 23.5Z', '#ffd34d', NS) + P('M12 10 L20 10 C19 12 17 13 16 14 C15 13 13 12 12 10Z', '#ffd34d', NS),
  stopwatch: R(13, 2.5, 6, 3.5, 1.2, '#8fa3c7') + C(16, 18, 11, '#fff') + C(16, 18, 8.5, '#e6ecf8', NS) + LN('M16 18 L16 11.5 M16 18 L20.5 20.5', IK, 2) + R(24, 6, 4, 4, 1.2, '#8fa3c7', ' transform="rotate(45 26 8)"'),
  zzz: LN('M4 14 L13 14 L4 25 L13 25', '#9fd0ff', 2.6) + LN('M16 8 L23 8 L16 16 L23 16', '#9fd0ff', 2.2) + LN('M24 3 L29 3 L24 8.5 L29 8.5', '#9fd0ff', 1.8),
  calendar: R(4, 6, 24, 22, 3, '#fff') + R(4, 6, 24, 7, 3, '#ff5d73') + R(9, 3, 3, 6, 1.2, '#8fa3c7') + R(20, 3, 3, 6, 1.2, '#8fa3c7') + R(8, 16, 4, 3, 0.8, '#c7b3ff', NS) + R(14, 16, 4, 3, 0.8, '#c7b3ff', NS) + R(20, 16, 4, 3, 0.8, '#ff9eb5', NS) + R(8, 21, 4, 3, 0.8, '#c7b3ff', NS) + R(14, 21, 4, 3, 0.8, '#c7b3ff', NS),

  // ---------------------------------------------------------------- Oberfläche
  pause: R(8, 6, 6, 20, 2.2, '#f4efff') + R(18, 6, 6, 20, 2.2, '#f4efff'),
  music: BAR('M12 6 L12 24 M26 3 L26 21', '#c7b3ff', 2) + E(8.5, 24.5, 4.5, 3.6, '#c7b3ff') + E(22.5, 21.5, 4.5, 3.6, '#c7b3ff') + P('M12 6 L26 3 L26 8 L12 11Z', '#c7b3ff'),
  mute: P('M4 12 L10 12 L17 6 L17 26 L10 20 L4 20Z', '#9aa3c0') + BAR('M21 12 L28 20 M28 12 L21 20', '#ff5d73', 2.4),
  sound: P('M4 12 L10 12 L17 6 L17 26 L10 20 L4 20Z', '#c7b3ff') + BAR('M21 12 Q24 16 21 20 M24 8.5 Q30 16 24 23.5', '#c7b3ff', 2),
  soundLow: P('M4 12 L10 12 L17 6 L17 26 L10 20 L4 20Z', '#c7b3ff') + BAR('M21 12.5 Q23.5 16 21 19.5', '#c7b3ff', 2),
  gear: GEAR(16, 16, '#9aa3c0') + C(16, 16, 4.2, '#5b6b8f'),
  lock: BAR('M10 14 L10 10 C10 3 22 3 22 10 L22 14', '#c9ccd6', 2.6) + R(6, 14, 20, 15, 3.5, '#ffd34d') + C(16, 20, 2.4, IK, NS) + R(15, 21, 2, 4.5, 1, IK, NS),
  unlock: BAR('M10 14 L10 10 C10 3 21 2.5 22 8', '#c9ccd6', 2.6) + R(6, 14, 20, 15, 3.5, '#6ee7a0') + C(16, 20, 2.4, IK, NS) + R(15, 21, 2, 4.5, 1, IK, NS),
  disk: R(4, 4, 24, 24, 3, '#5ab0ff') + R(9, 4, 13, 8, 1, '#e6ecf8') + R(17.5, 5.5, 3, 5, 0.8, '#5b6b8f', NS) + R(8, 17, 16, 11, 1.5, '#fff'),
  trash: R(5, 6, 22, 4, 1.5, '#9aa3c0') + R(12.5, 3, 7, 3.5, 1.2, '#9aa3c0') + P('M7 10 L25 10 L23.5 29 L8.5 29Z', '#c9ccd6') + LN('M12 14 L12.6 25 M16 14 L16 25 M20 14 L19.4 25', 'rgba(42,22,48,0.5)', 1.6),
  recycle: BAR('M9 21 L5 15 L10 7 L15 7', '#6ee7a0', 2.6) + BAR('M19 7 L22 7 L27 15 L24 20', '#6ee7a0', 2.6) + BAR('M21 25 L11 25', '#6ee7a0', 2.6) + P('M14 3 L18.5 7 L14 11Z M28 21.5 L22 23 L24 17Z M10 20.5 L12.5 25.8 L6.8 27Z', '#6ee7a0'),
  repeat: BAR('M6 15 C6 9 10 7 15 7 L23 7', '#6ee7a0', 2.6) + P('M21.5 2.5 L28 7 L21.5 11.5Z', '#6ee7a0') + BAR('M26 17 C26 23 22 25 17 25 L9 25', '#6ee7a0', 2.6) + P('M10.5 20.5 L4 25 L10.5 29.5Z', '#6ee7a0'),
  keyboard: R(2.5, 9, 27, 15, 3, '#e6ecf8') + [6, 10.5, 15, 19.5, 24].map(x => R(x - 1.5, 12, 3, 3, 0.8, '#8fa3c7', NS)).join('') + [8, 12.5, 17, 21.5].map(x => R(x - 1.5, 16, 3, 3, 0.8, '#8fa3c7', NS)).join('') + R(10, 20, 12, 2.4, 0.8, '#8fa3c7', NS),
  camera: R(3.5, 9, 25, 18, 3.5, '#5b6b8f') + R(11, 5.5, 10, 5, 1.5, '#5b6b8f') + C(16, 18, 6, '#e6ecf8') + C(16, 18, 3.4, '#5ab0ff', NS) + C(24.5, 13, 1.4, '#ffd34d', NS),
  export: BAR('M4 18 L4 27 L28 27 L28 18', '#c9ccd6', 2.4) + P('M16 3 L24 11 L19 11 L19 21 L13 21 L13 11 L8 11Z', '#6ee7a0'),
  import: BAR('M4 18 L4 27 L28 27 L28 18', '#c9ccd6', 2.4) + P('M16 23 L24 15 L19 15 L19 4 L13 4 L13 15 L8 15Z', '#5ab0ff'),
  clipboard: R(6, 5, 20, 24, 3, '#c4864a') + R(9, 8, 14, 18, 1.5, '#fff') + R(11.5, 3, 9, 5, 1.5, '#9aa3c0') + LN('M12 14 L20 14 M12 18 L20 18 M12 22 L17 22', '#c7b3ff', 1.6),
  book: P('M3 7 C8 5 13 6 16 9 L16 28 C13 25 8 25 3 26Z', '#fff') + P('M29 7 C24 5 19 6 16 9 L16 28 C19 25 24 25 29 26Z', '#f0e8ff') + LN('M6 12 L13 13 M6 16 L13 17 M19 13 L26 12 M19 17 L26 16', '#c7b3ff', 1.4),
  scroll: R(7, 4, 18, 24, 2, '#f6e7c1') + R(4.5, 3, 23, 5, 2.5, '#d9b779') + R(4.5, 24, 23, 5, 2.5, '#d9b779') + LN('M11 12 L21 12 M11 16 L21 16 M11 20 L18 20', '#b08a4a', 1.6),
  map: P('M3.5 8 L11 5 L21 8 L28.5 5 L28.5 24 L21 27 L11 24 L3.5 27Z', '#f6e7c1') + LN('M11 5 L11 24 M21 8 L21 27', 'rgba(42,22,48,0.35)', 1.2)
    + LN('M7 21 Q11 13 15 17 Q19 21 22 13', '#ff5d73', 1.8) + BAR('M22 10 L26 14 M26 10 L22 14', '#ff5d73', 1.4),
  door: R(7, 3, 18, 26, 2.5, '#9a6232') + R(10, 6, 12, 9, 1.5, '#b8763c', NS) + R(10, 17, 12, 9, 1.5, '#b8763c', NS) + C(20.5, 17, 1.6, '#ffd34d'),
  flag: BAR('M7 29 L7 3', '#9aa3c0', 2.2) + P('M8 4 C13 2 17 7 22 5 C25 4 27 4 28 5 L28 17 C25 16 22 17 19 18 C15 19 12 15 8 16Z', '#fff'),
  link: R(3, 11, 16, 10, 5, 'none', ` stroke="${IK}" stroke-width="4.6"`) + R(13, 11, 16, 10, 5, 'none', ` stroke="${IK}" stroke-width="4.6"`) + R(3, 11, 16, 10, 5, 'none', ' stroke="#c7b3ff" stroke-width="2.4"') + R(13, 11, 16, 10, 5, 'none', ' stroke="#9fd0ff" stroke-width="2.4"'),
  broom: BAR('M25 3 L15 17', '#c4864a', 2.6) + P('M15 15 L19 18 C19 23 15 28 6 29.5 C6 22 9 17 15 15Z', '#ffd34d') + LN('M10 24 L15 19 M8 27 L16 21', 'rgba(42,22,48,0.4)', 1.2),
  magnet: P('M5 6 L12 6 L12 16 C12 20 20 20 20 16 L20 6 L27 6 L27 16 C27 31 5 31 5 16Z', '#ff5d73') + R(5, 6, 7, 5, 0, '#e6ecf8') + R(20, 6, 7, 5, 0, '#e6ecf8'),
  scales: BAR('M16 4 L16 27 M5 9 L27 9', '#ffd34d', 2.2) + R(10, 26, 12, 3.5, 1.5, '#ffd34d') + P('M2 18 L8 9 L14 18Z', 'none', ` stroke="${IK}" stroke-width="1.4"`) + P('M18 18 L24 9 L30 18Z', 'none', ` stroke="${IK}" stroke-width="1.4"`) + E(8, 18, 6, 2.6, '#ffd34d') + E(24, 18, 6, 2.6, '#ffd34d'),
  bulb: C(16, 13, 9.5, '#ffe680') + R(12, 21, 8, 7, 2, '#9aa3c0') + LN('M12 24 L20 24', IK, 1.4) + LN('M13 14 Q16 11 19 14 L17 21 M15 21 L13 14', '#f2a51b', 1.4) + HI('M10 10 C11 7 13.5 5.4 16 5.4 C13.4 6.8 11.8 8.6 11 11.4Z'),
  palette: P('M16 3.5 C8 3.5 3.5 9.5 3.5 16 C3.5 23 9 28.5 15 28.5 C18 28.5 18.5 26 17.5 24 C16.5 22 18 20 20.5 20 L24 20 C27 20 28.5 18 28.5 15 C28.5 8.5 23 3.5 16 3.5Z', '#f6e7c1') + C(10, 13, 2.4, '#ff5d73', NS) + C(15, 9, 2.4, '#ffd34d', NS) + C(21, 10, 2.4, '#6ee7a0', NS) + C(9.5, 20, 2.4, '#5ab0ff', NS),
  megaphone: P('M4 13 L10 13 L24 5 L24 27 L10 19 L4 19Z', '#ffd34d') + R(7, 19, 4, 7, 1.5, '#ff5d73') + BAR('M27 12 L30 10 M27.5 16 L31 16 M27 20 L30 22', '#fff1a8', 1.4),
  mail: R(3.5, 7, 25, 18, 3, '#fff') + LN('M4.5 8.5 L16 18 L27.5 8.5', '#ff5d73', 2),
  magnifier: BAR('M20 20 L28 28', '#8b5a2b', 3.4) + C(13, 13, 9, '#bfeaff') + HI('M8 10 C9.5 7.5 12 6.4 14.5 6.6 C12 7.8 10.4 9.4 9.6 11.6Z'),
  battery: R(3.5, 9, 23, 14, 3, '#e6ecf8') + R(26, 13, 3, 6, 1, '#9aa3c0') + R(6, 11.5, 15, 9, 1.5, '#6ee7a0', NS) + P('M15 12.5 L11.5 17 L14 17 L13 20 L17 15.5 L14.5 15.5Z', '#fff', NS),
  bolts: P('M11 4 L21 4 L23 9 L21 14 L11 14 L9 9Z', '#9aa3c0') + C(16, 9, 2.4, '#5b6b8f', NS) + R(13.5, 14, 5, 15, 1.5, '#c9ccd6') + LN('M13.5 18 L18.5 17 M13.5 21.5 L18.5 20.5 M13.5 25 L18.5 24', 'rgba(42,22,48,0.5)', 1.2),
  coat: P('M10 4 L16 8 L22 4 L28 9 L26 16 L23 15 L23 28 L9 28 L9 15 L6 16 L4 9Z', '#8a5a3a') + P('M13 5.8 L16 8 L19 5.8 L16 15Z', '#d9c3a5') + C(16, 18, 1.2, '#ffd34d', NS) + C(16, 22, 1.2, '#ffd34d', NS),
  phone: R(9, 3, 14, 26, 3.5, '#5b6b8f') + R(11, 6, 10, 18, 1.5, '#9fd0ff', NS) + C(16, 26.5, 1.2, '#e6ecf8', NS),
  tv: R(3, 8, 26, 19, 3.5, '#8b5a2b') + R(6, 11, 17, 13, 2.5, '#9fd8ff') + C(26, 14, 1.5, IK, NS) + C(26, 19, 1.5, IK, NS) + BAR('M11 8 L7 3 M17 8 L21 3', '#c9ccd6', 1.2),
  antenna: P('M5 7 C9 13 17 17 25 15 C21 6 12 3 5 7Z', '#e6ecf8') + BAR('M14 12 L11 28 M14 12 L18 28', '#9aa3c0', 1.6) + LN('M23 4 Q27 6 27 10 M24 1 Q30 4 30 10', '#ff5d73', 1.4),
  ufo: P('M10 14 C10 7 22 7 22 14Z', '#9fd8ff') + E(16, 16.5, 13, 5, '#9aa3c0') + E(16, 15, 13, 2.6, '#c9d0e8', NS) + C(9, 18, 1.4, '#ffd34d', NS) + C(16, 19, 1.4, '#ff5d73', NS) + C(23, 18, 1.4, '#ffd34d', NS) + P('M12 22 L20 22 L23 30 L9 30Z', 'rgba(126,249,255,0.35)', NS),
  robot: R(7, 8, 18, 15, 4, '#b9c0d8') + R(10, 12, 12, 7, 2, '#1a1440') + C(13, 15.5, 1.6, '#5ef0ff', NS) + C(19, 15.5, 1.6, '#5ef0ff', NS) + BAR('M16 8 L16 4', '#9aa3c0', 1.4) + C(16, 3, 1.8, '#ff4d6d') + R(10, 23, 12, 6, 2, '#9aa3c0'),
  castle: P('M4 29 L4 11 L8 11 L8 14 L11 14 L11 11 L15 11 L15 14 L17 14 L17 11 L21 11 L21 14 L24 14 L24 11 L28 11 L28 29Z', '#c9d0e0') + P('M13 29 L13 22 C13 19 19 19 19 22 L19 29Z', '#5b6b8f') + R(7, 17, 3, 4, 1, '#ffd34d', NS) + R(22, 17, 3, 4, 1, '#ffd34d', NS),
  ball: C(16, 16, 12.5, '#fff') + P('M16 10.5 L21 14 L19 20 L13 20 L11 14Z', IK, NS) + LN('M16 10.5 L16 4 M21 14 L27 12 M19 20 L23 26 M13 20 L9 26 M11 14 L5 12', IK, 1.4),
  warnAd: R(3.5, 6, 25, 20, 3.5, '#fff') + R(3.5, 6, 25, 6, 3, '#ff5d73') + C(24.5, 9, 1.6, '#fff', NS) + LN('M8 17 L24 17 M8 21 L18 21', '#c7b3ff', 1.8),
  wing: P('M4 22 C4 12 12 5 27 4 C25 8 22 10 18 11 C22 11 24 12 25 13 C22 15 19 16 15 16 C18 17 20 18 20 19 C15 22 9 23 4 22Z', '#e6ecf8') + LN('M8 19 C12 14 17 11 22 9', 'rgba(42,22,48,0.35)', 1.2),
  plus: R(11.5, 4, 9, 24, 3, '#6ee7a0') + R(4, 11.5, 24, 9, 3, '#6ee7a0') + HI('M13.5 6.5 L15.5 6.5 L15.5 13 L13.5 13Z'),
  split: C(10, 18, 7, '#ff8fb0') + C(22, 18, 7, '#ff8fb0') + P('M16 3 L14 10 L18 12 L15 19', 'none', ' stroke="#ffd34d" stroke-width="2.4"'),
  fuse: C(13, 19, 9.5, '#3a3a4a') + BAR('M19 12 Q23 6 27 7', '#c4864a', 1.6) + STAR(27.5, 6.5, 4.6, 1.8, 6, '#ff8a3c') + HI('M7.5 16 C8.5 13.4 11 12 13.4 12 C11.2 13 9.6 14.6 9 16.8Z'),
  armor: P('M16 3 L27 7 L26 17 C25 23 21 27 16 29.5 C11 27 7 23 6 17 L5 7Z', '#9aa3c0') + P('M16 7 L23 9.5 L22.4 16.5 C21.8 21 19.4 24 16 25.8Z', '#c9d0e0', NS) + C(10, 11, 1.4, '#5b6b8f', NS) + C(22, 11, 1.4, '#5b6b8f', NS) + C(16, 20, 1.4, '#5b6b8f', NS),
  cards: `<g transform="rotate(-14 16 18)">${R(6, 8, 13, 18, 2.5, '#fff')}${P('M12.5 13 L15 16.5 L12.5 20 L10 16.5Z', '#ff5d73', NS)}</g><g transform="rotate(12 16 18)">${R(13, 6, 13, 18, 2.5, '#fff')}${HEART('#ff5d73', 0.3, 14.7, 9.5)}</g>`,
  return: BAR('M26 25 L26 18 C26 12 22 10 17 10 L9 10', '#9fd0ff', 2.6) + P('M11 4 L3.5 10 L11 16Z', '#9fd0ff'),
};

// Emoji → Symbol (Variationszeichen FE0F werden vorher entfernt)
const EMOJI_ICON = {
  '💰': 'coin', '💶': 'coin', '🦴': 'bone', '🌿': 'mint', '🐾': 'paw', '✨': 'sparkle', '❌': 'cross',
  '❤': 'heart', '💗': 'heartPink', '💞': 'hearts', '🖤': 'heartBlack', '⭐': 'star', '🌟': 'star', '🔸': 'dot',
  '👑': 'crown', '🔥': 'fire', '⚡': 'bolt', '⚠': 'warn', '⬆': 'arrowUp', '💫': 'dizzy',
  '📦': 'box', '🧰': 'chest', '🎁': 'gift', '🏆': 'trophy', '🏅': 'medal', '🎈': 'balloon', '🎒': 'backpack',
  '🐱': 'cat', '😼': 'cat', '😾': 'catAngry', '😴': 'catSleep', '🐈': 'catLucky', '🐭': 'mouse', '🐟': 'fish', '🐠': 'goldfish',
  '🦉': 'owl', '🐣': 'chick', '🦖': 'dino', '🐞': 'ladybug', '🐛': 'bug',
  '🔫': 'gun', '💥': 'boom', '🔦': 'laserpen', '🧶': 'yarn', '🚀': 'rocket', '⚔': 'swords', '🗡': 'dagger', '✴': 'shuriken',
  '💣': 'bomb', '🛡': 'shield', '🎯': 'target', '👁': 'eye', '👾': 'invader',
  '❄': 'snow', '🌙': 'moon', '🌑': 'darkorb', '☄': 'comet', '🌠': 'comet', '⛈': 'storm', '🌳': 'tree', '🌵': 'cactus', '🌰': 'acorn',
  '🍀': 'clover', '🟤': 'rock', '🌀': 'vortex', '💠': 'diamond', '🔮': 'crystal', '🌐': 'globe',
  '🍲': 'soup', '☕': 'coffee', '🥛': 'milk', '🧀': 'cheese', '🥫': 'can',
  '⏳': 'hourglass', '⏱': 'stopwatch', '💤': 'zzz', '📅': 'calendar',
  '⏸': 'pause', '🎵': 'music', '🔇': 'mute', '🔊': 'sound', '🔈': 'soundLow', '⚙': 'gear', '🔒': 'lock', '🔓': 'unlock',
  '💾': 'disk', '🗑': 'trash', '♻': 'recycle', '🔁': 'repeat', '⌨': 'keyboard', '📷': 'camera', '📤': 'export', '📥': 'import',
  '📋': 'clipboard', '📖': 'book', '📜': 'scroll', '🗺': 'map', '🚪': 'door', '🏳': 'flag', '🔗': 'link', '🧹': 'broom',
  '🧲': 'magnet', '⚖': 'scales', '💡': 'bulb', '🎨': 'palette', '📢': 'megaphone', '📧': 'mail', '🔍': 'magnifier',
  '🔋': 'battery', '🔩': 'bolts', '🧥': 'coat', '📱': 'phone', '📺': 'tv', '📡': 'antenna', '🛸': 'ufo', '🤖': 'robot',
  '🏰': 'castle', '⚽': 'ball', '↩': 'return', '🃏': 'cards', '👼': 'heartPink', '✔': 'check',
};
// Engel (Neuntes Leben): Herz mit Heiligenschein statt Plus
ICONS.angel = HEART('#fff1f6', 0.9, 1.6, 4) + E(16, 5, 7, 2.4, 'none', ' stroke="#ffd34d" stroke-width="2.4"') + P('M3 13 C1 9 4 7 7 9 Z M29 13 C31 9 28 7 25 9Z', '#fff');
EMOJI_ICON['👼'] = 'angel';
// Katzen-Automat: Gehäuse mit drei Walzen, Krone oben und Hebel rechts
ICONS.slot = R(3.5, 9, 21, 19, 4, '#8a6cff') + R(6.5, 4.5, 15, 6, 3, '#ffd34d') + R(6.5, 12.5, 15, 9, 2, '#fff')
  + C(10, 17, 2, '#ff5d73', NS) + C(14, 17, 2, '#ffd34d', NS) + C(18, 17, 2, '#6ee7a0', NS) + R(8, 23.5, 12, 2.4, 1.2, '#3a2596', NS)
  + BAR('M24.5 21 L27.5 21 L27.5 10', '#c7b3ff', 1.8) + C(27.5, 8.5, 2.8, '#ff5d73') + HI('M6 11.5 C7 10.2 8.6 9.9 10 10.1 C8.6 10.9 7.6 11.8 7 13Z');
EMOJI_ICON['🎰'] = 'slot';
// Wächter-Schlüssel: goldener Bart mit Katzenohren-Griff
ICONS.key = P('M6 9 L9 4 L11.5 8 L14.5 8 L17 4 L20 9 C22 11 22 15 19.5 17 C17 19 9 19 6.5 17 C4 15 4 11 6 9Z', '#ffcf3a')
  + C(13, 12.5, 2.6, '#7a4a10', NS) + BAR('M13 18 L13 29', '#ffcf3a', 3) + BAR('M13 23.5 L18 23.5 M13 27.5 L17 27.5', '#ffcf3a', 2.2)
  + HI('M8 10 C9 8.5 10.5 8.6 11.5 9.2 C10 9.6 9.2 10.6 8.8 12Z');
EMOJI_ICON['🗝'] = 'key'; EMOJI_ICON['🔑'] = 'key';

// Emoji-Folgen erkennen (Grundzeichen + Variationszeichen/ZWJ-Folgen)
const EMOJI_RE = /(?:[←-⇿⌀-⏿☀-➿⬀-⯿]|[\uD83C-\uD83E][\uDC00-\uDFFF])️?(?:‍(?:[☀-➿⬛]|[\uD83C-\uD83E][\uDC00-\uDFFF])️?)*/g;
const EMOJI_TEST = /[←-⇿⌀-⏿☀-➿⬀-⯿\uD83C-\uD83E]/;
const iconKey = em => EMOJI_ICON[em.replace(/️/g, '')] || null;

const Icons = {
  keys: () => Object.keys(ICONS),
  forEmoji: em => iconKey(em),
  svg(key) {
    const b = ICONS[key];
    return b ? `<svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><g stroke="${IK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${b}</g></svg>` : '';
  },
  // ---------------------------------------------------------------- HTML
  missing: new Set(),
  decorateText(node) {
    const t = node.nodeValue;
    if (!t || !EMOJI_TEST.test(t)) return;
    const p = node.parentNode;
    if (!p || p.closest && p.closest('textarea, input, script, style, svg, .noico')) return;
    EMOJI_RE.lastIndex = 0;
    let m, last = 0, frag = null;
    while ((m = EMOJI_RE.exec(t))) {
      const k = iconKey(m[0]);
      if (!k) { if (!this.missing.has(m[0])) { this.missing.add(m[0]); console.debug('Symbol fehlt für', m[0]); } continue; }
      frag = frag || document.createDocumentFragment();
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      const s = document.createElement('i');
      s.className = 'ic ic-' + k; s.innerHTML = this.svg(k);
      frag.appendChild(s);
      last = m.index + m[0].length;
    }
    if (!frag) return;
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    p.replaceChild(frag, node);
  },
  // Tooltips (title) können keine Grafik zeigen → Emojis dort entfernen
  cleanTitle(el) {
    const t = el.getAttribute('title');
    if (t && EMOJI_TEST.test(t)) el.setAttribute('title', t.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim());
  },
  decorate(root) {
    if (root.nodeType === 3) { this.decorateText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.hasAttribute && root.hasAttribute('title')) this.cleanTitle(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = [];
    while (w.nextNode()) list.push(w.currentNode);
    for (const n of list) this.decorateText(n);
    for (const el of root.querySelectorAll('[title]')) this.cleanTitle(el);
  },
  watch() {
    this.decorate(document.body);
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') this.decorateText(m.target);
        else if (m.type === 'attributes') this.cleanTitle(m.target);
        else for (const n of m.addedNodes) this.decorate(n);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title'] });
  },

  // ---------------------------------------------------------------- Leinwand
  imgs: {},
  img(key) {
    let im = this.imgs[key];
    if (!im) {
      im = this.imgs[key] = new Image();
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(this.svg(key).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" '));
    }
    return im.complete && im.naturalWidth ? im : null;
  },
  // Symbol direkt auf die Leinwand zeichnen (Mitte x/y, Größe s)
  draw(ctx, key, x, y, s) { const im = this.img(key); if (im) ctx.drawImage(im, x - s / 2, y - s / 2, s, s); },
  preload() { for (const k of Object.keys(ICONS)) this.img(k); },
  // Text in Stücke zerlegen: { t: 'Text' } oder { k: 'symbol' }
  split(text) {
    const out = [];
    let m, last = 0;
    EMOJI_RE.lastIndex = 0;
    while ((m = EMOJI_RE.exec(text))) {
      const k = iconKey(m[0]);
      if (!k) continue;
      if (m.index > last) out.push({ t: text.slice(last, m.index) });
      out.push({ k });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ t: text.slice(last) });
    return out;
  },
};

// Leinwand: Emojis in fillText/strokeText/measureText durch Symbole ersetzen
(function patchCanvas() {
  const proto = CanvasRenderingContext2D.prototype;
  const fill = proto.fillText, stroke = proto.strokeText, measure = proto.measureText;
  const sizeOf = ctx => { const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font); return m ? +m[1] : 10; };
  const width = (ctx, parts, s) => parts.reduce((w, p) => w + (p.k ? s * 1.18 : measure.call(ctx, p.t).width), 0);
  function rich(ctx, text, x, y, isFill) {
    const parts = Icons.split(text);
    if (!parts.some(p => p.k)) return isFill ? fill.call(ctx, text, x, y) : stroke.call(ctx, text, x, y);
    const s = sizeOf(ctx), total = width(ctx, parts, s), al = ctx.textAlign, bl = ctx.textBaseline;
    let cx = al === 'center' ? x - total / 2 : al === 'right' || al === 'end' ? x - total : x;
    const top = bl === 'middle' ? y - s * 0.55 : bl === 'top' || bl === 'hanging' ? y : bl === 'bottom' ? y - s * 1.1 : y - s * 0.92;
    ctx.textAlign = 'left';
    for (const p of parts) {
      if (p.k) {
        const im = isFill && Icons.img(p.k);
        if (im) ctx.drawImage(im, cx + s * 0.04, top, s * 1.1, s * 1.1);
        cx += s * 1.18;
      } else {
        if (isFill) fill.call(ctx, p.t, cx, y); else stroke.call(ctx, p.t, cx, y);
        cx += measure.call(ctx, p.t).width;
      }
    }
    ctx.textAlign = al;
  }
  proto.fillText = function (text, x, y, mw) {
    if (typeof text !== 'string' || !EMOJI_TEST.test(text)) return mw === undefined ? fill.call(this, text, x, y) : fill.call(this, text, x, y, mw);
    rich(this, text, x, y, true);
  };
  proto.strokeText = function (text, x, y, mw) {
    if (typeof text !== 'string' || !EMOJI_TEST.test(text)) return mw === undefined ? stroke.call(this, text, x, y) : stroke.call(this, text, x, y, mw);
    rich(this, text, x, y, false);
  };
  proto.measureText = function (text) {
    if (typeof text !== 'string' || !EMOJI_TEST.test(text)) return measure.call(this, text);
    const parts = Icons.split(text);
    if (!parts.some(p => p.k)) return measure.call(this, text);
    const base = measure.call(this, 'M');
    return { width: width(this, parts, sizeOf(this)), actualBoundingBoxAscent: base.actualBoundingBoxAscent, actualBoundingBoxDescent: base.actualBoundingBoxDescent };
  };
})();

window.Icons = Icons;
Icons.preload();
if (document.body) Icons.watch(); else document.addEventListener('DOMContentLoaded', () => Icons.watch());
})();
