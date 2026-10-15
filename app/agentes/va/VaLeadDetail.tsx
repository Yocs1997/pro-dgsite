"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Save, Trash2, X } from "lucide-react";
import { US_STATES } from "@/app/seguros/model";
import { QUESTIONS, VA_DISPOSITIONS, dispositionLabel, optionLabel } from "@/app/va-cash-out/model";
import { addVaNote, editVaLead, removeVaLead, setVaDisposition } from "./va-actions";
import type { VaRow } from "./VaDashboard";

// Everything about one VA lead, opened from the leads table: work it (disposition, notes),
// correct it (edit) or remove it (delete).

const RULED: Record<string, string> = { served: "Didn't serve", ownHome: "Doesn't own home", wantsCash: "Doesn't want cash out" };

function Info({ k, v }: { k: string; v?: string | number }) {
  if (v === undefined || v === "") return null;
  return (
    <div className="flex justify-between gap-4 py-1 text-sm border-b border-white/5 last:border-0">
      <span className="text-sky-text/60 shrink-0">{k}</span>
      <span className="text-right break-all min-w-0">{v}</span>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-black/20 p-4 min-w-0">
      <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff] mb-2">{title}</p>
      {children}
    </div>
  );
}

const field = "w-full rounded-lg border border-[#7cc4ff40] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-[#33aaff]";

