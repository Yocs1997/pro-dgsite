import { createHmac, timingSafeEqual } from "node:crypto";
import { db, dbReady } from "@/app/lib/server/redis";
import { saveLead, type InsuranceLead } from "@/app/lib/server/insurance";
import { afterNewLead } from "@/app/lib/server/lead-intake";
import { notifyTelegram, tg } from "@/app/lib/server/telegram";
import { emptyCoverage } from "@/app/seguros/model";
import { mapAnswers, type FieldData } from "@/app/lib/server/meta-leads";

// Meta (Facebook/Instagram) lead ads → portal.
//
// Meta calls this URL when someone submits an Instant Form ("leadgen" webhook).
// We verify the signature, fetch the answers from the Graph API, save the lead in
// Seguros (marked "Meta"), and run the same follow-up as the website form.
//
// Environment variables (Vercel):
//   META_APP_SECRET     App → Settings → Basic → App secret (verifies Meta's signature)
//   META_VERIFY_TOKEN   any random text; the same text goes in the webhook setup in Meta
//   META_PAGE_TOKEN     Page access token with leads_retrieval (reads the lead's answers)
//   META_GRAPH_VERSION  optional, e.g. v23.0

// META_GRAPH_BASE only overrides the host for local testing.
const GRAPH = () => `${process.env.META_GRAPH_BASE || "https://graph.facebook.com"}/${process.env.META_GRAPH_VERSION || "v23.0"}`;
const SEEN = (id: string) => `pdg:meta:lead:${id}`;
const WARNED = (id: string) => `pdg:meta:warned:${id}`;

// ─── Webhook verification (Meta calls GET once when you save the webhook) ────

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const token = process.env.META_VERIFY_TOKEN;
  if (q.get("hub.mode") === "subscribe" && token && q.get("hub.verify_token") === token) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

function validSignature(body: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"));
  const given = Buffer.from(header.slice(7));
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// ─── Receiving leads ─────────────────────────────────────────────────────────

type LeadgenChange = { field?: string; value?: { leadgen_id?: string; form_id?: string; page_id?: string; ad_id?: string; created_time?: number } };
type Payload = { object?: string; entry?: { id?: string; changes?: LeadgenChange[] }[] };

async function fetchLead(id: string): Promise<{ field_data: FieldData; created_time?: string; form_id?: string; is_organic?: boolean }> {
  const token = process.env.META_PAGE_TOKEN;
  if (!token) throw new Error("META_PAGE_TOKEN is not set");
  const url = `${GRAPH()}/${encodeURIComponent(id)}?fields=field_data,created_time,form_id,is_organic&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `Graph API error ${res.status}`);
  return json;
}

async function handleLead(leadgenId: string): Promise<"saved" | "duplicate"> {
  const [already] = (await db([["EXISTS", SEEN(leadgenId)]])) as [number];
  if (Number(already) === 1) return "duplicate";

  const data = await fetchLead(leadgenId);
  const { driver, extra } = mapAnswers(data.field_data ?? []);
  const now = Date.now();
  const created = Date.parse(data.created_time ?? "") || now;
  const base: Omit<InsuranceLead, "id" | "number" | "code"> = {
    lang: "en",
    driver,
    extraDrivers: [],
    vehicles: [],
    coverage: {
      ...emptyCoverage(),
      contactPref: "phone",
      notes: ["Formulario instantáneo de Meta" + (data.is_organic ? " (orgánico)" : ""), ...extra].join(" · ").slice(0, 1000),
    },
    createdAt: created,
    updatedAt: now,
    status: "nueva",
    consentAt: created,
    licensePhotos: 0,
    source: "meta",
    metaLeadId: leadgenId,
  };
  // Claim the id first so a Meta retry can't create the lead twice.
  const [claimed] = (await db([["SET", SEEN(leadgenId), "1", "NX", "EX", 60 * 24 * 3600]])) as [string | null];
  if (claimed !== "OK") return "duplicate";
  const lead = await saveLead(base);
  await afterNewLead(lead, { ...base, code: lead.code }, { list: "Meta Leads", source: "Meta" });
  return "saved";
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!validSignature(body, req.headers.get("x-hub-signature-256"))) return new Response("invalid signature", { status: 401 });
  if (!dbReady()) return new Response("database not configured", { status: 500 });

  let payload: Payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const ids = (payload.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .filter((c) => c.field === "leadgen" && c.value?.leadgen_id)
    .map((c) => String(c.value!.leadgen_id));

  let failed = false;
  for (const id of ids) {
    try {
      await handleLead(id);
    } catch (e) {
      failed = true;
      console.error("[meta] lead failed", id, e);
      // Tell the team once per lead; Meta will retry the webhook.
      const [first] = (await db([["SET", WARNED(id), "1", "NX", "EX", 7 * 24 * 3600]]).catch(() => [null])) as [string | null];
      if (first === "OK")
        await notifyTelegram(`⚠️ <b>Llegó un lead de Meta pero no se pudo leer</b>\nID ${tg(id)}\n${tg(e instanceof Error ? e.message : String(e)).slice(0, 300)}\nRevisa META_PAGE_TOKEN en Vercel. Meta lo reintentará.`);
    }
  }
  // A non-200 makes Meta retry later (useful if the token or Graph API had a hiccup).
  return new Response(failed ? "retry" : "ok", { status: failed ? 500 : 200 });
}
