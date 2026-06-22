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
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'JSON-Key ungültig: ' + e.message }) };
    }

    const storage = new Storage({ credentials });
    const bucketName = process.env.GCS_BUCKET || 'stuff-intranet-files';
    const [exists] = await storage.bucket(bucketName).exists();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        project: credentials.project_id,
        client_email: credentials.client_email,
        bucket: bucketName,
        bucket_exists: exists,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
