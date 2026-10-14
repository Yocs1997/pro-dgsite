import type { Metadata } from "next";
import Script from "next/script";
import VaPage from "./VaPage";

// Landing page for the VA cash-out campaign (Meta ads → this form). Only reached from the
// ads, so it stays out of search results and the sitemap. Leads land in their own list.

const TITLE = "VA Benefits | Veteran Home Equity: Cash-Out, HELOC & Second Mortgage";
const DESCRIPTION =
  "Veteran homeowners: see if you may qualify to access cash from your home's equity with a VA cash-out refinance, a home equity line of credit or a second mortgage. Free, no obligation.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  alternates: { canonical: "/va-cash-out" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/va-cash-out", type: "website", locale: "en_US" },
};

// Meta Pixel for this campaign. Set VA_META_PIXEL_ID to the client's ad account pixel;
// until then the site's own pixel is used.
const PIXEL = process.env.VA_META_PIXEL_ID || "1403861690984950";

export default function Page() {
  return (
    <>
      <VaPage />
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
          fbq('init', '${PIXEL}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
