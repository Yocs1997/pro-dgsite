import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { listLeads, type InsuranceLead } from "@/app/lib/server/insurance";
import AdminNav from "../AdminNav";
import LeadsInbox from "./LeadsInbox";

function when(ts: number) {
  return new Date(ts).toLocaleString("es-NI", {
    timeZone: "America/Managua", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function SegurosAdminPage() {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  if (user.role !== "admin") redirect("/agentes");

  let leads: InsuranceLead[] = [];
  let error: string | null = null;
  if (!dbReady()) error = "La base de datos aún no está conectada.";
  else {
    try {
      leads = await listLeads();
    } catch {
      error = "No se pudieron cargar las solicitudes. Recarga en un momento.";
    }
  }
  const rows = leads.map((l) => ({ ...l, when: when(l.createdAt) }));
  return (
    <>
      <AdminNav active="/agentes/seguros" badges={{ "/agentes/seguros": leads.filter((l) => l.status === "nueva").length }} />
      <LeadsInbox leads={rows} error={error} />
    </>
  );
}
