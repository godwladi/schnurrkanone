'use strict';
// ---------------------------------------------------------------------------
// Schicht-Lebensbalken („Strata“): der Balken besteht aus gestapelten Lichtschichten
// (Segmente mit Kerzenlicht-Glanz). Verliert er Leben, glüht der verlorene Teil kurz
// weiß-gold auf, zerfällt in seine Schichten, die abblättern, kippen und nach unten
// fallen, während Glutfunken (Kerzengold → gebranntes Orange) nach oben steigen.
// Der Rest brennt als glühende Spur von rechts nach links ab.
// Zustand je Balken in einem eigenen Objekt (Gegner: o.sb, Katze: Vitals.sb);
// alle Koordinaten relativ zum Balken, damit er mit dem Gegner mitläuft.
// ---------------------------------------------------------------------------

const Strata = {
  SEG: 10,          // Schichten je Balken
  LIFE: 0.85,       // Lebensdauer einer abgeblätterten Schicht (s)

  // st: Zustandsobjekt, frac: aktueller Anteil (0–1), col: Füllfarbe, t: Spielzeit
  draw(ctx, st, x, y, w, h, frac, col, t, r = 3) {
    frac = U.clamp(frac, 0, 1);
    const dt = st.t === undefined ? 0 : U.clamp(t - st.t, 0, 0.1);
    st.t = t;
    if (st.f === undefined) { st.f = st.ghost = st.start === undefined ? frac : st.start; st.hold = 0; st.heat = 0; st.chunks = []; st.embers = []; }
    const eco = document.body.dataset.gfxMode === 'eco';
    if (frac < st.f - 0.0005) this.lose(st, frac, st.f, w, h, eco);
    else if (frac > st.ghost) st.ghost = frac; // Heilung: Spur folgt sofort
    st.f = frac;
    // glühende Spur: kurz halten, dann weich abbrennen
    if (st.ghost > frac) {
      if (st.hold > 0) st.hold -= dt;
      else st.ghost = Math.max(frac, st.ghost - Math.max(0.12, (st.ghost - frac) * 5) * dt);
    }
    st.heat = Math.max(0, st.heat - dt * 2.2);

    // Rahmen und Grund (Indigo-Nacht)
    Draw.rrect(ctx, x - 2, y - 2, w + 4, h + 4, r + 1, 'rgba(14,8,30,0.78)');
    Draw.rrect(ctx, x, y, w, h, r, '#211a4a');
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
    // glühende Spur (gebranntes Orange, flackert)
    if (st.ghost - frac > 0.002) {
      const gx = x + w * frac, gw = w * (st.ghost - frac);
      const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0);
      gg.addColorStop(0, '#ffd34d'); gg.addColorStop(1, '#ff6a2a');
      ctx.globalAlpha = 0.75 + Math.sin(t * 40 + x) * 0.15;
      ctx.fillStyle = gg; ctx.fillRect(gx, y, gw, h);
      ctx.globalAlpha = 1;
    }
    // gestapelte Lichtschichten
    if (frac > 0) {
      const fw = Math.max(h * 0.6, w * frac);
      ctx.fillStyle = col; ctx.fillRect(x, y, fw, h);
      const lg = ctx.createLinearGradient(0, y, 0, y + h);
      lg.addColorStop(0, 'rgba(255,248,220,0.55)'); lg.addColorStop(0.45, 'rgba(255,248,220,0.08)'); lg.addColorStop(1, 'rgba(20,8,40,0.35)');
      ctx.fillStyle = lg; ctx.fillRect(x, y, fw, h);
      // Fugen zwischen den Schichten
      ctx.fillStyle = 'rgba(20,10,46,0.55)';
      const sw = w / this.SEG;
      for (let i = 1; i < this.SEG; i++) { const sx = x + i * sw; if (sx < x + fw - 1) ctx.fillRect(sx - 0.6, y, 1.2, h); }
      // Treffer: Vorderkante glüht
      if (st.heat > 0) {
        ctx.globalCompositeOperation = 'lighter';
        const ex = x + fw, eg = ctx.createRadialGradient(ex, y + h / 2, 0, ex, y + h / 2, h * 2.2);
        eg.addColorStop(0, `rgba(255,240,190,${0.9 * st.heat})`); eg.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = eg; ctx.fillRect(ex - h * 2.2, y - h, h * 4.4, h * 3);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();

    // abblätternde Schichten (außerhalb des Rahmens, fallen nach unten)
    for (let i = st.chunks.length - 1; i >= 0; i--) {
      const c = st.chunks[i];
      c.age += dt;
      if (c.age > this.LIFE) { st.chunks.splice(i, 1); continue; }
      const k = c.age / this.LIFE, cx = x + w * c.x, cw = w * c.w;
      const fall = c.age < 0.08 ? 0 : (c.age - 0.08);
      ctx.save();
      ctx.translate(cx + cw / 2 + c.vx * fall, y + h / 2 + 260 * fall * fall * c.g);
      ctx.rotate(c.rot * fall * 3);
      ctx.globalAlpha = 1 - k * k;
      // weiß-gold → Kerzengold → gebranntes Orange
      ctx.fillStyle = c.age < 0.08 ? '#fff6d8' : k < 0.45 ? '#ffd34d' : '#ff6a2a';
      ctx.fillRect(-cw / 2, -h / 2, cw, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-cw / 2, -h / 2, cw, h * 0.35);
      ctx.restore();
    }
    // Glutfunken
    if (st.embers.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = st.embers.length - 1; i >= 0; i--) {
        const e = st.embers[i];
        e.life -= dt;
        if (e.life <= 0) { st.embers.splice(i, 1); continue; }
        e.vy -= 30 * dt; e.vx *= Math.pow(0.3, dt);
        e.x += (e.vx + Math.sin(t * 9 + e.p) * 14) * dt; e.y += e.vy * dt;
        const a = e.life / e.max, fl = 0.6 + Math.sin(t * 30 + e.p) * 0.4;
        ctx.globalAlpha = a * fl;
        ctx.fillStyle = a > 0.6 ? '#fff1b8' : a > 0.3 ? '#ffb347' : '#ff5a1f';
        ctx.beginPath(); ctx.arc(x + e.x, y + e.y, e.r * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  },

  // Verlust von a bis b (Anteile): Schichten abspalten, Funken sprühen
  lose(st, a, b, w, h, eco) {
    st.heat = 1; st.hold = 0.28;
    const last = st.chunks[st.chunks.length - 1];
    // Dauerschaden (Laser, Gift) in einem Bild-Takt zu einer Schicht zusammenfassen
    if (last && last.age < 0.06 && Math.abs(last.x - b) < 0.02) { last.w += last.x - a; last.x = a; }
    else {
      // an den Schichtfugen teilen, damit wirklich einzelne Schichten abblättern
      const seg = 1 / this.SEG;
      let s = a;
      while (s < b - 0.0005 && st.chunks.length < 14) {
        const e = Math.min(b, (Math.floor(s / seg + 1e-6) + 1) * seg);
        st.chunks.push({ x: s, w: e - s, age: 0, vx: U.rand(-14, 18), g: U.rand(0.7, 1.3), rot: U.rand(-0.5, 0.5) });
        s = e;
      }
    }
    const n = Math.min(eco ? 4 : 10, 2 + Math.round((b - a) * (eco ? 12 : 30)));
    for (let i = 0; i < n && st.embers.length < (eco ? 12 : 36); i++) {
      const life = U.rand(0.45, 0.9);
      st.embers.push({ x: w * U.rand(a, b), y: U.rand(0, h), vx: U.rand(-25, 25), vy: U.rand(-70, -25), life, max: life, r: U.rand(1, 2.2) * Math.max(1, h / 7), p: Math.random() * 9 });
    }
  },
};
