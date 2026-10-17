'use strict';
// ---------------------------------------------------------------------------
// Wetter-Ereignisse (Gewitter, Meteore, Goldregen, Katzenminze),
// Tagesaufgaben und zusätzliche Sounds
// ---------------------------------------------------------------------------

const EVENTS = [
  { id: 'storm',    name: 'Gewittersturm',       icon: '⛈️', desc: 'Blitze schlagen ein · +25% Feuerrate', color: '#9fd8ff' },
  { id: 'meteor',   name: 'Sternschnuppennacht', icon: '☄️', desc: 'Meteore regnen auf die Hindernisse',   color: '#c7b3ff' },
  { id: 'goldrain', name: 'Goldregen',           icon: '🌟', desc: '25% goldene Hindernisse',              color: '#ffd34d' },
  { id: 'catnip',   name: 'Katzenminze-Rausch',  icon: '🌿', desc: 'Schnurr-Meter füllt sich 3× schneller', color: '#6ee7a0' },
];
const EVENT_DURATION = 60;

const Events = {
  cur: null, t: 0, next: 150, cd: 0, flash: 0,
  bolts: [], meteors: [],

  active(id) { return !!this.cur && this.cur.id === id; },

  update(dt, B) {
    if (!this.cur) {
      this.next -= dt;
      if (this.next <= 0) this.start(U.pick(EVENTS), B);
    } else {
      this.t -= dt;
      if (this.t <= 0) this.end(B);
      else this.tick(dt, B);
    }
    this.flash = Math.max(0, this.flash - dt * 3);
    for (const b of this.bolts) b.life -= dt;
    this.bolts = this.bolts.filter(b => b.life > 0);
    for (const m of this.meteors) {
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
      const step = m.speed * dt;
      if (d <= step) { this.impact(m, B); m.done = true; continue; }
      m.x += dx / d * step; m.y += dy / d * step;
      if (Math.random() < dt * 40) B.particle(m.x, m.y, U.rand(-40, 40), U.rand(-40, 40), U.pick(['#c7b3ff', '#ffb38a', '#ffffff']), 0.4, 4 * B.cs, 0, false, 'spark');
    }
    this.meteors = this.meteors.filter(m => !m.done);
  },

  start(ev, B) {
    this.cur = ev;
    this.t = EVENT_DURATION;
    this.cd = 1.5;
    B.showBanner(`${ev.name.toUpperCase()}!`, ev.desc, ev.color);
    SFX.play('eventStart');
    Game.emit('toast', { text: `${ev.icon} <b>${ev.name}</b><br><small>${ev.desc} · ${EVENT_DURATION} s</small>`, cls: 'ach' });
  },
  end() { this.cur = null; this.next = U.rand(240, 420); },

  tick(dt, B) {
    this.cd -= dt;
    const id = this.cur.id;
    if (id === 'storm' && this.cd <= 0) { this.cd = U.rand(1.2, 2.6); this.strike(B); }
    if (id === 'meteor' && this.cd <= 0) { this.cd = U.rand(0.7, 1.5); this.spawnMeteor(B); }
    if (id === 'goldrain' && Math.random() < dt * 25) B.particle(U.rand(0, B.W), -10, U.rand(-20, 20), U.rand(120, 220), '#ffe680', 2.5, U.rand(5, 9) * B.cs, 0, false, 'star');
    if (id === 'catnip' && Math.random() < dt * 20) {
      const p = B.particle(U.rand(0, B.W), B.groundY + 10, U.rand(-20, 20), U.rand(-80, -30), U.pick(['#6ee7a0', '#b5f5c8', '#ff9ee0']), 2.5, U.rand(4, 7) * B.cs, -10, false, 'blob');
      if (p) p.drag = 1;
    }
  },

  randomTarget(B) {
    const live = B.obs.filter(o => !o.dead && !o.fleeing && !o.dying && o.x < B.W - 30);
    return live.length ? U.pick(live) : null;
  },

  // Blitz: gezackter Pfad vom Himmel ins Ziel
  strike(B) {
    const o = this.randomTarget(B);
    if (!o) return;
    const tx = o.x, ty = o.y - OBST_H[o.kind] * o.scale * 0.6;
    const pts = [];
    let x = tx + U.rand(-80, 80), y = -10;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      pts.push([U.lerp(x, tx, k) + (i && i < n ? U.rand(-28, 28) : 0), U.lerp(y, ty, k)]);
    }
    const branch = [];
    const bi = U.randi(2, 5);
    let bx = pts[bi][0], by = pts[bi][1];
    for (let i = 0; i < 4; i++) { bx += U.rand(-40, 40); by += U.rand(15, 35); branch.push([bx, by]); }
    this.bolts.push({ pts, branch: [pts[bi], ...branch], life: 0.28, max: 0.28 });
    this.flash = 0.7;
    B.damage(o, R.dps * 4 * (Battle.frenzy > 0 ? 3 : 1), true, false, 'laser');
    FX.addRing(tx, ty, 110 * B.cs, '#bfe3ff', 0.35, 8);
    for (let i = 0; i < 20; i++) B.particle(tx, ty, U.rand(-300, 300), U.rand(-350, 50), U.pick(['#ffffff', '#bfe3ff', '#ffe680']), 0.5, 4 * B.cs, 600, false, 'spark');
    B.shake = Math.max(B.shake, 10);
    SFX.play('thunder');
  },

  spawnMeteor(B) {
    const o = this.randomTarget(B);
    if (!o) return;
    const tx = o.x, ty = o.y - OBST_H[o.kind] * o.scale * 0.5;
    this.meteors.push({ x: tx + U.rand(250, 450), y: -40, tx, ty, target: o, speed: U.rand(700, 1000), size: U.rand(7, 11) * B.cs });
    SFX.play('meteor');
  },

  impact(m, B) {
    for (const o of B.obs) {
      if (o.dead || o.fleeing || o.dying) continue;
      if (Math.abs(o.x - m.tx) < 90 * B.cs) B.damage(o, R.dps * 3 * (Battle.frenzy > 0 ? 3 : 1) * (o === m.target ? 1 : 0.5), true, false, 'laser');
    }
    FX.addRing(m.tx, m.ty, 130 * B.cs, '#c7b3ff', 0.4, 9);
    B.particle(m.tx, m.ty, 0, 0, '#c7b3ff', 0.2, 70 * B.cs, 0, false, 'flash');
    for (let i = 0; i < 24; i++) {
      const p = B.particle(m.tx, m.ty, U.rand(-320, 320), U.rand(-420, -60), U.pick(['#7d7f9a', '#c7b3ff', '#ffb38a']), U.rand(0.7, 1.3), U.rand(4, 8) * B.cs, 1200, true, 'chunk');
      if (p) p.spin = U.rand(-12, 12);
    }
    B.shake = Math.max(B.shake, 8);
    B.hitStop = Math.max(B.hitStop, 0.03);
    SFX.play('boom');
  },

  // im Spielfeld (mit Kamera) zeichnen
  draw(ctx, B) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const b of this.bolts) {
      const a = b.life / b.max;
      for (const [path, wMul] of [[b.pts, 1], [b.branch, 0.5]]) {
        ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 12 * wMul * B.cs;
        ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 * wMul * B.cs;
        ctx.beginPath(); path.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      }
      const end = b.pts[b.pts.length - 1];
      FX.drawGlow(ctx, end[0], end[1], 60 * B.cs, '#bfe3ff', a);
    }
    for (const m of this.meteors) {
      const ang = Math.atan2(m.ty - m.y, m.tx - m.x);
      ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ffb38a'; ctx.lineWidth = m.size * 1.2;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - Math.cos(ang) * 120 * B.cs, m.y - Math.sin(ang) * 120 * B.cs); ctx.stroke();
      ctx.globalAlpha = 1; ctx.strokeStyle = '#fff1e0'; ctx.lineWidth = m.size * 0.5;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - Math.cos(ang) * 60 * B.cs, m.y - Math.sin(ang) * 60 * B.cs); ctx.stroke();
      FX.drawGlow(ctx, m.x, m.y, m.size * 4, '#c7b3ff', 0.9);
      FX.drawGlow(ctx, m.x, m.y, m.size * 1.6, '#ffffff', 1);
    }
    ctx.restore();
  },

  // Bildschirm-Tönung (ohne Kamera)
  drawScreen(ctx, B) {
    const W = B.W, H = B.H;
    if (this.active('storm')) { ctx.globalAlpha = 0.22; ctx.fillStyle = '#0a1230'; ctx.fillRect(0, 0, W, H); }
    if (this.active('catnip')) { ctx.globalAlpha = 0.08 + Math.sin(B.t * 3) * 0.04; ctx.fillStyle = '#6ee7a0'; ctx.fillRect(0, 0, W, H); }
    if (this.flash > 0) { ctx.globalAlpha = this.flash * 0.45; ctx.fillStyle = '#e8f4ff'; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1;
  },

  drawPill(ctx, B, y) {
    if (!this.cur) return;
    const ev = this.cur, txt = `${ev.icon} ${ev.name} ${Math.ceil(this.t)} s`;
    ctx.font = '800 13px "Segoe UI", "Segoe UI Emoji", sans-serif';
    const w = ctx.measureText(txt).width + 26;
    Draw.rrect(ctx, 14, y, w, 30, 15, 'rgba(20,14,40,0.7)');
    Draw.rrect(ctx, 14, y + 26, w * (this.t / EVENT_DURATION), 4, 2, ev.color);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = ev.color;
    ctx.fillText(txt, 27, y + 14);
    ctx.textAlign = 'center';
  },
};

