import type { Metadata } from "next";
import "./globals.css";
import Script from 'next/script'

export const metadata: Metadata = {
  title: "Pro-DG | Digital Marketing Agency",
  description:
    "Pro-DG transforms businesses through precision digital marketing, world-class web development, and data-driven media buying strategies.",
  keywords: [
    "digital marketing",
    "social media management",
    "web development",
    "media buying",
    "agencia digital",
    "marketing digital",
  ],
  openGraph: {
    title: "Pro-DG | Digital Marketing Agency",
    description:
      "We build brands that dominate. Precision digital marketing and world-class web development.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" style={{ backgroundColor: "#02112A" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body style={{ backgroundColor: "#02112A", margin: 0 }}>
        {children}
        
        {/* El Script de Metricool se movió aquí, dentro del body */}
        <Script id="metricool-tracker" strategy="afterInteractive">
          {`
            function loadScript(a){
              var b=document.getElementsByTagName("head")[0],
              c=document.createElement("script");
              c.type="text/javascript",
              c.src="https://tracker.metricool.com/resources/be.js",
              c.onreadystatechange=a,
              c.onload=a,
              b.appendChild(c)
            }
            loadScript(function(){
              if (window.beTracker) {
                window.beTracker.t({hash:"9f4baf15e5e4f8c8732121f384899b08"})
              }
            });
          `}
        </Script>
      </body>
    </html>
  );
}