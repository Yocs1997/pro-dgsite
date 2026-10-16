import "server-only";
import { randomBytes } from "node:crypto";
import { db, listRecords } from "./redis";
import { removeVaLeadFromSheet, syncVaLeadToSheet } from "./va-sheet";
import type { Answers } from "@/app/va-cash-out/model";

// Leads from the VA cash-out landing page (/va-cash-out). Kept apart from the insurance and
// tags leads: they belong to a different client and never enter the email sequences.

export type VaTracking = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  campaignId: string;
  adsetId: string;
  adId: string;
  placement: string;
  fbclid: string;
  fbc: string;
  fbp: string;
  landingUrl: string;
  referrer: string;
  ip: string;
  userAgent: string;
};

export type VaLeadStatus = "partial" | "qualified" | "disqualified";

export type VaLead = {
  id: string;
  code: string; // VA-1001
  token: string; // lets the visitor's browser add answers to their own lead
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  status: VaLeadStatus;
  contact: { firstName: string; lastName: string; email: string; phone: string; age: number; state: string };
  answers: Answers;
  /** Questions whose answer ruled the visitor out (e.g. "served", "ownHome"). */
  disqualifiedFor?: string[];
  /** Set when a ruled-out visitor said they answered by mistake and asked for a call. */
  callbackRequestedAt?: number;
  tracking: VaTracking;
  /** Proof of consent: the exact words shown, when, from where. */
  consent: { text: string; at: number; ip: string; url: string };
  /** Set by the team after working the lead (see VA_DISPOSITIONS). */
  disposition?: string;
  dispositionAt?: number;
  dispositionBy?: string;
  /** Team notes, oldest first. */
  notes?: VaNote[];
  /** Who last edited the contact details or answers by hand. */
  editedBy?: string;
};

export type VaNote = { at: number; by: string; text: string };

const INDEX = "pdg:va:leads";
const SEQ = "pdg:va:seq";
const key = (id: string) => `pdg:va:lead:${id}`;

export async function createVaLead(base: Omit<VaLead, "id" | "code" | "token">): Promise<VaLead> {
  const [n] = (await db([["INCR", SEQ]])) as [number];
  const lead: VaLead = { ...base, id: randomBytes(9).toString("base64url"), code: `VA-${1000 + Number(n)}`, token: randomBytes(18).toString("base64url") };
  await db([
    ["SET", key(lead.id), JSON.stringify(lead)],
    ["ZADD", INDEX, lead.createdAt, lead.id],
  ]);
  syncVaLeadToSheet(lead);
  return lead;
}

export async function getVaLead(id: string): Promise<VaLead | null> {
  if (!/^[\w-]{6,40}$/.test(id)) return null;
  const [raw] = (await db([["GET", key(id)]])) as [string | null];
  return raw ? (JSON.parse(raw) as VaLead) : null;
}

export async function saveVaLead(lead: VaLead): Promise<void> {
  await db([["SET", key(lead.id), JSON.stringify(lead)]]);
  syncVaLeadToSheet(lead);
}

export function listVaLeads(limit = 2000): Promise<VaLead[]> {
  return listRecords<VaLead>(INDEX, key, limit);
}

export async function deleteVaLead(id: string): Promise<void> {
  await db([["DEL", key(id)], ["ZREM", INDEX, id]]);
  removeVaLeadFromSheet(id);
}
