'use strict';
// ---------------------------------------------------------------------------
// Tages-Streifzug, Lauf-Auswertung und Töne für die neuen Spielelemente.
//   Tages-Streifzug – jeden Tag eine andere Sonderregel (für alle gleich, aus dem
//                     Datum berechnet), Beute ×1,5, eigene Bestenliste der letzten
//                     14 Tage (nur auf diesem Gerät gespeichert)
//   Lauf-Auswertung – am Ende des Streifzugs: gewählter Weg, Schaden je Quelle,
//                     Zerstörungen, Dauer
// ---------------------------------------------------------------------------

const DAILY_MODS = [
  { id: 'glass', icon: '🔮', name: 'Glaskanone',  desc: 'Doppelter Schaden, aber nur halbes Leben' },
  { id: 'paws',  icon: '🐾', name: 'Pfotentag',   desc: 'Waffen −40 % Schaden, Pfotenhiebe ×4, Start mit Pfotensturm' },
  { id: 'rush',  icon: '⏱️', name: 'Eiltag',      desc: 'Boss-Countdown −30 %, dafür doppelte Beute' },
  { id: 'elite', icon: '👑', name: 'Elitetag',    desc: 'Jeder Kampfraum ist ein Elite-Raum (Segen garantiert)' },
  { id: 'fire',  icon: '🔥', name: 'Feuertag',    desc: 'Start mit Glutkrallen ×2 und Flammenmeer' },
  { id: 'frost', icon: '❄️', name: 'Frosttag',    desc: 'Start mit Frostkrallen ×2, Gegner werfen 25 % seltener' },
  { id: 'weird', icon: '🌀', name: 'Sonderbar',   desc: 'Jeder Raum ist ein Sonderraum' },
];
const DAILY_BY_ID = Object.fromEntries(DAILY_MODS.map(m => [m.id, m]));

const Daily = {
  today: () => U.today(),
  mod(date = U.today()) {
    let h = 7;
    for (const c of date) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0;
    return DAILY_MODS[h % DAILY_MODS.length];
  },
  state() {
    const c = S.challenge = S.challenge || { date: '', best: 0, tries: 0, hist: [] };
    if (c.date !== this.today()) { c.date = this.today(); c.best = 0; c.tries = 0; }
    return c;
  },
  on(id) { return Run.active && S.run.daily === id; },

  start() {
    if (Run.active || S.best < RUN_UNLOCK) return;
    const m = this.mod(), c = this.state();
    Run.start();
    if (!Run.active) return;
    const r = S.run, B = Battle;
    r.daily = m.id; c.tries++;
    if (m.id === 'glass') { r.maxHp = 50; r.hp = 50; }
    if (m.id === 'paws') r.boons.storm = 1;
    if (m.id === 'fire') Object.assign(r.boons, { ember: 2, pyre: 1 });
    if (m.id === 'frost') r.boons.frost = 2;
    if (m.id === 'elite') r.elite = true;
    if (m.id === 'weird') r.biome = BIOMES.length + U.randi(0, SPECIAL_ROOMS.length - 1);
    Rooms.reset(); FX.ambient = [];
    Run.renderBar();
    B.showBanner('TAGES-STREIFZUG!', `${m.icon} ${m.name} · ${m.desc}`, '#ffd34d');
    SFX.play('dailyStart');
    UI.renderTab();
    Save.write();
  },
  // Ende eines Tages-Streifzugs festhalten
  record(depth) {
    const c = this.state(), m = this.mod();
    c.best = Math.max(c.best, depth);
    c.hist = (c.hist || []).filter(h => h.date !== c.date);
    c.hist.unshift({ date: c.date, mod: m.id, best: c.best, tries: c.tries });
    c.hist = c.hist.slice(0, 14);
  },

  cardHtml() {
    const m = this.mod(), c = this.state();
    const hist = (c.hist || []).filter(h => h.date !== c.date).slice(0, 6);
    return `<div class="sec dailybox">
      <h3>Tages-Streifzug <small>neue Regel jeden Tag</small></h3>
      <div class="dailymod"><span class="dicon">${m.icon}</span><div><b>${m.name}</b><small>${m.desc}</small><em>Beute ×1,5${m.id === 'rush' ? ' · heute ×2' : ''}</em></div></div>
      <div class="rbstats"><div><span>Heute bestes</span><b>Raum ${c.best}</b></div><div><span>Versuche heute</span><b>${c.tries}</b></div><div><span>Rekord gesamt</span><b>Raum ${Math.max(c.best, ...hist.map(h => h.best), 0)}</b></div></div>
      <button class="btn gold wide" id="dailyStart">${m.icon} Tages-Streifzug starten</button>
      ${hist.length ? `<h4 class="mh">Deine Bestenliste</h4><div class="dailyhist">${hist.map(h => { const hm = DAILY_BY_ID[h.mod] || m; return `<div><span>${h.date.split('-').slice(1).reverse().join('.')}.</span><i>${hm.icon}</i><small>${hm.name}</small><b>Raum ${h.best}</b></div>`; }).join('')}</div>` : ''}
    </div>`;
  },
};

