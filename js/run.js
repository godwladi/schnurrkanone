'use strict';
// ---------------------------------------------------------------------------
// Streifzug: Roguelike-Modus. Die Katze zieht mit ihrer Ausrüstung los, jeder Raum
// ist ein neues Gebiet mit 10 Gegnern und einem Boss. Leben heilen sich nicht von
// selbst, nach jedem Boss gibt es 1 von 3 Segen (oder einen riskanten Pakt).
// K.O. = Streifzug vorbei, Belohnung in Fischgräten je geschafftem Raum.
// Gegner wachsen mit der eigenen Stärke beim Start mit, damit es immer fordert.
// Der Haupt-Spielstand (Stufe, Farm) wird während des Laufs beiseitegelegt.
// ---------------------------------------------------------------------------

const RUN_UNLOCK = 8;
const GUARDIAN_EVERY = 20; // Wächter-Raum (stärker, 2 Segen als Beute)

// rar: seltener angeboten · max: höchstens so oft · pact: Pakt mit Nachteil (rote Karte)
const BOONS = [
  { id: 'claws',   icon: '🔥', name: 'Scharfe Krallen',     desc: '+30 % Schaden' },
  { id: 'coffee',  icon: '☕', name: 'Koffein-Kater',       desc: '+20 % Feuerrate' },
  { id: 'nine',    icon: '💗', name: 'Dickes Herz',         desc: '+25 max. Leben und volle Heilung' },
  { id: 'milk',    icon: '🥛', name: 'Milchbart',           desc: 'Jede Zerstörung heilt 2 % Leben' },
  { id: 'fur',     icon: '🧥', name: 'Dickes Fell',         desc: '−20 % erlittener Schaden' },
  { id: 'mirror',  icon: '🪞', name: 'Spiegelpfote',        desc: 'Parierte Geschosse treffen 3× so hart' },
  { id: 'yarn',    icon: '🍀', name: 'Glückssträhne',       desc: '+12 % Krit-Chance' },
  { id: 'time',    icon: '⏳', name: 'Katzenzeit',          desc: '+5 s Boss-Countdown' },
  { id: 'paw',     icon: '🐾', name: 'Pfotenwirbel',        desc: 'Pfotenhiebe machen doppelten Schaden' },
  { id: 'nap',     icon: '💤', name: 'Katzenschläfchen',    desc: 'Schild lädt 30 % schneller, hält +1 s' },
  { id: 'night',   icon: '🌙', name: 'Nachtjäger',          desc: 'Unter 40 % Leben: +60 % Schaden' },
  { id: 'purr',    icon: '💞', name: 'Schnurrmotor',        desc: 'Raserei heilt zusätzlich 20 %' },
  { id: 'magnet',  icon: '🧲', name: 'Grätenmagnet',        desc: '+50 % Fischgräten am Ende', max: 1 },
  { id: 'life',    icon: '👼', name: 'Neuntes Leben',       desc: 'Einmal ein K.O. mit 40 % Leben überstehen', max: 1, rare: true },
  { id: 'box',     icon: '📦', name: 'Schrödingers Kiste',  desc: '50 %: +60 % Schaden · 50 %: −15 % Schaden', rare: true },
  { id: 'black',   icon: '🐈‍⬛', name: 'Pakt der schwarzen Katze', desc: '+70 % Schaden, aber Gegner werfen 40 % öfter', pact: true },
  { id: 'glass',   icon: '🔮', name: 'Gläserne Krallen',    desc: '+100 % Schaden, aber −40 max. Leben', pact: true },
  { id: 'bowl',    icon: '🍲', name: 'Fischsuppe',          desc: 'Heilt sofort 60 % Leben', heal: true },
];
const BOON_BY_ID = Object.fromEntries(BOONS.map(b => [b.id, b]));

// Gebiet je Raum bestimmen, ohne den Haupt-Spielstand anzufassen
const _biomeFor = biomeFor;
biomeFor = st => (S.run && S.run.active ? BIOMES[S.run.biome % BIOMES.length] : _biomeFor(st));

