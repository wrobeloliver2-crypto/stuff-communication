const { sheetsGet, sheetsBatchGetAll, sheetsClearRange, sheetsUpdate, sheetsAppend, sheetsGetVersion, sheetsSetVersion } = require('./sheets_light');
const { getAuth } = require('./session_util');

// Nur zwei Collections — diese Site macht bewusst nur eine Sache
// (Onboarding-Formular + Mitarbeiterverwaltung), kein News/Tools/Postfach.
// "profile" = die Formular-Daten pro Person (ein Datensatz je employee-id).
const ALL_COLLECTIONS = ['employees', 'profile'];

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const objToRow = obj => [JSON.stringify(obj)];
const rowToObj = row => { try { return JSON.parse(row[0]); } catch { return null; } };

// 20.07.2026 — SICHERHEITS-FIX: Diese Function lieferte bisher OHNE jede
// Prüfung die kompletten Datensätze aller Mitarbeiter:innen aus (Steuer-ID,
// Sozialversicherungsnummer, IBAN, Adresse, ...) UND alle PINs im Klartext —
// an jeden, der die Seite nur öffnet, unabhängig vom Login (sichtbar z. B.
// im Browser-Netzwerk-Tab). Ab jetzt gilt pro Collection eine Autorisierung
// (siehe authorizeRead/authorizeWrite unten). PIN-Setzen/-Prüfen läuft nicht
// mehr hier, sondern ausschließlich über employee-session.js.

// Admin bekommt den vollständigen Datensatz (u. a. für den Einladungslink).
// Wichtig: NICHT pin/pinHash herausfiltern, obwohl der Admin sie nie aktiv
// braucht — das Admin-Frontend liest diese Liste, ändert einen Eintrag
// (z. B. "+ Mitarbeiter hinzufügen") und schreibt die GESAMTE Liste wieder
// zurück (bestehendes Read-Modify-Write-Muster, siehe commit() im
// Frontend). Würde man pin/pinHash hier herausfiltern, ginge bei jeder
// Admin-Aktion der Zugangs-Hash ALLER ANDEREN Mitarbeiter:innen verloren —
// sie könnten sich danach nicht mehr anmelden. Der eigentliche Schutz ist
// die Autorisierung selbst (nur mit gültigem Admin-Token erreichbar), nicht
// das Verstecken einzelner Felder vor dem ohnehin voll berechtigten Admin.
const employeeForAdmin = e => e;
// Öffentliche/nicht privilegierte Sicht: nur was die alte Namens-Dropdown-
// Anmeldung braucht, und nur für Mitarbeiter:innen, die NICHT über einen
// persönlichen Einladungslink angelegt wurden (viaInvite) — die sollen
// ausschließlich über ihren eigenen Link einsteigen, nicht öffentlich in
// einer Liste auftauchen.
const employeeForPublic = e => ({ id: e.id, name: e.name, pinSet: !!e.pinSet });

const loadCollection = async (name) => {
  const rows = await sheetsGet(name, 'A1:A10000');
  return rows.map(rowToObj).filter(Boolean);
};

