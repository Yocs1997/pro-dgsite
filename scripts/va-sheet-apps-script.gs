// Apps Script for the "VA Cash Out Leads - Stars & Stripes" Google Sheet.
// Receives the VA leads from the site (app/lib/server/va-sheet.ts) and keeps one row per lead.
//
// Setup (once): in the Sheet, Extensions → Apps Script, paste this file, put the same secret
// here and in Vercel (VA_SHEET_SECRET), then Deploy → New deployment → Web app,
// "Execute as: Me", "Who has access: Anyone". Copy the /exec URL to Vercel (VA_SHEET_WEBHOOK_URL).
// "Anyone" only means the URL can be called; nothing is written without the secret.

const SECRET = "PUT-THE-SECRET-HERE";

// Same order as VA_SHEET_HEADERS in app/lib/server/va-sheet.ts.
const HEADERS = [
  "Lead", "Created", "Updated", "Status", "Outcome", "Outcome by", "Name", "Phone", "Email", "Age", "State",
  "Served", "Owns home", "Wants cash out", "Ruled out by", "Asked for call back",
  "Campaign", "Ad set", "Ad", "Placement", "Source", "Latest note", "ID",
];

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Text that starts with = + - @ would run as a formula in Sheets; keep it as plain text.
function safe(v) {
  return typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: "bad request" });
  }
  if (body.secret !== SECRET) return reply({ ok: false, error: "forbidden" });

  // One request at a time, so two quick updates of the same lead never make two rows.
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    const idCol = HEADERS.indexOf("ID") + 1;
    const last = sheet.getLastRow();
    const ids = last > 1 ? sheet.getRange(2, idCol, last - 1, 1).getValues().map((r) => String(r[0])) : [];

    if (body.action === "delete") {
      const i = ids.indexOf(String(body.id));
      if (i >= 0) sheet.deleteRow(i + 2);
      return reply({ ok: true });
    }

    const row = body.row || {};
    const i = ids.indexOf(String(row.ID));
    if (i >= 0) {
      // Updates can arrive out of order: never replace a newer version with an older one.
      const current = sheet.getRange(i + 2, HEADERS.indexOf("Updated") + 1).getValue();
      if (current instanceof Date && current.getTime() > Number(row.Updated)) return reply({ ok: true, skipped: true });
    }
    const values = HEADERS.map((h) => (h === "Created" || h === "Updated" ? new Date(Number(row[h])) : safe(row[h] === undefined ? "" : row[h])));
    if (i >= 0) sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([values]);
    else sheet.appendRow(values);
    return reply({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
