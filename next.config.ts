import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is deliberately OFF: every page depends on the selected
  // profile (a cookie), so nothing is worth prerendering, and leaving it on
  // would force a <Suspense> boundary around every cookie read.
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
