import "server-only";
import { db, dbReady } from "./redis";
import { resend, ResendError } from "./resend";

// Contacts live in Resend (so Broadcasts can reach them and unsubscribes are handled
// by Resend). We also keep a small local copy for listing/counting in the portal.

export type LocalContact = {
  email: string;
  firstName: string;
  lastName: string;
  segments: string[]; // segment names
  addedAt: number;
};

const SEG_KEY = (name: string) => `pdg:mail:segment:${name.toLowerCase()}`;
const CONTACTS = "pdg:mail:contacts"; // hash: email -> JSON

/** Finds (or creates) a Resend segment by name and caches its id. */
export async function segmentId(name: string): Promise<string> {
  if (dbReady()) {
    const [cached] = (await db([["GET", SEG_KEY(name)]])) as [string | null];
    if (cached) return cached;
  }
  let id: string | undefined;
  try {
    const list = await resend<{ data?: { id: string; name: string }[] }>("/segments");
    id = list.data?.find((s) => s.name.toLowerCase() === name.toLowerCase())?.id;
  } catch {
    /* listing not available: fall through and create */
  }
  if (!id) id = (await resend<{ id: string }>("/segments", { body: { name } })).id;
  if (dbReady()) await db([["SET", SEG_KEY(name), id]]);
  return id;
}

/** Adds or updates a contact in Resend and puts it in the named segment. */
export async function upsertContact(c: { email: string; firstName?: string; lastName?: string }, segment: string) {
  const email = c.email.trim().toLowerCase();
  const segId = await segmentId(segment);
  try {
    await resend("/contacts", {
      body: {
        email,
        ...(c.firstName ? { first_name: c.firstName } : {}),
        ...(c.lastName ? { last_name: c.lastName } : {}),
        segments: [{ id: segId }],
      },
    });
  } catch (e) {
    // Only when the contact already exists: add the existing contact to the segment.
    const exists = e instanceof ResendError && (e.status === 409 || /already exist/i.test(e.message));
    if (!exists) throw e;
    await resend(`/contacts/${encodeURIComponent(email)}/segments/${segId}`, { method: "POST" });
  }
  if (dbReady()) {
    const [prev] = (await db([["HGET", CONTACTS, email]])) as [string | null];
    const old: LocalContact | null = prev ? JSON.parse(prev) : null;
    const rec: LocalContact = {
      email,
      firstName: c.firstName || old?.firstName || "",
      lastName: c.lastName || old?.lastName || "",
      segments: Array.from(new Set([...(old?.segments ?? []), segment])),
      addedAt: old?.addedAt ?? Date.now(),
    };
    await db([["HSET", CONTACTS, email, JSON.stringify(rec)]]);
  }
}

export async function listLocalContacts(): Promise<LocalContact[]> {
  if (!dbReady()) return [];
  const [flat] = (await db([["HGETALL", CONTACTS]])) as [string[]];
  const out: LocalContact[] = [];
  for (let i = 1; i < (flat?.length ?? 0); i += 2) out.push(JSON.parse(flat[i]));
  return out.sort((a, b) => b.addedAt - a.addedAt);
}
