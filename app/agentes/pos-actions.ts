"use server";

import { dbUsers, envUsers, getSession } from "./_lib/auth";
import {
  POS_STATUSES,
  canWork,
  deletePosLead,
  getPosLead,
  listPosLeads,
  savePosLead,
  updatePosLead,
  waLink,
  waNumber,
  type PosLead,
  type PosStatus,
} from "@/app/lib/server/pos-leads";
import { notifyTelegram, portalLink, posChats, tg } from "@/app/lib/server/telegram";
import { chatFor } from "@/app/lib/server/telegram-links";

// Billing-system leads (Facturación). Admins see and assign everything; agents only
// work the leads assigned to them.

async function requireUser() {
  const u = await getSession();
  if (!u) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  return u;
}
async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") throw new Error("No autorizado");
  return u;
}
const failure = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Error inesperado" });
const safeId = (id: unknown) => {
  const v = String(id ?? "").slice(0, 64);
  if (!/^[a-z0-9_-]+$/i.test(v)) throw new Error("Registro inválido");
  return v;
};

async function findUser(username: string) {
  const key = username.trim().toLowerCase();
  return [...envUsers(), ...(await dbUsers())].find((x) => x.u.toLowerCase() === key) ?? null;
}

/** Personal Telegram heads-up to the assignee (the group is not messaged for assignments). */
async function tellAssignee(lead: PosLead, u: string): Promise<boolean> {
  const chat = await chatFor(u).catch(() => null);
  if (!chat) return false;
  const wa = waLink(lead);
  return notifyTelegram(
    [
      `📌 <b>Te asignaron un lead</b> · ${tg(lead.code)}`,
      [
        `<b>${tg(lead.name || "(sin nombre)")}</b>`,
        lead.business ? `🏪 ${tg(lead.business)}` : null,
        lead.city ? `📍 ${tg(lead.city)}` : null,
        lead.phone ? `📞 ${tg(lead.phone)}` : null,
        ...lead.extra.map((x) => `📝 ${tg(x.slice(0, 300))}`),
      ]
        .filter(Boolean)
        .join("\n"),
      [wa ? `<a href="${wa}">Escribir por WhatsApp</a>` : null, portalLink("/facturacion", "Ver en el portal")].filter(Boolean).join(" · "),
    ].join("\n\n"),
    chat
  );
}

export async function setPosStatus(id: string, status: PosStatus) {
  try {
    const user = await requireUser();
    if (!POS_STATUSES.includes(status)) return { ok: false as const, error: "Estado inválido" };
    const lead = await getPosLead(safeId(id));
    if (!lead || !canWork(lead, user)) return { ok: false as const, error: "El lead ya no existe o no está asignado a ti." };
    await updatePosLead(lead.id, { status });
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

/** Assigns a lead to a portal user ("" = unassign) and messages them on Telegram if connected. */
export async function assignPosLead(id: string, username: string) {
  try {
    await requireAdmin();
    const lead = await getPosLead(safeId(id));
    if (!lead) return { ok: false as const, error: "El lead ya no existe." };
    const key = String(username ?? "").trim().toLowerCase();
    if (!key) {
      await updatePosLead(lead.id, { assignedTo: null });
      return { ok: true as const, notified: false };
    }
    const user = await findUser(key);
    if (!user) return { ok: false as const, error: "Ese usuario ya no existe." };
    const same = lead.assignedTo?.u.toLowerCase() === key;
    const next = await updatePosLead(lead.id, { assignedTo: { u: user.u, name: user.name } });
    if (!next || same) return { ok: true as const, notified: false };
    return { ok: true as const, notified: await tellAssignee(next, user.u) };
  } catch (e) {
    return failure(e);
  }
}

export type NewPosLead = { name: string; phone: string; business: string; city: string; message: string; assignTo: string };

/** Adds a lead by hand (someone who wrote on WhatsApp from an ad): group alert plus optional assignment. */
export async function addPosLead(input: NewPosLead, force = false) {
  try {
    const admin = await requireAdmin();
    const clean = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
    const name = clean(input.name, 120);
    const phone = clean(input.phone, 40);
    const business = clean(input.business, 120);
    const city = clean(input.city, 80);
    const message = String(input.message ?? "").trim().slice(0, 1000);
    const digits = waNumber(phone);
    if (digits.length < 10 || digits.length > 15)
      return { ok: false as const, error: "Escribe un número de WhatsApp válido (8 dígitos para Nicaragua, o con código de país)." };

    if (!force) {
      const dup = (await listPosLeads()).find((l) => l.phone && waNumber(l.phone) === digits);
      if (dup) return { ok: false as const, duplicate: dup.code, error: `Ya existe ${dup.code} (${dup.name || "sin nombre"}) con ese número.` };
    }
    const assignee = input.assignTo ? await findUser(input.assignTo) : null;
    if (input.assignTo && !assignee) return { ok: false as const, error: "Ese usuario ya no existe." };

    const now = Date.now();
    const lead = await savePosLead({
      createdAt: now,
      updatedAt: now,
      status: "nueva",
      name,
      business,
      city,
      phone,
      email: "",
      extra: message ? [`Mensaje: ${message}`] : [],
      source: "whatsapp",
      ...(assignee ? { assignedTo: { u: assignee.u, name: assignee.name }, assignedAt: now } : {}),
    });

    const wa = waLink(lead);
    await notifyTelegram(
      [
        `💬 <b>Nuevo lead por WhatsApp</b> · ${tg(lead.code)} · Nicaragua`,
        [
          `<b>${tg(name || "(sin nombre)")}</b>`,
          business ? `🏪 ${tg(business)}` : null,
          city ? `📍 ${tg(city)}` : null,
          `📞 ${tg(phone)}`,
          message ? `📝 ${tg(message.slice(0, 300))}` : null,
          assignee ? `👤 Asignado a ${tg(assignee.name)}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        [wa ? `<a href="${wa}">Escribir por WhatsApp</a>` : null, portalLink("/facturacion", "Ver en el portal")].filter(Boolean).join(" · "),
        `<i>Agregado por ${tg(admin.name)}</i>`,
      ].join("\n\n"),
      posChats()
    );
    const notified = assignee ? await tellAssignee(lead, assignee.u) : false;
    return { ok: true as const, code: lead.code, notified };
  } catch (e) {
    return failure(e);
  }
}

export async function removePosLead(id: string) {
  try {
    await requireAdmin();
    await deletePosLead(safeId(id));
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}
