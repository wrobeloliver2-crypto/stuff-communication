const { sheetsGet, sheetsBatchGetAll, sheetsClearRange, sheetsUpdate, sheetsAppend, sheetsGetVersion, sheetsSetVersion } = require('./sheets_light');

const ALL_COLLECTIONS = ['news', 'tools', 'messages', 'employees', 'audit', 'stammdaten'];

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
        // Versionen aller Collections parallel abfragen (eigenes kleines
        // "_versions"-Blatt, siehe sheets_light.js) statt sequenziell, um die
        // zusätzliche Latenz des periodischen Frontend-Polls gering zu halten.
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
        // SCHUTZ 0 (Payload-Validierung): Ein fehlender oder ungültiger
        // Payload wird HART abgelehnt statt (wie früher) stillschweigend als
        // leeres Array interpretiert. Hintergrund: Der Client-Bug, der die
        // Collections leerte, sendete gar kein "[]", sondern payload:
        // undefined — JSON.stringify lässt undefined-Felder komplett weg,
        // und die alte Koerzierung (Array.isArray ? payload : []) machte
        // daraus ein legitim aussehendes Leeren der gesamten Collection.
        // Mit dieser Prüfung wird JEDER künftige Client-Fehler dieser Art
        // zu einem lauten, harmlosen 400 — die Daten bleiben unberührt.
        // Wirkt serverseitig und damit unabhängig davon, welchen (ggf.
        // gecachten) JS-Bundle-Stand ein Gerät gerade ausführt.
        if (!Array.isArray(payload)) {
          return {
            statusCode: 400,
            headers: HEADERS,
            body: JSON.stringify({
              ok: false,
              error: 'invalid_payload',
              collection,
              message: 'Schreibvorgang abgelehnt: Payload fehlt oder ist kein Array. Die Daten wurden nicht verändert. (Hinweis: veralteter App-Stand im Browser — bitte Seite hart neu laden.)'
            })
          };
        }
        const incoming = payload;

        // SCHUTZ 1 (Versions-Check): Erkennt JEDE Art von "jemand anderes hat
        // die Collection inzwischen verändert" — nicht nur den Spezialfall
        // "komplett leer". Der Client schickt die Version mit, die er beim
        // letzten Laden gesehen hat (expectedVersion). Weicht sie von der
        // aktuellen Sheet-Version ab, hat ein anderer Tab/Gerät zwischen dem
        // Laden und jetzt bereits geschrieben — dieser Schreibvorgang würde
        // die fremde Änderung stillschweigend überschreiben (Lost Update).
        // Wird abgelehnt statt ausgeführt.
        //
        // Abwärtskompatibel: expectedVersion ist optional. Ein Client mit
        // altem, gecachtem JS-Bundle schickt es nicht mit — dann wird NUR der
        // alte Leer-Guard (SCHUTZ 2) angewendet, wie bisher.
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
                message: 'Diese Liste wurde inzwischen von einer anderen Sitzung geändert (z. B. einem zweiten geöffneten Tab oder einer anderen Person). Bitte die Seite neu laden und die Änderung erneut vornehmen.'
              })
            };
          }
        }

        // SCHUTZ 2 (Leer-Guard): Zusätzliches Sicherheitsnetz, unabhängig vom
        // Versions-Check. Fängt insbesondere Clients ohne Versionsprüfung ab
        // (siehe oben) sowie den ursprünglichen Stale-Closure-Bug (Client
        // schickt [] bevor der State geladen ist).
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

        // Nicht-leerer Payload: ERST die neuen Daten schreiben, DANACH nur
        // die überschüssigen alten Zeilen am Ende leeren. So gibt es nie
        // einen Moment, in dem ein gleichzeitiger Leser eine leere oder
        // unvollständige Sicht auf die Collection bekommt (siehe Kommentar
        // bei sheetsClearRange). Das alte Verhalten (erst alles leeren, dann
        // schreiben) erzeugte genau dieses Zeitfenster und war die Ursache
        // für mehrere "Änderung nicht gespeichert"-Fälle, obwohl die
        // eigentliche Aktion der Nutzerin ganz normal war.
        //
        // Sonderfall: incoming.length === 0 kommt nur hierher, wenn beide
        // Guards oben es explizit zugelassen haben (z. B. der letzte von 0/1
        // vorhandenen Einträgen wird bewusst gelöscht). Dann gibt es nichts
        // zu schreiben — nur der vollständige Clear ist nötig.
        if (incoming.length > 0) {
          await sheetsUpdate(collection, incoming.map(objToRow));
        }
        await sheetsClearRange(collection, incoming.length + 1);

        // Version hochzählen, wenn der Client eine Versionsprüfung genutzt
        // hat. Die neue Version geht in der Antwort zurück, damit der Client
        // seinen lokalen Stand sofort übernehmen kann, ohne extra nachzuladen.
        //
        // Eigenes try/catch bewusst getrennt vom Rest: Die eigentlichen
        // Daten (oben) sind an dieser Stelle bereits erfolgreich geschrieben.
        // Würde sheetsSetVersion z. B. wegen eines noch fehlenden
        // "_versions"-Tabellenblatts fehlschlagen, soll das NICHT dazu
        // führen, dass der ganze Request als Fehler beantwortet wird und der
        // Client seine (tatsächlich erfolgreiche) Änderung lokal zurückrollt.
        // Der nächste Schreibvorgang hätte dann zwar wieder keinen
        // Versionsschutz, aber das ist strikt besser als ein falsches
        // Fehlersignal bei einer geglückten Aktion.
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
