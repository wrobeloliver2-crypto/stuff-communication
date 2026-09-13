// v3.0 — Mitarbeiter-Dienst (Neon) statt Google Sheets.
// Login, News, Dialoge (Postfach), Tools und Protokoll kommen aus dem zentralen
// Mitarbeiter-Dienst (https://mitarbeiter-api.netlify.app). Dieselben Daten
// sieht man in der Zeiterfassung – ein Postfach, ein Login für alle Apps.
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import logoPhysio from '/logo-physio.svg';
import logoPilates from '/logo-pilates.svg';

const T = {
  bg: '#faf8f4', surface: '#ffffff', line: '#e6e1d6', lineSoft: '#ece7dc',
  ink: '#2b2b28', muted: '#5a584f', faint: '#a39e92',
  green: '#4a5d3a', greenSoft: '#6e8159', mauve: '#b07882', mauveSoft: '#c08a93', chip: '#f4f2eb',
};

const CATEGORIES = ['Ankündigungen', 'Events', 'Info'];
const FIRMS = {
  beide:   { label: 'Beide', short: 'PHYSIOPRO & PILATES', dot: 'split', id: null },
  physio:  { label: 'PhysioPro', short: 'PHYSIOPRO', dot: T.green, id: 1 },
  pilates: { label: 'Pilates Company', short: 'PILATES CO.', dot: T.mauve, id: 2 },
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

// ── App ────────────────────────────────────────────────────────────────────────
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

  if (phase === 'loading') return <LoadingScreen />;
  if (!MA) return <LoadingScreen text="Der Mitarbeiter-Dienst konnte nicht geladen werden. Bitte Seite neu laden." />;
  if (phase === 'login' || !user) return <Login boot={boot} onLogin={login} onPinSetzen={pinSetzen} />;
  return user.isAdmin
    ? <Admin user={user} news={news} tools={tools} dialoge={dialoge} boot={boot} onLogout={logout} onChanged={reload} />
    : <Employee user={user} news={news} tools={tools} dialoge={dialoge} ungelesen={ungelesen} onLogout={logout} onChanged={reload} />;
};

