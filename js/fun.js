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

// ---------------------------------------------------------------------------
// Gähnen & Einrollen: nach 60 s ohne Eingabe gähnt die Katze, schließt die Augen, macht
// sich klein und schnarcht „Zzz“. Jede Eingabe weckt sie.
// Wetter-Reaktionen: beim Gewitter zucken alle Katzen bei jedem Blitz zusammen, bei der
// Sternschnuppennacht schauen sie nach oben, im Goldregen funkeln ihre Augen golden.
// Glühwürmchen: nachts (und in dunklen Gebieten) schwirren sie um die Katze – antippen
// gibt Münzen.
// Haustier-Freundschaft: Begleiter sammeln Herzen (Spielzeit, Bosse). Ab 10/30/60 Herzen
// tragen sie Schleife, Stirnband oder Krone; jede Stufe gibt +2 % Münzen.
// Sammelalbum: jeder neue Gegnertyp wird ein Sticker (Reiter Erfolge); je Sticker +0,5 %
// Münzen, volles Album +10 %.
// ---------------------------------------------------------------------------
Object.assign(Fun, {
  lastInput: performance.now(), yawned: false, zT: 0, flinchT: 0, bolts: 0, flies: [], flyT: 2, loveT: 60,

  idle() { return (performance.now() - this.lastInput) / 1000; },
  sleeping() { return this.idle() > 60 && !Run.active && Battle.bossState !== 'active'; },
  wake() {
    if (this.sleeping()) Battle.text(Battle.catX, Battle.groundY - 80 * Battle.cs, '!', '#ffd34d', 22 * Battle.cs, true);
    this.lastInput = performance.now(); this.yawned = false;
  },
  love() { return (S.petLove = S.petLove || {}); },
  loveLvl(id) { const h = this.love()[id] || 0; return h >= 60 ? 3 : h >= 30 ? 2 : h >= 10 ? 1 : 0; },
  album() { return (S.album = S.album || {}); },
});
for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => Fun.wake(), true);

const ALBUM_NAMES = { voidling: 'Leerling', eyeball: 'Glotzauge', shard: 'Kristallsplitter', ufo: 'Mini-Ufo', popup: 'Pop-up-Fenster', bug: 'Programmfehler', shade: 'Schattenwesen', chest: 'Schatztruhe' };
const albumName = k => ALBUM_NAMES[k] || BOSS_NAMES[k] || k;
const albumKinds = () => Object.keys(OBST_H).filter(k => k !== 'goldcat');
const PET_HATS = [null, 'bow', 'band', 'crown']; // Schleife, rotes Stirnband (Piratenhut war auf dunklem Grund unsichtbar), Krone

