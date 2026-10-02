"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, NotebookPen, Plus } from "lucide-react";
import { NOTE_OUTCOMES, dayLabel, outcomeLabel, todayIn, type FollowUp, type LeadNote } from "@/app/lib/lead-notes";

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

/** "Volver a llamar" badge: red when it is for today or already late. */
export function FollowUpBadge({ followUp }: { followUp?: FollowUp | null }) {
  if (!followUp) return null;
  const today = todayIn();
  const late = followUp.date < today;
  const now = followUp.date === today;
  return (
    <span
      suppressHydrationWarning
      className={"flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold " + (late || now ? "bg-red-500/25 text-red-100" : "bg-sky-500/20 text-sky-100")}
      title={followUp.note || "Volver a llamar"}
    >
      <BellRing className="w-3.5 h-3.5" /> {now ? "Llamar hoy" : late ? `Llamada atrasada (${dayLabel(followUp.date)})` : `Llamar el ${dayLabel(followUp.date)}`}
    </span>
  );
}

const TONE: Record<string, string> = {
  hablamos: "bg-emerald-500/20 text-emerald-200",
  "no-contesto": "bg-amber-400/20 text-amber-100",
  buzon: "bg-amber-400/20 text-amber-100",
  volver: "bg-sky-500/20 text-sky-100",
  equivocado: "bg-red-500/20 text-red-200",
};

type AddResult = { ok: true; note: LeadNote; followUp: FollowUp | null } | { ok: false; error: string };

const tomorrow = () => new Date(Date.now() + 86400000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

/** Call log for one lead: pick what happened, write a note, see the history (newest first).
 *  "Volver a llamar" asks for a date and leaves a reminder on the lead. */
export default function LeadNotes({
  initial,
  followUp,
  add,
  done,
  onChange,
}: {
  initial: LeadNote[];
  followUp: FollowUp | null;
  add: (outcome: string, text: string, due?: string) => Promise<AddResult>;
  done: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onChange: (log: LeadNote[], followUp: FollowUp | null) => void; // the lead card keeps both
}) {
  const [outcome, setOutcome] = useState("nota");
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const notes = initial;

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await add(outcome, text, outcome === "volver" ? due || tomorrow() : undefined);
      if (!r.ok) return setErr(r.error);
      onChange([...notes, r.note], r.followUp);
      setText("");
      setOutcome("nota");
      setDue("");
    });

  const markDone = () =>
    start(async () => {
      setErr(null);
      const r = await done();
      if (!r.ok) return setErr(r.error);
      onChange(notes, null);
    });

  const field = "rounded-xl border border-[#7cc4ff40] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#33aaff]";
  return (
    <div className="rounded-xl bg-black/20 p-4">
      <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#7cc4ff] mb-3">
        <NotebookPen className="w-3.5 h-3.5" /> Notas y llamadas{notes.length ? ` (${notes.length})` : ""}
      </p>
      {followUp && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm">
          <FollowUpBadge followUp={followUp} />
          {followUp.note && <span className="text-sky-text/80 flex-1 min-w-40">{followUp.note}</span>}
          <button type="button" onClick={markDone} disabled={pending} className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-xs">
            <Check className="w-3.5 h-3.5" /> Hecho
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-col gap-2">
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)} className={field} aria-label="Qué pasó">
            {NOTE_OUTCOMES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          {outcome === "volver" && (
            <label className="flex items-center gap-2 text-xs text-sky-text/75">
              ¿Cuándo?
              <input
                type="date"
                value={due || tomorrow()}
                min={todayIn()}
                onChange={(e) => setDue(e.target.value)}
                className={field + " [color-scheme:dark]"}
                aria-label="Fecha para volver a llamar"
              />
            </label>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
          }}
          rows={2}
          placeholder={outcome === "nota" ? "Escribe una nota…" : outcome === "volver" ? "Para qué llamar (opcional)" : "Detalles de la llamada (opcional)"}
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
      {outcome === "volver" && <p className="mt-2 text-[11px] text-sky-text/55">Ese día en la mañana llega un recordatorio por Telegram, y se repite cada mañana hasta que registres la llamada o toques “Hecho”.</p>}
      {err && <p className="mt-2 text-xs text-red-200">{err}</p>}
      {notes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {[...notes].reverse().map((n) => (
            <li key={n.at + n.by} className="text-sm border-t border-white/5 pt-2">
              <p className="flex flex-wrap items-center gap-2 text-xs text-sky-text/60">
                <span className={"px-2 py-0.5 rounded-full font-medium " + (TONE[n.outcome] ?? "bg-white/10 text-sky-text/80")}>
                  {outcomeLabel(n.outcome)}
                  {n.due ? ` · ${dayLabel(n.due)}` : ""}
                </span>
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
