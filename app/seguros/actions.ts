"use server";

import { headers } from "next/headers";
import { allow, dbReady } from "@/app/lib/server/redis";
import { resendReady } from "@/app/lib/server/resend";
import { saveLead, saveLicensePhotos, type InsuranceLead } from "@/app/lib/server/insurance";
import { afterNewLead } from "@/app/lib/server/lead-intake";
import { missingRequired, sanitizeInsurance, sanitizePhotos } from "@/app/lib/server/insurance-sanitize";
import type { InsuranceInput, Lang } from "./model";

export type InsuranceResult = { ok: true; code: string; email: string } | { ok: false; error: string };

const t = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);
const s = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

export async function submitInsuranceQuote(input: InsuranceInput): Promise<InsuranceResult> {
  const lang: Lang = input?.lang === "en" ? "en" : "es";

  // Honeypot: bots fill every field; people never see this one.
  if (s(input?.website)) return { ok: true, code: "SEG-0000", email: "" };

  if (!dbReady() && !resendReady()) {
    return { ok: false, error: t(lang, "El formulario aún no está disponible. Llámanos al (240) 256-6360.", "The form isn't available yet. Please call us at (240) 256-6360.") };
  }

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (dbReady() && !(await allow(`pdg:rl:ins:${ip}`, 5, 3600))) {
    return { ok: false, error: t(lang, "Recibimos varias solicitudes desde tu conexión. Inténtalo más tarde.", "Too many requests from your connection. Please try again later.") };
  }

  const { driver, extraDrivers, vehicles, coverage } = sanitizeInsurance(input);
  const photos = sanitizePhotos(input?.licensePhotos);

  // Validation (the browser checks the same things; this is the safety net).
  if (missingRequired({ driver, extraDrivers, vehicles, coverage }, photos.length > 0)) {
    return { ok: false, error: t(lang, "Faltan datos obligatorios. Revisa los campos marcados.", "Some required fields are missing. Please review the form.") };
  }
  if (!input?.consent) {
    return { ok: false, error: t(lang, "Debes aceptar los términos para continuar.", "Please accept the terms to continue.") };
  }

  const now = Date.now();
  const base = {
    lang, driver, extraDrivers, vehicles, coverage,
    createdAt: now, updatedAt: now, status: "nueva" as const, consentAt: now,
    licensePhotos: photos.length,
  };

  let lead: InsuranceLead | null = null;
  if (dbReady()) {
    try {
      lead = await saveLead(base);
      await saveLicensePhotos(lead.id, photos);
    } catch (e) {
      console.error("[seguros] could not save lead", e);
    }
  }
  const code = lead?.code ?? `SEG-${now.toString(36).toUpperCase()}`;

  const notified = await afterNewLead(lead, { ...base, code }, { list: "Seguros", source: "Formulario" });

  if (!lead && !notified) {
    return { ok: false, error: t(lang, "No pudimos enviar tu solicitud. Inténtalo de nuevo o llámanos al (240) 256-6360.", "We couldn't send your request. Please try again or call us at (240) 256-6360.") };
  }
  return { ok: true, code, email: driver.email };
}
