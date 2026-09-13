// v4.0 — Portal im gemeinsamen Design (Mobile first).
// Login, News, Dialoge (Mein Bereich), Tools und Protokoll kommen aus dem zentralen
// Mitarbeiter-Dienst (https://mitarbeiter-api.netlify.app). Optik über das zentrale
// Stylesheet ui.css (Instrument Sans, Farben, Kopfzeile, Leiste unten, Kacheln, Felder).
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import logoPhysio from '/logo-physio.svg';
import logoPilates from '/logo-pilates.svg';

// Farben aus dem Design-System (identisch mit den Variablen in ui.css)
const T = {
  bg: '#faf8f4', surface: '#ffffff', line: '#e6e0d6', lineSoft: '#f0ebe1',
  ink: '#2b2b28', muted: '#54513f', faint: '#8a8368',
  green: '#2f4b3a', greenSoft: '#bfd8b4', greenFl: '#eef3ea',
  rose: '#d6a293', roseFl: '#f7e8e2', roseText: '#8f4f3e', roseDark: '#40201a',
  chip: '#efe9dc', warn: '#a9791f', warnFl: '#f7efdd', err: '#9e4634', errFl: '#f7e8e2',
};

const CATEGORIES = ['Ankündigungen', 'Events', 'Info'];
const FIRMS = {
  beide:   { label: 'Beide', short: 'Beide Häuser', tag: 'pp-tag', id: null },
  physio:  { label: 'PhysioPro', short: 'PhysioPro', tag: 'pp-tag pp-tag--gruen', id: 1 },
  pilates: { label: 'Pilates Company', short: 'Pilates Company', tag: 'pp-tag pp-tag--rose', id: 2 },
};
const firmKey = (firmaId) => firmaId === 1 ? 'physio' : firmaId === 2 ? 'pilates' : 'beide';

// ── Zentraler Mitarbeiter-Dienst ────────────────────────────────────────────
// Der Client hält den Token in sessionStorage; damit man am Handy nicht nach
// jedem Schließen neu tippen muss, spiegeln wir ihn zusätzlich in localStorage.
const TOKEN_KEY = 'ma_token_intranet';
const PERSIST_KEY = 'stuff_ma_token';
try {
  if (!sessionStorage.getItem(TOKEN_KEY) && localStorage.getItem(PERSIST_KEY)) sessionStorage.setItem(TOKEN_KEY, localStorage.getItem(PERSIST_KEY));
} catch (e) {}
const MA = window.MitarbeiterClient ? window.MitarbeiterClient({ app: 'intranet' }) : null;
// Direkt aufgerufene Apps leiten hierher um (?von=zeiterfassung): die Kachel wird hervorgehoben,
// die Startseite bleibt der Einstieg – so sieht jeder zuerst News und Hinweise.
const VON_APP = (() => { try { const v = new URLSearchParams(location.search).get('von'); if (v) history.replaceState(null, '', location.pathname); return v; } catch (e) { return null; } })();
const persistToken = () => { try { MA && MA.token ? localStorage.setItem(PERSIST_KEY, MA.token) : localStorage.removeItem(PERSIST_KEY); } catch (e) {} };

const UPLOAD_URL = '/.netlify/functions/upload';
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.85;
const MAX_ATTACHMENTS = 5;

const resizeImageIfNeeded = (file) => new Promise((resolve) => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') { resolve(file); return; }
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    let { width, height } = img;
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) { resolve(file); return; }
    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale); height = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
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

