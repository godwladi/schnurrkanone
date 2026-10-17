'use strict';
// ---------------------------------------------------------------------------
// Prozedurale Grafik: Katzen, Waffen, Hindernisse, Begleiter
// ---------------------------------------------------------------------------

const Draw = {
  ellipse(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); },
  circle(ctx, x, y, r, fill) { Draw.ellipse(ctx, x, y, r, r, fill); },
  rrect(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); },
  tri(ctx, a, b, c, fill) { ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); },

  // Katze; (x,y) = Fußpunkt, s = Skalierung (1 ≈ 70 px hoch)
  cat(ctx, x, y, s, cat, t, opt = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (opt.squash) ctx.scale(1 + opt.squash, 1 - opt.squash);
    if (cat.ghost) ctx.globalAlpha *= 0.75 + Math.sin(t * 3) * 0.2;
    const bob = opt.still ? 0 : Math.sin(t * 7) * 1.5;
    ctx.lineCap = 'round';

    // Schwanz (bzw. neun Schwänze)
    const tails = cat.tails || 1;
    for (let i = 0; i < tails; i++) {
      const spread = tails > 1 ? (i - (tails - 1) / 2) * 7 : 0;
      ctx.strokeStyle = cat.fur; ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-18, -14);
      ctx.quadraticCurveTo(-40 + spread * 0.3, -22 + Math.sin(t * 4 + i) * 6, -34 + spread, -44 + Math.sin(t * 4 + i) * 8);
      ctx.stroke();
    }
    // Körper
    Draw.ellipse(ctx, 0, -18 + bob * 0.3, 22, 16, cat.fur);
    if (cat.pattern === 'tux' || cat.belly) Draw.ellipse(ctx, 5, -14 + bob * 0.3, 12, 10, cat.belly);
    // Pfoten
    Draw.ellipse(ctx, -12, -3, 6, 4, cat.fur);
    Draw.ellipse(ctx, 12, -3, 6, 4, cat.pattern === 'tux' ? cat.belly : cat.fur);

    // Kopf
    ctx.save();
    ctx.translate(10, -42 + bob);
    Draw.ears(ctx, cat.fur, opt.still ? 0 : t, opt.fury || 0);
    Draw.circle(ctx, 0, 0, 17, cat.fur);
    // Muster
    if (cat.pattern === 'stripes') {
      ctx.strokeStyle = cat.stripe; ctx.lineWidth = 2.5;
      for (const dx of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(dx, -16); ctx.lineTo(dx * 0.8, -9); ctx.stroke(); }
    } else if (cat.pattern === 'spots') {
      Draw.circle(ctx, -9, -8, 4, cat.stripe); Draw.circle(ctx, 8, -11, 3, cat.stripe);
    } else if (cat.pattern === 'tux') {
      Draw.ellipse(ctx, 0, 7, 9, 8, cat.belly);
    } else if (cat.pattern === 'stars') {
      ctx.fillStyle = cat.stripe;
      for (const [sx, sy] of [[-8, -9], [7, -12], [11, 2]]) Draw.circle(ctx, sx, sy, 1.6, cat.stripe);
    }
    Draw.face(ctx, cat.fur, cat.eye, t, opt);
    // Kopfbedeckung
    Draw.hat(ctx, cat.hat, t);
    ctx.restore();

    // Waffe in der Pfote
    if (opt.weapon) Draw.weapon(ctx, 18, -20 + bob * 0.3, opt.weapon, t, 1, opt.recoil || 0);
    ctx.restore();
  },

  // Ohren im Kopf-Koordinatensystem (Kopfradius 17); zucken ab und zu,
  // legen sich bei hoher Feuerrate (fury) kampflustig nach hinten an
  ears(ctx, fur, t, fury = 0) {
    const tw = t && (t % 5.3) < 0.18 ? Math.sin((t % 5.3) / 0.18 * Math.PI) * 5 : 0;
    const fx = fury * 5, fy = fury * 6;
    Draw.tri(ctx, [-15, -6], [-15 - tw - fx, -27 + tw * 0.4 + fy], [-2, -14], fur);
    Draw.tri(ctx, [15, -6], [15 + fx, -27 + fy], [2, -14], fur);
    Draw.tri(ctx, [-12, -9], [-13 - tw * 0.8 - fx * 0.8, -21 + tw * 0.3 + fy * 0.8], [-5, -14], '#ff9eb5');
    Draw.tri(ctx, [12, -9], [13 + fx * 0.8, -21 + fy * 0.8], [5, -14], '#ff9eb5');
  },

  // Gesicht im Kopf-Koordinatensystem. opt.fury (0..1) spiegelt die aktuelle
  // Feuerrate: zusammengekniffene Augen, Kampfbrauen, Schlitzpupillen,
  // Zähne fletschen, Zornesader. opt.eyesOut sammelt die Augenmitten
  // (Gerätepixel), damit der Augenlaser exakt aus den Pupillen kommt.
  face(ctx, fur, eye, t, opt) {
    const L = '#2a1e2e';
    const f = U.clamp(opt.fury || 0, 0, 1);
    const lx = opt.look ? opt.look.x * 1.6 : 0, ly = opt.look ? opt.look.y * 1.8 : 0;
    const blink = !opt.still && !opt.laserEyes && f < 0.5 && (t % 4) < 0.12;
    const EYES = [-6, 7];
    if (opt.eyesOut) {
      const m = ctx.getTransform();
      for (const ex of EYES) opt.eyesOut.push(m.transformPoint(new DOMPoint(ex + lx, -1 + ly)));
    }
    if (blink) {
      ctx.strokeStyle = L; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-9, -1); ctx.lineTo(-3, -1); ctx.moveTo(4, -1); ctx.lineTo(10, -1); ctx.stroke();
    } else {
      for (const ex of EYES) Draw.ellipse(ctx, ex, -1, 4.2, 5, L);
      if (opt.laserEyes > 0) {
        const a0 = ctx.globalAlpha;
        ctx.globalAlpha = a0 * opt.laserEyes;
        for (const ex of EYES) { Draw.circle(ctx, ex + lx, -1 + ly, 3.6, '#ff2d55'); Draw.circle(ctx, ex + lx, -1 + ly, 1.8, '#ffffff'); }
        ctx.globalAlpha = a0;
      } else {
        // Pupillen werden mit steigender Feuerrate zu schmalen Jagd-Schlitzen
        const rx = 2.6 * (1 - f * 0.55), ry = 2.6 * (1 + f * 0.25);
        for (const ex of EYES) {
          Draw.ellipse(ctx, ex + lx, ly, rx, ry, eye);
          Draw.circle(ctx, ex + 1.2 + lx * 0.6, -2.4 + ly * 0.4, 1.4 - f * 0.4, '#fff');
        }
      }
      if (f > 0.04) {
        // Oberlider (Fellfarbe) kneifen die Augen zusammen, innen tiefer = grimmig
        const inner = 0.5 + f * 5, outer = f * 2.2;
        for (const [ex, dir] of [[-6, 1], [7, -1]]) {
          const xo = ex - dir * 5, xi = ex + dir * 5;
          ctx.beginPath();
          ctx.moveTo(xo, -8); ctx.lineTo(xi, -8);
          ctx.lineTo(xi, -6 + inner); ctx.lineTo(xo, -6 + outer);
          ctx.closePath(); ctx.fillStyle = fur; ctx.fill();
          // Kampfbraue
          ctx.strokeStyle = L; ctx.lineWidth = 1.2 + f * 1.3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(xo - dir * 0.5, -7.5 + outer * 0.6); ctx.lineTo(xi + dir * 0.8, -7 + inner * 0.95); ctx.stroke();
        }
      }
    }
    // Nase, Mund, Schnurrhaare
    Draw.tri(ctx, [-2, 5], [3, 5], [0.5, 8], '#ff7a9a');
    ctx.strokeStyle = L; ctx.lineWidth = 1.4;
    if (opt.roar || f > 0.78) { // weit aufgerissenes Fauch-Maul mit Zähnchen
      const k = opt.roar ? 1 : 0.75 + Math.sin(t * 18) * 0.08;
      Draw.ellipse(ctx, 0.5, 8 + 3 * k, 5.5 * k, 4.5 * k, '#5a1a2a');
      Draw.tri(ctx, [-3.5, 7.5], [-2, 7.5], [-2.8, 10], '#fff'); Draw.tri(ctx, [3, 7.5], [4.5, 7.5], [3.8, 10], '#fff');
    } else if (f > 0.4) { // entschlossen gefletschte Zähne
      Draw.rrect(ctx, -4, 8, 9, 3.6, 1.6, '#5a1a2a');
      ctx.fillStyle = '#fff'; ctx.fillRect(-3.4, 8.2, 7.8, 1.3);
      Draw.tri(ctx, [-3.2, 9.4], [-1.8, 9.4], [-2.5, 11], '#fff'); Draw.tri(ctx, [2.8, 9.4], [4.2, 9.4], [3.5, 11], '#fff');
    } else if (f > 0.15) { // konzentriert: grimmige Linie mit Fangzahn
      ctx.beginPath(); ctx.moveTo(-3.5, 9.5); ctx.quadraticCurveTo(0.5, 8.4, 4.5, 9.5); ctx.stroke();
      Draw.tri(ctx, [2, 9], [3.4, 9.2], [2.8, 10.9], '#fff');
    } else {
      ctx.beginPath(); ctx.arc(-1.5, 8.5, 2.2, 0, Math.PI); ctx.arc(2.8, 8.5, 2.2, 0, Math.PI); ctx.stroke();
    }
    // Schnurrhaare zittern bei hoher Feuerrate
    const wz = f > 0.3 ? Math.sin(t * 40) * f * 1.6 : 0;
    ctx.strokeStyle = 'rgba(40,30,40,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const sgn of [-1, 1]) { ctx.moveTo(sgn * 9, 6); ctx.lineTo(sgn * 24, 3 - f * 3 + wz); ctx.moveTo(sgn * 9, 8); ctx.lineTo(sgn * 24, 9 - f * 2 - wz); }
    ctx.stroke();
    // Wangen glühen
    const ch = `rgba(255,${120 - f * 60},${150 - f * 90},${0.35 + f * 0.35})`;
    Draw.circle(ctx, -11, 6, 3 + f, ch);
    Draw.circle(ctx, 13, 6, 3 + f, ch);
    // Zornesader
    if (f > 0.55) {
      const p = 1 + Math.sin(t * 14) * 0.15, a0 = ctx.globalAlpha;
      ctx.globalAlpha = a0 * U.clamp((f - 0.55) / 0.2, 0, 1);
      ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 1.6;
      ctx.save(); ctx.translate(10, -10); ctx.scale(p, p);
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) ctx.arc(sx * 3.2, sy * 3.2, 2.2, Math.atan2(-sy, -sx) - 0.9, Math.atan2(-sy, -sx) + 0.9);
      ctx.stroke(); ctx.restore();
      ctx.globalAlpha = a0;
    }
  },

  // Geisterkatze, die eine schwebende Waffe hält; (x,y) = Waffengriff.
  // Der Körper wird erst auf eine Zwischenfläche gemalt und dann halbtransparent
  // aufgetragen, damit sich überlappende Teile nicht dunkler abzeichnen.
  ghostCat(ctx, x, y, s, t, opt) {
    const dpr = opt.dpr || 1, k = Math.max(1, s * dpr * 1.25);
    const BX = 44, BY = 46, BW = 60, BH = 80; // Zwischenfläche in Weltkoordinaten
    const off = Draw._ghostCv || (Draw._ghostCv = document.createElement('canvas'));
    const w = Math.ceil(BW * k), h = Math.ceil(BH * k);
    if (off.width < w || off.height < h) { off.width = Math.max(off.width, w); off.height = Math.max(off.height, h); }
    const g = off.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, off.width, off.height);
    g.setTransform(k, 0, 0, k, BX * k, BY * k);
    const ph = opt.phase || 0, rec = (opt.bodyRecoil ?? opt.recoil ?? 0) * 4 / s; // Rückstoß wie Draw.weapon
    const body = '#eef3ff', shade = '#c9d6ff';
    g.translate(-rec, 0);
    // Umriss: erst alle Formen dick in Randfarbe, dann darüber füllen
    const wv = Math.sin(t * 4 + ph) * 3;
    const tail = () => {
      g.beginPath();
      g.moveTo(-24, -4);
      g.bezierCurveTo(-30, 8, -38 + wv, 14, -34 + wv, 26);
      g.bezierCurveTo(-28 + wv * 0.5, 22, -24, 30 - wv, -18, 24 - wv * 0.5);
      g.quadraticCurveTo(-10, 14, -4, 4);
      g.closePath();
    };
    const head = () => { g.beginPath(); g.arc(-12, -18, 10.6, 0, Math.PI * 2); };
    const torso = () => { g.beginPath(); g.ellipse(-14, -2, 11, 10, 0, 0, Math.PI * 2); };
    g.lineJoin = 'round';
    g.strokeStyle = '#8796d6'; g.lineWidth = 2.6;
    for (const f of [tail, torso, head]) { f(); g.stroke(); }
    g.save(); g.translate(-12, -18); g.scale(0.62, 0.62);
    g.strokeStyle = '#8796d6'; g.lineWidth = 4;
    for (const [a, b, c] of [[[-15, -6], [-15 - (opt.fury || 0) * 5, -27 + (opt.fury || 0) * 6], [-2, -14]], [[15, -6], [15 + (opt.fury || 0) * 5, -27 + (opt.fury || 0) * 6], [2, -14]]]) {
      g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.closePath(); g.stroke();
    }
    g.restore();
    const tg = g.createLinearGradient(0, -6, 0, 28);
    tg.addColorStop(0, shade); tg.addColorStop(1, 'rgba(201,214,255,0.15)');
    tail(); g.fillStyle = tg; g.fill();
    torso(); g.fillStyle = body; g.fill();
    Draw.ellipse(g, -12, 3, 7, 4.5, 'rgba(160,178,235,0.35)');
    // Kopf (Gesicht der Hauptkatze, verkleinert)
    g.save();
    g.translate(-12, -18); g.scale(0.62, 0.62);
    Draw.ears(g, body, t + ph, opt.fury || 0);
    Draw.circle(g, 0, 0, 17, body);
    Draw.face(g, body, opt.eye || '#7ef9ff', t + ph, { look: opt.look, laserEyes: opt.laserEyes, fury: opt.fury, roar: opt.roar });
    g.restore();

    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    // Augenposition (für den Laser) in Gerätepixel umrechnen
    if (opt.eyesOut) {
      const m = ctx.getTransform(), lx = opt.look ? opt.look.x * 1.6 : 0, ly = opt.look ? opt.look.y * 1.8 : 0;
      for (const ex of [-6, 7]) opt.eyesOut.push(m.transformPoint(new DOMPoint(-rec - 12 + (ex + lx) * 0.62, -18 + (-1 + ly) * 0.62)));
    }
    const a0 = ctx.globalAlpha;
    const alpha = 0.72 + Math.sin(t * 3 + ph) * 0.1;
    ctx.globalAlpha = a0 * alpha;
    ctx.drawImage(off, 0, 0, w, h, -BX, -BY, w / k, h / k);
    ctx.globalAlpha = a0;
    ctx.restore();
    // echte Waffe in den Geisterpfoten
    Draw.weapon(ctx, x, y, opt.weapon, t, s, opt.recoil || 0);
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.globalAlpha = a0 * alpha;
    Draw.ellipse(ctx, 1 - rec, 3, 4.2, 3.6, body);
    ctx.globalAlpha = a0;
    ctx.restore();
  },

  hat(ctx, hat, t) {
    if (!hat) return;
    switch (hat) {
      case 'crown':
        ctx.beginPath(); ctx.moveTo(-11, -15); ctx.lineTo(-11, -27); ctx.lineTo(-5, -20); ctx.lineTo(0, -29); ctx.lineTo(5, -20); ctx.lineTo(11, -27); ctx.lineTo(11, -15); ctx.closePath();
        ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.strokeStyle = '#c99a00'; ctx.lineWidth = 1.2; ctx.stroke();
        Draw.circle(ctx, 0, -19, 2, '#ff4f6d'); break;
      case 'band':
        Draw.rrect(ctx, -17, -12, 34, 6, 2, '#e63946');
        ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-16, -9); ctx.lineTo(-26, -6 + Math.sin(t * 8) * 3); ctx.stroke(); break;
      case 'pirate':
        ctx.beginPath(); ctx.moveTo(-20, -11); ctx.quadraticCurveTo(0, -36, 20, -11); ctx.closePath(); ctx.fillStyle = '#1f1f2b'; ctx.fill();
        Draw.circle(ctx, 0, -18, 2.5, '#fff'); break;
      case 'helmet':
        ctx.beginPath(); ctx.arc(0, -4, 18, Math.PI, 0); ctx.fillStyle = '#9ca3af'; ctx.fill();
        Draw.rrect(ctx, -2, -24, 4, 8, 2, '#ef4444'); break;
      case 'visor':
        Draw.rrect(ctx, -15, -5, 30, 7, 3, 'rgba(240,171,252,0.85)'); break;
      case 'halo':
        ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, -27 + Math.sin(t * 3) * 1.5, 12, 4, 0, 0, Math.PI * 2); ctx.stroke(); break;
      case 'bow':
        Draw.tri(ctx, [8, -14], [16, -20], [16, -8], '#ff6fa8');
        Draw.tri(ctx, [8, -14], [0, -20], [0, -8], '#ff6fa8');
        Draw.circle(ctx, 8, -14, 2.5, '#ff3d8b'); break;
      case 'box':
        Draw.rrect(ctx, -14, -30, 28, 14, 2, '#c4a173');
        ctx.strokeStyle = '#8b6b3e'; ctx.lineWidth = 1; ctx.strokeRect(-14, -30, 28, 14);
        ctx.fillStyle = '#5a4420'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 0, -20); break;
    }
  },

  // Waffe; (x,y) = Griff
  weapon(ctx, x, y, w, t, s = 1, recoil = 0) {
    const d = WEAPONS[w.t];
    const col = tierColor(w.r, t);
    ctx.save();
    ctx.translate(x - recoil * 4, y);
    ctx.scale(s, s);
    const dark = '#2b2b3a';
    switch (w.t) {
      case 'pistol':
        Draw.rrect(ctx, 0, -5, 22, 8, 2, col); Draw.rrect(ctx, 2, 1, 6, 9, 2, dark); break;
      case 'shotgun':
        Draw.rrect(ctx, -4, -5, 32, 6, 2, col); Draw.rrect(ctx, 0, 1, 18, 4, 2, dark); Draw.rrect(ctx, -6, -2, 8, 9, 2, '#7a4a2a'); break;
      case 'laser':
        Draw.rrect(ctx, 0, -4, 24, 7, 3, dark); Draw.rrect(ctx, 4, -3, 14, 5, 2, col);
        Draw.circle(ctx, 25, -0.5, 3 + Math.sin(t * 20) * 0.6, '#ff3355'); break;
      case 'rocket':
        Draw.rrect(ctx, -6, -7, 34, 12, 5, col); Draw.circle(ctx, 28, -1, 6, dark); Draw.rrect(ctx, 4, 4, 6, 8, 2, dark); break;
      case 'yarn':
        Draw.rrect(ctx, 0, -6, 18, 11, 4, '#8b5a2b'); Draw.circle(ctx, 22, -1, 7, col);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(22, -1, 4, 0.5, 2.5); ctx.stroke(); break;
    }
    if (w.r >= 5) { // Glanz für hohe Stufen
      ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.25;
      Draw.circle(ctx, 10, -2, 5 + w.r * 0.4, col);
    }
    ctx.restore();
    return d;
  },

  // Hindernisse; (x,y) = Bodenpunkt
  obstacle(ctx, o, biome, t) {
    const k = o.kind;
    ctx.save();
    ctx.translate(o.x + (o.shakeX || 0), o.y);
    ctx.scale(o.scale, o.scale);
    const sq = 1 + (o.squash || 0);
    ctx.scale(1 / sq, sq);
    switch (k) {
      case 'tree': {
        Draw.rrect(ctx, -8, -42, 16, 42, 3, '#7a4a2a');
        const g = biome.accent;
        Draw.circle(ctx, -18, -50, 20, '#2f8a3c');
        Draw.circle(ctx, 18, -50, 20, '#2f8a3c');
        Draw.circle(ctx, 0, -66, 26, g);
        Draw.circle(ctx, -8, -72, 8, 'rgba(255,255,255,0.18)');
        if (o.fruit) { Draw.circle(ctx, 10, -58, 4, '#ff4d4d'); Draw.circle(ctx, -12, -48, 4, '#ff4d4d'); }
        break;
      }
      case 'cactus':
        Draw.rrect(ctx, -11, -76, 22, 76, 11, '#3f9b4a');
        Draw.rrect(ctx, -30, -50, 10, 26, 5, '#3f9b4a'); Draw.rrect(ctx, -30, -30, 22, 9, 4, '#3f9b4a');
        Draw.rrect(ctx, 20, -60, 10, 28, 5, '#3f9b4a'); Draw.rrect(ctx, 8, -38, 22, 9, 4, '#3f9b4a');
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, -4); ctx.stroke();
        if (o.fruit) Draw.circle(ctx, 0, -78, 5, '#ff5fa2');
        break;
      case 'snowman':
        Draw.circle(ctx, 0, -20, 22, '#ffffff'); Draw.circle(ctx, 0, -55, 16, '#f6f9ff'); Draw.circle(ctx, 0, -80, 12, '#ffffff');
        Draw.tri(ctx, [0, -79], [0, -76], [-12, -77], '#ff8c42');
        Draw.rrect(ctx, -10, -100, 20, 10, 2, '#222'); Draw.rrect(ctx, -14, -92, 28, 4, 2, '#222');
        Draw.circle(ctx, 0, -50, 2, '#333'); Draw.circle(ctx, 0, -58, 2, '#333');
        break;
      case 'lavarock':
        ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-30, -34); ctx.lineTo(-8, -54); ctx.lineTo(18, -48); ctx.lineTo(34, -22); ctx.lineTo(30, 0); ctx.closePath();
        ctx.fillStyle = '#3d2b2b'; ctx.fill();
        ctx.strokeStyle = `rgba(255,${120 + Math.sin(t * 5) * 60},40,0.95)`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(-6, -22); ctx.lineTo(-10, -8); ctx.moveTo(8, -40); ctx.lineTo(14, -24); ctx.lineTo(24, -18); ctx.stroke();
        break;
      case 'vending':
        Draw.rrect(ctx, -24, -86, 48, 86, 5, '#ff4fd8');
        Draw.rrect(ctx, -18, -78, 26, 50, 3, 'rgba(94,240,255,0.85)');
        for (let i = 0; i < 3; i++) Draw.circle(ctx, 14, -72 + i * 10, 3, i === Math.floor(t * 2) % 3 ? '#fff' : '#7a1e66');
        Draw.rrect(ctx, -18, -20, 36, 10, 2, '#2a2440');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MIAU', -5, -32);
        break;
      case 'chest': {
        const lid = Math.max(0, Math.sin(t * 3 + o.id)) * 5;
        Draw.rrect(ctx, -28, -40, 56, 40, 4, '#8b5a2b');
        Draw.rrect(ctx, -28, -12, 56, 6, 2, '#6b3f1a');
        if (lid > 1) { ctx.globalAlpha = lid / 5; Draw.rrect(ctx, -22, -44, 44, 6, 3, '#fff1a8'); ctx.globalAlpha = 1; }
        ctx.save(); ctx.translate(-30, -40); ctx.rotate(-lid * 0.025);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(30, -26, 60, 0); ctx.closePath(); ctx.fillStyle = '#a0692f'; ctx.fill();
        Draw.rrect(ctx, 5, -12, 6, 12, 2, '#ffd34d'); Draw.rrect(ctx, 49, -12, 6, 12, 2, '#ffd34d');
        ctx.restore();
        Draw.rrect(ctx, -25, -40, 6, 40, 2, '#ffd34d'); Draw.rrect(ctx, 19, -40, 6, 40, 2, '#ffd34d');
        Draw.rrect(ctx, -6, -32, 12, 13, 3, '#ffd34d'); Draw.circle(ctx, 0, -26, 2.2, '#6b3f1a');
        break;
      }
      case 'voidling': { // Leere: wabernder Schattenklumpen mit violettem Rand
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const a = Math.PI + i / 24 * Math.PI, r = 30 + Math.sin(i * 1.7 + t * 4 + o.id) * 3;
          ctx.lineTo(Math.cos(a) * r, -30 + Math.sin(a) * r * 1.25);
        }
        for (let i = 0; i <= 6; i++) ctx.lineTo(30 - i * 10, Math.sin(t * 6 + i + o.id) * 4); // Tentakel-Saum
        ctx.closePath();
        ctx.fillStyle = '#140a24'; ctx.fill();
        ctx.strokeStyle = `rgba(160,110,255,${0.6 + Math.sin(t * 3 + o.id) * 0.3})`; ctx.lineWidth = 2.5; ctx.stroke();
        Draw.circle(ctx, -12, -48, 5, 'rgba(160,110,255,0.25)');
        break;
      }
      case 'eyeball': { // Leere: schwebendes Auge mit Tentakeln
        ctx.translate(0, Math.sin(t * 2.4 + o.id) * 5 - 14);
        ctx.strokeStyle = '#5a2a7a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath(); ctx.moveTo(i * 7, -12);
          ctx.quadraticCurveTo(i * 10 + Math.sin(t * 5 + i) * 6, 4, i * 6 + Math.sin(t * 4 + i * 2) * 8, 14); ctx.stroke();
        }
        Draw.circle(ctx, 0, -36, 27, '#f2ecff');
        ctx.strokeStyle = 'rgba(200,60,90,0.45)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) { const a = i * 1.3 + 0.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 26, -36 + Math.sin(a) * 26); ctx.lineTo(Math.cos(a) * 15, -36 + Math.sin(a) * 15); ctx.stroke(); }
        break;
      }
      case 'shard': { // Wurmloch: rotierender Kristall
        ctx.translate(0, Math.sin(t * 2 + o.id) * 5 - 8);
        const r = Math.sin(t * 1.5 + o.id) * 0.25;
        ctx.save(); ctx.translate(0, -40); ctx.rotate(r);
        const g = ctx.createLinearGradient(-22, -40, 22, 40);
        g.addColorStop(0, '#7ef9ff'); g.addColorStop(0.5, '#9d7bff'); g.addColorStop(1, '#ff7ad9');
        ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(24, -6); ctx.lineTo(10, 36); ctx.lineTo(-12, 36); ctx.lineTo(-24, -6); ctx.closePath();
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(0, 36); ctx.moveTo(-24, -6); ctx.lineTo(24, -6); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'ufo': { // Wurmloch: kleine Untertasse mit Traktorstrahl
        ctx.translate(0, Math.sin(t * 3 + o.id) * 6 - 22);
        ctx.globalAlpha = 0.25 + Math.sin(t * 8) * 0.1; Draw.tri(ctx, [-10, -18], [10, -18], [0, 22], '#7ef9ff'); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(0, -34, 16, Math.PI, 0); ctx.fillStyle = 'rgba(150,230,255,0.75)'; ctx.fill();
        Draw.ellipse(ctx, 0, -24, 34, 10, '#9aa3c0');
        Draw.ellipse(ctx, 0, -27, 34, 6, '#c9d0e8');
        for (let i = 0; i < 5; i++) Draw.circle(ctx, -24 + i * 12, -22, 2.5, (Math.floor(t * 6) + i) % 2 ? '#ffd34d' : '#ff4d6d');
        break;
      }
      case 'popup': { // World Wide Web: Werbe-Fenster
        ctx.translate(Math.sin(t * 9 + o.id) * 1.5, Math.sin(t * 2 + o.id) * 3 - 12);
        Draw.rrect(ctx, -30, -64, 60, 52, 5, '#f4f6ff');
        Draw.rrect(ctx, -30, -64, 60, 11, 5, '#3a6df0');
        Draw.rrect(ctx, 17, -62, 9, 7, 2, '#ff4d6d');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('×', 21.5, -56.5);
        ctx.fillStyle = '#ff4fd8'; ctx.font = 'bold 7px sans-serif'; ctx.fillText(['GRATIS!', 'KLICK!', '100%!', 'WOW!'][o.id % 4], 0, -18);
        ctx.strokeStyle = '#3a6df0'; ctx.lineWidth = 1; ctx.strokeRect(-30, -64, 60, 52);
        break;
      }
      case 'bug': { // World Wide Web: ein echter „Bug“
        const w = Math.sin(t * 14 + o.id) * 3;
        ctx.strokeStyle = '#1b4d2e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(-14, -16 + i * 7); ctx.lineTo(-26, -8 + i * 8 + (i ? w : -w)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(14, -16 + i * 7); ctx.lineTo(26, -8 + i * 8 + (i ? -w : w)); ctx.stroke();
        }
        Draw.ellipse(ctx, 0, -20, 20, 17, '#2fd66b');
        ctx.strokeStyle = '#0d7a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -4); ctx.stroke();
        Draw.circle(ctx, 0, -42, 12, '#1b4d2e');
        ctx.strokeStyle = '#1b4d2e'; ctx.beginPath(); ctx.moveTo(-5, -52); ctx.lineTo(-11 + w, -64); ctx.moveTo(5, -52); ctx.lineTo(11 - w, -64); ctx.stroke();
        ctx.fillStyle = '#7dffb0'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillText('01', -8, -18); ctx.fillText('10', 8, -24);
        break;
      }
      case 'shade': { // Schattenwesen: schwebende Rauchgestalt mit Krallenarmen
        ctx.translate(0, Math.sin(t * 2.2 + o.id) * 5 - 12);
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
          const a = Math.PI + i / 20 * Math.PI, r = 26 + Math.sin(i * 2.1 + t * 5) * 3;
          ctx.lineTo(Math.cos(a) * r, -46 + Math.sin(a) * r * 1.3);
        }
        for (let i = 0; i <= 8; i++) ctx.lineTo(26 - i * 6.5, -10 + Math.sin(t * 7 + i * 1.3) * 8 + (i % 2 ? 10 : 0)); // zerfaserter Saum
        ctx.closePath();
        const g = ctx.createLinearGradient(0, -80, 0, 0);
        g.addColorStop(0, '#2a1847'); g.addColorStop(1, 'rgba(10,5,20,0.4)');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(180,140,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = '#2a1847'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (const sx of [-1, 1]) { // Arme greifen nach vorn
          const w = Math.sin(t * 4 + sx) * 6;
          ctx.beginPath(); ctx.moveTo(sx * 18, -40); ctx.quadraticCurveTo(sx * 34, -30 + w, sx * 30 - 14, -18 + w); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'asteroid': {
        ctx.translate(0, Math.sin(t * 2 + o.id) * 4 - 10);
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * Math.PI * 2, r = 32 + Math.sin(i * 2.7 + o.id) * 6;
          ctx.lineTo(Math.cos(a) * r, -34 + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fillStyle = '#7d7f9a'; ctx.fill();
        Draw.circle(ctx, -10, -40, 7, '#5f6178'); Draw.circle(ctx, 12, -26, 5, '#5f6178'); Draw.circle(ctx, 6, -50, 3, '#5f6178');
        break;
      }
    }
    if (o.boss) { // Krone
      const hy = -OBST_H[k] - 6 - (FOE_FLOAT[k] || 0); // schwebende Gegner sind schon verschoben
      ctx.beginPath(); ctx.moveTo(-14, hy); ctx.lineTo(-14, hy - 14); ctx.lineTo(-7, hy - 6); ctx.lineTo(0, hy - 18); ctx.lineTo(7, hy - 6); ctx.lineTo(14, hy - 14); ctx.lineTo(14, hy); ctx.closePath();
      ctx.fillStyle = '#ffd34d'; ctx.fill();
    }
    ctx.restore();
  },

  pet(ctx, id, x, y, t, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (id === 'mouse') {
      ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
      const p = Math.sin(t * 40) * 10;
      ctx.beginPath(); ctx.moveTo(-p, -14); ctx.lineTo(p, -14); ctx.stroke();
      Draw.rrect(ctx, -1, -14, 2, 5, 1, '#555');
      Draw.ellipse(ctx, 0, 0, 11, 8, '#a8adb8');
      Draw.circle(ctx, -7, -7, 5, '#a8adb8'); Draw.circle(ctx, -7, -7, 3, '#ffb3c6');
      Draw.circle(ctx, 7, -2, 1.6, '#222'); Draw.circle(ctx, 11, 1, 1.5, '#ff7a9a');
      ctx.strokeStyle = '#a8adb8'; ctx.beginPath(); ctx.moveTo(-10, 3); ctx.quadraticCurveTo(-20, 6, -18, -2); ctx.stroke();
    } else if (id === 'fish') {
      ctx.globalAlpha = 0.5; Draw.circle(ctx, 0, 0, 16, '#bde7ff'); ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.stroke();
      const w = Math.sin(t * 8) * 2;
      Draw.ellipse(ctx, 2, 0, 8, 6, '#ffa62b');
      Draw.tri(ctx, [-5, 0], [-12, -5 + w], [-12, 5 + w], '#ff7f11');
      Draw.circle(ctx, 6, -1, 1.5, '#222');
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(-4, 34); ctx.stroke();
    } else if (id === 'owl') {
      Draw.ellipse(ctx, 0, 0, 11, 13, '#8b6b4a');
      Draw.ellipse(ctx, 0, 3, 7, 8, '#d9c3a5');
      Draw.circle(ctx, -4, -5, 4, '#fff'); Draw.circle(ctx, 4, -5, 4, '#fff');
      const blink = (t % 3) < 0.12;
      if (!blink) { Draw.circle(ctx, -4, -5, 2, '#222'); Draw.circle(ctx, 4, -5, 2, '#222'); }
      Draw.tri(ctx, [-2, -1], [2, -1], [0, 2], '#f4a259');
      Draw.tri(ctx, [-10, -10], [-7, -16], [-4, -11], '#8b6b4a'); Draw.tri(ctx, [10, -10], [7, -16], [4, -11], '#8b6b4a');
    }
    ctx.restore();
  },
};

const OBST_H = { tree: 92, cactus: 80, snowman: 100, lavarock: 54, vending: 86, asteroid: 78, chest: 62, voidling: 68, eyeball: 78, shard: 92, ufo: 66, popup: 80, bug: 66, shade: 84 };
const OBST_W = { tree: 60, cactus: 56, snowman: 46, lavarock: 66, vending: 50, asteroid: 66, chest: 60, voidling: 62, eyeball: 56, shard: 50, ufo: 70, popup: 62, bug: 56, shade: 56 };
// Schwebe-Versatz (für Krone und Gesicht schwebender Gegner)
const FOE_FLOAT = { asteroid: -10, eyeball: -14, shard: -8, ufo: -22, popup: -12, shade: -12 };
