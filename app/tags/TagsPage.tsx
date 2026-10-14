"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  FileText,
  Globe,
  Languages,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { compressImage } from "@/app/lib/compress-image";
import { COMMON_MAKES, isEmail, phoneDigits, type Lang } from "@/app/seguros/model";
import { submitTagsRequest } from "./actions";
import { PHOTO_KINDS, TAG_SERVICES, TAG_STATES, type PhotoKind, type TagService } from "./model";

const PHONE_URL = "tel:+12402566360";
const PHONE_DISPLAY = "(240) 256-6360";
const BG = "#0B2B5E";
const SEGUROS: Record<Lang, string> = { en: "/seguros", es: "/es/seguros" };

// ─── Copy ────────────────────────────────────────────────────────────────────

const COPY = {
  es: {
    home: "Inicio",
    callUs: "Llámanos",
    badge: "Placas y registro",
    title1: "Placas y registro de tu carro",
    title2: "en 6 estados",
    sub: "Maryland, Virginia, New Jersey, Pennsylvania, New York y South Dakota. Mándanos fotos de tu título y tu ID, las revisamos y te decimos qué sigue.",
    perks: ["Revisamos tus documentos", "Atención en español e inglés", "Oficina en Baltimore, Maryland"],
    statesTitle: "Nuestros servicios por estado",
    statesSub: "Toca un estado para empezar tu solicitud.",
    stateServices: "Placas · Placas temporales · Registro",
    start: "Empezar",
    howTitle: "Cómo funciona",
    how: [
      ["Llena el formulario", "Tus datos, el estado y el servicio que necesitas."],
      ["Sube tus fotos", "Tu ID y tu título, tomadas con el teléfono."],
      ["Te decimos qué sigue", "Revisamos tus documentos y te contactamos con los pasos y el precio."],
    ],
    formTitle: "Solicita tus placas o registro",
    formSub: "Toma unos 2 minutos.",
    service: "¿Qué necesitas?",
    state: "¿De qué estado?",
    you: "Tus datos",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo electrónico",
    phone: "Teléfono",
    zip: "Código postal donde vives",
    zipFound: (c: string, s: string) => `${c}, ${s}`,
    vehicle: "Tu vehículo",
    year: "Año",
    make: "Marca",
    model: "Modelo",
    vin: "VIN",
    vinHelp: "17 caracteres. Está en el título o en el parabrisas.",
    photos: "Fotos de tus documentos",
    photosSub: "Tómalas con tu teléfono, con buena luz y que se lean bien.",
    photoAdd: "Subir o tomar foto",
    photoRemove: "Quitar",
    photoBusy: "Procesando foto…",
    photoError: "No pudimos leer esa imagen. Prueba con una foto JPG o PNG.",
    noTitle: "¿No tienes el título a la mano o no sabes si es el papel correcto? Llámanos al",
    notes: "Comentarios",
    notesPh: "Algo más que debamos saber (fechas, dudas, etc.)",
    optional: "opcional",
    required: "Obligatorio",
    consent: "Confirmo que la información es correcta y acepto que me contacten por correo o teléfono sobre mi solicitud.",
    consentError: "Debes aceptar para enviar tu solicitud.",
    fixErrors: "Revisa los campos marcados en rojo.",
    submit: "Enviar solicitud",
    sending: "Enviando…",
    privacy: "Tus documentos solo se usan para tu trámite y no se comparten.",
    thanks: (n: string) => (n ? `¡Gracias, ${n}!` : "¡Gracias!"),
    successText: (e: string) => `Recibimos tu solicitud y tus fotos. Te escribiremos a ${e} con los siguientes pasos.`,
    successCode: "Número de solicitud",
    successSpam: "Revisa también tu carpeta de spam o promociones.",
    newRequest: "Nueva solicitud",
    insTitle: "¿También necesitas seguro para tu carro?",
    insSub: "Comparamos opciones de varias aseguradoras y te enviamos tu cotización por correo. Es gratis.",
    insCta: "Cotizar mi seguro",
  },
  en: {
    home: "Home",
    callUs: "Call us",
    badge: "Tags & registration",
    title1: "Tags and registration for your car",
    title2: "in 6 states",
    sub: "Maryland, Virginia, New Jersey, Pennsylvania, New York and South Dakota. Send us photos of your title and ID, we review them and tell you what's next.",
    perks: ["We review your documents", "Service in English & Spanish", "Office in Baltimore, Maryland"],
    statesTitle: "Our services by state",
    statesSub: "Tap a state to start your request.",
    stateServices: "Tags · Temporary tags · Registration",
    start: "Start",
    howTitle: "How it works",
    how: [
      ["Fill out the form", "Your details, the state and the service you need."],
      ["Upload your photos", "Your ID and your title, taken with your phone."],
      ["We tell you what's next", "We review your documents and contact you with the steps and the price."],
    ],
    formTitle: "Request your tags or registration",
    formSub: "It takes about 2 minutes.",
    service: "What do you need?",
    state: "Which state?",
    you: "Your details",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    phone: "Phone",
    zip: "ZIP code where you live",
    zipFound: (c: string, s: string) => `${c}, ${s}`,
    vehicle: "Your vehicle",
    year: "Year",
    make: "Make",
    model: "Model",
    vin: "VIN",
    vinHelp: "17 characters. It's on the title or the windshield.",
    photos: "Photos of your documents",
    photosSub: "Take them with your phone, in good light, so they're easy to read.",
    photoAdd: "Upload or take photo",
    photoRemove: "Remove",
    photoBusy: "Processing photo…",
    photoError: "We couldn't read that image. Please try a JPG or PNG photo.",
    noTitle: "Don't have your title handy, or not sure it's the right paper? Call us at",
    notes: "Comments",
    notesPh: "Anything else we should know (dates, questions, etc.)",
    optional: "optional",
    required: "Required",
    consent: "I confirm the information is correct and I agree to be contacted by email or phone about my request.",
    consentError: "Please accept to submit your request.",
    fixErrors: "Please fix the fields marked in red.",
    submit: "Submit request",
    sending: "Sending…",
    privacy: "Your documents are only used for your request and are never shared.",
    thanks: (n: string) => (n ? `Thank you, ${n}!` : "Thank you!"),
    successText: (e: string) => `We received your request and your photos. We'll email ${e} with the next steps.`,
    successCode: "Request number",
    successSpam: "Please also check your spam or promotions folder.",
    newRequest: "New request",
    insTitle: "Need car insurance too?",
    insSub: "We compare options from several carriers and email you your quote. It's free.",
    insCta: "Get my insurance quote",
  },
};

