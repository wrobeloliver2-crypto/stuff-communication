import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// ============================================================================
// STUFF COMMUNICATION - Central Staff Communication Platform
// PhysioPro Lübeck + Pilates Company
// ============================================================================

const StuffCommunicationApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'employee'
  const [page, setPage] = useState('login'); // 'login' | 'admin' | 'employee'
  const [messages, setMessages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  // Mock Data - wird später durch Google Sheets ersetzt
  const ADMIN_CREDENTIALS = [
    { email: 'hanna.wrobel@pilatescompany.de', name: 'Hanna Wrobel' },
    { email: 'oliver.wrobel@pilatescompany.de', name: 'Oliver Wrobel' },
  ];

  const INITIAL_EMPLOYEES = [
    // PhysioPro Staff
    { id: 'anna-bath', name: 'Anna Bath', role: 'PhysioPro Staff', company: 'PhysioPro', email: 'anna@physiopro.de', pin: null, pinSet: false, phone: '' },
    { id: 'julia-mielke', name: 'Julia Mielke', role: 'PhysioPro Staff', company: 'PhysioPro', email: 'julia@physiopro.de', pin: null, pinSet: false, phone: '' },
    { id: 'tuana', name: 'Tuana Koyulhisarli', role: 'PhysioPro Staff', company: 'PhysioPro', email: 'tuana@physiopro.de', pin: null, pinSet: false, phone: '' },
    { id: 'maike', name: 'Maike Schrader', role: 'PhysioPro Staff', company: 'PhysioPro', email: 'maike@physiopro.de', pin: null, pinSet: false, phone: '' },
    { id: 'annika', name: 'Annika Zwiener', role: 'PhysioPro Staff', company: 'PhysioPro', email: 'annika@physiopro.de', pin: null, pinSet: false, phone: '' },
    { id: 'finn', name: 'Finn Meyer', role: 'PhysioPro Staff', company: 'PhysioPro', email: 'finn@physiopro.de', pin: null, pinSet: false, phone: '' },
    { id: 'phillip', name: 'Phillip Opelka', role: 'PhysioPro Staff', company: 'PhysioPro', email: 'phillip@physiopro.de', pin: null, pinSet: false, phone: '' },
    { id: 'imo', name: 'Imo Thomsen', role: 'PhysioPro Staff', company: 'PhysioPro', email: 'imo@physiopro.de', pin: null, pinSet: false, phone: '' },
    
    // Pilates Trainer
    { id: 'tina', name: 'Tina', role: 'Pilates Trainer', company: 'Pilates', email: 'tina@pilatescompany.de', pin: null, pinSet: false, phone: '' },
    { id: 'natascha', name: 'Natascha', role: 'Pilates Trainer', company: 'Pilates', email: 'natascha@pilatescompany.de', pin: null, pinSet: false, phone: '' },
    { id: 'ina', name: 'Ina', role: 'Pilates Trainer', company: 'Pilates', email: 'ina@pilatescompany.de', pin: null, pinSet: false, phone: '' },
    { id: 'katy', name: 'Katy', role: 'Pilates Trainer', company: 'Pilates', email: 'katy@pilatescompany.de', pin: null, pinSet: false, phone: '' },
    { id: 'paula', name: 'Paula', role: 'Pilates Trainer', company: 'Pilates', email: 'paula@pilatescompany.de', pin: null, pinSet: false, phone: '' },
  ];

  // Initialize data from localStorage
  useEffect(() => {
    const storedMessages = localStorage.getItem('stuffComm_messages');
    const storedEmployees = localStorage.getItem('stuffComm_employees');
    const storedAuditLog = localStorage.getItem('stuffComm_auditLog');

    if (storedMessages) setMessages(JSON.parse(storedMessages));
    if (storedEmployees) setEmployees(JSON.parse(storedEmployees));
    else setEmployees(INITIAL_EMPLOYEES);
    if (storedAuditLog) setAuditLog(JSON.parse(storedAuditLog));
  }, []);

  // Persist data to localStorage
  useEffect(() => {
    localStorage.setItem('stuffComm_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('stuffComm_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('stuffComm_auditLog', JSON.stringify(auditLog));
  }, [auditLog]);

  // ============================================================================
  // ADMIN LOGIN
  // ============================================================================
  const handleAdminLogin = (email, password) => {
    const admin = ADMIN_CREDENTIALS.find(a => a.email === email);
    if (admin) {
      setCurrentUser({ email, name: admin.name });
      setUserRole('admin');
      setPage('admin');
      logAudit('Admin Login', email, `Logged in as ${admin.name}`);
    } else {
      alert('Invalid email or password');
    }
  };

  // ============================================================================
  // EMPLOYEE LOGIN (PIN)
  // ============================================================================
  const handleEmployeeLogin = (employeeId, pin) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      alert('Employee not found');
      return;
    }

    if (!employee.pinSet) {
      alert('PIN not set yet. First login requires PIN setup.');
      return;
    }

    if (employee.pin !== pin) {
      alert('Invalid PIN');
      return;
    }

    setCurrentUser(employee);
    setUserRole('employee');
    setPage('employee');
    logAudit('Employee Login', employeeId, `${employee.name} logged in`);
  };

  // ============================================================================
  // EMPLOYEE FIRST LOGIN (PIN SETUP)
  // ============================================================================
  const handleEmployeePinSetup = (employeeId, newPin) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      alert('Employee not found');
      return;
    }

    const updatedEmployees = employees.map(e =>
      e.id === employeeId ? { ...e, pin: newPin, pinSet: true } : e
    );
    setEmployees(updatedEmployees);
    setCurrentUser({ ...employee, pin: newPin, pinSet: true });
    setUserRole('employee');
    setPage('employee');
    logAudit('PIN Setup', employeeId, `${employee.name} set PIN`);
  };

  // ============================================================================
  // AUDIT LOG
  // ============================================================================
  const logAudit = (action, userId, details) => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('de-DE'),
      action,
      userId,
      details,
    };
    setAuditLog([newEntry, ...auditLog]);
  };

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================
  const createMessage = (title, text, type, targetGroups, targetIndividuals, attachment) => {
    const newMessage = {
      id: Date.now(),
      created: new Date().toLocaleString('de-DE'),
      sender: currentUser.email,
      title,
      text,
      type, // 'personal' | 'group' | 'general'
      status: 'draft', // 'draft' | 'ready' | 'sent' | 'read'
      targetGroups, // ['PhysioPro Staff', 'Pilates Trainer', 'Verwaltung', 'Alle']
      targetIndividuals, // [{ id, name }]
      attachment: attachment || null,
      whatsappSent: false,
      whatsappTimestamp: null,
      readBy: [], // [{ employeeId, timestamp }]
    };
    setMessages([newMessage, ...messages]);
    logAudit('Message Created', currentUser.email, `"${title}" in ${newMessage.status}`);
    return newMessage;
  };

  const updateMessageStatus = (messageId, newStatus) => {
    const updated = messages.map(m =>
      m.id === messageId ? { ...m, status: newStatus } : m
    );
    setMessages(updated);
    logAudit('Message Status Updated', currentUser.email, `Message #${messageId} → ${newStatus}`);
  };

  const deleteMessage = (messageId) => {
    const updated = messages.filter(m => m.id !== messageId);
    setMessages(updated);
    logAudit('Message Deleted', currentUser.email, `Message #${messageId} deleted`);
  };

  const markMessageAsRead = (messageId) => {
    const updated = messages.map(m => {
      if (m.id === messageId) {
        const isAlreadyRead = m.readBy.some(r => r.employeeId === currentUser.id);
        if (!isAlreadyRead) {
          return {
            ...m,
            readBy: [...m.readBy, { employeeId: currentUser.id, timestamp: new Date().toLocaleString('de-DE') }],
            status: m.readBy.length + 1 >= getTargetCount(m) ? 'read' : 'sent',
          };
        }
      }
      return m;
    });
    setMessages(updated);
    logAudit('Message Read', currentUser.id, `Read message #${messageId}`);
  };

  const resetEmployeePin = (employeeId) => {
    const updated = employees.map(e =>
      e.id === employeeId ? { ...e, pin: null, pinSet: false } : e
    );
    setEmployees(updated);
    logAudit('PIN Reset', currentUser.email, `PIN reset for employee #${employeeId}`);
  };

  const getTargetCount = (message) => {
    let count = 0;
    if (message.targetGroups.includes('Alle')) {
      return employees.length;
    }
    if (message.targetGroups.includes('PhysioPro Staff')) {
      count += employees.filter(e => e.role === 'PhysioPro Staff').length;
    }
    if (message.targetGroups.includes('Pilates Trainer')) {
      count += employees.filter(e => e.role === 'Pilates Trainer').length;
    }
    count += message.targetIndividuals.length;
    return count;
  };

  // ============================================================================
  // RENDER: LOGIN PAGE
  // ============================================================================
  if (page === 'login') {
    return (
      <LoginPage
        onAdminLogin={handleAdminLogin}
        onEmployeeLogin={handleEmployeeLogin}
        onEmployeePinSetup={handleEmployeePinSetup}
        employees={employees}
      />
    );
  }

  // ============================================================================
  // RENDER: ADMIN DASHBOARD
  // ============================================================================
  if (page === 'admin' && userRole === 'admin') {
    return (
      <AdminDashboard
        currentUser={currentUser}
        messages={messages}
        employees={employees}
        auditLog={auditLog}
        onCreateMessage={createMessage}
        onUpdateMessageStatus={updateMessageStatus}
        onDeleteMessage={deleteMessage}
        onResetPin={resetEmployeePin}
        onLogout={() => {
          setCurrentUser(null);
          setUserRole(null);
          setPage('login');
        }}
      />
    );
  }

  // ============================================================================
  // RENDER: EMPLOYEE DASHBOARD
  // ============================================================================
  if (page === 'employee' && userRole === 'employee') {
    return (
      <EmployeeDashboard
        currentUser={currentUser}
        messages={messages.filter(m => isMessageForEmployee(m, currentUser))}
        onMarkAsRead={markMessageAsRead}
        onLogout={() => {
          setCurrentUser(null);
          setUserRole(null);
          setPage('login');
        }}
      />
    );
  }

  return <div style={styles.loading}>Loading...</div>;
};

