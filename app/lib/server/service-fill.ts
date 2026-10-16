import "server-only";
import { ensureLeadKeys, emailKey, getLeads, leadIdsFor, phoneKey, setLeadServices } from "./insurance";
import { setContactServices } from "./contacts";
import { leadService, productLabel } from "@/app/lib/lead-service";
import { isEmail } from "@/app/seguros/model";

// Fills in the service a person asked for (e.g. "placas de virginia") on the portal's leads and
// contacts, from a list made in another system (Orion): one line per person,
// "email;phone;service" (phone = 10 digits, either may be empty; several services comma-separated).
// Leads are matched by email or phone, contacts by email. By default only empty services are filled.

export type FillRow = { email: string; phone: string; service: string };

const SERVICE_PART = /^[a-záéíóúñü ]{3,40}$/;

/** Reads the list; lines that can't be used are counted, not fatal. */
export function parseServiceList(text: string): { rows: FillRow[]; skipped: number } {
  const rows: FillRow[] = [];
  let skipped = 0;
  for (const line of String(text ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [e = "", p = "", s = ""] = line.split(";");
    const email = isEmail(e.trim()) ? emailKey(e) : "";
    const ph = phoneKey(p);
    const phone = ph && !/^(\d)\1{9}$/.test(ph) ? ph : ""; // 0000000000 and the like match nobody real
    const parts = s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    if ((!email && !phone) || !parts.length || !parts.every((x) => SERVICE_PART.test(x))) {
      skipped++;
      continue;
    }
    rows.push({ email, phone, service: Array.from(new Set(parts)).join(", ") });
  }
  return { rows, skipped };
}

export type FillPlan = {
  rows: number;
  skipped: number;
  leadsMatched: number;
  leadsToChange: number;
  leadsKept: number; // already had a service (left alone unless overwrite)
  contactsFound: number;
  contactsToChange: number;
  sample: { code: string; name: string; from: string; to: string }[];
};

/** What the list would change (and changes it when `apply`). */
export async function fillServices(rows: FillRow[], skipped: number, overwrite: boolean, apply: boolean): Promise<FillPlan> {
  await ensureLeadKeys();
  const found = await leadIdsFor(rows.map((r) => r.email), rows.map((r) => r.phone));
  const wanted = new Map<string, string>(); // lead id -> service (first line that names the lead wins)
  rows.forEach((r, i) => {
    for (const id of [found.emails[i], found.phones[i]]) if (id && !wanted.has(id)) wanted.set(id, r.service);
  });

  const leads = await getLeads([...wanted.keys()]);
  const change = new Map<string, string>();
  const sample: FillPlan["sample"] = [];
  let kept = 0;
  for (const l of leads) {
    const now = leadService(l);
    const to = wanted.get(l.id)!;
    if (now === to) continue;
    if (now && !overwrite) {
      kept++;
      continue;
    }
    change.set(l.id, to);
    if (sample.length < 10)
      sample.push({
        code: l.code,
        name: [l.driver?.firstName, l.driver?.lastName].filter(Boolean).join(" ") || l.driver?.email || "",
        from: now ? productLabel(now, "es") : "(sin servicio)",
        to: productLabel(to, "es"),
      });
  }
  if (apply && change.size) await setLeadServices(change);

  const byEmail = new Map<string, string>();
  for (const r of rows) if (r.email && !byEmail.has(r.email)) byEmail.set(r.email, r.service);
  const contacts = await setContactServices(byEmail, overwrite, apply);

  return {
    rows: rows.length,
    skipped,
    leadsMatched: leads.length,
    leadsToChange: change.size,
    leadsKept: kept,
    contactsFound: contacts.found,
    contactsToChange: contacts.changed,
    sample,
  };
}
