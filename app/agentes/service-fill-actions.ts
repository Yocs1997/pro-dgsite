"use server";

import { getSession } from "./_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { fillServices, parseServiceList } from "@/app/lib/server/service-fill";

// Leads → "Completar servicio": preview, then apply, a list of "email;phone;service" lines.

async function requireAdmin() {
  const u = await getSession();
  if (!u || u.role !== "admin") throw new Error("No autorizado");
  if (!dbReady()) throw new Error("La base de datos no está configurada.");
  return u;
}

export async function previewServiceFill(text: string, overwrite: boolean) {
  try {
    await requireAdmin();
    const { rows, skipped } = parseServiceList(String(text ?? "").slice(0, 2_000_000));
    if (!rows.length) return { ok: false as const, error: "No encontré líneas válidas (correo;teléfono;servicio)." };
    return { ok: true as const, plan: await fillServices(rows, skipped, Boolean(overwrite), false) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

export async function applyServiceFill(text: string, overwrite: boolean) {
  try {
    await requireAdmin();
    const { rows, skipped } = parseServiceList(String(text ?? "").slice(0, 2_000_000));
    if (!rows.length) return { ok: false as const, error: "No encontré líneas válidas (correo;teléfono;servicio)." };
    return { ok: true as const, plan: await fillServices(rows, skipped, Boolean(overwrite), true) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}
