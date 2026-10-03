"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, KeyRound, Loader2, Send, ShieldCheck, Trash2, UserPlus, Users, Wand2 } from "lucide-react";
import { addUser, removeUser, setUserPassword, setUserRole, telegramDisconnect, telegramLink, setUserWhatsApp, setUserSignature } from "../user-actions";

export type UserRow = { u: string; name: string; role: "admin" | "agent"; source: "vercel" | "portal"; added: string; telegram?: boolean; whatsapp?: string; signature?: string };
type Msg = { kind: "ok" | "err"; text: string } | null;

const input =
  "w-full rounded-xl border border-[#7cc4ff40] bg-white/[0.06] px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-[#33aaff]";
const card = "rounded-2xl border border-[#7cc4ff33] p-5 sm:p-6";
const btn = "flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50";
const ROLE_LABEL = { admin: "Administrador", agent: "Agente" } as const;

/** Random, easy-to-read password (no look-alike characters). */
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-z0-9._-]/g, "") ?? "";

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const ok = msg.kind === "ok";
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={"flex items-start gap-2 rounded-xl border px-4 py-3 text-sm " + (ok ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" : "border-red-400/40 bg-red-500/15 text-red-100")}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" /> <div>{msg.text}</div>
    </div>
  );
}

function PasswordField({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div className="flex gap-2">
      <input id={id} className={input + " font-mono"} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Mínimo 10 caracteres" autoComplete="new-password" />
      <button type="button" onClick={() => onChange(generatePassword())} className={btn + " border border-[#7cc4ff40] text-sky-text/85 hover:text-white shrink-0"} title="Generar una contraseña segura">
        <Wand2 className="w-4 h-4" /> Generar
      </button>
    </div>
  );
}

/** The name this user signs emails with (Correo → Redactar templates). */
function SignatureRow({ user }: { user: UserRow }) {
  const [value, setValue] = useState(user.signature ?? "");
  const [saved, setSaved] = useState(user.signature ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await setUserSignature(user.u, value);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setSaved(r.signature);
      setValue(r.signature);
      setMsg({ ok: true, text: `Sus correos se firman como: ${r.signature || user.name}` });
    });
  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sky-text/75">Firma en correos</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={user.name}
          className="w-48 rounded-lg border border-[#7cc4ff40] bg-white/[0.06] px-3 py-1.5 outline-none focus:border-[#33aaff]"
          aria-label={`Firma en correos de ${user.name}`}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || value.trim() === saved}
          className="rounded-full border border-[#7cc4ff40] px-3 py-1.5 text-sky-text/85 hover:text-white disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {!msg && <span className="text-sky-text/55">Firma como: {saved || user.name}</span>}
      </div>
      {msg && <p className={msg.ok ? "text-emerald-300" : "text-red-200"}>{msg.text}</p>}
    </div>
  );
}

/** This user's own WhatsApp number, so leads can be forwarded to them from Facturación. */
function WhatsAppRow({ user }: { user: UserRow }) {
  const [value, setValue] = useState(user.whatsapp ? `+${user.whatsapp}` : "");
  const [saved, setSaved] = useState(user.whatsapp ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await setUserWhatsApp(user.u, value);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setSaved(r.whatsapp);
      setValue(r.whatsapp ? `+${r.whatsapp}` : "");
      setMsg({ ok: true, text: r.whatsapp ? "WhatsApp guardado." : "WhatsApp quitado." });
    });
  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sky-text/75">WhatsApp</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="8888 7777 o +1 240 555 0100"
          inputMode="tel"
          className="w-48 rounded-lg border border-[#7cc4ff40] bg-white/[0.06] px-3 py-1.5 outline-none focus:border-[#33aaff]"
          aria-label={`WhatsApp de ${user.name}`}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || value.replace(/\D/g, "") === saved.replace(/\D/g, "")}
          className="rounded-full border border-[#7cc4ff40] px-3 py-1.5 text-sky-text/85 hover:text-white disabled:opacity-40"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        {saved && <span className="text-emerald-300">✓ Se le pueden enviar leads por WhatsApp</span>}
      </div>
      {msg && <p className={msg.ok ? "text-emerald-300" : "text-red-200"}>{msg.text}</p>}
    </div>
  );
}

