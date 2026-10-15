import { Flag, LogOut, Zap } from "lucide-react";
import { logout } from "../actions";

/** Menu for the VA campaign users: their tab and "Log out", nothing else. */
export default function VaNav({ name }: { name: string }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#7cc4ff20] backdrop-blur-xl no-print" style={{ background: "rgba(11,43,94,0.85)" }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </span>
          <span className="hidden sm:inline font-display font-bold text-xl tracking-tight">
            Pro<span className="text-electric-light">-DG</span>
          </span>
        </span>
        <div className="flex items-center gap-1">
          <a href="/agentes/va" className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm bg-white/10 text-white">
            <Flag className="w-4 h-4" /> VA campaign
          </a>
          <span className="hidden md:inline px-2 text-xs text-sky-text/60">{name}</span>
          <form action={logout}>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-sky-text/75 hover:text-white hover:bg-white/5">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
