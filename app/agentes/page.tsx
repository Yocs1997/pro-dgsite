import { redirect } from "next/navigation";
import { getSession } from "./_lib/auth";
import { CATALOG, loadPrices } from "./_lib/products";
import Portal, { type PortalItem } from "./Portal";
import { quotesReady } from "./_lib/quotes";
import AdminNav from "./AdminNav";
import { canWork, getPosLead, listPosLeads } from "@/app/lib/server/pos-leads";

export default async function AgentesPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
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

  // Agents: how many assigned billing-system leads are still new (badge on "Mis leads").
  // Every agent gets the link, even before their first lead.
  let myLeads: { total: number; fresh: number } | undefined = isAdmin ? undefined : { total: 0, fresh: 0 };
  if (!isAdmin) {
    try {
      const mine = (await listPosLeads()).filter((l) => l.assignedTo?.u.toLowerCase() === user.u.toLowerCase());
      myLeads = { total: mine.length, fresh: mine.filter((l) => l.status === "nueva").length };
    } catch {
      /* no badge */
    }
  }

  // "Crear cotización" from the Facturación inbox: open the calculator for that lead.
  const sp = await searchParams;
  const leadId = (Array.isArray(sp.lead) ? sp.lead[0] : sp.lead) ?? "";
  let prefill: { leadId: string; code: string; name: string; phone: string; notes: string } | undefined;
  if (/^[a-z0-9_-]{1,64}$/i.test(leadId)) {
    try {
      const l = await getPosLead(leadId);
      if (l && canWork(l, user))
        prefill = {
          leadId: l.id,
          code: l.code,
          name: l.business || l.name,
          phone: l.phone,
          notes: [`Lead ${l.code}`, l.business ? l.name : "", l.city].filter(Boolean).join(" · "),
        };
    } catch {
      /* lead not found: open the calculator normally */
    }
  }

  return (
    <>
      {isAdmin && <AdminNav active="/agentes" />}
      <Portal
        user={{ name: user.name, role: user.role }}
        items={items}
        quotesEnabled={quotesEnabled}
        newCount={0}
        hideNav={isAdmin}
        prefill={prefill}
        myLeads={myLeads}
      />
    </>
  );
}
