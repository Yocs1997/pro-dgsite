"use server";

import { dbReady } from "@/app/lib/server/redis";
import { dbUsers, deleteDbUser, envUsers, getSession, hashPassword, saveDbUser, type DbUser, type Role } from "./_lib/auth";

// Manage portal users from the portal (admins only). Users from the Vercel
// variable PORTAL_USERS are shown but can't be changed here.

async function requireAdmin() {
  const u = await getSession();
  if (!u || u.role !== "admin") throw new Error("No autorizado");
  return u;
}
const failure = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Error inesperado" });
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const ROLES: Role[] = ["admin", "agent"];
const MIN_PASSWORD = 10;

async function findDbUser(username: string): Promise<DbUser | undefined> {
  const key = username.toLowerCase();
  return (await dbUsers()).find((x) => x.u.toLowerCase() === key);
}

/** Admins left after a change (Vercel + portal users). */
async function adminCountExcluding(username: string) {
  const key = username.toLowerCase();
  const all = [...envUsers(), ...(await dbUsers())].filter((x) => x.u.toLowerCase() !== key);
  return all.filter((x) => x.role === "admin").length;
}

export async function addUser(input: { name: string; username: string; role: Role; password: string }) {
  try {
    const me = await requireAdmin();
    if (!dbReady()) return { ok: false as const, error: "La base de datos no está configurada." };
    const name = clean(input.name, 60);
    const u = clean(input.username, 30).toLowerCase();
    const role = ROLES.includes(input.role) ? input.role : "agent";
    const password = String(input.password ?? "").trim();
    if (!name) return { ok: false as const, error: "Escribe el nombre." };
    if (!/^[a-z0-9._-]{3,30}$/.test(u)) return { ok: false as const, error: "El usuario debe tener 3–30 caracteres: letras, números, punto, guion." };
    if (password.length < MIN_PASSWORD) return { ok: false as const, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
    if (envUsers().some((x) => x.u.toLowerCase() === u) || (await findDbUser(u))) return { ok: false as const, error: "Ese usuario ya existe." };
    await saveDbUser({ u, name, role, hash: hashPassword(password), createdAt: Date.now(), createdBy: me.u });
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function setUserPassword(username: string, password: string) {
  try {
    await requireAdmin();
    const user = await findDbUser(clean(username, 30));
    if (!user) return { ok: false as const, error: "Este usuario se administra en Vercel (PORTAL_USERS)." };
    const pw = String(password ?? "").trim();
    if (pw.length < MIN_PASSWORD) return { ok: false as const, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
    await saveDbUser({ ...user, hash: hashPassword(pw), updatedAt: Date.now() });
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function setUserRole(username: string, role: Role) {
  try {
    const me = await requireAdmin();
    const user = await findDbUser(clean(username, 30));
    if (!user) return { ok: false as const, error: "Este usuario se administra en Vercel (PORTAL_USERS)." };
    if (!ROLES.includes(role)) return { ok: false as const, error: "Rol inválido." };
    if (user.u.toLowerCase() === me.u.toLowerCase()) return { ok: false as const, error: "No puedes cambiar tu propio rol." };
    if (role !== "admin" && user.role === "admin" && (await adminCountExcluding(user.u)) === 0)
      return { ok: false as const, error: "Debe quedar al menos un administrador." };
    await saveDbUser({ ...user, role, updatedAt: Date.now() });
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

export async function removeUser(username: string) {
  try {
    const me = await requireAdmin();
    const user = await findDbUser(clean(username, 30));
    if (!user) return { ok: false as const, error: "Este usuario se administra en Vercel (PORTAL_USERS)." };
    if (user.u.toLowerCase() === me.u.toLowerCase()) return { ok: false as const, error: "No puedes eliminarte a ti mismo." };
    if (user.role === "admin" && (await adminCountExcluding(user.u)) === 0) return { ok: false as const, error: "Debe quedar al menos un administrador." };
    await deleteDbUser(user.u);
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}
