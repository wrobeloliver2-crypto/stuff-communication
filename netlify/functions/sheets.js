const { google } = require('googleapis');

const getSheets = () => {
  const credentials = JSON.parse(process.env.GCS_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
};

const SHEET_ID = process.env.GCS_SHEETS_ID;

const readSheet = async (sheet, range) => {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${sheet}!${range}`,
  });
  return res.data.values || [];
};

const writeSheet = async (sheet, range, values) => {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheet}!${range}`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
};

const appendRow = async (sheet, values) => {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${sheet}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
};

const clearAndWrite = async (sheet, values) => {
  const sheets = getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${sheet}!A1:Z10000`,
  });
  if (values.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${sheet}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
};

module.exports = { readSheet, writeSheet, appendRow, clearAndWrite, getSheets, SHEET_ID };
