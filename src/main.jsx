// v2.1 — Google Sheets Backend
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import logoPhysio from '/logo-physio.svg';
import logoPilates from '/logo-pilates.svg';

const T = {
  bg: '#faf8f4', surface: '#ffffff', line: '#e6e1d6', lineSoft: '#ece7dc',
  ink: '#2b2b28', muted: '#5a584f', faint: '#a39e92',
  green: '#4a5d3a', greenSoft: '#6e8159', mauve: '#b07882', mauveSoft: '#c08a93', chip: '#f4f2eb',
};

// Verwaltung-Login läuft seit der §613a-Übernahme (Gehaltsdaten im System)
// server-seitig über /.netlify/functions/auth — siehe dortiger Kommentar.
// Hier bewusst KEINE Passwörter mehr im Client-Code.
const AUTH_URL = '/.netlify/functions/auth';
const CATEGORIES = ['Ankündigungen', 'Events', 'Info'];
const GROUPS = ['PhysioPro Staff', 'Pilates Trainer', 'PhysioPlus Bad Schwartau', 'Verwaltung'];

const FIRMS = {
  beide:   { label: 'Beide', short: 'PHYSIOPRO & PILATES', dot: 'split' },
  physio:  { label: 'PhysioPro', short: 'PHYSIOPRO', dot: T.green },
  pilates: { label: 'Pilates Company', short: 'PILATES CO.', dot: T.mauve },
};

const EMPLOYEES = [
  { id: 'oliver', name: 'Oliver Wrobel', role: 'Verwaltung', company: 'Beide', pin: null, pinSet: false },
  { id: 'hanna', name: 'Hanna Wrobel', role: 'Verwaltung', company: 'Beide', pin: null, pinSet: false },
  { id: 'anna', name: 'Anna Bath', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'julia', name: 'Julia Mielke', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'tuana', name: 'Tuana Koyulhisarli', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'maike', name: 'Maike Schrader', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'annika', name: 'Annika Zwiener', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'finn', name: 'Finn Meyer', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'phillip', name: 'Phillip Opelka', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'imo', name: 'Imo Thomsen', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'nico', name: 'Nico Neumann', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'luca', name: 'Luca Malz', role: 'Verwaltung', company: 'Beide', pin: null, pinSet: false },
  { id: 'ina', name: 'Ina Schmökel', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'olga', name: 'Olga Uplegger', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'natalia', name: 'Natalia Semenova', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'britta', name: 'Britta Leder', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'laura', name: 'Laura Sachsenhauser', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'paula', name: 'Paula-Charlot Smettons', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'katharina', name: 'Katharina Piesik', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'tina', name: 'Tina Ginap', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'natascha', name: 'Natascha Diestel-Babakerd', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
];

const UPLOAD_URL = '/.netlify/functions/upload';

// Bilder werden vor dem Upload automatisch verkleinert/komprimiert, damit
// Handy-Fotos nicht an der 10-MB-Grenze scheitern — ganz ohne Zusatzschritt.
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.85;

const resizeImageIfNeeded = (file) => new Promise((resolve) => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') { resolve(file); return; }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    let { width, height } = img;
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) { resolve(file); return; }
    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(blob => {
      if (!blob || blob.size >= file.size) { resolve(file); return; }
      resolve(new File([blob], file.name, { type: file.type }));
    }, file.type, IMAGE_QUALITY);
  };
  img.onerror = () => resolve(file);
  img.src = url;
});

