'use strict';
// ---------------------------------------------------------------------------
// Start, Spielschleife, Autospeichern, Offline-Ertrag
// ---------------------------------------------------------------------------

const Main = {
  last: performance.now(),
  lastWall: Date.now(),
  achT: 0, saveT: 0,
  resetting: false,

  start() {
    const loaded = Save.read();
    if (loaded) S = Save.fill(defaultState(), loaded);
    SFX.on = S.sound;
    SFX.sfxVol = S.sfxVol;
    Music.on = S.music;
    Music.vol = S.musicVol;
    recalc();
    Perf.apply();
    Battle.init($('#game'));
    UI.init();

    // Offline-Ertrag
    if (loaded) {
      const off = Game.offlineGain(Date.now() - S.lastSave);
      if (off) this.showOffline(off);
    }
    // Tagesbonus
    const daily = Game.checkDaily();
    if (daily && loaded) {
      UI.modal({ title: '📅 Tagesbonus', html: `<p class="big">+${daily.reward} 🦴</p><p>Login-Serie: <b>${daily.streak} ${daily.streak === 1 ? 'Tag' : 'Tage'}</b> 🔥<br><small>Komm morgen wieder für mehr!</small></p>`, buttons: [{ label: 'Danke!', cls: 'primary' }] });
    }
    if (!S.seenHelp) {
      S.seenHelp = true;
      UI.modal({
        title: '🐱 Willkommen bei Schnurrkanone!',
        html: `<ul class="welcome">
          <li>🔫 Deine Katze schießt <b>von selbst</b> – zerstöre Hindernisse für 💰 Münzen.</li>
          <li>🐾 <b>Klicke</b> auf Hindernisse für Extraschaden und fülle das <b>Schnurr-Meter</b>.</li>
          <li>📦 Kaufe Waffenkisten und <b>ziehe gleiche Waffen aufeinander</b>, um sie zu verschmelzen.</li>
          <li>👑 Alle 10 Zerstörungen wartet ein Boss mit Zeitlimit.</li>
        </ul><p class="muted">Keine Werbung. Keine Käufe. Nur Katzen.</p>`,
        buttons: [{ label: 'Los geht\'s!', cls: 'primary', action: () => { SFX.init(); } }],
      });
    }

    setInterval(() => { if (!this.resetting) Save.write(); }, 15000);
    window.addEventListener('beforeunload', () => { if (!this.resetting) Save.write(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { if (!this.resetting) Save.write(); return; }
      const gap = Date.now() - this.lastWall;
      const off = Game.offlineGain(gap);
      if (off) this.showOffline(off);
      this.last = performance.now();
    });
    requestAnimationFrame(t => this.loop(t));
  },

  showOffline(off) {
    Game.addCoins(off.coins);
    S.stats.kills += off.kills;
    UI.modal({
      title: '😴 Willkommen zurück!',
      html: `<p>Deine Katze hat <b>${U.fmtTime(off.secs)}</b> weitergeschossen und dabei ${U.fmt(off.kills)} Hindernisse zerstört.</p>
             <p class="big">+${U.fmt(off.coins)} 💰</p><p class="muted">Offline-Ertrag: ${Math.round(Econ.offlineRate() * 100)}% · max. ${Econ.offlineCapH()} h</p>`,
      buttons: [{ label: 'Einsammeln!', cls: 'primary', action: () => { SFX.init(); SFX.play('victory'); Battle.spawnFlyers(Battle.W / 2, Battle.H / 2, 30, 'coin'); } }],
    });
  },

  loop(now) {
    // Bildrate begrenzen (Akku-Modus, hinter Menüs): Bilder überspringen, dt läuft weiter
    if (now - (this.lastDraw || 0) < 1000 / Perf.fps() - 4) { requestAnimationFrame(t => this.loop(t)); return; }
    this.lastDraw = now;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.lastWall = Date.now();
    S.stats.playTime += dt;
    // Streifzug: offenes Menü/Fenster oder Ziehen einer Waffe pausiert den Kampf
    if (Run.frozen()) Battle.frameDt = 0; else Battle.update(dt);
    Battle.render();
    UI.tick(dt);
    this.achT -= dt;
    if (this.achT <= 0) { this.achT = 1; Game.checkAchievements(); Quests.ensure(); Quests.check(); }
    requestAnimationFrame(t => this.loop(t));
  },
};

window.addEventListener('load', () => Main.start());
