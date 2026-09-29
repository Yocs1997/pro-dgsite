import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Script from "next/script";
import InsuranceQuote from "./InsuranceQuote";
import { FAQ } from "./faq";
import type { Lang } from "./model";

// The quote page lives at two addresses: /seguros (opens in English) and
// /es/seguros (opens in Spanish). Both render this same page; the EN/ES toggle
// still works on both. hreflang links tell search engines they are translations.

const BUSINESS = "Car Tag & Registration Services";
const SITE = "https://www.pro-dg.com";
export const PATHS: Record<Lang, string> = { en: "/seguros", es: "/es/seguros" };

const SEO: Record<Lang, { title: string; description: string; locale: string; alt: string }> = {
  en: {
    title: "Car Insurance Quotes | Car Tag & Registration Services",
    description:
      "Compare car insurance quotes from several carriers in one form. Free quote, help in English and Spanish, drivers in all 50 states. Call (240) 256-6360.",
    locale: "en_US",
    alt: "es_US",
  },
  es: {
    title: "Cotiza tu seguro de auto | Car Tag & Registration Services",
    description:
      "Compara cotizaciones de seguro de auto de varias aseguradoras en un solo formulario. Cotización gratis, atención en español e inglés, en los 50 estados. Llama al (240) 256-6360.",
    locale: "es_US",
    alt: "en_US",
  },
};

export function segurosMetadata(lang: Lang): Metadata {
  const s = SEO[lang];
  return {
    title: s.title,
    description: s.description,
    alternates: {
      canonical: PATHS[lang],
      languages: { "en-US": PATHS.en, "es-US": PATHS.es, "x-default": PATHS.en },
    },
    openGraph: {
      title: s.title,
      description: s.description,
      url: PATHS[lang],
      siteName: BUSINESS,
      type: "website",
      locale: s.locale,
      alternateLocale: [s.alt],
    },
    twitter: { card: "summary", title: s.title, description: s.description },
  };
}

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

const ld = (data: object) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });

export default function SegurosPage({ lang }: { lang: Lang }) {
  const s = SEO[lang];
  // Structured data so search engines know who we are and what we offer. The PO box is
  // intentionally not used as an address (Google asks for a physical location there).
  const agency = {
    "@context": "https://schema.org",
    "@type": "InsuranceAgency",
    name: BUSINESS,
    url: SITE + PATHS[lang],
    telephone: "+1-240-256-6360",
    description: s.description,
    areaServed: { "@type": "Country", name: "United States" },
    availableLanguage: ["English", "Spanish"],
    parentOrganization: { "@type": "Organization", name: "Pro-DG", url: SITE },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang,
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q[lang], acceptedAnswer: { "@type": "Answer", text: f.a[lang] } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(agency)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(faq)} />
      <InsuranceQuote carriers={withLogos()} mailingAddress={process.env.MAIL_POSTAL_ADDRESS ?? ""} initialLang={lang} />

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
