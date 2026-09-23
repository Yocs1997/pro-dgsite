"use client";

import { useMemo, useState } from "react";
import {
  Zap,
  ArrowLeft,
  Search,
  ChevronDown,
  Phone,
  StickyNote,
  User,
  Copy,
  Check,
  Printer,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { updateQuoteStatus } from "../quote-actions";

type Status = "nueva" | "en_proceso" | "facturada" | "cancelada";

export type InboxQuote = {
  id: string;
  code: string;
  when: string;
  status: Status;
  agent: string;
  client: { name: string; phone: string; notes: string };
  items: { id: string; name: string; qty: number; sale: number; agent: number; cost?: number }[];
  totals: { client: number; toPro: number; agentEarn: number; cost?: number; proEarn?: number };
};

const STATUS: Record<Status, { label: string; cls: string }> = {
  nueva: { label: "Nueva", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40" },
  en_proceso: { label: "En proceso", cls: "bg-amber-500/20 text-amber-200 border-amber-400/40" },
  facturada: { label: "Facturada", cls: "bg-sky-500/20 text-sky-200 border-sky-400/40" },
  cancelada: { label: "Cancelada", cls: "bg-white/10 text-white/60 border-white/20" },
};
const ORDER: Status[] = ["nueva", "en_proceso", "facturada", "cancelada"];

function money(n: number) {
  const sign = n < 0 ? "-" : "";
  const [int, dec] = Math.abs(Math.round(n * 100) / 100).toFixed(2).split(".");
  return `${sign}US$${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

const glass = { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" } as const;

function Line({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-sky-text/65">{label}</span>
      <span className={"font-mono font-bold " + (cls ?? "text-white")}>{value}</span>
    </div>
  );
}

function QuoteCard({
  q,
  isAdmin,
  onStatus,
}: {
  q: InboxQuote;
  isAdmin: boolean;
  onStatus: (s: Status) => void;
}) {
  const [open, setOpen] = useState(q.status === "nueva");
  const [copied, setCopied] = useState(false);

  const invoiceText = () => {
    const lines = q.items.map((i) => `• ${i.qty} x ${i.name} — ${money(i.sale)} c/u = ${money(i.sale * i.qty)}`);
    const header = [
      `Cotización ${q.code} — ${q.when}`,
      `Cliente: ${q.client.name}`,
      q.client.phone ? `Teléfono: ${q.client.phone}` : null,
      q.client.notes ? `Notas: ${q.client.notes}` : null,
      `Agente: ${q.agent}`,
    ].filter(Boolean);
    return [...header, "", ...lines, "", `Total: ${money(q.totals.client)}`].join("\n");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invoiceText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const print = () => {
    setOpen(true);
    const el = document.querySelector(`[data-quote="${q.id}"]`);
    el?.classList.add("print-me");
    // wait a frame so the card is expanded before printing
    requestAnimationFrame(() => {
      window.print();
      el?.classList.remove("print-me");
    });
  };

  return (
    <article data-quote={q.id} className="quote-card rounded-2xl border border-[#7cc4ff33] overflow-hidden" style={glass}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 p-5 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-mono font-bold text-[#7cc4ff]">{q.code}</span>
        <span className={"px-2.5 py-0.5 rounded-full border text-xs font-semibold " + STATUS[q.status].cls}>
          {STATUS[q.status].label}
        </span>
        <span className="font-display font-bold text-lg flex-1 min-w-40 truncate">{q.client.name}</span>
        {isAdmin && (
          <span className="flex items-center gap-1 text-sm text-sky-text/70">
            <User className="w-3.5 h-3.5" /> {q.agent}
          </span>
        )}
        <span className="text-xs text-sky-text/60">{q.when}</span>
        <span className="font-mono font-bold">{money(q.totals.client)}</span>
        <ChevronDown className={"w-4 h-4 text-sky-text/60 transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="px-5 pb-5 grid gap-5 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-4">
            {(q.client.phone || q.client.notes) && (
              <div className="flex flex-col gap-1.5 text-sm">
                {q.client.phone && (
                  <a href={`tel:${q.client.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-[#7cc4ff] hover:underline w-fit">
                    <Phone className="w-4 h-4" /> {q.client.phone}
                  </a>
                )}
                {q.client.notes && (
                  <p className="flex items-start gap-2 text-sky-text/80 whitespace-pre-wrap">
                    <StickyNote className="w-4 h-4 mt-0.5 shrink-0" /> {q.client.notes}
                  </p>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-black/20 text-xs font-mono uppercase tracking-wider text-sky-text/60">
                  <tr>
                    <th className="text-left p-2.5">Cant.</th>
                    <th className="text-left p-2.5">Producto</th>
                    <th className="text-right p-2.5">Venta c/u</th>
                    <th className="text-right p-2.5 no-print">Agente c/u</th>
                    {isAdmin && <th className="text-right p-2.5 no-print">Costo c/u</th>}
                    <th className="text-right p-2.5">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {q.items.map((i) => (
                    <tr key={i.id} className="border-t border-white/5">
                      <td className="p-2.5 font-mono">{i.qty}</td>
                      <td className="p-2.5">{i.name}</td>
                      <td className="p-2.5 text-right font-mono">{money(i.sale)}</td>
                      <td className="p-2.5 text-right font-mono text-white/70 no-print">{money(i.agent)}</td>
                      {isAdmin && <td className="p-2.5 text-right font-mono text-white/70 no-print">{money(i.cost ?? 0)}</td>}
                      <td className="p-2.5 text-right font-mono font-bold">{money(i.sale * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-black/20 p-4 flex flex-col gap-1.5">
              <Line label="Cliente paga" value={money(q.totals.client)} />
              <div className="no-print flex flex-col gap-1.5">
                <Line label={isAdmin ? "Agente paga a Pro-DG" : "Pagas a Pro-DG"} value={money(q.totals.toPro)} cls="text-white/70" />
                {isAdmin && <Line label="Costo de compra" value={money(q.totals.cost ?? 0)} cls="text-white/70" />}
                <Line label={isAdmin ? "Ganancia agente" : "Tu ganancia"} value={money(q.totals.agentEarn)} cls="text-emerald-300" />
                {isAdmin && <Line label="Ganancia Pro-DG" value={money(q.totals.proEarn ?? 0)} cls="text-[#7cc4ff]" />}
              </div>
            </div>

            {isAdmin && (
              <label className="flex flex-col gap-1.5 no-print">
                <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Estado</span>
                <select
                  value={q.status}
                  onChange={(e) => onStatus(e.target.value as Status)}
                  className="rounded-xl border border-[#7cc4ff40] bg-[#0F3470] px-3 py-2.5 text-white outline-none focus:border-[#33aaff]"
                >
                  {ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS[s].label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex gap-2 no-print">
              <button
                type="button"
                onClick={copy}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-electric hover:bg-electric-light py-2.5 text-sm font-semibold"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copiada" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={print}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10 py-2.5 text-sm font-semibold"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function QuotesInbox({
  quotes: initial,
  isAdmin,
  userName,
  error,
}: {
  quotes: InboxQuote[];
  isAdmin: boolean;
  userName: string;
  error: string | null;
}) {
  const [quotes, setQuotes] = useState(initial);
  const [filter, setFilter] = useState<Status | "todas">("todas");
  const [q, setQ] = useState("");
  const [saveError, setSaveError] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todas: quotes.length };
    for (const s of ORDER) c[s] = quotes.filter((x) => x.status === s).length;
    return c;
  }, [quotes]);

  const shown = quotes.filter(
    (x) =>
      (filter === "todas" || x.status === filter) &&
      (!q.trim() ||
        `${x.code} ${x.client.name} ${x.agent} ${x.client.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
  );

  const changeStatus = async (id: string, status: Status) => {
    const prev = quotes;
    setQuotes((list) => list.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await updateQuoteStatus(id, status);
    if (!res.ok) {
      setQuotes(prev);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    }
  };

  const openTotal = quotes
    .filter((x) => x.status === "nueva" || x.status === "en_proceso")
    .reduce((s, x) => s + (isAdmin ? x.totals.proEarn ?? 0 : x.totals.agentEarn), 0);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-me, .print-me * { visibility: visible !important; color: #000 !important; background: transparent !important; }
          .print-me { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
          .print-me .no-print { display: none !important; }
        }
      `}</style>

      <nav className="sticky top-0 z-50 border-b border-[#7cc4ff20] backdrop-blur-xl no-print" style={{ background: "rgba(11,43,94,0.8)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="/agentes" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">
              Pro<span className="text-electric-light">-DG</span>
            </span>
          </a>
          <a href="/agentes" className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-sky-text/80 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
            Volver a la calculadora
          </a>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">
          {isAdmin ? "Bandeja de cotizaciones" : `Cotizaciones de ${userName}`}
        </p>
        <h1 className="font-display font-black text-3xl md:text-5xl mt-2">
          {isAdmin ? "Cotizaciones" : "Mis cotizaciones"}
        </h1>
        {quotes.length > 0 && (
          <p className="text-sky-text/75 mt-2">
            {isAdmin ? "Ganancia Pro-DG en cotizaciones abiertas: " : "Tu ganancia en cotizaciones abiertas: "}
            <span className="font-mono font-bold text-white">{money(openTotal)}</span>
          </p>
        )}

        {error && (
          <p className="mt-6 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-amber-100">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}
        {saveError && (
          <p role="alert" className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-3 text-red-100">
            No se pudo guardar el cambio de estado. Inténtalo de nuevo.
          </p>
        )}

        <div className="mt-8 flex flex-col md:flex-row gap-3 md:items-center justify-between no-print">
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
          <label className="flex items-center gap-2 rounded-full border border-[#7cc4ff40] bg-white/5 px-4 md:w-72">
            <Search className="w-4 h-4 text-[#7cc4ff]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAdmin ? "Buscar cliente, agente, código" : "Buscar cliente o código"}
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/35"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {shown.map((x) => (
            <QuoteCard key={x.id} q={x} isAdmin={isAdmin} onStatus={(s) => changeStatus(x.id, s)} />
          ))}
          {!error && shown.length === 0 && (
            <div className="text-center py-16 text-sky-text/70">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-60" />
              {quotes.length === 0
                ? isAdmin
                  ? "Aún no hay cotizaciones. Aparecerán aquí cuando un agente envíe una."
                  : "Aún no has enviado cotizaciones."
                : "No hay cotizaciones con este filtro."}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
