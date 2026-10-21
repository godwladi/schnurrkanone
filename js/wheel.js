'use strict';
// ---------------------------------------------------------------------------
// Glücksrad: einmal am Tag gratis drehen, danach für Fischgräten.
// Preise: Münzregen, Gräten, Goldrausch, Raserei, Gratis-Katzenkiste,
// Waffenkiste (eine Stufe über der Kistenqualität) und selten Katzenminze.
// ---------------------------------------------------------------------------

const WHEEL_COST = 15;
const WHEEL = [
  { id: 'coins',  icon: '💰', name: 'Münzregen',      col: '#ffd34d', w: 22 },
  { id: 'bones',  icon: '🦴', name: '+10 Gräten',      col: '#f4efff', w: 20 },
  { id: 'rush',   icon: '✨', name: 'Goldrausch',      col: '#ffb347', w: 14 },
  { id: 'frenzy', icon: '😻', name: 'Raserei',         col: '#ff7ad9', w: 14 },
  { id: 'chest',  icon: '🎁', name: 'Katzenkiste',     col: '#9d7bff', w: 10 },
  { id: 'weapon', icon: '⚔️', name: 'Waffenkiste',     col: '#5ab0ff', w: 12 },
  { id: 'bones2', icon: '🦴', name: '+30 Gräten',      col: '#6ee7a0', w: 6 },
  { id: 'minze',  icon: '🌿', name: 'Katzenminze',     col: '#5effc8', w: 2 },
];

const Wheel = {
  st() { return (S.wheel = S.wheel || { day: '', spins: 0 }); },
  ready() { return this.st().day !== U.today(); },
  spinning: false, angle: 0,

  show() {
    const free = this.ready(), n = WHEEL.length, seg = 360 / n;
    const grad = WHEEL.map((p, i) => `${p.col} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
    UI.modal({
      title: '🎡 Glücksrad', cls: 'wheelmodal',
      html: `<div class="wheelwrap"><i class="wpin"></i>
          <div class="wheel" style="background:conic-gradient(${grad});transform:rotate(${this.angle}deg)">
            ${WHEEL.map((p, i) => `<span style="transform:rotate(${(i + 0.5) * seg}deg)"><b>${p.icon}</b></span>`).join('')}
          </div><i class="whub">🐾</i></div>
        <p class="wres muted">${free ? 'Heute ist ein Dreh <b>gratis</b>!' : `Weitere Drehs: ${WHEEL_COST} 🦴`}</p>`,
      buttons: [{ label: 'Schließen' }],
      onShow: root => {
        const btn = document.createElement('button');
        btn.className = `btn ${free ? 'gold' : 'primary'} wide wspin`;
        btn.innerHTML = free ? '🎡 Gratis drehen!' : `🎡 Drehen · ${WHEEL_COST} 🦴`;
        $('.wres', root).after(btn);
        btn.addEventListener('click', () => this.spin(root, btn));
      },
    });
  },

  spin(root, btn) {
    if (this.spinning) return;
    const free = this.ready();
    if (!free && S.bones < WHEEL_COST) { SFX.play('error'); UI.toast(`Zu wenig Fischgräten (${WHEEL_COST} 🦴)`, 'warn'); return; }
    if (free) this.st().day = U.today(); else S.bones -= WHEEL_COST;
    this.st().spins++;
    this.spinning = true; btn.disabled = true;
    const pick = U.weightedPick(WHEEL.map((p, i) => ({ ...p, i }))), seg = 360 / WHEEL.length;
    // Zeiger oben: Segment i liegt bei (i + 0.5)·seg, also so weit zurückdrehen
    const target = 360 * 6 + (360 - (pick.i + 0.5) * seg) + U.rand(-seg * 0.3, seg * 0.3);
    this.angle = this.angle - (this.angle % 360) + target;
    const wheel = $('.wheel', root);
    wheel.style.transition = 'transform 4.2s cubic-bezier(0.15, 0.85, 0.2, 1)';
    wheel.style.transform = `rotate(${this.angle}deg)`;
    SFX.init();
    let ticks = 0;
    const tickT = setInterval(() => { if (++ticks > 26) clearInterval(tickT); SFX.play('paw'); }, 150);
    setTimeout(() => {
      clearInterval(tickT);
      this.spinning = false;
      const text = this.grant(pick);
      SFX.play('achievement');
      $('.wres', root).innerHTML = `<span class="wwin">${pick.icon} <b>${text}</b></span>`;
      btn.disabled = false;
      btn.className = 'btn primary wide wspin';
      btn.innerHTML = `🎡 Nochmal · ${WHEEL_COST} 🦴`;
      Save.write();
    }, 4300);
  },

  grant(p) {
    const B = Battle;
    switch (p.id) {
      case 'coins': { const c = Econ.coins(S.stage) * R.coinMult * 80; Game.addCoins(c); B.spawnFlyers(B.W / 2, B.H / 2, 20, 'coin'); return `+${U.fmt(c)} Münzen`; }
      case 'bones': S.bones += 10; return '+10 Fischgräten';
      case 'bones2': S.bones += 30; return '+30 Fischgräten';
      case 'rush': B.rush = Math.max(B.rush, 30); return 'Goldrausch: 30 s doppelte Münzen';
      case 'frenzy': B.purr = 100; return 'Schnurr-Meter voll – Raserei bereit!';
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