// ── Bausteine ──────────────────────────────────────────────────────────────────
const LoadingScreen = ({ text = 'Daten werden geladen …' }) => (
  <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
    <BrandHeader right={<span style={{ fontSize: 11, color: T.faint, letterSpacing: '0.14em' }}>INTRANET</span>} />
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 20 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #e6e1d6', borderTopColor: '#55725f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: T.faint, margin: 0, textAlign: 'center' }}>{text}</p>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const FirmDot = ({ firm }) => {
  const f = FIRMS[firm] || FIRMS.beide;
  if (f.dot === 'split') return <span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', background: 'linear-gradient(90deg,' + T.green + ' 0 50%,' + T.mauveSoft + ' 50% 100%)' }} />;
  return <span style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', background: f.dot }} />;
};
const FirmTag = ({ firm }) => {
  const f = FIRMS[firm] || FIRMS.beide;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '0.08em', color: T.faint, textTransform: 'uppercase' }}><FirmDot firm={firm} />{f.short}</span>;
};
const FirmPicker = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
    {Object.entries(FIRMS).map(([k, f]) => (
      <button key={k} onClick={() => onChange(k)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: '1px solid ' + (value === k ? T.ink : T.line), background: value === k ? T.chip : T.surface, color: value === k ? T.ink : T.muted }}>
        <FirmDot firm={k} />{f.label}
      </button>
    ))}
  </div>
);
const BrandHeader = ({ right }) => (
  <div style={{ background: T.surface, borderBottom: '1px solid ' + T.lineSoft }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0.7rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
const initialsOf = (name) => (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

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

const PendingFiles = ({ files, setFiles, folder, max = MAX_ATTACHMENTS }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    {files.length < max && <UploadButton folder={folder} label="+ Datei anhängen" onUploaded={f => setFiles(fs => [...fs, f])} />}
    {files.map((f, i) => (
      <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
        <FileChip name={f.name} url={f.url} />
        <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', fontSize: 13, marginLeft: -4, marginTop: 8 }} title="Entfernen">×</button>
      </span>
    ))}
    {files.length >= max && <span style={{ fontSize: 11, color: T.faint }}>Maximal {max} Dateien.</span>}
  </div>
);

const Empty = ({ text }) => <div style={{ textAlign: 'center', padding: '3rem 1rem', color: T.faint, fontSize: 13 }}>{text}</div>;

const cardS = { background: T.surface, border: '0.5px solid ' + T.line, borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' };
const fieldS = { width: '100%', padding: '11px 12px', marginBottom: 12, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.bg };
const primaryBtn = { padding: '10px 20px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const ghostBtn = { background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '6px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' };
const subLabel = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.faint, margin: '0.5rem 0 0.6rem' };
const chkS = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.muted, marginBottom: 12, cursor: 'pointer' };

// ── Login ──────────────────────────────────────────────────────────────────────
// Eine Person kann in beiden Firmen sein (z. B. Hanna, Oliver, Katharina) –
// für das Intranet reicht ein Eintrag pro Person; angemeldet wird über das
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

const Login = ({ boot, onLogin, onPinSetzen }) => {
  const personen = personenDedupe(boot.personen || []);
  const [sel, setSel] = useState(''); const [pin, setPin] = useState('');
  const [np, setNp] = useState(''); const [cp, setCp] = useState('');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const [forceSetup, setForceSetup] = useState(false);
  const p = personen.find(x => x.id === sel);
  const setup = p && (!p.pinGesetzt || forceSetup);
  const inp = { ...fieldS, background: T.surface };
  const btn = tone => ({ width: '100%', padding: 11, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#fff', background: tone, letterSpacing: '0.03em', opacity: busy ? 0.6 : 1 });
  const go = async () => {
    setMsg(''); setBusy(true);
    let r;
    if (setup) {
      if (np.length < 4) { setBusy(false); return setMsg('Mindestens 4 Ziffern.'); }
      if (np !== cp) { setBusy(false); return setMsg('PINs stimmen nicht überein.'); }
      r = await onPinSetzen(sel, np);
    } else {
      r = await onLogin(sel, pin);
      if (r === 'keine_pin') { setForceSetup(true); r = 'Noch keine PIN vorhanden – bitte jetzt festlegen.'; }
    }
    setBusy(false); if (r) setMsg(r);
  };
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader right={<span style={{ fontSize: 11, color: T.faint, letterSpacing: '0.14em' }}>INTRANET</span>} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: T.surface, border: '0.5px solid ' + T.line, borderRadius: 14, padding: '2.5rem', maxWidth: 420, width: '100%' }}>
          <h1 style={{ margin: '0 0 0.4rem', fontSize: 21, fontWeight: 500, color: T.ink }}>Willkommen</h1>
          <p style={{ margin: '0 0 1.5rem', fontSize: 13, color: T.muted }}>Interner Bereich für PhysioPro & Pilates Company. Anmeldung mit deiner PIN – dieselbe wie in der Zeiterfassung.</p>
          <select value={sel} onChange={e => { setSel(e.target.value); setPin(''); setNp(''); setCp(''); setMsg(''); setForceSetup(false); }} style={inp}>
            <option value="">Name wählen …</option>
            {personen.map(e => <option key={e.id} value={e.id}>{e.name}{e.role ? ' · ' + e.role : ''}</option>)}
          </select>
          {p && setup && (
            <form onSubmit={e => { e.preventDefault(); go(); }}>
              <p style={{ fontSize: 12, color: T.muted, margin: '0 0 12px' }}>Erste Anmeldung — bitte PIN festlegen (4–6 Ziffern). Sie gilt danach für alle unsere Apps.</p>
              <input type="password" inputMode="numeric" maxLength={6} placeholder="Neue PIN" value={np} onChange={e => setNp(e.target.value.replace(/\D/g, ''))} style={inp} autoFocus />
              <input type="password" inputMode="numeric" maxLength={6} placeholder="PIN wiederholen" value={cp} onChange={e => setCp(e.target.value.replace(/\D/g, ''))} style={inp} />
              <button type="submit" disabled={busy} style={btn(T.green)}>PIN festlegen & anmelden</button>
            </form>
          )}
          {p && !setup && (
            <form onSubmit={e => { e.preventDefault(); go(); }}>
              <input type="password" inputMode="numeric" maxLength={6} placeholder="Deine PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} style={inp} autoFocus />
              <button type="submit" disabled={busy} style={btn(p.rolle === 'admin' ? T.mauve : T.green)}>Anmelden</button>
            </form>
          )}
          {msg && <p style={{ fontSize: 12.5, color: '#c0392b', margin: '12px 0 0' }}>{msg}</p>}
          <p style={{ fontSize: 11, color: T.faint, margin: '1.5rem 0 0', lineHeight: 1.5 }}>PIN vergessen? Hanna oder Oliver können sie zurücksetzen – danach legst du beim nächsten Login eine neue fest.</p>
        </div>
      </div>
    </div>
  );
};

// ── Mitarbeiter-Ansicht ─────────────────────────────────────────────────────────────
const TabBar = ({ tabs, tab, setTab, tone = () => T.green }) => (
  <div style={{ background: T.surface, borderBottom: '1px solid ' + T.lineSoft }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', display: 'flex', gap: 28, overflowX: 'auto' }}>
      {tabs.map(([k, l]) => (
        <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', padding: '14px 0', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', color: tab === k ? T.ink : T.faint, borderBottom: tab === k ? '2px solid ' + tone(k) : '2px solid transparent', marginBottom: -1 }}>{l}</button>
      ))}
    </div>
  </div>
);

const Employee = ({ user, news, tools, dialoge, ungelesen, onLogout, onChanged }) => {
  const [tab, setTab] = useState('news');
  const unread = dialoge.filter(d => d.ungelesen > 0).length;
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: T.ink }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: 10, color: T.faint, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{user.role || user.firmaName}</p>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: (user.color || T.green) + '22', color: user.color || T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600 }}>{user.initials || initialsOf(user.name)}</div>
          <button onClick={onLogout} style={ghostBtn}>Abmelden</button>
        </div>
      } />
      <TabBar tab={tab} setTab={setTab} tone={k => k === 'postfach' ? T.mauve : T.green}
        tabs={[['news', 'News' + (ungelesen.nachrichten ? ' · ' + ungelesen.nachrichten : '')], ['tools', 'Tools & Links'], ['postfach', 'Mein Bereich' + (unread ? ' · ' + unread : '')]]} />
      <div style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem', boxSizing: 'border-box' }}>
        {tab === 'news' && <NewsFeed news={news} onChanged={onChanged} />}
        {tab === 'tools' && <ToolsList tools={tools.filter(t => t.aktiv && t.imIntranet && (t.firmaId === null || t.firmaId === user.firmaId))} />}
        {tab === 'postfach' && <Postfach user={user} dialoge={dialoge} onChanged={onChanged} />}
      </div>
    </div>
  );
};