// ---------------------------------------------------------------- Sonderregeln einhängen
const _dDmg = Run.dmgMul;
Run.dmgMul = function (o, src) {
  let m = _dDmg.call(this, o, src);
  if (Daily.on('glass')) m *= 2;
  if (Daily.on('paws')) m *= src === 'paw' ? 4 : 0.6;
  return m;
};
const _dAtk = Run.atkMul;
Run.atkMul = function () { return _dAtk.call(this) * (Daily.on('frost') ? 1.25 : 1); };
const _dReward = Run.reward;
Run.reward = function () { const b = _dReward.call(this); return S.run.daily ? Math.round(b * (S.run.daily === 'rush' ? 2 : 1.5)) : b; };
const _dBoss = Run.onBossSpawn;
Run.onBossSpawn = function (B, o) {
  _dBoss.call(this, B, o);
  if (Daily.on('rush')) { B.bossTimeMax = Math.round(B.bossTimeMax * 0.7); B.bossTimer = B.bossTimeMax; }
};
const _dDoors = Path.rollDoors;
Path.rollDoors = function (afterStop) {
  const d = _dDoors.call(this, afterStop);
  if (Daily.on('elite')) for (const x of d) if (x.type === 'fight' && !x.guard) x.type = 'elite';
  return d;
};
const _dBiome = Run.rollBiome;
Run.rollBiome = function (not = []) {
  if (!Daily.on('weird')) return _dBiome.call(this, not);
  for (let i = 0; i < 20; i++) { const n = BIOMES.length + U.randi(0, SPECIAL_ROOMS.length - 1); if (n !== S.run.biome && !not.includes(n)) return n; }
  return BIOMES.length + U.randi(0, SPECIAL_ROOMS.length - 1);
};
const _dLabel = Run.label;
Run.label = function (biome) { return _dLabel.call(this, biome) + (S.run.daily ? ' · Tag' : ''); };

// ---------------------------------------------------------------- Lauf-Auswertung
const SRC_LABEL = { bullet: 'Waffen', pet: 'Begleiter', paw: 'Pfote', laser: 'Laser & Talente', talent: 'Talente', burn: 'Brand', chain: 'Kettenblitz',
  build: 'Segen-Effekte', parry: 'Paraden', rock: 'Tropfsteine' };
const SRC_COL = { Waffen: '#c7b3ff', Begleiter: '#9fd0ff', Pfote: '#ff8fb0', 'Laser & Talente': '#ff4d6d', Talente: '#ffd34d', Brand: '#ff8a3c', Kettenblitz: '#ffe066',
  'Segen-Effekte': '#6ee7a0', Paraden: '#5effc8', Tropfsteine: '#c4864a' };
