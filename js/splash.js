'use strict';
// ---------------------------------------------------------------------------
// Startbildschirm mit Logo-Animation und Querformat-Hinweis.
// Das Antippen startet zugleich den Ton (iOS gibt WebAudio erst nach einer
// Berührung frei) und versucht, das Querformat zu sperren (Android/Vollbild).
// ---------------------------------------------------------------------------

const Splash = {
  init() {
    const el = $('#splash');
    if (!el) return;
    const t0 = performance.now();
    setTimeout(() => el.classList.add('ready'), 1900);
    const go = e => {
      if (performance.now() - t0 < 500) return; // versehentliches Doppeltippen beim Start
      if (e && e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      if (e) { e.preventDefault(); e.stopPropagation(); }
      el.removeEventListener('pointerup', go);
      document.removeEventListener('keydown', go, true);
      SFX.init(); SFX.play('meow', 1);
      try { screen.orientation.lock('landscape').catch(() => {}); } catch (err) { /* iOS: nicht unterstützt */ }
      el.classList.add('out');
      setTimeout(() => el.remove(), 650);
    };
    el.addEventListener('pointerup', go);
    document.addEventListener('keydown', go, true);

    let ok = false;
    try { ok = localStorage.getItem('schnurrkanone.portraitOk') === '1'; } catch (err) { /* privater Modus */ }
    if (ok) document.body.classList.add('portrait-ok');
    $('#rotateSkip').addEventListener('click', () => {
      document.body.classList.add('portrait-ok');
      try { localStorage.setItem('schnurrkanone.portraitOk', '1'); } catch (err) { /* egal */ }
    });
  },
};

Splash.init();
