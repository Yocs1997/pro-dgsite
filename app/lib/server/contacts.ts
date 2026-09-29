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
  // Optional details used to personalize sequence emails (stored only here, not in Resend).
  phone?: string;
  state?: string; // two-letter code
  stateGuessed?: boolean; // true when the state came from the phone's area code
  vehicle?: string;
  lang?: "es" | "en";
  insured?: string; // yes | lapsed | no
};

export type ContactDetails = Partial<Pick<LocalContact, "phone" | "state" | "stateGuessed" | "vehicle" | "lang" | "insured">>;

/** New non-empty values win; empty ones keep what was there. */
function mergeDetails(old: LocalContact | null, d: ContactDetails): ContactDetails {
  const out: ContactDetails = {};
  const keys = ["phone", "state", "vehicle", "lang", "insured"] as const;
  for (const k of keys) {
    const v = (d[k] as string | undefined) || (old?.[k] as string | undefined);
    if (v) (out as Record<string, string>)[k] = v;
  }
  // A typed-in state replaces a guessed one; a guess never replaces a typed-in state.
  if (d.state && !d.stateGuessed) out.stateGuessed = false;
  else if (d.state && d.stateGuessed) {
    if (old?.state && !old.stateGuessed) {
      out.state = old.state;
      out.stateGuessed = false;
    } else out.stateGuessed = true;
  } else out.stateGuessed = old?.stateGuessed ?? false;
  if (!out.state) delete out.stateGuessed;
  return out;
}

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
export async function upsertContact(c: { email: string; firstName?: string; lastName?: string } & ContactDetails, segment: string) {
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
      ...mergeDetails(old, c),
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

/** Returns the local contact records for these emails (null when unknown). */
export async function getLocalContacts(emails: string[]): Promise<(LocalContact | null)[]> {
  if (!dbReady() || !emails.length) return emails.map(() => null);
  const [raw] = (await db([["HMGET", CONTACTS, ...emails.map((e) => e.trim().toLowerCase())]])) as [(string | null)[]];
  return (raw ?? []).map((r) => (r ? (JSON.parse(r) as LocalContact) : null));
}

/** Renames a contact (in Resend and locally) and updates its details (locally). */
export async function updateContact(email: string, names: { firstName: string; lastName: string }, details?: ContactDetails) {
  const key = email.trim().toLowerCase();
  await resend(`/contacts/${encodeURIComponent(key)}`, { method: "PATCH", body: { first_name: names.firstName, last_name: names.lastName } });
  if (dbReady()) {
    const [prev] = (await db([["HGET", CONTACTS, key]])) as [string | null];
    if (prev) {
      const old = JSON.parse(prev) as LocalContact;
      const rec: LocalContact = { ...old, ...names };
      if (details) {
        // Edited by hand: take the values as given (empty clears them).
        for (const k of ["phone", "state", "vehicle", "lang", "insured"] as const) {
          const v = details[k];
          if (v) (rec as Record<string, unknown>)[k] = v;
          else delete (rec as Record<string, unknown>)[k];
        }
        if (rec.state) rec.stateGuessed = Boolean(details.stateGuessed);
        else delete rec.stateGuessed;
      }
      await db([["HSET", CONTACTS, key, JSON.stringify(rec)]]);
    }
  }
}

/** Takes a contact out of one list (in Resend and locally). The contact itself is kept. */
export async function removeFromSegment(email: string, segment: string): Promise<"removed" | "not-in-list"> {
  const key = email.trim().toLowerCase();
  let local: LocalContact | null = null;
  if (dbReady()) {
    const [prev] = (await db([["HGET", CONTACTS, key]])) as [string | null];
    local = prev ? (JSON.parse(prev) as LocalContact) : null;
  }
  const inLocal = Boolean(local?.segments.some((s) => s.toLowerCase() === segment.toLowerCase()));
  const segId = await segmentId(segment);
  let inResend = true;
  try {
    await resend(`/contacts/${encodeURIComponent(key)}/segments/${segId}`, { method: "DELETE" });
  } catch (e) {
    // Not a contact / not in that list in Resend: fine, nothing to remove there.
    if (!(e instanceof ResendError && (e.status === 404 || e.status === 422))) throw e;
    inResend = false;
  }
  if (local && inLocal) {
    local.segments = local.segments.filter((s) => s.toLowerCase() !== segment.toLowerCase());
    await db([["HSET", CONTACTS, key, JSON.stringify(local)]]);
  }
  return inResend || inLocal ? "removed" : "not-in-list";
}

/** Deletes a contact everywhere, so it won't receive future campaigns. */
export async function deleteContact(email: string) {
  const key = email.trim().toLowerCase();
  try {
    await resend(`/contacts/${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch (e) {
    if (!(e instanceof ResendError && e.status === 404)) throw e; // already gone in Resend
  }
  if (dbReady()) await db([["HDEL", CONTACTS, key]]);
}
