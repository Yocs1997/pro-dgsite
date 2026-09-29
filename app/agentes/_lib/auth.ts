import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db, dbReady } from "@/app/lib/server/redis";
import { readJsonEnv } from "./env";

// ─── Users ───────────────────────────────────────────────────────────────────
// Users live in the PORTAL_USERS environment variable (never in the code,
// because the GitHub repo is public). Format (JSON array):
// [{"u":"joel","name":"Joel","role":"agent","hash":"scrypt:<salt>:<hash>"}]
// Create a hash with:  node scripts/hash-password.mjs "the-password"
//
// Admins can also add users from the portal (/agentes/usuarios). Those are stored
// in the database (hash pdg:portal:users) and work alongside PORTAL_USERS; a
// username that exists in PORTAL_USERS always uses the PORTAL_USERS entry.

export type Role = "admin" | "agent";
export type PortalUser = { u: string; name: string; role: Role; hash: string };
export type SessionUser = { u: string; name: string; role: Role };

const COOKIE = "pdg_portal";
const MAX_AGE_S = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const s = process.env.PORTAL_SECRET;
  if (!s || s.length < 32) throw new Error("PORTAL_SECRET is missing or too short");
  return s;
}

export function configReady(): boolean {
  return Boolean(
    process.env.PORTAL_SECRET &&
      process.env.PORTAL_SECRET.length >= 32 &&
      process.env.PORTAL_USERS &&
      process.env.PORTAL_PRICES
  );
}

function loadUsers(): PortalUser[] {
  const list = readJsonEnv<unknown>("PORTAL_USERS", []);
  if (!Array.isArray(list)) return [];
  return list.filter(
    (x): x is PortalUser => Boolean(x && typeof x.u === "string" && typeof x.hash === "string")
  );
}

/** True when PORTAL_USERS could be read and has at least one user. */
export function usersLoaded(): boolean {
  return loadUsers().length > 0;
}

// ─── Users added from the portal (stored in the database) ────────────────────

const DB_USERS = "pdg:portal:users"; // hash: lowercase username -> JSON DbUser

export type DbUser = PortalUser & { createdAt: number; createdBy: string; updatedAt?: number };

export const envUsers = () => loadUsers();

export async function dbUsers(): Promise<DbUser[]> {
  if (!dbReady()) return [];
  const [flat] = (await db([["HGETALL", DB_USERS]])) as [string[] | Record<string, string>];
  const values = Array.isArray(flat) ? flat.filter((_, i) => i % 2 === 1) : Object.values(flat ?? {});
  return values.map((v) => JSON.parse(v) as DbUser);
}

export async function saveDbUser(u: DbUser) {
  await db([["HSET", DB_USERS, u.u.toLowerCase(), JSON.stringify(u)]]);
}

export async function deleteDbUser(username: string) {
  await db([["HDEL", DB_USERS, username.toLowerCase()]]);
}

/** Same format as scripts/hash-password.mjs. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

/** True when anyone can log in (PORTAL_USERS or portal-added users). */
export async function anyUsers(): Promise<boolean> {
  if (usersLoaded()) return true;
  try {
    return (await dbUsers()).length > 0;
  } catch {
    return false;
  }
}

async function findUser(username: string): Promise<PortalUser | undefined> {
  const key = username.trim().toLowerCase();
  const fromEnv = loadUsers().find((x) => x.u.toLowerCase() === key);
  if (fromEnv || !dbReady() || !key) return fromEnv;
  try {
    const [raw] = (await db([["HGET", DB_USERS, key]])) as [string | null];
    return raw ? (JSON.parse(raw) as PortalUser) : undefined;
  } catch {
    return undefined;
  }
}

// A fixed dummy hash so unknown usernames take the same time as real ones.
const DUMMY = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, saltHex, hashHex] = stored.split(":");
  if (alg !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function checkCredentials(username: string, password: string): Promise<SessionUser | null> {
  const user = await findUser(username);
  const ok = verifyPassword(password, user?.hash ?? DUMMY);
  if (!user || !ok) return null;
  return { u: user.u, name: user.name, role: user.role };
}

// ─── Signed session cookie ───────────────────────────────────────────────────

function sign(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export async function createSession(u: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = Buffer.from(JSON.stringify({ u, exp })).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/agentes",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession() {
  (await cookies()).delete({ name: COOKIE, path: "/agentes" });
}

export async function getSession(): Promise<SessionUser | null> {
  // Read cookies first: this marks every page that checks the login as dynamic,
  // even if the portal variables are missing at build time.
  const jar = await cookies();
  if (!configReady()) return null;
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || exp < Date.now() / 1000) return null;
    // Look the user up again so removing someone (Vercel or portal) logs them out.
    const user = await findUser(String(u));
    return user ? { u: user.u, name: user.name, role: user.role } : null;
  } catch {
    return null;
  }
}

// ─── Basic brute-force protection (best effort, per server instance) ─────────

const attempts = new Map<string, { n: number; until: number }>();

export function tooManyAttempts(key: string): boolean {
  const a = attempts.get(key);
  return Boolean(a && a.n >= 8 && a.until > Date.now());
}

export function recordFailure(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.until < now) attempts.set(key, { n: 1, until: now + 15 * 60 * 1000 });
  else a.n += 1;
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
