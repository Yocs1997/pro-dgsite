import { redirect } from "next/navigation";
import { getSession } from "../_lib/auth";
import { dbReady } from "@/app/lib/server/redis";
import { listVaLeads } from "@/app/lib/server/va-leads";
import { metaAccount, metaAdsReady, metaReport, type MetaReport, type Range } from "@/app/lib/server/meta-ads";
import { optionLabel } from "@/app/va-cash-out/model";
import AdminNav from "../AdminNav";
import VaDashboard, { type VaRow } from "./VaDashboard";
import { RANGES, type RangeId } from "./ranges";

export const metadata = { title: "VA campaign | Pro-DG" };

// Meta's API can take a few seconds on a long date range.
export const maxDuration = 60;

/** YYYY-MM-DD of a moment in a time zone. */
const dayIn = (tz: string, t: number | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(t);
const shift = (day: string, days: number) => new Date(Date.parse(`${day}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

function rangeFor(id: RangeId, tz: string): Range {
  const today = dayIn(tz, new Date());
  if (id === "today") return { since: today, until: today };
  if (id === "yesterday") return { since: shift(today, -1), until: shift(today, -1) };
  if (id === "7d") return { since: shift(today, -6), until: today };
  if (id === "30d") return { since: shift(today, -29), until: today };
  return { preset: "maximum" };
}

export default async function VaCampaignPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/agentes/login");
  if (user.role !== "admin") redirect("/agentes");

  const asked = (await searchParams).range;
  const rangeId: RangeId = RANGES.some((r) => r.id === asked) ? (asked as RangeId) : "7d";

  // Meta first: its time zone decides where "today" starts for the leads too.
  let meta: MetaReport | null = null;
  let metaError: string | null = null;
  let tz = "America/New_York";
  let range = rangeFor(rangeId, tz);
  if (metaAdsReady()) {
    try {
      const acct = await metaAccount();
      tz = acct.timezone;
      range = rangeFor(rangeId, tz);
      meta = await metaReport(range, acct);
    } catch (e) {
      metaError = e instanceof Error ? e.message : "Could not read Meta.";
    }
  }

  let rows: VaRow[] = [];
  let error: string | null = null;
  if (!dbReady()) error = "The database isn't connected yet.";
  else {
    try {
      const leads = await listVaLeads(5000);
      const inRange = (t: number) => "preset" in range || (dayIn(tz, t) >= range.since && dayIn(tz, t) <= range.until);
      rows = leads
        .filter((l) => inRange(l.createdAt))
        .map((l) => ({
          id: l.id,
          code: l.code,
          createdAt: l.createdAt,
          when: new Date(l.createdAt).toLocaleString("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          status: l.status,
          callback: Boolean(l.callbackRequestedAt),
          name: `${l.contact.firstName} ${l.contact.lastName}`.trim(),
          phone: l.contact.phone,
          email: l.contact.email,
          age: l.contact.age,
          state: l.contact.state,
          served: optionLabel("served", l.answers.served),
          ownHome: optionLabel("ownHome", l.answers.ownHome),
          wantsCash: optionLabel("wantsCash", l.answers.wantsCash),
          ruledOutBy: (l.disqualifiedFor ?? []).map((id) => (id === "served" ? "Didn't serve" : id === "ownHome" ? "Doesn't own home" : "Doesn't want cash out")),
          campaignId: l.tracking.campaignId,
          campaignName: l.tracking.utmCampaign,
          adsetId: l.tracking.adsetId,
          adsetName: l.tracking.utmTerm,
          adId: l.tracking.adId,
          adName: l.tracking.utmContent,
          placement: l.tracking.placement,
          source: l.tracking.utmSource,
        }));
    } catch {
      error = "Couldn't load the leads. Reload in a moment.";
    }
  }

  return (
    <>
      <AdminNav active="/agentes/va" />
      <VaDashboard
        rangeId={rangeId}
        rangeLabel={"preset" in range ? "Lifetime" : range.since === range.until ? range.since : `${range.since} → ${range.until}`}
        timezone={tz}
        leads={rows}
        meta={meta}
        metaReady={metaAdsReady()}
        metaError={metaError}
        error={error}
      />
    </>
  );
}
