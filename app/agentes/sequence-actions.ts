"use server";

import { getSession } from "./_lib/auth";
import { isEmail } from "@/app/seguros/model";
import { stateLabel } from "@/app/lib/contact-details";
import { listLocalContacts } from "@/app/lib/server/contacts";
import { resendReady } from "@/app/lib/server/resend";
import { defaultInsuranceSequence } from "@/app/lib/server/sequence-default";
import { defaultTagsSequence } from "@/app/lib/server/sequence-tags";
import {
  deleteSequence,
  enroll,
  getSequence,
  leadVarsByEmail,
  processDue,
  saveSequence,
  sendTest,
  sequenceProblems,
  stopOne,
  syncResendUnsubscribes,
  type Audience,
  type Lang,
  type Sequence,
  type Step,
} from "@/app/lib/server/sequences";

async function requireAdmin() {
  const u = await getSession();
  if (!u || u.role !== "admin") throw new Error("No autorizado");
  return u;
}
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const failure = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Error inesperado" });
const safeId = (id: unknown) => {
  const v = clean(id, 64);
  if (!/^[a-z0-9_-]+$/i.test(v)) throw new Error("Registro inválido");
  return v;
};
const bi = (v: unknown, max: number) => {
  const o = (v ?? {}) as { es?: unknown; en?: unknown };
  return { es: clean(o.es, max), en: clean(o.en, max) };
};

function sanitize(input: Sequence, prev: Sequence): Sequence {
  const steps: Step[] = (Array.isArray(input.steps) ? input.steps : []).slice(0, 15).map((s, i) => ({
    id: /^[a-z0-9_-]{1,40}$/i.test(String(s?.id)) ? String(s.id) : `s${Date.now().toString(36)}${i}`,
    day: Math.max(0, Math.min(90, Math.round(Number(s?.day) || 0))),
    audience: (["all", "uninsured", "insured"].includes(String(s?.audience)) ? s.audience : "all") as Audience,
    subject: bi(s?.subject, 200),
    preview: bi(s?.preview, 200),
    body: bi(s?.body, 8000),
    button: bi(s?.button, 60),
  }));
  const url = clean(input.buttonUrl, 300);
  return {
    ...prev,
    name: clean(input.name, 80) || prev.name,
    company: clean(input.company, 80),
    agentName: clean(input.agentName, 40),
    phone: clean(input.phone, 30),
    buttonUrl: /^https:\/\//.test(url) ? url : prev.buttonUrl,
    autoEnrollForm: Boolean(input.autoEnrollForm),
    formFor: (["insurance", "tags", "other"] as const).find((k) => k === input.formFor) ?? "all",
    active: Boolean(input.active),
    steps,
    updatedAt: Date.now(),
  };
}

export async function createInsuranceSequence() {
  try {
    await requireAdmin();
    const seq = defaultInsuranceSequence();
    await saveSequence(seq);
    return { ok: true as const, id: seq.id };
  } catch (e) {
    return failure(e);
  }
}

/** New sequence: "blank" (one empty email), "copy" (duplicate of `fromId`, paused, no one enrolled) or "insurance" (template). */
export async function newSequence(kind: "blank" | "copy" | "insurance" | "tags", fromId?: string) {
  try {
    await requireAdmin();
    const now = Date.now();
    const id = `seq-${now.toString(36)}`;
    let seq: Sequence;
    if (kind === "insurance") seq = { ...defaultInsuranceSequence(now), id };
    else if (kind === "tags") seq = { ...defaultTagsSequence(now), id };
    else if (kind === "copy") {
      const src = await getSequence(safeId(fromId));
      if (!src) return { ok: false as const, error: "La secuencia original ya no existe." };
      seq = { ...src, id, name: `${src.name} (copia)`, active: false, autoEnrollForm: false, createdAt: now, updatedAt: now };
    } else {
      const base = defaultInsuranceSequence(now);
      seq = {
        ...base,
        id,
        name: "Nueva secuencia",
        agentName: "",
        steps: [
          {
            id: "s1",
            day: 0,
            audience: "all",
            subject: { es: "", en: "" },
            preview: { es: "", en: "" },
            body: { es: "Hola {{name}},\n\n\n\n{{agent}}, {{phone}}", en: "Hi {{name}},\n\n\n\n{{agent}}, {{phone}}" },
            button: { es: "", en: "" },
          },
        ],
      };
    }
    await saveSequence(seq);
    return { ok: true as const, id: seq.id };
  } catch (e) {
    return failure(e);
  }
}

