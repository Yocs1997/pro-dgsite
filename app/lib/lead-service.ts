// The service a lead asked for on the Meta form ("Por favor seleccione el servicio
// que le interesa": Seguros para su carro, Placas de Maryland, Placas de Virginia,
// Inspecciones de Maryland, Placas de South Dakota, Otro; several can be picked),
// and how to say it inside an email in English or Spanish.

export type ServiceLang = "en" | "es";

/** Used when we don't know what the person asked for. */
export const DEFAULT_PRODUCT: Record<ServiceLang, string> = { en: "car insurance", es: "seguro de auto" };

/** Reads the answer to the "which service" question out of a lead's notes
 *  ("… · por favor seleccione el servicio que le interesa: placas_de_virginia · …").
 *  Several answers come back comma-separated. */
export function serviceFromNotes(notes: string): string {
  const m = notes.match(/(?:servicio|service)[^:·\n]*:\s*([^·\n]*)/i);
  if (!m) return "";
  // Notes are editable, so only the form's own answers count: Meta sends them as
  // one_word_with_underscores (or exactly a known option); anything typed after is ignored.
  const KNOWN = /^(placas?( temporales?)? de [a-z ]{2,20}|seguros? (para su carro|de auto)|inspecciones de [a-z ]{2,20}|licencias?|otros?|other)$/;
  const picks: string[] = [];
  for (const part of m[1].toLowerCase().split(",")) {
    const whole = part.trim().replace(/\s+/g, " ");
    const first = whole.split(" ")[0] ?? "";
    if (KNOWN.test(whole)) picks.push(whole);
    else if (/^[\p{L}\d]+(_[\p{L}\d]+)+$/u.test(first) || /^(otros?|other)$/.test(first)) {
      picks.push(first.replace(/_/g, " "));
      if (first !== whole) break; // extra words after the answer: someone's own note starts here
    } else break;
  }
  return picks.join(", ").slice(0, 160);
}

/** The service a lead asked for: saved on the lead when it arrives (or the first time it is
 *  edited); older leads fall back to reading the form answer in their notes. */
export const leadService = (l: { service?: string; coverage?: { notes?: string } }): string =>
  l.service ?? serviceFromNotes(l.coverage?.notes ?? "");

const PLACES = /\b(virginia|maryland|dakota|washington|texas|florida|georgia|pennsylvania|delaware|carolina|york|jersey|north|south|new|west|dc)\b/g;
const cap = (s: string) => s.replace(PLACES, (w) => (w === "dc" ? "DC" : w[0].toUpperCase() + w.slice(1)));
const isOther = (s: string) => /^(otros?|other)$/.test(s);
const isCarInsurance = (s: string) => /^seguros?\b.*\b(auto|autos|carro|carros|veh[ií]culos?)$/.test(s) || /^(car|auto) insurance$/.test(s);

function one(s: string, lang: ServiceLang): string {
  if (isCarInsurance(s)) return DEFAULT_PRODUCT[lang];
  if (isOther(s)) return lang === "es" ? "nuestros servicios" : "our services";
  if (lang === "es") return cap(s.replace(/^inspecciones\b/, "inspección"));
  const place = (rest?: string) => (rest ? `${cap(rest.trim())} ` : "");
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^placas? temporales?(?: de (.+))?$/))) return `${place(m[1])}temporary tags`;
  if ((m = s.match(/^placas?(?: de (.+))?$/))) return `${place(m[1])}tags`;
  if ((m = s.match(/^inspecci(?:ó|o)n(?:es)?(?: de (.+))?$/))) return `${place(m[1])}vehicle inspections`;
  if ((m = s.match(/^licencias?(?: de (.+))?$/))) return `${place(m[1])}license`;
  if ((m = s.match(/^(?:registraci[oó]n|registro)(?: de (.+))?$/))) return `${place(m[1])}vehicle registration`;
  if ((m = s.match(/^t[ií]tulos?(?: de (.+))?$/))) return `${place(m[1])}vehicle title`;
  if (/^seguros?$/.test(s)) return "insurance";
  return cap(s); // unknown option: keep the form's own wording
}

/** Which follow-up a form lead belongs to: "tags" if they picked any placas option (even
 *  together with insurance), "insurance" for car insurance or no pick at all (the website
 *  form), "other" for inspections, "Otro" and anything else. */
export type FormGroup = "insurance" | "tags" | "other";
export function serviceGroup(service: string): FormGroup {
  const parts = service
    .toLowerCase()
    .split(/\s*,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "insurance";
  if (parts.some((p) => /^placas?\b/.test(p))) return "tags";
  return parts.every(isCarInsurance) ? "insurance" : "other";
}

/** How the service reads inside a sentence: "placas de virginia" → "placas de Virginia" /
 *  "Virginia tags"; several picks are joined ("Virginia tags and car insurance"). */
export function productLabel(service: string, lang: ServiceLang): string {
  let parts = service
    .toLowerCase()
    .split(/\s*,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) parts = parts.filter((p) => !isOther(p)); // "Otro" adds nothing next to a real pick
  if (!parts.length) return DEFAULT_PRODUCT[lang];
  const labels = Array.from(new Set(parts.map((p) => one(p, lang))));
  if (labels.length === 1) return labels[0];
  const last = labels[labels.length - 1];
  // Spanish: "y" becomes "e" before an "i" sound ("placas e inspección").
  const and = lang === "es" ? (/^h?i/i.test(last) ? " e " : " y ") : " and ";
  return `${labels.slice(0, -1).join(", ")}${and}${last}`;
}
