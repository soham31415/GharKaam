"use client";

import { useEffect } from "react";
import { setInstallPrompt, type BeforeInstallPromptEvent } from "./pwa-state";

/**
 * Registers /sw.js (production builds only: a service worker in `next dev`
 * fights with hot reloading) and keeps Android's install prompt for later.
 * Mounted once in the root layout.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    // Kept (not prevented) so Chrome's own install UI still works, and our install page can offer a button too.
    const onPrompt = (e: Event) => setInstallPrompt(e as BeforeInstallPromptEvent);
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
        console.warn("Service worker registration failed", err);
      });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
