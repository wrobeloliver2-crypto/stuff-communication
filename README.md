# STUFF Intranet

Interner Bereich für PhysioPro Lübeck & Pilates Company: Firmen-News, Tools & Links und der persönliche Bereich (Dialoge mit der Verwaltung).

Seit v3.0 (September 2026) kommen **alle Daten aus dem zentralen Mitarbeiter-Dienst** (`wrobeloliver2-crypto/mitarbeiter-api`, Neon-Datenbank `mitarbeiter`):

- Login: Name + PIN – dieselbe PIN wie in der Zeiterfassung (zentrale Tabelle `zeit_pin`)
- News: Tabelle `nachrichten` (mit Lesebestätigung `nachrichten_gelesen`)
- Persönlicher Bereich: Tabellen `dialoge` / `dialog_beitraege` / `dialog_anhaenge` – dieselben Dialoge erscheinen in der Zeiterfassung
- Tools & Links: Tabelle `apps` (Kacheln = `im_intranet`)
- Mitarbeiterliste und Protokoll: aus der Datenbank

Google Sheets wird **nicht mehr** verwendet. Einzige eigene Function ist `netlify/functions/upload.js` (Datei-Upload nach Google Cloud Storage, Bucket `stuff-intranet-files`); die Dateien werden als Anhänge in der Datenbank referenziert.

## Entwicklung

```bash
npm install
npm run dev      # lokal
npm run build    # Produktion (Netlify baut automatisch aus main)
```

Der Mitarbeiter-Client wird in `index.html` von `https://mitarbeiter-api.netlify.app/mitarbeiter-client.js` geladen; die Domain dieser Seite muss dort in `ALLOWED_ORIGINS` stehen.
