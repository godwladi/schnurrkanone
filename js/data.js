'use strict';
// ---------------------------------------------------------------------------
// Spieldaten: Waffen, Stufen-Farben, Biome, Katzen, Begleiter, Upgrades, Perks
// ---------------------------------------------------------------------------

const WEAPONS = {
  pistol:  { name: 'Miau-Pistole',  icon: '🔫', dmg: 5,   rate: 2.5, pellets: 1, spread: 0,    speed: 950,  pierce: 0, splash: 0,   arc: false, size: 4, desc: 'Zuverlässig und schnell.' },
  shotgun: { name: 'Fellflinte',    icon: '💥', dmg: 2.6, rate: 1.1, pellets: 5, spread: 0.22, speed: 850,  pierce: 0, splash: 0,   arc: false, size: 3, desc: 'Streut 5 Schrotkugeln.' },
  laser:   { name: 'Laserpointer',  icon: '🔦', dmg: 2.0, rate: 5.5, pellets: 1, spread: 0,    speed: 1700, pierce: 1, splash: 0,   arc: false, size: 3, desc: 'Durchschlägt 2 Ziele.' },
  rocket:  { name: 'Fischrakete',   icon: '🐟', dmg: 15,  rate: 0.7, pellets: 1, spread: 0,    speed: 520,  pierce: 0, splash: 110, arc: false, size: 7, desc: 'Explodiert im Umkreis.' },
  yarn:    { name: 'Wollknäuel',    icon: '🧶', dmg: 6.5, rate: 1.4, pellets: 1, spread: 0,    speed: 600,  pierce: 2, splash: 0,   arc: true,  size: 7, desc: 'Hüpft durch 3 Ziele.' },
};
const WEAPON_IDS = Object.keys(WEAPONS);
const MAX_TIER = 15;

const TIERS = [
  { name: 'Gewöhnlich',   color: '#b8c0cc' },
  { name: 'Ungewöhnlich', color: '#6ee7a0' },
  { name: 'Selten',       color: '#5ab0ff' },
  { name: 'Episch',       color: '#c084fc' },
  { name: 'Legendär',     color: '#ffb347' },
  { name: 'Mythisch',     color: '#ff5d73' },
  { name: 'Uralt',        color: '#ff7ad9' },
  { name: 'Himmlisch',    color: '#7ef9ff' },
  { name: 'Göttlich',     color: '#ffe66d' },
  { name: 'Kosmisch',     color: '#9d7bff' },
  { name: 'Astral',       color: '#5effc8' },
  { name: 'Chaos',        color: '#ff3b3b' },
  { name: 'Ewig',         color: '#ffffff' },
  { name: 'Unendlich',    color: '#ffd700' },
  { name: 'Omega',        color: 'rainbow' },
];
function tierColor(r, t) {
  const c = TIERS[Math.min(r, MAX_TIER) - 1].color;
  if (c !== 'rainbow') return c;
  return `hsl(${((t || performance.now() / 1000) * 120) % 360},90%,65%)`;
}

const BIOMES = [
  { name: 'Flüsterwald',  sky: ['#7cc6ff', '#dff4ff'], hills: '#7fcf86', hills2: '#5cb466', ground: '#5cb85c', ground2: '#3e8e41', obstacle: 'tree',     accent: '#3fa34d', debris: ['#3fa34d', '#7a4a2a', '#9be08f'] },
  { name: 'Sonnenwüste',  sky: ['#ffbe76', '#fff1d6'], hills: '#f3c98b', hills2: '#e3ae6a', ground: '#e8b86d', ground2: '#c99545', obstacle: 'cactus',   accent: '#4caf50', debris: ['#4caf50', '#e8b86d', '#2e7d32'] },
  { name: 'Frostgipfel',  sky: ['#9dbdff', '#eef5ff'], hills: '#dbe7ff', hills2: '#b9cdf0', ground: '#f4f8ff', ground2: '#c6d6ee', obstacle: 'snowman',  accent: '#ff8c42', debris: ['#ffffff', '#cfe0ff', '#ff8c42'] },
  { name: 'Lavagrund',    sky: ['#2a0b18', '#a33a2a'], hills: '#4a1f1f', hills2: '#5e2626', ground: '#3b2a2a', ground2: '#ff6a2b', obstacle: 'lavarock', accent: '#ff6a2b', debris: ['#ff6a2b', '#3b2a2a', '#ffd166'] },
  { name: 'Neon-City',    sky: ['#120e2c', '#4a2a7a'], hills: '#241a48', hills2: '#2f2260', ground: '#2a2440', ground2: '#ff4fd8', obstacle: 'vending',  accent: '#ff4fd8', debris: ['#ff4fd8', '#5ef0ff', '#ffffff'] },
  { name: 'Sternenmeer',  sky: ['#03041a', '#1d1b4a'], hills: '#16163a', hills2: '#1f1f4d', ground: '#2f2f55', ground2: '#8a7bff', obstacle: 'asteroid', accent: '#8a7bff', debris: ['#9aa3ad', '#8a7bff', '#ffffff'] },
];
function biomeFor(stage) { return BIOMES[Math.floor((stage - 1) / 10) % BIOMES.length]; }

