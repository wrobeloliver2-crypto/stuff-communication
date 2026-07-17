// EINMAL-Function: legt das eigene Google Sheet für diese Site an (drei
// Tabellenblätter: employees, profile, _versions) und gibt die neue
// Spreadsheet-ID zurück. Nutzt den bereits gesetzten GCS_SERVICE_ACCOUNT_KEY
// (derselbe Service-Account wie beim Intranet, hier aber für ein neues,
// eigenes Sheet — Datenisolierung). Wird nach einmaligem Aufruf wieder
// entfernt (siehe Kommentar-Muster im Intranet-Projekt für dieselbe Praxis
// bei setup-/cleanup-Functions).
const { GoogleAuth } = require('google-auth-library');

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async () => {
  try {
    const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY);
    const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: 'PhysioPro Bad Schwartau - Onboarding (App-Daten)' },
        sheets: [
          { properties: { title: 'employees' } },
          { properties: { title: 'profile' } },
          { properties: { title: '_versions' } },
        ],
      }),
    });
    const data = await res.json();
    if (data.error) return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: data.error }) };
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, spreadsheetId: data.spreadsheetId }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
