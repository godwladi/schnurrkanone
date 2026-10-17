'use strict';
// ---------------------------------------------------------------------------
// Service Worker: Cache-First für den Offline-Betrieb als iPhone-PWA.
// Neue Versionen: CACHE hochzählen (oder die Seite lädt sie beim nächsten Start
// nach, weil jeder Treffer im Hintergrund aktualisiert wird).
// ---------------------------------------------------------------------------
const CACHE = 'schnurrkanone-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/engine.js', 'js/data.js', 'js/logic.js', 'js/progress.js', 'js/draw.js', 'js/fx.js',
  'js/audio2.js', 'js/events.js', 'js/talents.js', 'js/battle.js', 'js/ui.js', 'js/touch.js', 'js/main.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
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
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
    if (hit) { net.catch(() => {}); return hit; }
    return net.catch(() => cache.match('index.html'));
  }));
});
