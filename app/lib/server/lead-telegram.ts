import "server-only";
import { label, type OptionGroup } from "@/app/seguros/model";
import type { InsuranceLead } from "./insurance";
import { portalLink, tg } from "./telegram";

/** Short Telegram heads-up for a new request (no DOB / license numbers). */
export function leadTelegram(l: Omit<InsuranceLead, "id" | "number"> & { code: string }): string {
  const d = l.driver;
  const L = (g: OptionGroup, v: string) => (v ? label(g, v, "es") : "");
  const name = [d.firstName, d.lastName].filter(Boolean).join(" ") || "(sin nombre)";
  const cars = l.vehicles
    .map((v) => [v.year, v.make, v.model].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ");
  const details = [
    `<b>${tg(name)}</b>`,
    d.phone ? `📞 ${tg(d.phone)}` : null,
    d.email ? `✉️ ${tg(d.email)}` : null,
    d.state ? `📍 ${tg([d.city, d.state].filter(Boolean).join(", "))}` : null,
    cars ? `🚙 ${tg(cars)}` : null,
    l.coverage.insured ? `🛡 ${tg(L("insured", l.coverage.insured))}` : null,
    l.coverage.level ? `📋 ${tg(L("level", l.coverage.level))}` : null,
    `🗣 ${l.lang === "es" ? "Español" : "Inglés"} · Contacto: ${tg(L("contactPref", l.coverage.contactPref) || "—")}`,
    l.coverage.notes ? `📝 ${tg(l.coverage.notes.slice(0, 300))}` : null,
  ].filter((x): x is string => Boolean(x));
  return [`🚗 <b>Nueva solicitud de seguro</b> · ${tg(l.code)}`, details.join("\n"), portalLink("/seguros", "Ver en el portal")].join("\n\n");
}

