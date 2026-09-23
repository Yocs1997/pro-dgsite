"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  Minus,
  Check,
  LogOut,
  Wallet,
  Copy,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Users,
  Store,
  Trash2,
} from "lucide-react";
import { logout } from "./actions";

export type PortalItem = {
  id: string;
  name: string;
  detail?: string;
  image: string;
  tag: string;
  agent: number; // price the agent pays Pro-DG
  suggested: number; // suggested final price for the client
  cost?: number; // purchase cost (admin only)
};

type Line = { qty: number; price: string };
type Mode = "agent" | "direct";

const round2 = (n: number) => Math.round(n * 100) / 100;

function money(n: number) {
  const sign = n < 0 ? "-" : "";
  const [int, dec] = Math.abs(round2(n)).toFixed(2).split(".");
  return `${sign}US$${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

function cn(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(" ");
}

const glass = { background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" } as const;

// ─── Price row helper ────────────────────────────────────────────────────────

function Row({ label, value, tone }: { label: string; value: string; tone?: "good" | "muted" | "pro" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-sky-text/65">{label}</span>
      <span
        className={cn(
          "font-mono font-bold",
          tone === "good" && "text-emerald-300",
          tone === "pro" && "text-[#7cc4ff]",
          tone === "muted" && "text-white/70",
          !tone && "text-white"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Product card ────────────────────────────────────────────────────────────

function ItemCard({
  item,
  line,
  isAdmin,
  mode,
  onChange,
}: {
  item: PortalItem;
  line: Line | undefined;
  isAdmin: boolean;
  mode: Mode;
  onChange: (l: Line | undefined) => void;
}) {
  const qty = line?.qty ?? 0;
  const selected = qty > 0;
  const priceNum = line ? parseFloat(line.price) : item.suggested;
  const sale = Number.isFinite(priceNum) ? priceNum : 0;
  const edited = line && round2(sale) !== item.suggested;

  const agentUnit = sale - item.agent;
  const proUnit = isAdmin && item.cost !== undefined ? (mode === "direct" ? sale : item.agent) - item.cost : 0;
  const below = mode === "agent" ? sale < item.agent : isAdmin && item.cost !== undefined && sale < item.cost;

  const setQty = (q: number) => {
    const n = Math.max(0, Math.min(999, q));
    onChange(n === 0 ? undefined : { qty: n, price: line?.price ?? item.suggested.toFixed(2) });
  };

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col",
        selected ? "border-[#33aaff] shadow-[0_0_30px_rgba(0,150,255,0.3)]" : "border-[#7cc4ff26] hover:border-[#7cc4ff55]"
      )}
      style={glass}
    >
      <button
        type="button"
        onClick={() => setQty(selected ? 0 : 1)}
        className="relative aspect-16/9 w-full cursor-pointer"
        style={{ background: "radial-gradient(ellipse at 50% 40%, #f4f8ff 0%, #d9e8fb 60%, #bcd6f5 100%)" }}
        aria-label={selected ? `Quitar ${item.name}` : `Agregar ${item.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-contain p-3" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-[#0B2B5E] text-[#7cc4ff]">
          {item.tag}
        </span>
        {selected && (
          <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-electric flex items-center justify-center">
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </span>
        )}
      </button>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <h3 className="font-display font-bold text-lg leading-tight">{item.name}</h3>
          {item.detail && <p className="text-xs text-sky-text/60 mt-1 leading-relaxed">{item.detail}</p>}
        </div>

        <div className="flex flex-col gap-1.5 pt-3 border-t border-[#7cc4ff1a]">
          {isAdmin && item.cost !== undefined && <Row label="Costo de compra" value={money(item.cost)} tone="muted" />}
          {!(isAdmin && mode === "direct") && (
            <Row label={isAdmin ? "Precio a agentes" : "Tu precio"} value={money(item.agent)} tone="muted" />
          )}
          <Row label="Precio sugerido" value={money(item.suggested)} />
        </div>

        <div className="flex flex-col gap-1.5 rounded-xl bg-[#00000026] px-3 py-2.5">
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-text/50">Ganancia por unidad</span>
          {!(isAdmin && mode === "direct") && (
            <Row label={isAdmin ? "Agente" : "Tu ganancia"} value={money(agentUnit)} tone="good" />
          )}
          {isAdmin && <Row label="Pro-DG" value={money(proUnit)} tone="pro" />}
        </div>

        {selected ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-between rounded-full border border-[#33aaff80] bg-[#0096ff1f] flex-1">
                <button type="button" onClick={() => setQty(qty - 1)} className="w-9 h-9 flex items-center justify-center" aria-label="Menos">
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
                  className="w-12 bg-transparent text-center font-mono font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Cantidad"
                />
                <button type="button" onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center" aria-label="Más">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setQty(0)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sky-text/50 hover:text-red-300"
                aria-label="Quitar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-[#7cc4ff33] bg-[#ffffff0d] px-3 py-2">
              <span className="text-xs text-sky-text/60 whitespace-nowrap">Precio de venta</span>
              <span className="text-xs font-mono text-white/50 ml-auto">US$</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={line?.price ?? ""}
                onChange={(e) => onChange({ qty, price: e.target.value })}
                className="w-24 bg-transparent text-right font-mono font-bold outline-none"
                aria-label="Precio de venta por unidad"
              />
              {edited && (
                <button
                  type="button"
                  title="Volver al precio sugerido"
                  onClick={() => onChange({ qty, price: item.suggested.toFixed(2) })}
                  className="text-[#7cc4ff] hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </label>
            {below && (
              <p className="flex items-center gap-1.5 text-xs text-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                {mode === "agent" ? "Este precio está por debajo del precio de agente." : "Este precio está por debajo del costo."}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setQty(1)}
            className="flex items-center justify-center gap-1.5 rounded-full bg-electric hover:bg-electric-light py-2 text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Portal ──────────────────────────────────────────────────────────────────

export default function Portal({
  user,
  items,
}: {
  user: { name: string; role: "admin" | "agent" };
  items: PortalItem[];
}) {
  const isAdmin = user.role === "admin";
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [mode, setMode] = useState<Mode>("agent");
  const [copied, setCopied] = useState(false);

  const setLine = (id: string, l: Line | undefined) =>
    setLines((prev) => {
      const next = { ...prev };
      if (l) next[id] = l;
      else delete next[id];
      return next;
    });

  const selected = items
    .filter((i) => lines[i.id])
    .map((i) => {
      const l = lines[i.id];
      const p = parseFloat(l.price);
      return { item: i, qty: l.qty, sale: Number.isFinite(p) ? p : 0 };
    });

  const totals = useMemo(() => {
    let client = 0, toPro = 0, agentEarn = 0, cost = 0, proEarn = 0, units = 0;
    for (const { item, qty, sale } of selected) {
      units += qty;
      client += sale * qty;
      if (mode === "agent" || !isAdmin) {
        toPro += item.agent * qty;
        agentEarn += (sale - item.agent) * qty;
      }
      if (isAdmin && item.cost !== undefined) {
        cost += item.cost * qty;
        proEarn += ((mode === "direct" ? sale : item.agent) - item.cost) * qty;
      }
    }
    return { client, toPro, agentEarn, cost, proEarn, units };
  }, [selected, mode, isAdmin]);

  const copyQuote = async () => {
    const body = selected
      .map(({ item, qty, sale }) => `• ${qty} x ${item.name} — ${money(sale)} c/u = ${money(sale * qty)}`)
      .join("\n");
    const text = `Cotización Pro-DG\n\n${body}\n\nTotal: ${money(totals.client)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const headline = isAdmin ? totals.proEarn : totals.agentEarn;

  return (
    <>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[#7cc4ff20] backdrop-blur-xl" style={{ background: "rgba(11,43,94,0.8)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
              <Zap className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">
              Pro<span className="text-electric-light">-DG</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#7cc4ff40] text-xs font-mono text-[#7cc4ff]">
              {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {isAdmin ? "Administrador" : "Agente"}
            </span>
            <form action={logout}>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-sky-text/80 hover:text-white hover:bg-white/10 transition-colors">
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </form>
          </div>
        </div>
      </nav>

      <header className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-8">
        <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">
          {isAdmin ? "Panel de administración" : "Portal de agentes"}
        </p>
        <h1 className="font-display font-black text-3xl md:text-5xl mt-2">Hola, {user.name}</h1>
        <p className="text-sky-text/75 mt-2 max-w-2xl">
          {isAdmin
            ? "Selecciona productos para ver tu ganancia y la del agente en cada venta."
            : "Selecciona los productos que vendiste o vas a cotizar. Puedes ajustar el precio de venta y tu ganancia se calcula al instante."}
        </p>

        {isAdmin && (
          <div className="mt-6 inline-flex rounded-full border border-[#7cc4ff40] p-1" style={glass}>
            {([
              ["agent", "Venta por agente", Users],
              ["direct", "Venta directa", Store],
            ] as const).map(([m, label, Icon]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all",
                  mode === m ? "bg-electric text-white" : "text-sky-text/70 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-32 lg:pb-20 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              line={lines[item.id]}
              isAdmin={isAdmin}
              mode={mode}
              onChange={(l) => setLine(item.id, l)}
            />
          ))}
          {items.length === 0 && (
            <p className="text-sky-text/70">No hay precios configurados todavía.</p>
          )}
        </div>

        <aside id="resumen" className="lg:sticky lg:top-24">
          <div className="rounded-2xl border border-[#7cc4ff33] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-electric-light" />
                <h2 className="font-display font-bold text-xl">Resumen</h2>
              </div>
              {selected.length > 0 && (
                <button type="button" onClick={() => setLines({})} className="text-xs font-mono text-sky-text/60 hover:text-white">
                  Limpiar
                </button>
              )}
            </div>

            {selected.length === 0 ? (
              <p className="text-sm text-sky-text/70 py-6 text-center">Agrega productos para ver los cálculos.</p>
            ) : (
              <ul className="flex flex-col gap-2 mb-4 max-h-[35vh] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {selected.map(({ item, qty, sale }) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="truncate text-white/90">
                        <span className="font-mono text-[#7cc4ff]">{qty}×</span> {item.name}
                      </span>
                      <span className="font-mono">{money(sale * qty)}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            <div className="flex flex-col gap-2 pt-4 border-t border-[#7cc4ff26]">
              <Row label="Artículos" value={String(totals.units)} tone="muted" />
              <Row label="Cliente paga" value={money(totals.client)} />
              {isAdmin && <Row label="Costo de compra" value={money(totals.cost)} tone="muted" />}
              {(!isAdmin || mode === "agent") && (
                <Row label={isAdmin ? "Agente paga a Pro-DG" : "Pagas a Pro-DG"} value={money(totals.toPro)} tone="muted" />
              )}
              {isAdmin && mode === "agent" && <Row label="Ganancia del agente" value={money(totals.agentEarn)} tone="good" />}
            </div>

            <div className="mt-5 rounded-xl p-4 bg-[#0096ff1f] border border-[#33aaff55]">
              <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">
                {isAdmin ? "Ganancia Pro-DG" : "Tu ganancia"}
              </p>
              <motion.p
                key={round2(headline)}
                initial={{ scale: 1.06 }}
                animate={{ scale: 1 }}
                className={cn("font-display font-black text-4xl mt-1", headline < 0 ? "text-red-300" : "text-white glow-text")}
              >
                {money(headline)}
              </motion.p>
            </div>

            <button
              type="button"
              onClick={copyQuote}
              disabled={selected.length === 0}
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-electric hover:bg-electric-light disabled:bg-white/10 disabled:text-white/40 py-3.5 font-bold transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "¡Copiada!" : "Copiar cotización para el cliente"}
            </button>
            <p className="text-[11px] text-sky-text/50 text-center mt-2">
              La cotización copiada solo incluye precios de venta, no ganancias.
            </p>
          </div>
        </aside>
      </main>

      {selected.length > 0 && (
        <a
          href="#resumen"
          className="lg:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between px-5 py-4 rounded-2xl bg-electric glow-electric"
        >
          <span className="text-sm font-semibold">{isAdmin ? "Ganancia Pro-DG" : "Tu ganancia"}</span>
          <span className="font-display font-black text-xl">{money(headline)}</span>
        </a>
      )}
    </>
  );
}
