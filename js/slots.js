'use strict';
// ---------------------------------------------------------------------------
// Katzen-Automat (ersetzt das Glücksrad): Slotmaschine mit drei Walzen und drei Modi.
//   Münz-Slot   – Einsatz in Münzen (1 %, 5 %, 20 % oder alles), Gewinntabelle mit
//                 wachsendem Jackpot (3 Kronen) und „Doppelt oder nichts“ nach Gewinnen.
//                 Auszahlung ≈ 95 % plus Jackpot – auf Dauer ein Münz-Fresser mit Nervenkitzel.
//   Schatz-Slot – einmal am Tag gratis, sonst Fischgräten; gewinnt immer einen Preis
//                 (die alten Glücksrad-Preise: Kisten, Waffen, Gräten, Minze …).
//   Kampf-Slot  – Münzen gegen Kampf-Schübe (Raserei, Goldrausch, Eulenruf, Schnurr-Meter);
//                 drei gleiche = voller Schub, zwei gleiche = kleiner Schub.
//                 Schübe starten erst beim Schließen, damit keine Zeit im Fenster verstreicht.
// ---------------------------------------------------------------------------

const SLOT_BONE_COST = 15;
const SLOT_BETS = [{ f: 0.01, n: '1 %' }, { f: 0.05, n: '5 %' }, { f: 0.2, n: '20 %' }, { f: 1, n: 'Alles!' }];
// Münz-Slot: Gewicht je Walze und Faktor für drei gleiche (Auszahlungsquote ≈ 95 % ohne Jackpot)
const SLOT_COIN_SYMS = [
  { s: '🐟', w: 6, pay: 5 }, { s: '🧶', w: 5, pay: 10 }, { s: '🐭', w: 4, pay: 20 },
  { s: '🦴', w: 3, pay: 30 }, { s: '💠', w: 2, pay: 80 }, { s: '👑', w: 1, pay: 250 },
];
const SLOT_TREASURE = [
  { id: 'coins',  s: '💰', name: 'Münzregen',   w: 22 },
  { id: 'bones',  s: '🦴', name: '+10 Gräten',  w: 20 },
  { id: 'rush',   s: '✨', name: 'Goldrausch',  w: 14 },
  { id: 'frenzy', s: '🔥', name: 'Raserei',     w: 14 },
  { id: 'chest',  s: '🎁', name: 'Katzenkiste', w: 10 },
  { id: 'weapon', s: '⚔️', name: 'Waffenkiste', w: 12 },
  { id: 'bones2', s: '🍀', name: '+30 Gräten',  w: 6 },
  { id: 'minze',  s: '🌿', name: 'Katzenminze', w: 2 },
];
const SLOT_FIGHT = [
  { id: 'frenzy', s: '⚡', w: 4 }, { id: 'rush', s: '✨', w: 5 }, { id: 'owl', s: '🦉', w: 5 },
  { id: 'coins', s: '💰', w: 5 }, { id: 'purr', s: '🐾', w: 6 },
];
const SLOT_MODES = [
  { id: 'coins', icon: '💰', name: 'Münz-Slot', desc: 'Setze Münzen – drei gleiche gewinnen, 👑👑👑 knackt den Jackpot.' },
  { id: 'treasure', icon: '🎁', name: 'Schatz-Slot', desc: 'Gewinnt immer einen Preis. Täglich ein Dreh gratis.' },
  { id: 'fight', icon: '⚡', name: 'Kampf-Slot', desc: 'Münzen gegen Kampf-Schübe für die nächsten Sekunden.' },
];

