import { db, dbReady } from "@/app/lib/server/redis";
import { US_STATES } from "@/app/seguros/model";

// ZIP → city + state for the insurance form. Uses the free Zippopotam.us service
// and caches answers for 30 days in the database.
export async function GET(req: Request) {
  const zip = new URL(req.url).searchParams.get("z") ?? "";
  if (!/^\d{5}$/.test(zip)) return Response.json({ ok: false }, { status: 400 });

  const key = `pdg:zip:${zip}`;
  if (dbReady()) {
    try {
      const [hit] = (await db([["GET", key]])) as [string | null];
      if (hit) return Response.json(JSON.parse(hit), { headers: { "Cache-Control": "public, max-age=86400" } });
    } catch {
      /* ignore cache errors */
    }
  }

  let out: { ok: boolean; city?: string; state?: string } = { ok: false };
  try {
    const base = process.env.ZIP_API_BASE || "https://api.zippopotam.us"; // override only for local testing
    const r = await fetch(`${base}/us/${zip}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const j = (await r.json()) as { places?: { "place name": string; "state abbreviation": string }[] };
      const p = j.places?.[0];
      if (p && US_STATES.some(([c]) => c === p["state abbreviation"])) {
        out = { ok: true, city: p["place name"], state: p["state abbreviation"] };
      }
    } else if (r.status !== 404) {
      return Response.json({ ok: false, retry: true }, { status: 502 });
    }
  } catch {
    return Response.json({ ok: false, retry: true }, { status: 502 });
  }

  if (dbReady()) {
    try {
      await db([["SET", key, JSON.stringify(out), "EX", 60 * 60 * 24 * 30]]);
    } catch {
      /* ignore */
    }
  }
  return Response.json(out, { headers: { "Cache-Control": "public, max-age=86400" } });
}
