// Date ranges for the VA campaign dashboard (shared by the page and its client view).

export const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "Lifetime" },
  { id: "custom", label: "Custom" },
] as const;

/** YYYY-MM-DD, or "" when it isn't a real date. */
export const isDay = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : "");

export type RangeId = (typeof RANGES)[number]["id"];
