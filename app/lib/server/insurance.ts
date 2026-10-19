import { leadService } from "@/app/lib/lead-service";
import { applyNote, type FollowUp, type LeadNote } from "@/app/lib/lead-notes";
import "server-only";
import { db, listRecords } from "./redis";
import type { InsuranceInput } from "@/app/seguros/model";

export const INS_STATUSES = ["nueva", "cotizando", "enviada", "vendida", "perdida"] as const;
export type InsStatus = (typeof INS_STATUSES)[number];

export type InsuranceLead = Omit<InsuranceInput, "consent" | "website" | "licensePhotos"> & {
  id: string;
  number: number;
  code: string;
  createdAt: number;
  updatedAt: number;
  status: InsStatus;
  consentAt: number;
  licensePhotos?: number; // how many photos are stored (0–2 license photos; up to 4 documents on the tags form)
  photoLabels?: string[]; // tags form: what each photo is ("ID", "Título (frente)"…); missing = license front / back
  source?: "web" | "meta" | "manual" | "tags" | "contacts"; // missing = the /seguros form; "manual" = added by hand; "tags" = the /tags form; "contacts" = made from the contact lists
  importBatch?: string; // "contacts" leads: the import that created them (so it can be undone)
  lists?: string[]; // "contacts" leads: the contact lists the person was in
  metaLeadId?: string; // Meta lead ads: the leadgen id
  addedBy?: string; // manual leads: portal user who added it
  channel?: string; // manual leads: how they reached us (llamada, whatsapp, en persona…)
  statusAt?: Partial<Record<InsStatus, number>>; // first time each status was reached (leads changed after Oct 2026)
  log?: LeadNote[]; // call log / notes, oldest first
  followUp?: FollowUp; // pending "volver a llamar"
  service?: string; // Meta form "which service" answer ("placas de virginia"); kept apart from the editable notes
};

const KEY = (id: string) => `pdg:ins:${id}`;
const INDEX = "pdg:ins";
const SEQ = "pdg:ins:seq";
const PHOTO = (id: string, n: number) => `pdg:ins:lic:${id}:${n}`;

// ─── Contact keys (find a lead by email or phone, to avoid duplicates) ──────────
// pdg:ins:byemail  email (lowercase)        -> lead id
// pdg:ins:byphone  last 10 digits of phone  -> lead id
// Built once from the existing leads (pdg:ins:keys:v1 marks it done), then kept up to date
// on every save, edit and delete.
const BY_EMAIL = "pdg:ins:byemail";
const BY_PHONE = "pdg:ins:byphone";
const KEYS_BUILT = "pdg:ins:keys:v1";
const BATCH = (b: string) => `pdg:ins:batch:${b}`;

export const emailKey = (e?: string) => (e ?? "").trim().toLowerCase();
/** Last 10 digits (US numbers with or without the 1); "" when too short to trust. */
export const phoneKey = (p?: string) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
};

const keyCmds = (l: Pick<InsuranceLead, "id" | "driver">): (string | number)[][] => {
  const cmds: (string | number)[][] = [];
  const e = emailKey(l.driver?.email);
  const p = phoneKey(l.driver?.phone);
  if (e) cmds.push(["HSET", BY_EMAIL, e, l.id]);
  if (p) cmds.push(["HSET", BY_PHONE, p, l.id]);
  return cmds;
};

/** Fills the lookup from the existing leads the first time it's needed. */
export async function ensureLeadKeys() {
  const [built] = (await db([["EXISTS", KEYS_BUILT]])) as [number];
  if (Number(built) === 1) return;
  const all = await listLeads(100_000);
  const cmds = all.flatMap(keyCmds);
  for (let i = 0; i < cmds.length; i += 400) await db(cmds.slice(i, i + 400));
  await db([["SET", KEYS_BUILT, "1"]]);
}