// ─── Small UI pieces ─────────────────────────────────────────────────────────

const fieldBase = "w-full rounded-xl border bg-white/[0.06] px-4 py-3 text-white outline-none transition-colors placeholder:text-white/35 focus:bg-white/[0.09]";
const border = (err?: string) => (err ? "border-red-400/70 focus:border-red-300" : "border-[#7cc4ff33] focus:border-[#33aaff]");

function Field({ label, error, hint, optional, children }: { label: string; error?: string; hint?: string; optional?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-sm font-medium text-sky-text/90">
        {label}
        {optional && <span className="ml-1 text-xs font-normal text-sky-text/50">({optional})</span>}
      </span>
      {children}
      {error ? (
        <span className="flex items-center gap-1 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-sky-text/50">{hint}</span>
      ) : null}
    </label>
  );
}

function Pills<T extends string>({ value, onChange, options, error }: { value: T | ""; onChange: (v: T) => void; options: [T, string][]; error?: string }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map(([v, l]) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            aria-invalid={Boolean(error) && !value}
            onClick={() => onChange(v)}
            className={
              "px-4 py-2.5 rounded-xl border text-sm font-medium transition-all " +
              (on
                ? "bg-electric border-electric text-white shadow-[0_0_18px_rgba(0,150,255,0.35)]"
                : "bg-white/[0.05] text-sky-text/85 hover:border-[#33aaff] " + (error ? "border-red-400/70" : "border-[#7cc4ff33]"))
            }
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

type Form = {
  service: TagService | "";
  state: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
  city: string;
  homeState: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  notes: string;
};

const EMPTY: Form = { service: "", state: "", firstName: "", lastName: "", email: "", phone: "", zip: "", city: "", homeState: "", year: "", make: "", model: "", vin: "", notes: "" };

/** Photos the request needs: the ID always, the title too unless it's a registration. */
const neededPhotos = (service: TagService | ""): PhotoKind[] => (service === "registration" ? ["id"] : ["id", "title-front"]);

export default function TagsPage({ initialLang = "en", mailingAddress = "" }: { initialLang?: Lang; mailingAddress?: string }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const c = COPY[lang];
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const [f, setF] = useState<Form>(EMPTY);
  const [photos, setPhotos] = useState<Partial<Record<PhotoKind, string>>>({});
  const [busy, setBusy] = useState<PhotoKind | null>(null);
  const [photoErr, setPhotoErr] = useState(false);
  const [zipFound, setZipFound] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; email: string; name: string } | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  // ZIP → city + state (where they live).
  useEffect(() => {
    const zip = f.zip;
    if (!/^\d{5}$/.test(zip)) {
      setZipFound("");
      return;
    }
    let cancelled = false;
    fetch(`/api/zip?z=${zip}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; city?: string; state?: string }) => {
        if (cancelled) return;
        if (j.ok && j.city && j.state) {
          setF((p) => (p.zip === zip ? { ...p, city: j.city!, homeState: j.state! } : p));
          setZipFound(`${j.city}, ${j.state}`);
        } else setZipFound("");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [f.zip]);

  const addPhoto = async (kind: PhotoKind, file: File | undefined) => {
    if (!file) return;
    setPhotoErr(false);
    setBusy(kind);
    try {
      // Documents stay readable at 1500px; under ~0.8 MB each so 4 fit in one request.
      const url = await compressImage(file, { maxSide: 1500, quality: 0.8, target: 800_000, limit: 950_000 });
      setPhotos((p) => ({ ...p, [kind]: url }));
    } catch {
      setPhotoErr(true);
    } finally {
      setBusy(null);
    }
  };

  // Errors (shown after the first "Enviar").
  const req = c.required;
  const errors: Record<string, string> = {};
  if (!f.service) errors.service = req;
  if (!f.state) errors.state = req;
  if (!f.firstName.trim()) errors.firstName = req;
  if (!isEmail(f.email)) errors.email = f.email ? (lang === "es" ? "Correo no válido" : "Invalid email") : req;
  if (phoneDigits(f.phone).length < 10) errors.phone = f.phone ? (lang === "es" ? "Mínimo 10 dígitos" : "At least 10 digits") : req;
  if (f.zip && !/^\d{5}$/.test(f.zip)) errors.zip = lang === "es" ? "5 dígitos" : "5 digits";
  if (f.vin && f.vin.length !== 17) errors.vin = lang === "es" ? "El VIN tiene 17 caracteres" : "VIN must be 17 characters";
  for (const k of neededPhotos(f.service)) if (!photos[k]) errors[`photo-${k}`] = req;
  if (!consent) errors.consent = c.consentError;
  const E = (k: string) => (tried ? errors[k] : undefined);
  const hasErrors = tried && Object.keys(errors).length > 0;

  const pickState = (code: string) => {
    set("state", code);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = () => {
    setTried(true);
    setServerError(null);
    if (Object.keys(errors).length) {
      setTimeout(() => {
        const el = document.querySelector("[aria-invalid='true']") as HTMLElement | null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    start(async () => {
      const res = await submitTagsRequest({
        lang,
        service: f.service as TagService,
        state: f.state,
        firstName: f.firstName,
        lastName: f.lastName,
        email: f.email,
        phone: f.phone,
        zip: f.zip,
        city: f.city,
        homeState: f.homeState,
        year: f.year,
        make: f.make,
        model: f.model,
        vin: f.vin,
        notes: f.notes,
        photos: PHOTO_KINDS.filter((k) => photos[k.id]).map((k) => ({ kind: k.id, data: photos[k.id]! })),
        consent,
        website,
      });
      if (!res.ok) return setServerError(res.error);
      setDone({ code: res.code, email: res.email || f.email, name: f.firstName });
      if (!website) {
        try {
          const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
          fbq?.("track", "Lead", { content_name: "Tags & registration", lang }, { eventID: res.code });
        } catch {
          /* ignore */
        }
      }
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const restart = () => {
    setF(EMPTY);
    setPhotos({});
    setConsent(false);
    setTried(false);
    setDone(null);
  };

  const years = Array.from({ length: new Date().getFullYear() + 2 - 1980 }, (_, i) => String(new Date().getFullYear() + 1 - i));

  const photoSlot = (kind: PhotoKind) => {
    const k = PHOTO_KINDS.find((x) => x.id === kind)!;
    const url = photos[kind];
    const needed = neededPhotos(f.service).includes(kind);
    const err = E(`photo-${kind}`);
    return (
      <div key={kind} className="flex flex-col gap-2 min-w-0">
        <span className="text-sm font-medium text-sky-text/90">
          {k[lang]}
          {!needed && <span className="ml-1 text-xs font-normal text-sky-text/50">({c.optional})</span>}
        </span>
        {url ? (
          <div className="relative rounded-xl overflow-hidden border border-emerald-300/50 bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={k[lang]} className="w-full h-36 object-contain" />
            <button
              type="button"
              onClick={() => setPhotos((p) => ({ ...p, [kind]: undefined }))}
              className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs hover:bg-red-500/80"
            >
              <Trash2 className="w-3.5 h-3.5" /> {c.photoRemove}
            </button>
          </div>
        ) : (
          <label
            aria-invalid={Boolean(err)}
            className={
              "flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white/[0.04] text-sm text-sky-text/80 hover:border-[#33aaff] hover:bg-white/[0.07] transition-colors " +
              (err ? "border-red-400/70" : "border-[#7cc4ff55]")
            }
          >
            {busy === kind ? <Loader2 className="w-6 h-6 animate-spin text-electric-light" /> : <Camera className="w-6 h-6 text-electric-light" />}
            {busy === kind ? c.photoBusy : c.photoAdd}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                addPhoto(kind, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {err && (
          <span className="flex items-center gap-1 text-xs text-red-300">
            <AlertCircle className="w-3.5 h-3.5" /> {err}
          </span>
        )}
      </div>
    );
  };

  const card = "rounded-2xl border border-[#7cc4ff26] bg-white/[0.04] p-5 sm:p-6";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
        html, body { background-color: ${BG} !important; }
      `}</style>

      <div
        lang={lang}
        className="min-h-screen relative overflow-x-hidden text-white"
        style={{
          backgroundColor: BG,
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(51,170,255,0.28), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,150,255,0.18), transparent 70%)",
        }}
      >
        <div className="absolute inset-0 grid-lines opacity-70 pointer-events-none" />

        {/* Nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#7cc4ff20] backdrop-blur-xl" style={{ background: "rgba(11,43,94,0.78)" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <a href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
                <Zap className="w-4 h-4 text-white" fill="white" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">
                Pro<span className="text-electric-light">-DG</span>
              </span>
            </a>
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="/" className="hidden sm:flex items-center gap-1.5 text-sm text-sky-text/80 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> {c.home}
              </a>
              <a href={SEGUROS[lang]} className="hidden md:flex items-center gap-1.5 text-sm text-sky-text/80 hover:text-white">
                <ShieldCheck className="w-4 h-4" /> {c.insCta}
              </a>
              <button
                type="button"
                onClick={() => setLang(lang === "es" ? "en" : "es")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#7cc4ff55] bg-[#0096ff14] hover:bg-[#0096ff26] text-xs font-mono font-bold text-[#7cc4ff] tracking-widest"
                aria-label={lang === "es" ? "Switch to English" : "Cambiar a español"}
              >
                <Globe className="w-3 h-3" /> {lang === "es" ? "EN" : "ES"}
              </button>
              <a href={PHONE_URL} aria-label={`${c.callUs} ${PHONE_DISPLAY}`} className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-electric hover:bg-electric-light text-sm font-semibold glow-electric-sm">
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {c.callUs} {PHONE_DISPLAY}
                </span>
              </a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7cc4ff55] bg-[#0096ff1f] mb-6">
            <FileText className="w-3.5 h-3.5 text-electric-light" />
            <span className="text-xs font-mono tracking-widest text-[#7cc4ff] uppercase">{c.badge}</span>
          </div>
          <motion.h1 key={lang} initial={false} animate={{ opacity: 1 }} className="font-display font-black text-4xl sm:text-5xl md:text-6xl leading-[1.05]">
            {c.title1}
            <span className="block text-electric-light glow-text">{c.title2}</span>
          </motion.h1>
          <p className="text-sky-text/80 text-base sm:text-lg max-w-2xl mx-auto mt-5">{c.sub}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
            {c.perks.map((p, i) => {
              const Icon = [FileText, Languages, MapPin][i];
              return (
                <span key={p} className="flex items-center gap-2 text-sm text-sky-text/85">
                  <Icon className="w-4 h-4 text-emerald-300" /> {p}
                </span>
              );
            })}
          </div>
        </header>

        {/* States */}
        <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10" aria-labelledby="states-title">
          <h2 id="states-title" className="font-display font-bold text-2xl sm:text-3xl text-center">
            {c.statesTitle}
          </h2>
          <p className="text-center text-sky-text/65 mt-1 mb-6">{c.statesSub}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {TAG_STATES.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => pickState(s.code)}
                className={
                  "group text-left rounded-2xl border p-4 sm:p-5 transition-all " +
                  (f.state === s.code ? "border-electric bg-[#0096ff26]" : "border-[#7cc4ff33] bg-white/[0.04] hover:border-[#33aaff]")
                }
              >
                <span className="font-display font-black text-3xl sm:text-4xl text-electric-light">{s.code}</span>
                <span className="block font-semibold mt-1">{s.name}</span>
                <span className="block text-xs text-sky-text/65 mt-1">{c.stateServices}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#7cc4ff] group-hover:text-white">
                  {c.start} <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Form + side panel */}
        <main ref={formRef} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 items-start scroll-mt-20">
          <div className="rounded-3xl border border-[#7cc4ff33] shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
            {done ? (
              <div className="px-6 sm:px-10 py-14 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-300/50 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-11 h-11 text-emerald-300" />
                </div>
                <h2 className="font-display font-black text-3xl sm:text-4xl">{c.thanks(done.name)}</h2>
                <p className="text-lg text-sky-text/85 mt-3 max-w-xl mx-auto flex flex-col items-center gap-2">
                  <Mail className="w-5 h-5 text-electric-light" />
                  {c.successText(done.email)}
                </p>
                <p className="mt-6 inline-flex flex-col items-center rounded-2xl border border-[#7cc4ff33] bg-black/15 px-6 py-3">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#7cc4ff]">{c.successCode}</span>
                  <span className="font-mono font-bold text-2xl">{done.code}</span>
                </p>
                <p className="text-xs text-sky-text/55 mt-4">{c.successSpam}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <a href={SEGUROS[lang]} className="flex items-center gap-2 px-6 py-3 rounded-full bg-electric hover:bg-electric-light font-semibold">
                    <ShieldCheck className="w-4 h-4" /> {c.insCta}
                  </a>
                  <button type="button" onClick={restart} className="px-6 py-3 rounded-full border border-[#7cc4ff55] hover:bg-white/10 font-semibold">
                    {c.newRequest}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 sm:px-8 py-6 sm:py-8 flex flex-col gap-5">
                <div>
                  <h2 className="font-display font-bold text-2xl">{c.formTitle}</h2>
                  <p className="text-sm text-sky-text/65">{c.formSub}</p>
                </div>

                <div className={card + " flex flex-col gap-4"}>
                  <Field label={c.service} error={E("service")}>
                    <Pills value={f.service} onChange={(v) => set("service", v)} options={TAG_SERVICES.map((s) => [s.id, s[lang]] as [TagService, string])} error={E("service")} />
                  </Field>
                  <Field label={c.state} error={E("state")}>
                    <Pills value={f.state} onChange={(v) => set("state", v)} options={TAG_STATES.map((s) => [s.code, s.name] as [string, string])} error={E("state")} />
                  </Field>
                </div>

                <div className={card + " flex flex-col gap-4"}>
                  <h3 className="font-display font-bold text-lg">{c.you}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label={c.firstName} error={E("firstName")}>
                      <input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" aria-invalid={Boolean(E("firstName"))} className={fieldBase + " " + border(E("firstName"))} />
                    </Field>
                    <Field label={c.lastName} optional={c.optional}>
                      <input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" className={fieldBase + " " + border()} />
                    </Field>
                    <Field label={c.email} error={E("email")}>
                      <input type="email" inputMode="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" placeholder="nombre@correo.com" aria-invalid={Boolean(E("email"))} className={fieldBase + " " + border(E("email"))} />
                    </Field>
                    <Field label={c.phone} error={E("phone")}>
                      <input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="(555) 123-4567" aria-invalid={Boolean(E("phone"))} className={fieldBase + " " + border(E("phone"))} />
                    </Field>
                    <Field label={c.zip} optional={c.optional} error={E("zip")} hint={zipFound ? c.zipFound(f.city, f.homeState) : undefined}>
                      <input inputMode="numeric" maxLength={5} value={f.zip} onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))} autoComplete="postal-code" aria-invalid={Boolean(E("zip"))} className={fieldBase + " " + border(E("zip"))} />
                    </Field>
                  </div>
                </div>

                <div className={card + " flex flex-col gap-4"}>
                  <h3 className="font-display font-bold text-lg">
                    {c.vehicle} <span className="text-xs font-normal text-sky-text/50">({c.optional})</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label={c.year}>
                      <select value={f.year} onChange={(e) => set("year", e.target.value)} className={fieldBase + " " + border() + " bg-[#0F3470]"}>
                        <option value="">—</option>
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={c.make}>
                      <input list="tags-makes" value={f.make} onChange={(e) => set("make", e.target.value)} placeholder="Toyota" className={fieldBase + " " + border()} />
                    </Field>
                    <Field label={c.model}>
                      <input value={f.model} onChange={(e) => set("model", e.target.value)} placeholder="Corolla" className={fieldBase + " " + border()} />
                    </Field>
                  </div>
                  <Field label={c.vin} hint={c.vinHelp} error={E("vin")}>
                    <input
                      value={f.vin}
                      onChange={(e) => set("vin", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))}
                      aria-invalid={Boolean(E("vin"))}
                      placeholder="1HGCM82633A004352"
                      className={fieldBase + " " + border(E("vin")) + " font-mono tracking-wider"}
                    />
                  </Field>
                  <datalist id="tags-makes">
                    {COMMON_MAKES.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                <div className={card + " flex flex-col gap-4"}>
                  <div>
                    <h3 className="font-display font-bold text-lg">{c.photos}</h3>
                    <p className="text-sm text-sky-text/65">{c.photosSub}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{PHOTO_KINDS.map((k) => photoSlot(k.id))}</div>
                  {photoErr && (
                    <p className="flex items-center gap-2 text-sm text-red-200">
                      <AlertCircle className="w-4 h-4" /> {c.photoError}
                    </p>
                  )}
                  <p className="text-xs text-sky-text/60">
                    {c.noTitle}{" "}
                    <a href={PHONE_URL} className="text-white font-semibold hover:underline">
                      {PHONE_DISPLAY}
                    </a>
                    .
                  </p>
                </div>

                <Field label={c.notes} optional={c.optional}>
                  <textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={3} maxLength={1500} placeholder={c.notesPh} className={fieldBase + " " + border() + " resize-none"} />
                </Field>

                <label className={"flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors " + (E("consent") ? "border-red-400/70 bg-red-500/10" : "border-[#7cc4ff33] bg-white/[0.04] hover:border-[#33aaff]")}>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={Boolean(E("consent"))} className="mt-0.5 w-5 h-5 shrink-0 accent-[#0096FF]" />
                  <span className="text-sm leading-relaxed text-sky-text/90">{c.consent}</span>
                </label>

                {/* Honeypot (hidden from people) */}
                <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px] w-px h-px opacity-0" aria-hidden="true" name="website" />

                {(hasErrors || serverError) && (
                  <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {serverError ?? c.fixErrors}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-sky-text/50 max-w-[55%]">{c.privacy}</span>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={pending || busy !== null}
                    className="flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 font-bold shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all"
                  >
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {pending ? c.sending : c.submit}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Side panel */}
          <aside className="lg:sticky lg:top-24 flex flex-col gap-4">
            <div className="rounded-2xl border border-[#7cc4ff33] p-5" style={{ background: "rgba(255,255,255,0.06)" }}>
              <h3 className="font-display font-bold text-lg mb-4">{c.howTitle}</h3>
              <ol className="flex flex-col gap-4">
                {c.how.map(([t, d], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-electric flex items-center justify-center text-sm font-bold">{i + 1}</span>
                    <div>
                      <p className="font-semibold leading-tight">{t}</p>
                      <p className="text-sm text-sky-text/65 mt-0.5">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
                <h3 className="font-display font-bold text-emerald-50">{c.insTitle}</h3>
              </div>
              <p className="text-sm text-emerald-50/85 leading-relaxed">{c.insSub}</p>
              <a href={SEGUROS[lang]} className="mt-4 flex items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 py-2.5 text-sm font-bold">
                {c.insCta} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </aside>
        </main>

        {/* Insurance banner */}
        <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16">
          <div className="rounded-3xl border border-[#7cc4ff33] p-6 sm:p-10 text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
            <ShieldCheck className="w-10 h-10 mx-auto text-electric-light mb-3" />
            <h2 className="font-display font-black text-2xl sm:text-3xl">{c.insTitle}</h2>
            <p className="text-sky-text/80 mt-2 max-w-xl mx-auto">{c.insSub}</p>
            <a href={SEGUROS[lang]} className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-electric hover:bg-electric-light font-bold glow-electric-sm">
              {c.insCta} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        <footer className="relative z-10 border-t border-[#7cc4ff1a] py-8 text-center px-4 flex flex-col gap-1.5">
          <p className="text-sm text-sky-text/80">
            <span className="font-semibold text-white">Car Tag &amp; Registration Services</span>
            {lang === "es" ? ", una empresa de Pro-DG" : ", a Pro-DG company"}
          </p>
          <p className="text-xs text-sky-text/65">
            <a href={PHONE_URL} className="hover:text-white underline-offset-2 hover:underline">
              {PHONE_DISPLAY}
            </a>
            {mailingAddress && (
              <>
                {" "}
                · {lang === "es" ? "Dirección postal" : "Mailing address"}: {mailingAddress}
              </>
            )}
          </p>
          <p className="text-xs text-sky-text/65">
            <a href={lang === "es" ? "/privacy#es" : "/privacy"} className="underline-offset-2 hover:underline hover:text-white">
              {lang === "es" ? "Política de privacidad" : "Privacy Policy"}
            </a>
          </p>
          <p className="text-xs font-mono text-[#7cc4ff99]">© {new Date().getFullYear()} Car Tag &amp; Registration Services · Pro-DG</p>
        </footer>
      </div>
    </>
  );
}
