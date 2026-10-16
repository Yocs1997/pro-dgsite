"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Download, Filter, Phone, X } from "lucide-react";
import type { MetaReport } from "@/app/lib/server/meta-ads";
import { BRAND, VA_DISPOSITIONS, type Answers } from "@/app/va-cash-out/model";
import { RANGES, type RangeId } from "./ranges";
import VaLeadDetail from "./VaLeadDetail";

export type VaRow = {
  id: string;
  code: string;
  createdAt: number;
  when: string;
  status: "partial" | "qualified" | "disqualified";
  callback: boolean;
  name: string;
  phone: string;
  email: string;
  age: number;
  state: string;
  served: string;
  ownHome: string;
  wantsCash: string;
  ruledOutBy: string[];
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  adId: string;
  adName: string;
  placement: string;
  source: string;
  // Details shown when a lead is opened, and what the team adds while working it.
  firstName: string;
  lastName: string;
  answers: Answers;
  completed: string;
  callbackAt: string;
  /** Times the lead tapped "Call us" after the form, and when they first did. */
  callTaps: number;
  callTapAt: string;
  disposition: string;
  dispositionLabel: string;
  dispositionWhen: string;
  dispositionBy: string;
  notes: { at: number; by: string; text: string; when: string }[];
  editedBy: string;
  medium: string;
  landingUrl: string;
  referrer: string;
  ip: string;
  userAgent: string;
  fbclid: string;
  consentText: string;
  consentWhen: string;
};

type Level = "campaign" | "adset" | "ad";

type Agg = {
  key: string;
  name: string;
  sub: string;
  status: string;
  budget?: string;
  thumbnail?: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  landingViews: number;
  metaLeads: number;
  leads: number;
  qualified: number;
  disqualified: number;
  partial: number;
  callbacks: number;
  callTaps: number; // leads that tapped "Call us" after the form
};

const STATUS_LABEL: Record<VaRow["status"], { label: string; cls: string }> = {
  qualified: { label: "Qualified", cls: "bg-emerald-500/20 text-emerald-300" },
  disqualified: { label: "Not qualified", cls: "bg-red-500/20 text-red-300" },
  partial: { label: "Didn't finish", cls: "bg-amber-500/20 text-amber-200" },
};


function Tile({ label, value, sub, tone = "" }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-[#7cc4ff33] p-4">
      <p className="text-xs text-sky-text/70">{label}</p>
      <p className={"font-display font-black text-2xl md:text-3xl mt-1 " + tone}>{value}</p>
      {sub && <p className="text-xs text-sky-text/60 mt-1">{sub}</p>}
    </div>
  );
}

