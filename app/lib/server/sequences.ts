import { DEFAULT_PRODUCT, leadService, productLabel } from "@/app/lib/lead-service";
import "server-only";
import { randomBytes } from "node:crypto";
import { db, listRecords } from "./redis";
import { resend, mailFrom, mailReplyTo, esc } from "./resend";
import { listLeads, type InsuranceLead } from "./insurance";
import { STEP_STAT_KEY } from "./mail-tracking";
import { getLocalContacts } from "./contacts";
import { notifyTelegram, tg } from "./telegram";
import { normalizeState, stateLabel } from "@/app/lib/contact-details";

// Automated email sequences ("drip"): a list of steps sent N days after a contact
// is enrolled. Contacts are enrolled from one or more contact lists (segments) or
// automatically when they submit the /seguros form.
//
// A contact leaves a sequence when they reply, unsubscribe, bounce, report spam,
// when their lead is marked "vendida"/"perdida", or when an admin stops it.
// At most one sequence email per contact every 12 hours; the cron runs daily.

export type Lang = "es" | "en";
export type Audience = "all" | "uninsured" | "insured";
export type Bi = { es: string; en: string };

export type Step = {
  id: string;
  day: number; // days after enrollment (0 = right away)
  audience: Audience; // "uninsured" = no insurance or lapsed; "insured" = everyone else
  subject: Bi;
  preview: Bi;
  body: Bi; // plain text, blank line = new paragraph, {{tokens}}
  button: Bi; // button label ("" = no button)
};

export type Sequence = {
  id: string;
  name: string;
  active: boolean;
  autoEnrollForm: boolean; // new /seguros leads join automatically (Email 1 replaces the confirmation)
  company: string; // shown in the From name and footer
  agentName: string; // {{agent}}
  phone: string; // {{phone}}
  buttonUrl: string;
  steps: Step[];
  createdAt: number;
  updatedAt: number;
};

export type Enrollment = {
  seqId: string;
  email: string;
  firstName: string;
  lang: Lang;
  vehicle: string;
  state: string;
  insured: string; // yes | lapsed | no | ""
  product?: string; // service picked on the Meta form ("placas de virginia"); "" = unknown, undefined = not looked up yet
  source: string; // "Formulario" or list name
  enrolledAt: number;
  sent: { stepId: string; at: number; emailId: string }[];
  lastSentAt: number;
  status: "active" | "done" | "stopped";
  stopReason?: string;
  stoppedAt?: number;
};

const DEF_KEY = (id: string) => `pdg:seq:def:${id}`;
const DEF_INDEX = "pdg:seq:defs";
const ENR_KEY = (seq: string, email: string) => `pdg:seq:enr:${seq}:${email}`;
const ENR_INDEX = (seq: string) => `pdg:seq:enrs:${seq}`;
const DUE = "pdg:seq:due"; // member `${seq}|${email}`, score = next time to look at it
const OF = (email: string) => `pdg:seq:of:${email}`; // set of seq ids the email is/was in
const UNSUB = "pdg:mail:unsub"; // set of unsubscribed emails
const TOK = (t: string) => `pdg:mail:unsubtok:${t}`;
const TOK_OF = (email: string) => `pdg:mail:unsubtok-of:${email}`;

const DAY = 24 * 3600 * 1000;
const MIN_GAP = 12 * 3600 * 1000;
const norm = (e: string) => e.trim().toLowerCase();

export const STOP_REASONS: Record<string, string> = {
  reply: "Respondió",
  unsubscribed: "Se dio de baja",
  bounced: "Correo rebotado",
  complained: "Lo marcó como spam",
  vendida: "Compró (vendida)",
  perdida: "Perdida",
  manual: "Detenido manualmente",
  inactive: "Secuencia desactivada",
};

// ─── Sequence definitions ────────────────────────────────────────────────────

export const listSequences = () => listRecords<Sequence>(DEF_INDEX, DEF_KEY, 50);

