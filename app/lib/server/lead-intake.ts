import "server-only";
import { dbReady } from "./redis";
import { resendReady, sendEmail, emailLayout, esc } from "./resend";
import { upsertContact } from "./contacts";
import type { InsuranceLead } from "./insurance";
import { enroll, formSequence, sendNowFor, varsFromLead } from "./sequences";
import { notifyTelegram, telegramReady } from "./telegram";
import { leadTelegram } from "./lead-telegram";
import { normalizeState } from "@/app/lib/contact-details";
import { label, type Lang, type OptionGroup } from "@/app/seguros/model";
import { leadService, productLabel, serviceGroup } from "@/app/lib/lead-service";

// Everything that happens after a new insurance request is saved, shared by the
// /seguros form and Meta lead ads: Telegram + email heads-up, exactly one email to
// the customer (Email 1 of the form sequence, or the plain confirmation), and the
// contact list.

type NewLead = Omit<InsuranceLead, "id" | "number"> & { code: string };

const t = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);

/**
 * Runs the follow-up steps. Returns true if we (the team) were notified by email or Telegram.
 * Leads added by hand in the portal pass `notifyEmail: false` (the team already knows) and
 * `customerEmail: false` unless the agent chose to send the follow-up emails.
 */
export async function afterNewLead(
  saved: InsuranceLead | null,
  l: NewLead,
  opts: { list: string; source: string; notifyEmail?: boolean; customerEmail?: boolean }
): Promise<boolean> {
  const d = l.driver;
  const service = saved ? leadService(saved) : "";
  let notified = false;
  const telegram = telegramReady() ? notifyTelegram(leadTelegram(l)) : Promise.resolve(false);
  if (resendReady() && d.email) {
    const tasks: Promise<unknown>[] = [];
    const notify = opts.notifyEmail === false ? "" : process.env.NOTIFY_EMAIL;
    if (notify) {
      tasks.push(
        sendEmail({
          to: notify,
          replyTo: d.email,
          subject: `Nueva solicitud de seguro ${l.code}${opts.source === "Meta" ? " (Meta)" : ""} — ${[d.firstName, d.lastName].filter(Boolean).join(" ") || d.email}`,
          html: emailLayout(adminSummary(l)),
          category: "notify",
        }).then(() => (notified = true))
      );
    }
    if (opts.customerEmail !== false)
      tasks.push(
        startSequence(saved, d.email, opts.source).then((sent) =>
          sent
            ? undefined
            : sendEmail({ to: d.email, subject: confirmationSubject(l.lang, l.code, service), html: emailLayout(confirmationBody(l.lang, l.code, d.firstName, service)), category: "confirmation" })
        )
      );
    const state = normalizeState(d.state);
    tasks.push(
      upsertContact(
        {
          email: d.email,
          firstName: d.firstName,
          lastName: d.lastName,
          ...(d.phone ? { phone: d.phone } : {}),
          ...(state ? { state, stateGuessed: false } : {}),
          lang: l.lang,
          ...(l.coverage.insured ? { insured: l.coverage.insured } : {}),
        },
        opts.list
      )
    );
    const results = await Promise.allSettled(tasks);
    results.forEach((r) => r.status === "rejected" && console.error("[leads] follow-up step failed", r.reason));
  }
  if (await telegram) notified = true;
  return notified;
}

/** Enrolls the lead in the form sequence and sends its first email. True if that email went out. */
async function startSequence(lead: InsuranceLead | null, email: string, source: string): Promise<boolean> {
  if (!lead || !dbReady()) return false;
  try {
    const seq = await formSequence(serviceGroup(leadService(lead)));
    if (!seq) return false;
    const v = varsFromLead(lead);
    const { added } = await enroll(seq, [{ email, firstName: v.firstName, lang: v.lang, vehicle: v.vehicle, state: v.state, insured: v.insured, product: v.product, source }]);
    return added > 0 && (await sendNowFor(seq, email));
  } catch (e) {
    console.error("[leads] sequence start failed", e);
    return false;
  }
}

// ─── Emails ──────────────────────────────────────────────────────────────────

