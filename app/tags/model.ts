// Shared (client + server) definitions for the tags & registration form (/tags).

export const TAG_STATES = [
  { code: "MD", name: "Maryland", lower: "maryland" },
  { code: "VA", name: "Virginia", lower: "virginia" },
  { code: "NJ", name: "New Jersey", lower: "new jersey" },
  { code: "PA", name: "Pennsylvania", lower: "pennsylvania" },
  { code: "NY", name: "New York", lower: "new york" },
  { code: "SD", name: "South Dakota", lower: "south dakota" },
] as const;

export type TagService = "tags" | "temp" | "registration";

export const TAG_SERVICES: { id: TagService; es: string; en: string }[] = [
  { id: "tags", es: "Placas", en: "Tags (plates)" },
  { id: "temp", es: "Placas temporales", en: "Temporary tags" },
  { id: "registration", es: "Registro / renovación", en: "Registration / renewal" },
];

/** Stored on the lead in the same words the Meta form uses, so the portal, email templates
 *  ({producto}) and sequences treat it the same ("placas de virginia" → "Virginia tags"). */
export function serviceValue(service: TagService, stateCode: string): string {
  const state = TAG_STATES.find((s) => s.code === stateCode)?.lower ?? "";
  if (service === "temp") return `placas temporales de ${state}`;
  if (service === "registration") return `registro de ${state}`;
  return `placas de ${state}`;
}

export type PhotoKind = "id" | "title-front" | "title-back" | "other";

/** The photos the form asks for, in order. `portal` is how the team sees each one. */
export const PHOTO_KINDS: { id: PhotoKind; es: string; en: string; portal: string }[] = [
  { id: "id", es: "Tu ID o licencia", en: "Your ID or driver's license", portal: "ID / licencia" },
  { id: "title-front", es: "Título (frente)", en: "Title (front)", portal: "Título (frente)" },
  { id: "title-back", es: "Título (reverso)", en: "Title (back)", portal: "Título (reverso)" },
  { id: "other", es: "Otro documento (registro, factura…)", en: "Other document (registration, bill of sale…)", portal: "Otro documento" },
];