const RunLog = {
  log() { const r = S.run; return (r.log = r.log || { dmg: {}, kills: 0, path: [], t0: Date.now() }); },
  html() {
    const L = S.run.log;
    if (!L) return '';
    const tot = Object.values(L.dmg).reduce((a, b) => a + b, 0) || 1;
    const rows = Object.entries(L.dmg).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const secs = Math.max(1, (Date.now() - L.t0) / 1000);
    // Raum 1 ist immer ein Kampf; danach bestimmt die Wegwahl die Art jedes Raums (letzter Raum = K.O.)
    const depth = S.run.depth;
    const rooms = Array.from({ length: depth + 1 }, (_, i) => (i === 0 ? 'fight' : L.path[i - 1] || 'fight'));
    const done = rooms.slice(0, depth);
    const count = t => done.filter(x => x === t).length;
    const nodes = rooms.map((t, i) => {
      const last = i === rooms.length - 1;
      return `<i class="rm-n rm-${t}${(i + 1) % 10 === 0 ? ' ms' : ''}${last ? ' rm-dead' : ''}" title="Raum ${i + 1} · ${DOORS[t].name}${last ? ' · K.O.' : ''}">${last ? '☠️' : DOORS[t].icon}</i>`;
    });
    const rmap = [];
    for (let s = 0; s < nodes.length; s += 10) rmap.push(`<div class="rm-row"><span>${s + 1}–${Math.min(s + 10, nodes.length)}</span><div class="rm-nodes">${nodes.slice(s, s + 10).join('')}</div></div>`);
    const legend = ['fight', 'elite', 'shop', 'rest', 'event'].map(t => `<span>${DOORS[t].icon} ${DOORS[t].name}</span>`).join('');
    return `<div class="runlog">
      <div class="rbstats">
        <div><span>Gegner besiegt</span><b>${U.fmt(Math.max(0, L.kills - depth))}</b></div>
        <div><span>Bosse besiegt</span><b>${U.fmt(depth)}</b></div>
        <div><span>Elite-Räume</span><b>${count('elite')}</b></div>
        <div><span>Zwischenhalte</span><b>${count('shop') + count('rest') + count('event')}</b></div>
        <div><span>Dauer</span><b>${U.fmtTime(secs)}</b></div>
        <div><span>Segen</span><b>${Run.owned().length}</b></div>
      </div>
      <h4 class="mh">Streifzug-Roadmap <small>jeder Raum endet mit einem Boss</small></h4><div class="rmap">${rmap.join('')}</div><div class="rm-legend">${legend}<span>☠️ K.O.</span></div>
      <h4 class="mh">Schaden nach Quelle</h4>
      <div class="dmgbars">${rows.map(([k, v]) => `<div><span>${k}</span><i><em style="width:${(v / tot * 100).toFixed(1)}%;background:${SRC_COL[k] || '#c7b3ff'}"></em></i><b>${Math.round(v / tot * 100)} %</b></div>`).join('')}</div>
    </div>`;
  },
};
const _lStart = Run.start;
Run.start = function () { _lStart.call(this); if (Run.active) { S.run.log = null; S.run.daily = null; RunLog.log(); } };
const _lDmg = Battle.damage;
Battle.damage = function (o, amount, canCrit, quiet, src = 'bullet') {
  const before = o && o.hp;
  _lDmg.call(this, o, amount, canCrit, quiet, src);
  if (Run.active && o && o.hp < before) {
    const lbl = src === 'bullet' && Traits.curType === 'talent' ? 'Talente' : SRC_LABEL[src] || 'Sonstiges';
    const L = RunLog.log();
    L.dmg[lbl] = (L.dmg[lbl] || 0) + (before - Math.max(0, o.hp));
  }
};
const _lKill = Battle.kill;
Battle.kill = function (o) { const was = o.dead; _lKill.call(this, o); if (!was && Run.active) RunLog.log().kills++; };
const _lChoose = Path.choose;
Path.choose = function (i) {
  const d = S.run.path && S.run.path.doors[i];
  if (d) { RunLog.log().path.push(d.guard ? 'fight' : d.type); SFX.play(d.type === 'shop' ? 'shopBell' : d.type === 'event' ? 'eventChime' : 'door'); }
  _lChoose.call(this, i);
};
const _lDie = Run.die;
Run.die = function (B) { if (S.run.daily) Daily.record(S.run.depth); _lDie.call(this, B); };