/** Which of these emails / phone keys already belong to a lead (lead id for each, or null). */
export async function leadIdsFor(emails: string[], phones: string[]): Promise<{ emails: (string | null)[]; phones: (string | null)[] }> {
  const get = async (hash: string, keys: string[]) => {
    const out: (string | null)[] = [];
    for (let i = 0; i < keys.length; i += 500) {
      const part = keys.slice(i, i + 500);
      if (!part.length) continue;
      const [res] = (await db([["HMGET", hash, ...part]])) as [(string | null)[]];
      out.push(...(res ?? part.map(() => null)));
    }
    return out;
  };
  return { emails: await get(BY_EMAIL, emails), phones: await get(BY_PHONE, phones) };
}

export const insCode = (n: number) => `SEG-${String(n).padStart(4, "0")}`;

export async function saveLead(data: Omit<InsuranceLead, "id" | "number" | "code">): Promise<InsuranceLead> {
  const [seq] = await db([["INCR", SEQ]]);
  const number = Number(seq);
  const id = `${data.createdAt.toString(36)}-${number}`;
  const lead: InsuranceLead = { ...data, id, number, code: insCode(number) };
  await db([["SET", KEY(id), JSON.stringify(lead)], ["ZADD", INDEX, data.createdAt, id], ...keyCmds(lead)]);
  return lead;
}

/** Saves many leads at once (imports). No notifications or emails. */
export async function saveLeads(list: Omit<InsuranceLead, "id" | "number" | "code">[], batch?: string): Promise<InsuranceLead[]> {
  if (!list.length) return [];
  const [last] = await db([["INCRBY", SEQ, list.length]]);
  const first = Number(last) - list.length + 1;
  const leads = list.map((data, i) => {
    const number = first + i;
    const id = `${data.createdAt.toString(36)}-${number}`;
    return { ...data, id, number, code: insCode(number) } as InsuranceLead;
  });
  for (let i = 0; i < leads.length; i += 100) {
    const part = leads.slice(i, i + 100);
    await db(
      part.flatMap((l) => [
        ["SET", KEY(l.id), JSON.stringify(l)],
        ["ZADD", INDEX, l.createdAt, l.id],
        ...keyCmds(l),
        ...(batch ? [["SADD", BATCH(batch), l.id]] : []),
      ])
    );
  }
  if (batch) await db([["EXPIRE", BATCH(batch), 30 * 24 * 3600]]);
  return leads;
}

/** Undoes an import: deletes its leads that nobody has worked yet (still "nueva", no notes). */
export async function undoLeadImport(batch: string): Promise<{ removed: string[]; kept: number }> {
  const [ids] = (await db([["SMEMBERS", BATCH(batch)]])) as [string[]];
  const removed: string[] = [];
  let kept = 0;
  for (const id of ids ?? []) {
    const lead = await getLead(id);
    if (!lead) continue;
    if (lead.status !== "nueva" || lead.log?.length || lead.followUp) {
      kept++;
      continue;
    }
    await deleteLead(id);
    removed.push(id);
  }
  if (!kept) await db([["DEL", BATCH(batch)]]);
  return { removed, kept };
}

/** Newest first. Without a limit it reads every lead. */
export const listLeads = (limit = 100_000) => listRecords<InsuranceLead>(INDEX, KEY, limit);

const NEW_COUNT = "pdg:ins:newcount";
/** How many leads are still "nueva" (the menu badge). Kept for a minute so every page view doesn't read all leads. */
export async function countNewLeads(): Promise<number> {
  const [cached] = (await db([["GET", NEW_COUNT]])) as [string | null];
  if (cached !== null && cached !== undefined) return Number(cached) || 0;
  const n = (await listLeads()).filter((l) => l.status === "nueva").length;
  await db([["SET", NEW_COUNT, String(n), "EX", 60]]);
  return n;
}

export async function setLeadStatus(id: string, status: InsStatus) {
  const [raw] = (await db([["GET", KEY(id)]])) as [string | null];
  if (!raw) return;
  const lead = JSON.parse(raw) as InsuranceLead;
  const now = Date.now();
  if (lead.status !== status) {
    lead.statusAt = { ...(lead.statusAt ?? {}) };
    lead.statusAt[status] ??= now;
  }
  lead.status = status;
  lead.updatedAt = now;
  await db([["SET", KEY(id), JSON.stringify(lead)]]);
}

