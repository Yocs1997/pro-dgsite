"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Globe,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  User,
  Car,
  ShieldCheck,
  ClipboardCheck,
  Plus,
  Trash2,
  Loader2,
  Mail,
  BadgeDollarSign,
  Clock,
  Languages,
  AlertCircle,
  Pencil,
  Camera,
  Contact as IdCard,
} from "lucide-react";
import { submitInsuranceQuote } from "./actions";
import {
  COMMON_MAKES,
  MAX_EXTRA_DRIVERS,
  MAX_VEHICLES,
  OPTIONS,
  US_STATES,
  emptyCoverage,
  emptyDriver,
  emptyExtraDriver,
  emptyVehicle,
  isEmail,
  label,
  phoneDigits,
  type Coverage,
  type Driver,
  type ExtraDriver,
  type Lang,
  type OptionGroup,
  type Vehicle,
} from "./model";

const WHATSAPP_URL = "https://wa.me/50557449428";
const BG = "#0B2B5E";
const DRAFT_KEY = "pdg-seguro-draft";

type Carrier = { slug: string; name: string; logo?: string };

// ─── Copy ────────────────────────────────────────────────────────────────────

const COPY = {
  es: {
    home: "Inicio",
    badge: "Seguro de auto",
    title1: "Cotiza tu seguro de auto",
    title2: "sin complicaciones",
    sub: "Completa el formulario en unos 3 minutos. Comparamos opciones de varias aseguradoras y te enviamos tu cotización por correo.",
    perks: ["Cotización gratis", "Atención en español e inglés", "Respuesta rápida por correo"],
    strip: "Comparamos opciones de aseguradoras como",
    stripNote: "Los nombres y marcas pertenecen a sus respectivos dueños. Las aseguradoras disponibles varían según el estado y el perfil del conductor.",
    steps: ["Conductor", "Vehículos", "Cobertura", "Revisar"],
    stepOf: (a: number, b: number) => `Paso ${a} de ${b}`,
    next: "Continuar",
    back: "Atrás",
    submit: "Enviar solicitud",
    sending: "Enviando…",
    required: "Obligatorio",
    optional: "opcional",
    choose: "Selecciona…",
    fixErrors: "Revisa los campos marcados en rojo.",
    // driver
    driverTitle: "Tus datos",
    driverSub: "Los usamos para calcular tu tarifa y enviarte la cotización.",
    photoTitle: "¿Quieres ahorrar tiempo?",
    photoSub: "Sube una foto de tu licencia de conducir y no tendrás que escribir tus datos personales. Es opcional.",
    photoFront: "Frente de la licencia",
    photoBack: "Reverso (opcional)",
    photoAdd: "Subir o tomar foto",
    photoRemove: "Quitar",
    photoOn: "¡Listo! Tomaremos tus datos de la licencia. Solo necesitamos tu correo y teléfono; lo demás es opcional.",
    photoPrivacy: "Tu licencia solo se usa para preparar tu cotización y no se comparte.",
    photoError: "No pudimos leer esa imagen. Prueba con una foto JPG o PNG.",
    photoBusy: "Procesando foto…",
    zipLooking: "Buscando tu ciudad…",
    zipNotFound: "No encontramos ese código postal. Escribe la ciudad y el estado.",
    licensePhoto: "Foto de licencia",
    licenseAttached: (n: number): string => (n === 2 ? "Frente y reverso adjuntos" : "Adjunta"),
    firstName: "Nombre",
    lastName: "Apellido",
    dob: "Fecha de nacimiento",
    gender: "Género",
    marital: "Estado civil",
    email: "Correo electrónico",
    phone: "Teléfono",
    street: "Dirección",
    city: "Ciudad",
    state: "Estado",
    zip: "Código postal (ZIP)",
    licenseTitle: "Licencia e historial",
    licenseStatus: "Tipo de licencia",
    licenseState: "Estado que emitió la licencia",
    licenseNumber: "Número de licencia",
    yearsLicensed: "Años con licencia",
    accidents: "Accidentes en los últimos 3 años",
    tickets: "Multas en los últimos 3 años",
    sr22: "¿Necesitas SR-22?",
    extraTitle: "Otros conductores en la póliza",
    extraSub: "Agrega a quien también manejará los vehículos.",
    addDriver: "Agregar conductor",
    relationship: "Relación contigo",
    driverN: (n: number) => `Conductor ${n}`,
    // vehicles
    vehTitle: "Tus vehículos",
    vehSub: "Agrega cada vehículo que quieres asegurar.",
    vehicleN: (n: number) => `Vehículo ${n}`,
    year: "Año",
    make: "Marca",
    model: "Modelo",
    vin: "VIN",
    vinHelp: "17 caracteres. Lo encuentras en la tarjeta de registro o en el parabrisas.",
    ownership: "Propiedad",
    use: "Uso principal",
    miles: "Millas al año",
    addVehicle: "Agregar otro vehículo",
    remove: "Quitar",
    // coverage
    covTitle: "Cobertura",
    covSub: "Cuéntanos qué necesitas. Si no estás seguro, te asesoramos.",
    insured: "¿Tienes seguro actualmente?",
    currentCarrier: "Aseguradora actual",
    level: "¿Qué cobertura buscas?",
    levelHelp: {
      minimum: "Lo mínimo para manejar legalmente. El precio más bajo.",
      standard: "Más protección si causas un accidente.",
      full: "También cubre daños a tu propio vehículo.",
    } as Record<string, string>,
    deductible: "Deducible preferido",
    startDate: "¿Desde cuándo necesitas el seguro?",
    contactPref: "¿Cómo prefieres que te contactemos?",
    notes: "Comentarios",
    notesPh: "Algo más que debamos saber (descuentos, fechas, etc.)",
    // review
    revTitle: "Revisa y envía",
    revSub: "Confirma que todo esté correcto.",
    edit: "Editar",
    feeTitle: "Cargo de servicio",
    feeText: "La cotización es gratis. Si decides comprar la póliza a través de Pro-DG, se aplica un cargo de servicio de US$150.",
    consent:
      "Confirmo que la información es correcta, entiendo que se aplica un cargo de servicio de US$150 solo si compro la póliza a través de Pro-DG, y acepto que me contacten por correo, teléfono o WhatsApp sobre mi cotización.",
    consentError: "Debes aceptar para enviar tu solicitud.",
    // success
    thanks: (n: string) => (n ? `¡Gracias, ${n}!` : "¡Gracias!"),
    successText: (e: string) => `Recibimos tu solicitud. Te enviaremos tu cotización por correo a ${e}.`,
    successCode: "Número de solicitud",
    successFee: "Recuerda: la cotización es gratis. Si compras la póliza con nosotros, se aplica un cargo de servicio de US$150.",
    successSpam: "Revisa también tu carpeta de spam o promociones.",
    newQuote: "Nueva cotización",
    howTitle: "Cómo funciona",
    how: [
      ["Completa el formulario", "Tus datos, tus vehículos y la cobertura que buscas."],
      ["Comparamos por ti", "Revisamos opciones de varias aseguradoras."],
      ["Recibe tu cotización", "Te la enviamos por correo y resolvemos tus dudas."],
    ],
    privacy: "Tu información solo se usa para preparar tu cotización.",
  },
  en: {
    home: "Home",
    badge: "Car insurance",
    title1: "Get your car insurance quote",
    title2: "without the hassle",
    sub: "Fill out the form in about 3 minutes. We compare options from several carriers and email you your quote.",
    perks: ["Free quote", "Service in English & Spanish", "Fast reply by email"],
    strip: "We compare options from carriers such as",
    stripNote: "Names and trademarks belong to their respective owners. Available carriers vary by state and driver profile.",
    steps: ["Driver", "Vehicles", "Coverage", "Review"],
    stepOf: (a: number, b: number) => `Step ${a} of ${b}`,
    next: "Continue",
    back: "Back",
    submit: "Submit request",
    sending: "Sending…",
    required: "Required",
    optional: "optional",
    choose: "Select…",
    fixErrors: "Please fix the fields marked in red.",
    driverTitle: "About you",
    driverSub: "We use this to price your policy and send you the quote.",
    photoTitle: "Want to save time?",
    photoSub: "Upload a photo of your driver's license and you won't need to type your personal details. It's optional.",
    photoFront: "Front of license",
    photoBack: "Back (optional)",
    photoAdd: "Upload or take photo",
    photoRemove: "Remove",
    photoOn: "All set! We'll take your details from your license. We just need your email and phone; everything else is optional.",
    photoPrivacy: "Your license is only used to prepare your quote and is never shared.",
    photoError: "We couldn't read that image. Please try a JPG or PNG photo.",
    photoBusy: "Processing photo…",
    zipLooking: "Looking up your city…",
    zipNotFound: "We couldn't find that ZIP code. Please enter your city and state.",
    licensePhoto: "License photo",
    licenseAttached: (n: number): string => (n === 2 ? "Front and back attached" : "Attached"),
    firstName: "First name",
    lastName: "Last name",
    dob: "Date of birth",
    gender: "Gender",
    marital: "Marital status",
    email: "Email",
    phone: "Phone",
    street: "Street address",
    city: "City",
    state: "State",
    zip: "ZIP code",
    licenseTitle: "License & history",
    licenseStatus: "License type",
    licenseState: "License issuing state",
    licenseNumber: "License number",
    yearsLicensed: "Years licensed",
    accidents: "Accidents in the last 3 years",
    tickets: "Tickets in the last 3 years",
    sr22: "Do you need an SR-22?",
    extraTitle: "Other drivers on the policy",
    extraSub: "Add anyone else who will drive the vehicles.",
    addDriver: "Add driver",
    relationship: "Relationship to you",
    driverN: (n: number) => `Driver ${n}`,
    vehTitle: "Your vehicles",
    vehSub: "Add each vehicle you want to insure.",
    vehicleN: (n: number) => `Vehicle ${n}`,
    year: "Year",
    make: "Make",
    model: "Model",
    vin: "VIN",
    vinHelp: "17 characters. Find it on your registration card or windshield.",
    ownership: "Ownership",
    use: "Primary use",
    miles: "Miles per year",
    addVehicle: "Add another vehicle",
    remove: "Remove",
    covTitle: "Coverage",
    covSub: "Tell us what you need. Not sure? We'll help you choose.",
    insured: "Are you currently insured?",
    currentCarrier: "Current carrier",
    level: "What coverage are you looking for?",
    levelHelp: {
      minimum: "The minimum to drive legally. Lowest price.",
      standard: "More protection if you cause an accident.",
      full: "Also covers damage to your own vehicle.",
    } as Record<string, string>,
    deductible: "Preferred deductible",
    startDate: "When do you need coverage to start?",
    contactPref: "How should we contact you?",
    notes: "Comments",
    notesPh: "Anything else we should know (discounts, dates, etc.)",
    revTitle: "Review & submit",
    revSub: "Make sure everything looks right.",
    edit: "Edit",
    feeTitle: "Service fee",
    feeText: "The quote is free. If you choose to purchase the policy through Pro-DG, a US$150 service fee applies.",
    consent:
      "I confirm the information is correct, I understand a US$150 service fee applies only if I purchase the policy through Pro-DG, and I agree to be contacted by email, phone or WhatsApp about my quote.",
    consentError: "Please accept to submit your request.",
    thanks: (n: string) => (n ? `Thank you, ${n}!` : "Thank you!"),
    successText: (e: string) => `We received your request. We'll email your quote to ${e}.`,
    successCode: "Request number",
    successFee: "Remember: the quote is free. If you purchase the policy through us, a US$150 service fee applies.",
    successSpam: "Please also check your spam or promotions folder.",
    newQuote: "New quote",
    howTitle: "How it works",
    how: [
      ["Fill out the form", "Your details, your vehicles and the coverage you want."],
      ["We compare for you", "We review options from several carriers."],
      ["Get your quote", "We email it to you and answer your questions."],
    ],
    privacy: "Your information is only used to prepare your quote.",
  },
};

