'use strict';
// ---------------------------------------------------------------------------
// Spielstand, abgeleitete Werte und alle Spieler-Aktionen
// ---------------------------------------------------------------------------

const KILLS_PER_STAGE = 10;
const GRID_SIZE = 16;
const CHEST_COST = 10;

function defaultState() {
  return {
    v: 1,
    coins: 0, bones: 5, minze: 0, minzeTotal: 0, rebirths: 0,
    level: 1, xp: 0,
    stage: 1, maxStage: 1, best: 1, kills: 0, farm: false, farmKills: 0, autoBoss: true,
    up: { dmg: 0, rate: 0, crit: 0, coin: 0, click: 0, box: 0 },
    perks: { dmg: 0, coin: 0, start: 0, boxluck: 0, offline: 0, boss: 0, chest: 0 },
    grid: Array(GRID_SIZE).fill(null),
    slots: [{ t: 'pistol', r: 1 }, null, null, null],
    boxesBought: 0,
    cats: { mieze: 1 },
    activeCat: 'mieze',
    pets: { mouse: 0, fish: 0, owl: 0 },
    codex: { 'pistol:1': true },
    ach: {},
    stats: { kills: 0, merges: 0, chests: 0, bossKills: 0, clicks: 0, maxTier: 1, totalCoins: 0, playTime: 0, rebirths: 0, frenzies: 0, best: 1, balloons: 0, maxCombo: 0, skills: 0, treasures: 0, parries: 0, runBest: 0, kos: 0 },
    quests: { day: '', list: [], bonus: false, comboBest: 0 },
    freeChestAt: Date.now() + 2 * 60 * 1000,
    lastSave: Date.now(),
    daily: { last: '', streak: 0 },
    skillsCd: { laser: 0, rain: 0, roar: 0, shield: 0 },
    run: { active: false, depth: 0, hp: 100, maxHp: 100, boons: {}, biome: 0, dps: 1, best: 0, runs: 0, choosing: false, offer: null, picks: 0, stash: null },
    sound: true, music: true, musicVol: 0.5, sfxVol: 0.7,
    buyAmount: 1,
    seenHelp: false,
  };
}

let S = defaultState();

// abgeleitete Werte, werden bei jeder Änderung neu berechnet
const R = { dmgMult: 1, rateMult: 1, coinMult: 1, crit: 0.05, critDmg: 2, clickPct: 0.15, bossMult: 1, dps: 0, clickDmg: 1 };

const Econ = {
  hp: st => 10 * Math.pow(1.38, st - 1) * (1 + Math.floor((st - 1) / 10) * 0.15),
  coins: st => 2 * Math.pow(1.22, st - 1),
  bossHp: st => Econ.hp(st) * 15,
  bossTime: () => 30 + 3 * S.perks.boss,
  bones: st => 1 + Math.floor(st / 15),
  tierMult: r => Math.pow(2.5, r - 1),
  weaponDps(w) { const d = WEAPONS[w.t]; return d.dmg * d.pellets * d.rate * Econ.tierMult(w.r) * (1 + d.pierce * 0.35 + (d.splash ? 0.6 : 0)); },
  boxCost: () => 10 * Math.pow(2, S.up.box) * Math.pow(1.1, S.boxesBought),
  upgradeCost: (u, lvl) => u.base * Math.pow(u.growth, lvl),
  perkCost: (p, lvl) => Math.ceil(p.base * Math.pow(p.growth, lvl)),
  petCost: (p, lvl) => lvl === 0 ? p.unlock : Math.ceil(p.base * Math.pow(1.5, lvl)),
  rebirthGain: () => S.maxStage < 25 ? 0 : Math.floor(Math.pow(S.maxStage - 15, 1.35) / 2),
  freeChestInterval: () => 10 * 60 * 1000 * (1 - 0.1 * S.perks.chest),
  offlineCapH: () => 8 + S.perks.offline,
  offlineRate: () => 0.25 + 0.15 * S.perks.offline,
};

