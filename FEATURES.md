# STUFF Intranet - Feature Übersicht

## 🎯 Grundkonzept
Ein zentrales Intranet mit zwei Bereichen:
1. **PUBLIC AREA**: Firmen-News für alle sichtbar
2. **EMPLOYEE POSTFACH**: Private Nachrichten (nur für autorisierte Mitarbeiter)

---

## 👤 MITARBEITER-BEREICH

### Login
- **PIN-basiert** (universell für alles)
- Erste Anmeldung: PIN selbst festlegen (4-6 Ziffern)
- Pin wird danach nicht mehr abgefragt

### Dashboard (Desktop)
- **Widgets-Layout** (verschiebbar/anpassbar)
- **Widget 1: Firmen-News**
  - Nach Kategorie organisiert: Ankündigungen | Events | Info | Schichten
  - Mit Filter zum Umschalten
  - News nach Monat archivierbar
  - Bilder, PDF, Excel, Word, Links erlaubt (max 10MB)
  
- **Widget 2: Persönliches Postfach**
  - Nachrichten nur an dich oder deine Rolle
  - Anhänge bis 10MB
  - Lesestatus: privat (nur Admin sieht es)

### Mobile View
- **Bottom Navigation** (unten Tabs)
- Tab 1: 📰 News
- Tab 2: 📧 Postfach
- One-Column Layout

### Funktionen
- ✅ News als "gelesen" markieren (mit Klick)
- ✅ Postfach-Nachrichten lesen
- ✅ Anhänge anschauen/herunterladen
- ✅ Zeitstempel auf allen Inhalten

---

## ⚙️ ADMIN-BEREICH (Oliver & Hanna)

### Login
- **Email + Passwort** (getrennt von Mitarbeiter-Login)
- Nur für Oliver & Hanna
- Separate Admin-Seite nach Login

### Dashboard - Tabs

#### 📰 NEWS-MANAGEMENT
**Neue News erstellen:**
- Titel eingeben
- Text/Inhalt
- Kategorie wählen (Ankündigungen | Events | Info | Schichten)
- Optional: Anhang hochladen (bis 10MB)
- Posten-Button

**News-Übersicht:**
- Chronologische Listenansicht
- Edit/Delete-Funktionen
- Archivieren nach Monat
- Suchmöglichkeit (später)

#### 📧 MESSAGE-MANAGEMENT
**Nachricht an Mitarbeiter senden:**
- Titel + Text
- Zielgruppe wählen:
  - ☐ PhysioPro Staff (Gruppe)
  - ☐ Pilates Trainer (Gruppe)
  - ☐ Einzelne Mitarbeiter (Checkboxen)
- Optional: Anhang (bis 10MB)
- Senden-Button

**Versendete Nachrichten:**
- Übersicht mit Lesestatus
- "3/12 gelesen" anzeigen
- Wer hat wann gelesen (Audit)

#### 👥 EMPLOYEE-MANAGEMENT
**Mitarbeiter-Tabelle:**
- Name | Rolle | Unternehmen | PIN-Status | Aktion
- PIN-Reset Button (für jeden Mitarbeiter)
- Nach PIN-Reset muss Mitarbeiter neue PIN festlegen

#### 📋 AUDIT-LOG
**Komplette Protokollierung:**
- Timestamp | Aktion | User | Details
- Admin Login/Logout
- PIN Setups
- News erstellt/gelöscht
- Nachrichten versendet
- PIN Resets
- Lesestatus-Tracking (wer, wann, was gelesen)

---

## 🔐 SICHERHEIT & PRIVATSPHÄRE

- ✅ PIN-geschützt (Mitarbeiter)
- ✅ Email+Passwort geschützt (Admin)
- ✅ Lesestatus nur Admin sichtbar
- ✅ Audit-Log für alle Aktionen
- ✅ Datenlöschung möglich (nur Admin)
- ✅ Nichts wird automatisch gelöscht

---

## 📱 RESPONSIVE DESIGN

**Desktop:**
- Widgets-Layout (nebeneinander)
- Volle Breite nutzen
- Drag-to-rearrange (später)

**Mobile (< 768px):**
- Bottom Navigation
- One-Column Layout
- Kein Widgets-Quetsch
- Touch-friendly Buttons

---

## 💾 DATENSPEICHERUNG

**Aktuell:**
- localStorage (Browser-Speicher)
- Offline-Nutzung möglich
- Lokal auf dem Gerät

**Später:**
- Google Sheets Integration
- Cloud-Backup
- Sync über mehrere Geräte

---

## 📊 KATEGORIEN & METADATEN

### News-Kategorien
- Ankündigungen (z.B. neue Öffnungszeiten)
- Events (z.B. Teammeeting)
- Info (z.B. Wiki-Artikel)
- Schichten (z.B. Schichtplan)

### Content-Typen
- Text
- Bilder (inline)
- PDF
- Excel/Word
- Links
- Kombinationen

---

## 🎨 DESIGN

### Farben
- PhysioPro Grün (#2d5016)
- Pilates Mauve (#c8818c)
- Neutrale Grautöne

### Logos
- PhysioPro Logo oben
- Pilates Logo oben
- Harmonische Integration

---

## 🚀 Deployment

**GitHub Repo:**
```
wrobeloliver2-crypto/stuff-communication
```

**Live auf Netlify:**
```
https://stuff-communication.netlify.app
```

**Build:**
```bash
npm install
npm run build
```

---

## 📝 VERWENDETE TECHNOLOGIEN

- **Frontend:** React 18, Vite
- **Styling:** CSS-in-JS (inline styles)
- **Storage:** localStorage (later: Google Sheets)
- **Hosting:** Netlify
- **Repository:** GitHub

---

## 🔄 Workflow für Oliver (Admin)

1. **Login** mit Email + Passwort
2. **News posten** (Reiter "News")
   - Titel → Text → Kategorie → Posten
3. **Nachrichten versenden** (Reiter "Messages")
   - Titel → Text → Zielgruppe → Senden
4. **Mitarbeiter verwalten** (Reiter "Employees")
   - PIN resetten wenn nötig
5. **Audit-Log prüfen** (Reiter "Audit")
   - Wer hat wann was gelesen?

---

## 🎓 Workflow für Mitarbeiter

1. **PIN eingeben** (einmalig beim ersten Login)
2. **Dashboard öffnen**
3. **News lesen** im Widget
4. **Postfach checken** auf persönliche Nachrichten
5. **Mobile:** Tabs unten zum Umschalten
6. **Desktop:** Widgets nebeneinander, scrollbar

---

Version: 1.0.0 | Stand: Juni 2026