function confirmationSubject(lang: Lang, code: string, service = "") {
  if (serviceGroup(service) !== "insurance") {
    const product = productLabel(service, lang);
    return t(lang, `Recibimos tu solicitud de ${product} (${code})`, `We received your request for ${product} (${code})`);
  }
  return t(lang, `Recibimos tu solicitud de seguro de auto (${code})`, `We received your car insurance request (${code})`);
}

function confirmationBody(lang: Lang, code: string, name: string, service = "") {
  const p = (x: string) => `<p style="margin:0 0 16px;line-height:1.6">${x}</p>`;
  // Tags, inspections and other services: no insurance wording.
  if (serviceGroup(service) !== "insurance") {
    const product = esc(productLabel(service, lang));
    return lang === "es"
      ? p(`Hola${name ? " " + esc(name) : ""},`) +
          p(`Recibimos tu solicitud de <strong>${product}</strong> (${code}). Te vamos a contactar pronto para decirte los siguientes pasos.`) +
          p(`Si prefieres adelantar, responde a este correo o llámanos al (240) 256-6360.`) +
          p(`— Car Tag &amp; Registration Services`)
      : p(`Hi${name ? " " + esc(name) : ""},`) +
          p(`We received your request for <strong>${product}</strong> (${code}). We'll contact you shortly with the next steps.`) +
          p(`If you'd like to move faster, reply to this email or call us at (240) 256-6360.`) +
          p(`— Car Tag &amp; Registration Services`);
  }
  return lang === "es"
    ? p(`Hola${name ? " " + esc(name) : ""},`) +
        p(`Recibimos tu solicitud de cotización de seguro de auto <strong>${code}</strong>. Estamos comparando opciones y <strong>te enviaremos tu cotización por este mismo correo</strong>.`) +
        p(`Recuerda: la cotización es gratis. Si decides <strong>comprar la póliza</strong> a través de nosotros, se aplica un <strong>cargo de servicio de US$150</strong>.`) +
        p(`Si necesitas corregir algún dato, simplemente responde a este correo.`) +
        p(`— El equipo de Pro-DG`)
    : p(`Hi${name ? " " + esc(name) : ""},`) +
        p(`We received your car insurance quote request <strong>${code}</strong>. We're comparing options and <strong>will email your quote to this address</strong>.`) +
        p(`Please note: the quote is free. If you choose to <strong>purchase the policy</strong> through us, a <strong>US$150 service fee</strong> applies.`) +
        p(`If anything needs correcting, just reply to this email.`) +
        p(`— The Pro-DG team`);
}

function adminSummary(l: NewLead) {
  const row = (k: string, v: string) =>
    v ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6b82;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : "";
  const table = (rows: string) => `<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin:0 0 18px">${rows}</table>`;
  const h = (x: string) => `<h3 style="margin:18px 0 8px;font-size:15px;color:#0B2B5E">${x}</h3>`;
  const L = (g: OptionGroup, v: string) => label(g, v, "es");
  const d = l.driver;
  let html = `<p style="margin:0 0 6px;font-size:18px;font-weight:700">Solicitud ${l.code}</p>
<p style="margin:0 0 14px;color:#5b6b82">${l.source === "meta" ? "Origen: formulario instantáneo de Meta · " : ""}Idioma del cliente: ${l.lang === "es" ? "Español" : "Inglés"} · Responde a este correo para escribirle.</p>`;
  if (l.licensePhotos) {
    html += `<p style="margin:0 0 14px;padding:10px 12px;background:#fff7e0;border-radius:8px">📎 El cliente subió ${l.licensePhotos === 1 ? "una foto" : "fotos"} de su licencia de conducir. Por seguridad no se adjuntan al correo: ábrelas en el portal → Seguros.</p>`;
  }
  html += h("Conductor principal") + table(
    row("Nombre", `${d.firstName} ${d.lastName}`) + row("Nacimiento", d.dob) + row("Género", L("gender", d.gender)) +
    row("Estado civil", L("marital", d.marital)) + row("Correo", d.email) + row("Teléfono", d.phone) +
    row("Dirección", [d.street, d.city, `${d.state} ${d.zip}`.trim()].filter(Boolean).join(", ")) +
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
