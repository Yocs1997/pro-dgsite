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
  ChevronDown,
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
import {
  editContact,
  importContacts,
  openMessage,
  removeCampaignRecord,
  removeContact,
  removeFromList,
  testTelegram,
  removeMessage,
  removeSent,
  sendCampaign,
  sendMessage,
  setRead,
  type ImportRow,
  type OpenedMail,
} from "../admin-actions";
import { Pencil, Save, X as XIcon } from "lucide-react";
import EmailButton from "../EmailButton";
import { MAIL_TEMPLATES, NAME_TOKEN, PRODUCT_TOKEN, fillTemplate, productLabel, type TemplateLang } from "./templates";
import type { Campaign, InMail, OutMail } from "@/app/lib/server/mail";
import type { LocalContact } from "@/app/lib/server/contacts";
import { INSURED_LABEL, normalizeInsured, normalizeLang, normalizeState, stateFromPhone, stateLabel } from "@/app/lib/contact-details";

type Setup = { resend: boolean; db: boolean; from: string; replyTo: string; postal: boolean; postalAddress: string; webhook: boolean; telegram: boolean };

/** Telegram status + "send a test message" button. */
function TelegramButton({ ready }: { ready: boolean }) {
  const [state, setState] = useState<{ busy: boolean; msg?: string; ok?: boolean }>({ busy: false });
  const run = async () => {
    setState({ busy: true });
    const r = await testTelegram();
    setState({ busy: false, ok: r.ok, msg: r.ok ? "Mensaje de prueba enviado a Telegram." : r.error });
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={state.busy}
        className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#7cc4ff40] text-sm text-sky-text/85 hover:text-white disabled:opacity-50"
        title={ready ? "Enviar un mensaje de prueba" : "Falta configurar TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID"}
      >
        {state.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Telegram: {ready ? "probar" : "sin configurar"}
      </button>
      {state.msg && <span className={"text-xs " + (state.ok ? "text-emerald-300" : "text-red-200")}>{state.msg}</span>}
    </div>
  );
}
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

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Same look as the real email template (for previews).
function previewHtml(body: string, name: string, footer?: string) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paras = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${esc(p).replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" style="color:#0096FF">${u}</a>`).replace(/\n/g, "<br>")}</p>`)
    .join("")
    .replace(/\{\{\s*(nombre|name)\s*\}\}/gi, esc(name));
  return `<body style="margin:0;background:#eef3fa;font-family:Arial,sans-serif;color:#10213d"><div style="max-width:600px;margin:16px auto;background:#fff;border-radius:14px;overflow:hidden">
<div style="background:#0B2B5E;padding:18px 24px;font-size:20px;font-weight:800;color:#fff">Pro<span style="color:#33aaff">-DG</span></div>
<div style="padding:24px;font-size:15px">${paras || '<p style="color:#8a97aa">Tu mensaje aparecerá aquí…</p>'}</div>
${footer ? `<div style="padding:14px 24px;background:#f5f8fc;font-size:12px;color:#5b6b82">${footer}</div>` : ""}</div></body>`;
}

const GREETING = { es: "Hola {{nombre}},\n\n", en: "Hi {{name}},\n\n" } as const;

// Default footer sentence (the postal address and unsubscribe link are always added).
const FOOTER_TEXT = {
  es: "Recibes este correo porque recientemente mostraste interés en obtener un seguro de auto.",
  en: "You're receiving this email because you recently showed interest in getting car insurance.",
} as const;
const UNSUB = { es: "Cancelar suscripción", en: "Unsubscribe" } as const;

// ─── Compose (also used for replies) ─────────────────────────────────────────

function Composer({
  initial,
  onSent,
  onCancel,
  title,
  templates,
}: {
  initial: { to: string; subject: string; body?: string; inReplyTo?: string };
  onSent: (m: { to: string; subject: string; body: string }) => void;
  onCancel?: () => void;
  title: string;
  templates?: { contacts: LocalContact[]; agentName: string; services: Record<string, string> }; // new emails only: ready-made subject + message
}) {
  const [to, setTo] = useState(initial.to);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body ?? "");
  const [tplId, setTplId] = useState("");
  const [tplLang, setTplLang] = useState<TemplateLang | null>(null); // null = follow the contact's language
  const [filled, setFilled] = useState(""); // last message a template wrote, to notice hand edits

  // Each address gets its own email. The first recipient's contact sets the default language.
  const recipients = Array.from(new Set(to.split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)));
  const contact = templates?.contacts.find((c) => c.email.toLowerCase() === recipients[0]);
  const lang: TemplateLang = tplLang ?? contact?.lang ?? "en";
  const usesName = (subject + body).toLowerCase().includes(NAME_TOKEN);
  const usesProduct = (subject + body).toLowerCase().includes(PRODUCT_TOKEN);
  // What {producto} becomes for each person: the service on their lead, unless typed here.
  const [productEdits, setProductEdits] = useState<Record<string, string>>({});
  const productFor = (email: string) => productEdits[email] ?? productLabel(templates?.services[email] ?? "", lang);

  const applyTemplate = (id: string, l: TemplateLang) => {
    const tpl = MAIL_TEMPLATES.find((t) => t.id === id);
    if (!tpl || !templates) return;
    if (body.trim() && body !== filled && !window.confirm("Esto reemplaza el asunto y el mensaje que escribiste. ¿Continuar?")) return;
    const r = fillTemplate(tpl[l], { agent: templates.agentName });
    setTplId(id);
    setSubject(r.subject);
    setBody(r.body);
    setFilled(r.body);
  };
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setMsg(null);
      const products = usesProduct ? Object.fromEntries(recipients.map((e) => [e, productFor(e)])) : undefined;
      const r = await sendMessage({ to, subject, body, inReplyTo: initial.inReplyTo, products });
      if (r.ok) {
        r.sent.forEach(onSent);
        if (r.failed.length) {
          // Keep the message so the ones that failed can be retried.
          setMsg({ kind: "err", text: `Enviado a ${r.sent.length}. No se pudo enviar a: ${r.failed.join(", ")}. Quedaron en "Para" para reintentar.` });
          setTo(r.failed.join(", "));
          return;
        }
        setMsg({ kind: "ok", text: r.sent.length > 1 ? `Enviado a ${r.sent.length} personas, un correo por separado para cada una.` : "Correo enviado." });
        setBody("");
        setTplId("");
        setProductEdits({});
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
        <input value={to} onChange={(e) => setTo(e.target.value)} className={input} placeholder="cliente@correo.com (varios separados por coma: cada uno recibe su propio correo)" inputMode="email" />
      </label>
      {templates && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Plantilla</span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tplId}
              onChange={(e) => (e.target.value ? applyTemplate(e.target.value, lang) : setTplId(""))}
              className={input + " flex-1 min-w-56 bg-[#0F3470]"}
              aria-label="Plantilla"
            >
              <option value="">Sin plantilla (escribir desde cero)</option>
              {MAIL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              {(["en", "es"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setTplLang(l);
                    setProductEdits({});
                    if (tplId) applyTemplate(tplId, l);
                  }}
                  className={"px-3 py-2 rounded-full text-xs font-medium " + (lang === l ? "bg-electric" : "border border-[#7cc4ff40] text-sky-text/80 hover:text-white")}
                >
                  {l === "en" ? "Inglés" : "Español"}
                </button>
              ))}
            </div>
          </div>
          <span className="text-[11px] text-sky-text/55">Puedes editar todo antes de enviar.</span>
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Asunto</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Mensaje</span>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={input + " resize-y min-h-40"} placeholder="Escribe tu mensaje. Deja una línea en blanco entre párrafos." />
      </label>
      {usesProduct && recipients.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Producto o servicio ({PRODUCT_TOKEN})</span>
          {recipients.map((e) => (
            <label key={e} className="flex flex-wrap items-center gap-2 text-sm">
              {recipients.length > 1 && <span className="w-56 truncate text-sky-text/75">{e}</span>}
              <input
                value={productFor(e)}
                onChange={(ev) => setProductEdits((p) => ({ ...p, [e]: ev.target.value }))}
                className={input + " flex-1 min-w-48 !py-2"}
                aria-label={`Producto para ${e}`}
              />
              <span className="text-[11px] text-sky-text/55">{templates?.services[e] ? "Tomado de su lead" : "No sabemos qué pidió: revísalo"}</span>
            </label>
          ))}
          <span className="text-[11px] text-sky-text/55">Así saldrá en el asunto y el mensaje en lugar de {PRODUCT_TOKEN}. Puedes corregirlo.</span>
        </div>
      )}
      {(recipients.length > 1 || usesName) && (
        <p className="text-xs text-sky-text/70">
          {recipients.length > 1 && `Se envían ${recipients.length} correos por separado: nadie ve las otras direcciones. `}
          {usesName &&
            (recipients.length === 1 && templates
              ? `${NAME_TOKEN} saldrá con su nombre${contact?.firstName ? `: ${contact.firstName}` : " (no lo tenemos: el saludo sale sin nombre)"}.`
              : `${NAME_TOKEN} se cambia por el nombre de cada persona (si no lo tenemos, se omite).`)}
        </p>
      )}
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={send}
          disabled={pending || !to.trim() || !subject.trim() || !body.trim() || (usesProduct && recipients.some((e) => !productFor(e).trim()))}
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
              <div className="flex flex-col gap-2">
                <p className="text-xs text-sky-text/70 flex flex-wrap gap-2">
                  {mail.attachments.map((a, i) =>
                    a.url ? (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir o descargar"
                        className="flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-1 text-[#7cc4ff]"
                      >
                        <Paperclip className="w-3 h-3" /> {a.filename}
                        {a.size ? <span className="text-sky-text/55">· {a.size > 1048576 ? `${(a.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(a.size / 1024))} KB`}</span> : null}
                      </a>
                    ) : (
                      <span key={i} className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1" title="No se pudo obtener el archivo. Cierra y abre el correo de nuevo.">
                        <Paperclip className="w-3 h-3" /> {a.filename}
                      </span>
                    )
                  )}
                </p>
                {mail.attachments.some((a) => a.url && a.contentType.startsWith("image/")) && (
                  <div className="flex flex-wrap gap-2">
                    {mail.attachments
                      .filter((a) => a.url && a.contentType.startsWith("image/"))
                      .map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" title={`${a.filename} (abrir completa)`} className="block rounded-lg overflow-hidden bg-black/30 hover:ring-2 ring-[#33aaff]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.url} alt={a.filename} className="h-32 w-auto max-w-[16rem] object-cover" />
                        </a>
                      ))}
                  </div>
                )}
              </div>
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
  const iPhone = find(/tel|phone|cel|m[oó]vil|whats/);
  const iState = find(/^estado$|^state$|^st$|^provincia$/);
  const iVehicle = find(/veh[ií]culo|vehicle|^car$|^auto$|^carro$/);
  const iYear = find(/^a[nñ]o$|^year$/);
  const iMake = find(/^marca$|^make$/);
  const iModel = find(/^modelo$|^model$/);
  const iLang = find(/idioma|^lang|language/);
  const iIns = find(/seguro|insur|asegurado/);
  const cell = (cells: string[], i: number) => (i >= 0 ? cells[i] ?? "" : "");

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
    const vehicle = cell(cells, iVehicle) || [cell(cells, iYear), cell(cells, iMake), cell(cells, iModel)].filter(Boolean).join(" ");
    rows.push({
      email,
      firstName: first.trim(),
      lastName: last.trim(),
      phone: cell(cells, iPhone),
      state: cell(cells, iState),
      vehicle: vehicle.trim(),
      lang: cell(cells, iLang),
      insured: cell(cells, iIns),
    });
  }
  return { rows, invalid };
}

