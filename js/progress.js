'use strict';
// ---------------------------------------------------------------------------
// Waffen-Sets (gleiche Typen ausrüsten) und Katzen-Level (XP aus Zerstörungen)
// ---------------------------------------------------------------------------

// Stufe 2 enthält jeweils die Gesamtwerte (nicht zusätzlich zu Stufe 1)
const WEAPON_SETS = {
  pistol:  [{ n: 2, desc: '+20% Feuerrate', rate: 0.2 },      { n: 4, desc: '+50% Feuerrate', rate: 0.5 }],
  shotgun: [{ n: 2, desc: '+2 Schrotkugeln', pellets: 2 },    { n: 4, desc: '+5 Schrotkugeln', pellets: 5 }],
  laser:   [{ n: 2, desc: '+1 Durchschlag', pierce: 1 },      { n: 4, desc: '+3 Durchschlag, +20% Schaden', pierce: 3, dmg: 0.2 }],
  rocket:  [{ n: 2, desc: '+35% Explosionsradius', splash: 0.35 }, { n: 4, desc: '+80% Radius, volle Splash-Wirkung', splash: 0.8, fullSplash: true }],
  yarn:    [{ n: 2, desc: '+1 Abpraller', pierce: 1 },        { n: 4, desc: '+3 Abpraller, +25% Schaden', pierce: 3, dmg: 0.25 }],
};

function setBonus(type) {
  const n = S.slots.filter(w => w && w.t === type).length;
  const b = { n, level: 0, rate: 0, pellets: 0, pierce: 0, splash: 0, dmg: 0, fullSplash: false };
  WEAPON_SETS[type].forEach((s, i) => { if (n >= s.n) Object.assign(b, s, { level: i + 1, n }); });
  return b;
}

// grobe DPS-Wirkung eines Sets für die Anzeige
function setFactor(w) {
  const d = WEAPONS[w.t], b = setBonus(w.t);
  return (1 + b.rate) * ((d.pellets + b.pellets) / d.pellets) * (1 + b.dmg) * (1 + b.pierce * 0.25) * (1 + b.splash * 0.4);
}

function activeSetKey() { return WEAPON_IDS.map(t => setBonus(t).level).join(''); }

const Level = {
  need: lv => Math.floor(20 * Math.pow(1.22, lv - 1)),
  add(n) {
    S.xp += n;
    let up = false;
    while (S.xp >= Level.need(S.level)) {
      S.xp -= Level.need(S.level);
      S.level++;
      up = true;
      const bones = 2 + Math.floor(S.level / 5);
      S.bones += bones;
      const chest = S.level % 10 === 0;
      if (chest) S.freeChestAt = Math.min(S.freeChestAt, Date.now());
      S.stats.level = S.level;
      Game.emit('levelUp', { level: S.level, bones, chest });
    }
    if (up) recalc();
  },
};
