import type { MetadataRoute } from "next";

// Public pages only. Add new public pages here.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.pro-dg.com";
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/seguros`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cotizador`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