const uploadFile = async (file, folder = 'uploads') => {
  const toSend = await resizeImageIfNeeded(file);
  const form = new FormData();
  form.append('file', toSend);
  form.append('folder', folder);
  const res = await fetch(UPLOAD_URL, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Upload fehlgeschlagen');
  return data;
};

const DEFAULT_NEWS = [
  {
    id: 'n_anfragemgmt', firm: 'physio', category: 'Info',
    title: 'PhysioPro Anfragemanagement — professionell aufgestellt für unser Wachstum',
    text: 'PhysioPro Lübeck wächst. Wir werden mehr, wir kommen weiter — und genau deshalb stellen wir uns auch dort professionell auf, wo unsere Zukunft beginnt: bei der Gewinnung neuer Patientinnen und Patienten.\n\nMit unserem eigenen Anfragemanagement bündeln wir ab sofort jede eingehende Anfrage an einer zentralen Stelle und führen sie auf einem klaren Weg von „eingegangen" bis „erledigt". Jede Anfrage bekommt ihren festen Platz, eine eindeutige Zuständigkeit und einen nachvollziehbaren Verlauf. Nichts geht verloren, niemand wird vergessen, und jede Anfrage wird so schnell und verbindlich beantwortet, wie es Menschen erwarten dürfen, die sich uns anvertrauen.\n\nDas ist mehr als ein Werkzeug — es ist ein Bekenntnis dazu, wie wir arbeiten wollen: aufmerksam, verlässlich und auf der Höhe der Zeit. Jeder erste Kontakt ist die Chance, einen Menschen langfristig für PhysioPro zu gewinnen. Diese Chance wollen wir nicht dem Zufall überlassen.\n\nSo gestalten wir die Zukunft von PhysioPro Lübeck — Schritt für Schritt, mit einem Team, das wächst, und mit Strukturen, die mit uns mitwachsen.',
    photos: [], link: null, linkLabel: null, eventDate: null, attachment: null, created: '22.06.2026, 09:00',
  },
];

const DEFAULT_TOOLS = [
  { id: 't1', abbr: 'ZE', title: 'Zeiterfassung', desc: 'Arbeitszeiten erfassen und einsehen', link: 'https://physiozeiterfassung.netlify.app', firm: 'physio' },
  { id: 't2', abbr: 'TA', title: 'Trainer App', desc: 'Wird gerade überarbeitet — bald noch einfacher.', link: '', firm: 'pilates', soon: true },
  { id: 't3', abbr: 'FB', title: 'Fahrtenbuch', desc: 'Dienstfahrten dokumentieren', link: 'https://physiofahrtenbuch.netlify.app', firm: 'physio' },
];

const API = '/.netlify/functions/data';

// Schlüssel für die dauerhafte Mitarbeiter-Session (localStorage). Enthält
// NUR die Mitarbeiter-ID und den PIN — dient dazu, nach einem Neuladen der
// Seite automatisch wieder einzuloggen. Der Admin-Login bleibt bewusst
// session-los (kein Speichern), sodass dort weiterhin bei jedem Neuladen
// E-Mail + Passwort eingegeben werden müssen.
const EMP_SESSION_KEY = 'stuff_employee_session';
const saveEmpSession = (id, pin) => {
  try { localStorage.setItem(EMP_SESSION_KEY, JSON.stringify({ id, pin })); } catch (e) {}
};
const clearEmpSession = () => {
  try { localStorage.removeItem(EMP_SESSION_KEY); } catch (e) {}
};
const loadEmpSession = () => {
  try { return JSON.parse(localStorage.getItem(EMP_SESSION_KEY) || 'null'); } catch (e) { return null; }
};

// Verhindert, dass der automatische Hintergrund-Sync eine gerade erst
// gespeicherte Änderung sofort wieder mit veralteten Sheets-Daten überschreibt:
// Solange ein Schreibvorgang läuft (oder gerade eben lief), setzt der Sync aus.
let pendingWrites = 0;
let writeCooldownUntil = 0;
const isWriteInProgressOrRecent = () => pendingWrites > 0 || Date.now() < writeCooldownUntil;

// Gibt jetzt zusätzlich die Sheets-Version der Collection zurück (siehe
// versionsRef weiter unten). apiGet (Einzelabfrage) wird aktuell nirgends
// aufgerufen, aber für Konsistenz mit apiGetAll ebenfalls angepasst.
const apiGet = async (collection) => {
  const res = await fetch(`${API}?collection=${collection}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return { items: data.data, version: data.version };
};

// Holt alle 5 Collections in EINEM Request statt 5 einzelnen Aufrufen.
// Wichtig für das Google-Sheets-Lese-Kontingent: Bei mehreren gleichzeitig
// geöffneten Sessions (bis zu 21 Mitarbeitende) summierten sich die
// bisherigen 5 Einzelabfragen pro Poll schnell zu "Quota exceeded".
//
// Liefert jetzt zusätzlich "versions" mit (eine Zahl pro Collection). Das
// Frontend merkt sich diese Stände in versionsRef und schickt sie bei jedem
// Schreibvorgang als expectedVersion mit — Grundlage der serverseitigen
// Konflikterkennung in data.js (siehe Kommentar dort: SCHUTZ 1).
const apiGetAll = async () => {
  const res = await fetch(`${API}?collection=all`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return { items: data.data, versions: data.versions || {} }; // items: { news, tools, messages, employees, audit }
};

// Beide Funktionen geben jetzt { ok, status, body } zurück, statt die
// Server-Antwort zu ignorieren. So kann der Aufrufer (commit()) erkennen,
// ob der Schreibvorgang wirklich angenommen wurde (z. B. vom serverseitigen
// Schutz gegen leeres Überschreiben oder — neu — einem Versions-Konflikt mit
// 409 abgelehnt) und entsprechend reagieren, statt einen fehlgeschlagenen
// Schreibvorgang lokal als Erfolg zu behandeln.
//
// expectedVersion: die zuletzt vom Server gesehene Version dieser Collection
// (aus versionsRef). Wird an data.js durchgereicht, das damit erkennt, ob
// zwischenzeitlich ein ANDERER Tab/Gerät bereits geschrieben hat (siehe
// Kommentar dort: SCHUTZ 1 — version_conflict). Optional: Aufrufer, die
// (noch) keine Version kennen, übergeben undefined — der Server fällt dann
// auf den alten Leer-Guard zurück.
const apiSet = async (collection, payload, expectedVersion) => {
  pendingWrites++;
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, action: 'set', payload, expectedVersion }),
    });
    let body = null;
    try { body = await res.json(); } catch (e) {}
    return { ok: res.ok && body?.ok !== false, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: err.message } };
  } finally {
    pendingWrites--;
    writeCooldownUntil = Date.now() + 3000;
  }
};

const apiAppend = async (collection, payload) => {
  pendingWrites++;
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, action: 'append', payload }),
    });
    let body = null;
    try { body = await res.json(); } catch (e) {}
    return { ok: res.ok && body?.ok !== false, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: err.message } };
  } finally {
    pendingWrites--;
    writeCooldownUntil = Date.now() + 3000;
  }
};

const App = () => {
  const [page, setPage] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState(EMPLOYEES);
  const [news, setNews] = useState([]);
  const [tools, setTools] = useState(DEFAULT_TOOLS);
  const [messages, setMessages] = useState([]);
  const [audit, setAudit] = useState([]);
  // Stammdaten der §613a-Übernahme (Bad Schwartau) und perspektivisch aller
  // Mitarbeitenden: ein Datensatz pro Person, id = Mitarbeiter-id (siehe
  // saveStammdaten unten — Upsert statt Append, damit erneutes Speichern
  // denselben Datensatz aktualisiert statt Duplikate anzulegen).
  const [stammdaten, setStammdaten] = useState([]);
  // Wird true, sobald die Daten mindestens einmal erfolgreich von den Sheets
  // geladen wurden. Vorher darf NICHTS ins Sheet geschrieben werden, sonst
  // könnte ein leerer Anfangszustand echte Daten überschreiben.
  const dataLoaded = useRef(false);
  // Merkt sich pro Collection die zuletzt vom Server gesehene Version
  // (siehe apiGetAll/apiSet und SCHUTZ 1 in data.js). Bewusst ein Ref statt
  // State: Der Wert wird nie direkt gerendert, sondern nur von commit()
  // synchron gelesen und aktualisiert — ein State-Update würde hier nur
  // unnötige Re-Renders verursachen und könnte durch React-Batching sogar
  // zu genau der Art von veraltetem Lesen führen, die dieser Mechanismus
  // eigentlich verhindern soll.
  const versionsRef = useRef({});
  // Synchrone Quelle der Wahrheit für alle Collections. Grund (KERNURSACHE
  // des "leerer Payload"-Bugs): commit() hat bisher den aktuellen Stand als
  // Nebeneffekt AUS dem setState-Updater gelesen — React führt Updater aber
  // nur dann synchron aus, wenn auf der Komponente kein anderes Update
  // aussteht ("eager state"-Optimierung). Stand bereits ein Update an (z. B.
  // ein setNews aus loadAll direkt davor, oder ein gerade eingetroffener
  // Poll), lief der Updater erst später im Render — "next" war zum Zeitpunkt
  // des Requests noch undefined, JSON.stringify ließ das payload-Feld ganz
  // weg, und der Server interpretierte das als leeres Array. Folge: Leer-
  // Guard-409 beim Löschen bzw. (vor Einführung des Guards) komplett
  // geleerte Collections im Sheet. Dieses Ref wird bei jedem Laden und jedem
  // Schreiben synchron mitgeführt — commit() liest NUR noch hieraus, nie
  // mehr aus einem Updater-Nebeneffekt.
  const dataRef = useRef({ news: [], tools: DEFAULT_TOOLS, messages: [], employees: EMPLOYEES, audit: [], stammdaten: [] });
  // Verhindert, dass der Versuch, eine gespeicherte Mitarbeiter-Session
  // wiederherzustellen, bei JEDEM periodischen 20-Sekunden-Reload erneut
  // läuft (der useEffect unten hat ein leeres Dependency-Array, "user" wäre
  // dort sonst eine veraltete Kopie von null).
  const sessionRestoreAttempted = useRef(false);

  // Laden von den Sheets — beim Start, danach automatisch alle 20 Sekunden
  // und sobald der Tab wieder in den Vordergrund kommt (z. B. nach Tab-Wechsel).
// Selbstheilung gegen Einträge ohne "id"-Feld: Kann passieren, wenn Daten
// nicht über die App selbst angelegt wurden, sondern direkt ins Google
// Sheet geschrieben wurden (z. B. Seed-Content aus einer Chat-Session ohne
// das App-eigene addNews). Ohne id kollidieren React-Keys (mehrere
// Einträge mit key=undefined) und delNews/updateNews können den falschen
// oder gar keinen Eintrag treffen, je nachdem was der Nutzer anklickt.
// Vergibt fehlenden Einträgen eine stabile id, in Einfüge-Reihenfolge
// versetzt (damit garantiert keine Kollision mit vorhandenen numerischen
// Date.now()-ids entsteht) und markiert das Ergebnis, damit der Aufrufer
// weiß, ob geschrieben werden muss.
const backfillMissingIds = (items) => {
  let fixedCount = 0;
  const seen = new Set(items.map(x => x.id).filter(id => id !== undefined && id !== null));
  const fixed = items.map((item, i) => {
    if (item.id !== undefined && item.id !== null) return item;
    fixedCount++;
    let candidate = 'auto_' + Date.now() + '_' + i;
    while (seen.has(candidate)) candidate = candidate + '_';
    seen.add(candidate);
    return { ...item, id: candidate };
  });
  return { items: fixed, fixedCount };
};

  useEffect(() => {
    const loadAll = async () => {
      if (isWriteInProgressOrRecent()) return;
      try {
        const { items, versions } = await apiGetAll();
        const { news: n, tools: t, messages: m, employees: e, audit: a, stammdaten: sd } = items;
        // Versionsstände und dataLoaded MÜSSEN vor den backfillMissingIds-
        // Aufrufen unten gesetzt werden: commit() (aufgerufen für die
        // Backfill-Korrektur) prüft dataLoaded.current als allererstes und
        // würde sich sonst selbst blockieren, und braucht den aktuellen
        // Versionsstand als expectedVersion.
        versionsRef.current = { ...versionsRef.current, ...versions };
        dataLoaded.current = true;

        if (n.length) {
          const { items: fixedNews, fixedCount } = backfillMissingIds(n);
          dataRef.current.news = fixedNews;
          setNews(fixedNews);
          if (fixedCount > 0) {
            console.warn('news: ' + fixedCount + ' Einträge ohne id gefunden, wird korrigiert und gespeichert.');
            commit(setNews, 'news', () => fixedNews, true);
          }
        } else dataRef.current.news = [];
        if (t.length) {
          const { items: fixedTools, fixedCount } = backfillMissingIds(t);
          dataRef.current.tools = fixedTools;
          setTools(fixedTools);
          if (fixedCount > 0) {
            console.warn('tools: ' + fixedCount + ' Einträge ohne id gefunden, wird korrigiert und gespeichert.');
            commit(setTools, 'tools', () => fixedTools, true);
          }
        } else { dataRef.current.tools = DEFAULT_TOOLS; setTools(DEFAULT_TOOLS); }
        if (m.length) { dataRef.current.messages = m; setMessages(m); }
        if (e.length) { dataRef.current.employees = e; setEmployees(e); } else { dataRef.current.employees = EMPLOYEES; setEmployees(EMPLOYEES); }
        if (a.length) { dataRef.current.audit = a; setAudit(a); }
        if (sd && sd.length) { dataRef.current.stammdaten = sd; setStammdaten(sd); }

        // Gespeicherte Mitarbeiter-Session wiederherstellen — nur beim
        // allerersten Laden, per ref abgesichert (siehe Kommentar oben bei
        // sessionRestoreAttempted).
        if (!sessionRestoreAttempted.current) {
          sessionRestoreAttempted.current = true;
          const saved = loadEmpSession();
          if (saved) {
            const empList = e.length ? e : EMPLOYEES;
            const match = empList.find(x => x.id === saved.id && x.pinSet && x.pin === saved.pin);
            if (match) {
              setUser(match);
              setPage('employee');
            } else {
              clearEmpSession(); // PIN wurde zurückgesetzt o.ä. — Session ungültig
            }
          }
        }
      } catch (err) {
        console.warn('Sheets nicht erreichbar:', err.message);
      }
    };

    loadAll().finally(() => setLoading(false));

    const interval = setInterval(loadAll, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') loadAll(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const logA = async (action, who, detail) => {
    const entry = { id: Date.now() + Math.random(), ts: new Date().toLocaleString('de-DE'), action, who, detail };
    setAudit(a => [entry, ...a]);
    await apiAppend('audit', entry);
  };

  const pinSetup = async (id, pin) => {
    let emp;
    await commit(setEmployees, 'employees', prev => {
      const next = prev.map(e => e.id === id ? { ...e, pin, pinSet: true } : e);
      emp = next.find(e => e.id === id);
      return next;
    });
    setUser(emp);
    setPage('employee');
    saveEmpSession(emp.id, pin);
    await logA('PIN gesetzt', emp.name, 'Erstanmeldung');
  };

  const employeeLogin = async (id, pin) => {
    const emp = employees.find(e => e.id === id);
    if (emp && emp.pinSet && emp.pin === pin) {
      setUser(emp);
      setPage('employee');
      saveEmpSession(emp.id, pin);
      await logA('Login', emp.name, 'Mitarbeiter');
    } else alert('PIN falsch');
  };

  const adminLogin = async (email, pw) => {
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();
      if (data.ok) {
        setUser({ name: data.name, email: data.email, isAdmin: true });
        setPage('admin');
        await logA('Login', data.name, 'Admin');
      } else if (data.error === 'server_misconfigured') {
        alert('Verwaltung-Login ist aktuell nicht konfiguriert (fehlendes Server-Passwort). Bitte Oliver informieren.');
      } else {
        alert('E-Mail oder Passwort falsch');
      }
    } catch (err) {
      alert('Login gerade nicht erreichbar: ' + err.message);
    }
  };

  const logout = () => { setUser(null); setPage('login'); clearEmpSession(); };

  // Schreibt eine Collection immer auf Basis des AKTUELLSTEN States (funktionale
  // Form), nie auf Basis einer veralteten Closure-Kopie. Das verhindert, dass
  // eine schnelle Folge von Änderungen (oder ein dazwischenfunkender Sync) einen
  // alten Stand ins Sheet zurückschreibt.
  //
  // Drei Schutzmechanismen gegen Datenverlust:
  // 1. Es wird NIE geschrieben, bevor die Daten mindestens einmal erfolgreich
  //    von den Sheets geladen wurden (sonst könnte der leere Anfangszustand
  //    echte Daten überschreiben).
  // 2. Versions-Check (neu): Der Server vergleicht die hier mitgeschickte
  //    Version (versionsRef) mit seinem aktuellen Stand. Hat zwischenzeitlich
  //    ein anderer Tab/Gerät auf dieselbe Collection geschrieben, lehnt der
  //    Server ab, statt die fremde Änderung stillschweigend zu überschreiben
  //    — das war die Ursache dafür, dass Bearbeiten/Löschen gelegentlich
  //    fehlschlug oder Änderungen anderer Sitzungen verloren gingen, wenn
  //    mehrere Admin-Sessions gleichzeitig offen waren.
  // 3. Ein Schreibvorgang, der eine zuvor gefüllte Collection auf KOMPLETT LEER
  //    setzen würde, wird zusätzlich blockiert (Schutz vor versehentlichem
  //    „alles weg", greift auch wenn aus irgendeinem Grund keine Version
  //    bekannt ist).
  const commit = async (setter, collection, transform, silent = false) => {
    if (!dataLoaded.current) {
      console.warn('Schreibvorgang blockiert: Daten noch nicht geladen (' + collection + ')');
      return;
    }
    // KERNURSACHEN-FIX: Der Stand wird SYNCHRON aus dataRef gelesen, nicht
    // mehr als Nebeneffekt aus dem setState-Updater. React garantiert
    // nämlich NICHT, dass ein Updater synchron läuft: Steht auf der
    // Komponente bereits ein anderes Update an (z. B. ein setNews aus
    // loadAll oder ein gerade eingetroffener Poll), führt React den Updater
    // erst später im Render aus — prevSnapshot/next waren dann beim Bauen
    // des Requests noch undefined, JSON.stringify ließ "payload" weg, und
    // der Server sah ein leeres Array. Das war die tatsächliche Ursache
    // sowohl der 409-Fehler beim Löschen als auch der komplett geleerten
    // Collections (der stille Backfill-commit direkt nach setNews traf
    // diesen Pfad bei JEDEM Laden deterministisch).
    const prevSnapshot = dataRef.current[collection];
    const next = transform(prevSnapshot);
    if (next === prevSnapshot) return; // No-Op (z. B. Verschieben am Listenrand) — nichts zu schreiben
    if (!Array.isArray(next)) {
      console.error('Schreibvorgang blockiert: transform lieferte kein Array (' + collection + ')');
      return;
    }
    if (next.length === 0 && prevSnapshot.length > 1) {
      console.warn('Schreibvorgang blockiert: würde ' + collection + ' komplett leeren (' + prevSnapshot.length + ' Einträge)');
      return;
    }
    dataRef.current[collection] = next;
    setter(next); // Anzeige optimistisch aktualisieren
    // Jetzt prüfen, ob der Server den Schreibvorgang wirklich angenommen hat.
    // Falls nicht (z. B. 409 durch Versions-Konflikt oder den Leer-Guard,
    // Netzwerkfehler o. ä.), wird der lokale Stand zurückgerollt und der
    // Fehler sichtbar gemacht — statt stumm einen fehlgeschlagenen Vorgang
    // als Erfolg zu zeigen.
    const expectedVersion = versionsRef.current[collection];
    const result = await apiSet(collection, next, expectedVersion);
    if (!result.ok) {
      dataRef.current[collection] = prevSnapshot;
      setter(prevSnapshot);
      const isVersionConflict = result.body?.error === 'version_conflict';
      const reason = result.body?.message || result.body?.error || ('HTTP ' + result.status);
      // silent: Für automatische Hintergrund-Korrekturen (z. B. den
      // id-Backfill in loadAll), bei denen der Nutzer nichts angeklickt hat.
      // Ein alert() wäre dort verwirrend ("Gleichzeitige Änderung erkannt"
      // direkt nach dem Laden, ohne eigenes Zutun) — die Konsole reicht,
      // der nächste loadAll()-Zyklus versucht die Korrektur ohnehin erneut.
      if (silent) {
        console.warn('Automatischer Hintergrund-Schreibvorgang fehlgeschlagen (' + collection + '): ' + reason);
      } else if (isVersionConflict) {
        // Bei einem erkannten Versions-Konflikt bekommt der Nutzer eine klare
        // Ursache ("eine andere Sitzung hat das inzwischen geändert") und eine
        // konkrete Handlungsoption (neu laden + erneut versuchen), statt nur
        // "Grund: version_conflict". Der servergenerierte Text in
        // result.body.message ist bereits so formuliert; hier wird er nur mit
        // einer kurzen Kopfzeile eingerahmt, um ihn vom generischen Fall
        // (z. B. Netzwerkfehler) optisch abzuheben.
        alert('Gleichzeitige Änderung erkannt\n\n' + reason);
      } else {
        alert('Änderung konnte NICHT gespeichert werden und wurde rückgängig gemacht.\n\nGrund: ' + reason);
      }
    } else if (typeof result.body?.version === 'number') {
      // Erfolgreich gespeichert: neuen Versionsstand übernehmen, damit der
      // NÄCHSTE Schreibvorgang aus diesem Tab gegen den aktuellen Stand
      // prüft, statt sofort wieder in einen (jetzt falschen) Konflikt zu
      // laufen.
      versionsRef.current[collection] = result.body.version;
    }
    return result;
  };

  const addNews = async n => {
    const entry = { ...n, id: Date.now(), created: new Date().toLocaleString('de-DE') };
    await commit(setNews, 'news', prev => [entry, ...prev]);
    await logA('News erstellt', user.name, n.title + ' (' + FIRMS[n.firm].label + ')');
  };

  const updateNews = async (id, n) => {
    await commit(setNews, 'news', prev => prev.map(e => e.id === id ? { ...e, ...n, id, updated: new Date().toLocaleString('de-DE') } : e));
    await logA('News bearbeitet', user.name, n.title);
  };

  // Soft-Delete statt Hard-Delete: Setzt nur ein "deleted"-Flag, statt den
  // Eintrag aus dem Array zu entfernen. Grund: Ein echtes Entfernen
  // (filter) verkürzt das Array, und genau das löste bislang — aus einem
  // noch nicht restlos geklärten Grund — wiederholt den serverseitigen
  // "Leeres Überschreiben abgelehnt"-Schutz aus, obwohl weiterhin mehrere
  // Einträge übrig blieben. Mit map() (wie bei updateNews) bleibt next
  // IMMER genauso lang wie zuvor — der Schutzmechanismus, der auf
  // Array-Verkürzung reagiert, wird für Löschvorgänge dadurch komplett
  // umgangen, statt seine genaue Auslösebedingung weiter zu jagen.
  // Gelöschte Einträge werden beim Anzeigen herausgefiltert (siehe News/
  // AdminNews weiter unten), bleiben aber im Sheet erhalten — kein
  // Datenverlust, und bei Bedarf später als Papierkorb nutzbar.
  const delNews = async id => {
    await commit(setNews, 'news', prev => prev.map(e => e.id === id ? { ...e, deleted: true, deletedAt: new Date().toLocaleString('de-DE') } : e));
    await logA('News gelöscht', user.name, '#' + id);
  };

  // Verschiebt einen News-Eintrag in der Anzeige-Reihenfolge nach oben (-1)
  // oder unten (+1). Die Anzeige-Reihenfolge IST die Array-Reihenfolge im
  // Sheet — verschieben heißt also: mit dem vorherigen/nächsten SICHTBAREN
  // Eintrag die Plätze tauschen. Soft-gelöschte Einträge liegen unsichtbar
  // dazwischen und werden beim Suchen des Tauschpartners übersprungen,
  // bleiben aber selbst an ihrer Position. Array-Länge und -Inhalt bleiben
  // bis auf die zwei getauschten Positionen unverändert — alle
  // Schutzmechanismen (Leer-Guard, Versions-Check) greifen normal. Am
  // Listenrand ist der Aufruf ein No-Op (commit erkennt die unveränderte
  // Referenz und schreibt nichts).
  const moveNews = async (id, dir) => {
    await commit(setNews, 'news', prev => {
      const from = prev.findIndex(e => e.id === id);
      if (from === -1) return prev;
      let to = from + dir;
      while (to >= 0 && to < prev.length && prev[to].deleted) to += dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const addTool = async t => {
    const entry = { ...t, id: 'tool' + Date.now() };
    await commit(setTools, 'tools', prev => [...prev, entry]);
    await logA('Tool/Link erstellt', user.name, t.title);
  };

  const updateTool = async (id, t) => {
    await commit(setTools, 'tools', prev => prev.map(e => e.id === id ? { ...e, ...t, id } : e));
    await logA('Tool/Link bearbeitet', user.name, t.title);
  };

  const delTool = async id => {
    await commit(setTools, 'tools', prev => prev.filter(t => t.id !== id));
    await logA('Tool/Link gelöscht', user.name, '#' + id);
  };

  const sendMessage = async m => {
    const entry = { ...m, id: Date.now(), created: new Date().toLocaleString('de-DE'), sender: user.name, readBy: [], replies: [], closed: false };
    await commit(setMessages, 'messages', prev => [entry, ...prev]);
    await logA('Nachricht gesendet', user.name, '"' + m.title + '" → ' + [...m.toGroups, ...m.toIndividuals].join(', '));
  };

  const markRead = async id => {
    await commit(setMessages, 'messages', prev => prev.map(m => m.id === id && !m.readBy.some(r => r.id === user.id)
      ? { ...m, readBy: [...m.readBy, { id: user.id, name: user.name, ts: new Date().toLocaleString('de-DE') }] }
      : m));
  };

  const addReply = async (id, text, attachments) => {
    const reply = { from: user.name, text, attachments: attachments || [], ts: new Date().toLocaleString('de-DE') };
    await commit(setMessages, 'messages', prev => prev.map(m => m.id === id ? { ...m, replies: [...(m.replies || []), reply] } : m));
    await logA('Antwort', user.name, 'zu #' + id);
  };

  const closeDialog = async id => {
    await commit(setMessages, 'messages', prev => prev.map(m => m.id === id ? { ...m, closed: true } : m));
    await logA('Dialog beendet', user.name, '#' + id);
  };

  const reopenDialog = async id => {
    await commit(setMessages, 'messages', prev => prev.map(m => m.id === id ? { ...m, closed: false } : m));
    await logA('Dialog wieder geöffnet', user.name, '#' + id);
  };

  // Like: leichte Reaktion, für alle Empfänger derselben Nachricht sichtbar.
  const toggleLike = async id => {
    await commit(setMessages, 'messages', prev => prev.map(m => {
      if (m.id !== id) return m;
      const likes = m.likes || [];
      const already = likes.some(l => l.id === user.id);
      return { ...m, likes: already ? likes.filter(l => l.id !== user.id) : [...likes, { id: user.id, name: user.name }] };
    }));
  };

  // Kommentar: im Unterschied zur privaten "Antwort" für ALLE Empfänger
  // derselben Nachricht sichtbar (z. B. alle Mitglieder einer Gruppe).
  const addComment = async (id, text) => {
    const comment = { from: user.name, fromId: user.id, text, ts: new Date().toLocaleString('de-DE') };
    await commit(setMessages, 'messages', prev => prev.map(m => m.id === id ? { ...m, comments: [...(m.comments || []), comment] } : m));
    await logA('Kommentar', user.name, 'zu #' + id);
  };

  // Termin-Bestätigung: wer zugesagt hat, sieht nur die Verwaltung (Admin-Ansicht).
  // Der einzelne Mitarbeiter sieht ausschließlich seinen eigenen Status.
  const toggleConfirm = async id => {
    await commit(setMessages, 'messages', prev => prev.map(m => {
      if (m.id !== id) return m;
      const confirmedBy = m.confirmedBy || [];
      const already = confirmedBy.some(c => c.id === user.id);
      return { ...m, confirmedBy: already ? confirmedBy.filter(c => c.id !== user.id) : [...confirmedBy, { id: user.id, name: user.name, ts: new Date().toLocaleString('de-DE') }] };
    }));
  };

  const resetPin = async id => {
    await commit(setEmployees, 'employees', prev => prev.map(e => e.id === id ? { ...e, pin: null, pinSet: false } : e));
    await logA('PIN zurückgesetzt', user.name, id);
  };

  // Neue Mitarbeitende bekommen eine eindeutige id (Präfix 'emp' + Zeitstempel,
  // um Kollisionen mit den bestehenden Slug-ids wie 'oliver'/'hanna' sicher
  // auszuschließen) sowie pin: null / pinSet: false — sie legen ihre PIN wie
  // alle anderen beim ersten Login selbst fest (siehe pinSetup).
  const addEmployee = async ({ name, role, company }) => {
    const entry = { id: 'emp' + Date.now(), name, role, company, pin: null, pinSet: false };
    await commit(setEmployees, 'employees', prev => [...prev, entry]);
    await logA('Mitarbeiter angelegt', user.name, name + ' (' + role + ', ' + company + ')');
  };

  // Hard-Delete (filter statt Soft-Delete): anders als bei News verkürzt das
  // Team-Array bei einer einzelnen Löschung praktisch nie auf 0 Einträge
  // (der Leer-Guard in commit()/data.js greift nur bei next.length===0 UND
  // prevSnapshot.length>1), daher unproblematisch — gleiches Muster wie
  // delTool. Bestehende Nachrichten/Protokoll-Einträge, die sich auf die
  // gelöschte id beziehen, bleiben unverändert (nur Referenz auf eine dann
  // nicht mehr existierende Person).
  const delEmployee = async id => {
    const emp = employees.find(e => e.id === id);
    await commit(setEmployees, 'employees', prev => prev.filter(e => e.id !== id));
    await logA('Mitarbeiter gelöscht', user.name, (emp?.name || id));
  };

  // Upsert statt Append: die id des Stammdaten-Datensatzes IST die
  // Mitarbeiter-id (ein Mitarbeiter = ein Datensatz). Erneutes Speichern
  // (z. B. nach einer Korrektur) aktualisiert den bestehenden Eintrag, statt
  // einen zweiten anzulegen.
  const saveStammdaten = async (employeeId, fields) => {
    const employeeName = employees.find(e => e.id === employeeId)?.name || employeeId;
    await commit(setStammdaten, 'stammdaten', prev => {
      const entry = { id: employeeId, ...fields, updated: new Date().toLocaleString('de-DE') };
      const exists = prev.some(s => s.id === employeeId);
      return exists ? prev.map(s => s.id === employeeId ? entry : s) : [...prev, entry];
    });
    await logA('Stammdaten gespeichert', employeeName, employeeId === user?.id ? 'durch Mitarbeiter/in selbst' : 'durch Verwaltung');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#faf8f4', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <BrandHeader right={<span style={{ fontSize: 11, color: '#a39e92', letterSpacing: '0.14em' }}>INTRANET</span>} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e6e1d6', borderTopColor: '#55725f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: '#a39e92', margin: 0 }}>Daten werden geladen …</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (page === 'login') return <Login employees={employees} onPinSetup={pinSetup} onEmployeeLogin={employeeLogin} onAdminLogin={adminLogin} />;
  if (page === 'employee' && user) return <Employee user={user} news={news} tools={tools} messages={messages.filter(m => forMe(m, user))} stammdaten={stammdaten.find(s => s.id === user.id) || null} onSaveStammdaten={fields => saveStammdaten(user.id, fields)} onMarkRead={markRead} onReply={addReply} onToggleLike={toggleLike} onComment={addComment} onToggleConfirm={toggleConfirm} onLogout={logout} />;
  if (page === 'admin' && user?.isAdmin) return <Admin user={user} news={news} tools={tools} messages={messages} employees={employees} audit={audit} stammdaten={stammdaten} onAddNews={addNews} onUpdateNews={updateNews} onDelNews={delNews} onMoveNews={moveNews} onAddTool={addTool} onUpdateTool={updateTool} onDelTool={delTool} onSend={sendMessage} onReply={addReply} onCloseDialog={closeDialog} onReopenDialog={reopenDialog} onResetPin={resetPin} onAddEmployee={addEmployee} onDelEmployee={delEmployee} onLogout={logout} />;
  return null;
};

const ALL_GROUP = 'Alle';
const forMe = (m, u) => m.toIndividuals.includes(u.id) || m.toGroups.includes(u.role) || m.toGroups.includes(ALL_GROUP);

const FirmDot = ({ firm }) => {
  const f = FIRMS[firm] || FIRMS.beide;
  if (f.dot === 'split') return <span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', background: 'linear-gradient(90deg,' + T.green + ' 0 50%,' + T.mauveSoft + ' 50% 100%)' }} />;
  return <span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', background: f.dot }} />;
};
const FirmTag = ({ firm }) => {
  const f = FIRMS[firm] || FIRMS.beide;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '0.08em', color: T.faint, textTransform: 'uppercase' }}><FirmDot firm={firm} />{f.short}</span>;
};
const BrandHeader = ({ right }) => (
  <div style={{ background: T.surface, borderBottom: '1px solid ' + T.lineSoft }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.7rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <img src={logoPhysio} alt="PhysioPro Lübeck" style={{ height: 56 }} />
        <div style={{ width: 1, height: 38, background: T.line }} />
        <img src={logoPilates} alt="Pilates Company Lübeck" style={{ height: 56 }} />
      </div>
      {right}
    </div>
    <div style={{ height: 3, background: 'linear-gradient(90deg,' + T.green + ' 0%,' + T.green + ' 50%,' + T.mauveSoft + ' 50%,' + T.mauveSoft + ' 100%)' }} />
  </div>
);
const Label = ({ children, style }) => <p style={{ fontSize: 10, letterSpacing: '0.16em', color: T.faint, margin: '0 0 0.9rem', textTransform: 'uppercase', ...style }}>{children}</p>;
const Marker = ({ letter, tone }) => {
  const color = tone === 'green' ? T.green : tone === 'mauve' ? T.mauve : T.faint;
  const solid = tone === 'solid';
  return <div style={{ width: 30, height: 30, borderRadius: '50%', border: solid ? 'none' : '1.5px solid ' + color, background: solid ? T.mauveSoft : 'transparent', color: solid ? '#fff' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{letter}</div>;
};
const catLetter = c => ({ 'Ankündigungen': 'A', 'Events': 'E', 'Info': 'I' }[c] || '•');
const catTone = c => ({ 'Ankündigungen': 'mauve', 'Events': 'green', 'Info': 'green' }[c] || 'green');

const isImage = mime => mime && mime.startsWith('image/');

const MAX_ATTACHMENTS = 5;
const attachmentsOf = x => x?.attachments || (x?.attachment ? [x.attachment] : []);

const FileChip = ({ name, url }) => (
  url
    ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, marginRight: 8, padding: '6px 11px', background: T.chip, borderRadius: 6, fontSize: 12, color: T.muted, textDecoration: 'none' }}>↓ {name}</a>
    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, marginRight: 8, padding: '6px 11px', background: T.chip, borderRadius: 6, fontSize: 12, color: T.muted }}>↓ {name}</span>
);

const UploadButton = ({ onUploaded, folder = 'uploads', accept = 'image/*,.pdf,.docx,.xlsx,.doc,.xls', label = '+ Datei anhängen' }) => {
  const ref = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handle = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError('');
    try {
      const result = await uploadFile(file, folder);
      onUploaded(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      ref.current.value = '';
    }
  };
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={handle} />
      <button
        type="button"
        onClick={() => ref.current.click()}
        disabled={loading}
        style={{ padding: '6px 12px', border: '1px dashed ' + T.line, borderRadius: 8, background: T.surface, color: loading ? T.faint : T.muted, fontSize: 12, cursor: loading ? 'default' : 'pointer' }}
      >{loading ? 'Wird hochgeladen …' : label}</button>
      {error && <span style={{ fontSize: 11, color: '#c0392b' }}>{error}</span>}
    </div>
  );
};

const Empty = ({ text }) => <div style={{ textAlign: 'center', padding: '3rem 1rem', color: T.faint, fontSize: 13 }}>{text}</div>;

const Login = ({ employees, onPinSetup, onEmployeeLogin, onAdminLogin }) => {
  const [mode, setMode] = useState('employee');
  const [sel, setSel] = useState(''); const [pin, setPin] = useState('');
  const [np, setNp] = useState(''); const [cp, setCp] = useState('');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const emp = employees.find(e => e.id === sel);
  const inp = { width: '100%', padding: '11px 12px', marginBottom: 12, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: T.surface, color: T.ink };
  const btn = tone => ({ width: '100%', padding: 11, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#fff', background: tone, letterSpacing: '0.03em' });
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader right={<span style={{ fontSize: 11, color: T.faint, letterSpacing: '0.14em' }}>INTRANET</span>} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: T.surface, border: '0.5px solid ' + T.line, borderRadius: 14, padding: '2.5rem', maxWidth: 420, width: '100%' }}>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: 21, fontWeight: 500, color: T.ink }}>Willkommen</h1>
          <p style={{ margin: '0 0 1.75rem', fontSize: 13, color: T.muted }}>Interner Bereich für PhysioPro & Pilates Company</p>
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid ' + T.lineSoft, marginBottom: '1.5rem' }}>
            {[['employee', 'Mitarbeiter'], ['admin', 'Verwaltung']].map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)} style={{ background: 'none', border: 'none', padding: '0 0 10px', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: mode === m ? T.ink : T.faint, borderBottom: mode === m ? '2px solid ' + (m === 'employee' ? T.green : T.mauve) : '2px solid transparent', marginBottom: -1 }}>{l}</button>
            ))}
          </div>
          {mode === 'employee' && (
            <div>
              <select value={sel} onChange={e => { setSel(e.target.value); setPin(''); setNp(''); setCp(''); }} style={inp}>
                <option value="">Mitarbeiter wählen …</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} · {e.role}</option>)}
              </select>
              {emp && !emp.pinSet && (
                <div>
                  <p style={{ fontSize: 12, color: T.muted, margin: '0 0 12px' }}>Erste Anmeldung — bitte PIN festlegen (4–6 Ziffern)</p>
                  <input type="password" inputMode="numeric" maxLength={6} placeholder="Neuer PIN" value={np} onChange={e => setNp(e.target.value)} style={inp} />
                  <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN wiederholen" value={cp} onChange={e => setCp(e.target.value)} style={inp} />
                  <button style={btn(T.green)} onClick={() => { if (np.length < 4) return alert('Mind. 4 Ziffern'); if (np !== cp) return alert('PINs stimmen nicht überein'); onPinSetup(sel, np); }}>PIN festlegen & anmelden</button>
                </div>
              )}
              {emp && emp.pinSet && (
                <div>
                  <input type="password" inputMode="numeric" maxLength={6} placeholder="Dein PIN" value={pin} onChange={e => setPin(e.target.value)} style={inp} />
                  <button style={btn(T.green)} onClick={() => onEmployeeLogin(sel, pin)}>Anmelden</button>
                </div>
              )}
            </div>
          )}
          {mode === 'admin' && (
            <div>
              <input type="email" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
              <input type="password" placeholder="Passwort" value={pw} onChange={e => setPw(e.target.value)} style={inp} />
              <button style={btn(T.mauve)} onClick={() => onAdminLogin(email, pw)}>Anmelden</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Employee = ({ user, news, tools, messages, stammdaten, onSaveStammdaten, onMarkRead, onReply, onToggleLike, onComment, onToggleConfirm, onLogout }) => {
  const [tab, setTab] = useState('news');
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  const unread = messages.filter(m => !m.readBy.some(r => r.id === user.id)).length;
  const stammdatenComplete = isStammdatenComplete(stammdaten);
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: T.ink }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: 10, color: T.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{user.role}</p>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.chip, color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500 }}>{initials}</div>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Abmelden</button>
        </div>
      } />
      <div style={{ background: T.surface, borderBottom: '1px solid ' + T.lineSoft }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', display: 'flex', gap: 28 }}>
          {[['news', 'News'], ['tools', 'Tools & Links'], ['stammdaten', 'Meine Stammdaten' + (stammdatenComplete ? '' : ' ●')], ['postfach', 'Mein Bereich' + (unread ? ' · ' + unread : '')]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', padding: '14px 0', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: tab === k ? T.ink : (k === 'stammdaten' && !stammdatenComplete ? T.mauve : T.faint), borderBottom: tab === k ? '2px solid ' + (k === 'postfach' ? T.mauve : T.green) : '2px solid transparent', marginBottom: -1 }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem', boxSizing: 'border-box' }}>
        {tab === 'news' && <NewsFeed news={news} />}
        {tab === 'tools' && <ToolsList tools={tools} />}
        {tab === 'stammdaten' && <StammdatenForm existing={stammdaten} onSave={onSaveStammdaten} />}
        {tab === 'postfach' && <Postfach user={user} messages={messages} onMarkRead={onMarkRead} onReply={onReply} onToggleLike={onToggleLike} onComment={onComment} onToggleConfirm={onToggleConfirm} />}
      </div>
    </div>
  );
};

const NewsFeed = ({ news }) => {
  // Soft-Delete: als "deleted" markierte Einträge bleiben im Sheet
  // (siehe delNews), werden aber nirgends mehr angezeigt.
  const visible = news.filter(n => !n.deleted);
  return (
    <div>
      <Label>Firmen-News</Label>
      {visible.length === 0 && <Empty text="Noch keine News veröffentlicht." />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 16 }}>
        {visible.map(n => <NewsCard key={n.id} n={n} />)}
      </div>
    </div>
  );
};

const PhotoPlaceholder = ({ firm, abbr }) => {
  const f = FIRMS[firm] || FIRMS.beide;
  const bg = f.dot === 'split'
    ? 'linear-gradient(135deg,' + T.green + ' 0%,' + T.green + ' 50%,' + T.mauveSoft + ' 50%,' + T.mauveSoft + ' 100%)'
    : (firm === 'pilates' ? T.mauveSoft : T.green);
  return (
    <div style={{ aspectRatio: '16/9', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 30, fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.1em' }}>{abbr}</span>
    </div>
  );
};

const NewsCard = ({ n }) => {
  const [expanded, setExpanded] = useState(false);
  const long = n.text.length > 220;
  const preview = long && !expanded ? n.text.slice(0, 220).trimEnd() + '…' : n.text;
  const photo = n.photos && n.photos.length > 0 ? n.photos[0] : null;
  const abbr = (FIRMS[n.firm] || FIRMS.beide).label === 'Pilates Company' ? 'PC' : n.firm === 'physio' ? 'PP' : 'PP·PC';
  return (
    <div style={{ background: T.surface, border: '0.5px solid ' + T.line, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {photo?.url
        ? <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}><img src={photo.url} alt={n.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
        : <PhotoPlaceholder firm={n.firm} abbr={abbr} />}
      <div style={{ padding: '1.1rem 1.2rem 1.3rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9, flexWrap: 'wrap' }}>
          <FirmTag firm={n.firm} />
          <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T[catTone(n.category) === 'mauve' ? 'mauve' : 'green'], border: '1px solid ' + T.line, borderRadius: 20, padding: '3px 9px' }}>{n.category}</span>
        </div>
        <h3 style={{ margin: '0 0 9px', fontSize: 17, fontWeight: 500, color: T.ink, lineHeight: 1.3 }}>{n.title}</h3>
        <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.6, color: T.muted, whiteSpace: 'pre-wrap', flex: 1 }}>{preview}</p>
        {long && <button onClick={() => setExpanded(e => !e)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: T.mauve, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>{expanded ? 'weniger anzeigen' : 'mehr lesen'}</button>}
        {n.eventDate && <p style={{ margin: '10px 0 0', fontSize: 13, color: T.green }}>📅 {n.eventDate}</p>}
        {n.link && <p style={{ margin: '8px 0 0' }}><a href={n.link} target="_blank" rel="noopener noreferrer" style={{ color: T.mauve, fontSize: 13 }}>→ {n.linkLabel || n.link}</a></p>}
        {n.attachment && <FileChip name={n.attachment.name || n.attachment} url={n.attachment.url || null} />}
        <p style={{ margin: '12px 0 0', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{n.created}</p>
      </div>
    </div>
  );
};

const ToolsList = ({ tools }) => (
  <div>
    <Label>Tools & Links</Label>
    <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>Nützliche Werkzeuge und Verweise, auf die du dauerhaft zugreifen kannst.</p>
    {tools.length === 0 && <Empty text="Noch keine Tools hinterlegt." />}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
      {tools.map(t => {
        const inner = (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 46, height: 46, borderRadius: 11, background: T.chip, color: t.soon ? T.faint : T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 500, flexShrink: 0 }}>{t.abbr}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 500, color: T.ink }}>{t.title}</p>
                <FirmTag firm={t.firm} />
              </div>
              {t.soon
                ? <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.mauve, border: '1px solid ' + T.mauveSoft, borderRadius: 20, padding: '3px 8px' }}>in Arbeit</span>
                : <span style={{ color: T.faint, fontSize: 16 }}>↗</span>}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.55 }}>{t.desc}</p>
          </>
        );
        const base = { background: T.surface, border: '0.5px solid ' + T.line, borderRadius: 12, padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: 13, minHeight: 120 };
        return t.soon || !t.link
          ? <div key={t.id} style={{ ...base, opacity: t.soon ? 0.72 : 1, cursor: 'default' }}>{inner}</div>
          : <a key={t.id} href={t.link} target="_blank" rel="noopener noreferrer" style={{ ...base, textDecoration: 'none' }}>{inner}</a>;
      })}
    </div>
  </div>
);

// Pflichtfelder für den Status "vollständig" (Ampel für die Verwaltung vor
// den Mitarbeitergesprächen). Bewusst NICHT "Schwerbehinderung" oder
// "Nebentätigkeit" — das sind freiwillige bzw. situationsabhängige Angaben,
// deren Fehlen nicht "unvollständig" bedeuten soll.
// "kontoinhaber" bewusst NICHT hier: laut Formular nur auszufüllen, wenn das
// Konto nicht auf die eigene Person läuft ("falls abweichend") — ein leeres
// Feld ist dort der Normalfall, nicht ein fehlender Wert.
const STAMMDATEN_REQUIRED_FIELDS = ['strasse', 'plz', 'ort', 'geburtsdatum', 'steuerId', 'steuerklasse', 'sozialversicherungsnummer', 'krankenkasse', 'iban'];
const isStammdatenComplete = s => !!s && STAMMDATEN_REQUIRED_FIELDS.every(f => (s[f] || '').toString().trim().length > 0) && !!s.vertrag;

const StammdatenForm = ({ existing, onSave }) => {
  const blank = {
    strasse: '', plz: '', ort: '', geburtsdatum: '',
    steuerId: '', steuerklasse: '', familienstand: '', kinderfreibetraege: '',
    sozialversicherungsnummer: '', krankenkasse: '',
    iban: '', kontoinhaber: '',
    schwerbehinderung: '', nebentaetigkeit: '',
    wazBisher: '', gehaltBisher: '', anmerkung: '',
    vertrag: null, qualifikationen: [],
  };
  const [f, setF] = useState({ ...blank, ...(existing || {}) });
  const [qLabel, setQLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(f);
      setSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setSaving(false);
    }
  };

  const complete = isStammdatenComplete(f);

  return (
    <div>
      <Label>Meine Stammdaten</Label>
      <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>
        Grundlage für dein Mitarbeitergespräch und die künftige Lohn-/Gehaltsabrechnung. Bitte vollständig ausfüllen — du kannst jederzeit zurückkommen und ergänzen, nichts geht verloren.
      </p>
      {!complete && (
        <div style={{ background: '#fdf3ea', border: '1px solid ' + T.mauveSoft, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: T.muted, marginBottom: 16 }}>
          Noch nicht vollständig — Pflichtfelder unten sowie der Arbeitsvertrag-Upload fehlen noch teilweise.
        </div>
      )}

      <div style={cardS}>
        <p style={subLabel}>Persönliche Daten</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.strasse} onChange={e => set('strasse', e.target.value)} placeholder="Straße & Hausnummer" style={{ ...fieldS, flex: 2 }} />
          <input value={f.plz} onChange={e => set('plz', e.target.value)} placeholder="PLZ" style={{ ...fieldS, flex: 1 }} />
          <input value={f.ort} onChange={e => set('ort', e.target.value)} placeholder="Ort" style={{ ...fieldS, flex: 1.5 }} />
        </div>
        <input type="date" value={f.geburtsdatum} onChange={e => set('geburtsdatum', e.target.value)} style={fieldS} />
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.steuerId} onChange={e => set('steuerId', e.target.value)} placeholder="Steuer-ID" style={{ ...fieldS, flex: 1 }} />
          <select value={f.steuerklasse} onChange={e => set('steuerklasse', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Steuerklasse …</option>
            {['I', 'II', 'III', 'IV', 'V', 'VI'].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={f.familienstand} onChange={e => set('familienstand', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Familienstand …</option>
            {['ledig', 'verheiratet', 'geschieden', 'verwitwet'].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <input value={f.kinderfreibetraege} onChange={e => set('kinderfreibetraege', e.target.value)} placeholder="Kinderfreibeträge (Anzahl)" style={{ ...fieldS, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.sozialversicherungsnummer} onChange={e => set('sozialversicherungsnummer', e.target.value)} placeholder="Sozialversicherungsnummer" style={{ ...fieldS, flex: 1 }} />
          <input value={f.krankenkasse} onChange={e => set('krankenkasse', e.target.value)} placeholder="Krankenkasse" style={{ ...fieldS, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.iban} onChange={e => set('iban', e.target.value)} placeholder="IBAN" style={{ ...fieldS, flex: 1.3 }} />
          <input value={f.kontoinhaber} onChange={e => set('kontoinhaber', e.target.value)} placeholder="Kontoinhaber (falls abweichend)" style={{ ...fieldS, flex: 1 }} />
        </div>
        <select value={f.schwerbehinderung} onChange={e => set('schwerbehinderung', e.target.value)} style={fieldS}>
          <option value="">Schwerbehinderung — freiwillige Angabe</option>
          <option value="ja">Ja</option>
          <option value="nein">Nein</option>
        </select>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Arbeitsvertrag</p>
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 10px', lineHeight: 1.6 }}>Bitte deinen bisherigen Arbeitsvertrag bei der PHYSIO PLUS GmbH hochladen (PDF oder Scan/Foto).</p>
        {f.vertrag
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileChip name={f.vertrag.name} url={f.vertrag.url} />
              <button onClick={() => set('vertrag', null)} style={{ background: 'none', border: 'none', color: T.faint, fontSize: 12, cursor: 'pointer' }}>entfernen</button>
            </div>
          : <UploadButton folder="stammdaten-vertraege" accept="image/*,.pdf,.docx,.doc" label="+ Arbeitsvertrag hochladen" onUploaded={file => set('vertrag', { url: file.url, name: file.name, path: file.path })} />}
      </div>

      <div style={cardS}>
        <p style={subLabel}>Qualifikationen & Urkunden</p>
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 10px', lineHeight: 1.6 }}>Ausbildungsabschluss, Fortbildungsnachweise, Berufserlaubnis/Approbation, ggf. Führungszeugnis — beliebig viele Dateien.</p>
        {f.qualifikationen.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {f.qualifikationen.map((q, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <FileChip name={q.bezeichnung ? q.bezeichnung + ' — ' + q.name : q.name} url={q.url} />
                <button onClick={() => set('qualifikationen', f.qualifikationen.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: T.faint, fontSize: 12, cursor: 'pointer' }}>entfernen</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={qLabel} onChange={e => setQLabel(e.target.value)} placeholder="Bezeichnung (z. B. „Physiotherapie-Examen“)" style={{ ...fieldS, marginBottom: 0, flex: 1, minWidth: 220 }} />
          <UploadButton folder="stammdaten-qualifikationen" accept="image/*,.pdf,.docx,.doc" label="+ Datei hochladen" onUploaded={file => { set('qualifikationen', [...f.qualifikationen, { url: file.url, name: file.name, path: file.path, bezeichnung: qLabel }]); setQLabel(''); }} />
        </div>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Für die Gehaltsabrechnung</p>
        <select value={f.nebentaetigkeit} onChange={e => set('nebentaetigkeit', e.target.value)} style={fieldS}>
          <option value="">Nebentätigkeit?</option>
          <option value="ja">Ja</option>
          <option value="nein">Nein</option>
        </select>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.wazBisher} onChange={e => set('wazBisher', e.target.value)} placeholder="Bisherige Wochenarbeitszeit (Std.)" style={{ ...fieldS, flex: 1 }} />
          <input value={f.gehaltBisher} onChange={e => set('gehaltBisher', e.target.value)} placeholder="Bisheriges Gehalt (€, brutto)" style={{ ...fieldS, flex: 1 }} />
        </div>
        <p style={{ fontSize: 11, color: T.faint, margin: '-6px 0 12px' }}>Bitte laut deinem bisherigen Arbeitsvertrag angeben — wird im Gespräch abgeglichen.</p>
        <textarea value={f.anmerkung} onChange={e => set('anmerkung', e.target.value)} placeholder="Anmerkungen (optional)" rows={3} style={{ ...fieldS, fontFamily: 'inherit', resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={submit} disabled={saving} style={{ ...primaryBtn, background: T.green, opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Wird gespeichert …' : 'Speichern'}</button>
        {savedAt && <span style={{ fontSize: 12, color: T.greenSoft }}>Gespeichert um {savedAt}</span>}
      </div>
    </div>
  );
};

const Postfach = ({ user, messages, onMarkRead, onReply, onToggleLike, onComment, onToggleConfirm }) => (
  <div>
    <Label>Mein persönlicher Bereich</Label>
    <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>Hier erhältst du persönliche Nachrichten und Dokumente von der Verwaltung. Du kannst direkt antworten und Dateien zurücksenden. Alle Vorgänge werden protokolliert.</p>
    {messages.length === 0 && <Empty text="Noch keine Nachrichten in deinem Bereich." />}
    {messages.map(m => <MessageThread key={m.id} m={m} user={user} unread={!m.readBy.some(r => r.id === user.id)} onOpen={() => onMarkRead(m.id)} onReply={onReply} onToggleLike={onToggleLike} onComment={onComment} onToggleConfirm={onToggleConfirm} />)}
  </div>
);

const MessageThread = ({ m, user, unread, onOpen, onReply, onToggleLike, onComment, onToggleConfirm }) => {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [comment, setComment] = useState('');
  const iLiked = (m.likes || []).some(l => l.id === user.id);
  const iConfirmed = (m.confirmedBy || []).some(c => c.id === user.id);
  return (
    <div style={{ background: T.surface, border: '0.5px solid ' + (unread ? T.mauveSoft : T.line), borderRadius: 10, overflow: 'hidden', marginBottom: 9 }}>
      <div onClick={() => setOpen(o => { if (!o) onOpen(); return !o; })} style={{ padding: '13px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13 }}>
        <Marker letter={m.sender.split(' ').map(w => w[0]).join('').slice(0, 2)} tone="solid" />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.ink }}>{m.title}{m.closed ? <span style={{ fontSize: 10, color: T.faint, fontWeight: 400, marginLeft: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>· beendet</span> : null}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>von {m.sender} · {m.created}{unread ? ' · neu' : ''}</p>
        </div>
        {unread ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.mauveSoft }} /> : <span style={{ color: '#c4bfb2', fontSize: 12 }}>{open ? '▴' : '▾'}</span>}
      </div>
      {open && (
        <div style={{ padding: '0 15px 15px 58px', fontSize: 13, lineHeight: 1.65, color: T.muted }}>
          {m.photos && m.photos.length > 0 && m.photos[0].url && (
            <div style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: 8, marginBottom: 10, maxWidth: 420 }}>
              <img src={m.photos[0].url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <p style={{ margin: '0 0 8px' }}>{m.text}</p>
          {m.link && <p style={{ margin: '0 0 10px' }}><a href={m.link} target="_blank" rel="noopener noreferrer" style={{ color: T.mauve, fontSize: 13, fontWeight: 500 }}>→ {m.linkLabel || m.link}</a></p>}
          {m.eventDate && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, margin: '0 0 10px', padding: '10px 12px', background: T.chip, borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: T.ink }}>📅 {m.eventDate}</span>
              <button onClick={() => onToggleConfirm(m.id)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid ' + (iConfirmed ? T.green : T.line), background: iConfirmed ? T.green : T.surface, color: iConfirmed ? '#fff' : T.muted }}>{iConfirmed ? '✓ Zugesagt' : 'Bestätigen'}</button>
            </div>
          )}
          <div style={{ margin: '0 0 10px' }}>
            <button onClick={() => onToggleLike(m.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid ' + (iLiked ? T.mauve : T.line), background: iLiked ? T.mauve : T.surface, color: iLiked ? '#fff' : T.muted }}>{iLiked ? '♥' : '♡'} Gefällt mir{m.likes?.length ? ' · ' + m.likes.length : ''}</button>
          </div>
          {attachmentsOf(m).map((a, i) => <FileChip key={i} name={a.name || a} url={a.url || null} />)}
          <div style={{ marginTop: 14, borderTop: '1px solid ' + T.lineSoft, paddingTop: 12 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Kommentare{m.comments?.length ? ' (' + m.comments.length + ')' : ''}</p>
            {m.comments && m.comments.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {m.comments.map((c, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{c.from} · {c.ts}</p>
                    <p style={{ margin: '2px 0 0' }}>{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Kommentar schreiben …" style={{ width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.bg }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11, color: T.faint }}>Hinweis: Dein Kommentar ist für alle sichtbar, die diese Nachricht erhalten haben.</span>
              <button onClick={() => { if (!comment.trim()) return; onComment(m.id, comment); setComment(''); }} style={{ padding: '7px 15px', border: 'none', borderRadius: 8, background: T.green, color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Kommentieren</button>
            </div>
          </div>
          {m.replies && m.replies.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid ' + T.lineSoft, paddingTop: 12 }}>
              {m.replies.map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{r.from} · {r.ts}</p>
                  <p style={{ margin: '3px 0 0' }}>{r.text}</p>
                  {attachmentsOf(r).map((a, i) => <FileChip key={i} name={a.name || a} url={a.url || null} />)}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, borderTop: '1px solid ' + T.lineSoft, paddingTop: 12 }}>
            {m.closed ? (
              <p style={{ margin: 0, fontSize: 12, color: T.faint, fontStyle: 'italic' }}>Dieser Dialog wurde von der Verwaltung beendet.</p>
            ) : (
              <>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Antwort schreiben …" style={{ width: '100%', minHeight: 60, padding: 10, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.bg }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  {pendingFiles.length < MAX_ATTACHMENTS && (
                    <UploadButton folder="antworten" label="+ Datei anhängen" onUploaded={f => setPendingFiles(fs => [...fs, f])} />
                  )}
                  {pendingFiles.map((f, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <FileChip name={f.name} url={f.url} />
                      <button onClick={() => setPendingFiles(fs => fs.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', fontSize: 13, marginLeft: -4, marginTop: 8 }} title="Entfernen">×</button>
                    </span>
                  ))}
                  <button onClick={() => { if (!reply.trim()) return; onReply(m.id, reply, pendingFiles); setReply(''); setPendingFiles([]); }} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Senden</button>
                </div>
                {pendingFiles.length >= MAX_ATTACHMENTS && <p style={{ fontSize: 11, color: T.faint, margin: '4px 0 0' }}>Maximal {MAX_ATTACHMENTS} Dateien pro Antwort.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Admin = ({ user, news, tools, messages, employees, audit, stammdaten, onAddNews, onUpdateNews, onDelNews, onMoveNews, onAddTool, onUpdateTool, onDelTool, onSend, onReply, onCloseDialog, onReopenDialog, onResetPin, onAddEmployee, onDelEmployee, onLogout }) => {
  const [tab, setTab] = useState('news');
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: T.mauve, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Verwaltung</span>
          <span style={{ fontSize: 13, color: T.ink }}>{user.name}</span>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Abmelden</button>
        </div>
      } />
      <div style={{ background: T.surface, borderBottom: '1px solid ' + T.lineSoft }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', display: 'flex', gap: 28 }}>
          {[['news', 'News'], ['tools', 'Tools & Links'], ['post', 'Persönl. Bereich'], ['stammdaten', 'Stammdaten (§613a)'], ['team', 'Mitarbeiter'], ['audit', 'Protokoll']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', padding: '14px 0', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: tab === k ? T.ink : T.faint, borderBottom: tab === k ? '2px solid ' + T.mauve : '2px solid transparent', marginBottom: -1 }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem', boxSizing: 'border-box' }}>
        {tab === 'news' && <AdminNews news={news} onAdd={onAddNews} onUpdate={onUpdateNews} onDel={onDelNews} onMove={onMoveNews} />}
        {tab === 'tools' && <AdminTools tools={tools} onAdd={onAddTool} onUpdate={onUpdateTool} onDel={onDelTool} />}
        {tab === 'post' && <AdminPost employees={employees} messages={messages} onSend={onSend} onReply={onReply} onCloseDialog={onCloseDialog} onReopenDialog={onReopenDialog} />}
        {tab === 'stammdaten' && <AdminStammdaten employees={employees} stammdaten={stammdaten} />}
        {tab === 'team' && <AdminTeam employees={employees} onResetPin={onResetPin} onAddEmployee={onAddEmployee} onDelEmployee={onDelEmployee} />}
        {tab === 'audit' && <AdminAudit audit={audit} />}
      </div>
    </div>
  );
};

const cardS = { background: T.surface, border: '0.5px solid ' + T.line, borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' };
const fieldS = { width: '100%', padding: '11px 12px', marginBottom: 12, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.bg };
const primaryBtn = { padding: '10px 20px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const subLabel = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.faint, margin: '0.5rem 0 0.6rem' };

const AdminNews = ({ news, onAdd, onUpdate, onDel, onMove }) => {
  // Soft-Delete: als "deleted" markierte Einträge bleiben im Sheet (siehe
  // delNews-Kommentar), werden aber auch in der Verwaltungsansicht nicht
  // mehr aufgeführt.
  const visibleNews = news.filter(n => !n.deleted);
  const [editId, setEditId] = useState(null);
  const [firm, setFirm] = useState('beide');
  const [title, setTitle] = useState(''); const [text, setText] = useState('');
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [link, setLink] = useState(''); const [linkLabel, setLinkLabel] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [photos, setPhotos] = useState([]);
  const [pendingAttachment, setPendingAttachment] = useState(null);

  const reset = () => { setEditId(null); setFirm('beide'); setTitle(''); setText(''); setCat(CATEGORIES[0]); setLink(''); setLinkLabel(''); setEventDate(''); setPhotos([]); setPendingAttachment(null); };

  const startEdit = (n) => {
    setEditId(n.id);
    setFirm(n.firm || 'beide');
    setTitle(n.title || '');
    setText(n.text || '');
    setCat(n.category || CATEGORIES[0]);
    setLink(n.link || '');
    setLinkLabel(n.linkLabel || '');
    setEventDate(n.eventDate || '');
    setPhotos(n.photos || []);
    setPendingAttachment(n.attachment || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    if (!title || !text) return alert('Titel und Text nötig');
    const payload = { firm, title, text, category: cat, link: link || null, linkLabel: linkLabel || null, eventDate: eventDate || null, photos, attachment: pendingAttachment || null };
    if (editId) { onUpdate(editId, payload); } else { onAdd(payload); }
    reset();
  };

  return (
    <div>
      <div style={cardS}>
        <Label>{editId ? 'News bearbeiten' : 'News erstellen'}</Label>
        {editId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', padding: '8px 12px', background: '#fdf6ec', border: '1px solid #f0d9b0', borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: '#7a5c2e' }}>Du bearbeitest eine bestehende News.</span>
            <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #d4b483', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#7a5c2e', cursor: 'pointer' }}>Abbrechen</button>
          </div>
        )}
        {!editId && <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem' }}>Inhalt im Claude-Chat formulieren und hier einfügen.</p>}
        <p style={subLabel}>Für welche Firma? *</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(FIRMS).map(([k, f]) => (
            <button key={k} onClick={() => setFirm(k)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid ' + (firm === k ? T.ink : T.line), background: firm === k ? T.chip : T.surface, color: firm === k ? T.ink : T.muted }}>
              <FirmDot firm={k} />{f.label}
            </button>
          ))}
        </div>
        <input style={fieldS} placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea style={{ ...fieldS, minHeight: 110 }} placeholder="Text" value={text} onChange={e => setText(e.target.value)} />
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <select style={{ ...fieldS, marginBottom: 0 }} value={cat} onChange={e => setCat(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          <input style={{ ...fieldS, marginBottom: 0 }} placeholder="Termin / Datum (optional)" value={eventDate} onChange={e => setEventDate(e.target.value)} />
        </div>
        <p style={subLabel}>Titelbild</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          {photos.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: T.chip, borderRadius: 8, fontSize: 12, color: T.muted }}>
              {p.url ? <img src={p.url} alt="" style={{ width: 32, height: 22, objectFit: 'cover', borderRadius: 4 }} /> : '▦'} {p.name}
              <span onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: T.mauve, fontWeight: 600 }}>×</span>
            </div>
          ))}
          {photos.length === 0 && (
            <UploadButton folder="news-fotos" accept="image/*" label="+ Foto hochladen" onUploaded={f => setPhotos([{ url: f.url, name: f.name, path: f.path }])} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <input style={{ ...fieldS, marginBottom: 0 }} placeholder="Web-Link (https://…)" value={link} onChange={e => setLink(e.target.value)} />
          <input style={{ ...fieldS, marginBottom: 0 }} placeholder="Link-Text (optional)" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} />
        </div>
        <p style={subLabel}>Anhang (PDF, Word, Excel)</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <UploadButton folder="news-anhaenge" accept=".pdf,.docx,.xlsx,.doc,.xls" label="+ Anhang hochladen" onUploaded={f => setPendingAttachment(f)} />
          {pendingAttachment && <FileChip name={pendingAttachment.name} url={pendingAttachment.url} />}
        </div>
        <button style={primaryBtn} onClick={handleSubmit}>{editId ? 'Änderungen speichern' : 'Veröffentlichen'}</button>
      </div>
      <div style={cardS}>
        <Label>Veröffentlicht ({visibleNews.length})</Label>
        {visibleNews.length === 0 && <Empty text="Noch nichts veröffentlicht." />}
        {visibleNews.map((n, i) => (
          <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <Marker letter={catLetter(n.category)} tone={catTone(n.category)} />
              <div>
                <p style={{ margin: 0, fontSize: 14, color: T.ink }}>{n.title}</p>
                <div style={{ margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FirmTag firm={n.firm} />
                  <span style={{ fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{n.category} · {n.created}{n.updated ? ' · bearb. ' + n.updated : ''}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {/* Reihenfolge festlegen: tauscht mit dem vorherigen/nächsten
                  sichtbaren Eintrag (siehe moveNews in App). Bewusst etwas
                  größere Touch-Fläche als die Textbuttons, da die Funktion
                  vor allem mobil genutzt wird. Am Listenrand deaktiviert. */}
              <button onClick={() => onMove(n.id, -1)} disabled={i === 0} title="Nach oben" style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 0', minWidth: 38, fontSize: 13, color: i === 0 ? T.faint : T.muted, cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.4 : 1 }}>↑</button>
              <button onClick={() => onMove(n.id, 1)} disabled={i === visibleNews.length - 1} title="Nach unten" style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 0', minWidth: 38, fontSize: 13, color: i === visibleNews.length - 1 ? T.faint : T.muted, cursor: i === visibleNews.length - 1 ? 'default' : 'pointer', opacity: i === visibleNews.length - 1 ? 0.4 : 1 }}>↓</button>
              <button onClick={() => startEdit(n)} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Bearbeiten</button>
              <button onClick={() => { if (confirm('News löschen?')) onDel(n.id); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminTools = ({ tools, onAdd, onUpdate, onDel }) => {
  const [editId, setEditId] = useState(null);
  const [abbr, setAbbr] = useState(''); const [title, setTitle] = useState('');
  const [desc, setDesc] = useState(''); const [link, setLink] = useState(''); const [firm, setFirm] = useState('beide');
  const [soon, setSoon] = useState(false);

  const reset = () => { setEditId(null); setAbbr(''); setTitle(''); setDesc(''); setLink(''); setFirm('beide'); setSoon(false); };

  const startEdit = t => {
    setEditId(t.id);
    setAbbr(t.abbr || '');
    setTitle(t.title || '');
    setDesc(t.desc || '');
    setLink(t.link || '');
    setFirm(t.firm || 'beide');
    setSoon(t.soon || false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    if (!title) return alert('Titel nötig');
    if (!soon && !link) return alert('Link nötig (oder „in Arbeit" aktivieren)');
    const payload = { abbr: abbr || title.slice(0, 2).toUpperCase(), title, desc, link, firm, soon };
    if (editId) { onUpdate(editId, payload); } else { onAdd(payload); }
    reset();
  };

  return (
    <div>
      <div style={cardS}>
        <Label>{editId ? 'Tool / Link bearbeiten' : 'Tool / Link hinzufügen'}</Label>
        {editId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', padding: '8px 12px', background: '#fdf6ec', border: '1px solid #f0d9b0', borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: '#7a5c2e' }}>Du bearbeitest einen bestehenden Eintrag.</span>
            <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #d4b483', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#7a5c2e', cursor: 'pointer' }}>Abbrechen</button>
          </div>
        )}
        {!editId && <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem' }}>Dauerhafte Werkzeuge und Verweise für alle Mitarbeiter.</p>}
        <p style={subLabel}>Für welche Firma? *</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(FIRMS).map(([k, f]) => (
            <button key={k} onClick={() => setFirm(k)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid ' + (firm === k ? T.ink : T.line), background: firm === k ? T.chip : T.surface, color: firm === k ? T.ink : T.muted }}>
              <FirmDot firm={k} />{f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <input style={{ ...fieldS, marginBottom: 0, maxWidth: 110 }} placeholder="Kürzel" maxLength={3} value={abbr} onChange={e => setAbbr(e.target.value.toUpperCase())} />
          <input style={{ ...fieldS, marginBottom: 0 }} placeholder="Titel (z. B. Zeiterfassung)" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <input style={fieldS} placeholder="Kurze Beschreibung" value={desc} onChange={e => setDesc(e.target.value)} />
        <input style={{ ...fieldS, opacity: soon ? 0.45 : 1 }} placeholder="Link (https://…)" value={link} onChange={e => setLink(e.target.value)} disabled={soon} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.muted, marginBottom: 16, cursor: 'pointer' }}>
          <input type="checkbox" checked={soon} onChange={e => setSoon(e.target.checked)} style={{ accentColor: T.mauve }} />
          Als „in Arbeit" markieren (kein Link nötig)
        </label>
        <button style={primaryBtn} onClick={handleSubmit}>{editId ? 'Änderungen speichern' : 'Hinzufügen'}</button>
      </div>
      <div style={cardS}>
        <Label>Vorhanden ({tools.length})</Label>
        {tools.length === 0 && <Empty text="Noch keine Tools." />}
        {tools.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: T.chip, color: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500 }}>{t.abbr}</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, color: T.ink }}>{t.title}{t.soon && <span style={{ marginLeft: 8, fontSize: 10, color: T.mauve, border: '1px solid ' + T.mauveSoft, borderRadius: 20, padding: '2px 7px' }}>in Arbeit</span>}</p>
                <div style={{ margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FirmTag firm={t.firm} />
                  {t.link && <span style={{ fontSize: 11, color: T.faint }}>{t.link}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => startEdit(t)} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Bearbeiten</button>
              <button onClick={() => { if (confirm('Eintrag löschen?')) onDel(t.id); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminPost = ({ employees, messages, onSend, onReply, onCloseDialog, onReopenDialog }) => {
  const [title, setTitle] = useState(''); const [text, setText] = useState('');
  const [groups, setGroups] = useState([]); const [inds, setInds] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [link, setLink] = useState(''); const [linkLabel, setLinkLabel] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [confirmPayload, setConfirmPayload] = useState(null);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const requestSend = () => {
    if (!title || !text) return alert('Betreff und Text nötig');
    if (groups.length === 0 && inds.length === 0) return alert('Mindestens einen Empfänger wählen');
    const recipientNames = [...groups, ...inds.map(id => employees.find(e => e.id === id)?.name)].filter(Boolean);
    setConfirmPayload({ title, text, attachments: pendingAttachments, photos, link: link || null, linkLabel: linkLabel || null, eventDate: eventDate || null, toGroups: groups, toIndividuals: inds, recipientNames });
  };
  const confirmSend = () => {
    onSend({ title: confirmPayload.title, text: confirmPayload.text, attachments: confirmPayload.attachments, photos: confirmPayload.photos, link: confirmPayload.link, linkLabel: confirmPayload.linkLabel, eventDate: confirmPayload.eventDate, toGroups: confirmPayload.toGroups, toIndividuals: confirmPayload.toIndividuals });
    setConfirmPayload(null);
    setTitle(''); setText(''); setPendingAttachments([]); setPhotos([]); setLink(''); setLinkLabel(''); setEventDate(''); setGroups([]); setInds([]);
  };
  return (
    <div>
      <div style={cardS}>
        <Label>Nachricht / Dokument senden</Label>
        <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1rem', lineHeight: 1.6 }}>Geht in den persönlichen Bereich der Empfänger. Empfänger können antworten und Dateien zurücksenden. Alles wird protokolliert.</p>
        <input style={fieldS} placeholder="Betreff" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea style={{ ...fieldS, minHeight: 100 }} placeholder="Text" value={text} onChange={e => setText(e.target.value)} />
        <p style={subLabel}>Titelbild (optional)</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          {photos.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: T.chip, borderRadius: 8, fontSize: 12, color: T.muted }}>
              {p.url ? <img src={p.url} alt="" style={{ width: 32, height: 22, objectFit: 'cover', borderRadius: 4 }} /> : '▦'} {p.name}
              <span onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: T.mauve, fontWeight: 600 }}>×</span>
            </div>
          ))}
          {photos.length === 0 && (
            <UploadButton folder="nachrichten-fotos" accept="image/*" label="+ Foto hinzufügen" onUploaded={f => setPhotos([{ url: f.url, name: f.name, path: f.path }])} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <input style={{ ...fieldS, marginBottom: 0 }} placeholder="Link (z. B. Terminabstimmung, https://…)" value={link} onChange={e => setLink(e.target.value)} />
          <input style={{ ...fieldS, marginBottom: 0 }} placeholder="Link-Text (optional)" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} />
        </div>
        <p style={subLabel}>Termin (optional) — Empfänger können direkt zusagen, das Ergebnis siehst nur du</p>
        <input style={fieldS} placeholder="z. B. Freitag, 18 Uhr, Trattoria Da Mario" value={eventDate} onChange={e => setEventDate(e.target.value)} />
        <p style={subLabel}>Anhang (PDF, Word, Excel …)</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
          {pendingAttachments.length < MAX_ATTACHMENTS && (
            <UploadButton folder="nachrichten" accept=".pdf,.docx,.xlsx,.doc,.xls,image/*" label="+ Anhang hochladen" onUploaded={f => setPendingAttachments(fs => [...fs, f])} />
          )}
          {pendingAttachments.map((f, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <FileChip name={f.name} url={f.url} />
              <button onClick={() => setPendingAttachments(fs => fs.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', fontSize: 13, marginLeft: -4, marginTop: 8 }} title="Entfernen">×</button>
            </span>
          ))}
        </div>
        {pendingAttachments.length >= MAX_ATTACHMENTS && <p style={{ fontSize: 11, color: T.faint, margin: '0 0 8px' }}>Maximal {MAX_ATTACHMENTS} Dateien pro Nachricht.</p>}
        <p style={subLabel}>An Gruppen</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => setGroups(g => g.includes(ALL_GROUP) ? [] : [ALL_GROUP])}
            style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid ' + (groups.includes(ALL_GROUP) ? T.ink : T.line), background: groups.includes(ALL_GROUP) ? T.ink : T.surface, color: groups.includes(ALL_GROUP) ? '#fff' : T.muted }}
          >Alle (beide Firmen)</button>
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setGroups(prev => { const specific = prev.filter(x => x !== ALL_GROUP); return specific.includes(g) ? specific.filter(x => x !== g) : [...specific, g]; })}
              style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid ' + (groups.includes(g) ? T.mauve : T.line), background: groups.includes(g) ? T.mauve : T.surface, color: groups.includes(g) ? '#fff' : T.muted }}
            >{g}</button>
          ))}
        </div>
        <p style={subLabel}>An einzelne Personen</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {employees.map(e => <button key={e.id} onClick={() => toggle(inds, setInds, e.id)} style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid ' + (inds.includes(e.id) ? T.green : T.line), background: inds.includes(e.id) ? T.green : T.surface, color: inds.includes(e.id) ? '#fff' : T.muted }}>{e.name}</button>)}
        </div>
        <button style={primaryBtn} onClick={requestSend}>Senden</button>
      </div>
      <div style={cardS}>
        <Label>Gesendet ({messages.length})</Label>
        {messages.length === 0 && <Empty text="Noch keine Nachrichten gesendet." />}
        {messages.map(m => <AdminMessageThread key={m.id} m={m} employees={employees} onReply={onReply} onCloseDialog={onCloseDialog} onReopenDialog={onReopenDialog} />)}
      </div>
      {confirmPayload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: T.surface, borderRadius: 14, padding: '1.6rem', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <Label style={{ margin: '0 0 12px' }}>Nachricht jetzt senden?</Label>
            {confirmPayload.photos.length > 0 && confirmPayload.photos[0].url && (
              <img src={confirmPayload.photos[0].url} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
            )}
            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 500, color: T.ink }}>{confirmPayload.title}</p>
            <p style={{ margin: '0 0 14px', fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              Geht an: <strong style={{ color: T.ink }}>{confirmPayload.recipientNames.join(', ')}</strong>
              {confirmPayload.attachments.length > 0 && <><br />{confirmPayload.attachments.length} Anhang{confirmPayload.attachments.length > 1 ? 'änge' : ''}</>}
              {confirmPayload.link && <><br />Link: {confirmPayload.linkLabel || confirmPayload.link}</>}
              {confirmPayload.eventDate && <><br />📅 {confirmPayload.eventDate}</>}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmPayload(null)} style={{ padding: '9px 16px', border: '1px solid ' + T.line, borderRadius: 8, background: 'none', color: T.muted, fontSize: 13, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={confirmSend} style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Ja, senden</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminMessageThread = ({ m, employees, onReply, onCloseDialog, onReopenDialog }) => {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const recipientNames = [...m.toGroups, ...m.toIndividuals.map(id => employees.find(e => e.id === id)?.name)].filter(Boolean).join(', ');
  return (
    <div style={{ background: T.surface, border: '1px solid ' + (open ? T.mauveSoft : T.line), borderRadius: 10, marginBottom: 10, overflow: 'hidden', boxShadow: open ? '0 3px 14px rgba(176,120,130,0.10)' : 'none' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '13px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13 }}>
        <Marker letter={m.closed ? '✓' : '→'} tone="solid" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, color: T.ink, fontWeight: 500 }}>{m.title}{m.closed ? <span style={{ fontSize: 10, color: T.faint, fontWeight: 400, marginLeft: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>· beendet</span> : null}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>an {recipientNames} · {m.created}</p>
          {m.readBy.length > 0 && <p style={{ margin: '4px 0 0', fontSize: 11, color: T.greenSoft }}>gelesen von: {m.readBy.map(r => r.name).join(', ')}</p>}
        </div>
        <span style={{ fontSize: 11, color: T.faint, whiteSpace: 'nowrap', textAlign: 'right', lineHeight: 1.5 }}>
          {m.readBy.length} gelesen{m.replies?.length ? <><br />{m.replies.length} Antworten</> : null}
          {m.likes?.length ? <><br />♥ {m.likes.length}</> : null}
          {m.eventDate ? <><br />{(m.confirmedBy || []).length} Zusagen</> : null}
        </span>
        <span style={{ color: '#c4bfb2', fontSize: 12 }}>{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div style={{ padding: '14px 15px 16px 58px', fontSize: 13, lineHeight: 1.65, color: T.muted, borderTop: '1px solid ' + T.lineSoft }}>
          {m.photos && m.photos.length > 0 && m.photos[0].url && (
            <div style={{ aspectRatio: '16/9', overflow: 'hidden', borderRadius: 8, marginBottom: 10, maxWidth: 420 }}>
              <img src={m.photos[0].url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <p style={{ margin: '0 0 8px' }}>{m.text}</p>
          {m.link && <p style={{ margin: '0 0 10px' }}><a href={m.link} target="_blank" rel="noopener noreferrer" style={{ color: T.mauve, fontSize: 13, fontWeight: 500 }}>→ {m.linkLabel || m.link}</a></p>}
          {m.eventDate && (
            <div style={{ margin: '0 0 10px', padding: '10px 12px', background: T.chip, borderRadius: 8 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: T.ink }}>📅 {m.eventDate}</p>
              <p style={{ margin: 0, fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Nur für dich sichtbar</p>
              {(m.confirmedBy && m.confirmedBy.length > 0)
                ? <p style={{ margin: '4px 0 0', fontSize: 13, color: T.greenSoft }}>✓ Zugesagt: {m.confirmedBy.map(c => c.name).join(', ')}</p>
                : <p style={{ margin: '4px 0 0', fontSize: 13, color: T.faint }}>Noch keine Zusagen.</p>}
            </div>
          )}
          {m.likes && m.likes.length > 0 && (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: T.mauve }}>♥ Gefällt {m.likes.map(l => l.name).join(', ')}</p>
          )}
          {attachmentsOf(m).map((a, i) => <FileChip key={i} name={a.name || a} url={a.url || null} />)}
          {m.comments && m.comments.length > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid ' + T.lineSoft, paddingTop: 10 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Kommentare ({m.comments.length})</p>
              {m.comments.map((c, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{c.from} · {c.ts}</p>
                  <p style={{ margin: '2px 0 0' }}>{c.text}</p>
                </div>
              ))}
            </div>
          )}
          {m.replies && m.replies.length > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid ' + T.lineSoft, paddingTop: 10 }}>
              {m.replies.map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{r.from} · {r.ts}</p>
                  <p style={{ margin: '3px 0 0' }}>{r.text}</p>
                  {attachmentsOf(r).map((a, i2) => <FileChip key={i2} name={a.name || a} url={a.url || null} />)}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12, borderTop: '1px solid ' + T.lineSoft, paddingTop: 12 }}>
            {m.closed ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: T.faint, fontStyle: 'italic' }}>Dieser Dialog wurde beendet.</p>
                <button onClick={() => onReopenDialog(m.id)} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Dialog wieder öffnen</button>
              </div>
            ) : (
              <>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Antwort schreiben …" style={{ width: '100%', minHeight: 60, padding: 10, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.bg }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  {pendingFiles.length < MAX_ATTACHMENTS && (
                    <UploadButton folder="antworten" label="+ Datei anhängen" onUploaded={f => setPendingFiles(fs => [...fs, f])} />
                  )}
                  {pendingFiles.map((f, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <FileChip name={f.name} url={f.url} />
                      <button onClick={() => setPendingFiles(fs => fs.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', fontSize: 13, marginLeft: -4, marginTop: 8 }} title="Entfernen">×</button>
                    </span>
                  ))}
                  <button onClick={() => { if (!reply.trim()) return; onReply(m.id, reply, pendingFiles); setReply(''); setPendingFiles([]); }} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Senden</button>
                </div>
                {pendingFiles.length >= MAX_ATTACHMENTS && <p style={{ fontSize: 11, color: T.faint, margin: '4px 0 0' }}>Maximal {MAX_ATTACHMENTS} Dateien pro Antwort.</p>}
                <button onClick={() => { if (confirm('Diesen Dialog beenden? Die Person kann danach nicht mehr antworten.')) onCloseDialog(m.id); }} style={{ marginTop: 10, background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Dialog beenden</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const COMPANIES = ['PhysioPro', 'Pilates', 'Bad Schwartau', 'Beide'];

const AdminTeamAdd = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState(GROUPS[0]);
  const [company, setCompany] = useState(COMPANIES[0]);
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setRole(GROUPS[0]); setCompany(COMPANIES[0]); };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), role, company });
      reset();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ ...primaryBtn, marginBottom: '1.2rem' }}>+ Mitarbeiter hinzufügen</button>
  );

  return (
    <div style={{ border: '1px solid ' + T.line, borderRadius: 10, padding: '1rem', marginBottom: '1.2rem', background: T.bg }}>
      <p style={subLabel}>Neue/r Mitarbeiter/in</p>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Vor- und Nachname" style={fieldS} />
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <select value={role} onChange={e => setRole(e.target.value)} style={{ ...fieldS, marginBottom: 0, flex: 1 }}>
          {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={company} onChange={e => setCompany(e.target.value)} style={{ ...fieldS, marginBottom: 0, flex: 1 }}>
          {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} disabled={saving || !name.trim()} style={{ ...primaryBtn, opacity: saving || !name.trim() ? 0.6 : 1, cursor: saving || !name.trim() ? 'default' : 'pointer' }}>{saving ? 'Wird gespeichert …' : 'Hinzufügen'}</button>
        <button onClick={() => { reset(); setOpen(false); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 8, padding: '10px 16px', fontSize: 13, color: T.muted, cursor: 'pointer' }}>Abbrechen</button>
      </div>
    </div>
  );
};

// Übersicht für die Verwaltung: wer hat seine Stammdaten (Adresse, Steuer-ID,
// IBAN, Arbeitsvertrag …) schon eingegeben — direkte Vorbereitung für die
// strukturierten Mitarbeitergespräche im Zuge der §613a-Übernahme.
const AdminStammdaten = ({ employees, stammdaten }) => {
  const [openId, setOpenId] = useState(null);
  const byId = id => stammdaten.find(s => s.id === id) || null;
  const rows = employees.map(e => ({ emp: e, s: byId(e.id), complete: isStammdatenComplete(byId(e.id)) }));
  const doneCount = rows.filter(r => r.complete).length;
  return (
    <div style={cardS}>
      <Label>Stammdaten-Status ({doneCount}/{employees.length} vollständig)</Label>
      <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>
        Jede Person trägt ihre eigenen Daten im Bereich „Meine Stammdaten" ein. Hier siehst du den Stand vor den Mitarbeitergesprächen — zum Aufklappen auf eine Zeile klicken.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr)', fontSize: 11, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0 8px', borderBottom: '1px solid ' + T.lineSoft }}>
        <span>Name</span><span>Rolle / Firma</span><span>Status</span><span>Zuletzt aktualisiert</span>
      </div>
      {rows.map(({ emp, s, complete }) => (
        <div key={emp.id}>
          <div onClick={() => setOpenId(openId === emp.id ? null : emp.id)} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr)', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft, fontSize: 13, color: T.ink, cursor: 'pointer' }}>
            <span>{emp.name}</span>
            <span style={{ color: T.muted }}>{emp.role} · {emp.company}</span>
            <span style={{ color: complete ? T.greenSoft : (s ? T.mauve : T.faint), fontWeight: 500 }}>{complete ? '✓ vollständig' : s ? 'teilweise' : 'ausstehend'}</span>
            <span style={{ color: T.faint, fontSize: 12 }}>{s?.updated || '–'}</span>
          </div>
          {openId === emp.id && (
            <div style={{ padding: '12px 0 18px', borderBottom: '1px solid ' + T.lineSoft }}>
              {!s && <Empty text="Noch keine Stammdaten eingetragen." />}
              {s && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', fontSize: 13 }}>
                  <div><span style={{ color: T.faint }}>Adresse: </span>{s.strasse || '–'}, {s.plz || ''} {s.ort || ''}</div>
                  <div><span style={{ color: T.faint }}>Geburtsdatum: </span>{s.geburtsdatum || '–'}</div>
                  <div><span style={{ color: T.faint }}>Steuer-ID / Klasse: </span>{s.steuerId || '–'} / {s.steuerklasse || '–'}</div>
                  <div><span style={{ color: T.faint }}>Familienstand: </span>{s.familienstand || '–'} · Kinderfreibeträge: {s.kinderfreibetraege || '–'}</div>
                  <div><span style={{ color: T.faint }}>Sozialversicherungsnr.: </span>{s.sozialversicherungsnummer || '–'}</div>
                  <div><span style={{ color: T.faint }}>Krankenkasse: </span>{s.krankenkasse || '–'}</div>
                  <div><span style={{ color: T.faint }}>IBAN: </span>{s.iban || '–'}</div>
                  <div><span style={{ color: T.faint }}>Kontoinhaber: </span>{s.kontoinhaber || '–'}</div>
                  <div><span style={{ color: T.faint }}>Schwerbehinderung: </span>{s.schwerbehinderung || 'keine Angabe'}</div>
                  <div><span style={{ color: T.faint }}>Nebentätigkeit: </span>{s.nebentaetigkeit || '–'}</div>
                  <div><span style={{ color: T.faint }}>Bisherige WAZ / Gehalt: </span>{s.wazBisher || '–'} Std. / {s.gehaltBisher || '–'} €</div>
                  {s.anmerkung && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: T.faint }}>Anmerkung: </span>{s.anmerkung}</div>}
                  <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                    <span style={{ color: T.faint, display: 'block', marginBottom: 4 }}>Arbeitsvertrag:</span>
                    {s.vertrag ? <FileChip name={s.vertrag.name} url={s.vertrag.url} /> : <span style={{ color: T.faint }}>fehlt</span>}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: T.faint, display: 'block', margin: '8px 0 4px' }}>Qualifikationen & Urkunden ({(s.qualifikationen || []).length}):</span>
                    {(s.qualifikationen || []).length === 0 && <span style={{ color: T.faint }}>keine</span>}
                    {(s.qualifikationen || []).map((q, i) => <FileChip key={i} name={q.bezeichnung ? q.bezeichnung + ' — ' + q.name : q.name} url={q.url} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const AdminTeam = ({ employees, onResetPin, onAddEmployee, onDelEmployee }) => (
  <div style={cardS}>
    <Label>Mitarbeiter ({employees.length})</Label>
    <AdminTeamAdd onAdd={onAddEmployee} />
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) auto', fontSize: 11, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0 8px', borderBottom: '1px solid ' + T.lineSoft }}>
      <span>Name</span><span>Rolle</span><span>PIN</span><span></span>
    </div>
    {employees.map(e => (
      <div key={e.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) auto', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft, fontSize: 13, color: T.ink }}>
        <span>{e.name}</span><span style={{ color: T.muted }}>{e.role}</span>
        <span style={{ color: e.pinSet ? T.greenSoft : T.faint }}>{e.pinSet ? 'gesetzt' : '–'}</span>
        <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {e.pinSet && <button onClick={() => { if (confirm('PIN für ' + e.name + ' zurücksetzen?')) onResetPin(e.id); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '5px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Reset</button>}
          <button onClick={() => { if (confirm(e.name + ' endgültig aus dem Team entfernen? Der Zugang wird sofort gesperrt.')) onDelEmployee(e.id); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '5px 10px', fontSize: 12, color: '#c0392b', cursor: 'pointer' }}>Löschen</button>
        </span>
      </div>
    ))}
  </div>
);

const AdminAudit = ({ audit }) => (
  <div style={cardS}>
    <Label>Protokoll ({audit.length})</Label>
    {audit.length === 0 && <Empty text="Noch keine Einträge." />}
    {audit.slice(0, 100).map(a => (
      <div key={a.id} style={{ padding: '9px 0', borderBottom: '1px solid ' + T.lineSoft, fontSize: 12, color: T.muted }}>
        <span style={{ color: T.faint }}>{a.ts}</span> · <span style={{ color: T.ink }}>{a.action}</span> · {a.who}{a.detail && <span style={{ color: T.faint }}> — {a.detail}</span>}
      </div>
    ))}
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

