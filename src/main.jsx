import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// ============================================================================
// STUFF INTRANET - Central Employee Portal
// PhysioPro Lübeck + Pilates Company
// ============================================================================

const ADMIN_CREDENTIALS = [
  { email: 'oliver.wrobel@pilatescompany.de', password: 'admin123' },
  { email: 'hanna.wrobel@pilatescompany.de', password: 'admin123' },
];

const CATEGORIES = ['Ankündigungen', 'Events', 'Info', 'Schichten'];

const EMPLOYEES = [
  // PhysioPro Staff
  { id: 'anna', name: 'Anna Bath', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'julia', name: 'Julia Mielke', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'tuana', name: 'Tuana Koyulhisarli', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'maike', name: 'Maike Schrader', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'annika', name: 'Annika Zwiener', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'finn', name: 'Finn Meyer', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'phillip', name: 'Phillip Opelka', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'imo', name: 'Imo Thomsen', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  
  // Pilates Trainer
  { id: 'tina', name: 'Tina Schmidt', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'natascha', name: 'Natascha Müller', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'ina', name: 'Ina Weber', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'katy', name: 'Katy Hoffmann', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
  { id: 'paula', name: 'Paula Krause', role: 'Pilates Trainer', company: 'Pilates', pin: null, pinSet: false },
];

const StuffIntranet = () => {
  const [page, setPage] = useState('login'); // login | employee | admin
  const [loginMode, setLoginMode] = useState('employee'); // employee | admin
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState(EMPLOYEES);
  const [news, setNews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  // ============================================================================
  // LOGIN HANDLERS
  // ============================================================================
  const handleEmployeePinSetup = (empId, pin) => {
    const upd = employees.map(e => e.id === empId ? { ...e, pin, pinSet: true } : e);
    setEmployees(upd);
    const emp = upd.find(e => e.id === empId);
    setCurrentUser(emp);
    setPage('employee');
    logAudit('PIN Setup', empId, `${emp.name} created PIN`);
  };

  const handleEmployeeLogin = (empId, pin) => {
    const emp = employees.find(e => e.id === empId);
    if (emp && emp.pinSet && emp.pin === pin) {
      setCurrentUser(emp);
      setPage('employee');
      logAudit('Employee Login', empId, `${emp.name} logged in`);
    } else {
      alert('Invalid PIN');
    }
  };

  const handleAdminLogin = (email, password) => {
    const admin = ADMIN_CREDENTIALS.find(a => a.email === email && a.password === password);
    if (admin) {
      setCurrentUser({ email, name: admin.email.split('@')[0], isAdmin: true });
      setPage('admin');
      logAudit('Admin Login', email, `Admin logged in`);
    } else {
      alert('Invalid email or password');
    }
  };

  // ============================================================================
  // AUDIT LOG
  // ============================================================================
  const logAudit = (action, userId, details) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('de-DE'),
      action,
      userId,
      details,
    };
    setAuditLog([entry, ...auditLog]);
  };

  // ============================================================================
  // NEWS MANAGEMENT
  // ============================================================================
  const createNews = (title, text, category, attachment) => {
    const newsItem = {
      id: Date.now(),
      title,
      text,
      category,
      attachment,
      created: new Date().toLocaleString('de-DE'),
      archived: false,
      readBy: [],
    };
    setNews([newsItem, ...news]);
    logAudit('News Created', currentUser.email, `"${title}"`);
  };

  const deleteNews = (newsId) => {
    setNews(news.filter(n => n.id !== newsId));
    logAudit('News Deleted', currentUser.email, `News #${newsId}`);
  };

  const markNewsRead = (newsId) => {
    setNews(news.map(n => 
      n.id === newsId && !n.readBy.includes(currentUser.id)
        ? { ...n, readBy: [...n.readBy, currentUser.id] }
        : n
    ));
  };

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================
  const sendMessage = (title, text, targetIndividuals, targetGroups, attachment) => {
    const msg = {
      id: Date.now(),
      title,
      text,
      targetIndividuals,
      targetGroups,
      attachment,
      created: new Date().toLocaleString('de-DE'),
      sender: currentUser.email,
      readBy: [],
    };
    setMessages([msg, ...messages]);
    logAudit('Message Sent', currentUser.email, `"${title}" to ${targetIndividuals.length + targetGroups.length} recipients`);
  };

  const markMessageRead = (msgId) => {
    setMessages(messages.map(m =>
      m.id === msgId && !m.readBy.includes(currentUser.id)
        ? { ...m, readBy: [...m.readBy, currentUser.id] }
        : m
    ));
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (page === 'login') {
    return (
      <LoginPage
        loginMode={loginMode}
        setLoginMode={setLoginMode}
        employees={employees}
        onEmployeeLogin={handleEmployeeLogin}
        onEmployeePinSetup={handleEmployeePinSetup}
        onAdminLogin={handleAdminLogin}
      />
    );
  }

  if (page === 'employee' && currentUser) {
    return (
      <EmployeeDashboard
        currentUser={currentUser}
        news={news}
        messages={messages.filter(m => isMessageForEmployee(m, currentUser))}
        onMarkNewsRead={markNewsRead}
        onMarkMessageRead={markMessageRead}
        onLogout={() => {
          setCurrentUser(null);
          setPage('login');
        }}
      />
    );
  }

  if (page === 'admin' && currentUser?.isAdmin) {
    return (
      <AdminDashboard
        currentUser={currentUser}
        news={news}
        messages={messages}
        employees={employees}
        auditLog={auditLog}
        onCreateNews={createNews}
        onDeleteNews={deleteNews}
        onSendMessage={sendMessage}
        onResetPin={(empId) => {
          setEmployees(employees.map(e => e.id === empId ? { ...e, pin: null, pinSet: false } : e));
          logAudit('PIN Reset', currentUser.email, `PIN reset for ${empId}`);
        }}
        onLogout={() => {
          setCurrentUser(null);
          setPage('login');
        }}
      />
    );
  }

  return <div style={{ ...styles.container, justifyContent: 'center' }}>Loading...</div>;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const isMessageForEmployee = (msg, employee) => {
  return msg.targetIndividuals.includes(employee.id) || msg.targetGroups.includes(employee.role);
};

// ============================================================================
// LOGIN PAGE
// ============================================================================
const LoginPage = ({ loginMode, setLoginMode, employees, onEmployeeLogin, onEmployeePinSetup, onAdminLogin }) => {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const emp = employees.find(e => e.id === selectedEmp);

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.logoArea}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏥 💚 🎀</div>
          <h1 style={{ margin: '0 0 5px', color: '#2d5016' }}>STUFF Intranet</h1>
          <p style={{ margin: '0', color: '#c8818c', fontSize: '13px' }}>PhysioPro & Pilates Company</p>
        </div>

        <div style={styles.tabs}>
          <button
            onClick={() => { setLoginMode('employee'); setAdminEmail(''); setAdminPassword(''); }}
            style={{
              ...styles.tabButton,
              borderBottom: loginMode === 'employee' ? '2px solid #2d5016' : 'none',
              color: loginMode === 'employee' ? '#2d5016' : '#999',
            }}
          >
            👤 Mitarbeiter
          </button>
          <button
            onClick={() => { setLoginMode('admin'); setSelectedEmp(''); setPin(''); }}
            style={{
              ...styles.tabButton,
              borderBottom: loginMode === 'admin' ? '2px solid #c8818c' : 'none',
              color: loginMode === 'admin' ? '#c8818c' : '#999',
            }}
          >
            ⚙️ Admin
          </button>
        </div>

        {loginMode === 'employee' && (
          <div>
            <select value={selectedEmp} onChange={(e) => { setSelectedEmp(e.target.value); setPin(''); setNewPin(''); setConfirmPin(''); }} style={styles.input}>
              <option value="">-- Mitarbeiter auswählen --</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
            </select>

            {selectedEmp && !emp.pinSet && (
              <div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>🔑 Erste Anmeldung: PIN festlegen</p>
                <input type="password" maxLength="6" placeholder="PIN (4-6 Ziffern)" value={newPin} onChange={(e) => setNewPin(e.target.value)} style={styles.input} />
                <input type="password" maxLength="6" placeholder="PIN wiederholen" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} style={styles.input} />
                <button onClick={() => { if (newPin === confirmPin && newPin.length >= 4) onEmployeePinSetup(selectedEmp, newPin); else alert('PINs müssen gleich sein'); }} style={{ ...styles.button, backgroundColor: '#2d5016' }}>
                  PIN Festlegen
                </button>
              </div>
            )}

            {selectedEmp && emp.pinSet && (
              <div>
                <input type="password" maxLength="6" placeholder="Dein PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={styles.input} />
                <button onClick={() => onEmployeeLogin(selectedEmp, pin)} style={{ ...styles.button, backgroundColor: '#2d5016' }}>Anmelden</button>
              </div>
            )}
          </div>
        )}

        {loginMode === 'admin' && (
          <div>
            <input type="email" placeholder="Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Passwort" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} style={styles.input} />
            <button onClick={() => onAdminLogin(adminEmail, adminPassword)} style={{ ...styles.button, backgroundColor: '#c8818c' }}>Anmelden</button>
            <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginTop: '12px' }}>Demo: oliver.wrobel@pilatescompany.de / admin123</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ACCORDION CARD COMPONENT
// ============================================================================
const AccordionCard = ({ title, icon, category, text, details, isOpen, onToggle, children }) => (
  <div 
    style={{
      ...styles.accordionCard,
      background: getCategoryGradient(category),
    }}
    onClick={onToggle}
  >
    <div style={styles.cardHeader}>
      <div style={styles.cardTitle}>
        <span style={{ fontSize: '24px', marginRight: '12px' }}>{icon}</span>
        <div>
          <h4 style={{ margin: '0 0 4px' }}>{title}</h4>
          {text && <small style={{ color: 'rgba(255,255,255,0.8)' }}>{text}</small>}
        </div>
      </div>
      <span style={{ fontSize: '20px', transition: 'transform 0.3s' }}>
        {isOpen ? '▼' : '▶'}
      </span>
    </div>
    
    {isOpen && (
      <div style={styles.cardContent}>
        {children || details}
      </div>
    )}
  </div>
);

// ============================================================================
// EMPLOYEE DASHBOARD
// ============================================================================
const EmployeeDashboard = ({ currentUser, news, messages, onMarkNewsRead, onMarkMessageRead, onLogout }) => {
  const [mobileTab, setMobileTab] = useState('news');
  const [expandedCards, setExpandedCards] = useState({});
  const isMobile = window.innerWidth < 768;

  const toggleCard = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  return (
    <div style={styles.employeeContainer}>
      {/* HEADER */}
      <div style={{ ...styles.header, background: 'linear-gradient(135deg, #2d5016 0%, #1a3009 100%)' }}>
        <div>
          <h2 style={{ margin: 0, color: 'white' }}>👤 {currentUser.name}</h2>
          <small style={{ color: '#ddd' }}>{currentUser.role}</small>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn}>🚪 Logout</button>
      </div>

      {isMobile ? (
        <>
          {/* MOBILE VIEW */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {mobileTab === 'news' && <NewsFeedCards news={news} onMarkRead={onMarkNewsRead} expandedCards={expandedCards} toggleCard={toggleCard} />}
            {mobileTab === 'info' && <InfoSection expandedCards={expandedCards} toggleCard={toggleCard} />}
            {mobileTab === 'postfach' && <PostfachCards messages={messages} onMarkRead={onMarkMessageRead} expandedCards={expandedCards} toggleCard={toggleCard} />}
          </div>

          {/* BOTTOM NAVIGATION */}
          <div style={styles.bottomNav}>
            <button onClick={() => setMobileTab('news')} style={{ ...styles.navBtn, backgroundColor: mobileTab === 'news' ? '#2d5016' : '#f0f0f0', color: mobileTab === 'news' ? 'white' : '#333' }}>
              📰 News
            </button>
            <button onClick={() => setMobileTab('info')} style={{ ...styles.navBtn, backgroundColor: mobileTab === 'info' ? '#c8818c' : '#f0f0f0', color: mobileTab === 'info' ? 'white' : '#333' }}>
              ℹ️ Info
            </button>
            <button onClick={() => setMobileTab('postfach')} style={{ ...styles.navBtn, backgroundColor: mobileTab === 'postfach' ? '#2d5016' : '#f0f0f0', color: mobileTab === 'postfach' ? 'white' : '#333' }}>
              📧 Postfach
            </button>
          </div>
        </>
      ) : (
        <>
          {/* DESKTOP VIEW - CARDS */}
          <div style={styles.dashboardContent}>
            <div style={styles.dashboardSection}>
              <h2 style={{ color: '#2d5016', marginBottom: '20px' }}>📰 Firmen-News</h2>
              <NewsFeedCards news={news} onMarkRead={onMarkNewsRead} expandedCards={expandedCards} toggleCard={toggleCard} />
            </div>
            
            <div style={styles.dashboardSection}>
              <h2 style={{ color: '#c8818c', marginBottom: '20px' }}>ℹ️ Informationen</h2>
              <InfoSection expandedCards={expandedCards} toggleCard={toggleCard} />
            </div>

            <div style={styles.dashboardSection}>
              <h2 style={{ color: '#2d5016', marginBottom: '20px' }}>📧 Persönliches Postfach</h2>
              <PostfachCards messages={messages} onMarkRead={onMarkMessageRead} expandedCards={expandedCards} toggleCard={toggleCard} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// NEWS FEED WITH ACCORDION CARDS
// ============================================================================
const NewsFeedCards = ({ news, onMarkRead, expandedCards, toggleCard }) => (
  <div>
    {news.length === 0 && <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Keine News vorhanden</p>}
    {news.map(n => (
      <AccordionCard
        key={n.id}
        icon={getCategoryIcon(n.category)}
        title={n.title}
        category={n.category}
        text={n.text.substring(0, 60) + '...'}
        isOpen={expandedCards[`news-${n.id}`]}
        onToggle={() => { toggleCard(`news-${n.id}`); onMarkRead(n.id); }}
      >
        <div>
          <p style={{ margin: '0 0 12px', lineHeight: '1.5' }}>{n.text}</p>
          {n.attachment && <p style={{ fontSize: '12px', color: '#888' }}>📎 Datei angehängt</p>}
          <small style={{ color: 'rgba(255,255,255,0.7)' }}>{n.created}</small>
        </div>
      </AccordionCard>
    ))}
  </div>
);

// ============================================================================
// INFO SECTION (PhysioCoaching, Team, etc.)
// ============================================================================
const InfoSection = ({ expandedCards, toggleCard }) => (
  <div>
    <AccordionCard
      icon="💚"
      title="PhysioCoaching"
      category="physio"
      text="1:1 Coaching am Reformer mit Hanna & Nico"
      isOpen={expandedCards['physiocoaching']}
      onToggle={() => toggleCard('physiocoaching')}
    >
      <div style={{ color: 'white' }}>
        <p><strong>Was ist PhysioCoaching?</strong></p>
        <p>1:1 Training am Reformer mit hochqualifizierten Physiotherapeuten. Für dich maßgeschneidert, sicher und effektiv.</p>
        
        <p><strong>Preis & Dauer:</strong> 89€ · 60 Minuten</p>
        
        <p><strong>Der Ablauf:</strong></p>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>✓ Physiotherapeutisches Check-in</li>
          <li>✓ Aufwärmen am Reformer</li>
          <li>✓ Individuelles Krafttraining</li>
          <li>✓ Entspannung & Tipps</li>
        </ul>

        <p><strong>Für wen perfekt:</strong></p>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>✓ Mit Rücken-, Knie- oder Schulterproblemen</li>
          <li>✓ Nach Operationen oder Verletzungen</li>
          <li>✓ Wenn Sicherheit beim Training wichtig ist</li>
          <li>✓ Für saubere Technik & echte Ergebnisse</li>
        </ul>
        
        <button style={{ ...styles.button, marginTop: '12px', backgroundColor: '#2d5016' }}>
          📧 Anfrage senden
        </button>
      </div>
    </AccordionCard>

    <AccordionCard
      icon="👥"
      title="Deine Coaches"
      category="team"
      text="Hanna & Nico — Physiotherapeuten mit Leidenschaft"
      isOpen={expandedCards['team']}
      onToggle={() => toggleCard('team')}
    >
      <div style={{ color: 'white' }}>
        <p><strong>🧑‍⚕️ Hanna — Physiotherapeutin & Gründerin</strong></p>
        <p>20+ Jahre Erfahrung. Spezialisiert auf Frauen in den Wechseljahren. Für sie geht Physiocoaching ganzheitlich — Körper UND Seele.</p>

        <p style={{ marginTop: '16px' }}><strong>🧑‍⚕️ Nico — Physiotherapeut & Fitnesscoach</strong></p>
        <p>15+ Jahre sportspezifische Erfahrung. Erkennt unrunde Bewegungsabläufe sofort und optimiert sie gezielt — nach Reha oder beim Wiedereinstieg ins Training.</p>
      </div>
    </AccordionCard>

    <AccordionCard
      icon="🏥"
      title="Physiotherapie"
      category="physio"
      text="Krankengymnastik, Manuelle Therapie, Massage"
      isOpen={expandedCards['physio']}
      onToggle={() => toggleCard('physio')}
    >
      <div style={{ color: 'white' }}>
        <p>Klassische Physiotherapie für deine Gesundheit:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>✓ Krankengymnastik (KGG)</li>
          <li>✓ Manuelle Therapie</li>
          <li>✓ Lymphdrainage</li>
          <li>✓ Massage & Entspannung</li>
          <li>✓ Prävention & Schmerzmanagement</li>
        </ul>
        <p style={{ marginTop: '12px', fontSize: '12px' }}>Auch ohne ärztliche Verordnung möglich!</p>
      </div>
    </AccordionCard>

    <AccordionCard
      icon="🎀"
      title="Pilates Company"
      category="pilates"
      text="Reformer, Aerial Yoga, Classic Pilates"
      isOpen={expandedCards['pilates']}
      onToggle={() => toggleCard('pilates')}
    >
      <div style={{ color: 'white' }}>
        <p>Kurse für jeden Körper:</p>
        <ul style={{ paddingLeft: '20px' }}>
          <li>✓ Reformer Pilates</li>
          <li>✓ Aerial Yoga (in der Hängematte)</li>
          <li>✓ Classic Pilates (auf der Matte)</li>
          <li>✓ Kleine Gruppen (max. 10 Personen)</li>
        </ul>
        <p style={{ marginTop: '12px', fontSize: '12px' }}>Mo-Sa · Morgens, mittags, abends — es passt zu dir!</p>
      </div>
    </AccordionCard>
  </div>
);

// ============================================================================
// POSTFACH WITH ACCORDION CARDS
// ============================================================================
const PostfachCards = ({ messages, onMarkRead, expandedCards, toggleCard }) => (
  <div>
    {messages.length === 0 && <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Keine Nachrichten</p>}
    {messages.map(m => (
      <AccordionCard
        key={m.id}
        icon="📧"
        title={m.title}
        category="message"
        text={m.text.substring(0, 60) + '...'}
        isOpen={expandedCards[`msg-${m.id}`]}
        onToggle={() => { toggleCard(`msg-${m.id}`); onMarkRead(m.id); }}
      >
        <div style={{ color: 'white' }}>
          <p style={{ margin: '0 0 12px' }}>{m.text}</p>
          {m.attachment && <p style={{ fontSize: '12px' }}>📎 Datei angehängt</p>}
          <small style={{ color: 'rgba(255,255,255,0.7)' }}>{m.created}</small>
        </div>
      </AccordionCard>
    ))}
  </div>
);

// ============================================================================
// HELPER: CATEGORY ICONS & GRADIENTS
// ============================================================================
const getCategoryIcon = (category) => {
  const icons = {
    'Ankündigungen': '📢',
    'Events': '🎉',
    'Info': 'ℹ️',
    'Schichten': '📅'
  };
  return icons[category] || '📌';
};

const getCategoryGradient = (category) => {
  const gradients = {
    'Ankündigungen': 'linear-gradient(135deg, #c8818c 0%, #a8616c 100%)',
    'Events': 'linear-gradient(135deg, #2d5016 0%, #1a3009 100%)',
    'Info': 'linear-gradient(135deg, #5a9bd5 0%, #3d7bb8 100%)',
    'Schichten': 'linear-gradient(135deg, #f5a623 0%, #d68a00 100%)',
    'physio': 'linear-gradient(135deg, #2d5016 0%, #1a3009 100%)',
    'pilates': 'linear-gradient(135deg, #c8818c 0%, #a8616c 100%)',
    'team': 'linear-gradient(135deg, #7b5ba6 0%, #5c3f85 100%)',
    'message': 'linear-gradient(135deg, #c8818c 0%, #a8616c 100%)',
  };
  return gradients[category] || 'linear-gradient(135deg, #999 0%, #666 100%)';
};

const NewsFeed = ({ news, onMarkRead }) => (
  <div>
    {news.length === 0 && <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Keine News vorhanden</p>}
    {news.map(n => {
      const isRead = n.readBy.some(id => id === true);
      return (
        <div key={n.id} onClick={() => onMarkRead(n.id)} style={{ ...styles.newsCard, opacity: isRead ? 0.7 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <span style={{ ...styles.badge, backgroundColor: getCategoryColor(n.category) }}>{n.category}</span>
              <h4 style={{ margin: '8px 0 4px' }}>{n.title}</h4>
            </div>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666' }}>{n.text.substring(0, 100)}...</p>
          <small style={{ color: '#999' }}>{n.created}</small>
        </div>
      );
    })}
  </div>
);

const Postfach = ({ messages, onMarkRead }) => (
  <div>
    {messages.length === 0 && <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>Keine Nachrichten</p>}
    {messages.map(m => (
      <div key={m.id} onClick={() => onMarkRead(m.id)} style={styles.messageCard}>
        <h4 style={{ margin: '0 0 6px' }}>{m.title}</h4>
        <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#666' }}>{m.text}</p>
        <small style={{ color: '#999' }}>{m.created}</small>
      </div>
    ))}
  </div>
);

const getCategoryColor = (category) => {
  const colors = { 'Ankündigungen': '#c8818c', 'Events': '#2d5016', 'Info': '#5a9bd5', 'Schichten': '#f5a623' };
  return colors[category] || '#999';
};

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
const AdminDashboard = ({ currentUser, news, messages, employees, auditLog, onCreateNews, onDeleteNews, onSendMessage, onResetPin, onLogout }) => {
  const [tab, setTab] = useState('news');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsText, setNewsText] = useState('');
  const [newsCategory, setNewsCategory] = useState('Ankündigungen');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgText, setMsgText] = useState('');
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  return (
    <div style={styles.adminContainer}>
      <div style={{ ...styles.header, backgroundColor: '#c8818c' }}>
        <h2 style={{ margin: 0, color: 'white' }}>⚙️ Admin Dashboard</h2>
        <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
      </div>

      <div style={styles.adminTabs}>
        {['news', 'messages', 'employees', 'audit'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ ...styles.adminTabBtn, backgroundColor: tab === t ? '#c8818c' : '#f0f0f0' }}>
            {t === 'news' && '📰 News'}
            {t === 'messages' && '📧 Messages'}
            {t === 'employees' && '👥 Employees'}
            {t === 'audit' && '📋 Audit'}
          </button>
        ))}
      </div>

      <div style={styles.adminContent}>
        {tab === 'news' && (
          <>
            <div style={styles.formPanel}>
              <h3>Neue News erstellen</h3>
              <input placeholder="Titel" value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} style={styles.input} />
              <textarea placeholder="Text" value={newsText} onChange={(e) => setNewsText(e.target.value)} style={{ ...styles.input, minHeight: '80px' }} />
              <select value={newsCategory} onChange={(e) => setNewsCategory(e.target.value)} style={styles.input}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => { if (newsTitle && newsText) { onCreateNews(newsTitle, newsText, newsCategory); setNewsTitle(''); setNewsText(''); } }} style={{ ...styles.button, backgroundColor: '#c8818c' }}>
                📌 News posten
              </button>
            </div>

            <div style={styles.listPanel}>
              <h3>News-Übersicht ({news.length})</h3>
              {news.map(n => (
                <div key={n.id} style={styles.listItem}>
                  <div>
                    <strong>{n.title}</strong> <span style={styles.badge}>{n.category}</span>
                    <br />
                    <small>{n.created}</small>
                  </div>
                  <button onClick={() => onDeleteNews(n.id)} style={{ ...styles.smallBtn, background: '#dc3545' }}>✕</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'messages' && (
          <>
            <div style={styles.formPanel}>
              <h3>Nachricht an Mitarbeiter</h3>
              <input placeholder="Titel" value={msgTitle} onChange={(e) => setMsgTitle(e.target.value)} style={styles.input} />
              <textarea placeholder="Text" value={msgText} onChange={(e) => setMsgText(e.target.value)} style={{ ...styles.input, minHeight: '80px' }} />
              <h4>Zielgruppen:</h4>
              {['PhysioPro Staff', 'Pilates Trainer'].map(g => (
                <label key={g} style={styles.checkbox}>
                  <input type="checkbox" checked={selectedGroups.includes(g)} onChange={(e) => setSelectedGroups(e.target.checked ? [...selectedGroups, g] : selectedGroups.filter(x => x !== g))} />
                  {g}
                </label>
              ))}
              <button onClick={() => { if (msgTitle && msgText) { onSendMessage(msgTitle, msgText, [], selectedGroups); setMsgTitle(''); setMsgText(''); setSelectedGroups([]); } }} style={{ ...styles.button, backgroundColor: '#c8818c' }}>
                📧 Senden
              </button>
            </div>

            <div style={styles.listPanel}>
              <h3>Versendete Nachrichten ({messages.length})</h3>
              {messages.map(m => (
                <div key={m.id} style={styles.listItem}>
                  <div>
                    <strong>{m.title}</strong>
                    <br />
                    <small>{m.readBy.length} gelesen • {m.created}</small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'employees' && (
          <div style={styles.listPanel}>
            <h3>Mitarbeiter-Verwaltung</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rolle</th>
                  <th>Unternehmen</th>
                  <th>PIN</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id}>
                    <td>{e.name}</td>
                    <td>{e.role}</td>
                    <td>{e.company}</td>
                    <td>{e.pinSet ? '✅' : '❌'}</td>
                    <td>{e.pinSet && <button onClick={() => onResetPin(e.id)} style={styles.smallBtn}>🔄</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'audit' && (
          <div style={styles.listPanel}>
            <h3>Audit-Log ({auditLog.length})</h3>
            {auditLog.slice(0, 50).map(entry => (
              <div key={entry.id} style={{ ...styles.listItem, padding: '10px', fontSize: '12px' }}>
                <strong>{entry.timestamp}</strong> | {entry.action} | {entry.userId}
                <br />
                <small>{entry.details}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: 'system-ui', padding: '20px' },
  loginBox: { backgroundColor: 'white', borderRadius: '12px', padding: '40px', maxWidth: '500px', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  logoArea: { textAlign: 'center', marginBottom: '30px' },
  tabs: { display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' },
  tabButton: { background: 'none', border: 'none', padding: '8px 0', fontSize: '14px', cursor: 'pointer', fontWeight: '500' },
  input: { width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' },
  button: { width: '100%', padding: '10px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '3px', fontSize: '11px', color: 'white', marginRight: '6px' },

  employeeContainer: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' },
  header: { padding: '15px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoutBtn: { padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  // ============================================================================
  // ACCORDION CARD STYLES
  // ============================================================================
  accordionCard: {
    borderRadius: '12px',
    marginBottom: '12px',
    color: 'white',
    cursor: 'pointer',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
  },
  cardContent: {
    padding: '12px 16px 16px',
    borderTop: '1px solid rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // ============================================================================
  // DASHBOARD LAYOUT
  // ============================================================================
  dashboardContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  dashboardSection: {
    marginBottom: '40px',
  },
  newsCard: { backgroundColor: 'white', padding: '12px', borderRadius: '6px', marginBottom: '10px', cursor: 'pointer', borderLeft: '3px solid #2d5016' },
  messageCard: { backgroundColor: 'white', padding: '12px', borderRadius: '6px', marginBottom: '10px', cursor: 'pointer', borderLeft: '3px solid #c8818c' },
  bottomNav: { display: 'flex', gap: '10px', padding: '10px', backgroundColor: 'white', borderTop: '1px solid #eee' },
  navBtn: { flex: 1, padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' },

  adminContainer: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' },
  adminTabs: { display: 'flex', gap: '10px', padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #eee' },
  adminTabBtn: { padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '13px' },
  adminContent: { flex: 1, padding: '20px', overflowY: 'auto' },
  formPanel: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  listPanel: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee', fontSize: '13px' },
  smallBtn: { padding: '4px 8px', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', color: 'white' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0', fontSize: '13px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
};

// ============================================================================
// RENDER
// ============================================================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <StuffIntranet />
  </React.StrictMode>
);
