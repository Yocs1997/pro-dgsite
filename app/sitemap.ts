import type { MetadataRoute } from "next";

// Public pages only. Add new public pages here.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.pro-dg.com";
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 0.8 },
    ...["/seguros", "/es/seguros"].map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: 1,
      // English and Spanish versions of the same quote page.
      alternates: { languages: { "en-US": `${base}/seguros`, "es-US": `${base}/es/seguros` } },
    })),
    { url: `${base}/cotizador`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
