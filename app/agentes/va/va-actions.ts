"use server";

import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { deleteVaLead, getVaLead, saveVaLead, type VaLead, type VaLeadStatus, type VaNote } from "@/app/lib/server/va-leads";
import { isEmail, phoneDigits, US_STATES } from "@/app/seguros/model";
import { disqualifiers, MAX_AGE, MIN_AGE, QUESTIONS, VA_DISPOSITIONS, type Answers } from "@/app/va-cash-out/model";

// Working the VA leads from the portal: disposition, notes, edit, delete.
// Admins and the "VA campaign" users may do all of it.

async function requireVa() {
  const u = await getSession();
  if (!u || (u.role !== "admin" && u.role !== "va")) throw new Error("Not allowed.");
  if (!dbReady()) throw new Error("The database isn't connected.");
  return u;
}
const fail = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Something went wrong." });
const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);

async function load(id: string): Promise<VaLead> {
  const lead = await getVaLead(clip(id, 40));
  if (!lead) throw new Error("This lead no longer exists.");
  return lead;
}

export async function setVaDisposition(id: string, disposition: string) {
  try {
    const user = await requireVa();
    const d = clip(disposition, 40);
    if (d && !VA_DISPOSITIONS.some(([k]) => k === d)) return { ok: false as const, error: "Pick a disposition from the list." };
    const lead = await load(id);
    const now = Date.now();
    Object.assign(lead, { disposition: d || undefined, dispositionAt: d ? now : undefined, dispositionBy: d ? user.name : undefined, updatedAt: now });
    await saveVaLead(lead);
    return { ok: true as const, disposition: d, dispositionAt: d ? now : 0, dispositionBy: d ? user.name : "" };
  } catch (e) {
    return fail(e);
  }
}

export async function addVaNote(id: string, text: string) {
  try {
    const user = await requireVa();
    const t = String(text ?? "").trim().slice(0, 2000);
    if (!t) return { ok: false as const, error: "Write a note first." };
    const lead = await load(id);
    const note: VaNote = { at: Date.now(), by: user.name, text: t };
    lead.notes = [...(lead.notes ?? []), note].slice(-200);
    lead.updatedAt = note.at;
    await saveVaLead(lead);
    return { ok: true as const, note };
  } catch (e) {
    return fail(e);
  }
}

export type VaEdit = { firstName: string; lastName: string; email: string; phone: string; age: string; state: string; answers: Answers };

/** Corrects the contact details or answers. The status is worked out again from the answers. */
export async function editVaLead(id: string, input: VaEdit) {
  try {
    const user = await requireVa();
    const contact = {
      firstName: clip(input?.firstName, 60),
      lastName: clip(input?.lastName, 60),
      email: clip(input?.email, 120).toLowerCase(),
      phone: clip(input?.phone, 30),
      age: Math.round(Number(input?.age)),
      state: clip(input?.state, 2).toUpperCase(),
    };
    if (!contact.firstName) return { ok: false as const, error: "First name is required." };
    if (contact.email && !isEmail(contact.email)) return { ok: false as const, error: "That email doesn't look right." };
    if (phoneDigits(contact.phone).replace(/^1(?=\d{10}$)/, "").length !== 10) return { ok: false as const, error: "Phone needs 10 digits." };
    if (!(contact.age >= MIN_AGE && contact.age <= MAX_AGE)) return { ok: false as const, error: `Age must be ${MIN_AGE}–${MAX_AGE}.` };
    if (!US_STATES.some(([c]) => c === contact.state)) return { ok: false as const, error: "Pick a state." };
    const answers: Answers = {};
    for (const q of QUESTIONS) {
      const v = clip(input?.answers?.[q.id], 40);
      if (v && q.options.some(([o]) => o === v)) answers[q.id] = v;
    }

    const lead = await load(id);
    const now = Date.now();
    const finished = QUESTIONS.every((q) => answers[q.id]);
    const out = disqualifiers(answers).map((d) => d.id);
    const status: VaLeadStatus = !finished ? "partial" : out.length ? "disqualified" : "qualified";
    Object.assign(lead, { contact, answers, status, updatedAt: now, editedBy: user.name });
    if (finished) lead.completedAt ??= now;
    if (out.length) lead.disqualifiedFor = out;
    else delete lead.disqualifiedFor;
    await saveVaLead(lead);
    return { ok: true as const, lead: { contact, answers, status, disqualifiedFor: lead.disqualifiedFor ?? [], editedBy: user.name } };
  } catch (e) {
    return fail(e);
  }
}

export async function removeVaLead(id: string) {
  try {
    await requireVa();
    const lead = await load(id);
    await deleteVaLead(lead.id);
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}
