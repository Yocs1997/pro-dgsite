import { leadService } from "@/app/lib/lead-service";
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
  licensePhotos?: number; // how many license photos are stored (0–2)
  source?: "web" | "meta"; // missing = the /seguros form
  metaLeadId?: string; // Meta lead ads: the leadgen id
  service?: string; // Meta form "which service" answer ("placas de virginia"); kept apart from the editable notes
};

const KEY = (id: string) => `pdg:ins:${id}`;
const INDEX = "pdg:ins";
const SEQ = "pdg:ins:seq";
const PHOTO = (id: string, n: number) => `pdg:ins:lic:${id}:${n}`;

export const insCode = (n: number) => `SEG-${String(n).padStart(4, "0")}`;

export async function saveLead(data: Omit<InsuranceLead, "id" | "number" | "code">): Promise<InsuranceLead> {
  const [seq] = await db([["INCR", SEQ]]);
  const number = Number(seq);
  const id = `${data.createdAt.toString(36)}-${number}`;
  const lead: InsuranceLead = { ...data, id, number, code: insCode(number) };
  await db([
    ["SET", KEY(id), JSON.stringify(lead)],
    ["ZADD", INDEX, data.createdAt, id],
  ]);
  return lead;
}

export const listLeads = (limit = 300) => listRecords<InsuranceLead>(INDEX, KEY, limit);

export async function setLeadStatus(id: string, status: InsStatus) {
  const [raw] = (await db([["GET", KEY(id)]])) as [string | null];
  if (!raw) return;
  const lead = JSON.parse(raw) as InsuranceLead;
  lead.status = status;
  lead.updatedAt = Date.now();
  await db([["SET", KEY(id), JSON.stringify(lead)]]);
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
  await db([["SET", KEY(id), JSON.stringify(next)]]);
  return next;
}

export async function deleteLead(id: string) {
  await db([["DEL", KEY(id), PHOTO(id, 0), PHOTO(id, 1)], ["ZREM", INDEX, id]]);
}

export async function saveLicensePhotos(id: string, photos: string[]) {
  if (!photos.length) return;
  await db(photos.map((p, i) => ["SET", PHOTO(id, i), p]));
}

export async function getLicensePhoto(id: string, n: number): Promise<string | null> {
  const [raw] = (await db([["GET", PHOTO(id, n)]])) as [string | null];
  return raw;
}