export async function getSequence(id: string): Promise<Sequence | null> {
  const [raw] = (await db([["GET", DEF_KEY(id)]])) as [string | null];
  return raw ? (JSON.parse(raw) as Sequence) : null;
}

export async function saveSequence(s: Sequence) {
  const cmds: (string | number)[][] = [
    ["SET", DEF_KEY(s.id), JSON.stringify(s)],
    ["ZADD", DEF_INDEX, s.createdAt, s.id],
  ];
  await db(cmds);
  // Only one sequence may take the form leads.
  if (s.autoEnrollForm) {
    for (const o of await listSequences()) {
      if (o.id !== s.id && o.autoEnrollForm) await db([["SET", DEF_KEY(o.id), JSON.stringify({ ...o, autoEnrollForm: false })]]);
    }
  }
}

export async function deleteSequence(id: string) {
  const [emails] = (await db([["ZRANGE", ENR_INDEX(id), 0, -1]])) as [string[]];
  const cmds: (string | number)[][] = [["DEL", DEF_KEY(id), ENR_INDEX(id)], ["ZREM", DEF_INDEX, id]];
  for (const e of emails ?? []) cmds.push(["DEL", ENR_KEY(id, e)], ["ZREM", DUE, `${id}|${e}`], ["SREM", OF(e), id]);
  await db(cmds);
}

/** Problems that must be fixed before a sequence may send. */
export function sequenceProblems(s: Sequence): string[] {
  const out: string[] = [];
  if (!s.agentName.trim()) out.push("Falta el nombre del agente ({{agente}}).");
  if (!s.company.trim()) out.push("Falta el nombre de la empresa.");
  if (!s.steps.length) out.push("La secuencia no tiene correos.");
  if (!process.env.MAIL_POSTAL_ADDRESS) out.push("Falta MAIL_POSTAL_ADDRESS (la ley exige la dirección postal en el pie).");
  for (const [i, st] of s.steps.entries()) {
    for (const lang of ["es", "en"] as const) {
      const all = `${st.subject[lang]} ${st.preview[lang]} ${st.body[lang]} ${st.button[lang]}`;
      if (!st.subject[lang].trim() || !st.body[lang].trim()) out.push(`Correo ${i + 1} (${lang.toUpperCase()}): falta asunto o texto.`);
      const ph = all.replace(/\[(boton|botón|button)\]/gi, "").match(/\[[^\]]{2,}\]/);
      if (ph) out.push(`Correo ${i + 1} (${lang.toUpperCase()}): reemplaza el texto provisional ${ph[0]}.`);
    }
  }
  return out;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

const FALLBACK: Record<string, Bi> = {
  name: { es: "", en: "there" },
  vehicle: { es: "tu auto", en: "your car" },
  state: { es: "tu estado", en: "your state" },
  product: DEFAULT_PRODUCT,
};
const ALIAS: Record<string, string> = { nombre: "name", vehiculo: "vehicle", "vehículo": "vehicle", estado: "state", agente: "agent", telefono: "phone", "teléfono": "phone", producto: "product", servicio: "product", service: "product" };

type Vars = { name: string; vehicle: string; state: string; agent: string; phone: string; product: string };

function fill(text: string, v: Vars, lang: Lang, html: boolean): string {
  return text.replace(/\{\{\s*([\p{L}]+)\s*(?:\|([^}]*))?\}\}/gu, (_m, raw: string, fb?: string) => {
    const key = ALIAS[raw.toLowerCase()] ?? raw.toLowerCase();
    const val = (v as Record<string, string>)[key] ?? "";
    const out = val || (fb !== undefined ? fb : FALLBACK[key]?.[lang] ?? "");
    if (!html) return out;
    if (key === "phone" && val) return `<a href="tel:+1${val.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")}" style="color:#0B57D0">${esc(val)}</a>`;
    // In HTML mode the surrounding text (and so `fb`) is already escaped.
    return val ? esc(val) : fb !== undefined ? fb : esc(out);
  });
}

/** A paragraph that is just [boton] / [button] marks where the button goes (default: at the end). */
const BUTTON_MARK = /^\[(boton|botón|button)\]$/i;

