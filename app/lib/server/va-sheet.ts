import "server-only";
import { after } from "next/server";
import { dispositionLabel, optionLabel } from "@/app/va-cash-out/model";
import type { VaLead } from "./va-leads";

// Copies every VA lead to a Google Sheet ("VA Cash Out Leads - Stars & Stripes" in Drive).
// The portal stays the main record: the Sheet is updated after the response is sent and a
// Google problem is only logged, never shown to the visitor or the team.
//
// The Sheet runs a small Apps Script web app (scripts/va-sheet-apps-script.gs) that adds or
// updates one row per lead (matched by the ID column) and deletes rows of deleted leads.
//
// Environment variables (Vercel → Settings → Environment Variables):
//   VA_SHEET_WEBHOOK_URL   the web app URL from Apps Script → Deploy (ends in /exec)
//   VA_SHEET_SECRET        the same secret written at the top of the Apps Script

export function vaSheetReady(): boolean {
  return Boolean(process.env.VA_SHEET_WEBHOOK_URL && process.env.VA_SHEET_SECRET);
}

/** Column names, in the Sheet's order. Keep in sync with HEADERS in the Apps Script. */
export const VA_SHEET_HEADERS = [
  "Lead", "Created", "Updated", "Status", "Outcome", "Outcome by", "Name", "Phone", "Email", "Age", "State",
  "Served", "Owns home", "Wants cash out", "Ruled out by", "Asked for call back",
  "Campaign", "Ad set", "Ad", "Placement", "Source", "Latest note", "ID",
] as const;

const STATUS: Record<VaLead["status"], string> = { qualified: "Qualified", disqualified: "Not qualified", partial: "Didn't finish" };
const RULED_OUT: Record<string, string> = { served: "Didn't serve", ownHome: "Doesn't own home", wantsCash: "Doesn't want cash out" };

function row(l: VaLead): Record<(typeof VA_SHEET_HEADERS)[number], string | number> {
  const t = l.tracking;
  return {
    Lead: l.code,
    Created: l.createdAt, // epoch ms; the script turns them into dates in the Sheet's time zone
    Updated: l.updatedAt,
    Status: STATUS[l.status],
    Outcome: dispositionLabel(l.disposition),
    "Outcome by": l.dispositionBy ?? "",
    Name: `${l.contact.firstName} ${l.contact.lastName}`.trim(),
    Phone: l.contact.phone,
    Email: l.contact.email,
    Age: l.contact.age,
    State: l.contact.state,
    Served: optionLabel("served", l.answers.served),
    "Owns home": optionLabel("ownHome", l.answers.ownHome),
    "Wants cash out": optionLabel("wantsCash", l.answers.wantsCash),
    "Ruled out by": (l.disqualifiedFor ?? []).map((id) => RULED_OUT[id] ?? id).join(", "),
    "Asked for call back": l.callbackRequestedAt ? "Yes" : "",
    Campaign: t.utmCampaign,
    "Ad set": t.utmTerm,
    Ad: t.utmContent,
    Placement: t.placement,
    Source: t.utmSource || (t.fbclid ? "facebook (no ad tags)" : ""),
    "Latest note": l.notes?.length ? l.notes[l.notes.length - 1].text : "",
    ID: l.id,
  };
}

async function post(body: Record<string, unknown>) {
  try {
    const res = await fetch(process.env.VA_SHEET_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, secret: process.env.VA_SHEET_SECRET }),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) console.error("[va-sheet] update failed", res.status, JSON.stringify(json)?.slice(0, 200));
  } catch (e) {
    console.error("[va-sheet] update failed", e);
  }
}

/** Runs after the response when inside a request, right away otherwise (scripts). */
function later(task: () => Promise<void>) {
  try {
    after(task);
  } catch {
    void task();
  }
}

export function syncVaLeadToSheet(lead: VaLead) {
  if (!vaSheetReady()) return;
  const r = row(lead);
  later(() => post({ action: "upsert", row: r }));
}

export function removeVaLeadFromSheet(id: string) {
  if (!vaSheetReady()) return;
  later(() => post({ action: "delete", id }));
}
