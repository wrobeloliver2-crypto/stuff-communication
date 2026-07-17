// EINMAL-SETUP: legt das Google-Sheets-Tabellenblatt "stammdaten" an, falls
// es noch nicht existiert. Neue Collections (siehe ALL_COLLECTIONS in
// data.js) brauchen ein passendes Tabellenblatt — das muss einmalig
// angelegt werden, sheets_light.js kann das nicht selbst (siehe Kommentar
// dort bei VERSIONS_SHEET). Idempotent: mehrfacher Aufruf schadet nicht.
//
// Diese Function wird nach einmaliger Nutzung wieder entfernt (kein
// Dauerbetrieb nötig, unnötige Angriffsfläche).
const { GoogleAuth } = require('google-auth-library');

const SHEET_ID = process.env.GCS_SHEETS_ID;
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  try {
    const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY);
    const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();

    const metaRes = await fetch(`${BASE}/${SHEET_ID}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meta = await metaRes.json();
    if (meta.error) throw new Error(meta.error.message);
    const existing = (meta.sheets || []).map(s => s.properties.title);

    const wanted = ['stammdaten'];
    const toCreate = wanted.filter(t => !existing.includes(t));

    if (toCreate.length === 0) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, created: [], existing }) };
    }

    const res = await fetch(`${BASE}/${SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: toCreate.map(title => ({ addSheet: { properties: { title } } })) }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, created: toCreate }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
