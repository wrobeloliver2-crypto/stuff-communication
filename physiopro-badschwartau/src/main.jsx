// PhysioPro Bad Schwartau — Onboarding-Site (getrennt von stuff-communication)
//
// Bewusst schlank gehalten: NUR Login (Name+PIN für Mitarbeiter, E-Mail+
// Passwort für Verwaltung) + ein Datenformular + Datei-Upload + eine kleine
// Verwaltungsansicht. Kein News/Tools/Postfach — das ist hier nicht gewollt
// (siehe Projekt-Doku: eigener, isolierter Zugang nur für neue PhysioPro-
// Bad-Schwartau-Mitarbeiter).
//
// Wording-Vorgabe: kein "§613a" und kein "PhysioPlus" irgendwo in der
// Oberfläche — "PhysioPlus" war der Name der übernommenen, alten Firma und
// hat mit dieser Software nichts zu tun. Diese Site ist für "PhysioPro Bad
// Schwartau"-Mitarbeiter.
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// Farben orientiert an physioproluebeck.de (Marken-Grün #55725e, warmes
// Creme #faf8f4, dunkles Warmgrau als Text) — vorherige Version hatte einen
// Kontrast-Bug: Eingabefelder hatten dieselbe Hintergrundfarbe wie die Seite
// UND eine fast unsichtbare Rahmenfarbe. Jetzt: Felder immer weiß, Rahmen
// deutlich sichtbar, Fließtext/Labels dunkler (alle Werte gegen WCAG-AA
// grob geprüft).
const T = {
  bg: '#faf8f4', surface: '#ffffff', field: '#ffffff',
  line: '#c7bda3', lineSoft: '#e4ddc9',
  ink: '#2c2825', muted: '#54504a', faint: '#7d7669',
  green: '#55725e', greenDark: '#3c5346', greenSoft: '#4f6c57',
  mint: '#e9f0ea',
  mauve: '#8f5763', mauveSoft: '#d9adb3', blush: '#f6e9e7', chip: '#f4f2eb',
};

const AUTH_URL = '/.netlify/functions/auth';
const API = '/.netlify/functions/data';
const UPLOAD_URL = '/.netlify/functions/upload';

// Link zum bestehenden, separaten Profil-System, über das Mitarbeiter ihre
// öffentliche Bio/Rollenbeschreibung für die Website selbst pflegen können
// (auf Wunsch von Oliver, 17.07.). Kein neuer Code dafür nötig — nur dieser
// Verweis im Formular.
const PROFIL_FORMULAR_URL = 'https://physiopro-fragebogen.netlify.app';

// Welcher Fragebogen-„typ" verlinkt wird: das physiopro-fragebogen-Repo hat
// den alten, generischen "profil"-Typ (nur Freitext) inzwischen durch zwei
// überarbeitete, größtenteils klick-basierte Typen ersetzt — "therapeut" und
// "empfang" (siehe dortige Team-Zuordnung: Rezeption/Verwaltung -> empfang,
// alle anderen -> therapeut). "profil" existiert zwar noch, ist aber veraltet
// und sollte nicht mehr verlinkt werden. Da die Position hier als Freitext
// erfasst wird (Feld "position"), wählen wir den Typ per Stichwort-Erkennung;
// ohne eindeutigen Treffer greift der Standardfall "therapeut".
const fragebogenTyp = (position) => {
  const p = (position || '').toLowerCase();
  if (/rezeption|empfang|verwaltung/.test(p)) return 'empfang';
  return 'therapeut';
};

// Erste Namensliste (Stand 17.07.) — alle "PhysioPro Bad Schwartau". Rolle
// und E-Mail kennt Oliver nicht, die trägt jede Person im Formular selbst
// ein (siehe Formularfelder "position" und "email" unten).
const EMPLOYEES = [
  { id: 'anne', name: 'Anne Hartkopf', pin: null, pinSet: false },
  { id: 'antje', name: 'Antje Dreyer', pin: null, pinSet: false },
  { id: 'kim', name: 'Kim Patrik Laas', pin: null, pinSet: false },
  { id: 'mascha', name: 'Mascha Penz', pin: null, pinSet: false },
  { id: 'nadine', name: 'Nadine Weber', pin: null, pinSet: false },
  { id: 'petra', name: 'Petra Drewitz', pin: null, pinSet: false },
  { id: 'ulla', name: 'Ulla Mielke', pin: null, pinSet: false },
  { id: 'vera', name: 'Vera Köhn', pin: null, pinSet: false },
];

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

// Mitarbeiter-Session (localStorage) — gleiches Muster wie im Intranet.
const EMP_SESSION_KEY = 'badschwartau_employee_session';
const saveEmpSession = (id, pin) => { try { localStorage.setItem(EMP_SESSION_KEY, JSON.stringify({ id, pin })); } catch (e) {} };
const clearEmpSession = () => { try { localStorage.removeItem(EMP_SESSION_KEY); } catch (e) {} };
const loadEmpSession = () => { try { return JSON.parse(localStorage.getItem(EMP_SESSION_KEY) || 'null'); } catch (e) { return null; } };

let pendingWrites = 0;
let writeCooldownUntil = 0;
const isWriteInProgressOrRecent = () => pendingWrites > 0 || Date.now() < writeCooldownUntil;

const apiGetAll = async () => {
  const res = await fetch(`${API}?collection=all`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return { items: data.data, versions: data.versions || {} };
};

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

// Pflichtfelder für den Status "vollständig". Ergänzt gegenüber dem
// ursprünglichen Formular um "position" (Rolle bei PhysioPro Bad Schwartau)
// und "email" + "emailConsent" — beides kannte Oliver nicht und wird direkt
// von der Person selbst abgefragt (Entscheidung vom 17.07.).
const PROFILE_REQUIRED_FIELDS = [
  'strasse', 'plz', 'ort', 'geburtsdatum', 'geschlecht', 'geburtsort', 'geburtsland', 'staatsangehoerigkeit',
  'steuerId', 'steuerklasse', 'sozialversicherungsnummer', 'krankenkasse', 'iban', 'bic',
  'ersteintrittsdatum', 'position', 'vertragsform', 'urlaubsanspruch', 'email',
];
const isProfileComplete = s => !!s && PROFILE_REQUIRED_FIELDS.every(f => (s[f] || '').toString().trim().length > 0) && !!s.vertrag && !!s.erklaerungBestaetigt && !!s.emailConsent && !!s.dsgvoBestaetigt;

// Wunsch vom 17.07.: Arbeitszeiten nur noch Mo–Fr (Sa/So raus) und statt
// einer reinen Stundenzahl jeweils echte Uhrzeiten (von/bis) — sowohl die
// aktuellen als auch die gewünschten Arbeitszeiten, per Dropdown auswählbar.
const WOCHENTAGE = [['mo', 'Montag'], ['di', 'Dienstag'], ['mi', 'Mittwoch'], ['do', 'Donnerstag'], ['fr', 'Freitag']];
const leadingZero = n => (n < 10 ? '0' : '') + n;
const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 6; h <= 21; h++) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) continue;
      out.push(`${leadingZero(h)}:${leadingZero(m)}`);
    }
  }
  return out;
})();
const blankArbeitszeiten = () => Object.fromEntries(WOCHENTAGE.map(([k]) => [k, { aktuellVon: '', aktuellBis: '', wunschVon: '', wunschBis: '' }]));