// ---------------------------------------------------------------------------
// Tagesaufgaben
// ---------------------------------------------------------------------------
const QUEST_POOL = [
  { stat: 'kills',     goals: [150, 300, 600], icon: '🌳', text: g => `Zerstöre ${g} Hindernisse` },
  { stat: 'bossKills', goals: [3, 6, 10],      icon: '👑', text: g => `Besiege ${g} Bosse` },
  { stat: 'merges',    goals: [5, 10, 20],     icon: '✨', text: g => `Verschmelze ${g} Waffen` },
  { stat: 'clicks',    goals: [100, 250, 500], icon: '🐾', text: g => `Verteile ${g} Pfotenhiebe` },
  { stat: 'balloons',  goals: [1, 2],          icon: '🎈', text: g => `Platze ${g} Glücksballon${g > 1 ? 's' : ''}` },
  { stat: 'chests',    goals: [1, 3],          icon: '🎁', text: g => `Öffne ${g} Glückskiste${g > 1 ? 'n' : ''}` },
  { stat: 'frenzies',  goals: [1, 3, 5],       icon: '💗', text: g => `Löse ${g}× die Schnurr-Raserei aus` },
  { stat: 'skills',    goals: [3, 8, 15],      icon: '⚡', text: g => `Setze ${g} Skills ein` },
  { stat: 'combo',     goals: [15, 30, 50],    icon: '🔥', text: g => `Erreiche eine Combo von ${g}`, max: true },
  { stat: 'treasures', goals: [1, 3],          icon: '🧰', text: g => `Knacke ${g} Schatztruhe${g > 1 ? 'n' : ''}` },
];
const QUEST_BONUS = 20;

