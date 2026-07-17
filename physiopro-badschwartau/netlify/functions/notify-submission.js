// Wird aufgerufen, wenn ein Mitarbeiter im Formular auf "Angaben
// übermitteln" klickt (nur möglich, wenn alle Pflichtfelder vollständig
// sind — Prüfung passiert schon im Frontend, hier nochmal defensiv).
// Verschickt eine Zusammenfassungs-Mail an Hanna & Oliver über Microsoft
// Graph (dieselbe App-Registrierung/Umgebungsvariablen-Namen wie im
// physiopro-fragebogen-Projekt: AZURE_CLIENT_ID/SECRET/TENANT_ID,
// MAIL_SENDER, MAIL_RECIPIENT, MAIL_CC). AZURE_CLIENT_SECRET ist ein eigenes,
// zweites Secret derselben Azure-App (17.07. von Oliver angelegt) — beeinflusst
// physiopro-fragebogen nicht.
// Deploy-Trigger 17.07. 10:39 UTC: erzwingt frisches Deploy, damit die
// Function-Runtime den zuletzt gesetzten AZURE_CLIENT_SECRET sicher sieht.
const HEADERS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };

const LABELS = {
  geschlecht: { maennlich: 'männlich', weiblich: 'weiblich', divers: 'divers', unbestimmt: 'unbestimmt' },
  vertragsform: { unbefristet_vz: 'Unbefristet, Vollzeit', unbefristet_tz: 'Unbefristet, Teilzeit', befristet_vz: 'Befristet, Vollzeit', befristet_tz: 'Befristet, Teilzeit' },
  beschaeftigungsart: { haupt: 'Hauptbeschäftigung', neben: 'Nebenbeschäftigung' },
  schulabschluss: { ohne: 'ohne Schulabschluss', haupt_volksschule: 'Haupt-/Volksschulabschluss', mittlere_reife: 'Mittlere Reife/gleichwertig', abitur: 'Abitur/Fachabitur' },
  berufsausbildung: { ohne: 'ohne beruflichen Ausbildungsabschluss', ausbildung: 'Anerkannte Berufsausbildung', meister: 'Meister/Techniker/gleichwertig', bachelor: 'Bachelor', diplom_master: 'Diplom/Magister/Master/Staatsexamen', promotion: 'Promotion' },
};
const lbl = (field, v) => (v && LABELS[field] && LABELS[field][v]) || v || '–';
const d = v => (v === undefined || v === null || v === '') ? '–' : v;

