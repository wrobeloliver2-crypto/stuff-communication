const { Storage } = require('@google-cloud/storage');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const keyJson = process.env.GCS_SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'GCS_SERVICE_ACCOUNT_KEY nicht gesetzt' }) };
    }

    let credentials;
    try {
      credentials = JSON.parse(keyJson);
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'JSON ungültig: ' + e.message }) };
    }

    const storage = new Storage({ credentials, projectId: credentials.project_id });
    const bucket = storage.bucket('stuff-intranet-files');
    const file = bucket.file('test/connection-check.txt');

    // Direkt hochladen — kein buckets.list, kein exists()
    await file.save('Verbindungstest ' + new Date().toISOString(), {
      contentType: 'text/plain',
      metadata: { source: 'gcs-test-function' },
    });

    // Signed URL generieren (1 Stunde gültig)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        project_id: credentials.project_id,
        client_email: credentials.client_email,
        bucket: 'stuff-intranet-files',
        test_file: 'test/connection-check.txt',
        signed_url: url,
        message: 'Upload und Signed URL erfolgreich',
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        project_id: (() => { try { return JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY).project_id; } catch(e) { return 'unbekannt'; } })(),
        error: err.message,
      }),
    };
  }
};
