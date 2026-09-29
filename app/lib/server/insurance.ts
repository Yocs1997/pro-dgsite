import "server-only";
import { db, listRecords } from "./redis";
import type { InsuranceInput } from "@/app/seguros/model";

export const INS_STATUSES = ["nueva", "cotizando", "enviada", "vendida", "perdida"] as const;
export type InsStatus = (typeof INS_STATUSES)[number];

export type InsuranceLead = Omit<InsuranceInput, "consent" | "website"> & {
  id: string;
  number: number;
  code: string;
  createdAt: number;
  updatedAt: number;
  status: InsStatus;
  consentAt: number;
};

const KEY = (id: string) => `pdg:ins:${id}`;
const INDEX = "pdg:ins";
const SEQ = "pdg:ins:seq";

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
