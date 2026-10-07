"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import { INSURED_LABEL, stateLabel } from "@/app/lib/contact-details";
import { dayLabel, outcomeLabel, todayIn } from "@/app/lib/lead-notes";
import { leadService, productLabel } from "@/app/lib/lead-service";
import { label, type OptionGroup } from "@/app/seguros/model";
import type { InsStatus } from "@/app/lib/server/insurance";
import { ORDER, STATUS, sourceLabel, type LeadRow } from "./status";

// Pipeline summary for Seguros. Everything is computed in the browser from the leads the
// page already loaded, so it updates right away when a status changes or a lead is added.
// Period numbers count the leads RECEIVED in the period, by their current status.

const TZ = "America/New_York"; // same day boundaries as the call-back reminders
const DAY = 86400000;
const FEE = 150;
const PERIODS = [7, 30, 90, 0] as const; // 0 = everything
type Period = (typeof PERIODS)[number];
type Unit = "day" | "week" | "month";

const dayKey = (ts: number) => new Date(ts).toLocaleDateString("en-CA", { timeZone: TZ });
const keyUTC = (k: string) => Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
const utcKey = (t: number) => new Date(t).toISOString().slice(0, 10);
const monday = (k: string) => utcKey(keyUTC(k) - ((new Date(keyUTC(k)).getUTCDay() + 6) % 7) * DAY);
const bucketOf = (ts: number, unit: Unit) => {
  const k = dayKey(ts);
  return unit === "day" ? k : unit === "week" ? monday(k) : k.slice(0, 7);
};
const bucketLabel = (k: string, unit: Unit) =>
  unit === "month"
    ? new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, 1)).toLocaleDateString("es", { month: "short", year: "2-digit", timeZone: "UTC" })
    : unit === "week"
      ? `sem. ${dayLabel(k)}`
      : dayLabel(k);

