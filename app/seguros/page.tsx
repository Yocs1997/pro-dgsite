import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Script from "next/script";
import InsuranceQuote from "./InsuranceQuote";

export const metadata: Metadata = {
  title: "Cotiza tu seguro de auto | Pro-DG",
  description:
    "Compara opciones de seguro de auto en minutos. Cotización gratis, atención en español e inglés. / Compare car insurance options in minutes.",
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
      <InsuranceQuote carriers={withLogos()} />

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
