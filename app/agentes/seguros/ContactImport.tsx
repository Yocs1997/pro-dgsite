"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Undo2, Users, X } from "lucide-react";
import { contactListsForImport, importContactsAsLeads, previewContactImport, undoContactImport } from "../lead-import-actions";
import type { InsuranceLead } from "@/app/lib/server/insurance";
import { SERVICES } from "./status";

// Leads → "Importar contactos": pick contact lists, see what would happen (new leads, people
// merged because they share an email or phone, people who are already leads), then create them.

type Preview = { contacts: number; merged: number; already: number; toCreate: number; total: number; sample: string[]; mergedSample: string[] };

export default function ContactImport({ onCreated, onUndone, onClose }: { onCreated: (leads: InsuranceLead[]) => void; onUndone: (ids: string[]) => void; onClose: () => void }) {
  const [lists, setLists] = useState<{ name: string; count: number }[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [service, setService] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "import" | "undo">("");
  const [progress, setProgress] = useState<{ done: number; total: number; created: number } | null>(null);
  const [result, setResult] = useState<{ batch: string; created: number; skipped: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    contactListsForImport().then((r) => (r.ok ? setLists(r.lists) : setMsg({ ok: false, text: r.error })));
  }, []);

  const toggle = (n: string) => {
    setChosen((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));
    setPreview(null);
    setResult(null);
  };

  const review = async () => {
    setBusy("preview");
    setMsg(null);
    const r = await previewContactImport(chosen);
    setBusy("");
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setPreview(r);
  };

  const run = async () => {
    if (!preview || !window.confirm(`¿Crear ${preview.toCreate} leads nuevos de ${chosen.join(", ")}? No se envía ningún correo ni aviso.`)) return;
    const batch = `imp-${Date.now().toString(36)}`;
    setBusy("import");
    setMsg(null);
    let offset: number | null = 0;
    let created = 0;
    let skipped = 0;
    setProgress({ done: 0, total: preview.total, created: 0 });
    while (offset !== null) {
      const r = await importContactsAsLeads(chosen, service, batch, offset);
      if (!r.ok) {
        setMsg({ ok: false, text: `Se detuvo: ${r.error} (se crearon ${created} antes del error; puedes volver a intentarlo sin duplicar).` });
        break;
      }
      created += r.created.length;
      skipped += r.skipped;
      onCreated(r.created);
      offset = r.next;
      setProgress({ done: offset ?? r.total, total: r.total, created });
    }
    setBusy("");
    setResult({ batch, created, skipped });
    setPreview(null);
  };

  const undo = async () => {
    if (!result || !window.confirm(`¿Deshacer esta importación? Se borran los ${result.created} leads creados, menos los que ya alguien trabajó.`)) return;
    setBusy("undo");
    const r = await undoContactImport(result.batch);
    setBusy("");
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    onUndone(r.removed);
    setMsg({ ok: true, text: `Se borraron ${r.removed.length} leads.${r.kept ? ` Se quedaron ${r.kept} porque ya tienen notas o cambiaron de estado.` : ""}` });
    setResult(null);
  };

  return (
    <section className="mt-6 rounded-2xl border border-sky-400/40 p-5" style={{ background: "rgba(56,189,248,0.07)" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-bold text-xl flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-300" /> Convertir contactos en leads
        </h2>
        <button type="button" onClick={onClose} disabled={busy === "import"} className="p-2 rounded-full hover:bg-white/10 text-sky-text/70" title="Cerrar">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-sky-text/65 mt-1 max-w-3xl">
        Elige listas de Correo → Contactos. Cada persona se crea una sola vez: si dos contactos tienen el mismo correo o el mismo teléfono, quedan en un solo lead, y
        quien ya es lead (por correo o teléfono) se salta. No se envían correos ni avisos de Telegram.
      </p>

      {!lists && !msg && (
        <p className="mt-4 flex items-center gap-2 text-sm text-sky-text/70">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando listas…
        </p>
      )}
      {lists && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => {
              const on = chosen.includes(l.name);
              return (
                <label key={l.name} className={"flex items-center gap-2 px-4 py-2 rounded-full text-sm cursor-pointer " + (on ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/85")}>
                  <input type="checkbox" className="accent-white" checked={on} onChange={() => toggle(l.name)} disabled={busy !== ""} />
                  {l.name} <span className="opacity-70">({l.count})</span>
                </label>
              );
            })}
            {lists.length === 0 && <p className="text-sm text-sky-text/70">Aún no hay listas de contactos.</p>}
          </div>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-sky-text/80">Servicio que les interesa (opcional)</span>
            <select value={service} onChange={(e) => setService(e.target.value)} disabled={busy !== ""} className="rounded-xl border border-[#7cc4ff40] bg-[#0F3470] px-3 py-2 text-sm">
              <option value="">Sin especificar</option>
              {SERVICES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div>
            <button type="button" onClick={review} disabled={!chosen.length || busy !== ""} className="flex items-center gap-2 px-5 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm font-semibold disabled:opacity-50">
              {busy === "preview" && <Loader2 className="w-4 h-4 animate-spin" />} Revisar antes de crear
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm flex flex-col gap-2">
          <p>
            <b>{preview.contacts}</b> contactos en las listas elegidas = <b>{preview.total}</b> personas
            {preview.merged > 0 && <> ({preview.merged} contactos repetidos por correo o teléfono se juntan)</>}.
          </p>
          <p>
            Ya son leads: <b>{preview.already}</b> (se saltan) · Leads nuevos: <b className="text-emerald-300">{preview.toCreate}</b>
          </p>
          {preview.sample.length > 0 && <p className="text-xs text-sky-text/65">Por ejemplo: {preview.sample.join(", ")}{preview.toCreate > preview.sample.length ? "…" : ""}</p>}
          {preview.mergedSample.length > 0 && <p className="text-xs text-sky-text/65">Se juntan: {preview.mergedSample.join(" · ")}</p>}
          <div className="pt-1">
            <button type="button" onClick={run} disabled={!preview.toCreate || busy !== ""} className="flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold disabled:opacity-50">
              Crear {preview.toCreate} leads
            </button>
          </div>
        </div>
      )}

      {progress && busy === "import" && (
        <div className="mt-4">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
          <p className="text-xs text-sky-text/70 mt-1.5">
            {progress.done} de {progress.total} personas revisadas · {progress.created} leads creados…
          </p>
        </div>
      )}

      {result && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>
            Listo: {result.created} leads creados{result.skipped ? `, ${result.skipped} ya eran leads` : ""}. Aparecen con la etiqueta “Lista”.
          </span>
          {result.created > 0 && (
            <button type="button" onClick={undo} disabled={busy !== ""} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-xs">
              {busy === "undo" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />} Deshacer
            </button>
          )}
        </div>
      )}
      {msg && (
        <p className={"mt-3 flex items-start gap-2 text-sm " + (msg.ok ? "text-emerald-300" : "text-red-200")}>
          {!msg.ok && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />} {msg.text}
        </p>
      )}
    </section>
  );
}
