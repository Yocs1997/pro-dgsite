"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Inbox,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Search,
  Store,
  Trash2,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { PosLead, PosStatus } from "@/app/lib/server/pos-leads";
import { addPosLead, addPosNote, assignPosLead, donePosFollowUp, removePosLead, setPosStatus, type NewPosLead } from "../pos-actions";
import LeadNotes, { FollowUpBadge, Linkify } from "../LeadNotes";
import { logout } from "../actions";
import Phone2Button from "../Phone2Button";
import EmailButton from "../EmailButton";

export type PosRow = PosLead & { wa: string; tel: string; when: string; assignedWhen: string };
export type TeamUser = { u: string; name: string; role: "admin" | "agent" };

const STATUS: Record<PosStatus, { label: string; cls: string }> = {
  nueva: { label: "Nueva", cls: "border-emerald-400/50 text-emerald-300 bg-emerald-500/10" },
  contactada: { label: "Contactada", cls: "border-sky-400/50 text-sky-200 bg-sky-500/10" },
  cotizada: { label: "Cotizada", cls: "border-indigo-400/50 text-indigo-200 bg-indigo-500/10" },
  cerrada: { label: "Cerrada (venta)", cls: "border-amber-400/50 text-amber-200 bg-amber-500/10" },
  perdida: { label: "Perdida", cls: "border-white/20 text-sky-text/70 bg-white/5" },
};
const ORDER: PosStatus[] = ["nueva", "contactada", "cotizada", "cerrada", "perdida"];
const UNASSIGNED = "__none__";