/** Greeting fix-up: "Hola ," → "Hola,". */
const tidy = (s: string) => s.replace(/ +([,!?.])/g, "$1").replace(/ {2,}/g, " ");

export function renderStep(seq: Sequence, step: Step, e: Pick<Enrollment, "firstName" | "lang" | "vehicle" | "state" | "product">, unsubUrl: string) {
  const lang = e.lang;
  // {{product}}: the service the lead picked, said in the email's language ("Virginia tags").
  const product = e.product ? productLabel(e.product, lang) : "";
  const v: Vars = { name: e.firstName, vehicle: e.vehicle, state: e.state, agent: seq.agentName, phone: seq.phone, product };
  const subject = tidy(fill(step.subject[lang], v, lang, false)).trim();
  const preview = tidy(fill(step.preview[lang], v, lang, false)).trim();
  const paras = step.body[lang].trim().split(/\n{2,}/);
  const p = (inner: string) => `<p style="margin:0 0 16px;line-height:1.6">${inner}</p>`;
  const bodyHtml = paras
    .map((para) => {
      if (BUTTON_MARK.test(para.trim())) return "{{BUTTON}}";
      return p(tidy(fill(esc(para), v, lang, true)).replace(/\n/g, "<br>"));
    })
    .join("");
  const button = step.button[lang].trim()
    ? `<p style="margin:8px 0 24px"><a href="${esc(seq.buttonUrl)}" style="display:inline-block;background:#0B57D0;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${esc(tidy(fill(step.button[lang], v, lang, false)))}</a></p>`
    : "";
  const withButton = bodyHtml.includes("{{BUTTON}}") ? bodyHtml.replace("{{BUTTON}}", button) : bodyHtml + button;
  const address = process.env.MAIL_POSTAL_ADDRESS ?? "";
  const unsubText = lang === "es" ? "Darme de baja" : "Unsubscribe";
  const footer = `${esc(seq.company)} · ${esc(address)}<br><a href="${esc(unsubUrl)}" style="color:#5b6b82">${unsubText}</a>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2937">
<tr><td>${withButton}</td></tr>
<tr><td style="padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;line-height:1.5">${footer}</td></tr>
</table></td></tr></table></body></html>`;
  const buttonText = step.button[lang].trim() ? `${tidy(fill(step.button[lang], v, lang, false)).replace(/\s*[→>]+\s*$/, "")}: ${seq.buttonUrl}` : "";
  const hasMark = paras.some((x) => BUTTON_MARK.test(x.trim()));
  const text =
    paras
      .map((para) => (BUTTON_MARK.test(para.trim()) ? buttonText : tidy(fill(para, v, lang, false))))
      .filter(Boolean)
      .join("\n\n") +
    (buttonText && !hasMark ? `\n\n${buttonText}` : "") +
    `\n\n--\n${seq.company} · ${address}\n${unsubText}: ${unsubUrl}`;
  return { subject, html, text };
}

// ─── Unsubscribe ─────────────────────────────────────────────────────────────

const siteUrl = () => (process.env.SITE_URL || "https://www.pro-dg.com").replace(/\/$/, "");

/** Opaque token for the unsubscribe link (no email address in the URL). */
export async function unsubToken(email: string): Promise<string> {
  const e = norm(email);
  const [have] = (await db([["GET", TOK_OF(e)]])) as [string | null];
  if (have) return have;
  const t = randomBytes(18).toString("base64url");
  await db([["SET", TOK(t), e], ["SET", TOK_OF(e), t]]);
  return t;
}
export const unsubUrlFor = (token: string) => `${siteUrl()}/api/unsubscribe?t=${encodeURIComponent(token)}`;

export async function emailForToken(token: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) return null;
  const [e] = (await db([["GET", TOK(token)]])) as [string | null];
  return e;
}

export async function isUnsubscribed(emails: string[]): Promise<Set<string>> {
  if (!emails.length) return new Set();
  const res = await db(emails.map((e) => ["SISMEMBER", UNSUB, norm(e)]));
  return new Set(emails.filter((_, i) => Number(res[i]) === 1).map(norm));
}

