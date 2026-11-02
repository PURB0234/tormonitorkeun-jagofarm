import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  outputFileTracingExcludes: {
    "*": [
      "@img/**/*",
      "sharp/**/*",
    ],
  },
  experimental: {
    agentFeedback: true,
  },
};

export default nextConfig;
