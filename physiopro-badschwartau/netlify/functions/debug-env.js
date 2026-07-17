// EINMAL-Debug-Function: gibt NUR unkritische Diagnose-Infos über
// GCS_SERVICE_ACCOUNT_KEY zurück (Länge, Zeichen-Codes um die Fehlerstelle),
// NIE den Wert selbst. Wird nach Gebrauch sofort wieder entfernt.
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async () => {
  const raw = process.env.GCS_SERVICE_ACCOUNT_KEY || '';
  const info = {
    length: raw.length,
    first20codes: [...raw.slice(0, 20)].map(c => c.charCodeAt(0)),
  };
  try {
    JSON.parse(raw);
    info.parseOk = true;
  } catch (e) {
    info.parseOk = false;
    info.parseError = e.message;
    const m = /position (\d+)/.exec(e.message);
    if (m) {
      const pos = parseInt(m[1], 10);
      info.errorPos = pos;
      info.around = [...raw.slice(Math.max(0, pos - 15), pos + 15)].map(c => c.charCodeAt(0));
      info.aroundIndexOfError = Math.min(15, pos);
    }
  }
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, info }) };
};
