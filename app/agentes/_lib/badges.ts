import "server-only";
import { dbReady } from "@/app/lib/server/redis";
import { listInMail } from "@/app/lib/server/mail";
import { listLeads } from "@/app/lib/server/insurance";
import { listPosLeads } from "@/app/lib/server/pos-leads";
import { listQuotes, quotesReady } from "./quotes";

export type BadgeCounts = { correo: number; seguros: number; cotizaciones: number; facturacion: number };

/** Counts shown as green badges in the admin menu on every portal page. Errors → 0. */
export async function adminBadges(): Promise<BadgeCounts> {
  const safe = async (f: () => Promise<number>) => {
    try {
      return await f();
    } catch {
      return 0;
    }
  };
  const [correo, seguros, cotizaciones, facturacion] = await Promise.all([
    dbReady() ? safe(async () => (await listInMail()).filter((m) => !m.read).length) : 0,
    dbReady() ? safe(async () => (await listLeads()).filter((l) => l.status === "nueva").length) : 0,
    quotesReady() ? safe(async () => (await listQuotes()).filter((q) => q.status === "nueva").length) : 0,
    dbReady() ? safe(async () => (await listPosLeads()).filter((l) => l.status === "nueva").length) : 0,
  ]);
  return { correo, seguros, cotizaciones, facturacion };
}