/** A list of counts with a bar each; clicking a line filters the leads by it. */
function SummaryCard({ title, rows, total, pct }: { title: string; rows: { v: string; n: number; on: boolean; click: () => void }[]; total: number; pct: (n: number, d: number) => string }) {
  return (
    <div className="rounded-2xl border border-[#7cc4ff33] p-4">
      <h3 className="font-display font-bold mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-sky-text/60">No leads in this view.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {rows.map((r) => (
            <li key={r.v}>
              <button type="button" onClick={r.click} aria-pressed={r.on} className={"w-full text-left rounded-lg px-2 py-1.5 hover:bg-white/5 " + (r.on ? "bg-white/10" : "")}>
                <span className="flex justify-between gap-3">
                  <span>{r.v}</span>
                  <span className="text-white font-semibold">
                    {r.n} <span className="text-xs font-normal text-sky-text/55">{pct(r.n, total)}</span>
                  </span>
                </span>
                <span className="mt-1 block h-1.5 rounded-full bg-white/[0.06]">
                  <span className="block h-full rounded-full bg-[#33aaff]" style={{ width: `${total ? Math.min(100, (r.n / total) * 100) : 0}%` }} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const NONE = "(no ad tracking)";

// ─── Lead filters: one dropdown per field, built from the values in the leads ──

const NOT_WORKED = "Not worked yet";
const FIELDS = {
  status: { label: "Status", get: (l: VaRow) => STATUS_LABEL[l.status].label },
  disposition: { label: "Disposition", get: (l: VaRow) => l.dispositionLabel || NOT_WORKED },
  callback: { label: "Asked for call back", get: (l: VaRow) => (l.callback ? "Yes" : "No") },
  state: { label: "State", get: (l: VaRow) => l.state || "—" },
  served: { label: "Served", get: (l: VaRow) => l.served || "No answer" },
  ownHome: { label: "Owns home", get: (l: VaRow) => l.ownHome || "No answer" },
  wantsCash: { label: "Wants cash out", get: (l: VaRow) => l.wantsCash || "No answer" },
  campaign: { label: "Campaign", get: (l: VaRow) => l.campaignName || NONE },
  adset: { label: "Ad set", get: (l: VaRow) => l.adsetName || NONE },
  ad: { label: "Ad", get: (l: VaRow) => l.adName || NONE },
  placement: { label: "Placement", get: (l: VaRow) => l.placement || "—" },
  source: { label: "Source", get: (l: VaRow) => l.source || "—" },
} as const;
type FieldId = keyof typeof FIELDS;
type Filters = Partial<Record<FieldId, string>> & { q?: string; ageMin?: string; ageMax?: string };

export default function VaDashboard({
  rangeId,
  from,
  to,
  rangeLabel,
  timezone,
  leads: initialLeads,
  meta,
  metaReady,
  metaError,
  error,
}: {
  rangeId: RangeId;
  from: string;
  to: string;
  rangeLabel: string;
  timezone: string;
  leads: VaRow[];
  meta: MetaReport | null;
  metaReady: boolean;
  metaError: string | null;
  error: string | null;
}) {
  const currency = meta?.currency ?? "USD";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n);
  const num = (n: number) => new Intl.NumberFormat("en-US").format(n);
  const per = (spend: number, n: number) => (n > 0 && spend > 0 ? money(spend / n) : "—");
  const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : "—");

  const [level, setLevel] = useState<Level>("ad");
  const [leads, setLeads] = useState(initialLeads); // edits, dispositions and notes update it in place
  const [filters, setFilters] = useState<Filters>({});
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(100);
  const [custom, setCustom] = useState({ from: from || "", to: to || "" });
  const [target, setTarget] = useState("");

  // The target cost per qualified lead is a per-browser setting.
  useEffect(() => {
    try {
      setTarget(localStorage.getItem("va_target_cpql") ?? "");
    } catch {
      /* private mode */
    }
  }, []);
  const saveTarget = (v: string) => {
    setTarget(v);
    try {
      localStorage.setItem("va_target_cpql", v);
    } catch {
      /* private mode */
    }
  };
  const goal = Number(target) > 0 ? Number(target) : 0;

  // ─── Join Meta's numbers with our leads, at the chosen level ───────────────
  const rows = useMemo(() => {
    const ads = meta?.ads ?? [];
    // Leads without ids (link without the id parameters) are matched to Meta rows by name.
    const idByName: Record<Level, Record<string, string>> = { campaign: {}, adset: {}, ad: {} };
    for (const a of ads) {
      idByName.campaign[a.campaignName] = a.campaignId;
      idByName.adset[a.adsetName] = a.adsetId;
      idByName.ad[a.adName] = a.adId;
    }
    const map = new Map<string, Agg>();
    const row = (key: string, name: string, sub: string) => {
      let r = map.get(key);
      if (!r) {
        const s = meta?.statuses[key];
        const budget = s?.dailyBudget ? `${money(s.dailyBudget)}/day` : s?.lifetimeBudget ? `${money(s.lifetimeBudget)} total` : undefined;
        r = { key, name, sub, status: s?.status ?? "", budget, thumbnail: s?.thumbnail, spend: 0, impressions: 0, linkClicks: 0, landingViews: 0, metaLeads: 0, leads: 0, qualified: 0, disqualified: 0, partial: 0, callbacks: 0, callTaps: 0 };
        map.set(key, r);
      }
      return r;
    };

    for (const a of ads) {
      const r =
        level === "campaign"
          ? row(a.campaignId, a.campaignName, "")
          : level === "adset"
            ? row(a.adsetId, a.adsetName, a.campaignName)
            : row(a.adId, a.adName, `${a.adsetName} · ${a.campaignName}`);
      r.spend += a.spend;
      r.impressions += a.impressions;
      r.linkClicks += a.linkClicks;
      r.landingViews += a.landingViews;
      r.metaLeads += a.metaLeads;
    }

    for (const l of leads) {
      const [id, name, sub] =
        level === "campaign"
          ? [l.campaignId, l.campaignName, ""]
          : level === "adset"
            ? [l.adsetId, l.adsetName, l.campaignName]
            : [l.adId, l.adName, [l.adsetName, l.campaignName].filter(Boolean).join(" · ")];
      const key = id || idByName[level][name] || (name ? `name:${name}` : NONE);
      const r = map.get(key) ?? row(key, name || NONE, name ? sub : l.source ? `source: ${l.source}` : "Visited the page without an ad link");
      r.leads++;
      if (l.status === "qualified") r.qualified++;
      if (l.status === "disqualified") r.disqualified++;
      if (l.status === "partial") r.partial++;
      if (l.callback) r.callbacks++;
      if (l.callTaps > 0) r.callTaps++;
    }
    return [...map.values()].sort((a, b) => b.spend - a.spend || b.qualified - a.qualified || b.leads - a.leads);
    // money depends on currency only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, leads, level, currency]);

  const total = rows.reduce(
    (t, r) => ({
      spend: t.spend + r.spend,
      impressions: t.impressions + r.impressions,
      linkClicks: t.linkClicks + r.linkClicks,
      landingViews: t.landingViews + r.landingViews,
    }),
    { spend: 0, impressions: 0, linkClicks: 0, landingViews: 0 }
  );
  const count = (f: (l: VaRow) => boolean) => leads.filter(f).length;
  const qualified = count((l) => l.status === "qualified");
  const callbacks = count((l) => l.callback);

  /** Scale / kill hint for an ad or ad set, from the target cost per qualified lead. */
  /** Minimum impressions (and spend of at least the target) before an ad gets Scale or Kill. */
  const SIGNAL_MIN_IMPRESSIONS = 1000;

  function signal(r: Agg): { label: string; cls: string; why: string } | null {
    if (!goal || !r.spend || r.key === NONE || r.key.startsWith("name:")) return null;
    // Too little data to judge either way: one lead more or less would flip the answer.
    if (r.impressions < SIGNAL_MIN_IMPRESSIONS || r.spend < goal) {
      const need = [r.impressions < SIGNAL_MIN_IMPRESSIONS ? `${num(SIGNAL_MIN_IMPRESSIONS)} impressions (has ${num(r.impressions)})` : "", r.spend < goal ? `${money(goal)} spent (has ${money(r.spend)})` : ""].filter(Boolean).join(" and ");
      return { label: "Wait", cls: "bg-amber-500/20 text-amber-200", why: `Not enough data yet. Needs at least ${need} before it can be judged.` };
    }
    const cpql = r.qualified ? r.spend / r.qualified : Infinity;
    if (r.qualified && cpql <= goal) return { label: "Scale", cls: "bg-emerald-500/20 text-emerald-300", why: `Cost per qualified lead ${money(cpql)} is at or under your ${money(goal)} target.` };
    if (r.spend >= goal * 2 && (cpql >= goal * 1.5 || !r.qualified))
      return { label: "Kill", cls: "bg-red-500/20 text-red-300", why: r.qualified ? `Cost per qualified lead ${money(cpql)} is 50%+ over target after spending 2× the target.` : `Spent ${money(r.spend)} (2× target) with no qualified lead.` };
    return { label: "Wait", cls: "bg-amber-500/20 text-amber-200", why: "Not enough spend yet to judge. Let it run." };
  }

  // A lead passes when it matches every filter (optionally ignoring one, for that filter's own counts).
  const passes = (l: VaRow, skip?: FieldId) => {
    for (const k of Object.keys(FIELDS) as FieldId[]) if (k !== skip && filters[k] && FIELDS[k].get(l) !== filters[k]) return false;
    if (filters.ageMin && l.age < Number(filters.ageMin)) return false;
    if (filters.ageMax && l.age > Number(filters.ageMax)) return false;
    const q = filters.q?.trim().toLowerCase();
    if (q && !`${l.code} ${l.name} ${l.phone} ${l.email} ${l.notes.map((n) => n.text).join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  };
  const shown = leads.filter((l) => passes(l));
  const active = (Object.keys(FIELDS) as FieldId[]).filter((k) => filters[k]);
  const anyFilter = active.length > 0 || Boolean(filters.q || filters.ageMin || filters.ageMax);
  const setF = (k: keyof Filters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v || undefined }));
    setLimit(100);
  };
  /** Values of one field among the leads that pass the other filters, with counts (biggest first). */
  const valuesOf = (k: FieldId): [string, number][] => {
    const m = new Map<string, number>();
    for (const l of leads) if (passes(l, k)) m.set(FIELDS[k].get(l), (m.get(FIELDS[k].get(l)) ?? 0) + 1);
    if (filters[k] && !m.has(filters[k]!)) m.set(filters[k]!, 0);
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  /** From the ads table: show that campaign / ad set / ad's leads. */
  const drill = (r: Agg) => {
    setFilters({ [level]: r.name } as Filters);
    setLimit(100);
    document.getElementById("va-leads")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const patch = (id: string, p: Partial<VaRow>) => setLeads((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const toggleOpen = (id: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const exportCsv = () => {
    const head = ["Lead", "Date", "Status", "Disposition", "Asked for call back", "Tapped call us", "Name", "Phone", "Email", "Age", "State", "Served", "Owns home", "Wants cash out", "Ruled out by", "Campaign", "Ad set", "Ad", "Placement", "Campaign id", "Ad set id", "Ad id", "Notes"];
    const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = shown.map((l) =>
      [l.code, l.when, STATUS_LABEL[l.status].label, l.dispositionLabel, l.callback ? "Yes" : "", l.callTapAt, l.name, l.phone, l.email, l.age, l.state, l.served, l.ownHome, l.wantsCash, l.ruledOutBy.join("; "), l.campaignName, l.adsetName, l.adName, l.placement, l.campaignId, l.adsetId, l.adId, l.notes.map((n) => `${n.when} ${n.by}: ${n.text}`).join(" | ")]
        .map(cell)
        .join(",")
    );
    const blob = new Blob([[head.map(cell).join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `va-leads-${rangeId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const th = "px-3 py-2.5 font-medium text-sky-text/70 whitespace-nowrap";
  const td = "px-3 py-2.5 whitespace-nowrap";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#7cc4ff]">{BRAND} · /va-cash-out</p>
          <h1 className="font-display font-black text-3xl md:text-4xl mt-1">VA campaign</h1>
          <p className="text-sm text-sky-text/70 mt-1">
            Meta spend and results next to the leads from the landing page. {rangeLabel} · {timezone}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {RANGES.filter((r) => r.id !== "custom").map((r) => (
            <a
              key={r.id}
              href={`?range=${r.id}`}
              className={"px-3 py-1.5 rounded-full text-sm border " + (r.id === rangeId ? "bg-electric border-electric text-white" : "border-[#7cc4ff33] text-sky-text/80 hover:bg-white/5")}
            >
              {r.label}
            </a>
          ))}
          <form
            className={"flex items-center gap-1.5 rounded-full border px-2 py-1 " + (rangeId === "custom" ? "border-electric bg-electric/20" : "border-[#7cc4ff33]")}
            onSubmit={(e) => {
              e.preventDefault();
              if (custom.from || custom.to) window.location.assign(`?range=custom&from=${custom.from}&to=${custom.to}`);
            }}
          >
            <span className="text-sm text-sky-text/80 pl-1">Custom</span>
            <input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="rounded-md bg-white/[0.06] px-2 py-1 text-sm [color-scheme:dark]" aria-label="From" />
            <span className="text-sky-text/50">→</span>
            <input type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="rounded-md bg-white/[0.06] px-2 py-1 text-sm [color-scheme:dark]" aria-label="To" />
            <button disabled={!custom.from && !custom.to} className="px-3 py-1 rounded-full bg-electric hover:bg-electric-light text-sm font-semibold disabled:opacity-40">
              Apply
            </button>
          </form>
        </div>
      </div>

      {error && <div className="mb-5 rounded-2xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}
      {!metaReady && (
        <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100 leading-relaxed">
          Meta isn&apos;t connected yet, so spend and clicks are missing. Leads still show below, grouped by the ad names in their links. To connect it, add{" "}
          <span className="font-mono">META_ADS_TOKEN</span> and <span className="font-mono">META_AD_ACCOUNT_ID</span> (and optionally{" "}
          <span className="font-mono">VA_META_CAMPAIGN_IDS</span>) in Vercel → Settings → Environment Variables, then redeploy.
        </div>
      )}
      {metaError && (
        <div className="mb-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="inline w-4 h-4 mr-1 -mt-0.5" /> Couldn&apos;t read Meta: {metaError}
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        <Tile label="Spend" value={meta ? money(total.spend) : "—"} />
        <Tile label="Leads" value={num(leads.length)} sub="Gave their contact info" />
        <Tile label="Qualified" value={num(qualified)} sub={pct(qualified, leads.length) + " of leads"} tone="text-emerald-300" />
        <Tile label="Cost / qualified" value={per(total.spend, qualified)} tone="text-emerald-300" />
        <Tile label="Cost / lead" value={per(total.spend, leads.length)} />
        <Tile label="Call-back requests" value={num(callbacks)} sub="Said they answered by mistake" />
        <Tile label="Link clicks" value={meta ? num(total.linkClicks) : "—"} sub={meta ? `CTR ${pct(total.linkClicks, total.impressions)}` : undefined} />
        <Tile label="Click → lead" value={meta ? pct(leads.length, total.linkClicks) : "—"} sub="Landing page conversion" />
      </div>

      {/* Performance table */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex gap-1.5">
            {(
              [
                ["campaign", "Campaigns"],
                ["adset", "Ad sets"],
                ["ad", "Ads"],
              ] as [Level, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setLevel(id)}
                className={"px-3 py-1.5 rounded-full text-sm border " + (level === id ? "bg-white/15 border-white/30" : "border-[#7cc4ff33] text-sky-text/80 hover:bg-white/5")}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-sky-text/80">
            Target cost per qualified lead
            <span className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-text/50">$</span>
              <input
                value={target}
                onChange={(e) => saveTarget(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="e.g. 40"
                className="w-24 rounded-lg border border-[#7cc4ff33] bg-white/[0.06] pl-6 pr-2 py-1.5 text-white outline-none focus:border-[#33aaff]"
              />
            </span>
          </label>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[#7cc4ff33]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left">
              <tr>
                <th className={th}>{level === "campaign" ? "Campaign" : level === "adset" ? "Ad set" : "Ad"}</th>
                <th className={th}>Status</th>
                <th className={th + " text-right"}>Spend</th>
                <th className={th + " text-right"}>Impr.</th>
                <th className={th + " text-right"}>Link clicks</th>
                <th className={th + " text-right"}>CTR</th>
                <th className={th + " text-right"}>CPC</th>
                <th className={th + " text-right"}>Leads</th>
                <th className={th + " text-right"}>Qualified</th>
                <th className={th + " text-right"}>Not qual.</th>
                <th className={th + " text-right"}>Call backs</th>
                <th className={th + " text-right"} title={'Leads that tapped "Call us" after the form'}>Call taps</th>
                <th className={th + " text-right"}>Cost / lead</th>
                <th className={th + " text-right"}>Cost / qualified</th>
                <th className={th + " text-right"} title="Lead events Meta counted from the pixel (qualified visitors)">
                  Meta leads
                </th>
                <th className={th}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-3 py-8 text-center text-sky-text/60">
                    Nothing in this date range yet.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const s = signal(r);
                return (
                  <tr
                    key={r.key}
                    onClick={() => r.leads && drill(r)}
                    title={r.leads ? "Show these leads below" : undefined}
                    className={"border-t border-[#7cc4ff1a] hover:bg-white/[0.03] " + (r.leads ? "cursor-pointer" : "")}
                  >
                    <td className={td + " max-w-[22rem]"}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        {r.thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.thumbnail} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate" title={r.name}>
                            {r.name}
                          </p>
                          {r.sub && (
                            <p className="text-xs text-sky-text/55 truncate" title={r.sub}>
                              {r.sub}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      {r.status ? <span className={"text-xs " + (r.status === "ACTIVE" ? "text-emerald-300" : "text-sky-text/60")}>{r.status.replace(/_/g, " ").toLowerCase()}</span> : <span className="text-sky-text/40">—</span>}
                      {r.budget && <p className="text-xs text-sky-text/55">{r.budget}</p>}
                    </td>
                    <td className={td + " text-right"}>{meta ? money(r.spend) : "—"}</td>
                    <td className={td + " text-right"}>{meta ? num(r.impressions) : "—"}</td>
                    <td className={td + " text-right"}>{meta ? num(r.linkClicks) : "—"}</td>
                    <td className={td + " text-right"}>{meta ? pct(r.linkClicks, r.impressions) : "—"}</td>
                    <td className={td + " text-right"}>{per(r.spend, r.linkClicks)}</td>
                    <td className={td + " text-right font-semibold"}>{r.leads}</td>
                    <td className={td + " text-right font-semibold text-emerald-300"}>{r.qualified}</td>
                    <td className={td + " text-right text-red-300/90"}>{r.disqualified}</td>
                    <td className={td + " text-right"}>{r.callbacks}</td>
                    <td className={td + " text-right"}>{r.callTaps}</td>
                    <td className={td + " text-right"}>{per(r.spend, r.leads)}</td>
                    <td className={td + " text-right font-semibold text-emerald-300"}>{per(r.spend, r.qualified)}</td>
                    <td className={td + " text-right text-sky-text/70"}>{meta ? r.metaLeads : "—"}</td>
                    <td className={td}>
                      {s ? (
                        <span title={s.why} className={"px-2 py-0.5 rounded-full text-xs font-semibold " + s.cls}>
                          {s.label}
                        </span>
                      ) : (
                        <span className="text-sky-text/40">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-sky-text/55 mt-2 leading-relaxed">
          Leads, Qualified, Call backs and Call taps (leads that tapped "Call us" after the form) come from the landing page; spend, clicks and Meta leads come from Meta. Set a target cost per qualified lead to
          see a signal once a row has at least 1,000 impressions and has spent the target: <b>Scale</b> when it&apos;s at or under target, <b>Kill</b> after spending 2× the
          target with no qualified lead (or 50%+ over target), <b>Wait</b> otherwise. Hover a signal to see why. Click a row to see its leads below.
        </p>
      </section>

      {/* Leads summary: by status and by disposition (click a line to filter) */}
      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <SummaryCard
          title="Leads by status"
          rows={[
            ...valuesOf("status").map(([v, n]) => ({ v, n, on: filters.status === v, click: () => setF("status", filters.status === v ? "" : v) })),
            {
              v: "Asked for call back",
              n: leads.filter((l) => l.callback && passes(l, "callback")).length,
              on: filters.callback === "Yes",
              click: () => setF("callback", filters.callback === "Yes" ? "" : "Yes"),
            },
          ]}
          total={leads.filter((l) => passes(l, "status")).length}
          pct={pct}
        />
        <SummaryCard
          title="Leads by disposition"
          rows={(() => {
            const counts = new Map(valuesOf("disposition"));
            return [NOT_WORKED, ...VA_DISPOSITIONS.map(([, label]) => label)]
              .filter((v) => counts.get(v))
              .map((v) => ({ v, n: counts.get(v) ?? 0, on: filters.disposition === v, click: () => setF("disposition", filters.disposition === v ? "" : v) }));
          })()}
          total={leads.filter((l) => passes(l, "disposition")).length}
          pct={pct}
        />
        <p className="lg:col-span-2 text-xs text-sky-text/55 -mt-1">Click a line to filter the leads below. The counts follow the other filters you have on.</p>
      </section>

      {/* Leads */}
      <section id="va-leads" className="scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="font-display font-bold text-2xl">
            Leads <span className="text-base font-normal text-sky-text/60">{shown.length === leads.length ? leads.length : `${shown.length} of ${leads.length}`}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={filters.q ?? ""}
              onChange={(e) => setF("q", e.target.value)}
              placeholder="Search name, phone, email, notes"
              className="w-64 rounded-full border border-[#7cc4ff33] bg-white/[0.06] px-4 py-1.5 text-sm outline-none focus:border-[#33aaff]"
            />
            <button onClick={exportCsv} disabled={!shown.length} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-electric hover:bg-electric-light disabled:opacity-40">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>

        {/* Filters: every field of the lead */}
        <div className="mb-4 rounded-2xl border border-[#7cc4ff33] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-[#7cc4ff]" />
            {(Object.keys(FIELDS) as FieldId[]).map((k) => (
              <select
                key={k}
                value={filters[k] ?? ""}
                onChange={(e) => setF(k, e.target.value)}
                className={"max-w-[13rem] rounded-full border px-3 py-1.5 text-xs bg-[#0F3470] " + (filters[k] ? "border-electric text-white" : "border-[#7cc4ff33] text-sky-text/85")}
                aria-label={FIELDS[k].label}
              >
                <option value="">{FIELDS[k].label}: all</option>
                {valuesOf(k).map(([v, n]) => (
                  <option key={v} value={v}>
                    {v} ({n})
                  </option>
                ))}
              </select>
            ))}
            <span className="flex items-center gap-1 text-xs text-sky-text/80">
              Age
              <input value={filters.ageMin ?? ""} onChange={(e) => setF("ageMin", e.target.value.replace(/\D/g, ""))} placeholder="min" aria-label="Minimum age" className="w-12 rounded-full border border-[#7cc4ff33] bg-white/[0.06] px-2 py-1.5 text-xs outline-none" />
              –
              <input value={filters.ageMax ?? ""} onChange={(e) => setF("ageMax", e.target.value.replace(/\D/g, ""))} placeholder="max" aria-label="Maximum age" className="w-12 rounded-full border border-[#7cc4ff33] bg-white/[0.06] px-2 py-1.5 text-xs outline-none" />
            </span>
            {anyFilter && (
              <button type="button" onClick={() => setFilters({})} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border border-[#7cc4ff55] hover:bg-white/10">
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
          {active.length > 0 && <p className="mt-2 text-xs text-sky-text/65">Showing: {active.map((k) => `${FIELDS[k].label} = ${filters[k]}`).join(" · ")}</p>}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[#7cc4ff33]">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-left">
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Name</th>
                <th className={th}>Phone</th>
                <th className={th}>Age · State</th>
                <th className={th}>Status</th>
                <th className={th}>Disposition</th>
                <th className={th}>Ad</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sky-text/60">
                    {leads.length ? "No leads match these filters." : "No leads here yet."}
                  </td>
                </tr>
              )}
              {shown.slice(0, limit).map((l) => {
                const isOpen = open.has(l.id);
                return (
                  <Fragment key={l.id}>
                    <tr onClick={() => toggleOpen(l.id)} className={"border-t border-[#7cc4ff1a] align-top cursor-pointer hover:bg-white/[0.03] " + (isOpen ? "bg-white/[0.04]" : "")}>
                      <td className={td}>
                        <p>{l.when}</p>
                        <p className="text-xs text-sky-text/50 font-mono">{l.code}</p>
                      </td>
                      <td className={td}>
                        <p className="font-medium">{l.name}</p>
                        {l.email && <p className="text-xs text-sky-text/60">{l.email}</p>}
                      </td>
                      <td className={td}>
                        <a href={`tel:${l.phone.replace(/\D/g, "")}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-electric-light">
                          <Phone className="w-3.5 h-3.5" /> {l.phone}
                        </a>
                      </td>
                      <td className={td}>
                        {l.age} · {l.state}
                      </td>
                      <td className={td}>
                        <span className={"px-2 py-0.5 rounded-full text-xs font-semibold " + STATUS_LABEL[l.status].cls}>{STATUS_LABEL[l.status].label}</span>
                        {l.callback && <p className="text-xs text-amber-200 mt-1">📞 Asked for call back</p>}
                        {l.callTaps > 0 && <p className="text-xs text-sky-200 mt-1">📲 Tapped &ldquo;Call us&rdquo;</p>}
                        {l.ruledOutBy.length > 0 && <p className="text-xs text-red-300/80 mt-1">{l.ruledOutBy.join(", ")}</p>}
                      </td>
                      <td className={td}>
                        {l.dispositionLabel ? <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-100">{l.dispositionLabel}</span> : <span className="text-xs text-sky-text/45">{NOT_WORKED}</span>}
                        {l.notes.length > 0 && <p className="text-xs text-sky-text/55 mt-1">📝 {l.notes.length}</p>}
                      </td>
                      <td className={td + " text-xs max-w-[16rem]"}>
                        <p className="truncate" title={l.adName}>
                          {l.adName || <span className="text-sky-text/40">{NONE}</span>}
                        </p>
                        <p className="text-sky-text/55 truncate" title={`${l.adsetName} · ${l.campaignName}`}>
                          {[l.adsetName, l.campaignName].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className={td}>
                        <ChevronDown className={"w-4 h-4 text-sky-text/60 transition-transform " + (isOpen ? "rotate-180" : "")} aria-label={isOpen ? "Collapse" : "Expand"} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-[#7cc4ff1a]">
                        <td colSpan={8} className="p-0">
                          <VaLeadDetail l={l} onChange={(p) => patch(l.id, p)} onDeleted={() => setLeads((list) => list.filter((x) => x.id !== l.id))} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {shown.length > limit && (
          <div className="flex justify-center mt-3">
            <button type="button" onClick={() => setLimit((n) => n + 100)} className="px-6 py-2 rounded-full border border-[#7cc4ff55] hover:bg-white/10 text-sm font-semibold">
              Show more ({shown.length - limit} left)
            </button>
          </div>
        )}
        <p className="text-xs text-sky-text/55 mt-2">Click a lead to open it: every detail, disposition, notes, edit and delete. Click again to close it.</p>
      </section>
    </main>
  );
}
