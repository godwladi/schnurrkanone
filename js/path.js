'use strict';
// ---------------------------------------------------------------------------
// Streifzug-Wegkarte: Nach jedem Boss (und dem Segen) wählt man den nächsten Weg.
// Jede Tür zeigt Art und Gebiet des nächsten Raums:
//   Kampf      – normaler Raum
//   Elite      – zähere Gegner (+40 %, Boss +50 %), werfen öfter; Segen garantiert, +3 Gräten
//   Händler    – Heilung, Segen, Waffenkiste, Kisten-Paket, Segen schärfen gegen Streifzug-Münzen
//   Katzenkorb – ausruhen (Leben) oder einen Segen verstärken
//   Ereignis   – kleine Geschichte mit zwei Entscheidungen (Risiko oder sicher)
// Nach einem Zwischenhalt kommen nur noch Kampf-Türen. Wächter-Räume sind Pflicht.
// Der Zustand liegt in S.run (phase/path/shop/event), damit ein Neustart mitten
// in der Wahl genau dort weitermacht.
// ---------------------------------------------------------------------------

const DOORS = {
  fight: { icon: '⚔️', name: 'Kampf',        col: '#c7b3ff', desc: '10 Gegner und ein Boss' },
  elite: { icon: '👑', name: 'Elite',        col: '#ff5d73', desc: 'Zähe Gegner, werfen öfter · Segen garantiert, +3 🦴' },
  shop:  { icon: '🎒', name: 'Händler-Maus', col: '#ffd34d', desc: 'Heilung, Segen und Waffen gegen Münzen' },
  rest:  { icon: '💤', name: 'Katzenkorb',   col: '#6ee7a0', desc: 'Ausruhen oder einen Segen verstärken' },
  event: { icon: '🔮', name: 'Ereignis',     col: '#7ef9ff', desc: 'Eine Begegnung – Glück oder Risiko?' },
};

// Händler-Waren; Preis in „Zerstörungen“ (Münzen eines Gegners auf der aktuellen Stufe)
const SHOP_ITEMS = {
  soup:    { icon: '🍲', name: 'Fischsuppe',      desc: '+40 % Leben',                          price: 18 },
  boon:    { icon: '🎁', name: 'Wundertüte',      desc: 'Ein zufälliger Segen (kein Pakt)',     price: 35 },
  box:     { icon: '📦', name: 'Gute Waffenkiste', desc: 'Waffe eine Stufe über der Kistenqualität', price: 22 },
  sharpen: { icon: '🗡️', name: 'Krallen schärfen', desc: 'Ein zufälliger eigener Segen +1 Stufe', price: 45 },
  crates:  { icon: '📦', name: 'Kisten-Paket',    desc: '+2 Waffenkisten fürs Kontingent (auch über 6)', price: 14 },
};

const PATH_EVENTS = [
  { id: 'chest', icon: '🧰', title: 'Geheimnisvolle Kiste', text: 'Mitten im Weg steht eine verschnürte Kiste. Sie schnurrt leise.',
    a: { label: '📦 Öffnen', hint: '60 %: Segen · 40 %: −20 % Leben' }, b: { label: '🚪 Liegen lassen', hint: 'Nichts passiert' } },
  { id: 'witch', icon: '🔮', title: 'Streunende Hexenkatze', text: '„Ich mach dir ein Angebot, das du nicht ablehnen kannst …“',
    a: { label: '🖤 Pakt annehmen', hint: 'Zufälliger Pakt + 30 % Heilung' }, b: { label: '🏳️ Ablehnen', hint: '+10 % Leben' } },
  { id: 'fountain', icon: '🐟', title: 'Fischbrunnen', text: 'Ein Brunnen voller Goldfische. Wer etwas gibt, bekommt etwas.',
    a: { label: '💗 Leben opfern', hint: '−25 % Leben · Münzen für 60 Zerstörungen' }, b: { label: '🥛 Nur trinken', hint: '+15 % Leben' } },
  { id: 'catnip', icon: '🌿', title: 'Katzenminze-Feld', text: 'Ein ganzes Feld duftender Katzenminze …',
    a: { label: '🌿 Hineinwälzen', hint: 'Raserei zu Beginn des nächsten Raums · +15 % Leben' }, b: { label: '🔍 Gründlich schnuppern', hint: '50 %: Segen · 50 %: −15 % Leben' } },
  { id: 'cards', icon: '🃏', title: 'Kartentrick der Elster', text: 'Eine Elster mischt drei Karten. „Such dir eine aus!“',
    a: { label: '✨ Mitspielen', hint: 'Seltener Segen oder ein Pakt' }, b: { label: '💰 Bestechen', hint: 'Münzen für 20 Zerstörungen → Segen' } },
];
const PATH_EVENT_BY_ID = Object.fromEntries(PATH_EVENTS.map(e => [e.id, e]));