export async function saveSequenceAction(input: Sequence) {
  try {
    await requireAdmin();
    const prev = await getSequence(safeId(input?.id));
    if (!prev) return { ok: false as const, error: "La secuencia ya no existe." };
    const next = sanitize(input, prev);
    const problems = sequenceProblems(next);
    if (next.active && problems.length) return { ok: false as const, error: `No se puede activar todavía: ${problems.join(" ")}` };
    await saveSequence(next);
    return { ok: true as const, sequence: next, problems };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteSequenceAction(id: string) {
  try {
    await requireAdmin();
    await deleteSequence(safeId(id));
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

/** Enrolls everyone in the chosen lists (a contact in several lists is enrolled once). */
export async function enrollLists(id: string, segments: string[], lang: Lang) {
  try {
    await requireAdmin();
    const seq = await getSequence(safeId(id));
    if (!seq) return { ok: false as const, error: "La secuencia ya no existe." };
    const chosen = new Set((Array.isArray(segments) ? segments : []).map((s) => clean(s, 60)).filter(Boolean));
    if (!chosen.size) return { ok: false as const, error: "Elige al menos una lista." };
    if (resendReady()) await syncResendUnsubscribes().catch((e) => console.error("[sequences] unsub sync failed", e));
    const contacts = (await listLocalContacts()).filter((c) => c.segments.some((s) => chosen.has(s)));
    const leads = await leadVarsByEmail();
    const fallbackLang: Lang = lang === "en" ? "en" : "es";
    const res = await enroll(
      seq,
      contacts.map((c) => {
        // Details typed into the contact list win; otherwise use their quote form, if any.
        const l = leads.get(c.email.toLowerCase());
        return {
          email: c.email,
          firstName: c.firstName || l?.firstName || "",
          lang: c.lang || l?.lang || fallbackLang,
          vehicle: c.vehicle || l?.vehicle || "",
          state: c.state ? stateLabel(c.state) : l?.state || "",
          insured: c.insured || l?.insured || "",
          product: l?.product || "",
          source: c.segments.filter((s) => chosen.has(s)).join(", "),
        };
      })
    );
    return { ok: true as const, ...res, total: contacts.length };
  } catch (e) {
    return failure(e);
  }
}

export async function stopEnrollment(id: string, email: string) {
  try {
    await requireAdmin();
    await stopOne(safeId(id), clean(email, 200).toLowerCase(), "manual");
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}

/** Sends whatever is due right now (same as the daily run). */
export async function runSequencesNow() {
  try {
    await requireAdmin();
    if (!resendReady()) return { ok: false as const, error: "Falta configurar RESEND_API_KEY y MAIL_FROM." };
    return { ok: true as const, ...(await processDue(200)) };
  } catch (e) {
    return failure(e);
  }
}

export async function sendSequenceTest(id: string, stepId: string, to: string, lang: Lang) {
  try {
    await requireAdmin();
    const seq = await getSequence(safeId(id));
    const step = seq?.steps.find((s) => s.id === stepId);
    if (!seq || !step) return { ok: false as const, error: "Guarda la secuencia antes de enviar una prueba." };
    const addr = clean(to, 120);
    if (!isEmail(addr)) return { ok: false as const, error: "Correo de prueba inválido." };
    await sendTest(seq, step, addr, lang === "en" ? "en" : "es");
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}
