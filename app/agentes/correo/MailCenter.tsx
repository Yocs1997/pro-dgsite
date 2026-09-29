"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Inbox,
  PenSquare,
  Megaphone,
  Users,
  Send,
  Reply,
  Trash2,
  MailOpen,
  Mail,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Search,
  ArrowLeft,
  Paperclip,
  Eye,
  X,
} from "lucide-react";
import { importContacts, openMessage, removeMessage, sendCampaign, sendMessage, setRead, type ImportRow, type OpenedMail } from "../admin-actions";
import type { Campaign, InMail, OutMail } from "@/app/lib/server/mail";
import type { LocalContact } from "@/app/lib/server/contacts";

type Setup = { resend: boolean; db: boolean; from: string; replyTo: string; postal: boolean; webhook: boolean };
type Tab = "inbox" | "compose" | "campaigns" | "contacts" | "sent";

const input =
  "w-full rounded-xl border border-[#7cc4ff40] bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-[#33aaff]";
const glass = { background: "rgba(255,255,255,0.07)" } as const;

const emailOnly = (s: string) => (s.match(/<([^>]+)>/)?.[1] ?? s).trim();
const nameOnly = (s: string) => s.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || emailOnly(s);

function Notice({ kind, children }: { kind: "ok" | "err" | "warn"; children: React.ReactNode }) {
  const cls =
    kind === "ok"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
      : kind === "err"
        ? "border-red-400/40 bg-red-500/15 text-red-100"
        : "border-amber-400/40 bg-amber-500/15 text-amber-100";
  const Icon = kind === "ok" ? CheckCircle2 : AlertTriangle;
  return (
    <p role={kind === "err" ? "alert" : "status"} className={"flex items-start gap-2 rounded-xl border px-4 py-3 text-sm " + cls}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" /> <span>{children}</span>
    </p>
  );
}

// Same look as the real email template (for previews).
function previewHtml(body: string, name: string, footer?: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${esc(p).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="color:#0096FF">${u}</a>`).replace(/\n/g, "<br>")}</p>`)
    .join("")
    .replace(/\{\{\s*nombre\s*\}\}/gi, esc(name));
  return `<body style="margin:0;background:#eef3fa;font-family:Arial,sans-serif;color:#10213d"><div style="max-width:600px;margin:16px auto;background:#fff;border-radius:14px;overflow:hidden">
<div style="background:#0B2B5E;padding:18px 24px;font-size:20px;font-weight:800;color:#fff">Pro<span style="color:#33aaff">-DG</span></div>
<div style="padding:24px;font-size:15px">${paras || '<p style="color:#8a97aa">Tu mensaje aparecerá aquí…</p>'}</div>
${footer ? `<div style="padding:14px 24px;background:#f5f8fc;font-size:12px;color:#5b6b82">${footer}</div>` : ""}</div></body>`;
}

// ─── Compose (also used for replies) ─────────────────────────────────────────

