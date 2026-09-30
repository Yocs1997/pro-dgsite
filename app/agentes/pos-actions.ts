"use server";

import { getSession } from "./_lib/auth";
import { POS_STATUSES, deletePosLead, updatePosLead, type PosStatus } from "@/app/lib/server/pos-leads";

// Billing-system leads (Facturación inbox): admins only.

async function requireAdmin() {
  const u = await getSession();
  if (!u || u.role !== "admin") throw new Error("No autorizado");
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
    await requireAdmin();
    if (!POS_STATUSES.includes(status)) return { ok: false as const, error: "Estado inválido" };
    const lead = await updatePosLead(safeId(id), { status });
    if (!lead) return { ok: false as const, error: "El lead ya no existe." };
    return { ok: true as const };
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