function ContactRow({ c, onChange, onRemove }: { c: LocalContact; onChange: (c: LocalContact) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(c.firstName);
  const [last, setLast] = useState(c.lastName);
  const [phone, setPhone] = useState(c.phone ?? "");
  const [state, setState] = useState(c.state ?? "");
  const [vehicle, setVehicle] = useState(c.vehicle ?? "");
  const [lang, setLang] = useState<string>(c.lang ?? "");
  const [insured, setInsured] = useState(c.insured ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const small = "w-full rounded-lg border border-[#7cc4ff40] bg-white/[0.06] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#33aaff]";

  const save = async () => {
    setBusy(true);
    setErr(null);
    const r = await editContact(c.email, first, last, { phone, state, vehicle, lang, insured });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    const d = r.details;
    setState(d.state ?? "");
    onChange({
      email: c.email,
      segments: c.segments,
      addedAt: c.addedAt,
      firstName: first.trim(),
      lastName: last.trim(),
      ...d,
    });
    setEditing(false);
  };
  const del = async () => {
    if (!confirm(`¿Eliminar a ${c.email}? Ya no recibirá campañas.`)) return;
    setBusy(true);
    const r = await removeContact(c.email);
    setBusy(false);
    if (r.ok) onRemove();
    else setErr(r.error);
  };

  return (
    <li className="py-2 text-sm">
      {editing ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-sky-text/60 truncate">{c.email}</p>
          <div className="grid grid-cols-2 gap-2">
            <input className={small} value={first} onChange={(e) => setFirst(e.target.value)} placeholder="Nombre" aria-label="Nombre" />
            <input className={small} value={last} onChange={(e) => setLast(e.target.value)} placeholder="Apellido" aria-label="Apellido" />
            <input className={small} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" aria-label="Teléfono" />
            <input
              className={small}
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder={stateFromPhone(phone) ? `Estado (por teléfono: ${stateFromPhone(phone)})` : "Estado (NY, Florida…)"}
              aria-label="Estado"
            />
            <input className={small + " col-span-2"} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Vehículo (2019 Honda Civic)" aria-label="Vehículo" />
            <select className={small} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Idioma">
              <option value="" className="bg-[#0B2B5E]">Idioma: sin dato</option>
              <option value="es" className="bg-[#0B2B5E]">Español</option>
              <option value="en" className="bg-[#0B2B5E]">English</option>
            </select>
            <select className={small} value={insured} onChange={(e) => setInsured(e.target.value)} aria-label="Seguro">
              <option value="" className="bg-[#0B2B5E]">Seguro: sin dato</option>
              <option value="yes" className="bg-[#0B2B5E]">Con seguro</option>
              <option value="lapsed" className="bg-[#0B2B5E]">Vencido</option>
              <option value="no" className="bg-[#0B2B5E]">Sin seguro</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setEditing(false)} disabled={busy} className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#7cc4ff55] text-xs">
              <XIcon className="w-3.5 h-3.5" /> Cancelar
            </button>
            <button type="button" onClick={save} disabled={busy} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs font-bold">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}</p>
            <p className="text-xs text-sky-text/60 truncate">{c.email}</p>
            {(c.state || c.vehicle || c.phone || c.insured) && (
              <p className="text-[11px] text-sky-text/55 truncate">
                {[
                  c.state && `${stateLabel(c.state)}${c.stateGuessed ? " (por teléfono)" : ""}`,
                  c.vehicle,
                  c.phone,
                  c.insured && INSURED_LABEL[c.insured],
                  c.lang && c.lang.toUpperCase(),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-sky-text/60 mr-1 hidden sm:inline">{c.segments.join(", ")}</span>
            <EmailButton to={c.email} icon />
            <button type="button" title="Editar" onClick={() => setEditing(true)} className="p-1.5 rounded-full hover:bg-white/10 text-sky-text/70">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Eliminar" onClick={del} disabled={busy} className="p-1.5 rounded-full hover:bg-red-500/20 text-sky-text/70 hover:text-red-200">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
      {err && <p className="text-xs text-red-200 mt-1">{err}</p>}
    </li>
  );
}

/** Takes pasted / uploaded emails out of one list, without deleting the contacts. */
function RemoveFromList({
  contacts,
  setContacts,
  lists,
  ready,
}: {
  contacts: LocalContact[];
  setContacts: (f: (c: LocalContact[]) => LocalContact[]) => void;
  lists: string[];
  ready: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [list, setList] = useState("");
  const [onlyNew, setOnlyNew] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const emails = useMemo(() => parseCsv(text).rows.map((r) => r.email.toLowerCase()), [text]);
  const byEmail = useMemo(() => new Map(contacts.map((c) => [c.email.toLowerCase(), c])), [contacts]);
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const inList = emails.map((e) => byEmail.get(e)).filter((c): c is LocalContact => Boolean(c && c.segments.includes(list)));
  const older = inList.filter((c) => c.addedAt < dayAgo);
  const targets = onlyNew ? inList.filter((c) => c.addedAt >= dayAgo) : inList;

  const run = async () => {
    if (!window.confirm(`¿Quitar ${targets.length} contactos de la lista "${list}"? Los contactos no se borran; solo salen de esa lista.`)) return;
    setRunning(true);
    setResult(null);
    const todo = targets.map((c) => c.email);
    let removed = 0;
    const failed: string[] = [];
    let lastError = "";
    setProgress({ done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i += 10) {
      const batch = todo.slice(i, i + 10);
      const r = await removeFromList(batch, list);
      if (!r.ok) {
        lastError = r.error;
        failed.push(...batch);
        break;
      }
      removed += r.removed.length;
      failed.push(...r.failed);
      if (r.lastError) lastError = r.lastError;
      const gone = new Set([...r.removed, ...r.notInList]);
      setContacts((all) => all.map((c) => (gone.has(c.email.toLowerCase()) ? { ...c, segments: c.segments.filter((s) => s !== list) } : c)));
      setProgress({ done: Math.min(i + batch.length, todo.length), total: todo.length });
    }
    setRunning(false);
    if (failed.length) setResult({ kind: "err", text: `Se quitaron ${removed}. No se pudieron quitar ${failed.length}: ${lastError}` });
    else {
      setResult({ kind: "ok", text: `Listo: ${removed} contactos quitados de "${list}". Ahora puedes importarlos en la lista correcta.` });
      setText("");
    }
  };

  return (
    <div className="border-t border-white/10 pt-4 mt-1">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <span>
          <span className="block font-semibold">Quitar contactos de una lista</span>
          <span className="block text-xs text-sky-text/60">¿Importaste en la lista equivocada? Quítalos sin borrarlos.</span>
        </span>
        <ChevronDown className={"w-4 h-4 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 mt-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Lista</span>
            <select value={list} onChange={(e) => setList(e.target.value)} className={input}>
              <option value="" className="bg-[#0B2B5E]">
                Elige la lista…
              </option>
              {lists.map((s) => (
                <option key={s} value={s} className="bg-[#0B2B5E]">
                  {s}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm font-semibold">
              <Upload className="w-4 h-4" /> Subir el mismo CSV
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
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className={input + " font-mono text-xs"} placeholder="O pega los correos, uno por línea" />
          {text && list && (
            <div className="text-sm text-sky-text/80 flex flex-col gap-2">
              <p>
                <b className="text-white">{emails.length}</b> correos · <b className="text-white">{inList.length}</b> están en “{list}”
                {emails.length > inList.length && <span className="text-sky-text/60"> · {emails.length - inList.length} no están en esa lista (se ignoran)</span>}
              </p>
              {older.length > 0 && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100 leading-relaxed">
                  <p>
                    {older.length} de ellos ya eran contactos antes de hoy, así que quizá ya estaban en “{list}” desde antes:{" "}
                    {older
                      .slice(0, 12)
                      .map((c) => c.firstName || c.email)
                      .join(", ")}
                    {older.length > 12 ? "…" : ""}
                  </p>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} className="accent-amber-300" />
                    Dejar a esos {older.length} en la lista (quitar solo a los agregados en las últimas 24 horas)
                  </label>
                </div>
              )}
            </div>
          )}
          {progress && running && (
            <p className="text-xs text-sky-text/70">
              {progress.done} de {progress.total} quitando…
            </p>
          )}
          {result && <Notice kind={result.kind}>{result.text}</Notice>}
          <button
            type="button"
            onClick={run}
            disabled={!ready || running || !list || targets.length === 0}
            className="flex items-center justify-center gap-2 py-3 rounded-full border border-red-400/50 text-red-100 hover:bg-red-500/15 disabled:opacity-50 font-bold"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {running ? "Quitando…" : `Quitar ${targets.length || ""} de ${list ? `“${list}”` : "la lista"}`}
          </button>
        </div>
      )}
    </div>
  );
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
  const found = useMemo(() => {
    let typed = 0,
      guessed = 0,
      vehicle = 0,
      phone = 0;
    for (const r of parsed.rows) {
      if (normalizeState(r.state ?? "")) typed++;
      else if (stateFromPhone(r.phone ?? "")) guessed++;
      if (r.vehicle) vehicle++;
      if (r.phone) phone++;
    }
    return { typed, guessed, vehicle, phone };
  }, [parsed]);

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
          const typed = normalizeState(b.state ?? "");
          const guessed = typed ? "" : stateFromPhone(b.phone ?? "");
          const keepTyped = !typed && old?.state && !old.stateGuessed;
          map.set(e, {
            ...old,
            email: e,
            firstName: b.firstName || old?.firstName || "",
            lastName: b.lastName || old?.lastName || "",
            segments: Array.from(new Set([...(old?.segments ?? []), segment])),
            addedAt: old?.addedAt ?? now,
            ...(b.phone ? { phone: b.phone } : {}),
            ...(b.vehicle ? { vehicle: b.vehicle } : {}),
            ...(normalizeLang(b.lang ?? "") ? { lang: normalizeLang(b.lang ?? "") as "es" | "en" } : {}),
            ...(normalizeInsured(b.insured ?? "") ? { insured: normalizeInsured(b.insured ?? "") } : {}),
            ...(typed ? { state: typed, stateGuessed: false } : guessed && !keepTyped ? { state: guessed, stateGuessed: true } : {}),
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
          <p className="text-xs text-sky-text/55 mt-1.5 leading-relaxed">
            Opcionales, para personalizar las secuencias: <b>telefono</b>, <b>estado</b>, <b>vehiculo</b> (o <b>año</b>, <b>marca</b>,{" "}
            <b>modelo</b>), <b>idioma</b> (es/en) y <b>seguro</b> (sí / vencido / no). Si falta el estado, se calcula con el código de área del
            teléfono. Volver a importar una lista con más columnas completa los datos sin duplicar a nadie.
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
          placeholder={"correo,nombre,apellido,telefono,estado,vehiculo,idioma,seguro\nmaria@correo.com,María,López,(718) 555-0101,NY,2019 Honda Civic,es,vencido\njose@correo.com,José,Pérez,305-555-0199,,2021 Toyota Corolla,en,sí"}
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
            {parsed.rows.length > 0 && (found.typed || found.guessed || found.vehicle || found.phone) ? (
              <span className="block text-xs text-sky-text/65 mt-1">
                Con estado: {found.typed + found.guessed}
                {found.guessed ? ` (${found.guessed} calculado por el teléfono)` : ""} · Con vehículo: {found.vehicle} · Con teléfono: {found.phone}
              </span>
            ) : null}
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

        <RemoveFromList contacts={contacts} setContacts={setContacts} lists={segments.map(([s]) => s)} ready={ready} />
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
            <ContactRow
              key={c.email}
              c={c}
              onChange={(n) => setContacts((list) => list.map((x) => (x.email === n.email ? n : x)))}
              onRemove={() => setContacts((list) => list.filter((x) => x.email !== c.email))}
            />
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
  onRemove,
}: {
  contacts: LocalContact[];
  campaigns: (Campaign & { when: string })[];
  setup: Setup;
  adminName: string;
  onDone: (c: Campaign & { when: string }) => void;
  onRemove: (id: string) => void;
}) {
  const segments = useMemo(() => {
    const m = new Map<string, number>();
    contacts.forEach((c) => c.segments.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
    return [...m.entries()];
  }, [contacts]);
  const [segment, setSegment] = useState(segments[0]?.[0] ?? "Leads");
  const [subject, setSubject] = useState("");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [body, setBody] = useState<string>(GREETING.es);
  const [fallback, setFallback] = useState("");
  const [footerText, setFooterText] = useState<string>(FOOTER_TEXT.es);
  const [testTo, setTestTo] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const count = segments.find(([s]) => s === segment)?.[1] ?? 0;

  const token = lang === "es" ? "{{nombre}}" : "{{name}}";
  const insertName = () => {
    const el = bodyRef.current;
    if (!el) return setBody((b) => b + token);
    const { selectionStart: a, selectionEnd: z } = el;
    setBody((b) => b.slice(0, a) + token + b.slice(z));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  };

  const switchLang = (l: "es" | "en") => {
    setLang(l);
    // Swap the footer sentence too, unless you've customized it.
    setFooterText((f) => (f === FOOTER_TEXT.es || f === FOOTER_TEXT.en || !f.trim() ? FOOTER_TEXT[l] : f));
    // Swap the greeting line if it's still the default one.
    setBody((b) => {
      const other = l === "es" ? GREETING.en : GREETING.es;
      return b.startsWith(other.trim()) ? GREETING[l] + b.slice(other.trim().length).replace(/^\n+/, "") : b;
    });
  };

  const run = (test: boolean) =>
    start(async () => {
      setMsg(null);
      const r = await sendCampaign({ segment, subject, body, fallbackName: fallback, lang, footerText, ...(test ? { testTo } : {}) });
      setConfirming(false);
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      if (r.test) setMsg({ kind: "ok", text: `Prueba enviada a ${testTo}. Revisa cómo se ve.` });
      else {
        setMsg({ kind: "ok", text: `¡Campaña enviada a la lista "${segment}"! Resend la está entregando.` });
        onDone({ id: String(Date.now()), name: subject, subject, segment, createdAt: Date.now(), recipients: count, lang, when: "ahora" });
        setSubject("");
        setBody(GREETING[lang]);
      }
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-[#7cc4ff33] p-5 sm:p-6 flex flex-col gap-4" style={glass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-bold text-xl">Nueva campaña</h2>
          <div role="radiogroup" aria-label="Idioma del correo" className="flex rounded-full border border-[#7cc4ff40] p-1">
            {([
              ["es", "Español"],
              ["en", "English"],
            ] as const).map(([l, text]) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                onClick={() => switchLang(l)}
                className={"px-4 py-1.5 rounded-full text-sm font-semibold transition-colors " + (lang === l ? "bg-electric text-white" : "text-sky-text/75 hover:text-white")}
              >
                {text}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-sky-text/60 -mt-2">
          {lang === "es"
            ? "El pie del correo y el enlace de baja irán en español."
            : "The footer and unsubscribe link will be in English."}
        </p>
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
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} placeholder={lang === "es" ? "Ej. ¿Ya cotizaste tu seguro de auto este año?" : "e.g. Have you compared car insurance this year?"} />
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
          <input value={fallback} onChange={(e) => setFallback(e.target.value)} className={input} placeholder={lang === "es" ? '(vacío) → "Hola ,"   ·   ej. "amigo"' : '(empty) → "Hi ,"   ·   e.g. "there"'} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Texto del pie de correo</span>
            {footerText !== FOOTER_TEXT[lang] && (
              <button type="button" onClick={() => setFooterText(FOOTER_TEXT[lang])} className="text-xs text-[#7cc4ff] hover:underline">
                Restablecer
              </button>
            )}
          </span>
          <textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} rows={2} maxLength={300} className={input + " resize-none text-sm"} />
          <span className="text-[11px] text-sky-text/50">Tu dirección postal y el enlace de baja se agregan siempre (lo exige la ley).</span>
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
            srcDoc={previewHtml(
              body,
              adminName,
              `Pro-DG · ${setup.postalAddress ? escHtml(setup.postalAddress) : "⚠ falta dirección postal (MAIL_POSTAL_ADDRESS)"}<br>${escHtml(
                footerText || FOOTER_TEXT[lang]
              )} <u>${UNSUB[lang]}</u>`
            )}
          />
        </div>
        <div className="rounded-2xl border border-[#7cc4ff33] p-5" style={glass}>
          <h3 className="font-display font-bold mb-2">Campañas enviadas</h3>
          <ul className="divide-y divide-white/5">
            {campaigns.map((c) => (
              <li key={c.id} className="py-2 text-sm flex items-center justify-between gap-3">
                <span className="truncate">{c.subject}</span>
                <span className="flex items-center gap-1 text-xs text-sky-text/60 shrink-0">
                  {c.lang ? c.lang.toUpperCase() + " · " : ""}{c.segment} · {c.recipients} · {c.when}
                  <button
                    type="button"
                    title="Quitar del historial"
                    onClick={async () => {
                      if (!confirm("¿Quitar esta campaña del historial? (El correo ya enviado no se puede recuperar.)")) return;
                      const r = await removeCampaignRecord(c.id);
                      if (r.ok) onRemove(c.id);
                    }}
                    className="ml-1 p-1 rounded-full hover:bg-red-500/20 hover:text-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
  services,
  adminName,
}: {
  setup: Setup;
  inbox: (InMail & { when: string })[];
  sent: (OutMail & { when: string })[];
  campaigns: (Campaign & { when: string })[];
  contacts: LocalContact[];
  compose: { to: string; subject: string };
  services: Record<string, string>; // lowercase email -> the service that lead asked for
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
        <TelegramButton ready={setup.telegram} />
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
          <Composer title="Nuevo correo" initial={{ to: compose.to, subject: compose.subject }} onSent={addSent} templates={{ contacts, agentName: adminName, services }} />
        </div>
      )}
      {tab === "campaigns" && (
        <CampaignsView
          contacts={contacts}
          campaigns={campaigns}
          setup={setup}
          adminName={adminName}
          onDone={(c) => setCampaigns((x) => [c, ...x])}
          onRemove={(id) => setCampaigns((x) => x.filter((c) => c.id !== id))}
        />
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
                <span className="flex items-center gap-1 text-xs text-sky-text/55 shrink-0">
                  {m.kind === "reply" ? "Respuesta · " : m.kind === "test" ? "Prueba · " : ""}
                  {m.when}
                  <button
                    type="button"
                    title="Eliminar del registro"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!confirm("¿Eliminar este correo del registro de enviados?")) return;
                      const r = await removeSent(m.id);
                      if (r.ok) setSent((list) => list.filter((x) => x.id !== m.id));
                    }}
                    className="ml-1 p-1 rounded-full hover:bg-red-500/20 hover:text-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
