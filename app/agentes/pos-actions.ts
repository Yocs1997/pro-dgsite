"use server";

import { dbUsers, envUsers, getSession } from "./_lib/auth";
import { POS_STATUSES, canWork, deletePosLead, getPosLead, updatePosLead, waLink, type PosStatus } from "@/app/lib/server/pos-leads";
import { notifyTelegram, portalLink, tg } from "@/app/lib/server/telegram";
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
    const user = [...envUsers(), ...(await dbUsers())].find((x) => x.u.toLowerCase() === key);
    if (!user) return { ok: false as const, error: "Ese usuario ya no existe." };
    const same = lead.assignedTo?.u.toLowerCase() === key;
    const next = await updatePosLead(lead.id, { assignedTo: { u: user.u, name: user.name } });
    if (!next || same) return { ok: true as const, notified: false };

    // Personal heads-up (the group is not messaged for assignments).
    const chat = await chatFor(user.u).catch(() => null);
    let notified = false;
    if (chat) {
      const wa = waLink(next);
      notified = await notifyTelegram(
        [
          `📌 <b>Te asignaron un lead</b> · ${tg(next.code)}`,
          [
            `<b>${tg(next.name || "(sin nombre)")}</b>`,
            next.business ? `🏪 ${tg(next.business)}` : null,
            next.city ? `📍 ${tg(next.city)}` : null,
            next.phone ? `📞 ${tg(next.phone)}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          [wa ? `<a href="${wa}">Escribir por WhatsApp</a>` : null, portalLink("/facturacion", "Ver en el portal")].filter(Boolean).join(" · "),
        ].join("\n\n"),
        chat
      );
    }
    return { ok: true as const, notified };
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