const CAT_RARITY = [
  { name: 'Gewöhnlich', color: '#b8c0cc', w: 60 },
  { name: 'Selten',     color: '#5ab0ff', w: 27 },
  { name: 'Episch',     color: '#c084fc', w: 10 },
  { name: 'Legendär',   color: '#ffb347', w: 2.6 },
  { name: 'Mythisch',   color: '#ff5d73', w: 0.4 },
];

const BONUS_LABEL = {
  dmg: 'Schaden', rate: 'Feuerrate', coin: 'Münzen', click: 'Pfotenhieb',
  crit: 'Krit-Chance', critdmg: 'Krit-Schaden', boss: 'Boss-Schaden', all: 'Alle Werte',
};

const CATS = [
  { id: 'mieze',        name: 'Mieze',              r: 0, fur: '#f4a259', belly: '#ffe8cc', stripe: '#d9822b', pattern: 'stripes', eye: '#3d9970', hat: null,     bonus: 'dmg',     val: 0.05 },
  { id: 'socke',        name: 'Socke',              r: 0, fur: '#2b2b33', belly: '#ffffff', stripe: '#2b2b33', pattern: 'tux',     eye: '#ffd166', hat: null,     bonus: 'coin',    val: 0.05 },
  { id: 'grauchen',     name: 'Grauchen',           r: 0, fur: '#9aa3ad', belly: '#d7dde3', stripe: '#6c757d', pattern: 'stripes', eye: '#4ea8de', hat: null,     bonus: 'click',   val: 0.10 },
  { id: 'tiger',        name: 'Tiger-Tom',          r: 0, fur: '#ff9f1c', belly: '#fff3e0', stripe: '#3a2a1a', pattern: 'stripes', eye: '#84cc16', hat: null,     bonus: 'rate',    val: 0.03 },
  { id: 'flocke',       name: 'Flocke',             r: 0, fur: '#f8f9fa', belly: '#ffffff', stripe: '#dee2e6', pattern: 'plain',   eye: '#60a5fa', hat: 'bow',    bonus: 'coin',    val: 0.05 },
  { id: 'ninja',        name: 'Ninja-Neko',         r: 1, fur: '#1f2937', belly: '#374151', stripe: '#111827', pattern: 'plain',   eye: '#ef4444', hat: 'band',   bonus: 'crit',    val: 0.015 },
  { id: 'kapitaen',     name: 'Kapitän Schnurrbart',r: 1, fur: '#c08457', belly: '#f5deb3', stripe: '#8b5a2b', pattern: 'stripes', eye: '#1d4ed8', hat: 'pirate', bonus: 'coin',    val: 0.10 },
  { id: 'luna',         name: 'Luna',               r: 1, fur: '#4c4a6b', belly: '#8e8bb3', stripe: '#2e2c48', pattern: 'spots',   eye: '#facc15', hat: null,     bonus: 'dmg',     val: 0.10 },
  { id: 'mocca',        name: 'Mocca',              r: 1, fur: '#7b4b2a', belly: '#d2a679', stripe: '#5a3520', pattern: 'spots',   eye: '#22c55e', hat: 'band',   bonus: 'rate',    val: 0.05 },
  { id: 'maunz',        name: 'Sir Maunz',          r: 2, fur: '#e5e7eb', belly: '#ffffff', stripe: '#9ca3af', pattern: 'plain',   eye: '#2563eb', hat: 'helmet', bonus: 'boss',    val: 0.20 },
  { id: 'pixel',        name: 'Pixel',              r: 2, fur: '#22d3ee', belly: '#cffafe', stripe: '#0e7490', pattern: 'spots',   eye: '#f0abfc', hat: 'visor',  bonus: 'rate',    val: 0.07 },
  { id: 'nebel',        name: 'Nebel',              r: 2, fur: '#a78bfa', belly: '#ede9fe', stripe: '#7c3aed', pattern: 'stripes', eye: '#fde047', hat: null,     bonus: 'critdmg', val: 0.25 },
  { id: 'galaxia',      name: 'Galaxia',            r: 3, fur: '#312e81', belly: '#6366f1', stripe: '#a5b4fc', pattern: 'stars',   eye: '#f472b6', hat: 'halo',   bonus: 'dmg',     val: 0.30 },
  { id: 'midas',        name: 'Midas',              r: 3, fur: '#facc15', belly: '#fef9c3', stripe: '#ca8a04', pattern: 'stripes', eye: '#16a34a', hat: 'crown',  bonus: 'coin',    val: 0.30 },
  { id: 'schroedinger', name: 'Schrödinger',        r: 4, fur: '#64748b', belly: '#cbd5e1', stripe: '#334155', pattern: 'plain',   eye: '#a3e635', hat: 'box',    bonus: 'all',     val: 0.15, ghost: true },
  { id: 'neunschwanz',  name: 'Neunschwanz',        r: 4, fur: '#fb7185', belly: '#ffe4e6', stripe: '#e11d48', pattern: 'stripes', eye: '#fde047', hat: 'crown',  bonus: 'all',     val: 0.20, tails: 9 },
];
const CAT_BY_ID = Object.fromEntries(CATS.map(c => [c.id, c]));
const CAT_MAX_LEVEL = 10;

