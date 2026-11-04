import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Docker image runs this smaller build. Local runs use the normal one.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  allowedDevOrigins: ["127.0.0.1"],
  devIndicators: false,
  // Every screen is private and loads per-user data in the browser, so there's nothing to prerender.
  cacheComponents: false,
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
