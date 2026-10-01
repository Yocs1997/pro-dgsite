"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Loader2,
  Mail,
  Play,
  Plus,
  Save,
  Send,
  Settings2,
  Square,
  Trash2,
  Users,
} from "lucide-react";
import EmailButton from "../EmailButton";
import type { Audience, Lang, Sequence, Step } from "@/app/lib/server/sequences";
import type { CampaignStats } from "@/app/lib/server/mail-tracking";
import {
  deleteSequenceAction,
  enrollLists,
  newSequence,
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

export type SequenceItem = {
  sequence: Sequence;
  problems: string[];
  stats: Record<string, CampaignStats>;
  enrollments: EnrollmentRow[];
  summary: { created: string; updated: string; lastSent: string; nextSend: string; sentTotal: number; lastDay: number };
};

type Setup = { db: boolean; resend: boolean; cron: boolean; replyTo: boolean };
type Segment = { name: string; count: number };
type Msg = { kind: "ok" | "err" | "warn"; text: string } | null;

const input =
  "w-full rounded-xl border border-[#7cc4ff40] bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-[#33aaff]";
const card = "rounded-2xl border border-[#7cc4ff33]";
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

const pct = (n = 0, d = 0) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

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

function Pill({ tone, children }: { tone: "green" | "gray" | "blue" | "amber"; children: React.ReactNode }) {
  const cls = {
    green: "bg-emerald-500/20 text-emerald-300",
    gray: "bg-white/10 text-sky-text/80",
    blue: "bg-sky-500/20 text-sky-200",
    amber: "bg-amber-500/20 text-amber-200",
  }[tone];
  return <span className={"px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap " + cls}>{children}</span>;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-sky-text/55">{label}</p>
      <p className="text-sm text-white truncate">{value}</p>
    </div>
  );
}

