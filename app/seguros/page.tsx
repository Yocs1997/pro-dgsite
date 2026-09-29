import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Script from "next/script";
import InsuranceQuote from "./InsuranceQuote";

const BUSINESS = "Car Tag & Registration Services";
const TITLE = "Car Insurance Quotes | Car Tag & Registration Services";
const DESCRIPTION =
  "Compare car insurance quotes from several carriers in one form. Free quote, help in English and Spanish, drivers in all 50 states. Call (240) 256-6360.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/seguros" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/seguros",
    siteName: BUSINESS,
    type: "website",
    locale: "en_US",
    alternateLocale: ["es_US"],
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

// Structured data so search engines know who we are and what we offer. The PO box is
// intentionally not used as an address (Google asks for a physical location there).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "InsuranceAgency",
  name: BUSINESS,
  url: "https://www.pro-dg.com/seguros",
  telephone: "+1-240-256-6360",
  description: DESCRIPTION,
  areaServed: { "@type": "Country", name: "United States" },
  availableLanguage: ["English", "Spanish"],
  parentOrganization: { "@type": "Organization", name: "Pro-DG", url: "https://www.pro-dg.com" },
};

// Carriers shown in the moving strip. By default each one shows as a styled name.
// To show an official logo instead (only if you're appointed with that carrier and
// allowed to use its logo), add a file to /public/seguros/logos named after the slug,
// e.g. public/seguros/logos/progressive.svg (or .png / .webp). It's picked up automatically.
const CARRIERS: { slug: string; name: string }[] = [
  { slug: "progressive", name: "Progressive" },
  { slug: "bristol-west", name: "Bristol West" },
  { slug: "geico", name: "GEICO" },
  { slug: "state-farm", name: "State Farm" },
  { slug: "allstate", name: "Allstate" },
  { slug: "liberty-mutual", name: "Liberty Mutual" },
  { slug: "nationwide", name: "Nationwide" },
  { slug: "farmers", name: "Farmers" },
  { slug: "the-general", name: "The General" },
  { slug: "dairyland", name: "Dairyland" },
  { slug: "national-general", name: "National General" },
  { slug: "infinity", name: "Infinity" },
  { slug: "direct-auto", name: "Direct Auto" },
  { slug: "mercury", name: "Mercury" },
  { slug: "travelers", name: "Travelers" },
];

function withLogos() {
  let files: string[] = [];
  try {
    files = fs.readdirSync(path.join(process.cwd(), "public", "seguros", "logos"));
  } catch {
    /* folder missing: names only */
  }
  return CARRIERS.map((c) => {
    const file = files.find((f) => /\.(svg|png|webp|jpe?g)$/i.test(f) && f.replace(/\.[^.]+$/, "").toLowerCase() === c.slug);
    return { ...c, logo: file ? `/seguros/logos/${file}` : undefined };
  });
}

export default function SegurosPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <InsuranceQuote carriers={withLogos()} mailingAddress={process.env.MAIL_POSTAL_ADDRESS ?? ""} />

      {/* Meta Pixel Code */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1403861690984950');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src="https://www.facebook.com/tr?id=1403861690984950&ev=PageView&noscript=1"
        />
      </noscript>
      {/* End Meta Pixel Code */}
    </>
  );
}