type Copy = (typeof COPY)["es"];

// ─── Small UI pieces ─────────────────────────────────────────────────────────

const fieldBase =
  "w-full rounded-xl border bg-white/[0.06] px-4 py-3 text-white outline-none transition-colors placeholder:text-white/35 focus:bg-white/[0.09]";

function Field({
  label: text,
  error,
  hint,
  optional,
  optLabel,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  optLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={"flex flex-col gap-1.5 min-w-0 " + (className ?? "")}>
      <span className="text-sm font-medium text-sky-text/90">
        {text}
        {optional && <span className="ml-1 text-xs font-normal text-sky-text/50">({optLabel})</span>}
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

const border = (err?: string) => (err ? "border-red-400/70 focus:border-red-300" : "border-[#7cc4ff33] focus:border-[#33aaff]");

function TextInput({
  value,
  onChange,
  error,
  ...rest
}: { value: string; onChange: (v: string) => void; error?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className={fieldBase + " " + border(error)} aria-invalid={Boolean(error)} />;
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  placeholder: string;
  error?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={Boolean(error)}
      className={fieldBase + " " + border(error) + " appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10 " + (value ? "" : "text-white/45")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237cc4ff' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      }}
    >
      <option value="" disabled className="bg-[#0F3470]">
        {placeholder}
      </option>
      {options.map(([v, l]) => (
        <option key={v} value={v} className="bg-[#0F3470] text-white">
          {l}
        </option>
      ))}
    </select>
  );
}

function Pills({
  value,
  onChange,
  options,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  error?: string;
}) {
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

function Card({ title, sub, icon: Icon, action, children }: { title: string; sub?: string; icon?: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#7cc4ff26] bg-white/[0.04] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-[#0096ff26] border border-[#33aaff55] flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-electric-light" />
            </span>
          )}
          <div>
            <h3 className="font-display font-bold text-lg leading-tight">{title}</h3>
            {sub && <p className="text-sm text-sky-text/65 mt-0.5">{sub}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ─── Carrier strip ───────────────────────────────────────────────────────────

function CarrierStrip({ carriers, c }: { carriers: Carrier[]; c: Copy }) {
  const loop = [...carriers, ...carriers];
  return (
    <section className="relative py-10" aria-label={c.strip}>
      <p className="text-center text-xs font-mono uppercase tracking-[0.2em] text-[#7cc4ff] mb-6 px-4">{c.strip}</p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused]" style={{ animationDuration: "40s" }}>
          {loop.map((carrier, i) => (
            <div
              key={`${carrier.slug}-${i}`}
              aria-hidden={i >= carriers.length}
              className="h-16 min-w-44 px-6 shrink-0 rounded-2xl bg-white shadow-[0_6px_24px_rgba(0,0,0,0.18)] flex items-center justify-center"
            >
              {carrier.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={carrier.logo} alt={carrier.name} className="max-h-9 max-w-36 object-contain" />
              ) : (
                <span className="font-display font-extrabold text-lg tracking-tight text-[#0B2B5E] whitespace-nowrap">{carrier.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-[11px] text-sky-text/45 mt-4 px-6 max-w-3xl mx-auto">{c.stripNote}</p>
    </section>
  );
}

// ─── License photo: resize + compress in the browser ─────────────────────────

async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not an image");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let q = quality;
    let out = canvas.toDataURL("image/jpeg", q);
    while (out.length > 1_400_000 && q > 0.4) {
      q -= 0.12;
      out = canvas.toDataURL("image/jpeg", q);
    }
    if (out.length > 1_500_000) throw new Error("too large");
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

type Errors = Record<string, string>;

export default function InsuranceQuote({ carriers }: { carriers: Carrier[] }) {
  const [lang, setLang] = useState<Lang>("en"); // English by default; ES button in the top bar
  const c = COPY[lang];
  const L = (g: OptionGroup) => Object.keys(OPTIONS[g]).map((v) => [v, label(g, v, lang)] as [string, string]);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [driver, setDriver] = useState<Driver>(emptyDriver);
  const [extra, setExtra] = useState<ExtraDriver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([emptyVehicle()]);
  const [coverage, setCoverage] = useState<Coverage>(emptyCoverage);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [photos, setPhotos] = useState<{ front?: string; back?: string }>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState(false);
  const [zipState, setZipState] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const hasPhoto = Boolean(photos.front);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; email: string; name: string } | null>(null);
  const [pending, start] = useTransition();
  const formTop = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Restore / save a draft for this browser tab, so a refresh doesn't lose the form.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.driver) setDriver({ ...emptyDriver(), ...d.driver });
        if (Array.isArray(d.extra)) setExtra(d.extra);
        if (Array.isArray(d.vehicles) && d.vehicles.length) setVehicles(d.vehicles);
        if (d.coverage) setCoverage({ ...emptyCoverage(), ...d.coverage });
        if (d.lang === "en" || d.lang === "es") setLang(d.lang);
      }
    } catch {
      /* storage unavailable */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current || done) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ driver, extra, vehicles, coverage, lang }));
    } catch {
      /* ignore */
    }
  }, [driver, extra, vehicles, coverage, lang, done]);

  // ZIP → city + state (fills the fields; they stay editable).
  useEffect(() => {
    const zip = driver.zip;
    if (!/^\d{5}$/.test(zip)) {
      setZipState("idle");
      return;
    }
    let cancelled = false;
    setZipState("loading");
    fetch(`/api/zip?z=${zip}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; city?: string; state?: string }) => {
        if (cancelled) return;
        if (j.ok && j.city && j.state) {
          setDriver((p) => (p.zip === zip ? { ...p, city: j.city!, state: j.state! } : p));
          setZipState("found");
        } else setZipState("notfound");
      })
      .catch(() => !cancelled && setZipState("notfound"));
    return () => {
      cancelled = true;
    };
  }, [driver.zip]);

  const addPhoto = async (side: "front" | "back", file: File | undefined) => {
    if (!file) return;
    setPhotoErr(false);
    setPhotoBusy(true);
    try {
      const url = await compressImage(file);
      setPhotos((p) => ({ ...p, [side]: url }));
    } catch {
      setPhotoErr(true);
    } finally {
      setPhotoBusy(false);
    }
  };

  const years = useMemo(() => {
    const y = new Date().getFullYear() + 1;
    return Array.from({ length: y - 1980 + 1 }, (_, i) => String(y - i)).map((v) => [v, v] as [string, string]);
  }, []);
  const states = US_STATES.map(([code, name]) => [code, `${name} (${code})`] as [string, string]);

  const setD = (k: keyof Driver) => (v: string) => setDriver((p) => ({ ...p, [k]: v }));
  const setV = (i: number, k: keyof Vehicle) => (v: string) => setVehicles((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setX = (i: number, k: keyof ExtraDriver) => (v: string) => setExtra((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setC = (k: keyof Coverage) => (v: string) => setCoverage((p) => ({ ...p, [k]: v }));

  // ─── Validation per step ─────────────────────────────────────────────
  const validate = (s: number): Errors => {
    const e: Errors = {};
    const req = c.required;
    if (s === 0) {
      if (!hasPhoto && !driver.firstName.trim()) e.firstName = req;
      if (!hasPhoto && !driver.lastName.trim()) e.lastName = req;
      if (!driver.dob) {
        if (!hasPhoto) e.dob = req;
      } else {
        const age = (Date.now() - new Date(driver.dob).getTime()) / (365.25 * 864e5);
        if (age < 15 || age > 110) e.dob = lang === "es" ? "Revisa la fecha" : "Check the date";
      }
      if (!isEmail(driver.email)) e.email = driver.email ? (lang === "es" ? "Correo no válido" : "Invalid email") : req;
      if (phoneDigits(driver.phone).length < 10) e.phone = driver.phone ? (lang === "es" ? "Mínimo 10 dígitos" : "At least 10 digits") : req;
      if (!hasPhoto && !driver.state) e.state = req;
      if (driver.zip ? !/^\d{5}$/.test(driver.zip) : !hasPhoto) e.zip = driver.zip ? (lang === "es" ? "5 dígitos" : "5 digits") : req;
      if (!hasPhoto && !driver.licenseStatus) e.licenseStatus = req;
      extra.forEach((x, i) => {
        if (!x.firstName.trim()) e[`x${i}.firstName`] = req;
        if (!x.dob) e[`x${i}.dob`] = req;
      });
    }
    if (s === 1) {
      vehicles.forEach((v, i) => {
        if (!v.year) e[`v${i}.year`] = req;
        if (!v.make.trim()) e[`v${i}.make`] = req;
        if (!v.model.trim()) e[`v${i}.model`] = req;
        if (v.vin && v.vin.replace(/\s/g, "").length !== 17) e[`v${i}.vin`] = lang === "es" ? "El VIN tiene 17 caracteres" : "VIN must be 17 characters";
      });
    }
    if (s === 2) {
      if (!coverage.insured) e.insured = req;
      if (!coverage.level) e.level = req;
    }
    if (s === 3 && !consent) e.consent = c.consentError;
    return e;
  };

  // After a failed attempt, re-check as the person types so fixed fields turn back to normal.
  useEffect(() => {
    setErrors((prev) => (Object.keys(prev).length ? validate(step) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver, extra, vehicles, coverage, consent, lang, hasPhoto]);

  const scrollTop = () => formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const go = (to: number) => {
    if (to > step) {
      for (let s = step; s < to; s++) {
        const e = validate(s);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(s);
          setServerError(null);
          setTimeout(() => {
            const el = document.querySelector("[aria-invalid='true']") as HTMLElement | null;
            el?.focus({ preventScroll: true });
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
          return;
        }
      }
    }
    setErrors({});
    setServerError(null);
    setDir(to > step ? 1 : -1);
    setStep(to);
    scrollTop();
  };

  const submit = () => {
    // If an earlier step is incomplete (e.g. after editing), jump back to it.
    for (const s of [0, 1, 2]) {
      const earlier = validate(s);
      if (Object.keys(earlier).length) {
        setErrors(earlier);
        setDir(-1);
        setStep(s);
        scrollTop();
        return;
      }
    }
    const e = validate(3);
    if (Object.keys(e).length) return setErrors(e);
    setServerError(null);
    start(async () => {
      const res = await submitInsuranceQuote({
        lang,
        driver,
        extraDrivers: extra,
        vehicles,
        coverage,
        consent,
        website,
        licensePhotos: [photos.front, photos.back].filter((x): x is string => Boolean(x)),
      });
      if (res.ok) {
        setDone({ code: res.code, email: res.email || driver.email, name: driver.firstName });
        // Meta Pixel: report the lead only once the server has accepted the request
        // (the honeypot path also returns ok, so skip it when `website` is filled).
        if (!website) {
          try {
            const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
            fbq?.("track", "Lead", { content_name: "Auto insurance quote", lang }, { eventID: res.code });
          } catch {
            /* ignore */
          }
        }
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
        scrollTop();
      } else {
        setServerError(res.error);
      }
    });
  };

  const restart = () => {
    setDriver(emptyDriver());
    setExtra([]);
    setVehicles([emptyVehicle()]);
    setCoverage(emptyCoverage());
    setConsent(false);
    setPhotos({});
    setStep(0);
    setDone(null);
    scrollTop();
  };

  const E = (k: string) => errors[k];
  const hasErrors = Object.values(errors).some(Boolean);
  const grid2 = "grid grid-cols-1 sm:grid-cols-2 gap-4";
  const grid3 = "grid grid-cols-1 sm:grid-cols-3 gap-4";
  const stepIcons = [User, Car, ShieldCheck, ClipboardCheck];

  // ─── Step content ────────────────────────────────────────────────────
  const opt = hasPhoto ? { optional: true, optLabel: c.optional } : {};
  const photoSlot = (side: "front" | "back", title: string) => {
    const url = photos[side];
    return (
      <div className="flex flex-col gap-2 min-w-0">
        <span className="text-sm font-medium text-sky-text/90">{title}</span>
        {url ? (
          <div className="relative rounded-xl overflow-hidden border border-emerald-300/50 bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={title} className="w-full h-36 object-contain" />
            <button
              type="button"
              onClick={() => setPhotos((p) => ({ ...p, [side]: undefined }))}
              className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs hover:bg-red-500/80"
            >
              <Trash2 className="w-3.5 h-3.5" /> {c.photoRemove}
            </button>
          </div>
        ) : (
          <label className="flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#7cc4ff55] bg-white/[0.04] text-sm text-sky-text/80 hover:border-[#33aaff] hover:bg-white/[0.07] transition-colors">
            <Camera className="w-6 h-6 text-electric-light" />
            {c.photoAdd}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { addPhoto(side, e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        )}
      </div>
    );
  };

  const stepDriver = (
    <div className="flex flex-col gap-5">
      <section className={"rounded-2xl border p-5 sm:p-6 " + (hasPhoto ? "border-emerald-300/50 bg-emerald-500/10" : "border-[#33aaff66] bg-[#0096ff14]")}>
        <div className="flex items-start gap-3 mb-4">
          <span className="mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-[#0096ff26] border border-[#33aaff55] flex items-center justify-center">
            <IdCard className="w-4.5 h-4.5 text-electric-light" />
          </span>
          <div>
            <h3 className="font-display font-bold text-lg leading-tight">{c.photoTitle}</h3>
            <p className="text-sm text-sky-text/70 mt-0.5">{c.photoSub}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {photoSlot("front", c.photoFront)}
          {photos.front && photoSlot("back", c.photoBack)}
        </div>
        {photoBusy && <p className="mt-3 flex items-center gap-2 text-sm text-sky-text/80"><Loader2 className="w-4 h-4 animate-spin" /> {c.photoBusy}</p>}
        {photoErr && <p className="mt-3 flex items-center gap-2 text-sm text-red-200"><AlertCircle className="w-4 h-4" /> {c.photoError}</p>}
        {hasPhoto && <p className="mt-3 flex items-start gap-2 text-sm text-emerald-100"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {c.photoOn}</p>}
        <p className="mt-2 text-[11px] text-sky-text/50">{c.photoPrivacy}</p>
      </section>

      <Card title={c.driverTitle} sub={c.driverSub} icon={User}>
        <div className="flex flex-col gap-4">
          <div className={grid2}>
            <Field label={c.firstName} error={E("firstName")} {...opt}>
              <TextInput value={driver.firstName} onChange={setD("firstName")} autoComplete="given-name" error={E("firstName")} />
            </Field>
            <Field label={c.lastName} error={E("lastName")} {...opt}>
              <TextInput value={driver.lastName} onChange={setD("lastName")} autoComplete="family-name" error={E("lastName")} />
            </Field>
          </div>
          <div className={grid3}>
            <Field label={c.dob} error={E("dob")} {...opt}>
              <TextInput type="date" value={driver.dob} onChange={setD("dob")} autoComplete="bday" error={E("dob")} max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label={c.gender} optional optLabel={c.optional}>
              <Select value={driver.gender} onChange={setD("gender")} options={L("gender")} placeholder={c.choose} />
            </Field>
            <Field label={c.marital} optional optLabel={c.optional}>
              <Select value={driver.marital} onChange={setD("marital")} options={L("marital")} placeholder={c.choose} />
            </Field>
          </div>
          <div className={grid2}>
            <Field label={c.email} error={E("email")}>
              <TextInput type="email" inputMode="email" value={driver.email} onChange={setD("email")} autoComplete="email" error={E("email")} placeholder="nombre@correo.com" />
            </Field>
            <Field label={c.phone} error={E("phone")}>
              <TextInput type="tel" inputMode="tel" value={driver.phone} onChange={setD("phone")} autoComplete="tel" error={E("phone")} placeholder="(555) 123-4567" />
            </Field>
          </div>
          <div className={grid3}>
            <Field
              label={c.zip}
              error={E("zip")}
              hint={zipState === "loading" ? c.zipLooking : zipState === "notfound" ? c.zipNotFound : undefined}
              {...opt}
            >
              <div className="relative">
                <TextInput inputMode="numeric" maxLength={5} value={driver.zip} onChange={(v) => setD("zip")(v.replace(/\D/g, ""))} autoComplete="postal-code" error={E("zip")} placeholder="11207" />
                {zipState === "loading" && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#7cc4ff]" />}
                {zipState === "found" && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />}
              </div>
            </Field>
            <Field label={c.city} optional optLabel={c.optional}>
              <TextInput value={driver.city} onChange={setD("city")} autoComplete="address-level2" />
            </Field>
            <Field label={c.state} error={E("state")} {...opt}>
              <Select value={driver.state} onChange={setD("state")} options={states} placeholder={c.choose} error={E("state")} />
            </Field>
          </div>
          <Field label={c.street} optional optLabel={c.optional}>
            <TextInput value={driver.street} onChange={setD("street")} autoComplete="street-address" />
          </Field>
        </div>
      </Card>

      <Card title={c.licenseTitle} icon={ShieldCheck}>
        <div className="flex flex-col gap-4">
          <Field label={c.licenseStatus} error={E("licenseStatus")} {...opt}>
            <Pills value={driver.licenseStatus} onChange={setD("licenseStatus")} options={L("licenseStatus")} error={E("licenseStatus")} />
          </Field>
          <AnimatePresence initial={false}>
            {(driver.licenseStatus === "us" || driver.licenseStatus === "permit") && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className={grid3 + " pt-1"}>
                  <Field label={c.licenseState} optional optLabel={c.optional}>
                    <Select value={driver.licenseState} onChange={setD("licenseState")} options={states} placeholder={c.choose} />
                  </Field>
                  <Field label={c.licenseNumber} optional optLabel={c.optional}>
                    <TextInput value={driver.licenseNumber} onChange={setD("licenseNumber")} autoComplete="off" />
                  </Field>
                  <Field label={c.yearsLicensed} optional optLabel={c.optional}>
                    <TextInput inputMode="numeric" maxLength={2} value={driver.yearsLicensed} onChange={(v) => setD("yearsLicensed")(v.replace(/\D/g, ""))} />
                  </Field>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className={grid3}>
            <Field label={c.accidents}>
              <Pills value={driver.accidents} onChange={setD("accidents")} options={L("count")} />
            </Field>
            <Field label={c.tickets}>
              <Pills value={driver.tickets} onChange={setD("tickets")} options={L("count")} />
            </Field>
            <Field label={c.sr22}>
              <Pills value={driver.sr22} onChange={setD("sr22")} options={L("yesno")} />
            </Field>
          </div>
        </div>
      </Card>

      <Card
        title={c.extraTitle}
        sub={c.extraSub}
        icon={Plus}
        action={
          extra.length < MAX_EXTRA_DRIVERS && (
            <button
              type="button"
              onClick={() => setExtra((p) => [...p, emptyExtraDriver()])}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#33aaff80] text-sm font-semibold text-electric-light hover:bg-[#0096ff1f]"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{c.addDriver}</span>
            </button>
          )
        }
      >
        <AnimatePresence initial={false}>
          {extra.map((x, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-[#7cc4ff26] bg-black/10 p-4 mb-3"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[#7cc4ff]">{c.driverN(i + 2)}</span>
                <button type="button" onClick={() => setExtra((p) => p.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-sky-text/60 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5" /> {c.remove}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label={c.firstName} error={E(`x${i}.firstName`)}>
                  <TextInput value={x.firstName} onChange={setX(i, "firstName")} error={E(`x${i}.firstName`)} />
                </Field>
                <Field label={c.lastName} optional optLabel={c.optional}>
                  <TextInput value={x.lastName} onChange={setX(i, "lastName")} />
                </Field>
                <Field label={c.dob} error={E(`x${i}.dob`)}>
                  <TextInput type="date" value={x.dob} onChange={setX(i, "dob")} error={E(`x${i}.dob`)} />
                </Field>
                <Field label={c.relationship} optional optLabel={c.optional}>
                  <Select value={x.relationship} onChange={setX(i, "relationship")} options={L("relationship")} placeholder={c.choose} />
                </Field>
                <Field label={c.licenseStatus} optional optLabel={c.optional} className="sm:col-span-2 lg:col-span-4">
                  <Select value={x.licenseStatus} onChange={setX(i, "licenseStatus")} options={L("licenseStatus")} placeholder={c.choose} />
                </Field>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {extra.length === 0 && (
          <button
            type="button"
            onClick={() => setExtra([emptyExtraDriver()])}
            className="w-full rounded-xl border border-dashed border-[#7cc4ff40] py-4 text-sm text-sky-text/70 hover:border-[#33aaff] hover:text-white transition-colors"
          >
            + {c.addDriver}
          </button>
        )}
      </Card>
    </div>
  );

  const stepVehicles = (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-display font-bold text-xl">{c.vehTitle}</h3>
        <p className="text-sm text-sky-text/65">{c.vehSub}</p>
      </div>
      <AnimatePresence initial={false}>
        {vehicles.map((v, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
            <Card
              title={v.year && v.make ? `${v.year} ${v.make} ${v.model}` : c.vehicleN(i + 1)}
              icon={Car}
              action={
                vehicles.length > 1 && (
                  <button type="button" onClick={() => setVehicles((p) => p.filter((_, j) => j !== i))} className="flex items-center gap-1 text-xs text-sky-text/60 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" /> {c.remove}
                  </button>
                )
              }
            >
              <div className="flex flex-col gap-4">
                <div className={grid3}>
                  <Field label={c.year} error={E(`v${i}.year`)}>
                    <Select value={v.year} onChange={setV(i, "year")} options={years} placeholder={c.choose} error={E(`v${i}.year`)} />
                  </Field>
                  <Field label={c.make} error={E(`v${i}.make`)}>
                    <TextInput list="pdg-makes" value={v.make} onChange={setV(i, "make")} error={E(`v${i}.make`)} placeholder="Toyota" />
                  </Field>
                  <Field label={c.model} error={E(`v${i}.model`)}>
                    <TextInput value={v.model} onChange={setV(i, "model")} error={E(`v${i}.model`)} placeholder="Corolla" />
                  </Field>
                </div>
                <Field label={c.vin} optional optLabel={c.optional} hint={c.vinHelp} error={E(`v${i}.vin`)}>
                  <TextInput
                    value={v.vin}
                    onChange={(val) => setV(i, "vin")(val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))}
                    error={E(`v${i}.vin`)}
                    className="font-mono tracking-wider"
                    placeholder="1HGCM82633A004352"
                  />
                </Field>
                <Field label={c.ownership} optional optLabel={c.optional}>
                  <Pills value={v.ownership} onChange={setV(i, "ownership")} options={L("ownership")} />
                </Field>
                <div className={grid2}>
                  <Field label={c.use} optional optLabel={c.optional}>
                    <Select value={v.use} onChange={setV(i, "use")} options={L("use")} placeholder={c.choose} />
                  </Field>
                  <Field label={c.miles} optional optLabel={c.optional}>
                    <Select value={v.miles} onChange={setV(i, "miles")} options={L("miles")} placeholder={c.choose} />
                  </Field>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
      {vehicles.length < MAX_VEHICLES && (
        <button
          type="button"
          onClick={() => setVehicles((p) => [...p, emptyVehicle()])}
          className="w-full rounded-2xl border border-dashed border-[#7cc4ff40] py-5 flex items-center justify-center gap-2 text-sky-text/75 hover:border-[#33aaff] hover:text-white transition-colors"
        >
          <Plus className="w-4 h-4" /> {c.addVehicle}
        </button>
      )}
      <datalist id="pdg-makes">
        {COMMON_MAKES.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </div>
  );

  const stepCoverage = (
    <Card title={c.covTitle} sub={c.covSub} icon={ShieldCheck}>
      <div className="flex flex-col gap-5">
        <Field label={c.insured} error={E("insured")}>
          <Pills value={coverage.insured} onChange={setC("insured")} options={L("insured")} error={E("insured")} />
        </Field>
        <AnimatePresence initial={false}>
          {(coverage.insured === "yes" || coverage.insured === "lapsed") && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Field label={c.currentCarrier} optional optLabel={c.optional}>
                <TextInput value={coverage.currentCarrier} onChange={setC("currentCarrier")} placeholder="Progressive, GEICO…" />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-sky-text/90">{c.level}</span>
          <div role="radiogroup" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {L("level").map(([v, l]) => {
              const on = coverage.level === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-invalid={Boolean(E("level")) && !coverage.level}
                  onClick={() => setC("level")(v)}
                  className={
                    "relative text-left rounded-2xl border p-4 transition-all " +
                    (on
                      ? "border-electric bg-[#0096ff26] shadow-[0_0_24px_rgba(0,150,255,0.3)]"
                      : "bg-white/[0.04] hover:border-[#33aaff] " + (E("level") ? "border-red-400/70" : "border-[#7cc4ff33]"))
                  }
                >
                  {on && (
                    <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-electric flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                  )}
                  <span className="block font-semibold pr-7 leading-snug">{l}</span>
                  <span className="block text-xs text-sky-text/65 mt-1.5">{c.levelHelp[v]}</span>
                </button>
              );
            })}
          </div>
          {E("level") && (
            <span className="flex items-center gap-1 text-xs text-red-300">
              <AlertCircle className="w-3.5 h-3.5" /> {E("level")}
            </span>
          )}
        </div>
        <AnimatePresence initial={false}>
          {coverage.level === "full" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Field label={c.deductible} optional optLabel={c.optional}>
                <Pills value={coverage.deductible} onChange={setC("deductible")} options={L("deductible")} />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>
        <div className={grid2}>
          <Field label={c.startDate} optional optLabel={c.optional}>
            <TextInput type="date" value={coverage.startDate} onChange={setC("startDate")} min={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label={c.contactPref}>
            <Select value={coverage.contactPref} onChange={setC("contactPref")} options={L("contactPref")} placeholder={c.choose} />
          </Field>
        </div>
        <Field label={c.notes} optional optLabel={c.optional}>
          <textarea
            value={coverage.notes}
            onChange={(e) => setC("notes")(e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder={c.notesPh}
            className={fieldBase + " " + border() + " resize-none"}
          />
        </Field>
      </div>
    </Card>
  );

  const RevRow = ({ k, v }: { k: string; v?: string }) =>
    v ? (
      <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-white/5 last:border-0">
        <span className="text-sky-text/60">{k}</span>
        <span className="text-right font-medium break-words min-w-0">{v}</span>
      </div>
    ) : null;
  const RevBlock = ({ title, to, children }: { title: string; to: number; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-[#7cc4ff26] bg-white/[0.04] p-5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display font-bold">{title}</h4>
        <button type="button" onClick={() => go(to)} className="flex items-center gap-1 text-xs font-semibold text-electric-light hover:underline">
          <Pencil className="w-3.5 h-3.5" /> {c.edit}
        </button>
      </div>
      {children}
    </div>
  );

  const stepReview = (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-display font-bold text-xl">{c.revTitle}</h3>
        <p className="text-sm text-sky-text/65">{c.revSub}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RevBlock title={c.steps[0]} to={0}>
          <RevRow k={c.licensePhoto} v={hasPhoto ? c.licenseAttached(photos.back ? 2 : 1) : undefined} />
          <RevRow k={c.firstName} v={`${driver.firstName} ${driver.lastName}`.trim()} />
          <RevRow k={c.dob} v={driver.dob} />
          <RevRow k={c.email} v={driver.email} />
          <RevRow k={c.phone} v={driver.phone} />
          <RevRow k={c.state} v={[driver.city, driver.state, driver.zip].filter(Boolean).join(", ")} />
          <RevRow k={c.licenseStatus} v={label("licenseStatus", driver.licenseStatus, lang)} />
          {extra.map((x, i) => (
            <RevRow key={i} k={c.driverN(i + 2)} v={`${x.firstName} ${x.lastName}`.trim()} />
          ))}
        </RevBlock>
        <RevBlock title={c.steps[1]} to={1}>
          {vehicles.map((v, i) => (
            <RevRow key={i} k={c.vehicleN(i + 1)} v={`${v.year} ${v.make} ${v.model}`} />
          ))}
        </RevBlock>
        <RevBlock title={c.steps[2]} to={2}>
          <RevRow k={c.insured} v={label("insured", coverage.insured, lang)} />
          <RevRow k={c.currentCarrier} v={coverage.currentCarrier} />
          <RevRow k={c.level} v={label("level", coverage.level, lang)} />
          <RevRow k={c.deductible} v={coverage.deductible && label("deductible", coverage.deductible, lang)} />
          <RevRow k={c.startDate} v={coverage.startDate} />
        </RevBlock>
        <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <BadgeDollarSign className="w-5 h-5 text-amber-200" />
            <h4 className="font-display font-bold text-amber-100">{c.feeTitle}</h4>
          </div>
          <p className="text-sm text-amber-50/90 leading-relaxed">{c.feeText}</p>
        </div>
      </div>

      <label className={"flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors " + (E("consent") ? "border-red-400/70 bg-red-500/10" : "border-[#7cc4ff33] bg-white/[0.04] hover:border-[#33aaff]")}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
          }}
          aria-invalid={Boolean(E("consent"))}
          className="mt-0.5 w-5 h-5 shrink-0 accent-[#0096FF]"
        />
        <span className="text-sm leading-relaxed text-sky-text/90">{c.consent}</span>
      </label>
      {E("consent") && <p className="text-xs text-red-300 -mt-2">{E("consent")}</p>}

      {/* Honeypot (hidden from people) */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] w-px h-px opacity-0"
        aria-hidden="true"
        name="website"
      />
    </div>
  );

  const steps = [stepDriver, stepVehicles, stepCoverage, stepReview];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
        html, body { background-color: ${BG} !important; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: .7; cursor: pointer; }
      `}</style>

      <div
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
              <button
                type="button"
                onClick={() => setLang(lang === "es" ? "en" : "es")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#7cc4ff55] bg-[#0096ff14] hover:bg-[#0096ff26] text-xs font-mono font-bold text-[#7cc4ff] tracking-widest"
                aria-label={lang === "es" ? "Switch to English" : "Cambiar a español"}
              >
                <Globe className="w-3 h-3" /> {lang === "es" ? "EN" : "ES"}
              </button>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-electric hover:bg-electric-light text-sm font-semibold glow-electric-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <header className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-2 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7cc4ff55] bg-[#0096ff1f] mb-6"
          >
            <Car className="w-3.5 h-3.5 text-electric-light" />
            <span className="text-xs font-mono tracking-widest text-[#7cc4ff] uppercase">{c.badge}</span>
          </motion.div>
          <motion.h1
            key={lang}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display font-black text-4xl sm:text-5xl md:text-6xl leading-[1.05]"
          >
            {c.title1}
            <span className="block text-electric-light glow-text">{c.title2}</span>
          </motion.h1>
          <p className="text-sky-text/80 text-base sm:text-lg max-w-2xl mx-auto mt-5">{c.sub}</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
            {c.perks.map((p, i) => {
              const Icon = [BadgeDollarSign, Languages, Clock][i];
              return (
                <span key={p} className="flex items-center gap-2 text-sm text-sky-text/85">
                  <Icon className="w-4 h-4 text-emerald-300" /> {p}
                </span>
              );
            })}
          </div>
        </header>

        <div className="relative z-10">
          <CarrierStrip carriers={carriers} c={c} />
        </div>

        {/* Form + side panel */}
        <main ref={formTop} className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-24 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 lg:gap-8 items-start scroll-mt-20">
          <div className="rounded-3xl border border-[#7cc4ff33] shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
            {done ? (
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="px-6 sm:px-10 py-14 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                  className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-300/50 flex items-center justify-center mb-6"
                >
                  <CheckCircle2 className="w-11 h-11 text-emerald-300" />
                </motion.div>
                <h2 className="font-display font-black text-3xl sm:text-4xl">{c.thanks(done.name)}</h2>
                <p className="text-lg text-sky-text/85 mt-3 max-w-xl mx-auto flex flex-col items-center gap-2">
                  <Mail className="w-5 h-5 text-electric-light" />
                  {c.successText(done.email)}
                </p>
                <p className="mt-6 inline-flex flex-col items-center rounded-2xl border border-[#7cc4ff33] bg-black/15 px-6 py-3">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#7cc4ff]">{c.successCode}</span>
                  <span className="font-mono font-bold text-2xl">{done.code}</span>
                </p>
                <div className="mt-6 max-w-xl mx-auto rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm text-amber-50/90 flex items-start gap-2 text-left">
                  <BadgeDollarSign className="w-5 h-5 text-amber-200 shrink-0" />
                  {c.successFee}
                </div>
                <p className="text-xs text-sky-text/55 mt-4">{c.successSpam}</p>
                <button type="button" onClick={restart} className="mt-8 px-6 py-3 rounded-full border border-[#7cc4ff55] hover:bg-white/10 font-semibold">
                  {c.newQuote}
                </button>
              </motion.div>
            ) : (
              <>
                {/* Stepper */}
                <div className="px-5 sm:px-8 pt-6 sm:pt-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">{c.stepOf(step + 1, steps.length)}</span>
                    <span className="text-sm font-semibold">{c.steps[step]}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-[#0096FF] to-[#5fd0ff]" animate={{ width: `${progress}%` }} transition={{ duration: 0.45, ease: "easeOut" }} />
                  </div>
                  <ol className="hidden sm:grid grid-cols-4 gap-2 mt-5">
                    {c.steps.map((s, i) => {
                      const Icon = stepIcons[i];
                      const state = i < step ? "done" : i === step ? "now" : "todo";
                      return (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => (i < step ? go(i) : i > step ? go(i) : undefined)}
                            className={
                              "w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors " +
                              (state === "now" ? "bg-[#0096ff26] text-white" : state === "done" ? "text-emerald-200 hover:bg-white/5" : "text-sky-text/50 hover:bg-white/5")
                            }
                          >
                            <span
                              className={
                                "w-7 h-7 shrink-0 rounded-full flex items-center justify-center border " +
                                (state === "done" ? "bg-emerald-500/25 border-emerald-300/60" : state === "now" ? "bg-electric border-electric" : "border-white/20")
                              }
                            >
                              {state === "done" ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Icon className="w-3.5 h-3.5" />}
                            </span>
                            <span className="truncate font-medium">{s}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Step body */}
                <div className="relative px-5 sm:px-8 py-6 sm:py-8">
                  <AnimatePresence mode="wait" custom={dir}>
                    <motion.div
                      key={step}
                      custom={dir}
                      initial={{ opacity: 0, x: dir * 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: dir * -40 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                    >
                      {steps[step]}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-5 sm:px-8 pb-6 sm:pb-8">
                  {(hasErrors || serverError) && (
                    <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {serverError ?? c.fixErrors}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    {step > 0 ? (
                      <button type="button" onClick={() => go(step - 1)} className="flex items-center gap-2 px-5 py-3 rounded-full border border-[#7cc4ff55] hover:bg-white/10 font-semibold">
                        <ArrowLeft className="w-4 h-4" /> <span>{c.back}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-sky-text/50 max-w-[55%]">{c.privacy}</span>
                    )}
                    {step < steps.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => go(step + 1)}
                        className="flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-full bg-electric hover:bg-electric-light font-bold glow-electric-sm hover:scale-[1.02] transition-all"
                      >
                        {c.next} <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={submit}
                        disabled={pending}
                        className="flex items-center gap-2 px-6 sm:px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 font-bold shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:scale-[1.02] transition-all"
                      >
                        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {pending ? c.sending : c.submit}
                      </button>
                    )}
                  </div>
                </div>
              </>
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
            <div className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <BadgeDollarSign className="w-5 h-5 text-amber-200" />
                <h3 className="font-display font-bold text-amber-100">{c.feeTitle}</h3>
              </div>
              <p className="text-sm text-amber-50/90 leading-relaxed">{c.feeText}</p>
            </div>
          </aside>
        </main>

        <footer className="relative z-10 border-t border-[#7cc4ff1a] py-8 text-center px-4">
          <p className="text-xs font-mono text-[#7cc4ff99]">© {new Date().getFullYear()} Pro-DG</p>
        </footer>
      </div>
    </>
  );
}
