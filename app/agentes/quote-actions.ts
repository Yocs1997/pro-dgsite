"use server";

import { getSession } from "./_lib/auth";
import { CATALOG, loadPrices } from "./_lib/products";
import {
  quoteCode,
  quotesReady,
  saveNewQuote,
  setQuoteStatus,
  STATUSES,
  type QuoteItem,
  type QuoteStatus,
} from "./_lib/quotes";

export type SubmitInput = {
  client: { name: string; phone: string; notes: string };
  lines: { id: string; qty: number; sale: number }[];
};

export type SubmitResult = { ok: true; code: string } | { ok: false; error: string };

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const r2 = (n: number) => Math.round(n * 100) / 100;

export async function submitQuote(input: SubmitInput): Promise<SubmitResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  if (!quotesReady()) return { ok: false, error: "El envío de cotizaciones aún no está configurado." };

  const client = {
    name: clean(input?.client?.name, 120),
    phone: clean(input?.client?.phone, 40),
    notes: clean(input?.client?.notes, 1000),
  };
  if (!client.name) return { ok: false, error: "Escribe el nombre del cliente o negocio." };

  // Never trust prices from the browser: agent price and cost come from PORTAL_PRICES.
  const prices = loadPrices();
  const items: QuoteItem[] = [];
  for (const l of Array.isArray(input?.lines) ? input.lines.slice(0, 50) : []) {
    const cat = CATALOG.find((c) => c.id === l?.id);
    const p = cat && prices[cat.id];
    const qty = Math.floor(Number(l?.qty));
    const sale = r2(Number(l?.sale));
    if (!cat || !p || !(qty > 0 && qty <= 999) || !(sale >= 0 && sale < 1_000_000)) continue;
    items.push({ id: cat.id, name: cat.name, qty, sale, agent: p.agent, cost: p.cost });
  }
  if (!items.length) return { ok: false, error: "Agrega al menos un producto." };

  // An admin sending a quote is a direct sale (no agent commission).
  const direct = user.role === "admin";
  let clientTotal = 0, toPro = 0, agentEarn = 0, cost = 0, proEarn = 0;
  for (const i of items) {
    clientTotal += i.sale * i.qty;
    cost += i.cost * i.qty;
    if (direct) {
      proEarn += (i.sale - i.cost) * i.qty;
    } else {
      toPro += i.agent * i.qty;
      agentEarn += (i.sale - i.agent) * i.qty;
      proEarn += (i.agent - i.cost) * i.qty;
    }
  }

  const now = Date.now();
  try {
    const q = await saveNewQuote({
      createdAt: now,
      updatedAt: now,
      status: "nueva",
      agent: { u: user.u, name: user.name },
      client,
      items,
      totals: {
        client: r2(clientTotal),
        toPro: r2(toPro),
        agentEarn: r2(agentEarn),
        cost: r2(cost),
        proEarn: r2(proEarn),
      },
    });
    return { ok: true, code: quoteCode(q.number) };
  } catch {
    return { ok: false, error: "No se pudo enviar. Inténtalo de nuevo en un momento." };
  }
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<{ ok: boolean }> {
  const user = await getSession();
  if (!user || user.role !== "admin") return { ok: false };
  if (!STATUSES.includes(status) || typeof id !== "string" || id.length > 64) return { ok: false };
  try {
    await setQuoteStatus(id, status);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