const Quests = {
  ensure() {
    const today = U.today();
    if (S.quests.day === today && S.quests.list.length) return;
    const idx = QUEST_POOL.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 3);
    S.quests = {
      day: today, bonus: false, comboBest: 0,
      list: idx.map(p => {
        const q = QUEST_POOL[p], gi = U.randi(0, q.goals.length - 1);
        return { p, goal: q.goals[gi], base: S.stats[q.stat] || 0, reward: 6 + gi * 6, done: false, claimed: false };
      }),
    };
    Game.emit('quests');
  },
  progress(q) {
    const def = QUEST_POOL[q.p];
    const v = def.max ? S.quests.comboBest : (S.stats[def.stat] || 0) - q.base;
    return Math.min(q.goal, Math.max(0, v));
  },
  check() {
    for (const q of S.quests.list) {
      if (q.done || this.progress(q) < q.goal) continue;
      q.done = true;
      SFX.play('quest');
      Game.emit('toast', { text: `📜 <b>Aufgabe erfüllt!</b><br><small>${QUEST_POOL[q.p].text(q.goal)} – im Reiter „Aufgaben“ abholen</small>`, cls: 'ach' });
      Game.emit('quests');
    }
  },
  claim(i) {
    const q = S.quests.list[i];
    if (!q || !q.done || q.claimed) return false;
    q.claimed = true;
    S.bones += q.reward;
    SFX.play('achievement');
    if (!S.quests.bonus && S.quests.list.every(x => x.claimed)) {
      S.quests.bonus = true;
      S.bones += QUEST_BONUS;
      S.freeChestAt = Math.min(S.freeChestAt, Date.now());
      setTimeout(() => SFX.play('victory'), 300);
      Game.emit('toast', { text: `🏅 <b>Alle Tagesaufgaben erledigt!</b><br><small>+${QUEST_BONUS} 🦴 und eine Gratis-Kiste ist bereit</small>`, cls: 'ach' });
    }
    Game.emit('quests');
    return true;
  },
  claimable() { return S.quests.list.some(q => q.done && !q.claimed); },
};

// ---------------------------------------------------------------------------
// zusätzliche Sounds
// ---------------------------------------------------------------------------
const _play2 = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  switch (name) {
    case 'thunder':
      this.noiseF(0.12, 0.5, 0, 5000, 'highpass');
      this.noiseF(1.6, 0.45, 0.03, 260, 'lowpass');
      this.noiseF(1.2, 0.2, 0.25, 120, 'lowpass');
      return;
    case 'meteor': {
      const c = this.ctx, t = c.currentTime;
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noiseBuf; src.loop = true;
      f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(3500, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.6);
      return;
    }
    case 'boom':
      this.noiseF(0.6, 0.35, 0, 500, 'lowpass');
      this.tone(90, 0.5, 'sine', 0.3, -50);
      return;
    case 'eventStart':
      [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.08, 0, i * 0.07));
      this.tone(262, 0.8, 'sine', 0.1, 0, 0.1);
      return;
    case 'quest':
      [659, 880, 1175].forEach((f, i) => this.tone(f, 0.2, 'square', 0.06, 0, i * 0.08));
      return;
    case 'treasure':
      this.tone(220, 0.15, 'square', 0.08, 220);
      [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.08, 0, 0.12 + i * 0.06));
      return;
  }
  return _play2.call(this, name, arg);
};
