'use strict';
// ---------------------------------------------------------------------------
// Grafik-Stufen gegen warme Handys: Auflösung der Leinwand (iPhone rechnet sonst
// mit 3× Pixeldichte), Bildrate und Teilchen-Obergrenzen. „Auto“ wählt auf
// Touch-Geräten „Ausgeglichen“, am PC „Hoch“. Hinter offenen Menüs und Fenstern
// reichen immer 30 Bilder pro Sekunde.
// ---------------------------------------------------------------------------

const GFX_MODES = {
  high:     { name: 'Hoch',          icon: '✨', dpr: 3,   fps: 60, parts: 600, amb: 110, desc: 'Volle Schärfe, 60 Bilder/s' },
  balanced: { name: 'Ausgeglichen',  icon: '⚖️', dpr: 2,   fps: 60, parts: 380, amb: 70,  desc: 'Etwas weniger Pixel und Teilchen, 60 Bilder/s' },
  eco:      { name: 'Akku sparen',   icon: '🔋', dpr: 1.5, fps: 30, parts: 220, amb: 35,  desc: '30 Bilder/s, weniger Teilchen – bleibt kühl' },
};

const Perf = {
  touch: matchMedia('(pointer: coarse)').matches,
  mode() { const m = S.gfx; return GFX_MODES[m] ? m : (this.touch ? 'balanced' : 'high'); },
  cfg() { return GFX_MODES[this.mode()]; },
  dpr() { return Math.min(window.devicePixelRatio || 1, this.cfg().dpr); },
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
