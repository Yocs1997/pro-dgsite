"use client";

import { useActionState } from "react";
import { Lock, User, LogIn } from "lucide-react";
import { login, type LoginState } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Usuario</span>
        <div className="flex items-center gap-2 rounded-xl border border-[#7cc4ff40] bg-[#ffffff0f] px-4 focus-within:border-[#33aaff]">
          <User className="w-4 h-4 text-[#7cc4ff]" />
          <input
            name="username"
            key={state?.username ?? ""}
            defaultValue={state?.username ?? ""}
            autoComplete="username"
            autoCapitalize="none"
            required
            className="w-full bg-transparent py-3.5 text-white outline-none placeholder:text-white/30"
            placeholder="tu usuario"
          />
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Contraseña</span>
        <div className="flex items-center gap-2 rounded-xl border border-[#7cc4ff40] bg-[#ffffff0f] px-4 focus-within:border-[#33aaff]">
          <Lock className="w-4 h-4 text-[#7cc4ff]" />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full bg-transparent py-3.5 text-white outline-none placeholder:text-white/30"
            placeholder="••••••••"
          />
        </div>
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-red-200 bg-red-500/15 border border-red-400/30 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 flex items-center justify-center gap-2 rounded-full bg-electric hover:bg-electric-light disabled:opacity-60 py-3.5 font-bold text-white glow-electric-sm transition-all"
      >
        <LogIn className="w-4 h-4" />
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