const Run = {
  get active() { return !!(S.run && S.run.active); },
  n(id) { return (this.active && S.run.boons[id]) || 0; },
  paused() { return this.active && S.run.choosing; },
  room() { return S.run.depth + 1; },
  guardian() { return this.active && this.room() % GUARDIAN_EVERY === 0; },

  // ---------------------------------------------------------------- Werte (neutral außerhalb des Laufs)
  dmgMul(o, src) {
    if (!this.active) return 1;
    let m = (1 + 0.3 * this.n('claws')) * Math.pow(1.6, this.n('boxWin')) * Math.pow(0.85, this.n('boxLose'));
    m *= (1 + 0.7 * this.n('black')) * (1 + this.n('glass'));
    if (this.n('night') && Vitals.frac() < 0.4) m *= 1 + 0.6 * this.n('night');
    if (src === 'paw') m *= 1 + this.n('paw');
    return m;
  },
  rateMul() { return this.active ? 1 + 0.2 * this.n('coffee') : 1; },
  critAdd() { return this.active ? 0.12 * this.n('yarn') : 0; },
  takenMul() { return this.active ? Math.pow(0.8, this.n('fur')) * (1 + 0.02 * S.run.depth) : 1; },
  atkMul() { return this.active ? Math.pow(0.6, this.n('black')) * (this.guardian() ? 0.8 : 1) : 1; },
  ultPct() { return this.active ? Math.min(0.9, 0.7 + 0.01 * S.run.depth) : 0.65; },
  shieldAdd() { return this.n('nap'); },
  shieldCdMul() { return Math.pow(0.7, this.n('nap')); },
  mirrorMul() { return 1 + 2 * this.n('mirror'); },
  tryRevive() {
    if (!this.active || !S.run.boons.life) return false;
    S.run.boons.life = 0; S.run.boons.lifeUsed = 1;
    return true;
  },
  reward() { return Math.round(S.run.depth * 3 * (1 + 0.5 * this.n('magnet'))); },
  // Münzschatz fürs Hauptspiel (nach Stufe und Münz-Bonus des Hauptspiels)
  coinReward(stage, mult) { return S.run.depth ? Econ.coins(stage) * mult * 60 * S.run.depth : 0; },
  homeCoins() { const h = S.run.stash; return h ? this.coinReward(h.stage, h.coinMult || 1) : 0; },

  // ---------------------------------------------------------------- Ablauf
  init() {
    // Spielstand mitten im Lauf geladen
    if (this.active) {
      document.body.classList.add('in-run');
      recalc(); UI.renderTab();
      if (S.run.choosing) setTimeout(() => this.offerChoice(), 600);
    }
  },

  start() {
    if (this.active || S.best < RUN_UNLOCK) return;
    const B = Battle;
    // Hauptspiel beiseitelegen: der Streifzug beginnt ganz von vorn (Stufe 1, Miau-Pistole I,
    // keine Münzen, kein Training, keine Katzen-/Perk-Boni). Skills und Waffenplätze bleiben.
    S.run.stash = {
      kills: S.kills, farm: S.farm, farmKills: S.farmKills, autoBoss: S.autoBoss, stage: S.stage,
      coins: S.coins, grid: S.grid, slots: S.slots, up: S.up, boxesBought: S.boxesBought, coinMult: R.coinMult,
    };
    Object.assign(S.run, { active: true, depth: 0, hp: 100, maxHp: 100, boons: {}, choosing: false, offer: null, picks: 0, biome: U.randi(0, BIOMES.length - 1) });
    S.run.runs++;
    S.kills = 0; S.farm = false; S.farmKills = 0; S.autoBoss = true; S.stage = 1;
    S.coins = 0; S.grid = Array(GRID_SIZE).fill(null); S.slots = [{ t: 'pistol', r: 1 }, null, null, null];
    S.up = Object.fromEntries(Object.keys(S.up).map(k => [k, 0])); S.boxesBought = 0;
    UI.disp.coins = 0;
    recalc(); Game.emit('weapons');
    this.clearField(B);
    document.body.classList.add('in-run');
    if (typeof Dock !== 'undefined') Dock.close();
    B.whiteFlash = 0.8; FX.ambient = [];
    B.showBanner('STREIFZUG!', `Raum 1 · ${biomeFor(S.stage).name} · Leben heilen nicht von selbst`, '#c7b3ff');
    SFX.play('eventStart');
    UI.updateBossBtn(); UI.renderTab();
    Save.write();
  },

  clearField(B) {
    for (const o of B.obs) o.fleeing = true;
    B.bossState = 'none'; B.bossObj = null; B.bossRequested = false;
    Vitals.reset();
  },

  onBossSpawn(B, o) {
    if (!this.active) return;
    const g = this.guardian(), d = S.run.depth;
    o.shieldAt = d >= 7 ? [0.66, 0.33] : d >= 2 ? [0.5] : [];
    if (g) o.scale *= 1.15;
    B.bossTimeMax = 25 + 5 * this.n('time') + o.shieldAt.length * 4;
    B.bossTimer = B.bossTimeMax;
    B.showBanner(g ? 'WÄCHTER!' : 'BOSS!', `${BOSS_NAMES[o.kind]} · ${B.bossTimeMax} s${g ? ' · 2 Segen als Beute' : ''}`, g ? '#ffd34d' : '#ff4d6d');
  },

  adjustObstacle(o) {
    if (this.active && o.boss && this.guardian()) o.hp = o.maxHp = o.maxHp * 1.6;
    return o;
  },

  onKill(B, o) {
    if (!this.active || o.boss) return;
    if (this.n('milk')) Vitals.heal(B, 0.02 * this.n('milk'), true);
    if (o.treasure) Vitals.heal(B, 0.25);
  },

  bossWin(B, o) {
    B.bossState = 'none'; B.bossObj = null;
    const g = this.guardian();
    S.stats.bossKills++;
    S.run.depth++;
    S.kills = 0;
    S.stage = this.room();
    if (S.run.depth > S.run.best) S.run.best = S.run.depth;
    S.stats.runBest = Math.max(S.stats.runBest || 0, S.run.depth);
    Vitals.heal(B, 0.15);
    for (let i = 0; i < 60; i++) B.particle(B.W / 2 + U.rand(-200, 200), -10, U.rand(-120, 120), U.rand(50, 300), `hsl(${U.randi(0, 360)},90%,65%)`, U.rand(1.5, 2.5), U.rand(4, 8), 200, false, 'confetti');
    SFX.play('victory');
    B.showBanner(`RAUM ${S.run.depth} GESCHAFFT!`, 'Wähle einen Segen', '#6ee7a0');
    S.run.picks = g ? 2 : 1;
    S.run.choosing = true;
    S.run.offer = null;
    Game.emit('stage');
    setTimeout(() => this.offerChoice(), 1100);
  },

  bossEscaped(B) {
    const b = B.bossObj;
    if (b) b.fleeing = true;
    B.bossState = 'none'; B.bossObj = null;
    S.kills = 0;   // Raum wiederholen: nach 10 Gegnern kommt der Boss zurück (Leben heilen nicht!)
    B.showBanner('BOSS ENTKOMMEN!', 'Kein Segen – nach 10 Gegnern kommt er zurück. Rüste auf!', '#ffb347');
    SFX.play('fail');
    Game.emit('stage');
  },

  nextBiome() {
    let n;
    do n = U.randi(0, BIOMES.length - 1); while (n === S.run.biome);
    S.run.biome = n;
    FX.ambient = [];
  },

  // drei verschiedene Karten; Heilung wird wahrscheinlicher, je weniger Leben übrig ist
  rollOffer() {
    const pool = BOONS.filter(b => !(b.max && (S.run.boons[b.id] || 0) + (b.id === 'life' ? S.run.boons.lifeUsed || 0 : 0) >= b.max));
    const weight = b => b.heal ? 0.6 + (1 - Vitals.frac()) * 3 : b.pact ? 0.5 : b.rare ? 0.45 : 1;
    const out = [];
    while (out.length < 3 && pool.length) {
      const pick = U.weightedPick(pool.map(b => ({ b, w: weight(b) }))).b;
      out.push(pick.id);
      pool.splice(pool.indexOf(pick), 1);
    }
    return out;
  },

  offerChoice() {
    if (!this.active || !S.run.choosing) return;
    if (!S.run.offer) S.run.offer = this.rollOffer();
    const r = S.run;
    const cards = r.offer.map(id => {
      const b = BOON_BY_ID[id], have = r.boons[id] || 0;
      return `<button class="boon ${b.pact ? 'pact' : ''} ${b.heal ? 'heal' : ''} ${b.rare ? 'rare' : ''}" data-boon="${id}">
        <span class="bi">${b.icon}</span><b>${b.name}</b><small>${b.desc}</small>${have ? `<em>Stufe ${have + 1}</em>` : b.pact ? '<em>Pakt</em>' : b.rare ? '<em>Selten</em>' : ''}</button>`;
    }).join('');
    UI.modal({
      title: r.picks > 1 ? `✨ Wähle einen Segen (noch ${r.picks})` : '✨ Wähle einen Segen',
      html: `<p class="muted runinfo">Raum ${r.depth} geschafft · ❤️ ${Math.ceil(r.hp)} / ${r.maxHp}</p><div class="boons">${cards}</div>`,
      cls: 'boonmodal', buttons: [], noClose: true,
      onShow: root => { for (const el of $$('[data-boon]', root)) el.addEventListener('click', () => { UI.closeModal(); this.pick(el.dataset.boon); }); },
    });
  },

  pick(id) {
    const r = S.run, b = BOON_BY_ID[id], B = Battle;
    if (!r.choosing || !b) return;
    if (id === 'bowl') Vitals.heal(B, 0.6);
    else if (id === 'box') {
      const win = Math.random() < 0.5;
      r.boons[win ? 'boxWin' : 'boxLose'] = (r.boons[win ? 'boxWin' : 'boxLose'] || 0) + 1;
      r.boons.box = (r.boons.box || 0) + 1;
      UI.toast(win ? '📦 <b>Die Katze lebt!</b><br><small>+60 % Schaden</small>' : '📦 <b>Leere Kiste …</b><br><small>−15 % Schaden</small>', win ? 'good' : 'warn');
      SFX.play(win ? 'reveal' : 'error', 3);
    } else {
      r.boons[id] = (r.boons[id] || 0) + 1;
      if (id === 'nine') { r.maxHp += 25; Vitals.heal(B, 1); }
      if (id === 'glass') { r.maxHp = Math.max(20, r.maxHp - 40); r.hp = Math.min(r.hp, r.maxHp); }
    }
    SFX.play('merge', 3);
    r.picks--;
    r.offer = null;
    if (r.picks > 0) { setTimeout(() => this.offerChoice(), 250); return; }
    r.choosing = false;
    this.nextBiome();
    B.whiteFlash = 0.6;
    B.showBanner(`RAUM ${this.room()}`, `${biomeFor(S.stage).name}${this.guardian() ? ' · Wächter-Raum!' : ''}`, '#c7b3ff');
    if (UI.tab === 'run') UI.renderTab();
    Save.write();
  },

  die(B) {
    const r = S.run, depth = r.depth, record = depth > 0 && depth >= r.best;
    const bones = this.reward();
    S.bones += bones;
    this.end(B);
    const coins = this.coinReward(S.stage, R.coinMult);
    if (coins) Game.addCoins(coins);
    UI.modal({
      title: record ? '🏆 Streifzug beendet – Rekord!' : '💫 Streifzug beendet',
      html: `<p>Deine Katze ist in <b>Raum ${depth + 1}</b> k.o. gegangen.</p>
        <p class="big">+${bones} 🦴${coins ? ` · +${U.fmt(coins)} 💰` : ''}</p>
        <p class="muted">Geschaffte Räume: ${depth} · Rekord: ${r.best}</p>`,
      buttons: [{ label: 'Zurück nach Hause', cls: 'primary', action: () => { if (bones) Battle.spawnFlyers(Battle.W / 2, Battle.H / 2, Math.min(12, bones), 'bone'); } }],
    });
  },

  abandon() {
    if (!this.active) return;
    UI.modal({
      title: '🏳️ Streifzug beenden?',
      html: `<p>Du nimmst <b>${this.reward()} 🦴</b> und <b>${U.fmt(this.homeCoins())} 💰</b> für ${S.run.depth} geschaffte Räume mit. Waffen und Münzen aus dem Streifzug verfallen.</p>`,
      buttons: [{ label: 'Weiterkämpfen' }, { label: 'Beenden', cls: 'danger', action: () => this.die(Battle) }],
    });
  },

  end(B) {
    const st = S.run.stash || {};
    S.kills = st.kills || 0; S.farm = !!st.farm; S.farmKills = st.farmKills || 0; S.autoBoss = st.autoBoss !== false;
    if (st.grid) {
      S.stage = st.stage; S.coins = st.coins; S.grid = st.grid; S.slots = st.slots; S.up = st.up; S.boxesBought = st.boxesBought;
      UI.disp.coins = S.coins;
    }
    Object.assign(S.run, { active: false, choosing: false, offer: null, stash: null });
    recalc(); Game.emit('weapons');
    this.clearField(B);
    Vitals.idle.hp = Vitals.idle.maxHp;
    document.body.classList.remove('in-run');
    B.whiteFlash = 0.6; FX.ambient = [];
    UI.updateBossBtn(); UI.renderTab();
    Game.emit('stage');
    Save.write();
  },

  label(biome) { return `Streifzug · Raum ${this.room()} · ${biome.name}`; },

  // ---------------------------------------------------------------- Pause beim Verwalten
  htmlDrag: false, panelHover: false,
  // Spieler ist mit dem Menü beschäftigt (Schublade/Fenster offen, Waffe wird gezogen,
  // am PC: Maus über der Seitenleiste)
  busy() {
    const b = document.body.classList;
    return !!(UI.modalOpen || b.contains('sheet-open') || this.htmlDrag || (TouchDrag.drag && TouchDrag.drag.active)
      || (this.panelHover && !(typeof Dock !== 'undefined' && Dock.active())) || document.getElementById('feedback'));
  },
  frozen() { return this.active && this.busy(); },
  drawPause(ctx, B) {
    if (!this.frozen() || UI.modalOpen) return;
    const W = B.Wp || B.W, H = B.H;
    ctx.save();
    ctx.fillStyle = 'rgba(12,8,28,0.35)'; ctx.fillRect(0, 0, B.W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.min(30, W / 14)}px "Segoe UI", "Segoe UI Emoji", sans-serif`;
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(20,10,30,0.9)';
    const y = Math.max(H * 0.4, 200);
    ctx.strokeText('❚❚ PAUSE', W / 2, y); ctx.fillStyle = '#c7b3ff'; ctx.fillText('❚❚ PAUSE', W / 2, y);
    ctx.font = `700 ${Math.min(13, W / 30)}px "Segoe UI", sans-serif`; ctx.lineWidth = 4;
    const sub = 'Streifzug ruht, solange das Menü offen ist';
    ctx.strokeText(sub, W / 2, y + 26); ctx.fillStyle = '#fff'; ctx.fillText(sub, W / 2, y + 26);
    ctx.restore();
  },
};

document.addEventListener('dragstart', () => { Run.htmlDrag = true; }, true);
for (const ev of ['dragend', 'drop']) document.addEventListener(ev, () => { Run.htmlDrag = false; }, true);
window.addEventListener('load', () => {
  const p = document.getElementById('panel');
  p.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') Run.panelHover = true; });
  p.addEventListener('pointerleave', () => { Run.panelHover = false; });
});

// ---------------------------------------------------------------------------
// Reiter „Streifzug“
// ---------------------------------------------------------------------------
TABS.splice(4, 0, { id: 'run', icon: '🗺️', name: 'Streifzug' });

UI.tab_run = function () {
  const r = S.run;
  if (S.best < RUN_UNLOCK) {
    return `<div class="sec runbox"><h3>🗺️ Streifzug <small>Roguelike-Abenteuer</small></h3>
      <p>Erreiche <b>Stufe ${RUN_UNLOCK}</b>, um auf Streifzug zu gehen.</p></div>`;
  }
  if (!r.active) {
    return `<div class="sec runbox">
        <h3>🗺️ Streifzug <small>Roguelike-Abenteuer</small></h3>
        <ul class="runrules">
          <li>🐣 Du startest <b>ganz von vorn</b>: Stufe 1, nur die Miau-Pistole I, keine Münzen, kein Training, keine Katzen-Boni. Unterwegs verdienst du eigene Münzen für Kisten und Training.</li>
          <li>🚪 Jeder Raum: neues Gebiet, 10 Gegner und ein <b>Boss</b>. Jeder 20. Raum ist ein <b>Wächter</b> (stärker, dafür 2 Segen). Entkommt ein Boss, musst du den Raum wiederholen.</li>
          <li>⏸️ Solange ein Menü offen ist, ist der Streifzug <b>pausiert</b> – in Ruhe verschmelzen und kaufen.</li>
          <li>❤️ Leben heilen sich <b>nicht</b> von selbst – nur Segen, Raserei, Fischregen und Schatztruhen helfen.</li>
          <li>🎯 Tippe auf heranfliegende Geschosse, um sie <b>zurückzuschleudern</b>. 🛡️ Schild blockt alles.</li>
          <li>✨ Nach jedem Boss: <b>1 von 3 Segen</b> – oder ein riskanter <b>Pakt</b>.</li>
          <li>💫 K.O. = Streifzug vorbei. Beute je geschafftem Raum: <b>3 🦴</b> und ein Münzschatz fürs Hauptspiel, das so lange unverändert wartet.</li>
        </ul>
        <div class="rbstats">
          <div><span>Rekord</span><b>Raum ${r.best}</b></div>
          <div><span>Streifzüge</span><b>${r.runs}</b></div>
          <div><span>Start</span><b>Stufe 1 · 🔫 I</b></div>
        </div>
        <button class="btn primary wide" id="runStart">🗺️ Streifzug starten</button>
      </div>`;
  }
  const boons = Object.entries(r.boons).filter(([id, n]) => n > 0 && BOON_BY_ID[id]);
  return `<div class="sec runbox">
      <h3>🗺️ Streifzug läuft <small>Raum ${r.depth + 1}${Run.guardian() ? ' · Wächter' : ''}</small></h3>
      <div class="rbstats">
        <div><span>Leben</span><b>❤️ ${Math.ceil(r.hp)} / ${r.maxHp}</b></div>
        <div><span>Geschafft</span><b>${r.depth} Räume</b></div>
        <div><span>Beute bisher</span><b>${Run.reward()} 🦴 · ${U.fmt(Run.homeCoins())} 💰</b></div>
      </div>
    </div>
    <div class="sec"><h3>Deine Segen <small>${boons.length ? '' : 'noch keine'}</small></h3>
      <div class="list">${boons.map(([id, n]) => { const b = BOON_BY_ID[id]; return `<div class="card ${b.pact ? 'pactcard' : ''}"><div class="ci">${b.icon}</div><div class="cb"><div class="cn">${b.name}${n > 1 ? ` <small>×${n}</small>` : ''}</div><div class="cd">${b.desc}</div></div></div>`; }).join('')}</div>
    </div>
    <button class="btn wide" id="runQuit">🏳️ Streifzug beenden & Beute mitnehmen</button>`;
};
UI.after_run = function () {
  const s = $('#runStart'); if (s) s.addEventListener('click', () => { SFX.init(); Run.start(); });
  const q = $('#runQuit'); if (q) q.addEventListener('click', () => Run.abandon());
};

window.addEventListener('load', () => Run.init());