const NewsFeed = ({ news, onChanged }) => {
  const visible = news.filter(n => n.aktiv !== false);
  return (
    <div>
      <Label>Firmen-News</Label>
      {visible.length === 0 && <Empty text="Noch keine News veröffentlicht." />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 16 }}>
        {visible.map(n => <NewsCard key={n.id} n={n} onRead={async () => { if (!n.gelesen) { await MA.gelesen(n.id); onChanged(); } }} />)}
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

const NewsCard = ({ n, onRead }) => {
  const [expanded, setExpanded] = useState(false);
  const firm = firmKey(n.firmaId);
  const long = (n.text || '').length > 220;
  const preview = long && !expanded ? n.text.slice(0, 220).trimEnd() + '…' : n.text;
  const photo = n.fotos && n.fotos.length > 0 ? n.fotos[0] : null;
  const abbr = firm === 'pilates' ? 'PC' : firm === 'physio' ? 'PP' : 'PP·PC';
  return (
    <div onClick={onRead} style={{ background: T.surface, border: '0.5px solid ' + (n.gelesen ? T.line : T.mauveSoft), borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {photo?.url
        ? <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}><img src={photo.url} alt={n.titel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
        : <PhotoPlaceholder firm={firm} abbr={abbr} />}
      <div style={{ padding: '1.1rem 1.2rem 1.3rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9, flexWrap: 'wrap' }}>
          <FirmTag firm={firm} />
          <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T[catTone(n.kategorie) === 'mauve' ? 'mauve' : 'green'], border: '1px solid ' + T.line, borderRadius: 20, padding: '3px 9px' }}>{n.kategorie}</span>
          {!n.gelesen && <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fff', background: T.mauve, borderRadius: 20, padding: '3px 9px' }}>neu</span>}
        </div>
        <h3 style={{ margin: '0 0 9px', fontSize: 17, fontWeight: 500, color: T.ink, lineHeight: 1.3 }}>{n.titel}</h3>
        <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.6, color: T.muted, whiteSpace: 'pre-wrap', flex: 1 }}>{preview}</p>
        {long && <button onClick={e => { e.stopPropagation(); setExpanded(x => !x); onRead(); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, color: T.mauve, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>{expanded ? 'weniger anzeigen' : 'mehr lesen'}</button>}
        {n.termin && <p style={{ margin: '10px 0 0', fontSize: 13, color: T.green }}>📅 {fmtTermin(n.termin)}</p>}
        {n.link && <p style={{ margin: '8px 0 0' }}><a href={n.link} target="_blank" rel="noopener noreferrer" style={{ color: T.mauve, fontSize: 13 }}>→ {n.linkLabel || n.link}</a></p>}
        {n.anhang && <FileChip name={n.anhang.name || 'Anhang'} url={n.anhang.url || null} />}
        <p style={{ margin: '12px 0 0', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{fmtDate(n.erstelltAm)} · {n.von}</p>
      </div>
    </div>
  );
};

const ToolsList = ({ tools }) => (
  <div>
    <Label>Tools & Links</Label>
    <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>Unsere Apps und Verweise – Anmeldung überall mit Name und PIN.</p>
    {tools.length === 0 && <Empty text="Noch keine Tools hinterlegt." />}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
      {tools.map(t => {
        const inner = (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 46, height: 46, borderRadius: 11, background: T.chip, color: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 500, flexShrink: 0 }}>{t.abk || initialsOf(t.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 500, color: T.ink }}>{t.name}</p>
                <FirmTag firm={firmKey(t.firmaId)} />
              </div>
              <span style={{ color: T.faint, fontSize: 16 }}>↗</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.55 }}>{t.beschreibung}</p>
          </>
        );
        const base = { background: T.surface, border: '0.5px solid ' + T.line, borderRadius: 12, padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: 13, minHeight: 120 };
        return t.url
          ? <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer" style={{ ...base, textDecoration: 'none' }}>{inner}</a>
          : <div key={t.id} style={{ ...base, opacity: 0.72 }}>{inner}</div>;
      })}
    </div>
  </div>
);

const Postfach = ({ user, dialoge, onChanged }) => (
  <div>
    <Label>Mein persönlicher Bereich</Label>
    <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>Hier erhältst du persönliche Nachrichten und Dokumente von der Verwaltung. Du kannst direkt antworten und Dateien zurücksenden – auch in der Zeiterfassung siehst du dieselben Nachrichten.</p>
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
    <div style={{ background: T.surface, border: '0.5px solid ' + (unread ? T.mauveSoft : T.line), borderRadius: 10, overflow: 'hidden', marginBottom: 9, opacity: closed && !open ? 0.75 : 1 }}>
      <div onClick={toggle} style={{ padding: '13px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13 }}>
        <Marker letter={d.typ === 'system' ? '⚙' : closed ? '✓' : initialsOf(d.von)} tone="solid" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: unread ? 600 : 500, color: T.ink }}>{d.betreff}{closed ? <span style={{ fontSize: 10, color: T.faint, fontWeight: 400, marginLeft: 8, letterSpacing: '0.04em', textTransform: 'uppercase' }}>· beendet</span> : null}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {admin ? `an ${empf.length <= 3 ? empf.map(e => e.name).join(', ') : empf.length + ' Personen'}` : `von ${d.von}`} · {fmtDate(d.erstelltAm)}
            {d.anzahl > 1 ? ` · ${d.anzahl} Beiträge` : ''}{unread ? ' · neu' : ''}
          </p>
          {admin && empf.length > 0 && <p style={{ margin: '4px 0 0', fontSize: 11, color: T.greenSoft }}>{gelesen} von {empf.length} gelesen{empf.length <= 6 ? ': ' + empf.map(e => e.name.split(' ')[0] + (e.gelesenAm ? ' ✓' : '')).join(', ') : ''}</p>}
        </div>
        {unread ? <span style={{ minWidth: 20, height: 20, borderRadius: 10, background: T.mauveSoft, color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', fontWeight: 600 }}>{d.ungelesen}</span> : <span style={{ color: '#c4bfb2', fontSize: 12 }}>{open ? '▴' : '▾'}</span>}
      </div>
      {open && (
        <div style={{ padding: '0 15px 15px 15px', fontSize: 13, lineHeight: 1.65, color: T.muted, borderTop: '1px solid ' + T.lineSoft }}>
          {!thread && <p style={{ margin: '12px 0', color: T.faint }}>Wird geladen …</p>}
          {thread && thread.beitraege.map(b => (
            <div key={b.id} style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: 8, background: b.ich ? T.chip : (b.kanal === 'system' ? '#eef3ea' : T.bg), marginLeft: b.ich ? 36 : 0 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{b.von} · {fmtDateTime(b.erstelltAm)}{b.kanal === 'whatsapp' ? ' · WhatsApp' : b.kanal === 'email' ? ' · E-Mail' : ''}</p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: T.ink }}>{b.text}</p>
              {(b.anhaenge || []).map(a => <FileChip key={a.id} name={a.name} url={a.url} />)}
            </div>
          ))}
          {admin && thread && thread.teilnehmer && (
            <p style={{ margin: '10px 0 0', fontSize: 11, color: T.faint }}>Empfänger: {thread.teilnehmer.filter(t => t.rolle === 'empfaenger').map(t => t.name + (t.gelesenAm ? ' (gelesen ' + fmtDateTime(t.gelesenAm) + ')' : ' (noch nicht gelesen)')).join(' · ')}</p>
          )}
          <div style={{ marginTop: 14, borderTop: '1px solid ' + T.lineSoft, paddingTop: 12 }}>
            {closed && !admin ? (
              <p style={{ margin: 0, fontSize: 12, color: T.faint, fontStyle: 'italic' }}>Dieser Dialog wurde von der Verwaltung beendet.</p>
            ) : (
              <>
                <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Antwort schreiben …" style={{ width: '100%', minHeight: 60, padding: 10, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.bg }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <PendingFiles files={files} setFiles={setFiles} folder="antworten" />
                  {admin && <label style={{ ...chkS, marginBottom: 0 }}><input type="checkbox" checked={mail} onChange={e => setMail(e.target.checked)} style={{ accentColor: T.mauve }} /> auch per E-Mail</label>}
                  <button onClick={send} disabled={busy} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginLeft: 'auto', opacity: busy ? 0.6 : 1 }}>Senden</button>
                </div>
                {admin && (
                  <div style={{ marginTop: 10 }}>
                    {closed
                      ? <button onClick={async () => { await MA.dialogOeffnen(d.id); onChanged(); }} style={ghostBtn}>Dialog wieder öffnen</button>
                      : <button onClick={async () => { if (confirm('Diesen Dialog beenden? Die Person kann danach nicht mehr antworten.')) { await MA.dialogSchliessen(d.id); onChanged(); } }} style={ghostBtn}>Dialog beenden</button>}
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
const Admin = ({ user, news, tools, dialoge, boot, onLogout, onChanged }) => {
  const [tab, setTab] = useState('news');
  const [employees, setEmployees] = useState([]);
  useEffect(() => { (async () => { const r = await MA.mitarbeiter({ firmaId: null }); if (r && !r.error) setEmployees(r.personen || []); })(); }, [boot]);
  const unread = dialoge.filter(d => d.ungelesen > 0).length;
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui,-apple-system,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <BrandHeader right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: T.mauve, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Verwaltung</span>
          <span style={{ fontSize: 13, color: T.ink }}>{user.name}</span>
          <button onClick={onLogout} style={ghostBtn}>Abmelden</button>
        </div>
      } />
      <TabBar tab={tab} setTab={setTab} tone={() => T.mauve}
        tabs={[['news', 'News'], ['tools', 'Tools & Links'], ['post', 'Persönl. Bereich' + (unread ? ' · ' + unread : '')], ['team', 'Mitarbeiter'], ['audit', 'Protokoll']]} />
      <div style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem', boxSizing: 'border-box' }}>
        {tab === 'news' && <AdminNews news={news} onChanged={onChanged} />}
        {tab === 'tools' && <AdminTools tools={tools} onChanged={onChanged} />}
        {tab === 'post' && <AdminPost user={user} employees={employees} dialoge={dialoge} onChanged={onChanged} />}
        {tab === 'team' && <AdminTeam employees={employees} boot={boot} />}
        {tab === 'audit' && <AdminAudit />}
      </div>
    </div>
  );
};

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
    <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Marker letter={catLetter(n.kategorie)} tone={catTone(n.kategorie)} />
          <div>
            <p style={{ margin: 0, fontSize: 14, color: T.ink }}>{n.titel}{n.wichtig && <span style={{ marginLeft: 8, fontSize: 10, color: T.mauve, border: '1px solid ' + T.mauveSoft, borderRadius: 20, padding: '2px 7px' }}>wichtig</span>}</p>
            <div style={{ margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <FirmTag firm={firmKey(n.firmaId)} />
              <span style={{ fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{n.kategorie} · {fmtDate(n.erstelltAm)} · {n.von}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => zeigeLeser(n.id)} style={ghostBtn}>Wer hat gelesen?</button>
          <button onClick={() => startEdit(n)} style={ghostBtn}>Bearbeiten</button>
          {n.aktiv !== false
            ? <button onClick={async () => { if (confirm('News zurückziehen? Sie wird für alle ausgeblendet (bleibt aber gespeichert).')) { await MA.nachrichtDeaktivieren(n.id); onChanged(); } }} style={ghostBtn}>Zurückziehen</button>
            : <button onClick={async () => { await MA.nachrichtAendern({ id: n.id, aktiv: true }); onChanged(); }} style={ghostBtn}>Wieder anzeigen</button>}
        </div>
      </div>
      {leser[n.id] && (
        <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>
          <strong>Gelesen ({leser[n.id].gelesen.length}):</strong> {leser[n.id].gelesen.map(p => p.name + ' (' + fmtDate(p.am) + ')').join(', ') || '–'}<br />
          <strong>Noch offen ({leser[n.id].offen.length}):</strong> {leser[n.id].offen.map(p => p.name).join(', ') || '–'}
        </p>
      )}
    </div>
  );
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
        <p style={subLabel}>Für welche Firma? *</p>
        <FirmPicker value={firm} onChange={setFirm} />
        <input style={fieldS} placeholder="Titel" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea style={{ ...fieldS, minHeight: 110 }} placeholder="Text" value={text} onChange={e => setText(e.target.value)} />
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <select style={{ ...fieldS, marginBottom: 0, flex: 1, minWidth: 160 }} value={cat} onChange={e => setCat(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          <input type="date" style={{ ...fieldS, marginBottom: 0, flex: 1, minWidth: 160 }} value={termin} onChange={e => setTermin(e.target.value)} title="Termin (optional)" />
        </div>
        <p style={subLabel}>Titelbild</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          {photos.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: T.chip, borderRadius: 8, fontSize: 12, color: T.muted }}>
              {p.url ? <img src={p.url} alt="" style={{ width: 32, height: 22, objectFit: 'cover', borderRadius: 4 }} /> : '▦'} {p.name}
              <span onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: T.mauve, fontWeight: 600 }}>×</span>
            </div>
          ))}
          {photos.length === 0 && <UploadButton folder="news-fotos" accept="image/*" label="+ Foto hochladen" onUploaded={f => setPhotos([{ url: f.url, name: f.name, path: f.path }])} />}
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <input style={{ ...fieldS, marginBottom: 0, flex: 1, minWidth: 160 }} placeholder="Web-Link (https://…)" value={link} onChange={e => setLink(e.target.value)} />
          <input style={{ ...fieldS, marginBottom: 0, flex: 1, minWidth: 160 }} placeholder="Link-Text (optional)" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} />
        </div>
        <p style={subLabel}>Anhang (PDF, Word, Excel)</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <UploadButton folder="news-anhaenge" accept=".pdf,.docx,.xlsx,.doc,.xls" label="+ Anhang hochladen" onUploaded={f => setAttachment({ name: f.name, url: f.url, path: f.path, size: f.size, mimeType: f.mimeType })} />
          {attachment && <span style={{ display: 'inline-flex', alignItems: 'center' }}><FileChip name={attachment.name} url={attachment.url} /><button onClick={() => setAttachment(null)} style={{ border: 'none', background: 'none', color: T.faint, cursor: 'pointer', marginTop: 8 }}>×</button></span>}
        </div>
        <label style={chkS}><input type="checkbox" checked={wichtig} onChange={e => setWichtig(e.target.checked)} style={{ accentColor: T.mauve }} /> Wichtig (wird oben angeheftet)</label>
        <label style={chkS}><input type="checkbox" checked={mail} onChange={e => setMail(e.target.checked)} style={{ accentColor: T.mauve }} /> Zusätzlich per E-Mail an alle mit Adresse senden</label>
        <button style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>{editId ? 'Änderungen speichern' : 'Veröffentlichen'}</button>
      </div>
      <div style={cardS}>
        <Label>Veröffentlicht ({aktive.length})</Label>
        {aktive.length === 0 && <Empty text="Noch nichts veröffentlicht." />}
        {aktive.map(row)}
      </div>
      {inaktive.length > 0 && (
        <div style={cardS}>
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
      <div style={cardS}>
        <Label>{editId ? 'Tool / Link bearbeiten' : 'Tool / Link hinzufügen'}</Label>
        {editId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', padding: '8px 12px', background: '#fdf6ec', border: '1px solid #f0d9b0', borderRadius: 8 }}>
            <span style={{ fontSize: 13, color: '#7a5c2e' }}>Du bearbeitest einen bestehenden Eintrag.</span>
            <button onClick={reset} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #d4b483', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#7a5c2e', cursor: 'pointer' }}>Abbrechen</button>
          </div>
        )}
        <p style={subLabel}>Für welche Firma? *</p>
        <FirmPicker value={firm} onChange={setFirm} />
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <input style={{ ...fieldS, marginBottom: 0, maxWidth: 110 }} placeholder="Kürzel" maxLength={3} value={abk} onChange={e => setAbk(e.target.value.toUpperCase())} />
          <input style={{ ...fieldS, marginBottom: 0 }} placeholder="Name (z. B. Zeiterfassung)" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <input style={fieldS} placeholder="Kurze Beschreibung" value={desc} onChange={e => setDesc(e.target.value)} />
        <input style={fieldS} placeholder="Link (https://…)" value={url} onChange={e => setUrl(e.target.value)} />
        <label style={chkS}><input type="checkbox" checked={imIntranet} onChange={e => setImIntranet(e.target.checked)} style={{ accentColor: T.mauve }} /> Als Kachel im Intranet zeigen</label>
        <button style={primaryBtn} onClick={submit}>{editId ? 'Änderungen speichern' : 'Hinzufügen'}</button>
      </div>
      <div style={cardS}>
        <Label>Apps & Links ({tools.length})</Label>
        <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1rem' }}>Alle Apps der zentralen Datenbank. Nur Einträge mit „Kachel im Intranet" erscheinen bei den Mitarbeitern.</p>
        {tools.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft, gap: 8, flexWrap: 'wrap', opacity: t.aktiv ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: T.chip, color: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500 }}>{t.abk || initialsOf(t.name)}</div>
              <div>
                <p style={{ margin: 0, fontSize: 14, color: T.ink }}>{t.name}{t.imIntranet && <span style={{ marginLeft: 8, fontSize: 10, color: T.green, border: '1px solid ' + T.greenSoft, borderRadius: 20, padding: '2px 7px' }}>Kachel</span>}{!t.aktiv && <span style={{ marginLeft: 8, fontSize: 10, color: T.faint, border: '1px solid ' + T.line, borderRadius: 20, padding: '2px 7px' }}>eingestellt</span>}</p>
                <div style={{ margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <FirmTag firm={firmKey(t.firmaId)} />
                  {t.url && <span style={{ fontSize: 11, color: T.faint }}>{t.url}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => startEdit(t)} style={ghostBtn}>Bearbeiten</button>
              {t.aktiv
                ? <button onClick={async () => { if (confirm(t.name + ' einstellen? Der Eintrag bleibt erhalten, wird aber nirgends mehr angezeigt.')) { await MA.appSetzen({ id: t.id, aktiv: false, imIntranet: false }); onChanged(); } }} style={ghostBtn}>Einstellen</button>
                : <button onClick={async () => { await MA.appSetzen({ id: t.id, aktiv: true }); onChanged(); }} style={ghostBtn}>Aktivieren</button>}
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
  const chip = (on, tone = T.mauve) => ({ padding: '7px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid ' + (on ? tone : T.line), background: on ? tone : T.surface, color: on ? '#fff' : T.muted });
  return (
    <div>
      <div style={cardS}>
        <Label>Nachricht / Dokument senden</Label>
        <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1rem', lineHeight: 1.6 }}>Eröffnet einen Dialog im persönlichen Bereich der Empfänger – hier und in der Zeiterfassung. Empfänger können antworten und Dateien zurücksenden; antwortet jemand, bekommst du eine E-Mail.</p>
        <input style={fieldS} placeholder="Betreff" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea style={{ ...fieldS, minHeight: 100 }} placeholder="Text" value={text} onChange={e => setText(e.target.value)} />
        <p style={subLabel}>Anhänge (PDF, Word, Excel, Bilder)</p>
        <div style={{ marginBottom: 12 }}><PendingFiles files={files} setFiles={setFiles} folder="nachrichten" /></div>
        <p style={subLabel}>Empfänger</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setTarget('einzeln')} style={chip(target === 'einzeln', T.ink)}>Einzelne Personen</button>
          <button onClick={() => setTarget('physio')} style={chip(target === 'physio')}>Alle PhysioPro</button>
          <button onClick={() => setTarget('pilates')} style={chip(target === 'pilates')}>Alle Pilates Company</button>
          <button onClick={() => setTarget('beide')} style={chip(target === 'beide')}>Alle (beide Firmen)</button>
        </div>
        {target === 'einzeln' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {persons.map(p => <button key={p.mitarbeiterId} onClick={() => toggle(p.mitarbeiterId)} style={chip(inds.includes(p.mitarbeiterId), T.green)}>{p.name}</button>)}
          </div>
        )}
        <label style={chkS}><input type="checkbox" checked={mail} onChange={e => setMail(e.target.checked)} style={{ accentColor: T.mauve }} /> Zusätzlich per E-Mail (an alle Empfänger mit Adresse)</label>
        <button style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={send}>Senden</button>
      </div>
      <div style={cardS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Label style={{ margin: 0 }}>Dialoge ({list.length})</Label>
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button onClick={() => setFilter('offen')} style={chip(filter === 'offen', T.ink)}>Offen</button>
            <button onClick={() => setFilter('alle')} style={chip(filter === 'alle', T.ink)}>Alle</button>
          </div>
        </div>
        {list.length === 0 && <Empty text="Keine Dialoge." />}
        {list.map(d => <DialogThread key={d.id} d={d} user={user} admin onChanged={onChanged} />)}
      </div>
    </div>
  );
};

// ── Mitarbeiter (Verwaltung) ────────────────────────────────────────────────────────
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
      'deine PIN für unsere Apps (Intranet und Zeiterfassung) wurde zurückgesetzt — die alte gilt nicht mehr.', '',
      'Hier geht es zum Intranet:', intranetLink(), '',
      `So geht's: Seite öffnen, ${wahl} und eine neue PIN festlegen (4–6 Ziffern). Die PIN kennst nur du — sie gilt danach für alle unsere Apps.`, '',
      'Bei Fragen melde dich einfach.', '', 'Liebe Grüße', 'Hanna',
    ].join('\n');
  }
  return [
    `Hallo ${vorname},`, '',
    'herzlich willkommen im STUFF Intranet von PhysioPro & Pilates Company — unserem internen Bereich für News, Tools und persönliche Nachrichten von der Verwaltung.', '',
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
    <div style={{ border: '1px solid ' + T.line, borderRadius: 10, padding: '1rem', marginBottom: '1.2rem', background: T.chip }}>
      <p style={{ fontSize: 13, color: T.ink, margin: '0 0 10px' }}>
        {mode === 'reset'
          ? <>PIN von <strong>{emp.name}</strong> zurückgesetzt. Hier ist der fertige Hinweistext — einfach kopieren und verschicken (z. B. per WhatsApp oder E-Mail):</>
          : <>Einladung für <strong>{emp.name}</strong> — einfach kopieren und verschicken (z. B. per WhatsApp oder E-Mail):</>}
      </p>
      <pre style={{ fontSize: 12.5, fontFamily: 'inherit', background: T.surface, border: '1px solid ' + T.line, borderRadius: 8, padding: '12px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0 0 10px', color: T.ink, lineHeight: 1.6 }}>{text}</pre>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => copyText(text, 'Text kopiert — jetzt einfügen und an ' + ((emp.name || '').trim().split(/\s+/)[0] || 'die Person') + ' schicken.')} style={primaryBtn}>Text kopieren</button>
        <button onClick={() => copyText(intranetLink(), 'Link kopiert.')} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 8, padding: '10px 16px', fontSize: 13, color: T.muted, cursor: 'pointer' }}>Nur den Link kopieren</button>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.faint, fontSize: 12, cursor: 'pointer', padding: '10px 4px' }}>Schließen</button>
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
    <div style={cardS}>
      <Label>Mitarbeiter ({persons.length})</Label>
      <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>Stammdaten kommen aus der zentralen Mitarbeiter-Datenbank (Lohnjournal). Neue Personen und Austritte werden dort gepflegt; hier kannst du einladen und PINs zurücksetzen.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) auto', fontSize: 11, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0 8px', borderBottom: '1px solid ' + T.lineSoft }}>
        <span>Name</span><span>Firma · Rolle</span><span>PIN</span><span></span>
      </div>
      {persons.map(e => (
        <React.Fragment key={e.mitarbeiterId}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) auto', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft, fontSize: 13, color: T.ink, gap: 6 }}>
            <span>{e.name}<br /><span style={{ fontSize: 11, color: T.faint }}>{e.email || 'keine E-Mail'}{e.telefon ? ' · ' + e.telefon : ''}</span></span>
            <span style={{ color: T.muted }}>{firmLabel(e)}{e.role ? ' · ' + e.role : ''}</span>
            <span style={{ color: e.pinGesetzt ? T.greenSoft : T.faint }}>{e.pinGesetzt ? 'gesetzt' : '–'}</span>
            <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => openInvite(e.mitarbeiterId, 'invite')} style={ghostBtn} title="Fertigen Einladungstext mit Link anzeigen und kopieren">Einladung</button>
              {e.pinGesetzt && <button onClick={async () => { if (confirm('PIN für ' + e.name + ' zurücksetzen? Sie gilt für alle Apps.')) { const r = await MA.pinZuruecksetzen(e.id); if (!r || r.error) return alert('Nicht möglich.'); openInvite(e.mitarbeiterId, 'reset'); } }} style={ghostBtn}>Reset</button>}
            </span>
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
    <div style={cardS}>
      <Label>Protokoll{rows ? ` (${rows.length})` : ''}</Label>
      <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1rem' }}>Logins in allen Apps, gesendete Nachrichten, Antworten und Lesebestätigungen – aus der zentralen Datenbank.</p>
      {!rows && <p style={{ fontSize: 12, color: T.faint }}>Wird geladen …</p>}
      {rows && rows.length === 0 && <Empty text="Noch keine Einträge." />}
      {rows && rows.map((a, i) => (
        <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid ' + T.lineSoft, fontSize: 12, color: T.muted }}>
          <span style={{ color: T.faint }}>{fmtDateTime(a.ts)}</span> · <span style={{ color: T.ink }}>{a.aktion}</span> · {a.wer}{a.detail && <span style={{ color: T.faint }}> — {a.detail}</span>}
        </div>
      ))}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