// Klassisches Read-Modify-Write des kompletten Arrays mit OCC-Versions-
// Prüfung — unverändert gegenüber dem bisherigen Verhalten, nur in eine
// eigene Funktion ausgelagert (genutzt für: Admin-Schreibzugriffe auf
// "employees" und "profile").
const writeWholeArray = async (collection, incoming, expectedVersion) => {
  const hasVersionCheck = typeof expectedVersion === 'number';
  let currentVersion = null;
  if (hasVersionCheck) {
    currentVersion = await sheetsGetVersion(collection);
    if (currentVersion !== expectedVersion) {
      return {
        statusCode: 409,
        headers: HEADERS,
        body: JSON.stringify({
          ok: false,
          error: 'version_conflict',
          collection,
          expectedVersion,
          currentVersion,
          message: 'Diese Liste wurde inzwischen von einer anderen Sitzung geändert. Bitte die Seite neu laden und die Änderung erneut vornehmen.'
        })
      };
    }
  }

  if (incoming.length === 0) {
    const existing = await loadCollection(collection);
    if (existing.length > 1) {
      return {
        statusCode: 409,
        headers: HEADERS,
        body: JSON.stringify({ ok: false, error: 'refused_empty_overwrite', collection, existing: existing.length, message: 'Leeres Überschreiben abgelehnt: es sind bereits Einträge vorhanden. Bitte die Seite neu laden und erneut versuchen.' })
      };
    }
  }

  if (incoming.length > 0) {
    await sheetsUpdate(collection, incoming.map(objToRow));
  }
  await sheetsClearRange(collection, incoming.length + 1);

  let newVersion = null;
  if (hasVersionCheck) {
    try { newVersion = await sheetsSetVersion(collection, currentVersion + 1); }
    catch (versionErr) { console.warn('sheetsSetVersion fehlgeschlagen, Daten wurden trotzdem gespeichert: ' + versionErr.message); }
  }
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, version: newVersion }) };
};

const filterEmployeesForAuth = (list, auth) => {
  if (auth?.role === 'admin') return list.map(employeeForAdmin);
  return list.filter(e => !e.viaInvite).map(employeeForPublic);
};

const filterProfileForAuth = (list, auth) => {
  if (auth?.role === 'admin') return list;
  if (auth?.role === 'employee') return list.filter(s => s.id === auth.employeeId);
  return [];
};

