const { sheetsGet, sheetsBatchGetAll, sheetsClearRange, sheetsUpdate, sheetsAppend, sheetsGetVersion, sheetsSetVersion } = require('./sheets_light');

// Nur zwei Collections — diese Site macht bewusst nur eine Sache
// (Onboarding-Formular + Mitarbeiterverwaltung), kein News/Tools/Postfach.
// "profile" = die Formular-Daten pro Person (ein Datensatz je employee-id).
const ALL_COLLECTIONS = ['employees', 'profile'];

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

      if (col === 'all') {
        const raw = await sheetsBatchGetAll(ALL_COLLECTIONS);
        const data = {};
        for (const name of ALL_COLLECTIONS) {
          data[name] = raw[name].map(rowToObj).filter(Boolean);
        }
        const versionEntries = await Promise.all(
          ALL_COLLECTIONS.map(async name => [name, await sheetsGetVersion(name)])
        );
        const versions = Object.fromEntries(versionEntries);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data, versions }) };
      }

      const rows = await sheetsGet(col, 'A1:A10000');
      const data = rows.map(rowToObj).filter(Boolean);
      const version = await sheetsGetVersion(col);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data, version }) };
    }

    if (event.httpMethod === 'POST') {
      const { collection, action, payload, expectedVersion } = JSON.parse(event.body || '{}');
      if (!collection || !action) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'collection/action fehlt' }) };

      if (action === 'set') {
        // Gleicher Payload-/Versions-/Leer-Schutz wie im Intranet-Projekt
        // (siehe dortiger data.js-Kommentar für den vollen Hintergrund).
        if (!Array.isArray(payload)) {
          return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({
              ok: false,
              error: 'invalid_payload',
              collection,
              message: 'Schreibvorgang abgelehnt: Payload fehlt oder ist kein Array. Die Daten wurden nicht verändert.'
            })
          };
        }
        const incoming = payload;

        const hasVersionCheck = typeof expectedVersion === 'number';
        let currentVersion = null;
        if (hasVersionCheck) {
          currentVersion = await sheetsGetVersion(collection);
          if (currentVersion !== expectedVersion) {
            return {
              statusCode: 409,
              headers: HEADERS,
              body: JSON.stringify({
                ok: false,
                error: 'version_conflict',
                collection,
                expectedVersion,
                currentVersion,
                message: 'Diese Liste wurde inzwischen von einer anderen Sitzung geändert. Bitte die Seite neu laden und die Änderung erneut vornehmen.'
              })
            };
          }
        }

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
                message: 'Leeres Überschreiben abgelehnt: es sind bereits Einträge vorhanden. Bitte die Seite neu laden und erneut versuchen.'
              })
            };
          }
        }

        if (incoming.length > 0) {
          await sheetsUpdate(collection, incoming.map(objToRow));
        }
        await sheetsClearRange(collection, incoming.length + 1);

        let newVersion = null;
        if (hasVersionCheck) {
          try {
            newVersion = await sheetsSetVersion(collection, currentVersion + 1);
          } catch (versionErr) {
            console.warn('sheetsSetVersion fehlgeschlagen, Daten wurden trotzdem gespeichert: ' + versionErr.message);
          }
        }
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, version: newVersion }) };
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
