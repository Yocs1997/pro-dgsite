"use server";

import { headers } from "next/headers";
import { allow, dbReady } from "@/app/lib/server/redis";
import { resendReady, sendEmail, emailLayout, esc } from "@/app/lib/server/resend";
import { upsertContact } from "@/app/lib/server/contacts";
import { saveLead, type InsuranceLead } from "@/app/lib/server/insurance";
import {
  isEmail,
  label,
  phoneDigits,
  MAX_EXTRA_DRIVERS,
  MAX_VEHICLES,
  OPTIONS,
  US_STATES,
  type InsuranceInput,
  type Lang,
  type OptionGroup,
} from "./model";

export type InsuranceResult = { ok: true; code: string; email: string } | { ok: false; error: string };

const t = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);
const s = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const opt = (group: OptionGroup, v: unknown) => {
  const val = s(v, 40);
  return val in OPTIONS[group] ? val : "";
};
const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(s(v, 10)) ? s(v, 10) : "");
const stateCode = (v: unknown) => (US_STATES.some(([c]) => c === s(v, 2)) ? s(v, 2) : "");

export async function submitInsuranceQuote(input: InsuranceInput): Promise<InsuranceResult> {
  const lang: Lang = input?.lang === "en" ? "en" : "es";

  // Honeypot: bots fill every field; people never see this one.
  if (s(input?.website)) return { ok: true, code: "SEG-0000", email: "" };

  if (!dbReady() && !resendReady()) {
    return { ok: false, error: t(lang, "El formulario aún no está disponible. Escríbenos por WhatsApp.", "The form isn't available yet. Please contact us on WhatsApp.") };
  }

  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (dbReady() && !(await allow(`pdg:rl:ins:${ip}`, 5, 3600))) {
    return { ok: false, error: t(lang, "Recibimos varias solicitudes desde tu conexión. Inténtalo más tarde.", "Too many requests from your connection. Please try again later.") };
  }

  const d = input?.driver ?? ({} as InsuranceInput["driver"]);
  const driver = {
    firstName: s(d.firstName, 60),
    lastName: s(d.lastName, 60),
    dob: date(d.dob),
    gender: opt("gender", d.gender),
    marital: opt("marital", d.marital),
    email: s(d.email, 120).toLowerCase(),
    phone: s(d.phone, 30),
    street: s(d.street, 120),
    city: s(d.city, 60),
    state: stateCode(d.state),
    zip: s(d.zip, 10),
    licenseStatus: opt("licenseStatus", d.licenseStatus),
    licenseState: stateCode(d.licenseState),
    licenseNumber: s(d.licenseNumber, 30),
    yearsLicensed: s(d.yearsLicensed, 3).replace(/\D/g, ""),
    accidents: opt("count", d.accidents) || "0",
    tickets: opt("count", d.tickets) || "0",
    sr22: opt("yesno", d.sr22) || "no",
  };

  const extraDrivers = (Array.isArray(input?.extraDrivers) ? input.extraDrivers : [])
    .slice(0, MAX_EXTRA_DRIVERS)
    .map((x) => ({
      firstName: s(x?.firstName, 60),
      lastName: s(x?.lastName, 60),
      dob: date(x?.dob),
      relationship: opt("relationship", x?.relationship),
      licenseStatus: opt("licenseStatus", x?.licenseStatus),
    }))
    .filter((x) => x.firstName || x.lastName);

  const vehicles = (Array.isArray(input?.vehicles) ? input.vehicles : [])
    .slice(0, MAX_VEHICLES)
    .map((v) => ({
      year: s(v?.year, 4).replace(/\D/g, ""),
      make: s(v?.make, 40),
      model: s(v?.model, 60),
      vin: s(v?.vin, 17).toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ""),
      ownership: opt("ownership", v?.ownership),
      use: opt("use", v?.use),
      miles: opt("miles", v?.miles),
    }))
    .filter((v) => v.year || v.make || v.model);

  const c = input?.coverage ?? ({} as InsuranceInput["coverage"]);
  const coverage = {
    insured: opt("insured", c.insured),
    currentCarrier: s(c.currentCarrier, 60),
    level: opt("level", c.level),
    deductible: opt("deductible", c.deductible),
    startDate: date(c.startDate),
    contactPref: opt("contactPref", c.contactPref) || "email",
    notes: s(c.notes, 1500),
  };

  // Validation (the browser checks the same things; this is the safety net).
  const missing =
    !driver.firstName || !driver.lastName || !driver.dob || !isEmail(driver.email) ||
    phoneDigits(driver.phone).length < 10 || !driver.state || !/^\d{5}$/.test(driver.zip) ||
    !driver.licenseStatus || vehicles.length === 0 ||
    vehicles.some((v) => !/^\d{4}$/.test(v.year) || !v.make || !v.model) ||
    !coverage.insured || !coverage.level;
  if (missing) {
    return { ok: false, error: t(lang, "Faltan datos obligatorios. Revisa los campos marcados.", "Some required fields are missing. Please review the form.") };
  }
  if (!input?.consent) {
    return { ok: false, error: t(lang, "Debes aceptar los términos para continuar.", "Please accept the terms to continue.") };
  }

  const now = Date.now();
  const base = { lang, driver, extraDrivers, vehicles, coverage, createdAt: now, updatedAt: now, status: "nueva" as const, consentAt: now };

  let lead: InsuranceLead | null = null;
  if (dbReady()) {
    try {
      lead = await saveLead(base);
    } catch (e) {
      console.error("[seguros] could not save lead", e);
    }
  }
  const code = lead?.code ?? `SEG-${now.toString(36).toUpperCase()}`;

  let notified = false;
  if (resendReady()) {
    const tasks: Promise<unknown>[] = [];
    const notify = process.env.NOTIFY_EMAIL;
    if (notify) {
      tasks.push(
        sendEmail({
          to: notify,
          replyTo: driver.email,
          subject: `Nueva solicitud de seguro ${code} — ${driver.firstName} ${driver.lastName}`,
          html: emailLayout(adminSummary({ ...base, code })),
        }).then(() => (notified = true))
      );
    }
    tasks.push(sendEmail({ to: driver.email, subject: confirmationSubject(lang, code), html: emailLayout(confirmationBody(lang, code, driver.firstName)) }));
    tasks.push(upsertContact({ email: driver.email, firstName: driver.firstName, lastName: driver.lastName }, "Seguros"));
    const results = await Promise.allSettled(tasks);
    results.forEach((r) => r.status === "rejected" && console.error("[seguros] email step failed", r.reason));
  }

  if (!lead && !notified) {
    return { ok: false, error: t(lang, "No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.", "We couldn't send your request. Please try again or message us on WhatsApp.") };
  }
  return { ok: true, code, email: driver.email };
}

