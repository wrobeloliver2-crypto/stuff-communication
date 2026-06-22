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

const sheetsClear = async (sheet) => {
  const token = await getToken();
  const url = `${BASE}/${SHEET_ID}/values/${encodeURIComponent(sheet + '!A1:Z10000')}:clear`;
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

module.exports = { sheetsGet, sheetsClear, sheetsUpdate, sheetsAppend };
