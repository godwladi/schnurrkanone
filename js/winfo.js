'use strict';
// ---------------------------------------------------------------------------
// Waffen-Infokarte statt des grauen System-Tooltips: Antippen (Touch) bzw. Maus
// darüber zeigt eine Karte mit Symbol, Rarität, Stufe, Werten, Stufen-Leiste,
// Eigenschaft, Grenzbruch-Fähigkeit, Set-Bonus und Verschmelz-Hinweis.
// Doppeltippen/Doppelklick legt weiterhin an bzw. ab, Ziehen verschmilzt.
// ---------------------------------------------------------------------------

const WInfo = {
  el: null, cell: null, hoverT: null,

  init() {
    const tc = $('#tabContent');
    // Maus: kurz über einer Waffe verweilen
    tc.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const c = e.target.closest('.cell.item');
      clearTimeout(this.hoverT);
      if (!c) return;
      if (c === this.cell) return;
      this.hoverT = setTimeout(() => this.show(c), 280);
    });
    tc.addEventListener('pointerout', e => {
      if (e.pointerType !== 'mouse') return;
      const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.cell.item');
      if (to === this.cell) return;
      clearTimeout(this.hoverT);
      if (!to) this.hide();
    });
    tc.addEventListener('scroll', () => this.hide(), { passive: true });
    document.addEventListener('pointerdown', e => {
      if (this.el && !e.target.closest('#wInfo') && !(e.pointerType !== 'mouse' && e.target.closest('.cell.item') === this.cell)) this.hide();
    }, true);
    document.addEventListener('dragstart', () => this.hide(), true);
  },

  // Touch: einfaches Tippen (aus TouchDrag) – zweites Tippen auf dieselbe Waffe legt an/ab
  tap(pos) {
    const c = $(`#tabContent .cell.item[data-k="${pos.k}"][data-i="${pos.i}"]`);
    if (c) this.show(c);
  },

  show(c) {
    const pos = { k: c.dataset.k, i: +c.dataset.i }, w = Game.getAt(pos);
    if (!w) return;
    this.hide();
    this.cell = c;
    const d = WEAPONS[w.t], tier = TIERS[w.r - 1], ra = Limit.rarity(w.r), stars = Limit.stars(w);
    const col = tier.color === 'rainbow' ? '#ffffff' : tier.color;
    const sb = setBonus(w.t), heavy = w.v === 'heavy' ? 1.3 : 1;
    const shot = d.dmg * Econ.tierMult(w.r) * R.dmgMult * (1 + sb.dmg) * heavy;
    const rate = d.rate * R.rateMult * (1 + sb.rate);
    const dps = Econ.weaponDps(w) * setFactor(w) * R.dmgMult * R.rateMult;
    const pellets = d.pellets + sb.pellets, pierce = d.pierce + sb.pierce;
    const special = [pellets > 1 && `${pellets} Kugeln`, pierce > 0 && `${pierce + 1} Ziele`, d.splash && 'Explosion', d.arc && 'Bogenwurf'].filter(Boolean).join(' · ') || 'Einzelschuss';
    const where = pos.k === 's' ? (pos.i === 0 ? 'Hauptkatze' : `Geisterkatze ${pos.i}`) : 'Rucksack';
    const set = WEAPON_SETS[w.t], next = set.find(s => sb.n < s.n);
    const segs = Array.from({ length: MAX_TIER }, (_, r) => `<i class="${r < w.r ? 'on' : ''} ${r >= LIMIT_FROM - 1 ? 'lb' : ''}" style="--sc:${TIERS[r].color === 'rainbow' ? '#fff' : TIERS[r].color}"></i>`).join('');
    const el = document.createElement('div');
    el.id = 'wInfo';
    el.style.setProperty('--wc', col); el.style.setProperty('--rc', ra.col);
    el.innerHTML = `
      <div class="wi-head">
        <div class="wi-icon ${stars ? 'lb' : ''} ${tier.color === 'rainbow' ? 'rainbow' : ''}"><span>${d.icon}</span></div>
        <div class="wi-title">
          <b>${d.name} <em>${U.roman(w.r)}</em></b>
          <div class="wi-tags"><span class="wi-rar">${ra.id}</span><span>${ra.name}</span><span class="wi-tier">${tier.name}</span></div>
        </div>
      </div>
      <div class="wi-bar">${segs}</div>
      <div class="wi-stats">
        <div><span>DPS</span><b>${U.fmt(dps)}</b></div>
        <div><span>Schaden</span><b>${U.fmt(shot)}</b></div>
        <div><span>Schüsse/s</span><b>${rate.toFixed(1)}</b></div>
      </div>
      <p class="wi-line">🎯 ${special}<small>${d.desc}</small></p>
      ${w.v ? `<p class="wi-line var" style="--vc:${VARIANTS[w.v].col}">${VARIANTS[w.v].icon} <b>${VARIANTS[w.v].name}</b><small>${VARIANTS[w.v].desc}</small></p>` : ''}
      ${stars ? `<p class="wi-line lbl">${LIMIT_SKILLS[w.t].icon} <b>${LIMIT_SKILLS[w.t].name}</b><small>${LIMIT_SKILLS[w.t].desc(stars)}</small></p>` : ''}
      <p class="wi-line set ${sb.level ? 'on' : ''}">🧩 <b>Set ${sb.n}/4</b><small>${sb.level ? WEAPON_SETS[w.t][sb.level - 1].desc + ' aktiv' : 'kein Set-Bonus'}${next ? ` · ab ${next.n}: ${next.desc}` : ''}</small></p>
      <div class="wi-foot">
        <span class="wi-where">${pos.k === 's' ? '✅' : '🎒'} ${where}</span>
        <span>${w.r < MAX_TIER ? `2× gleich → ${U.roman(w.r + 1)}${w.r + 1 >= LIMIT_FROM ? ' (Grenzbruch!)' : ''}` : 'Höchste Stufe'}</span>
      </div>
      <small class="wi-hint">${Perf.touch ? 'Doppeltippen: an-/ablegen · Ziehen: verschmelzen' : 'Doppelklick: an-/ablegen · Ziehen: verschmelzen'}</small>`;
    document.body.appendChild(el);
    this.el = el;
    // über der Waffe, sonst darunter; immer ganz im Bild
    const r = c.getBoundingClientRect(), cw = el.offsetWidth, ch = el.offsetHeight, m = 8;
    let x = r.left + r.width / 2 - cw / 2, y = r.top - ch - 10, below = false;
    if (y < m + 40) { y = r.bottom + 10; below = true; }
    x = U.clamp(x, m, innerWidth - cw - m); y = U.clamp(y, m, innerHeight - ch - m);
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.setProperty('--ax', `${U.clamp(r.left + r.width / 2 - x, 18, cw - 18)}px`);
    el.classList.add(below ? 'below' : 'above');
    c.classList.add('inspect');
  },

  hide() {
    clearTimeout(this.hoverT);
    if (this.el) this.el.remove();
    if (this.cell) this.cell.classList.remove('inspect');
    this.el = null; this.cell = null;
  },
};

// System-Tooltip der Waffenfelder entfernen (die Karte ersetzt ihn)
const _wiCell = UI.cellHtml;
UI.cellHtml = function (w, k, i, locked) {
  const h = _wiCell.call(this, w, k, i, locked);
  return w && !locked ? h.replace(/ title="[^"]*"/, '') : h;
};
// Reiterwechsel, Neuzeichnen, Schublade zu: Karte weg
const _wiRender = UI.renderTab;
UI.renderTab = function () { WInfo.hide(); _wiRender.call(this); };
// Touch: einfaches Tippen zeigt die Karte, Doppeltippen legt an/ab (dann Karte weg)
const _wiUp = TouchDrag.up;
TouchDrag.up = function (e) {
  const d = this.drag, was = d && e.pointerId === d.id && !d.active ? d.pos : null;
  _wiUp.call(this, e);
  if (!was) return;
  if (this.lastTap && this.lastTap.k === was.k && this.lastTap.i === was.i) WInfo.tap(was); else WInfo.hide();
};

window.addEventListener('load', () => WInfo.init());
