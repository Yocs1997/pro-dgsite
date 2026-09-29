import { createHmac, timingSafeEqual } from "node:crypto";
import { dbReady } from "@/app/lib/server/redis";
import { saveInMail } from "@/app/lib/server/mail";
import { sendEmail, emailLayout, esc, resendReady } from "@/app/lib/server/resend";

// Resend webhook for received emails (event "email.received").
// In Resend → Webhooks, add:  https://pro-dg.com/api/resend/inbound  and select "email.received".
// Copy its signing secret into the RESEND_WEBHOOK_SECRET environment variable.

function verify(body: string, h: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const id = h.get("svix-id");
  const ts = h.get("svix-timestamp");
  const sigHeader = h.get("svix-signature");
  if (!secret || !id || !ts || !sigHeader) return false;
  // Reject old deliveries (replay protection): 5 minutes.
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return sigHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

type Received = {
  type: string;
  data?: {
    email_id: string;
    created_at?: string;
    from: string;
    to?: string[];
    subject?: string;
    message_id?: string;
    attachments?: unknown[];
  };
};

export async function POST(req: Request) {
  const body = await req.text();
  if (!verify(body, req.headers)) return new Response("invalid signature", { status: 401 });

  let event: Received;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (event.type !== "email.received" || !event.data?.email_id) return new Response("ignored", { status: 200 });
  if (!dbReady()) return new Response("database not configured", { status: 500 });

  const d = event.data;
  await saveInMail({
    id: d.email_id,
    from: String(d.from ?? ""),
    to: Array.isArray(d.to) ? d.to.map(String) : [],
    subject: String(d.subject ?? "(sin asunto)"),
    messageId: String(d.message_id ?? ""),
    createdAt: d.created_at ? Date.parse(d.created_at) || Date.now() : Date.now(),
    read: false,
    attachments: Array.isArray(d.attachments) ? d.attachments.length : 0,
  });

  // Optional heads-up to your personal email (skipped if it would loop back here).
  const notify = process.env.NOTIFY_EMAIL;
  const loops = notify && (d.to ?? []).some((t) => String(t).toLowerCase().includes(notify.toLowerCase().split("@")[1] ?? "@@"));
  if (notify && !loops && resendReady()) {
    try {
      await sendEmail({
        to: notify,
        subject: `Nuevo correo en Pro-DG: ${d.subject ?? "(sin asunto)"}`,
        html: emailLayout(
          `<p style="margin:0 0 12px">Recibiste un correo de <strong>${esc(String(d.from))}</strong>:</p>
<p style="margin:0 0 18px;font-size:17px;font-weight:700">${esc(String(d.subject ?? "(sin asunto)"))}</p>
<p style="margin:0">Ábrelo y respóndelo en <a href="https://pro-dg.com/agentes/correo">pro-dg.com/agentes/correo</a>.</p>`
        ),
      });
    } catch (e) {
      console.error("[inbound] notify failed", e);
    }
  }
  return new Response("ok", { status: 200 });
}
