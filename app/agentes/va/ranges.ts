// Date ranges for the VA campaign dashboard (shared by the page and its client view).

export const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "Lifetime" },
] as const;

export type RangeId = (typeof RANGES)[number]["id"];
