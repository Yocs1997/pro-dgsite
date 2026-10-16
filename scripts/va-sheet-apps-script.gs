// Apps Script for the "VA Cash Out Leads - Stars & Stripes" Google Sheet.
// Receives the VA leads from the site (app/lib/server/va-sheet.ts) and keeps one row per lead.
//
// Setup (once): in the Sheet, Extensions → Apps Script, paste this file, put the same secret
// here and in Vercel (VA_SHEET_SECRET), then Deploy → New deployment → Web app,
// "Execute as: Me", "Who has access: Anyone". Copy the /exec URL to Vercel (VA_SHEET_WEBHOOK_URL).
// "Anyone" only means the URL can be called; nothing is written without the secret.
//
// Outcome dropdown (Sheet → portal): run setup() once from the editor (▶ Run). It adds the
// dropdown to the Outcome column and an "on edit" trigger that sends each pick to the site
// (/api/va/sheet). Only the Outcome column goes back; other columns are rewritten by the
// portal on the lead's next update, so change everything else in the portal.

const SECRET = "PUT-THE-SECRET-HERE";
const SITE = "https://www.pro-dg.com/api/va/sheet";

// Same labels as VA_DISPOSITIONS in app/va-cash-out/model.ts.
const OUTCOMES = [
  "Contacted", "No answer", "Left voicemail", "Call back later", "Appointment set", "Sent to loan officer",
  "Application started", "Closed / funded", "Not interested", "Not qualified", "Wrong number", "Do not contact",
];

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

// ─── Outcome dropdown → portal ───────────────────────────────────────────────

/** Run once: dropdown on the Outcome column + the trigger that sends edits to the portal. */
function setup() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const col = HEADERS.indexOf("Outcome") + 1;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(OUTCOMES, true).setAllowInvalid(false).build();
  sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  for (const t of ScriptApp.getProjectTriggers()) if (t.getHandlerFunction() === "onOutcomeEdit") ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger("onOutcomeEdit").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  SpreadsheetApp.getActive().toast("Outcome dropdown is ready. Picks now update the portal.", "VA leads", 8);
}

function onOutcomeEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getIndex() !== 1) return;
  const col = HEADERS.indexOf("Outcome") + 1;
  if (range.getColumn() > col || range.getLastColumn() < col || range.getLastRow() < 2) return;
  const idCol = HEADERS.indexOf("ID") + 1;
  const first = Math.max(2, range.getRow());
  const n = range.getLastRow() - first + 1;
  const outcomes = sheet.getRange(first, col, n, 1).getValues();
  const ids = sheet.getRange(first, idCol, n, 1).getValues();
  const by = (e.user && e.user.getEmail && e.user.getEmail()) || "";
  const failed = [];
  for (let i = 0; i < n; i++) {
    const id = String(ids[i][0] || "");
    if (!id) continue;
    const res = UrlFetchApp.fetch(SITE, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ secret: SECRET, id: id, outcome: String(outcomes[i][0] || ""), by: by }),
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) failed.push(first + i);
  }
  if (failed.length) SpreadsheetApp.getActive().toast("Couldn't update the portal for row(s) " + failed.join(", ") + ". Try again or set it in the portal.", "VA leads", 10);
}
