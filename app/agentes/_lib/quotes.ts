import "server-only";

// Quotes are stored in Upstash Redis (free, added from Vercel → Storage).
// We talk to its REST API with plain fetch — no extra npm packages.
// Vercel creates these variables automatically when you connect the database:
//   KV_REST_API_URL + KV_REST_API_TOKEN   (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)

export const STATUSES = ["nueva", "en_proceso", "facturada", "cancelada"] as const;
export type QuoteStatus = (typeof STATUSES)[number];

export type QuoteItem = {
  id: string;
  name: string;
  qty: number;
  sale: number; // unit price to the client
  agent: number; // unit price the agent pays Pro-DG
  cost: number; // unit purchase cost (admin only — stripped before sending to agents)
  monthly?: boolean; // subscription: prices are per month
};

export type Totals = { client: number; toPro: number; agentEarn: number; cost: number; proEarn: number };

export type Quote = {
  id: string;
  number: number;
  createdAt: number;
  updatedAt: number;
  status: QuoteStatus;
  agent: { u: string; name: string };
  client: { name: string; phone: string; notes: string };
  items: QuoteItem[];
  totals: Totals; // one-time purchases
  monthly?: Totals; // subscriptions, per month (absent on older quotes)
};

function config() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function quotesReady(): boolean {
  return config() !== null;
}

type Cmd = (string | number)[];

async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  const c = config();
  if (!c) throw new Error("Quote database is not configured");
  const res = await fetch(`${c.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds.map((cmd) => cmd.map(String))),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Quote database error ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const err = out.find((r) => r.error);
  if (err) throw new Error(`Quote database error: ${err.error}`);
  return out.map((r) => r.result);
}

const KEY = (id: string) => `pdg:quote:${id}`;
const INDEX = "pdg:quotes";
const SEQ = "pdg:quote:seq";

export async function saveNewQuote(q: Omit<Quote, "id" | "number">): Promise<Quote> {
  const [seq] = await pipeline([["INCR", SEQ]]);
  const number = Number(seq);
  const id = `${q.createdAt.toString(36)}-${number}`;
  const quote: Quote = { ...q, id, number };
  await pipeline([
    ["SET", KEY(id), JSON.stringify(quote)],
    ["ZADD", INDEX, q.createdAt, id],
  ]);
  return quote;
}

export async function listQuotes(limit = 300): Promise<Quote[]> {
  const [ids] = (await pipeline([["ZREVRANGE", INDEX, 0, limit - 1]])) as [string[]];
  if (!ids?.length) return [];
  const [raw] = (await pipeline([["MGET", ...ids.map(KEY)]])) as [(string | null)[]];
  return raw.filter((r): r is string => Boolean(r)).map((r) => JSON.parse(r) as Quote);
}

export async function getQuote(id: string): Promise<Quote | null> {
  const [raw] = (await pipeline([["GET", KEY(id)]])) as [string | null];
  return raw ? (JSON.parse(raw) as Quote) : null;
}

export async function setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const q = await getQuote(id);
  if (!q) return;
  q.status = status;
  q.updatedAt = Date.now();
  await pipeline([["SET", KEY(id), JSON.stringify(q)]]);
}

export function quoteCode(n: number) {
  return `COT-${String(n).padStart(4, "0")}`;
}