/** Many leads at once (missing ones are left out). */
export async function getLeads(ids: string[]): Promise<InsuranceLead[]> {
  const out: InsuranceLead[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    const [raw] = (await db([["MGET", ...ids.slice(i, i + 300).map(KEY)]])) as [(string | null)[]];
    for (const r of raw ?? []) if (r) out.push(JSON.parse(r) as InsuranceLead);
  }
  return out;
}

/** Sets the service on these leads (lead id -> service), keeping everything else. */
export async function setLeadServices(services: Map<string, string>) {
  const leads = await getLeads([...services.keys()]);
  const now = Date.now();
  for (let i = 0; i < leads.length; i += 200) {
    await db(leads.slice(i, i + 200).map((l) => ["SET", KEY(l.id), JSON.stringify({ ...l, service: services.get(l.id), updatedAt: now })]));
  }
}

export async function getLead(id: string): Promise<InsuranceLead | null> {
  const [raw] = (await db([["GET", KEY(id)]])) as [string | null];
  return raw ? (JSON.parse(raw) as InsuranceLead) : null;
}

/** Replaces the editable parts of a lead (already sanitized). */
export async function updateLead(id: string, patch: Partial<Pick<InsuranceLead, "driver" | "extraDrivers" | "vehicles" | "coverage" | "status">>) {
  const lead = await getLead(id);
  if (!lead) return null;
  const next: InsuranceLead = { ...lead, ...patch, updatedAt: Date.now() };
  // Older leads only have the service inside their notes: keep it before the notes change.
  if (lead.service === undefined) next.service = leadService(lead);
  await db([["SET", KEY(id), JSON.stringify(next)], ...(await dropKeys(lead, next)), ...keyCmds(next)]);
  return next;
}

export async function addLeadNote(id: string, note: LeadNote) {
  const lead = await getLead(id);
  if (!lead) return null;
  const next: InsuranceLead = { ...applyNote(lead, note), updatedAt: Date.now() };
  await db([["SET", KEY(id), JSON.stringify(next)]]);
  return next;
}

/** The call back was made (or is no longer needed). */
export async function clearLeadFollowUp(id: string) {
  const lead = await getLead(id);
  if (!lead) return null;
  const next: InsuranceLead = { ...lead, updatedAt: Date.now() };
  delete next.followUp;
  await db([["SET", KEY(id), JSON.stringify(next)]]);
  return next;
}

export async function deleteLead(id: string) {
  const lead = await getLead(id);
  await db([["DEL", KEY(id), ...[0, 1, 2, 3].map((n) => PHOTO(id, n))], ["ZREM", INDEX, id], ...(lead ? await dropKeys(lead) : [])]);
}

/** Removes this lead's email / phone from the lookup (only where they still point to it). */
async function dropKeys(old: InsuranceLead, next?: InsuranceLead): Promise<(string | number)[][]> {
  const e = emailKey(old.driver?.email);
  const p = phoneKey(old.driver?.phone);
  const cmds: (string | number)[][] = [];
  const [byE, byP] = (await db([["HGET", BY_EMAIL, e || "-"], ["HGET", BY_PHONE, p || "-"]])) as [string | null, string | null];
  if (e && byE === old.id && e !== emailKey(next?.driver?.email)) cmds.push(["HDEL", BY_EMAIL, e]);
  if (p && byP === old.id && p !== phoneKey(next?.driver?.phone)) cmds.push(["HDEL", BY_PHONE, p]);
  return cmds;
}

export async function saveLicensePhotos(id: string, photos: string[]) {
  if (!photos.length) return;
  await db(photos.map((p, i) => ["SET", PHOTO(id, i), p]));
}

export async function getLicensePhoto(id: string, n: number): Promise<string | null> {
  const [raw] = (await db([["GET", PHOTO(id, n)]])) as [string | null];
  return raw;
}
