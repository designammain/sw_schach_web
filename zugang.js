// Gemeinsame Teile von Login-Seite (index.html ohne Anmeldung) und Aktualisierung (im Spiel).
// zugang.json: je Konto der Spiel-Schlüssel, verschlüsselt mit einem Schlüssel aus dem Passwort (PBKDF2-SHA-256,
// AES-GCM). spiel.bin: vorne 12 Byte IV, dann das verschlüsselte Spiel. Nach dem Entschlüsseln liegen die
// Dateien im Cache „sws-spiel“, der Service Worker liefert sie aus; das Spiel steht dort als index.html.
export const CACHE = 'sws-spiel', KEY = 'sws.login', DAYS = 60;
const enc = new TextEncoder();
export const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const here = (p) => new URL(p, new URL('./', location.href)).href;

// zugang.json mit ?t am CDN vorbei immer frisch holen
export async function meta() {
  const r = await fetch(here('zugang.json?t=' + Date.now()), { cache: 'no-store' });
  if (!r.ok) throw new Error('zugang.json fehlt'); return r.json();
}

export async function unlock(acc, name, pw) {
  const h = hex(await crypto.subtle.digest('SHA-256', enc.encode('sws:' + name.trim().toLowerCase())));
  const u = acc.users[h];
  const base = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
  // auch bei unbekanntem Namen gleich lange rechnen, damit man Namen nicht am Tempo erkennt
  const kek = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: u ? b64(u.salt) : enc.encode('x'), iterations: acc.iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  if (!u) return null;
  try { return await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(u.iv) }, kek, b64(u.key)); } catch { return null; }
}

export async function install(acc, rawKey) {
  const K = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const r = await fetch(here('spiel.bin?v=' + acc.build), { cache: 'no-store' });
  if (!r.ok) throw new Error('spiel.bin nicht erreichbar (' + r.status + ')');
  const buf = await r.arrayBuffer();
  let plain;
  try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12) }, K, new Uint8Array(buf, 12)); }
  catch { throw new Error('Spieldatei passt (noch) nicht – in ein paar Minuten erneut versuchen'); }
  const n = new DataView(plain).getUint32(0);
  const files = JSON.parse(new TextDecoder().decode(new Uint8Array(plain, 4, n)));
  await caches.delete(CACHE);
  const cache = await caches.open(CACHE);
  for (const f of files) await cache.put(here(f.p), new Response(new Uint8Array(plain, 4 + n + f.o, f.n), { headers: { 'Content-Type': f.t } }));
  return files.length;
}

export function loadLogin() {
  let s; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  return s && s.k && s.until > Date.now() ? s : null;
}
export async function logout() {
  localStorage.removeItem(KEY);
  try { await caches.delete(CACHE); } catch {}
}

// Service Worker registrieren und warten, bis er diese Seite steuert (auch nach einer neuen sw.js)
export async function worker() {
  const reg = await navigator.serviceWorker.register(here('sw.js'));
  try { await reg.update(); } catch {}
  const sw = reg.installing || reg.waiting;
  if (sw) await new Promise((res) => { sw.addEventListener('statechange', () => sw.state === 'activated' && res()); setTimeout(res, 3000); });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) await new Promise((res) => {
    navigator.serviceWorker.addEventListener('controllerchange', res, { once: true }); setTimeout(res, 1500); });
}
