'use strict';
// ---------------------------------------------------------------------------
// Alpha-Gegner und Alpha-Bosse, Schattenwesen im Bosskampf.
//   Alpha-Gegner (ab Stufe 15, im Streifzug ab Raum 4, selten): 4× Leben, größer,
//     glühende Aura, α-Plakette. Wirft im Hauptspiel selbst nach der Katze.
//     Ab 50 % Leben rasend (rote Aura, wirft schneller). Beute: 5× Münzen, +2 🦴.
//   Alpha-Boss (ab Stufe 20; jede 10. Stufe jeder zweite, sonst selten): 2,2× Leben,
//     +8 s Zeit, ab 50 % rasend (wirft schneller), ruft zwei Schattenwesen herbei.
//     Beute: 3× Münzen und 3× Gräten.
//   Schattenwesen im Bosskampf: drängeln sich VOR den Boss (Kugeln treffen erst sie),
//     während der Boss-Countdown weiterläuft. Normale Bosse rufen mit 40 % eines.
// ---------------------------------------------------------------------------

const ALPHA_FROM = 15, ALPHA_BOSS_FROM = 20;

const Alpha = {
  // aus Battle.makeObstacle(): manche Gegner werden zum Alpha
  maybe(o) {
    if (!o || o.treasure || o.shade || o.kind === 'shade') return o;
    const B = Battle, run = Run.active, depth = run ? S.run.depth : 0;
    if (o.boss) {
      const ok = run ? depth >= 8 : S.stage >= ALPHA_BOSS_FROM;
      const chance = run ? 0.12 : S.stage % 10 === 0 ? 0.5 : 0.12;
      if (!ok || Math.random() > chance) return o;
      o.alpha = true; o.hp = o.maxHp = o.maxHp * 2.2; o.scale *= 1.12;
      return o;
    }
    const ok = run ? depth >= 4 : S.stage >= ALPHA_FROM;
    if (!ok || Math.random() > (run ? 0.05 : 0.04) || B.obs.some(x => x.alpha && !x.boss && !x.dead && !x.fleeing)) return o;
    o.alpha = true; o.golden = o.fruit = false;
    o.hp = o.maxHp = o.maxHp * 4; o.scale *= 1.25;
    o.alphaNew = true;
    return o;
  },

  // Rasend ab 50 % Leben (einmal)
  check(B, o) {
    if (!o.alpha || o.enraged || o.dead || o.hp > o.maxHp * 0.5) return;
    o.enraged = true;
    o.windup = 0.35; B.shake = Math.max(B.shake, o.boss ? 12 : 6);
    FX.addRing(o.x, o.y - OBST_H[o.kind] * o.scale * 0.5, 160 * B.cs, '#ff2d55', 0.45, 8);
    if (o.boss) B.showBanner('ALPHA RASEND!', 'Wirft jetzt schneller – halte durch!', '#ff2d55');
    SFX.play('boss');
  },

  // Schattenwesen in den Bosskampf schicken (die Zeit läuft weiter)
  bossShades(B) {
    const b = B.bossObj;
    if (B.bossState !== 'active' || !b || b.dying > 0 || B.bossIntro > 0 || Run.paused()) return;
    if (b.shadeAt === undefined) {
      const okStage = Run.active ? S.run.depth >= 2 : S.stage >= SHADE_FROM;
      b.shadeAt = !okStage ? [] : b.alpha ? [0.72, 0.38] : Math.random() < 0.4 ? [U.rand(0.4, 0.7)] : [];
    }
    if (!b.shadeAt.length || B.bossTimer > B.bossTimeMax * b.shadeAt[0]) return;
    if (B.obs.some(x => x.shade && !x.dead && !x.fleeing)) return; // höchstens eines zugleich
    b.shadeAt.shift();
    const tg = Shades.targets();
    if (!tg.length) return;
    const hp = Econ.hp(S.stage) * 2.5;
    const o = Run.adjustObstacle({
      id: B.nextId++, kind: 'shade', boss: false, fruit: false, golden: false, treasure: false,
      x: B.W + 60, y: B.groundY, hp, maxHp: hp, scale: B.cs,
      flash: 0, squash: 0, shakeX: 0, dead: false, fleeing: false,
    });
    o.kind = 'shade'; delete o.trait;
    o.shade = { t: SHADE_CAST, target: U.pick(tg) };
    o.bossMinion = true;
    B.obs.unshift(o);
    Shades.onSpawn(B);
  },

  // Beute und Meldung
  onKill(B, o) {
    if (!o.alpha) return;
    const bones = o.boss ? Econ.bones(S.stage) * 2 : 2; // Boss: zusammen mit der normalen Boss-Beute 3×
    S.bones += bones;
    B.spawnFlyers(o.x, o.y - OBST_H[o.kind] * o.scale * 0.5, o.boss ? 14 : 6, 'bone');
    if (o.boss) B.showBanner('ALPHA BESIEGT!', `3× Münzen · +${bones} 🦴 extra`, '#ffd34d');
    else UI.toast(`α <b>Alpha besiegt!</b><br><small>5× Münzen · +${bones} 🦴</small>`, 'good');
  },

  // Aura hinter dem Körper (kühl-gold, rasend rot) und aufsteigende Glut
  aura(ctx, o, t) {
    const h = OBST_H[o.kind] * o.scale, cy = o.y - h * 0.5, pulse = 0.5 + Math.sin(t * (o.enraged ? 9 : 4) + o.id) * 0.18;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    FX.drawGlow(ctx, o.x, cy, h * (o.boss ? 0.95 : 1.05), o.enraged ? '#ff2d55' : '#ffb347', pulse);
    ctx.restore();
    if (Math.random() < 0.35) Battle.particle(o.x + U.rand(-0.4, 0.4) * h, o.y - U.rand(0.1, 0.9) * h, U.rand(-15, 15), U.rand(-70, -30), o.enraged ? '#ff5d73' : '#ffd34d', 0.6, U.rand(2, 4) * Battle.cs, -20, false, 'spark');
  },

  // α-Plakette rechts am Lebensbalken
  badge(ctx, o, x, y, h) {
    const r = Math.max(7, h * 1.1);
    ctx.save();
    Draw.rrect(ctx, x - r, y - r, r * 2, r * 2, r, o.enraged ? '#ff2d55' : '#b8860b');
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = `900 ${r * 1.3}px "Segoe UI", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('α', x, y + r * 0.05);
    ctx.restore();
  },
};

// ---------------------------------------------------------------- Einhängen
const _alphaMake = Battle.makeObstacle;
Battle.makeObstacle = function (boss) { return Alpha.maybe(_alphaMake.call(this, boss)); };

const _alphaBoss = Battle.spawnBoss;
Battle.spawnBoss = function () {
  _alphaBoss.call(this);
  const o = this.bossObj;
  if (o && o.alpha) {
    this.bossTimeMax += 8; this.bossTimer = this.bossTimeMax;
    this.showBanner('ALPHA-BOSS!', `${BOSS_NAMES[o.kind]} · ${this.bossTimeMax} s · ruft Schattenwesen`, '#ff2d55');
  }
};

const _alphaUpdate = Battle.update;
Battle.update = function (dt) {
  _alphaUpdate.call(this, dt);
  Alpha.bossShades(this);
  for (const o of this.obs) {
    if (!o.alpha) continue;
    Alpha.check(this, o);
    if (o.alphaNew && o.x < (this.Wp || this.W) - 20) {
      o.alphaNew = false;
      this.showBanner('ALPHA!', 'Viel Leben, wirft zurück – reiche Beute', '#ffb347');
      SFX.play('shadeCall');
    }
  }
};

const _alphaKill = Battle.kill;
Battle.kill = function (o) {
  const was = !o.dead;
  _alphaKill.call(this, o);
  if (was) Alpha.onKill(this, o);
};

const _alphaDraw = Draw.obstacle;
Draw.obstacle = function (ctx, o, biome, t) {
  if (o.alpha && !o.dead) Alpha.aura(ctx, o, t);
  _alphaDraw.call(this, ctx, o, biome, t);
};

const _alphaBar = Battle.drawHpBar;
Battle.drawHpBar = function (ctx, o) {
  _alphaBar.call(this, ctx, o);
  if (!o.alpha) return;
  const w = (o.boss ? 120 : 56) * this.cs, h = (o.boss ? 10 : 6) * this.cs;
  const y = o.y - OBST_H[o.kind] * o.scale - (o.boss ? 40 : 16) * this.cs;
  Alpha.badge(ctx, o, o.x + w / 2 + h * 1.4, y + h / 2, h);
};
