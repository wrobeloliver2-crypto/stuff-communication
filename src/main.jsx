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

const ADMIN_CREDENTIALS = [
  { email: 'oliver.wrobel@pilatescompany.de', password: 'admin123', name: 'Oliver Wrobel' },
  { email: 'hanna.wrobel@pilatescompany.de', password: 'admin123', name: 'Hanna Wrobel' },
];
const CATEGORIES = ['Ankündigungen', 'Events', 'Info'];
const GROUPS = ['PhysioPro Staff', 'Pilates Trainer', 'Verwaltung'];

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
const uploadFile = async (file, folder = 'uploads') => {
  const form = new FormData();
  form.append('file', file);
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

const apiGet = async (collection) => {
  const res = await fetch(`${API}?collection=${collection}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return data.data;
};

const apiSet = async (collection, payload) => {
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection, action: 'set', payload }),
  });
};

const apiAppend = async (collection, payload) => {
  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collection, action: 'append', payload }),
  });
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

  // Initial load from Sheets
  useEffect(() => {
    const init = async () => {
      try {
        const [n, t, m, e, a] = await Promise.all([
          apiGet('news'),
          apiGet('tools'),
          apiGet('messages'),
          apiGet('employees'),
          apiGet('audit'),
        ]);
        if (n.length) setNews(n);
        if (t.length) setTools(t); else setTools(DEFAULT_TOOLS);
        if (m.length) setMessages(m);
        if (e.length) setEmployees(e); else setEmployees(EMPLOYEES);
        if (a.length) setAudit(a);
      } catch (err) {
        console.warn('Sheets nicht erreichbar, starte leer:', err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const logA = async (action, who, detail) => {
    const entry = { id: Date.now() + Math.random(), ts: new Date().toLocaleString('de-DE'), action, who, detail };
    setAudit(a => [entry, ...a]);
    await apiAppend('audit', entry);
  };

  const pinSetup = async (id, pin) => {
    const updated = employees.map(e => e.id === id ? { ...e, pin, pinSet: true } : e);
    setEmployees(updated);
    await apiSet('employees', updated);
    const emp = updated.find(e => e.id === id);
    setUser(emp);
    setPage('employee');
    await logA('PIN gesetzt', emp.name, 'Erstanmeldung');
  };

  const employeeLogin = async (id, pin) => {
    const emp = employees.find(e => e.id === id);
    if (emp && emp.pinSet && emp.pin === pin) {
      setUser(emp);
      setPage('employee');
      await logA('Login', emp.name, 'Mitarbeiter');
    } else alert('PIN falsch');
  };

  const adminLogin = async (email, pw) => {
    const a = ADMIN_CREDENTIALS.find(x => x.email === email && x.password === pw);
    if (a) {
      setUser({ ...a, isAdmin: true });
      setPage('admin');
      await logA('Login', a.name, 'Admin');
    } else alert('E-Mail oder Passwort falsch');
  };

  const logout = () => { setUser(null); setPage('login'); };

  const addNews = async n => {
    const entry = { ...n, id: Date.now(), created: new Date().toLocaleString('de-DE') };
    const updated = [entry, ...news];
    setNews(updated);
    await apiSet('news', updated);
    await logA('News erstellt', user.name, n.title + ' (' + FIRMS[n.firm].label + ')');
  };

  const updateNews = async (id, n) => {
    const updated = news.map(e => e.id === id ? { ...e, ...n, id, updated: new Date().toLocaleString('de-DE') } : e);
    setNews(updated);
    await apiSet('news', updated);
    await logA('News bearbeitet', user.name, n.title);
  };

  const delNews = async id => {
    const updated = news.filter(n => n.id !== id);
    setNews(updated);
    await apiSet('news', updated);
    await logA('News gelöscht', user.name, '#' + id);
  };

  const addTool = async t => {
    const entry = { ...t, id: 'tool' + Date.now() };
    const updated = [...tools, entry];
    setTools(updated);
    await apiSet('tools', updated);
    await logA('Tool/Link erstellt', user.name, t.title);
  };

  const updateTool = async (id, t) => {
    const updated = tools.map(e => e.id === id ? { ...e, ...t, id } : e);
    setTools(updated);
    await apiSet('tools', updated);
    await logA('Tool/Link bearbeitet', user.name, t.title);
  };

  const delTool = async id => {
    const updated = tools.filter(t => t.id !== id);
    setTools(updated);
    await apiSet('tools', updated);
    await logA('Tool/Link gelöscht', user.name, '#' + id);
  };

  const sendMessage = async m => {
    const entry = { ...m, id: Date.now(), created: new Date().toLocaleString('de-DE'), sender: user.name, readBy: [], replies: [] };
    const updated = [entry, ...messages];
    setMessages(updated);
    await apiSet('messages', updated);
    await logA('Nachricht gesendet', user.name, '"' + m.title + '" → ' + [...m.toGroups, ...m.toIndividuals].join(', '));
  };

  const markRead = async id => {
    const updated = messages.map(m => m.id === id && !m.readBy.some(r => r.id === user.id)
      ? { ...m, readBy: [...m.readBy, { id: user.id, name: user.name, ts: new Date().toLocaleString('de-DE') }] }
      : m);
    setMessages(updated);
    await apiSet('messages', updated);
  };

  const addReply = async (id, text, attachment) => {
    const reply = { from: user.name, text, attachment, ts: new Date().toLocaleString('de-DE') };
    const updated = messages.map(m => m.id === id ? { ...m, replies: [...(m.replies || []), reply] } : m);
    setMessages(updated);
    await apiSet('messages', updated);
    await logA('Antwort', user.name, 'zu #' + id);
  };

  const resetPin = async id => {
    const updated = employees.map(e => e.id === id ? { ...e, pin: null, pinSet: false } : e);
    setEmployees(updated);
    await apiSet('employees', updated);
    await logA('PIN zurückgesetzt', user.name, id);
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
  if (page === 'employee' && user) return <Employee user={user} news={news} tools={tools} messages={messages.filter(m => forMe(m, user))} onMarkRead={markRead} onReply={addReply} onLogout={logout} />;
  if (page === 'admin' && user?.isAdmin) return <Admin user={user} news={news} tools={tools} messages={messages} employees={employees} audit={audit} onAddNews={addNews} onUpdateNews={updateNews} onDelNews={delNews} onAddTool={addTool} onUpdateTool={updateTool} onDelTool={delTool} onSend={sendMessage} onResetPin={resetPin} onLogout={logout} />;
  return null;
};

const forMe = (m, u) => m.toIndividuals.includes(u.id) || m.toGroups.includes(u.role);

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
              <p style={{ fontSize: 11, color: T.faint, textAlign: 'center', marginTop: 14 }}>Demo: oliver.wrobel@pilatescompany.de / admin123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Employee = ({ user, news, tools, messages, onMarkRead, onReply, onLogout }) => {
  const [tab, setTab] = useState('news');
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2);
  const unread = messages.filter(m => !m.readBy.some(r => r.id === user.id)).length;
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
          {[['news', 'News'], ['tools', 'Tools & Links'], ['postfach', 'Mein Bereich' + (unread ? ' · ' + unread : '')]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', padding: '14px 0', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: tab === k ? T.ink : T.faint, borderBottom: tab === k ? '2px solid ' + (k === 'postfach' ? T.mauve : T.green) : '2px solid transparent', marginBottom: -1 }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem', boxSizing: 'border-box' }}>
        {tab === 'news' && <NewsFeed news={news} />}
        {tab === 'tools' && <ToolsList tools={tools} />}
        {tab === 'postfach' && <Postfach user={user} messages={messages} onMarkRead={onMarkRead} onReply={onReply} />}
      </div>
    </div>
  );
};

const NewsFeed = ({ news }) => (
  <div>
    <Label>Firmen-News</Label>
    {news.length === 0 && <Empty text="Noch keine News veröffentlicht." />}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 16 }}>
      {news.map(n => <NewsCard key={n.id} n={n} />)}
    </div>
  </div>
);

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

const Postfach = ({ user, messages, onMarkRead, onReply }) => (
  <div>
    <Label>Mein persönlicher Bereich</Label>
    <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1.2rem', lineHeight: 1.6 }}>Hier erhältst du persönliche Nachrichten und Dokumente von der Verwaltung. Du kannst direkt antworten und Dateien zurücksenden. Alle Vorgänge werden protokolliert.</p>
    {messages.length === 0 && <Empty text="Noch keine Nachrichten in deinem Bereich." />}
    {messages.map(m => <MessageThread key={m.id} m={m} user={user} unread={!m.readBy.some(r => r.id === user.id)} onOpen={() => onMarkRead(m.id)} onReply={onReply} />)}
  </div>
);

const MessageThread = ({ m, user, unread, onOpen, onReply }) => {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  return (
    <div style={{ background: T.surface, border: '0.5px solid ' + (unread ? T.mauveSoft : T.line), borderRadius: 10, overflow: 'hidden', marginBottom: 9 }}>
      <div onClick={() => setOpen(o => { if (!o) onOpen(); return !o; })} style={{ padding: '13px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13 }}>
        <Marker letter={m.sender.split(' ').map(w => w[0]).join('').slice(0, 2)} tone="solid" />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: T.ink }}>{m.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>von {m.sender} · {m.created}{unread ? ' · neu' : ''}</p>
        </div>
        {unread ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.mauveSoft }} /> : <span style={{ color: '#c4bfb2', fontSize: 12 }}>{open ? '▴' : '▾'}</span>}
      </div>
      {open && (
        <div style={{ padding: '0 15px 15px 58px', fontSize: 13, lineHeight: 1.65, color: T.muted }}>
          <p style={{ margin: '0 0 8px' }}>{m.text}</p>
          {m.attachment && <FileChip name={m.attachment.name || m.attachment} url={m.attachment.url || null} />}
          {m.replies && m.replies.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid ' + T.lineSoft, paddingTop: 12 }}>
              {m.replies.map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{r.from} · {r.ts}</p>
                  <p style={{ margin: '3px 0 0' }}>{r.text}</p>
                  {r.attachment && <FileChip name={r.attachment.name || r.attachment} url={r.attachment.url || null} />}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 14, borderTop: '1px solid ' + T.lineSoft, paddingTop: 12 }}>
            <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Antwort schreiben …" style={{ width: '100%', minHeight: 60, padding: 10, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.bg }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <UploadButton folder="antworten" label="+ Datei anhängen" onUploaded={f => setPendingFile(f)} />
              {pendingFile && <FileChip name={pendingFile.name} url={pendingFile.url} />}
              <button onClick={() => { if (!reply.trim()) return; onReply(m.id, reply, pendingFile || null); setReply(''); setPendingFile(null); }} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Senden</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Admin = ({ user, news, tools, messages, employees, audit, onAddNews, onUpdateNews, onDelNews, onAddTool, onUpdateTool, onDelTool, onSend, onResetPin, onLogout }) => {
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
          {[['news', 'News'], ['tools', 'Tools & Links'], ['post', 'Persönl. Bereich'], ['team', 'Mitarbeiter'], ['audit', 'Protokoll']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: 'none', border: 'none', padding: '14px 0', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', color: tab === k ? T.ink : T.faint, borderBottom: tab === k ? '2px solid ' + T.mauve : '2px solid transparent', marginBottom: -1 }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '1.75rem 1.5rem', boxSizing: 'border-box' }}>
        {tab === 'news' && <AdminNews news={news} onAdd={onAddNews} onUpdate={onUpdateNews} onDel={onDelNews} />}
        {tab === 'tools' && <AdminTools tools={tools} onAdd={onAddTool} onUpdate={onUpdateTool} onDel={onDelTool} />}
        {tab === 'post' && <AdminPost employees={employees} messages={messages} onSend={onSend} />}
        {tab === 'team' && <AdminTeam employees={employees} onResetPin={onResetPin} />}
        {tab === 'audit' && <AdminAudit audit={audit} />}
      </div>
    </div>
  );
};

const cardS = { background: T.surface, border: '0.5px solid ' + T.line, borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem' };
const fieldS = { width: '100%', padding: '11px 12px', marginBottom: 12, border: '1px solid ' + T.line, borderRadius: 8, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', color: T.ink, background: T.bg };
const primaryBtn = { padding: '10px 20px', border: 'none', borderRadius: 8, background: T.mauve, color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' };
const subLabel = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.faint, margin: '0.5rem 0 0.6rem' };

const AdminNews = ({ news, onAdd, onUpdate, onDel }) => {
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
        <Label>Veröffentlicht ({news.length})</Label>
        {news.length === 0 && <Empty text="Noch nichts veröffentlicht." />}
        {news.map(n => (
          <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Marker letter={catLetter(n.category)} tone={catTone(n.category)} />
              <div>
                <p style={{ margin: 0, fontSize: 14, color: T.ink }}>{n.title}</p>
                <div style={{ margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FirmTag firm={n.firm} />
                  <span style={{ fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{n.category} · {n.created}{n.updated ? ' · bearb. ' + n.updated : ''}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
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

const AdminPost = ({ employees, messages, onSend }) => {
  const [title, setTitle] = useState(''); const [text, setText] = useState('');
  const [groups, setGroups] = useState([]); const [inds, setInds] = useState([]);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  return (
    <div>
      <div style={cardS}>
        <Label>Nachricht / Dokument senden</Label>
        <p style={{ fontSize: 12, color: T.muted, margin: '-0.4rem 0 1rem', lineHeight: 1.6 }}>Geht in den persönlichen Bereich der Empfänger. Empfänger können antworten und Dateien zurücksenden. Alles wird protokolliert.</p>
        <input style={fieldS} placeholder="Betreff" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea style={{ ...fieldS, minHeight: 100 }} placeholder="Text" value={text} onChange={e => setText(e.target.value)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <UploadButton folder="nachrichten" accept=".pdf,.docx,.xlsx,.doc,.xls,image/*" label="+ Anhang hochladen" onUploaded={f => setPendingAttachment(f)} />
          {pendingAttachment && <FileChip name={pendingAttachment.name} url={pendingAttachment.url} />}
        </div>
        <p style={subLabel}>An Gruppen</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {GROUPS.map(g => <button key={g} onClick={() => toggle(groups, setGroups, g)} style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid ' + (groups.includes(g) ? T.mauve : T.line), background: groups.includes(g) ? T.mauve : T.surface, color: groups.includes(g) ? '#fff' : T.muted }}>{g}</button>)}
        </div>
        <p style={subLabel}>An einzelne Personen</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {employees.map(e => <button key={e.id} onClick={() => toggle(inds, setInds, e.id)} style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid ' + (inds.includes(e.id) ? T.green : T.line), background: inds.includes(e.id) ? T.green : T.surface, color: inds.includes(e.id) ? '#fff' : T.muted }}>{e.name}</button>)}
        </div>
        <button style={primaryBtn} onClick={() => { if (!title || !text) return alert('Betreff und Text nötig'); if (groups.length === 0 && inds.length === 0) return alert('Mindestens einen Empfänger wählen'); onSend({ title, text, attachment: pendingAttachment || null, toGroups: groups, toIndividuals: inds }); setTitle(''); setText(''); setPendingAttachment(null); setGroups([]); setInds([]); }}>Senden</button>
      </div>
      <div style={cardS}>
        <Label>Gesendet ({messages.length})</Label>
        {messages.length === 0 && <Empty text="Noch keine Nachrichten gesendet." />}
        {messages.map(m => (
          <div key={m.id} style={{ padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, color: T.ink }}>{m.title}</p>
              <span style={{ fontSize: 11, color: T.faint }}>{m.readBy.length} gelesen{m.replies?.length ? ' · ' + m.replies.length + ' Antworten' : ''}</span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: T.faint, letterSpacing: '0.04em', textTransform: 'uppercase' }}>an {[...m.toGroups, ...m.toIndividuals.map(id => employees.find(e => e.id === id)?.name)].join(', ')} · {m.created}</p>
            {m.readBy.length > 0 && <p style={{ margin: '4px 0 0', fontSize: 11, color: T.greenSoft }}>gelesen von: {m.readBy.map(r => r.name).join(', ')}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminTeam = ({ employees, onResetPin }) => (
  <div style={cardS}>
    <Label>Mitarbeiter ({employees.length})</Label>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) auto', fontSize: 11, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 0 8px', borderBottom: '1px solid ' + T.lineSoft }}>
      <span>Name</span><span>Rolle</span><span>PIN</span><span></span>
    </div>
    {employees.map(e => (
      <div key={e.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.5fr) minmax(0,1fr) auto', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid ' + T.lineSoft, fontSize: 13, color: T.ink }}>
        <span>{e.name}</span><span style={{ color: T.muted }}>{e.role}</span>
        <span style={{ color: e.pinSet ? T.greenSoft : T.faint }}>{e.pinSet ? 'gesetzt' : '–'}</span>
        <span>{e.pinSet && <button onClick={() => { if (confirm('PIN für ' + e.name + ' zurücksetzen?')) onResetPin(e.id); }} style={{ background: 'none', border: '1px solid ' + T.line, borderRadius: 7, padding: '5px 10px', fontSize: 12, color: T.muted, cursor: 'pointer' }}>Reset</button>}</span>
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

