'use strict';
// ---------------------------------------------------------------------------
// Titelbildschirm: Logo-Animation, die eigene Katze spielt Saxophon auf der Bühne,
// dazu Old-School-Jazz (js/jazz.js). Der erste Tipp startet den Ton (iOS gibt
// WebAudio erst nach einer Berührung frei), danach erscheint das Menü.
// Solange der Titel offen ist, ruht das Spiel (Main.loop) und die Spielmusik.
// Dazu der Querformat-Hinweis für Handys.
// ---------------------------------------------------------------------------

const Title = {
  open: true, menu: false, t0: performance.now(), notes: [],

  init() {
    const el = $('#splash');
    if (!el) { this.open = false; return; }
    this.el = el;
    this.cv = $('#titleCv');
    setTimeout(() => el.classList.add('ready'), 1500);
    const tap = e => {
      if (this.menu || performance.now() - this.t0 < 400) return; // versehentliches Doppeltippen beim Start
      if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      if (e.target.closest && e.target.closest('.tt-menu')) return;
      e.preventDefault();
      this.showMenu();
    };
    el.addEventListener('pointerup', tap);
    document.addEventListener('keydown', e => {
      if (!this.open) return;
      if (this.menu && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); this.play(); return; }
      if (!this.menu) { tap(e); e.stopPropagation(); }
    }, true);
    requestAnimationFrame(t => this.loop(t));
    // schnell getippt, bevor der Spielstand geladen war: Menü mit den echten Werten neu zeichnen
    window.addEventListener('load', () => setTimeout(() => { if (this.menu && this.open) this.renderMenu(); }, 0));

    let ok = false;
    try { ok = localStorage.getItem('schnurrkanone.portraitOk') === '1'; } catch (err) { /* privater Modus */ }
    if (ok) document.body.classList.add('portrait-ok');
    $('#rotateSkip').addEventListener('click', () => {
      document.body.classList.add('portrait-ok');
      try { localStorage.setItem('schnurrkanone.portraitOk', '1'); } catch (err) { /* egal */ }
    });
  },

  showMenu() {
    this.menu = true;
    SFX.init(); SFX.play('meow', 1);
    Jazz.start();
    this.el.classList.add('menu');
    this.renderMenu();
  },
  renderMenu() {
    // vor dem Laden aller Skripte nur ein vorläufiges Menü (wird beim 'load' neu gezeichnet)
    const ready = typeof Run !== 'undefined' && !!Battle.cv;
    const run = ready && S.run && S.run.active, runOpen = ready && S.best >= RUN_UNLOCK;
    const wheel = typeof Slots !== 'undefined' && Slots.ready();
    const nav = $('.tt-menu', this.el);
    nav.innerHTML = `
      <button class="tt-btn main" data-t="play">▶️ <span>${S.stats.playTime > 30 ? 'Weiterspielen' : 'Spielen'}<small>${!ready ? 'lädt …' : run ? `Streifzug · Raum ${Run.room()}` : `Stufe ${S.stage} · Rekord ${S.best}`}</small></span></button>
      <div class="tt-row">
        ${runOpen && !run ? '<button class="tt-btn" data-t="run">🗺️ <span>Streifzug</span></button>' : ''}
        <button class="tt-btn ${wheel ? 'hot' : ''}" data-t="wheel">🎰 <span>Automat</span></button>
        <button class="tt-btn" data-t="opt">⚙️ <span>Optionen</span></button>
        <button class="tt-btn" data-t="music">${S.music ? '🎵' : '🔇'} <span>Musik ${S.music ? 'an' : 'aus'}</span></button>
      </div>`;
    nav.hidden = false;
    nav.onclick = e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      e.stopPropagation();
      const k = b.dataset.t;
      if (k === 'music') { UI.toggleMusic(); Jazz.apply(); this.renderMenu(); return; }
      if (typeof Run === 'undefined' || !Battle.cv) return; // noch nicht fertig geladen
      this.play();
      if (k === 'run') { UI.tab = 'run'; UI.renderTab(); if (typeof Dock !== 'undefined' && Dock.active()) Dock.open(); }
      if (k === 'opt') { UI.tab = 'options'; UI.renderTab(); if (typeof Dock !== 'undefined' && Dock.active()) Dock.open(); }
      if (k === 'wheel' && typeof Slots !== 'undefined') setTimeout(() => Slots.show(), 450);
    };
  },

  play() {
    if (!this.open || !Battle.cv) return;
    SFX.init(); SFX.play('paw');
    try { screen.orientation.lock('landscape').catch(() => {}); } catch (err) { /* iOS: nicht unterstützt */ }
    this.open = false;
    Jazz.stop(0.9);
    Music.apply();
    Main.last = performance.now();
    this.el.classList.add('out');
    setTimeout(() => this.el.remove(), 650);
  },

  // ---------------------------------------------------------------- Bühne
  loop(now) {
    if (!this.open) return;
    requestAnimationFrame(t => this.loop(t));
    if (now - (this.last || 0) < 30) return; // 30 Bilder/s reichen, der Titel soll nicht heizen
    const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
    this.last = now;
    const cv = this.cv; if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = cv.getBoundingClientRect();
    if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    const ctx = cv.getContext('2d'), W = r.width, H = r.height, t = (now - this.t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = Math.min(W / 220, H / 170), cx = W / 2, gy = H * 0.86;
    // Scheinwerferkegel und Lichtkreis auf dem Boden
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, 'rgba(255,236,170,0)'); g.addColorStop(1, 'rgba(255,236,170,0.22)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - 14 * s, 0); ctx.lineTo(cx + 14 * s, 0); ctx.lineTo(cx + 70 * s, gy); ctx.lineTo(cx - 70 * s, gy); ctx.closePath(); ctx.fill();
    Draw.ellipse(ctx, cx, gy, 78 * s, 13 * s, 'rgba(255,230,160,0.28)');
    Draw.ellipse(ctx, cx, gy, 48 * s, 8 * s, 'rgba(255,240,200,0.3)');
    // zweiter Scheinwerfer schwenkt von oben rechts über die Bühne
    ctx.save(); ctx.translate(cx + 120 * s, -20 * s); ctx.rotate(0.55 + Math.sin(t * 0.6) * 0.35);
    const sw = ctx.createLinearGradient(0, 0, 0, H * 1.2);
    sw.addColorStop(0, 'rgba(157,123,255,0.26)'); sw.addColorStop(1, 'rgba(157,123,255,0)');
    ctx.fillStyle = sw; ctx.beginPath(); ctx.moveTo(-5 * s, 0); ctx.lineTo(5 * s, 0); ctx.lineTo(60 * s, H * 1.2); ctx.lineTo(-60 * s, H * 1.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    // funkelnde Sterne im Hintergrund
    if (!this.sparks) this.sparks = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * 6, sz: 1.5 + Math.random() * 2.5 }));
    ctx.fillStyle = '#fff6c2';
    for (const sp of this.sparks) {
      const k = Math.max(0, Math.sin(t * 2.2 + sp.p)); if (k < 0.05) continue;
      const x = sp.x * W, y = sp.y * H, rr = sp.sz * s * k;
      ctx.globalAlpha = k * 0.9;
      ctx.beginPath(); ctx.moveTo(x, y - rr * 2.2); ctx.lineTo(x + rr * 0.45, y); ctx.lineTo(x, y + rr * 2.2); ctx.lineTo(x - rr * 0.45, y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - rr * 2.2, y); ctx.lineTo(x, y + rr * 0.45); ctx.lineTo(x + rr * 2.2, y); ctx.lineTo(x, y - rr * 0.45); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // die eigene Katze wiegt sich im Swing (132 Schläge/min)
    const cat = CAT_BY_ID[S.activeCat] || CATS[0], beat = t * 132 / 60;
    const sway = Math.sin(beat * Math.PI) * 0.06, hop = Math.abs(Math.sin(beat * Math.PI)) * 2;
    ctx.save();
    ctx.translate(cx - 6 * s, gy - hop * s); ctx.rotate(sway); ctx.scale(s * 1.25, s * 1.25);
    Draw.cat(ctx, 0, 0, 1, cat, t, { ear: 0 });
    this.sax(ctx, t);
    ctx.restore();
    // Noten steigen aus dem Schalltrichter
    if (this.menu && Math.random() < dt * 3.2) this.notes.push({ x: cx + 38 * s, y: gy - 30 * s, vx: U.rand(10, 40), vy: U.rand(-55, -35), age: 0, ch: U.pick(['♪', '♫', '♩', '♬']), rot: U.rand(-0.4, 0.4) });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const n of this.notes) {
      n.age += dt; n.x += (n.vx + Math.sin(n.age * 4) * 25) * dt; n.y += n.vy * dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, n.age * 3, 2.6 - n.age));
      ctx.font = `900 ${16 * s / 1.6}px "Segoe UI Symbol", sans-serif`;
      ctx.fillStyle = '#ffd34d'; ctx.fillText(n.ch, n.x, n.y);
    }
    ctx.globalAlpha = 1;
    this.notes = this.notes.filter(n => n.age < 2.6);
  },
  // Altsaxophon in den Pfoten (Katzen-Koordinaten: Kopf bei 10/−42, Mund ≈ 10/−34)
  sax(ctx, t) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const gold = '#f2b632', dark = '#a8741a';
    ctx.strokeStyle = dark; ctx.lineWidth = 6.5;
    const path = () => { ctx.beginPath(); ctx.moveTo(12, -33); ctx.quadraticCurveTo(22, -32, 22, -24); ctx.lineTo(22, -10); ctx.quadraticCurveTo(22, -1, 30, -2); ctx.quadraticCurveTo(36, -3, 36, -12); };
    path(); ctx.stroke();
    ctx.strokeStyle = gold; ctx.lineWidth = 4.5; path(); ctx.stroke();
    // Schalltrichter
    ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(32, -12); ctx.lineTo(41, -20); ctx.lineTo(43, -16); ctx.lineTo(38, -10); ctx.closePath(); ctx.fill();
    Draw.ellipse(ctx, 42, -18, 2.2, 3.4, '#5a3a0a');
    // Klappen
    for (const y of [-22, -17, -12]) Draw.circle(ctx, 22, y, 1.4, '#fff3c4');
    // Mundstück und Glanz
    Draw.circle(ctx, 12, -33, 1.8, '#2a1a22');
    ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3; ctx.strokeStyle = '#fffbe6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20.5, -22); ctx.lineTo(20.5, -12); ctx.stroke();
    ctx.restore();
  },
};

// iOS-Home-Bildschirm-App: Mit durchsichtiger Statusleiste (black-translucent) und
// viewport-fit=cover rechnet iOS die Seitenhöhe bei height: 100 % um die Statusleiste zu
// klein – unten blieb ein Streifen, die Leiste unten wurde abgeschnitten. Dort deshalb die
// volle Bildschirmhöhe (100lvh bzw. gemessen) für html, body und alle Vollbild-Ebenen.
const Viewport = {
  fix() {
    const pwa = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    document.documentElement.classList.toggle('pwa', !!pwa);
    if (!pwa || !screen.height) return;
    const long = Math.max(screen.width, screen.height), short = Math.min(screen.width, screen.height);
    const full = innerWidth < innerHeight ? long : short;
    document.documentElement.style.setProperty('--appH', Math.max(innerHeight, full) + 'px');
  },
};
Viewport.fix();
for (const ev of ['resize', 'orientationchange']) window.addEventListener(ev, () => setTimeout(() => Viewport.fix(), 250));

Title.init();
