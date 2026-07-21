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
// 21.07.2026: Auf Wunsch von Oliver von einem einzigen, für Oliver UND Hanna
// gemeinsamen ADMIN_PASSWORD auf zwei echte, individuelle Passwörter
// umgestellt (analog zum bereits so umgesetzten physiopro-badschwartau-
// Login) — Anlass: das unternehmensweite Standard-Zugangsdaten-Dokument rät
// bei Logins mit Zugriff auf sensible Daten (hier: IBAN, Sozialversicherungs-
// nummer, Gehaltsdaten) ausdrücklich von einem geteilten Passwort ab. Jede
// Person hat jetzt ihr eigenes Passwort in einer eigenen Netlify-
// Umgebungsvariable — nicht im Code, da dieses Repo öffentlich auf GitHub
// liegt.
//
// Bewusst weiterhin ohne Hashing/Salting, Rate-Limiting oder Session-Token
// (anders als physiopro-badschwartau) — passt zum bisherigen
// Sicherheitsniveau dieser App. Für ein System mit dauerhaft sensiblen
// Lohndaten wäre ein echter Auth-Provider (z. B. Netlify Identity, Auth0)
// der nächste sinnvolle Ausbauschritt.
const ADMINS = {
  'oliver.wrobel@pilatescompany.de': { name: 'Oliver Wrobel', envVar: 'ADMIN_PASSWORD_OLIVER' },
  'hanna.wrobel@pilatescompany.de': { name: 'Hanna Wrobel', envVar: 'ADMIN_PASSWORD_HANNA' },
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
    const admin = ADMINS[String(email || '').toLowerCase().trim()];

    if (!admin) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_credentials' }) };
    }

    const expected = process.env[admin.envVar];
    if (!expected) {
      // Fehlkonfiguration (env var nicht gesetzt) klar von "falsches Passwort"
      // unterscheiden, damit das im Netlify-Function-Log auffällt statt als
      // stiller Dauer-Login-Fehler durchzugehen.
      console.error(admin.envVar + ' ist nicht gesetzt — Verwaltung-Login für ' + admin.name + ' kann derzeit niemand nutzen.');
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'server_misconfigured' }) };
    }

    if (password === expected) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, name: admin.name, email }) };
    }
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_credentials' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
