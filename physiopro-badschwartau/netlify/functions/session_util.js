// Gemeinsame Helfer für Session-Tokens (Admin + Mitarbeiter) und PIN-Hashing.
// Kein eigener Netlify-Function-Endpoint (kein exports.handler) — wird nur
// von auth.js, employee-session.js und data.js importiert, genau wie
// sheets_light.js.
//
// Hintergrund (20.07.2026): /.netlify/functions/data lieferte bisher OHNE
// jede Prüfung alle Mitarbeiter-Datensätze inkl. Steuer-ID, IBAN, Sozial-
// versicherungsnummer UND alle PINs im Klartext aus — an jeden, der die
// Seite nur öffnet. Diese Datei ist die Grundlage für den Fix: signierte,
// zeitlich begrenzte Tokens statt Klartext-Vergleich/offener Auslieferung.
//
// Bewusst ohne neues npm-Package: Node hat "crypto" eingebaut, das reicht
// für HMAC-Signaturen, PIN-Hashing und sichere Zufalls-Tokens vollständig.
const crypto = require('crypto');

// Eigener, dedizierter HMAC-Signierschlüssel (Netlify-Env-Var SESSION_SECRET,
// zufälliger Wert, nirgends sonst verwendet). Ursprünglich wurde hier
// ADMIN_PASSWORD wiederverwendet — das ging am 20.07.2026 schief, als der
// Admin-Login auf zwei individuelle Passwörter (ADMIN_PASSWORD_OLIVER/_HANNA)
// umgestellt und das alte gemeinsame ADMIN_PASSWORD gelöscht wurde: damit
// fehlte plötzlich auch der Signierschlüssel und JEDER Login (Admin wie
// Mitarbeiter) scheiterte mit server_misconfigured. Lehre daraus: der
// Signierschlüssel gehört von Login-Passwörtern getrennt. Ein Wechsel dieses
// Werts macht alle bestehenden Sitzungen ungültig (alle müssen sich neu
// anmelden) — Daten gehen dabei nicht verloren.
const secret = () => process.env.SESSION_SECRET || '';

const b64url = buf => Buffer.from(buf).toString('base64url');
const fromB64url = str => Buffer.from(str, 'base64url');

// Signiert ein Payload-Objekt (muss "exp" in ms enthalten) zu einem
// kompakten Token "payload.signatur". Wirft, wenn kein Secret gesetzt ist
// (server_misconfigured) statt ein unsicheres Fallback-Secret zu nutzen.
const signToken = (payload) => {
  const s = secret();
  if (!s) throw new Error('server_misconfigured');
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', s).update(body).digest();
  return body + '.' + b64url(sig);
};

// Prüft Signatur + Ablauf, gibt bei Erfolg das Payload-Objekt zurück, sonst
// null. Zeitkonstanter Vergleich gegen Timing-Angriffe auf die Signatur.
const verifyToken = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const s = secret();
    if (!s) return null;
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;
    const body = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', s).update(body).digest();
    const given = fromB64url(sig);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    const payload = JSON.parse(fromB64url(body).toString('utf8'));
    if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
};

// Liest "Authorization: Bearer <token>" aus einem Netlify-Function-Event
// (Header-Namen können je nach Runtime groß/klein geschrieben sein).
const getBearerToken = (event) => {
  const headers = event.headers || {};
  const raw = headers.authorization || headers.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return m ? m[1] : null;
};

// Gibt {role:'admin', email, name} oder {role:'employee', employeeId} oder
// null zurück — je nachdem, was im Request-Token steht.
const getAuth = (event) => {
  const payload = verifyToken(getBearerToken(event));
  if (!payload) return null;
  if (payload.role === 'admin' || payload.role === 'employee') return payload;
  return null;
};

const ADMIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h — Admin muss sich täglich neu anmelden (sensibler Zugriff auf alle Daten)
const EMPLOYEE_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 Tage — Mitarbeiter bleiben angemeldet, wie bisher per localStorage

const mintAdminToken = ({ email, name }) => signToken({ role: 'admin', email, name, exp: Date.now() + ADMIN_TOKEN_TTL_MS });
// pinVersion wird bei jeder PIN-Änderung (Festlegen/Admin-Reset) hochgezählt
// und mit ins Token eingebettet. So macht ein "PIN Reset" durch die
// Verwaltung auch bereits ausgestellte Tokens ungültig (z. B. bei verlorenem
// Handy) — ohne pinVersion würde ein Reset nur künftige PIN-Logins blocken,
// ein schon ausgestelltes Token aber bis zu 180 Tage gültig bleiben.
const mintEmployeeToken = ({ employeeId, pinVersion }) => signToken({ role: 'employee', employeeId, pinVersion: pinVersion || 0, exp: Date.now() + EMPLOYEE_TOKEN_TTL_MS });

// PIN wird nie im Klartext gespeichert oder ausgeliefert — nur als Hash.
// PBKDF2 (100.000 Runden) statt einfachem SHA-256: falls die Google-Sheets-
// Datenbank selbst je exponiert würde (z. B. falsch geteilt, geleakter
// Service-Account-Key), bremst das Brute-Force über den kleinen 4-6-stelligen
// PIN-Zahlenraum spürbar aus. Kein neues npm-Package nötig (Node "crypto").
const hashPin = (pin, employeeId) => crypto.pbkdf2Sync(String(pin), 'badschwartau:' + String(employeeId), 100000, 32, 'sha256').toString('hex');

// Kryptographisch zufälliges Einladungs-Token (192 Bit) für den
// persönlichen Link — bewusst NICHT dieselbe ID wie die öffentlich
// gelistete employee-id, da diese für die alte Namens-Dropdown-Anmeldung
// öffentlich sichtbar bleiben muss.
const randomInviteToken = () => crypto.randomBytes(24).toString('base64url');

module.exports = {
  signToken, verifyToken, getBearerToken, getAuth,
  mintAdminToken, mintEmployeeToken,
  hashPin, randomInviteToken,
};
