// Netlify Function: /api/data
// GET ?collection=news|tools|messages|employees|audit
// POST { collection, action: 'set'|'append'|'delete', payload }

const { readSheet, clearAndWrite, appendRow } = require('./sheets');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Serialisierung: Objekt → Zeile (JSON in einer Zelle)
const objToRow = obj => [JSON.stringify(obj)];
const rowToObj = row => { try { return JSON.parse(row[0]); } catch { return null; } };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  try {
    if (event.httpMethod === 'GET') {
      const col = event.queryStringParameters?.collection;
      if (!col) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'collection fehlt' }) };
      const rows = await readSheet(col, 'A1:A10000');
      const data = rows.map(rowToObj).filter(Boolean);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    if (event.httpMethod === 'POST') {
      const { collection, action, payload } = JSON.parse(event.body || '{}');
      if (!collection || !action) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'collection/action fehlt' }) };

      if (action === 'set') {
        // Komplette Liste ersetzen
        const rows = (payload || []).map(objToRow);
        await clearAndWrite(collection, rows);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
      }

      if (action === 'append') {
        // Einzelnen Eintrag anhängen
        await appendRow(collection, objToRow(payload)[0] ? [JSON.stringify(payload)] : []);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Unbekannte action' }) };
    }

    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
