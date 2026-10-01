import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { listCampaigns } from "@/app/lib/server/mail";
import { campaignStats, listTrackedEmails, webhookHealth, type CampaignStats, type TrackedEmail } from "@/app/lib/server/mail-tracking";
import AdminNav from "../AdminNav";
import { composeHref } from "../EmailButton";

export const metadata = { title: "Rendimiento de correos | Pro-DG" };

const PERIODS = [7, 30, 90] as const;

const CATEGORY_LABEL: Record<string, string> = {
  campaign: "Campañas",
  sequence: "Secuencias",
  confirmation: "Confirmaciones de cotización",
  email: "Correos individuales",
  reply: "Respuestas",
  test: "Pruebas",
};

type Status = "complained" | "bounced" | "failed" | "clicked" | "opened" | "delivered" | "delayed" | "sent";

const STATUS: Record<Status, { label: string; cls: string }> = {
  complained: { label: "Marcado como spam", cls: "bg-red-500/20 text-red-300" },
  bounced: { label: "Rebotado", cls: "bg-red-500/20 text-red-300" },
  failed: { label: "Falló", cls: "bg-red-500/20 text-red-300" },
  clicked: { label: "Clic", cls: "bg-emerald-500/20 text-emerald-300" },
  opened: { label: "Abierto", cls: "bg-sky-500/20 text-sky-200" },
  delivered: { label: "Entregado, sin abrir", cls: "bg-white/10 text-sky-text/80" },
  delayed: { label: "Demorado", cls: "bg-amber-500/20 text-amber-200" },
  sent: { label: "Enviado", cls: "bg-white/10 text-sky-text/80" },
};

function statusOf(e: TrackedEmail): Status {
  if (e.complainedAt) return "complained";
  if (e.bouncedAt) return "bounced";
  if (e.failedAt) return "failed";
  if (e.clickedAt) return "clicked";
  if (e.openedAt) return "opened";
  if (e.deliveredAt) return "delivered";
  if (e.delayedAt) return "delayed";
  return "sent";
}

const FILTERS: { id: string; label: string; match: (s: Status) => boolean }[] = [
  { id: "all", label: "Todos", match: () => true },
  { id: "unopened", label: "Sin abrir", match: (s) => s === "delivered" },
  { id: "opened", label: "Abiertos", match: (s) => s === "opened" || s === "clicked" },
  { id: "clicked", label: "Con clic", match: (s) => s === "clicked" },
  { id: "problems", label: "Rebotes y spam", match: (s) => s === "bounced" || s === "complained" || s === "failed" },
];

