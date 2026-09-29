"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Play, Plus, Save, Send, Square, Trash2, Users } from "lucide-react";
import type { Audience, Lang, Sequence, Step } from "@/app/lib/server/sequences";
import type { CampaignStats } from "@/app/lib/server/mail-tracking";
import {
  createInsuranceSequence,
  deleteSequenceAction,
  enrollLists,
  runSequencesNow,
  saveSequenceAction,
  sendSequenceTest,
  stopEnrollment,
} from "../sequence-actions";

export type EnrollmentRow = {
  email: string;
  firstName: string;
  source: string;
  lang: Lang;
  status: "active" | "done" | "stopped";
  reason: string;
  sent: number;
  enrolled: string;
  next: string;
};

const input =
  "w-full rounded-xl border border-[#7cc4ff40] bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-[#33aaff]";
const card = "rounded-2xl border border-[#7cc4ff33] p-5 sm:p-6";
const btn = "flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50";
const primary = btn + " bg-electric hover:bg-electric-light";
const ghost = btn + " border border-[#7cc4ff40] text-sky-text/85 hover:text-white";

const AUDIENCE: Record<Audience, string> = {
  all: "Todos",
  uninsured: "Solo sin seguro o vencido",
  insured: "Solo con seguro (o sin dato)",
};
const STATUS: Record<EnrollmentRow["status"], { label: string; cls: string }> = {
  active: { label: "Activo", cls: "bg-sky-500/20 text-sky-200" },
  done: { label: "Terminó", cls: "bg-emerald-500/20 text-emerald-300" },
  stopped: { label: "Detenido", cls: "bg-white/10 text-sky-text/80" },
};

function Notice({ kind, children }: { kind: "ok" | "err" | "warn"; children: React.ReactNode }) {
  const cls =
    kind === "ok"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
      : kind === "err"
        ? "border-red-400/40 bg-red-500/15 text-red-100"
        : "border-amber-400/40 bg-amber-500/15 text-amber-100";
  const Icon = kind === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <div role={kind === "err" ? "alert" : "status"} className={"flex items-start gap-2 rounded-xl border px-4 py-3 text-sm " + cls}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" /> <div>{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-xs font-medium text-sky-text/75 mb-1.5">{children}</span>;
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex items-start gap-3 text-left">
      <span className={"mt-0.5 w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 " + (on ? "bg-emerald-500" : "bg-white/15")}>
        <span className={"block w-5 h-5 rounded-full bg-white transition-transform " + (on ? "translate-x-4" : "")} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-sky-text/65">{hint}</span>
      </span>
    </button>
  );
}

const pct = (n = 0, d = 0) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

