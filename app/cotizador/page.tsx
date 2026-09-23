"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  Minus,
  Check,
  ShoppingCart,
  Trash2,
  MessageCircle,
  ArrowLeft,
  ArrowUpRight,
  Calculator,
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────────────────────

const WHATSAPP_NUMBER = "50557449428";

// A little brighter than the main site (#02112A)
const BG = "#0B2B5E";

type Product = {
  id: string;
  name: string;
  detail?: string;
  price: number;
  image: string;
  tag: string;
};

// Edit prices / products here.
const PRODUCTS: Product[] = [
  {
    id: "licencia-xolopos",
    name: "Licencia Sistema XoloPOS",
    detail: "Sistema de punto de venta para tu negocio.",
    price: 288.0,
    image: "/cotizador/licencia-xolopos.svg",
    tag: "Software",
  },
  {
    id: "combo-i5",
    name: "Computadora completa Core i5",
    detail:
      "CPU mini (Core i5, 8GB de RAM, 256GB disco sólido) - seminuevo, monitor 22\" - seminuevo, teclado y mouse USB (nuevos). Windows 11 + Office.",
    price: 364.93,
    image: "/cotizador/combo-i5.svg",
    tag: "Computadora",
  },
  {
    id: "combo-i3",
    name: "Computadora completa Core i3",
    detail:
      "CPU mini (Core i3, 8GB de RAM, 128GB disco sólido) - seminuevo, monitor 20\" - seminuevo, teclado y mouse USB (nuevos). Windows 11 + Office.",
    price: 262.36,
    image: "/cotizador/combo-i3.svg",
    tag: "Computadora",
  },
  {
    id: "impresora-80mm",
    name: "Impresora térmica 80mm nueva",
    price: 98.63,
    image: "/cotizador/impresora-80mm.svg",
    tag: "Hardware",
  },
  {
    id: "cajon-8",
    name: "Cajón de efectivo de 8 depósitos",
    price: 90.74,
    image: "/cotizador/cajon-8.svg",
    tag: "Hardware",
  },
  {
    id: "cajon-5",
    name: "Cajón de efectivo de 5 depósitos",
    price: 82.85,
    image: "/cotizador/cajon-5.svg",
    tag: "Hardware",
  },
  {
    id: "ups-600",
    name: "Batería UPS 600 HIKVision",
    price: 67.07,
    image: "/cotizador/ups-600.svg",
    tag: "Hardware",
  },
  {
    id: "lector-codigo",
    name: "Lector de código de barras",
    price: 39.45,
    image: "/cotizador/lector-codigo.svg",
    tag: "Hardware",
  },
  {
    id: "papel-80mm",
    name: "Rollo de papel térmico 80mm",
    detail: "Precio por rollo.",
    price: 2.17,
    image: "/cotizador/papel-80mm.svg",
    tag: "Insumos",
  },
];

