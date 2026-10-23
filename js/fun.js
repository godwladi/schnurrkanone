'use strict';
// ---------------------------------------------------------------------------
// Kleine Freuden:
//   Sieges-Tänzchen – nach jedem Boss hüpft und wackelt die Katze kurz; bei einem neuen
//                     Rekord gibt es zusätzlich ein Feuerwerk.
//   Combo-Kamera    – ab einer Combo von 25 zoomt das Bild sanft heran (Wackel-Option aus = aus).
//   Katze antippen  – sie maunzt, hüpft und verteilt Herzchen (zählt nicht als Pfotenhieb).
// ---------------------------------------------------------------------------

const Fun = {
  danceT: 0, danceMax: 1, fireT: 0, fireNext: 0, petAt: 0,

  dance(sec) { this.danceT = Math.max(this.danceT, sec); this.danceMax = Math.max(sec, 0.01); },

  update(dt, B) {
    this.danceT = Math.max(0, this.danceT - dt);
    // Feuerwerk: über ~2,4 s verteilte Raketen am Himmel
    if (this.fireT > 0) {
      this.fireT -= dt; this.fireNext -= dt;
      if (this.fireNext <= 0) {
        this.fireNext = U.rand(0.18, 0.32);
        const x = U.rand(0.2, 0.8) * (B.Wp || B.W), y = U.rand(0.15, 0.4) * B.groundY, hue = U.randi(0, 360);
        for (let i = 0; i < 26; i++) {
          const a = i / 26 * Math.PI * 2, v = U.rand(140, 260);
          B.particle(x, y, Math.cos(a) * v, Math.sin(a) * v, `hsl(${hue + U.randi(-20, 20)},95%,65%)`, U.rand(0.7, 1.1), U.rand(2.5, 4) * B.cs, 160, false, 'spark');
        }
        FX.addRing(x, y, 70 * B.cs, `hsl(${hue},95%,75%)`, 0.3, 4);
        SFX.play('pop');
      }
    }
    // Combo-Kamera: sanfter Dauer-Zoom auf das Kampfgeschehen
    if (B.combo >= 25 && B.comboT > 0 && S.optShake) {
      const z = 0.012 + Math.min(0.02, (B.combo - 25) * 0.0004);
      if (B.zoom.a < z) { B.zoom.a = z; B.zoom.x = (B.catX + B.frontX) / 2; B.zoom.y = B.groundY - 50 * B.cs; }
    }
  },

  // Katze antippen
  tap(B, x, y) {
    const cx = B.catX + 8 * B.cs, cy = B.groundY - 36 * B.cs;
    if (Math.hypot(x - cx, y - cy) > 40 * B.cs || Vitals.koPending) return false;
    if (B.t - this.petAt < 0.35) return true;
    this.petAt = B.t;
    this.dance(0.55);
    for (let i = 0; i < 5; i++) B.parts.push({ x: cx + U.rand(-16, 16) * B.cs, y: cy - 30 * B.cs, vx: U.rand(-40, 40), vy: U.rand(-140, -80), life: 0.9, max: 0.9, size: U.rand(14, 20) * B.cs, emoji: U.pick(['💗', '❤️', '✨']), grav: 60 });
    B.text(cx, cy - 58 * B.cs, U.pick(['Miau!', 'Schnurr…', 'Mrrrau!', 'Miep!']), '#ffd6f3', 15 * B.cs, true);
    SFX.play('meow', U.rand(0.9, 1.3));
    return true;
  },
};

// Tänzchen: die eigene Katze (nur sie bekommt opt.lamp) hüpft und wackelt
const _funCat = Draw.cat;
Draw.cat = function (ctx, x, y, s, cat, t, opt = {}) {
  if (opt.lamp == null || Fun.danceT <= 0) return _funCat.call(this, ctx, x, y, s, cat, t, opt);
  const k = Math.min(1, Fun.danceT / Math.min(0.3, Fun.danceMax)), ph = (Fun.danceMax - Fun.danceT) * 14;
  ctx.save();
  ctx.translate(x, y - Math.abs(Math.sin(ph)) * 10 * s * k);
  ctx.rotate(Math.sin(ph) * 0.12 * k);
  _funCat.call(this, ctx, 0, 0, s, cat, t, opt);
  ctx.restore();
};
const _funUpdate = Battle.update;
Battle.update = function (dt) { _funUpdate.call(this, dt); Fun.update(dt, this); };
const _funPaw = Battle.paw;
Battle.paw = function (x, y) {
  if (x !== undefined && Fun.tap(this, x, y)) return;
  return _funPaw.call(this, x, y);
};
// Boss besiegt → Tänzchen; neuer Rekord (Hauptspiel) → Feuerwerk
const _funWin = Battle.bossWin;
Battle.bossWin = function (o) {
  const best = S.best;
  _funWin.call(this, o);
  Fun.dance(1.6);
  if (!Run.active && S.best > best) { Fun.fireT = 2.4; Fun.fireNext = 0.3; }
};