function Toggle({ on, onChange, label, hint, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} className="flex items-start gap-3 text-left disabled:opacity-60">
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

/** A section with a clickable header that shows / hides its content. */
function Section({
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  summary?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] rounded-xl">
        <Icon className="w-4 h-4 text-[#7cc4ff] shrink-0" />
        <span className="font-semibold text-sm">{title}</span>
        {summary && <span className="text-xs text-sky-text/60 truncate">{summary}</span>}
        <ChevronDown className={"w-4 h-4 ml-auto shrink-0 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ─── One email of a sequence ────────────────────────────────────────────────

function StepEditor({
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
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
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
    <div className="rounded-xl border border-white/10">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full px-4 py-3 text-left hover:bg-white/[0.03] rounded-xl">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-white/10 text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate">{step.subject.es || step.subject.en || "(sin asunto)"}</span>
            <span className="block text-xs text-sky-text/60">
              Día {step.day} · {AUDIENCE[step.audience]}
            </span>
          </span>
          <span className="hidden sm:flex gap-3 text-xs text-sky-text/70 shrink-0">
            <span>Enviados {s.sent ?? 0}</span>
            <span>Abiertos {pct(s.opened, delivered)}</span>
            <span>Clics {pct(s.clicked, delivered)}</span>
            <span>Resp. {s.replied ?? 0}</span>
          </span>
          <ChevronDown className={"w-4 h-4 shrink-0 transition-transform " + (open ? "rotate-180" : "")} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-4">
          <p className="sm:hidden text-xs text-sky-text/70">
            Enviados {s.sent ?? 0} · Abiertos {pct(s.opened, delivered)} · Clics {pct(s.clicked, delivered)} · Respuestas {s.replied ?? 0} · Bajas{" "}
            {s.unsubscribed ?? 0}
          </p>
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
      )}
    </div>
  );
}

// ─── One sequence (collapsed summary + full editor) ─────────────────────────

function SequenceCard({ item, segments, startOpen }: { item: SequenceItem; segments: Segment[]; startOpen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen);
  const [seq, setSeq] = useState<Sequence>(item.sequence);
  const [saved, setSaved] = useState<string>(JSON.stringify(item.sequence));
  const [problems, setProblems] = useState(item.problems);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string[]>([]);
  const [enrollLang, setEnrollLang] = useState<Lang>("es");
  const [filter, setFilter] = useState<"all" | EnrollmentRow["status"]>("all");
  const [sections, setSections] = useState({ settings: false, steps: true, enroll: false, people: false });
  const toggle = (k: keyof typeof sections) => setSections({ ...sections, [k]: !sections[k] });
  const dirty = JSON.stringify(seq) !== saved;
  const { enrollments, stats, summary } = item;

  const counts = { active: 0, done: 0, stopped: 0 };
  for (const e of enrollments) counts[e.status]++;
  let delivered = 0,
    opened = 0,
    clicked = 0,
    replied = 0;
  for (const s of Object.values(stats)) {
    delivered += s.delivered ?? 0;
    opened += s.opened ?? 0;
    clicked += s.clicked ?? 0;
    replied += s.replied ?? 0;
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

  const duplicate = () =>
    start(async () => {
      setMsg(null);
      const r = await newSequence("copy", seq.id);
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      window.location.assign(`/agentes/secuencias?id=${r.id}`);
    });

  const remove = () => {
    if (!window.confirm(`¿Borrar la secuencia "${seq.name}" y todo su historial de inscritos? No se puede deshacer.`)) return;
    start(async () => {
      const r = await deleteSequenceAction(seq.id);
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      window.location.assign("/agentes/secuencias");
    });
  };

  const rows = enrollments.filter((e) => filter === "all" || e.status === filter);

  return (
    <article className={card + (open ? " bg-white/[0.02]" : "")}>
      {/* Summary (always visible) */}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full text-left p-5 hover:bg-white/[0.03] rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-bold text-lg truncate">{seq.name}</h2>
              {seq.active ? <Pill tone="green">Activa</Pill> : <Pill tone="gray">Pausada</Pill>}
              {seq.autoEnrollForm && <Pill tone="blue">Leads del formulario</Pill>}
              {problems.length > 0 && <Pill tone="amber">Falta completar</Pill>}
              {dirty && <Pill tone="amber">Sin guardar</Pill>}
            </div>
            <p className="text-xs text-sky-text/60 mt-1">
              {seq.steps.length} correos en {summary.lastDay} días · Creada {summary.created}
            </p>
          </div>
          <ChevronDown className={"w-5 h-5 mt-1 shrink-0 transition-transform " + (open ? "rotate-180" : "")} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-3 mt-4">
          <Stat label="Activos" value={counts.active} />
          <Stat label="Terminaron" value={counts.done} />
          <Stat label="Detenidos" value={counts.stopped} />
          <Stat label="Correos enviados" value={summary.sentTotal} />
          <Stat label="Abiertos / Clics" value={`${pct(opened, delivered)} / ${pct(clicked, delivered)}`} />
          <Stat label="Último envío" value={summary.lastSent || "—"} />
          <Stat label="Próximo envío" value={seq.active ? summary.nextSend || "—" : "Pausada"} />
        </div>
        {replied > 0 && <p className="text-xs text-sky-text/60 mt-3">{replied} respuestas recibidas.</p>}
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-3 border-t border-white/10 pt-4">
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

          {/* Status */}
          <div className="grid sm:grid-cols-2 gap-4 rounded-xl border border-white/10 p-4">
            <Toggle
              on={seq.active}
              disabled={pending}
              onChange={(v) => save({ active: v })}
              label={seq.active ? "Activa: enviando" : "Pausada: no envía nada"}
              hint="Al pausar, nadie sale de la secuencia; los correos esperan hasta que la actives."
            />
            <Toggle
              on={seq.autoEnrollForm}
              onChange={(v) => update({ autoEnrollForm: v })}
              label="Recibe los leads del formulario /seguros"
              hint="Su correo 1 reemplaza el correo de confirmación. Recuerda guardar."
            />
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-sky-text/55 max-w-xl">
                Envío diario a las 10 a. m. (hora del Este), máximo un correo por persona cada 12 horas. Alguien sale si responde, se da de baja,
                rebota, lo marca como spam, o si su solicitud se marca como vendida o perdida.
              </p>
              <button type="button" className={ghost} onClick={runNow} disabled={pending || !seq.active}>
                <Play className="w-4 h-4" /> Enviar lo pendiente ahora
              </button>
            </div>
          </div>

          <Section icon={Settings2} title="Ajustes" summary={`${seq.agentName || "sin agente"} · ${seq.company} · ${seq.phone}`} open={sections.settings} onToggle={() => toggle("settings")}>
            <div className="grid sm:grid-cols-2 gap-4">
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
                El correo sale como “{seq.agentName || "Agente"} at {seq.company}”. Campos en los textos: {"{{name}}"}, {"{{vehicle}}"}, {"{{state}}"},{" "}
                {"{{agent}}"}, {"{{phone}}"}. Si falta un dato se usa un texto neutro (“tu auto”); o pon el tuyo así: {"{{name|Hola}}"}. Un párrafo que
                diga solo [button] marca dónde va el botón.
              </p>
            </div>
          </Section>

          <Section icon={Mail} title={`Correos (${seq.steps.length})`} summary="Toca un correo para editarlo" open={sections.steps} onToggle={() => toggle("steps")}>
            <div className="flex flex-col gap-2">
              {seq.steps.map((s, i) => (
                <StepEditor
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
              <button type="button" className={ghost + " self-start mt-1"} onClick={addStep}>
                <Plus className="w-4 h-4" /> Agregar correo
              </button>
            </div>
          </Section>

          <Section icon={Users} title="Inscribir listas" summary={chosen.length ? `${chosen.length} elegidas` : undefined} open={sections.enroll} onToggle={() => toggle("enroll")}>
            {segments.length === 0 ? (
              <p className="text-sm text-sky-text/70">Aún no tienes listas. Importa contactos en Correo → Contactos.</p>
            ) : (
              <div className="flex flex-col gap-4">
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
              </div>
            )}
          </Section>

          <Section
            icon={Users}
            title={`Inscritos (${enrollments.length})`}
            summary={`${counts.active} activos · ${counts.done} terminaron · ${counts.stopped} detenidos`}
            open={sections.people}
            onToggle={() => toggle("people")}
          >
            <div className="flex gap-1.5 mb-3">
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
            <div className="rounded-xl border border-white/10 overflow-x-auto">
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
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <EmailButton to={e.email} icon />
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
          </Section>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="button" className={ghost} onClick={duplicate} disabled={pending || dirty} title={dirty ? "Guarda los cambios primero" : undefined}>
              <Copy className="w-4 h-4" /> Duplicar
            </button>
            <button type="button" className={ghost + " hover:text-red-300"} onClick={remove} disabled={pending}>
              <Trash2 className="w-4 h-4" /> Borrar
            </button>
            <span className="text-xs text-sky-text/50 ml-auto">Última edición: {summary.updated}</span>
          </div>

          {/* Save bar: sticks to the bottom of the screen while this card has changes */}
          {dirty && (
            <div
              className="sticky bottom-3 z-30 flex items-center justify-between gap-3 rounded-2xl border border-[#7cc4ff40] px-4 py-3 backdrop-blur-xl"
              style={{ background: "rgba(11,43,94,0.92)" }}
            >
              <span className="text-sm text-sky-text/85">Tienes cambios sin guardar en “{seq.name}”.</span>
              <button type="button" className={primary} onClick={() => save()} disabled={pending}>
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SequencesView({ items, openId, segments, setup }: { items: SequenceItem[]; openId: string; segments: Segment[]; setup: Setup }) {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);

  const missing = [
    !setup.db && "base de datos (KV_…)",
    !setup.resend && "RESEND_API_KEY y MAIL_FROM",
    !setup.cron && "CRON_SECRET (para el envío diario automático)",
    !setup.replyTo && "MAIL_REPLY_TO (para detectar respuestas)",
  ].filter(Boolean);

  const create = (kind: "blank" | "insurance") =>
    start(async () => {
      setMsg(null);
      const r = await newSequence(kind);
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      window.location.assign(`/agentes/secuencias?id=${r.id}`);
    });

  const active = items.filter((i) => i.sequence.active).length;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-16 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Correo Pro-DG</p>
          <h1 className="font-display font-black text-3xl md:text-4xl mt-1">Secuencias</h1>
          <p className="text-sm text-sky-text/70 mt-1">
            {items.length === 0 ? "Correos automáticos enviados días después de que alguien entra." : `${items.length} ${items.length === 1 ? "secuencia" : "secuencias"} · ${active} ${active === 1 ? "activa" : "activas"}`}
          </p>
        </div>
        <div className="relative">
          <button type="button" className={primary} onClick={() => setMenu(!menu)} disabled={pending || !setup.db} aria-expanded={menu}>
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Nueva secuencia
          </button>
          {menu && (
            <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-[#7cc4ff40] p-1.5 flex flex-col shadow-xl" style={{ background: "#0B2B5E" }}>
              {(
                [
                  ["insurance", "Plantilla de seguro de auto", "La secuencia de seguimiento de cotización, en español e inglés."],
                  ["blank", "En blanco", "Un solo correo vacío para escribir desde cero."],
                ] as const
              ).map(([kind, title, hint]) => (
                <button key={kind} type="button" disabled={pending} onClick={() => create(kind)} className="text-left px-3 py-2.5 rounded-xl hover:bg-white/10 disabled:opacity-50">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-xs text-sky-text/65">{hint}</span>
                </button>
              ))}
              <p className="px-3 py-2 text-xs text-sky-text/55">Para copiar una existente, ábrela y usa “Duplicar”.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-5">
        {missing.length > 0 && <Notice kind="warn">Falta configurar: {missing.join(" · ")}.</Notice>}
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </div>

      {items.length === 0 ? (
        <div className={card + " p-6 flex flex-col items-start gap-4"}>
          <p className="text-sky-text/80">
            Aún no tienes secuencias. Empieza con la plantilla de seguro de auto (ya escrita en español e inglés, sin mencionar el cargo de servicio).
            Queda pausada hasta que la revises y la actives.
          </p>
          <button type="button" className={primary} onClick={() => create("insurance")} disabled={pending || !setup.db}>
            <Plus className="w-4 h-4" /> Crear secuencia de seguro de auto
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <SequenceCard key={item.sequence.id} item={item} segments={segments} startOpen={item.sequence.id === openId} />
          ))}
        </div>
      )}
    </main>
  );
}
