'use strict';
// ---------------------------------------------------------------------------
// Oberfläche: HUD, Reiter, Drag & Drop, Kisten-Animation, Modals, Toasts
// ---------------------------------------------------------------------------

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const TABS = [
  { id: 'weapons',  icon: '⚔️', name: 'Waffen' },
  { id: 'upgrades', icon: '⬆️', name: 'Training' },
  { id: 'cats',     icon: '🐱', name: 'Katzen' },
  { id: 'pets',     icon: '🐾', name: 'Begleiter' },
  { id: 'quests',   icon: '📜', name: 'Aufgaben' },
  { id: 'rebirth',  icon: '🌿', name: 'Wiedergeburt' },
  { id: 'ach',      icon: '🏆', name: 'Erfolge' },
  { id: 'options',  icon: '⚙️', name: 'Optionen' },
];

const UI = {
  tab: 'weapons',
  disp: { coins: 0, bones: 0, minze: 0 },
  refreshT: 0,
  modalQueue: [], modalOpen: false,

  init() {
    this.disp = { coins: S.coins, bones: S.bones, minze: S.minze };
    $('#tabs').innerHTML = TABS.map(t => `<button class="tab" data-tab="${t.id}" title="${t.name}"><span class="ti">${t.icon}</span><span class="tn">${t.name}</span><i class="dot"></i></button>`).join('');
    $('#tabs').addEventListener('click', e => {
      const b = e.target.closest('.tab'); if (!b) return;
      SFX.init(); SFX.play('paw');
      this.tab = b.dataset.tab; this.renderTab();
      const tc = $('#tabContent'); tc.classList.remove('switch'); void tc.offsetWidth; tc.classList.add('switch');
    });
    Game.listeners.push((ev, d) => this.on(ev, d));
    document.addEventListener('keydown', e => this.onKey(e));
    $('#bossBtn').addEventListener('click', () => { SFX.init(); Battle.challengeBoss(); });
    $('#autoBossBtn').addEventListener('click', () => {
      SFX.init(); SFX.play('paw');
      S.autoBoss = !S.autoBoss;
      // AN im Farm-Modus: Boss kommt sofort wieder
      if (S.autoBoss && S.farm) { S.farm = false; S.kills = KILLS_PER_STAGE; }
      this.updateBossBtn();
      this.toast(S.autoBoss
        ? '🔁 <b>Auto-Boss AN</b><br><small>Nach 10 Zerstörungen kommt automatisch der Boss – auch nach einer Niederlage.</small>'
        : '⏸️ <b>Auto-Boss AUS</b><br><small>Nach 10 Zerstörungen bleibst du auf dieser Stufe und farmst. Den Boss startest du mit „Boss herausfordern“.</small>', S.autoBoss ? 'good' : 'warn');
    });
    $('#musicBtn').addEventListener('click', () => { SFX.init(); this.toggleMusic(); });
    $('#pauseBtn').addEventListener('click', () => { SFX.init(); this.pause(); });
    this.updateMusicBtn();
    document.addEventListener('pointerdown', () => SFX.init(), { once: true });
    this.prevSets = activeSetKey();
    this.renderSkills();
    this.renderTab();
    this.updateBossBtn();
    this.updateFlyTargets();
  },

  on(ev, d) {
    switch (ev) {
      case 'weapons': {
        if (this.tab === 'weapons') this.renderTab();
        const k = activeSetKey();
        if (this.prevSets !== undefined && k !== this.prevSets) {
          WEAPON_IDS.forEach((t, i) => {
            const now = +k[i], before = +this.prevSets[i];
            if (now > before) {
              const s = WEAPON_SETS[t][now - 1];
              this.toast(`🔗 <b>Set-Bonus: ${WEAPONS[t].icon} ${WEAPONS[t].name} ×${s.n}</b><br><small>${s.desc}</small>`, 'ach');
              SFX.play('shield');
            }
          });
        }
        this.prevSets = k;
        break;
      }
      case 'levelUp': Talents.levelUp(Battle, d); this.pop('lvl'); if (d.chest) this.toast('🎁 <b>Level ' + d.level + '!</b><br><small>Eine Gratis-Glückskiste ist bereit</small>', 'ach'); break;
      case 'upgrades': case 'cats': case 'pets': case 'rebirth': case 'quests':
        if (this.tab === ev) this.renderTab(); break;
      case 'toast': this.toast(d.text, d.cls); break;
      case 'gain': this.gain(d); break;
      case 'discover': this.toast(`<span class="tc" style="color:${tierColor(d.r)}">${WEAPONS[d.t].icon} ${WEAPONS[d.t].name} ${U.roman(d.r)}</span><br><small>Neu im Waffenkodex!</small>`, 'good'); break;
      case 'merged': requestAnimationFrame(() => {
        const el = $(`.cell[data-k="${d.dst.k}"][data-i="${d.dst.i}"]`);
        if (el) { el.classList.add('merged'); this.burstAt(el, tierColor(d.w.r)); }
      }); break;
      case 'newItem': requestAnimationFrame(() => { const el = $(`.cell[data-k="g"][data-i="${d}"]`); if (el) el.classList.add('fresh'); }); break;
      case 'stage': this.updateBossBtn(); this.checkSkillLocks(); break;
      case 'stageUp': this.onStageUp(d); break;
      case 'skill': this.refreshSkills(); break;
      case 'rebirthDone':
        Battle.obs = []; Battle.bossState = 'none'; Battle.bossObj = null;
        this.disp.coins = 0;
        this.renderTab(); this.renderSkills(); this.updateBossBtn();
        this.modal({ title: '🌿 Wiedergeboren!', html: `<p class="big">+${U.fmt(d)} 🌿 Katzenminze</p><p>Deine Katze startet stärker in ein neues Leben. Investiere die Minze in dauerhafte Perks!</p>`, buttons: [{ label: 'Zu den Perks', cls: 'primary', action: () => { this.tab = 'rebirth'; this.renderTab(); } }] });
        break;
    }
  },

  onStageUp() {
    for (const sk of SKILLS) if (S.best === sk.unlock) { this.toast(`${sk.icon} <b>Neuer Skill: ${sk.name}</b><br><small>Taste ${sk.key} · ${sk.desc}</small>`, 'ach'); SFX.play('achievement'); }
    SLOT_UNLOCK.forEach((st, i) => { if (st > 0 && S.best === st) { this.toast(`🔓 <b>Waffenplatz ${i + 1} freigeschaltet!</b>`, 'ach'); SFX.play('achievement'); } });
    if (S.maxStage === 25 && S.rebirths === 0) this.toast('🌿 <b>Wiedergeburt verfügbar!</b><br><small>Siehe Reiter „Wiedergeburt“</small>', 'ach');
    this.renderSkills();
    if (this.tab === 'weapons' || this.tab === 'rebirth') this.renderTab();
  },

  onKey(e) {
    if (e.target.matches('input, textarea')) return;
    if (this.modalOpen && e.key !== 'Escape') return;
    SFX.init();
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) Battle.paw(); }
    else if (e.key === '1') Battle.useSkill('laser');
    else if (e.key === '2') Battle.useSkill('rain');
    else if (e.key === '3') Battle.useSkill('roar');
    else if (e.key === '4') Battle.useSkill('shield');
    else if (e.key === 'b' || e.key === 'B') Game.buyBox(1);
    else if (e.key === 'm' || e.key === 'M') Game.autoMerge();
    else if (e.key === 'n' || e.key === 'N') this.toggleMusic();
    else if ((e.key === 'p' || e.key === 'P') && !this.modalOpen) this.pause();
    else if ((e.key === 'i' || e.key === 'I') && Run.active && !this.modalOpen) Run.showOverview();
    else if ((e.key === 'h' || e.key === 'H' || e.key === '?') && !this.modalOpen) this.showKeys();
    else if (e.key === 'Escape' && this.modalOpen) {
      // Pflicht-Fenster (Segen wählen, Glückskiste) bleiben offen; die Pause geht mit Esc weiter
      const o = this.modalOpts || {};
      if (o.onEscape) { this.closeModal(); o.onEscape(); }
      else if (!o.noClose) this.closeModal();
    }
  },

  // Übersicht aller Tastenkürzel (Taste H oder ?)
  showKeys() {
    SFX.play('paw');
    const keys = [
      ['Leertaste', 'Pfotenhieb aufs vorderste Hindernis'], ['1 2 3 4', 'Laser-Blick · Fischregen · Fauchen · Schild'],
      ['B', 'Waffenkiste kaufen'], ['M', 'Auto-Merge'], ['N', 'Musik an/aus'], ['P', 'Pause-Menü'],
      ['I', 'Segen-Übersicht (Streifzug)'], ['H ?', 'Diese Hilfe'], ['F8', 'Fehler melden'], ['Esc', 'Fenster schließen'],
    ];
    this.modal({
      title: '⌨️ Tastenkürzel', cls: 'keysmodal',
      html: `<div class="keylist">${keys.map(([k, d]) => `<div><span>${k.split(' ').map(x => `<kbd>${x}</kbd>`).join(' ')}</span><small>${d}</small></div>`).join('')}</div>
        <p class="hint">Maus: Hindernis anklicken = Pfotenhieb · Geschoss anklicken = Parade · Waffe ziehen = verschmelzen/ausrüsten · Doppelklick = an-/ablegen</p>`,
    });
  },

  // ---------------------------------------------------------------- Pause
  // Hält das ganze Spiel an (Gegner, Boss-Countdown, Ereignisse, Abklingzeiten)
  paused: false,
  pause() {
    if (this.paused) return;
    if (this.modalOpen) this.closeModal();
    this.paused = true;
    document.body.classList.add('paused');
    SFX.play('paw');
    const biome = biomeFor(S.stage), r = Vitals.ref();
    const where = Run.active ? `Streifzug · Raum ${Run.room()}` : `Stufe ${S.stage}`;
    const resume = () => { this.paused = false; document.body.classList.remove('paused'); Main.last = performance.now(); };
    this.modal({
      title: '⏸️ Pause', cls: 'pausemodal', noClose: true,
      html: `<p class="muted">${where} · ${biome.name} · ❤️ ${Math.ceil(r.hp)} / ${r.maxHp}</p>
        <div class="pausegrid">
          <button class="btn" data-p="music">${S.music ? '🎵 Musik an' : '🔇 Musik aus'}</button>
          <button class="btn" data-p="sound">${S.sound ? '🔊 Töne an' : '🔈 Töne aus'}</button>
          <button class="btn" data-p="options">⚙️ Optionen</button>
          ${Run.active ? '<button class="btn danger" data-p="quit">🏳️ Streifzug beenden</button>' : ''}
        </div>`,
      buttons: [{ label: '▶️ Weiter', cls: 'primary', action: resume }], onEscape: resume,
      onShow: root => {
        for (const b of $$('[data-p]', root)) b.addEventListener('click', () => {
          const k = b.dataset.p;
          if (k === 'music') { this.toggleMusic(); b.textContent = S.music ? '🎵 Musik an' : '🔇 Musik aus'; }
          if (k === 'sound') { S.sound = SFX.on = !S.sound; b.textContent = S.sound ? '🔊 Töne an' : '🔈 Töne aus'; if (this.tab === 'options') this.renderTab(); }
          if (k === 'options') { this.closeModal(); resume(); this.tab = 'options'; this.renderTab(); if (typeof Dock !== 'undefined' && Dock.active()) Dock.open(); }
          if (k === 'quit') { this.closeModal(); resume(); Run.abandon(); }
        });
      },
    });
  },

  toggleMusic() {
    S.music = Music.on = !S.music;
    Music.apply();
    this.updateMusicBtn();
    if (this.tab === 'options') this.renderTab();
  },
  updateMusicBtn() { const b = $('#musicBtn'); if (b) { b.textContent = S.music ? '🎵' : '🔇'; b.classList.toggle('off', !S.music); } },

  // ---------------------------------------------------------------- HUD
  updateFlyTargets() {
    const cv = $('#game'); if (!cv) return;
    const cr = cv.getBoundingClientRect();
    for (const [kind, sel] of [['coin', '#hudCoins .hi'], ['bone', '#hudBones .hi']]) {
      const el = $(sel); if (!el) continue;
      const r = el.getBoundingClientRect();
      Battle.targets[kind] = { x: r.left + r.width / 2 - cr.left, y: r.top + r.height / 2 - cr.top };
    }
  },

  gainSum: 0, gainTimer: null,
  gain(n) {
    if (!(n > 0)) return;
    const el = $('#gainCoins'); if (!el) return;
    this.gainSum += n;
    el.textContent = '+' + U.fmt(this.gainSum);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.gainTimer);
    this.gainTimer = setTimeout(() => { this.gainSum = 0; }, 900);
  },

  pop(kind) {
    const el = $(kind === 'coin' ? '#hudCoins' : kind === 'lvl' ? '#hudLvl' : '#hudBones');
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  },

  tick(dt) {
    for (const k of ['coins', 'bones', 'minze']) {
      const target = S[k], cur = this.disp[k];
      this.disp[k] = Math.abs(target - cur) < 0.5 ? target : cur + (target - cur) * Math.min(1, dt * 7);
    }
    // nur bei Änderung ins DOM schreiben – sonst zeichnet Safari die Leiste jedes Bild neu
    this.setText('#vCoins', U.fmt(this.disp.coins));
    this.setText('#vBones', U.fmt(this.disp.bones));
    this.setText('#vMinze', U.fmt(this.disp.minze));
    this.refreshT -= dt;
    if (this.refreshT <= 0) { this.refreshT = 0.2; this.refresh(); }
  },

  refresh() {
    $('#vDps').textContent = U.fmt(R.dps * (Battle.frenzy > 0 ? 3 : 1));
    $('#vBest').textContent = S.best;
    $('#vLvl').textContent = S.level;
    $('#vXp').style.width = `${Math.min(100, S.xp / Level.need(S.level) * 100)}%`;
    $('#hudLvl').title = `Katzen-Level ${S.level} · ${Math.floor(S.xp)} / ${Level.need(S.level)} XP\nJedes Level: +1 % Schaden und Münzen, Fischgräten; alle 10 Level eine Gratis-Kiste`;
    $('#hudMinze').style.display = S.minzeTotal > 0 ? '' : 'none';
    for (const el of $$('[data-cost]')) {
      const cur = el.dataset.cur || 'coins';
      el.classList.toggle('cant', S[cur] < +el.dataset.cost);
    }
    this.refreshSkills();
    this.refreshTab();
    // Hinweis-Punkte an Reitern
    const freeReady = Date.now() >= S.freeChestAt;
    this.dot('cats', freeReady || S.bones >= CHEST_COST);
    this.dot('rebirth', Econ.rebirthGain() > 0 || PERKS.some(p => (p.max === undefined || S.perks[p.id] < p.max) && S.minze >= Econ.perkCost(p, S.perks[p.id])));
    this.dot('pets', PETS.some(p => S.bones >= Econ.petCost(p, S.pets[p.id])));
    this.dot('quests', Quests.claimable());
    this.dot('weapons', S.grid.indexOf(null) >= 0 && S.coins >= Econ.boxCost());
  },

  textCache: {},
  setText(sel, v) { if (this.textCache[sel] === v) return; this.textCache[sel] = v; $(sel).textContent = v; },

  dot(tab, on) { const el = $(`.tab[data-tab="${tab}"] .dot`); if (el) el.classList.toggle('on', on); },

  updateBossBtn() {
    const wrap = $('#bossWrap');
    wrap.classList.toggle('farm', S.farm);
    wrap.classList.toggle('manual', S.farm && !S.autoBoss);
    // Kapsel: links der Boss-Knopf (nur im Farm-Modus), rechts der Auto-Boss-Schalter
    const ab = `<span class="ab-t">Auto-Boss</span><i class="ab-sw"><i></i></i><b>${S.autoBoss ? 'AN' : 'AUS'}</b>`;
    if ($('#autoBossBtn').dataset.v !== String(S.autoBoss)) { $('#autoBossBtn').dataset.v = String(S.autoBoss); $('#autoBossBtn').innerHTML = ab; }
    $('#autoBossBtn').classList.toggle('off', !S.autoBoss);
    $('#bossBtn').innerHTML = S.farm && S.autoBoss
      ? `<span class="bb-i">👑</span><span class="bb-t">Boss jetzt<small>auto in ${Math.max(0, KILLS_PER_STAGE - S.farmKills)}</small></span>`
      : '<span class="bb-i">👑</span><span class="bb-t">Boss herausfordern</span>';
  },

  // Im Streifzug schalten Skills mit dem erreichten Raum frei (Hauptspiel: über onStageUp)
  checkSkillLocks() {
    const sig = SKILLS.map(sk => skillOpen(sk) ? 1 : 0).join('');
    if (this._skillSig && sig !== this._skillSig) {
      SKILLS.forEach((sk, i) => {
        if (sig[i] === '1' && this._skillSig[i] === '0') { this.toast(`${sk.icon} <b>${sk.name} bereit!</b><br><small>Taste ${sk.key} · ${sk.desc}</small>`, 'ach'); SFX.play('achievement'); }
      });
      this.renderSkills();
    }
    this._skillSig = sig;
  },

  renderSkills() {
    this._skillSig = SKILLS.map(sk => skillOpen(sk) ? 1 : 0).join('');
    $('#skills').innerHTML = SKILLS.map(sk => {
      const locked = !skillOpen(sk);
      return `<button class="skill ${locked ? 'locked' : ''}" data-skill="${sk.id}" title="${sk.name} (Taste ${sk.key}): ${sk.desc}">
        <span class="si">${locked ? '🔒' : sk.icon}</span><span class="sk">${locked ? 'St. ' + sk.unlock : sk.key}</span><i class="cd"></i></button>`;
    }).join('') + `<div class="skill talent"><span class="si"></span><span class="sk">Talent</span><i class="cd"></i></div>`;
    $$('#skills .skill[data-skill]').forEach(b => b.addEventListener('click', () => { SFX.init(); Battle.useSkill(b.dataset.skill); }));
  },

  refreshSkills() {
    const tb = $('#skills .talent');
    if (tb) {
      const d = Talents.def();
      tb.querySelector('.si').textContent = d.icon;
      tb.title = `Katzen-Talent – ${d.name}: ${d.desc}`;
      tb.style.setProperty('--p', `${U.clamp(Talents.cd / d.cd, 0, 1) * 360}deg`);
      tb.classList.toggle('fired', Talents.cd > d.cd - 0.4);
      const tf = Shades.isFrozen('talent');
      tb.classList.toggle('frozen', tf);
      tb.dataset.fz = tf ? Math.ceil(Shades.frozen.talent) : '';
    }
    // rot = Fähigkeit läuft (Restdauer), blau = kühlt ab, Eis = von einem Schatten eingefroren
    for (const b of $$('#skills .skill[data-skill]')) {
      const sk = SKILLS.find(s => s.id === b.dataset.skill);
      const cd = S.skillsCd[sk.id], left = Battle.skillLeft(sk.id), fz = Shades.skillFrozen(sk.id);
      const run = left > 0, cool = !run && cd > 0;
      const full = Math.max(cd, Battle.cdMax[sk.id] || sk.cd);
      b.style.setProperty('--p', `${(run ? left / Math.max(0.1, Battle.skillDur(sk.id)) : cool ? cd / full : 0) * 360}deg`);
      b.classList.toggle('running', run);
      b.classList.toggle('cooling', cool);
      b.classList.toggle('frozen', fz);
      b.dataset.fz = fz ? Math.ceil(Shades.frozen['skill:' + sk.id]) : '';
      b.classList.toggle('ready', !run && cd <= 0 && skillOpen(sk) && !fz && !(Vitals.koPending && Vitals.dazed > 0));
      b.classList.toggle('dazed', Vitals.koPending && Vitals.dazed > 0);
      b.querySelector('.cd').textContent = run ? (left < 10 ? left.toFixed(1) : Math.ceil(left)) : cool ? Math.ceil(cd) : '';
    }
  },

  // ---------------------------------------------------------------- Reiter
  renderTab() {
    $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === this.tab));
    const el = $('#tabContent');
    const fn = this['tab_' + this.tab];
    el.innerHTML = fn.call(this);
    const after = this['after_' + this.tab];
    if (after) after.call(this, el);
    this.refresh();
  },

  refreshTab() {
    const fn = this['refresh_' + this.tab];
    if (fn) fn.call(this);
  },

  // ---- Waffen
  cellHtml(w, k, i, locked) {
    if (locked) return `<div class="cell locked" data-k="${k}" data-i="${i}"><span class="lk">🔒<br><small>Stufe ${SLOT_UNLOCK[i]}</small></span></div>`;
    if (!w) return `<div class="cell empty" data-k="${k}" data-i="${i}"></div>`;
    const d = WEAPONS[w.t];
    const rainbow = TIERS[w.r - 1].color === 'rainbow';
    const dps = Econ.weaponDps(w) * R.dmgMult * R.rateMult;
    const fz = Game.frozenAt({ k, i });
    return `<div class="cell item ${rainbow ? 'rainbow' : ''} ${w.r >= 5 ? 'shiny' : ''} ${fz ? 'frozen' : ''}" draggable="${!fz}" data-k="${k}" data-i="${i}" data-fz="${fz ? Math.ceil(Shades.frozen['slot:' + i]) : ''}" style="--tc:${rainbow ? '#fff' : tierColor(w.r)}"
      title="${d.name} ${U.roman(w.r)} – ${TIERS[w.r - 1].name}\n${d.desc}\nDPS: ${U.fmt(dps)}\n(Doppelklick: an-/ablegen)">
      <span class="wi">${d.icon}</span><span class="tier">${U.roman(w.r)}</span></div>`;
  },

  tab_weapons() {
    const slots = S.slots.map((w, i) => this.cellHtml(w, 's', i, !Game.slotUnlocked(i))).join('');
    const grid = S.grid.map((w, i) => this.cellHtml(w, 'g', i)).join('');
    Game.fillCodex();
    const codexCount = Object.keys(S.codex).length;
    return `
      <div class="sec"><h3>Ausgerüstet <small>Gesamt-DPS <b id="wDps">${U.fmt(R.dps)}</b></small></h3>
        <div class="slots">${slots}</div></div>
      <div class="sec"><h3>Rucksack <small>Gleiche Waffen aufeinander ziehen = verschmelzen</small></h3>
        <div class="grid">${grid}</div>
        <div class="btnrow">
          <button class="btn primary" id="buyBox" data-cost="0"><span>📦 Kiste</span><b id="boxCost"></b></button>
          <button class="btn" id="buyBox5" data-cost="0"><span>📦×5</span></button>
          <button class="btn" id="autoMerge"><span>✨ Merge</span></button>
          <button class="btn" id="equipBest"><span>⭐ Beste</span></button>
        </div>
        <div class="btnrow">
          <div class="trash" id="trash" title="Waffe hierher ziehen, um sie für Münzen zu verwerten">♻️ Hierher ziehen = verwerten</div>
          <button class="btn" id="cleanup" title="Verwertet alle Rucksack-Waffen unter der aktuellen Kistenstufe"><span>🧹 Aufräumen</span></button>
        </div>
        <p class="hint">Tasten: <kbd>B</kbd> Kiste · <kbd>M</kbd> Auto-Merge · Doppelklick zum An-/Ablegen</p>
      </div>
      <div class="sec"><h3>Waffen-Sets <small>2 bzw. 4 gleiche Waffentypen ausrüsten</small></h3>
        <div class="sets">${WEAPON_IDS.map(t => {
          const b = setBonus(t);
          return `<div class="setrow ${b.level ? 'on' : ''}"><span class="sic">${WEAPONS[t].icon}</span><b class="scount">${b.n}/4</b>
            ${WEAPON_SETS[t].map((s, i) => `<span class="sb ${b.level > i ? 'on' : ''}">${s.n}× ${s.desc}</span>`).join('')}</div>`;
        }).join('')}</div>
      </div>
      <div class="sec"><h3>Waffenkodex <small>${codexCount} / ${WEAPON_IDS.length * MAX_TIER} entdeckt</small></h3>
        <div class="codex">${WEAPON_IDS.map(id => `<div class="crow"><span>${WEAPONS[id].icon}</span>${Array.from({ length: MAX_TIER }, (_, r) => {
          const has = S.codex[`${id}:${r + 1}`];
          return `<i class="${has ? 'has' : ''}" style="--tc:${TIERS[r].color === 'rainbow' ? '#fff' : TIERS[r].color}" title="${WEAPONS[id].name} ${U.roman(r + 1)}${has ? '' : ' – ???'}"></i>`;
        }).join('')}</div>`).join('')}</div>
      </div>`;
  },

  after_weapons(el) {
    $('#buyBox').addEventListener('click', () => Game.buyBox(1));
    $('#buyBox5').addEventListener('click', () => Game.buyBox(5));
    $('#autoMerge').addEventListener('click', () => Game.autoMerge());
    $('#equipBest').addEventListener('click', () => Game.equipBest());
    $('#cleanup').addEventListener('click', () => Game.cleanup());
    const trash = $('#trash');
    trash.addEventListener('dragover', e => { e.preventDefault(); trash.classList.add('over'); });
    trash.addEventListener('dragleave', () => trash.classList.remove('over'));
    trash.addEventListener('drop', e => {
      e.preventDefault();
      const [k, i] = e.dataTransfer.getData('text/plain').split(':');
      if (k) Game.scrap({ k, i: +i });
    });
    for (const c of $$('.cell', el)) {
      const pos = { k: c.dataset.k, i: +c.dataset.i };
      c.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', `${pos.k}:${pos.i}`); e.dataTransfer.effectAllowed = 'move';
        const w = Game.getAt(pos);
        c.classList.add('dragging');
        for (const o of $$('.cell.item', el)) {
          const ow = Game.getAt({ k: o.dataset.k, i: +o.dataset.i });
          if (o !== c && ow && ow.t === w.t && ow.r === w.r && w.r < MAX_TIER) o.classList.add('mergeable');
        }
      });
      c.addEventListener('dragend', () => { $$('.cell', el).forEach(x => x.classList.remove('mergeable', 'over', 'dragging')); });
      c.addEventListener('dragover', e => { e.preventDefault(); c.classList.add('over'); });
      c.addEventListener('dragleave', () => c.classList.remove('over'));
      c.addEventListener('drop', e => {
        e.preventDefault();
        const [k, i] = e.dataTransfer.getData('text/plain').split(':');
        if (k) Game.move({ k, i: +i }, pos);
      });
      c.addEventListener('dblclick', () => Game.quickEquip(pos));
    }
  },

  refresh_weapons() {
    const cost = Econ.boxCost();
    const b = $('#buyBox'); if (!b) return;
    b.dataset.cost = cost;
    $('#boxCost').textContent = '💰 ' + U.fmt(cost);
    let c5 = 0; for (let i = 0; i < 5; i++) c5 += 10 * Math.pow(2, S.up.box) * Math.pow(1.1, S.boxesBought + i);
    $('#buyBox5').dataset.cost = c5;
    const full = S.grid.indexOf(null) < 0;
    b.classList.toggle('full', full);
    // eingefrorene Waffenplätze: Eis, Restzeit, nicht ziehbar
    for (const c of $$('.slots .cell.item')) {
      const i = +c.dataset.i, fz = Game.frozenAt({ k: 's', i });
      c.classList.toggle('frozen', fz);
      c.draggable = !fz;
      c.dataset.fz = fz ? Math.ceil(Shades.frozen['slot:' + i]) : '';
    }
    $('#wDps').textContent = U.fmt(R.dps);
  },

  // ---- Training (Münz-Upgrades)
  tab_upgrades() {
    const amts = [1, 10, 'max'];
    return `
      <div class="sec"><h3 class="stickyhead">Training <span class="seg">${amts.map(a => `<button class="segb ${S.buyAmount === a ? 'on' : ''}" data-amt="${a}">${a === 'max' ? 'Max' : '×' + a}</button>`).join('')}</span></h3>
      <div class="list">${UPGRADES.map(u => `
        <div class="card" data-up="${u.id}">
          <div class="ci">${u.icon}</div>
          <div class="cb"><div class="cn">${u.name} <small class="lvl"></small></div><div class="cd desc"></div></div>
          <button class="btn buy" data-cost="0"><span class="n"></span><b class="c"></b></button>
        </div>`).join('')}</div></div>
      <div class="sec stats-mini">
        <div><span>Schaden</span><b>×${R.dmgMult.toFixed(2)}</b></div>
        <div><span>Feuerrate</span><b>×${R.rateMult.toFixed(2)}</b></div>
        <div><span>Münzen</span><b>×${R.coinMult.toFixed(2)}</b></div>
        <div><span>Krit</span><b>${Math.round(R.crit * 100)}% · ×${R.critDmg.toFixed(2)}</b></div>
        <div><span>Pfotenhieb</span><b>${U.fmt(R.clickDmg)}</b></div>
        <div><span>Boss-Schaden</span><b>×${R.bossMult.toFixed(2)}</b></div>
      </div>`;
  },
  after_upgrades(el) {
    $$('.segb', el).forEach(b => b.addEventListener('click', () => { S.buyAmount = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt; SFX.play('paw'); this.renderTab(); }));
    $$('.card[data-up] .buy', el).forEach(b => b.addEventListener('click', () => Game.buyUpgrade(b.closest('.card').dataset.up)));
  },
  refresh_upgrades() {
    for (const card of $$('.card[data-up]')) {
      const u = UPGRADES.find(x => x.id === card.dataset.up);
      const lvl = S.up[u.id];
      const maxed = u.max !== undefined && lvl >= u.max;
      $('.lvl', card).textContent = `St. ${lvl}${u.max ? ' / ' + u.max : ''}`;
      $('.desc', card).textContent = u.desc(lvl);
      const btn = $('.buy', card);
      if (maxed) { btn.disabled = true; btn.dataset.cost = 0; $('.n', btn).textContent = 'MAX'; $('.c', btn).textContent = ''; continue; }
      const { n, total } = Game.upgradeBuyCount(u);
      btn.dataset.cost = total;
      btn.classList.toggle('cant', S.coins < total);
      $('.n', btn).textContent = `+${n}`;
      $('.c', btn).textContent = '💰 ' + U.fmt(total);
    }
  },

  // ---- Katzen
  tab_cats() {
    const owned = Object.keys(S.cats).length;
    const active = CAT_BY_ID[S.activeCat];
    return `
      <div class="sec chestbox">
        <canvas class="portrait big" data-cat="${active.id}" width="150" height="130"></canvas>
        <div>
          <h3 style="color:${CAT_RARITY[active.r].color}">${active.name}</h3>
          <p class="muted">Aktive Katze – ihr Bonus zählt doppelt:<br><b>+${Math.round(active.val * S.cats[active.id] * 200 * 10) / 10}% ${BONUS_LABEL[active.bonus]}</b></p>
          <p class="talentline">${TALENTS[CAT_TALENT[active.id]].icon} <b>${TALENTS[CAT_TALENT[active.id]].name}</b> – ${TALENTS[CAT_TALENT[active.id]].desc} <small>(Stärke ×${Talents.power().toFixed(1)})</small></p>
          <div class="btnrow">
            <button class="btn primary" id="chestBuy" data-cost="${CHEST_COST}" data-cur="bones"><span>🎁 Glückskiste</span><b>🦴 ${CHEST_COST}</b></button>
            <button class="btn gold" id="chestFree"><span>🎁 Gratis</span><b id="freeTimer"></b></button>
          </div>
        </div>
      </div>
      <div class="sec"><h3>Sammlung <small>${owned} / ${CATS.length} · Duplikate erhöhen die Stufe</small></h3>
        <div class="catgrid">${CATS.map(c => {
          const lvl = S.cats[c.id];
          return `<div class="catcard ${lvl ? 'owned' : 'unknown'} ${c.id === S.activeCat ? 'active' : ''}" data-id="${c.id}" style="--rc:${CAT_RARITY[c.r].color}">
            <canvas class="portrait" data-cat="${c.id}" ${lvl ? '' : 'data-sil="1"'} width="90" height="80"></canvas>
            <div class="cn">${lvl ? c.name : '???'}</div>
            <div class="cr">${CAT_RARITY[c.r].name}${lvl ? ' · St. ' + lvl : ''}</div>
            <div class="cbn">${lvl ? `+${Math.round(c.val * lvl * 1000) / 10}% ${BONUS_LABEL[c.bonus]}` : BONUS_LABEL[c.bonus]}</div>
            <div class="ctal" title="${TALENTS[CAT_TALENT[c.id]].desc}">${TALENTS[CAT_TALENT[c.id]].icon} ${TALENTS[CAT_TALENT[c.id]].name}</div>
          </div>`;
        }).join('')}</div>
        <p class="hint">Chancen: ${CAT_RARITY.map(r => `<span style="color:${r.color}">${r.name} ${r.w}%</span>`).join(' · ')}</p>
      </div>`;
  },
  after_cats(el) {
    this.drawPortraits(el);
    $$('.catcard.owned', el).forEach(c => c.addEventListener('click', () => Game.setActiveCat(c.dataset.id)));
    $('#chestBuy').addEventListener('click', () => this.openChest(false));
    $('#chestFree').addEventListener('click', () => this.openChest(true));
  },
  refresh_cats() {
    const b = $('#chestFree'); if (!b) return;
    const left = S.freeChestAt - Date.now();
    b.classList.toggle('cant', left > 0);
    b.classList.toggle('glow', left <= 0);
    $('#freeTimer').textContent = left > 0 ? U.fmtTime(left / 1000) : 'Bereit!';
  },

  drawPortraits(el) {
    for (const cv of $$('canvas.portrait', el)) {
      const cat = CAT_BY_ID[cv.dataset.cat];
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (cv.dataset.sil) ctx.filter = 'brightness(0) opacity(0.35)';
      const s = cv.height / 85;
      Draw.cat(ctx, cv.width / 2 - 4 * s, cv.height - 6 * s, s, cat, 0.5, { still: true });
      ctx.filter = 'none';
    }
  },

  openChest(free) {
    SFX.init();
    const res = Game.openChest(free);
    if (!res) { if (free) this.toast('⏳ Die Gratis-Kiste ist noch nicht bereit.', 'warn'); return; }
    this.chestAnimation(res, free);
  },

  chestAnimation(res) {
    const CARD = 110;
    const N = 44, WIN = 38;
    const cards = [];
    for (let i = 0; i < N; i++) cards.push(Game.rollCat());
    cards[WIN] = res.cat;
    // "Fast gewonnen": seltene Katzen direkt neben dem Treffer
    if (Math.random() < 0.6) cards[WIN + (Math.random() < 0.5 ? 1 : -1)] = U.pick(CATS.filter(c => c.r >= 3));
    const html = `
      <div class="reelwrap"><div class="reel"><div class="strip">${cards.map(c => `
        <div class="rcard" style="--rc:${CAT_RARITY[c.r].color}"><canvas class="portrait" data-cat="${c.id}" width="90" height="80"></canvas><span>${c.name}</span></div>`).join('')}
      </div><div class="needle"></div></div></div>
      <div class="reveal" id="reveal"></div>`;
    this.modal({ title: '🎁 Glückskiste', html, cls: 'chest', buttons: [], noClose: true });
    const box = $('.modal.chest');
    this.drawPortraits(box);
    const strip = $('.strip', box), reel = $('.reel', box), winCard = $$('.rcard', box)[WIN];
    // Layout-Maße statt getBoundingClientRect: das Modal zoomt gerade mit scale(0.8) herein,
    // sonst wäre die Breite zu klein und die Nadel landete auf der Nachbarkarte
    const w = reel.clientWidth;
    const pitch = $$('.rcard', box)[1].offsetLeft - $$('.rcard', box)[0].offsetLeft || CARD;
    const final = -(winCard.offsetLeft + winCard.offsetWidth / 2 - w / 2) + U.rand(-0.35, 0.35) * winCard.offsetWidth;
    strip.style.transform = 'translateX(0px)';
    let lastIdx = -1, running = true;
    const tickLoop = () => {
      if (!running) return;
      const m = new DOMMatrixReadOnly(getComputedStyle(strip).transform);
      const idx = Math.floor((-m.m41 + w / 2) / pitch);
      if (idx !== lastIdx) { lastIdx = idx; SFX.play('tick'); }
      requestAnimationFrame(tickLoop);
    };
    requestAnimationFrame(() => {
      strip.style.transition = 'transform 4.6s cubic-bezier(0.12, 0.75, 0.08, 1)';
      strip.style.transform = `translateX(${final}px)`;
      requestAnimationFrame(tickLoop);
    });
    strip.addEventListener('transitionend', () => {
      running = false;
      const c = res.cat, rar = CAT_RARITY[c.r];
      $$('.rcard', box)[WIN].classList.add('win');
      SFX.play('reveal', c.r);
      if (res.isNew) setTimeout(() => SFX.play('meow', 0.9 + c.r * 0.08), 380);
      this.burstAt($$('.rcard', box)[WIN], rar.color, 30 + c.r * 25);
      const msg = res.isNew ? `<span class="newtag">NEU!</span>` : res.refund ? `Max. Stufe – +${res.refund} 🦴` : `Stufe ${res.level}!`;
      $('#reveal').innerHTML = `
        <div class="rv" style="--rc:${rar.color}">
          <div class="rr">${rar.name}</div>
          <div class="rn">${c.name}</div>
          <div class="rm">${msg}</div>
          <div class="rb">+${String(Math.round(c.val * 1000) / 10).replace(".", ",")} % ${BONUS_LABEL[c.bonus]} pro Stufe</div>
        </div>`;
      const btns = $('.modal .mbtns');
      btns.innerHTML = '';
      const again = S.bones >= CHEST_COST;
      const add = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = label; b.onclick = fn; btns.appendChild(b); };
      if (res.isNew) add('Ausrüsten', '', () => { Game.setActiveCat(c.id); this.closeModal(); });
      if (again) add(`Nochmal <b>🦴 ${CHEST_COST}</b>`, '', () => { this.closeModal(); setTimeout(() => this.openChest(false), 60); });
      add('Super!', 'primary', () => this.closeModal());
      if (this.tab === 'cats') this.renderTab();
    }, { once: true });
  },

  // ---- Begleiter
  tab_pets() {
    return `<div class="sec"><h3>Begleiter <small>Werden mit 🦴 Fischgräten freigeschaltet</small></h3>
      <div class="list">${PETS.map(p => {
        const lvl = S.pets[p.id];
        const cost = Econ.petCost(p, lvl);
        return `<div class="card petcard ${lvl ? '' : 'dim'}" data-petcard="${p.id}">
          <div class="ci big">${p.icon}</div>
          <div class="cb"><div class="cn">${p.name} <small>${lvl ? 'St. ' + lvl : 'gesperrt'}</small></div><div class="cd">${p.desc(lvl)}</div>${lvl ? '<div class="pst"><i></i><span></span></div>' : ''}</div>
          <button class="btn buy" data-pet="${p.id}" data-cost="${cost}" data-cur="bones"><span>${lvl ? 'Stufe +1' : 'Freischalten'}</span><b>🦴 ${cost}</b></button>
        </div>`;
      }).join('')}</div>
      <p class="hint">${S.run && S.run.active ? '🗺️ <b>Streifzug:</b> Begleiter starten bei null. Jeder Boss bringt Streifzug-Gräten – nicht ausgegebene nimmst du am Ende mit nach Hause. Deine Begleiter daheim bleiben unverändert.' : '🦴 Fischgräten bekommst du von Bossen, Erfolgen, dem Tagesbonus und für Katzen auf Max-Stufe.'}</p></div>`;
  },
  after_pets(el) { $$('[data-pet]', el).forEach(b => b.addEventListener('click', () => Game.buyPet(b.dataset.pet))); },
  // Live-Status der Begleiter: Fortschritt bis zur nächsten Wirkung, Eis bei Schattenfluch
  refresh_pets() {
    for (const card of $$('.card[data-petcard]')) {
      const id = card.dataset.petcard, st = $('.pst', card);
      if (!st) continue;
      const fz = Shades.isFrozen('pet:' + id), T = Battle.petT;
      let f = 0, txt = '';
      if (fz) { f = Shades.frozen['pet:' + id] / FREEZE_TIME; txt = `❄️ Eingefroren – noch ${Math.ceil(Shades.frozen['pet:' + id])} s ohne Bonus`; }
      else if (id === 'mouse') { f = T.mouse; txt = '🔫 Feuert jede Sekunde'; }
      else if (id === 'fish') { f = T.fish / 8; txt = `💰 Nächste Münzen in ${Math.ceil(8 - T.fish)} s`; }
      else { f = Battle.owlBuff > 0 ? 1 : T.owl / 20; txt = Battle.owlBuff > 0 ? `🦉 Ruf aktiv: noch ${Battle.owlBuff.toFixed(1)} s` : `🦉 Nächster Ruf in ${Math.ceil(20 - T.owl)} s`; }
      card.classList.toggle('frozen', fz);
      $('i', st).style.width = `${U.clamp(f, 0, 1) * 100}%`;
      $('span', st).textContent = txt;
    }
  },

  // ---- Tagesaufgaben
  tab_quests() {
    Quests.ensure();
    const list = S.quests.list;
    const all = list.every(q => q.claimed);
    return `<div class="sec"><h3>📜 Tagesaufgaben <small>Neue Aufgaben in <b id="qReset"></b></small></h3>
      <div class="list">${list.map((q, i) => {
        const def = QUEST_POOL[q.p], prog = Quests.progress(q);
        return `<div class="card quest ${q.done ? 'done' : ''} ${q.claimed ? 'claimed' : ''}">
          <div class="ci">${def.icon}</div>
          <div class="cb"><div class="cn">${def.text(q.goal)}</div>
            <div class="qbar"><i style="width:${prog / q.goal * 100}%"></i><span>${U.fmt(prog)} / ${U.fmt(q.goal)}</span></div></div>
          <button class="btn buy ${q.done && !q.claimed ? 'gold glow' : ''}" data-claim="${i}" ${q.done && !q.claimed ? '' : 'disabled'}>
            <span>${q.claimed ? '✔ Erhalten' : q.done ? 'Abholen!' : 'Belohnung'}</span><b>🦴 ${q.reward}</b></button>
        </div>`;
      }).join('')}</div>
      <div class="qbonus ${S.quests.bonus ? 'got' : all ? 'ready' : ''}">
        🏅 Alle 3 erledigt: <b>+${QUEST_BONUS} 🦴</b> und eine <b>Gratis-Glückskiste</b> ${S.quests.bonus ? '– erhalten!' : ''}
      </div></div>
      <div class="sec help"><h3>Wetter-Ereignisse</h3>
        <p class="muted" style="margin:0 0 6px;font-size:12px">Alle paar Minuten verändert ein Ereignis für ${EVENT_DURATION} Sekunden das Schlachtfeld:</p>
        <ul>${EVENTS.map(e => `<li>${e.icon} <b style="color:${e.color}">${e.name}</b> – ${e.desc}</li>`).join('')}</ul>
      </div>`;
  },
  after_quests(el) {
    $$('[data-claim]', el).forEach(b => b.addEventListener('click', () => {
      if (Quests.claim(+b.dataset.claim)) { this.burstAt(b, '#ffd34d', 26); this.renderTab(); }
    }));
  },
  refresh_quests() {
    const el = $('#qReset'); if (!el) return;
    const d = new Date(); const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    el.textContent = U.fmtTime((mid - d) / 1000);
    for (const [i, q] of S.quests.list.entries()) {
      const card = $$('.card.quest')[i]; if (!card) continue;
      const prog = Quests.progress(q);
      $('.qbar i', card).style.width = `${prog / q.goal * 100}%`;
      $('.qbar span', card).textContent = `${U.fmt(prog)} / ${U.fmt(q.goal)}`;
    }
  },

  // ---- Wiedergeburt
  tab_rebirth() {
    const gain = Econ.rebirthGain();
    return `<div class="sec rebirthbox">
        <h3>🌿 Wiedergeburt <small>Leben Nr. ${S.rebirths + 1}</small></h3>
        <p>Setzt Stufe, Münzen, Training und Waffen zurück. Katzen, Begleiter, Fischgräten, Erfolge und Perks bleiben. Jede gesammelte Minze gibt dauerhaft <b>+2% Schaden und Münzen</b>.</p>
        <div class="rbstats">
          <div><span>Beste Stufe dieses Leben</span><b>${S.maxStage}</b></div>
          <div><span>Minze bei Wiedergeburt</span><b class="minze">+${U.fmt(gain)} 🌿</b></div>
          <div><span>Minze gesamt</span><b>${U.fmt(S.minzeTotal)} (+${S.minzeTotal * 2}%)</b></div>
        </div>
        <button class="btn primary wide" id="doRebirth" ${gain > 0 && !Run.active ? '' : 'disabled'}>${Run.active ? 'Während des Streifzugs nicht möglich' : gain > 0 ? `Wiedergeburt: +${U.fmt(gain)} 🌿` : 'Ab Stufe 25 verfügbar'}</button>
      </div>
      <div class="sec"><h3>Minze-Perks <small>Verfügbar: ${U.fmt(S.minze)} 🌿</small></h3>
      <div class="list">${PERKS.map(p => {
        const lvl = S.perks[p.id], maxed = p.max !== undefined && lvl >= p.max, cost = Econ.perkCost(p, lvl);
        return `<div class="card">
          <div class="ci">${p.icon}</div>
          <div class="cb"><div class="cn">${p.name} <small>St. ${lvl}${p.max ? ' / ' + p.max : ''}</small></div><div class="cd">${p.desc(lvl)}</div></div>
          <button class="btn buy" data-perk="${p.id}" ${maxed ? 'disabled' : `data-cost="${cost}" data-cur="minze"`}>${maxed ? '<span>MAX</span>' : `<span>+1</span><b>🌿 ${cost}</b>`}</button>
        </div>`;
      }).join('')}</div></div>`;
  },
  after_rebirth(el) {
    $$('[data-perk]', el).forEach(b => b.addEventListener('click', () => Game.buyPerk(b.dataset.perk)));
    const rb = $('#doRebirth');
    if (rb) rb.addEventListener('click', () => this.modal({
      title: '🌿 Wirklich wiedergeboren werden?',
      html: `<p>Du erhältst <b>${U.fmt(Econ.rebirthGain())} Katzenminze</b> und startest auf Stufe ${1 + 5 * S.perks.start}.</p>`,
      buttons: [{ label: 'Abbrechen' }, { label: 'Wiedergeburt!', cls: 'primary', action: () => Game.rebirth() }],
    }));
  },

  // ---- Erfolge
  tab_ach() {
    const done = ACHIEVEMENTS.filter(a => S.ach[a.id]).length;
    const st = S.stats;
    return `<div class="sec stats-mini">
        <div><span>Zerstört</span><b>${U.fmt(st.kills)}</b></div>
        <div><span>Bosse</span><b>${U.fmt(st.bossKills)}</b></div>
        <div><span>Verschmolzen</span><b>${U.fmt(st.merges)}</b></div>
        <div><span>Münzen gesamt</span><b>${U.fmt(st.totalCoins)}</b></div>
        <div><span>Pfotenhiebe</span><b>${U.fmt(st.clicks)}</b></div>
        <div><span>Spielzeit</span><b>${U.fmtTime(st.playTime)}</b></div>
      </div>
      <div class="sec"><h3>Erfolge <small>${done} / ${ACHIEVEMENTS.length}</small></h3>
      <div class="achlist">${ACHIEVEMENTS.map(a => {
        const has = S.ach[a.id], prog = Math.min(1, (S.stats[a.stat] || 0) / a.goal);
        return `<div class="ach ${has ? 'done' : ''}"><div class="an">${has ? '🏆' : '🔸'} ${a.name}</div><div class="ad">${a.desc} · +${a.reward} 🦴</div><div class="bar"><i style="width:${prog * 100}%"></i></div></div>`;
      }).join('')}</div></div>`;
  },

  // ---- Optionen
  tab_options() {
    const gm = Perf.mode();
    return `<div class="sec"><h3>Grafik <small>${S.gfx === 'auto' ? 'automatisch gewählt' : ''}</small></h3>
        <div class="gfxrow">${Object.entries(GFX_MODES).map(([id, m]) => `<button class="gfxb ${id === gm ? 'on' : ''}" data-gfx="${id}"><span>${m.icon}</span><b>${m.name}</b><small>${m.desc}</small></button>`).join('')}</div>
        <p class="hint">Wird das Handy warm, hilft „Akku sparen“ am meisten.</p>
      </div>
      <div class="sec"><h3>Optionen</h3>
        <label class="opt"><input type="checkbox" id="optSound" ${S.sound ? 'checked' : ''}> Soundeffekte</label>
        <label class="opt slider">Effekt-Lautstärke <input type="range" id="optSfxVol" min="0" max="1" step="0.05" value="${S.sfxVol}"></label>
        <label class="opt"><input type="checkbox" id="optMusic" ${S.music ? 'checked' : ''}> Musik (Taste <kbd>N</kbd>)</label>
        <label class="opt slider">Musik-Lautstärke <input type="range" id="optMusicVol" min="0" max="1" step="0.05" value="${S.musicVol}"></label>
      </div>
      <div class="sec"><h3>Komfort <small>Bewegung & Anzeige</small></h3>
        <label class="opt"><input type="checkbox" id="optShake" ${S.optShake ? 'checked' : ''}> Bildschirmwackeln & Zoom-Stöße</label>
        <label class="opt"><input type="checkbox" id="optNums" ${S.optNums ? 'checked' : ''}> Schadenszahlen anzeigen</label>
        <label class="opt"><input type="checkbox" id="optFlash" ${S.optFlash ? 'checked' : ''}> Helle Bildschirmblitze (aus = gedämpft)</label>
        <button class="btn" id="optKeys">⌨️ Tastenkürzel anzeigen <b>Taste H</b></button>
      </div>
      <div class="sec"><h3>Spielstand</h3>
        <div class="btnrow">
          <button class="btn" id="optSave">💾 Jetzt speichern</button>
          <button class="btn" id="optExport">📤 Exportieren</button>
          <button class="btn" id="optImport">📥 Importieren</button>
        </div>
        <textarea id="optText" placeholder="Spielstand-Code hier einfügen bzw. kopieren"></textarea>
        <button class="btn danger" id="optReset">🗑️ Spielstand zurücksetzen</button>
      </div>
      <div class="sec help"><h3>So funktioniert's</h3>
        <ul>
          <li>Deine Katze schießt <b>automatisch</b> auf Hindernisse. Jede Zerstörung bringt 💰 Münzen.</li>
          <li><b>Klicke</b> auf Hindernisse (oder <kbd>Leertaste</kbd>) für Pfotenhiebe. Das füllt das <b>Schnurr-Meter</b> → Raserei mit 3× Schaden!</li>
          <li>Kaufe <b>📦 Waffenkisten</b> und ziehe zwei gleiche Waffen aufeinander, um sie zu <b>verschmelzen</b>.</li>
          <li>Nach 10 Zerstörungen kommt ein <b>Boss</b> mit Zeitlimit. Schaffst du ihn nicht, wird gefarmt, bis du stärker bist.</li>
          <li>Bosse geben 🦴 Fischgräten für <b>Glückskisten</b> (Katzen) und <b>Begleiter</b>.</li>
          <li>Ab Stufe 25: <b>Wiedergeburt</b> für 🌿 Katzenminze und dauerhafte Perks.</li>
          <li>Skills: <kbd>1</kbd> Laser-Blick · <kbd>2</kbd> Fischregen · <kbd>3</kbd> Wildes Fauchen · <kbd>4</kbd> Schnurr-Schild.</li>
          <li>❤️ Ab Stufe 3 <b>werfen Bosse zurück</b>. Tippe auf die rot umrandeten Geschosse, um sie zu <b>parieren</b> – sie fliegen zurück zum Boss.</li>
          <li>⚠️ Läuft der Countdown ab, kommt der <b>Vernichtungsschlag</b>. Mit 🛡️ Schild gibt es einen <b>Konter</b>, sonst kostet er viel Leben. Überlebt? +8 s! Bei <b>K.O.</b> geht es eine Stufe zurück.</li>
          <li>💗 Heilung: Schnurr-Raserei und Fischregen. Außerhalb von Bosskämpfen erholt sich die Katze von selbst.</li>
          <li>🗺️ <b>Streifzug</b> (ab Stufe 8): Roguelike-Abenteuer mit Segen, Pakten und Wächtern – ein K.O. beendet den Lauf.</li>
          <li>✨ Im Streifzug zeigt die <b>Segen-Leiste</b> über dem Spielfeld alle gesammelten Segen – antippen (oder <kbd>I</kbd>) öffnet die Übersicht mit der Gesamtwirkung.</li>
          <li>🌑 <b>Schattenwesen</b> frieren Skills, das Talent, Geisterkatzen oder Begleiter ein. Eine eingefrorene Geisterkatze lässt sich nicht umrüsten, ein eingefrorener Begleiter verliert so lange seinen Bonus.</li>
          <li>🌐 Im <b>World Wide Web</b> stapeln sich Pop-ups, bis du sie per ✕ schließt – <b>Fauchen</b> fegt alle auf einmal weg.</li>
          <li>Ab Stufe 5 bauen Bosse <b>Schilde</b> auf – Kugeln prallen fast ab, <b>Pfotenhiebe</b> machen 4× Schaden!</li>
          <li>Schnelle Zerstörungen hintereinander ergeben eine <b>Combo</b> mit bis zu +50% Münzen.</li>
          <li>Ab und zu fliegt ein <b>Glücksballon</b> vorbei – anklicken lohnt sich!</li>
          <li>Keine Werbung, keine Käufe – alles ist erspielbar. 🐾</li>
        </ul></div>`;
  },
  after_options() {
    // nur die Knöpfe im Reiter (früher traf der Selektor auch <body> → jeder Tipp ins Spiel lud neu, Listener verdoppelten sich)
    $$('.gfxb[data-gfx]').forEach(b => b.addEventListener('click', () => { SFX.play('paw'); Perf.set(b.dataset.gfx); this.renderTab(); }));
    $('#optSound').addEventListener('change', e => { S.sound = SFX.on = e.target.checked; });
    $('#optSfxVol').addEventListener('input', e => { S.sfxVol = +e.target.value; SFX.setVolume(S.sfxVol); });
    $('#optSfxVol').addEventListener('change', () => SFX.play('coin'));
    $('#optMusic').addEventListener('change', e => { SFX.init(); S.music = Music.on = e.target.checked; Music.apply(); this.updateMusicBtn(); });
    $('#optMusicVol').addEventListener('input', e => { S.musicVol = Music.vol = +e.target.value; Music.apply(); });
    for (const [id, key] of [['#optShake', 'optShake'], ['#optNums', 'optNums'], ['#optFlash', 'optFlash']]) $(id).addEventListener('change', e => { S[key] = e.target.checked; SFX.play('paw'); });
    $('#optKeys').addEventListener('click', () => this.showKeys());
    $('#optSave').addEventListener('click', () => { Save.write(); this.toast('💾 Gespeichert', 'good'); });
    $('#optExport').addEventListener('click', () => {
      const ta = $('#optText'); ta.value = Save.exportString(); ta.select();
      try { navigator.clipboard.writeText(ta.value); this.toast('📋 In die Zwischenablage kopiert', 'good'); } catch (e) { /* ignorieren */ }
    });
    $('#optImport').addEventListener('click', () => {
      try {
        const data = Save.importString($('#optText').value);
        if (!data || typeof data !== 'object' || !data.stats) throw new Error('ungültig');
        Main.resetting = true;
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        location.reload();
      } catch (e) { this.toast('❌ Ungültiger Spielstand-Code', 'warn'); }
    });
    $('#optReset').addEventListener('click', () => this.modal({
      title: '🗑️ Alles löschen?', html: '<p>Dein gesamter Fortschritt geht verloren. Das kann nicht rückgängig gemacht werden.</p>',
      buttons: [{ label: 'Abbrechen' }, { label: 'Endgültig löschen', cls: 'danger', action: () => { Main.resetting = true; localStorage.removeItem(SAVE_KEY); location.reload(); } }],
    }));
  },

  // ---------------------------------------------------------------- Modals & Toasts
  modal(opts) {
    if (this.modalOpen) { this.modalQueue.push(opts); return; }
    this.modalOpen = true;
    this.modalOpts = opts;
    const root = $('#modalRoot');
    root.innerHTML = `<div class="backdrop"></div><div class="modal ${opts.cls || ''}">
      <h2>${opts.title}</h2><div class="mbody">${opts.html || ''}</div><div class="mbtns"></div></div>`;
    root.classList.add('show');
    const btns = $('.mbtns', root);
    const list = opts.buttons || [{ label: 'OK', cls: 'primary' }];
    for (const b of list) {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.innerHTML = b.label;
      el.onclick = () => { this.closeModal(); if (b.action) b.action(); };
      btns.appendChild(el);
    }
    if (!opts.noClose) $('.backdrop', root).onclick = () => this.closeModal();
    // erst hier binden: ein Fenster kann in der Warteschlange warten, bis es angezeigt wird
    if (opts.onShow) opts.onShow(root);
  },
  closeModal() {
    const root = $('#modalRoot');
    root.classList.remove('show'); root.innerHTML = '';
    this.modalOpen = false;
    this.modalOpts = null;
    if (this.modalQueue.length) setTimeout(() => this.modal(this.modalQueue.shift()), 150);
  },

  // Meldungen kommen in eine Warteschlange: nur wenige gleichzeitig sichtbar (Handy 2,
  // sonst 4), damit mehrere gleichzeitige Erfolge nicht das Spielfeld zudecken
  toastQ: [],
  toast(html, cls = '') {
    if (this.toastQ.some(t => t.html === html) || $$('#toasts .toast').some(t => t.dataset.html === html)) return;
    this.toastQ.push({ html, cls });
    this.pumpToasts();
  },
  pumpToasts() {
    const max = innerWidth < 1000 || innerHeight < 500 ? 2 : 4;
    while (this.toastQ.length && $$('#toasts .toast:not(.out)').length < max) {
      const { html, cls } = this.toastQ.shift();
      const el = document.createElement('div');
      el.className = 'toast ' + cls;
      el.innerHTML = html; el.dataset.html = html;
      $('#toasts').appendChild(el);
      const stay = cls === 'tip' ? 7500 : this.toastQ.length ? 2200 : 3200; // Hinweise länger, bei Andrang schneller weiter
      setTimeout(() => { el.classList.add('out'); this.pumpToasts(); }, stay);
      setTimeout(() => el.remove(), stay + 450);
    }
  },

  burstAt(el, color, n = 16) {
    const r = el.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'spark';
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 90;
      p.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${color};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  },
};
