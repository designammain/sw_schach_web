// Läuft im Spiel (wird beim Bauen in die verschlüsselte index.html eingesetzt): prüft, ob eine neue Fassung
// veröffentlicht wurde, und spielt sie mit dem gespeicherten Schlüssel ein. Abgelaufene Anmeldung → Login.
import { meta, install, loadLogin, logout, b64, KEY } from './zugang.js';

const s = loadLogin();
if (!s) { await logout(); location.replace(new URL('./', location.href).href); }
else {
  try {
    const acc = await meta();
    if (acc.build !== s.build && sessionStorage.getItem('sws.neu') !== acc.build) {
      sessionStorage.setItem('sws.neu', acc.build);            // höchstens einmal je Fassung versuchen
      await install(acc, b64(s.k));
      s.build = acc.build; localStorage.setItem(KEY, JSON.stringify(s));
      location.reload();
    }
  } catch (e) { console.warn('Aktualisierung übersprungen:', e.message); }   // offline: einfach weiterspielen
}