const App = () => {
  const [page, setPage] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState(EMPLOYEES);
  const [profiles, setProfiles] = useState([]);
  const [previewEmployeeId, setPreviewEmployeeId] = useState(null);
  const dataLoaded = useRef(false);
  const versionsRef = useRef({});
  const dataRef = useRef({ employees: EMPLOYEES, profile: [] });
  const sessionRestoreAttempted = useRef(false);

  useEffect(() => {
    const loadAll = async () => {
      if (isWriteInProgressOrRecent()) return;
      try {
        const { items, versions } = await apiGetAll();
        const { employees: e, profile: p } = items;
        versionsRef.current = { ...versionsRef.current, ...versions };
        dataLoaded.current = true;

        if (e.length) { dataRef.current.employees = e; setEmployees(e); } else { dataRef.current.employees = EMPLOYEES; setEmployees(EMPLOYEES); }
        if (p && p.length) { dataRef.current.profile = p; setProfiles(p); }

        if (!sessionRestoreAttempted.current) {
          sessionRestoreAttempted.current = true;
          const saved = loadEmpSession();
          if (saved) {
            const empList = e.length ? e : EMPLOYEES;
            const match = empList.find(x => x.id === saved.id && x.pinSet && x.pin === saved.pin);
            if (match) { setUser(match); setPage('employee'); }
            else clearEmpSession();
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
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const commit = async (setter, collection, transform) => {
    if (!dataLoaded.current) { console.warn('Schreibvorgang blockiert: Daten noch nicht geladen (' + collection + ')'); return; }
    const prevSnapshot = dataRef.current[collection];
    const next = transform(prevSnapshot);
    if (next === prevSnapshot) return;
    if (!Array.isArray(next)) { console.error('Schreibvorgang blockiert: transform lieferte kein Array (' + collection + ')'); return; }
    if (next.length === 0 && prevSnapshot.length > 1) { console.warn('Schreibvorgang blockiert: würde ' + collection + ' komplett leeren'); return; }
    dataRef.current[collection] = next;
    setter(next);
    const expectedVersion = versionsRef.current[collection];
    const result = await apiSet(collection, next, expectedVersion);
    if (!result.ok) {
      dataRef.current[collection] = prevSnapshot;
      setter(prevSnapshot);
      const isVersionConflict = result.body?.error === 'version_conflict';
      const reason = result.body?.message || result.body?.error || ('HTTP ' + result.status);
      if (isVersionConflict) alert('Gleichzeitige Änderung erkannt\n\n' + reason);
      else alert('Änderung konnte NICHT gespeichert werden und wurde rückgängig gemacht.\n\nGrund: ' + reason);
    } else if (typeof result.body?.version === 'number') {
      versionsRef.current[collection] = result.body.version;
    }
    return result;
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
  };

  const employeeLogin = (id, pin) => {
    const emp = employees.find(e => e.id === id);
    if (emp && emp.pinSet && emp.pin === pin) {
      setUser(emp);
      setPage('employee');
      saveEmpSession(emp.id, pin);
    } else alert('PIN falsch');
  };

  const adminLogin = async (email, pw) => {
    try {
      const res = await fetch(AUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
      const data = await res.json();
      if (data.ok) { setUser({ name: data.name, email: data.email, isAdmin: true }); setPage('admin'); }
      else if (data.error === 'server_misconfigured') alert('Verwaltung-Login ist aktuell nicht konfiguriert (fehlendes Server-Passwort). Bitte Oliver informieren.');
      else alert('E-Mail oder Passwort falsch');
    } catch (err) {
      alert('Login gerade nicht erreichbar: ' + err.message);
    }
  };

  const logout = () => { setUser(null); setPage('login'); clearEmpSession(); };

  const saveProfile = async (employeeId, fields) => {
    await commit(setProfiles, 'profile', prev => {
      const entry = { id: employeeId, ...fields, updated: new Date().toLocaleString('de-DE') };
      const exists = prev.some(s => s.id === employeeId);
      return exists ? prev.map(s => s.id === employeeId ? entry : s) : [...prev, entry];
    });
  };

  const resetPin = async id => { await commit(setEmployees, 'employees', prev => prev.map(e => e.id === id ? { ...e, pin: null, pinSet: false } : e)); };

  const addEmployee = async (name) => {
    const entry = { id: 'emp' + Date.now(), name, pin: null, pinSet: false };
    await commit(setEmployees, 'employees', prev => [...prev, entry]);
  };

  const delEmployee = async id => { await commit(setEmployees, 'employees', prev => prev.filter(e => e.id !== id)); };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <BrandHeader />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 32, height: 32, border: '2px solid #e6e1d6', borderTopColor: T.green, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 13, color: T.faint, margin: 0 }}>Daten werden geladen …</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (page === 'login') return <Login employees={employees} onPinSetup={pinSetup} onEmployeeLogin={employeeLogin} onAdminLogin={adminLogin} />;
  if (page === 'employee' && user) return <Employee user={user} existing={profiles.find(s => s.id === user.id) || null} onSave={fields => saveProfile(user.id, fields)} onLogout={logout} />;
  if (page === 'admin' && user?.isAdmin && previewEmployeeId) {
    const previewUser = employees.find(e => e.id === previewEmployeeId);
    if (previewUser) return <Employee user={previewUser} existing={profiles.find(s => s.id === previewUser.id) || null} onSave={() => {}} onLogout={() => setPreviewEmployeeId(null)} readOnly />;
  }
  if (page === 'admin' && user?.isAdmin) return <Admin user={user} employees={employees} profiles={profiles} onResetPin={resetPin} onAddEmployee={addEmployee} onDelEmployee={delEmployee} onPreviewEmployee={setPreviewEmployeeId} onLogout={logout} />;
  return null;
};

const BrandHeader = ({ right }) => (
  <div style={{ background: T.surface, borderBottom: '1px solid ' + T.lineSoft }}>
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo.png" alt="PhysioPro" style={{ height: 44, width: 'auto' }} />
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '0.02em' }}>PhysioPro <span style={{ color: T.green }}>Bad Schwartau</span></p>
          <p style={{ margin: 0, fontSize: 11, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Meine Daten</p>
        </div>
      </div>
      {right}
    </div>
    <div style={{ height: 3, background: T.green }} />
  </div>
);

const Label = ({ children, style }) => <p style={{ fontSize: 10, letterSpacing: '0.16em', color: T.faint, margin: '0 0 0.9rem', textTransform: 'uppercase', ...style }}>{children}</p>;
const Empty = ({ text }) => <div style={{ textAlign: 'center', padding: '3rem 1rem', color: T.faint, fontSize: 13 }}>{text}</div>;

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
    try { onUploaded(await uploadFile(file, folder)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); ref.current.value = ''; }
  };
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={handle} />
      <button type="button" onClick={() => ref.current.click()} disabled={loading} style={{ padding: '6px 12px', border: '1px dashed ' + T.line, borderRadius: 8, background: T.surface, color: loading ? T.faint : T.muted, fontSize: 12, cursor: loading ? 'default' : 'pointer' }}>{loading ? 'Wird hochgeladen …' : label}</button>
      {error && <span style={{ fontSize: 11, color: '#c0392b' }}>{error}</span>}
    </div>
  );
};

const Login = ({ employees, onPinSetup, onEmployeeLogin, onAdminLogin }) => {
  const [mode, setMode] = useState('employee');
  const [sel, setSel] = useState(''); const [pin, setPin] = useState('');
  const [np, setNp] = useState(''); const [cp, setCp] = useState('');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState('');
  const emp = employees.find(e => e.id === sel);
  const inp = { width: '100%', padding: '11px 12px', marginBottom: 12, border: '1.5px solid ' + T.line, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', background: T.field, color: T.ink };
  const btn = tone => ({ width: '100%', padding: 11, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#fff', background: tone, letterSpacing: '0.03em' });
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: T.surface, border: '1px solid ' + T.line, borderRadius: 14, padding: '2.5rem', maxWidth: 420, width: '100%' }}>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: 21, fontWeight: 500, color: T.ink }}>Willkommen</h1>
          <p style={{ margin: '0 0 1.75rem', fontSize: 13, color: T.muted }}>Bitte melde dich an, um deine Daten einzutragen.</p>
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid ' + T.lineSoft, marginBottom: '1.5rem' }}>
            {[['employee', 'Mitarbeiter'], ['admin', 'Verwaltung']].map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)} style={{ background: 'none', border: 'none', padding: '0 0 10px', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: mode === m ? T.ink : T.faint, borderBottom: mode === m ? '2px solid ' + (m === 'employee' ? T.green : T.mauve) : '2px solid transparent', marginBottom: -1 }}>{l}</button>
            ))}
          </div>
          {mode === 'employee' && (
            <div>
              <select value={sel} onChange={e => { setSel(e.target.value); setPin(''); setNp(''); setCp(''); }} style={inp}>
                <option value="">Deinen Namen wählen …</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
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

const cardS = { background: T.surface, border: '1px solid ' + T.lineSoft, borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 2px rgba(44,40,37,0.04)' };
const fieldS = { width: '100%', padding: '11px 12px', marginBottom: 12, border: '1.5px solid ' + T.line, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.field };
const primaryBtn = { padding: '10px 20px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const secondaryBtn = { padding: '10px 20px', border: '1.5px solid ' + T.green, borderRadius: 8, background: '#fff', color: T.green, fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const subLabel = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.faint, margin: '0.5rem 0 0.6rem' };

const Employee = ({ user, existing, onSave, onLogout, readOnly = false }) => (
  <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
    {readOnly && (
      <div style={{ background: T.ink, color: '#fff', padding: '8px 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12.5, flexWrap: 'wrap' }}>
        <span>🔍 Vorschau — so sieht es für <strong>{user.name}</strong> aus. Nur Ansicht, es wird nichts gespeichert.</span>
        <button onClick={onLogout} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 7, padding: '4px 12px', fontSize: 12, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>Vorschau schließen</button>
      </div>
    )}
    <BrandHeader right={
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{user.name}</span>
        <button onClick={onLogout} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>{readOnly ? 'Vorschau schließen' : 'Abmelden'}</button>
      </div>
    } />
    <div style={{ flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem', boxSizing: 'border-box' }}>
      <GreetingCard name={user.name} />
      <ProfileForm existing={existing} onSave={onSave} readOnly={readOnly} employeeName={user.name} />
    </div>
  </div>
);

// Persönliche Begrüßung von Hanna, oben im Formular — Wunsch vom 17.07.:
// "Hallo {Vorname}, wir freuen uns auf dich ... LG Hanna". Vorname wird aus
// dem angemeldeten Namen abgeleitet (erstes Wort).
const GreetingCard = ({ name }) => {
  const firstName = (name || '').trim().split(/\s+/)[0] || '';
  return (
    <div style={{ background: T.mint, border: '1px solid ' + T.line, borderRadius: 12, padding: '1.4rem 1.6rem', marginBottom: '1.5rem' }}>
      <p style={{ margin: 0, fontSize: 15, color: T.ink, lineHeight: 1.65 }}>
        Hallo {firstName}, wir freuen uns auf dich und benötigen noch ein paar Angaben, damit wir alle den gleichen Stand haben und auch schon alles für den Steuerberater vorbereitet ist.
      </p>
      <p style={{ margin: '10px 0 0', fontSize: 14, color: T.muted, fontStyle: 'italic' }}>LG Hanna</p>
    </div>
  );
};

// Datenschutzhinweis nach Art. 13 DSGVO — Wunsch vom 17.07. (Nachmittag):
// fehlte bisher komplett im Formular, nur die separate E-Mail-Einwilligung
// gab es schon. Entwurf, kein anwaltlich geprüfter Text — vor dem echten
// Rollout idealerweise noch von Steuerberater/Datenschutzbeauftragtem
// gegenchecken lassen (siehe Hinweis am Dokument-Ende).
const DsgvoCard = ({ f, set }) => (
  <div style={cardS}>
    <p style={subLabel}>Datenschutzhinweis (Art. 13 DSGVO)</p>
    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, marginBottom: 12 }}>
      <p style={{ margin: '0 0 8px' }}><strong>Verantwortlicher:</strong> Hanna Wrobel, PhysioPro Bad Schwartau, Segeberger Str. 1, 23617 Stockelsdorf · E-Mail: hanna.wrobel@pilatescompany.de</p>
      <p style={{ margin: '0 0 8px' }}><strong>Zweck der Verarbeitung:</strong> Vorbereitung und Durchführung deines Beschäftigungsverhältnisses bei PhysioPro Bad Schwartau, insbesondere Personalverwaltung sowie Lohn- und Gehaltsabrechnung.</p>
      <p style={{ margin: '0 0 8px' }}><strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO (Erfüllung bzw. Anbahnung des Arbeitsverhältnisses) sowie, soweit gesetzlich vorgeschrieben, Art. 6 Abs. 1 lit. c DSGVO (z. B. steuer- und sozialversicherungsrechtliche Pflichten).</p>
      <p style={{ margin: '0 0 8px' }}><strong>Empfänger:</strong> Deine Angaben werden ausschließlich intern sowie an unser Steuerbüro (BTR SUMUS) zur Lohn-/Gehaltsabrechnung weitergegeben, dazu an Krankenkassen, Finanzamt und Sozialversicherungsträger, soweit gesetzlich erforderlich. Keine Weitergabe an sonstige Dritte.</p>
      <p style={{ margin: '0 0 8px' }}><strong>Speicherdauer:</strong> Für die Dauer des Beschäftigungsverhältnisses zzgl. gesetzlicher Aufbewahrungsfristen (i. d. R. bis zu 10 Jahre nach handels- und steuerrechtlichen Vorgaben).</p>
      <p style={{ margin: '0 0 8px' }}><strong>Deine Rechte:</strong> Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde, z. B. dem Unabhängigen Landeszentrum für Datenschutz Schleswig-Holstein (ULD).</p>
      <p style={{ margin: 0 }}><strong>Freiwilligkeit:</strong> Die abgefragten Angaben werden für die Anstellung und die Lohn-/Gehaltsabrechnung benötigt. Ohne diese Angaben kann dein Beschäftigungsverhältnis nicht ordnungsgemäß abgewickelt werden.</p>
    </div>
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: T.muted, lineHeight: 1.6, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={f.dsgvoBestaetigt}
        onChange={e => { set('dsgvoBestaetigt', e.target.checked); if (e.target.checked && !f.dsgvoDatum) set('dsgvoDatum', new Date().toLocaleDateString('de-DE')); }}
        style={{ marginTop: 2 }}
      />
      <span>Ich habe den Datenschutzhinweis zur Kenntnis genommen.{f.dsgvoDatum && <> <span style={{ color: T.faint }}>(bestätigt am {f.dsgvoDatum})</span></>}</span>
    </label>
  </div>
);

const ProfileForm = ({ existing, onSave, readOnly = false, employeeName = '' }) => {
  const blank = {
    nachname: '', vorname: '', geburtsname: '', geschlecht: '',
    strasse: '', plz: '', ort: '', geburtsdatum: '', geburtsort: '', geburtsland: '', staatsangehoerigkeit: '',
    steuerId: '', steuerklasse: '', familienstand: '', kinderfreibetraege: '', konfession: '',
    sozialversicherungsnummer: '', krankenkasse: '',
    iban: '', bic: '', kontoinhaber: '',
    schwerbehinderung: '', nebentaetigkeit: '',
    kinder: [],
    position: '', email: '', emailConsent: false,
    ersteintrittsdatum: '', taetigkeit: '',
    beschaeftigungsart: '', geringfuegig: '',
    schulabschluss: '', berufsausbildung: '',
    urlaubsanspruch: '', vertragsform: '',
    befristetBis: '', befristetAbschluss: '',
    arbeitszeiten: blankArbeitszeiten(),
    wazBisher: '', gehaltBisher: '', anmerkung: '',
    vwl: '', vwlEmpfaenger: '', vwlBetrag: '', vwlAgAnteil: '', vwlSeit: '', vwlVertragsnr: '', vwlIban: '', vwlBic: '',
    vorbeschaeftigungen: [],
    vertrag: null, qualifikationen: [],
    erklaerungBestaetigt: false, erklaerungDatum: '',
    dsgvoBestaetigt: false, dsgvoDatum: '',
    submitted: false, submittedAt: '',
  };
  const [f, setF] = useState({ ...blank, ...(existing || {}) });
  const [qLabel, setQLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [transmitting, setTransmitting] = useState(false);
  const [transmitMsg, setTransmitMsg] = useState(null);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  const setZeit = (tag, feld, v) => setF(prev => ({ ...prev, arbeitszeiten: { ...prev.arbeitszeiten, [tag]: { ...prev.arbeitszeiten[tag], [feld]: v } } }));
  const uebernehmenTag = tag => setF(prev => ({ ...prev, arbeitszeiten: { ...prev.arbeitszeiten, [tag]: { ...prev.arbeitszeiten[tag], wunschVon: prev.arbeitszeiten[tag].aktuellVon, wunschBis: prev.arbeitszeiten[tag].aktuellBis } } }));
  const uebernehmenAlle = () => setF(prev => ({
    ...prev,
    arbeitszeiten: Object.fromEntries(WOCHENTAGE.map(([tag]) => [tag, { ...prev.arbeitszeiten[tag], wunschVon: prev.arbeitszeiten[tag].aktuellVon, wunschBis: prev.arbeitszeiten[tag].aktuellBis }])),
  }));

  const addKind = () => { if (f.kinder.length < 5) set('kinder', [...f.kinder, { name: '', vorname: '', geburtsdatum: '' }]); };
  const setKind = (i, k, v) => set('kinder', f.kinder.map((c, j) => j === i ? { ...c, [k]: v } : c));
  const delKind = i => set('kinder', f.kinder.filter((_, j) => j !== i));

  const addVorbesch = () => set('vorbeschaeftigungen', [...f.vorbeschaeftigungen, { von: '', bis: '', art: '', tage: '' }]);
  const setVorbesch = (i, k, v) => set('vorbeschaeftigungen', f.vorbeschaeftigungen.map((c, j) => j === i ? { ...c, [k]: v } : c));
  const delVorbesch = i => set('vorbeschaeftigungen', f.vorbeschaeftigungen.filter((_, j) => j !== i));

  const submit = async () => {
    if (f.email && !f.emailConsent) return alert('Bitte bestätige das Einverständnis zur Kontaktaufnahme per E-Mail, oder lasse das E-Mail-Feld leer.');
    setSaving(true);
    try { await onSave(f); setSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })); }
    finally { setSaving(false); }
  };

  // "Angaben übermitteln" — Wunsch vom 17.07.: erst wenn alles vollständig
  // ausgefüllt ist, schickt der Mitarbeiter seine Daten final ab. Das
  // speichert (wie "Speichern") UND schickt zusätzlich eine
  // Zusammenfassungs-Mail an Hanna & Oliver (Netlify-Function
  // notify-submission, Versand über denselben Weg wie physiopro-fragebogen).
  const transmit = async () => {
    if (f.email && !f.emailConsent) return alert('Bitte bestätige das Einverständnis zur Kontaktaufnahme per E-Mail, oder lasse das E-Mail-Feld leer.');
    if (!isProfileComplete(f)) return alert('Bitte zuerst alle Pflichtfelder, den Vertrags-Upload und die Bestätigung am Ende ausfüllen — erst dann können die Angaben übermittelt werden.');
    setTransmitting(true);
    setTransmitMsg(null);
    try {
      const submittedAt = new Date().toLocaleString('de-DE');
      const toSave = { ...f, submitted: true, submittedAt };
      setF(toSave);
      await onSave(toSave);
      setSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }));
      try {
        const res = await fetch('/.netlify/functions/notify-submission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeName, profile: toSave }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.ok) setTransmitMsg({ ok: true, text: 'Deine Angaben wurden übermittelt — Hanna und Oliver wurden per E-Mail benachrichtigt.' });
        else setTransmitMsg({ ok: false, text: 'Deine Angaben sind gespeichert, die Benachrichtigungs-Mail konnte aber gerade nicht verschickt werden (' + (data.error || 'unbekannter Fehler') + '). Bitte kurz direkt Bescheid geben.' });
      } catch (mailErr) {
        setTransmitMsg({ ok: false, text: 'Deine Angaben sind gespeichert, die Benachrichtigungs-Mail konnte aber gerade nicht verschickt werden. Bitte kurz direkt Bescheid geben.' });
      }
    } finally {
      setTransmitting(false);
    }
  };

  const complete = isProfileComplete(f);
  const befristet = f.vertragsform === 'befristet_vz' || f.vertragsform === 'befristet_tz';

  return (
    <div>
      <Label>Meine Daten</Label>
      <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>
        Grundlage für dein Gespräch mit uns und die künftige Lohn-/Gehaltsabrechnung. Bitte vollständig ausfüllen — du kannst jederzeit zurückkommen und ergänzen, nichts geht verloren.
      </p>
      {!complete && !readOnly && (
        <div style={{ background: '#fdf3ea', border: '1px solid ' + T.mauveSoft, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: T.muted, marginBottom: 16 }}>
          Noch nicht vollständig — Pflichtfelder unten, der Vertrags-Upload sowie die Bestätigung am Ende fehlen noch teilweise.
        </div>
      )}

      <div style={readOnly ? { pointerEvents: 'none', opacity: 0.75 } : undefined}>

      <DsgvoCard f={f} set={set} />

      <div style={cardS}>
        <p style={subLabel}>Deine Rolle bei PhysioPro Bad Schwartau</p>
        <input value={f.position} onChange={e => set('position', e.target.value)} placeholder="Deine Position (z. B. Physiotherapeut:in, Rezeption, Pilates-Trainer:in)" style={fieldS} />
      </div>

      <div style={cardS}>
        <p style={subLabel}>Persönliche Daten</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.nachname} onChange={e => set('nachname', e.target.value)} placeholder="Nachname" style={{ ...fieldS, flex: 1 }} />
          <input value={f.vorname} onChange={e => set('vorname', e.target.value)} placeholder="Vorname" style={{ ...fieldS, flex: 1 }} />
          <input value={f.geburtsname} onChange={e => set('geburtsname', e.target.value)} placeholder="Geburtsname (falls abweichend)" style={{ ...fieldS, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.strasse} onChange={e => set('strasse', e.target.value)} placeholder="Straße & Hausnummer" style={{ ...fieldS, flex: 2 }} />
          <input value={f.plz} onChange={e => set('plz', e.target.value)} placeholder="PLZ" style={{ ...fieldS, flex: 1 }} />
          <input value={f.ort} onChange={e => set('ort', e.target.value)} placeholder="Ort" style={{ ...fieldS, flex: 1.5 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input type="date" value={f.geburtsdatum} onChange={e => set('geburtsdatum', e.target.value)} style={{ ...fieldS, flex: 1 }} />
          <select value={f.geschlecht} onChange={e => set('geschlecht', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Geschlecht …</option>
            <option value="maennlich">männlich</option>
            <option value="weiblich">weiblich</option>
            <option value="divers">divers</option>
            <option value="unbestimmt">unbestimmt</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.geburtsort} onChange={e => set('geburtsort', e.target.value)} placeholder="Geburtsort" style={{ ...fieldS, flex: 1 }} />
          <input value={f.geburtsland} onChange={e => set('geburtsland', e.target.value)} placeholder="Geburtsland" style={{ ...fieldS, flex: 1 }} />
          <input value={f.staatsangehoerigkeit} onChange={e => set('staatsangehoerigkeit', e.target.value)} placeholder="Staatsangehörigkeit" style={{ ...fieldS, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.steuerId} onChange={e => set('steuerId', e.target.value)} placeholder="Steuer-ID" style={{ ...fieldS, flex: 1 }} />
          <select value={f.steuerklasse} onChange={e => set('steuerklasse', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Steuerklasse …</option>
            {['I', 'II', 'III', 'IV', 'V', 'VI'].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <input value={f.konfession} onChange={e => set('konfession', e.target.value)} placeholder="Konfession (optional)" style={{ ...fieldS, flex: 1 }} />
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
          <input value={f.bic} onChange={e => set('bic', e.target.value)} placeholder="BIC" style={{ ...fieldS, flex: 1 }} />
          <input value={f.kontoinhaber} onChange={e => set('kontoinhaber', e.target.value)} placeholder="Kontoinhaber (falls abweichend)" style={{ ...fieldS, flex: 1 }} />
        </div>
        <select value={f.schwerbehinderung} onChange={e => set('schwerbehinderung', e.target.value)} style={fieldS}>
          <option value="">Schwerbehinderung — freiwillige Angabe</option>
          <option value="ja">Ja</option>
          <option value="nein">Nein</option>
        </select>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Kontakt</p>
        <input type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="Deine E-Mail-Adresse" style={fieldS} />
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: T.muted, lineHeight: 1.6, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.emailConsent} onChange={e => set('emailConsent', e.target.checked)} style={{ marginTop: 2 }} />
          <span>Ich bin damit einverstanden, dass PhysioPro Bad Schwartau mich unter dieser E-Mail-Adresse kontaktieren darf.</span>
        </label>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Kinder mit nachweisbarer Elterneigenschaft</p>
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 10px', lineHeight: 1.6 }}>Nur falls vorhanden — relevant u. a. für die Pflegeversicherung.</p>
        {f.kinder.map((k, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <input value={k.name} onChange={e => setKind(i, 'name', e.target.value)} placeholder="Nachname" style={{ ...fieldS, marginBottom: 0, flex: 1 }} />
            <input value={k.vorname} onChange={e => setKind(i, 'vorname', e.target.value)} placeholder="Vorname" style={{ ...fieldS, marginBottom: 0, flex: 1 }} />
            <input type="date" value={k.geburtsdatum} onChange={e => setKind(i, 'geburtsdatum', e.target.value)} style={{ ...fieldS, marginBottom: 0, flex: 1 }} />
            <button onClick={() => delKind(i)} style={{ background: 'none', border: 'none', color: T.faint, fontSize: 12, cursor: 'pointer' }}>entfernen</button>
          </div>
        ))}
        {f.kinder.length < 5 && <button onClick={addKind} style={{ background: 'none', border: '1px dashed ' + T.line, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>+ Kind hinzufügen</button>}
      </div>

      <div style={cardS}>
        <p style={subLabel}>Beschäftigung</p>
        <input type="date" value={f.ersteintrittsdatum} onChange={e => set('ersteintrittsdatum', e.target.value)} style={fieldS} placeholder="Ersteintrittsdatum" />
        <p style={{ fontSize: 11, color: T.faint, margin: '-6px 0 12px' }}>Dein allererstes Eintrittsdatum bei deinem bisherigen Arbeitgeber (nicht das Datum des Wechsels zu uns) — deine Betriebszugehörigkeit bleibt erhalten und wirkt sich u. a. auf Urlaubsanspruch und Kündigungsfristen aus.</p>
        <input value={f.taetigkeit} onChange={e => set('taetigkeit', e.target.value)} placeholder="Ausgeübte Tätigkeit (Details, falls von der Position oben abweichend)" style={fieldS} />
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={f.beschaeftigungsart} onChange={e => set('beschaeftigungsart', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Haupt- oder Nebenbeschäftigung?</option>
            <option value="haupt">Hauptbeschäftigung</option>
            <option value="neben">Nebenbeschäftigung</option>
          </select>
          <select value={f.geringfuegig} onChange={e => set('geringfuegig', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Geringfügige Beschäftigung (Minijob)?</option>
            <option value="ja">Ja</option>
            <option value="nein">Nein</option>
          </select>
        </div>
        <select value={f.nebentaetigkeit} onChange={e => set('nebentaetigkeit', e.target.value)} style={fieldS}>
          <option value="">Übst du (an anderer Stelle) weitere Beschäftigungen aus?</option>
          <option value="ja">Ja</option>
          <option value="nein">Nein</option>
        </select>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={f.vertragsform} onChange={e => set('vertragsform', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Vertragsform …</option>
            <option value="unbefristet_vz">Unbefristet, Vollzeit</option>
            <option value="unbefristet_tz">Unbefristet, Teilzeit</option>
            <option value="befristet_vz">Befristet, Vollzeit</option>
            <option value="befristet_tz">Befristet, Teilzeit</option>
          </select>
          <input value={f.urlaubsanspruch} onChange={e => set('urlaubsanspruch', e.target.value)} placeholder="Urlaubsanspruch (Tage/Kalenderjahr)" style={{ ...fieldS, flex: 1 }} />
        </div>
        {befristet && (
          <div style={{ background: T.bg, border: '1px solid ' + T.line, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: T.faint }}>Befristet bis</label>
                <input type="date" value={f.befristetBis} onChange={e => set('befristetBis', e.target.value)} style={{ ...fieldS, marginBottom: 0 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: T.faint }}>Schriftlicher Vertrag abgeschlossen am</label>
                <input type="date" value={f.befristetAbschluss} onChange={e => set('befristetAbschluss', e.target.value)} style={{ ...fieldS, marginBottom: 0 }} />
              </div>
            </div>
          </div>
        )}
        <p style={{ fontSize: 11, color: T.faint, margin: '0 0 8px' }}>Aktuelle & gewünschte Arbeitszeiten (Mo–Fr) — bitte jeweils von/bis angeben. Ist ein Tag frei, einfach leer lassen.</p>
        <div style={{ overflowX: 'auto', marginBottom: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0 8px 8px 0', color: T.faint, fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tag</th>
                <th colSpan={2} style={{ textAlign: 'center', padding: '0 0 8px', color: T.faint, fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aktuell</th>
                <th colSpan={2} style={{ textAlign: 'center', padding: '0 0 8px', color: T.faint, fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wunsch</th>
                <th style={{ padding: '0 0 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {WOCHENTAGE.map(([tag, label]) => {
                const z = f.arbeitszeiten[tag] || { aktuellVon: '', aktuellBis: '', wunschVon: '', wunschBis: '' };
                const timeSelect = (value, onChange) => (
                  <select value={value} onChange={onChange} style={{ ...fieldS, marginBottom: 0, padding: '7px 6px', fontSize: 12.5, minWidth: 82 }}>
                    <option value="">–</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                );
                return (
                  <tr key={tag} style={{ borderTop: '1px solid ' + T.lineSoft }}>
                    <td style={{ padding: '8px 8px 8px 0', color: T.ink }}>{label}</td>
                    <td style={{ padding: '8px 4px' }}>{timeSelect(z.aktuellVon, e => setZeit(tag, 'aktuellVon', e.target.value))}</td>
                    <td style={{ padding: '8px 4px' }}>{timeSelect(z.aktuellBis, e => setZeit(tag, 'aktuellBis', e.target.value))}</td>
                    <td style={{ padding: '8px 4px' }}>{timeSelect(z.wunschVon, e => setZeit(tag, 'wunschVon', e.target.value))}</td>
                    <td style={{ padding: '8px 4px' }}>{timeSelect(z.wunschBis, e => setZeit(tag, 'wunschBis', e.target.value))}</td>
                    <td style={{ padding: '8px 0 8px 4px' }}>
                      <button type="button" onClick={() => uebernehmenTag(tag)} title="Wunschzeit = aktuelle Zeit für diesen Tag" style={{ background: 'none', border: '1px dashed ' + T.line, borderRadius: 6, padding: '5px 8px', fontSize: 11, color: T.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>↳ übernehmen</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={uebernehmenAlle} style={{ background: 'none', border: '1px dashed ' + T.line, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>+ Wunschzeiten = aktuelle Zeiten für alle Tage übernehmen</button>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Schul- & Berufsausbildung</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={f.schulabschluss} onChange={e => set('schulabschluss', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Höchster Schulabschluss …</option>
            <option value="ohne">ohne Schulabschluss</option>
            <option value="haupt_volksschule">Haupt-/Volksschulabschluss</option>
            <option value="mittlere_reife">Mittlere Reife/gleichwertig</option>
            <option value="abitur">Abitur/Fachabitur</option>
          </select>
          <select value={f.berufsausbildung} onChange={e => set('berufsausbildung', e.target.value)} style={{ ...fieldS, flex: 1 }}>
            <option value="">Höchste Berufsausbildung …</option>
            <option value="ohne">ohne beruflichen Ausbildungsabschluss</option>
            <option value="ausbildung">Anerkannte Berufsausbildung</option>
            <option value="meister">Meister/Techniker/gleichwertig</option>
            <option value="bachelor">Bachelor</option>
            <option value="diplom_master">Diplom/Magister/Master/Staatsexamen</option>
            <option value="promotion">Promotion</option>
          </select>
        </div>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Arbeitsvertrag</p>
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 10px', lineHeight: 1.6 }}>Bitte deinen bisherigen Arbeitsvertrag hochladen (PDF oder Scan/Foto).</p>
        {f.vertrag
          ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileChip name={f.vertrag.name} url={f.vertrag.url} />
              <button onClick={() => set('vertrag', null)} style={{ background: 'none', border: 'none', color: T.faint, fontSize: 12, cursor: 'pointer' }}>entfernen</button>
            </div>
          : <UploadButton folder="badschwartau-vertraege" accept="image/*,.pdf,.docx,.doc" label="+ Arbeitsvertrag hochladen" onUploaded={file => set('vertrag', { url: file.url, name: file.name, path: file.path })} />}
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
          <UploadButton folder="badschwartau-qualifikationen" accept="image/*,.pdf,.docx,.doc" label="+ Datei hochladen" onUploaded={file => { set('qualifikationen', [...f.qualifikationen, { url: file.url, name: file.name, path: file.path, bezeichnung: qLabel }]); setQLabel(''); }} />
        </div>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Vermögenswirksame Leistungen (VWL)</p>
        <select value={f.vwl} onChange={e => set('vwl', e.target.value)} style={fieldS}>
          <option value="">Erhältst du VWL? Nur ausfüllen, falls ein Vertrag vorliegt.</option>
          <option value="ja">Ja</option>
          <option value="nein">Nein</option>
        </select>
        {f.vwl === 'ja' && (
          <>
            <div style={{ display: 'flex', gap: 12 }}>
              <input value={f.vwlEmpfaenger} onChange={e => set('vwlEmpfaenger', e.target.value)} placeholder="Empfänger (z. B. Bausparkasse)" style={{ ...fieldS, flex: 1 }} />
              <input value={f.vwlVertragsnr} onChange={e => set('vwlVertragsnr', e.target.value)} placeholder="Vertragsnummer" style={{ ...fieldS, flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input value={f.vwlBetrag} onChange={e => set('vwlBetrag', e.target.value)} placeholder="Betrag (€/Mon.)" style={{ ...fieldS, flex: 1 }} />
              <input value={f.vwlAgAnteil} onChange={e => set('vwlAgAnteil', e.target.value)} placeholder="AG-Anteil (€/Mon.)" style={{ ...fieldS, flex: 1 }} />
              <input type="date" value={f.vwlSeit} onChange={e => set('vwlSeit', e.target.value)} style={{ ...fieldS, flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input value={f.vwlIban} onChange={e => set('vwlIban', e.target.value)} placeholder="IBAN (VWL-Konto)" style={{ ...fieldS, flex: 1 }} />
              <input value={f.vwlBic} onChange={e => set('vwlBic', e.target.value)} placeholder="BIC (VWL-Konto)" style={{ ...fieldS, flex: 1 }} />
            </div>
          </>
        )}
      </div>

      <div style={cardS}>
        <p style={subLabel}>Vorbeschäftigungszeiten im laufenden Kalenderjahr</p>
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 10px', lineHeight: 1.6 }}>Falls du dieses Jahr bereits woanders steuerpflichtig beschäftigt warst.</p>
        {f.vorbeschaeftigungen.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <input type="date" value={v.von} onChange={e => setVorbesch(i, 'von', e.target.value)} style={{ ...fieldS, marginBottom: 0, flex: 1 }} />
            <input type="date" value={v.bis} onChange={e => setVorbesch(i, 'bis', e.target.value)} style={{ ...fieldS, marginBottom: 0, flex: 1 }} />
            <input value={v.art} onChange={e => setVorbesch(i, 'art', e.target.value)} placeholder="Art der Beschäftigung" style={{ ...fieldS, marginBottom: 0, flex: 1.5 }} />
            <input value={v.tage} onChange={e => setVorbesch(i, 'tage', e.target.value)} placeholder="Tage" style={{ ...fieldS, marginBottom: 0, flex: 0.6 }} />
            <button onClick={() => delVorbesch(i)} style={{ background: 'none', border: 'none', color: T.faint, fontSize: 12, cursor: 'pointer' }}>entfernen</button>
          </div>
        ))}
        <button onClick={addVorbesch} style={{ background: 'none', border: '1px dashed ' + T.line, borderRadius: 8, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>+ Zeitraum hinzufügen</button>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Für die Gehaltsabrechnung</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <input value={f.wazBisher} onChange={e => set('wazBisher', e.target.value)} placeholder="Bisherige Wochenarbeitszeit gesamt (Std.)" style={{ ...fieldS, flex: 1 }} />
          <input value={f.gehaltBisher} onChange={e => set('gehaltBisher', e.target.value)} placeholder="Bisheriges Gehalt (€, brutto)" style={{ ...fieldS, flex: 1 }} />
        </div>
        <p style={{ fontSize: 11, color: T.faint, margin: '-6px 0 0' }}>Bitte laut deinem bisherigen Arbeitsvertrag angeben — wird im Gespräch abgeglichen.</p>
      </div>

      <div style={cardS}>
        <p style={subLabel}>Anmerkungen</p>
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 10px', lineHeight: 1.6 }}>Gibt es sonst noch etwas, das wir wissen sollten? Freiwillig.</p>
        <textarea value={f.anmerkung} onChange={e => set('anmerkung', e.target.value)} placeholder="Deine Anmerkung …" rows={3} style={{ ...fieldS, marginBottom: 0, fontFamily: 'inherit', resize: 'vertical' }} />
      </div>

      <div style={cardS}>
        <p style={subLabel}>Erklärung</p>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12.5, color: T.muted, lineHeight: 1.6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={f.erklaerungBestaetigt}
            onChange={e => { set('erklaerungBestaetigt', e.target.checked); if (e.target.checked && !f.erklaerungDatum) set('erklaerungDatum', new Date().toLocaleDateString('de-DE')); }}
            style={{ marginTop: 2 }}
          />
          <span>Ich versichere, dass die vorstehenden Angaben der Wahrheit entsprechen. Ich verpflichte mich, alle Änderungen, insbesondere in Bezug auf weitere Beschäftigungen (Art, Dauer und Entgelt), unverzüglich mitzuteilen.{f.erklaerungDatum && <> <span style={{ color: T.faint }}>(bestätigt am {f.erklaerungDatum})</span></>}</span>
        </label>
        <p style={{ fontSize: 11, color: T.faint, margin: '8px 0 0' }}>Diese digitale Bestätigung ersetzt keine ggf. gesondert erforderliche handschriftliche Unterschrift auf dem Arbeitsvertrag selbst.</p>
      </div>
      </div>

      {readOnly
        ? <p style={{ fontSize: 12, color: T.faint, fontStyle: 'italic' }}>Vorschau-Modus — dieses Formular wird hier nur angezeigt, nicht gespeichert.</p>
        : <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
              <button onClick={submit} disabled={saving} style={{ ...secondaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Wird gespeichert …' : 'Speichern'}</button>
              <button onClick={transmit} disabled={transmitting} style={{ ...primaryBtn, background: T.green, opacity: transmitting ? 0.6 : 1, cursor: transmitting ? 'default' : 'pointer' }}>{transmitting ? 'Wird übermittelt …' : 'Angaben übermitteln'}</button>
              {savedAt && <span style={{ fontSize: 12, color: T.greenSoft }}>Gespeichert um {savedAt}</span>}
            </div>
            <p style={{ fontSize: 11.5, color: T.faint, margin: '0 0 8px', lineHeight: 1.6 }}>„Speichern" sichert deinen Stand zwischendurch. Erst mit „Angaben übermitteln" — wenn alles vollständig ausgefüllt ist — bekommen Hanna und Oliver automatisch eine Benachrichtigung, dass deine Daten fertig sind.</p>
            {f.submitted && <p style={{ fontSize: 12, color: T.greenSoft, margin: '0 0 4px' }}>✓ Übermittelt am {f.submittedAt}</p>}
            {transmitMsg && <p style={{ fontSize: 12, color: transmitMsg.ok ? T.greenSoft : T.mauve, margin: 0 }}>{transmitMsg.text}</p>}
          </div>}

      {!readOnly && (
        <div style={{ ...cardS, background: T.chip, border: 'none' }}>
          <p style={subLabel}>Dein öffentliches Profil</p>
          <p style={{ fontSize: 12, color: T.muted, margin: '0 0 10px', lineHeight: 1.6 }}>Zusätzlich kannst du dein eigenes Profil (Bio/Vorstellung) für unsere Website pflegen — das ist ein separates, kurzes Formular.</p>
          <a href={`${PROFIL_FORMULAR_URL}?typ=${fragebogenTyp(f.position)}&name=${encodeURIComponent(employeeName)}`} target="_blank" rel="noopener noreferrer" style={{ color: T.mauve, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>→ Mein Profil pflegen</a>
        </div>
      )}
    </div>
  );
};

const LABELS = {
  geschlecht: { maennlich: 'männlich', weiblich: 'weiblich', divers: 'divers', unbestimmt: 'unbestimmt' },
  vertragsform: { unbefristet_vz: 'Unbefristet, Vollzeit', unbefristet_tz: 'Unbefristet, Teilzeit', befristet_vz: 'Befristet, Vollzeit', befristet_tz: 'Befristet, Teilzeit' },
  beschaeftigungsart: { haupt: 'Hauptbeschäftigung', neben: 'Nebenbeschäftigung' },
  schulabschluss: { ohne: 'ohne Schulabschluss', haupt_volksschule: 'Haupt-/Volksschulabschluss', mittlere_reife: 'Mittlere Reife/gleichwertig', abitur: 'Abitur/Fachabitur' },
  berufsausbildung: { ohne: 'ohne beruflichen Ausbildungsabschluss', ausbildung: 'Anerkannte Berufsausbildung', meister: 'Meister/Techniker/gleichwertig', bachelor: 'Bachelor', diplom_master: 'Diplom/Magister/Master/Staatsexamen', promotion: 'Promotion' },
};
const lbl = (field, v) => (v && LABELS[field] && LABELS[field][v]) || v || '–';

const DetailRow = ({ label, value }) => <div><span style={{ color: T.faint }}>{label}: </span>{value}</div>;

const ProfileDetail = ({ s }) => {
  const befristet = s.vertragsform === 'befristet_vz' || s.vertragsform === 'befristet_tz';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 13 }}>
      <div>
        <p style={subLabel}>Rolle & Kontakt</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <DetailRow label="Position" value={s.position || '–'} />
          <DetailRow label="E-Mail" value={s.email ? s.email + (s.emailConsent ? ' (Einverständnis erteilt)' : ' (kein Einverständnis!)') : '–'} />
        </div>
      </div>
      <div>
        <p style={subLabel}>Persönliche Daten</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <DetailRow label="Name" value={[s.vorname, s.nachname].filter(Boolean).join(' ') || '–'} />
          <DetailRow label="Geburtsname" value={s.geburtsname || '–'} />
          <DetailRow label="Geschlecht" value={lbl('geschlecht', s.geschlecht)} />
          <DetailRow label="Adresse" value={`${s.strasse || '–'}, ${s.plz || ''} ${s.ort || ''}`} />
          <DetailRow label="Geburtsdatum" value={s.geburtsdatum || '–'} />
          <DetailRow label="Geburtsort / -land" value={`${s.geburtsort || '–'} / ${s.geburtsland || '–'}`} />
          <DetailRow label="Staatsangehörigkeit" value={s.staatsangehoerigkeit || '–'} />
          <DetailRow label="Steuer-ID / Klasse" value={`${s.steuerId || '–'} / ${s.steuerklasse || '–'}`} />
          <DetailRow label="Konfession" value={s.konfession || '–'} />
          <DetailRow label="Familienstand" value={`${s.familienstand || '–'} · Kinderfreibeträge: ${s.kinderfreibetraege || '–'}`} />
          <DetailRow label="Sozialversicherungsnr." value={s.sozialversicherungsnummer || '–'} />
          <DetailRow label="Krankenkasse" value={s.krankenkasse || '–'} />
          <DetailRow label="IBAN / BIC" value={`${s.iban || '–'} / ${s.bic || '–'}`} />
          <DetailRow label="Kontoinhaber" value={s.kontoinhaber || 'wie oben'} />
          <DetailRow label="Schwerbehinderung" value={s.schwerbehinderung || 'keine Angabe'} />
        </div>
      </div>

      {(s.kinder || []).length > 0 && (
        <div>
          <p style={subLabel}>Kinder mit nachweisbarer Elterneigenschaft</p>
          {s.kinder.map((k, i) => <div key={i} style={{ marginBottom: 2 }}>{[k.vorname, k.name].filter(Boolean).join(' ') || '–'}{k.geburtsdatum ? ` · geb. ${k.geburtsdatum}` : ''}</div>)}
        </div>
      )}

      <div>
        <p style={subLabel}>Beschäftigung</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <DetailRow label="Ersteintrittsdatum" value={s.ersteintrittsdatum || '–'} />
          <DetailRow label="Ausgeübte Tätigkeit" value={s.taetigkeit || '–'} />
          <DetailRow label="Haupt-/Nebenbeschäftigung" value={lbl('beschaeftigungsart', s.beschaeftigungsart)} />
          <DetailRow label="Geringfügig (Minijob)" value={s.geringfuegig || '–'} />
          <DetailRow label="Weitere Beschäftigung anderswo" value={s.nebentaetigkeit || '–'} />
          <DetailRow label="Vertragsform" value={lbl('vertragsform', s.vertragsform)} />
          <DetailRow label="Urlaubsanspruch" value={s.urlaubsanspruch ? s.urlaubsanspruch + ' Tage/Jahr' : '–'} />
          {befristet && <DetailRow label="Befristet bis / Vertrag vom" value={`${s.befristetBis || '–'} / ${s.befristetAbschluss || '–'}`} />}
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={{ color: T.faint, display: 'block', marginBottom: 4 }}>Arbeitszeiten (Mo–Fr):</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {WOCHENTAGE.map(([tag, label]) => {
              const z = (s.arbeitszeiten && s.arbeitszeiten[tag]) || {};
              const aktuell = z.aktuellVon || z.aktuellBis ? `${z.aktuellVon || '–'}–${z.aktuellBis || '–'}` : 'frei';
              const wunsch = z.wunschVon || z.wunschBis ? `${z.wunschVon || '–'}–${z.wunschBis || '–'}` : 'frei';
              return <span key={tag}>{label}: aktuell {aktuell} · Wunsch {wunsch}</span>;
            })}
          </div>
        </div>
      </div>

      <div>
        <p style={subLabel}>Schul- & Berufsausbildung</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <DetailRow label="Höchster Schulabschluss" value={lbl('schulabschluss', s.schulabschluss)} />
          <DetailRow label="Höchste Berufsausbildung" value={lbl('berufsausbildung', s.berufsausbildung)} />
        </div>
      </div>

      <div>
        <span style={{ color: T.faint, display: 'block', marginBottom: 4 }}>Arbeitsvertrag:</span>
        {s.vertrag ? <FileChip name={s.vertrag.name} url={s.vertrag.url} /> : <span style={{ color: T.faint }}>fehlt</span>}
      </div>

      <div>
        <span style={{ color: T.faint, display: 'block', marginBottom: 4 }}>Qualifikationen & Urkunden ({(s.qualifikationen || []).length}):</span>
        {(s.qualifikationen || []).length === 0 && <span style={{ color: T.faint }}>keine</span>}
        {(s.qualifikationen || []).map((q, i) => <FileChip key={i} name={q.bezeichnung ? q.bezeichnung + ' — ' + q.name : q.name} url={q.url} />)}
      </div>

      {s.vwl === 'ja' && (
        <div>
          <p style={subLabel}>Vermögenswirksame Leistungen (VWL)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
            <DetailRow label="Empfänger" value={s.vwlEmpfaenger || '–'} />
            <DetailRow label="Vertragsnummer" value={s.vwlVertragsnr || '–'} />
            <DetailRow label="Betrag / AG-Anteil" value={`${s.vwlBetrag || '–'} € / ${s.vwlAgAnteil || '–'} €`} />
            <DetailRow label="Seit" value={s.vwlSeit || '–'} />
            <DetailRow label="IBAN / BIC (VWL)" value={`${s.vwlIban || '–'} / ${s.vwlBic || '–'}`} />
          </div>
        </div>
      )}

      {(s.vorbeschaeftigungen || []).length > 0 && (
        <div>
          <p style={subLabel}>Vorbeschäftigungszeiten im laufenden Kalenderjahr</p>
          {s.vorbeschaeftigungen.map((v, i) => <div key={i} style={{ marginBottom: 2 }}>{v.von || '–'} bis {v.bis || '–'} · {v.art || '–'}{v.tage ? ` · ${v.tage} Tage` : ''}</div>)}
        </div>
      )}

      <div>
        <p style={subLabel}>Für die Gehaltsabrechnung</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
          <DetailRow label="Bisherige WAZ / Gehalt" value={`${s.wazBisher || '–'} Std. / ${s.gehaltBisher || '–'} €`} />
        </div>
      </div>

      {s.anmerkung && (
        <div>
          <p style={subLabel}>Anmerkungen</p>
          <div>{s.anmerkung}</div>
        </div>
      )}

      <div>
        <span style={{ color: T.faint }}>Datenschutzhinweis bestätigt: </span>
        {s.dsgvoBestaetigt ? <span style={{ color: T.greenSoft }}>✓ ja{s.dsgvoDatum ? ` (${s.dsgvoDatum})` : ''}</span> : <span style={{ color: T.mauve }}>noch nicht</span>}
      </div>
      <div>
        <span style={{ color: T.faint }}>Erklärung bestätigt: </span>
        {s.erklaerungBestaetigt ? <span style={{ color: T.greenSoft }}>✓ ja{s.erklaerungDatum ? ` (${s.erklaerungDatum})` : ''}</span> : <span style={{ color: T.mauve }}>noch nicht</span>}
      </div>
    </div>
  );
};

const AdminTeamAdd = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const reset = () => { setName(''); };
  const submit = async () => { setSaving(true); try { await onAdd(name.trim()); reset(); setOpen(false); } finally { setSaving(false); } };
  if (!open) return <button onClick={() => setOpen(true)} style={{ ...primaryBtn, marginBottom: 20 }}>+ Mitarbeiter hinzufügen</button>;
  return (
    <div style={{ marginBottom: 20, padding: 16, border: '1px solid ' + T.line, borderRadius: 10 }}>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Vor- und Nachname" style={fieldS} />
      <p style={{ fontSize: 11, color: T.faint, margin: '-6px 0 12px' }}>Rolle und E-Mail-Adresse trägt die Person selbst im Formular ein.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={submit} disabled={saving || !name.trim()} style={{ ...primaryBtn, opacity: saving || !name.trim() ? 0.6 : 1, cursor: saving || !name.trim() ? 'default' : 'pointer' }}>{saving ? 'Wird gespeichert …' : 'Hinzufügen'}</button>
        <button onClick={() => { reset(); setOpen(false); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 8, padding: '10px 16px', fontSize: 13, color: T.muted, cursor: 'pointer' }}>Abbrechen</button>
      </div>
    </div>
  );
};

const Admin = ({ user, employees, profiles, onResetPin, onAddEmployee, onDelEmployee, onPreviewEmployee, onLogout }) => {
  const [openId, setOpenId] = useState(null);
  const byId = id => profiles.find(s => s.id === id) || null;
  const rows = employees.map(e => ({ emp: e, s: byId(e.id), complete: isProfileComplete(byId(e.id)) }));
  const doneCount = rows.filter(r => r.complete).length;
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{user.name}</span>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 12px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Abmelden</button>
        </div>
      } />
      <div style={{ flex: 1, maxWidth: 1000, margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem', boxSizing: 'border-box' }}>
        <div style={cardS}>
          <Label>Status ({doneCount}/{employees.length} vollständig)</Label>
          <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>Jede Person trägt ihre eigenen Daten selbst ein. Zum Aufklappen auf eine Zeile klicken.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr) auto', fontSize: 11, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0 8px', borderBottom: '1px solid ' + T.lineSoft }}>
            <span>Name</span><span>Position</span><span>Status</span><span>Zuletzt aktualisiert</span><span></span>
          </div>
          {rows.map(({ emp, s, complete }) => (
            <div key={emp.id}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr) auto', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft, fontSize: 13, color: T.ink }}>
                <span onClick={() => setOpenId(openId === emp.id ? null : emp.id)} style={{ cursor: 'pointer' }}>{emp.name}</span>
                <span onClick={() => setOpenId(openId === emp.id ? null : emp.id)} style={{ color: T.muted, cursor: 'pointer' }}>{s?.position || '–'}</span>
                <span onClick={() => setOpenId(openId === emp.id ? null : emp.id)} style={{ color: s?.submitted ? T.green : complete ? T.greenSoft : (s ? T.mauve : T.faint), fontWeight: 500, cursor: 'pointer' }}>{s?.submitted ? '✓ übermittelt' : complete ? '✓ vollständig' : s ? 'teilweise' : 'ausstehend'}</span>
                <span onClick={() => setOpenId(openId === emp.id ? null : emp.id)} style={{ color: T.faint, fontSize: 12, cursor: 'pointer' }}>{s?.updated || '–'}</span>
                <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => onPreviewEmployee(emp.id)} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '5px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' }} title="Zeigt die Formular-Ansicht dieser Person read-only an">Vorschau</button>
                  {emp.pinSet && <button onClick={() => { if (confirm('PIN für ' + emp.name + ' zurücksetzen?')) onResetPin(emp.id); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '5px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>PIN Reset</button>}
                  <button onClick={() => { if (confirm(emp.name + ' endgültig entfernen? Der Zugang wird sofort gesperrt.')) onDelEmployee(emp.id); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '5px 10px', fontSize: 12, color: '#c0392b', cursor: 'pointer' }}>Löschen</button>
                </span>
              </div>
              {openId === emp.id && (
                <div style={{ padding: '12px 0 18px', borderBottom: '1px solid ' + T.lineSoft }}>
                  {!s && <Empty text="Noch keine Daten eingetragen." />}
                  {s && <ProfileDetail s={s} />}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={cardS}>
          <Label>Mitarbeiter verwalten</Label>
          <AdminTeamAdd onAdd={onAddEmployee} />
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
