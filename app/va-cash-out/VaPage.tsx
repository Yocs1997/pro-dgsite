"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, ChevronDown, Clock, CreditCard, Hammer, Home, Landmark, Loader2, Lock, PiggyBank, Phone, ShieldCheck, Star } from "lucide-react";
import { US_STATES, isEmail, phoneDigits } from "@/app/seguros/model";
import { answerVaQuestion, recordVaCallTap, requestVaCallback, startVaLead } from "./actions";
import { BRAND, CALL_PHONE, CONSENT_TEXT, disqualifiers, MAX_AGE, MIN_AGE, PARTNER, QUESTIONS, type Answers, type QuestionId } from "./model";
import type { VaTracking } from "@/app/lib/server/va-leads";

const NAVY = "#0B1F3A";
const RED = "#B22234";

// ─── Tracking (ad names and ids come in the link's URL parameters) ──────────

type Tracking = Partial<Omit<VaTracking, "ip" | "userAgent">>;
const PARAMS: [keyof Tracking, string][] = [
  ["utmSource", "utm_source"], ["utmMedium", "utm_medium"], ["utmCampaign", "utm_campaign"], ["utmContent", "utm_content"],
  ["utmTerm", "utm_term"], ["campaignId", "campaign_id"], ["adsetId", "adset_id"], ["adId", "ad_id"],
  ["placement", "placement"], ["fbclid", "fbclid"],
];

function readTracking(): Tracking {
  let saved: Tracking = {};
  try {
    saved = JSON.parse(sessionStorage.getItem("va_tracking") || "{}");
  } catch {
    /* private mode */
  }
  const q = new URLSearchParams(window.location.search);
  const fresh: Tracking = {};
  for (const [k, p] of PARAMS) if (q.get(p)) fresh[k] = q.get(p)!;
  // A new ad click replaces the old one; otherwise keep what the first visit brought.
  const t: Tracking = fresh.fbclid || fresh.utmCampaign ? fresh : { ...fresh, ...saved };
  if (!t.landingUrl) t.landingUrl = window.location.href;
  if (!t.referrer) t.referrer = document.referrer;
  try {
    sessionStorage.setItem("va_tracking", JSON.stringify(t));
  } catch {
    /* private mode */
  }
  return t;
}

const cookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? "";

function fbq(...args: unknown[]) {
  try {
    (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq?.(...args);
  } catch {
    /* ignore */
  }
}

const formatPhone = (v: string) => {
  const d = phoneDigits(v).replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

// ─── Small UI pieces ─────────────────────────────────────────────────────────

const input = (err?: string) =>
  "w-full rounded-lg border-2 bg-white px-3.5 py-3 text-[17px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 " +
  (err ? "border-red-500 focus:border-red-600" : "border-slate-300 focus:border-[#0B1F3A]");

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[15px] font-semibold text-slate-800">{label}</span>
      {children}
      {error && (
        <span className="flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </span>
      )}
    </label>
  );
}

function StripeBar() {
  return (
    <div aria-hidden className="flex h-1.5">
      <div className="flex-1" style={{ background: RED }} />
      <div className="flex-1 bg-white" />
      <div className="flex-1" style={{ background: RED }} />
      <div className="flex-1 bg-white" />
      <div className="flex-1" style={{ background: RED }} />
    </div>
  );
}

// ─── The form ────────────────────────────────────────────────────────────────

type Contact = { firstName: string; lastName: string; email: string; phone: string; age: string; state: string };
const EMPTY: Contact = { firstName: "", lastName: "", email: "", phone: "", age: "", state: "" };
type Stage = { kind: "contact" } | { kind: "question"; index: number } | { kind: "done" } | { kind: "out"; callback: boolean };