const buildSummary = (name, s) => {
  const lines = [];
  lines.push(`Neue Übermittlung — PhysioPro Bad Schwartau Onboarding`);
  lines.push(`Mitarbeiter/in: ${name}`);
  lines.push(`Übermittelt am: ${s.submittedAt || new Date().toLocaleString('de-DE')}`);
  lines.push('');
  lines.push('— Rolle & Kontakt —');
  lines.push(`Position: ${d(s.position)}`);
  lines.push(`E-Mail: ${d(s.email)}${s.email ? (s.emailConsent ? ' (Einverständnis erteilt)' : ' (KEIN Einverständnis!)') : ''}`);
  lines.push('');
  lines.push('— Persönliche Daten —');
  lines.push(`Name: ${d([s.vorname, s.nachname].filter(Boolean).join(' '))}`);
  lines.push(`Geburtsname: ${d(s.geburtsname)}`);
  lines.push(`Geschlecht: ${lbl('geschlecht', s.geschlecht)}`);
  lines.push(`Adresse: ${d(s.strasse)}, ${d(s.plz)} ${d(s.ort)}`);
  lines.push(`Geburtsdatum: ${d(s.geburtsdatum)}`);
  lines.push(`Geburtsort / -land: ${d(s.geburtsort)} / ${d(s.geburtsland)}`);
  lines.push(`Staatsangehörigkeit: ${d(s.staatsangehoerigkeit)}`);
  lines.push(`Steuer-ID / Klasse: ${d(s.steuerId)} / ${d(s.steuerklasse)}`);
  lines.push(`Konfession: ${d(s.konfession)}`);
  lines.push(`Familienstand: ${d(s.familienstand)} · Kinderfreibeträge: ${d(s.kinderfreibetraege)}`);
  lines.push(`Sozialversicherungsnr.: ${d(s.sozialversicherungsnummer)}`);
  lines.push(`Krankenkasse: ${d(s.krankenkasse)}`);
  lines.push(`IBAN / BIC: ${d(s.iban)} / ${d(s.bic)}`);
  lines.push(`Kontoinhaber: ${s.kontoinhaber || 'wie oben'}`);
  lines.push(`Schwerbehinderung: ${s.schwerbehinderung || 'keine Angabe'}`);
  if ((s.kinder || []).length) {
    lines.push('');
    lines.push('— Kinder —');
    s.kinder.forEach(k => lines.push(`${d([k.vorname, k.name].filter(Boolean).join(' '))}${k.geburtsdatum ? ' · geb. ' + k.geburtsdatum : ''}`));
  }
  lines.push('');
  lines.push('— Beschäftigung —');
  lines.push(`Ersteintrittsdatum: ${d(s.ersteintrittsdatum)}`);
  lines.push(`Ausgeübte Tätigkeit: ${d(s.taetigkeit)}`);
  lines.push(`Haupt-/Nebenbeschäftigung: ${lbl('beschaeftigungsart', s.beschaeftigungsart)}`);
  lines.push(`Geringfügig (Minijob): ${d(s.geringfuegig)}`);
  lines.push(`Weitere Beschäftigung anderswo: ${d(s.nebentaetigkeit)}`);
  lines.push(`Vertragsform: ${lbl('vertragsform', s.vertragsform)}`);
  lines.push(`Urlaubsanspruch: ${s.urlaubsanspruch ? s.urlaubsanspruch + ' Tage/Jahr' : '–'}`);
  if (s.vertragsform === 'befristet_vz' || s.vertragsform === 'befristet_tz') {
    lines.push(`Befristet bis / Vertrag vom: ${d(s.befristetBis)} / ${d(s.befristetAbschluss)}`);
  }
  const WOCHENTAGE = [['mo', 'Mo'], ['di', 'Di'], ['mi', 'Mi'], ['do', 'Do'], ['fr', 'Fr']];
  const az = s.arbeitszeiten || {};
  const azLine = WOCHENTAGE.map(([tag, label]) => {
    const z = az[tag] || {};
    const aktuell = z.aktuellVon || z.aktuellBis ? `${z.aktuellVon || '–'}-${z.aktuellBis || '–'}` : 'frei';
    const wunsch = z.wunschVon || z.wunschBis ? `${z.wunschVon || '–'}-${z.wunschBis || '–'}` : 'frei';
    return `${label} aktuell ${aktuell} / Wunsch ${wunsch}`;
  }).join(' · ');
  lines.push(`Arbeitszeiten (Mo–Fr): ${azLine}`);
  lines.push('');
  lines.push('— Schul- & Berufsausbildung —');
  lines.push(`Höchster Schulabschluss: ${lbl('schulabschluss', s.schulabschluss)}`);
  lines.push(`Höchste Berufsausbildung: ${lbl('berufsausbildung', s.berufsausbildung)}`);
  lines.push('');
  lines.push('— Dokumente —');
  lines.push(`Arbeitsvertrag: ${s.vertrag ? s.vertrag.name + (s.vertrag.url ? ' — ' + s.vertrag.url : '') : 'fehlt'}`);
  const quals = s.qualifikationen || [];
  lines.push(`Qualifikationen & Urkunden (${quals.length}): ${quals.length ? quals.map(q => (q.bezeichnung ? q.bezeichnung + ' — ' : '') + q.name).join(', ') : 'keine'}`);
  if (s.vwl === 'ja') {
    lines.push('');
    lines.push('— Vermögenswirksame Leistungen (VWL) —');
    lines.push(`Empfänger: ${d(s.vwlEmpfaenger)} · Vertragsnr.: ${d(s.vwlVertragsnr)}`);
    lines.push(`Betrag / AG-Anteil: ${d(s.vwlBetrag)} € / ${d(s.vwlAgAnteil)} € · seit ${d(s.vwlSeit)}`);
    lines.push(`IBAN / BIC (VWL): ${d(s.vwlIban)} / ${d(s.vwlBic)}`);
  }
  if ((s.vorbeschaeftigungen || []).length) {
    lines.push('');
    lines.push('— Vorbeschäftigungszeiten im laufenden Kalenderjahr —');
    s.vorbeschaeftigungen.forEach(v => lines.push(`${d(v.von)} bis ${d(v.bis)} · ${d(v.art)}${v.tage ? ' · ' + v.tage + ' Tage' : ''}`));
  }
  lines.push('');
  lines.push('— Für die Gehaltsabrechnung —');
  lines.push(`Bisherige WAZ / Gehalt: ${d(s.wazBisher)} Std. / ${d(s.gehaltBisher)} €`);
  if (s.anmerkung) { lines.push(''); lines.push('— Anmerkungen —'); lines.push(s.anmerkung); }
  lines.push('');
  lines.push(`Erklärung bestätigt: ${s.erklaerungBestaetigt ? 'ja' + (s.erklaerungDatum ? ' (' + s.erklaerungDatum + ')' : '') : 'NEIN'}`);
  return lines.join('\n');
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };

  try {
    const { employeeName, profile } = JSON.parse(event.body || '{}');
    if (!employeeName || !profile) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'employeeName/profile fehlt' }) };

    const { AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, MAIL_SENDER, MAIL_RECIPIENT, MAIL_CC } = process.env;
    if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !AZURE_TENANT_ID || !MAIL_SENDER || !MAIL_RECIPIENT) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Mail-Versand ist serverseitig noch nicht konfiguriert.' }) };
    }

    const tokenRes = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Azure-Token fehlgeschlagen: ' + (tokenData.error_description || tokenData.error || 'unbekannt') }) };
    }

    const content = buildSummary(employeeName, profile);
    const toRecipients = [{ emailAddress: { address: MAIL_RECIPIENT } }];
    const ccRecipients = MAIL_CC ? [{ emailAddress: { address: MAIL_CC } }] : [];

    const mailRes = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_SENDER)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: `PhysioPro Bad Schwartau — Onboarding übermittelt: ${employeeName}`,
          body: { contentType: 'Text', content },
          toRecipients,
          ccRecipients,
        },
        saveToSentItems: true,
      }),
    });

    if (mailRes.status !== 202 && !mailRes.ok) {
      const errBody = await mailRes.text().catch(() => '');
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Graph sendMail fehlgeschlagen: ' + mailRes.status + ' ' + errBody.slice(0, 300) }) };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
