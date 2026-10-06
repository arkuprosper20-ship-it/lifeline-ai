// LIFELINE AI — Service Worker (PWA, offline-first with Background Sync)
const CACHE_NAME = "lifeline-cache-v1";
const SYNC_TAG = "lifeline-notification-sync";
const ASSETS = [
  "/",
  "/index.html",
  "/styles/main.css",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/favicon.svg",
  "/icons/logo.svg",
  "/src/main.js",
  "/src/store.js",
  "/src/types.js",
  "/src/ui.js",
  "/src/analyzer.js",
  "/src/location.js",
  "/src/voice.js",
  "/src/contacts.js",
  "/src/sync.js",
  "/src/auth.js",
  "/src/handlers.js",
  "/src/i18n.js",
  "/src/sla.js",
  "/src/reports.js",
  "/src/ws.js",
  "/src/crypto.js",
  "/src/indexeddb.js",
  "/src/flows/analyze.js",
  "/src/views/report.js",
  "/src/views/analysis.js",
  "/src/views/incident-brief.js",
  "/src/views/location-screen.js",
  "/src/views/escalation.js",
  "/src/views/confirm.js",
  "/src/views/delivery-status.js",
  "/src/views/map.js",
  "/src/views/history.js",
  "/src/views/settings.js",
  "/src/views/contacts-admin.js",
  "/src/views/coordination.js",
  "/src/views/audit.js",
  "/src/views/about.js",
  "/src/views/privacy.js",
  "/src/views/help.js",
  "/src/views/auth.js",
  "/src/views/setup-wizard.js",
  "/leaflet/leaflet.js",
  "/leaflet/leaflet.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request).catch(() => {
      return new Response(JSON.stringify({ error: "Offline", offline: true }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }));
    return;
  }
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => {
        return new Response("Offline — content not cached", { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});

// Background Sync for offline notifications
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: "SYNC_NOTIFICATIONS" });
  }

  try {
    const cache = await caches.open("lifeline-offline-queue");
    const requests = await cache.keys();

    for (const request of requests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.warn("[LIFELINE SW] Failed to sync request:", error);
      }
    }
  } catch (error) {
    console.warn("[LIFELINE SW] Sync failed:", error);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "QUEUE_NOTIFICATION") {
    queueNotificationForSync(event.data.payload);
  }
});

async function queueNotificationForSync(payload) {
  const cache = await caches.open("lifeline-offline-queue");
  const request = new Request("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await cache.put(request, new Response(JSON.stringify(payload)));
  await self.registration.sync.register(SYNC_TAG);
}