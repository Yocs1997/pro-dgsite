import { redirect } from "next/navigation";
import { dbUsers, envUsers, getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { listPosLeads, waLink, waNumber, type PosLead } from "@/app/lib/server/pos-leads";
import { teamPhones } from "@/app/lib/server/team-phones";
import AdminNav from "../AdminNav";
import PosLeadsView, { type PosRow, type TeamUser } from "./PosLeadsView";

export const metadata = { title: "Facturación | Pro-DG" };

function when(ts: number) {
  return new Date(ts).toLocaleString("es-NI", {
    timeZone: "America/Managua", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// Admins: every lead, assignment and the team summary. Agents: only their assigned leads.
export default async function FacturacionPage() {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  const isAdmin = user.role === "admin";

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
  if (!isAdmin) leads = leads.filter((l) => l.assignedTo?.u.toLowerCase() === user.u.toLowerCase());

  let team: TeamUser[] = [];
  if (isAdmin) {
    const all = [...envUsers(), ...(await dbUsers().catch(() => []))];
    const phones = await teamPhones().catch(() => ({}) as Record<string, string>);
    const seen = new Set<string>();
    team = all
      .filter((u) => (seen.has(u.u.toLowerCase()) ? false : (seen.add(u.u.toLowerCase()), true)))
      .map((u) => ({ u: u.u, name: u.name, role: u.role, wa: phones[u.u.toLowerCase()] ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const rows: PosRow[] = leads.map((l) => ({
    ...l,
    extra: l.extra ?? [],
    wa: waLink(l),
    tel: l.phone && waNumber(l.phone) ? `+${waNumber(l.phone)}` : "",
    when: when(l.createdAt),
    assignedWhen: l.assignedAt ? when(l.assignedAt) : "",
  }));

  return (
    <>
      {isAdmin && <AdminNav active="/agentes/facturacion" />}
      <PosLeadsView leads={rows} error={error} isAdmin={isAdmin} team={team} userName={user.name} />
    </>
  );
}
