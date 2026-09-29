"use server";

import { getSession } from "./_lib/auth";
import { INS_STATUSES, deleteLead, setLeadStatus, updateLead, type InsStatus } from "@/app/lib/server/insurance";
import { sanitizeInsurance } from "@/app/lib/server/insurance-sanitize";
import { deleteQuote, updateQuoteData } from "./_lib/quotes";
import type { InsuranceInput } from "@/app/seguros/model";
import { resend, resendReady, sendEmail, emailLayout, textToHtml, mailFrom, mailReplyTo, esc } from "@/app/lib/server/resend";
import { upsertContact, segmentId, listLocalContacts, updateContact, deleteContact } from "@/app/lib/server/contacts";
import { deleteCampaign, deleteInMail, deleteOutMail, markRead, saveCampaign, saveOutMail } from "@/app/lib/server/mail";
import { isEmail } from "@/app/seguros/model";

async function requireAdmin() {
  const u = await getSession();
  if (!u || u.role !== "admin") throw new Error("No autorizado");
  return u;
}

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
function explain(e: unknown): string {
  const msg = e instanceof Error ? e.message : "Error inesperado";
  if (/restricted|not allowed|permission|scope/i.test(msg))
    return `Resend rechazó la operación: tu API key no tiene permiso. Crea una API key con "Full access" y ponla en RESEND_API_KEY. (${msg})`;
  if (/api key is invalid|unauthorized|invalid api/i.test(msg)) return `La API key de Resend no es válida. Revisa RESEND_API_KEY. (${msg})`;
  return msg;
}
const failure = (e: unknown) => ({ ok: false as const, error: explain(e) });

// ─── Insurance leads ─────────────────────────────────────────────────────────

