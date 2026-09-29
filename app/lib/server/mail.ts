import "server-only";
import { db, listRecords } from "./redis";

// Local index of received and sent emails (the full content of received emails
// stays in Resend and is fetched when you open a message).

export type InMail = {
  id: string; // Resend received email id
  from: string;
  to: string[];
  subject: string;
  messageId: string;
  createdAt: number;
  read: boolean;
  attachments: number;
};

export type OutMail = {
  id: string;
  to: string[];
  subject: string;
  body: string;
  createdAt: number;
  inReplyTo?: string;
  kind: "email" | "reply" | "test";
};

export type Campaign = {
  id: string;
  name: string;
  subject: string;
  segment: string;
  createdAt: number;
  recipients: number;
  lang?: "es" | "en";
};

const IN_KEY = (id: string) => `pdg:mail:in:${id}`;
const IN_INDEX = "pdg:mail:in";
const OUT_KEY = (id: string) => `pdg:mail:out:${id}`;
const OUT_INDEX = "pdg:mail:out";
const CAMP_KEY = (id: string) => `pdg:mail:camp:${id}`;
const CAMP_INDEX = "pdg:mail:camp";

export async function saveInMail(m: InMail) {
  await db([
    ["SET", IN_KEY(m.id), JSON.stringify(m)],
    ["ZADD", IN_INDEX, m.createdAt, m.id],
  ]);
}
export const listInMail = () => listRecords<InMail>(IN_INDEX, IN_KEY, 200);
export async function markRead(id: string, read = true) {
  const [raw] = (await db([["GET", IN_KEY(id)]])) as [string | null];
  if (!raw) return;
  const m = JSON.parse(raw) as InMail;
  m.read = read;
  await db([["SET", IN_KEY(id), JSON.stringify(m)]]);
}
export async function deleteInMail(id: string) {
  await db([["DEL", IN_KEY(id)], ["ZREM", IN_INDEX, id]]);
}

export async function saveOutMail(m: OutMail) {
  await db([
    ["SET", OUT_KEY(m.id), JSON.stringify(m)],
    ["ZADD", OUT_INDEX, m.createdAt, m.id],
  ]);
}
export const listOutMail = () => listRecords<OutMail>(OUT_INDEX, OUT_KEY, 200);

export async function saveCampaign(c: Campaign) {
  await db([
    ["SET", CAMP_KEY(c.id), JSON.stringify(c)],
    ["ZADD", CAMP_INDEX, c.createdAt, c.id],
  ]);
}
export const listCampaigns = () => listRecords<Campaign>(CAMP_INDEX, CAMP_KEY, 100);
