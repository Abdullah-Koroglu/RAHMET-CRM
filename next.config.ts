import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: { proxyClientMaxBodySize: "256kb", serverActions: { bodySizeLimit: "256kb" } },
};

export default nextConfig;
