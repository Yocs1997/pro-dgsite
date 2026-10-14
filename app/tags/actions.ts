"use server";

import { headers } from "next/headers";
import { allow, dbReady } from "@/app/lib/server/redis";
import { saveLead, saveLicensePhotos, type InsuranceLead } from "@/app/lib/server/insurance";
import { afterNewLead } from "@/app/lib/server/lead-intake";
import { sanitizeInsurance, sanitizePhotos } from "@/app/lib/server/insurance-sanitize";
import { emptyCoverage, emptyDriver, isEmail, phoneDigits, type Lang } from "@/app/seguros/model";
import { TAG_STATES, TAG_SERVICES, PHOTO_KINDS, serviceValue, type PhotoKind, type TagService } from "./model";

// The /tags form: tags and registration requests. Saved as a lead in the portal's Seguros
// inbox (with the photos of the title and ID), announced on Telegram, and followed up the
// same way as the other forms (the "placas" sequence, or the confirmation email).

export type TagsInput = {
  lang: Lang;
  service: TagService;
  state: string; // NJ, PA, VA, MD, NY, SD
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  zip: string;
  city: string;
  homeState: string; // where they live (from the ZIP)
  year: string;
  make: string;
  model: string;
  vin: string;
  notes: string;
  photos: { kind: PhotoKind; data: string }[];
  consent: boolean;
  website?: string; // honeypot, must stay empty
};

export type TagsResult = { ok: true; code: string; email: string } | { ok: false; error: string };

const t = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);
const PHONE = "(240) 256-6360";

// Each photo is compressed in the browser to well under 1 MB, so 4 of them fit in one request.
const MAX_PHOTO = 1_000_000;

export async function submitTagsRequest(input: TagsInput): Promise<TagsResult> {
  const lang: Lang = input?.lang === "en" ? "en" : "es";
  if (String(input?.website ?? "").trim()) return { ok: true, code: "SEG-0000", email: "" };
  if (!dbReady()) {
    return { ok: false, error: t(lang, `El formulario aún no está disponible. Llámanos al ${PHONE}.`, `The form isn't available yet. Please call us at ${PHONE}.`) };
  }

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!(await allow(`pdg:rl:tags:${ip}`, 5, 3600))) {
    return { ok: false, error: t(lang, "Recibimos varias solicitudes desde tu conexión. Inténtalo más tarde.", "Too many requests from your connection. Please try again later.") };
  }

  const state = TAG_STATES.find((s) => s.code === input?.state);
  const service = TAG_SERVICES.find((s) => s.id === input?.service);
  const { driver, vehicles, coverage } = sanitizeInsurance({
    driver: {
      ...emptyDriver(),
      firstName: input?.firstName,
      lastName: input?.lastName,
      email: input?.email,
      phone: input?.phone,
      zip: input?.zip,
      city: input?.city,
      state: input?.homeState,
    },
    vehicles: [{ year: input?.year, make: input?.make, model: input?.model, vin: input?.vin, ownership: "", use: "", miles: "" }],
    coverage: { ...emptyCoverage(), notes: input?.notes, contactPref: "email" },
  });
  // Not asked on this form: leave the driving history blank instead of "0 / No".
  Object.assign(driver, { accidents: "", tickets: "", sr22: "" });

  // Photos: keep the ones whose kind we know, one of each kind, in the form's order.
  const raw = (Array.isArray(input?.photos) ? input.photos : []).filter((p, i, all) => PHOTO_KINDS.some((k) => k.id === p?.kind) && all.findIndex((x) => x?.kind === p?.kind) === i);
  const data = sanitizePhotos(raw.map((p) => p.data), 4, MAX_PHOTO);
  const photos = raw.filter((p) => data.includes(String(p.data)));
  if (photos.length < raw.length) {
    return { ok: false, error: t(lang, "No pudimos leer una de las fotos. Quítala y súbela otra vez.", "We couldn't read one of the photos. Remove it and upload it again.") };
  }

  if (!state || !service || !driver.firstName || !isEmail(driver.email) || phoneDigits(driver.phone).length < 10) {
    return { ok: false, error: t(lang, "Faltan datos obligatorios. Revisa los campos marcados.", "Some required fields are missing. Please review the form.") };
  }
  const has = (k: PhotoKind) => photos.some((p) => p.kind === k);
  if (!has("id") || (service.id !== "registration" && !has("title-front"))) {
    return { ok: false, error: t(lang, "Falta la foto de tu ID o de tu título.", "The photo of your ID or title is missing.") };
  }
  if (!input?.consent) return { ok: false, error: t(lang, "Debes aceptar para enviar tu solicitud.", "Please accept to submit your request.") };

  const now = Date.now();
  const base: Omit<InsuranceLead, "id" | "number" | "code"> = {
    lang,
    driver,
    extraDrivers: [],
    vehicles,
    coverage,
    createdAt: now,
    updatedAt: now,
    status: "nueva",
    consentAt: now,
    licensePhotos: photos.length,
    ...(photos.length ? { photoLabels: photos.map((p) => PHOTO_KINDS.find((k) => k.id === p.kind)!.portal) } : {}),
    source: "tags",
    service: serviceValue(service.id, state.code),
  };

  let lead: InsuranceLead;
  try {
    lead = await saveLead(base);
    if (photos.length) await saveLicensePhotos(lead.id, photos.map((p) => p.data));
  } catch (e) {
    console.error("[tags] could not save request", e);
    return { ok: false, error: t(lang, `No pudimos enviar tu solicitud. Inténtalo de nuevo o llámanos al ${PHONE}.`, `We couldn't send your request. Please try again or call us at ${PHONE}.`) };
  }
  await afterNewLead(lead, { ...base, code: lead.code }, { list: "Placas", source: "Formulario de placas" });
  return { ok: true, code: lead.code, email: driver.email };
}
