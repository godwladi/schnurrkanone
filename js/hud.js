'use strict';
// ---------------------------------------------------------------------------
// Kompaktes HUD im Stil moderner Handyspiele:
//   oben links ≡ (Menü mit allen weiteren Reitern, Pause, Musik), daneben Level-Ring
//   und Ressourcen-Pillen; links unter dem Menü eine Spalte mit Schnellknöpfen
//   (Katzen-Automat, Aufgaben, Gratis-Kiste) mit Hinweis-Punkten; oben rechts Pause neben 🐞.
// Am Handy liegt das HUD durchsichtig über dem Spielfeld (Battle.insetT hält Abstand).
// ---------------------------------------------------------------------------

const Hud = {
  init() {
    const hud = $('#hud'), battle = $('#battle');
    // Menü-Knopf ganz links
    const menu = document.createElement('button');
    menu.id = 'menuBtn'; menu.className = 'hudbtn'; menu.title = 'Menü';
    menu.innerHTML = '<span class="mb"><i></i><i></i><i></i></span><i class="dot"></i>';
    hud.prepend(menu);
    menu.addEventListener('click', e => { e.stopPropagation(); SFX.init(); this.toggleMenu(); });

    // Schnellknöpfe links unter dem Menü (Streifzug und Musik liegen im Menü)
    const railL = document.createElement('div');
    railL.id = 'railL';
    railL.innerHTML = `
      <button class="railb" data-r="slots" title="Katzen-Automat"><span class="ri">🎰</span><i class="dot"></i></button>
      <button class="railb" data-r="quests" title="Aufgaben"><span class="ri">📜</span><i class="dot"></i></button>
      <button class="railb" data-r="chest" title="Gratis-Katzenkiste"><span class="ri">🎁</span><i class="dot"></i><em></em></button>`;
    battle.append(railL);
    railL.addEventListener('pointerdown', e => e.stopPropagation());
    railL.addEventListener('click', e => {
      const b = e.target.closest('.railb'); if (!b) return;
      e.stopPropagation(); SFX.init();
      this.act(b.dataset.r);
    });
    // Pause oben rechts neben dem 🐞-Knopf
    const pause = document.createElement('button');
    pause.id = 'pauseFab'; pause.className = 'hudbtn'; pause.title = 'Pause (P)'; pause.textContent = '⏸️';
    pause.addEventListener('pointerdown', e => e.stopPropagation());
    pause.addEventListener('click', e => { e.stopPropagation(); SFX.init(); this.act('pause'); });
    document.body.appendChild(pause);
    // Menü: alle übrigen Reiter + Pause/Musik/Töne
    // eigenes Menü statt der Pfeil-Liste aus dock.js (Element ersetzen = deren Klick-Handler weg)
    const old = $('#dockMore'), more = document.createElement('div');
    more.id = 'dockMore';
    if (old) old.replaceWith(more); else battle.appendChild(more);
    this.more = more;
    this.renderMenu();
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#dockMore, #menuBtn, #dock')) this.toggleMenu(false); });

    setInterval(() => this.refresh(), 500);
    this.refresh();
    Battle.resize();
  },

  renderMenu() {
    const extra = TABS.filter(t => !Dock.MAIN.includes(t.id));
    // --i: Reihenfolge für das gestaffelte Herausspringen (CSS)
    this.more.innerHTML = extra.map((t, i) => `<button class="dk wide" data-tab="${t.id}" style="--i:${i}"><span class="dki">${t.icon}</span><span class="dkn">${t.name}</span><i class="dot"></i></button>`).join('') +
      `<div class="mrow" style="--i:${extra.length}"><button class="dk wide half" data-m="pause"><span class="dki">⏸️</span><span class="dkn">Pause</span></button>
       <button class="dk wide half" data-m="music"><span class="dki">${S.music ? '🎵' : '🔇'}</span><span class="dkn">Musik</span></button></div>`;
    this.more.onclick = e => {
      const b = e.target.closest('.dk'); if (!b) return;
      e.stopPropagation();
      if (b.dataset.m) { this.toggleMenu(false); this.act(b.dataset.m); return; }
      this.toggleMenu(false);
      if (Dock.active()) Dock.select(b.dataset.tab);
      else { UI.tab = b.dataset.tab; UI.renderTab(); }
    };
    this.more.onpointerdown = e => e.stopPropagation();
  },
  toggleMenu(on) {
    const open = on === undefined ? !document.body.classList.contains('more-open') : on;
    if (open) this.renderMenu();
    document.body.classList.toggle('more-open', open);
    if (open && on === undefined) SFX.play('paw');
  },

  act(k) {
    if (k === 'pause') { UI.pause(); return; }
    if (k === 'music') { UI.toggleMusic(); this.refresh(); return; }
    if (k === 'slots') { SFX.play('paw'); Slots.show(); return; }
    const tab = { quests: 'quests', chest: 'cats' }[k];
    if (!tab) return;
    if (k === 'chest' && Date.now() >= S.freeChestAt) { UI.openChest(true); return; }
    if (Dock.active()) Dock.select(tab);
    else { UI.tab = tab; UI.renderTab(); SFX.play('paw'); }
  },

  refresh() {
    const set = (sel, on) => { const d = $(sel); if (d) d.classList.toggle('on', !!on); };
    set('#railL [data-r="slots"] .dot', Slots.ready());
    set('#railL [data-r="quests"] .dot', Quests.claimable());
    const left = S.freeChestAt - Date.now();
    set('#railL [data-r="chest"] .dot', left <= 0);
    const em = $('#railL [data-r="chest"] em');
    if (em) em.textContent = left > 0 ? U.fmtTime(left / 1000) : 'Gratis!';
    $('#pauseFab').classList.toggle('on', !!UI.paused);
    // Menü-Punkt, wenn in einem der Menü-Reiter etwas bereitliegt
    const extraDot = TABS.some(t => !Dock.MAIN.includes(t.id) && $(`#tabs .tab[data-tab="${t.id}"] .dot.on`));
    set('#menuBtn .dot', extraDot);
    for (const t of TABS) set(`#dockMore .dk[data-tab="${t.id}"] .dot`, $(`#tabs .tab[data-tab="${t.id}"] .dot.on`));
  },
};

// Spielfeld-Abstand oben: so weit ragt das HUD am Handy ins Spielfeld
const _hResize = Battle.resize;
Battle.resize = function () {
  const hud = document.getElementById('hud');
  if (hud && this.cv) {
    const hr = hud.getBoundingClientRect(), cr = this.cv.parentElement.getBoundingClientRect();
    this.insetT = Math.max(0, hr.bottom - cr.top);
  }
  this.railW = 0; // rechts liegen keine Schnellknöpfe mehr
  _hResize.call(this);
  this.uiTopAt = 0; // Boss-Knöpfe neu vermessen
};
// Unterkante der Boss-Knöpfe nur zweimal pro Sekunde messen (jedes Bild erzwang ein Layout)
Battle.uiTop = function () {
  if (this.t - (this.uiTopAt || 0) > 0.5 || !this.uiTopAt) {
    const wrap = document.getElementById('bossWrap');
    this.uiTopV = wrap && wrap.offsetHeight ? wrap.offsetTop + wrap.offsetHeight + 8 : 108 + (this.insetT || 0);
    this.uiTopAt = this.t || 0.001;
  }
  return this.uiTopV;
};

window.addEventListener('load', () => Hud.init());
