'use strict';
// ---------------------------------------------------------------------------
// Touch & Mobil (iPhone-PWA): Pointer-Drag im Rucksack, Doppeltipp,
// Zoom-/Gummiband-Sperre, Audio-Fortsetzung nach Hintergrund.
// Die Maus behält das HTML5-Drag & Drop und den Doppelklick aus ui.js.
// ---------------------------------------------------------------------------

const TouchDrag = {
  drag: null,        // { pos, id, x0, y0, el, ghost, active, target }
  lastTap: null,     // { k, i, t } für Doppeltipp
  suppressDbl: 0,    // Zeitpunkt, bis zu dem ein nachgereichtes dblclick ignoriert wird
  DRAG_PX: 7,
  DBL_MS: 320,

  init() {
    const tc = $('#tabContent');
    tc.addEventListener('pointerdown', e => this.down(e));
    window.addEventListener('pointermove', e => this.move(e), { passive: false });
    window.addEventListener('pointerup', e => this.up(e));
    window.addEventListener('pointercancel', e => this.cancel(e));
    // Natives Drag & Drop und Doppelklick nicht doppelt auslösen, wenn der Finger zieht/tippt
    tc.addEventListener('dragstart', e => { if (this.drag || document.body.classList.contains('touchmode')) e.preventDefault(); }, true);
    tc.addEventListener('dblclick', e => { if (performance.now() < this.suppressDbl) e.stopPropagation(); }, true);
    tc.addEventListener('contextmenu', e => { if (e.target.closest('.cell.item') && document.body.classList.contains('touchmode')) e.preventDefault(); });
  },

  posOf(el) { return { k: el.dataset.k, i: +el.dataset.i }; },

  down(e) {
    if (e.pointerType === 'mouse') { document.body.classList.remove('touchmode'); return; }
    if (!e.isPrimary) return;
    document.body.classList.add('touchmode');
    const el = e.target.closest('.cell.item');
    if (!el) return;
    SFX.init();
    this.drag = { pos: this.posOf(el), id: e.pointerId, x0: e.clientX, y0: e.clientY, el, ghost: null, active: false, target: null };
  },

  move(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    e.preventDefault();
    if (!d.active) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < this.DRAG_PX) return;
      this.start(d);
    }
    d.ghost.style.transform = `translate(${e.clientX - d.w / 2}px, ${e.clientY - d.h / 2}px) scale(1.12)`;
    this.setTarget(this.targetAt(e.clientX, e.clientY));
    this.edgeScroll(e.clientY);
  },

  start(d) {
    const w = Game.getAt(d.pos);
    if (!w) { this.drag = null; return; }
    if (Game.frozenAt(d.pos)) { this.drag = null; Game.frozenMsg(d.pos); return; }
    d.active = true;
    const r = d.el.getBoundingClientRect();
    d.w = r.width; d.h = r.height;
    const g = d.el.cloneNode(true);
    g.classList.add('touchghost');
    g.removeAttribute('title');
    g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
    document.body.appendChild(g);
    d.ghost = g;
    d.el.classList.add('dragging');
    for (const o of $$('#tabContent .cell.item')) {
      const ow = Game.getAt(this.posOf(o));
      if (o !== d.el && ow && ow.t === w.t && ow.r === w.r && w.r < MAX_TIER) o.classList.add('mergeable');
    }
    this.lastTap = null;
  },

  targetAt(x, y) {
    const hit = document.elementFromPoint(x, y);
    if (!hit) return null;
    return hit.closest('#tabContent .cell') || hit.closest('#trash');
  },

  setTarget(t) {
    const d = this.drag;
    if (d.target === t) return;
    if (d.target) d.target.classList.remove('over');
    d.target = t;
    if (t && t !== d.el) t.classList.add('over');
  },

  // Am oberen/unteren Rand der Reiterfläche mitscrollen
  edgeScroll(y) {
    const tc = $('#tabContent'), r = tc.getBoundingClientRect(), m = 40;
    if (y < r.top + m) tc.scrollTop -= (r.top + m - y) * 0.4;
    else if (y > r.bottom - m) tc.scrollTop += (y - (r.bottom - m)) * 0.4;
  },

  up(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    if (d.active) {
      const t = this.targetAt(e.clientX, e.clientY);
      this.cleanup();
      if (t && t.id === 'trash') Game.scrap(d.pos);
      else if (t && t.classList.contains('cell')) Game.move(d.pos, this.posOf(t));
      return;
    }
    this.cleanup();
    // Tippen: zweites Tippen auf dieselbe Zelle = an-/ablegen
    const now = performance.now(), lt = this.lastTap;
    if (lt && lt.k === d.pos.k && lt.i === d.pos.i && now - lt.t < this.DBL_MS) {
      this.lastTap = null;
      this.suppressDbl = now + 600;
      Game.quickEquip(d.pos);
    } else this.lastTap = { ...d.pos, t: now };
  },

  cancel(e) {
    if (this.drag && e.pointerId === this.drag.id) this.cleanup();
  },

  cleanup() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (d.ghost) d.ghost.remove();
    $$('#tabContent .cell').forEach(x => x.classList.remove('mergeable', 'over', 'dragging'));
    const tr = $('#trash'); if (tr) tr.classList.remove('over');
  },
};

const Mobile = {
  init() {
    TouchDrag.init();
    // Safari: Pinch-Zoom sperren (user-scalable=no wird ignoriert); Doppeltipp-Zoom
    // verhindert touch-action: manipulation im CSS, ohne schnelle Doppeltipps auf Knöpfe zu schlucken.
    for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
    // Langes Drücken: keine Textmarkierung und kein Kontextmenü (außer in Eingabefeldern)
    const editable = t => t && t.closest && t.closest('input, textarea, [contenteditable]');
    document.addEventListener('selectstart', e => { if (!editable(e.target)) e.preventDefault(); });
    document.addEventListener('contextmenu', e => { if (!editable(e.target) && matchMedia('(pointer: coarse)').matches) e.preventDefault(); });

    // Audio: iOS gibt WebAudio erst nach einer echten Berührung frei (touchend/click)
    // und unterbricht den Kontext im Hintergrund ("interrupted"). Bei jeder
    // Berührung und beim Zurückkehren fortsetzen.
    const wake = () => {
      const c = SFX.ctx;
      if (!c) { SFX.init(); return; }
      if (c.state !== 'running' && document.visibilityState === 'visible') c.resume().catch(() => {});
    };
    for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) document.addEventListener(ev, wake, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { if (SFX.hum) SFX.laserHum(false); return; } // Spielschleife ruht, Brummen nicht hängen lassen
      if (SFX.ctx) wake();
    });
    window.addEventListener('pageshow', wake);

    // Service Worker für den Offline-Betrieb (nur über HTTPS oder localhost verfügbar)
    if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service Worker nicht registriert:', err));
    }
  },
};

window.addEventListener('load', () => Mobile.init());
