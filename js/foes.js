'use strict';
// ---------------------------------------------------------------------------
// Lebendige Gegner: Atmen, Wiegen, Hüpfen beim Anrücken, Ausholen vor dem Wurf,
// Gesichter mit Stimmungen (ruhig, entschlossen, getroffen, ängstlich, wütend,
// benommen, k.o.) und Treffer-Reaktionen (Rückstoß, Kippen, Aufblitzen, Splitter).
// Das Aufblitzen zeichnet den Gegner additiv nach – ctx.filter kennt Safari nicht.
// ---------------------------------------------------------------------------

// Gesichtsmitte (lokale Koordinaten ab Bodenpunkt), Größe, eigener Schwebe-Versatz
const FACE = {
  tree:     { x: 0,  y: -62, s: 1 },
  cactus:   { x: 0,  y: -54, s: 0.9 },
  snowman:  { x: 0,  y: -82, s: 0.72 },
  lavarock: { x: 2,  y: -28, s: 1 },
  vending:  { x: -5, y: -58, s: 0.85 },
  asteroid: { x: 0,  y: -36, s: 1,    bob: (t, o) => Math.sin(t * 2 + o.id) * 4 - 10 },
  chest:    { x: 0,  y: -24, s: 0.7 },
  voidling: { x: 0,  y: -40, s: 1,    glow: '#c9a6ff' },
  eyeball:  { x: 0,  y: -36, s: 1,    bob: (t, o) => Math.sin(t * 2.4 + o.id) * 5 - 14, cyclops: true },
  shard:    { x: 0,  y: -44, s: 0.85, bob: (t, o) => Math.sin(t * 2 + o.id) * 5 - 8 },
  ufo:      { x: 0,  y: -38, s: 0.65, bob: (t, o) => Math.sin(t * 3 + o.id) * 6 - 22 },
  popup:    { x: 0,  y: -40, s: 0.8,  bob: (t, o) => Math.sin(t * 2 + o.id) * 3 - 12 },
  bug:      { x: 0,  y: -43, s: 0.62, glow: '#7dffb0' },
  shade:    { x: 0,  y: -50, s: 0.95, glow: '#e6d9ff', bob: (t, o) => Math.sin(t * 2.2 + o.id) * 5 - 12 },
};
// Rissflächen je Gegner (lokal, ohne Schweben): Kreis [x, y, r] oder Rechteck [x, y, w, h].
// Risse bleiben innerhalb dieser Fläche, damit sie nie über die Form hinausragen.
const CRACK_ZONE = {
  tree: [0, -62, 22], cactus: [-8, -70, 16, 64], snowman: [0, -26, 17], lavarock: [0, -26, 22],
  vending: [-20, -82, 40, 72], asteroid: [0, -34, 25], chest: [-24, -38, 48, 34],
  voidling: [0, -36, 22], eyeball: [0, -36, 22], shard: [0, -42, 15], ufo: [-26, -30, 52, 10],
  popup: [-26, -50, 52, 34], bug: [0, -20, 15], shade: [0, -48, 18],
};
const SWAY = { tree: 0.035, cactus: 0.03, snowman: 0.02, voidling: 0.05, popup: 0.02 };
const INK = '#2a1a22';

