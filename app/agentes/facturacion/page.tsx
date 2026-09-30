import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { listPosLeads, waNumber, type PosLead } from "@/app/lib/server/pos-leads";
import AdminNav from "../AdminNav";
import PosLeadsView, { type PosRow } from "./PosLeadsView";

export const metadata = { title: "Facturación | Pro-DG" };

function when(ts: number) {
  return new Date(ts).toLocaleString("es-NI", {
    timeZone: "America/Managua", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function FacturacionPage() {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  if (user.role !== "admin") redirect("/agentes");

  let leads: PosLead[] = [];
  let error: string | null = null;
  if (!dbReady()) error = "La base de datos aún no está conectada.";
  else {
    try {
      leads = await listPosLeads();
    } catch {
      error = "No se pudieron cargar los leads. Recarga en un momento.";
    }
  }
  const rows: PosRow[] = leads.map((l) => ({ ...l, extra: l.extra ?? [], wa: l.phone ? waNumber(l.phone) : "", when: when(l.createdAt) }));
  return (
    <>
      <AdminNav active="/agentes/facturacion" />
      <PosLeadsView leads={rows} error={error} />
    </>
  );
}