const fmtDate = (ms) => ms ? new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
const fmtDateTime = (ms) => ms ? new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const fmtTermin = (v) => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); };
const isoDate = (v) => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
const heuteLang = () => new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const gruss = () => { const h = new Date().getHours(); return h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'; };
const vornameVon = (name) => (name || '').trim().split(/\s+/)[0] || '';

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => {
  const [phase, setPhase] = useState('loading'); // loading | login | app
  const [boot, setBoot] = useState({ firmen: [], personen: [] });
  const [user, setUser] = useState(null);
  const [news, setNews] = useState([]);
  const [tools, setTools] = useState([]);
  const [dialoge, setDialoge] = useState([]);
  const [ungelesen, setUngelesen] = useState({ nachrichten: 0, dialoge: 0 });
  const [reloadTick, setReloadTick] = useState(0);
  const userRef = useRef(null);

  const reload = () => setReloadTick(t => t + 1);

  // Start: Personenliste laden, gespeicherte Sitzung prüfen
  useEffect(() => {
    (async () => {
      if (!MA) { setPhase('login'); return; }
      const b = await MA.bootstrap({ nurAntragsberechtigte: false });
      if (b && !b.error) setBoot(b);
      if (MA.token) {
        const me = await MA.me();
        if (me && me.user) { setUser(me.user); userRef.current = me.user; setPhase('app'); return; }
      }
      setPhase('login');
    })();
  }, []);

  // Daten laden – nach Login, alle 60 s, bei Tab-Wechsel und auf Wunsch (reload)
  useEffect(() => {
    if (phase !== 'app' || !user) return;
    let stop = false;
    const loadAll = async () => {
      const admin = !!user.isAdmin;
      const [n, a, p] = await Promise.all([
        MA.nachrichten(admin ? { alle: true } : {}),
        MA.apps(),
        MA.posteingang({ status: 'alle', limit: 300 }),
      ]);
      if (stop) return;
      if (n && !n.error) setNews(n.nachrichten || []);
      if (a && !a.error) setTools(a.apps || []);
      if (p && !p.error) { setDialoge(p.dialoge || []); setUngelesen(p.ungelesen || { nachrichten: 0, dialoge: 0 }); }
    };
    loadAll();
    const iv = setInterval(loadAll, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') loadAll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; clearInterval(iv); document.removeEventListener('visibilitychange', onVisible); };
  }, [phase, user, reloadTick]);

  const login = async (mfId, pin) => {
    const r = await MA.login(mfId, pin);
    if (!r) return 'Keine Verbindung zum Mitarbeiter-Dienst.';
    if (r.error === 'pin_falsch') return 'PIN falsch' + (r.verbleibend ? ` – noch ${r.verbleibend} Versuch${r.verbleibend === 1 ? '' : 'e'}.` : '.');
    if (r.error === 'gesperrt') return 'Zu viele Fehlversuche – bitte in 15 Minuten nochmal.';
    if (r.error === 'keine_pin') return 'keine_pin';
    if (r.error) return 'Anmeldung nicht möglich (' + r.error + ').';
    persistToken(); setUser(r.user); userRef.current = r.user; setPhase('app');
    return null;
  };
  const pinSetzen = async (mfId, pin) => {
    const r = await MA.pinSetzen(mfId, pin);
    if (!r) return 'Keine Verbindung zum Mitarbeiter-Dienst.';
    if (r.error === 'pin_existiert') return 'Es gibt schon eine PIN – bitte diese eingeben.';
    if (r.error) return 'PIN konnte nicht gesetzt werden (' + r.error + ').';
    persistToken(); setUser(r.user); userRef.current = r.user; setPhase('app');
    return null;
  };
  const logout = async () => { await MA.logout(); persistToken(); setUser(null); userRef.current = null; setPhase('login'); };

  // Firmen der angemeldeten Person (kann in beiden sein) – steuert die App-Kacheln
  const meineFirmen = user ? [...new Set((boot.personen || []).filter(p => p.mitarbeiterId === user.mitarbeiterId).map(p => p.firmaId))] : [];

  if (phase === 'loading') return <LoadingScreen />;
  if (!MA) return <LoadingScreen text="Der Mitarbeiter-Dienst konnte nicht geladen werden. Bitte Seite neu laden." />;
  if (phase === 'login' || !user) return <Login boot={boot} onLogin={login} onPinSetzen={pinSetzen} />;
  return user.isAdmin
    ? <Admin user={user} news={news} tools={tools} dialoge={dialoge} boot={boot} meineFirmen={meineFirmen} onLogout={logout} onChanged={reload} />
    : <Employee user={user} news={news} tools={tools} dialoge={dialoge} ungelesen={ungelesen} meineFirmen={meineFirmen} onLogout={logout} onChanged={reload} />;
};

// ── Bausteine ───────────────────────────────────────────────────────────────
const ICON_BASE = 'https://mitarbeiter-api.netlify.app/icons/';

// Kopfzeile: 56 px, Logos links, Person und Abmelden rechts
const Kopf = ({ user, onLogout, admin = false, right }) => (
  <header className="pp-kopf">
    <div className="pp-kopf__innen">
      <div className="pp-kopf__logos">
        <img src={logoPhysio} alt="PhysioPro Lübeck" />
        <img src={logoPilates} alt="Pilates Company Lübeck" />
      </div>
      <div className="pp-kopf__rechts">
        {right}
        {user && <div className={'pp-avatar' + (admin ? ' pp-avatar--rose' : '')} title={user.name}>{user.initials || initialsOf(user.name)}</div>}
        {onLogout && <button onClick={onLogout} className="pp-zurueck">Abmelden</button>}
      </div>
    </div>
  </header>
);

const LoadingScreen = ({ text = 'Daten werden geladen …' }) => (
  <div className="pp-seite">
    <Kopf right={<span className="pp-meta" style={{ letterSpacing: '.14em', textTransform: 'uppercase' }}>Portal</span>} />
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div className="pp-spinner" />
      <p className="pp-sek" style={{ textAlign: 'center' }}>{text}</p>
    </div>
  </div>
);

// Navigation: Leiste unten am Handy, Reiter oben ab 1024 px.
// tabs: [key, label, icon, zaehler?]; mobileTabs: abweichende Auswahl für die Leiste unten (max. 5).
const NavIcon = ({ name }) => {
  const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'start': return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>;
    case 'news': return <svg viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="16" rx="3" /><rect x="6.5" y="8" width="5" height="4" rx="1" fill="currentColor" stroke="none" /><path d="M14 9h4M14 12h4M6.5 16h11" /></svg>;
    case 'postfach': return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0z" /></svg>;
    case 'tools': return <svg viewBox="0 0 24 24" {...s}><path d="M10 13a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" /><path d="M14 11a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" /></svg>;
    case 'team': return <svg viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="10" r="2.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0z" /><path d="M16 20h5.5a4.5 4.5 0 0 0-5-4.4" /></svg>;
    case 'audit': return <svg viewBox="0 0 24 24" {...s}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" /></svg>;
    case 'mehr': return <svg viewBox="0 0 24 24" {...s}><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>;
    default: return <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="8" /></svg>;
  }
};
const Nav = ({ tabs, mobileTabs, tab, setTab, rose = () => false }) => {
  const unten = mobileTabs || tabs;
  const aktivUnten = (k, sub) => tab === k || (sub && sub.includes(tab));
  return (
    <>
      <div className="pp-reiter">
        <div className="pp-reiter__innen">
          {tabs.map(([k, l, , n]) => (
            <button key={k} onClick={() => setTab(k)} className={'pp-reiter__tab' + (tab === k ? ' ist-aktiv' : '') + (rose(k) ? ' ist-rose' : '')}>{l}{n ? ' · ' + n : ''}</button>
          ))}
        </div>
      </div>
      <nav className="pp-nav">
        {unten.map(([k, l, icon, n, sub]) => (
          <button key={k} onClick={() => setTab(k)} className={'pp-nav__tab' + (aktivUnten(k, sub) ? ' ist-aktiv' : '') + (rose(k) ? ' ist-rose' : '')}>
            <span className="pp-nav__icon">{n ? <span className="pp-nav__punkt" /> : null}<NavIcon name={icon || k} /></span>
            <span className="pp-nav__label">{l}{n ? ' · ' + n : ''}</span>
          </button>
        ))}
      </nav>
    </>
  );
};

const FirmTag = ({ firm }) => { const f = FIRMS[firm] || FIRMS.beide; return <span className={f.tag}>{f.short}</span>; };
const FirmPicker = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
    {Object.entries(FIRMS).map(([k, f]) => (
      <button key={k} onClick={() => onChange(k)} className={'pp-btn pp-btn--leise' + (value === k ? ' ist-aktiv' : '')} style={value === k ? { background: T.greenFl, borderColor: T.green, color: T.green } : {}}>{f.label}</button>
    ))}
  </div>
);
const Label = ({ children, style }) => <p className="pp-label" style={style}>{children}</p>;
const Marker = ({ letter, tone }) => {
  const color = tone === 'green' ? T.green : tone === 'mauve' ? T.roseText : T.faint;
  const solid = tone === 'solid';
  return <div style={{ width: 32, height: 32, borderRadius: '50%', border: solid ? 'none' : '1.5px solid ' + color, background: solid ? T.greenSoft : 'transparent', color: solid ? T.green : color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{letter}</div>;
};
const catLetter = c => ({ 'Ankündigungen': 'A', 'Events': 'E', 'Info': 'I' }[c] || '•');
const catTone = c => ({ 'Ankündigungen': 'mauve', 'Events': 'green', 'Info': 'green' }[c] || 'green');
const initialsOf = (name) => (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const FileChip = ({ name, url }) => (
  url
    ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, marginRight: 8, padding: '8px 12px', background: T.chip, borderRadius: 100, fontSize: 12.5, color: T.muted, textDecoration: 'none', minHeight: 36 }}>↓ {name}</a>
    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, marginRight: 8, padding: '8px 12px', background: T.chip, borderRadius: 100, fontSize: 12.5, color: T.muted, minHeight: 36 }}>↓ {name}</span>
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
      <button type="button" onClick={() => ref.current.click()} disabled={loading} className="pp-btn pp-btn--leise" style={{ borderStyle: 'dashed' }}>{loading ? 'Wird hochgeladen …' : label}</button>
      {error && <span style={{ fontSize: 12, color: T.err }}>{error}</span>}
    </div>
  );
};

const PendingFiles = ({ files, setFiles, folder, max = MAX_ATTACHMENTS }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    {files.length < max && <UploadButton folder={folder} label="+ Datei anhängen" onUploaded={f => setFiles(fs => [...fs, f])} />}
    {files.map((f, i) => (
      <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <FileChip name={f.name} url={f.url} />
        <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', fontSize: 15, marginLeft: -4, marginTop: 8, minWidth: 32, minHeight: 32 }} title="Entfernen">×</button>
      </span>
    ))}
    {files.length >= max && <span className="pp-meta">Maximal {max} Dateien.</span>}
  </div>
);

const Empty = ({ text }) => <div className="pp-leer">{text}</div>;
const Hinweis = ({ art = 'ok', titel, text }) => (
  <div className={'pp-hinweis' + (art === 'warnung' ? ' pp-hinweis--warnung' : art === 'fehler' ? ' pp-hinweis--fehler' : '')}>
    <span className="pp-hinweis__icon">{art === 'fehler' ? '×' : art === 'warnung' ? '!' : '✓'}</span>
    <div><span className="pp-hinweis__titel">{titel}</span>{text && <span className="pp-hinweis__text">{text}</span>}</div>
  </div>
);

// Formularbaustein: Label über dem Feld (kein Platzhalter als Label)
const Feld = ({ label, children }) => <label className="pp-feld"><span className="pp-feld__label">{label}</span>{children}</label>;
const chkS = { marginBottom: 6 };

// ── Login ───────────────────────────────────────────────────────────────────
// Eine Person kann in beiden Firmen sein (z. B. Hanna, Oliver, Katharina) –
// für das Portal reicht ein Eintrag pro Person; angemeldet wird über das
// erste Arbeitsverhältnis (Admin-Rolle bevorzugt).
const personenDedupe = (personen) => {
  const map = new Map();
  for (const p of personen) {
    const prev = map.get(p.mitarbeiterId);
    if (!prev || (p.rolle === 'admin' && prev.rolle !== 'admin')) map.set(p.mitarbeiterId, { ...p, firmen: prev ? [...prev.firmen, p.firma] : [p.firma] });
    else prev.firmen.push(p.firma);
  }
  return [...map.values()].sort((a, b) => (b.rolle === 'admin') - (a.rolle === 'admin') || a.name.localeCompare(b.name, 'de'));
};

// PIN-Eingabe mit eigener Zifferntastatur (4–6 Stellen); Punkte zeigen den Stand
const PIN_MAX = 6;
const PinPad = ({ value, onChange, hinweis }) => {
  const tippe = d => { if (value.length < PIN_MAX) onChange(value + d); };
  return (
    <div className="pp-pin">
      <div className="pp-pin__punkte">
        {Array.from({ length: PIN_MAX }, (_, i) => <span key={i} className={'pp-pin__punkt' + (i < value.length ? ' ist-voll' : '')} style={i >= 4 && i >= value.length ? { opacity: .45 } : {}} />)}
      </div>
      {hinweis && <span className="pp-meta">{hinweis}</span>}
      <div className="pp-pin__tasten">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <button key={d} type="button" className="pp-pin__taste" onClick={() => tippe(d)}>{d}</button>)}
        <span className="pp-pin__taste pp-pin__taste--leer" />
        <button type="button" className="pp-pin__taste" onClick={() => tippe('0')}>0</button>
        <button type="button" className="pp-pin__taste pp-pin__taste--loeschen" onClick={() => onChange(value.slice(0, -1))} aria-label="Löschen">⌫</button>
      </div>
    </div>
  );
};