const Foes = {
  // ---------------------------------------------------------------- Zustand je Bild
  step(o, t) {
    const dt = Battle.frameDt || 0.016;
    o.moving = o.prevX !== undefined && o.prevX - o.x > 20 * dt; // rückt gerade an
    o.prevX = o.x;
    o.kx = (o.kx || 0) * Math.pow(0.0005, dt);
    o.tilt = (o.tilt || 0) * Math.pow(0.002, dt);
    o.hurtT = Math.max(0, (o.hurtT || 0) - dt);
    o.windup = Math.max(0, (o.windup || 0) - dt);
    o.fl = Math.max(0, (o.fl || 0) - dt);
    // zeitverzögerter Lebensbalken (weißer Rest nach Treffern)
    o.hpShow = o.hpShow === undefined ? o.hp : Math.max(o.hp, o.hpShow - o.maxHp * dt * 0.6 * (o.hpShow > o.hp ? 1 : 0));
  },

  // aus Battle.damage()
  onHit(B, o, dmg, crit, src) {
    const cs = B.cs, h = OBST_H[o.kind] * o.scale;
    // neue Rissstufe erreicht → Brocken platzen ab
    const stage = this.crackStage(o);
    if (stage > (o.crackShown || 0)) {
      o.crackShown = stage;
      const z = this.zoneCenter(o), deb = biomeFor(S.stage).debris;
      for (let i = 0; i < 6 + stage * 3; i++) {
        const p = B.particle(o.x + z.x * o.scale, o.y + z.y * o.scale, U.rand(-200, 120), U.rand(-320, -80), U.pick(deb), U.rand(0.7, 1.2), U.rand(4, 8) * cs, 1200, true, 'chunk');
        if (p) p.spin = U.rand(-14, 14);
      }
      SFX.play('crack', stage);
    }
    // Schmerz-Gesicht nur bei spürbaren Treffern, sonst zeigt ein Boss unter Dauerfeuer nie etwas anderes
    if (crit || src === 'paw' || dmg > o.maxHp * 0.04) o.hurtT = crit ? 0.45 : 0.28;
    // Aufblitzen höchstens alle 0,15 s – bei Dauerfeuer sonst dauerhaft weiß
    if (B.t - (o.lastFl || 0) > (crit ? 0.06 : 0.15)) { o.lastFl = B.t; o.fl = crit ? 0.1 : 0.07; }
    o.kx = Math.min(16 * cs, (o.kx || 0) + (crit ? 8 : src === 'paw' ? 6 : 2.5) * cs);
    o.tilt = Math.min(0.28, (o.tilt || 0) + (crit ? 0.15 : 0.05));
    const now = B.t;
    if (now - (o.lastFx || 0) < (crit ? 0.04 : 0.1)) return;
    o.lastFx = now;
    const hx = o.x - OBST_W[o.kind] * o.scale * 0.32, hy = o.y - h * U.rand(0.35, 0.7);
    const deb = biomeFor(S.stage).debris;
    B.particle(hx, hy, 0, 0, '#ffffff', 0.09, (crit ? 34 : 18) * cs, 0, false, 'flash');
    for (let i = 0; i < (crit ? 7 : 3); i++) {
      const p = B.particle(hx, hy, U.rand(-260, -40), U.rand(-260, 60), U.pick(deb), U.rand(0.4, 0.8), U.rand(3, 6) * cs, 900, true, 'chunk');
      if (p) p.spin = U.rand(-14, 14);
    }
    if (crit) {
      FX.addRing(hx, hy, 46 * cs, '#ffe14d', 0.22, 4);
      for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2; B.particle(hx, hy, Math.cos(a) * 320, Math.sin(a) * 320, '#ffe14d', 0.25, 4 * cs, 0, false, 'spark'); }
    }
  },

  // ---------------------------------------------------------------- Risse
  // 0 = heil, 1 ab 75 %, 2 ab 50 %, 3 ab 25 % Leben
  crackStage(o) { const f = o.hp / o.maxHp; return f > 0.75 ? 0 : f > 0.5 ? 1 : f > 0.25 ? 2 : 3; },
  zoneCenter(o) {
    const z = CRACK_ZONE[o.kind] || [0, -OBST_H[o.kind] / 2, 16];
    return z.length === 3 ? { x: z[0], y: z[1] } : { x: z[0] + z[2] / 2, y: z[1] + z[3] / 2 };
  },
  // Rissmuster einmal je Gegner erzeugen (stabil, wächst mit der Stufe)
  crackPaths(o) {
    if (o.crackP) return o.crackP;
    const z = CRACK_ZONE[o.kind] || [0, -OBST_H[o.kind] / 2, 16];
    const circ = z.length === 3;
    let seed = o.id * 7919 + 13;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    // Gesicht aussparen, sonst laufen Risse durch Augen und Mund
    const fc = FACE[o.kind], fr = fc ? 17 * fc.s : 0;
    const inFace = (x, y) => fc && Math.abs(x - fc.x) < fr * 1.15 && y > fc.y - fr && y < fc.y + fr * 1.05;
    const inside = (x, y) => !inFace(x, y) && (circ ? Math.hypot(x - z[0], y - z[1]) <= z[2] * 0.92 : x >= z[0] + 1 && x <= z[0] + z[2] - 1 && y >= z[1] + 1 && y <= z[1] + z[3] - 1);
    const pt = () => {
      for (let tries = 0; tries < 12; tries++) {
        const q = circ
          ? (() => { const a = rnd() * Math.PI * 2, d = (0.45 + rnd() * 0.5) * z[2] * 0.85; return [z[0] + Math.cos(a) * d, z[1] + Math.sin(a) * d]; })()
          : [z[0] + rnd() * z[2], z[1] + rnd() * z[3]];
        if (inside(q[0], q[1])) return q;
      }
      return circ ? [z[0] + z[2] * 0.7, z[1] + z[2] * 0.3] : [z[0] + 2, z[1] + z[3] - 2];
    };
    const size = circ ? z[2] : Math.min(z[2], z[3]) * 0.9 + 6;
    const paths = [];
    // je Stufe zwei Hauptrisse mit Verästelung
    for (let st = 1; st <= 3; st++) {
      for (let n = 0; n < 2; n++) {
        let [x, y] = pt(), a = rnd() * Math.PI * 2;
        const main = [[x, y]];
        const steps = 4 + st;
        for (let k = 0; k < steps; k++) {
          a += (rnd() - 0.5) * 1.3;
          const len = size * (0.16 + rnd() * 0.12);
          const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len;
          if (!inside(nx, ny)) { a += Math.PI * 0.7; continue; }
          x = nx; y = ny; main.push([x, y]);
          if (rnd() < 0.35 && main.length > 2) { // Ast
            let bx = x, by = y, ba = a + (rnd() < 0.5 ? 1 : -1) * (0.7 + rnd() * 0.6);
            const br = [[bx, by]];
            for (let j = 0; j < 2; j++) {
              const l = size * (0.1 + rnd() * 0.08), qx = bx + Math.cos(ba) * l, qy = by + Math.sin(ba) * l;
              if (!inside(qx, qy)) break;
              bx = qx; by = qy; br.push([bx, by]); ba += (rnd() - 0.5) * 0.8;
            }
            if (br.length > 1) paths.push({ st, pts: br, w: 1.1 });
          }
        }
        if (main.length > 1) paths.push({ st, pts: main, w: 1.4 + st * 0.35 });
      }
      // ab Stufe 3: herausgebrochene Stellen
      if (st === 3) for (let n = 0; n < 3; n++) { const [cx, cy] = pt(); paths.push({ st, hole: [cx, cy, 2.2 + rnd() * 2.2] }); }
    }
    return (o.crackP = paths);
  },
  cracks(ctx, o, t) {
    const stage = Math.min(this.crackStage(o), o.dying > 0 ? 3 : 3);
    if (!stage || !CRACK_ZONE[o.kind]) return;
    const f = FACE[o.kind];
    ctx.save();
    if (f && f.bob) ctx.translate(0, f.bob(t, o)); // schwebende Gegner: mitschweben
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const p of this.crackPaths(o)) {
      if (p.st > stage) continue;
      if (p.hole) { // Loch mit hellem Rand
        Draw.circle(ctx, p.hole[0], p.hole[1], p.hole[2], 'rgba(15,8,12,0.75)');
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.hole[0], p.hole[1] + 0.6, p.hole[2], 0.2, Math.PI - 0.2); ctx.stroke();
        continue;
      }
      // Lichtkante unter dem Riss = Tiefe
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = p.w * 0.9;
      ctx.beginPath(); p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + 0.8, y + 1) : ctx.moveTo(x + 0.8, y + 1))); ctx.stroke();
      ctx.strokeStyle = 'rgba(20,10,16,0.82)'; ctx.lineWidth = p.w;
      ctx.beginPath(); p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    }
    // Boss bei wenig Leben: Glut leuchtet aus den Rissen
    if (o.boss && stage >= 2) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,${120 + Math.sin(t * 6) * 60},60,${0.35 + Math.sin(t * 6) * 0.15})`;
      for (const p of this.crackPaths(o)) {
        if (p.hole || p.st > stage) continue;
        ctx.lineWidth = p.w * 0.6;
        ctx.beginPath(); p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    }
    ctx.restore();
  },

  // ---------------------------------------------------------------- Stimmung
  mood(o) {
    if (o.dying > 0 || o.dead) return 'ko';
    if (o.boss && Vitals.stun > 0) return 'dizzy';
    if (o.boss && Vitals.charging(Battle)) return 'rage';
    if (o.hurtT > 0) return o.hurtT > 0.32 ? 'crit' : 'ouch';
    if (o.windup > 0) return 'shout';
    if (o.treasure) return 'sly';
    if (o.golden) return 'smug';
    if (o.hp / o.maxHp < 0.35) return 'scared';
    if (o.boss) return 'angry';
    if (o.moving) return 'eager';
    return ['calm', 'grumpy', 'cheeky'][o.id % 3];
  },

  // ---------------------------------------------------------------- Zeichnen
  face(ctx, o, t) {
    const f = FACE[o.kind];
    if (!f) return;
    const m = this.mood(o), s = f.s, x = f.x, y = f.y + (f.bob ? f.bob(t, o) : 0);
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    o.faceM = ctx.getTransform(); // für Effekte, die genau auf den Augen liegen (Leere)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const tremble = m === 'scared' ? Math.sin(t * 40 + o.id) * 0.8 : 0;
    ctx.translate(tremble, 0);
    if (f.cyclops) this.cyclops(ctx, o, m, t);
    else { this.eyes(ctx, o, m, t, f.glow); this.mouth(ctx, o, m, t); }
    // Schweißtropfen / Tränen
    if (m === 'scared' || m === 'ouch' || m === 'crit') {
      const k = (t * 1.5 + o.id * 0.3) % 1;
      ctx.globalAlpha = 1 - k;
      Draw.ellipse(ctx, 14, -10 + k * 14, 2.6, 3.6, '#7ec8ff');
      ctx.globalAlpha = 1;
    }
    if (m === 'angry' || m === 'rage' || m === 'shout') { // Zornesader
      ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 1.8;
      const px = 15, py = -15;
      ctx.beginPath(); ctx.moveTo(px - 3, py - 1); ctx.lineTo(px, py + 1); ctx.lineTo(px + 3, py - 1);
      ctx.moveTo(px - 1, py - 4); ctx.lineTo(px + 1, py - 1); ctx.lineTo(px - 1, py + 3); ctx.stroke();
    }
    ctx.restore();
  },

  eyes(ctx, o, m, t, glow) {
    const blink = ((t + o.id * 1.37) % 4) < 0.12 && !['crit', 'ouch', 'ko', 'dizzy', 'rage'].includes(m);
    const lx = -1.7, ly = 0.6; // Blick zur Katze (links)
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2.2;
    for (const sx of [-1, 1]) {
      const ex = sx * 7.5, ey = 0;
      if (m === 'ko') { // X-Augen
        ctx.beginPath(); ctx.moveTo(ex - 3.5, ey - 3.5); ctx.lineTo(ex + 3.5, ey + 3.5); ctx.moveTo(ex + 3.5, ey - 3.5); ctx.lineTo(ex - 3.5, ey + 3.5); ctx.stroke();
        continue;
      }
      if (m === 'ouch' || m === 'crit') { // > <
        ctx.beginPath(); ctx.moveTo(ex - 3.5 * sx, ey - 3.5); ctx.lineTo(ex + 3 * sx, ey); ctx.lineTo(ex - 3.5 * sx, ey + 3.5); ctx.stroke();
        continue;
      }
      if (m === 'dizzy') { // Spiralen
        ctx.beginPath();
        for (let a = 0; a < 12; a += 0.4) { const r = a * 0.42; ctx.lineTo(ex + Math.cos(a + t * 8 * sx) * r, ey + Math.sin(a + t * 8 * sx) * r); }
        ctx.stroke();
        continue;
      }
      if (blink) { ctx.beginPath(); ctx.moveTo(ex - 4, ey); ctx.lineTo(ex + 4, ey); ctx.stroke(); continue; }
      const big = m === 'scared' ? 6.2 : m === 'eager' ? 5.8 : 5.4;
      if (glow) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        FX.drawGlow(ctx, ex, ey, 11, glow, 0.8);
        ctx.restore();
        Draw.ellipse(ctx, ex, ey, 4.2, big * 0.9, glow);
        Draw.circle(ctx, ex + lx, ey + ly, 1.6, '#ffffff');
      } else {
        Draw.ellipse(ctx, ex, ey, 5, big, '#ffffff');
        const pr = m === 'scared' ? 1.8 : m === 'smug' || m === 'sly' ? 0 : 2.8;
        const pc = m === 'rage' ? '#ff1e46' : INK;
        if (pr) { Draw.circle(ctx, ex + lx, ey + ly, pr, pc); Draw.circle(ctx, ex + lx - 0.9, ey + ly - 1.1, 0.9, '#ffffff'); }
        if (m === 'smug') { ctx.fillStyle = '#ffb800'; this.star(ctx, ex, ey, 3.6); ctx.fillStyle = INK; }
        if (m === 'sly') Draw.circle(ctx, ex + lx, ey + ly + 1.5, 2.2, INK);
        if (m === 'rage') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; FX.drawGlow(ctx, ex + lx, ey + ly, 9, '#ff1e46', 0.9); ctx.restore(); }
      }
      // Augenbrauen je nach Stimmung
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
      const by = ey - big - 3;
      ctx.beginPath();
      if (m === 'angry' || m === 'rage' || m === 'shout' || m === 'grumpy' || m === 'eager') {
        const k = m === 'grumpy' ? 1.6 : m === 'eager' ? 2 : 3.2;
        ctx.moveTo(ex - 4.5 * sx, by - k); ctx.lineTo(ex + 4 * sx, by + k); // zur Mitte hin tief
      } else if (m === 'scared') {
        ctx.moveTo(ex - 4.5 * sx, by + 2.5); ctx.lineTo(ex + 4 * sx, by - 2); // zur Mitte hin hoch
      } else if (m === 'smug' || m === 'cheeky' || m === 'sly') {
        ctx.moveTo(ex - 4, by + (sx > 0 ? -2 : 1)); ctx.quadraticCurveTo(ex, by - 3, ex + 4, by + (sx > 0 ? -1 : 1));
      } else continue;
      ctx.stroke();
    }
  },

  mouth(ctx, o, m, t) {
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2.2;
    const y = 10;
    ctx.beginPath();
    switch (m) {
      case 'ko': ctx.ellipse(0, y, 3, 2, 0, 0, Math.PI * 2); ctx.stroke(); break;
      case 'crit': ctx.ellipse(0, y + 1, 5.5, 6, 0, 0, Math.PI * 2); ctx.fill(); Draw.ellipse(ctx, 0, y + 3.5, 3, 2.4, '#ff6b81'); break;
      case 'ouch': ctx.ellipse(0, y, 4, 4.5, 0, 0, Math.PI * 2); ctx.fill(); break;
      case 'shout': case 'rage':
        ctx.ellipse(0, y + 1, 7, m === 'rage' ? 6 + Math.sin(t * 20) : 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-5, y - 3.5, 10, 2.2); break;
      case 'angry':
        ctx.fillStyle = '#ffffff'; Draw.rrect(ctx, -7, y - 2.5, 14, 6, 2, '#ffffff');
        ctx.strokeRect(-7, y - 2.5, 14, 6);
        ctx.beginPath(); for (let i = -3; i <= 3; i += 3) { ctx.moveTo(i * 1.4, y - 2.5); ctx.lineTo(i * 1.4, y + 3.5); } ctx.lineWidth = 1.2; ctx.stroke(); break;
      case 'scared': // Zickzack
        ctx.moveTo(-6, y + 1); for (let i = 1; i <= 6; i++) ctx.lineTo(-6 + i * 2, y + (i % 2 ? -1.5 : 1.5)); ctx.stroke(); break;
      case 'dizzy': ctx.moveTo(-5, y); ctx.quadraticCurveTo(-2, y + 4, 0, y); ctx.quadraticCurveTo(2, y - 4, 5, y); ctx.stroke(); break;
      case 'smug': case 'sly': ctx.moveTo(-6, y - 1); ctx.quadraticCurveTo(0, y + 5, 7, y - 3); ctx.stroke(); break;
      case 'cheeky': ctx.moveTo(-5, y); ctx.quadraticCurveTo(0, y + 5, 5, y); ctx.stroke(); Draw.ellipse(ctx, 2, y + 3.5, 2.2, 2.6, '#ff6b81'); break;
      case 'grumpy': ctx.moveTo(-5, y + 2); ctx.quadraticCurveTo(0, y - 2.5, 5, y + 2); ctx.stroke(); break;
      case 'eager': ctx.moveTo(-6, y - 1); ctx.quadraticCurveTo(0, y + 6, 6, y - 1); ctx.closePath(); ctx.fill(); break;
      default: ctx.moveTo(-4, y + 1); ctx.lineTo(4, y + 1); ctx.stroke();
    }
  },

  // Riesenauge (Leere): eine Iris, Lid je nach Stimmung
  cyclops(ctx, o, m, t) {
    if (m === 'ko') { ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, 9); ctx.moveTo(9, -9); ctx.lineTo(-9, 9); ctx.stroke(); return; }
    const shut = m === 'ouch' || m === 'crit' ? 0.8 : ((t + o.id) % 5) < 0.15 ? 1 : m === 'angry' || m === 'rage' || m === 'shout' ? 0.35 : 0;
    const r = m === 'scared' ? 5 : 9, col = m === 'rage' ? '#ff1e46' : '#8a2be2';
    if (m === 'dizzy') { ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); for (let a = 0; a < 14; a += 0.4) ctx.lineTo(Math.cos(a + t * 8) * a * 0.9, Math.sin(a + t * 8) * a * 0.9); ctx.stroke(); }
    else {
      Draw.circle(ctx, -6, 1, r, col);
      Draw.circle(ctx, -6, 1, r * 0.45, '#0b0614');
      Draw.circle(ctx, -8.5, -2, 2, '#ffffff');
    }
    if (shut > 0) { // Lid schiebt sich von oben über das Auge
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, 27.5, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#5a2a7a'; ctx.fillRect(-30, -30, 60, 60 * shut);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, -30 + 60 * shut); ctx.lineTo(30, -30 + 60 * shut); ctx.stroke();
      ctx.restore();
    }
  },

  star(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  },
};

// Draw.obstacle umhüllen: Bewegung um den Bodenpunkt, Gesicht, Aufblitzen
const _drawObstacle = Draw.obstacle.bind(Draw);
Draw.obstacle = function (ctx, o, biome, t) {
  Foes.step(o, t);
  const breathe = 1 + Math.sin(t * 3 + o.id) * 0.03;
  const sway = (SWAY[o.kind] || 0) * Math.sin(t * 1.6 + o.id);
  const hop = o.moving ? Math.abs(Math.sin(t * 11 + o.id)) * 6 * o.scale : 0;
  const lean = o.windup > 0 ? Math.sin((1 - o.windup / 0.35) * Math.PI) * 0.22 : 0; // ausholen und werfen
  ctx.save();
  ctx.translate(o.x + o.kx, o.y - hop);
  ctx.rotate(sway + o.tilt + lean);
  ctx.scale(2 - breathe, breathe);
  ctx.translate(-o.x, -o.y);
  _drawObstacle(ctx, o, biome, t);
  if (o.fl > 0) { // weißes Aufblitzen: additiv nachzeichnen (vor dem Gesicht, damit es klar bleibt)
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(o.boss ? 0.4 : 0.6, o.fl * 8);
    _drawObstacle(ctx, o, biome, t);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // Gesicht im gleichen Koordinatensystem wie der Körper
  ctx.save();
  ctx.translate(o.x + (o.shakeX || 0), o.y);
  ctx.scale(o.scale, o.scale);
  const sq = 1 + (o.squash || 0);
  ctx.scale(1 / sq, sq);
  Foes.cracks(ctx, o, t);
  Foes.face(ctx, o, t);
  ctx.restore();
  ctx.restore();
};
