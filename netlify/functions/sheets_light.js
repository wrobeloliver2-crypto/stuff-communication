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

module.exports = { sheetsGet, sheetsBatchGetAll, sheetsClear, sheetsClearRange, sheetsUpdate, sheetsAppend };