// ─── Emails ──────────────────────────────────────────────────────────────────

function confirmationSubject(lang: Lang, code: string) {
  return t(lang, `Recibimos tu solicitud de seguro de auto (${code})`, `We received your car insurance request (${code})`);
}

function confirmationBody(lang: Lang, code: string, name: string) {
  const p = (x: string) => `<p style="margin:0 0 16px;line-height:1.6">${x}</p>`;
  return lang === "es"
    ? p(`Hola ${esc(name)},`) +
        p(`Recibimos tu solicitud de cotización de seguro de auto <strong>${code}</strong>. Estamos comparando opciones y <strong>te enviaremos tu cotización por este mismo correo</strong>.`) +
        p(`Recuerda: la cotización es gratis. Si decides <strong>comprar la póliza</strong> a través de nosotros, se aplica un <strong>cargo de servicio de US$150</strong>.`) +
        p(`Si necesitas corregir algún dato, simplemente responde a este correo.`) +
        p(`— El equipo de Pro-DG`)
    : p(`Hi ${esc(name)},`) +
        p(`We received your car insurance quote request <strong>${code}</strong>. We're comparing options and <strong>will email your quote to this address</strong>.`) +
        p(`Please note: the quote is free. If you choose to <strong>purchase the policy</strong> through us, a <strong>US$150 service fee</strong> applies.`) +
        p(`If anything needs correcting, just reply to this email.`) +
        p(`— The Pro-DG team`);
}

function adminSummary(l: Omit<InsuranceLead, "id" | "number"> & { code: string }) {
  const row = (k: string, v: string) =>
    v ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6b82;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : "";
  const table = (rows: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin:0 0 18px">${rows}</table>`;
  const h = (x: string) => `<h3 style="margin:18px 0 8px;font-size:15px;color:#0B2B5E">${x}</h3>`;
  const L = (g: OptionGroup, v: string) => label(g, v, "es");
  const d = l.driver;
  let html = `<p style="margin:0 0 6px;font-size:18px;font-weight:700">Solicitud ${l.code}</p>
<p style="margin:0 0 14px;color:#5b6b82">Idioma del cliente: ${l.lang === "es" ? "Español" : "Inglés"} · Responde a este correo para escribirle.</p>`;
  html += h("Conductor principal") + table(
    row("Nombre", `${d.firstName} ${d.lastName}`) + row("Nacimiento", d.dob) + row("Género", L("gender", d.gender)) +
    row("Estado civil", L("marital", d.marital)) + row("Correo", d.email) + row("Teléfono", d.phone) +
    row("Dirección", [d.street, d.city, `${d.state} ${d.zip}`].filter(Boolean).join(", ")) +
    row("Licencia", L("licenseStatus", d.licenseStatus)) + row("Estado de licencia", d.licenseState) +
    row("No. de licencia", d.licenseNumber) + row("Años con licencia", d.yearsLicensed) +
    row("Accidentes (3 años)", L("count", d.accidents)) + row("Multas (3 años)", L("count", d.tickets)) +
    row("Necesita SR-22", L("yesno", d.sr22))
  );
  l.extraDrivers.forEach((x, i) => {
    html += h(`Conductor adicional ${i + 1}`) + table(
      row("Nombre", `${x.firstName} ${x.lastName}`) + row("Nacimiento", x.dob) +
      row("Relación", L("relationship", x.relationship)) + row("Licencia", L("licenseStatus", x.licenseStatus))
    );
  });
  l.vehicles.forEach((v, i) => {
    html += h(`Vehículo ${i + 1}`) + table(
      row("Vehículo", `${v.year} ${v.make} ${v.model}`) + row("VIN", v.vin) + row("Propiedad", L("ownership", v.ownership)) +
      row("Uso", L("use", v.use)) + row("Millas al año", L("miles", v.miles))
    );
  });
  const c = l.coverage;
  html += h("Cobertura") + table(
    row("Seguro actual", L("insured", c.insured)) + row("Aseguradora actual", c.currentCarrier) +
    row("Cobertura deseada", L("level", c.level)) + row("Deducible", L("deductible", c.deductible)) +
    row("Fecha de inicio", c.startDate) + row("Contacto preferido", L("contactPref", c.contactPref)) + row("Notas", c.notes)
  );
  return html;
}
