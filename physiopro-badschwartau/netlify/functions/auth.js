// Server-seitige Prüfung des Verwaltung-Logins für die PhysioPro-Bad-
// Schwartau-Onboarding-Site — eigene, von stuff-communication unabhängige
// Function mit eigenen Umgebungsvariablen (eigenes Netlify-Projekt), damit
// ein kompromittiertes Passwort auf der einen Site nicht automatisch auch
// die andere betrifft.
//
// 20.07.2026: liefert bei Erfolg zusätzlich ein signiertes Session-Token
// (24h gültig, siehe session_util.js) — Grundlage dafür, dass /.netlify/
// functions/data künftig nur noch mit gültigem Token Daten herausgibt,
// statt wie bisher offen für jeden erreichbar zu sein.
//
// 20.07.2026 (Nachtrag, Abends): Auf Wunsch von Oliver von einem einzigen,
// für Oliver UND Hanna gemeinsamen ADMIN_PASSWORD auf zwei echte,
// individuelle Passwörter umgestellt (war offener To-do-Punkt in
// PROJECT.md). Jede Person hat jetzt ihr eigenes Passwort in einer eigenen
// Netlify-Umgebungsvariable — NICHT im Code, da dieses Repo öffentlich auf
// GitHub liegt (siehe PROJECT.md/Zugangsdaten-VERTRAULICH.md: Secrets
// grundsätzlich nur als Netlify-Env-Var, nie im Quelltext).
//
// 20.07.2026, 18:54 UTC: ADMIN_PASSWORD_OLIVER/_HANNA erneut gesetzt (erster
// Versuch griff aus unbekanntem Grund nicht am Runtime durch) — dieser
// Kommentar erzwingt einen echten Neu-Build/-Deploy, damit die Functions die
// aktuellen Werte sicher einlesen.
const { mintAdminToken } = require('./session_util');

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
      console.error(admin.envVar + ' ist nicht gesetzt — Verwaltung-Login für ' + admin.name + ' kann derzeit niemand nutzen.');
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'server_misconfigured' }) };
    }

    if (password === expected) {
      const token = mintAdminToken({ email: String(email).toLowerCase().trim(), name: admin.name });
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, name: admin.name, email, token }) };
    }
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'invalid_credentials' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
