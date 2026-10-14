"use server";

import { headers } from "next/headers";
import { allow, dbReady } from "@/app/lib/server/redis";
import { createVaLead, getVaLead, saveVaLead, type VaLead, type VaLeadStatus, type VaTracking } from "@/app/lib/server/va-leads";
import { notifyTelegram, portalLink, tg } from "@/app/lib/server/telegram";
import { isEmail, phoneDigits, US_STATES } from "@/app/seguros/model";
import {
  activeQuestions,
  CONSENT_TEXT,
  disqualifiers,
  leadFlags,
  likelyProduct,
  MAX_AGE,
  MIN_AGE,
  optionLabel,
  QUESTIONS,
  type Answers,
  type QuestionId,
} from "./model";

// The /va-cash-out form. Step 1 (contact details + consent) creates the lead; every answer
// after that is added to it, so drop-offs still count as partial leads. When the last
// question is answered (or an answer rules the visitor out) the lead is final.

export type VaContactInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
  state: string;
  consent: boolean;
  tracking: Partial<VaTracking>;
  website?: string; // honeypot, must stay empty
};

export type VaStartResult = { ok: true; id: string; token: string; code: string } | { ok: false; error: string };
export type VaAnswerResult = { ok: true; status: "partial" | "qualified" | "disqualified" } | { ok: false; error: string };

const clip = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);
const TRACKING_KEYS: (keyof VaTracking)[] = [
  "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "campaignId", "adsetId", "adId",
  "placement", "fbclid", "fbc", "fbp", "landingUrl", "referrer",
];

async function requestInfo() {
  const h = await headers();
  return { ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown", userAgent: clip(h.get("user-agent"), 300) };
}

export async function startVaLead(input: VaContactInput): Promise<VaStartResult> {
  if (clip(input?.website)) return { ok: true, id: "", token: "", code: "VA-0000" };
  if (!dbReady()) return { ok: false, error: "The form isn't available right now. Please try again later." };

  const { ip, userAgent } = await requestInfo();
  if (!(await allow(`pdg:rl:va:${ip}`, 6, 3600))) return { ok: false, error: "Too many requests from your connection. Please try again later." };

  const contact = {
    firstName: clip(input?.firstName, 60),
    lastName: clip(input?.lastName, 60),
    email: clip(input?.email, 120).toLowerCase(),
    phone: clip(input?.phone, 30),
    age: Math.round(Number(input?.age)),
    state: clip(input?.state, 2).toUpperCase(),
  };
  if (
    !contact.firstName ||
    !contact.lastName ||
    (contact.email && !isEmail(contact.email)) ||
    phoneDigits(contact.phone).replace(/^1(?=\d{10}$)/, "").length !== 10 ||
    !(contact.age >= MIN_AGE && contact.age <= MAX_AGE) ||
    !US_STATES.some(([c]) => c === contact.state)
  ) {
    return { ok: false, error: "Some details are missing. Please review the fields marked in red." };
  }
  if (!input?.consent) return { ok: false, error: "Please check the box so we can contact you." };

  const tracking = Object.fromEntries(TRACKING_KEYS.map((k) => [k, clip(input?.tracking?.[k], k === "landingUrl" || k === "referrer" ? 500 : 200)])) as Omit<VaTracking, "ip" | "userAgent">;
  const now = Date.now();
  try {
    const lead = await createVaLead({
      createdAt: now,
      updatedAt: now,
      status: "partial",
      contact,
      answers: {},
      tracking: { ...tracking, ip, userAgent },
      consent: { text: CONSENT_TEXT, at: now, ip, url: tracking.landingUrl },
    });
    return { ok: true, id: lead.id, token: lead.token, code: lead.code };
  } catch (e) {
    console.error("[va] could not save lead", e);
    return { ok: false, error: "We couldn't save your details. Please try again." };
  }
}

export async function answerVaQuestion(id: string, token: string, question: QuestionId, value: string): Promise<VaAnswerResult> {
  if (!id) return { ok: true, status: "partial" }; // honeypot visitor
  if (!dbReady()) return { ok: false, error: "The form isn't available right now. Please try again later." };
  const q = QUESTIONS.find((x) => x.id === question);
  if (!q || !q.options.some(([v]) => v === value)) return { ok: false, error: "Please choose one of the options." };

  try {
    const lead = await getVaLead(clip(id, 40));
    if (!lead || lead.token !== token) return { ok: false, error: "Your session expired. Please reload the page." };
    if (lead.status !== "partial") return { ok: true, status: lead.status };

    const answers: Answers = { ...lead.answers, [question]: value };
    // A paid-off home has no rate or balance; drop them if the visitor went back and changed it.
    for (const k of Object.keys(answers) as QuestionId[]) if (!activeQuestions(answers).some((x) => x.id === k)) delete answers[k];

    // Everyone answers every question; a ruled-out visitor is only marked once they finish.
    const now = Date.now();
    const finished = activeQuestions(answers).every((x) => answers[x.id]);
    Object.assign(lead, { answers, updatedAt: now });
    const out = disqualifiers(answers).map((d) => d.id);
    const status: VaLeadStatus = !finished ? "partial" : out.length ? "disqualified" : "qualified";
    if (finished) Object.assign(lead, { status, completedAt: now, product: likelyProduct(answers), flags: leadFlags(answers), ...(out.length ? { disqualifiedFor: out } : {}) });
    await saveVaLead(lead);
    if (status === "qualified") await notifyTelegram(vaTelegram(lead), process.env.TELEGRAM_VA_CHAT_ID || undefined);
    return { ok: true, status };
  } catch (e) {
    console.error("[va] could not save answer", e);
    return { ok: false, error: "We couldn't save your answer. Please try again." };
  }
}

/** A ruled-out visitor says they answered by mistake: keep the lead and ask the team to call. */
export async function requestVaCallback(id: string, token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: true }; // honeypot visitor
  if (!dbReady()) return { ok: false, error: "The form isn't available right now. Please try again later." };
  try {
    const lead = await getVaLead(clip(id, 40));
    if (!lead || lead.token !== token) return { ok: false, error: "Your session expired. Please reload the page." };
    if (lead.status !== "disqualified") return { ok: true };
    if (!lead.callbackRequestedAt) {
      Object.assign(lead, { callbackRequestedAt: Date.now(), updatedAt: Date.now() });
      await saveVaLead(lead);
      await notifyTelegram(vaTelegram(lead), process.env.TELEGRAM_VA_CHAT_ID || undefined);
    }
    return { ok: true };
  } catch (e) {
    console.error("[va] could not save call-back request", e);
    return { ok: false, error: "We couldn't send your request. Please try again." };
  }
}

