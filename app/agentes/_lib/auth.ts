import "server-only";
import { cookies } from "next/headers";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

// ─── Users ───────────────────────────────────────────────────────────────────
// Users live in the PORTAL_USERS environment variable (never in the code,
// because the GitHub repo is public). Format (JSON array):
// [{"u":"joel","name":"Joel","role":"agent","hash":"scrypt:<salt>:<hash>"}]
// Create a hash with:  node scripts/hash-password.mjs "the-password"

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
  try {
    const list = JSON.parse(process.env.PORTAL_USERS ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function findUser(username: string): PortalUser | undefined {
  const key = username.trim().toLowerCase();
  return loadUsers().find((x) => x.u.toLowerCase() === key);
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

export function checkCredentials(username: string, password: string): SessionUser | null {
  const user = findUser(username);
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
  if (!configReady()) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || exp < Date.now() / 1000) return null;
    // Look the user up again so removing someone from PORTAL_USERS logs them out.
    const user = findUser(String(u));
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
