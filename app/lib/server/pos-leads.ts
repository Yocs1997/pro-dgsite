import "server-only";
import { db, listRecords } from "./redis";

// Leads for billing systems in Nicaragua (Meta Instant Forms on the Pro-DG page).
// Kept apart from insurance: own inbox (/agentes/facturacion), own Telegram group,
// no emails — follow-up is by WhatsApp / phone.

export const POS_STATUSES = ["nueva", "contactada", "cotizada", "cerrada", "perdida"] as const;
export type PosStatus = (typeof POS_STATUSES)[number];

export type PosLead = {
  id: string;
  number: number;
  code: string; // FAC-0001
  createdAt: number;
  updatedAt: number;
  status: PosStatus;
  name: string;
  business: string;
  city: string;
  phone: string;
  email: string;
  extra: string[]; // other answers, "Question: answer"
  metaLeadId?: string;
  quoteCode?: string; // set when a quote is created from this lead
};

const KEY = (id: string) => `pdg:pos:${id}`;
const INDEX = "pdg:pos";
const SEQ = "pdg:pos:seq";

export const posCode = (n: number) => `FAC-${String(n).padStart(4, "0")}`;

export async function savePosLead(data: Omit<PosLead, "id" | "number" | "code">): Promise<PosLead> {
  const [seq] = await db([["INCR", SEQ]]);
  const number = Number(seq);
  const id = `${data.createdAt.toString(36)}-${number}`;
  const lead: PosLead = { ...data, id, number, code: posCode(number) };
  await db([
    ["SET", KEY(id), JSON.stringify(lead)],
    ["ZADD", INDEX, data.createdAt, id],
  ]);
  return lead;
}

export const listPosLeads = (limit = 500) => listRecords<PosLead>(INDEX, KEY, limit);

export async function getPosLead(id: string): Promise<PosLead | null> {
  const [raw] = (await db([["GET", KEY(id)]])) as [string | null];
  return raw ? (JSON.parse(raw) as PosLead) : null;
}

export async function updatePosLead(id: string, patch: Partial<Pick<PosLead, "status" | "quoteCode">>): Promise<PosLead | null> {
  const lead = await getPosLead(id);
  if (!lead) return null;
  const next: PosLead = { ...lead, ...patch, updatedAt: Date.now() };
  await db([["SET", KEY(id), JSON.stringify(next)]]);
  return next;
}

export async function deletePosLead(id: string) {
  await db([["DEL", KEY(id)], ["ZREM", INDEX, id]]);
}

/** Full international number (digits only) for WhatsApp / tel links: 8-digit numbers are
 *  Nicaraguan (+505), 10-digit ones are US/Canada (+1); anything else is used as given. */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 8) return `505${d}`;
  if (d.length === 10) return `1${d}`;
  return d;
}
