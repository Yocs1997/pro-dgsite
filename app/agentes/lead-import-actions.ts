"use server";

import { getSession } from "./_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { listLocalContacts } from "@/app/lib/server/contacts";
import { ensureLeadKeys, saveLeads, undoLeadImport } from "@/app/lib/server/insurance";
import { alreadyLeads, contactName, groupsFor, leadFrom } from "@/app/lib/server/contact-leads";
import { SERVICES } from "./seguros/status";

// Contacts → Leads. Turns the people in one or more contact lists into leads, once each:
// - two contacts with the same email or the same phone (last 10 digits) become ONE lead;
// - anyone whose email or phone already belongs to a lead is skipped.
// No Telegram alerts, no emails, no sequences: the leads just appear in Leads → "Lista".
// Each import gets an id so it can be undone (only leads nobody has worked yet).

async function requireAdmin() {
  const u = await getSession();
  if (!u || u.role !== "admin") throw new Error("No autorizado");
  return u;
}
const failure = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Error inesperado" });

/** The contact lists with how many people are in each. */
export async function contactListsForImport() {
  try {
    await requireAdmin();
    if (!dbReady()) return { ok: false as const, error: "La base de datos no está configurada." };
    const counts = new Map<string, number>();
    for (const c of await listLocalContacts()) for (const s of c.segments) counts.set(s, (counts.get(s) ?? 0) + 1);
    return { ok: true as const, lists: [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (e) {
    return failure(e);
  }
}

/** What an import of these lists would do, before doing it. */
export async function previewContactImport(lists: string[]) {
  try {
    await requireAdmin();
    if (!dbReady()) return { ok: false as const, error: "La base de datos no está configurada." };
    if (!lists?.length) return { ok: false as const, error: "Elige al menos una lista." };
    await ensureLeadKeys();
    const groups = await groupsFor(lists);
    const taken = await alreadyLeads(groups);
    const fresh = groups.filter((_, i) => !taken[i]);
    const contacts = groups.reduce((n, g) => n + g.contacts.length, 0);
    return {
      ok: true as const,
      contacts,
      merged: contacts - groups.length, // extra contacts folded into someone else (same email or phone)
      already: taken.filter(Boolean).length,
      toCreate: fresh.length,
      total: groups.length,
      sample: fresh.slice(0, 8).map((g) => contactName(g.contacts[0]) || g.emails[0]),
      mergedSample: groups
        .filter((g) => g.contacts.length > 1)
        .slice(0, 5)
        .map((g) => g.contacts.map((c) => contactName(c) || c.email).join(" = ")),
    };
  } catch (e) {
    return failure(e);
  }
}

const CHUNK = 250;

/**
 * Creates the leads for one chunk of people (the page calls it until `next` is null).
 * The order of people is fixed, and each chunk checks again for existing leads, so running
 * it twice never makes a second copy.
 */
export async function importContactsAsLeads(lists: string[], service: string, batch: string, offset: number) {
  try {
    await requireAdmin();
    if (!dbReady()) return { ok: false as const, error: "La base de datos no está configurada." };
    if (!/^[a-z0-9-]{6,40}$/i.test(batch)) return { ok: false as const, error: "Importación inválida." };
    const svc = SERVICES.some(([v]) => v === service) ? service : "";
    await ensureLeadKeys();
    const groups = await groupsFor(lists);
    const start = Math.max(0, Math.floor(Number(offset) || 0));
    const part = groups.slice(start, start + CHUNK);
    const taken = await alreadyLeads(part);
    const created = await saveLeads(
      part.filter((_, i) => !taken[i]).map((g) => leadFrom(g, svc, batch)),
      batch
    );
    const next = start + CHUNK < groups.length ? start + CHUNK : null;
    return { ok: true as const, created, skipped: taken.filter(Boolean).length, next, total: groups.length };
  } catch (e) {
    return failure(e);
  }
}

/** Removes the leads an import created, except the ones somebody already worked on. */
export async function undoContactImport(batch: string) {
  try {
    await requireAdmin();
    if (!/^[a-z0-9-]{6,40}$/i.test(batch)) return { ok: false as const, error: "Importación inválida." };
    return { ok: true as const, ...(await undoLeadImport(batch)) };
  } catch (e) {
    return failure(e);
  }
}
