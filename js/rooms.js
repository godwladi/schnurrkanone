'use strict';
// ---------------------------------------------------------------------------
// Sonderräume im Streifzug: Die Leere, Wurmloch, World Wide Web. Jeder mit
// eigenem Hintergrund, zwei eigenen Gegnern, eigenem Boss und einer Regel:
//   Leere   – Dunkelheit, nur um die Katze herum ist Licht, Gegner-Augen glühen
//   Wurmloch – die Zeit schwankt (alles mal schneller, mal langsamer)
//   Web     – Pop-up-Werbung verdeckt das Spielfeld; aufs ✕ tippen schließt sie
// ---------------------------------------------------------------------------

const SPECIAL_ROOMS = [
  { name: 'Die Leere', special: 'void', dark: true, sky: ['#020106', '#0e0820'], hills: '#0b0614', hills2: '#120a22', ground: '#07040e', ground2: '#8a5cff',
    obstacle: 'voidling', foes: ['voidling', 'voidling', 'eyeball'], accent: '#8a5cff', debris: ['#8a5cff', '#140a24', '#c9a6ff'],
    desc: 'Dunkelheit – nur um die Katze ist es hell' },
  { name: 'Wurmloch', special: 'wormhole', dark: true, sky: ['#05021a', '#1a0b3a'], hills: '#120a30', hills2: '#1a0f40', ground: '#120a30', ground2: '#7ef9ff',
    obstacle: 'shard', foes: ['shard', 'ufo'], accent: '#7ef9ff', debris: ['#7ef9ff', '#9d7bff', '#ff7ad9'],
    desc: 'Die Zeit schwankt – mal schneller, mal langsamer' },
  { name: 'World Wide Web', special: 'web', dark: true, sky: ['#010a0c', '#03262b'], hills: '#021a1c', hills2: '#03262b', ground: '#021a1c', ground2: '#2fffa0',
    obstacle: 'popup', foes: ['popup', 'bug'], accent: '#2fffa0', debris: ['#2fffa0', '#3a6df0', '#ffffff'],
    desc: 'Pop-up-Werbung! Tippe aufs ✕ zum Wegklicken' },
];
const RUN_BIOMES = BIOMES.concat(SPECIAL_ROOMS);

Object.assign(BOSS_NAMES, { voidling: 'Das Große Nichts', eyeball: 'Das Allsehende Auge', shard: 'Ereignishorizont', ufo: 'Admiral Untertasse', popup: 'Pop-up-Imperator', bug: 'Der Ur-Bug' });
Object.assign(BOSS_ATTACKS, {
  voidling: { icon: '🌑', name: 'Schattenkugeln', n: 2, speed: 0.85, size: 1.2, dmg: 1 },
  eyeball:  { icon: '👁️', name: 'Starrblick',     n: 1, speed: 1.3,  size: 1.2, dmg: 1.2 },
  shard:    { icon: '💠', name: 'Splitterregen',  n: 3, speed: 1.2,  size: 0.9, dmg: 0.6, sky: true },
  ufo:      { icon: '🛸', name: 'Mini-Ufos',      n: 2, speed: 1,    size: 1,   dmg: 0.8 },
  popup:    { icon: '📧', name: 'Spam-Welle',     n: 3, speed: 1.1,  size: 0.9, dmg: 0.6 },
  bug:      { icon: '🐛', name: 'Fehlerflut',     n: 2, speed: 1.2,  size: 1,   dmg: 0.8 },
  shade:    { icon: '🌑', name: 'Schattenfetzen', n: 1, speed: 1,    size: 1,   dmg: 0.8 },
});
// Musik: vorhandene Lieder, anders getaktet
SONGS.voidling = { ...SONGS.asteroid, tempo: 84 };
SONGS.shard = { ...SONGS.asteroid, tempo: 132 };
SONGS.popup = { ...SONGS.vending, tempo: 136 };

