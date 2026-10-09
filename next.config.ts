import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/*": ["./data/**/*", "./content/**/*"] },
  images: { unoptimized: true },
  devIndicators: false,
};

export default nextConfig;
