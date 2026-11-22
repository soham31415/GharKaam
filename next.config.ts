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
  async headers() {
    return [
      {
        // The service worker must never be served from the HTTP cache, or phones keep running an old one.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
