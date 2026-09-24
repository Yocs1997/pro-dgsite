import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { listQuotes, quoteCode, quotesReady, type Quote } from "../_lib/quotes";
import QuotesInbox, { type InboxQuote } from "./QuotesInbox";

function when(ts: number) {
  return new Date(ts).toLocaleString("es-NI", {
    timeZone: "America/Managua",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CotizacionesPage() {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  const isAdmin = user.role === "admin";

  let quotes: Quote[] = [];
  let error: string | null = null;
  if (!quotesReady()) {
    error = "La base de datos de cotizaciones aún no está conectada.";
  } else {
    try {
      quotes = await listQuotes();
    } catch {
      error = "No se pudieron cargar las cotizaciones. Recarga la página en un momento.";
    }
  }

  // Agents only see their own quotes, and never Pro-DG's cost or profit.
  const visible: InboxQuote[] = quotes
    .filter((q) => isAdmin || q.agent.u === user.u)
    .map((q) => ({
      id: q.id,
      code: quoteCode(q.number),
      when: when(q.createdAt),
      status: q.status,
      agent: q.agent.name,
      client: q.client,
      items: q.items.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        sale: i.sale,
        agent: i.agent,
        ...(isAdmin ? { cost: i.cost } : {}),
        ...(i.monthly ? { monthly: true } : {}),
      })),
      totals: {
        client: q.totals.client,
        toPro: q.totals.toPro,
        agentEarn: q.totals.agentEarn,
        ...(isAdmin ? { cost: q.totals.cost, proEarn: q.totals.proEarn } : {}),
      },
      ...(q.monthly
        ? {
            monthly: {
              client: q.monthly.client,
              toPro: q.monthly.toPro,
              agentEarn: q.monthly.agentEarn,
              ...(isAdmin ? { cost: q.monthly.cost, proEarn: q.monthly.proEarn } : {}),
            },
          }
        : {}),
    }));

  return <QuotesInbox quotes={visible} isAdmin={isAdmin} userName={user.name} error={error} />;
}
