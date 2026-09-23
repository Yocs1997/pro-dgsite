import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { getSession } from "../_lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/agentes");

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div
        className="w-full max-w-md rounded-2xl border border-[#7cc4ff33] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
        style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}
      >
        <a href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-white">
            Pro<span className="text-electric-light">-DG</span>
          </span>
        </a>
        <h1 className="font-display font-black text-3xl text-center text-white">Portal de Agentes</h1>
        <p className="text-center text-sky-text/70 text-sm mt-2 mb-8">
          Ingresa con tus credenciales para ver precios y ganancias.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
