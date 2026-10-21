'use strict';
// ---------------------------------------------------------------------------
// Meilensteine: alle 100 Räume (Streifzug) bzw. Stufen (Hauptspiel) eine kleine Feier,
// bei 500 die „Halbzeit“-Sequenz (Dank und Bitte, nicht aufzugeben) und bei 1000
// das große Finale mit Abspann. Beide geben eine dauerhafte Medaille (+Schaden).
// Danach geht es endlos weiter.
// ---------------------------------------------------------------------------

const MS_SCENES = {
  500: {
    title: 'Halbzeit!', medal: 'Halbzeit-Medaille', bonus: 0.15, bones: 500, cls: 'half',
    lines: [
      'Raum 500.',
      'Du hast die Hälfte geschafft.',
      'Danke, dass du so weit mit deiner Katze gegangen bist – ohne dich hätte sie sich das nie getraut.',
      'Ab hier wird es härter. Die Gegner sind zäh, die Bosse wütend.',
      'Aber bis Raum 1000 ist es nur noch einmal so weit wie bisher.',
      'Bitte gib nicht auf. Wir glauben an dich! 🐾',
    ],
  },
  1000: {
    title: 'Raum 1000!', medal: 'Krone der Tausend', bonus: 0.3, bones: 1000, cls: 'final',
    lines: [
      'Raum 1000.',
      'Du hast es wirklich geschafft.',
      'Tausend Räume, unzählige Bosse, Pop-ups, Schatten und Zeitsprünge.',
      'Deine Katze ist jetzt eine Legende – und das ist allein dein Verdienst.',
      'Danke fürs Durchhalten, fürs Ausprobieren und fürs Weiterspielen.',
      'Die Reise endet nie ganz: Der Streifzug geht endlos weiter. 👑',
    ],
    credits: ['Idee & Heldin/Held: <b>du</b>', 'Programmierung: <b>Claude</b>', 'Musik: <b>ein Saxophon mit Schnurrhaaren</b>', 'Gegner: <b>alle, die du besiegt hast</b>'],
  },
};

const Milestones = {
  state() { return (S.ms = S.ms || {}); },
  medalMul() { const m = this.state(); let k = 1; for (const [n, sc] of Object.entries(MS_SCENES)) if (m[n]) k *= 1 + sc.bonus; return k; },

  onRoom(n) { this.check(n, 'Raum'); },
  onStage(n) { this.check(n, 'Stufe'); },
  check(n, word) {
    if (!n || n % 100) return;
    const m = this.state();
    if (MS_SCENES[n] && !m[n]) { m[n] = true; recalc(); Save.write(); setTimeout(() => this.scene(n, word), 1400); return; }
    const key = 'c' + n;
    if (m[key]) return;
    m[key] = true;
    const bones = Math.min(100, n / 10);
    S.bones += bones;
    Battle.showBanner(`${word.toUpperCase()} ${n}!`, `Meilenstein · +${bones} 🦴`, '#ffd34d');
    for (let i = 0; i < 40; i++) Battle.particle(Battle.W / 2 + U.rand(-160, 160), Battle.H * 0.3, U.rand(-260, 260), U.rand(-380, -60), `hsl(${U.randi(30, 60)},95%,62%)`, U.rand(1, 1.8), U.rand(4, 7), 300, false, 'confetti');
    SFX.play('achievement');
  },

  // ---------------------------------------------------------------- Sequenz
  scene(n, word = 'Raum') {
    const sc = MS_SCENES[n];
    if (!sc || document.getElementById('msScene')) return;
    const wasPaused = UI.paused;
    UI.paused = true;
    S.bones += sc.bones;
    const el = document.createElement('div');
    el.id = 'msScene'; el.className = sc.cls;
    el.innerHTML = `<div class="ms-sky"></div>
      <div class="ms-box">
        <canvas class="ms-cat" width="240" height="200"></canvas>
        <h2>${sc.title}</h2>
        <div class="ms-lines"></div>
        <div class="ms-reward" hidden>
          <div class="ms-medal"><i>${n >= 1000 ? '👑' : '🏅'}</i><div><b>${sc.medal}</b><small>Dauerhaft +${Math.round(sc.bonus * 100)} % Schaden · +${sc.bones} 🦴</small></div></div>
          ${sc.credits ? `<div class="ms-credits">${sc.credits.map(c => `<p>${c}</p>`).join('')}</div>` : ''}
          <button class="btn primary wide ms-go">${n >= 1000 ? 'Weiter in die Unendlichkeit' : 'Ich gebe nicht auf!'}</button>
        </div>
      </div>`;
    if (word === 'Stufe') sc.lines[0] = `Stufe ${n}.`;
    document.body.appendChild(el);
    // eigene Katze winkt mit Jazz im Hintergrund
    const cv = $('.ms-cat', el), ctx = cv.getContext('2d'), cat = CAT_BY_ID[S.activeCat] || CATS[0];
    const t0 = performance.now();
    const draw = now => {
      if (!el.isConnected) return;
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, 240, 200);
      Draw.ellipse(ctx, 120, 182, 70, 10, 'rgba(255,230,160,0.25)');
      ctx.save(); ctx.translate(112, 178 - Math.abs(Math.sin(t * 2.2)) * 6); ctx.scale(2.6, 2.6);
      Draw.cat(ctx, 0, 0, 1, cat, t, {});
      if (n >= 1000) { ctx.translate(10, -42); Draw.hat(ctx, 'crown', t); }
      ctx.restore();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    SFX.init(); SFX.play('victory');
    Music.gain && Music.gain.gain.setTargetAtTime(0, SFX.ctx.currentTime, 0.3);
    if (typeof Jazz !== 'undefined') Jazz.start();
    if (n >= 1000) this.fireworks(el);
    // Zeilen nacheinander einblenden
    const box = $('.ms-lines', el);
    sc.lines.forEach((line, i) => setTimeout(() => {
      const p = document.createElement('p'); p.innerHTML = line; box.appendChild(p);
      if (i === sc.lines.length - 1) setTimeout(() => { $('.ms-reward', el).hidden = false; SFX.play('achievement'); }, 900);
    }, 900 + i * 2100));
    $('.ms-go', el).addEventListener('click', () => {
      SFX.play('paw');
      if (typeof Jazz !== 'undefined') Jazz.stop(0.8);
      el.classList.add('out');
      setTimeout(() => el.remove(), 600);
      UI.paused = wasPaused;
      Main.last = performance.now();
      Music.apply();
    });
  },
  fireworks(el) {
    const tick = () => {
      if (!el.isConnected) return;
      const f = document.createElement('i');
      f.className = 'ms-fw';
      f.style.left = U.rand(8, 92) + '%'; f.style.top = U.rand(8, 50) + '%';
      f.style.setProperty('--c', `hsl(${U.randi(0, 360)},95%,65%)`);
      $('.ms-sky', el).appendChild(f);
      setTimeout(() => f.remove(), 1400);
      setTimeout(tick, U.rand(220, 520));
    };
    tick();
  },
};

// dauerhafte Medaillen wirken auf den Schaden (Hauptspiel und Streifzug)
const _msRecalc = recalc;
// eslint-disable-next-line no-global-assign
recalc = function () { _msRecalc(); const k = Milestones.medalMul(); R.dmgMult *= k; R.dps *= k; R.clickDmg *= k; };
Game.listeners.push(ev => { if (ev === 'stageUp' && !Run.active) Milestones.onStage(S.stage); });