function buckets(from: number, to: number, unit: Unit): string[] {
  const out: string[] = [];
  if (unit === "month") {
    let [y, m] = dayKey(from).split("-").map(Number);
    const end = dayKey(to).slice(0, 7);
    for (let i = 0; i < 120; i++) {
      const k = `${y}-${String(m).padStart(2, "0")}`;
      out.push(k);
      if (k >= end) break;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return out;
  }
  const step = unit === "week" ? 7 * DAY : DAY;
  const end = keyUTC(bucketOf(to, unit));
  for (let t = keyUTC(bucketOf(from, unit)); t <= end && out.length < 400; t += step) out.push(utcKey(t));
  return out;
}

function duration(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = m / 60;
  if (h < 48) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round(h / 24)} días`;
}
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");
const money = (n: number) => `US$${n.toLocaleString("en-US")}`;

/** [label, count] sorted by count; anything past `top` folds into "Otros". */
function countBy<T>(list: T[], key: (x: T) => string | string[], top = 8): [string, number][] {
  const m = new Map<string, number>();
  for (const x of list) {
    const k = key(x);
    for (const one of Array.isArray(k) ? k : [k]) m.set(one, (m.get(one) ?? 0) + 1);
  }
  const rows = [...m.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length <= top) return rows;
  const rest = rows.slice(top - 1).reduce((n, [, c]) => n + c, 0);
  return [...rows.slice(0, top - 1), ["Otros", rest]];
}

const L = (g: OptionGroup, v: string) => (v ? label(g, v, "es") : "Sin dato");
const name = (l: LeadRow) => [l.driver.firstName, l.driver.lastName].filter(Boolean).join(" ") || l.driver.email || l.code;

// ─── Small pieces ────────────────────────────────────────────────────────────

const card = "rounded-2xl border border-[#7cc4ff33] p-4";
const glass = { background: "rgba(255,255,255,0.05)" } as const;

function Tile({ label: text, value, sub, tone = "", onClick }: { label: string; value: React.ReactNode; sub?: string; tone?: string; onClick?: () => void }) {
  const body = (
    <>
      <p className="text-xs text-sky-text/70">{text}</p>
      <p className={"font-display font-black text-3xl mt-1 " + tone}>{value}</p>
      {sub && <p className="text-xs text-sky-text/60 mt-1">{sub}</p>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={card + " text-left hover:border-[#33aaff] transition-colors"} style={glass} title="Ver estas solicitudes en la lista">
      {body}
    </button>
  ) : (
    <div className={card} style={glass}>
      {body}
    </div>
  );
}

/** One measure per row: label, a single-hue bar scaled to the largest row, count and share. */
function BarList({ title, rows, total, note }: { title: string; rows: [string, number][]; total: number; note?: string }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <section className={card} style={glass}>
      <h3 className="font-display font-bold mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-sky-text/55">Sin datos en este periodo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(([k, n]) => (
            <li key={k} className="text-sm" title={`${k}: ${n} (${pct(n, total)})`}>
              <div className="flex justify-between gap-3">
                <span className="truncate text-sky-text/90">{k}</span>
                <span className="shrink-0 text-white">
                  {n} <span className="text-xs text-sky-text/55">{pct(n, total)}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#33aaff]" style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="text-[11px] text-sky-text/50 mt-3">{note}</p>}
    </section>
  );
}

/** Status columns per group (source, service…), with the close rate. */
function PipelineTable({ title, groups }: { title: string; groups: [string, LeadRow[]][] }) {
  const th = "px-3 py-2 text-left font-medium text-sky-text/70 whitespace-nowrap";
  const td = "px-3 py-2 whitespace-nowrap";
  return (
    <section className={card + " overflow-hidden"} style={glass}>
      <h3 className="font-display font-bold mb-3">{title}</h3>
      <div className="overflow-x-auto -mx-4">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className={th}>{title.replace(/^Por /, "").replace(/^\w/, (c) => c.toUpperCase())}</th>
              <th className={th}>Leads</th>
              {ORDER.map((s) => (
                <th key={s} className={th}>
                  {STATUS[s].label}
                </th>
              ))}
              <th className={th} title="Pólizas vendidas ÷ leads">% cierre</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {groups.map(([g, list]) => {
              const n = (s: InsStatus) => list.filter((l) => l.status === s).length;
              return (
                <tr key={g}>
                  <td className={td + " font-semibold max-w-[16rem] truncate"} title={g}>
                    {g}
                  </td>
                  <td className={td}>{list.length}</td>
                  {ORDER.map((s) => (
                    <td key={s} className={td + (n(s) ? "" : " text-sky-text/35")}>
                      {n(s)}
                    </td>
                  ))}
                  <td className={td}>{pct(n("vendida"), list.length)}</td>
                </tr>
              );
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={ORDER.length + 3} className="py-5 text-center text-sky-text/55">
                  Sin datos en este periodo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Leads received per day / week / month, with the sold ones at the base of each column. */
function TimeChart({ cohort, from, to, unit }: { cohort: LeadRow[]; from: number; to: number; unit: Unit }) {
  const [hover, setHover] = useState<number | null>(null);
  const keys = useMemo(() => buckets(from, to, unit), [from, to, unit]);
  const data = useMemo(() => {
    const idx = new Map(keys.map((k, i) => [k, i]));
    const rows = keys.map((k) => ({ k, total: 0, sold: 0 }));
    for (const l of cohort) {
      const i = idx.get(bucketOf(l.createdAt, unit));
      if (i === undefined) continue;
      rows[i].total++;
      if (l.status === "vendida") rows[i].sold++;
    }
    return rows;
  }, [cohort, keys, unit]);
  const max = Math.max(1, ...data.map((d) => d.total));
  const unitText = unit === "day" ? "por día" : unit === "week" ? "por semana" : "por mes";
  const every = Math.ceil(data.length / 8); // axis labels: about 8 at most
  const h = data[hover ?? -1];

  return (
    <section className={card} style={glass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h3 className="font-display font-bold">Leads recibidos {unitText}</h3>
        <span className="flex items-center gap-3 text-xs text-sky-text/70">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#33aaff]" /> Recibidos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS.vendida.fill }} /> De ellos, vendidos
          </span>
        </span>
      </div>
      <div className="relative">
        <div className="flex items-end gap-[2px] h-40 border-b border-white/15" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div
              key={d.k}
              className="relative flex-1 h-full flex flex-col justify-end cursor-default"
              onMouseEnter={() => setHover(i)}
              aria-label={`${bucketLabel(d.k, unit)}: ${d.total} leads, ${d.sold} vendidos`}
            >
              {d.total > 0 && (
                <div className={"w-full flex flex-col justify-end rounded-t-[4px] overflow-hidden " + (hover === i ? "opacity-100" : hover === null ? "opacity-100" : "opacity-60")} style={{ height: `${(d.total / max) * 100}%` }}>
                  <div className="w-full bg-[#33aaff] flex-1" />
                  {d.sold > 0 && <div className="w-full border-t-2 border-[#0F3470]" style={{ height: `${(d.sold / d.total) * 100}%`, background: STATUS.vendida.fill }} />}
                </div>
              )}
            </div>
          ))}
        </div>
        {h && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-[#7cc4ff40] bg-[#0B2B5E] px-3 py-2 text-xs shadow-xl whitespace-nowrap"
            style={{ left: `${((hover! + 0.5) / data.length) * 100}%` }}
          >
            <p className="font-semibold text-white">{bucketLabel(h.k, unit)}</p>
            <p className="text-sky-text/80">
              {h.total} {h.total === 1 ? "lead" : "leads"} · {h.sold} {h.sold === 1 ? "vendido" : "vendidos"}
            </p>
          </div>
        )}
        <div className="flex gap-[2px] mt-1.5">
          {data.map((d, i) => (
            <span key={d.k} className="flex-1 text-[10px] text-sky-text/55 text-center whitespace-nowrap overflow-visible">
              {i % every === 0 ? bucketLabel(d.k, unit) : ""}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-xs text-sky-text/70">
        <summary className="cursor-pointer hover:text-white">Ver como tabla</summary>
        <table className="mt-2 w-full max-w-sm">
          <tbody>
            {data
              .filter((d) => d.total)
              .map((d) => (
                <tr key={d.k} className="border-t border-white/5">
                  <td className="py-1 pr-3">{bucketLabel(d.k, unit)}</td>
                  <td className="py-1 pr-3">{d.total} leads</td>
                  <td className="py-1">{d.sold} vendidos</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard({ leads, onFilter }: { leads: LeadRow[]; onFilter: (s: InsStatus | "todas") => void }) {
  const [period, setPeriod] = useState<Period>(30);
  const [open, setOpen] = useState(true);
  const [now, setNow] = useState<number | null>(null);
  // Dates depend on the viewer's clock: compute after the page loads (no server/browser mismatch).
  useEffect(() => setNow(Date.now()), []);

  const stats = useMemo(() => {
    if (now === null) return null;
    const first = leads.reduce((m, l) => Math.min(m, l.createdAt), now);
    const since = period ? now - period * DAY : first;
    const span = now - since;
    const unit: Unit = period === 90 || (!period && span > 45 * DAY && span <= 200 * DAY) ? "week" : !period && span > 200 * DAY ? "month" : "day";
    const cohort = leads.filter((l) => l.createdAt >= since);
    const n = (s: InsStatus) => cohort.filter((l) => l.status === s).length;
    const sold = n("vendida");

    // First touch = first note or call logged on the lead.
    const touch = cohort.filter((l) => l.log?.length).map((l) => l.log![0].at - l.createdAt).filter((x) => x >= 0);

    // Work to do right now (all leads, not just this period).
    const today = todayIn();
    const active = leads.filter((l) => l.status !== "vendida" && l.status !== "perdida");
    const untouched = leads.filter((l) => l.status === "nueva" && !l.log?.length);
    const stale = untouched.filter((l) => now - l.createdAt > DAY);
    const fu = active.filter((l) => l.followUp);
    const overdue = fu.filter((l) => l.followUp!.date < today);
    const dueToday = fu.filter((l) => l.followUp!.date === today);
    const upcoming = fu.filter((l) => l.followUp!.date > today).sort((a, b) => a.followUp!.date.localeCompare(b.followUp!.date));

    // Team activity: notes and calls logged in the period, on any lead.
    const entries = leads.flatMap((l) => (l.log ?? []).filter((e) => e.at >= since));
    const byPerson = new Map<string, { notes: number; calls: number; talked: number }>();
    for (const e of entries) {
      const p = byPerson.get(e.by) ?? { notes: 0, calls: 0, talked: 0 };
      if (e.outcome === "nota") p.notes++;
      else p.calls++;
      if (e.outcome === "hablamos") p.talked++;
      byPerson.set(e.by, p);
    }

    const group = (key: (l: LeadRow) => string): [string, LeadRow[]][] => {
      const m = new Map<string, LeadRow[]>();
      for (const l of cohort) m.set(key(l), [...(m.get(key(l)) ?? []), l]);
      return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
    };
    const serviceOf = (l: LeadRow) => {
      const s = leadService(l);
      // No pick = the website form, which is car insurance.
      return productLabel(s, "es").replace(/^./, (c) => c.toUpperCase());
    };
    const days = Math.max(1, Math.round(span / DAY));

    return {
      since,
      unit,
      cohort,
      counts: Object.fromEntries(ORDER.map((s) => [s, n(s)])) as Record<InsStatus, number>,
      sold,
      perDay: cohort.length / days,
      touchAvg: touch.length ? touch.reduce((a, b) => a + b, 0) / touch.length : null,
      touchMedian: median(touch),
      touched: touch.length,
      untouched,
      stale,
      overdue,
      dueToday,
      upcoming,
      entries,
      byPerson: [...byPerson.entries()].sort((a, b) => b[1].calls + b[1].notes - (a[1].calls + a[1].notes)),
      bySource: group(sourceLabel),
      byService: group(serviceOf),
      byState: countBy(cohort, (l) => (l.driver.state ? stateLabel(l.driver.state) : "Sin dato")),
      byLang: countBy(cohort, (l) => (l.lang === "en" ? "Inglés" : "Español")),
      byInsured: countBy(cohort, (l) => INSURED_LABEL[l.coverage.insured] ?? "Sin dato"),
      byLevel: countBy(cohort, (l) => L("level", l.coverage.level)),
      byLicense: countBy(cohort, (l) => L("licenseStatus", l.driver.licenseStatus)),
      byContact: countBy(cohort, (l) => L("contactPref", l.coverage.contactPref)),
      byMake: countBy(cohort, (l) => (l.vehicles.length ? l.vehicles.map((v) => v.make || "Sin dato") : ["Sin vehículo"])),
      byVehicles: countBy(cohort, (l) => (l.vehicles.length >= 2 ? "2 o más" : l.vehicles.length === 1 ? "1" : "Ninguno anotado")),
      risk: [
        ["Necesita SR-22", cohort.filter((l) => l.driver.sr22 === "yes").length],
        ["Con accidentes (3 años)", cohort.filter((l) => l.driver.accidents && l.driver.accidents !== "0").length],
        ["Con multas (3 años)", cohort.filter((l) => l.driver.tickets && l.driver.tickets !== "0").length],
        ["Licencia extranjera o sin licencia", cohort.filter((l) => l.driver.licenseStatus === "intl" || l.driver.licenseStatus === "none").length],
        ["Más de un conductor", cohort.filter((l) => l.extraDrivers.length > 0).length],
        ["Subió foto de licencia", cohort.filter((l) => l.licensePhotos).length],
      ] as [string, number][],
      byOutcome: countBy(entries, (e) => outcomeLabel(e.outcome)),
    };
  }, [leads, period, now]);

  return (
    <section className="mt-8 rounded-2xl border border-[#7cc4ff33] overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 text-left">
          <BarChart3 className="w-5 h-5 text-[#7cc4ff]" />
          <span className="font-display font-bold text-xl">Resumen del pipeline</span>
          <ChevronDown className={"w-4 h-4 text-sky-text/60 transition-transform " + (open ? "rotate-180" : "")} />
        </button>
        {open && (
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={"px-3 py-1.5 rounded-full text-xs font-medium " + (period === p ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/80 hover:text-white")}
              >
                {p ? `${p} días` : "Todo"}
              </button>
            ))}
          </div>
        )}
      </div>

      {open && !stats && <p className="px-5 pb-5 text-sm text-sky-text/60">Calculando…</p>}
      {open && stats && (
        <div className="px-4 sm:px-5 pb-5 flex flex-col gap-4">
          <p className="text-xs text-sky-text/55 -mt-2">
            {period ? `Leads recibidos en los últimos ${period} días` : "Todos los leads"}, según su estado actual. Lo de “Para hacer hoy” incluye todos los leads.
          </p>

          {/* Headline numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label="Leads recibidos" value={stats.cohort.length} sub={`${Math.round(stats.perDay * 10) / 10} por día en promedio`} onClick={() => onFilter("todas")} />
            <Tile
              label="En proceso"
              value={stats.counts.cotizando + stats.counts.enviada}
              sub={`${stats.counts.cotizando} cotizando · ${stats.counts.enviada} con cotización enviada`}
              tone="text-amber-200"
            />
            <Tile
              label="Pólizas vendidas"
              value={stats.sold}
              sub={`${pct(stats.sold, stats.cohort.length)} de cierre · ${pct(stats.sold, stats.sold + stats.counts.perdida)} de las ya decididas`}
              tone="text-violet-200"
              onClick={() => onFilter("vendida")}
            />
            <Tile label="Cargos de servicio" value={money(stats.sold * FEE)} sub={`${stats.sold} × US$${FEE} · ${stats.counts.perdida} no compraron`} tone="text-emerald-300" />
          </div>

          {/* Pipeline by stage */}
          <section className={card} style={glass}>
            <h3 className="font-display font-bold mb-3">Etapas</h3>
            {stats.cohort.length === 0 ? (
              <p className="text-sm text-sky-text/55">No hay leads en este periodo.</p>
            ) : (
              <>
                <div className="flex h-4 gap-[2px] rounded-[4px] overflow-hidden" role="img" aria-label="Leads por etapa">
                  {ORDER.filter((s) => stats.counts[s]).map((s) => (
                    <div key={s} style={{ flexGrow: stats.counts[s], background: STATUS[s].fill }} title={`${STATUS[s].label}: ${stats.counts[s]}`} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {ORDER.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onFilter(s)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5"
                      title="Ver en la lista"
                    >
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: STATUS[s].fill }} />
                      <span className="min-w-0">
                        <span className="block text-xs text-sky-text/70 truncate">{STATUS[s].label}</span>
                        <span className="block text-sm font-semibold">
                          {stats.counts[s]} <span className="text-xs font-normal text-sky-text/55">{pct(stats.counts[s], stats.cohort.length)}</span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* To do today */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile
              label="Sin atender"
              value={stats.untouched.length}
              sub={`Nuevas sin nota ni llamada · ${stats.stale.length} con más de 24 h`}
              tone={stats.stale.length ? "text-red-200" : ""}
              onClick={() => onFilter("nueva")}
            />
            <Tile label="Llamadas atrasadas" value={stats.overdue.length} sub="“Volver a llamar” de días pasados" tone={stats.overdue.length ? "text-red-200" : ""} />
            <Tile label="Llamar hoy" value={stats.dueToday.length} sub={`${stats.upcoming.length} más programadas después`} tone={stats.dueToday.length ? "text-amber-200" : ""} />
            <Tile
              label="Primer contacto"
              value={stats.touchAvg === null ? "—" : duration(stats.touchAvg)}
              sub={stats.touchMedian === null ? "Aún sin notas ni llamadas" : `promedio · mediana ${duration(stats.touchMedian)} · ${stats.touched} de ${stats.cohort.length} leads`}
            />
          </div>
          {(stats.overdue.length > 0 || stats.dueToday.length > 0 || stats.stale.length > 0) && (
            <section className={card} style={glass}>
              <h3 className="font-display font-bold mb-2">Para hacer hoy</h3>
              <ul className="flex flex-col divide-y divide-white/5 text-sm">
                {[...stats.overdue, ...stats.dueToday].map((l) => (
                  <li key={`f-${l.id}`} className="py-1.5 flex flex-wrap gap-x-3">
                    <span className="font-mono text-[#7cc4ff]">{l.code}</span>
                    <span className="font-semibold">{name(l)}</span>
                    <span className={l.followUp!.date < todayIn() ? "text-red-200" : "text-amber-200"}>
                      {l.followUp!.date < todayIn() ? `Llamada atrasada (${dayLabel(l.followUp!.date)})` : "Llamar hoy"}
                    </span>
                    {l.followUp!.note && <span className="text-sky-text/65 truncate">{l.followUp!.note}</span>}
                  </li>
                ))}
                {stats.stale.slice(0, 10).map((l) => (
                  <li key={`s-${l.id}`} className="py-1.5 flex flex-wrap gap-x-3">
                    <span className="font-mono text-[#7cc4ff]">{l.code}</span>
                    <span className="font-semibold">{name(l)}</span>
                    <span className="text-red-200">Sin atender desde {l.when}</span>
                  </li>
                ))}
              </ul>
              {stats.stale.length > 10 && <p className="text-xs text-sky-text/55 mt-2">… y {stats.stale.length - 10} más sin atender.</p>}
            </section>
          )}

          <TimeChart cohort={stats.cohort} from={stats.since} to={now!} unit={stats.unit} />

          <PipelineTable title="Por origen" groups={stats.bySource} />
          <PipelineTable title="Por servicio" groups={stats.byService} />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <BarList title="Estado (dónde vive)" rows={stats.byState} total={stats.cohort.length} />
            <BarList title="Seguro actual" rows={stats.byInsured} total={stats.cohort.length} />
            <BarList title="Cobertura que busca" rows={stats.byLevel} total={stats.cohort.length} />
            <BarList title="Idioma" rows={stats.byLang} total={stats.cohort.length} />
            <BarList title="Tipo de licencia" rows={stats.byLicense} total={stats.cohort.length} />
            <BarList title="Cómo prefiere que lo contacten" rows={stats.byContact} total={stats.cohort.length} />
            <BarList title="Marca del vehículo" rows={stats.byMake} total={stats.cohort.length} note="Un lead con varios vehículos cuenta en cada marca." />
            <BarList title="Vehículos por solicitud" rows={stats.byVehicles} total={stats.cohort.length} />
            <BarList
              title="Perfil de riesgo"
              rows={stats.risk.filter(([, n]) => n > 0)}
              total={stats.cohort.length}
              note="Un lead puede estar en varias filas. Los leads de Meta y los agregados a mano casi nunca traen historial."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className={card} style={glass}>
              <h3 className="font-display font-bold mb-3">Actividad del equipo</h3>
              {stats.byPerson.length === 0 ? (
                <p className="text-sm text-sky-text/55">Nadie ha registrado notas ni llamadas en este periodo.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10 text-sky-text/70">
                    <tr>
                      <th className="text-left font-medium py-1.5">Persona</th>
                      <th className="text-left font-medium py-1.5">Llamadas</th>
                      <th className="text-left font-medium py-1.5">Hablaron</th>
                      <th className="text-left font-medium py-1.5">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.byPerson.map(([who, p]) => (
                      <tr key={who}>
                        <td className="py-1.5 font-semibold">{who}</td>
                        <td className="py-1.5">{p.calls}</td>
                        <td className="py-1.5">{p.talked}</td>
                        <td className="py-1.5">{p.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="text-[11px] text-sky-text/50 mt-3">Cuenta lo registrado en “Notas y llamadas” de cada lead durante el periodo.</p>
            </section>
            <BarList title="Resultado de llamadas y notas" rows={stats.byOutcome} total={stats.entries.length} />
          </div>
        </div>
      )}
    </section>
  );
}
