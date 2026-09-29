"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, Phone, Mail, MessageCircle, Copy, Check, AlertTriangle, Car, User, ShieldCheck, Reply } from "lucide-react";
import { updateLeadStatus } from "../admin-actions";
import { label, type OptionGroup } from "@/app/seguros/model";
import type { InsuranceLead, InsStatus } from "@/app/lib/server/insurance";

type Row = InsuranceLead & { when: string };

const STATUS: Record<InsStatus, { label: string; cls: string }> = {
  nueva: { label: "Nueva", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40" },
  cotizando: { label: "Cotizando", cls: "bg-amber-500/20 text-amber-200 border-amber-400/40" },
  enviada: { label: "Cotización enviada", cls: "bg-sky-500/20 text-sky-200 border-sky-400/40" },
  vendida: { label: "Póliza vendida", cls: "bg-violet-500/25 text-violet-200 border-violet-400/40" },
  perdida: { label: "No compró", cls: "bg-white/10 text-white/60 border-white/20" },
};
const ORDER: InsStatus[] = ["nueva", "cotizando", "enviada", "vendida", "perdida"];
const L = (g: OptionGroup, v: string) => (v ? label(g, v, "es") : "");

function Info({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-4 py-1 text-sm border-b border-white/5 last:border-0">
      <span className="text-sky-text/60 shrink-0">{k}</span>
      <span className="text-right break-words min-w-0">{v}</span>
    </div>
  );
}

function Block({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-black/20 p-4">
      <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#7cc4ff] mb-2">
        <Icon className="w-3.5 h-3.5" /> {title}
      </p>
      {children}
    </div>
  );
}

function summaryText(l: Row) {
  const d = l.driver;
  const lines = [
    `Solicitud ${l.code} — ${l.when}`,
    `Conductor: ${d.firstName} ${d.lastName} · Nac. ${d.dob} · ${L("gender", d.gender)} · ${L("marital", d.marital)}`,
    `Contacto: ${d.email} · ${d.phone}`,
    `Dirección: ${[d.street, d.city, d.state, d.zip].filter(Boolean).join(", ")}`,
    `Licencia: ${L("licenseStatus", d.licenseStatus)} ${d.licenseState} ${d.licenseNumber} · ${d.yearsLicensed ? d.yearsLicensed + " años" : ""}`,
    `Accidentes: ${d.accidents} · Multas: ${d.tickets} · SR-22: ${L("yesno", d.sr22)}`,
    ...l.extraDrivers.map((x, i) => `Conductor ${i + 2}: ${x.firstName} ${x.lastName} · Nac. ${x.dob} · ${L("relationship", x.relationship)} · ${L("licenseStatus", x.licenseStatus)}`),
    ...l.vehicles.map((v, i) => `Vehículo ${i + 1}: ${v.year} ${v.make} ${v.model} · VIN ${v.vin || "-"} · ${L("ownership", v.ownership)} · ${L("use", v.use)} · ${L("miles", v.miles)}`),
    `Seguro actual: ${L("insured", l.coverage.insured)} ${l.coverage.currentCarrier}`,
    `Cobertura: ${L("level", l.coverage.level)} · Deducible: ${L("deductible", l.coverage.deductible) || "-"} · Inicio: ${l.coverage.startDate || "-"}`,
    l.coverage.notes && `Notas: ${l.coverage.notes}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function LeadCard({ l, onStatus }: { l: Row; onStatus: (s: InsStatus) => void }) {
  const [open, setOpen] = useState(l.status === "nueva");
  const [copied, setCopied] = useState(false);
  const d = l.driver;
  const phone = d.phone.replace(/[^\d+]/g, "");
  const wa = phone.replace(/^\+/, "").length === 10 ? `1${phone.replace(/^\+/, "")}` : phone.replace(/^\+/, "");
  const replyHref = `/agentes/correo?to=${encodeURIComponent(d.email)}&subject=${encodeURIComponent(
    l.lang === "es" ? `Tu cotización de seguro de auto (${l.code})` : `Your car insurance quote (${l.code})`
  )}`;

  return (
    <article className="rounded-2xl border border-[#7cc4ff33] overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 p-5 text-left hover:bg-white/5">
        <span className="font-mono font-bold text-[#7cc4ff]">{l.code}</span>
        <span className={"px-2.5 py-0.5 rounded-full border text-xs font-semibold " + STATUS[l.status].cls}>{STATUS[l.status].label}</span>
        <span className="font-display font-bold text-lg flex-1 min-w-40 truncate">
          {d.firstName} {d.lastName}
        </span>
        <span className="text-sm text-sky-text/75 hidden md:inline">
          {l.vehicles.map((v) => `${v.year} ${v.make}`).join(" · ")}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-white/10">{d.state} {l.lang === "en" ? "· EN" : "· ES"}</span>
        <span className="text-xs text-sky-text/60">{l.when}</span>
        <ChevronDown className={"w-4 h-4 text-sky-text/60 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="px-5 pb-5 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="grid gap-4 md:grid-cols-2">
            <Block title="Conductor" icon={User}>
              <Info k="Nombre" v={`${d.firstName} ${d.lastName}`} />
              <Info k="Nacimiento" v={d.dob} />
              <Info k="Género" v={L("gender", d.gender)} />
              <Info k="Estado civil" v={L("marital", d.marital)} />
              <Info k="Dirección" v={[d.street, d.city, `${d.state} ${d.zip}`].filter(Boolean).join(", ")} />
              <Info k="Licencia" v={L("licenseStatus", d.licenseStatus)} />
              <Info k="Estado licencia" v={d.licenseState} />
              <Info k="No. licencia" v={d.licenseNumber} />
              <Info k="Años con licencia" v={d.yearsLicensed} />
              <Info k="Accidentes / multas" v={`${L("count", d.accidents)} / ${L("count", d.tickets)}`} />
              <Info k="SR-22" v={L("yesno", d.sr22)} />
              {l.extraDrivers.map((x, i) => (
                <Info key={i} k={`Conductor ${i + 2}`} v={`${x.firstName} ${x.lastName} · ${x.dob} · ${L("relationship", x.relationship)}`} />
              ))}
            </Block>
            <div className="flex flex-col gap-4">
              <Block title="Vehículos" icon={Car}>
                {l.vehicles.map((v, i) => (
                  <div key={i} className="py-1.5 border-b border-white/5 last:border-0 text-sm">
                    <p className="font-semibold">{`${v.year} ${v.make} ${v.model}`}</p>
                    <p className="text-sky-text/65 text-xs">
                      {[v.vin && `VIN ${v.vin}`, L("ownership", v.ownership), L("use", v.use), v.miles && `${L("miles", v.miles)} mi/año`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
              </Block>
              <Block title="Cobertura" icon={ShieldCheck}>
                <Info k="Seguro actual" v={L("insured", l.coverage.insured)} />
                <Info k="Aseguradora" v={l.coverage.currentCarrier} />
                <Info k="Busca" v={L("level", l.coverage.level)} />
                <Info k="Deducible" v={L("deductible", l.coverage.deductible)} />
                <Info k="Inicio" v={l.coverage.startDate} />
                <Info k="Contactar por" v={L("contactPref", l.coverage.contactPref)} />
                <Info k="Notas" v={l.coverage.notes} />
              </Block>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-black/20 p-4 flex flex-col gap-2 text-sm">
              <a href={`mailto:${d.email}`} className="flex items-center gap-2 text-[#7cc4ff] hover:underline break-all">
                <Mail className="w-4 h-4 shrink-0" /> {d.email}
              </a>
              <a href={`tel:${phone}`} className="flex items-center gap-2 text-[#7cc4ff] hover:underline">
                <Phone className="w-4 h-4 shrink-0" /> {d.phone}
              </a>
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-300 hover:underline">
                <MessageCircle className="w-4 h-4 shrink-0" /> WhatsApp
              </a>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Estado</span>
              <select
                value={l.status}
                onChange={(e) => onStatus(e.target.value as InsStatus)}
                className="rounded-xl border border-[#7cc4ff40] bg-[#0F3470] px-3 py-2.5 outline-none focus:border-[#33aaff]"
              >
                {ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS[s].label}
                  </option>
                ))}
              </select>
            </label>
            <a href={replyHref} className="flex items-center justify-center gap-1.5 rounded-full bg-electric hover:bg-electric-light py-2.5 text-sm font-semibold">
              <Reply className="w-4 h-4" /> Enviar cotización por correo
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(summaryText(l));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* blocked */
                }
              }}
              className="flex items-center justify-center gap-1.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10 py-2.5 text-sm font-semibold"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado" : "Copiar datos para cotizar"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function LeadsInbox({ leads: initial, error }: { leads: Row[]; error: string | null }) {
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<InsStatus | "todas">("todas");
  const [q, setQ] = useState("");
  const [saveError, setSaveError] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: leads.length };
    for (const s of ORDER) c[s] = leads.filter((x) => x.status === s).length;
    return c;
  }, [leads]);

  const shown = leads.filter(
    (l) =>
      (filter === "todas" || l.status === filter) &&
      (!q.trim() ||
        `${l.code} ${l.driver.firstName} ${l.driver.lastName} ${l.driver.email} ${l.driver.phone} ${l.vehicles.map((v) => v.make + " " + v.model).join(" ")}`
          .toLowerCase()
          .includes(q.trim().toLowerCase()))
  );

  const change = async (id: string, status: InsStatus) => {
    const prev = leads;
    setLeads((list) => list.map((x) => (x.id === id ? { ...x, status } : x)));
    const r = await updateLeadStatus(id, status);
    if (!r.ok) {
      setLeads(prev);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    }
  };

  const sold = counts.vendida ?? 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 text-white">
      <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Seguros de auto</p>
      <h1 className="font-display font-black text-3xl md:text-5xl mt-2">Solicitudes de seguro</h1>
      <p className="text-sky-text/75 mt-2">
        Llegan desde <a href="/seguros" className="text-[#7cc4ff] underline" target="_blank">pro-dg.com/seguros</a>.
        {sold > 0 && (
          <>
            {" "}Pólizas vendidas: <span className="font-mono font-bold text-white">{sold}</span> · Cargos de servicio:{" "}
            <span className="font-mono font-bold text-emerald-300">US${(sold * 150).toLocaleString("en-US")}</span>
          </>
        )}
      </p>

      {error && (
        <p className="mt-6 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-amber-100">
          <AlertTriangle className="w-4 h-4" /> {error}
        </p>
      )}
      {saveError && (
        <p role="alert" className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-red-100">
          No se pudo guardar el cambio. Inténtalo de nuevo.
        </p>
      )}

      <div className="mt-8 flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(["todas", ...ORDER] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={
                "px-4 py-2 rounded-full text-sm font-medium transition-all " +
                (filter === s ? "bg-electric text-white" : "border border-[#7cc4ff40] text-sky-text/75 hover:text-white")
              }
            >
              {s === "todas" ? "Todas" : STATUS[s].label}
              <span className="ml-1.5 font-mono text-xs opacity-75">{counts[s]}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 rounded-full border border-[#7cc4ff40] bg-white/5 px-4 md:w-80">
          <Search className="w-4 h-4 text-[#7cc4ff]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar nombre, correo, vehículo, código"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/35"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {shown.map((l) => (
          <LeadCard key={l.id} l={l} onStatus={(s) => change(l.id, s)} />
        ))}
        {!error && shown.length === 0 && (
          <p className="text-center py-16 text-sky-text/70">
            {leads.length === 0 ? "Aún no hay solicitudes. Aparecerán aquí cuando alguien complete el formulario." : "No hay solicitudes con este filtro."}
          </p>
        )}
      </div>
    </main>
  );
}
