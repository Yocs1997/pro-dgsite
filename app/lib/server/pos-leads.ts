import "server-only";
import { db, listRecords } from "./redis";

// Leads for billing systems in Nicaragua (Meta Instant Forms on the Pro-DG page).
// Kept apart from insurance: own inbox (/agentes/facturacion), own Telegram group,
// no emails — follow-up is by WhatsApp / phone. Admins can assign a lead to an
// agent; agents only see the leads assigned to them.

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
  assignedTo?: { u: string; name: string };
  assignedAt?: number;
  statusAt?: Partial<Record<PosStatus, number>>; // first time each status was reached
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

export const listPosLeads = (limit = 1000) => listRecords<PosLead>(INDEX, KEY, limit);

export async function getPosLead(id: string): Promise<PosLead | null> {
  const [raw] = (await db([["GET", KEY(id)]])) as [string | null];
  return raw ? (JSON.parse(raw) as PosLead) : null;
}

type Patch = Partial<Pick<PosLead, "status" | "quoteCode">> & { assignedTo?: PosLead["assignedTo"] | null };

export async function updatePosLead(id: string, patch: Patch): Promise<PosLead | null> {
  const lead = await getPosLead(id);
  if (!lead) return null;
  const now = Date.now();
  const next: PosLead = { ...lead, updatedAt: now };
  if (patch.quoteCode) next.quoteCode = patch.quoteCode;
  if (patch.status && patch.status !== lead.status) {
    next.status = patch.status;
    next.statusAt = { ...(lead.statusAt ?? {}) };
    next.statusAt[patch.status] ??= now;
  }
  if (patch.assignedTo !== undefined) {
    if (patch.assignedTo) {
      if (patch.assignedTo.u !== lead.assignedTo?.u) next.assignedAt = now;
      next.assignedTo = patch.assignedTo;
    } else {
      delete next.assignedTo;
      delete next.assignedAt;
    }
  }
  await db([["SET", KEY(id), JSON.stringify(next)]]);
  return next;
}

export async function deletePosLead(id: string) {
  await db([["DEL", KEY(id)], ["ZREM", INDEX, id]]);
}

/** True when this user may work the lead: admins always, agents only if it's assigned to them. */
export const canWork = (lead: PosLead, user: { u: string; role: string }) =>
  user.role === "admin" || lead.assignedTo?.u.toLowerCase() === user.u.toLowerCase();

/** Full international number (digits only) for WhatsApp / tel links: 8-digit numbers are
 *  Nicaraguan (+505), 10-digit ones are US/Canada (+1); anything else is used as given. */
export function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 8) return `505${d}`;
  if (d.length === 10) return `1${d}`;
  return d;
}

/** Greeting used for the WhatsApp link. */
export function waText(l: Pick<PosLead, "name" | "business">): string {
  const first = l.name.trim().split(/\s+/)[0] ?? "";
  const hi = first ? `Hola ${first}` : "Hola";
  const biz = l.business ? ` para ${l.business}` : "";
  return `${hi}, le saluda Pro-DG. Vimos su interés en un sistema de facturación${biz}. ¿Le puedo ayudar con una cotización?`;
}

export const waLink = (l: Pick<PosLead, "name" | "business" | "phone">) =>
  l.phone && waNumber(l.phone) ? `https://wa.me/${waNumber(l.phone)}?text=${encodeURIComponent(waText(l))}` : "";
