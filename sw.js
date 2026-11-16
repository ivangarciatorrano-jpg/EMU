/* CrisVan Juegos — funciona sin conexión. Sube VERSION cuando cambies archivos. */
const VERSION = 'juegos-v2';
const FILES = ['./', 'index.html', 'app.js', 'games.css', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Red primero; si no hay conexión, caché. Guarda también los scripts de los emuladores (jsDelivr).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const cacheable = u.origin === location.origin || (u.hostname === 'cdn.jsdelivr.net' && !u.pathname.endsWith('.wasm'));
  e.respondWith(fetch(e.request).then(r => {
    if (cacheable && r && r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
