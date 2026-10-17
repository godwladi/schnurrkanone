'use strict';
// ---------------------------------------------------------------------------
// Handy/Tablet: Spielfeld im Vollbild, Menü als Schublade.
// Durchsichtige Symbolleiste (hochkant unten, quer rechts) mit den vier
// Hauptreitern und einem Pfeil für den Rest. Ein Tipp öffnet die Schublade mit
// dem Reiter, derselbe Tipp (oder der Griff) schließt sie wieder.
// Desktop (breit und hoch genug) behält die feste Seitenleiste.
// Wird nach main.js geladen, damit die Reiter (UI.init) schon existieren.
// ---------------------------------------------------------------------------

const Dock = {
  MAIN: ['weapons', 'upgrades', 'cats', 'pets'],
  mq: matchMedia('(max-width: 1000px), (max-height: 500px)'),
  lastTab: null,

  active() { return this.mq.matches; },
  isOpen() { return document.body.classList.contains('sheet-open'); },

  init() {
    const battle = $('#battle'), panel = $('#panel');
    const extra = TABS.filter(t => !this.MAIN.includes(t.id));
    const btn = t => `<button class="dk" data-tab="${t.id}" aria-label="${t.name}" title="${t.name}"><span class="dki">${t.icon}</span><i class="dot"></i></button>`;

    const dock = document.createElement('nav');
    dock.id = 'dock';
    dock.innerHTML = TABS.filter(t => this.MAIN.includes(t.id)).map(btn).join('') +
      `<button class="dk more" aria-label="Weitere Menüs" title="Weitere Menüs"><span class="dki">›</span><i class="dot"></i></button>`;
    battle.appendChild(dock);

    const more = document.createElement('div');
    more.id = 'dockMore';
    more.innerHTML = extra.map(t => `<button class="dk wide" data-tab="${t.id}"><span class="dki">${t.icon}</span><span class="dkn">${t.name}</span><i class="dot"></i></button>`).join('');
    battle.appendChild(more);

    const handle = document.createElement('div');
    handle.id = 'sheetHandle';
    handle.innerHTML = '<i class="grip"></i><span class="sh-title"></span><button class="sh-close" aria-label="Menü schließen">✕</button>';
    panel.prepend(handle);

    // Tippen auf Symbole (Pointer-Events stoppen, damit kein Pfotenhieb im Spielfeld landet)
    for (const el of [dock, more]) {
      el.addEventListener('pointerdown', e => e.stopPropagation());
      el.addEventListener('click', e => {
        const b = e.target.closest('.dk'); if (!b) return;
        e.stopPropagation();
        if (b.classList.contains('more')) { this.toggleMore(); return; }
        this.select(b.dataset.tab);
      });
    }
    // Griff: Tippen oder nach unten/rechts wischen schließt
    let y0 = null, x0 = null;
    handle.addEventListener('pointerdown', e => { y0 = e.clientY; x0 = e.clientX; });
    handle.addEventListener('pointerup', e => {
      if (y0 === null) return;
      const dy = e.clientY - y0, dx = e.clientX - x0;
      y0 = null;
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8 || dy > 40 || dx > 40) this.close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && this.isOpen() && !$('#modalRoot.show')) this.close(); });
    // Außerhalb tippen schließt nur das Pfeil-Menü (Spielfeld-Tipps bleiben Pfotenhiebe)
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#dockMore, #dock')) this.toggleMore(false); });

    // Hinweis-Punkte der versteckten Reiterleiste spiegeln
    new MutationObserver(() => this.syncDots()).observe($('#tabs'), { subtree: true, attributes: true, attributeFilter: ['class'] });
    this.syncDots();

    // Reiterwechsel aus dem Spiel heraus (z. B. „Zu den Perks“) öffnet die Schublade
    this.lastTab = UI.tab;
    const render = UI.renderTab.bind(UI);
    UI.renderTab = () => {
      render();
      if (UI.tab !== this.lastTab) { this.lastTab = UI.tab; if (this.active()) this.open(); }
      this.syncActive();
    };

    this.mq.addEventListener('change', () => { this.close(); setTimeout(() => Battle.resize(), 50); });
    Battle.resize();
    this.syncActive();
  },

  select(tab) {
    this.toggleMore(false);
    if (this.isOpen() && UI.tab === tab) { this.close(); return; }
    this.lastTab = tab; // kein doppeltes Öffnen über den renderTab-Hook
    const tb = $(`#tabs .tab[data-tab="${tab}"]`);
    if (tb && UI.tab !== tab) tb.click(); else { SFX.init(); SFX.play('paw'); }
    this.open();
  },

  open() { document.body.classList.add('sheet-open'); this.syncActive(); },
  close() { document.body.classList.remove('sheet-open'); this.toggleMore(false); this.syncActive(); },
  toggleMore(on) {
    const open = on === undefined ? !document.body.classList.contains('more-open') : on;
    document.body.classList.toggle('more-open', open);
    if (open && on === undefined) { SFX.init(); SFX.play('paw'); }
    this.syncActive();
  },

  syncActive() {
    const t = TABS.find(x => x.id === UI.tab);
    const title = $('#sheetHandle .sh-title');
    if (title && t) title.textContent = `${t.icon} ${t.name}`;
    $$('#dock .dk[data-tab], #dockMore .dk').forEach(b => b.classList.toggle('on', this.isOpen() && b.dataset.tab === UI.tab));
    const extraOn = this.isOpen() && !this.MAIN.includes(UI.tab);
    const m = $('#dock .more'); if (m) m.classList.toggle('on', extraOn || document.body.classList.contains('more-open'));
  },

  syncDots() {
    let extraDot = false;
    for (const t of TABS) {
      const on = !!$(`#tabs .tab[data-tab="${t.id}"] .dot.on`);
      $$(`#dock .dk[data-tab="${t.id}"] .dot, #dockMore .dk[data-tab="${t.id}"] .dot`).forEach(d => d.classList.toggle('on', on));
      if (on && !this.MAIN.includes(t.id)) extraDot = true;
    }
    const md = $('#dock .more .dot'); if (md) md.classList.toggle('on', extraDot);
  },
};

window.addEventListener('load', () => Dock.init());