function StepCard({
  step,
  index,
  stats,
  onChange,
  onRemove,
  seqId,
  dirty,
}: {
  step: Step;
  index: number;
  stats?: CampaignStats;
  onChange: (s: Step) => void;
  onRemove: () => void;
  seqId: string;
  dirty: boolean;
}) {
  const [lang, setLang] = useState<Lang>("es");
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends "subject" | "preview" | "body" | "button">(k: K, v: string) => onChange({ ...step, [k]: { ...step[k], [lang]: v } });
  const s = stats ?? {};
  const delivered = s.delivered ?? 0;

  const test = () =>
    start(async () => {
      setMsg(null);
      const r = await sendSequenceTest(seqId, step.id, testTo, lang);
      setMsg(r.ok ? { kind: "ok", text: `Prueba enviada a ${testTo}.` } : { kind: "err", text: r.error });
    });

  return (
    <div className={card + " flex flex-col gap-4"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-bold text-lg">Correo {index + 1}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-sky-text/75">
          <span>Enviados {s.sent ?? 0}</span>·<span>Abiertos {pct(s.opened, delivered)}</span>·<span>Clics {pct(s.clicked, delivered)}</span>·
          <span>Respuestas {s.replied ?? 0}</span>·<span>Bajas {s.unsubscribed ?? 0}</span>
        </div>
      </div>
      <div className="grid sm:grid-cols-[8rem_1fr_auto] gap-3 items-end">
        <label>
          <Label>Día</Label>
          <input className={input} type="number" min={0} max={90} value={step.day} onChange={(e) => onChange({ ...step, day: Number(e.target.value) })} />
        </label>
        <label>
          <Label>Para quién</Label>
          <select className={input} value={step.audience} onChange={(e) => onChange({ ...step, audience: e.target.value as Audience })}>
            {Object.entries(AUDIENCE).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#0B2B5E]">
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-1">
          {(["es", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={"px-4 py-3 rounded-xl text-sm font-bold " + (lang === l ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/80")}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <label>
        <Label>Asunto ({lang.toUpperCase()})</Label>
        <input className={input} value={step.subject[lang]} onChange={(e) => set("subject", e.target.value)} />
      </label>
      <label>
        <Label>Texto de vista previa ({lang.toUpperCase()})</Label>
        <input className={input} value={step.preview[lang]} onChange={(e) => set("preview", e.target.value)} />
      </label>
      <label>
        <Label>Mensaje ({lang.toUpperCase()})</Label>
        <textarea className={input + " min-h-72 font-mono text-sm leading-relaxed"} value={step.body[lang]} onChange={(e) => set("body", e.target.value)} />
      </label>
      <label>
        <Label>Texto del botón ({lang.toUpperCase()}) — vacío = sin botón</Label>
        <input className={input} value={step.button[lang]} onChange={(e) => set("button", e.target.value)} />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-56">
          <Label>Enviar prueba ({lang.toUpperCase()}, con datos de ejemplo)</Label>
          <input className={input} type="email" placeholder="tu@correo.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
        </label>
        <button type="button" className={ghost + " py-3"} disabled={pending || !testTo || dirty} onClick={test} title={dirty ? "Guarda los cambios primero" : undefined}>
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Probar
        </button>
        <button type="button" className={ghost + " py-3 hover:text-red-300"} onClick={onRemove}>
          <Trash2 className="w-4 h-4" /> Quitar
        </button>
      </div>
      {dirty && <p className="text-xs text-sky-text/55">Guarda los cambios para poder enviar una prueba.</p>}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
    </div>
  );
}

export default function SequencesView({
  list,
  sequence,
  problems: problems0,
  stats,
  segments,
  enrollments,
  setup,
}: {
  list: { id: string; name: string; active: boolean }[];
  sequence: Sequence | null;
  problems: string[];
  stats: Record<string, CampaignStats>;
  segments: { name: string; count: number }[];
  enrollments: EnrollmentRow[];
  setup: { db: boolean; resend: boolean; cron: boolean; replyTo: boolean };
}) {
  const router = useRouter();
  const [seq, setSeq] = useState<Sequence | null>(sequence);
  const [saved, setSaved] = useState<string>(JSON.stringify(sequence));
  const [problems, setProblems] = useState(problems0);
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string[]>([]);
  const [enrollLang, setEnrollLang] = useState<Lang>("es");
  const [filter, setFilter] = useState<"all" | EnrollmentRow["status"]>("all");
  const dirty = JSON.stringify(seq) !== saved;

  const missing = [
    !setup.db && "base de datos (KV_…)",
    !setup.resend && "RESEND_API_KEY y MAIL_FROM",
    !setup.cron && "CRON_SECRET (para el envío diario automático)",
    !setup.replyTo && "MAIL_REPLY_TO (para detectar respuestas)",
  ].filter(Boolean);

  const create = () =>
    start(async () => {
      const r = await createInsuranceSequence();
      if (r.ok) router.push(`/agentes/secuencias?id=${r.id}`);
      else setMsg({ kind: "err", text: r.error });
    });

  if (!seq) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-white">
        <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Correo Pro-DG</p>
        <h1 className="font-display font-black text-3xl md:text-4xl mt-1 mb-6">Secuencias</h1>
        {missing.length > 0 && (
          <div className="mb-5">
            <Notice kind="warn">Falta configurar: {missing.join(" · ")}.</Notice>
          </div>
        )}
        <div className={card + " flex flex-col items-start gap-4"}>
          <p className="text-sky-text/80">
            Una secuencia envía varios correos automáticos, días después de que alguien entra a ella. Empieza con la secuencia de seguimiento de
            cotización de auto (ya escrita en español e inglés, sin mencionar el cargo de servicio). Queda pausada hasta que la revises y la actives.
          </p>
          <button type="button" className={primary} onClick={create} disabled={pending || !setup.db}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Crear secuencia de seguro de auto
          </button>
          {msg && <Notice kind={msg.kind === "warn" ? "warn" : msg.kind}>{msg.text}</Notice>}
        </div>
      </main>
    );
  }

  const update = (patch: Partial<Sequence>) => setSeq({ ...seq, ...patch });
  const setStep = (i: number, s: Step) => update({ steps: seq.steps.map((x, k) => (k === i ? s : x)) });

  const save = (override?: Partial<Sequence>) =>
    start(async () => {
      setMsg(null);
      const r = await saveSequenceAction({ ...seq, ...override });
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      setSeq(r.sequence);
      setSaved(JSON.stringify(r.sequence));
      setProblems(r.problems);
      setMsg({ kind: "ok", text: r.sequence.active ? "Guardado. La secuencia está activa." : "Guardado. La secuencia está pausada." });
      router.refresh();
    });

  const addStep = () => {
    const last = seq.steps[seq.steps.length - 1];
    update({
      steps: [
        ...seq.steps,
        {
          id: `s${Date.now().toString(36)}`,
          day: (last?.day ?? 0) + 2,
          audience: "all",
          subject: { es: "", en: "" },
          preview: { es: "", en: "" },
          body: { es: "Hola {{name}},\n\n", en: "Hi {{name}},\n\n" },
          button: { es: "", en: "" },
        },
      ],
    });
  };

  const counts = { active: 0, done: 0, stopped: 0 };
  for (const e of enrollments) counts[e.status]++;
  const selectedTotal = segments.filter((s) => chosen.includes(s.name)).reduce((n, s) => n + s.count, 0);

  const doEnroll = () => {
    if (!window.confirm(`¿Inscribir a los contactos de ${chosen.join(", ")} (hasta ${selectedTotal})? Quien ya esté o haya estado en esta secuencia, o se haya dado de baja, no se inscribe de nuevo.`)) return;
    start(async () => {
      setMsg(null);
      const r = await enrollLists(seq.id, chosen, enrollLang);
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      setChosen([]);
      setMsg({
        kind: "ok",
        text: `Inscritos: ${r.added}. Ya estaban: ${r.skippedDup}. Dados de baja: ${r.skippedUnsub}. ${
          seq.active ? "El primer correo sale en el próximo envío (o usa “Enviar lo pendiente ahora”)." : "La secuencia está pausada: nadie recibe nada hasta que la actives."
        }`,
      });
      router.refresh();
    });
  };

  const runNow = () =>
    start(async () => {
      setMsg(null);
      const r = await runSequencesNow();
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      setMsg({
        kind: r.failed ? "warn" : "ok",
        text: `Enviados: ${r.sent}.${r.failed ? ` Fallaron: ${r.failed} (se reintentan en 1 hora).` : ""}${r.remaining ? ` Pendientes: ${r.remaining}, vuelve a pulsar para seguir.` : ""}`,
      });
      router.refresh();
    });

  const stop = (email: string) => {
    if (!window.confirm(`¿Detener la secuencia para ${email}?`)) return;
    start(async () => {
      const r = await stopEnrollment(seq.id, email);
      if (!r.ok) setMsg({ kind: "err", text: r.error });
      router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm(`¿Borrar la secuencia "${seq.name}" y todo su historial de inscritos? No se puede deshacer.`)) return;
    start(async () => {
      const r = await deleteSequenceAction(seq.id);
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      router.push("/agentes/secuencias");
      router.refresh();
    });
  };

  const rows = enrollments.filter((e) => filter === "all" || e.status === filter);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-28 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Correo Pro-DG</p>
          <h1 className="font-display font-black text-3xl md:text-4xl mt-1">Secuencias</h1>
        </div>
        {list.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto">
            {list.map((s) => (
              <a
                key={s.id}
                href={`/agentes/secuencias?id=${s.id}`}
                className={"px-4 py-2 rounded-full text-sm whitespace-nowrap " + (s.id === seq.id ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/80")}
              >
                {s.name}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mb-5">
        {missing.length > 0 && <Notice kind="warn">Falta configurar: {missing.join(" · ")}.</Notice>}
        {problems.length > 0 && (
          <Notice kind="warn">
            Antes de activarla:
            <ul className="list-disc pl-5 mt-1">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Notice>
        )}
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </div>

      {/* Status */}
      <section className={card + " flex flex-col gap-5 mb-5"}>
        <div className="grid sm:grid-cols-2 gap-5">
          <Toggle
            on={seq.active}
            onChange={(v) => save({ active: v })}
            label={seq.active ? "Activa: enviando" : "Pausada: no envía nada"}
            hint="Al pausar, nadie sale de la secuencia; los correos esperan hasta que la actives."
          />
          <Toggle
            on={seq.autoEnrollForm}
            onChange={(v) => update({ autoEnrollForm: v })}
            label="Recibe los leads del formulario /seguros"
            hint="Su correo 1 reemplaza el correo de confirmación, así cada persona recibe un solo correo al enviar el formulario."
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-sky-text/80">
          <span>
            <strong className="text-white">{counts.active}</strong> activos
          </span>
          <span>
            <strong className="text-white">{counts.done}</strong> terminaron
          </span>
          <span>
            <strong className="text-white">{counts.stopped}</strong> detenidos
          </span>
          <button type="button" className={ghost + " ml-auto"} onClick={runNow} disabled={pending || !seq.active}>
            <Play className="w-4 h-4" /> Enviar lo pendiente ahora
          </button>
        </div>
        <p className="text-xs text-sky-text/55 leading-relaxed">
          Los correos salen una vez al día (10 a. m. hora del Este), máximo uno por persona cada 12 horas. Alguien sale de la secuencia si responde, se
          da de baja, su correo rebota, lo marca como spam, o si su solicitud se marca como vendida o perdida.
        </p>
      </section>

      {/* Settings */}
      <section className={card + " grid sm:grid-cols-2 gap-4 mb-5"}>
        <label>
          <Label>Nombre de la secuencia (interno)</Label>
          <input className={input} value={seq.name} onChange={(e) => update({ name: e.target.value })} />
        </label>
        <label>
          <Label>Empresa (remitente y pie del correo)</Label>
          <input className={input} value={seq.company} onChange={(e) => update({ company: e.target.value })} />
        </label>
        <label>
          <Label>Nombre del agente — {"{{agent}}"}</Label>
          <input className={input} placeholder="p. ej. David" value={seq.agentName} onChange={(e) => update({ agentName: e.target.value })} />
        </label>
        <label>
          <Label>Teléfono — {"{{phone}}"}</Label>
          <input className={input} value={seq.phone} onChange={(e) => update({ phone: e.target.value })} />
        </label>
        <label className="sm:col-span-2">
          <Label>Enlace del botón</Label>
          <input className={input} value={seq.buttonUrl} onChange={(e) => update({ buttonUrl: e.target.value })} />
        </label>
        <p className="sm:col-span-2 text-xs text-sky-text/60 leading-relaxed">
          El correo sale como “{seq.agentName || "Agente"} at {seq.company}”. Campos disponibles en los textos: {"{{name}}"}, {"{{vehicle}}"},{" "}
          {"{{state}}"}, {"{{agent}}"}, {"{{phone}}"}. Si falta un dato se usa un texto neutro (“tu auto”); puedes poner el tuyo así:{" "}
          {"{{name|Hola}}"}. Un párrafo que diga solo [button] marca dónde va el botón.
        </p>
      </section>

      {/* Steps */}
      <section className="flex flex-col gap-4 mb-5">
        {seq.steps.map((s, i) => (
          <StepCard
            key={s.id}
            step={s}
            index={i}
            stats={stats[s.id]}
            seqId={seq.id}
            dirty={dirty}
            onChange={(n) => setStep(i, n)}
            onRemove={() => window.confirm(`¿Quitar el correo ${i + 1}?`) && update({ steps: seq.steps.filter((_, k) => k !== i) })}
          />
        ))}
        <button type="button" className={ghost + " self-start"} onClick={addStep}>
          <Plus className="w-4 h-4" /> Agregar correo
        </button>
      </section>

      {/* Enroll */}
      <section className={card + " flex flex-col gap-4 mb-5"}>
        <h2 className="font-display font-bold text-xl flex items-center gap-2">
          <Users className="w-5 h-5" /> Inscribir listas
        </h2>
        {segments.length === 0 ? (
          <p className="text-sm text-sky-text/70">Aún no tienes listas. Importa contactos en Correo → Contactos.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {segments.map((s) => {
                const on = chosen.includes(s.name);
                return (
                  <label
                    key={s.name}
                    className={"flex items-center gap-2 px-4 py-2 rounded-full text-sm cursor-pointer " + (on ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/85")}
                  >
                    <input
                      type="checkbox"
                      className="accent-white"
                      checked={on}
                      onChange={() => setChosen(on ? chosen.filter((x) => x !== s.name) : [...chosen, s.name])}
                    />
                    {s.name} <span className="opacity-70">({s.count})</span>
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="w-56">
                <Label>Idioma si no lo sabemos</Label>
                <select className={input} value={enrollLang} onChange={(e) => setEnrollLang(e.target.value as Lang)}>
                  <option value="es" className="bg-[#0B2B5E]">
                    Español
                  </option>
                  <option value="en" className="bg-[#0B2B5E]">
                    English
                  </option>
                </select>
              </label>
              <button type="button" className={primary + " py-3"} onClick={doEnroll} disabled={pending || !chosen.length || dirty}>
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Inscribir {chosen.length ? `(${selectedTotal})` : ""}
              </button>
            </div>
            <p className="text-xs text-sky-text/60 leading-relaxed">
              Puedes elegir varias listas; quien esté en más de una se inscribe una sola vez. Si la persona llenó el formulario, usamos su idioma,
              vehículo, estado y situación de seguro. Se saltan quienes se dieron de baja.
            </p>
          </>
        )}
      </section>

      {/* Enrollments */}
      <section className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-xl">Inscritos</h2>
          <div className="flex gap-1.5">
            {(
              [
                ["all", "Todos"],
                ["active", "Activos"],
                ["done", "Terminaron"],
                ["stopped", "Detenidos"],
              ] as const
            ).map(([id, text]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={"px-3 py-1.5 rounded-full text-xs font-medium " + (filter === id ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/80")}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#7cc4ff33] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-left text-sky-text/70">
                <th className="font-medium px-3 py-2">Contacto</th>
                <th className="font-medium px-3 py-2">Origen</th>
                <th className="font-medium px-3 py-2">Estado</th>
                <th className="font-medium px-3 py-2">Correos</th>
                <th className="font-medium px-3 py-2">Próximo</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.slice(0, 300).map((e) => (
                <tr key={e.email}>
                  <td className="px-3 py-2.5 max-w-[16rem]">
                    <span className="block truncate">{e.firstName || e.email}</span>
                    {e.firstName && <span className="block truncate text-xs text-sky-text/60">{e.email}</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sky-text/80">
                    {e.source} · {e.lang.toUpperCase()}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + STATUS[e.status].cls}>{STATUS[e.status].label}</span>
                    {e.reason && <span className="block text-xs text-sky-text/60 mt-0.5">{e.reason}</span>}
                  </td>
                  <td className="px-3 py-2.5">{e.sent}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-sky-text/80">{e.next || "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    {e.status === "active" && (
                      <button type="button" onClick={() => stop(e.email)} className="inline-flex items-center gap-1 text-xs text-sky-text/70 hover:text-red-300">
                        <Square className="w-3 h-3" /> Detener
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-sky-text/60">
                    Nadie en este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 300 && <p className="text-xs text-sky-text/55 mt-2">Mostrando 300 de {rows.length}.</p>}
      </section>

      <button type="button" onClick={remove} className="text-xs text-sky-text/55 hover:text-red-300">
        Borrar esta secuencia
      </button>

      {/* Save bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-[#7cc4ff20] backdrop-blur-xl" style={{ background: "rgba(11,43,94,0.9)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-sky-text/75">{dirty ? "Tienes cambios sin guardar." : "Todo guardado."}</span>
          <button type="button" className={primary} onClick={() => save()} disabled={pending || !dirty}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
          </button>
        </div>
      </div>
    </main>
  );
}