function recalc() {
  const b = { dmg: 0, rate: 0, coin: 0, click: 0, crit: 0, critdmg: 0, boss: 0, all: 0 };
  // Streifzug: ganz von vorn – keine Katzen-Boni, Perks, Minze und Level-Boni
  const run = !!(S.run && S.run.active);
  if (!run) for (const [id, lvl] of Object.entries(S.cats)) {
    const c = CAT_BY_ID[id];
    if (!c || !lvl) continue;
    b[c.bonus] += c.val * lvl * (id === S.activeCat ? 2 : 1);
  }
  const all = 1 + b.all;
  const minzeBoost = run ? 1 : (1 + 0.02 * S.minzeTotal) * (1 + 0.01 * (S.level - 1));
  const pk = run ? { dmg: 0, coin: 0 } : S.perks;
  R.dmgMult = (1 + 0.15 * S.up.dmg) * (1 + b.dmg) * (1 + 0.25 * pk.dmg) * minzeBoost * all;
  R.rateMult = (1 + 0.04 * S.up.rate) * (1 + b.rate) * (1 + b.all * 0.5);
  R.coinMult = (1 + 0.12 * S.up.coin) * (1 + b.coin) * (1 + 0.25 * pk.coin) * minzeBoost * all;
  R.crit = Math.min(0.9, 0.05 + 0.01 * S.up.crit + b.crit);
  R.critDmg = 2 + b.critdmg + b.all;
  R.bossMult = (1 + b.boss) * all;
  R.clickPct = (0.08 + 0.01 * S.up.click) * (1 + b.click);
  let base = 0;
  for (const w of S.slots) if (w) base += Econ.weaponDps(w) * setFactor(w);
  R.dps = base * R.dmgMult * R.rateMult * (1 + R.crit * (R.critDmg - 1));
  R.clickDmg = Math.max(1 + S.up.click, R.dps * R.clickPct);
}