export async function updateLeadStatus(id: string, status: InsStatus) {
  try {
    await requireAdmin();
    if (!INS_STATUSES.includes(status)) return { ok: false as const, error: "Estado inválido" };
    await setLeadStatus(clean(id, 64), status);
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

// ─── Inbox ───────────────────────────────────────────────────────────────────

export type OpenedMail = {
  id: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  html: string | null;
  text: string | null;
  createdAt: string;
  messageId: string;
  replyTo: string[];
  attachments: { filename: string; size?: number }[];
};

export async function openMessage(id: string) {
  try {
    await requireAdmin();
    const m = await resend<{
      id: string; from: string; to: string[]; cc?: string[]; subject: string; html: string | null; text: string | null;
      created_at: string; message_id: string; reply_to?: string[]; attachments?: { filename: string; size?: number }[];
    }>(`/emails/receiving/${encodeURIComponent(clean(id, 64))}`);
    await markRead(id).catch(() => {});
    const out: OpenedMail = {
      id: m.id,
      from: m.from,
      to: m.to ?? [],
      cc: m.cc ?? [],
      subject: m.subject ?? "",
      html: m.html,
      text: m.text,
      createdAt: m.created_at,
      messageId: m.message_id,
      replyTo: m.reply_to ?? [],
      attachments: (m.attachments ?? []).map((a) => ({ filename: a.filename, size: a.size })),
    };
    return { ok: true as const, mail: out };
  } catch (e) {
    return failure(e);
  }
}

export async function setRead(id: string, read: boolean) {
  try {
    await requireAdmin();
    await markRead(clean(id, 64), read);
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function removeMessage(id: string) {
  try {
    await requireAdmin();
    await deleteInMail(clean(id, 64));
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

// ─── Compose / reply ─────────────────────────────────────────────────────────

export async function sendMessage(input: { to: string; subject: string; body: string; inReplyTo?: string; references?: string }) {
  try {
    await requireAdmin();
    if (!resendReady()) return { ok: false as const, error: "Falta configurar RESEND_API_KEY y MAIL_FROM." };
    const to = clean(input.to, 500)
      .split(/[,;\s]+/)
      .filter(Boolean);
    if (!to.length || to.length > 20 || !to.every(isEmail)) return { ok: false as const, error: "Revisa los destinatarios (máximo 20, separados por coma)." };
    const subject = clean(input.subject, 200);
    const body = clean(input.body, 20000);
    if (!subject || !body) return { ok: false as const, error: "Escribe un asunto y un mensaje." };
    const inReplyTo = clean(input.inReplyTo, 300);
    const references = clean(input.references, 2000);
    const r = await sendEmail({
      to,
      subject,
      html: emailLayout(textToHtml(body)),
      text: body,
      ...(inReplyTo ? { headers: { "In-Reply-To": inReplyTo, References: references || inReplyTo } } : {}),
    });
    await saveOutMail({ id: r.id || uid(), to, subject, body, createdAt: Date.now(), kind: inReplyTo ? "reply" : "email", ...(inReplyTo ? { inReplyTo } : {}) }).catch(() => {});
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export type ImportRow = { email: string; firstName?: string; lastName?: string };

/** Imports a small batch (the page sends ~10 at a time to stay within Resend's rate limit). */
export async function importContacts(rows: ImportRow[], segment: string) {
  try {
    await requireAdmin();
    if (!resendReady()) return { ok: false as const, error: "Falta configurar RESEND_API_KEY y MAIL_FROM." };
    const seg = clean(segment, 60) || "Leads";
    let added = 0;
    const failed: string[] = [];
    let lastError = "";
    for (const r of (rows ?? []).slice(0, 15)) {
      const email = clean(r.email, 120).toLowerCase();
      if (!isEmail(email)) {
        failed.push(email || "(vacío)");
        continue;
      }
      try {
        await upsertContact({ email, firstName: clean(r.firstName, 60), lastName: clean(r.lastName, 60) }, seg);
        added++;
      } catch (e) {
        failed.push(email);
        lastError = explain(e);
      }
      await new Promise((res) => setTimeout(res, 300));
    }
    // Every contact failed → report it as an error so the reason is visible.
    if (added === 0 && failed.length && lastError) return { ok: false as const, error: lastError };
    return { ok: true as const, added, failed, lastError };
  } catch (e) {
    return failure(e);
  }
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

type CampaignLang = "es" | "en";

const FOOTER: Record<CampaignLang, { why: string; unsub: string; test: string }> = {
  es: { why: "Recibes este correo porque recientemente mostraste interés en obtener un seguro de auto.", unsub: "Cancelar suscripción", test: "[PRUEBA]" },
  en: { why: "You're receiving this email because you recently showed interest in getting car insurance.", unsub: "Unsubscribe", test: "[TEST]" },
};

function campaignHtml(body: string, fallbackName: string, lang: CampaignLang, footerText: string, preview?: { name: string }) {
  const address = process.env.MAIL_POSTAL_ADDRESS ?? "";
  const nameToken = preview ? esc(preview.name) : `{{{contact.first_name|${fallbackName.replace(/[{}|]/g, "")}}}}`;
  // {{nombre}} and {{name}} both work, in either language.
  const bodyHtml = textToHtml(body).replace(/\{\{\s*(nombre|name)\s*\}\}/gi, nameToken);
  const unsub = preview ? "#" : "{{{RESEND_UNSUBSCRIBE_URL}}}";
  const f = FOOTER[lang];
  // The postal address and the unsubscribe link are always included (required by US CAN-SPAM).
  const footer = `Pro-DG · ${esc(address)}<br>${esc(footerText || f.why)} <a href="${unsub}" style="color:#0B2B5E">${f.unsub}</a>`;
  return emailLayout(bodyHtml, footer);
}

export async function sendCampaign(input: { segment: string; subject: string; body: string; fallbackName: string; lang?: CampaignLang; footerText?: string; testTo?: string }) {
  try {
    const admin = await requireAdmin();
    if (!resendReady()) return { ok: false as const, error: "Falta configurar RESEND_API_KEY y MAIL_FROM." };
    if (!process.env.MAIL_POSTAL_ADDRESS)
      return { ok: false as const, error: "Agrega tu dirección postal en la variable MAIL_POSTAL_ADDRESS (la ley exige incluirla en campañas)." };
    const subject = clean(input.subject, 200);
    const body = clean(input.body, 20000);
    const segment = clean(input.segment, 60);
    const fallbackName = clean(input.fallbackName, 30);
    const lang: CampaignLang = input.lang === "en" ? "en" : "es";
    const testTag = FOOTER[lang].test;
    const footerText = clean(input.footerText, 300);
    if (!subject || !body || !segment) return { ok: false as const, error: "Completa segmento, asunto y mensaje." };

    if (input.testTo) {
      const to = clean(input.testTo, 120);
      if (!isEmail(to)) return { ok: false as const, error: "Correo de prueba inválido." };
      const r = await sendEmail({ to, subject: `${testTag} ${subject}`, html: campaignHtml(body, fallbackName, lang, footerText, { name: admin.name }) });
      await saveOutMail({ id: r.id || uid(), to: [to], subject: `${testTag} ${subject}`, body, createdAt: Date.now(), kind: "test" }).catch(() => {});
      return { ok: true as const, test: true };
    }

    const segId = await segmentId(segment);
    const recipients = (await listLocalContacts()).filter((c) => c.segments.includes(segment)).length;
    const r = await resend<{ id: string }>("/broadcasts", {
      body: {
        segment_id: segId,
        from: mailFrom(),
        ...(mailReplyTo() ? { reply_to: mailReplyTo() } : {}),
        subject,
        html: campaignHtml(body, fallbackName, lang, footerText),
        name: `${subject} — ${new Date().toISOString().slice(0, 10)}`,
        send: true,
      },
    });
    await saveCampaign({ id: r.id || uid(), name: subject, subject, segment, createdAt: Date.now(), recipients, lang }).catch(() => {});
    return { ok: true as const, test: false };
  } catch (e) {
    return failure(e);
  }
}

// ─── Edit / delete records ───────────────────────────────────────────────────

const safeId = (id: unknown) => {
  const v = clean(id, 64);
  if (!/^[a-z0-9_-]+$/i.test(v)) throw new Error("Registro inválido");
  return v;
};

export async function saveLeadEdits(id: string, data: Pick<InsuranceInput, "driver" | "extraDrivers" | "vehicles" | "coverage">) {
  try {
    await requireAdmin();
    const clean = sanitizeInsurance(data);
    const lead = await updateLead(safeId(id), clean);
    if (!lead) return { ok: false as const, error: "La solicitud ya no existe." };
    return { ok: true as const, lead: clean };
  } catch (e) {
    return failure(e);
  }
}

export async function removeLead(id: string) {
  try {
    await requireAdmin();
    await deleteLead(safeId(id));
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function saveQuoteEdits(
  id: string,
  data: { client: { name: string; phone: string; notes: string }; items: { id: string; qty: number; sale: number }[] }
) {
  try {
    await requireAdmin();
    const client = { name: clean(data?.client?.name, 120), phone: clean(data?.client?.phone, 40), notes: clean(data?.client?.notes, 1000) };
    if (!client.name) return { ok: false as const, error: "El nombre del cliente es obligatorio." };
    const items = (Array.isArray(data?.items) ? data.items : []).slice(0, 50).map((i) => ({
      id: clean(i?.id, 60),
      qty: Math.max(0, Math.min(999, Math.floor(Number(i?.qty) || 0))),
      sale: Math.max(0, Math.min(999999, Math.round((Number(i?.sale) || 0) * 100) / 100)),
    }));
    const q = await updateQuoteData(safeId(id), { client, items });
    if (!q) return { ok: false as const, error: "La cotización ya no existe." };
    if (!q.items.length) return { ok: false as const, error: "La cotización debe tener al menos un producto." };
    return { ok: true as const, quote: q };
  } catch (e) {
    return failure(e);
  }
}

export async function removeQuote(id: string) {
  try {
    await requireAdmin();
    await deleteQuote(safeId(id));
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function removeSent(id: string) {
  try {
    await requireAdmin();
    await deleteOutMail(safeId(id));
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function removeCampaignRecord(id: string) {
  try {
    await requireAdmin();
    await deleteCampaign(safeId(id));
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function editContact(email: string, firstName: string, lastName: string) {
  try {
    await requireAdmin();
    const e = clean(email, 120).toLowerCase();
    if (!isEmail(e)) return { ok: false as const, error: "Correo inválido." };
    await updateContact(e, { firstName: clean(firstName, 60), lastName: clean(lastName, 60) });
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function removeContact(email: string) {
  try {
    await requireAdmin();
    const e = clean(email, 120).toLowerCase();
    if (!isEmail(e)) return { ok: false as const, error: "Correo inválido." };
    await deleteContact(e);
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}
