const { Storage } = require('@google-cloud/storage');
const { Buffer } = require('buffer');

const BUCKET = 'stuff-intranet-files';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/msword': 'doc',
  'application/vnd.ms-excel': 'xls',
};

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY);
    const storage = new Storage({ credentials, projectId: credentials.project_id });

    const contentType = event.headers['content-type'] || '';
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Kein Multipart-Boundary' }) };

    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    const parts = parseMultipart(body, boundary);
    const filePart = parts.find(p => p.filename);
    const folderPart = parts.find(p => p.name === 'folder');

    if (!filePart) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Keine Datei gefunden' }) };
    if (filePart.data.length > MAX_BYTES) return { statusCode: 413, headers, body: JSON.stringify({ error: 'Datei zu groß (max. 10 MB)' }) };
    if (!ALLOWED_TYPES[filePart.mimeType]) return { statusCode: 415, headers, body: JSON.stringify({ error: 'Dateityp nicht erlaubt: ' + filePart.mimeType }) };

    const folder = (folderPart?.value || 'uploads').replace(/[^a-z0-9_-]/gi, '_');
    const ext = ALLOWED_TYPES[filePart.mimeType];
    const safeName = filePart.filename.replace(/[^a-z0-9._-]/gi, '_').slice(0, 80);
    const gcsPath = folder + '/' + Date.now() + '_' + safeName;

    const file = storage.bucket(BUCKET).file(gcsPath);
    await file.save(filePart.data, { contentType: filePart.mimeType, resumable: false });

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ ok: true, path: gcsPath, name: filePart.filename, size: filePart.data.length, mimeType: filePart.mimeType, url: signedUrl }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

function parseMultipart(buffer, boundary) {
  const parts = [];
  const sep = Buffer.from('--' + boundary);
  let pos = 0;
  while (pos < buffer.length) {
    const start = indexOf(buffer, sep, pos);
    if (start === -1) break;
    pos = start + sep.length;
    if (buffer[pos] === 45 && buffer[pos + 1] === 45) break;
    if (buffer[pos] === 13) pos += 2;
    const headerEnd = indexOf(buffer, Buffer.from('\r\n\r\n'), pos);
    if (headerEnd === -1) break;
    const headerStr = buffer.slice(pos, headerEnd).toString();
    pos = headerEnd + 4;
    const nextSep = indexOf(buffer, sep, pos);
    const dataEnd = nextSep === -1 ? buffer.length : nextSep - 2;
    const data = buffer.slice(pos, dataEnd);
    pos = nextSep === -1 ? buffer.length : nextSep;
    const cdMatch = headerStr.match(/Content-Disposition:[^\r\n]*/i);
    const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
    if (!cdMatch) continue;
    const cd = cdMatch[0];
    const nameMatch = cd.match(/name="([^"]+)"/);
    const fileMatch = cd.match(/filename="([^"]+)"/);
    parts.push({
      name: nameMatch?.[1],
      filename: fileMatch?.[1],
      mimeType: ctMatch?.[1]?.trim(),
      data,
      value: data.toString(),
    });
  }
  return parts;
}

function indexOf(buf, search, start = 0) {
  for (let i = start; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}