const Login = ({ boot, onLogin, onPinSetzen }) => {
  const personen = personenDedupe(boot.personen || []);
  const [sel, setSel] = useState(''); const [pin, setPin] = useState('');
  const [np, setNp] = useState(''); const [cp, setCp] = useState('');
  const [schritt, setSchritt] = useState(1); // PIN festlegen: 1 = neu, 2 = wiederholen
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const [forceSetup, setForceSetup] = useState(false);
  const p = personen.find(x => x.id === sel);
  const setup = p && (!p.pinGesetzt || forceSetup);
  const reset = () => { setPin(''); setNp(''); setCp(''); setSchritt(1); setMsg(''); setForceSetup(false); };
  const go = async () => {
    setMsg(''); setBusy(true);
    let r;
    if (setup) {
      if (np !== cp) { setBusy(false); setCp(''); return setMsg('Die beiden PINs stimmen nicht überein – bitte noch einmal wiederholen.'); }
      r = await onPinSetzen(sel, np);
    } else {
      r = await onLogin(sel, pin);
      if (r === 'keine_pin') { setForceSetup(true); setPin(''); r = 'Noch keine PIN vorhanden – bitte jetzt festlegen.'; }
    }
    setBusy(false); if (r) { setMsg(r); if (!setup) setPin(''); }
  };
  const bereit = setup ? (schritt === 2 && cp.length >= 4) : pin.length >= 4;
  return (
    <div className="pp-seite">
      <Kopf right={<span className="pp-meta" style={{ letterSpacing: '.14em', textTransform: 'uppercase' }}>Portal</span>} />
      <div className="pp-inhalt" style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        <div>
          <h1 className="pp-h1">Anmelden</h1>
          <p className="pp-sek" style={{ marginTop: 8 }}>Name wählen, PIN eingeben. Danach bleibst du auf diesem Gerät angemeldet – auch für Zeiterfassung und Fahrtenbuch.</p>
        </div>
        <div className="pp-karte">
          <Feld label="Name">
            <select value={sel} onChange={e => { setSel(e.target.value); reset(); }} className="pp-select">
              <option value="">Bitte wählen</option>
              {personen.map(e => <option key={e.id} value={e.id}>{e.name}{e.role ? ' · ' + e.role : ''}</option>)}
            </select>
          </Feld>
          {p && !setup && (
            <>
              <span className="pp-feld__label" style={{ display: 'block', marginBottom: 10 }}>PIN</span>
              <PinPad value={pin} onChange={v => { setPin(v); setMsg(''); }} />
            </>
          )}
          {p && setup && schritt === 1 && (
            <>
              <span className="pp-feld__label" style={{ display: 'block', marginBottom: 4 }}>Neue PIN festlegen</span>
              <p className="pp-meta" style={{ margin: '0 0 12px' }}>Erste Anmeldung: 4–6 Ziffern, die nur du kennst. Sie gilt danach für alle unsere Apps.</p>
              <PinPad value={np} onChange={v => { setNp(v); setMsg(''); }} />
            </>
          )}
          {p && setup && schritt === 2 && (
            <>
              <span className="pp-feld__label" style={{ display: 'block', marginBottom: 10 }}>PIN wiederholen</span>
              <PinPad value={cp} onChange={v => { setCp(v); setMsg(''); }} />
            </>
          )}
          {msg && <div style={{ marginTop: 14 }}><Hinweis art="fehler" titel={msg} /></div>}
        </div>
        {p && setup && schritt === 1
          ? <button className="pp-btn pp-btn--breit" disabled={np.length < 4} onClick={() => setSchritt(2)}>{np.length < 4 ? 'Mindestens 4 Ziffern' : 'Weiter'}</button>
          : <button className="pp-btn pp-btn--breit" disabled={!p || !bereit || busy} onClick={go}>{!p ? 'Name und PIN eingeben' : setup ? 'PIN festlegen & anmelden' : bereit ? 'Anmelden' : 'PIN eingeben'}</button>}
        {p && setup && schritt === 2 && <button className="pp-btn pp-btn--sekundaer pp-btn--breit" onClick={() => { setCp(''); setNp(''); setSchritt(1); }}>Noch mal von vorn</button>}
        <p className="pp-meta" style={{ lineHeight: 1.55 }}>PIN vergessen? Hanna oder Oliver können sie zurücksetzen – danach legst du beim nächsten Login eine neue fest.</p>
      </div>
    </div>
  );
};

// ── Kacheln ─────────────────────────────────────────────────────────────────
// Kacheln der Apps, die zur Person passen (Firma) – mit Direkteinstieg:
// der Sitzungs-Token wird im URL-Fragment mitgegeben, die App meldet damit an.
const meineApps = (tools, meineFirmen) => tools.filter(t => t.aktiv && t.imIntranet && (t.firmaId === null || meineFirmen.includes(t.firmaId)));
const appLink = (t) => t.url ? t.url + (MA && MA.token ? '#ma=' + encodeURIComponent(MA.token) : '') : null;

// App-Icons (zentral im Mitarbeiter-Dienst): Zeiterfassung in Physio-Grün oder Pilates-Rosé,
// je nach Firma der angemeldeten Person; Intranet, Login und Fahrtenbuch haben je ein Icon.
const ICON_APPS = ['zeiterfassung', 'intranet', 'login', 'fahrtenbuch'];
const appIcon = (kuerzel, firmaId) => {
  if (!ICON_APPS.includes(kuerzel)) return null;
  const name = kuerzel === 'zeiterfassung' ? (firmaId === 2 ? 'zeiterfassung-pilates' : 'zeiterfassung-physio') : kuerzel;
  return ICON_BASE + name + '.svg';
};
const AppIcon = ({ t, firmaId, size = 48 }) => {
  const src = appIcon(t.kuerzel, firmaId);
  const r = Math.round(size * 0.25);
  return src
    ? <span className="pp-kachel__icon" style={{ width: size, height: size, borderRadius: r }}><img src={src} alt="" style={{ width: size, height: size }} /></span>
    : <span className={'pp-kachel__icon' + (t.firmaId === 2 ? ' pp-kachel__icon--rose' : '')} style={{ width: size, height: size, borderRadius: r, fontSize: Math.round(size * 0.33) }}>{t.abk || initialsOf(t.name)}</span>;
};

// Eine Kachel: Icon links, Titel + Firmen-Tag, eine Zeile Beschreibung, Badge rechts
const Kachel = ({ icon, titel, tag, text, badge, href, onClick, inaktiv = false, hervor = false }) => {
  const st = hervor ? { borderColor: T.green, boxShadow: '0 0 0 3px ' + T.greenFl } : undefined;
  const inner = (
    <>
      {icon}
      <span className="pp-kachel__text">
        <span className="pp-kachel__titel">{titel}{tag}</span>
        {text && <span className="pp-kachel__sub">{text}</span>}
      </span>
      {badge ? <span className="pp-badge">{badge}</span> : null}
    </>
  );
  if (href) return <a href={href} className="pp-kachel" style={st}>{inner}</a>;
  if (inaktiv) return <div className="pp-kachel ist-inaktiv">{inner}</div>;
  return <button type="button" onClick={onClick} className="pp-kachel" style={st}>{inner}</button>;
};
const NewsTile = ({ neu = 0, onClick }) => <Kachel onClick={onClick} icon={<span className="pp-kachel__icon"><img src={ICON_BASE + 'news.svg'} alt="" /></span>} titel="News" tag={<FirmTag firm="beide" />} text="Ankündigungen, Events und Infos aus dem Team" badge={neu > 0 ? neu + ' neu' : ''} />;
const MeinBereichTile = ({ neu = 0, onClick }) => <Kachel onClick={onClick} icon={<span className="pp-kachel__icon"><img src={ICON_BASE + 'meinbereich.svg'} alt="" /></span>} titel="Mein Bereich" tag={<FirmTag firm="beide" />} text="Deine Nachrichten und Anfragen an die Verwaltung" badge={neu > 0 ? neu + ' neu' : ''} />;

const AppTiles = ({ tools, firmaId = null, children }) => (
  <div className="pp-kacheln">
    {tools.map(t => <Kachel key={t.id} href={appLink(t)} inaktiv={!appLink(t)} hervor={VON_APP === t.kuerzel} icon={<AppIcon t={t} firmaId={firmaId} />} titel={t.name} tag={<FirmTag firm={firmKey(t.firmaId)} />} text={t.beschreibung} />)}
    {children}
  </div>
);