const PETS = [
  { id: 'mouse', name: 'Maus-Drohne',     icon: '🐭', unlock: 25, base: 15, desc: l => `Feuert jede Sekunde mit ${Math.round(10 * Math.max(1, l))}% deiner DPS.` },
  { id: 'fish',  name: 'Goldfisch-Ballon', icon: '🐠', unlock: 40, base: 20, desc: l => `Bringt alle 8 s Münzen im Wert von ${(1.5 * Math.max(1, l)).toFixed(1)} Zerstörungen.` },
  { id: 'owl',   name: 'Nachteule',        icon: '🦉', unlock: 60, base: 30, desc: l => `Alle 20 s: ${(3 + 0.5 * Math.max(1, l)).toFixed(1)} s +50% Feuerrate.` },
];

const UPGRADES = [
  { id: 'dmg',   name: 'Krallenschärfe',   icon: '🗡️', base: 25,  growth: 1.19, desc: l => `+15% Schaden pro Stufe (jetzt +${15 * l}%)` },
  { id: 'rate',  name: 'Flinker Abzug',    icon: '⚡', base: 60,  growth: 1.22, max: 50, desc: l => `+4% Feuerrate pro Stufe (jetzt +${4 * l}%)` },
  { id: 'crit',  name: 'Glückspfote',      icon: '🍀', base: 150, growth: 1.30, max: 45, desc: l => `+1% Krit-Chance (jetzt ${5 + l}%)` },
  { id: 'coin',  name: 'Goldschnurrhaare', icon: '✨', base: 40,  growth: 1.21, desc: l => `+12% Münzen pro Stufe (jetzt +${12 * l}%)` },
  { id: 'click', name: 'Pfotenhieb',       icon: '🐾', base: 30,  growth: 1.2,  desc: l => `Klick-Schaden = ${8 + l}% deiner DPS` },
  { id: 'box',   name: 'Kistenqualität',   icon: '📦', base: 2000, growth: 9,   max: 14, desc: l => `Waffenkisten enthalten Stufe ${1 + l}` },
];

