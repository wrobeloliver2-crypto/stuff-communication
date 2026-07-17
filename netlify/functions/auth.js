// Server-seitige Prüfung des Verwaltung-Logins (Oliver & Hanna).
//
// Vorher lag das Passwort als Klartext-Konstante im Client-Bundle
// (main.jsx: ADMIN_CREDENTIALS) und wurde sogar als Hinweistext auf dem
// Login-Bildschirm angezeigt — für jeden Website-Besucher les- und damit
// nutzbar. Seit im Zuge der §613a-Übernahme auch Gehaltsdaten (IBAN,
// Sozialversicherungsnummer, Vertragsscans) über dieses System laufen, ist
// das nicht mehr tragbar. Die Prüfung läuft jetzt ausschließlich hier im
// Backend gegen Umgebungsvariablen, die im Client-Bundle nicht auftauchen.
//
// Bewusst einfach gehalten (ein gemeinsames Passwort für alle hinterlegten
// Admin-E-Mails, kein Hashing/Salting, kein Rate-Limiting) — passend zum
// bisherigen Sicherheitsniveau der App (PIN-Login für Mitarbeiter). Für ein
// System mit dauerhaft sensiblen Lohndaten wäre ein echter Auth-Provider
// (z. B. Netlify Identity, Auth0) der nächste sinnvolle Ausbauschritt.
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
      // Fehlkonfiguration (env var nicht gesetzt) klar von "falsches Passwort"
      // unterscheiden, damit das im Netlify-Function-Log auffällt statt als
      // stiller Dauer-Login-Fehler durchzugehen.
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
