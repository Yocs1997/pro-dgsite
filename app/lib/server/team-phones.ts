import "server-only";
import { db } from "./redis";

// Each portal user's own WhatsApp number (digits with country code, e.g. 50588887777),
// set in Usuarios. Kept apart from the user records so it also works for the users
// defined in Vercel (PORTAL_USERS). Used to forward a lead to an agent's WhatsApp.

const KEY = "pdg:portal:wa"; // hash: lowercase username -> digits

export async function teamPhones(): Promise<Record<string, string>> {
  const [flat] = (await db([["HGETALL", KEY]])) as [string[] | Record<string, string> | null];
  if (!flat) return {};
  if (!Array.isArray(flat)) return flat;
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

export async function setTeamPhone(username: string, digits: string) {
  const u = username.toLowerCase();
  await db([digits ? ["HSET", KEY, u, digits] : ["HDEL", KEY, u]]);
}

// The name each user signs emails with ("Roger C."), set in Usuarios. Missing = their
// portal name. Used for {agent} in Correo → Redactar templates.
const SIG = "pdg:portal:sig"; // hash: lowercase username -> signature name

export async function signatureFor(username: string): Promise<string | null> {
  const [v] = (await db([["HGET", SIG, username.toLowerCase()]])) as [string | null];
  return v || null;
}

export async function teamSignatures(): Promise<Record<string, string>> {
  const [flat] = (await db([["HGETALL", SIG]])) as [string[] | Record<string, string> | null];
  if (!flat) return {};
  if (!Array.isArray(flat)) return flat;
  const out: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = flat[i + 1];
  return out;
}

export async function setSignature(username: string, name: string) {
  const u = username.toLowerCase();
  await db([name ? ["HSET", SIG, u, name] : ["HDEL", SIG, u]]);
}