/**
 * Records an unsubscribe everywhere: local list, Resend contact, active sequences.
 * `why` only changes the Telegram message; it is sent once per email address.
 */
export async function unsubscribe(email: string, alsoResend = true, why: "link" | "complained" | "resend" = "link") {
  const e = norm(email);
  const [added] = (await db([["SADD", UNSUB, e]])) as [number];
  const stopped = await stopFor(e, why === "complained" ? "complained" : "unsubscribed");
  if (Number(added) === 1) {
    const head =
      why === "complained" ? "⚠️ <b>Marcó un correo como spam</b>" : why === "resend" ? "🚫 <b>Se dio de baja de las campañas</b>" : "🚫 <b>Se dio de baja</b>";
    await notifyTelegram(`${head}\n${tg(e)}${stopped ? `\nSalió de ${stopped} secuencia(s).` : ""}`);
  }
  if (alsoResend) {
    try {
      await resend(`/contacts/${encodeURIComponent(e)}`, { method: "PATCH", body: { unsubscribed: true } });
    } catch {
      /* not a Resend contact: the local list is enough */
    }
  }
}

/** Copies unsubscribes recorded in Resend (e.g. from campaign links) into the local list. */
export async function syncResendUnsubscribes(maxPages = 50): Promise<number> {
  let after = "";
  let found = 0;
  for (let page = 0; page < maxPages; page++) {
    const res = await resend<{ data?: { id: string; email: string; unsubscribed?: boolean }[]; has_more?: boolean }>(
      `/contacts?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`
    );
    const rows = res.data ?? [];
    const unsub = rows.filter((c) => c.unsubscribed && c.email).map((c) => norm(c.email));
    if (unsub.length) await db([["SADD", UNSUB, ...unsub]]);
    found += unsub.length;
    if (!res.has_more || !rows.length) break;
    after = rows[rows.length - 1].id;
  }
  return found;
}

// ─── Enrollment ──────────────────────────────────────────────────────────────

export type EnrollInput = { email: string; firstName?: string; lang?: Lang; vehicle?: string; state?: string; insured?: string; product?: string; source: string };

function varsFromLead(l: InsuranceLead) {
  const v = l.vehicles?.[0];
  const vehicle = v ? [v.year, v.make, v.model].filter(Boolean).join(" ") : "";
  return {
    vehicle,
    state: stateName(l.driver?.state ?? ""),
    insured: l.coverage?.insured ?? "",
    firstName: l.driver?.firstName ?? "",
    lang: l.lang,
    product: leadService(l),
  };
}

const stateName = (s: string) => (s ? stateLabel(normalizeState(s) || s) : "");

/** Most recent lead data per email, to personalize list contacts who also filled the form. */
export async function leadVarsByEmail(): Promise<Map<string, ReturnType<typeof varsFromLead>>> {
  const out = new Map<string, ReturnType<typeof varsFromLead>>();
  for (const l of await listLeads(1000)) {
    const e = l.driver?.email ? norm(l.driver.email) : "";
    if (e && !out.has(e)) out.set(e, varsFromLead(l)); // listLeads is newest first
  }
  return out;
}
export { varsFromLead };

/**
 * Enrolls contacts. Skips anyone unsubscribed or already in (or previously in) this sequence.
 * Returns how many were added and why others were skipped.
 */