const PERKS = [
  { id: 'dmg',     name: 'Urinstinkt',    icon: '🔥', base: 1, growth: 1.35,          desc: l => `+25% Schaden pro Stufe (jetzt +${25 * l}%)` },
  { id: 'coin',    name: 'Fischvermögen', icon: '🐠', base: 1, growth: 1.35,          desc: l => `+25% Münzen pro Stufe (jetzt +${25 * l}%)` },
  { id: 'start',   name: 'Katzensprung',  icon: '🚀', base: 3, growth: 1.8, max: 20,  desc: l => `Starte nach Wiedergeburt auf Stufe ${1 + 5 * l}` },
  { id: 'boxluck', name: 'Kistenmeister', icon: '🎁', base: 2, growth: 1.5, max: 10,  desc: l => `${5 * l}% Chance auf +1 Stufe aus Kisten` },
  { id: 'offline', name: 'Katzenschlaf',  icon: '💤', base: 2, growth: 1.6, max: 10,  desc: l => `Offline-Ertrag ${25 + 15 * l}%, max. ${8 + l} h` },
  { id: 'boss',    name: 'Neun Leben',    icon: '⏱️', base: 2, growth: 1.7, max: 10,  desc: l => `Boss-Zeit ${30 + 3 * l} s` },
  { id: 'chest',   name: 'Glückskatze',   icon: '🐈', base: 3, growth: 1.7, max: 6,   desc: l => `Gratis-Kiste alle ${Math.round(10 * (1 - 0.1 * l))} min` },
];

const SKILLS = [
  { id: 'laser', key: '1', name: 'Laser-Blick',     icon: '👁️', unlock: 3,  cd: 30, desc: '3 s Augenlaser mit 6× DPS' },
  { id: 'rain',  key: '2', name: 'Fischregen',      icon: '🐟', unlock: 8,  cd: 60, desc: 'Sofort Münzen für 25 Zerstörungen' },
  { id: 'roar',  key: '3', name: 'Wildes Fauchen',  icon: '😾', unlock: 12, cd: 45, desc: '8 s doppelte Feuerrate, +50% Krit' },
];

const SLOT_UNLOCK = [0, 0, 5, 15]; // benötigte Bestleistung (Stufe)

// Erfolge werden aus Schwellenwerten generiert
const ACHIEVEMENTS = [];
(function buildAchievements() {
  const defs = [
    ['kills',     'Zerstörungen',       [100, 1000, 10000, 100000, 1000000], ['Holzwurm', 'Kettensägen-Kitty', 'Abrissbirne', 'Naturkatastrophe', 'Weltenfresser']],
    ['best',      'Höchste Stufe',      [10, 25, 50, 100, 200],              ['Ausflug', 'Entdeckerin', 'Weltenbummler', 'Legende', 'Jenseits der Karte']],
    ['merges',    'Verschmelzungen',    [10, 100, 1000, 5000],               ['Bastelpfote', 'Schmiedekatze', 'Alchemist', 'Fusionsreaktor']],
    ['chests',    'Kisten geöffnet',    [1, 10, 50, 200],                    ['Neugier', 'Sammelwut', 'Katzenhorter', 'Tierheim-Chefin']],
    ['rebirths',  'Wiedergeburten',     [1, 5, 20, 50],                      ['Das zweite Leben', 'Neun Leben?', 'Ewiger Kreislauf', 'Samsara']],
    ['maxTier',   'Höchste Waffenstufe',[3, 6, 9, 12, 15],                   ['Aufrüstung', 'Waffennarr', 'Arsenal', 'Superwaffe', 'Omega-Pfote']],
    ['clicks',    'Pfotenhiebe',        [100, 1000, 10000],                  ['Stupser', 'Trommelpfote', 'Klick-Gewitter']],
    ['bossKills', 'Bosse besiegt',      [5, 25, 100, 500],                   ['Bossjäger', 'Riesenfäller', 'Titanenschreck', 'Endgegner-Endgegner']],
    ['frenzies',  'Schnurr-Rasereien',  [1, 10, 100],                        ['Erstes Schnurren', 'Dauerschnurrer', 'Schnurr-Vulkan']],
    ['balloons',  'Glücksballons',      [1, 10, 50],                         ['Ballonjäger', 'Luftpirat', 'Zeppelin-Zorro']],
    ['treasures', 'Schatztruhen',       [1, 10, 50],                         ['Schatzsucherin', 'Truhenknacker', 'Piratenkönig']],
    ['level',     'Katzen-Level',       [10, 25, 50],                        ['Erfahrene Pfote', 'Veteranin', 'Großmeister-Katze']],
    ['maxCombo',  'Höchste Combo',      [10, 25, 50],                        ['Kettenreaktion', 'Combo-Katze', 'Unaufhaltsam']],
  ];
  for (const [stat, label, steps, names] of defs) {
    steps.forEach((n, i) => {
      ACHIEVEMENTS.push({ id: `${stat}_${n}`, stat, goal: n, name: names[i], desc: `${label}: ${U.fmt(n)}`, reward: 5 + i * 10 });
    });
  }
})();
