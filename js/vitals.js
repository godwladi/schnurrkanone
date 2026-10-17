'use strict';
// ---------------------------------------------------------------------------
// Katzen-Leben: Bosse werfen Geschosse (antippen = parieren und zurückschleudern),
// am Ende des Boss-Countdowns kommt der Vernichtungsschlag. Schnurr-Schild blockt
// alles (beim Vernichtungsschlag gibt es einen Konter), Heilung über Raserei,
// Fischregen und Segen. K.O. = eine Stufe zurück (im Streifzug: Lauf vorbei).
// Im Streifzug (run.js) zählen die Lebenspunkte über alle Räume.
// ---------------------------------------------------------------------------

const BOSS_ATTACKS = {
  tree:     { icon: '🌰', name: 'Zapfen-Salve',     n: 3, speed: 1,   size: 1,   dmg: 0.7 },
  cactus:   { icon: '🌵', name: 'Stachelschuss',    n: 1, speed: 1.5, size: 1.1, dmg: 1.1 },
  snowman:  { icon: '❄️', name: 'Riesenschneeball', n: 1, speed: 0.7, size: 1.6, dmg: 1.5 },
  lavarock: { icon: '🔥', name: 'Lavaregen',        n: 3, speed: 0.9, size: 1,   dmg: 0.6, sky: true },
  vending:  { icon: '🥫', name: 'Dosenwurf',        n: 2, speed: 1.1, size: 1.1, dmg: 0.8 },
  asteroid: { icon: '☄️', name: 'Mini-Meteor',      n: 1, speed: 1.2, size: 1.4, dmg: 1.3, sky: true },
};
const ULT_WARN = 6;       // so viele Sekunden vor Ablauf lädt der Boss den Vernichtungsschlag
const ULT_EXTRA = 8;      // überlebt: so viele Sekunden bekommt man dazu
const ATTACK_FROM = 3;    // ab dieser Stufe greifen Bosse an (im Streifzug immer)