function when(ts: number) {
  return new Date(ts).toLocaleString("es-NI", {
    timeZone: "America/Managua", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : "—");

type Totals = { sent: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number };

function totals(list: TrackedEmail[]): Totals {
  return {
    sent: list.length,
    delivered: list.filter((e) => e.deliveredAt).length,
    opened: list.filter((e) => e.openedAt || e.clickedAt).length,
    clicked: list.filter((e) => e.clickedAt).length,
    bounced: list.filter((e) => e.bouncedAt || e.failedAt).length,
    complained: list.filter((e) => e.complainedAt).length,
  };
}

function Tile({ label, value, sub, tone = "" }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-[#7cc4ff33] p-4">
      <p className="text-xs text-sky-text/70">{label}</p>
      <p className={"font-display font-black text-3xl mt-1 " + tone}>{value}</p>
      {sub && <p className="text-xs text-sky-text/60 mt-1">{sub}</p>}
    </div>
  );
}

const th = "text-left font-medium text-sky-text/70 px-3 py-2 whitespace-nowrap";
const td = "px-3 py-2.5 whitespace-nowrap";

export default async function RendimientoPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  if (user.role !== "admin") redirect("/agentes");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const days = PERIODS.find((p) => String(p) === one(sp.d)) ?? 30;
  const filter = FILTERS.find((f) => f.id === one(sp.s)) ?? FILTERS[0];
  const href = (d: number, s: string) => `/agentes/rendimiento?d=${d}${s !== "all" ? `&s=${s}` : ""}`;

  const ready = dbReady();
  const safe = async <T,>(p: Promise<T>, fallback: T) => {
    try {
      return await p;
    } catch {
      return fallback;
    }
  };
  const [tracked, campaigns] = ready ? await Promise.all([safe(listTrackedEmails(1000), []), safe(listCampaigns(), [])]) : [[], []];
  const stats: Record<string, CampaignStats> = ready ? await safe(campaignStats(campaigns.map((c) => c.id)), {}) : {};
  const hooks = ready ? await safe(webhookHealth(), []) : [];
  const hook = new Map(hooks.map((h) => [h.type, h]));
  const gotDelivery = hook.has("email.delivered") || hook.has("email.sent");

  const since = Date.now() - days * 24 * 3600 * 1000;
  const inPeriod = tracked.filter((e) => e.sentAt >= since);
  const real = inPeriod.filter((e) => e.category !== "test");
  const t = totals(real);
  const unopened = real.filter((e) => statusOf(e) === "delivered").length;

  const categories = Object.keys(CATEGORY_LABEL)
    .map((cat) => ({ cat, t: totals(inPeriod.filter((e) => e.category === cat)) }))
    .filter((r) => r.t.sent > 0);

  const rows = inPeriod.filter((e) => filter.match(statusOf(e))).slice(0, 100);

  return (
    <>
      <AdminNav active="/agentes/rendimiento" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-white">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">Correo Pro-DG</p>
            <h1 className="font-display font-black text-3xl md:text-4xl mt-1">Rendimiento</h1>
            <p className="text-sm text-sky-text/70 mt-1">Entregas, aperturas, clics, rebotes y quejas de spam de tus correos.</p>
          </div>
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <a
                key={p}
                href={href(p, filter.id)}
                className={
                  "px-4 py-2 rounded-full text-sm font-medium " +
                  (p === days ? "bg-electric text-white" : "border border-[#7cc4ff40] text-sky-text/80 hover:text-white")
                }
              >
                {p} días
              </a>
            ))}
          </div>
        </div>

        {!ready && (
          <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
            Falta configurar la base de datos (KV_…).
          </div>
        )}
        {ready && tracked.length === 0 && (
          <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100 leading-relaxed">
            Aún no hay datos. En Resend → Webhooks, abre el webhook <span className="font-mono">https://www.pro-dg.com/api/resend/inbound</span> y
            activa los eventos <span className="font-mono">email.sent, email.delivered, email.delivery_delayed, email.opened, email.clicked,
            email.bounced, email.complained, email.failed</span>. Para ver aperturas y clics, activa también Open tracking y Click tracking en
            Resend → Domains. Solo se registran los correos enviados después de activarlo.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          <Tile label="Enviados" value={t.sent} sub={`últimos ${days} días`} />
          <Tile label="Entregados" value={pct(t.delivered, t.sent)} sub={`${t.delivered} de ${t.sent}`} />
          <Tile label="Abiertos" value={pct(t.opened, t.delivered)} sub={`${t.opened} de los entregados`} />
          <Tile label="Con clic" value={pct(t.clicked, t.delivered)} sub={`${t.clicked} de los entregados`} tone="text-emerald-300" />
          <Tile label="Rebotados" value={pct(t.bounced, t.sent)} sub={`${t.bounced} correos`} tone={t.bounced ? "text-red-300" : ""} />
          <Tile label="Marcados como spam" value={pct(t.complained, t.delivered)} sub={`${t.complained} quejas`} tone={t.complained ? "text-red-300" : ""} />
        </div>
        <p className="text-xs text-sky-text/55 mb-8 leading-relaxed">
          {`${unopened} entregados sin abrir. `}Ningún proveedor informa si un correo cayó en la carpeta de spam; muchos &quot;sin abrir&quot; suelen ser la
          señal. Las aperturas son aproximadas (iPhone las cuenta de más; quien bloquea imágenes no se cuenta). Los clics son la señal más confiable.
          No incluye pruebas.
        </p>

        {categories.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display font-bold text-xl mb-3">Por tipo de correo</h2>
            <div className="rounded-2xl border border-[#7cc4ff33] overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className={th}>Tipo</th>
                    <th className={th}>Enviados</th>
                    <th className={th}>Entregados</th>
                    <th className={th}>Abiertos</th>
                    <th className={th}>Clics</th>
                    <th className={th}>Rebotes</th>
                    <th className={th}>Spam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {categories.map(({ cat, t: c }) => (
                    <tr key={cat}>
                      <td className={td}>{CATEGORY_LABEL[cat]}</td>
                      <td className={td}>{c.sent}</td>
                      <td className={td}>{pct(c.delivered, c.sent)}</td>
                      <td className={td}>{pct(c.opened, c.delivered)}</td>
                      <td className={td}>{pct(c.clicked, c.delivered)}</td>
                      <td className={td}>{c.bounced}</td>
                      <td className={td}>{c.complained}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="font-display font-bold text-xl mb-3">Campañas</h2>
          <div className="rounded-2xl border border-[#7cc4ff33] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <th className={th}>Campaña</th>
                  <th className={th}>Fecha</th>
                  <th className={th}>Destinatarios</th>
                  <th className={th}>Entregados</th>
                  <th className={th}>Abiertos</th>
                  <th className={th}>Clics</th>
                  <th className={th}>Rebotes</th>
                  <th className={th}>Spam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((c) => {
                  const s = stats[c.id] ?? {};
                  const sent = s.sent || c.recipients;
                  const delivered = s.delivered ?? 0;
                  const tracked = Object.keys(s).length > 0;
                  return (
                    <tr key={c.id}>
                      <td className={td + " max-w-[18rem] truncate"} title={c.subject}>
                        {c.subject}
                        <span className="block text-xs text-sky-text/55">{c.segment}</span>
                      </td>
                      <td className={td}>{when(c.createdAt)}</td>
                      <td className={td}>{sent}</td>
                      {tracked ? (
                        <>
                          <td className={td}>{pct(delivered, sent)}</td>
                          <td className={td}>{pct(s.opened ?? 0, delivered)}</td>
                          <td className={td}>{pct(s.clicked ?? 0, delivered)}</td>
                          <td className={td}>{s.bounced ?? 0}</td>
                          <td className={td}>{s.complained ?? 0}</td>
                        </>
                      ) : (
                        <td className={td + " text-sky-text/55"} colSpan={5}>
                          Sin datos (enviada antes de activar el seguimiento)
                        </td>
                      )}
                    </tr>
                  );
                })}
                {campaigns.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-sm text-sky-text/60" colSpan={8}>
                      Aún no has enviado campañas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-display font-bold text-xl">Correos recientes</h2>
            <div className="flex gap-1.5 overflow-x-auto">
              {FILTERS.map((f) => (
                <a
                  key={f.id}
                  href={href(days, f.id)}
                  className={
                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap " +
                    (f.id === filter.id ? "bg-electric text-white" : "border border-[#7cc4ff40] text-sky-text/80 hover:text-white")
                  }
                >
                  {f.label}
                </a>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#7cc4ff33] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <th className={th}>Fecha</th>
                  <th className={th}>Para</th>
                  <th className={th}>Asunto</th>
                  <th className={th}>Tipo</th>
                  <th className={th}>Estado</th>
                  <th className={th}>Aperturas</th>
                  <th className={th}>Clics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((e) => {
                  const st = STATUS[statusOf(e)];
                  const detail = e.bounce || e.failReason || (e.lastLink ? `Último clic: ${e.lastLink}` : "");
                  return (
                    <tr key={e.id}>
                      <td className={td}>{when(e.sentAt)}</td>
                      <td className={td + " max-w-[14rem] truncate"}>
                        <a href={composeHref(e.to)} title={`Escribirle a ${e.to} desde el portal`} className="hover:underline hover:text-[#7cc4ff]">
                          {e.to}
                        </a>
                      </td>
                      <td className={td + " max-w-[18rem] truncate"} title={e.subject}>
                        {e.subject}
                      </td>
                      <td className={td + " text-sky-text/70"}>{CATEGORY_LABEL[e.category] ?? e.category}</td>
                      <td className={td}>
                        <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + st.cls} title={detail || undefined}>
                          {st.label}
                        </span>
                      </td>
                      <td className={td}>{e.opens || "—"}</td>
                      <td className={td}>{e.clicks || "—"}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-sm text-sky-text/60" colSpan={7}>
                      No hay correos en este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {inPeriod.filter((e) => filter.match(statusOf(e))).length > rows.length && (
            <p className="text-xs text-sky-text/55 mt-2">Mostrando los 100 más recientes.</p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display font-bold text-xl mb-1">Eventos recibidos de Resend</h2>
          <p className="text-xs text-sky-text/60 mb-3">
            Cuándo llegó por última vez cada tipo de aviso al webhook. Si un tipo dice &quot;nunca&quot;, ese dato no llegará al panel.
          </p>
          {gotDelivery && !hook.has("email.opened") && (
            <div className="mb-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100 leading-relaxed">
              Llegan entregas pero ninguna apertura. Revisa en Resend → Domains → tu dominio de envío que <strong>Open tracking</strong> esté
              activado (y Click tracking), y en Resend → Webhooks que el evento <span className="font-mono">email.opened</span> esté marcado. Solo se
              cuentan los correos enviados después de activarlo.
            </div>
          )}
          <div className="rounded-2xl border border-[#7cc4ff33] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  <th className={th}>Evento</th>
                  <th className={th}>Último recibido</th>
                  <th className={th}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {["email.sent", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained", "email.received", "contact.updated"].map((type) => {
                  const h = hook.get(type);
                  return (
                    <tr key={type}>
                      <td className={td + " font-mono text-xs"}>{type}</td>
                      <td className={td + (h ? "" : " text-amber-200")}>{h ? when(h.last) : "nunca"}</td>
                      <td className={td}>{h?.count ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
