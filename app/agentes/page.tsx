import { redirect } from "next/navigation";
import { getSession } from "./_lib/auth";
import { CATALOG, loadPrices } from "./_lib/products";
import Portal, { type PortalItem } from "./Portal";
import { quotesReady } from "./_lib/quotes";
import { adminBadges } from "./_lib/badges";

export default async function AgentesPage() {
  const user = await getSession();
  if (!user) redirect("/agentes/login");

  const prices = loadPrices();
  const isAdmin = user.role === "admin";

  // Only send what each role may see: agents never receive the purchase cost.
  const items: PortalItem[] = CATALOG.filter((c) => prices[c.id]).map((c) => {
    const p = prices[c.id];
    return {
      ...c,
      agent: p.agent,
      suggested: p.suggested,
      ...(isAdmin ? { cost: p.cost } : {}),
    };
  });

  const quotesEnabled = quotesReady();
  // Admin menu badges (new quotes, new insurance requests, unread emails).
  const badges = isAdmin ? await adminBadges() : { cotizaciones: 0, seguros: 0, correo: 0 };

  return (
    <Portal
      user={{ name: user.name, role: user.role }}
      items={items}
      quotesEnabled={quotesEnabled}
      newCount={badges.cotizaciones}
      segurosCount={badges.seguros}
      correoCount={badges.correo}
    />
  );
}
