// Mitarbeiter-Anmeldung für den persönlichen Einladungslink UND für die
// bestehende Namens-Dropdown-Anmeldung (die 8 §613a-Mitarbeiter:innen).
//
// Ersetzt den bisherigen Client-seitigen PIN-Vergleich (PIN lag im Klartext
// im "employees"-Sheet und wurde 1:1 an den Browser ausgeliefert). Ab jetzt:
// - PINs werden nur noch gehasht gespeichert (nie im Klartext).
// - "/.netlify/functions/data" nimmt für die "employees"-Collection künftig
//   nur noch Admin-Schreibzugriffe an (siehe dortiger Kommentar) — das
//   erstmalige PIN-Festlegen und der Login laufen ausschließlich hier
//   durch, mit serverseitiger Prüfung statt offenem Array-Überschreiben.
//
// Aktionen (POST-Body { action, ... }):
//   resolve { inviteToken }               — öffentlich, keine PIN nötig
//   claim   { inviteToken | employeeId, pin }
//   login   { inviteToken | employeeId, pin }
//   whoami  (Authorization: Bearer <employee-token>)
const { sheetsGet, sheetsUpdate, sheetsClearRange, sheetsGetVersion, sheetsSetVersion } = require('./sheets_light');
const { hashPin, mintEmployeeToken, getAuth } = require('./session_util');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json' };
const COLLECTION = 'employees';

const rowToObj = row => { try { return JSON.parse(row[0]); } catch { return null; } };
const objToRow = obj => [JSON.stringify(obj)];

const loadEmployees = async () => {
  const rows = await sheetsGet(COLLECTION, 'A1:A10000');
  return rows.map(rowToObj).filter(Boolean);
};

const saveEmployees = async (list) => {
  await sheetsUpdate(COLLECTION, list.map(objToRow));
  await sheetsClearRange(COLLECTION, list.length + 1);
};

// Öffentlich sichtbare Kurzfassung für die personalisierte Begrüßung —
// bewusst ohne inviteToken, pinHash o.ä.
const publicMeta = (emp) => ({
  employeeId: emp.id,
  vorname: emp.vorname || (emp.name || '').trim().split(/\s+/)[0] || '',
  name: emp.name || emp.vorname || '',
  firma: emp.firma || 'physiopro',
  geschlecht: emp.geschlecht || '',
  pinSet: !!emp.pinSet,
});

const findByInviteOrId = (list, { inviteToken, employeeId }) => {
  if (inviteToken) return list.find(e => e.inviteToken && e.inviteToken === inviteToken) || null;
  if (employeeId) return list.find(e => e.id === employeeId) || null;
  return null;
};