// Begrüßung oben auf der Startseite
const Begruessung = ({ user, nachrichten }) => (
  <div style={{ marginBottom: 16 }}>
    <h1 className="pp-h2" style={{ fontSize: 24 }}>{gruss()}, {vornameVon(user.name)}</h1>
    <p className="pp-sek" style={{ marginTop: 4 }}>{heuteLang()}{nachrichten > 0 ? ` · ${nachrichten} ${nachrichten === 1 ? 'neue Nachricht' : 'neue Nachrichten'}` : ''}</p>
  </div>
);

// Dunkelgrüner Hinweis auf die neueste ungelesene News
const NewsBanner = ({ n, onClick }) => n ? (
  <div className="pp-banner" onClick={onClick} role="button" style={{ marginBottom: 16 }}>
    <span className="pp-banner__punkt" />
    <span className="pp-banner__text">{n.titel}</span>
    <span className="pp-banner__aktion">Ansehen</span>
  </div>
) : null;

// Pop-up für eine wichtige, noch ungelesene News: erscheint beim Start, bis sie gelesen wurde
// („Später" blendet sie nur für diese Sitzung aus).
const WichtigPopup = ({ n, onGelesen }) => {
  const [zu, setZu] = useState(false);
  if (!n || zu) return null;
  let spaeter = false; try { spaeter = sessionStorage.getItem('pp_spaeter_' + n.id) === '1'; } catch (e) {}
  if (spaeter) return null;
  const firm = firmKey(n.firmaId);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(43,43,40,.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => { try { sessionStorage.setItem('pp_spaeter_' + n.id, '1'); } catch (e) {} setZu(true); }}>
      <div className="pp-karte" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, borderRadius: '18px 18px 0 0', padding: '20px 16px calc(20px + env(safe-area-inset-bottom))', maxHeight: '85vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span className="pp-badge">wichtig</span><FirmTag firm={firm} /><span className="pp-meta" style={{ marginLeft: 'auto' }}>{fmtDate(n.erstelltAm)} · {n.von}</span>
        </div>
        <h2 className="pp-h2" style={{ marginBottom: 10 }}>{n.titel}</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: T.muted, whiteSpace: 'pre-wrap' }}>{n.text}</p>
        {n.termin && <p style={{ margin: '10px 0 0', fontSize: 14, color: T.green, fontWeight: 600 }}>📅 {fmtTermin(n.termin)}</p>}
        {n.link && <p style={{ margin: '8px 0 0' }}><a href={n.link} target="_blank" rel="noopener noreferrer" style={{ color: T.green, fontSize: 14, fontWeight: 600 }}>→ {n.linkLabel || n.link}</a></p>}
        {n.anhang && <FileChip name={n.anhang.name || 'Anhang'} url={n.anhang.url || null} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          <button className="pp-btn pp-btn--breit" onClick={async () => { await MA.gelesen(n.id); setZu(true); onGelesen(); }}>Gelesen</button>
          <button className="pp-btn pp-btn--sekundaer pp-btn--breit" onClick={() => { try { sessionStorage.setItem('pp_spaeter_' + n.id, '1'); } catch (e) {} setZu(true); }}>Später</button>
        </div>
      </div>
    </div>
  );
};

// ── Mitarbeiter-Ansicht ─────────────────────────────────────────────────────────────
const Employee = ({ user, news, tools, dialoge, ungelesen, meineFirmen, onLogout, onChanged }) => {
  const [tab, setTab] = useState('start');
  const unread = dialoge.filter(d => d.ungelesen > 0).length;
  const apps = meineApps(tools, meineFirmen);
  const neu = dialoge.filter(d => d.ungelesen > 0);
  const neueNews = news.filter(n => n.aktiv !== false && !n.gelesen);
  const tabs = [['start', 'Start', 'start'], ['news', 'News', 'news', neueNews.length], ['postfach', 'Mein Bereich', 'postfach', unread]];
  return (
    <div className="pp-seite">
      <Kopf user={user} onLogout={onLogout} />
      <Nav tabs={tabs} tab={tab} setTab={setTab} rose={k => k === 'postfach'} />
      <div className="pp-inhalt pp-inhalt--mit-nav">
        {tab === 'start' && (
          <div>
            <Begruessung user={user} nachrichten={neueNews.length + unread} />
            <NewsBanner n={neueNews[0]} onClick={() => setTab('news')} />
            <Label>Meine Apps</Label>
            <AppTiles tools={apps} firmaId={user.firmaId}>
              <NewsTile neu={neueNews.length} onClick={() => setTab('news')} />
              <MeinBereichTile neu={unread} onClick={() => setTab('postfach')} />
            </AppTiles>
            {neu.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <Label>Neu für dich</Label>
                {neu.map(d => <DialogThread key={d.id} d={d} user={user} onChanged={onChanged} />)}
              </div>
            )}
          </div>
        )}
        {tab === 'news' && <NewsFeed news={news} onChanged={onChanged} />}
        {tab === 'postfach' && <Postfach user={user} dialoge={dialoge} onChanged={onChanged} />}
      </div>
      <WichtigPopup key={(neueNews.find(n => n.wichtig) || {}).id} n={neueNews.find(n => n.wichtig)} onGelesen={onChanged} />
    </div>
  );
};

