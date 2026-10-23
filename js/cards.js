'use strict';
// ---------------------------------------------------------------------------
// Karten-Animationen im Streifzug:
//   Ereignisse als Wischkarte – die Karte nach rechts wischen nimmt die erste Wahl (a),
//   nach links die zweite (b). Beim Ziehen kippt sie und ein Stempel zeigt Wahl und
//   Folgen; zu kurz gewischt federt sie zurück. Knöpfe und Pfeiltasten gehen weiterhin.
//   Segen-Wahl als Kartenfächer – die Karten kommen verdeckt als Stapel, fächern sich
//   mit Federbewegung auf und werden nacheinander aufgedeckt (Seltene und Pakte zuletzt).
//   Touch: erstes Antippen hebt eine Karte an, zweites wählt sie; mit Maus genügt ein Klick.
// Bei „Bewegung reduzieren“ entfallen Fächer und Aufdecken.
// ---------------------------------------------------------------------------

const Cards = {
  calm: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  // ---------------------------------------------------------------- Ereignis-Wischkarte
  event(e) {
    let done = false, keys = null;
    const go = (choice, dir) => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', keys);
      const root = $('#modalRoot'), card = $('.sw-card', root);
      SFX.play('paw');
      const finish = () => { UI.closeModal(); Path.resolve(e.id, choice); };
      if (!card || this.calm()) { finish(); return; }
      card.classList.add(dir > 0 ? 'pick-r' : 'pick-l');
      card.style.transition = 'transform 0.38s cubic-bezier(0.4, 0, 0.8, 0.4), opacity 0.38s';
      card.style.transform = `translate(${dir * 130}%, -6%) rotate(${dir * 24}deg)`;
      card.style.opacity = '0';
      setTimeout(finish, 360);
    };
    Path.modal({
      title: `${e.icon} ${e.title}`, cls: 'boonmodal pathmodal eventmodal swipemodal', noClose: true,
      html: `<div class="swipe">
          <i class="sw-peek p2"></i><i class="sw-peek p1"></i>
          <div class="sw-card">
            <span class="sw-stamp r">${e.a.label}<small>${e.a.hint}</small></span>
            <span class="sw-stamp l">${e.b.label}<small>${e.b.hint}</small></span>
            <div class="sw-ic">${e.icon}</div>
            <p class="evtext">${e.text}</p>
            <div class="sw-sides"><span class="l">‹ ${e.b.label}</span><span class="r">${e.a.label} ›</span></div>
          </div>
        </div>
        <p class="sw-tip muted">Karte wischen – oder unten wählen</p>
        <div class="evopts">
          <button class="boon" data-ev="b"><b>‹ ${e.b.label}</b><small>${e.b.hint}</small></button>
          <button class="boon" data-ev="a"><b>${e.a.label} ›</b><small>${e.a.hint}</small></button></div>`,
      buttons: [],
      onShow: root => {
        for (const el of $$('[data-ev]', root)) el.addEventListener('click', () => go(el.dataset.ev, el.dataset.ev === 'a' ? 1 : -1));
        keys = ev => {
          if (ev.key === 'ArrowRight') go('a', 1);
          else if (ev.key === 'ArrowLeft') go('b', -1);
        };
        document.addEventListener('keydown', keys);
        this.drag($('.sw-card', root), dir => go(dir > 0 ? 'a' : 'b', dir));
      },
    });
  },

  // Ziehen mit einem Finger/Zeiger; über die Schwelle (oder schnell geschnippt) = Wahl
  drag(card, pick) {
    if (!card) return;
    let id = null, x0 = 0, y0 = 0, dx = 0, t0 = 0, horiz = null;
    const set = () => {
      card.style.transform = `translateX(${dx}px) rotate(${dx * 0.07}deg)`;
      const k = Math.min(1, Math.abs(dx) / 90);
      card.style.setProperty('--sr', dx > 0 ? k : 0);
      card.style.setProperty('--sl', dx < 0 ? k : 0);
    };
    card.addEventListener('pointerdown', ev => {
      if (id !== null) return;
      id = ev.pointerId; x0 = ev.clientX; y0 = ev.clientY; dx = 0; t0 = performance.now(); horiz = null;
      card.style.transition = 'none';
      card.setPointerCapture(id);
      ev.stopPropagation();
    });
    card.addEventListener('pointermove', ev => {
      if (ev.pointerId !== id) return;
      const mx = ev.clientX - x0, my = ev.clientY - y0;
      if (horiz === null && Math.hypot(mx, my) > 6) horiz = Math.abs(mx) > Math.abs(my);
      if (!horiz) return; // senkrecht: Fenster darf scrollen
      dx = mx; set();
    });
    const up = ev => {
      if (ev.pointerId !== id) return;
      id = null;
      const v = dx / Math.max(1, performance.now() - t0); // px/ms
      if (Math.abs(dx) > 90 || (Math.abs(dx) > 30 && Math.abs(v) > 0.6)) { pick(dx > 0 ? 1 : -1); return; }
      // zurückfedern
      card.style.transition = `transform 0.45s ${this.SPRING}`;
      dx = 0; set();
    };
    card.addEventListener('pointerup', up);
    card.addEventListener('pointercancel', up);
  },

  // ---------------------------------------------------------------- Segen-Fächer
  fan(root) {
    const box = $('.boons', root);
    if (!box || !$('[data-boon]', box) || this.calm()) return;
    const cards = $$('.boon', box), touch = !matchMedia('(hover: hover)').matches;
    box.classList.add('fan');
    // Lage nebeneinander (quer/Desktop) oder untereinander (Handy hochkant)
    const rects = cards.map(c => c.getBoundingClientRect());
    const row = rects.length > 1 && Math.abs(rects[0].top - rects[1].top) < 4;
    const mid = Math.floor(cards.length / 2), c0 = rects[mid];
    let ready = false, lifted = null;
    cards.forEach((c, i) => {
      const off = i - mid;
      c.style.setProperty('--rot', `${row ? off * 6 : off * 1.5}deg`);
      c.style.setProperty('--ty', `${row ? Math.abs(off) * 8 : 0}px`);
      const back = document.createElement('span');
      back.className = 'cback';
      back.innerHTML = '<i>🐾</i>';
      c.appendChild(back);
      // aus dem Stapel in der Mitte herausfedern
      const r = rects[i], dx = c0.left - r.left + (i - mid) * 4, dy = c0.top - r.top + (i - mid) * 3;
      c.animate([
        { transform: `translate(${dx}px, ${dy}px) rotate(${(i - mid) * -3}deg) scale(0.86)`, opacity: 0.6 },
        { transform: `translateY(${row ? Math.abs(off) * 8 : 0}px) rotate(${row ? off * 6 : off * 1.5}deg)`, opacity: 1 },
      ], { duration: 520, delay: 120 + i * 70, easing: this.SPRING, fill: 'backwards' });
    });
    // aufdecken: gewöhnliche zuerst, Seltene und Pakte zuletzt
    const order = cards.map((c, i) => ({ c, i, w: c.matches('.rare, .pact') ? 1 : 0 })).sort((a, b) => a.w - b.w || a.i - b.i);
    let t = 880; // nach dem Herausfedern aller Karten
    order.forEach(({ c, w }, k) => {
      const at = t + (w ? 260 : 0);
      setTimeout(() => {
        if (!c.isConnected) return;
        c.animate([{ transform: getComputedStyle(c).transform }, { transform: `${getComputedStyle(c).transform} scaleX(0.02)` }, { transform: getComputedStyle(c).transform }],
          { duration: w ? 520 : 340, easing: 'ease-in-out' });
        setTimeout(() => { c.classList.add('shown'); SFX.play(w ? 'reveal' : 'tick'); }, w ? 260 : 170);
        if (k === order.length - 1) setTimeout(() => { ready = true; box.classList.add('ready'); }, w ? 520 : 340);
      }, at);
      t = at + 200;
    });
    // Klicks abfangen, bis aufgedeckt; am Handy erst anheben, dann wählen; Wahl mit kurzer Animation
    box.addEventListener('click', ev => {
      const c = ev.target.closest('.boon');
      if (!c || c.dataset.go) return; // durchgelassener Klick → eigentliche Wahl (run.js)
      ev.stopPropagation(); ev.preventDefault();
      if (!ready) return;
      if (touch && lifted !== c) {
        if (lifted) lifted.classList.remove('lift');
        lifted = c; c.classList.add('lift'); box.classList.add('has-lift'); SFX.play('paw');
        return;
      }
      ready = false;
      box.classList.add('chosen'); c.classList.add('picked');
      SFX.play('buy');
      setTimeout(() => { c.dataset.go = '1'; c.click(); }, 380);
    }, true);
  },
};

// Ereignisse über die Wischkarte zeigen
Path.event = function () {
  const e = PATH_EVENT_BY_ID[S.run.event];
  if (!e) { this.next(); return; }
  Cards.event(e);
};

// Segen-Wahl (nur das Fenster aus Run.offerChoice: Klasse genau „boonmodal“ mit Segen-Karten)
const _cardsModal = UI.modal;
UI.modal = function (opts) {
  if (opts && !opts.fanned && opts.cls === 'boonmodal' && /data-boon=/.test(opts.html || '')) {
    const show = opts.onShow; // Warteschlange ruft UI.modal erneut auf → nur einmal einhängen
    opts = { ...opts, fanned: true, onShow: root => { if (show) show(root); Cards.fan(root); } };
  }
  return _cardsModal.call(this, opts);
};
