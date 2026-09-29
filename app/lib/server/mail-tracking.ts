import "server-only";
import { db } from "./redis";

// Delivery / engagement tracking for outgoing email, fed by Resend webhook events
// (email.sent, email.delivered, email.opened, email.clicked, email.bounced, ...).
//
// Per email:     pdg:mail:trk:{email_id}         hash (to, subject, category, broadcast, createdAt, first-time `${milestone}At`, counts)
// Index:         pdg:mail:trk                     sorted set, score = sent time
// Per campaign:  pdg:mail:campstat:{broadcast_id} hash of unique counts (sent, delivered, opened, ...)
//
// Records expire after 180 days. Note: "landed in spam" is not reported by any mail
// provider; "complained" means the recipient pressed "Report spam".

const TRK_KEY = (id: string) => `pdg:mail:trk:${id}`;
const TRK_INDEX = "pdg:mail:trk";
const CAMP_STAT_KEY = (id: string) => `pdg:mail:campstat:${id}`;
/** Per sequence step: unique counts per milestone, plus "replied" / "unsubscribed". */
export const STEP_STAT_KEY = (seq: string, step: string) => `pdg:mail:stepstat:${seq}:${step}`;
const TTL_SEC = 180 * 24 * 3600;

/** Each tracked milestone is stored once (first time it happens) as `${name}At`. */
export const MILESTONES = ["sent", "delivered", "delayed", "opened", "clicked", "bounced", "complained", "failed"] as const;
export type Milestone = (typeof MILESTONES)[number];

const EVENT_TO_MILESTONE: Record<string, Milestone> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

export const isTrackingEvent = (type: string) => type in EVENT_TO_MILESTONE;

export type ResendEmailEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    to?: string[];
    subject?: string;
    broadcast_id?: string;
    tags?: Record<string, string> | { name: string; value: string }[];
    bounce?: { type?: string; subType?: string; message?: string };
    click?: { link?: string };
    failed?: { reason?: string };
  };
};

type Tags = NonNullable<ResendEmailEvent["data"]>["tags"];

// Resend has sent tags both as { name: value } and as [{ name, value }].
function tag(tags: Tags, name: string) {
  if (!tags) return "";
  if (Array.isArray(tags)) return tags.find((t) => t?.name === name)?.value ?? "";
  return tags[name] ?? "";
}

export type RecordedEvent = { milestone: Milestone; to: string[]; permanentBounce: boolean } | null;

/** Records one Resend event. Returns null when the event is not tracked. */
export async function recordEmailEvent(ev: ResendEmailEvent): Promise<RecordedEvent> {
  const milestone = EVENT_TO_MILESTONE[ev.type];
  const d = ev.data;
  if (!milestone || !d?.email_id) return null;

  const category = tag(d.tags, "category");
  if (category === "notify") return null; // internal heads-up emails to ourselves

  const id = d.email_id;
  const key = TRK_KEY(id);
  const at = Date.parse(ev.created_at ?? "") || Date.now();
  const sentAt = Date.parse(d.created_at ?? "") || at;
  const broadcast = d.broadcast_id ?? "";
  const seq = tag(d.tags, "seq");
  const stepId = tag(d.tags, "step");

  const cmds: (string | number)[][] = [
    ["HSETNX", key, "to", (d.to ?? []).join(", ")],
    ["HSETNX", key, "subject", d.subject ?? ""],
    ["HSETNX", key, "category", broadcast ? "campaign" : category || "email"],
    ["HSETNX", key, "broadcast", broadcast],
    ["HSETNX", key, "seq", seq],
    ["HSETNX", key, "step", stepId],
    ["HSETNX", key, "createdAt", sentAt],
    ["HSETNX", key, `${milestone}At`, at], // index 7 → 1 if first time
    ["HSET", key, "last", milestone, "updatedAt", at],
    ["ZADD", TRK_INDEX, "NX", sentAt, id],
    ["EXPIRE", key, TTL_SEC],
  ];
  if (milestone === "opened") cmds.push(["HINCRBY", key, "opens", 1]);
  if (milestone === "clicked") {
    cmds.push(["HINCRBY", key, "clicks", 1]);
    if (d.click?.link) cmds.push(["HSET", key, "lastLink", d.click.link.slice(0, 500)]);
  }
  if (milestone === "bounced") cmds.push(["HSET", key, "bounce", [d.bounce?.type, d.bounce?.message].filter(Boolean).join(" — ").slice(0, 300)]);
  if (milestone === "failed") cmds.push(["HSET", key, "failReason", (d.failed?.reason ?? "").slice(0, 300)]);

  const res = await db(cmds);
  const firstTime = Number(res[7]) === 1;

  // Campaign totals count each recipient once per milestone.
  if (broadcast && firstTime) {
    await db([
      ["HINCRBY", CAMP_STAT_KEY(broadcast), milestone, 1],
      ["EXPIRE", CAMP_STAT_KEY(broadcast), TTL_SEC],
    ]);
  }
  if (seq && stepId && firstTime) await db([["HINCRBY", STEP_STAT_KEY(seq, stepId), milestone, 1]]);
  // Occasionally drop index entries older than the retention window.
  if (Math.random() < 0.02) await db([["ZREMRANGEBYSCORE", TRK_INDEX, 0, Date.now() - TTL_SEC * 1000]]);
  return { milestone, to: (d.to ?? []).map((t) => t.toLowerCase()), permanentBounce: milestone === "bounced" && d.bounce?.type !== "Transient" };
}

