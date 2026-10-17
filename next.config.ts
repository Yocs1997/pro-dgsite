import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external images if you add real ones later
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverActions: {
      // Room for the optional driver's license photos on /seguros (compressed in the browser).
      bodySizeLimit: "4mb",
    },
  },
  // The CRM demo is a single static page in public/systemdemo.
  async rewrites() {
    return [{ source: "/systemdemo", destination: "/systemdemo/index.html" }];
  },
};

export default nextConfig;
