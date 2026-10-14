import type { Metadata } from "next";
import Script from "next/script";
import TagsPage from "./TagsPage";
import type { Lang } from "@/app/seguros/model";

// The tags & registration page lives at /tags (opens in English) and /es/tags (opens in
// Spanish), like /seguros and /es/seguros. Requests land in the portal → Seguros.

const BUSINESS = "Car Tag & Registration Services";
export const TAGS_PATHS: Record<Lang, string> = { en: "/tags", es: "/es/tags" };

const SEO: Record<Lang, { title: string; description: string; locale: string; alt: string }> = {
  en: {
    title: "Tags & Registration in MD, VA, NJ, PA, NY and SD | Car Tag & Registration Services",
    description:
      "Tags, temporary tags and registration for Maryland, Virginia, New Jersey, Pennsylvania, New York and South Dakota. Send photos of your title and ID online. Call (240) 256-6360.",
    locale: "en_US",
    alt: "es_US",
  },
  es: {
    title: "Placas y registro en MD, VA, NJ, PA, NY y SD | Car Tag & Registration Services",
    description:
      "Placas, placas temporales y registro para Maryland, Virginia, New Jersey, Pennsylvania, New York y South Dakota. Manda las fotos de tu título y tu ID en línea. Llama al (240) 256-6360.",
    locale: "es_US",
    alt: "en_US",
  },
};

export function tagsMetadata(lang: Lang): Metadata {
  const s = SEO[lang];
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: TAGS_PATHS[lang], languages: { "en-US": TAGS_PATHS.en, "es-US": TAGS_PATHS.es, "x-default": TAGS_PATHS.en } },
    openGraph: { title: s.title, description: s.description, url: TAGS_PATHS[lang], siteName: BUSINESS, type: "website", locale: s.locale, alternateLocale: [s.alt] },
    twitter: { card: "summary", title: s.title, description: s.description },
  };
}

export default function TagsShell({ lang }: { lang: Lang }) {
  return (
    <>
      <TagsPage initialLang={lang} mailingAddress={process.env.MAIL_POSTAL_ADDRESS ?? ""} />

      {/* Meta Pixel (same pixel as /seguros; the form reports a "Lead" when sent) */}
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
        <img height="1" width="1" style={{ display: "none" }} alt="" src="https://www.facebook.com/tr?id=1403861690984950&ev=PageView&noscript=1" />
      </noscript>
    </>
  );
}
