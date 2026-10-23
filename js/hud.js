'use strict';
// ---------------------------------------------------------------------------
// Kompaktes HUD im Stil moderner Handyspiele:
//   oben links ≡ (Menü mit allen weiteren Reitern, Pause, Musik), daneben Level-Ring
//   und Ressourcen-Pillen; links unter dem Menü eine Spalte mit Schnellknöpfen
//   (Katzen-Automat und Gratis-Kiste mit Timer, Aufgaben) mit Hinweis-Punkten; oben rechts Pause neben 🐞.
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
      <button class="railb" data-r="slots" title="Katzen-Automat"><span class="ri">🎰</span><i class="dot"></i><em></em></button>
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
    const sem = $('#railL [data-r="slots"] em'); // Gratis-Dreh: Restzeit wie bei der Gratis-Kiste
    if (sem) sem.textContent = Slots.ready() ? 'Gratis!' : U.fmtTime(Slots.freeLeft() / 1000);
    set('#railL [data-r="quests"] .dot', Quests.claimable());
    const left = S.freeChestAt - Date.now();
    set('#railL [data-r="chest"] .dot', left <= 0);
    const em = $('#railL [data-r="chest"] em');
    if (em) em.textContent = left > 0 ? U.fmtTime(left / 1000) : 'Gratis!';
    $('#pauseFab').classList.toggle('on', !!UI.paused);
    // iPhone-App: Notch/Home-Leiste (env(safe-area-*)) stehen beim Start manchmal noch auf 0.
    // Weicht der gemessene Abstand von dem ab, mit dem das Spielfeld gerechnet hat → neu vermessen
    // (sonst rutscht die Raumleiste unter das HUD und das Schnurr-Meter auf die Symbolleiste).
    const probe = $('#safeProbe'), hud = $('#hud'), cv = Battle.cv;
    if (probe && hud && cv) {
      const top = Math.max(0, hud.getBoundingClientRect().bottom - cv.parentElement.getBoundingClientRect().top);
      if (Math.abs(top - (Battle.insetT || 0)) > 1 || probe.offsetHeight !== Battle.safeB || probe.offsetWidth !== Battle.safeR) Battle.resize();
    }
    document.body.classList.toggle('bossfight', Battle.bossState === 'active');
    // HUD-Pillen ändern ihre Breite mit den Zahlen → Lücke für die Raumleiste (quer) nachführen
    const tb = Battle.measureTrail(), ob = Battle.trailBox;
    if (!tb !== !ob || (tb && ob && (Math.abs(tb.l - ob.l) > 4 || Math.abs(tb.r - ob.r) > 4))) Battle.trailBox = tb;
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
  // Goldrausch-/Ereignis-Pille rechts neben der Knopf-Spalte links (in Spielfeld-Koordinaten)
  const railL = document.getElementById('railL');
  this.pillX = railL && this.cv && railL.offsetWidth ? Math.round(railL.getBoundingClientRect().right - this.cv.getBoundingClientRect().left + 8) : 14;
  const probe = document.getElementById('safeProbe');
  this.safeB = probe ? probe.offsetHeight : 0; this.safeR = probe ? probe.offsetWidth : 0;
  _hResize.call(this);
  this.uiTopAt = 0; // Boss-Knöpfe neu vermessen
  this.trailBox = this.measureTrail();
  // Handy quer: die Knopf-Spalte links (und die Notch) lag über Katze, Eule und Goldfisch →
  // Katze so weit nach rechts, dass Eule (66 px links von ihr) neben der Spalte steht
  this.meterB = undefined;
  if (this.landscape()) {
    // eine Zeile unten: Skills links, Symbolleiste Mitte, Schnurr-Meter rechts → Boden direkt
    // darüber (mehr Himmel für Glücksballon und gegnerische Geschosse)
    const sb = this.safeB || 0, gy = this.H - 60 - sb;
    if (Math.abs(gy - this.groundY) > 0.5) { this.groundY = gy; for (const o of this.obs) o.y = gy; }
    this.meterB = sb;
    const dock = document.getElementById('dock'), sk = document.getElementById('skills');
    if (dock && sk && this.cv) {
      const cl = this.cv.getBoundingClientRect().left, skR = sk.getBoundingClientRect().right - cl;
      const mL = this.W - Math.min(260, this.W * 0.3) - 24;
      dock.style.left = Math.round((skR + mL) / 2) + 'px';
      // schmale Geräte: Symbolleiste in die Lücke zwischen Skills und Schnurr-Meter einpassen
      const k = Math.min(1, (mL - skR - 12) / (dock.scrollWidth || 1));
      dock.style.transform = `translateX(-50%) scale(${Math.max(0.6, k).toFixed(3)})`;
    }
  } else { const dock = document.getElementById('dock'); if (dock) { dock.style.left = ''; dock.style.transform = ''; } }
  if (this.landscape() && railL && railL.offsetWidth) {
    const minX = this.pillX + 66 * this.cs;
    if (this.catX < minX) {
      this.catX = minX;
      this.frontX = this.Wp < 520 ? Math.max(this.catX + 135 * this.cs, this.Wp * 0.4) : Math.max(this.catX + 200 * this.cs, this.Wp * 0.47);
      this.spacing = Math.min(150 * this.cs, (this.Wp - this.frontX - 30) / 3.2);
      this.realignT = 1; // Gegner wieder einreihen
    }
  }
};
Battle.landscape = function () { return matchMedia('(max-height: 500px) and (orientation: landscape)').matches; };
// freie Lücke in der oberen HUD-Zeile (Spielfeld-Koordinaten): rechts neben den Ressourcen,
// links vom Pause-Knopf; nur quer und nur, wenn die Raumleiste dort gut hineinpasst
Battle.measureTrail = function () {
  if (!this.cv || !this.landscape()) return null;
  const cl = this.cv.getBoundingClientRect().left;
  let l = 0, r = Infinity;
  for (const id of ['menuBtn', 'hudLvl', 'hudCoins']) { const el = document.getElementById(id); if (el && el.offsetWidth) l = Math.max(l, el.getBoundingClientRect().right); }
  for (const id of ['hudBones', 'hudMinze', 'pauseFab']) { const el = document.getElementById(id); if (el && el.offsetWidth) r = Math.min(r, el.getBoundingClientRect().left); }
  if (!isFinite(r)) r = innerWidth - 100;
  const cx = this.cv.getBoundingClientRect().width / 2, half = Math.min(cx - (l - cl), (r - cl) - cx) - 10;
  return half > 70 ? { l: cx - half, r: cx + half, y: 7 } : null; // die Schrift schrumpft notfalls (battle.js)
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

// ---------------------------------------------------------------------------
// Zeitlupe (wie das Waffenrad in GTA V): solange Menü, Schublade oder Katzen-Automat offen
// sind, läuft der Kampf mit einem Viertel der Geschwindigkeit weiter – weich ein- und
// ausgeblendet, mit Vignette und tiefem „Wusch“. Im Streifzug hält der Kampf dort ohnehin an.
// ---------------------------------------------------------------------------
const Slowmo = {
  SCALE: 0.25, k: 1, on: false,
  want() {
    if (Run.active) return false;
    const b = document.body.classList;
    return b.contains('sheet-open') || b.contains('more-open') || !!(UI.modalOpts && /slotmodal/.test(UI.modalOpts.cls || ''));
  },
  // aus Main.loop: Faktor für die Spielzeit dieses Bildes
  scale(dt) {
    const on = this.want();
    if (on !== this.on) {
      this.on = on;
      document.body.classList.toggle('slowmo', on);
      if (SFX.on && SFX.ctx) SFX.tone(on ? 220 : 140, 0.35, 'sine', 0.06, on ? -150 : 220);
    }
    const tgt = on ? this.SCALE : 1;
    this.k += (tgt - this.k) * Math.min(1, dt * (on ? 7 : 5));
    if (Math.abs(this.k - tgt) < 0.01) this.k = tgt;
    return this.k;
  },
};
