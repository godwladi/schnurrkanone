'use strict';
// ---------------------------------------------------------------------------
// Combo-Anzeige: Abzeichen mit Zeit-Ring, große Zahl mit Stufen-Namen, Funken
// beim Erreichen einer neuen Stufe, Flammen ab „Wahnsinn“ und ein Zerbrech-Effekt,
// wenn die Kette reißt. Gezeichnet in Bildschirm-Koordinaten (nach der Kamera).
// ---------------------------------------------------------------------------

const COMBO_TIERS = [
  { at: 3,  name: 'COMBO',            color: '#b9a3ff', icon: '🐾' },
  { at: 5,  name: 'NETT!',            color: '#5ab0ff', icon: '🐾' },
  { at: 10, name: 'SUPER!',           color: '#6ee7a0', icon: '⚡' },
  { at: 20, name: 'WAHNSINN!',        color: '#ffd34d', icon: '🔥' },
  { at: 35, name: 'SCHNURRTASTISCH!', color: '#ff7ad9', icon: '💥' },
  { at: 50, name: 'LEGENDÄR!',        color: 'rainbow', icon: '👑' },
];

const Combo = {
  tier: -1, tierT: 0, sparks: [], broken: null, maxT: 1.6, x: 0, y: 0,

  tierOf(n) { let t = -1; COMBO_TIERS.forEach((c, i) => { if (n >= c.at) t = i; }); return t; },
  color(i, t) {
    const c = COMBO_TIERS[Math.max(0, i)].color;
    return c === 'rainbow' ? `hsl(${(t * 160) % 360},95%,66%)` : c;
  },

  // aus Battle.kill(): neue Stufe erreicht?
  onHit(B, maxT) {
    this.maxT = maxT;
    const ti = this.tierOf(B.combo);
    if (ti > this.tier) {
      this.tier = ti;
      if (ti >= 1) {
        this.tierT = 1;
        this.burst(26 + ti * 8, this.color(ti, B.t));
        SFX.play('comboTier', ti);
      }
    }
  },

  // aus Battle.update(): Kette gerissen
  onBreak(n) {
    if (n >= 5) this.broken = { n, t: 0.9, tier: this.tierOf(n) };
    this.tier = -1;
  },

  burst(n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = U.rand(80, 260);
      this.sparks.push({ x: this.x, y: this.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: U.rand(0.4, 0.8), max: 0.8, color, s: U.rand(2, 4.5) });
    }
  },

  draw(ctx, B, cx, cy, narrow, dt) {
    const t = B.t, k = narrow ? 0.8 : 1.15;
    this.tierT = Math.max(0, this.tierT - dt);
    // Funken (auch nach dem Ende der Combo noch ausklingen lassen)
    for (const p of this.sparks) { p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.sparks = this.sparks.filter(p => p.life > 0);

    ctx.save();
    ctx.textBaseline = 'middle';
    if (B.combo >= 3) {
      const ti = Math.max(0, this.tierOf(B.combo)), tier = COMBO_TIERS[ti], col = this.color(ti, t);
      const R0 = 26 * k, bx = cx - R0, by = cy + 4 * k;
      this.x = bx; this.y = by;
      const pop = 1 + B.comboPop * 2.2 + this.tierT * 0.5;
      const frac = U.clamp(B.comboT / this.maxT, 0, 1);
      const wob = ti >= 3 ? Math.sin(t * 30) * 1.5 * (ti - 2) * k : 0;

      // Flammen hinter dem Abzeichen ab „Wahnsinn“
      if (ti >= 3) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 6; i++) {
          const ph = (t * 2.4 + i / 6) % 1, fx = bx + Math.sin(i * 2.1 + t * 5) * R0 * 0.55;
          FX.drawGlow(ctx, fx, by - ph * R0 * 2.3, R0 * (0.9 - ph * 0.6), i % 2 ? col : '#ff8a3c', (1 - ph) * 0.7);
        }
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      // Leuchten + Abzeichen
      ctx.globalCompositeOperation = 'lighter';
      FX.drawGlow(ctx, bx, by, R0 * (1.9 + this.tierT * 1.5), col, 0.35 + this.tierT * 0.5);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(bx + wob, by); ctx.scale(pop, pop);
      Draw.circle(ctx, 0, 0, R0, 'rgba(20,12,40,0.88)');
      // Zeit-Ring: läuft ab, wird am Ende rot und blinkt
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 4.5 * k;
      ctx.beginPath(); ctx.arc(0, 0, R0 - 3 * k, 0, Math.PI * 2); ctx.stroke();
      const urgent = frac < 0.3;
      ctx.strokeStyle = urgent && Math.sin(t * 30) > 0 ? '#ff4d6d' : col; ctx.lineWidth = 4.5 * k;
      ctx.beginPath(); ctx.arc(0, 0, R0 - 3 * k, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = `${22 * k}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillText(tier.icon, 0, 1 * k);
      ctx.restore();

      // große Zahl links vom Abzeichen
      const nx = bx - R0 * (1 + this.tierT * 0.5) - 14 * k;
      ctx.save();
      ctx.translate(nx + wob, by); ctx.scale(pop, pop); ctx.rotate(-0.05 + B.comboPop * 0.2);
      ctx.textAlign = 'right';
      const fs = Math.min(narrow ? 48 : 58, 36 + B.combo * 0.45) * k;
      ctx.font = `900 ${fs}px "Segoe UI", system-ui, sans-serif`;
      const label = `×${B.combo}`;
      const g = ctx.createLinearGradient(0, -fs / 2, 0, fs / 2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, col); g.addColorStop(1, col);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 7 * k; ctx.strokeStyle = 'rgba(20,10,30,0.92)'; ctx.strokeText(label, 0, 2 * k);
      ctx.fillStyle = g; ctx.fillText(label, 0, 0);
      ctx.restore();

      // Stufen-Name darüber, Bonus darunter
      ctx.textAlign = 'right';
      const nameSize = (ti >= 4 ? 12 : 14) * k * (1 + this.tierT * 0.6);
      ctx.font = `900 ${nameSize}px "Segoe UI", system-ui, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,30,0.9)';
      ctx.strokeText(tier.name, cx, cy - 30 * k); ctx.fillStyle = col; ctx.fillText(tier.name, cx, cy - 30 * k);
      const bonus = `+${Math.round((B.comboMult() - 1) * 100)} % 💰`;
      ctx.font = `800 ${12 * k}px "Segoe UI", "Segoe UI Emoji", sans-serif`;
      ctx.strokeText(bonus, cx, cy + 40 * k); ctx.fillStyle = '#fff'; ctx.fillText(bonus, cx, cy + 40 * k);
    }

    // Kette gerissen: graue Zahl zerfällt nach unten
    if (this.broken && B.combo < 3) {
      const b = this.broken;
      b.t -= dt;
      const p = 1 - b.t / 0.9;
      ctx.globalAlpha = U.clamp(b.t / 0.9, 0, 1);
      ctx.textAlign = 'right';
      ctx.font = `900 ${30 * k}px "Segoe UI", system-ui, sans-serif`;
      ctx.lineWidth = 6 * k; ctx.strokeStyle = 'rgba(20,10,30,0.8)';
      const y = cy + 4 * k + p * p * 60 * k;
      ctx.save(); ctx.translate(cx - 56 * k, y); ctx.rotate(p * 0.35);
      ctx.strokeText(`×${b.n}`, 0, 0); ctx.fillStyle = '#8a8199'; ctx.fillText(`×${b.n}`, 0, 0);
      ctx.restore();
      ctx.font = `800 ${11 * k}px "Segoe UI", sans-serif`;
      ctx.strokeText('KETTE GERISSEN', cx, cy - 22 * k); ctx.fillStyle = '#c9c1d9'; ctx.fillText('KETTE GERISSEN', cx, cy - 22 * k);
      ctx.globalAlpha = 1;
      if (b.t <= 0) this.broken = null;
    } else if (B.combo >= 3) this.broken = null;

    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.sparks) FX.drawGlow(ctx, p.x, p.y, p.s * 3, p.color, U.clamp(p.life / p.max, 0, 1));
    ctx.restore();
  },
};

const _playC = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  if (name === 'comboTier') {
    const base = 523 * Math.pow(2, (arg || 1) * 2 / 12);
    [1, 1.25, 1.5, 2].forEach((m, i) => this.tone(base * m, 0.16, 'square', 0.06, 0, i * 0.05));
    this.noiseF(0.25, 0.12, 0.18, 6000, 'highpass');
    return;
  }
  return _playC.call(this, name, arg);
};