// Ein Mitarbeiter-Token bleibt bis zu 180 Tage signaturgültig. Damit ein
// Admin-"PIN Reset" (main.jsx resetPin) ein bereits ausgestelltes Token auch
// wirklich sofort entwertet (z. B. bei verlorenem Handy), wird pinVersion —
// bei jeder PIN-Änderung hochgezählt, siehe employee-session.js — gegen den
// aktuellen Stand geprüft. Ohne diese Prüfung würde "PIN Reset" nur künftige
// PIN-Logins blockieren, ein schon ausgestelltes Token aber weiter greifen.
const resolveAuth = async (auth) => {
  if (!auth || auth.role !== 'employee') return auth;
  const list = await loadCollection('employees');
  const emp = list.find(e => e.id === auth.employeeId);
  if (!emp) return null;
  if ((auth.pinVersion || 0) !== (emp.pinVersion || 0)) return null;
  return auth;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  try {
    const auth = await resolveAuth(getAuth(event)); // null | {role:'admin',...} | {role:'employee', employeeId, pinVersion}

    if (event.httpMethod === 'GET') {
      const col = event.queryStringParameters?.collection;
      if (!col) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'collection fehlt' }) };

      if (col === 'all') {
        const raw = await sheetsBatchGetAll(ALL_COLLECTIONS);
        const employees = filterEmployeesForAuth(raw.employees.map(rowToObj).filter(Boolean), auth);
        const profile = filterProfileForAuth(raw.profile.map(rowToObj).filter(Boolean), auth);
        const versionEntries = await Promise.all(ALL_COLLECTIONS.map(async name => [name, await sheetsGetVersion(name)]));
        const versions = Object.fromEntries(versionEntries);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data: { employees, profile }, versions }) };
      }

      if (col === 'employees') {
        const list = await loadCollection('employees');
        const data = filterEmployeesForAuth(list, auth);
        const version = await sheetsGetVersion('employees');
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data, version }) };
      }

      if (col === 'profile') {
        const list = await loadCollection('profile');
        const data = filterProfileForAuth(list, auth);
        const version = await sheetsGetVersion('profile');
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data, version }) };
      }

      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'unbekannte collection' }) };
    }

    if (event.httpMethod === 'POST') {
      const { collection, action, payload, expectedVersion } = JSON.parse(event.body || '{}');
      if (!collection || !action) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'collection/action fehlt' }) };

      if (action === 'set') {
        if (!Array.isArray(payload)) {
          return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_payload', collection, message: 'Schreibvorgang abgelehnt: Payload fehlt oder ist kein Array. Die Daten wurden nicht verändert.' }) };
        }
        if (!['employees', 'profile'].includes(collection)) {
          return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'unbekannte collection' }) };
        }

        // --- Autorisierung ---
        // "employees": ausschließlich Admin (Hinzufügen/Löschen/PIN-Reset).
        // Das erstmalige PIN-Festlegen und der normale Login laufen seit dem
        // 20.07.2026-Fix über employee-session.js, nicht mehr hier. Admin
        // schreibt hier weiterhin das komplette Array (Read-Modify-Write,
        // wie im Frontend seit je) — das bleibt so, mit normaler OCC-Prüfung.
        if (collection === 'employees') {
          if (auth?.role !== 'admin') {
            return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'forbidden', message: 'Für diese Änderung ist eine Verwaltungs-Anmeldung nötig.' }) };
          }
          return await writeWholeArray(collection, payload, expectedVersion);
        }

        // "profile": Admin darf das komplette Array schreiben (Read-Modify-
        // Write wie bisher). Eine angemeldete Person darf NUR ihren eigenen
        // Datensatz verändern — ihr GET liefert ohnehin nur diesen einen
        // Eintrag (siehe filterProfileForAuth), das Frontend kann also gar
        // nicht die volle Liste zurücksenden. Statt "alle anderen Zeilen
        // müssen unverändert mitgeschickt werden" (unmöglich bei nur einem
        // bekannten Datensatz) wird der eigene Eintrag serverseitig in den
        // aktuellen Gesamtstand gemergt. Kein Versions-Konflikt zwischen
        // zwei verschiedenen Personen möglich, da jede nur ihre eigene Zeile
        // berührt — der geteilte Versionszähler wird trotzdem hochgezählt,
        // damit Admin-Polling konsistent bleibt.
        if (!auth) return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'forbidden', message: 'Bitte zuerst anmelden.' }) };

        if (auth.role === 'admin') return await writeWholeArray(collection, payload, expectedVersion);

        // auth.role === 'employee'
        const own = payload.find(x => x && x.id === auth.employeeId);
        if (!own) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'missing_own_record', message: 'Der eigene Datensatz fehlt im Speichervorgang.' }) };

        // Bis zu 2 Versuche bei gleichzeitiger Schreib-Kollision — z. B. zwei
        // offene Tabs/Geräte DERSELBEN Person, die kurz hintereinander
        // speichern. Zwischen zwei VERSCHIEDENEN Personen kann es nie
        // kollidieren (jede berührt nur ihre eigene Zeile), aber ohne diese
        // Prüfung könnte ein Tab den Zwischenstand eines anderen Tabs
        // derselben Person stillschweigend überschreiben. Gleiches Muster
        // wie in employee-session.js (claim/login).
        for (let attempt = 0; attempt < 2; attempt++) {
          const version = await sheetsGetVersion('profile');
          const current = await loadCollection('profile');
          const exists = current.some(s => s.id === auth.employeeId);
          const merged = exists ? current.map(s => s.id === auth.employeeId ? own : s) : [...current, own];
          const stillCurrent = await sheetsGetVersion('profile');
          if (stillCurrent !== version) continue; // jemand anders hat währenddessen geschrieben — neu versuchen
          await sheetsUpdate('profile', merged.map(objToRow));
          await sheetsClearRange('profile', merged.length + 1);
          let newVersion = version;
          try { newVersion = await sheetsSetVersion('profile', version + 1); }
          catch (versionErr) { console.warn('sheetsSetVersion fehlgeschlagen, Daten wurden trotzdem gespeichert: ' + versionErr.message); }
          return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, version: newVersion }) };
        }
        return { statusCode: 409, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'version_conflict', message: 'Bitte kurz erneut versuchen.' }) };
      }

      if (action === 'append') {
        // Ungenutzt vom aktuellen Frontend, aber sicherheitshalber ebenso
        // Admin-only (kein unautorisiertes Anhängen von Zeilen).
        if (auth?.role !== 'admin') return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'forbidden' }) };
        await sheetsAppend(collection, [objToRow(payload)]);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Unbekannte action' }) };
    }

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
