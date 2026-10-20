'use strict';
// ---------------------------------------------------------------------------
// Kampfszene: Hindernisse, Projektile, Partikel, Bosse, Skills, Begleiter
// ---------------------------------------------------------------------------

const Battle = {
  cv: null, ctx: null, W: 800, H: 500, dpr: 1, t: 0,
  obs: [], bul: [], parts: [], txt: [], flyers: [],
  slotCd: [0, 0, 0, 0], recoil: [0, 0, 0, 0],
  nextId: 1, shake: 0, scroll: 0,
  bossState: 'none', bossTimer: 0, bossObj: null,
  banner: null,
  purr: 0, frenzy: 0, roar: 0, laser: 0, owlBuff: 0, laserTxt: 0,
  petT: { mouse: 0, fish: 0, owl: 0 },
  targets: { coin: { x: 60, y: -30 }, bone: { x: 160, y: -30 } },
  stars: [],
  hitStop: 0, zoom: { a: 0, x: 0, y: 0 }, bossIntro: 0, whiteFlash: 0,
  laserCharge: 0, laserEnd: null, fury: 0, eyes: null, mainEyes: null, combo: 0, comboT: 0, comboPop: 0, rush: 0,
  dayT: 0, night: 0, slowmo: 0, bossRequested: false,
  balloon: null, eventT: 45, bossTimeMax: 30, lookVec: { x: 1, y: 0 },
  muzzles: [null, null, null, null], petMuzzle: null, droneFlash: 0,

  init(cv) {
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.resize();
    // iOS meldet beim Drehen 'resize' oft, bevor das Layout fertig ist → Leinwand behielt die alte
    // Größe (quer: Katze unten abgeschnitten, hochkant danach „eingezoomt“). Deshalb die echte
    // Spielfeldgröße beobachten und nach dem Drehen mehrfach nachmessen.
    const fit = () => {
      const r = this.cv.parentElement.getBoundingClientRect();
      if (Math.abs(Math.max(300, r.width) - this.W) > 0.5 || Math.abs(Math.max(240, r.height) - this.H) > 0.5 || Perf.dpr() !== this.dpr) this.resize();
    };
    window.addEventListener('resize', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(this.cv.parentElement);
    if (window.visualViewport) visualViewport.addEventListener('resize', fit);
    window.addEventListener('orientationchange', () => {
      for (const ms of [50, 200, 450, 900]) setTimeout(() => { window.scrollTo(0, 0); fit(); }, ms);
    });
    cv.addEventListener('pointerdown', e => this.onPointer(e));
    for (let i = 0; i < 80; i++) this.stars.push({ x: Math.random(), y: Math.random() * 0.7, s: Math.random() * 1.8 + 0.4, p: Math.random() * 6 });
  },

  resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    const old = this.W ? { W: this.Wp || this.W, gy: this.groundY, cs: this.cs, front: this.frontX } : null;
    this.dpr = Perf.dpr(); // iPhone: 3× Pixeldichte wäre sehr teuer, siehe perf.js
    this.W = Math.max(300, r.width);
    this.H = Math.max(240, r.height);
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.H * this.dpr);
    this.cv.style.width = this.W + 'px';
    this.cv.style.height = this.H + 'px';
    // Handy: Platz für die Symbolleiste (unten hochkant, rechts quer) – Werte aus CSS (--dockB/--dockR)
    const cssv = getComputedStyle(this.cv.parentElement);
    this.insetB = parseFloat(cssv.getPropertyValue('--dockB')) || 0;
    this.insetR = parseFloat(cssv.getPropertyValue('--dockR')) || 0;
    this.Wp = this.W - this.insetR; // nutzbare Breite links der Leiste
    this.groundY = Math.min(this.H * 0.8, this.H - 58 - this.insetB); // Füße über der Skill-Leiste
    // Größe nach Höhe UND Breite: im hohen Handy-Vollbild sonst riesige Katze, Gegner abgeschnitten
    this.cs = U.clamp(Math.min(this.H / 420, this.Wp / 440), 0.8, 1.7);
    this.catX = Math.max(80, this.W * 0.13, 95 * this.cs); // Platz für Goldfisch und Eule links
    // schmal (Handy hochkant): Front näher an die Katze, sonst stapeln sich die Hindernisse
    this.frontX = this.Wp < 520 ? Math.max(this.catX + 135 * this.cs, this.Wp * 0.4) : Math.max(this.catX + 200 * this.cs, this.Wp * 0.47);
    this.spacing = Math.min(150 * this.cs, (this.Wp - this.frontX - 30) / 3.2);
    // Drehen/Fenstergröße: Hindernisse auf den neuen Boden, die neue Größe und die neue
    // Frontlinie umrechnen, sonst schweben/versinken sie oder stehen außerhalb des Bildes
    if (old && (old.W !== this.Wp || old.gy !== this.groundY)) {
      const k = this.cs / old.cs, kx = (this.Wp - this.frontX) / Math.max(1, old.W - old.front);
      for (const o of this.obs) {
        o.y = this.groundY; o.scale *= k;
        o.x = this.frontX + (o.x - old.front) * kx;
      }
      for (const f of this.flyers) f.y = Math.min(f.y, this.groundY);
      this.laserEnd = null;
      this.realignT = 1.5;
    }
    if (typeof UI !== 'undefined') UI.updateFlyTargets();
  },

  // ---------------------------------------------------------------- Werte
  dmgMul() { return R.dmgMult * (this.frenzy > 0 ? 3 : 1); },
  rateMul() { return R.rateMult * (this.frenzy > 0 ? 1.5 : 1) * (this.roar > 0 ? 2 : 1) * (this.owlBuff > 0 ? 1.5 : 1) * (Events.active('storm') ? 1.25 : 1) * Talents.rateMul() * Run.rateMul() * Rooms.rateMul(); },
  critNow() { return Talents.focus > 0 ? 1 : Math.min(0.95, R.crit + (this.roar > 0 ? 0.5 : 0) + Run.critAdd()); },
  liveObs() { return this.obs.filter(o => !o.dead && !o.fleeing); },
  front() { return this.obs.find(o => !o.dead && !o.fleeing && !(o.dying > 0) && o.x < this.W - 20) || null; },

  slotPos(i) {
    const cs = this.cs, t = this.t;
    if (i === 0) return { x: this.catX + 18 * cs, y: this.groundY - 20 * cs, s: cs };
    const off = [[-14, -128], [56, -150], [-6, -204]][i - 1]; // Geisterkatzen dürfen sich nicht überdecken
    return { x: this.catX + off[0] * cs, y: this.groundY + off[1] * cs + Math.sin(t * 2.4 + i) * 5, s: cs * 0.9 };
  },

  // ---------------------------------------------------------------- Erzeugen
  makeObstacle(boss) {
    const biome = biomeFor(S.stage);
    const treasure = !boss && Math.random() < 0.03;
    const kind = treasure ? 'chest' : !boss && biome.foes ? U.pick(biome.foes) : biome.obstacle;
    const golden = !boss && !treasure && Math.random() < (Events.active('goldrain') ? 0.25 : 0.05);
    const hp = boss ? Econ.bossHp(S.stage) : Econ.hp(S.stage) * U.rand(0.85, 1.15) * (golden ? 1.5 : 1) * (treasure ? 2 : 1);
    return Shades.maybe(Run.adjustObstacle({
      id: this.nextId++, kind, boss, fruit: golden, golden, treasure,
      x: this.W + 80 + Math.random() * 40, y: this.groundY,
      hp, maxHp: hp, scale: this.cs * (boss ? 1.75 : U.rand(0.92, 1.08)),
      flash: 0, squash: 0, shakeX: 0, dead: false, fleeing: false,
    }));
  },

  spawnBoss() {
    const o = this.makeObstacle(true);
    this.obs.push(o);
    this.bossObj = o;
    this.bossState = 'active';
    this.bossRequested = false;
    // Schilde: ab Stufe 5 einer bei 50 %, ab Stufe 20 zwei bei 66 % und 33 %
    o.shieldAt = S.stage >= 20 ? [0.66, 0.33] : S.stage >= 5 ? [0.5] : [];
    o.shield = 0; o.shieldMax = 1;
    this.bossTimeMax = Econ.bossTime() + o.shieldAt.length * 4;
    this.bossTimer = this.bossTimeMax;
    this.showBanner('BOSS!', `${BOSS_NAMES[o.kind]} · ${this.bossTimeMax} Sekunden`, '#ff4d6d');
    Vitals.onBossSpawn(this, o);
    Run.onBossSpawn(this, o);
    SFX.play('boss');
    this.shake = 10;
    this.bossIntro = 1.8;
  },

  showBanner(text, sub, color) { this.banner = { text, sub, color, t: 0 }; },

  // ---------------------------------------------------------------- Update
  update(dt) {
    const realDt = dt;
    dt *= Rooms.timeWarp(); // Wurmloch: schwankende Zeit
    if (this.hitStop > 0) { this.hitStop -= realDt; dt *= 0.06; }
    if (this.slowmo > 0) { this.slowmo -= realDt; dt *= 0.35; }
    this.dayT += dt;
    this.zoom.a *= Math.pow(0.004, realDt);
    this.whiteFlash = Math.max(0, this.whiteFlash - realDt * 1.6);
    this.bossIntro = Math.max(0, this.bossIntro - realDt);
    FX.updateAmbient(dt, this, biomeFor(S.stage));
    FX.updateRings(dt);
    this.t += dt;
    const W = this.W;
    this.scroll += dt * (this.frenzy > 0 ? 110 : 35);
    for (const k of ['frenzy', 'roar', 'owlBuff', 'rush', 'comboPop']) this[k] = Math.max(0, this[k] - dt);
    if (this.laserCharge > 0) {
      this.laserCharge -= dt;
      if (this.laserCharge <= 0) {
        this.laserCharge = 0; this.laser = 3; this.shake = 7;
        for (const e of this.allEyes()) FX.addRing(e.x, e.y, 40 * this.cs, '#ff3355', 0.3, 4);
      }
    }
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { Combo.onBreak(this.combo); this.combo = 0; } }
    this.frameDt = realDt;
    // Gesichtsausdruck folgt der Feuerrate: Buffs (Raserei, Fauchen, Eule, Espresso,
    // Gewitter) stark, dauerhaftes Training leicht
    const boost = this.rateMul() / Math.max(1e-6, R.rateMult);
    const furyWant = U.clamp(Math.log2(boost) / 1.4 + U.clamp(Math.log2(Math.max(1, R.rateMult)) / 5, 0, 0.3), 0, 1);
    this.fury += (furyWant - this.fury) * Math.min(1, realDt * 5);
    this.updateBalloon(dt);
    Events.update(dt, this);
    // Abklingzeit läuft erst, wenn die Fähigkeit vorbei ist
    for (const id of Object.keys(S.skillsCd)) if (this.skillLeft(id) <= 0) S.skillsCd[id] = Math.max(0, S.skillsCd[id] - dt);
    this.shake *= Math.pow(0.0015, dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.2) this.banner = null; }

    // Farm-Modus: automatisch erneut gegen den Boss antreten
    if (S.farm && S.autoBoss && S.farmKills >= KILLS_PER_STAGE) {
      S.farm = false; S.kills = KILLS_PER_STAGE; Game.emit('stage');
    }

    // Spawnen
    if (this.bossState === 'none' && !Run.paused()) {
      const live = this.liveObs().length;
      if (!S.farm && S.kills >= KILLS_PER_STAGE) {
        if (!S.autoBoss && !this.bossRequested) {
          // Auto-Boss AUS: auf dieser Stufe bleiben und weiterfarmen
          S.farm = true; S.farmKills = 0;
          this.showBanner('STUFE GEHALTEN', 'Auto-Boss ist aus – starte den Boss selbst', '#ffb347');
          Game.emit('stage');
        } else if (live === 0) this.spawnBoss();
      } else {
        const allowed = S.farm ? 4 : Math.min(4, KILLS_PER_STAGE - S.kills);
        if (live < allowed) { this.obs.push(this.makeObstacle(false)); Shades.onSpawn(this); }
      }
    }

    // Bewegung der Hindernisse
    this.realignT = Math.max(0, (this.realignT || 0) - dt);
    let idx = 0;
    for (const o of this.obs) {
      if (o.fleeing) { o.x += 700 * dt; continue; }
      const tx = o.boss ? this.frontX + 30 * this.cs : this.frontX + idx * this.spacing;
      idx++;
      if (o.x > tx) o.x = Math.max(tx, o.x - 420 * dt);
      else if (this.realignT > 0 && o.x < tx - 1 && !(o.dying > 0)) o.x = Math.min(tx, o.x + 420 * dt); // nach Drehen wieder einreihen
      o.flash -= dt;
      o.squash *= Math.pow(0.002, dt);
      o.shakeX = o.flash > 0 ? U.rand(-3, 3) : 0;
      if (o.dying > 0) {
        o.dying -= dt;
        o.flash = 0.05; o.shakeX = U.rand(-9, 9);
        const h = OBST_H[o.kind] * o.scale;
        if (Math.random() < dt * 50) this.particle(o.x + U.rand(-0.5, 0.5) * h, o.y - U.rand(0.1, 1) * h, U.rand(-200, 200), U.rand(-300, 0), U.pick(['#ffffff', '#ffd34d', '#ff4d6d']), 0.5, 5 * this.cs, 400, false, 'spark');
        if (Math.random() < dt * 7) FX.addRing(o.x + U.rand(-30, 30), o.y - U.rand(0.2, 0.9) * h, 60 * this.cs, '#ffd6dc', 0.25, 5);
        if (o.dying <= 0) { o.dying = -1; this.kill(o); }
      }
      if ((o.golden || o.boss) && Math.random() < dt * (o.golden ? 10 : 4)) {
        const h = OBST_H[o.kind] * o.scale;
        this.particle(o.x + U.rand(-0.6, 0.6) * h * 0.6, o.y - U.rand(0.1, 1) * h, 0, U.rand(-40, -10), o.golden ? '#ffe680' : '#ff8fa3', U.rand(0.5, 1), U.rand(5, 9) * this.cs, 0, false, 'star');
      }
    }
    this.obs = this.obs.filter(o => !o.dead && !(o.fleeing && o.x > W + 300));

    // Boss-Timer (Absicherung: Boss verschwunden -> Zustand zurücksetzen)
    if (this.bossState === 'active' && (!this.bossObj || !this.obs.includes(this.bossObj))) { this.bossState = 'none'; this.bossObj = null; }
    if (this.bossState === 'active') {
      const b = this.bossObj;
      if (b && !(b.dying > 0) && b.x <= this.frontX + 31 * this.cs) this.bossTimer -= dt;
      if (this.bossTimer <= 0) Vitals.ultimate(this);
    }

    // Waffen feuern
    const target = this.front();
    // Laserzeit läuft nur, solange ein Ziel da ist – kein ungenutztes Glühen
    if (target) this.laser = Math.max(0, this.laser - dt);
    // Strahl-Brummen läuft genau so lange wie der Laser (nicht fest 3 s)
    SFX.laserHum(this.laser > 0 && document.visibilityState === 'visible');
    const rm = this.rateMul();
    S.slots.forEach((w, i) => {
      this.recoil[i] = Math.max(0, this.recoil[i] - dt * 6);
      if (!w || Vitals.dazed > 0 || Shades.slotFrozen(i)) return;
      const d = WEAPONS[w.t];
      this.slotCd[i] -= dt * rm * (1 + setBonus(w.t).rate);
      if (this.slotCd[i] <= 0) {
        if (target) { this.fire(i, w, target); this.slotCd[i] += 1 / d.rate; }
        else this.slotCd[i] = 0;
      }
    });

    // Augenlaser: Endpunkt gleitet weich zum Ziel und bleibt beim Zielwechsel
    // stehen, statt zu springen oder kurz zu verschwinden
    if (this.laser > 0 || this.laserCharge > 0) {
      if (target) {
        const tx = target.x - 6 * this.cs, ty = target.y - OBST_H[target.kind] * target.scale * 0.5;
        if (!this.laserEnd) this.laserEnd = { x: tx, y: ty };
        else { const k = Math.min(1, realDt * 12); this.laserEnd.x += (tx - this.laserEnd.x) * k; this.laserEnd.y += (ty - this.laserEnd.y) * k; }
      }
    } else this.laserEnd = null;
    if (this.laser > 0 && target) {
      this.damage(target, R.dps * 6 * dt * (this.frenzy > 0 ? 3 : 1), false, true, 'laser');
      this.laserTxt -= dt;
      if (Math.random() < 0.8) this.particle(target.x - 10, target.y - OBST_H[target.kind] * target.scale * 0.5, U.rand(-260, 60), U.rand(-260, 80), U.pick(['#ff3355', '#ffb3c1', '#ffffff']), 0.35, 4 * this.cs, 400, false, 'spark');
    }

    if (this.laserCharge > 0 && Math.random() < dt * 60) {
      const e = U.pick(this.allEyes()), a = Math.random() * Math.PI * 2, d = U.rand(30, 60) * this.cs;
      this.particle(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, -Math.cos(a) * d * 5, -Math.sin(a) * d * 5, '#ff4d6d', 0.2, 3 * this.cs, 0, false, 'spark');
    }

    // Begleiter
    this.updatePets(dt, target);
    Talents.update(dt, this);
    Vitals.update(dt, this);
    Rooms.update(dt, this);
    Shades.update(dt, this);

    // Projektile
    for (const b of this.bul) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.arc) b.phase += dt * 9;
      if (b.trail) { b.trail.push(b.x, b.y); if (b.trail.length > 12) b.trail.splice(0, 2); }
      // gezielte Geschosse (Sternschauer) treffen nur ihr Ziel, solange es noch steht
      if (b.aim && (b.aim.dead || b.aim.fleeing || b.aim.dying > 0)) b.aim = null;
      for (const o of this.obs) {
        if (o.dead || o.fleeing || o.dying > 0 || b.hit.has(o.id) || (b.aim && o !== b.aim)) continue;
        if (b.x >= o.x - OBST_W[o.kind] * 0.45 * o.scale && (!b.needY || b.y >= o.y - OBST_H[o.kind] * o.scale)) {
          b.hit.add(o.id);
          this.onBulletHit(b, o);
          if (b.pierce > 0) { b.pierce--; b.vy = b.arc ? -Math.abs(b.vy) : b.vy; }
          else b.dead = true;
          break;
        }
      }
      if (b.x > W + 60 || b.y > this.H + 40 || b.life <= 0) b.dead = true;
    }
    this.bul = this.bul.filter(b => !b.dead);

    // Partikel
    for (const p of this.parts) {
      p.vy += (p.grav || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag || 0.4, dt);
      if (p.spin) p.rot += p.spin * dt;
      p.life -= dt;
      if (p.floor && p.y > this.groundY + 6) { p.y = this.groundY + 6; p.vy *= -0.35; p.vx *= 0.7; }
    }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const tx of this.txt) { tx.x += (tx.vx || 0) * dt; tx.vx *= Math.pow(0.05, dt); tx.y += tx.vy * dt; tx.vy *= Math.pow(0.05, dt); tx.life -= dt; }
    this.txt = this.txt.filter(t => t.life > 0);

    // Münzen/Gräten fliegen zur Anzeige
    for (const f of this.flyers) {
      f.age += dt;
      if (f.age < f.burst) {
        f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.y > this.groundY) { f.y = this.groundY; f.vy *= -0.5; }
      } else {
        const tg = this.targets[f.kind];
        const dx = tg.x - f.x, dy = tg.y - f.y, dist = Math.hypot(dx, dy);
        f.speed = Math.min(2200, (f.speed || 200) + 3200 * dt);
        if (dist < 22) { f.done = true; SFX.play('coin'); UI.pop(f.kind); continue; }
        f.x += dx / dist * f.speed * dt; f.y += dy / dist * f.speed * dt;
      }
    }
    this.flyers = this.flyers.filter(f => !f.done);

    // Schnurr-Meter
    if (this.purr >= 100) {
      this.purr = 0;
      this.frenzy = 6;
      S.stats.frenzies++;
      this.showBanner('SCHNURR-RASEREI!', '3× Schaden · 1,5× Feuerrate', '#ff7ad9');
      SFX.play('frenzy');
      SFX.play('meow', 1.15);
      this.shake = 8;
      this.punchZoom(0.06, this.catX, this.groundY - 40 * this.cs);
      FX.addRing(this.catX, this.groundY - 40 * this.cs, 400, '#ff7ad9', 0.6, 14);
      Vitals.heal(this, 0.25 + 0.2 * Run.n('purr'));
    }
  },

  updatePets(dt, target) {
    const t = this.petT, cs = this.cs;
    // von einem Schattenwesen eingefroren: der Begleiter ruht, sein Bonus fällt weg
    const fz = id => Shades.isFrozen('pet:' + id);
    this.droneFlash = Math.max(0, this.droneFlash - dt);
    if (S.pets.mouse > 0 && !fz('mouse')) {
      t.mouse += dt;
      if (t.mouse >= 1 && target) {
        t.mouse = 0;
        const p = this.petPos('mouse'), m = this.petMuzzle || { x: p.x + 15 * cs, y: p.y + 7 * cs };
        const dmg = R.dps * 0.1 * S.pets.mouse * (this.frenzy > 0 ? 3 : 1);
        this.shootBullet(m.x, m.y, target, { dmg, color: '#c7d2fe', size: 4, speed: 1100, noCrit: true, src: 'pet' });
        this.muzzleFx(m.x, m.y, '#c7d2fe', 0.6, 1, 'laser');
        this.droneFlash = 0.08;
      }
    }
    if (S.pets.fish > 0 && !fz('fish')) {
      t.fish += dt;
      if (t.fish >= 8) {
        t.fish = 0;
        const coins = Econ.coins(S.stage) * R.coinMult * 1.5 * S.pets.fish;
        Game.addCoins(coins);
        const p = this.petPos('fish');
        this.text(p.x, p.y - 30 * cs, '+' + U.fmt(coins), '#ffd34d', 16);
        this.spawnFlyers(p.x, p.y, 8, 'coin');
      }
    }
    if (S.pets.owl > 0 && !fz('owl')) {
      t.owl += dt;
      if (t.owl >= 20) {
        t.owl = 0;
        this.owlBuff = 3 + 0.5 * S.pets.owl;
        const p = this.petPos('owl');
        this.text(p.x, p.y - 30 * cs, 'Huhu! +50% Feuerrate', '#fde68a', 14);
        FX.addRing(p.x, p.y, 60 * cs, '#fde68a', 0.35, 4);
        for (let i = 0; i < 8; i++) { // Federn
          const f = this.particle(p.x + U.rand(-10, 10) * cs, p.y, U.rand(-90, 90), U.rand(-140, -40), U.pick(['#a4835e', '#d9c3a5', '#fde68a']), U.rand(0.8, 1.3), U.rand(3, 5) * cs, 120, false, 'chunk');
          if (f) f.spin = U.rand(-6, 6);
        }
        SFX.play('buy');
      }
    }
  },

  petPos(id, t = this.t) {
    const cs = this.cs;
    if (id === 'mouse') return { x: this.catX + 70 * cs, y: this.groundY - 105 * cs + Math.sin(t * 3) * 6 };
    if (id === 'fish') return { x: this.catX - 62 * cs, y: this.groundY - 95 * cs + Math.sin(t * 1.7) * 8 };
    return { x: this.catX - 60 * cs, y: this.groundY - 32 * cs };
  },

  // ---------------------------------------------------------------- Kampf
  fire(i, w, target) {
    const d = WEAPONS[w.t];
    const p = this.slotPos(i), mz = this.muzzles[i];
    // Mündung aus dem letzten Bild (genau am gezeichneten Lauf), sonst Schätzung
    const mx = mz ? mz.x : p.x + 30 * p.s, my = mz ? mz.y : p.y - 1 * p.s;
    const sb = setBonus(w.t);
    const dmg = d.dmg * Econ.tierMult(w.r) * this.dmgMul() * (1 + sb.dmg);
    const pellets = d.pellets + sb.pellets;
    for (let k = 0; k < pellets; k++) {
      this.shootBullet(mx, my, target, {
        dmg, color: tierColor(w.r, this.t), size: d.size * (1 + w.r * 0.06) * this.cs, speed: d.speed,
        pierce: d.pierce + sb.pierce, splash: d.splash * (1 + sb.splash) * this.cs, fullSplash: sb.fullSplash,
        arc: d.arc, spread: d.spread * (pellets > d.pellets ? 1.3 : 1), type: w.t,
      });
    }
    this.recoil[i] = 1;
    this.muzzleFx(mx, my, tierColor(w.r, this.t), w.t === 'rocket' ? 1.6 : w.t === 'shotgun' ? 1.25 : 1, p.s / this.cs, w.t);
    if (w.t === 'pistol' || w.t === 'shotgun') {
      const sh = this.particle(mx - 16 * p.s, my - 2 * p.s, U.rand(-120, -40), U.rand(-320, -200), '#e9b949', 1.2, 3.5 * this.cs, 1400, true, 'shell');
      if (sh) sh.spin = U.rand(10, 20);
    }
    SFX.play(w.t === 'rocket' ? 'rocket' : 'shoot');
  },

  // Mündungsfeuer: Lichtblitz, gerichtete Flammenzunge und ein Rauchwölkchen am Lauf
  muzzleFx(x, y, col, k = 1, sc = 1, type) {
    const cs = this.cs * sc;
    this.particle(x + 3 * cs, y, 0, 0, col, 0.07, 16 * cs * k, 0, false, 'flash');
    const f = this.particle(x, y, 0, 0, col, 0.06, 13 * cs * k, 0, false, 'mflash');
    if (f) f.rot = U.rand(-0.15, 0.15);
    if (type === 'laser') return; // Energiewaffe: kein Rauch
    if (Math.random() < (type === 'rocket' ? 1 : 0.45)) this.particle(x + 4 * cs, y - 1 * cs, U.rand(20, 60), U.rand(-50, -20), 'rgba(235,235,245,0.8)', U.rand(0.4, 0.7), U.rand(3, 6) * cs * k, -40, false, 'smoke');
  },

  shootBullet(x, y, target, o) {
    const ty = target.y - OBST_H[target.kind] * target.scale * U.rand(0.3, 0.7);
    let ang = Math.atan2(ty - y, target.x - x) + (o.spread ? U.rand(-o.spread, o.spread) : 0);
    ang = U.clamp(ang, -0.6, 0.6);
    this.bul.push({
      x, y, vx: Math.cos(ang) * o.speed, vy: Math.sin(ang) * o.speed,
      ox: x, oy: y, dmg: o.dmg, color: o.color, size: o.size, pierce: o.pierce || 0, splash: o.splash || 0,
      arc: o.arc, phase: 0, life: 3, hit: new Set(), noCrit: o.noCrit, type: o.type, src: o.src || 'bullet',
      sprite: o.sprite, needY: o.needY, fullSplash: o.fullSplash,
      trail: o.type === 'rocket' || o.type === 'laser' ? [] : null,
    });
  },

  onBulletHit(b, o) {
    const hy = o.y - OBST_H[o.kind] * o.scale * 0.5;
    if (b.splash) {
      for (const other of this.obs) {
        if (other.dead || other.fleeing) continue;
        if (Math.abs(other.x - o.x) <= b.splash) this.damage(other, b.dmg * (other === o || b.fullSplash ? 1 : 0.6), !b.noCrit);
      }
      for (let i = 0; i < 18; i++) this.particle(o.x, hy, U.rand(-260, 260), U.rand(-300, 120), U.pick(['#ffb347', '#ff6a2b', '#ffe66d']), U.rand(0.3, 0.7), U.rand(4, 9) * this.cs, 300, false, 'spark');
      this.particle(o.x, hy, 0, 0, '#ffb347', 0.18, b.splash * 0.9, 0, false, 'flash');
      FX.addRing(o.x, hy, b.splash, '#ffd28a', 0.3, 5);
      this.shake = Math.max(this.shake, 4);
    } else {
      this.damage(o, b.dmg, !b.noCrit, false, b.src);
      // Funken prallen gegen die Flugrichtung zurück, kurzer Lichtpunkt am Einschlag
      const sp = Math.hypot(b.vx, b.vy) || 1, back = Math.atan2(-b.vy / sp, -b.vx / sp);
      for (let i = 0; i < 4; i++) {
        const a = back + U.rand(-0.9, 0.9), v = U.rand(160, 380);
        this.particle(b.x, b.y, Math.cos(a) * v, Math.sin(a) * v, i ? b.color : '#ffffff', U.rand(0.12, 0.25), U.rand(1.6, 2.6) * this.cs, 500, false, 'streak');
      }
      if (this.parts.length < Perf.cfg().parts * 0.7) this.particle(b.x, b.y, 0, 0, b.color, 0.06, 9 * this.cs, 0, false, 'flash');
    }
  },

  damage(o, amount, canCrit, quiet, src = 'bullet') {
    if (o.dead || o.dying > 0) return;
    const crit = canCrit && Math.random() < this.critNow();
    let dmg = amount * (crit ? R.critDmg : 1) * (o.boss ? R.bossMult : 1) * Run.dmgMul(o, src) * Vitals.dmgMul(o) * Shades.dmgMul(o, src) * Rooms.dmgMul();
    if (o.boss && o.shield > 0) {
      // Schild: Kugeln richten wenig aus, Pfotenhiebe viel
      const eff = dmg * (src === 'paw' || src === 'parry' ? 4 : src === 'laser' ? 1 : 0.25);
      o.shield -= eff;
      o.flash = 0.05;
      SFX.play('shieldHit');
      if (src === 'paw') {
        const cy = o.y - OBST_H[o.kind] * o.scale * 0.55;
        FX.addRing(o.x, cy, OBST_H[o.kind] * o.scale * 0.8, '#9fd8ff', 0.25, 6);
        this.text(o.x + U.rand(-30, 30), cy - 40, '-' + U.fmt(eff) + ' 🛡', '#9fd8ff', 16 * this.cs);
      }
      if (o.shield <= 0) this.breakShield(o);
      return;
    }
    o.hp -= dmg;
    if (o.boss && o.shieldAt && o.shieldAt.length && o.hp > 0 && o.hp / o.maxHp <= o.shieldAt[0]) {
      o.hp = Math.max(o.hp, o.maxHp * o.shieldAt[0]);
      o.shieldAt.shift();
      o.shield = o.shieldMax = o.maxHp * 0.07;
      SFX.play('shield');
      this.showBanner('SCHILD!', 'Pfotenhiebe machen 4× Schaden am Schild', '#5ab0ff');
      FX.addRing(o.x, o.y - OBST_H[o.kind] * o.scale * 0.55, 200 * this.cs, '#5ab0ff', 0.5, 10);
    }
    o.flash = 0.07;
    o.squash = Math.min(0.18, o.squash + 0.07);
    Foes.onHit(this, o, dmg, crit, src);
    if (!quiet || this.laserTxt <= 0) {
      if (quiet) this.laserTxt = 0.15;
      const showAll = S.optNums && this.txt.length < 40; // Optionen: Schadenszahlen aus
      if (crit) { if (S.optNums) this.text(o.x + U.rand(-20, 20), o.y - OBST_H[o.kind] * o.scale - 10, U.fmt(dmg) + '!', '#ffe14d', 22 * this.cs, true); SFX.play('crit'); }
      else if (showAll && (o.boss || Math.random() < 0.35 || quiet)) this.text(o.x + U.rand(-25, 25), o.y - OBST_H[o.kind] * o.scale - 5, U.fmt(dmg), '#ffffff', 13 * this.cs);
    }
    SFX.play('hit');
    if (o.hp <= 0) {
      if (o.boss && !o.dying) {
        // dramatischer Boss-Tod in Zeitlupe
        o.hp = 0; o.dying = 0.9;
        this.slowmo = 0.9;
        this.punchZoom(0.1, o.x, o.y - OBST_H[o.kind] * o.scale * 0.5);
        SFX.play('boom');
      } else this.kill(o);
    }
  },

  kill(o) {
    if (o.dead) return;
    o.dead = true;
    const biome = biomeFor(S.stage);
    this.combo = this.comboT > 0 ? this.combo + 1 : 1;
    this.comboT = o.boss ? 3 : 1.6;
    this.comboPop = 0.25;
    if (this.combo > (S.stats.maxCombo || 0)) S.stats.maxCombo = this.combo;
    if (this.combo > S.quests.comboBest) S.quests.comboBest = this.combo;
    if (this.combo >= 5 && this.combo % 5 === 0) SFX.play('combo', this.combo / 5);
    Combo.onHit(this, this.comboT);
    const mult = (o.boss ? 8 : 1) * (o.golden ? 4 : 1) * this.comboMult() * (this.rush > 0 ? 2 : 1);
    const coins = Econ.coins(S.stage) * R.coinMult * mult;
    if (coins) Game.addCoins(coins);
    S.stats.kills++;
    Level.add(o.boss ? 10 : o.golden ? 5 : 1);
    const cy = o.y - OBST_H[o.kind] * o.scale * 0.5;
    const n = o.boss ? 60 : 22;
    for (let i = 0; i < n; i++) {
      const p = this.particle(o.x + U.rand(-20, 20), cy + U.rand(-30, 30), U.rand(-340, 340), U.rand(-560, -80), U.pick(biome.debris), U.rand(0.8, 1.6), U.rand(4, 11) * this.cs, 1300, true, Math.random() < 0.6 ? 'chunk' : 'blob');
      if (p) p.spin = U.rand(-12, 12);
    }
    for (let i = 0; i < 8; i++) this.particle(o.x + U.rand(-25, 25), o.y - 4, U.rand(-80, 80), U.rand(-60, -10), 'rgba(255,255,255,0.5)', U.rand(0.5, 0.9), U.rand(10, 20) * this.cs, -30, false, 'smoke');
    FX.addRing(o.x, cy, (o.boss ? 220 : 80) * this.cs, o.golden ? '#ffe14d' : '#ffffff', o.boss ? 0.6 : 0.3, o.boss ? 10 : 5);
    this.hitStop = Math.max(this.hitStop, o.boss ? 0.16 : o.golden ? 0.07 : 0.025);
    if (o.boss || o.golden) this.punchZoom(o.boss ? 0.12 : 0.05, o.x, cy);
    if (coins) {
      this.text(o.x, cy - 30, '+' + U.fmt(coins), o.golden ? '#ffe14d' : '#ffd34d', (o.golden ? 26 : 18) * this.cs, o.golden);
      this.spawnFlyers(o.x, cy, o.boss ? 24 : o.golden ? 12 : 4, 'coin');
    }
    if (o.golden && coins) { this.showBanner('GOLDENES HINDERNIS!', '4× Münzen', '#ffd34d'); SFX.play('reveal', 2); }
    this.purr = Math.min(100, this.purr + (o.boss ? 10 : 0.6) * (Events.active('catnip') ? 3 : 1));
    if (o.treasure) this.openTreasure(o, cy);
    Run.onKill(this, o);
    Shades.onKill(this, o);
    SFX.play('kill');
    this.shake = Math.max(this.shake, o.boss ? 16 : 3);
    if (o.boss) this.bossWin(o);
    else if (S.farm) S.farmKills++;
    else S.kills++;
    Game.emit('stage');
  },

  bossWin(o) {
    if (Run.active) { Run.bossWin(this, o); return; }
    const oldBiome = biomeFor(S.stage);
    const bones = Econ.bones(S.stage);
    S.bones += bones;
    S.stats.bossKills++;
    S.stage++;
    S.kills = 0;
    S.maxStage = Math.max(S.maxStage, S.stage);
    const newBest = S.stage > S.best;
    S.best = Math.max(S.best, S.stage);
    this.bossState = 'none';
    this.bossObj = null;
    this.spawnFlyers(o.x, o.y - 80, Math.min(12, bones + 3), 'bone');
    const nb = biomeFor(S.stage);
    if (nb !== oldBiome) {
      Rooms.reset();
      if (nb.special) this.showBanner(`${nb.name.toUpperCase()}!`, `Sonderraum · Stufe ${S.stage} · ${nb.desc}`, nb.accent);
      else this.showBanner(`NEUES GEBIET`, `${nb.name} · Stufe ${S.stage}`, '#7ef9ff');
      this.whiteFlash = 1; FX.ambient = [];
    }
    else this.showBanner(`STUFE ${S.stage}`, `+${bones} 🦴${newBest ? ' · Neuer Rekord!' : ''}`, '#6ee7a0');
    for (let i = 0; i < 80; i++) this.particle(this.W / 2 + U.rand(-200, 200), -10, U.rand(-120, 120), U.rand(50, 300), `hsl(${U.randi(0, 360)},90%,65%)`, U.rand(1.5, 2.5), U.rand(4, 8), 200, false, 'confetti');
    SFX.play('victory');
    Game.emit('stageUp', { newBest });
  },

  bossFail() {
    if (Run.active) { Run.bossEscaped(this); return; }
    const b = this.bossObj;
    if (b) b.fleeing = true;
    this.bossState = 'none';
    this.bossObj = null;
    S.farm = true;
    S.farmKills = 0;
    this.showBanner('BOSS ENTKOMMEN!', 'Rüste auf und versuche es erneut', '#ffb347');
    SFX.play('fail');
    Game.emit('stage');
  },

  challengeBoss() {
    if (!S.farm) return;
    this.bossRequested = true;
    S.farm = false;
    S.kills = KILLS_PER_STAGE;
    Game.emit('stage');
  },

  // ---------------------------------------------------------------- Eingaben
  onPointer(e) {
    SFX.init();
    const r = this.cv.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    this.paw(x, y);
  },

  paw(x, y) {
    if (x !== undefined && Rooms.tap(this, x, y)) return;
    if (Vitals.koPending && Vitals.dazed > 0) { if (x !== undefined) this.text(x, y, 'Gelähmt!', '#ff8a9a', 14 * this.cs); return; }
    if (x !== undefined && Vitals.tryParry(this, x, y)) return;
    if (x !== undefined && this.balloon) {
      const bp = this.balloonPos();
      if (Math.hypot(x - bp.x, y - bp.y) < 42 * this.cs) { this.popBalloon(); return; }
    }
    let target = null;
    if (x !== undefined) {
      target = this.obs.find(o => !o.dead && !o.fleeing && Math.abs(x - o.x) < OBST_W[o.kind] * o.scale * 0.75 && y > o.y - OBST_H[o.kind] * o.scale - 20 && y < o.y + 15);
    }
    target = target || this.front();
    if (x === undefined && target) { x = target.x; y = target.y - OBST_H[target.kind] * target.scale * 0.5; }
    if (x !== undefined) {
      this.parts.push({ x, y, vx: 0, vy: -40, life: 0.5, max: 0.5, size: 26 * this.cs, emoji: '🐾', grav: 0 });
      FX.addRing(x, y, 34 * this.cs, '#ffd6f3', 0.22, 4);
    }
    S.stats.clicks++;
    this.purr = Math.min(100, this.purr + (Events.active('catnip') ? 3 : 1));
    SFX.play('paw');
    if (target) this.damage(target, R.clickDmg * (this.frenzy > 0 ? 3 : 1), true, false, 'paw');
  },

  // Restdauer einer laufenden Fähigkeit (Laser inkl. Aufladen, Fauchen, Schild)
  skillLeft(id) {
    if (id === 'laser') return this.laserCharge > 0 ? this.laserCharge + 3 : this.laser;
    if (id === 'roar') return this.roar;
    if (id === 'shield') return Vitals.shield;
    return 0;
  },
  cdMax: {},
  skillDur(id) { return id === 'laser' ? 3.42 : id === 'roar' ? 8 : id === 'shield' ? Vitals.shieldMax : 0; },

  useSkill(id) {
    const sk = SKILLS.find(s => s.id === id);
    if (sk && Shades.skillFrozen(id)) { SFX.play('error'); Game.emit('toast', { text: `❄️ <b>${sk.name}</b> ist eingefroren – noch ${Math.ceil(Shades.frozen['skill:' + id])} s`, cls: 'warn' }); return; }
    if (sk && Vitals.koPending && Vitals.dazed > 0) { SFX.play('error'); Game.emit('toast', { text: `💫 <b>Gelähmt</b> – noch ${Math.ceil(Vitals.dazed)} s`, cls: 'warn' }); return; }
    if (!sk || !skillOpen(sk) || S.skillsCd[id] > 0 || this.skillLeft(id) > 0) { SFX.play('error'); return; }
    S.skillsCd[id] = this.cdMax[id] = sk.cd * (id === 'shield' ? Run.shieldCdMul() : 1);
    S.stats.skills = (S.stats.skills || 0) + 1;
    if (id === 'shield') Vitals.raiseShield(this);
    if (id === 'laser') { this.laserCharge = 0.42; SFX.play('laser'); }
    if (id === 'rain') {
      const coins = Econ.coins(S.stage) * R.coinMult * 25;
      Game.addCoins(coins);
      this.showBanner('FISCHREGEN!', '+' + U.fmt(coins) + ' Münzen', '#5ab0ff');
      for (let i = 0; i < 30; i++) this.flyers.push({ x: U.rand(this.W * 0.2, this.W * 0.9), y: U.rand(-200, -10), vx: 0, vy: U.rand(100, 300), age: 0, burst: U.rand(0.5, 0.9), kind: 'coin', fish: true });
      for (let i = 0; i < 24; i++) {
        const p = this.particle(U.rand(this.W * 0.25, this.W * 0.95), U.rand(-260, -20), U.rand(-60, 60), U.rand(50, 250), U.pick(['#ffa62b', '#ff7f11', '#5ab0ff', '#ffd166']), U.rand(2, 2.8), 9 * this.cs, 900, true, 'fish');
        if (p) p.spin = U.rand(-7, 7);
      }
      for (let i = 0; i < 6; i++) FX.addRing(U.rand(this.W * 0.3, this.W * 0.9), this.groundY + 4, U.rand(40, 90), '#9fdcff', U.rand(0.5, 0.9), 3);
      SFX.play('rain');
      Vitals.heal(this, 0.2);
    }
    if (id === 'roar') {
      this.roar = 8; this.shake = 14; this.punchZoom(0.08, this.catX, this.groundY - 40 * this.cs);
      const mx = this.catX + 22 * this.cs, my = this.groundY - 36 * this.cs;
      FX.addRing(mx, my, 300, '#ff5d73', 0.5, 12); FX.addRing(mx, my, 520, '#ffb3c1', 0.75, 6); FX.addRing(mx, my, 140, '#ffffff', 0.3, 8);
      for (const o of this.obs) if (!o.dead && !o.fleeing && !o.boss) { o.x += 70 * this.cs; o.squash = 0.2; }
      Rooms.blowAway(this);
      SFX.play('roar'); this.showBanner('FAUCH!', '2× Feuerrate · +50% Krit', '#ff5d73'); }
    Game.emit('skill');
  },

  // ---------------------------------------------------------------- Effekte
  particle(x, y, vx, vy, color, life, size, grav = 0, floor = false, shape) {
    if (this.parts.length > Perf.cfg().parts) return null;
    const p = { x, y, vx, vy, color, life, max: life, size, grav, floor, shape, rot: Math.random() * 6 };
    this.parts.push(p);
    return p;
  },
  nightAmt(biome) {
    if ((biome.dark || ['Lavagrund', 'Neon-City', 'Sternenmeer'].includes(biome.name))) return 0;
    const p = (this.dayT / 240) % 1;
    let n = U.clamp((-Math.cos(p * Math.PI * 2) - 0.1) / 0.7, 0, 1);
    if (Events.active('meteor')) n = Math.max(n, 0.85);
    return n;
  },

  openTreasure(o, cy) {
    S.stats.treasures = (S.stats.treasures || 0) + 1;
    SFX.play('treasure');
    FX.addRing(o.x, cy, 160 * this.cs, '#ffd34d', 0.5, 10);
    for (let i = 0; i < 30; i++) this.particle(o.x + U.rand(-30, 30), cy + U.rand(-20, 20), U.rand(-200, 200), U.rand(-400, -100), '#ffe680', U.rand(0.8, 1.4), U.rand(6, 11) * this.cs, 500, false, 'star');
    const free = S.grid.indexOf(null);
    if (free >= 0) {
      const w = { t: U.pick(WEAPON_IDS), r: Math.min(MAX_TIER, 2 + S.up.box) };
      S.grid[free] = w;
      Game.discover(w);
      recalc();
      Game.emit('weapons'); Game.emit('newItem', free);
      this.showBanner('SCHATZTRUHE!', `${WEAPONS[w.t].icon} ${WEAPONS[w.t].name} ${U.roman(w.r)} im Rucksack`, '#ffd34d');
    } else {
      const c = Econ.coins(S.stage) * R.coinMult * 20;
      Game.addCoins(c);
      this.spawnFlyers(o.x, cy, 15, 'coin');
      this.showBanner('SCHATZTRUHE!', `Rucksack voll · +${U.fmt(c)} Münzen`, '#ffd34d');
    }
    S.bones += 2;
    this.spawnFlyers(o.x, cy, 2, 'bone');
  },

  drawCracks(ctx, o) {
    const f = o.hp / o.maxHp;
    if (f > 0.66 || o.dying) return;
    const n = f < 0.33 ? 5 : 2, H = OBST_H[o.kind], Wd = OBST_W[o.kind];
    let seed = o.id * 7919 + 13;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    ctx.save();
    ctx.translate(o.x + (o.shakeX || 0), o.y);
    ctx.scale(o.scale, o.scale);
    ctx.strokeStyle = 'rgba(25,12,20,0.6)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let x = (rnd() - 0.5) * Wd * 0.5, y = -H * (0.25 + rnd() * 0.55);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 14; y += (rnd() - 0.3) * 12; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  },

  comboMult() { return 1 + Math.min(0.5, Math.max(0, this.combo - 1) * 0.02); },

  // Augen aller Katzen (Hauptkatze + Geisterkatzen) aus dem letzten Bild
  allEyes() { return this.eyes && this.eyes.length ? this.eyes : this.eyePos(); },
  eyePos() {
    if (this.mainEyes) return this.mainEyes;
    const cs = this.cs, bob = Math.sin(this.t * 7) * 1.5, L = this.lookVec;
    const hx = this.catX + 10 * cs, hy = this.groundY + (-42 + bob) * cs;
    return [-6, 7].map(ex => ({ x: hx + (ex + L.x * 1.6) * cs, y: hy + (-1 + L.y * 1.8) * cs }));
  },

  breakShield(o) {
    o.shield = 0;
    const cy = o.y - OBST_H[o.kind] * o.scale * 0.55, r = OBST_H[o.kind] * o.scale * 0.75;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const p = this.particle(o.x + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a) * U.rand(150, 450), Math.sin(a) * U.rand(150, 450) - 150, U.pick(['#bfe3ff', '#5ab0ff', '#ffffff']), U.rand(0.6, 1.1), U.rand(5, 10) * this.cs, 900, true, 'chunk');
      if (p) p.spin = U.rand(-15, 15);
    }
    FX.addRing(o.x, cy, r * 2.2, '#bfe3ff', 0.45, 10);
    this.hitStop = 0.1; this.shake = 12;
    this.punchZoom(0.06, o.x, cy);
    this.text(o.x, cy - r - 10, 'SCHILD ZERSTÖRT!', '#9fd8ff', 22 * this.cs, true);
    SFX.play('shieldBreak');
  },

  // ---------------------------------------------------------------- Glücksballon
  updateBalloon(dt) {
    if (!this.balloon) {
      this.eventT -= dt;
      if (this.eventT <= 0) {
        this.eventT = U.rand(90, 160);
        this.balloon = { x: -60, y: this.H * U.rand(0.2, 0.32), t: 0, type: U.pick(['coins', 'coins', 'bones', 'rush', 'purr']) };
        SFX.play('event');
      }
      return;
    }
    const b = this.balloon;
    b.t += dt; b.x += 70 * dt;
    if (Math.random() < dt * 8) {
      const p = this.balloonPos();
      this.particle(p.x + U.rand(-18, 18), p.y + U.rand(-22, 22), 0, 25, '#ffe680', 0.8, 7 * this.cs, 0, false, 'star');
    }
    if (b.x > this.W + 80) this.balloon = null;
  },
  balloonPos() { const b = this.balloon; return { x: b.x, y: b.y + Math.sin(b.t * 2) * 10 }; },
  popBalloon() {
    const b = this.balloon, p = this.balloonPos();
    this.balloon = null;
    S.stats.balloons = (S.stats.balloons || 0) + 1;
    SFX.play('pop');
    FX.addRing(p.x, p.y, 120 * this.cs, '#ffe14d', 0.5, 8);
    this.hitStop = 0.06;
    for (let i = 0; i < 50; i++) this.particle(p.x, p.y, U.rand(-300, 300), U.rand(-400, 100), `hsl(${U.randi(0, 360)},90%,65%)`, U.rand(1, 2), U.rand(4, 8), 500, false, 'confetti');
    if (b.type === 'coins') {
      const c = Econ.coins(S.stage) * R.coinMult * 60;
      Game.addCoins(c);
      this.spawnFlyers(p.x, p.y, 25, 'coin');
      this.showBanner('GLÜCKSBALLON!', '+' + U.fmt(c) + ' Münzen', '#ffd34d');
    } else if (b.type === 'bones') {
      const n = 3 + Math.floor(S.best / 10);
      S.bones += n;
      this.spawnFlyers(p.x, p.y, Math.min(12, n), 'bone');
      this.showBanner('GLÜCKSBALLON!', `+${n} 🦴 Fischgräten`, '#ffd34d');
    } else if (b.type === 'rush') {
      this.rush = 30;
      this.showBanner('GOLDRAUSCH!', '30 s doppelte Münzen', '#ffd34d');
    } else {
      this.purr = 100;
    }
    SFX.play('meow', 1.3);
  },
  drawBalloon(ctx, glowOp) {
    if (!this.balloon) return;
    const cs = this.cs, p = this.balloonPos(), t = this.t;
    const x = p.x, y = p.y;
    ctx.globalCompositeOperation = glowOp;
    FX.drawGlow(ctx, x, y, 55 * cs, '#ffd34d', 0.45 + Math.sin(t * 5) * 0.1);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y + 27 * cs); ctx.quadraticCurveTo(x + Math.sin(t * 3) * 8, y + 45 * cs, x, y + 58 * cs); ctx.stroke();
    Draw.rrect(ctx, x - 10 * cs, y + 58 * cs, 20 * cs, 15 * cs, 3, '#ff5d73');
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(x - 2 * cs, y + 58 * cs, 4 * cs, 15 * cs); ctx.fillRect(x - 10 * cs, y + 63 * cs, 20 * cs, 4 * cs);
    Draw.tri(ctx, [x - 19 * cs, y - 10 * cs], [x - 17 * cs, y - 34 * cs], [x - 5 * cs, y - 23 * cs], '#f5b81c');
    Draw.tri(ctx, [x + 19 * cs, y - 10 * cs], [x + 17 * cs, y - 34 * cs], [x + 5 * cs, y - 23 * cs], '#f5b81c');
    Draw.ellipse(ctx, x, y, 23 * cs, 27 * cs, '#ffc928');
    Draw.ellipse(ctx, x - 8 * cs, y - 10 * cs, 6 * cs, 9 * cs, 'rgba(255,255,255,0.45)');
    ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x - 8 * cs, y + 1 * cs, 4 * cs, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 8 * cs, y + 1 * cs, 4 * cs, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 2.5 * cs, y + 8 * cs, 2.5 * cs, 0, Math.PI); ctx.arc(x + 2.5 * cs, y + 8 * cs, 2.5 * cs, 0, Math.PI); ctx.stroke();
    ctx.font = `800 ${11 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.4;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.8)'; ctx.strokeText('KLICK MICH!', x, y - 44 * cs);
    ctx.fillStyle = '#fff6c2'; ctx.fillText('KLICK MICH!', x, y - 44 * cs);
    ctx.globalAlpha = 1;
  },

  drawShield(ctx, o) {
    const cy = o.y - OBST_H[o.kind] * o.scale * 0.55, r = OBST_H[o.kind] * o.scale * 0.75, t = this.t;
    const f = o.shield / o.shieldMax;
    ctx.save();
    ctx.globalAlpha = 0.14 + 0.14 * f;
    Draw.circle(ctx, o.x, cy, r, '#5ab0ff');
    ctx.globalAlpha = 0.5 + 0.4 * f;
    ctx.strokeStyle = '#bfe3ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(o.x, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 4);
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + t * 0.4, hx = o.x + Math.cos(a) * r * 0.55, hy = cy + Math.sin(a) * r * 0.55, hr = r * 0.26;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) ctx.lineTo(hx + Math.cos(k * Math.PI / 3) * hr, hy + Math.sin(k * Math.PI / 3) * hr);
      ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.4;
    ctx.font = `900 ${15 * this.cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,20,40,0.85)';
    ctx.strokeText('🐾 KLICKEN!', o.x, cy + r + 18 * this.cs);
    ctx.fillStyle = '#bfe3ff'; ctx.fillText('🐾 KLICKEN!', o.x, cy + r + 18 * this.cs);
    ctx.restore();
  },

  punchZoom(a, x, y) { if (a >= this.zoom.a) this.zoom = { a, x, y }; },
  text(x, y, text, color, size, big) {
    if (this.txt.length > 60) this.txt.shift();
    this.txt.push({ x, y, vx: U.rand(-45, 45), vy: big ? -110 : -80, text, color, size, life: big ? 1.1 : 0.8, max: big ? 1.1 : 0.8, big });
  },
  spawnFlyers(x, y, n, kind) {
    for (let i = 0; i < n; i++) {
      if (this.flyers.length > 150) break;
      this.flyers.push({ x, y, vx: U.rand(-220, 220), vy: U.rand(-480, -180), age: 0, burst: U.rand(0.35, 0.6), kind });
    }
  },

  // ---------------------------------------------------------------- Zeichnen
  render() {
    const ctx = this.ctx, W = this.W, H = this.H, t = this.t, cs = this.cs;
    const biome = biomeFor(S.stage);
    // auf hellem Himmel wirkt additives Licht überbelichtet -> normal mischen
    this.night = this.nightAmt(biome);
    const dark = (biome.dark || ['Lavagrund', 'Neon-City', 'Sternenmeer'].includes(biome.name)) || this.night > 0.5 || Events.active('storm');
    const glowOp = dark ? 'lighter' : 'source-over', glowA = dark ? 1 : 0.55;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save();
    // Kamera: Zoom-Impuls + Wackeln
    if (this.zoom.a > 0.002 && S.optShake) {
      const z = 1 + this.zoom.a;
      ctx.translate(this.zoom.x, this.zoom.y); ctx.scale(z, z); ctx.translate(-this.zoom.x, -this.zoom.y);
    }
    if (this.bossIntro > 0 && this.bossObj) {
      const z = 1 + Math.sin(Math.min(1, (1.8 - this.bossIntro) / 0.5) * Math.PI / 2) * 0.04 * Math.min(1, this.bossIntro * 2);
      ctx.translate(this.bossObj.x, this.groundY); ctx.scale(z, z); ctx.translate(-this.bossObj.x, -this.groundY);
    }
    if (this.shake > 0.3 && S.optShake) ctx.translate(U.rand(-this.shake, this.shake), U.rand(-this.shake, this.shake));
    this.drawBackground(ctx, biome);
    FX.lightRays(ctx, this, biome, (1 - this.night) * (Events.active('storm') ? 0 : 1));
    FX.drawAmbient(ctx, false);

    // Hindernisse (von hinten nach vorne)
    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i];
      Draw.ellipse(ctx, o.x, o.y + 3, OBST_W[o.kind] * o.scale * 0.55, 7 * o.scale, 'rgba(0,0,0,0.22)');
      if (o.golden || o.boss) {
        ctx.globalCompositeOperation = 'lighter';
        FX.drawGlow(ctx, o.x, o.y - OBST_H[o.kind] * o.scale * 0.5, OBST_H[o.kind] * o.scale * 0.95, o.golden ? '#ffcf3a' : '#ff2d55', (o.golden ? 0.45 : 0.25) + Math.sin(t * 6) * 0.1);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
      Draw.obstacle(ctx, o, biome, t);
      if (o.boss && o.shield > 0 && !o.fleeing) this.drawShield(ctx, o);
      if (!o.fleeing && o.hp < o.maxHp) this.drawHpBar(ctx, o);
      if (o.boss && !o.fleeing) {
        // Name erst einblenden, wenn das Boss-Banner (gleicher Text) verschwindet
        const b = this.banner;
        ctx.globalAlpha = b ? U.clamp((b.t - 1.8) / 0.4, 0, 1) : 1;
        ctx.font = `800 ${12 * cs}px "Segoe UI", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,30,0.85)';
        const ny = o.y - OBST_H[o.kind] * o.scale - 56 * cs;
        ctx.strokeText(BOSS_NAMES[o.kind], o.x, ny); ctx.fillStyle = '#ffd6dc'; ctx.fillText(BOSS_NAMES[o.kind], o.x, ny);
        ctx.globalAlpha = 1;
      }
    }

    const target = this.front();
    const ty0 = target ? target.y - OBST_H[target.kind] * target.scale * 0.5 : 0;
    const le = this.laserEnd;
    const lookAt = (hx, hy) => {
      if (le) { const dx = le.x - hx, dy = le.y - hy, d = Math.hypot(dx, dy) || 1; return { x: dx / d, y: dy / d }; }
      if (!target) return { x: Math.sin(t * 0.7), y: Math.cos(t * 0.5) * 0.4 };
      const dx = target.x - hx, dy = ty0 - hy, d = Math.hypot(dx, dy) || 1;
      return { x: dx / d, y: dy / d };
    };
    // Kamera-Umkehrung: Augenpositionen aus Gerätepixeln zurück in Weltkoordinaten
    const camInv = ctx.getTransform().invertSelf();
    const toWorld = (pts, main) => pts.map(pt => { const w = camInv.transformPoint(pt); return { x: w.x, y: w.y, main }; });

    // Begleiter (Sitzstange vor der Eule zeichnen, damit sie darauf sitzt)
    // geröstet (Vernichtungsschlag): Katzen und Begleiter auf eigene Ebene, die danach geschwärzt wird
    const cc = Vitals.charStart(ctx, this);
    if (S.pets.owl > 0) Draw.rrect(cc, this.catX - 66 * cs, this.groundY - 20 * cs, 12 * cs, 20 * cs, 2 * cs, '#7a4a2a');
    const petMz = [];
    for (const id of ['owl', 'fish', 'mouse']) {
      if (!(S.pets[id] > 0)) continue;
      // eingefroren: erstarrt mitten in der Bewegung und wird zu blauem Eis (wie die Geisterkatzen)
      const fz = Shades.isFrozen('pet:' + id), ft = fz ? Shades.since('pet:' + id) : t;
      const p = this.petPos(id, ft), pc = fz ? Shades.iceStart(cc, this) : cc;
      Draw.pet(pc, id, p.x, p.y, ft, cs, { muzzleOut: id === 'mouse' ? petMz : null, flash: id === 'mouse' ? this.droneFlash : 0 });
      if (fz) Shades.iceEnd(cc, pc, Shades.iceAmt('pet:' + id));
    }
    this.petMuzzle = petMz.length ? toWorld(petMz)[0] : null;

    // Katze + Geisterkatzen mit den schwebenden Waffen
    const cat = CAT_BY_ID[S.activeCat] || CATS[0];
    if (this.frenzy > 0 || this.roar > 0 || this.owlBuff > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const col = this.frenzy > 0 ? '#ff7ad9' : this.roar > 0 ? '#ff5d73' : '#fde68a';
      FX.drawGlow(ctx, this.catX + 5, this.groundY - 32 * cs, (70 + Math.sin(t * 12) * 8) * cs, col, 0.5);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    Draw.ellipse(ctx, this.catX + 3, this.groundY + 2, 30 * cs, 6 * cs, 'rgba(0,0,0,0.22)');
    const look = lookAt(this.catX + 10 * cs, this.groundY - 42 * cs);
    this.lookVec = look;
    const laserEyes = this.laser > 0 ? 1 : this.laserCharge > 0 ? 1 - this.laserCharge / 0.42 : 0;
    const steady = laserEyes > 0; // beim Lasern keine Rückstoß-Stauchung, sonst zittert der Strahl-Ursprung
    const fury = this.fury, roar = this.roar > 7;
    const mainEyes = [], lampOut = [], mz0 = [];
    // Mieze-Lampe an der Hüfte: leuchtet nachts und in der Leere
    const lampLit = Rooms.kind() === 'void' ? 1 : U.clamp((this.night - 0.25) / 0.4, 0, 1);
    Draw.cat(cc, this.catX, this.groundY, cs, cat, t, { ear: Anim.ear('main'), weapon: S.slots[0], recoil: this.recoil[0], squash: steady ? 0 : this.recoil[0] * 0.07, look, laserEyes, roar, fury, eyesOut: mainEyes, lamp: lampLit, lampOut, muzzleOut: mz0 });
    this.mainEyes = toWorld(mainEyes, true);
    this.muzzles[0] = mz0.length ? toWorld(mz0)[0] : null;
    this.lampPt = lampOut.length ? toWorld(lampOut)[0] : null;
    this.lampLit = lampLit;
    const ghostEyes = [];
    for (let i = 1; i < 4; i++) {
      const w = S.slots[i];
      if (!w) { this.muzzles[i] = null; continue; }
      const p = this.slotPos(i), col = tierColor(w.r, t), gm = [];
      if (setBonus(w.t).level) {
        // Set-Verbindung: gestrichelte Energielinie von der Katze zur Geisterkatze
        ctx.strokeStyle = col; ctx.globalAlpha = 0.45 + Math.sin(t * 6 + i) * 0.3;
        ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.lineDashOffset = -t * 30;
        ctx.beginPath(); ctx.moveTo(this.catX + 10 * cs, this.groundY - 45 * cs); ctx.lineTo(p.x - 14 * p.s, p.y - 2 * p.s); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      const fz = Shades.slotFrozen(i);
      ctx.globalCompositeOperation = 'lighter';
      FX.drawGlow(ctx, p.x - 6 * p.s, p.y - 6 * p.s, 34 * p.s, fz ? '#7ef9ff' : col, fz ? 0.35 : 0.3 + this.recoil[i] * 0.3);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      // eingefroren: die Figur selbst wird zu blauem Eis und erstarrt mitten in der Bewegung
      const gc = fz ? Shades.iceStart(cc, this) : cc;
      // Auftritt aus dem Geisterwirbel / Purzelbaum (anim.js), gedreht um die Körpermitte
      const an = fz ? null : Anim.ghost(i), gx = p.x - 13 * p.s, gy = p.y - 6 * p.s;
      if (an) { gc.save(); gc.translate(gx, gy + an.dy * p.s); gc.rotate(an.rot); gc.scale(an.s, an.s); gc.translate(-gx, -gy); gc.globalAlpha *= an.alpha; }
      Draw.ghostCat(gc, p.x, p.y, p.s, fz ? i * 0.7 : t, {
        ear: fz ? null : Anim.ear('ghost' + i), weapon: w, recoil: fz ? 0 : this.recoil[i], bodyRecoil: fz || steady ? 0 : this.recoil[i], phase: i * 2.1, dpr: this.dpr, eye: fz ? '#e6fbff' : col === '#ffffff' ? '#7ef9ff' : col,
        look: fz ? { x: 0, y: 0 } : lookAt(p.x - 12 * p.s, p.y - 18 * p.s), laserEyes: fz ? 0 : laserEyes, fury: fz ? 0 : fury, roar: fz ? false : roar, eyesOut: fz ? [] : ghostEyes,
        muzzleOut: gm,
      });
      if (an) gc.restore();
      if (fz) Shades.iceEnd(cc, gc, Shades.iceAmt('slot:' + i));
      this.muzzles[i] = gm.length ? toWorld(gm)[0] : null;
    }
    Anim.drawLeaving(cc, this);
    Vitals.charEnd(ctx, cc);
    Shades.drawWorld(ctx, this);
    this.eyes = this.mainEyes.concat(toWorld(ghostEyes, false));
    Vitals.draw(ctx, this);

    // Nacht-Tönung (über der Szene, unter allem Leuchtenden)
    if (this.night > 0.01) {
      // Multiplizieren statt Überdecken: Farben werden blau-dunkel statt grau
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = this.night * 0.8; ctx.fillStyle = '#3b3f8f';
      ctx.fillRect(-60, -60, W + 120, H + 120);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (!biome.special && !Events.active('storm')) this.drawSkyLights(ctx, biome, this.night);
    }
    // warmer Lichtschein der Hüftlampe (in der Leere zeichnet Rooms ihn über die Dunkelheit)
    if (this.lampLit > 0.01 && this.lampPt && Rooms.kind() !== 'void') {
      const lp = this.lampPt, k = this.lampLit, fl = 1 + Math.sin(t * 7.3) * 0.03 + Math.sin(t * 13.1) * 0.02;
      ctx.globalCompositeOperation = 'lighter';
      FX.drawGlow(ctx, lp.x + 10 * cs, lp.y - 8 * cs, 95 * cs * fl, '#ffcf7a', 0.16 * k);
      FX.drawGlow(ctx, lp.x, lp.y, 32 * cs * fl, '#ffe2a8', 0.3 * k);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }

    // Augenlaser: Strahlen direkt aus den Pupillen aller Katzen, laufen am Ziel
    // zusammen (nach den Katzen gezeichnet, damit der Kopf sie nicht verdeckt)
    const eyes = this.eyes;
    if (this.laserCharge > 0) {
      const k = 1 - this.laserCharge / 0.42;
      ctx.globalCompositeOperation = glowOp;
      for (const e of eyes) {
        const m = e.main ? 1 : 0.6;
        FX.drawGlow(ctx, e.x, e.y, (8 + k * 22) * cs * m, '#ff3355', 0.6 + k * 0.4);
        FX.drawGlow(ctx, e.x, e.y, 5 * cs * k * m, '#ffffff', k);
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    if (this.laser > 0 && le) {
      const tx = le.x, ty = le.y;
      const fade = Math.min(1, this.laser * 3);
      // langsames, ruhiges Pulsieren statt schneller Sinus-Wackler (die bei 60 fps flackern)
      const pulse = 1 + Math.sin(t * 9) * 0.08;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = glowOp;
      for (const e of eyes) {
        const m = e.main ? 1 : 0.55;
        ctx.globalAlpha = (dark ? 0.45 : 0.35) * fade * m; ctx.strokeStyle = '#ff1e46'; ctx.lineWidth = 16 * pulse * cs * m;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.globalAlpha = 0.8 * fade; ctx.strokeStyle = '#ff7a95'; ctx.lineWidth = 6 * cs * m;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.globalAlpha = fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * cs * m;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(tx, ty); ctx.stroke();
        // Mündungsfeuer direkt im Auge
        FX.drawGlow(ctx, e.x, e.y, 8 * pulse * cs * m, '#ff3355', fade);
        FX.drawGlow(ctx, e.x, e.y, 3.5 * cs * m, '#ffffff', fade);
      }
      FX.drawGlow(ctx, tx, ty, 55 * pulse * cs, '#ff3355', 0.9 * fade);
      FX.drawGlow(ctx, tx, ty, 22 * cs, '#ffffff', 0.8 * fade);
      ctx.restore();
    }

    // Projektile: erst Leuchten, dann Kerne
    ctx.globalCompositeOperation = glowOp;
    for (const b of this.bul) {
      const yOff = b.arc ? -Math.abs(Math.sin(b.phase)) * 26 * cs : 0;
      if (b.trail && b.trail.length > 2) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = b.type === 'rocket' ? '#ff9a3c' : b.color;
        ctx.lineWidth = b.size * (b.type === 'rocket' ? 1.1 : 0.8); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.trail[0], b.trail[1]);
        for (let i = 2; i < b.trail.length; i += 2) ctx.lineTo(b.trail[i], b.trail[i + 1]);
        ctx.stroke();
      }
      FX.drawGlow(ctx, b.x, b.y + yOff, b.size * (b.type === 'rocket' ? 4.5 : 2.6), b.type === 'rocket' ? '#ff8a2b' : b.color, 0.55 * glowA);
      // Geschwindigkeits-Schweif: reicht anfangs genau bis zur Mündung zurück,
      // dadurch kommt jede Kugel sichtbar aus dem Lauf statt davor aufzutauchen
      if (!b.arc && !b.sprite && b.ox !== undefined && b.type !== 'rocket') {
        const sp = Math.hypot(b.vx, b.vy) || 1, len = Math.min(Math.hypot(b.x - b.ox, b.y - b.oy), sp * 0.04 + b.size * 2);
        if (len > 1) {
          const tx = b.x - b.vx / sp * len, ty = b.y - b.vy / sp * len;
          const g = ctx.createLinearGradient(tx, ty, b.x, b.y);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, b.color);
          ctx.globalAlpha = 0.85; ctx.strokeStyle = g; ctx.lineCap = 'round'; ctx.lineWidth = b.size * 1.5;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (const b of this.bul) {
      const yOff = b.arc ? -Math.abs(Math.sin(b.phase)) * 26 * cs : 0;
      if (b.type === 'rocket') {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
        Draw.ellipse(ctx, 0, 0, b.size * 1.6, b.size * 0.8, '#ffa62b');
        Draw.tri(ctx, [-b.size * 1.4, 0], [-b.size * 2.4, -b.size], [-b.size * 2.4, b.size], '#ff7f11');
        Draw.circle(ctx, b.size * 0.8, -b.size * 0.15, b.size * 0.2, '#222');
        ctx.restore();
      } else if (b.sprite) {
        Talents.drawBullet(ctx, b, t, yOff);
      } else if (b.type === 'yarn') {
        ctx.save(); ctx.translate(b.x, b.y + yOff); ctx.rotate(b.phase * 1.5);
        Draw.circle(ctx, 0, 0, b.size, b.color);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(0, 0, b.size * 0.6, 0.3, 2.6); ctx.moveTo(-b.size * 0.8, 0); ctx.lineTo(b.size * 0.8, 0); ctx.stroke();
        ctx.restore();
      } else {
        Draw.circle(ctx, b.x, b.y + yOff, b.size, b.color);
        Draw.circle(ctx, b.x, b.y + yOff, b.size * 0.55, '#ffffff');
      }
    }

    FX.drawRings(ctx);

    // Partikel
    for (const p of this.parts) {
      const a = U.clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      switch (p.shape) {
        case 'confetti':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + this.t * 8);
          ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore(); break;
        case 'chunk': case 'shell':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + (p.shape === 'shell' ? this.t * 20 : 0));
          ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillStyle = p.color;
          if (p.shape === 'shell') ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
          else { ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-p.size / 2, p.size * 0.1, p.size, p.size * 0.15); }
          ctx.restore(); break;
        case 'blob':
          ctx.globalAlpha = Math.min(1, a * 2);
          Draw.circle(ctx, p.x, p.y, p.size * 0.6, p.color); break;
        case 'fish':
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.globalAlpha = Math.min(1, a * 3);
          Draw.ellipse(ctx, 0, 0, p.size, p.size * 0.55, p.color);
          Draw.tri(ctx, [-p.size * 0.8, 0], [-p.size * 1.5, -p.size * 0.55], [-p.size * 1.5, p.size * 0.55], p.color);
          Draw.circle(ctx, p.size * 0.5, -p.size * 0.12, p.size * 0.14, '#222');
          ctx.restore(); break;
        case 'smoke':
          ctx.globalAlpha = a * 0.35;
          Draw.circle(ctx, p.x, p.y, p.size * (1.6 - a * 0.6), p.color); break;
        case 'flash': case 'spark': case 'star': case 'mflash': case 'streak': break; // additiv, siehe unten
        default:
          if (p.emoji) {
            ctx.font = `${p.size}px "Segoe UI Emoji", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(p.emoji, p.x, p.y);
          } else { ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      }
    }
    ctx.globalCompositeOperation = glowOp;
    for (const p of this.parts) {
      const a = U.clamp(p.life / p.max, 0, 1);
      if (p.shape === 'flash') {
        FX.drawGlow(ctx, p.x, p.y, p.size * (1.4 - a * 0.4), p.color, a * glowA);
        FX.drawGlow(ctx, p.x, p.y, p.size * 0.5, '#ffffff', a);
      } else if (p.shape === 'mflash') {
        // Flammenzunge nach vorn mit seitlichen Zacken und weißem Kern
        const L = p.size * (1.6 + (1 - a) * 0.8), Wd = p.size * 0.55 * a;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.moveTo(-p.size * 0.2, -Wd); ctx.lineTo(L, 0); ctx.lineTo(-p.size * 0.2, Wd); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p.size * 0.2, -Wd * 1.6); ctx.lineTo(L * 0.55, -Wd * 2.2); ctx.lineTo(p.size * 0.5, 0); ctx.lineTo(L * 0.55, Wd * 2.2); ctx.lineTo(p.size * 0.2, Wd * 1.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -Wd * 0.45); ctx.lineTo(L * 0.6, 0); ctx.lineTo(0, Wd * 0.45); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (p.shape === 'streak') {
        // Funke als kurzer Strich entlang der Flugrichtung
        ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
      } else if (p.shape === 'spark') {
        FX.drawGlow(ctx, p.x, p.y, p.size * (dark ? 2.2 : 1.4), p.color, a);
      } else if (p.shape === 'star') {
        const s = p.size * Math.sin(a * Math.PI);
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * 0.25, p.y - s * 0.25); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x + s * 0.25, p.y + s * 0.25);
        ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * 0.25, p.y + s * 0.25); ctx.lineTo(p.x - s, p.y); ctx.lineTo(p.x - s * 0.25, p.y - s * 0.25);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    Vitals.drawBooms(ctx, this); // Explosionen über Rauch und Trümmern
    Events.draw(ctx, this);
    Talents.draw(ctx, this);
    FX.drawAmbient(ctx, true);
    FX.foreground(ctx, this, biome);
    this.drawBalloon(ctx, glowOp);

    // Fliegende Münzen/Gräten
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'lighter';
    for (const f of this.flyers) if (f.kind === 'coin') FX.drawGlow(ctx, f.x, f.y, 16 * cs, '#ffb800', 0.35);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    for (const f of this.flyers) {
      if (f.kind === 'coin') {
        const sx = Math.abs(Math.cos(this.t * 10 + f.vx)) * 7 * cs + 1;
        Draw.ellipse(ctx, f.x, f.y, sx, 7 * cs, '#e8a317');
        Draw.ellipse(ctx, f.x, f.y, sx * 0.8, 6 * cs, '#ffcc33');
        Draw.ellipse(ctx, f.x, f.y, sx * 0.45, 3.6 * cs, '#fff1a8');
      } else {
        ctx.font = `${18 * cs}px "Segoe UI Emoji", sans-serif`;
        ctx.fillText('🦴', f.x, f.y);
      }
    }

    // Schadenszahlen
    for (const tx of this.txt) {
      const a = U.clamp(tx.life / tx.max * 1.6, 0, 1);
      const pop = 1 + Math.max(0, (tx.life - tx.max + 0.15)) * (tx.big ? 4 : 2.5);
      ctx.globalAlpha = a;
      ctx.font = `900 ${tx.size * pop}px "Segoe UI", system-ui, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,20,40,0.85)';
      ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Bildschirm-Effekte
    if (this.frenzy > 0 || this.roar > 0) FX.speedLines(ctx, W, H, t, this.frenzy > 0 ? '#ffe3f6' : '#ffd0d6');
    FX.vignette(ctx, W, H, dark ? 0.55 : 0.32);
    // wenig Leben (Streifzug oder Bosskampf): roter Rand pulsiert im immer schnelleren Herzschlag
    const hpF = Vitals.frac();
    if (hpF < 0.3 && (Run.active || this.bossState === 'active') && !(Vitals.koPending && Vitals.dazed > 0)) {
      const beat = Math.pow(Math.max(0, Math.sin(t * (5 + (0.3 - hpF) * 18))), 6);
      const a = (0.22 + (0.3 - hpF) * 1.3) * (0.55 + beat * 0.45);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
      g.addColorStop(0, 'rgba(255,20,60,0)'); g.addColorStop(1, `rgba(255,20,60,${a.toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    Rooms.drawScreen(ctx, this);
    Events.drawScreen(ctx, this);
    if (this.frenzy > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, 'rgba(255,122,217,0)');
      g.addColorStop(1, `rgba(255,122,217,${0.25 + Math.sin(t * 10) * 0.08})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (this.rush > 0) {
      ctx.globalAlpha = 0.18 + Math.sin(t * 6) * 0.06;
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 10; ctx.strokeRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.bossState === 'active') {
      ctx.globalAlpha = 0.12 + Math.sin(t * 3) * 0.04;
      ctx.fillStyle = '#ff1e46'; ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4);
      ctx.globalAlpha = 1;
    }
    if (this.bossIntro > 0) {
      const e = Math.min(1, (1.8 - this.bossIntro) / 0.25, this.bossIntro / 0.35);
      const bh = H * 0.09 * e;
      ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    }
    if (this.whiteFlash > 0) { ctx.globalAlpha = Math.min(S.optFlash ? 1 : 0.22, this.whiteFlash); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    this.drawOverlay(ctx, biome);
  },

  // Sterne und leuchtender Mond. Wird nach der Nacht-Tönung erneut gezeichnet,
  // damit der Mond wirklich leuchtet statt mit abgedunkelt zu werden.
  drawSkyLights(ctx, biome, a, moonA = 1) {
    const W = this.W, gy = this.groundY, t = this.t;
    const lava = biome.name === 'Lavagrund', top = gy - 150 * this.cs;
    for (const s of this.stars) {
      const y = s.y * gy;
      if (y > top) continue;
      ctx.globalAlpha = a * (0.45 + Math.sin(t * 2 + s.p) * 0.4);
      Draw.circle(ctx, ((s.x * W - this.scroll * 0.05) % W + W) % W, y, s.s, lava ? '#ffb38a' : '#fff');
    }
    if (moonA > 0.02) {
      const mx = W * (lava ? 0.82 : 0.18), my = gy * 0.2, r = 26;
      const col = lava ? '#ff7a4a' : '#f4f2ff', glow = lava ? '255,110,60' : '210,220,255';
      const mg = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 3.4);
      mg.addColorStop(0, `rgba(${glow},0.5)`); mg.addColorStop(1, `rgba(${glow},0)`);
      ctx.globalAlpha = a * moonA; ctx.fillStyle = mg; ctx.fillRect(mx - r * 3.4, my - r * 3.4, r * 6.8, r * 6.8);
      Draw.circle(ctx, mx, my, r, col);
      ctx.globalAlpha = a * moonA * 0.35;
      Draw.circle(ctx, mx + 8, my - 6, 6, lava ? '#b8402a' : '#b9bad8'); Draw.circle(ctx, mx - 9, my + 7, 4, lava ? '#b8402a' : '#b9bad8'); Draw.circle(ctx, mx - 3, my - 11, 3, lava ? '#b8402a' : '#b9bad8');
    }
    ctx.globalAlpha = 1;
  },

  drawBackground(ctx, biome) {
    if (biome.special) { Rooms.drawBg(ctx, this, biome); return; }
    const W = this.W, H = this.H, gy = this.groundY, t = this.t;
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, biome.sky[0]); g.addColorStop(1, biome.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, gy + 20);
    const dark = (biome.dark || ['Lavagrund', 'Neon-City', 'Sternenmeer'].includes(biome.name));
    const n = this.night, storm = Events.active('storm') ? 1 : 0;
    // Nachthimmel: der Taghimmel blendet in tiefes Nachtblau über (nicht nur abgedunkelt)
    if (!dark && n > 0.01) {
      const ng = ctx.createLinearGradient(0, 0, 0, gy);
      ng.addColorStop(0, '#141b46'); ng.addColorStop(0.6, '#26336b'); ng.addColorStop(1, '#3d4f8f');
      ctx.globalAlpha = n; ctx.fillStyle = ng; ctx.fillRect(-20, -20, W + 40, gy + 20); ctx.globalAlpha = 1;
    }
    // Gewitter: grauer Wolkenhimmel, Sonne und Mond verschwinden
    if (storm) {
      ctx.globalAlpha = 0.65; ctx.fillStyle = dark ? '#1a1626' : '#4a5468'; ctx.fillRect(-20, -20, W + 40, gy + 20); ctx.globalAlpha = 1;
    }
    if (dark) this.drawSkyLights(ctx, biome, 1, 1 - storm);
    else {
      // Sonne nur am Tag und ohne Gewitter
      const sunA = (1 - n) * (1 - storm);
      if (sunA > 0.02) {
        const sx = W * 0.82, sy = gy * 0.22 + n * 40;
        const sg = ctx.createRadialGradient(sx, sy, 20, sx, sy, 120);
        sg.addColorStop(0, 'rgba(255,246,194,0.55)'); sg.addColorStop(1, 'rgba(255,246,194,0)');
        ctx.globalAlpha = sunA; ctx.fillStyle = sg; ctx.fillRect(sx - 120, sy - 120, 240, 240);
        Draw.circle(ctx, sx, sy, 34, '#fff6c2'); Draw.circle(ctx, sx, sy, 26, '#fffbe6');
        ctx.globalAlpha = 1;
      }
      // Wolken: am Tag weiß, nachts kaum sichtbar, bei Gewitter dicht und dunkel
      const cn = storm ? 7 : 4;
      for (let i = 0; i < cn; i++) {
        const cx = ((i * 330 - this.scroll * (storm ? 0.4 : 0.15)) % (W + 300) + W + 300) % (W + 300) - 150, cy = 40 + (i % 4) * 28 + (i >= 4 ? 18 : 0);
        const col = storm ? (i % 2 ? '#6b7385' : '#565d70') : '#fff', sc = storm ? 1.6 : 1;
        ctx.globalAlpha = storm ? 0.9 : 0.7 * (1 - 0.75 * n);
        Draw.ellipse(ctx, cx, cy, 50 * sc, 16 * sc, col); Draw.ellipse(ctx, cx + 30 * sc, cy - 8 * sc, 30 * sc, 14 * sc, col);
        ctx.globalAlpha = 1;
      }
    }
    // Hügel-Parallaxe
    if (biome.name === 'Neon-City') {
      for (let layer = 0; layer < 2; layer++) {
        const sp = layer ? 0.5 : 0.2;
        ctx.fillStyle = layer ? biome.hills2 : biome.hills;
        for (let i = -1; i < W / 60 + 2; i++) {
          const bx = i * 60 - (this.scroll * sp) % 60;
          const h = 60 + ((i * 37 + layer * 11 + Math.floor(this.scroll * sp / 60) * 13) % 7 + 7) % 7 * 18 + layer * -20;
          ctx.fillRect(bx, gy - h, 52, h);
          if (layer) { ctx.fillStyle = '#5ef0ff55'; ctx.fillRect(bx + 8, gy - h + 10, 8, 6); ctx.fillStyle = biome.hills2; }
        }
      }
    } else {
      for (let layer = 0; layer < 2; layer++) {
        const sp = layer ? 0.5 : 0.2, amp = layer ? 26 : 40, base = gy - (layer ? 40 : 80);
        ctx.fillStyle = layer ? biome.hills2 : biome.hills;
        ctx.beginPath(); ctx.moveTo(0, gy);
        for (let x = 0; x <= W + 20; x += 20) {
          const wx = x + this.scroll * sp;
          ctx.lineTo(x, base - Math.sin(wx * 0.006 + layer) * amp - Math.sin(wx * 0.017) * amp * 0.4);
        }
        ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
      }
    }
    // Boden
    ctx.fillStyle = biome.ground; ctx.fillRect(-20, gy, W + 40, H - gy + 20);
    ctx.fillStyle = biome.ground2; ctx.fillRect(-20, gy, W + 40, 6);
    const gg = ctx.createLinearGradient(0, gy, 0, H);
    gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = gg; ctx.fillRect(-20, gy + 6, W + 40, H - gy);
    FX.groundDetails(ctx, this, biome);
  },

  drawHpBar(ctx, o) {
    const w = (o.boss ? 120 : 56) * this.cs, h = (o.boss ? 10 : 6) * this.cs;
    const jig = (o.hurtT || 0) > 0 ? U.rand(-1.5, 1.5) : 0;
    const x = o.x - w / 2 + jig, y = o.y - OBST_H[o.kind] * o.scale - (o.boss ? 40 : 16) * this.cs + jig;
    Draw.rrect(ctx, x - 2, y - 2, w + 4, h + 4, 4, 'rgba(20,10,30,0.7)');
    const ghost = Math.max(0, Math.min(1, (o.hpShow === undefined ? o.hp : o.hpShow) / o.maxHp));
    if (ghost * w > 1) Draw.rrect(ctx, x, y, w * ghost, h, 3, '#ffffff');
    const fr = Math.max(0, o.hp / o.maxHp);
    if (fr * w > 1) Draw.rrect(ctx, x, y, w * fr, h, 3, o.boss ? '#ff4d6d' : o.golden ? '#ffd34d' : fr < 0.35 ? '#ffb347' : '#6ee7a0');
    if (o.boss && o.shield > 0) Draw.rrect(ctx, x, y - h - 4, w * o.shield / o.shieldMax, h * 0.7, 3, '#5ab0ff');
  },

  // Raumleiste: Pfotenspur mit 10 Stationen, die Katze läuft mit, am Ende wartet der Boss.
  // Im Bosskampf wird daraus eine brennende Lunte (Countdown).
  drawTrail(ctx, biome, label, bx, by, bw, cx) {
    const t = this.t, guard = Run.guardian();
    // Kasten mit Farbkante im Gebietston
    Draw.rrect(ctx, bx - 12, by - 7, bw + 24, 52, 14, 'rgba(14,10,32,0.62)');
    ctx.save();
    ctx.globalAlpha = 0.85; ctx.strokeStyle = guard ? '#ffd34d' : biome.accent || '#c7b3ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx - 12, by - 7, bw + 24, 52, 14); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, cx, by + 9);
    const ty = by + 30, x0 = bx + 6, x1 = bx + bw - 22;
    if (this.bossState === 'active' && this.bossObj) {
      // Lunte: brennt von rechts nach links ab, vorne sprüht ein Funke
      const frac = U.clamp(this.bossTimer / this.bossTimeMax, 0, 1), fx = x0 + (x1 + 18 - x0) * frac;
      const hot = frac < 0.3;
      Draw.rrect(ctx, x0, ty - 3, x1 + 18 - x0, 6, 3, 'rgba(255,255,255,0.12)');
      const lg = ctx.createLinearGradient(x0, 0, x1, 0);
      lg.addColorStop(0, hot ? '#ff2d55' : '#ff8a3c'); lg.addColorStop(1, '#ffd34d');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.roundRect(x0, ty - 3, Math.max(0.001, fx - x0), 6, 3); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fl = 7 + Math.sin(t * 30) * 2;
      const sg = ctx.createRadialGradient(fx, ty, 0, fx, ty, fl * 2);
      sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.3, '#ffd34d'); sg.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = sg; ctx.fillRect(fx - fl * 2, ty - fl * 2, fl * 4, fl * 4);
      ctx.restore();
      if (Math.random() < 0.4) this.particle(fx, ty, U.rand(-40, 20), U.rand(-60, -10), U.pick(['#ffd34d', '#ff8a3c', '#fff']), 0.35, 2.2, 200, false, 'spark');
      ctx.font = '800 11px "Segoe UI", sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,10,30,0.9)';
      const tt = `⏱ ${this.bossTimer.toFixed(1)} s`;
      ctx.strokeText(tt, cx, ty + 0.5); ctx.fillStyle = hot && Math.sin(t * 12) > 0 ? '#ffb3c1' : '#fff'; ctx.fillText(tt, cx, ty + 0.5);
    } else {
      const N = KILLS_PER_STAGE, done = S.farm ? Math.min(S.farmKills, N) : Math.min(S.kills, N);
      const col = S.farm ? '#ffb347' : '#6ee7a0', step = (x1 - x0) / (N - 1);
      // gestrichelter Pfad, der bereits gelaufene Teil leuchtet
      ctx.save(); ctx.setLineDash([3, 4]); ctx.lineDashOffset = -t * 12;
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x1 + 8, ty); ctx.stroke(); ctx.restore();
      if (done > 1) { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x0 + step * (done - 1), ty); ctx.stroke(); }
      for (let i = 0; i < N; i++) {
        const nx = x0 + i * step;
        if (i < done - 1) this.drawPawMark(ctx, nx, ty, 8, col);
        else if (i === done - 1) Draw.circle(ctx, nx, ty, 8.5, col);
        else {
          const next = i === done, pr = next ? 4.5 + Math.sin(t * 6) * 1.2 : 3.5;
          ctx.save(); ctx.strokeStyle = next ? '#ffffff' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = next ? 2 : 1.5;
          Draw.circle(ctx, nx, ty, pr, 'rgba(14,10,32,0.9)');
          ctx.beginPath(); ctx.arc(nx, ty, pr, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
      }
      // Katzenkopf läuft weich zur aktuellen Station
      const want = x0 + step * Math.max(0, done - 1);
      this.trailX = this.trailX === undefined || Math.abs(this.trailX - want) > step * 3 ? want : this.trailX + (want - this.trailX) * 0.12;
      if (done > 0) {
        const hx = this.trailX, hy = ty + 1.5 - Math.abs(Math.sin(t * 5)) * 1.2;
        ctx.fillStyle = '#ffb04d';
        ctx.beginPath(); ctx.moveTo(hx - 5.5, hy - 1); ctx.lineTo(hx - 4.5, hy - 8); ctx.lineTo(hx - 0.5, hy - 4); ctx.lineTo(hx + 0.5, hy - 4); ctx.lineTo(hx + 4.5, hy - 8); ctx.lineTo(hx + 5.5, hy - 1); ctx.closePath(); ctx.fill();
        Draw.circle(ctx, hx, hy, 5.5, '#ffb04d');
        Draw.circle(ctx, hx - 2, hy - 0.5, 0.9, '#2a1a10'); Draw.circle(ctx, hx + 2, hy - 0.5, 0.9, '#2a1a10');
      }
      // Boss-Medaillon am Ende: glüht, sobald der Boss kommt (Wächter: gold)
      const ready = done >= N, mx = x1 + 18, pulse = ready ? 1 + Math.sin(t * 8) * 0.12 : 1;
      ctx.save();
      if (ready || guard) {
        const mg = ctx.createRadialGradient(mx, ty, 2, mx, ty, 18 * pulse);
        mg.addColorStop(0, ready ? 'rgba(255,77,109,0.8)' : 'rgba(255,211,77,0.6)'); mg.addColorStop(1, 'rgba(255,77,109,0)');
        ctx.fillStyle = mg; ctx.fillRect(mx - 20, ty - 20, 40, 40);
      }
      Draw.circle(ctx, mx, ty, 10 * pulse, guard ? '#5a4210' : 'rgba(40,20,50,0.95)');
      ctx.strokeStyle = guard ? '#ffd34d' : ready ? '#ff4d6d' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(mx, ty, 10 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `${Math.round(12 * pulse)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.fillText(guard ? '👑' : '😼', mx, ty + 1);
      ctx.restore();
    }
  },
  drawPawMark(ctx, x, y, r, col) {
    Draw.ellipse(ctx, x, y + r * 0.28, r * 0.5, r * 0.4, col);
    Draw.circle(ctx, x - r * 0.48, y - r * 0.18, r * 0.22, col);
    Draw.circle(ctx, x - r * 0.17, y - r * 0.5, r * 0.22, col);
    Draw.circle(ctx, x + r * 0.17, y - r * 0.5, r * 0.22, col);
    Draw.circle(ctx, x + r * 0.48, y - r * 0.18, r * 0.22, col);
  },

  drawOverlay(ctx, biome) {
    // W = nutzbare Breite (ohne Symbolleiste rechts), iB = Leiste unten
    const W = this.Wp || this.W, H = this.H, iB = this.insetB || 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // Schmales Spielfeld (Handy hoch/quer): kleinere Schrift, Combo und Banner rücken
    // unter die Boss-Knöpfe, damit sich nichts mit den HTML-Knöpfen überlagert
    const k = U.clamp(W / 620, 0.78, 1), narrow = W < 720;
    // Unterkante der HTML-Boss-Knöpfe (Höhe hängt von Bildschirm und Text ab)
    const wrap = document.getElementById('bossWrap');
    const uiTop = wrap && wrap.offsetHeight ? wrap.offsetTop + wrap.offsetHeight + 8 : 108;
    // Stufenanzeige: Kasten wächst mit dem Text, Text schrumpft notfalls
    const label = Run.active ? Run.label(biome) : S.farm ? `Stufe ${S.stage} · ${biome.name} · Farm-Modus` : `Stufe ${S.stage} · ${biome.name}`;
    let fs = 15 * k;
    ctx.font = `800 ${fs}px "Segoe UI", system-ui, sans-serif`;
    const tw = ctx.measureText(label).width;
    const bw = Math.min(W - 64, Math.max(Math.min(360, W * 0.5), tw + 6)), by = 14;
    // mittig im ganzen Spielfeld, aber nie unter die Symbolleiste rechts
    const bcx = Math.min(this.W / 2, W - bw / 2 - 20), bx = bcx - bw / 2;
    if (tw > bw) { fs *= bw / tw; ctx.font = `800 ${fs}px "Segoe UI", system-ui, sans-serif`; }
    this.drawTrail(ctx, biome, label, bx, by, bw, bcx);

    // Combo (breit: rechts oben; schmal: rechts unter den Boss-Knöpfen, kleiner)
    {
      const cx = W - (narrow ? 14 : 22), cy = narrow ? uiTop + 34 : 92;
      Combo.draw(ctx, this, cx, cy, narrow, this.frameDt || 0.016);
    }
    // Goldrausch- und Ereignis-Pille: breit links oben, schmal links unter den Boss-Knöpfen
    const py = narrow ? uiTop : 14;
    if (this.rush > 0) {
      ctx.textAlign = 'left';
      Draw.rrect(ctx, 14, py, 170, 30, 15, 'rgba(60,40,0,0.7)');
      ctx.font = '800 13px "Segoe UI", "Segoe UI Emoji", sans-serif'; ctx.fillStyle = '#ffd34d';
      ctx.fillText(`💰×2 GOLDRAUSCH ${Math.ceil(this.rush)} s`, 26, py + 15);
      ctx.textAlign = 'center';
    }

    Events.drawPill(ctx, this, this.rush > 0 ? py + 36 : py);
    Vitals.drawOverlay(ctx, this, narrow ? uiTop + 62 : Math.max(H * 0.24, 100));
    Run.drawPause(ctx, this);

    // Schnurr-Meter
    const mw = Math.min(260, W * 0.3), mx = W - mw - 18, my = H - 30 - iB;
    Draw.rrect(ctx, mx - 6, my - 22, mw + 12, 40, 10, 'rgba(20,14,40,0.55)');
    ctx.font = '700 11px "Segoe UI", sans-serif'; ctx.fillStyle = '#ffd6f3'; ctx.textAlign = 'left';
    ctx.fillText(this.frenzy > 0 ? `RASEREI ${this.frenzy.toFixed(1)} s` : W < 520 ? 'SCHNURR-METER' : 'SCHNURR-METER · klicken!', mx, my - 11);
    Draw.rrect(ctx, mx, my - 2, mw, 12, 6, 'rgba(255,255,255,0.15)');
    const f = this.frenzy > 0 ? this.frenzy / 6 : this.purr / 100;
    const gr = ctx.createLinearGradient(mx, 0, mx + mw, 0);
    gr.addColorStop(0, '#ff7ad9'); gr.addColorStop(1, '#9d7bff');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(mx, my - 2, Math.max(0.001, mw * f), 12, 6); ctx.fill();

    // Banner
    if (this.banner) {
      const b = this.banner, p = b.t;
      const sc = p < 0.25 ? 0.3 + p / 0.25 * 0.9 : p < 0.4 ? 1.2 - (p - 0.25) / 0.15 * 0.2 : 1;
      const a = p > 1.8 ? 1 - (p - 1.8) / 0.4 : 1;
      ctx.save();
      ctx.globalAlpha = U.clamp(a, 0, 1);
      // unter dem Auto-Boss-Knopf; schmal zusätzlich unter der Combo-Anzeige
      ctx.textAlign = 'center';
      // Schrift so wählen, dass Titel und Untertitel sicher in die Breite passen
      let bf = Math.min(52, W / 14);
      ctx.font = `700 ${17 * k}px "Segoe UI", "Segoe UI Emoji", sans-serif`;
      const subW = b.sub ? ctx.measureText(b.sub).width : 0;
      ctx.font = `900 ${bf}px "Segoe UI", system-ui, sans-serif`;
      const bt = ctx.measureText(b.text).width;
      // mittig im ganzen Spielfeld (nicht nur im Bereich links der Symbolleiste)
      const half = Math.min(W - 28, Math.max(bt, subW)) / 2;
      ctx.translate(Math.max(half + 14, Math.min(this.W / 2, W - half - 14)), narrow ? Math.max(H * 0.46, uiTop + 84) : Math.max(H * 0.36, 132)); ctx.scale(sc, sc);
      if (bt > W - 28) { bf *= (W - 28) / bt; ctx.font = `900 ${bf}px "Segoe UI", system-ui, sans-serif`; }
      ctx.lineWidth = Math.max(5, bf * 0.16); ctx.strokeStyle = 'rgba(20,10,30,0.85)';
      ctx.strokeText(b.text, 0, 0);
      ctx.fillStyle = b.color; ctx.fillText(b.text, 0, 0);
      if (b.sub) {
        let sf = 17 * k;
        ctx.font = `700 ${sf}px "Segoe UI", "Segoe UI Emoji", sans-serif`;
        const st = ctx.measureText(b.sub).width;
        if (st > W - 28) { sf *= (W - 28) / st; ctx.font = `700 ${sf}px "Segoe UI", "Segoe UI Emoji", sans-serif`; }
        const sy = bf * 0.55 + sf * 0.9;
        ctx.lineWidth = 5; ctx.strokeText(b.sub, 0, sy);
        ctx.fillStyle = '#fff'; ctx.fillText(b.sub, 0, sy);
      }
      ctx.restore();
    }
  },
};