function duration(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = m / 60;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round(h / 24)} días`;
}

/** Time from assignment to the first move out of "nueva" (contact, quote, sale or lost). */
function firstContactMs(l: PosRow): number | null {
  if (!l.assignedAt) return null;
  const times = (["contactada", "cotizada", "cerrada", "perdida"] as const)
    .map((s) => l.statusAt?.[s])
    .filter((t): t is number => typeof t === "number" && t >= l.assignedAt!);
  return times.length ? Math.min(...times) - l.assignedAt : null;
}

// ─── Team summary (admins) ───────────────────────────────────────────────────

function TeamSummary({ leads, team, onPick, picked }: { leads: PosRow[]; team: TeamUser[]; onPick: (u: string) => void; picked: string }) {
  const [days, setDays] = useState<number>(30);
  const since = days ? Date.now() - days * 86400000 : 0;
  const inPeriod = leads.filter((l) => (l.assignedAt ?? l.createdAt) >= since);

  const rows = useMemo(() => {
    const by = new Map<string, PosRow[]>();
    for (const l of inPeriod) {
      const k = l.assignedTo?.u.toLowerCase() ?? UNASSIGNED;
      by.set(k, [...(by.get(k) ?? []), l]);
    }
    // Every agent appears, even with 0 leads in the period.
    for (const t of team) if (t.role === "agent" && !by.has(t.u.toLowerCase())) by.set(t.u.toLowerCase(), []);
    const nameOf = (k: string) =>
      k === UNASSIGNED ? "Sin asignar" : team.find((t) => t.u.toLowerCase() === k)?.name ?? inPeriod.find((l) => l.assignedTo?.u.toLowerCase() === k)?.assignedTo?.name ?? k;
    return [...by.entries()]
      .map(([k, list]) => {
        const count = (s: PosStatus) => list.filter((l) => l.status === s).length;
        const contacts = list.map(firstContactMs).filter((x): x is number => x !== null);
        const stale = list.filter((l) => l.status === "nueva" && l.assignedAt && Date.now() - l.assignedAt > 86400000).length;
        return {
          k,
          name: nameOf(k),
          total: list.length,
          counts: Object.fromEntries(ORDER.map((s) => [s, count(s)])) as Record<PosStatus, number>,
          closeRate: list.length ? Math.round((count("cerrada") / list.length) * 100) : null,
          avgContact: contacts.length ? contacts.reduce((a, b) => a + b, 0) / contacts.length : null,
          stale,
        };
      })
      .sort((a, b) => (a.k === UNASSIGNED ? 1 : b.k === UNASSIGNED ? -1 : b.total - a.total));
  }, [inPeriod, team]);

  const th = "px-3 py-2 text-left font-medium text-sky-text/70 whitespace-nowrap";
  const td = "px-3 py-2.5 whitespace-nowrap";
  return (
    <section className="mt-6 rounded-2xl border border-[#7cc4ff33] p-5" style={{ background: "rgba(255,255,255,0.05)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-display font-bold text-xl flex items-center gap-2">
          <Users className="w-5 h-5 text-[#7cc4ff]" /> Resumen del equipo
        </h2>
        <div className="flex gap-1.5">
          {[7, 30, 90, 0].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={"px-3 py-1.5 rounded-full text-xs font-medium " + (days === d ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/80 hover:text-white")}
            >
              {d ? `${d} días` : "Todo"}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className={th}>Agente</th>
              <th className={th}>Asignados</th>
              <th className={th}>Nuevos</th>
              <th className={th}>Contactados</th>
              <th className={th}>Cotizados</th>
              <th className={th}>Cerrados</th>
              <th className={th}>Perdidos</th>
              <th className={th}>% cierre</th>
              <th className={th} title="Tiempo promedio desde que se asigna hasta el primer contacto">1er contacto</th>
              <th className={th} title="Asignados hace más de 24 horas y todavía en Nueva">Sin contactar +24 h</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr
                key={r.k}
                onClick={() => onPick(picked === r.k ? "" : r.k)}
                className={"cursor-pointer hover:bg-white/5 " + (picked === r.k ? "bg-white/10" : "")}
                title="Ver solo sus leads"
              >
                <td className={td + " font-semibold"}>{r.name}</td>
                <td className={td}>{r.total}</td>
                <td className={td}>{r.counts.nueva}</td>
                <td className={td}>{r.counts.contactada}</td>
                <td className={td}>{r.counts.cotizada}</td>
                <td className={td + " text-amber-200"}>{r.counts.cerrada}</td>
                <td className={td + " text-sky-text/70"}>{r.counts.perdida}</td>
                <td className={td}>{r.k === UNASSIGNED || r.closeRate === null ? "—" : `${r.closeRate}%`}</td>
                <td className={td}>{r.k === UNASSIGNED || r.avgContact === null ? "—" : duration(r.avgContact)}</td>
                <td className={td + (r.stale ? " text-red-200 font-semibold" : " text-sky-text/60")}>{r.k === UNASSIGNED ? "—" : r.stale}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-sky-text/60">
                  No hay leads en este periodo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-sky-text/55 mt-2">
        Cuenta los leads asignados en el periodo (o recibidos, si están sin asignar), según su estado actual. Toca una fila para ver solo esos leads.
      </p>
    </section>
  );
}

// ─── New lead by hand (e.g. from a WhatsApp ad chat) ─────────────────────────

const EMPTY: NewPosLead = { name: "", phone: "", business: "", city: "", message: "", assignTo: "" };

function NewLeadForm({ team, onClose }: { team: TeamUser[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState<NewPosLead>(EMPTY);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dup, setDup] = useState(false);
  const set = (k: keyof NewPosLead) => (e: { target: { value: string } }) => {
    setF({ ...f, [k]: e.target.value });
    if (k === "phone") setDup(false);
  };

  const save = (force: boolean) =>
    start(async () => {
      setMsg(null);
      const r = await addPosLead(f, force);
      if (!r.ok) {
        setDup("duplicate" in r && Boolean(r.duplicate));
        return setMsg({ ok: false, text: r.error });
      }
      const who = team.find((t) => t.u === f.assignTo)?.name;
      setMsg({
        ok: true,
        text: `${r.code} guardado y avisado en el grupo.` + (who ? (r.notified ? ` ${who} recibió el aviso por Telegram.` : ` Asignado a ${who} (sin Telegram conectado).`) : ""),
      });
      setF(EMPTY);
      setDup(false);
      router.refresh();
    });

  const input = "w-full rounded-xl border border-[#7cc4ff40] bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#7cc4ff] placeholder:text-white/35";
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
          <MessageCircle className="w-5 h-5 text-emerald-300" /> Nuevo lead de WhatsApp
        </h2>
        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-sky-text/70" title="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-sky-text/65 mt-1">Para las personas que escriben a tu WhatsApp desde el anuncio. Copia su nombre, número y mensaje.</p>
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <label className="text-xs text-sky-text/75">
          Número de WhatsApp *
          <input required value={f.phone} onChange={set("phone")} placeholder="+505 8888 8888" inputMode="tel" className={input + " mt-1"} />
        </label>
        <label className="text-xs text-sky-text/75">
          Nombre
          <input value={f.name} onChange={set("name")} placeholder="Nombre y apellido" className={input + " mt-1"} />
        </label>
        <label className="text-xs text-sky-text/75">
          Negocio
          <input value={f.business} onChange={set("business")} placeholder="Nombre del negocio" className={input + " mt-1"} />
        </label>
        <label className="text-xs text-sky-text/75">
          Ciudad
          <input value={f.city} onChange={set("city")} placeholder="Managua" className={input + " mt-1"} />
        </label>
        <label className="text-xs text-sky-text/75 sm:col-span-2">
          Mensaje que envió
          <textarea value={f.message} onChange={set("message")} rows={2} placeholder="Pega aquí lo que escribió" className={input + " mt-1 resize-y"} />
        </label>
        <label className="text-xs text-sky-text/75">
          Asignar a
          <select value={f.assignTo} onChange={set("assignTo")} className={input + " mt-1 bg-[#0B2B5E]"}>
            <option value="">Sin asignar (lo asigno después)</option>
            {team.map((t) => (
              <option key={t.u} value={t.u}>
                {t.name}
                {t.role === "admin" ? " (admin)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button disabled={pending} className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-60">
            <Plus className="w-4 h-4" /> {pending ? "Guardando…" : "Guardar lead"}
          </button>
          {dup && (
            <button type="button" disabled={pending} onClick={() => save(true)} className="px-4 py-2 rounded-full border border-amber-400/50 text-amber-100 text-sm hover:bg-amber-500/15">
              Guardar de todos modos
            </button>
          )}
        </div>
      </div>
      {msg && <p className={"mt-3 text-sm " + (msg.ok ? "text-emerald-300" : "text-red-200")}>{msg.text}</p>}
    </form>
  );
}

// ─── Lead card ───────────────────────────────────────────────────────────────

function LeadCard({ l, isAdmin, team }: { l: PosRow; isAdmin: boolean; team: TeamUser[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState<PosStatus>(l.status);
  const [log, setLog] = useState(l.log ?? []);
  const [followUp, setFollowUp] = useState(l.followUp ?? null);

  const changeStatus = (s: PosStatus) =>
    start(async () => {
      setMsg(null);
      const prev = status;
      setStatus(s);
      const r = await setPosStatus(l.id, s);
      if (!r.ok) {
        setStatus(prev);
        setMsg({ ok: false, text: r.error });
      } else router.refresh();
    });

  const assign = (u: string) =>
    start(async () => {
      setMsg(null);
      const r = await assignPosLead(l.id, u);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      const who = team.find((t) => t.u === u)?.name;
      setMsg(
        u
          ? { ok: true, text: r.notified ? `Asignado a ${who}; le llegó un aviso por Telegram.` : `Asignado a ${who}. (No tiene Telegram conectado: lo verá en el portal.)` }
          : { ok: true, text: "Sin asignar." }
      );
      router.refresh();
    });

  const remove = () => {
    if (!window.confirm(`¿Eliminar el lead ${l.code} de ${l.name || l.business || "(sin nombre)"}? No se puede deshacer.`)) return;
    start(async () => {
      const r = await removePosLead(l.id);
      if (!r.ok) setMsg({ ok: false, text: r.error });
      else router.refresh();
    });
  };

  return (
    <article className="rounded-2xl border border-[#7cc4ff33] p-5" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="font-mono font-bold text-[#7cc4ff]">{l.code}</span>
        <span className={"px-2.5 py-0.5 rounded-full border text-xs font-semibold " + STATUS[status].cls}>{STATUS[status].label}</span>
        <FollowUpBadge followUp={followUp} />
        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] text-sky-text/75">{l.source === "whatsapp" ? "💬 WhatsApp" : "📋 Formulario"}</span>
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
      {l.extra.length > 0 && (
        <p className="mt-2 text-xs text-sky-text/65 break-words">
          <Linkify text={l.extra.join(" · ")} />
        </p>
      )}
      {l.quoteCode && (
        <p className="mt-2 text-xs text-indigo-200 flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5" /> Cotización {l.quoteCode} ·{" "}
          <a href="/agentes/cotizaciones" className="underline hover:text-white">
            ver en Cotizaciones
          </a>
        </p>
      )}

      {isAdmin ? (
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <UserCheck className="w-4 h-4 text-[#7cc4ff]" />
          <span className="text-sky-text/75">Asignar a</span>
          <select
            value={l.assignedTo?.u ?? ""}
            disabled={pending}
            onChange={(e) => assign(e.target.value)}
            className="rounded-full border border-[#7cc4ff40] bg-[#0B2B5E] px-3 py-1.5 text-sm"
          >
            <option value="">Sin asignar</option>
            {team.map((t) => (
              <option key={t.u} value={t.u}>
                {t.name}
                {t.role === "admin" ? " (admin)" : ""}
              </option>
            ))}
          </select>
          {l.assignedWhen && <span className="text-xs text-sky-text/55">desde {l.assignedWhen}</span>}
        </label>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {l.wa ? (
          <a
            href={l.wa}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => status === "nueva" && changeStatus("contactada")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        ) : null}
        {l.tel && (
          <a href={`tel:${l.tel}`} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm">
            <Phone className="w-4 h-4" /> Llamar
          </a>
        )}
        {isAdmin && l.tel && <Phone2Button phone={l.tel} />}
        {isAdmin && <EmailButton to={l.email} label="Correo" />}
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
        {isAdmin && (
          <button type="button" onClick={remove} disabled={pending} className="p-2 rounded-full hover:bg-red-500/20 text-sky-text/70 hover:text-red-200" title="Eliminar lead">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {msg && <p className={"mt-2 text-xs " + (msg.ok ? "text-emerald-300" : "text-red-200")}>{msg.text}</p>}
      <div className="mt-4">
        <LeadNotes
          initial={log}
          followUp={followUp}
          add={(outcome, text, due) => addPosNote(l.id, outcome, text, due)}
          done={() => donePosFollowUp(l.id)}
          onChange={(nextLog, nextFollowUp) => {
            setLog(nextLog);
            setFollowUp(nextFollowUp);
          }}
        />
      </div>
    </article>
  );
}

// ─── Agent menu (agents don't get the admin menu) ────────────────────────────

function AgentNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#7cc4ff20] backdrop-blur-xl" style={{ background: "rgba(11,43,94,0.85)" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <a href="/agentes" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">
            Pro<span className="text-electric-light">-DG</span>
          </span>
        </a>
        <div className="flex items-center gap-1">
          <a href="/agentes" className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-sky-text/80 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Calculadora</span>
          </a>
          <a href="/agentes/cotizaciones" className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-sky-text/80 hover:text-white hover:bg-white/10">
            <Inbox className="w-4 h-4" /> <span className="hidden sm:inline">Mis cotizaciones</span>
          </a>
          <form action={logout}>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-sky-text/80 hover:text-white hover:bg-white/10" title="Salir">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PosLeadsView({
  leads,
  error,
  isAdmin,
  team,
  userName,
}: {
  leads: PosRow[];
  error: string | null;
  isAdmin: boolean;
  team: TeamUser[];
  userName: string;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | PosStatus>("all");
  const [agent, setAgent] = useState(""); // "" = everyone, UNASSIGNED, or a lowercase username
  const [adding, setAdding] = useState(false);
  const byAgent = leads.filter((l) => !agent || (agent === UNASSIGNED ? !l.assignedTo : l.assignedTo?.u.toLowerCase() === agent));
  const counts = Object.fromEntries(ORDER.map((s) => [s, byAgent.filter((l) => l.status === s).length])) as Record<PosStatus, number>;
  const shown = byAgent.filter(
    (l) =>
      (filter === "all" || l.status === filter) &&
      (!q.trim() || `${l.code} ${l.name} ${l.business} ${l.city} ${l.phone} ${l.email}`.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      {!isAdmin && <AgentNav />}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-white">
        <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Sistemas de facturación · Nicaragua</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display font-black text-3xl md:text-4xl mt-1">{isAdmin ? "Facturación" : "Mis leads"}</h1>
          {isAdmin && !adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" /> Nuevo lead
            </button>
          )}
        </div>
        <p className="text-sm text-sky-text/70 mt-1">
          {isAdmin
            ? "Leads de los formularios de Meta de la página Pro-DG y de los chats de WhatsApp que agregues. Asígnalos a tu equipo; se atienden por WhatsApp o llamada."
            : `Hola ${userName.split(" ")[0]}: estos son los leads que te asignaron. Escríbeles por WhatsApp y actualiza su estado.`}
        </p>

        {error && (
          <p className="mt-5 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-amber-100">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}

        {isAdmin && adding && <NewLeadForm team={team} onClose={() => setAdding(false)} />}

        {isAdmin && <TeamSummary leads={leads} team={team} picked={agent} onPick={setAgent} />}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {(["all", ...ORDER] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={"px-3.5 py-1.5 rounded-full text-xs font-medium " + (filter === s ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/80 hover:text-white")}
            >
              {s === "all" ? `Todos (${byAgent.length})` : `${STATUS[s].label} (${counts[s]})`}
            </button>
          ))}
          {isAdmin && (
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="rounded-full border border-[#7cc4ff40] bg-[#0B2B5E] px-3 py-1.5 text-xs"
              aria-label="Agente"
            >
              <option value="">Todo el equipo</option>
              <option value={UNASSIGNED}>Sin asignar</option>
              {team.map((t) => (
                <option key={t.u} value={t.u.toLowerCase()}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <label className="ml-auto flex items-center gap-2 rounded-full border border-[#7cc4ff40] bg-white/5 px-4 min-w-56">
            <Search className="w-4 h-4 text-[#7cc4ff]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-white/35" />
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {shown.map((l) => (
            <LeadCard key={l.id} l={l} isAdmin={isAdmin} team={team} />
          ))}
          {shown.length === 0 && (
            <p className="py-14 text-center text-sm text-sky-text/60">
              {leads.length === 0
                ? isAdmin
                  ? "Aún no hay leads de facturación. Llegarán aquí desde los formularios de la página Pro-DG."
                  : "Todavía no tienes leads asignados."
                : "Nadie en este filtro."}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