function LeadForm() {
  const [stage, setStage] = useState<Stage>({ kind: "contact" });
  const [c, setC] = useState<Contact>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const lead = useRef<{ id: string; token: string; code: string } | null>(null);
  const tracking = useRef<Tracking>({});
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tracking.current = readTracking();
  }, []);

  const set = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setC((x) => ({ ...x, [k]: k === "phone" ? formatPhone(e.target.value) : e.target.value }));

  const age = Number(c.age);
  const errs: Partial<Record<keyof Contact, string>> = {
    firstName: c.firstName.trim() ? undefined : "Please enter your first name",
    lastName: c.lastName.trim() ? undefined : "Please enter your last name",
    email: c.email.trim() && !isEmail(c.email) ? "Please check your email" : undefined,
    phone: phoneDigits(c.phone).length === 10 ? undefined : "Please enter a 10-digit phone number",
    age: Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE ? undefined : "Please enter your age",
    state: c.state ? undefined : "Please choose your state",
  };
  const show = (k: keyof Contact) => (tried ? errs[k] : undefined);
  const scrollTop = () => top.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError("");
    if (Object.values(errs).some(Boolean)) return setError("Please fix the fields marked in red.");
    if (!consent) return setError("Please check the box so a loan officer can contact you.");
    setBusy("contact");
    const res = await startVaLead({
      ...c,
      consent,
      website,
      tracking: { ...tracking.current, fbp: cookie("_fbp"), fbc: cookie("_fbc") || (tracking.current.fbclid ? `fb.1.${Date.now()}.${tracking.current.fbclid}` : "") },
    }).catch(() => ({ ok: false as const, error: "We couldn't send your details. Please check your connection and try again." }));
    setBusy(null);
    if (!res.ok) return setError(res.error);
    lead.current = res;
    fbq("trackCustom", "VAContact");
    setStage({ kind: "question", index: 0 });
    scrollTop();
  };

  const questions = QUESTIONS;

  const answer = async (id: QuestionId, value: string) => {
    if (busy) return;
    setError("");
    const next = { ...answers, [id]: value };
    setAnswers(next);
    setBusy(value);
    const l = lead.current;
    const res = await answerVaQuestion(l?.id ?? "", l?.token ?? "", id, value).catch(() => ({ ok: false as const, error: "We couldn't save your answer. Please check your connection and try again." }));
    setBusy(null);
    if (!res.ok) return setError(res.error);

    // A ruled-out visitor keeps answering; the reasons are shown once every question is done.
    if (res.status === "disqualified") {
      fbq("trackCustom", "VADisqualified", { reason: disqualifiers(next).map((d) => d.id).join(",") });
      setStage({ kind: "out", callback: false });
    } else if (res.status === "qualified") {
      fbq("track", "Lead", { content_name: "VA cash-out" }, { eventID: l?.code });
      setStage({ kind: "done" });
    } else {
      const i = QUESTIONS.findIndex((q) => !next[q.id]);
      setStage({ kind: "question", index: i === -1 ? QUESTIONS.length - 1 : i });
    }
    scrollTop();
  };

  const askCallback = async () => {
    if (busy) return;
    setError("");
    setBusy("callback");
    const l = lead.current;
    const res = await requestVaCallback(l?.id ?? "", l?.token ?? "").catch(() => ({ ok: false as const, error: "We couldn't send your request. Please check your connection and try again." }));
    setBusy(null);
    if (!res.ok) return setError(res.error);
    fbq("trackCustom", "VACallback");
    setStage({ kind: "out", callback: true });
    scrollTop();
  };

  // "Call us" after the form: the call goes to the campaign line, and the tap is saved on this
  // lead so the team knows who is calling (the phone app opens either way).
  const callTap = () => {
    fbq("track", "Contact", { content_name: "VA cash-out call" });
    const l = lead.current;
    if (l?.id) recordVaCallTap(l.id, l.token).catch(() => {});
  };
  const callUs = (
    <div className="mt-3 w-full max-w-sm rounded-xl border-2 border-slate-200 p-4 flex flex-col items-center gap-2">
      <p className="text-slate-700">Rather talk now? Call us:</p>
      <a
        href={`tel:${CALL_PHONE.tel}`}
        onClick={callTap}
        className="va-display w-full rounded-xl px-4 py-3.5 text-xl text-white shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
        style={{ background: NAVY }}
      >
        <Phone className="w-5 h-5" /> {CALL_PHONE.display}
      </a>
    </div>
  );

  const total = questions.length + 1;
  const position = stage.kind === "contact" ? 0 : stage.kind === "question" ? stage.index + 1 : total;

  return (
    <div ref={top} className="scroll-mt-4 rounded-2xl bg-white shadow-[0_12px_40px_rgba(11,31,58,0.18)] overflow-hidden border border-slate-200">
      <div className="px-5 sm:px-7 pt-5 pb-4 text-white" style={{ background: NAVY }}>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold tracking-wide uppercase">See what you may qualify for</span>
          {stage.kind !== "done" && stage.kind !== "out" && (
            <span className="text-white/70 whitespace-nowrap">
              Step {position + 1} of {total}
            </span>
          )}
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(6, (position / total) * 100)}%`, background: RED }} />
        </div>
      </div>

      <div className="px-5 sm:px-7 py-6">
        {stage.kind === "contact" && (
          <form onSubmit={submitContact} noValidate className="flex flex-col gap-4">
            <div>
              <h2 className="va-display text-2xl text-slate-900">Let&apos;s start with you</h2>
              <p className="text-slate-600 mt-1">So a licensed loan officer knows who to talk to.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" error={show("firstName")}>
                <input className={input(show("firstName"))} value={c.firstName} onChange={set("firstName")} autoComplete="given-name" maxLength={60} />
              </Field>
              <Field label="Last name" error={show("lastName")}>
                <input className={input(show("lastName"))} value={c.lastName} onChange={set("lastName")} autoComplete="family-name" maxLength={60} />
              </Field>
            </div>
            <Field label="Email" error={show("email")}>
              <input className={input(show("email"))} type="email" inputMode="email" value={c.email} onChange={set("email")} autoComplete="email" maxLength={120} />
            </Field>
            <Field label="Phone number" error={show("phone")}>
              <input className={input(show("phone"))} type="tel" inputMode="tel" value={c.phone} onChange={set("phone")} autoComplete="tel-national" placeholder="(555) 555-5555" />
            </Field>
            <div className="grid grid-cols-[6.5rem_1fr] gap-3">
              <Field label="Age" error={show("age")}>
                <input className={input(show("age"))} type="number" inputMode="numeric" min={MIN_AGE} max={MAX_AGE} value={c.age} onChange={set("age")} />
              </Field>
              <Field label="State" error={show("state")}>
                <div className="relative">
                  <select className={input(show("state")) + " appearance-none pr-9"} value={c.state} onChange={set("state")} autoComplete="address-level1">
                    <option value="">Choose…</option>
                    {US_STATES.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                </div>
              </Field>
            </div>
            {/* Honeypot: hidden from people, bots fill it in. */}
            <input tabIndex={-1} aria-hidden autoComplete="off" className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
            <label className="flex gap-3 items-start text-[13px] leading-snug text-slate-600 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-5 h-5 shrink-0 accent-[#0B1F3A]" />
              <span>
                {CONSENT_TEXT} See our{" "}
                <a href="/privacy" target="_blank" className="underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {error && <ErrorBox text={error} />}
            <button
              type="submit"
              disabled={Boolean(busy)}
              className="va-display mt-1 w-full rounded-xl py-4 text-xl text-white shadow-md transition-transform active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
              style={{ background: RED }}
            >
              {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : "Continue →"}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500">
              <Lock className="w-4 h-4" /> Your information is kept private and secure.
            </p>
          </form>
        )}

        {stage.kind === "question" && questions[stage.index] && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="va-display text-2xl text-slate-900">{questions[stage.index].title}</h2>
              {questions[stage.index].hint && <p className="text-slate-600 mt-1">{questions[stage.index].hint}</p>}
            </div>
            <div role="radiogroup" className="flex flex-col gap-2.5">
              {questions[stage.index].options.map(([v, label]) => {
                const q = questions[stage.index];
                const on = answers[q.id] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={Boolean(busy)}
                    onClick={() => answer(q.id, v)}
                    className={
                      "w-full text-left rounded-xl border-2 px-4 py-3.5 text-[17px] font-semibold flex items-center justify-between gap-3 transition-colors " +
                      (on ? "text-white border-transparent" : "bg-white text-slate-800 border-slate-300 hover:border-[#0B1F3A] hover:bg-slate-50")
                    }
                    style={on ? { background: NAVY } : undefined}
                  >
                    <span>{label}</span>
                    {busy === v ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : on ? <Check className="w-5 h-5 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
            {error && <ErrorBox text={error} />}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => setStage(stage.index === 0 ? { kind: "question", index: 0 } : { kind: "question", index: stage.index - 1 })}
              className={"self-start flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-[15px] " + (stage.index === 0 ? "invisible" : "")}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        )}

        {stage.kind === "done" && (
          <div className="text-center flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ background: NAVY }}>
              <Check className="w-9 h-9" />
            </div>
            <h2 className="va-display text-3xl text-slate-900">Thank you, {c.firstName.trim()}!</h2>
            <p className="text-slate-700 text-lg max-w-sm">You&apos;re all set. A licensed loan officer will call you shortly at</p>
            <p className="va-display text-2xl" style={{ color: RED }}>
              {c.phone}
            </p>
            <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-slate-700 max-w-sm w-full">
              <p className="font-semibold text-slate-900 mb-2">To make the call quick, have handy:</p>
              <ul className="flex flex-col gap-1.5">
                {["A recent mortgage statement", "A rough idea of your monthly debts", "Your VA disability rating, if you have one"].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="w-5 h-5 shrink-0 text-emerald-600" /> {x}
                  </li>
                ))}
              </ul>
            </div>
            {callUs}
          </div>
        )}

        {stage.kind === "out" && !stage.callback && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ background: NAVY }}>
              <Star className="w-8 h-8" />
            </div>
            <h2 className="va-display text-3xl text-slate-900">Thank you, {c.firstName.trim()}</h2>
            <p className="text-slate-700 text-lg max-w-sm">
              These programs are for veterans, service members and surviving spouses who own their home and want to access cash from it, so you don&apos;t qualify right now because you said:
            </p>
            <ul className="w-full max-w-sm flex flex-col gap-2 text-left">
              {disqualifiers(answers).map((d) => (
                <li key={d.id} className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <span className="block text-sm text-slate-600">{d.question}</span>
                  <span className="font-bold text-slate-900">&ldquo;{d.answer}&rdquo;</span>
                </li>
              ))}
            </ul>
            {error && <ErrorBox text={error} />}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={askCallback}
              className="va-display mt-2 w-full max-w-sm rounded-xl px-4 py-4 text-lg text-white shadow-md transition-transform active:scale-[0.99] disabled:opacity-70 flex items-center justify-center gap-2"
              style={{ background: RED }}
            >
              {busy === "callback" ? <Loader2 className="w-6 h-6 animate-spin" /> : "If you answered this by mistake, click here so we can call you back"}
            </button>
          </div>
        )}

        {stage.kind === "out" && stage.callback && (
          <div className="text-center flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ background: NAVY }}>
              <Phone className="w-8 h-8" />
            </div>
            <h2 className="va-display text-3xl text-slate-900">Got it, {c.firstName.trim()}!</h2>
            <p className="text-slate-700 text-lg max-w-sm">We saved your information. A loan officer will contact you in a few minutes at</p>
            <p className="va-display text-2xl" style={{ color: RED }}>
              {c.phone}
            </p>
            {callUs}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-red-700 text-[15px]">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> {text}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const OPTIONS = [
  {
    icon: Landmark,
    title: "VA cash-out refinance",
    text: "Replace your current mortgage with a VA loan and take cash out. No monthly mortgage insurance, and you can switch an FHA or conventional loan to VA.",
  },
  {
    icon: CreditCard,
    title: "Home equity line of credit",
    text: "Keep your current mortgage and its rate. Get a credit line backed by your home and use only what you need, when you need it.",
  },
  {
    icon: Home,
    title: "Second mortgage",
    text: "Keep your current mortgage and its rate. Get one lump sum with a fixed monthly payment.",
  },
];

const USES = [
  { icon: CreditCard, title: "Pay off high-interest debt", text: "Roll credit cards and other debt into one monthly payment." },
  { icon: Hammer, title: "Repair or improve your home", text: "Roof, HVAC, kitchen, accessibility upgrades and more." },
  { icon: PiggyBank, title: "Build a cushion", text: "Breathing room for emergencies, medical bills or family." },
];

const STEPS = [
  ["Answer a few questions", "About you and your home. It takes about 30 seconds."],
  ["Talk to a loan officer", "A licensed loan officer calls to go over the options that fit you."],
  ["You decide", "Free, with no obligation. If it doesn't make sense for you, you walk away."],
];

const FAQ = [
  ["Will this affect my credit score?", "No. Answering these questions does not check your credit. If you decide to apply later, the lender will explain any credit check before it happens."],
  ["Is this the VA?", "No. We are not the VA or any government agency. We connect veteran homeowners with licensed lenders who offer VA loans, home equity lines of credit and second mortgages."],
  ["I have a low mortgage rate. Can I still get cash?", "Possibly. A home equity line of credit or a second mortgage lets you access equity while your current mortgage and its rate stay exactly as they are."],
  ["Do I need a VA loan now?", "No. Many veterans who bought with an FHA or conventional loan can refinance into a VA loan, and veterans with any kind of mortgage can look at a home equity line or a second mortgage."],
  ["Do disabled veterans pay the VA funding fee?", "Veterans who receive compensation for a service-connected disability are generally exempt from the VA funding fee. Your loan officer can confirm it for your case."],
];

export default function VaPage() {
  return (
    <div className="va-page min-h-screen bg-[#F7F5F0] text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Source+Sans+3:wght@400;600;700&display=swap');
        .va-page { font-family: 'Source Sans 3', system-ui, sans-serif; }
        .va-display { font-family: 'Oswald', 'Arial Narrow', sans-serif; font-weight: 600; letter-spacing: 0.01em; text-transform: uppercase; line-height: 1.15; }
        .va-stars { background-image: radial-gradient(rgba(255,255,255,0.09) 1.5px, transparent 1.6px); background-size: 26px 26px; }
      `}</style>

      {/* Header */}
      <header style={{ background: NAVY }} className="text-white">
        <StripeBar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/va/icon-192.png" alt="" width={40} height={40} className="w-10 h-10 rounded-lg" />
            <span className="va-display text-lg sm:text-xl">{BRAND}</span>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-sm text-white/75">
            <ShieldCheck className="w-4 h-4" /> Not affiliated with the VA
          </span>
        </div>
      </header>

      {/* Hero + form */}
      <section className="va-stars relative text-white" style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-10 lg:pb-16 grid lg:grid-cols-[1fr_440px] gap-8 lg:gap-12 items-start">
          <div className="lg:pt-6">
            <span className="inline-block rounded px-2.5 py-1 text-sm font-bold uppercase tracking-wider" style={{ background: RED }}>
              For veteran homeowners
            </span>
            <h1 className="va-display text-[34px] sm:text-5xl mt-4">
              Turn your home&apos;s equity into <span style={{ color: "#FF6B6B" }}>cash</span>, on your terms.
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-white/85 max-w-xl">
              VA cash-out refinance, home equity line of credit or second mortgage. Answer a few quick questions and a licensed loan officer will walk you
              through the options you may qualify for.
            </p>
            <ul className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-2.5 text-[17px]">
              {[
                [Check, "Free, no obligation"],
                [ShieldCheck, "Won't affect your credit score"],
                [Clock, "Takes about 30 seconds"],
              ].map(([Icon, t]) => {
                const I = Icon as typeof Check;
                return (
                  <li key={t as string} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10">
                      <I className="w-4 h-4" />
                    </span>
                    {t as string}
                  </li>
                );
              })}
            </ul>
          </div>
          <LeadForm />
        </div>
      </section>

      {/* Options */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="va-display text-3xl sm:text-4xl text-center" style={{ color: NAVY }}>
          Three ways to access your equity
        </h2>
        <p className="text-center text-slate-600 text-lg mt-2 max-w-2xl mx-auto">Your loan officer helps you pick the one that fits. You don&apos;t have to know which one you need.</p>
        <div className="grid md:grid-cols-3 gap-5 mt-8">
          {OPTIONS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm border-t-4" style={{ borderTopColor: RED }}>
              <Icon className="w-9 h-9" style={{ color: NAVY }} />
              <h3 className="va-display text-xl mt-3" style={{ color: NAVY }}>
                {title}
              </h3>
              <p className="text-slate-700 mt-2 text-[17px]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Uses */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="va-display text-3xl sm:text-4xl text-center" style={{ color: NAVY }}>
            What veterans use it for
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {USES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <span className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white" style={{ background: RED }}>
                  <Icon className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{title}</h3>
                  <p className="text-slate-700 text-[17px]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <h2 className="va-display text-3xl sm:text-4xl text-center" style={{ color: NAVY }}>
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-5 mt-8">
          {STEPS.map(([title, text], i) => (
            <div key={title} className="rounded-2xl p-6 text-white" style={{ background: NAVY }}>
              <span className="va-display text-4xl" style={{ color: "#FF6B6B" }}>
                {i + 1}
              </span>
              <h3 className="va-display text-xl mt-2">{title}</h3>
              <p className="text-white/80 mt-1 text-[17px]">{text}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="va-display inline-flex items-center gap-2 rounded-xl px-8 py-4 text-xl text-white shadow-md"
            style={{ background: RED }}
          >
            See what I may qualify for →
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
          <h2 className="va-display text-3xl sm:text-4xl text-center" style={{ color: NAVY }}>
            Common questions
          </h2>
          <div className="mt-8 flex flex-col gap-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-slate-200 bg-[#F7F5F0] px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-lg text-slate-900">
                  {q}
                  <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-slate-700 text-[17px]">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white/70 text-sm" style={{ background: NAVY }}>
        <StripeBar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-3 leading-relaxed">
          <p className="flex items-center gap-2 text-white">
            <Phone className="w-4 h-4" /> A licensed loan officer will call you after you finish the questions.
          </p>
          <p>
            {BRAND} is a marketing service, not a lender. {BRAND} does not make loans or credit decisions, and is not licensed to
            make mortgage loans. The information you submit is shared with {PARTNER} so a licensed loan officer can contact you.
          </p>
          <p>
            Not affiliated with, endorsed by or acting on behalf of the U.S. Department of Veterans Affairs or any government agency. Not all applicants
            will qualify. Loan approval, rates and terms depend on credit, income, property value and other factors, and are set by the lender.
          </p>
          <p>
            <a href="/privacy" className="underline hover:text-white">
              Privacy Policy
            </a>{" "}
            · © {new Date().getFullYear()} {BRAND}
          </p>
        </div>
      </footer>
    </div>
  );
}
