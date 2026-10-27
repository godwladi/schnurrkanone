'use strict';
// ---------------------------------------------------------------------------
// Service Worker: Cache-First für den Offline-Betrieb als iPhone-PWA.
// Neue Versionen: CACHE hochzählen (oder die Seite lädt sie beim nächsten Start
// nach, weil jeder Treffer im Hintergrund aktualisiert wird). Immer am HTTP-Cache
// des Browsers vorbei laden, sonst landen alte Dateien im Offline-Speicher.
// ---------------------------------------------------------------------------
const CACHE = 'schnurrkanone-20261027-2357';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/icons.js', 'js/feedback.js', 'js/engine.js', 'js/perf.js', 'js/data.js', 'js/logic.js', 'js/progress.js', 'js/draw.js', 'js/fx.js', 'js/strata.js',
  'js/audio2.js', 'js/jazz.js', 'js/events.js', 'js/talents.js', 'js/battle.js', 'js/ui.js', 'js/touch.js', 'js/splash.js', 'js/main.js', 'js/vitals.js', 'js/combo.js', 'js/foes.js', 'js/rooms.js', 'js/rooms2.js', 'js/shades.js', 'js/rooms3.js', 'js/run.js', 'js/path.js', 'js/build.js', 'js/cards.js', 'js/traits.js', 'js/variants.js', 'js/daily.js', 'js/limit.js', 'js/winfo.js', 'js/milestones.js', 'js/slots.js', 'js/alpha.js', 'js/warden.js', 'js/powerups.js', 'js/fun.js', 'js/anim.js', 'js/dock.js', 'js/hud.js', 'js/groove.js', 'js/score.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req.url, { cache: 'no-cache' }).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    if (hit) { net.catch(() => {}); return hit; }
    return net.catch(() => cache.match('index.html'));
  }));
});
