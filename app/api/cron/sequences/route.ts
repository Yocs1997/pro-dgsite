import { timingSafeEqual } from "node:crypto";
import { dbReady } from "@/app/lib/server/redis";
import { resendReady } from "@/app/lib/server/resend";
import { processDue } from "@/app/lib/server/sequences";
import { notifyTelegram } from "@/app/lib/server/telegram";

// Daily run (vercel.json → crons) that sends the sequence emails that are due.
// Vercel calls it with "Authorization: Bearer <CRON_SECRET>"; set CRON_SECRET in
// Vercel → Settings → Environment Variables.

export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("unauthorized", { status: 401 });
  if (!dbReady() || !resendReady()) return Response.json({ ok: false, error: "not configured" }, { status: 500 });
  const result = await processDue(500);
  console.log("[cron] sequences", result);
  if (result.sent || result.failed)
    await notifyTelegram(
      `📤 <b>Envío diario de secuencias</b>\nEnviados: ${result.sent}` +
        (result.failed ? `\nFallaron: ${result.failed} (se reintentan)` : "") +
        (result.remaining ? `\nPendientes: ${result.remaining}` : "")
    );
  return Response.json({ ok: true, ...result });
}
