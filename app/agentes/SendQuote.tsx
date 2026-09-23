"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, CheckCircle2, Loader2 } from "lucide-react";
import { submitQuote } from "./quote-actions";

type Line = { id: string; name: string; qty: number; sale: number };

const inputCls =
  "w-full rounded-xl border border-[#7cc4ff40] bg-[#ffffff0f] px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-[#33aaff]";

export default function SendQuote({
  lines,
  total,
  money,
  enabled,
  onSent,
}: {
  lines: Line[];
  total: number;
  money: (n: number) => string;
  enabled: boolean;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const send = () => {
    setError(null);
    start(async () => {
      const res = await submitQuote({
        client: { name, phone, notes },
        lines: lines.map((l) => ({ id: l.id, qty: l.qty, sale: l.sale })),
      });
      if (res.ok) {
        setSentCode(res.code);
        setName("");
        setPhone("");
        setNotes("");
        onSent();
      } else {
        setError(res.error);
      }
    });
  };

  const close = () => {
    setOpen(false);
    setSentCode(null);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={lines.length === 0 || !enabled}
        title={enabled ? undefined : "El envío de cotizaciones aún no está configurado"}
        className="mt-5 w-full flex items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/40 py-3.5 font-bold text-white transition-all"
      >
        <Send className="w-4 h-4" />
        Enviar cotización a Pro-DG
      </button>

      {mounted && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-end sm:items-center justify-center bg-black/60 p-4"
            onClick={(e) => e.target === e.currentTarget && !pending && close()}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-label="Enviar cotización"
              className="w-full max-w-lg rounded-2xl border border-[#7cc4ff40] p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: "#0F3470" }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-xl">
                  {sentCode ? "¡Cotización enviada!" : "Enviar cotización a Pro-DG"}
                </h2>
                <button type="button" onClick={close} disabled={pending} className="text-white/60 hover:text-white" aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {sentCode ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-300 mx-auto mb-3" />
                  <p className="text-lg">
                    Tu cotización <span className="font-mono font-bold text-[#7cc4ff]">{sentCode}</span> llegó a Pro-DG.
                  </p>
                  <p className="text-sm text-sky-text/70 mt-2">
                    Puedes ver su estado en <a href="/agentes/cotizaciones" className="text-[#7cc4ff] underline">Mis cotizaciones</a>.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-6 rounded-full bg-electric hover:bg-electric-light px-8 py-3 font-bold"
                  >
                    Listo
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl bg-black/20 p-3 text-sm">
                    {lines.map((l) => (
                      <div key={l.id} className="flex justify-between gap-3 py-0.5">
                        <span className="truncate">
                          <span className="font-mono text-[#7cc4ff]">{l.qty}×</span> {l.name}
                        </span>
                        <span className="font-mono">{money(l.sale * l.qty)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-white/10 mt-2 pt-2 font-bold">
                      <span>Total cliente</span>
                      <span className="font-mono">{money(total)}</span>
                    </div>
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Cliente / negocio *</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className={inputCls} placeholder="Ej. Farmacia San José" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Teléfono</span>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} inputMode="tel" className={inputCls} placeholder="Ej. 8888 8888" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Notas</span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1000}
                      rows={3}
                      className={inputCls + " resize-none"}
                      placeholder="Dirección de entrega, forma de pago, etc."
                    />
                  </label>

                  {error && (
                    <p role="alert" className="text-sm text-red-200 bg-red-500/15 border border-red-400/30 rounded-lg px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={send}
                    disabled={pending || !name.trim()}
                    className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-3.5 font-bold transition-all"
                  >
                    {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {pending ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}