const _funUpd2 = Fun.update;
Fun.update = function (dt, B) {
  _funUpd2.call(this, dt, B);
  // Schlaf: Gähnen beim Einschlafen, dann Zzz
  if (this.sleeping()) {
    if (!this.yawned) { this.yawned = true; B.text(B.catX + 10 * B.cs, B.groundY - 84 * B.cs, '*gähn*', '#ffffff', 14 * B.cs, true); }
    this.zT -= dt;
    if (this.zT <= 0) { this.zT = 1.6; B.parts.push({ x: B.catX + 22 * B.cs, y: B.groundY - 62 * B.cs, vx: 18, vy: -34, life: 1.8, max: 1.8, size: U.rand(12, 18) * B.cs, emoji: '💤', grav: 0 }); }
  }
  // Gewitter: jeder neue Blitz lässt die Katzen zusammenzucken
  const nb = Events.bolts ? Events.bolts.length : 0;
  if (Events.active('storm') && nb > this.bolts) this.flinchT = 0.4;
  this.bolts = nb;
  this.flinchT = Math.max(0, this.flinchT - dt);
  // Glühwürmchen (nachts oder in dunklen Gebieten)
  const dark = (B.night || 0) > 0.5 || !!biomeFor(S.stage).dark;
  this.flyT -= dt;
  if (dark && this.flyT <= 0 && this.flies.length < 5) {
    this.flyT = U.rand(3, 6);
    this.flies.push({ x: B.catX + U.rand(-60, 60) * B.cs, y: B.groundY - U.rand(30, 120) * B.cs, ph: Math.random() * 6, life: 14 });
  }
  for (const f of this.flies) { f.ph += dt; f.life -= dt; f.x += Math.sin(f.ph * 1.3) * 22 * dt; f.y += Math.cos(f.ph * 1.7) * 16 * dt; }
  this.flies = this.flies.filter(f => f.life > 0 && (dark || f.life > 13));
  // Herzen für Begleiter: 1 je Minute Spielzeit
  this.loveT -= dt;
  if (this.loveT <= 0) { this.loveT = 60; for (const p of PETS) if (S.pets[p.id] > 0) this.addLove(B, p.id, 1); }
};
Fun.addLove = function (B, id, n) {
  const before = this.loveLvl(id);
  this.love()[id] = (this.love()[id] || 0) + n;
  const pp = B.petPos(id);
  B.parts.push({ x: pp.x, y: pp.y - 20 * B.cs, vx: 0, vy: -40, life: 1, max: 1, size: 14 * B.cs, emoji: '💗', grav: 0 });
  if (this.loveLvl(id) > before) {
    const p = PETS.find(x => x.id === id);
    UI.toast(`💗 <b>${p.name}</b> mag dich noch mehr!<br><small>Freundschaft Stufe ${this.loveLvl(id)} · +2 % Münzen · neuer Hut</small>`, 'good');
    recalc();
  }
};

// Glühwürmchen antippen (vor dem Streicheln)
const _funTap = Fun.tap;
Fun.tap = function (B, x, y) {
  for (const f of this.flies) {
    if (Math.hypot(x - f.x, y - f.y) < 26 * B.cs) {
      f.life = 0;
      const c = Econ.coins(S.stage) * R.coinMult * 3; Game.addCoins(c);
      B.text(f.x, f.y - 14 * B.cs, '+' + U.fmt(c), '#fff6a8', 14 * B.cs, true);
      FX.addRing(f.x, f.y, 26 * B.cs, '#fff6a8', 0.25, 3);
      SFX.play('coin');
      return true;
    }
  }
  return _funTap.call(this, B, x, y);
};

// Katzen zeichnen: schlafen, zusammenzucken, nach oben schauen, goldene Augen
const _funCat2 = Draw.cat;
Draw.cat = function (ctx, x, y, s, cat, t, opt = {}) {
  const main = opt.lamp != null, ghost = !main && cat && cat.ghost;
  if (main || ghost) {
    opt = { ...opt };
    if (main && Fun.sleeping()) { opt.sleep = true; opt.squash = (opt.squash || 0) + 0.1; opt.look = { x: 0, y: 0.4 }; }
    if (Fun.flinchT > 0) opt.ouch = Math.max(opt.ouch || 0, Fun.flinchT / 0.4);
    else if (Events.active('meteor')) opt.look = { x: 0.35, y: -1 };
    if (Events.active('goldrain')) cat = { ...cat, eye: '#ffd34d' };
  }
  return _funCat2.call(this, ctx, x, y, s, cat, t, opt);
};

// Hüte der Begleiter und Glühwürmchen
const _funPet = Draw.pet;
Draw.pet = function (ctx, id, x, y, t, cs, o) {
  _funPet.call(this, ctx, id, x, y, t, cs, o);
  const hat = PET_HATS[Fun.loveLvl(id)];
  if (hat) {
    const dy = { owl: -24, fish: -26, mouse: -12 }[id] || -20;
    ctx.save(); ctx.translate(x, y + dy * cs); ctx.scale(cs * 0.55, cs * 0.55); ctx.translate(0, 14);
    Draw.hat(ctx, hat, t); ctx.restore();
  }
};
const _funObst = Draw.obstacle;
let _funFlyFrame = -1;
Draw.obstacle = function (ctx, o, biome, t) {
  _funObst.call(this, ctx, o, biome, t);
  if (_funFlyFrame === Battle.t || ctx !== Battle.ctx) return; // einmal je Bild, nur im Spielfeld
  _funFlyFrame = Battle.t;
  const cs = Battle.cs;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const f of Fun.flies) {
    const a = Math.min(1, f.life / 2) * (0.6 + Math.sin(f.ph * 6) * 0.4);
    FX.drawGlow(ctx, f.x, f.y, 10 * cs, '#d9ff7a', a);
    Draw.circle(ctx, f.x, f.y, 1.6 * cs, `rgba(255,255,220,${a.toFixed(2)})`);
  }
  ctx.restore();
};

