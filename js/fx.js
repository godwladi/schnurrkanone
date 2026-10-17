'use strict';
// ---------------------------------------------------------------------------
// Visuelle Effekte: Leuchten, Wetter pro Biom, Schockwellen, Lichtstrahlen,
// Vignette, Speed-Lines, Bodendetails
// ---------------------------------------------------------------------------

const BOSS_NAMES = {
  tree: 'Uralter Eichenkönig', cactus: 'Kaktus-Khan', snowman: 'Frostbaron Flockig',
  lavarock: 'Magmafürst', vending: 'Automat 3000', asteroid: 'Mondbrocken Rex',
};

const FX = {
  glowCache: new Map(),
  ambient: [],
  rings: [],
  vig: null, vigKey: '',

  // weicher Leuchtpunkt als vorgerendertes Sprite (schnell mit 'lighter')
  glow(color) {
    let c = this.glowCache.get(color);
    if (c) return c;
    if (this.glowCache.size > 120) this.glowCache.clear();
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color);
    gr.addColorStop(0.25, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.9;
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.glowCache.set(color, c);
    return c;
  },
  drawGlow(ctx, x, y, r, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(this.glow(color), x - r, y - r, r * 2, r * 2);
  },

  addRing(x, y, max, color = '#ffffff', life = 0.35, width = 6) {
    if (this.rings.length > 30) this.rings.shift();
    this.rings.push({ x, y, max, color, life, maxLife: life, width });
  },

  // ---------------------------------------------------------------- Wetter
  updateAmbient(dt, B, biome) {
    const W = B.W, gy = B.groundY, list = this.ambient;
    const kind = biome.obstacle;
    const rate = { tree: 5, cactus: 9, snowman: 26, lavarock: 14, vending: 45, asteroid: 3 }[kind];
    const cap = Perf.cfg().amb;
    let n = rate * dt * cap / 110;
    while (n > 0 && list.length < cap) {
      if (Math.random() < n) list.push(this.spawnAmbient(kind, W, gy));
      n -= 1;
    }
    // Glühwürmchen im Wald
    if (kind === 'tree' && list.filter(p => p.type === 'firefly').length < 7 && Math.random() < dt) {
      list.push({ type: 'firefly', x: Math.random() * W, y: gy - U.rand(20, 140), vx: 0, vy: 0, life: U.rand(6, 10), age: 0, p: Math.random() * 6, front: false });
    }
    for (const p of list) {
      p.age += dt;
      switch (p.type) {
        case 'leaf':  p.x += (p.vx + Math.sin(p.age * 2 + p.p) * 40) * dt; p.y += p.vy * dt; p.rot += p.spin * dt; break;
        case 'snow':  p.x += (p.vx + Math.sin(p.age * 1.5 + p.p) * 20) * dt; p.y += p.vy * dt; break;
        case 'ember': p.x += (p.vx + Math.sin(p.age * 3 + p.p) * 25) * dt; p.y += p.vy * dt; break;
        case 'firefly': p.x += Math.sin(p.age * 0.9 + p.p) * 22 * dt; p.y += Math.cos(p.age * 1.3 + p.p) * 16 * dt; break;
        default: p.x += p.vx * dt; p.y += p.vy * dt;
      }
      if (p.type === 'rain' && p.y > gy + p.depth * 30) {
        p.dead = true;
        if (Math.random() < 0.4) list.push({ type: 'splash', x: p.x, y: gy + p.depth * 30, vx: 0, vy: 0, age: 0, life: 0.25, front: p.front });
      }
    }
    this.ambient = list.filter(p => !p.dead && p.age < p.life && p.x > -60 && p.x < W + 260 && p.y < B.H + 20 && p.y > -80);
  },

  spawnAmbient(kind, W, gy) {
    const front = Math.random() < 0.3;
    const depth = Math.random();
    switch (kind) {
      case 'tree': return { type: 'leaf', x: U.rand(0, W + 100), y: -10, vx: U.rand(-60, -20), vy: U.rand(30, 60), rot: Math.random() * 6, spin: U.rand(-3, 3), p: Math.random() * 6, size: U.rand(3, 6), color: U.pick(['#7bc96f', '#a3d977', '#f2c14e', '#e8913a']), age: 0, life: 20, front };
      case 'cactus': return { type: 'sand', x: W + U.rand(0, 200), y: U.rand(gy * 0.45, gy + 30), vx: U.rand(-700, -400), vy: U.rand(-10, 10), len: U.rand(30, 90), age: 0, life: 4, front, depth };
      case 'snowman': return { type: 'snow', x: U.rand(-20, W + 200), y: -10, vx: U.rand(-50, -15), vy: U.rand(35, 80) * (0.6 + depth), size: 1.2 + depth * 2.8, p: Math.random() * 6, age: 0, life: 20, front: depth > 0.75 };
      case 'lavarock': return Math.random() < 0.75
        ? { type: 'ember', x: U.rand(0, W), y: gy + U.rand(0, 40), vx: U.rand(-30, 10), vy: U.rand(-90, -40), size: U.rand(1.5, 3.5), p: Math.random() * 6, age: 0, life: U.rand(3, 7), front }
        : { type: 'ash', x: U.rand(0, W + 100), y: -10, vx: U.rand(-40, -10), vy: U.rand(20, 45), size: U.rand(1.5, 3), age: 0, life: 20, front };
      case 'vending': return { type: 'rain', x: U.rand(0, W + 250), y: U.rand(-60, -10), vx: -220, vy: 900 + depth * 300, depth, age: 0, life: 3, color: Math.random() < 0.5 ? '#5ef0ff' : '#ff8be6', front: depth > 0.7 };
      default: return Math.random() < 0.5
        ? { type: 'shoot', x: U.rand(W * 0.2, W + 200), y: U.rand(0, gy * 0.4), vx: -U.rand(500, 900), vy: U.rand(150, 300), age: 0, life: 1.4, front: false }
        : { type: 'dust', x: W + 20, y: U.rand(0, gy), vx: U.rand(-60, -20), vy: U.rand(-5, 5), size: U.rand(1, 2.5), age: 0, life: 40, front };
    }
  },

  drawAmbient(ctx, front) {
    for (const p of this.ambient) {
      if (p.front !== front) continue;
      const fade = Math.min(1, p.age * 3, (p.life - p.age) * 2);
      switch (p.type) {
        case 'leaf':
          ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          Draw.ellipse(ctx, 0, 0, p.size, p.size * 0.5, p.color); ctx.restore(); break;
        case 'snow':
          ctx.globalAlpha = 0.85 * fade; Draw.circle(ctx, p.x, p.y, p.size, '#ffffff'); break;
        case 'ash':
          ctx.globalAlpha = 0.5 * fade; Draw.circle(ctx, p.x, p.y, p.size, '#8a7a7a'); break;
        case 'sand':
          ctx.globalAlpha = 0.25 * fade; ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 1 + p.depth;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len, p.y); ctx.stroke(); break;
        case 'rain':
          ctx.globalAlpha = 0.45; ctx.strokeStyle = p.color; ctx.lineWidth = 1 + p.depth;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 0.025, p.y + p.vy * 0.025); ctx.stroke(); break;
        case 'splash':
          ctx.globalAlpha = 1 - p.age / p.life; ctx.strokeStyle = '#9ff6ff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 3 + p.age * 40, 1 + p.age * 8, 0, 0, Math.PI * 2); ctx.stroke(); break;
        case 'dust':
          ctx.globalAlpha = 0.5 * fade; Draw.circle(ctx, p.x, p.y, p.size, '#c7c3ff'); break;
      }
    }
    // leuchtende Teilchen additiv
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.ambient) {
      if (p.front !== front) continue;
      const fade = Math.min(1, p.age * 3, (p.life - p.age) * 2);
      if (p.type === 'ember') {
        const fl = 0.6 + Math.sin(p.age * 14 + p.p) * 0.4;
        this.drawGlow(ctx, p.x, p.y, p.size * 4, '#ff7a2b', fade * fl);
        this.drawGlow(ctx, p.x, p.y, p.size * 1.4, '#fff1a8', fade * fl);
      } else if (p.type === 'firefly') {
        const fl = Math.max(0, Math.sin(p.age * 2.2 + p.p));
        this.drawGlow(ctx, p.x, p.y, 12, '#d9ff6b', fade * fl);
      } else if (p.type === 'shoot') {
        const a = fade * 0.9;
        ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.12, p.y - p.vy * 0.12); ctx.stroke();
        this.drawGlow(ctx, p.x, p.y, 10, '#bfc8ff', a);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  },

  // ---------------------------------------------------------------- Licht
  lightRays(ctx, B, biome, k = 1) {
    if (k <= 0.01 || (biome.dark || ['Lavagrund', 'Neon-City', 'Sternenmeer'].includes(biome.name))) return;
    const sx = B.W * 0.82, sy = B.groundY * 0.22, t = B.t;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const ang = 1.95 + i * 0.16 + Math.sin(t * 0.3 + i) * 0.03;
      const len = B.W * 1.1, w = 0.05 + (i % 2) * 0.03;
      ctx.globalAlpha = (0.05 + Math.sin(t * 0.7 + i * 1.7) * 0.02) * k;
      const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
      g.addColorStop(0, '#fff6c2'); g.addColorStop(1, 'rgba(255,246,194,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(ang - w) * len, sy + Math.sin(ang - w) * len);
      ctx.lineTo(sx + Math.cos(ang + w) * len, sy + Math.sin(ang + w) * len);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  // Bodendetails, scrollen mit dem Boden
  groundDetails(ctx, B, biome) {
    const W = B.W, gy = B.groundY, sc = B.scroll, kind = biome.obstacle;
    const step = 46;
    for (let i = -1; i < W / step + 2; i++) {
      const wi = i + Math.floor(sc / step);
      const x = i * step - sc % step;
      const h = (Math.imul(wi, 2654435761) >>> 0) % 1000 / 1000; // stabiler Pseudo-Zufall pro Kachel
      const y = gy + 10 + h * 50;
      switch (kind) {
        case 'tree':
          ctx.strokeStyle = h > 0.5 ? '#4aa84a' : '#6cc46a'; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let k = -1; k <= 1; k++) { ctx.moveTo(x + k * 3, y); ctx.lineTo(x + k * 5 + Math.sin(B.t * 2 + wi) * 2, y - 7 - h * 6); }
          ctx.stroke();
          if (h > 0.8) Draw.circle(ctx, x + 6, y - 3, 2.5, h > 0.9 ? '#ffd1e8' : '#fff7a8');
          break;
        case 'cactus':
          if (h > 0.4) Draw.ellipse(ctx, x, y, 3 + h * 5, 2 + h * 2, 'rgba(120,80,30,0.35)');
          break;
        case 'snowman':
          if (h > 0.5) { ctx.globalAlpha = 0.5 + Math.sin(B.t * 4 + wi) * 0.5; Draw.circle(ctx, x, y, 1.6, '#ffffff'); ctx.globalAlpha = 1; }
          break;
        case 'lavarock':
          if (h > 0.55) {
            ctx.strokeStyle = `rgba(255,${110 + Math.sin(B.t * 3 + wi) * 50},40,0.8)`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x, y + 4); ctx.lineTo(x + 12, y - 2); ctx.stroke();
          }
          break;
        case 'vending':
          if (wi % 2 === 0) { ctx.fillStyle = 'rgba(255,79,216,0.45)'; ctx.fillRect(x, gy + 34, 26, 3); }
          break;
        default:
          if (h > 0.6) { Draw.ellipse(ctx, x, y, 6 + h * 6, 2 + h * 2, 'rgba(0,0,0,0.25)'); }
      }
    }
  },

  // dunkle, schnell vorbeiziehende Silhouetten im Vordergrund (Tiefe)
  foreground(ctx, B) {
    const W = B.W, H = B.H, sc = B.scroll * 1.8, step = 320;
    ctx.fillStyle = 'rgba(8,5,20,0.38)';
    for (let i = -1; i < W / step + 2; i++) {
      const wi = i + Math.floor(sc / step);
      const h = (Math.imul(wi + 77, 2246822519) >>> 0) % 1000 / 1000;
      if (h < 0.4) continue;
      const x = i * step - sc % step + h * 140, r = (22 + h * 26) * B.cs;
      ctx.beginPath();
      ctx.arc(x, H + r * 0.35, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.9, H + r * 0.55, r * 0.8, 0, Math.PI * 2);
      ctx.arc(x - r * 0.8, H + r * 0.6, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  updateRings(dt) {
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter(r => r.life > 0);
  },
  drawRings(ctx) {
    for (const r of this.rings) {
      const p = 1 - r.life / r.maxLife;
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width * (1 - p) + 0.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.max * (0.2 + p * 0.8), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  vignette(ctx, W, H, strength) {
    const key = `${W}x${H}`;
    if (this.vigKey !== key) {
      this.vigKey = key;
      const g = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(10,5,25,0)');
      g.addColorStop(1, 'rgba(10,5,25,1)');
      this.vig = g;
    }
    ctx.globalAlpha = strength;
    ctx.fillStyle = this.vig; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  },

  speedLines(ctx, W, H, t, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    const seed = Math.floor(t * 20);
    for (let i = 0; i < 16; i++) {
      const h = (Math.imul(seed * 31 + i * 977, 2654435761) >>> 0) / 4294967296;
      const h2 = (Math.imul(seed * 17 + i * 613, 2246822519) >>> 0) / 4294967296;
      const y = h * H, x = h2 * W, len = 80 + h2 * 220;
      ctx.globalAlpha = 0.12 + h * 0.18; ctx.lineWidth = 1 + h * 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    }
    ctx.restore();
  },
};
