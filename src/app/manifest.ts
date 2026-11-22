import type { MetadataRoute } from "next";
import { APP_NAME, THEME_COLOR } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Family chores and home inventory",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: THEME_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Shopping list", url: "/shopping", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
