"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, Phone, Mail, MessageCircle, Copy, Check, AlertTriangle, Car, User, ShieldCheck, Reply, Pencil, Trash2, Loader2, Plus, Contact as IdCard } from "lucide-react";
import { addInsuranceNote, doneInsuranceFollowUp, removeLead, updateLeadStatus } from "../admin-actions";
import LeadNotes, { FollowUpBadge, Linkify } from "../LeadNotes";
import LeadEditor from "./LeadEditor";
import Dashboard from "./Dashboard";
import NewLeadForm from "./NewLeadForm";
import { ORDER, STATUS, channelLabel, type LeadRow } from "./status";
import Phone2Button from "../Phone2Button";
import EmailButton, { composeHref } from "../EmailButton";
import { leadService, productLabel } from "@/app/lib/lead-service";
import { label, type OptionGroup } from "@/app/seguros/model";
import type { InsStatus } from "@/app/lib/server/insurance";

type Row = LeadRow;

const L = (g: OptionGroup, v: string) => (v ? label(g, v, "es") : "");

function Info({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-4 py-1 text-sm border-b border-white/5 last:border-0">
      <span className="text-sky-text/60 shrink-0">{k}</span>
      <span className="text-right break-words min-w-0">
        <Linkify text={v} />
      </span>
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

function LeadCard({
  l,
  onStatus,
  onSaved,
  onDeleted,
}: {
  l: Row;
  onStatus: (s: InsStatus) => void;
  onSaved: (d: Pick<Row, "driver" | "extraDrivers" | "vehicles" | "coverage">) => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false); // every lead starts closed; click its row to see the details
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [log, setLog] = useState(l.log ?? []); // kept here so it survives closing the card
  const [followUp, setFollowUp] = useState(l.followUp ?? null);

  const del = async () => {
    if (!confirm(`¿Eliminar la solicitud ${l.code} de ${[l.driver.firstName, l.driver.lastName].join(" ").trim() || l.driver.email}? Esto también borra las fotos de licencia y no se puede deshacer.`)) return;
    setDeleting(true);
    const r = await removeLead(l.id);
    setDeleting(false);
    if (r.ok) onDeleted();
    else setErr(r.error);
  };
  const d = l.driver;
  const service = leadService(l);
  const phone =d.phone.replace(/[^\d+]/g, "");
  const wa = phone.replace(/^\+/, "").length === 10 ? `1${phone.replace(/^\+/, "")}` : phone.replace(/^\+/, "");
  const replyHref = `/agentes/correo?to=${encodeURIComponent(d.email)}&subject=${encodeURIComponent(
    l.lang === "es" ? `Tu cotización de seguro de auto (${l.code})` : `Your car insurance quote (${l.code})`
  )}`;

  return (
    <article className="rounded-2xl border border-[#7cc4ff33] overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 p-5 text-left hover:bg-white/5">
        <span className="font-mono font-bold text-[#7cc4ff]">{l.code}</span>
        <span className={"px-2.5 py-0.5 rounded-full border text-xs font-semibold " + STATUS[l.status].cls}>{STATUS[l.status].label}</span>
        {l.source === "meta" && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#1877F2]/25 text-[#9cc2ff]" title="Formulario instantáneo de Meta">
            Meta
          </span>
        )}
        {l.source === "manual" && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-100" title={`Agregado a mano${l.addedBy ? ` por ${l.addedBy}` : ""}`}>
            A mano{l.channel ? ` · ${channelLabel(l.channel)}` : ""}
          </span>
        )}
        {service && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-400/20 text-amber-100" title="Servicio que pidió en el formulario">
            {productLabel(service, "es")}
          </span>
        )}
        <span className="font-display font-bold text-lg flex-1 min-w-40 truncate">
          {[d.firstName, d.lastName].join(" ").trim() || d.email}
        </span>
        <FollowUpBadge followUp={followUp} />
        {log.length ? (
          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-sky-text/80" title="Notas y llamadas registradas">
            📝 {log.length}
          </span>
        ) : null}
        {l.licensePhotos ? (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-400/20 text-amber-100">
            <IdCard className="w-3.5 h-3.5" /> Licencia
          </span>
        ) : null}
        <span className="text-sm text-sky-text/75 hidden md:inline">
          {l.vehicles.map((v) => `${v.year} ${v.make}`).join(" · ")}
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-white/10">{d.state} {l.lang === "en" ? "· EN" : "· ES"}</span>
        <span className="text-xs text-sky-text/60">{l.when}</span>
        <ChevronDown className={"w-4 h-4 text-sky-text/60 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && editing && (
        <div className="px-5 pb-5">
          <LeadEditor
            id={l.id}
            initial={{ driver: l.driver, extraDrivers: l.extraDrivers, vehicles: l.vehicles, coverage: l.coverage }}
            onCancel={() => setEditing(false)}
            onSaved={(data) => {
              onSaved(data);
              setEditing(false);
            }}
          />
        </div>
      )}

      {open && !editing && (
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
            {l.licensePhotos ? (
              <div className="rounded-xl bg-black/20 p-3">
                <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#7cc4ff] mb-2">
                  <IdCard className="w-3.5 h-3.5" /> Licencia de conducir
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: l.licensePhotos }, (_, i) => (
                    <a key={i} href={`/agentes/seguros/licencia/${l.id}/${i}`} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden bg-black/30 hover:ring-2 ring-[#33aaff]" title={i === 0 ? "Frente (abrir)" : "Reverso (abrir)"}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/agentes/seguros/licencia/${l.id}/${i}`} alt={i === 0 ? "Frente" : "Reverso"} className="w-full h-24 object-cover" />
                    </a>
                  ))}
                </div>
                <p className="text-[11px] text-sky-text/55 mt-2">Toca para verla completa y copiar los datos.</p>
              </div>
            ) : null}
            <div className="rounded-xl bg-black/20 p-4 flex flex-col gap-2 text-sm">
              <a href={composeHref(d.email)} title="Escribirle desde el portal" className="flex items-center gap-2 text-[#7cc4ff] hover:underline break-all">
                <Mail className="w-4 h-4 shrink-0" /> {d.email}
              </a>
              <a href={`tel:${phone}`} className="flex items-center gap-2 text-[#7cc4ff] hover:underline">
                <Phone className="w-4 h-4 shrink-0" /> {d.phone}
              </a>
              <Phone2Button phone={d.phone} className="flex items-center gap-2 text-left text-[#7cc4ff] hover:underline" />
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
            <EmailButton to={d.email} label="Enviar otro correo" className="flex items-center justify-center gap-1.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10 py-2.5 text-sm" />
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
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center justify-center gap-1.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10 py-2.5 text-sm font-semibold"
              >
                <Pencil className="w-4 h-4" /> Editar
              </button>
              <button
                type="button"
                onClick={del}
                disabled={deleting}
                className="flex items-center justify-center gap-1.5 rounded-full border border-red-400/50 text-red-200 hover:bg-red-500/20 py-2.5 text-sm font-semibold"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Eliminar
              </button>
            </div>
            {err && <p className="text-xs text-red-200">{err}</p>}
          </div>
          <div className="lg:col-span-2">
            <LeadNotes
              initial={log}
              followUp={followUp}
              add={(outcome, text, due) => addInsuranceNote(l.id, outcome, text, due)}
              done={() => doneInsuranceFollowUp(l.id)}
              onChange={(nextLog, nextFollowUp) => {
                setLog(nextLog);
                setFollowUp(nextFollowUp);
              }}
            />
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
  const [adding, setAdding] = useState(false);

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
      <div className="flex flex-wrap items-end justify-between gap-3 mt-2">
        <h1 className="font-display font-black text-3xl md:text-5xl">Solicitudes de seguro</h1>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Nuevo lead
          </button>
        )}
      </div>
      <p className="text-sky-text/75 mt-2">
        Llegan desde <a href="/seguros" className="text-[#7cc4ff] underline" target="_blank">pro-dg.com/seguros</a>, los formularios de Meta, o los agregas a mano.
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

      {adding && (
        <NewLeadForm
          onClose={() => setAdding(false)}
          onCreated={(lead) => {
            const when = new Date(lead.createdAt).toLocaleString("es-NI", {
              timeZone: "America/Managua", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            });
            setLeads((list) => [{ ...lead, when }, ...list]);
            setFilter("todas");
          }}
        />
      )}

      <Dashboard
        leads={leads}
        onFilter={(s) => {
          setFilter(s);
          document.getElementById("lista")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <div id="lista" className="mt-8 flex flex-col md:flex-row gap-3 md:items-center justify-between scroll-mt-20">
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
          <LeadCard
            key={l.id}
            l={l}
            onStatus={(s) => change(l.id, s)}
            onSaved={(data) => setLeads((list) => list.map((x) => (x.id === l.id ? { ...x, ...data } : x)))}
            onDeleted={() => setLeads((list) => list.filter((x) => x.id !== l.id))}
          />
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
