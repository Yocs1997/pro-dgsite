"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, UserPlus, X } from "lucide-react";
import { addInsuranceLead, type NewInsuranceLead } from "../admin-actions";
import { OPTIONS, US_STATES, isEmail, label } from "@/app/seguros/model";
import { CHANNELS, SERVICES } from "./status";
import type { InsuranceLead } from "@/app/lib/server/insurance";

// Adds a lead by hand (phone call, walk-in, WhatsApp…). It lands in the list like any other lead.

const EMPTY: NewInsuranceLead = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  state: "",
  zip: "",
  lang: "es",
  services: [],
  channel: "llamada",
  insured: "",
  level: "",
  year: "",
  make: "",
  model: "",
  notes: "",
  sendEmails: false,
};

const inp = "w-full rounded-xl border border-[#7cc4ff40] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#33aaff]";
const sel = inp + " bg-[#0F3470]";

function F({ l, children, wide }: { l: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={"flex flex-col gap-1 min-w-0 text-xs text-sky-text/75 " + (wide ? "sm:col-span-2 lg:col-span-4" : "")}>
      {l}
      {children}
    </label>
  );
}

export default function NewLeadForm({ onCreated, onClose }: { onCreated: (lead: InsuranceLead) => void; onClose: () => void }) {
  const [f, setF] = useState<NewInsuranceLead>(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dup, setDup] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof NewInsuranceLead>(k: K, v: NewInsuranceLead[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (k === "phone" || k === "email") setDup(false);
  };
  const text = (k: keyof NewInsuranceLead) => (e: { target: { value: string } }) => set(k, e.target.value as never);
  const toggleService = (v: string) => set("services", f.services.includes(v) ? f.services.filter((x) => x !== v) : [...f.services, v]);
  const hasEmail = isEmail(f.email);

  const save = (force: boolean) =>
    start(async () => {
      setMsg(null);
      const r = await addInsuranceLead(f, force);
      if (!r.ok) {
        setDup("duplicate" in r && Boolean(r.duplicate));
        return setMsg({ ok: false, text: r.error });
      }
      onCreated(r.lead);
      setMsg({
        ok: true,
        text: `${r.lead.code} guardado y avisado en Telegram.` + (f.sendEmails && hasEmail ? " Se le envió el primer correo de seguimiento." : ""),
      });
      setF(EMPTY);
      setDup(false);
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(false);
      }}
      className="mt-6 rounded-2xl border border-emerald-400/40 p-5"
      style={{ background: "rgba(16,185,129,0.08)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-bold text-xl flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-300" /> Nuevo lead
        </h2>
        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-sky-text/70" title="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-sky-text/65 mt-1">
        Para quien llama, escribe o llega a la oficina. Solo el nombre y un teléfono o correo son obligatorios; lo demás lo puedes completar después con “Editar”.
      </p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <F l="Nombre *">
          <input required value={f.firstName} onChange={text("firstName")} className={inp} autoComplete="off" />
        </F>
        <F l="Apellido">
          <input value={f.lastName} onChange={text("lastName")} className={inp} autoComplete="off" />
        </F>
        <F l="Teléfono">
          <input value={f.phone} onChange={text("phone")} inputMode="tel" placeholder="(240) 555-0100" className={inp} />
        </F>
        <F l="Correo">
          <input value={f.email} onChange={text("email")} inputMode="email" placeholder="cliente@correo.com" className={inp} />
        </F>

        <div className="sm:col-span-2 lg:col-span-4 flex flex-col gap-1.5 text-xs text-sky-text/75">
          ¿Qué servicio necesita? (puedes marcar varios)
          <div className="flex flex-wrap gap-2">
            {SERVICES.map(([v, l]) => {
              const on = f.services.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleService(v)}
                  aria-pressed={on}
                  className={"px-3 py-1.5 rounded-full text-sm " + (on ? "bg-electric text-white" : "border border-[#7cc4ff40] text-sky-text/85 hover:text-white")}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        <F l="¿Cómo llegó?">
          <select value={f.channel} onChange={text("channel")} className={sel}>
            {CHANNELS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </F>
        <F l="Idioma">
          <select value={f.lang} onChange={(e) => set("lang", e.target.value === "en" ? "en" : "es")} className={sel}>
            <option value="es">Español</option>
            <option value="en">Inglés</option>
          </select>
        </F>
        <F l="Estado">
          <select value={f.state} onChange={text("state")} className={sel}>
            <option value="">—</option>
            {US_STATES.map(([c, n]) => (
              <option key={c} value={c}>
                {n} ({c})
              </option>
            ))}
          </select>
        </F>
        <F l="Código postal">
          <input value={f.zip} onChange={(e) => set("zip", e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" className={inp} />
        </F>

        <F l="¿Tiene seguro ahora?">
          <select value={f.insured} onChange={text("insured")} className={sel}>
            <option value="">Sin dato</option>
            {Object.keys(OPTIONS.insured).map((v) => (
              <option key={v} value={v}>
                {label("insured", v, "es")}
              </option>
            ))}
          </select>
        </F>
        <F l="Cobertura que busca">
          <select value={f.level} onChange={text("level")} className={sel}>
            <option value="">Sin dato</option>
            {Object.keys(OPTIONS.level).map((v) => (
              <option key={v} value={v}>
                {label("level", v, "es")}
              </option>
            ))}
          </select>
        </F>
        <F l="Vehículo: año">
          <input value={f.year} onChange={(e) => set("year", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="2019" className={inp} />
        </F>
        <div className="grid grid-cols-2 gap-2">
          <F l="Marca">
            <input value={f.make} onChange={text("make")} placeholder="Honda" className={inp} />
          </F>
          <F l="Modelo">
            <input value={f.model} onChange={text("model")} placeholder="Civic" className={inp} />
          </F>
        </div>

        <F l="Notas" wide>
          <textarea value={f.notes} onChange={text("notes")} rows={2} placeholder="Lo que te contó, qué necesita, cuándo llamarle…" className={inp + " resize-y"} />
        </F>
      </div>

      <label className={"mt-4 flex items-start gap-2 text-sm " + (hasEmail ? "cursor-pointer" : "opacity-50")}>
        <input
          type="checkbox"
          checked={f.sendEmails && hasEmail}
          disabled={!hasEmail}
          onChange={(e) => set("sendEmails", e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-emerald-400"
        />
        <span>
          Enviarle los correos de seguimiento
          <span className="block text-xs text-sky-text/60">
            {hasEmail
              ? "Entra a la secuencia de su servicio (o recibe el correo de confirmación) igual que un lead del formulario. Si no lo marcas, no se le envía nada."
              : "Necesita un correo."}
          </span>
        </span>
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button disabled={pending} className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-60">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {pending ? "Guardando…" : "Guardar lead"}
        </button>
        {dup && (
          <button type="button" disabled={pending} onClick={() => save(true)} className="px-4 py-2 rounded-full border border-amber-400/50 text-amber-100 text-sm hover:bg-amber-500/15">
            Guardar de todos modos
          </button>
        )}
        {msg && <p className={"text-sm " + (msg.ok ? "text-emerald-300" : "text-red-200")}>{msg.text}</p>}
      </div>
    </form>
  );
}
