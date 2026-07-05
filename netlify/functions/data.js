const { sheetsGet, sheetsBatchGetAll, sheetsClear, sheetsUpdate, sheetsAppend } = require('./sheets_light');

const ALL_COLLECTIONS = ['news', 'tools', 'messages', 'employees', 'audit'];

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const objToRow = obj => [JSON.stringify(obj)];
const rowToObj = row => { try { return JSON.parse(row[0]); } catch { return null; } };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  try {
    if (event.httpMethod === 'GET') {
      const col = event.queryStringParameters?.collection;
      if (!col) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'collection fehlt' }) };

      // Sonderfall: alle Collections in EINEM Sheets-API-Aufruf statt 5
      // einzelnen. Wird vom Frontend für den periodischen Poll genutzt,
      // um das Google-Sheets-Lese-Kontingent zu schonen (siehe Kommentar
      // bei sheetsBatchGetAll).
      if (col === 'all') {
        const raw = await sheetsBatchGetAll(ALL_COLLECTIONS);
        const data = {};
        for (const name of ALL_COLLECTIONS) {
          data[name] = raw[name].map(rowToObj).filter(Boolean);
        }
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
      }

      const rows = await sheetsGet(col, 'A1:A10000');
      const data = rows.map(rowToObj).filter(Boolean);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    if (event.httpMethod === 'POST') {
      const { collection, action, payload } = JSON.parse(event.body || '{}');
      if (!collection || !action) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'collection/action fehlt' }) };

      if (action === 'set') {
        const incoming = Array.isArray(payload) ? payload : [];

        // SCHUTZ: Leeres Überschreiben ablehnen, wenn bereits Daten vorhanden sind.
        // Fängt den Stale-Closure-Bug ab (Client schickt [] bevor der State geladen ist),
        // serverseitig – wirkt daher unabhängig vom JS-Cache-Stand des Clients.
        if (incoming.length === 0) {
          const existingRows = await sheetsGet(collection, 'A1:A10000');
          const existing = existingRows.map(rowToObj).filter(Boolean);
          if (existing.length > 1) {
            return {
              statusCode: 409,
              headers: HEADERS,
              body: JSON.stringify({
                ok: false,
                error: 'refused_empty_overwrite',
                collection,
                existing: existing.length,
                message: 'Leeres Überschreiben abgelehnt: es sind bereits Einträge vorhanden.'
              })
            };
          }
        }

        await sheetsClear(collection);
        if (incoming.length > 0) {
          await sheetsUpdate(collection, incoming.map(objToRow));
        }
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
      }

      if (action === 'append') {
        await sheetsAppend(collection, [objToRow(payload)]);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Unbekannte action' }) };
    }

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
