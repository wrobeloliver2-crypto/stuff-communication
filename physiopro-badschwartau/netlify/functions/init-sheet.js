// EINMAL-Function: legt in einem BEREITS existierenden, per Hand erstellten
// Google Sheet (GCS_SHEETS_ID) die drei benötigten Tabellenblätter an:
// employees, profile, _versions. Das Sheet wird NICHT von hier aus neu
// angelegt (das scheitert an der fehlenden Drive-Quota des Service-Accounts,
// 403 PERMISSION_DENIED) — es muss vorher von einem echten Google-Konto
// erstellt und mit dem Service-Account (Editor) geteilt worden sein.
// Wird nach einmaligem Aufruf wieder entfernt.
const { GoogleAuth } = require('google-auth-library');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async () => {
  try {
    const sheetId = process.env.GCS_SHEETS_ID;
    if (!sheetId) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'GCS_SHEETS_ID fehlt' }) };

    const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY);
    const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    const authHeader = { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' };

    // Aktuelle Tabellenblätter auslesen, um Sheet1-ID zu bekommen (zum Umbenennen).
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, { headers: authHeader });
    const meta = await metaRes.json();
    if (meta.error) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, step: 'meta', error: meta.error }) };

    const existingTitles = meta.sheets.map(s => s.properties.title);
    const firstSheetId = meta.sheets[0].properties.sheetId;

    const requests = [];
    // Erstes (Standard-)Tabellenblatt in "employees" umbenennen, falls nötig.
    if (!existingTitles.includes('employees')) {
      requests.push({ updateSheetProperties: { properties: { sheetId: firstSheetId, title: 'employees' }, fields: 'title' } });
    }
    for (const title of ['profile', '_versions']) {
      if (!existingTitles.includes(title)) {
        requests.push({ addSheet: { properties: { title } } });
      }
    }

    if (requests.length > 0) {
      const buRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ requests }),
      });
      const buData = await buRes.json();
      if (buData.error) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, step: 'batchUpdate', error: buData.error }) };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, spreadsheetId: sheetId, before: existingTitles, requestsApplied: requests.length }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
