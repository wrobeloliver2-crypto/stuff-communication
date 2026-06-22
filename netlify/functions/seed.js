const { sheetsGet, sheetsClear, sheetsUpdate } = require('./sheets_light');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const NEWS = [
  {
    id: 'n_willkommen_nico', firm: 'physio', category: 'Ankündigungen',
    title: 'Herzlich willkommen, Nico!',
    text: 'Wir freuen uns, Nico Neumann in unserem Team bei PhysioPro Lübeck begrüßen zu dürfen. Nico verstärkt ab sofort unser PhysioPro Staff-Team. Herzlich willkommen!',
    photos: [], link: null, linkLabel: null, eventDate: null, attachment: null, created: '22.6.2026, 15:26:08'
  },
  {
    id: 'n_rezeptionsdashboard', firm: 'physio', category: 'Info',
    title: 'Das neue Rezeptionsdashboard startet heute!',
    text: 'Ab heute steht am Empfang unser neues Rezeptionsdashboard zur Verfügung. Es bietet eine übersichtliche Tagesansicht aller Termine und erleichtert die Koordination im Praxisalltag. Bei Fragen meldet euch gerne bei der Verwaltung.',
    photos: [], link: null, linkLabel: null, eventDate: null, attachment: null, created: '22.6.2026, 14:51:13'
  },
  {
    id: 'n_anfragemgmt', firm: 'physio', category: 'Info',
    title: 'PhysioPro Anfragemanagement — professionell aufgestellt für unser Wachstum',
    text: 'PhysioPro Lübeck wächst. Wir werden mehr, wir kommen weiter — und genau deshalb stellen wir uns auch dort professionell auf, wo unsere Zukunft beginnt: bei der Gewinnung neuer Patientinnen und Patienten.\n\nMit unserem eigenen Anfragemanagement bündeln wir ab sofort jede eingehende Anfrage an einer zentralen Stelle und führen sie auf einem klaren Weg von eingegangen bis erledigt. Jede Anfrage bekommt ihren festen Platz, eine eindeutige Zuständigkeit und einen nachvollziehbaren Verlauf. Nichts geht verloren, niemand wird vergessen.\n\nDas ist mehr als ein Werkzeug — es ist ein Bekenntnis dazu, wie wir arbeiten wollen: aufmerksam, verlässlich und auf der Höhe der Zeit.',
    photos: [], link: null, linkLabel: null, eventDate: null, attachment: null, created: '22.6.2026, 09:00:00'
  },
];

const EMPLOYEES = [
  { id: 'oliver', name: 'Oliver Wrobel', role: 'Verwaltung', company: 'Beide', pin: null, pinSet: false },
  { id: 'hanna', name: 'Hanna Wrobel', role: 'Verwaltung', company: 'Beide', pin: null, pinSet: false },
  { id: 'luca', name: 'Luca Malz', role: 'Verwaltung', company: 'Beide', pin: null, pinSet: false },
  { id: 'anna', name: 'Anna Bath', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'julia', name: 'Julia Mielke', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'tuana', name: 'Tuana Koyulhisarli', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'maike', name: 'Maike Schrader', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'annika', name: 'Annika Zwiener', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'finn', name: 'Finn Meyer', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'phillip', name: 'Phillip Opelka', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'imo', name: 'Imo Thomsen', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
  { id: 'nico', name: 'Nico Neumann', role: 'PhysioPro Staff', company: 'PhysioPro', pin: null, pinSet: false },
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  try {
    await sheetsClear('news');
    await sheetsUpdate('news', NEWS.map(r => [JSON.stringify(r)]));
    await sheetsClear('employees');
    await sheetsUpdate('employees', EMPLOYEES.map(r => [JSON.stringify(r)]));
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, news: NEWS.length, employees: EMPLOYEES.length }) };
  } catch(err) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
