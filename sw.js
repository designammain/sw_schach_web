// Service Worker der veröffentlichten Fassung. Nach dem Login liegt das entschlüsselte Spiel im Cache
// „sws-spiel“, das Spiel selbst als index.html. Dann liefert die Adresse (…/ oder …/index.html) das Spiel,
// ohne Login die Anmeldeseite vom Server. Alle übrigen Spieldateien kommen nur aus dem Cache.
const CACHE = 'sws-spiel';
const OPEN = ['sw.js', 'zugang.js', 'aktualisieren.js', 'zugang.json', 'spiel.bin', '404.html', 'robots.txt'];   // offen auf dem Server

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url), scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  let rel = url.pathname.slice(scope.pathname.length);
  if (OPEN.includes(rel)) return;
  if (rel === '') rel = 'index.html';
  e.respondWith((async () => {
    const hit = await (await caches.open(CACHE)).match(new URL(rel, scope).href, { ignoreSearch: true });
    if (hit) return hit;
    if (rel === 'index.html') return fetch(new URL('index.html', scope).href, { cache: 'no-store' });   // Anmeldung
    if (e.request.mode === 'navigate') return Response.redirect(new URL('./' + url.search, scope).href, 302);
    return fetch(e.request);
  })());
});