const NewsFeed = ({ news, onChanged }) => {
  const visible = news.filter(n => n.aktiv !== false);
  return (
    <div>
      <Label>News</Label>
      {visible.length === 0 && <Empty text="Noch keine News veröffentlicht." />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
        {visible.map(n => <NewsCard key={n.id} n={n} onRead={async () => { if (!n.gelesen) { await MA.gelesen(n.id); onChanged(); } }} />)}
      </div>
    </div>
  );
};

const PhotoPlaceholder = ({ firm, abbr }) => {
  const bg = firm === 'beide'
    ? 'linear-gradient(135deg,' + T.green + ' 0%,' + T.green + ' 50%,' + T.rose + ' 50%,' + T.rose + ' 100%)'
    : (firm === 'pilates' ? T.rose : T.green);
  return (
    <div style={{ aspectRatio: '16/9', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em' }}>{abbr}</span>
    </div>
  );
};

const NewsCard = ({ n, onRead }) => {
  const [expanded, setExpanded] = useState(false);
  const firm = firmKey(n.firmaId);
  const long = (n.text || '').length > 220;
  const preview = long && !expanded ? n.text.slice(0, 220).trimEnd() + '…' : n.text;
  const photo = n.fotos && n.fotos.length > 0 ? n.fotos[0] : null;
  const abbr = firm === 'pilates' ? 'PC' : firm === 'physio' ? 'PP' : 'PP·PC';
  return (
    <div onClick={onRead} style={{ background: T.surface, border: '1px solid ' + (n.gelesen ? T.line : T.rose), borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {photo?.url
        ? <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}><img src={photo.url} alt={n.titel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
        : <PhotoPlaceholder firm={firm} abbr={abbr} />}
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <FirmTag firm={firm} />
          <span className="pp-tag" style={{ background: 'transparent', border: '1px solid ' + T.line }}>{n.kategorie}</span>
          {!n.gelesen && <span className="pp-badge">neu</span>}
        </div>
        <h3 className="pp-h3" style={{ marginBottom: 8 }}>{n.titel}</h3>
        <p style={{ margin: '0 0 10px', fontSize: 14.5, lineHeight: 1.6, color: T.muted, whiteSpace: 'pre-wrap', flex: 1 }}>{preview}</p>
        {long && <button onClick={e => { e.stopPropagation(); setExpanded(x => !x); onRead(); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: T.green, fontSize: 14, cursor: 'pointer', fontWeight: 600, minHeight: 32 }}>{expanded ? 'weniger anzeigen' : 'mehr lesen'}</button>}
        {n.termin && <p style={{ margin: '10px 0 0', fontSize: 13.5, color: T.green, fontWeight: 600 }}>📅 {fmtTermin(n.termin)}</p>}
        {n.link && <p style={{ margin: '8px 0 0' }}><a href={n.link} target="_blank" rel="noopener noreferrer" style={{ color: T.green, fontSize: 14, fontWeight: 600 }}>→ {n.linkLabel || n.link}</a></p>}
        {n.anhang && <FileChip name={n.anhang.name || 'Anhang'} url={n.anhang.url || null} />}
        <p className="pp-meta" style={{ margin: '12px 0 0' }}>{fmtDate(n.erstelltAm)} · {n.von}</p>
      </div>
    </div>
  );
};

const Postfach = ({ user, dialoge, onChanged }) => (
  <div>
    <Label>Mein Bereich</Label>
    <p className="pp-sek" style={{ margin: '-4px 0 16px' }}>Hier erhältst du persönliche Nachrichten und Dokumente von der Verwaltung. Du kannst direkt antworten und Dateien zurücksenden.</p>
    {dialoge.length === 0 && <Empty text="Noch keine Nachrichten in deinem Bereich." />}
    {dialoge.map(d => <DialogThread key={d.id} d={d} user={user} onChanged={onChanged} />)}
  </div>
);

// Ein Dialog (Mitarbeiter- und Verwaltungsansicht): Kopfzeile aus der Liste,
// beim Aufklappen wird der Verlauf vom Dienst geholt (und als gelesen markiert).
const DialogThread = ({ d, user, admin = false, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState('');
  const [files, setFiles] = useState([]);
  const [mail, setMail] = useState(false);
  const [busy, setBusy] = useState(false);
  const unread = d.ungelesen > 0;
  const load = async () => { const r = await MA.dialog(d.id); if (r && !r.error) setThread(r); };
  const toggle = async () => { const o = !open; setOpen(o); if (o) { await load(); if (unread) onChanged(); } };
  const send = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    const r = await MA.antworten(d.id, reply.trim(), admin && mail, files);
    setBusy(false);
    if (!r || r.error) { alert('Antwort konnte nicht gesendet werden.'); return; }
    setReply(''); setFiles([]); setMail(false); await load(); onChanged();
  };
  const empf = d.empfaenger || [];
  const gelesen = empf.filter(e => e.gelesenAm).length;
  const closed = d.status === 'geschlossen';
  return (
    <div style={{ background: T.surface, border: '1px solid ' + (unread ? T.rose : T.line), borderRadius: 14, overflow: 'hidden', marginBottom: 10, opacity: closed && !open ? 0.75 : 1 }}>
      <div onClick={toggle} style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, minHeight: 76 }}>
        <Marker letter={d.typ === 'system' ? '⚙' : closed ? '✓' : initialsOf(d.von)} tone="solid" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>{d.betreff}{closed ? <span className="pp-tag" style={{ marginLeft: 8, fontWeight: 600 }}>beendet</span> : null}</p>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: T.muted }}>
            {admin ? `an ${empf.length <= 3 ? empf.map(e => e.name).join(', ') : empf.length + ' Personen'}` : `von ${d.von}`} · {fmtDate(d.erstelltAm)}
            {d.anzahl > 1 ? ` · ${d.anzahl} Beiträge` : ''}
          </p>
          {admin && empf.length > 0 && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: T.green }}>{gelesen} von {empf.length} gelesen{empf.length <= 6 ? ': ' + empf.map(e => e.name.split(' ')[0] + (e.gelesenAm ? ' ✓' : '')).join(', ') : ''}</p>}
        </div>
        {unread ? <span className="pp-badge">{d.ungelesen} neu</span> : <span style={{ color: T.faint, fontSize: 14 }}>{open ? '▴' : '▾'}</span>}
      </div>
      {open && (
        <div style={{ padding: '0 14px 14px', fontSize: 14, lineHeight: 1.6, color: T.muted, borderTop: '1px solid ' + T.lineSoft }}>
          {!thread && <p style={{ margin: '12px 0', color: T.faint }}>Wird geladen …</p>}
          {thread && thread.beitraege.map(b => (
            <div key={b.id} style={{ margin: '12px 0 0', padding: '12px 14px', borderRadius: 12, background: b.ich ? T.greenFl : (b.kanal === 'system' ? T.chip : T.bg), marginLeft: b.ich ? 32 : 0 }}>
              <p className="pp-meta" style={{ margin: '0 0 4px' }}>{b.von} · {fmtDateTime(b.erstelltAm)}{b.kanal === 'whatsapp' ? ' · WhatsApp' : b.kanal === 'email' ? ' · E-Mail' : ''}</p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: T.ink }}>{b.text}</p>
              {(b.anhaenge || []).map(a => <FileChip key={a.id} name={a.name} url={a.url} />)}
            </div>
          ))}
          {admin && thread && thread.teilnehmer && (
            <p className="pp-meta" style={{ margin: '10px 0 0' }}>Empfänger: {thread.teilnehmer.filter(t => t.rolle === 'empfaenger').map(t => t.name + (t.gelesenAm ? ' (gelesen ' + fmtDateTime(t.gelesenAm) + ')' : ' (noch nicht gelesen)')).join(' · ')}</p>
          )}
          <div style={{ marginTop: 14, borderTop: '1px solid ' + T.lineSoft, paddingTop: 12 }}>
            {closed && !admin ? (
              <p className="pp-meta" style={{ margin: 0, fontStyle: 'italic' }}>Dieser Dialog wurde von der Verwaltung beendet.</p>
            ) : (
              <>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Antwort schreiben …" className="pp-textarea" style={{ minHeight: 72 }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                  <PendingFiles files={files} setFiles={setFiles} folder="antworten" />
                  {admin && <label className="pp-check" style={{ minHeight: 36 }}><input type="checkbox" checked={mail} onChange={e => setMail(e.target.checked)} /> auch per E-Mail</label>}
                  <button onClick={send} disabled={busy} className="pp-btn pp-btn--klein" style={{ marginLeft: 'auto' }}>Senden</button>
                </div>
                {admin && (
                  <div style={{ marginTop: 10 }}>
                    {closed
                      ? <button onClick={async () => { await MA.dialogOeffnen(d.id); onChanged(); }} className="pp-btn pp-btn--leise">Dialog wieder öffnen</button>
                      : <button onClick={async () => { if (confirm('Diesen Dialog beenden? Die Person kann danach nicht mehr antworten.')) { await MA.dialogSchliessen(d.id); onChanged(); } }} className="pp-btn pp-btn--leise pp-btn--gefahr">Dialog beenden</button>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Verwaltung ────────────────────────────────────────────────────────────────
const Admin = ({ user, news, tools, dialoge, boot, meineFirmen, onLogout, onChanged }) => {
  const [tab, setTab] = useState('start');
  const [employees, setEmployees] = useState([]);
  useEffect(() => { (async () => { const r = await MA.mitarbeiter({ firmaId: null }); if (r && !r.error) setEmployees(r.personen || []); })(); }, [boot]);
  const unread = dialoge.filter(d => d.ungelesen > 0).length;
  const neueNews = news.filter(n => n.aktiv !== false && !n.gelesen).length;
  const tabs = [['start', 'Start', 'start'], ['news', 'News', 'news'], ['tools', 'Tools & Links', 'tools'], ['post', 'Nachrichten', 'postfach', unread], ['team', 'Mitarbeiter', 'team'], ['audit', 'Protokoll', 'audit']];
  // Leiste unten: höchstens fünf Reiter – Tools und Protokoll liegen hinter „Mehr"
  const mobileTabs = [['start', 'Start', 'start'], ['news', 'News', 'news'], ['post', 'Nachrichten', 'postfach', unread], ['team', 'Team', 'team'], ['mehr', 'Mehr', 'mehr', 0, ['tools', 'audit']]];
  return (
    <div className="pp-seite">
      <Kopf user={user} onLogout={onLogout} admin right={<span className="pp-tag pp-tag--rose">Verwaltung</span>} />
      <Nav tabs={tabs} mobileTabs={mobileTabs} tab={tab} setTab={setTab} rose={k => k === 'post'} />
      <div className="pp-inhalt pp-inhalt--mit-nav">
        {tab === 'start' && (
          <div>
            <Begruessung user={user} nachrichten={unread} />
            <Label>Meine Apps</Label>
            <AppTiles tools={meineApps(tools, meineFirmen)} firmaId={user.firmaId}>
              <NewsTile neu={neueNews} onClick={() => setTab('news')} />
              <MeinBereichTile neu={unread} onClick={() => setTab('post')} />
            </AppTiles>
            {unread > 0 && (
              <div style={{ marginTop: 28 }}>
                <Label>Neue Antworten ({unread})</Label>
                {dialoge.filter(d => d.ungelesen > 0).map(d => <DialogThread key={d.id} d={d} user={user} admin onChanged={onChanged} />)}
              </div>
            )}
          </div>
        )}
        {tab === 'mehr' && (
          <div>
            <Label>Mehr</Label>
            <div className="pp-kacheln">
              <Kachel onClick={() => setTab('tools')} icon={<span className="pp-kachel__icon"><NavIcon name="tools" /></span>} titel="Tools & Links" text="Apps und Links für die Kacheln pflegen" />
              <Kachel onClick={() => setTab('audit')} icon={<span className="pp-kachel__icon"><NavIcon name="audit" /></span>} titel="Protokoll" text="Logins, Nachrichten und Lesebestätigungen" />
            </div>
          </div>
        )}
        {tab === 'news' && <AdminNews news={news} onChanged={onChanged} />}
        {tab === 'tools' && <AdminTools tools={tools} onChanged={onChanged} />}
        {tab === 'post' && <AdminPost user={user} employees={employees} dialoge={dialoge} onChanged={onChanged} />}
        {tab === 'team' && <AdminTeam employees={employees} boot={boot} />}
        {tab === 'audit' && <AdminAudit />}
      </div>
    </div>
  );
};

const EditHinweis = ({ text, onCancel }) => (
  <div className="pp-hinweis pp-hinweis--warnung" style={{ marginBottom: 16, alignItems: 'center' }}>
    <span className="pp-hinweis__icon">!</span>
    <span className="pp-hinweis__titel" style={{ flex: 1 }}>{text}</span>
    <button onClick={onCancel} className="pp-btn pp-btn--leise">Abbrechen</button>
  </div>
);

const AdminNews = ({ news, onChanged }) => {
  const [editId, setEditId] = useState(null);
  const [firm, setFirm] = useState('beide');
  const [title, setTitle] = useState(''); const [text, setText] = useState('');
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [link, setLink] = useState(''); const [linkLabel, setLinkLabel] = useState('');
  const [termin, setTermin] = useState('');
  const [photos, setPhotos] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [wichtig, setWichtig] = useState(false);
  const [mail, setMail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leser, setLeser] = useState({});

  const reset = () => { setEditId(null); setFirm('beide'); setTitle(''); setText(''); setCat(CATEGORIES[0]); setLink(''); setLinkLabel(''); setTermin(''); setPhotos([]); setAttachment(null); setWichtig(false); setMail(false); };
  const startEdit = (n) => {
    setEditId(n.id); setFirm(firmKey(n.firmaId)); setTitle(n.titel || ''); setText(n.text || ''); setCat(n.kategorie || CATEGORIES[0]);
    setLink(n.link || ''); setLinkLabel(n.linkLabel || ''); setTermin(isoDate(n.termin)); setPhotos(n.fotos || []); setAttachment(n.anhang || null); setWichtig(!!n.wichtig); setMail(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const submit = async () => {
    if (!title || !text) return alert('Titel und Text nötig');
    if (mail && !confirm('Die News wird zusätzlich per E-Mail an alle aktiven Mitarbeiter mit Adresse geschickt. Fortfahren?')) return;
    setBusy(true);
    const payload = { titel: title, text, kategorie: cat, wichtig, firmaId: FIRMS[firm].id, link: link || null, linkLabel: linkLabel || null, termin: termin || null, fotos: photos, anhang: attachment || null, versandEmail: mail };
    const r = editId ? await MA.nachrichtAendern({ id: editId, ...payload }) : await MA.nachrichtAnlegen(payload);
    setBusy(false);
    if (!r || r.error) return alert('Speichern nicht möglich' + (r && r.error ? ' (' + r.error + ')' : '') + '.');
    if (r.versand) alert(`Veröffentlicht – ${r.versand.gesendet} E-Mail(s) gesendet.`);
    reset(); onChanged();
  };
  const zeigeLeser = async (id) => {
    const r = await MA.leser(id);
    if (!r || r.error) return;
    setLeser(l => ({ ...l, [id]: r }));
  };
  const aktive = news.filter(n => n.aktiv !== false), inaktive = news.filter(n => n.aktiv === false);
  const row = (n) => (
    <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0', borderBottom: '1px solid ' + T.lineSoft }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Marker letter={catLetter(n.kategorie)} tone={catTone(n.kategorie)} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>{n.titel}{n.wichtig && <span className="pp-tag pp-tag--rose" style={{ marginLeft: 8 }}>wichtig</span>}</p>
            <div style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <FirmTag firm={firmKey(n.firmaId)} />
              <span className="pp-meta">{n.kategorie} · {fmtDate(n.erstelltAm)} · {n.von}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => zeigeLeser(n.id)} className="pp-btn pp-btn--leise">Wer hat gelesen?</button>
          <button onClick={() => startEdit(n)} className="pp-btn pp-btn--leise">Bearbeiten</button>
          {n.aktiv !== false
            ? <button onClick={async () => { if (confirm('News zurückziehen? Sie wird für alle ausgeblendet (bleibt aber gespeichert).')) { await MA.nachrichtDeaktivieren(n.id); onChanged(); } }} className="pp-btn pp-btn--leise pp-btn--gefahr">Zurückziehen</button>
            : <button onClick={async () => { await MA.nachrichtAendern({ id: n.id, aktiv: true }); onChanged(); }} className="pp-btn pp-btn--leise">Wieder anzeigen</button>}
        </div>
      </div>
      {leser[n.id] && (
        <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
          <strong>Gelesen ({leser[n.id].gelesen.length}):</strong> {leser[n.id].gelesen.map(p => p.name + ' (' + fmtDate(p.am) + ')').join(', ') || '–'}<br />
          <strong>Noch offen ({leser[n.id].offen.length}):</strong> {leser[n.id].offen.map(p => p.name).join(', ') || '–'}
        </p>
      )}
    </div>
  );
  return (
    <div>
      <div className="pp-karte">
        <Label>{editId ? 'News bearbeiten' : 'News erstellen'}</Label>
        {editId && <EditHinweis text="Du bearbeitest eine bestehende News." onCancel={reset} />}
        <span className="pp-feld__label" style={{ display: 'block', marginBottom: 8 }}>Für welche Firma?</span>
        <FirmPicker value={firm} onChange={setFirm} />
        <Feld label="Titel"><input className="pp-input" value={title} onChange={e => setTitle(e.target.value)} /></Feld>
        <Feld label="Text"><textarea className="pp-textarea" style={{ minHeight: 120 }} value={text} onChange={e => setText(e.target.value)} /></Feld>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}><Feld label="Kategorie"><select className="pp-select" value={cat} onChange={e => setCat(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Feld></div>
          <div style={{ flex: 1, minWidth: 160 }}><Feld label="Termin (optional)"><input type="date" className="pp-input" value={termin} onChange={e => setTermin(e.target.value)} /></Feld></div>
        </div>
        <span className="pp-feld__label" style={{ display: 'block', marginBottom: 8 }}>Titelbild</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          {photos.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: T.chip, borderRadius: 100, fontSize: 12.5, color: T.muted }}>
              {p.url ? <img src={p.url} alt="" style={{ width: 32, height: 22, objectFit: 'cover', borderRadius: 4 }} /> : '▦'} {p.name}
              <span onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: T.roseText, fontWeight: 600, padding: '0 4px' }}>×</span>
            </div>
          ))}
          {photos.length === 0 && <UploadButton folder="news-fotos" accept="image/*" label="+ Foto hochladen" onUploaded={f => setPhotos([{ url: f.url, name: f.name, path: f.path }])} />}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}><Feld label="Web-Link (optional)"><input className="pp-input" placeholder="https://…" value={link} onChange={e => setLink(e.target.value)} /></Feld></div>
          <div style={{ flex: 1, minWidth: 160 }}><Feld label="Link-Text (optional)"><input className="pp-input" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} /></Feld></div>
        </div>
        <span className="pp-feld__label" style={{ display: 'block', marginBottom: 8 }}>Anhang (PDF, Word, Excel)</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <UploadButton folder="news-anhaenge" accept=".pdf,.docx,.xlsx,.doc,.xls" label="+ Anhang hochladen" onUploaded={f => setAttachment({ name: f.name, url: f.url, path: f.path, size: f.size, mimeType: f.mimeType })} />
          {attachment && <span style={{ display: 'inline-flex', alignItems: 'center' }}><FileChip name={attachment.name} url={attachment.url} /><button onClick={() => setAttachment(null)} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', marginTop: 8, minWidth: 32, minHeight: 32 }}>×</button></span>}
        </div>
        <label className="pp-check" style={chkS}><input type="checkbox" checked={wichtig} onChange={e => setWichtig(e.target.checked)} /> Wichtig (wird oben angeheftet)</label>
        <label className="pp-check" style={{ marginBottom: 16 }}><input type="checkbox" checked={mail} onChange={e => setMail(e.target.checked)} /> Zusätzlich per E-Mail an alle mit Adresse senden</label>
        <button className="pp-btn pp-btn--breit" disabled={busy} onClick={submit}>{editId ? 'Änderungen speichern' : 'Veröffentlichen'}</button>
      </div>
      <div className="pp-karte">
        <Label>Veröffentlicht ({aktive.length})</Label>
        {aktive.length === 0 && <Empty text="Noch nichts veröffentlicht." />}
        {aktive.map(row)}
      </div>
      {inaktive.length > 0 && (
        <div className="pp-karte">
          <Label>Zurückgezogen ({inaktive.length})</Label>
          {inaktive.map(row)}
        </div>
      )}
    </div>
  );
};

const AdminTools = ({ tools, onChanged }) => {
  const [editId, setEditId] = useState(null);
  const [abk, setAbk] = useState(''); const [name, setName] = useState('');
  const [desc, setDesc] = useState(''); const [url, setUrl] = useState(''); const [firm, setFirm] = useState('beide');
  const [imIntranet, setImIntranet] = useState(true);
  const reset = () => { setEditId(null); setAbk(''); setName(''); setDesc(''); setUrl(''); setFirm('beide'); setImIntranet(true); };
  const startEdit = t => { setEditId(t.id); setAbk(t.abk || ''); setName(t.name || ''); setDesc(t.beschreibung || ''); setUrl(t.url || ''); setFirm(firmKey(t.firmaId)); setImIntranet(!!t.imIntranet); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const submit = async () => {
    if (!name) return alert('Name nötig');
    const r = await MA.appSetzen({ id: editId || undefined, name, abk: abk || name.slice(0, 2).toUpperCase(), beschreibung: desc, url: url || null, firmaId: FIRMS[firm].id, imIntranet });
    if (!r || r.error) return alert('Speichern nicht möglich' + (r && r.error ? ' (' + r.error + ')' : '') + '.');
    reset(); onChanged();
  };
  return (
    <div>
      <div className="pp-karte">
        <Label>{editId ? 'Tool / Link bearbeiten' : 'Tool / Link hinzufügen'}</Label>
        {editId && <EditHinweis text="Du bearbeitest einen bestehenden Eintrag." onCancel={reset} />}
        <span className="pp-feld__label" style={{ display: 'block', marginBottom: 8 }}>Für welche Firma?</span>
        <FirmPicker value={firm} onChange={setFirm} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 110 }}><Feld label="Kürzel"><input className="pp-input" maxLength={3} value={abk} onChange={e => setAbk(e.target.value.toUpperCase())} /></Feld></div>
          <div style={{ flex: 1 }}><Feld label="Name"><input className="pp-input" placeholder="z. B. Zeiterfassung" value={name} onChange={e => setName(e.target.value)} /></Feld></div>
        </div>
        <Feld label="Kurze Beschreibung"><input className="pp-input" value={desc} onChange={e => setDesc(e.target.value)} /></Feld>
        <Feld label="Link"><input className="pp-input" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} /></Feld>
        <label className="pp-check" style={{ marginBottom: 16 }}><input type="checkbox" checked={imIntranet} onChange={e => setImIntranet(e.target.checked)} /> Als Kachel im Portal zeigen</label>
        <button className="pp-btn pp-btn--breit" onClick={submit}>{editId ? 'Änderungen speichern' : 'Hinzufügen'}</button>
      </div>
      <div className="pp-karte">
        <Label>Apps & Links ({tools.length})</Label>
        <p className="pp-sek" style={{ margin: '-4px 0 12px' }}>Alle Apps der zentralen Datenbank. Nur Einträge mit „Kachel im Portal" erscheinen bei den Mitarbeitern.</p>
        {tools.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid ' + T.lineSoft, gap: 8, flexWrap: 'wrap', opacity: t.aktiv ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <AppIcon t={t} firmaId={null} size={36} />
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>{t.name}{t.imIntranet && <span className="pp-tag pp-tag--gruen" style={{ marginLeft: 8 }}>Kachel</span>}{!t.aktiv && <span className="pp-tag" style={{ marginLeft: 8 }}>eingestellt</span>}</p>
                <div style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <FirmTag firm={firmKey(t.firmaId)} />
                  {t.url && <span className="pp-meta" style={{ wordBreak: 'break-all' }}>{t.url}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => startEdit(t)} className="pp-btn pp-btn--leise">Bearbeiten</button>
              {t.aktiv
                ? <button onClick={async () => { if (confirm(t.name + ' einstellen? Der Eintrag bleibt erhalten, wird aber nirgends mehr angezeigt.')) { await MA.appSetzen({ id: t.id, aktiv: false, imIntranet: false }); onChanged(); } }} className="pp-btn pp-btn--leise pp-btn--gefahr">Einstellen</button>
                : <button onClick={async () => { await MA.appSetzen({ id: t.id, aktiv: true }); onChanged(); }} className="pp-btn pp-btn--leise">Aktivieren</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminPost = ({ user, employees, dialoge, onChanged }) => {
  const [title, setTitle] = useState(''); const [text, setText] = useState('');
  const [target, setTarget] = useState('einzeln'); // einzeln | physio | pilates | beide
  const [inds, setInds] = useState([]);
  const [files, setFiles] = useState([]);
  const [mail, setMail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('offen');
  const persons = personenDedupe(employees).filter(p => p.mitarbeiterId !== user.mitarbeiterId);
  const toggle = id => setInds(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);
  const send = async () => {
    if (!title || !text) return alert('Betreff und Text nötig');
    if (target === 'einzeln' && inds.length === 0) return alert('Mindestens eine Person wählen');
    const wer = target === 'einzeln' ? persons.filter(p => inds.includes(p.mitarbeiterId)).map(p => p.name).join(', ')
      : target === 'beide' ? 'alle Mitarbeiter beider Firmen' : 'alle Mitarbeiter ' + FIRMS[target].label;
    if (!confirm(`„${title}" senden an: ${wer}${mail ? ' – zusätzlich per E-Mail' : ''}?`)) return;
    setBusy(true);
    const d = { betreff: title, text, email: mail, anhaenge: files };
    if (target === 'einzeln') d.mitarbeiterIds = inds; else { d.alle = true; d.firmaId = FIRMS[target].id; }
    const r = await MA.dialogEroeffnen(d);
    setBusy(false);
    if (!r || r.error) return alert('Senden nicht möglich' + (r && r.error ? ' (' + r.error + ')' : '') + '.');
    setTitle(''); setText(''); setInds([]); setFiles([]); setMail(false); onChanged();
  };
  const list = dialoge.filter(d => filter === 'alle' || d.status === 'offen');
  const chip = (on, tone = T.roseText, fl = T.roseFl) => ({ minHeight: 40, padding: '8px 14px', borderRadius: 100, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', border: '1.5px solid ' + (on ? tone : T.line), background: on ? fl : T.surface, color: on ? tone : T.muted });
  return (
    <div>
      <div className="pp-karte">
        <Label>Nachricht / Dokument senden</Label>
        <p className="pp-sek" style={{ margin: '-4px 0 14px' }}>Eröffnet einen Dialog im Bereich „Mein Bereich" der Empfänger. Sie können antworten und Dateien zurücksenden; antwortet jemand, bekommst du eine E-Mail.</p>
        <Feld label="Betreff"><input className="pp-input" value={title} onChange={e => setTitle(e.target.value)} /></Feld>
        <Feld label="Text"><textarea className="pp-textarea" style={{ minHeight: 110 }} value={text} onChange={e => setText(e.target.value)} /></Feld>
        <span className="pp-feld__label" style={{ display: 'block', marginBottom: 8 }}>Anhänge (PDF, Word, Excel, Bilder)</span>
        <div style={{ marginBottom: 14 }}><PendingFiles files={files} setFiles={setFiles} folder="nachrichten" /></div>
        <span className="pp-feld__label" style={{ display: 'block', marginBottom: 8 }}>Empfänger</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setTarget('einzeln')} style={chip(target === 'einzeln', T.green, T.greenFl)}>Einzelne Personen</button>
          <button onClick={() => setTarget('physio')} style={chip(target === 'physio', T.green, T.greenFl)}>Alle PhysioPro</button>
          <button onClick={() => setTarget('pilates')} style={chip(target === 'pilates')}>Alle Pilates Company</button>
          <button onClick={() => setTarget('beide')} style={chip(target === 'beide', T.ink, T.chip)}>Alle (beide Firmen)</button>
        </div>
        {target === 'einzeln' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {persons.map(p => <button key={p.mitarbeiterId} onClick={() => toggle(p.mitarbeiterId)} style={chip(inds.includes(p.mitarbeiterId), T.green, T.greenFl)}>{p.name}</button>)}
          </div>
        )}
        <label className="pp-check" style={{ marginBottom: 16 }}><input type="checkbox" checked={mail} onChange={e => setMail(e.target.checked)} /> Zusätzlich per E-Mail (an alle Empfänger mit Adresse)</label>
        <button className="pp-btn pp-btn--breit" disabled={busy} onClick={send}>Senden</button>
      </div>
      <div className="pp-karte">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Label style={{ margin: 0 }}>Dialoge ({list.length})</Label>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button onClick={() => setFilter('offen')} style={chip(filter === 'offen', T.ink, T.chip)}>Offen</button>
            <button onClick={() => setFilter('alle')} style={chip(filter === 'alle', T.ink, T.chip)}>Alle</button>
          </div>
        </div>
        {list.length === 0 && <Empty text="Keine Dialoge." />}
        {list.map(d => <DialogThread key={d.id} d={d} user={user} admin onChanged={onChanged} />)}
      </div>
    </div>
  );
};

// ── Mitarbeiter (Verwaltung) ──────────────────────────────────────────────────────────
const copyText = async (text, doneMsg = 'Kopiert — jetzt einfügen und an die Person schicken.') => {
  try { await navigator.clipboard.writeText(text); alert(doneMsg); }
  catch (e) { prompt('Kopieren nicht möglich — bitte den Text manuell markieren:', text); }
};
const intranetLink = () => `${window.location.origin}${window.location.pathname}`;

const inviteMessage = (emp, mode = 'invite') => {
  const vorname = (emp.name || '').trim().split(/\s+/)[0] || '';
  const wahl = `deinen Namen auswählen (${emp.name})`;
  if (mode === 'reset') {
    return [
      `Hallo ${vorname},`, '',
      'deine PIN für unsere Apps (Portal, Zeiterfassung, Fahrtenbuch) wurde zurückgesetzt — die alte gilt nicht mehr.', '',
      'Hier geht es zum Portal:', intranetLink(), '',
      `So geht's: Seite öffnen, ${wahl} und eine neue PIN festlegen (4–6 Ziffern). Die PIN kennst nur du — sie gilt danach für alle unsere Apps.`, '',
      'Bei Fragen melde dich einfach.', '', 'Liebe Grüße', 'Hanna',
    ].join('\n');
  }
  return [
    `Hallo ${vorname},`, '',
    'herzlich willkommen im Portal von PhysioPro & Pilates Company — unserem internen Bereich für News, Apps und persönliche Nachrichten von der Verwaltung.', '',
    'Dein Zugang:', intranetLink(), '',
    emp.pinGesetzt
      ? `So geht's: Seite öffnen, ${wahl} und mit deiner PIN anmelden (dieselbe wie in der Zeiterfassung).`
      : `So geht's: Seite öffnen, ${wahl} und beim ersten Mal eine eigene PIN festlegen (4–6 Ziffern). Die PIN kennst nur du — sie gilt danach für alle unsere Apps.`,
    '', 'Tipp: Leg dir die Seite am Handy auf den Startbildschirm, dann hast du sie immer griffbereit.', '',
    'Bei Fragen melde dich einfach.', '', 'Liebe Grüße', 'Hanna',
  ].join('\n');
};

const InvitePanel = ({ emp, onClose, mode = 'invite' }) => {
  const text = inviteMessage(emp, mode);
  return (
    <div style={{ border: '1px solid ' + T.line, borderRadius: 14, padding: 16, marginBottom: 16, background: T.chip }}>
      <p style={{ fontSize: 14, color: T.ink, margin: '0 0 10px', lineHeight: 1.55 }}>
        {mode === 'reset'
          ? <>PIN von <strong>{emp.name}</strong> zurückgesetzt. Hier ist der fertige Hinweistext — einfach kopieren und verschicken (z. B. per WhatsApp oder E-Mail):</>
          : <>Einladung für <strong>{emp.name}</strong> — einfach kopieren und verschicken (z. B. per WhatsApp oder E-Mail):</>}
      </p>
      <pre style={{ fontSize: 13, fontFamily: 'inherit', background: T.surface, border: '1px solid ' + T.line, borderRadius: 12, padding: '12px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0 0 12px', color: T.ink, lineHeight: 1.6 }}>{text}</pre>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => copyText(text, 'Text kopiert — jetzt einfügen und an ' + ((emp.name || '').trim().split(/\s+/)[0] || 'die Person') + ' schicken.')} className="pp-btn pp-btn--klein">Text kopieren</button>
        <button onClick={() => copyText(intranetLink(), 'Link kopiert.')} className="pp-btn pp-btn--leise">Nur den Link kopieren</button>
        <button onClick={onClose} className="pp-btn pp-btn--leise" style={{ border: 'none' }}>Schließen</button>
      </div>
    </div>
  );
};

const AdminTeam = ({ employees, boot }) => {
  const [inviteFor, setInviteFor] = useState(null);
  const [inviteMode, setInviteMode] = useState('invite');
  const pinMap = new Map((boot.personen || []).map(p => [p.mitarbeiterId, p.pinGesetzt]));
  const persons = personenDedupe(employees).map(p => ({ ...p, pinGesetzt: !!pinMap.get(p.mitarbeiterId) }));
  const openInvite = (id, mode) => { if (inviteFor === id && inviteMode === mode) { setInviteFor(null); return; } setInviteMode(mode); setInviteFor(id); };
  const firmLabel = (p) => (p.firmen || []).map(f => f === 'physiopro' ? 'PhysioPro' : 'Pilates').join(' + ');
  return (
    <div className="pp-karte">
      <Label>Mitarbeiter ({persons.length})</Label>
      <p className="pp-sek" style={{ margin: '-4px 0 14px' }}>Stammdaten kommen aus der zentralen Mitarbeiter-Datenbank (Lohnjournal). Neue Personen und Austritte werden dort gepflegt; hier kannst du einladen und PINs zurücksetzen.</p>
      {persons.map(e => (
        <React.Fragment key={e.mitarbeiterId}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: '1px solid ' + T.lineSoft, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>{e.name}</p>
              <p className="pp-meta" style={{ margin: '3px 0 0' }}>{firmLabel(e)}{e.role ? ' · ' + e.role : ''} · PIN {e.pinGesetzt ? 'gesetzt' : 'fehlt'}</p>
              <p className="pp-meta" style={{ margin: '2px 0 0' }}>{e.email || 'keine E-Mail'}{e.telefon ? ' · ' + e.telefon : ''}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => openInvite(e.mitarbeiterId, 'invite')} className="pp-btn pp-btn--leise" title="Fertigen Einladungstext mit Link anzeigen und kopieren">Einladung</button>
              {e.pinGesetzt && <button onClick={async () => { if (confirm('PIN für ' + e.name + ' zurücksetzen? Sie gilt für alle Apps.')) { const r = await MA.pinZuruecksetzen(e.id); if (!r || r.error) return alert('Nicht möglich.'); openInvite(e.mitarbeiterId, 'reset'); } }} className="pp-btn pp-btn--leise pp-btn--gefahr">PIN zurücksetzen</button>}
            </div>
          </div>
          {inviteFor === e.mitarbeiterId && <div style={{ padding: '12px 0' }}><InvitePanel emp={e} mode={inviteMode} onClose={() => setInviteFor(null)} /></div>}
        </React.Fragment>
      ))}
    </div>
  );
};

const AdminAudit = () => {
  const [rows, setRows] = useState(null);
  useEffect(() => { (async () => { const r = await MA.protokoll({ limit: 200 }); setRows(r && !r.error ? r.protokoll : []); })(); }, []);
  return (
    <div className="pp-karte">
      <Label>Protokoll{rows ? ` (${rows.length})` : ''}</Label>
      <p className="pp-sek" style={{ margin: '-4px 0 12px' }}>Logins in allen Apps, gesendete Nachrichten, Antworten und Lesebestätigungen – aus der zentralen Datenbank.</p>
      {!rows && <p className="pp-meta">Wird geladen …</p>}
      {rows && rows.length === 0 && <Empty text="Noch keine Einträge." />}
      {rows && rows.map((a, i) => (
        <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid ' + T.lineSoft, fontSize: 13.5, color: T.muted, lineHeight: 1.5 }}>
          <span className="pp-meta">{fmtDateTime(a.ts)}</span> · <span style={{ color: T.ink, fontWeight: 600 }}>{a.aktion}</span> · {a.wer}{a.detail && <span className="pp-meta"> — {a.detail}</span>}
        </div>
      ))}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
