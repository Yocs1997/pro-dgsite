import { redirect } from "next/navigation";
import { getSession } from "./_lib/auth";
import { CATALOG, loadPrices } from "./_lib/products";
import Portal, { type PortalItem } from "./Portal";
import { listQuotes, quotesReady } from "./_lib/quotes";

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
  let newCount = 0;
  if (isAdmin && quotesEnabled) {
    try {
      newCount = (await listQuotes()).filter((q) => q.status === "nueva").length;
    } catch {
      /* database unreachable: just hide the badge */
    }
  }

  return (
    <Portal
      user={{ name: user.name, role: user.role }}
      items={items}
      quotesEnabled={quotesEnabled}
      newCount={newCount}
    />
  );
}
