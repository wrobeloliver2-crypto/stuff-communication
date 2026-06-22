const { sheetsGet, sheetsClear, sheetsUpdate, sheetsAppend } = require('./sheets_light');

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
      const rows = await sheetsGet(col, 'A1:A10000');
      const data = rows.map(rowToObj).filter(Boolean);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, data }) };
    }

    if (event.httpMethod === 'POST') {
      const { collection, action, payload } = JSON.parse(event.body || '{}');
      if (!collection || !action) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'collection/action fehlt' }) };

      if (action === 'set') {
        await sheetsClear(collection);
        if (payload && payload.length > 0) {
          await sheetsUpdate(collection, payload.map(objToRow));
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
