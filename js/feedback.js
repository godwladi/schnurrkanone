'use strict';
// ---------------------------------------------------------------------------
// Feedback & Fehlerberichte: 🐞-Knopf (auch über offenen Fenstern) oder Taste F8.
// Sammelt Spielfeld-Bild, optional ein Bildschirmfoto aus der Fotomediathek,
// Beschreibung, Gerätedaten, Spielstand, Fehler- und Ereignisprotokoll.
// Ergebnis: Bericht (.json) + Bilder (.png/.jpg), auf dem iPhone über das
// Teilen-Menü (z. B. iCloud Drive › „Schnurrkanone Feedback“), am PC als Download.
// Lädt als erstes Skript, damit auch Ladefehler im Protokoll landen.
// ---------------------------------------------------------------------------

const Feedback = {
  VERSION: '20261023-1517',
  log: [],          // [{t, kind, msg}]
  MAX_LOG: 120,
  t0: Date.now(),

  add(kind, msg) {
    this.log.push({ t: +((Date.now() - this.t0) / 1000).toFixed(1), kind, msg: String(msg).slice(0, 400) });
    if (this.log.length > this.MAX_LOG) this.log.shift();
  },

  capture() {
    window.addEventListener('error', e => this.add('error', `${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}:${e.colno}${e.error && e.error.stack ? '\n' + e.error.stack : ''}`));
    window.addEventListener('unhandledrejection', e => this.add('error', 'Promise: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
    for (const lvl of ['error', 'warn']) {
      const orig = console[lvl].bind(console);
      console[lvl] = (...a) => { this.add(lvl, a.map(x => x instanceof Error ? x.stack : typeof x === 'object' ? this.json(x, 200) : x).join(' ')); orig(...a); };
    }
  },

  json(x, max) { try { return JSON.stringify(x).slice(0, max); } catch (e) { return '[?]'; } },

  init() {
    if (typeof Game !== 'undefined') {
      Game.listeners.push((ev, d) => { if (ev !== 'gain') this.add('event', ev + (d !== undefined ? ' ' + this.json(d, 160) : '')); });
    }
    const btn = document.createElement('button');
    btn.id = 'bugBtn'; btn.className = 'hudbtn'; btn.textContent = '🐞';
    btn.title = 'Fehler melden / Feedback (F8)';
    btn.addEventListener('click', e => { e.stopPropagation(); this.open(); });
    document.body.appendChild(btn);
    document.addEventListener('keydown', e => { if (e.key === 'F8') { e.preventDefault(); this.open(); } });
  },

  // ---- Momentaufnahme, bevor das Feedback-Fenster etwas verdeckt
  snapshot() {
    let shot = null;
    try { shot = $('#game').toDataURL('image/png'); } catch (e) { this.add('warn', 'Spielfeld-Bild fehlgeschlagen: ' + e.message); }
    const txt = sel => { const el = $(sel); return el ? el.innerText.trim().slice(0, 1500) : ''; };
    const B = typeof Battle !== 'undefined' ? Battle : {};
    // Glückskiste: welche Karte steht gerade unter der Nadel?
    let needle = null;
    const nd = $('.needle');
    if (nd) {
      const nr = nd.getBoundingClientRect(), x = nr.left + nr.width / 2;
      const hit = $$('.rcard').find(c => { const r = c.getBoundingClientRect(); return x >= r.left && x <= r.right; });
      needle = hit ? hit.innerText.trim() : 'zwischen zwei Karten';
    }
    return {
      shot,
      meta: {
        version: this.VERSION, time: new Date().toISOString(), ua: navigator.userAgent,
        viewport: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`, orientation: (screen.orientation && screen.orientation.type) || (innerWidth > innerHeight ? 'landscape' : 'portrait'),
        standalone: !!(navigator.standalone || matchMedia('(display-mode: standalone)').matches),
        touch: matchMedia('(pointer: coarse)').matches, serviceWorker: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
        audio: typeof SFX !== 'undefined' && SFX.ctx ? SFX.ctx.state : 'aus', laufzeit_s: Math.round((Date.now() - this.t0) / 1000),
      },
      screen: {
        tab: typeof UI !== 'undefined' ? UI.tab : null, modal: txt('#modalRoot.show .modal'), toasts: txt('#toasts'), kisteNadel: needle,
        battle: { stage: S.stage, best: S.best, bossState: B.bossState, laser: B.laser, frenzy: B.frenzy, farm: S.farm, autoBoss: S.autoBoss },
      },
      state: JSON.parse(JSON.stringify(S)),
      log: this.log.slice(),
    };
  },

  open() {
    if ($('#feedback')) return;
    const snap = this.snapshot();
    let photo = null;
    const el = document.createElement('div');
    el.id = 'feedback';
    el.innerHTML = `
      <div class="fb-box">
        <h2>🐞 Fehler melden / Feedback</h2>
        <div class="fb-row">
          ${snap.shot ? `<img class="fb-shot" src="${snap.shot}" alt="Spielfeld">` : ''}
          <div class="fb-photo"><label class="btn"><input type="file" accept="image/*" hidden><span>📷 Bildschirmfoto anhängen</span></label><img alt="" hidden></div>
        </div>
        <div class="fb-kind">
          <label><input type="radio" name="fbk" value="Fehler" checked> 🐞 Fehler</label>
          <label><input type="radio" name="fbk" value="Grafik"> 🎨 Grafik/Layout</label>
          <label><input type="radio" name="fbk" value="Idee"> 💡 Idee</label>
        </div>
        <textarea placeholder="Was ist passiert? Was hättest du erwartet?&#10;z. B. „Glückskiste: Nadel stand auf Neunschwanz, angezeigt wurde Mieze.“"></textarea>
        <p class="fb-tip">Tipp: Für Fenster wie die Glückskiste vorher ein iPhone-Bildschirmfoto machen (Seitentaste + Lauter) und hier anhängen – das Spielfeld-Bild oben zeigt nur das Spielfeld.
        Beim Teilen <b>„In Dateien sichern“ → iCloud Drive › Schnurrkanone Feedback</b> wählen, dann kann Claude den Bericht am PC lesen.</p>
        <div class="fb-btns"><button class="btn" data-a="cancel">Abbrechen</button><button class="btn primary" data-a="send">📤 Teilen / Speichern</button></div>
      </div>`;
    // Spiel-Tastenkürzel nicht auslösen, solange hier getippt wird
    el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); });
    for (const ev of ['pointerdown', 'pointerup', 'click', 'touchend']) el.addEventListener(ev, e => e.stopPropagation());
    document.body.appendChild(el);
    const ta = $('textarea', el);
    const close = () => el.remove();
    $('input[type=file]', el).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      photo = await this.shrink(f);
      const img = $('.fb-photo img', el); img.src = photo; img.hidden = false;
      $('.fb-photo span', el).textContent = '📷 Anderes Foto';
    });
    $('[data-a=cancel]', el).addEventListener('click', close);
    $('[data-a=send]', el).addEventListener('click', async () => {
      const kind = $('input[name=fbk]:checked', el).value;
      await this.send({ kind, text: ta.value.trim(), ...snap, photo });
      close();
    });
    setTimeout(() => ta.focus({ preventScroll: true }), 50);
  },

  // Fotos verkleinern (iPhone-Bildschirmfotos sind sonst mehrere MB)
  shrink(file) {
    return new Promise(res => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        res(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(null); };
      img.src = url;
    });
  },

  async send(r) {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const base = `schnurrkanone-${r.kind.toLowerCase()}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    const report = {
      art: r.kind, beschreibung: r.text, ...r.meta, bildschirm: r.screen, protokoll: r.log, spielstand: r.state,
      bilder: [r.shot && `${base}-spielfeld.png`, r.photo && `${base}-foto.jpg`].filter(Boolean),
    };
    const toFile = (dataUrl, name) => {
      const [head, b64] = dataUrl.split(','), bin = atob(b64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return new File([arr], name, { type: head.slice(5, head.indexOf(';')) });
    };
    const files = [new File([JSON.stringify(report, null, 2)], `${base}.json`, { type: 'application/json' })];
    if (r.shot) files.push(toFile(r.shot, `${base}-spielfeld.png`));
    if (r.photo) files.push(toFile(r.photo, `${base}-foto.jpg`));

    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title: 'Schnurrkanone Feedback' }); this.done(); return; }
      catch (e) { if (e.name === 'AbortError') return; this.add('warn', 'Teilen fehlgeschlagen: ' + e.message); }
    }
    // Fallback (PC): einzeln herunterladen
    for (const f of files) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(f); a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      await new Promise(res => setTimeout(res, 250));
    }
    this.done();
  },

  done() { if (typeof UI !== 'undefined') UI.toast('🐞 <b>Danke!</b> Bericht gespeichert – sag Claude Bescheid, wo er liegt.', 'good'); },
};

Feedback.capture();
window.addEventListener('load', () => Feedback.init());