export async function enroll(seq: Sequence, people: EnrollInput[]) {
  const list = Array.from(new Map(people.filter((p) => p.email).map((p) => [norm(p.email), p])).values());
  const emails = list.map((p) => norm(p.email));
  const unsub = await isUnsubscribed(emails);
  const exists = emails.length ? await db(emails.map((e) => ["EXISTS", ENR_KEY(seq.id, e)])) : [];
  const now = Date.now();
  const cmds: (string | number)[][] = [];
  let added = 0,
    skippedUnsub = 0,
    skippedDup = 0;
  list.forEach((p, i) => {
    const e = emails[i];
    if (unsub.has(e)) return void skippedUnsub++;
    if (Number(exists[i]) === 1) return void skippedDup++;
    const enr: Enrollment = {
      seqId: seq.id,
      email: e,
      firstName: (p.firstName ?? "").trim(),
      lang: p.lang === "en" ? "en" : "es",
      vehicle: p.vehicle ?? "",
      state: p.state ?? "",
      insured: p.insured ?? "",
      product: p.product ?? "",
      source: p.source,
      enrolledAt: now,
      sent: [],
      lastSentAt: 0,
      status: "active",
    };
    cmds.push(["SET", ENR_KEY(seq.id, e), JSON.stringify(enr)], ["ZADD", ENR_INDEX(seq.id), now, e], ["ZADD", DUE, now, `${seq.id}|${e}`], ["SADD", OF(e), seq.id]);
    added++;
  });
  for (let i = 0; i < cmds.length; i += 400) await db(cmds.slice(i, i + 400));
  return { added, skippedUnsub, skippedDup };
}

export async function listEnrollments(seqId: string, limit = 2000): Promise<Enrollment[]> {
  return listRecords<Enrollment>(ENR_INDEX(seqId), (e) => ENR_KEY(seqId, e), limit);
}

async function getEnrollment(seqId: string, email: string): Promise<Enrollment | null> {
  const [raw] = (await db([["GET", ENR_KEY(seqId, email)]])) as [string | null];
  return raw ? (JSON.parse(raw) as Enrollment) : null;
}

/** Stops every active sequence for this email. */
/** Stops every active sequence for this email. Returns how many were stopped. */
export async function stopFor(email: string, reason: string): Promise<number> {
  const e = norm(email);
  const [ids] = (await db([["SMEMBERS", OF(e)]])) as [string[]];
  let n = 0;
  for (const id of ids ?? []) if (await stopOne(id, e, reason)) n++;
  return n;
}

export async function stopOne(seqId: string, email: string, reason: string): Promise<boolean> {
  const enr = await getEnrollment(seqId, norm(email));
  if (!enr || enr.status !== "active") return false;
  enr.status = "stopped";
  enr.stopReason = reason;
  enr.stoppedAt = Date.now();
  const cmds: (string | number)[][] = [["SET", ENR_KEY(seqId, enr.email), JSON.stringify(enr)], ["ZREM", DUE, `${seqId}|${enr.email}`]];
  // Credit replies and unsubscribes to the last email they received.
  const last = enr.sent[enr.sent.length - 1];
  if (last && (reason === "reply" || reason === "unsubscribed")) cmds.push(["HINCRBY", STEP_STAT_KEY(seqId, last.stepId), reason === "reply" ? "replied" : "unsubscribed", 1]);
  await db(cmds);
  return true;
}

// ─── Sending ─────────────────────────────────────────────────────────────────

const matches = (st: Step, insured: string) =>
  st.audience === "all" || (st.audience === "uninsured" ? insured === "no" || insured === "lapsed" : !(insured === "no" || insured === "lapsed"));

/** The steps this contact will get, in send order. On the same day, a step for a specific group goes first. */
export const stepsFor = (seq: Sequence, insured: string) =>
  seq.steps
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => matches(s, insured))
    .sort((a, b) => a.s.day - b.s.day || Number(a.s.audience === "all") - Number(b.s.audience === "all") || a.i - b.i)
    .map(({ s }) => s);

/** When the next step is due (ms), or null when the contact has received everything. */
export function nextFor(seq: Sequence, e: Enrollment): { step: Step; at: number } | null {
  const done = new Set(e.sent.map((x) => x.stepId));
  const step = stepsFor(seq, e.insured).find((s) => !done.has(s.id));
  if (!step) return null;
  // Day N is due from half a day early, so a once-a-day run doesn't slip a whole day.
  const byDay = step.day === 0 ? e.enrolledAt : e.enrolledAt + step.day * DAY - DAY / 2;
  const byGap = e.lastSentAt ? e.lastSentAt + MIN_GAP : 0;
  return { step, at: Math.max(byDay, byGap) };
}