// ---------------------------------------------------------------- Streifzug-Reiter: Tages-Karte
const _dTab = UI.tab_run;
UI.tab_run = function () {
  let h = _dTab.call(this);
  if (S.best >= RUN_UNLOCK && !Run.active) h += Daily.cardHtml();
  if (Run.active && S.run.daily) { const m = DAILY_BY_ID[S.run.daily]; h = `<div class="sec dailybox on"><div class="dailymod"><span class="dicon">${m.icon}</span><div><b>Tages-Streifzug: ${m.name}</b><small>${m.desc}</small></div></div></div>` + h; }
  return h;
};
const _dAfter = UI.after_run;
UI.after_run = function (el) { _dAfter.call(this, el); const b = $('#dailyStart'); if (b) b.addEventListener('click', () => { SFX.init(); Daily.start(); }); };

// ---------------------------------------------------------------- Hinweise beim ersten Mal
const _hDoors = Path.showDoors;
Path.showDoors = function () {
  Hints.once('path', 'Die Wegkarte', 'Wähle den nächsten Raum: Elite ist härter, bringt aber sicher einen Segen (normal gibt es nur jeden 3. Raum einen). Händler, Katzenkorb und Ereignisse sind Zwischenhalte ohne Kampf.', 'map');
  _hDoors.call(this);
};
const _hGrant = Run.grant;
Run.grant = function (id) {
  _hGrant.call(this, id);
  const b = BOON_BY_ID[id];
  if (b && b.tag) Hints.once('build', 'Build-Segen', 'Segen mit Etikett (Feuer, Eis, Pfote, Parade, Blitz) verändern den Kampf. Zwei passende ergeben eine Kombi – siehe Segen-Übersicht (Taste I).', 'sparkle');
  if (typeof SYNERGIES !== 'undefined') for (const s of SYNERGIES) if ((s.a === id || s.b === id) && Build.syn(s.id) && Run.n(id) === 1) { UI.toast(`${s.icon} <b>Kombi: ${s.name}!</b><br><small>${s.desc}</small>`, 'ach'); SFX.play('combo', 3); }
};

// ---------------------------------------------------------------- Töne
const _playD = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  switch (name) {
    case 'door': this.noiseF(0.25, 0.1, 0, 600, 'lowpass'); this.tone(220, 0.18, 'triangle', 0.06, -60); this.tone(330, 0.2, 'sine', 0.05, 0, 0.12); return;
    case 'shopBell': [1568, 2093].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.06, 0, i * 0.12)); this.tone(3136, 0.3, 'sine', 0.02, 0, 0.12); return;
    case 'eventChime': [659, 831, 988, 1319].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.045, 0, i * 0.09)); return;
    case 'dailyStart': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'square', 0.05, 0, i * 0.08)); this.tone(1568, 0.6, 'triangle', 0.05, 0, 0.35); return;
    case 'healPulse': this.tone(660, 0.25, 'sine', 0.03, 220); return;
    case 'fuse': this.noiseF(0.08, 0.05, 0, 5000, 'highpass'); this.tone(1200, 0.04, 'square', 0.025); return;
    case 'split': this.tone(500, 0.12, 'square', 0.05, -250); this.tone(750, 0.12, 'square', 0.04, -300, 0.05); return;
    case 'phase': this.tone(110, 0.9, 'sawtooth', 0.09, -40); this.tone(165, 0.9, 'square', 0.05, -50, 0.05); this.noiseF(0.7, 0.12, 0, 300, 'lowpass'); return;
    case 'charge': this.tone(200, 1.1, 'sawtooth', 0.05, 600); return;
    case 'clank': this.tone(1800, 0.06, 'square', 0.03, -900); this.noiseF(0.05, 0.05, 0, 4000, 'bandpass', 4); return;
  }
  return _playD.call(this, name, arg);
};
