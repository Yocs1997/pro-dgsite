import "server-only";

// Reads ad performance from the Meta Marketing API for the VA campaign dashboard
// (/agentes/va). Read-only: nothing here changes budgets or ads.
//
// Environment variables (Vercel → Settings → Environment Variables):
//   META_ADS_TOKEN         access token with the ads_read permission (a System User token
//                          from Business Settings → System users is best: it doesn't expire)
//   META_AD_ACCOUNT_ID     the ad account that runs the campaign, e.g. act_1234567890
//   VA_META_CAMPAIGN_IDS   optional, comma-separated campaign ids: only those campaigns are
//                          shown. Without it, every campaign in the ad account is shown.
//   META_GRAPH_VERSION     optional, e.g. v26.0 (same as the lead webhook)

const GRAPH = () => `${process.env.META_GRAPH_BASE || "https://graph.facebook.com"}/${process.env.META_GRAPH_VERSION || "v26.0"}`;

export function metaAdsReady(): boolean {
  return Boolean(process.env.META_ADS_TOKEN && process.env.META_AD_ACCOUNT_ID);
}

const account = () => {
  const id = (process.env.META_AD_ACCOUNT_ID ?? "").trim();
  return id.startsWith("act_") ? id : `act_${id}`;
};

const campaignIds = () =>
  (process.env.VA_META_CAMPAIGN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

type Paged<T> = { data?: T[]; paging?: { next?: string }; error?: { message?: string } };

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.error?.message ?? `Meta API error ${res.status}`);
  return json as T;
}

/** GET an edge and follow the "next" pages (up to 20). */
async function getAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const q = new URLSearchParams({ ...params, access_token: process.env.META_ADS_TOKEN ?? "", limit: "500" });
  let url: string | undefined = `${GRAPH()}/${path}?${q}`;
  const out: T[] = [];
  for (let i = 0; url && i < 20; i++) {
    const page: Paged<T> = await get<Paged<T>>(url);
    out.push(...(page.data ?? []));
    url = page.paging?.next;
  }
  return out;
}

function campaignFilter(field: string): Record<string, string> {
  const ids = campaignIds();
  return ids.length ? { filtering: JSON.stringify([{ field, operator: "IN", value: ids }]) } : {};
}

export type AdRow = {
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  adId: string;
  adName: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  landingViews: number;
  metaLeads: number; // "Lead" events Meta counted from the pixel (qualified visitors only)
};

export type Status = { status: string; dailyBudget?: number; lifetimeBudget?: number; thumbnail?: string };

export type MetaReport = {
  currency: string;
  timezone: string;
  ads: AdRow[];
  /** effective_status (ACTIVE, PAUSED, …) and budget by campaign / ad set / ad id. */
  statuses: Record<string, Status>;
};

export type Range = { preset: "maximum" } | { since: string; until: string };

type Action = { action_type: string; value: string };
const actionCount = (list: Action[] | undefined, ...types: string[]) =>
  (list ?? []).filter((a) => types.includes(a.action_type)).reduce((n, a) => n + Number(a.value || 0), 0);

/** Account currency and time zone (dates on the dashboard follow the ad account's time zone). */
export async function metaAccount(): Promise<{ currency: string; timezone: string }> {
  const q = new URLSearchParams({ fields: "currency,timezone_name", access_token: process.env.META_ADS_TOKEN ?? "" });
  const a = await get<{ currency?: string; timezone_name?: string }>(`${GRAPH()}/${account()}?${q}`);
  return { currency: a.currency || "USD", timezone: a.timezone_name || "America/New_York" };
}

export async function metaReport(range: Range, acct: { currency: string; timezone: string }): Promise<MetaReport> {
  const time: Record<string, string> = "preset" in range ? { date_preset: range.preset } : { time_range: JSON.stringify(range) };
  const money = (v: unknown) => (v ? Number(v) / 100 : undefined); // budgets come in cents

  const [insights, campaigns, adsets, ads] = await Promise.all([
    getAll<Record<string, string> & { actions?: Action[] }>(`${account()}/insights`, {
      level: "ad",
      fields: "campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,reach,clicks,inline_link_clicks,actions",
      ...time,
      ...campaignFilter("campaign.id"),
    }),
    getAll<{ id: string; effective_status?: string; daily_budget?: string; lifetime_budget?: string }>(`${account()}/campaigns`, {
      fields: "id,effective_status,daily_budget,lifetime_budget",
      ...campaignFilter("id"),
    }),
    getAll<{ id: string; effective_status?: string; daily_budget?: string; lifetime_budget?: string }>(`${account()}/adsets`, {
      fields: "id,effective_status,daily_budget,lifetime_budget",
      ...campaignFilter("campaign.id"),
    }),
    getAll<{ id: string; effective_status?: string; creative?: { thumbnail_url?: string } }>(`${account()}/ads`, {
      fields: "id,effective_status,creative{thumbnail_url}",
      ...campaignFilter("campaign.id"),
    }),
  ]);

  const statuses: Record<string, Status> = {};
  for (const x of [...campaigns, ...adsets]) statuses[x.id] = { status: x.effective_status ?? "", dailyBudget: money(x.daily_budget), lifetimeBudget: money(x.lifetime_budget) };
  for (const x of ads) statuses[x.id] = { status: x.effective_status ?? "", thumbnail: x.creative?.thumbnail_url };

  return {
    ...acct,
    statuses,
    ads: insights.map((r) => ({
      campaignId: r.campaign_id,
      campaignName: r.campaign_name,
      adsetId: r.adset_id,
      adsetName: r.adset_name,
      adId: r.ad_id,
      adName: r.ad_name,
      spend: Number(r.spend || 0),
      impressions: Number(r.impressions || 0),
      reach: Number(r.reach || 0),
      clicks: Number(r.clicks || 0),
      linkClicks: Number(r.inline_link_clicks || 0),
      landingViews: actionCount(r.actions, "landing_page_view", "omni_landing_page_view"),
      metaLeads: actionCount(r.actions, "offsite_conversion.fb_pixel_lead"),
    })),
  };
}
