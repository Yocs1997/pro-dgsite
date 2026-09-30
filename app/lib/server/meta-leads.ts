import "server-only";
import { normalizeState } from "@/app/lib/contact-details";
import { emptyDriver, type Driver } from "@/app/seguros/model";

// Maps Meta Instant Form answers onto the website form's driver fields.
// Question keys come from the form (e.g. "first_name", "do_you_need_an_sr-22?"),
// so matching is by keyword, in English or Spanish.

export type FieldData = { name: string; values?: string[] }[];

const count = (v: string) => {
  const s = v.toLowerCase();
  if (/3\+|3 or more|3 o más|more than 2|three or more/.test(s)) return "3+";
  if (/^(none|no|ninguno|zero)$/.test(s.trim())) return "0";
  const n = s.match(/\d+/)?.[0];
  if (!n) return "";
  return Number(n) >= 3 ? "3+" : n;
};
// (?![a-zá-ú]) instead of \b: \b doesn't treat "í" as a letter.
const yesNo = (v: string) => (/^(y|yes|s[ií]|true)(?![a-zá-ú])/i.test(v.trim()) ? "yes" : /^(n|no|false)(?![a-zá-ú])/i.test(v.trim()) ? "no" : "");
const licenseType = (v: string) => {
  const s = v.toLowerCase();
  if (/international|foreign|extranjer|internacional|other country/.test(s)) return "intl";
  if (/permit|learner|aprendiz/.test(s)) return "permit";
  if (/^(none|no license|no|sin licencia)|don.?t have/.test(s)) return "none";
  if (/u\.?s\.?|united states|american|state|ee\.? ?uu|valid|regular|driver/.test(s)) return "us";
  return "";
};

/** Maps Instant Form answers onto the same driver fields as the website form. */
export function mapAnswers(fields: FieldData) {
  const driver: Driver = { ...emptyDriver(), accidents: "", tickets: "", sr22: "" };
  const extra: string[] = [];
  for (const f of fields) {
    const key = f.name.toLowerCase();
    const value = (f.values ?? []).join(", ").trim();
    if (!value) continue;
    if (/sr.?22/.test(key)) driver.sr22 = yesNo(value) || driver.sr22;
    else if (/accident/.test(key)) driver.accidents = count(value);
    else if (/ticket|violation|multa/.test(key)) driver.tickets = count(value);
    else if (/licen/.test(key)) driver.licenseStatus = licenseType(value);
    else if (/first.?name|^nombre/.test(key)) driver.firstName = value;
    else if (/last.?name|apellido/.test(key)) driver.lastName = value;
    else if (/full.?name/.test(key)) {
      const [first, ...rest] = value.split(/\s+/);
      driver.firstName ||= first;
      driver.lastName ||= rest.join(" ");
    } else if (/e.?mail|correo/.test(key)) driver.email = value.toLowerCase();
    else if (/phone|tel[eé]fono/.test(key)) driver.phone = value;
    else if (/^state$|^estado$|province/.test(key)) driver.state = normalizeState(value) || value;
    else if (/zip|postal/.test(key)) driver.zip = value.slice(0, 10);
    else if (/city|ciudad/.test(key)) driver.city = value;
    else extra.push(`${f.name.replace(/_/g, " ")}: ${value}`);
  }
  return { driver, extra };
}

/** Billing-system forms (Pro-DG page): name, business, city, plus Meta's contact fields. */
export function mapPosAnswers(fields: FieldData) {
  const out = { name: "", first: "", last: "", business: "", city: "", phone: "", email: "" };
  const extra: string[] = [];
  for (const f of fields) {
    const key = f.name.toLowerCase();
    const value = (f.values ?? []).join(", ").trim();
    if (!value) continue;
    // Business first: "nombre_del_negocio" also contains "nombre".
    if (/negocio|business|empresa|company|comercio/.test(key)) out.business = value;
    else if (/ciudad|city|municipio/.test(key)) out.city = value;
    else if (/e.?mail|correo/.test(key)) out.email = value.toLowerCase();
    else if (/phone|tel[eé]fono|celular|whats/.test(key)) out.phone = value;
    else if (/full.?name|nombre.*apellido|nombre_completo|^name$|^nombre$/.test(key)) out.name = value;
    else if (/first.?name/.test(key)) out.first = value;
    else if (/last.?name|apellido/.test(key)) out.last = value;
    else extra.push(`${f.name.replace(/_/g, " ").replace(/[?:]+$/, "")}: ${value}`);
  }
  const name = out.name || [out.first, out.last].filter(Boolean).join(" ");
  return { name, business: out.business, city: out.city, phone: out.phone, email: out.email, extra };
}

