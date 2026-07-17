// Leichtgewichtiger Google Sheets Zugriff via direkten HTTP-Requests.
// Identisch zum sheets_light.js im STUFF-Intranet-Projekt — bewusst als
// eigene Kopie hier abgelegt (nicht importiert), damit diese Site komplett
// unabhängig deploybar bleibt und ein eigenes Google Sheet (GCS_SHEETS_ID)
// verwendet, das mit dem Intranet-Sheet nichts zu tun hat (Datenisolierung).

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
// Gleiches Muster wie im Intranet-Projekt, siehe dortiger Kommentar für den
// ausführlichen Hintergrund.
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
    return 0;
  } catch (err) {
    console.warn('sheetsGetVersion: Fallback auf 0 (' + err.message + ')');
    return 0;
  }
};

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
  sheetsClearRange,
  sheetsUpdate,
  sheetsAppend,
  sheetsGetVersion,
  sheetsSetVersion,
};