const AD_TEXTS = ['DU HAST GEWONNEN!', 'Heiße Katzen in deiner Nähe', 'Gratis Thunfisch 🐟', 'Dein Kratzbaum ist veraltet!', 'Nur heute: 99 % Rabatt', 'Klick hier für Leckerlis!',
  'Dein PC hat 37 Mäuse!', 'Wollknäuel-Flatrate 💶', 'Katzenklo 2.0 jetzt vorbestellen', 'Du bist Besucher Nr. 1.000.000!'];
const AD_MAX = 6;       // so viele Fenster können gleichzeitig offen sein
const AD_CLOSE_R = 24;  // Trefferradius des ✕ (Finger)

const Rooms = {
  ads: [], adT: 4, glyphs: null,

  cur() { return Run.active ? RUN_BIOMES[S.run.biome % RUN_BIOMES.length] : null; },
  kind() { const b = this.cur(); return b && b.special; },

  // Wurmloch: Spielgeschwindigkeit schwankt zwischen 0,7× und 1,3×
  timeWarp() { return this.kind() === 'wormhole' ? 1 + 0.3 * Math.sin(Battle.t * 0.7) : 1; },

  reset() { this.ads = []; this.adT = 4; },

  // Werbefenster bleiben offen, bis man sie wegklickt. Neue Fenster stapeln sich
  // kaskadenartig über den alten (wie echte Pop-ups), höchstens AD_MAX auf einmal.
  update(dt, B) {
    if (this.kind() !== 'web') { this.ads = []; return; }
    this.adT -= dt;
    const open = this.ads.filter(a => !a.closing);
    if (this.adT <= 0) {
      // je mehr schon offen ist, desto länger dauert das nächste Fenster
      this.adT = U.rand(4.5, 7) + open.length * 0.9;
      if (open.length < AD_MAX) this.spawnAd(B, open);
    }
    for (const a of this.ads) {
      a.t += dt;
      a.wob = Math.max(0, (a.wob || 0) - dt);
      if (a.closing) a.closing += dt;
    }
    this.ads = this.ads.filter(a => !(a.closing > 0.28));
  },

  spawnAd(B, open) {
    // k: auf niedrigen Bildschirmen (Handy quer) kleinere Fenster
    const W = B.Wp || B.W, k = U.clamp(B.H / 620, 0.72, 1), w = Math.min(220 * k, W * 0.5), h = 96 * k;
    const top = 70, bottom = Math.max(top + 10, B.groundY - h - 30);
    let x, y;
    const last = open[open.length - 1];
    if (last && Math.random() < 0.65) {
      // Kaskade: leicht versetzt über dem letzten Fenster
      x = last.x + 26; y = last.y + 22;
      if (x + w > W - 10 || y > bottom) { x = U.rand(10, W - w - 10); y = U.rand(top, bottom); }
    } else { x = U.rand(10, W - w - 10); y = U.rand(top, bottom); }
    this.ads.push({ x, y, w, h, k, t: 0, text: U.pick(AD_TEXTS), hue: U.randi(0, 360), id: Math.random() });
    for (const a of open) a.wob = 0.25; // die alten Fenster zucken mit
    SFX.play('adPop');
  },

  // Fauchen fegt alle Werbefenster auf einmal weg
  blowAway(B) {
    let n = 0;
    for (const a of this.ads) if (!a.closing) { a.closing = 0.0001; a.blown = true; n++; this.adBurst(B, a); }
    if (n) B.text(B.W / 2, B.groundY * 0.4, `${n}× WEGGEFAUCHT!`, '#2fffa0', 20 * B.cs, true);
  },

  adBurst(B, a) {
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2;
    for (let i = 0; i < 14; i++) {
      const p = B.particle(cx + U.rand(-a.w, a.w) * 0.4, cy + U.rand(-a.h, a.h) * 0.4, U.rand(-260, 260), U.rand(-300, 60), U.pick(['#ffffff', `hsl(${a.hue},80%,60%)`, '#2fffa0', '#ffd34d']), U.rand(0.5, 0.9), U.rand(4, 8) * B.cs, 700, false, 'chunk');
      if (p) p.spin = U.rand(-12, 12);
    }
  },

  // Antippen: ✕ einer Werbung schließt sie (Schnurr-Meter, etwas Leben).
  // Das oberste Fenster zuerst; ein Tipp ins Fenster selbst wird geschluckt.
  tap(B, x, y) {
    for (let i = this.ads.length - 1; i >= 0; i--) {
      const a = this.ads[i];
      if (a.closing) continue;
      const cx = a.x + a.w - 14 * a.k, cy = a.y + 11 * a.k;
      if (Math.hypot(x - cx, y - cy) < AD_CLOSE_R) {
        a.closing = 0.0001;
        this.adBurst(B, a);
        B.purr = Math.min(100, B.purr + 10);
        Vitals.heal(B, 0.03, true);
        B.text(cx, cy, 'WEGGEKLICKT!', '#2fffa0', 16 * B.cs, true);
        FX.addRing(cx, cy, 40, '#2fffa0', 0.25, 4);
        SFX.play('parry');
        return true;
      }
      if (x > a.x && x < a.x + a.w && y > a.y && y < a.y + a.h) { // Fenster schluckt den Tipp
        a.wob = 0.3;
        B.text(x, y, U.pick(['Werbung!', 'Falsches ✕!', 'Klick daneben!']), '#ff7ad9', 13 * B.cs);
        return true;
      }
    }
    return false;
  },

  // ---------------------------------------------------------------- Hintergründe
  drawBg(ctx, B, biome) {
    const k = biome.special;
    if (k === 'void') this.bgVoid(ctx, B, biome);
    else if (k === 'wormhole') this.bgWormhole(ctx, B, biome);
    else this.bgWeb(ctx, B, biome);
  },

  sky(ctx, B, biome) {
    const g = ctx.createLinearGradient(0, 0, 0, B.groundY);
    g.addColorStop(0, biome.sky[0]); g.addColorStop(1, biome.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(-20, -20, B.W + 40, B.groundY + 20);
  },
  floor(ctx, B, biome) {
    const gy = B.groundY;
    ctx.fillStyle = biome.ground; ctx.fillRect(-20, gy, B.W + 40, B.H - gy + 20);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6 + Math.sin(B.t * 2) * 0.2; ctx.fillStyle = biome.ground2; ctx.fillRect(-20, gy, B.W + 40, 2);
    ctx.globalAlpha = 0.18; ctx.fillRect(-20, gy - 3, B.W + 40, 8);
    ctx.restore();
  },

  bgVoid(ctx, B, biome) {
    const W = B.W, gy = B.groundY, t = B.t;
    this.sky(ctx, B, biome);
    // treibende Lichtpunkte
    for (const s of B.stars) {
      ctx.globalAlpha = 0.15 + Math.sin(t * 1.3 + s.p) * 0.12;
      Draw.circle(ctx, ((s.x * W - t * 6 * s.s) % W + W) % W, (s.y * gy + Math.sin(t * 0.4 + s.p) * 10), s.s * 0.8, '#c9a6ff');
    }
    ctx.globalAlpha = 1;
    // riesiges Auge im Nichts, folgt der Katze und blinzelt
    const ex = W * 0.72, ey = gy * 0.32, r = Math.min(70, W * 0.09);
    const open = ((t % 7) < 0.25) ? 0.1 : 1;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.ellipse(ex, ey, r * 1.6, r * open, 0, 0, Math.PI * 2); ctx.fillStyle = '#1d1030'; ctx.fill();
    ctx.clip();
    const lx = (B.catX - ex) / W * r * 0.8;
    Draw.circle(ctx, ex + lx, ey + 4, r * 0.7, '#5a2a9a');
    Draw.circle(ctx, ex + lx, ey + 4, r * 0.3, '#05020a');
    ctx.restore();
    ctx.globalAlpha = 1;
    this.floor(ctx, B, biome);
  },

  bgWormhole(ctx, B, biome) {
    const W = B.W, gy = B.groundY, t = B.t;
    this.sky(ctx, B, biome);
    const cx = W * 0.62, cy = gy * 0.42, maxR = Math.max(W, gy) * 0.9;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Ringe fliegen auf den Betrachter zu
    for (let i = 0; i < 14; i++) {
      const p = ((i / 14) + t * 0.12) % 1, rr = p * p * maxR;
      ctx.globalAlpha = p * 0.5;
      ctx.strokeStyle = `hsl(${(230 + i * 12 + t * 20) % 360},90%,65%)`; ctx.lineWidth = 1 + p * 4;
      ctx.beginPath(); ctx.ellipse(cx, cy, rr, rr * 0.62, Math.sin(t * 0.3) * 0.2, 0, Math.PI * 2); ctx.stroke();
    }
    // Sternen-Striche nach außen
    for (const s of B.stars) {
      const a = s.p * 7, p = ((s.x + t * 0.25 * s.s) % 1), d = p * p * maxR;
      ctx.globalAlpha = p * 0.8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s.s * 0.6;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.62); ctx.lineTo(cx + Math.cos(a) * d * 0.85, cy + Math.sin(a) * d * 0.62 * 0.85); ctx.stroke();
    }
    FX.drawGlow(ctx, cx, cy, 60, '#ffffff', 0.5 + Math.sin(t * 3) * 0.1);
    FX.drawGlow(ctx, cx, cy, 120, '#9d7bff', 0.4);
    ctx.restore();
    ctx.globalAlpha = 1;
    this.floor(ctx, B, biome);
  },

  bgWeb(ctx, B, biome) {
    const W = B.W, H = B.H, gy = B.groundY, t = B.t;
    this.sky(ctx, B, biome);
    // fallende Binärzahlen (feste Spalten, wenige Zeichen pro Bild)
    if (!this.glyphs || this.glyphs.W !== W) {
      this.glyphs = { W, cols: Array.from({ length: Math.ceil(W / 34) }, (_, i) => ({ x: i * 34 + 10, sp: U.rand(30, 70), off: U.rand(0, 400) })) };
    }
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const c of this.glyphs.cols) {
      for (let j = 0; j < 4; j++) {
        const y = ((c.off + t * c.sp + j * 26) % (gy + 40)) - 20;
        ctx.globalAlpha = 0.12 + j * 0.06;
        ctx.fillStyle = '#2fffa0';
        ctx.fillText(((c.x + j + Math.floor(t * 2)) % 3) ? '1' : '0', c.x, y);
      }
    }
    ctx.globalAlpha = 1;
    // schwebende Browserfenster weit hinten
    for (let i = 0; i < 3; i++) {
      const x = ((i * 380 - t * 12) % (W + 300) + W + 300) % (W + 300) - 150, y = 50 + i * 55;
      ctx.globalAlpha = 0.18;
      Draw.rrect(ctx, x, y, 120, 70, 6, '#0b3a40');
      Draw.rrect(ctx, x, y, 120, 12, 6, '#2fffa0');
      ctx.fillStyle = '#2fffa0'; ctx.font = 'bold 18px monospace'; ctx.fillText(['404', 'www', '<html>'][i], x + 60, y + 42);
    }
    ctx.globalAlpha = 1;
    // Neon-Gitter mit Fluchtpunkt
    ctx.fillStyle = biome.ground; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
    ctx.save();
    ctx.strokeStyle = '#2fffa0'; ctx.lineWidth = 1;
    const vx = W * 0.5, vy = gy - 40;
    ctx.beginPath(); ctx.rect(-20, gy, W + 40, H - gy + 20); ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (let i = -12; i <= 12; i++) { ctx.moveTo(vx + i * 30, vy); ctx.lineTo(vx + i * 260, H + 20); }
    const sc = (t * 0.6) % 1;
    for (let j = 0; j < 8; j++) { const p = (j + sc) / 8, y = gy + p * p * (H - gy + 20); ctx.moveTo(-20, y); ctx.lineTo(W + 20, y); }
    ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.fillStyle = '#2fffa0'; ctx.fillRect(-20, gy, W + 40, 2);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  },

  // ---------------------------------------------------------------- Mieze-Lampe (Leere)
  // Die Katze trägt eine kleine Laterne am Hüftgurt (Draw.hipLamp) – die einzige Lichtquelle.
  // Hier nur der Lichtschein über der Dunkelheit und die Motten drumherum.
  lampPos(B) { return B.lampPt || { x: B.catX - 11 * B.cs, y: B.groundY - 6 * B.cs }; },
  drawLamp(ctx, B, lp, fl) {
    const cs = B.cs, t = B.t, gy = B.groundY, x = lp.x;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    FX.drawGlow(ctx, x + 12 * cs, lp.y - 14 * cs, 150 * cs * fl, '#ffcf7a', 0.2);
    FX.drawGlow(ctx, x, lp.y, 42 * cs * fl, '#ffe2a8', 0.3);
    ctx.globalAlpha = 0.14; Draw.ellipse(ctx, x + 14 * cs, gy + 2, 95 * cs * fl, 11 * cs, '#ffcf7a');
    ctx.restore();
    // Motten tanzen um das Licht
    for (let i = 0; i < 3; i++) {
      const a = t * (2 + i * 0.7) + i * 2.1;
      Draw.circle(ctx, x + Math.cos(a) * (14 + i * 4) * cs, lp.y - 6 * cs + Math.sin(a * 1.3) * (9 + i * 3) * cs, 1.4 * cs, 'rgba(255,245,220,0.85)');
    }
  },

  // ---------------------------------------------------------------- Bildschirm-Ebene
  drawScreen(ctx, B) {
    const k = this.kind();
    if (k === 'void') {
      // Dunkelheit: einziges Licht ist die Mieze-Lampe an der Hüfte der Katze (flackert leicht),
      // glühende Augen der Gegner schauen hindurch
      const cs = B.cs, t = B.t, lp = this.lampPos(B);
      const fl = 1 + Math.sin(t * 7.3) * 0.03 + Math.sin(t * 13.1) * 0.02 + (Math.random() < 0.02 ? -0.06 : 0);
      const cx = (lp.x + B.catX + 10 * cs) / 2, cy = B.groundY - 24 * cs;
      const g = ctx.createRadialGradient(cx, cy, 70 * cs * fl, cx, cy, Math.max(B.W, B.H) * 0.62 * fl);
      g.addColorStop(0, 'rgba(3,1,8,0)'); g.addColorStop(0.28, 'rgba(3,1,8,0.55)'); g.addColorStop(0.6, 'rgba(3,1,8,0.86)'); g.addColorStop(1, 'rgba(3,1,8,0.94)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, B.W, B.H);
      this.drawLamp(ctx, B, lp, fl);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const inv = ctx.getTransform().invertSelf();
      for (const o of B.obs) {
        if (o.dead || o.fleeing || !o.faceM) continue;
        const f = FACE[o.kind]; if (!f) continue;
        const blink = ((B.t + o.id * 1.37) % 4) < 0.12;
        if (blink) continue;
        // Augenmitte aus der Lage beim Zeichnen des Gesichts → bewegt sich exakt mit
        for (const ex of f.cyclops || f.profile ? [0] : f.eyes || [-7.5, 7.5]) {
          const p = inv.transformPoint(o.faceM.transformPoint(new DOMPoint(ex, 0)));
          FX.drawGlow(ctx, p.x, p.y, (f.cyclops ? 14 : 9) * o.scale, o.boss ? '#ff1e46' : '#c9a6ff', 0.85);
        }
      }
      ctx.restore();
    } else if (k === 'wormhole') {
      const w = this.timeWarp(), W = B.Wp || B.W;
      ctx.save();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      Draw.rrect(ctx, 12, B.H - 104 - (B.insetB || 0), 104, 24, 12, 'rgba(20,10,50,0.7)');
      ctx.font = '800 12px "Segoe UI", "Segoe UI Emoji", sans-serif'; ctx.fillStyle = w > 1 ? '#7ef9ff' : '#ff7ad9';
      ctx.fillText(`🌀 Zeit ×${w.toFixed(2)}`, 22, B.H - 92 - (B.insetB || 0));
      ctx.restore();
      if (W) {
        // leichte Verzerrung am Rand: farbige Kanten
        ctx.globalAlpha = Math.abs(w - 1) * 0.6; ctx.fillStyle = w > 1 ? '#7ef9ff' : '#ff7ad9';
        ctx.fillRect(0, 0, 4, B.H); ctx.fillRect(B.W - 4, 0, 4, B.H); ctx.globalAlpha = 1;
      }
    }
    // Pop-up-Werbung (Web): springt auf (Überschwingen), zuckt, klappt beim Schließen zusammen
    const open = this.ads.filter(a => !a.closing).length;
    if (k === 'web' && open) {
      ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const txt = (B.Wp || B.W) < 720 ? `📢 ${open} / ${AD_MAX} Pop-ups · ✕ antippen` : `📢 ${open} / ${AD_MAX} Pop-ups offen · ✕ antippen · Fauchen fegt alle weg`;
      ctx.font = '800 12px "Segoe UI", "Segoe UI Emoji", sans-serif';
      const pw = ctx.measureText(txt).width + 22, py = B.H - 104 - (B.insetB || 0);
      Draw.rrect(ctx, 12, py, pw, 24, 12, 'rgba(2,30,30,0.78)');
      ctx.fillStyle = open >= AD_MAX ? '#ff7ad9' : '#2fffa0'; ctx.fillText(txt, 23, py + 12);
      ctx.restore();
    }
    for (const a of this.ads) {
      const e = Math.min(1, a.t * 5), pop = e < 1 ? 1 + Math.sin(e * Math.PI) * 0.12 - (1 - e) * 0.9 : 1;
      const c = a.closing ? Math.min(1, a.closing / 0.28) : 0;
      const fade = 1 - c, sc = Math.max(0.01, pop * (1 - c * 0.6));
      const wob = a.wob > 0 ? Math.sin(a.wob * 60) * a.wob * 0.2 : 0;
      ctx.save();
      ctx.globalAlpha = 0.97 * fade;
      ctx.translate(a.x + a.w / 2, a.y + a.h / 2 - (a.blown ? c * 60 : 0)); ctx.rotate(wob + (a.blown ? c * 0.8 : 0)); ctx.scale(sc * a.k, sc * a.k * (1 - c * 0.3));
      const aw = a.w / a.k, ah = a.h / a.k; // Zeichnen in Grundgröße
      ctx.translate(-aw / 2, -ah / 2);
      Draw.rrect(ctx, 5, 7, aw, ah, 8, 'rgba(0,0,0,0.35)'); // Schatten
      Draw.rrect(ctx, 0, 0, aw, ah, 8, '#ffffff');
      Draw.rrect(ctx, 0, 0, aw, 22, 8, `hsl(${a.hue},80%,55%)`);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('⚠ WERBUNG', 8, 11);
      Draw.circle(ctx, aw - 14, 11, 9, '#ff4d6d');
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; // ✕ pulsiert, damit man es findet
      ctx.beginPath(); ctx.arc(aw - 14, 11, 9.5 + Math.sin(B.t * 6 + a.id * 9) * 1.3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('✕', aw - 14, 12);
      ctx.fillStyle = `hsl(${(a.hue + 180) % 360},80%,45%)`;
      let fs = Math.min(15, aw / 14);
      ctx.font = `900 ${fs}px "Segoe UI", "Segoe UI Emoji", sans-serif`;
      const tw = ctx.measureText(a.text).width;
      if (tw > aw - 16) { fs *= (aw - 16) / tw; ctx.font = `900 ${fs}px "Segoe UI", "Segoe UI Emoji", sans-serif`; } // Text passt immer ins Fenster
      ctx.fillText(a.text, aw / 2, 46);
      ctx.globalAlpha = (0.6 + Math.sin(B.t * 10) * 0.4) * fade;
      Draw.rrect(ctx, aw / 2 - 40, 64, 80, 20, 10, '#ffd34d');
      ctx.fillStyle = '#3a2600'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('JETZT KLICKEN', aw / 2, 74);
      ctx.restore();
    }
  },
};

const _playR = SFX.play;
SFX.play = function (name, arg) {
  if (!this.on || !this.ctx) return;
  if (name === 'adPop') { [880, 1320, 990].forEach((f, i) => this.tone(f, 0.08, 'square', 0.05, 0, i * 0.06)); return; }
  return _playR.call(this, name, arg);
};
