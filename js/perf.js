'use strict';
// ---------------------------------------------------------------------------
// Grafik-Stufen gegen warme Handys: Auflösung der Leinwand (iPhone rechnet sonst
// mit 3× Pixeldichte), Bildrate und Teilchen-Obergrenzen. „Auto“ wählt auf
// Touch-Geräten „Ausgeglichen“, am PC „Hoch“. Hinter offenen Menüs und Fenstern
// reichen immer 30 Bilder pro Sekunde.
// ---------------------------------------------------------------------------

const GFX_MODES = {
  high:     { name: 'Hoch',          icon: '✨', dpr: 3,   fps: 60, parts: 600, amb: 110, desc: 'Volle Schärfe, 60 Bilder/s' },
  balanced: { name: 'Ausgeglichen',  icon: '⚖️', dpr: 1.75, fps: 60, parts: 300, amb: 60,  desc: 'Etwas weniger Pixel und Teilchen, 60 Bilder/s' },
  eco:      { name: 'Akku sparen',   icon: '🔋', dpr: 1.5, fps: 30, parts: 220, amb: 35,  desc: '30 Bilder/s, weniger Teilchen – bleibt kühl' },
};

const Perf = {
  touch: matchMedia('(pointer: coarse)').matches,
  mode() { const m = S.gfx; return GFX_MODES[m] ? m : (this.touch ? 'balanced' : 'high'); },
  cfg() { return GFX_MODES[this.mode()]; },
  // „Auto“ regelt die Auflösung zusätzlich nach der gemessenen Rechenzeit (dyn 0,65–1)
  dyn: 1, ema: 0, slowT: 0, fastT: 0,
  auto() { return !GFX_MODES[S.gfx]; },
  dpr() { return Math.max(1, Math.min(window.devicePixelRatio || 1, this.cfg().dpr) * (this.auto() ? this.dyn : 1)); },
  // aus Main.loop: Rechenzeit eines Bildes (Update + Zeichnen) in ms
  sample(ms, dt) {
    this.ema += (ms - this.ema) * 0.05;
    if (!this.auto() || document.body.classList.contains('sheet-open')) return;
    const budget = 1000 / this.cfg().fps;
    if (this.ema > budget * 0.6) { this.slowT += dt; this.fastT = 0; } else if (this.ema < budget * 0.3) { this.fastT += dt; this.slowT = 0; } else { this.slowT = 0; this.fastT = 0; }
    if (this.slowT > 2.5 && this.dyn > 0.65) { this.dyn = Math.max(0.65, this.dyn - 0.12); this.slowT = 0; Battle.resize(); }
    else if (this.fastT > 12 && this.dyn < 1) { this.dyn = Math.min(1, this.dyn + 0.08); this.fastT = 0; Battle.resize(); }
  },
  // Spielfeld kaum sichtbar (Schublade/Fenster offen) → halbe Bildrate genügt
  fps() {
    const b = document.body.classList;
    return (b.contains('sheet-open') || (typeof UI !== 'undefined' && UI.modalOpen)) ? 30 : this.cfg().fps;
  },
  set(mode) {
    S.gfx = mode;
    document.body.dataset.gfxMode = this.mode();
    if (typeof Battle !== 'undefined' && Battle.cv) Battle.resize();
  },
  apply() { document.body.dataset.gfxMode = this.mode(); },
};
