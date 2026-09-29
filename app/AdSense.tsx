"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// Google AdSense, only on the public marketing pages: never on the insurance
// quote page (other companies' ads next to our form) or the agent portal.
const NO_ADS = ["/seguros", "/es/seguros", "/agentes"];

export default function AdSense() {
  const path = usePathname() ?? "/";
  if (NO_ADS.some((p) => path === p || path.startsWith(`${p}/`))) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9221745662362477"
    />
  );
}
