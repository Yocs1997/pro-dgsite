import type { MetadataRoute } from "next";

// Keep the agent portal, APIs and private pages out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/agentes", "/api/", "/strategy"],
    },
    sitemap: "https://www.pro-dg.com/sitemap.xml",
    host: "https://www.pro-dg.com",
  };
}