// Sammelalbum: Kill eines neuen Gegnertyps → Sticker; Bosse geben Herzen
const _funKill = Battle.kill;
Battle.kill = function (o) {
  const fresh = !o.dead;
  _funKill.call(this, o);
  if (!fresh) return;
  const al = Fun.album(), k = o.kind;
  if (albumKinds().includes(k)) {
    const first = !al[k];
    al[k] = (al[k] || 0) + 1;
    if (first) {
      UI.toast(`📖 <b>Neuer Sticker!</b><br><small>${albumName(k)} · ${Object.keys(al).length} / ${albumKinds().length} im Sammelalbum</small>`, 'ach');
      recalc();
    }
  }
  if (o.boss) for (const p of PETS) if (S.pets[p.id] > 0) Fun.addLove(this, p.id, 2);
};

// Boni: Freundschaft (+2 % Münzen je Stufe), Album (+0,5 % je Sticker, voll +10 %)
const _funRecalc = recalc;
recalc = function () {
  _funRecalc();
  let k = 1;
  for (const p of PETS) k *= 1 + 0.02 * Fun.loveLvl(p.id);
  const n = Object.keys(Fun.album()).length, all = albumKinds().length;
  k *= (1 + 0.005 * n) * (n >= all ? 1.1 : 1);
  R.coinMult *= k;
};

// Album-Bilder: jeder Gegner einmal klein auf eine eigene Leinwand gezeichnet
Fun.stickerImg = {};
Fun.sticker = function (k) {
  if (this.stickerImg[k] !== undefined) return this.stickerImg[k];
  let url = '';
  try {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d'), h = OBST_H[k] || 80, sc = Math.min(1.1, 76 / h);
    const o = { id: 7, kind: k, x: 48, y: 90, scale: sc, hp: 1, maxHp: 1, flash: 0, fl: 0, squash: 0, shakeX: 0, kx: 0, tilt: 0, dead: false, fleeing: false };
    Draw.obstacle(g, o, biomeFor(S.stage), 1);
    url = c.toDataURL();
  } catch (e) { url = ''; }
  return (this.stickerImg[k] = url);
};
const _funAch = UI.tab_ach;
UI.tab_ach = function () {
  const al = Fun.album(), kinds = albumKinds(), n = kinds.filter(k => al[k]).length;
  const love = PETS.filter(p => S.pets[p.id] > 0).map(p => `<span>${p.icon} ${p.name}: <b>${Fun.love()[p.id] || 0} 💗</b> · Stufe ${Fun.loveLvl(p.id)}</span>`).join('');
  const card = k => {
    if (!al[k]) return '<div class="stk"><i>?</i><b>???</b><small>noch nicht besiegt</small></div>';
    const img = Fun.sticker(k);
    return `<div class="stk on">${img ? `<img src="${img}" alt="">` : '<i>★</i>'}<b>${albumName(k)}</b><small>${U.fmt(al[k])}×</small></div>`;
  };
  return _funAch.call(this) + `<div class="sec"><h3>📖 Sammelalbum <small>${n} / ${kinds.length} · +${(n * 0.5).toFixed(1)} % Münzen${n >= kinds.length ? ' · voll: +10 %' : ''}</small></h3>
    <div class="album">${kinds.map(card).join('')}</div></div>
    ${love ? `<div class="sec"><h3>💗 Freundschaft der Begleiter</h3><p class="muted">Herzen gibt es für Spielzeit und Bosse. Ab 10 / 30 / 60 💗: Schleife, Stirnband, Krone und je Stufe +2 % Münzen.</p><div class="lovelist">${love}</div></div>` : ''}`;
};
