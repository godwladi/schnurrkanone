'use strict';
// ---------------------------------------------------------------------------
// Waffen-Varianten: Kisten und Schatztruhen liefern gelegentlich eine Waffe mit
// Eigenschaft (Feld w.v). Beim Verschmelzen bleibt die Eigenschaft erhalten.
//   fire  – Brennend: 15 % der Treffer setzen in Brand
//   frost – Frostig:  12 % der Treffer vereisen (+25 % Schaden, Boss wirft langsamer)
//   chain – Blitz:    15 % der Treffer springen auf einen weiteren Gegner
//   heavy – Wuchtig:  +30 % Schaden
// Nutzt die Zustände aus build.js (Brand, Vereisen, Kettenblitz).
// ---------------------------------------------------------------------------

const VARIANTS = {
  fire:  { icon: '🔥', name: 'Brennend', col: '#ff8a3c', desc: '15 % der Treffer setzen in Brand' },
  frost: { icon: '❄️', name: 'Frostig',  col: '#7ec8ff', desc: '12 % der Treffer vereisen: +25 % Schaden' },
  chain: { icon: '⚡', name: 'Blitz',    col: '#ffd34d', desc: '15 % der Treffer springen als Blitz weiter' },
  heavy: { icon: '💥', name: 'Wuchtig',  col: '#ff5d73', desc: '+30 % Schaden' },
};
const VARIANT_IDS = Object.keys(VARIANTS);

const Variants = {
  roll(chance) { return Math.random() < chance ? U.pick(VARIANT_IDS) : undefined; },
  label(w) { return w.v ? ` · ${VARIANTS[w.v].name}` : ''; },
  // Treffer einer Kugel mit Eigenschaft
  onHit(B, o, v, dmg) {
    if (!v || !o || o.dead || o.dying > 0) return;
    if (v === 'fire' && Math.random() < 0.15) Build.ignite(B, o, Math.max(dmg * 1.2, R.dps * 0.12));
    if (v === 'frost' && Math.random() < 0.12) Build.chill(B, o, 1.4);
    if (v === 'chain' && Math.random() < 0.15) Build.chain(B, o, 1);
  },
};

// Kisten: 6 % Variante, Schatztruhe/Händler-Kiste 25 %
const _vBuy = Game.buyBox;
Game.buyBox = function (count = 1) {
  const before = S.grid.slice();
  const n = _vBuy.call(this, count);
  S.grid.forEach((w, i) => {
    if (w && w !== before[i] && !w.v) { w.v = Variants.roll(0.06); if (w.v) Variants.found(w); }
  });
  return n;
};
Variants.found = function (w) {
  UI.toast(`<b>${WEAPONS[w.t].icon} ${WEAPONS[w.t].name} ${U.roman(w.r)}</b> · ${VARIANTS[w.v].icon} <b>${VARIANTS[w.v].name}</b><br><small>${VARIANTS[w.v].desc}</small>`, 'ach');
  Hints.once('variant', 'Waffen mit Eigenschaft', 'Manche Waffen sind brennend, frostig, geladen oder wuchtig. Beim Verschmelzen bleibt die Eigenschaft erhalten – sie zeigt sich als Symbol in der Ecke.', 'sparkle');
};
const _vTreasure = Battle.openTreasure;
Battle.openTreasure = function (o, cy) {
  const before = S.grid.slice();
  _vTreasure.call(this, o, cy);
  S.grid.forEach((w, i) => { if (w && w !== before[i] && !w.v) { w.v = Variants.roll(0.25); if (w.v) Variants.found(w); } });
};

// Verschmelzen: Eigenschaft übernehmen (Ziel zuerst, sonst Quelle)
const _vMove = Game.move;
Game.move = function (src, dst) {
  const a = Game.getAt(src), b = Game.getAt(dst), v = (b && b.v) || (a && a.v);
  _vMove.call(this, src, dst);
  const m = Game.getAt(dst);
  if (m && v && a && b && m !== a && m !== b && !m.v) m.v = v;
};
const _vAuto = Game.autoMerge;
Game.autoMerge = function () {
  // Eigenschaften je Waffentyp merken, die beim automatischen Verschmelzen sonst verloren gingen
  const keep = {};
  for (const w of S.grid) if (w && w.v) (keep[`${w.t}:${w.r}`] = keep[`${w.t}:${w.r}`] || []).push(w.v);
  _vAuto.call(this);
  for (const w of S.grid) {
    if (!w || w.v) continue;
    const k = `${w.t}:${w.r - 1}`;
    if (keep[k] && keep[k].length) w.v = keep[k].shift();
  }
  if (UI.tab === 'weapons') UI.renderTab();
};
// Wuchtige Waffen zählen beim „Beste ausrüsten“ stärker
const _vDps = Econ.weaponDps;
Econ.weaponDps = function (w) { return _vDps.call(this, w) * (w && w.v === 'heavy' ? 1.3 : 1); };

// Treffer mit Eigenschaft auslösen
const _vHit = Battle.onBulletHit;
Battle.onBulletHit = function (b, o) { _vHit.call(this, b, o); if (b.v) Variants.onHit(this, o, b.v, b.dmg); };

// Rucksack/Ausrüstung: Symbol der Eigenschaft in der Ecke, Name im Tooltip
const _vCell = UI.cellHtml;
UI.cellHtml = function (w, k, i, locked) {
  let h = _vCell.call(this, w, k, i, locked);
  if (w && w.v && !locked) {
    const V = VARIANTS[w.v];
    h = h.replace('<span class="tier">', `<span class="vbadge" style="--vc:${V.col}">${V.icon}</span><span class="tier">`)
      .replace(`title="${WEAPONS[w.t].name} ${U.roman(w.r)}`, `title="${WEAPONS[w.t].name} ${U.roman(w.r)} · ${V.name} (${V.desc})`)
      .replace('class="cell item', 'class="cell item variant');
  }
  return h;
};
