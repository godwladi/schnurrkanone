'use strict';
// ---------------------------------------------------------------------------
// Power-up-Anzeige oben rechts: jeder laufende Zeit-Effekt (Goldrausch, Wetter-Ereignisse,
// Raserei, Eulenruf, Espresso) als rundes Symbol mit ablaufendem Ring und Sekunden.
// Läuft einer ab, verpufft er in seiner Farbe (Funken, Sterne, beim Gewitter ein Blitz).
// Die Spalte steht unter der Raumleiste; die Combo-Anzeige rückt links daneben.
// Ersetzt die alten Pillen links oben (lagen unter der Knopf-Spalte).
// ---------------------------------------------------------------------------

const PowerUps = {
  el: null, items: {}, max: {},

  // aktuelle Effekte: id → { icon, name, col, t }
  current() {
    const B = Battle, out = [];
    if (B.rush > 0) out.push({ id: 'rush', icon: '💰', name: 'Goldrausch ×2', col: '#ffd34d', t: B.rush });
    if (Events.cur) out.push({ id: 'ev-' + Events.cur.id, icon: Events.cur.icon, name: Events.cur.name, col: Events.cur.color, t: Events.t, max: EVENT_DURATION, fx: Events.cur.id });
    if (B.frenzy > 0) out.push({ id: 'frenzy', icon: '🔥', name: 'Raserei', col: '#ff7ad9', t: B.frenzy });
    if (B.owlBuff > 0) out.push({ id: 'owl', icon: '🦉', name: 'Eulenruf', col: '#fde68a', t: B.owlBuff });
    if (Talents.espresso > 0) out.push({ id: 'espresso', icon: '☕', name: 'Espresso', col: '#ffd6a5', t: Talents.espresso });
    return out;
  },

  init() {
    this.el = document.createElement('div');
    this.el.id = 'pups';
    $('#battle').appendChild(this.el);
    setInterval(() => this.tick(), 100);
  },

  tick() {
    const B = Battle;
    if (!this.el || !B.cv) return;
    const cur = this.current(), seen = new Set();
    for (const p of cur) {
      seen.add(p.id);
      // Gesamtdauer: feste (Ereignis) oder der höchste gesehene Wert (wird bei Verlängerung größer)
      this.max[p.id] = p.max || Math.max(this.max[p.id] || 0, p.t);
      let it = this.items[p.id];
      if (!it) {
        it = document.createElement('div');
        it.className = 'pup'; it.title = p.name;
        it.style.setProperty('--pc', p.col);
        it.innerHTML = `<i class="pi">${p.icon}</i><b></b>`;
        it.dataset.fx = p.fx || p.id;
        this.el.appendChild(it);
        this.items[p.id] = it;
      }
      it.style.setProperty('--p', (p.t / this.max[p.id] * 360).toFixed(1) + 'deg');
      const s = Math.ceil(p.t), txt = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
      const b = it.querySelector('b'); if (b.textContent !== txt) b.textContent = txt;
      it.classList.toggle('low', p.t < 3);
    }
    for (const id of Object.keys(this.items)) if (!seen.has(id)) this.poof(id);
    // Spalte unter der Raumleiste; Combo-Anzeige weicht nach links aus
    const top = (B.uiTop ? B.uiTop() : 110) + 4;
    if (this.el.dataset.top !== String(top)) { this.el.dataset.top = String(top); this.el.style.top = top + 'px'; }
    B.railW = cur.length ? this.el.offsetWidth + 8 : 0;
  },

  // abgelaufen: aufblähen, verblassen, Funken in der Effekt-Farbe
  poof(id) {
    const it = this.items[id];
    delete this.items[id]; delete this.max[id];
    if (!it) return;
    const r = it.getBoundingClientRect(), pr = this.el.getBoundingClientRect();
    const cx = r.left - pr.left + r.width / 2, cy = r.top - pr.top + r.width / 2, col = getComputedStyle(it).getPropertyValue('--pc');
    it.classList.add('poof');
    const fx = it.dataset.fx;
    const shapes = fx === 'meteor' || fx === 'goldrain' ? '★' : fx === 'rush' ? '●' : fx === 'storm' ? '⚡' : '✦';
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span');
      s.className = 'pspark'; s.textContent = i % 3 ? '' : shapes;
      const a = i / 12 * Math.PI * 2 + Math.random() * 0.4, d = 34 + Math.random() * 26;
      s.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;--pc:${col}`;
      this.el.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
    if (fx === 'storm') { const z = document.createElement('span'); z.className = 'pzap'; z.style.cssText = `left:${cx}px;top:${cy}px`; this.el.appendChild(z); setTimeout(() => z.remove(), 400); }
    SFX.play('poof');
    setTimeout(() => it.remove(), 520);
  },
};

// alte Pillen links oben abschalten (Goldrausch zeichnet battle.js, Ereignis events.js)
Events.drawPill = function () {};
Battle.pillsOff = true;

const _playPu = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  if (name === 'poof') { this.noiseF ? this.noiseF(0.18, 0.07, 0, 2600, 'highpass') : this.noise(0.18, 0.06); this.tone(880, 0.16, 'sine', 0.05, -500); return; }
  return _playPu.call(this, name, arg);
};

window.addEventListener('load', () => PowerUps.init());
