"use client";

import { useState, useTransition } from "react";
import { NotebookPen, Plus } from "lucide-react";
import { NOTE_OUTCOMES, outcomeLabel, type LeadNote } from "@/app/lib/lead-notes";

/** Turns http(s) addresses inside a text into links that open in a new tab. */
export function Linkify({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-[#7cc4ff] underline hover:text-white break-all">
            {p}
          </a>
        ) : (
          p
        )
      )}
    </>
  );
}

const when = (ts: number) => new Date(ts).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const TONE: Record<string, string> = {
  hablamos: "bg-emerald-500/20 text-emerald-200",
  "no-contesto": "bg-amber-400/20 text-amber-100",
  buzon: "bg-amber-400/20 text-amber-100",
  volver: "bg-sky-500/20 text-sky-100",
  equivocado: "bg-red-500/20 text-red-200",
};

type AddResult = { ok: true; note: LeadNote } | { ok: false; error: string };

/** Call log for one lead: pick what happened, write a note, see the history (newest first). */
export default function LeadNotes({ initial, add }: { initial: LeadNote[]; add: (outcome: string, text: string) => Promise<AddResult> }) {
  const [notes, setNotes] = useState(initial);
  const [outcome, setOutcome] = useState("nota");
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await add(outcome, text);
      if (!r.ok) return setErr(r.error);
      setNotes((n) => [...n, r.note]);
      setText("");
      setOutcome("nota");
    });

  const field = "rounded-xl border border-[#7cc4ff40] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#33aaff]";
  return (
    <div className="rounded-xl bg-black/20 p-4">
      <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#7cc4ff] mb-3">
        <NotebookPen className="w-3.5 h-3.5" /> Notas y llamadas{notes.length ? ` (${notes.length})` : ""}
      </p>
      <div className="flex flex-wrap items-start gap-2">
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={field} aria-label="Qué pasó">
          {NOTE_OUTCOMES.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
          }}
          rows={2}
          placeholder={outcome === "nota" ? "Escribe una nota…" : "Detalles de la llamada (opcional)"}
          className={field + " flex-1 min-w-56 resize-y"}
          aria-label="Nota"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || (outcome === "nota" && !text.trim())}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-electric hover:bg-electric-light disabled:opacity-50 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-red-200">{err}</p>}
      {notes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {[...notes].reverse().map((n) => (
            <li key={n.at + n.by} className="text-sm border-t border-white/5 pt-2">
              <p className="flex flex-wrap items-center gap-2 text-xs text-sky-text/60">
                <span className={"px-2 py-0.5 rounded-full font-medium " + (TONE[n.outcome] ?? "bg-white/10 text-sky-text/80")}>{outcomeLabel(n.outcome)}</span>
                <span suppressHydrationWarning>{when(n.at)}</span>
                <span>· {n.by}</span>
              </p>
              {n.text && (
                <p className="mt-1 whitespace-pre-wrap break-words">
                  <Linkify text={n.text} />
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
