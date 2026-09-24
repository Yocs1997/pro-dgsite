import "server-only";

// Public product info (names/pictures). Prices are NOT here: they come from the
// PORTAL_PRICES environment variable so they never appear in the public repo.
// PORTAL_PRICES format (US$):  {"product-id": [cost, agentPrice, suggestedPrice], ...}
// For monthly products (monthly: true) the three prices are per month.

export type CatalogItem = {
  id: string;
  name: string;
  detail?: string;
  image: string;
  tag: string;
  monthly?: boolean; // subscription billed every month
};

export const CATALOG: CatalogItem[] = [
  {
    id: "licencia-xolopos",
    name: "Licencia Sistema XoloPOS",
    detail: "Versión instalada en la computadora. Funciona sin internet. Pago único.",
    image: "/cotizador/licencia-xolopos.svg",
    tag: "Software",
  },
  {
    id: "xolopos-web",
    name: "XoloPOS Web",
    detail: "Versión en la nube: úsalo desde cualquier navegador. Incluye soporte. Suscripción mensual.",
    image: "/cotizador/xolopos-web.svg",
    tag: "Suscripción",
    monthly: true,
  },
  {
    id: "combo-i5",
    name: "Computadora completa Core i5",
    detail:
      'CPU mini (Core i5, 8GB RAM, 256GB SSD) seminuevo, monitor 22" seminuevo, teclado y mouse USB nuevos. Windows 11 + Office.',
    image: "/cotizador/combo-i5.svg",
    tag: "Computadora",
  },
  {
    id: "combo-i3",
    name: "Computadora completa Core i3",
    detail:
      'CPU mini (Core i3, 8GB RAM, 128GB SSD) seminuevo, monitor 20" seminuevo, teclado y mouse USB nuevos. Windows 11 + Office.',
    image: "/cotizador/combo-i3.svg",
    tag: "Computadora",
  },
  { id: "impresora-80mm", name: "Impresora térmica 80mm nueva", image: "/cotizador/impresora-80mm.svg", tag: "Hardware" },
  { id: "cajon-8", name: "Cajón de efectivo de 8 depósitos", image: "/cotizador/cajon-8.svg", tag: "Hardware" },
  { id: "cajon-5", name: "Cajón de efectivo de 5 depósitos", image: "/cotizador/cajon-5.svg", tag: "Hardware" },
  { id: "ups-600", name: "Batería UPS 600 HIKVision", image: "/cotizador/ups-600.svg", tag: "Hardware" },
  { id: "lector-codigo", name: "Lector de código de barras", image: "/cotizador/lector-codigo.svg", tag: "Hardware" },
  { id: "papel-80mm", name: "Rollo de papel térmico 80mm", detail: "Precio por rollo.", image: "/cotizador/papel-80mm.svg", tag: "Insumos" },
];

export type Prices = { cost: number; agent: number; suggested: number };

export function loadPrices(): Record<string, Prices> {
  const out: Record<string, Prices> = {};
  try {
    const raw = JSON.parse(process.env.PORTAL_PRICES ?? "{}") as Record<string, number[]>;
    for (const [id, v] of Object.entries(raw)) {
      if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number")) {
        out[id] = { cost: v[0], agent: v[1], suggested: v[2] };
      }
    }
  } catch {
    // fall through with empty prices
  }
  return out;
}
