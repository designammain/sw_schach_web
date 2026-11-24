// Service Worker der veröffentlichten Fassung: liefert die nach dem Login entschlüsselten Spieldateien
// aus dem Cache „sws-spiel“. Ohne Login (Cache leer) führen Seitenaufrufe zur Anmeldung.
const CACHE = 'sws-spiel';
const OPEN = ['', 'index.html', 'sw.js', 'zugang.json', 'spiel.bin', '404.html'];   // liegen offen auf dem Server

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url), scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const rel = url.pathname.slice(scope.pathname.length);
  if (OPEN.includes(rel)) return;
  e.respondWith((async () => {
    const hit = await (await caches.open(CACHE)).match(new URL(rel, scope).href, { ignoreSearch: true });
    if (hit) return hit;
    if (e.request.mode === 'navigate') return Response.redirect(new URL('index.html' + url.search, scope).href, 302);
    return fetch(e.request);
  })());
});
