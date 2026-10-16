"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ListChecks, Loader2, Upload, X } from "lucide-react";
import { applyServiceFill, previewServiceFill } from "../service-fill-actions";

// Leads → "Completar servicio": load a list of "email;phone;service" lines (made from Orion),
// see what it would change, then apply it. Only empty services are filled unless asked.

type Plan = {
  rows: number;
  skipped: number;
  leadsMatched: number;
  leadsToChange: number;
  leadsKept: number;
  contactsFound: number;
  contactsToChange: number;
  sample: { code: string; name: string; from: string; to: string }[];
};

export default function ServiceFill({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [done, setDone] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "apply">("");
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const lines = text.split(/\r?\n/).filter((l) => l.trim()).length;

  const review = async () => {
    setBusy("preview");
    setErr(null);
    setDone(null);
    const r = await previewServiceFill(text, overwrite);
    setBusy("");
    if (!r.ok) return setErr(r.error);
    setPlan(r.plan);
  };

  const apply = async () => {
    if (!plan || !window.confirm(`¿Poner el servicio en ${plan.leadsToChange} leads y ${plan.contactsToChange} contactos?`)) return;
    setBusy("apply");
    setErr(null);
    const r = await applyServiceFill(text, overwrite);
    setBusy("");
    if (!r.ok) return setErr(r.error);
    setDone(r.plan);
    setPlan(null);
  };

  return (
    <section className="mt-6 rounded-2xl border border-amber-400/40 p-5" style={{ background: "rgba(251,191,36,0.06)" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-bold text-xl flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-amber-200" /> Completar el servicio de leads y contactos
        </h2>
        <button type="button" onClick={onClose} disabled={busy !== ""} className="p-2 rounded-full hover:bg-white/10 text-sky-text/70" title="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-sky-text/65 mt-1 max-w-3xl">
        Sube la lista que se sacó de Orion (una línea por persona: <span className="font-mono">correo;teléfono;servicio</span>). Los leads se encuentran por
        correo o teléfono y los contactos por correo. Solo se llena el servicio que está vacío, a menos que marques reemplazar. No se envía nada a nadie.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== ""} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm font-semibold">
          <Upload className="w-4 h-4" /> {fileName ? "Cambiar archivo" : "Subir la lista"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              setText(await f.text());
              setFileName(f.name);
              setPlan(null);
              setDone(null);
            }
            e.target.value = "";
          }}
        />
        {fileName && (
          <span className="text-sm text-sky-text/80">
            {fileName} · {lines} líneas
          </span>
        )}
        <label className="flex items-center gap-2 text-sm text-sky-text/80 ml-2">
          <input type="checkbox" checked={overwrite} onChange={(e) => (setOverwrite(e.target.checked), setPlan(null))} className="accent-amber-300" />
          Reemplazar el servicio que ya tienen
        </label>
        <button type="button" onClick={review} disabled={!text.trim() || busy !== ""} className="flex items-center gap-2 px-5 py-2 rounded-full bg-electric hover:bg-electric-light text-sm font-semibold disabled:opacity-50">
          {busy === "preview" && <Loader2 className="w-4 h-4 animate-spin" />} Revisar
        </button>
      </div>

      {plan && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm flex flex-col gap-2">
          <p>
            <b>{plan.rows}</b> personas en la lista{plan.skipped ? ` (${plan.skipped} líneas no se pudieron leer)` : ""}.
          </p>
          <p>
            Leads encontrados: <b>{plan.leadsMatched}</b> · se les pone servicio: <b className="text-emerald-300">{plan.leadsToChange}</b>
            {plan.leadsKept > 0 && <> · ya tenían uno y se dejan igual: {plan.leadsKept}</>}
          </p>
          <p>
            Contactos encontrados: <b>{plan.contactsFound}</b> · se les pone servicio: <b className="text-emerald-300">{plan.contactsToChange}</b>
          </p>
          {plan.sample.length > 0 && (
            <ul className="text-xs text-sky-text/70 list-disc pl-5">
              {plan.sample.map((s) => (
                <li key={s.code}>
                  {s.code} {s.name}: {s.from} → <span className="text-white">{s.to}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="pt-1">
            <button type="button" onClick={apply} disabled={busy !== "" || (!plan.leadsToChange && !plan.contactsToChange)} className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-50">
              {busy === "apply" && <Loader2 className="w-4 h-4 animate-spin" />} Aplicar a {plan.leadsToChange} leads y {plan.contactsToChange} contactos
            </button>
          </div>
        </div>
      )}

      {done && (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Listo: servicio puesto en {done.leadsToChange} leads y {done.contactsToChange} contactos.
          <button type="button" onClick={() => window.location.reload()} className="ml-auto px-3 py-1.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-xs">
            Recargar para verlo
          </button>
        </p>
      )}
      {err && (
        <p className="mt-3 flex items-start gap-2 text-sm text-red-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
        </p>
      )}
    </section>
  );
}