// Deterministic formatting (same on server and browser)
function money(n: number) {
  const [int, dec] = n.toFixed(2).split(".");
  return `US$${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-[#7cc4ff20] backdrop-blur-xl"
      style={{ background: "rgba(11, 43, 94, 0.75)" }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-electric flex items-center justify-center glow-electric-sm">
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">
            Pro<span className="text-electric-light">-DG</span>
          </span>
        </a>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-sm text-sky-text/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Inicio
          </a>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-electric hover:bg-electric-light text-white text-sm font-semibold transition-all duration-200 glow-electric-sm hover:scale-105"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Product card ────────────────────────────────────────────────────────────

function ProductCard({
  product,
  qty,
  onSet,
  index,
}: {
  product: Product;
  qty: number;
  onSet: (q: number) => void;
  index: number;
}) {
  const selected = qty > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className={cn(
        "group relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col",
        selected
          ? "border-[#33aaff] shadow-[0_0_30px_rgba(0,150,255,0.35)]"
          : "border-[#7cc4ff26] hover:border-[#7cc4ff66]"
      )}
      style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}
    >
      {/* Image */}
      <button
        type="button"
        onClick={() => onSet(selected ? 0 : 1)}
        className="relative aspect-4/3 w-full overflow-hidden cursor-pointer"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, #f4f8ff 0%, #d9e8fb 60%, #bcd6f5 100%)",
        }}
        aria-label={selected ? `Quitar ${product.name}` : `Agregar ${product.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-[#0B2B5E] text-[#7cc4ff]">
          {product.tag}
        </span>
        <AnimatePresence>
          {selected && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-electric flex items-center justify-center shadow-lg"
            >
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Info */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex-1">
          <h3 className="font-display font-bold text-lg text-white leading-tight">
            {product.name}
          </h3>
          {product.detail && (
            <p className="text-sm text-sky-text/70 mt-1.5 leading-relaxed">
              {product.detail}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-3 border-t border-[#7cc4ff1a]">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#7cc4ff]">
              Precio
            </div>
            <div className="font-display font-black text-2xl text-white">
              {money(product.price)}
            </div>
          </div>

          {selected ? (
            <div className="flex items-center justify-between rounded-full border border-[#33aaff80] bg-[#0096ff1f]">
              <button
                type="button"
                onClick={() => onSet(qty - 1)}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-electric-light"
                aria-label="Menos"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  onSet(Number.isFinite(v) ? v : 0);
                }}
                className="w-16 bg-transparent text-center text-white font-mono font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="Cantidad"
              />
              <button
                type="button"
                onClick={() => onSet(qty + 1)}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-electric-light"
                aria-label="Más"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSet(1)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-electric hover:bg-electric-light text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function Summary({
  lines,
  total,
  count,
  onClear,
  onRemove,
}: {
  lines: { product: Product; qty: number }[];
  total: number;
  count: number;
  onClear: () => void;
  onRemove: (id: string) => void;
}) {
  const waText = useMemo(() => {
    const items = lines
      .map(
        ({ product, qty }) =>
          `• ${qty} x ${product.name} — ${money(product.price * qty)}`
      )
      .join("\n");
    return `Hola Pro-DG, quiero cotizar lo siguiente:\n\n${items}\n\nTotal estimado: ${money(total)}`;
  }, [lines, total]);

  return (
    <div
      id="resumen"
      className="rounded-2xl border border-[#7cc4ff33] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
      style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-electric-light" />
          <h2 className="font-display font-bold text-xl text-white">Tu cotización</h2>
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-mono text-sky-text/60 hover:text-white transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <div className="text-center py-10">
          <Calculator className="w-10 h-10 text-[#7cc4ff66] mx-auto mb-3" />
          <p className="text-sky-text/70 text-sm">
            Selecciona los productos que necesitas y aquí verás el total.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 mb-5 max-h-[45vh] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {lines.map(({ product, qty }) => (
              <motion.li
                key={product.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-12 shrink-0 rounded-lg bg-[#e6f0fc] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt="" className="w-full h-full object-contain p-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-tight truncate">{product.name}</p>
                  <p className="text-xs font-mono text-[#7cc4ff]">
                    {qty} × {money(product.price)}
                  </p>
                </div>
                <div className="text-sm font-mono font-bold text-white">
                  {money(product.price * qty)}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(product.id)}
                  className="text-sky-text/40 hover:text-red-300 transition-colors"
                  aria-label={`Quitar ${product.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="pt-5 border-t border-[#7cc4ff26]">
        <div className="flex items-center justify-between text-sm text-sky-text/70 mb-1">
          <span>Artículos</span>
          <span className="font-mono">{count}</span>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-sm font-mono uppercase tracking-widest text-[#7cc4ff]">Total</span>
          <motion.span
            key={total}
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            className="font-display font-black text-4xl text-white glow-text"
          >
            {money(total)}
          </motion.span>
        </div>

        <a
          href={count > 0 ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={count === 0}
          className={cn(
            "mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-full font-bold text-white transition-all duration-300",
            count > 0
              ? "bg-electric hover:bg-electric-light glow-electric hover:scale-[1.02]"
              : "bg-[#ffffff14] text-white/40 pointer-events-none"
          )}
        >
          <MessageCircle className="w-5 h-5" />
          Enviar cotización por WhatsApp
          <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CotizadorPage() {
  const [qty, setQty] = useState<Record<string, number>>({});

  const setItem = (id: string, q: number) =>
    setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.min(999, q)) }));

  const lines = PRODUCTS.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => ({
    product: p,
    qty: qty[p.id],
  }));
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500;700&display=swap');
        html, body { background-color: ${BG} !important; }
      `}</style>

      <div
        className="min-h-screen relative overflow-x-hidden"
        style={{
          backgroundColor: BG,
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(51,170,255,0.28), transparent 70%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0,150,255,0.18), transparent 70%)",
        }}
      >
        <div className="absolute inset-0 grid-lines opacity-70 pointer-events-none" />

        <Nav />

        {/* Header */}
        <header className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#7cc4ff55] bg-[#0096ff1f] mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-electric-light animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-[#7cc4ff] uppercase">
              Cotizador XoloPOS
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display font-black text-4xl md:text-6xl text-white leading-tight"
          >
            Arma tu <span className="text-electric-light glow-text">punto de venta</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-sky-text/80 text-lg max-w-2xl mx-auto mt-4"
          >
            Elige los equipos que necesitas, ajusta las cantidades y obtén tu total al instante.
            Cuando estés listo, envíanos tu cotización por WhatsApp.
          </motion.p>
        </header>

        {/* Content */}
        <main className="relative z-10 max-w-7xl mx-auto px-6 pb-32 lg:pb-24 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {PRODUCTS.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                qty={qty[p.id] ?? 0}
                onSet={(q) => setItem(p.id, q)}
              />
            ))}
          </div>

          <aside className="lg:sticky lg:top-24">
            <Summary
              lines={lines}
              total={total}
              count={count}
              onClear={() => setQty({})}
              onRemove={(id) => setItem(id, 0)}
            />
          </aside>
        </main>

        {/* Mobile total bar */}
        <AnimatePresence>
          {count > 0 && (
            <motion.a
              href="#resumen"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="lg:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between px-5 py-4 rounded-2xl bg-electric text-white glow-electric"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart className="w-4 h-4" />
                {count} {count === 1 ? "artículo" : "artículos"}
              </span>
              <span className="font-display font-black text-xl">{money(total)}</span>
            </motion.a>
          )}
        </AnimatePresence>

        <footer className="relative z-10 border-t border-[#7cc4ff1a] py-8 text-center">
          <p className="text-xs font-mono text-[#7cc4ff99]">
            © {new Date().getFullYear()} Pro-DG · Precios en dólares estadounidenses (US$)
          </p>
        </footer>
      </div>
    </>
  );
}