// ============================================================================
// LOGIN PAGE COMPONENT
// ============================================================================
const LoginPage = ({ onAdminLogin, onEmployeeLogin, onEmployeePinSetup, employees }) => {
  const [mode, setMode] = useState('admin'); // 'admin' | 'employee' | 'pin-setup'
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeePin, setEmployeePin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>🔐 Stuff Communication</h1>
        <p style={styles.subtitle}>PhysioPro + Pilates Company</p>

        {/* TAB SELECTION */}
        <div style={styles.tabs}>
          <button
            onClick={() => setMode('admin')}
            style={{
              ...styles.tabButton,
              borderBottom: mode === 'admin' ? '3px solid #007bff' : 'none',
            }}
          >
            👨‍💼 Admin
          </button>
          <button
            onClick={() => setMode('employee')}
            style={{
              ...styles.tabButton,
              borderBottom: mode === 'employee' ? '3px solid #007bff' : 'none',
            }}
          >
            👤 Mitarbeiter
          </button>
        </div>

        {/* ADMIN LOGIN */}
        {mode === 'admin' && (
          <div>
            <input
              type="email"
              placeholder="Email (z.B. oliver.wrobel@pilatescompany.de)"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Passwort"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={() => onAdminLogin(adminEmail, adminPassword)}
              style={styles.button}
            >
              Anmelden
            </button>
            <p style={styles.hint}>
              📝 Beim ersten Login: Passwort wird festgelegt
            </p>
          </div>
        )}

        {/* EMPLOYEE LOGIN / PIN SETUP */}
        {mode === 'employee' && (
          <div>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={styles.input}
            >
              <option value="">-- Mitarbeiter auswählen --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>

            {selectedEmployee && employees.find(e => e.id === selectedEmployee)?.pinSet ? (
              // PIN LOGIN
              <div>
                <input
                  type="password"
                  placeholder="Dein PIN"
                  value={employeePin}
                  onChange={(e) => setEmployeePin(e.target.value)}
                  maxLength="6"
                  style={styles.input}
                />
                <button
                  onClick={() => onEmployeeLogin(selectedEmployee, employeePin)}
                  style={styles.button}
                >
                  Anmelden
                </button>
              </div>
            ) : selectedEmployee ? (
              // PIN SETUP
              <div>
                <p style={styles.hint}>🔑 Erstmalige Anmeldung: PIN festlegen</p>
                <input
                  type="password"
                  placeholder="Neuer PIN (4-6 Ziffern)"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  maxLength="6"
                  style={styles.input}
                />
                <input
                  type="password"
                  placeholder="PIN wiederholen"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  maxLength="6"
                  style={styles.input}
                />
                <button
                  onClick={() => {
                    if (newPin !== confirmPin) {
                      alert('PINs stimmen nicht überein');
                      return;
                    }
                    if (newPin.length < 4) {
                      alert('PIN muss mindestens 4 Ziffern haben');
                      return;
                    }
                    onEmployeePinSetup(selectedEmployee, newPin);
                  }}
                  style={styles.button}
                >
                  PIN Festlegen
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ADMIN DASHBOARD COMPONENT
// ============================================================================
const AdminDashboard = ({
  currentUser,
  messages,
  employees,
  auditLog,
  onCreateMessage,
  onUpdateMessageStatus,
  onDeleteMessage,
  onResetPin,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'settings' | 'audit'
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('personal');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const handleCreateMessage = () => {
    if (!messageTitle || !messageText) {
      alert('Bitte Titel und Text ausfüllen');
      return;
    }
    onCreateMessage(messageTitle, messageText, messageType, selectedGroups, selectedIndividuals);
    setMessageTitle('');
    setMessageText('');
    setMessageType('personal');
    setSelectedGroups([]);
    setSelectedIndividuals([]);
  };

  const getMessageRecipients = (message) => {
    if (message.targetGroups.includes('Alle')) {
      return employees;
    }
    let recipients = [];
    if (message.targetGroups.includes('PhysioPro Staff')) {
      recipients = recipients.concat(employees.filter(e => e.role === 'PhysioPro Staff'));
    }
    if (message.targetGroups.includes('Pilates Trainer')) {
      recipients = recipients.concat(employees.filter(e => e.role === 'Pilates Trainer'));
    }
    recipients = recipients.concat(
      employees.filter(e => message.targetIndividuals.some(ti => ti.id === e.id))
    );
    return recipients;
  };

  const statuses = ['draft', 'ready', 'sent', 'read'];
  const messagesByStatus = {
    draft: messages.filter(m => m.status === 'draft'),
    ready: messages.filter(m => m.status === 'ready'),
    sent: messages.filter(m => m.status === 'sent'),
    read: messages.filter(m => m.status === 'read'),
  };

  return (
    <div style={styles.adminContainer}>
      {/* HEADER */}
      <div style={styles.adminHeader}>
        <h1>📊 Admin Dashboard - Stuff Communication</h1>
        <div>
          <span>Willkommen, {currentUser.name}</span>
          <button onClick={onLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div style={styles.adminTabs}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            ...styles.adminTabButton,
            backgroundColor: activeTab === 'dashboard' ? '#007bff' : '#e9ecef',
          }}
        >
          📌 Dashboard
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            ...styles.adminTabButton,
            backgroundColor: activeTab === 'settings' ? '#007bff' : '#e9ecef',
          }}
        >
          ⚙️ Einstellungen
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            ...styles.adminTabButton,
            backgroundColor: activeTab === 'audit' ? '#007bff' : '#e9ecef',
          }}
        >
          📋 Audit-Log
        </button>
      </div>

      {/* CONTENT */}
      {activeTab === 'dashboard' && (
        <div style={styles.adminContent}>
          {/* NEW MESSAGE FORM */}
          <div style={styles.newMessagePanel}>
            <h2>✉️ Neue Nachricht erstellen</h2>
            <input
              type="text"
              placeholder="Titel"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              style={styles.input}
            />
            <textarea
              placeholder="Nachrichtentext"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              style={{ ...styles.input, minHeight: '80px' }}
            />
            <div style={styles.formRow}>
              <div>
                <label>Typ:</label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  style={styles.input}
                >
                  <option value="personal">Persönlich</option>
                  <option value="group">Gruppennachricht</option>
                  <option value="general">Allgemeine Info (Link)</option>
                </select>
              </div>
            </div>

            <div style={styles.formRow}>
              <div>
                <label>Zielgruppen:</label>
                <div style={styles.checkboxGroup}>
                  {['PhysioPro Staff', 'Pilates Trainer', 'Verwaltung', 'Alle'].map(group => (
                    <label key={group} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroups([...selectedGroups, group]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(g => g !== group));
                          }
                        }}
                      />
                      {group}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleCreateMessage} style={styles.button}>
              💾 Als Entwurf speichern
            </button>
          </div>

          {/* KANBAN BOARD */}
          <div style={styles.kanbanBoard}>
            <h2>📋 Nachrichtenverwaltung</h2>
            <div style={styles.kanbanContainer}>
              {statuses.map(status => (
                <div key={status} style={styles.kanbanColumn}>
                  <h3 style={styles.columnTitle}>
                    {status === 'draft' && '📝 ENTWURF'}
                    {status === 'ready' && '✅ BEREIT'}
                    {status === 'sent' && '📤 VERSENDET'}
                    {status === 'read' && '✅ GELESEN'}
                  </h3>
                  <div style={styles.cardStack}>
                    {messagesByStatus[status].map(msg => (
                      <div
                        key={msg.id}
                        style={styles.messageCard}
                        onClick={() => setSelectedMessage(msg)}
                      >
                        <h4>{msg.title}</h4>
                        <p>{msg.text.substring(0, 80)}...</p>
                        <small>{msg.created}</small>
                        <div style={styles.cardActions}>
                          {status !== 'read' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextStatus = statuses[statuses.indexOf(status) + 1];
                                if (nextStatus) onUpdateMessageStatus(msg.id, nextStatus);
                              }}
                              style={styles.smallButton}
                            >
                              →
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteMessage(msg.id);
                            }}
                            style={{ ...styles.smallButton, background: '#dc3545' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MESSAGE DETAIL PANEL */}
          {selectedMessage && (
            <div style={styles.detailPanel}>
              <button onClick={() => setSelectedMessage(null)} style={styles.closeButton}>
                ✕
              </button>
              <h2>{selectedMessage.title}</h2>
              <p><strong>Text:</strong> {selectedMessage.text}</p>
              <p><strong>Status:</strong> {selectedMessage.status}</p>
              <p><strong>Erstellt:</strong> {selectedMessage.created}</p>
              <p><strong>Absender:</strong> {selectedMessage.sender}</p>

              <h4>📊 Lesestatus</h4>
              <div style={styles.readStatus}>
                <p>
                  {selectedMessage.readBy.length}/{getMessageRecipients(selectedMessage).length} gelesen
                </p>
                {selectedMessage.readBy.map(reader => (
                  <div key={reader.employeeId} style={styles.readEntry}>
                    ✅ {reader.employeeId} - {reader.timestamp}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={styles.adminContent}>
          <h2>⚙️ Mitarbeiter-Verwaltung</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Rolle</th>
                <th>Unternehmen</th>
                <th>PIN Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  <td>{emp.role}</td>
                  <td>{emp.company}</td>
                  <td>{emp.pinSet ? '✅ Gesetzt' : '❌ Nicht gesetzt'}</td>
                  <td>
                    {emp.pinSet && (
                      <button
                        onClick={() => {
                          if (confirm(`PIN für ${emp.name} zurücksetzen?`)) {
                            onResetPin(emp.id);
                          }
                        }}
                        style={styles.smallButton}
                      >
                        🔄 Reset
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'audit' && (
        <div style={styles.adminContent}>
          <h2>📋 Audit-Log</h2>
          <div style={styles.auditLog}>
            {auditLog.slice(0, 50).map(entry => (
              <div key={entry.id} style={styles.auditEntry}>
                <strong>{entry.timestamp}</strong> | {entry.action} | {entry.userId}
                <br />
                <small>{entry.details}</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EMPLOYEE DASHBOARD COMPONENT
// ============================================================================
const EmployeeDashboard = ({ currentUser, messages, onMarkAsRead, onLogout }) => {
  const personalMessages = messages.filter(m => m.type === 'personal' || m.type === 'group');
  const generalMessages = messages.filter(m => m.type === 'general');

  return (
    <div style={styles.employeeContainer}>
      <div style={styles.employeeHeader}>
        <h1>👤 {currentUser.name}</h1>
        <div>
          <span>{currentUser.role}</span>
          <button onClick={onLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div style={styles.employeeContent}>
        {/* GENERAL INFOS */}
        {generalMessages.length > 0 && (
          <div style={styles.section}>
            <h2>📌 Allgemeine Infos</h2>
            {generalMessages.map(msg => (
              <div key={msg.id} style={styles.infoCard}>
                <h3>{msg.title}</h3>
                <p>🔗 <a href={msg.text} target="_blank" rel="noopener noreferrer">{msg.text}</a></p>
                <small>{msg.created}</small>
              </div>
            ))}
          </div>
        )}

        {/* PERSONAL MESSAGES */}
        {personalMessages.length > 0 && (
          <div style={styles.section}>
            <h2>👤 Persönliche & Gruppennachrichten</h2>
            {personalMessages.map(msg => {
              const isRead = msg.readBy.some(r => r.employeeId === currentUser.id);
              return (
                <div
                  key={msg.id}
                  style={{ ...styles.messageBox, opacity: isRead ? 0.7 : 1 }}
                  onClick={() => !isRead && onMarkAsRead(msg.id)}
                >
                  <div style={styles.messageMeta}>
                    <h3>{msg.title}</h3>
                    {!isRead && <span style={styles.badge}>🆕 NEU</span>}
                  </div>
                  <p>{msg.text}</p>
                  {msg.attachment && (
                    <p>📎 <a href={msg.attachment} target="_blank" rel="noopener noreferrer">Anhang herunterladen</a></p>
                  )}
                  <div style={styles.messageFooter}>
                    <small>von {msg.sender} • {msg.created}</small>
                    {isRead && <small>✅ Gelesen</small>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <p>Keine Nachrichten vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// HELPER: Check if message is for employee
// ============================================================================
const isMessageForEmployee = (message, employee) => {
  if (message.targetGroups.includes('Alle')) return true;
  if (message.targetGroups.includes(employee.role)) return true;
  if (message.targetIndividuals.some(ti => ti.id === employee.id)) return true;
  return false;
};

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
  },
  loginBox: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    color: '#007bff',
    marginBottom: '0',
    fontSize: '28px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginTop: '5px',
    marginBottom: '30px',
  },
  tabs: {
    display: 'flex',
    gap: '20px',
    marginBottom: '30px',
    borderBottom: '1px solid #e9ecef',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    padding: '10px 0',
    fontSize: '16px',
    cursor: 'pointer',
    color: '#666',
    transition: 'all 0.3s',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.3s',
  },
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '15px',
    textAlign: 'center',
  },

  // ADMIN STYLES
  adminContainer: {
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  adminHeader: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminTabs: {
    display: 'flex',
    gap: '10px',
    padding: '15px 20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e9ecef',
  },
  adminTabButton: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    transition: 'all 0.3s',
  },
  adminContent: {
    flex: 1,
    padding: '20px',
  },
  newMessagePanel: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formRow: {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  kanbanBoard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  kanbanContainer: {
    display: 'flex',
    gap: '20px',
    overflowX: 'auto',
    paddingBottom: '10px',
  },
  kanbanColumn: {
    flex: '0 0 280px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    padding: '15px',
    minHeight: '500px',
  },
  columnTitle: {
    textAlign: 'center',
    color: '#333',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '15px',
  },
  cardStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  messageCard: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardActions: {
    display: 'flex',
    gap: '5px',
    marginTop: '10px',
  },
  smallButton: {
    padding: '4px 8px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    background: '#007bff',
    color: 'white',
  },
  detailPanel: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
  },
  readStatus: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '6px',
  },
  readEntry: {
    padding: '8px',
    borderBottom: '1px solid #e9ecef',
    fontSize: '13px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  auditLog: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '8px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  auditEntry: {
    padding: '10px',
    borderBottom: '1px solid #e9ecef',
    fontSize: '12px',
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '10px',
  },

  // EMPLOYEE STYLES
  employeeContainer: {
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  employeeHeader: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeContent: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  section: {
    marginBottom: '30px',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  messageBox: {
    backgroundColor: 'white',
    padding: '15px',
    borderRadius: '6px',
    marginBottom: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    borderLeft: '4px solid #007bff',
    transition: 'all 0.2s',
  },
  messageMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  badge: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '12px',
  },
  messageFooter: {
    marginTop: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
};

export default StuffCommunicationApp;

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <StuffCommunicationApp />
  </React.StrictMode>
);
