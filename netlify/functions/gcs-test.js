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

    const storage = new Storage({ credentials, projectId: credentials.project_id });
    const bucketName = 'stuff-intranet-files';

    // Erst alle Buckets im Projekt listen
    let allBuckets = [];
    try {
      const [buckets] = await storage.getBuckets();
      allBuckets = buckets.map(b => b.name);
    } catch(e) {
      allBuckets = ['Fehler beim Listen: ' + e.message];
    }

    // Dann spezifischen Bucket prüfen
    let bucketExists = false;
    let bucketError = null;
    try {
      const [exists] = await storage.bucket(bucketName).exists();
      bucketExists = exists;
    } catch(e) {
      bucketError = e.message;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: bucketExists,
        project_id: credentials.project_id,
        client_email: credentials.client_email,
        target_bucket: bucketName,
        bucket_found: bucketExists,
        bucket_error: bucketError,
        all_buckets_visible: allBuckets,
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