const Vitals = {
  idle: { hp: 100, maxHp: 100 },
  shots: [], shield: 0, shieldMax: 2.5, dazed: 0, hurtT: 0, healT: 0, atkT: 3,
  ultDone: false, stun: 0, beam: 0, shownHp: 100,

  ref() { return Run.active ? S.run : this.idle; },
  frac() { const r = this.ref(); return U.clamp(r.hp / r.maxHp, 0, 1); },
  dmgMul(o) { return o.boss && this.stun > 0 ? 1.5 : 1; },

  reset() { this.shots = []; this.shield = 0; this.dazed = 0; this.stun = 0; this.ultDone = false; this.beam = 0; this.atkT = 3; },
  onBossSpawn() { this.ultDone = false; this.stun = 0; this.atkT = 3.5; },

  // ---------------------------------------------------------------- Ablauf
  update(dt, B) {
    for (const k of ['shield', 'dazed', 'hurtT', 'healT', 'stun', 'beam']) this[k] = Math.max(0, this[k] - dt);
    const r = this.ref();
    if (!Run.active && B.bossState !== 'active') r.hp = Math.min(r.maxHp, r.hp + r.maxHp * 0.12 * dt);
    this.shownHp += (r.hp - this.shownHp) * Math.min(1, dt * 8);

    // Wer wirft? Der Boss (ab Stufe 3) – im Streifzug auch das vorderste Hindernis
    const boss = B.bossState === 'active' ? B.bossObj : null;
    let attacker = null, power = 1, interval = 5;
    if (boss && !(boss.dying > 0) && boss.x <= B.frontX + 40 * B.cs && this.stun <= 0 && (Run.active || S.stage >= ATTACK_FROM)) {
      attacker = boss;
      interval = Math.max(2.4, 5.5 - 0.3 * Math.floor((S.stage - 1) / 10)) * (Run.active ? Math.max(0.6, 1 - 0.02 * S.run.depth) : 1);
    } else if (!boss && Run.active && !Run.paused()) {
      const f = B.front();
      if (f && !f.treasure && f.x < (B.Wp || B.W) - 30) { attacker = f; power = 0.45; interval = 4.2; }
    }
    interval *= Run.atkMul();
    if (attacker && this.dazed <= 0) {
      this.atkT -= dt;
      if (this.atkT <= 0) { this.atkT = interval * U.rand(0.85, 1.15); this.launch(B, attacker, power); }
    } else this.atkT = Math.max(this.atkT, 1.5);

    // Vernichtungsschlag lädt: Funken strömen zum Boss
    if (boss && this.charging(B) && Math.random() < dt * 40) {
      const h = OBST_H[boss.kind] * boss.scale, a = Math.random() * Math.PI * 2, d = U.rand(90, 170) * B.cs;
      const cx = boss.x, cy = boss.y - h * 0.55;
      B.particle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, -Math.cos(a) * d * 2.6, -Math.sin(a) * d * 2.6, U.pick(['#ff1e46', '#ff8a3c', '#ffd34d']), 0.38, 4 * B.cs, 0, false, 'spark');
    }
    if (boss && this.charging(B) && Math.ceil(B.bossTimer) !== this.lastTick) { this.lastTick = Math.ceil(B.bossTimer); SFX.play('ultTick'); }

    // Geschosse
    const cat = this.catPoint(B);
    for (const s of this.shots) {
      s.t += dt / s.T;
      s.rot += dt * s.spin;
      const k = Math.min(1, s.t);
      if (s.back) {
        const o = B.obs.find(x => x.id === s.from && !x.dead && !x.fleeing);
        if (o) { s.ex = o.x; s.ey = o.y - OBST_H[o.kind] * o.scale * 0.5; }
        s.x = U.lerp(s.sx, s.ex, k); s.y = U.lerp(s.sy, s.ey, k) - Math.sin(k * Math.PI) * 40 * B.cs;
        if (Math.random() < dt * 40) B.particle(s.x, s.y, 0, 0, '#9fffd0', 0.3, 5 * B.cs, 0, false, 'spark');
        if (s.t >= 1) { s.done = true; if (o) this.reflectHit(B, o, s); }
        continue;
      }
      s.ex = cat.x; s.ey = cat.y;
      s.x = U.lerp(s.sx, s.ex, k); s.y = U.lerp(s.sy, s.ey, k) - (s.sky ? 0 : Math.sin(k * Math.PI) * s.arc);
      if (Math.random() < dt * 25) B.particle(s.x, s.y, U.rand(-30, 30), U.rand(-30, 30), '#ff4d6d', 0.3, 3 * B.cs, 0, false, 'spark');
      if (s.t >= 1) { s.done = true; this.hitCat(B, s); }
    }
    this.shots = this.shots.filter(s => !s.done);
  },

  charging(B) { return B.bossState === 'active' && B.bossObj && !this.ultDone && this.stun <= 0 && B.bossTimer <= ULT_WARN && B.bossIntro <= 0; },
  catPoint(B) { return { x: B.catX + 10 * B.cs, y: B.groundY - 38 * B.cs }; },

  launch(B, o, power) {
    const a = BOSS_ATTACKS[o.kind] || BOSS_ATTACKS.tree;
    const n = o.boss ? a.n : 1, h = OBST_H[o.kind] * o.scale;
    for (let i = 0; i < n; i++) {
      const sky = a.sky && o.boss;
      const sx = sky ? B.catX + U.rand(-30, 140) * B.cs : o.x - OBST_W[o.kind] * o.scale * 0.3;
      const sy = sky ? -30 - i * 60 : o.y - h * 0.6;
      this.shots.push({
        from: o.id, sx, sy, x: sx, y: sy, ex: 0, ey: 0, t: -i * 0.22, rot: 0, spin: U.rand(-8, 8),
        T: (sky ? 1.5 : 1.35) / a.speed + (o.boss ? 0 : 0.25), arc: U.rand(70, 130) * B.cs, sky,
        icon: a.icon, size: a.size * (o.boss ? 1 : 0.8), dmg: a.dmg * 12 * power * (o.boss && Run.guardian() ? 1.25 : 1),
      });
    }
    SFX.play('throw');
  },

  // ---------------------------------------------------------------- Treffer
  hitCat(B, s) {
    const p = this.catPoint(B);
    for (let i = 0; i < 10; i++) B.particle(p.x, p.y, U.rand(-200, 200), U.rand(-260, 40), U.pick(['#ff4d6d', '#ffd34d', '#ffffff']), 0.5, 5 * B.cs, 500, false, 'spark');
    this.hurt(B, this.ref().maxHp * s.dmg / 100);
  },

  // gibt true zurück, wenn der Schaden geblockt wurde
  hurt(B, amount, big) {
    const p = this.catPoint(B), r = this.ref();
    if (this.shield > 0) {
      FX.addRing(p.x, p.y, 70 * B.cs, '#7ef9ff', 0.3, 6);
      B.text(p.x, p.y - 50 * B.cs, 'GEBLOCKT!', '#7ef9ff', 18 * B.cs, true);
      SFX.play('block');
      return true;
    }
    amount *= Run.takenMul();
    r.hp = Math.max(0, r.hp - amount);
    this.hurtT = 0.45;
    B.shake = Math.max(B.shake, big ? 22 : 8);
    B.text(p.x, p.y - 46 * B.cs, `-${Math.round(amount)} ❤️`, '#ff4d6d', (big ? 26 : 18) * B.cs, true);
    SFX.play('hurt');
    if (r.hp <= 0) {
      if (Run.tryRevive()) { r.hp = r.maxHp * 0.4; B.showBanner('NEUNTES LEBEN!', 'Die Katze steht wieder auf – mit 40 % Leben', '#ffd34d'); SFX.play('levelup'); return false; }
      this.ko(B);
    }
    return false;
  },

  heal(B, frac, quiet) {
    const r = this.ref(), before = r.hp;
    r.hp = Math.min(r.maxHp, r.hp + r.maxHp * frac);
    const got = r.hp - before;
    if (got < 0.5 || quiet) return;
    const p = this.catPoint(B);
    this.healT = 0.8;
    B.text(p.x, p.y - 50 * B.cs, `+${Math.round(got)} ❤️`, '#6ee7a0', 18 * B.cs, true);
    for (let i = 0; i < 12; i++) B.particle(p.x + U.rand(-30, 30) * B.cs, p.y + U.rand(-10, 30) * B.cs, U.rand(-20, 20), U.rand(-140, -60), U.pick(['#6ee7a0', '#b5f5c8', '#ffffff']), 0.9, 6 * B.cs, 0, false, 'star');
    SFX.play('heal');
  },

  raiseShield(B) {
    this.shield = this.shieldMax = 2.5 + Run.shieldAdd();
    const p = this.catPoint(B);
    FX.addRing(p.x, p.y, 90 * B.cs, '#7ef9ff', 0.4, 8);
    SFX.play('shieldUp');
  },

  // Antippen eines Geschosses: zurück zum Werfer
  tryParry(B, x, y) {
    let best = null, bd = Infinity;
    for (const s of this.shots) {
      if (s.back || s.t < 0) continue;
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < 46 * B.cs * Math.max(1, s.size) && d < bd) { best = s; bd = d; }
    }
    if (!best) return false;
    best.back = true; best.sx = best.x; best.sy = best.y; best.t = 0; best.T = 0.4;
    S.stats.parries = (S.stats.parries || 0) + 1;
    B.purr = Math.min(100, B.purr + 4);
    FX.addRing(best.x, best.y, 60 * B.cs, '#9fffd0', 0.3, 6);
    B.text(best.x, best.y - 30 * B.cs, 'PARIERT!', '#9fffd0', 20 * B.cs, true);
    B.hitStop = Math.max(B.hitStop, 0.05);
    SFX.play('parry');
    return true;
  },

  reflectHit(B, o, s) {
    const cy = o.y - OBST_H[o.kind] * o.scale * 0.5;
    FX.addRing(o.x, cy, 90 * B.cs, '#9fffd0', 0.35, 8);
    const amt = (o.boss ? 0.035 : 0.6) * o.maxHp * Run.mirrorMul() * Math.max(1, s.size);
    if (o.boss && o.shield > 0) {
      o.shield -= o.shieldMax * 0.5;
      if (o.shield <= 0) B.breakShield(o);
      return;
    }
    // durch R.bossMult/Segen teilen wäre ungenau – Abprallschaden direkt abziehen
    o.hp = Math.max(o.boss ? 1 : 0, o.hp - amt);
    o.flash = 0.1; o.squash = 0.18;
    B.text(o.x, cy - 40 * B.cs, U.fmt(amt) + '!', '#9fffd0', 22 * B.cs, true);
    if (o.hp <= 1) B.damage(o, 2, false);
  },

  // ---------------------------------------------------------------- Vernichtungsschlag
  ultimate(B) {
    const o = B.bossObj;
    if (!o || this.ultDone) { B.bossFail(); return; }   // zweiter Ablauf: Boss entkommt
    this.ultDone = true;
    this.shots = [];
    this.beam = 0.55;
    B.whiteFlash = 0.7; B.shake = 26; B.hitStop = 0.12;
    B.punchZoom(0.08, (B.catX + o.x) / 2, B.groundY - 40 * B.cs);
    SFX.play('ult');
    const r = this.ref();
    if (this.shield > 0) {
      // Konter: der Schild wirft die Energie zurück
      if (o.shield > 0) B.breakShield(o);
      else { o.hp = Math.max(1, o.hp - o.maxHp * 0.12); o.flash = 0.2; o.squash = 0.2; }
      this.stun = 4;
      B.showBanner('KONTER!', `Schild hat den Schlag zurückgeworfen · +${ULT_EXTRA} s`, '#7ef9ff');
      SFX.play('block');
    } else {
      this.hurt(B, r.maxHp * Run.ultPct(), true);
      if (r.hp <= 0 || B.bossState !== 'active') return;
      this.stun = 3;
      B.showBanner('ÜBERLEBT!', `Boss erschöpft: +${ULT_EXTRA} s · 3 s lang +50 % Schaden`, '#ffd34d');
    }
    B.bossTimer += ULT_EXTRA;
    B.bossTimeMax = Math.max(B.bossTimeMax, B.bossTimer);
  },

  ko(B) {
    this.shots = []; this.shield = 0; this.dazed = 3; this.stun = 0;
    S.stats.kos = (S.stats.kos || 0) + 1;
    B.shake = 30; B.slowmo = 0.8;
    SFX.play('ko');
    if (Run.active) { Run.die(B); return; }
    const b = B.bossObj;
    if (b) b.fleeing = true;
    B.bossState = 'none'; B.bossObj = null;
    S.stage = Math.max(1, S.stage - 1);
    S.kills = 0; S.farm = true; S.farmKills = 0;
    this.ref().hp = this.ref().maxHp * 0.3;
    B.showBanner('K.O.!', `Zurück auf Stufe ${S.stage} – rüste auf und halte den Schild bereit!`, '#ff4d6d');
    Game.emit('stage');
  },

  // ---------------------------------------------------------------- Zeichnen (Spielwelt)
  draw(ctx, B) {
    const cs = B.cs, t = B.t, p = this.catPoint(B), r = this.ref();
    // Schaden: rotes Aufleuchten, Heilung: grünes
    if (this.hurtT > 0 || this.healT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      FX.drawGlow(ctx, p.x, p.y, 70 * cs, this.hurtT > 0 ? '#ff1e46' : '#6ee7a0', this.hurtT > 0 ? this.hurtT * 1.4 : this.healT * 0.5);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    // Schild-Blase
    if (this.shield > 0) {
      const f = Math.min(1, this.shield / 0.4), rad = 62 * cs * (1 + Math.sin(t * 9) * 0.02);
      ctx.save();
      ctx.globalAlpha = 0.16 * f; Draw.circle(ctx, p.x, p.y, rad, '#7ef9ff');
      ctx.globalAlpha = (0.55 + Math.sin(t * 12) * 0.2) * f; ctx.strokeStyle = '#bff8ff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.3 * f; ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + t * 0.8, hx = p.x + Math.cos(a) * rad * 0.6, hy = p.y + Math.sin(a) * rad * 0.6, hr = rad * 0.25;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) ctx.lineTo(hx + Math.cos(k * Math.PI / 3) * hr, hy + Math.sin(k * Math.PI / 3) * hr);
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    }
    // benommen: kreisende Sterne
    if (this.dazed > 0) {
      ctx.font = `${14 * cs}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * Math.PI * 2 / 3;
        ctx.fillText('💫', B.catX + 10 * cs + Math.cos(a) * 26 * cs, B.groundY - 82 * cs + Math.sin(a) * 7 * cs);
      }
    }
    // Vernichtungsschlag: Aura am Boss, danach ein Strahl zur Katze
    const o = B.bossObj;
    if (o && this.charging(B)) {
      const k = 1 - U.clamp(B.bossTimer / ULT_WARN, 0, 1), h = OBST_H[o.kind] * o.scale;
      ctx.globalCompositeOperation = 'lighter';
      FX.drawGlow(ctx, o.x, o.y - h * 0.55, h * (0.9 + k * 0.9) * (1 + Math.sin(t * (8 + k * 16)) * 0.08), '#ff1e46', 0.3 + k * 0.5);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    if (this.beam > 0 && o) {
      const f = this.beam / 0.55, h = OBST_H[o.kind] * o.scale;
      ctx.save(); ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      for (const [w, c, a] of [[60, '#ff1e46', 0.35], [26, '#ff8a3c', 0.7], [9, '#ffffff', 1]]) {
        ctx.globalAlpha = a * f; ctx.strokeStyle = c; ctx.lineWidth = w * cs * (0.6 + f * 0.4);
        ctx.beginPath(); ctx.moveTo(o.x, o.y - h * 0.55); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ctx.restore();
    }
    // Geschosse (rot umrandet = antippen!)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of this.shots) {
      if (s.t < 0) continue;
      const sz = 22 * cs * s.size;
      ctx.globalCompositeOperation = 'lighter';
      FX.drawGlow(ctx, s.x, s.y, sz * 1.3, s.back ? '#5effc8' : '#ff2d55', 0.55);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (!s.back) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 14) * 0.3; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.x, s.y, sz * 0.85, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.font = `${sz}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillText(s.icon, 0, 0);
      ctx.restore();
    }
    // Lebensbalken über der Katze (nur wenn er etwas zu sagen hat)
    if (Run.active || B.bossState === 'active' || r.hp < r.maxHp - 0.5 || this.dazed > 0) {
      const w = 64 * cs, h = 8 * cs, x = B.catX + 10 * cs - w / 2, y = B.groundY - 96 * cs;
      const f = U.clamp(this.shownHp / r.maxHp, 0, 1), now = this.frac();
      Draw.rrect(ctx, x - 2, y - 2, w + 4, h + 4, 5, 'rgba(20,10,30,0.75)');
      if (f > now) Draw.rrect(ctx, x, y, w * f, h, 4, '#ffffff');
      const col = now < 0.3 ? '#ff4d6d' : now < 0.6 ? '#ffb347' : '#6ee7a0';
      if (now > 0) Draw.rrect(ctx, x, y, Math.max(h, w * now), h, 4, col);
      if (this.shield > 0) { ctx.globalAlpha = 0.85; Draw.rrect(ctx, x, y - 4 * cs, w * this.shield / this.shieldMax, 3 * cs, 2, '#7ef9ff'); ctx.globalAlpha = 1; }
      ctx.font = `800 ${10 * cs}px "Segoe UI", "Segoe UI Emoji", sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.85)';
      const label = `❤️ ${Math.ceil(r.hp)}`;
      ctx.strokeText(label, x + w / 2, y - 9 * cs); ctx.fillStyle = '#fff'; ctx.fillText(label, x + w / 2, y - 9 * cs);
    }
  },

  // Warnung oben (über dem Spielfeld, unter der Stufenanzeige)
  drawOverlay(ctx, B, y) {
    if (!this.charging(B)) return;
    const W = B.Wp || B.W, t = B.t;
    const sec = Math.max(0, B.bossTimer).toFixed(1);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.min(22, W / 20) * (1 + Math.sin(t * 10) * 0.05);
    ctx.font = `900 ${fs}px "Segoe UI", "Segoe UI Emoji", sans-serif`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,10,30,0.9)';
    const txt = `⚠️ VERNICHTUNGSSCHLAG ${sec} s`;
    ctx.strokeText(txt, W / 2, y); ctx.fillStyle = Math.sin(t * 12) > 0 ? '#ff4d6d' : '#ffd34d'; ctx.fillText(txt, W / 2, y);
    const ready = S.best >= 3 && S.skillsCd.shield <= 0;
    const sub = this.shield > 0 ? '🛡️ Schild steht – Konter bereit!' : ready ? '🛡️ Jetzt Schild (Taste 4) für einen Konter!' : 'Besieg ihn vorher – oder überlebe den Treffer';
    ctx.font = `700 ${Math.min(13, W / 32)}px "Segoe UI", "Segoe UI Emoji", sans-serif`; ctx.lineWidth = 4;
    ctx.strokeText(sub, W / 2, y + fs * 0.9); ctx.fillStyle = '#fff'; ctx.fillText(sub, W / 2, y + fs * 0.9);
    ctx.restore();
  },
};

// ---------------------------------------------------------------------------
// Sounds
// ---------------------------------------------------------------------------
const _playV = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  switch (name) {
    case 'throw': if (this.throttle(name, 120)) { this.noiseF(0.18, 0.12, 0, 1800, 'bandpass', 2); this.tone(420, 0.15, 'triangle', 0.05, 260); } return;
    case 'parry':
      this.tone(1568, 0.12, 'square', 0.08); this.tone(2093, 0.18, 'triangle', 0.08, 0, 0.04);
      this.noiseF(0.08, 0.2, 0, 5000, 'highpass'); return;
    case 'hurt': if (this.throttle(name, 90)) { this.tone(220, 0.18, 'sawtooth', 0.12, -120); this.noiseF(0.15, 0.2, 0, 900, 'lowpass'); this.meow(0.75); } return;
    case 'block': this.tone(880, 0.25, 'sine', 0.1, 400); this.tone(1320, 0.3, 'triangle', 0.07, 300, 0.03); return;
    case 'shieldUp': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.07, f * 0.2, i * 0.04)); return;
    case 'heal': if (this.throttle(name, 200)) [659, 784, 988].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.06, 0, i * 0.06)); return;
    case 'ultTick': this.tone(140, 0.18, 'square', 0.08, -30); this.tone(110, 0.25, 'sawtooth', 0.06, -20, 0.05); return;
    case 'ult':
      this.noiseF(1.2, 0.45, 0, 600, 'lowpass');
      this.tone(80, 1.1, 'sawtooth', 0.2, -50); this.tone(55, 1.3, 'sine', 0.3, -25); return;
    case 'ko': [494, 392, 330, 247, 196].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.1, -20, i * 0.12)); return;
  }
  return _playV.call(this, name, arg);
};
