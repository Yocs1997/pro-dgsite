import type { Metadata } from "next";
import "./globals.css";

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
      </body>
    </html>
  );
}
