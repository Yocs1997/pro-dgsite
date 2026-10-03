"use server";

import { dbReady } from "@/app/lib/server/redis";
import { dbUsers, deleteDbUser, envUsers, getSession, hashPassword, saveDbUser, type DbUser, type Role } from "./_lib/auth";
import { createLink, disconnect } from "@/app/lib/server/telegram-links";
import { setSignature, setTeamPhone } from "@/app/lib/server/team-phones";
import { waNumber } from "@/app/lib/server/pos-leads";

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

const knownUser = async (username: string) => {
  const key = clean(username, 30).toLowerCase();
  return [...envUsers(), ...(await dbUsers())].find((x) => x.u.toLowerCase() === key);
};

/** One-time t.me link that connects this user's personal Telegram (for assigned-lead alerts). */
export async function telegramLink(username: string) {
  try {
    await requireAdmin();
    if (!dbReady()) return { ok: false as const, error: "La base de datos no está configurada." };
    const user = await knownUser(username);
    if (!user) return { ok: false as const, error: "Usuario no encontrado." };
    return { ok: true as const, link: await createLink(user.u) };
  } catch (e) {
    return failure(e);
  }
}

/** Saves this user's own WhatsApp number ("" removes it). 8 digits = Nicaragua, 10 = US. */
export async function setUserWhatsApp(username: string, phone: string) {
  try {
    await requireAdmin();
    if (!dbReady()) return { ok: false as const, error: "La base de datos no está configurada." };
    const user = await knownUser(username);
    if (!user) return { ok: false as const, error: "Usuario no encontrado." };
    const raw = clean(phone, 40);
    const digits = raw ? waNumber(raw) : "";
    if (raw && (digits.length < 10 || digits.length > 15)) return { ok: false as const, error: "Número no válido: 8 dígitos para Nicaragua, o con código de país." };
    await setTeamPhone(user.u, digits);
    return { ok: true as const, whatsapp: digits };
  } catch (e) {
    return failure(e);
  }
}

/** The name this user signs emails with (templates in Correo); "" = use their portal name. */
export async function setUserSignature(username: string, name: string) {
  try {
    await requireAdmin();
    if (!dbReady()) return { ok: false as const, error: "La base de datos no está configurada." };
    const user = await knownUser(username);
    if (!user) return { ok: false as const, error: "Usuario no encontrado." };
    const sig = clean(name, 40).replace(/\s+/g, " ");
    await setSignature(user.u, sig);
    return { ok: true as const, signature: sig };
  } catch (e) {
    return failure(e);
  }
}

export async function telegramDisconnect(username: string) {
  try {
    await requireAdmin();
    const user = await knownUser(username);
    if (!user) return { ok: false as const, error: "Usuario no encontrado." };
    await disconnect(user.u);
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}
