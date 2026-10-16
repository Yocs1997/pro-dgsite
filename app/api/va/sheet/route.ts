import { timingSafeEqual } from "node:crypto";
import { dbReady } from "@/app/lib/server/redis";
import { getVaLead, saveVaLead } from "@/app/lib/server/va-leads";
import { VA_DISPOSITIONS } from "@/app/va-cash-out/model";

// Outcomes picked in the Google Sheet's "Outcome" dropdown come back here, so the portal and
// the Sheet stay the same (the Apps Script's onOutcomeEdit trigger calls this; see
// scripts/va-sheet-apps-script.gs). Same secret as the site → Sheet direction.

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

function validSecret(given: unknown): boolean {
  const secret = process.env.VA_SHEET_SECRET;
  if (!secret || typeof given !== "string") return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { secret?: string; id?: string; outcome?: string; by?: string } | null;
  if (!validSecret(body?.secret)) return json({ ok: false, error: "forbidden" }, 403);
  if (!dbReady()) return json({ ok: false, error: "database not connected" }, 503);

  // The Sheet sends the label shown in the dropdown ("Appointment set"); "" clears it.
  const label = String(body?.outcome ?? "").trim();
  const key = label ? VA_DISPOSITIONS.find(([, l]) => l.toLowerCase() === label.toLowerCase())?.[0] : "";
  if (key === undefined) return json({ ok: false, error: `Unknown outcome "${label.slice(0, 40)}"` }, 400);

  const lead = await getVaLead(String(body?.id ?? "").slice(0, 40));
  if (!lead) return json({ ok: false, error: "lead not found" }, 404);

  const now = Date.now();
  const by = `Sheet${body?.by ? ` (${String(body.by).slice(0, 80)})` : ""}`;
  Object.assign(lead, { disposition: key || undefined, dispositionAt: key ? now : undefined, dispositionBy: key ? by : undefined, updatedAt: now });
  await saveVaLead(lead); // also rewrites the Sheet row, so "Outcome by" shows who set it
  return json({ ok: true, code: lead.code });
}