const fromFor = (seq: Sequence) => {
  const addr = mailFrom().match(/<([^>]+)>/)?.[1] ?? mailFrom();
  const name = `${seq.agentName} at ${seq.company}`.replace(/["<>]/g, "");
  return `"${name}" <${addr}>`;
};

type Job = { seq: Sequence; enr: Enrollment; step: Step };

/** Fills details still missing on an enrollment from the contact record (e.g. after re-importing a list with more columns). */
async function fillFromContacts(jobs: Job[]) {
  const need = jobs.filter(({ enr }) => !enr.firstName || !enr.vehicle || !enr.state || !enr.insured);
  if (!need.length) return;
  const recs = await getLocalContacts(need.map(({ enr }) => enr.email));
  need.forEach(({ enr }, i) => {
    const c = recs[i];
    if (!c) return;
    if (!enr.firstName && c.firstName) enr.firstName = c.firstName;
    if (!enr.vehicle && c.vehicle) enr.vehicle = c.vehicle;
    if (!enr.state && c.state) enr.state = stateName(c.state);
    if (!enr.insured && c.insured) enr.insured = c.insured;
  });
}

/** People enrolled before {{product}} existed: look up once what their lead asked for. */
async function fillProductFromLeads(jobs: Job[]) {
  const need = jobs.filter(({ enr }) => enr.product === undefined);
  if (!need.length) return;
  const leads = await leadVarsByEmail();
  need.forEach(({ enr }) => (enr.product = leads.get(enr.email)?.product ?? ""));
}

async function sendJobs(jobs: Job[]): Promise<(string | null)[]> {
  // Nice to have: never let it block sending.
  await fillFromContacts(jobs).catch((e) => console.error("[sequences] could not read contact details", e));
  await fillProductFromLeads(jobs).catch((e) => console.error("[sequences] could not read the leads' service", e));
  const out: (string | null)[] = [];
  for (let i = 0; i < jobs.length; i += 100) {
    const chunk = jobs.slice(i, i + 100);
    const payload = await Promise.all(
      chunk.map(async ({ seq, enr, step }) => {
        const url = unsubUrlFor(await unsubToken(enr.email));
        const r = renderStep(seq, step, enr, url);
        return {
          from: fromFor(seq),
          to: [enr.email],
          subject: r.subject,
          html: r.html,
          text: r.text,
          ...(mailReplyTo() ? { reply_to: mailReplyTo() } : {}),
          headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          tags: [
            { name: "category", value: "sequence" },
            { name: "seq", value: seq.id },
            { name: "step", value: step.id },
          ],
        };
      })
    );
    try {
      const res = await resend<{ data?: { id: string }[] }>("/emails/batch", { body: payload });
      chunk.forEach((_, k) => out.push(res.data?.[k]?.id ?? ""));
    } catch (e) {
      console.error("[sequences] batch send failed", e);
      chunk.forEach(() => out.push(null));
    }
  }
  return out;
}

async function markSent(jobs: Job[], ids: (string | null)[]) {
  const now = Date.now();
  const cmds: (string | number)[][] = [];
  jobs.forEach(({ seq, enr, step }, k) => {
    const member = `${seq.id}|${enr.email}`;
    if (ids[k] === null) {
      cmds.push(["ZADD", DUE, now + 3600e3, member]); // retry later
      return;
    }
    enr.sent.push({ stepId: step.id, at: now, emailId: ids[k] ?? "" });
    enr.lastSentAt = now;
    const next = nextFor(seq, enr);
    if (!next) {
      enr.status = "done";
      cmds.push(["ZREM", DUE, member]);
    } else cmds.push(["ZADD", DUE, next.at, member]);
    cmds.push(["SET", ENR_KEY(seq.id, enr.email), JSON.stringify(enr)]);
  });
  for (let i = 0; i < cmds.length; i += 400) await db(cmds.slice(i, i + 400));
}

/** Sends everything that is due now (up to `limit` emails). */
export async function processDue(limit = 500): Promise<{ sent: number; failed: number; remaining: number }> {
  const now = Date.now();
  const [members] = (await db([["ZRANGEBYSCORE", DUE, 0, now, "LIMIT", 0, limit]])) as [string[]];
  if (!members?.length) return { sent: 0, failed: 0, remaining: 0 };

  const seqs = new Map<string, Sequence | null>();
  const pairs = members.map((m) => {
    const i = m.indexOf("|");
    return { seqId: m.slice(0, i), email: m.slice(i + 1), member: m };
  });
  for (const { seqId } of pairs) if (!seqs.has(seqId)) seqs.set(seqId, await getSequence(seqId));
  const raws = await db(pairs.map((p) => ["GET", ENR_KEY(p.seqId, p.email)]));
  const unsub = await isUnsubscribed(pairs.map((p) => p.email));

  const jobs: Job[] = [];
  const later: (string | number)[][] = [];
  pairs.forEach((p, k) => {
    const seq = seqs.get(p.seqId);
    const raw = raws[k] as string | null;
    if (!seq || !raw) return void later.push(["ZREM", DUE, p.member]);
    const enr = JSON.parse(raw) as Enrollment;
    if (enr.status !== "active") return void later.push(["ZREM", DUE, p.member]);
    if (unsub.has(enr.email)) {
      enr.status = "stopped";
      enr.stopReason = "unsubscribed";
      enr.stoppedAt = now;
      later.push(["SET", ENR_KEY(p.seqId, enr.email), JSON.stringify(enr)], ["ZREM", DUE, p.member]);
      return;
    }
    if (!seq.active) return void later.push(["ZADD", DUE, now + DAY / 2, p.member]); // paused: look again later
    const next = nextFor(seq, enr);
    if (!next) {
      enr.status = "done";
      later.push(["SET", ENR_KEY(p.seqId, enr.email), JSON.stringify(enr)], ["ZREM", DUE, p.member]);
    } else if (next.at > now) later.push(["ZADD", DUE, next.at, p.member]);
    else jobs.push({ seq, enr, step: next.step });
  });
  if (later.length) await db(later);

  const ids = await sendJobs(jobs);
  await markSent(jobs, ids);
  const [remaining] = (await db([["ZCOUNT", DUE, 0, Date.now()]])) as [number];
  return { sent: ids.filter((x) => x !== null).length, failed: ids.filter((x) => x === null).length, remaining: Number(remaining) };
}

/** Sends the day-0 step right away to one freshly enrolled contact (used by the form). */
export async function sendNowFor(seq: Sequence, email: string): Promise<boolean> {
  const enr = await getEnrollment(seq.id, norm(email));
  if (!enr || enr.status !== "active" || !seq.active) return false;
  const next = nextFor(seq, enr);
  if (!next || next.at > Date.now()) return false;
  const jobs = [{ seq, enr, step: next.step }];
  const ids = await sendJobs(jobs);
  await markSent(jobs, ids);
  return ids[0] !== null;
}

/** Sends one step to a test address (not recorded; marked [PRUEBA]). */
export async function sendTest(seq: Sequence, step: Step, to: string, lang: Lang) {
  const sample = { firstName: "Maria", lang, vehicle: "2019 Honda Civic", state: "New York", product: "placas de virginia" };
  const r = renderStep(seq, step, sample, `${siteUrl()}/api/unsubscribe?t=test`);
  return resend<{ id: string }>("/emails", {
    body: {
      from: fromFor(seq),
      to: [to],
      subject: `[PRUEBA] ${r.subject}`,
      html: r.html,
      text: r.text,
      ...(mailReplyTo() ? { reply_to: mailReplyTo() } : {}),
      tags: [{ name: "category", value: "test" }],
    },
  });
}

export async function formSequence(): Promise<Sequence | null> {
  return (await listSequences()).find((s) => s.active && s.autoEnrollForm) ?? null;
}
