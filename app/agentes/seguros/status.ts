import type { InsuranceLead, InsStatus } from "@/app/lib/server/insurance";

// Shared by the Seguros list, its dashboard and the new-lead form.

export type LeadRow = InsuranceLead & { when: string };

export const STATUS: Record<InsStatus, { label: string; cls: string; fill: string }> = {
  nueva: { label: "Nueva", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40", fill: "#34d399" },
  cotizando: { label: "Cotizando", cls: "bg-amber-500/20 text-amber-200 border-amber-400/40", fill: "#fbbf24" },
  enviada: { label: "Cotización enviada", cls: "bg-sky-500/20 text-sky-200 border-sky-400/40", fill: "#38bdf8" },
  vendida: { label: "Póliza vendida", cls: "bg-violet-500/25 text-violet-200 border-violet-400/40", fill: "#a78bfa" },
  perdida: { label: "No compró", cls: "bg-white/10 text-white/60 border-white/20", fill: "rgba(255,255,255,0.3)" },
};
export const ORDER: InsStatus[] = ["nueva", "cotizando", "enviada", "vendida", "perdida"];

/** Services a lead can ask for (same wording the Meta form sends, so labels and sequences work the same). */
export const SERVICES: [value: string, label: string][] = [
  ["seguros para su carro", "Seguro de auto"],
  ["placas de maryland", "Placas de Maryland"],
  ["placas de virginia", "Placas de Virginia"],
  ["placas de south dakota", "Placas de South Dakota"],
  ["inspecciones de maryland", "Inspección de Maryland"],
  ["otro", "Otro"],
];

/** How a lead added by hand reached us. */
export const CHANNELS: [value: string, label: string][] = [
  ["llamada", "Llamada"],
  ["whatsapp", "WhatsApp"],
  ["en persona", "En persona"],
  ["referido", "Referido"],
  ["redes sociales", "Redes sociales"],
  ["otro", "Otro"],
];

export const channelLabel = (v?: string) => CHANNELS.find(([k]) => k === v)?.[1] ?? "";

/** "Formulario web" / "Meta" / "A mano · Llamada". */
export function sourceLabel(l: Pick<InsuranceLead, "source" | "channel">): string {
  if (l.source === "meta") return "Meta (Facebook / Instagram)";
  if (l.source === "manual") return l.channel ? `A mano · ${channelLabel(l.channel)}` : "A mano";
  return "Formulario web";
}