const Path = {
  // nie zwei Weg-Fenster gleichzeitig (offen oder wartend)
  modal(o) {
    const busy = m => m && /pathmodal|boonmodal/.test(m.cls || '');
    if (busy(UI.modalOpts) || UI.modalQueue.some(busy)) return;
    UI.modal(o);
  },
  coinUnit() { return Econ.coins(S.stage) * R.coinMult; },

  // ---------------------------------------------------------------- Wegkarte
  offer() {
    const r = S.run;
    r.choosing = true; r.phase = 'path';
    if (!r.path) r.path = { doors: this.rollDoors(false) };
    this.showDoors();
  },
  rollDoors(afterStop) {
    const r = S.run;
    const used = [], biome = () => { const b = Run.rollBiome(used); used.push(b); return b; };
    if (Run.room() % GUARDIAN_EVERY === 0) return [{ type: 'fight', biome: biome(), guard: true }]; // Wächter: Pflicht
    const doors = [{ type: 'fight', biome: biome() }];
    doors.push({ type: Run.room() >= 2 && Math.random() < 0.55 ? 'elite' : 'fight', biome: biome() });
    if (!afterStop && Run.room() >= 2) {
      const stops = ['shop', 'rest', 'event'].filter(t => t !== r.lastStop);
      // wenig Leben: Katzenkorb wahrscheinlicher
      const pick = Vitals.frac() < 0.4 && stops.includes('rest') && Math.random() < 0.6 ? 'rest' : U.pick(stops);
      doors.splice(U.randi(0, doors.length), 0, { type: pick });
    }
    return doors;
  },
  showDoors() {
    const r = S.run, doors = r.path.doors;
    const cards = doors.map((d, i) => {
      const t = DOORS[d.type], b = d.biome !== undefined ? RUN_BIOMES[d.biome % RUN_BIOMES.length] : null;
      const where = b ? `<span class="dbiome" style="--bc:${b.accent || '#c7b3ff'}">${b.special ? '✨ ' : ''}${b.name}</span>` : '<span class="dbiome stop">Zwischenhalt</span>';
      return `<button class="door door-${d.type}" data-door="${i}" style="--dc:${t.col}">
        <span class="dicon">${t.icon}</span><b>${d.guard ? 'Wächter' : t.name}</b>${where}
        <small>${d.guard ? 'Pflichtkampf · stärkerer Boss · Segen garantiert' : b && b.special ? b.desc : t.desc}</small>${d.type === 'fight' && !d.guard && Run.room() % BOON_EVERY === 0 ? '<em class="dboon">✨ Segen</em>' : ''}</button>`;
    }).join('');
    this.modal({
      title: '🗺️ Wohin geht die Reise?',
      cls: 'boonmodal pathmodal', noClose: true, buttons: [],
      html: `<p class="muted runinfo">Nächster Raum: <b>${Run.room()}</b> · ❤️ ${Math.ceil(r.hp)} / ${r.maxHp} · 💰 ${U.fmt(S.coins)}</p>
        <div class="doors n${doors.length}">${cards}</div>`,
      onShow: root => { for (const el of root.querySelectorAll('[data-door]')) el.addEventListener('click', () => { UI.closeModal(); this.choose(+el.dataset.door); }); },
    });
  },
  choose(i) {
    const r = S.run, d = r.path && r.path.doors[i];
    if (!d) return;
    SFX.play('paw');
    if (d.type === 'fight' || d.type === 'elite') { Run.enterRoom(d.biome, d.type); return; }
    r.lastStop = d.type;
    r.phase = d.type;
    if (d.type === 'shop') { r.shop = { items: this.rollShop(), bought: {} }; this.shop(); }
    else if (d.type === 'rest') this.rest();
    else { r.event = U.pick(PATH_EVENTS.filter(e => e.id !== (r.lastEvent || ''))).id; r.lastEvent = r.event; this.event(); }
    Save.write();
  },
  // nach einem Zwischenhalt: nur noch Kampf-Türen
  next() {
    const r = S.run;
    r.shop = null; r.event = null;
    r.phase = 'path'; // sofort umschalten: sonst könnte ein Zwischenhalt doppelt öffnen (doppelte Belohnung)
    r.path = { doors: this.rollDoors(true) };
    Run.renderBar();
    setTimeout(() => this.offer(), 200);
  },
  // nach Neustart oder weggeklicktem Fenster wieder anzeigen
  resume() {
    const r = S.run;
    if (r.phase === 'path') this.offer();
    else if (r.phase === 'shop' && r.shop) this.shop();
    else if (r.phase === 'rest') this.rest();
    else if (r.phase === 'event' && r.event) this.event();
    else { r.phase = 'path'; this.offer(); }
  },

  // ---------------------------------------------------------------- Händler-Maus
  rollShop() {
    const ids = ['soup', 'boon', 'box', 'crates'];
    if (Run.owned().some(o => this.sharpenable(o.b))) ids.push('sharpen');
    return ids;
  },
  sharpenable: b => !b.pact && !b.heal && b.id !== 'box' && b.id !== 'life' && Run.available(b) && !!b.fx,
  price(id) { return SHOP_ITEMS[id].price * this.coinUnit(); },
  shop() {
    const r = S.run, sh = r.shop;
    if (!sh) { this.next(); return; }
    const items = sh.items.map(id => {
      const it = SHOP_ITEMS[id], p = this.price(id), sold = sh.bought[id], cant = !sold && S.coins < p;
      const full = id === 'box' && S.grid.indexOf(null) < 0;
      return `<button class="ware ${sold ? 'sold' : ''}" data-ware="${id}" ${sold || cant || full ? 'disabled' : ''}>
        <span class="dicon">${it.icon}</span><b>${it.name}</b><small>${full ? 'Rucksack voll' : it.desc}</small><em>${sold ? '✔ gekauft' : `💰 ${U.fmt(p)}`}</em></button>`;
    }).join('');
    this.modal({
      title: '🎒 Händler-Maus', cls: 'boonmodal pathmodal', noClose: true,
      html: `<p class="muted runinfo">„Frische Ware, nur für Streuner!“ · Du hast <b>💰 ${U.fmt(S.coins)}</b> · ❤️ ${Math.ceil(r.hp)} / ${r.maxHp}</p><div class="wares">${items}</div>`,
      buttons: [{ label: '🚪 Weiterziehen', cls: 'primary', action: () => this.next() }],
      onShow: root => { for (const el of root.querySelectorAll('[data-ware]')) el.addEventListener('click', () => this.buy(el.dataset.ware)); },
    });
  },
  buy(id) {
    const r = S.run, sh = r.shop, p = this.price(id), B = Battle;
    if (!sh || sh.bought[id] || S.coins < p) { SFX.play('error'); return; }
    S.coins -= p; sh.bought[id] = true;
    if (id === 'soup') Vitals.heal(B, 0.4);
    if (id === 'crates') { S.run.boxes = Run.boxStock() + 2; UI.toast(`📦 <b>+2 Waffenkisten</b><br><small>Jetzt ${S.run.boxes} im Kontingent</small>`, 'good'); }
    if (id === 'boon') this.giftBoon(b => !b.pact && !b.heal);
    if (id === 'box') {
      const free = S.grid.indexOf(null);
      if (free >= 0) { const w = { t: U.pick(WEAPON_IDS), r: Math.min(BOX_MAX_TIER, 2 + S.up.box), v: Variants.roll(0.25) }; S.grid[free] = w; Game.discover(w); recalc(); Game.emit('weapons'); UI.toast(`📦 <b>${WEAPONS[w.t].name} ${U.roman(w.r)}</b><br><small>im Rucksack</small>`, 'good'); }
    }
    if (id === 'sharpen') {
      const own = Run.owned().filter(o => this.sharpenable(o.b));
      if (own.length) { const o = U.pick(own); Run.grant(o.b.id); UI.toast(`🗡️ <b>${o.b.name}</b> verstärkt<br><small>${Run.fxText(o.b, o.n + 1)}</small>`, 'good'); }
    }
    SFX.play('buy');
    Run.renderBar();
    UI.closeModal();
    setTimeout(() => { if (S.run.phase === 'shop' && S.run.shop) this.shop(); }, 120); // nicht, wenn schon weitergezogen
    Save.write();
  },
  // zufälligen Segen schenken (mit Meldung)
  giftBoon(filter) {
    const pool = BOONS.filter(b => Run.available(b) && b.id !== 'bowl' && filter(b));
    if (!pool.length) { Vitals.heal(Battle, 0.3); return null; }
    const b = U.pick(pool);
    Run.grant(b.id);
    UI.toast(`${b.icon} <b>Segen: ${b.name}</b><br><small>${b.desc}</small>`, b.pact ? 'warn' : 'ach');
    SFX.play('reveal', b.rare ? 3 : 2);
    Run.renderBar();
    return b;
  },

  // ---------------------------------------------------------------- Katzenkorb
  rest() {
    const r = S.run;
    const own = Run.owned().filter(o => this.sharpenable(o.b));
    const ups = own.map(o => `<button class="boon" data-up="${o.b.id}"><span class="bi">${o.b.icon}</span><b>${o.b.name}</b><small>${Run.fxText(o.b, o.n)}</small><span class="bnext">danach: <b>${Run.fxText(o.b, o.n + 1)}</b></span></button>`).join('');
    this.modal({
      title: '💤 Katzenkorb', cls: 'boonmodal pathmodal', noClose: true,
      html: `<p class="muted runinfo">Ein weiches Körbchen am Wegrand. ❤️ ${Math.ceil(r.hp)} / ${r.maxHp}</p>
        <div class="restopts">
          <button class="boon heal" data-rest="sleep"><span class="bi">😴</span><b>Schläfchen</b><small>+45 % Leben</small></button>
          ${own.length ? '' : '<button class="boon" data-rest="fur"><span class="bi">🧥</span><b>Fellpflege</b><small>+15 max. Leben</small></button>'}
        </div>
        ${own.length ? `<h4 class="mh">… oder Krallen wetzen: ein Segen +1 Stufe</h4><div class="boons ups">${ups}</div>` : ''}`,
      buttons: [],
      onShow: root => {
        for (const el of root.querySelectorAll('[data-rest]')) el.addEventListener('click', () => {
          UI.closeModal();
          if (el.dataset.rest === 'sleep') Vitals.heal(Battle, 0.45);
          else { S.run.maxHp += 15; Vitals.heal(Battle, 0.15); }
          SFX.play('heal'); this.next();
        });
        for (const el of root.querySelectorAll('[data-up]')) el.addEventListener('click', () => {
          UI.closeModal();
          Run.grant(el.dataset.up); SFX.play('merge', 3);
          const b = BOON_BY_ID[el.dataset.up];
          UI.toast(`${b.icon} <b>${b.name}</b> verstärkt<br><small>${Run.fxText(b, S.run.boons[b.id])}</small>`, 'good');
          this.next();
        });
      },
    });
  },

  // ---------------------------------------------------------------- Ereignisse
  event() {
    const e = PATH_EVENT_BY_ID[S.run.event];
    if (!e) { this.next(); return; }
    this.modal({
      title: `${e.icon} ${e.title}`, cls: 'boonmodal pathmodal eventmodal', noClose: true,
      html: `<p class="evtext">${e.text}</p><div class="evopts">
        <button class="boon" data-ev="a"><b>${e.a.label}</b><small>${e.a.hint}</small></button>
        <button class="boon" data-ev="b"><b>${e.b.label}</b><small>${e.b.hint}</small></button></div>`,
      buttons: [],
      onShow: root => { for (const el of root.querySelectorAll('[data-ev]')) el.addEventListener('click', () => { UI.closeModal(); this.resolve(e.id, el.dataset.ev); }); },
    });
  },
  resolve(id, choice) {
    const r = S.run, B = Battle;
    const hurt = f => { r.hp = Math.max(1, r.hp - r.maxHp * f); Vitals.hurtT = 0.4; UI.toast(`💔 <b>Autsch!</b><br><small>−${Math.round(f * 100)} % Leben</small>`, 'warn'); SFX.play('error'); };
    const coins = n => { const c = this.coinUnit() * n; Game.addCoins(c); UI.toast(`💰 <b>+${U.fmt(c)} Münzen</b>`, 'good'); SFX.play('coin'); };
    if (id === 'chest') { if (choice === 'a') { if (Math.random() < 0.6) this.giftBoon(b => !b.pact && !b.heal); else hurt(0.2); } }
    if (id === 'witch') { if (choice === 'a') { this.giftBoon(b => b.pact) || null; Vitals.heal(B, 0.3); } else Vitals.heal(B, 0.1); }
    if (id === 'fountain') { if (choice === 'a') { hurt(0.25); coins(60); } else Vitals.heal(B, 0.15); }
    if (id === 'catnip') {
      if (choice === 'a') { r.catnip = true; Vitals.heal(B, 0.15); UI.toast('🌿 <b>Herrlich!</b><br><small>Der nächste Raum startet mit Schnurr-Raserei</small>', 'good'); }
      else if (Math.random() < 0.5) this.giftBoon(b => !b.pact && !b.heal); else hurt(0.15);
    }
    if (id === 'cards') {
      if (choice === 'a') this.giftBoon(Math.random() < 0.6 ? (b => b.rare || b.req || b.tag) : (b => b.pact));
      else { const c = this.coinUnit() * 20; if (S.coins >= c) { S.coins -= c; this.giftBoon(b => !b.pact && !b.heal); } else { UI.toast('💰 <b>Zu wenig Münzen</b><br><small>Die Elster fliegt beleidigt davon</small>', 'warn'); } }
    }
    Run.renderBar();
    this.next();
  },
};