// ---------------------------------------------------------------- Aktionen
const Game = {
  listeners: [],
  emit(ev, data) { for (const l of this.listeners) l(ev, data); },

  addCoins(n) { S.coins += n; S.stats.totalCoins += n; Game.emit('gain', n); },

  discover(w) {
    const key = `${w.t}:${w.r}`;
    if (!S.codex[key]) {
      S.codex[key] = true;
      if (w.r >= 2) Game.emit('discover', w);
    }
    if (w.r > S.stats.maxTier) S.stats.maxTier = w.r;
  },

  buyBox(count = 1) {
    let bought = 0;
    for (let i = 0; i < count; i++) {
      const free = S.grid.indexOf(null);
      if (free < 0) { if (!bought) { SFX.play('error'); Game.emit('toast', { text: '🎒 Rucksack voll – verschmelze Waffen!', cls: 'warn' }); } break; }
      const cost = Econ.boxCost();
      if (S.coins < cost) { if (!bought) SFX.play('error'); break; }
      S.coins -= cost;
      S.boxesBought++;
      let r = 1 + S.up.box;
      if (Math.random() < 0.05 * S.perks.boxluck) r++;
      const w = { t: U.pick(WEAPON_IDS), r: Math.min(MAX_TIER, r) };
      S.grid[free] = w;
      Game.discover(w);
      bought++;
      Game.emit('newItem', free);
    }
    if (bought) { SFX.play('buy'); recalc(); Game.emit('weapons'); }
    return bought;
  },

  // Quelle/Ziel: {k:'g'|'s', i}
  getAt(p) { return p.k === 'g' ? S.grid[p.i] : S.slots[p.i]; },
  setAt(p, v) { if (p.k === 'g') S.grid[p.i] = v; else S.slots[p.i] = v; },
  slotUnlocked: i => S.best >= SLOT_UNLOCK[i],

  move(src, dst) {
    if (src.k === dst.k && src.i === dst.i) return;
    if (dst.k === 's' && !Game.slotUnlocked(dst.i)) { SFX.play('error'); return; }
    const a = Game.getAt(src), b = Game.getAt(dst);
    if (!a) return;
    if (b && a.t === b.t && a.r === b.r && a.r < MAX_TIER) {
      const merged = { t: a.t, r: a.r + 1 };
      Game.setAt(dst, merged);
      Game.setAt(src, null);
      S.stats.merges++;
      Game.discover(merged);
      SFX.play('merge', merged.r);
      Game.emit('merged', { dst, w: merged });
    } else {
      Game.setAt(dst, a);
      Game.setAt(src, b);
    }
    recalc();
    Game.emit('weapons');
  },

  autoMerge() {
    let merged = 0, again = true;
    while (again) {
      again = false;
      const seen = {};
      for (let i = 0; i < GRID_SIZE; i++) {
        const w = S.grid[i];
        if (!w || w.r >= MAX_TIER) continue;
        const key = `${w.t}:${w.r}`;
        if (seen[key] !== undefined) {
          const j = seen[key];
          S.grid[j] = { t: w.t, r: w.r + 1 };
          S.grid[i] = null;
          Game.discover(S.grid[j]);
          S.stats.merges++;
          merged++; again = true;
          delete seen[key];
        } else seen[key] = i;
      }
    }
    if (merged) {
      SFX.play('merge', 2);
      Game.emit('toast', { text: `✨ ${merged}× verschmolzen!`, cls: 'good' });
      recalc(); Game.emit('weapons');
    } else SFX.play('error');
  },

  equipBest() {
    const all = [...S.grid, ...S.slots].filter(Boolean);
    all.sort((a, b) => Econ.weaponDps(b) - Econ.weaponDps(a));
    const n = SLOT_UNLOCK.filter((_, i) => Game.slotUnlocked(i)).length;
    S.slots = [0, 1, 2, 3].map(i => (i < n ? all.shift() || null : null));
    S.grid = Array(GRID_SIZE).fill(null);
    all.forEach((w, i) => { if (i < GRID_SIZE) S.grid[i] = w; });
    SFX.play('buy');
    recalc(); Game.emit('weapons');
  },

  // 30% des Kistenwerts – so lässt sich mit Kaufen+Verwerten kein Gewinn machen
  scrapValue: w => 0.3 * 10 * Math.pow(2, w.r - 1) * Math.pow(1.1, S.boxesBought),

  scrap(src) {
    const w = Game.getAt(src);
    if (!w) return;
    const v = Game.scrapValue(w);
    Game.setAt(src, null);
    Game.addCoins(v);
    SFX.play('coin');
    Game.emit('toast', { text: `♻️ ${WEAPONS[w.t].name} ${U.roman(w.r)} verwertet: +${U.fmt(v)} 💰`, cls: 'good' });
    recalc(); Game.emit('weapons');
  },

  // verwertet Rucksack-Waffen unter der aktuellen Kistenstufe
  cleanup() {
    const minTier = 1 + S.up.box;
    let n = 0, v = 0;
    S.grid.forEach((w, i) => {
      if (w && w.r < minTier) { v += Game.scrapValue(w); S.grid[i] = null; n++; }
    });
    if (!n) { SFX.play('error'); Game.emit('toast', { text: `Keine Waffen unter Stufe ${U.roman(minTier)} im Rucksack.`, cls: 'warn' }); return; }
    Game.addCoins(v);
    SFX.play('merge', 1);
    Game.emit('toast', { text: `♻️ ${n} Waffen verwertet: +${U.fmt(v)} 💰`, cls: 'good' });
    recalc(); Game.emit('weapons');
  },

  // Doppelklick: zwischen Rucksack und Ausrüstung wechseln
  quickEquip(src) {
    const w = Game.getAt(src);
    if (!w) return;
    if (src.k === 'g') {
      let target = -1, weakest = Infinity;
      for (let i = 0; i < 4; i++) {
        if (!Game.slotUnlocked(i)) continue;
        if (!S.slots[i]) { target = i; break; }
        const d = Econ.weaponDps(S.slots[i]);
        if (d < weakest) { weakest = d; target = i; }
      }
      if (target >= 0) Game.move(src, { k: 's', i: target });
    } else {
      const free = S.grid.indexOf(null);
      if (free >= 0) Game.move(src, { k: 'g', i: free });
    }
  },

  upgradeBuyCount(u) {
    const lvl = S.up[u.id];
    const maxLeft = u.max !== undefined ? u.max - lvl : Infinity;
    let n = 0, total = 0;
    if (S.buyAmount === 'max') {
      while (n < maxLeft && n < 1000) {
        const c = Econ.upgradeCost(u, lvl + n);
        if (total + c > S.coins) break;
        total += c; n++;
      }
      if (n === 0 && maxLeft > 0) { n = 1; total = Econ.upgradeCost(u, lvl); }
    } else {
      const want = Math.min(S.buyAmount, maxLeft);
      for (; n < want; n++) total += Econ.upgradeCost(u, lvl + n);
    }
    return { n, total };
  },

  buyUpgrade(id) {
    const u = UPGRADES.find(x => x.id === id);
    const { n, total } = Game.upgradeBuyCount(u);
    if (!n || total > S.coins) { SFX.play('error'); return; }
    S.coins -= total;
    S.up[id] += n;
    SFX.play('buy');
    recalc(); Game.emit('upgrades');
  },

  buyPerk(id) {
    const p = PERKS.find(x => x.id === id);
    const lvl = S.perks[id];
    if (p.max !== undefined && lvl >= p.max) return;
    const c = Econ.perkCost(p, lvl);
    if (S.minze < c) { SFX.play('error'); return; }
    S.minze -= c;
    S.perks[id]++;
    SFX.play('merge', 3);
    recalc(); Game.emit('rebirth');
  },

  buyPet(id) {
    const p = PETS.find(x => x.id === id);
    const lvl = S.pets[id];
    const c = Econ.petCost(p, lvl);
    if (S.bones < c) { SFX.play('error'); return; }
    S.bones -= c;
    S.pets[id]++;
    SFX.play(lvl === 0 ? 'achievement' : 'buy');
    if (lvl === 0) Game.emit('toast', { text: `${p.icon} ${p.name} begleitet dich jetzt!`, cls: 'good' });
    Game.emit('pets');
  },

  setActiveCat(id) {
    if (!S.cats[id]) return;
    S.activeCat = id;
    SFX.play('paw');
    recalc(); Game.emit('cats');
  },

  rollCat() {
    const rar = U.weightedPick(CAT_RARITY.map((r, i) => ({ ...r, i })));
    const pool = CATS.filter(c => c.r === rar.i);
    return U.pick(pool);
  },

  // gibt {cat, isNew, level, refund} zurück
  openChest(free) {
    if (free) {
      if (Date.now() < S.freeChestAt) return null;
      S.freeChestAt = Date.now() + Econ.freeChestInterval();
    } else {
      if (S.bones < CHEST_COST) { SFX.play('error'); return null; }
      S.bones -= CHEST_COST;
    }
    const cat = Game.rollCat();
    const had = S.cats[cat.id] || 0;
    let refund = 0;
    if (had >= CAT_MAX_LEVEL) { refund = 3 + cat.r * 3; S.bones += refund; }
    else S.cats[cat.id] = had + 1;
    S.stats.chests++;
    recalc();
    return { cat, isNew: had === 0, level: S.cats[cat.id], refund };
  },

  rebirth() {
    const gain = Econ.rebirthGain();
    if (gain <= 0 || (S.run && S.run.active)) return;
    S.minze += gain;
    S.minzeTotal += gain;
    S.rebirths++;
    S.stats.rebirths = S.rebirths;
    S.coins = 0;
    S.stage = 1 + 5 * S.perks.start;
    S.maxStage = S.stage;
    S.kills = 0; S.farm = false; S.farmKills = 0;
    for (const k of Object.keys(S.up)) S.up[k] = 0;
    S.grid = Array(GRID_SIZE).fill(null);
    S.slots = [{ t: 'pistol', r: 1 }, null, null, null];
    S.boxesBought = 0;
    recalc();
    Game.emit('rebirthDone', gain);
  },

  checkAchievements() {
    S.stats.best = S.best;
    for (const a of ACHIEVEMENTS) {
      if (S.ach[a.id]) continue;
      if ((S.stats[a.stat] || 0) >= a.goal) {
        S.ach[a.id] = true;
        S.bones += a.reward;
        SFX.play('achievement');
        Game.emit('toast', { text: `🏆 <b>${a.name}</b><br><small>${a.desc} · +${a.reward} 🦴</small>`, cls: 'ach' });
      }
    }
  },

  // Offline-Ertrag in Münzen und Sekunden
  offlineGain(elapsedMs) {
    if (S.run && S.run.active) return null; // der Streifzug ruht, solange die App zu ist
    const secs = Math.min(elapsedMs / 1000, Econ.offlineCapH() * 3600);
    if (secs < 60) return null;
    const killsPerSec = Math.min(2, R.dps / Econ.hp(S.stage));
    const coins = killsPerSec * Econ.coins(S.stage) * R.coinMult * secs * Econ.offlineRate();
    return { secs, coins, kills: Math.floor(killsPerSec * secs * Econ.offlineRate()) };
  },

  checkDaily() {
    const today = U.today();
    if (S.daily.last === today) return null;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    S.daily.streak = S.daily.last === yesterday ? S.daily.streak + 1 : 1;
    S.daily.last = today;
    const reward = Math.min(40, 5 + S.daily.streak * 3);
    S.bones += reward;
    return { streak: S.daily.streak, reward };
  },
};