export type TrackedEmail = {
  id: string;
  to: string;
  subject: string;
  category: string;
  broadcast: string;
  sentAt: number;
  opens: number;
  clicks: number;
  lastLink?: string;
  bounce?: string;
  failReason?: string;
} & Partial<Record<`${Milestone}At`, number>>;

function hashToObj(flat: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(flat)) for (let i = 0; i + 1 < flat.length; i += 2) out[String(flat[i])] = String(flat[i + 1]);
  else if (flat && typeof flat === "object") Object.assign(out, flat);
  return out;
}

/** Most recent tracked emails (newest first). */
export async function listTrackedEmails(limit = 500): Promise<TrackedEmail[]> {
  const [ids] = (await db([["ZREVRANGE", TRK_INDEX, 0, limit - 1]])) as [string[]];
  if (!ids?.length) return [];
  const rows = await db(ids.map((id) => ["HGETALL", TRK_KEY(id)]));
  const out: TrackedEmail[] = [];
  rows.forEach((raw, i) => {
    const h = hashToObj(raw);
    if (!h.createdAt) return; // expired
    const e: TrackedEmail = {
      id: ids[i],
      to: h.to ?? "",
      subject: h.subject ?? "",
      category: h.category ?? "email",
      broadcast: h.broadcast ?? "",
      sentAt: Number(h.createdAt),
      opens: Number(h.opens ?? 0),
      clicks: Number(h.clicks ?? 0),
      ...(h.lastLink ? { lastLink: h.lastLink } : {}),
      ...(h.bounce ? { bounce: h.bounce } : {}),
      ...(h.failReason ? { failReason: h.failReason } : {}),
    };
    for (const m of MILESTONES) if (h[`${m}At`]) e[`${m}At`] = Number(h[`${m}At`]);
    out.push(e);
  });
  return out;
}

export type CampaignStats = Partial<Record<Milestone | "replied" | "unsubscribed", number>>;

export async function campaignStats(ids: string[]): Promise<Record<string, CampaignStats>> {
  if (!ids.length) return {};
  const rows = await db(ids.map((id) => ["HGETALL", CAMP_STAT_KEY(id)]));
  const out: Record<string, CampaignStats> = {};
  rows.forEach((raw, i) => {
    const h = hashToObj(raw);
    const s: CampaignStats = {};
    for (const m of MILESTONES) if (h[m]) s[m] = Number(h[m]);
    out[ids[i]] = s;
  });
  return out;
}

// ─── Webhook health: last time each event type arrived, and how many ─────────

const HOOK_LAST = "pdg:mail:hook:last";
const HOOK_COUNT = "pdg:mail:hook:count";

export async function noteWebhookEvent(type: string) {
  const t = type.replace(/[^a-z._]/gi, "").slice(0, 40) || "unknown";
  await db([["HSET", HOOK_LAST, t, Date.now()], ["HINCRBY", HOOK_COUNT, t, 1]]);
}

export async function webhookHealth(): Promise<{ type: string; last: number; count: number }[]> {
  const [last, count] = await db([["HGETALL", HOOK_LAST], ["HGETALL", HOOK_COUNT]]);
  const l = hashToObj(last);
  const c = hashToObj(count);
  return Object.keys(l)
    .map((type) => ({ type, last: Number(l[type]), count: Number(c[type] ?? 0) }))
    .sort((a, b) => a.type.localeCompare(b.type));
}

export async function stepStats(seq: string, stepIds: string[]): Promise<Record<string, CampaignStats>> {
  if (!stepIds.length) return {};
  const rows = await db(stepIds.map((id) => ["HGETALL", STEP_STAT_KEY(seq, id)]));
  const out: Record<string, CampaignStats> = {};
  rows.forEach((raw, i) => {
    const h = hashToObj(raw);
    const s: CampaignStats = {};
    for (const [k, v] of Object.entries(h)) (s as Record<string, number>)[k] = Number(v);
    out[stepIds[i]] = s;
  });
  return out;
}