/** Personal Telegram for this user: connect with a one-time link, or disconnect. */
function TelegramRow({ user }: { user: UserRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  const makeLink = () =>
    start(async () => {
      setErr("");
      const r = await telegramLink(user.u);
      if (r.ok) setLink(r.link);
      else setErr(r.error);
    });
  const unlink = () =>
    window.confirm(`¿Desconectar el Telegram de ${user.name}? Dejará de recibir los leads asignados por Telegram.`) &&
    start(async () => {
      const r = await telegramDisconnect(user.u);
      if (!r.ok) setErr(r.error);
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {user.telegram ? (
          <>
            <span className="rounded-full bg-sky-500/20 text-sky-200 px-2.5 py-1">Telegram conectado ✅</span>
            <button type="button" onClick={unlink} disabled={pending} className="text-sky-text/60 hover:text-red-200 underline-offset-2 hover:underline">
              Desconectar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={makeLink}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-full border border-[#7cc4ff40] px-3 py-1.5 text-sky-text/85 hover:text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Conectar Telegram
          </button>
        )}
      </div>
      {link && (
        <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 flex flex-col gap-2">
          <p className="text-sky-100">
            Envíale este enlace a {user.name} (por ejemplo por WhatsApp). Al abrirlo y tocar <b>Start / Iniciar</b>, su Telegram queda conectado. Sirve una
            sola vez y vence en 7 días.
          </p>
          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 rounded-lg border border-[#7cc4ff40] bg-white/[0.06] px-3 py-2 font-mono text-[11px]" />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(link).then(() => setCopied(true));
              }}
              className="flex items-center gap-1 rounded-lg border border-[#7cc4ff40] px-3 hover:bg-white/10"
            >
              <Copy className="w-3.5 h-3.5" /> {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <button type="button" onClick={() => router.refresh()} className="self-start text-sky-text/70 underline-offset-2 hover:underline">
            Ya lo abrió — actualizar
          </button>
        </div>
      )}
      {err && <p className="text-red-200">{err}</p>}
    </div>
  );
}

function UserCard({ user, me }: { user: UserRow; me: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const isMe = user.u.toLowerCase() === me.toLowerCase();
  const editable = user.source === "portal";

  const run = (f: () => Promise<{ ok: true } | { ok: false; error: string }>, okText: string) =>
    start(async () => {
      setMsg(null);
      const r = await f();
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      setMsg({ kind: "ok", text: okText });
      router.refresh();
    });

  return (
    <li className="rounded-xl border border-white/10 p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold flex items-center gap-2">
            {user.name}
            {isMe && <span className="text-xs rounded-full bg-white/10 px-2 py-0.5">Tú</span>}
          </p>
          <p className="text-xs text-sky-text/65">
            Usuario: <span className="font-mono text-white">{user.u}</span>
            {user.source === "vercel" ? " · configurado en Vercel" : user.added ? ` · agregado ${user.added}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editable && !isMe ? (
            <select
              className="rounded-full border border-[#7cc4ff40] bg-[#0B2B5E] px-3 py-1.5 text-sm"
              value={user.role}
              disabled={pending}
              onChange={(e) => run(() => setUserRole(user.u, e.target.value as UserRow["role"]), "Rol actualizado.")}
              aria-label="Rol"
            >
              <option value="admin">Administrador</option>
              <option value="agent">Agente</option>
            </select>
          ) : (
            <span className={"text-xs rounded-full px-3 py-1 " + (user.role === "admin" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-sky-text/80")}>
              {ROLE_LABEL[user.role]}
            </span>
          )}
          {editable && (
            <button type="button" onClick={() => setShowPw(!showPw)} className="p-2 rounded-full hover:bg-white/10 text-sky-text/75" title="Cambiar contraseña">
              <KeyRound className="w-4 h-4" />
            </button>
          )}
          {editable && !isMe && (
            <button
              type="button"
              disabled={pending}
              onClick={() => window.confirm(`¿Quitar el acceso de ${user.name}? Se cerrará su sesión.`) && run(() => removeUser(user.u), "Usuario eliminado.")}
              className="p-2 rounded-full hover:bg-red-500/20 text-sky-text/75 hover:text-red-200"
              title="Quitar acceso"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
      <TelegramRow user={user} />
      <WhatsAppRow user={user} />
      <SignatureRow user={user} />
      {showPw && editable && (
        <div className="flex flex-col gap-2">
          <PasswordField id={`pw-${user.u}`} value={pw} onChange={setPw} />
          <button
            type="button"
            disabled={pending || pw.trim().length < 10}
            onClick={() => run(() => setUserPassword(user.u, pw), "Contraseña cambiada. Compártela con la persona por un medio privado.")}
            className={btn + " bg-electric hover:bg-electric-light self-start"}
          >
            <KeyRound className="w-4 h-4" /> Guardar contraseña
          </button>
        </div>
      )}
      <Notice msg={msg} />
    </li>
  );
}

export default function UsersView({ users, me, ready, error }: { users: UserRow[]; me: string; ready: boolean; error: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [touchedUser, setTouchedUser] = useState(false);
  const [role, setRole] = useState<UserRow["role"]>("agent");
  const [password, setPassword] = useState("");

  const submit = () =>
    start(async () => {
      setMsg(null);
      const u = username || slug(name);
      const r = await addUser({ name, username: u, role, password });
      if (!r.ok) return setMsg({ kind: "err", text: r.error });
      setMsg({
        kind: "ok",
        text: `Listo. ${name} ya puede entrar en www.pro-dg.com/agentes/login con el usuario “${u}” y la contraseña que pusiste. Compártela por un medio privado (no por el grupo de Telegram).`,
      });
      setName("");
      setUsername("");
      setTouchedUser(false);
      setPassword("");
      setRole("agent");
      router.refresh();
    });

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-white">
      <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Portal Pro-DG</p>
      <h1 className="font-display font-black text-3xl md:text-4xl mt-1 mb-6 flex items-center gap-3">
        <Users className="w-8 h-8 text-[#7cc4ff]" /> Usuarios
      </h1>

      {error && (
        <div className="mb-4">
          <Notice msg={{ kind: "err", text: error }} />
        </div>
      )}

      <section className={card + " flex flex-col gap-4 mb-6"}>
        <h2 className="font-display font-bold text-xl flex items-center gap-2">
          <UserPlus className="w-5 h-5" /> Agregar usuario
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label>
            <span className="block text-xs font-medium text-sky-text/75 mb-1.5">Nombre</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sergio Baez" />
          </label>
          <label>
            <span className="block text-xs font-medium text-sky-text/75 mb-1.5">Usuario para entrar</span>
            <input
              className={input + " font-mono"}
              value={touchedUser ? username : username || slug(name)}
              onChange={(e) => {
                setTouchedUser(true);
                setUsername(e.target.value.toLowerCase());
              }}
              placeholder="sergio"
              autoCapitalize="none"
            />
          </label>
        </div>
        <fieldset>
          <legend className="block text-xs font-medium text-sky-text/75 mb-1.5">Acceso</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {(
              [
                ["admin", "Administrador", "Todo: seguros, correo, secuencias, rendimiento, usuarios, costos y ganancias."],
                ["agent", "Agente", "Calculadora y sus propias cotizaciones. No ve costos ni ganancias de Pro-DG."],
              ] as const
            ).map(([value, label, hint]) => (
              <label
                key={value}
                className={"flex gap-3 rounded-xl border p-3 cursor-pointer " + (role === value ? "border-electric bg-electric/10" : "border-white/10")}
              >
                <input type="radio" name="role" className="mt-1 accent-[#0096FF]" checked={role === value} onChange={() => setRole(value)} />
                <span>
                  <span className="block text-sm font-semibold flex items-center gap-1.5">
                    {value === "admin" && <ShieldCheck className="w-4 h-4 text-emerald-300" />} {label}
                  </span>
                  <span className="block text-xs text-sky-text/65">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          <span className="block text-xs font-medium text-sky-text/75 mb-1.5">Contraseña</span>
          <PasswordField id="new-pw" value={password} onChange={setPassword} />
          <span className="block text-xs text-sky-text/55 mt-1.5">Cópiala antes de guardar: después no se puede ver, solo cambiar.</span>
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={!ready || pending || !name.trim() || password.trim().length < 10}
          className={btn + " bg-electric hover:bg-electric-light self-start py-3"}
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Agregar usuario
        </button>
        <Notice msg={msg} />
      </section>

      <section className={card}>
        <h2 className="font-display font-bold text-xl mb-3">Con acceso ({users.length})</h2>
        <ul className="flex flex-col gap-2">
          {users.map((u) => (
            <UserCard key={`${u.source}-${u.u}`} user={u} me={me} />
          ))}
        </ul>
        <p className="text-xs text-sky-text/55 mt-3 leading-relaxed">
          Los usuarios “configurados en Vercel” vienen de la variable PORTAL_USERS y solo se cambian allí. Quitar a alguien cierra su sesión en su próximo clic.
        </p>
      </section>
    </main>
  );
}
