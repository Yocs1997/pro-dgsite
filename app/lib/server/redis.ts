import "server-only";

// Shared Upstash Redis client (REST API, no npm package needed).
// Uses the KV_REST_API_URL / KV_REST_API_TOKEN variables Vercel added.

function config() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function dbReady(): boolean {
  return config() !== null;
}

export type Cmd = (string | number)[];

export async function db(cmds: Cmd[]): Promise<unknown[]> {
  const c = config();
  if (!c) throw new Error("Database is not configured");
  const res = await fetch(`${c.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds.map((cmd) => cmd.map(String))),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Database error ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  const err = out.find((r) => r.error);
  if (err) throw new Error(`Database error: ${err.error}`);
  return out.map((r) => r.result);
}

/** Newest-first JSON records stored as `${prefix}:${id}` with a sorted-set index. */
export async function listRecords<T>(index: string, keyOf: (id: string) => string, limit = 300): Promise<T[]> {
  const [ids] = (await db([["ZREVRANGE", index, 0, limit - 1]])) as [string[]];
  if (!ids?.length) return [];
  const [raw] = (await db([["MGET", ...ids.map(keyOf)]])) as [(string | null)[]];
  return raw.filter((r): r is string => Boolean(r)).map((r) => JSON.parse(r) as T);
}

/** Very small fixed-window rate limiter. Returns true if the call is allowed. */
export async function allow(key: string, max: number, windowSec: number): Promise<boolean> {
  const [n] = (await db([["INCR", key], ["EXPIRE", key, windowSec, "NX"]])) as [number];
  return Number(n) <= max;
}
