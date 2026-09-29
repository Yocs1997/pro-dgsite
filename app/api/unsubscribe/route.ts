import { dbReady } from "@/app/lib/server/redis";
import { emailForToken, unsubscribe } from "@/app/lib/server/sequences";

// Unsubscribe link used by sequence emails.
// GET shows a confirmation button (so link scanners can't unsubscribe people);
// POST does it, either from that button or from the mail app's one-click
// "Unsubscribe" (List-Unsubscribe-Post header).

function page(title: string, text: string, form?: string) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#f5f7fb;color:#1f2937">
<div style="max-width:440px;margin:12vh auto;padding:28px 24px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<h1 style="font-size:20px;margin:0 0 12px">${title}</h1><p style="line-height:1.6;margin:0 0 20px">${text}</p>${form ?? ""}
</div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  const valid = t === "test" || (dbReady() && (await emailForToken(t)));
  if (!valid) return page("Enlace no válido / Invalid link", "Este enlace ya no es válido. / This link is no longer valid.");
  const form = `<form method="post"><input type="hidden" name="t" value="${t.replace(/[^A-Za-z0-9_-]/g, "")}">
<button style="background:#0B57D0;color:#fff;border:0;border-radius:8px;padding:12px 20px;font-size:15px;font-weight:bold;cursor:pointer">Darme de baja / Unsubscribe</button></form>`;
  return page("¿Darte de baja? / Unsubscribe?", "No recibirás más correos de seguimiento. / You won't receive more follow-up emails.", form);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let t = url.searchParams.get("t") ?? "";
  if (!t) {
    const form = await req.formData().catch(() => null);
    t = String(form?.get("t") ?? "");
  }
  if (t !== "test" && dbReady()) {
    const email = await emailForToken(t);
    if (email) await unsubscribe(email);
  }
  return page("Listo / Done", "Te diste de baja. No recibirás más correos de seguimiento. / You've been unsubscribed.");
}
