import "server-only";

// Resend REST API (https://resend.com/docs) via fetch — no npm package needed.
//
// Environment variables (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY        re_...  (Resend → API Keys, "Full access")
//   MAIL_FROM             e.g.  Pro-DG <hola@pro-dg.com>          (a verified sending domain)
//   MAIL_REPLY_TO         e.g.  hola@mail.pro-dg.com              (receiving subdomain → portal inbox)
//   NOTIFY_EMAIL          where new insurance requests are sent, e.g. your personal email
//   MAIL_POSTAL_ADDRESS   business mailing address, required in campaign footers (US CAN-SPAM)
//   RESEND_WEBHOOK_SECRET whsec_... (Resend → Webhooks → your email.received webhook)

const API = process.env.RESEND_API_BASE || "https://api.resend.com"; // override only for local testing

export function resendReady(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export const mailFrom = () => process.env.MAIL_FROM ?? "";
export const mailReplyTo = () => process.env.MAIL_REPLY_TO || undefined;

export class ResendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function resend<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new ResendError(0, "RESEND_API_KEY is not set");
  // Resend's default limit is a few requests per second: retry briefly on 429.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      continue;
    }
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new ResendError(res.status, json?.message ?? `Resend error ${res.status}`);
    return json as T;
  }
}

export type SendInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Shown in the performance dashboard; "notify" (internal heads-ups) is not tracked. */
  category?: "email" | "reply" | "test" | "confirmation" | "notify";
};

export async function sendEmail(m: SendInput): Promise<{ id: string }> {
  return resend<{ id: string }>("/emails", {
    body: {
      from: mailFrom(),
      to: Array.isArray(m.to) ? m.to : [m.to],
      subject: m.subject,
      html: m.html,
      ...(m.text ? { text: m.text } : {}),
      ...(m.replyTo ?? mailReplyTo() ? { reply_to: m.replyTo ?? mailReplyTo() } : {}),
      ...(m.headers ? { headers: m.headers } : {}),
      ...(m.category ? { tags: [{ name: "category", value: m.category }] } : {}),
    },
  });
}

// ─── Branded HTML template ───────────────────────────────────────────────────

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Turns plain text (blank line = new paragraph) into safe HTML paragraphs. */
export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${linkify(esc(p)).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Makes http(s) links clickable (input is already HTML-escaped). */
export function linkify(escaped: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="color:#0096FF">${u}</a>`);
}

export function emailLayout(bodyHtml: string, footerHtml = ""): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#eef3fa">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fa;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#10213d">
<tr><td style="background:#0B2B5E;padding:20px 28px;font-size:22px;font-weight:800;color:#ffffff">Pro<span style="color:#33aaff">-DG</span></td></tr>
<tr><td style="padding:28px;font-size:15px">${bodyHtml}</td></tr>
${footerHtml ? `<tr><td style="padding:18px 28px;background:#f5f8fc;font-size:12px;color:#5b6b82;line-height:1.5">${footerHtml}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}
