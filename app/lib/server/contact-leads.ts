import "server-only";
import { listLocalContacts, type LocalContact } from "./contacts";
import { emailKey, leadIdsFor, phoneKey, type InsuranceLead } from "./insurance";
import { sanitizeInsurance } from "./insurance-sanitize";
import { emptyCoverage, emptyDriver, type Lang } from "@/app/seguros/model";

// Contacts → Leads: who is the same person (same email or same phone, last 10 digits),
// who is already a lead, and the lead each person becomes. Used by Leads → "Importar contactos".

export type Group = { contacts: LocalContact[]; emails: string[]; phones: string[] };

/** The people in the chosen lists, grouped so one person (by email or phone) = one group, in a fixed order. */
export async function groupsFor(lists: string[]): Promise<Group[]> {
  const chosen = new Set(lists);
  const contacts = (await listLocalContacts()).filter((c) => c.segments.some((s) => chosen.has(s)));
  // Union-find over shared emails / phones.
  const parent = contacts.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const seen = new Map<string, number>();
  contacts.forEach((c, i) => {
    for (const k of [`e:${emailKey(c.email)}`, phoneKey(c.phone) ? `p:${phoneKey(c.phone)}` : ""]) {
      if (!k || k === "e:") continue;
      const j = seen.get(k);
      if (j === undefined) seen.set(k, i);
      else parent[find(i)] = find(j);
    }
  });
  const byRoot = new Map<number, LocalContact[]>();
  contacts.forEach((c, i) => byRoot.set(find(i), [...(byRoot.get(find(i)) ?? []), c]));
  return [...byRoot.values()]
    .map((cs) => ({
      contacts: cs,
      emails: Array.from(new Set(cs.map((c) => emailKey(c.email)).filter(Boolean))),
      phones: Array.from(new Set(cs.map((c) => phoneKey(c.phone)).filter(Boolean))),
    }))
    .sort((a, b) => a.emails[0].localeCompare(b.emails[0]));
}

/** True for each group whose email or phone already belongs to a lead. */
export async function alreadyLeads(groups: Group[]): Promise<boolean[]> {
  const emails = groups.flatMap((g) => g.emails);
  const phones = groups.flatMap((g) => g.phones);
  const found = await leadIdsFor(emails, phones);
  const hitE = new Set(emails.filter((_, i) => found.emails[i]));
  const hitP = new Set(phones.filter((_, i) => found.phones[i]));
  return groups.map((g) => g.emails.some((e) => hitE.has(e)) || g.phones.some((p) => hitP.has(p)));
}

export const contactName = (c: LocalContact) => [c.firstName, c.lastName].filter(Boolean).join(" ").trim();

/** One lead from one person (several contacts merged when they share an email or phone). */
export function leadFrom(g: Group, service: string, batch: string): Omit<InsuranceLead, "id" | "number" | "code"> {
  // The contact with the most details leads; the others fill what's missing.
  const score = (c: LocalContact) => [c.firstName, c.lastName, c.phone, c.state, c.vehicle, c.lang, c.insured].filter(Boolean).length;
  const [main, ...rest] = [...g.contacts].sort((a, b) => score(b) - score(a));
  const pick = <K extends keyof LocalContact>(k: K) => (main[k] || rest.find((c) => c[k])?.[k]) as LocalContact[K];
  const vehicle = String(pick("vehicle") ?? "");
  const v = vehicle.match(/^(\d{4})\s+(\S+)\s*(.*)$/);
  const lists = Array.from(new Set(g.contacts.flatMap((c) => c.segments)));
  const others = g.emails.filter((e) => e !== emailKey(main.email));
  const notes = [`Importado de la lista de contactos: ${lists.join(", ")}`, others.length ? `Otros correos: ${others.join(", ")}` : "", vehicle && !v ? `Vehículo: ${vehicle}` : ""]
    .filter(Boolean)
    .join(" · ");
  const { driver, vehicles, coverage } = sanitizeInsurance({
    driver: {
      ...emptyDriver(),
      firstName: String(pick("firstName") ?? ""),
      lastName: String(pick("lastName") ?? ""),
      email: main.email,
      phone: String(pick("phone") ?? ""),
      state: String(pick("state") ?? ""),
    },
    vehicles: v ? [{ year: v[1], make: v[2], model: v[3], vin: "", ownership: "", use: "", miles: "" }] : [],
    coverage: { ...emptyCoverage(), insured: String(pick("insured") ?? ""), notes, contactPref: "email" },
  });
  Object.assign(driver, { accidents: "", tickets: "", sr22: "" });
  const added = Math.min(...g.contacts.map((c) => c.addedAt || Date.now()));
  const lang: Lang = pick("lang") === "es" ? "es" : "en";
  return {
    lang,
    driver,
    extraDrivers: [],
    vehicles,
    coverage,
    createdAt: added,
    updatedAt: Date.now(),
    status: "nueva",
    consentAt: added,
    licensePhotos: 0,
    source: "contacts",
    service,
    importBatch: batch,
    lists,
  };
}

