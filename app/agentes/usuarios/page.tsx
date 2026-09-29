import { redirect } from "next/navigation";
import { dbUsers, envUsers, getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import AdminNav from "../AdminNav";
import UsersView, { type UserRow } from "./UsersView";

export const metadata = { title: "Usuarios | Pro-DG" };

function day(ts: number) {
  return new Date(ts).toLocaleDateString("es-NI", { timeZone: "America/Managua", day: "2-digit", month: "short", year: "numeric" });
}

export default async function UsuariosPage() {
  const me = await getSession();
  if (!me) redirect("/agentes/login");
  if (me.role !== "admin") redirect("/agentes");

  let portal: UserRow[] = [];
  let error = "";
  try {
    portal = (await dbUsers())
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((u) => ({ u: u.u, name: u.name, role: u.role, source: "portal" as const, added: `${day(u.createdAt)} · por ${u.createdBy}` }));
  } catch {
    error = "No se pudo leer la lista de usuarios del portal.";
  }
  const fromEnv: UserRow[] = envUsers().map((u) => ({ u: u.u, name: u.name, role: u.role, source: "vercel" as const, added: "" }));
  // A portal entry with the same username as a Vercel one is ignored at login.
  const envKeys = new Set(fromEnv.map((u) => u.u.toLowerCase()));

  return (
    <>
      <AdminNav active="/agentes/usuarios" />
      <UsersView
        users={[...fromEnv, ...portal.filter((u) => !envKeys.has(u.u.toLowerCase()))]}
        me={me.u}
        ready={dbReady()}
        error={error}
      />
    </>
  );
}
