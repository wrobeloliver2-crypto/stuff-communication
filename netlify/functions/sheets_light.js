// Leichtgewichtiger Google Sheets Zugriff via direkten HTTP-Requests
// Kein googleapis-Paket nötig

const { GoogleAuth } = require('google-auth-library');

const SHEET_ID = process.env.GCS_SHEETS_ID;
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const getToken = async () => {
  const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
};

const sheetsGet = async (sheet, range) => {
  const token = await getToken();
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(sheet + '!' + range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.values || [];
};

// Liest mehrere Blätter in EINEM einzigen API-Aufruf (statt einem Request pro
// Blatt). Wichtig, um das Google-Sheets-Lese-Kontingent zu schonen: Der
// periodische Poll aus dem Frontend fragt sonst 5 Collections einzeln ab —
// bei mehreren gleichzeitig geöffneten Sessions (z. B. 21 Mitarbeitende)
// summiert sich das schnell zu "Quota exceeded" (Read requests per minute).
const sheetsBatchGetAll = async (sheetNames, range = 'A1:A10000') => {
  const token = await getToken();
  const rangesParam = sheetNames.map(s => `ranges=${encodeURIComponent(s + '!' + range)}`).join('&');
  const url = `${BASE}/${SHEET_ID}/values:batchGet?${rangesParam}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const result = {};
  sheetNames.forEach((name, i) => {
    result[name] = (data.valueRanges && data.valueRanges[i] && data.valueRanges[i].values) || [];
  });
  return result;
};

const sheetsClear = async (sheet) => {
  const token = await getToken();
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(sheet + '!A1:Z10000')}:clear`;
  await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
};

// Leert nur einen Zeilenbereich (z. B. die überschüssigen alten Zeilen NACH
// einem Update), statt das ganze Blatt. Wichtig für Atomizität: Wenn wir
// zuerst die neuen Daten schreiben und ERST DANACH die alten Überhang-Zeilen
// leeren, gibt es nie einen Moment, in dem ein gleichzeitiger Leser (z. B.
// ein anderer Client, der gerade lädt) eine leere oder unvollständige Sicht
// auf die Collection bekommt. Vorher (clear-then-write) gab es genau dieses
// Zeitfenster — und ein Leser, der zufällig genau dann pollte, übernahm den
// unvollständigen Stand lokal als "aktuell".
const sheetsClearRange = async (sheet, fromRow, toRow = 10000) => {
  if (fromRow > toRow) return;
  const token = await getToken();
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(sheet + '!A' + fromRow + ':Z' + toRow)}:clear`;
  await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
};

const sheetsUpdate = async (sheet, values) => {
  const token = await getToken();
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(sheet + '!A1')}?valueInputOption=RAW`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
};

const sheetsAppend = async (sheet, values) => {
  const token = await getToken();
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(sheet + '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
};

// --- Versionierung pro Collection (Optimistic Concurrency Control) ---
//
// Grund: data.js konnte bisher nicht erkennen, ob zwischen dem Laden der
// Daten im Client und dem Speichern ein ANDERER Schreibvorgang auf dieselbe
// Collection dazwischengekommen ist (z. B. zwei gleichzeitig offene
// Admin-Tabs). Der alte Schutz prüfte nur "wird die Collection komplett
// leer" — das erkennt weder einen "Lost Update" (ein Tab überschreibt die
// Änderung eines anderen Tabs mit einem veralteten Stand) noch erklärt es
// dem Server, WARUM ein serverseitig festgestellter Datenstand nicht zum
// erwarteten passt.
//
// Lösung: Eigenes Blatt "_versions" mit einer Zeile pro Collection, Format
// "<collectionName>:<zahl>". Der Client bekommt bei jedem GET die aktuelle
// Version mit und muss sie bei jedem "set" mitschicken. Weicht die
// mitgeschickte Version von der aktuellen ab, wurde die Collection
// inzwischen von woanders verändert — der Schreibvorgang wird mit einer
// eindeutigen Fehlermeldung abgelehnt, statt (wie zuvor) den fremden Stand
// stillschweigend zu überschreiben oder einen generischen 409 zu werfen.
//
// Das "_versions"-Blatt muss VOR der ersten Nutzung einmalig im Google
// Sheet als zusätzliches Tabellenblatt angelegt werden (siehe README-Hinweis
// in data.js). Fehlt es, verhält sich sheetsGetVersion wie Version 0.
const VERSIONS_SHEET = '_versions';

const sheetsGetVersion = async (collection) => {
  try {
    const rows = await sheetsGet(VERSIONS_SHEET, 'A1:A200');
    for (const row of rows) {
      const raw = row[0] || '';
      const idx = raw.lastIndexOf(':');
      if (idx === -1) continue;
      const name = raw.slice(0, idx);
      if (name === collection) {
        const n = parseInt(raw.slice(idx + 1), 10);
        return Number.isFinite(n) ? n : 0;
      }
    }
    return 0; // Collection noch nie versioniert -> Startversion 0
  } catch (err) {
    // "_versions"-Blatt existiert noch nicht o.ä. -> nicht hart fehlschlagen,
    // sondern wie Version 0 behandeln. Sobald das Blatt angelegt wird, greift
    // die Versionierung normal.
    console.warn('sheetsGetVersion: Fallback auf 0 (' + err.message + ')');
    return 0;
  }
};

// Schreibt die neue Versionsnummer für eine Collection. Liest dafür das
// gesamte "_versions"-Blatt, ersetzt/ergänzt die passende Zeile und schreibt
// das Blatt komplett neu (es hat nur eine Handvoll Zeilen, das ist
// unkritisch teuer). Gibt die Version zurück, die tatsächlich geschrieben
// wurde.
const sheetsSetVersion = async (collection, newVersion) => {
  const rows = await sheetsGet(VERSIONS_SHEET, 'A1:A200');
  const entries = new Map();
  for (const row of rows) {
    const raw = row[0] || '';
    const idx = raw.lastIndexOf(':');
    if (idx === -1) continue;
    entries.set(raw.slice(0, idx), raw.slice(idx + 1));
  }
  entries.set(collection, String(newVersion));
  const values = Array.from(entries.entries()).map(([name, v]) => [name + ':' + v]);
  await sheetsUpdate(VERSIONS_SHEET, values);
  return newVersion;
};

module.exports = {
  sheetsGet,
  sheetsBatchGetAll,
  sheetsClear,
  sheetsClearRange,
  sheetsUpdate,
  sheetsAppend,
  sheetsGetVersion,
  sheetsSetVersion,
};