function Composer({
  initial,
  onSent,
  onCancel,
  title,
}: {
  initial: { to: string; subject: string; body?: string; inReplyTo?: string };
  onSent: (m: { to: string; subject: string; body: string }) => void;
  onCancel?: () => void;
  title: string;
}) {
  const [to, setTo] = useState(initial.to);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body ?? "");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setMsg(null);
      const r = await sendMessage({ to, subject, body, inReplyTo: initial.inReplyTo });
      if (r.ok) {
        setMsg({ kind: "ok", text: "Correo enviado." });
        onSent({ to, subject, body });
        setBody("");
        if (!initial.inReplyTo) {
          setTo("");
          setSubject("");
        }
      } else setMsg({ kind: "err", text: r.error });
    });

  return (
    <div className="rounded-2xl border border-[#7cc4ff33] p-5 sm:p-6 flex flex-col gap-4" style={glass}>
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl">{title}</h2>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sky-text/60 hover:text-white" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Para</span>
        <input value={to} onChange={(e) => setTo(e.target.value)} className={input} placeholder="cliente@correo.com (varios separados por coma)" inputMode="email" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Asunto</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Mensaje</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={input + " resize-y min-h-40"} placeholder="Escribe tu mensaje. Deja una línea en blanco entre párrafos." />
      </label>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={send}
          disabled={pending || !to.trim() || !subject.trim() || !body.trim()}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-electric hover:bg-electric-light disabled:opacity-50 font-bold"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}

// ─── Inbox ───────────────────────────────────────────────────────────────────

function InboxView({ items, setItems, onSent }: { items: (InMail & { when: string })[]; setItems: (f: (x: (InMail & { when: string })[]) => (InMail & { when: string })[]) => void; onSent: (m: { to: string; subject: string; body: string }) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const [mail, setMail] = useState<OpenedMail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replied, setReplied] = useState(false);
  const [q, setQ] = useState("");

  const open = async (id: string) => {
    setSel(id);
    setMail(null);
    setErr(null);
    setReplying(false);
    setReplied(false);
    setLoading(true);
    const r = await openMessage(id);
    setLoading(false);
    if (r.ok) {
      setMail(r.mail);
      setItems((list) => list.map((m) => (m.id === id ? { ...m, read: true } : m)));
    } else setErr(r.error);
  };

  const shown = items.filter((m) => !q.trim() || `${m.from} ${m.subject}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className={"rounded-2xl border border-[#7cc4ff33] overflow-hidden " + (sel ? "hidden lg:block" : "")} style={glass}>
        <label className="flex items-center gap-2 border-b border-white/10 px-4">
          <Search className="w-4 h-4 text-[#7cc4ff]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-white/35" />
        </label>
        <ul className="max-h-[65vh] overflow-y-auto">
          {shown.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => open(m.id)}
                className={"w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 " + (sel === m.id ? "bg-white/10" : "")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={"truncate " + (m.read ? "text-sky-text/80" : "font-bold text-white")}>
                    {!m.read && <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2 align-middle" />}
                    {nameOnly(m.from)}
                  </span>
                  <span className="text-[11px] text-sky-text/55 shrink-0">{m.when}</span>
                </div>
                <p className={"text-sm truncate mt-0.5 " + (m.read ? "text-sky-text/60" : "text-sky-text/90")}>
                  {m.attachments > 0 && <Paperclip className="inline w-3 h-3 mr-1" />}
                  {m.subject}
                </p>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-12 text-center text-sm text-sky-text/60">No hay correos todavía.</li>}
        </ul>
      </div>

      <div className={"rounded-2xl border border-[#7cc4ff33] min-h-[50vh] flex flex-col " + (sel ? "" : "hidden lg:flex")} style={glass}>
        {!sel ? (
          <div className="m-auto text-center text-sky-text/55 p-10">
            <MailOpen className="w-10 h-10 mx-auto mb-3 opacity-60" /> Selecciona un correo para leerlo.
          </div>
        ) : loading ? (
          <div className="m-auto p-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#7cc4ff]" />
          </div>
        ) : err ? (
          <div className="p-6">
            <Notice kind="err">{err}</Notice>
          </div>
        ) : mail ? (
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <button type="button" onClick={() => setSel(null)} className="lg:hidden flex items-center gap-1 text-sm text-sky-text/70">
              <ArrowLeft className="w-4 h-4" /> Bandeja
            </button>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display font-bold text-xl break-words">{mail.subject || "(sin asunto)"}</h2>
                <p className="text-sm text-sky-text/75 mt-1 break-all">
                  De: <span className="text-white">{mail.from}</span>
                </p>
                <p className="text-xs text-sky-text/55 break-all">Para: {mail.to.join(", ")}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReplying(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-electric hover:bg-electric-light text-sm font-semibold"
                >
                  <Reply className="w-4 h-4" /> Responder
                </button>
                <button
                  type="button"
                  title="Marcar como no leído"
                  onClick={async () => {
                    await setRead(mail.id, false);
                    setItems((list) => list.map((m) => (m.id === mail.id ? { ...m, read: false } : m)));
                    setSel(null);
                  }}
                  className="p-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10"
                >
                  <Mail className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Quitar de la bandeja"
                  onClick={async () => {
                    if (!confirm("¿Quitar este correo de la bandeja?")) return;
                    await removeMessage(mail.id);
                    setItems((list) => list.filter((m) => m.id !== mail.id));
                    setSel(null);
                  }}
                  className="p-2 rounded-full border border-[#7cc4ff55] hover:bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {mail.attachments.length > 0 && (
              <p className="text-xs text-sky-text/70 flex flex-wrap gap-2">
                {mail.attachments.map((a) => (
                  <span key={a.filename} className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
                    <Paperclip className="w-3 h-3" /> {a.filename}
                  </span>
                ))}
              </p>
            )}
            {mail.html ? (
              // Sandboxed: the email's own scripts can't run and it can't touch the portal.
              <iframe title="Contenido del correo" sandbox="" srcDoc={mail.html} className="w-full min-h-[420px] rounded-xl bg-white" />
            ) : (
              <pre className="whitespace-pre-wrap text-sm rounded-xl bg-black/20 p-4 font-sans">{mail.text || "(sin contenido)"}</pre>
            )}
            {replied && !replying && <Notice kind="ok">Respuesta enviada. La encuentras en &ldquo;Enviados&rdquo;.</Notice>}
            {replying && (
              <Composer
                title="Responder"
                initial={{
                  to: emailOnly(mail.replyTo[0] ?? mail.from),
                  subject: mail.subject.match(/^re:/i) ? mail.subject : `Re: ${mail.subject}`,
                  inReplyTo: mail.messageId,
                }}
                onCancel={() => setReplying(false)}
                onSent={(m) => {
                  onSent(m);
                  setReplying(false);
                  setReplied(true);
                }}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Contacts ────────────────────────────────────────────────────────────────

const EMAIL_RE = /[^\s,;<>"'()]+@[^\s,;<>"'()]+\.[^\s,;<>"'()]{2,}/;

/**
 * Reads a pasted list or CSV. Accepts commas, semicolons, tabs or plain spaces between
 * columns, with or without a header row. A full name ("Elton Murray") is split into
 * first name + last name so {{nombre}} greets people by their first name.
 */
function parseCsv(text: string): { rows: ImportRow[]; invalid: number } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], invalid: 0 };

  const sep = [",", ";", "\t"].find((c) => lines[0].includes(c) || lines[1]?.includes(c)) ?? null;
  const split = (l: string) => (sep ? l.split(sep) : [l]).map((c) => c.trim().replace(/^"|"$/g, ""));

  // Header row = first line without an email address in it.
  const hasHeader = !EMAIL_RE.test(lines[0]);
  const head = hasHeader && sep ? split(lines[0]).map((h) => h.toLowerCase()) : [];
  const find = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iFirst = find(/first|^nombre$|^primer/);
  const iLast = find(/last|apellido|surname/);
  const iFull = iFirst < 0 ? find(/name|nombre/) : -1;

  const rows: ImportRow[] = [];
  let invalid = 0;
  const seen = new Set<string>();
  for (const l of hasHeader ? lines.slice(1) : lines) {
    const email = l.match(EMAIL_RE)?.[0] ?? "";
    if (!email) {
      invalid++;
      continue;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const cells = split(l);
    let first = "";
    let last = "";
    if (head.length && (iFirst >= 0 || iLast >= 0)) {
      first = cells[iFirst] ?? "";
      last = cells[iLast] ?? "";
    } else {
      const full = (head.length && iFull >= 0 ? cells[iFull] ?? "" : l.replace(email, " "))
        .replace(/[,;\t"<>()]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const parts = full.split(" ");
      first = parts[0] ?? "";
      last = parts.slice(1).join(" ");
    }
    rows.push({ email, firstName: first.trim(), lastName: last.trim() });
  }
  return { rows, invalid };
}

function ContactsView({ contacts, setContacts, ready }: { contacts: LocalContact[]; setContacts: (f: (c: LocalContact[]) => LocalContact[]) => void; ready: boolean }) {
  const [text, setText] = useState("");
  const [segment, setSegment] = useState("Leads");
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseCsv(text), [text]);

  const segments = useMemo(() => {
    const m = new Map<string, number>();
    contacts.forEach((c) => c.segments.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [contacts]);

  const run = async () => {
    setErr(null);
    setRunning(true);
    const rows = parsed.rows;
    const failed: string[] = [];
    let done = 0;
    setProgress({ done, total: rows.length, failed });
    for (let i = 0; i < rows.length; i += 10) {
      const batch = rows.slice(i, i + 10);
      const r = await importContacts(batch, segment);
      if (!r.ok) {
        setErr(r.error);
        break;
      }
      failed.push(...r.failed);
      if (r.failed.length && r.lastError) setErr(`${r.failed.length} contacto(s) no se agregaron: ${r.lastError}`);
      done += batch.length;
      setProgress({ done, total: rows.length, failed: [...failed] });
      const now = Date.now();
      setContacts((list) => {
        const map = new Map(list.map((c) => [c.email, c]));
        batch.forEach((b) => {
          const e = b.email.toLowerCase();
          if (r.failed.includes(e)) return;
          const old = map.get(e);
          map.set(e, {
            email: e,
            firstName: b.firstName || old?.firstName || "",
            lastName: b.lastName || old?.lastName || "",
            segments: Array.from(new Set([...(old?.segments ?? []), segment])),
            addedAt: old?.addedAt ?? now,
          });
        });
        return [...map.values()].sort((a, b) => b.addedAt - a.addedAt);
      });
    }
    setRunning(false);
    setText("");
  };

  const shown = contacts.filter((c) => !q.trim() || `${c.email} ${c.firstName} ${c.lastName} ${c.segments.join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-[#7cc4ff33] p-5 sm:p-6 flex flex-col gap-4" style={glass}>
        <div>
          <h2 className="font-display font-bold text-xl">Importar contactos</h2>
          <p className="text-sm text-sky-text/65 mt-1">
            Sube un archivo CSV (desde Excel: Guardar como → CSV) o pega la lista. Columnas: <b>correo</b>, <b>nombre</b>, <b>apellido</b>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm font-semibold">
            <Upload className="w-4 h-4" /> Subir CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setText(await f.text());
              e.target.value = "";
            }}
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className={input + " font-mono text-xs"}
          placeholder={"correo,nombre,apellido\nmaria@correo.com,María,López\njose@correo.com,José,Pérez"}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Guardar en la lista</span>
          <input value={segment} onChange={(e) => setSegment(e.target.value)} list="pdg-segments" className={input} />
          <datalist id="pdg-segments">
            {["Leads", "Seguros", ...segments.map(([s]) => s)].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        {text && (
          <p className="text-sm text-sky-text/80">
            <b className="text-white">{parsed.rows.length}</b> contactos listos para importar
            {parsed.invalid > 0 && <span className="text-amber-200"> · {parsed.invalid} filas sin correo válido (se omiten)</span>}
          </p>
        )}
        {progress && (
          <div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
            </div>
            <p className="text-xs text-sky-text/70 mt-1.5">
              {progress.done} de {progress.total} {running ? "importando…" : "listo"}
              {progress.failed.length > 0 && <span className="text-amber-200"> · {progress.failed.length} no se pudieron agregar</span>}
            </p>
          </div>
        )}
        {err && <Notice kind="err">{err}</Notice>}
        <button
          type="button"
          onClick={run}
          disabled={!ready || running || parsed.rows.length === 0 || !segment.trim()}
          className="flex items-center justify-center gap-2 py-3 rounded-full bg-electric hover:bg-electric-light disabled:opacity-50 font-bold"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {running ? "Importando…" : `Importar ${parsed.rows.length || ""} contactos`}
        </button>
      </div>

      <div className="rounded-2xl border border-[#7cc4ff33] p-5 sm:p-6 flex flex-col gap-3" style={glass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-xl">Contactos ({contacts.length})</h2>
          <div className="flex flex-wrap gap-1.5">
            {segments.map(([s, n]) => (
              <span key={s} className="text-xs rounded-full bg-white/10 px-2.5 py-1">
                {s} <b>{n}</b>
              </span>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-[#7cc4ff40] bg-white/5 px-4">
          <Search className="w-4 h-4 text-[#7cc4ff]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contacto" className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-white/35" />
        </label>
        <ul className="max-h-[55vh] overflow-y-auto divide-y divide-white/5">
          {shown.map((c) => (
            <li key={c.email} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</p>
                <p className="text-xs text-sky-text/60 truncate">{c.email}</p>
              </div>
              <span className="text-[11px] text-sky-text/60 shrink-0">{c.segments.join(", ")}</span>
            </li>
          ))}
          {shown.length === 0 && <li className="py-10 text-center text-sm text-sky-text/60">Aún no hay contactos.</li>}
        </ul>
        <p className="text-[11px] text-sky-text/50">Las bajas (unsubscribe) las gestiona Resend automáticamente y esas personas ya no reciben campañas.</p>
      </div>
    </div>
  );
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

function CampaignsView({
  contacts,
  campaigns,
  setup,
  adminName,
  onDone,
}: {
  contacts: LocalContact[];
  campaigns: (Campaign & { when: string })[];
  setup: Setup;
  adminName: string;
  onDone: (c: Campaign & { when: string }) => void;
}) {
  const segments = useMemo(() => {
    const m = new Map<string, number>();
    contacts.forEach((c) => c.segments.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
    return [...m.entries()];
  }, [contacts]);
  const [segment, setSegment] = useState(segments[0]?.[0] ?? "Leads");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hola {{nombre}},\n\n");
  const [fallback, setFallback] = useState("");
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const count = segments.find(([s]) => s === segment)?.[1] ?? 0;

  const insertName = () => {
    const el = bodyRef.current;
    if (!el) return setBody((b) => b + "{{nombre}}");
    const { selectionStart: a, selectionEnd: z } = el;
    setBody((b) => b.slice(0, a) + "{{nombre}}" + b.slice(z));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + 10, a + 10);
    });
  };

  const run = (test: boolean) =>
    start(async () => {
      setMsg(null);
      const r = await sendCampaign({ segment, subject, body, fallbackName: fallback, ...(test ? { testTo } : {}) });
      setConfirming(false);
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      if (r.test) setMsg({ kind: "ok", text: `Prueba enviada a ${testTo}. Revisa cómo se ve.` });
      else {
        setMsg({ kind: "ok", text: `¡Campaña enviada a la lista "${segment}"! Resend la está entregando.` });
        onDone({ id: String(Date.now()), name: subject, subject, segment, createdAt: Date.now(), recipients: count, when: "ahora" });
        setSubject("");
        setBody("Hola {{nombre}},\n\n");
      }
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-[#7cc4ff33] p-5 sm:p-6 flex flex-col gap-4" style={glass}>
        <h2 className="font-display font-bold text-xl">Nueva campaña</h2>
        {!setup.postal && <Notice kind="warn">Antes de enviar campañas, agrega tu dirección postal en la variable MAIL_POSTAL_ADDRESS (la ley CAN-SPAM de EE. UU. la exige en el pie del correo).</Notice>}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Enviar a la lista</span>
          <select value={segment} onChange={(e) => setSegment(e.target.value)} className={input + " bg-[#0F3470]"}>
            {segments.length === 0 && <option value="Leads">Leads (importa contactos primero)</option>}
            {segments.map(([s, n]) => (
              <option key={s} value={s}>
                {s} — {n} contactos
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Asunto</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} placeholder="Ej. ¿Ya cotizaste tu seguro de auto este año?" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Mensaje</span>
            <button type="button" onClick={insertName} className="text-xs rounded-full border border-[#7cc4ff55] px-2.5 py-1 hover:bg-white/10">
              + Insertar nombre
            </button>
          </span>
          <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={11} className={input + " resize-y"} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Si no tenemos el nombre, usar</span>
          <input value={fallback} onChange={(e) => setFallback(e.target.value)} className={input} placeholder='(vacío) → "Hola ,"   ·   ej. "amigo"' />
        </label>
        <div className="grid sm:grid-cols-[1fr_auto] gap-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} className={input} placeholder="Tu correo para una prueba" inputMode="email" />
          <button
            type="button"
            onClick={() => run(true)}
            disabled={pending || !testTo || !subject || !body.trim()}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-[#7cc4ff55] hover:bg-white/10 disabled:opacity-50 font-semibold"
          >
            <Eye className="w-4 h-4" /> Enviar prueba
          </button>
        </div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending || !subject || !body.trim() || count === 0 || !setup.resend}
            className="flex items-center justify-center gap-2 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 font-bold"
          >
            <Megaphone className="w-4 h-4" /> Enviar campaña a {count} contactos
          </button>
        ) : (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4 flex flex-col gap-3">
            <p className="text-sm">
              ¿Enviar <b>&ldquo;{subject}&rdquo;</b> a <b>{count}</b> contactos de <b>{segment}</b>? Esto no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => run(false)} disabled={pending} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 font-bold">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Sí, enviar
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="px-5 py-2.5 rounded-full border border-[#7cc4ff55] hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-[#7cc4ff33] p-4" style={glass}>
          <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff] mb-2">Vista previa</p>
          <p className="text-sm mb-2 truncate">
            <span className="text-sky-text/60">Asunto:</span> {subject || "—"}
          </p>
          <iframe
            title="Vista previa"
            sandbox=""
            className="w-full h-[420px] rounded-xl bg-white"
            srcDoc={previewHtml(body, adminName, `Pro-DG · ${setup.postal ? "(tu dirección postal)" : "⚠ falta dirección postal"}<br>Cancelar suscripción / Unsubscribe`)}
          />
        </div>
        <div className="rounded-2xl border border-[#7cc4ff33] p-5" style={glass}>
          <h3 className="font-display font-bold mb-2">Campañas enviadas</h3>
          <ul className="divide-y divide-white/5">
            {campaigns.map((c) => (
              <li key={c.id} className="py-2 text-sm flex justify-between gap-3">
                <span className="truncate">{c.subject}</span>
                <span className="text-xs text-sky-text/60 shrink-0">
                  {c.segment} · {c.recipients} · {c.when}
                </span>
              </li>
            ))}
            {campaigns.length === 0 && <li className="py-6 text-center text-sm text-sky-text/60">Aún no has enviado campañas.</li>}
          </ul>
          <p className="text-[11px] text-sky-text/50 mt-2">Aperturas, clics y bajas: en Resend → Broadcasts.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function MailCenter({
  setup,
  inbox: inbox0,
  sent: sent0,
  campaigns: camps0,
  contacts: contacts0,
  compose,
  adminName,
}: {
  setup: Setup;
  inbox: (InMail & { when: string })[];
  sent: (OutMail & { when: string })[];
  campaigns: (Campaign & { when: string })[];
  contacts: LocalContact[];
  compose: { to: string; subject: string };
  adminName: string;
}) {
  const [tab, setTab] = useState<Tab>(compose.to ? "compose" : "inbox");
  const [inbox, setInbox] = useState(inbox0);
  const [sent, setSent] = useState(sent0);
  const [campaigns, setCampaigns] = useState(camps0);
  const [contacts, setContacts] = useState(contacts0);

  useEffect(() => {
    // Drop ?to=&subject= from the address bar once used.
    if (compose.to) window.history.replaceState(null, "", "/agentes/correo");
  }, [compose.to]);

  const unread = inbox.filter((m) => !m.read).length;
  const addSent = (m: { to: string; subject: string; body: string }) =>
    setSent((s) => [{ id: String(Date.now()), to: m.to.split(/[,;\s]+/).filter(Boolean), subject: m.subject, body: m.body, createdAt: Date.now(), kind: "email", when: "ahora" }, ...s]);

  const missing = [
    !setup.resend && "RESEND_API_KEY y MAIL_FROM (para enviar)",
    !setup.db && "base de datos (KV_…)",
    !setup.webhook && "RESEND_WEBHOOK_SECRET (para recibir correos)",
    !setup.replyTo && "MAIL_REPLY_TO (para que las respuestas lleguen aquí)",
  ].filter(Boolean);

  const TABS: [Tab, string, React.ElementType, number?][] = [
    ["inbox", "Bandeja", Inbox, unread],
    ["compose", "Redactar", PenSquare],
    ["campaigns", "Campañas", Megaphone],
    ["contacts", "Contactos", Users, contacts.length],
    ["sent", "Enviados", Send],
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Correo Pro-DG</p>
          <h1 className="font-display font-black text-3xl md:text-4xl mt-1">Correo</h1>
          {setup.from && (
            <p className="text-sm text-sky-text/70 mt-1 break-all">
              Envías como <span className="text-white">{setup.from}</span>
              {setup.replyTo && (
                <>
                  {" "}· Las respuestas llegan a <span className="text-white">{setup.replyTo}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {missing.length > 0 && (
        <div className="mb-5">
          <Notice kind="warn">Falta configurar: {missing.join(" · ")}.</Notice>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
        {TABS.map(([id, text, Icon, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors " +
              (tab === id ? "bg-electric text-white" : "border border-[#7cc4ff40] text-sky-text/80 hover:text-white")
            }
          >
            <Icon className="w-4 h-4" /> {text}
            {n ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-white/20 text-[11px] font-bold flex items-center justify-center">{n}</span> : null}
          </button>
        ))}
      </div>

      {tab === "inbox" && <InboxView items={inbox} setItems={setInbox} onSent={addSent} />}
      {tab === "compose" && (
        <div className="max-w-3xl">
          <Composer title="Nuevo correo" initial={{ to: compose.to, subject: compose.subject }} onSent={addSent} />
        </div>
      )}
      {tab === "campaigns" && (
        <CampaignsView contacts={contacts} campaigns={campaigns} setup={setup} adminName={adminName} onDone={(c) => setCampaigns((x) => [c, ...x])} />
      )}
      {tab === "contacts" && <ContactsView contacts={contacts} setContacts={setContacts} ready={setup.resend} />}
      {tab === "sent" && (
        <div className="rounded-2xl border border-[#7cc4ff33] divide-y divide-white/5" style={glass}>
          {sent.map((m) => (
            <details key={m.id} className="px-5 py-3 group">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.subject}</span>
                  <span className="block text-xs text-sky-text/60 truncate">Para: {m.to.join(", ")}</span>
                </span>
                <span className="text-xs text-sky-text/55 shrink-0">
                  {m.kind === "reply" ? "Respuesta · " : m.kind === "test" ? "Prueba · " : ""}
                  {m.when}
                </span>
              </summary>
              <pre className="whitespace-pre-wrap font-sans text-sm text-sky-text/85 mt-3">{m.body}</pre>
            </details>
          ))}
          {sent.length === 0 && <p className="py-12 text-center text-sm text-sky-text/60">Aún no has enviado correos desde aquí.</p>}
        </div>
      )}
    </main>
  );
}
