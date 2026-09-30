"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calculator, MapPin, MessageCircle, Phone, Receipt, Search, Store, Trash2 } from "lucide-react";
import type { PosLead, PosStatus } from "@/app/lib/server/pos-leads";
import { removePosLead, setPosStatus } from "../pos-actions";

export type PosRow = PosLead & { wa: string; when: string };

const STATUS: Record<PosStatus, { label: string; cls: string }> = {
  nueva: { label: "Nueva", cls: "border-emerald-400/50 text-emerald-300 bg-emerald-500/10" },
  contactada: { label: "Contactada", cls: "border-sky-400/50 text-sky-200 bg-sky-500/10" },
  cotizada: { label: "Cotizada", cls: "border-indigo-400/50 text-indigo-200 bg-indigo-500/10" },
  cerrada: { label: "Cerrada (venta)", cls: "border-amber-400/50 text-amber-200 bg-amber-500/10" },
  perdida: { label: "Perdida", cls: "border-white/20 text-sky-text/70 bg-white/5" },
};
const ORDER: PosStatus[] = ["nueva", "contactada", "cotizada", "cerrada", "perdida"];

const first = (name: string) => name.trim().split(/\s+/)[0] ?? "";

function waText(l: PosRow) {
  const hi = first(l.name) ? `Hola ${first(l.name)}` : "Hola";
  const biz = l.business ? ` para ${l.business}` : "";
  return `${hi}, le saluda Pro-DG. Vimos su interés en un sistema de facturación${biz}. ¿Le puedo ayudar con una cotización?`;
}

function LeadCard({ l }: { l: PosRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<PosStatus>(l.status);

  const changeStatus = (s: PosStatus) =>
    start(async () => {
      setErr(null);
      const prev = status;
      setStatus(s);
      const r = await setPosStatus(l.id, s);
      if (!r.ok) {
        setStatus(prev);
        setErr(r.error);
      } else router.refresh();
    });

  const remove = () => {
    if (!window.confirm(`¿Eliminar el lead ${l.code} de ${l.name || l.business || "(sin nombre)"}? No se puede deshacer.`)) return;
    start(async () => {
      const r = await removePosLead(l.id);
      if (!r.ok) setErr(r.error);
      else router.refresh();
    });
  };

  return (
    <article className="rounded-2xl border border-[#7cc4ff33] p-5" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono font-bold text-[#7cc4ff]">{l.code}</span>
        <span className={"px-2.5 py-0.5 rounded-full border text-xs font-semibold " + STATUS[status].cls}>{STATUS[status].label}</span>
        <span className="font-display font-bold text-lg flex-1 min-w-40 truncate">{l.name || "(sin nombre)"}</span>
        <span className="text-xs text-sky-text/60">{l.when}</span>
      </div>

      <div className="mt-3 grid sm:grid-cols-3 gap-2 text-sm text-sky-text/85">
        <p className="flex items-center gap-2 min-w-0">
          <Store className="w-4 h-4 text-[#7cc4ff] shrink-0" /> <span className="truncate">{l.business || "—"}</span>
        </p>
        <p className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-[#7cc4ff] shrink-0" /> <span className="truncate">{l.city || "—"}</span>
        </p>
        <p className="flex items-center gap-2 min-w-0">
          <Phone className="w-4 h-4 text-[#7cc4ff] shrink-0" /> <span className="truncate">{l.phone || l.email || "—"}</span>
        </p>
      </div>
      {l.extra.length > 0 && <p className="mt-2 text-xs text-sky-text/65">{l.extra.join(" · ")}</p>}
      {l.quoteCode && (
        <p className="mt-2 text-xs text-indigo-200 flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5" /> Cotización {l.quoteCode} ·{" "}
          <a href="/agentes/cotizaciones" className="underline hover:text-white">
            ver en Cotizaciones
          </a>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {l.wa ? (
          <a
            href={`https://wa.me/${l.wa}?text=${encodeURIComponent(waText(l))}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => status === "nueva" && changeStatus("contactada")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        ) : null}
        {l.phone && (
          <a href={`tel:+${l.wa}`} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm">
            <Phone className="w-4 h-4" /> Llamar
          </a>
        )}
        <a
          href={`/agentes?lead=${encodeURIComponent(l.id)}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-electric hover:bg-electric-light text-sm font-semibold"
        >
          <Calculator className="w-4 h-4" /> Crear cotización
        </a>
        <select
          value={status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as PosStatus)}
          className="ml-auto rounded-full border border-[#7cc4ff40] bg-[#0B2B5E] px-3 py-2 text-sm"
          aria-label="Estado"
        >
          {ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS[s].label}
            </option>
          ))}
        </select>
        <button type="button" onClick={remove} disabled={pending} className="p-2 rounded-full hover:bg-red-500/20 text-sky-text/70 hover:text-red-200" title="Eliminar lead">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-200">{err}</p>}
    </article>
  );
}

export default function PosLeadsView({ leads, error }: { leads: PosRow[]; error: string | null }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | PosStatus>("all");
  const counts = Object.fromEntries(ORDER.map((s) => [s, leads.filter((l) => l.status === s).length])) as Record<PosStatus, number>;
  const shown = leads.filter(
    (l) =>
      (filter === "all" || l.status === filter) &&
      (!q.trim() || `${l.code} ${l.name} ${l.business} ${l.city} ${l.phone} ${l.email}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-white">
      <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Sistemas de facturación · Nicaragua</p>
      <h1 className="font-display font-black text-3xl md:text-4xl mt-1">Facturación</h1>
      <p className="text-sm text-sky-text/70 mt-1">Leads de los formularios de Meta de la página Pro-DG. Se atienden por WhatsApp o llamada; no reciben correos.</p>

      {error && (
        <p className="mt-5 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-amber-100">
          <AlertTriangle className="w-4 h-4" /> {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["all", ...ORDER] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={
              "px-3.5 py-1.5 rounded-full text-xs font-medium " + (filter === s ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/80 hover:text-white")
            }
          >
            {s === "all" ? `Todos (${leads.length})` : `${STATUS[s].label} (${counts[s]})`}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 rounded-full border border-[#7cc4ff40] bg-white/5 px-4 min-w-56">
          <Search className="w-4 h-4 text-[#7cc4ff]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-white/35" />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {shown.map((l) => (
          <LeadCard key={l.id} l={l} />
        ))}
        {shown.length === 0 && (
          <p className="py-14 text-center text-sm text-sky-text/60">
            {leads.length === 0 ? "Aún no hay leads de facturación. Llegarán aquí desde los formularios de la página Pro-DG." : "Nadie en este filtro."}
          </p>
        )}
      </div>
    </main>
  );
}
