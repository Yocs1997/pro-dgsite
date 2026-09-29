import { Zap, Calculator, Inbox, Car, Mail, Repeat, BarChart3, LogOut } from "lucide-react";
import { logout } from "./actions";
import { adminBadges } from "./_lib/badges";

const LINKS = [
  { href: "/agentes", label: "Calculadora", icon: Calculator },
  { href: "/agentes/cotizaciones", label: "Cotizaciones", icon: Inbox },
  { href: "/agentes/seguros", label: "Seguros", icon: Car },
  { href: "/agentes/correo", label: "Correo", icon: Mail },
  { href: "/agentes/secuencias", label: "Secuencias", icon: Repeat },
  { href: "/agentes/rendimiento", label: "Rendimiento", icon: BarChart3 },
];

/** Admin menu. Looks up its own badge counts so every page shows unread emails / new requests. */
export default async function AdminNav({ active }: { active: string }) {
  const counts = await adminBadges();
  const badges: Record<string, number> = {
    "/agentes/cotizaciones": counts.cotizaciones,
    "/agentes/seguros": counts.seguros,
    "/agentes/correo": counts.correo,
  };
  return (
    <nav className="sticky top-0 z-50 border-b border-[#7cc4ff20] backdrop-blur-xl no-print" style={{ background: "rgba(11,43,94,0.85)" }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        <a href="/agentes" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="hidden md:inline font-display font-bold text-xl tracking-tight">
            Pro<span className="text-electric-light">-DG</span>
          </span>
        </a>
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className={
                "relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full text-sm transition-colors whitespace-nowrap " +
                (active === href ? "bg-white/10 text-white" : "text-sky-text/75 hover:text-white hover:bg-white/5")
              }
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              {badges[href] ? (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-[11px] font-bold flex items-center justify-center">{badges[href]}</span>
              ) : null}
            </a>
          ))}
          <form action={logout}>
            <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full text-sm text-sky-text/75 hover:text-white hover:bg-white/5" title="Salir">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