function vaTelegram(l: VaLead): string {
  const c = l.contact;
  const a = l.answers;
  const t = l.tracking;
  const lines = [
    l.callbackRequestedAt
      ? `📞 <b>VA lead asked for a call back</b> · ${tg(l.code)}\n<i>Ruled out by: ${tg(disqualifiers(l.answers).map((d) => `"${d.answer}"`).join(" and "))}. Says it was a mistake.</i>`
      : `🇺🇸 <b>New VA cash-out lead</b> · ${tg(l.code)}`,
    `<b>${tg(`${c.firstName} ${c.lastName}`)}</b> · ${tg(c.age)} · ${tg(c.state)}`,
    `📞 ${tg(c.phone)}${c.email ? `\n✉️ ${tg(c.email)}` : ""}`,
    `🎖 ${tg(optionLabel("served", a.served))} · 🏠 ${tg(optionLabel("loanType", a.loanType))}${a.rate ? ` at ${tg(optionLabel("rate", a.rate))}` : ""}`,
    `💵 Wants ${tg(optionLabel("cashAmount", a.cashAmount))} for ${tg(optionLabel("purpose", a.purpose).toLowerCase())}`,
    `🏡 Worth ${tg(optionLabel("homeValue", a.homeValue))}${a.balance ? ` · owes ${tg(optionLabel("balance", a.balance))}` : ""}`,
    `📊 Credit: ${tg(optionLabel("credit", a.credit))}`,
    `👉 Likely product: <b>${tg(l.product)}</b>`,
    ...(l.flags?.length ? [`⚠️ ${tg(l.flags.join(" · "))}`] : []),
    ...(t.utmContent || t.utmCampaign ? [`<i>Ad: ${tg(t.utmContent || "—")} · ${tg(t.utmCampaign)}</i>`] : []),
  ];
  return [lines.join("\n"), portalLink("", "Open the portal")].join("\n\n");
}