const isValidPin = pin => /^\d{4,6}$/.test(String(pin || ''));

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_json' }) }; }

  const { action, inviteToken, employeeId, pin } = body;

  try {
    if (action === 'resolve') {
      if (!inviteToken) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'inviteToken fehlt' }) };
      const list = await loadEmployees();
      const emp = findByInviteOrId(list, { inviteToken });
      if (!emp) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'not_found' }) };
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ...publicMeta(emp) }) };
    }

    if (action === 'claim' || action === 'login') {
      if (!inviteToken && !employeeId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'inviteToken oder employeeId fehlt' }) };
      if (!isValidPin(pin)) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_pin_format', message: 'PIN muss 4-6 Ziffern haben.' }) };

      // Bis zu 2 Versuche bei gleichzeitiger Schreib-Kollision (OCC), gleiches
      // Muster wie im data.js-Versions-Check, hier aber auf einen einzelnen
      // Datensatz statt das ganze Array vom Client beschränkt.
      for (let attempt = 0; attempt < 2; attempt++) {
        const version = await sheetsGetVersion(COLLECTION);
        const list = await loadEmployees();
        const emp = findByInviteOrId(list, { inviteToken, employeeId });
        if (!emp) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'not_found' }) };

        // Sicherheits-Fix: Datensätze, die über den persönlichen
        // Einladungslink angelegt wurden (viaInvite), dürfen NUR über den
        // tatsächlichen inviteToken beansprucht/angemeldet werden — nicht
        // über die bloße employeeId. Die id ist ein 13-stelliger Zeitstempel
        // ("emp"+Date.now()), der bei bekanntem ungefährem Anlage-Zeitpunkt
        // in überschaubarer Zeit erraten/gebruteforct werden könnte. Für die
        // alten §613a-Namens-Dropdown-Konten (ohne viaInvite) bleibt die
        // employeeId weiterhin ein gültiger Anmeldeweg — deren Namen stehen
        // ohnehin öffentlich in der Auswahlliste.
        if (emp.viaInvite && !inviteToken) {
          return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'not_found' }) };
        }

        if (action === 'claim') {
          if (emp.pinSet) return { statusCode: 409, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'already_claimed', message: 'Für diese Person ist bereits eine PIN festgelegt — bitte „Anmelden" statt „PIN festlegen" verwenden.' }) };
          const pinVersion = (emp.pinVersion || 0) + 1;
          const updated = list.map(e => e.id === emp.id ? { ...e, pin: undefined, pinHash: hashPin(pin, emp.id), pinSet: true, pinVersion } : e);
          const current = await sheetsGetVersion(COLLECTION);
          if (current !== version) { continue; } // jemand anders hat währenddessen geschrieben — neu versuchen
          await saveEmployees(updated);
          await sheetsSetVersion(COLLECTION, version + 1).catch(() => {});
          const token = mintEmployeeToken({ employeeId: emp.id, pinVersion });
          return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, token, ...publicMeta({ ...emp, pinSet: true }) }) };
        }

        // action === 'login'
        if (!emp.pinSet) return { statusCode: 409, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'not_claimed', message: 'Für diese Person wurde noch keine PIN festgelegt.' }) };

        // Übergang für Alt-Datensätze von vor dem 20.07.2026: PIN lag dort
        // noch im Klartext im Feld "pin" (nicht "pinHash"). Bei Treffer wird
        // hier einmalig auf den Hash migriert und das Klartextfeld entfernt
        // — danach läuft der Login wie bei allen anderen über pinHash. Der
        // PIN-Wert selbst ändert sich dabei nicht, daher bleibt pinVersion
        // unverändert (kein "Reset").
        if (!emp.pinHash) {
          if (!emp.pin || String(emp.pin) !== String(pin)) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_pin', message: 'PIN falsch.' }) };
          const migrated = list.map(e => e.id === emp.id ? { ...e, pin: undefined, pinHash: hashPin(pin, emp.id) } : e);
          const current = await sheetsGetVersion(COLLECTION);
          if (current === version) {
            await saveEmployees(migrated);
            await sheetsSetVersion(COLLECTION, version + 1).catch(() => {});
          } // bei Konflikt: Login trotzdem erlauben, Migration einfach beim nächsten Login erneut versuchen
          const token = mintEmployeeToken({ employeeId: emp.id, pinVersion: emp.pinVersion || 0 });
          return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, token, ...publicMeta(emp) }) };
        }

        if (emp.pinHash !== hashPin(pin, emp.id)) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_pin', message: 'PIN falsch.' }) };
        const token = mintEmployeeToken({ employeeId: emp.id, pinVersion: emp.pinVersion || 0 });
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, token, ...publicMeta(emp) }) };
      }
      return { statusCode: 409, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'version_conflict', message: 'Bitte kurz erneut versuchen.' }) };
    }

    if (action === 'whoami') {
      const auth = getAuth(event);
      if (!auth || auth.role !== 'employee') return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_token' }) };
      const list = await loadEmployees();
      const emp = list.find(e => e.id === auth.employeeId);
      if (!emp) return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'not_found' }) };
      // Token wird ungültig, sobald sich pinVersion geändert hat (Admin hat
      // die PIN zurückgesetzt, z. B. bei verlorenem Handy) — sonst würde ein
      // "PIN Reset" nur künftige PIN-Logins blockieren, ein schon
      // ausgestelltes Token aber bis zu 180 Tage weiter funktionieren.
      if ((auth.pinVersion || 0) !== (emp.pinVersion || 0)) return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'pin_was_reset' }) };
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, ...publicMeta(emp) }) };
    }

    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'unknown_action' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
