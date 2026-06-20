# 🚀 Stuff Communication - Setup Guide

Zentrale Kommunikationsplattform für PhysioPro Lübeck + Pilates Company

---

## **📋 Übersicht**

**Features:**
- ✅ Admin-Dashboard (Kanban-Board für Nachrichten)
- ✅ Mitarbeiter-Dashboard (PIN-Login, personalisierte Nachrichten)
- ✅ Rollenbasierte Sichtbarkeit (PhysioPro Staff, Pilates Trainer, Verwaltung, Alle)
- ✅ Lesestatus-Tracking
- ✅ Audit-Log (Revision-sicher)
- ✅ WhatsApp-Integration (optional)

---

## **🔑 Admin-Zugang**

**Emails (teilen ein Passwort):**
- `hanna.wrobel@pilatescompany.de`
- `oliver.wrobel@pilatescompany.de`

**Passwort:** Beim ersten Login selbst setzen

---

## **👤 Mitarbeiter-Zugang**

**PIN-System:**
1. Mitarbeiter wählt seinen Namen
2. **Erste Anmeldung**: PIN selbst festlegen (4-6 Ziffern)
3. **Künftige Anmeldungen**: PIN eingeben

**Admin kann PIN zurücksetzen** unter "Einstellungen" → Mitarbeiter-Verwaltung

---

## **📊 Admin-Dashboard: Kanban-Workflow**

### **Spalten:**

1. **📝 ENTWURF**
   - Neue Nachricht schreiben
   - Titel + Text ausfüllen
   - Zielgruppe wählen (Gruppen oder Individuen)
   - Optional: Anhang hochladen

2. **✅ BEREIT ZUM VERSAND**
   - Nachricht vor dem Versand prüfen
   - Hier für Versand vorbereiten
   - WhatsApp-Benachrichtigung aktivieren (optional)

3. **📤 VERSENDET**
   - Nachricht ist raus
   - Live-Lesestatus: "3/12 gelesen"
   - Details anklicken für Lesestatus pro Person

4. **✅ GELESEN**
   - Alle Empfänger haben gelesen
   - Automatisch nach 7 Tagen oder manuell archivieren

---

## **✉️ Nachrichtentypen**

### **1. Persönliche Nachricht**
- An Einzelperson oder Gruppe
- Beispiel: "Hanna: Schichtplan Juli"
- Zeigt im Mitarbeiter-Dashboard unter "Persönliche Nachrichten"
- Optional: WhatsApp-Benachrichtigung

### **2. Gruppennachricht**
- An Rolle (z.B. "PhysioPro Staff") oder Überlappung
- Beispiel: "Team-Meeting Mittwoch"
- Sichtbar für diese Gruppen

### **3. Allgemeine Info (Link)**
- Verweis auf Website-Inhalt
- Beispiel: "Neue Öffnungszeiten → physiopro.de/info"
- Minimal Pflegeaufwand
- Für alle sichtbar

---

## **👥 Zielgruppen**

**Vordefinierte Gruppen:**
- `PhysioPro Staff` (12 Mitarbeiter)
- `Pilates Trainer` (11 Mitarbeiter)
- `Verwaltung` (Oliver + Hanna)
- `Alle` (alle Mitarbeiter beider Unternehmen)

**Überlappungen möglich:**
- z.B. "PhysioPro Staff + Verwaltung"
- z.B. "Nur Hanna Wrobel"

---

## **📊 Lesestatus-Tracking**

**Admin sieht:**
- Wie viele gelesen haben: "7/12 ✅"
- Wer konkret gelesen hat + wann
- Wer noch nicht gelesen hat

**Mitarbeiter sehen:**
- Ob ihre Nachricht gelesen wurde: "✅ Gelesen"
- Zeitstempel wann Nachricht ankam

---

## **📋 Audit-Log**

**Protokolliert alle Aktionen:**
- Wer hat was erstellt
- Wer hat gelesen
- PIN-Resets
- Admin-Logins
- Nachrichtenänderungen

**Abrufbar unter:** Admin-Dashboard → "Audit-Log"

---

## **⚙️ Telefonnummern hinzufügen**

**Für WhatsApp-Benachrichtigungen:**

1. Admin → Einstellungen → Mitarbeiter-Verwaltung
2. Telefonnummern eingeben (Format: +49xxx)
3. Beim Nachrichtenversand: Checkbox "WhatsApp senden" aktivieren

---

## **🌐 Deployment (Netlify)**

**GitHub Repo:**
```
wrobeloliver2-crypto/stuff-communication
```

**Live-Site:**
```
stuff-communication.netlify.app
```

**Deploy Schritte:**
1. Code auf GitHub pushen
2. Netlify verbindet sich automatisch
3. `npm run build` läuft automatisch
4. Site ist online!

---

## **💾 Datenspeicherung**

**Aktuell:** localStorage (Browser-Speicher)
- ✅ Offline-Nutzung möglich
- ✅ Daten bleiben lokal
- ⚠️ Keine Cloud-Backup

**Später optional:** Google Sheets Integration
- Alle Daten in Google Sheets
- Automatische Backups
- Mehrere Geräte synchronisiert

---

## **🔐 Sicherheit**

- ✅ PIN-Schutz für Mitarbeiter
- ✅ Email + Passwort für Admin
- ✅ Audit-Log für Compliance
- ✅ Nichts wird gelöscht (nur archiviert)
- ✅ localStorage ist lokal (keine Online-Speicherung)

---

## **📱 WhatsApp-Integration (Optional)**

**Für persönliche Nachrichten:**
1. Mitarbeiter-Telefonnummern eingeben
2. Nachricht erstellen
3. Checkbox: "[x] WhatsApp-Benachrichtigung"
4. System versendet: "Hey [Name], neue persönliche Nachricht. Link: [PIN-Link]"

**Anbieter:** Twilio (später konfigurierbar)
**Kosten:** ~€0,01–0,05 pro Nachricht

---

## **🎯 Nächste Schritte**

- [ ] App testen (Admin + Mitarbeiter Login)
- [ ] Mitarbeiter-Telefonnummern sammeln (für WhatsApp)
- [ ] Google Sheets Sync konfigurieren (wenn Cloud-Backup gewünscht)
- [ ] Live auf Netlify deployen
- [ ] Mitarbeiter mit PIN vertraut machen
- [ ] Erste Nachrichten versenden

---

## **❓ FAQ**

**F: Können Mitarbeiter Nachrichten schreiben?**  
A: Nein, nur Admin. Mitarbeiter lesen nur.

**F: Wie lange werden Nachrichten gespeichert?**  
A: Unbegrenzt. Sie können manuell archiviert werden.

**F: Funktioniert das offline?**  
A: Ja, localStorage funktioniert offline. Aber neuen Nachrichten brauchen Internet.

**F: Kann ich Nachrichten editieren nach dem Versand?**  
A: Derzeit nein. Neue Nachricht versenden ist einfacher.

**F: Sind Daten sicher?**  
A: Ja. localStorage ist lokal auf dem Gerät. Audit-Log protokolliert alles.

---

## **📞 Support**

Bei Fragen oder Problemen: Oliver oder Hanna kontaktieren.

---

**Version:** 1.0.0  
**Projekt:** Stuff Communication  
**Unternehmen:** PhysioPro Lübeck + Pilates Company  
**Stand:** Juni 2026
