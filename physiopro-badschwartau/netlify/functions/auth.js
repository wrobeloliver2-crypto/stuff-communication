// Server-seitige Prüfung des Verwaltung-Logins für die PhysioPro-Bad-
// Schwartau-Onboarding-Site — eigene, von stuff-communication unabhängige
// Function mit eigener ADMIN_PASSWORD-Umgebungsvariable (eigenes Netlify-
// Projekt), damit ein kompromittiertes Passwort auf der einen Site nicht
// automatisch auch die andere betrifft.
const ADMIN_NAMES = {
  'oliver.wrobel@pilatescompany.de': 'Oliver Wrobel',
  'hanna.wrobel@pilatescompany.de': 'Hanna Wrobel',
};

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { email, password } = JSON.parse(event.body || '{}');
    const expected = process.env.ADMIN_PASSWORD;
    const name = ADMIN_NAMES[String(email || '').toLowerCase().trim()];

    if (!expected) {
      console.error('ADMIN_PASSWORD ist nicht gesetzt — Verwaltung-Login kann niemand nutzen.');
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'server_misconfigured' }) };
    }

    if (name && password === expected) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, name, email }) };
    }
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_credentials' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