const Slots = {
  spinning: false, mode: 'coins', vis: null, pending: [], gamble: null,

  st() {
    if (!S.casino) {
      S.casino = { day: S.wheel ? S.wheel.day : '', spins: 0, pot: 0, betI: 1, best: 0, net: 0 };
      delete S.wheel;
    }
    return S.casino;
  },
  ready() { return this.st().day !== U.today(); },
  unit() { return Econ.coins(S.stage) * R.coinMult; },          // Münzen je Gegner
  minBet() { return Math.ceil(this.unit() * 5); },
  bet() { return Math.max(this.minBet(), Math.floor(S.coins * SLOT_BETS[this.st().betI].f)); },
  fightCost() { return Math.max(this.minBet() * 4, Math.floor(S.coins * 0.03)); },
  pool() { return this.mode === 'coins' ? SLOT_COIN_SYMS : this.mode === 'treasure' ? SLOT_TREASURE : SLOT_FIGHT; },
  potMin() { return Math.ceil(this.unit() * 400); },
  pot() { const s = this.st(); s.pot = Math.max(s.pot || 0, this.potMin()); return s.pot; },

  // ----------------------------------------------------------------- Fenster
  show() {
    this.st();
    if (this.ready()) this.mode = 'treasure';
    if (!this.vis) this.vis = [0, 1, 2].map(() => [0, 1, 2].map(() => U.pick(SLOT_COIN_SYMS).s));
    this.gamble = null;
    UI.modal({
      title: '🎰 Katzen-Automat', cls: 'slotmodal',
      html: `<div class="sl-modes">${SLOT_MODES.map(m => `<button class="sl-mode" data-m="${m.id}">${m.icon}<span>${m.name}</span><i class="dot"></i></button>`).join('')}</div>
        <div class="slotm">
          <div class="sl-top"><i class="sl-lights"></i><div class="sl-pot"></div></div>
          <div class="sl-reels">${[0, 1, 2].map(i => `<div class="sl-reel"><div class="sl-strip">${this.vis[i].map(s => `<b>${s}</b>`).join('')}</div></div>`).join('')}<i class="sl-line"></i></div>
          <div class="sl-lever" title="Hebel ziehen"><i></i></div>
        </div>
        <p class="sl-msg"></p>
        <div class="sl-ctrl"></div>`,
      buttons: [{ label: 'Schließen' }],
      onShow: root => {
        this.root = $('.modal', root); // wird beim Schließen entfernt → isConnected zeigt, ob noch offen
        root = this.root;
        $('.sl-modes', root).addEventListener('click', e => {
          const b = e.target.closest('.sl-mode'); if (!b || this.spinning) return;
          this.mode = b.dataset.m; this.gamble = null; SFX.play('paw'); this.render();
        });
        $('.sl-lever', root).addEventListener('click', () => this.spin());
        this.render();
        // Münzen ändern sich nebenbei (das Spiel läuft weiter) → Grau-Zustand nachführen
        const iv = setInterval(() => { if (!root.isConnected) clearInterval(iv); else this.syncCant(); }, 400);
      },
    });
  },

  render(msg) {
    const root = this.root; if (!root || !root.isConnected) return;
    const st = this.st(), m = SLOT_MODES.find(x => x.id === this.mode);
    $$('.sl-mode', root).forEach(b => b.classList.toggle('on', b.dataset.m === this.mode));
    $('.sl-mode[data-m="treasure"] .dot', root).classList.toggle('on', this.ready());
    $('.slotm', root).dataset.mode = this.mode;
    // Walzen zeigen die Symbole des gewählten Modus
    if (this.visMode !== this.mode && !this.spinning) {
      this.visMode = this.mode;
      this.vis = this.vis.map(() => [0, 1, 2].map(() => U.pick(this.pool()).s));
      $$('.sl-strip', root).forEach((el, i) => { el.style.transition = 'none'; el.style.transform = ''; el.innerHTML = this.vis[i].map(x => `<b>${x}</b>`).join(''); });
    }
    const pot = $('.sl-pot', root);
    pot.innerHTML = this.mode === 'coins' ? `JACKPOT <b>${U.fmt(this.pot())}</b> 💰`
      : this.mode === 'treasure' ? 'SCHATZ-SLOT · immer ein Gewinn' : 'KAMPF-SLOT · Schub für die Katze';
    if (msg !== undefined) $('.sl-msg', root).innerHTML = msg;
    else if (!$('.sl-msg', root).dataset.keep) $('.sl-msg', root).innerHTML = `<span class="muted">${m.desc}</span>`;
    const c = $('.sl-ctrl', root);
    if (this.gamble) {
      c.innerHTML = `<p class="sl-gtxt">Doppelt oder nichts? Einsatz <b>${U.fmt(this.gamble.amt)} 💰</b> – unter welcher Pfote liegt die Münze?</p>
        <div class="sl-row"><button class="btn primary" data-g="0">🐾 Links</button><button class="btn primary" data-g="1">🐾 Rechts</button></div>
        <button class="btn wide" data-g="take">Einsammeln</button>`;
    } else if (this.mode === 'coins') {
      c.innerHTML = `<div class="sl-bets">${SLOT_BETS.map((b, i) => `<button class="sl-bet ${i === st.betI ? 'on' : ''}" data-b="${i}">${b.n}</button>`).join('')}</div>
        <button class="btn gold wide sl-go">🎰 Drehen · ${U.fmt(this.bet())} 💰</button>
        <details class="sl-pay"><summary>Gewinntabelle</summary><div>${SLOT_COIN_SYMS.map(x => `<span>${x.s}${x.s}${x.s} <b>×${x.pay}${x.s === '👑' ? ' + Jackpot' : ''}</b></span>`).join('')}
          <span>👑👑 <b>×6</b></span><span>2 gleiche <b>×0,5</b></span><span>1 👑 <b>×1</b></span></div></details>`;
    } else if (this.mode === 'treasure') {
      const free = this.ready();
      c.innerHTML = `<button class="btn ${free ? 'gold' : 'primary'} wide sl-go">${free ? '🎰 Gratis drehen!' : `🎰 Drehen · ${SLOT_BONE_COST} 🦴`}</button>
        <p class="sl-note muted">Preise: ${SLOT_TREASURE.map(p => p.s).join(' ')}</p>`;
    } else {
      c.innerHTML = Run.active ? '<p class="sl-note muted">Im Streifzug ist der Kampf-Slot gesperrt.</p>'
        : `<button class="btn gold wide sl-go">🎰 Drehen · ${U.fmt(this.fightCost())} 💰</button>
        <p class="sl-note muted">⚡ Raserei · ✨ Goldrausch · 🦉 Eulenruf · 💰 Münzen · 🐾 Schnurr-Meter<br>3 gleiche = voller Schub, 2 gleiche = kleiner Schub</p>`;
    }
    this.syncCant();
    c.onclick = e => {
      const bet = e.target.closest('.sl-bet');
      if (bet && !this.spinning) { st.betI = +bet.dataset.b; SFX.play('paw'); this.render(); return; }
      if (e.target.closest('.sl-go')) { this.spin(); return; }
      const g = e.target.closest('[data-g]');
      if (g) this.doGamble(g.dataset.g);
    };
  },

  // Knöpfe grau, solange Münzen bzw. Fischgräten nicht reichen (bleiben antippbar und sagen, was fehlt)
  syncCant() {
    const root = this.root; if (!root || !root.isConnected) return;
    const go = $('.sl-go', root);
    if (go) {
      const cant = this.mode === 'coins' ? S.coins < this.bet()
        : this.mode === 'treasure' ? !this.ready() && S.bones < SLOT_BONE_COST
        : S.coins < this.fightCost();
      go.classList.toggle('cant', cant);
    }
    $$('.sl-bet', root).forEach(b => b.classList.toggle('cant', S.coins < this.minBet()));
  },

  // ----------------------------------------------------------------- Drehen
  spin() {
    if (this.spinning || this.gamble) return;
    const st = this.st();
    let res, cost = 0;
    if (this.mode === 'coins') {
      cost = this.bet();
      if (S.coins < cost) return this.deny(`Zu wenig Münzen (mind. ${U.fmt(cost)} 💰)`);
      S.coins -= cost; st.net -= cost;
      st.pot = this.pot() + cost * 0.08;
      res = [0, 1, 2].map(() => U.weightedPick(SLOT_COIN_SYMS).s);
    } else if (this.mode === 'treasure') {
      const free = this.ready();
      if (!free && S.bones < SLOT_BONE_COST) return this.deny(`Zu wenig Fischgräten (${SLOT_BONE_COST} 🦴)`);
      if (free) st.day = U.today(); else S.bones -= SLOT_BONE_COST;
      const p = U.weightedPick(SLOT_TREASURE);
      res = [p.s, p.s, p.s];
      this.prize = p;
    } else {
      if (Run.active) return this.deny('Im Streifzug gesperrt');
      cost = this.fightCost();
      if (S.coins < cost) return this.deny(`Zu wenig Münzen (${U.fmt(cost)} 💰)`);
      S.coins -= cost;
      res = [0, 1, 2].map(() => U.weightedPick(SLOT_FIGHT).s);
    }
    st.spins++;
    this.spinning = true;
    SFX.init(); SFX.play('buy');
    const root = this.root;
    $('.sl-lever', root).classList.remove('pull'); void $('.sl-lever', root).offsetWidth; $('.sl-lever', root).classList.add('pull');
    $('.slotm', root).classList.remove('win', 'big');
    $('.sl-msg', root).dataset.keep = '';
    this.render('<span class="muted">Die Walzen drehen …</span>');
    $$('.sl-go, .sl-bet', root).forEach(b => b.disabled = true);
    // zwei gleiche auf den ersten Walzen → dritte Walze dreht spannend länger
    const tease = this.mode !== 'treasure' && res[0] === res[1];
    this.roll(res, this.pool(), tease, () => {
      this.spinning = false;
      this.finish(res, cost);
      Save.write();
    });
  },

  deny(txt) { SFX.play('error'); UI.toast(txt, 'warn'); },

  // Walzen laufen nach unten durch und bleiben (mit kleinem Nachfedern) auf dem Ziel stehen
  roll(res, pool, tease, done) {
    const root = this.root, reels = $$('.sl-reel', root);
    const sh = $('.sl-strip b', root).offsetHeight || 64;
    let stopped = 0;
    const tick = setInterval(() => SFX.play('tick'), 85);
    if (!reels.length) { clearInterval(tick); done(); return; }
    reels.forEach((reel, i) => {
      const strip = $('.sl-strip', reel);
      const tgt = [U.pick(pool).s, res[i], U.pick(pool).s];
      const fill = Array.from({ length: 16 + i * 6 + (tease && i === 2 ? 14 : 0) }, () => U.pick(pool).s);
      const syms = [...tgt, ...fill, ...this.vis[i]];
      strip.innerHTML = syms.map(s => `<b>${s}</b>`).join('');
      strip.style.transition = 'none';
      strip.style.transform = `translateY(${-(syms.length - 3) * sh}px)`;
      void strip.offsetHeight;
      const dur = 1.1 + i * 0.45 + (tease && i === 2 ? 1.1 : 0);
      if (tease && i === 2) setTimeout(() => reel.classList.add('tease'), (1.1 + 0.45) * 1000);
      strip.style.transition = `transform ${dur}s cubic-bezier(0.22, 0.7, 0.28, 1.06)`;
      strip.style.transform = 'translateY(0)';
      reel.classList.add('blur');
      setTimeout(() => reel.classList.remove('blur'), dur * 1000 - 250);
      setTimeout(() => {
        reel.classList.remove('tease');
        SFX.play('paw');
        this.vis[i] = tgt;
        if (++stopped === 3) { clearInterval(tick); done(); }
      }, dur * 1000 + 60);
    });
  },

  finish(res, cost) {
    // Gewinne zählen auch, wenn das Fenster während des Drehens geschlossen wurde
    const root = this.root, ui = !!(root && root.isConnected), st = this.st(), B = Battle;
    let msg = '', win = 0, big = false;
    if (this.mode === 'coins') {
      const [a, b, c] = res, crowns = res.filter(s => s === '👑').length;
      if (a === b && b === c) {
        const sym = SLOT_COIN_SYMS.find(x => x.s === a);
        win = cost * sym.pay;
        if (a === '👑') { win += this.pot(); st.pot = this.potMin(); big = true; msg = `👑 <b>JACKPOT!</b> +${U.fmt(win)} 💰`; }
        else msg = `${a}${a}${a} <b>+${U.fmt(win)} 💰</b> (×${sym.pay})`;
        big = big || sym.pay >= 30;
      } else if (crowns === 2) { win = cost * 6; msg = `👑👑 <b>+${U.fmt(win)} 💰</b> (×6)`; }
      else if (a === b || b === c || a === c) { win = Math.floor(cost * 0.5); msg = `Zwei gleiche – <b>${U.fmt(win)} 💰</b> zurück`; }
      else if (crowns === 1) { win = cost; msg = `Eine Krone – Einsatz zurück`; }
      if (win > 0) {
        S.coins += win; st.net += win; st.best = Math.max(st.best, win);
        Game.emit('gain', win);
        if (win > cost) this.gamble = { amt: win, n: 0 };
      } else msg = '<span class="muted">Nichts dabei – nochmal?</span>';
    } else if (this.mode === 'treasure') {
      msg = `${this.prize.s} <b>${this.grant(this.prize)}</b>`;
      win = 1; big = this.prize.id === 'minze' || this.prize.id === 'chest';
    } else {
      const counts = {};
      for (const s of res) counts[s] = (counts[s] || 0) + 1;
      const [sym, n] = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
      const f = SLOT_FIGHT.find(x => x.s === sym);
      if (n >= 2) { msg = `${sym.repeat(n)} <b>${this.fight(f.id, n === 3, cost)}</b>`; win = 1; big = n === 3; }
      else { this.pending.push(() => { B.purr = Math.min(100, B.purr + 20); }); msg = 'Trostpreis: <b>+20 Schnurr-Meter</b>'; }
      if (n >= 2) msg += '<br><small class="muted">Startet, sobald du das Fenster schließt.</small>';
    }
    if (!ui) { this.gamble = null; this.flush(); return; }
    const mach = $('.slotm', root);
    if (win > 0) {
      mach.classList.add('win'); if (big) mach.classList.add('big');
      SFX.play(big ? 'victory' : 'achievement');
      if (this.mode === 'coins') { SFX.play('coin'); B.spawnFlyers(B.W / 2, B.H / 2, big ? 30 : 12, 'coin'); }
    } else SFX.play('fail');
    $('.sl-msg', root).dataset.keep = '1';
    this.render(`<span class="sl-win">${msg}</span>`);
  },

  // Doppelt oder nichts: 50 : 50, höchstens fünfmal hintereinander
  doGamble(g) {
    const G = this.gamble; if (!G) return;
    if (g === 'take') { this.gamble = null; SFX.play('coin'); this.render(); return; }
    if (S.coins < G.amt) { this.gamble = null; this.render(); return; }
    const st = this.st(), hit = Math.random() < 0.5, side = g === '0' ? 'Links' : 'Rechts';
    if (hit) {
      S.coins += G.amt; st.net += G.amt; G.amt *= 2; G.n++;
      st.best = Math.max(st.best, G.amt);
      SFX.play('achievement'); Game.emit('gain', G.amt / 2);
      const msg = `🐾 ${side} – <b>verdoppelt!</b> Jetzt ${U.fmt(G.amt)} 💰`;
      if (G.n >= 5) this.gamble = null;
      this.render(`<span class="sl-win">${msg}</span>`);
    } else {
      S.coins -= G.amt; st.net -= G.amt;
      this.gamble = null; SFX.play('fail');
      this.render(`🐾 ${side} war leer – <b>${U.fmt(G.amt)} 💰 weg</b>`);
    }
    Save.write();
  },

  // Kampf-Slot: Schub merken (wird beim Schließen gestartet), Text zurückgeben
  fight(id, full, cost) {
    const B = Battle, add = fn => this.pending.push(fn);
    switch (id) {
      case 'frenzy': { const s = full ? 15 : 6; add(() => { B.frenzy = Math.max(B.frenzy, s); SFX.play('frenzy'); }); return `Raserei ${s} s (dreifacher Schaden)`; }
      case 'rush': { const s = full ? 90 : 30; add(() => { B.rush = Math.max(B.rush, s); }); return `Goldrausch ${s} s (doppelte Münzen)`; }
      case 'owl': { const s = full ? 45 : 15; add(() => { B.owlBuff = Math.max(B.owlBuff, s); }); return `Eulenruf ${s} s (+50 % Feuerrate)`; }
      case 'coins': { const c = cost * (full ? 6 : 2); S.coins += c; Game.emit('gain', c); B.spawnFlyers(B.W / 2, B.H / 2, 14, 'coin'); return `+${U.fmt(c)} Münzen`; }
      case 'purr': { const p = full ? 100 : 50; add(() => { B.purr = Math.min(100, B.purr + p); }); return full ? 'Schnurr-Meter voll – Raserei!' : '+50 Schnurr-Meter'; }
    }
    return '';
  },
  flush() {
    if (!this.pending.length) return;
    for (const fn of this.pending.splice(0)) fn();
    UI.toast('🎰 Kampf-Schub aktiv!', 'good');
  },

  grant(p) {
    const B = Battle;
    switch (p.id) {
      case 'coins': { const c = this.unit() * 80; Game.addCoins(c); B.spawnFlyers(B.W / 2, B.H / 2, 20, 'coin'); return `+${U.fmt(c)} Münzen`; }
      case 'bones': S.bones += 10; return '+10 Fischgräten';
      case 'bones2': S.bones += 30; return '+30 Fischgräten';
      case 'rush': this.pending.push(() => { B.rush = Math.max(B.rush, 30); }); return 'Goldrausch: 30 s doppelte Münzen (nach dem Schließen)';
      case 'frenzy': this.pending.push(() => { B.purr = 100; }); return 'Schnurr-Meter voll – Raserei bereit!';
      case 'chest': S.freeChestAt = Date.now(); return 'Gratis-Katzenkiste bereit (Reiter Katzen)';
      case 'minze': S.minze += 1; S.minzeTotal += 1; recalc(); return '+1 Katzenminze';
      case 'weapon': {
        const free = S.grid.indexOf(null);
        if (free < 0) { S.bones += 10; return 'Rucksack voll – dafür +10 Fischgräten'; }
        const w = { t: U.pick(WEAPON_IDS), r: Math.min(BOX_MAX_TIER, 2 + S.up.box) };
        S.grid[free] = w; Game.discover(w); recalc(); Game.emit('weapons');
        return `${WEAPONS[w.t].name} ${U.roman(w.r)} im Rucksack`;
      }
    }
    return p.name;
  },
};

// Schübe erst nach dem Schließen starten; ein offener Dreh wird dabei nicht abgebrochen
const _slotClose = UI.closeModal.bind(UI);
UI.closeModal = function () {
  const was = Slots.root && Slots.root.isConnected;
  _slotClose();
  if (was) { Slots.root = null; Slots.gamble = null; setTimeout(() => Slots.flush(), 50); }
};
