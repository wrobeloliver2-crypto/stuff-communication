// EINMAL-Funktion: entfernt das Tabellenblatt "stammdaten" wieder aus dem
// Google Sheet, weil das Stammdaten-Feature aus stuff-communication
// ausgebaut wurde (zieht in eine eigene, separate Onboarding-Site um).
// Nach einmaligem Aufruf wieder löschen (siehe Commit-Historie für das
// Vorbild: setup-stammdaten-sheet.js wurde genauso einmalig verwendet).
const { GoogleAuth } = require('google-auth-library');

const SHEET_ID = process.env.GCS_SHEETS_ID;
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const getToken = async () => {
  const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY);
  const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
};

exports.handler = async () => {
  try {
    const token = await getToken();
    const metaRes = await fetch(`${BASE}/${SHEET_ID}`, { headers: { Authorization: `Bearer ${token}` } });
    const meta = await metaRes.json();
    if (meta.error) return { statusCode: 500, body: JSON.stringify({ ok: false, error: meta.error.message }) };

    const sheet = (meta.sheets || []).find(s => s.properties?.title === 'stammdaten');
    if (!sheet) return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'Blatt "stammdaten" existiert nicht (mehr) — nichts zu tun.' }) };

    const delRes = await fetch(`${BASE}/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: sheet.properties.sheetId } }] }),
    });
    const delJson = await delRes.json();
    if (delJson.error) return { statusCode: 500, body: JSON.stringify({ ok: false, error: delJson.error.message }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true, deletedSheetId: sheet.properties.sheetId }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
