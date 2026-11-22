/*
 * Gharkaam service worker (plain JS, no build step).
 *
 * What it does:
 * - Pages and data always come from the network (chores change all the time,
 *   so stale copies would be misleading). When the network is down, page loads
 *   show the cached "You're offline" page instead of the browser's error.
 * - Built files under /_next/static/ are content-hashed, so they are cached
 *   forever (cache-first). That keeps the offline page styled and makes repeat
 *   loads faster.
 * - Push notifications (phase 5): shows the notification and opens the app
 *   on tap.
 *
 * Bump VERSION to force old caches to be dropped.
 */
const VERSION = "v1";
const OFFLINE_CACHE = `gharkaam-offline-${VERSION}`;
const STATIC_CACHE = `gharkaam-static-${VERSION}`;
const OFFLINE_URL = "/~offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/badge-96.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.addAll(PRECACHE);
      // Also cache the scripts/styles the offline page needs, so it renders properly.
      const page = await cache.match(OFFLINE_URL);
      const html = page ? await page.text() : "";
      // Stop at quotes, whitespace, ")" and "\" (the HTML also holds JSON-escaped copies of these URLs).
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
      if (assets.length) {
        const statics = await caches.open(STATIC_CACHE);
        await Promise.all(assets.map((url) => statics.add(url).catch(() => undefined)));
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([OFFLINE_CACHE, STATIC_CACHE]);
      for (const key of await caches.keys()) {
        if (key.startsWith("gharkaam-") && !keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return; // server actions etc. go straight to the network
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()),
    );
  }
  // Everything else (RSC data, icons, API) uses the browser's normal handling.
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// ── Push notifications ──────────────────────────────────────────────────────
// Payload (JSON): { title, body, url?, tag? }

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Gharkaam";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || "gharkaam",
      data: { url: data.url || "/today" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/today", self.location.origin);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === target.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target.href);
          return;
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