export default function VaLeadDetail({ l, onChange, onDeleted }: { l: VaRow; onChange: (patch: Partial<VaRow>) => void; onDeleted: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ firstName: l.firstName, lastName: l.lastName, email: l.email, phone: l.phone, age: String(l.age || ""), state: l.state, answers: { ...l.answers } });

  const dispose = (d: string) =>
    start(async () => {
      setErr(null);
      const r = await setVaDisposition(l.id, d);
      if (!r.ok) return setErr(r.error);
      onChange({ disposition: r.disposition, dispositionLabel: dispositionLabel(r.disposition), dispositionBy: r.dispositionBy, dispositionWhen: r.dispositionAt ? new Date(r.dispositionAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "" });
    });

  const saveNote = () =>
    start(async () => {
      setErr(null);
      const r = await addVaNote(l.id, note);
      if (!r.ok) return setErr(r.error);
      onChange({ notes: [...l.notes, { ...r.note, when: new Date(r.note.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }] });
      setNote("");
    });

  const saveEdit = () =>
    start(async () => {
      setErr(null);
      const r = await editVaLead(l.id, f);
      if (!r.ok) return setErr(r.error);
      const c = r.lead.contact;
      onChange({
        firstName: c.firstName,
        lastName: c.lastName,
        name: `${c.firstName} ${c.lastName}`.trim(),
        email: c.email,
        phone: c.phone,
        age: c.age,
        state: c.state,
        answers: r.lead.answers,
        served: optionLabel("served", r.lead.answers.served),
        ownHome: optionLabel("ownHome", r.lead.answers.ownHome),
        wantsCash: optionLabel("wantsCash", r.lead.answers.wantsCash),
        status: r.lead.status,
        ruledOutBy: r.lead.disqualifiedFor.map((id) => RULED[id] ?? id),
        editedBy: r.lead.editedBy,
      });
      setEditing(false);
    });

  const del = () => {
    if (!window.confirm(`Delete ${l.code} (${l.name})? This can't be undone.`)) return;
    start(async () => {
      const r = await removeVaLead(l.id);
      if (!r.ok) return setErr(r.error);
      onDeleted();
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white/[0.02]">
      {/* Work the lead */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Box title="Disposition">
          <select value={l.disposition} onChange={(e) => dispose(e.target.value)} disabled={pending} className={field + " bg-[#0F3470]"} aria-label="Disposition">
            <option value="">Not worked yet</option>
            {VA_DISPOSITIONS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          {l.dispositionBy && (
            <p className="text-xs text-sky-text/55 mt-2">
              Set by {l.dispositionBy} · {l.dispositionWhen}
            </p>
          )}
        </Box>
        <Box title={`Notes (${l.notes.length})`}>
          <div className="flex flex-wrap gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && note.trim() && saveNote()}
              rows={2}
              placeholder="What happened on the call, next steps…"
              className={field + " flex-1 min-w-56 resize-y"}
            />
            <button type="button" onClick={saveNote} disabled={pending || !note.trim()} className="self-start flex items-center gap-1.5 px-4 py-2 rounded-full bg-electric hover:bg-electric-light disabled:opacity-50 text-sm font-semibold">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Add note
            </button>
          </div>
          {l.notes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {[...l.notes].reverse().map((n) => (
                <li key={n.at + n.by} className="text-sm border-t border-white/5 pt-2">
                  <p className="text-xs text-sky-text/55">
                    {n.when} · {n.by}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{n.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Box>
      </div>

      {/* Details or edit form */}
      {editing ? (
        <Box title="Edit lead">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                ["firstName", "First name"],
                ["lastName", "Last name"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["age", "Age"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex flex-col gap-1 text-xs text-sky-text/70">
                {label}
                <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={field} />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-xs text-sky-text/70">
              State
              <select value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} className={field + " bg-[#0F3470]"}>
                {US_STATES.map(([c, n]) => (
                  <option key={c} value={c}>
                    {n} ({c})
                  </option>
                ))}
              </select>
            </label>
            {QUESTIONS.map((q) => (
              <label key={q.id} className="flex flex-col gap-1 text-xs text-sky-text/70">
                {q.title}
                <select value={f.answers[q.id] ?? ""} onChange={(e) => setF({ ...f, answers: { ...f.answers, [q.id]: e.target.value } })} className={field + " bg-[#0F3470]"}>
                  <option value="">No answer</option>
                  {q.options.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="text-xs text-sky-text/55 mt-3">The status (qualified / not qualified / didn&apos;t finish) is worked out again from the answers.</p>
          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => setEditing(false)} disabled={pending} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button type="button" onClick={saveEdit} disabled={pending} className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-sm font-bold">
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
            </button>
          </div>
        </Box>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Box title="Contact">
            <Info k="Name" v={l.name} />
            <Info k="Phone" v={l.phone} />
            <Info k="Email" v={l.email || "—"} />
            <Info k="Age" v={l.age} />
            <Info k="State" v={l.state} />
            {l.editedBy && <Info k="Edited by" v={l.editedBy} />}
          </Box>
          <Box title="Answers">
            <Info k="Served" v={l.served || "—"} />
            <Info k="Owns home" v={l.ownHome || "—"} />
            <Info k="Wants cash out" v={l.wantsCash || "—"} />
            <Info k="Ruled out by" v={l.ruledOutBy.join(", ")} />
          </Box>
          <Box title="Timeline">
            <Info k="Started" v={l.when} />
            <Info k="Finished" v={l.completed || "Didn't finish"} />
            <Info k="Asked for call back" v={l.callbackAt} />
            <Info k="Consent given" v={l.consentWhen} />
          </Box>
          <Box title="Ad & tracking">
            <Info k="Campaign" v={l.campaignName} />
            <Info k="Ad set" v={l.adsetName} />
            <Info k="Ad" v={l.adName} />
            <Info k="Placement" v={l.placement} />
            <Info k="Source / medium" v={[l.source, l.medium].filter(Boolean).join(" / ")} />
            <Info k="Landing page" v={l.landingUrl} />
            <Info k="Referrer" v={l.referrer} />
            <Info k="IP" v={l.ip} />
            <Info k="Device" v={l.userAgent} />
          </Box>
        </div>
      )}

      {l.consentText && !editing && (
        <details className="text-xs text-sky-text/60">
          <summary className="cursor-pointer hover:text-white">Consent text the lead agreed to</summary>
          <p className="mt-2 leading-relaxed">{l.consentText}</p>
        </details>
      )}

      {err && <p className="text-sm text-red-200">{err}</p>}
      {!editing && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm font-semibold">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button type="button" onClick={del} disabled={pending} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-400/50 text-red-200 hover:bg-red-500/20 text-sm font-semibold">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
